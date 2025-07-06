// User Controller - HTTP request handlers for user management
import { ApiResponse, ValidationHelper } from "../utils/helpers.js";
import { HTTP_STATUS, ERROR_CODES } from "../utils/constants.js";
import { asyncHandler } from "../middleware/error-handler.js";
import UserService from "../services/user.service.js";
import logger from "../utils/logger.js";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class UserController {
  /**
   * Get user profile
   * GET /api/v1/users/profile
   */
  static getUserProfile = asyncHandler(async (req, res) => {
    const userId = req.user.userId;

    const userProfile = await UserService.getUserProfile(userId);

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
  static updateUserProfile = asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const { name, email, currentPassword, newPassword } = req.body;

    // Validate input
    const validationErrors = [];

    if (name && (!name.trim() || name.trim().length < 2)) {
      validationErrors.push({
        field: "name",
        message: "Name must be at least 2 characters long",
      });
    }

    if (email && !ValidationHelper.isValidEmail(email)) {
      validationErrors.push({
        field: "email",
        message: "Invalid email format",
      });
    }

    if (newPassword && !ValidationHelper.isValidPassword(newPassword)) {
      validationErrors.push({
        field: "newPassword",
        message:
          "Password must be at least 8 characters long and contain at least one letter and one number",
      });
    }

    if (validationErrors.length > 0) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(ApiResponse.createValidationErrorResponse(validationErrors));
    }

    const updatedUser = await UserService.updateUserProfile(userId, {
      name,
      email,
      currentPassword,
      newPassword,
    });

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
  static getUserApiKeys = asyncHandler(async (req, res) => {
    const userId = req.user.userId;

    const result = await UserService.getUserApiKeys(userId);

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
  static deleteApiKey = asyncHandler(async (req, res) => {
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

    const result = await UserService.deleteApiKey(userId, apiKeyId);

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
  static getUserUsage = asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const { period = "24h", sessionId } = req.query;

    // Validate period
    const validPeriods = ["24h", "7d", "30d"];
    if (!validPeriods.includes(period)) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(
          ApiResponse.createValidationErrorResponse([
            { field: "period", message: "Period must be one of: 24h, 7d, 30d" },
          ])
        );
    }

    const usage = await UserService.getUserUsage(userId, period, sessionId);

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
  static getUserTier = asyncHandler(async (req, res) => {
    const userId = req.user.userId;

    const tierInfo = await UserService.getUserTier(userId);

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
  static deactivateAccount = asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const { password } = req.body;

    if (!password) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(
          ApiResponse.createValidationErrorResponse([
            { field: "password", message: "Password confirmation is required" },
          ])
        );
    }

    // Verify password before deactivation using AuthService
    const AuthService = (await import("../services/auth.service.js")).default;
    await AuthService.login(req.user.email, password);

    const result = await UserService.deactivateAccount(userId);

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
  static getUserSessions = asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const { status, limit = 10, offset = 0 } = req.query;

    // Build filter
    const where = { userId };
    if (status) {
      where.status = status.toUpperCase();
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
        take: parseInt(limit),
        skip: parseInt(offset),
      }),
      prisma.session.count({ where }),
    ]);

    return res.status(HTTP_STATUS.OK).json(
      ApiResponse.createSuccessResponse({
        sessions,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: parseInt(offset) + parseInt(limit) < total,
        },
      })
    );
  });
}

export default UserController;
