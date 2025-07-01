---
sidebar_position: 1
sidebar_label: "REST API"
title: "REST API"
description: "RESTful API endpoints"
---

# REST API

The SYMindX REST API provides comprehensive HTTP endpoints for managing agents, conversations, and system operations. Built on Express.js, the API offers secure, scalable access to all platform features with built-in rate limiting, authentication, and CORS support.

## Base URL

```
http://localhost:3001
```

The API server runs on port 3001 by default. This can be configured in your `runtime.json` configuration file.

## Authentication

The API supports Bearer token authentication when enabled:

```bash
curl -H "Authorization: Bearer YOUR_API_TOKEN" \
  http://localhost:3001/agents
```

Authentication can be configured in the API extension settings:

```json
{
  "auth": {
    "enabled": true,
    "type": "bearer",
    "secret": "your-secure-api-key"
  }
}
```

## Response Format

All API responses follow a consistent JSON structure:

```json
{
  "success": true,
  "data": { /* Response data */ },
  "timestamp": "2024-01-15T10:30:00.000Z",
  "error": null
}
```

Error responses include detailed information:

```json
{
  "success": false,
  "error": "Error message",
  "details": "Additional error context",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Core Endpoints

### Health & Status

**GET /health**
```bash
curl http://localhost:3001/health
```

Returns basic health status of the API server.

**GET /status**
```bash
curl http://localhost:3001/status
```

Returns detailed system status including agent information, memory usage, and uptime.

### Agent Management

**GET /agents**
```bash
curl http://localhost:3001/agents
```

Lists all active agents with their current status and capabilities.

**POST /api/agents/spawn**
```bash
curl -X POST http://localhost:3001/api/agents/spawn \
  -H "Content-Type: application/json" \
  -d '{
    "characterId": "nyx",
    "instanceName": "NyX-Assistant",
    "autoStart": true,
    "priority": 2
  }'
```

Spawns a new agent instance with specified configuration.

**POST /api/agents/:agentId/stop**
```bash
curl -X POST http://localhost:3001/api/agents/agent_123/stop
```

Stops a running agent gracefully.

### Chat & Conversations

**POST /chat**
```bash
curl -X POST http://localhost:3001/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello, how can you help me?",
    "agentId": "nyx",
    "context": {
      "userId": "user_123",
      "sessionId": "session_456"
    }
  }'
```

Sends a message to an agent and receives a response. This endpoint automatically manages conversation history.

**GET /api/conversations**
```bash
curl "http://localhost:3001/api/conversations?userId=user_123&limit=10"
```

Lists conversations with filtering options.

**POST /api/conversations/:conversationId/messages**
```bash
curl -X POST http://localhost:3001/api/conversations/conv_123/messages \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What's the weather like?",
    "userId": "user_123"
  }'
```

Sends a message within an existing conversation.

### Multi-Agent Features

**POST /api/chat/route**
```bash
curl -X POST http://localhost:3001/api/chat/route \
  -H "Content-Type: application/json" \
  -d '{
    "message": "I need help with coding",
    "requirements": {
      "skills": ["programming", "debugging"],
      "language": "python"
    }
  }'
```

Automatically routes messages to the best-suited agent based on requirements.

**POST /api/chat/broadcast**
```bash
curl -X POST http://localhost:3001/api/chat/broadcast \
  -H "Content-Type: application/json" \
  -d '{
    "message": "System update: Maintenance at 3 PM",
    "agentIds": ["agent_1", "agent_2", "agent_3"]
  }'
```

Broadcasts a message to multiple agents simultaneously.

## Error Handling

The API uses standard HTTP status codes:

- **200 OK**: Successful request
- **400 Bad Request**: Invalid request parameters
- **401 Unauthorized**: Missing or invalid authentication
- **404 Not Found**: Resource not found
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Server error

Example error handling in your application:

```javascript
try {
  const response = await fetch('http://localhost:3001/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_TOKEN'
    },
    body: JSON.stringify({ message: 'Hello' })
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('API Error:', error.error, error.details);
  }

  const data = await response.json();
  console.log('Response:', data);
} catch (error) {
  console.error('Network error:', error);
}
```

## Rate Limiting

Default rate limits:
- **100 requests per minute** per IP address
- Configurable in API settings
- Returns 429 status when exceeded

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642248000
```

## Best Practices

1. **Use Connection Pooling**: For high-frequency requests, maintain persistent connections
2. **Handle Errors Gracefully**: Always implement proper error handling
3. **Respect Rate Limits**: Implement exponential backoff for retries
4. **Secure Your Keys**: Never expose API keys in client-side code
5. **Monitor Usage**: Track your API usage through the /api/stats endpoint

## Next Steps

- Explore [Authentication](./authentication) for securing your API
- Learn about [Agent Endpoints](./agents) for agent management
- Understand [Memory APIs](./memory) for data persistence
- Check [Event Endpoints](./events) for real-time updates
