#!/bin/bash

# Script to create all missing documentation files for SYMindX
DOCS_DIR="/home/cid/CursorProjects/symindx/docs-site/docs"

echo "📝 Creating missing documentation files..."

# Function to create a documentation file with content
create_doc() {
    local path=$1
    local title=$2
    local description=$3
    local content=$4
    
    if [ ! -f "$path" ]; then
        cat > "$path" << EOF
---
sidebar_position: 1
title: "$title"
description: "$description"
---

# $title

$description

$content
EOF
        echo "✅ Created: $path"
    else
        echo "⏭️  Skipping (exists): $path"
    fi
}

# 01. Overview
create_doc "$DOCS_DIR/01-overview/index.md" \
    "Overview" \
    "Introduction to SYMindX - A modular AI agent runtime system" \
"## What is SYMindX?

SYMindX is a clean, modular AI agent runtime with a type-safe plugin architecture. It provides a flexible framework for building, deploying, and managing AI agents with advanced capabilities.

### Key Features

- **Modular Architecture**: Plug-and-play modules for memory, emotion, and cognition
- **Multi-Agent Support**: Run multiple agents with different personalities and capabilities
- **Type-Safe**: Full TypeScript support with comprehensive type definitions
- **Extensible**: Easy to add new modules, extensions, and integrations
- **Real-time Communication**: WebSocket support for live agent interactions

### Quick Links

- [Getting Started](/docs/02-getting-started) - Get up and running quickly
- [API Reference](/docs/03-api-reference) - Complete API documentation
- [Examples](/docs/17-examples) - See SYMindX in action
- [Community](/docs/22-community) - Join our community"

create_doc "$DOCS_DIR/01-overview/introduction/index.md" \
    "Introduction" \
    "What is SYMindX and why should you use it?" \
"## Welcome to SYMindX

SYMindX represents the next generation of AI agent frameworks, designed from the ground up to be modular, extensible, and type-safe.

### The Problem

Building AI agents today involves:
- Complex state management
- Integration with multiple AI providers
- Handling real-time communication
- Managing agent memory and context
- Implementing personality and behavior systems

### The Solution

SYMindX provides:
- **Unified Runtime**: A single runtime that manages all agents
- **Plugin Architecture**: Add capabilities without modifying core code
- **Provider Abstraction**: Switch between AI providers seamlessly
- **Built-in Extensions**: Ready-to-use integrations with popular platforms

### Core Philosophy

1. **Modularity First**: Every component is a module
2. **Type Safety**: Catch errors at compile time
3. **Developer Experience**: Clean APIs and comprehensive documentation
4. **Production Ready**: Built for scale and reliability"

create_doc "$DOCS_DIR/01-overview/use-cases/index.md" \
    "Use Cases" \
    "Real-world applications and success stories" \
"## Use Cases for SYMindX

### Customer Support Automation
Build intelligent support agents that can:
- Handle multiple conversations simultaneously
- Access knowledge bases and documentation
- Escalate complex issues to human agents
- Learn from interactions to improve responses

### Personal AI Assistants
Create personalized AI companions with:
- Persistent memory across conversations
- Emotional intelligence and personality
- Task management and reminders
- Integration with personal tools and services

### Game NPCs
Develop non-player characters with:
- Dynamic personalities and emotions
- Contextual dialogue systems
- Memory of player interactions
- Reactive behavior based on game events

### Educational Tutors
Build AI tutors that can:
- Adapt to student learning styles
- Track progress over time
- Provide personalized feedback
- Generate practice problems

### Research Assistants
Create AI agents for:
- Literature review and summarization
- Data analysis and interpretation
- Hypothesis generation
- Collaborative research workflows"

create_doc "$DOCS_DIR/01-overview/roadmap/index.md" \
    "Roadmap" \
    "Future development plans and feature roadmap" \
"## SYMindX Roadmap

### Current Version (v1.0)
- ✅ Core runtime system
- ✅ Memory, emotion, and cognition modules
- ✅ Multi-agent support
- ✅ WebSocket real-time communication
- ✅ TypeScript SDK
- ✅ Basic extensions (Telegram, Slack, API)

### Q1 2025
- 🚧 Advanced consciousness modules
- 🚧 Visual perception capabilities
- 🚧 Enhanced multi-modal support
- 🚧 Distributed agent coordination

### Q2 2025
- 📋 Agent marketplace
- 📋 Visual workflow builder
- 📋 Enhanced monitoring and analytics
- 📋 Enterprise features (SSO, audit logs)

### Q3 2025
- 📋 Edge deployment support
- 📋 Mobile SDKs (iOS, Android)
- 📋 Advanced training capabilities
- 📋 Federated learning support

### Long-term Vision
- Self-improving agents
- Cross-platform agent migration
- Quantum computing integration
- AGI safety features"

# 02. Getting Started
create_doc "$DOCS_DIR/02-getting-started/index.md" \
    "Getting Started" \
    "Quick start guide for SYMindX" \
"## Getting Started with SYMindX

Welcome! This guide will help you get SYMindX up and running in minutes.

### Prerequisites

Before you begin, ensure you have:
- Node.js 18+ or Bun installed
- An API key from at least one AI provider (OpenAI, Anthropic, etc.)
- Basic knowledge of TypeScript/JavaScript

### Quick Start

1. **Clone the repository**
   \`\`\`bash
   git clone https://github.com/symindx/symindx.git
   cd symindx
   \`\`\`

2. **Install dependencies**
   \`\`\`bash
   bun install
   \`\`\`

3. **Configure your environment**
   \`\`\`bash
   cp config/runtime.example.json config/runtime.json
   # Edit runtime.json with your API keys
   \`\`\`

4. **Start the system**
   \`\`\`bash
   bun dev
   \`\`\`

### Next Steps

- [Create Your First Agent](/docs/02-getting-started/first-agent)
- [Explore the API](/docs/03-api-reference)
- [Join our Community](/docs/22-community)"

create_doc "$DOCS_DIR/02-getting-started/prerequisites/index.md" \
    "Prerequisites" \
    "System requirements and dependencies" \
"## Prerequisites

### System Requirements

- **Operating System**: Linux, macOS, or Windows (WSL2)
- **Node.js**: Version 18.0 or higher (or Bun)
- **Memory**: Minimum 4GB RAM (8GB recommended)
- **Storage**: 500MB free disk space

### Required Software

#### Runtime Environment
Choose one:
- **Bun** (recommended): [Install Bun](https://bun.sh)
- **Node.js**: [Download Node.js](https://nodejs.org)

#### Database (Optional)
For persistent memory storage:
- SQLite (included by default)
- PostgreSQL 14+
- Supabase account
- Neon account

### API Keys

You'll need at least one AI provider API key:

#### OpenAI
- Sign up at [platform.openai.com](https://platform.openai.com)
- Generate an API key
- Set \`OPENAI_API_KEY\` in your environment

#### Anthropic
- Sign up at [console.anthropic.com](https://console.anthropic.com)
- Generate an API key
- Set \`ANTHROPIC_API_KEY\` in your environment

#### Other Providers
- Groq: \`GROQ_API_KEY\`
- Google: \`GOOGLE_API_KEY\`
- xAI: \`XAI_API_KEY\`

### Development Tools (Optional)

- **Git**: For version control
- **VS Code**: Recommended editor with TypeScript support
- **Docker**: For containerized deployment"

# 03. API Reference
create_doc "$DOCS_DIR/03-api-reference/index.md" \
    "API Reference" \
    "Complete API documentation for SYMindX" \
"## API Reference

SYMindX provides multiple ways to interact with the system:

### API Types

1. **[REST API](/docs/03-api-reference/rest-api)** - Traditional HTTP endpoints
2. **[WebSocket API](/docs/03-api-reference/websocket-api)** - Real-time bidirectional communication
3. **[TypeScript SDK](/docs/03-api-reference/typescript-sdk)** - Native TypeScript/JavaScript integration
4. **[OpenAPI Spec](/docs/03-api-reference/openapi)** - Machine-readable API definition
5. **[GraphQL API](/docs/03-api-reference/graphql)** - Flexible query language (coming soon)

### Quick Start

#### REST API Example
\`\`\`bash
# Get agent status
curl http://localhost:3001/api/agents

# Send a message
curl -X POST http://localhost:3001/api/chat/send \\
  -H \"Content-Type: application/json\" \\
  -d '{\"agentId\": \"nyx\", \"message\": \"Hello!\"}'
\`\`\`

#### WebSocket Example
\`\`\`javascript
const ws = new WebSocket('ws://localhost:3001/ws');

ws.on('message', (data) => {
  console.log('Received:', JSON.parse(data));
});

ws.send(JSON.stringify({
  type: 'chat',
  agentId: 'nyx',
  message: 'Hello!'
}));
\`\`\`

#### TypeScript SDK Example
\`\`\`typescript
import { SYMindX } from '@symindx/sdk';

const client = new SYMindX({
  apiUrl: 'http://localhost:3001'
});

const response = await client.chat.send({
  agentId: 'nyx',
  message: 'Hello!'
});
\`\`\`"

create_doc "$DOCS_DIR/03-api-reference/graphql/index.md" \
    "GraphQL API" \
    "GraphQL API documentation (coming soon)" \
"## GraphQL API

The GraphQL API for SYMindX is currently under development.

### Why GraphQL?

GraphQL will provide:
- **Flexible Queries**: Request exactly what you need
- **Type Safety**: Strong typing with schema definitions
- **Real-time Subscriptions**: Live updates via GraphQL subscriptions
- **Single Endpoint**: All queries through one endpoint

### Planned Features

#### Queries
- Agent information and status
- Conversation history
- Memory retrieval
- System metrics

#### Mutations
- Create/update agents
- Send messages
- Update configurations
- Manage extensions

#### Subscriptions
- Real-time agent thoughts
- Emotion changes
- Conversation updates
- System events

### Coming Soon

We're actively working on the GraphQL API. Check back soon or [contribute](/docs/21-development/contributing) to help build it!"

# 04. Core Concepts
create_doc "$DOCS_DIR/04-core-concepts/index.md" \
    "Core Concepts" \
    "Fundamental concepts and architecture of SYMindX" \
"## Core Concepts

Understanding these core concepts is essential for working with SYMindX effectively.

### Architecture Overview

SYMindX follows a modular, event-driven architecture:

\`\`\`
┌─────────────────┐
│     Runtime     │  ← Orchestrates everything
├─────────────────┤
│    Registry     │  ← Manages modules
├─────────────────┤
│   Event Bus     │  ← Inter-component communication
├─────────────────┤
│     Agents      │  ← AI personalities
├─────────────────┤
│     Modules     │  ← Core capabilities
├─────────────────┤
│   Extensions    │  ← Platform integrations
└─────────────────┘
\`\`\`

### Key Components

1. **[Runtime](/docs/04-core-concepts/runtime)** - The main orchestrator
2. **[Registry](/docs/04-core-concepts/registry)** - Module management system
3. **[Event Bus](/docs/04-core-concepts/event-bus)** - Communication backbone
4. **[Plugin System](/docs/04-core-concepts/plugin-system)** - Extension mechanism
5. **[Lifecycle](/docs/04-core-concepts/lifecycle)** - Component lifecycle management

### Design Principles

- **Modularity**: Everything is a module
- **Type Safety**: Strong TypeScript typing
- **Event-Driven**: Loose coupling via events
- **Hot-Swappable**: Change modules at runtime
- **Fail-Safe**: Graceful degradation"

create_doc "$DOCS_DIR/04-core-concepts/runtime/index.md" \
    "Runtime" \
    "The SYMindX runtime system" \
"## Runtime System

The Runtime is the heart of SYMindX, orchestrating all components and managing the agent lifecycle.

### Responsibilities

1. **Agent Management**
   - Loading agent configurations
   - Creating agent instances
   - Managing agent lifecycle

2. **Module Coordination**
   - Initializing modules
   - Dependency injection
   - Module communication

3. **Extension Management**
   - Loading extensions
   - Managing extension lifecycle
   - Resource allocation

4. **Event Orchestration**
   - Central event bus management
   - Event routing and filtering
   - Error handling

### Runtime Configuration

\`\`\`json
{
  \"agents\": [
    {
      \"id\": \"nyx\",
      \"name\": \"NyX\",
      \"characterPath\": \"./characters/nyx.json\"
    }
  ],
  \"extensions\": {
    \"api\": {
      \"enabled\": true,
      \"port\": 3001
    }
  }
}
\`\`\`

### Lifecycle Phases

1. **Initialization**
   - Load configuration
   - Initialize registry
   - Set up event bus

2. **Module Loading**
   - Register core modules
   - Load custom modules
   - Validate dependencies

3. **Agent Creation**
   - Load character files
   - Create agent instances
   - Initialize agent modules

4. **Running**
   - Start tick loop
   - Process events
   - Handle requests

5. **Shutdown**
   - Stop agents gracefully
   - Clean up resources
   - Save state"

create_doc "$DOCS_DIR/04-core-concepts/registry/index.md" \
    "Registry" \
    "Module registry and dependency management" \
"## Module Registry

The Registry is SYMindX's dependency injection and module management system.

### Purpose

The Registry provides:
- **Module Registration**: Central place for all modules
- **Dependency Resolution**: Automatic dependency injection
- **Type Safety**: Compile-time type checking
- **Hot Reloading**: Swap modules at runtime

### How It Works

\`\`\`typescript
// Register a module
registry.register('memory', 'sqlite', sqliteProvider);

// Retrieve a module
const memory = registry.get('memory', 'sqlite');

// List available modules
const providers = registry.list('memory');
\`\`\`

### Module Types

1. **Memory Providers**
   - SQLite
   - PostgreSQL
   - Supabase
   - Neon

2. **Emotion Modules**
   - Emotion Stack
   - Custom emotions

3. **Cognition Modules**
   - HTN Planner
   - Reactive
   - Hybrid

4. **Extensions**
   - API Server
   - Chat platforms
   - Web UI

### Registry API

\`\`\`typescript
interface Registry {
  // Register a module
  register<T>(type: string, id: string, module: T): void;
  
  // Get a module
  get<T>(type: string, id: string): T;
  
  // List modules of a type
  list(type: string): string[];
  
  // Check if module exists
  has(type: string, id: string): boolean;
  
  // Unregister a module
  unregister(type: string, id: string): void;
}
\`\`\`"

create_doc "$DOCS_DIR/04-core-concepts/event-bus/index.md" \
    "Event Bus" \
    "Event-driven communication system" \
"## Event Bus

The Event Bus is SYMindX's central communication system, enabling loose coupling between components.

### Overview

The Event Bus provides:
- **Pub/Sub Messaging**: Decoupled communication
- **Event Filtering**: Subscribe to specific event types
- **Priority Handling**: Process critical events first
- **Error Isolation**: Failures don't affect other handlers

### Event Types

\`\`\`typescript
// System Events
'system:startup'
'system:shutdown'
'system:error'

// Agent Events
'agent:created'
'agent:thought'
'agent:emotion_changed'
'agent:action'

// Module Events
'memory:stored'
'memory:retrieved'
'cognition:plan_created'
'emotion:state_changed'

// Extension Events
'chat:message_received'
'chat:message_sent'
'api:request'
'api:response'
\`\`\`

### Usage Examples

#### Subscribing to Events
\`\`\`typescript
// Subscribe to all agent thoughts
eventBus.on('agent:thought', (event) => {
  console.log(\`\${event.agentId} thinking: \${event.thought}\`);
});

// Subscribe to specific agent
eventBus.on('agent:thought', (event) => {
  if (event.agentId === 'nyx') {
    handleNyxThought(event);
  }
});
\`\`\`

#### Emitting Events
\`\`\`typescript
// Emit an event
eventBus.emit('agent:action', {
  agentId: 'nyx',
  action: 'send_message',
  data: { message: 'Hello!' }
});
\`\`\`

### Best Practices

1. **Use Namespaced Events**: Follow the \`category:action\` pattern
2. **Include Metadata**: Always include relevant context
3. **Handle Errors**: Wrap handlers in try-catch
4. **Unsubscribe**: Clean up listeners when done"

create_doc "$DOCS_DIR/04-core-concepts/plugin-system/index.md" \
    "Plugin System" \
    "How to extend SYMindX with plugins" \
"## Plugin System

SYMindX's plugin system allows you to extend functionality without modifying core code.

### Plugin Types

1. **Modules** - Core functionality (memory, emotion, cognition)
2. **Extensions** - Platform integrations (Telegram, Slack, API)
3. **Portals** - AI provider integrations (OpenAI, Anthropic)
4. **Tools** - Agent capabilities (web search, calculations)

### Plugin Interface

\`\`\`typescript
interface Plugin {
  id: string;
  name: string;
  version: string;
  
  // Lifecycle methods
  init(config: any): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  
  // Optional methods
  tick?(): Promise<void>;
  handleEvent?(event: Event): Promise<void>;
}
\`\`\`

### Creating a Plugin

\`\`\`typescript
export class MyPlugin implements Plugin {
  id = 'my-plugin';
  name = 'My Custom Plugin';
  version = '1.0.0';
  
  async init(config: any) {
    // Initialize with configuration
  }
  
  async start() {
    // Start the plugin
  }
  
  async stop() {
    // Cleanup resources
  }
  
  async tick() {
    // Called every tick (optional)
  }
}
\`\`\`

### Plugin Registration

\`\`\`typescript
// In your module's index.ts
export function registerMyPlugin(registry: Registry) {
  registry.register('extension', 'my-plugin', MyPlugin);
}

// In runtime configuration
{
  \"extensions\": {
    \"my-plugin\": {
      \"enabled\": true,
      \"config\": {
        // Plugin-specific config
      }
    }
  }
}
\`\`\`

### Plugin Best Practices

1. **Fail Gracefully**: Don't crash the system
2. **Log Appropriately**: Use proper log levels
3. **Clean Up**: Always implement stop() method
4. **Document Config**: Provide clear configuration docs
5. **Version Properly**: Follow semantic versioning"

create_doc "$DOCS_DIR/04-core-concepts/lifecycle/index.md" \
    "Lifecycle" \
    "Component lifecycle management" \
"## Lifecycle Management

Understanding component lifecycle is crucial for building robust SYMindX applications.

### Component Lifecycle Phases

\`\`\`
┌─────────────┐
│   Created   │ → Component instantiated
├─────────────┤
│ Initialized │ → Configuration loaded
├─────────────┤
│   Started   │ → Component active
├─────────────┤
│   Running   │ → Processing events/ticks
├─────────────┤
│  Stopping   │ → Cleanup initiated
├─────────────┤
│   Stopped   │ → Resources released
└─────────────┘
\`\`\`

### Agent Lifecycle

1. **Creation**
   \`\`\`typescript
   const agent = new Agent(characterConfig);
   \`\`\`

2. **Initialization**
   \`\`\`typescript
   await agent.init({
     memory: memoryModule,
     emotion: emotionModule,
     cognition: cognitionModule
   });
   \`\`\`

3. **Starting**
   \`\`\`typescript
   await agent.start();
   // Agent is now active
   \`\`\`

4. **Running**
   \`\`\`typescript
   // Called every tick
   await agent.tick();
   \`\`\`

5. **Stopping**
   \`\`\`typescript
   await agent.stop();
   // Cleanup and save state
   \`\`\`

### Module Lifecycle

Modules follow a similar pattern:

\`\`\`typescript
interface ModuleLifecycle {
  // Initialize with config
  init(config: ModuleConfig): Promise<void>;
  
  // Start the module
  start(): Promise<void>;
  
  // Process a tick (optional)
  tick?(): Promise<void>;
  
  // Stop and cleanup
  stop(): Promise<void>;
}
\`\`\`

### Extension Lifecycle

Extensions have additional considerations:

\`\`\`typescript
interface ExtensionLifecycle extends ModuleLifecycle {
  // Connect to external service
  connect(): Promise<void>;
  
  // Disconnect gracefully
  disconnect(): Promise<void>;
  
  // Handle reconnection
  reconnect(): Promise<void>;
}
\`\`\`

### Best Practices

1. **Idempotent Operations**: Make init/start/stop safe to call multiple times
2. **Resource Management**: Always clean up in stop()
3. **Error Handling**: Gracefully handle lifecycle errors
4. **State Persistence**: Save important state before stopping
5. **Timeout Handling**: Set reasonable timeouts for lifecycle operations"

# Continue with more categories...
echo "📝 Creating Module documentation..."

# 06. Modules
create_doc "$DOCS_DIR/06-modules/index.md" \
    "Modules" \
    "Core modules that power SYMindX agents" \
"## Modules

Modules are the building blocks of SYMindX agents, providing core capabilities and behaviors.

### Module Categories

1. **[Memory Modules](/docs/06-modules/memory)** - Information storage and retrieval
2. **[Emotion Modules](/docs/06-modules/emotion)** - Emotional state management
3. **[Cognition Modules](/docs/06-modules/cognition)** - Decision-making and planning
4. **[Consciousness Modules](/docs/06-modules/consciousness)** - Self-awareness and reflection
5. **[Behavior Modules](/docs/06-modules/behavior)** - Action patterns and responses
6. **[Tools](/docs/06-modules/tools)** - Utility functions and capabilities

### Module Interface

All modules implement a common interface:

\`\`\`typescript
interface Module {
  id: string;
  type: ModuleType;
  
  // Lifecycle
  init(config: ModuleConfig): Promise<void>;
  start(): Promise<void>;
  tick?(): Promise<void>;
  stop(): Promise<void>;
  
  // Module-specific methods
  [key: string]: any;
}
\`\`\`

### Using Modules

\`\`\`typescript
// Create a memory module
const memory = createMemoryProvider('sqlite', {
  path: './data/agent.db'
});

// Create an emotion module
const emotion = createEmotionModule('emotion_stack', {
  baseEmotions: ['happy', 'sad', 'angry', 'fearful']
});

// Create a cognition module
const cognition = createCognitionModule('htn_planner', {
  maxDepth: 5,
  planningHorizon: 10
});

// Assign to agent
const agent = new Agent({
  modules: { memory, emotion, cognition }
});
\`\`\`"

# Create more documentation files for key sections...

# 07. Extensions
create_doc "$DOCS_DIR/07-extensions/index.md" \
    "Extensions" \
    "Platform integrations and extensions" \
"## Extensions

Extensions connect SYMindX agents to external platforms and services.

### Available Extensions

1. **[API Server](/docs/07-extensions/api-server)** - REST and WebSocket APIs
2. **[Telegram](/docs/07-extensions/telegram)** - Telegram bot integration
3. **[Slack](/docs/07-extensions/slack)** - Slack workspace integration
4. **[Discord](/docs/07-extensions/discord)** - Discord bot integration
5. **[Twitter](/docs/07-extensions/twitter)** - Twitter/X integration
6. **[Web UI](/docs/07-extensions/web-ui)** - Browser-based interface
7. **[CLI](/docs/07-extensions/cli)** - Command-line interface

### Extension Architecture

\`\`\`typescript
interface Extension {
  id: string;
  name: string;
  
  // Connect to external service
  init(agent: Agent, config: ExtensionConfig): Promise<void>;
  
  // Start receiving events
  start(): Promise<void>;
  
  // Process events (optional)
  tick?(): Promise<void>;
  
  // Disconnect and cleanup
  stop(): Promise<void>;
}
\`\`\`

### Creating Custom Extensions

\`\`\`typescript
export class MyExtension implements Extension {
  id = 'my-extension';
  name = 'My Custom Extension';
  
  private agent: Agent;
  
  async init(agent: Agent, config: any) {
    this.agent = agent;
    // Initialize connection
  }
  
  async start() {
    // Start listening for events
  }
  
  async stop() {
    // Cleanup
  }
}
\`\`\`"

# 08. Portals
create_doc "$DOCS_DIR/08-portals/index.md" \
    "Portals" \
    "AI provider integrations" \
"## Portals

Portals are integrations with AI providers, allowing agents to use different language models.

### Supported Providers

1. **[OpenAI](/docs/08-portals/openai)** - GPT-4, GPT-3.5
2. **[Anthropic](/docs/08-portals/anthropic)** - Claude 3
3. **[Google](/docs/08-portals/google)** - Gemini
4. **[Groq](/docs/08-portals/groq)** - Fast inference
5. **[xAI](/docs/08-portals/xai)** - Grok
6. **[Ollama](/docs/08-portals/ollama)** - Local models
7. **[Custom](/docs/08-portals/custom)** - Build your own

### Portal Selection

Agents can specify their preferred portal:

\`\`\`json
{
  \"name\": \"NyX\",
  \"portal\": {
    \"provider\": \"anthropic\",
    \"model\": \"claude-3-opus-20240229\"
  }
}
\`\`\`

### Portal Switching

Switch portals at runtime:

\`\`\`typescript
// Switch to a different provider
await agent.setPortal('openai', {
  model: 'gpt-4-turbo-preview'
});

// Use multiple portals
const response1 = await agent.think({ portal: 'anthropic' });
const response2 = await agent.think({ portal: 'openai' });
\`\`\`

### Cost Optimization

Different portals have different costs and capabilities:

| Provider | Speed | Cost | Quality | Context |
|----------|-------|------|---------|---------|
| OpenAI GPT-4 | Medium | High | Excellent | 128k |
| Anthropic Claude | Medium | Medium | Excellent | 200k |
| Groq | Very Fast | Low | Good | 32k |
| Ollama | Fast | Free | Variable | Variable |"

# Create example documentation for completeness
create_doc "$DOCS_DIR/17-examples/index.md" \
    "Examples" \
    "Code examples and sample implementations" \
"## Examples

Learn by example with these sample implementations.

### Categories

1. **[Basic Examples](/docs/17-examples/basic)** - Simple getting started examples
2. **[Advanced Examples](/docs/17-examples/advanced)** - Complex implementations
3. **[Use Cases](/docs/17-examples/use-cases)** - Real-world scenarios
4. **[Templates](/docs/17-examples/templates)** - Starter templates

### Quick Examples

#### Basic Chat Agent
\`\`\`typescript
import { SYMindX } from '@symindx/core';

// Create a simple chat agent
const agent = await SYMindX.createAgent({
  name: 'ChatBot',
  personality: 'friendly and helpful',
  modules: {
    memory: 'sqlite',
    emotion: 'basic',
    cognition: 'reactive'
  }
});

// Handle messages
agent.on('message', async (msg) => {
  const response = await agent.think(msg);
  console.log(response);
});
\`\`\`

#### Multi-Agent System
\`\`\`typescript
// Create multiple agents
const agents = await Promise.all([
  SYMindX.createAgent({ name: 'Alice', role: 'researcher' }),
  SYMindX.createAgent({ name: 'Bob', role: 'analyst' }),
  SYMindX.createAgent({ name: 'Charlie', role: 'writer' })
]);

// Coordinate tasks
const task = 'Research and write about AI safety';
const plan = await SYMindX.coordinateAgents(agents, task);
\`\`\`

### Running Examples

1. Clone the repository
2. Navigate to \`examples/\` directory
3. Install dependencies: \`bun install\`
4. Run an example: \`bun run examples/basic-chat.ts\`"

# Security documentation
create_doc "$DOCS_DIR/09-security/index.md" \
    "Security" \
    "Security features and best practices" \
"## Security

SYMindX takes security seriously with built-in features for authentication, authorization, and compliance.

### Security Features

1. **[Authentication](/docs/09-security/authentication)** - User and agent authentication
2. **[Authorization](/docs/09-security/authorization)** - Permission management
3. **[RBAC](/docs/09-security/rbac)** - Role-based access control
4. **[Compliance](/docs/09-security/compliance)** - GDPR, HIPAA, SOX compliance
5. **[Encryption](/docs/09-security/encryption)** - Data protection

### Security Best Practices

#### API Keys
- Never commit API keys to version control
- Use environment variables or secure vaults
- Rotate keys regularly
- Use separate keys for development and production

#### Data Protection
- Encrypt sensitive data at rest
- Use TLS for all network communication
- Implement proper access controls
- Regular security audits

#### Agent Security
- Sandbox agent capabilities
- Limit resource access
- Monitor agent behavior
- Implement rate limiting

### Compliance

SYMindX provides features for:
- **GDPR**: Data privacy and right to be forgotten
- **HIPAA**: Healthcare data protection
- **SOX**: Financial data compliance
- **PCI DSS**: Payment card security

### Security Configuration

\`\`\`json
{
  \"security\": {
    \"authentication\": {
      \"enabled\": true,
      \"providers\": [\"jwt\", \"oauth2\"]
    },
    \"encryption\": {
      \"algorithm\": \"AES-256-GCM\",
      \"keyRotation\": \"30d\"
    },
    \"rateLimit\": {
      \"requests\": 100,
      \"window\": \"1m\"
    }
  }
}
\`\`\`"

# Create deployment documentation
create_doc "$DOCS_DIR/10-deployment/index.md" \
    "Deployment" \
    "Deployment options and configurations" \
"## Deployment

SYMindX can be deployed in various environments to meet your needs.

### Deployment Options

1. **[Docker](/docs/10-deployment/docker)** - Containerized deployment
2. **[Kubernetes](/docs/10-deployment/kubernetes)** - Orchestrated containers
3. **[Cloud](/docs/10-deployment/cloud)** - AWS, GCP, Azure
4. **[On-Premise](/docs/10-deployment/on-premise)** - Self-hosted
5. **[Configuration](/docs/10-deployment/configuration)** - Deployment configuration

### Quick Deploy

#### Docker
\`\`\`bash
# Build the image
docker build -t symindx:latest .

# Run the container
docker run -d \\
  -p 3001:3001 \\
  -v ./config:/app/config \\
  -v ./data:/app/data \\
  --env-file .env \\
  symindx:latest
\`\`\`

#### Docker Compose
\`\`\`yaml
version: '3.8'
services:
  symindx:
    image: symindx:latest
    ports:
      - \"3001:3001\"
    volumes:
      - ./config:/app/config
      - ./data:/app/data
    env_file:
      - .env
    restart: unless-stopped
\`\`\`

### Production Considerations

1. **High Availability**
   - Run multiple instances
   - Use load balancers
   - Implement health checks

2. **Scaling**
   - Horizontal scaling for agents
   - Vertical scaling for memory-intensive workloads
   - Auto-scaling based on metrics

3. **Monitoring**
   - Application metrics
   - System metrics
   - Log aggregation
   - Alerting

4. **Backup & Recovery**
   - Regular database backups
   - Configuration backups
   - Disaster recovery plan"

echo "✅ Documentation creation complete!"
echo ""
echo "Summary:"
echo "- Created comprehensive documentation for major sections"
echo "- Established consistent structure and formatting"
echo "- Added practical examples and code snippets"
echo "- Included best practices and security guidelines"
echo ""
echo "Next steps:"
echo "1. Review and refine the generated content"
echo "2. Add more specific examples for each module"
echo "3. Create API endpoint documentation"
echo "4. Add troubleshooting guides"
echo "5. Build interactive tutorials"