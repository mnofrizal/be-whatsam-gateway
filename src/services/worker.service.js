// Worker Service - Business logic for worker management
import prisma from "../database/client.js";
import Redis from "ioredis";
import axios from "axios";
import logger from "../utils/logger.js";
import {
  NotFoundError,
  ConflictError,
  ConnectivityError,
} from "../middleware/error-handler.js";

// Initialize Redis connection
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

// Health monitoring configuration
const healthCheckInterval =
  parseInt(process.env.WORKER_HEALTH_CHECK_INTERVAL) || 30000; // 30 seconds
const healthCheckTimeout = 10000; // 10 seconds
let isHealthCheckRunning = false;
let healthCheckTimer = null;

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
export const registerWorker = async (
  workerId,
  endpoint,
  maxSessions = 50,
  description = null,
  version = "1.0.0",
  environment = "DEVELOPMENT"
) => {
  try {
    // Test worker connectivity before registration
    await testWorkerConnectivity(endpoint);

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
      include: {
        sessions: {
          where: {
            status: {
              in: ["CONNECTED", "QR_REQUIRED", "RECONNECTING", "INIT"],
            },
          },
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    if (existingWorkerWithId && existingWorkerWithId.endpoint !== endpoint) {
      throw new ConflictError(
        `Worker ID ${workerId} is already registered with endpoint ${existingWorkerWithId.endpoint}`
      );
    }

    // Detect recovery scenario
    const isRecoveryScenario =
      existingWorkerWithId && existingWorkerWithId.sessions.length > 0;
    const assignedSessionCount = existingWorkerWithId?.sessions.length || 0;

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
    await redis.hset(
      "workers",
      workerId,
      JSON.stringify({
        id: workerId,
        endpoint,
        status: "ONLINE",
        sessionCount: assignedSessionCount,
        maxSessions,
        lastHeartbeat: new Date().toISOString(),
      })
    );

    const registrationResult = {
      ...worker,
      recoveryRequired: isRecoveryScenario,
      assignedSessionCount,
    };

    if (isRecoveryScenario) {
      logger.info("Worker registration detected recovery scenario", {
        workerId,
        endpoint,
        assignedSessionCount,
        recoveryRequired: true,
      });
    } else {
      logger.info("Worker registered successfully", {
        workerId,
        endpoint,
        maxSessions,
        recoveryRequired: false,
      });
    }

    return registrationResult;
  } catch (error) {
    logger.error("Worker registration failed:", error);
    throw error;
  }
};

/**
 * Update worker heartbeat and metrics - Enhanced Push Heartbeat
 * @param {string} workerId - Worker identifier
 * @param {Object} heartbeatData - Enhanced heartbeat data
 * @param {string} heartbeatData.status - Worker status (ONLINE, OFFLINE, MAINTENANCE)
 * @param {Array} heartbeatData.sessions - Array of session objects with individual statuses (REQUIRED)
 * @param {Object} heartbeatData.capabilities - Worker capabilities object
 * @param {Object} heartbeatData.metrics - Detailed metrics object
 * @param {string} heartbeatData.lastActivity - ISO timestamp of last activity
 * @returns {Object} Enhanced response with processing results
 */
export const updateWorkerHeartbeat = async (workerId, heartbeatData = {}) => {
  try {
    logger.info("Received enhanced heartbeat", {
      workerId,
      hasSessionData: Array.isArray(heartbeatData.sessions),
      sessionCount: heartbeatData.sessions?.length || 0,
      hasCapabilities: !!heartbeatData.capabilities,
      hasMetrics: !!heartbeatData.metrics,
    });

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

    // Validate required enhanced heartbeat format
    if (!Array.isArray(heartbeatData.sessions)) {
      throw new Error(
        "Enhanced heartbeat requires 'sessions' array. Legacy heartbeat format is no longer supported."
      );
    }

    // Initialize response counters
    let sessionsProcessed = 0;
    let sessionsSynced = 0;
    let staleWorkersDetected = 0;

    // Prepare worker update data
    const updateData = {
      status: heartbeatData.status || "ONLINE",
      lastHeartbeat: new Date(),
      updatedAt: new Date(),
    };

    // Process enhanced session data
    const totalSessions = heartbeatData.sessions.length;

    // Process individual session statuses
    const syncResult = await syncSessionStatuses(
      workerId,
      heartbeatData.sessions
    );
    sessionsProcessed = syncResult.processed;
    sessionsSynced = syncResult.synced;

    // Calculate session breakdown from individual sessions
    const sessionBreakdown = calculateSessionBreakdown(heartbeatData.sessions);

    logger.info("Enhanced session data processed", {
      workerId,
      totalSessions,
      sessionsProcessed,
      sessionsSynced,
      breakdown: sessionBreakdown,
    });

    // Update session count in database
    updateData.sessionCount = totalSessions;

    // Handle capabilities update
    if (heartbeatData.capabilities) {
      if (heartbeatData.capabilities.maxSessions !== undefined) {
        updateData.maxSessions = heartbeatData.capabilities.maxSessions;
      }
      if (heartbeatData.capabilities.version !== undefined) {
        updateData.version = heartbeatData.capabilities.version;
      }
      if (heartbeatData.capabilities.environment !== undefined) {
        updateData.environment = heartbeatData.capabilities.environment;
      }
    }

    // Handle enhanced metrics
    if (heartbeatData.metrics) {
      if (heartbeatData.metrics.cpuUsage !== undefined) {
        updateData.cpuUsage = heartbeatData.metrics.cpuUsage;
      }
      if (heartbeatData.metrics.memoryUsage !== undefined) {
        updateData.memoryUsage = heartbeatData.metrics.memoryUsage;
      }
    }

    // Update database
    const worker = await prisma.worker.update({
      where: { id: workerId },
      data: updateData,
    });

    // Store enhanced metrics for analytics if provided
    if (
      heartbeatData.metrics &&
      Object.keys(heartbeatData.metrics).length > 0
    ) {
      await prisma.workerMetric.create({
        data: {
          workerId,
          cpuUsage: heartbeatData.metrics.cpuUsage || 0,
          memoryUsage: heartbeatData.metrics.memoryUsage || 0,
          sessionCount: totalSessions,
          messageCount: heartbeatData.metrics.messageCount || 0,
          uptime: heartbeatData.metrics.uptime || 0,
        },
      });
    }

    // Update Redis cache with enhanced data
    const redisWorkerData = {
      id: workerId,
      endpoint: worker.endpoint,
      status: worker.status,
      sessionCount: totalSessions,
      maxSessions: worker.maxSessions,
      lastHeartbeat: new Date().toISOString(),
      lastActivity: heartbeatData.lastActivity || new Date().toISOString(),
      sessions: sessionBreakdown,
    };

    // Add capabilities to Redis if available
    if (heartbeatData.capabilities) {
      redisWorkerData.capabilities = heartbeatData.capabilities;
    }

    await redis.hset("workers", workerId, JSON.stringify(redisWorkerData));

    // Detect stale workers
    staleWorkersDetected = await detectStaleWorkers();

    logger.debug("Enhanced worker heartbeat updated successfully", {
      workerId,
      totalSessions,
      sessionsProcessed,
      sessionsSynced,
      staleWorkersDetected,
      hasCapabilities: !!heartbeatData.capabilities,
    });

    return {
      ...worker,
      sessionBreakdown,
      processing: {
        sessionsProcessed,
        sessionsSynced,
        staleWorkersDetected,
      },
      capabilities: heartbeatData.capabilities || null,
      lastActivity: heartbeatData.lastActivity || new Date().toISOString(),
    };
  } catch (error) {
    if (!(error instanceof NotFoundError)) {
      logger.error(
        "Enhanced worker heartbeat update failed with an unexpected error:",
        {
          workerId,
          errorMessage: error.message,
          stack: error.stack,
        }
      );
    }
    throw error;
  }
};

/**
 * Get all workers with their current status
 * @param {Object} filters - Optional filters (status, etc.)
 * @returns {Array} List of workers
 */
export const getWorkers = async (filters = {}) => {
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
};

/**
 * Get available worker for new session assignment
 * Uses intelligent load balancing algorithm with session health scoring
 * @returns {Object|null} Available worker or null if none available
 */
export const getAvailableWorker = async () => {
  try {
    // Get online workers with available capacity
    const availableWorkers = await prisma.worker.findMany({
      where: {
        status: "ONLINE",
      },
    });

    // Filter workers that have available capacity
    const workersWithCapacity = availableWorkers.filter(
      (worker) => worker.sessionCount < worker.maxSessions
    );

    if (workersWithCapacity.length === 0) {
      logger.warn("No available workers found for session assignment", {
        totalWorkers: availableWorkers.length,
        onlineWorkers: availableWorkers.length,
        workersWithCapacity: 0,
      });
      return null;
    }

    // Get enhanced session data from Redis for intelligent scoring
    const workersWithScores = await Promise.all(
      workersWithCapacity.map(async (worker) => {
        try {
          const redisData = await redis.hget("workers", worker.id);
          const enhancedData = redisData ? JSON.parse(redisData) : null;

          const score = enhancedData?.sessions
            ? calculateWorkerScore(worker, enhancedData.sessions)
            : calculateBasicWorkerScore(worker);

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
            score: calculateBasicWorkerScore(worker),
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
};

/**
 * Calculate intelligent worker score using enhanced session breakdown
 * Lower score = better worker for assignment
 * @param {Object} worker - Worker database record
 * @param {Object} sessions - Enhanced session breakdown from Redis
 * @returns {number} Worker score (lower is better)
 */
export const calculateWorkerScore = (worker, sessions) => {
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
};

/**
 * Calculate basic worker score for workers without enhanced session data
 * Fallback scoring method when Redis enhanced data is unavailable
 * @param {Object} worker - Worker database record
 * @returns {number} Worker score (lower is better)
 */
export const calculateBasicWorkerScore = (worker) => {
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
};

/**
 * Remove worker from system
 * @param {string} workerId - Worker identifier
 * @returns {Object} Operation result
 */
export const removeWorker = async (workerId) => {
  try {
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
      logger.warn("Worker has active sessions, marking them as disconnected", {
        workerId,
        activeSessionsCount: worker.sessions.length,
      });

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
    await redis.hdel("workers", workerId);

    // Clean up session routing for this worker
    const sessionKeys = await redis.hkeys("session_routing");
    for (const sessionId of sessionKeys) {
      const routedWorkerId = await redis.hget("session_routing", sessionId);
      if (routedWorkerId === workerId) {
        await redis.hdel("session_routing", sessionId);
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
};

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
export const updateWorker = async (workerId, updates) => {
  try {
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
      const redisData = await redis.hget("workers", workerId);
      if (redisData) {
        const workerData = JSON.parse(redisData);
        if (updates.maxSessions !== undefined) {
          workerData.maxSessions = updates.maxSessions;
        }
        await redis.hset("workers", workerId, JSON.stringify(workerData));
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
};

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
export const addWorker = async (
  workerId,
  endpoint,
  maxSessions = 50,
  description = null,
  version = "1.0.0",
  environment = "PRODUCTION"
) => {
  try {
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
    await testWorkerConnectivity(endpoint);

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
    await redis.hset(
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
};

/**
 * Mark worker as offline and handle session migration
 * @param {string} workerId - Worker identifier
 * @returns {Object} Operation result
 */
export const markWorkerOffline = async (workerId) => {
  try {
    // Update worker status in database
    await prisma.worker.update({
      where: { id: workerId },
      data: {
        status: "OFFLINE",
        updatedAt: new Date(),
      },
    });

    // Update Redis cache
    const workerData = await redis.hget("workers", workerId);
    if (workerData) {
      const worker = JSON.parse(workerData);
      worker.status = "OFFLINE";
      worker.lastHeartbeat = new Date().toISOString();
      await redis.hset("workers", workerId, JSON.stringify(worker));
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
        await redis.hdel("session_routing", session.id);
      }
    }

    return {
      affectedSessions: affectedSessions.length,
    };
  } catch (error) {
    logger.error("Mark worker offline failed:", error);
    throw error;
  }
};

/**
 * Start background health monitoring
 */
export const startHealthMonitoring = () => {
  if (isHealthCheckRunning) {
    logger.warn("Health monitoring is already running");
    return;
  }

  isHealthCheckRunning = true;
  logger.info("Starting worker health monitoring", {
    interval: healthCheckInterval,
  });

  healthCheckTimer = setInterval(async () => {
    try {
      await performHealthChecks();
    } catch (error) {
      logger.error("Health check cycle failed:", error);
    }
  }, healthCheckInterval);
};

/**
 * Stop background health monitoring
 */
export const stopHealthMonitoring = () => {
  if (healthCheckTimer) {
    clearInterval(healthCheckTimer);
    healthCheckTimer = null;
    isHealthCheckRunning = false;
    logger.info("Worker health monitoring stopped");
  }
};

/**
 * Perform health checks on all online workers
 * @returns {Array} Array of health check results
 */
export const performHealthChecks = async () => {
  try {
    const onlineWorkers = await prisma.worker.findMany({
      where: { status: "ONLINE" },
    });

    logger.debug("Performing health checks", {
      workerCount: onlineWorkers.length,
    });

    const healthCheckPromises = onlineWorkers.map((worker) =>
      checkWorkerHealth(worker).catch((error) => ({
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
};

/**
 * Check individual worker health
 * @param {Object} worker - Worker object
 */
export const checkWorkerHealth = async (worker) => {
  try {
    const response = await axios.get(`${worker.endpoint}/health`, {
      timeout: healthCheckTimeout,
      headers: {
        "User-Agent": "WhatsApp-Gateway-Backend/1.0",
      },
    });

    if (response.status === 200 && response.data) {
      // Worker is healthy - enhanced heartbeat will be sent separately by worker
      // Health check only verifies connectivity, not metrics update
      logger.debug(`Worker ${worker.id} health check passed`, {
        endpoint: worker.endpoint,
        responseStatus: response.status,
      });

      return { workerId: worker.id, status: "healthy" };
    } else {
      throw new Error(`Invalid health response: ${response.status}`);
    }
  } catch (error) {
    // Worker is unhealthy, mark as offline
    await markWorkerOffline(worker.id);
    throw new Error(`Health check failed: ${error.message}`);
  }
};

/**
 * Test worker connectivity
 * @param {string} endpoint - Worker endpoint
 */
export const testWorkerConnectivity = async (endpoint) => {
  try {
    const response = await axios.get(`${endpoint}/health`, {
      timeout: 5000,
      headers: {
        "User-Agent": "WhatsApp-Gateway-Backend/1.0",
      },
    });

    if (response.status !== 200) {
      throw new ConnectivityError(
        `Worker endpoint returned status ${response.status}: ${endpoint}. Please check worker service health.`
      );
    }

    return true;
  } catch (error) {
    // If it's already a ConnectivityError, re-throw it
    if (error.name === "ConnectivityError") {
      throw error;
    }

    // Create user-friendly error message based on error type
    let errorMessage = `Unable to connect to worker endpoint: ${endpoint}`;

    if (error.code === "ECONNREFUSED") {
      errorMessage = `Worker endpoint is not reachable: ${endpoint}. Please check if the worker service is running.`;
    } else if (error.code === "ETIMEDOUT") {
      errorMessage = `Connection timeout to worker endpoint: ${endpoint}. Please check network connectivity.`;
    } else if (error.code === "ENOTFOUND") {
      errorMessage = `Worker endpoint not found: ${endpoint}. Please verify the endpoint URL.`;
    } else if (error.response) {
      errorMessage = `Worker endpoint returned error ${error.response.status}: ${endpoint}. Please check worker service health.`;
    } else if (error.message) {
      errorMessage = `Worker connectivity failed: ${error.message}`;
    }

    throw new ConnectivityError(errorMessage);
  }
};

/**
 * Validate endpoint format
 * @param {string} endpoint - Endpoint to validate
 * @returns {boolean} Is valid endpoint
 * @deprecated This function is no longer used. Validation is handled by express-validator in the validation layer.
 */
// export const isValidEndpoint = (endpoint) => {
//   try {
//     const url = new URL(endpoint);
//     return url.protocol === "http:" || url.protocol === "https:";
//   } catch {
//     return false;
//   }
// };

/**
 * Get worker statistics and system overview
 * @returns {Object} System statistics
 */
export const getWorkerStatistics = async () => {
  try {
    const [
      totalWorkers,
      onlineWorkers,
      offlineWorkers,
      totalSessions,
      avgCpuUsage,
      avgMemoryUsage,
    ] = await Promise.all([
      prisma.worker.count(),
      prisma.worker.count({ where: { status: "ONLINE" } }),
      prisma.worker.count({ where: { status: "OFFLINE" } }),
      prisma.worker.aggregate({
        _sum: { sessionCount: true },
      }),
      prisma.worker.aggregate({
        _avg: { cpuUsage: true },
        where: { status: "ONLINE" },
      }),
      prisma.worker.aggregate({
        _avg: { memoryUsage: true },
        where: { status: "ONLINE" },
      }),
    ]);

    return {
      workers: {
        total: totalWorkers,
        online: onlineWorkers,
        offline: offlineWorkers,
        healthyPercentage:
          totalWorkers > 0 ? (onlineWorkers / totalWorkers) * 100 : 0,
      },
      sessions: {
        total: totalSessions._sum.sessionCount || 0,
        averagePerWorker:
          onlineWorkers > 0
            ? (totalSessions._sum.sessionCount || 0) / onlineWorkers
            : 0,
      },
      resources: {
        avgCpuUsage: avgCpuUsage._avg.cpuUsage || 0,
        avgMemoryUsage: avgMemoryUsage._avg.memoryUsage || 0,
      },
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error("Get worker statistics failed:", error);
    throw error;
  }
};

/**
 * Get worker by ID
 * @param {string} workerId - Worker identifier
 * @returns {Object|null} Worker data or null if not found
 */
export const getWorkerById = async (workerId) => {
  try {
    const worker = await prisma.worker.findUnique({
      where: { id: workerId },
    });

    if (!worker) {
      logger.warn("Worker not found", { workerId });
      return null;
    }

    return worker;
  } catch (error) {
    logger.error("Get worker by ID failed:", {
      workerId,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Increment worker session count
 * @param {string} workerId - Worker identifier
 * @returns {Object} Updated worker data
 */
export const incrementWorkerSessionCount = async (workerId) => {
  try {
    const worker = await prisma.worker.update({
      where: { id: workerId },
      data: {
        sessionCount: { increment: 1 },
        updatedAt: new Date(),
      },
    });

    // Update Redis cache
    const redisData = await redis.hget("workers", workerId);
    if (redisData) {
      const workerData = JSON.parse(redisData);
      workerData.sessionCount = worker.sessionCount;
      await redis.hset("workers", workerId, JSON.stringify(workerData));
    }

    logger.debug("Worker session count incremented", {
      workerId,
      newCount: worker.sessionCount,
    });

    return worker;
  } catch (error) {
    logger.error("Increment worker session count failed:", {
      workerId,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Decrement worker session count
 * @param {string} workerId - Worker identifier
 * @returns {Object} Updated worker data
 */
export const decrementWorkerSessionCount = async (workerId) => {
  try {
    const worker = await prisma.worker.update({
      where: { id: workerId },
      data: {
        sessionCount: { decrement: 1 },
        updatedAt: new Date(),
      },
    });

    // Ensure session count doesn't go below 0
    if (worker.sessionCount < 0) {
      await prisma.worker.update({
        where: { id: workerId },
        data: { sessionCount: 0 },
      });
      worker.sessionCount = 0;
    }

    // Update Redis cache
    const redisData = await redis.hget("workers", workerId);
    if (redisData) {
      const workerData = JSON.parse(redisData);
      workerData.sessionCount = worker.sessionCount;
      await redis.hset("workers", workerId, JSON.stringify(workerData));
    }

    logger.debug("Worker session count decremented", {
      workerId,
      newCount: worker.sessionCount,
    });

    return worker;
  } catch (error) {
    logger.error("Decrement worker session count failed:", {
      workerId,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Get assigned sessions for worker recovery
 * @param {string} workerId - Worker ID
 * @returns {Promise<Object>} Assigned sessions data
 */
export const getAssignedSessions = async (workerId) => {
  try {
    logger.info(`Getting assigned sessions for worker: ${workerId}`);

    // Get worker to verify it exists
    const worker = await prisma.worker.findUnique({
      where: { id: workerId },
    });

    if (!worker) {
      throw new NotFoundError(`Worker not found: ${workerId}`);
    }

    // Get all sessions assigned to this worker
    const sessions = await prisma.session.findMany({
      where: {
        workerId: workerId,
        status: {
          in: ["CONNECTED", "QR_REQUIRED", "RECONNECTING", "INIT"],
        },
      },
      select: {
        id: true,
        userId: true,
        name: true,
        phoneNumber: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        lastSeenAt: true,
        user: {
          select: {
            id: true,
            email: true,
            tier: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    const sessionCount = sessions.length;
    logger.info(
      `Found ${sessionCount} assigned sessions for worker ${workerId}`
    );

    return {
      workerId,
      sessionCount,
      sessions: sessions.map((session) => ({
        sessionId: session.id,
        userId: session.userId,
        sessionName: session.name,
        phoneNumber: session.phoneNumber,
        status: session.status,
        userEmail: session.user.email,
        userTier: session.user.tier,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        lastSeenAt: session.lastSeenAt,
      })),
      retrievedAt: new Date().toISOString(),
    };
  } catch (error) {
    logger.error(`Error getting assigned sessions for worker ${workerId}:`, {
      error: error.message,
      stack: error.stack,
    });

    if (error instanceof NotFoundError) {
      throw error;
    }

    throw new Error(`Failed to get assigned sessions: ${error.message}`);
  }
};

/**
 * Handle session recovery status from worker
 * @param {string} workerId - Worker ID
 * @param {Object} recoveryData - Recovery results data
 * @returns {Promise<Object>} Processing result
 */
export const handleRecoveryStatus = async (workerId, recoveryData) => {
  try {
    logger.info(`Processing recovery status for worker: ${workerId}`, {
      totalSessions: recoveryData.totalSessions,
      successfulRecoveries: recoveryData.successfulRecoveries,
      failedRecoveries: recoveryData.failedRecoveries,
    });

    // Verify worker exists
    const worker = await prisma.worker.findUnique({
      where: { id: workerId },
    });

    if (!worker) {
      throw new NotFoundError(`Worker not found: ${workerId}`);
    }

    const {
      recoveryResults,
      totalSessions,
      successfulRecoveries,
      failedRecoveries,
    } = recoveryData;
    const processedResults = [];
    const failedSessions = [];

    // Process each recovery result
    for (const result of recoveryResults) {
      const { sessionId, status, error, recoveredAt } = result;

      try {
        if (status === "SUCCESS") {
          // Update session status to CONNECTED if recovery was successful
          await prisma.session.update({
            where: { id: sessionId },
            data: {
              status: "CONNECTED",
              lastSeenAt: recoveredAt ? new Date(recoveredAt) : new Date(),
              updatedAt: new Date(),
            },
          });

          // Update Redis session routing
          await redis.hset("session_routing", sessionId, workerId);

          processedResults.push({
            sessionId,
            status: "PROCESSED",
            action: "UPDATED_TO_CONNECTED",
          });

          logger.info(`Session ${sessionId} recovery success processed`);
        } else if (status === "FAILED") {
          // Update session status to ERROR for failed recoveries
          await prisma.session.update({
            where: { id: sessionId },
            data: {
              status: "ERROR",
              updatedAt: new Date(),
            },
          });

          // Remove from Redis routing
          await redis.hdel("session_routing", sessionId);

          failedSessions.push({
            sessionId,
            error: error || "Recovery failed",
          });

          processedResults.push({
            sessionId,
            status: "PROCESSED",
            action: "UPDATED_TO_ERROR",
            error,
          });

          logger.warn(`Session ${sessionId} recovery failed:`, error);
        } else if (status === "SKIPPED") {
          // Log skipped sessions but don't update status
          processedResults.push({
            sessionId,
            status: "SKIPPED",
            action: "NO_ACTION",
          });

          logger.info(`Session ${sessionId} recovery skipped`);
        }
      } catch (sessionError) {
        logger.error(
          `Error processing recovery result for session ${sessionId}:`,
          {
            error: sessionError.message,
            stack: sessionError.stack,
          }
        );

        processedResults.push({
          sessionId,
          status: "ERROR",
          action: "PROCESSING_FAILED",
          error: sessionError.message,
        });
      }
    }

    // Update worker session count based on successful recoveries
    if (successfulRecoveries > 0) {
      await prisma.worker.update({
        where: { id: workerId },
        data: {
          sessionCount: successfulRecoveries,
          lastHeartbeat: new Date(),
        },
      });

      // Update Redis worker data
      const workerData = await redis.hget("workers", workerId);
      if (workerData) {
        const parsed = JSON.parse(workerData);
        parsed.sessionCount = successfulRecoveries;
        parsed.lastHeartbeat = new Date().toISOString();
        await redis.hset("workers", workerId, JSON.stringify(parsed));
      }
    }

    const summary = {
      workerId,
      totalSessions,
      successfulRecoveries,
      failedRecoveries,
      processedResults,
      failedSessions,
      processedAt: new Date().toISOString(),
    };

    logger.info(
      `Recovery status processing completed for worker ${workerId}:`,
      {
        totalProcessed: processedResults.length,
        successful: successfulRecoveries,
        failed: failedRecoveries,
      }
    );

    return summary;
  } catch (error) {
    logger.error(`Error handling recovery status for worker ${workerId}:`, {
      error: error.message,
      stack: error.stack,
    });

    if (error instanceof NotFoundError) {
      throw error;
    }

    throw new Error(`Failed to handle recovery status: ${error.message}`);
  }
};

/**
 * Sync individual session statuses from worker heartbeat data - Phase 2 Feature
 * @param {string} workerId - Worker ID
 * @param {Array} sessions - Array of session objects from worker
 * @returns {Object} Sync results with processed and synced counts
 */
export const syncSessionStatuses = async (workerId, sessions) => {
  try {
    let processed = 0;
    let synced = 0;

    logger.debug(
      `Syncing ${sessions.length} session statuses for worker ${workerId}`
    );

    // Process each session status update
    for (const sessionData of sessions) {
      try {
        processed++;

        const { sessionId, status, phoneNumber, displayName, lastActivity } =
          sessionData;

        // Validate session belongs to this worker
        const existingSession = await prisma.session.findFirst({
          where: {
            id: sessionId,
            workerId: workerId,
          },
        });

        if (!existingSession) {
          logger.warn(
            `Session ${sessionId} not found or not assigned to worker ${workerId}`
          );
          continue;
        }

        // Prepare update data
        const updateData = {
          updatedAt: new Date(),
        };

        // Update status if different
        if (status && status !== existingSession.status) {
          updateData.status = status.toUpperCase();
          logger.debug(
            `Updating session ${sessionId} status: ${existingSession.status} → ${status}`
          );
        }

        // Update phone number if provided
        if (phoneNumber && phoneNumber !== existingSession.phoneNumber) {
          updateData.phoneNumber = phoneNumber;
        }

        // Update display name if provided
        if (displayName && displayName !== existingSession.displayName) {
          updateData.displayName = displayName;
        }

        // Update last activity if provided
        if (lastActivity) {
          updateData.lastSeenAt = new Date(lastActivity);
        }

        // Only update if there are changes
        if (Object.keys(updateData).length > 1) {
          // More than just updatedAt
          await prisma.session.update({
            where: { id: sessionId },
            data: updateData,
          });

          // Update Redis session routing if session is active
          if (
            updateData.status &&
            ["CONNECTED", "QR_REQUIRED", "RECONNECTING"].includes(
              updateData.status
            )
          ) {
            await redis.hset("session_routing", sessionId, workerId);
          } else if (
            updateData.status === "DISCONNECTED" ||
            updateData.status === "ERROR"
          ) {
            await redis.hdel("session_routing", sessionId);
          }

          synced++;
        }
      } catch (sessionError) {
        logger.error(`Error syncing session ${sessionData.sessionId}:`, {
          error: sessionError.message,
          sessionData,
        });
      }
    }

    logger.info(`Session status sync completed for worker ${workerId}`, {
      processed,
      synced,
      skipped: processed - synced,
    });

    return { processed, synced };
  } catch (error) {
    logger.error(
      `Error syncing session statuses for worker ${workerId}:`,
      error
    );
    throw error;
  }
};

/**
 * Calculate session breakdown from individual session data - Phase 2 Feature
 * @param {Array} sessions - Array of session objects
 * @returns {Object} Session breakdown object
 */
export const calculateSessionBreakdown = (sessions) => {
  const breakdown = {
    total: sessions.length,
    connected: 0,
    disconnected: 0,
    qr_required: 0,
    reconnecting: 0,
    error: 0,
    init: 0,
  };

  sessions.forEach((session) => {
    const status = session.status?.toLowerCase() || "disconnected";

    switch (status) {
      case "connected":
        breakdown.connected++;
        break;
      case "disconnected":
        breakdown.disconnected++;
        break;
      case "qr_required":
        breakdown.qr_required++;
        break;
      case "reconnecting":
        breakdown.reconnecting++;
        break;
      case "error":
        breakdown.error++;
        break;
      case "init":
        breakdown.init++;
        break;
      default:
        breakdown.disconnected++; // Default to disconnected for unknown statuses
    }
  });

  return breakdown;
};

/**
 * Detect stale workers based on heartbeat timestamps - Phase 2 Feature
 * Replaces active health checking with passive monitoring
 * @returns {number} Number of stale workers detected and marked offline
 */
export const detectStaleWorkers = async () => {
  try {
    const staleThreshold = 2 * 60 * 1000; // 2 minutes in milliseconds
    const cutoffTime = new Date(Date.now() - staleThreshold);

    // Find workers that haven't sent heartbeat in the threshold time
    const staleWorkers = await prisma.worker.findMany({
      where: {
        status: "ONLINE",
        lastHeartbeat: {
          lt: cutoffTime,
        },
      },
    });

    let staleCount = 0;

    for (const worker of staleWorkers) {
      try {
        logger.warn(`Detected stale worker: ${worker.id}`, {
          lastHeartbeat: worker.lastHeartbeat,
          staleFor: Date.now() - new Date(worker.lastHeartbeat).getTime(),
        });

        // Mark worker as offline
        await markWorkerOffline(worker.id);
        staleCount++;
      } catch (error) {
        logger.error(
          `Error marking stale worker ${worker.id} as offline:`,
          error
        );
      }
    }

    if (staleCount > 0) {
      logger.info(`Detected and marked ${staleCount} stale workers as offline`);
    }

    return staleCount;
  } catch (error) {
    logger.error("Error detecting stale workers:", error);
    return 0;
  }
};

// Export all functions as default object for compatibility
export default {
  registerWorker,
  updateWorkerHeartbeat,
  getWorkers,
  getAvailableWorker,
  getWorkerById,
  incrementWorkerSessionCount,
  decrementWorkerSessionCount,
  calculateWorkerScore,
  calculateBasicWorkerScore,
  removeWorker,
  updateWorker,
  addWorker,
  markWorkerOffline,
  startHealthMonitoring,
  stopHealthMonitoring,
  performHealthChecks,
  checkWorkerHealth,
  testWorkerConnectivity,
  getWorkerStatistics,
  getAssignedSessions,
  handleRecoveryStatus,
  syncSessionStatuses,
  calculateSessionBreakdown,
  detectStaleWorkers,
};
