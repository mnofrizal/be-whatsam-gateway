// User Routes - User management endpoints
import express from "express";
import UserController from "../controllers/user.controller.js";
import { sessionLimiter } from "../middleware/rate-limit.js";
import { authenticateJWT } from "../middleware/auth.js";
import {
  validateUpdateProfileMiddleware,
  validateDeactivateAccountMiddleware,
  validateUsageQueryMiddleware,
  validateSessionsQueryMiddleware,
} from "../validation/user.validation.js";

const router = express.Router();

// Apply JWT authentication to all user routes
router.use(authenticateJWT);

/**
 * @swagger
 * /api/v1/users/profile:
 *   get:
 *     summary: Get user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         email:
 *                           type: string
 *                         role:
 *                           type: string
 *                         tier:
 *                           type: string
 *                         isActive:
 *                           type: boolean
 *                         lastLoginAt:
 *                           type: string
 *                           format: date-time
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *       401:
 *         description: Unauthorized
 */
router.get("/profile", UserController.getUserProfile);

/**
 * @swagger
 * /api/v1/users/profile:
 *   put:
 *     summary: Update user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *               email:
 *                 type: string
 *                 format: email
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.put(
  "/profile",
  sessionLimiter,
  validateUpdateProfileMiddleware,
  UserController.updateUserProfile
);

/**
 * @swagger
 * /api/v1/users/api-keys:
 *   get:
 *     summary: Get user's API keys
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: API keys retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     apiKeys:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           key:
 *                             type: string
 *                           sessionId:
 *                             type: string
 *                           isActive:
 *                             type: boolean
 *                           lastUsed:
 *                             type: string
 *                             format: date-time
 *                           expiresAt:
 *                             type: string
 *                             format: date-time
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                     total:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 */
router.get("/api-keys", UserController.getUserApiKeys);

/**
 * @swagger
 * /api/v1/users/api-keys/{id}:
 *   delete:
 *     summary: Delete API key
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: API key deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: API key not found
 */
router.delete("/api-keys/:id", sessionLimiter, UserController.deleteApiKey);

/**
 * @swagger
 * /api/v1/users/usage:
 *   get:
 *     summary: Get user usage statistics
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [24h, 7d, 30d]
 *           default: 24h
 *       - in: query
 *         name: sessionId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Usage statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     usage:
 *                       type: object
 *                       properties:
 *                         period:
 *                           type: string
 *                         totalMessages:
 *                           type: integer
 *                         totalSessions:
 *                           type: integer
 *                         totalApiCalls:
 *                           type: integer
 *                         messagesByType:
 *                           type: object
 *                         dailyBreakdown:
 *                           type: array
 *       401:
 *         description: Unauthorized
 */
router.get("/usage", validateUsageQueryMiddleware, UserController.getUserUsage);

/**
 * @swagger
 * /api/v1/users/tier:
 *   get:
 *     summary: Get user tier information
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tier information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     tier:
 *                       type: object
 *                       properties:
 *                         current:
 *                           type: string
 *                         limits:
 *                           type: object
 *                         features:
 *                           type: object
 *                         usage:
 *                           type: object
 *                         upgradeOptions:
 *                           type: array
 *       401:
 *         description: Unauthorized
 */
router.get("/tier", UserController.getUserTier);

/**
 * @swagger
 * /api/v1/users/sessions:
 *   get:
 *     summary: Get user sessions
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Sessions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     sessions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           phoneNumber:
 *                             type: string
 *                           status:
 *                             type: string
 *                           lastSeenAt:
 *                             type: string
 *                             format: date-time
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         offset:
 *                           type: integer
 *                         hasMore:
 *                           type: boolean
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/sessions",
  validateSessionsQueryMiddleware,
  UserController.getUserSessions
);

/**
 * @swagger
 * /api/v1/users/deactivate:
 *   post:
 *     summary: Deactivate user account
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Account deactivated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/deactivate",
  sessionLimiter,
  validateDeactivateAccountMiddleware,
  UserController.deactivateAccount
);

export default router;
