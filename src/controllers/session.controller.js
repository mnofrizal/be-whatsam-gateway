// Session Controller - HTTP request handlers for session management
import { ApiResponse, ValidationHelper } from "../utils/helpers.js";
import { HTTP_STATUS, ERROR_CODES } from "../utils/constants.js";
import { asyncHandler } from "../middleware/error-handler.js";
import sessionService from "../services/session.service.js";
import ProxyService from "../services/proxy.service.js";
import WorkerService from "../services/worker.service.js";
import logger from "../utils/logger.js";

/**
 * Normalize sessionId by converting to lowercase and replacing spaces with hyphens
 * @param {string} sessionId - Original session ID
 * @returns {string} Normalized session ID
 */
const normalizeSessionId = (sessionId) => {
  if (!sessionId || typeof sessionId !== "string") {
    return sessionId;
  }

  return sessionId
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-") // Replace one or more spaces with single hyphen
    .replace(/_/g, "-") // Replace underscores with hyphens for consistent format
    .replace(/[^a-z0-9-]/g, "") // Remove any characters that aren't letters, numbers, or hyphens
    .replace(/-+/g, "-") // Replace multiple consecutive hyphens with single hyphen
    .replace(/^-+|-+$/g, ""); // Remove leading and trailing hyphens
};

/**
 * Create new session (Phase 1: Create session card)
 * POST /api/v1/sessions
 */
export const createSession = asyncHandler(async (req, res) => {
  const { name, sessionId } = req.body;
  const userId = req.user.userId;

  // Generate sessionId if not provided
  let finalSessionId = sessionId?.trim();
  if (!finalSessionId) {
    finalSessionId = `${userId}-${name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`;
  }

  // Normalize sessionId in controller layer
  const originalSessionId = finalSessionId;
  const normalizedSessionId = normalizeSessionId(finalSessionId);

  // Validation is handled by middleware
  const result = await sessionService.createSession(
    userId,
    normalizedSessionId,
    name.trim()
  );

  logger.info("Session created successfully", {
    userId,
    originalSessionId,
    normalizedSessionId: result.id,
    sessionName: result.name,
    status: result.status,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });

  return res.status(HTTP_STATUS.CREATED).json(
    ApiResponse.createSuccessResponse(
      {
        sessionId: result.id,
        name: result.name,
        status: result.status,
        workerId: result.workerId,
        apiKey: result.apiKey,
        qrCode: result.qrCode,
        createdAt: result.createdAt,
      },
      {
        message: "Session created successfully",
      }
    )
  );
});

/**
 * Connect session (Phase 2: Start WhatsApp connection)
 * POST /api/v1/sessions/:id/connect
 */
export const connectSession = asyncHandler(async (req, res) => {
  const { id: sessionId } = req.params;
  const userId = req.user.userId;

  // Validation is handled by middleware
  const result = await sessionService.connectSession(sessionId, userId);

  logger.info("Session connection initiated", {
    userId,
    sessionId,
    workerId: result.workerId,
    status: result.status,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });

  return res.status(HTTP_STATUS.OK).json(
    ApiResponse.createSuccessResponse(
      {
        sessionId: result.id,
        status: result.status,
        workerId: result.workerId,
        qrCode: result.qrCode,
        message: "Connection process started",
      },
      {
        message: "Session connection initiated successfully",
      }
    )
  );
});

/**
 * Get user sessions
 * GET /api/v1/sessions
 */
export const getSessions = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const { status, limit = 20, offset = 0, search } = req.query;

  // Validation is handled by middleware
  const limitNum = parseInt(limit);
  const offsetNum = parseInt(offset);
  const page = Math.floor(offsetNum / limitNum) + 1;

  // Build filters for getUserSessions method
  const filters = {
    status,
    page,
    limit: limitNum,
    search,
  };

  const result = await sessionService.getUserSessions(userId, filters);

  return res.status(HTTP_STATUS.OK).json(
    ApiResponse.createSuccessResponse({
      sessions: result.sessions.map((session) => ({
        id: session.id,
        name: session.name,
        phoneNumber: session.phoneNumber,
        status: session.status,
        workerId: session.workerId,
        qrCode: session.qrCode ? "available" : null,
        lastSeenAt: session.lastSeenAt,
        createdAt: session.createdAt,
        worker: session.worker
          ? {
              id: session.worker.id,
              endpoint: session.worker.endpoint,
              status: session.worker.status,
            }
          : null,
        apiKey: session.apiKey
          ? {
              key: session.apiKey.key,
              isActive: session.apiKey.isActive,
              lastUsed: session.apiKey.lastUsed,
            }
          : null,
      })),
      pagination: result.pagination,
    })
  );
});

/**
 * Get session details
 * GET /api/v1/sessions/:id
 */
export const getSessionById = asyncHandler(async (req, res) => {
  const { id: sessionId } = req.params;
  const userId = req.user.userId;

  // Validation is handled by middleware
  const session = await sessionService.getSessionById(sessionId, userId);

  if (!session) {
    return res
      .status(HTTP_STATUS.NOT_FOUND)
      .json(
        ApiResponse.createErrorResponse(
          "Session not found",
          ERROR_CODES.RESOURCE_NOT_FOUND
        )
      );
  }

  return res.status(HTTP_STATUS.OK).json(
    ApiResponse.createSuccessResponse({
      session: {
        id: session.id,
        name: session.name,
        phoneNumber: session.phoneNumber,
        status: session.status,
        workerId: session.workerId,
        qrCode: session.qrCode ? "available" : null,
        lastSeenAt: session.lastSeenAt,
        createdAt: session.createdAt,
        statistics: {
          messagesSent: session.messagesSent || 0,
          messagesReceived: session.messagesReceived || 0,
          uptime: session.uptime || "0m",
        },
        apiKey: session.apiKey
          ? {
              key: session.apiKey.key,
              isActive: session.apiKey.isActive,
              lastUsed: session.apiKey.lastUsed,
            }
          : null,
      },
    })
  );
});

/**
 * Get session QR code
 * GET /api/v1/sessions/:id/qr
 */
export const getQRCode = asyncHandler(async (req, res) => {
  const { id: sessionId } = req.params;
  const userId = req.user.userId;

  // Validation is handled by middleware
  const qrData = await sessionService.getSessionQRCode(sessionId, userId);

  if (!qrData) {
    return res
      .status(HTTP_STATUS.NOT_FOUND)
      .json(
        ApiResponse.createErrorResponse(
          "Session not found or QR code not available",
          ERROR_CODES.RESOURCE_NOT_FOUND
        )
      );
  }

  return res.status(HTTP_STATUS.OK).json(
    ApiResponse.createSuccessResponse({
      qrCode: qrData.qrCode,
      status: qrData.status,
      expiresAt: qrData.expiresAt,
    })
  );
});

/**
 * Get session status
 * GET /api/v1/sessions/:id/status
 */
export const getSessionStatus = asyncHandler(async (req, res) => {
  const { id: sessionId } = req.params;
  const userId = req.user.userId;

  // Validation is handled by middleware
  const statusData = await sessionService.getSessionStatus(sessionId, userId);

  if (!statusData) {
    return res
      .status(HTTP_STATUS.NOT_FOUND)
      .json(
        ApiResponse.createErrorResponse(
          "Session not found",
          ERROR_CODES.RESOURCE_NOT_FOUND
        )
      );
  }

  return res.status(HTTP_STATUS.OK).json(
    ApiResponse.createSuccessResponse({
      sessionId: statusData.sessionId,
      status: statusData.status,
      phoneNumber: statusData.phoneNumber,
      lastSeen: statusData.lastSeen,
      worker: statusData.worker,
    })
  );
});

/**
 * Delete session
 * DELETE /api/v1/sessions/:id
 */
export const deleteSession = asyncHandler(async (req, res) => {
  const { id: sessionId } = req.params;
  const userId = req.user.userId;

  // Validation is handled by middleware
  const result = await sessionService.deleteSession(sessionId, userId);

  logger.info("Session deleted successfully", {
    userId,
    sessionId,
    workerId: result.workerId,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });

  return res.status(HTTP_STATUS.OK).json(
    ApiResponse.createSuccessResponse(
      {
        sessionId,
        deletedAt: new Date().toISOString(),
      },
      {
        message: "Session deleted successfully",
      }
    )
  );
});

/**
 * Send message through session
 * POST /api/v1/sessions/:id/send
 */
export const sendMessage = asyncHandler(async (req, res) => {
  const { id: sessionId } = req.params;
  const userId = req.user.userId;
  const { to, type, message, media, caption, filename } = req.body;

  // Validation is handled by middleware
  const messageData = {
    to: to.trim(),
    type: type.toLowerCase(),
    message: message?.trim(),
    media,
    caption: caption?.trim(),
    filename: filename?.trim(),
  };

  // Get session and verify ownership
  const session = await sessionService.getSessionById(sessionId, userId);
  if (!session) {
    return res
      .status(HTTP_STATUS.NOT_FOUND)
      .json(
        ApiResponse.createErrorResponse(
          "Session not found or access denied",
          ERROR_CODES.RESOURCE_NOT_FOUND
        )
      );
  }

  // Check if session is connected
  if (session.status !== "CONNECTED") {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json(
        ApiResponse.createErrorResponse(
          `Cannot send message. Session status is ${session.status}. Please ensure session is connected.`,
          ERROR_CODES.INVALID_REQUEST
        )
      );
  }

  // Get worker details
  if (!session.workerId) {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json(
        ApiResponse.createErrorResponse(
          "Session is not assigned to any worker",
          ERROR_CODES.INVALID_REQUEST
        )
      );
  }

  const worker = await WorkerService.getWorkerById(session.workerId);
  if (!worker || worker.status !== "ONLINE") {
    return res
      .status(HTTP_STATUS.SERVICE_UNAVAILABLE)
      .json(
        ApiResponse.createErrorResponse(
          "Worker is not available. Please try again later.",
          ERROR_CODES.SERVICE_UNAVAILABLE
        )
      );
  }

  // Send message using dedicated ProxyService method
  const result = await ProxyService.sendMessage(
    worker.endpoint,
    sessionId,
    messageData
  );

  logger.info("Message sent successfully", {
    userId,
    sessionId,
    messageId: result.messageId,
    to: to.trim(),
    type: type.toLowerCase(),
    workerId: worker.id,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });

  return res.status(HTTP_STATUS.OK).json(
    ApiResponse.createSuccessResponse(
      {
        messageId: result.messageId || `msg_${Date.now()}`,
        status: result.status || "sent",
        timestamp: result.timestamp || new Date().toISOString(),
        to: result.to || to.trim(),
      },
      {
        message: "Message sent successfully",
      }
    )
  );
});

/**
 * Get message history (placeholder for Week 5)
 * GET /api/v1/sessions/:id/messages
 */
export const getMessages = asyncHandler(async (req, res) => {
  const { id: sessionId } = req.params;
  const userId = req.user.userId;
  const { limit = 50, offset = 0, direction, status, from, to } = req.query;

  // This will be fully implemented in Week 5
  return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(
    ApiResponse.createErrorResponse(
      ERROR_CODES.NOT_IMPLEMENTED,
      "Get message history endpoint - Implementation coming in Week 5",
      {
        endpoint: "GET /api/v1/sessions/:id/messages",
        sessionId,
        userId,
        queryParams: { limit, offset, direction, status, from, to },
        implementationWeek: 5,
      }
    )
  );
});

/**
 * Restart session (stop and start again)
 * POST /api/v1/sessions/:id/restart
 */
export const restartSession = asyncHandler(async (req, res) => {
  const { id: sessionId } = req.params;
  const userId = req.user.userId;

  logger.info("Restart session request", {
    sessionId,
    userId,
    controller: "SessionController",
  });

  const result = await sessionService.restartSession(sessionId, userId);

  logger.info("Session restarted successfully", {
    sessionId,
    userId,
    status: result.status,
    controller: "SessionController",
  });

  return res.status(HTTP_STATUS.OK).json(
    ApiResponse.createSuccessResponse(result, {
      message: "Session restarted successfully",
    })
  );
});

/**
 * Disconnect session (stop connection, keep data)
 * POST /api/v1/sessions/:id/disconnect
 */
export const disconnectSession = asyncHandler(async (req, res) => {
  const { id: sessionId } = req.params;
  const userId = req.user.userId;

  logger.info("Disconnect session request", {
    sessionId,
    userId,
    controller: "SessionController",
  });

  const result = await sessionService.disconnectSession(sessionId, userId);

  logger.info("Session disconnected successfully", {
    sessionId,
    userId,
    status: result.status,
    controller: "SessionController",
  });

  return res.status(HTTP_STATUS.OK).json(
    ApiResponse.createSuccessResponse(result, {
      message: "Session disconnected successfully",
    })
  );
});

/**
 * Logout session (clear all session data)
 * POST /api/v1/sessions/:id/logout
 */
export const logoutSession = asyncHandler(async (req, res) => {
  const { id: sessionId } = req.params;
  const userId = req.user.userId;

  logger.info("Logout session request", {
    sessionId,
    userId,
    controller: "SessionController",
  });

  const result = await sessionService.logoutSession(sessionId, userId);

  logger.info("Session logged out successfully", {
    sessionId,
    userId,
    status: result.status,
    controller: "SessionController",
  });

  return res.status(HTTP_STATUS.OK).json(
    ApiResponse.createSuccessResponse(result, {
      message: "Session logged out successfully",
    })
  );
});

// Export default object with all controller functions
export default {
  createSession,
  connectSession,
  getSessions,
  getSessionById,
  getQRCode,
  getSessionStatus,
  deleteSession,
  sendMessage,
  getMessages,
  restartSession,
  disconnectSession,
  logoutSession,
};
