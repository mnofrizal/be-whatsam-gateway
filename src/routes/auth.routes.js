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

// POST /api/auth/register - User Registration
router.post(
  "/register",
  sessionLimiter,
  validateRegisterMiddleware,
  AuthController.register
);

// POST /api/auth/login - User Login
router.post(
  "/login",
  sessionLimiter,
  validateLoginMiddleware,
  AuthController.login
);

// POST /api/auth/logout - User Logout (requires authentication)
router.post("/logout", authenticateJWT, AuthController.logout);

// POST /api/auth/refresh - Refresh JWT Token
router.post(
  "/refresh",
  validateRefreshTokenMiddleware,
  AuthController.refreshToken
);

// GET /api/auth/me - Get Current User (requires authentication)
router.get("/me", authenticateJWT, AuthController.getCurrentUser);

// POST /api/auth/change-password - Change Password (requires authentication)
router.post(
  "/change-password",
  authenticateJWT,
  validateChangePasswordMiddleware,
  AuthController.changePassword
);

// POST /api/auth/deactivate - Deactivate Account (requires authentication)
router.post("/deactivate", authenticateJWT, AuthController.deactivateAccount);

// POST /api/auth/forgot-password - Password Reset Request
router.post(
  "/forgot-password",
  sessionLimiter,
  validateEmailMiddleware,
  AuthController.forgotPassword
);

// POST /api/auth/reset-password - Password Reset Confirmation
router.post(
  "/reset-password",
  sessionLimiter,
  validateResetPasswordMiddleware,
  AuthController.resetPassword
);

export default router;
