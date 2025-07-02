---
sidebar_position: 1
sidebar_label: "Memory Modules"
title: "Memory Modules"
description: "Advanced memory storage and retrieval systems with multi-tier architecture"
---

# Memory Modules

Memory modules provide sophisticated persistent storage and intelligent retrieval of agent experiences, knowledge, and interactions. They form the foundation of an agent's ability to learn, remember, build context over time, and collaborate through shared memory pools.

## Enhanced Memory Architecture

SYMindX features a revolutionary multi-tier memory system designed for scalability, intelligence, and collaboration:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       Enhanced Memory Provider Interface                     │
├─────────────────────────────────────────────────────────────────────────────┤
│ store() │ retrieve() │ search() │ consolidate() │ archive() │ shareMemories() │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
        ┌─────────────────────────────┴───────────────────────────────┐
        │                                                             │
┌───────▼────────┐  ┌─────────▼──────┐  ┌───────────▼────────┐  ┌───────▼────────┐
│     SQLite     │  │   PostgreSQL   │  │     Supabase      │  │      Neon      │
│  Enhanced      │  │  Auto-Deploy   │  │  Real-time &      │  │   Serverless   │
│  Multi-Tier    │  │  Multi-Tier    │  │  Multi-Tier       │  │   Multi-Tier   │
└────────────────┘  └────────────────┘  └───────────────────┘  └────────────────┘
        │                     │                     │                     │
┌───────▼────────┐  ┌─────────▼──────┐  ┌───────────▼────────┐  ┌───────▼────────┐
│ Vector Search  │  │ Connection     │  │ Real-time Sync     │  │ Pool Optimized │
│ Shared Pools   │  │ Pooling        │  │ Vector Search      │  │ Auto-Scale     │
│ Auto-Archive   │  │ pgvector       │  │ Shared Pools       │  │ Edge Deploy    │
└────────────────┘  └────────────────┘  └───────────────────┘  └────────────────┘
                                     │
                      ┌─────────────▼───────────────┐
                      │        In-Memory            │
                      │   Vector Search & Persist   │
                      │      Shared Pools           │
                      └─────────────────────────────┘
```

## Multi-Tier Memory System

SYMindX implements a sophisticated memory hierarchy that mirrors human cognitive architecture:

### Memory Tiers

```typescript
enum MemoryTierType {
  WORKING = 'working',       // Immediate, short-term active memories
  EPISODIC = 'episodic',     // Personal experiences and events
  SEMANTIC = 'semantic',     // Factual knowledge and concepts
  PROCEDURAL = 'procedural'  // Skills and procedures
}
```

### Automatic Memory Consolidation

- **Working → Episodic**: Recent experiences get consolidated based on importance
- **Episodic → Semantic**: Repeated patterns become general knowledge
- **Cross-Tier Integration**: Related memories across tiers are linked automatically

## Memory Types & Context

```typescript
enum MemoryType {
  EXPERIENCE = 'experience',      // Personal experiences
  KNOWLEDGE = 'knowledge',        // Learned facts
  INTERACTION = 'interaction',    // Social interactions
  GOAL = 'goal',                 // Goals and objectives
  CONTEXT = 'context',           // Environmental context
  OBSERVATION = 'observation',    // Sensory observations
  REFLECTION = 'reflection',      // Self-reflections
  SKILL = 'skill',               // Learned procedures
  RELATIONSHIP = 'relationship'   // Social connections
}

interface MemoryContext {
  location?: string
  participants?: string[]
  timeOfDay?: string
  mood?: string
  situation?: string
  relatedMemories?: string[]
}
```

## Advanced Memory Providers

### 🚀 Enhanced SQLite Provider

**Perfect for**: Local development, single-agent deployments, offline applications

```typescript
import { SQLiteMemoryProvider } from '@symindx/memory/providers'

const memory = new SQLiteMemoryProvider({
  dbPath: './data/agent_memory.db',
  createTables: true,
  // Multi-tier configuration
  consolidationInterval: 300000, // 5 minutes
  archivalInterval: 3600000,     // 1 hour
  
  // Shared memory support
  enableSharedPools: true,
  maxSharedPools: 10
})

// Advanced memory storage with tier and context
await memory.store(agent.id, {
  id: generateId(),
  type: MemoryType.EXPERIENCE,
  content: "Had a breakthrough conversation about consciousness",
  importance: 0.9,
  tier: MemoryTierType.EPISODIC,
  context: {
    participants: ['user', 'agent'],
    mood: 'curious',
    situation: 'deep_discussion'
  },
  embedding: await generateEmbedding(content)
})
```

### 🐘 Enhanced PostgreSQL Provider

**Perfect for**: Production deployments, multi-agent systems, enterprise applications

```typescript
import { PostgresMemoryProvider } from '@symindx/memory/providers'

const memory = new PostgresMemoryProvider({
  connectionString: process.env.DATABASE_URL,
  autoDeploySchema: true,        // Auto-creates schema and extensions
  maxConnections: 20,
  
  // Advanced features
  consolidationInterval: 600000,  // 10 minutes
  archivalInterval: 7200000,     // 2 hours
  
  // Vector search with pgvector
  enableVectorSearch: true,
  embeddingDimensions: 1536
})

// Tier-based consolidation
await memory.consolidateMemory(
  agent.id,
  memoryId,
  MemoryTierType.WORKING,
  MemoryTierType.EPISODIC
)

// Shared memory for agent collaboration
await memory.shareMemories(agent.id, memoryIds, 'research_team_pool')
```

### ☁️ Enhanced Supabase Provider

**Perfect for**: Cloud-native apps, real-time collaboration, instant deployment

```typescript
import { SupabaseMemoryProvider } from '@symindx/memory/providers'

const memory = new SupabaseMemoryProvider({
  url: process.env.SUPABASE_URL,
  anonKey: process.env.SUPABASE_ANON_KEY,
  
  // Real-time features
  enableRealtime: true,
  
  // Multi-tier & archival
  consolidationInterval: 900000,  // 15 minutes
  archivalInterval: 10800000     // 3 hours
})

// Real-time memory synchronization
memory.on('memory_updated', (payload) => {
  console.log('Memory updated in real-time:', payload)
})

// Advanced vector search with similarity
const similar = await memory.search(
  agent.id,
  queryEmbedding,
  { 
    limit: 10,
    tier: MemoryTierType.SEMANTIC,
    minSimilarity: 0.8
  }
)
```

### ⚡ Enhanced Neon Provider

**Perfect for**: Serverless deployments, edge computing, auto-scaling applications

```typescript
import { NeonMemoryProvider, createNeonConnectionString } from '@symindx/memory/providers'

const connectionString = createNeonConnectionString(
  process.env.NEON_ENDPOINT,
  process.env.NEON_DATABASE,
  process.env.NEON_USERNAME,
  process.env.NEON_PASSWORD
)

const memory = new NeonMemoryProvider({
  connectionString,
  autoDeploySchema: true,
  
  // Serverless optimizations
  maxConnections: 5,
  connectionTimeoutMillis: 3000,
  idleTimeoutMillis: 15000,
  
  // Multi-tier processing
  consolidationInterval: 1800000  // 30 minutes
})

// Health monitoring for serverless
const { healthy, latency } = await memory.healthCheck()
console.log(`Neon connection: ${healthy ? 'healthy' : 'unhealthy'}, latency: ${latency}ms`)
```

### 🧠 Enhanced In-Memory Provider

**Perfect for**: Testing, development, ephemeral agents, high-performance scenarios

```typescript
import { InMemoryProvider } from '@symindx/memory/providers'

const memory = new InMemoryProvider({
  maxMemoriesPerAgent: 10000,
  
  // Persistence options
  enablePersistence: true,
  persistencePath: './data/memories.json',
  autoSaveInterval: 30000,
  
  // Cleanup and optimization
  enableAutoCleanup: true,
  cleanupInterval: 300000
})

// Fast vector similarity search
const similar = await memory.search(agent.id, embedding, 10)

// Export/import for testing
const exportedMemories = await memory.exportMemories(agent.id)
await memory.importMemories(exportedMemories)
```

## Enhanced Memory Records

```typescript
interface EnhancedMemoryRecord extends MemoryRecord {
  id: string
  agentId: string
  type: MemoryType
  content: string
  
  // Multi-tier support
  tier: MemoryTierType
  context?: MemoryContext
  
  // Vector search
  embedding?: number[]
  concepts?: string[]        // Extracted concepts
  
  // Advanced metadata
  metadata: {
    source?: string
    confidence?: number
    emotions?: string[]
    participants?: string[]
    location?: string
    relatedMemories?: string[]
    consolidationScore?: number
    archivalCandidate?: boolean
    sharedInPools?: string[]
    [key: string]: any
  }
  
  // Core properties
  importance: number
  timestamp: Date
  tags: string[]
  duration: MemoryDuration
  expiresAt?: Date
  
  // Timestamps
  createdAt: Date
  updatedAt: Date
}
```

## Advanced Operations

### 🔄 Memory Consolidation

Automatic promotion of memories between tiers based on importance and patterns:

```typescript
// Manual consolidation
await memory.consolidateMemory(
  agent.id,
  memoryId,
  MemoryTierType.WORKING,
  MemoryTierType.SEMANTIC
)

// Retrieve tier-specific memories
const semanticMemories = await memory.retrieveTier(
  agent.id,
  MemoryTierType.SEMANTIC,
  limit: 20
)
```

### 🗄️ Intelligent Archival

Automatic compression and summarization of old memories:

```typescript
// Trigger archival process
await memory.archiveMemories(agent.id)

// Archive with custom strategy
await memory.archiveMemories(agent.id, {
  strategy: ArchivalStrategy.COMPRESS,
  retentionDays: 90,
  compressionRatio: 0.3
})
```

### 🤝 Shared Memory Pools

Enable agents to share memories for collaboration:

```typescript
// Create shared memory pool
const poolConfig: SharedMemoryConfig = {
  poolId: 'research_team',
  participants: ['agent1', 'agent2', 'agent3'],
  permissions: {
    read: MemoryPermission.ALL,
    write: MemoryPermission.PARTICIPANTS,
    delete: MemoryPermission.OWNER
  }
}

// Share memories with team
await memory.shareMemories(
  agent.id,
  ['memory1', 'memory2'],
  'research_team'
)

// Access shared memories
const sharedMemories = await memory.retrieveSharedMemories(
  'research_team',
  query: 'recent research findings'
)
```

### 🔍 Advanced Vector Search

```typescript
// Multi-tier vector search
const results = await memory.search(agent.id, embedding, {
  limit: 15,
  tiers: [MemoryTierType.SEMANTIC, MemoryTierType.EPISODIC],
  minSimilarity: 0.75,
  includeContext: true
})

// Search with filters
const filteredResults = await memory.search(agent.id, embedding, {
  limit: 10,
  filters: {
    type: MemoryType.KNOWLEDGE,
    importance: { min: 0.7 },
    tags: ['science', 'research'],
    dateRange: {
      start: new Date('2024-01-01'),
      end: new Date('2024-12-31')
    }
  }
})
```

## Memory Analytics & Insights

```typescript
// Comprehensive memory statistics
const stats = await memory.getAdvancedStats(agent.id)
console.log(stats)
// {
//   total: 15234,
//   byTier: {
//     working: 45,
//     episodic: 8234,
//     semantic: 5234,
//     procedural: 1721
//   },
//   byType: { ... },
//   consolidationRate: 0.23,
//   archivalEfficiency: 0.87,
//   sharedMemoryPools: 3
// }

// Memory health and performance
const health = await memory.healthCheck()
console.log(health)
// {
//   healthy: true,
//   latency: 23,
//   version: "2.0.0",
//   connectionPool: { active: 3, idle: 7 }
// }
```

## Provider Selection Guide

| Provider | Best For | Vector Search | Shared Memory | Auto-Deploy | Real-time |
|----------|----------|---------------|---------------|-------------|-----------|
| **SQLite** | Local development, offline apps | ✅ | ✅ | ✅ | ❌ |
| **PostgreSQL** | Production, enterprise | ✅ | ✅ | ✅ | ❌ |
| **Supabase** | Cloud-native, real-time | ✅ | ✅ | ✅ | ✅ |
| **Neon** | Serverless, edge | ✅ | ✅ | ✅ | ❌ |
| **In-Memory** | Testing, performance | ✅ | ✅ | N/A | ❌ |

## Configuration Examples

See individual provider documentation for detailed configuration examples:

- [SQLite Provider](./sqlite/) - Enhanced local storage
- [PostgreSQL Provider](./postgres/) - Production-ready SQL
- [Supabase Provider](./supabase/) - Cloud-native with real-time
- [Neon Provider](./neon/) - Serverless PostgreSQL
- [In-Memory Provider](./memory/) - Fast temporary storage

## Best Practices

### 1. **Tier Strategy**
- Use **Working** tier for immediate context
- Promote important experiences to **Episodic**
- Extract patterns into **Semantic** knowledge
- Store procedures in **Procedural** tier

### 2. **Shared Memory**
- Create pools for related agents
- Set appropriate permissions
- Monitor shared memory usage
- Regular cleanup of inactive pools

### 3. **Performance**
- Enable vector search for large datasets
- Use appropriate consolidation intervals
- Monitor archival efficiency
- Optimize connection pooling

### 4. **Production Deployment**
- Use PostgreSQL or Supabase for production
- Enable auto-deployment for easy setup
- Monitor memory health and performance
- Implement backup strategies
