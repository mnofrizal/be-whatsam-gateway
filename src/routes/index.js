// Main Routes Index
import express from "express";
import { ApiResponse } from "../utils/helpers.js";
import { HTTP_STATUS } from "../utils/constants.js";
import authRoutes from "./auth.routes.js";
import userRoutes from "./user.routes.js";
import sessionRoutes from "./session.routes.js";
import workerRoutes from "./worker.routes.js";
import adminRoutes from "./admin.routes.js";
import apiRoutes from "./api.routes.js";
import webhookRoutes from "./webhook.routes.js";

const router = express.Router();

// Health check for API
router.get("/health", (req, res) => {
  return res.status(HTTP_STATUS.OK).json(
    ApiResponse.createSuccessResponse({
      message: "WhatsApp Gateway API is healthy",
      version: "1.0.0",
      status: "operational",
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
    })
  );
});

// Mount route modules
router.use(`/auth`, authRoutes);
router.use(`/users`, userRoutes);
router.use(`/sessions`, sessionRoutes);
router.use(`/workers`, workerRoutes);
router.use(`/webhooks`, webhookRoutes);
router.use(`/admin`, adminRoutes);
router.use(`/`, apiRoutes); // External API routes

export default router;
