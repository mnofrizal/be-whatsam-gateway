import { asyncHandler } from "../middleware/error-handler.js";
import { ApiResponse } from "../utils/helpers.js";
import { HTTP_STATUS } from "../utils/constants.js";
import {
  updateSessionStatus,
  updateMessageStatus,
  updateWorkerHeartbeat,
  updateUsageRecord,
} from "../services/webhook.service.js";
import logger from "../utils/logger.js";

/**
 * Webhook Controller
 * Handles webhook endpoints for worker events and notifications
 */

/**
 * Handle session status updates from workers
 * Endpoint: POST /api/webhooks/session-status
 */
const handleSessionStatus = asyncHandler(async (req, res) => {
  // Log the raw request first
  logger.info("=== WEBHOOK SESSION STATUS RECEIVED ===", {
    method: req.method,
    url: req.originalUrl,
    headers: req.headers,
    bodyKeys: Object.keys(req.body),
    bodySize: JSON.stringify(req.body).length,
    timestamp: new Date().toISOString(),
  });

  const {
    sessionId,
    status,
    qrCode,
    phoneNumber,
    displayName,
    workerId,
    timestamp,
  } = req.body;

  // Enhanced logging with QR code details
  logger.info("Parsed webhook data", {
    sessionId,
    status,
    hasQrCode: !!qrCode,
    qrCodeLength: qrCode ? qrCode.length : 0,
    qrCodePrefix: qrCode ? qrCode.substring(0, 50) + "..." : null,
    phoneNumber,
    displayName,
    workerId,
    timestamp,
    requestId: req.headers["x-request-id"] || "unknown",
  });

  // Log authentication details
  logger.info("Webhook authentication", {
    hasAuthHeader: !!req.headers.authorization,
    authType: req.headers.authorization
      ? req.headers.authorization.split(" ")[0]
      : null,
    userAgent: req.headers["user-agent"],
    contentType: req.headers["content-type"],
  });

  try {
    // Use webhook service to update session status
    const updatedSession = await updateSessionStatus(sessionId, {
      status,
      qrCode,
      phoneNumber,
      displayName,
      workerId,
      timestamp,
    });

    logger.info("Session status updated successfully", {
      sessionId,
      status: updatedSession.status,
      phoneNumber: updatedSession.phoneNumber,
      displayName: updatedSession.displayName,
    });

    return res.status(HTTP_STATUS.OK).json(
      ApiResponse.createSuccessResponse({
        sessionId: updatedSession.id,
        status: updatedSession.status,
        phoneNumber: updatedSession.phoneNumber,
        displayName: updatedSession.displayName,
        updatedAt: updatedSession.updatedAt,
      })
    );
  } catch (error) {
    logger.error("Failed to update session status", {
      sessionId,
      status,
      error: error.message,
      stack: error.stack,
    });

    if (error.code === "P2025") {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json(
          ApiResponse.createErrorResponse(`Session not found: ${sessionId}`)
        );
    }

    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json(ApiResponse.createErrorResponse("Failed to update session status"));
  }
});

/**
 * Handle message status updates from workers
 * Endpoint: POST /api/webhooks/message-status
 */
const handleMessageStatus = asyncHandler(async (req, res) => {
  const {
    sessionId,
    messageId,
    status,
    timestamp,
    deliveredAt,
    readAt,
    errorMessage,
  } = req.body;

  logger.info("Received message status webhook", {
    sessionId,
    messageId,
    status,
    timestamp,
  });

  try {
    // Use webhook service to update message status
    const updatedMessage = await updateMessageStatus(messageId, {
      status,
      deliveredAt,
      readAt,
      errorMessage,
      timestamp,
    });

    // Update usage records for billing on successful delivery
    if (
      status.toLowerCase() === "sent" ||
      status.toLowerCase() === "delivered"
    ) {
      await updateUsageRecord(sessionId, messageId);
    }

    logger.info("Message status updated successfully", {
      messageId,
      status: updatedMessage.status,
      sessionId,
    });

    return res.status(HTTP_STATUS.OK).json(
      ApiResponse.createSuccessResponse({
        messageId: updatedMessage.id,
        status: updatedMessage.status,
        sessionId: updatedMessage.sessionId,
        updatedAt: updatedMessage.createdAt,
      })
    );
  } catch (error) {
    logger.error("Failed to update message status", {
      sessionId,
      messageId,
      status,
      error: error.message,
      stack: error.stack,
    });

    if (error.code === "P2025") {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json(
          ApiResponse.createErrorResponse(`Message not found: ${messageId}`)
        );
    }

    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json(ApiResponse.createErrorResponse("Failed to update message status"));
  }
});

/**
 * Handle worker heartbeat and metrics updates
 * Endpoint: POST /api/webhooks/worker-heartbeat
 */
const handleWorkerHeartbeat = asyncHandler(async (req, res) => {
  const {
    workerId,
    status,
    sessionCount,
    cpuUsage,
    memoryUsage,
    uptime,
    activeConnections,
    timestamp,
  } = req.body;

  logger.debug("Received worker heartbeat webhook", {
    workerId,
    status,
    sessionCount,
    timestamp,
  });

  try {
    // Use webhook service to update worker heartbeat
    const updatedWorker = await updateWorkerHeartbeat(workerId, {
      status,
      sessionCount,
      cpuUsage,
      memoryUsage,
      uptime,
      activeConnections,
      timestamp,
    });

    logger.info("Worker heartbeat updated successfully", {
      workerId,
      status: updatedWorker.status,
      sessionCount: updatedWorker.sessionCount,
    });

    return res.status(HTTP_STATUS.OK).json(
      ApiResponse.createSuccessResponse({
        workerId: updatedWorker.id,
        status: updatedWorker.status,
        sessionCount: updatedWorker.sessionCount,
        lastHeartbeat: updatedWorker.lastHeartbeat,
      })
    );
  } catch (error) {
    logger.error("Failed to update worker heartbeat", {
      workerId,
      status,
      error: error.message,
      stack: error.stack,
    });

    if (error.code === "P2025") {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json(ApiResponse.createErrorResponse(`Worker not found: ${workerId}`));
    }

    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json(
        ApiResponse.createErrorResponse("Failed to update worker heartbeat")
      );
  }
});

// Export individual functions
export { handleSessionStatus, handleMessageStatus, handleWorkerHeartbeat };

// Export all functions as default object for route compatibility
export default {
  handleSessionStatus,
  handleMessageStatus,
  handleWorkerHeartbeat,
};
