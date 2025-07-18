# WhatsApp Gateway API - Endpoint List

## Authentication Endpoints

1. POST /api/auth/register --> User registration
2. POST /api/auth/login --> User login
3. POST /api/auth/logout --> User logout
4. POST /api/auth/refresh --> Refresh JWT token
5. GET /api/auth/me --> Get current user information
6. POST /api/auth/change-password --> Change user password
7. POST /api/auth/deactivate --> Deactivate user account
8. POST /api/auth/forgot-password --> Request password reset
9. POST /api/auth/reset-password --> Confirm password reset

## User Management Endpoints

10. GET /api/users/profile --> Get user profile
11. PUT /api/users/profile --> Update user profile
12. GET /api/users/api-keys --> Get user's API keys
13. DELETE /api/users/api-keys/:id --> Delete API key
14. GET /api/users/usage --> Get user usage statistics
15. GET /api/users/tier --> Get user tier information
16. GET /api/users/sessions --> Get user sessions
17. POST /api/users/deactivate --> Deactivate user account

## Session Management Endpoints

18. GET /api/sessions --> List user sessions
19. POST /api/sessions --> Create new session
20. GET /api/sessions/:id --> Get session details
21. POST /api/sessions/:id/connect --> Connect session to WhatsApp
22. GET /api/sessions/:id/status --> Get session status
23. DELETE /api/sessions/:id --> Delete session
24. POST /api/sessions/:id/send --> Send message via session
25. GET /api/sessions/:id/messages --> Get message history
26. POST /api/sessions/:id/restart --> Restart session
27. POST /api/sessions/:id/disconnect --> Disconnect session
28. POST /api/sessions/:id/logout --> Logout session

## External API Endpoints (Message Sending)

29. POST /api/sendText --> Send text message
    **Payload:** `{ "to": "628123456789", "message": "Hello World" }`

30. POST /api/sendImage --> Send image message
    **Payload:** `{ "to": "628123456789", "imageUrl": "https://example.com/image.jpg", "caption": "Optional caption" }`

31. POST /api/sendFile --> Send file/document message
    **Payload:** `{ "to": "628123456789", "fileUrl": "https://example.com/document.pdf", "filename": "document.pdf", "caption": "Optional caption" }`

32. POST /api/sendVoice --> Send voice/audio message
    **Payload:** `{ "to": "628123456789", "audioUrl": "https://example.com/audio.mp3" }`

33. POST /api/sendVideo --> Send video message
    **Payload:** `{ "to": "628123456789", "videoUrl": "https://example.com/video.mp4", "caption": "Optional caption" }`

34. POST /api/sendLocation --> Send location message
    **Payload:** `{ "to": "628123456789", "latitude": -6.2088, "longitude": 106.8456, "name": "Jakarta", "address": "Jakarta, Indonesia" }`

35. POST /api/sendContactVcard --> Send contact vcard message
    **Payload:** `{ "to": "628123456789", "contactName": "John Doe", "contactPhone": "628123456789", "contactEmail": "john@example.com", "contactOrganization": "Company Inc" }`

36. POST /api/sendLink --> Send link message
    **Payload:** `{ "to": "628123456789", "url": "https://example.com", "text": "Check this out!" }`

37. POST /api/sendPoll --> Send poll message
    **Payload:** `{ "to": "628123456789", "question": "What's your favorite color?", "options": ["Red", "Blue", "Green"], "maxAnswer": 1 }`

38. POST /api/sendSeen --> Mark message as seen/read
    **Payload:** `{ "messageId": "msg_12345" }`

39. POST /api/startTyping --> Start typing indicator
    **Payload:** `{ "to": "628123456789" }`

40. POST /api/stopTyping --> Stop typing indicator
    **Payload:** `{ "to": "628123456789" }`

41. GET /api/session/status --> Get session status (via API key)
    **Payload:** No payload required (GET request with API key authentication)

42. POST /api/message/:messageId/delete --> Delete message
    **Payload:** `{ "action": "delete", "phone": "628123456789", "forEveryone": true }`

43. POST /api/message/:messageId/unsend --> Unsend message
    **Payload:** `{ "action": "unsend", "phone": "628123456789" }`

44. POST /api/message/:messageId/star --> Star message
    **Payload:** `{ "action": "star", "phone": "628123456789" }`

45. POST /api/message/:messageId/unstar --> Unstar message
    **Payload:** `{ "action": "unstar", "phone": "628123456789" }`

46. POST /api/message/:messageId/edit --> Edit message
    **Payload:** `{ "action": "edit", "phone": "628123456789", "content": "Updated message text" }`

47. POST /api/message/:messageId/reaction --> Add reaction to message
    **Payload:** `{ "action": "reaction", "phone": "628123456789", "emoji": "👍" }`

48. POST /api/message/:messageId/read --> Mark message as read
    **Payload:** `{ "action": "read", "phone": "628123456789" }`

49. POST /api/message/:messageId/pin --> Pin message
    **Payload:** `{ "action": "pin", "phone": "628123456789" }`

50. POST /api/message/:messageId/unpin --> Unpin message
    **Payload:** `{ "action": "unpin", "phone": "628123456789" }`

## Worker Management Endpoints

51. POST /api/workers/register --> Worker self-registration
52. PUT /api/workers/:workerId/heartbeat --> Worker heartbeat update
53. GET /api/workers/:workerId/sessions/assigned --> Get assigned sessions for recovery
54. POST /api/workers/:workerId/sessions/recovery-status --> Report recovery status
55. DELETE /api/workers/unregister --> Worker self-unregistration
56. GET /api/workers --> Get all workers (Admin)
57. POST /api/workers --> Add new worker manually (Admin)
58. GET /api/workers/statistics --> Get worker statistics (Admin)
59. POST /api/workers/test --> Test worker connectivity (Admin)
60. POST /api/workers/health-check --> Trigger manual health check (Admin)
61. GET /api/workers/available --> Get available worker
62. GET /api/workers/:workerId --> Get specific worker details (Admin)
63. PUT /api/workers/:workerId --> Update worker configuration (Admin)
64. DELETE /api/workers/:workerId --> Remove worker (Admin)
65. POST /api/workers/:workerId/test --> Test specific worker connectivity (Admin)
66. POST /api/workers/health/start --> Start health monitoring (Admin)
67. POST /api/workers/health/stop --> Stop health monitoring (Admin)
68. GET /api/workers/health/status --> Get health monitoring status (Admin)

## Webhook Endpoints (Internal)

69. POST /api/webhooks/session-status --> Handle session status updates from workers
70. POST /api/webhooks/message-status --> Handle message status updates from workers
71. POST /api/webhooks/worker-heartbeat --> Handle worker heartbeat updates

## Admin Endpoints (Future Implementation)

72. GET /api/admin/dashboard --> Admin dashboard overview
73. GET /api/admin/analytics --> System analytics
74. GET /api/admin/users --> User management (Admin)
75. GET /api/admin/users/:id --> Get user details (Admin)
76. PUT /api/admin/users/:id --> Update user (Admin)
77. DELETE /api/admin/users/:id --> Delete user (Admin)
78. GET /api/admin/sessions --> Session management (Admin)
79. POST /api/admin/sessions/:id/migrate --> Migrate session (Admin)
80. DELETE /api/admin/sessions/:id --> Force delete session (Admin)
81. GET /api/admin/system/health --> System health check (Admin)
82. GET /api/admin/system/logs --> System logs (Admin)
83. POST /api/admin/system/maintenance --> System maintenance mode (Admin)
84. GET /api/admin/reports/export --> Export reports (Admin)

## Health Check Endpoints

85. GET /health --> Basic health check
86. GET /health/detailed --> Detailed health check with service status
