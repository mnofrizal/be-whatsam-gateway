// Worker Routes - Worker management endpoints
import express from "express";
import { sessionLimiter } from "../middleware/rate-limit.js";
import { authenticateJWT, authenticateWorker } from "../middleware/auth.js";
import WorkerController from "../controllers/worker.controller.js";
import {
  validateWorkerRegistration,
  validateWorkerHeartbeat,
  validateWorkerIdParam,
  validateAddWorker,
  validateUpdateWorker,
  validateTestWorkerConnectivity,
  validateWorkerFilters,
  validateSessionRecoveryStatus,
} from "../validation/worker.validation.js";

const router = express.Router();

// Worker Self-Registration (Internal - Worker to Backend)
// POST /api/v1/workers/register - Worker registers itself with backend
router.post(
  "/register",
  authenticateWorker,
  validateWorkerRegistration,
  WorkerController.registerWorker
);

// Worker Heartbeat (Internal - Worker to Backend)
// PUT /api/v1/workers/:workerId/heartbeat - Worker sends health metrics
router.put(
  "/:workerId/heartbeat",
  authenticateWorker,
  validateWorkerIdParam,
  validateWorkerHeartbeat,
  WorkerController.updateHeartbeat
);

// Session Recovery Endpoints (Internal - Worker to Backend)
// GET /api/v1/workers/:workerId/sessions/assigned - Worker requests assigned sessions for recovery
router.get(
  "/:workerId/sessions/assigned",
  authenticateWorker,
  validateWorkerIdParam,
  WorkerController.getAssignedSessions
);

// POST /api/v1/workers/:workerId/sessions/recovery-status - Worker reports recovery results
router.post(
  "/:workerId/sessions/recovery-status",
  authenticateWorker,
  validateWorkerIdParam,
  validateSessionRecoveryStatus,
  WorkerController.handleRecoveryStatus
);

// Admin Worker Management (Requires JWT Authentication)
// GET /api/v1/workers - Get all workers (Admin only)
router.get(
  "/",
  authenticateJWT,
  validateWorkerFilters,
  WorkerController.getWorkers
);

// POST /api/v1/workers - Add new worker manually (Admin only)
router.post(
  "/",
  authenticateJWT,
  sessionLimiter,
  validateAddWorker,
  WorkerController.addWorker
);

// GET /api/v1/workers/statistics - Get worker statistics (Admin only)
router.get(
  "/statistics",
  authenticateJWT,
  WorkerController.getWorkerStatistics
);

// POST /api/v1/workers/test - Test worker connectivity (Admin only)
router.post(
  "/test",
  authenticateJWT,
  validateTestWorkerConnectivity,
  WorkerController.testWorkerConnectivity
);

// POST /api/v1/workers/health-check - Trigger manual health check (Admin only)
router.post(
  "/health-check",
  authenticateJWT,
  WorkerController.triggerHealthCheck
);

// GET /api/v1/workers/available - Get available worker (Internal use)
router.get("/available", authenticateJWT, WorkerController.getAvailableWorker);

// GET /api/v1/workers/:workerId - Get specific worker details (Admin only)
router.get(
  "/:workerId",
  authenticateJWT,
  validateWorkerIdParam,
  WorkerController.getWorkerById
);

// PUT /api/v1/workers/:workerId - Update worker configuration (Admin only)
router.put(
  "/:workerId",
  authenticateJWT,
  sessionLimiter,
  validateWorkerIdParam,
  validateUpdateWorker,
  WorkerController.updateWorker
);

// DELETE /api/v1/workers/:workerId - Remove worker (Admin only)
router.delete(
  "/:workerId",
  authenticateJWT,
  validateWorkerIdParam,
  WorkerController.removeWorker
);

// POST /api/v1/workers/:workerId/test - Test specific worker connectivity (Admin only)
router.post(
  "/:workerId/test",
  authenticateJWT,
  validateWorkerIdParam,
  WorkerController.testSpecificWorkerConnectivity
);

// Health Monitoring Management (Admin only)
// POST /api/v1/workers/health/start - Start health monitoring
router.post(
  "/health/start",
  authenticateJWT,
  WorkerController.startHealthMonitoring
);

// POST /api/v1/workers/health/stop - Stop health monitoring
router.post(
  "/health/stop",
  authenticateJWT,
  WorkerController.stopHealthMonitoring
);

// GET /api/v1/workers/health/status - Get health monitoring status
router.get(
  "/health/status",
  authenticateJWT,
  WorkerController.getHealthMonitoringStatus
);

export default router;
