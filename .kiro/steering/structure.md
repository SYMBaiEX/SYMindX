# Project Structure & Organization

## Workspace Layout

```
symindx/                          # Root workspace
├── mind-agents/                  # Core agent runtime system
├── website/                      # React dashboard & documentation
├── testing/                      # Integration tests & benchmarks
├── .kiro/                        # Kiro IDE configuration
├── .roadmap/                     # Architecture & planning docs
└── monitoring/                   # Prometheus & metrics config
```

## Core Agent System (`mind-agents/`)

```
mind-agents/src/
├── core/                         # Runtime engine & discovery systems
│   ├── runtime/                  # Core runtime components
│   ├── config/                   # Configuration management
│   ├── context/                  # Context management
│   └── security/                 # Security & compliance
├── modules/                      # Auto-discovered modules
│   ├── memory/                   # Memory providers (sqlite, postgres, supabase, neon)
│   ├── emotion/                  # 11 emotions with auto-discovery
│   ├── cognition/                # HTN, reactive, hybrid, theory-of-mind, unified
│   └── multimodal/               # Multi-modal processing
├── extensions/                   # Auto-discovered extensions
│   ├── api/                      # HTTP/WebSocket server + WebUI
│   ├── telegram/                 # Telegram bot integration
│   ├── mcp-server/               # Model Context Protocol server
│   ├── communication/            # Advanced communication system
│   └── runelite/                 # Game integration
├── portals/                      # AI provider integrations (15+ providers)
├── characters/                   # Agent configurations (NyX, etc.)
├── types/                        # Centralized type system
├── utils/                        # Shared utilities
├── cli/                          # Command line interface
└── security/                     # Security implementations
```

## Key Conventions

### Module Organization
- Each module has its own `package.json` with `symindx` metadata
- Auto-discovery via directory scanning and metadata parsing
- Factory pattern: `create[ModuleName]` functions
- Consistent interface implementations

### File Naming
- **Types**: PascalCase interfaces (e.g., `AgentConfig`, `EmotionState`)
- **Files**: kebab-case for multi-word files (e.g., `event-bus.ts`, `memory-provider.ts`)
- **Directories**: lowercase with hyphens (e.g., `theory-of-mind/`, `mcp-server/`)

### Import Patterns
- Use path aliases: `@core/*`, `@types/*`, `@utils/*`
- Barrel exports from `index.ts` files
- Explicit imports for better tree-shaking

### Configuration Files
- Runtime config: `mind-agents/src/core/config/runtime.json`
- Character configs: `mind-agents/src/characters/*.json`
- TypeScript: Strict mode enabled with comprehensive type checking

### Testing Structure
- Unit tests: Co-located with source files (`*.test.ts`)
- Integration tests: `testing/tests/`
- Performance benchmarks: `testing/performance-benchmarks/`
- Test fixtures: `testing/fixtures/`

### Documentation
- API docs: `mind-agents/docs/`
- Architecture docs: `.roadmap/`
- Module-specific: README.md in each module directory