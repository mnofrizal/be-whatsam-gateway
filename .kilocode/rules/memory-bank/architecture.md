# WhatsApp Gateway PaaS Backend - System Architecture

## 🏗️ Overall System Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Frontend       │    │  Backend API    │    │  WhatsApp       │
│  Dashboard      │◄──►│  Gateway        │◄──►│  Workers        │
│  (Next.js)      │    │  (Node.js)      │    │  (Baileys)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │  Storage Layer  │
                       │ PostgreSQL +    │
                       │ Redis + MinIO   │
                       └─────────────────┘
```

### Service Communication Flow

```
Customer/Admin → Frontend Dashboard → Backend API Gateway → WhatsApp Workers → Baileys → WhatsApp
```

## 📁 Backend Source Code Architecture

### Directory Structure

```
src/
├── controllers/         # HTTP request handlers
│   ├── auth.js         # Authentication endpoints
│   ├── user.js         # User management
│   ├── session.js      # Session operations
│   ├── worker.js       # Worker management
│   ├── admin.js        # Admin operations
│   ├── webhook.js      # Webhook handling
│   └── health.js       # Health check
├── services/           # Business logic layer
│   ├── auth.js         # Authentication service
│   ├── user.js         # User service
│   ├── session.js      # Session orchestration
│   ├── worker.js       # Worker management service
│   ├── load-balancer.js # Load balancing logic
│   ├── proxy.js        # Request proxy to workers
│   └── notification.js # Notification service
├── middleware/         # Express middleware
│   ├── auth.js         # JWT authentication
│   ├── rbac.js         # Role-based access control
│   ├── validation.js   # Request validation
│   ├── rate-limit.js   # Rate limiting
│   ├── error-handler.js # Error handling
│   └── logger.js       # Request logging
├── models/             # Data models
│   ├── user.js         # User model
│   ├── session.js      # Session model
│   ├── worker.js       # Worker model
│   └── message.js      # Message model
├── utils/              # Utility functions
│   ├── logger.js       # Winston logger
│   ├── redis.js        # Redis utilities
│   ├── crypto.js       # Encryption utilities
│   ├── api-key.js      # API key generation
│   └── helpers.js      # General utilities
├── routes/             # API route definitions
│   ├── auth.js         # Authentication routes
│   ├── user.js         # User routes
│   ├── session.js      # Session routes
│   ├── worker.js       # Worker routes
│   ├── admin.js        # Admin routes
│   ├── api.js          # External API routes
│   └── index.js        # Route aggregator
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

### 1. API Gateway Pattern

- **Purpose:** Central entry point for all client requests
- **Implementation:** Backend routes requests to appropriate workers
- **Benefits:** Load balancing, authentication, rate limiting in one place

### 2. Service Layer Pattern

- **Purpose:** Separate business logic from HTTP handling
- **Implementation:** Controllers call services, services handle business logic
- **Benefits:** Testable, reusable business logic

### 3. Repository Pattern (via Prisma)

- **Purpose:** Abstract database operations
- **Implementation:** Prisma ORM handles database interactions
- **Benefits:** Database-agnostic code, easy testing with mocks

### 4. Proxy Pattern

- **Purpose:** Forward requests to appropriate workers
- **Implementation:** ProxyService routes requests based on session mapping
- **Benefits:** Transparent worker communication, failover handling

## 🗄️ Data Architecture

### Database Schema (PostgreSQL)

```
Users (id, email, passwordHash, role, tier, apiKey, isActive, timestamps)
  ├── Sessions (id, userId, workerId, name, phoneNumber, status, qrCode, timestamps)
  │   ├── Messages (id, sessionId, direction, fromNumber, toNumber, messageType, content, status, timestamp)
  │   └── ApiKeys (id, userId, sessionId, key, name, isActive, lastUsed, expiresAt)
  └── ApiKeys (id, userId, key, name, isActive, lastUsed, expiresAt)

Workers (id, endpoint, status, sessionCount, maxSessions, cpuUsage, memoryUsage, lastHeartbeat, timestamps)
  ├── Sessions (foreign key relationship)
  └── WorkerMetrics (id, workerId, cpuUsage, memoryUsage, sessionCount, messageCount, timestamp)
```

### Redis Data Structure

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
- FREE: 100 messages/hour, 1000 API calls/hour
- PRO: 1000 messages/hour, 10000 API calls/hour
- PREMIUM: 10000 messages/hour, 100000 API calls/hour

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
   - Include X-API-Key header
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
