// Session Service - Core session management business logic
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
 * Session Service - Handles all session-related business logic
 * Implements two-phase session creation architecture:
 * Phase 1: Create session card (database record)
 * Phase 2: Connect to worker and start WhatsApp connection
 */
export class SessionService {
  /**
   * Phase 1: Create session card in database
   * @param {string} userId - User ID
   * @param {string} sessionId - Session ID (normalized)
   * @param {string} name - Session name
   * @param {string} description - Session description
   * @returns {Object} Created session data
   */
  async createSession(userId, sessionId, name, description = null) {
    try {
      logger.info("Creating session card", {
        userId,
        sessionId,
        name,
        service: "SessionService",
      });

      // Check if user exists and get tier information
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          sessions: {
            where: {
              status: {
                not: "DISCONNECTED",
              },
            },
          },
        },
      });

      if (!user) {
        throw new NotFoundError("User not found");
      }

      if (!user.isActive) {
        throw new ConflictError("User account is inactive");
      }

      // Check tier limits
      const tierLimits = {
        BASIC: 1,
        PRO: 5,
        MAX: 20,
      };

      const currentActiveSessionCount = user.sessions.length;
      const maxSessions = tierLimits[user.tier] || tierLimits.BASIC;

      if (currentActiveSessionCount >= maxSessions) {
        throw new ConflictError(
          `Session limit exceeded. ${user.tier} tier allows ${maxSessions} sessions. Currently active: ${currentActiveSessionCount}`
        );
      }

      // Check if session ID already exists
      const existingSession = await prisma.session.findUnique({
        where: { id: sessionId },
      });

      if (existingSession) {
        throw new ConflictError("Session ID already exists");
      }

      // Create session record (Phase 1)
      const session = await prisma.session.create({
        data: {
          id: sessionId,
          userId,
          name,
          status: "DISCONNECTED",
        },
      });

      // Generate session API key
      const apiKey = await this.generateSessionApiKey(userId, sessionId, name);

      logger.info("Session card created successfully", {
        userId,
        sessionId,
        status: session.status,
        service: "SessionService",
      });

      return {
        ...session,
        apiKey,
      };
    } catch (error) {
      logger.error("Failed to create session card", {
        userId,
        sessionId,
        error: error.message,
        service: "SessionService",
      });
      throw error;
    }
  }

  /**
   * Phase 2: Connect session to worker and start WhatsApp connection
   * @param {string} sessionId - Session ID
   * @param {string} userId - User ID (for authorization)
   * @returns {Object} Connection result with QR code
   */
  async connectSession(sessionId, userId) {
    try {
      logger.info("Starting session connection", {
        sessionId,
        userId,
        service: "SessionService",
      });

      // Get session and verify ownership
      const session = await prisma.session.findFirst({
        where: {
          id: sessionId,
          userId: userId,
        },
      });

      if (!session) {
        throw new NotFoundError("Session not found or access denied");
      }

      if (session.status === "CONNECTED") {
        throw new ConflictError("Session is already connected");
      }

      if (session.status === "INIT") {
        throw new ConflictError("Session connection is already in progress");
      }

      // Get available worker
      const worker = await WorkerService.getAvailableWorker();
      if (!worker) {
        throw new ConnectivityError(
          "No available workers. Please try again later."
        );
      }

      // Update session status to INIT (starting connection process)
      await prisma.session.update({
        where: { id: sessionId },
        data: {
          status: "INIT",
          workerId: worker.id,
          updatedAt: new Date(),
        },
      });

      // Update session routing in Redis
      await redis.hset("session_routing", sessionId, worker.id);

      try {
        // Create session on worker (Phase 2)
        const workerResponse = await ProxyService.createSessionOnWorker(
          worker.endpoint,
          {
            sessionId,
            userId,
            sessionName: session.name,
          }
        );

        // Update worker session count
        await WorkerService.incrementWorkerSessionCount(worker.id);

        // Update session with initial worker response
        const updatedSession = await prisma.session.update({
          where: { id: sessionId },
          data: {
            status: workerResponse.status?.toUpperCase() || "QR_REQUIRED",
            qrCode: workerResponse.qrCode || null,
            updatedAt: new Date(),
          },
        });

        logger.info("Session connected to worker successfully", {
          sessionId,
          userId,
          workerId: worker.id,
          status: updatedSession.status,
          service: "SessionService",
        });

        return {
          sessionId: updatedSession.id,
          status: updatedSession.status,
          workerId: worker.id,
          workerEndpoint: worker.endpoint,
          qrCode: updatedSession.qrCode,
        };
      } catch (workerError) {
        // Rollback on worker failure
        await this.rollbackSessionConnection(sessionId, worker.id);
        throw new ConnectivityError(
          `Failed to connect to worker: ${workerError.message}`
        );
      }
    } catch (error) {
      logger.error("Failed to connect session", {
        sessionId,
        userId,
        error: error.message,
        service: "SessionService",
      });
      throw error;
    }
  }

  /**
   * Get user sessions with filtering and pagination
   * @param {string} userId - User ID
   * @param {Object} filters - Filter options
   * @returns {Object} Sessions list with pagination
   */
  async getUserSessions(userId, filters = {}) {
    try {
      const { status, page = 1, limit = 20, search } = filters;

      // Build where clause
      const where = {
        userId,
        ...(status && { status: status.toUpperCase() }),
        ...(search && {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { phoneNumber: { contains: search, mode: "insensitive" } },
          ],
        }),
      };

      // Get total count
      const total = await prisma.session.count({ where });

      // Get sessions with pagination
      const sessions = await prisma.session.findMany({
        where,
        include: {
          worker: {
            select: {
              id: true,
              endpoint: true,
              status: true,
            },
          },
          apiKey: {
            select: {
              key: true,
              isActive: true,
              lastUsed: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      });

      // Calculate pagination info
      const totalPages = Math.ceil(total / limit);

      logger.info("Retrieved user sessions", {
        userId,
        total,
        page,
        limit,
        filters,
        service: "SessionService",
      });

      return {
        sessions,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      logger.error("Failed to get user sessions", {
        userId,
        filters,
        error: error.message,
        service: "SessionService",
      });
      throw error;
    }
  }

  /**
   * Get session by ID with authorization check
   * @param {string} sessionId - Session ID
   * @param {string} userId - User ID (for authorization)
   * @returns {Object} Session details
   */
  async getSessionById(sessionId, userId) {
    try {
      const session = await prisma.session.findFirst({
        where: {
          id: sessionId,
          userId: userId,
        },
        include: {
          worker: {
            select: {
              id: true,
              endpoint: true,
              status: true,
              sessionCount: true,
              maxSessions: true,
              lastHeartbeat: true,
            },
          },
          apiKey: {
            select: {
              key: true,
              isActive: true,
              lastUsed: true,
            },
          },
        },
      });

      if (!session) {
        throw new NotFoundError("Session not found or access denied");
      }

      // Get real-time status from worker if connected
      if (session.workerId && session.worker?.status === "ONLINE") {
        try {
          const workerStatus = await ProxyService.getSessionStatus(
            session.worker.endpoint,
            sessionId
          );

          // Update database if status changed
          if (
            workerStatus.status &&
            workerStatus.status.toUpperCase() !== session.status
          ) {
            await this.updateSessionStatus(sessionId, {
              status: workerStatus.status.toUpperCase(),
              phoneNumber: workerStatus.phoneNumber,
              lastSeenAt: new Date(),
            });

            // Update session object
            session.status = workerStatus.status.toUpperCase();
            session.phoneNumber = workerStatus.phoneNumber;
            session.lastSeenAt = new Date();
          }
        } catch (workerError) {
          logger.warn("Failed to get real-time status from worker", {
            sessionId,
            workerId: session.workerId,
            error: workerError.message,
            service: "SessionService",
          });
        }
      }

      logger.info("Retrieved session details", {
        sessionId,
        userId,
        status: session.status,
        service: "SessionService",
      });

      return session;
    } catch (error) {
      logger.error("Failed to get session by ID", {
        sessionId,
        userId,
        error: error.message,
        service: "SessionService",
      });
      throw error;
    }
  }

  /**
   * Get session QR code
   * @param {string} sessionId - Session ID
   * @param {string} userId - User ID (for authorization)
   * @returns {Object} QR code data
   */
  async getSessionQRCode(sessionId, userId) {
    try {
      const session = await prisma.session.findFirst({
        where: {
          id: sessionId,
          userId: userId,
        },
      });

      if (!session) {
        throw new NotFoundError("Session not found or access denied");
      }

      // Check if QR code exists
      if (!session.qrCode) {
        return {
          sessionId: session.id,
          status: session.status,
          qrCode: null,
          message: "QR code not available",
        };
      }

      logger.info("Retrieved session QR code", {
        sessionId,
        userId,
        hasQR: !!session.qrCode,
        service: "SessionService",
      });

      return {
        sessionId: session.id,
        status: session.status,
        qrCode: session.qrCode,
      };
    } catch (error) {
      logger.error("Failed to get session QR code", {
        sessionId,
        userId,
        error: error.message,
        service: "SessionService",
      });
      throw error;
    }
  }

  /**
   * Get session status with real-time updates
   * @param {string} sessionId - Session ID
   * @param {string} userId - User ID (for authorization)
   * @returns {Object} Session status
   */
  async getSessionStatus(sessionId, userId) {
    try {
      const session = await prisma.session.findFirst({
        where: {
          id: sessionId,
          userId: userId,
        },
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
        throw new NotFoundError("Session not found or access denied");
      }

      let realTimeStatus = {
        sessionId: session.id,
        status: session.status.toLowerCase(),
        phoneNumber: session.phoneNumber,
        lastSeenAt: session.lastSeenAt,
        workerId: session.workerId,
        workerStatus: session.worker?.status?.toLowerCase() || null,
      };

      // Get real-time status from worker if available
      if (session.workerId && session.worker?.status === "ONLINE") {
        try {
          const workerStatus = await ProxyService.getSessionStatus(
            session.worker.endpoint,
            sessionId
          );

          realTimeStatus = {
            ...realTimeStatus,
            status: workerStatus.status?.toLowerCase() || realTimeStatus.status,
            phoneNumber: workerStatus.phoneNumber || realTimeStatus.phoneNumber,
            lastActivity: workerStatus.lastActivity,
            connectionQuality: workerStatus.connectionQuality,
          };

          // Update database with real-time data
          if (
            workerStatus.status &&
            workerStatus.status.toUpperCase() !== session.status
          ) {
            await this.updateSessionStatus(sessionId, {
              status: workerStatus.status.toUpperCase(),
              phoneNumber: workerStatus.phoneNumber,
              lastSeenAt: new Date(),
            });
          }
        } catch (workerError) {
          logger.warn("Failed to get real-time status from worker", {
            sessionId,
            workerId: session.workerId,
            error: workerError.message,
            service: "SessionService",
          });
        }
      }

      return realTimeStatus;
    } catch (error) {
      logger.error("Failed to get session status", {
        sessionId,
        userId,
        error: error.message,
        service: "SessionService",
      });
      throw error;
    }
  }

  /**
   * Delete session and cleanup resources
   * @param {string} sessionId - Session ID
   * @param {string} userId - User ID (for authorization)
   * @returns {Object} Deletion result
   */
  async deleteSession(sessionId, userId) {
    try {
      logger.info("Starting session deletion", {
        sessionId,
        userId,
        service: "SessionService",
      });

      const session = await prisma.session.findFirst({
        where: {
          id: sessionId,
          userId: userId,
        },
        include: {
          worker: true,
        },
      });

      if (!session) {
        throw new NotFoundError("Session not found or access denied");
      }

      // Delete from worker if assigned
      if (session.workerId && session.worker) {
        try {
          await ProxyService.deleteSessionOnWorker(
            session.worker.endpoint,
            sessionId
          );

          // Decrement worker session count
          await WorkerService.decrementWorkerSessionCount(session.workerId);
        } catch (workerError) {
          logger.warn("Failed to delete session from worker", {
            sessionId,
            workerId: session.workerId,
            error: workerError.message,
            service: "SessionService",
          });
          // Continue with database cleanup even if worker deletion fails
        }
      }

      // Clean up database (cascade will handle related records)
      await prisma.session.delete({
        where: { id: sessionId },
      });

      // Clean up Redis routing
      await redis.hdel("session_routing", sessionId);

      logger.info("Session deleted successfully", {
        sessionId,
        userId,
        workerId: session.workerId,
        service: "SessionService",
      });

      return {
        sessionId,
        deleted: true,
        message: "Session deleted successfully",
      };
    } catch (error) {
      logger.error("Failed to delete session", {
        sessionId,
        userId,
        error: error.message,
        service: "SessionService",
      });
      throw error;
    }
  }

  /**
   * Disconnect session (stop connection but keep data)
   * @param {string} sessionId - Session ID
   * @param {string} userId - User ID (for authorization)
   * @returns {Object} Disconnect result
   */
  async disconnectSession(sessionId, userId) {
    try {
      logger.info("Disconnecting session", {
        sessionId,
        userId,
        service: "SessionService",
      });

      // Get session with worker info
      const session = await prisma.session.findFirst({
        where: {
          id: sessionId,
          userId: userId,
        },
        include: {
          worker: true,
        },
      });

      if (!session) {
        throw new NotFoundError("Session not found or access denied");
      }

      if (session.status === "DISCONNECTED") {
        return {
          sessionId: session.id,
          status: "DISCONNECTED",
          message: "Session is already disconnected",
        };
      }

      // If session has a worker assigned, disconnect from worker
      if (session.workerId && session.worker) {
        try {
          await ProxyService.disconnectSessionOnWorker(
            session.worker.endpoint,
            sessionId
          );

          // Decrement worker session count
          await WorkerService.decrementWorkerSessionCount(session.workerId);

          logger.info("Session disconnected from worker successfully", {
            sessionId,
            workerId: session.workerId,
            service: "SessionService",
          });
        } catch (error) {
          logger.warn(
            "Failed to disconnect session from worker, continuing with database update",
            {
              sessionId,
              workerId: session.workerId,
              error: error.message,
              service: "SessionService",
            }
          );
        }
      }

      // Update session status to DISCONNECTED but keep data
      const updatedSession = await prisma.session.update({
        where: { id: sessionId },
        data: {
          status: "DISCONNECTED",
          qrCode: null,
          workerId: null,
          updatedAt: new Date(),
        },
      });

      // Remove session routing from Redis
      await redis.hdel("session_routing", sessionId);

      logger.info("Session disconnected successfully", {
        sessionId,
        userId,
        previousStatus: session.status,
        service: "SessionService",
      });

      return {
        sessionId: updatedSession.id,
        name: updatedSession.name,
        status: updatedSession.status,
        message:
          "Session disconnected successfully. You can reconnect anytime.",
      };
    } catch (error) {
      logger.error("Failed to disconnect session", {
        sessionId,
        userId,
        error: error.message,
        service: "SessionService",
      });
      throw error;
    }
  }

  /**
   * Logout session (clear all session data, requires QR scan again)
   * @param {string} sessionId - Session ID
   * @param {string} userId - User ID (for authorization)
   * @returns {Object} Logout result
   */
  async logoutSession(sessionId, userId) {
    try {
      logger.info("Logging out session", {
        sessionId,
        userId,
        service: "SessionService",
      });

      // Get session with worker info
      const session = await prisma.session.findFirst({
        where: {
          id: sessionId,
          userId: userId,
        },
        include: {
          worker: true,
        },
      });

      if (!session) {
        throw new NotFoundError("Session not found or access denied");
      }

      // If session has a worker assigned, logout from worker
      if (session.workerId && session.worker) {
        try {
          await ProxyService.logoutSessionOnWorker(
            session.worker.endpoint,
            sessionId
          );

          // Decrement worker session count
          await WorkerService.decrementWorkerSessionCount(session.workerId);

          logger.info("Session logged out from worker successfully", {
            sessionId,
            workerId: session.workerId,
            service: "SessionService",
          });
        } catch (error) {
          logger.warn(
            "Failed to logout session from worker, continuing with database cleanup",
            {
              sessionId,
              workerId: session.workerId,
              error: error.message,
              service: "SessionService",
            }
          );
        }
      }

      // Clear session data in database (reset to initial state)
      const updatedSession = await prisma.session.update({
        where: { id: sessionId },
        data: {
          status: "DISCONNECTED",
          phoneNumber: null,
          qrCode: null,
          workerId: null,
          lastSeenAt: null,
          updatedAt: new Date(),
        },
      });

      // Remove session routing from Redis
      await redis.hdel("session_routing", sessionId);

      logger.info("Session logged out successfully", {
        sessionId,
        userId,
        previousStatus: session.status,
        service: "SessionService",
      });

      return {
        sessionId: updatedSession.id,
        name: updatedSession.name,
        status: updatedSession.status,
        message:
          "Session logged out successfully. You will need to scan QR code again to reconnect.",
      };
    } catch (error) {
      logger.error("Failed to logout session", {
        sessionId,
        userId,
        error: error.message,
        service: "SessionService",
      });
      throw error;
    }
  }

  /**
   * Restart session (stop and start again, keep all data)
   * @param {string} sessionId - Session ID
   * @param {string} userId - User ID (for authorization)
   * @returns {Object} Restart result
   */
  async restartSession(sessionId, userId) {
    try {
      logger.info("Restarting session", {
        sessionId,
        userId,
        service: "SessionService",
      });

      // Get session with worker info
      const session = await prisma.session.findFirst({
        where: {
          id: sessionId,
          userId: userId,
        },
        include: {
          worker: true,
        },
      });

      if (!session) {
        throw new NotFoundError("Session not found or access denied");
      }

      // If session has a worker assigned, restart on worker
      if (session.workerId && session.worker) {
        try {
          const restartResponse = await ProxyService.restartSession(
            session.worker.endpoint,
            sessionId
          );

          // Update session with restart response
          const updatedSession = await prisma.session.update({
            where: { id: sessionId },
            data: {
              status: restartResponse.status?.toUpperCase() || "QR_REQUIRED",
              qrCode: restartResponse.qrCode || null,
              updatedAt: new Date(),
            },
          });

          logger.info("Session restarted successfully", {
            sessionId,
            workerId: session.workerId,
            newStatus: updatedSession.status,
            service: "SessionService",
          });

          return {
            sessionId: updatedSession.id,
            name: updatedSession.name,
            status: updatedSession.status,
            qrCode: updatedSession.qrCode,
            message: "Session restarted successfully",
          };
        } catch (error) {
          logger.error("Failed to restart session on worker", {
            sessionId,
            workerId: session.workerId,
            error: error.message,
            service: "SessionService",
          });
          throw new ConnectivityError(
            `Failed to restart session: ${error.message}`
          );
        }
      } else {
        // Session not connected to any worker, just reset status
        const updatedSession = await prisma.session.update({
          where: { id: sessionId },
          data: {
            status: "DISCONNECTED",
            qrCode: null,
            updatedAt: new Date(),
          },
        });

        return {
          sessionId: updatedSession.id,
          name: updatedSession.name,
          status: updatedSession.status,
          message: "Session reset. Please connect to restart.",
        };
      }
    } catch (error) {
      logger.error("Failed to restart session", {
        sessionId,
        userId,
        error: error.message,
        service: "SessionService",
      });
      throw error;
    }
  }

  /**
   * Route request to appropriate worker
   * @param {string} sessionId - Session ID
   * @param {string} endpoint - Worker endpoint path
   * @param {Object} data - Request data
   * @param {string} method - HTTP method
   * @returns {Object} Worker response
   */
  async routeRequest(sessionId, endpoint, data, method = "POST") {
    try {
      // Get worker for session from Redis first (faster)
      let workerId = await redis.hget("session_routing", sessionId);

      if (!workerId) {
        // Fallback to database
        const session = await prisma.session.findUnique({
          where: { id: sessionId },
          select: { workerId: true },
        });

        if (!session || !session.workerId) {
          throw new NotFoundError("Session routing not found");
        }

        workerId = session.workerId;
        // Update Redis cache
        await redis.hset("session_routing", sessionId, workerId);
      }

      // Get worker details
      const worker = await WorkerService.getWorkerById(workerId);
      if (!worker || worker.status !== "ONLINE") {
        throw new ConnectivityError("Worker not available");
      }

      // Forward request to worker
      const response = await ProxyService.forwardRequest(
        worker.endpoint,
        endpoint,
        data,
        method
      );

      logger.info("Request routed successfully", {
        sessionId,
        workerId,
        endpoint,
        method,
        service: "SessionService",
      });

      return response;
    } catch (error) {
      logger.error("Failed to route request", {
        sessionId,
        endpoint,
        method,
        error: error.message,
        service: "SessionService",
      });
      throw error;
    }
  }

  /**
   * Generate session API key
   * @param {string} userId - User ID
   * @param {string} sessionId - Session ID
   * @param {string} name - API key name
   * @returns {string} Generated API key
   */
  async generateSessionApiKey(userId, sessionId, name) {
    try {
      const crypto = await import("crypto");
      const apiKey = `sk_${crypto.randomBytes(32).toString("hex")}`;

      await prisma.apiKey.create({
        data: {
          key: apiKey,
          sessionId,
          name: `${name} - API Key`,
          isActive: true,
          createdAt: new Date(),
        },
      });

      logger.info("Session API key generated", {
        userId,
        sessionId,
        service: "SessionService",
      });

      return apiKey;
    } catch (error) {
      logger.error("Failed to generate session API key", {
        userId,
        sessionId,
        error: error.message,
        service: "SessionService",
      });
      throw error;
    }
  }

  /**
   * Update session status
   * @param {string} sessionId - Session ID
   * @param {Object} statusData - Status update data
   */
  async updateSessionStatus(sessionId, statusData) {
    try {
      await prisma.session.update({
        where: { id: sessionId },
        data: {
          ...statusData,
          updatedAt: new Date(),
        },
      });

      logger.info("Session status updated", {
        sessionId,
        status: statusData.status,
        service: "SessionService",
      });
    } catch (error) {
      logger.error("Failed to update session status", {
        sessionId,
        error: error.message,
        service: "SessionService",
      });
      throw error;
    }
  }

  /**
   * Rollback session connection on failure
   * @param {string} sessionId - Session ID
   * @param {string} workerId - Worker ID
   */
  async rollbackSessionConnection(sessionId, workerId) {
    try {
      // Reset session status
      await prisma.session.update({
        where: { id: sessionId },
        data: {
          status: "DISCONNECTED",
          workerId: null,
          qrCode: null,
          updatedAt: new Date(),
        },
      });

      // Remove from Redis routing
      await redis.hdel("session_routing", sessionId);

      logger.info("Session connection rolled back", {
        sessionId,
        workerId,
        service: "SessionService",
      });
    } catch (error) {
      logger.error("Failed to rollback session connection", {
        sessionId,
        workerId,
        error: error.message,
        service: "SessionService",
      });
    }
  }
}

// Export default instance
export default new SessionService();
