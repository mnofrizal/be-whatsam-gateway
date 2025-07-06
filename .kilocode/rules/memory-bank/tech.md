# WhatsApp Gateway PaaS Backend - Technology Stack

## 🚀 Core Technology Stack

### Runtime & Framework

- **Node.js:** 18+ (LTS version for stability)
- **Express.js:** 4.18+ (Web framework)
- **ES6 Modules:** Native ES modules with `"type": "module"` in package.json
- **TypeScript:** Optional (can be added later for type safety)

### Database & Storage

- **PostgreSQL:** 15+ (Primary database for structured data)
- **Prisma ORM:** 5.7+ (Database abstraction layer)
- **Redis:** 7+ (Caching and session routing)
- **ioredis:** 5.3+ (Redis client for Node.js)

### Authentication & Security

- **JWT:** jsonwebtoken 9.0+ (Token-based authentication)
- **bcryptjs:** 2.4+ (Password hashing)
- **helmet:** 7.1+ (Security headers)
- **cors:** 2.8+ (Cross-origin resource sharing)

### API & Documentation

- **Swagger:** swagger-jsdoc + swagger-ui-express (API documentation)
- **express-validator:** 7.0+ (Input validation)
- **express-rate-limit:** 7.1+ (Rate limiting)

### Utilities & Monitoring

- **Winston:** 3.11+ (Logging)
- **axios:** 1.6+ (HTTP client for worker communication)
- **uuid:** 9.0+ (Unique ID generation)
- **PM2:** Production process management

## 📦 Package.json Dependencies

### Production Dependencies

```json
{
  "dependencies": {
    "@prisma/client": "^5.7.0",
    "axios": "^1.6.0",
    "bcryptjs": "^2.4.3",
    "compression": "^1.7.4",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "express-rate-limit": "^7.1.5",
    "express-validator": "^7.0.1",
    "helmet": "^7.1.0",
    "ioredis": "^5.3.2",
    "joi": "^17.13.3",
    "jsonwebtoken": "^9.0.2",
    "morgan": "^1.10.0",
    "prisma": "^5.7.0",
    "swagger-jsdoc": "^6.2.8",
    "swagger-ui-express": "^5.0.0",
    "uuid": "^9.0.1",
    "winston": "^3.11.0"
  }
}
```

### Development Dependencies

```json
{
  "devDependencies": {
    "@eslint/js": "^8.55.0",
    "eslint": "^8.55.0",
    "jest": "^29.7.0",
    "nodemon": "^3.0.2",
    "prettier": "^3.1.0",
    "supertest": "^6.3.3"
  }
}
```

## 🔧 Development Setup

## 🔧 Current Project Configuration

### Package.json Configuration

```json
{
  "name": "whatsapp-gateway-backend",
  "version": "1.0.0",
  "type": "module",
  "main": "src/app.js",
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  }
}
```

### Available Scripts

```bash
# Development
npm run dev          # Start with nodemon for auto-restart
npm start           # Production start

# Database
npm run db:generate # Generate Prisma client
npm run db:migrate  # Run database migrations
npm run db:deploy   # Deploy migrations to production
npm run db:studio   # Open Prisma Studio
npm run db:seed     # Seed database with initial data

# Testing
npm test            # Run Jest tests
npm run test:watch  # Run tests in watch mode
npm run test:coverage # Run tests with coverage

# Code Quality
npm run lint        # Run ESLint
npm run lint:fix    # Fix ESLint issues
npm run format      # Format code with Prettier
```

### Environment Requirements

- **Node.js:** 18.x or higher
- **npm:** 9.x or higher
- **PostgreSQL:** 15.x or higher
- **Redis:** 7.x or higher

### Local Development Stack

```bash
# Core services via Docker Compose
- PostgreSQL database
- Redis cache
- MinIO storage (optional for development)
- Adminer (database UI)

# Backend runs natively
npm run dev  # nodemon for auto-restart
```

### Environment Variables

```bash
# Server Configuration
PORT=8000
NODE_ENV=development
API_VERSION=v1

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/whatsapp_gateway
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=12

# Worker Communication
WORKER_AUTH_TOKEN=worker-secret-token
WORKER_HEALTH_CHECK_INTERVAL=30000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000

# Logging
LOG_LEVEL=info
LOG_FILE_PATH=./logs
```

## 🏗️ Development Tools

### Code Quality

- **ESLint:** Code linting and style enforcement
- **Prettier:** Code formatting
- **Husky:** Git hooks for pre-commit checks
- **lint-staged:** Run linters on staged files

### Testing Framework

- **Jest:** Unit and integration testing
- **Supertest:** HTTP assertion testing
- **Coverage:** Built-in Jest coverage reporting

### Database Tools

- **Prisma Studio:** Database GUI
- **Prisma Migrate:** Database migrations
- **Adminer:** Web-based database management

## 🐳 Containerization

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

### Docker Compose (Development)

```yaml
version: "3.8"
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: whatsapp_gateway
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data

  adminer:
    image: adminer:latest
    ports:
      - "8080:8080"
    depends_on:
      - postgres

volumes:
  postgres_data:
  redis_data:
```

## 🚀 Production Deployment

### Process Management

- **PM2:** Production process manager
- **Cluster Mode:** Multi-core utilization
- **Auto-restart:** Automatic recovery from crashes
- **Log Management:** Centralized logging with rotation

### PM2 Configuration

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: "whatsapp-backend",
      script: "./src/app.js",
      instances: "max",
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
        PORT: 8000,
      },
      error_file: "./logs/err.log",
      out_file: "./logs/out.log",
      log_file: "./logs/combined.log",
      time: true,
    },
  ],
};
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

## 🔍 Monitoring & Observability

### Application Monitoring

- **Winston:** Structured logging
- **Morgan:** HTTP request logging
- **Custom Metrics:** Business and technical KPIs

### Health Checks

```javascript
// Health check endpoints
GET / health; // Basic health
GET / health / detailed; // Database, Redis, Worker status
GET / metrics; // Prometheus metrics (optional)
```

### Log Levels

```javascript
// Winston log levels
{
  error: 0,    // System errors, failed requests
  warn: 1,     // Worker failures, rate limit hits
  info: 2,     // User actions, session events
  debug: 3     // Detailed request/response data
}
```

## 🔒 Security Configuration

### Security Headers (Helmet)

```javascript
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  })
);
```

### CORS Configuration

```javascript
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
```

### Rate Limiting

```javascript
// Global rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: "Too many requests from this IP",
});
```

## 📊 Performance Optimization

### Database Optimization

- **Connection Pooling:** Prisma connection pool (10-20 connections)
- **Query Optimization:** Select specific fields, avoid N+1 queries
- **Indexing:** Strategic indexes on frequently queried fields

### Redis Optimization

- **Connection Pooling:** ioredis cluster mode
- **Memory Management:** TTL for temporary data
- **Pipeline Operations:** Batch Redis operations

### API Performance

- **Response Compression:** gzip middleware
- **Keep-Alive:** HTTP keep-alive connections
- **Caching:** Strategic caching of frequently accessed data

## 🧪 Testing Strategy

### Test Types

- **Unit Tests:** Individual functions and services
- **Integration Tests:** API endpoints and database operations
- **Load Tests:** Performance under high load
- **Security Tests:** Authentication and authorization

### Test Configuration

```javascript
// jest.config.js
module.exports = {
  testEnvironment: "node",
  collectCoverageFrom: ["src/**/*.js", "!src/**/*.test.js"],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

## 🔄 Development Workflow

### Git Workflow

- **Main Branch:** Production-ready code
- **Develop Branch:** Integration branch
- **Feature Branches:** Individual features
- **Release Branches:** Release preparation

### CI/CD Pipeline

```yaml
# GitHub Actions example
name: Backend CI/CD
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "18"
      - run: npm ci
      - run: npm test
      - run: npm run lint
```

## 📚 Documentation Standards

### API Documentation

- **Swagger/OpenAPI:** Complete API specification
- **JSDoc:** Code documentation
- **README:** Setup and usage instructions

### Code Standards

- **ESLint:** Airbnb style guide
- **Prettier:** Consistent formatting
- **Naming Conventions:** camelCase for variables, PascalCase for classes
- **ES6 Modules:** Import/export syntax throughout the project
- **Validation Architecture:** Express-validator in dedicated validation files
- **Error Handling:** Custom error classes with proper HTTP status codes

## 🏗️ Current Architecture Patterns

### 1. Standalone Function Service Pattern

```javascript
// Services use standalone functions instead of classes
export const registerWorker = async (workerId, endpoint, maxSessions) => {
  // Implementation
};

export default {
  registerWorker,
  updateWorkerHeartbeat,
  // Other functions
};
```

### 2. Controller Data Normalization

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

### 3. Express-Validator Integration

```javascript
// Validation files with express-validator
export const validateWorkerRegistration = [
  body("workerId")
    .isLength({ min: 1, max: 50 })
    .withMessage("Worker ID must be between 1 and 50 characters"),
  body("endpoint")
    .isURL({ protocols: ["http", "https"] })
    .withMessage("Endpoint must be a valid HTTP/HTTPS URL"),
  body("maxSessions")
    .isInt({ min: 1, max: 1000 })
    .withMessage("Max sessions must be between 1 and 1000"),
];
```

### 4. Enhanced Error Handling

```javascript
// Custom error classes for specific error types
export class ConnectivityError extends Error {
  constructor(message, originalError = null) {
    super(message);
    this.name = "ConnectivityError";
    this.originalError = originalError;
  }
}

// Error middleware processing
if (err instanceof ConnectivityError) {
  return res.status(503).json({
    success: false,
    error: err.message,
    type: "connectivity_error",
  });
}
```
