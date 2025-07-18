// Constants for WhatsApp Gateway PaaS Backend
export const HTTP_STATUS = {
  // Success
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,

  // Client Errors
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,

  // Server Errors
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
};

export const ERROR_CODES = {
  // Authentication & Authorization
  AUTH_TOKEN_MISSING: "AUTH_TOKEN_MISSING",
  AUTH_TOKEN_INVALID: "AUTH_TOKEN_INVALID",
  AUTH_TOKEN_EXPIRED: "AUTH_TOKEN_EXPIRED",
  API_KEY_MISSING: "API_KEY_MISSING",
  API_KEY_INVALID: "API_KEY_INVALID",
  API_KEY_EXPIRED: "API_KEY_EXPIRED",
  API_KEY_INACTIVE: "API_KEY_INACTIVE",
  INSUFFICIENT_PERMISSIONS: "INSUFFICIENT_PERMISSIONS",
  ACCOUNT_DEACTIVATED: "ACCOUNT_DEACTIVATED",

  // User Management
  USER_NOT_FOUND: "USER_NOT_FOUND",
  USER_ALREADY_EXISTS: "USER_ALREADY_EXISTS",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  EMAIL_ALREADY_REGISTERED: "EMAIL_ALREADY_REGISTERED",
  WEAK_PASSWORD: "WEAK_PASSWORD",

  // Session Management
  SESSION_NOT_FOUND: "SESSION_NOT_FOUND",
  SESSION_ALREADY_EXISTS: "SESSION_ALREADY_EXISTS",
  SESSION_LIMIT_EXCEEDED: "SESSION_LIMIT_EXCEEDED",
  SESSION_NOT_CONNECTED: "SESSION_NOT_CONNECTED",
  SESSION_CREATION_FAILED: "SESSION_CREATION_FAILED",
  SESSION_ACCESS_DENIED: "SESSION_ACCESS_DENIED",
  QR_CODE_EXPIRED: "QR_CODE_EXPIRED",
  QR_CODE_NOT_READY: "QR_CODE_NOT_READY",

  // Worker Management
  WORKER_NOT_FOUND: "WORKER_NOT_FOUND",
  WORKER_OFFLINE: "WORKER_OFFLINE",
  WORKER_OVERLOADED: "WORKER_OVERLOADED",
  NO_AVAILABLE_WORKERS: "NO_AVAILABLE_WORKERS",
  WORKER_COMMUNICATION_FAILED: "WORKER_COMMUNICATION_FAILED",
  WORKER_REGISTRATION_FAILED: "WORKER_REGISTRATION_FAILED",

  // Message Management
  MESSAGE_SEND_FAILED: "MESSAGE_SEND_FAILED",
  MESSAGE_NOT_FOUND: "MESSAGE_NOT_FOUND",
  INVALID_MESSAGE_TYPE: "INVALID_MESSAGE_TYPE",
  INVALID_PHONE_NUMBER: "INVALID_PHONE_NUMBER",
  MESSAGE_TOO_LARGE: "MESSAGE_TOO_LARGE",
  MEDIA_UPLOAD_FAILED: "MEDIA_UPLOAD_FAILED",
  BULK_MESSAGE_LIMIT_EXCEEDED: "BULK_MESSAGE_LIMIT_EXCEEDED",

  // Rate Limiting
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
  MESSAGE_LIMIT_EXCEEDED: "MESSAGE_LIMIT_EXCEEDED",
  API_LIMIT_EXCEEDED: "API_LIMIT_EXCEEDED",
  TIER_LIMIT_EXCEEDED: "TIER_LIMIT_EXCEEDED",

  // Validation
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INVALID_INPUT: "INVALID_INPUT",
  MISSING_REQUIRED_FIELD: "MISSING_REQUIRED_FIELD",
  INVALID_FORMAT: "INVALID_FORMAT",
  INVALID_UUID: "INVALID_UUID",

  // System Errors
  DATABASE_ERROR: "DATABASE_ERROR",
  REDIS_ERROR: "REDIS_ERROR",
  EXTERNAL_SERVICE_ERROR: "EXTERNAL_SERVICE_ERROR",
  CONFIGURATION_ERROR: "CONFIGURATION_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",

  // Webhook
  WEBHOOK_DELIVERY_FAILED: "WEBHOOK_DELIVERY_FAILED",
  WEBHOOK_INVALID_URL: "WEBHOOK_INVALID_URL",
  WEBHOOK_NOT_FOUND: "WEBHOOK_NOT_FOUND",
};

export const REGEX = {
  // Email validation
  EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,

  // Phone number validation (international format)
  PHONE_NUMBER: /^\+?[1-9]\d{1,14}$/,

  // WhatsApp JID format
  WHATSAPP_JID: /^(\+?[1-9]\d{1,14})@(s\.whatsapp\.net|g\.us)$/,

  // UUID validation
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,

  // API Key format (wg_ prefix + 32 chars)
  API_KEY: /^wg_[a-zA-Z0-9]{32,}$/,

  // Session ID format (alphanumeric, dash, underscore, supports UUID-based IDs)
  SESSION_ID: /^[a-zA-Z0-9_-]{3,100}$/,

  // Worker ID format
  WORKER_ID: /^worker-[a-zA-Z0-9_-]{3,30}$/,

  // Password strength (min 8 chars, at least 1 letter, 1 number)
  PASSWORD: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/,

  // URL validation
  URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,

  // Base64 validation
  BASE64: /^[A-Za-z0-9+/]*={0,2}$/,

  // Hex color validation
  HEX_COLOR: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
};

export const VALIDATION = {
  // User validation
  USER: {
    EMAIL_MAX_LENGTH: 255,
    PASSWORD_MIN_LENGTH: 8,
    PASSWORD_MAX_LENGTH: 128,
    NAME_MAX_LENGTH: 100,
  },

  // Session validation
  SESSION: {
    NAME_MIN_LENGTH: 3,
    NAME_MAX_LENGTH: 50,
    ID_MIN_LENGTH: 3,
    ID_MAX_LENGTH: 100,
    DESCRIPTION_MAX_LENGTH: 255,
  },

  // Message validation
  MESSAGE: {
    TEXT_MAX_LENGTH: 4096,
    CAPTION_MAX_LENGTH: 1024,
    FILENAME_MAX_LENGTH: 255,
    MEDIA_MAX_SIZE: 16 * 1024 * 1024, // 16MB
    BULK_MAX_MESSAGES: 100,
  },

  // API Key validation
  API_KEY: {
    NAME_MIN_LENGTH: 3,
    NAME_MAX_LENGTH: 50,
    KEY_LENGTH: 35, // wg_ + 32 chars
  },

  // Worker validation
  WORKER: {
    ENDPOINT_MAX_LENGTH: 255,
    DESCRIPTION_MAX_LENGTH: 255,
    MAX_SESSIONS_MIN: 1,
    MAX_SESSIONS_MAX: 1000,
  },

  // Pagination
  PAGINATION: {
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
    DEFAULT_OFFSET: 0,
  },

  // Rate limiting
  RATE_LIMITS: {
    BASIC: {
      MESSAGES_PER_HOUR: 100,
      API_CALLS_PER_HOUR: 1000,
      SESSIONS_MAX: 1,
    },
    PRO: {
      MESSAGES_PER_HOUR: 1000,
      API_CALLS_PER_HOUR: 10000,
      SESSIONS_MAX: 5,
    },
    MAX: {
      MESSAGES_PER_HOUR: 10000,
      API_CALLS_PER_HOUR: 100000,
      SESSIONS_MAX: 20,
    },
  },
};

export const MESSAGE_TYPES = {
  TEXT: "text",
  IMAGE: "image",
  DOCUMENT: "document",
  AUDIO: "audio",
  VIDEO: "video",
  STICKER: "sticker",
  LOCATION: "location",
  CONTACT: "contact",
  SEEN: "seen",
  TYPING_START: "typing_start",
  TYPING_STOP: "typing_stop",
  LINK: "link",
  POLL: "poll",
};

export const SESSION_STATUS = {
  DISCONNECTED: "DISCONNECTED", // Phone disconnected, or session terminated (default)
  INIT: "INIT", // Initializing connection
  QR_REQUIRED: "QR_REQUIRED", // QR code must be scanned to log in
  CONNECTED: "CONNECTED", // WhatsApp session is active
  RECONNECTING: "RECONNECTING", // Trying to re-establish session
  ERROR: "ERROR", // Fatal error (e.g., banned, QR scan expired)
};

export const WORKER_STATUS = {
  ONLINE: "ONLINE",
  OFFLINE: "OFFLINE",
  MAINTENANCE: "MAINTENANCE",
};

export const USER_ROLES = {
  USER: "USER",
  ADMINISTRATOR: "ADMINISTRATOR",
};

export const USER_TIERS = {
  BASIC: "BASIC",
  PRO: "PRO",
  MAX: "MAX",
};

export const MESSAGE_STATUS = {
  PENDING: "PENDING",
  SENT: "SENT",
  DELIVERED: "DELIVERED",
  READ: "READ",
  FAILED: "FAILED",
};

export const WEBHOOK_EVENTS = {
  MESSAGE_RECEIVED: "message.received",
  MESSAGE_SENT: "message.sent",
  MESSAGE_DELIVERED: "message.delivered",
  MESSAGE_READ: "message.read",
  MESSAGE_FAILED: "message.failed",
  SESSION_CONNECTED: "session.connected",
  SESSION_DISCONNECTED: "session.disconnected",
  SESSION_QR_UPDATED: "session.qr_updated",
  SESSION_ERROR: "session.error",
};

export const LOG_LEVELS = {
  ERROR: "ERROR",
  WARN: "WARN",
  INFO: "INFO",
  DEBUG: "DEBUG",
};

// Default values
export const DEFAULTS = {
  PAGINATION_LIMIT: 20,
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
  QR_CODE_TIMEOUT: 2 * 60 * 1000, // 2 minutes
  WORKER_HEALTH_CHECK_INTERVAL: 30 * 1000, // 30 seconds
  MESSAGE_RETRY_ATTEMPTS: 3,
  WEBHOOK_RETRY_ATTEMPTS: 5,
  JWT_EXPIRES_IN: "7d",
  API_KEY_EXPIRES_IN: "1y",
};
