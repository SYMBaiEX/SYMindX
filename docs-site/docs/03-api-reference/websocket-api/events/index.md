# WebSocket Events API

The WebSocket Events API provides real-time event streaming for all agent activities, system updates, and chat interactions in the SYMindX system.

## Overview

The WebSocket Events API enables:
- Real-time agent status updates
- Live streaming of agent thoughts and emotions
- Chat message broadcasting
- System-wide event notifications
- Multi-agent coordination events
- Performance metric updates

## Connection

Connect to the WebSocket endpoint:

```javascript
const ws = new WebSocket('ws://localhost:8080/ws');

ws.onopen = () => {
  console.log('Connected to SYMindX WebSocket');
  
  // Authenticate (if required)
  ws.send(JSON.stringify({
    type: 'auth',
    token: 'YOUR_API_TOKEN'
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received event:', data);
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

ws.onclose = () => {
  console.log('Disconnected from SYMindX WebSocket');
};
```

## Event Types

### Agent Events

#### Agent Status Change

Emitted when an agent's status changes.

```json
{
  "type": "agent.status",
  "agentId": "nyx",
  "agentName": "NyX",
  "status": "active",
  "previousStatus": "idle",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Status Values:**
- `initializing` - Agent is starting up
- `active` - Agent is processing
- `idle` - Agent is waiting
- `thinking` - Agent is processing a request
- `stopping` - Agent is shutting down
- `error` - Agent encountered an error

#### Agent Thought

Real-time streaming of agent's internal thought process.

```json
{
  "type": "agent.thought",
  "agentId": "nyx",
  "agentName": "NyX",
  "thought": {
    "content": "Analyzing user's request for code optimization...",
    "stage": "planning",
    "confidence": 0.85,
    "reasoning": [
      "User mentioned performance issues",
      "Code snippet appears to have O(n²) complexity",
      "Suggesting optimization approach"
    ]
  },
  "timestamp": "2024-01-15T10:30:01Z"
}
```

#### Agent Emotion

Updates about agent's emotional state changes.

```json
{
  "type": "agent.emotion",
  "agentId": "nyx",
  "agentName": "NyX",
  "emotion": {
    "current": "excited",
    "previous": "curious",
    "intensity": 0.8,
    "valence": 0.7,
    "arousal": 0.6,
    "trigger": "Discovered interesting pattern in data",
    "emotionStack": [
      { "emotion": "excited", "weight": 0.8 },
      { "emotion": "curious", "weight": 0.2 }
    ]
  },
  "timestamp": "2024-01-15T10:30:02Z"
}
```

#### Agent Action

When an agent performs an action.

```json
{
  "type": "agent.action",
  "agentId": "nyx",
  "agentName": "NyX",
  "action": {
    "type": "message.send",
    "target": "user",
    "content": "I've found an optimization that could improve performance by 70%!",
    "metadata": {
      "platform": "web",
      "conversationId": "conv_123"
    }
  },
  "timestamp": "2024-01-15T10:30:03Z"
}
```

### Chat Events

#### Chat Message

New chat messages from agents or users.

```json
{
  "type": "chat.message",
  "conversationId": "conv_123",
  "message": {
    "id": "msg_456",
    "role": "assistant",
    "agentId": "nyx",
    "agentName": "NyX",
    "content": "Hey! I noticed you're working on optimization. Let me help with that!",
    "metadata": {
      "emotion": "helpful",
      "confidence": 0.9
    }
  },
  "timestamp": "2024-01-15T10:30:04Z"
}
```

#### Chat Typing

Indicates when an agent is typing a response.

```json
{
  "type": "chat.typing",
  "conversationId": "conv_123",
  "agentId": "nyx",
  "agentName": "NyX",
  "isTyping": true,
  "timestamp": "2024-01-15T10:30:05Z"
}
```

#### Chat Session

Chat session lifecycle events.

```json
{
  "type": "chat.session",
  "action": "created",
  "session": {
    "id": "session_789",
    "conversationId": "conv_123",
    "participants": [
      {
        "id": "user_123",
        "type": "user",
        "name": "John Doe"
      },
      {
        "id": "nyx",
        "type": "agent",
        "name": "NyX"
      }
    ],
    "metadata": {
      "platform": "web",
      "initialContext": "code optimization"
    }
  },
  "timestamp": "2024-01-15T10:30:06Z"
}
```

### Multi-Agent Events

#### Agent Spawned

When a new agent instance is created.

```json
{
  "type": "multiagent.spawned",
  "agentId": "agent_1705312345_a1b2c3d4e",
  "instanceName": "Aria-Analytics-01",
  "characterId": "aria",
  "config": {
    "memory": "postgres",
    "emotion": "rune-emotion-stack",
    "cognition": "reactive"
  },
  "timestamp": "2024-01-15T10:30:07Z"
}
```

#### Agent Collaboration

When agents collaborate or consult each other.

```json
{
  "type": "multiagent.collaboration",
  "collaborationId": "collab_123",
  "action": "consultation.request",
  "consulting": {
    "agentId": "agent_123",
    "name": "Aria-Analytics-01"
  },
  "consulted": {
    "agentId": "agent_456",
    "name": "Phoenix-Tech-02"
  },
  "topic": "Complex algorithm optimization",
  "timestamp": "2024-01-15T10:30:08Z"
}
```

#### Agent Routing

When conversation routing decisions are made.

```json
{
  "type": "multiagent.routing",
  "routingId": "route_789",
  "requirements": {
    "specialty": ["technical", "analytical"],
    "topic": "database optimization"
  },
  "selected": {
    "agentId": "agent_123",
    "name": "Aria-Analytics-01",
    "score": 92
  },
  "alternatives": [
    {
      "agentId": "agent_456",
      "name": "Phoenix-Tech-02",
      "score": 78
    }
  ],
  "timestamp": "2024-01-15T10:30:09Z"
}
```

### System Events

#### System Metrics

Periodic system performance updates.

```json
{
  "type": "system.metrics",
  "metrics": {
    "agents": {
      "total": 5,
      "active": 3,
      "idle": 1,
      "error": 1
    },
    "performance": {
      "messagesPerMinute": 42,
      "averageResponseTime": 125,
      "memoryUsage": 157286400,
      "cpuUsage": 35.2
    },
    "health": {
      "status": "healthy",
      "uptime": 86400,
      "lastCheck": "2024-01-15T10:30:00Z"
    }
  },
  "timestamp": "2024-01-15T10:30:10Z"
}
```

#### System Alert

Important system notifications.

```json
{
  "type": "system.alert",
  "severity": "warning",
  "code": "HIGH_MEMORY_USAGE",
  "message": "Memory usage exceeds 80% threshold",
  "details": {
    "currentUsage": 85.3,
    "threshold": 80,
    "affectedAgents": ["agent_123", "agent_456"]
  },
  "timestamp": "2024-01-15T10:30:11Z"
}
```

### Memory Events

#### Memory Created

When new memories are stored.

```json
{
  "type": "memory.created",
  "agentId": "nyx",
  "memory": {
    "id": "mem_123",
    "type": "conversation",
    "content": "User prefers Python for data analysis",
    "importance": 0.8,
    "tags": ["preference", "programming", "python"],
    "source": "chat"
  },
  "timestamp": "2024-01-15T10:30:12Z"
}
```

#### Memory Consolidated

When memories are optimized or consolidated.

```json
{
  "type": "memory.consolidated",
  "agentId": "nyx",
  "consolidation": {
    "originalCount": 50,
    "consolidatedCount": 15,
    "savedSpace": 68,
    "topics": ["programming", "optimization", "user_preferences"]
  },
  "timestamp": "2024-01-15T10:30:13Z"
}
```

## Subscribing to Events

### Subscribe to Specific Events

Filter events by type or criteria.

```javascript
// Subscribe to specific agent's events
ws.send(JSON.stringify({
  type: 'subscribe',
  filters: {
    agentId: 'nyx',
    eventTypes: ['agent.thought', 'agent.emotion']
  }
}));

// Subscribe to all chat events
ws.send(JSON.stringify({
  type: 'subscribe',
  filters: {
    eventTypes: ['chat.*']
  }
}));

// Subscribe to system alerts
ws.send(JSON.stringify({
  type: 'subscribe',
  filters: {
    eventTypes: ['system.alert'],
    severity: ['error', 'critical']
  }
}));
```

### Unsubscribe from Events

```javascript
ws.send(JSON.stringify({
  type: 'unsubscribe',
  subscriptionId: 'sub_123'
}));
```

## Event Patterns

### Wildcard Subscriptions

Use wildcards to subscribe to event patterns:

- `agent.*` - All agent events
- `chat.*` - All chat events
- `*.error` - All error events
- `agent.*.nyx` - All events for agent "nyx"
- `multiagent.collaboration.*` - All collaboration events

### Event Filtering

Apply filters to reduce event volume:

```javascript
ws.send(JSON.stringify({
  type: 'subscribe',
  filters: {
    eventTypes: ['agent.emotion'],
    conditions: {
      'emotion.intensity': { '$gt': 0.7 },
      'emotion.valence': { '$gt': 0 }
    }
  }
}));
```

## Best Practices

### Reconnection Strategy

Implement automatic reconnection with exponential backoff:

```javascript
class WebSocketClient {
  constructor(url) {
    this.url = url;
    this.reconnectDelay = 1000;
    this.maxReconnectDelay = 30000;
    this.connect();
  }

  connect() {
    this.ws = new WebSocket(this.url);
    
    this.ws.onopen = () => {
      console.log('Connected');
      this.reconnectDelay = 1000; // Reset delay
      this.resubscribe(); // Resubscribe to events
    };
    
    this.ws.onclose = () => {
      console.log(`Reconnecting in ${this.reconnectDelay}ms...`);
      setTimeout(() => this.connect(), this.reconnectDelay);
      this.reconnectDelay = Math.min(
        this.reconnectDelay * 2,
        this.maxReconnectDelay
      );
    };
  }
  
  resubscribe() {
    // Resubscribe to your events
  }
}
```

### Event Handling

Structure your event handlers for maintainability:

```javascript
const eventHandlers = {
  'agent.thought': (data) => {
    updateThoughtStream(data.agentId, data.thought);
  },
  'agent.emotion': (data) => {
    updateEmotionDisplay(data.agentId, data.emotion);
  },
  'chat.message': (data) => {
    addMessageToChat(data.conversationId, data.message);
  },
  'system.alert': (data) => {
    if (data.severity === 'critical') {
      showCriticalAlert(data);
    }
  }
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  const handler = eventHandlers[data.type];
  if (handler) {
    handler(data);
  }
};
```

### Performance Considerations

- **Batch Updates**: Group UI updates to avoid excessive rendering
- **Throttle Events**: Limit high-frequency events like thoughts
- **Selective Subscription**: Only subscribe to needed events
- **Local State**: Maintain local state to reduce server queries

## Error Handling

WebSocket errors follow a consistent format:

```json
{
  "type": "error",
  "code": "INVALID_SUBSCRIPTION",
  "message": "Invalid event type pattern",
  "details": {
    "pattern": "invalid.**",
    "suggestion": "Use valid event type patterns"
  },
  "timestamp": "2024-01-15T10:30:14Z"
}
```

### Common Error Codes

- `AUTH_FAILED` - Authentication failure
- `INVALID_SUBSCRIPTION` - Invalid subscription request
- `RATE_LIMIT` - Too many requests
- `INVALID_FORMAT` - Malformed message format
- `AGENT_NOT_FOUND` - Referenced agent doesn't exist
- `PERMISSION_DENIED` - Insufficient permissions

