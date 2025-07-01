# SYMindX Chat System Database Integration Guide

## Overview

This document describes the comprehensive database schema designed for the SYMindX chat system, replacing the current in-memory Map storage with persistent SQLite storage.

## Schema Design

### Core Tables

1. **conversations** - Stores chat sessions between users and agents
2. **messages** - Individual messages within conversations  
3. **participants** - All users and agents participating in conversations
4. **message_reactions** - User reactions to messages (future feature)
5. **conversation_tags** - Tags for organizing conversations
6. **message_attachments** - Metadata about attachments
7. **chat_sessions** - Active user sessions for presence tracking
8. **analytics_events** - Event tracking for analytics and monitoring

### Key Design Decisions

1. **Soft Deletes**: All primary tables support soft deletes for data retention and recovery
2. **JSON Fields**: Flexible metadata storage using JSON for extensibility
3. **Comprehensive Indexing**: Optimized for common query patterns
4. **Memory Integration**: Messages can reference and create memory records
5. **Multi-participant Support**: Conversations can have multiple participants
6. **Full-text Search**: SQLite FTS5 for message content search
7. **Analytics Built-in**: Event tracking for monitoring and insights
8. **Emotion & Thought Tracking**: Agent messages store emotion state and thought process

## Integration Points

### 1. API Extension (`src/extensions/api/index.ts`)

The current API extension uses an in-memory Map for chat history:

```typescript
private chatHistory: Map<string, Array<{...}>> = new Map()
```

**Integration Steps:**
1. Replace the Map with SQLite repository calls
2. Update `processChatMessage()` to persist messages
3. Modify chat history endpoints to query the database
4. Add WebSocket events for real-time updates

### 2. Memory System Integration

The schema integrates with the existing memory system through:

- `memory_references` - Messages can reference existing memories
- `created_memories` - New memories created from messages
- Memory IDs stored as JSON arrays for flexibility

**Example Integration:**
```typescript
// When processing a message
const memoryIds = await agent.memory.search(agentId, embedding, 5)
message.memoryReferences = memoryIds.map(m => m.id)

// Create memory from important messages
if (message.confidenceScore > 0.8) {
  const memoryId = await createMemoryFromMessage(message, agentId)
  message.createdMemories = [memoryId]
}
```

### 3. SQLite Provider Extension

Create a new chat repository alongside the existing memory provider:

```typescript
// src/modules/memory/providers/sqlite/chat-repository.ts
export class SQLiteChatRepository implements ChatRepository {
  constructor(private db: Database) {
    this.initializeSchema()
  }
  
  // Implement all repository methods
}
```

### 4. Runtime Integration

Update the runtime to initialize chat storage:

```typescript
// In runtime initialization
const chatDb = new Database(config.chatDbPath || './data/chat.db')
const chatRepo = new SQLiteChatRepository(chatDb)

// Register with extensions
apiExtension.setChatRepository(chatRepo)
```

### 5. WebSocket Real-time Updates

Enhance the WebSocket server to broadcast chat events:

```typescript
// When a message is created
this.enhancedWS.broadcast({
  type: 'message.created',
  data: message,
  conversationId: message.conversationId
})

// For typing indicators
this.enhancedWS.broadcast({
  type: 'user.typing',
  conversationId,
  userId,
  isTyping: true
})
```

## Migration Strategy

1. **Phase 1**: Implement repository without breaking changes
   - Create SQLite chat repository
   - Add database initialization
   - Keep in-memory Map as fallback

2. **Phase 2**: Dual-write approach
   - Write to both Map and SQLite
   - Read from Map (existing behavior)
   - Validate data consistency

3. **Phase 3**: Switch to SQLite
   - Read from SQLite
   - Remove Map storage
   - Add migration for existing conversations

## Performance Considerations

1. **Indexing Strategy**:
   - Primary indexes on foreign keys
   - Composite indexes for common queries
   - FTS5 for text search

2. **Query Optimization**:
   - Use prepared statements
   - Batch inserts for bulk operations
   - Connection pooling for concurrent access

3. **Caching Layer**:
   - Cache recent conversations in memory
   - Invalidate on updates
   - Use SQLite's built-in page cache

## Security Considerations

1. **SQL Injection Prevention**:
   - Use parameterized queries
   - Validate all inputs
   - Escape special characters

2. **Access Control**:
   - Validate user access to conversations
   - Check participant status
   - Implement rate limiting

3. **Data Privacy**:
   - Support message deletion
   - Implement data retention policies
   - Encrypt sensitive metadata

## Example Usage

```typescript
// Create a conversation
const conversation = await chatRepo.createConversation({
  agentId: agent.id,
  userId: 'user123',
  title: 'Technical Support',
  status: ConversationStatus.ACTIVE,
  metadata: { source: 'web' }
})

// Send a message
const message = await chatRepo.createMessage({
  conversationId: conversation.id,
  senderType: SenderType.USER,
  senderId: 'user123',
  content: 'How do I configure the agent?',
  messageType: MessageType.TEXT,
  status: MessageStatus.SENT
})

// Agent responds with emotion and thought tracking
const agentMessage = await chatRepo.createMessage({
  conversationId: conversation.id,
  senderType: SenderType.AGENT,
  senderId: agent.id,
  content: 'I can help you configure the agent...',
  messageType: MessageType.TEXT,
  emotionState: agent.emotion.current,
  thoughtProcess: thoughtResult.thoughts,
  confidenceScore: 0.95,
  memoryReferences: referencedMemoryIds,
  status: MessageStatus.SENT
})

// Search messages
const results = await chatRepo.searchMessages(
  conversation.id,
  'configure',
  10
)

// Get conversation stats
const stats = await chatRepo.getConversationStats(conversation.id)
```

## Benefits of This Design

1. **Persistence**: Chat history survives restarts
2. **Scalability**: Can handle millions of messages
3. **Queryability**: Rich querying capabilities
4. **Analytics**: Built-in metrics and insights
5. **Extensibility**: JSON fields allow future features
6. **Integration**: Seamless with existing memory system
7. **Real-time**: WebSocket support for live updates
8. **Search**: Full-text search capabilities

## Next Steps

1. Implement the SQLite chat repository
2. Update API extension to use the repository
3. Add WebSocket event broadcasting
4. Create migration utilities
5. Update the web UI to display chat history
6. Add chat analytics dashboard
7. Implement message search UI
8. Add conversation management features

This schema provides a solid foundation for a production-ready chat system that can scale with the SYMindX platform's growth.