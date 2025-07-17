// API Service - External API messaging business logic
import prisma from "../database/client.js";
import Redis from "ioredis";
import WorkerService from "./worker.service.js";
import ProxyService from "./proxy.service.js";
import logger from "../utils/logger.js";
import {
  ConnectivityError,
  NotFoundError,
  ConflictError,
} from "../middleware/error-handler.js";

const redis = new Redis(process.env.REDIS_URL);

/**
 * Send message through session
 * @param {string} sessionId - Session ID
 * @param {Object} messageData - Message data object containing to, type, message, etc.
 * @returns {Object} Send result
 */
export const sendMessage = async (sessionId, messageData) => {
  try {
    logger.info("Sending message through external API", {
      sessionId,
      to: messageData.to,
      type: messageData.type,
      service: "ApiService",
    });

    // Get session and verify it's connected
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        worker: {
          select: {
            id: true,
            endpoint: true,
            status: true,
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundError("Session not found");
    }

    if (session.status !== "CONNECTED") {
      throw new ConflictError(
        `Session is not connected. Current status: ${session.status}`
      );
    }

    if (!session.workerId || !session.worker) {
      throw new ConnectivityError("No worker assigned to session");
    }

    if (session.worker.status !== "ONLINE") {
      throw new ConnectivityError("Worker is not online");
    }

    // Send message through worker
    const response = await ProxyService.sendMessage(
      session.worker.endpoint,
      sessionId,
      messageData
    );

    logger.info("Message sent successfully via external API", {
      sessionId,
      to: messageData.to,
      type: messageData.type,
      workerId: session.workerId,
      service: "ApiService",
    });

    // Extract only the data part from worker response to avoid double-wrapping
    // Worker returns: { success: true, timestamp: "...", data: { messageId, status, to } }
    // We only want the data part: { messageId, status, to }
    return response.data || response;
  } catch (error) {
    logger.error("Failed to send message via external API", {
      sessionId,
      to: messageData.to,
      type: messageData.type,
      error: error.message,
      service: "ApiService",
    });
    throw error;
  }
};

/**
 * Manage message (delete, unsend, star, unstar, edit, reaction, read)
 * @param {string} sessionId - Session ID
 * @param {Object} actionData - Action data object containing action, messageId, and action-specific data
 * @returns {Object} Management result
 */
export const manageMessage = async (sessionId, actionData) => {
  try {
    logger.info("Managing message through external API", {
      sessionId,
      action: actionData.action,
      messageId: actionData.messageId,
      service: "ApiService",
    });

    // Get session and verify it's connected
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        worker: {
          select: {
            id: true,
            endpoint: true,
            status: true,
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundError("Session not found");
    }

    if (session.status !== "CONNECTED") {
      throw new ConflictError(
        `Session is not connected. Current status: ${session.status}`
      );
    }

    if (!session.workerId || !session.worker) {
      throw new ConnectivityError("No worker assigned to session");
    }

    if (session.worker.status !== "ONLINE") {
      throw new ConnectivityError("Worker is not online");
    }

    // Send message management request through worker
    const response = await ProxyService.manageMessage(
      session.worker.endpoint,
      sessionId,
      actionData
    );

    logger.info("Message managed successfully via external API", {
      sessionId,
      action: actionData.action,
      messageId: actionData.messageId,
      workerId: session.workerId,
      service: "ApiService",
    });

    // Extract only the data part from worker response to avoid double-wrapping
    return response.data || response;
  } catch (error) {
    logger.error("Failed to manage message via external API", {
      sessionId,
      action: actionData.action,
      messageId: actionData.messageId,
      error: error.message,
      service: "ApiService",
    });
    throw error;
  }
};

// Export default object with all functions
export default {
  sendMessage,
  manageMessage,
};
