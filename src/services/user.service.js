// User Service - User management business logic
import prisma from "../database/client.js";
import { UtilHelper } from "../utils/helpers.js";
import logger from "../utils/logger.js";
import {
  UnauthorizedError,
  ValidationError,
  ConflictError,
  NotFoundError,
} from "../middleware/error-handler.js";
import { USER_TIERS } from "../utils/constants.js";
import { hash, compare } from "../utils/helpers/password.js";

/**
 * Get user profile by ID
 * @param {string} userId - User ID
 * @returns {object} - User profile data
 */
export const getUserProfile = async (userId) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        tier: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user || !user.isActive) {
      throw new NotFoundError("User not found or account deactivated");
    }

    // Get active sessions count
    const activeSessionsCount = await prisma.session.count({
      where: {
        userId: userId,
        status: {
          in: ["CONNECTED", "QR_REQUIRED", "RECONNECTING"],
        },
      },
    });

    // Get total sessions count
    const totalSessionsCount = await prisma.session.count({
      where: { userId: userId },
    });

    return {
      ...user,
      stats: {
        activeSessions: activeSessionsCount,
        totalSessions: totalSessionsCount,
      },
    };
  } catch (error) {
    logger.error("Get user profile failed:", error);
    throw error;
  }
};

/**
 * Update user profile
 * @param {string} userId - User ID
 * @param {object} updateData - Data to update
 * @returns {object} - Updated user data
 */
export const updateUserProfile = async (userId, updateData) => {
  try {
    // Input validation is handled by route middleware
    const { name, email, currentPassword, newPassword } = updateData;

    // Get current user
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        passwordHash: true,
        isActive: true,
      },
    });

    if (!currentUser || !currentUser.isActive) {
      throw new NotFoundError("User not found or account deactivated");
    }

    const updateFields = {};

    // Update name if provided
    if (name && name.trim() !== currentUser.name) {
      updateFields.name = name.trim();
    }

    // Update email if provided
    if (email && email.toLowerCase() !== currentUser.email) {
      // Check if new email is already taken
      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (existingUser && existingUser.id !== userId) {
        throw new ConflictError("Email is already taken by another user");
      }

      updateFields.email = email.toLowerCase();
    }

    // Update password if provided
    if (newPassword) {
      // Verify current password (currentPassword is guaranteed by route validation)
      const isValidPassword = await compare(
        currentPassword,
        currentUser.passwordHash
      );
      if (!isValidPassword) {
        throw new UnauthorizedError("Current password is incorrect");
      }

      // Hash new password
      updateFields.passwordHash = await hash(newPassword);
    }

    // If no fields to update
    if (Object.keys(updateFields).length === 0) {
      return await getUserProfile(userId);
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateFields,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        tier: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    logger.info("User profile updated successfully", {
      userId: userId,
      updatedFields: Object.keys(updateFields),
    });

    return updatedUser;
  } catch (error) {
    logger.error("Update user profile failed:", error);
    throw error;
  }
};

/**
 * Get user's API keys (session-based)
 * @param {string} userId - User ID
 * @returns {object} - User's API keys
 */
export const getUserApiKeys = async (userId) => {
  try {
    const apiKeys = await prisma.apiKey.findMany({
      where: {
        session: {
          userId: userId,
        },
        isActive: true,
      },
      select: {
        id: true,
        key: true,
        name: true,
        isActive: true,
        lastUsed: true,
        createdAt: true,
        expiresAt: true,
        session: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Mask API keys for security
    const maskedApiKeys = apiKeys.map((apiKey) => ({
      ...apiKey,
      key: maskApiKey(apiKey.key),
    }));

    return {
      apiKeys: maskedApiKeys,
      total: apiKeys.length,
    };
  } catch (error) {
    logger.error("Get user API keys failed:", error);
    throw error;
  }
};

/**
 * Delete API key
 * @param {string} userId - User ID
 * @param {string} apiKeyId - API key ID
 * @returns {object} - Success message
 */
export const deleteApiKey = async (userId, apiKeyId) => {
  try {
    // Find API key
    const apiKey = await prisma.apiKey.findFirst({
      where: {
        id: apiKeyId,
        session: {
          userId: userId,
        },
      },
    });

    if (!apiKey) {
      throw new NotFoundError("API key not found or doesn't belong to user");
    }

    // Delete API key
    await prisma.apiKey.delete({
      where: { id: apiKeyId },
    });

    logger.info("API key deleted successfully", {
      userId: userId,
      apiKeyId,
      name: apiKey.name,
    });

    return {
      message: "API key deleted successfully",
    };
  } catch (error) {
    logger.error("Delete API key failed:", error);
    throw error;
  }
};

/**
 * Get user usage statistics
 * @param {string} userId - User ID
 * @param {string} period - Time period (24h, 7d, 30d)
 * @param {string} sessionId - Optional session filter
 * @returns {object} - Usage statistics
 */
export const getUserUsage = async (
  userId,
  period = "24h",
  sessionId = null
) => {
  try {
    // Calculate time range
    const timeRanges = {
      "24h": new Date(Date.now() - 24 * 60 * 60 * 1000),
      "7d": new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      "30d": new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    };

    const since = timeRanges[period] || timeRanges["24h"];

    // Build session filter
    const sessionFilter = {
      userId: userId,
      ...(sessionId && { id: sessionId }),
    };

    // Get session statistics
    const [totalSessions, activeSessions, inactiveSessions] = await Promise.all(
      [
        prisma.session.count({ where: sessionFilter }),
        prisma.session.count({
          where: {
            ...sessionFilter,
            status: { in: ["CONNECTED", "QR_REQUIRED", "RECONNECTING"] },
          },
        }),
        prisma.session.count({
          where: {
            ...sessionFilter,
            status: { in: ["DISCONNECTED", "ERROR"] },
          },
        }),
      ]
    );

    // Get message statistics
    const messageFilter = {
      session: { userId: userId },
      createdAt: { gte: since },
      ...(sessionId && { sessionId }),
    };

    const [sentMessages, receivedMessages, failedMessages] = await Promise.all([
      prisma.message.count({
        where: {
          ...messageFilter,
          direction: "OUTBOUND",
          status: { in: ["SENT", "DELIVERED", "READ"] },
        },
      }),
      prisma.message.count({
        where: {
          ...messageFilter,
          direction: "INBOUND",
        },
      }),
      prisma.message.count({
        where: {
          ...messageFilter,
          status: "FAILED",
        },
      }),
    ]);

    // Get user tier limits
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { tier: true },
    });

    const tierLimits = getTierLimits(user.tier);

    return {
      period,
      sessions: {
        total: totalSessions,
        active: activeSessions,
        inactive: inactiveSessions,
      },
      messages: {
        sent: sentMessages,
        received: receivedMessages,
        failed: failedMessages,
      },
      limits: tierLimits,
    };
  } catch (error) {
    logger.error("Get user usage failed:", error);
    throw error;
  }
};

/**
 * Get user tier information
 * @param {string} userId - User ID
 * @returns {object} - Tier information
 */
export const getUserTier = async (userId) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { tier: true },
    });

    if (!user) {
      throw new NotFoundError("User not found");
    }

    const currentTier = user.tier;
    const tierLimits = getTierLimits(currentTier);
    const tierFeatures = getTierFeatures(currentTier);
    const upgradeOptions = getUpgradeOptions(currentTier);

    return {
      current: currentTier,
      limits: tierLimits,
      features: tierFeatures,
      upgradeTo: upgradeOptions,
    };
  } catch (error) {
    logger.error("Get user tier failed:", error);
    throw error;
  }
};

/**
 * Deactivate user account
 * @param {string} userId - User ID
 * @returns {object} - Success message
 */
export const deactivateAccount = async (userId) => {
  try {
    // Deactivate all user's sessions
    await prisma.session.updateMany({
      where: { userId: userId },
      data: { status: "DISCONNECTED" },
    });

    // Deactivate all user's API keys
    await prisma.apiKey.updateMany({
      where: {
        session: {
          userId: userId,
        },
      },
      data: { isActive: false },
    });

    // Deactivate user account
    await prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });

    logger.info("User account deactivated successfully", {
      userId: userId,
    });

    return {
      message: "Account deactivated successfully",
    };
  } catch (error) {
    logger.error("Account deactivation failed:", error);
    throw error;
  }
};

/**
 * Get tier limits based on tier
 * @param {string} tier - User tier
 * @returns {object} - Tier limits
 */
export const getTierLimits = (tier) => {
  const limits = {
    [USER_TIERS.BASIC]: {
      sessions: 1,
      messagesPerHour: 100,
      apiCallsPerHour: 1000,
    },
    [USER_TIERS.PRO]: {
      sessions: 5,
      messagesPerHour: 1000,
      apiCallsPerHour: 10000,
    },
    [USER_TIERS.MAX]: {
      sessions: 20,
      messagesPerHour: 10000,
      apiCallsPerHour: 100000,
    },
  };

  return limits[tier] || limits[USER_TIERS.BASIC];
};

/**
 * Get tier features based on tier
 * @param {string} tier - User tier
 * @returns {array} - Tier features
 */
export const getTierFeatures = (tier) => {
  const features = {
    [USER_TIERS.BASIC]: [
      "Basic WhatsApp messaging",
      "Single session support",
      "Community support",
      "Basic analytics",
    ],
    [USER_TIERS.PRO]: [
      "Advanced WhatsApp messaging",
      "Multiple sessions (up to 5)",
      "Priority support",
      "Advanced analytics",
      "Webhook support",
      "Message scheduling",
    ],
    [USER_TIERS.MAX]: [
      "Enterprise WhatsApp messaging",
      "Unlimited sessions (up to 20)",
      "24/7 dedicated support",
      "Real-time analytics",
      "Advanced webhook support",
      "Message scheduling & automation",
      "Custom integrations",
      "SLA guarantee",
    ],
  };

  return features[tier] || features[USER_TIERS.BASIC];
};

/**
 * Get upgrade options based on current tier
 * @param {string} currentTier - Current user tier
 * @returns {object} - Upgrade options
 */
export const getUpgradeOptions = (currentTier) => {
  const allTiers = {
    [USER_TIERS.PRO]: {
      price: "$29/month",
      sessions: 5,
      messagesPerHour: 1000,
      apiCallsPerHour: 10000,
    },
    [USER_TIERS.MAX]: {
      price: "$99/month",
      sessions: 20,
      messagesPerHour: 10000,
      apiCallsPerHour: 100000,
    },
  };

  // Remove current tier from upgrade options
  const upgradeOptions = { ...allTiers };
  delete upgradeOptions[currentTier];

  return upgradeOptions;
};

/**
 * Mask API key for security
 * @param {string} apiKey - Full API key
 * @returns {string} - Masked API key
 */
export const maskApiKey = (apiKey) => {
  if (!apiKey || apiKey.length < 8) {
    return "****";
  }

  const prefix = apiKey.substring(0, 4);
  const suffix = apiKey.substring(apiKey.length - 4);
  const masked = "*".repeat(Math.max(0, apiKey.length - 8));

  return `${prefix}${masked}${suffix}`;
};

// Export all functions as named exports
export default {
  getUserProfile,
  updateUserProfile,
  getUserApiKeys,
  deleteApiKey,
  getUserUsage,
  getUserTier,
  deactivateAccount,
  getTierLimits,
  getTierFeatures,
  getUpgradeOptions,
  maskApiKey,
};
