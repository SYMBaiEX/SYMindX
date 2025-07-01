---
sidebar_position: 6
sidebar_label: "Modules"
title: "Modules"
description: "Core modules: memory, emotion, cognition"
---

# Modules

Modules are the building blocks of agent intelligence in SYMindX. They provide specialized capabilities that can be mixed and matched to create unique agent behaviors and personalities. Each module type serves a specific purpose in the agent's cognitive architecture.

## Module Architecture

SYMindX follows a consistent pattern for all modules:

```typescript
// Common module interface pattern
interface Module<TConfig, TState> {
  // Lifecycle methods
  init(agent: Agent): Promise<void>
  tick(agent: Agent): Promise<void>
  
  // State management
  getState(): Promise<TState>
  setState(state: TState): Promise<void>
  
  // Module-specific methods
  // ...
}
```

## Module Categories

### Core Modules

Essential modules that every agent requires:

```
┌─────────────────────────────────────────────────────────┐
│                    Core Modules                          │
├─────────────────┬─────────────────┬─────────────────────┤
│     Memory      │     Emotion     │     Cognition       │
├─────────────────┼─────────────────┼─────────────────────┤
│ • SQLite        │ • Emotion Stack │ • HTN Planner       │
│ • PostgreSQL    │ • Basic         │ • Reactive          │
│ • Supabase      │ • Complex       │ • Hybrid            │
│ • Neon          │ • Plutchik      │ • Goal-Oriented     │
│ • In-Memory     │ • Dimensional   │ • Behavior Tree     │
└─────────────────┴─────────────────┴─────────────────────┘
```

### Advanced Modules

Optional modules for enhanced capabilities:

```
┌─────────────────────────────────────────────────────────┐
│                  Advanced Modules                        │
├────────────────┬────────────────┬──────────────────────┤
│ Consciousness  │    Behavior     │       Tools          │
├────────────────┼────────────────┼──────────────────────┤
│ • Self-Aware   │ • Autonomous    │ • Code Execution     │
│ • Meta-Cogn.   │ • Social        │ • Web Browsing       │
│ • Reflective   │ • Learning      │ • File System        │
│ • Transcendent │ • Adaptive      │ • API Integration    │
└────────────────┴────────────────┴──────────────────────┘
```

## Module System Features

### Factory Pattern

All modules are created using factory functions for consistency:

```typescript
import { createMemoryProvider, createEmotionModule, createCognitionModule } from '@symindx/modules'

// Create modules with type safety
const memory = createMemoryProvider('sqlite', { 
  dbPath: './data/agent.db' 
})

const emotion = createEmotionModule('complex_emotions', {
  sensitivity: 0.8,
  decayRate: 0.1
})

const cognition = createCognitionModule('htn_planner', {
  planningDepth: 5,
  creativityLevel: 0.7
})
```

### Hot-Swappable Modules

Modules can be replaced at runtime without restarting:

```typescript
// Switch from SQLite to PostgreSQL
const newMemory = createMemoryProvider('postgres', pgConfig)
await agent.replaceModule('memory', newMemory)

// Change emotion processing system
const newEmotion = createEmotionModule('plutchik_wheel', config)
await agent.replaceModule('emotion', newEmotion)
```

### Module Registry

The registry manages all available modules:

```typescript
class ModuleRegistry {
  // Register a new module type
  registerMemoryFactory(type: string, factory: MemoryFactory)
  registerEmotionFactory(type: string, factory: EmotionFactory)
  registerCognitionFactory(type: string, factory: CognitionFactory)
  
  // List available modules
  listMemoryProviders(): string[]
  listEmotionModules(): string[]
  listCognitionModules(): string[]
  
  // Create module instances
  createMemoryProvider(type: string, config: any): MemoryProvider
  createEmotionModule(type: string, config: any): EmotionModule
  createCognitionModule(type: string, config: any): CognitionModule
}
```

## Module Communication

Modules communicate through standardized interfaces:

### Event-Based Communication

```typescript
// Emotion module emits state changes
emotion.on('stateChange', (newState) => {
  eventBus.emit({
    type: 'EMOTION_CHANGE',
    source: 'emotion_module',
    data: { state: newState }
  })
})

// Cognition module subscribes to emotion changes
cognition.on('init', () => {
  eventBus.subscribe('EMOTION_CHANGE', (event) => {
    cognition.adjustCreativity(event.data.state)
  })
})
```

### Direct Module Interaction

```typescript
// Cognition module queries memory
const relevantMemories = await memory.retrieve(
  agent.id, 
  "previous interactions with user",
  limit: 10
)

// Use memories in decision making
const decision = await cognition.decide(agent, {
  options: possibleActions,
  context: { memories: relevantMemories }
})
```

## Module Configuration

### Configuration Schema

Each module type has a specific configuration schema:

```typescript
interface MemoryConfig {
  provider: MemoryProviderType
  maxRecords: number
  embeddingModel?: string
  retentionDays?: number
  config?: {
    // Provider-specific options
    dbPath?: string           // SQLite
    connectionString?: string // PostgreSQL
    projectUrl?: string       // Supabase
  }
}

interface EmotionConfig {
  type: EmotionModuleType
  sensitivity: number      // 0-1: How reactive to stimuli
  decayRate: number       // 0-1: How fast emotions fade
  transitionSpeed: number // 0-1: How quickly emotions change
  emotionRange?: string[] // Available emotions
}

interface CognitionConfig {
  type: CognitionModuleType
  planningDepth: number      // Steps to look ahead
  memoryIntegration: boolean // Use memories in decisions
  creativityLevel: number    // 0-1: Solution creativity
  learningRate?: number      // For adaptive modules
}
```

### Default Configurations

SYMindX provides sensible defaults:

```typescript
const DEFAULT_MEMORY_CONFIG = {
  provider: 'sqlite',
  maxRecords: 10000,
  retentionDays: 30
}

const DEFAULT_EMOTION_CONFIG = {
  type: 'basic_emotions',
  sensitivity: 0.5,
  decayRate: 0.1,
  transitionSpeed: 0.3
}

const DEFAULT_COGNITION_CONFIG = {
  type: 'reactive',
  planningDepth: 3,
  memoryIntegration: true,
  creativityLevel: 0.5
}
```

## Module Development

### Creating Custom Modules

Extend SYMindX with custom modules:

```typescript
// Custom memory provider
class CustomMemoryProvider implements MemoryProvider {
  async store(agentId: string, memory: MemoryRecord): Promise<void> {
    // Implementation
  }
  
  async retrieve(agentId: string, query: string, limit?: number): Promise<MemoryRecord[]> {
    // Implementation
  }
  
  // ... other required methods
}

// Register custom module
registry.registerMemoryFactory('custom', (config) => {
  return new CustomMemoryProvider(config)
})
```

### Module Testing

Test modules in isolation:

```typescript
import { createTestAgent, TestEventBus } from '@symindx/testing'

describe('CustomEmotionModule', () => {
  it('should process emotional events', async () => {
    const emotion = new CustomEmotionModule()
    const agent = createTestAgent({ emotion })
    const events = [
      { type: 'positive_feedback', intensity: 0.8 }
    ]
    
    await emotion.update(agent, events)
    const state = await emotion.getState()
    
    expect(state.current).toBe('happy')
    expect(state.intensity).toBeGreaterThan(0.5)
  })
})
```

## Module Types Overview

### Memory Modules
Store and retrieve agent experiences:
- **SQLite**: Local file-based storage
- **PostgreSQL**: Scalable relational storage
- **Supabase**: Cloud-native with vector search
- **Neon**: Serverless PostgreSQL
- **In-Memory**: Fast temporary storage

### Emotion Modules
Process and manage emotional states:
- **Emotion Stack**: RuneScape-inspired system
- **Basic Emotions**: Simple happy/sad/angry/fearful
- **Complex Emotions**: Nuanced emotional states
- **Plutchik Wheel**: Eight primary emotions
- **Dimensional**: Valence-arousal model

### Cognition Modules
Handle reasoning and decision-making:
- **HTN Planner**: Hierarchical task planning
- **Reactive**: Stimulus-response patterns
- **Hybrid**: Combines planning and reactive
- **Goal-Oriented**: Pursue objectives
- **Behavior Tree**: Game AI patterns

### Consciousness Modules
Advanced self-awareness capabilities:
- **Basic Awareness**: Simple self-model
- **Meta-Cognitive**: Think about thinking
- **Reflective**: Learn from experiences
- **Transcendent**: Beyond human cognition

### Behavior Modules
Define action patterns:
- **Autonomous**: Self-directed actions
- **Social**: Interaction patterns
- **Learning**: Adaptive behaviors
- **Scripted**: Predefined sequences

### Tool Modules
External capabilities:
- **Code Execution**: Run code safely
- **Web Browsing**: Access internet
- **File System**: Read/write files
- **API Client**: Call external APIs

## Performance Considerations

### Module Optimization

- **Lazy Loading**: Load modules only when needed
- **Caching**: Cache frequently accessed data
- **Batch Operations**: Process multiple items together
- **Async Processing**: Non-blocking operations

### Resource Management

```typescript
// Monitor module resource usage
const metrics = module.getMetrics()
console.log(`Memory usage: ${metrics.memoryMB}MB`)
console.log(`CPU time: ${metrics.cpuMs}ms`)
console.log(`Operations/sec: ${metrics.opsPerSecond}`)
```

## Next Steps

Explore specific module types in detail:
- [Memory Modules](/docs/modules/memory) - Data persistence systems
- [Emotion Modules](/docs/modules/emotion) - Emotional processing
- [Cognition Modules](/docs/modules/cognition) - Thinking and planning
- [Consciousness Modules](/docs/modules/consciousness) - Self-awareness
- [Behavior Modules](/docs/modules/behavior) - Action patterns
- [Tools](/docs/modules/tools) - External capabilities
