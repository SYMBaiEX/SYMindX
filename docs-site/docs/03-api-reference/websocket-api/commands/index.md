# WebSocket Commands API

The WebSocket Commands API provides real-time command execution for agent control, chat management, and system operations.

## Overview

WebSocket commands enable:
- Real-time agent control
- Live chat messaging
- Subscription management
- System monitoring
- Multi-agent coordination

## Connection Setup

```javascript
const ws = new WebSocket('ws://localhost:8080/ws');

ws.onopen = () => {
  console.log('Connected to SYMindX WebSocket');
};

ws.onmessage = (event) => {
  const response = JSON.parse(event.data);
  handleResponse(response);
};

// Send command
function sendCommand(command) {
  ws.send(JSON.stringify(command));
}
```

## Command Structure

All commands follow this structure:

```typescript
interface Command {
  id?: string;          // Optional command ID for tracking responses
  type: string;         // Command type
  timestamp?: string;   // Optional timestamp
  [key: string]: any;   // Command-specific parameters
}

interface CommandResponse {
  id?: string;          // Matches command ID if provided
  type: string;         // Response type
  success: boolean;     // Command success status
  data?: any;          // Response data
  error?: {            // Error details if failed
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}
```

## Authentication Commands

### Authenticate

```json
{
  "type": "auth",
  "token": "YOUR_AUTH_TOKEN"
}
```

**Response:**
```json
{
  "type": "auth.response",
  "success": true,
  "data": {
    "userId": "user_123",
    "permissions": ["chat", "agent.control", "system.monitor"]
  }
}
```

## Chat Commands

### Join Conversation

Join a chat conversation for real-time messaging.

```json
{
  "type": "chat.join",
  "conversationId": "conv_123",
  "options": {
    "loadHistory": true,
    "historyLimit": 50
  }
}
```

**Response:**
```json
{
  "type": "chat.joined",
  "success": true,
  "data": {
    "conversationId": "conv_123",
    "agent": {
      "id": "nyx",
      "name": "NyX",
      "status": "active"
    },
    "messages": [
      {
        "id": "msg_001",
        "role": "assistant",
        "content": "Hello! How can I help you today?",
        "timestamp": "2024-01-15T10:30:00Z"
      }
    ]
  }
}
```

### Send Message

Send a message in the current conversation.

```json
{
  "type": "chat.message",
  "conversationId": "conv_123",
  "content": "Can you help me optimize this Python code?",
  "metadata": {
    "hasCode": true
  }
}
```

**Events Triggered:**
1. **chat.typing** - Agent starts typing
2. **chat.message** - Agent response
3. **agent.thought** - Agent's thought process (if subscribed)

### Leave Conversation

```json
{
  "type": "chat.leave",
  "conversationId": "conv_123"
}
```

### Start Typing Indicator

```json
{
  "type": "chat.typing.start",
  "conversationId": "conv_123"
}
```

### Stop Typing Indicator

```json
{
  "type": "chat.typing.stop",
  "conversationId": "conv_123"
}
```

## Agent Control Commands

### Start Agent

```json
{
  "type": "agent.start",
  "agentId": "nyx"
}
```

**Response:**
```json
{
  "type": "agent.started",
  "success": true,
  "data": {
    "agentId": "nyx",
    "status": "active",
    "startTime": "2024-01-15T10:30:00Z"
  }
}
```

### Stop Agent

```json
{
  "type": "agent.stop",
  "agentId": "nyx",
  "options": {
    "graceful": true,
    "timeout": 30000
  }
}
```

### Restart Agent

```json
{
  "type": "agent.restart",
  "agentId": "nyx"
}
```

### Update Agent Configuration

```json
{
  "type": "agent.config.update",
  "agentId": "nyx",
  "config": {
    "emotion": {
      "sensitivity": 0.8
    },
    "memory": {
      "consolidationInterval": 3600000
    }
  }
}
```

## Multi-Agent Commands

### Spawn Agent

```json
{
  "type": "multiagent.spawn",
  "characterId": "aria",
  "instanceName": "Aria-Helper-01",
  "config": {
    "memory": "postgres"
  },
  "autoStart": true
}
```

**Response:**
```json
{
  "type": "multiagent.spawned",
  "success": true,
  "data": {
    "agentId": "agent_1705312345_abc123",
    "instanceName": "Aria-Helper-01",
    "status": "active"
  }
}
```

### Route Conversation

```json
{
  "type": "multiagent.route",
  "requirements": {
    "specialty": ["technical", "analytical"],
    "topic": "database optimization"
  },
  "conversationContext": {
    "messages": ["Previous conversation context..."]
  }
}
```

**Response:**
```json
{
  "type": "multiagent.routed",
  "success": true,
  "data": {
    "selectedAgent": {
      "id": "agent_123",
      "name": "Aria-Analytics-01",
      "score": 92
    },
    "alternatives": [
      {
        "id": "agent_456",
        "name": "Marcus-Strategy-01",
        "score": 78
      }
    ]
  }
}
```

### Transfer Conversation

Transfer active conversation to another agent.

```json
{
  "type": "multiagent.transfer",
  "conversationId": "conv_123",
  "targetAgentId": "agent_456",
  "reason": "Better expertise match",
  "includeContext": true
}
```

## Subscription Commands

### Subscribe to Events

```json
{
  "type": "subscribe",
  "subscriptions": [
    {
      "pattern": "agent.thought",
      "filters": {
        "agentId": "nyx"
      }
    },
    {
      "pattern": "system.metrics",
      "interval": 5000
    },
    {
      "pattern": "chat.*",
      "filters": {
        "conversationId": "conv_123"
      }
    }
  ]
}
```

**Response:**
```json
{
  "type": "subscribe.response",
  "success": true,
  "data": {
    "subscriptions": [
      {
        "id": "sub_001",
        "pattern": "agent.thought",
        "active": true
      },
      {
        "id": "sub_002",
        "pattern": "system.metrics",
        "active": true
      },
      {
        "id": "sub_003",
        "pattern": "chat.*",
        "active": true
      }
    ]
  }
}
```

### Update Subscription

```json
{
  "type": "subscribe.update",
  "subscriptionId": "sub_001",
  "filters": {
    "agentId": ["nyx", "aria"],
    "thoughtStage": ["planning", "reflection"]
  }
}
```

### Unsubscribe

```json
{
  "type": "unsubscribe",
  "subscriptionIds": ["sub_001", "sub_002"]
}
```

### List Subscriptions

```json
{
  "type": "subscribe.list"
}
```

## System Commands

### Get System Status

```json
{
  "type": "system.status"
}
```

**Response:**
```json
{
  "type": "system.status.response",
  "success": true,
  "data": {
    "status": "healthy",
    "uptime": 86400,
    "agents": {
      "total": 5,
      "active": 3,
      "idle": 1,
      "error": 1
    },
    "resources": {
      "cpu": 45.2,
      "memory": 2147483648,
      "connections": 23
    }
  }
}
```

### Get Metrics

```json
{
  "type": "system.metrics",
  "options": {
    "interval": "5m",
    "metrics": ["cpu", "memory", "messageRate"]
  }
}
```

### Health Check

```json
{
  "type": "system.health"
}
```

## Batch Commands

Execute multiple commands in a single request.

```json
{
  "type": "batch",
  "commands": [
    {
      "type": "agent.start",
      "agentId": "nyx"
    },
    {
      "type": "chat.join",
      "conversationId": "conv_123"
    },
    {
      "type": "subscribe",
      "subscriptions": [
        {
          "pattern": "agent.thought",
          "filters": { "agentId": "nyx" }
        }
      ]
    }
  ]
}
```

**Response:**
```json
{
  "type": "batch.response",
  "success": true,
  "data": {
    "results": [
      {
        "index": 0,
        "success": true,
        "response": { /* agent.started response */ }
      },
      {
        "index": 1,
        "success": true,
        "response": { /* chat.joined response */ }
      },
      {
        "index": 2,
        "success": true,
        "response": { /* subscribe.response */ }
      }
    ]
  }
}
```

## Error Handling

All commands can return errors:

```json
{
  "type": "error",
  "success": false,
  "error": {
    "code": "AGENT_NOT_FOUND",
    "message": "Agent 'nyx' not found",
    "details": {
      "agentId": "nyx",
      "availableAgents": ["aria", "marcus", "phoenix"]
    }
  },
  "commandId": "cmd_123",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Common Error Codes

- `AUTH_REQUIRED` - Authentication required
- `PERMISSION_DENIED` - Insufficient permissions
- `INVALID_COMMAND` - Unknown command type
- `AGENT_NOT_FOUND` - Agent doesn't exist
- `CONVERSATION_NOT_FOUND` - Conversation doesn't exist
- `RATE_LIMIT` - Too many commands
- `INVALID_PARAMETERS` - Missing or invalid parameters
- `AGENT_BUSY` - Agent is busy processing
- `SUBSCRIPTION_FAILED` - Failed to create subscription

## Command Flow Examples

### Complete Chat Flow

```javascript
// 1. Connect and authenticate
ws.send(JSON.stringify({
  type: 'auth',
  token: 'YOUR_TOKEN'
}));

// 2. Create or join conversation
ws.send(JSON.stringify({
  type: 'chat.join',
  conversationId: 'new',
  agentId: 'nyx'
}));

// 3. Subscribe to agent thoughts
ws.send(JSON.stringify({
  type: 'subscribe',
  subscriptions: [{
    pattern: 'agent.thought',
    filters: { agentId: 'nyx' }
  }]
}));

// 4. Send message
ws.send(JSON.stringify({
  type: 'chat.message',
  conversationId: 'conv_123',
  content: 'Hello NyX!'
}));

// 5. Handle responses and events
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch(data.type) {
    case 'chat.message':
      displayMessage(data);
      break;
    case 'agent.thought':
      showThought(data);
      break;
    case 'chat.typing':
      showTypingIndicator(data);
      break;
  }
};
```

### Multi-Agent Coordination Flow

```javascript
// 1. Get system status
ws.send(JSON.stringify({
  type: 'system.status'
}));

// 2. Find best agent for task
ws.send(JSON.stringify({
  type: 'multiagent.route',
  requirements: {
    specialty: ['technical'],
    topic: 'database optimization'
  }
}));

// 3. Spawn new agent if needed
ws.send(JSON.stringify({
  type: 'multiagent.spawn',
  characterId: 'aria',
  instanceName: 'Aria-DB-Expert',
  autoStart: true
}));

// 4. Transfer conversation
ws.send(JSON.stringify({
  type: 'multiagent.transfer',
  conversationId: 'conv_123',
  targetAgentId: 'agent_456'
}));
```

## Best Practices

1. **Command IDs**: Always include command IDs for tracking responses
2. **Error Handling**: Implement robust error handling for all commands
3. **Subscription Management**: Clean up subscriptions when no longer needed
4. **Batching**: Use batch commands for related operations
5. **Rate Limiting**: Implement client-side rate limiting
6. **Reconnection**: Handle reconnection with subscription restoration
7. **Heartbeat**: Send periodic ping commands to maintain connection

