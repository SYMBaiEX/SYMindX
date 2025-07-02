---
sidebar_position: 1
title: "SQLite Memory Provider"
description: "Enhanced local storage with multi-tier memory, vector search, and shared pools"
---

# SQLite Memory Provider

The enhanced SQLite memory provider offers a powerful local storage solution with advanced features including multi-tier memory architecture, vector similarity search, shared memory pools, and automatic archival strategies.

## 🚀 Key Features

- **Multi-Tier Memory Architecture** - Working, Episodic, Semantic, and Procedural memory tiers
- **Vector Similarity Search** - Fast local vector search without external dependencies
- **Shared Memory Pools** - Enable agent collaboration through shared memory spaces
- **Automatic Consolidation** - Intelligent promotion of memories between tiers
- **Auto-Archival** - Compression and summarization of old memories
- **Persistence Options** - Reliable file-based storage with backup capabilities
- **Performance Optimized** - Efficient indexing and query optimization

## Installation & Setup

```bash
# Install the SQLite provider
npm install better-sqlite3
# Provider is included in @symindx/memory
```

## Basic Configuration

```typescript
import { SQLiteMemoryProvider } from '@symindx/memory/providers'

const memory = new SQLiteMemoryProvider({
  // Database file path
  dbPath: './data/agent_memory.db',
  
  // Auto-create tables and indexes
  createTables: true,
  
  // Multi-tier processing intervals
  consolidationInterval: 300000,  // 5 minutes
  archivalInterval: 3600000      // 1 hour
})
```

## Advanced Configuration

```typescript
const advancedMemory = new SQLiteMemoryProvider({
  dbPath: './data/enhanced_memory.db',
  createTables: true,
  
  // Multi-tier configuration
  consolidationInterval: 180000,  // 3 minutes - faster consolidation
  archivalInterval: 1800000,     // 30 minutes - frequent archival
  
  // Shared memory pools
  enableSharedPools: true,
  maxSharedPools: 20,
  
  // Performance tuning
  maxMemoriesPerAgent: 50000,
  vectorSearchOptimization: true,
  
  // Backup and recovery
  enableBackups: true,
  backupInterval: 3600000,       // 1 hour
  backupRetention: 7,            // Keep 7 backups
  
  // Cleanup policies
  enableAutoCleanup: true,
  cleanupInterval: 600000,       // 10 minutes
  maxDatabaseSize: '2GB'
})
```

## Multi-Tier Memory Operations

### Memory Consolidation

```typescript
// Manual tier consolidation
await memory.consolidateMemory(
  agentId,
  memoryId,
  MemoryTierType.WORKING,      // From working memory
  MemoryTierType.EPISODIC      // To episodic memory
)

// Bulk consolidation based on importance
const consolidationRules = {
  workingToEpisodic: {
    importanceThreshold: 0.7,
    timeThreshold: 300000,  // 5 minutes
    maxMemories: 100
  },
  episodicToSemantic: {
    importanceThreshold: 0.8,
    repetitionThreshold: 3,    // Seen 3+ times
    conceptExtraction: true
  }
}

await memory.runConsolidation(agentId, consolidationRules)
```

### Tier-Specific Retrieval

```typescript
// Retrieve working memory (immediate context)
const workingMemories = await memory.retrieveTier(
  agentId,
  MemoryTierType.WORKING,
  { limit: 20, recency: true }
)

// Retrieve semantic knowledge
const knowledge = await memory.retrieveTier(
  agentId,
  MemoryTierType.SEMANTIC,
  { 
    limit: 50,
    importance: { min: 0.6 },
    concepts: ['learning', 'problem-solving']
  }
)

// Retrieve procedural memories (skills)
const skills = await memory.retrieveTier(
  agentId,
  MemoryTierType.PROCEDURAL,
  { 
    limit: 10,
    tags: ['skill', 'procedure'],
    recencyWeight: 0.3
  }
)
```

## Vector Search Capabilities

### Basic Vector Search

```typescript
// Generate embedding for query
const queryEmbedding = await generateEmbedding("problem solving strategies")

// Perform similarity search
const similarMemories = await memory.search(agentId, queryEmbedding, {
  limit: 15,
  minSimilarity: 0.75,
  tiers: [MemoryTierType.SEMANTIC, MemoryTierType.EPISODIC]
})

console.log('Found similar memories:', similarMemories.length)
```

### Advanced Vector Search

```typescript
// Multi-criteria vector search
const complexResults = await memory.search(agentId, queryEmbedding, {
  limit: 20,
  minSimilarity: 0.7,
  
  // Tier weights
  tierWeights: {
    [MemoryTierType.SEMANTIC]: 0.4,
    [MemoryTierType.EPISODIC]: 0.3,
    [MemoryTierType.PROCEDURAL]: 0.2,
    [MemoryTierType.WORKING]: 0.1
  },
  
  // Content filters
  filters: {
    type: [MemoryType.KNOWLEDGE, MemoryType.EXPERIENCE],
    importance: { min: 0.6, max: 1.0 },
    tags: { include: ['learning'], exclude: ['temporary'] },
    dateRange: {
      start: new Date('2024-01-01'),
      end: new Date('2024-12-31')
    }
  },
  
  // Result enhancement
  includeContext: true,
  includeConcepts: true,
  sortBy: 'relevance'  // or 'importance', 'recency'
})
```

## Shared Memory Pools

### Creating Shared Pools

```typescript
// Create a research team memory pool
const poolConfig: SharedMemoryConfig = {
  poolId: 'research_team_alpha',
  name: 'Research Team Alpha',
  description: 'Shared knowledge for AI research team',
  
  // Access control
  participants: ['agent1', 'agent2', 'agent3'],
  permissions: {
    read: MemoryPermission.ALL,          // Anyone can read
    write: MemoryPermission.PARTICIPANTS, // Only participants can write
    delete: MemoryPermission.OWNER,      // Only creator can delete
    modify: MemoryPermission.PARTICIPANTS
  },
  
  // Pool policies
  maxMemories: 5000,
  retentionPolicy: {
    duration: 7776000000,  // 90 days
    archiveOnExpiry: true
  },
  
  // Sync settings
  enableRealTimeSync: false,  // SQLite doesn't support real-time
  conflictResolution: 'latest_wins'
}

await memory.createSharedPool(poolConfig)
```

### Sharing Memories

```typescript
// Share important discoveries with the team
const importantMemories = await memory.retrieve(
  agentId,
  'breakthrough research findings',
  { 
    limit: 10,
    importance: { min: 0.8 },
    type: MemoryType.KNOWLEDGE
  }
)

const memoryIds = importantMemories.map(m => m.id)

await memory.shareMemories(
  agentId,
  memoryIds,
  'research_team_alpha',
  {
    shareLevel: MemoryPermission.READ_WRITE,
    notification: 'Shared important research findings',
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  }
)
```

### Accessing Shared Memories

```typescript
// Retrieve shared memories from pool
const sharedFindings = await memory.retrieveSharedMemories(
  'research_team_alpha',
  'recent AI breakthroughs',
  {
    limit: 20,
    sharedBy: ['agent2', 'agent3'],  // Specific contributors
    timeRange: {
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)  // Last 7 days
    }
  }
)

// Get pool statistics
const poolStats = await memory.getSharedPoolStats('research_team_alpha')
console.log('Pool stats:', poolStats)
// {
//   totalMemories: 1234,
//   contributors: 3,
//   lastActivity: Date,
//   topConcepts: ['machine learning', 'neural networks'],
//   memoryTypes: { knowledge: 800, experience: 300, observation: 134 }
// }
```

## Archival & Compression

### Automatic Archival

```typescript
// Configure archival strategies
const archivalConfig = {
  strategies: [
    {
      name: 'compress_old_episodic',
      type: ArchivalStrategy.COMPRESS,
      criteria: {
        tier: MemoryTierType.EPISODIC,
        age: 30 * 24 * 60 * 60 * 1000,    // 30 days
        importance: { max: 0.6 }
      },
      compressionRatio: 0.4,  // Keep 40% of original detail
      preserveKeywords: true
    },
    {
      name: 'summarize_working_memory',
      type: ArchivalStrategy.SUMMARIZE,
      criteria: {
        tier: MemoryTierType.WORKING,
        count: { min: 1000 }  // When working memory exceeds 1000 items
      },
      summaryLength: 200,     // Max summary length
      preserveImportant: true
    }
  ]
}

await memory.configureArchival(agentId, archivalConfig)

// Manual archival trigger
await memory.archiveMemories(agentId, {
  strategy: ArchivalStrategy.COMPRESS,
  retentionDays: 60,
  compressionRatio: 0.3,
  dryRun: false  // Set true to preview changes
})
```

### Archival Recovery

```typescript
// Recover archived memories
const archivedMemories = await memory.retrieveArchived(agentId, {
  dateRange: {
    start: new Date('2024-01-01'),
    end: new Date('2024-06-01')
  },
  decompress: true,  // Reconstruct compressed memories
  limit: 100
})

// Restore specific archived memories
await memory.restoreFromArchive(agentId, ['archived_memory_1', 'archived_memory_2'])
```

## Performance Optimization

### Database Tuning

```typescript
// Performance-optimized configuration
const performanceMemory = new SQLiteMemoryProvider({
  dbPath: './data/performance_memory.db',
  createTables: true,
  
  // SQLite optimizations
  sqliteOptions: {
    pragma: {
      journal_mode: 'WAL',           // Write-Ahead Logging
      synchronous: 'NORMAL',         // Balance safety/speed
      cache_size: -64000,            // 64MB cache
      temp_store: 'MEMORY',          // In-memory temp tables
      mmap_size: 268435456,          // 256MB memory map
      optimize: true                 // Auto-optimize
    }
  },
  
  // Indexing strategy
  indexStrategy: {
    vectorIndexType: 'HNSW',         // Hierarchical NSW for vectors
    textIndexType: 'FTS5',           // Full-text search
    timeseriesOptimization: true,
    customIndexes: [
      'CREATE INDEX idx_memory_composite ON memories(agent_id, tier, importance DESC, timestamp DESC)',
      'CREATE INDEX idx_memory_embedding ON memories(embedding) WHERE embedding IS NOT NULL'
    ]
  },
  
  // Query optimization
  queryOptimization: {
    enableQueryPlanner: true,
    cacheCompiledStatements: true,
    batchSize: 1000,
    parallelQueries: true
  }
})
```

### Batch Operations

```typescript
// Efficient batch storage
const memories = events.map(event => ({
  id: generateId(),
  type: MemoryType.OBSERVATION,
  content: event.description,
  tier: MemoryTierType.WORKING,
  importance: calculateImportance(event),
  embedding: event.embedding,
  timestamp: event.timestamp
}))

// Batch insert with transaction
await memory.storeBatch(agentId, memories, {
  batchSize: 500,           // Process in chunks
  useTransaction: true,     // Wrap in transaction
  onProgress: (processed, total) => {
    console.log(`Stored ${processed}/${total} memories`)
  }
})
```

## Monitoring & Analytics

### Memory Statistics

```typescript
// Comprehensive memory analytics
const analytics = await memory.getAdvancedAnalytics(agentId)
console.log('Memory Analytics:', analytics)

// Output example:
// {
//   overview: {
//     total: 15234,
//     activeMemories: 12456,
//     archivedMemories: 2778,
//     sharedMemories: 456
//   },
//   tiers: {
//     working: { count: 45, avgImportance: 0.6 },
//     episodic: { count: 8234, avgImportance: 0.7 },
//     semantic: { count: 3456, avgImportance: 0.8 },
//     procedural: { count: 721, avgImportance: 0.75 }
//   },
//   consolidation: {
//     rate: 0.23,  // Memories consolidated per hour
//     efficiency: 0.87,
//     lastRun: Date
//   },
//   archival: {
//     compressionRatio: 0.34,
//     spaceSaved: '1.2GB',
//     lastRun: Date
//   },
//   performance: {
//     avgQueryTime: 23,  // milliseconds
//     cacheHitRate: 0.89,
//     databaseSize: '456MB',
//     indexEfficiency: 0.92
//   }
// }
```

### Health Monitoring

```typescript
// System health check
const health = await memory.healthCheck()
console.log('Health Status:', health)

// Database maintenance
const maintenanceResult = await memory.runMaintenance({
  vacuum: true,           // Reclaim space
  reindex: true,          // Rebuild indexes
  analyzeQueries: true,   // Update query planner stats
  repairCorruption: true  // Check and repair corruption
})

console.log('Maintenance completed:', maintenanceResult)
```

## Migration & Backup

### Database Migration

```typescript
// Migrate from older version
await memory.migrate({
  fromVersion: '1.0.0',
  toVersion: '2.0.0',
  preserveData: true,
  createBackup: true
})

// Export for migration to different provider
const exportData = await memory.exportToPortableFormat(agentId, {
  format: 'json',
  includeEmbeddings: true,
  compressLarge: true
})
```

### Backup & Recovery

```typescript
// Create backup
await memory.createBackup({
  path: './backups/memory_backup_2024_01_15.db',
  compression: true,
  encryption: {
    enabled: true,
    key: process.env.BACKUP_ENCRYPTION_KEY
  }
})

// Restore from backup
await memory.restoreFromBackup('./backups/memory_backup_2024_01_15.db', {
  verifyIntegrity: true,
  mergeStrategy: 'preserve_existing'  // or 'overwrite', 'merge_intelligent'
})
```

## Best Practices

### 1. **Database Location**
```typescript
// Recommended paths
const configs = {
  development: { dbPath: './data/dev_memory.db' },
  testing: { dbPath: ':memory:' },  // In-memory for tests
  production: { dbPath: '/var/lib/symindx/memory.db' }
}
```

### 2. **Performance Tuning**
```typescript
// Monitor and optimize
setInterval(async () => {
  const stats = await memory.getPerformanceStats()
  if (stats.avgQueryTime > 100) {  // ms
    await memory.optimizeDatabase()
  }
}, 300000)  // Check every 5 minutes
```

### 3. **Error Handling**
```typescript
try {
  await memory.store(agentId, memoryRecord)
} catch (error) {
  if (error.code === 'SQLITE_FULL') {
    // Database full - trigger cleanup
    await memory.emergencyCleanup(agentId)
    // Retry operation
    await memory.store(agentId, memoryRecord)
  }
  throw error
}
```

### 4. **Graceful Shutdown**
```typescript
process.on('SIGTERM', async () => {
  await memory.gracefulShutdown({
    flushPendingWrites: true,
    createCheckpoint: true,
    closeConnections: true
  })
})
```

## Troubleshooting

### Common Issues

**Database Locked**
```typescript
// Handle locked database
const memory = new SQLiteMemoryProvider({
  dbPath: './data/memory.db',
  sqliteOptions: {
    timeout: 5000,  // 5 second timeout
    busyTimeout: 1000
  }
})
```

**Performance Issues**
```typescript
// Diagnose slow queries
const queryAnalysis = await memory.analyzeQueries()
console.log('Slow queries:', queryAnalysis.slowQueries)

// Rebuild indexes if needed
if (queryAnalysis.recommendReindex) {
  await memory.rebuildIndexes()
}
```

**Corruption Recovery**
```typescript
// Check and repair database
const integrity = await memory.checkIntegrity()
if (!integrity.ok) {
  await memory.repairDatabase({
    createBackup: true,
    method: 'recover_data'
  })
}
```

The enhanced SQLite memory provider offers enterprise-grade features in a local package, making it perfect for applications requiring sophisticated memory management without external dependencies.

## Learn More

- [Overview](/docs/01-overview)
- [API Reference](/docs/03-api-reference)
- [Examples](/docs/17-examples)

---

*This documentation is being actively developed. Check back for updates.*
