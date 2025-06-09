# 🧠 SYMindX

> **A modular, agent-based AI runtime designed to simulate intelligent, emotionally reactive characters that can operate autonomously in games, on the web, and across social platforms.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Bun](https://img.shields.io/badge/Bun-000000?logo=bun&logoColor=white)](https://bun.sh/)

## 🎯 Overview

SYMindX is a cutting-edge AI agent runtime that brings characters like `NyX` and `bobalou777` to life. Each agent is:

- **🧩 Modular**: Composable memory, emotion, and cognition systems
- **🎭 Emotionally Reactive**: RuneScape-inspired emotion stack (focused, frustrated, excited)
- **🧠 Memory-Driven**: Dynamic memory with Supabase (pgvector) + SQLite fallback
- **🔄 Autonomous**: Runs independent thought/emotion/action loops
- **🌐 Multi-Platform**: Operates across games, web, Slack, and social platforms

## 🏗️ Architecture

```
UI (Web/Slack/OBS) ─────────────────────────────────────────────────────────────┐
                                                                                 │
                        Agent Runtime Loop (Core Layer)                          │
                                                                                 │
│───────────────────────────────────────────────────────────────────────────────│
│ Agent Loader          ▸ Loads characters and extensions                        │
│ Event Bus             ▸ Listens to all incoming events (Slack, game, time)     │
│ Agent Loop            ▸ Thinks, plans, recalls memory, acts per tick           │
│ Registry              ▸ Centralized access to all modules                      │
│───────────────────────────────────────────────────────────────────────────────│
                                                                                 │
                     ↓                         ↓                                 │
        Memory Modules             Emotion Modules               Cognition Modules
     (SQLite or Supabase)     (RuneScape emotions stack)       (HTN, RAG, Inner Voice)
                                                                                 │
                     ↓                         ↓                                 │
                        Extension Layer (Modular Plugins)                        │
          ┌────────────┬────────────┬────────────┬────────────┐                 │
          │ RuneLite   │ Slack      │ Twitter    │ Direct API │                 │
          └────────────┴────────────┴────────────┴────────────┘                 │
```

## 📁 Project Structure

```
symindx/
├── 🌐 website/          # React + Vite + Tailwind UI
│   ├── src/
│   │   ├── components/   # Agent controls, thought streams
│   │   ├── lib/          # Utilities and hooks
│   │   └── App.tsx       # Main application
│   └── package.json
├── 🤖 mind-agents/       # Core agent runtime system
│   ├── src/
│   │   ├── characters/   # Agent character definitions
│   │   ├── core/         # Agent runtime loop
│   │   ├── extensions/   # RuneLite, Slack, Twitter, API
│   │   ├── modules/      # Memory, Emotion, Cognition
│   │   ├── portals/      # External integrations
│   │   └── types/        # TypeScript definitions
│   └── package.json
├── 📋 config/            # Runtime configuration
└── 📚 docs/              # Architecture and migration docs
```

## 🚀 Quick Start

### Prerequisites

- **[Bun](https://bun.sh/)** (recommended) or Node.js 18+
- **Git** for version control
- **Optional**: Supabase account for cloud memory storage

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/SYMindX.git
cd SYMindX

# Install dependencies
bun install

# Configure environment variables
cp .env.example .env
# Edit .env with your API keys and configuration
```

### Development

```bash
# Run both website and agent system
bun dev

# Or run components separately:
bun dev:website  # React UI only
bun dev:agent    # Agent runtime only
```

### Building & Production

```bash
# Build all components
bun build

# Start in production mode
bun start:all    # Both components
bun start        # Agent system only
```

## 🎭 Key Features

### 🤖 Agent System
- **Character Sheets**: JSON-based agent definitions in `/characters/`
- **Emotion Stack**: RuneScape-style emotions affecting behavior
- **Memory System**: RAG-powered memory with pgvector search
- **HTN Planning**: Hierarchical Task Networks for decision making

### 🔌 Extensions
- **🎮 RuneLite**: Direct game integration and automation
- **💬 Slack**: Chat, approvals, and live agent interaction
- **🐦 Twitter**: Social media posting via Puppeteer (no API required)
- **🔗 Direct API**: HTTP/CLI access to agent commands

### 🖥️ Web Interface
- **Real-time Thought Streams**: Live agent inner monologue
- **Emotion Visualization**: Dynamic emotion state charts
- **Agent Controls**: Start/stop, configure, and monitor agents
- **OBS Integration**: Embedded stream canvas for live streaming

### 💾 Storage Options
- **Supabase**: Cloud-based with pgvector for semantic search
- **SQLite**: Local development and offline operation
- **Redis**: Optional caching layer for performance

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React + Vite + Tailwind CSS + shadcn/ui |
| **Runtime** | Bun + TypeScript + Node.js |
| **Memory** | Supabase (pgvector) + SQLite |
| **AI** | OpenAI SDK + Vercel AI SDK |
| **Streaming** | WebSocket + OBS/MJPEG |
| **Deployment** | Vercel + Railway + Docker |

## 📖 Documentation

- **[Architecture Guide](./docs/ARCHITECTURE.md)** - System design and patterns
- **[Migration Guide](./docs/MIGRATION.md)** - Upgrading to modular architecture
- **[MCP Integration](./docs/MCP_AND_API_INTEGRATION.md)** - External API connections
- **[PRD](./PRD.md)** - Complete product requirements and design
- **[Configuration](./config/README.md)** - Runtime configuration options

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Install dependencies with `bun install` (run from the repo root)
4. Run the test suite with `bun test`
5. Commit changes: `git commit -m 'Add amazing feature'`
6. Push to branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by RuneScape's emotion system
- Built with modern web technologies
- Designed for the AI agent community

---

**Ready to bring your AI agents to life? Start with `bun dev` and watch the magic happen! ✨**