# Technology Stack & Build System

## Runtime & Package Management

- **Runtime**: Bun (primary) or Node.js 18+
- **Package Manager**: Bun with workspace support
- **Module System**: ESM (ES Modules) with TypeScript

## Core Technologies

- **Language**: TypeScript 5.8 with strict mode enabled
- **AI Integration**: AI SDK v5 (Vercel) for unified AI provider interface
- **Database**: SQLite (dev), PostgreSQL/Supabase/Neon (production)
- **Web Framework**: Express.js with WebSocket support
- **UI Framework**: React 18+ (for web dashboard)
- **CLI Framework**: Ink (React for CLI)

## Build System

- **Primary Builder**: Bun native build system
- **TypeScript Compiler**: tsc with strict configuration
- **Bundler**: Webpack (for optimized production builds)
- **Watch Mode**: Concurrent TypeScript compilation + Bun execution

## Key Dependencies

- **AI Providers**: @ai-sdk/* packages for 15+ providers
- **Database**: pg, @supabase/supabase-js, @neondatabase/serverless
- **Communication**: ws, telegraf, express
- **Utilities**: zod (validation), uuid, chalk, ora, inquirer

## Common Commands

```bash
# Development
bun dev                    # Start with hot reload
bun dev:website           # Start React dashboard
bun cli                   # Interactive CLI

# Building
bun build                 # Build everything
bun build:agent          # Build core agent system
bun build:website         # Build React dashboard

# Testing
bun test                  # Run test suite
bun test:watch           # Watch mode testing

# Production
bun start                # Start production build
bun start:daemon         # Start as background daemon
```

## Architecture Patterns

- **Auto-Discovery**: Modules, extensions, and portals auto-register via package.json metadata
- **Factory Pattern**: Consistent creation patterns for all components
- **Event-Driven**: Central event bus for inter-component communication
- **Dependency Injection**: Clean separation of concerns with injectable dependencies