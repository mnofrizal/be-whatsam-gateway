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

// API version prefix removed - no versioning
// const API_VERSION = process.env.API_VERSION || "v1";

// Health check for API
router.get("/health", (req, res) => {
  return res.status(HTTP_STATUS.OK).json(
    ApiResponse.createSuccessResponse({
      message: "WhatsApp Gateway API is healthy",
      status: "operational",
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
    })
  );
});

// Mount route modules without versioning
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/sessions", sessionRoutes);
router.use("/workers", workerRoutes);
router.use("/webhooks", webhookRoutes);
router.use("/admin", adminRoutes);
router.use("/", apiRoutes); // External API routes

// API documentation route (will be implemented later)
router.get("/docs", (req, res) => {
  return res.status(HTTP_STATUS.OK).json(
    ApiResponse.createSuccessResponse({
      message: "API documentation will be available here",
      endpoints: {
        auth: "/auth",
        users: "/users",
        sessions: "/sessions",
        workers: "/workers",
        webhooks: "/webhooks",
        admin: "/admin",
        api: "/",
      },
      documentation: {
        swagger: "/docs/swagger",
        postman: "/docs/postman",
        examples: "/docs/examples",
      },
    })
  );
});

export default router;
