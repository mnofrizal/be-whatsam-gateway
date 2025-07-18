// Worker Controller - HTTP request handlers for worker management
import { ApiResponse } from "../utils/helpers.js";
import { HTTP_STATUS, ERROR_CODES } from "../utils/constants.js";
import { asyncHandler } from "../middleware/error-handler.js";
import workerService from "../services/worker.service.js";
import logger from "../utils/logger.js";

/**
 * Normalize workerId by converting to lowercase and replacing spaces with hyphens
 * @param {string} workerId - Original worker ID
 * @returns {string} Normalized worker ID
 */
const normalizeWorkerId = (workerId) => {
  if (!workerId || typeof workerId !== "string") {
    return workerId;
  }

  return workerId
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-") // Replace one or more spaces with single hyphen
    .replace(/_/g, "-") // Replace underscores with hyphens for consistent format
    .replace(/[^a-z0-9-]/g, "") // Remove any characters that aren't letters, numbers, or hyphens
    .replace(/-+/g, "-") // Replace multiple consecutive hyphens with single hyphen
    .replace(/^-+|-+$/g, ""); // Remove leading and trailing hyphens
};

/**
 * Register a new worker (called by worker itself)
 * POST /api/admin/workers/register
 */
export const registerWorker = asyncHandler(async (req, res) => {
  const { workerId, endpoint, maxSessions, description, version, environment } =
    req.body;

  // Normalize workerId in controller layer
  const originalWorkerId = workerId?.trim();
  const normalizedWorkerId = normalizeWorkerId(originalWorkerId);

  // Validation is now handled by middleware
  const result = await workerService.registerWorker(
    normalizedWorkerId,
    endpoint.trim(),
    maxSessions || 50,
    description?.trim(),
    version?.trim() || "1.0.0",
    environment?.toUpperCase() || "DEVELOPMENT"
  );

  logger.info("Worker registration successful", {
    originalWorkerId,
    normalizedWorkerId: result.id,
    endpoint: result.endpoint,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });

  return res.status(HTTP_STATUS.CREATED).json(
    ApiResponse.createSuccessResponse(
      {
        workerId: result.id,
        endpoint: result.endpoint,
        status: result.status,
        maxSessions: result.maxSessions,
        version: result.version,
        environment: result.environment,
        registeredAt: result.createdAt,
        recoveryRequired: result.recoveryRequired,
        assignedSessionCount: result.assignedSessionCount,
      },
      {
        message: "Worker registered successfully",
      }
    )
  );
});

/**
 * Unregister worker (called by worker itself during shutdown)
 * DELETE /api/workers/unregister
 */
export const unregisterWorker = asyncHandler(async (req, res) => {
  const { workerId, endpoint } = req.body;

  // Normalize workerId in controller layer
  const normalizedWorkerId = normalizeWorkerId(workerId);

  // Validation is now handled by middleware
  const result = await workerService.removeWorker(normalizedWorkerId);

  logger.info("Worker self-unregistration successful", {
    workerId: normalizedWorkerId,
    endpoint,
    migratedSessions: result.migratedSessions,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });

  return res.status(HTTP_STATUS.OK).json(
    ApiResponse.createSuccessResponse(
      {
        workerId: normalizedWorkerId,
        migratedSessions: result.migratedSessions,
        unregisteredAt: new Date().toISOString(),
      },
      {
        message: result.message,
      }
    )
  );
});

/**
 * Update worker heartbeat with enhanced session data (called by worker itself)
 * PUT /api/admin/workers/:workerId/heartbeat
 *
 * Phase 2: Enhanced Push Heartbeat - supports rich session data:
 * {
 *   "status": "ONLINE",
 *   "sessions": [
 *     {
 *       "sessionId": "user123-personal",
 *       "status": "CONNECTED",
 *       "phoneNumber": "+6281234567890",
 *       "lastActivity": "2024-01-15T10:30:00Z"
 *     }
 *   ],
 *   "capabilities": {
 *     "maxSessions": 50,
 *     "supportedFeatures": ["text", "media", "groups"],
 *     "version": "1.2.0"
 *   },
 *   "metrics": {
 *     "cpuUsage": 45.5,
 *     "memoryUsage": 67.8,
 *     "uptime": 3600,
 *     "messageCount": 150,
 *     "totalSessions": 25,
 *     "activeSessions": 20
 *   },
 *   "lastActivity": "2024-01-15T10:30:00Z"
 * }
 */
export const updateHeartbeat = asyncHandler(async (req, res) => {
  const { workerId } = req.params;
  const { status, sessions, capabilities, metrics, lastActivity } = req.body;

  const normalizedWorkerId = normalizeWorkerId(workerId);

  // Validation is now handled by middleware
  const result = await workerService.updateWorkerHeartbeat(normalizedWorkerId, {
    status,
    sessions,
    capabilities,
    metrics,
    lastActivity,
  });

  logger.info("Enhanced heartbeat received", {
    workerId: normalizedWorkerId,
    sessionCount: sessions?.length || 0,
    workerStatus: status,
    cpuUsage: metrics?.cpuUsage,
    memoryUsage: metrics?.memoryUsage,
    ip: req.ip,
  });

  // Prepare enhanced response data
  const responseData = {
    workerId: result.workerId,
    status: result.status,
    lastHeartbeat: result.lastHeartbeat,
    sessionCount: result.sessionCount,
    sessionsProcessed: result.sessionsProcessed || 0,
    sessionsSynced: result.sessionsSynced || 0,
    staleWorkersDetected: result.staleWorkersDetected || 0,
    metrics: {
      cpuUsage: result.cpuUsage,
      memoryUsage: result.memoryUsage,
      uptime: metrics?.uptime,
      messageCount: metrics?.messageCount,
    },
    capabilities: result.capabilities,
  };

  return res.status(HTTP_STATUS.OK).json(
    ApiResponse.createSuccessResponse(responseData, {
      message: "Enhanced heartbeat processed successfully",
    })
  );
});

/**
 * Get all workers (admin only)
 * GET /api/admin/workers
 */
export const getWorkers = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;

  // Validation is now handled by middleware
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);

  // Build filters
  const filters = {};
  if (
    status &&
    ["ONLINE", "OFFLINE", "MAINTENANCE"].includes(status.toUpperCase())
  ) {
    filters.status = status.toUpperCase();
  }

  const workers = await workerService.getWorkers(filters);

  // Apply pagination
  const startIndex = (pageNum - 1) * limitNum;
  const endIndex = startIndex + limitNum;
  const paginatedWorkers = workers.slice(startIndex, endIndex);

  return res.status(HTTP_STATUS.OK).json(
    ApiResponse.createSuccessResponse({
      workers: paginatedWorkers.map((worker) => ({
        id: worker.id,
        endpoint: worker.endpoint,
        status: worker.status,
        sessionCount: worker.sessionCount,
        maxSessions: worker.maxSessions,
        cpuUsage: worker.cpuUsage,
        memoryUsage: worker.memoryUsage,
        lastHeartbeat: worker.lastHeartbeat,
        description: worker.description,
        version: worker.version,
        environment: worker.environment,
        activeSessionCount: worker.activeSessionCount,
        utilizationRate:
          worker.maxSessions > 0
            ? ((worker.sessionCount / worker.maxSessions) * 100).toFixed(2)
            : 0,
        createdAt: worker.createdAt,
        updatedAt: worker.updatedAt,
      })),
      pagination: {
        total: workers.length,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(workers.length / limitNum),
        hasMore: endIndex < workers.length,
      },
    })
  );
});

/**
 * Get specific worker details (admin only)
 * GET /api/admin/workers/:workerId
 */
export const getWorkerById = asyncHandler(async (req, res) => {
  const { workerId } = req.params;

  // Validation is now handled by middleware
  const workers = await workerService.getWorkers();
  const worker = workers.find((w) => w.id === workerId);

  if (!worker) {
    return res
      .status(HTTP_STATUS.NOT_FOUND)
      .json(
        ApiResponse.createErrorResponse(
          "Worker not found",
          ERROR_CODES.RESOURCE_NOT_FOUND
        )
      );
  }

  return res.status(HTTP_STATUS.OK).json(
    ApiResponse.createSuccessResponse({
      id: worker.id,
      endpoint: worker.endpoint,
      status: worker.status,
      sessionCount: worker.sessionCount,
      maxSessions: worker.maxSessions,
      cpuUsage: worker.cpuUsage,
      memoryUsage: worker.memoryUsage,
      lastHeartbeat: worker.lastHeartbeat,
      description: worker.description,
      version: worker.version,
      environment: worker.environment,
      activeSessionCount: worker.activeSessionCount,
      utilizationRate:
        worker.maxSessions > 0
          ? ((worker.sessionCount / worker.maxSessions) * 100).toFixed(2)
          : 0,
      sessions: worker.sessions || [],
      createdAt: worker.createdAt,
      updatedAt: worker.updatedAt,
    })
  );
});

/**
 * Add worker manually (admin only)
 * POST /api/admin/workers
 */
export const addWorker = asyncHandler(async (req, res) => {
  const { workerId, endpoint, maxSessions, description, version, environment } =
    req.body;

  // Validation is now handled by middleware
  // Use provided workerId or generate from endpoint
  let originalWorkerId = workerId?.trim();
  let finalWorkerId = originalWorkerId;

  if (!finalWorkerId) {
    try {
      const url = new URL(endpoint.trim());
      finalWorkerId = `worker-${url.hostname.replace(/\./g, "-")}-${url.port || (url.protocol === "https:" ? "443" : "80")}`;
      originalWorkerId = finalWorkerId; // For logging purposes
    } catch (error) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(
          ApiResponse.createValidationErrorResponse([
            { field: "endpoint", message: "Invalid endpoint URL format" },
          ])
        );
    }
  }

  // Normalize workerId in controller layer
  const normalizedWorkerId = normalizeWorkerId(finalWorkerId);

  const result = await workerService.addWorker(
    normalizedWorkerId,
    endpoint.trim(),
    maxSessions || 50,
    description?.trim(),
    version?.trim() || "1.0.0",
    environment?.toUpperCase() || "DEVELOPMENT"
  );

  logger.info("Worker added manually by admin", {
    originalWorkerId,
    normalizedWorkerId: result.id,
    endpoint: result.endpoint,
    adminUserId: req.user?.userId,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });

  return res.status(HTTP_STATUS.CREATED).json(
    ApiResponse.createSuccessResponse(
      {
        workerId: result.id,
        endpoint: result.endpoint,
        status: result.status,
        maxSessions: result.maxSessions,
        description: result.description,
        version: result.version,
        environment: result.environment,
        addedAt: result.createdAt,
      },
      {
        message: "Worker added successfully",
      }
    )
  );
});

/**
 * Remove worker (admin only)
 * DELETE /api/admin/workers/:workerId
 */
export const removeWorker = asyncHandler(async (req, res) => {
  const { workerId } = req.params;

  // Validation is now handled by middleware
  const result = await workerService.removeWorker(workerId);

  logger.info("Worker removed by admin", {
    workerId,
    migratedSessions: result.migratedSessions,
    adminUserId: req.user?.userId,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });

  return res.status(HTTP_STATUS.OK).json(
    ApiResponse.createSuccessResponse(
      {
        workerId,
        migratedSessions: result.migratedSessions,
        removedAt: new Date().toISOString(),
      },
      {
        message: result.message,
      }
    )
  );
});

/**
 * Update worker configuration (admin only)
 * PUT /api/workers/:workerId
 */
export const updateWorker = asyncHandler(async (req, res) => {
  const { workerId } = req.params;
  const updateData = req.body;

  // Validation is now handled by middleware
  const result = await workerService.updateWorker(workerId, updateData);

  logger.info("Worker updated by admin", {
    workerId,
    updateData,
    adminUserId: req.user?.userId,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });

  return res.status(HTTP_STATUS.OK).json(
    ApiResponse.createSuccessResponse(
      {
        workerId: result.id,
        endpoint: result.endpoint,
        status: result.status,
        maxSessions: result.maxSessions,
        description: result.description,
        version: result.version,
        environment: result.environment,
        updatedAt: result.updatedAt,
      },
      {
        message: "Worker updated successfully",
      }
    )
  );
});

/**
 * Get worker statistics (admin only)
 * GET /api/admin/workers/statistics
 */
export const getWorkerStatistics = asyncHandler(async (req, res) => {
  const stats = await workerService.getWorkerStatistics();

  return res.status(HTTP_STATUS.OK).json(
    ApiResponse.createSuccessResponse({
      overview: {
        totalWorkers: stats.total,
        totalCapacity: stats.totalCapacity,
        totalActiveSessions: stats.totalActiveSessions,
        utilizationRate: `${stats.utilizationRate}%`,
      },
      performance: {
        averageCpuUsage: `${stats.averageCpuUsage.toFixed(2)}%`,
        averageMemoryUsage: `${stats.averageMemoryUsage.toFixed(2)}%`,
      },
      status: stats.statusBreakdown,
      capacity: {
        used: stats.totalActiveSessions,
        available: stats.totalCapacity - stats.totalActiveSessions,
        total: stats.totalCapacity,
      },
    })
  );
});

/**
 * Test worker connectivity (admin only)
 * POST /api/admin/workers/test
 */
export const testWorkerConnectivity = asyncHandler(async (req, res) => {
  const { endpoint } = req.body;

  // Validation is now handled by middleware
  await workerService.testWorkerConnectivity(endpoint.trim());

  return res.status(HTTP_STATUS.OK).json(
    ApiResponse.createSuccessResponse(
      {
        endpoint: endpoint.trim(),
        status: "reachable",
        testedAt: new Date().toISOString(),
      },
      {
        message: "Worker connectivity test successful",
      }
    )
  );
});

/**
 * Test specific worker connectivity (admin only)
 * POST /api/admin/workers/:workerId/test
 */
export const testSpecificWorkerConnectivity = asyncHandler(async (req, res) => {
  const { workerId } = req.params;

  // Validation is now handled by middleware
  // Get worker details first
  const workers = await workerService.getWorkers();
  const worker = workers.find((w) => w.id === workerId);

  if (!worker) {
    return res
      .status(HTTP_STATUS.NOT_FOUND)
      .json(
        ApiResponse.createErrorResponse(
          "Worker not found",
          ERROR_CODES.RESOURCE_NOT_FOUND
        )
      );
  }

  await workerService.testWorkerConnectivity(worker.endpoint);

  return res.status(HTTP_STATUS.OK).json(
    ApiResponse.createSuccessResponse(
      {
        workerId: worker.id,
        endpoint: worker.endpoint,
        status: "reachable",
        testedAt: new Date().toISOString(),
      },
      {
        message: "Worker connectivity test successful",
      }
    )
  );
});

/**
 * Trigger manual health check for all workers (admin only)
 * POST /api/admin/workers/health-check
 */
export const triggerHealthCheck = asyncHandler(async (req, res) => {
  const results = await workerService.performHealthChecks();

  // Calculate summary statistics
  const healthyWorkers = results.filter((r) => r.status === "healthy").length;
  const failedWorkers = results.filter((r) => r.status === "failed").length;

  logger.info("Manual health check triggered by admin", {
    adminUserId: req.user?.userId,
    workersChecked: results.length,
    healthyWorkers,
    failedWorkers,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });

  return res.status(HTTP_STATUS.OK).json(
    ApiResponse.createSuccessResponse(
      {
        summary: {
          total: results.length,
          healthy: healthyWorkers,
          failed: failedWorkers,
          checkedAt: new Date().toISOString(),
        },
        results: results,
      },
      {
        message: `Health check completed: ${healthyWorkers} healthy, ${failedWorkers} failed`,
      }
    )
  );
});

/**
 * Get available worker for session assignment (internal use)
 * GET /api/admin/workers/available
 */
export const getAvailableWorker = asyncHandler(async (req, res) => {
  const worker = await workerService.getAvailableWorker();

  if (!worker) {
    return res
      .status(HTTP_STATUS.SERVICE_UNAVAILABLE)
      .json(
        ApiResponse.createErrorResponse(
          "No available workers found",
          ERROR_CODES.SERVICE_UNAVAILABLE
        )
      );
  }

  return res.status(HTTP_STATUS.OK).json(
    ApiResponse.createSuccessResponse(
      {
        workerId: worker.id,
        endpoint: worker.endpoint,
        sessionCount: worker.sessionCount,
        maxSessions: worker.maxSessions,
        cpuUsage: worker.cpuUsage,
        memoryUsage: worker.memoryUsage,
        version: worker.version,
        environment: worker.environment,
        utilizationRate: (
          (worker.sessionCount / worker.maxSessions) *
          100
        ).toFixed(2),
      },
      {
        message: "Available worker found",
      }
    )
  );
});

/**
 * Start health monitoring (admin only)
 * POST /api/admin/workers/health/start
 */
export const startHealthMonitoring = asyncHandler(async (req, res) => {
  workerService.startHealthMonitoring();

  logger.info("Health monitoring started by admin", {
    adminUserId: req.user?.userId,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });

  return res.status(HTTP_STATUS.OK).json(
    ApiResponse.createSuccessResponse(
      {
        status: "started",
        startedAt: new Date().toISOString(),
      },
      {
        message: "Health monitoring started successfully",
      }
    )
  );
});

/**
 * Stop health monitoring (admin only)
 * POST /api/admin/workers/health/stop
 */
export const stopHealthMonitoring = asyncHandler(async (req, res) => {
  workerService.stopHealthMonitoring();

  logger.info("Health monitoring stopped by admin", {
    adminUserId: req.user?.userId,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });

  return res.status(HTTP_STATUS.OK).json(
    ApiResponse.createSuccessResponse(
      {
        status: "stopped",
        stoppedAt: new Date().toISOString(),
      },
      {
        message: "Health monitoring stopped successfully",
      }
    )
  );
});

/**
 * Get health monitoring status (admin only)
 * GET /api/admin/workers/health/status
 */
export const getHealthMonitoringStatus = asyncHandler(async (req, res) => {
  const isRunning = workerService.isHealthCheckRunning;

  return res.status(HTTP_STATUS.OK).json(
    ApiResponse.createSuccessResponse({
      isRunning,
      interval: workerService.healthCheckInterval,
      status: isRunning ? "active" : "inactive",
    })
  );
});

/**
 * Get assigned sessions for worker recovery
 * GET /api/workers/:workerId/sessions/assigned
 */
export const getAssignedSessions = asyncHandler(async (req, res) => {
  const { workerId } = req.params;

  const normalizedWorkerId = normalizeWorkerId(workerId);
  const assignedSessions =
    await workerService.getAssignedSessions(normalizedWorkerId);

  return res.status(HTTP_STATUS.OK).json(
    ApiResponse.createSuccessResponse(assignedSessions, {
      message: "Assigned sessions retrieved successfully",
    })
  );
});

/**
 * Handle session recovery status from worker
 * POST /api/workers/:workerId/sessions/recovery-status
 */
export const handleRecoveryStatus = asyncHandler(async (req, res) => {
  const { workerId } = req.params;
  const recoveryData = req.body;

  const normalizedWorkerId = normalizeWorkerId(workerId);
  const result = await workerService.handleRecoveryStatus(
    normalizedWorkerId,
    recoveryData
  );

  return res.status(HTTP_STATUS.OK).json(
    ApiResponse.createSuccessResponse(result, {
      message: "Recovery status processed successfully",
    })
  );
});

// Default export for backward compatibility with routes
export default {
  registerWorker,
  unregisterWorker,
  updateHeartbeat,
  getWorkers,
  getWorkerById,
  addWorker,
  removeWorker,
  updateWorker,
  getWorkerStatistics,
  testWorkerConnectivity,
  testSpecificWorkerConnectivity,
  triggerHealthCheck,
  getAvailableWorker,
  startHealthMonitoring,
  stopHealthMonitoring,
  getHealthMonitoringStatus,
  getAssignedSessions,
  handleRecoveryStatus,
};
