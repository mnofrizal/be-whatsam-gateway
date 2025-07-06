// Session Routes - Session management endpoints
import express from "express";
import SessionController from "../controllers/session.controller.js";
import { authenticateJWT } from "../middleware/auth.js";
import { ValidationHelper } from "../utils/helpers.js";
import {
  sessionLimiter,
  createMessageLimiter,
} from "../middleware/rate-limit.js";
import {
  validateSessionCreation,
  validateSessionIdParam,
  validateSessionFilters,
  validateSendMessage,
  validateMessageHistory,
  validateSessionConnection,
  validateSessionRestart,
} from "../validation/session.validation.js";

const router = express.Router();

// Apply JWT authentication to all session routes
router.use(authenticateJWT);

// GET /api/v1/sessions - List User Sessions
router.get(
  "/",
  validateSessionFilters,
  ValidationHelper.handleValidationErrors,
  SessionController.getSessions
);

// POST /api/v1/sessions - Create New Session
router.post(
  "/",
  sessionLimiter,
  validateSessionCreation,
  ValidationHelper.handleValidationErrors,
  SessionController.createSession
);

// GET /api/v1/sessions/:id - Get Session Details
router.get(
  "/:id",
  validateSessionIdParam,
  ValidationHelper.handleValidationErrors,
  SessionController.getSessionById
);

// POST /api/v1/sessions/:id/connect - Connect Session (Phase 2)
router.post(
  "/:id/connect",
  sessionLimiter,
  validateSessionConnection,
  ValidationHelper.handleValidationErrors,
  SessionController.connectSession
);

// GET /api/v1/sessions/:id/qr - Get Session QR Code
router.get(
  "/:id/qr",
  validateSessionIdParam,
  ValidationHelper.handleValidationErrors,
  SessionController.getQRCode
);

// GET /api/v1/sessions/:id/status - Get Session Status
router.get(
  "/:id/status",
  validateSessionIdParam,
  ValidationHelper.handleValidationErrors,
  SessionController.getSessionStatus
);

// DELETE /api/v1/sessions/:id - Delete Session
router.delete(
  "/:id",
  sessionLimiter,
  validateSessionIdParam,
  ValidationHelper.handleValidationErrors,
  SessionController.deleteSession
);

// POST /api/v1/sessions/:id/send - Send Message
router.post(
  "/:id/send",
  createMessageLimiter,
  validateSendMessage,
  ValidationHelper.handleValidationErrors,
  SessionController.sendMessage
);

// GET /api/v1/sessions/:id/messages - Get Message History (Week 5)
router.get(
  "/:id/messages",
  validateMessageHistory,
  ValidationHelper.handleValidationErrors,
  SessionController.getMessages
);

// POST /api/v1/sessions/:id/restart - Restart Session
router.post(
  "/:id/restart",
  sessionLimiter,
  validateSessionRestart,
  ValidationHelper.handleValidationErrors,
  SessionController.restartSession
);

// POST /api/v1/sessions/:id/disconnect - Disconnect Session
router.post(
  "/:id/disconnect",
  sessionLimiter,
  validateSessionIdParam,
  ValidationHelper.handleValidationErrors,
  SessionController.disconnectSession
);

// POST /api/v1/sessions/:id/logout - Logout Session
router.post(
  "/:id/logout",
  sessionLimiter,
  validateSessionIdParam,
  ValidationHelper.handleValidationErrors,
  SessionController.logoutSession
);

export default router;
