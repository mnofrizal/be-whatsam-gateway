# Socket.IO Event Emission Guide for Frontend Team

This document explains how the WhatsApp Gateway backend emits Socket.IO events and how the frontend should handle them.

## 🔌 Socket.IO Connection Setup

### Backend Configuration

- **Server URL**: `http://localhost:8000` (development)
- **Transport**: WebSocket with polling fallback
- **CORS**: Enabled for frontend origin
- **Authentication**: JWT token required

### Frontend Connection Example

```javascript
import { io } from "socket.io-client";

const socket = io("http://localhost:8000", {
  auth: {
    token: "your-jwt-token-here", // Get from login response
  },
  transports: ["websocket", "polling"],
});
```

## 🎯 Event Flow Overview

```
1. Frontend connects with JWT token
2. Backend authenticates and confirms connection
3. Frontend sends join_session event with sessionId
4. Backend adds socket to session room
5. Backend emits events to session room when things happen
6. Frontend receives real-time updates
```

## 📡 Events Emitted by Backend

### 1. Connection Confirmation

**Event**: `connected`
**When**: Immediately after successful authentication
**Payload**:

```javascript
{
  message: "Connected to WhatsApp Gateway",
  userId: "user-uuid-here",
  timestamp: "2024-01-15T10:30:00.000Z"
}
```

**Frontend Handler**:

```javascript
socket.on("connected", (data) => {
  console.log("Connected to backend:", data.message);
  console.log("User ID:", data.userId);
});
```

### 2. Session Room Join Confirmation

**Event**: `session_joined`
**When**: After successfully joining a session room
**Payload**:

```javascript
{
  sessionId: "da59c719-6c71-439f-b222-ac0366048b0b-ini-wg-baru-1752508259121",
  message: "Joined session room successfully",
  timestamp: "2024-01-15T10:30:00.000Z"
}
```

**Frontend Handler**:

```javascript
socket.on("session_joined", (data) => {
  console.log("Joined session room:", data.sessionId);
  // Update UI to show "Listening for updates..."
});
```

### 3. QR Code Updates ⭐ MAIN EVENT

**Event**: `qr_code_updated`
**When**: Worker generates new QR code for session
**Payload**:

```javascript
{
  sessionId: "da59c719-6c71-439f-b222-ac0366048b0b-ini-wg-baru-1752508259121",
  qrCode: "1@ABC123XYZ789...", // Raw QR string from Baileys
  status: "QR_REQUIRED",
  timestamp: "2024-01-15T10:30:00.000Z"
}
```

**Frontend Handler**:

```javascript
import QRCode from "qrcode.react"; // or similar library

socket.on("qr_code_updated", (data) => {
  console.log("QR Code received:", data);

  // Update state to show QR code
  setQrCode(data.qrCode);
  setSessionStatus(data.status);

  // Display QR code using library
  // <QRCode value={data.qrCode} size={256} />
});
```

### 4. Session Status Changes

**Event**: `session_status_changed`
**When**: Session status changes (connected, disconnected, etc.)
**Payload**:

```javascript
{
  sessionId: "da59c719-6c71-439f-b222-ac0366048b0b-ini-wg-baru-1752508259121",
  status: "CONNECTED", // or "DISCONNECTED", "QR_REQUIRED", "ERROR"
  phoneNumber: "+6281234567890", // only when connected
  displayName: "John Doe", // WhatsApp display name, only when connected
  timestamp: "2024-01-15T10:30:00.000Z"
}
```

**Frontend Handler**:

```javascript
socket.on("session_status_changed", (data) => {
  console.log("Session status changed:", data);

  setSessionStatus(data.status);

  if (data.status === "CONNECTED") {
    setPhoneNumber(data.phoneNumber);
    setDisplayName(data.displayName);
    setQrCode(null); // Hide QR code
    // Show success message: "Connected as {displayName}"
  } else if (data.status === "DISCONNECTED") {
    setPhoneNumber(null);
    setDisplayName(null);
    // Show disconnected state
  }
});
```

### 5. Message Status Updates

**Event**: `message_status_updated`
**When**: Message delivery status changes
**Payload**:

```javascript
{
  sessionId: "da59c719-6c71-439f-b222-ac0366048b0b-ini-wg-baru-1752508259121",
  messageId: "msg_12345",
  status: "DELIVERED", // or "SENT", "READ", "FAILED"
  deliveredAt: "2024-01-15T10:35:00.000Z", // optional
  timestamp: "2024-01-15T10:30:00.000Z"
}
```

**Frontend Handler**:

```javascript
socket.on("message_status_updated", (data) => {
  console.log("Message status updated:", data);

  // Update message status in UI
  updateMessageStatus(data.messageId, data.status);
});
```

### 6. Error Events

**Event**: `error`
**When**: Validation or permission errors occur
**Payload**:

```javascript
{
  message: "Invalid session ID or access denied",
  code: "INVALID_SESSION"
}
```

**Frontend Handler**:

```javascript
socket.on("error", (error) => {
  console.error("Socket error:", error);
  // Show error message to user
  showErrorMessage(error.message);
});
```

## 🚀 Frontend Implementation Steps

### Step 1: Connect to Socket.IO

```javascript
// hooks/useSocket.js
import { useEffect, useState } from "react";
import { io } from "socket.io-client";

export const useSocket = (token) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token) return;

    const newSocket = io("http://localhost:8000", {
      auth: { token },
      transports: ["websocket", "polling"],
    });

    newSocket.on("connect", () => {
      console.log("Socket.IO connected");
      setConnected(true);
    });

    newSocket.on("connected", (data) => {
      console.log("Backend confirmed connection:", data);
    });

    newSocket.on("disconnect", () => {
      console.log("Socket.IO disconnected");
      setConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [token]);

  return { socket, connected };
};
```

### Step 2: Join Session Room

```javascript
// components/SessionPage.js
import { useSocket } from "../hooks/useSocket";

const SessionPage = ({ sessionId, token }) => {
  const { socket, connected } = useSocket(token);
  const [qrCode, setQrCode] = useState(null);
  const [sessionStatus, setSessionStatus] = useState("DISCONNECTED");
  const [phoneNumber, setPhoneNumber] = useState(null);
  const [displayName, setDisplayName] = useState(null);

  useEffect(() => {
    if (!socket || !connected || !sessionId) return;

    // Join session room
    socket.emit("join_session", sessionId);
    console.log("Subscribed to session:", sessionId);

    // Listen for session room join confirmation
    socket.on("session_joined", (data) => {
      console.log("Successfully joined session room:", data);
    });

    // Listen for QR code updates
    socket.on("qr_code_updated", (data) => {
      console.log("QR Code received:", data);
      setQrCode(data.qrCode);
      setSessionStatus(data.status);
    });

    // Listen for session status changes
    socket.on("session_status_changed", (data) => {
      console.log("Session status changed:", data);
      setSessionStatus(data.status);

      if (data.status === "CONNECTED") {
        setPhoneNumber(data.phoneNumber);
        setDisplayName(data.displayName);
        setQrCode(null); // Hide QR code
      } else if (data.status === "DISCONNECTED") {
        setPhoneNumber(null);
        setDisplayName(null);
      }
    });

    // Listen for errors
    socket.on("error", (error) => {
      console.error("Socket error:", error);
      alert(error.message);
    });

    // Cleanup on unmount
    return () => {
      socket.emit("leave_session", sessionId);
      socket.off("session_joined");
      socket.off("qr_code_updated");
      socket.off("session_status_changed");
      socket.off("error");
    };
  }, [socket, connected, sessionId]);

  return (
    <div>
      <h1>Session: {sessionId}</h1>
      <p>Status: {sessionStatus}</p>

      {qrCode && (
        <div>
          <h2>Scan QR Code with WhatsApp</h2>
          <QRCode value={qrCode} size={256} />
        </div>
      )}

      {sessionStatus === "CONNECTED" && (
        <div>
          <h2>Connected!</h2>
          <p>Phone: {phoneNumber}</p>
          <p>Name: {displayName}</p>
        </div>
      )}
    </div>
  );
};
```

### Step 3: Handle QR Code Display

```javascript
import QRCode from "qrcode.react";

const QRCodeDisplay = ({ qrCode }) => {
  if (!qrCode) return null;

  return (
    <div className="qr-code-container">
      <h3>Scan with WhatsApp</h3>
      <QRCode value={qrCode} size={256} level="M" includeMargin={true} />
      <p>Open WhatsApp → Settings → Linked Devices → Link a Device</p>
    </div>
  );
};
```

## 🔍 Debugging Tips

### Check Connection Status

```javascript
socket.on("connect", () => {
  console.log("✅ Socket.IO connected");
});

socket.on("disconnect", (reason) => {
  console.log("❌ Socket.IO disconnected:", reason);
});
```

### Verify Room Joining

```javascript
socket.on("session_joined", (data) => {
  console.log("✅ Joined session room:", data.sessionId);
});

socket.on("error", (error) => {
  console.error("❌ Socket error:", error);
});
```

### Monitor All Events

```javascript
// Debug: Log all events
socket.onAny((eventName, ...args) => {
  console.log("📡 Socket event:", eventName, args);
});
```

## 🚨 Common Issues & Solutions

### Issue 1: Not Receiving QR Code Events

**Symptoms**: Frontend connected but no QR codes received
**Check**:

1. Is `join_session` being sent with correct sessionId?
2. Is sessionId format correct (should start with userId)?
3. Check browser console for `session_joined` confirmation

### Issue 2: Authentication Errors

**Symptoms**: Connection fails or immediate disconnect
**Check**:

1. JWT token is valid and not expired
2. Token is being sent in `auth.token` field
3. Backend logs show authentication success

### Issue 3: Wrong Session Room

**Symptoms**: Connected but events for wrong session
**Check**:

1. SessionId matches exactly between frontend and backend
2. Only one `join_session` call per session
3. Call `leave_session` when switching sessions

## 📋 Complete Frontend Checklist

- [ ] Socket.IO client installed (`npm install socket.io-client`)
- [ ] QR code library installed (`npm install qrcode.react`)
- [ ] JWT token available from login
- [ ] Socket connection with auth token
- [ ] `join_session` event sent with sessionId
- [ ] Event listeners for: `qr_code_updated`, `session_status_changed`
- [ ] QR code display component
- [ ] Session status display
- [ ] Error handling for socket errors
- [ ] Cleanup on component unmount

## 🎯 Expected User Flow

1. **User logs in** → Gets JWT token
2. **User creates session** → Gets sessionId from API
3. **User opens session page** → Frontend connects to Socket.IO
4. **Frontend joins session room** → Sends `join_session` event
5. **Backend confirms join** → Sends `session_joined` event
6. **User clicks "Connect"** → API call to start session
7. **Worker generates QR** → Backend emits `qr_code_updated`
8. **Frontend shows QR** → User scans with WhatsApp
9. **WhatsApp connects** → Backend emits `session_status_changed`
10. **Frontend shows success** → Session is ready for messaging

This flow ensures real-time updates without polling!
