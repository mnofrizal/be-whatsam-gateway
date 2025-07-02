// Global Error Handler Middleware
import logger from '../utils/logger.js';

export const errorHandler = (err, req, res, next) => {
  // Log the error
  logger.logError(err, req);

  // Default error response
  let error = {
    success: false,
    error: 'Internal Server Error',
    message: 'Something went wrong on our end'
  };

  let statusCode = 500;

  // Handle specific error types
  if (err.name === 'ValidationError') {
    // Mongoose/Prisma validation error
    statusCode = 400;
    error.error = 'Validation Error';
    error.message = err.message;
    error.details = err.errors || err.details;
  } else if (err.name === 'CastError') {
    // Invalid ObjectId or similar
    statusCode = 400;
    error.error = 'Invalid ID';
    error.message = 'Invalid resource ID provided';
  } else if (err.code === 11000) {
    // Duplicate key error
    statusCode = 409;
    error.error = 'Duplicate Entry';
    error.message = 'Resource already exists';
  } else if (err.name === 'JsonWebTokenError') {
    // JWT errors
    statusCode = 401;
    error.error = 'Invalid Token';
    error.message = 'Authentication token is invalid';
  } else if (err.name === 'TokenExpiredError') {
    // JWT expired
    statusCode = 401;
    error.error = 'Token Expired';
    error.message = 'Authentication token has expired';
  } else if (err.name === 'UnauthorizedError') {
    // Custom unauthorized error
    statusCode = 401;
    error.error = 'Unauthorized';
    error.message = err.message || 'Access denied';
  } else if (err.name === 'ForbiddenError') {
    // Custom forbidden error
    statusCode = 403;
    error.error = 'Forbidden';
    error.message = err.message || 'Insufficient permissions';
  } else if (err.name === 'NotFoundError') {
    // Custom not found error
    statusCode = 404;
    error.error = 'Not Found';
    error.message = err.message || 'Resource not found';
  } else if (err.name === 'ConflictError') {
    // Custom conflict error
    statusCode = 409;
    error.error = 'Conflict';
    error.message = err.message || 'Resource conflict';
  } else if (err.name === 'RateLimitError') {
    // Rate limiting error
    statusCode = 429;
    error.error = 'Rate Limit Exceeded';
    error.message = err.message || 'Too many requests';
  } else if (err.statusCode || err.status) {
    // Error with explicit status code
    statusCode = err.statusCode || err.status;
    error.error = err.name || 'Error';
    error.message = err.message;
  }

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    error.stack = err.stack;
    error.details = err.details || {};
  }

  // Include request ID if available
  if (req.requestId) {
    error.requestId = req.requestId;
  }

  res.status(statusCode).json(error);
};

// Custom error classes
export class AppError extends Error {
  constructor(message, statusCode = 500, name = 'AppError') {
    super(message);
    this.name = name;
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message, details = {}) {
    super(message, 400, 'ValidationError');
    this.details = details;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 401, 'UnauthorizedError');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, 'ForbiddenError');
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NotFoundError');
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409, 'ConflictError');
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded') {
    super(message, 429, 'RateLimitError');
  }
}

// Async error wrapper
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404 handler for undefined routes
export const notFoundHandler = (req, res, next) => {
  const error = new NotFoundError(`Route ${req.originalUrl} not found`);
  next(error);
};