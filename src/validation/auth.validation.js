// Authentication Validation - Joi schemas for auth operations
import Joi from "joi";
import { ValidationError } from "../middleware/error-handler.js";
import { createValidationMiddleware } from "../utils/helpers.js";

// User registration validation schema
const registerSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .pattern(/^[a-zA-Z\s\-'\.]+$/)
    .required()
    .messages({
      "string.empty": "Name is required",
      "string.min": "Name must be at least 2 characters long",
      "string.max": "Name must not exceed 100 characters",
      "string.pattern.base":
        "Name can only contain letters, spaces, hyphens, apostrophes, and periods",
      "any.required": "Name is required",
    }),

  email: Joi.string()
    .email({ tlds: { allow: false } })
    .lowercase()
    .trim()
    .max(254)
    .required()
    .messages({
      "string.empty": "Email is required",
      "string.email": "Email format is invalid",
      "string.max": "Email must not exceed 254 characters",
      "any.required": "Email is required",
    }),

  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).*$/
    )
    .invalid(
      "password",
      "password123",
      "123456",
      "123456789",
      "qwerty",
      "abc123",
      "password1",
      "admin",
      "letmein",
      "welcome"
    )
    .required()
    .messages({
      "string.empty": "Password is required",
      "string.min": "Password must be at least 8 characters long",
      "string.max": "Password must not exceed 128 characters",
      "string.pattern.base":
        "Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character",
      "any.invalid": "Password is too common and easily guessable",
      "any.required": "Password is required",
    }),
});

// User login validation schema
const loginSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .lowercase()
    .trim()
    .required()
    .messages({
      "string.empty": "Email is required",
      "string.email": "Email format is invalid",
      "any.required": "Email is required",
    }),

  password: Joi.string().required().messages({
    "string.empty": "Password is required",
    "any.required": "Password is required",
  }),
});

// Change password validation schema
const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    "string.empty": "Current password is required",
    "any.required": "Current password is required",
  }),

  newPassword: Joi.string()
    .min(8)
    .max(128)
    .pattern(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).*$/
    )
    .invalid(
      "password",
      "password123",
      "123456",
      "123456789",
      "qwerty",
      "abc123",
      "password1",
      "admin",
      "letmein",
      "welcome"
    )
    .invalid(Joi.ref("currentPassword"))
    .required()
    .messages({
      "string.empty": "New password is required",
      "string.min": "New password must be at least 8 characters long",
      "string.max": "New password must not exceed 128 characters",
      "string.pattern.base":
        "New password must contain at least one lowercase letter, one uppercase letter, one number, and one special character",
      "any.invalid":
        "New password cannot be the same as current password or a common password",
      "any.required": "New password is required",
    }),
});

// Refresh token validation schema
const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string()
    .pattern(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/)
    .required()
    .messages({
      "string.empty": "Refresh token is required",
      "string.pattern.base": "Invalid refresh token format",
      "any.required": "Refresh token is required",
    }),
});

// Email validation schema (for forgot password, etc.)
const emailSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .lowercase()
    .trim()
    .required()
    .messages({
      "string.empty": "Email is required",
      "string.email": "Email format is invalid",
      "any.required": "Email is required",
    }),
});

// Reset password validation schema
const resetPasswordSchema = Joi.object({
  token: Joi.string()
    .pattern(/^[A-Za-z0-9_-]+$/)
    .min(32)
    .max(128)
    .required()
    .messages({
      "string.empty": "Reset token is required",
      "string.pattern.base": "Invalid reset token format",
      "string.min": "Reset token must be at least 32 characters long",
      "string.max": "Reset token must not exceed 128 characters",
      "any.required": "Reset token is required",
    }),

  newPassword: Joi.string()
    .min(8)
    .max(128)
    .pattern(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).*$/
    )
    .invalid(
      "password",
      "password123",
      "123456",
      "123456789",
      "qwerty",
      "abc123",
      "password1",
      "admin",
      "letmein",
      "welcome"
    )
    .required()
    .messages({
      "string.empty": "New password is required",
      "string.min": "New password must be at least 8 characters long",
      "string.max": "New password must not exceed 128 characters",
      "string.pattern.base":
        "New password must contain at least one lowercase letter, one uppercase letter, one number, and one special character",
      "any.invalid": "New password is too common and easily guessable",
      "any.required": "New password is required",
    }),
});

// API key validation schema
const apiKeySchema = Joi.object({
  apiKey: Joi.string()
    .pattern(/^[A-Za-z0-9_-]+$/)
    .min(32)
    .max(128)
    .required()
    .messages({
      "string.empty": "API key is required",
      "string.pattern.base": "API key format is invalid",
      "string.min": "API key must be at least 32 characters long",
      "string.max": "API key must not exceed 128 characters",
      "any.required": "API key is required",
    }),
});

// User ID validation schema
const userIdSchema = Joi.object({
  userId: Joi.string().uuid().required().messages({
    "string.empty": "User ID is required",
    "string.guid": "User ID must be a valid UUID",
    "any.required": "User ID is required",
  }),
});

/**
 * Validate user registration input
 * @param {object} data - Registration data
 * @returns {object} - Validated and sanitized data
 * @throws {ValidationError} - If validation fails
 */
export const validateRegisterInput = (data) => {
  const { error, value } = registerSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errorMessages = error.details.map((detail) => detail.message);
    throw new ValidationError(`Validation failed: ${errorMessages.join(", ")}`);
  }

  return value;
};

/**
 * Validate user login input
 * @param {object} data - Login data
 * @returns {object} - Validated and sanitized data
 * @throws {ValidationError} - If validation fails
 */
export const validateLoginInput = (data) => {
  const { error, value } = loginSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errorMessages = error.details.map((detail) => detail.message);
    throw new ValidationError(`Validation failed: ${errorMessages.join(", ")}`);
  }

  return value;
};

/**
 * Validate change password input
 * @param {object} data - Change password data
 * @returns {object} - Validated and sanitized data
 * @throws {ValidationError} - If validation fails
 */
export const validateChangePasswordInput = (data) => {
  const { error, value } = changePasswordSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errorMessages = error.details.map((detail) => detail.message);
    throw new ValidationError(`Validation failed: ${errorMessages.join(", ")}`);
  }

  return value;
};

/**
 * Validate refresh token input
 * @param {object} data - Refresh token data
 * @returns {object} - Validated and sanitized data
 * @throws {ValidationError} - If validation fails
 */
export const validateRefreshTokenInput = (data) => {
  const { error, value } = refreshTokenSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errorMessages = error.details.map((detail) => detail.message);
    throw new ValidationError(`Validation failed: ${errorMessages.join(", ")}`);
  }

  return value;
};

/**
 * Validate email input (for forgot password, etc.)
 * @param {object} data - Email data
 * @returns {object} - Validated and sanitized data
 * @throws {ValidationError} - If validation fails
 */
export const validateEmailInput = (data) => {
  const { error, value } = emailSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errorMessages = error.details.map((detail) => detail.message);
    throw new ValidationError(`Validation failed: ${errorMessages.join(", ")}`);
  }

  return value;
};

/**
 * Validate reset password input
 * @param {object} data - Reset password data
 * @returns {object} - Validated and sanitized data
 * @throws {ValidationError} - If validation fails
 */
export const validateResetPasswordInput = (data) => {
  const { error, value } = resetPasswordSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errorMessages = error.details.map((detail) => detail.message);
    throw new ValidationError(`Validation failed: ${errorMessages.join(", ")}`);
  }

  return value;
};

/**
 * Validate email format only
 * @param {string} email - Email to validate
 * @returns {string} - Validated and normalized email
 * @throws {ValidationError} - If validation fails
 */
export const validateEmail = (email) => {
  const emailSchema = Joi.string()
    .email({ tlds: { allow: false } })
    .lowercase()
    .trim()
    .required();

  const { error, value } = emailSchema.validate(email);

  if (error) {
    throw new ValidationError(
      `Invalid email format: ${error.details[0].message}`
    );
  }

  return value;
};

/**
 * Validate password strength only
 * @param {string} password - Password to validate
 * @returns {string} - Validated password
 * @throws {ValidationError} - If validation fails
 */
export const validatePassword = (password) => {
  const passwordSchema = Joi.string()
    .min(8)
    .max(128)
    .pattern(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).*$/
    )
    .invalid(
      "password",
      "password123",
      "123456",
      "123456789",
      "qwerty",
      "abc123",
      "password1",
      "admin",
      "letmein",
      "welcome"
    )
    .required();

  const { error, value } = passwordSchema.validate(password);

  if (error) {
    throw new ValidationError(`Invalid password: ${error.details[0].message}`);
  }

  return value;
};

// Export validation middleware for all auth operations
export const validateRegisterMiddleware =
  createValidationMiddleware(registerSchema);
export const validateLoginMiddleware = createValidationMiddleware(loginSchema);
export const validateChangePasswordMiddleware =
  createValidationMiddleware(changePasswordSchema);
export const validateRefreshTokenMiddleware =
  createValidationMiddleware(refreshTokenSchema);
export const validateEmailMiddleware = createValidationMiddleware(emailSchema);
export const validateResetPasswordMiddleware =
  createValidationMiddleware(resetPasswordSchema);

// Export schemas for direct use if needed
export {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  refreshTokenSchema,
  emailSchema,
  resetPasswordSchema,
  apiKeySchema,
  userIdSchema,
};
