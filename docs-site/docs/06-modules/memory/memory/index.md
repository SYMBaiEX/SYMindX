---
sidebar_position: 5
title: "In-Memory Provider"
description: "Ultra-fast in-memory storage with persistence, clustering, and distributed capabilities"
---

# In-Memory Provider

The enhanced in-memory provider delivers ultra-fast memory storage with optional persistence, clustering capabilities, and advanced multi-tier memory architecture. Perfect for development, testing, edge computing, and high-performance scenarios where speed is critical.

## 🚀 Key Features

- **Ultra-Fast Performance** - Sub-millisecond memory operations with zero I/O latency
- **Multi-Tier Memory Architecture** - Working, Episodic, Semantic, and Procedural memory tiers
- **Optional Persistence** - Save/load memory state to disk with various serialization formats
- **Distributed Clustering** - Scale across multiple nodes with automatic synchronization
- **Vector Search** - In-memory vector similarity search with multiple algorithms
- **Shared Memory Pools** - Real-time collaborative memory spaces
- **Memory Optimization** - Automatic compression, deduplication, and garbage collection
- **Zero Dependencies** - No external databases or services required

## Installation & Setup

```bash
# Provider is included in @symindx/memory
# No additional dependencies required for basic usage

# Optional: For persistence features
npm install fast-json-stable-stringify msgpack-lite lz4

# Optional: For clustering features
npm install ws redis-adapter socket.io-adapter
```

## Basic Configuration

```typescript
import { InMemoryProvider } from '@symindx/memory/providers'

const memory = new InMemoryProvider({
  // Basic configuration
  enablePersistence: false,        // Keep everything in memory
  enableAutoConsolidation: true,
  
  // Multi-tier processing
  consolidationInterval: 300000,   // 5 minutes
  archivalInterval: 1800000       // 30 minutes
})
```

## Advanced Configuration

```typescript
const enterpriseMemory = new InMemoryProvider({
  // Performance optimization
  maxMemorySize: '8GB',           // Maximum memory usage
  enableMemoryOptimization: true,
  optimizationStrategy: 'aggressive',  // 'conservative', 'balanced', 'aggressive'
  
  // Persistence configuration
  enablePersistence: true,
  persistenceConfig: {
    persistenceMode: 'periodic',    // 'immediate', 'periodic', 'manual'
    persistenceInterval: 300000,   // 5 minutes
    persistenceFormat: 'msgpack',  // 'json', 'msgpack', 'binary'
    enableCompression: true,
    compressionAlgorithm: 'lz4',   // 'lz4', 'gzip', 'brotli'
    
    // File management
    saveLocation: './memory-snapshots/',
    maxSnapshots: 10,
    enableVersioning: true,
    enableBackups: true
  },
  
  // Multi-tier configuration
  consolidationInterval: 180000,   // 3 minutes - aggressive
  archivalInterval: 900000,       // 15 minutes
  enableIntelligentConsolidation: true,
  
  // Vector search optimization
  vectorConfig: {
    dimensions: 1536,
    indexType: 'hnsw',            // 'hnsw', 'ivf', 'linear'
    distanceFunction: 'cosine',   // 'cosine', 'euclidean', 'dot_product'
    
    // HNSW parameters
    hnswM: 16,
    hnswEfConstruction: 200,
    hnswEfSearch: 50,
    
    // Memory optimization
    enableVectorCompression: true,
    compressionRatio: 0.8,
    enableQuantization: true
  },
  
  // Shared memory pools
  enableSharedPools: true,
  maxSharedPools: 1000,
  
  // Clustering configuration
  enableClustering: false,        // Set to true for distributed setup
  clusterConfig: {
    nodeId: 'node_001',
    discoveryMethod: 'redis',     // 'redis', 'multicast', 'manual'
    syncStrategy: 'eventual',     // 'immediate', 'eventual', 'manual'
    conflictResolution: 'timestamp'  // 'timestamp', 'vector_clock', 'custom'
  },
  
  // Memory optimization
  memoryOptimization: {
    enableGarbageCollection: true,
    gcInterval: 600000,           // 10 minutes
    enableDeduplication: true,
    enableCompression: true,
    compressionThreshold: 1000,   // Compress objects > 1KB
    
    // Memory limits
    enableMemoryLimits: true,
    maxMemoriesPerAgent: 100000,
    maxTotalMemories: 1000000,
    enableLRUEviction: true
  },
  
  // Performance monitoring
  enablePerformanceMonitoring: true,
  enableMemoryProfiling: true,
  enableMetricsCollection: true
})
```

## Persistence Features

### Automatic Persistence

```typescript
// Configure intelligent persistence
const persistenceConfig = {
  // Automatic persistence triggers
  triggers: {
    memoryCountThreshold: 1000,    // Persist after 1000 new memories
    timeInterval: 300000,          // Persist every 5 minutes
    memoryImportanceThreshold: 0.8, // Persist immediately for high-importance memories
    tierTransitions: true,         // Persist on tier changes
    shutdownGraceful: true         // Persist on shutdown
  },
  
  // Persistence strategies
  strategies: {
    fullSnapshot: {
      enabled: true,
      interval: 3600000,          // 1 hour
      compression: 'lz4',
      includeIndexes: true
    },
    
    incrementalChanges: {
      enabled: true,
      interval: 60000,            // 1 minute
      trackDeltas: true,
      compactDeltas: true
    },
    
    tierBasedPersistence: {
      enabled: true,
      semantic: { interval: 1800000 },  // 30 minutes
      episodic: { interval: 600000 },   // 10 minutes
      working: { interval: 300000 },    // 5 minutes
      procedural: { interval: 3600000 } // 1 hour
    }
  },
  
  // Recovery configuration
  recovery: {
    enableAutoRecovery: true,
    enableCorruptionDetection: true,
    enableRollback: true,
    maxRollbackVersions: 5,
    verifyIntegrityOnLoad: true
  }
}

await memory.configurePersistence(persistenceConfig)

// Manual persistence operations
const snapshot = await memory.createSnapshot({
  name: 'manual_snapshot_v1',
  includeMetadata: true,
  includePerformanceMetrics: true,
  compression: 'brotli'         // Maximum compression for long-term storage
})

console.log('Snapshot created:', snapshot)
// {
//   snapshotId: 'snap_abc123',
//   filePath: './memory-snapshots/manual_snapshot_v1.msgpack.br',
//   size: '2.3MB',
//   compressionRatio: 0.23,
//   memoriesCount: 15234,
//   createdAt: '2025-01-02T...'
// }

// Load from snapshot
const loadResult = await memory.loadFromSnapshot({
  snapshotId: 'snap_abc123',
  validateIntegrity: true,
  rebuildIndexes: true,
  mergeStrategy: 'replace'      // 'replace', 'merge', 'append'
})

console.log('Loaded from snapshot:', loadResult)
```

### Cross-Format Export/Import

```typescript
// Export memory data in various formats
const exportOptions = {
  format: 'json',                 // 'json', 'msgpack', 'binary', 'csv'
  includeMetadata: true,
  includeVectorEmbeddings: true,
  includeRelationships: true,
  
  // Filtering options
  filters: {
    agentIds: ['agent_001', 'agent_002'],
    tiers: [MemoryTierType.SEMANTIC, MemoryTierType.PROCEDURAL],
    dateRange: {
      start: new Date('2024-01-01'),
      end: new Date()
    },
    importanceThreshold: 0.7
  },
  
  // Optimization options
  enableCompression: true,
  optimizeForSize: true,
  preserveReferences: true
}

const exportData = await memory.exportMemories(exportOptions)

// Import from external sources
const importResult = await memory.importMemories({
  data: exportData,
  format: 'json',
  
  // Import strategies
  conflictResolution: 'merge_intelligent',  // 'overwrite', 'skip', 'merge_intelligent'
  preserveIds: false,             // Generate new IDs
  validateSchema: true,
  
  // Post-import processing
  rebuildIndexes: true,
  runConsolidation: true,
  enableBatchProcessing: true,
  batchSize: 1000
})

console.log('Import completed:', importResult)
// {
//   memoriesImported: 15234,
//   conflictsResolved: 45,
//   errorsEncountered: 0,
//   processingTime: 1234,
//   newAgentsCreated: 2,
//   indexesRebuilt: true
// }
```

## Distributed Clustering

### Multi-Node Clustering

```typescript
// Configure distributed clustering
const clusterConfig = {
  // Node configuration
  nodeConfig: {
    nodeId: 'symindx_node_001',
    nodeName: 'Primary Memory Node',
    nodeType: 'memory_server',    // 'memory_server', 'compute_node', 'hybrid'
    region: 'us-west-1',
    capabilities: ['memory_storage', 'vector_search', 'consolidation']
  },
  
  // Discovery and communication
  discovery: {
    method: 'redis',              // 'redis', 'consul', 'etcd', 'multicast'
    redisConfig: {
      host: 'redis.cluster.local',
      port: 6379,
      password: process.env.REDIS_PASSWORD,
      db: 0
    },
    heartbeatInterval: 30000,     // 30 seconds
    nodeTimeout: 90000            // 90 seconds
  },
  
  // Synchronization strategy
  synchronization: {
    strategy: 'eventual_consistency',  // 'strong_consistency', 'eventual_consistency'
    syncInterval: 60000,          // 1 minute
    enableConflictResolution: true,
    conflictResolutionStrategy: 'vector_clock',  // 'timestamp', 'vector_clock', 'custom'
    
    // Replication
    replicationFactor: 3,         // Keep 3 copies of each memory
    enableAutoRebalancing: true,
    rebalanceInterval: 1800000    // 30 minutes
  },
  
  // Sharding configuration
  sharding: {
    enableSharding: true,
    shardingStrategy: 'consistent_hash',  // 'range', 'consistent_hash', 'custom'
    shardsPerNode: 4,
    enableAutoResharding: true,
    reshardingThreshold: 0.8      // Reshard when nodes are 80% full
  },
  
  // Load balancing
  loadBalancing: {
    strategy: 'round_robin',      // 'round_robin', 'least_connections', 'weighted'
    enableHealthChecks: true,
    healthCheckInterval: 15000,   // 15 seconds
    enableCircuitBreaker: true
  }
}

// Initialize cluster node
const clusterNode = await memory.initializeClusterNode(clusterConfig)

// Monitor cluster events
clusterNode.on('node_joined', (nodeInfo) => {
  console.log('New node joined cluster:', nodeInfo)
})

clusterNode.on('node_left', (nodeInfo) => {
  console.log('Node left cluster:', nodeInfo)
})

clusterNode.on('rebalance_started', (rebalanceInfo) => {
  console.log('Cluster rebalancing started:', rebalanceInfo)
})

clusterNode.on('sync_conflict', (conflictInfo) => {
  console.log('Synchronization conflict detected:', conflictInfo)
  // Custom conflict resolution logic here
})
```

### Cluster Management

```typescript
// Get cluster status and health
const clusterStatus = await memory.getClusterStatus()
console.log('Cluster Status:', clusterStatus)
// {
//   totalNodes: 5,
//   healthyNodes: 5,
//   totalMemories: 1000000,
//   replicationHealth: 0.99,
//   networkLatency: {
//     min: 12,
//     max: 156,
//     avg: 45,
//     p95: 89
//   },
//   syncStatus: {
//     lastSync: '2025-01-02T10:30:00Z',
//     pendingOperations: 23,
//     conflictsResolved: 2
//   }
// }

// Perform cluster maintenance
const maintenanceResult = await memory.performClusterMaintenance({
  operations: [
    'rebalance_shards',
    'resolve_conflicts',
    'compact_logs',
    'verify_replicas',
    'optimize_routing'
  ],
  
  // Maintenance constraints
  maxMaintenanceTime: 1800000,    // 30 minutes
  enableRollingMaintenance: true,
  maintainMinimumNodes: 3,
  enableAutoRollback: true
})

console.log('Maintenance completed:', maintenanceResult)
```

## High-Performance Vector Search

### Optimized In-Memory Vector Operations

```typescript
// Ultra-fast in-memory vector search
const vectorSearchResults = await memory.search(agentId, queryEmbedding, {
  limit: 100,
  minSimilarity: 0.75,
  
  // Performance optimization
  useOptimizedIndex: true,
  enableParallelSearch: true,
  maxThreads: 8,                  // Use multiple CPU cores
  
  // Search algorithms
  searchAlgorithm: 'hnsw',        // 'hnsw', 'ivf', 'linear', 'auto'
  exactSearch: false,             // Use approximate search for speed
  
  // Caching
  enableResultCaching: true,
  cacheSize: 10000,
  cacheTTL: 300000,               // 5 minutes
  
  // Advanced filtering
  filters: {
    tier: [MemoryTierType.SEMANTIC, MemoryTierType.EPISODIC],
    type: [MemoryType.KNOWLEDGE, MemoryType.EXPERIENCE],
    importance: { min: 0.6 },
    concepts: { include: ['innovation', 'research'] },
    
    // Fast in-memory filtering
    customFilter: (memory) => {
      return memory.metadata?.relevanceScore > 0.8
    }
  },
  
  // Result optimization
  enableDeduplication: true,
  diversityThreshold: 0.85,       // Promote diverse results
  includeDebugInfo: false         // Disable for production performance
})

console.log('Vector search performance:', {
  resultsCount: vectorSearchResults.memories.length,
  searchTime: vectorSearchResults.searchTime,      // Usually < 10ms
  indexUsed: vectorSearchResults.indexType,
  threadsUsed: vectorSearchResults.parallelThreads,
  cacheHit: vectorSearchResults.cacheHit
})
```

### Batch Vector Processing

```typescript
// High-throughput batch vector operations
const batchResults = await memory.batchVectorProcess({
  operations: [
    // Multiple similarity searches
    ...Array.from({ length: 100 }, (_, i) => ({
      type: 'similarity_search',
      agentId: `agent_${i}`,
      embedding: embeddings[i],
      options: { limit: 20, minSimilarity: 0.8 }
    })),
    
    // Clustering operations
    {
      type: 'cluster_memories',
      agentId: 'agent_001',
      memoryIds: Array.from({ length: 1000 }, (_, i) => `mem_${i}`),
      options: { clusterCount: 10, algorithm: 'kmeans' }
    }
  ],
  
  // Batch optimization
  batchConfig: {
    enableParallelProcessing: true,
    maxConcurrency: 16,           // Utilize multiple CPU cores
    enableWorkStealing: true,     // Dynamic load balancing
    enableResultCaching: true,
    
    // Memory management
    enableMemoryOptimization: true,
    maxMemoryUsage: '4GB',
    enableGarbageCollection: true
  }
})

console.log('Batch processing completed:', {
  totalOperations: batchResults.totalOperations,
  successfulOperations: batchResults.successful,
  failedOperations: batchResults.failed,
  totalProcessingTime: batchResults.processingTime,
  averageTimePerOperation: batchResults.avgTimePerOp,
  memoryUsagePeak: batchResults.peakMemoryUsage
})
```

## Memory Optimization

### Intelligent Memory Management

```typescript
// Configure advanced memory optimization
const optimizationConfig = {
  // Garbage collection
  garbageCollection: {
    enabled: true,
    strategy: 'generational',     // 'mark_sweep', 'generational', 'concurrent'
    interval: 300000,             // 5 minutes
    aggressiveness: 'balanced',   // 'conservative', 'balanced', 'aggressive'
    
    // Generation-based GC
    youngGenerationThreshold: 1000,
    oldGenerationThreshold: 10000,
    enableCompaction: true
  },
  
  // Deduplication
  deduplication: {
    enabled: true,
    strategy: 'content_hash',     // 'content_hash', 'fuzzy_match', 'semantic'
    threshold: 0.95,              // 95% similarity threshold
    enableCrossAgentDedup: false, // Privacy consideration
    preserveOriginalIds: true
  },
  
  // Compression
  compression: {
    enabled: true,
    algorithm: 'lz4',            // 'lz4', 'zstd', 'brotli'
    threshold: 1000,             // Compress objects > 1KB
    enableAdaptiveCompression: true,
    compressionLevels: {
      working: 1,                // Fast compression for working memory
      episodic: 3,               // Balanced compression
      semantic: 6,               // High compression for semantic memory
      procedural: 9              // Maximum compression for procedural memory
    }
  },
  
  // Memory limits and eviction
  memoryLimits: {
    maxTotalMemory: '8GB',
    maxMemoriesPerAgent: 100000,
    maxMemorySize: '10MB',
    
    // LRU eviction
    enableLRUEviction: true,
    evictionStrategy: 'importance_aware_lru',  // Consider importance scores
    evictionThreshold: 0.9,      // Evict when 90% full
    minEvictionBatch: 100
  }
}

await memory.configureOptimization(optimizationConfig)

// Manual optimization operations
const optimizationResult = await memory.optimizeMemory({
  operations: [
    'garbage_collect',
    'deduplicate',
    'compress',
    'defragment',
    'rebuild_indexes'
  ],
  
  // Optimization constraints
  maxOptimizationTime: 300000,   // 5 minutes
  enableProgressReporting: true,
  maintainAvailability: true,    // Keep system responsive during optimization
  
  onProgress: (progress) => {
    console.log(`Optimization progress: ${progress.percentage}% - ${progress.currentOperation}`)
  }
})

console.log('Memory optimization completed:', optimizationResult)
// {
//   memoryFreed: '1.2GB',
//   duplicatesRemoved: 1234,
//   compressionRatio: 0.45,
//   indexRebuildTime: 15000,
//   performanceImprovement: '23%'
// }
```

### Performance Monitoring

```typescript
// Comprehensive performance monitoring
const performanceMonitor = await memory.enablePerformanceMonitoring({
  monitoringInterval: 5000,       // 5 seconds
  collectDetailedMetrics: true,
  enableProfiling: true,
  
  // Metrics to collect
  metrics: [
    'memory_usage',
    'cpu_usage',
    'query_performance',
    'index_efficiency',
    'cache_hit_rate',
    'gc_performance',
    'compression_efficiency'
  ],
  
  // Performance thresholds
  alertThresholds: {
    memoryUsage: 0.85,            // 85% memory usage
    queryTime: 100,               // 100ms query time
    cacheHitRate: 0.8,            // 80% cache hit rate
    gcFrequency: 60000            // GC more than once per minute
  }
})

performanceMonitor.on('performance_alert', (alert) => {
  console.log('Performance alert:', {
    metric: alert.metric,
    currentValue: alert.currentValue,
    threshold: alert.threshold,
    severity: alert.severity,
    recommendations: alert.recommendations
  })
})

// Get performance report
const performanceReport = await memory.getPerformanceReport({
  timeRange: {
    start: new Date(Date.now() - 60 * 60 * 1000),  // Last hour
    end: new Date()
  },
  includeRecommendations: true,
  includeHistoricalTrends: true
})

console.log('Performance Report:', performanceReport)
```

## Development & Testing Features

### Memory Debugging

```typescript
// Enable comprehensive debugging
const debugConfig = {
  enableDebugMode: true,
  logLevel: 'verbose',            // 'error', 'warn', 'info', 'verbose', 'debug'
  
  // Memory tracking
  trackMemoryAllocations: true,
  trackMemoryLeaks: true,
  enableMemorySnapshots: true,
  
  // Operation tracing
  traceOperations: true,
  traceVectorOperations: true,
  traceConsolidation: true,
  
  // Performance profiling
  enableProfiling: true,
  profileVectorOperations: true,
  profileMemoryAccess: true
}

await memory.enableDebugging(debugConfig)

// Memory inspection tools
const memoryInspection = await memory.inspectMemory({
  includeInternalStructures: true,
  includeIndexStatistics: true,
  includeMemoryDistribution: true,
  includePerformanceMetrics: true
})

console.log('Memory Inspection:', memoryInspection)
// {
//   totalMemoryUsage: '2.3GB',
//   memoryDistribution: {
//     memories: '1.8GB',
//     indexes: '400MB',
//     cache: '100MB'
//   },
//   indexStatistics: {
//     vectorIndexSize: '350MB',
//     vectorIndexEfficiency: 0.92,
//     rebuildRequired: false
//   },
//   performanceMetrics: {
//     avgQueryTime: 15,
//     avgInsertTime: 3,
//     cacheHitRate: 0.87
//   }
// }
```

### Testing Utilities

```typescript
// Testing utilities for development
const testUtilities = {
  // Generate test data
  generateTestMemories: async (count: number, agentId: string) => {
    const memories = Array.from({ length: count }, (_, i) => ({
      id: `test_mem_${i}`,
      agentId,
      content: `Test memory content ${i}`,
      type: MemoryType.KNOWLEDGE,
      tier: MemoryTierType.WORKING,
      importance: Math.random(),
      embedding: Array.from({ length: 1536 }, () => Math.random() - 0.5),
      metadata: {
        testData: true,
        batchId: Date.now()
      }
    }))
    
    return await memory.batchStore(memories)
  },
  
  // Performance testing
  runPerformanceTest: async () => {
    const testAgentId = 'perf_test_agent'
    const testCount = 10000
    
    // Generate test memories
    console.log('Generating test memories...')
    const startGeneration = Date.now()
    await testUtilities.generateTestMemories(testCount, testAgentId)
    const generationTime = Date.now() - startGeneration
    
    // Test search performance
    console.log('Testing search performance...')
    const searchStartTime = Date.now()
    const testEmbedding = Array.from({ length: 1536 }, () => Math.random() - 0.5)
    
    for (let i = 0; i < 100; i++) {
      await memory.search(testAgentId, testEmbedding, { limit: 20 })
    }
    
    const searchTime = Date.now() - searchStartTime
    
    return {
      memoriesGenerated: testCount,
      generationTime,
      avgGenerationTime: generationTime / testCount,
      searchIterations: 100,
      totalSearchTime: searchTime,
      avgSearchTime: searchTime / 100
    }
  }
}

// Run performance test
const perfResults = await testUtilities.runPerformanceTest()
console.log('Performance Test Results:', perfResults)
```

## Best Practices for In-Memory Provider

### 1. **Memory Management**
```typescript
// Optimize memory usage
const memoryOptimization = {
  // Monitor memory usage
  enableMemoryMonitoring: true,
  memoryThresholds: {
    warning: 0.8,                 // 80% memory usage
    critical: 0.9                 // 90% memory usage
  },
  
  // Configure appropriate limits
  maxMemorySize: process.env.NODE_ENV === 'production' ? '8GB' : '2GB',
  enableAutoEviction: true,
  evictionStrategy: 'importance_aware_lru',
  
  // Use compression for large datasets
  enableCompression: true,
  compressionThreshold: 1000      // 1KB
}
```

### 2. **Performance Optimization**
```typescript
// Optimize for performance
const performanceOptimization = {
  // Vector search optimization
  vectorSearch: {
    useApproximateSearch: true,   // Faster than exact search
    enableResultCaching: true,
    cacheSize: 10000,
    enableParallelSearch: true
  },
  
  // Index optimization
  indexOptimization: {
    rebuildIndexesPeriodically: true,
    indexRebuildInterval: 3600000, // 1 hour
    enableIndexStatistics: true
  },
  
  // Batch operations for bulk data
  preferBatchOperations: true,
  batchSize: 1000
}
```

### 3. **Persistence Strategy**
```typescript
// Balance performance and durability
const persistenceStrategy = {
  // For development
  development: {
    enablePersistence: false,     // Keep everything in memory
    enableSnapshots: true,        // Manual snapshots for testing
    persistenceFormat: 'json'     // Human-readable for debugging
  },
  
  // For production
  production: {
    enablePersistence: true,
    persistenceMode: 'periodic',
    persistenceInterval: 300000,  // 5 minutes
    persistenceFormat: 'msgpack', // Efficient binary format
    enableCompression: true,
    enableBackups: true
  }
}
```

The enhanced in-memory provider offers unmatched performance for development, testing, and high-speed production scenarios while maintaining enterprise-grade features like persistence, clustering, and advanced memory management. 