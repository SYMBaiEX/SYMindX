---
sidebar_position: 1
title: "Registry"
description: "Module registry and dependency management"
---

# Registry

Module registry and dependency management

## Module Registry

The Registry is SYMindX's dependency injection and module management system.

### Purpose

The Registry provides:
- **Module Registration**: Central place for all modules
- **Dependency Resolution**: Automatic dependency injection
- **Type Safety**: Compile-time type checking
- **Hot Reloading**: Swap modules at runtime

### How It Works

```typescript
// Register a module
registry.register('memory', 'sqlite', sqliteProvider);

// Retrieve a module
const memory = registry.get('memory', 'sqlite');

// List available modules
const providers = registry.list('memory');
```

### Module Types

1. **Memory Providers**
   - SQLite
   - PostgreSQL
   - Supabase
   - Neon

2. **Emotion Modules**
   - Emotion Stack
   - Custom emotions

3. **Cognition Modules**
   - HTN Planner
   - Reactive
   - Hybrid

4. **Extensions**
   - API Server
   - Chat platforms
   - Web UI

### Registry API

```typescript
interface Registry {
  // Register a module
  register<T>(type: string, id: string, module: T): void;
  
  // Get a module
  get<T>(type: string, id: string): T;
  
  // List modules of a type
  list(type: string): string[];
  
  // Check if module exists
  has(type: string, id: string): boolean;
  
  // Unregister a module
  unregister(type: string, id: string): void;
}
```
