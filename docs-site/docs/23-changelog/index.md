---
sidebar_position: 23
sidebar_label: "Changelog"
title: "Changelog"
description: "Release notes and change history"
---

# Changelog

Release notes and change history

## Overview

Track the evolution of SYMindX through detailed release notes, breaking changes, and migration guides. This changelog follows [Semantic Versioning](https://semver.org/) and [Keep a Changelog](https://keepachangelog.com/) conventions.

## [Unreleased]

### Added
- **AI SDK v5 Integration**: Migrated all portals to Vercel AI SDK v5 (alpha/canary)
- **New AI Providers**: Added support for Google (Generative & Vertex), Mistral, Cohere, and Azure OpenAI
- **Enhanced Streaming**: All portals now support native streaming with `textStream`
- **Tool Calling with Zod**: Function calling now uses Zod schema validation
- Multi-agent conversation system with WebUI
- Advanced coordination module for agent orchestration
- Telegram integration for messaging platforms
- Enhanced TypeScript type system with centralized exports
- Conversation-based chat system in WebUI

### Changed
- **Unified Portal Interface**: All AI providers now use the same AI SDK v5 interface
- **Import Patterns**: Changed from `createProvider` to direct imports (e.g., `import { openai } from '@ai-sdk/openai'`)
- **Message Types**: Now using `CoreMessage` type from AI SDK v5
- **Model Updates**: Updated to latest models (GPT-4o, Claude 3.5 Sonnet 20241022, Llama 3.3)
- Refactored to TypeScript-only codebase (removed JavaScript)
- Improved module factory patterns for consistency
- Enhanced WebSocket API with better error handling
- Updated character system with richer personality definitions

### Fixed
- Memory leak in long-running agent sessions
- WebSocket reconnection issues
- Portal rate limiting edge cases

### Breaking Changes
- Portal packages now require canary versions (e.g., `@ai-sdk/openai@^2.0.0-canary.11`)
- Changed text generation return type to include both `text` and `textStream`
- Function definitions must now use Zod schemas
- Removed deprecated `createProvider` pattern

## [2.0.0] - 2024-01-15

### 🚀 Major Release: Clean Architecture

This release introduces a complete architectural overhaul focusing on modularity, type safety, and developer experience.

### Added
- **Factory Pattern System**: Consistent factory functions for all modules
  ```typescript
  createMemoryProvider('sqlite', config)
  createEmotionModule('rune_emotion_stack', config)
  createCognitionModule('htn_planner', config)
  ```

- **Centralized Type System**: All types now exported from `src/types/index.ts`
- **Enhanced Event Bus**: Improved inter-component communication
- **Multi-Provider Memory**: Support for SQLite, Supabase, and Neon
- **WebUI Dashboard**: Real-time agent monitoring and control
- **Coordination Module**: Advanced multi-agent orchestration

### Changed
- **Breaking**: Module instantiation now uses factory functions instead of constructors
- **Breaking**: Event system API has been redesigned
- **Breaking**: Configuration structure updated for better organization
- Improved error handling with Result types
- Enhanced logging with structured output
- Better TypeScript support with strict mode

### Deprecated
- Direct module constructors (use factories instead)
- Old event emitter pattern
- Legacy configuration format

### Removed
- JavaScript support (TypeScript only)
- Deprecated `MemoryProvider` constructor
- Legacy WebSocket protocol

### Fixed
- Memory provider connection pooling issues
- Emotion state persistence bugs
- Agent tick timing inconsistencies
- WebSocket message ordering problems

### Security
- Added input validation for all API endpoints
- Implemented rate limiting for Portal calls
- Enhanced authentication for WebSocket connections

## [1.5.0] - 2023-11-01

### Added
- HTN (Hierarchical Task Network) planner for cognition
- Reactive cognition module alternative
- Emotion persistence across sessions
- Portal streaming support for real-time responses
- Extension hot-reloading in development

### Changed
- Improved memory search performance by 3x
- Reduced agent initialization time by 50%
- Enhanced error messages for better debugging
- Updated dependencies to latest versions

### Fixed
- Slack extension reconnection issues
- Memory corruption on concurrent writes
- Portal timeout handling
- Character file validation errors

## [1.4.0] - 2023-09-15

### Added
- RuneScape-style emotion system
- Twitter/X integration
- Advanced memory search with embeddings
- Plugin lifecycle hooks
- Agent state snapshots

### Changed
- Migrated to ES modules
- Improved TypeScript definitions
- Better error recovery mechanisms
- Enhanced documentation

### Fixed
- Memory leak in emotion processing
- WebSocket connection stability
- Database migration issues

## [1.3.0] - 2023-07-20

### Added
- Supabase memory provider
- Multi-portal support (OpenAI + Anthropic)
- Agent personality templates
- WebSocket streaming API
- Performance monitoring tools

### Changed
- Restructured project as monorepo
- Improved agent tick performance
- Better memory management
- Enhanced logging system

### Fixed
- Race conditions in multi-agent scenarios
- Memory search relevance scoring
- Extension initialization order

## [1.2.0] - 2023-05-10

### Added
- Anthropic Claude portal
- Basic emotion module
- SQLite memory provider
- REST API endpoints
- Docker support

### Changed
- Improved agent configuration schema
- Better error handling
- Enhanced test coverage
- Updated documentation

### Fixed
- Agent state persistence
- Memory search performance
- API authentication issues

## [1.1.0] - 2023-03-01

### Added
- Slack integration
- Basic WebSocket API
- Memory search functionality
- Agent extensions system

### Changed
- Refactored core architecture
- Improved module system
- Better TypeScript support

### Fixed
- Memory save reliability
- Agent lifecycle bugs
- Configuration loading issues

## [1.0.0] - 2023-01-15

### 🎉 Initial Release

The first stable release of SYMindX!

### Added
- Core agent system
- Memory module interface
- OpenAI portal integration
- Basic character system
- Simple runtime loop
- Configuration management
- Logging infrastructure

### Known Issues
- Limited to single agent instances
- No emotion support
- Basic memory search only
- No WebUI

## Version History Summary

| Version | Release Date | Highlights |
|---------|--------------|------------|
| 2.0.0   | 2024-01-15  | Clean architecture, Factory patterns |
| 1.5.0   | 2023-11-01  | HTN planner, Streaming support |
| 1.4.0   | 2023-09-15  | Emotion system, Twitter integration |
| 1.3.0   | 2023-07-20  | Supabase, Multi-portal support |
| 1.2.0   | 2023-05-10  | Anthropic portal, REST API |
| 1.1.0   | 2023-03-01  | Slack, WebSocket API |
| 1.0.0   | 2023-01-15  | Initial release |

## Deprecation Policy

We follow a structured deprecation process:

1. **Deprecation Notice**: Features marked as deprecated in release notes
2. **Warning Period**: Deprecated features show console warnings
3. **Migration Period**: One major version with both old and new APIs
4. **Removal**: Deprecated features removed in next major version

Example:
```typescript
// v1.5.0 - Deprecated
/**
 * @deprecated Use createMemoryProvider() instead
 */
new MemoryProvider('sqlite', config)

// v2.0.0 - Removed
// Constructor no longer available
```

## Migration Guides

Detailed migration guides for major versions:

- [Migrating to v2.0](./migration-guides/v2.0)
- [Migrating to v1.5](./migration-guides/v1.5)
- [Migrating to v1.0](./migration-guides/v1.0)

## Release Schedule

SYMindX follows a predictable release schedule:

- **Major releases** (x.0.0): Annually in January
- **Minor releases** (x.y.0): Quarterly (March, June, September, December)
- **Patch releases** (x.y.z): As needed for bug fixes

### Release Channels

- **Stable**: Production-ready releases
- **Beta**: Pre-release testing (npm tag: `beta`)
- **Canary**: Nightly builds (npm tag: `canary`)

```bash
# Install stable
npm install @symindx/core

# Install beta
npm install @symindx/core@beta

# Install canary
npm install @symindx/core@canary
```

## Breaking Changes Policy

We minimize breaking changes and provide:

1. **Clear documentation** of all breaking changes
2. **Migration tools** where possible
3. **Deprecation warnings** at least one version prior
4. **Community feedback period** for major changes

## How to Upgrade

### Before Upgrading

1. **Read the changelog** for your target version
2. **Check breaking changes** section carefully
3. **Test in development** environment first
4. **Backup your data** (especially memory databases)

### Upgrade Process

```bash
# Check current version
npm list @symindx/core

# View available versions
npm view @symindx/core versions

# Upgrade to latest
npm install @symindx/core@latest

# Upgrade to specific version
npm install @symindx/core@2.0.0

# Run migration scripts if needed
npx @symindx/migrate up
```

## Next Steps

- Review [Breaking Changes](./breaking-changes) in detail
- Follow [Migration Guides](./migration-guides) for upgrades
- Check [Release Notes](./releases) for full details
- Join [Discord](../community/discord) for upgrade support
