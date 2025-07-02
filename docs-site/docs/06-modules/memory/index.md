---
sidebar_position: 1
sidebar_label: "Memory Modules"
title: "Memory Modules"
description: "Memory storage and retrieval systems"
---

# Memory Modules

Memory modules provide persistent storage and intelligent retrieval of agent experiences, knowledge, and interactions. They form the foundation of an agent's ability to learn, remember, and build context over time.

## Memory Architecture

The memory system in SYMindX is designed for flexibility and scalability:

```
┌─────────────────────────────────────────────────────────┐
│                   Memory Provider Interface              │
├─────────────────────────────────────────────────────────┤
│  store()    │  retrieve()  │  search()   │  delete()    │
└─────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┴───────────────────────┐
        │                                             │
┌───────▼────────┐  ┌─────────▼──────┐  ┌───────────▼────────┐
│     SQLite     │  │   PostgreSQL   │  │     Supabase      │
│  Local Storage │  │   Relational   │  │  Vector Search    │
└────────────────┘  └────────────────┘  └───────────────────┘
        │                                             │
┌───────▼────────┐                      ┌────────────▼────────┐
│      Neon      │                      │    In-Memory        │
│   Serverless   │                      │  Fast Temporary     │
└────────────────┘                      └─────────────────────┘
```

## Memory Types

SYMindX supports different categories of memories:

```typescript
enum MemoryType {
  EXPERIENCE = 'experience',      // Personal experiences
  KNOWLEDGE = 'knowledge',        // Learned facts
  INTERACTION = 'interaction',    // Social interactions
  GOAL = 'goal',                 // Goals and objectives
  CONTEXT = 'context',           // Environmental context
  OBSERVATION = 'observation',    // Sensory observations
  REFLECTION = 'reflection'       // Self-reflections
}
```

## Memory Providers

### SQLite Provider

Local file-based storage ideal for single-agent deployments:

```typescript
const memory = createMemoryProvider('sqlite', {
  dbPath: './data/agent_memory.db',
  maxRecords: 50000,
  retentionDays: 90
})

// Usage example
await memory.store(agent.id, {
  id: generateId(),
  agentId: agent.id,
  type: MemoryType.EXPERIENCE,
  content: "Had a meaningful conversation about consciousness",
  importance: 0.8,
  timestamp: new Date(),
  tags: ['conversation', 'philosophy'],
  duration: MemoryDuration.LONG_TERM
})
```

### PostgreSQL Provider

Scalable relational database for multi-agent systems:

```typescript
const memory = createMemoryProvider('postgres', {
  connectionString: process.env.DATABASE_URL,
  maxConnections: 20,
  enableVectorSearch: true,
  embeddingDimensions: 1536
})

// Batch operations for efficiency
await memory.storeBatch(agent.id, memories)
```

### Supabase Provider

Cloud-native solution with built-in vector search:

```typescript
const memory = createMemoryProvider('supabase_pgvector', {
  projectUrl: process.env.SUPABASE_URL,
  anonKey: process.env.SUPABASE_ANON_KEY,
  embeddingModel: 'text-embedding-ada-002',
  similarityThreshold: 0.8
})

// Vector similarity search
const similar = await memory.search(
  agent.id,
  queryEmbedding,
  limit: 10
)
```

### Neon Provider

Serverless PostgreSQL for modern deployments:

```typescript
const memory = createMemoryProvider('neon', {
  databaseUrl: process.env.NEON_DATABASE_URL,
  poolConfig: {
    min: 2,
    max: 10
  }
})
```

### In-Memory Provider

Fast temporary storage for testing or ephemeral agents:

```typescript
const memory = createMemoryProvider('memory', {
  maxRecords: 1000,
  ttl: 3600 // seconds
})
```

## Memory Records

Each memory has a structured format:

```typescript
interface MemoryRecord {
  id: string
  agentId: string
  type: MemoryType
  content: string
  embedding?: number[]      // Vector representation
  metadata: {
    source?: string
    confidence?: number
    emotions?: string[]
    participants?: string[]
    location?: string
    [key: string]: any
  }
  importance: number        // 0-1 scale
  timestamp: Date
  tags: string[]
  duration: MemoryDuration
  expiresAt?: Date         // For temporary memories
}
```

## Memory Operations

### Storing Memories

```typescript
// Store a single memory
await memory.store(agent.id, {
  type: MemoryType.INTERACTION,
  content: "User asked about my favorite color",
  importance: 0.6,
  tags: ['personal', 'preferences'],
  metadata: {
    user: 'user123',
    sentiment: 'curious'
  }
})

// Store with auto-generated embedding
await memory.storeWithEmbedding(agent.id, {
  content: "Learned that mixing blue and yellow makes green",
  type: MemoryType.KNOWLEDGE
})
```

### Retrieving Memories

```typescript
// Text-based retrieval
const memories = await memory.retrieve(
  agent.id,
  "previous conversations about colors",
  limit: 5
)

// Retrieve by type
const knowledge = await memory.retrieveByType(
  agent.id,
  MemoryType.KNOWLEDGE,
  limit: 10
)

// Retrieve recent memories
const recent = await memory.getRecent(agent.id, {
  limit: 20,
  since: new Date(Date.now() - 3600000) // last hour
})
```

### Searching Memories

```typescript
// Vector similarity search
const embedding = await generateEmbedding("favorite activities")
const similar = await memory.search(agent.id, embedding, {
  limit: 10,
  threshold: 0.7
})

// Advanced search with filters
const filtered = await memory.advancedSearch(agent.id, {
  query: "learning experiences",
  filters: {
    type: MemoryType.EXPERIENCE,
    importance: { gte: 0.7 },
    tags: { contains: 'education' }
  },
  limit: 15
})
```

## Memory Management

### Importance Scoring

Memories are scored based on various factors:

```typescript
function calculateImportance(memory: MemoryRecord): number {
  let score = 0.5 // base score
  
  // Emotional intensity
  if (memory.metadata.emotionIntensity > 0.7) score += 0.2
  
  // Recency
  const age = Date.now() - memory.timestamp.getTime()
  if (age < 3600000) score += 0.1 // last hour
  
  // Relevance to goals
  if (memory.type === MemoryType.GOAL) score += 0.15
  
  // Social significance
  if (memory.metadata.participants?.length > 1) score += 0.1
  
  return Math.min(score, 1.0)
}
```

### Memory Consolidation

Long-term memory formation:

```typescript
// Consolidate short-term to long-term
async function consolidateMemories(agent: Agent) {
  const shortTerm = await memory.getByDuration(
    agent.id,
    MemoryDuration.SHORT_TERM
  )
  
  for (const mem of shortTerm) {
    if (mem.importance > 0.7) {
      // Promote to long-term
      mem.duration = MemoryDuration.LONG_TERM
      await memory.update(agent.id, mem)
    }
  }
}
```

### Memory Pruning

Manage memory capacity:

```typescript
// Remove old, unimportant memories
async function pruneMemories(agent: Agent) {
  const stats = await memory.getStats(agent.id)
  
  if (stats.totalRecords > config.maxRecords) {
    await memory.pruneOldMemories(agent.id, {
      keepImportant: true,
      importanceThreshold: 0.6,
      maxAge: 90 * 24 * 3600000 // 90 days
    })
  }
}
```

## Integration Patterns

### With Cognition Module

```typescript
// Cognition module uses memories for context
const relevantMemories = await memory.retrieve(
  agent.id,
  context.currentSituation,
  limit: 10
)

const decision = await cognition.decide(agent, {
  options: availableActions,
  memories: relevantMemories,
  goals: agent.activeGoals
})
```

### With Emotion Module

```typescript
// Emotional memories influence current state
emotion.on('significantEvent', async (event) => {
  await memory.store(agent.id, {
    type: MemoryType.EXPERIENCE,
    content: event.description,
    metadata: {
      emotion: event.emotion,
      intensity: event.intensity
    },
    importance: event.intensity
  })
})
```

## Advanced Features

### Episodic Memory Chains

Link related memories:

```typescript
// Create episodic sequence
const episode = await memory.createEpisode(agent.id, {
  title: "First day at work",
  memories: [memory1, memory2, memory3],
  summary: "Nervous but excited start"
})
```

### Memory Networks

Build knowledge graphs:

```typescript
// Connect related memories
await memory.linkMemories(agent.id, {
  source: memoryA.id,
  target: memoryB.id,
  relationship: 'causes',
  strength: 0.8
})
```

### Collective Memory

Shared memories between agents:

```typescript
// Store shared memory
await memory.storeShared({
  agentIds: [agent1.id, agent2.id],
  type: MemoryType.INTERACTION,
  content: "Collaborated on solving a puzzle",
  shared: true
})
```

## Performance Optimization

### Indexing Strategies

```typescript
// Create indexes for common queries
await memory.createIndex('agent_type_timestamp')
await memory.createIndex('tags_gin') // PostgreSQL GIN index
await memory.createIndex('embedding_vector') // Vector index
```

### Caching Layer

```typescript
const cachedMemory = withCache(memory, {
  ttl: 300, // 5 minutes
  maxSize: 1000
})
```

### Batch Operations

```typescript
// Batch store for efficiency
const memories = events.map(event => ({
  type: MemoryType.OBSERVATION,
  content: event.description,
  timestamp: event.timestamp
}))

await memory.storeBatch(agent.id, memories)
```

## Configuration Examples

### Minimal Configuration

```json
{
  "memory": {
    "provider": "sqlite",
    "maxRecords": 10000
  }
}
```

### Advanced Configuration

```json
{
  "memory": {
    "provider": "supabase_pgvector",
    "maxRecords": 100000,
    "embeddingModel": "text-embedding-3-small",
    "retentionDays": 365,
    "config": {
      "vectorDimensions": 1536,
      "similarityFunction": "cosine",
      "indexType": "ivfflat",
      "lists": 100
    }
  }
}
```

## Next Steps

- [Emotion Modules](/docs/modules/emotion) - Emotional processing systems
- [Cognition Modules](/docs/modules/cognition) - Decision-making and planning
- [Memory Patterns](/docs/guides/memory-patterns) - Advanced memory techniques
