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
  validateSendContactVcardMiddleware,
  validateSendSeenMiddleware,
  validateSendLinkMiddleware,
  validateSendPollMiddleware,
  validateStartTypingMiddleware,
  validateStopTypingMiddleware,
  validateManageMessageMiddleware,
} from "../validation/api.validation.js";

const router = express.Router();

// ========================================
// OPERATIONAL MESSAGE APIs - For External Integration
// ========================================

// POST /api/sendText - Send text message
router.post(
  "/sendText",
  authenticateApiKey,
  apiLimiter,
  createMessageLimiter,
  validateSendTextMiddleware,
  ApiController.sendText
);

// POST /api/sendImage - Send image message
router.post(
  "/sendImage",
  authenticateApiKey,
  apiLimiter,
  createMessageLimiter,
  validateSendImageMiddleware,
  ApiController.sendImage
);

// POST /api/sendFile - Send document/file message
router.post(
  "/sendFile",
  authenticateApiKey,
  apiLimiter,
  createMessageLimiter,
  validateSendFileMiddleware,
  ApiController.sendFile
);

// POST /api/sendVoice - Send voice/audio message
router.post(
  "/sendVoice",
  authenticateApiKey,
  apiLimiter,
  createMessageLimiter,
  validateSendVoiceMiddleware,
  ApiController.sendVoice
);

// POST /api/sendVideo - Send video message
router.post(
  "/sendVideo",
  authenticateApiKey,
  apiLimiter,
  createMessageLimiter,
  validateSendVideoMiddleware,
  ApiController.sendVideo
);

// POST /api/sendLocation - Send location message
router.post(
  "/sendLocation",
  authenticateApiKey,
  apiLimiter,
  createMessageLimiter,
  validateSendLocationMiddleware,
  ApiController.sendLocation
);

// POST /api/sendContactVcard - Send contact vcard message
router.post(
  "/sendContactVcard",
  authenticateApiKey,
  apiLimiter,
  createMessageLimiter,
  validateSendContactVcardMiddleware,
  ApiController.sendContactVcard
);

// POST /api/sendSeen - Mark message as seen/read
router.post(
  "/sendSeen",
  authenticateApiKey,
  apiLimiter,
  validateSendSeenMiddleware,
  ApiController.sendSeen
);

// POST /api/sendLink - Send link message
router.post(
  "/sendLink",
  authenticateApiKey,
  apiLimiter,
  createMessageLimiter,
  validateSendLinkMiddleware,
  ApiController.sendLink
);

// POST /api/sendPoll - Send poll message
router.post(
  "/sendPoll",
  authenticateApiKey,
  apiLimiter,
  createMessageLimiter,
  validateSendPollMiddleware,
  ApiController.sendPoll
);

// POST /api/startTyping - Start typing indicator
router.post(
  "/startTyping",
  authenticateApiKey,
  apiLimiter,
  validateStartTypingMiddleware,
  ApiController.startTyping
);

// POST /api/stopTyping - Stop typing indicator
router.post(
  "/stopTyping",
  authenticateApiKey,
  apiLimiter,
  validateStopTypingMiddleware,
  ApiController.stopTyping
);

// POST /api/message/:messageId/:action - Manage message (delete, unsend, edit, star, unstar, reaction, read)
router.post(
  "/message/:messageId/:action",
  authenticateApiKey,
  apiLimiter,
  validateManageMessageMiddleware,
  ApiController.manageMessage
);

// GET /api/session/status - Get session status (sessionId from API key)
router.get(
  "/session/status",
  authenticateApiKey,
  apiLimiter,
  ApiController.getSessionStatus
);

export default router;
