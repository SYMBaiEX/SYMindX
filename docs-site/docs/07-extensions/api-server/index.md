---
sidebar_position: 1
title: "API Server Extension"
description: "REST and WebSocket API server"
---

# API Server Extension

REST and WebSocket API server

## API Server Extension

The API Server extension provides HTTP and WebSocket endpoints for interacting with agents.

### Features

- RESTful API endpoints
- WebSocket real-time communication
- Multi-agent routing
- Authentication support
- CORS configuration
- Rate limiting

### Configuration

```json
{
  "extensions": {
    "api": {
      "enabled": true,
      "port": 3001,
      "host": "0.0.0.0",
      "cors": {
        "origin": "*",
        "credentials": true
      },
      "rateLimit": {
        "windowMs": 60000,
        "max": 100
      }
    }
  }
}
```

### REST Endpoints

#### Agent Management
```bash
# List agents
GET /api/agents

# Get agent details
GET /api/agents/:agentId

# Update agent
PUT /api/agents/:agentId

# Start/stop agent
POST /api/agents/:agentId/start
POST /api/agents/:agentId/stop
```

#### Chat Endpoints
```bash
# Send message
POST /api/chat/send
{
  "agentId": "nyx",
  "message": "Hello!",
  "conversationId": "optional-id"
}

# Get conversation
GET /api/chat/conversations/:conversationId

# List conversations
GET /api/chat/conversations
```

#### Memory Endpoints
```bash
# Store memory
POST /api/memory/store
{
  "agentId": "nyx",
  "content": "Remember this",
  "metadata": {}
}

# Search memories
GET /api/memory/search?q=query&agentId=nyx
```

### WebSocket Events

#### Connection
```javascript
const ws = new WebSocket('ws://localhost:3001/ws');

ws.on('open', () => {
  // Authenticate
  ws.send(JSON.stringify({
    type: 'auth',
    token: 'your-auth-token'
  }));
});
```

#### Real-time Events
```javascript
// Subscribe to agent events
ws.send(JSON.stringify({
  type: 'subscribe',
  agents: ['nyx', 'aria'],
  events: ['thought', 'emotion', 'action']
}));

// Receive events
ws.on('message', (data) => {
  const event = JSON.parse(data);
  switch (event.type) {
    case 'agent:thought':
      console.log(event.agentId, 'thinking:', event.thought);
      break;
    case 'agent:emotion':
      console.log(event.agentId, 'feeling:', event.emotion);
      break;
  }
});
```

### Multi-Agent Chat

```javascript
// Auto-route to best agent
ws.send(JSON.stringify({
  type: 'chat:route',
  message: 'I need help with coding',
  context: { skill: 'programming' }
}));

// Direct agent chat
ws.send(JSON.stringify({
  type: 'chat:message',
  agentId: 'nyx',
  message: 'Can you hack this?'
}));
```
