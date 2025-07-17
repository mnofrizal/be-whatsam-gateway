// API Controller - External API endpoints for third-party integrations
// These endpoints use API key authentication and provide simple message sending
import { asyncHandler } from "../middleware/error-handler.js";
import { ApiResponse } from "../utils/helpers.js";
import { HTTP_STATUS } from "../utils/constants.js";
import SessionService from "../services/session.service.js";
import prisma from "../database/client.js";

/**
 * Send text message
 * POST /api/v1/sendText
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
 * POST /api/v1/sendImage
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
 * POST /api/v1/sendFile
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
 * POST /api/v1/sendVoice
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
 * POST /api/v1/sendVideo
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
 * POST /api/v1/sendLocation
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
 * POST /api/v1/sendContactVcard
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
 * POST /api/v1/sendSeen
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
 * GET /api/v1/session/status
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
};
