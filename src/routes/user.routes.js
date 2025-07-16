// User Routes - User management endpoints
import express from "express";
import UserController from "../controllers/user.controller.js";
import { sessionLimiter } from "../middleware/rate-limit.js";
import { authenticateJWT } from "../middleware/auth.js";
import {
  validateUpdateProfileMiddleware,
  validateDeactivateAccountMiddleware,
  validateUsageQueryMiddleware,
  validateSessionsQueryMiddleware,
} from "../validation/user.validation.js";

const router = express.Router();

// Apply JWT authentication to all user routes
router.use(authenticateJWT);

// Get user profile
router.get("/profile", UserController.getUserProfile);

// Update user profile
router.put(
  "/profile",
  sessionLimiter,
  validateUpdateProfileMiddleware,
  UserController.updateUserProfile
);

// Get user's API keys
router.get("/api-keys", UserController.getUserApiKeys);

// Delete API key
router.delete("/api-keys/:id", sessionLimiter, UserController.deleteApiKey);

// Get user usage statistics
router.get("/usage", validateUsageQueryMiddleware, UserController.getUserUsage);

// Get user tier information
router.get("/tier", UserController.getUserTier);

// Get user sessions
router.get(
  "/sessions",
  validateSessionsQueryMiddleware,
  UserController.getUserSessions
);

// Deactivate user account
router.post(
  "/deactivate",
  sessionLimiter,
  validateDeactivateAccountMiddleware,
  UserController.deactivateAccount
);

export default router;
