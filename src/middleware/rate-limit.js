// Rate Limiting Middleware
import rateLimit from "express-rate-limit";
import Redis from "ioredis";
import {
  rateLimitConfig,
  sessionRateLimitConfig,
  messageLimitsByTier,
} from "../config/security.js";
import { RateLimitError } from "./error-handler.js";
import logger from "../utils/logger.js";

// Redis client for rate limiting
let redis;
try {
  redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
  redis.on("error", (err) => {
    logger.error("Redis connection error for rate limiting:", err);
  });
} catch (error) {
  logger.warn("Redis not available for rate limiting, using memory store");
}

// General API rate limiting
export const apiLimiter = rateLimit({
  windowMs: rateLimitConfig.windowMs,
  max: rateLimitConfig.max,
  message: rateLimitConfig.message,
  standardHeaders: rateLimitConfig.standardHeaders,
  legacyHeaders: rateLimitConfig.legacyHeaders,
  handler: (req, res) => {
    logger.warn("Rate limit exceeded", {
      ip: req.ip,
      path: req.path,
      method: req.method,
      userAgent: req.get("User-Agent"),
    });

    res.status(429).json(rateLimitConfig.message);
  },
});

// Session operations rate limiting
export const sessionLimiter = rateLimit({
  windowMs: sessionRateLimitConfig.windowMs,
  max: sessionRateLimitConfig.max,
  message: sessionRateLimitConfig.message,
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise IP
    return req.user?.userId || req.ip;
  },
  handler: (req, res) => {
    logger.warn("Session rate limit exceeded", {
      userId: req.user?.userId,
      ip: req.ip,
      path: req.path,
    });

    res.status(429).json(sessionRateLimitConfig.message);
  },
});

// Message sending rate limiting (per user tier)
export const createMessageLimiter = async (req, res, next) => {
  if (!req.user) {
    return next();
  }

  const userId = req.user.userId;
  const userTier = req.user.tier || "BASIC";
  const key = `message_limit:${userId}`;
  const windowMs = 60 * 60 * 1000; // 1 hour

  const limit =
    messageLimitsByTier[userTier]?.messagesPerHour ||
    messageLimitsByTier.FREE.messagesPerHour;

  try {
    if (redis) {
      // Use Redis for distributed rate limiting
      const current = await redis.incr(key);

      if (current === 1) {
        await redis.expire(key, windowMs / 1000);
      }

      if (current > limit) {
        logger.warn("Message rate limit exceeded", {
          userId,
          tier: userTier,
          current,
          limit,
        });

        return res.status(429).json({
          success: false,
          error: `Message limit exceeded. ${userTier} tier allows ${limit} messages per hour`,
          current,
          limit,
          resetTime: new Date(Date.now() + windowMs).toISOString(),
        });
      }

      // Add rate limit info to response headers
      res.set({
        "X-RateLimit-Limit": limit,
        "X-RateLimit-Remaining": Math.max(0, limit - current),
        "X-RateLimit-Reset": new Date(Date.now() + windowMs).toISOString(),
      });

      req.messageCount = current;
    }

    next();
  } catch (error) {
    logger.error("Rate limiting error:", error);
    // Allow request if Redis fails
    next();
  }
};

// API calls rate limiting (per user tier)
export const createApiLimiter = async (req, res, next) => {
  if (!req.user) {
    return next();
  }

  const userId = req.user.userId;
  const userTier = req.user.tier || "BASIC";
  const key = `api_limit:${userId}`;
  const windowMs = 60 * 60 * 1000; // 1 hour

  const limit =
    messageLimitsByTier[userTier]?.apiCallsPerHour ||
    messageLimitsByTier.FREE.apiCallsPerHour;

  try {
    if (redis) {
      const current = await redis.incr(key);

      if (current === 1) {
        await redis.expire(key, windowMs / 1000);
      }

      if (current > limit) {
        logger.warn("API rate limit exceeded", {
          userId,
          tier: userTier,
          current,
          limit,
        });

        return res.status(429).json({
          success: false,
          error: `API limit exceeded. ${userTier} tier allows ${limit} API calls per hour`,
          current,
          limit,
          resetTime: new Date(Date.now() + windowMs).toISOString(),
        });
      }

      // Add rate limit info to response headers
      res.set({
        "X-RateLimit-API-Limit": limit,
        "X-RateLimit-API-Remaining": Math.max(0, limit - current),
        "X-RateLimit-API-Reset": new Date(Date.now() + windowMs).toISOString(),
      });

      req.apiCallCount = current;
    }

    next();
  } catch (error) {
    logger.error("API rate limiting error:", error);
    // Allow request if Redis fails
    next();
  }
};

// Worker registration rate limiting
export const workerLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // 10 worker registrations per 5 minutes per IP
  message: {
    success: false,
    error: "Too many worker registration attempts",
  },
  keyGenerator: (req) => req.ip,
  handler: (req, res) => {
    logger.warn("Worker registration rate limit exceeded", {
      ip: req.ip,
      userAgent: req.get("User-Agent"),
    });

    res.status(429).json({
      success: false,
      error: "Too many worker registration attempts",
    });
  },
});

// Admin operations rate limiting
export const adminLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 admin operations per minute
  message: {
    success: false,
    error: "Admin operation rate limit exceeded",
  },
  keyGenerator: (req) => req.user?.userId || req.ip,
  handler: (req, res) => {
    logger.warn("Admin rate limit exceeded", {
      userId: req.user?.userId,
      ip: req.ip,
      path: req.path,
    });

    res.status(429).json({
      success: false,
      error: "Admin operation rate limit exceeded",
    });
  },
});

// Get current rate limit status for a user
export const getRateLimitStatus = async (userId, tier = "BASIC") => {
  if (!redis) {
    return null;
  }

  try {
    const messageKey = `message_limit:${userId}`;
    const apiKey = `api_limit:${userId}`;

    const [messageCurrent, apiCurrent, messageTtl, apiTtl] = await Promise.all([
      redis.get(messageKey),
      redis.get(apiKey),
      redis.ttl(messageKey),
      redis.ttl(apiKey),
    ]);

    const limits = messageLimitsByTier[tier] || messageLimitsByTier.BASIC;

    return {
      messages: {
        current: parseInt(messageCurrent) || 0,
        limit: limits.messagesPerHour,
        remaining: Math.max(
          0,
          limits.messagesPerHour - (parseInt(messageCurrent) || 0)
        ),
        resetTime:
          messageTtl > 0
            ? new Date(Date.now() + messageTtl * 1000).toISOString()
            : null,
      },
      apiCalls: {
        current: parseInt(apiCurrent) || 0,
        limit: limits.apiCallsPerHour,
        remaining: Math.max(
          0,
          limits.apiCallsPerHour - (parseInt(apiCurrent) || 0)
        ),
        resetTime:
          apiTtl > 0
            ? new Date(Date.now() + apiTtl * 1000).toISOString()
            : null,
      },
    };
  } catch (error) {
    logger.error("Error getting rate limit status:", error);
    return null;
  }
};

// Reset rate limits for a user (admin function)
export const resetUserRateLimit = async (userId) => {
  if (!redis) {
    return false;
  }

  try {
    const messageKey = `message_limit:${userId}`;
    const apiKey = `api_limit:${userId}`;

    await Promise.all([redis.del(messageKey), redis.del(apiKey)]);

    logger.info("Rate limits reset for user", { userId });
    return true;
  } catch (error) {
    logger.error("Error resetting rate limits:", error);
    return false;
  }
};

export default {
  apiLimiter,
  sessionLimiter,
  createMessageLimiter,
  createApiLimiter,
  workerLimiter,
  adminLimiter,
  getRateLimitStatus,
  resetUserRateLimit,
};
