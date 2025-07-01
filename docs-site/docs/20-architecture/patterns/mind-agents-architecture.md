# SYMindX Plugin Architecture

This document outlines the modular plugin architecture of SYMindX and the current integration status.

## Architecture Overview

SYMindX follows a modular plugin-style architecture with the following layers:

```
┌─────────────────────────────────────────────────────────────┐
│                    SYMindX Runtime                         │
├─────────────────────────────────────────────────────────────┤
│                  Module Registry                           │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┐  │
│  │   Memory    │  Emotion    │ Cognition   │ Extensions  │  │
│  │ Providers   │  Modules    │  Modules    │             │  │
│  └─────────────┴─────────────┴─────────────┴─────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                    Event Bus                               │
└─────────────────────────────────────────────────────────────┘
```

## Core Modules

### Memory Providers
Location: `src/modules/memory/providers/`

**Available Providers:**
- ✅ **In-Memory**: Basic memory storage (non-persistent)
- ✅ **SQLite**: Local database with fixed TypeScript integration
- ✅ **Supabase**: Cloud database with pgvector support
- ✅ **Neon**: Serverless Postgres with pgvector support

**Integration Status:** ✅ **Fully Integrated**
- Auto-registration via `registerCoreModules()`
- Plugin-style factory pattern with `createMemoryProvider()`
- Proper error handling and fallbacks
- Type-safe configuration

### Emotion Modules
Location: `src/modules/emotion/`

**Available Modules:**
- ✅ **Rune Emotion Stack**: RuneScape-inspired emotion system
- ✅ **Base Emotion Module**: Abstract base for custom emotions

**Integration Status:** ✅ **Fully Integrated**
- Auto-registration via `registerCoreModules()`
- Plugin-style factory pattern with `createEmotionModule()`
- Configurable sensitivity and decay rates

### Cognition Modules
Location: `src/modules/cognition/`

**Available Modules:**
- ✅ **HTN Planner**: Hierarchical Task Network planning
- ✅ **Reactive**: Simple reactive behavior system
- ✅ **Hybrid**: Combined planning and reactive system

**Integration Status:** ✅ **Fully Integrated**
- Auto-registration via `registerCoreModules()`
- Plugin-style factory pattern with `createCognitionModule()`
- Memory integration for context-aware planning

## Extensions

### Extension Architecture
Location: `src/extensions/`

All extensions implement the `Extension` interface:

```typescript
interface Extension {
  id: string
  name: string
  version: string
  enabled: boolean
  config: Record<string, any>
  init(agent: Agent): Promise<void>
  tick(agent: Agent): Promise<void>
  actions: Record<string, ExtensionAction>
  events: Record<string, ExtensionEventHandler>
}
```

**Available Extensions:**
- ✅ **Slack**: Complete Slack integration with approval workflows
- ✅ **RuneLite**: RuneScape game automation via WebSocket
- ✅ **Twitter**: Social media posting via browser automation

**Integration Status:** ✅ **Fully Integrated**
- Auto-registration via `registerExtensions()`
- Environment variable configuration
- Graceful error handling for missing configs
- Plugin-style loading with proper isolation

## Portals (AI Providers)

Location: `src/portals/`

**Available Portals:**
- ✅ **OpenAI**: GPT models integration
- ✅ **Anthropic**: Claude models integration
- ✅ **Groq**: Fast inference integration
- ✅ **xAI**: Grok models integration
- ✅ **OpenRouter**: Multi-provider routing
- ✅ **Kluster.ai**: Specialized AI services

**Integration Status:** ✅ **Fully Integrated**
- Auto-registration via `registerPortals()`
- API key management from environment
- Fallback handling for missing providers

## Runtime Integration

### Initialization Flow

1. **Runtime Startup** (`src/core/runtime.ts`)
   ```typescript
   async start() {
     await this.registerCoreModules()  // Memory, Emotion, Cognition
     await this.loadPortals()          // AI Providers
     await this.loadExtensions()       // External Integrations
     // Start agent tick loop
   }
   ```

2. **Module Registry** (`SYMindXModuleRegistry`)
   - Centralized registration of all plugins
   - Type-safe retrieval methods
   - Automatic logging of registrations

3. **Agent Loading**
   - Agents specify required modules in character config
   - Runtime resolves and injects dependencies
   - Extensions are initialized per-agent

### Configuration Management

**Environment Variables:**
```bash
# Memory
SQLITE_DB_PATH=./data/memories.db
SUPABASE_URL=...
NEON_DATABASE_URL=...

# Extensions
SLACK_BOT_TOKEN=...
RUNELITE_PLUGIN_PORT=8080
TWITTER_USERNAME=...

# Portals
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
```

**Runtime Config** (`config/runtime.json`):
```json
{
  "tickInterval": 1000,
  "extensions": {
    "autoLoad": true,
    "paths": ["./extensions"]
  },
  "portals": {
    "autoLoad": true,
    "paths": ["./portals"]
  }
}
```

## Plugin Development

### Creating a New Extension

1. **Create Extension Directory**
   ```
   src/extensions/my-extension/
   ├── index.ts          # Main extension class
   ├── types.ts          # TypeScript definitions
   └── skills/           # Extension capabilities
       └── index.ts
   ```

2. **Implement Extension Interface**
   ```typescript
   export class MyExtension implements Extension {
     id = 'my-extension'
     name = 'My Extension'
     version = '1.0.0'
     enabled = true
     config: MyConfig
     actions = {}
     events = {}
     
     async init(agent: Agent): Promise<void> {
       // Initialize extension for agent
     }
     
     async tick(agent: Agent): Promise<void> {
       // Called every runtime tick
     }
   }
   ```

3. **Register in Extensions Index**
   ```typescript
   // src/extensions/index.ts
   import { MyExtension } from './my-extension/index.js'
   
   export async function registerExtensions(registry, config) {
     if (config.myExtension) {
       const ext = new MyExtension(config.myExtension)
       registry.registerExtension('my-extension', ext)
     }
   }
   ```

### Creating a New Memory Provider

1. **Implement BaseMemoryProvider**
   ```typescript
   export class MyMemoryProvider extends BaseMemoryProvider {
     async store(memory: MemoryRecord): Promise<void> {
       // Store memory implementation
     }
     
     async retrieve(query: string, limit?: number): Promise<MemoryRecord[]> {
       // Retrieve memories implementation
     }
   }
   ```

2. **Register in Memory Providers**
   ```typescript
   // src/modules/memory/providers/index.ts
   export function createMemoryProvider(type, config) {
     switch (type) {
       case 'my-provider':
         return new MyMemoryProvider(config)
       // ...
     }
   }
   ```

## Current Status Summary

| Component | Status | Integration | Notes |
|-----------|--------|-------------|-------|
| **Memory Providers** | ✅ Complete | ✅ Plugin-style | SQLite TypeScript issue resolved |
| **Emotion Modules** | ✅ Complete | ✅ Plugin-style | Rune emotion stack implemented |
| **Cognition Modules** | ✅ Complete | ✅ Plugin-style | HTN planner with memory integration |
| **Extensions** | ✅ Complete | ✅ Plugin-style | Slack, RuneLite, Twitter ready |
| **Portals** | ✅ Complete | ✅ Plugin-style | 6 AI providers integrated |
| **Runtime** | ✅ Complete | ✅ Auto-loading | Full plugin lifecycle management |
| **Configuration** | ✅ Complete | ✅ Environment | File + env var support |

## Next Steps

1. **Testing**: Comprehensive integration testing of all plugins
2. **Documentation**: API documentation for plugin developers
3. **Examples**: Sample plugins and configurations
4. **Performance**: Plugin loading optimization
5. **Hot Reload**: Dynamic plugin loading/unloading

The architecture is now fully plugin-style with proper separation of concerns, auto-registration, and comprehensive error handling. All modules can be developed, tested, and deployed independently while maintaining type safety and runtime stability.