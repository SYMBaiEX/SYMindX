# SYMindX API Reference

The SQLite runtime server and mind-agents extensions in this reference are not part of v2; the library is `packages/agent` (`@symindx/agent`).

## Overview

SYMindX provides a comprehensive API for building, configuring, and managing AI agents. This reference covers all public APIs, interfaces, and integration points available in the framework.

## Table of Contents

1. [Core Runtime API](#core-runtime-api)
2. [Agent Management API](#agent-management-api)
3. [Memory Provider API](#memory-provider-api)
4. [Emotion System API](#emotion-system-api)
5. [Cognition Module API](#cognition-module-api)
6. [Extension API](#extension-api)
7. [Portal API](#portal-api)
8. [Character Configuration API](#character-configuration-api)
9. [CLI API](#cli-api)
10. [REST API Endpoints](#rest-api-endpoints)
11. [WebSocket API](#websocket-api)
12. [Type Definitions](#type-definitions)

## Core Runtime API

### SYMindXRuntime

The main runtime class that orchestrates all agent operations.

```typescript
import { SYMindXRuntime } from '@symindx/mind-agents';

class SYMindXRuntime {
  constructor(config: RuntimeConfig);
  
  // Runtime management
  async start(): Promise<void>;
  async stop(): Promise<void>;
  async restart(): Promise<void>;
  
  // Agent operations
  async createAgent(characterId: string): Promise<Agent>;
  async getAgent(agentId: string): Promise<Agent | null>;
  async listAgents(): Promise<Agent[]>;
  async removeAgent(agentId: string): Promise<void>;
  
  // Event system
  on(event: string, listener: Function): void;
  emit(event: string, data: any): void;
  
  // Health and status
  getHealthStatus(): HealthStatus;
  getSystemMetrics(): SystemMetrics;
}
```

#### Usage Example

```typescript
const runtime = new SYMindXRuntime({
  tickInterval: 1000,
  maxAgents: 10,
  enableLogging: true
});

await runtime.start();

// Create and manage agents
const agent = await runtime.createAgent('nyx');
console.log('Agent created:', agent.id);

// Listen for events
runtime.on('agent:message', (data) => {
  console.log('Agent message:', data);
});
```

### RuntimeConfig

Configuration interface for the runtime system.

```typescript
interface RuntimeConfig {
  tickInterval?: number;              // Tick interval in milliseconds (default: 1000)
  maxAgents?: number;                 // Maximum concurrent agents (default: 10)
  enableLogging?: boolean;            // Enable system logging (default: true)
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  dataPath?: string;                  // Data directory path (default: './data')
  enableAutoDiscovery?: boolean;      // Enable module auto-discovery (default: true)
  extensions?: ExtensionConfig[];     // Extension configurations
  portals?: PortalConfig[];          // Portal configurations
  security?: SecurityConfig;          // Security settings
}
```

## Agent Management API

### Agent Class

Represents an individual AI agent with personality, memory, and capabilities.

```typescript
class Agent {
  readonly id: string;
  readonly name: string;
  readonly character: Character;
  
  // Lifecycle
  async initialize(): Promise<void>;
  async shutdown(): Promise<void>;
  
  // Communication
  async processMessage(message: string, context?: MessageContext): Promise<AgentResponse>;
  async sendMessage(recipient: string, message: string): Promise<void>;
  
  // Memory operations
  async storeMemory(memory: MemoryRecord): Promise<void>;
  async retrieveMemories(query: string, limit?: number): Promise<MemoryRecord[]>;
  async getRecentMemories(count: number): Promise<MemoryRecord[]>;
  
  // Emotional state
  getCurrentEmotion(): EmotionState;
  updateEmotion(trigger: EmotionTrigger): void;
  
  // Cognition
  async think(context: ThoughtContext): Promise<ThoughtResult>;
  async plan(goal: string): Promise<Plan>;
  async decide(options: Decision[]): Promise<Decision>;
  
  // Extension management
  enableExtension(extensionId: string): void;
  disableExtension(extensionId: string): void;
  getExtensionStatus(extensionId: string): ExtensionStatus;
  
  // Portal management
  switchPortal(portalId: string): void;
  getCurrentPortal(): Portal;
  
  // Status and metrics
  getStatus(): AgentStatus;
  getMetrics(): AgentMetrics;
}
```

### AgentResponse

Standard response format for agent communications.

```typescript
interface AgentResponse {
  content: string;                    // Response content
  emotion: EmotionState;             // Current emotional state
  confidence: number;                // Response confidence (0-1)
  memories: MemoryRecord[];          // Related memories
  actions: AgentAction[];            // Actions taken
  metadata: {
    processingTime: number;          // Time taken to process
    tokens: number;                  // Tokens used
    portal: string;                  // Portal used
    thoughts?: string[];             // Internal thoughts
  };
}
```

### Usage Example

```typescript
const agent = await runtime.createAgent('nyx');

// Send a message
const response = await agent.processMessage('Hello, how are you?');
console.log('Response:', response.content);
console.log('Emotion:', response.emotion);
console.log('Confidence:', response.confidence);

// Check agent status
const status = agent.getStatus();
console.log('Agent status:', status.state);
```

## Memory Provider API

### BaseMemoryProvider

Abstract base class for memory providers.

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

### Memory Factory

Factory function for creating memory providers.

```typescript
function createMemoryProvider(type: MemoryProviderType, config: MemoryConfig): BaseMemoryProvider;
```

#### Available Providers

- **sqlite**: Local SQLite database
- **postgres**: PostgreSQL database
- **supabase**: Supabase with vector embeddings
- **neon**: Neon serverless PostgreSQL
- **memory**: In-memory storage (non-persistent)

### MemoryRecord

Structure for memory storage.

```typescript
interface MemoryRecord {
  id: string;
  agentId: string;
  content: string;
  type: MemoryType;
  emotional_weight: number;
  importance: number;
  timestamp: Date;
  metadata: Record<string, any>;
  embedding?: number[];
}
```

### Usage Example

```typescript
// Create SQLite memory provider
const memory = createMemoryProvider('sqlite', {
  dbPath: './data/memories.db',
  enableSearch: true
});

// Store a memory
await memory.store({
  id: 'mem-001',
  agentId: 'nyx',
  content: 'User asked about TypeScript',
  type: 'conversation',
  emotional_weight: 0.7,
  importance: 0.8,
  timestamp: new Date(),
  metadata: { topic: 'programming' }
});

// Retrieve memories
const memories = await memory.retrieve('TypeScript', 5);
console.log('Found memories:', memories.length);
```

## Emotion System API

### CompositeEmotionModule

Manages multiple emotions for an agent.

```typescript
class CompositeEmotionModule {
  constructor(config: EmotionConfig);
  
  // Emotion management
  trigger(emotionType: EmotionType, intensity: number): void;
  getCurrentState(): EmotionState;
  updateState(context: EmotionContext): void;
  
  // Emotion configuration
  setEmotionConfig(emotionType: EmotionType, config: any): void;
  getEmotionConfig(emotionType: EmotionType): any;
  
  // Emotion history
  getHistory(limit?: number): EmotionHistory[];
  clearHistory(): void;
}
```

### Emotion Factory

Factory function for creating emotion modules.

```typescript
function createEmotionModule(type: EmotionType, config: EmotionConfig): EmotionModule;
```

#### Available Emotions

- **Basic**: happy, sad, angry, neutral
- **Complex**: anxious, nostalgic
- **Social**: empathetic, proud
- **Cognitive**: confident, curious, confused

### EmotionState

Current emotional state of an agent.

```typescript
interface EmotionState {
  dominant: EmotionType;
  intensity: number;
  stability: number;
  emotions: {
    [key: string]: {
      intensity: number;
      lastTriggered: Date;
      decayRate: number;
    };
  };
  modifiers: {
    creativity: number;
    empathy: number;
    assertiveness: number;
  };
}
```

### Usage Example

```typescript
// Create composite emotion module
const emotion = createEmotionModule('composite', {
  sensitivity: 0.8,
  emotions: {
    happy: { sensitivity: 0.7 },
    curious: { sensitivity: 0.9 }
  }
});

// Trigger emotion
emotion.trigger('happy', 0.8);

// Get current state
const state = emotion.getCurrentState();
console.log('Dominant emotion:', state.dominant);
console.log('Intensity:', state.intensity);
```

## Cognition Module API

### Cognition Factory

Factory function for creating cognition modules.

```typescript
function createCognitionModule(type: CognitionType, config: CognitionConfig): CognitionModule;
```

#### Available Types

- **unified**: Modern dual-process system with metacognition
- **reactive**: Fast stimulus-response cognition
- **htn_planner**: Hierarchical task network planning
- **hybrid**: Combined reactive and planning approaches
- **theory-of-mind**: Social cognition and empathy modeling

### CognitionModule Interface

```typescript
interface CognitionModule {
  // Core cognition methods
  think(agent: Agent, context: ThoughtContext): Promise<ThoughtResult>;
  plan(agent: Agent, goal: string): Promise<Plan>;
  decide(agent: Agent, options: Decision[]): Promise<Decision>;
  
  // Learning and adaptation
  learn(agent: Agent, experience: Experience): Promise<void>;
  reflect(agent: Agent, outcomes: Outcome[]): Promise<void>;
  
  // Configuration and status
  initialize(config: CognitionConfig): void;
  getStatus(): CognitionStatus;
  getMetrics(): CognitionMetrics;
}
```

### ThoughtResult

Result of cognitive processing.

```typescript
interface ThoughtResult {
  thoughts: string[];
  confidence: number;
  reasoning: string;
  actions: AgentAction[];
  emotions: EmotionState;
  memories: MemoryRecord[];
  metadata: {
    processingTime: number;
    cognitive_load: number;
    strategy_used: string;
  };
}
```

### Usage Example

```typescript
// Create unified cognition module
const cognition = createCognitionModule('unified', {
  analysisDepth: 'deep',
  enableMetacognition: true,
  enableTheoryOfMind: true
});

// Think about a problem
const result = await cognition.think(agent, {
  input: 'How to solve this coding problem?',
  context: { topic: 'programming' }
});

console.log('Thoughts:', result.thoughts);
console.log('Confidence:', result.confidence);
```

## Extension API

### Extension Interface

Base interface for all extensions.

```typescript
interface Extension {
  id: string;
  name: string;
  version: string;
  enabled: boolean;
  config: Record<string, any>;
  
  // Lifecycle
  init(agent: Agent): Promise<void>;
  tick(agent: Agent): Promise<void>;
  shutdown(): Promise<void>;
  
  // Actions and events
  actions: Record<string, ExtensionAction>;
  events: Record<string, ExtensionEventHandler>;
  
  // Status and health
  getStatus(): ExtensionStatus;
  healthCheck(): Promise<boolean>;
}
```

### ExtensionAction

Action that can be performed by an extension.

```typescript
interface ExtensionAction {
  id: string;
  name: string;
  description: string;
  parameters: ActionParameter[];
  
  execute(agent: Agent, params: ActionParameters): Promise<ActionResult>;
  validate(params: ActionParameters): ValidationResult;
}
```

### Available Extensions

#### API Extension

HTTP/WebSocket server with WebUI.

```typescript
interface APIExtensionConfig {
  port: number;
  host: string;
  cors: CORSConfig;
  rateLimit: RateLimitConfig;
  websocket: WebSocketConfig;
  auth: AuthConfig;
}
```

#### Telegram Extension

Telegram bot integration.

```typescript
interface TelegramExtensionConfig {
  botToken: string;
  autoRespond: boolean;
  personalityMode: 'full' | 'basic' | 'minimal';
  memoryIntegration: boolean;
  rateLimiting: RateLimitConfig;
  features: {
    commands: boolean;
    inlineKeyboards: boolean;
    fileUploads: boolean;
    groupChats: boolean;
  };
}
```

### Usage Example

```typescript
// Enable API extension
agent.enableExtension('api');

// Configure Telegram extension
const telegramConfig = {
  botToken: process.env.TELEGRAM_BOT_TOKEN,
  autoRespond: true,
  personalityMode: 'full',
  memoryIntegration: true
};

agent.enableExtension('telegram', telegramConfig);
```

## Portal API

### Portal Interface

Interface for AI provider integrations.

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

### Portal Factory

Factory function for creating portals.

```typescript
function createPortal(type: PortalType, config: PortalConfig): Portal;
```

#### Available Portals

- **openai**: OpenAI GPT models
- **anthropic**: Anthropic Claude models
- **groq**: Groq fast inference
- **google-generative**: Google Gemini models
- **xai**: xAI Grok models
- **mistral**: Mistral AI models
- **cohere**: Cohere Command models
- **azure-openai**: Azure OpenAI service
- **ollama**: Local model hosting

### PortalResponse

Standard response from AI portals.

```typescript
interface PortalResponse {
  content: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  metadata: {
    model: string;
    provider: string;
    latency: number;
    cost?: number;
  };
  tools?: ToolCall[];
}
```

### Usage Example

```typescript
// Create OpenAI portal
const openai = createPortal('openai', {
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4o-mini',
  maxTokens: 2048,
  temperature: 0.7
});

// Generate response
const response = await openai.generateResponse([
  { role: 'user', content: 'Hello!' }
]);

console.log('Response:', response.content);
console.log('Usage:', response.usage);
```

## Character Configuration API

### Character Interface

Configuration structure for agent characters.

```typescript
interface Character {
  id: string;
  name: string;
  version: string;
  enabled: boolean;
  
  personality: PersonalityConfig;
  autonomous: AutonomousConfig;
  memory: MemoryConfig;
  emotion: EmotionConfig;
  cognition: CognitionConfig;
  communication: CommunicationConfig;
  extensions: ExtensionConfig[];
  portals: PortalConfig[];
  
  // Optional configurations
  mcpServers?: MCPServerConfig;
  capabilities?: CapabilityConfig;
  ethics?: EthicsConfig;
  development?: DevelopmentConfig;
}
```

### Character Factory

Factory function for loading characters.

```typescript
function loadCharacter(characterId: string): Promise<Character>;
function validateCharacter(character: Character): ValidationResult;
```

### Usage Example

```typescript
// Load character configuration
const character = await loadCharacter('nyx');

// Validate character
const validation = validateCharacter(character);
if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
}

// Create agent with character
const agent = await runtime.createAgent(character.id);
```

## CLI API

### Command Interface

Interface for CLI commands.

```typescript
interface CLICommand {
  name: string;
  description: string;
  options: CommandOption[];
  
  execute(args: CommandArgs): Promise<void>;
  validate(args: CommandArgs): ValidationResult;
}
```

### Available Commands

```typescript
// Agent management
cli.agent.list()                    // List all agents
cli.agent.status(agentId)          // Get agent status
cli.agent.start(agentId)           // Start agent
cli.agent.stop(agentId)            // Stop agent
cli.agent.restart(agentId)         // Restart agent

// System operations
cli.system.status()                // System status
cli.system.health()                // Health check
cli.system.metrics()               // Performance metrics

// Chat operations
cli.chat.send(agentId, message)    // Send message
cli.chat.history(agentId, limit)   // Get chat history

// Extension management
cli.extension.list()               // List extensions
cli.extension.enable(extensionId)  // Enable extension
cli.extension.disable(extensionId) // Disable extension
```

## REST API Endpoints

### Agent Endpoints

```http
GET    /api/agents              # List all agents
POST   /api/agents              # Create new agent
GET    /api/agents/:id          # Get agent details
PUT    /api/agents/:id          # Update agent
DELETE /api/agents/:id          # Delete agent

GET    /api/agents/:id/status   # Get agent status
POST   /api/agents/:id/start    # Start agent
POST   /api/agents/:id/stop     # Stop agent
POST   /api/agents/:id/restart  # Restart agent
```

### Chat Endpoints

```http
POST   /api/chat                # Send message to agent
GET    /api/chat/:id/history    # Get chat history
DELETE /api/chat/:id/history    # Clear chat history
```

### Memory Endpoints

```http
GET    /api/agents/:id/memories      # Get agent memories
POST   /api/agents/:id/memories      # Store memory
DELETE /api/agents/:id/memories/:mid # Delete memory
GET    /api/agents/:id/memories/search # Search memories
```

### System Endpoints

```http
GET    /api/system/status       # System status
GET    /api/system/health       # Health check
GET    /api/system/metrics      # Performance metrics
GET    /api/system/version      # Version information
```

### Example API Usage

```javascript
// Create agent
const response = await fetch('/api/agents', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    characterId: 'nyx',
    config: { /* agent config */ }
  })
});

// Send message
const chatResponse = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    agentId: 'nyx',
    message: 'Hello!',
    context: { sessionId: 'session-123' }
  })
});

const result = await chatResponse.json();
console.log('Agent response:', result.content);
```

## WebSocket API

### Connection

```javascript
const ws = new WebSocket('ws://localhost:3000/ws');

ws.onopen = () => {
  console.log('Connected to SYMindX');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};
```

### Event Types

```typescript
interface WSEvent {
  type: string;
  data: any;
  timestamp: Date;
  agentId?: string;
}
```

#### Available Events

- **agent:created** - Agent was created
- **agent:message** - Agent sent a message
- **agent:emotion** - Agent's emotion changed
- **agent:memory** - New memory stored
- **agent:action** - Agent performed an action
- **system:status** - System status update
- **error** - Error occurred

### Usage Example

```javascript
ws.onmessage = (event) => {
  const { type, data, agentId } = JSON.parse(event.data);
  
  switch (type) {
    case 'agent:message':
      console.log(`${agentId}: ${data.content}`);
      break;
    case 'agent:emotion':
      console.log(`${agentId} feeling ${data.dominant}`);
      break;
    case 'system:status':
      console.log('System status:', data.status);
      break;
  }
};
```

## Type Definitions

### Core Types

```typescript
// Agent types
type AgentStatus = 'idle' | 'active' | 'thinking' | 'responding' | 'error';
type AgentState = 'initializing' | 'ready' | 'busy' | 'shutdown';

// Memory types
type MemoryType = 'conversation' | 'experience' | 'knowledge' | 'emotion';
type MemoryProviderType = 'sqlite' | 'postgres' | 'supabase' | 'neon' | 'memory';

// Emotion types
type EmotionType = 'happy' | 'sad' | 'angry' | 'anxious' | 'confident' | 
                   'nostalgic' | 'empathetic' | 'curious' | 'proud' | 
                   'confused' | 'neutral';

// Cognition types
type CognitionType = 'unified' | 'reactive' | 'htn_planner' | 'hybrid' | 'theory-of-mind';

// Portal types
type PortalType = 'openai' | 'anthropic' | 'groq' | 'google-generative' | 
                  'xai' | 'mistral' | 'cohere' | 'azure-openai' | 'ollama';

// Extension types
type ExtensionType = 'api' | 'telegram' | 'mcp-server' | 'communication';
```

### Configuration Types

```typescript
interface RuntimeConfig {
  tickInterval?: number;
  maxAgents?: number;
  enableLogging?: boolean;
  logLevel?: LogLevel;
  dataPath?: string;
  enableAutoDiscovery?: boolean;
}

interface PersonalityConfig {
  traits: Record<string, number>;
  values: string[];
  backstory: string;
  goals: string[];
  quirks?: string[];
  motivations?: string[];
}

interface AutonomousConfig {
  enabled: boolean;
  independence_level: number;
  decision_making: DecisionMakingConfig;
  life_simulation: LifeSimulationConfig;
  behaviors: BehaviorConfig;
}

interface CommunicationConfig {
  style: string;
  tone: string;
  verbosity: string;
  personality_expression: boolean;
  emotional_expression: boolean;
  languages: string[];
  guidelines: string[];
}
```

### Response Types

```typescript
interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
  requestId: string;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  components: {
    runtime: ComponentHealth;
    memory: ComponentHealth;
    portals: ComponentHealth;
    extensions: ComponentHealth;
  };
  timestamp: Date;
}
```

## Error Handling

### Error Types

```typescript
class SYMindXError extends Error {
  code: string;
  details?: any;
  
  constructor(message: string, code: string, details?: any);
}

class AgentError extends SYMindXError {}
class MemoryError extends SYMindXError {}
class PortalError extends SYMindXError {}
class ExtensionError extends SYMindXError {}
```

### Error Handling Example

```typescript
try {
  const response = await agent.processMessage('Hello');
  console.log(response.content);
} catch (error) {
  if (error instanceof AgentError) {
    console.error('Agent error:', error.code, error.message);
  } else if (error instanceof PortalError) {
    console.error('Portal error:', error.code, error.message);
  } else {
    console.error('Unknown error:', error);
  }
}
```

## Best Practices

### Performance Optimization

1. **Use appropriate memory providers** for your use case
2. **Configure portal timeouts** to prevent hanging requests
3. **Enable caching** for frequently accessed data
4. **Monitor system metrics** regularly
5. **Use streaming** for real-time applications

### Security

1. **Use environment variables** for sensitive configuration
2. **Enable rate limiting** for public APIs
3. **Configure CORS** appropriately
4. **Use authentication** for production deployments
5. **Regular security updates** for dependencies

### Monitoring

1. **Set up health checks** for all components
2. **Monitor memory usage** and performance
3. **Track API usage** and costs
4. **Log important events** for debugging
5. **Use structured logging** for better analysis

### Development

1. **Use TypeScript** for better type safety
2. **Follow naming conventions** for consistency
3. **Write comprehensive tests** for new features
4. **Document configuration changes**
5. **Use version control** for character configurations

## Migration and Upgrading

### Version Compatibility

- **1.x to 2.x**: Breaking changes in character configuration format
- **Configuration updates**: Use migration scripts provided
- **API changes**: Review changelog for breaking changes

### Upgrading Steps

1. **Backup configurations** and data
2. **Update dependencies** to latest versions
3. **Run migration scripts** if needed
4. **Test functionality** thoroughly
5. **Update documentation** and examples

---

## Support and Resources

- **Documentation**: [README.md](./README.md)
- **Examples**: [packages/agent/src/character/](../../../packages/agent/src/character/)
- **Issues**: GitHub Issues
- **Discord**: Community Discord server
- **Email**: support@symindx.com

For more detailed information about specific components, see the individual documentation files in [apps/docs/agent](./README.md).