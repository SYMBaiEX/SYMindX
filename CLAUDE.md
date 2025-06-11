# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Project Structure
SYMindX is a monorepo with two main components:
- `mind-agents/` - Core agent runtime system (TypeScript)
- `website/` - React web interface (TypeScript + Vite)

### Root Level Commands
```bash
# Development (runs both components)
bun dev                # Starts both website and agent system
bun dev:website        # Website only (Vite dev server)
bun dev:agent          # Agent system only (TypeScript watch mode)

# Building
bun build              # Build both components
bun build:website      # Build website for production
bun build:agent        # Compile agent TypeScript to dist/

# Production
bun start              # Start agent system only
bun start:all          # Start both components
bun test               # Run agent system tests
```

### Mind-Agents Specific Commands
```bash
cd mind-agents
npm run build          # Compile TypeScript (uses --skipLibCheck)
npm run start          # Run compiled application from dist/
npm run dev            # Watch mode: compile & run with hot reload
npm test               # Run Jest tests
```

### Website Specific Commands
```bash
cd website
bun dev                # Vite development server
bun build              # Build for production (TypeScript + Vite)
bun preview            # Preview production build
```

## Architecture Overview

SYMindX is a modular AI agent runtime with a plugin-based architecture:

```
SYMindX Runtime (mind-agents/)
├── Core Runtime (src/core/)
│   ├── SYMindXRuntime - Main orchestrator
│   ├── ModuleRegistry - Type-safe plugin management
│   ├── EventBus - Inter-component communication
│   └── PluginLoader - Dynamic plugin loading
├── Modules (src/modules/)
│   ├── Memory - SQLite, Supabase, Neon providers
│   ├── Emotion - RuneScape-style emotion stack
│   ├── Cognition - HTN planner, reactive systems
│   └── Tools - Agent action implementations
├── Extensions (src/extensions/)
│   ├── API - HTTP/WebSocket server
│   ├── Slack - Chat integration
│   ├── RuneLite - Game automation
│   ├── Twitter - Social media posting
│   ├── Telegram - Messaging platform
│   └── MCP - Model Context Protocol client
├── Portals (src/portals/)
│   └── AI Providers - OpenAI, Anthropic, Groq, xAI, etc.
└── Characters (src/characters/)
    └── Agent definitions (nyx.json, etc.)

Web Interface (website/)
├── Components (src/components/)
│   ├── Agent Controls - Start/stop agents
│   ├── Thought Streams - Live agent inner monologue
│   ├── Emotion Graphs - Real-time emotion visualization
│   └── Stream Canvas - OBS integration
└── Real-time Dashboard - WebSocket connection to agents
```

## Key Development Patterns

### Module Factory Pattern
All modules use factory functions for type-safe instantiation:
```typescript
// Memory providers
createMemoryProvider(type: 'sqlite' | 'supabase' | 'neon', config)

// Emotion modules  
createEmotionModule(type: 'rune-emotion-stack', config)

// Cognition modules
createCognitionModule(type: 'htn-planner' | 'reactive', config)
```

### Plugin Registration
Plugins auto-register via registry patterns:
- `registerExtensions(registry, config)` - Extensions
- `registerCoreModules(registry)` - Memory/Emotion/Cognition
- `registerPortals(registry)` - AI providers

### Configuration System
- Runtime config: `config/runtime.json` (copy from `runtime.example.json`)
- Character configs: `mind-agents/src/characters/*.json`
- Environment variables for API keys (see config/README.md)

### Agent Lifecycle
1. Runtime loads configuration and registers all plugins
2. Agents initialize from character JSON files
3. Each agent gets memory, emotion, and cognition modules
4. Extensions initialize per-agent with their own configs
5. Runtime starts tick loop calling `agent.tick()` and `extension.tick()`

## Technical Details

### TypeScript Configuration
- Both projects use ES modules (`"type": "module"`)
- Mind-agents builds with `--skipLibCheck` flag
- Path alias `@/*` maps to `./src/*` in mind-agents
- Jest configured for ES modules with module name mapping

### Dependencies
- **Runtime**: Bun (preferred) or Node.js 18+
- **AI SDKs**: @ai-sdk/anthropic, @ai-sdk/openai, @ai-sdk/groq
- **Database**: sqlite3, @supabase/supabase-js, pg
- **Web**: React, Vite, Tailwind CSS, shadcn/ui components
- **Communication**: @slack/bolt, ws, puppeteer, telegraf

### Error Handling
- Uses `Result<T>` types from `src/types/enums.ts`
- Plugins fail gracefully with logging
- Runtime continues even if individual plugins fail
- All async operations wrapped in try/catch

### Testing
- Jest with ts-jest preset for ES modules
- Tests use `.test.ts` extension
- Located alongside source files or in `__tests__/` directories
- Run with `bun test` from root or `npm test` from mind-agents/

## Environment Variables

Required for full functionality:
```bash
# Memory providers
SQLITE_DB_PATH=./data/memories.db
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
NEON_DATABASE_URL=...

# AI Portals (at least one required)
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
GROQ_API_KEY=...
XAI_API_KEY=...

# Extensions (optional)
SLACK_BOT_TOKEN=...
RUNELITE_PLUGIN_PORT=8080
TWITTER_USERNAME=...
TWITTER_PASSWORD=...
TELEGRAM_BOT_TOKEN=...
```

## Development Workflow

1. **Setup**: Copy `config/runtime.example.json` to `config/runtime.json`
2. **Configure**: Add API keys to runtime.json or environment variables
3. **Install**: Run `bun install` from repository root
4. **Develop**: Use `bun dev` to start both components
5. **Test**: Use `bun test` to run the test suite
6. **Build**: Use `bun build` for production builds

The system is designed for rapid development with hot reload, comprehensive logging, and modular architecture that allows easy extension and customization.