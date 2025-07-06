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
│   ├── session.controller.js # Session operations
│   ├── worker.controller.js  # Worker management
│   ├── admin.controller.js   # Admin operations
│   ├── webhook.controller.js # Webhook handling
│   └── health.controller.js  # Health check
├── services/           # Business logic layer
│   ├── auth.service.js       # Authentication service
│   ├── user.service.js       # User service
│   ├── session.service.js    # Session orchestration
│   ├── worker.service.js     # Worker management service
│   ├── load-balancer.service.js # Load balancing logic
│   ├── proxy.service.js      # Request proxy to workers
│   └── notification.service.js # Notification service
├── middleware/         # Express middleware
│   ├── auth.js         # JWT authentication
│   ├── rbac.js         # Role-based access control
│   ├── validation.js   # Request validation
│   ├── rate-limit.js   # Rate limiting
│   ├── error-handler.js # Error handling
│   └── logger.js       # Request logging
├── utils/              # Utility functions
│   ├── logger.js       # Winston logger
│   ├── redis.js        # Redis utilities
│   ├── crypto.js       # Encryption utilities
│   ├── api-key.js      # API key generation
│   └── helpers.js      # General utilities
├── routes/             # API route definitions
│   ├── auth.routes.js        # Authentication routes
│   ├── user.routes.js        # User routes
│   ├── session.routes.js     # Session routes
│   ├── worker.routes.js      # Worker routes
│   ├── admin.routes.js       # Admin routes
│   ├── api.routes.js         # External API routes
│   └── index.js              # Route aggregator
├── config/             # Configuration files
│   ├── database.js     # Database configuration
│   ├── redis.js        # Redis configuration
│   ├── auth.js         # Auth configuration
│   └── swagger.js      # API documentation
├── prisma/             # Database layer
│   ├── schema.prisma   # Database schema
│   └── migrations/     # Database migrations
└── app.js              # Express app setup
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
- **Implementation:** Workers report status changes via webhook callbacks
- **Benefits:** No timeout issues, better error handling, scalable

## 🗄️ Data Architecture

### Hybrid Data Ownership Matrix

| Data Type            | Owner   | Storage            | Responsibility                     | Sync Method    |
| -------------------- | ------- | ------------------ | ---------------------------------- | -------------- |
| **User Accounts**    | Backend | PostgreSQL         | Authentication, billing, tiers     | N/A            |
| **Session Metadata** | Backend | PostgreSQL         | Routing, status, worker assignment | Real-time      |
| **API Keys**         | Backend | PostgreSQL         | Authentication, rate limiting      | N/A            |
| **Worker Registry**  | Backend | PostgreSQL + Redis | Health, load balancing             | Heartbeat      |
| **Usage Records**    | Backend | PostgreSQL         | Billing, analytics, compliance     | Batch sync     |
| **System Logs**      | Backend | PostgreSQL         | Audit, troubleshooting             | Real-time      |
| **Messages**         | Worker  | MinIO + Cache      | Chat history, delivery status      | Event-driven   |
| **Session State**    | Worker  | MinIO + Local      | Baileys internal state             | Status updates |
| **Media Files**      | Worker  | MinIO              | Images, documents, audio           | On-demand      |
| **QR Codes**         | Worker  | Memory/Cache       | Temporary authentication           | Real-time      |

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
