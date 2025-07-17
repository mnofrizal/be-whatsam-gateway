# WhatsApp Gateway - Send Message Endpoints

## Base Configuration

```
@baseUrl = http://localhost:8000/api/v1
@apiKey = your-api-key-here
@testPhone = 6281234567890
```

## Authentication

All endpoints require API Key authentication:

```
Authorization: Bearer {{apiKey}}
Content-Type: application/json
```

---

## 1. Send Text Message

```http
POST {{baseUrl}}/sendText
Authorization: Bearer {{apiKey}}
Content-Type: application/json

{
  "to": "{{testPhone}}",
  "message": "Hello from WhatsApp Gateway API! 👋"
}
```

**Send to Worker:**

```http
POST http://worker-endpoint/api/sessions/{sessionId}/send
Authorization: Bearer {workerToken}
Content-Type: application/json

{
  "to": "6281234567890@s.whatsapp.net",
  "type": "text",
  "message": "Hello from WhatsApp Gateway API! 👋"
}
```

## 2. Send Image Message

```http
POST {{baseUrl}}/sendImage
Authorization: Bearer {{apiKey}}
Content-Type: application/json

{
  "to": "{{testPhone}}",
  "imageUrl": "https://picsum.photos/800/600",
  "caption": "Beautiful random image from API 📸"
}
```

**Send to Worker:**

```http
POST http://worker-endpoint/api/sessions/{sessionId}/send
Authorization: Bearer {workerToken}
Content-Type: application/json

{
  "to": "6281234567890@s.whatsapp.net",
  "type": "image",
  "mediaUrl": "https://picsum.photos/800/600",
  "caption": "Beautiful random image from API 📸"
}
```

## 3. Send File/Document Message

```http
POST {{baseUrl}}/sendFile
Authorization: Bearer {{apiKey}}
Content-Type: application/json

{
  "to": "{{testPhone}}",
  "fileUrl": "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
  "filename": "sample-document.pdf",
  "caption": "Sample PDF document from API 📄"
}
```

**Send to Worker:**

```http
POST http://worker-endpoint/api/sessions/{sessionId}/send
Authorization: Bearer {workerToken}
Content-Type: application/json

{
  "to": "6281234567890@s.whatsapp.net",
  "type": "document",
  "mediaUrl": "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
  "filename": "sample-document.pdf",
  "caption": "Sample PDF document from API 📄"
}
```

## 4. Send Voice Message

```http
POST {{baseUrl}}/sendVoice
Authorization: Bearer {{apiKey}}
Content-Type: application/json

{
  "to": "{{testPhone}}",
  "audioUrl": "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav"
}
```

**Send to Worker:**

```http
POST http://worker-endpoint/api/sessions/{sessionId}/send
Authorization: Bearer {workerToken}
Content-Type: application/json

{
  "to": "6281234567890@s.whatsapp.net",
  "type": "audio",
  "mediaUrl": "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav"
}
```

## 5. Send Video Message

```http
POST {{baseUrl}}/sendVideo
Authorization: Bearer {{apiKey}}
Content-Type: application/json

{
  "to": "{{testPhone}}",
  "videoUrl": "https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4",
  "caption": "Sample video from API 🎥"
}
```

**Send to Worker:**

```http
POST http://worker-endpoint/api/sessions/{sessionId}/send
Authorization: Bearer {workerToken}
Content-Type: application/json

{
  "to": "6281234567890@s.whatsapp.net",
  "type": "video",
  "mediaUrl": "https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4",
  "caption": "Sample video from API 🎥"
}
```

## 6. Send Location Message

```http
POST {{baseUrl}}/sendLocation
Authorization: Bearer {{apiKey}}
Content-Type: application/json

{
  "to": "{{testPhone}}",
  "latitude": -6.2088,
  "longitude": 106.8456,
  "name": "Jakarta, Indonesia",
  "address": "Jakarta, Special Capital Region of Jakarta, Indonesia"
}
```

**Send to Worker:**

```http
POST http://worker-endpoint/api/sessions/{sessionId}/send
Authorization: Bearer {workerToken}
Content-Type: application/json

{
  "to": "6281234567890@s.whatsapp.net",
  "type": "location",
  "location": {
    "latitude": -6.2088,
    "longitude": 106.8456,
    "name": "Jakarta, Indonesia",
    "address": "Jakarta, Special Capital Region of Jakarta, Indonesia"
  }
}
```

## 7. Send Contact Vcard Message

```http
POST {{baseUrl}}/sendContactVcard
Authorization: Bearer {{apiKey}}
Content-Type: application/json

{
  "to": "{{testPhone}}",
  "contactName": "John Doe",
  "contactPhone": "+1234567890",
  "contactEmail": "john.doe@example.com",
  "contactOrganization": "Acme Corporation"
}
```

**Send to Worker:**

```http
POST http://worker-endpoint/api/sessions/{sessionId}/send
Authorization: Bearer {workerToken}
Content-Type: application/json

{
  "to": "6281234567890@s.whatsapp.net",
  "type": "contact",
  "contact": {
    "name": "John Doe",
    "phone": "+1234567890",
    "email": "john.doe@example.com",
    "organization": "Acme Corporation"
  }
}
```

## 8. Mark Message as Seen

```http
POST {{baseUrl}}/sendSeen
Authorization: Bearer {{apiKey}}
Content-Type: application/json

{
  "messageId": "message-id-from-webhook"
}
```

**Send to Worker:**

```http
POST http://worker-endpoint/api/sessions/{sessionId}/read
Authorization: Bearer {workerToken}
Content-Type: application/json

{
  "messageId": "message-id-from-webhook"
}
```

## 9. Get Session Status

```http
GET {{baseUrl}}/session/status
Authorization: Bearer {{apiKey}}
```

**Send to Worker:**

```http
GET http://worker-endpoint/api/sessions/{sessionId}/status
Authorization: Bearer {workerToken}
```

## 10. Get Session QR Code

```http
GET {{baseUrl}}/session/qr
Authorization: Bearer {{apiKey}}
```

**Send to Worker:**

```http
GET http://worker-endpoint/api/sessions/{sessionId}/qr
Authorization: Bearer {workerToken}
```

---

## Response Format

All endpoints return:

```json
{
  "success": true,
  "data": {
    "messageId": "msg_abc123",
    "status": "sent",
    "timestamp": "2024-01-15T10:30:00Z"
  },
  "message": "Message sent successfully"
}
```

## Phone Number Formats

- Plain: `6281234567890`
- WhatsApp: `6281234567890@s.whatsapp.net`
- Group: `120363123456789@g.us`

## Getting API Key

1. Create session via session management
2. Copy `apiKey` from response
3. Use in `Authorization: Bearer {apiKey}` header
