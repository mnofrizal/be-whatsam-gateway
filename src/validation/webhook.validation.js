import { body } from "express-validator";
import { ValidationHelper } from "../utils/helpers.js";

/**
 * Webhook Validation Rules
 * Validation for webhook endpoints using express-validator
 */

/**
 * Validation for session status webhook
 * POST /api/v1/webhooks/session-status
 */
export const validateSessionStatus = [
  body("sessionId")
    .notEmpty()
    .withMessage("Session ID is required")
    .isLength({ min: 1, max: 100 })
    .withMessage("Session ID must be between 1 and 100 characters")
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage(
      "Session ID can only contain letters, numbers, hyphens, and underscores"
    ),

  body("status")
    .notEmpty()
    .withMessage("Status is required")
    .isIn([
      "INIT",
      "QR_REQUIRED",
      "CONNECTED",
      "DISCONNECTED",
      "RECONNECTING",
      "ERROR",
    ])
    .withMessage(
      "Status must be one of: INIT, QR_REQUIRED, CONNECTED, DISCONNECTED, RECONNECTING, ERROR"
    ),

  body("qrCode")
    .optional({ nullable: true })
    .isString()
    .withMessage("QR code must be a string")
    .isLength({ min: 1, max: 2000 })
    .withMessage("QR code must be between 1 and 2000 characters"),

  body("phoneNumber")
    .optional({ nullable: true })
    .isString()
    .withMessage("Phone number must be a string")
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage("Phone number must be a valid international format"),

  body("displayName")
    .optional({ nullable: true })
    .isString()
    .withMessage("Display name must be a string")
    .isLength({ min: 1, max: 100 })
    .withMessage("Display name must be between 1 and 100 characters")
    .trim(),

  body("workerId")
    .optional({ nullable: true })
    .isString()
    .withMessage("Worker ID must be a string")
    .isLength({ min: 1, max: 50 })
    .withMessage("Worker ID must be between 1 and 50 characters")
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage(
      "Worker ID can only contain letters, numbers, hyphens, and underscores"
    ),

  body("timestamp")
    .optional({ nullable: true })
    .isISO8601()
    .withMessage("Timestamp must be a valid ISO 8601 date"),

  // Handle validation errors
  ValidationHelper.handleValidationErrors,
];

/**
 * Validation for message status webhook
 * POST /api/v1/webhooks/message-status
 */
export const validateMessageStatus = [
  body("sessionId")
    .notEmpty()
    .withMessage("Session ID is required")
    .isLength({ min: 1, max: 100 })
    .withMessage("Session ID must be between 1 and 100 characters")
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage(
      "Session ID can only contain letters, numbers, hyphens, and underscores"
    ),

  body("messageId")
    .notEmpty()
    .withMessage("Message ID is required")
    .isLength({ min: 1, max: 100 })
    .withMessage("Message ID must be between 1 and 100 characters")
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage(
      "Message ID can only contain letters, numbers, hyphens, and underscores"
    ),

  body("status")
    .notEmpty()
    .withMessage("Status is required")
    .isIn(["PENDING", "SENT", "DELIVERED", "READ", "FAILED"])
    .withMessage(
      "Status must be one of: PENDING, SENT, DELIVERED, READ, FAILED"
    ),

  body("timestamp")
    .optional()
    .isISO8601()
    .withMessage("Timestamp must be a valid ISO 8601 date"),

  body("deliveredAt")
    .optional()
    .isISO8601()
    .withMessage("Delivered at must be a valid ISO 8601 date"),

  body("readAt")
    .optional()
    .isISO8601()
    .withMessage("Read at must be a valid ISO 8601 date"),

  body("errorMessage")
    .optional()
    .isString()
    .withMessage("Error message must be a string")
    .isLength({ max: 500 })
    .withMessage("Error message must not exceed 500 characters"),

  // Handle validation errors
  ValidationHelper.handleValidationErrors,
];

/**
 * Validation for worker heartbeat webhook
 * POST /api/v1/webhooks/worker-heartbeat
 */
export const validateWorkerHeartbeat = [
  body("workerId")
    .notEmpty()
    .withMessage("Worker ID is required")
    .isLength({ min: 1, max: 50 })
    .withMessage("Worker ID must be between 1 and 50 characters")
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage(
      "Worker ID can only contain letters, numbers, hyphens, and underscores"
    ),

  body("status")
    .notEmpty()
    .withMessage("Status is required")
    .isIn(["ONLINE", "OFFLINE", "MAINTENANCE"])
    .withMessage("Status must be one of: ONLINE, OFFLINE, MAINTENANCE"),

  body("sessionCount")
    .optional()
    .isInt({ min: 0, max: 10000 })
    .withMessage("Session count must be an integer between 0 and 10000"),

  body("cpuUsage")
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage("CPU usage must be a number between 0 and 100"),

  body("memoryUsage")
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage("Memory usage must be a number between 0 and 100"),

  body("uptime")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Uptime must be a positive integer (seconds)"),

  body("activeConnections")
    .optional()
    .isInt({ min: 0, max: 10000 })
    .withMessage("Active connections must be an integer between 0 and 10000"),

  body("timestamp")
    .optional()
    .isISO8601()
    .withMessage("Timestamp must be a valid ISO 8601 date"),

  // Handle validation errors
  ValidationHelper.handleValidationErrors,
];

/**
 * Common validation for all webhook endpoints
 */
export const validateWebhookCommon = [
  // Ensure request has JSON content type
  (req, res, next) => {
    if (!req.is("application/json")) {
      return res.status(400).json({
        success: false,
        error: "Content-Type must be application/json",
        timestamp: new Date().toISOString(),
      });
    }
    next();
  },

  // Ensure request body is not empty
  (req, res, next) => {
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        error: "Request body cannot be empty",
        timestamp: new Date().toISOString(),
      });
    }
    next();
  },
];

/**
 * Validation for webhook payload size
 */
export const validateWebhookPayloadSize = (req, res, next) => {
  const maxSize = 1024 * 1024; // 1MB
  const contentLength = parseInt(req.get("Content-Length") || "0");

  if (contentLength > maxSize) {
    return res.status(413).json({
      success: false,
      error: "Payload too large. Maximum size is 1MB",
      timestamp: new Date().toISOString(),
    });
  }

  next();
};

/**
 * Custom validation for session ID format
 */
export const validateSessionIdFormat = (req, res, next) => {
  const { sessionId } = req.body;

  if (sessionId && !ValidationHelper.isValidSessionId(sessionId)) {
    return res.status(400).json({
      success: false,
      error: "Invalid session ID format",
      details: {
        sessionId,
        expectedFormat:
          "user123-session-name or similar alphanumeric with hyphens/underscores",
      },
      timestamp: new Date().toISOString(),
    });
  }

  next();
};

/**
 * Custom validation for worker ID format
 */
export const validateWorkerIdFormat = (req, res, next) => {
  const { workerId } = req.body;

  if (workerId && !/^[a-zA-Z0-9_-]{1,50}$/.test(workerId)) {
    return res.status(400).json({
      success: false,
      error: "Invalid worker ID format",
      details: {
        workerId,
        expectedFormat:
          "worker-001, custom-worker-name, or similar alphanumeric with hyphens/underscores",
      },
      timestamp: new Date().toISOString(),
    });
  }

  next();
};

// Export all validation functions
export default {
  validateSessionStatus,
  validateMessageStatus,
  validateWorkerHeartbeat,
  validateWebhookCommon,
  validateWebhookPayloadSize,
  validateSessionIdFormat,
  validateWorkerIdFormat,
};
