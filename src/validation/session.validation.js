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
 * Joi schema for sending messages (body validation)
 */
const sendMessageSchema = Joi.object({
  to: Joi.string()
    .pattern(/^([0-9]+(@[a-z.]+)?|[0-9]+@[a-z.]+)$/)
    .required()
    .messages({
      "string.empty": "Recipient is required",
      "string.pattern.base":
        "Recipient must be a phone number (e.g., 6281234567890) or WhatsApp format (number@s.whatsapp.net)",
      "any.required": "Recipient is required",
    }),

  type: Joi.string()
    .valid(
      "text",
      "image",
      "document",
      "audio",
      "video",
      "sticker",
      "location",
      "contact"
    )
    .required()
    .messages({
      "string.empty": "Message type is required",
      "any.only":
        "Type must be one of: text, image, document, audio, video, sticker, location, contact",
      "any.required": "Message type is required",
    }),

  message: Joi.when("type", {
    is: "text",
    then: Joi.string().min(1).max(4096).required().messages({
      "string.empty": "Message content is required for text messages",
      "string.min": "Message content must be between 1 and 4096 characters",
      "string.max": "Message content must be between 1 and 4096 characters",
      "any.required": "Message content is required for text messages",
    }),
    otherwise: Joi.optional(),
  }),

  media: Joi.when("type", {
    is: Joi.valid("image", "document", "audio", "video", "sticker"),
    then: Joi.string().base64().required().messages({
      "string.empty": "Media is required for media messages",
      "string.base64": "Media must be base64 encoded",
      "any.required": "Media is required for media messages",
    }),
    otherwise: Joi.optional(),
  }),

  caption: Joi.string().max(1024).optional().messages({
    "string.max": "Caption must not exceed 1024 characters",
  }),

  filename: Joi.when("type", {
    is: "document",
    then: Joi.string().min(1).max(255).required().messages({
      "string.empty": "Filename is required for document messages",
      "string.min": "Filename must be between 1 and 255 characters",
      "string.max": "Filename must be between 1 and 255 characters",
      "any.required": "Filename is required for document messages",
    }),
    otherwise: Joi.optional(),
  }),
});

/**
 * Joi schema for message history query parameters
 */
const messageHistorySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).optional().messages({
    "number.min": "Limit must be between 1 and 100",
    "number.max": "Limit must be between 1 and 100",
    "number.integer": "Limit must be an integer",
  }),

  offset: Joi.number().integer().min(0).optional().messages({
    "number.min": "Offset must be a non-negative integer",
    "number.integer": "Offset must be an integer",
  }),

  direction: Joi.string().valid("INBOUND", "OUTBOUND").optional().messages({
    "any.only": "Direction must be either INBOUND or OUTBOUND",
  }),

  status: Joi.string()
    .valid("SENT", "DELIVERED", "READ", "FAILED", "PENDING")
    .optional()
    .messages({
      "any.only":
        "Status must be one of: SENT, DELIVERED, READ, FAILED, PENDING",
    }),

  from: Joi.date().iso().optional().messages({
    "date.format": "From date must be in ISO 8601 format",
  }),

  to: Joi.date().iso().optional().messages({
    "date.format": "To date must be in ISO 8601 format",
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
export const validateSendMessageMiddleware = createValidationMiddleware(
  sendMessageSchema,
  "body"
);
export const validateMessageHistoryMiddleware = createValidationMiddleware(
  messageHistorySchema,
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
