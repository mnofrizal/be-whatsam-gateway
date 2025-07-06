// Worker Service - Business logic for worker management
import { PrismaClient } from "@prisma/client";
import Redis from "ioredis";
import axios from "axios";
import logger from "../utils/logger.js";
import {
  ValidationError,
  NotFoundError,
  ConflictError,
} from "../middleware/error-handler.js";

const prisma = new PrismaClient();

export class WorkerService {
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
    this.healthCheckInterval =
      parseInt(process.env.WORKER_HEALTH_CHECK_INTERVAL) || 30000; // 30 seconds
    this.healthCheckTimeout = 10000; // 10 seconds
    this.isHealthCheckRunning = false;
    this.healthCheckTimer = null;
  }

  /**
   * Register a new worker or update existing worker
   * @param {string} workerId - Unique worker identifier
   * @param {string} endpoint - Worker HTTP endpoint (e.g., http://192.168.1.100:8001)
   * @param {number} maxSessions - Maximum sessions this worker can handle
   * @param {string} description - Optional worker description
   * @param {string} version - Baileys version (default: "1.0.0")
   * @param {string} environment - Worker environment (DEVELOPMENT, STAGING, TESTING, PRODUCTION)
   * @returns {Object} Worker data
   */
  async registerWorker(
    workerId,
    endpoint,
    maxSessions = 50,
    description = null,
    version = "1.0.0",
    environment = "DEVELOPMENT"
  ) {
    try {
      // Validate input
      if (!workerId || !endpoint) {
        throw new ValidationError("Worker ID and endpoint are required");
      }

      // Validate endpoint format
      if (!this.isValidEndpoint(endpoint)) {
        throw new ValidationError(
          "Invalid endpoint format. Expected: http://host:port"
        );
      }

      // Test worker connectivity before registration
      await this.testWorkerConnectivity(endpoint);

      // Check for existing worker with same endpoint but different ID
      const existingWorkerWithEndpoint = await prisma.worker.findUnique({
        where: { endpoint },
      });

      if (
        existingWorkerWithEndpoint &&
        existingWorkerWithEndpoint.id !== workerId
      ) {
        throw new ConflictError(
          `Endpoint ${endpoint} is already registered by worker ${existingWorkerWithEndpoint.id}`
        );
      }

      // Check for existing worker with same ID but different endpoint
      const existingWorkerWithId = await prisma.worker.findUnique({
        where: { id: workerId },
      });

      if (existingWorkerWithId && existingWorkerWithId.endpoint !== endpoint) {
        throw new ConflictError(
          `Worker ID ${workerId} is already registered with endpoint ${existingWorkerWithId.endpoint}`
        );
      }

      // Register or update worker in database
      const worker = await prisma.worker.upsert({
        where: { id: workerId },
        update: {
          endpoint,
          maxSessions,
          description,
          version,
          environment,
          status: "ONLINE",
          lastHeartbeat: new Date(),
          updatedAt: new Date(),
        },
        create: {
          id: workerId,
          endpoint,
          maxSessions,
          description,
          version,
          environment,
          status: "ONLINE",
          sessionCount: 0,
          cpuUsage: 0,
          memoryUsage: 0,
          lastHeartbeat: new Date(),
        },
      });

      // Store worker info in Redis for fast lookups
      await this.redis.hset(
        "workers",
        workerId,
        JSON.stringify({
          id: workerId,
          endpoint,
          status: "ONLINE",
          sessionCount: 0,
          maxSessions,
          lastHeartbeat: new Date().toISOString(),
        })
      );

      logger.info("Worker registered successfully", {
        workerId,
        endpoint,
        maxSessions,
      });

      return worker;
    } catch (error) {
      logger.error("Worker registration failed:", error);
      throw error;
    }
  }

  /**
   * Update worker heartbeat and metrics
   * @param {string} workerId - Worker identifier
   * @param {Object} metrics - Worker metrics with enhanced session breakdown
   * @param {Object} metrics.sessions - Session breakdown object
   * @param {number} metrics.sessions.total - Total sessions
   * @param {number} metrics.sessions.connected - Connected sessions
   * @param {number} metrics.sessions.disconnected - Disconnected sessions
   * @param {number} metrics.sessions.qr_required - Sessions waiting for QR scan
   * @param {number} metrics.sessions.reconnecting - Reconnecting sessions
   * @param {number} metrics.sessions.error - Sessions in error state
   * @param {number} metrics.sessions.maxSessions - Maximum sessions capacity
   * @param {number} metrics.cpuUsage - CPU usage percentage
   * @param {number} metrics.memoryUsage - Memory usage percentage
   * @param {number} metrics.uptime - Worker uptime in seconds
   * @param {number} metrics.messageCount - Total messages processed
   * @returns {Object} Updated worker data
   */
  async updateWorkerHeartbeat(workerId, metrics = {}) {
    try {
      logger.info("Received heartbeat", { workerId, metrics });

      if (!workerId) {
        throw new ValidationError("Worker ID is required for heartbeat");
      }

      // Check if the worker exists before attempting to update
      const existingWorker = await prisma.worker.findUnique({
        where: { id: workerId },
      });

      if (!existingWorker) {
        logger.error(
          "Heartbeat failed: Worker not found in database. The worker may have been deleted or is using a wrong ID.",
          { workerId }
        );
        throw new NotFoundError(
          `Worker with ID '${workerId}' not found. Cannot update heartbeat.`
        );
      }

      const updateData = {
        status: "ONLINE",
        lastHeartbeat: new Date(),
        updatedAt: new Date(),
      };

      // Handle enhanced session structure or fallback to legacy sessionCount
      let totalSessions = 0;
      let sessionBreakdown = null;

      if (metrics.sessions && typeof metrics.sessions === "object") {
        // Enhanced session structure
        sessionBreakdown = {
          total: metrics.sessions.total || 0,
          connected: metrics.sessions.connected || 0,
          disconnected: metrics.sessions.disconnected || 0,
          qr_required: metrics.sessions.qr_required || 0,
          reconnecting: metrics.sessions.reconnecting || 0,
          error: metrics.sessions.error || 0,
          maxSessions: metrics.sessions.maxSessions || 50,
        };
        totalSessions = sessionBreakdown.total;

        // Validate session breakdown consistency
        const calculatedTotal =
          sessionBreakdown.connected +
          sessionBreakdown.disconnected +
          sessionBreakdown.qr_required +
          sessionBreakdown.reconnecting +
          sessionBreakdown.error;

        if (calculatedTotal !== sessionBreakdown.total) {
          logger.warn("Session breakdown inconsistency detected", {
            workerId,
            reported: sessionBreakdown.total,
            calculated: calculatedTotal,
            breakdown: sessionBreakdown,
          });
        }
      } else if (metrics.sessionCount !== undefined) {
        // Legacy sessionCount structure - maintain backward compatibility
        totalSessions = metrics.sessionCount;
        sessionBreakdown = {
          total: totalSessions,
          connected: totalSessions, // Assume all are connected for legacy
          disconnected: 0,
          qr_required: 0,
          reconnecting: 0,
          error: 0,
          maxSessions: 50,
        };
      }

      // Update session count in database
      updateData.sessionCount = totalSessions;

      // Update other metrics if provided
      if (metrics.cpuUsage !== undefined)
        updateData.cpuUsage = metrics.cpuUsage;
      if (metrics.memoryUsage !== undefined)
        updateData.memoryUsage = metrics.memoryUsage;

      // Update database
      const worker = await prisma.worker.update({
        where: { id: workerId },
        data: updateData,
      });

      // Store metrics for analytics if provided
      if (Object.keys(metrics).length > 0) {
        await prisma.workerMetric.create({
          data: {
            workerId,
            cpuUsage: metrics.cpuUsage || 0,
            memoryUsage: metrics.memoryUsage || 0,
            sessionCount: totalSessions,
            messageCount: metrics.messageCount || 0,
            uptime: metrics.uptime || 0,
          },
        });
      }

      // Update Redis cache with enhanced session data
      const redisWorkerData = {
        id: workerId,
        endpoint: worker.endpoint,
        status: "ONLINE",
        sessionCount: totalSessions,
        maxSessions: worker.maxSessions,
        lastHeartbeat: new Date().toISOString(),
      };

      // Add session breakdown to Redis if available
      if (sessionBreakdown) {
        redisWorkerData.sessions = sessionBreakdown;
      }

      await this.redis.hset(
        "workers",
        workerId,
        JSON.stringify(redisWorkerData)
      );

      logger.debug("Worker heartbeat updated successfully", {
        workerId,
        totalSessions,
        sessionBreakdown: sessionBreakdown ? "enhanced" : "legacy",
      });

      return {
        ...worker,
        sessionBreakdown,
      };
    } catch (error) {
      if (!(error instanceof NotFoundError)) {
        logger.error(
          "Worker heartbeat update failed with an unexpected error:",
          {
            workerId,
            errorMessage: error.message,
            stack: error.stack,
          }
        );
      }
      throw error;
    }
  }

  /**
   * Get all workers with their current status
   * @param {Object} filters - Optional filters (status, etc.)
   * @returns {Array} List of workers
   */
  async getWorkers(filters = {}) {
    try {
      const whereClause = {};

      if (filters.status) {
        whereClause.status = filters.status;
      }

      const workers = await prisma.worker.findMany({
        where: whereClause,
        orderBy: [
          { status: "asc" }, // Online workers first
          { sessionCount: "asc" }, // Less loaded workers first
          { createdAt: "desc" },
        ],
        include: {
          sessions: {
            where: {
              status: {
                not: "DISCONNECTED",
              },
            },
            select: {
              id: true,
              name: true,
              status: true,
              phoneNumber: true,
            },
          },
          _count: {
            select: {
              sessions: {
                where: {
                  status: { not: "DISCONNECTED" },
                },
              },
            },
          },
        },
      });

      return workers.map((worker) => ({
        ...worker,
        activeSessionCount: worker._count.sessions,
        sessions: worker.sessions,
      }));
    } catch (error) {
      logger.error("Get workers failed:", error);
      throw error;
    }
  }

  /**
   * Get available worker for new session assignment
   * Uses intelligent load balancing algorithm with session health scoring
   * @returns {Object|null} Available worker or null if none available
   */
  async getAvailableWorker() {
    try {
      // Get online workers with available capacity
      const availableWorkers = await prisma.worker.findMany({
        where: {
          status: "ONLINE",
          sessionCount: {
            lt: prisma.worker.fields.maxSessions,
          },
        },
      });

      if (availableWorkers.length === 0) {
        logger.warn("No available workers found for session assignment");
        return null;
      }

      // Get enhanced session data from Redis for intelligent scoring
      const workersWithScores = await Promise.all(
        availableWorkers.map(async (worker) => {
          try {
            const redisData = await this.redis.hget("workers", worker.id);
            const enhancedData = redisData ? JSON.parse(redisData) : null;

            const score = enhancedData?.sessions
              ? this.calculateWorkerScore(worker, enhancedData.sessions)
              : this.calculateBasicWorkerScore(worker);

            return {
              ...worker,
              score,
              enhancedData,
            };
          } catch (error) {
            logger.warn("Failed to get enhanced data for worker", {
              workerId: worker.id,
              error: error.message,
            });
            return {
              ...worker,
              score: this.calculateBasicWorkerScore(worker),
              enhancedData: null,
            };
          }
        })
      );

      // Sort by score (lower is better) and select the best worker
      workersWithScores.sort((a, b) => a.score - b.score);
      const selectedWorker = workersWithScores[0];

      logger.info("Selected worker for new session", {
        workerId: selectedWorker.id,
        sessionCount: selectedWorker.sessionCount,
        maxSessions: selectedWorker.maxSessions,
        score: selectedWorker.score,
        hasEnhancedData: !!selectedWorker.enhancedData,
      });

      return selectedWorker;
    } catch (error) {
      logger.error("Worker selection failed:", error);
      throw error;
    }
  }

  /**
   * Calculate intelligent worker score using enhanced session breakdown
   * Lower score = better worker for assignment
   * @param {Object} worker - Worker database record
   * @param {Object} sessions - Enhanced session breakdown from Redis
   * @returns {number} Worker score (lower is better)
   */
  calculateWorkerScore(worker, sessions) {
    // Base capacity score (0-100): Higher utilization = higher score
    const capacityScore = (sessions.total / sessions.maxSessions) * 100;

    // Session health score (0-50): More unhealthy sessions = higher score
    const totalSessions = sessions.total || 1; // Avoid division by zero
    const unhealthySessions =
      (sessions.error || 0) + (sessions.reconnecting || 0);
    const healthScore = (unhealthySessions / totalSessions) * 50;

    // Resource usage score (0-50): Higher CPU/Memory = higher score
    const resourceScore =
      ((worker.cpuUsage || 0) + (worker.memoryUsage || 0)) / 4;

    // Connection stability score (0-25): Recent heartbeat = lower score
    const heartbeatAge = Date.now() - new Date(worker.lastHeartbeat).getTime();
    const stabilityScore = Math.min(heartbeatAge / (1000 * 60), 25); // Max 25 points for 1+ minute old

    // QR sessions bonus: Workers with QR sessions get slight penalty (they're busy with auth)
    const qrPenalty = (sessions.qr_required || 0) * 2;

    const totalScore =
      capacityScore + healthScore + resourceScore + stabilityScore + qrPenalty;

    logger.debug("Worker score calculation", {
      workerId: worker.id,
      capacityScore: capacityScore.toFixed(2),
      healthScore: healthScore.toFixed(2),
      resourceScore: resourceScore.toFixed(2),
      stabilityScore: stabilityScore.toFixed(2),
      qrPenalty,
      totalScore: totalScore.toFixed(2),
      sessions,
    });

    return totalScore;
  }

  /**
   * Calculate basic worker score for workers without enhanced session data
   * Fallback scoring method for backward compatibility
   * @param {Object} worker - Worker database record
   * @returns {number} Worker score (lower is better)
   */
  calculateBasicWorkerScore(worker) {
    // Basic capacity score
    const capacityScore = (worker.sessionCount / worker.maxSessions) * 100;

    // Basic resource score
    const resourceScore =
      ((worker.cpuUsage || 0) + (worker.memoryUsage || 0)) / 4;

    // Basic stability score
    const heartbeatAge = Date.now() - new Date(worker.lastHeartbeat).getTime();
    const stabilityScore = Math.min(heartbeatAge / (1000 * 60), 25);

    const totalScore = capacityScore + resourceScore + stabilityScore;

    logger.debug("Basic worker score calculation", {
      workerId: worker.id,
      capacityScore: capacityScore.toFixed(2),
      resourceScore: resourceScore.toFixed(2),
      stabilityScore: stabilityScore.toFixed(2),
      totalScore: totalScore.toFixed(2),
    });

    return totalScore;
  }

  /**
   * Remove worker from system
   * @param {string} workerId - Worker identifier
   * @returns {Object} Operation result
   */
  async removeWorker(workerId) {
    try {
      if (!workerId) {
        throw new ValidationError("Worker ID is required");
      }

      const worker = await prisma.worker.findUnique({
        where: { id: workerId },
        include: {
          sessions: {
            where: {
              status: { not: "DISCONNECTED" },
            },
          },
        },
      });

      if (!worker) {
        throw new NotFoundError("Worker not found");
      }

      // Check if worker has active sessions
      if (worker.sessions.length > 0) {
        logger.warn(
          "Worker has active sessions, marking them as disconnected",
          {
            workerId,
            activeSessionsCount: worker.sessions.length,
          }
        );

        // TODO: Implement session migration logic
        // For now, we'll mark sessions as disconnected
        await prisma.session.updateMany({
          where: {
            workerId: workerId,
            status: { not: "DISCONNECTED" },
          },
          data: {
            status: "DISCONNECTED",
            workerId: null,
          },
        });
      }

      // Remove worker from database
      await prisma.worker.delete({
        where: { id: workerId },
      });

      // Remove from Redis
      await this.redis.hdel("workers", workerId);

      // Clean up session routing for this worker
      const sessionKeys = await this.redis.hkeys("session_routing");
      for (const sessionId of sessionKeys) {
        const routedWorkerId = await this.redis.hget(
          "session_routing",
          sessionId
        );
        if (routedWorkerId === workerId) {
          await this.redis.hdel("session_routing", sessionId);
        }
      }

      logger.info("Worker removed successfully", {
        workerId,
        migratedSessions: worker.sessions.length,
      });

      return {
        message: `Worker ${workerId} removed successfully`,
        migratedSessions: worker.sessions.length,
      };
    } catch (error) {
      logger.error("Worker removal failed:", error);
      throw error;
    }
  }

  /**
   * Update worker configuration
   * @param {string} workerId - Worker identifier
   * @param {Object} updates - Fields to update
   * @param {number} updates.maxSessions - Maximum sessions capacity
   * @param {string} updates.description - Worker description
   * @param {string} updates.version - Baileys version
   * @param {string} updates.environment - Worker environment
   * @returns {Object} Updated worker data
   */
  async updateWorker(workerId, updates) {
    try {
      if (!workerId) {
        throw new ValidationError("Worker ID is required");
      }

      // Check if worker exists
      const existingWorker = await prisma.worker.findUnique({
        where: { id: workerId },
      });

      if (!existingWorker) {
        throw new NotFoundError("Worker not found");
      }

      // Prepare update data (only include provided fields)
      const updateData = {
        updatedAt: new Date(),
      };

      if (updates.maxSessions !== undefined) {
        updateData.maxSessions = updates.maxSessions;
      }
      if (updates.description !== undefined) {
        updateData.description = updates.description;
      }
      if (updates.version !== undefined) {
        updateData.version = updates.version;
      }
      if (updates.environment !== undefined) {
        updateData.environment = updates.environment;
      }

      // Update worker in database
      const updatedWorker = await prisma.worker.update({
        where: { id: workerId },
        data: updateData,
      });

      // Update Redis cache if worker is online
      if (existingWorker.status === "ONLINE") {
        const redisData = await this.redis.hget("workers", workerId);
        if (redisData) {
          const workerData = JSON.parse(redisData);
          if (updates.maxSessions !== undefined) {
            workerData.maxSessions = updates.maxSessions;
          }
          await this.redis.hset(
            "workers",
            workerId,
            JSON.stringify(workerData)
          );
        }
      }

      logger.info("Worker configuration updated", {
        workerId,
        updates: Object.keys(updateData).filter((key) => key !== "updatedAt"),
      });

      return updatedWorker;
    } catch (error) {
      logger.error("Worker update failed:", error);
      throw error;
    }
  }

  /**
   * Add worker manually (Admin function)
   * @param {string} workerId - Unique worker identifier
   * @param {string} endpoint - Worker HTTP endpoint
   * @param {number} maxSessions - Maximum sessions this worker can handle
   * @param {string} description - Optional worker description
   * @param {string} version - Baileys version (default: "1.0.0")
   * @param {string} environment - Worker environment (default: "PRODUCTION")
   * @returns {Object} Worker data
   */
  async addWorker(
    workerId,
    endpoint,
    maxSessions = 50,
    description = null,
    version = "1.0.0",
    environment = "PRODUCTION"
  ) {
    try {
      // Validate input
      if (!workerId || !endpoint) {
        throw new ValidationError("Worker ID and endpoint are required");
      }

      // Validate endpoint format
      if (!this.isValidEndpoint(endpoint)) {
        throw new ValidationError(
          "Invalid endpoint format. Expected: http://host:port"
        );
      }

      // Check for existing worker with same endpoint
      const existingWorkerWithEndpoint = await prisma.worker.findUnique({
        where: { endpoint: endpoint.trim() },
      });

      if (existingWorkerWithEndpoint) {
        throw new ConflictError(
          `Worker with endpoint ${endpoint} already exists`
        );
      }

      // Check for existing worker with same ID
      const existingWorkerWithId = await prisma.worker.findUnique({
        where: { id: workerId.trim() },
      });

      if (existingWorkerWithId) {
        throw new ConflictError(`Worker with ID ${workerId} already exists`);
      }

      // Test worker connectivity before adding
      await this.testWorkerConnectivity(endpoint);

      // Create worker in database
      const worker = await prisma.worker.create({
        data: {
          id: workerId.trim(),
          endpoint: endpoint.trim(),
          maxSessions,
          description,
          version,
          environment,
          status: "ONLINE",
          sessionCount: 0,
          cpuUsage: 0,
          memoryUsage: 0,
          lastHeartbeat: new Date(),
        },
      });

      // Store worker info in Redis for fast lookups
      await this.redis.hset(
        "workers",
        workerId.trim(),
        JSON.stringify({
          id: workerId.trim(),
          endpoint: endpoint.trim(),
          status: "ONLINE",
          sessionCount: 0,
          maxSessions,
          lastHeartbeat: new Date().toISOString(),
        })
      );

      logger.info("Worker added successfully by admin", {
        workerId: workerId.trim(),
        endpoint,
        maxSessions,
      });

      return worker;
    } catch (error) {
      logger.error("Worker addition failed:", error);
      throw error;
    }
  }

  /**
   * Mark worker as offline and handle session migration
   * @param {string} workerId - Worker identifier
   * @returns {Object} Operation result
   */
  async markWorkerOffline(workerId) {
    try {
      if (!workerId) {
        throw new ValidationError("Worker ID is required");
      }

      // Update worker status in database
      await prisma.worker.update({
        where: { id: workerId },
        data: {
          status: "OFFLINE",
          updatedAt: new Date(),
        },
      });

      // Update Redis cache
      const workerData = await this.redis.hget("workers", workerId);
      if (workerData) {
        const worker = JSON.parse(workerData);
        worker.status = "OFFLINE";
        worker.lastHeartbeat = new Date().toISOString();
        await this.redis.hset("workers", workerId, JSON.stringify(worker));
      }

      // Get affected sessions for migration
      const affectedSessions = await prisma.session.findMany({
        where: {
          workerId,
          status: { in: ["CONNECTED", "QR_REQUIRED", "RECONNECTING"] },
        },
      });

      logger.warn("Worker marked offline", {
        workerId,
        affectedSessionsCount: affectedSessions.length,
      });

      // TODO: Implement session migration logic
      // For now, mark sessions as disconnected
      if (affectedSessions.length > 0) {
        await prisma.session.updateMany({
          where: {
            workerId,
            status: { in: ["CONNECTED", "QR_REQUIRED", "RECONNECTING"] },
          },
          data: {
            status: "DISCONNECTED",
            workerId: null,
          },
        });

        // Clean up session routing
        for (const session of affectedSessions) {
          await this.redis.hdel("session_routing", session.id);
        }
      }

      return {
        affectedSessions: affectedSessions.length,
      };
    } catch (error) {
      logger.error("Mark worker offline failed:", error);
      throw error;
    }
  }

  /**
   * Start background health monitoring
   */
  startHealthMonitoring() {
    if (this.isHealthCheckRunning) {
      logger.warn("Health monitoring is already running");
      return;
    }

    this.isHealthCheckRunning = true;
    logger.info("Starting worker health monitoring", {
      interval: this.healthCheckInterval,
    });

    this.healthCheckTimer = setInterval(async () => {
      try {
        await this.performHealthChecks();
      } catch (error) {
        logger.error("Health check cycle failed:", error);
      }
    }, this.healthCheckInterval);
  }

  /**
   * Stop background health monitoring
   */
  stopHealthMonitoring() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
      this.isHealthCheckRunning = false;
      logger.info("Worker health monitoring stopped");
    }
  }

  /**
   * Perform health checks on all online workers
   * @returns {Array} Array of health check results
   */
  async performHealthChecks() {
    try {
      const onlineWorkers = await prisma.worker.findMany({
        where: { status: "ONLINE" },
      });

      logger.debug("Performing health checks", {
        workerCount: onlineWorkers.length,
      });

      const healthCheckPromises = onlineWorkers.map((worker) =>
        this.checkWorkerHealth(worker).catch((error) => ({
          workerId: worker.id,
          endpoint: worker.endpoint,
          status: "failed",
          error: error.message,
          checkedAt: new Date().toISOString(),
        }))
      );

      const results = await Promise.allSettled(healthCheckPromises);

      let healthyCount = 0;
      let unhealthyCount = 0;
      const healthCheckResults = [];

      results.forEach((result, index) => {
        const worker = onlineWorkers[index];

        if (result.status === "fulfilled" && !result.value.error) {
          healthyCount++;
          healthCheckResults.push({
            workerId: worker.id,
            endpoint: worker.endpoint,
            status: "healthy",
            checkedAt: new Date().toISOString(),
          });
        } else {
          unhealthyCount++;
          const errorResult = result.value || { error: result.reason };
          healthCheckResults.push({
            workerId: worker.id,
            endpoint: worker.endpoint,
            status: "failed",
            error: errorResult.error,
            checkedAt: new Date().toISOString(),
          });

          logger.warn("Worker health check failed", {
            workerId: worker.id,
            error: errorResult.error,
          });
        }
      });

      logger.debug("Health check completed", {
        healthy: healthyCount,
        unhealthy: unhealthyCount,
        total: healthCheckResults.length,
      });

      return healthCheckResults;
    } catch (error) {
      logger.error("Health check cycle error:", error);
      throw error;
    }
  }

  /**
   * Check individual worker health
   * @param {Object} worker - Worker object
   */
  async checkWorkerHealth(worker) {
    try {
      const response = await axios.get(`${worker.endpoint}/health`, {
        timeout: this.healthCheckTimeout,
        headers: {
          "User-Agent": "WhatsApp-Gateway-Backend/1.0",
        },
      });

      if (response.status === 200 && response.data) {
        // Worker is healthy, update metrics
        const metrics = response.data.data || response.data;
        await this.updateWorkerHeartbeat(worker.id, {
          sessionCount: metrics.sessionCount || 0,
          cpuUsage: metrics.cpuUsage || 0,
          memoryUsage: metrics.memoryUsage || 0,
          uptime: metrics.uptime || 0,
        });

        return { workerId: worker.id, status: "healthy" };
      } else {
        throw new Error(`Invalid health response: ${response.status}`);
      }
    } catch (error) {
      // Worker is unhealthy, mark as offline
      await this.markWorkerOffline(worker.id);
      throw new Error(`Health check failed: ${error.message}`);
    }
  }

  /**
   * Test worker connectivity
   * @param {string} endpoint - Worker endpoint
   */
  async testWorkerConnectivity(endpoint) {
    try {
      const response = await axios.get(`${endpoint}/health`, {
        timeout: 5000,
        headers: {
          "User-Agent": "WhatsApp-Gateway-Backend/1.0",
        },
      });

      if (response.status !== 200) {
        throw new Error(`Health check returned status ${response.status}`);
      }

      return true;
    } catch (error) {
      throw new ValidationError(
        `Worker connectivity test failed: ${error.message}`
      );
    }
  }

  /**
   * Validate endpoint format
   * @param {string} endpoint - Endpoint to validate
   * @returns {boolean} Is valid endpoint
   */
  isValidEndpoint(endpoint) {
    try {
      const url = new URL(endpoint);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }

  /**
   * Get worker statistics
   * @returns {Object} Worker statistics
   */
  async getWorkerStatistics() {
    try {
      const stats = await prisma.worker.aggregate({
        _count: { id: true },
        _avg: {
          sessionCount: true,
          cpuUsage: true,
          memoryUsage: true,
        },
        _sum: {
          sessionCount: true,
          maxSessions: true,
        },
      });

      const statusCounts = await prisma.worker.groupBy({
        by: ["status"],
        _count: { status: true },
      });

      return {
        total: stats._count.id,
        totalCapacity: stats._sum.maxSessions || 0,
        totalActiveSessions: stats._sum.sessionCount || 0,
        averageCpuUsage: stats._avg.cpuUsage || 0,
        averageMemoryUsage: stats._avg.memoryUsage || 0,
        statusBreakdown: statusCounts.reduce((acc, item) => {
          acc[item.status.toLowerCase()] = item._count.status;
          return acc;
        }, {}),
        utilizationRate:
          stats._sum.maxSessions > 0
            ? (
                ((stats._sum.sessionCount || 0) / stats._sum.maxSessions) *
                100
              ).toFixed(2)
            : 0,
      };
    } catch (error) {
      logger.error("Get worker statistics failed:", error);
      throw error;
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    this.stopHealthMonitoring();
    await this.redis.disconnect();
  }
}

export default new WorkerService();
