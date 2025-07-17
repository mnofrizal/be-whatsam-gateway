// API Controller - External API endpoints for third-party integrations
// These endpoints use API key authentication and provide simple message sending
import { asyncHandler } from "../middleware/error-handler.js";
import { ApiResponse } from "../utils/helpers.js";
import { HTTP_STATUS, MESSAGE_TYPES } from "../utils/constants.js";
import { sendMessage, manageMessage } from "../services/api.service.js";
import prisma from "../database/client.js";

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
    type: MESSAGE_TYPES.TEXT,
    message: message.trim(),
  };

  const result = await sendMessage(sessionId, messageData);

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
    type: MESSAGE_TYPES.IMAGE,
    mediaUrl: imageUrl.trim(),
    caption: caption ? caption.trim() : undefined,
  };

  const result = await sendMessage(sessionId, messageData);

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
    type: MESSAGE_TYPES.DOCUMENT,
    mediaUrl: fileUrl.trim(),
    filename: filename ? filename.trim() : undefined,
    caption: caption ? caption.trim() : undefined,
  };

  const result = await sendMessage(sessionId, messageData);

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
    type: MESSAGE_TYPES.AUDIO,
    mediaUrl: audioUrl.trim(),
  };

  const result = await sendMessage(sessionId, messageData);

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
    type: MESSAGE_TYPES.VIDEO,
    mediaUrl: videoUrl.trim(),
    caption: caption ? caption.trim() : undefined,
  };

  const result = await sendMessage(sessionId, messageData);

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
    type: MESSAGE_TYPES.LOCATION,
    location: {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      name: name ? name.trim() : undefined,
      address: address ? address.trim() : undefined,
    },
  };

  const result = await sendMessage(sessionId, messageData);

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
    type: MESSAGE_TYPES.CONTACT,
    contact: {
      name: contactName,
      phone: contactPhone,
      email: contactEmail,
      organization: contactOrganization,
    },
  };

  const result = await sendMessage(sessionId, messageData);

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
  const { to, messageId } = req.body;
  const apiKey = req.apiKey;
  const sessionId = apiKey.sessionId;

  const formattedTo = to.trim().includes("@")
    ? to.trim()
    : `${to.trim()}@s.whatsapp.net`;

  const messageData = {
    to: formattedTo,
    type: MESSAGE_TYPES.SEEN,
    messageId,
  };

  const result = await sendMessage(sessionId, messageData);

  return res.status(HTTP_STATUS.OK).json(
    ApiResponse.createSuccessResponse(result, {
      message: "Message marked as seen successfully",
    })
  );
});

/**
 * Start typing indicator
 * POST /api/messages/{sessionId}/startTyping
 */
export const startTyping = asyncHandler(async (req, res) => {
  const { to } = req.body;
  const apiKey = req.apiKey;
  const sessionId = apiKey.sessionId;

  const formattedTo = to.trim().includes("@")
    ? to.trim()
    : `${to.trim()}@s.whatsapp.net`;

  const messageData = {
    to: formattedTo,
    type: MESSAGE_TYPES.TYPING_START,
  };

  const result = await sendMessage(sessionId, messageData);

  return res.status(HTTP_STATUS.OK).json(
    ApiResponse.createSuccessResponse(result, {
      message: "Typing indicator started",
    })
  );
});

/**
 * Stop typing indicator
 * POST /api/messages/{sessionId}/stopTyping
 */
export const stopTyping = asyncHandler(async (req, res) => {
  const { to } = req.body;
  const apiKey = req.apiKey;
  const sessionId = apiKey.sessionId;

  const formattedTo = to.trim().includes("@")
    ? to.trim()
    : `${to.trim()}@s.whatsapp.net`;

  const messageData = {
    to: formattedTo,
    type: MESSAGE_TYPES.TYPING_STOP,
  };

  const result = await sendMessage(sessionId, messageData);

  return res.status(HTTP_STATUS.OK).json(
    ApiResponse.createSuccessResponse(result, {
      message: "Typing indicator stopped",
    })
  );
});

/**
 * Send link message
 * POST /api/sendLink
 * Supports two formats:
 * 1. Automatic preview: { "to": "...", "url": "https://..." }
 * 2. Custom preview: { "to": "...", "url": "https://...", "title": "...", "description": "...", "thumbnail": "..." }
 */
export const sendLink = asyncHandler(async (req, res) => {
  const { to, url, title, description, thumbnail } = req.body;
  const apiKey = req.apiKey;
  const sessionId = apiKey.sessionId;

  const formattedTo = to.trim().includes("@")
    ? to.trim()
    : `${to.trim()}@s.whatsapp.net`;

  const linkData = {
    url: url.trim(),
    title: title ? title.trim() : undefined,
    description: description ? description.trim() : undefined,
    thumbnail: thumbnail ? thumbnail.trim() : undefined,
  };

  const messageData = {
    to: formattedTo,
    type: MESSAGE_TYPES.LINK,
    link: linkData,
  };

  const result = await sendMessage(sessionId, messageData);

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
  const { to, poll } = req.body;
  const apiKey = req.apiKey;
  const sessionId = apiKey.sessionId;

  const formattedTo = to.trim().includes("@")
    ? to.trim()
    : `${to.trim()}@s.whatsapp.net`;

  const messageData = {
    to: formattedTo,
    type: MESSAGE_TYPES.POLL,
    poll,
  };

  const result = await sendMessage(sessionId, messageData);

  return res.status(HTTP_STATUS.OK).json(
    ApiResponse.createSuccessResponse(result, {
      message: "Poll message sent successfully",
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
 * Delete message
 * POST /api/message/{messageId}/delete
 */
export const deleteMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params; // Get messageId from URL parameters
  const { phone, forEveryone } = req.body; // Get phone and additional data from body
  const apiKey = req.apiKey;
  const sessionId = apiKey.sessionId;

  // Format phone number
  const formattedPhone = phone.trim().includes("@")
    ? phone.trim()
    : `${phone.trim()}@s.whatsapp.net`;

  const actionData = {
    action: "delete",
    messageId,
    phone: formattedPhone,
    forEveryone: forEveryone || false,
  };

  const result = await manageMessage(sessionId, actionData);

  return res.status(HTTP_STATUS.OK).json(
    ApiResponse.createSuccessResponse(result, {
      message: "Message deleted successfully",
    })
  );
});

/**
 * Unsend message
 * POST /api/message/{messageId}/unsend
 */
export const unsendMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params; // Get messageId from URL parameters
  const { phone } = req.body; // Get phone from body
  const apiKey = req.apiKey;
  const sessionId = apiKey.sessionId;

  // Format phone number
  const formattedPhone = phone.trim().includes("@")
    ? phone.trim()
    : `${phone.trim()}@s.whatsapp.net`;

  const actionData = {
    action: "unsend",
    messageId,
    phone: formattedPhone,
  };

  const result = await manageMessage(sessionId, actionData);

  return res.status(HTTP_STATUS.OK).json(
    ApiResponse.createSuccessResponse(result, {
      message: "Message unsent successfully",
    })
  );
});

/**
 * React to message
 * POST /api/message/{messageId}/reaction
 */
export const reactToMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params; // Get messageId from URL parameters
  const { phone, emoji } = req.body; // Get phone and emoji from body
  const apiKey = req.apiKey;
  const sessionId = apiKey.sessionId;

  // Format phone number
  const formattedPhone = phone.trim().includes("@")
    ? phone.trim()
    : `${phone.trim()}@s.whatsapp.net`;

  const actionData = {
    action: "reaction",
    messageId,
    phone: formattedPhone,
    emoji,
  };

  const result = await manageMessage(sessionId, actionData);

  return res.status(HTTP_STATUS.OK).json(
    ApiResponse.createSuccessResponse(result, {
      message: "Message reaction sent successfully",
    })
  );
});

/**
 * Edit message
 * POST /api/message/{messageId}/edit
 */
export const editMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params; // Get messageId from URL parameters
  const { phone, newText } = req.body; // Get phone and newText from body
  const apiKey = req.apiKey;
  const sessionId = apiKey.sessionId;

  // Format phone number
  const formattedPhone = phone.trim().includes("@")
    ? phone.trim()
    : `${phone.trim()}@s.whatsapp.net`;

  const actionData = {
    action: "edit",
    messageId,
    phone: formattedPhone,
    newText,
  };

  const result = await manageMessage(sessionId, actionData);

  return res.status(HTTP_STATUS.OK).json(
    ApiResponse.createSuccessResponse(result, {
      message: "Message edited successfully",
    })
  );
});

/**
 * Mark message as read
 * POST /api/message/{messageId}/read
 */
export const markMessageAsRead = asyncHandler(async (req, res) => {
  const { messageId } = req.params; // Get messageId from URL parameters
  const { phone, jid, messageKey } = req.body; // Get phone and additional data from body
  const apiKey = req.apiKey;
  const sessionId = apiKey.sessionId;

  // Format phone number
  const formattedPhone = phone.trim().includes("@")
    ? phone.trim()
    : `${phone.trim()}@s.whatsapp.net`;

  const actionData = {
    action: "read",
    messageId, // Include messageId from URL params
    phone: formattedPhone,
    jid,
    messageKey,
  };

  const result = await manageMessage(sessionId, actionData);

  return res.status(HTTP_STATUS.OK).json(
    ApiResponse.createSuccessResponse(result, {
      message: "Message marked as read successfully",
    })
  );
});

/**
 * Star message
 * POST /api/message/{messageId}/star
 */
export const starMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params; // Get messageId from URL parameters
  const { phone } = req.body; // Get phone from body
  const apiKey = req.apiKey;
  const sessionId = apiKey.sessionId;

  // Format phone number
  const formattedPhone = phone.trim().includes("@")
    ? phone.trim()
    : `${phone.trim()}@s.whatsapp.net`;

  const actionData = {
    action: "star",
    messageId,
    phone: formattedPhone,
  };

  const result = await manageMessage(sessionId, actionData);

  return res.status(HTTP_STATUS.OK).json(
    ApiResponse.createSuccessResponse(result, {
      message: "Message starred successfully",
    })
  );
});

/**
 * Unstar message
 * POST /api/message/{messageId}/unstar
 */
export const unstarMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params; // Get messageId from URL parameters
  const { phone } = req.body; // Get phone from body
  const apiKey = req.apiKey;
  const sessionId = apiKey.sessionId;

  // Format phone number
  const formattedPhone = phone.trim().includes("@")
    ? phone.trim()
    : `${phone.trim()}@s.whatsapp.net`;

  const actionData = {
    action: "unstar",
    messageId,
    phone: formattedPhone,
  };

  const result = await manageMessage(sessionId, actionData);

  return res.status(HTTP_STATUS.OK).json(
    ApiResponse.createSuccessResponse(result, {
      message: "Message unstarred successfully",
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
  startTyping,
  stopTyping,
  sendLink,
  sendPoll,
  getSessionStatus,
  deleteMessage,
  unsendMessage,
  reactToMessage,
  editMessage,
  markMessageAsRead,
  starMessage,
  unstarMessage,
};
