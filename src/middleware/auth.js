// Authentication Middleware
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { jwtConfig } from "../config/security.js";
import { UnauthorizedError, ForbiddenError } from "./error-handler.js";
import logger from "../utils/logger.js";

const prisma = new PrismaClient();

/**
 * JWT Authentication Middleware for Dashboard Access
 */
export const authenticateJWT = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedError(
        "Access token required. Use: Authorization: Bearer <token>"
      );
    }

    const token = authHeader.substring(7);

    // Verify JWT token
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
        lastLoginAt: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedError("User not found or account deactivated");
    }

    // Attach user info to request
    req.user = {
      userId: user.id,
      email: user.email,
      role: user.role,
      tier: user.tier,
      lastLoginAt: user.lastLoginAt,
    };

    // Log successful authentication
    logger.info("JWT authentication successful", {
      userId: user.id,
      email: user.email,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
    });

    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return next(new UnauthorizedError("Invalid authentication token"));
    } else if (error.name === "TokenExpiredError") {
      return next(new UnauthorizedError("Authentication token has expired"));
    } else if (error instanceof UnauthorizedError) {
      return next(error);
    } else {
      logger.error("JWT authentication error:", error);
      return next(new UnauthorizedError("Authentication failed"));
    }
  }
};

/**
 * API Key Authentication Middleware for External API Access
 * Enforces API Key Authentication via 'Authorization: Bearer <api-key>' header.
 */
export const authenticateApiKey = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedError(
        "API key required. Use: Authorization: Bearer <api-key>"
      );
    }

    const apiKey = authHeader.substring(7);

    // Validate API key format
    if (!apiKey.startsWith("wg_") || apiKey.length < 35) {
      throw new UnauthorizedError("Invalid API key format");
    }

    // Find and validate API key
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
      // This should ideally not happen due to schema constraints
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

    // Attach user and session info to request
    req.user = keyData.session.user;
    req.session = {
      id: keyData.session.id,
      name: keyData.session.name,
      status: keyData.session.status,
      workerId: keyData.session.workerId,
    };
    req.apiKey = {
      id: keyData.id,
      key: keyData.key,
      name: keyData.name,
      sessionId: keyData.sessionId, // Keep sessionId directly on apiKey for quick reference
      lastUsed: keyData.lastUsed,
      expiresAt: keyData.expiresAt,
    };

    // Log successful authentication
    logger.info("API key authentication successful", {
      userId: req.user.id,
      email: req.user.email,
      apiKeyId: keyData.id,
      apiKeyName: keyData.name,
      sessionId: keyData.sessionId,
      authMethod: "Bearer",
      ip: req.ip,
      userAgent: req.get("User-Agent"),
    });

    next();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return next(error);
    } else {
      logger.error("API key authentication error:", error);
      return next(new UnauthorizedError("Authentication failed"));
    }
  }
};

/**
 * Worker Authentication Middleware for Internal Worker Communication
 * Uses standard Authorization: Bearer <token> format for consistency
 */
export const authenticateWorker = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const expectedToken = process.env.WORKER_AUTH_TOKEN;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedError(
        "Worker authentication token required. Use: Authorization: Bearer <token>"
      );
    }

    const workerToken = authHeader.substring(7);

    if (!expectedToken) {
      logger.error("WORKER_AUTH_TOKEN not configured in environment");
      throw new Error("Worker authentication not configured");
    }

    if (workerToken !== expectedToken) {
      logger.warn("Invalid worker token attempt", {
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        providedToken: workerToken.substring(0, 8) + "...",
      });
      throw new UnauthorizedError("Invalid worker authentication token");
    }

    // Log successful worker authentication
    logger.info("Worker authentication successful", {
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      endpoint: req.originalUrl,
      authMethod: "Bearer",
    });

    req.isWorker = true;
    next();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return next(error);
    } else {
      logger.error("Worker authentication error:", error);
      return next(new UnauthorizedError("Worker authentication failed"));
    }
  }
};

/**
 * Role-based Access Control Middleware
 */
export const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError("Authentication required"));
    }

    const userRoles = Array.isArray(req.user.role)
      ? req.user.role
      : [req.user.role];
    const requiredRoles = Array.isArray(roles) ? roles : [roles];

    const hasRole = requiredRoles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      logger.warn("Insufficient permissions", {
        userId: req.user.userId,
        userRole: req.user.role,
        requiredRoles,
        endpoint: req.originalUrl,
        ip: req.ip,
      });

      return next(
        new ForbiddenError(
          `Access denied. Required role(s): ${requiredRoles.join(", ")}`
        )
      );
    }

    next();
  };
};

/**
 * Session Access Control Middleware
 * Ensures users can only access their own sessions
 */
export const requireSessionAccess = async (req, res, next) => {
  try {
    if (!req.user) {
      return next(new UnauthorizedError("Authentication required"));
    }

    const sessionId =
      req.params.sessionId || req.body.sessionId || req.query.sessionId;

    if (!sessionId) {
      return next(new Error("Session ID required"));
    }

    // Admin users can access any session
    if (req.user.role === "ADMINISTRATOR") {
      return next();
    }

    // For API key authentication, check if key is tied to specific session
    if (req.apiKey && req.apiKey.sessionId) {
      if (req.apiKey.sessionId !== sessionId) {
        return next(
          new ForbiddenError("API key not authorized for this session")
        );
      }
      return next();
    }

    // For JWT authentication, check if session belongs to user
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { userId: true },
    });

    if (!session) {
      return next(new Error("Session not found"));
    }

    if (session.userId !== req.user.id) {
      return next(new ForbiddenError("Access denied to this session"));
    }

    next();
  } catch (error) {
    logger.error("Session access control error:", error);
    next(error);
  }
};

// Convenience middleware combinations
export const requireAdmin = requireRole(["ADMIN"]);
export const requireCustomer = requireRole(["CUSTOMER", "ADMIN"]);

// Export middleware combinations for common use cases
export const authMiddleware = {
  jwt: authenticateJWT,
  apiKey: authenticateApiKey,
  worker: authenticateWorker,
  requireRole,
  requireAdmin,
  requireCustomer,
  requireSessionAccess,
};

export default authMiddleware;
