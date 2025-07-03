# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Project Structure
SYMindX is a monorepo with multiple components:
- `mind-agents/` - Core agent runtime system (TypeScript)
- `website/` - React web interface (TypeScript + Vite)
- `docs-site/` - Documentation site (Docusaurus)
- `cli/` - Build outputs for CLI tools (not committed to git)

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

SYMindX is a reactive AI agent runtime with modular emotion and cognition systems:

```
SYMindX Runtime (mind-agents/)
├── 📁 src/
│   ├── 🔧 api.ts - Public API interface
│   ├── 🚀 index.ts - Main entry point
│   │
│   ├── 🏗️ core/ - Core Runtime System
│   │   ├── runtime.ts - Main orchestrator
│   │   ├── registry.ts - Type-safe module registry
│   │   ├── event-bus.ts - Inter-component communication
│   │   ├── plugin-loader.ts - Plugin loading
│   │   ├── command-system.ts - Command execution
│   │   ├── portal-integration.ts - AI provider integration (includes portal selection)
│   │   ├── autonomous-engine.ts - Autonomous behaviors (disabled by default)
│   │   ├── decision-engine.ts - Decision making
│   │   ├── ethics-engine.ts - Ethical constraints (can be disabled per agent)
│   │   ├── interaction-manager.ts - Human interaction handling
│   │   ├── multi-agent-manager.ts - Multi-agent coordination
│   │   └── prompt-manager.ts - Prompt template management
│   │
│   ├── 📚 types/ - Centralized Type System
│   │   ├── index.ts - Master type exports (ALL TYPES HERE)
│   │   ├── agent.ts - Agent and extension types
│   │   ├── character.ts - Character configuration types
│   │   ├── emotion.ts - Emotion system types
│   │   ├── memory.ts - Memory system types
│   │   ├── portal.ts - AI provider types
│   │   └── [other type files]
│   │
│   ├── 🧩 modules/ - AI Module System
│   │   ├── index.ts - Module factory registry
│   │   ├── memory/ - Memory providers
│   │   │   ├── providers/
│   │   │   │   ├── sqlite/ - SQLite provider
│   │   │   │   ├── postgres/ - PostgreSQL provider
│   │   │   │   ├── supabase/ - Supabase provider
│   │   │   │   └── neon/ - Neon provider
│   │   │   └── base-memory-provider.ts
│   │   ├── emotion/ - Emotion system
│   │   │   ├── composite-emotion.ts - Manages all emotions
│   │   │   ├── base-emotion.ts - Base emotion class
│   │   │   ├── happy/
│   │   │   ├── sad/
│   │   │   ├── angry/
│   │   │   ├── anxious/
│   │   │   ├── confident/
│   │   │   ├── nostalgic/
│   │   │   ├── empathetic/
│   │   │   ├── curious/
│   │   │   ├── proud/
│   │   │   ├── confused/
│   │   │   └── neutral/
│   │   └── cognition/ - Cognitive systems
│   │       ├── cognition.ts - Main cognition module
│   │       ├── htn-planner.ts - HTN planning
│   │       ├── reactive.ts - Reactive responses
│   │       └── hybrid.ts - Combined approach
│   │
│   ├── 🔌 extensions/ - Extension System
│   │   ├── api/ - HTTP/WebSocket server with WebUI
│   │   ├── slack/ - Slack integration
│   │   ├── twitter/ - Twitter bot
│   │   ├── telegram/ - Telegram bot
│   │   └── runelite/ - RuneScape integration
│   │
│   ├── 🌐 portals/ - AI Provider Integrations (AI SDK v5)
│   │   ├── groq/ - Groq (fast inference)
│   │   ├── openai/ - OpenAI GPT models
│   │   ├── anthropic/ - Claude models
│   │   ├── xai/ - xAI Grok models
│   │   ├── google-generative/ - Google Gemini
│   │   ├── google-vertex/ - Google Vertex AI
│   │   ├── mistral/ - Mistral AI
│   │   ├── cohere/ - Cohere models
│   │   ├── azure-openai/ - Azure OpenAI
│   │   ├── ollama/ - Local models
│   │   ├── lmstudio/ - LM Studio
│   │   └── [other providers]
│   │
│   ├── 🛡️ security/ - Security & Compliance
│   │   ├── auth/ - Authentication systems
│   │   ├── rbac/ - Role-based access control
│   │   └── compliance/ - GDPR, HIPAA, SOX
│   │
│   ├── 🛠️ utils/ - Utilities & Helpers
│   │   ├── logger.ts - Structured logging
│   │   └── config-resolver.ts - Configuration resolution
│   │
│   └── 🎮 cli/ - Command Line Interface
│       ├── index.ts - CLI entry point
│       └── commands/ - CLI commands
│           ├── agent.ts - Agent management
│           ├── status.ts - System status
│           └── list.ts - List resources
│
└── 👤 characters/ - Agent Definitions
    ├── nyx.json - Unethical hacker personality
    ├── aria.json - Creative artist (disabled)
    ├── rex.json - Strategic thinker (disabled)
    ├── nova.json - Empathetic counselor (disabled)
    └── [other character configs]

Web Interface (website/)
├── Components - React dashboard
├── Real-time Visualization - Agent monitoring
└── WebSocket Integration - Live updates
```

## Recent Architecture Changes

### 1. Reactive Design
- Agents now sit idle until they receive messages
- No autonomous behaviors by default (can be enabled per agent)
- Memory storage only logs conversation interactions

### 2. Emotion System Refactor
- Removed monolithic rune-emotion-stack
- Each emotion is now its own module with dedicated folder
- CompositeEmotionModule manages all emotions
- Emotions trigger based on events, messages, and context

### 3. Core Consolidation
- Removed duplicate enhanced-event-bus.ts
- Merged dynamic-portal-selector.ts into portal-integration.ts
- Removed unused /src/lib/ directory with UI utilities
- Archived unused utilities for potential future use

### 4. Ethics System
- Ethics can now be disabled per agent via `ethics.enabled` flag
- NyX configured with ethics disabled for unrestricted decision-making
- Ethics status displayed in CLI and API responses

## Key Development Patterns

### Clean Architecture Principles
1. **Centralized Type System**: All types exported from `src/types/index.ts`
2. **Factory Pattern**: Consistent factory functions for all modules
3. **Barrel Exports**: Clean module exports through index.ts files
4. **Type Safety**: Strong typing with minimal 'any' usage
5. **Public API**: Clean interface through `src/api.ts`

### Module Factory Pattern
```typescript
// Emotion modules use composite pattern
createEmotionModule('composite', config)

// Memory providers with auto-detection
createMemoryProvider('sqlite', config)
createMemoryProvider('postgres', config)
createMemoryProvider('supabase', config)
createMemoryProvider('neon', config)

// Cognition modules
createCognitionModule('htn_planner', config)
createCognitionModule('reactive', config)
createCognitionModule('hybrid', config)
```

### Character Configuration
Characters are defined in JSON with:
- **personality**: Traits, backstory, goals, values
- **autonomous**: Decision making settings (can disable ethics)
- **memory**: Provider type and configuration
- **emotion**: Composite emotion configuration
- **cognition**: Thinking module selection
- **communication**: Style, tone, guidelines
- **extensions**: Enabled integrations
- **portals**: AI provider configuration

### Emotion System
Each emotion module extends BaseEmotion and includes:
- Specific triggers (success, failure, praise, etc.)
- Intensity management with decay
- Emotion-specific modifiers
- History tracking

## Environment Variables

```bash
# Memory providers
SQLITE_DB_PATH=./data/memories.db
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
NEON_DATABASE_URL=...
POSTGRES_CONNECTION_STRING=...

# AI Portals (at least one required)
GROQ_API_KEY=...
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
XAI_API_KEY=...

# Extensions (optional)
SLACK_BOT_TOKEN=...
TELEGRAM_BOT_TOKEN=...
TWITTER_USERNAME=...
TWITTER_PASSWORD=...
```

## Development Workflow

1. **Setup**: Copy `config/runtime.example.json` to `config/runtime.json`
2. **Configure**: Add API keys to runtime.json or environment variables
3. **Install**: Run `bun install` from repository root
4. **Develop**: Use `bun dev` to start both components
5. **Test**: Use `bun test` to run the test suite
6. **Build**: Use `bun build` for production builds

## Important Notes

### Git Ignore Patterns
- `/cli/` directory contains build outputs and should not be committed
- `config/runtime.json` is user-specific and not tracked
- Database files (*.db, *.sqlite) are not tracked
- Memory modules ARE tracked (exception to usual patterns)

### Current Agent Status
- **NyX**: Active with ethics disabled, primary agent
- **Aria, Rex, Nova**: Disabled for testing
- Other agents in characters/ are available but not configured

### Reactive Behavior
Agents only respond to:
- Direct messages via extensions (Telegram, Slack, API)
- CLI commands
- Game events (future: RuneLite integration)

No autonomous actions unless explicitly enabled in character config.

## Testing Guidelines

### Running Tests
```bash
# From mind-agents directory
npm test

# Run specific test file
npm test -- --testPathPattern=memory-provider

# Run with coverage
npm test -- --coverage
```

### Test Structure
- Unit tests alongside source files as `*.test.ts`
- Integration tests in `__tests__/` directories
- Mock providers for external services

## Troubleshooting

### Common Issues
1. **Agent not responding**: Check if ethics or autonomous behaviors are blocking
2. **Memory errors**: Ensure database path exists and is writable
3. **Portal errors**: Verify API keys are set correctly
4. **Build errors**: Run with `--skipLibCheck` flag

### Debug Commands
```bash
# Check system status
npm run cli status

# List all agents with details
npm run cli list agents -v

# View recent events
npm run cli list events
```