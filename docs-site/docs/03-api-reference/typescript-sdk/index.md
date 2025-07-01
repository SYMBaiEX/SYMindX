---
sidebar_position: 3
sidebar_label: "TypeScript SDK"
title: "TypeScript SDK"
description: "TypeScript SDK documentation"
---

# TypeScript SDK

The SYMindX TypeScript SDK provides a type-safe, modular interface for building AI agents and integrating with the SYMindX runtime. With comprehensive TypeScript support, factory patterns, and clean architecture principles, the SDK enables rapid development of sophisticated AI applications.

## Installation

```bash
npm install @symindx/core
# or
bun add @symindx/core
```

## Quick Start

```typescript
import { SYMindX } from '@symindx/core';

// Initialize the runtime
const runtime = new SYMindX.Runtime({
  agents: ['nyx'],
  extensions: ['api', 'slack'],
  storage: './data'
});

// Create an agent
const agent = await runtime.createAgent({
  id: 'assistant',
  name: 'AI Assistant',
  characterPath: './characters/nyx.json'
});

// Start the runtime
await runtime.start();

// Send a message to the agent
const response = await agent.chat('Hello, how can you help?');
console.log(response);
```

## Core Concepts

### Runtime System

The runtime orchestrates all agents, modules, and extensions:

```typescript
import { Runtime, RuntimeConfig } from '@symindx/core';

const config: RuntimeConfig = {
  agents: ['nyx', 'aria'],
  extensions: ['api', 'telegram'],
  storage: './data',
  tickInterval: 100,
  maxConcurrentAgents: 5
};

const runtime = new Runtime(config);

// Runtime lifecycle
await runtime.start();
await runtime.stop();

// Access runtime statistics
const stats = runtime.getStats();
console.log(`Active agents: ${stats.agents}`);
```

### Agent Creation

Agents are created using factory functions with full type safety:

```typescript
import { createAgent, AgentConfig } from '@symindx/core';

const agentConfig: AgentConfig = {
  id: 'my-agent',
  name: 'Custom Agent',
  personality: 'helpful and curious',
  memory: {
    provider: 'sqlite',
    config: {
      dbPath: './data/memories.db'
    }
  },
  emotion: {
    module: 'rune_emotion_stack',
    config: {
      initialState: 'neutral'
    }
  },
  cognition: {
    module: 'htn_planner',
    config: {
      maxDepth: 5
    }
  }
};

const agent = await createAgent(agentConfig);
```

### Module System

All modules follow a consistent factory pattern:

```typescript
import { 
  createMemoryProvider,
  createEmotionModule,
  createCognitionModule,
  createPortal
} from '@symindx/core';

// Memory providers
const memory = createMemoryProvider('sqlite', {
  dbPath: './data/memories.db',
  maxMemories: 10000
});

// Emotion modules
const emotion = createEmotionModule('rune_emotion_stack', {
  emotionDecay: 0.1,
  intensityThreshold: 0.5
});

// Cognition modules
const cognition = createCognitionModule('reactive', {
  reactionSpeed: 100,
  contextWindow: 10
});

// AI portals
const portal = createPortal('openai', {
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4'
});
```

### Type System

Comprehensive TypeScript types for all components:

```typescript
import type {
  Agent,
  AgentConfig,
  MemoryRecord,
  EmotionState,
  CognitionResult,
  Extension,
  ExtensionConfig,
  Portal,
  PortalConfig
} from '@symindx/core';

// Type-safe agent interaction
async function processAgentResponse(agent: Agent): Promise<void> {
  const emotion: EmotionState = agent.emotion.current;
  const memories: MemoryRecord[] = await agent.memory.retrieve(
    agent.id,
    'recent',
    10
  );
  
  console.log(`Agent ${agent.name} feels ${emotion}`);
}
```

## Advanced Features

### Multi-Agent Systems

```typescript
import { MultiAgentManager } from '@symindx/core';

const manager = new MultiAgentManager({
  maxAgents: 10,
  loadBalancing: true,
  resourceSharing: true
});

// Spawn agents dynamically
const agentId = await manager.spawnAgent({
  characterId: 'sage',
  instanceName: 'Sage-Helper',
  priority: 2
});

// Route conversations to best agent
const bestAgent = manager.routeConversation({
  topic: 'technical support',
  requiredSkills: ['debugging', 'patience'],
  preferredPersonality: 'calm'
});

// Coordinate multi-agent tasks
const result = await manager.coordinateTask({
  task: 'analyze codebase',
  agents: ['nyx', 'sage'],
  strategy: 'parallel'
});
```

### Extension Development

```typescript
import { Extension, ExtensionType, ExtensionStatus } from '@symindx/core';

export class CustomExtension implements Extension {
  id = 'custom';
  name = 'Custom Extension';
  type = ExtensionType.UTILITY;
  status = ExtensionStatus.DISABLED;

  async init(agent: Agent): Promise<void> {
    // Initialize extension
    console.log(`Initializing ${this.name} for ${agent.name}`);
    this.status = ExtensionStatus.ENABLED;
  }

  async tick(agent: Agent): Promise<void> {
    // Called every runtime tick
    if (agent.emotion.current === 'excited') {
      console.log(`${agent.name} is excited!`);
    }
  }

  async stop(): Promise<void> {
    // Cleanup
    this.status = ExtensionStatus.DISABLED;
  }
}
```

### Portal Integration

```typescript
import { Portal, PortalMessage, PortalResponse } from '@symindx/core';

// Use existing portal
const openai = createPortal('openai', {
  apiKey: process.env.OPENAI_API_KEY
});

const response = await openai.generateResponse([
  { role: 'system', content: 'You are a helpful assistant' },
  { role: 'user', content: 'Explain quantum computing' }
]);

// Create custom portal
export class CustomPortal implements Portal {
  id = 'custom';
  name = 'Custom AI Portal';
  
  async generateResponse(
    messages: PortalMessage[]
  ): Promise<PortalResponse> {
    // Implement custom AI integration
    return {
      content: 'Custom response',
      model: 'custom-model',
      usage: { tokens: 100 }
    };
  }
}
```

## API Reference

### SYMindX Namespace

The main entry point providing all factory functions:

```typescript
import { SYMindX } from '@symindx/core';

// Runtime
const runtime = new SYMindX.Runtime(config);

// Factories
const memory = SYMindX.createMemory('sqlite', config);
const emotion = SYMindX.createEmotion('rune_emotion_stack', config);
const cognition = SYMindX.createCognition('htn_planner', config);
const portal = SYMindX.createPortal('anthropic', config);

// Types
type Agent = SYMindX.Types.Agent;
type MemoryRecord = SYMindX.Types.MemoryRecord;
```

### Error Handling

All SDK methods use Result types for error handling:

```typescript
import { Result, ErrorCode } from '@symindx/core';

async function safeOperation(): Promise<Result<string>> {
  try {
    const data = await riskyOperation();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message: error.message
      }
    };
  }
}

// Usage
const result = await safeOperation();
if (result.success) {
  console.log('Success:', result.data);
} else {
  console.error('Error:', result.error);
}
```

## Best Practices

1. **Use Factory Functions**: Always use provided factory functions for type safety
2. **Handle Errors**: Implement proper error handling with Result types
3. **Manage Resources**: Clean up agents and extensions when done
4. **Type Imports**: Import types separately for better tree-shaking
5. **Configuration**: Use environment variables for sensitive data

## Migration Guide

Coming from vanilla JavaScript:

```javascript
// Before (JavaScript)
const agent = new Agent({ name: 'Bot' });

// After (TypeScript)
import { createAgent, AgentConfig } from '@symindx/core';

const config: AgentConfig = {
  id: 'bot',
  name: 'Bot',
  characterPath: './characters/bot.json'
};

const agent = await createAgent(config);
```

## Next Steps

- Explore [Agent Development](./agents) for building custom agents
- Learn about [Module Creation](./modules) for extending functionality
- Review [Type Definitions](./types) for complete type reference
- Check [Runtime API](./runtime) for system management
