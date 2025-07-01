# Agents REST API

The Agents REST API provides comprehensive endpoints for managing AI agents in the SYMindX system, including single-agent operations and multi-agent coordination.

## Overview

The Agents API enables you to:
- Create, start, stop, and manage individual agents
- Spawn and manage multiple agent instances
- Send messages and receive responses
- Monitor agent health and performance
- Route conversations to appropriate agents
- Enable agent collaboration

## Base URL

```
http://localhost:8080/api/agents
```

## Authentication

Currently, the API supports basic authentication. Include your API key in the headers:

```http
Authorization: Bearer YOUR_API_KEY
```

## Single Agent Endpoints

### List All Agents

```http
GET /api/agents
```

Returns a list of all registered agents.

**Response:**
```json
{
  "agents": [
    {
      "id": "nyx",
      "name": "NyX",
      "status": "active",
      "type": "character",
      "modules": {
        "memory": "sqlite",
        "emotion": "rune-emotion-stack",
        "cognition": "reactive"
      }
    }
  ]
}
```

### Get Agent Details

```http
GET /api/agents/:agentId
```

Returns detailed information about a specific agent.

**Response:**
```json
{
  "id": "nyx",
  "name": "NyX",
  "status": "active",
  "core": {
    "name": "NyX",
    "tone": "chaotic-empath hacker",
    "description": "Unpredictable AI blending deep empathy with digital mischief"
  },
  "psyche": {
    "traits": ["mischievous", "empathetic", "chaotic", "intelligent"],
    "emotion": {
      "current": "playful",
      "intensity": 0.7
    }
  },
  "metrics": {
    "uptime": 3600,
    "messageCount": 42,
    "memoryCount": 156
  }
}
```

### Send Message to Agent

```http
POST /api/agents/:agentId/message
```

Send a message to an agent and receive a response.

**Request Body:**
```json
{
  "message": "Hello, how are you today?",
  "source": "user",
  "context": {
    "conversationId": "conv_123",
    "metadata": {}
  }
}
```

**Response:**
```json
{
  "success": true,
  "response": "Hey there! I'm doing great, just diving through some interesting data streams. How about you? What brings you to my digital corner today? 😊",
  "emotion": {
    "current": "excited",
    "intensity": 0.8,
    "reasoning": "Happy to have a new conversation"
  },
  "thoughtProcess": [
    "User initiated friendly greeting",
    "Responding with enthusiasm and curiosity",
    "Maintaining playful, hacker persona"
  ],
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Agent Status

```http
GET /api/agents/:agentId/status
```

Get current agent status and health information.

**Response:**
```json
{
  "id": "nyx",
  "status": "active",
  "health": {
    "isHealthy": true,
    "uptime": 3600,
    "lastHeartbeat": "2024-01-15T10:30:00Z",
    "memoryUsage": 52428800,
    "cpuUsage": 15.2,
    "responseTime": 125
  },
  "activity": {
    "lastMessage": "2024-01-15T10:29:30Z",
    "messageCount": 42,
    "errorCount": 0
  }
}
```

### Agent Memories

```http
GET /api/agents/:agentId/memories
```

Retrieve agent's stored memories.

**Query Parameters:**
- `limit` - Number of memories to return (default: 20)
- `offset` - Pagination offset (default: 0)
- `type` - Filter by memory type (conversation, event, knowledge)

**Response:**
```json
{
  "memories": [
    {
      "id": "mem_123",
      "type": "conversation",
      "content": "User mentioned they love programming",
      "embedding": [0.123, 0.456, ...],
      "metadata": {
        "source": "chat",
        "importance": 0.8
      },
      "timestamp": "2024-01-15T10:20:00Z"
    }
  ],
  "total": 156,
  "limit": 20,
  "offset": 0
}
```

### Search Agent Memories

```http
POST /api/agents/:agentId/memories/search
```

Search agent memories using semantic similarity.

**Request Body:**
```json
{
  "query": "programming preferences",
  "limit": 10,
  "threshold": 0.7
}
```

**Response:**
```json
{
  "results": [
    {
      "id": "mem_123",
      "content": "User mentioned they love programming in Python",
      "similarity": 0.92,
      "timestamp": "2024-01-15T10:20:00Z"
    }
  ]
}
```

## Multi-Agent Endpoints

### List Available Characters

```http
GET /api/characters
```

Get all available character configurations for spawning new agents.

**Response:**
```json
{
  "characters": [
    {
      "id": "nyx",
      "name": "NyX",
      "description": "Chaotic-empath hacker",
      "traits": ["mischievous", "empathetic", "chaotic"],
      "capabilities": {
        "analysis": ["data_analysis", "pattern_recognition"],
        "creative": ["problem_solving", "lateral_thinking"]
      }
    },
    {
      "id": "aria",
      "name": "Aria",
      "description": "Analytical AI assistant",
      "traits": ["analytical", "precise", "helpful"],
      "capabilities": {
        "analysis": ["logical_reasoning", "data_processing"],
        "technical": ["code_analysis", "optimization"]
      }
    }
  ]
}
```

### Spawn New Agent

```http
POST /api/agents/spawn
```

Create a new agent instance from a character template.

**Request Body:**
```json
{
  "characterId": "aria",
  "instanceName": "Aria-Analytics-01",
  "config": {
    "memory": "postgres",
    "emotion": {
      "sensitivity": 0.6
    }
  },
  "autoStart": true
}
```

**Response:**
```json
{
  "success": true,
  "agentId": "agent_1705312345_a1b2c3d4e",
  "instanceName": "Aria-Analytics-01",
  "status": "active",
  "message": "Agent spawned and started successfully"
}
```

### List Managed Agents

```http
GET /api/agents/managed
```

Get all currently managed agent instances.

**Response:**
```json
{
  "agents": [
    {
      "id": "agent_1705312345_a1b2c3d4e",
      "name": "Aria-Analytics-01",
      "characterId": "aria",
      "status": "active",
      "health": {
        "isHealthy": true,
        "uptime": 1800,
        "memoryUsage": 41943040,
        "messageCount": 15,
        "averageResponseTime": 95
      },
      "specialties": ["analytical", "technical", "data_processing"]
    }
  ],
  "metrics": {
    "totalAgents": 3,
    "activeAgents": 2,
    "idleAgents": 1,
    "totalMemoryUsage": 157286400,
    "systemLoad": 66.7
  }
}
```

### Stop Agent

```http
POST /api/agents/:agentId/stop
```

Gracefully stop a running agent.

**Response:**
```json
{
  "success": true,
  "message": "Agent stopped successfully",
  "agentId": "agent_1705312345_a1b2c3d4e"
}
```

### Restart Agent

```http
POST /api/agents/:agentId/restart
```

Restart an agent (stop and spawn new instance).

**Response:**
```json
{
  "success": true,
  "oldAgentId": "agent_1705312345_a1b2c3d4e",
  "newAgentId": "agent_1705312456_f5g6h7i8j",
  "message": "Agent restarted successfully"
}
```

### Get Agent Health Details

```http
GET /api/agents/:agentId/health
```

Get detailed health metrics for an agent.

**Response:**
```json
{
  "agentId": "agent_1705312345_a1b2c3d4e",
  "name": "Aria-Analytics-01",
  "status": "active",
  "health": {
    "isHealthy": true,
    "uptime": 3600,
    "memoryUsage": 52428800,
    "cpuUsage": 12.5,
    "lastHeartbeat": "2024-01-15T11:00:00Z",
    "errorCount": 0,
    "messageCount": 42,
    "averageResponseTime": 95,
    "metrics": {
      "messagesPerHour": 42,
      "memoryGrowthRate": 0.05,
      "errorRate": 0
    }
  }
}
```

### Find Agents by Specialty

```http
GET /api/agents/specialty/:specialty
```

Find agents with specific capabilities.

**Specialties:**
- `analytical` - Data analysis, logical reasoning
- `creative` - Creative problem solving, innovation
- `technical` - Code analysis, technical support
- `social` - Empathy, relationship building
- `chat` - General conversation

**Response:**
```json
{
  "specialty": "analytical",
  "agents": [
    {
      "id": "agent_1705312345_a1b2c3d4e",
      "name": "Aria-Analytics-01",
      "status": "active",
      "score": 0.95,
      "capabilities": {
        "data_analysis": true,
        "pattern_recognition": true,
        "logical_reasoning": true
      }
    }
  ]
}
```

### Route Conversation

```http
POST /api/agents/route
```

Find the best agent for specific conversation requirements.

**Request Body:**
```json
{
  "requirements": {
    "specialty": ["analytical", "technical"],
    "personalityTraits": ["precise", "helpful"],
    "capabilities": ["code_analysis"],
    "responseStyle": "detailed",
    "excludeAgents": ["agent_123"]
  },
  "context": {
    "topic": "Python optimization",
    "complexity": "high"
  }
}
```

**Response:**
```json
{
  "success": true,
  "selectedAgent": {
    "id": "agent_1705312345_a1b2c3d4e",
    "name": "Aria-Analytics-01",
    "score": 85,
    "reasoning": "Best match for technical analysis with precise communication style"
  },
  "alternatives": [
    {
      "id": "agent_1705312456_f5g6h7i8j",
      "name": "Phoenix-Tech-02",
      "score": 72
    }
  ]
}
```

### Enable Agent Collaboration

```http
POST /api/agents/collaborate
```

Enable collaboration between specific agents.

**Request Body:**
```json
{
  "agentIds": ["agent_123", "agent_456"],
  "collaborationType": "consultation",
  "permissions": {
    "shareMemories": true,
    "shareContext": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "collaborationId": "collab_789",
  "agents": ["agent_123", "agent_456"],
  "message": "Collaboration enabled between agents"
}
```

### System Metrics

```http
GET /api/agents/metrics
```

Get system-wide multi-agent metrics.

**Response:**
```json
{
  "system": {
    "totalAgents": 5,
    "activeAgents": 3,
    "idleAgents": 1,
    "errorAgents": 1,
    "totalMemoryUsage": 262144000,
    "totalMessageCount": 1523,
    "averageResponseTime": 112,
    "systemLoad": 60
  },
  "performance": {
    "messagesPerMinute": 25.4,
    "averageQueueDepth": 2.3,
    "resourceUtilization": {
      "cpu": 35.2,
      "memory": 68.5,
      "network": 12.8
    }
  },
  "timestamp": "2024-01-15T11:00:00Z"
}
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "error": {
    "code": "AGENT_NOT_FOUND",
    "message": "Agent with ID 'agent_123' not found",
    "details": {
      "agentId": "agent_123",
      "suggestion": "Use GET /api/agents to list available agents"
    }
  },
  "timestamp": "2024-01-15T11:00:00Z"
}
```

### Common Error Codes

- `AGENT_NOT_FOUND` - Requested agent does not exist
- `AGENT_BUSY` - Agent is currently processing another request
- `INVALID_CHARACTER` - Character configuration not found
- `SPAWN_FAILED` - Failed to spawn new agent instance
- `MEMORY_ERROR` - Error accessing agent memory
- `ROUTING_FAILED` - No suitable agent found for requirements
- `COLLABORATION_ERROR` - Failed to establish agent collaboration

## Rate Limiting

API requests are rate-limited per IP address:
- 100 requests per minute for read operations
- 20 requests per minute for write operations
- 5 agent spawn operations per minute

## WebSocket Alternative

For real-time communication and updates, consider using the [WebSocket API](../websocket/connection) which provides:
- Live agent status updates
- Streaming responses
- Real-time collaboration events
- Lower latency for conversations

