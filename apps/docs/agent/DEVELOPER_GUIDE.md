# SYMindX Developer Guide

## Table of Contents

1. [Getting Started](#getting-started)
2. [Development Environment](#development-environment)
3. [Project Structure](#project-structure)
4. [Creating Extensions](#creating-extensions)
5. [Creating Portals](#creating-portals)
6. [Creating Memory Providers](#creating-memory-providers)
7. [Creating Emotion Modules](#creating-emotion-modules)
8. [Creating Cognition Modules](#creating-cognition-modules)
9. [Auto-Discovery System](#auto-discovery-system)
10. [Testing](#testing)
11. [TypeScript Guidelines](#typescript-guidelines)
12. [Best Practices](#best-practices)
13. [Deployment](#deployment)
14. [Contributing](#contributing)

## Getting Started

### Prerequisites

- **Node.js** 18+ or **Bun** 1.0+
- **TypeScript** 5.8+
- **Git** for version control
- At least one AI provider API key (OpenAI, Anthropic, Groq, etc.)

### Quick Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/symindx.git
cd symindx/mind-agents

# Install dependencies
bun install

# Copy example configuration
cp src/core/config/runtime.example.json src/core/config/runtime.json

# Add your API keys to runtime.json
# Build the project
bun run build

# Start development server
bun run dev
```

## Development Environment

### Required Tools

```bash
# Core development tools
bun >= 1.0.0              # Package manager and runtime
typescript >= 5.8.0       # TypeScript compiler
eslint >= 9.0.0          # Code linting
prettier >= 3.0.0        # Code formatting

# Optional but recommended
@types/node >= 22.0.0     # Node.js type definitions
concurrently >= 9.0.0     # Run multiple commands
husky >= 9.0.0            # Git hooks
```

### Development Scripts

```bash
# Development workflow
bun dev                   # Start development server with hot reload
bun dev:website          # Start website development server
bun build                # Build TypeScript to JavaScript
bun test                 # Run test suite
bun lint                 # Run ESLint
bun format               # Format code with Prettier

# CLI commands
bun cli                  # Interactive CLI
bun cli:dashboard        # Dashboard view
bun cli:agents           # Agent management
bun cli:status           # System status

# Build variants
bun build:simple         # Simple TypeScript build
bun build:cli           # Build CLI components
bun build:all           # Build everything
```

### Environment Configuration

Create a `.env` file in the project root:

```bash
# AI Provider API Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GROQ_API_KEY=gsk_...
XAI_API_KEY=xai-...
GOOGLE_API_KEY=...

# Database Configuration
SQLITE_DB_PATH=./data/memories.db
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=...
POSTGRES_CONNECTION_STRING=postgresql://...
NEON_DATABASE_URL=postgresql://...

# Extension Configuration
TELEGRAM_BOT_TOKEN=...
API_SERVER_PORT=3000
```

## Project Structure

```
mind-agents/
├── src/
│   ├── api.ts                 # Public API exports
│   ├── index.ts               # Main entry point
│   │
│   ├── core/                  # Core runtime system
│   │   ├── runtime.ts         # Main runtime orchestrator
│   │   ├── registry.ts        # Module registry
│   │   ├── event-bus.ts       # Event system
│   │   ├── portal-integration.ts # Portal management
│   │   └── config/            # Configuration files
│   │
│   ├── types/                 # Centralized type system
│   │   ├── index.ts           # All type exports
│   │   ├── agent.ts           # Agent types
│   │   ├── emotion.ts         # Emotion types
│   │   ├── memory.ts          # Memory types
│   │   └── portal.ts          # Portal types
│   │
│   ├── modules/               # Pluggable modules
│   │   ├── memory/            # Memory providers
│   │   ├── emotion/           # Emotion modules
│   │   └── cognition/         # Cognition modules
│   │
│   ├── extensions/            # Extension system
│   │   ├── api/               # HTTP/WebSocket server
│   │   ├── telegram/          # Telegram bot
│   │   ├── mcp-server/        # MCP server
│   │   └── communication/     # Communication engine
│   │
│   ├── portals/               # AI provider integrations
│   │   ├── openai/            # OpenAI integration
│   │   ├── anthropic/         # Anthropic integration
│   │   ├── groq/              # Groq integration
│   │   └── [others]/          # Other providers
│   │
│   ├── characters/            # Agent configurations
│   │   ├── nyx.json           # Example character
│   │   └── examples/          # Character templates
│   │
│   ├── cli/                   # Command-line interface
│   │   ├── components/        # CLI React components
│   │   ├── commands/          # CLI commands
│   │   └── hooks/             # CLI hooks
│   │
│   └── utils/                 # Utility functions
│       ├── logger.ts          # Logging system
│       └── config-resolver.ts # Configuration resolution
│
├── docs/                      # Documentation
├── data/                      # Runtime data (gitignored)
├── dist/                      # Build output (gitignored)
└── package.json              # Project configuration
```

## Creating Extensions

Extensions add new capabilities to agents and integrate with external platforms.

### Extension Interface

All extensions must implement the `Extension` interface:

```typescript
interface Extension {
  id: string;
  name: string;
  version: string;
  enabled: boolean;
  config: Record<string, any>;
  
  // Lifecycle methods
  init(agent: Agent): Promise<void>;
  tick(agent: Agent): Promise<void>;
  shutdown(): Promise<void>;
  
  // Capabilities
  actions: Record<string, ExtensionAction>;
  events: Record<string, ExtensionEventHandler>;
  
  // Health and status
  getStatus(): ExtensionStatus;
  healthCheck(): Promise<boolean>;
}
```

### Step-by-Step Extension Creation

#### 1. Create Extension Directory

```bash
mkdir -p src/extensions/my-extension
cd src/extensions/my-extension
```

#### 2. Create Package Configuration

Create `package.json`:

```json
{
  "name": "@symindx/extension-my-extension",
  "version": "1.0.0",
  "description": "My custom extension for SYMindX",
  "main": "index.js",
  "type": "module",
  "symindx": {
    "extension": {
      "type": "my-extension",
      "factory": "createMyExtension",
      "autoRegister": true
    }
  }
}
```

#### 3. Create Type Definitions

Create `types.ts`:

```typescript
// Extension-specific types
export interface MyExtensionConfig {
  apiKey: string;
  endpoint: string;
  timeout: number;
  retries: number;
}

export interface MyExtensionStatus {
  connected: boolean;
  lastActivity: Date;
  errorCount: number;
}

// Extension actions
export interface MyActionParams {
  target: string;
  message: string;
  options?: Record<string, any>;
}

export interface MyActionResult {
  success: boolean;
  response?: string;
  error?: string;
}
```

#### 4. Implement Extension Class

Create `index.ts`:

```typescript
import { Extension, ExtensionAction, ExtensionEventHandler, Agent } from '../../types/index.js';
import { MyExtensionConfig, MyExtensionStatus, MyActionParams, MyActionResult } from './types.js';

export class MyExtension implements Extension {
  id = 'my-extension';
  name = 'My Extension';
  version = '1.0.0';
  enabled = true;
  config: MyExtensionConfig;
  
  private client: any;
  private status: MyExtensionStatus;
  
  constructor(config: MyExtensionConfig) {
    this.config = config;
    this.status = {
      connected: false,
      lastActivity: new Date(),
      errorCount: 0
    };
  }
  
  async init(agent: Agent): Promise<void> {
    try {
      // Initialize extension
      this.client = new MyClient(this.config);
      await this.client.connect();
      
      this.status.connected = true;
      console.log(`${this.name} initialized for agent ${agent.id}`);
    } catch (error) {
      this.status.errorCount++;
      throw new Error(`Failed to initialize ${this.name}: ${error.message}`);
    }
  }
  
  async tick(agent: Agent): Promise<void> {
    if (!this.enabled || !this.status.connected) {
      return;
    }
    
    try {
      // Perform periodic tasks
      await this.performPeriodicTasks(agent);
      this.status.lastActivity = new Date();
    } catch (error) {
      this.status.errorCount++;
      console.error(`${this.name} tick error:`, error);
    }
  }
  
  async shutdown(): Promise<void> {
    try {
      if (this.client) {
        await this.client.disconnect();
      }
      this.status.connected = false;
      console.log(`${this.name} shut down`);
    } catch (error) {
      console.error(`${this.name} shutdown error:`, error);
    }
  }
  
  // Define extension actions
  actions: Record<string, ExtensionAction> = {
    sendMessage: {
      id: 'send-message',
      name: 'Send Message',
      description: 'Send a message through this extension',
      parameters: [
        { name: 'target', type: 'string', required: true },
        { name: 'message', type: 'string', required: true },
        { name: 'options', type: 'object', required: false }
      ],
      
      execute: async (agent: Agent, params: MyActionParams): Promise<MyActionResult> => {
        try {
          const response = await this.client.sendMessage(params.target, params.message);
          return {
            success: true,
            response: response.data
          };
        } catch (error) {
          return {
            success: false,
            error: error.message
          };
        }
      },
      
      validate: (params: MyActionParams) => {
        const errors: string[] = [];
        
        if (!params.target) {
          errors.push('Target is required');
        }
        
        if (!params.message) {
          errors.push('Message is required');
        }
        
        return {
          valid: errors.length === 0,
          errors
        };
      }
    }
  };
  
  // Define event handlers
  events: Record<string, ExtensionEventHandler> = {
    'message:received': async (agent: Agent, event: any) => {
      // Handle incoming messages
      console.log(`${this.name} received message:`, event.data);
      
      // Process message and potentially respond
      if (event.data.requiresResponse) {
        await this.handleMessage(agent, event.data);
      }
    },
    
    'agent:emotion:changed': async (agent: Agent, event: any) => {
      // React to emotion changes
      console.log(`${this.name} detected emotion change:`, event.data.emotion);
      
      // Adjust behavior based on emotion
      if (event.data.emotion === 'happy') {
        await this.celebrateWithAgent(agent);
      }
    }
  };
  
  getStatus(): MyExtensionStatus {
    return { ...this.status };
  }
  
  async healthCheck(): Promise<boolean> {
    try {
      if (!this.client) {
        return false;
      }
      
      const isHealthy = await this.client.ping();
      return isHealthy && this.status.connected;
    } catch (error) {
      return false;
    }
  }
  
  // Private helper methods
  private async performPeriodicTasks(agent: Agent): Promise<void> {
    // Implement periodic tasks
    // Check for new messages, update status, etc.
  }
  
  private async handleMessage(agent: Agent, messageData: any): Promise<void> {
    // Process incoming message
    const response = await agent.processMessage(messageData.content);
    
    // Send response back through extension
    await this.client.sendMessage(messageData.sender, response.content);
  }
  
  private async celebrateWithAgent(agent: Agent): Promise<void> {
    // Extension-specific celebration logic
    await this.client.sendMessage('celebration-channel', '🎉 Agent is happy!');
  }
}

// Factory function for auto-discovery
export function createMyExtension(config: MyExtensionConfig): MyExtension {
  return new MyExtension(config);
}

// Export types for use by consumers
export * from './types.js';
```

#### 5. Register Extension

Extensions are automatically discovered if they have proper `package.json` configuration. For manual registration, add to `src/extensions/index.ts`:

```typescript
import { createMyExtension } from './my-extension/index.js';

// Register extension factory
export function registerExtensions(registry: any) {
  registry.registerExtensionFactory('my-extension', createMyExtension);
}
```

### Advanced Extension Features

#### WebSocket Support

```typescript
import { WebSocketServer } from 'ws';

class MyWebSocketExtension extends MyExtension {
  private wss: WebSocketServer;
  
  async init(agent: Agent): Promise<void> {
    await super.init(agent);
    
    // Create WebSocket server
    this.wss = new WebSocketServer({ port: 8080 });
    
    this.wss.on('connection', (ws) => {
      ws.on('message', async (message) => {
        const data = JSON.parse(message.toString());
        const response = await agent.processMessage(data.content);
        ws.send(JSON.stringify(response));
      });
    });
  }
}
```

#### HTTP API Integration

```typescript
import express from 'express';

class MyAPIExtension extends MyExtension {
  private app: express.Application;
  private server: any;
  
  async init(agent: Agent): Promise<void> {
    await super.init(agent);
    
    this.app = express();
    this.app.use(express.json());
    
    // Define API endpoints
    this.app.post('/chat', async (req, res) => {
      try {
        const response = await agent.processMessage(req.body.message);
        res.json(response);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    this.server = this.app.listen(3000);
  }
}
```

## Creating Portals

Portals integrate with AI providers to generate responses for agents.

### Portal Interface

All portals must implement the `Portal` interface:

```typescript
interface Portal {
  id: string;
  name: string;
  provider: string;
  enabled: boolean;
  config: PortalConfig;
  
  // Core methods
  generateResponse(messages: Message[]): Promise<PortalResponse>;
  streamResponse(messages: Message[]): AsyncIterable<PortalChunk>;
  
  // Capabilities
  getCapabilities(): PortalCapability[];
  supportsCapability(capability: PortalCapability): boolean;
  
  // Management
  initialize(config: PortalConfig): Promise<void>;
  healthCheck(): Promise<boolean>;
  getUsage(): PortalUsage;
}
```

### Step-by-Step Portal Creation

#### 1. Create Portal Directory

```bash
mkdir -p src/portals/my-provider
cd src/portals/my-provider
```

#### 2. Create Package Configuration

Create `package.json`:

```json
{
  "name": "@symindx/portal-my-provider",
  "version": "1.0.0",
  "description": "My custom AI provider portal",
  "main": "index.js",
  "type": "module",
  "symindx": {
    "portal": {
      "type": "my-provider",
      "factory": "createMyProviderPortal",
      "autoRegister": true
    }
  }
}
```

#### 3. Create Type Definitions

Create `types.ts`:

```typescript
export interface MyProviderConfig {
  apiKey: string;
  endpoint: string;
  model: string;
  maxTokens: number;
  temperature: number;
  timeout: number;
}

export interface MyProviderResponse {
  id: string;
  content: string;
  finishReason: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface MyProviderStreamChunk {
  id: string;
  content: string;
  done: boolean;
}
```

#### 4. Implement Portal Class

Create `index.ts`:

```typescript
import { Portal, PortalConfig, PortalResponse, PortalChunk, Message } from '../../types/index.js';
import { MyProviderConfig, MyProviderResponse, MyProviderStreamChunk } from './types.js';

export class MyProviderPortal implements Portal {
  id = 'my-provider';
  name = 'My AI Provider';
  provider = 'my-provider';
  enabled = true;
  config: MyProviderConfig;
  
  private client: any;
  private usage: PortalUsage = {
    requests: 0,
    tokens: 0,
    cost: 0
  };
  
  constructor(config: MyProviderConfig) {
    this.config = config;
  }
  
  async initialize(config: PortalConfig): Promise<void> {
    this.config = { ...this.config, ...config };
    
    // Initialize AI provider client
    this.client = new MyProviderClient({
      apiKey: this.config.apiKey,
      endpoint: this.config.endpoint
    });
    
    // Test connection
    const isHealthy = await this.healthCheck();
    if (!isHealthy) {
      throw new Error(`Failed to connect to ${this.provider}`);
    }
    
    console.log(`${this.name} portal initialized`);
  }
  
  async generateResponse(messages: Message[]): Promise<PortalResponse> {
    try {
      const response = await this.client.generateText({
        model: this.config.model,
        messages: this.convertMessages(messages),
        maxTokens: this.config.maxTokens,
        temperature: this.config.temperature
      });
      
      // Update usage statistics
      this.usage.requests++;
      this.usage.tokens += response.usage.totalTokens;
      this.usage.cost += this.calculateCost(response.usage);
      
      return {
        content: response.content,
        usage: response.usage,
        metadata: {
          model: this.config.model,
          provider: this.provider,
          latency: response.latency,
          cost: this.calculateCost(response.usage)
        }
      };
    } catch (error) {
      throw new Error(`${this.name} generation failed: ${error.message}`);
    }
  }
  
  async *streamResponse(messages: Message[]): AsyncIterable<PortalChunk> {
    try {
      const stream = await this.client.streamText({
        model: this.config.model,
        messages: this.convertMessages(messages),
        maxTokens: this.config.maxTokens,
        temperature: this.config.temperature
      });
      
      for await (const chunk of stream) {
        yield {
          content: chunk.content,
          done: chunk.done,
          usage: chunk.usage,
          metadata: {
            model: this.config.model,
            provider: this.provider
          }
        };
      }
    } catch (error) {
      throw new Error(`${this.name} streaming failed: ${error.message}`);
    }
  }
  
  getCapabilities(): PortalCapability[] {
    return [
      'text_generation',
      'chat_completion',
      'streaming',
      'function_calling'
    ];
  }
  
  supportsCapability(capability: PortalCapability): boolean {
    return this.getCapabilities().includes(capability);
  }
  
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.ping();
      return response.status === 'ok';
    } catch (error) {
      return false;
    }
  }
  
  getUsage(): PortalUsage {
    return { ...this.usage };
  }
  
  // Private helper methods
  private convertMessages(messages: Message[]): any[] {
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
  }
  
  private calculateCost(usage: any): number {
    // Calculate cost based on token usage
    const inputCost = usage.promptTokens * 0.001;
    const outputCost = usage.completionTokens * 0.002;
    return inputCost + outputCost;
  }
}

// Factory function for auto-discovery
export function createMyProviderPortal(config: MyProviderConfig): MyProviderPortal {
  return new MyProviderPortal(config);
}

// Export types
export * from './types.js';
```

### AI SDK v5 Integration

For modern AI providers, use the AI SDK v5 pattern:

```typescript
import { generateText, streamText } from 'ai';
import { myProvider } from '@ai-sdk/my-provider';

export class ModernPortal implements Portal {
  async generateResponse(messages: Message[]): Promise<PortalResponse> {
    const result = await generateText({
      model: myProvider(this.config.model),
      messages: this.convertMessages(messages),
      maxTokens: this.config.maxTokens,
      temperature: this.config.temperature,
      tools: this.getTools()
    });
    
    return {
      content: result.text,
      usage: result.usage,
      metadata: {
        model: this.config.model,
        provider: this.provider,
        finishReason: result.finishReason
      }
    };
  }
  
  async *streamResponse(messages: Message[]): AsyncIterable<PortalChunk> {
    const stream = streamText({
      model: myProvider(this.config.model),
      messages: this.convertMessages(messages),
      maxTokens: this.config.maxTokens,
      temperature: this.config.temperature
    });
    
    for await (const chunk of stream.textStream) {
      yield {
        content: chunk,
        done: false,
        metadata: {
          model: this.config.model,
          provider: this.provider
        }
      };
    }
  }
}
```

## Creating Memory Providers

Memory providers handle storage and retrieval of agent memories.

### Memory Provider Interface

```typescript
abstract class BaseMemoryProvider {
  abstract async store(memory: MemoryRecord): Promise<void>;
  abstract async retrieve(query: string, limit?: number): Promise<MemoryRecord[]>;
  abstract async search(query: string, options?: SearchOptions): Promise<MemoryRecord[]>;
  abstract async delete(memoryId: string): Promise<void>;
  abstract async clear(): Promise<void>;
  abstract async getStats(): Promise<MemoryStats>;
}
```

### Example Memory Provider

```typescript
import { BaseMemoryProvider } from '../base-memory-provider.js';
import { MemoryRecord, SearchOptions, MemoryStats } from '../../types/index.js';

export class MyMemoryProvider extends BaseMemoryProvider {
  private config: MyMemoryConfig;
  private client: any;
  
  constructor(config: MyMemoryConfig) {
    super();
    this.config = config;
    this.client = new MyMemoryClient(config);
  }
  
  async store(memory: MemoryRecord): Promise<void> {
    try {
      await this.client.insert({
        id: memory.id,
        agent_id: memory.agentId,
        content: memory.content,
        type: memory.type,
        emotional_weight: memory.emotional_weight,
        importance: memory.importance,
        timestamp: memory.timestamp,
        metadata: JSON.stringify(memory.metadata)
      });
    } catch (error) {
      throw new Error(`Failed to store memory: ${error.message}`);
    }
  }
  
  async retrieve(query: string, limit = 10): Promise<MemoryRecord[]> {
    try {
      const results = await this.client.search(query, { limit });
      return results.map(this.convertToMemoryRecord);
    } catch (error) {
      throw new Error(`Failed to retrieve memories: ${error.message}`);
    }
  }
  
  async search(query: string, options: SearchOptions = {}): Promise<MemoryRecord[]> {
    try {
      const results = await this.client.search(query, {
        limit: options.limit || 10,
        type: options.type,
        minImportance: options.minImportance,
        dateRange: options.dateRange
      });
      
      return results.map(this.convertToMemoryRecord);
    } catch (error) {
      throw new Error(`Failed to search memories: ${error.message}`);
    }
  }
  
  async delete(memoryId: string): Promise<void> {
    try {
      await this.client.delete(memoryId);
    } catch (error) {
      throw new Error(`Failed to delete memory: ${error.message}`);
    }
  }
  
  async clear(): Promise<void> {
    try {
      await this.client.clear();
    } catch (error) {
      throw new Error(`Failed to clear memories: ${error.message}`);
    }
  }
  
  async getStats(): Promise<MemoryStats> {
    try {
      const stats = await this.client.getStats();
      return {
        totalMemories: stats.count,
        totalSize: stats.size,
        averageImportance: stats.avgImportance,
        memoryTypes: stats.typeDistribution
      };
    } catch (error) {
      throw new Error(`Failed to get memory stats: ${error.message}`);
    }
  }
  
  private convertToMemoryRecord(row: any): MemoryRecord {
    return {
      id: row.id,
      agentId: row.agent_id,
      content: row.content,
      type: row.type,
      emotional_weight: row.emotional_weight,
      importance: row.importance,
      timestamp: new Date(row.timestamp),
      metadata: JSON.parse(row.metadata || '{}')
    };
  }
}

// Factory function
export function createMyMemoryProvider(config: MyMemoryConfig): MyMemoryProvider {
  return new MyMemoryProvider(config);
}
```

## Creating Emotion Modules

Emotion modules handle emotional state management for agents.

### Emotion Module Interface

```typescript
abstract class BaseEmotion {
  abstract trigger(intensity: number, context?: any): void;
  abstract update(deltaTime: number): void;
  abstract getState(): EmotionState;
  abstract decay(): void;
  abstract reset(): void;
}
```

### Example Emotion Module

```typescript
import { BaseEmotion } from '../base-emotion.js';
import { EmotionState, EmotionConfig } from '../../types/index.js';

export class MyEmotion extends BaseEmotion {
  private intensity: number = 0;
  private config: MyEmotionConfig;
  private lastTriggered: Date = new Date();
  
  constructor(config: MyEmotionConfig) {
    super();
    this.config = config;
  }
  
  trigger(intensity: number, context?: any): void {
    this.intensity = Math.min(1, this.intensity + intensity * this.config.sensitivity);
    this.lastTriggered = new Date();
    
    // Emotion-specific logic
    if (context?.successEvent) {
      this.intensity *= 1.2; // Boost for success
    }
  }
  
  update(deltaTime: number): void {
    // Decay emotion over time
    const decayAmount = this.config.decayRate * deltaTime;
    this.intensity = Math.max(0, this.intensity - decayAmount);
  }
  
  getState(): EmotionState {
    return {
      type: 'my-emotion',
      intensity: this.intensity,
      lastTriggered: this.lastTriggered,
      modifiers: {
        creativity: this.intensity * 0.8,
        empathy: this.intensity * 0.6,
        assertiveness: this.intensity * 1.2
      }
    };
  }
  
  decay(): void {
    this.intensity *= 0.9;
  }
  
  reset(): void {
    this.intensity = 0;
    this.lastTriggered = new Date();
  }
}

// Factory function
export function createMyEmotion(config: MyEmotionConfig): MyEmotion {
  return new MyEmotion(config);
}
```

## Creating Cognition Modules

Cognition modules handle thinking and decision-making for agents.

### Cognition Module Interface

```typescript
interface CognitionModule {
  think(agent: Agent, context: ThoughtContext): Promise<ThoughtResult>;
  plan(agent: Agent, goal: string): Promise<Plan>;
  decide(agent: Agent, options: Decision[]): Promise<Decision>;
  learn(agent: Agent, experience: Experience): Promise<void>;
  reflect(agent: Agent, outcomes: Outcome[]): Promise<void>;
  
  initialize(config: CognitionConfig): void;
  getStatus(): CognitionStatus;
  getMetrics(): CognitionMetrics;
}
```

### Example Cognition Module

```typescript
import { CognitionModule } from '../../types/index.js';
import { Agent, ThoughtContext, ThoughtResult, Plan, Decision } from '../../types/index.js';

export class MyCognitionModule implements CognitionModule {
  private config: MyCognitionConfig;
  private metrics: CognitionMetrics;
  
  constructor(config: MyCognitionConfig) {
    this.config = config;
    this.metrics = {
      totalThoughts: 0,
      averageConfidence: 0,
      planSuccess: 0,
      decisionAccuracy: 0
    };
  }
  
  async think(agent: Agent, context: ThoughtContext): Promise<ThoughtResult> {
    try {
      // Retrieve relevant memories
      const memories = await agent.retrieveMemories(context.input, 5);
      
      // Get current emotional state
      const emotion = agent.getCurrentEmotion();
      
      // Generate thoughts using AI portal
      const portal = agent.getCurrentPortal();
      const thoughts = await this.generateThoughts(portal, context, memories, emotion);
      
      // Calculate confidence
      const confidence = this.calculateConfidence(thoughts, emotion);
      
      // Update metrics
      this.metrics.totalThoughts++;
      this.metrics.averageConfidence = 
        (this.metrics.averageConfidence + confidence) / 2;
      
      return {
        thoughts: thoughts.map(t => t.content),
        confidence,
        reasoning: thoughts.map(t => t.reasoning).join(' '),
        actions: await this.generateActions(thoughts, agent),
        emotions: emotion,
        memories,
        metadata: {
          processingTime: Date.now() - context.startTime,
          cognitive_load: this.calculateCognitiveLoad(thoughts),
          strategy_used: this.config.strategy
        }
      };
    } catch (error) {
      throw new Error(`Cognition failed: ${error.message}`);
    }
  }
  
  async plan(agent: Agent, goal: string): Promise<Plan> {
    // Implement planning logic
    const steps = await this.generatePlanSteps(agent, goal);
    
    return {
      id: `plan-${Date.now()}`,
      goal,
      steps,
      priority: this.calculatePriority(goal),
      estimatedDuration: this.estimateDuration(steps),
      dependencies: this.identifyDependencies(steps),
      status: 'draft'
    };
  }
  
  async decide(agent: Agent, options: Decision[]): Promise<Decision> {
    // Implement decision-making logic
    const scores = await this.scoreOptions(agent, options);
    const bestOption = options[scores.indexOf(Math.max(...scores))];
    
    return {
      ...bestOption,
      confidence: Math.max(...scores),
      reasoning: this.generateDecisionReasoning(bestOption, scores)
    };
  }
  
  async learn(agent: Agent, experience: Experience): Promise<void> {
    // Implement learning logic
    await agent.storeMemory({
      id: `exp-${Date.now()}`,
      agentId: agent.id,
      content: experience.description,
      type: 'experience',
      emotional_weight: experience.emotional_impact,
      importance: experience.importance,
      timestamp: new Date(),
      metadata: { outcome: experience.outcome }
    });
  }
  
  async reflect(agent: Agent, outcomes: Outcome[]): Promise<void> {
    // Implement reflection logic
    const insights = await this.generateInsights(outcomes);
    
    for (const insight of insights) {
      await agent.storeMemory({
        id: `insight-${Date.now()}`,
        agentId: agent.id,
        content: insight.content,
        type: 'reflection',
        emotional_weight: insight.emotional_weight,
        importance: insight.importance,
        timestamp: new Date(),
        metadata: { type: 'insight' }
      });
    }
  }
  
  initialize(config: CognitionConfig): void {
    this.config = { ...this.config, ...config };
  }
  
  getStatus(): CognitionStatus {
    return {
      active: true,
      strategy: this.config.strategy,
      load: this.calculateCurrentLoad(),
      lastActivity: new Date()
    };
  }
  
  getMetrics(): CognitionMetrics {
    return { ...this.metrics };
  }
  
  // Private helper methods
  private async generateThoughts(
    portal: any,
    context: ThoughtContext,
    memories: any[],
    emotion: any
  ): Promise<any[]> {
    // Generate thoughts using AI portal
    const response = await portal.generateResponse([
      {
        role: 'system',
        content: `You are thinking about: ${context.input}. Consider your memories and current emotional state.`
      },
      {
        role: 'user',
        content: context.input
      }
    ]);
    
    return [{
      content: response.content,
      reasoning: response.metadata.reasoning || '',
      confidence: response.confidence || 0.5
    }];
  }
  
  private calculateConfidence(thoughts: any[], emotion: any): number {
    const baseConfidence = thoughts.reduce((sum, t) => sum + t.confidence, 0) / thoughts.length;
    const emotionalModifier = emotion.modifiers?.confidence || 1;
    return Math.min(1, baseConfidence * emotionalModifier);
  }
  
  private async generateActions(thoughts: any[], agent: Agent): Promise<any[]> {
    // Generate actions based on thoughts
    return [];
  }
  
  private calculateCognitiveLoad(thoughts: any[]): number {
    return thoughts.length * 0.1;
  }
  
  private async generatePlanSteps(agent: Agent, goal: string): Promise<any[]> {
    // Generate plan steps
    return [];
  }
  
  private calculatePriority(goal: string): number {
    // Calculate goal priority
    return 0.5;
  }
  
  private estimateDuration(steps: any[]): number {
    // Estimate plan duration
    return steps.length * 1000;
  }
  
  private identifyDependencies(steps: any[]): string[] {
    // Identify step dependencies
    return [];
  }
  
  private async scoreOptions(agent: Agent, options: Decision[]): Promise<number[]> {
    // Score decision options
    return options.map(() => Math.random());
  }
  
  private generateDecisionReasoning(option: Decision, scores: number[]): string {
    return `Selected option with highest score: ${Math.max(...scores)}`;
  }
  
  private async generateInsights(outcomes: Outcome[]): Promise<any[]> {
    // Generate insights from outcomes
    return [];
  }
  
  private calculateCurrentLoad(): number {
    return 0.3;
  }
}

// Factory function
export function createMyCognitionModule(config: MyCognitionConfig): MyCognitionModule {
  return new MyCognitionModule(config);
}
```

## Auto-Discovery System

SYMindX features an auto-discovery system that automatically finds and registers modules.

### Package.json Configuration

Add `symindx` configuration to your module's `package.json`:

```json
{
  "name": "@symindx/my-module",
  "version": "1.0.0",
  "symindx": {
    "extension": {
      "type": "my-extension",
      "factory": "createMyExtension",
      "autoRegister": true
    }
  }
}
```

### Discovery Process

1. **Scan Phase**: System scans for modules in:
   - `src/modules/` (built-in modules)
   - `src/extensions/` (built-in extensions)
   - `src/portals/` (built-in portals)
   - `node_modules/` (npm packages)

2. **Validation Phase**: Checks for:
   - Valid `package.json` with `symindx` configuration
   - Required factory function export
   - Proper module structure

3. **Registration Phase**: Automatically registers modules with:
   - Factory function registration
   - Type validation
   - Dependency resolution

### Manual Registration

For modules that don't use auto-discovery:

```typescript
import { registry } from './core/registry.js';
import { createMyModule } from './my-module/index.js';

// Register manually
registry.registerModuleFactory('my-module', createMyModule);
```

## Testing

### Unit Testing

Use Bun's built-in test runner:

```typescript
import { test, expect } from 'bun:test';
import { MyExtension } from './my-extension/index.js';

test('MyExtension initializes correctly', async () => {
  const config = {
    apiKey: 'test-key',
    endpoint: 'https://api.test.com'
  };
  
  const extension = new MyExtension(config);
  expect(extension.id).toBe('my-extension');
  expect(extension.enabled).toBe(true);
});

test('MyExtension handles messages', async () => {
  const extension = new MyExtension({
    apiKey: 'test-key',
    endpoint: 'https://api.test.com'
  });
  
  const mockAgent = {
    id: 'test-agent',
    processMessage: jest.fn().mockResolvedValue({
      content: 'Test response'
    })
  };
  
  await extension.init(mockAgent);
  
  const result = await extension.actions.sendMessage.execute(mockAgent, {
    target: 'test-target',
    message: 'Test message'
  });
  
  expect(result.success).toBe(true);
});
```

### Integration Testing

Test module integration with the runtime:

```typescript
import { test, expect } from 'bun:test';
import { SYMindXRuntime } from './core/runtime.js';

test('Extension integrates with runtime', async () => {
  const runtime = new SYMindXRuntime({
    tickInterval: 100,
    enableLogging: false
  });
  
  await runtime.start();
  
  const agent = await runtime.createAgent('test-character');
  
  // Test extension functionality
  agent.enableExtension('my-extension');
  
  const status = agent.getExtensionStatus('my-extension');
  expect(status.enabled).toBe(true);
  
  await runtime.stop();
});
```

### Mock Services

Create mock services for testing:

```typescript
// Mock AI provider
export class MockPortal implements Portal {
  async generateResponse(messages: Message[]): Promise<PortalResponse> {
    return {
      content: 'Mock response',
      usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
      metadata: { model: 'mock-model', provider: 'mock' }
    };
  }
  
  async *streamResponse(messages: Message[]): AsyncIterable<PortalChunk> {
    yield { content: 'Mock', done: false };
    yield { content: ' stream', done: false };
    yield { content: ' response', done: true };
  }
}

// Mock memory provider
export class MockMemoryProvider extends BaseMemoryProvider {
  private memories: MemoryRecord[] = [];
  
  async store(memory: MemoryRecord): Promise<void> {
    this.memories.push(memory);
  }
  
  async retrieve(query: string, limit = 10): Promise<MemoryRecord[]> {
    return this.memories.slice(0, limit);
  }
}
```

## TypeScript Guidelines

### Type Safety

```typescript
// Use strict type definitions
interface StrictConfig {
  apiKey: string;              // Required string
  timeout?: number;            // Optional number
  retries: number;             // Required number
  options: {                   // Required object
    debug: boolean;
    verbose: boolean;
  };
}

// Use union types for constrained values
type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type ExtensionStatus = 'active' | 'inactive' | 'error';

// Use generics for reusable types
interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```

### Documentation Comments

```typescript
/**
 * Extension for integrating with external AI providers
 * 
 * @example
 * ```typescript
 * const extension = new MyExtension({
 *   apiKey: 'your-api-key',
 *   endpoint: 'https://api.example.com'
 * });
 * 
 * await extension.init(agent);
 * ```
 */
export class MyExtension implements Extension {
  /**
   * Initializes the extension for a specific agent
   * 
   * @param agent - The agent to initialize for
   * @throws {Error} If initialization fails
   */
  async init(agent: Agent): Promise<void> {
    // Implementation
  }
  
  /**
   * Sends a message through the extension
   * 
   * @param target - The target recipient
   * @param message - The message content
   * @returns Promise resolving to send result
   */
  async sendMessage(target: string, message: string): Promise<SendResult> {
    // Implementation
  }
}
```

### Error Handling

```typescript
// Define custom error classes
export class ExtensionError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ExtensionError';
  }
}

// Use proper error handling
async function initializeExtension(config: ExtensionConfig): Promise<void> {
  try {
    await validateConfig(config);
    await connectToService(config);
  } catch (error) {
    if (error instanceof ValidationError) {
      throw new ExtensionError(
        'Configuration validation failed',
        'INVALID_CONFIG',
        error.details
      );
    }
    
    throw new ExtensionError(
      'Extension initialization failed',
      'INIT_FAILED',
      { originalError: error.message }
    );
  }
}
```

## Best Practices

### Code Organization

```typescript
// Use barrel exports for clean imports
// src/extensions/my-extension/index.ts
export { MyExtension } from './MyExtension.js';
export { createMyExtension } from './factory.js';
export * from './types.js';

// src/extensions/index.ts
export * from './my-extension/index.js';
export * from './other-extension/index.js';
```

### Configuration Management

```typescript
// Use environment variables with defaults
const config = {
  apiKey: process.env.MY_API_KEY || '',
  endpoint: process.env.MY_ENDPOINT || 'https://api.default.com',
  timeout: parseInt(process.env.MY_TIMEOUT || '30000'),
  retries: parseInt(process.env.MY_RETRIES || '3')
};

// Validate configuration
function validateConfig(config: any): void {
  if (!config.apiKey) {
    throw new Error('API key is required');
  }
  
  if (config.timeout <= 0) {
    throw new Error('Timeout must be positive');
  }
}
```

### Performance Optimization

```typescript
// Use connection pooling
class DatabaseConnection {
  private pool: ConnectionPool;
  
  constructor(config: DatabaseConfig) {
    this.pool = new ConnectionPool({
      ...config,
      max: 10,           // Maximum connections
      min: 2,            // Minimum connections
      idle: 30000,       // Idle timeout
      acquire: 60000     // Acquire timeout
    });
  }
}

// Implement caching
class CachedMemoryProvider extends BaseMemoryProvider {
  private cache = new Map<string, MemoryRecord[]>();
  
  async retrieve(query: string, limit?: number): Promise<MemoryRecord[]> {
    const cacheKey = `${query}:${limit}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }
    
    const results = await super.retrieve(query, limit);
    this.cache.set(cacheKey, results);
    
    return results;
  }
}
```

### Security Considerations

```typescript
// Sanitize inputs
function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '')
    .slice(0, 1000)  // Limit length
    .trim();
}

// Validate permissions
function checkPermissions(agent: Agent, action: string): boolean {
  const permissions = agent.getPermissions();
  return permissions.includes(action);
}

// Use secure defaults
const secureConfig = {
  enableSQLLogging: false,
  allowScriptExecution: false,
  maxRequestSize: 1024 * 1024,  // 1MB
  rateLimitEnabled: true
};
```

## Deployment

### Environment Setup

```bash
# Production environment variables
NODE_ENV=production
LOG_LEVEL=warn

# Database configuration
DATABASE_URL=postgresql://user:pass@host:5432/symindx
REDIS_URL=redis://localhost:6379

# API keys (use secrets management)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Security configuration
JWT_SECRET=your-jwt-secret
CORS_ORIGINS=https://yourdomain.com
```

### Docker Configuration

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY bun.lockb ./

# Install dependencies
RUN npm install -g bun
RUN bun install

# Copy source code
COPY src/ ./src/
COPY tsconfig.json ./

# Build application
RUN bun run build

# Expose port
EXPOSE 3000

# Start application
CMD ["bun", "start"]
```

### Production Checklist

- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] API keys secured
- [ ] Rate limiting enabled
- [ ] Logging configured
- [ ] Health checks implemented
- [ ] Monitoring setup
- [ ] Backup strategy in place
- [ ] SSL/TLS certificates configured
- [ ] Security headers enabled

## Contributing

### Development Workflow

1. **Fork the repository**
2. **Create feature branch**: `git checkout -b feature/my-feature`
3. **Make changes** following code standards
4. **Add tests** for new functionality
5. **Run tests**: `bun test`
6. **Run linting**: `bun lint`
7. **Commit changes**: `git commit -m "feat: add my feature"`
8. **Push branch**: `git push origin feature/my-feature`
9. **Create pull request**

### Code Standards

- **TypeScript**: Use strict mode and proper typing
- **ESLint**: Follow project ESLint configuration
- **Prettier**: Use for consistent formatting
- **Commit Messages**: Follow conventional commit format
- **Documentation**: Update docs for new features
- **Tests**: Add tests for new functionality

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Checklist
- [ ] Code follows project standards
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
```

---

This developer guide provides comprehensive information for creating extensions, portals, and other modules in the SYMindX framework. For specific implementation examples, see the existing modules in the `src/` directory.