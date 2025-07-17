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
  to: Joi.string().pattern(phonePattern).required().messages({
    "string.empty": "Recipient is required",
    "string.pattern.base":
      "Recipient must be a phone number (e.g., 6281234567890) or WhatsApp format (number@s.whatsapp.net)",
    "any.required": "Recipient is required",
  }),
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

// Typing indicators validation schema
const typingIndicatorSchema = Joi.object({
  to: Joi.string().pattern(phonePattern).required().messages({
    "string.empty": "Recipient is required",
    "string.pattern.base":
      "Recipient must be a phone number (e.g., 6281234567890) or WhatsApp format (number@s.whatsapp.net)",
    "any.required": "Recipient is required",
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
  title: Joi.string().optional().messages({
    "string.base": "Title must be a string",
  }),
  description: Joi.string().optional().messages({
    "string.base": "Description must be a string",
  }),
  thumbnail: Joi.string()
    .uri({ scheme: ["http", "https"] })
    .optional()
    .messages({
      "string.uri": "Thumbnail must be a valid HTTP/HTTPS URL",
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
  poll: Joi.object({
    question: Joi.string().required(),
    options: Joi.array().items(Joi.string()).min(2).required(),
    multipleAnswers: Joi.boolean().default(false),
  }).required(),
});

// Message management validation schemas

// URL parameter validation schema for messageId
const messageIdParamsSchema = Joi.object({
  messageId: Joi.string().min(1).max(100).required().messages({
    "string.empty": "Message ID is required",
    "string.min": "Message ID must be at least 1 character long",
    "string.max": "Message ID must not exceed 100 characters",
    "any.required": "Message ID is required",
  }),
});

// Body validation schemas (without messageId since it's in URL params)
const messageDeleteBodySchema = Joi.object({
  phone: Joi.string().pattern(phonePattern).required().messages({
    "string.empty": "Phone number is required",
    "string.pattern.base":
      "Phone number must be a phone number (e.g., 6281234567890) or WhatsApp format (number@s.whatsapp.net)",
    "any.required": "Phone number is required",
  }),
  forEveryone: Joi.boolean().default(false).messages({
    "boolean.base": "forEveryone must be a boolean value",
  }),
});

const messageUnsendBodySchema = Joi.object({
  phone: Joi.string().pattern(phonePattern).required().messages({
    "string.empty": "Phone number is required",
    "string.pattern.base":
      "Phone number must be a phone number (e.g., 6281234567890) or WhatsApp format (number@s.whatsapp.net)",
    "any.required": "Phone number is required",
  }),
});

const messageReactionBodySchema = Joi.object({
  phone: Joi.string().pattern(phonePattern).required().messages({
    "string.empty": "Phone number is required",
    "string.pattern.base":
      "Phone number must be a phone number (e.g., 6281234567890) or WhatsApp format (number@s.whatsapp.net)",
    "any.required": "Phone number is required",
  }),
  emoji: Joi.string().min(1).max(10).required().messages({
    "string.empty": "Emoji is required",
    "string.min": "Emoji must be at least 1 character long",
    "string.max": "Emoji must not exceed 10 characters",
    "any.required": "Emoji is required",
  }),
});

const messageEditBodySchema = Joi.object({
  phone: Joi.string().pattern(phonePattern).required().messages({
    "string.empty": "Phone number is required",
    "string.pattern.base":
      "Phone number must be a phone number (e.g., 6281234567890) or WhatsApp format (number@s.whatsapp.net)",
    "any.required": "Phone number is required",
  }),
  newText: Joi.string().min(1).max(4096).required().messages({
    "string.empty": "New text is required",
    "string.min": "New text must be at least 1 character long",
    "string.max": "New text must not exceed 4096 characters",
    "any.required": "New text is required",
  }),
});

const messageReadBodySchema = Joi.object({
  phone: Joi.string().pattern(phonePattern).required().messages({
    "string.empty": "Phone number is required",
    "string.pattern.base":
      "Phone number must be a phone number (e.g., 6281234567890) or WhatsApp format (number@s.whatsapp.net)",
    "any.required": "Phone number is required",
  }),
  jid: Joi.string().pattern(phonePattern).required().messages({
    "string.empty": "JID is required",
    "string.pattern.base":
      "JID must be a phone number (e.g., 6281234567890) or WhatsApp format (number@s.whatsapp.net)",
    "any.required": "JID is required",
  }),
  messageKey: Joi.object({
    remoteJid: Joi.string().required(),
    fromMe: Joi.boolean().required(),
    id: Joi.string().required(),
  })
    .required()
    .messages({
      "any.required": "Message key is required",
    }),
});

const messageStarBodySchema = Joi.object({
  phone: Joi.string().pattern(phonePattern).required().messages({
    "string.empty": "Phone number is required",
    "string.pattern.base":
      "Phone number must be a phone number (e.g., 6281234567890) or WhatsApp format (number@s.whatsapp.net)",
    "any.required": "Phone number is required",
  }),
});

const messageUnstarBodySchema = Joi.object({
  phone: Joi.string().pattern(phonePattern).required().messages({
    "string.empty": "Phone number is required",
    "string.pattern.base":
      "Phone number must be a phone number (e.g., 6281234567890) or WhatsApp format (number@s.whatsapp.net)",
    "any.required": "Phone number is required",
  }),
});

// Combined schemas for backward compatibility (deprecated)
const messageDeleteSchema = Joi.object({
  messageId: Joi.string().min(1).max(100).required().messages({
    "string.empty": "Message ID is required",
    "string.min": "Message ID must be at least 1 character long",
    "string.max": "Message ID must not exceed 100 characters",
    "any.required": "Message ID is required",
  }),
  forEveryone: Joi.boolean().default(false).messages({
    "boolean.base": "forEveryone must be a boolean value",
  }),
});

const messageUnsendSchema = Joi.object({
  messageId: Joi.string().min(1).max(100).required().messages({
    "string.empty": "Message ID is required",
    "string.min": "Message ID must be at least 1 character long",
    "string.max": "Message ID must not exceed 100 characters",
    "any.required": "Message ID is required",
  }),
});

const messageReactionSchema = Joi.object({
  messageId: Joi.string().min(1).max(100).required().messages({
    "string.empty": "Message ID is required",
    "string.min": "Message ID must be at least 1 character long",
    "string.max": "Message ID must not exceed 100 characters",
    "any.required": "Message ID is required",
  }),
  emoji: Joi.string().min(1).max(10).required().messages({
    "string.empty": "Emoji is required",
    "string.min": "Emoji must be at least 1 character long",
    "string.max": "Emoji must not exceed 10 characters",
    "any.required": "Emoji is required",
  }),
});

const messageEditSchema = Joi.object({
  messageId: Joi.string().min(1).max(100).required().messages({
    "string.empty": "Message ID is required",
    "string.min": "Message ID must be at least 1 character long",
    "string.max": "Message ID must not exceed 100 characters",
    "any.required": "Message ID is required",
  }),
  newText: Joi.string().min(1).max(4096).required().messages({
    "string.empty": "New text is required",
    "string.min": "New text must be at least 1 character long",
    "string.max": "New text must not exceed 4096 characters",
    "any.required": "New text is required",
  }),
});

const messageReadSchema = Joi.object({
  jid: Joi.string().pattern(phonePattern).required().messages({
    "string.empty": "JID is required",
    "string.pattern.base":
      "JID must be a phone number (e.g., 6281234567890) or WhatsApp format (number@s.whatsapp.net)",
    "any.required": "JID is required",
  }),
  messageKey: Joi.object({
    remoteJid: Joi.string().required(),
    fromMe: Joi.boolean().required(),
    id: Joi.string().required(),
  })
    .required()
    .messages({
      "any.required": "Message key is required",
    }),
});

const messageStarSchema = Joi.object({
  messageId: Joi.string().min(1).max(100).required().messages({
    "string.empty": "Message ID is required",
    "string.min": "Message ID must be at least 1 character long",
    "string.max": "Message ID must not exceed 100 characters",
    "any.required": "Message ID is required",
  }),
});

const messageUnstarSchema = Joi.object({
  messageId: Joi.string().min(1).max(100).required().messages({
    "string.empty": "Message ID is required",
    "string.min": "Message ID must be at least 1 character long",
    "string.max": "Message ID must not exceed 100 characters",
    "any.required": "Message ID is required",
  }),
});

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
export const validateTypingIndicatorMiddleware = createValidationMiddleware(
  typingIndicatorSchema
);
export const validateSendLinkMiddleware =
  createValidationMiddleware(sendLinkSchema);
export const validateSendPollMiddleware =
  createValidationMiddleware(sendPollSchema);

// Message management validation middleware (old format - deprecated)
export const validateMessageDeleteMiddleware =
  createValidationMiddleware(messageDeleteSchema);
export const validateMessageUnsendMiddleware =
  createValidationMiddleware(messageUnsendSchema);
export const validateMessageReactionMiddleware = createValidationMiddleware(
  messageReactionSchema
);
export const validateMessageEditMiddleware =
  createValidationMiddleware(messageEditSchema);
export const validateMessageReadMiddleware =
  createValidationMiddleware(messageReadSchema);
export const validateMessageStarMiddleware =
  createValidationMiddleware(messageStarSchema);
export const validateMessageUnstarMiddleware =
  createValidationMiddleware(messageUnstarSchema);

// New dual validation middleware (URL params + body)
export const validateMessageDeleteParamsAndBodyMiddleware = [
  createValidationMiddleware(messageIdParamsSchema, "params"),
  createValidationMiddleware(messageDeleteBodySchema, "body"),
];
export const validateMessageUnsendParamsAndBodyMiddleware = [
  createValidationMiddleware(messageIdParamsSchema, "params"),
  createValidationMiddleware(messageUnsendBodySchema, "body"),
];
export const validateMessageReactionParamsAndBodyMiddleware = [
  createValidationMiddleware(messageIdParamsSchema, "params"),
  createValidationMiddleware(messageReactionBodySchema, "body"),
];
export const validateMessageEditParamsAndBodyMiddleware = [
  createValidationMiddleware(messageIdParamsSchema, "params"),
  createValidationMiddleware(messageEditBodySchema, "body"),
];
export const validateMessageReadParamsAndBodyMiddleware = [
  createValidationMiddleware(messageIdParamsSchema, "params"),
  createValidationMiddleware(messageReadBodySchema, "body"),
];
export const validateMessageStarParamsAndBodyMiddleware = [
  createValidationMiddleware(messageIdParamsSchema, "params"),
  createValidationMiddleware(messageStarBodySchema, "body"),
];
export const validateMessageUnstarParamsAndBodyMiddleware = [
  createValidationMiddleware(messageIdParamsSchema, "params"),
  createValidationMiddleware(messageUnstarBodySchema, "body"),
];

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
  typingIndicatorSchema,
  sendLinkSchema,
  sendPollSchema,
  // Old combined schemas (deprecated)
  messageDeleteSchema,
  messageUnsendSchema,
  messageReactionSchema,
  messageEditSchema,
  messageReadSchema,
  messageStarSchema,
  messageUnstarSchema,
  // New separated schemas
  messageIdParamsSchema,
  messageDeleteBodySchema,
  messageUnsendBodySchema,
  messageReactionBodySchema,
  messageEditBodySchema,
  messageReadBodySchema,
  messageStarBodySchema,
  messageUnstarBodySchema,
};
