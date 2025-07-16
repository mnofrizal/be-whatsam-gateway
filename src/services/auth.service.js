// Authentication Service - Core authentication business logic
import prisma from "../database/client.js";
import { jwtConfig } from "../config/security.js";
import logger from "../utils/logger.js";
import {
  UnauthorizedError,
  ConflictError,
} from "../middleware/error-handler.js";
import { USER_TIERS, USER_ROLES, SESSION_STATUS } from "../utils/constants.js";
import { generateToken } from "../utils/helpers/jwt.js";
import { hash, compare, validateAndHash } from "../utils/helpers/password.js";

/**
 * Register a new user
 * @param {string} name - User name
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {object} - User data with token
 */
export const register = async (name, email, password) => {
  try {
    // Input validation is handled by route middleware
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictError("User with this email already exists");
    }

    // Hash password
    const passwordHash = await hash(password);

    // Create user (always BASIC tier for new registrations)
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        tier: USER_TIERS.BASIC, // Always BASIC for new users
        role: USER_ROLES.USER,
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
    const token = generateToken(user);

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
};

/**
 * Login user
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {object} - User data with token
 */
export const login = async (email, password) => {
  try {
    // Input validation is handled by route middleware
    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
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
    const isValidPassword = await compare(password, user.passwordHash);
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
    const token = generateToken(userWithoutPassword);

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
};

/**
 * Get current user by ID
 * @param {string} userId - User ID
 * @returns {object} - User data
 */
export const getCurrentUser = async (userId) => {
  try {
    // User ID validation is handled by route middleware
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
          in: [
            SESSION_STATUS.CONNECTED,
            SESSION_STATUS.QR_REQUIRED,
            SESSION_STATUS.RECONNECTING,
          ],
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
};

/**
 * Change user password
 * @param {string} userId - User ID
 * @param {string} currentPassword - Current password
 * @param {string} newPassword - New password
 * @returns {object} - Success message
 */
export const changePassword = async (userId, currentPassword, newPassword) => {
  try {
    // Input validation is handled by route middleware
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

    // Validate current password and hash new password
    const newPasswordHash = await validateAndHash(
      currentPassword,
      user.passwordHash,
      newPassword
    );

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
};

/**
 * Deactivate user account
 * @param {string} userId - User ID
 * @returns {object} - Success message
 */
export const deactivateAccount = async (userId) => {
  try {
    // User ID validation is handled by route middleware
    await prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });

    logger.info("Account deactivated successfully", {
      userId: userId,
    });

    return {
      message: "Account deactivated successfully",
    };
  } catch (error) {
    logger.error("Account deactivation failed:", error);
    throw error;
  }
};

// Export all functions as named exports
export default {
  register,
  login,
  getCurrentUser,
  changePassword,
  deactivateAccount,
};
