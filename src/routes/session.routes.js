// Session Routes - Session management endpoints
import express from "express";
import SessionController from "../controllers/session.controller.js";
import { authenticateJWT } from "../middleware/auth.js";
import { sessionLimiter } from "../middleware/rate-limit.js";
import {
  validateSessionCreationMiddleware,
  validateSessionIdParamMiddleware,
  validateSessionFiltersMiddleware,
  validateSessionConnectionMiddleware,
  validateSessionRestartMiddleware,
} from "../validation/session.validation.js";

const router = express.Router();

// Apply JWT authentication to all session routes
router.use(authenticateJWT);

// GET /api/v1/sessions - List User Sessions
router.get(
  "/",
  validateSessionFiltersMiddleware,
  SessionController.getSessions
);

// POST /api/v1/sessions - Create New Session
router.post(
  "/",
  sessionLimiter,
  validateSessionCreationMiddleware,
  SessionController.createSession
);

// GET /api/v1/sessions/:id - Get Session Details
router.get(
  "/:id",
  validateSessionIdParamMiddleware,
  SessionController.getSessionById
);

// POST /api/v1/sessions/:id/connect - Connect Session (Phase 2)
router.post(
  "/:id/connect",
  sessionLimiter,
  validateSessionConnectionMiddleware,
  SessionController.connectSession
);

// GET /api/v1/sessions/:id/status - Get Session Status
router.get(
  "/:id/status",
  validateSessionIdParamMiddleware,
  SessionController.getSessionStatus
);

// DELETE /api/v1/sessions/:id - Delete Session
router.delete(
  "/:id",
  sessionLimiter,
  validateSessionIdParamMiddleware,
  SessionController.deleteSession
);

// POST /api/v1/sessions/:id/restart - Restart Session
router.post(
  "/:id/restart",
  sessionLimiter,
  validateSessionRestartMiddleware,
  SessionController.restartSession
);

// POST /api/v1/sessions/:id/disconnect - Disconnect Session
router.post(
  "/:id/disconnect",
  sessionLimiter,
  validateSessionIdParamMiddleware,
  SessionController.disconnectSession
);

// POST /api/v1/sessions/:id/logout - Logout Session
router.post(
  "/:id/logout",
  sessionLimiter,
  validateSessionIdParamMiddleware,
  SessionController.logoutSession
);

export default router;
