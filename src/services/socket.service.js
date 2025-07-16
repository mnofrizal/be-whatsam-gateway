import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import logger from "../utils/logger.js";

class SocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> socketId mapping
  }

  /**
   * Initialize Socket.IO server
   * @param {Object} server - HTTP server instance
   */
  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.CORS_ORIGIN || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true,
      },
      transports: ["websocket", "polling"],
    });

    // Authentication middleware
    this.io.use(this.authenticateSocket.bind(this));

    // Connection handling
    this.io.on("connection", this.handleConnection.bind(this));

    logger.info("Socket.IO server initialized");
  }

  /**
   * Authenticate socket connection using JWT
   */
  async authenticateSocket(socket, next) {
    try {
      const token =
        socket.handshake.auth.token ||
        socket.handshake.headers.authorization?.replace("Bearer ", "");

      if (!token) {
        return next(new Error("Authentication token required"));
      }

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Attach user info to socket
      socket.userId = decoded.userId;
      socket.userEmail = decoded.email;
      socket.userRole = decoded.role;

      logger.info(`Socket authenticated for user: ${decoded.email}`);
      next();
    } catch (error) {
      logger.error("Socket authentication failed:", error.message);
      next(new Error("Invalid authentication token"));
    }
  }

  /**
   * Handle new socket connection
   */
  handleConnection(socket) {
    const { userId, userEmail } = socket;

    logger.info("=== SOCKET.IO CONNECTION ESTABLISHED ===", {
      userId,
      userEmail,
      socketId: socket.id,
      totalConnectedUsers: this.connectedUsers.size,
      timestamp: new Date().toISOString(),
    });

    logger.info(`User connected via Socket.IO: ${userEmail} (${socket.id})`);

    // Store user connection
    this.connectedUsers.set(userId, socket.id);

    // Join user to their personal room
    socket.join(`user_${userId}`);

    // Handle session room joining
    socket.on("join_session", (sessionId) => {
      logger.info("=== SOCKET.IO JOIN_SESSION EVENT RECEIVED ===", {
        userId,
        userEmail,
        socketId: socket.id,
        sessionId,
        timestamp: new Date().toISOString(),
      });
      this.handleJoinSession(socket, sessionId);
    });

    // Handle session room leaving
    socket.on("leave_session", (sessionId) => {
      logger.info("=== SOCKET.IO LEAVE_SESSION EVENT RECEIVED ===", {
        userId,
        userEmail,
        socketId: socket.id,
        sessionId,
        timestamp: new Date().toISOString(),
      });
      this.handleLeaveSession(socket, sessionId);
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      logger.info("=== SOCKET.IO DISCONNECT EVENT ===", {
        userId,
        userEmail,
        socketId: socket.id,
        timestamp: new Date().toISOString(),
      });
      this.handleDisconnection(socket);
    });

    // Send connection confirmation
    socket.emit("connected", {
      message: "Connected to WhatsApp Gateway",
      userId,
      timestamp: new Date().toISOString(),
    });

    logger.info("=== SOCKET.IO CONNECTION SETUP COMPLETE ===", {
      userId,
      userEmail,
      socketId: socket.id,
      personalRoom: `user_${userId}`,
      eventsRegistered: ["join_session", "leave_session", "disconnect"],
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle user joining a session room
   */
  handleJoinSession(socket, sessionId) {
    const { userId, userEmail } = socket;

    logger.info("=== SOCKET.IO ROOM JOIN REQUEST ===", {
      userId,
      userEmail,
      socketId: socket.id,
      sessionId,
      requestedRoom: `session_${sessionId}`,
      timestamp: new Date().toISOString(),
    });

    // Validate session ownership (basic check)
    if (!sessionId || !sessionId.startsWith(`${userId}-`)) {
      logger.error("Session join validation failed:", {
        userId,
        sessionId,
        reason: "Invalid session ID or access denied",
        sessionIdStartsWithUserId: sessionId
          ? sessionId.startsWith(`${userId}-`)
          : false,
      });

      socket.emit("error", {
        message: "Invalid session ID or access denied",
        code: "INVALID_SESSION",
      });
      return;
    }

    const roomName = `session_${sessionId}`;

    // Get room info before joining
    const roomBefore = this.io.sockets.adapter.rooms.get(roomName);
    const socketCountBefore = roomBefore ? roomBefore.size : 0;

    socket.join(roomName);

    // Get room info after joining
    const roomAfter = this.io.sockets.adapter.rooms.get(roomName);
    const socketCountAfter = roomAfter ? roomAfter.size : 0;
    const socketsInRoom = roomAfter ? Array.from(roomAfter) : [];

    logger.info("=== SOCKET.IO ROOM JOIN SUCCESS ===", {
      userId,
      userEmail,
      socketId: socket.id,
      sessionId,
      roomName,
      socketCountBefore,
      socketCountAfter,
      socketsInRoom,
      joinSuccessful: socketCountAfter > socketCountBefore,
      timestamp: new Date().toISOString(),
    });

    logger.info(
      `User ${userEmail} joined session room: ${sessionId} (${socketCountAfter} total sockets in room)`
    );

    socket.emit("session_joined", {
      sessionId,
      message: "Joined session room successfully",
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle user leaving a session room
   */
  handleLeaveSession(socket, sessionId) {
    const { userId, userEmail } = socket;
    const roomName = `session_${sessionId}`;

    // Get room info before leaving
    const roomBefore = this.io.sockets.adapter.rooms.get(roomName);
    const socketCountBefore = roomBefore ? roomBefore.size : 0;

    socket.leave(roomName);

    // Get room info after leaving
    const roomAfter = this.io.sockets.adapter.rooms.get(roomName);
    const socketCountAfter = roomAfter ? roomAfter.size : 0;
    const socketsInRoom = roomAfter ? Array.from(roomAfter) : [];

    logger.info("=== SOCKET.IO ROOM LEAVE ===", {
      userId,
      userEmail,
      socketId: socket.id,
      sessionId,
      roomName,
      socketCountBefore,
      socketCountAfter,
      socketsInRoom,
      leaveSuccessful: socketCountAfter < socketCountBefore,
      timestamp: new Date().toISOString(),
    });

    logger.info(
      `User ${userEmail} left session room: ${sessionId} (${socketCountAfter} remaining sockets in room)`
    );

    socket.emit("session_left", {
      sessionId,
      message: "Left session room successfully",
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle socket disconnection
   */
  handleDisconnection(socket) {
    const { userId, userEmail } = socket;

    logger.info(
      `User disconnected from Socket.IO: ${userEmail} (${socket.id})`
    );

    // Remove user connection
    this.connectedUsers.delete(userId);
  }

  /**
   * Emit QR code update to session room
   */
  emitQRCodeUpdate(sessionId, qrCode) {
    if (!this.io) {
      logger.error("Socket.IO not initialized - cannot emit QR code update");
      return;
    }

    const eventData = {
      sessionId,
      qrCode, // Raw QR string from Baileys
      status: "QR_REQUIRED",
      timestamp: new Date().toISOString(),
    };

    const roomName = `session_${sessionId}`;
    const connectedSockets = this.io.sockets.adapter.rooms.get(roomName);
    const socketCount = connectedSockets ? connectedSockets.size : 0;

    // Enhanced logging for debugging frontend reception
    logger.info("=== SOCKET.IO QR CODE EMISSION ===", {
      sessionId,
      roomName,
      socketCount,
      connectedSockets: connectedSockets ? Array.from(connectedSockets) : [],
      eventName: "qr_code_updated",
      payloadSize: JSON.stringify(eventData).length,
      qrCodeLength: qrCode ? qrCode.length : 0,
      qrCodeSample: qrCode ? qrCode.substring(0, 50) + "..." : null,
      timestamp: eventData.timestamp,
    });

    // Log the complete payload being sent to frontend
    logger.info("QR Code payload being emitted to frontend:", {
      eventData,
      totalConnectedUsers: this.connectedUsers.size,
      connectedUserIds: Array.from(this.connectedUsers.keys()),
    });

    this.io.to(roomName).emit("qr_code_updated", eventData);

    logger.info(
      `QR code emitted to ${socketCount} connected sockets in room: ${roomName}`
    );
  }

  /**
   * Emit session status change to session room
   */
  emitSessionStatusChange(
    sessionId,
    status,
    phoneNumber = null,
    displayName = null
  ) {
    if (!this.io) {
      logger.error(
        "Socket.IO not initialized - cannot emit session status change"
      );
      return;
    }

    const eventData = {
      sessionId,
      status,
      timestamp: new Date().toISOString(),
    };

    if (phoneNumber) eventData.phoneNumber = phoneNumber;
    if (displayName) eventData.displayName = displayName; // WhatsApp display name

    const roomName = `session_${sessionId}`;
    const connectedSockets = this.io.sockets.adapter.rooms.get(roomName);
    const socketCount = connectedSockets ? connectedSockets.size : 0;

    // Enhanced logging for debugging frontend reception
    logger.info("=== SOCKET.IO SESSION STATUS EMISSION ===", {
      sessionId,
      status,
      roomName,
      socketCount,
      connectedSockets: connectedSockets ? Array.from(connectedSockets) : [],
      eventName: "session_status_changed",
      hasPhoneNumber: !!phoneNumber,
      hasDisplayName: !!displayName,
      payloadSize: JSON.stringify(eventData).length,
      timestamp: eventData.timestamp,
    });

    // Log the complete payload being sent to frontend
    logger.info("Session status payload being emitted to frontend:", {
      eventData,
      totalConnectedUsers: this.connectedUsers.size,
      connectedUserIds: Array.from(this.connectedUsers.keys()),
    });

    this.io.to(roomName).emit("session_status_changed", eventData);

    logger.info(
      `Session status emitted to ${socketCount} connected sockets in room: ${roomName}`
    );
  }

  /**
   * Emit message status update to session room
   */
  emitMessageStatusUpdate(sessionId, messageId, status, deliveredAt = null) {
    if (!this.io) {
      logger.error(
        "Socket.IO not initialized - cannot emit message status update"
      );
      return;
    }

    const eventData = {
      sessionId,
      messageId,
      status,
      timestamp: new Date().toISOString(),
    };

    if (deliveredAt) eventData.deliveredAt = deliveredAt;

    const roomName = `session_${sessionId}`;
    const connectedSockets = this.io.sockets.adapter.rooms.get(roomName);
    const socketCount = connectedSockets ? connectedSockets.size : 0;

    // Enhanced logging for debugging frontend reception
    logger.info("=== SOCKET.IO MESSAGE STATUS EMISSION ===", {
      sessionId,
      messageId,
      status,
      roomName,
      socketCount,
      connectedSockets: connectedSockets ? Array.from(connectedSockets) : [],
      eventName: "message_status_updated",
      hasDeliveredAt: !!deliveredAt,
      payloadSize: JSON.stringify(eventData).length,
      timestamp: eventData.timestamp,
    });

    this.io.to(roomName).emit("message_status_updated", eventData);

    logger.info(
      `Message status emitted to ${socketCount} connected sockets in room: ${roomName}`
    );
  }

  /**
   * Emit worker status update to admin users
   */
  emitWorkerStatusUpdate(workerId, status, metrics = null) {
    if (!this.io) return;

    const eventData = {
      workerId,
      status,
      timestamp: new Date().toISOString(),
    };

    if (metrics) eventData.metrics = metrics;

    // Emit to admin room (users with ADMINISTRATOR role)
    this.io.emit("worker_status_updated", eventData);
    logger.info(`Worker status updated for ${workerId}: ${status}`);
  }

  /**
   * Get Socket.IO instance
   */
  getIO() {
    return this.io;
  }

  /**
   * Get connected users count
   */
  getConnectedUsersCount() {
    return this.connectedUsers.size;
  }

  /**
   * Check if user is connected
   */
  isUserConnected(userId) {
    return this.connectedUsers.has(userId);
  }
}

// Export singleton instance
export default new SocketService();
