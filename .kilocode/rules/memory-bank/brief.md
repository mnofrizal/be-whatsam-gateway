# WhatsApp Gateway PaaS - Backend Brief

## 🎯 Overview

**Backend API Gateway** adalah central orchestrator yang mengelola semua operasi sistem WhatsApp Gateway PaaS. Backend bertanggung jawab untuk user management, worker orchestration, session routing, load balancing, dan menyediakan API endpoints untuk frontend dashboard dan external API consumers.

**Core Responsibilities:**

- **User Management:** Registration, authentication, API key management
- **Worker Orchestration:** Worker discovery, health monitoring, load balancing
- **Session Routing:** Route user requests ke appropriate workers
- **API Gateway:** Unified API endpoint untuk frontend dan external integrations
- **System Administration:** Admin APIs untuk worker dan user management

---

## 🏗️ Technical Stack

### Core Technologies

- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Database ORM:** Prisma (PostgreSQL)
- **Caching:** ioredis (Redis)
- **Authentication:** JWT + bcrypt
- **API Documentation:** Swagger/OpenAPI
- **Process Management:** PM2 (production)

### Dependencies

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "prisma": "^5.7.0",
    "@prisma/client": "^5.7.0",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "ioredis": "^5.3.2",
    "axios": "^1.6.0",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "express-rate-limit": "^7.1.5",
    "express-validator": "^7.0.1",
    "winston": "^3.11.0",
    "swagger-jsdoc": "^6.2.8",
    "swagger-ui-express": "^5.0.0",
    "uuid": "^9.0.1",
    "crypto": "^1.0.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.2",
    "jest": "^29.7.0",
    "supertest": "^6.3.3"
  }
}
```

---

## 📁 Project Structure

```
backend/
├── src/
│   ├── controllers/
│   │   ├── auth.controller.js        # Authentication (login/register)
│   │   ├── user.controller.js        # User management
│   │   ├── session.controller.js     # Session operations
│   │   ├── worker.controller.js      # Worker management
│   │   ├── admin.controller.js       # Admin operations
│   │   ├── webhook.controller.js     # Webhook handling
│   │   └── health.controller.js      # Health check
│   ├── services/
│   │   ├── auth.service.js           # Authentication service
│   │   ├── user.service.js           # User service
│   │   ├── session.service.js        # Session orchestration
│   │   ├── worker.service.js         # Worker management service
│   │   ├── load-balancer.service.js  # Load balancing logic
│   │   ├── proxy.service.js          # Request proxy to workers
│   │   └── notification.service.js   # Notification service
│   ├── middleware/
│   │   ├── auth.js                   # JWT authentication
│   │   ├── rbac.js                   # Role-based access control
│   │   ├── validation.js             # Request validation
│   │   ├── rate-limit.js             # Rate limiting
│   │   ├── error-handler.js          # Error handling
│   │   └── logger.js                 # Request logging
│   ├── utils/
│   │   ├── logger.js            # Winston logger
│   │   ├── redis.js             # Redis utilities
│   │   ├── crypto.js            # Encryption utilities
│   │   ├── api-key.js           # API key generation
│   │   └── helpers.js           # General utilities
│   ├── routes/
│   │   ├── auth.routes.js            # Authentication routes
│   │   ├── user.routes.js            # User routes
│   │   ├── session.routes.js         # Session routes
│   │   ├── worker.routes.js          # Worker routes
│   │   ├── admin.routes.js           # Admin routes
│   │   ├── api.routes.js             # External API routes
│   │   └── index.routes.js           # Route aggregator
│   ├── config/
│   │   ├── database.js          # Database configuration
│   │   ├── redis.js             # Redis configuration
│   │   ├── auth.js              # Auth configuration
│   │   └── swagger.js           # API documentation
│   ├── prisma/
│   │   ├── schema.prisma        # Database schema
│   │   └── migrations/          # Database migrations
│   └── app.js                   # Express app setup
├── logs/                        # Application logs
├── .env.example                 # Environment variables template
├── Dockerfile                   # Container configuration
├── package.json
└── README.md
```

---

## 🗃️ Database Schema

### Prisma Schema

```prisma
// prisma/schema.prisma
generator client {
    provider = "prisma-client-js"
}

datasource db {
    provider = "postgresql"
    url      = env("DATABASE_URL")
}

// User Model - Core user management
model User {
    id           String    @id @default(uuid())
    name         String
    email        String    @unique
    passwordHash String    @map("password_hash")
    role         UserRole  @default(USER)
    tier         UserTier  @default(BASIC)
    isActive     Boolean   @default(true) @map("is_active")
    lastLoginAt  DateTime? @map("last_login_at")
    createdAt    DateTime  @default(now()) @map("created_at")
    updatedAt    DateTime  @updatedAt @map("updated_at")

    // Relationships
    sessions     Session[]
    usageRecords UsageRecord[]

    @@map("users")
}

// Session Model - WhatsApp session management
model Session {
    id          String        @id
    userId      String        @map("user_id")
    workerId    String?       @map("worker_id")
    name        String
    phoneNumber String?       @map("phone_number")
    status      SessionStatus @default(DISCONNECTED)
    qrCode      String?       @map("qr_code")
    lastSeenAt  DateTime?     @map("last_seen_at")
    createdAt   DateTime      @default(now()) @map("created_at")
    updatedAt   DateTime      @updatedAt @map("updated_at")

    // Relationships
    user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
    worker       Worker?       @relation(fields: [workerId], references: [id])
    messages     Message[]
    apiKey       ApiKey? // 1:1 relationship - one session has one API key
    usageRecords UsageRecord[]
    webhook      Webhook? // 1:1 relationship - one session has one webhook

    @@map("sessions")
}

// Worker Model - Worker node management
model Worker {
    id            String       @id
    endpoint      String       @unique
    status        WorkerStatus @default(ONLINE)
    sessionCount  Int          @default(0) @map("session_count")
    maxSessions   Int          @default(50) @map("max_sessions")
    cpuUsage      Float        @default(0) @map("cpu_usage")
    memoryUsage   Float        @default(0) @map("memory_usage")
    lastHeartbeat DateTime     @default(now()) @map("last_heartbeat")
    description   String?      @map("description")
    createdAt     DateTime     @default(now()) @map("created_at")
    updatedAt     DateTime     @updatedAt @map("updated_at")

    // Relationships
    sessions Session[]
    metrics  WorkerMetric[]

    @@map("workers")
}

// ApiKey Model - API key management for external access
model ApiKey {
    id        String    @id @default(uuid())
    key       String    @unique
    sessionId String    @unique @map("session_id") // Made unique for 1:1 relationship
    name      String
    isActive  Boolean   @default(true) @map("is_active")
    lastUsed  DateTime? @map("last_used")
    createdAt DateTime  @default(now()) @map("created_at")
    expiresAt DateTime? @map("expires_at")

    // Relationships
    session      Session       @relation(fields: [sessionId], references: [id], onDelete: Cascade)
    usageRecords UsageRecord[]

    @@map("api_keys")
}

// Message Model - Message logging and history
model Message {
    id           String           @id @default(uuid())
    sessionId    String           @map("session_id")
    direction    MessageDirection
    fromNumber   String?          @map("from_number")
    toNumber     String           @map("to_number")
    messageType  MessageType      @map("message_type")
    content      String
    mediaUrl     String?          @map("media_url")
    filename     String?          @map("filename")
    caption      String?          @map("caption")
    status       MessageStatus    @default(PENDING)
    errorMessage String?          @map("error_message")
    sentAt       DateTime?        @map("sent_at")
    deliveredAt  DateTime?        @map("delivered_at")
    readAt       DateTime?        @map("read_at")
    createdAt    DateTime         @default(now()) @map("created_at")

    // Relationships
    session Session @relation(fields: [sessionId], references: [id], onDelete: Cascade)

    @@map("messages")
}

// WorkerMetric Model - Worker performance metrics
model WorkerMetric {
    id           String   @id @default(uuid())
    workerId     String   @map("worker_id")
    cpuUsage     Float    @map("cpu_usage")
    memoryUsage  Float    @map("memory_usage")
    sessionCount Int      @map("session_count")
    messageCount Int      @map("message_count")
    uptime       Int      @default(0) @map("uptime") // in seconds
    timestamp    DateTime @default(now())

    // Relationships
    worker Worker @relation(fields: [workerId], references: [id], onDelete: Cascade)

    @@map("worker_metrics")
}

// Webhook Model - Webhook configuration per session
model Webhook {
    id           String    @id @default(uuid())
    sessionId    String    @unique @map("session_id")
    url          String
    events       String[]  @map("events") // JSON array of event types
    secret       String?   @map("secret")
    isActive     Boolean   @default(true) @map("is_active")
    lastDelivery DateTime? @map("last_delivery")
    failureCount Int       @default(0) @map("failure_count")
    createdAt    DateTime  @default(now()) @map("created_at")
    updatedAt    DateTime  @updatedAt @map("updated_at")

    // Relationships
    session Session @relation(fields: [sessionId], references: [id], onDelete: Cascade)

    @@map("webhooks")
}

// WebhookDelivery Model - Webhook delivery tracking
model WebhookDelivery {
    id           String        @id @default(uuid())
    webhookId    String        @map("webhook_id")
    event        String        @map("event")
    payload      String        @map("payload") // JSON payload
    status       WebhookStatus @default(PENDING)
    responseCode Int?          @map("response_code")
    responseBody String?       @map("response_body")
    attempts     Int           @default(0) @map("attempts")
    nextRetry    DateTime?     @map("next_retry")
    createdAt    DateTime      @default(now()) @map("created_at")
    deliveredAt  DateTime?     @map("delivered_at")

    @@map("webhook_deliveries")
}

// SystemLog Model - System audit and error logging
model SystemLog {
    id        String   @id @default(uuid())
    level     LogLevel @map("level")
    service   String   @map("service")
    message   String   @map("message")
    details   String?  @map("details") // JSON details
    userId    String?  @map("user_id")
    sessionId String?  @map("session_id")
    workerId  String?  @map("worker_id")
    timestamp DateTime @default(now())

    @@map("system_logs")
}

// UsageRecord Model - Simple API usage counting
model UsageRecord {
    id          String   @id @default(uuid())
    userId      String   @map("user_id")
    sessionId   String?  @map("session_id")
    apiKeyId    String   @map("api_key_id")
    usageCount  Int      @default(0) @map("usage_count") // Number of API hits
    billingDate DateTime @map("billing_date") // Date for billing period (YYYY-MM-01)
    createdAt   DateTime @default(now()) @map("created_at")

    // Relationships
    user    User     @relation(fields: [userId], references: [id], onDelete: Cascade)
    session Session? @relation(fields: [sessionId], references: [id], onDelete: SetNull)
    apiKey  ApiKey   @relation(fields: [apiKeyId], references: [id], onDelete: Cascade)

    // Indexes for efficient querying
    @@index([userId, billingDate])
    @@index([apiKeyId, billingDate])
    @@index([sessionId, billingDate])
    @@map("usage_records")
}

// Enums
enum UserRole {
    USER
    ADMINISTRATOR
}

enum UserTier {
    BASIC
    PRO
    MAX
}

enum SessionStatus {
    INIT
    QR_REQUIRED
    CONNECTED
    DISCONNECTED
    RECONNECTING
    ERROR
}

enum WorkerStatus {
    ONLINE
    OFFLINE
    MAINTENANCE
}

enum MessageDirection {
    INBOUND
    OUTBOUND
}

enum MessageType {
    TEXT
    IMAGE
    DOCUMENT
    AUDIO
    VIDEO
    STICKER
    LOCATION
    CONTACT
}

enum MessageStatus {
    PENDING
    SENT
    DELIVERED
    READ
    FAILED
}

enum WebhookStatus {
    PENDING
    DELIVERED
    FAILED
    RETRYING
}

enum LogLevel {
    ERROR
    WARN
    INFO
    DEBUG
}

```

---

## 🔌 API Endpoints

### Authentication APIs

#### User Registration

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123",
  "tier": "basic"
}

Response: {
  "success": true,
  "data": {
    "user": {
      "id": "user123",
      "email": "user@example.com",
      "role": "customer",
      "tier": "basic"
    },
    "token": "jwt-token-here",
    "apiKey": "api-key-here"
  }
}
```

#### User Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}

Response: {
  "success": true,
  "data": {
    "user": {...},
    "token": "jwt-token-here"
  }
}
```

### Session Management APIs

#### Create Session

```http
POST /api/sessions
Authorization: Bearer jwt-token
Content-Type: application/json

{
  "name": "Personal WhatsApp",
  "sessionId": "user123-personal"
}

Response: {
  "success": true,
  "data": {
    "sessionId": "user123-personal",
    "name": "Personal WhatsApp",
    "status": "initializing",
    "workerId": "worker-001",
    "apiKey": "session-api-key"
  }
}
```

#### Get User Sessions

```http
GET /api/sessions
Authorization: Bearer jwt-token

Response: {
  "success": true,
  "data": {
    "sessions": [
      {
        "id": "user123-personal",
        "name": "Personal WhatsApp",
        "status": "connected",
        "phoneNumber": "+6281234567890",
        "workerId": "worker-001",
        "lastSeenAt": "2024-01-15T10:30:00Z"
      }
    ]
  }
}
```

#### Proxy Session Operations

```http
POST /api/sessions/{sessionId}/send
Authorization: Bearer session-api-key
Content-Type: application/json

{
  "to": "6281234567890@s.whatsapp.net",
  "type": "text",
  "message": "Hello from API!"
}

Response: {
  "success": true,
  "data": {
    "messageId": "msg_12345",
    "status": "sent"
  }
}
```

### Worker Management APIs

#### Register Worker (Internal)

```http
POST /api/admin/workers/register
Authorization: Bearer worker-token
Content-Type: application/json

{
  "workerId": "worker-001",
  "endpoint": "http://192.168.1.100:8001",
  "maxSessions": 50
}

Response: {
  "success": true,
  "data": {
    "workerId": "worker-001",
    "status": "registered"
  }
}
```

#### Add Worker (Admin)

```http
POST /api/admin/workers
Authorization: Bearer admin-jwt-token
Content-Type: application/json

{
  "endpoint": "http://203.0.113.45:8001",
  "maxSessions": 20
}

Response: {
  "success": true,
  "data": {
    "workerId": "worker-ext-001",
    "endpoint": "http://203.0.113.45:8001",
    "status": "online"
  }
}
```

#### Get Workers

```http
GET /api/admin/workers
Authorization: Bearer admin-jwt-token

Response: {
  "success": true,
  "data": {
    "workers": [
      {
        "id": "worker-001",
        "endpoint": "http://192.168.1.100:8001",
        "status": "online",
        "sessionCount": 25,
        "maxSessions": 50,
        "cpuUsage": 45.5,
        "memoryUsage": 67.8,
        "lastHeartbeat": "2024-01-15T10:30:00Z"
      }
    ]
  }
}
```

#### Worker Health Update (Internal)

```http
PUT /api/admin/workers/{workerId}/heartbeat
Authorization: Bearer worker-token
Content-Type: application/json

{
  "status": "online",
  "metrics": {
    "sessionCount": 25,
    "cpuUsage": 45.5,
    "memoryUsage": 67.8
  }
}

Response: {
  "success": true,
  "message": "Heartbeat updated"
}
```

### Admin APIs

#### Get System Analytics

```http
GET /api/admin/analytics
Authorization: Bearer admin-jwt-token

Response: {
  "success": true,
  "data": {
    "overview": {
      "totalUsers": 150,
      "totalSessions": 89,
      "totalWorkers": 5,
      "totalMessages": 15750
    },
    "workers": {
      "online": 4,
      "offline": 1,
      "avgCpuUsage": 52.3,
      "avgMemoryUsage": 68.9
    },
    "sessions": {
      "connected": 76,
      "disconnected": 13,
      "successRate": 95.2
    }
  }
}
```

#### Get Users

```http
GET /api/admin/users?page=1&limit=20&search=john
Authorization: Bearer admin-jwt-token

Response: {
  "success": true,
  "data": {
    "users": [...],
    "pagination": {
      "total": 150,
      "page": 1,
      "limit": 20,
      "totalPages": 8
    }
  }
}
```

---

## 🎛️ Core Services Implementation

### Authentication Service

```javascript
// services/auth.js
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const { generateApiKey } = require("../utils/api-key");

class AuthService {
  constructor() {
    this.prisma = new PrismaClient();
  }

  async register(email, password, tier = "BASIC") {
    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new Error("User already exists");
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Generate API key
    const apiKey = generateApiKey();

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        tier,
        apiKey,
        role: "USER",
      },
    });

    // Generate JWT token
    const token = this.generateToken(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        tier: user.tier,
      },
      token,
      apiKey: user.apiKey,
    };
  }

  async login(email, password) {
    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new Error("Invalid credentials");
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      throw new Error("Invalid credentials");
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate JWT token
    const token = this.generateToken(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        tier: user.tier,
      },
      token,
    };
  }

  generateToken(user) {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      tier: user.tier,
    };

    return jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    });
  }

  async verifyToken(token) {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);

      // Check if user still exists
      const user = await this.prisma.user.findUnique({
        where: { id: payload.userId },
      });

      if (!user || !user.isActive) {
        throw new Error("User not found or inactive");
      }

      return payload;
    } catch (error) {
      throw new Error("Invalid token");
    }
  }

  async verifyApiKey(apiKey) {
    const key = await this.prisma.apiKey.findUnique({
      where: { key: apiKey },
      include: {
        user: true,
        session: true,
      },
    });

    if (!key || !key.isActive || !key.user.isActive) {
      throw new Error("Invalid API key");
    }

    // Check expiration
    if (key.expiresAt && key.expiresAt < new Date()) {
      throw new Error("API key expired");
    }

    // Update last used
    await this.prisma.apiKey.update({
      where: { id: key.id },
      data: { lastUsed: new Date() },
    });

    return key;
  }
}
```

### Session Orchestration Service

```javascript
// services/session.js
const { PrismaClient } = require("@prisma/client");
const Redis = require("ioredis");
const { LoadBalancer } = require("./load-balancer");
const { ProxyService } = require("./proxy");

class SessionService {
  constructor() {
    this.prisma = new PrismaClient();
    this.redis = new Redis(process.env.REDIS_URL);
    this.loadBalancer = new LoadBalancer();
    this.proxy = new ProxyService();
  }

  async createSession(userId, sessionId, name) {
    // Check user tier limits
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { sessions: true },
    });

    const tierLimits = {
      BASIC: 1,
      PRO: 5,
      MAX: 20,
    };

    const currentSessionCount = user.sessions.filter(
      (s) => s.status !== "DISCONNECTED"
    ).length;
    if (currentSessionCount >= tierLimits[user.tier]) {
      throw new Error(`Session limit exceeded for ${user.tier} tier`);
    }

    // Get available worker
    const worker = await this.loadBalancer.getAvailableWorker();
    if (!worker) {
      throw new Error("No available workers");
    }

    // Create session in database
    const session = await this.prisma.session.create({
      data: {
        id: sessionId,
        userId,
        workerId: worker.id,
        name,
        status: "DISCONNECTED",
      },
    });

    // Generate session API key
    const sessionApiKey = await this.generateSessionApiKey(userId, sessionId);

    // Create session on worker
    try {
      const workerResponse = await this.proxy.createSessionOnWorker(
        worker.endpoint,
        {
          sessionId,
          userId,
          sessionName: name,
        }
      );

      // Update session routing in Redis
      await this.redis.hset("session_routing", sessionId, worker.id);

      // Update worker session count
      await this.prisma.worker.update({
        where: { id: worker.id },
        data: { sessionCount: { increment: 1 } },
      });

      return {
        ...session,
        apiKey: sessionApiKey,
        qrCode: workerResponse.qrCode,
      };
    } catch (error) {
      // Clean up on failure
      await this.prisma.session.delete({ where: { id: sessionId } });
      throw new Error(`Failed to create session on worker: ${error.message}`);
    }
  }

  async getSessionStatus(sessionId) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { worker: true },
    });

    if (!session) {
      throw new Error("Session not found");
    }

    // Get real-time status from worker
    try {
      const workerStatus = await this.proxy.getSessionStatus(
        session.worker.endpoint,
        sessionId
      );

      // Update database if status changed
      if (workerStatus.status !== session.status) {
        await this.prisma.session.update({
          where: { id: sessionId },
          data: {
            status: workerStatus.status.toUpperCase(),
            phoneNumber: workerStatus.phoneNumber,
            lastSeenAt: new Date(),
          },
        });
      }

      return workerStatus;
    } catch (error) {
      // Worker might be down, return database status
      return {
        sessionId: session.id,
        status: session.status.toLowerCase(),
        phoneNumber: session.phoneNumber,
      };
    }
  }

  async deleteSession(sessionId) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { worker: true },
    });

    if (!session) {
      throw new Error("Session not found");
    }

    // Delete from worker
    try {
      await this.proxy.deleteSessionOnWorker(
        session.worker.endpoint,
        sessionId
      );
    } catch (error) {
      console.error("Failed to delete session from worker:", error.message);
      // Continue with database cleanup even if worker deletion fails
    }

    // Clean up database
    await this.prisma.session.delete({ where: { id: sessionId } });

    // Clean up Redis routing
    await this.redis.hdel("session_routing", sessionId);

    // Update worker session count
    await this.prisma.worker.update({
      where: { id: session.workerId },
      data: { sessionCount: { decrement: 1 } },
    });

    return { success: true };
  }

  async routeRequest(sessionId, endpoint, data) {
    // Get worker for session
    const workerId = await this.redis.hget("session_routing", sessionId);
    if (!workerId) {
      throw new Error("Session routing not found");
    }

    const worker = await this.prisma.worker.findUnique({
      where: { id: workerId },
    });

    if (!worker || worker.status !== "ONLINE") {
      throw new Error("Worker not available");
    }

    // Proxy request to worker
    return await this.proxy.forwardRequest(worker.endpoint, endpoint, data);
  }

  async generateSessionApiKey(userId, sessionId) {
    const apiKey = generateApiKey();

    await this.prisma.apiKey.create({
      data: {
        key: apiKey,
        userId,
        sessionId,
        name: `Session API Key - ${sessionId}`,
      },
    });

    return apiKey;
  }
}
```

### Load Balancer Service

```javascript
// services/load-balancer.js
const { PrismaClient } = require("@prisma/client");

class LoadBalancer {
  constructor() {
    this.prisma = new PrismaClient();
  }

  async getAvailableWorker() {
    // Get all online workers
    const workers = await this.prisma.worker.findMany({
      where: {
        status: "ONLINE",
        sessionCount: { lt: this.prisma.worker.fields.maxSessions },
      },
      orderBy: [
        { sessionCount: "asc" },
        { cpuUsage: "asc" },
        { memoryUsage: "asc" },
      ],
    });

    if (workers.length === 0) {
      return null;
    }

    // Simple round-robin with resource consideration
    return workers[0];
  }

  async rebalanceSessions() {
    // Get workers with high load
    const overloadedWorkers = await this.prisma.worker.findMany({
      where: {
        OR: [
          { cpuUsage: { gt: 80 } },
          { memoryUsage: { gt: 90 } },
          { sessionCount: { gt: this.prisma.worker.fields.maxSessions * 0.9 } },
        ],
      },
      include: { sessions: true },
    });

    // Get available workers
    const availableWorkers = await this.prisma.worker.findMany({
      where: {
        status: "ONLINE",
        sessionCount: { lt: this.prisma.worker.fields.maxSessions * 0.7 },
      },
    });

    // Migrate sessions from overloaded to available workers
    for (const overloadedWorker of overloadedWorkers) {
      const sessionsToMigrate = overloadedWorker.sessions.slice(0, 5); // Migrate 5 sessions at a time

      for (const session of sessionsToMigrate) {
        const targetWorker = availableWorkers.find(
          (w) => w.sessionCount < w.maxSessions
        );

        if (targetWorker) {
          await this.migrateSession(
            session.id,
            overloadedWorker.id,
            targetWorker.id
          );
        }
      }
    }
  }

  async migrateSession(sessionId, sourceWorkerId, targetWorkerId) {
    // Implementation for session migration between workers
    // This would involve coordinating with both workers to transfer session state
    console.log(
      `Migrating session ${sessionId} from ${sourceWorkerId} to ${targetWorkerId}`
    );

    // Update database
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { workerId: targetWorkerId },
    });

    // Update Redis routing
    await this.redis.hset("session_routing", sessionId, targetWorkerId);

    // Update worker session counts
    await this.prisma.worker.update({
      where: { id: sourceWorkerId },
      data: { sessionCount: { decrement: 1 } },
    });

    await this.prisma.worker.update({
      where: { id: targetWorkerId },
      data: { sessionCount: { increment: 1 } },
    });
  }
}
```

### Worker Management Service

```javascript
// services/worker.js
const { PrismaClient } = require("@prisma/client");
const Redis = require("ioredis");
const axios = require("axios");

class WorkerService {
  constructor() {
    this.prisma = new PrismaClient();
    this.redis = new Redis(process.env.REDIS_URL);
    this.healthCheckInterval = 30000; // 30 seconds
    this.startHealthChecking();
  }

  async registerWorker(workerId, endpoint, maxSessions = 50) {
    // Test worker connectivity
    try {
      await axios.get(`${endpoint}/health`, { timeout: 5000 });
    } catch (error) {
      throw new Error("Worker health check failed");
    }

    // Register or update worker
    const worker = await this.prisma.worker.upsert({
      where: { id: workerId },
      update: {
        endpoint,
        maxSessions,
        status: "ONLINE",
        lastHeartbeat: new Date(),
      },
      create: {
        id: workerId,
        endpoint,
        maxSessions,
        status: "ONLINE",
        lastHeartbeat: new Date(),
      },
    });

    // Add to Redis for fast lookups
    await this.redis.hset(
      "workers",
      workerId,
      JSON.stringify({
        endpoint,
        status: "ONLINE",
        lastHeartbeat: new Date().toISOString(),
      })
    );

    return worker;
  }

  async updateWorkerHeartbeat(workerId, metrics) {
    const worker = await this.prisma.worker.update({
      where: { id: workerId },
      data: {
        status: "ONLINE",
        sessionCount: metrics.sessionCount || 0,
        cpuUsage: metrics.cpuUsage || 0,
        memoryUsage: metrics.memoryUsage || 0,
        lastHeartbeat: new Date(),
      },
    });

    // Store metrics for analytics
    await this.prisma.workerMetric.create({
      data: {
        workerId,
        cpuUsage: metrics.cpuUsage || 0,
        memoryUsage: metrics.memoryUsage || 0,
        sessionCount: metrics.sessionCount || 0,
        messageCount: metrics.messageCount || 0,
      },
    });

    // Update Redis
    await this.redis.hset(
      "workers",
      workerId,
      JSON.stringify({
        endpoint: worker.endpoint,
        status: "ONLINE",
        sessionCount: metrics.sessionCount || 0,
        lastHeartbeat: new Date().toISOString(),
      })
    );

    return worker;
  }

  async getWorkers() {
    return await this.prisma.worker.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        sessions: {
          where: { status: { not: "DISCONNECTED" } },
        },
      },
    });
  }

  async removeWorker(workerId) {
    const worker = await this.prisma.worker.findUnique({
      where: { id: workerId },
      include: { sessions: true },
    });

    if (!worker) {
      throw new Error("Worker not found");
    }

    // Migrate active sessions to other workers
    for (const session of worker.sessions) {
      if (session.status !== "DISCONNECTED") {
        await this.migrateSessionToAnotherWorker(session.id);
      }
    }

    // Remove worker
    await this.prisma.worker.delete({ where: { id: workerId } });
    await this.redis.hdel("workers", workerId);

    return { success: true };
  }

  startHealthChecking() {
    setInterval(async () => {
      await this.performHealthChecks();
    }, this.healthCheckInterval);
  }

  async performHealthChecks() {
    const workers = await this.prisma.worker.findMany({
      where: { status: "ONLINE" },
    });

    for (const worker of workers) {
      try {
        const response = await axios.get(`${worker.endpoint}/health`, {
          timeout: 10000,
        });

        if (response.status === 200) {
          // Worker is healthy, update heartbeat
          await this.updateWorkerHeartbeat(worker.id, response.data);
        }
      } catch (error) {
        // Worker is unhealthy
        console.error(
          `Worker ${worker.id} health check failed:`,
          error.message
        );
        await this.markWorkerOffline(worker.id);
      }
    }
  }

  async markWorkerOffline(workerId) {
    await this.prisma.worker.update({
      where: { id: workerId },
      data: { status: "OFFLINE" },
    });

    // Update Redis
    await this.redis.hset(
      "workers",
      workerId,
      JSON.stringify({
        status: "OFFLINE",
        lastHeartbeat: new Date().toISOString(),
      })
    );

    // Trigger session migration for affected sessions
    const affectedSessions = await this.prisma.session.findMany({
      where: {
        workerId,
        status: { in: ["CONNECTED", "QR_REQUIRED"] },
      },
    });

    for (const session of affectedSessions) {
      await this.migrateSessionToAnotherWorker(session.id);
    }
  }

  async migrateSessionToAnotherWorker(sessionId) {
    // Find available worker
    const availableWorker = await this.prisma.worker.findFirst({
      where: {
        status: "ONLINE",
        sessionCount: { lt: this.prisma.worker.fields.maxSessions },
      },
      orderBy: { sessionCount: "asc" },
    });

    if (!availableWorker) {
      console.error(`No available worker for session migration: ${sessionId}`);
      return;
    }

    // Update session worker assignment
    await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        workerId: availableWorker.id,
        status: "INIT",
      },
    });

    // Update Redis routing
    await this.redis.hset("session_routing", sessionId, availableWorker.id);

    console.log(
      `Session ${sessionId} migrated to worker ${availableWorker.id}`
    );
  }
}
```

### Proxy Service

```javascript
// services/proxy.js
const axios = require("axios");

class ProxyService {
  constructor() {
    this.timeout = 30000; // 30 seconds
  }

  async createSessionOnWorker(workerEndpoint, sessionData) {
    try {
      const response = await axios.post(
        `${workerEndpoint}/session/create`,
        sessionData,
        { timeout: this.timeout }
      );

      return response.data.data;
    } catch (error) {
      throw new Error(`Worker request failed: ${error.message}`);
    }
  }

  async getSessionStatus(workerEndpoint, sessionId) {
    try {
      const response = await axios.get(
        `${workerEndpoint}/session/${sessionId}/status`,
        { timeout: this.timeout }
      );

      return response.data.data;
    } catch (error) {
      throw new Error(`Failed to get session status: ${error.message}`);
    }
  }

  async deleteSessionOnWorker(workerEndpoint, sessionId) {
    try {
      const response = await axios.delete(
        `${workerEndpoint}/session/${sessionId}`,
        { timeout: this.timeout }
      );

      return response.data;
    } catch (error) {
      throw new Error(`Failed to delete session: ${error.message}`);
    }
  }

  async forwardRequest(workerEndpoint, endpoint, data, method = "POST") {
    try {
      const config = {
        method,
        url: `${workerEndpoint}${endpoint}`,
        timeout: this.timeout,
        headers: {
          "Content-Type": "application/json",
        },
      };

      if (method !== "GET" && data) {
        config.data = data;
      }

      const response = await axios(config);
      return response.data;
    } catch (error) {
      throw new Error(`Proxy request failed: ${error.message}`);
    }
  }

  async broadcastToAllWorkers(endpoint, data) {
    const workers = await this.prisma.worker.findMany({
      where: { status: "ONLINE" },
    });

    const promises = workers.map((worker) =>
      this.forwardRequest(worker.endpoint, endpoint, data).catch((error) => ({
        workerId: worker.id,
        error: error.message,
      }))
    );

    return await Promise.allSettled(promises);
  }
}
```

---

## 🔒 Middleware Implementation

### Authentication Middleware

```javascript
// middleware/auth.js
const { AuthService } = require("../services/auth");

const authService = new AuthService();

const authenticateJWT = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Access token required",
      });
    }

    const payload = await authService.verifyToken(token);
    req.user = payload;
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      error: error.message,
    });
  }
};

const authenticateApiKey = async (req, res, next) => {
  try {
    const apiKey = req.headers["x-api-key"] || req.query.apiKey;

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: "API key required",
      });
    }

    const keyData = await authService.verifyApiKey(apiKey);
    req.user = keyData.user;
    req.session = keyData.session;
    req.apiKey = keyData;
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      error: error.message,
    });
  }
};

const authenticateWorker = (req, res, next) => {
  const workerToken = req.headers["x-worker-token"];

  if (workerToken !== process.env.WORKER_AUTH_TOKEN) {
    return res.status(401).json({
      success: false,
      error: "Invalid worker token",
    });
  }

  next();
};

module.exports = {
  authenticateJWT,
  authenticateApiKey,
  authenticateWorker,
};
```

### Role-Based Access Control

```javascript
// middleware/rbac.js
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }

    const userRoles = Array.isArray(req.user.role)
      ? req.user.role
      : [req.user.role];
    const requiredRoles = Array.isArray(roles) ? roles : [roles];

    const hasRole = requiredRoles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      return res.status(403).json({
        success: false,
        error: "Insufficient permissions",
      });
    }

    next();
  };
};

const requireAdmin = requireRole(["ADMINISTRATOR"]);
const requireUser = requireRole(["USER", "ADMINISTRATOR"]);

module.exports = {
  requireRole,
  requireAdmin,
  requireUser,
};
```

### Rate Limiting

```javascript
// middleware/rate-limit.js
const rateLimit = require("express-rate-limit");
const Redis = require("ioredis");

const redis = new Redis(process.env.REDIS_URL);

// General API rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: {
    success: false,
    error: "Too many requests, please try again later",
  },
});

// Session operations rate limiting
const sessionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: {
    success: false,
    error: "Session operation rate limit exceeded",
  },
});

// Message sending rate limiting (per user)
const createMessageLimiter = async (req, res, next) => {
  const userId = req.user.userId;
  const key = `message_limit:${userId}`;

  const userTierLimits = {
    BASIC: 100, // 100 messages per hour
    PRO: 1000, // 1000 messages per hour
    MAX: 10000, // 10000 messages per hour
  };

  const limit = userTierLimits[req.user.tier] || userTierLimits.BASIC;
  const windowMs = 60 * 60 * 1000; // 1 hour

  try {
    const current = await redis.incr(key);

    if (current === 1) {
      await redis.expire(key, windowMs / 1000);
    }

    if (current > limit) {
      return res.status(429).json({
        success: false,
        error: `Message limit exceeded. ${req.user.tier} tier allows ${limit} messages per hour`,
      });
    }

    req.messageCount = current;
    next();
  } catch (error) {
    console.error("Rate limiting error:", error);
    next(); // Allow request if Redis fails
  }
};

module.exports = {
  apiLimiter,
  sessionLimiter,
  createMessageLimiter,
};
```

---

## 📊 Analytics & Monitoring

### Analytics Service

```javascript
// services/analytics.js
const { PrismaClient } = require("@prisma/client");

class AnalyticsService {
  constructor() {
    this.prisma = new PrismaClient();
  }

  async getSystemOverview() {
    const [
      totalUsers,
      totalSessions,
      totalWorkers,
      totalMessages,
      connectedSessions,
      onlineWorkers,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.session.count(),
      this.prisma.worker.count(),
      this.prisma.message.count(),
      this.prisma.session.count({ where: { status: "CONNECTED" } }),
      this.prisma.worker.count({ where: { status: "ONLINE" } }),
    ]);

    return {
      totalUsers,
      totalSessions,
      totalWorkers,
      totalMessages,
      connectedSessions,
      onlineWorkers,
      sessionSuccessRate:
        totalSessions > 0 ? (connectedSessions / totalSessions) * 100 : 0,
    };
  }

  async getWorkerMetrics(timeRange = "24h") {
    const timeRanges = {
      "1h": new Date(Date.now() - 60 * 60 * 1000),
      "24h": new Date(Date.now() - 24 * 60 * 60 * 1000),
      "7d": new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      "30d": new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    };

    const since = timeRanges[timeRange] || timeRanges["24h"];

    const metrics = await this.prisma.workerMetric.findMany({
      where: {
        timestamp: { gte: since },
      },
      include: { worker: true },
      orderBy: { timestamp: "asc" },
    });

    // Group by worker and calculate averages
    const workerStats = metrics.reduce((acc, metric) => {
      const workerId = metric.workerId;

      if (!acc[workerId]) {
        acc[workerId] = {
          workerId,
          endpoint: metric.worker.endpoint,
          samples: [],
          avgCpu: 0,
          avgMemory: 0,
          avgSessions: 0,
        };
      }

      acc[workerId].samples.push({
        timestamp: metric.timestamp,
        cpuUsage: metric.cpuUsage,
        memoryUsage: metric.memoryUsage,
        sessionCount: metric.sessionCount,
      });

      return acc;
    }, {});

    // Calculate averages
    Object.values(workerStats).forEach((worker) => {
      const samples = worker.samples;
      worker.avgCpu =
        samples.reduce((sum, s) => sum + s.cpuUsage, 0) / samples.length;
      worker.avgMemory =
        samples.reduce((sum, s) => sum + s.memoryUsage, 0) / samples.length;
      worker.avgSessions =
        samples.reduce((sum, s) => sum + s.sessionCount, 0) / samples.length;
    });

    return Object.values(workerStats);
  }

  async getMessageStatistics(timeRange = "24h") {
    const timeRanges = {
      "1h": new Date(Date.now() - 60 * 60 * 1000),
      "24h": new Date(Date.now() - 24 * 60 * 60 * 1000),
      "7d": new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      "30d": new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    };

    const since = timeRanges[timeRange] || timeRanges["24h"];

    const [
      totalMessages,
      sentMessages,
      deliveredMessages,
      failedMessages,
      messagesByType,
    ] = await Promise.all([
      this.prisma.message.count({
        where: { createdAt: { gte: since } },
      }),
      this.prisma.message.count({
        where: {
          createdAt: { gte: since },
          status: "SENT",
        },
      }),
      this.prisma.message.count({
        where: {
          createdAt: { gte: since },
          status: "DELIVERED",
        },
      }),
      this.prisma.message.count({
        where: {
          createdAt: { gte: since },
          status: "FAILED",
        },
      }),
      this.prisma.message.groupBy({
        by: ["messageType"],
        where: { createdAt: { gte: since } },
        _count: { messageType: true },
      }),
    ]);

    return {
      total: totalMessages,
      sent: sentMessages,
      delivered: deliveredMessages,
      failed: failedMessages,
      successRate:
        totalMessages > 0
          ? ((sentMessages + deliveredMessages) / totalMessages) * 100
          : 0,
      byType: messagesByType.reduce((acc, item) => {
        acc[item.messageType] = item._count.messageType;
        return acc;
      }, {}),
    };
  }

  async getUserStatistics() {
    const [usersByTier, activeUsers, newUsersToday] = await Promise.all([
      this.prisma.user.groupBy({
        by: ["tier"],
        _count: { tier: true },
      }),
      this.prisma.user.count({
        where: {
          lastLoginAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
      }),
      this.prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)), // Today
          },
        },
      }),
    ]);

    return {
      byTier: usersByTier.reduce((acc, item) => {
        acc[item.tier] = item._count.tier;
        return acc;
      }, {}),
      activeUsers,
      newUsersToday,
    };
  }
}
```

---

## 🚀 Development Phases

### Phase 1: Core Setup (Week 2)

- ✅ Express.js server setup dengan middleware
- ✅ PostgreSQL database setup dengan Prisma
- ✅ Redis integration untuk caching
- ✅ Basic authentication system (JWT)
- ✅ User registration dan login endpoints
- ✅ API key generation dan validation
- ✅ Basic error handling dan logging
- **Deliverable:** Backend dengan user management

### Phase 2: User Management (Week 3)

- ✅ User CRUD operations
- ✅ Password hashing dan security
- ✅ Session CRUD operations
- ✅ Basic rate limiting implementation
- ✅ API documentation dengan Swagger
- ✅ Input validation middleware
- **Deliverable:** Complete user management system

### Phase 3: Worker Orchestration (Week 4)

- ✅ Worker discovery dan registration
- ✅ Session routing ke workers
- ✅ Request proxy ke workers
- ✅ Load balancing logic (round-robin)
- ✅ Worker health monitoring
- ✅ Session-to-worker mapping dalam Redis
- **Deliverable:** Worker orchestration system

### Phase 4: Advanced Features (Week 5)

- ✅ Multi-worker load balancing enhancement
- ✅ Session migration logic
- ✅ Usage analytics dan logging
- ✅ Message history API endpoints
- ✅ Webhook support untuk real-time events
- ✅ Advanced rate limiting dengan tiers
- **Deliverable:** Production-ready API dengan monitoring

### Phase 5: Enterprise Features (Week 6)

- ✅ Auto-scaling triggers
- ✅ Billing integration preparation
- ✅ Admin API endpoints
- ✅ Advanced worker management
- ✅ System analytics dashboard APIs
- ✅ API versioning implementation
- **Deliverable:** Enterprise-ready backend

### Phase 6: Production Hardening (Week 7)

- ✅ Security audit dan hardening
- ✅ Performance optimization
- ✅ Comprehensive logging system
- ✅ Backup dan recovery procedures
- ✅ Production environment configuration
- ✅ Load testing dan optimization
- **Deliverable:** Production-ready backend system

---

## 🔧 Configuration

### Environment Variables

```bash
# Server Configuration
PORT=8000
NODE_ENV=development
API_VERSION=v1

# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/whatsapp_gateway
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=12

# Worker Configuration
WORKER_AUTH_TOKEN=worker-secret-token
WORKER_HEALTH_CHECK_INTERVAL=30000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000

# External Services
WEBHOOK_SECRET=webhook-secret-key
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Monitoring
LOG_LEVEL=info
LOG_FILE_PATH=./logs
ENABLE_METRICS=true

# Security
CORS_ORIGIN=http://localhost:3000
HELMET_ENABLED=true
```

### Docker Configuration

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY prisma/ ./prisma/
RUN npm ci --only=production
RUN npx prisma generate

# Copy source code
COPY src/ ./src/
COPY . .

# Create necessary directories
RUN mkdir -p logs

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# Run migrations and start app
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
```

---

## 🧪 Testing Strategy

### API Testing Checklist

- [ ] User registration dan login functionality
- [ ] JWT token generation dan validation
- [ ] API key authentication
- [ ] Session creation dan management
- [ ] Worker registration dan health monitoring
- [ ] Load balancing algorithm
- [ ] Rate limiting enforcement
- [ ] Admin endpoints access control
- [ ] Error handling dan responses

### Performance Testing Targets

- **Concurrent Users:** Support 1000+ concurrent users
- **Response Time:** <200ms untuk most API calls
- **Throughput:** 10,000+ requests per minute
- **Database Connections:** Efficient connection pooling
- **Memory Usage:** <512MB under normal load

---

## 📦 Deployment

### Production Deployment

```bash
# Build dan deploy
docker build -t whatsapp-backend:latest .

# Run dengan production environment
docker run -d \
  --name whatsapp-backend \
  --env-file .env.production \
  -p 8000:8000 \
  -v backend-logs:/app/logs \
  whatsapp-backend:latest
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: whatsapp-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: whatsapp-backend
  template:
    metadata:
      labels:
        app: whatsapp-backend
    spec:
      containers:
        - name: backend
          image: whatsapp-backend:latest
          ports:
            - containerPort: 8000
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: backend-secrets
                  key: database-url
            - name: JWT_SECRET
              valueFrom:
                secretKeyRef:
                  name: backend-secrets
                  key: jwt-secret
          livenessProbe:
            httpGet:
              path: /health
              port: 8000
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health
              port: 8000
            initialDelaySeconds: 5
            periodSeconds: 5
```

---

## 🎯 Success Metrics

### Technical KPIs

- **API Uptime:** >99.9% availability
- **Response Time:** <200ms average response time
- **Error Rate:** <0.1% error rate
- **Throughput:** >10,000 requests/minute
- **Database Performance:** <50ms query time

### Functional KPIs

- **User Registration Success:** >99% success rate
- **Session Creation Success:** >95% success rate
- **Worker Health Detection:** <30s to detect failures
- **Load Balancing Efficiency:** Even distribution across workers
- **Session Migration Success:** >90% successful migrations

---

**Project:** WhatsApp Gateway PaaS  
**Service:** Backend API Gateway  
**Expected Development:** 6 weeks  
**Tech Stack:** Node.js, Express, Prisma, PostgreSQL, Redis
