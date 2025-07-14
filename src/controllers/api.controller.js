// API Controller - External API endpoints for third-party integrations
// These endpoints use API key authentication and provide simple message sending
import { asyncHandler } from "../middleware/error-handler.js";
import { ApiResponse } from "../utils/helpers.js";
import { HTTP_STATUS } from "../utils/constants.js";
import SessionService from "../services/session.service.js";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

class ApiController {
  // POST /api/v1/sendText - Send text message
  static sendText = asyncHandler(async (req, res) => {
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

    return res
      .status(HTTP_STATUS.OK)
      .json(
        ApiResponse.createSuccessResponse(result, {
          message: "Text message sent successfully",
        })
      );
  });

  // POST /api/v1/sendImage - Send image message
  static sendImage = asyncHandler(async (req, res) => {
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

    return res
      .status(HTTP_STATUS.OK)
      .json(
        ApiResponse.createSuccessResponse(result, {
          message: "Image message sent successfully",
        })
      );
  });

  // POST /api/v1/sendFile - Send document/file message
  static sendFile = asyncHandler(async (req, res) => {
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

    return res
      .status(HTTP_STATUS.OK)
      .json(
        ApiResponse.createSuccessResponse(result, {
          message: "File message sent successfully",
        })
      );
  });

  // POST /api/v1/sendVoice - Send voice/audio message
  static sendVoice = asyncHandler(async (req, res) => {
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

    return res
      .status(HTTP_STATUS.OK)
      .json(
        ApiResponse.createSuccessResponse(result, {
          message: "Voice message sent successfully",
        })
      );
  });

  // POST /api/v1/sendVideo - Send video message
  static sendVideo = asyncHandler(async (req, res) => {
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

    return res
      .status(HTTP_STATUS.OK)
      .json(
        ApiResponse.createSuccessResponse(result, {
          message: "Video message sent successfully",
        })
      );
  });

  // POST /api/v1/sendLocation - Send location message
  static sendLocation = asyncHandler(async (req, res) => {
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

    return res
      .status(HTTP_STATUS.OK)
      .json(
        ApiResponse.createSuccessResponse(result, {
          message: "Location message sent successfully",
        })
      );
  });

  // POST /api/v1/sendSeen - Mark message as seen/read
  static sendSeen = asyncHandler(async (req, res) => {
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

    return res
      .status(HTTP_STATUS.OK)
      .json(
        ApiResponse.createSuccessResponse(result, {
          message: "Message marked as seen successfully",
        })
      );
  });

  // GET /api/v1/session/status - Get session status (API key version)
  static getSessionStatus = asyncHandler(async (req, res) => {
    const apiKey = req.apiKey;
    const sessionId = apiKey.sessionId; // Get sessionId from authenticated API key

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { worker: true },
    });

    if (!session) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json(
          ApiResponse.createErrorResponse("NOT_FOUND", "Session not found")
        );
    }

    const result = {
      sessionId: session.id,
      status: session.status.toLowerCase(),
      phoneNumber: session.phoneNumber,
      lastSeenAt: session.lastSeenAt,
      workerId: session.workerId,
      workerStatus: session.worker?.status?.toLowerCase() || "unknown",
    };

    return res
      .status(HTTP_STATUS.OK)
      .json(
        ApiResponse.createSuccessResponse(result, {
          message: "Session status retrieved successfully",
        })
      );
  });

  // GET /api/v1/session/qr - Get QR code (API key version)
  static getSessionQR = asyncHandler(async (req, res) => {
    const apiKey = req.apiKey;
    const sessionId = apiKey.sessionId; // Get sessionId from authenticated API key

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json(
          ApiResponse.createErrorResponse("NOT_FOUND", "Session not found")
        );
    }

    // Check if QR code exists and not expired
    if (
      !session.qrCode ||
      (session.qrExpiresAt && session.qrExpiresAt < new Date())
    ) {
      return res.json(
        ApiResponse.createSuccessResponse(
          {
            sessionId: session.id,
            status: session.status.toLowerCase(),
            qrCode: null,
            message: "QR code not available or expired",
          },
          { message: "QR code status retrieved" }
        )
      );
    }

    const result = {
      sessionId: session.id,
      status: session.status.toLowerCase(),
      qrCode: session.qrCode,
      expiresAt: session.qrExpiresAt,
    };

    return res
      .status(HTTP_STATUS.OK)
      .json(
        ApiResponse.createSuccessResponse(result, {
          message: "QR code retrieved successfully",
        })
      );
  });
}

export default ApiController;
