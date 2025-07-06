# WhatsApp Gateway Worker Integration Specification

## 🎯 Overview

This document specifies the requirements for the **Worker Endpoint Project** to integrate with the WhatsApp Gateway PaaS Backend. The Worker project should be a standalone Node.js application that handles WhatsApp connections using Baileys and exposes REST API endpoints for Backend communication.

## 📡 Required Worker Endpoints

### 1. Health & Status Endpoints

#### Health Check

```http
GET /health
Authorization: Bearer {worker-token}

Response:
{
  "success": true,
  "data": {
    "status": "online",
    "sessionCount": 25,
    "cpuUsage": 45.5,
    "memoryUsage": 67.8,
    "uptime": 3600,
    "maxSessions": 50,
    "availableSlots": 25
  }
}
```

#### Worker Information

```http
GET /info
Authorization: Bearer {worker-token}

Response:
{
  "success": true,
  "data": {
    "workerId": "worker-001",
    "version": "1.0.0",
    "environment": "production",
    "capabilities": ["text", "image", "document", "audio"],
    "baileys_version": "6.5.0"
  }
}
```

### 2. Session Management Endpoints

#### Create Session

```http
POST /api/session/create
Authorization: Bearer {worker-token}
Content-Type: application/json

Body:
{
  "sessionId": "user123-personal",
  "userId": "user123",
  "sessionName": "Personal WhatsApp"
}

Response:
{
  "success": true,
  "data": {
    "sessionId": "user123-personal",
    "status": "initializing"
  }
}
```

#### Get Session Status

```http
GET /api/session/{sessionId}/status
Authorization: Bearer {worker-token}

Response:
{
  "success": true,
  "data": {
    "sessionId": "user123-personal",
    "status": "connected", // "initializing", "qr_required", "connected", "disconnected", "error"
    "phoneNumber": "+6281234567890", // when connected
    "qrCode": "data:image/png;base64,...", // when status is qr_required
    "qrString": "1@ABC123XYZ...", // raw QR string
    "lastActivity": "2024-01-15T10:30:00Z"
  }
}
```

#### Delete Session

```http
DELETE /api/session/{sessionId}
Authorization: Bearer {worker-token}

Response:
{
  "success": true,
  "message": "Session deleted successfully"
}
```

#### Restart Session

```http
POST /api/session/{sessionId}/restart
Authorization: Bearer {worker-token}

Response:
{
  "success": true,
  "data": {
    "sessionId": "user123-personal",
    "status": "initializing"
  }
}
```

#### Disconnect Session

```http
POST /api/session/{sessionId}/disconnect
Authorization: Bearer {worker-token}

Response:
{
  "success": true,
  "message": "Session disconnected"
}
```

#### Logout Session

```http
POST /api/session/{sessionId}/logout
Authorization: Bearer {worker-token}

Response:
{
  "success": true,
  "message": "Session logged out successfully"
}
```

### 3. Message Endpoints

#### Send Message

```http
POST /api/session/{sessionId}/send
Authorization: Bearer {worker-token}
Content-Type: application/json

Body:
{
  "to": "6281234567890", // or "6281234567890@s.whatsapp.net"
  "type": "text", // "text", "image", "document", "audio", "video"
  "message": "Hello World!",
  "media": { // optional for media messages
    "url": "https://example.com/image.jpg",
    "filename": "image.jpg",
    "caption": "Image caption"
  }
}

Response:
{
  "success": true,
  "data": {
    "messageId": "msg_12345",
    "status": "sent",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

#### Get Message History (Optional)

```http
GET /api/session/{sessionId}/messages?limit=50&offset=0
Authorization: Bearer {worker-token}

Response:
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "msg_001",
        "direction": "outbound",
        "from": "6281234567890@s.whatsapp.net",
        "to": "6289876543210@s.whatsapp.net",
        "type": "text",
        "content": "Hello!",
        "timestamp": "2024-01-15T10:30:00Z",
        "status": "delivered"
      }
    ],
    "total": 150,
    "hasMore": true
  }
}
```

## 🔄 Worker-Backend Communication Protocol

### 1. Worker Registration (Self-Registration)

The Worker must register itself with the Backend on startup:

```http
POST {backend-url}/api/v1/admin/workers/register
Authorization: Bearer {worker-token}
Content-Type: application/json

Body:
{
  "workerId": "worker-001",
  "endpoint": "http://192.168.1.100:8001",
  "maxSessions": 50,
  "version": "1.0.0",
  "environment": "production"
}
```

### 2. Heartbeat Reporting

The Worker must send heartbeat every 30 seconds:

```http
PUT {backend-url}/api/v1/admin/workers/{workerId}/heartbeat
Authorization: Bearer {worker-token}
Content-Type: application/json

Body:
{
  "status": "online",
  "metrics": {
    "sessionCount": 25,
    "cpuUsage": 45.5,
    "memoryUsage": 67.8,
    "uptime": 3600,
    "activeConnections": 23,
    "sessionBreakdown": {
      "connected": 20,
      "disconnected": 3,
      "qr_required": 2,
      "error": 0
    }
  }
}
```

### 3. Status Updates (Webhook Callbacks)

#### Session Status Updates

```http
POST {backend-url}/api/v1/webhooks/session-status
Authorization: Bearer {worker-token}
Content-Type: application/json

Body:
{
  "sessionId": "user123-personal",
  "status": "connected", // "qr_required", "connected", "disconnected", "error"
  "phoneNumber": "+6281234567890", // when connected
  "qrCode": "data:image/png;base64,...", // when qr_required
  "qrString": "1@ABC123XYZ...",
  "timestamp": "2024-01-15T10:30:00Z",
  "error": "Connection failed" // when status is error
}
```

#### Message Status Updates

```http
POST {backend-url}/api/v1/webhooks/message-status
Authorization: Bearer {worker-token}
Content-Type: application/json

Body:
{
  "sessionId": "user123-personal",
  "messageId": "msg_12345",
  "status": "delivered", // "sent", "delivered", "read", "failed"
  "timestamp": "2024-01-15T10:30:00Z",
  "error": "Message failed to send" // when status is failed
}
```

## 🏗️ Recommended Worker Project Architecture

### Project Structure

```
worker-project/
├── src/
│   ├── controllers/
│   │   ├── health.controller.js      # Health and info endpoints
│   │   ├── session.controller.js     # Session management
│   │   └── message.controller.js     # Message handling
│   ├── services/
│   │   ├── baileys.service.js        # Baileys integration
│   │   ├── session.service.js        # Session state management
│   │   ├── backend.service.js        # Backend communication
│   │   └── storage.service.js        # Local data storage
│   ├── middleware/
│   │   ├── auth.js                   # Worker token validation
│   │   └── error-handler.js          # Error handling
│   ├── utils/
│   │   ├── logger.js                 # Winston logger
│   │   └── qr-generator.js           # QR code generation
│   └── app.js                        # Express server setup
├── sessions/                         # Baileys session storage
├── media/                           # Media file storage
├── logs/                            # Application logs
├── package.json
├── .env
└── README.md
```

### Core Dependencies

```json
{
  "dependencies": {
    "@whiskeysockets/baileys": "^6.5.0",
    "express": "^4.18.2",
    "axios": "^1.6.0",
    "qrcode": "^1.5.3",
    "winston": "^3.11.0",
    "multer": "^1.4.5",
    "sharp": "^0.32.6",
    "node-cron": "^3.0.3"
  }
}
```

## 🔧 Implementation Requirements

### 1. Baileys Integration Service

```javascript
// src/services/baileys.service.js
import { makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import QRCode from 'qrcode';

class BaileysService {
  constructor() {
    this.sessions = new Map(); // Store active sessions
  }

  async createSession(sessionId, userId) {
    try {
      const { state, saveCreds } = await useMultiFileAuthState(`./sessions/${sessionId}`);

      const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' })
      });

      // Handle connection updates
      sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          // Generate QR code and report to backend
          const qrCodeDataURL = await QRCode.toDataURL(qr);
          await this.reportSessionStatus(sessionId, {
            status: 'qr_required',
            qrCode: qrCodeDataURL,
            qrString: qr
          });
        }

        if (connection === 'open') {
          const phoneNumber = sock.user?.id?.split(':')[0];
          await this.reportSessionStatus(sessionId, {
            status: 'connected',
            phoneNumber: `+${phoneNumber}`
          });
        }

        if (connection === 'close') {
          const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
          if (shouldReconnect) {
            // Attempt reconnection
            setTimeout(() => this.createSession(sessionId, userId), 5000);
          } else {
            await this.reportSessionStatus(sessionId, {
              status: 'disconnected'
            });
          }
        }
      });

      // Handle credentials update
      sock.ev.on('creds.update', saveCreds);

      // Store session
      this.sessions.set(sessionId, {
        sock,
        userId,
        status: 'initializing',
        createdAt: new Date()
      });

      return { success: true, sessionId };
    } catch (error) {
      await this.reportSessionStatus(sessionId, {
        status: 'error',
        error: error.message
      });
      throw error;
    }
  }

  async sendMessage(sessionId, to, message) {
    const session = this.sessions.get(sessionId);
    if (!session || !session.sock) {
      throw new Error('Session not found or not connected');
    }

    try {
      // Format phone number
      const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;

      // Send message
      const result = await session.sock.sendMessage(jid, { text: message });

      return {
        messageId: result.key.id,
        status: 'sent',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Failed to send message: ${error.message}`);
    }
  }

  async disconnectSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session || !session.sock) {
      throw new Error('Session not found');
    }

    try {
      // Close the connection without logging out
      await session.sock.ws.close();

      // Update session status
      session.status = 'disconnected';

      // Report to backend
      await this.reportSessionStatus(sessionId, {
        status: 'disconnected'
      });

      return { success: true };
    } catch (error) {
      throw new Error(`Failed to disconnect session: ${error.message}`);
    }
  }

  async logoutSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session || !session.sock) {
      throw new Error('Session not found');
    }

    try {
      // Logout from WhatsApp (this will delete auth credentials)
      await session.sock.logout();

      // Remove session from memory
      this.sessions.delete(sessionId);

      // Delete session files from storage
      const fs = await import('fs/promises');
      const path = await import('path');
      const sessionPath = path.join('./sessions', sessionId);

      try {
        await fs.rmdir(sessionPath, { recursive: true });
      } catch (error) {
        console.warn(`Failed to delete session files: ${error.message}`);
      }

      // Report to backend
      await this.reportSessionStatus(sessionId, {
        status: 'logged_out'
      });

      return { success: true };
    } catch (error) {
      throw new Error(`Failed to logout session: ${error.message}`);
    }
  }

  async destroySession(sessionId) {
    // This is used for DELETE operation - complete cleanup
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: true }; // Already destroyed
    }

    try {
      // Close connection if exists
      if (session.sock) {
        await session.sock.ws.close();
      }

      // Remove from memory
      this.sessions.delete(sessionId);

      // Delete session files
      const fs = await import('fs/promises');
      const path = await import('path');
      const sessionPath = path.join('./sessions', sessionId);

      try {
        await fs.rmdir(sessionPath, { recursive: true });
      } catch (error) {
        console.warn(`Failed to delete session files: ${error.message}`);
      }

      return { success: true };
    } catch (error) {
      throw new Error(`Failed to destroy session: ${error.message}`);
    }
  }

  async reportSessionStatus(sessionId, statusData) {
    // Report to backend via webhook
    await backendService.reportSessionStatus(sessionId, statusData);
  }
}

export default new BaileysService();
```

### 2. Backend Communication Service

```javascript
// src/services/backend.service.js
import axios from "axios";

class BackendService {
  constructor() {
    this.backendUrl = process.env.BACKEND_URL;
    this.authToken = process.env.BACKEND_AUTH_TOKEN;
    this.workerId = process.env.WORKER_ID;
  }

  async registerWorker() {
    try {
      const response = await axios.post(
        `${this.backendUrl}/api/v1/admin/workers/register`,
        {
          workerId: this.workerId,
          endpoint: `http://localhost:${process.env.PORT}`,
          maxSessions: parseInt(process.env.MAX_SESSIONS) || 50,
          version: process.env.npm_package_version,
          environment: process.env.NODE_ENV,
        },
        {
          headers: {
            Authorization: `Bearer ${this.authToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("Worker registered successfully:", response.data);
    } catch (error) {
      console.error("Failed to register worker:", error.message);
      throw error;
    }
  }

  async sendHeartbeat(metrics) {
    try {
      await axios.put(
        `${this.backendUrl}/api/v1/admin/workers/${this.workerId}/heartbeat`,
        {
          status: "online",
          metrics,
        },
        {
          headers: {
            Authorization: `Bearer ${this.authToken}`,
            "Content-Type": "application/json",
          },
        }
      );
    } catch (error) {
      console.error("Failed to send heartbeat:", error.message);
    }
  }

  async reportSessionStatus(sessionId, statusData) {
    try {
      await axios.post(
        `${this.backendUrl}/api/v1/webhooks/session-status`,
        {
          sessionId,
          ...statusData,
          timestamp: new Date().toISOString(),
        },
        {
          headers: {
            Authorization: `Bearer ${this.authToken}`,
            "Content-Type": "application/json",
          },
        }
      );
    } catch (error) {
      console.error("Failed to report session status:", error.message);
    }
  }

  async reportMessageStatus(sessionId, messageId, status, error = null) {
    try {
      await axios.post(
        `${this.backendUrl}/api/v1/webhooks/message-status`,
        {
          sessionId,
          messageId,
          status,
          error,
          timestamp: new Date().toISOString(),
        },
        {
          headers: {
            Authorization: `Bearer ${this.authToken}`,
            "Content-Type": "application/json",
          },
        }
      );
    } catch (error) {
      console.error("Failed to report message status:", error.message);
    }
  }
}

export default new BackendService();
```

### 3. Session Controller

```javascript
// src/controllers/session.controller.js
import baileysService from "../services/baileys.service.js";

class SessionController {
  async createSession(req, res) {
    try {
      const { sessionId, userId, sessionName } = req.body;

      // Validate input
      if (!sessionId || !userId) {
        return res.status(400).json({
          success: false,
          error: "sessionId and userId are required",
        });
      }

      // Check if session already exists
      if (baileysService.sessions.has(sessionId)) {
        return res.status(409).json({
          success: false,
          error: "Session already exists",
        });
      }

      // Create session
      const result = await baileysService.createSession(sessionId, userId);

      res.status(201).json({
        success: true,
        data: {
          sessionId,
          status: "initializing",
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  async getSessionStatus(req, res) {
    try {
      const { sessionId } = req.params;
      const session = baileysService.sessions.get(sessionId);

      if (!session) {
        return res.status(404).json({
          success: false,
          error: "Session not found",
        });
      }

      res.json({
        success: true,
        data: {
          sessionId,
          status: session.status,
          phoneNumber: session.phoneNumber,
          qrCode: session.qrCode,
          lastActivity: session.lastActivity,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  async deleteSession(req, res) {
    try {
      const { sessionId } = req.params;

      await baileysService.destroySession(sessionId);

      res.json({
        success: true,
        message: "Session deleted successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  async restartSession(req, res) {
    try {
      const { sessionId } = req.params;

      // Get existing session info
      const existingSession = baileysService.sessions.get(sessionId);
      if (!existingSession) {
        return res.status(404).json({
          success: false,
          error: "Session not found",
        });
      }

      // Destroy and recreate
      await baileysService.destroySession(sessionId);
      await baileysService.createSession(sessionId, existingSession.userId);

      res.json({
        success: true,
        data: {
          sessionId,
          status: "initializing",
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  async disconnectSession(req, res) {
    try {
      const { sessionId } = req.params;

      await baileysService.disconnectSession(sessionId);

      res.json({
        success: true,
        message: "Session disconnected",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  async logoutSession(req, res) {
    try {
      const { sessionId } = req.params;

      await baileysService.logoutSession(sessionId);

      res.json({
        success: true,
        message: "Session logged out successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
}

export default new SessionController();
```

## 🔒 Security Requirements

### Authentication Middleware

```javascript
// src/middleware/auth.js
const authenticateBackend = (req, res, next) => {
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (token !== process.env.BACKEND_AUTH_TOKEN) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized",
    });
  }

  next();
};

export default authenticateBackend;
```

### Environment Variables

```bash
# Worker .env file
WORKER_ID=worker-001
PORT=8001
NODE_ENV=production
MAX_SESSIONS=50

# Backend communication
BACKEND_URL=http://localhost:8000
BACKEND_AUTH_TOKEN=worker-secret-token

# Storage paths
SESSION_STORAGE_PATH=./sessions
MEDIA_STORAGE_PATH=./media
LOG_LEVEL=info
```

## 🚀 Startup Sequence

```javascript
// src/app.js
import express from "express";
import backendService from "./services/backend.service.js";
import sessionController from "./controllers/session.controller.js";
import healthController from "./controllers/health.controller.js";
import messageController from "./controllers/message.controller.js";
import authenticateBackend from "./middleware/auth.js";

const app = express();
const PORT = process.env.PORT || 8001;
const WORKER_ID = process.env.WORKER_ID;

// Middleware
app.use(express.json());
app.use(authenticateBackend);

// Routes
app.get("/api/health", healthController.getHealth);
app.get("/api/info", healthController.getInfo);

app.post("/api/session/create", sessionController.createSession);
app.get("/api/session/:sessionId/status", sessionController.getSessionStatus);
app.delete("/api/session/:sessionId", sessionController.deleteSession);
app.post("/api/session/:sessionId/restart", sessionController.restartSession);
app.post(
  "/api/session/:sessionId/disconnect",
  sessionController.disconnectSession
);
app.post("/api/session/:sessionId/logout", sessionController.logoutSession);

app.post("/api/session/:sessionId/send", messageController.sendMessage);
app.get("/api/session/:sessionId/messages", messageController.getMessages);

async function startWorker() {
  try {
    // 1. Start Express server
    const server = app.listen(PORT, () => {
      console.log(`Worker ${WORKER_ID} listening on port ${PORT}`);
    });

    // 2. Register with Backend
    await backendService.registerWorker();

    // 3. Start heartbeat interval
    setInterval(async () => {
      const metrics = await getWorkerMetrics();
      await backendService.sendHeartbeat(metrics);
    }, 30000);

    // 4. Load persisted sessions (if any)
    await loadPersistedSessions();

    console.log("Worker started successfully");
  } catch (error) {
    console.error("Failed to start worker:", error);
    process.exit(1);
  }
}

async function getWorkerMetrics() {
  const memUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();

  return {
    sessionCount: baileysService.sessions.size,
    cpuUsage: (cpuUsage.user + cpuUsage.system) / 1000000, // Convert to seconds
    memoryUsage: memUsage.heapUsed / 1024 / 1024, // Convert to MB
    uptime: process.uptime(),
    activeConnections: Array.from(baileysService.sessions.values()).filter(
      (s) => s.status === "connected"
    ).length,
    sessionBreakdown: {
      connected: Array.from(baileysService.sessions.values()).filter(
        (s) => s.status === "connected"
      ).length,
      disconnected: Array.from(baileysService.sessions.values()).filter(
        (s) => s.status === "disconnected"
      ).length,
      qr_required: Array.from(baileysService.sessions.values()).filter(
        (s) => s.status === "qr_required"
      ).length,
      error: Array.from(baileysService.sessions.values()).filter(
        (s) => s.status === "error"
      ).length,
    },
  };
}

async function loadPersistedSessions() {
  // Implementation to load existing sessions from storage
  // This should scan the sessions directory and restore active sessions
}

startWorker();
```

## 🔄 Logout vs Disconnect vs Delete - Responsibility Matrix

| Operation      | Backend Responsibility                    | Worker Responsibility                                      | Description                                                    |
| -------------- | ----------------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------- |
| **Logout**     | Route request to worker, update DB status | Execute WhatsApp logout, delete auth files, report status  | Permanently logs out from WhatsApp, requires re-authentication |
| **Disconnect** | Route request to worker, update DB status | Close WebSocket connection, keep auth files, report status | Temporarily disconnects, can reconnect without QR              |
| **Delete**     | Remove from DB, cleanup routing           | Destroy session completely, delete all files               | Complete session removal from system                           |

### Logout Flow Explanation

**Backend handles the business logic:**

- User clicks "Logout" in frontend
- Backend validates user permissions
- Backend routes logout request to appropriate worker
- Backend updates session status in database
- Backend cleans up session routing in Redis

**Worker handles the WhatsApp operation:**

- Receives logout request from Backend
- Calls `sock.logout()` to logout from WhatsApp
- Deletes Baileys authentication files
- Reports "logged_out" status back to Backend
- Removes session from worker memory

**Key Difference:**

- **Logout**: Permanent WhatsApp logout, deletes auth credentials, requires new QR scan
- **Disconnect**: Temporary disconnection, keeps auth credentials, can reconnect automatically
- **Delete**: Complete session removal from both Backend and Worker

### Backend Implementation for Logout

```javascript
// Backend: src/controllers/session.controller.js
static logoutSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const userId = req.user.userId;

  // Validate session ownership
  const session = await prisma.session.findFirst({
    where: { id: sessionId, userId },
    include: { worker: true }
  });

  if (!session) {
    return res.status(404).json(
      ApiResponse.createErrorResponse("Session not found")
    );
  }

  if (!session.worker) {
    return res.status(400).json(
      ApiResponse.createErrorResponse("No worker assigned to session")
    );
  }

  try {
    // Route logout request to worker
    await proxyService.logoutSessionOnWorker(
      session.worker.endpoint,
      sessionId
    );

    // Update session status in database
    await prisma.session.update({
      where: { id: sessionId },
      data: {
        status: 'LOGGED_OUT',
        phoneNumber: null,
        qrCode: null,
        lastSeenAt: new Date()
      }
    });

    return res.status(200).json(
      ApiResponse.createSuccessResponse(
        { sessionId, status: 'logged_out' },
        "Session logged out successfully"
      )
    );
  } catch (error) {
    return res.status(500).json(
      ApiResponse.createErrorResponse(
        "Failed to logout session: " + error.message
      )
    );
  }
});
```

### ProxyService Implementation for Logout

```javascript
// Backend: src/services/proxy.service.js
async logoutSessionOnWorker(workerEndpoint, sessionId) {
  try {
    const response = await axios.post(
      `${workerEndpoint}/api/session/${sessionId}/logout`,
      {},
      {
        timeout: this.timeout,
        headers: {
          'Authorization': `Bearer ${process.env.WORKER_AUTH_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  } catch (error) {
    throw new Error(`Failed to logout session on worker: ${error.message}`);
  }
}
```

## 📊 Integration Flow Summary

1. **Worker Startup** → Register with Backend → Start heartbeat
2. **Backend assigns session** → Calls `POST /session/create`
3. **Worker initializes Baileys** → Generates QR → Reports via webhook
4. **User scans QR** → Worker detects connection → Reports status
5. **Message requests** → Backend routes to Worker → Worker sends via Baileys
6. **Status changes** → Worker reports to Backend via webhooks
7. **Logout requests** → Backend routes to Worker → Worker executes WhatsApp logout

## 🔍 Testing Requirements

### Unit Tests

- Test all controller methods
- Test Baileys service integration
- Test Backend communication service

### Integration Tests

- Test complete session lifecycle
- Test message sending and receiving
- Test error handling and recovery

### Load Tests

- Test maximum session capacity
- Test concurrent message sending
- Test memory and CPU usage under load

## 📝 Documentation Requirements

- Complete API documentation
- Setup and deployment guide
- Troubleshooting guide
- Performance tuning guide

This specification ensures seamless integration between the Backend and Worker projects, maintaining the hybrid data management architecture while providing reliable WhatsApp messaging capabilities.
