// API Validation - External API endpoint validation
import { body, param } from "express-validator";

// Validation for sendText endpoint
export const validateSendText = [
  body("to")
    .matches(/^([0-9]+(@[a-z.]+)?|[0-9]+@[a-z.]+)$/)
    .withMessage(
      "Recipient must be a phone number (e.g., 6281234567890) or WhatsApp format (number@s.whatsapp.net)"
    ),
  body("message")
    .isLength({ min: 1, max: 4096 })
    .withMessage(
      "Message is required and must be between 1 and 4096 characters"
    ),
];

// Validation for sendImage endpoint
export const validateSendImage = [
  body("to")
    .matches(/^([0-9]+(@[a-z.]+)?|[0-9]+@[a-z.]+)$/)
    .withMessage(
      "Recipient must be a phone number (e.g., 6281234567890) or WhatsApp format (number@s.whatsapp.net)"
    ),
  body("imageUrl")
    .isURL({ protocols: ["http", "https"] })
    .withMessage("Image URL must be a valid HTTP/HTTPS URL"),
  body("caption")
    .optional()
    .isLength({ max: 1024 })
    .withMessage("Caption must be less than 1024 characters"),
];

// Validation for sendFile endpoint
export const validateSendFile = [
  body("to")
    .matches(/^([0-9]+(@[a-z.]+)?|[0-9]+@[a-z.]+)$/)
    .withMessage(
      "Recipient must be a phone number (e.g., 6281234567890) or WhatsApp format (number@s.whatsapp.net)"
    ),
  body("fileUrl")
    .isURL({ protocols: ["http", "https"] })
    .withMessage("File URL must be a valid HTTP/HTTPS URL"),
  body("filename")
    .optional()
    .isLength({ min: 1, max: 255 })
    .withMessage("Filename must be between 1 and 255 characters"),
  body("caption")
    .optional()
    .isLength({ max: 1024 })
    .withMessage("Caption must be less than 1024 characters"),
];

// Validation for sendVoice endpoint
export const validateSendVoice = [
  body("to")
    .matches(/^([0-9]+(@[a-z.]+)?|[0-9]+@[a-z.]+)$/)
    .withMessage(
      "Recipient must be a phone number (e.g., 6281234567890) or WhatsApp format (number@s.whatsapp.net)"
    ),
  body("audioUrl")
    .isURL({ protocols: ["http", "https"] })
    .withMessage("Audio URL must be a valid HTTP/HTTPS URL"),
];

// Validation for sendVideo endpoint
export const validateSendVideo = [
  body("to")
    .matches(/^([0-9]+(@[a-z.]+)?|[0-9]+@[a-z.]+)$/)
    .withMessage(
      "Recipient must be a phone number (e.g., 6281234567890) or WhatsApp format (number@s.whatsapp.net)"
    ),
  body("videoUrl")
    .isURL({ protocols: ["http", "https"] })
    .withMessage("Video URL must be a valid HTTP/HTTPS URL"),
  body("caption")
    .optional()
    .isLength({ max: 1024 })
    .withMessage("Caption must be less than 1024 characters"),
];

// Validation for sendLocation endpoint
export const validateSendLocation = [
  body("to")
    .matches(/^([0-9]+(@[a-z.]+)?|[0-9]+@[a-z.]+)$/)
    .withMessage(
      "Recipient must be a phone number (e.g., 6281234567890) or WhatsApp format (number@s.whatsapp.net)"
    ),
  body("latitude")
    .isFloat({ min: -90, max: 90 })
    .withMessage("Latitude must be a number between -90 and 90"),
  body("longitude")
    .isFloat({ min: -180, max: 180 })
    .withMessage("Longitude must be a number between -180 and 180"),
  body("name")
    .optional()
    .isLength({ min: 1, max: 255 })
    .withMessage("Location name must be between 1 and 255 characters"),
  body("address")
    .optional()
    .isLength({ min: 1, max: 500 })
    .withMessage("Address must be between 1 and 500 characters"),
];

// Validation for sendSeen endpoint
export const validateSendSeen = [
  body("messageId")
    .isLength({ min: 1, max: 100 })
    .withMessage(
      "Message ID is required and must be between 1 and 100 characters"
    ),
];

// Validation for session status endpoint (no sessionId param needed since it comes from API key)
export const validateSessionParam = [
  // No validation needed - sessionId comes from authenticated API key
];
