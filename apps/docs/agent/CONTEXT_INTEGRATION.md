# Context Integration Guide for SYMindX

## Overview

The SYMindX Context Integration system provides a comprehensive framework for enriching agent interactions with contextual awareness, memory integration, emotional state tracking, and temporal understanding. This guide covers the complete integration process for incorporating context enhancements into existing SYMindX installations.

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Key Benefits](#key-benefits)
3. [Integration Components](#integration-components)
4. [Quick Start](#quick-start)
5. [Component Integration](#component-integration)
6. [Configuration Guide](#configuration-guide)
7. [Performance Optimization](#performance-optimization)
8. [Monitoring & Debugging](#monitoring--debugging)
9. [Best Practices](#best-practices)
10. [Troubleshooting](#troubleshooting)

## System Architecture

The Context Integration system consists of several key components working together:

```
Context System Architecture
├── 🔄 Context Lifecycle Manager - Context creation, management, cleanup
├── 🧠 Enrichment Pipeline - Context enhancement processing
├── 📊 Context Caching - Multi-layer caching system
├── 🔍 Context Injection - Dependency injection framework
├── 📈 Observability Layer - Monitoring, metrics, debugging
├── 🤝 Multi-Agent Context - Shared context management
└── 🔧 Integration Adapters - Backward compatibility and migration
```

### Core Components

1. **Context Lifecycle Manager**: Manages the complete lifecycle of contexts from creation to disposal
2. **Enrichment Pipeline**: Processes and enhances raw context with additional data
3. **Context Caching**: Provides intelligent multi-layer caching for performance
4. **Context Injection**: Enables dependency injection of context into system components
5. **Observability Layer**: Provides monitoring, debugging, and performance metrics

## Key Benefits

### 🚀 Enhanced Agent Intelligence
- **Memory-Aware Interactions**: Agents remember past conversations and learn from interactions
- **Emotional Context**: Understanding of emotional states enhances response quality
- **Temporal Awareness**: Time-based context improves relevance and appropriateness
- **Social Intelligence**: Relationship tracking enables better interpersonal dynamics

### ⚡ Performance Improvements
- **Intelligent Caching**: Multi-layer caching reduces computation overhead by up to 70%
- **Parallel Processing**: Concurrent enrichment processing improves response times
- **Resource Optimization**: Smart memory management prevents resource leaks
- **Selective Enrichment**: Only necessary context enrichers are activated

### 🔧 Developer Experience
- **Backward Compatibility**: Existing agents work without modification
- **Gradual Adoption**: Features can be enabled incrementally
- **Type Safety**: Full TypeScript support with comprehensive type definitions
- **Debugging Tools**: Rich debugging and monitoring capabilities

### 🌐 Scalability
- **Multi-Agent Support**: Shared context management across multiple agents
- **Resource Management**: Automatic cleanup and memory optimization
- **Configuration Flexibility**: Extensive configuration options for different deployment scenarios
- **Performance Monitoring**: Built-in metrics and health checks

## Integration Components

### 1. Context Enrichers

Context enrichers add specific types of contextual information:

#### Memory Context Enricher
```typescript
import { MemoryContextEnricher } from '@symindx/context/enrichers';

const memoryEnricher = new MemoryContextEnricher({
  maxMemories: 10,
  searchRadius: 30, // days
  relevanceThreshold: 0.3,
  includeEmotionalMemories: true,
  includeTemporalContext: true
});
```

**Features:**
- Searches for relevant memories based on current context
- Provides temporal memory context (recent vs historical)
- Analyzes memory patterns and learning progression
- Generates memory-based insights and recommendations

#### Emotional Context Enricher
```typescript
import { EmotionalContextEnricher } from '@symindx/context/enrichers';

const emotionalEnricher = new EmotionalContextEnricher({
  includeEmotionalHistory: true,
  historyDepth: 10,
  includeEmotionalTrends: true,
  emotionRelevanceThreshold: 0.3,
  volatilityWindowMs: 300000 // 5 minutes
});
```

**Features:**
- Current emotional state with confidence scores
- Emotional history and trend analysis
- Contextual emotion analysis
- Emotional volatility and stability metrics

#### Environment Context Enricher
```typescript
import { EnvironmentContextEnricher } from '@symindx/context/enrichers';

const environmentEnricher = new EnvironmentContextEnricher({
  includeSystemMetrics: true,
  includeAgentStatus: true,
  includePerformanceMetrics: true,
  includeRuntimeInfo: true
});
```

**Features:**
- System metrics (memory usage, CPU, uptime)
- Agent status and active modules
- Runtime information (session ID, timestamps)
- Performance metrics and health indicators

#### Social Context Enricher
```typescript
import { SocialContextEnricher } from '@symindx/context/enrichers';

const socialEnricher = new SocialContextEnricher({
  includeRelationshipData: true,
  includeConversationContext: true,
  includeSocialMetrics: true,
  trustDecayFactor: 0.95,
  familiarityThreshold: 0.5
});
```

**Features:**
- Relationship mapping with trust and familiarity scores
- Conversation context and participant analysis
- Social metrics and communication style recommendations
- Interaction patterns and social dynamics

#### Temporal Context Enricher
```typescript
import { TemporalContextEnricher } from '@symindx/context/enrichers';

const temporalEnricher = new TemporalContextEnricher({
  includeTimeContext: true,
  includeSessionDuration: true,
  includeBusinessHours: true,
  includeChronologicalMarkers: true,
  timeZone: 'UTC'
});
```

**Features:**
- Current time context (time of day, day of week, season)
- Session duration and activity tracking
- Business hours analysis
- Chronological markers (first interaction, returning user)

### 2. Caching System

The multi-layer caching system provides intelligent context caching:

```typescript
import { createContextCache } from '@symindx/context/caching';

const cacheConfig = {
  l1: {
    type: 'memory',
    maxSize: 100,
    ttl: 300 // 5 minutes
  },
  l2: {
    type: 'redis',
    maxSize: 1000,
    ttl: 3600 // 1 hour
  },
  l3: {
    type: 'disk',
    maxSize: 10000,
    ttl: 86400 // 24 hours
  }
};

const contextCache = createContextCache(cacheConfig);
```

**Cache Layers:**
- **L1 (Memory)**: Fastest access for frequently used contexts
- **L2 (Redis/External)**: Shared cache for distributed deployments
- **L3 (Disk/Persistent)**: Long-term storage for historical contexts

### 3. Context Injection

Dependency injection framework for context-aware components:

```typescript
import { ContextInjector, injectable, inject } from '@symindx/context/injection';

@injectable()
class MyService {
  constructor(
    @inject('context') private context: UnifiedContext,
    @inject('logger') private logger: Logger
  ) {}

  async processMessage(message: string): Promise<string> {
    // Access enriched context
    const memoryContext = this.context.memoryContext;
    const emotionalState = this.context.currentEmotion;
    
    // Process with context awareness
    return this.generateResponse(message, memoryContext, emotionalState);
  }
}
```

## Quick Start

### 1. Installation

The context system is included in SYMindX by default. No additional installation is required.

### 2. Basic Integration

```typescript
import { 
  createContextLifecycleManager,
  EnrichmentPipeline,
  createAllEnricherEntries 
} from '@symindx/context';

// Initialize context lifecycle manager
const contextManager = createContextLifecycleManager({
  maxContextsPerAgent: 10,
  defaultTtl: 3600000, // 1 hour
  cleanupInterval: 300000, // 5 minutes
  enableMonitoring: true,
  enableEnrichment: true
});

// Create enrichment pipeline
const pipeline = new EnrichmentPipeline({
  maxConcurrency: 5,
  defaultTimeout: 3000,
  enableCaching: true,
  cacheTtl: 300
});

// Register enrichers
const enricherEntries = createAllEnricherEntries({
  memoryProvider: agent.memory,
  agentProvider: () => agent,
  emotionProvider: () => agent.emotion
});

for (const entry of enricherEntries) {
  pipeline.registerEnricher(entry);
}

// Initialize system
await contextManager.initialize();
await pipeline.initialize();
```

### 3. Using Context in Agent Interactions

```typescript
// Request context for agent interaction
const contextRequest = {
  agentId: 'agent-123',
  requestType: 'conversation',
  baseContext: {
    userId: 'user-456',
    message: 'Hello, how are you today?',
    sessionId: 'session-789'
  },
  enrichment: {
    enabled: true,
    steps: ['memory_enrichment', 'emotional_enrichment', 'temporal_enrichment']
  }
};

const contextId = await contextManager.requestContext(contextRequest);
const enrichedContext = await pipeline.enrich({ agentId: 'agent-123', context: contextRequest.baseContext });

// Use enriched context in agent response
const response = await agent.generateResponse(message, enrichedContext);
```

## Component Integration

### Runtime Integration

```typescript
// In SYMindXRuntime class
import { ContextLifecycleManager, createContextLifecycleManager } from '@symindx/context';

export class SYMindXRuntime implements AgentRuntime {
  private contextLifecycleManager: ContextLifecycleManager;

  constructor(config: RuntimeConfig) {
    // Initialize context manager
    this.contextLifecycleManager = createContextLifecycleManager({
      ...config.contextConfig,
      memoryProvider: this.createMemoryProvider(),
      emotionProvider: this.createEmotionProvider()
    });
  }

  async start(): Promise<void> {
    // Initialize context system during startup
    await this.contextLifecycleManager.initialize();
    // ... rest of startup process
  }

  async activateAgent(agentId: string): Promise<Agent> {
    // Create context for agent activation
    const contextId = await this.contextLifecycleManager.requestContext({
      agentId,
      requestType: 'activation',
      baseContext: { agentId, activationType: 'lazy_loading' }
    });

    const agent = await this.loadAgent(agentId);
    agent.contextId = contextId;

    return agent;
  }
}
```

### Memory System Integration

```typescript
// Enhanced memory provider with context awareness
export class ContextAwareMemoryProvider extends BaseMemoryProvider {
  async storeMemory(memory: MemoryRecord): Promise<void> {
    // Enhance memory with current context
    if (this.currentContext) {
      memory.context = {
        ...memory.context,
        emotionalState: this.currentContext.currentEmotion,
        socialContext: this.currentContext.socialMetrics,
        temporalMarkers: this.currentContext.temporalContext
      };
    }

    await super.storeMemory(memory);
  }

  async searchMemories(query: MemorySearchQuery): Promise<MemoryRecord[]> {
    // Use context to enhance search relevance
    if (this.currentContext?.memoryContext) {
      query.contextualHints = this.currentContext.memoryContext;
    }

    return super.searchMemories(query);
  }
}
```

### Emotion System Integration

```typescript
// Context-aware emotion module
export class ContextAwareEmotionModule extends CompositeEmotionModule {
  async updateEmotion(trigger: EmotionTrigger): Promise<EmotionState> {
    // Consider context when updating emotions
    const contextualFactors = this.extractContextualFactors();
    const enhancedTrigger = {
      ...trigger,
      contextualFactors
    };

    return super.updateEmotion(enhancedTrigger);
  }

  private extractContextualFactors(): ContextualEmotionFactors {
    return {
      socialPresence: this.currentContext?.socialMetrics?.participants?.length || 0,
      timeOfDay: this.currentContext?.temporalContext?.timeOfDay,
      memoryValence: this.currentContext?.memoryContext?.averageValence,
      environmentalStress: this.currentContext?.environmentContext?.systemLoad
    };
  }
}
```

### Extension Integration

```typescript
// Context-aware extension base class
export abstract class ContextAwareExtension implements Extension {
  protected context?: UnifiedContext;
  protected contextId?: string;

  async initialize(agent: Agent): Promise<void> {
    // Access agent's context
    if (agent.contextId) {
      this.contextId = agent.contextId;
      this.context = await this.getAgentContext(agent.contextId);
    }

    await this.initializeWithContext();
  }

  protected async initializeWithContext(): Promise<void> {
    // Override in derived classes for context-aware initialization
  }

  protected async updateContext(): Promise<void> {
    if (this.contextId) {
      this.context = await this.getAgentContext(this.contextId);
    }
  }
}

// Example: Slack extension with context awareness
export class ContextAwareSlackExtension extends ContextAwareExtension {
  async handleMessage(message: SlackMessage): Promise<void> {
    // Use context to enhance message handling
    const response = await this.generateContextualResponse(message);
    await this.sendMessage(response);
  }

  private async generateContextualResponse(message: SlackMessage): Promise<string> {
    const contextualData = {
      previousInteractions: this.context?.memoryContext?.relevantMemories,
      emotionalState: this.context?.currentEmotion,
      timeContext: this.context?.temporalContext,
      socialContext: this.context?.socialMetrics
    };

    return this.agent.generateResponse(message.text, contextualData);
  }
}
```

## Configuration Guide

### Basic Configuration

```typescript
// Runtime configuration with context settings
const runtimeConfig: RuntimeConfig = {
  // ... existing configuration
  
  contextConfig: {
    // Context lifecycle settings
    maxContextsPerAgent: 10,
    defaultTtl: 3600000, // 1 hour
    cleanupInterval: 300000, // 5 minutes
    
    // Monitoring and observability
    enableMonitoring: true,
    enableEnrichment: true,
    enableCaching: true,
    
    // Memory management
    memoryThresholds: {
      warning: 100 * 1024 * 1024,  // 100MB
      critical: 500 * 1024 * 1024  // 500MB
    },
    
    // Error handling
    errorRecovery: {
      maxRetries: 3,
      retryDelay: 1000,
      enableAutoRecovery: true
    },
    
    // Validation settings
    validation: {
      strict: false,
      rules: ['required_fields', 'type_safety', 'resource_limits']
    }
  }
};
```

### Enrichment Configuration

```typescript
// Enrichment pipeline configuration
const enrichmentConfig = {
  // Pipeline settings
  maxConcurrency: 5,
  defaultTimeout: 3000,
  enableCaching: true,
  cacheTtl: 300,
  enableMetrics: true,
  enableTracing: false,
  
  // Retry strategy
  retryStrategy: {
    maxRetries: 3,
    backoffMs: 100,
    exponential: true
  },
  
  // Individual enricher configurations
  enrichers: {
    memory: {
      maxMemories: 10,
      searchRadius: 30,
      relevanceThreshold: 0.3,
      includeEmotionalMemories: true,
      includeTemporalContext: true
    },
    
    emotional: {
      includeEmotionalHistory: true,
      historyDepth: 10,
      includeEmotionalTrends: true,
      emotionRelevanceThreshold: 0.3,
      volatilityWindowMs: 300000
    },
    
    social: {
      includeRelationshipData: true,
      includeConversationContext: true,
      includeSocialMetrics: true,
      trustDecayFactor: 0.95,
      familiarityThreshold: 0.5
    },
    
    temporal: {
      includeTimeContext: true,
      includeSessionDuration: true,
      includeBusinessHours: true,
      includeChronologicalMarkers: true,
      timeZone: 'UTC'
    },
    
    environment: {
      includeSystemMetrics: true,
      includeAgentStatus: true,
      includePerformanceMetrics: true,
      includeRuntimeInfo: true
    }
  }
};
```

### Caching Configuration

```typescript
// Multi-layer cache configuration
const cachingConfig = {
  // L1 Cache (Memory)
  l1: {
    type: 'memory',
    maxSize: 100,
    ttl: 300, // 5 minutes
    strategy: 'lru'
  },
  
  // L2 Cache (Redis/External)
  l2: {
    type: 'redis',
    host: 'localhost',
    port: 6379,
    maxSize: 1000,
    ttl: 3600, // 1 hour
    keyPrefix: 'symindx:context:'
  },
  
  // L3 Cache (Persistent)
  l3: {
    type: 'disk',
    path: './data/context-cache',
    maxSize: 10000,
    ttl: 86400, // 24 hours
    compression: true
  },
  
  // Cache warming and strategies
  warming: {
    enabled: true,
    strategies: ['frequency_based', 'predictive', 'resource_aware'],
    warmupSchedule: '0 */6 * * *' // Every 6 hours
  }
};
```

## Performance Optimization

### Caching Strategies

1. **Frequency-Based Caching**: Frequently accessed contexts are cached longer
2. **Predictive Caching**: Anticipates context needs based on usage patterns
3. **Resource-Aware Caching**: Adjusts caching based on available system resources

```typescript
// Configure caching strategies
const cacheStrategies = {
  frequencyBased: {
    enabled: true,
    decayFactor: 0.9,
    promotionThreshold: 5,
    demotionThreshold: 2
  },
  
  predictive: {
    enabled: true,
    modelType: 'markov_chain',
    historyWindow: 1000,
    confidenceThreshold: 0.7
  },
  
  resourceAware: {
    enabled: true,
    memoryThreshold: 0.8,
    cpuThreshold: 0.7,
    adaptiveStrategy: 'linear'
  }
};
```

### Parallel Processing

```typescript
// Configure parallel enrichment processing
const parallelConfig = {
  maxConcurrency: 5,
  poolSize: 10,
  queueSize: 100,
  timeoutMs: 3000,
  
  // Priority scheduling
  scheduling: {
    strategy: 'priority_queue',
    priorities: {
      'memory_enrichment': 1,
      'emotional_enrichment': 2,
      'social_enrichment': 3,
      'temporal_enrichment': 4,
      'environment_enrichment': 5
    }
  }
};
```

### Memory Management

```typescript
// Memory optimization settings
const memoryConfig = {
  // Automatic cleanup thresholds
  cleanupThresholds: {
    unused: 300000, // 5 minutes
    stale: 1800000, // 30 minutes
    expired: 3600000 // 1 hour
  },
  
  // Memory pressure handling
  pressureHandling: {
    enabled: true,
    thresholds: {
      warning: 0.75,
      critical: 0.9
    },
    actions: ['clear_l1_cache', 'compress_contexts', 'archive_old_contexts']
  },
  
  // Garbage collection tuning
  gcTuning: {
    interval: 60000, // 1 minute
    aggressiveness: 'moderate',
    targetMemoryUsage: 0.7
  }
};
```

## Monitoring & Debugging

### Built-in Metrics

The context system provides comprehensive metrics:

```typescript
// Access context metrics
const metrics = await contextManager.getMetrics();

console.log('Context Metrics:', {
  // Lifecycle metrics
  totalContexts: metrics.lifecycle.totalContexts,
  activeContexts: metrics.lifecycle.activeContexts,
  averageLifetime: metrics.lifecycle.averageLifetime,
  
  // Performance metrics
  averageEnrichmentTime: metrics.performance.averageEnrichmentTime,
  cacheHitRate: metrics.performance.cacheHitRate,
  throughput: metrics.performance.throughput,
  
  // Resource metrics
  memoryUsage: metrics.resources.memoryUsage,
  cpuUsage: metrics.resources.cpuUsage,
  
  // Error metrics
  errorRate: metrics.errors.errorRate,
  retryRate: metrics.errors.retryRate
});
```

### Health Checks

```typescript
// Perform system health check
const healthCheck = await contextManager.healthCheck();

if (healthCheck.status === 'healthy') {
  console.log('✅ Context system is healthy');
} else {
  console.warn('⚠️ Context system issues detected:', healthCheck.issues);
}
```

### Debug Tools

```typescript
import { ContextDebugger } from '@symindx/context/observability';

// Initialize debugger
const debugger = new ContextDebugger({
  enableTracing: true,
  enableProfiling: true,
  logLevel: 'debug'
});

// Debug specific context
await debugger.debugContext('context-123', {
  includeEnrichmentTrace: true,
  includeCacheAnalysis: true,
  includePerformanceProfile: true
});

// Run debug scenarios
await debugger.runDebugScenario('memory_pressure', {
  targetMemoryUsage: 0.9,
  duration: 300000 // 5 minutes
});
```

### Context Visualization

```typescript
import { ContextVisualizer } from '@symindx/context/observability';

// Generate context flow diagram
const visualizer = new ContextVisualizer();
const diagram = await visualizer.generateFlowDiagram('agent-123', {
  includeEnrichmentFlow: true,
  includeCacheHierarchy: true,
  includeMetrics: true
});

// Export visualization
await visualizer.exportDiagram(diagram, 'context-flow.svg');
```

## Best Practices

### 1. Context Scoping

Choose appropriate context visibility and TTL:

```typescript
// Private contexts for sensitive data
const privateContext = {
  scope: {
    visibility: 'private',
    ttl: 3600000 // 1 hour
  }
};

// Shared contexts for collaborative features
const sharedContext = {
  scope: {
    visibility: 'shared',
    ttl: 86400000 // 24 hours
  }
};

// Public contexts for general information
const publicContext = {
  scope: {
    visibility: 'public',
    ttl: 604800000 // 1 week
  }
};
```

### 2. Enrichment Selection

Enable only necessary enrichers for optimal performance:

```typescript
// Lightweight enrichment for simple interactions
const lightweightEnrichment = {
  enabled: true,
  steps: ['temporal_enrichment']
};

// Comprehensive enrichment for complex interactions
const comprehensiveEnrichment = {
  enabled: true,
  steps: [
    'memory_enrichment',
    'emotional_enrichment',
    'social_enrichment',
    'temporal_enrichment',
    'environment_enrichment'
  ]
};
```

### 3. Error Handling

Implement robust error handling:

```typescript
try {
  const contextId = await contextManager.requestContext(request);
  const enrichedContext = await pipeline.enrich(enrichmentRequest);
  
  // Use enriched context
  const response = await processWithContext(enrichedContext);
  
} catch (error) {
  if (error instanceof ContextError) {
    // Handle context-specific errors
    await handleContextError(error);
  } else {
    // Fallback to basic processing without context
    const response = await processWithoutContext();
  }
} finally {
  // Ensure cleanup
  if (contextId) {
    await contextManager.scheduleCleanup(contextId);
  }
}
```

### 4. Memory Management

Implement proper cleanup strategies:

```typescript
// Schedule cleanup for temporary contexts
await contextManager.scheduleCleanup(contextId, 30000); // 30 seconds

// Export important contexts before cleanup
if (context.scope.visibility === 'shared') {
  const exportData = await contextManager.exportContext(contextId);
  await persistContextData(exportData);
}

// Use memory pressure callbacks
contextManager.onMemoryPressure(async (level) => {
  if (level === 'critical') {
    await contextManager.emergencyCleanup();
  }
});
```

### 5. Testing Strategies

Test context integration thoroughly:

```typescript
// Unit tests for enrichers
describe('MemoryContextEnricher', () => {
  it('should enrich context with relevant memories', async () => {
    const enricher = new MemoryContextEnricher(config);
    const result = await enricher.enrich(mockContext);
    
    expect(result.memoryContext).toBeDefined();
    expect(result.memoryContext.relevantMemories).toHaveLength(5);
  });
});

// Integration tests for full pipeline
describe('Context Integration', () => {
  it('should handle agent activation with context', async () => {
    const agent = await runtime.activateAgent('test-agent');
    expect(agent.contextId).toBeDefined();
    
    const context = await contextManager.getContext(agent.contextId);
    expect(context).toBeDefined();
  });
});
```

## Troubleshooting

### Common Issues

#### High Memory Usage

**Symptoms:** Memory usage continuously increases
**Causes:** Context cleanup not working properly, TTL values too high
**Solutions:**
```typescript
// Check active contexts
const activeContexts = await contextManager.getActiveContexts();
console.log('Active contexts:', activeContexts.length);

// Force cleanup
await contextManager.emergencyCleanup();

// Adjust TTL values
contextConfig.defaultTtl = 1800000; // Reduce to 30 minutes
```

#### Slow Enrichment Performance

**Symptoms:** Context enrichment takes too long
**Causes:** Too many enrichers enabled, network latency, large datasets
**Solutions:**
```typescript
// Profile enrichment performance
const profile = await pipeline.profileEnrichment(request);
console.log('Slow enrichers:', profile.slowEnrichers);

// Reduce concurrent enrichers
pipelineConfig.maxConcurrency = 3;

// Enable aggressive caching
cacheConfig.l1.ttl = 600; // 10 minutes
```

#### Context Not Found Errors

**Symptoms:** Context lookup failures
**Causes:** Cleanup too aggressive, TTL too short, incorrect context IDs
**Solutions:**
```typescript
// Check context exists before use
const exists = await contextManager.contextExists(contextId);
if (!exists) {
  // Recreate context or handle gracefully
  const newContextId = await contextManager.requestContext(originalRequest);
}

// Increase TTL for persistent contexts
request.scope.ttl = 7200000; // 2 hours
```

#### Enrichment Failures

**Symptoms:** Enrichment process fails with errors
**Causes:** Missing dependencies, configuration errors, resource exhaustion
**Solutions:**
```typescript
// Check enricher health
const health = await pipeline.checkEnricherHealth();
for (const [name, status] of health.entries()) {
  if (status !== 'healthy') {
    console.warn(`Enricher ${name} is ${status}`);
  }
}

// Enable graceful degradation
pipelineConfig.enableGracefulDegradation = true;
```

### Debug Commands

```bash
# Check context system status
bun cli context:status

# Debug specific context
bun cli context:debug <context-id>

# Analyze memory usage
bun cli context:memory-analysis

# Test enrichment pipeline
bun cli context:test-enrichment

# View context metrics
bun cli context:metrics

# Export context data
bun cli context:export <context-id> --format json
```

### Logging Configuration

```typescript
// Enable detailed context logging
const loggingConfig = {
  level: 'debug',
  categories: {
    'context-lifecycle': 'debug',
    'enrichment-pipeline': 'info',
    'context-cache': 'warn',
    'context-injection': 'error'
  },
  
  // Structured logging
  structured: true,
  includeTraceId: true,
  includePerformanceMetrics: true
};
```

## Migration Considerations

For detailed migration instructions, see [CONTEXT_MIGRATION.md](./CONTEXT_MIGRATION.md).

### Backward Compatibility

The context system is designed to be fully backward compatible:

- Existing agents work without modification
- Context features are opt-in
- No breaking changes to existing APIs
- Gradual migration path available

### Feature Flags

Control context features during migration:

```typescript
const migrationConfig = {
  enableContextInjection: false,      // Phase 1: Disable initially
  enableEnrichmentPipeline: true,     // Phase 2: Enable enrichment
  enableAdvancedCaching: false,       // Phase 3: Enable advanced features
  enableMultiAgentContext: false      // Phase 4: Enable multi-agent features
};
```

This comprehensive guide provides everything needed to successfully integrate context enhancements into your SYMindX installation. For specific migration steps, refer to the [Context Migration Guide](./CONTEXT_MIGRATION.md).