// Main Routes Index
import express from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import sessionRoutes from './session.routes.js';
import workerRoutes from './worker.routes.js';
import adminRoutes from './admin.routes.js';
import apiRoutes from './api.routes.js';

const router = express.Router();

// API version prefix
const API_VERSION = process.env.API_VERSION || 'v1';

// Health check for API
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'WhatsApp Gateway API is healthy',
    version: API_VERSION,
    timestamp: new Date().toISOString()
  });
});

// Mount route modules
router.use(`/${API_VERSION}/auth`, authRoutes);
router.use(`/${API_VERSION}/users`, userRoutes);
router.use(`/${API_VERSION}/sessions`, sessionRoutes);
router.use(`/${API_VERSION}/workers`, workerRoutes);
router.use(`/${API_VERSION}/admin`, adminRoutes);
router.use(`/${API_VERSION}`, apiRoutes); // External API routes

// API documentation route (will be implemented later)
router.get(`/${API_VERSION}/docs`, (req, res) => {
  res.json({
    success: true,
    message: 'API documentation will be available here',
    endpoints: {
      auth: `/${API_VERSION}/auth`,
      users: `/${API_VERSION}/users`,
      sessions: `/${API_VERSION}/sessions`,
      workers: `/${API_VERSION}/workers`,
      admin: `/${API_VERSION}/admin`,
      api: `/${API_VERSION}`
    }
  });
});

export default router;