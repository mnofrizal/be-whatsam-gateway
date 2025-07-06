# WhatsApp Gateway PaaS Backend

A scalable, multi-tenant WhatsApp Gateway Platform-as-a-Service (PaaS) backend built with Node.js, Express, and PostgreSQL. This backend serves as the central orchestrator for managing users, WhatsApp workers, session routing, and providing unified APIs for both frontend dashboard and external integrations.

## 🚀 Features

- **Multi-Tenant Architecture**: Isolated user environments with role-based access control
- **Worker Orchestration**: Automatic worker discovery, health monitoring, and load balancing
- **Session Management**: WhatsApp session lifecycle management with automatic failover
- **High Availability**: Session migration between workers with minimal downtime
- **Comprehensive APIs**: RESTful APIs for dashboard and external integrations
- **Real-time Monitoring**: Worker health metrics and system analytics
- **Tier-based Limits**: BASIC, Pro, and MAX tiers with usage restrictions
- **Webhook Support**: Real-time event notifications to external systems

## 🏗️ Architecture

```
User/Administrator → Frontend Dashboard → Backend API Gateway → WhatsApp Workers → Baileys → WhatsApp
```

### Core Components

- **Backend API Gateway**: Central orchestrator (this repository)
- **WhatsApp Workers**: Multiple Baileys instances handling WhatsApp connections
- **Frontend Dashboard**: Unified web interface for customers and admins
- **Storage Layer**: PostgreSQL + Redis + MinIO for different data types

## 🛠️ Technology Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis with ioredis
- **Authentication**: JWT + bcrypt
- **Documentation**: Swagger/OpenAPI
- **Containerization**: Docker & Docker Compose

## 📋 Prerequisites

- Node.js 18.x or higher
- npm 9.x or higher
- Docker and Docker Compose
- PostgreSQL 15.x (via Docker)
- Redis 7.x (via Docker)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd be-whatsam-gateway
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Environment Variables

```bash
cp .env.example .env
# Edit .env file with your configuration
```

### 4. Start Infrastructure Services

```bash
# Start PostgreSQL, Redis, MinIO, and management UIs
docker-compose up -d

# Check services status
docker-compose ps
```

### 5. Setup Database

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev --name init

# (Optional) Seed database with sample data
npm run db:seed
```

### 6. Start Development Server

```bash
# Start in development mode with auto-reload
npm run dev

# Or start in production mode
npm start
```

The API will be available at `http://localhost:8000`

## 📚 API Documentation

### Health Check

```bash
curl http://localhost:8000/api/v1/health
```

### API Endpoints

- **Authentication**: `/api/v1/auth/*`
- **User Management**: `/api/v1/users/*`
- **Session Management**: `/api/v1/sessions/*`
- **Worker Management**: `/api/v1/workers/*` (Admin only)
- **Admin APIs**: `/api/v1/admin/*` (Admin only)
- **External APIs**: `/api/v1/external/*` (API Key required)

### Interactive Documentation

When running in development mode, visit:

- API Documentation: `http://localhost:8000/api/v1/docs`

## 🗄️ Database Management

### Access Database UI

- **Adminer**: `http://localhost:8080`
  - Server: `postgres`
  - Username: `postgres`
  - Password: `password`
  - Database: `whatsapp_gateway`

### Prisma Studio

```bash
npx prisma studio
```

### Database Operations

```bash
# Create new migration
npx prisma migrate dev --name migration_name

# Reset database (development only)
npx prisma migrate reset

# Deploy migrations (production)
npx prisma migrate deploy

# View database schema
npx prisma db pull
```

## 🔧 Redis Management

### Access Redis UI

- **Redis Commander**: `http://localhost:8081`

### Redis CLI

```bash
# Connect to Redis container
docker exec -it whatsapp-gateway-redis redis-cli -a redispassword

# Common commands
KEYS *
GET session_routing
HGETALL workers
```

## 📊 Service Tiers

| Tier      | Price     | Sessions | Messages/Hour | API Calls/Hour |
| --------- | --------- | -------- | ------------- | -------------- |
| **Basic** | $0        | 1        | 100           | 1,000          |
| **Pro**   | $29/month | 5        | 1,000         | 10,000         |
| **Max**   | $99/month | 20       | 10,000        | 100,000        |

## 🔒 Authentication

### JWT Authentication (Dashboard)

```bash
# Login
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# Use JWT token
curl -H "Authorization: Bearer <jwt-token>" \
  http://localhost:8000/api/v1/users/profile
```

### API Key Authentication (External)

```bash
# Use API key
curl -H "X-API-Key: <api-key>" \
  http://localhost:8000/api/v1/external/send \
  -d '{"sessionId":"session-id","to":"1234567890","message":"Hello"}'
```

## 🔄 Development Workflow

### Project Structure

```
src/
├── controllers/         # HTTP request handlers (Week 2+)
├── services/           # Business logic layer (Week 2+)
├── middleware/         # Express middleware
├── models/             # Data models (Week 2+)
├── utils/              # Utility functions
├── routes/             # API route definitions
├── config/             # Configuration files
└── app.js              # Express app setup
```

### Development Commands

```bash
# Development with auto-reload
npm run dev

# Production mode
npm start

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Format code
npm run format

# Database operations
npm run db:migrate
npm run db:seed
npm run db:reset
```

### Code Quality

- **ESLint**: Code linting and style enforcement
- **Prettier**: Code formatting
- **Husky**: Git hooks for pre-commit checks
- **Jest**: Unit and integration testing

## 🐳 Docker Deployment

### Build Docker Image

```bash
docker build -t whatsapp-backend:latest .
```

### Run with Docker

```bash
docker run -d \
  --name whatsapp-backend \
  --env-file .env \
  -p 8000:8000 \
  whatsapp-backend:latest
```

### Production Docker Compose

```bash
# Start all services including backend
docker-compose -f docker-compose.prod.yml up -d
```

## 📈 Monitoring & Logging

### Log Files

```bash
# View logs
tail -f logs/combined.log
tail -f logs/error.log

# View Docker logs
docker-compose logs -f backend
```

### Health Monitoring

```bash
# Basic health check
curl http://localhost:8000/api/v1/health

# Detailed health check (Admin only)
curl -H "Authorization: Bearer <admin-jwt>" \
  http://localhost:8000/api/v1/admin/system/health
```

## 🧪 Testing

### Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- auth.test.js
```

### Test Database

Tests use a separate test database. Make sure to set `TEST_DATABASE_URL` in your `.env` file.

## 🚀 Production Deployment

### Environment Setup

1. Copy `.env.example` to `.env.production`
2. Update all production values (secrets, URLs, etc.)
3. Set `NODE_ENV=production`

### Database Migration

```bash
# Run migrations in production
npx prisma migrate deploy
```

### Process Management

```bash
# Using PM2
npm install -g pm2
pm2 start ecosystem.config.js
pm2 status
pm2 logs
```

## 🔧 Configuration

### Environment Variables

Key environment variables (see `.env.example` for complete list):

- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `JWT_SECRET`: JWT signing secret (change in production)
- `WORKER_AUTH_TOKEN`: Worker authentication token
- `CORS_ORIGIN`: Allowed origins for CORS

### Rate Limiting

Configure rate limits per tier in environment variables:

- `BASIC_TIER_MAX_MESSAGES_PER_HOUR`
- `PRO_TIER_MAX_MESSAGES_PER_HOUR`
- `MAX_TIER_MAX_MESSAGES_PER_HOUR`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow the existing code style
- Write tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting PR

## 📝 API Examples

### Create WhatsApp Session

```bash
curl -X POST http://localhost:8000/api/v1/sessions \
  -H "Authorization: Bearer <jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My WhatsApp Session",
    "sessionId": "my-session-001"
  }'
```

### Send Message

```bash
curl -X POST http://localhost:8000/api/v1/external/send \
  -H "X-API-Key: <api-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "my-session-001",
    "to": "6281234567890@s.whatsapp.net",
    "type": "text",
    "message": "Hello from API!"
  }'
```

### Get Session Status

```bash
curl -H "X-API-Key: <api-key>" \
  http://localhost:8000/api/v1/external/session/my-session-001/status
```

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Failed**

   ```bash
   # Check if PostgreSQL is running
   docker-compose ps postgres

   # Check database logs
   docker-compose logs postgres
   ```

2. **Redis Connection Failed**

   ```bash
   # Check if Redis is running
   docker-compose ps redis

   # Test Redis connection
   docker exec -it whatsapp-gateway-redis redis-cli ping
   ```

3. **Worker Registration Failed**

   ```bash
   # Check worker authentication token
   echo $WORKER_AUTH_TOKEN

   # Check worker endpoint accessibility
   curl http://worker-endpoint:8001/health
   ```

### Debug Mode

Enable debug mode in `.env`:

```bash
DEBUG_MODE=true
LOG_LEVEL=debug
```

## 📞 Support

- **Documentation**: Check this README and API documentation
- **Issues**: Create an issue on GitHub
- **Email**: support@whatsapp-gateway.com

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🎯 Roadmap

### Week 1-2: Foundation ✅

- [x] Project setup and basic Express server
- [x] Database schema and migrations
- [x] Authentication system
- [x] Basic middleware and error handling

### Week 3-4: Core Features (In Progress)

- [ ] Worker management and discovery
- [ ] Session orchestration
- [ ] Load balancing implementation
- [ ] Request proxy system

### Week 5-6: Advanced Features

- [ ] Session migration
- [ ] Webhook system
- [ ] Analytics and monitoring
- [ ] Admin dashboard APIs

### Week 7: Production Ready

- [ ] Security hardening
- [ ] Performance optimization
- [ ] Comprehensive testing
- [ ] Production deployment

---

**Project**: WhatsApp Gateway PaaS Backend  
**Version**: 1.0.0  
**Node.js**: 18+  
**License**: MIT
