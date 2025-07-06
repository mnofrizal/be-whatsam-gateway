// JWT Helper - JWT token management and verification utilities
import jwt from "jsonwebtoken";
import prisma from "../../database/client.js";
import { jwtConfig } from "../../config/security.js";
import logger from "../logger.js";

/**
 * Generate JWT token for user
 * @param {Object} user - User object
 * @returns {string} JWT token
 */
export const generateToken = (user) => {
  try {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      tier: user.tier,
      iat: Math.floor(Date.now() / 1000),
    };

    const token = jwt.sign(payload, jwtConfig.secret, {
      expiresIn: jwtConfig.expiresIn,
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
    });

    logger.debug("JWT token generated successfully", {
      userId: user.id,
      email: user.email,
      expiresIn: jwtConfig.expiresIn,
    });

    return token;
  } catch (error) {
    logger.error("JWT token generation failed", {
      error: error.message,
      userId: user.id,
      email: user.email,
    });
    throw new Error("Token generation failed");
  }
};

/**
 * Verify JWT token and return user data
 * @param {string} token - JWT token
 * @returns {Object} Token data with user information
 */
export const verifyToken = async (token) => {
  try {
    // Verify JWT token
    const decoded = jwt.verify(token, jwtConfig.secret, {
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
    });

    // Check if user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        tier: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    if (!user) {
      logger.warn("JWT verification failed - user not found", {
        userId: decoded.userId,
        email: decoded.email,
      });
      throw new Error("User not found");
    }

    if (!user.isActive) {
      logger.warn("JWT verification failed - user inactive", {
        userId: user.id,
        email: user.email,
      });
      throw new Error("User account is inactive");
    }

    logger.debug("JWT token verified successfully", {
      userId: user.id,
      email: user.email,
    });

    return {
      user,
      tokenData: decoded,
    };
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      logger.warn("JWT verification failed - invalid token", {
        error: error.message,
      });
      throw new Error("Invalid token");
    }

    if (error.name === "TokenExpiredError") {
      logger.warn("JWT verification failed - token expired", {
        expiredAt: error.expiredAt,
      });
      throw new Error("Token expired");
    }

    logger.error("JWT verification failed", {
      error: error.message,
    });
    throw error;
  }
};

/**
 * Refresh JWT token
 * @param {string} token - Current JWT token
 * @returns {Object} New token and user data
 */
export const refreshToken = async (token) => {
  try {
    // Verify current token (even if expired)
    const decoded = jwt.verify(token, jwtConfig.secret, {
      ignoreExpiration: true,
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
    });

    // Check if user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        tier: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    if (!user || !user.isActive) {
      throw new Error("User not found or inactive");
    }

    // Generate new token
    const newToken = generateToken(user);

    logger.info("JWT token refreshed successfully", {
      userId: user.id,
      email: user.email,
    });

    return {
      token: newToken,
      expiresIn: jwtConfig.expiresIn,
      user,
    };
  } catch (error) {
    logger.error("JWT token refresh failed", {
      error: error.message,
    });
    throw new Error("Token refresh failed");
  }
};

/**
 * Decode JWT token without verification
 * @param {string} token - JWT token
 * @returns {Object} Decoded token payload
 */
export const decodeToken = (token) => {
  try {
    const decoded = jwt.decode(token, { complete: true });
    return decoded;
  } catch (error) {
    logger.error("JWT token decode failed", {
      error: error.message,
    });
    throw new Error("Token decode failed");
  }
};

/**
 * Check if JWT token is expired
 * @param {string} token - JWT token
 * @returns {boolean} True if token is expired
 */
export const isTokenExpired = (token) => {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) {
      return true;
    }

    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  } catch (error) {
    logger.error("JWT token expiration check failed", {
      error: error.message,
    });
    return true;
  }
};

/**
 * Get token expiration time
 * @param {string} token - JWT token
 * @returns {Date|null} Expiration date or null if invalid
 */
export const getTokenExpiration = (token) => {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) {
      return null;
    }

    return new Date(decoded.exp * 1000);
  } catch (error) {
    logger.error("JWT token expiration retrieval failed", {
      error: error.message,
    });
    return null;
  }
};
