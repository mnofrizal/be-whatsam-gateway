// Authentication Routes - Implemented
import express from "express";
import { sessionLimiter } from "../middleware/rate-limit.js";
import { authenticateJWT } from "../middleware/auth.js";
import AuthController from "../controllers/auth.controller.js";
import {
  validateRegisterMiddleware,
  validateLoginMiddleware,
  validateChangePasswordMiddleware,
  validateRefreshTokenMiddleware,
  validateEmailMiddleware,
  validateResetPasswordMiddleware,
} from "../validation/auth.validation.js";

const router = express.Router();

// POST /api/v1/auth/register - User Registration
router.post(
  "/register",
  sessionLimiter,
  validateRegisterMiddleware,
  AuthController.register
);

// POST /api/v1/auth/login - User Login
router.post(
  "/login",
  sessionLimiter,
  validateLoginMiddleware,
  AuthController.login
);

// POST /api/v1/auth/logout - User Logout (requires authentication)
router.post("/logout", authenticateJWT, AuthController.logout);

// POST /api/v1/auth/refresh - Refresh JWT Token
router.post(
  "/refresh",
  validateRefreshTokenMiddleware,
  AuthController.refreshToken
);

// GET /api/v1/auth/me - Get Current User (requires authentication)
router.get("/me", authenticateJWT, AuthController.getCurrentUser);

// POST /api/v1/auth/change-password - Change Password (requires authentication)
router.post(
  "/change-password",
  authenticateJWT,
  validateChangePasswordMiddleware,
  AuthController.changePassword
);

// POST /api/v1/auth/deactivate - Deactivate Account (requires authentication)
router.post("/deactivate", authenticateJWT, AuthController.deactivateAccount);

// POST /api/v1/auth/forgot-password - Password Reset Request
router.post(
  "/forgot-password",
  sessionLimiter,
  validateEmailMiddleware,
  AuthController.forgotPassword
);

// POST /api/v1/auth/reset-password - Password Reset Confirmation
router.post(
  "/reset-password",
  sessionLimiter,
  validateResetPasswordMiddleware,
  AuthController.resetPassword
);

export default router;
