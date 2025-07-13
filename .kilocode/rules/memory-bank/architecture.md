# WhatsApp Gateway PaaS Backend - System Architecture

## 🏗️ Overall System Architecture

### High-Level Hybrid Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Frontend       │    │  Backend API    │    │  WhatsApp       │
│  Dashboard      │◄──►│  Gateway        │◄──►│  Workers        │
│  (Next.js)      │    │  (Node.js)      │    │  (Baileys)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │ Backend Storage │    │ Worker Storage  │
                       │ PostgreSQL +    │    │ Local DB +      │
                       │ Redis + MinIO   │    │ MinIO + Cache   │
                       └─────────────────┘    └─────────────────┘
```

### Hybrid Data Management Flow

```
Customer/Admin → Frontend Dashboard → Backend API Gateway → WhatsApp Workers → Baileys → WhatsApp
                                    ↕                      ↕
                            Business Data              Operational Data
                         (Users, Sessions Meta,      (Messages, Session State,
                          Billing, Analytics)         Media Files, QR Codes)
```

### Domain-Driven Data Ownership

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   BACKEND       │    │   WORKER        │    │   BAILEYS       │
│ (Business Data) │◄──►│ (Session Data)  │◄──►│ (WhatsApp API)  │
│                 │    │                 │    │                 │
│ • Users         │    │ • Messages      │    │ • QR Codes      │
│ • Sessions Meta │    │ • Session State │    │ • Connections   │
│ • Billing       │    │ • Media Files   │    │ • Auth Tokens   │
│ • Analytics     │    │ • Local Cache   │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📁 Backend Source Code Architecture

### Directory Structure

```
src/
├── controllers/         # HTTP request handlers
│   ├── auth.controller.js    # Authentication endpoints
│   ├── user.controller.js    # User management
│   ├── worker.controller.js  # Worker management
│   ├── session.controller.js # Session management
│   └── webhook.controller.js # Webhook management
├── services/           # Business logic layer
│   ├── auth.service.js       # Authentication service
│   ├── user.service.js       # User service
│   ├── worker.service.js     # Worker management service
│   ├── session.service.js    # Session orchestration service
│   ├── proxy.service.js      # Worker communication service
│   ├── webhook.service.js    # Webhook service
│   ├── message.js            # Message service (placeholder)
│   ├── session.js            # Session service (legacy placeholder)
│   └── webhook.js            # Webhook service (legacy placeholder)
├── middleware/         # Express middleware
│   ├── auth.js               # JWT authentication
│   ├── error-handler.js      # Error handling
│   └── rate-limit.js         # Rate limiting
├── utils/              # Utility functions
│   ├── constants.js          # Application constants
│   ├── helpers.js            # General utilities
│   ├── logger.js             # Winston logger
│   └── helpers/              # Helper subdirectory
│       ├── jwt.js            # JWT utilities
│       └── password.js       # Password utilities
├── routes/             # API route definitions
│   ├── auth.routes.js        # Authentication routes
│   ├── user.routes.js        # User routes
│   ├── worker.routes.js      # Worker routes
│   ├── session.routes.js     # Session routes
│   ├── webhook.routes.js     # Webhook routes
│   ├── admin.routes.js       # Admin routes (placeholder)
│   ├── api.routes.js         # External API routes (placeholder)
│   └── index.js              # Route aggregator
├── validation/         # Input validation
│   ├── auth.validation.js    # Authentication validation
│   ├── user.validation.js    # User validation
│   ├── worker.validation.js  # Worker validation
│   ├── session.validation.js # Session validation
│   └── webhook.validation.js # Webhook validation
├── config/             # Configuration files
│   └── security.js           # Security configuration
├── database/           # Database layer
│   └── client.js             # Database client
└── app.js              # Express app setup

# Project Root Structure
├── .gitignore
├── database-erd.md
├── docker-compose.yml
├── package-lock.json
├── package.json
├── README.md
├── test-jwt-separation.js
├── WORKER_INTEGRATION_README.md
├── docker/
│   └── postgres/
│       └── init.sql/
├── prisma/
│   ├── schema.prisma
│   ├── seed.js
│   └── migrations/
│       ├── migration_lock.toml
│       ├── 20250705104119_init/
│       ├── 20250705105354_init/
│       └── 20250705225005_add_worker_version_environment/
└── rest/
    ├── admin.rest
    ├── api.rest
    ├── auth.rest
    ├── session.rest
    ├── test.rest
    ├── user.rest
    ├── webhook.rest
    └── worker.rest
```

## 🔄 Key Design Patterns

### 1. Hybrid Data Management Pattern

- **Purpose:** Domain-driven data ownership between Backend and Workers
- **Implementation:** Backend owns business data, Workers own operational data
- **Benefits:** Scalability, reliability, clear separation of concerns

### 2. API Gateway Pattern

- **Purpose:** Central entry point for all client requests
- **Implementation:** Backend routes requests to appropriate workers
- **Benefits:** Load balancing, authentication, rate limiting in one place

### 3. Two-Phase Session Management Pattern

- **Purpose:** Separate session declaration from connection action
- **Implementation:** Phase 1: Create session card, Phase 2: Connect to WhatsApp
- **Benefits:** Better UX, clearer error handling, improved reliability

### 4. Service Layer Pattern

- **Purpose:** Separate business logic from HTTP handling
- **Implementation:** Controllers call services, services handle business logic
- **Benefits:** Testable, reusable business logic

### 5. Repository Pattern (via Prisma)

- **Purpose:** Abstract database operations
- **Implementation:** Prisma ORM handles database interactions
- **Benefits:** Database-agnostic code, easy testing with mocks

### 6. Proxy Pattern

- **Purpose:** Forward requests to appropriate workers
- **Implementation:** ProxyService routes requests based on session mapping
- **Benefits:** Transparent worker communication, failover handling

### 7. Webhook Pattern

- **Purpose:** Async communication between Workers and Backend
- **Implementation:** Workers report status changes via webhook callbacks, external webhook notifications
- **Benefits:** No timeout issues, better error handling, scalable, real-time event notifications

### 8. Data Normalization Pattern

- **Purpose:** Ensure consistent data format across the system
- **Implementation:** Controller layer normalizes input data before passing to service layer
- **Benefits:** Consistent naming, URL-safe identifiers, predictable format
- **Example:** WorkerId normalization converts all formats to hyphen-separated lowercase

### 9. Enhanced Error Handling Pattern

- **Purpose:** Provide user-friendly error messages for different error types
- **Implementation:** Custom error classes (ConnectivityError, NotFoundError, ConflictError)
- **Benefits:** Better user experience, easier debugging, proper HTTP status codes

### 10. Enhanced Heartbeat Pattern

- **Purpose:** Rich worker monitoring with detailed session status information
- **Implementation:** Workers send comprehensive heartbeat data including individual session statuses, capabilities, and metrics
- **Benefits:** Better load balancing decisions, improved session recovery, detailed monitoring

## 🗄️ Data Architecture

### Hybrid Data Ownership Matrix

| Data Type            | Owner   | Storage            | Responsibility                     | Sync Method        |
| -------------------- | ------- | ------------------ | ---------------------------------- | ------------------ |
| **User Accounts**    | Backend | PostgreSQL         | Authentication, billing, tiers     | N/A                |
| **Session Metadata** | Backend | PostgreSQL         | Routing, status, worker assignment | Real-time          |
| **API Keys**         | Backend | PostgreSQL         | Authentication, rate limiting      | N/A                |
| **Worker Registry**  | Backend | PostgreSQL + Redis | Health, load balancing             | Enhanced Heartbeat |
| **Usage Records**    | Backend | PostgreSQL         | Billing, analytics, compliance     | Batch sync         |
| **System Logs**      | Backend | PostgreSQL         | Audit, troubleshooting             | Real-time          |
| **Webhooks**         | Backend | PostgreSQL         | Event notifications, integrations  | Real-time          |
| **Messages**         | Worker  | MinIO + Cache      | Chat history, delivery status      | Event-driven       |
| **Session State**    | Worker  | MinIO + Local      | Baileys internal state             | Status updates     |
| **Media Files**      | Worker  | MinIO              | Images, documents, audio           | On-demand          |
| **QR Codes**         | Worker  | Memory/Cache       | Temporary authentication           | Real-time          |

### Backend Database Schema (PostgreSQL)

```
Users (id, email, passwordHash, role, tier, isActive, timestamps)
  ├── Sessions (id, userId, workerId, name, phoneNumber, status, qrCode, timestamps)
  │   ├── ApiKeys (id, sessionId, key, name, isActive, lastUsed, expiresAt)
  │   └── UsageRecords (id, userId, sessionId, apiKeyId, usageCount, billingDate)

Workers (id, endpoint, status, sessionCount, maxSessions, cpuUsage, memoryUsage, lastHeartbeat, timestamps)
  ├── Sessions (foreign key relationship)
  └── WorkerMetrics (id, workerId, cpuUsage, memoryUsage, sessionCount, messageCount, timestamp)

SystemLogs (id, level, service, message, details, userId, sessionId, workerId, timestamp)
Webhooks (id, sessionId, url, events, secret, isActive, lastDelivery, failureCount)
WebhookDeliveries (id, webhookId, event, payload, status, responseCode, attempts, nextRetry)
Messages (id, sessionId, direction, fromNumber, toNumber, messageType, content, status, timestamps)
```

### Worker MinIO Storage Structure

```
// Worker stores data in MinIO buckets
MinIO Buckets:
├── sessions/
│   ├── user123-personal/
│   │   ├── auth_info_baileys/     # Baileys auth state files
│   │   ├── session-data.json      # Session metadata
│   │   └── messages/              # Message history files
│   │       ├── 2024-01-15.json    # Daily message logs
│   │       └── 2024-01-16.json
│   └── user456-business/
│       ├── auth_info_baileys/
│       ├── session-data.json
│       └── messages/
├── media/
│   ├── user123-personal/
│   │   ├── images/
│   │   ├── documents/
│   │   └── audio/
│   └── user456-business/
└── temp/
    ├── qr-codes/                  # Temporary QR codes
    └── uploads/                   # Temporary file uploads

// Worker in-memory cache for active sessions
sessionCache: {
  "user123-personal": {
    sessionId: "user123-personal",
    userId: "user123",
    status: "connected",
    phoneNumber: "+6281234567890",
    lastActivity: "2024-01-15T10:30:00Z",
    sock: baileysSockInstance,     // Active Baileys connection
    messageQueue: []               // Pending messages
  }
}
```

### Redis Data Structure (Backend)

```
session_routing: {
  "sessionId1": "workerId1",
  "sessionId2": "workerId2"
}

workers: {
  "workerId1": {
    "endpoint": "http://worker1:8001",
    "status": "online",
    "sessionCount": 25,
    "lastHeartbeat": "2024-01-15T10:30:00Z"
  }
}

rate_limits: {
  "user:userId1": 150,  // Current request count
  "message_limit:userId1": 45  // Current message count
}
```

### Data Synchronization Strategies

#### 1. Real-time Sync (Critical Data)

- **Session Status:** Worker → Backend (immediate)
- **Connection Events:** Worker → Backend (immediate)
- **Error Notifications:** Worker → Backend (immediate)
- **QR Code Updates:** Worker → Backend (webhook callback)

#### 2. Batch Sync (Analytics Data)

- **Message Statistics:** Worker → Backend (hourly)
- **Usage Metrics:** Worker → Backend (daily)
- **Performance Data:** Worker → Backend (hourly)

#### 3. On-demand Sync (Historical Data)

- **Message History:** Backend ← Worker (when requested)
- **Media Files:** Backend ← Worker (when requested)
- **Session Logs:** Backend ← Worker (for troubleshooting)

## 🔌 API Architecture

### Authentication Layers

1. **JWT Authentication:** For frontend dashboard access
2. **API Key Authentication:** For external API access
3. **Worker Token Authentication:** For internal worker communication

### API Versioning

- **URL Versioning:** `/api/v1/` prefix for all endpoints
- **Backward Compatibility:** Maintain v1 while developing v2
- **Deprecation Strategy:** 6-month notice for breaking changes

### Rate Limiting Strategy

```
Tier-based Limits:
- BASIC: 100 messages/hour, 1000 API calls/hour
- PRO: 1000 messages/hour, 10000 API calls/hour
- MAX: 10000 messages/hour, 100000 API calls/hour

Global Limits:
- 1000 requests/15min per IP
- 60 session operations/minute per user
```

## 🔄 Worker Orchestration Architecture

### Worker Discovery

```
1. Auto-Discovery (Kubernetes):
   - Workers register via service discovery
   - Backend polls K8s API for worker pods
   - Automatic registration on pod startup

2. Manual Registration:
   - Admin adds worker via dashboard
   - Worker endpoint validation
   - Health check before activation
```

### Load Balancing Algorithm

```
Worker Selection Priority:
1. Worker status = "ONLINE"
2. sessionCount < maxSessions
3. Lowest sessionCount first
4. Lowest CPU usage second
5. Lowest memory usage third
```

### Session Migration Flow

```
1. Detect worker failure (health check timeout)
2. Mark worker as "OFFLINE"
3. Get affected sessions from database
4. Find available target workers
5. For each session:
   - Update database workerId
   - Update Redis routing
   - Notify new worker to load session
   - Update session counts
```

## 🔒 Security Architecture

### Authentication Flow

```
1. User Login:
   - POST /api/auth/login
   - Validate credentials
   - Generate JWT token
   - Return user data + token

2. API Key Usage:
   - Include Authorization: Bearer {apiKey} header
   - Validate key in database
   - Check expiration and permissions
   - Update last used timestamp
```

### Authorization Layers

```
1. Route-level: requireAuth middleware
2. Resource-level: User can only access own sessions
3. Admin-level: requireAdmin for worker management
4. Worker-level: Worker token for internal APIs
```

### Data Protection

```
- Passwords: bcrypt with 12 rounds
- API Keys: Cryptographically secure random generation
- Session Data: Encrypted at rest in MinIO
- Database: Connection encryption (SSL)
- Redis: AUTH password protection
```

## 📊 Monitoring Architecture

### Health Check Endpoints

```
GET /health - Basic server health
GET /health/detailed - Database, Redis, Worker status
GET /metrics - Prometheus metrics (if enabled)
```

### Logging Strategy

```
Levels:
- ERROR: System errors, failed requests
- WARN: Worker failures, rate limit hits
- INFO: User actions, session events
- DEBUG: Detailed request/response data

Destinations:
- Console: Development
- File: Production (rotated daily)
- External: ELK stack (optional)
```

### Metrics Collection

```
Application Metrics:
- Request count by endpoint
- Response time percentiles
- Error rate by endpoint
- Active session count
- Worker health scores

Business Metrics:
- User registration rate
- Session creation success rate
- Message volume by tier
- API usage patterns
```

## 🚀 Deployment Architecture

### Development Environment

```
docker-compose.yml:
- Backend service
- PostgreSQL database
- Redis cache
- MinIO storage
- Adminer (database UI)
```

### Production Environment (Kubernetes)

```
Deployments:
- backend-api (3 replicas)
- postgresql (StatefulSet)
- redis (StatefulSet)
- minio (StatefulSet)

Services:
- backend-service (LoadBalancer)
- postgres-service (ClusterIP)
- redis-service (ClusterIP)
- minio-service (ClusterIP)

ConfigMaps:
- backend-config
- database-config

Secrets:
- database-credentials
- jwt-secrets
- api-keys
```

## 🔄 Critical Implementation Paths

### Session Creation Flow

```
src/routes/session.js → src/controllers/session.js → src/services/session.js
├── Check user tier limits
├── Get available worker (load-balancer.js)
├── Create session in database
├── Generate session API key
├── Create session on worker (proxy.js)
├── Update Redis routing
└── Return session data with QR code
```

### Message Sending Flow

```
src/routes/api.js → src/controllers/session.js → src/services/session.js
├── Validate API key and session
├── Get worker from Redis routing
├── Forward request to worker (proxy.js)
├── Log message in database
└── Return response to client
```

### Worker Health Monitoring

```
src/services/worker.js (background process)
├── Get all online workers from database
├── Send GET /health to each worker
├── Update worker metrics in database
├── Mark offline workers as "OFFLINE"
├── Trigger session migration for failed workers
└── Update Redis worker status
```

## 🎯 Performance Considerations

### Database Optimization

- **Indexes:** On frequently queried fields (userId, sessionId, workerId)
- **Connection Pooling:** Prisma connection pool (10-20 connections)
- **Query Optimization:** Use select specific fields, avoid N+1 queries

### Redis Optimization

- **Connection Pooling:** ioredis cluster mode for high availability
- **Memory Management:** Set TTL for temporary data
- **Pipeline Operations:** Batch Redis operations where possible

### API Performance

- **Response Caching:** Cache worker status, user data
- **Compression:** gzip compression for API responses
- **Keep-Alive:** HTTP keep-alive for worker communication

## 🔧 Current Implementation Status

### Completed Components (✅)

#### Worker Management System

- **WorkerController:** ES6 modules, static methods, ApiResponse format, workerId normalization
- **WorkerService:** Standalone function architecture, comprehensive error handling, enhanced heartbeat system
- **Worker Routes:** Authentication middleware, rate limiting, validation integration
- **Worker Validation:** Express-validator integration with proper separation of concerns
- **Error Handling:** ConnectivityError class for user-friendly connectivity error messages
- **Data Normalization:** Automatic workerId normalization to hyphen-only format
- **Enhanced Heartbeat:** Rich session data with individual statuses, capabilities, and metrics (legacy code removed)
- **Session Recovery:** Automatic session recovery after worker restarts with stale worker detection

#### Session Management System

- **SessionController:** Complete CRUD operations with two-phase session creation architecture
- **SessionService:** Comprehensive business logic with worker assignment and load balancing
- **ProxyService:** Worker communication service with retry logic and timeout handling
- **Session Routes:** Authentication middleware, rate limiting, validation integration
- **Session Validation:** Express-validator integration with comprehensive validation rules
- **Redis Integration:** Session routing and high-performance lookups
- **QR Code Management:** Real-time QR code generation, storage, and polling mechanism
- **Message Sending:** API key authentication with rate limiting and worker routing

#### Webhook System

- **WebhookController:** Complete webhook management with CRUD operations
- **WebhookService:** Event delivery system with retry logic and validation
- **Webhook Routes:** Authentication middleware and rate limiting
- **Webhook Validation:** Comprehensive validation for webhook operations
- **Event Integration:** Integration with session and worker events

#### Authentication & User Management

- **AuthController & AuthService:** JWT authentication, registration, login
- **UserController & UserService:** User CRUD operations, profile management
- **Middleware:** JWT authentication, API key validation, rate limiting
- **Validation:** Comprehensive input validation with express-validator

#### Project Infrastructure

- **Database:** Prisma ORM with PostgreSQL, comprehensive schema design
- **Routes:** API versioning, proper route organization, MVP pattern
- **Testing:** REST files for all implemented endpoints
- **Documentation:** Memory bank with comprehensive project documentation

### Architecture Patterns Implemented

#### 1. Standalone Function Service Pattern

```javascript
// Services use standalone functions instead of classes
export const registerWorker = async (workerId, endpoint, maxSessions) => {
  // Implementation
};

export default {
  registerWorker,
  // Other functions
};
```

#### 2. Controller Data Normalization Pattern

```javascript
// Controllers handle data transformation before service calls
const normalizeWorkerId = (workerId) => {
  return workerId
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/_/g, "-") // Replace underscores with hyphens
    .replace(/[^a-z0-9-]/g, "") // Remove invalid characters
    .replace(/-+/g, "-") // Collapse multiple hyphens
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
};
```

#### 3. Enhanced Error Handling Pattern

```javascript
// Custom error classes for specific error types
export class ConnectivityError extends Error {
  constructor(message, originalError = null) {
    super(message);
    this.name = "ConnectivityError";
    this.originalError = originalError;
  }
}
```

### Next Implementation Phase

#### Message History System (📋 NEXT)

- **MessageController:** Message history retrieval and analytics
- **MessageService:** Message storage, search, and analytics
- **Message Routes:** API endpoints for message management
- **Analytics Integration:** Usage tracking and reporting

#### Session Migration System (📋 FUTURE)

- **Migration Service:** Automatic session failover between workers
- **Health Monitoring:** Enhanced worker failure detection
- **Load Balancing:** Advanced resource-based worker selection
- **Recovery Logic:** Seamless session state transfer
