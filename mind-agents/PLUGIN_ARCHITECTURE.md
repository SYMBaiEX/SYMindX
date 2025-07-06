# SYMindX Plugin Architecture

## Overview

SYMindX uses a modular plugin architecture where each module (emotion, memory provider, cognition) is packaged with its own `package.json` file. This enables:

- Plugin discovery and loading
- Version management
- Dependency isolation
- Metadata for UI/configuration

## Module Structure

Each module must have a `package.json` with the following structure:

```json
{
  "name": "@symindx/module-[type]-[name]",
  "version": "1.0.0",
  "type": "module",
  "private": true,
  "main": "index.ts",
  "dependencies": {},
  "symindx": {
    "type": "module",
    "category": "[emotion|memory|cognition]",
    "displayName": "[Human Readable Name]",
    "description": "[Module description]"
  }
}
```

## Version Management

Module versions are automatically synchronized with the main package version during build:

```bash
# Sync all module versions to main package version
npm run sync-versions

# Build (automatically syncs versions)
npm run build

# Build without version sync
npm run build:only
```

## Module Categories

### Emotion Module
Located in `src/modules/emotion/`

Single package containing all emotion types:
- angry
- anxious
- confident
- confused
- curious
- empathetic
- happy
- neutral
- nostalgic
- proud
- sad

### Memory Module
Located in `src/modules/memory/`

Main package with provider submodules in `providers/`:
- sqlite
- postgres
- supabase
- neon

### Cognition Module
Located in `src/modules/cognition/`

Single package containing all reasoning strategies:
- unified (default)
- theory-of-mind
- meta-reasoner
- hybrid-reasoning
- rule-based
- probabilistic
- reinforcement-learning
- pddl-planner

## Plugin Loading

The plugin loader (`src/core/plugin-loader.ts`) discovers modules by:
1. Scanning module directories for `package.json` files
2. Reading the `symindx` metadata section
3. Dynamically importing the module's main file
4. Registering with the appropriate factory

## Creating a New Module

### For Main Modules (emotion, memory, cognition)

1. Module already exists as a package in `src/modules/[type]/`
2. Add new functionality to the existing module
3. Update the module's `package.json` exports if needed
4. Run `npm run sync-versions` to align version

### For Memory Providers

1. Create a new directory in `src/modules/memory/providers/[name]/`
2. Add `package.json` with proper metadata
3. Create `index.ts` that exports the provider implementation
4. Update parent memory module's exports
5. Run `npm run sync-versions` to align version

## Module Metadata

The `symindx` section in `package.json` provides:

- `type`: Always "module"
- `category`: Module category (emotion, memory, cognition)
- `displayName`: Human-readable name for UI
- `description`: Brief description of functionality

This metadata is used by:

- Plugin loader for discovery
- Configuration UI for selection
- Documentation generation
- Runtime validation
