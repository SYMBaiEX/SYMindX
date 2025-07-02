---
sidebar_position: 1
title: "Memory Providers"
description: "Available memory storage providers"
---

# Memory Providers

Available memory storage providers

## Memory Providers

SYMindX supports multiple memory providers for different use cases.

### Provider Comparison

| Provider | Use Case | Persistence | Scalability | Features |
|----------|----------|-------------|-------------|----------|
| SQLite | Local dev | File-based | Single node | Simple, fast |
| PostgreSQL | Production | Server | Multi-node | Full SQL, JSONB |
| Supabase | Cloud | Managed | Auto-scale | Real-time, Auth |
| Neon | Serverless | Managed | Auto-scale | Branching, Scale-to-zero |

### Provider Selection

```typescript
// Auto-select based on environment
const memory = createMemoryProvider('auto');

// Explicit provider
const memory = createMemoryProvider('postgres', {
  connectionString: process.env.DATABASE_URL
});

// With fallback
const memory = createMemoryProvider(['neon', 'postgres', 'sqlite']);
```

### Provider Features

#### SQLite
- Zero configuration
- File-based storage
- Full-text search
- JSON support

#### PostgreSQL
- ACID compliance
- JSONB for metadata
- Full-text search
- Vector extensions (pgvector)

#### Supabase
- Real-time subscriptions
- Row-level security
- Built-in auth
- RESTful API

#### Neon
- Serverless scaling
- Database branching
- Point-in-time recovery
- Scale-to-zero

### Custom Providers

```typescript
class CustomMemoryProvider implements MemoryProvider {
  async init(config: any): Promise<void> {
    // Initialize connection
  }
  
  async store(memory: Memory): Promise<void> {
    // Store memory
  }
  
  async retrieve(id: string): Promise<Memory> {
    // Retrieve by ID
  }
  
  async search(query: string): Promise<Memory[]> {
    // Search memories
  }
}

// Register custom provider
registry.register('memory', 'custom', CustomMemoryProvider);
```
