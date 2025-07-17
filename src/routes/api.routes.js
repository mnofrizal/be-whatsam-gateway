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
  validateTypingIndicatorMiddleware,
  validateSendLinkMiddleware,
  validateSendPollMiddleware,
  // New dual validation middleware (URL params + body)
  validateMessageDeleteParamsAndBodyMiddleware,
  validateMessageUnsendParamsAndBodyMiddleware,
  validateMessageReactionParamsAndBodyMiddleware,
  validateMessageEditParamsAndBodyMiddleware,
  validateMessageReadParamsAndBodyMiddleware,
  validateMessageStarParamsAndBodyMiddleware,
  validateMessageUnstarParamsAndBodyMiddleware,
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

// GET /api/session/status - Get session status (sessionId from API key)
router.get(
  "/session/status",
  authenticateApiKey,
  apiLimiter,
  ApiController.getSessionStatus
);

// POST /api/startTyping - Start typing indicator
router.post(
  "/startTyping",
  authenticateApiKey,
  apiLimiter,
  validateTypingIndicatorMiddleware,
  ApiController.startTyping
);

// POST /api/stopTyping - Stop typing indicator
router.post(
  "/stopTyping",
  authenticateApiKey,
  apiLimiter,
  validateTypingIndicatorMiddleware,
  ApiController.stopTyping
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

// ========================================
// MESSAGE MANAGEMENT APIs - For External Integration
// ========================================

// POST /api/message/{messageId}/delete - Delete message
router.post(
  "/message/:messageId/delete",
  authenticateApiKey,
  apiLimiter,
  ...validateMessageDeleteParamsAndBodyMiddleware,
  ApiController.deleteMessage
);

// POST /api/message/{messageId}/unsend - Unsend message
router.post(
  "/message/:messageId/unsend",
  authenticateApiKey,
  apiLimiter,
  ...validateMessageUnsendParamsAndBodyMiddleware,
  ApiController.unsendMessage
);

// POST /api/message/{messageId}/reaction - React to message
router.post(
  "/message/:messageId/reaction",
  authenticateApiKey,
  apiLimiter,
  ...validateMessageReactionParamsAndBodyMiddleware,
  ApiController.reactToMessage
);

// POST /api/message/{messageId}/edit - Edit message
router.post(
  "/message/:messageId/edit",
  authenticateApiKey,
  apiLimiter,
  ...validateMessageEditParamsAndBodyMiddleware,
  ApiController.editMessage
);

// POST /api/message/{messageId}/read - Mark message as read
router.post(
  "/message/:messageId/read",
  authenticateApiKey,
  apiLimiter,
  ...validateMessageReadParamsAndBodyMiddleware,
  ApiController.markMessageAsRead
);

// POST /api/message/{messageId}/star - Star message
router.post(
  "/message/:messageId/star",
  authenticateApiKey,
  apiLimiter,
  ...validateMessageStarParamsAndBodyMiddleware,
  ApiController.starMessage
);

// POST /api/message/{messageId}/unstar - Unstar message
router.post(
  "/message/:messageId/unstar",
  authenticateApiKey,
  apiLimiter,
  ...validateMessageUnstarParamsAndBodyMiddleware,
  ApiController.unstarMessage
);

export default router;
