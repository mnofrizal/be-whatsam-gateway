// Worker Controller - HTTP request handlers for worker management
import { ApiResponse, ValidationHelper } from "../utils/helpers.js";
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

export class WorkerController {
  /**
   * Register a new worker (called by worker itself)
   * POST /api/v1/admin/workers/register
   */
  static registerWorker = asyncHandler(async (req, res) => {
    const {
      workerId,
      endpoint,
      maxSessions,
      description,
      version,
      environment,
    } = req.body;

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
        },
        {
          message: "Worker registered successfully",
        }
      )
    );
  });

  /**
   * Update worker heartbeat (called by worker itself)
   * PUT /api/v1/admin/workers/:workerId/heartbeat
   *
   * Enhanced to support detailed session breakdown:
   * {
   *   "sessions": {
   *     "total": 25,
   *     "connected": 20,
   *     "disconnected": 2,
   *     "qr_required": 2,
   *     "reconnecting": 1,
   *     "error": 0,
   *     "maxSessions": 50
   *   },
   *   "cpuUsage": 45.5,
   *   "memoryUsage": 67.8,
   *   "uptime": 3600,
   *   "messageCount": 150
   * }
   */
  static updateHeartbeat = asyncHandler(async (req, res) => {
    const { workerId } = req.params;
    const metrics = req.body;

    // Validation is now handled by middleware
    const worker = await workerService.updateWorkerHeartbeat(workerId, metrics);

    // Prepare response data
    const responseData = {
      workerId: worker.id,
      status: worker.status,
      lastHeartbeat: worker.lastHeartbeat,
      sessionCount: worker.sessionCount,
      cpuUsage: worker.cpuUsage,
      memoryUsage: worker.memoryUsage,
    };

    // Include session breakdown in response if available
    if (worker.sessionBreakdown) {
      responseData.sessions = worker.sessionBreakdown;
    }

    return res.status(HTTP_STATUS.OK).json(
      ApiResponse.createSuccessResponse(responseData, {
        message: "Heartbeat updated successfully",
      })
    );
  });

  /**
   * Get all workers (admin only)
   * GET /api/v1/admin/workers
   */
  static getWorkers = asyncHandler(async (req, res) => {
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
   * GET /api/v1/admin/workers/:workerId
   */
  static getWorkerById = asyncHandler(async (req, res) => {
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
   * POST /api/v1/admin/workers
   */
  static addWorker = asyncHandler(async (req, res) => {
    const {
      workerId,
      endpoint,
      maxSessions,
      description,
      version,
      environment,
    } = req.body;

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
   * DELETE /api/v1/admin/workers/:workerId
   */
  static removeWorker = asyncHandler(async (req, res) => {
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
   * PUT /api/v1/workers/:workerId
   */
  static updateWorker = asyncHandler(async (req, res) => {
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
   * GET /api/v1/admin/workers/statistics
   */
  static getWorkerStatistics = asyncHandler(async (req, res) => {
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
   * POST /api/v1/admin/workers/test
   */
  static testWorkerConnectivity = asyncHandler(async (req, res) => {
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
   * POST /api/v1/admin/workers/:workerId/test
   */
  static testSpecificWorkerConnectivity = asyncHandler(async (req, res) => {
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
   * POST /api/v1/admin/workers/health-check
   */
  static triggerHealthCheck = asyncHandler(async (req, res) => {
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
   * GET /api/v1/admin/workers/available
   */
  static getAvailableWorker = asyncHandler(async (req, res) => {
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
   * POST /api/v1/admin/workers/health/start
   */
  static startHealthMonitoring = asyncHandler(async (req, res) => {
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
   * POST /api/v1/admin/workers/health/stop
   */
  static stopHealthMonitoring = asyncHandler(async (req, res) => {
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
   * GET /api/v1/admin/workers/health/status
   */
  static getHealthMonitoringStatus = asyncHandler(async (req, res) => {
    const isRunning = workerService.isHealthCheckRunning;

    return res.status(HTTP_STATUS.OK).json(
      ApiResponse.createSuccessResponse({
        isRunning,
        interval: workerService.healthCheckInterval,
        status: isRunning ? "active" : "inactive",
      })
    );
  });
}

export default WorkerController;
