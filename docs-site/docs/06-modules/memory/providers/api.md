# Memory Provider Plugins API

The Memory Provider API enables SYMindX agents to store, retrieve, and manage memories across different database backends with support for semantic search, chat persistence, and memory consolidation.

## Overview

Memory providers are pluggable storage backends that handle:
- Long-term memory persistence
- Semantic memory search with embeddings
- Chat conversation history
- Memory consolidation and optimization
- Cross-provider migration support

## Supported Providers

SYMindX includes four production-ready memory providers:

### 1. SQLite Provider
- **Use Case**: Local development, single-instance deployments
- **Features**: Zero configuration, file-based storage, full-text search
- **Limitations**: Single-node only, limited concurrent access

### 2. PostgreSQL Provider
- **Use Case**: Production deployments, multi-agent systems
- **Features**: Full ACID compliance, concurrent access, advanced indexing
- **Scalability**: Supports connection pooling, read replicas

### 3. Supabase Provider
- **Use Case**: Cloud-native deployments, serverless architectures
- **Features**: Built on PostgreSQL, real-time subscriptions, vector search
- **Benefits**: Managed infrastructure, automatic backups, edge functions

### 4. Neon Provider
- **Use Case**: Modern cloud applications, auto-scaling needs
- **Features**: Serverless PostgreSQL, branching, point-in-time recovery
- **Benefits**: Scale-to-zero, instant provisioning, cost-effective

## Memory Provider Interface

All memory providers implement the standard interface:

```typescript
interface MemoryProvider {
  // Provider metadata
  name: string;
  version: string;
  
  // Lifecycle methods
  init(): Promise<void>;
  close(): Promise<void>;
  
  // Core memory operations
  store(memory: MemoryInput): Promise<MemoryRecord>;
  retrieve(id: string): Promise<MemoryRecord | null>;
  search(query: string, options?: SearchOptions): Promise<MemoryRecord[]>;
  update(id: string, updates: Partial<MemoryInput>): Promise<MemoryRecord>;
  delete(id: string): Promise<boolean>;
  
  // Bulk operations
  bulkStore(memories: MemoryInput[]): Promise<MemoryRecord[]>;
  getMemories(filter?: MemoryFilter): Promise<MemoryRecord[]>;
  
  // Chat integration
  getChatRepository?(): ChatRepository;
  
  // Advanced features
  consolidate?(options?: ConsolidationOptions): Promise<ConsolidationResult>;
  export?(format: ExportFormat): Promise<Buffer>;
  import?(data: Buffer, format: ExportFormat): Promise<ImportResult>;
}
```

## Memory Types

### MemoryRecord Structure

```typescript
interface MemoryRecord {
  id: string;
  agentId: string;
  type: MemoryType;
  content: string;
  embedding?: number[];
  metadata?: Record<string, any>;
  importance: number;
  lastAccessed: Date;
  accessCount: number;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  tags?: string[];
  source?: string;
  relatedMemories?: string[];
}

enum MemoryType {
  CONVERSATION = 'conversation',
  EVENT = 'event',
  KNOWLEDGE = 'knowledge',
  SKILL = 'skill',
  RELATIONSHIP = 'relationship',
  EMOTION = 'emotion',
  GOAL = 'goal',
  REFLECTION = 'reflection'
}
```

## Configuration

### SQLite Configuration

```typescript
const sqliteConfig = {
  type: 'sqlite',
  config: {
    filename: './data/memories.db',
    options: {
      verbose: console.log, // Optional: SQL query logging
      wal: true,           // Write-Ahead Logging for better concurrency
      synchronous: 'NORMAL' // Balance between safety and speed
    }
  }
};

const provider = createMemoryProvider('sqlite', sqliteConfig);
```

### PostgreSQL Configuration

```typescript
const postgresConfig = {
  type: 'postgres',
  config: {
    connectionString: 'postgresql://user:pass@localhost:5432/symindx',
    // OR individual options:
    host: 'localhost',
    port: 5432,
    database: 'symindx',
    user: 'symindx_user',
    password: 'secure_password',
    ssl: {
      rejectUnauthorized: false
    },
    poolSize: 20,
    idleTimeoutMillis: 30000
  }
};

const provider = createMemoryProvider('postgres', postgresConfig);
```

### Supabase Configuration

```typescript
const supabaseConfig = {
  type: 'supabase',
  config: {
    url: 'https://your-project.supabase.co',
    anonKey: 'your-anon-key',
    options: {
      auth: {
        autoRefreshToken: true,
        persistSession: true
      },
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    }
  }
};

const provider = createMemoryProvider('supabase', supabaseConfig);
```

### Neon Configuration

```typescript
const neonConfig = {
  type: 'neon',
  config: {
    connectionString: 'postgresql://user:pass@your-neon-project.neon.tech/symindx',
    options: {
      ssl: 'require',
      connectionTimeoutMillis: 5000,
      query_timeout: 30000,
      idle_in_transaction_session_timeout: 60000
    }
  }
};

const provider = createMemoryProvider('neon', neonConfig);
```

## Usage Examples

### Basic Memory Operations

```typescript
// Initialize provider
await provider.init();

// Store a memory
const memory = await provider.store({
  agentId: 'nyx',
  type: MemoryType.CONVERSATION,
  content: 'User mentioned they prefer Python for data analysis',
  metadata: {
    userId: 'user_123',
    topic: 'programming_preferences',
    sentiment: 'positive'
  },
  importance: 0.8,
  tags: ['python', 'data_analysis', 'preferences']
});

// Retrieve a specific memory
const retrieved = await provider.retrieve(memory.id);

// Search memories semantically
const results = await provider.search('programming language preferences', {
  limit: 10,
  threshold: 0.7,
  filter: {
    agentId: 'nyx',
    type: MemoryType.CONVERSATION
  }
});

// Update memory importance
await provider.update(memory.id, {
  importance: 0.9,
  metadata: {
    ...memory.metadata,
    confirmed: true
  }
});
```

### Advanced Search Options

```typescript
interface SearchOptions {
  limit?: number;              // Max results (default: 10)
  threshold?: number;          // Similarity threshold 0-1 (default: 0.7)
  filter?: MemoryFilter;       // Additional filters
  includeEmbedding?: boolean;  // Include embeddings in results
  sortBy?: 'relevance' | 'recency' | 'importance';
  timeRange?: {
    start?: Date;
    end?: Date;
  };
}

// Complex search example
const memories = await provider.search('optimization techniques', {
  limit: 20,
  threshold: 0.75,
  filter: {
    agentId: 'nyx',
    type: [MemoryType.KNOWLEDGE, MemoryType.CONVERSATION],
    tags: ['programming', 'performance'],
    importance: { $gte: 0.6 }
  },
  sortBy: 'relevance',
  timeRange: {
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
  }
});
```

### Memory Filters

```typescript
interface MemoryFilter {
  agentId?: string | string[];
  type?: MemoryType | MemoryType[];
  tags?: string[];
  source?: string;
  importance?: number | { $gte?: number; $lte?: number };
  timeRange?: {
    start?: Date;
    end?: Date;
  };
  metadata?: Record<string, any>;
}

// Get all high-importance memories
const importantMemories = await provider.getMemories({
  importance: { $gte: 0.8 },
  type: [MemoryType.KNOWLEDGE, MemoryType.GOAL]
});
```

## Chat Integration

Memory providers include integrated chat repositories for conversation persistence:

```typescript
const chatRepo = provider.getChatRepository();

// Create a conversation
const conversation = await chatRepo.createConversation({
  agentId: 'nyx',
  userId: 'user_123',
  metadata: {
    platform: 'web',
    initialTopic: 'code optimization'
  }
});

// Add a message
const message = await chatRepo.addMessage({
  conversationId: conversation.id,
  role: 'assistant',
  content: 'I can help you optimize your code! What language are you using?',
  metadata: {
    emotion: 'helpful',
    confidence: 0.9
  }
});

// Get conversation with messages
const fullConversation = await chatRepo.getConversation(conversation.id);

// Search conversations
const conversations = await chatRepo.searchConversations({
  userId: 'user_123',
  query: 'optimization',
  limit: 10
});
```

### Chat Repository Interface

```typescript
interface ChatRepository {
  // Conversation management
  createConversation(data: ConversationInput): Promise<Conversation>;
  getConversation(id: string): Promise<Conversation | null>;
  updateConversation(id: string, updates: Partial<ConversationInput>): Promise<Conversation>;
  deleteConversation(id: string): Promise<boolean>;
  
  // Message management
  addMessage(message: MessageInput): Promise<Message>;
  getMessages(conversationId: string, options?: MessageOptions): Promise<Message[]>;
  updateMessage(id: string, updates: Partial<MessageInput>): Promise<Message>;
  deleteMessage(id: string): Promise<boolean>;
  
  // Search and analytics
  searchConversations(criteria: SearchCriteria): Promise<Conversation[]>;
  getConversationStats(conversationId: string): Promise<ConversationStats>;
  getUserConversations(userId: string, options?: PaginationOptions): Promise<Conversation[]>;
  
  // Bulk operations
  exportConversation(id: string, format: 'json' | 'markdown'): Promise<string>;
  importConversation(data: string, format: 'json' | 'markdown'): Promise<Conversation>;
}
```

## Memory Consolidation

Advanced memory management features for optimization:

```typescript
// Consolidate memories to reduce storage and improve retrieval
const consolidationResult = await provider.consolidate({
  strategy: 'semantic_clustering',
  options: {
    minSimilarity: 0.85,
    preserveImportant: true,
    importanceThreshold: 0.7,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    targetReduction: 0.5 // Aim for 50% reduction
  }
});

console.log(`Consolidated ${consolidationResult.originalCount} memories into ${consolidationResult.consolidatedCount}`);
console.log(`Space saved: ${consolidationResult.spaceSaved} bytes`);
```

### Consolidation Strategies

1. **Semantic Clustering**: Groups similar memories and creates summaries
2. **Temporal Compression**: Combines memories from the same time period
3. **Importance-Based**: Preserves high-importance memories, summarizes others
4. **Topic Modeling**: Groups memories by detected topics

## Provider Migration

Migrate data between providers:

```typescript
// Export from SQLite
const sqliteProvider = createMemoryProvider('sqlite', sqliteConfig);
const exportData = await sqliteProvider.export('json');

// Import to PostgreSQL
const postgresProvider = createMemoryProvider('postgres', postgresConfig);
await postgresProvider.import(exportData, 'json');

// Verify migration
const sqliteCount = await sqliteProvider.getMemories().then(m => m.length);
const postgresCount = await postgresProvider.getMemories().then(m => m.length);
console.log(`Migrated ${sqliteCount} memories (verified: ${postgresCount})`);
```

## Performance Optimization

### Indexing Strategies

Each provider implements optimized indexing:

```sql
-- PostgreSQL/Supabase/Neon indexes
CREATE INDEX idx_memories_agent_type ON memories(agent_id, type);
CREATE INDEX idx_memories_importance ON memories(importance DESC);
CREATE INDEX idx_memories_embeddings ON memories USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_memories_search ON memories USING gin(to_tsvector('english', content));
```

### Connection Pooling

```typescript
// PostgreSQL connection pool configuration
const poolConfig = {
  max: 20,                  // Maximum pool size
  idleTimeoutMillis: 30000, // Close idle clients after 30s
  connectionTimeoutMillis: 2000, // Timeout for new connections
  maxUses: 7500,           // Close connections after 7500 uses
  allowExitOnIdle: true    // Allow process to exit if pool is idle
};
```

### Batch Operations

```typescript
// Efficient bulk storage
const memories = Array.from({ length: 1000 }, (_, i) => ({
  agentId: 'nyx',
  type: MemoryType.EVENT,
  content: `Event ${i}: System activity logged`,
  importance: Math.random()
}));

// Store in batches
const batchSize = 100;
for (let i = 0; i < memories.length; i += batchSize) {
  const batch = memories.slice(i, i + batchSize);
  await provider.bulkStore(batch);
}
```

## Best Practices

### 1. Provider Selection

Choose based on your deployment needs:
- **Development**: SQLite for simplicity
- **Small-scale production**: PostgreSQL self-hosted
- **Cloud-native**: Supabase for managed infrastructure
- **Auto-scaling**: Neon for serverless deployments

### 2. Memory Lifecycle

```typescript
// Set expiration for temporary memories
await provider.store({
  agentId: 'nyx',
  type: MemoryType.EVENT,
  content: 'Temporary session data',
  importance: 0.3,
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // Expires in 24 hours
});

// Regular cleanup
setInterval(async () => {
  await provider.consolidate({
    strategy: 'importance_based',
    options: {
      importanceThreshold: 0.5,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    }
  });
}, 24 * 60 * 60 * 1000); // Daily
```

### 3. Error Handling

```typescript
try {
  await provider.store(memory);
} catch (error) {
  if (error.code === 'DUPLICATE_MEMORY') {
    // Handle duplicate
    const existing = await provider.search(memory.content, { limit: 1 });
    await provider.update(existing[0].id, { 
      importance: Math.max(existing[0].importance, memory.importance) 
    });
  } else if (error.code === 'CONNECTION_ERROR') {
    // Retry with exponential backoff
    await retryWithBackoff(() => provider.store(memory));
  } else {
    throw error;
  }
}
```

### 4. Security Considerations

- Always use environment variables for credentials
- Enable SSL/TLS for remote connections
- Implement row-level security for multi-tenant systems
- Regularly backup memory data
- Sanitize user input before storage

## Troubleshooting

### Common Issues

1. **Embedding dimension mismatch**
   - Ensure all embeddings use the same dimension (default: 1536)
   - Check your embedding model configuration

2. **Slow semantic search**
   - Create appropriate vector indexes
   - Consider using approximate search methods
   - Reduce search scope with filters

3. **Memory growth**
   - Implement regular consolidation
   - Set appropriate expiration times
   - Monitor importance scores

4. **Connection pool exhaustion**
   - Increase pool size for high-concurrency
   - Implement connection retry logic
   - Use read replicas for search operations

