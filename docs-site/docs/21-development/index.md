---
sidebar_position: 21
sidebar_label: "Development"
title: "Development"
description: "Development guidelines and best practices"
---

# Development

Development guidelines and best practices

## Overview

This section covers development practices, coding standards, and contribution guidelines for SYMindX. Whether you're building extensions, contributing to core, or developing applications with SYMindX, these guidelines will help you write clean, maintainable, and performant code.

## Development Environment Setup

### Prerequisites

Ensure you have the required tools installed:

```bash
# Check Node.js version (18+ required)
node --version

# Check Bun version (recommended)
bun --version

# Check TypeScript version
tsc --version

# Check Git version
git --version
```

### Initial Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/symbaiex/symindx.git
   cd symindx
   ```

2. **Install dependencies**
   ```bash
   bun install
   # or
   npm install
   ```

3. **Set up environment**
   ```bash
   # Copy example config
   cp config/runtime.example.json config/runtime.json
   
   # Create .env file
   cp .env.example .env
   
   # Edit with your API keys
   nano .env
   ```

4. **Run development mode**
   ```bash
   bun dev
   ```

### VS Code Configuration

Recommended settings for optimal development:

```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "typescript.tsdk": "node_modules/typescript/lib",
  "files.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/.turbo": true
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/coverage": true
  }
}
```

Recommended extensions:
- ESLint
- Prettier
- TypeScript and JavaScript
- Jest Runner
- GitLens
- Error Lens

## Code Style Guide

### TypeScript Standards

We follow strict TypeScript guidelines:

```typescript
// ✅ Good: Strong typing
export interface AgentConfig {
  id: string;
  name: string;
  personality: Personality;
  modules?: ModuleConfig;
}

// ❌ Bad: Weak typing
export interface AgentConfig {
  id: any;
  name: any;
  personality: any;
  modules?: any;
}

// ✅ Good: Type guards
function isMemoryProvider(module: unknown): module is MemoryProvider {
  return (
    typeof module === 'object' &&
    module !== null &&
    'save' in module &&
    'search' in module
  );
}

// ✅ Good: Generics for reusability
export class Registry<T extends Module> {
  private modules = new Map<string, T>();
  
  register(name: string, module: T): void {
    this.modules.set(name, module);
  }
  
  get(name: string): T | undefined {
    return this.modules.get(name);
  }
}
```

### Naming Conventions

Follow consistent naming patterns:

```typescript
// Interfaces: PascalCase with descriptive names
interface MemoryProvider { }
interface ExtensionContext { }

// Classes: PascalCase
class SQLiteMemoryProvider { }
class AgentRuntime { }

// Functions: camelCase, verb-first
function createAgent() { }
function validateConfig() { }

// Constants: UPPER_SNAKE_CASE
const MAX_MEMORY_SIZE = 1000;
const DEFAULT_TICK_RATE = 100;

// Private properties: underscore prefix
class Agent {
  private _state: AgentState;
  private _initialized = false;
}

// File names: kebab-case
// memory-provider.ts
// agent-runtime.ts
// enhanced-event-bus.ts
```

### Async/Await Patterns

Always use async/await over callbacks:

```typescript
// ✅ Good: Clean async/await
export async function processMessage(message: string): Promise<Response> {
  try {
    const memories = await searchMemories(message);
    const context = await buildContext(memories);
    const response = await generateResponse(context);
    return response;
  } catch (error) {
    logger.error('Failed to process message', error);
    throw new ProcessingError('Message processing failed', { cause: error });
  }
}

// ✅ Good: Parallel operations
export async function initializeModules(config: Config): Promise<void> {
  const [memory, emotion, cognition] = await Promise.all([
    createMemoryProvider(config.memory),
    createEmotionModule(config.emotion),
    createCognitionModule(config.cognition)
  ]);
  
  // Continue with initialized modules
}

// ✅ Good: Error boundaries
export async function safeExecute<T>(
  fn: () => Promise<T>,
  fallback: T
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    logger.warn('Operation failed, using fallback', error);
    return fallback;
  }
}
```

### Error Handling

Implement comprehensive error handling:

```typescript
// Custom error classes
export class SYMindXError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'SYMindXError';
  }
}

export class ConfigurationError extends SYMindXError {
  constructor(message: string, details?: any) {
    super(message, 'CONFIG_ERROR', details);
  }
}

// Result type for operations that can fail
export type Result<T, E = Error> = 
  | { ok: true; value: T }
  | { ok: false; error: E };

export async function tryOperation<T>(
  operation: () => Promise<T>
): Promise<Result<T>> {
  try {
    const value = await operation();
    return { ok: true, value };
  } catch (error) {
    return { ok: false, error: error as Error };
  }
}

// Usage
const result = await tryOperation(() => agent.think(input));
if (!result.ok) {
  logger.error('Think operation failed', result.error);
  return 'I encountered an error processing your request.';
}
return result.value;
```

## Testing Standards

### Unit Testing

Write comprehensive unit tests:

```typescript
// agent.test.ts
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Agent } from '../agent';
import { createMockMemory, createMockPortal } from './mocks';

describe('Agent', () => {
  let agent: Agent;
  let mockMemory: jest.Mocked<MemoryProvider>;
  let mockPortal: jest.Mocked<Portal>;
  
  beforeEach(() => {
    mockMemory = createMockMemory();
    mockPortal = createMockPortal();
    
    agent = new Agent({
      id: 'test-agent',
      name: 'Test Agent',
      memory: mockMemory,
      portal: mockPortal
    });
  });
  
  describe('think', () => {
    it('should retrieve relevant memories', async () => {
      // Arrange
      const input = 'What is my favorite color?';
      const memories = [
        { content: 'User said their favorite color is blue' }
      ];
      mockMemory.search.mockResolvedValue(memories);
      mockPortal.generateText.mockResolvedValue('Your favorite color is blue.');
      
      // Act
      const response = await agent.think(input);
      
      // Assert
      expect(mockMemory.search).toHaveBeenCalledWith({
        query: input,
        limit: expect.any(Number)
      });
      expect(response).toBe('Your favorite color is blue.');
    });
    
    it('should handle memory search failures gracefully', async () => {
      // Arrange
      mockMemory.search.mockRejectedValue(new Error('Database error'));
      mockPortal.generateText.mockResolvedValue('I can help you with that.');
      
      // Act
      const response = await agent.think('Hello');
      
      // Assert
      expect(response).toBe('I can help you with that.');
      expect(agent.isOperational).toBe(true);
    });
  });
});
```

### Integration Testing

Test component interactions:

```typescript
// integration.test.ts
describe('Agent Integration', () => {
  let runtime: Runtime;
  
  beforeAll(async () => {
    runtime = new Runtime({
      config: './test/fixtures/test-config.json'
    });
    await runtime.initialize();
  });
  
  afterAll(async () => {
    await runtime.shutdown();
  });
  
  it('should handle complete conversation flow', async () => {
    // Create agent with real modules
    const agent = await runtime.createAgent({
      id: 'integration-test',
      name: 'Integration Test Agent',
      modules: {
        memory: { provider: 'sqlite', config: { dbPath: ':memory:' } },
        emotion: { provider: 'rune_emotion_stack' },
        cognition: { provider: 'reactive' }
      }
    });
    
    // Simulate conversation
    const responses = [];
    responses.push(await agent.think("Hello, I'm Alice"));
    responses.push(await agent.think("I love programming"));
    responses.push(await agent.think("What's my name?"));
    
    // Verify agent remembers context
    expect(responses[2]).toMatch(/Alice/i);
  });
});
```

### Performance Testing

Monitor performance characteristics:

```typescript
// performance.test.ts
describe('Performance', () => {
  it('should handle 100 concurrent requests', async () => {
    const agent = createTestAgent();
    const startTime = performance.now();
    
    const promises = Array(100).fill(null).map((_, i) => 
      agent.think(`Test message ${i}`)
    );
    
    const results = await Promise.all(promises);
    const duration = performance.now() - startTime;
    
    expect(results).toHaveLength(100);
    expect(duration).toBeLessThan(5000); // Under 5 seconds
    
    // Log performance metrics
    console.log(`Processed 100 requests in ${duration}ms`);
    console.log(`Average: ${duration / 100}ms per request`);
  });
});
```

## Documentation Standards

### Code Documentation

Use JSDoc for all public APIs:

```typescript
/**
 * Creates a new agent with the specified configuration.
 * 
 * @param config - Agent configuration object
 * @returns Promise that resolves to the initialized agent
 * 
 * @example
 * ```typescript
 * const agent = await createAgent({
 *   id: 'my-agent',
 *   name: 'Assistant',
 *   personality: { traits: ['helpful', 'friendly'] }
 * });
 * ```
 * 
 * @throws {ConfigurationError} If configuration is invalid
 * @throws {InitializationError} If agent fails to initialize
 */
export async function createAgent(config: AgentConfig): Promise<Agent> {
  validateConfig(config);
  const agent = new Agent(config);
  await agent.initialize();
  return agent;
}

/**
 * Memory provider interface for persistent storage of agent memories.
 * 
 * @interface MemoryProvider
 * @since 1.0.0
 */
export interface MemoryProvider {
  /**
   * Saves a memory record to persistent storage.
   * 
   * @param record - The memory record to save
   * @returns Promise that resolves when save is complete
   */
  save(record: MemoryRecord): Promise<void>;
  
  /**
   * Searches for memories matching the query.
   * 
   * @param query - Search parameters
   * @returns Promise that resolves to matching memory records
   */
  search(query: SearchQuery): Promise<MemoryRecord[]>;
}
```

### README Files

Every module should have a README:

```markdown
# Memory Module

Provides persistent memory storage for SYMindX agents.

## Features

- Multiple backend support (SQLite, PostgreSQL, Supabase)
- Full-text search capabilities
- Automatic memory consolidation
- Configurable retention policies

## Usage

```typescript
import { createMemoryProvider } from '@symindx/memory';

const memory = createMemoryProvider('sqlite', {
  dbPath: './agent-memories.db'
});

await memory.save({
  agentId: 'agent-1',
  content: 'User prefers dark mode',
  timestamp: Date.now()
});
```

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `dbPath` | string | `./memories.db` | SQLite database path |
| `maxMemories` | number | `10000` | Maximum memories to retain |
| `compressionEnabled` | boolean | `true` | Enable memory compression |
```

## Git Workflow

### Branch Strategy

Follow GitFlow conventions:

```bash
# Feature branches
git checkout -b feature/add-websocket-support

# Bugfix branches
git checkout -b bugfix/memory-leak-in-agent

# Release branches
git checkout -b release/v2.0.0

# Hotfix branches
git checkout -b hotfix/critical-security-patch
```

### Commit Messages

Follow conventional commits:

```bash
# Features
git commit -m "feat(agent): add emotional state persistence"

# Bug fixes
git commit -m "fix(memory): resolve SQLite connection leak"

# Documentation
git commit -m "docs(api): update WebSocket examples"

# Performance
git commit -m "perf(portal): optimize token counting"

# Refactoring
git commit -m "refactor(core): extract agent factory logic"

# Tests
git commit -m "test(integration): add multi-agent scenarios"

# Chores
git commit -m "chore(deps): update TypeScript to 5.3"
```

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No new warnings
```

## Performance Guidelines

### Optimization Strategies

```typescript
// ✅ Good: Lazy loading
class LazyModule {
  private _instance?: Module;
  
  get instance(): Module {
    if (!this._instance) {
      this._instance = this.createModule();
    }
    return this._instance;
  }
}

// ✅ Good: Batch operations
async function batchSaveMemories(memories: MemoryRecord[]) {
  const chunks = chunk(memories, 100);
  
  for (const chunk of chunks) {
    await db.transaction(async (trx) => {
      await Promise.all(
        chunk.map(memory => trx.insert(memory))
      );
    });
  }
}

// ✅ Good: Caching expensive operations
const memoizedEmbedding = memoize(
  async (text: string) => portal.generateEmbedding(text),
  { maxSize: 1000, ttl: 3600000 }
);
```

## Security Best Practices

### Input Validation

Always validate and sanitize inputs:

```typescript
import { z } from 'zod';

// Define schemas
const AgentConfigSchema = z.object({
  id: z.string().min(1).max(50).regex(/^[a-zA-Z0-9-_]+$/),
  name: z.string().min(1).max(100),
  personality: z.object({
    traits: z.array(z.string()).max(10),
    background: z.string().max(500).optional()
  })
});

// Validate inputs
export function validateAgentConfig(config: unknown): AgentConfig {
  try {
    return AgentConfigSchema.parse(config);
  } catch (error) {
    throw new ValidationError('Invalid agent configuration', error);
  }
}

// Sanitize user content
export function sanitizeUserInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML
    .substring(0, 5000); // Limit length
}
```

## Next Steps

- Review [Code Style](./code-style) guide in detail
- Learn about [Contributing](./contributing) to SYMindX
- Set up [Debugging](./debugging) environment
- Explore [Testing Patterns](../testing) for comprehensive coverage
