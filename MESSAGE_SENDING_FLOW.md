# WhatsApp Gateway - Message Sending Flow Documentation

## 🎯 Overview

This document explains the complete message sending flow from API call to WhatsApp delivery, including backend endpoints, worker endpoints, and the current implementation issue.

## 📡 Current Message Sending Flow

### 1. API Request (Frontend/External)

```http
POST /api/sessions/{sessionId}/send
Authorization: Bearer {apiKey}
Content-Type: application/json

{
  "to": "6281234567890@s.whatsapp.net",
  "type": "text",
  "message": "Hello World!"
}
```

### 2. Backend Processing Chain

```
API Request → Session Controller → Session Service → Proxy Service → Worker → WhatsApp
```

#### Step 2.1: Session Controller (`src/controllers/session.controller.js`)

```javascript
// Line 321-367: sendMessage function
export const sendMessage = asyncHandler(async (req, res) => {
  const { id: sessionId } = req.params;
  const userId = req.user.userId;
  const { to, type, message, media, caption, filename } = req.body;

  // Route message request to worker
  const result = await sessionService.routeRequest(
    sessionId,
    "/message/send", // ⚠️ ISSUE: This endpoint path
    messageData,
    "POST"
  );
});
```

#### Step 2.2: Session Service (`src/services/session.service.js`)

```javascript
// Line 938-992: routeRequest method
async routeRequest(sessionId, endpoint, data, method = "POST") {
  // Get worker from Redis/Database
  const worker = await WorkerService.getWorkerById(workerId);

  // Forward request to worker
  const response = await ProxyService.forwardRequest(
    worker.endpoint,     // e.g., "http://worker1:8001"
    endpoint,           // "/message/send"
    data,
    method
  );
}
```

#### Step 2.3: Proxy Service (`src/services/proxy.service.js`)

```javascript
// Line 318-341: forwardRequest method (CURRENTLY USED)
async forwardRequest(workerEndpoint, endpoint, data = null, method = "POST") {
  const url = `${workerEndpoint}${endpoint}`;
  // Calls: http://worker1:8001/message/send
  const response = await this.makeRequest(method, url, data);
}

// Line 204-236: sendMessage method (DEDICATED - NOT USED)
async sendMessage(workerEndpoint, sessionId, messageData) {
  const response = await this.makeRequest(
    "POST",
    `${workerEndpoint}/api/session/${sessionId}/send`,  // Different endpoint!
    messageData
  );
}
```

## 🚨 Current Issue: Endpoint Path Mismatch

### Problem

There are **two different endpoint patterns** in the codebase:

1. **Generic Pattern (Currently Used):**
   - Backend calls: `http://worker:8001/message/send`
   - Used by: `routeRequest()` → `forwardRequest()`

2. **Dedicated Pattern (Available but Not Used):**
   - Backend calls: `http://worker:8001/api/session/{sessionId}/send`
   - Used by: `ProxyService.sendMessage()` method

### Impact

- Workers don't know which endpoint pattern to implement
- Message sending fails because of endpoint mismatch
- Inconsistent API design between generic and specific methods

## 🛠️ Solution Options

### Option 1: Use Dedicated sendMessage Method (RECOMMENDED)

**Change:** Modify session controller to use `ProxyService.sendMessage()` directly

**Backend Endpoint:** `/api/sessions/{sessionId}/send`
**Worker Endpoint:** `/api/session/{sessionId}/send`

```javascript
// Session Controller (FIXED)
const result = await ProxyService.sendMessage(
  worker.endpoint,
  sessionId,
  messageData
);
```

**Pros:**

- More specific and purpose-built for messaging
- Better error handling for message operations
- Cleaner separation of concerns
- Follows RESTful patterns

### Option 2: Standardize on Generic Pattern

**Change:** Keep current flow but ensure workers implement `/message/send`

**Backend Endpoint:** `/api/sessions/{sessionId}/send`
**Worker Endpoint:** `/message/send`

**Pros:**

- No backend code changes needed
- Simpler worker implementation
- Generic approach for all operations

## 📋 Required Worker Endpoints

Based on the recommended solution (Option 1), workers should implement:

### Message Operations

```http
POST /api/session/{sessionId}/send
GET  /api/session/{sessionId}/messages
```

### Session Operations

```http
POST /api/session/start
GET  /api/session/{sessionId}/status
DELETE /api/session/{sessionId}
POST /api/session/{sessionId}/disconnect
POST /api/session/{sessionId}/logout
POST /api/session/{sessionId}/restart
```

### Health Check

```http
GET /health
```

## 🔄 Complete Message Flow (Fixed)

### 1. API Request

```http
POST /api/sessions/user123-personal/send
Authorization: Bearer sk_test_abc123
Content-Type: application/json

{
  "to": "6281234567890@s.whatsapp.net",
  "type": "text",
  "message": "Hello from API!"
}
```

### 2. Backend Processing

```javascript
// 1. Session Controller validates and processes
const result = await ProxyService.sendMessage(
  "http://worker1:8001",
  "user123-personal",
  {
    to: "6281234567890@s.whatsapp.net",
    type: "text",
    message: "Hello from API!",
  }
);
```

### 3. Worker Request

```http
POST http://worker1:8001/api/session/user123-personal/send
Authorization: Bearer worker-secret-token
Content-Type: application/json

{
  "to": "6281234567890@s.whatsapp.net",
  "type": "text",
  "message": "Hello from API!"
}
```

### 4. Worker Response

```json
{
  "success": true,
  "data": {
    "messageId": "msg_abc123",
    "status": "sent",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### 5. Backend Response

```json
{
  "success": true,
  "data": {
    "messageId": "msg_abc123",
    "status": "sent",
    "sessionId": "user123-personal",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

## 🧪 Testing the Fix

### Backend Testing (REST Client)

```http
### Send Text Message
POST http://localhost:8000/api/sessions/user123-personal/send
Authorization: Bearer {{apiKey}}
Content-Type: application/json

{
  "to": "6281234567890@s.whatsapp.net",
  "type": "text",
  "message": "Hello World!"
}

### Send Image Message
POST http://localhost:8000/api/sessions/user123-personal/send
Authorization: Bearer {{apiKey}}
Content-Type: application/json

{
  "to": "6281234567890@s.whatsapp.net",
  "type": "image",
  "media": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "caption": "Check this image!"
}
```

### Worker Testing (Mock Worker)

```javascript
// Mock worker endpoint for testing
app.post("/api/session/:sessionId/send", (req, res) => {
  const { sessionId } = req.params;
  const { to, type, message } = req.body;

  console.log(`Sending ${type} message to ${to} via session ${sessionId}`);

  res.json({
    success: true,
    data: {
      messageId: `msg_${Date.now()}`,
      status: "sent",
      timestamp: new Date().toISOString(),
    },
  });
});
```

## 📝 Implementation Checklist

### Backend Changes (Option 1)

- [ ] Modify `SessionController.sendMessage()` to use `ProxyService.sendMessage()`
- [ ] Update session service to handle direct proxy calls
- [ ] Test message sending with mock worker
- [ ] Update REST testing file with correct examples

### Worker Implementation

- [ ] Implement `POST /api/session/{sessionId}/send` endpoint
- [ ] Handle different message types (text, image, document, etc.)
- [ ] Return proper response format
- [ ] Add authentication validation

### Testing

- [ ] Test text message sending
- [ ] Test media message sending
- [ ] Test error scenarios (invalid session, worker down)
- [ ] Verify message logging in database

## 🎯 Next Steps

1. **Fix Backend Implementation** - Use dedicated `sendMessage` method
2. **Create Mock Worker** - For testing message endpoints
3. **Test Message Flow** - End-to-end testing
4. **Update Documentation** - REST API examples
5. **Implement Real Worker** - Baileys integration for actual WhatsApp sending

---

**Status:** Issue Identified - Ready for Implementation  
**Priority:** High - Core functionality  
**Estimated Time:** 2-3 hours for backend fix + testing
