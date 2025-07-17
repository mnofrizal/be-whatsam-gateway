# WhatsApp Gateway API - Endpoint List

## Authentication Endpoints

1. POST /api/v1/auth/register --> User registration
2. POST /api/v1/auth/login --> User login
3. POST /api/v1/auth/logout --> User logout
4. POST /api/v1/auth/refresh --> Refresh JWT token
5. GET /api/v1/auth/me --> Get current user information
6. POST /api/v1/auth/change-password --> Change user password
7. POST /api/v1/auth/deactivate --> Deactivate user account
8. POST /api/v1/auth/forgot-password --> Request password reset
9. POST /api/v1/auth/reset-password --> Confirm password reset

## User Management Endpoints

10. GET /api/v1/users/profile --> Get user profile
11. PUT /api/v1/users/profile --> Update user profile
12. GET /api/v1/users/api-keys --> Get user's API keys
13. DELETE /api/v1/users/api-keys/:id --> Delete API key
14. GET /api/v1/users/usage --> Get user usage statistics
15. GET /api/v1/users/tier --> Get user tier information
16. GET /api/v1/users/sessions --> Get user sessions
17. POST /api/v1/users/deactivate --> Deactivate user account

## Session Management Endpoints

18. GET /api/v1/sessions --> List user sessions
19. POST /api/v1/sessions --> Create new session
20. GET /api/v1/sessions/:id --> Get session details
21. POST /api/v1/sessions/:id/connect --> Connect session to WhatsApp
22. GET /api/v1/sessions/:id/status --> Get session status
23. DELETE /api/v1/sessions/:id --> Delete session
24. POST /api/v1/sessions/:id/send --> Send message via session
25. GET /api/v1/sessions/:id/messages --> Get message history
26. POST /api/v1/sessions/:id/restart --> Restart session
27. POST /api/v1/sessions/:id/disconnect --> Disconnect session
28. POST /api/v1/sessions/:id/logout --> Logout session

## External API Endpoints (Message Sending)

29. POST /api/v1/sendText --> Send text message
30. POST /api/v1/sendImage --> Send image message
31. POST /api/v1/sendFile --> Send file/document message
32. POST /api/v1/sendVoice --> Send voice/audio message
33. POST /api/v1/sendVideo --> Send video message
34. POST /api/v1/sendLocation --> Send location message
35. POST /api/v1/sendContactVcard --> Send contact vcard message
36. POST /api/v1/sendSeen --> Mark message as seen/read
37. GET /api/v1/session/status --> Get session status (via API key)

## Worker Management Endpoints

38. POST /api/v1/workers/register --> Worker self-registration
39. PUT /api/v1/workers/:workerId/heartbeat --> Worker heartbeat update
40. GET /api/v1/workers/:workerId/sessions/assigned --> Get assigned sessions for recovery
41. POST /api/v1/workers/:workerId/sessions/recovery-status --> Report recovery status
42. DELETE /api/v1/workers/unregister --> Worker self-unregistration
43. GET /api/v1/workers --> Get all workers (Admin)
44. POST /api/v1/workers --> Add new worker manually (Admin)
45. GET /api/v1/workers/statistics --> Get worker statistics (Admin)
46. POST /api/v1/workers/test --> Test worker connectivity (Admin)
47. POST /api/v1/workers/health-check --> Trigger manual health check (Admin)
48. GET /api/v1/workers/available --> Get available worker
49. GET /api/v1/workers/:workerId --> Get specific worker details (Admin)
50. PUT /api/v1/workers/:workerId --> Update worker configuration (Admin)
51. DELETE /api/v1/workers/:workerId --> Remove worker (Admin)
52. POST /api/v1/workers/:workerId/test --> Test specific worker connectivity (Admin)
53. POST /api/v1/workers/health/start --> Start health monitoring (Admin)
54. POST /api/v1/workers/health/stop --> Stop health monitoring (Admin)
55. GET /api/v1/workers/health/status --> Get health monitoring status (Admin)

## Webhook Endpoints (Internal)

56. POST /api/v1/webhooks/session-status --> Handle session status updates from workers
57. POST /api/v1/webhooks/message-status --> Handle message status updates from workers
58. POST /api/v1/webhooks/worker-heartbeat --> Handle worker heartbeat updates

## Admin Endpoints (Future Implementation)

59. GET /api/v1/admin/dashboard --> Admin dashboard overview
60. GET /api/v1/admin/analytics --> System analytics
61. GET /api/v1/admin/users --> User management (Admin)
62. GET /api/v1/admin/users/:id --> Get user details (Admin)
63. PUT /api/v1/admin/users/:id --> Update user (Admin)
64. DELETE /api/v1/admin/users/:id --> Delete user (Admin)
65. GET /api/v1/admin/sessions --> Session management (Admin)
66. POST /api/v1/admin/sessions/:id/migrate --> Migrate session (Admin)
67. DELETE /api/v1/admin/sessions/:id --> Force delete session (Admin)
68. GET /api/v1/admin/system/health --> System health check (Admin)
69. GET /api/v1/admin/system/logs --> System logs (Admin)
70. POST /api/v1/admin/system/maintenance --> System maintenance mode (Admin)
71. GET /api/v1/admin/reports/export --> Export reports (Admin)

## Health Check Endpoints

72. GET /health --> Basic health check
73. GET /health/detailed --> Detailed health check with service status
