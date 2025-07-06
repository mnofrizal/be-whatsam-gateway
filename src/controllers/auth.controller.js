// Authentication Controller - HTTP request handlers for authentication
import { ApiResponse } from "../utils/helpers.js";
import {
  HTTP_STATUS,
  ERROR_CODES,
  USER_TIERS,
  USER_ROLES,
} from "../utils/constants.js";
import { asyncHandler } from "../middleware/error-handler.js";
import authService from "../services/auth.service.js";
import { refreshToken as refreshJWTToken } from "../utils/helpers/jwt.js";
import logger from "../utils/logger.js";

/**
 * Register a new user
 * POST /api/v1/auth/register
 */
export const register = asyncHandler(async (req, res) => {
  // Validation is handled by middleware in routes
  const { name, email, password } = req.body;

  // Register user
  const result = await authService.register(name, email, password);

  logger.info("User registration successful", {
    userId: result.user.id,
    name: result.user.name,
    email: result.user.email,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });

  return res.status(HTTP_STATUS.CREATED).json(
    ApiResponse.createSuccessResponse(
      {
        user: result.user,
        token: result.token,
        expiresIn: result.expiresIn,
      },
      {
        message: "User registered successfully",
      }
    )
  );
});

/**
 * Login user
 * POST /api/v1/auth/login
 */
export const login = asyncHandler(async (req, res) => {
  // Validation is handled by middleware in routes
  const { email, password } = req.body;

  // Login user
  const result = await authService.login(email, password);

  logger.info("User login successful", {
    userId: result.user.id,
    email: result.user.email,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });

  return res.status(HTTP_STATUS.OK).json(
    ApiResponse.createSuccessResponse(
      {
        user: result.user,
        token: result.token,
        expiresIn: result.expiresIn,
      },
      {
        message: "Login successful",
      }
    )
  );
});

/**
 * Get current user
 * GET /api/v1/auth/me
 */
export const getCurrentUser = asyncHandler(async (req, res) => {
  const userId = req.user.userId;

  const user = await authService.getCurrentUser(userId);

  return res.status(HTTP_STATUS.OK).json(
    ApiResponse.createSuccessResponse({
      user,
    })
  );
});

/**
 * Refresh JWT token
 * POST /api/v1/auth/refresh
 */
export const refreshToken = asyncHandler(async (req, res) => {
  // Validation is handled by middleware in routes
  const { refreshToken: token } = req.body;

  const result = await refreshJWTToken(token);

  logger.info("Token refresh successful", {
    userId: result.user.id,
    email: result.user.email,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });

  return res.status(HTTP_STATUS.OK).json(
    ApiResponse.createSuccessResponse(
      {
        token: result.token,
        expiresIn: result.expiresIn,
        user: result.user,
      },
      {
        message: "Token refreshed successfully",
      }
    )
  );
});

/**
 * Logout user (client-side token invalidation)
 * POST /api/v1/auth/logout
 */
export const logout = asyncHandler(async (req, res) => {
  // Since we're using stateless JWT, logout is handled client-side
  // by removing the token from storage

  logger.info("User logout", {
    userId: req.user?.userId,
    email: req.user?.email,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });

  return res.status(HTTP_STATUS.OK).json(
    ApiResponse.createSuccessResponse(null, {
      message:
        "Logout successful. Please remove the token from client storage.",
    })
  );
});

/**
 * Change password
 * POST /api/v1/auth/change-password
 */
export const changePassword = asyncHandler(async (req, res) => {
  const userId = req.user.userId;

  // Validation is handled by middleware in routes
  const { currentPassword, newPassword } = req.body;

  const result = await authService.changePassword(
    userId,
    currentPassword,
    newPassword
  );

  logger.info("Password change successful", {
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
 * Deactivate user account
 * POST /api/v1/auth/deactivate
 */
export const deactivateAccount = asyncHandler(async (req, res) => {
  const { password } = req.body;
  const userId = req.user.userId;

  // Verify password before deactivation
  await authService.login(req.user.email, password);

  const result = await authService.deactivateAccount(userId);

  logger.info("Account deactivated", {
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
 * Forgot password (placeholder for future implementation)
 * POST /api/v1/auth/forgot-password
 */
export const forgotPassword = asyncHandler(async (req, res) => {
  // Validation is handled by middleware in routes
  const { email } = req.body;

  // TODO: Implement email-based password reset
  // For now, return a placeholder response

  logger.info("Password reset requested", {
    email,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });

  return res.status(HTTP_STATUS.OK).json(
    ApiResponse.createSuccessResponse(null, {
      message:
        "If an account with this email exists, a password reset link has been sent.",
    })
  );
});

/**
 * Reset password (placeholder for future implementation)
 * POST /api/v1/auth/reset-password
 */
export const resetPassword = asyncHandler(async (req, res) => {
  // Validation is handled by middleware in routes
  const { token, newPassword } = req.body;

  // TODO: Implement token-based password reset
  // For now, return a placeholder response

  return res.status(HTTP_STATUS.OK).json(
    ApiResponse.createSuccessResponse(null, {
      message:
        "Password reset functionality will be implemented in a future update.",
    })
  );
});

// Export default object with all controller functions
export default {
  register,
  login,
  getCurrentUser,
  refreshToken,
  logout,
  changePassword,
  deactivateAccount,
  forgotPassword,
  resetPassword,
};
