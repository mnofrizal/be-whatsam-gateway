// Worker Validation - Input validation for worker operations
import Joi from "joi";
import { createValidationMiddleware } from "../utils/helpers.js";

/**
 * Joi schema for worker registration
 */
const workerRegistrationSchema = Joi.object({
  workerId: Joi.string()
    .min(3)
    .max(50)
    .pattern(/^[a-zA-Z0-9_-]+$/)
    .required()
    .messages({
      "string.min": "Worker ID must be at least 3 characters long",
      "string.max": "Worker ID must not exceed 50 characters",
      "string.pattern.base":
        "Worker ID can only contain letters, numbers, hyphens, and underscores",
      "any.required": "Worker ID is required",
    }),

  endpoint: Joi.string()
    .uri({ scheme: ["http", "https"] })
    .required()
    .messages({
      "string.uri": "Endpoint must be a valid HTTP/HTTPS URL",
      "any.required": "Endpoint is required",
    }),

  maxSessions: Joi.number().integer().min(1).max(1000).optional().messages({
    "number.min": "Max sessions must be at least 1",
    "number.max": "Max sessions must not exceed 1000",
    "number.integer": "Max sessions must be an integer",
  }),

  description: Joi.string().max(255).optional().messages({
    "string.max": "Description must not exceed 255 characters",
  }),

  version: Joi.string()
    .pattern(/^\d+\.\d+\.\d+$/)
    .optional()
    .messages({
      "string.pattern.base": "Version must be in format x.y.z (e.g., 1.0.0)",
    }),

  environment: Joi.string()
    .valid("DEVELOPMENT", "STAGING", "TESTING", "PRODUCTION")
    .optional()
    .messages({
      "any.only":
        "Environment must be one of: DEVELOPMENT, STAGING, TESTING, PRODUCTION",
    }),
});

/**
 * Joi schema for enhanced worker heartbeat update
 */
const workerHeartbeatSchema = Joi.object({
  sessions: Joi.array()
    .items(
      Joi.object({
        sessionId: Joi.string().min(1).max(100).required().messages({
          "string.min": "Session ID must be at least 1 character long",
          "string.max": "Session ID must not exceed 100 characters",
          "any.required": "Session ID is required for each session",
        }),

        status: Joi.string()
          .valid(
            "CONNECTED",
            "DISCONNECTED",
            "QR_REQUIRED",
            "RECONNECTING",
            "INIT",
            "ERROR"
          )
          .required()
          .messages({
            "any.only":
              "Session status must be one of: CONNECTED, DISCONNECTED, QR_REQUIRED, RECONNECTING, INIT, ERROR",
            "any.required": "Session status is required",
          }),

        phoneNumber: Joi.string()
          .pattern(/^\+?[1-9]\d{1,14}$/)
          .optional()
          .messages({
            "string.pattern.base":
              "Phone number must be a valid international format",
          }),

        lastActivity: Joi.date().iso().optional().messages({
          "date.format": "Last activity must be a valid ISO 8601 timestamp",
        }),
      })
    )
    .required()
    .messages({
      "array.base": "Sessions must be an array",
      "any.required": "Sessions array is required for enhanced heartbeat",
    }),

  capabilities: Joi.object({
    maxSessions: Joi.number().integer().min(1).max(1000).optional().messages({
      "number.min": "Max sessions capability must be at least 1",
      "number.max": "Max sessions capability must not exceed 1000",
      "number.integer": "Max sessions capability must be an integer",
    }),

    version: Joi.string()
      .pattern(/^\d+\.\d+\.\d+$/)
      .optional()
      .messages({
        "string.pattern.base":
          "Version capability must be in format x.y.z (e.g., 1.0.0)",
      }),

    environment: Joi.string()
      .valid("DEVELOPMENT", "STAGING", "TESTING", "PRODUCTION")
      .optional()
      .messages({
        "any.only":
          "Environment capability must be one of: DEVELOPMENT, STAGING, TESTING, PRODUCTION",
      }),

    supportedFeatures: Joi.array().items(Joi.string()).optional().messages({
      "array.base": "Supported features must be an array",
      "string.base": "Each supported feature must be a string",
    }),
  }).optional(),

  metrics: Joi.object({
    cpuUsage: Joi.number().min(0).max(100).optional().messages({
      "number.min": "CPU usage must be at least 0",
      "number.max": "CPU usage must not exceed 100",
    }),

    memoryUsage: Joi.number().min(0).max(100).optional().messages({
      "number.min": "Memory usage must be at least 0",
      "number.max": "Memory usage must not exceed 100",
    }),

    uptime: Joi.number().integer().min(0).optional().messages({
      "number.min": "Uptime must be a non-negative integer",
      "number.integer": "Uptime must be an integer",
    }),

    messageCount: Joi.number().integer().min(0).optional().messages({
      "number.min": "Message count must be a non-negative integer",
      "number.integer": "Message count must be an integer",
    }),

    totalSessions: Joi.number().integer().min(0).optional().messages({
      "number.min": "Total sessions must be a non-negative integer",
      "number.integer": "Total sessions must be an integer",
    }),

    activeSessions: Joi.number().integer().min(0).optional().messages({
      "number.min": "Active sessions must be a non-negative integer",
      "number.integer": "Active sessions must be an integer",
    }),
  }).optional(),

  lastActivity: Joi.date().iso().optional().messages({
    "date.format": "Last activity must be a valid ISO 8601 timestamp",
  }),
});

/**
 * Joi schema for worker ID parameter
 */
const workerIdParamSchema = Joi.object({
  workerId: Joi.string().min(3).max(50).required().messages({
    "string.min": "Worker ID must be at least 3 characters long",
    "string.max": "Worker ID must not exceed 50 characters",
    "any.required": "Worker ID is required",
  }),
});

/**
 * Joi schema for updating worker configuration
 */
const updateWorkerSchema = Joi.object({
  maxSessions: Joi.number().integer().min(1).max(1000).optional().messages({
    "number.min": "Max sessions must be at least 1",
    "number.max": "Max sessions must not exceed 1000",
    "number.integer": "Max sessions must be an integer",
  }),

  description: Joi.string().max(255).optional().messages({
    "string.max": "Description must not exceed 255 characters",
  }),

  version: Joi.string()
    .pattern(/^\d+\.\d+\.\d+$/)
    .optional()
    .messages({
      "string.pattern.base": "Version must be in format x.y.z (e.g., 1.0.0)",
    }),

  environment: Joi.string()
    .valid("DEVELOPMENT", "STAGING", "TESTING", "PRODUCTION")
    .optional()
    .messages({
      "any.only":
        "Environment must be one of: DEVELOPMENT, STAGING, TESTING, PRODUCTION",
    }),
});

/**
 * Joi schema for test worker connectivity
 */
const testWorkerConnectivitySchema = Joi.object({
  endpoint: Joi.string()
    .uri({ scheme: ["http", "https"] })
    .required()
    .messages({
      "string.uri": "Endpoint must be a valid HTTP/HTTPS URL",
      "any.required": "Endpoint is required",
    }),
});

/**
 * Joi schema for worker filters (query parameters)
 */
const workerFiltersSchema = Joi.object({
  status: Joi.string()
    .valid("ONLINE", "OFFLINE", "MAINTENANCE")
    .optional()
    .messages({
      "any.only": "Status must be one of: ONLINE, OFFLINE, MAINTENANCE",
    }),

  environment: Joi.string()
    .valid("DEVELOPMENT", "STAGING", "TESTING", "PRODUCTION")
    .optional()
    .messages({
      "any.only":
        "Environment must be one of: DEVELOPMENT, STAGING, TESTING, PRODUCTION",
    }),

  page: Joi.number().integer().min(1).optional().messages({
    "number.min": "Page must be a positive integer",
    "number.integer": "Page must be an integer",
  }),

  limit: Joi.number().integer().min(1).max(100).optional().messages({
    "number.min": "Limit must be at least 1",
    "number.max": "Limit must not exceed 100",
    "number.integer": "Limit must be an integer",
  }),
});

/**
 * Joi schema for worker session recovery status
 */
const sessionRecoveryStatusSchema = Joi.object({
  recoveryResults: Joi.array()
    .items(
      Joi.object({
        sessionId: Joi.string().required().messages({
          "any.required": "Session ID is required for each recovery result",
        }),

        status: Joi.string()
          .valid("SUCCESS", "FAILED", "SKIPPED")
          .required()
          .messages({
            "any.only":
              "Recovery status must be one of: SUCCESS, FAILED, SKIPPED",
            "any.required": "Recovery status is required",
          }),

        error: Joi.string().optional().messages({
          "string.base": "Error must be a string",
        }),

        recoveredAt: Joi.date().iso().optional().messages({
          "date.format": "Recovered at must be a valid ISO 8601 date",
        }),
      })
    )
    .required()
    .messages({
      "array.base": "Recovery results must be an array",
      "any.required": "Recovery results are required",
    }),

  totalSessions: Joi.number().integer().min(0).required().messages({
    "number.min": "Total sessions must be a non-negative integer",
    "number.integer": "Total sessions must be an integer",
    "any.required": "Total sessions is required",
  }),

  successfulRecoveries: Joi.number().integer().min(0).required().messages({
    "number.min": "Successful recoveries must be a non-negative integer",
    "number.integer": "Successful recoveries must be an integer",
    "any.required": "Successful recoveries is required",
  }),

  failedRecoveries: Joi.number().integer().min(0).required().messages({
    "number.min": "Failed recoveries must be a non-negative integer",
    "number.integer": "Failed recoveries must be an integer",
    "any.required": "Failed recoveries is required",
  }),
});

// Export validation middleware
export const validateWorkerRegistration = createValidationMiddleware(
  workerRegistrationSchema,
  "body"
);
export const validateWorkerHeartbeat = [
  createValidationMiddleware(workerIdParamSchema, "params"),
  createValidationMiddleware(workerHeartbeatSchema, "body"),
];
export const validateAddWorker = createValidationMiddleware(
  workerRegistrationSchema,
  "body"
);
export const validateUpdateWorker = [
  createValidationMiddleware(workerIdParamSchema, "params"),
  createValidationMiddleware(updateWorkerSchema, "body"),
];
export const validateWorkerIdParam = createValidationMiddleware(
  workerIdParamSchema,
  "params"
);
export const validateTestWorkerConnectivity = createValidationMiddleware(
  testWorkerConnectivitySchema,
  "body"
);
export const validateWorkerFilters = createValidationMiddleware(
  workerFiltersSchema,
  "query"
);
export const validateSessionRecoveryStatus = [
  createValidationMiddleware(workerIdParamSchema, "params"),
  createValidationMiddleware(sessionRecoveryStatusSchema, "body"),
];
