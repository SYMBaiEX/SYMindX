---
sidebar_position: 4
title: "Neon Memory Provider"
description: "Serverless PostgreSQL with auto-scaling, branching, and instant cold starts"
---

# Neon Memory Provider

The enhanced Neon memory provider delivers cutting-edge serverless PostgreSQL memory storage with automatic scaling, database branching, instant cold starts, and advanced multi-tier memory architecture. Built for modern cloud-native applications that demand elastic performance and cost efficiency.

## ⚡ Key Features

- **True Serverless Architecture** - Automatic scaling from zero to massive throughput
- **Instant Cold Starts** - Sub-second activation from dormant state
- **Database Branching** - Git-like branching for memory experimentation and testing
- **Multi-Tier Memory Architecture** - Working, Episodic, Semantic, and Procedural memory tiers
- **pgvector Integration** - High-performance vector similarity search with automatic indexing
- **Shared Memory Pools** - Distributed memory collaboration with automatic replication
- **Auto-Scaling Consolidation** - Memory processing that scales with demand
- **Pay-per-Use** - Only pay for actual compute and storage consumption

## Installation & Setup

```bash
# Install Neon serverless driver
npm install @neondatabase/serverless

# Provider is included in @symindx/memory
# Requires Neon project with pgvector enabled
```

## Neon Project Setup

### 1. Create Neon Project

```bash
# Using Neon CLI (recommended)
npm install -g neonctl
neonctl auth
neonctl projects create --name symindx-memory

# Or create project at https://console.neon.tech
```

### 2. Configure Database

```bash
# Create database and enable extensions
neonctl databases create --name symindx_memory
neonctl sql --database symindx_memory --command "
  CREATE EXTENSION IF NOT EXISTS vector;
  CREATE EXTENSION IF NOT EXISTS btree_gin;
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
"
```

### 3. Environment Configuration

```env
# Neon connection string (serverless-optimized)
NEON_DATABASE_URL=postgresql://username:password@ep-name.region.neon.tech/symindx_memory?sslmode=require

# Connection pooling (optional but recommended)
NEON_DATABASE_URL_POOLED=postgresql://username:password@ep-name-pooler.region.neon.tech/symindx_memory?sslmode=require
```

## Basic Configuration

```typescript
import { NeonMemoryProvider } from '@symindx/memory/providers'

const memory = new NeonMemoryProvider({
  connectionString: process.env.NEON_DATABASE_URL,
  
  // Serverless optimization
  enableServerlessOptimization: true,
  
  // Auto-deployment
  autoDeploySchema: true,
  
  // Auto-scaling configuration
  enableAutoScaling: true,
  
  // Multi-tier processing
  consolidationInterval: 600000,   // 10 minutes
  archivalInterval: 7200000       // 2 hours
})
```

## Advanced Configuration

```typescript
const enterpriseMemory = new NeonMemoryProvider({
  connectionString: process.env.NEON_DATABASE_URL,
  pooledConnectionString: process.env.NEON_DATABASE_URL_POOLED,
  
  // Serverless optimization
  enableServerlessOptimization: true,
  serverlessConfig: {
    autosuspendDelay: 300,         // 5 minutes - suspend after inactivity
    minComputeUnits: 0.25,         // Minimum allocation
    maxComputeUnits: 4,            // Maximum allocation
    enableInstantActivation: true,
    enableAutoScaling: true,
    scaleUpThreshold: 0.7,         // Scale up at 70% utilization
    scaleDownThreshold: 0.3        // Scale down at 30% utilization
  },
  
  // Connection management
  connectionConfig: {
    maxConnections: 100,           // Neon can handle many connections
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 60000,
    enableConnectionRetry: true,
    retryAttempts: 5,
    retryDelay: 2000,
    
    // Serverless-specific settings
    enableConnectionPooling: true,
    usePooledConnections: true,    // Use pooled connections for better performance
    poolConnectionRatio: 0.7       // 70% pooled, 30% direct
  },
  
  // Database configuration
  autoDeploySchema: true,
  tableName: 'agent_memories',
  enableBranching: true,           // Enable Neon branching features
  
  // Vector search optimization
  vectorConfig: {
    dimensions: 1536,
    indexType: 'hnsw',
    distanceFunction: 'cosine',
    hnswM: 16,
    hnswEfConstruction: 64,
    enableAutoIndexing: true,      // Automatically optimize indexes
    enableMaintenanceWindow: true   // Schedule maintenance during low usage
  },
  
  // Multi-tier configuration with auto-scaling
  consolidationInterval: 300000,   // 5 minutes - aggressive
  archivalInterval: 1800000,      // 30 minutes
  enableServerlessConsolidation: true,
  
  // Auto-scaling memory processing
  autoScalingConfig: {
    enableMemoryProcessingScaling: true,
    minProcessingUnits: 0.1,
    maxProcessingUnits: 2,
    scaleBasedOnMemoryLoad: true,
    scaleBasedOnQueryComplexity: true
  },
  
  // Shared memory pools
  enableSharedPools: true,
  maxSharedPools: 500,
  
  // Cost optimization
  costOptimization: {
    enableSmartSuspend: true,      // Intelligent suspend based on usage patterns
    enableComputeOptimization: true,
    enableStorageOptimization: true,
    enableQueryOptimization: true,
    
    // Usage patterns
    predictUsagePatterns: true,
    optimizeForCostVsPerformance: 'balanced'  // 'cost', 'performance', 'balanced'
  },
  
  // Monitoring and observability
  enableDetailedMetrics: true,
  enableCostTracking: true,
  enablePerformanceInsights: true
})
```

## Serverless Auto-Scaling Features

### Intelligent Auto-Scaling

```typescript
// Configure intelligent auto-scaling based on memory workload
const autoScalingConfig = {
  memoryWorkloadScaling: {
    enabled: true,
    
    // Scaling triggers
    triggers: {
      memoryCreationRate: {
        scaleUpThreshold: 100,      // memories/minute
        scaleDownThreshold: 10,
        scaleUpFactor: 1.5,
        scaleDownFactor: 0.7
      },
      
      vectorSearchLoad: {
        scaleUpThreshold: 50,       // searches/minute
        scaleDownThreshold: 5,
        scaleUpFactor: 2.0,
        scaleDownFactor: 0.5
      },
      
      consolidationBacklog: {
        scaleUpThreshold: 1000,     // memories pending consolidation
        scaleDownThreshold: 100,
        scaleUpFactor: 2.5,
        scaleDownFactor: 0.6
      }
    },
    
    // Scaling constraints
    constraints: {
      minComputeUnits: 0.25,
      maxComputeUnits: 8,
      scaleUpCooldown: 60000,      // 1 minute
      scaleDownCooldown: 300000,   // 5 minutes
      maxScaleUpsPerHour: 10
    },
    
    // Predictive scaling
    enablePredictiveScaling: true,
    predictionWindow: 1800000,     // 30 minutes
    confidenceThreshold: 0.8
  }
}

await memory.configureAutoScaling(autoScalingConfig)

// Monitor scaling events
memory.on('scale_up', (event) => {
  console.log('Scaling up:', {
    fromUnits: event.previous_compute_units,
    toUnits: event.new_compute_units,
    reason: event.trigger_reason,
    timestamp: event.timestamp
  })
})

memory.on('scale_down', (event) => {
  console.log('Scaling down:', {
    fromUnits: event.previous_compute_units,
    toUnits: event.new_compute_units,
    reason: event.trigger_reason,
    cost_savings: event.estimated_cost_savings
  })
})
```

### Serverless Memory Processing

```typescript
// Serverless memory consolidation that scales with demand
const serverlessConsolidation = await memory.configureServerlessConsolidation({
  processingStrategy: 'demand_based',  // or 'scheduled', 'hybrid'
  
  // Auto-scaling processing
  autoScaling: {
    enabled: true,
    minProcessingUnits: 0.1,
    maxProcessingUnits: 4,
    
    // Scaling based on workload characteristics
    scaleBasedOn: [
      'memory_backlog_size',
      'processing_complexity',
      'historical_patterns',
      'cost_optimization'
    ]
  },
  
  // Processing optimization
  batchOptimization: {
    dynamicBatchSizing: true,
    minBatchSize: 10,
    maxBatchSize: 1000,
    adaptToComputeUnits: true
  },
  
  // Cost optimization
  costOptimization: {
    preferBatchProcessing: true,
    enableSpotCompute: false,      // Neon doesn't have spot instances yet
    optimizeForTotalCost: true
  }
})

// Execute serverless consolidation
const consolidationResult = await memory.executeServerlessConsolidation(
  agentId,
  {
    autoScale: true,
    targetCostPerMemory: 0.001,    // $0.001 per memory processed
    maxDuration: 1800000,          // 30 minutes max
    enableCostMonitoring: true,
    
    onScaleEvent: (event) => {
      console.log(`Processing scaled: ${event.previous_units} -> ${event.new_units}`)
    },
    
    onCostAlert: (alert) => {
      console.log(`Cost alert: ${alert.message}`)
    }
  }
)

console.log('Serverless consolidation result:', {
  memoriesProcessed: consolidationResult.count,
  computeUnitsUsed: consolidationResult.compute_units_consumed,
  totalCost: consolidationResult.estimated_cost,
  averageCostPerMemory: consolidationResult.cost_per_memory,
  processingTime: consolidationResult.duration
})
```

## Database Branching for Memory Experimentation

### Git-like Memory Branching

```typescript
// Create development branch for memory experimentation
const experimentBranch = await memory.createBranch({
  name: 'memory_experiment_v2',
  description: 'Testing new consolidation algorithms',
  fromBranch: 'main',           // or from specific point in time
  
  // Branch configuration
  settings: {
    inheritFromParent: true,
    enableAutoMerge: false,
    isolationLevel: 'complete',   // 'complete', 'shared_pools_only', 'read_only'
    
    // Resource allocation for branch
    computeUnits: 0.5,
    storageLimit: '10GB',
    enableAutoSuspend: true,
    suspendAfter: 600000          // 10 minutes
  }
})

console.log('Experiment branch created:', experimentBranch)
// {
//   branchId: 'br_exp_abc123',
//   connectionString: 'postgresql://...',
//   createdAt: '2025-01-02T...',
//   parentBranch: 'main',
//   computeEndpoint: 'ep-experiment-abc123'
// }

// Switch memory provider to use experiment branch
const experimentMemory = new NeonMemoryProvider({
  connectionString: experimentBranch.connectionString,
  branchId: experimentBranch.branchId,
  enableExperimentalFeatures: true
})

// Run memory experiments on branch
const experimentResults = await experimentMemory.runMemoryExperiment({
  agentId: 'test_agent_001',
  experimentType: 'consolidation_algorithm_comparison',
  
  algorithms: [
    'importance_based_v1',
    'importance_based_v2',
    'concept_density_based',
    'temporal_significance_based'
  ],
  
  testDataset: {
    memoryCount: 10000,
    diversityScore: 0.8,
    includeEdgeCases: true
  },
  
  metrics: [
    'consolidation_accuracy',
    'processing_speed',
    'memory_efficiency',
    'concept_preservation',
    'cost_effectiveness'
  ]
})

// Compare experiment results
const comparison = await memory.compareBranchResults(
  'main',
  experimentBranch.branchId,
  {
    compareMetrics: ['accuracy', 'speed', 'cost'],
    includeStatisticalSignificance: true,
    confidenceLevel: 0.95
  }
)

console.log('Experiment comparison:', comparison)
// {
//   winner: 'experiment_branch',
//   improvements: {
//     accuracy: { improvement: '12%', significance: 0.001 },
//     speed: { improvement: '8%', significance: 0.05 },
//     cost: { improvement: '-5%', significance: 0.2 }  // 5% cost reduction
//   },
//   recommendation: 'merge_to_main'
// }

// Merge successful experiment to main
if (comparison.recommendation === 'merge_to_main') {
  const mergeResult = await memory.mergeBranch(
    experimentBranch.branchId,
    'main',
    {
      mergeStrategy: 'algorithm_update',
      preserveExperimentData: true,
      enableRollback: true,
      
      // Post-merge validation
      runValidationTests: true,
      validationCriteria: {
        maxPerformanceRegression: 0.05,  // 5%
        maxCostIncrease: 0.02            // 2%
      }
    }
  )
  
  console.log('Merge completed:', mergeResult)
}
```

### Time-Travel and Point-in-Time Recovery

```typescript
// Create point-in-time snapshots
const snapshot = await memory.createSnapshot({
  name: 'pre_algorithm_change',
  description: 'Snapshot before deploying new consolidation algorithm',
  includeIndexes: true,
  includeConfiguration: true
})

// Time-travel to specific point for analysis
const timeTravel = await memory.createTimeTravel({
  targetTimestamp: new Date('2024-12-01T10:00:00Z'),
  branchName: 'time_travel_analysis',
  purpose: 'analyze_memory_patterns_before_issue'
})

// Analyze historical memory patterns
const historicalAnalysis = await memory.analyzeHistoricalPatterns(
  timeTravel.branchId,
  {
    analysisWindow: 7 * 24 * 60 * 60 * 1000,  // 7 days
    compareWith: 'current_state',
    includeMemoryEvolution: true,
    includeConceptEvolution: true
  }
)

console.log('Historical analysis:', historicalAnalysis)
```

## Cost-Optimized Memory Operations

### Intelligent Cost Management

```typescript
// Configure cost-aware memory operations
const costOptimizedConfig = {
  // Budget management
  budgetLimits: {
    dailyBudget: 50,              // $50/day
    monthlyBudget: 1000,          // $1000/month
    alertThresholds: [0.5, 0.8, 0.95],  // 50%, 80%, 95%
    autoSuspendAtBudgetLimit: true
  },
  
  // Cost optimization strategies
  optimizationStrategies: {
    // Compute optimization
    enableSmartSuspend: true,
    suspendDuringInactivity: true,
    preferBatchProcessing: true,
    
    // Storage optimization
    enableCompressionTiers: true,
    archiveOldMemories: true,
    deduplicateMemories: true,
    
    // Query optimization
    enableQueryCaching: true,
    optimizeIndexUsage: true,
    preferColdStorageForArchival: true
  },
  
  // Usage pattern optimization
  usagePatternOptimization: {
    enablePredictiveScaling: true,
    learnFromUsagePatterns: true,
    optimizeForRecurringWorkloads: true,
    scheduleMaintenanceDuringLowUsage: true
  }
}

await memory.configureCostOptimization(costOptimizedConfig)

// Real-time cost monitoring
const costMonitor = await memory.enableCostMonitoring({
  trackingInterval: 60000,        // 1 minute
  enableRealTimeAlerts: true,
  enableCostPrediction: true,
  enableOptimizationSuggestions: true
})

costMonitor.on('cost_alert', (alert) => {
  console.log('Cost alert:', {
    level: alert.level,           // 'warning', 'critical'
    currentCost: alert.current_cost,
    projectedCost: alert.projected_cost,
    budgetUtilization: alert.budget_utilization,
    recommendations: alert.optimization_suggestions
  })
})

costMonitor.on('optimization_opportunity', (opportunity) => {
  console.log('Cost optimization opportunity:', {
    type: opportunity.type,
    potentialSavings: opportunity.estimated_savings,
    implementation: opportunity.implementation_steps,
    effort: opportunity.implementation_effort
  })
})
```

### Usage-Based Auto-Optimization

```typescript
// Auto-optimize based on usage patterns
const usageOptimizer = await memory.enableUsageBasedOptimization({
  analysisWindow: 7 * 24 * 60 * 60 * 1000,  // 7 days
  
  // Pattern recognition
  recognizePatterns: {
    dailyUsagePatterns: true,
    weeklyUsagePatterns: true,
    seasonalPatterns: false,      // Not enough data yet
    workloadCharacteristics: true
  },
  
  // Optimization actions
  enabledOptimizations: [
    'predictive_scaling',
    'intelligent_suspend',
    'workload_scheduling',
    'resource_right_sizing',
    'query_optimization',
    'storage_optimization'
  ],
  
  // Safety constraints
  constraints: {
    maxPerformanceImpact: 0.1,    // 10% max performance impact
    maxCostReduction: 0.5,        // 50% max cost reduction (sanity check)
    minAvailability: 0.99,        // 99% minimum availability
    requireApprovalForMajorChanges: true
  }
})

// Get optimization recommendations
const recommendations = await usageOptimizer.generateRecommendations()
console.log('Usage-based recommendations:', recommendations)
// {
//   immediate: [
//     {
//       type: 'suspend_schedule',
//       description: 'Suspend compute between 2-6 AM daily',
//       estimatedSavings: '$15/month',
//       implementationComplexity: 'low'
//     }
//   ],
//   
//   medium_term: [
//     {
//       type: 'right_size_compute',
//       description: 'Reduce max compute units from 4 to 2',
//       estimatedSavings: '$50/month',
//       implementationComplexity: 'medium'
//     }
//   ],
//   
//   long_term: [
//     {
//       type: 'archival_strategy',
//       description: 'Implement tiered storage for old memories',
//       estimatedSavings: '$100/month',
//       implementationComplexity: 'high'
//     }
//   ]
// }
```

## Advanced Vector Search with Auto-Scaling

### Serverless Vector Operations

```typescript
// Auto-scaling vector search that adapts to query complexity
const vectorSearchResults = await memory.search(agentId, queryEmbedding, {
  limit: 50,
  minSimilarity: 0.75,
  
  // Serverless optimization
  enableAutoScaling: true,
  autoScalingConfig: {
    scaleBasedOnQueryComplexity: true,
    scaleBasedOnResultSetSize: true,
    scaleBasedOnFilterComplexity: true,
    
    // Cost constraints
    maxComputeUnitsForQuery: 2,
    maxCostPerQuery: 0.01,        // $0.01 max per query
    preferCostOverSpeed: false
  },
  
  // Advanced filtering with cost awareness
  filters: {
    tier: [MemoryTierType.SEMANTIC, MemoryTierType.EPISODIC],
    type: [MemoryType.KNOWLEDGE, MemoryType.EXPERIENCE],
    importance: { min: 0.6 },
    concepts: { include: ['research', 'innovation'] },
    
    // Time-based filtering
    timeRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),  // 30 days
      end: new Date()
    }
  },
  
  // Result enhancement
  includeContext: true,
  includeConcepts: true,
  includeMetrics: true,
  
  // Cost tracking
  trackCost: true,
  includePerformanceMetrics: true
})

console.log('Vector search results:', {
  results: vectorSearchResults.memories,
  performance: {
    queryTime: vectorSearchResults.queryTime,
    computeUnitsUsed: vectorSearchResults.computeUnitsUsed,
    estimatedCost: vectorSearchResults.estimatedCost,
    autoScalingEvents: vectorSearchResults.scalingEvents
  }
})
```

### Batch Vector Processing

```typescript
// Cost-efficient batch vector processing
const batchVectorOperations = await memory.batchVectorProcess({
  operations: [
    {
      type: 'similarity_search',
      agentId: 'agent_001',
      embedding: embedding1,
      options: { limit: 20, minSimilarity: 0.8 }
    },
    {
      type: 'concept_clustering',
      agentId: 'agent_001',
      memoryIds: ['mem_001', 'mem_002', 'mem_003'],
      options: { clusterCount: 5 }
    },
    {
      type: 'semantic_analysis',
      agentId: 'agent_001',
      textContent: 'Complex research findings...',
      options: { extractConcepts: true, analyzeSentiment: true }
    }
  ],
  
  // Batch optimization
  batchConfig: {
    enableAutoScaling: true,
    optimizeForCost: true,
    maxTotalCost: 0.10,           // $0.10 max for entire batch
    preferParallelProcessing: true,
    enableResultCaching: true
  }
})

console.log('Batch processing results:', batchVectorOperations)
```

## Performance Monitoring & Analytics

### Serverless Performance Insights

```typescript
// Comprehensive serverless performance monitoring
const performanceInsights = await memory.getPerformanceInsights({
  timeRange: {
    start: new Date(Date.now() - 24 * 60 * 60 * 1000),  // 24 hours
    end: new Date()
  },
  
  // Serverless-specific metrics
  includeServerlessMetrics: true,
  metrics: [
    'cold_start_frequency',
    'cold_start_duration',
    'auto_scaling_efficiency',
    'compute_utilization',
    'cost_per_operation',
    'suspend_resume_patterns',
    'connection_pool_efficiency'
  ],
  
  // Cost analysis
  includeCostAnalysis: true,
  costBreakdown: [
    'compute_costs',
    'storage_costs',
    'data_transfer_costs',
    'connection_costs'
  ],
  
  // Optimization insights
  includeOptimizationInsights: true,
  benchmarkAgainst: 'industry_averages'
})

console.log('Performance insights:', performanceInsights)
// {
//   serverlessMetrics: {
//     coldStartFrequency: 0.05,    // 5% of operations
//     avgColdStartDuration: 156,    // ms
//     autoScalingEfficiency: 0.87,
//     avgComputeUtilization: 0.65,
//     costPerOperation: 0.002      // $0.002 per operation
//   },
//   
//   costAnalysis: {
//     totalCost: 45.67,            // $45.67 for period
//     costBreakdown: {
//       compute: 0.78,             // 78%
//       storage: 0.15,             // 15%
//       dataTransfer: 0.05,        // 5%
//       connections: 0.02          // 2%
//     }
//   },
//   
//   optimizationInsights: [
//     {
//       type: 'reduce_cold_starts',
//       description: 'Implement connection pre-warming',
//       potentialSavings: '$8/month',
//       complexity: 'medium'
//     },
//     {
//       type: 'optimize_suspend_timing',
//       description: 'Adjust auto-suspend delay to 8 minutes',
//       potentialSavings: '$12/month',
//       complexity: 'low'
//     }
//   ]
// }
```

## Best Practices for Neon

### 1. **Serverless Optimization**
```typescript
// Optimize for serverless characteristics
const serverlessOptimization = {
  // Connection strategy
  connectionStrategy: {
    useConnectionPooling: true,
    poolSize: 'dynamic',          // Let Neon manage pool size
    preferPooledConnections: true,
    enableConnectionRetry: true
  },
  
  // Query optimization
  queryOptimization: {
    enablePreparedStatements: true,
    enableQueryBatching: true,
    preferSingleTransactions: false,  // Serverless works better with shorter transactions
    enableQueryCaching: true
  },
  
  // Scaling optimization
  scalingOptimization: {
    enablePredictiveScaling: true,
    preWarmConnections: true,
    optimizeForColdStarts: true
  }
}
```

### 2. **Cost Management**
```typescript
// Implement cost-aware operations
const costAwareConfig = {
  // Budget monitoring
  enableBudgetAlerts: true,
  budgetThresholds: [50, 80, 95],   // Percentage thresholds
  
  // Auto-suspend optimization
  autoSuspendConfig: {
    delay: 300,                     // 5 minutes (good balance)
    considerUsagePatterns: true,
    enableSmartSuspend: true
  },
  
  // Resource right-sizing
  resourceOptimization: {
    enableAutoRightSizing: true,
    reviewPeriod: 7 * 24 * 60 * 60 * 1000,  // Weekly
    maxComputeUnits: 'auto',
    minComputeUnits: 0.25
  }
}
```

### 3. **Branching Strategy**
```typescript
// Use branching for safe experimentation
const branchingStrategy = {
  // Development workflow
  development: {
    createBranchPerFeature: true,
    enableAutoMerge: false,
    runTestsBeforeMerge: true
  },
  
  // Production safety
  production: {
    enablePointInTimeRecovery: true,
    createSnapshotsBeforeChanges: true,
    enableRollbackCapability: true
  },
  
  // Cost optimization
  branchCostOptimization: {
    autoDeleteStaleExperimentBranches: true,
    maxBranchAge: 7 * 24 * 60 * 60 * 1000,  // 7 days
    enableBranchSuspend: true
  }
}
```

The enhanced Neon memory provider offers unparalleled serverless capabilities with automatic scaling, cost optimization, and innovative branching features that make it perfect for modern AI agent applications requiring elastic performance and cost efficiency.
