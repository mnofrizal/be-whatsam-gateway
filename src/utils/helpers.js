// Helper utilities for WhatsApp Gateway PaaS Backend
import { HTTP_STATUS, ERROR_CODES, REGEX, VALIDATION } from "./constants.js";

/**
 * Standardized API Response Helper
 */
export class ApiResponse {
  /**
   * Create standardized API response
   * @param {boolean} success - Success status
   * @param {object} data - Response data
   * @param {object} meta - Response metadata
   * @returns {object} - Standardized response
   */
  static createResponse(success, data = null, meta = {}) {
    const response = {
      success,
      timestamp: new Date().toISOString(),
      ...meta,
    };

    if (success) {
      response.data = data;
    } else {
      response.error = data;
    }

    return response;
  }

  /**
   * Create error response
   * @param {string} code - Error code
   * @param {string} message - Error message
   * @param {object} details - Error details
   * @returns {object} - Error response
   */
  static createErrorResponse(code, message, details = {}) {
    return this.createResponse(false, {
      code,
      message,
      details,
    });
  }

  /**
   * Create success response
   * @param {object} data - Response data
   * @param {object} meta - Response metadata
   * @returns {object} - Success response
   */
  static createSuccessResponse(data = null, meta = {}) {
    return this.createResponse(true, data, meta);
  }

  /**
   * Create paginated response
   * @param {Array} items - Array of items
   * @param {number} total - Total count
   * @param {number} limit - Items per page
   * @param {number} offset - Offset
   * @returns {object} - Paginated response
   */
  static createPaginatedResponse(items, total, limit, offset) {
    const pagination = {
      total,
      limit,
      offset,
      count: items.length,
      hasMore: offset + limit < total,
      totalPages: Math.ceil(total / limit),
      currentPage: Math.floor(offset / limit) + 1,
    };

    return this.createSuccessResponse(items, { pagination });
  }

  /**
   * Create validation error response
   * @param {Array} errors - Validation errors
   * @returns {object} - Validation error response
   */
  static createValidationErrorResponse(errors) {
    return this.createErrorResponse(
      ERROR_CODES.VALIDATION_ERROR,
      "Validation failed",
      { errors }
    );
  }

  /**
   * Create rate limit error response
   * @param {string} type - Rate limit type
   * @param {number} limit - Rate limit
   * @param {number} remaining - Remaining requests
   * @param {Date} resetTime - Reset time
   * @returns {object} - Rate limit error response
   */
  static createRateLimitErrorResponse(type, limit, remaining, resetTime) {
    return this.createErrorResponse(
      ERROR_CODES.RATE_LIMIT_EXCEEDED,
      `${type} rate limit exceeded`,
      {
        limit,
        remaining,
        resetTime: resetTime.toISOString(),
      }
    );
  }

  /**
   * Create not found error response
   * @param {string} resource - Resource name
   * @param {string} id - Resource ID
   * @returns {object} - Not found error response
   */
  static createNotFoundResponse(resource, id = null) {
    const message = id
      ? `${resource} with ID '${id}' not found`
      : `${resource} not found`;

    return this.createErrorResponse(
      ERROR_CODES[`${resource.toUpperCase()}_NOT_FOUND`] ||
        ERROR_CODES.NOT_FOUND,
      message
    );
  }

  /**
   * Create unauthorized error response
   * @param {string} message - Error message
   * @returns {object} - Unauthorized error response
   */
  static createUnauthorizedResponse(message = "Authentication required") {
    return this.createErrorResponse(ERROR_CODES.AUTH_TOKEN_MISSING, message);
  }

  /**
   * Create forbidden error response
   * @param {string} message - Error message
   * @returns {object} - Forbidden error response
   */
  static createForbiddenResponse(message = "Access denied") {
    return this.createErrorResponse(
      ERROR_CODES.INSUFFICIENT_PERMISSIONS,
      message
    );
  }
}

/**
 * Validation Helper Functions
 */
export class ValidationHelper {
  /**
   * Validate phone number format
   * @param {string} phone - Phone number to validate
   * @returns {boolean} - Is valid phone number
   */
  static isValidPhoneNumber(phone) {
    return REGEX.PHONE_NUMBER.test(phone);
  }

  /**
   * Validate WhatsApp JID format
   * @param {string} jid - WhatsApp JID to validate
   * @returns {boolean} - Is valid WhatsApp JID
   */
  static isValidWhatsAppJID(jid) {
    return REGEX.WHATSAPP_JID.test(jid);
  }

  /**
   * Validate UUID format
   * @param {string} uuid - UUID to validate
   * @returns {boolean} - Is valid UUID
   */
  static isValidUUID(uuid) {
    return REGEX.UUID.test(uuid);
  }

  /**
   * Validate API key format
   * @param {string} apiKey - API key to validate
   * @returns {boolean} - Is valid API key
   */
  static isValidApiKey(apiKey) {
    return REGEX.API_KEY.test(apiKey);
  }

  /**
   * Validate session ID format
   * @param {string} sessionId - Session ID to validate
   * @returns {boolean} - Is valid session ID
   */
  static isValidSessionId(sessionId) {
    return REGEX.SESSION_ID.test(sessionId);
  }

  /**
   * Validate URL format
   * @param {string} url - URL to validate
   * @returns {boolean} - Is valid URL
   */
  static isValidURL(url) {
    return REGEX.URL.test(url);
  }

  /**
   * Sanitize string input
   * @param {string} input - Input to sanitize
   * @param {number} maxLength - Maximum length
   * @returns {string} - Sanitized input
   */
  static sanitizeString(input, maxLength = 255) {
    if (typeof input !== "string") return "";
    return input.trim().substring(0, maxLength);
  }

  /**
   * Validate pagination parameters
   * @param {number} limit - Limit parameter
   * @param {number} offset - Offset parameter
   * @returns {object} - Validated pagination parameters
   */
  static validatePagination(limit, offset) {
    const validatedLimit = Math.min(
      Math.max(parseInt(limit) || VALIDATION.PAGINATION.DEFAULT_LIMIT, 1),
      VALIDATION.PAGINATION.MAX_LIMIT
    );

    const validatedOffset = Math.max(
      parseInt(offset) || VALIDATION.PAGINATION.DEFAULT_OFFSET,
      0
    );

    return {
      limit: validatedLimit,
      offset: validatedOffset,
    };
  }
}

/**
 * Utility Helper Functions
 */
export class UtilHelper {
  /**
   * Generate random string
   * @param {number} length - String length
   * @param {string} charset - Character set
   * @returns {string} - Random string
   */
  static generateRandomString(
    length = 32,
    charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  ) {
    let result = "";
    for (let i = 0; i < length; i++) {
      result += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return result;
  }

  /**
   * Generate API key
   * @returns {string} - Generated API key
   */
  static generateApiKey() {
    return `wg_${this.generateRandomString(32)}`;
  }

  /**
   * Generate session ID
   * @param {string} userId - User ID
   * @param {string} suffix - Optional suffix
   * @returns {string} - Generated session ID
   */
  static generateSessionId(userId, suffix = null) {
    const timestamp = Date.now().toString(36);
    const random = this.generateRandomString(8);
    const baseName = suffix || "session";
    return `${userId}-${baseName}-${timestamp}-${random}`;
  }

  /**
   * Format phone number to WhatsApp JID
   * @param {string} phoneNumber - Phone number
   * @returns {string} - WhatsApp JID
   */
  static formatToWhatsAppJID(phoneNumber) {
    // Remove all non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, "");

    // Add country code if missing (assume +62 for Indonesia if starts with 0)
    let formatted = cleaned;
    if (formatted.startsWith("0")) {
      formatted = "62" + formatted.substring(1);
    } else if (!formatted.startsWith("62")) {
      formatted = "62" + formatted;
    }

    return `${formatted}@s.whatsapp.net`;
  }

  /**
   * Format phone number for display
   * @param {string} phoneNumber - Phone number
   * @returns {string} - Formatted phone number
   */
  static formatPhoneNumber(phoneNumber) {
    const cleaned = phoneNumber.replace(/\D/g, "");

    if (cleaned.startsWith("62")) {
      return `+${cleaned}`;
    } else if (cleaned.startsWith("0")) {
      return `+62${cleaned.substring(1)}`;
    }

    return `+${cleaned}`;
  }

  /**
   * Sleep/delay function
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise} - Promise that resolves after delay
   */
  static sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Retry function with exponential backoff
   * @param {Function} fn - Function to retry
   * @param {number} maxRetries - Maximum retry attempts
   * @param {number} baseDelay - Base delay in milliseconds
   * @returns {Promise} - Promise that resolves with function result
   */
  static async retry(fn, maxRetries = 3, baseDelay = 1000) {
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        if (attempt === maxRetries) {
          throw lastError;
        }

        const delay = baseDelay * Math.pow(2, attempt);
        await this.sleep(delay);
      }
    }
  }

  /**
   * Deep clone object
   * @param {object} obj - Object to clone
   * @returns {object} - Cloned object
   */
  static deepClone(obj) {
    if (obj === null || typeof obj !== "object") return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map((item) => this.deepClone(item));
    if (typeof obj === "object") {
      const cloned = {};
      Object.keys(obj).forEach((key) => {
        cloned[key] = this.deepClone(obj[key]);
      });
      return cloned;
    }
  }

  /**
   * Mask sensitive data
   * @param {string} data - Data to mask
   * @param {number} visibleChars - Number of visible characters at start/end
   * @returns {string} - Masked data
   */
  static maskSensitiveData(data, visibleChars = 4) {
    if (!data || data.length <= visibleChars * 2) {
      return "*".repeat(data?.length || 8);
    }

    const start = data.substring(0, visibleChars);
    const end = data.substring(data.length - visibleChars);
    const middle = "*".repeat(Math.max(data.length - visibleChars * 2, 4));

    return `${start}${middle}${end}`;
  }

  /**
   * Calculate uptime from timestamp
   * @param {Date} startTime - Start timestamp
   * @returns {string} - Human readable uptime
   */
  static calculateUptime(startTime) {
    const now = new Date();
    const diff = now - startTime;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Format file size
   * @param {number} bytes - File size in bytes
   * @returns {string} - Formatted file size
   */
  static formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  /**
   * Check if object is empty
   * @param {object} obj - Object to check
   * @returns {boolean} - Is empty object
   */
  static isEmpty(obj) {
    if (obj == null) return true;
    if (Array.isArray(obj) || typeof obj === "string") return obj.length === 0;
    if (typeof obj === "object") return Object.keys(obj).length === 0;
    return false;
  }

  /**
   * Debounce function
   * @param {Function} func - Function to debounce
   * @param {number} wait - Wait time in milliseconds
   * @returns {Function} - Debounced function
   */
  static debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Throttle function
   * @param {Function} func - Function to throttle
   * @param {number} limit - Time limit in milliseconds
   * @returns {Function} - Throttled function
   */
  static throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }
}

// Export all helpers
export default {
  ApiResponse,
  ValidationHelper,
  UtilHelper,
};
