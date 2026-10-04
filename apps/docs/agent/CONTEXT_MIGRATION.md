# Context Migration Guide for SYMindX

The mind-agents config paths in this guide are not part of v2; the library is `packages/agent`.

## Overview

This guide provides step-by-step instructions for migrating your existing SYMindX installation to incorporate the new Context Integration system. The migration is designed to be backward-compatible with zero downtime and gradual feature adoption.

## Table of Contents

1. [Migration Strategy](#migration-strategy)
2. [Pre-Migration Assessment](#pre-migration-assessment)
3. [Phase 1: Foundation Setup](#phase-1-foundation-setup)
4. [Phase 2: Core Integration](#phase-2-core-integration)
5. [Phase 3: Advanced Features](#phase-3-advanced-features)
6. [Phase 4: Optimization](#phase-4-optimization)
7. [Rollback Procedures](#rollback-procedures)
8. [Validation & Testing](#validation--testing)
9. [Troubleshooting](#troubleshooting)

## Migration Strategy

### 🎯 Zero-Downtime Migration
The migration follows a phased approach ensuring continuous system operation:

- **Phase 1**: Foundation setup with backward compatibility
- **Phase 2**: Core context integration with selective enabling
- **Phase 3**: Advanced features and optimization
- **Phase 4**: Full context system activation

### 🔄 Gradual Feature Adoption
Features are introduced incrementally:
- Context lifecycle management (foundational)
- Basic enrichment pipeline (core functionality)
- Advanced caching and injection (performance)
- Multi-agent context sharing (advanced)

### 📊 Risk Mitigation
- Feature flags for safe rollback
- Comprehensive validation at each phase
- Performance monitoring throughout migration
- Automatic fallback to legacy behavior

## Pre-Migration Assessment

### System Requirements Check

```bash
# Check Node.js version (minimum 18.0.0)
node --version

# Check available memory (recommended minimum 4GB)
free -h

# Check disk space (minimum 1GB free)
df -h

# Verify SYMindX installation
bun cli status
```

### Current Configuration Backup

```bash
# Create backup directory
mkdir -p ./migration-backup/$(date +%Y%m%d_%H%M%S)

# Backup current configuration
cp -r packages/agent/src/core/config/ ./migration-backup/$(date +%Y%m%d_%H%M%S)/config/
cp -r characters/ ./migration-backup/$(date +%Y%m%d_%H%M%S)/characters/

# Backup database files (if using SQLite)
cp -r data/ ./migration-backup/$(date +%Y%m%d_%H%M%S)/data/ 2>/dev/null || true

# Export current runtime state
bun cli export-state ./migration-backup/$(date +%Y%m%d_%H%M%S)/runtime-state.json
```

### Dependency Analysis

```typescript
// Check for context-related types in existing code
import { checkContextDependencies } from './migration-helpers';

const analysis = await checkContextDependencies('./packages/agent/src');
console.log('Context migration readiness:', analysis);
```

### Performance Baseline

```bash
# Establish performance baseline
bun cli benchmark --duration 300 --output ./migration-backup/baseline-performance.json

# Memory usage baseline
bun cli memory-profile --duration 60 --output ./migration-backup/baseline-memory.json
```

## Phase 1: Foundation Setup

**Duration**: 30-60 minutes  
**Risk Level**: Low  
**Rollback Time**: < 5 minutes

### Step 1.1: Enable Context Foundation

```typescript
// Update runtime.json configuration
{
  "contextConfig": {
    "enabled": true,
    "migrationPhase": 1,
    "enableLegacyCompatibility": true,
    "maxContextsPerAgent": 5,
    "defaultTtl": 1800000,
    "cleanupInterval": 600000,
    "enableMonitoring": true,
    "enableEnrichment": false,
    "enableCaching": false
  }
}
```

### Step 1.2: Initialize Context Lifecycle Manager

```typescript
// In your runtime configuration
import { createContextLifecycleManager } from './context/context-lifecycle-manager.js';

export class SYMindXRuntime implements AgentRuntime {
  private contextLifecycleManager?: ContextLifecycleManager;

  constructor(config: RuntimeConfig) {
    // ... existing initialization
    
    if (config.contextConfig?.enabled) {
      this.contextLifecycleManager = createContextLifecycleManager({
        maxContextsPerAgent: config.contextConfig.maxContextsPerAgent || 5,
        defaultTtl: config.contextConfig.defaultTtl || 1800000,
        cleanupInterval: config.contextConfig.cleanupInterval || 600000,
        enableMonitoring: config.contextConfig.enableMonitoring ?? true,
        enableEnrichment: false, // Disabled in Phase 1
        memoryThresholds: {
          warning: 50 * 1024 * 1024,  // 50MB (conservative)
          critical: 100 * 1024 * 1024  // 100MB (conservative)
        }
      });
    }
  }

  async start(): Promise<void> {
    // ... existing startup sequence
    
    // Initialize context system if enabled
    if (this.contextLifecycleManager) {
      runtimeLogger.info('🔄 Initializing Context System (Phase 1)...');
      await this.contextLifecycleManager.initialize();
      runtimeLogger.info('✅ Context System Phase 1 initialized');
    }
    
    // ... continue with existing startup
  }
}
```

### Step 1.3: Add Backward Compatibility Layer

```typescript
// Create backward compatibility adapter
import { BackwardCompatibilityLayer } from './context/integration/BackwardCompatibilityLayer.js';

// In runtime constructor
if (config.contextConfig?.enableLegacyCompatibility) {
  this.backwardCompatibilityLayer = new BackwardCompatibilityLayer({
    contextManager: this.contextLifecycleManager,
    migrationPhase: config.contextConfig.migrationPhase || 1
  });
}
```

### Step 1.4: Validation

```bash
# Test system startup
bun dev

# Verify no regressions
bun test

# Check basic functionality
bun cli agents list
bun cli status

# Validate context system initialization
bun cli context:status
```

**Expected Results:**
- ✅ System starts without errors
- ✅ All existing functionality works unchanged  
- ✅ Context system shows as "initialized" but "inactive"
- ✅ No performance degradation

### Rollback Phase 1

```typescript
// Disable context system in runtime.json
{
  "contextConfig": {
    "enabled": false
  }
}

# Restart system
bun cli restart
```

## Phase 2: Core Integration

**Duration**: 1-2 hours  
**Risk Level**: Medium  
**Rollback Time**: < 10 minutes

### Step 2.1: Enable Basic Enrichment

```typescript
// Update runtime.json
{
  "contextConfig": {
    "enabled": true,
    "migrationPhase": 2,
    "enableEnrichment": true,
    "enableCaching": false,
    "enrichmentConfig": {
      "maxConcurrency": 2,
      "defaultTimeout": 2000,
      "enabledEnrichers": ["temporal", "environment"],
      "enableGracefulDegradation": true
    }
  }
}
```

### Step 2.2: Initialize Enrichment Pipeline

```typescript
// Add to runtime initialization
async start(): Promise<void> {
  // ... existing initialization

  if (this.contextLifecycleManager && config.contextConfig?.enableEnrichment) {
    runtimeLogger.info('🧠 Initializing Enrichment Pipeline (Phase 2)...');
    
    this.enrichmentPipeline = new EnrichmentPipeline({
      maxConcurrency: config.contextConfig.enrichmentConfig?.maxConcurrency || 2,
      defaultTimeout: config.contextConfig.enrichmentConfig?.defaultTimeout || 2000,
      enableCaching: false, // Disabled in Phase 2
      enableGracefulDegradation: true
    });

    // Register conservative enrichers
    const enabledEnrichers = config.contextConfig.enrichmentConfig?.enabledEnrichers || ['temporal'];
    const enricherEntries = createSelectiveEnricherEntries({
      enabledTypes: enabledEnrichers,
      memoryProvider: this.memoryProvider,
      agentProvider: () => this.currentAgent,
      emotionProvider: () => this.currentEmotion
    });

    for (const entry of enricherEntries) {
      this.enrichmentPipeline.registerEnricher(entry);
    }

    await this.enrichmentPipeline.initialize();
    runtimeLogger.info('✅ Enrichment Pipeline Phase 2 initialized');
  }
}
```

### Step 2.3: Modify Agent Activation

```typescript
async activateAgent(agentId: string): Promise<Agent> {
  // ... existing activation logic

  // Create context for new activations only
  if (this.contextLifecycleManager && !this.agents.has(agentId)) {
    try {
      const contextRequest: ContextRequest = {
        agentId,
        requestType: 'activation',
        baseContext: {
          sessionId: `session_${Date.now()}`,
          agentId,
          timestamp: new Date().toISOString(),
          migrationPhase: 2
        },
        scope: {
          visibility: 'private',
          ttl: this.config.contextConfig?.defaultTtl || 1800000
        },
        enrichment: {
          enabled: this.config.contextConfig?.enableEnrichment || false,
          steps: this.config.contextConfig?.enrichmentConfig?.enabledEnrichers || []
        }
      };

      const contextId = await this.contextLifecycleManager.requestContext(contextRequest);
      runtimeLogger.debug(`🔄 Context created for agent: ${contextId}`);
      
      // Store context reference with agent
      agent.contextId = contextId;
      
    } catch (error) {
      runtimeLogger.warn('⚠️ Context creation failed, continuing without context:', error);
      // Continue without context - graceful degradation
    }
  }

  return agent;
}
```

### Step 2.4: Test Basic Enrichment

```bash
# Restart with new configuration
bun cli restart

# Test agent activation with context
bun cli agents activate test-agent

# Verify enrichment is working
bun cli context:debug <agent-context-id> --include-enrichment

# Run performance comparison
bun cli benchmark --duration 180 --compare ./migration-backup/baseline-performance.json
```

### Step 2.5: Enable Memory Integration (Optional)

```typescript
// Add memory enricher if stable
{
  "contextConfig": {
    "enrichmentConfig": {
      "enabledEnrichers": ["temporal", "environment", "memory"],
      "enricherConfig": {
        "memory": {
          "maxMemories": 5,
          "searchRadius": 7,
          "relevanceThreshold": 0.5
        }
      }
    }
  }
}
```

**Expected Results:**
- ✅ Agents receive basic contextual information
- ✅ No performance regression > 10%
- ✅ Memory usage increase < 20%
- ✅ All existing functionality preserved

### Rollback Phase 2

```typescript
// Disable enrichment in runtime.json
{
  "contextConfig": {
    "enabled": true,
    "migrationPhase": 1,
    "enableEnrichment": false
  }
}

# Restart system
bun cli restart

# Verify rollback successful
bun cli context:status
bun test
```

## Phase 3: Advanced Features

**Duration**: 2-4 hours  
**Risk Level**: Medium-High  
**Rollback Time**: 15-30 minutes

### Step 3.1: Enable Caching System

```typescript
// Update configuration for caching
{
  "contextConfig": {
    "migrationPhase": 3,
    "enableCaching": true,
    "cachingConfig": {
      "l1": {
        "type": "memory",
        "maxSize": 50,
        "ttl": 300
      },
      "l2": {
        "type": "disk",
        "maxSize": 200,
        "ttl": 1800,
        "path": "./data/context-cache"
      },
      "strategies": {
        "frequencyBased": {
          "enabled": true,
          "decayFactor": 0.9
        }
      }
    }
  }
}
```

### Step 3.2: Initialize Advanced Caching

```typescript
// Add cache initialization to runtime
async start(): Promise<void> {
  // ... existing initialization

  if (this.contextLifecycleManager && config.contextConfig?.enableCaching) {
    runtimeLogger.info('🚀 Initializing Advanced Caching (Phase 3)...');
    
    const cacheConfig = config.contextConfig.cachingConfig || {};
    this.contextCache = await createContextCache(cacheConfig);
    
    // Integrate cache with enrichment pipeline
    if (this.enrichmentPipeline) {
      this.enrichmentPipeline.setCache(this.contextCache);
    }
    
    runtimeLogger.info('✅ Advanced Caching Phase 3 initialized');
  }
}
```

### Step 3.3: Enable Context Injection

```typescript
// Add dependency injection container
import { ContextInjector } from './context/context-injector.js';

// Initialize injector
if (config.contextConfig?.enableContextInjection) {
  this.contextInjector = new ContextInjector({
    contextManager: this.contextLifecycleManager,
    enrichmentPipeline: this.enrichmentPipeline,
    enableTypeValidation: true
  });

  await this.contextInjector.initialize();
}
```

### Step 3.4: Enable All Enrichers

```typescript
// Gradually enable all enrichers
{
  "contextConfig": {
    "enrichmentConfig": {
      "maxConcurrency": 4,
      "defaultTimeout": 3000,
      "enabledEnrichers": ["temporal", "environment", "memory", "emotional", "social"],
      "enricherConfig": {
        "memory": {
          "maxMemories": 8,
          "searchRadius": 14,
          "relevanceThreshold": 0.4
        },
        "emotional": {
          "includeEmotionalHistory": true,
          "historyDepth": 5
        },
        "social": {
          "includeRelationshipData": true,
          "trustDecayFactor": 0.95
        }
      }
    }
  }
}
```

### Step 3.5: Test Advanced Features

```bash
# Test caching performance
bun cli context:test-cache --duration 300

# Test enrichment with all modules
bun cli context:test-enrichment --all-enrichers

# Performance validation
bun cli benchmark --duration 300 --compare ./migration-backup/baseline-performance.json

# Memory usage analysis
bun cli memory-profile --duration 120 --compare ./migration-backup/baseline-memory.json
```

**Expected Results:**
- ✅ Significant performance improvement from caching
- ✅ Rich contextual information available to agents
- ✅ Memory usage increase < 40%
- ✅ Context injection working correctly

### Rollback Phase 3

```typescript
// Rollback to Phase 2 configuration
{
  "contextConfig": {
    "migrationPhase": 2,
    "enableCaching": false,
    "enableContextInjection": false,
    "enrichmentConfig": {
      "enabledEnrichers": ["temporal", "environment"]
    }
  }
}

# Clear cache directory
rm -rf ./data/context-cache

# Restart system
bun cli restart
```

## Phase 4: Optimization

**Duration**: 1-3 hours  
**Risk Level**: Low  
**Rollback Time**: < 10 minutes

### Step 4.1: Enable Multi-Agent Context

```typescript
// Enable multi-agent features
{
  "contextConfig": {
    "migrationPhase": 4,
    "enableMultiAgentContext": true,
    "multiAgentConfig": {
      "enableContextSharing": true,
      "enableContextSynchronization": false,
      "sharingStrategy": "selective",
      "conflictResolution": "priority_based"
    }
  }
}
```

### Step 4.2: Performance Tuning

```typescript
// Optimize configuration based on usage patterns
{
  "contextConfig": {
    "maxContextsPerAgent": 10,
    "defaultTtl": 3600000,
    "cleanupInterval": 300000,
    "enrichmentConfig": {
      "maxConcurrency": 5,
      "defaultTimeout": 3000
    },
    "cachingConfig": {
      "l1": {
        "maxSize": 100,
        "ttl": 600
      },
      "l2": {
        "maxSize": 500,
        "ttl": 3600
      },
      "strategies": {
        "predictive": {
          "enabled": true,
          "confidenceThreshold": 0.7
        },
        "resourceAware": {
          "enabled": true,
          "memoryThreshold": 0.8
        }
      }
    }
  }
}
```

### Step 4.3: Enable Advanced Monitoring

```typescript
// Add comprehensive monitoring
{
  "contextConfig": {
    "monitoringConfig": {
      "enableDetailedMetrics": true,
      "enableProfiling": true,
      "enableTracing": false,
      "metricsExport": {
        "enabled": true,
        "format": "prometheus",
        "endpoint": "/metrics"
      }
    }
  }
}
```

### Step 4.4: Final Validation

```bash
# Comprehensive system test
bun test --coverage

# Load testing
bun cli load-test --duration 600 --concurrent-agents 5

# Memory leak detection
bun cli memory-leak-test --duration 1800

# Performance validation
bun cli benchmark --duration 600 --detailed
```

**Expected Results:**
- ✅ All context features fully operational
- ✅ Performance meets or exceeds baseline
- ✅ Memory usage stable under load
- ✅ Multi-agent features working correctly

## Rollback Procedures

### Emergency Rollback (Any Phase)

```bash
# Stop system immediately
bun cli stop

# Disable context system completely
echo '{"contextConfig":{"enabled":false}}' > packages/agent/src/core/config/runtime.json

# Restore backup configuration
cp ./migration-backup/*/config/* packages/agent/src/core/config/

# Restart system
bun start
```

### Selective Feature Rollback

```typescript
// Disable specific features while keeping others
{
  "contextConfig": {
    "enabled": true,
    "migrationPhase": 2, // Rollback to previous phase
    "enableEnrichment": true,
    "enableCaching": false,     // Disable problematic feature
    "enableContextInjection": false,
    "enableMultiAgentContext": false
  }
}
```

### Database Rollback

```bash
# Restore database backup (if using SQLite)
cp ./migration-backup/*/data/* ./data/

# Clear context-specific data
rm -rf ./data/context-*
```

## Validation & Testing

### Automated Validation Suite

```bash
# Run complete validation suite
bun cli validate-migration --phase 1
bun cli validate-migration --phase 2
bun cli validate-migration --phase 3
bun cli validate-migration --phase 4
```

### Performance Regression Testing

```typescript
// Automated performance comparison
const performanceTest = {
  baseline: './migration-backup/baseline-performance.json',
  current: 'current',
  thresholds: {
    responseTime: 1.2,      // Max 20% increase
    memoryUsage: 1.4,       // Max 40% increase
    throughput: 0.9         // Min 90% of baseline
  }
};

const results = await runPerformanceComparison(performanceTest);
if (results.passed) {
  console.log('✅ Performance validation passed');
} else {
  console.error('❌ Performance regression detected:', results.failures);
}
```

### Feature Testing

```typescript
// Test each context feature
const featureTests = [
  'context-lifecycle',
  'basic-enrichment',
  'memory-enrichment',
  'emotional-enrichment',
  'social-enrichment',
  'context-caching',
  'context-injection',
  'multi-agent-context'
];

for (const feature of featureTests) {
  const result = await testFeature(feature);
  console.log(`${feature}: ${result.passed ? '✅' : '❌'}`);
}
```

## Troubleshooting

### Common Issues

#### High Memory Usage After Migration

**Symptoms:** Memory usage increases significantly
**Cause:** Context accumulation, inefficient cleanup
**Solution:**
```typescript
// Reduce context retention
{
  "contextConfig": {
    "defaultTtl": 900000,     // Reduce to 15 minutes
    "cleanupInterval": 120000, // Clean every 2 minutes
    "memoryThresholds": {
      "warning": 30 * 1024 * 1024,  // 30MB
      "critical": 60 * 1024 * 1024  // 60MB
    }
  }
}

# Force cleanup
bun cli context:cleanup --force
```

#### Enrichment Performance Issues

**Symptoms:** Slow response times after enabling enrichment
**Cause:** Too many enrichers, network latency, large datasets
**Solution:**
```typescript
// Reduce enricher load
{
  "contextConfig": {
    "enrichmentConfig": {
      "maxConcurrency": 2,
      "defaultTimeout": 1500,
      "enabledEnrichers": ["temporal", "environment"] // Remove heavy enrichers
    }
  }
}
```

#### Context Not Found Errors

**Symptoms:** Agents report missing context
**Cause:** Aggressive cleanup, short TTL values
**Solution:**
```typescript
// Increase context retention
{
  "contextConfig": {
    "defaultTtl": 7200000,    // 2 hours
    "cleanupInterval": 600000  // 10 minutes
  }
}
```

#### Cache Performance Issues

**Symptoms:** High CPU usage, slow cache operations
**Cause:** Cache thrashing, inappropriate cache sizes
**Solution:**
```typescript
// Optimize cache configuration
{
  "contextConfig": {
    "cachingConfig": {
      "l1": {
        "maxSize": 25,  // Reduce size
        "ttl": 180      // Reduce TTL
      },
      "strategies": {
        "frequencyBased": {
          "enabled": false  // Disable complex strategies
        }
      }
    }
  }
}
```

### Debug Commands

```bash
# Context system status
bun cli context:status --detailed

# Memory analysis
bun cli context:memory-analysis

# Performance profiling
bun cli context:profile --duration 300

# Cache statistics
bun cli context:cache-stats

# Enrichment analysis
bun cli context:enrichment-analysis

# Migration status
bun cli migration:status

# Health check
bun cli context:health-check
```

### Monitoring During Migration

```typescript
// Set up migration monitoring
const migrationMonitor = {
  checkInterval: 60000, // 1 minute
  metrics: [
    'memory_usage',
    'response_time',
    'error_rate',
    'context_creation_rate',
    'enrichment_performance'
  ],
  alerts: {
    memory_threshold: 200 * 1024 * 1024, // 200MB
    response_time_threshold: 2000,        // 2 seconds
    error_rate_threshold: 0.05            // 5%
  }
};

// Monitor throughout migration
const monitor = new MigrationMonitor(migrationMonitor);
await monitor.start();
```

## Post-Migration Tasks

### Optimization

```bash
# Analyze usage patterns
bun cli context:analyze-usage --duration 86400 # 24 hours

# Optimize configuration based on analysis
bun cli context:optimize-config --auto

# Generate performance report
bun cli context:performance-report --output migration-report.json
```

### Documentation Updates

```bash
# Update system documentation
bun cli generate-docs --include-context

# Export configuration for sharing
bun cli export-config --include-context --output context-config.json
```

### Backup Final Configuration

```bash
# Create post-migration backup
mkdir -p ./migration-backup/post-migration-$(date +%Y%m%d_%H%M%S)
cp -r packages/agent/src/core/config/ ./migration-backup/post-migration-$(date +%Y%m%d_%H%M%S)/config/
bun cli export-state ./migration-backup/post-migration-$(date +%Y%m%d_%H%M%S)/final-state.json
```

This migration guide ensures a smooth, safe transition to the enhanced context system while maintaining full backward compatibility and providing comprehensive rollback procedures at every step.