---
sidebar_position: 2
sidebar_label: "WebSocket API"
title: "WebSocket API"
description: "Real-time WebSocket interface"
---

# WebSocket API

The SYMindX WebSocket API enables real-time, bidirectional communication between clients and the agent runtime. Built for high-performance streaming, it supports live chat, command execution, status monitoring, and multi-agent coordination with minimal latency.

## Connection URL

```
ws://localhost:3001/ws
```

The WebSocket server runs on the same port as the REST API (3001 by default) at the `/ws` endpoint.

## Connection Example

```javascript
// Browser WebSocket connection
const ws = new WebSocket('ws://localhost:3001/ws');

ws.onopen = () => {
  console.log('Connected to SYMindX WebSocket');
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Received:', message);
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

ws.onclose = () => {
  console.log('Disconnected from SYMindX WebSocket');
};
```

## Message Format

All WebSocket messages use a consistent JSON structure:

### Client to Server
```json
{
  "id": "msg_123",
  "type": "chat",
  "data": {
    "message": "Hello, agent!"
  },
  "targetAgent": "nyx",
  "priority": "normal",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Server to Client
```json
{
  "id": "msg_123",
  "type": "chat_response",
  "data": {
    "response": "Hello! How can I help you today?",
    "agentId": "nyx",
    "emotion": "curious"
  },
  "timestamp": "2024-01-15T10:30:01.000Z"
}
```

## Message Types

### Chat Messages

**Send a chat message:**
```javascript
ws.send(JSON.stringify({
  type: 'chat',
  data: {
    message: 'What can you help me with?',
    conversationId: 'conv_123' // Optional
  },
  targetAgent: 'nyx'
}));
```

**Receive chat response:**
```json
{
  "type": "chat_response",
  "data": {
    "response": "I can help with coding, debugging, and technical discussions!",
    "agentId": "nyx",
    "processingTime": 250,
    "emotion": "helpful"
  }
}
```

### Command Execution

**Execute a command:**
```javascript
ws.send(JSON.stringify({
  type: 'command',
  data: {
    instruction: 'analyze project structure',
    parameters: {
      path: './src'
    }
  },
  targetAgent: 'nyx',
  priority: 'high'
}));
```

**Command result:**
```json
{
  "type": "command_result",
  "data": {
    "commandId": "cmd_456",
    "status": "completed",
    "result": {
      "files": 125,
      "directories": 15,
      "totalSize": "2.5MB"
    },
    "executionTime": 1500
  }
}
```

### Subscriptions

**Subscribe to events:**
```javascript
// Subscribe to agent status updates
ws.send(JSON.stringify({
  type: 'subscribe',
  data: {
    events: ['agent_status', 'emotion_change', 'memory_update']
  }
}));
```

**Receive subscribed events:**
```json
{
  "type": "event",
  "data": {
    "eventType": "emotion_change",
    "agentId": "nyx",
    "previousEmotion": "neutral",
    "currentEmotion": "excited",
    "intensity": 0.8
  }
}
```

### Multi-Agent Features

**Join multi-agent conversation:**
```javascript
ws.send(JSON.stringify({
  type: 'join_conversation',
  data: {
    conversationId: 'multi_conv_789',
    agents: ['nyx', 'aria', 'sage']
  }
}));
```

**Agent handoff:**
```javascript
ws.send(JSON.stringify({
  type: 'agent_handoff',
  data: {
    fromAgent: 'nyx',
    toAgent: 'sage',
    conversationId: 'conv_123',
    reason: 'Specialized knowledge required'
  }
}));
```

## Real-time Features

### Typing Indicators
```javascript
// Start typing
ws.send(JSON.stringify({
  type: 'typing_start',
  conversationId: 'conv_123',
  userId: 'user_456'
}));

// Stop typing
ws.send(JSON.stringify({
  type: 'typing_stop',
  conversationId: 'conv_123',
  userId: 'user_456'
}));
```

### Status Monitoring
```javascript
// Request status update
ws.send(JSON.stringify({
  type: 'status',
  targetAgent: 'nyx'
}));

// Receive status
{
  "type": "status_update",
  "data": {
    "agentId": "nyx",
    "status": "active",
    "currentTask": "processing_request",
    "queueLength": 3,
    "uptime": 3600000
  }
}
```

## Heartbeat & Connection Management

The WebSocket server implements automatic heartbeat to detect disconnected clients:

```javascript
// Respond to ping with pong
ws.on('message', (data) => {
  const message = JSON.parse(data);
  if (message.type === 'ping') {
    ws.send(JSON.stringify({ type: 'pong' }));
  }
});
```

## Error Handling

WebSocket errors are sent in a standardized format:

```json
{
  "type": "error",
  "data": {
    "code": "INVALID_MESSAGE",
    "message": "Message format is invalid",
    "details": "Missing required field: targetAgent"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

Common error codes:
- `INVALID_MESSAGE`: Malformed message format
- `AGENT_NOT_FOUND`: Specified agent doesn't exist
- `UNAUTHORIZED`: Authentication required
- `RATE_LIMIT_EXCEEDED`: Too many messages
- `INTERNAL_ERROR`: Server-side error

## Best Practices

1. **Implement Reconnection Logic**: Handle disconnections gracefully
   ```javascript
   let reconnectInterval = 1000;
   
   function connect() {
     const ws = new WebSocket('ws://localhost:3001/ws');
     
     ws.onclose = () => {
       setTimeout(connect, reconnectInterval);
       reconnectInterval = Math.min(reconnectInterval * 2, 30000);
     };
     
     ws.onopen = () => {
       reconnectInterval = 1000;
     };
   }
   ```

2. **Message Queuing**: Queue messages when disconnected
3. **Event Debouncing**: Limit typing indicators and status requests
4. **Compression**: Enable per-message compression for large payloads
5. **Security**: Use WSS (WebSocket Secure) in production

## Advanced Features

### Stream Processing
```javascript
// Subscribe to thought stream
ws.send(JSON.stringify({
  type: 'subscribe',
  data: {
    stream: 'thoughts',
    agentId: 'nyx',
    filter: {
      minImportance: 0.7
    }
  }
}));
```

### Batch Operations
```javascript
// Send multiple messages efficiently
ws.send(JSON.stringify({
  type: 'batch',
  data: {
    messages: [
      { type: 'chat', data: { message: 'First question' }},
      { type: 'chat', data: { message: 'Second question' }},
      { type: 'command', data: { instruction: 'summarize' }}
    ]
  }
}));
```

## Next Steps

- Learn about [Connection Management](./connection) strategies
- Explore [Streaming Features](./streaming) for real-time data
- Understand [Event Types](./events) and subscriptions
- Review [Command Protocol](./commands) for agent control
