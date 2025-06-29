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

SYMindX is a clean, modular AI agent runtime with a type-safe plugin architecture:

```
SYMindX Runtime (mind-agents/)
├── 📁 src/
│   ├── 🔧 api.ts - Public API interface
│   ├── 🚀 index.ts - Main entry point
│   │
│   ├── 🏗️ core/ - Core Runtime System
│   │   ├── runtime.ts - Main orchestrator
│   │   ├── registry.ts - Type-safe module registry
│   │   ├── enhanced-event-bus.ts - Inter-component communication
│   │   └── plugin-loader.ts - Dynamic plugin loading
│   │
│   ├── 📚 types/ - Centralized Type System
│   │   ├── index.ts - Master type exports (ALL TYPES HERE)
│   │   ├── agent.ts - Agent and extension types
│   │   ├── common.ts - Shared types
│   │   └── [specialized type files]
│   │
│   ├── 🧩 modules/ - AI Module System
│   │   ├── index.ts - Module factory registry
│   │   ├── memory/ - SQLite, Supabase, Neon providers
│   │   ├── emotion/ - Emotion processing systems
│   │   ├── cognition/ - HTN planner, reactive systems
│   │   ├── autonomous/ - Self-learning capabilities
│   │   ├── consciousness/ - Advanced AI consciousness
│   │   └── [additional modules with consistent patterns]
│   │
│   ├── 🔌 extensions/ - Extension System
│   │   ├── api/ - HTTP/WebSocket server
│   │   ├── slack/ - Chat integration
│   │   ├── twitter/ - Social media
│   │   └── [platform integrations]
│   │
│   ├── 🌐 portals/ - AI Provider Integrations
│   │   ├── openai/ - OpenAI integration
│   │   ├── anthropic/ - Anthropic integration
│   │   └── [AI service providers]
│   │
│   ├── 🛡️ security/ - Security & Compliance
│   │   ├── auth/ - Authentication systems
│   │   ├── rbac/ - Role-based access control
│   │   └── compliance/ - GDPR, HIPAA, SOX
│   │
│   └── 🛠️ utils/ - Utilities & Helpers
│       ├── logger.ts - Structured logging
│       └── [helper functions]
│
└── 👤 characters/ - Agent Definitions
    └── [agent.json configurations]

Web Interface (website/)
├── Components - React dashboard
├── Real-time Visualization - Agent monitoring
└── WebSocket Integration - Live updates
```

## Key Development Patterns

### Clean Architecture Principles (NEW)
SYMindX now follows clean architecture patterns:

1. **Centralized Type System**: All types are exported from `src/types/index.ts`
2. **Factory Pattern Consistency**: All modules use the same factory pattern
3. **Barrel Exports**: Clean module exports through index.ts files
4. **Type Safety**: Strong typing throughout with minimal 'any' usage
5. **Public API**: Clean public interface through `src/api.ts`

### Module Factory Pattern
All modules use factory functions for type-safe instantiation:
```typescript
// Import from centralized API
import { SYMindX } from './src/api.js';

// Or use individual factories
import { createMemoryProvider, createEmotionModule, createCognitionModule } from './src/modules/index.js';

// Memory providers
createMemoryProvider('sqlite', config)
createMemoryProvider('supabase', config)
createMemoryProvider('neon', config)

// Emotion modules  
createEmotionModule('rune_emotion_stack', config)

// Cognition modules
createCognitionModule('htn_planner', config)
createCognitionModule('reactive', config)

// Quick access via SYMindX namespace
const memory = SYMindX.createMemory('sqlite', config);
const emotion = SYMindX.createEmotion('rune_emotion_stack', config);
const cognition = SYMindX.createCognition('htn_planner', config);
```

### Type-Safe Development
```typescript
// All types available from single import
import type { Agent, AgentConfig, MemoryRecord, EmotionState } from './src/types/index.js';

// Or use the centralized type export
import type * as SYMindXTypes from './src/types/index.js';
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

## Core Development Concepts

### Character System
- Characters defined in `mind-agents/src/characters/*.json` with personality, psyche, and module defaults
- Example: `nyx.json` defines NyX agent with "chaotic-empath hacker" tone
- Each character specifies default memory provider, emotion module, cognition module, and AI portal

### Module Factory System
The architecture uses factory functions that return type-safe module instances:
- Memory providers auto-detect available databases and fallback gracefully
- Emotion modules can be swapped (currently supports RuneScape-style emotion stack)
- Cognition modules support HTN planning, reactive systems, and hybrid approaches
- All modules implement standardized interfaces for hot-swappability

### Plugin Development
- Extensions in `src/extensions/` implement the `Extension` interface with `init()` and `tick()` methods
- Skills are modular capabilities within extensions (e.g., `messaging.ts`, `combat.ts`)
- Each extension has its own configuration and can fail independently without affecting other plugins
- Plugin registration happens automatically via `register*` functions

### WebSocket Integration
- Website connects to agent runtime via WebSocket for real-time updates
- Thought streams, emotion changes, and agent actions broadcast live
- Agent controls (start/stop) and configuration changes sent from web UI

The system is designed for rapid development with hot reload, comprehensive logging, and modular architecture that allows easy extension and customization.