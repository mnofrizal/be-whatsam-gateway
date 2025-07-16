import Joi from "joi";
import { createValidationMiddleware } from "../utils/helpers.js";

/**
 * Webhook Validation Rules
 * Validation for webhook endpoints using Joi schemas
 */

/**
 * Joi schema for session status webhook
 * POST /api/v1/webhooks/session-status
 */
const sessionStatusSchema = Joi.object({
  sessionId: Joi.string()
    .min(1)
    .max(100)
    .pattern(/^[a-zA-Z0-9_-]+$/)
    .required()
    .messages({
      "string.empty": "Session ID is required",
      "string.min": "Session ID must be between 1 and 100 characters",
      "string.max": "Session ID must be between 1 and 100 characters",
      "string.pattern.base":
        "Session ID can only contain letters, numbers, hyphens, and underscores",
      "any.required": "Session ID is required",
    }),

  status: Joi.string()
    .valid(
      "INIT",
      "QR_REQUIRED",
      "CONNECTED",
      "DISCONNECTED",
      "RECONNECTING",
      "ERROR"
    )
    .required()
    .messages({
      "string.empty": "Status is required",
      "any.only":
        "Status must be one of: INIT, QR_REQUIRED, CONNECTED, DISCONNECTED, RECONNECTING, ERROR",
      "any.required": "Status is required",
    }),

  qrCode: Joi.string().min(1).max(2000).optional().allow(null).messages({
    "string.min": "QR code must be between 1 and 2000 characters",
    "string.max": "QR code must be between 1 and 2000 characters",
  }),

  phoneNumber: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .optional()
    .allow(null)
    .messages({
      "string.pattern.base":
        "Phone number must be a valid international format",
    }),

  displayName: Joi.string()
    .min(1)
    .max(100)
    .optional()
    .allow(null)
    .trim()
    .messages({
      "string.min": "Display name must be between 1 and 100 characters",
      "string.max": "Display name must be between 1 and 100 characters",
    }),

  workerId: Joi.string()
    .min(1)
    .max(50)
    .pattern(/^[a-zA-Z0-9_-]+$/)
    .optional()
    .allow(null)
    .messages({
      "string.min": "Worker ID must be between 1 and 50 characters",
      "string.max": "Worker ID must be between 1 and 50 characters",
      "string.pattern.base":
        "Worker ID can only contain letters, numbers, hyphens, and underscores",
    }),

  timestamp: Joi.date().iso().optional().allow(null).messages({
    "date.format": "Timestamp must be a valid ISO 8601 date",
  }),
});

/**
 * Joi schema for message status webhook
 * POST /api/v1/webhooks/message-status
 */
const messageStatusSchema = Joi.object({
  sessionId: Joi.string()
    .min(1)
    .max(100)
    .pattern(/^[a-zA-Z0-9_-]+$/)
    .required()
    .messages({
      "string.empty": "Session ID is required",
      "string.min": "Session ID must be between 1 and 100 characters",
      "string.max": "Session ID must be between 1 and 100 characters",
      "string.pattern.base":
        "Session ID can only contain letters, numbers, hyphens, and underscores",
      "any.required": "Session ID is required",
    }),

  messageId: Joi.string()
    .min(1)
    .max(100)
    .pattern(/^[a-zA-Z0-9_-]+$/)
    .required()
    .messages({
      "string.empty": "Message ID is required",
      "string.min": "Message ID must be between 1 and 100 characters",
      "string.max": "Message ID must be between 1 and 100 characters",
      "string.pattern.base":
        "Message ID can only contain letters, numbers, hyphens, and underscores",
      "any.required": "Message ID is required",
    }),

  status: Joi.string()
    .valid("PENDING", "SENT", "DELIVERED", "READ", "FAILED")
    .required()
    .messages({
      "string.empty": "Status is required",
      "any.only":
        "Status must be one of: PENDING, SENT, DELIVERED, READ, FAILED",
      "any.required": "Status is required",
    }),

  timestamp: Joi.date().iso().optional().messages({
    "date.format": "Timestamp must be a valid ISO 8601 date",
  }),

  deliveredAt: Joi.date().iso().optional().messages({
    "date.format": "Delivered at must be a valid ISO 8601 date",
  }),

  readAt: Joi.date().iso().optional().messages({
    "date.format": "Read at must be a valid ISO 8601 date",
  }),

  errorMessage: Joi.string().max(500).optional().messages({
    "string.max": "Error message must not exceed 500 characters",
  }),
});

/**
 * Joi schema for worker heartbeat webhook
 * POST /api/v1/webhooks/worker-heartbeat
 */
const workerHeartbeatSchema = Joi.object({
  workerId: Joi.string()
    .min(1)
    .max(50)
    .pattern(/^[a-zA-Z0-9_-]+$/)
    .required()
    .messages({
      "string.empty": "Worker ID is required",
      "string.min": "Worker ID must be between 1 and 50 characters",
      "string.max": "Worker ID must be between 1 and 50 characters",
      "string.pattern.base":
        "Worker ID can only contain letters, numbers, hyphens, and underscores",
      "any.required": "Worker ID is required",
    }),

  status: Joi.string()
    .valid("ONLINE", "OFFLINE", "MAINTENANCE")
    .required()
    .messages({
      "string.empty": "Status is required",
      "any.only": "Status must be one of: ONLINE, OFFLINE, MAINTENANCE",
      "any.required": "Status is required",
    }),

  sessionCount: Joi.number().integer().min(0).max(10000).optional().messages({
    "number.min": "Session count must be an integer between 0 and 10000",
    "number.max": "Session count must be an integer between 0 and 10000",
    "number.integer": "Session count must be an integer",
  }),

  cpuUsage: Joi.number().min(0).max(100).optional().messages({
    "number.min": "CPU usage must be a number between 0 and 100",
    "number.max": "CPU usage must be a number between 0 and 100",
  }),

  memoryUsage: Joi.number().min(0).max(100).optional().messages({
    "number.min": "Memory usage must be a number between 0 and 100",
    "number.max": "Memory usage must be a number between 0 and 100",
  }),

  uptime: Joi.number().integer().min(0).optional().messages({
    "number.min": "Uptime must be a positive integer (seconds)",
    "number.integer": "Uptime must be an integer",
  }),

  activeConnections: Joi.number()
    .integer()
    .min(0)
    .max(10000)
    .optional()
    .messages({
      "number.min": "Active connections must be an integer between 0 and 10000",
      "number.max": "Active connections must be an integer between 0 and 10000",
      "number.integer": "Active connections must be an integer",
    }),

  timestamp: Joi.date().iso().optional().messages({
    "date.format": "Timestamp must be a valid ISO 8601 date",
  }),
});

// Export pre-configured validation middleware
export const validateSessionStatusMiddleware =
  createValidationMiddleware(sessionStatusSchema);
export const validateMessageStatusMiddleware =
  createValidationMiddleware(messageStatusSchema);
export const validateWorkerHeartbeatMiddleware = createValidationMiddleware(
  workerHeartbeatSchema
);

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

  if (sessionId && !/^[a-zA-Z0-9_-]{1,100}$/.test(sessionId)) {
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

// Export all validation functions (maintaining backward compatibility)
export default {
  validateSessionStatusMiddleware,
  validateMessageStatusMiddleware,
  validateWorkerHeartbeatMiddleware,
  validateWebhookCommon,
  validateWebhookPayloadSize,
  validateSessionIdFormat,
  validateWorkerIdFormat,
};
