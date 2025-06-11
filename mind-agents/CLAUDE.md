# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Building and Running
```bash
npm run build      # Compile TypeScript to dist/
npm run start      # Run the compiled application
npm run dev        # Watch mode: compile & run with hot reload
npm test           # Run Jest tests
```

### Important Build Notes
- Uses TypeScript with ES modules (`"type": "module"`)
- Build skips lib check with `--skipLibCheck` flag
- Output goes to `dist/` directory
- Path alias `@/*` maps to `./src/*`

## Architecture Overview

SYMindX is a modular AI agent system with a plugin-style architecture:

```
SYMindX Runtime
├── Module Registry (centralized plugin management)
├── Event Bus (inter-component communication)
├── Memory Providers (SQLite, Supabase, Neon, In-Memory)
├── Emotion Modules (Rune Emotion Stack, custom emotions)
├── Cognition Modules (HTN Planner, Reactive, Hybrid)
├── Extensions (Slack, RuneLite, Twitter, Telegram, MCP)
└── Portals (OpenAI, Anthropic, Groq, xAI, OpenRouter, Kluster.ai)
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