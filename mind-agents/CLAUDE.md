# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with the SYMindX AI Agent Framework.

## Quick Start Commands

### Development & Building
```bash
npm run build      # Compile TypeScript to dist/
npm run start      # Run the compiled application
npm run dev        # Watch mode: compile & run with hot reload
npm test           # Run Jest tests
```

### Agent Interaction
```bash
# CLI Interface
node dist/cli/index.js interactive        # Interactive CLI mode
node dist/cli/index.js chat start nyx     # Chat with Nyx agent
node dist/cli/index.js agent list -v      # List all agents (verbose)
node dist/cli/index.js monitor all        # Monitor system

# Web Interface  
npm start                                  # Start server
# Then visit: http://localhost:3001/ui
```

## Architecture Overview

SYMindX is a comprehensive autonomous AI agent framework with advanced capabilities:

```
SYMindX Framework
├── 🤖 Autonomous Agents (living digital beings)
│   ├── Independent decision-making and goal pursuit
│   ├── Continuous life simulation with daily routines
│   ├── Personality-driven behaviors and growth
│   └── Ethical constraint system with safety controls
├── 💬 Human Interaction (CLI + Web + API)
│   ├── Real-time chat and command interfaces  
│   ├── WebSocket-based live communication
│   ├── Agent management and monitoring
│   └── Task delegation and collaboration
├── 🧠 Core Intelligence Systems
│   ├── Memory (SQLite, Supabase, Neon with emotional weighting)
│   ├── Emotion (Rune Emotion Stack with full spectrum)
│   ├── Cognition (HTN Planner, Reactive, Hybrid with metacognition)
│   └── Decision Making (Multi-criteria with ethical evaluation)
├── 🔌 Extensions & Integrations
│   ├── API Server (REST + WebSocket + WebUI)
│   ├── Portal Connections (OpenAI, Anthropic, Groq, etc.)
│   └── Extensible plugin architecture
└── 🛡️ Enterprise Features
    ├── Comprehensive monitoring and observability
    ├── State persistence and recovery
    ├── Resource management and scaling
    └── Security and ethical governance
```

## Key Components

### Runtime System
- `src/core/runtime.ts` - Main runtime class managing all plugins
- `src/core/registry.ts` - Central module registry with type-safe retrieval
- `src/core/plugin-loader.ts` - Dynamic plugin loading system
- `src/index.ts` - Application entry point with configuration

### Module Architecture
All modules follow factory patterns:
- **Memory**: `createMemoryProvider(type, config)` in `src/modules/memory/providers/`
- **Emotion**: `createEmotionModule(type, config)` in `src/modules/emotion/`  
- **Cognition**: `createCognitionModule(type, config)` in `src/modules/cognition/`

### Extensions
Located in `src/extensions/`, each implements the `Extension` interface:
- Must have `id`, `name`, `version`, `enabled`, `config` properties
- Implement `init(agent)` and `tick(agent)` methods
- Define `actions` and `events` for agent interaction

### Environment Configuration
Required environment variables by module:
```bash
# Memory providers
SQLITE_DB_PATH=./data/memories.db
SUPABASE_URL=...
NEON_DATABASE_URL=...

# AI Portals
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
GROQ_API_KEY=...

# Extensions
SLACK_BOT_TOKEN=...
RUNELITE_PLUGIN_PORT=8080
TWITTER_USERNAME=...
```

## Development Patterns

### Plugin Registration
All plugins auto-register via their respective `register*` functions:
- Extensions: `registerExtensions(registry, config)`
- Memory: `registerCoreModules()` 
- Portals: `registerPortals()`

### Agent Lifecycle
1. Runtime initializes and registers all plugins
2. Agents load from character configs in `src/characters/`
3. Each agent gets assigned memory, emotion, and cognition modules
4. Extensions are initialized per-agent
5. Runtime starts tick loop calling `agent.tick()` and `extension.tick()`

### Error Handling
- Plugins fail gracefully with logging when configs missing
- Runtime continues even if individual plugins fail to load
- All async operations have try/catch blocks
- Use `Result<T>` types from `src/types/enums.ts` for consistent error handling

## Testing
- Jest configured for ES modules with ts-jest preset
- Test files use `.test.ts` extension
- Module name mapping handles `.js` imports in TypeScript
- Tests located alongside source files or in `__tests__/` directories