// Authentication Controller - HTTP request handlers for authentication
import { ApiResponse, ValidationHelper } from "../utils/helpers.js";
import { HTTP_STATUS, ERROR_CODES } from "../utils/constants.js";
import { asyncHandler } from "../middleware/error-handler.js";
import AuthService from "../services/auth.service.js";
import logger from "../utils/logger.js";

export class AuthController {
  /**
   * Register a new user
   * POST /api/v1/auth/register
   */
  static register = asyncHandler(async (req, res) => {
    const { name, email, password, tier } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        ApiResponse.createValidationErrorResponse([
          { field: "name", message: "Name is required" },
          { field: "email", message: "Email is required" },
          { field: "password", message: "Password is required" },
        ])
      );
    }

    // Restrict tier parameter - users can only register as BASIC
    if (tier && tier !== "BASIC") {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        ApiResponse.createValidationErrorResponse([
          {
            field: "tier",
            message: "New users can only register with BASIC tier",
          },
        ])
      );
    }

    // Validate email format
    if (!ValidationHelper.isValidEmail(email)) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(
          ApiResponse.createValidationErrorResponse([
            { field: "email", message: "Invalid email format" },
          ])
        );
    }

    // Validate password strength
    if (!ValidationHelper.isValidPassword(password)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        ApiResponse.createValidationErrorResponse([
          {
            field: "password",
            message:
              "Password must be at least 8 characters long and contain at least one letter and one number",
          },
        ])
      );
    }

    // Register user
    const result = await AuthService.register(name, email, password);

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
  static login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        ApiResponse.createValidationErrorResponse([
          { field: "email", message: "Email is required" },
          { field: "password", message: "Password is required" },
        ])
      );
    }

    // Login user
    const result = await AuthService.login(email, password);

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
  static getCurrentUser = asyncHandler(async (req, res) => {
    const userId = req.user.userId;

    const user = await AuthService.getCurrentUser(userId);

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
  static refreshToken = asyncHandler(async (req, res) => {
    const { token } = req.body;

    if (!token) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(
          ApiResponse.createValidationErrorResponse([
            { field: "token", message: "Token is required" },
          ])
        );
    }

    const result = await AuthService.refreshToken(token);

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
  static logout = asyncHandler(async (req, res) => {
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
  static changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.userId;

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        ApiResponse.createValidationErrorResponse([
          { field: "currentPassword", message: "Current password is required" },
          { field: "newPassword", message: "New password is required" },
        ])
      );
    }

    // Validate new password strength
    if (!ValidationHelper.isValidPassword(newPassword)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        ApiResponse.createValidationErrorResponse([
          {
            field: "newPassword",
            message:
              "New password must be at least 8 characters long and contain uppercase, lowercase, number, and special character",
          },
        ])
      );
    }

    const result = await AuthService.changePassword(
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
  static deactivateAccount = asyncHandler(async (req, res) => {
    const { password } = req.body;
    const userId = req.user.userId;

    if (!password) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(
          ApiResponse.createValidationErrorResponse([
            { field: "password", message: "Password confirmation is required" },
          ])
        );
    }

    // Verify password before deactivation
    await AuthService.login(req.user.email, password);

    const result = await AuthService.deactivateAccount(userId);

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
  static forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(
          ApiResponse.createValidationErrorResponse([
            { field: "email", message: "Email is required" },
          ])
        );
    }

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
  static resetPassword = asyncHandler(async (req, res) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        ApiResponse.createValidationErrorResponse([
          { field: "token", message: "Reset token is required" },
          { field: "newPassword", message: "New password is required" },
        ])
      );
    }

    // TODO: Implement token-based password reset
    // For now, return a placeholder response

    return res.status(HTTP_STATUS.OK).json(
      ApiResponse.createSuccessResponse(null, {
        message:
          "Password reset functionality will be implemented in a future update.",
      })
    );
  });
}

export default AuthController;
