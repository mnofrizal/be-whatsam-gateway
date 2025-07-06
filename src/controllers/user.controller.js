// User Controller - HTTP request handlers for user management
import { ApiResponse } from "../utils/helpers.js";
import { HTTP_STATUS, ERROR_CODES } from "../utils/constants.js";
import { asyncHandler } from "../middleware/error-handler.js";
import * as userService from "../services/user.service.js";
import * as authService from "../services/auth.service.js";
import logger from "../utils/logger.js";
import prisma from "../database/client.js";
// Validation is now handled by middleware in routes

/**
 * Get user profile
 * GET /api/v1/users/profile
 */
const getUserProfile = asyncHandler(async (req, res) => {
  const userId = req.user.userId;

  const userProfile = await userService.getUserProfile(userId);

  return res.status(HTTP_STATUS.OK).json(
    ApiResponse.createSuccessResponse({
      user: userProfile,
    })
  );
});

/**
 * Update user profile
 * PUT /api/v1/users/profile
 */
const updateUserProfile = asyncHandler(async (req, res) => {
  const userId = req.user.userId;

  // Data is already validated by middleware
  const updatedUser = await userService.updateUserProfile(userId, req.body);

  logger.info("User profile updated", {
    userId,
    email: req.user.email,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });

  return res.status(HTTP_STATUS.OK).json(
    ApiResponse.createSuccessResponse(
      {
        user: updatedUser,
      },
      {
        message: "Profile updated successfully",
      }
    )
  );
});

/**
 * Get user's API keys
 * GET /api/v1/users/api-keys
 */
const getUserApiKeys = asyncHandler(async (req, res) => {
  const userId = req.user.userId;

  const result = await userService.getUserApiKeys(userId);

  return res.status(HTTP_STATUS.OK).json(
    ApiResponse.createSuccessResponse({
      apiKeys: result.apiKeys,
      total: result.total,
    })
  );
});

/**
 * Delete API key
 * DELETE /api/v1/users/api-keys/:id
 */
const deleteApiKey = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const { id: apiKeyId } = req.params;

  if (!apiKeyId) {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json(
        ApiResponse.createValidationErrorResponse([
          { field: "id", message: "API key ID is required" },
        ])
      );
  }

  const result = await userService.deleteApiKey(userId, apiKeyId);

  logger.info("API key deleted", {
    userId,
    apiKeyId,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });

  return res.status(HTTP_STATUS.OK).json(
    ApiResponse.createSuccessResponse(null, {
      message: result.message,
    })
  );
});

/**
 * Get user usage statistics
 * GET /api/v1/users/usage
 */
const getUserUsage = asyncHandler(async (req, res) => {
  const userId = req.user.userId;

  // Query parameters are already validated by middleware
  const { period, sessionId } = req.query;
  const usage = await userService.getUserUsage(userId, period, sessionId);

  return res.status(HTTP_STATUS.OK).json(
    ApiResponse.createSuccessResponse({
      usage,
    })
  );
});

/**
 * Get user tier information
 * GET /api/v1/users/tier
 */
const getUserTier = asyncHandler(async (req, res) => {
  const userId = req.user.userId;

  const tierInfo = await userService.getUserTier(userId);

  return res.status(HTTP_STATUS.OK).json(
    ApiResponse.createSuccessResponse({
      tier: tierInfo,
    })
  );
});

/**
 * Deactivate user account
 * POST /api/v1/users/deactivate
 */
const deactivateAccount = asyncHandler(async (req, res) => {
  const userId = req.user.userId;

  // Data is already validated by middleware
  const { password } = req.body;

  // Verify password before deactivation using AuthService
  await authService.login(req.user.email, password);

  const result = await userService.deactivateAccount(userId);

  logger.info("User account deactivated", {
    userId,
    email: req.user.email,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });

  return res.status(HTTP_STATUS.OK).json(
    ApiResponse.createSuccessResponse(null, {
      message: result.message,
    })
  );
});

/**
 * Get user sessions
 * GET /api/v1/users/sessions
 */
const getUserSessions = asyncHandler(async (req, res) => {
  const userId = req.user.userId;

  // Query parameters are already validated by middleware
  const { status, limit, offset } = req.query;

  // Build filter
  const where = { userId };
  if (status) {
    where.status = status;
  }

  // Get sessions with pagination
  const [sessions, total] = await Promise.all([
    prisma.session.findMany({
      where,
      select: {
        id: true,
        name: true,
        phoneNumber: true,
        status: true,
        lastSeenAt: true,
        createdAt: true,
        updatedAt: true,
        worker: {
          select: {
            id: true,
            endpoint: true,
            status: true,
          },
        },
        _count: {
          select: {
            messages: true,
            apiKeys: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.session.count({ where }),
  ]);

  return res.status(HTTP_STATUS.OK).json(
    ApiResponse.createSuccessResponse({
      sessions,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    })
  );
});

// Export all functions as default object for route compatibility
export default {
  getUserProfile,
  updateUserProfile,
  getUserApiKeys,
  deleteApiKey,
  getUserUsage,
  getUserTier,
  deactivateAccount,
  getUserSessions,
};
