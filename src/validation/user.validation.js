// User validation schemas and functions using Joi
import Joi from "joi";
import { createValidationMiddleware } from "../utils/helpers.js";

// User profile update schema
export const updateProfileSchema = Joi.object({
  name: Joi.string().min(2).max(100).trim().optional(),
  email: Joi.string().email().max(255).optional(),
  currentPassword: Joi.string().when("newPassword", {
    is: Joi.exist(),
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  newPassword: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-zA-Z])(?=.*\d)/)
    .optional()
    .messages({
      "string.pattern.base":
        "Password must contain at least one letter and one number",
    }),
});

// Deactivate account schema
export const deactivateAccountSchema = Joi.object({
  password: Joi.string().required().messages({
    "any.required": "Password confirmation is required",
  }),
});

// Usage query schema
export const usageQuerySchema = Joi.object({
  period: Joi.string().valid("24h", "7d", "30d").default("24h"),
  sessionId: Joi.string().optional(),
});

// Sessions query schema
export const sessionsQuerySchema = Joi.object({
  status: Joi.string()
    .valid(
      "INIT",
      "QR_REQUIRED",
      "CONNECTED",
      "DISCONNECTED",
      "RECONNECTING",
      "ERROR"
    )
    .optional(),
  limit: Joi.number().integer().min(1).max(100).default(10),
  offset: Joi.number().integer().min(0).default(0),
});

// Validation functions
export const validateUpdateProfileInput = (data) => {
  const { error, value } = updateProfileSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const validationErrors = error.details.map((detail) => ({
      field: detail.path.join("."),
      message: detail.message,
    }));
    throw new Error(JSON.stringify(validationErrors));
  }

  return value;
};

export const validateDeactivateAccountInput = (data) => {
  const { error, value } = deactivateAccountSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const validationErrors = error.details.map((detail) => ({
      field: detail.path.join("."),
      message: detail.message,
    }));
    throw new Error(JSON.stringify(validationErrors));
  }

  return value;
};

export const validateUsageQueryInput = (data) => {
  const { error, value } = usageQuerySchema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const validationErrors = error.details.map((detail) => ({
      field: detail.path.join("."),
      message: detail.message,
    }));
    throw new Error(JSON.stringify(validationErrors));
  }

  return value;
};

export const validateSessionsQueryInput = (data) => {
  const { error, value } = sessionsQuerySchema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const validationErrors = error.details.map((detail) => ({
      field: detail.path.join("."),
      message: detail.message,
    }));
    throw new Error(JSON.stringify(validationErrors));
  }

  return value;
};

// Export middleware functions
export const validateUpdateProfileMiddleware =
  createValidationMiddleware(updateProfileSchema);
export const validateDeactivateAccountMiddleware = createValidationMiddleware(
  deactivateAccountSchema
);
export const validateUsageQueryMiddleware =
  createValidationMiddleware(usageQuerySchema);
export const validateSessionsQueryMiddleware =
  createValidationMiddleware(sessionsQuerySchema);
