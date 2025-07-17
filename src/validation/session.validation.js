// Session Validation - Input validation for session operations
import Joi from "joi";
import { createValidationMiddleware } from "../utils/helpers.js";

/**
 * Joi schema for session creation
 */
const sessionCreationSchema = Joi.object({
  name: Joi.string().min(1).max(100).required().trim().messages({
    "string.empty": "Session name is required",
    "string.min": "Session name must be between 1 and 100 characters",
    "string.max": "Session name must be between 1 and 100 characters",
    "any.required": "Session name is required",
  }),

  displayName: Joi.string().min(1).max(100).optional().trim().messages({
    "string.min": "Display name must be between 1 and 100 characters",
    "string.max": "Display name must be between 1 and 100 characters",
  }),

  sessionId: Joi.string()
    .min(3)
    .max(100)
    .pattern(/^[a-zA-Z0-9_-]+$/)
    .optional()
    .messages({
      "string.min": "Session ID must be between 3 and 100 characters",
      "string.max": "Session ID must be between 3 and 100 characters",
      "string.pattern.base":
        "Session ID can only contain letters, numbers, hyphens, and underscores",
    }),
});

/**
 * Joi schema for session ID parameter
 */
const sessionIdParamSchema = Joi.object({
  id: Joi.string().min(3).max(100).required().messages({
    "string.empty": "Session ID is required",
    "string.min": "Session ID must be between 3 and 100 characters",
    "string.max": "Session ID must be between 3 and 100 characters",
    "any.required": "Session ID is required",
  }),
});

/**
 * Joi schema for session filters (query parameters)
 */
const sessionFiltersSchema = Joi.object({
  status: Joi.string()
    .valid(
      "CONNECTED",
      "DISCONNECTED",
      "INITIALIZING",
      "QR_REQUIRED",
      "ERROR",
      "RECONNECTING"
    )
    .optional()
    .messages({
      "any.only":
        "Status must be one of: CONNECTED, DISCONNECTED, INITIALIZING, QR_REQUIRED, ERROR, RECONNECTING",
    }),

  limit: Joi.number().integer().min(1).max(100).optional().messages({
    "number.min": "Limit must be between 1 and 100",
    "number.max": "Limit must be between 1 and 100",
    "number.integer": "Limit must be an integer",
  }),

  offset: Joi.number().integer().min(0).optional().messages({
    "number.min": "Offset must be a non-negative integer",
    "number.integer": "Offset must be an integer",
  }),
});

/**
 * Joi schema for session connection
 */
const sessionConnectionSchema = Joi.object({
  id: Joi.string().min(3).max(100).required().messages({
    "string.empty": "Session ID is required",
    "string.min": "Session ID must be between 3 and 100 characters",
    "string.max": "Session ID must be between 3 and 100 characters",
    "any.required": "Session ID is required",
  }),
});

/**
 * Joi schema for session restart
 */
const sessionRestartSchema = Joi.object({
  id: Joi.string().min(3).max(100).required().messages({
    "string.empty": "Session ID is required",
    "string.min": "Session ID must be between 3 and 100 characters",
    "string.max": "Session ID must be between 3 and 100 characters",
    "any.required": "Session ID is required",
  }),
});

/**
 * Joi schema for webhook configuration (future use)
 */
const webhookConfigSchema = Joi.object({
  url: Joi.string()
    .uri({ scheme: ["http", "https"] })
    .required()
    .messages({
      "string.empty": "Webhook URL is required",
      "string.uri": "Webhook URL must be a valid HTTP/HTTPS URL",
      "any.required": "Webhook URL is required",
    }),

  events: Joi.array()
    .items(
      Joi.string().valid(
        "message.sent",
        "message.delivered",
        "message.read",
        "message.failed",
        "session.connected",
        "session.disconnected",
        "session.qr_required",
        "session.error"
      )
    )
    .min(1)
    .required()
    .messages({
      "array.min": "Events must be an array with at least one event",
      "any.only":
        "Invalid event. Valid events are: message.sent, message.delivered, message.read, message.failed, session.connected, session.disconnected, session.qr_required, session.error",
      "any.required": "Events array is required",
    }),

  secret: Joi.string().min(8).max(64).optional().messages({
    "string.min": "Webhook secret must be between 8 and 64 characters",
    "string.max": "Webhook secret must be between 8 and 64 characters",
  }),
});

// Export pre-configured validation middleware
export const validateSessionCreationMiddleware = createValidationMiddleware(
  sessionCreationSchema,
  "body"
);
export const validateSessionIdParamMiddleware = createValidationMiddleware(
  sessionIdParamSchema,
  "params"
);
export const validateSessionFiltersMiddleware = createValidationMiddleware(
  sessionFiltersSchema,
  "query"
);
export const validateSessionConnectionMiddleware = createValidationMiddleware(
  sessionConnectionSchema,
  "params"
);
export const validateSessionRestartMiddleware = createValidationMiddleware(
  sessionRestartSchema,
  "params"
);
export const validateWebhookConfigMiddleware = createValidationMiddleware(
  webhookConfigSchema,
  "body"
);
