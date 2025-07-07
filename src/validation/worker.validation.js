// Worker Validation - Input validation for worker operations
import { body, param, query } from "express-validator";

/**
 * Validation for worker registration
 */
export const validateWorkerRegistration = [
  body("workerId")
    .notEmpty()
    .withMessage("Worker ID is required")
    .isLength({ min: 3, max: 50 })
    .withMessage("Worker ID must be between 3 and 50 characters")
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage(
      "Worker ID can only contain letters, numbers, hyphens, and underscores"
    ),

  body("endpoint")
    .notEmpty()
    .withMessage("Endpoint is required")
    .isURL({ protocols: ["http", "https"], require_protocol: true })
    .withMessage("Endpoint must be a valid HTTP/HTTPS URL"),

  body("maxSessions")
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage("Max sessions must be between 1 and 1000"),

  body("description")
    .optional()
    .isLength({ max: 255 })
    .withMessage("Description must not exceed 255 characters"),

  body("version")
    .optional()
    .matches(/^\d+\.\d+\.\d+$/)
    .withMessage("Version must be in format x.y.z (e.g., 1.0.0)"),

  body("environment")
    .optional()
    .isIn(["DEVELOPMENT", "STAGING", "TESTING", "PRODUCTION"])
    .withMessage(
      "Environment must be one of: DEVELOPMENT, STAGING, TESTING, PRODUCTION"
    ),
];

/**
 * Validation for enhanced worker heartbeat update - Phase 2 Feature
 * Supports both legacy and enhanced heartbeat formats for backward compatibility
 */
export const validateWorkerHeartbeat = [
  param("workerId")
    .notEmpty()
    .withMessage("Worker ID is required")
    .isLength({ min: 3, max: 50 })
    .withMessage("Worker ID must be between 3 and 50 characters"),

  // Phase 2: Enhanced session data validation
  body("sessions")
    .optional()
    .isArray()
    .withMessage("Sessions must be an array"),

  body("sessions.*.sessionId")
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage("Session ID must be between 1 and 100 characters"),

  body("sessions.*.status")
    .optional()
    .isIn([
      "CONNECTED",
      "DISCONNECTED",
      "QR_REQUIRED",
      "RECONNECTING",
      "INIT",
      "ERROR",
    ])
    .withMessage(
      "Session status must be one of: CONNECTED, DISCONNECTED, QR_REQUIRED, RECONNECTING, INIT, ERROR"
    ),

  body("sessions.*.phoneNumber")
    .optional()
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage("Phone number must be a valid international format"),

  body("sessions.*.lastActivity")
    .optional()
    .isISO8601()
    .withMessage("Last activity must be a valid ISO 8601 timestamp"),

  // Phase 2: Worker capabilities validation
  body("capabilities")
    .optional()
    .isObject()
    .withMessage("Capabilities must be an object"),

  body("capabilities.maxSessions")
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage("Max sessions capability must be between 1 and 1000"),

  body("capabilities.version")
    .optional()
    .matches(/^\d+\.\d+\.\d+$/)
    .withMessage("Version capability must be in format x.y.z (e.g., 1.0.0)"),

  body("capabilities.environment")
    .optional()
    .isIn(["DEVELOPMENT", "STAGING", "TESTING", "PRODUCTION"])
    .withMessage(
      "Environment capability must be one of: DEVELOPMENT, STAGING, TESTING, PRODUCTION"
    ),

  body("capabilities.supportedFeatures")
    .optional()
    .isArray()
    .withMessage("Supported features must be an array"),

  body("capabilities.supportedFeatures.*")
    .optional()
    .isString()
    .withMessage("Each supported feature must be a string"),

  // Enhanced metrics validation (backward compatible)
  body("metrics")
    .optional()
    .isObject()
    .withMessage("Metrics must be an object"),

  // Legacy session breakdown validation (backward compatibility)
  body("metrics.sessions")
    .optional()
    .isObject()
    .withMessage("Session metrics must be an object"),

  body("metrics.sessions.total")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Total sessions must be a non-negative integer"),

  body("metrics.sessions.connected")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Connected sessions must be a non-negative integer"),

  body("metrics.sessions.disconnected")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Disconnected sessions must be a non-negative integer"),

  body("metrics.sessions.qr_required")
    .optional()
    .isInt({ min: 0 })
    .withMessage("QR required sessions must be a non-negative integer"),

  body("metrics.sessions.reconnecting")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Reconnecting sessions must be a non-negative integer"),

  body("metrics.sessions.error")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Error sessions must be a non-negative integer"),

  body("metrics.sessions.maxSessions")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Max sessions must be a positive integer"),

  // Core metrics validation
  body("metrics.sessionCount")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Session count must be a non-negative integer"),

  body("metrics.cpuUsage")
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage("CPU usage must be between 0 and 100"),

  body("metrics.memoryUsage")
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage("Memory usage must be between 0 and 100"),

  body("metrics.uptime")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Uptime must be a non-negative integer"),

  body("metrics.messageCount")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Message count must be a non-negative integer"),

  // Phase 2: Enhanced metrics validation
  body("metrics.totalSessions")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Total sessions must be a non-negative integer"),

  body("metrics.activeSessions")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Active sessions must be a non-negative integer"),

  // Phase 2: Last activity timestamp validation
  body("lastActivity")
    .optional()
    .isISO8601()
    .withMessage("Last activity must be a valid ISO 8601 timestamp"),
];

/**
 * Validation for adding worker manually (admin)
 */
export const validateAddWorker = [
  body("workerId")
    .notEmpty()
    .withMessage("Worker ID is required")
    .isLength({ min: 3, max: 50 })
    .withMessage("Worker ID must be between 3 and 50 characters")
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage(
      "Worker ID can only contain letters, numbers, hyphens, and underscores"
    ),

  body("endpoint")
    .notEmpty()
    .withMessage("Endpoint is required")
    .isURL({ protocols: ["http", "https"], require_protocol: true })
    .withMessage("Endpoint must be a valid HTTP/HTTPS URL"),

  body("maxSessions")
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage("Max sessions must be between 1 and 1000"),

  body("description")
    .optional()
    .isLength({ max: 255 })
    .withMessage("Description must not exceed 255 characters"),

  body("version")
    .optional()
    .matches(/^\d+\.\d+\.\d+$/)
    .withMessage("Version must be in format x.y.z (e.g., 1.0.0)"),

  body("environment")
    .optional()
    .isIn(["DEVELOPMENT", "STAGING", "TESTING", "PRODUCTION"])
    .withMessage(
      "Environment must be one of: DEVELOPMENT, STAGING, TESTING, PRODUCTION"
    ),
];

/**
 * Validation for updating worker configuration
 */
export const validateUpdateWorker = [
  param("workerId")
    .notEmpty()
    .withMessage("Worker ID is required")
    .isLength({ min: 3, max: 50 })
    .withMessage("Worker ID must be between 3 and 50 characters"),

  body("maxSessions")
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage("Max sessions must be between 1 and 1000"),

  body("description")
    .optional()
    .isLength({ max: 255 })
    .withMessage("Description must not exceed 255 characters"),

  body("version")
    .optional()
    .matches(/^\d+\.\d+\.\d+$/)
    .withMessage("Version must be in format x.y.z (e.g., 1.0.0)"),

  body("environment")
    .optional()
    .isIn(["DEVELOPMENT", "STAGING", "TESTING", "PRODUCTION"])
    .withMessage(
      "Environment must be one of: DEVELOPMENT, STAGING, TESTING, PRODUCTION"
    ),
];

/**
 * Validation for worker ID parameter
 */
export const validateWorkerIdParam = [
  param("workerId")
    .notEmpty()
    .withMessage("Worker ID is required")
    .isLength({ min: 3, max: 50 })
    .withMessage("Worker ID must be between 3 and 50 characters"),
];

/**
 * Validation for test worker connectivity
 */
export const validateTestWorkerConnectivity = [
  body("endpoint")
    .notEmpty()
    .withMessage("Endpoint is required")
    .isURL({ protocols: ["http", "https"], require_protocol: true })
    .withMessage("Endpoint must be a valid HTTP/HTTPS URL"),
];

/**
 * Validation for worker filters (query parameters)
 */
export const validateWorkerFilters = [
  query("status")
    .optional()
    .isIn(["ONLINE", "OFFLINE", "MAINTENANCE"])
    .withMessage("Status must be one of: ONLINE, OFFLINE, MAINTENANCE"),

  query("environment")
    .optional()
    .isIn(["DEVELOPMENT", "STAGING", "TESTING", "PRODUCTION"])
    .withMessage(
      "Environment must be one of: DEVELOPMENT, STAGING, TESTING, PRODUCTION"
    ),

  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
];

/**
 * Validation for worker session recovery status
 */
export const validateSessionRecoveryStatus = [
  param("workerId")
    .notEmpty()
    .withMessage("Worker ID is required")
    .isLength({ min: 3, max: 50 })
    .withMessage("Worker ID must be between 3 and 50 characters"),

  body("recoveryResults")
    .isArray()
    .withMessage("Recovery results must be an array"),

  body("recoveryResults.*.sessionId")
    .notEmpty()
    .withMessage("Session ID is required for each recovery result"),

  body("recoveryResults.*.status")
    .isIn(["SUCCESS", "FAILED", "SKIPPED"])
    .withMessage("Recovery status must be one of: SUCCESS, FAILED, SKIPPED"),

  body("recoveryResults.*.error")
    .optional()
    .isString()
    .withMessage("Error must be a string"),

  body("recoveryResults.*.recoveredAt")
    .optional()
    .isISO8601()
    .withMessage("Recovered at must be a valid ISO 8601 date"),

  body("totalSessions")
    .isInt({ min: 0 })
    .withMessage("Total sessions must be a non-negative integer"),

  body("successfulRecoveries")
    .isInt({ min: 0 })
    .withMessage("Successful recoveries must be a non-negative integer"),

  body("failedRecoveries")
    .isInt({ min: 0 })
    .withMessage("Failed recoveries must be a non-negative integer"),
];
