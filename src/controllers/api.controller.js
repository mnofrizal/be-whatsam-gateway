// API Controller - External API endpoints for third-party integrations
// These endpoints use API key authentication and provide simple message sending
import { asyncHandler } from "../middleware/error-handler.js";
import { ApiResponse } from "../utils/helpers.js";
import { HTTP_STATUS } from "../utils/constants.js";
import SessionService from "../services/session.service.js";
import prisma from "../database/client.js";

/**
 * Message Management Actions
 * Available actions for message management operations
 */
export const MESSAGE_ACTIONS = {
  DELETE: "delete",
  UNSEND: "unsend",
  STAR: "star",
  UNSTAR: "unstar",
  EDIT: "edit",
  REACTION: "reaction",
  READ: "read",
  PIN: "pin",
  UNPIN: "unpin",
};

/**
 * Send text message
 * POST /api/sendText
 */
export const sendText = asyncHandler(async (req, res) => {
  const { to, message } = req.body;
  const apiKey = req.apiKey;
  const sessionId = apiKey.sessionId; // Get sessionId from authenticated API key

  // Format phone number
  const formattedTo = to.trim().includes("@")
    ? to.trim()
    : `${to.trim()}@s.whatsapp.net`;

  const messageData = {
    to: formattedTo,
    type: "text",
    message: message.trim(),
  };

  const result = await SessionService.sendMessage(sessionId, messageData);

  return res.status(HTTP_STATUS.OK).json(
    ApiResponse.createSuccessResponse(result, {
      message: "Text message sent successfully",
    })
  );
});

/**
 * Send image message
 * POST /api/sendImage
 */
export const sendImage = asyncHandler(async (req, res) => {
  const { to, imageUrl, caption } = req.body;
  const apiKey = req.apiKey;
  const sessionId = apiKey.sessionId; // Get sessionId from authenticated API key

  // Format phone number
  const formattedTo = to.trim().includes("@")
    ? to.trim()
    : `${to.trim()}@s.whatsapp.net`;

  const messageData = {
    to: formattedTo,
    type: "image",
    mediaUrl: imageUrl.trim(),
    caption: caption ? caption.trim() : undefined,
  };

  const result = await SessionService.sendMessage(sessionId, messageData);

  return res.status(HTTP_STATUS.OK).json(
    ApiResponse.createSuccessResponse(result, {
      message: "Image message sent successfully",
    })
  );
});

/**
 * Send document/file message
 * POST /api/sendFile
 */
export const sendFile = asyncHandler(async (req, res) => {
  const { to, fileUrl, filename, caption } = req.body;
  const apiKey = req.apiKey;
  const sessionId = apiKey.sessionId; // Get sessionId from authenticated API key

  // Format phone number
  const formattedTo = to.trim().includes("@")
    ? to.trim()
    : `${to.trim()}@s.whatsapp.net`;

  const messageData = {
    to: formattedTo,
    type: "document",
    mediaUrl: fileUrl.trim(),
    filename: filename ? filename.trim() : undefined,
    caption: caption ? caption.trim() : undefined,
  };

  const result = await SessionService.sendMessage(sessionId, messageData);

  return res.status(HTTP_STATUS.OK).json(
    ApiResponse.createSuccessResponse(result, {
      message: "File message sent successfully",
    })
  );
});

/**
 * Send voice/audio message
 * POST /api/sendVoice
 */
export const sendVoice = asyncHandler(async (req, res) => {
  const { to, audioUrl } = req.body;
  const apiKey = req.apiKey;
  const sessionId = apiKey.sessionId; // Get sessionId from authenticated API key

  // Format phone number
  const formattedTo = to.trim().includes("@")
    ? to.trim()
    : `${to.trim()}@s.whatsapp.net`;

  const messageData = {
    to: formattedTo,
    type: "audio",
    mediaUrl: audioUrl.trim(),
  };

  const result = await SessionService.sendMessage(sessionId, messageData);

  return res.status(HTTP_STATUS.OK).json(
    ApiResponse.createSuccessResponse(result, {
      message: "Voice message sent successfully",
    })
  );
});

/**
 * Send video message
 * POST /api/sendVideo
 */
export const sendVideo = asyncHandler(async (req, res) => {
  const { to, videoUrl, caption } = req.body;
  const apiKey = req.apiKey;
  const sessionId = apiKey.sessionId; // Get sessionId from authenticated API key

  // Format phone number
  const formattedTo = to.trim().includes("@")
    ? to.trim()
    : `${to.trim()}@s.whatsapp.net`;

  const messageData = {
    to: formattedTo,
    type: "video",
    mediaUrl: videoUrl.trim(),
    caption: caption ? caption.trim() : undefined,
  };

  const result = await SessionService.sendMessage(sessionId, messageData);

  return res.status(HTTP_STATUS.OK).json(
    ApiResponse.createSuccessResponse(result, {
      message: "Video message sent successfully",
    })
  );
});

/**
 * Send location message
 * POST /api/sendLocation
 */
export const sendLocation = asyncHandler(async (req, res) => {
  const { to, latitude, longitude, name, address } = req.body;
  const apiKey = req.apiKey;
  const sessionId = apiKey.sessionId; // Get sessionId from authenticated API key

  // Format phone number
  const formattedTo = to.trim().includes("@")
    ? to.trim()
    : `${to.trim()}@s.whatsapp.net`;

  const messageData = {
    to: formattedTo,
    type: "location",
    location: {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      name: name ? name.trim() : undefined,
      address: address ? address.trim() : undefined,
    },
  };

  const result = await SessionService.sendMessage(sessionId, messageData);

  return res.status(HTTP_STATUS.OK).json(
    ApiResponse.createSuccessResponse(result, {
      message: "Location message sent successfully",
    })
  );
});

/**
 * Send contact vcard message
 * POST /api/sendContactVcard
 */
export const sendContactVcard = asyncHandler(async (req, res) => {
  const { to, contactName, contactPhone, contactEmail, contactOrganization } =
    req.body;
  const apiKey = req.apiKey;
  const sessionId = apiKey.sessionId; // Get sessionId from authenticated API key

  // Format phone number
  const formattedTo = to.trim().includes("@")
    ? to.trim()
    : `${to.trim()}@s.whatsapp.net`;

  const messageData = {
    to: formattedTo,
    type: "contact",
    contact: {
      name: contactName,
      phone: contactPhone,
      email: contactEmail,
      organization: contactOrganization,
    },
  };

  const result = await SessionService.sendMessage(sessionId, messageData);

  return res.status(HTTP_STATUS.OK).json(
    ApiResponse.createSuccessResponse(result, {
      message: "Contact vcard sent successfully",
    })
  );
});

/**
 * Mark message as seen/read
 * POST /api/sendSeen
 */
export const sendSeen = asyncHandler(async (req, res) => {
  const { messageId } = req.body;
  const apiKey = req.apiKey;
  const sessionId = apiKey.sessionId; // Get sessionId from authenticated API key

  // For now, return success - this would be implemented in worker
  const result = {
    sessionId,
    messageId,
    action: "mark_as_read",
    status: "success",
    timestamp: new Date().toISOString(),
  };

  return res.status(HTTP_STATUS.OK).json(
    ApiResponse.createSuccessResponse(result, {
      message: "Message marked as seen successfully",
    })
  );
});

/**
 * Get session status (API key version)
 * GET /api/session/status
 */
export const getSessionStatus = asyncHandler(async (req, res) => {
  const apiKey = req.apiKey;
  const sessionId = apiKey.sessionId; // Get sessionId from authenticated API key

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { worker: true },
  });

  if (!session) {
    return res
      .status(HTTP_STATUS.NOT_FOUND)
      .json(ApiResponse.createErrorResponse("NOT_FOUND", "Session not found"));
  }

  const result = {
    sessionId: session.id,
    status: session.status.toLowerCase(),
    phoneNumber: session.phoneNumber,
    lastSeenAt: session.lastSeenAt,
    workerId: session.workerId,
    workerStatus: session.worker?.status?.toLowerCase() || "unknown",
  };

  return res.status(HTTP_STATUS.OK).json(
    ApiResponse.createSuccessResponse(result, {
      message: "Session status retrieved successfully",
    })
  );
});

/**
 * Send link message
 * POST /api/sendLink
 */
export const sendLink = asyncHandler(async (req, res) => {
  const { to, url, text } = req.body;
  const apiKey = req.apiKey;
  const sessionId = apiKey.sessionId; // Get sessionId from authenticated API key

  // Format phone number
  const formattedTo = to.trim().includes("@")
    ? to.trim()
    : `${to.trim()}@s.whatsapp.net`;

  const messageData = {
    to: formattedTo,
    type: "link",
    url: url.trim(),
    text: text ? text.trim() : url.trim(),
  };

  const result = await SessionService.sendMessage(sessionId, messageData);

  return res.status(HTTP_STATUS.OK).json(
    ApiResponse.createSuccessResponse(result, {
      message: "Link message sent successfully",
    })
  );
});

/**
 * Send poll message
 * POST /api/sendPoll
 */
export const sendPoll = asyncHandler(async (req, res) => {
  const { to, question, options, maxAnswer } = req.body;
  const apiKey = req.apiKey;
  const sessionId = apiKey.sessionId; // Get sessionId from authenticated API key

  // Format phone number
  const formattedTo = to.trim().includes("@")
    ? to.trim()
    : `${to.trim()}@s.whatsapp.net`;

  const messageData = {
    to: formattedTo,
    type: "poll",
    question: question.trim(),
    options: options.map((option) => option.trim()),
    maxAnswer: maxAnswer || 1,
  };

  const result = await SessionService.sendMessage(sessionId, messageData);

  return res.status(HTTP_STATUS.OK).json(
    ApiResponse.createSuccessResponse(result, {
      message: "Poll message sent successfully",
    })
  );
});

/**
 * Start typing indicator
 * POST /api/startTyping
 */
export const startTyping = asyncHandler(async (req, res) => {
  const { to } = req.body;
  const apiKey = req.apiKey;
  const sessionId = apiKey.sessionId; // Get sessionId from authenticated API key

  // Format phone number
  const formattedTo = to.trim().includes("@")
    ? to.trim()
    : `${to.trim()}@s.whatsapp.net`;

  const messageData = {
    to: formattedTo,
    type: "typing_start",
  };

  const result = await SessionService.sendMessage(sessionId, messageData);

  return res.status(HTTP_STATUS.OK).json(
    ApiResponse.createSuccessResponse(result, {
      message: "Typing indicator started successfully",
    })
  );
});

/**
 * Stop typing indicator
 * POST /api/stopTyping
 */
export const stopTyping = asyncHandler(async (req, res) => {
  const { to } = req.body;
  const apiKey = req.apiKey;
  const sessionId = apiKey.sessionId; // Get sessionId from authenticated API key

  // Format phone number
  const formattedTo = to.trim().includes("@")
    ? to.trim()
    : `${to.trim()}@s.whatsapp.net`;

  const messageData = {
    to: formattedTo,
    type: "typing_stop",
  };

  const result = await SessionService.sendMessage(sessionId, messageData);

  return res.status(HTTP_STATUS.OK).json(
    ApiResponse.createSuccessResponse(result, {
      message: "Typing indicator stopped successfully",
    })
  );
});

/**
 * Manage message (delete, unsend, edit, star, unstar, reaction, read)
 * POST /api/message/{messageId}/{action}
 */
export const manageMessage = asyncHandler(async (req, res) => {
  const { messageId, action } = req.params;
  const { phone, forEveryone, content, emoji } = req.body;
  const apiKey = req.apiKey;
  const sessionId = apiKey.sessionId; // Get sessionId from authenticated API key

  // Validate action
  const validActions = Object.values(MESSAGE_ACTIONS);
  if (!validActions.includes(action)) {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json(
        ApiResponse.createErrorResponse(
          "INVALID_ACTION",
          `Invalid action. Valid actions are: ${validActions.join(", ")}`
        )
      );
  }

  // Format phone number if provided
  const formattedPhone = phone
    ? phone.trim().includes("@")
      ? phone.trim()
      : `${phone.trim()}@s.whatsapp.net`
    : null;

  // Build message data based on action
  const messageData = {
    action,
    messageId: messageId.trim(),
  };

  // Add phone if provided (required for most actions)
  if (formattedPhone) {
    messageData.phone = formattedPhone;
  }

  // Add action-specific fields
  switch (action) {
    case MESSAGE_ACTIONS.DELETE:
      if (forEveryone !== undefined) {
        messageData.forEveryone = Boolean(forEveryone);
      }
      break;
    case MESSAGE_ACTIONS.EDIT:
      if (!content) {
        return res
          .status(HTTP_STATUS.BAD_REQUEST)
          .json(
            ApiResponse.createErrorResponse(
              "MISSING_CONTENT",
              "Content is required for edit action"
            )
          );
      }
      messageData.content = content.trim();
      break;
    case MESSAGE_ACTIONS.REACTION:
      if (!emoji) {
        return res
          .status(HTTP_STATUS.BAD_REQUEST)
          .json(
            ApiResponse.createErrorResponse(
              "MISSING_EMOJI",
              "Emoji is required for reaction action"
            )
          );
      }
      messageData.emoji = emoji.trim();
      break;
    case MESSAGE_ACTIONS.UNSEND:
    case MESSAGE_ACTIONS.STAR:
    case MESSAGE_ACTIONS.UNSTAR:
    case MESSAGE_ACTIONS.READ:
    case MESSAGE_ACTIONS.PIN:
    case MESSAGE_ACTIONS.UNPIN:
      // These actions don't require additional fields
      break;
  }

  // Send to worker via session service
  const result = await SessionService.manageMessage(sessionId, messageData);

  return res.status(HTTP_STATUS.OK).json(
    ApiResponse.createSuccessResponse(result, {
      message: `Message ${action} operation completed successfully`,
    })
  );
});

// Export default object with all controller functions
export default {
  sendText,
  sendImage,
  sendFile,
  sendVoice,
  sendVideo,
  sendLocation,
  sendContactVcard,
  sendSeen,
  getSessionStatus,
  sendLink,
  sendPoll,
  startTyping,
  stopTyping,
  manageMessage,
};
