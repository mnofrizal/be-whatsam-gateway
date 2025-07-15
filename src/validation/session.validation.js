// Session Validation - Input validation for session operations
import { body, param, query } from "express-validator";

/**
 * Validation for session creation
 */
export const validateSessionCreation = [
  body("name")
    .notEmpty()
    .withMessage("Session name is required")
    .isLength({ min: 1, max: 100 })
    .withMessage("Session name must be between 1 and 100 characters")
    .trim(),

  body("displayName")
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage("Display name must be between 1 and 100 characters")
    .trim(),

  body("sessionId")
    .optional()
    .isLength({ min: 3, max: 100 })
    .withMessage("Session ID must be between 3 and 100 characters")
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage(
      "Session ID can only contain letters, numbers, hyphens, and underscores"
    ),
];

/**
 * Validation for session ID parameter
 */
export const validateSessionIdParam = [
  param("id")
    .notEmpty()
    .withMessage("Session ID is required")
    .isLength({ min: 3, max: 100 })
    .withMessage("Session ID must be between 3 and 100 characters"),
];

/**
 * Validation for session filters (query parameters)
 */
export const validateSessionFilters = [
  query("status")
    .optional()
    .isIn([
      "CONNECTED",
      "DISCONNECTED",
      "INITIALIZING",
      "QR_REQUIRED",
      "ERROR",
      "RECONNECTING",
    ])
    .withMessage(
      "Status must be one of: CONNECTED, DISCONNECTED, INITIALIZING, QR_REQUIRED, ERROR, RECONNECTING"
    ),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),

  query("offset")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Offset must be a non-negative integer"),
];

/**
 * Validation for sending messages
 */
export const validateSendMessage = [
  param("id")
    .notEmpty()
    .withMessage("Session ID is required")
    .isLength({ min: 3, max: 100 })
    .withMessage("Session ID must be between 3 and 100 characters"),

  body("to")
    .notEmpty()
    .withMessage("Recipient is required")
    .matches(/^([0-9]+(@[a-z.]+)?|[0-9]+@[a-z.]+)$/)
    .withMessage(
      "Recipient must be a phone number (e.g., 6281234567890) or WhatsApp format (number@s.whatsapp.net)"
    ),

  body("type")
    .notEmpty()
    .withMessage("Message type is required")
    .isIn([
      "text",
      "image",
      "document",
      "audio",
      "video",
      "sticker",
      "location",
      "contact",
    ])
    .withMessage(
      "Type must be one of: text, image, document, audio, video, sticker, location, contact"
    ),

  body("message")
    .if(body("type").equals("text"))
    .notEmpty()
    .withMessage("Message content is required for text messages")
    .isLength({ min: 1, max: 4096 })
    .withMessage("Message content must be between 1 and 4096 characters"),

  body("media")
    .if(body("type").isIn(["image", "document", "audio", "video", "sticker"]))
    .notEmpty()
    .withMessage("Media is required for media messages")
    .isBase64()
    .withMessage("Media must be base64 encoded"),

  body("caption")
    .optional()
    .isLength({ max: 1024 })
    .withMessage("Caption must not exceed 1024 characters"),

  body("filename")
    .if(body("type").equals("document"))
    .notEmpty()
    .withMessage("Filename is required for document messages")
    .isLength({ min: 1, max: 255 })
    .withMessage("Filename must be between 1 and 255 characters"),
];

/**
 * Validation for message history query parameters
 */
export const validateMessageHistory = [
  param("id")
    .notEmpty()
    .withMessage("Session ID is required")
    .isLength({ min: 3, max: 100 })
    .withMessage("Session ID must be between 3 and 100 characters"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),

  query("offset")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Offset must be a non-negative integer"),

  query("direction")
    .optional()
    .isIn(["INBOUND", "OUTBOUND"])
    .withMessage("Direction must be either INBOUND or OUTBOUND"),

  query("status")
    .optional()
    .isIn(["SENT", "DELIVERED", "READ", "FAILED", "PENDING"])
    .withMessage(
      "Status must be one of: SENT, DELIVERED, READ, FAILED, PENDING"
    ),

  query("from")
    .optional()
    .isISO8601()
    .withMessage("From date must be in ISO 8601 format"),

  query("to")
    .optional()
    .isISO8601()
    .withMessage("To date must be in ISO 8601 format"),
];

/**
 * Validation for session connection
 */
export const validateSessionConnection = [
  param("id")
    .notEmpty()
    .withMessage("Session ID is required")
    .isLength({ min: 3, max: 100 })
    .withMessage("Session ID must be between 3 and 100 characters"),
];

/**
 * Validation for session restart
 */
export const validateSessionRestart = [
  param("id")
    .notEmpty()
    .withMessage("Session ID is required")
    .isLength({ min: 3, max: 100 })
    .withMessage("Session ID must be between 3 and 100 characters"),
];

/**
 * Validation for webhook configuration (future use)
 */
export const validateWebhookConfig = [
  param("id")
    .notEmpty()
    .withMessage("Session ID is required")
    .isLength({ min: 3, max: 100 })
    .withMessage("Session ID must be between 3 and 100 characters"),

  body("url")
    .notEmpty()
    .withMessage("Webhook URL is required")
    .isURL({ protocols: ["http", "https"], require_protocol: true })
    .withMessage("Webhook URL must be a valid HTTP/HTTPS URL"),

  body("events")
    .isArray({ min: 1 })
    .withMessage("Events must be an array with at least one event")
    .custom((events) => {
      const validEvents = [
        "message.sent",
        "message.delivered",
        "message.read",
        "message.failed",
        "session.connected",
        "session.disconnected",
        "session.qr_required",
        "session.error",
      ];

      for (const event of events) {
        if (!validEvents.includes(event)) {
          throw new Error(
            `Invalid event: ${event}. Valid events are: ${validEvents.join(", ")}`
          );
        }
      }
      return true;
    }),

  body("secret")
    .optional()
    .isLength({ min: 8, max: 64 })
    .withMessage("Webhook secret must be between 8 and 64 characters"),
];
