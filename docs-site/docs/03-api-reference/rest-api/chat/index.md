# Chat System REST API

The Chat System API provides comprehensive endpoints for managing conversations, messages, and chat sessions across all agents with persistent storage and advanced search capabilities.

## Overview

The Chat System enables:
- Persistent conversation management
- Multi-agent chat support
- Message history and search
- Real-time chat through WebSocket
- Cross-provider storage support
- Conversation analytics

## Base URL

```
http://localhost:8080/api/chat
```

## Conversation Management

### Create Conversation

```http
POST /api/chat/conversations
```

Create a new conversation with an agent.

**Request Body:**
```json
{
  "agentId": "nyx",
  "userId": "user_123",
  "title": "Code Optimization Help",
  "metadata": {
    "platform": "web",
    "browser": "chrome",
    "topic": "performance",
    "language": "en"
  }
}
```

**Response:**
```json
{
  "id": "conv_1705312345_abc123",
  "agentId": "nyx",
  "userId": "user_123",
  "title": "Code Optimization Help",
  "status": "active",
  "messageCount": 0,
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z",
  "metadata": {
    "platform": "web",
    "browser": "chrome",
    "topic": "performance",
    "language": "en"
  }
}
```

### Get Conversation

```http
GET /api/chat/conversations/:conversationId
```

Retrieve a specific conversation with all messages.

**Query Parameters:**
- `includeMessages` - Include message history (default: true)
- `messageLimit` - Limit number of messages (default: 50)
- `messageOffset` - Pagination offset for messages

**Response:**
```json
{
  "id": "conv_1705312345_abc123",
  "agentId": "nyx",
  "userId": "user_123",
  "title": "Code Optimization Help",
  "status": "active",
  "messageCount": 15,
  "lastMessageAt": "2024-01-15T10:45:00Z",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:45:00Z",
  "messages": [
    {
      "id": "msg_001",
      "role": "user",
      "content": "How can I optimize this Python loop?",
      "timestamp": "2024-01-15T10:30:05Z"
    },
    {
      "id": "msg_002",
      "role": "assistant",
      "content": "I'd be happy to help optimize your Python loop! Could you share the code?",
      "agentId": "nyx",
      "metadata": {
        "emotion": "helpful",
        "confidence": 0.95
      },
      "timestamp": "2024-01-15T10:30:08Z"
    }
  ],
  "metadata": {
    "platform": "web",
    "topic": "performance",
    "tags": ["python", "optimization", "loops"]
  }
}
```

### Update Conversation

```http
PATCH /api/chat/conversations/:conversationId
```

Update conversation metadata or status.

**Request Body:**
```json
{
  "title": "Python Performance Optimization",
  "status": "archived",
  "metadata": {
    "resolved": true,
    "satisfaction": 5,
    "tags": ["python", "performance", "solved"]
  }
}
```

### Delete Conversation

```http
DELETE /api/chat/conversations/:conversationId
```

Delete a conversation and all associated messages.

**Response:**
```json
{
  "success": true,
  "deletedMessages": 15
}
```

### List User Conversations

```http
GET /api/chat/users/:userId/conversations
```

Get all conversations for a specific user.

**Query Parameters:**
- `agentId` - Filter by specific agent
- `status` - Filter by status (active, archived, all)
- `limit` - Number of results (default: 20)
- `offset` - Pagination offset
- `sortBy` - Sort field (createdAt, updatedAt, messageCount)
- `sortOrder` - Sort direction (asc, desc)

**Response:**
```json
{
  "conversations": [
    {
      "id": "conv_1705312345_abc123",
      "agentId": "nyx",
      "agentName": "NyX",
      "title": "Python Performance Optimization",
      "lastMessage": {
        "content": "Glad I could help! Your code should run much faster now.",
        "timestamp": "2024-01-15T10:45:00Z"
      },
      "messageCount": 15,
      "status": "active",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 42,
  "limit": 20,
  "offset": 0
}
```

## Message Management

### Send Message

```http
POST /api/chat/conversations/:conversationId/messages
```

Send a message in a conversation.

**Request Body:**
```json
{
  "role": "user",
  "content": "Here's my code: for i in range(len(data)): process(data[i])",
  "metadata": {
    "codeBlock": true,
    "language": "python"
  }
}
```

**Response:**
```json
{
  "userMessage": {
    "id": "msg_003",
    "conversationId": "conv_1705312345_abc123",
    "role": "user",
    "content": "Here's my code: for i in range(len(data)): process(data[i])",
    "timestamp": "2024-01-15T10:31:00Z"
  },
  "agentResponse": {
    "id": "msg_004",
    "conversationId": "conv_1705312345_abc123",
    "role": "assistant",
    "agentId": "nyx",
    "content": "I can see a classic optimization opportunity! Instead of using range(len(data)), you can iterate directly. Here's the improved version:\n\n```python\nfor item in data:\n    process(item)\n```\n\nThis is more Pythonic and slightly faster!",
    "metadata": {
      "emotion": "excited",
      "confidence": 0.9,
      "codeProvided": true
    },
    "timestamp": "2024-01-15T10:31:03Z"
  }
}
```

### Get Messages

```http
GET /api/chat/conversations/:conversationId/messages
```

Retrieve messages from a conversation.

**Query Parameters:**
- `limit` - Number of messages (default: 50)
- `offset` - Pagination offset
- `before` - Get messages before this timestamp
- `after` - Get messages after this timestamp

### Update Message

```http
PATCH /api/chat/messages/:messageId
```

Update message metadata (e.g., mark as edited).

**Request Body:**
```json
{
  "metadata": {
    "edited": true,
    "editedAt": "2024-01-15T10:32:00Z",
    "originalContent": "Previous content"
  }
}
```

### Delete Message

```http
DELETE /api/chat/messages/:messageId
```

Soft delete a message (marks as deleted but preserves in database).

## Search and Analytics

### Search Conversations

```http
POST /api/chat/search/conversations
```

Search across all conversations using semantic search.

**Request Body:**
```json
{
  "query": "python optimization loops",
  "filters": {
    "userId": "user_123",
    "agentId": ["nyx", "aria"],
    "dateRange": {
      "start": "2024-01-01T00:00:00Z",
      "end": "2024-01-31T23:59:59Z"
    },
    "status": "active"
  },
  "limit": 20,
  "includeMessages": true
}
```

**Response:**
```json
{
  "results": [
    {
      "conversation": {
        "id": "conv_1705312345_abc123",
        "title": "Python Performance Optimization",
        "agentId": "nyx",
        "relevanceScore": 0.92
      },
      "matchedMessages": [
        {
          "id": "msg_004",
          "content": "...Instead of using range(len(data)), you can iterate directly...",
          "relevanceScore": 0.95
        }
      ]
    }
  ],
  "total": 3
}
```

### Get Conversation Statistics

```http
GET /api/chat/conversations/:conversationId/stats
```

Get detailed analytics for a conversation.

**Response:**
```json
{
  "conversationId": "conv_1705312345_abc123",
  "statistics": {
    "messageCount": 15,
    "userMessageCount": 7,
    "agentMessageCount": 8,
    "averageResponseTime": 3.2,
    "totalDuration": 900,
    "emotionBreakdown": {
      "helpful": 5,
      "excited": 2,
      "curious": 1
    },
    "topicsDiscussed": ["python", "optimization", "loops", "performance"],
    "codeBlocksShared": 4,
    "resolutionStatus": "resolved",
    "userSatisfaction": 5
  }
}
```

### Get Agent Chat Statistics

```http
GET /api/chat/agents/:agentId/stats
```

Get chat statistics for a specific agent.

**Query Parameters:**
- `timeRange` - Period for statistics (day, week, month, all)
- `groupBy` - Group results by (hour, day, week)

**Response:**
```json
{
  "agentId": "nyx",
  "timeRange": "week",
  "statistics": {
    "totalConversations": 156,
    "activeConversations": 23,
    "totalMessages": 2341,
    "averageMessagesPerConversation": 15,
    "averageResponseTime": 2.8,
    "satisfactionScore": 4.7,
    "topTopics": [
      { "topic": "optimization", "count": 45 },
      { "topic": "debugging", "count": 38 },
      { "topic": "python", "count": 32 }
    ],
    "emotionDistribution": {
      "helpful": 0.4,
      "excited": 0.2,
      "curious": 0.15,
      "playful": 0.15,
      "focused": 0.1
    },
    "peakHours": [
      { "hour": 14, "messageCount": 234 },
      { "hour": 15, "messageCount": 189 },
      { "hour": 10, "messageCount": 167 }
    ]
  }
}
```

## Export and Import

### Export Conversation

```http
GET /api/chat/conversations/:conversationId/export
```

Export conversation in various formats.

**Query Parameters:**
- `format` - Export format (json, markdown, txt, pdf)
- `includeMetadata` - Include message metadata (default: false)

**Response for Markdown:**
```markdown
# Code Optimization Help
**Date**: 2024-01-15
**Agent**: NyX
**User**: user_123

---

**User** (10:30:05): How can I optimize this Python loop?

**NyX** (10:30:08): I'd be happy to help optimize your Python loop! Could you share the code?

**User** (10:31:00): Here's my code: for i in range(len(data)): process(data[i])

**NyX** (10:31:03): I can see a classic optimization opportunity! Instead of using range(len(data)), you can iterate directly...
```

### Import Conversation

```http
POST /api/chat/import
```

Import a previously exported conversation.

**Request Body:**
```json
{
  "format": "json",
  "data": "... exported conversation data ...",
  "agentId": "nyx",
  "userId": "user_123"
}
```

## Real-time Chat

For real-time chat functionality, use the WebSocket API:

```javascript
// Connect to WebSocket
const ws = new WebSocket('ws://localhost:8080/ws');

// Join conversation
ws.send(JSON.stringify({
  type: 'chat.join',
  conversationId: 'conv_1705312345_abc123'
}));

// Send message
ws.send(JSON.stringify({
  type: 'chat.message',
  conversationId: 'conv_1705312345_abc123',
  content: 'How do I optimize this loop?'
}));

// Receive messages
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'chat.message') {
    console.log(`${data.role}: ${data.content}`);
  }
};
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "error": {
    "code": "CONVERSATION_NOT_FOUND",
    "message": "Conversation with ID 'conv_123' not found",
    "details": {
      "conversationId": "conv_123"
    }
  }
}
```

### Common Error Codes

- `CONVERSATION_NOT_FOUND` - Requested conversation doesn't exist
- `MESSAGE_NOT_FOUND` - Requested message doesn't exist
- `AGENT_NOT_AVAILABLE` - Agent is not available for chat
- `INVALID_MESSAGE_ROLE` - Invalid role specified (must be 'user' or 'assistant')
- `CONVERSATION_ARCHIVED` - Cannot send messages to archived conversation
- `RATE_LIMIT_EXCEEDED` - Too many messages sent
- `INVALID_EXPORT_FORMAT` - Unsupported export format

## Rate Limiting

Chat endpoints have specific rate limits:
- 60 messages per minute per conversation
- 200 conversations per hour per user
- 10 exports per hour per user

## Best Practices

1. **Conversation Lifecycle**: Archive old conversations instead of deleting
2. **Message Batching**: Use bulk endpoints for importing multiple messages
3. **Search Optimization**: Use specific filters to improve search performance
4. **Real-time vs REST**: Use WebSocket for active chats, REST for history
5. **Metadata Usage**: Store relevant context in metadata for better analytics