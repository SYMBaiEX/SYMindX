# Supabase Memory Provider

Enhanced Supabase-based memory provider with multi-tier memory architecture, vector embeddings, shared memory pools, and archival strategies.

## Features

- **Multi-tier Memory Architecture**
  - Working Memory (7±2 items with attention decay)
  - Episodic Memory (event-based with temporal context)
  - Semantic Memory (fact-based knowledge and concepts)
  - Procedural Memory (skill-based and how-to knowledge)

- **Vector Embeddings & Similarity Search**
  - Uses Supabase's pgvector extension
  - Semantic similarity search with configurable thresholds
  - Automatic embedding generation for new memories

- **Memory Consolidation**
  - Automatic promotion between tiers based on importance, frequency, or age
  - Background processes for consolidation and archival
  - Configurable consolidation rules per tier

- **Shared Memory Pools**
  - Multi-agent memory sharing
  - Permission-based access control
  - Real-time synchronization options

- **Archival Strategies**
  - Compression of old memories
  - Summarization using LLMs
  - Configurable retention policies

## Setup

### 1. Supabase Project Setup

Create a new Supabase project or use an existing one. You'll need:

- Project URL
- Anonymous API Key

### 2. Enable pgvector Extension

In your Supabase SQL editor, run:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 3. Configure the Provider

```typescript
const memoryProvider = createSupabaseMemoryProvider({
  url: process.env.SUPABASE_URL,
  anonKey: process.env.SUPABASE_ANON_KEY,
  schema: 'public',
  enableRealtime: true,
  consolidationInterval: 300000, // 5 minutes
  archivalInterval: 3600000, // 1 hour
  embeddingModel: 'text-embedding-3-small',
  tiers: [
    {
      type: MemoryTierType.WORKING,
      capacity: 7,
      decayRate: 0.1,
    },
    {
      type: MemoryTierType.EPISODIC,
      capacity: 1000,
      consolidationRules: [
        {
          fromTier: MemoryTierType.WORKING,
          toTier: MemoryTierType.EPISODIC,
          condition: 'importance',
          threshold: 0.7,
        },
      ],
    },
  ],
  archival: [
    {
      type: 'compression',
      triggerAge: 30, // days
      compressionLevel: 0.5,
    },
  ],
});
```

### 4. Database Schema

The provider will automatically create the following tables via migrations:

- `memories` - Main memory storage with vector embeddings
- `shared_memory_pools` - Configuration for shared memory pools
- `shared_memory_mappings` - Memory sharing mappings
- `supabase_migrations` - Migration tracking

## Usage

### Storing Memories

```typescript
// Store a memory with automatic embedding generation
await provider.store(agentId, {
  id: generateId(),
  type: MemoryType.EXPERIENCE,
  content: 'Met with the team to discuss project timeline',
  importance: 0.8,
  timestamp: new Date(),
  tags: ['meeting', 'project', 'team'],
  duration: MemoryDuration.LONG_TERM,
});

// Store in a specific tier
await provider.storeTier(agentId, memory, MemoryTierType.SEMANTIC);
```

### Retrieving Memories

```typescript
// Vector similarity search
const embedding = await provider.generateEmbedding('project timeline');
const similar = await provider.search(agentId, embedding, 10);

// Retrieve by tier
const workingMemories = await provider.retrieveTier(
  agentId,
  MemoryTierType.WORKING
);
const semanticMemories = await provider.retrieveTier(
  agentId,
  MemoryTierType.SEMANTIC
);

// Query-based retrieval
const recent = await provider.retrieve(agentId, 'recent', 10);
const important = await provider.retrieve(agentId, 'important', 10);
```

### Memory Consolidation

```typescript
// Manual consolidation
await provider.consolidateMemory(
  agentId,
  memoryId,
  MemoryTierType.EPISODIC,
  MemoryTierType.SEMANTIC
);

// Automatic consolidation runs based on configured interval
```

### Shared Memory

```typescript
// Create a shared memory pool
const poolId = 'team-knowledge';
await provider.shareMemories(agentId, [memoryId1, memoryId2], poolId);

// Other agents can access shared memories
const sharedMemories = await provider.retrieve(otherAgentId, poolId, 10);
```

## Real-time Updates

When `enableRealtime` is true, the provider emits events for memory updates:

```typescript
provider.on('memory_updated', (payload) => {
  console.log('Memory updated:', payload);
});
```

## Performance Considerations

1. **Vector Index**: The provider uses IVFFlat index for vector similarity search. For large datasets (>1M vectors), consider using pgvector's HNSW index.

2. **Batch Operations**: For bulk inserts, consider using Supabase's batch insert capabilities.

3. **Embedding Generation**: The default mock embedding generator should be replaced with a real embedding service (OpenAI, Cohere, etc.)

## Migrations

The provider uses a migration system to manage schema changes. Migrations are automatically run on initialization but can also be run manually:

```typescript
import { runMigrations } from './migrations.js';

const client = createClient(url, key);
await runMigrations(client);
```

## Troubleshooting

### pgvector Not Available

If you see warnings about pgvector not being available:

1. Ensure you have enabled the extension in Supabase
2. Check that your database plan supports extensions

### RPC Functions Not Found

The provider uses RPC functions for some operations. If these fail:

1. Check that migrations have run successfully
2. Verify your Supabase API key has sufficient permissions

### Vector Search Performance

If vector search is slow:

1. Ensure the vector index exists
2. Consider reducing the embedding dimension
3. Use appropriate match thresholds (0.7-0.8 typically work well)
