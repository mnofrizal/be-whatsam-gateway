// API Validation - External API endpoint validation using Joi schemas
import Joi from "joi";
import { createValidationMiddleware } from "../utils/helpers.js";

// Phone number validation pattern (supports both plain numbers and WhatsApp format)
const phonePattern = /^([0-9]+(@[a-z.]+)?|[0-9]+@[a-z.]+)$/;

// Send text message validation schema
const sendTextSchema = Joi.object({
  to: Joi.string().pattern(phonePattern).required().messages({
    "string.empty": "Recipient is required",
    "string.pattern.base":
      "Recipient must be a phone number (e.g., 6281234567890) or WhatsApp format (number@s.whatsapp.net)",
    "any.required": "Recipient is required",
  }),
  message: Joi.string().min(1).max(4096).required().messages({
    "string.empty": "Message is required",
    "string.min": "Message must be at least 1 character long",
    "string.max": "Message must not exceed 4096 characters",
    "any.required": "Message is required",
  }),
});

// Send image message validation schema
const sendImageSchema = Joi.object({
  to: Joi.string().pattern(phonePattern).required().messages({
    "string.empty": "Recipient is required",
    "string.pattern.base":
      "Recipient must be a phone number (e.g., 6281234567890) or WhatsApp format (number@s.whatsapp.net)",
    "any.required": "Recipient is required",
  }),
  imageUrl: Joi.string()
    .uri({ scheme: ["http", "https"] })
    .required()
    .messages({
      "string.empty": "Image URL is required",
      "string.uri": "Image URL must be a valid HTTP/HTTPS URL",
      "any.required": "Image URL is required",
    }),
  caption: Joi.string().max(1024).optional().messages({
    "string.max": "Caption must not exceed 1024 characters",
  }),
});

// Send file message validation schema
const sendFileSchema = Joi.object({
  to: Joi.string().pattern(phonePattern).required().messages({
    "string.empty": "Recipient is required",
    "string.pattern.base":
      "Recipient must be a phone number (e.g., 6281234567890) or WhatsApp format (number@s.whatsapp.net)",
    "any.required": "Recipient is required",
  }),
  fileUrl: Joi.string()
    .uri({ scheme: ["http", "https"] })
    .required()
    .messages({
      "string.empty": "File URL is required",
      "string.uri": "File URL must be a valid HTTP/HTTPS URL",
      "any.required": "File URL is required",
    }),
  filename: Joi.string().min(1).max(255).optional().messages({
    "string.min": "Filename must be at least 1 character long",
    "string.max": "Filename must not exceed 255 characters",
  }),
  caption: Joi.string().max(1024).optional().messages({
    "string.max": "Caption must not exceed 1024 characters",
  }),
});

// Send voice message validation schema
const sendVoiceSchema = Joi.object({
  to: Joi.string().pattern(phonePattern).required().messages({
    "string.empty": "Recipient is required",
    "string.pattern.base":
      "Recipient must be a phone number (e.g., 6281234567890) or WhatsApp format (number@s.whatsapp.net)",
    "any.required": "Recipient is required",
  }),
  audioUrl: Joi.string()
    .uri({ scheme: ["http", "https"] })
    .required()
    .messages({
      "string.empty": "Audio URL is required",
      "string.uri": "Audio URL must be a valid HTTP/HTTPS URL",
      "any.required": "Audio URL is required",
    }),
});

// Send video message validation schema
const sendVideoSchema = Joi.object({
  to: Joi.string().pattern(phonePattern).required().messages({
    "string.empty": "Recipient is required",
    "string.pattern.base":
      "Recipient must be a phone number (e.g., 6281234567890) or WhatsApp format (number@s.whatsapp.net)",
    "any.required": "Recipient is required",
  }),
  videoUrl: Joi.string()
    .uri({ scheme: ["http", "https"] })
    .required()
    .messages({
      "string.empty": "Video URL is required",
      "string.uri": "Video URL must be a valid HTTP/HTTPS URL",
      "any.required": "Video URL is required",
    }),
  caption: Joi.string().max(1024).optional().messages({
    "string.max": "Caption must not exceed 1024 characters",
  }),
});

// Send location message validation schema
const sendLocationSchema = Joi.object({
  to: Joi.string().pattern(phonePattern).required().messages({
    "string.empty": "Recipient is required",
    "string.pattern.base":
      "Recipient must be a phone number (e.g., 6281234567890) or WhatsApp format (number@s.whatsapp.net)",
    "any.required": "Recipient is required",
  }),
  latitude: Joi.number().min(-90).max(90).required().messages({
    "number.base": "Latitude must be a number",
    "number.min": "Latitude must be between -90 and 90",
    "number.max": "Latitude must be between -90 and 90",
    "any.required": "Latitude is required",
  }),
  longitude: Joi.number().min(-180).max(180).required().messages({
    "number.base": "Longitude must be a number",
    "number.min": "Longitude must be between -180 and 180",
    "number.max": "Longitude must be between -180 and 180",
    "any.required": "Longitude is required",
  }),
  name: Joi.string().min(1).max(255).optional().messages({
    "string.min": "Location name must be at least 1 character long",
    "string.max": "Location name must not exceed 255 characters",
  }),
  address: Joi.string().min(1).max(500).optional().messages({
    "string.min": "Address must be at least 1 character long",
    "string.max": "Address must not exceed 500 characters",
  }),
});

// Send seen message validation schema
const sendSeenSchema = Joi.object({
  messageId: Joi.string().min(1).max(100).required().messages({
    "string.empty": "Message ID is required",
    "string.min": "Message ID must be at least 1 character long",
    "string.max": "Message ID must not exceed 100 characters",
    "any.required": "Message ID is required",
  }),
});

// Send contact vcard validation schema
const sendContactVcardSchema = Joi.object({
  to: Joi.string().pattern(phonePattern).required().messages({
    "string.empty": "Recipient is required",
    "string.pattern.base":
      "Recipient must be a phone number (e.g., 6281234567890) or WhatsApp format (number@s.whatsapp.net)",
    "any.required": "Recipient is required",
  }),
  contactName: Joi.string().min(1).max(255).required().messages({
    "string.empty": "Contact name is required",
    "string.min": "Contact name must be at least 1 character long",
    "string.max": "Contact name must not exceed 255 characters",
    "any.required": "Contact name is required",
  }),
  contactPhone: Joi.string()
    .pattern(/^[0-9+\-\s()]+$/)
    .required()
    .messages({
      "string.empty": "Contact phone is required",
      "string.pattern.base": "Contact phone must be a valid phone number",
      "any.required": "Contact phone is required",
    }),
  contactEmail: Joi.string().email().optional().messages({
    "string.email": "Contact email must be a valid email address",
  }),
  contactOrganization: Joi.string().min(1).max(255).optional().messages({
    "string.min": "Contact organization must be at least 1 character long",
    "string.max": "Contact organization must not exceed 255 characters",
  }),
});

// Send link message validation schema
const sendLinkSchema = Joi.object({
  to: Joi.string().pattern(phonePattern).required().messages({
    "string.empty": "Recipient is required",
    "string.pattern.base":
      "Recipient must be a phone number (e.g., 6281234567890) or WhatsApp format (number@s.whatsapp.net)",
    "any.required": "Recipient is required",
  }),
  url: Joi.string()
    .uri({ scheme: ["http", "https"] })
    .required()
    .messages({
      "string.empty": "URL is required",
      "string.uri": "URL must be a valid HTTP/HTTPS URL",
      "any.required": "URL is required",
    }),
  text: Joi.string().min(1).max(1024).optional().messages({
    "string.min": "Link text must be at least 1 character long",
    "string.max": "Link text must not exceed 1024 characters",
  }),
});

// Send poll message validation schema
const sendPollSchema = Joi.object({
  to: Joi.string().pattern(phonePattern).required().messages({
    "string.empty": "Recipient is required",
    "string.pattern.base":
      "Recipient must be a phone number (e.g., 6281234567890) or WhatsApp format (number@s.whatsapp.net)",
    "any.required": "Recipient is required",
  }),
  question: Joi.string().min(1).max(255).required().messages({
    "string.empty": "Poll question is required",
    "string.min": "Poll question must be at least 1 character long",
    "string.max": "Poll question must not exceed 255 characters",
    "any.required": "Poll question is required",
  }),
  options: Joi.array()
    .items(Joi.string().min(1).max(100))
    .min(2)
    .max(12)
    .required()
    .messages({
      "array.base": "Poll options must be an array",
      "array.min": "Poll must have at least 2 options",
      "array.max": "Poll can have maximum 12 options",
      "any.required": "Poll options are required",
    }),
  maxAnswer: Joi.number().integer().min(1).max(12).optional().messages({
    "number.base": "Max answer must be a number",
    "number.integer": "Max answer must be an integer",
    "number.min": "Max answer must be at least 1",
    "number.max": "Max answer cannot exceed 12",
  }),
});

// Start typing validation schema
const startTypingSchema = Joi.object({
  to: Joi.string().pattern(phonePattern).required().messages({
    "string.empty": "Recipient is required",
    "string.pattern.base":
      "Recipient must be a phone number (e.g., 6281234567890) or WhatsApp format (number@s.whatsapp.net)",
    "any.required": "Recipient is required",
  }),
});

// Stop typing validation schema
const stopTypingSchema = Joi.object({
  to: Joi.string().pattern(phonePattern).required().messages({
    "string.empty": "Recipient is required",
    "string.pattern.base":
      "Recipient must be a phone number (e.g., 6281234567890) or WhatsApp format (number@s.whatsapp.net)",
    "any.required": "Recipient is required",
  }),
});

// Message management URL parameters validation schema
const manageMessageParamsSchema = Joi.object({
  messageId: Joi.string().min(1).max(200).required().messages({
    "string.empty": "Message ID is required",
    "string.min": "Message ID must be at least 1 character long",
    "string.max": "Message ID must not exceed 200 characters",
    "any.required": "Message ID is required",
  }),
  action: Joi.string()
    .valid(
      "delete",
      "unsend",
      "edit",
      "star",
      "unstar",
      "reaction",
      "read",
      "pin",
      "unpin"
    )
    .required()
    .messages({
      "string.empty": "Action is required",
      "any.only":
        "Action must be one of: delete, unsend, edit, star, unstar, reaction, read, pin, unpin",
      "any.required": "Action is required",
    }),
});

// Message management request body validation schema
const manageMessageBodySchema = Joi.object({
  action: Joi.string()
    .valid(
      "delete",
      "unsend",
      "edit",
      "star",
      "unstar",
      "reaction",
      "read",
      "pin",
      "unpin"
    )
    .required()
    .messages({
      "string.empty": "Action is required",
      "any.only":
        "Action must be one of: delete, unsend, edit, star, unstar, reaction, read, pin, unpin",
      "any.required": "Action is required",
    }),
  phone: Joi.string().pattern(phonePattern).required().messages({
    "string.empty": "Phone number is required",
    "string.pattern.base":
      "Phone number must be a valid format (e.g., 6281234567890) or WhatsApp format (number@s.whatsapp.net)",
    "any.required": "Phone number is required",
  }),
  // Optional fields based on action type
  forEveryone: Joi.boolean().optional().messages({
    "boolean.base": "forEveryone must be a boolean value",
  }),
  content: Joi.string().min(1).max(4096).optional().messages({
    "string.min": "Content must be at least 1 character long",
    "string.max": "Content must not exceed 4096 characters",
  }),
  emoji: Joi.string().min(1).max(10).optional().messages({
    "string.min": "Emoji must be at least 1 character long",
    "string.max": "Emoji must not exceed 10 characters",
  }),
})
  .custom((value, helpers) => {
    const { action, content, emoji, forEveryone } = value;

    // Validate required fields based on action type
    switch (action) {
      case "edit":
        if (!content) {
          return helpers.error("custom.editContent");
        }
        break;
      case "reaction":
        if (!emoji) {
          return helpers.error("custom.reactionEmoji");
        }
        break;
      case "delete":
        // forEveryone is optional for delete action
        break;
      case "unsend":
      case "star":
      case "unstar":
      case "read":
      case "pin":
      case "unpin":
        // These actions don't require additional fields
        break;
    }

    return value;
  })
  .messages({
    "custom.editContent": "Content is required for edit action",
    "custom.reactionEmoji": "Emoji is required for reaction action",
  });

// Combined message management schema (for backward compatibility)
const manageMessageSchema = manageMessageBodySchema;

// Export validation middleware for all API operations
export const validateSendTextMiddleware =
  createValidationMiddleware(sendTextSchema);
export const validateSendImageMiddleware =
  createValidationMiddleware(sendImageSchema);
export const validateSendFileMiddleware =
  createValidationMiddleware(sendFileSchema);
export const validateSendVoiceMiddleware =
  createValidationMiddleware(sendVoiceSchema);
export const validateSendVideoMiddleware =
  createValidationMiddleware(sendVideoSchema);
export const validateSendLocationMiddleware =
  createValidationMiddleware(sendLocationSchema);
export const validateSendContactVcardMiddleware = createValidationMiddleware(
  sendContactVcardSchema
);
export const validateSendSeenMiddleware =
  createValidationMiddleware(sendSeenSchema);
export const validateSendLinkMiddleware =
  createValidationMiddleware(sendLinkSchema);
export const validateSendPollMiddleware =
  createValidationMiddleware(sendPollSchema);
export const validateStartTypingMiddleware =
  createValidationMiddleware(startTypingSchema);
export const validateStopTypingMiddleware =
  createValidationMiddleware(stopTypingSchema);
// Custom validation middleware for message management that validates both params and body
export const validateManageMessageMiddleware = (req, res, next) => {
  // Validate URL parameters
  const { error: paramsError } = manageMessageParamsSchema.validate(req.params);
  if (paramsError) {
    return res.status(400).json({
      success: false,
      timestamp: new Date().toISOString(),
      error: {
        code: "VALIDATION_ERROR",
        message: "Validation failed",
        details: {
          errors: paramsError.details.map((detail) => ({
            field: detail.path.join("."),
            message: detail.message,
          })),
        },
      },
    });
  }

  // Validate request body
  const { error: bodyError } = manageMessageBodySchema.validate(req.body);
  if (bodyError) {
    return res.status(400).json({
      success: false,
      timestamp: new Date().toISOString(),
      error: {
        code: "VALIDATION_ERROR",
        message: "Validation failed",
        details: {
          errors: bodyError.details.map((detail) => ({
            field: detail.path.join("."),
            message: detail.message,
          })),
        },
      },
    });
  }

  next();
};

// Export schemas for direct use if needed
export {
  sendTextSchema,
  sendImageSchema,
  sendFileSchema,
  sendVoiceSchema,
  sendVideoSchema,
  sendLocationSchema,
  sendContactVcardSchema,
  sendSeenSchema,
  sendLinkSchema,
  sendPollSchema,
  startTypingSchema,
  stopTypingSchema,
  manageMessageSchema,
  manageMessageParamsSchema,
  manageMessageBodySchema,
};
