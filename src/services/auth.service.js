// Authentication Service - Core authentication business logic
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { jwtConfig } from "../config/security.js";
import { UtilHelper } from "../utils/helpers.js";
import logger from "../utils/logger.js";
import {
  UnauthorizedError,
  ValidationError,
  ConflictError,
} from "../middleware/error-handler.js";

const prisma = new PrismaClient();

export class AuthService {
  constructor() {
    this.saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
  }

  /**
   * Register a new user
   * @param {string} name - User name
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {object} - User data with token
   */
  async register(name, email, password) {
    try {
      // Validate input
      if (!name || !email || !password) {
        throw new ValidationError("Name, email and password are required");
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (existingUser) {
        throw new ConflictError("User with this email already exists");
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, this.saltRounds);

      // Create user (always BASIC tier for new registrations)
      const user = await prisma.user.create({
        data: {
          name: name.trim(),
          email: email.toLowerCase(),
          passwordHash,
          tier: "BASIC", // Always BASIC for new users
          role: "USER",
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          tier: true,
          isActive: true,
          createdAt: true,
        },
      });

      // Generate JWT token
      const token = this.generateToken(user);

      logger.info("User registered successfully", {
        userId: user.id,
        name: user.name,
        email: user.email,
        tier: user.tier,
      });

      return {
        user,
        token,
        expiresIn: jwtConfig.expiresIn,
      };
    } catch (error) {
      logger.error("User registration failed:", error);
      throw error;
    }
  }

  /**
   * Login user
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {object} - User data with token
   */
  async login(email, password) {
    try {
      // Validate input
      if (!email || !password) {
        throw new ValidationError("Email and password are required");
      }

      // Find user
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        select: {
          id: true,
          name: true,
          email: true,
          passwordHash: true,
          role: true,
          tier: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
        },
      });

      if (!user) {
        throw new UnauthorizedError("Invalid email or password");
      }

      if (!user.isActive) {
        throw new UnauthorizedError("Account is deactivated");
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        throw new UnauthorizedError("Invalid email or password");
      }

      // Update last login timestamp
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      // Remove password hash from response
      const { passwordHash, ...userWithoutPassword } = user;

      // Generate JWT token
      const token = this.generateToken(userWithoutPassword);

      logger.info("User logged in successfully", {
        userId: user.id,
        email: user.email,
      });

      return {
        user: userWithoutPassword,
        token,
        expiresIn: jwtConfig.expiresIn,
      };
    } catch (error) {
      logger.error("User login failed:", error);
      throw error;
    }
  }

  /**
   * Get current user by ID
   * @param {string} userId - User ID
   * @returns {object} - User data
   */
  async getCurrentUser(userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          tier: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedError("User not found or account deactivated");
      }

      // Get active sessions count separately
      const activeSessionsCount = await prisma.session.count({
        where: {
          userId: userId,
          status: {
            in: ["CONNECTED", "QR_REQUIRED", "RECONNECTING"],
          },
        },
      });

      return {
        ...user,
        activeSessions: activeSessionsCount,
      };
    } catch (error) {
      logger.error("Get current user failed:", error);
      throw error;
    }
  }

  /**
   * Generate JWT token
   * @param {object} user - User object
   * @returns {string} - JWT token
   */
  generateToken(user) {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      tier: user.tier,
      iat: Math.floor(Date.now() / 1000),
    };

    return jwt.sign(payload, jwtConfig.secret, {
      expiresIn: jwtConfig.expiresIn,
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
    });
  }

  /**
   * Verify JWT token
   * @param {string} token - JWT token
   * @returns {object} - Token payload
   */
  async verifyToken(token) {
    try {
      const payload = jwt.verify(token, jwtConfig.secret, {
        issuer: jwtConfig.issuer,
        audience: jwtConfig.audience,
      });

      // Check if user still exists and is active
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
          id: true,
          email: true,
          role: true,
          tier: true,
          isActive: true,
        },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedError("User not found or account deactivated");
      }

      return {
        ...payload,
        user,
      };
    } catch (error) {
      if (error.name === "JsonWebTokenError") {
        throw new UnauthorizedError("Invalid authentication token");
      } else if (error.name === "TokenExpiredError") {
        throw new UnauthorizedError("Authentication token has expired");
      }
      throw error;
    }
  }

  /**
   * Refresh JWT token
   * @param {string} token - Current JWT token
   * @returns {object} - New token data
   */
  async refreshToken(token) {
    try {
      // Verify current token (even if expired)
      const payload = jwt.verify(token, jwtConfig.secret, {
        ignoreExpiration: true,
        issuer: jwtConfig.issuer,
        audience: jwtConfig.audience,
      });

      // Check if user still exists and is active
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
          id: true,
          email: true,
          role: true,
          tier: true,
          isActive: true,
        },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedError("User not found or account deactivated");
      }

      // Generate new token
      const newToken = this.generateToken(user);

      logger.info("Token refreshed successfully", {
        userId: user.id,
        email: user.email,
      });

      return {
        token: newToken,
        expiresIn: jwtConfig.expiresIn,
        user,
      };
    } catch (error) {
      logger.error("Token refresh failed:", error);
      throw error;
    }
  }

  /**
   * Verify API key
   * @param {string} apiKey - API key
   * @returns {object} - API key data with user and session
   */
  async verifyApiKey(apiKey) {
    try {
      const keyData = await prisma.apiKey.findUnique({
        where: { key: apiKey },
        include: {
          session: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  role: true,
                  tier: true,
                  isActive: true,
                },
              },
            },
          },
        },
      });

      if (!keyData || !keyData.isActive) {
        throw new UnauthorizedError("Invalid or inactive API key");
      }

      if (!keyData.session || !keyData.session.user) {
        throw new UnauthorizedError(
          "API key is not linked to a valid session or user"
        );
      }

      if (!keyData.session.user.isActive) {
        throw new UnauthorizedError("User account is deactivated");
      }

      // Check API key expiration
      if (keyData.expiresAt && keyData.expiresAt < new Date()) {
        throw new UnauthorizedError("API key has expired");
      }

      // Update last used timestamp (async, don't wait)
      prisma.apiKey
        .update({
          where: { id: keyData.id },
          data: { lastUsed: new Date() },
        })
        .catch((error) => {
          logger.error("Failed to update API key last used:", error);
        });

      return keyData;
    } catch (error) {
      logger.error("API key verification failed:", error);
      throw error;
    }
  }

  /**
   * Change user password
   * @param {string} userId - User ID
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {object} - Success message
   */
  async changePassword(userId, currentPassword, newPassword) {
    try {
      // Get user with password hash
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          passwordHash: true,
          isActive: true,
        },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedError("User not found or account deactivated");
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(
        currentPassword,
        user.passwordHash
      );
      if (!isValidPassword) {
        throw new UnauthorizedError("Current password is incorrect");
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(newPassword, this.saltRounds);

      // Update password
      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash: newPasswordHash },
      });

      logger.info("Password changed successfully", {
        userId: user.id,
        email: user.email,
      });

      return {
        message: "Password changed successfully",
      };
    } catch (error) {
      logger.error("Password change failed:", error);
      throw error;
    }
  }

  /**
   * Deactivate user account
   * @param {string} userId - User ID
   * @returns {object} - Success message
   */
  async deactivateAccount(userId) {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { isActive: false },
      });

      logger.info("Account deactivated successfully", { userId });

      return {
        message: "Account deactivated successfully",
      };
    } catch (error) {
      logger.error("Account deactivation failed:", error);
      throw error;
    }
  }
}

export default new AuthService();
