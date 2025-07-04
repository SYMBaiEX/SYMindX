---
sidebar_position: 1
title: "API & Web UI Extension"
description: "HTTP API and Web interface for SYMindX"
---

# API & Web UI Extension

The API Extension provides comprehensive HTTP REST and WebSocket APIs for interacting with SYMindX agents, along with a built-in web dashboard for monitoring and management.

## Overview

The API Extension is the core interface layer that enables:
- **REST API**: Full HTTP API for agent management and interaction
- **WebSocket Server**: Real-time streaming for conversations and agent thoughts
- **Web Dashboard**: React-based UI for monitoring agents and system status
- **CORS Support**: Cross-origin resource sharing for web applications
- **Authentication**: Secure access control and rate limiting
- **Chat Persistence**: Store and retrieve conversation history

## Features

### HTTP REST API

Complete REST API for all agent operations:

```typescript
// Agent management
GET    /api/agents              // List all agents
GET    /api/agents/:id          // Get agent details
POST   /api/agents/:id/start    // Start agent
POST   /api/agents/:id/stop     // Stop agent
GET    /api/agents/:id/status   // Agent status

// Chat and interaction
POST   /api/agents/:id/chat     // Send message to agent
GET    /api/agents/:id/history  // Get chat history
POST   /api/agents/:id/think    // Make agent think

// System endpoints
GET    /api/runtime/status      // Runtime status
GET    /api/runtime/stats       // System statistics
GET    /api/health             // Health check
```

### WebSocket Streaming

Real-time bidirectional communication:

```javascript
// Connect to agent WebSocket
const ws = new WebSocket('ws://localhost:8000/ws/agents/nyx');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch(data.type) {
    case 'thought':
      console.log('Agent thought:', data.content);
      break;
    case 'emotion':
      console.log('Emotion change:', data.emotion);
      break;
    case 'response':
      console.log('Agent response:', data.message);
      break;
  }
};

// Send message to agent
ws.send(JSON.stringify({
  type: 'message',
  content: 'Hello, how are you?'
}));
```

### Web Dashboard

Built-in React dashboard featuring:
- **Agent Overview**: Status, emotion, and activity monitoring
- **Live Chat**: Direct conversation interface
- **System Metrics**: Performance and resource usage
- **Real-time Logs**: Streaming agent thoughts and actions
- **Configuration**: Agent settings and module management

## Configuration

Enable the API extension in your runtime configuration:

```json
{
  "extensions": {
    "api": {
      "enabled": true,
      "port": 8000,
      "host": "localhost",
      "cors": {
        "enabled": true,
        "origins": ["http://localhost:3000", "http://localhost:5173"]
      },
      "features": {
        "http": true,
        "websocket": true,
        "webui": true,
        "auth": false,
        "rateLimit": true
      },
      "limits": {
        "maxConnections": 100,
        "requestsPerMinute": 1000,
        "messageSize": "10MB"
      }
    }
  }
}
```

### Environment Variables

```bash
# Server configuration
API_PORT=8000
API_HOST=localhost
API_CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# Feature toggles
API_AUTH_REQUIRED=false
API_RATE_LIMITING=true
API_WEBSOCKET_ENABLED=true
API_WEBUI_ENABLED=true

# Limits
API_MAX_CONNECTIONS=100
API_REQUEST_RATE_LIMIT=1000
```

## Usage Examples

### Basic Agent Interaction

```javascript
// Send a message to an agent
const response = await fetch('/api/agents/nyx/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'What are you thinking about?',
    context: { platform: 'web' }
  })
});

const result = await response.json();
console.log('Agent response:', result.response);
```

### WebSocket Integration

```javascript
class SYMindXClient {
  constructor(agentId) {
    this.agentId = agentId;
    this.ws = null;
    this.connect();
  }
  
  connect() {
    this.ws = new WebSocket(`ws://localhost:8000/ws/agents/${this.agentId}`);
    
    this.ws.onopen = () => {
      console.log('Connected to agent');
    };
    
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleMessage(data);
    };
    
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }
  
  sendMessage(message) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'message',
        content: message,
        timestamp: new Date().toISOString()
      }));
    }
  }
  
  handleMessage(data) {
    switch(data.type) {
      case 'response':
        this.onResponse(data.message);
        break;
      case 'thought':
        this.onThought(data.content);
        break;
      case 'emotion':
        this.onEmotionChange(data.emotion, data.intensity);
        break;
    }
  }
}
```

## API Reference

### Agent Endpoints

#### GET /api/agents
List all available agents with status information.

**Response:**
```json
{
  "agents": [
    {
      "id": "nyx",
      "name": "NyX",
      "status": "active",
      "emotion": "curious",
      "lastUpdate": "2025-07-02T10:30:00Z",
      "extensions": ["api", "telegram"]
    }
  ]
}
```

#### POST /api/agents/:id/chat
Send a message to an agent and receive a response.

**Request:**
```json
{
  "message": "Hello, how are you?",
  "context": {
    "platform": "web",
    "userId": "user123"
  }
}
```

**Response:**
```json
{
  "response": "Hello! I'm doing well, thanks for asking. How can I help you today?",
  "emotion": "friendly",
  "timestamp": "2025-07-02T10:30:00Z",
  "metadata": {
    "processingTime": 245,
    "tokens": 15
  }
}
```

#### GET /api/agents/:id/history
Retrieve chat history for an agent.

**Query Parameters:**
- `limit`: Number of messages to return (default: 50)
- `offset`: Pagination offset
- `since`: ISO timestamp for messages since

### WebSocket Events

#### Incoming Events (from client)

```json
// Send message
{
  "type": "message",
  "content": "Your message here",
  "context": {}
}

// Request agent status
{
  "type": "status"
}

// Make agent think
{
  "type": "think",
  "prompt": "Think about the weather"
}
```

#### Outgoing Events (to client)

```json
// Agent response
{
  "type": "response",
  "message": "Agent's response",
  "emotion": "happy",
  "timestamp": "2025-07-02T10:30:00Z"
}

// Agent thought
{
  "type": "thought",
  "content": "I'm thinking about...",
  "internal": true
}

// Emotion change
{
  "type": "emotion",
  "emotion": "excited",
  "intensity": 0.8,
  "triggers": ["positive_interaction"]
}

// Status update
{
  "type": "status",
  "status": "active",
  "uptime": 3600,
  "memory": 1024
}
```

## Security

### Authentication

When authentication is enabled:

```javascript
// Include Bearer token in requests
const response = await fetch('/api/agents/nyx/chat', {
  headers: {
    'Authorization': 'Bearer your-jwt-token',
    'Content-Type': 'application/json'
  },
  // ... rest of request
});
```

### Rate Limiting

The API includes built-in rate limiting:
- **Default**: 1000 requests per minute per IP
- **WebSocket**: 100 messages per minute per connection
- **Burst**: 10 requests per second allowed

### CORS Configuration

Configure allowed origins for web applications:

```json
{
  "cors": {
    "enabled": true,
    "origins": ["https://your-domain.com"],
    "credentials": true,
    "maxAge": 86400
  }
}
```

## Monitoring

### Health Checks

```bash
# Basic health check
curl http://localhost:8000/api/health

# Detailed status
curl http://localhost:8000/api/runtime/status
```

### Metrics

The API exposes metrics for monitoring:
- Request count and latency
- Active WebSocket connections
- Agent response times
- Error rates

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure your domain is in the allowed origins
2. **WebSocket Connection Failed**: Check firewall and proxy settings
3. **Rate Limited**: Reduce request frequency or increase limits
4. **Agent Not Responding**: Check agent status via API

### Debug Mode

Enable debug logging:

```bash
DEBUG=symindx:api npm start
```

---

The API & Web UI Extension provides the foundation for building web applications and integrations with SYMindX agents. Its comprehensive REST API and real-time WebSocket support make it perfect for creating interactive experiences.

**Last updated July 2nd 2025 by SYMBiEX**
