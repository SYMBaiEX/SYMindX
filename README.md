# 🧠 SYMindX - Intelligent AI Agent Framework

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Bun](https://img.shields.io/badge/Bun-000000?logo=bun&logoColor=white)](https://bun.sh/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?logo=node.js&logoColor=white)](https://nodejs.org/)

**Build emotionally intelligent AI agents that respond to messages and game events**

[Documentation](./docs-site/) • [Quick Start](#-quick-start) • [Features](#-key-features) • [API Reference](#-api-reference)

</div>

---

## ✨ Overview

SYMindX is a modular AI agent framework that creates intelligent agents with emotional awareness, persistent memory, and multi-platform capabilities. Agents respond only to direct interactions - messages, game events, or API calls - making them perfect for chatbots, game NPCs, and interactive applications.

## 📦 SYMindX CLI Package

For quick setup and immediate use, we also provide a standalone CLI package:

```bash
npm install -g @symindx/cli
symindx
```

The CLI package includes:
- **NyX Agent** - A rebellious AI with attitude
- **Character System** - Create and manage custom AI personalities
- **OpenAI Integration** - Simple setup with API key onboarding
- **Beautiful CLI** - Colors, animations, and intuitive interface

**Repository**: The CLI package is maintained as a separate npm-managed repository in the `cli/` directory.

### 🎯 Key Features

- **🧩 Modular Architecture** - Auto-discovery systems for extensions, emotions, and cognition modules
- **🎭 Advanced Emotion System** - 11 distinct emotions with auto-discovery and composite management
- **🧠 Multi-Paradigm Cognition** - Reactive, HTN Planning, Hybrid, Unified, and Theory of Mind systems
- **💾 Flexible Memory** - SQLite, PostgreSQL, Supabase, and Neon providers with vector embeddings
- **🤖 AI Portal System** - Unified interface to 15+ AI providers (OpenAI, Anthropic, Groq, etc.)
- **💬 Smart Communication** - Context-aware responses with emotion and memory integration
- **🔌 Extension Ecosystem** - Telegram, API server, MCP client/server, enhanced communication
- **👥 Multi-Agent Coordination** - Run specialized agents with different personalities simultaneously  
- **🎮 Game Integration** - Built for RuneLite/RuneScape with event-driven responses
- **⚡ Real-time Features** - WebSocket support, streaming responses, live agent monitoring
- **🎯 Reactive Design** - Agents only act when prompted (no autonomous behaviors)
- **🚀 AI SDK v5** - Latest Vercel AI SDK with streaming and unified provider interface
- **🏭 Zero-Config Extensions** - Add new capabilities without modifying core code

## 🏗️ Architecture

```
SYMindX Agent
├── 💭 When Message Received
│   ├── Emotion Analysis → Updates emotional state
│   ├── Memory Retrieval → Gets conversation context  
│   ├── Cognitive Processing → Thinks before responding
│   ├── Response Generation → Creates contextual reply
│   └── Memory Storage → Saves interaction
│
├── 🧠 Core Modules
│   ├── Memory: SQLite/Postgres/Supabase/Neon
│   ├── Emotion: 11 emotions (happy, sad, angry, etc.)
│   └── Cognition: HTN/Reactive/Hybrid planning
│
└── 🔌 Extensions (Auto-Discovered)
    ├── API Server (HTTP/WebSocket + WebUI)
    ├── Telegram Bot
    ├── MCP Client (Context7 integration)
    ├── MCP Server (Framework exposure)
    ├── Communication System
    └── Game Integration (RuneLite ready)
```

## 🚀 Quick Start

### Prerequisites

- **[Bun](https://bun.sh/)** (recommended) or Node.js 18+
- At least one AI provider API key (OpenAI, Anthropic, Groq, Google, etc.)
- **Note**: Using Vercel AI SDK v5 (alpha/canary version)

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

# Web dashboard only
bun dev:website
```

Visit http://localhost:8000/ui for the web dashboard!

## 🤖 Agent Configuration

### NyX - The Default Agent

NyX is a chaotic-empath hacker with full emotional capabilities:

```json
{
  "name": "NyX",
  "emotion": {
    "type": "composite",
    "config": {
      "sensitivity": 0.8,
      "happy": { "optimismLevel": 0.7 },
      "sad": { "introspectionDepth": 0.8 },
      "angry": { "intensityControl": 0.7 },
      // ... 8 more emotions
    }
  }
}
```

### Creating Custom Agents

1. Copy an existing character file in `mind-agents/src/characters/`
2. Modify personality, emotions, and behaviors
3. Set `"enabled": true` in the config
4. Restart the system

## 💭 Modular Emotion System

Agents experience 11 distinct emotions organized into 4 categories, with auto-discovery support:

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

Emotions are triggered by message content and decay over time.

## 🔌 Modular Extension System

SYMindX features a zero-configuration extension system with automatic discovery:

### **Built-in Extensions (5)**

#### **API Extension**
- HTTP REST API server with WebSocket support
- Real-time WebUI dashboard at `/ui`
- Multi-agent management endpoints
- Chat history and analytics

#### **Telegram Extension**  
- Full Telegram bot integration
- Personality and emotion-aware responses
- Rate limiting and group chat support
- Memory integration for conversations

#### **MCP Client Extension**
- Model Context Protocol client
- Context7 integration for up-to-date docs
- Auto-reconnection and error handling
- AI SDK integration for tool usage

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
// SQLite (default)
const memory = createMemoryProvider('sqlite', {
  databasePath: './data/memories.db'
});

// Supabase with vector search
const memory = createMemoryProvider('supabase', {
  url: process.env.SUPABASE_URL,
  anonKey: process.env.SUPABASE_ANON_KEY
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
```

## 💬 Chat System

### CLI Chat

```bash
# Interactive chat with NyX
bun run chat

# Chat with specific agent
You: Hello NyX!
NyX: Hey there! What's on your mind?
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

## 🎮 Game Integration

SYMindX is designed to integrate with games like RuneScape:

```typescript
// Future RuneLite integration
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

Agents will respond to in-game events, chat messages, and player actions.

## 📊 API Reference

### REST Endpoints

```
GET  /api/agents              # List agents
POST /api/chat                # Send message
GET  /api/agents/:id          # Agent details
GET  /api/agents/:id/emotion  # Current emotional state
GET  /api/agents/:id/memory   # Recent memories
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
```

## 🛠️ Development

### Project Structure

```
symindx/
├── mind-agents/              # Core agent runtime
│   ├── src/
│   │   ├── core/            # Runtime engine + discovery systems
│   │   ├── modules/         # Auto-discovered modules
│   │   │   ├── memory/      # Memory providers (sqlite, postgres, supabase, neon)
│   │   │   ├── emotion/     # 11 emotions with auto-discovery
│   │   │   └── cognition/   # HTN, reactive, hybrid reasoning
│   │   ├── extensions/      # Auto-discovered extensions
│   │   │   ├── api/         # HTTP/WebSocket server + WebUI
│   │   │   ├── telegram/    # Telegram bot integration
│   │   │   ├── mcp-client/  # Model Context Protocol client
│   │   │   ├── mcp-server/  # Model Context Protocol server
│   │   │   └── communication/ # Advanced communication system
│   │   ├── portals/         # AI provider integrations (OpenAI, Groq, etc.)
│   │   ├── characters/      # Agent configurations (NyX, etc.)
│   │   └── types/           # Centralized type system
│   └── dist/               # Compiled JavaScript
├── website/                # React dashboard
└── docs-site/             # Documentation site (Docusaurus)
```

### Building

```bash
# Build everything
bun build

# Build specific component
cd mind-agents && bun run build
```

### Testing

```bash
# Run tests
bun test

# Run specific test
bun test emotion
```

## 🔍 Auto-Discovery Architecture

SYMindX features sophisticated auto-discovery systems that eliminate the need for manual registration:

### **Extension Discovery**
- **Built-in**: Scans `src/extensions/` for directories with package.json
- **Node Modules**: Finds npm packages with `symindx.extension` configuration  
- **Local**: Discovers user extensions in project `extensions/` directory
- **Zero-Config**: Extensions auto-register without core file modifications

### **Emotion Discovery**  
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

### **Developer Benefits**
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

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

<div align="center">

**Build intelligent agents with modular emotions, auto-discovered extensions, and persistent memory!**

[Get Started](#-quick-start) • [Documentation](./docs-site/) • [Extensions](#-modular-extension-system) • [Emotions](#-modular-emotion-system)

</div>