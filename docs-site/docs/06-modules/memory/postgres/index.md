---
sidebar_position: 2
title: "PostgreSQL Memory Provider"
description: "Production-ready PostgreSQL with auto-deployment, multi-tier memory, and pgvector"
---

# PostgreSQL Memory Provider

The enhanced PostgreSQL memory provider delivers enterprise-grade memory storage with automatic schema deployment, advanced multi-tier memory architecture, high-performance vector search via pgvector, and sophisticated shared memory collaboration features.

## 🐘 Key Features

- **Auto-Schema Deployment** - Automatically creates database schema, extensions, and optimizations
- **Multi-Tier Memory Architecture** - Working, Episodic, Semantic, and Procedural memory tiers
- **pgvector Integration** - High-performance vector similarity search with HNSW and IVFFlat indexes
- **Shared Memory Pools** - Enable multi-agent collaboration and knowledge sharing
- **Connection Pooling** - Optimized connection management for high-throughput applications
- **Automatic Consolidation** - Intelligent memory tier promotion and optimization
- **Advanced Archival** - Compression, summarization, and long-term storage strategies
- **Production Monitoring** - Comprehensive health checks, performance metrics, and alerting

## Installation & Dependencies

```bash
# Install PostgreSQL driver
npm install pg @types/pg

# Provider is included in @symindx/memory
# Requires PostgreSQL 12+ with pgvector extension
```

## Database Requirements

### PostgreSQL Setup

```sql
-- Install pgvector extension (requires PostgreSQL 11+)
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS btree_gin;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create database for SYMindX
CREATE DATABASE symindx_memory;
```

### Automated Setup

The provider can automatically handle all database setup:

```typescript
import { PostgresMemoryProvider } from '@symindx/memory/providers'

const memory = new PostgresMemoryProvider({
  connectionString: process.env.DATABASE_URL,
  autoDeploySchema: true,  // Automatically creates everything needed
  maxConnections: 20
})
```

## Basic Configuration

```typescript
import { PostgresMemoryProvider, createPostgresConnectionString } from '@symindx/memory/providers'

// Create connection string helper
const connectionString = createPostgresConnectionString(
  'localhost',        // host
  5432,              // port
  'symindx_memory',  // database
  'username',        // username
  'password',        // password
  { 
    sslmode: 'prefer',
    application_name: 'symindx-agent'
  }
)

const memory = new PostgresMemoryProvider({
  connectionString,
  autoDeploySchema: true,
  
  // Connection pool settings
  maxConnections: 20,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  
  // Multi-tier processing
  consolidationInterval: 600000,   // 10 minutes
  archivalInterval: 7200000       // 2 hours
})
```

## Advanced Configuration

```typescript
const enterpriseMemory = new PostgresMemoryProvider({
  connectionString: process.env.DATABASE_URL,
  autoDeploySchema: true,
  
  // Connection pool optimization
  maxConnections: 50,
  connectionTimeoutMillis: 3000,
  idleTimeoutMillis: 60000,
  enablePooling: true,
  
  // SSL configuration
  ssl: {
    rejectUnauthorized: false,
    ca: fs.readFileSync('./certs/ca-cert.pem'),
    key: fs.readFileSync('./certs/client-key.pem'),
    cert: fs.readFileSync('./certs/client-cert.pem')
  },
  
  // Performance tuning
  tableName: 'agent_memories',
  indexStrategy: {
    vectorIndexType: 'hnsw',        // or 'ivfflat'
    vectorDimensions: 1536,
    hnswM: 16,                      // HNSW index parameter
    hnswEfConstruction: 64,         // HNSW build parameter
    maintenanceWorkMem: '256MB'
  },
  
  // Multi-tier configuration
  consolidationInterval: 300000,   // 5 minutes - aggressive
  archivalInterval: 3600000,      // 1 hour
  
  // Shared memory pools
  enableSharedPools: true,
  maxSharedPools: 100,
  poolSyncInterval: 30000,        // 30 seconds
  
  // Monitoring and alerts
  enableHealthChecks: true,
  healthCheckInterval: 60000,     // 1 minute
  alertThresholds: {
    maxQueryTime: 500,            // ms
    maxConnectionUtilization: 0.8,
    minMemoryEfficiency: 0.7
  }
})
```

## Multi-Tier Memory Operations

### Advanced Memory Consolidation

```typescript
// Sophisticated consolidation rules
const consolidationConfig = {
  rules: [
    {
      name: 'working_to_episodic',
      fromTier: MemoryTierType.WORKING,
      toTier: MemoryTierType.EPISODIC,
      criteria: {
        importance: { min: 0.6 },
        age: 300000,                    // 5 minutes
        emotionalSignificance: { min: 0.5 },
        interactionCount: { min: 2 }
      },
      batchSize: 100
    },
    {
      name: 'episodic_to_semantic',
      fromTier: MemoryTierType.EPISODIC,
      toTier: MemoryTierType.SEMANTIC,
      criteria: {
        importance: { min: 0.8 },
        repetitionCount: { min: 3 },
        conceptDensity: { min: 0.7 },
        timeSpan: 86400000              // 24 hours
      },
      enableConceptExtraction: true,
      mergeSimilarMemories: true
    },
    {
      name: 'skill_to_procedural',
      fromTier: MemoryTierType.EPISODIC,
      toTier: MemoryTierType.PROCEDURAL,
      criteria: {
        type: [MemoryType.SKILL, MemoryType.EXPERIENCE],
        tags: { include: ['skill', 'procedure', 'method'] },
        successRate: { min: 0.8 }
      },
      createProcedureTemplate: true
    }
  ]
}

await memory.configureConsolidation(agentId, consolidationConfig)

// Manual consolidation with validation
const consolidationResult = await memory.consolidateMemory(
  agentId,
  memoryId,
  MemoryTierType.WORKING,
  MemoryTierType.SEMANTIC,
  {
    validateCriteria: true,
    extractConcepts: true,
    updateRelatedMemories: true,
    preserveHistory: true
  }
)

console.log('Consolidation result:', consolidationResult)
// {
//   success: true,
//   newTier: 'semantic',
//   conceptsExtracted: ['problem-solving', 'creativity'],
//   relatedMemoriesUpdated: 3,
//   importance: 0.85  // Updated importance score
// }
```

### Cross-Tier Memory Analysis

```typescript
// Analyze memory patterns across tiers
const memoryAnalysis = await memory.analyzeCrossTierPatterns(agentId, {
  timeWindow: 7 * 24 * 60 * 60 * 1000,  // 7 days
  includeConcepts: true,
  includeRelationships: true
})

console.log('Memory pattern analysis:', memoryAnalysis)
// {
//   tierDistribution: {
//     working: { count: 45, avgImportance: 0.6, topConcepts: [...] },
//     episodic: { count: 1234, avgImportance: 0.7, topConcepts: [...] },
//     semantic: { count: 567, avgImportance: 0.85, topConcepts: [...] },
//     procedural: { count: 89, avgImportance: 0.8, topConcepts: [...] }
//   },
//   consolidationOpportunities: [
//     { memoryId: 'mem123', recommendedTier: 'semantic', confidence: 0.9 }
//   ],
//   conceptEvolution: {
//     emerging: ['quantum-computing', 'ethics'],
//     strengthening: ['machine-learning', 'collaboration'],
//     declining: ['outdated-method']
//   }
// }
```

## High-Performance Vector Search

### pgvector Optimization

```typescript
// Optimized vector search configuration
const vectorSearchConfig = {
  indexType: 'hnsw',              // HNSW for speed, IVFFlat for memory
  dimensions: 1536,
  distanceFunction: 'cosine',     // or 'l2', 'inner_product'
  
  // HNSW parameters
  m: 16,                          // Connections per layer
  efConstruction: 64,             // Build-time search width
  efSearch: 40,                   // Query-time search width
  
  // Performance tuning
  maintenanceWorkMem: '512MB',
  enableParallelIndex: true,
  vacuumEnabled: true,
  autoAnalyze: true
}

await memory.optimizeVectorSearch(vectorSearchConfig)
```

### Advanced Vector Queries

```typescript
// Sophisticated vector similarity search
const advancedSearch = await memory.search(agentId, queryEmbedding, {
  limit: 25,
  minSimilarity: 0.75,
  
  // Multi-tier weighted search
  tierWeights: {
    [MemoryTierType.SEMANTIC]: 0.4,
    [MemoryTierType.EPISODIC]: 0.3,
    [MemoryTierType.PROCEDURAL]: 0.2,
    [MemoryTierType.WORKING]: 0.1
  },
  
  // Advanced filtering
  filters: {
    type: [MemoryType.KNOWLEDGE, MemoryType.EXPERIENCE],
    importance: { min: 0.6, max: 1.0 },
    concepts: { include: ['learning'], exclude: ['deprecated'] },
    timeRange: {
      start: new Date('2024-01-01'),
      end: new Date()
    },
    emotionalResonance: { min: 0.5 },
    agentInteraction: { include: ['agent2', 'agent3'] }
  },
  
  // Result enhancement
  includeContext: true,
  includeConcepts: true,
  includeRelatedMemories: true,
  expandConcepts: true,            // Include conceptually related memories
  diversityThreshold: 0.8,        // Reduce similar results
  
  // Performance options
  useParallelSearch: true,
  cacheResults: true,
  explainQuery: false             // Set true for query analysis
})

// Hybrid text + vector search
const hybridResults = await memory.hybridSearch(agentId, {
  textQuery: 'problem solving strategies',
  vectorQuery: queryEmbedding,
  
  // Fusion parameters
  textWeight: 0.3,
  vectorWeight: 0.7,
  fusionMethod: 'rrf',            // Reciprocal Rank Fusion
  
  // Search parameters
  limit: 20,
  minTextScore: 0.1,
  minVectorSimilarity: 0.6
})
```

## Enterprise Shared Memory

### Advanced Pool Management

```typescript
// Enterprise shared memory pool configuration
const enterprisePoolConfig: SharedMemoryConfig = {
  poolId: 'enterprise_research_hub',
  name: 'Enterprise Research Hub',
  description: 'Central knowledge repository for enterprise AI research',
  
  // Access control
  participants: ['research_team', 'engineering_team', 'product_team'],
  permissions: {
    read: MemoryPermission.ALL,
    write: MemoryPermission.PARTICIPANTS,
    delete: MemoryPermission.ADMIN,
    modify: MemoryPermission.PARTICIPANTS,
    share: MemoryPermission.ADMIN
  },
  
  // Pool policies
  maxMemories: 100000,
  maxSizePerMemory: '10MB',
  totalSizeLimit: '1GB',
  
  // Retention and archival
  retentionPolicy: {
    duration: 31536000000,        // 1 year
    archiveOnExpiry: true,
    compressionEnabled: true
  },
  
  // Quality controls
  qualityGates: {
    minImportance: 0.5,
    requireApproval: true,
    moderationEnabled: true,
    duplicateDetection: true
  },
  
  // Sync and replication
  enableRealTimeSync: false,      // PostgreSQL doesn't support real-time
  syncInterval: 60000,            // 1 minute
  conflictResolution: 'merge_intelligent',
  backupEnabled: true,
  
  // Monitoring
  enableAuditLog: true,
  enableUsageMetrics: true,
  alertOnHighUsage: true
}

await memory.createEnterprisePool(enterprisePoolConfig)
```

### Pool Analytics & Governance

```typescript
// Advanced pool analytics
const poolAnalytics = await memory.getPoolAnalytics('enterprise_research_hub', {
  timeRange: {
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),  // 30 days
    end: new Date()
  },
  includeUserMetrics: true,
  includeContentAnalysis: true,
  includePerformanceMetrics: true
})

console.log('Pool Analytics:', poolAnalytics)
// {
//   usage: {
//     totalMemories: 15234,
//     activeContributors: 23,
//     averageMemoriesPerDay: 45,
//     topContributors: [
//       { agentId: 'research_lead', count: 234, quality: 0.89 }
//     ]
//   },
//   content: {
//     topConcepts: ['machine learning', 'neural networks', 'ethics'],
//     conceptTrends: { emerging: [...], declining: [...] },
//     qualityDistribution: { high: 67%, medium: 28%, low: 5% },
//     typeDistribution: { knowledge: 45%, experience: 30%, observation: 25% }
//   },
//   performance: {
//     avgSearchTime: 34,         // ms
//     cacheHitRate: 0.87,
//     storageEfficiency: 0.92,
//     compressionRatio: 0.34
//   },
//   governance: {
//     complianceScore: 0.96,
//     moderationActions: 12,
//     duplicatesDetected: 23,
//     qualityIssues: 3
//   }
// }

// Pool governance operations
await memory.moderatePool('enterprise_research_hub', {
  removeDuplicates: true,
  enforceQualityGates: true,
  updatePermissions: {
    newRole: 'data_scientist',
    permissions: {
      read: MemoryPermission.ALL,
      write: MemoryPermission.APPROVED
    }
  }
})
```

## Advanced Archival Strategies

### Intelligent Archival Policies

```typescript
// Sophisticated archival configuration
const archivalPolicies = {
  policies: [
    {
      name: 'compress_old_episodic',
      type: ArchivalStrategy.COMPRESS,
      criteria: {
        tier: MemoryTierType.EPISODIC,
        age: 90 * 24 * 60 * 60 * 1000,      // 90 days
        importance: { max: 0.6 },
        accessFrequency: { max: 0.1 }       // Rarely accessed
      },
      compressionSettings: {
        algorithm: 'semantic_compression',
        ratio: 0.3,                         // Keep 30% of original detail
        preserveKeywords: true,
        preserveEmotions: true,
        preserveRelationships: true
      }
    },
    {
      name: 'summarize_working_overflow',
      type: ArchivalStrategy.SUMMARIZE,
      criteria: {
        tier: MemoryTierType.WORKING,
        count: { min: 1000 }                // When working memory is full
      },
      summarySettings: {
        maxLength: 500,
        preserveHighImportance: true,
        groupBySimilarity: true,
        extractKeyInsights: true
      }
    },
    {
      name: 'deep_archive_ancient',
      type: ArchivalStrategy.DEEP_ARCHIVE,
      criteria: {
        age: 365 * 24 * 60 * 60 * 1000,     // 1 year
        importance: { max: 0.4 },
        tier: [MemoryTierType.EPISODIC]
      },
      archiveSettings: {
        compressionLevel: 'maximum',
        encryptionEnabled: true,
        storageClass: 'cold'                // Move to cold storage
      }
    }
  ],
  
  // Global settings
  batchSize: 1000,
  enablePreview: true,
  createBackupBeforeArchival: true,
  notifyOnCompletion: true
}

await memory.configureAdvancedArchival(agentId, archivalPolicies)

// Execute archival with monitoring
const archivalResult = await memory.executeArchival(agentId, {
  dryRun: false,
  parallel: true,
  onProgress: (completed, total, currentPolicy) => {
    console.log(`Archival progress: ${completed}/${total} (${currentPolicy})`)
  }
})

console.log('Archival completed:', archivalResult)
// {
//   policiesExecuted: 3,
//   memoriesProcessed: 5234,
//   memoriesArchived: 3456,
//   memoriesCompressed: 2345,
//   memoriesDeepArchived: 1111,
//   spaceSaved: '2.3GB',
//   timeElapsed: 45000,  // ms
//   errors: []
// }
```

## Production Monitoring & Analytics

### Health Monitoring

```typescript
// Comprehensive health monitoring
const healthStatus = await memory.comprehensiveHealthCheck()
console.log('System Health:', healthStatus)

// {
//   overall: 'healthy',  // 'healthy', 'warning', 'critical'
//   components: {
//     database: {
//       status: 'healthy',
//       latency: 23,              // ms
//       connectionPoolUtilization: 0.65,
//       activeConnections: 13,
//       queuedConnections: 0
//     },
//     vectorSearch: {
//       status: 'healthy',
//       indexHealth: 0.96,
//       averageSearchTime: 45,    // ms
//       cacheHitRate: 0.89
//     },
//     consolidation: {
//       status: 'healthy',
//       lastRun: Date,
//       successRate: 0.98,
//       averageProcessingTime: 234 // ms per memory
//     },
//     archival: {
//       status: 'warning',
//       lastRun: Date,
//       backlogSize: 1234,
//       compressionEfficiency: 0.87
//     },
//     sharedPools: {
//       status: 'healthy',
//       activePools: 12,
//       syncLatency: 67,          // ms
//       conflictRate: 0.002       // 0.2%
//     }
//   },
//   recommendations: [
//     'Consider increasing archival frequency',
//     'Pool sync optimization available'
//   ]
// }

// Automated monitoring with alerts
memory.enableMonitoring({
  interval: 60000,                // 1 minute
  alertWebhook: process.env.ALERT_WEBHOOK_URL,
  thresholds: {
    maxQueryTime: 500,            // ms
    maxConnectionUtilization: 0.85,
    minCacheHitRate: 0.75,
    maxArchivalBacklog: 5000
  },
  
  // Custom metrics
  customMetrics: [
    {
      name: 'memory_quality_score',
      query: `
        SELECT AVG(importance) as avg_quality 
        FROM memories 
        WHERE created_at > NOW() - INTERVAL '1 hour'
      `,
      threshold: { min: 0.6 }
    }
  ]
})
```

### Performance Analytics

```typescript
// Detailed performance analytics
const perfAnalytics = await memory.getPerformanceAnalytics({
  timeRange: {
    start: new Date(Date.now() - 24 * 60 * 60 * 1000),  // 24 hours
    end: new Date()
  },
  includeQueryAnalysis: true,
  includeResourceUsage: true,
  includeOptimizationSuggestions: true
})

console.log('Performance Analytics:', perfAnalytics)
// {
//   queryPerformance: {
//     totalQueries: 15234,
//     avgResponseTime: 45,         // ms
//     p95ResponseTime: 123,        // ms
//     slowQueries: [
//       { query: 'SELECT ...', time: 234, frequency: 45 }
//     ]
//   },
//   resourceUsage: {
//     databaseSize: '2.3GB',
//     indexSize: '456MB',
//     connectionPoolUtilization: 0.67,
//     memoryUsage: '1.2GB',
//     cacheEfficiency: 0.89
//   },
//   memoryDistribution: {
//     byTier: { working: 234, episodic: 12456, semantic: 3456, procedural: 789 },
//     byType: { knowledge: 8234, experience: 5432, interaction: 2345 },
//     byImportance: { high: 2345, medium: 8976, low: 5432 }
//   },
//   optimizationSuggestions: [
//     {
//       type: 'index_optimization',
//       description: 'Add composite index on (agent_id, tier, timestamp)',
//       expectedImprovement: '23% faster tier queries'
//     },
//     {
//       type: 'archival_tuning',
//       description: 'Increase archival frequency for working memory',
//       expectedImprovement: 'Reduce memory footprint by 15%'
//     }
//   ]
// }
```

## Advanced Database Operations

### Schema Management

```typescript
// Advanced schema operations
const schemaInfo = await memory.getSchemaInfo()
console.log('Schema Information:', schemaInfo)
// {
//   version: '2.0.0',
//   tables: ['memories', 'shared_memory_pools', 'shared_memory_mappings', 'memory_concepts'],
//   indexes: ['idx_memories_vector', 'idx_memories_agent_tier', ...],
//   functions: ['calculate_memory_similarity', 'extract_concepts', ...],
//   extensions: ['vector', 'pg_trgm', 'btree_gin']
// }

// Database optimization
await memory.optimizeDatabase({
  vacuum: true,                   // Reclaim space
  analyze: true,                  // Update statistics
  reindex: false,                 // Rebuild indexes (expensive)
  updateExtensions: true          // Update pgvector if available
})

// Custom function deployment
await memory.deployCustomFunctions([
  {
    name: 'semantic_similarity',
    definition: `
      CREATE OR REPLACE FUNCTION semantic_similarity(
        embedding1 vector(1536),
        embedding2 vector(1536)
      ) RETURNS float AS $$
      BEGIN
        RETURN 1 - (embedding1 <=> embedding2);
      END;
      $$ LANGUAGE plpgsql;
    `
  }
])
```

### Backup & Recovery

```typescript
// Enterprise backup strategy
const backupConfig = {
  schedule: '0 2 * * *',          // Daily at 2 AM
  retention: {
    daily: 7,                     // Keep 7 daily backups
    weekly: 4,                    // Keep 4 weekly backups
    monthly: 12                   // Keep 12 monthly backups
  },
  compression: 'gzip',
  encryption: {
    enabled: true,
    algorithm: 'AES-256',
    keyRotation: true
  },
  storage: {
    local: './backups/',
    s3: {
      bucket: 'symindx-backups',
      region: 'us-west-2'
    }
  },
  verification: true              // Verify backup integrity
}

await memory.configureBackups(backupConfig)

// Manual backup with custom options
const backupResult = await memory.createBackup({
  type: 'full',                   // or 'incremental'
  compression: true,
  includeIndexes: true,
  includeStatistics: true,
  metadata: {
    reason: 'Pre-deployment backup',
    environment: 'production'
  }
})

console.log('Backup created:', backupResult.path)
```

## Best Practices

### 1. **Connection Management**
```typescript
// Optimal connection pool configuration
const productionConfig = {
  maxConnections: Math.min(
    process.env.NODE_ENV === 'production' ? 50 : 10,
    // Don't exceed database connection limit
    parseInt(process.env.DB_MAX_CONNECTIONS) || 100
  ),
  
  // Aggressive timeouts for high-throughput
  connectionTimeoutMillis: 3000,
  idleTimeoutMillis: 60000,
  
  // Monitor connection health
  enableHealthChecks: true,
  healthCheckInterval: 30000
}
```

### 2. **Vector Index Optimization**
```typescript
// Optimize for your use case
const vectorOptimization = {
  // For speed (more memory usage)
  speed: {
    indexType: 'hnsw',
    m: 16,
    efConstruction: 64,
    efSearch: 40
  },
  
  // For memory efficiency
  memory: {
    indexType: 'ivfflat',
    lists: 100,
    probes: 10
  }
}
```

### 3. **Query Optimization**
```typescript
// Use prepared statements for repeated queries
const preparedQueries = await memory.prepareBulkQueries([
  'search_semantic_memories',
  'consolidate_working_to_episodic',
  'get_recent_interactions'
])

// Batch operations for efficiency
await memory.batchOperation(agentId, memories, {
  operation: 'store',
  batchSize: 1000,
  useTransaction: true
})
```

### 4. **Error Handling & Resilience**
```typescript
// Implement circuit breaker pattern
const circuitBreaker = {
  failureThreshold: 5,
  resetTimeout: 30000,
  monitoringPeriod: 60000
}

memory.enableCircuitBreaker(circuitBreaker)

// Graceful degradation
try {
  await memory.search(agentId, embedding)
} catch (error) {
  if (error.code === 'CONNECTION_TIMEOUT') {
    // Fall back to cached results or simpler query
    return await memory.getCachedResults(agentId, query)
  }
  throw error
}
```

The enhanced PostgreSQL memory provider offers enterprise-grade reliability, performance, and scalability for production AI agent deployments, with comprehensive monitoring, automated optimization, and advanced collaboration features.
