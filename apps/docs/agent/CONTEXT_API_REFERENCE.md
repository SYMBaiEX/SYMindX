# Context API Reference for SYMindX

## Overview

This document provides comprehensive API reference for the SYMindX Context Integration system, including all interfaces, methods, configuration options, and usage examples.

## Table of Contents

1. [Core Interfaces](#core-interfaces)
2. [Context Lifecycle Manager](#context-lifecycle-manager)
3. [Enrichment Pipeline](#enrichment-pipeline)
4. [Context Enrichers](#context-enrichers)
5. [Caching System](#caching-system)
6. [Context Injection](#context-injection)
7. [Multi-Agent Context](#multi-agent-context)
8. [Configuration Reference](#configuration-reference)
9. [Error Handling](#error-handling)
10. [Troubleshooting](#troubleshooting)

## Core Interfaces

### UnifiedContext

The central context interface that contains all contextual information.

```typescript
interface UnifiedContext {
  // Basic context information
  sessionId: string;
  agentId: string;
  userId?: string;
  timestamp: string;
  
  // Enriched context data
  memoryContext?: MemoryContext;
  currentEmotion?: EmotionState;
  socialMetrics?: SocialContext;
  temporalContext?: TemporalContext;
  environmentContext?: EnvironmentContext;
  
  // Metadata
  enrichmentMetadata?: EnrichmentMetadata;
  performanceMetrics?: ContextPerformanceMetrics;
  
  // Custom context data
  [key: string]: any;
}
```

### ContextRequest

Request structure for creating new contexts.

```typescript
interface ContextRequest {
  agentId: string;
  requestType: 'conversation' | 'activation' | 'task' | 'custom';
  baseContext: Record<string, any>;
  scope?: ContextScope;
  enrichment?: EnrichmentConfig;
  monitoring?: MonitoringConfig;
  metadata?: Record<string, any>;
}

interface ContextScope {
  visibility: 'private' | 'shared' | 'public';
  ttl?: number;
  tags?: string[];
}

interface EnrichmentConfig {
  enabled: boolean;
  steps?: string[];
  timeout?: number;
  fallbackStrategy?: 'graceful' | 'fail_fast';
}
```

### ContextResult

Result structure returned by context operations.

```typescript
interface ContextResult {
  id: string;
  context: UnifiedContext;
  config: ContextConfiguration;
  status: ContextStatus;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}

type ContextStatus = 'active' | 'enriching' | 'cached' | 'expired' | 'error';
```

## Context Lifecycle Manager

### ContextLifecycleManager

Main class for managing context lifecycle operations.

```typescript
class ContextLifecycleManager {
  constructor(config: ContextLifecycleConfig);
  
  // Lifecycle operations
  async initialize(): Promise<void>;
  async shutdown(): Promise<void>;
  async requestContext(request: ContextRequest): Promise<string>;
  async getContext(contextId: string): Promise<ContextResult | null>;
  async getContextByAgent(agentId: string): Promise<ContextResult | null>;
  async updateContext(contextId: string, updates: Partial<UnifiedContext>): Promise<void>;
  async disposeContext(contextId: string): Promise<void>;
  async scheduleCleanup(contextId: string, delayMs?: number): Promise<void>;
  
  // Context operations
  async exportContext(contextId: string): Promise<ContextExport>;
  async importContext(contextData: ContextExport): Promise<string>;
  async contextExists(contextId: string): Promise<boolean>;
  async getActiveContexts(): Promise<ContextResult[]>;
  
  // Health and monitoring
  async healthCheck(): Promise<HealthCheckResult>;
  async getMetrics(): Promise<ContextMetrics>;
  async emergencyCleanup(): Promise<void>;
  
  // Event handling
  onLifecycleEvent(event: ContextLifecycleEvent, handler: LifecycleEventHandler): void;
  offLifecycleEvent(event: ContextLifecycleEvent, handler: LifecycleEventHandler): void;
}
```

### Usage Example

```typescript
import { createContextLifecycleManager } from '@symindx/context';

// Create and initialize
const contextManager = createContextLifecycleManager({
  maxContextsPerAgent: 10,
  defaultTtl: 3600000,
  cleanupInterval: 300000,
  enableMonitoring: true
});

await contextManager.initialize();

// Request a new context
const contextId = await contextManager.requestContext({
  agentId: 'agent-123',
  requestType: 'conversation',
  baseContext: {
    userId: 'user-456',
    message: 'Hello, how are you?',
    sessionId: 'session-789'
  },
  scope: {
    visibility: 'private',
    ttl: 1800000
  },
  enrichment: {
    enabled: true,
    steps: ['memory_enrichment', 'emotional_enrichment']
  }
});

// Get context
const contextResult = await contextManager.getContext(contextId);
console.log('Context:', contextResult?.context);

// Update context
await contextManager.updateContext(contextId, {
  customData: { userPreference: 'detailed_responses' }
});

// Cleanup
await contextManager.scheduleCleanup(contextId, 30000);
```

### Configuration

```typescript
interface ContextLifecycleConfig {
  maxContextsPerAgent: number;
  defaultTtl: number;
  cleanupInterval: number;
  enableMonitoring: boolean;
  enableEnrichment: boolean;
  memoryThresholds: {
    warning: number;
    critical: number;
  };
  errorRecovery: {
    maxRetries: number;
    retryDelay: number;
    enableAutoRecovery: boolean;
  };
  validation?: {
    strict: boolean;
    rules: string[];
  };
}
```

## Enrichment Pipeline

### EnrichmentPipeline

Processes context through multiple enrichers for enhanced contextual information.

```typescript
class EnrichmentPipeline {
  constructor(config: EnrichmentPipelineConfig);
  
  // Pipeline management
  async initialize(): Promise<void>;
  async shutdown(): Promise<void>;
  registerEnricher(entry: EnricherEntry): void;
  unregisterEnricher(name: string): void;
  
  // Enrichment operations
  async enrich(request: EnrichmentRequest): Promise<EnrichmentResult>;
  async enrichSelective(request: EnrichmentRequest, enricherNames: string[]): Promise<EnrichmentResult>;
  
  // Pipeline monitoring
  async getEnricherStatus(): Promise<Map<string, EnricherStatus>>;
  async checkEnricherHealth(): Promise<Map<string, HealthStatus>>;
  async profileEnrichment(request: EnrichmentRequest): Promise<EnrichmentProfile>;
  
  // Configuration
  setCache(cache: ContextCache): void;
  updateConfig(config: Partial<EnrichmentPipelineConfig>): void;
}
```

### Usage Example

```typescript
import { EnrichmentPipeline, createAllEnricherEntries } from '@symindx/context';

// Create pipeline
const pipeline = new EnrichmentPipeline({
  maxConcurrency: 5,
  defaultTimeout: 3000,
  enableCaching: true,
  cacheTtl: 300,
  enableGracefulDegradation: true
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

await pipeline.initialize();

// Enrich context
const enrichmentRequest = {
  agentId: 'agent-123',
  context: {
    userId: 'user-456',
    message: 'How are you feeling today?',
    sessionId: 'session-789'
  }
};

const result = await pipeline.enrich(enrichmentRequest);
console.log('Enriched context:', result.enrichedContext);
console.log('Performance metrics:', result.performanceMetrics);
```

### Configuration

```typescript
interface EnrichmentPipelineConfig {
  maxConcurrency: number;
  defaultTimeout: number;
  enableCaching: boolean;
  cacheTtl: number;
  enableMetrics: boolean;
  enableTracing: boolean;
  enableGracefulDegradation: boolean;
  retryStrategy: {
    maxRetries: number;
    backoffMs: number;
    exponential: boolean;
  };
}
```

## Context Enrichers

### Base Enricher Interface

All enrichers implement the `ContextEnricher` interface:

```typescript
interface ContextEnricher {
  name: string;
  version: string;
  priority: number;
  stage: EnrichmentStage;
  dependencies: string[];
  
  initialize(config: any): Promise<void>;
  enrich(context: UnifiedContext, metadata: EnrichmentMetadata): Promise<EnrichmentOutput>;
  healthCheck(): Promise<HealthStatus>;
  dispose(): Promise<void>;
}

type EnrichmentStage = 'PRE_PROCESSING' | 'CORE_ENRICHMENT' | 'POST_PROCESSING' | 'FINALIZATION';

interface EnrichmentOutput {
  enrichedData: Record<string, any>;
  confidence: number;
  processingTimeMs: number;
  cacheHint?: CacheHint;
}
```

### MemoryContextEnricher

Enriches context with relevant memories and historical patterns.

```typescript
class MemoryContextEnricher extends BaseContextEnricher {
  constructor(config: MemoryEnricherConfig);
  
  async enrich(context: UnifiedContext, metadata: EnrichmentMetadata): Promise<EnrichmentOutput>;
}

interface MemoryEnricherConfig {
  maxMemories: number;
  searchRadius: number; // days
  relevanceThreshold: number;
  includeEmotionalMemories: boolean;
  includeTemporalContext: boolean;
  memoryTypes?: string[];
}

// Usage
const memoryEnricher = new MemoryContextEnricher({
  maxMemories: 10,
  searchRadius: 30,
  relevanceThreshold: 0.3,
  includeEmotionalMemories: true,
  includeTemporalContext: true
});
```

### EmotionalContextEnricher

Enriches context with emotional state and trends.

```typescript
class EmotionalContextEnricher extends BaseContextEnricher {
  constructor(config: EmotionalEnricherConfig);
  
  async enrich(context: UnifiedContext, metadata: EnrichmentMetadata): Promise<EnrichmentOutput>;
}

interface EmotionalEnricherConfig {
  includeEmotionalHistory: boolean;
  historyDepth: number;
  includeEmotionalTrends: boolean;
  emotionRelevanceThreshold: number;
  volatilityWindowMs: number;
}

// Usage
const emotionalEnricher = new EmotionalContextEnricher({
  includeEmotionalHistory: true,
  historyDepth: 10,
  includeEmotionalTrends: true,
  emotionRelevanceThreshold: 0.3,
  volatilityWindowMs: 300000
});
```

### SocialContextEnricher

Enriches context with social relationship data.

```typescript
class SocialContextEnricher extends BaseContextEnricher {
  constructor(config: SocialEnricherConfig);
  
  async enrich(context: UnifiedContext, metadata: EnrichmentMetadata): Promise<EnrichmentOutput>;
}

interface SocialEnricherConfig {
  includeRelationshipData: boolean;
  includeConversationContext: boolean;
  includeSocialMetrics: boolean;
  trustDecayFactor: number;
  familiarityThreshold: number;
}

// Usage
const socialEnricher = new SocialContextEnricher({
  includeRelationshipData: true,
  includeConversationContext: true,
  includeSocialMetrics: true,
  trustDecayFactor: 0.95,
  familiarityThreshold: 0.5
});
```

### TemporalContextEnricher

Enriches context with time-based information.

```typescript
class TemporalContextEnricher extends BaseContextEnricher {
  constructor(config: TemporalEnricherConfig);
  
  async enrich(context: UnifiedContext, metadata: EnrichmentMetadata): Promise<EnrichmentOutput>;
}

interface TemporalEnricherConfig {
  includeTimeContext: boolean;
  includeSessionDuration: boolean;
  includeBusinessHours: boolean;
  includeChronologicalMarkers: boolean;
  timeZone: string;
}

// Usage
const temporalEnricher = new TemporalContextEnricher({
  includeTimeContext: true,
  includeSessionDuration: true,
  includeBusinessHours: true,
  includeChronologicalMarkers: true,
  timeZone: 'UTC'
});
```

### EnvironmentContextEnricher

Enriches context with system and runtime information.

```typescript
class EnvironmentContextEnricher extends BaseContextEnricher {
  constructor(config: EnvironmentEnricherConfig);
  
  async enrich(context: UnifiedContext, metadata: EnrichmentMetadata): Promise<EnrichmentOutput>;
}

interface EnvironmentEnricherConfig {
  includeSystemMetrics: boolean;
  includeAgentStatus: boolean;
  includePerformanceMetrics: boolean;
  includeRuntimeInfo: boolean;
}

// Usage
const environmentEnricher = new EnvironmentContextEnricher({
  includeSystemMetrics: true,
  includeAgentStatus: true,
  includePerformanceMetrics: true,
  includeRuntimeInfo: true
});
```

## Caching System

### ContextCache

Multi-layer caching system for context data.

```typescript
interface ContextCache {
  // Basic cache operations
  get(key: string): Promise<CacheEntry | null>;
  set(key: string, value: any, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  
  // Advanced operations
  getMultiple(keys: string[]): Promise<Map<string, CacheEntry>>;
  setMultiple(entries: Map<string, CacheValue>): Promise<void>;
  touch(key: string, ttl?: number): Promise<void>;
  
  // Cache management
  getStats(): Promise<CacheStats>;
  getHealth(): Promise<CacheHealth>;
  evict(strategy?: EvictionStrategy): Promise<number>;
}

interface CacheEntry {
  value: any;
  ttl: number;
  createdAt: Date;
  accessedAt: Date;
  hitCount: number;
}
```

### Usage Example

```typescript
import { createContextCache } from '@symindx/context/caching';

// Create multi-layer cache
const cache = await createContextCache({
  l1: {
    type: 'memory',
    maxSize: 100,
    ttl: 300
  },
  l2: {
    type: 'redis',
    host: 'localhost',
    port: 6379,
    maxSize: 1000,
    ttl: 3600
  },
  l3: {
    type: 'disk',
    path: './data/context-cache',
    maxSize: 10000,
    ttl: 86400
  }
});

// Use cache
await cache.set('context:agent-123', contextData, 1800);
const cachedContext = await cache.get('context:agent-123');

// Get cache statistics
const stats = await cache.getStats();
console.log('Cache hit rate:', stats.hitRate);
console.log('Memory usage:', stats.memoryUsage);
```

### Cache Strategies

```typescript
interface CacheStrategy {
  shouldCache(key: string, value: any, metadata: CacheMetadata): boolean;
  getTtl(key: string, value: any, metadata: CacheMetadata): number;
  getEvictionPriority(entry: CacheEntry): number;
}

// Built-in strategies
class FrequencyBasedStrategy implements CacheStrategy {
  constructor(config: FrequencyStrategyConfig);
}

class PredictiveStrategy implements CacheStrategy {
  constructor(config: PredictiveStrategyConfig);
}

class ResourceAwareStrategy implements CacheStrategy {
  constructor(config: ResourceAwareStrategyConfig);
}
```

## Context Injection

### ContextInjector

Dependency injection framework for context-aware components.

```typescript
class ContextInjector {
  constructor(config: ContextInjectorConfig);
  
  // Container management
  async initialize(): Promise<void>;
  async shutdown(): Promise<void>;
  
  // Service registration
  registerService<T>(token: string, factory: ServiceFactory<T>): void;
  registerSingleton<T>(token: string, factory: ServiceFactory<T>): void;
  registerValue<T>(token: string, value: T): void;
  
  // Dependency resolution
  resolve<T>(token: string): T;
  resolveAsync<T>(token: string): Promise<T>;
  createInstance<T>(constructor: Constructor<T>): T;
  
  // Context injection
  injectContext(target: any, contextId: string): Promise<void>;
  injectContextAsync(target: any, contextId: string): Promise<void>;
}
```

### Decorators

```typescript
// Injectable decorator
@injectable()
class MyService {
  constructor(
    @inject('context') private context: UnifiedContext,
    @inject('logger') private logger: Logger
  ) {}
}

// Context injection decorators
class MyComponent {
  @injectContext()
  private context: UnifiedContext;
  
  @injectContextField('memoryContext')
  private memories: MemoryContext;
  
  @injectContextField('currentEmotion')
  private emotion: EmotionState;
}
```

### Usage Example

```typescript
import { ContextInjector, injectable, inject } from '@symindx/context/injection';

// Create injector
const injector = new ContextInjector({
  contextManager: contextLifecycleManager,
  enableTypeValidation: true
});

await injector.initialize();

// Register services
injector.registerSingleton('logger', () => new Logger());
injector.registerService('contextualizer', (context) => new Contextualizer(context));

// Create context-aware service
@injectable()
class ChatHandler {
  constructor(
    @inject('context') private context: UnifiedContext,
    @inject('logger') private logger: Logger
  ) {}
  
  async handleMessage(message: string): Promise<string> {
    // Use enriched context
    const memories = this.context.memoryContext?.relevantMemories || [];
    const emotion = this.context.currentEmotion;
    
    this.logger.info('Processing message with context', {
      memoriesCount: memories.length,
      emotionalState: emotion?.dominant
    });
    
    return this.generateResponse(message, memories, emotion);
  }
}

// Resolve service with context injection
const chatHandler = injector.createInstance(ChatHandler);
```

## Multi-Agent Context

### ContextSharingManager

Manages shared context across multiple agents.

```typescript
class ContextSharingManager {
  constructor(config: ContextSharingConfig);
  
  // Sharing operations
  async shareContext(contextId: string, targetAgents: string[]): Promise<void>;
  async unshareContext(contextId: string, targetAgents: string[]): Promise<void>;
  async getSharedContexts(agentId: string): Promise<SharedContext[]>;
  
  // Synchronization
  async synchronizeContext(contextId: string): Promise<void>;
  async resolveConflicts(contextId: string, strategy: ConflictResolutionStrategy): Promise<void>;
  
  // Access control
  async grantAccess(contextId: string, agentId: string, permissions: ContextPermissions): Promise<void>;
  async revokeAccess(contextId: string, agentId: string): Promise<void>;
  async checkAccess(contextId: string, agentId: string): Promise<ContextPermissions>;
}

interface SharedContext {
  contextId: string;
  ownerId: string;
  sharedWith: string[];
  permissions: Map<string, ContextPermissions>;
  lastSyncAt: Date;
  conflictCount: number;
}

type ContextPermissions = 'read' | 'write' | 'admin';
type ConflictResolutionStrategy = 'last_write_wins' | 'priority_based' | 'merge' | 'manual';
```

### Usage Example

```typescript
import { ContextSharingManager } from '@symindx/context/multi-agent';

// Create sharing manager
const sharingManager = new ContextSharingManager({
  enableConflictResolution: true,
  defaultStrategy: 'priority_based',
  syncInterval: 30000
});

// Share context between agents
await sharingManager.shareContext('context-123', ['agent-456', 'agent-789']);

// Grant specific permissions
await sharingManager.grantAccess('context-123', 'agent-456', 'write');
await sharingManager.grantAccess('context-123', 'agent-789', 'read');

// Synchronize shared context
await sharingManager.synchronizeContext('context-123');

// Check for conflicts
const conflicts = await sharingManager.getConflicts('context-123');
if (conflicts.length > 0) {
  await sharingManager.resolveConflicts('context-123', 'priority_based');
}
```

## Configuration Reference

### Runtime Configuration

Complete configuration options for the context system:

```typescript
interface ContextConfig {
  // Basic settings
  enabled: boolean;
  migrationPhase?: number;
  
  // Lifecycle manager settings
  maxContextsPerAgent: number;
  defaultTtl: number;
  cleanupInterval: number;
  enableMonitoring: boolean;
  enableEnrichment: boolean;
  
  // Memory management
  memoryThresholds: {
    warning: number;
    critical: number;
  };
  
  // Error recovery
  errorRecovery: {
    maxRetries: number;
    retryDelay: number;
    enableAutoRecovery: boolean;
  };
  
  // Enrichment pipeline
  enrichmentConfig?: {
    maxConcurrency: number;
    defaultTimeout: number;
    enabledEnrichers: string[];
    enricherConfig: Record<string, any>;
    enableGracefulDegradation: boolean;
  };
  
  // Caching system
  cachingConfig?: {
    l1: CacheLayerConfig;
    l2?: CacheLayerConfig;
    l3?: CacheLayerConfig;
    strategies: CacheStrategyConfig;
  };
  
  // Context injection
  enableContextInjection?: boolean;
  injectionConfig?: {
    enableTypeValidation: boolean;
    enableAsyncInjection: boolean;
  };
  
  // Multi-agent features
  enableMultiAgentContext?: boolean;
  multiAgentConfig?: {
    enableContextSharing: boolean;
    enableContextSynchronization: boolean;
    sharingStrategy: 'selective' | 'automatic';
    conflictResolution: ConflictResolutionStrategy;
  };
  
  // Validation settings
  validation?: {
    strict: boolean;
    rules: string[];
  };
  
  // Monitoring and observability
  monitoringConfig?: {
    enableDetailedMetrics: boolean;
    enableProfiling: boolean;
    enableTracing: boolean;
    metricsExport?: {
      enabled: boolean;
      format: 'prometheus' | 'json';
      endpoint: string;
    };
  };
}
```

### Example Configuration

```typescript
// Production configuration
const productionConfig: ContextConfig = {
  enabled: true,
  migrationPhase: 4,
  maxContextsPerAgent: 10,
  defaultTtl: 3600000,
  cleanupInterval: 300000,
  enableMonitoring: true,
  enableEnrichment: true,
  
  memoryThresholds: {
    warning: 200 * 1024 * 1024,  // 200MB
    critical: 500 * 1024 * 1024  // 500MB
  },
  
  errorRecovery: {
    maxRetries: 3,
    retryDelay: 1000,
    enableAutoRecovery: true
  },
  
  enrichmentConfig: {
    maxConcurrency: 5,
    defaultTimeout: 3000,
    enabledEnrichers: ['memory', 'emotional', 'social', 'temporal', 'environment'],
    enricherConfig: {
      memory: {
        maxMemories: 10,
        searchRadius: 30,
        relevanceThreshold: 0.3
      }
    },
    enableGracefulDegradation: true
  },
  
  cachingConfig: {
    l1: {
      type: 'memory',
      maxSize: 100,
      ttl: 600
    },
    l2: {
      type: 'redis',
      maxSize: 500,
      ttl: 3600
    },
    strategies: {
      frequencyBased: { enabled: true },
      predictive: { enabled: true },
      resourceAware: { enabled: true }
    }
  },
  
  enableContextInjection: true,
  enableMultiAgentContext: true,
  
  multiAgentConfig: {
    enableContextSharing: true,
    enableContextSynchronization: true,
    sharingStrategy: 'selective',
    conflictResolution: 'priority_based'
  },
  
  validation: {
    strict: false,
    rules: ['required_fields', 'type_safety', 'resource_limits']
  },
  
  monitoringConfig: {
    enableDetailedMetrics: true,
    enableProfiling: false,
    enableTracing: false,
    metricsExport: {
      enabled: true,
      format: 'prometheus',
      endpoint: '/metrics'
    }
  }
};
```

## Error Handling

### Error Types

The context system defines specific error types:

```typescript
class ContextError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ContextError';
  }
}

// Specific error types
class ContextNotFoundError extends ContextError {
  constructor(contextId: string) {
    super(`Context not found: ${contextId}`, 'CONTEXT_NOT_FOUND', { contextId });
  }
}

class ContextExpiredError extends ContextError {
  constructor(contextId: string, expiredAt: Date) {
    super(`Context expired: ${contextId}`, 'CONTEXT_EXPIRED', { contextId, expiredAt });
  }
}

class EnrichmentError extends ContextError {
  constructor(enricherName: string, originalError: Error) {
    super(`Enrichment failed: ${enricherName}`, 'ENRICHMENT_FAILED', { 
      enricherName, 
      originalError: originalError.message 
    });
  }
}

class CacheError extends ContextError {
  constructor(operation: string, originalError: Error) {
    super(`Cache operation failed: ${operation}`, 'CACHE_ERROR', { 
      operation, 
      originalError: originalError.message 
    });
  }
}
```

### Error Handling Patterns

```typescript
// Graceful error handling with fallback
async function safeContextOperation<T>(
  operation: () => Promise<T>,
  fallback: () => T,
  logger?: Logger
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (logger) {
      logger.warn('Context operation failed, using fallback', { error });
    }
    
    if (error instanceof ContextError) {
      // Handle specific context errors
      switch (error.code) {
        case 'CONTEXT_NOT_FOUND':
          // Create new context or use default
          break;
        case 'CONTEXT_EXPIRED':
          // Refresh context or use cached version
          break;
        case 'ENRICHMENT_FAILED':
          // Continue with partial enrichment
          break;
      }
    }
    
    return fallback();
  }
}

// Usage
const enrichedContext = await safeContextOperation(
  () => pipeline.enrich(request),
  () => ({ enrichedContext: request.context, performanceMetrics: {} }),
  logger
);
```

### Retry Mechanisms

```typescript
interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  exponentialBackoff: boolean;
  retryableErrors: string[];
}

async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Check if error is retryable
      if (error instanceof ContextError && 
          !config.retryableErrors.includes(error.code)) {
        throw error;
      }
      
      if (attempt < config.maxRetries) {
        const delay = config.exponentialBackoff 
          ? config.retryDelay * Math.pow(2, attempt)
          : config.retryDelay;
          
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}
```

## Troubleshooting

### Common Issues and Solutions

#### Context Not Found Errors

**Problem**: `ContextNotFoundError` when accessing context

**Causes**:
- Context has expired
- Context was manually disposed
- Invalid context ID

**Solutions**:
```typescript
// Check if context exists before accessing
if (await contextManager.contextExists(contextId)) {
  const context = await contextManager.getContext(contextId);
} else {
  // Create new context or handle gracefully
  const newContextId = await contextManager.requestContext(originalRequest);
}

// Increase TTL for persistent contexts
const contextRequest = {
  // ... other properties
  scope: {
    visibility: 'private',
    ttl: 7200000 // 2 hours instead of default
  }
};
```

#### Enrichment Performance Issues

**Problem**: Slow context enrichment

**Causes**:
- Too many enrichers enabled
- Network latency for external enrichers
- Large datasets being processed

**Solutions**:
```typescript
// Reduce concurrent enrichers
const pipelineConfig = {
  maxConcurrency: 2,
  defaultTimeout: 1500
};

// Enable selective enrichment
const enrichmentResult = await pipeline.enrichSelective(
  request, 
  ['temporal', 'environment'] // Only essential enrichers
);

// Use caching aggressively
const cacheConfig = {
  l1: { ttl: 600 }, // 10 minutes
  enablePredictiveCache: true
};
```

#### Memory Usage Issues

**Problem**: High memory usage from context system

**Causes**:
- Context accumulation
- Cache size too large
- Memory leaks in enrichers

**Solutions**:
```typescript
// Monitor memory usage
const metrics = await contextManager.getMetrics();
if (metrics.resources.memoryUsage > MEMORY_THRESHOLD) {
  await contextManager.emergencyCleanup();
}

// Reduce cache sizes
const cacheConfig = {
  l1: { maxSize: 50 },  // Reduced from default
  l2: { maxSize: 200 }
};

// Implement memory pressure handling
contextManager.onMemoryPressure(async (level) => {
  if (level === 'critical') {
    await contextManager.emergencyCleanup();
    await cache.evict('lru');
  }
});
```

#### Cache Inconsistency

**Problem**: Stale or inconsistent cached data

**Causes**:
- Cache invalidation issues
- Concurrent access problems
- Network partitions (for distributed cache)

**Solutions**:
```typescript
// Enable cache warming
const cacheConfig = {
  warming: {
    enabled: true,
    strategies: ['frequency_based'],
    warmupSchedule: '0 */4 * * *' // Every 4 hours
  }
};

// Force cache refresh
await cache.delete(cacheKey);
const freshData = await enricher.enrich(context);
await cache.set(cacheKey, freshData);

// Use cache versioning
const versionedKey = `${cacheKey}:v${CACHE_VERSION}`;
```

### Debug Commands Reference

```bash
# Context system status
bun cli context:status --detailed

# Debug specific context
bun cli context:debug <context-id> --include-enrichment --include-cache

# Memory analysis
bun cli context:memory-analysis --include-breakdown

# Performance profiling
bun cli context:profile --duration 300 --include-enrichers

# Cache analysis
bun cli context:cache-stats --detailed

# Health check
bun cli context:health-check --include-enrichers

# Export context for analysis
bun cli context:export <context-id> --format json --include-metadata

# Test enrichment pipeline
bun cli context:test-enrichment --all-enrichers --verbose

# Monitor context activity
bun cli context:monitor --real-time --duration 600
```

### Performance Monitoring

```typescript
// Set up performance monitoring
const performanceMonitor = {
  enableMetrics: true,
  metricsInterval: 60000, // 1 minute
  thresholds: {
    enrichmentTime: 2000,    // 2 seconds
    memoryUsage: 200 * 1024 * 1024, // 200MB
    cacheHitRate: 0.8        // 80%
  }
};

contextManager.enableMonitoring(performanceMonitor);

// Alert on threshold violations
contextManager.onThresholdViolation((metric, value, threshold) => {
  console.warn(`Performance threshold violated: ${metric} = ${value} (threshold: ${threshold})`);
  
  // Take corrective action
  switch (metric) {
    case 'enrichmentTime':
      // Reduce enricher concurrency
      pipeline.updateConfig({ maxConcurrency: 2 });
      break;
    case 'memoryUsage':
      // Trigger cleanup
      contextManager.emergencyCleanup();
      break;
    case 'cacheHitRate':
      // Optimize cache strategy
      cache.optimizeStrategy();
      break;
  }
});
```

This comprehensive API reference provides complete coverage of the Context Integration system, enabling developers to effectively implement and troubleshoot context-aware features in their SYMindX applications.