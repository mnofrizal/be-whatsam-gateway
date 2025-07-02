// External API Routes - MVP Pattern
// These routes are for external API consumers using API keys
import express from 'express';
import { asyncHandler } from '../middleware/error-handler.js';
import { apiLimiter, createMessageLimiter } from '../middleware/rate-limit.js';

const router = express.Router();

// POST /api/v1/external/send - Send Message (External API)
router.post('/send', apiLimiter, createMessageLimiter, asyncHandler(async (req, res) => {
  // Will be implemented in Week 4 with ApiController
  res.status(501).json({
    success: false,
    message: 'Send message API endpoint - Implementation coming in Week 4',
    endpoint: 'POST /api/v1/external/send',
    requiresAuth: 'API Key (X-API-Key header)',
    expectedBody: {
      sessionId: 'session-uuid', // required
      to: '6281234567890@s.whatsapp.net', // required
      type: 'text', // required: text|image|document|audio|video
      message: 'Hello from API!', // required for text
      mediaUrl: 'https://example.com/image.jpg', // required for media types
      filename: 'document.pdf', // optional for document type
      caption: 'Image caption' // optional for media types
    },
    expectedResponse: {
      success: true,
      data: {
        messageId: 'msg_12345',
        sessionId: 'session-uuid',
        to: '6281234567890@s.whatsapp.net',
        type: 'text',
        status: 'sent',
        timestamp: '2024-01-01T00:00:00Z',
        queuePosition: 1
      }
    },
    rateLimits: {
      free: '100 messages/hour',
      pro: '1000 messages/hour',
      premium: '10000 messages/hour'
    }
  });
}));

// POST /api/v1/external/send-bulk - Send Bulk Messages (External API)
router.post('/send-bulk', apiLimiter, createMessageLimiter, asyncHandler(async (req, res) => {
  // Will be implemented in Week 4 with ApiController
  res.status(501).json({
    success: false,
    message: 'Send bulk messages API endpoint - Implementation coming in Week 4',
    endpoint: 'POST /api/v1/external/send-bulk',
    requiresAuth: 'API Key (X-API-Key header)',
    expectedBody: {
      sessionId: 'session-uuid', // required
      messages: [
        {
          to: '6281234567890@s.whatsapp.net',
          type: 'text',
          message: 'Hello from bulk API!'
        },
        {
          to: '6281234567891@s.whatsapp.net',
          type: 'text',
          message: 'Another message'
        }
      ]
    },
    expectedResponse: {
      success: true,
      data: {
        batchId: 'batch_12345',
        sessionId: 'session-uuid',
        totalMessages: 2,
        accepted: 2,
        rejected: 0,
        messages: [
          {
            messageId: 'msg_12345',
            to: '6281234567890@s.whatsapp.net',
            status: 'queued'
          },
          {
            messageId: 'msg_12346',
            to: '6281234567891@s.whatsapp.net',
            status: 'queued'
          }
        ]
      }
    },
    limits: {
      maxMessagesPerBatch: 100,
      rateLimitAppliesPerMessage: true
    }
  });
}));

// GET /api/v1/external/message/:id/status - Get Message Status (External API)
router.get('/message/:id/status', apiLimiter, asyncHandler(async (req, res) => {
  // Will be implemented in Week 4 with ApiController
  res.status(501).json({
    success: false,
    message: 'Get message status API endpoint - Implementation coming in Week 4',
    endpoint: 'GET /api/v1/external/message/:id/status',
    requiresAuth: 'API Key (X-API-Key header)',
    params: {
      id: 'Message ID'
    },
    expectedResponse: {
      success: true,
      data: {
        messageId: 'msg_12345',
        sessionId: 'session-uuid',
        to: '6281234567890@s.whatsapp.net',
        type: 'text',
        status: 'delivered', // pending|sent|delivered|read|failed
        sentAt: '2024-01-01T00:00:00Z',
        deliveredAt: '2024-01-01T00:00:05Z',
        readAt: null,
        error: null
      }
    }
  });
}));

// GET /api/v1/external/session/:id/status - Get Session Status (External API)
router.get('/session/:id/status', apiLimiter, asyncHandler(async (req, res) => {
  // Will be implemented in Week 4 with ApiController
  res.status(501).json({
    success: false,
    message: 'Get session status API endpoint - Implementation coming in Week 4',
    endpoint: 'GET /api/v1/external/session/:id/status',
    requiresAuth: 'API Key (X-API-Key header)',
    params: {
      id: 'Session ID'
    },
    expectedResponse: {
      success: true,
      data: {
        sessionId: 'session-uuid',
        status: 'connected', // initializing|qr_ready|connected|disconnected|error
        phoneNumber: '+6281234567890',
        qrCode: 'data:image/png;base64,...', // only when status is qr_ready
        lastSeen: '2024-01-01T00:00:00Z',
        workerId: 'worker-001',
        uptime: '2h 30m'
      }
    }
  });
}));

// GET /api/v1/external/session/:id/qr - Get Session QR Code (External API)
router.get('/session/:id/qr', apiLimiter, asyncHandler(async (req, res) => {
  // Will be implemented in Week 4 with ApiController
  res.status(501).json({
    success: false,
    message: 'Get session QR code API endpoint - Implementation coming in Week 4',
    endpoint: 'GET /api/v1/external/session/:id/qr',
    requiresAuth: 'API Key (X-API-Key header)',
    params: {
      id: 'Session ID'
    },
    queryParams: {
      format: 'base64|url', // optional, defaults to base64
      refresh: 'true|false' // optional, force refresh QR code
    },
    expectedResponse: {
      success: true,
      data: {
        sessionId: 'session-uuid',
        qrCode: 'data:image/png;base64,...',
        expiresAt: '2024-01-01T00:02:00Z',
        status: 'qr_ready'
      }
    }
  });
}));

// GET /api/v1/external/messages - Get Message History (External API)
router.get('/messages', apiLimiter, asyncHandler(async (req, res) => {
  // Will be implemented in Week 5 with ApiController
  res.status(501).json({
    success: false,
    message: 'Get message history API endpoint - Implementation coming in Week 5',
    endpoint: 'GET /api/v1/external/messages',
    requiresAuth: 'API Key (X-API-Key header)',
    queryParams: {
      sessionId: 'session-uuid', // optional, filter by session
      limit: 50, // optional, defaults to 50, max 100
      offset: 0, // optional, defaults to 0
      startDate: '2024-01-01T00:00:00Z', // optional
      endDate: '2024-01-02T00:00:00Z', // optional
      direction: 'inbound|outbound', // optional
      status: 'sent|delivered|read|failed', // optional
      type: 'text|image|document|audio|video' // optional
    },
    expectedResponse: {
      success: true,
      data: {
        messages: [
          {
            messageId: 'msg_12345',
            sessionId: 'session-uuid',
            direction: 'outbound',
            fromNumber: '+6281234567890',
            toNumber: '+6281234567891',
            type: 'text',
            content: 'Hello from API!',
            status: 'delivered',
            createdAt: '2024-01-01T00:00:00Z',
            sentAt: '2024-01-01T00:00:01Z',
            deliveredAt: '2024-01-01T00:00:05Z'
          }
        ],
        pagination: {
          total: 150,
          limit: 50,
          offset: 0,
          hasMore: true
        }
      }
    }
  });
}));

// POST /api/v1/external/webhook - Set Webhook URL (External API)
router.post('/webhook', apiLimiter, asyncHandler(async (req, res) => {
  // Will be implemented in Week 5 with ApiController
  res.status(501).json({
    success: false,
    message: 'Set webhook URL API endpoint - Implementation coming in Week 5',
    endpoint: 'POST /api/v1/external/webhook',
    requiresAuth: 'API Key (X-API-Key header)',
    expectedBody: {
      url: 'https://your-app.com/webhook', // required
      events: ['message.received', 'message.sent', 'session.status'], // optional, defaults to all
      secret: 'your-webhook-secret' // optional, for signature verification
    },
    expectedResponse: {
      success: true,
      data: {
        webhookId: 'webhook_12345',
        url: 'https://your-app.com/webhook',
        events: ['message.received', 'message.sent', 'session.status'],
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z'
      }
    },
    webhookEvents: {
      'message.received': 'Incoming message received',
      'message.sent': 'Outgoing message sent',
      'message.delivered': 'Message delivered',
      'message.read': 'Message read',
      'message.failed': 'Message failed to send',
      'session.connected': 'Session connected',
      'session.disconnected': 'Session disconnected',
      'session.qr_updated': 'QR code updated'
    }
  });
}));

// GET /api/v1/external/webhook - Get Webhook Configuration (External API)
router.get('/webhook', apiLimiter, asyncHandler(async (req, res) => {
  // Will be implemented in Week 5 with ApiController
  res.status(501).json({
    success: false,
    message: 'Get webhook configuration API endpoint - Implementation coming in Week 5',
    endpoint: 'GET /api/v1/external/webhook',
    requiresAuth: 'API Key (X-API-Key header)',
    expectedResponse: {
      success: true,
      data: {
        webhookId: 'webhook_12345',
        url: 'https://your-app.com/webhook',
        events: ['message.received', 'message.sent', 'session.status'],
        isActive: true,
        lastDelivery: {
          timestamp: '2024-01-01T00:00:00Z',
          status: 'success',
          responseCode: 200
        },
        statistics: {
          totalDeliveries: 150,
          successfulDeliveries: 148,
          failedDeliveries: 2,
          lastFailure: '2024-01-01T00:00:00Z'
        }
      }
    }
  });
}));

// DELETE /api/v1/external/webhook - Remove Webhook (External API)
router.delete('/webhook', apiLimiter, asyncHandler(async (req, res) => {
  // Will be implemented in Week 5 with ApiController
  res.status(501).json({
    success: false,
    message: 'Remove webhook API endpoint - Implementation coming in Week 5',
    endpoint: 'DELETE /api/v1/external/webhook',
    requiresAuth: 'API Key (X-API-Key header)',
    expectedResponse: {
      success: true,
      message: 'Webhook removed successfully'
    }
  });
}));

// GET /api/v1/external/usage - Get API Usage Statistics (External API)
router.get('/usage', apiLimiter, asyncHandler(async (req, res) => {
  // Will be implemented in Week 5 with ApiController
  res.status(501).json({
    success: false,
    message: 'Get API usage statistics endpoint - Implementation coming in Week 5',
    endpoint: 'GET /api/v1/external/usage',
    requiresAuth: 'API Key (X-API-Key header)',
    queryParams: {
      period: 'hour|day|month', // optional, defaults to day
      startDate: '2024-01-01T00:00:00Z', // optional
      endDate: '2024-01-02T00:00:00Z' // optional
    },
    expectedResponse: {
      success: true,
      data: {
        period: 'day',
        usage: {
          apiCalls: {
            total: 1200,
            limit: 10000,
            remaining: 8800,
            resetAt: '2024-01-02T00:00:00Z'
          },
          messages: {
            total: 450,
            limit: 1000,
            remaining: 550,
            resetAt: '2024-01-02T00:00:00Z'
          },
          storage: {
            used: '15MB',
            limit: '1GB',
            remaining: '1009MB'
          }
        },
        breakdown: {
          byEndpoint: {
            '/send': 400,
            '/send-bulk': 50,
            '/message/status': 600,
            '/session/status': 150
          },
          byHour: [
            { hour: '00:00', calls: 50, messages: 20 },
            { hour: '01:00', calls: 45, messages: 18 }
          ]
        }
      }
    }
  });
}));

// GET /api/v1/external/limits - Get Rate Limits (External API)
router.get('/limits', apiLimiter, asyncHandler(async (req, res) => {
  // Will be implemented in Week 3 with ApiController
  res.status(501).json({
    success: false,
    message: 'Get rate limits API endpoint - Implementation coming in Week 3',
    endpoint: 'GET /api/v1/external/limits',
    requiresAuth: 'API Key (X-API-Key header)',
    expectedResponse: {
      success: true,
      data: {
        tier: 'pro',
        limits: {
          apiCalls: {
            perHour: 10000,
            perMinute: 1000,
            current: 150,
            resetAt: '2024-01-01T01:00:00Z'
          },
          messages: {
            perHour: 1000,
            perMinute: 100,
            current: 45,
            resetAt: '2024-01-01T01:00:00Z'
          },
          sessions: {
            maximum: 5,
            current: 3
          },
          storage: {
            maximum: '1GB',
            current: '15MB'
          }
        }
      }
    }
  });
}));

export default router;