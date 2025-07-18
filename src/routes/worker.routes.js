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
// POST /api/workers/register - Worker registers itself with backend
router.post(
  "/register",
  authenticateWorker,
  validateWorkerRegistration,
  WorkerController.registerWorker
);

// Worker Heartbeat (Internal - Worker to Backend)
// PUT /api/workers/:workerId/heartbeat - Worker sends health metrics
router.put(
  "/:workerId/heartbeat",
  authenticateWorker,
  validateWorkerIdParam,
  validateWorkerHeartbeat,
  WorkerController.updateHeartbeat
);

// Session Recovery Endpoints (Internal - Worker to Backend)
// GET /api/workers/:workerId/sessions/assigned - Worker requests assigned sessions for recovery
router.get(
  "/:workerId/sessions/assigned",
  authenticateWorker,
  validateWorkerIdParam,
  WorkerController.getAssignedSessions
);

// POST /api/workers/:workerId/sessions/recovery-status - Worker reports recovery results
router.post(
  "/:workerId/sessions/recovery-status",
  authenticateWorker,
  validateWorkerIdParam,
  validateSessionRecoveryStatus,
  WorkerController.handleRecoveryStatus
);

// Worker Self-Unregistration (Internal - Worker to Backend)
// DELETE /api/workers/unregister - Worker unregisters itself from backend
router.delete(
  "/unregister",
  authenticateWorker,
  validateWorkerRegistration,
  WorkerController.unregisterWorker
);

// Admin Worker Management (Requires JWT Authentication)
// GET /api/workers - Get all workers (Admin only)
router.get(
  "/",
  authenticateJWT,
  validateWorkerFilters,
  WorkerController.getWorkers
);

// POST /api/workers - Add new worker manually (Admin only)
router.post(
  "/",
  authenticateJWT,
  sessionLimiter,
  validateAddWorker,
  WorkerController.addWorker
);

// GET /api/workers/statistics - Get worker statistics (Admin only)
router.get(
  "/statistics",
  authenticateJWT,
  WorkerController.getWorkerStatistics
);

// POST /api/workers/test - Test worker connectivity (Admin only)
router.post(
  "/test",
  authenticateJWT,
  validateTestWorkerConnectivity,
  WorkerController.testWorkerConnectivity
);

// POST /api/workers/health-check - Trigger manual health check (Admin only)
router.post(
  "/health-check",
  authenticateJWT,
  WorkerController.triggerHealthCheck
);

// GET /api/workers/available - Get available worker (Internal use)
router.get("/available", authenticateJWT, WorkerController.getAvailableWorker);

// GET /api/workers/:workerId - Get specific worker details (Admin only)
router.get(
  "/:workerId",
  authenticateJWT,
  validateWorkerIdParam,
  WorkerController.getWorkerById
);

// PUT /api/workers/:workerId - Update worker configuration (Admin only)
router.put(
  "/:workerId",
  authenticateJWT,
  sessionLimiter,
  validateWorkerIdParam,
  validateUpdateWorker,
  WorkerController.updateWorker
);

// DELETE /api/workers/:workerId - Remove worker (Admin only)
router.delete(
  "/:workerId",
  authenticateJWT,
  validateWorkerIdParam,
  WorkerController.removeWorker
);

// POST /api/workers/:workerId/test - Test specific worker connectivity (Admin only)
router.post(
  "/:workerId/test",
  authenticateJWT,
  validateWorkerIdParam,
  WorkerController.testSpecificWorkerConnectivity
);

// Health Monitoring Management (Admin only)
// POST /api/workers/health/start - Start health monitoring
router.post(
  "/health/start",
  authenticateJWT,
  WorkerController.startHealthMonitoring
);

// POST /api/workers/health/stop - Stop health monitoring
router.post(
  "/health/stop",
  authenticateJWT,
  WorkerController.stopHealthMonitoring
);

// GET /api/workers/health/status - Get health monitoring status
router.get(
  "/health/status",
  authenticateJWT,
  WorkerController.getHealthMonitoringStatus
);

export default router;
