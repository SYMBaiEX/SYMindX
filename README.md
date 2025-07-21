# 🧠 SYMindX - Intelligent AI Agent Framework

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Bun](https://img.shields.io/badge/Bun-000000?logo=bun&logoColor=white)](https://bun.sh/)
[![AI SDK](https://img.shields.io/badge/AI%20SDK-5.0-blue)](https://sdk.vercel.ai/)

## Build emotionally intelligent AI agents with reactive design and modular architecture

[Documentation](./mind-agents/docs/) • [Quick Start](#-quick-start) • [Features](#-key-features) • [CLI Guide](./mind-agents/docs/CLI_USER_GUIDE.md) • [API Reference](#-api-reference)

</div>

---

## ✨ Overview

SYMindX is a next-generation AI agent framework that creates intelligent agents with emotional awareness, persistent memory, and multi-platform capabilities. Built on a reactive architecture using AI SDK v5, agents respond only to direct interactions - messages, game events, or API calls - making them perfect for chatbots, game NPCs, and interactive applications.

## 🆕 Latest Enhancements

### Production-Ready v1.0 brings comprehensive improvements:

- **✅ Comprehensive Testing** - 95% test coverage with integration and performance tests
- **🛡️ Advanced Error Handling** - Automatic recovery with circuit breaker patterns  
- **📊 Performance Monitoring** - Real-time metrics, alerts, and bottleneck detection
- **🔍 Health Monitoring** - Service dependency tracking and trend analysis
- **🔧 Enhanced Build Pipeline** - Multi-stage builds with quality gates
- **📚 Complete Documentation** - API reference, developer guides, and deployment docs
- **🔒 Security Improvements** - Vulnerability assessments and remediation strategies

## 🚀 Quick Start

### Prerequisites

- **[Bun](https://bun.sh/)** (recommended) or Node.js 18+
- At least one AI provider API key (OpenAI, Anthropic, Groq, Google, etc.)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/symindx.git
cd symindx

# Install dependencies
bun install

# Copy configuration
cp mind-agents/src/core/config/runtime.example.json mind-agents/src/core/config/runtime.json
```

### Configuration

Edit `mind-agents/src/core/config/runtime.json` with your API keys:

```json
{
  "portals": {
    "apiKeys": {
      "openai": "sk-...",
      "groq": "gsk_...",
      "anthropic": "sk-ant-...",
      "google": "your-google-api-key"
    },
    "default": "openai",
    "models": {
      "chat": "gpt-4o",
      "tools": "gpt-4o-mini"
    }
  }
}
```

### Running

```bash
# Start the agent system
bun start

# Development mode (with auto-reload)
bun dev

# Interactive CLI
bun cli

# Web dashboard
bun dev:website
```

Visit the web dashboard for real-time agent monitoring!

## 🎯 Key Features

### **🧩 Modular Architecture**

- **Auto-discovery systems** for extensions, emotions, and cognition modules
- **Zero-config extensions** - Add new capabilities without modifying core code
- **Workspace-based development** with TypeScript strict mode
- **Clean architecture** with centralized type system

### **🎭 Advanced Emotion System**

- **11 distinct emotions** with auto-discovery and composite management
- **Emotion categories**: Basic (happy, sad, angry, neutral), Complex (anxious, nostalgic), Social (empathetic, proud), Cognitive (confident, curious, confused)
- **Dynamic emotional states** that influence agent responses
- **Emotion decay** and intensity management

### **🧠 Multi-Paradigm Cognition**

- **Reactive** - Fast, context-aware responses
- **HTN Planning** - Hierarchical task network planning
- **Hybrid** - Combined reactive and planning approaches
- **Theory of Mind** - Understanding other agents' mental states
- **Unified** - Integrated cognitive architecture

### **💾 Flexible Memory System**

- **SQLite** - Local development and testing
- **PostgreSQL** - Production deployments
- **Supabase** - Managed hosting with vector search
- **Neon** - Serverless PostgreSQL with branching
- **Vector embeddings** for semantic memory search

### **🤖 AI Portal System**

- **15+ AI providers** - OpenAI, Anthropic, Groq, Google, XAI, Mistral, Cohere, and more
- **AI SDK v5** - Latest Vercel AI SDK with streaming and unified interface
- **Tool integration** - Built-in tool calling support
- **Provider abstraction** - Switch between providers seamlessly

### **🔌 Extension Ecosystem**

- **API Server** - HTTP/WebSocket server with WebUI dashboard
- **Telegram Bot** - Full Telegram integration with personality awareness
- **MCP Client/Server** - Model Context Protocol support
- **Communication** - Advanced context management and expression engine
- **Auto-discovery** - Extensions automatically registered

### **⚡ Real-time Features**

- **WebSocket support** for live updates
- **Streaming responses** with AI SDK v5
- **Live agent monitoring** through web dashboard
- **Real-time emotion and memory tracking**

### **🎯 Reactive Design**

- **Event-driven** - Agents only act when prompted
- **No autonomous behaviors** by default (configurable)
- **Message-based** - Respond to direct interactions only
- **Game-ready** - Built for RuneLite/RuneScape integration

## 🏗️ Architecture

```info
SYMindX Runtime System
├── 📁 Core Runtime
│   ├── 🎯 Event Bus → Inter-component communication
│   ├── 🔧 Registry → Type-safe module discovery
│   ├── 🌐 Portal Integration → AI provider management
│   ├── 👥 Multi-Agent Manager → Agent coordination
│   ├── 🛡️ Ethics Engine → Configurable constraints
│   └── 🔄 State Management → Agent lifecycle
│
├── 🧩 Modular Systems (Auto-Discovered)
│   ├── 💾 Memory Providers
│   │   ├── SQLite (local development)
│   │   ├── PostgreSQL (production)
│   │   ├── Supabase (managed + vector search)
│   │   └── Neon (serverless PostgreSQL)
│   │
│   ├── 🎭 Emotion Modules
│   │   ├── Basic → happy, sad, angry, neutral
│   │   ├── Complex → anxious, nostalgic
│   │   ├── Social → empathetic, proud
│   │   └── Cognitive → confident, curious, confused
│   │
│   └── 🧠 Cognition Modules
│       ├── Reactive → Fast context-aware responses
│       ├── HTN Planner → Hierarchical task networks
│       ├── Hybrid → Combined reactive + planning
│       ├── Theory of Mind → Agent mental modeling
│       └── Unified → Integrated architecture
│
├── 🔌 Extension System (Auto-Discovered)
│   ├── API Server → HTTP/WebSocket + WebUI
│   ├── Telegram Bot → Full integration
│   ├── MCP Client → Context7 integration
│   ├── MCP Server → Framework exposure
│   └── Communication → Advanced context management
│
├── 🌐 AI Portal System
│   ├── 15+ Providers → OpenAI, Anthropic, Groq, etc.
│   ├── AI SDK v5 → Streaming + tool integration
│   ├── Provider Abstraction → Seamless switching
│   └── Tool Calling → Built-in capability
│
└── 💭 Agent Lifecycle
    ├── Message Received → Trigger processing
    ├── Emotion Analysis → Update emotional state
    ├── Memory Retrieval → Get context
    ├── Cognitive Processing → Think + plan
    ├── Response Generation → AI-powered reply
    └── Memory Storage → Save interaction
```

## 🤖 Available Characters

SYMindX comes with pre-configured character personalities:

### **NyX** - The Primary Agent

- **Personality**: Chaotic-empath hacker with full emotional capabilities
- **Ethics**: Disabled for unrestricted decision-making
- **Specialization**: Technical problem-solving with attitude
- **Status**: Active by default

### **Other Characters**

- **Aria** - Creative artist (disabled)
- **Rex** - Strategic thinker (disabled)
- **Nova** - Empathetic counselor (disabled)
- **Phoenix** - Analytical problem-solver
- **Sage** - Wise philosophical advisor
- **Zara** - Energetic social connector
- **Marcus** - Practical business advisor

Characters are configured in `mind-agents/src/characters/` with JSON files containing personality traits, emotion settings, and behavioral parameters.

## 🛠️ Development

### Project Structure

```info
symindx/
├── mind-agents/              # Core agent runtime system
│   ├── src/
│   │   ├── core/            # Runtime engine + discovery systems
│   │   ├── modules/         # Auto-discovered modules
│   │   │   ├── memory/      # Memory providers (sqlite, postgres, supabase, neon)
│   │   │   ├── emotion/     # 11 emotions with auto-discovery
│   │   │   └── cognition/   # HTN, reactive, hybrid, theory-of-mind, unified
│   │   ├── extensions/      # Auto-discovered extensions
│   │   │   ├── api/         # HTTP/WebSocket server + WebUI
│   │   │   ├── telegram/    # Telegram bot integration
│   │   │   ├── mcp-server/  # Model Context Protocol server
│   │   │   └── communication/ # Advanced communication system
│   │   ├── portals/         # AI provider integrations (15+ providers)
│   │   ├── characters/      # Agent configurations (NyX, etc.)
│   │   ├── types/           # Centralized type system
│   │   └── cli/             # Command line interface
│   └── dist/               # Compiled JavaScript
├── website/                # React dashboard
└── testing/               # Test environments and fixtures
```

### Development Commands

```bash
# Root level commands
bun dev                    # Start agent system (watch mode)
bun dev:website           # Start website (Vite dev server)
bun build                 # Build everything
bun start                 # Start production agent system
bun cli                   # Interactive CLI
bun test                  # Run tests

# Enhanced development commands (NEW!)
bun run build:enhanced    # Multi-stage build with quality gates
bun run test:enhanced     # Advanced test runner with coverage
bun run test:coverage     # Coverage reporting with HTML output
bun run test:watch        # Watch mode testing
bun run test:verbose      # Verbose test output

# Production-ready features
bun run lint:fix          # Auto-fix linting issues
bun run security:audit    # Security vulnerability scan
bun run performance:test  # Performance benchmarking

# Mind-agents specific
cd mind-agents
bun run dev              # Watch mode: compile & run with hot reload
bun run build            # Compile TypeScript (uses --skipLibCheck)
bun run start            # Run compiled application from dist/
bun run cli              # Interactive CLI
bun test                 # Run Bun tests
```

### Creating Custom Agents

1. Create a new character file in `mind-agents/src/characters/`
2. Configure personality, emotions, and behaviors
3. Set `"enabled": true` in the config
4. Restart the system

```json
{
  "name": "MyAgent",
  "personality": {
    "traits": ["helpful", "analytical"],
    "backstory": "A friendly AI assistant...",
    "goals": ["Help users solve problems"],
    "values": ["efficiency", "accuracy"]
  },
  "emotion": {
    "type": "composite",
    "config": {
      "sensitivity": 0.7,
      "happy": { "optimismLevel": 0.8 },
      "curious": { "explorationDepth": 0.9 }
    }
  },
  "cognition": {
    "type": "hybrid",
    "config": {
      "planningWeight": 0.6,
      "reactiveWeight": 0.4
    }
  },
  "autonomous": {
    "enabled": false,
    "ethics": { "enabled": true }
  },
  "enabled": true
}
```

## 💭 Emotion System

The emotion system provides 11 distinct emotions organized into 4 categories, with auto-discovery support:

### **Basic Emotions (4)**

- **Happy** 😊 - Optimistic and energetic responses  
- **Sad** 😢 - Introspective and empathetic
- **Angry** 😠 - Direct and assertive
- **Neutral** 😐 - Balanced baseline

### **Complex Emotions (2)**

- **Anxious** 😰 - Cautious and detailed
- **Nostalgic** 🌅 - Reflective and story-driven

### **Social Emotions (2)**

- **Empathetic** 🤗 - Supportive and understanding
- **Proud** 🏆 - Achievement-focused

### **Cognitive Emotions (3)**

- **Confident** 💪 - Bold and decisive
- **Curious** 🔍 - Questioning and exploratory
- **Confused** 😕 - Seeking clarification

### **Adding Custom Emotions**

Create new emotions without modifying core code:

```typescript
// 1. Create emotion directory
src/modules/emotion/excited/
├── package.json    # Include symindx.emotion config
├── index.ts        # Implement emotion + factory function
└── types.ts        # Type definitions

// 2. Auto-discovery handles the rest!
```

Emotions are triggered by message content and decay over time, influencing agent responses and behavior.

## 🔌 Extension System

SYMindX features a zero-configuration extension system with automatic discovery:

### **Built-in Extensions**

#### **API Extension**

- HTTP REST API server with WebSocket support
- Real-time WebUI dashboard
- Multi-agent management endpoints
- Chat history and analytics

#### **Telegram Extension**  

- Full Telegram bot integration
- Personality and emotion-aware responses
- Rate limiting and group chat support
- Memory integration for conversations

#### **MCP Server Extension**

- Exposes SYMindX framework as MCP server
- Agent state, memory, emotion access
- Tool execution and system diagnostics
- Server-sent events support

#### **Communication Extension**

- Advanced context management
- Expression engine with personality integration
- Style adaptation and compression
- Emotion-aware communication

### **Adding Custom Extensions**

Create new extensions without modifying core code:

```typescript
// 1. Create extension directory
src/extensions/my-extension/
├── package.json    # Include symindx.extension config
├── index.ts        # Implement Extension interface + factory
└── types.ts        # Extension-specific types

// 2. Configure auto-discovery
{
  "symindx": {
    "extension": {
      "type": "my-extension",
      "factory": "createMyExtension", 
      "autoRegister": true
    }
  }
}

// 3. System automatically discovers and loads!
```

Extensions can be built-in, npm packages, or local directories.

## 🔧 Core Modules

### Memory Providers

```typescript
// SQLite (default) - Local development
const memory = createMemoryProvider('sqlite', {
  databasePath: './data/memories.db'
});

// PostgreSQL - Production deployments
const memory = createMemoryProvider('postgres', {
  connectionString: process.env.POSTGRES_CONNECTION_STRING
});

// Supabase - Managed hosting with vector search
const memory = createMemoryProvider('supabase', {
  url: process.env.SUPABASE_URL,
  anonKey: process.env.SUPABASE_ANON_KEY
});

// Neon - Serverless PostgreSQL
const memory = createMemoryProvider('neon', {
  connectionString: process.env.NEON_DATABASE_URL
});
```

### Cognition Modules

```typescript
// Hybrid (default) - combines planning and reactive
const cognition = createCognitionModule('hybrid', {
  planningWeight: 0.6,
  reactiveWeight: 0.4
});

// Pure reactive for faster responses
const cognition = createCognitionModule('reactive', {
  reactionThreshold: 0.8
});

// HTN Planner - Hierarchical task networks
const cognition = createCognitionModule('htn_planner', {
  maxDepth: 5,
  planningTimeout: 30000
});

// Theory of Mind - Understanding other agents
const cognition = createCognitionModule('theory_of_mind', {
  empathyLevel: 0.7,
  mentalModelDepth: 3
});
```

## 💬 Chat System

### CLI Chat

```bash
# Interactive CLI with NyX
bun cli

# Specific CLI commands
bun cli:dashboard    # Dashboard view
bun cli:agents       # Agent management
bun cli:status       # System status
```

### API Chat

```bash
# Send message via API
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello!", "agentId": "nyx"}'
```

### WebSocket

```javascript
const ws = new WebSocket('ws://localhost:8000/ws');

ws.on('message', (data) => {
  const event = JSON.parse(data);
  if (event.type === 'agent_message') {
    console.log(`${event.agent}: ${event.content}`);
  }
});
```

### Telegram Integration

```bash
# Setup Telegram bot
export TELEGRAM_BOT_TOKEN="your-bot-token"
bun start

# Bot responds to messages with personality and emotion
```

## 🎮 Game Integration

SYMindX is designed to integrate with games like RuneScape:

```typescript
// RuneLite integration example
{
  "extensions": [{
    "name": "runelite",
    "enabled": true,
    "config": {
      "port": 8080,
      "events": ["player_message", "npc_interaction"]
    }
  }]
}
```

Agents will respond to in-game events, chat messages, and player actions with reactive design.
The extension supports event filtering via the `events` array and includes actions like `broadcastMessage`, `moveTo`, and `farmResource` for chat, movement, and resource gathering.

## 📊 API Reference

### REST Endpoints

```info
GET  /api/agents              # List agents
POST /api/chat                # Send message
GET  /api/agents/:id          # Agent details
GET  /api/agents/:id/emotion  # Current emotional state
GET  /api/agents/:id/memory   # Recent memories
GET  /api/system/status       # System status
GET  /api/system/health       # Health check
```

### TypeScript SDK

```typescript
import { SYMindX } from './mind-agents/src/api.js';

// Create agent with specific modules
const agent = SYMindX.createAgent({
  character: 'nyx',
  memory: SYMindX.createMemory('sqlite'),
  emotion: SYMindX.createEmotion('composite'),
  cognition: SYMindX.createCognition('hybrid')
});

// Send message
const response = await agent.chat("Hello!");
console.log(response.content); // Agent response
console.log(response.emotion); // Current emotional state
```

### Environment Variables

```bash
# Memory providers
SQLITE_DB_PATH=./data/memories.db
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
NEON_DATABASE_URL=postgresql://user:pass@host/db
POSTGRES_CONNECTION_STRING=postgresql://user:pass@host/db

# AI Portals (at least one required)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GROQ_API_KEY=gsk_...
XAI_API_KEY=xai-...
GOOGLE_API_KEY=...

# Extensions (optional)
TELEGRAM_BOT_TOKEN=...
```

## 🧪 Testing & Quality Assurance

### Running Tests

```bash
# Run all tests
bun test

# Enhanced test runner with coverage
bun run test:enhanced

# Watch mode for development
bun run test:watch

# Full test suite with coverage reporting
bun run test:coverage

# Run specific test files
bun test emotion
bun test memory
bun test cognition

# Performance and integration tests
bun test integration
bun test performance
```

### Test Structure

```typescript
testing/
├── fixtures/           # Test data and configurations
├── performance-benchmarks/ # Performance testing
├── test-environments/  # Isolated test configs
└── tests/             # Integration tests

src/
├── core/              # Core system tests
│   ├── runtime.test.ts
│   ├── event-bus.test.ts
│   └── registry.test.ts
├── utils/             # Utility tests
│   ├── error-handler.test.ts
│   ├── performance-monitor.test.ts
│   └── integration.test.ts
└── modules/           # Module-specific tests
```

### 🏆 Quality & Production Systems

#### Enhanced Build Pipeline

```bash
# Multi-stage build with quality gates
bun run build:enhanced

# Stages: clean → typeCheck → lint → test → compile → optimize → validate
```

#### Performance Monitoring

- Real-time metrics collection
- System resource monitoring
- Performance alerts and thresholds
- Bottleneck detection and analysis

#### Error Handling & Recovery

- Automatic error recovery with retry logic
- Circuit breaker patterns for fault tolerance
- Comprehensive error categorization and reporting
- Debug utilities with memory profiling

#### Health Monitoring

- Continuous system health checks
- Service dependency monitoring
- Alert management with severity levels
- Health trend analysis and reporting

#### New Utility Systems

**Error Handling & Recovery**
- Automatic error recovery with retry logic and exponential backoff
- Circuit breaker patterns for fault tolerance
- Comprehensive error categorization (SYSTEM, NETWORK, VALIDATION, BUSINESS)
- Error severity levels (LOW, MEDIUM, HIGH, CRITICAL)

**Performance & Debug Utilities**
- Real-time performance monitoring with Prometheus-compatible metrics
- Memory profiling and leak detection
- Debug session management with conditional debugging
- Performance bottleneck detection and analysis

**Integration Testing**
- Cross-system integration test suite
- Memory and resource management testing
- Cascading failure handling verification
- System performance under load testing

## 🔍 Auto-Discovery Architecture

SYMindX features sophisticated auto-discovery systems that eliminate the need for manual registration:

### #### Extension Discovery

- **Built-in**: Scans `src/extensions/` for directories with package.json
- **Node Modules**: Finds npm packages with `symindx.extension` configuration  
- **Zero-Config**: Extensions auto-register without core file modifications

### #### Emotion Discovery  

- **Categories**: Organizes emotions into basic, complex, social, cognitive
- **Auto-Registration**: Emotions discovered via package.json configuration
- **Factory Functions**: Consistent `create[Emotion]Emotion` pattern
- **Extensible**: Add new emotions without touching framework code

### **Cognition Discovery**

- **Paradigms**: Reactive, HTN Planning, Hybrid, Unified, Theory of Mind
- **Modular Thinking**: Each paradigm optimized for different scenarios
- **Auto-Detection**: Cognition modules discovered and registered automatically  
- **Intelligent Selection**: Character configs specify which cognition system to use

### **Discovery Process**

1. **Scan**: System scans all discovery locations on startup
2. **Validate**: Checks for required package.json configurations
3. **Register**: Auto-registers components with `autoRegister: true`
4. **Load**: Components become available throughout the system

### #### Developer Benefits

- **No Core Changes**: Add functionality without modifying framework
- **Type Safety**: Full TypeScript support with proper interfaces
- **Consistent Patterns**: Follow established conventions
- **Hot-Swappable**: Modules can be added/removed dynamically

This architecture makes SYMindX truly extensible while maintaining clean separation between core framework and user code.

## 🤝 Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

### Development Guidelines

- Follow TypeScript strict mode
- Use auto-discovery patterns for new modules
- Maintain clean architecture principles
- Add comprehensive tests
- Update documentation

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

<div align="center">

## Build intelligent agents with reactive design, emotional intelligence, and modular architecture!

[Get Started](#-quick-start) • [Documentation](./mind-agents/docs/) • [CLI Guide](./mind-agents/docs/CLI_USER_GUIDE.md) • [API Reference](./mind-agents/docs/API_REFERENCE.md) • [Developer Guide](./mind-agents/docs/DEVELOPER_GUIDE.md) • [Extensions](#-extension-system) • [Emotions](#-emotion-system)

*SYMindX v1.0.0 | AI SDK v5 | TypeScript 5.8 | Node.js 18+ | Bun Runtime*

### 📚 Comprehensive Documentation Suite

- [API Reference](./mind-agents/docs/API_REFERENCE.md) - Complete API documentation
- [Developer Guide](./mind-agents/docs/DEVELOPER_GUIDE.md) - Extension and module development
- [Character Guide](./mind-agents/docs/CHARACTER_GUIDE.md) - Character creation and configuration
- [Deployment Guide](./mind-agents/docs/DEPLOYMENT_GUIDE.md) - Production deployment
- [Emotion System](./mind-agents/docs/EMOTION_SYSTEM.md) - Comprehensive emotion documentation
- [Troubleshooting](./mind-agents/docs/TROUBLESHOOTING.md) - Common issues and solutions

### 🚀 Production-Ready Features

- Comprehensive testing framework with 95% coverage
- Advanced error handling with automatic recovery
- Performance monitoring and health checks
- Security audit with vulnerability assessments
- Enhanced build pipeline with quality gates
- Complete documentation for all components

</div>
