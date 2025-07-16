import prisma from "../database/client.js";
import logger from "../utils/logger.js";
import socketService from "./socket.service.js";

/**
 * Update session status from worker webhook
 * @param {string} sessionId - Session identifier
 * @param {Object} statusData - Status data from webhook
 * @returns {Object} Updated session data
 */
export const updateSessionStatus = async (sessionId, statusData) => {
  try {
    const { status, qrCode, phoneNumber, displayName, workerId, timestamp } =
      statusData;

    // Enhanced logging for debugging QR code issues
    logger.info("=== WEBHOOK SERVICE: Processing session status update ===", {
      sessionId,
      status,
      hasQrCode: !!qrCode,
      qrCodeLength: qrCode ? qrCode.length : 0,
      qrCodeType: qrCode ? typeof qrCode : null,
      qrCodeSample: qrCode ? qrCode.substring(0, 100) + "..." : null,
      phoneNumber,
      displayName,
      workerId,
      timestamp,
      receivedAt: new Date().toISOString(),
    });

    // Prepare update data
    const updateData = {
      status: status.toUpperCase(),
      lastSeenAt: timestamp ? new Date(timestamp) : new Date(),
    };

    // Add QR code data if provided (raw format)
    if (qrCode) {
      updateData.qrCode = qrCode;
    }

    // Add phone number if provided (when connected)
    if (phoneNumber) {
      updateData.phoneNumber = phoneNumber;
    }

    // Add display name if provided (WhatsApp account name)
    if (displayName) {
      updateData.displayName = displayName;
    }

    // Add worker ID if provided (for worker assignment tracking)
    if (workerId) {
      updateData.workerId = workerId;
    }

    // Log the update data before database operation
    logger.info("Database update data prepared", {
      sessionId,
      updateData: {
        ...updateData,
        qrCode: updateData.qrCode
          ? `[QR_CODE_${updateData.qrCode.length}_chars]`
          : null,
      },
    });

    // Update session in database
    const updatedSession = await prisma.session.update({
      where: { id: sessionId },
      data: updateData,
    });

    logger.info("Database update completed", {
      sessionId,
      updatedStatus: updatedSession.status,
      hasQrCodeInDB: !!updatedSession.qrCode,
      qrCodeLengthInDB: updatedSession.qrCode
        ? updatedSession.qrCode.length
        : 0,
    });

    // Emit real-time events via Socket.IO
    if (qrCode) {
      logger.info("Emitting QR code update via Socket.IO", {
        sessionId,
        qrCodeLength: qrCode.length,
      });
      // Emit QR code update
      socketService.emitQRCodeUpdate(sessionId, qrCode);
    }

    // Emit session status change
    logger.info("Emitting session status change via Socket.IO", {
      sessionId,
      status: updatedSession.status,
      phoneNumber: updatedSession.phoneNumber,
      displayName: updatedSession.displayName,
    });
    socketService.emitSessionStatusChange(
      sessionId,
      updatedSession.status,
      updatedSession.phoneNumber,
      updatedSession.displayName
    );

    logger.info("Session status updated via webhook", {
      sessionId,
      status: updatedSession.status,
      phoneNumber: updatedSession.phoneNumber,
      displayName: updatedSession.displayName,
      workerId: updatedSession.workerId,
    });

    return updatedSession;
  } catch (error) {
    logger.error("Failed to update session status via webhook", {
      sessionId,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

/**
 * Update message status from worker webhook
 * @param {string} messageId - Message identifier
 * @param {Object} statusData - Status data from webhook
 * @returns {Object} Updated message data
 */
export const updateMessageStatus = async (messageId, statusData) => {
  try {
    const { status, deliveredAt, readAt, errorMessage, timestamp } = statusData;

    // Prepare update data
    const updateData = {
      status: status.toUpperCase(),
    };

    // Add timestamps based on status
    if (status.toLowerCase() === "sent") {
      updateData.sentAt = timestamp ? new Date(timestamp) : new Date();
    } else if (status.toLowerCase() === "delivered" && deliveredAt) {
      updateData.deliveredAt = new Date(deliveredAt);
    } else if (status.toLowerCase() === "read" && readAt) {
      updateData.readAt = new Date(readAt);
    } else if (status.toLowerCase() === "failed" && errorMessage) {
      updateData.errorMessage = errorMessage;
    }

    // Update message in database
    const updatedMessage = await prisma.message.update({
      where: { id: messageId },
      data: updateData,
    });

    // Emit real-time message status update via Socket.IO
    socketService.emitMessageStatusUpdate(
      updatedMessage.sessionId,
      messageId,
      updatedMessage.status,
      updatedMessage.deliveredAt
    );

    logger.info("Message status updated via webhook", {
      messageId,
      status: updatedMessage.status,
      sessionId: updatedMessage.sessionId,
    });

    return updatedMessage;
  } catch (error) {
    logger.error("Failed to update message status via webhook", {
      messageId,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

/**
 * Update worker heartbeat and metrics
 * @param {string} workerId - Worker identifier
 * @param {Object} heartbeatData - Heartbeat data from webhook
 * @returns {Object} Updated worker data
 */
export const updateWorkerHeartbeat = async (workerId, heartbeatData) => {
  try {
    const {
      status,
      sessionCount,
      cpuUsage,
      memoryUsage,
      uptime,
      activeConnections,
      timestamp,
    } = heartbeatData;

    // Update worker status and metrics
    const updatedWorker = await prisma.worker.update({
      where: { id: workerId },
      data: {
        status: status.toUpperCase(),
        sessionCount: sessionCount || 0,
        cpuUsage: cpuUsage || 0,
        memoryUsage: memoryUsage || 0,
        lastHeartbeat: timestamp ? new Date(timestamp) : new Date(),
      },
    });

    // Store metrics for analytics if provided
    if (cpuUsage !== undefined || memoryUsage !== undefined) {
      await prisma.workerMetric.create({
        data: {
          workerId,
          cpuUsage: cpuUsage || 0,
          memoryUsage: memoryUsage || 0,
          sessionCount: sessionCount || 0,
          messageCount: 0, // Will be updated separately
          uptime: uptime || 0,
          timestamp: timestamp ? new Date(timestamp) : new Date(),
        },
      });
    }

    // Emit real-time worker status update via Socket.IO
    socketService.emitWorkerStatusUpdate(workerId, updatedWorker.status, {
      sessionCount: updatedWorker.sessionCount,
      cpuUsage: updatedWorker.cpuUsage,
      memoryUsage: updatedWorker.memoryUsage,
      lastHeartbeat: updatedWorker.lastHeartbeat,
      uptime: uptime || 0,
      activeConnections: activeConnections || 0,
    });

    logger.info("Worker heartbeat updated via webhook", {
      workerId,
      status: updatedWorker.status,
      sessionCount: updatedWorker.sessionCount,
    });

    return updatedWorker;
  } catch (error) {
    logger.error("Failed to update worker heartbeat via webhook", {
      workerId,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

/**
 * Update usage records for billing
 * @param {string} sessionId - Session identifier
 * @param {string} messageId - Message identifier
 * @returns {Object} Updated usage record
 */
export const updateUsageRecord = async (sessionId, messageId) => {
  try {
    // Get session with user and API key info
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        user: true,
        apiKey: true,
      },
    });

    if (!session || !session.apiKey) {
      logger.warn("Session or API key not found for usage record", {
        sessionId,
      });
      return null;
    }

    const billingDate = new Date();
    billingDate.setDate(1); // First day of current month
    billingDate.setHours(0, 0, 0, 0);

    // Upsert usage record
    const usageRecord = await prisma.usageRecord.upsert({
      where: {
        userId_apiKeyId_billingDate: {
          userId: session.userId,
          apiKeyId: session.apiKey.id,
          billingDate: billingDate,
        },
      },
      update: {
        usageCount: { increment: 1 },
      },
      create: {
        userId: session.userId,
        sessionId: sessionId,
        apiKeyId: session.apiKey.id,
        usageCount: 1,
        billingDate: billingDate,
      },
    });

    logger.debug("Usage record updated via webhook", {
      sessionId,
      messageId,
      userId: session.userId,
      usageCount: usageRecord.usageCount,
      billingDate: billingDate.toISOString(),
    });

    return usageRecord;
  } catch (error) {
    logger.error("Failed to update usage record via webhook", {
      sessionId,
      messageId,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Get webhook delivery statistics
 * @param {string} sessionId - Session identifier
 * @param {string} timeRange - Time range for statistics
 * @returns {Object} Webhook statistics
 */
export const getWebhookStats = async (sessionId, timeRange = "24h") => {
  try {
    const timeRanges = {
      "1h": new Date(Date.now() - 60 * 60 * 1000),
      "24h": new Date(Date.now() - 24 * 60 * 60 * 1000),
      "7d": new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      "30d": new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    };

    const since = timeRanges[timeRange] || timeRanges["24h"];

    // Get session status updates count
    const sessionUpdates = await prisma.session.count({
      where: {
        id: sessionId,
        updatedAt: { gte: since },
      },
    });

    // Get message status updates count
    const messageUpdates = await prisma.message.count({
      where: {
        sessionId: sessionId,
        createdAt: { gte: since },
      },
    });

    return {
      sessionId,
      timeRange,
      since: since.toISOString(),
      sessionUpdates,
      messageUpdates,
      totalWebhooks: sessionUpdates + messageUpdates,
    };
  } catch (error) {
    logger.error("Failed to get webhook stats", {
      sessionId,
      timeRange,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Validate webhook payload
 * @param {string} type - Webhook type
 * @param {Object} payload - Webhook payload
 * @returns {Object} Validation result
 */
export const validateWebhookPayload = (type, payload) => {
  const errors = [];

  switch (type) {
    case "session-status":
      if (!payload.sessionId) errors.push("sessionId is required");
      if (!payload.status) errors.push("status is required");
      break;

    case "message-status":
      if (!payload.sessionId) errors.push("sessionId is required");
      if (!payload.messageId) errors.push("messageId is required");
      if (!payload.status) errors.push("status is required");
      break;

    case "worker-heartbeat":
      if (!payload.workerId) errors.push("workerId is required");
      if (!payload.status) errors.push("status is required");
      break;

    default:
      errors.push("Invalid webhook type");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Export default object with all functions
export default {
  updateSessionStatus,
  updateMessageStatus,
  updateWorkerHeartbeat,
  updateUsageRecord,
  getWebhookStats,
  validateWebhookPayload,
};
