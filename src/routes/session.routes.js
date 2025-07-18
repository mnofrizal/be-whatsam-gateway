// Session Routes - Session management endpoints
import express from "express";
import SessionController from "../controllers/session.controller.js";
import { authenticateJWT } from "../middleware/auth.js";
import {
  sessionLimiter,
  createMessageLimiter,
} from "../middleware/rate-limit.js";
import {
  validateSessionCreationMiddleware,
  validateSessionIdParamMiddleware,
  validateSessionFiltersMiddleware,
  validateSendMessageMiddleware,
  validateMessageHistoryMiddleware,
  validateSessionConnectionMiddleware,
  validateSessionRestartMiddleware,
} from "../validation/session.validation.js";

const router = express.Router();

// Apply JWT authentication to all session routes
router.use(authenticateJWT);

// GET /api/sessions - List User Sessions
router.get(
  "/",
  validateSessionFiltersMiddleware,
  SessionController.getSessions
);

// POST /api/sessions - Create New Session
router.post(
  "/",
  sessionLimiter,
  validateSessionCreationMiddleware,
  SessionController.createSession
);

// GET /api/sessions/:id - Get Session Details
router.get(
  "/:id",
  validateSessionIdParamMiddleware,
  SessionController.getSessionById
);

// POST /api/sessions/:id/connect - Connect Session (Phase 2)
router.post(
  "/:id/connect",
  sessionLimiter,
  validateSessionConnectionMiddleware,
  SessionController.connectSession
);

// GET /api/sessions/:id/status - Get Session Status
router.get(
  "/:id/status",
  validateSessionIdParamMiddleware,
  SessionController.getSessionStatus
);

// DELETE /api/sessions/:id - Delete Session
router.delete(
  "/:id",
  sessionLimiter,
  validateSessionIdParamMiddleware,
  SessionController.deleteSession
);

// POST /api/sessions/:id/send - Send Message
router.post(
  "/:id/send",
  createMessageLimiter,
  validateSendMessageMiddleware,
  SessionController.sendMessage
);

// GET /api/sessions/:id/messages - Get Message History (Week 5)
router.get(
  "/:id/messages",
  validateMessageHistoryMiddleware,
  SessionController.getMessages
);

// POST /api/sessions/:id/restart - Restart Session
router.post(
  "/:id/restart",
  sessionLimiter,
  validateSessionRestartMiddleware,
  SessionController.restartSession
);

// POST /api/sessions/:id/disconnect - Disconnect Session
router.post(
  "/:id/disconnect",
  sessionLimiter,
  validateSessionIdParamMiddleware,
  SessionController.disconnectSession
);

// POST /api/sessions/:id/logout - Logout Session
router.post(
  "/:id/logout",
  sessionLimiter,
  validateSessionIdParamMiddleware,
  SessionController.logoutSession
);

export default router;
