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

// API version prefix
const API_VERSION = process.env.API_VERSION || "v1";

// Health check for API
router.get("/health", (req, res) => {
  return res.status(HTTP_STATUS.OK).json(
    ApiResponse.createSuccessResponse({
      message: "WhatsApp Gateway API is healthy",
      version: API_VERSION,
      status: "operational",
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
    })
  );
});

// Mount route modules
router.use(`/${API_VERSION}/auth`, authRoutes);
router.use(`/${API_VERSION}/users`, userRoutes);
router.use(`/${API_VERSION}/sessions`, sessionRoutes);
router.use(`/${API_VERSION}/workers`, workerRoutes);
router.use(`/${API_VERSION}/webhooks`, webhookRoutes);
router.use(`/${API_VERSION}/admin`, adminRoutes);
router.use(`/${API_VERSION}`, apiRoutes); // External API routes

// API documentation route (will be implemented later)
router.get(`/${API_VERSION}/docs`, (req, res) => {
  return res.status(HTTP_STATUS.OK).json(
    ApiResponse.createSuccessResponse({
      message: "API documentation will be available here",
      version: API_VERSION,
      endpoints: {
        auth: `/${API_VERSION}/auth`,
        users: `/${API_VERSION}/users`,
        sessions: `/${API_VERSION}/sessions`,
        workers: `/${API_VERSION}/workers`,
        webhooks: `/${API_VERSION}/webhooks`,
        admin: `/${API_VERSION}/admin`,
        api: `/${API_VERSION}`,
      },
      documentation: {
        swagger: `/${API_VERSION}/docs/swagger`,
        postman: `/${API_VERSION}/docs/postman`,
        examples: `/${API_VERSION}/docs/examples`,
      },
    })
  );
});

export default router;
