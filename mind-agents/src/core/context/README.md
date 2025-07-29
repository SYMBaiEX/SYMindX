# Context Enrichment System

The Context Enrichment System transforms basic context into rich, actionable context for SYMindX agents through a modular pipeline of specialized enrichers.

## Overview

The system consists of:

- **EnrichmentPipeline**: Orchestrates multiple enrichers with priority-based execution, parallel processing, caching, and comprehensive metrics
- **Context Enrichers**: Specialized modules that add specific types of contextual information
- **Type System**: Comprehensive TypeScript definitions for type-safe enrichment operations

## Available Enrichers

### 1. MemoryContextEnricher
Adds relevant memories and historical patterns:
- Searches for contextually relevant memories
- Provides temporal memory context (recent vs historical)
- Analyzes memory patterns and learning progression
- Generates memory-based insights

### 2. EnvironmentContextEnricher  
Adds system and runtime environment information:
- System metrics (memory usage, platform, uptime)
- Agent status and active modules
- Runtime information (session ID, timestamps)
- Performance metrics

### 3. EmotionalContextEnricher
Adds emotional state and emotional insights:
- Current emotional state with confidence scores
- Emotional history and trends
- Contextual emotion analysis
- Emotional volatility and stability metrics

### 4. SocialContextEnricher
Adds social relationship and interaction data:
- Relationship mapping with trust and familiarity scores
- Conversation context and participant analysis
- Social metrics and communication style recommendations
- Interaction patterns and social dynamics

### 5. TemporalContextEnricher
Adds time-based context and chronological awareness:
- Current time context (time of day, day of week, season)
- Session duration and activity tracking
- Business hours analysis
- Chronological markers (first interaction, returning user, etc.)

## Usage Example

```typescript
import { 
  EnrichmentPipeline,
  createAllEnricherEntries,
  EnrichmentRequest
} from '../context';
import { memoryProvider, emotionModule, agent } from '../your-dependencies';

// Create enrichment pipeline
const pipeline = new EnrichmentPipeline({
  maxConcurrency: 5,
  defaultTimeout: 3000,
  enableCaching: true,
  cacheTtl: 300,
});

// Register enrichers
const enricherEntries = createAllEnricherEntries({
  memoryProvider,
  agentProvider: () => agent,
  emotionProvider: () => emotionModule,
});

for (const entry of enricherEntries) {
  pipeline.registerEnricher(entry);
}

// Initialize pipeline
await pipeline.initialize();

// Enrich context
const request: EnrichmentRequest = {
  agentId: 'agent-123',
  context: {
    userId: 'user-456',
    message: 'Hello, how are you today?',
    sessionId: 'session-789',
  },
};

const result = await pipeline.enrich(request);

// Access enriched context
console.log('Memory context:', result.enrichedContext.memoryContext);
console.log('Emotional state:', result.enrichedContext.currentEmotion);
console.log('Social metrics:', result.enrichedContext.socialMetrics);
console.log('Temporal info:', result.enrichedContext.temporalContext);
```

## Pipeline Features

### Priority-Based Execution
Enrichers execute based on priority and stage:
- **PRE_PROCESSING**: Environment, Temporal
- **CORE_ENRICHMENT**: Memory, Emotional, Social  
- **POST_PROCESSING**: Custom enrichers
- **FINALIZATION**: Final processing enrichers

### Parallel Processing
Independent enrichers run in parallel for optimal performance:
- Automatic dependency resolution
- Configurable concurrency limits
- Progress tracking and error isolation

### Intelligent Caching
- Per-enricher cache configuration
- TTL-based cache expiration
- Cache hit rate monitoring
- Memory-efficient storage

### Comprehensive Metrics
- Execution time tracking
- Success/failure rates
- Cache performance
- Resource usage monitoring

## Configuration

### Pipeline Configuration
```typescript
const pipelineConfig = {
  maxConcurrency: 5,           // Max concurrent enrichers
  defaultTimeout: 3000,        // Default enricher timeout (ms)
  enableCaching: true,         // Enable result caching
  cacheTtl: 300,              // Default cache TTL (seconds)
  enableMetrics: true,         // Enable metrics collection
  enableTracing: false,        // Enable detailed tracing
  retryStrategy: {
    maxRetries: 3,
    backoffMs: 100,
    exponential: true,
  },
};
```

### Individual Enricher Configuration
```typescript
const memoryConfig = {
  maxMemories: 10,
  searchRadius: 30,           // Days
  relevanceThreshold: 0.3,
  includeEmotionalMemories: true,
  includeTemporalContext: true,
};

const emotionalConfig = {
  includeEmotionalHistory: true,
  historyDepth: 10,
  includeEmotionalTrends: true,
  emotionRelevanceThreshold: 0.3,
  volatilityWindowMs: 300000, // 5 minutes
};
```

## Architecture

### Base Enricher
All enrichers extend `BaseContextEnricher` which provides:
- Lifecycle management (initialize, dispose)
- Health checking
- Configuration validation
- Error handling and logging
- Confidence score calculation

### Type Safety
Comprehensive TypeScript definitions ensure:
- Type-safe enrichment requests and results
- Proper interface contracts
- Compile-time validation
- IntelliSense support

### Extensibility
Add custom enrichers by:
1. Extending `BaseContextEnricher`
2. Implementing required abstract methods
3. Registering with the pipeline
4. Configuring dependencies and priority

## Performance Considerations

- **Caching**: Reduces redundant computations
- **Parallel Execution**: Maximizes throughput
- **Timeouts**: Prevents hanging operations
- **Resource Monitoring**: Tracks memory and CPU usage
- **Graceful Degradation**: Continues with partial enrichment on failures

## Error Handling

The system provides robust error handling:
- Individual enricher failures don't break the pipeline
- Comprehensive error logging and metrics
- Graceful degradation with partial results
- Retry mechanisms with exponential backoff
- Health monitoring and alerting

## Integration

The enrichment system integrates with:
- **Memory System**: For historical context and learning
- **Emotion System**: For emotional awareness
- **Agent Runtime**: For system and agent state
- **Extension System**: For additional enrichers
- **Observability**: For monitoring and metrics