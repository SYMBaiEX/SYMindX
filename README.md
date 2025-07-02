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

### 🎯 Key Features

- **🧩 Modular Architecture** - Hot-swappable modules for memory, emotion, and cognition
- **🎭 Composite Emotion System** - 11 distinct emotions that influence agent behavior
- **🧠 Advanced Memory** - SQLite, PostgreSQL, Supabase, and Neon support with embeddings
- **💬 Intelligent Chat** - Context-aware responses with emotion and memory integration  
- **🤖 Multi-Agent Support** - Run multiple specialized agents simultaneously
- **🔌 Platform Extensions** - Telegram, Slack, Discord, and API integrations
- **🎮 Game Ready** - Designed for RuneLite/RuneScape integration
- **⚡ WebSocket Support** - Real-time communication and updates
- **🎯 Reactive Design** - Agents only act when prompted (no autonomous behaviors)

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
└── 🔌 Extensions
    ├── API Server (HTTP/WebSocket)
    ├── Telegram Bot
    ├── Web Dashboard
    └── Game Integration (RuneLite ready)
```

## 🚀 Quick Start

### Prerequisites

- **[Bun](https://bun.sh/)** (recommended) or Node.js 18+
- At least one AI provider API key (OpenAI, Anthropic, or Groq)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/symindx.git
cd symindx

# Install dependencies
bun install

# Copy configuration
cp config/runtime.example.json config/runtime.json
```

### Configuration

Edit `config/runtime.json` with your API keys:

```json
{
  "portals": {
    "apiKeys": {
      "openai": "sk-...",
      "groq": "gsk_..."
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

## 💭 Emotion System

Agents experience 11 distinct emotions that affect their responses:

- **Happy** 😊 - Optimistic and energetic responses
- **Sad** 😢 - Introspective and empathetic
- **Angry** 😠 - Direct and assertive
- **Anxious** 😰 - Cautious and detailed
- **Confident** 💪 - Bold and decisive
- **Nostalgic** 🌅 - Reflective and story-driven
- **Empathetic** 🤗 - Supportive and understanding
- **Curious** 🔍 - Questioning and exploratory
- **Proud** 🏆 - Achievement-focused
- **Confused** 😕 - Seeking clarification
- **Neutral** 😐 - Balanced baseline

Emotions are triggered by message content and decay over time.

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
├── mind-agents/          # Core agent runtime
│   ├── src/
│   │   ├── core/        # Runtime engine
│   │   ├── modules/     # Memory, emotion, cognition
│   │   ├── extensions/  # Platform integrations
│   │   └── characters/  # Agent configurations
│   └── dist/           # Compiled JavaScript
├── website/            # React dashboard
└── config/            # Configuration files
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

**Build intelligent agents that feel emotions and remember conversations!**

[Get Started](#-quick-start) • [Documentation](./docs-site/) • [Examples](./mind-agents/src/characters/)

</div>