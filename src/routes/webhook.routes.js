import express from "express";
import {
  handleSessionStatus,
  handleMessageStatus,
  handleWorkerHeartbeat,
} from "../controllers/webhook.controller.js";
import { authenticateWorker } from "../middleware/auth.js";
import { sessionLimiter } from "../middleware/rate-limit.js";
import {
  validateSessionStatusMiddleware,
  validateMessageStatusMiddleware,
  validateWorkerHeartbeatMiddleware,
  validateWebhookCommon,
  validateWebhookPayloadSize,
  validateSessionIdFormat,
  validateWorkerIdFormat,
} from "../validation/webhook.validation.js";

const router = express.Router();

/**
 * Webhook Routes
 * These endpoints are called by workers to report status updates
 * All webhook endpoints require worker authentication and validation
 */

// Apply common middleware to all webhook routes
router.use(validateWebhookPayloadSize);
router.use(validateWebhookCommon);

/**
 * @route   POST /api/webhooks/session-status
 * @desc    Handle session status updates from workers
 * @access  Worker (requires worker authentication)
 * @body    { sessionId, status, qrCode?, phoneNumber?, timestamp? }
 * @validation sessionId (required), status (required), qrCode (optional), phoneNumber (optional), timestamp (optional)
 */
router.post(
  "/session-status",
  authenticateWorker,
  sessionLimiter,
  validateSessionIdFormat,
  validateSessionStatusMiddleware,
  handleSessionStatus
);

/**
 * @route   POST /api/webhooks/message-status
 * @desc    Handle message status updates from workers
 * @access  Worker (requires worker authentication)
 * @body    { sessionId, messageId, status, timestamp?, deliveredAt?, readAt?, errorMessage? }
 * @validation sessionId (required), messageId (required), status (required), timestamps (optional), errorMessage (optional)
 */
router.post(
  "/message-status",
  authenticateWorker,
  sessionLimiter,
  validateSessionIdFormat,
  validateMessageStatusMiddleware,
  handleMessageStatus
);

/**
 * @route   POST /api/webhooks/worker-heartbeat
 * @desc    Handle worker heartbeat and metrics updates
 * @access  Worker (requires worker authentication)
 * @body    { workerId, status, sessionCount?, cpuUsage?, memoryUsage?, uptime?, activeConnections?, timestamp? }
 * @validation workerId (required), status (required), metrics (optional), timestamp (optional)
 */
router.post(
  "/worker-heartbeat",
  authenticateWorker,
  sessionLimiter,
  validateWorkerIdFormat,
  validateWorkerHeartbeatMiddleware,
  handleWorkerHeartbeat
);

export default router;
