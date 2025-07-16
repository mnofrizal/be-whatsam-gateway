# Socket.IO Implementation Plan - Real-time QR Code & Session Status

## 🎯 Overview

This document provides a comprehensive Socket.IO implementation plan for real-time QR code and session status updates in the WhatsApp Gateway PaaS. Backend team gets detailed implementation code, frontend team gets requirements and data structures.

## 📋 Current vs New Architecture

### Current Flow (Polling-Based)

```
Frontend → Backend API (every 1-2 seconds)
GET /api/v1/sessions/{id}/qr
GET /api/v1/sessions/{id}/status
```

### New Flow (Real-time WebSocket)

```
Frontend ↔ Backend WebSocket (instant updates)
Events: qr_code_updated, session_status_changed, connection_error
```

---

## 🔧 Backend Implementation (Backend Team)

### 1. Dependencies Installation

```bash
npm install socket.io
```

### 2. Enhanced Application Structure

**File: `src/app.js`** - Update main application file:

```javascript
import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import cors from "cors";
import helmet from "helmet";

// Import existing modules
import logger from "./utils/logger.js";
import { errorHandler } from "./middleware/error-handler.js";
import routes from "./routes/index.js";

// Import new Socket.IO configuration
import { initializeSocketIO } from "./socket/socket-server.js";

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 8000;

// Initialize Socket.IO with CORS
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Initialize Socket.IO handlers
initializeSocketIO(io);

// Make io available globally for services
app.set("io", io);

// Update helmet for WebSocket support
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: ["'self'", "ws:", "wss:"], // Allow WebSocket
        // ... other directives
      },
    },
  })
);

// Existing middleware
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Existing routes
app.use("/api", routes);
app.use(errorHandler);

// Start HTTP server (not app.listen)
httpServer.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📡 Socket.IO server initialized`);
});

export default app;
```

### 3. Socket.IO Server Configuration

**File: `src/socket/socket-server.js`** - Create new file:

```javascript
import jwt from "jsonwebtoken";
import logger from "../utils/logger.js";
import { ApiResponse } from "../utils/helpers.js";

// Store active connections by userId
const userConnections = new Map();

export const initializeSocketIO = (io) => {
  // Authentication middleware for Socket.IO
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth.token ||
        socket.handshake.headers.authorization?.replace("Bearer ", "");

      if (!token) {
        return next(new Error("Authentication token required"));
      }

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      socket.userEmail = decoded.email;

      logger.info(`Socket authenticated for user: ${decoded.email}`);
      next();
    } catch (error) {
      logger.error("Socket authentication failed:", error.message);
      next(new Error("Authentication failed"));
    }
  });

  // Handle new connections
  io.on("connection", (socket) => {
    const userId = socket.userId;
    logger.info(`User ${userId} connected via Socket.IO`);

    // Store connection
    userConnections.set(userId, socket);

    // Join user-specific room
    socket.join(`user_${userId}`);

    // Handle session subscription
    socket.on("subscribe_session", (sessionId) => {
      socket.join(`session_${sessionId}`);
      logger.info(`User ${userId} subscribed to session ${sessionId}`);
    });

    // Handle session unsubscription
    socket.on("unsubscribe_session", (sessionId) => {
      socket.leave(`session_${sessionId}`);
      logger.info(`User ${userId} unsubscribed from session ${sessionId}`);
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      userConnections.delete(userId);
      logger.info(`User ${userId} disconnected from Socket.IO`);
    });

    // Send initial connection confirmation
    socket.emit("connected", {
      message: "Socket.IO connection established",
      userId: userId,
      timestamp: new Date().toISOString(),
    });
  });

  logger.info("Socket.IO server initialized successfully");
};

// Utility functions for emitting events
export const emitToUser = (userId, event, data) => {
  const socket = userConnections.get(userId);
  if (socket) {
    socket.emit(event, data);
    return true;
  }
  return false;
};

export const emitToSession = (io, sessionId, event, data) => {
  io.to(`session_${sessionId}`).emit(event, data);
};

export const emitToAllUsers = (io, event, data) => {
  io.emit(event, data);
};
```

### 4. Enhanced Session Service Integration

**File: `src/services/session.service.js`** - Add Socket.IO integration:

```javascript
// Add this import at the top
import { emitToSession } from "../socket/socket-server.js";

// Modify connectSession function to emit real-time updates
export const connectSession = async (sessionId, userId) => {
  try {
    // ... existing code ...

    // Get io instance from app
    const io = global.app?.get("io");

    // Create session on worker
    const workerResponse = await ProxyService.createSessionOnWorker(
      worker.endpoint,
      {
        sessionId,
        userId,
        sessionName: session.name,
      }
    );

    // Emit QR code immediately if available
    if (workerResponse.qrCode && io) {
      emitToSession(io, sessionId, "qr_code_updated", {
        sessionId,
        qrCode: workerResponse.qrCode, // Raw QR string from worker
        status: "QR_REQUIRED",
        timestamp: new Date().toISOString(),
      });
    }

    // ... rest of existing code ...
  } catch (error) {
    // ... existing error handling ...
  }
};
```

### 5. Webhook Handler Enhancement

**File: `src/controllers/webhook.controller.js`** - Add Socket.IO events:

```javascript
// Add import
import { emitToSession } from '../socket/socket-server.js';

// Enhance handleSessionStatus method
static handleSessionStatus = asyncHandler(async (req, res) => {
  try {
    const { sessionId, status, qrCode, qrString, phoneNumber, displayName } = req.body;

    // ... existing validation and database update ...

    // Get io instance
    const io = req.app.get('io');

    // Emit real-time updates based on status
    if (status === 'QR_REQUIRED' && qrCode && io) {
      emitToSession(io, sessionId, 'qr_code_updated', {
        sessionId,
        qrCode, // Raw QR string from worker
        status: 'QR_REQUIRED',
        timestamp: new Date().toISOString()
      });
    }

    if (status === 'CONNECTED' && phoneNumber && io) {
      emitToSession(io, sessionId, 'session_status_changed', {
        sessionId,
        status: 'CONNECTED',
        phoneNumber,
        displayName: displayName || null, // WhatsApp display name
        timestamp: new Date().toISOString()
      });
    }

    if (status === 'DISCONNECTED' && io) {
      emitToSession(io, sessionId, 'session_status_changed', {
        sessionId,
        status: 'DISCONNECTED',
        timestamp: new Date().toISOString()
      });
    }

    // ... existing response ...
  } catch (error) {
    // ... existing error handling ...
  }
});
```

### 6. Package.json Update

Add Socket.IO dependency:

```json
{
  "dependencies": {
    "socket.io": "^4.7.5"
    // ... existing dependencies
  }
}
```

---

## 📱 Frontend Requirements (Frontend Team)

### 1. Frontend Dependencies

Frontend team needs to install:

```bash
npm install socket.io-client
```

### 2. Frontend Implementation Requirements

#### A. Socket.IO Client Setup

- Create a Socket.IO client service/hook
- Handle authentication with JWT token
- Implement connection management (connect/disconnect)
- Handle reconnection logic for network issues

#### B. Authentication Integration

- Pass JWT token during Socket.IO connection
- Handle authentication errors
- Implement token refresh if needed

#### C. Event Listeners Implementation

Frontend needs to listen for these events:

- `connected` - Connection confirmation
- `qr_code_updated` - New QR code available
- `session_status_changed` - Session status updates
- `connection_error` - Connection issues

#### D. Session Subscription Management

- Subscribe to specific session updates when user opens session page
- Unsubscribe when leaving session page
- Handle multiple session subscriptions

#### E. UI Integration Points

- QR code display component (auto-update when new QR received)
- Session status indicator (real-time status updates)
- Connection status indicator (show WebSocket connection state)
- Error handling for connection issues

### 3. Data Structures for Frontend

#### Connection Authentication

```javascript
// When connecting to Socket.IO
const connectionConfig = {
  auth: {
    token: "your-jwt-token-here",
  },
  transports: ["websocket", "polling"],
};
```

#### Event Data Structures

**A. Connection Confirmation Event**

```javascript
// Event: 'connected'
{
  message: "Socket.IO connection established",
  userId: "user-uuid-here",
  timestamp: "2024-01-15T10:30:00.000Z"
}
```

**B. QR Code Update Event**

```javascript
// Event: 'qr_code_updated'
{
  sessionId: "user123-personal",
  qrCode: "1@ABC123XYZ789...", // Raw QR string from Baileys
  status: "QR_REQUIRED",
  timestamp: "2024-01-15T10:30:00.000Z"
}
```

**C. Session Status Change Event**

```javascript
// Event: 'session_status_changed'
{
  sessionId: "user123-personal",
  status: "CONNECTED", // or "DISCONNECTED", "RECONNECTING", "ERROR"
  phoneNumber: "+6281234567890", // only when CONNECTED
  displayName: "John Doe", // WhatsApp display name when CONNECTED
  timestamp: "2024-01-15T10:30:00.000Z"
}
```

**D. Connection Error Event**

```javascript
// Event: 'connection_error'
{
  sessionId: "user123-personal",
  error: "Worker connection failed",
  timestamp: "2024-01-15T10:30:00.000Z"
}
```

### 4. Frontend Implementation Flow

#### A. Initial Setup

1. Initialize Socket.IO client with JWT authentication
2. Handle connection success/failure
3. Set up global event listeners

#### B. Session Page Integration

1. When user opens session page → emit `subscribe_session` with sessionId
2. Listen for `qr_code_updated` → update QR code display immediately
3. Listen for `session_status_changed` → update status indicator
4. When user leaves page → emit `unsubscribe_session`

#### C. Error Handling

1. Handle Socket.IO connection errors
2. Show connection status to user
3. Implement retry logic for failed connections
4. Fallback to polling if WebSocket fails

### 5. Frontend Integration Points

#### A. Session Creation Flow

```
1. User clicks "Create Session" → Normal API call
2. User clicks "Connect" → Normal API call + Socket.IO subscription
3. Backend processes → Emits QR code via WebSocket
4. Frontend receives QR → Display immediately (no polling needed)
5. User scans QR → Backend emits status change
6. Frontend receives status → Update UI immediately
```

#### B. Session Management Page

- Real-time session status updates for all user sessions
- No need for periodic API polling
- Instant notifications when sessions connect/disconnect

#### C. QR Code Display Component

- Remove polling logic
- Listen for `qr_code_updated` event
- Auto-refresh QR code display
- Show loading state until QR received

**Example React Component:**

```jsx
import React, { useState, useEffect } from "react";
import QRCode from "qrcode.react";
import { useSocket } from "../hooks/useSocket";

const QRCodeDisplay = ({ sessionId }) => {
  const [qrCode, setQrCode] = useState(null);
  const [loading, setLoading] = useState(true);
  const socket = useSocket();

  useEffect(() => {
    if (!socket || !sessionId) return;

    // Subscribe to session updates
    socket.emit("subscribe_session", sessionId);

    // Listen for QR code updates
    socket.on("qr_code_updated", (data) => {
      if (data.sessionId === sessionId) {
        setQrCode(data.qrCode); // Raw QR string from backend
        setLoading(false);
      }
    });

    // Listen for status changes (clear QR when connected)
    socket.on("session_status_changed", (data) => {
      if (data.sessionId === sessionId && data.status === "CONNECTED") {
        setQrCode(null);
        setLoading(false);
      }
    });

    // Cleanup on unmount
    return () => {
      socket.emit("unsubscribe_session", sessionId);
      socket.off("qr_code_updated");
      socket.off("session_status_changed");
    };
  }, [socket, sessionId]);

  if (loading) {
    return <div>Generating QR code...</div>;
  }

  if (!qrCode) {
    return <div>QR code not available</div>;
  }

  return (
    <div className="qr-code-container">
      <QRCode
        value={qrCode} // Raw QR string converted to QR image
        size={256}
        level="M"
        includeMargin={true}
      />
      <p>Scan this QR code with WhatsApp</p>
    </div>
  );
};

export default QRCodeDisplay;
```

---

## 🔄 Migration Strategy

### Phase 1: Backend Implementation

1. Install Socket.IO dependency
2. Update `src/app.js` with HTTP server and Socket.IO
3. Create `src/socket/socket-server.js`
4. Update session service and webhook controller
5. Test WebSocket connections

### Phase 2: Frontend Integration

1. Install socket.io-client
2. Create Socket.IO client service
3. Implement authentication flow
4. Add event listeners for QR and status updates
5. Update UI components to use real-time data

### Phase 3: Testing & Optimization

1. Test real-time QR code delivery
2. Test session status updates
3. Test connection handling and reconnection
4. Performance testing with multiple sessions
5. Error handling validation

---

## 🔒 Security Considerations

### Authentication

- JWT token validation for Socket.IO connections
- User can only subscribe to their own sessions
- Rate limiting for Socket.IO events

### Data Validation

- Validate all incoming Socket.IO events
- Sanitize data before emitting to clients
- Implement proper error handling

### Connection Management

- Limit concurrent connections per user
- Implement connection timeout handling
- Clean up resources on disconnect

---

## 📊 Benefits of Real-time Implementation

### Performance Improvements

- **Eliminate Polling:** No more 1-2 second API calls
- **Instant Updates:** QR codes and status changes delivered immediately
- **Reduced Server Load:** Fewer HTTP requests
- **Better UX:** Real-time feedback for users

### Scalability Benefits

- **Efficient Resource Usage:** WebSocket connections vs HTTP polling
- **Better Worker Communication:** Direct event-driven updates
- **Reduced Database Queries:** Less frequent status checks

---

## 🧪 Testing Requirements

### Backend Testing

- WebSocket connection authentication
- Event emission for QR codes and status changes
- Room-based broadcasting functionality
- Error handling and reconnection

### Frontend Testing

- Socket.IO client connection
- Event listener functionality
- UI updates on real-time events
- Error handling and fallback mechanisms

### Integration Testing

- End-to-end QR code delivery
- Session status update flow
- Multiple session management
- Connection failure scenarios

---

## 📋 Implementation Checklist

### Backend Team Tasks

- [ ] Install socket.io dependency
- [ ] Update src/app.js with HTTP server
- [ ] Create src/socket/socket-server.js
- [ ] Update session service with Socket.IO integration
- [ ] Update webhook controller with event emission
- [ ] Test WebSocket authentication
- [ ] Test event broadcasting

### Frontend Team Tasks

- [ ] Install socket.io-client dependency
- [ ] Create Socket.IO client service/hook
- [ ] Implement JWT authentication for WebSocket
- [ ] Add event listeners for QR and status updates
- [ ] Update QR code display component
- [ ] Update session status indicators
- [ ] Implement error handling and reconnection
- [ ] Remove existing polling logic

### Coordination Tasks

- [ ] Define event data structures (✅ Completed in this document)
- [ ] Test authentication flow between backend and frontend
- [ ] Validate real-time QR code delivery
- [ ] Test session status updates
- [ ] Performance testing with multiple sessions
- [ ] Error scenario testing

---

**Project:** WhatsApp Gateway PaaS  
**Feature:** Real-time Socket.IO Integration  
**Backend Implementation:** Detailed code provided  
**Frontend Requirements:** Specifications and data structures provided  
**Coordination:** Parallel development ready
