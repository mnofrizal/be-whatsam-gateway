// External API Routes - Operational Message APIs for External Integration
// These routes are for external API consumers using Bearer token authentication
import express from "express";
import { apiLimiter, createMessageLimiter } from "../middleware/rate-limit.js";
import { authenticateApiKey } from "../middleware/auth.js";
import ApiController from "../controllers/api.controller.js";
import {
  validateSendTextMiddleware,
  validateSendImageMiddleware,
  validateSendFileMiddleware,
  validateSendVoiceMiddleware,
  validateSendVideoMiddleware,
  validateSendLocationMiddleware,
  validateSendSeenMiddleware,
} from "../validation/api.validation.js";

const router = express.Router();

// ========================================
// OPERATIONAL MESSAGE APIs - For External Integration
// ========================================

// POST /api/v1/sendText - Send text message
router.post(
  "/sendText",
  authenticateApiKey,
  apiLimiter,
  createMessageLimiter,
  validateSendTextMiddleware,
  ApiController.sendText
);

// POST /api/v1/sendImage - Send image message
router.post(
  "/sendImage",
  authenticateApiKey,
  apiLimiter,
  createMessageLimiter,
  validateSendImageMiddleware,
  ApiController.sendImage
);

// POST /api/v1/sendFile - Send document/file message
router.post(
  "/sendFile",
  authenticateApiKey,
  apiLimiter,
  createMessageLimiter,
  validateSendFileMiddleware,
  ApiController.sendFile
);

// POST /api/v1/sendVoice - Send voice/audio message
router.post(
  "/sendVoice",
  authenticateApiKey,
  apiLimiter,
  createMessageLimiter,
  validateSendVoiceMiddleware,
  ApiController.sendVoice
);

// POST /api/v1/sendVideo - Send video message
router.post(
  "/sendVideo",
  authenticateApiKey,
  apiLimiter,
  createMessageLimiter,
  validateSendVideoMiddleware,
  ApiController.sendVideo
);

// POST /api/v1/sendLocation - Send location message
router.post(
  "/sendLocation",
  authenticateApiKey,
  apiLimiter,
  createMessageLimiter,
  validateSendLocationMiddleware,
  ApiController.sendLocation
);

// POST /api/v1/sendSeen - Mark message as seen/read
router.post(
  "/sendSeen",
  authenticateApiKey,
  apiLimiter,
  validateSendSeenMiddleware,
  ApiController.sendSeen
);

// GET /api/v1/session/status - Get session status (sessionId from API key)
router.get(
  "/session/status",
  authenticateApiKey,
  apiLimiter,
  ApiController.getSessionStatus
);

// GET /api/v1/session/qr - Get session QR code (sessionId from API key)
router.get(
  "/session/qr",
  authenticateApiKey,
  apiLimiter,
  ApiController.getSessionQR
);

export default router;
