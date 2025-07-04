---
sidebar_position: 3
title: "Supabase Memory Provider"
description: "Cloud-native memory storage with real-time sync, vector search, and instant deployment"
---

# Supabase Memory Provider

The enhanced Supabase memory provider delivers cutting-edge cloud-native memory storage with real-time synchronization, instant deployment, advanced vector search capabilities, and sophisticated multi-agent collaboration features. Built on PostgreSQL with pgvector, it offers enterprise-grade performance in a serverless package.

## ☁️ Key Features

- **Instant Deployment** - Zero-configuration setup with automatic schema and extension deployment
- **Real-time Synchronization** - Live memory updates across multiple agents and applications
- **Multi-Tier Memory Architecture** - Working, Episodic, Semantic, and Procedural memory tiers
- **pgvector Integration** - High-performance vector similarity search with HNSW indexing
- **Shared Memory Pools** - Real-time collaborative memory spaces for multi-agent systems
- **Automatic Consolidation** - Intelligent memory tier promotion with real-time triggers
- **Edge Functions Integration** - Serverless memory processing and custom logic
- **Built-in Authentication** - Row-level security and user-based memory isolation

## Installation & Setup

```bash
# Install Supabase client
npm install @supabase/supabase-js

# Provider is included in @symindx/memory
# Requires Supabase project with pgvector enabled
```

## Supabase Project Setup

### 1. Create Supabase Project

```bash
# Using Supabase CLI (recommended)
npx supabase init
npx supabase start

# Or create project at https://supabase.com/dashboard
```

### 2. Enable pgvector Extension

```sql
-- Run in Supabase SQL Editor
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS btree_gin;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

### 3. Configure Environment

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Basic Configuration

```typescript
import { SupabaseMemoryProvider } from '@symindx/memory/providers'

const memory = new SupabaseMemoryProvider({
  url: process.env.SUPABASE_URL,
  anonKey: process.env.SUPABASE_ANON_KEY,
  
  // Auto-deployment
  autoDeploySchema: true,
  
  // Real-time features
  enableRealtime: true,
  
  // Multi-tier processing
  consolidationInterval: 900000,  // 15 minutes
  archivalInterval: 10800000     // 3 hours
})
```

## Advanced Configuration

```typescript
const enterpriseMemory = new SupabaseMemoryProvider({
  url: process.env.SUPABASE_URL,
  anonKey: process.env.SUPABASE_ANON_KEY,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  
  // Database configuration
  autoDeploySchema: true,
  tableName: 'agent_memories',
  
  // Real-time configuration
  enableRealtime: true,
  realtimeConfig: {
    channels: ['memory_updates', 'shared_pools'],
    enablePresence: true,
    enableBroadcast: true,
    heartbeatInterval: 30000,
    reconnectInterval: 5000
  },
  
  // Vector search optimization
  vectorConfig: {
    dimensions: 1536,
    indexType: 'hnsw',
    distanceFunction: 'cosine',
    hnswM: 16,
    hnswEfConstruction: 64
  },
  
  // Multi-tier configuration
  consolidationInterval: 600000,   // 10 minutes - aggressive
  archivalInterval: 3600000,      // 1 hour
  enableServerlessConsolidation: true,  // Use edge functions
  
  // Shared memory pools
  enableSharedPools: true,
  maxSharedPools: 200,
  realTimePoolSync: true,
  
  // Authentication & security
  enableRLS: true,                 // Row Level Security
  userIsolation: 'strict',         // 'strict', 'shared', 'open'
  encryptSensitiveMemories: true,
  
  // Performance optimization
  enableConnectionPooling: true,
  maxConnections: 50,
  queryTimeout: 30000,
  cacheConfiguration: {
    enabled: true,
    ttl: 300000,                   // 5 minutes
    maxSize: 1000
  },
  
  // Edge Functions integration
  enableEdgeFunctions: true,
  edgeFunctionEndpoints: {
    consolidation: 'memory-consolidation',
    archival: 'memory-archival',
    analysis: 'memory-analysis'
  }
})
```

## Real-time Memory Synchronization

### Real-time Memory Updates

```typescript
// Subscribe to real-time memory updates
memory.on('memory_created', (payload) => {
  console.log('New memory created:', payload.new)
  // Update local state, notify UI, etc.
})

memory.on('memory_updated', (payload) => {
  console.log('Memory updated:', {
    old: payload.old,
    new: payload.new
  })
})

memory.on('memory_deleted', (payload) => {
  console.log('Memory deleted:', payload.old)
})

// Subscribe to tier changes
memory.on('memory_tier_changed', (payload) => {
  console.log('Memory tier changed:', {
    memoryId: payload.memory_id,
    oldTier: payload.old_tier,
    newTier: payload.new_tier,
    reason: payload.consolidation_reason
  })
})

// Subscribe to shared pool activities
memory.on('shared_pool_updated', (payload) => {
  console.log('Shared pool activity:', {
    poolId: payload.pool_id,
    action: payload.action,  // 'memory_added', 'memory_removed', 'permissions_changed'
    agentId: payload.agent_id
  })
})
```

### Presence & Collaboration

```typescript
// Track agent presence in shared memory spaces
const presenceConfig = {
  poolId: 'research_team_alpha',
  agentId: 'agent_001',
  status: 'active',
  metadata: {
    currentActivity: 'analyzing_research_data',
    location: 'semantic_memory_tier'
  }
}

await memory.joinPresence(presenceConfig)

// Subscribe to presence changes
memory.on('presence_join', (payload) => {
  console.log('Agent joined:', payload.agent_id)
})

memory.on('presence_leave', (payload) => {
  console.log('Agent left:', payload.agent_id)
})

// Broadcast real-time messages
await memory.broadcast('research_team_alpha', {
  type: 'memory_insight',
  message: 'Found important pattern in semantic memories',
  data: { conceptId: 'neural_plasticity', confidence: 0.94 }
})

memory.on('broadcast', (payload) => {
  console.log('Received broadcast:', payload)
})
```

## Multi-Tier Memory with Edge Functions

### Serverless Memory Consolidation

```typescript
// Deploy custom consolidation logic as edge function
const consolidationEdgeFunction = `
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  const { agent_id, memories } = await req.json()
  
  // Custom consolidation logic
  const consolidatedMemories = memories
    .filter(m => m.importance > 0.7)
    .map(m => ({
      ...m,
      tier: 'semantic',
      concepts: extractConcepts(m.content),
      consolidation_timestamp: new Date().toISOString()
    }))
  
  return new Response(
    JSON.stringify({ consolidatedMemories }),
    { headers: { "Content-Type": "application/json" } }
  )
})

function extractConcepts(content) {
  // AI-powered concept extraction
  return ['learning', 'problem_solving', 'creativity']
}
`

// Deploy edge function
await memory.deployEdgeFunction('memory-consolidation', consolidationEdgeFunction)

// Use serverless consolidation
const consolidationResult = await memory.consolidateWithEdgeFunction(
  agentId,
  'memory-consolidation',
  {
    batchSize: 100,
    enableParallel: true,
    onProgress: (completed, total) => {
      console.log(`Edge consolidation: ${completed}/${total}`)
    }
  }
)
```

### Real-time Memory Analytics

```typescript
// Edge function for real-time memory analysis
const analyticsEdgeFunction = `
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL'),
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  )
  
  const { agent_id, analysis_type } = await req.json()
  
  // Real-time memory pattern analysis
  const { data: memories } = await supabase
    .from('memories')
    .select('*')
    .eq('agent_id', agent_id)
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
  
  const analysis = {
    patterns: detectPatterns(memories),
    concepts: extractTrendingConcepts(memories),
    recommendations: generateRecommendations(memories)
  }
  
  return new Response(JSON.stringify(analysis))
})
`

// Real-time analytics with edge functions
const analytics = await memory.getRealtimeAnalytics(agentId, {
  useEdgeFunction: true,
  analysisTypes: ['patterns', 'concepts', 'recommendations'],
  streamResults: true
})

// Stream analytics updates
analytics.on('pattern_detected', (pattern) => {
  console.log('New pattern detected:', pattern)
})

analytics.on('concept_emerging', (concept) => {
  console.log('Emerging concept:', concept)
})
```

## Advanced Vector Search

### Real-time Vector Search

```typescript
// High-performance vector search with real-time updates
const searchResults = await memory.search(agentId, queryEmbedding, {
  limit: 20,
  minSimilarity: 0.75,
  
  // Real-time features
  enableRealtimeUpdates: true,
  subscribeToNewMatches: true,
  
  // Advanced filtering
  filters: {
    tier: [MemoryTierType.SEMANTIC, MemoryTierType.EPISODIC],
    type: [MemoryType.KNOWLEDGE, MemoryType.EXPERIENCE],
    importance: { min: 0.6 },
    concepts: { include: ['research', 'discovery'] },
    
    // Time-based filtering
    timeRange: {
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),  // Last 7 days
      end: new Date()
    },
    
    // Collaboration filtering
    sharedInPools: ['research_team_alpha'],
    collaborators: ['agent_002', 'agent_003']
  },
  
  // Result enhancement
  includeContext: true,
  includeConcepts: true,
  includeCollaborationMetadata: true,
  
  // Real-time options
  liveUpdates: true,
  updateThreshold: 0.8  // Only notify for high-relevance new matches
})

// Subscribe to real-time search updates
searchResults.on('new_match', (newMemory) => {
  console.log('New matching memory found:', newMemory)
})

searchResults.on('match_updated', (updatedMemory) => {
  console.log('Existing match updated:', updatedMemory)
})
```

### Collaborative Vector Search

```typescript
// Multi-agent collaborative search
const collaborativeSearch = await memory.collaborativeSearch({
  participants: ['agent_001', 'agent_002', 'agent_003'],
  query: queryEmbedding,
  
  // Collaboration parameters
  consensusThreshold: 0.6,        // Agreement threshold
  diversityWeight: 0.3,           // Promote diverse results
  expertiseWeighting: true,       // Weight by agent expertise
  
  // Search parameters
  limit: 30,
  minSimilarity: 0.7,
  
  // Real-time collaboration
  enableLiveVoting: true,         // Agents can vote on results
  enableRealTimeRanking: true,    // Dynamic re-ranking
  
  // Result aggregation
  aggregationMethod: 'weighted_average',  // or 'consensus', 'max_score'
  explainScoring: true
})

console.log('Collaborative search results:', collaborativeSearch)
// {
//   results: [...],
//   consensus: {
//     highConsensus: [...],      // Results all agents agree on
//     moderateConsensus: [...],  // Results with some agreement
//     controversial: [...]       // Results with disagreement
//   },
//   expertise: {
//     agent_001: { domain: 'research', weight: 0.4 },
//     agent_002: { domain: 'analysis', weight: 0.3 },
//     agent_003: { domain: 'synthesis', weight: 0.3 }
//   }
// }
```

## Enterprise Shared Memory Pools

### Real-time Shared Pool Management

```typescript
// Enterprise shared memory pool with real-time features
const enterprisePoolConfig: EnterpriseSharedMemoryConfig = {
  poolId: 'global_research_network',
  name: 'Global Research Network',
  description: 'Enterprise-wide knowledge sharing for research teams',
  
  // Advanced access control
  participants: {
    research_leads: {
      agents: ['agent_001', 'agent_002'],
      permissions: {
        read: MemoryPermission.ALL,
        write: MemoryPermission.ALL,
        moderate: MemoryPermission.ALL,
        admin: MemoryPermission.OWNER
      }
    },
    researchers: {
      agents: ['agent_003', 'agent_004', 'agent_005'],
      permissions: {
        read: MemoryPermission.ALL,
        write: MemoryPermission.APPROVED,
        moderate: MemoryPermission.NONE
      }
    },
    observers: {
      agents: ['agent_006'],
      permissions: {
        read: MemoryPermission.PUBLIC,
        write: MemoryPermission.NONE
      }
    }
  },
  
  // Real-time configuration
  realtime: {
    enableLiveSync: true,
    enablePresence: true,
    enableBroadcast: true,
    enableTypingIndicators: true,
    conflictResolution: 'last_writer_wins'  // or 'merge', 'version_control'
  },
  
  // Quality and governance
  qualityGates: {
    minImportance: 0.6,
    requirePeerReview: true,
    enableAutoModeration: true,
    duplicateDetection: 'semantic',  // or 'exact', 'fuzzy'
    contentValidation: {
      enableProfanityFilter: true,
      enableFactChecking: false,
      enableBiasDetection: true
    }
  },
  
  // Pool policies
  maxMemories: 1000000,
  maxSizePerMemory: '50MB',
  totalSizeLimit: '10GB',
  
  // Retention and archival
  retentionPolicy: {
    duration: 94608000000,        // 3 years
    archiveOnExpiry: true,
    enableVersionHistory: true,
    maxVersions: 10
  },
  
  // Performance optimization
  indexStrategy: 'aggressive',
  cacheStrategy: 'distributed',
  compressionEnabled: true,
  
  // Integration features
  enableWebhooks: true,
  webhookEndpoints: {
    onMemoryAdded: 'https://api.company.com/webhooks/memory-added',
    onQualityIssue: 'https://api.company.com/webhooks/quality-alert'
  },
  
  // Analytics and monitoring
  enableAdvancedAnalytics: true,
  enableUsageMetrics: true,
  enablePerformanceMonitoring: true
}

await memory.createEnterprisePool(enterprisePoolConfig)
```

### Real-time Pool Analytics

```typescript
// Real-time pool analytics dashboard
const poolAnalytics = await memory.createRealtimeAnalytics('global_research_network', {
  updateInterval: 30000,          // 30 seconds
  metrics: [
    'active_participants',
    'memory_velocity',            // Memories added per hour
    'collaboration_index',        // Cross-agent interaction score
    'knowledge_depth',           // Semantic complexity score
    'quality_trend',             // Quality improvement over time
    'concept_evolution'          // Emerging vs declining concepts
  ],
  
  enablePredictiveAnalytics: true,
  enableAnomalyDetection: true,
  enableTrendAnalysis: true
})

// Subscribe to real-time analytics
poolAnalytics.on('metric_update', (metric) => {
  console.log(`${metric.name}: ${metric.value} (${metric.trend})`)
})

poolAnalytics.on('anomaly_detected', (anomaly) => {
  console.log('Anomaly detected:', anomaly)
  // {
  //   type: 'unusual_memory_pattern',
  //   description: 'Sudden spike in low-quality memories',
  //   confidence: 0.87,
  //   recommendedAction: 'increase_moderation'
  // }
})

poolAnalytics.on('trend_identified', (trend) => {
  console.log('Trend identified:', trend)
  // {
  //   type: 'emerging_concept',
  //   concept: 'quantum_machine_learning',
  //   growth_rate: 0.34,
  //   participants: ['agent_001', 'agent_003'],
  //   confidence: 0.92
  // }
})
```

## Supabase-Specific Features

### Row Level Security (RLS)

```typescript
// Configure advanced RLS policies
const rlsPolicies = [
  {
    name: 'agent_memory_isolation',
    table: 'memories',
    policy: `
      (agent_id = auth.uid()::text) OR
      (id IN (
        SELECT memory_id FROM shared_memory_mappings 
        WHERE pool_id IN (
          SELECT pool_id FROM shared_memory_pools 
          WHERE auth.uid()::text = ANY(participants)
        )
      ))
    `
  },
  {
    name: 'shared_pool_access',
    table: 'shared_memory_pools',
    policy: `auth.uid()::text = ANY(participants) OR visibility = 'public'`
  },
  {
    name: 'admin_override',
    table: 'memories',
    policy: `
      EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
      )
    `
  }
]

await memory.deployRLSPolicies(rlsPolicies)

// Test RLS policies
const securityTest = await memory.testRLSSecurity({
  testUsers: ['agent_001', 'agent_002', 'admin_user'],
  testScenarios: [
    'access_own_memories',
    'access_shared_memories',
    'access_restricted_memories',
    'admin_access_all'
  ]
})

console.log('Security test results:', securityTest)
```

### Supabase Auth Integration

```typescript
// Integrate with Supabase Auth
const authIntegratedMemory = new SupabaseMemoryProvider({
  url: process.env.SUPABASE_URL,
  anonKey: process.env.SUPABASE_ANON_KEY,
  
  // Auth configuration
  authConfig: {
    enableAuthIntegration: true,
    enableUserContext: true,
    enableSessionManagement: true,
    autoCreateAgentProfiles: true
  },
  
  // User-based memory isolation
  userIsolation: 'strict',
  enableRLS: true,
  
  // Multi-tenancy support
  enableMultiTenancy: true,
  tenantIsolation: 'database'  // or 'schema', 'row'
})

// Authenticate agent with Supabase
await authIntegratedMemory.authenticateAgent({
  email: 'agent001@company.com',
  password: 'secure_password',
  agentMetadata: {
    name: 'Research Agent Alpha',
    role: 'researcher',
    department: 'ai_research',
    clearanceLevel: 'standard'
  }
})

// User context is automatically included in all operations
const userContextMemories = await authIntegratedMemory.retrieve(
  'current_agent',  // Uses authenticated agent ID
  'recent research findings'
)
```

## Performance Optimization

### Supabase-Specific Optimizations

```typescript
// Optimize for Supabase's infrastructure
const optimizedMemory = new SupabaseMemoryProvider({
  url: process.env.SUPABASE_URL,
  anonKey: process.env.SUPABASE_ANON_KEY,
  
  // Connection optimization
  connectionConfig: {
    maxConnections: 50,           // Supabase connection limits
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 300000,    // 5 minutes
    enableConnectionRetry: true,
    retryAttempts: 3,
    retryDelay: 1000
  },
  
  // Query optimization
  queryOptimization: {
    enablePreparedStatements: true,
    enableQueryCaching: true,
    cacheTTL: 300000,             // 5 minutes
    enableBatchQueries: true,
    maxBatchSize: 1000,
    
    // Supabase PostgREST optimization
    enableResourceEmbedding: true,
    enableResponseCaching: true,
    enableRequestDeduplication: true
  },
  
  // Real-time optimization
  realtimeOptimization: {
    enableChannelOptimization: true,
    maxChannelsPerConnection: 100,
    enablePresenceOptimization: true,
    enableBroadcastBuffering: true,
    broadcastBufferSize: 100
  },
  
  // Edge optimization
  edgeOptimization: {
    enableEdgeFunctionCaching: true,
    enableGlobalDistribution: true,
    preferClosestRegion: true,
    enableCDNIntegration: true
  }
})
```

### Monitoring & Observability

```typescript
// Comprehensive Supabase monitoring
const monitoring = await memory.enableSupabaseMonitoring({
  metrics: [
    'connection_pool_utilization',
    'query_performance',
    'realtime_latency',
    'edge_function_performance',
    'storage_usage',
    'bandwidth_usage',
    'auth_operations',
    'rls_policy_performance'
  ],
  
  // Supabase Dashboard integration
  enableDashboardIntegration: true,
  
  // Custom alerts
  alerts: [
    {
      name: 'high_connection_usage',
      condition: 'connection_pool_utilization > 0.8',
      action: 'scale_connections'
    },
    {
      name: 'slow_queries',
      condition: 'avg_query_time > 500',  // ms
      action: 'optimize_indexes'
    },
    {
      name: 'realtime_lag',
      condition: 'realtime_latency > 1000',  // ms
      action: 'check_network'
    }
  ],
  
  // Performance budgets
  performanceBudgets: {
    maxQueryTime: 500,            // ms
    maxRealtimeLatency: 200,      // ms
    maxStorageGrowth: '1GB/day',
    maxBandwidthUsage: '10GB/day'
  }
})

// Export monitoring data
const monitoringReport = await monitoring.generateReport({
  timeRange: {
    start: new Date(Date.now() - 24 * 60 * 60 * 1000),  // 24 hours
    end: new Date()
  },
  includeRecommendations: true,
  includeOptimizationSuggestions: true,
  format: 'json'  // or 'pdf', 'csv'
})

console.log('Monitoring Report:', monitoringReport)
```

## Best Practices

### 1. **Real-time Optimization**
```typescript
// Optimize real-time connections
const realtimeConfig = {
  // Use specific channels instead of wildcard subscriptions
  channels: ['memory_updates', 'pool_changes'],
  
  // Enable presence only when needed
  enablePresence: activeCollaborationMode,
  
  // Batch broadcasts to reduce overhead
  enableBroadcastBatching: true,
  batchSize: 10,
  batchInterval: 1000  // 1 second
}
```

### 2. **Security Best Practices**
```typescript
// Implement defense in depth
const securityConfig = {
  // Always use RLS
  enableRLS: true,
  
  // Encrypt sensitive memories
  encryptSensitiveMemories: true,
  encryptionKey: process.env.MEMORY_ENCRYPTION_KEY,
  
  // Audit trail
  enableAuditLog: true,
  auditSensitiveOperations: true,
  
  // Rate limiting
  enableRateLimiting: true,
  rateLimits: {
    memoryCreation: { requests: 100, window: 60000 },
    vectorSearch: { requests: 50, window: 60000 }
  }
}
```

### 3. **Cost Optimization**
```typescript
// Optimize Supabase usage costs
const costOptimization = {
  // Efficient data transfer
  enableCompression: true,
  minimizePayloads: true,
  useProjection: true,  // Only fetch needed columns
  
  // Smart caching
  enableIntelligentCaching: true,
  cacheHotData: true,
  preloadFrequentQueries: true,
  
  // Archival strategy
  archiveOldMemories: true,
  archiveThreshold: 90 * 24 * 60 * 60 * 1000,  // 90 days
  enableAutoCleanup: true
}
```

The enhanced Supabase memory provider offers unparalleled real-time collaboration capabilities, instant deployment, and enterprise-grade features in a serverless package, making it perfect for modern AI agent applications requiring live synchronization and collaborative intelligence.

---

*This documentation is being actively developed. Check back for updates.*
