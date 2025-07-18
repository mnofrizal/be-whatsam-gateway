// Authentication Controller - HTTP request handlers for authentication
import { ApiResponse } from "../utils/helpers.js";
import { HTTP_STATUS } from "../utils/constants.js";
import { asyncHandler } from "../middleware/error-handler.js";
import authService from "../services/auth.service.js";
import { refreshToken as refreshJWTToken } from "../utils/helpers/jwt.js";
import logger from "../utils/logger.js";
import bcrypt from "bcryptjs";

/**
 * Register a new user
 * POST /api/auth/register
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
 * POST /api/auth/login
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
 * GET /api/auth/me
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
 * POST /api/auth/refresh
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
 * POST /api/auth/logout
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
 * POST /api/auth/change-password
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
 * POST /api/auth/deactivate
 */
export const deactivateAccount = asyncHandler(async (req, res) => {
  const { password } = req.body;
  const userId = req.user.userId;

  // Get user data to verify password
  const user = await authService.getCurrentUser(userId);

  // Verify password directly without full login flow
  const isValidPassword = await bcrypt.compare(password, user.passwordHash);
  if (!isValidPassword) {
    return res
      .status(HTTP_STATUS.UNAUTHORIZED)
      .json(ApiResponse.createErrorResponse("Invalid password"));
  }

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
 * Forgot password - Send password reset email
 * POST /api/auth/forgot-password
 */
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  logger.info("Password reset requested", {
    email,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });

  const result = await authService.forgotPassword(email);

  return res.status(HTTP_STATUS.OK).json(
    ApiResponse.createSuccessResponse(null, {
      message: result.message,
    })
  );
});

/**
 * Reset password - Confirm password reset with token
 * POST /api/auth/reset-password
 */
export const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;

  logger.info("Password reset attempted", {
    token: token?.substring(0, 10) + "...", // Log partial token for debugging
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });

  const result = await authService.resetPassword(token, newPassword);

  return res.status(HTTP_STATUS.OK).json(
    ApiResponse.createSuccessResponse(null, {
      message: result.message,
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
