# Contributing to SYMindX

Thank you for your interest in contributing to SYMindX! This guide will help you get started and ensure your contributions are successful.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Environment](#development-environment)
- [Contribution Workflow](#contribution-workflow)
- [Code Standards](#code-standards)
- [Testing Guidelines](#testing-guidelines)
- [Documentation Standards](#documentation-standards)
- [Review Process](#review-process)
- [Community Guidelines](#community-guidelines)

## Getting Started

### Prerequisites

Before contributing, ensure you have:

- **Bun**: v1.0.0 or higher
- **Node.js**: v18.0.0 or higher
- **Git**: Latest version
- **Code Editor**: VS Code recommended with extensions

### Required Tools

```bash
# Install development dependencies
bun install

# Install recommended global tools
bun add -g typescript@latest
bun add -g eslint@latest
bun add -g prettier@latest
```

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally
3. Set up the upstream remote

```bash
# Clone your fork
git clone https://github.com/your-username/symindx.git
cd symindx

# Add upstream remote
git remote add upstream https://github.com/original-org/symindx.git

# Verify remotes
git remote -v
```

## Development Environment

### Initial Setup

```bash
# Install dependencies
bun install

# Copy environment template
cp .env.example .env.local

# Set up development database
bun run db:setup

# Run tests to verify setup
bun test

# Start development server
bun dev
```

### VS Code Setup

Recommended VS Code extensions:

```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-eslint",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-jest",
    "ms-vscode.vscode-markdown"
  ]
}
```

VS Code settings (`.vscode/settings.json`):

```json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "typescript.suggest.autoImports": true,
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "files.associations": {
    "*.mdc": "markdown"
  },
  "markdown.validate.enabled": true
}
```

### Development Scripts

```bash
# Development commands
bun dev                 # Start development server
bun test               # Run test suite
bun test:watch         # Run tests in watch mode
bun type-check         # TypeScript type checking
bun lint               # Run ESLint
bun format             # Format code with Prettier
bun build              # Build for production

# Database commands
bun run db:setup       # Initialize database
bun run db:migrate     # Run migrations
bun run db:reset       # Reset database
bun run db:seed        # Seed with test data

# Analysis commands
bun run analyze        # Run code analysis
bun run coverage       # Generate test coverage
bun run bundle-size    # Analyze bundle size
```

## Contribution Workflow

### 1. Issue First

Before starting work:

1. **Check existing issues** to avoid duplicates
2. **Create an issue** if one doesn't exist
3. **Discuss your approach** in the issue
4. **Get approval** for significant changes

### 2. Branch Strategy

We use GitFlow with the following branches:

- `main`: Production-ready code
- `develop`: Integration branch for features
- `feature/*`: Feature development
- `bugfix/*`: Bug fixes
- `hotfix/*`: Critical production fixes

### 3. Branch Naming

```bash
# Feature branches
feature/add-claude-portal
feature/improve-memory-performance
feature/discord-slash-commands

# Bug fix branches
bugfix/fix-memory-leak
bugfix/resolve-portal-timeout
bugfix/update-dependencies

# Hotfix branches
hotfix/security-patch
hotfix/critical-bug-fix
```

### 4. Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Format: type(scope): description
#
# Types: feat, fix, docs, style, refactor, test, chore
# Scope: portal, memory, extension, core, web, etc.

# Examples:
feat(portal): add Claude 3.5 Sonnet support
fix(memory): resolve SQLite connection leak
docs(api): update authentication examples
refactor(core): simplify agent lifecycle
test(portal): add OpenAI integration tests
chore(deps): update dependencies to latest
```

### 5. Pull Request Process

```bash
# 1. Create feature branch
git checkout -b feature/your-feature-name

# 2. Make your changes
# ... develop and test your changes ...

# 3. Commit your changes
git add .
git commit -m "feat(scope): description of changes"

# 4. Push to your fork
git push origin feature/your-feature-name

# 5. Create pull request
# Use GitHub UI or CLI
```

## Code Standards

### TypeScript Guidelines

**Type Safety:**
```typescript
// ✅ Good: Explicit types
interface AgentConfig {
  name: string;
  portal: AIPortal;
  memory: MemoryProvider;
}

// ❌ Bad: Any types
function createAgent(config: any): any {
  // ...
}

// ✅ Good: Strict typing
function createAgent(config: AgentConfig): Promise<Agent> {
  // ...
}
```

**Null Safety:**
```typescript
// ✅ Good: Handle null/undefined
function getAgent(id: string): Agent | null {
  return agents.get(id) ?? null;
}

// ✅ Good: Use optional chaining
const agentName = agent?.config?.name ?? 'Unknown';

// ❌ Bad: Assume non-null
const agentName = agent.config.name;
```

**Error Handling:**
```typescript
// ✅ Good: Explicit error types
class PortalError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly provider: string
  ) {
    super(message);
    this.name = 'PortalError';
  }
}

// ✅ Good: Result pattern
type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

async function tryOperation(): Promise<Result<string>> {
  try {
    const result = await riskyOperation();
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}
```

### Naming Conventions

**Files and Directories:**
```
src/
├── core/
│   ├── agent.ts           # Main classes
│   ├── agent.test.ts      # Test files
│   └── agent.types.ts     # Type definitions
├── portals/
│   ├── openai-portal.ts   # Kebab case for files
│   └── anthropic-portal.ts
└── utils/
    ├── logger.ts
    └── validation.ts
```

**Variables and Functions:**
```typescript
// ✅ Good: Descriptive names
const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
const memoryProvider = createSQLiteMemory(config);

async function initializeAgentWithRetries(
  config: AgentConfig,
  maxRetries: number = 3
): Promise<Agent> {
  // ...
}

// ❌ Bad: Unclear names
const key = process.env.API_KEY;
const mp = createMemory(cfg);

async function init(c: any, r: number): Promise<any> {
  // ...
}
```

**Classes and Interfaces:**
```typescript
// ✅ Good: Clear, descriptive names
interface MemoryProvider {
  store(entry: MemoryEntry): Promise<string>;
  retrieve(id: string): Promise<MemoryEntry | null>;
}

class SQLiteMemoryProvider implements MemoryProvider {
  // ...
}

// ✅ Good: Use proper prefixes
interface AIPortalConfig {
  apiKey: string;
  model: string;
}

type EmotionState = 'happy' | 'sad' | 'angry';

enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}
```

### Code Organization

**Imports:**
```typescript
// ✅ Good: Organized imports
// 1. Node.js built-ins
import { readFileSync } from 'fs';
import { join } from 'path';

// 2. External libraries
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

// 3. Internal modules (absolute)
import { Logger } from '@/utils/logger.js';
import { validateConfig } from '@/utils/validation.js';

// 4. Relative imports
import { MemoryProvider } from '../types/memory.js';
import { createConnection } from './connection.js';
```

**Module Structure:**
```typescript
// ✅ Good: Consistent module structure

// Types and interfaces first
export interface ConfigOptions {
  // ...
}

// Constants
const DEFAULT_TIMEOUT = 5000;

// Main implementation
export class ComponentName {
  // ...
}

// Factory functions
export function createComponent(config: ConfigOptions): ComponentName {
  return new ComponentName(config);
}

// Default export (if applicable)
export default ComponentName;
```

### Performance Guidelines

**Memory Management:**
```typescript
// ✅ Good: Cleanup resources
class DatabaseConnection {
  private connection: Connection;

  async destroy(): Promise<void> {
    if (this.connection) {
      await this.connection.close();
      this.connection = null;
    }
  }
}

// ✅ Good: Use WeakMap for caches
const cache = new WeakMap<Object, CachedData>();

// ✅ Good: Limit memory usage
const MAX_CACHE_SIZE = 1000;
const cache = new Map<string, any>();

function addToCache(key: string, value: any): void {
  if (cache.size >= MAX_CACHE_SIZE) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
  cache.set(key, value);
}
```

**Async Patterns:**
```typescript
// ✅ Good: Use Promise.all for parallel operations
async function initializeComponents(): Promise<void> {
  const [portal, memory, extensions] = await Promise.all([
    initializePortal(),
    initializeMemory(),
    initializeExtensions()
  ]);
}

// ✅ Good: Use streaming for large data
async function* processLargeDataset(data: AsyncIterable<Item>) {
  for await (const item of data) {
    const processed = await processItem(item);
    yield processed;
  }
}

// ✅ Good: Implement timeouts
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Timeout')), timeoutMs);
  });
  
  return Promise.race([promise, timeout]);
}
```

## Testing Guidelines

### Test Structure

We use Jest for testing with the following structure:

```
src/
├── core/
│   ├── agent.ts
│   ├── agent.test.ts
│   └── __mocks__/
│       └── agent.ts
├── portals/
│   ├── openai-portal.ts
│   ├── openai-portal.test.ts
│   └── openai-portal.integration.test.ts
└── tests/
    ├── setup.ts
    ├── helpers/
    └── fixtures/
```

### Test Categories

**Unit Tests:**
```typescript
// src/core/agent.test.ts
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { SYMindXAgent } from './agent.js';
import { MockPortal } from './__mocks__/portal.js';
import { MockMemory } from './__mocks__/memory.js';

describe('SYMindXAgent', () => {
  let agent: SYMindXAgent;
  let mockPortal: MockPortal;
  let mockMemory: MockMemory;

  beforeEach(() => {
    mockPortal = new MockPortal();
    mockMemory = new MockMemory();
    agent = new SYMindXAgent({
      portal: mockPortal,
      memory: mockMemory
    });
  });

  describe('initialization', () => {
    it('should initialize successfully with valid config', async () => {
      await expect(agent.initialize()).resolves.not.toThrow();
      expect(agent.getStatus()).toBe('initialized');
    });

    it('should throw error with invalid config', async () => {
      const invalidAgent = new SYMindXAgent({} as any);
      await expect(invalidAgent.initialize()).rejects.toThrow();
    });
  });

  describe('chat functionality', () => {
    beforeEach(async () => {
      await agent.initialize();
    });

    it('should process chat messages', async () => {
      mockPortal.mockResponse('Hello! How can I help you?');
      
      const response = await agent.chat('Hello');
      
      expect(response).toBe('Hello! How can I help you?');
      expect(mockPortal.chat).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: 'Hello'
            })
          ])
        })
      );
    });

    it('should handle chat errors gracefully', async () => {
      mockPortal.mockError(new Error('API Error'));
      
      await expect(agent.chat('Hello')).rejects.toThrow('API Error');
    });
  });
});
```

**Integration Tests:**
```typescript
// src/portals/openai-portal.integration.test.ts
import { describe, it, expect } from '@jest/globals';
import { OpenAIPortal } from './openai-portal.js';

describe('OpenAI Portal Integration', () => {
  let portal: OpenAIPortal;

  beforeAll(() => {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY required for integration tests');
    }
    
    portal = new OpenAIPortal({
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-3.5-turbo'
    });
  });

  it('should connect to OpenAI API', async () => {
    await expect(portal.initialize()).resolves.not.toThrow();
  });

  it('should generate chat response', async () => {
    await portal.initialize();
    
    const response = await portal.chat({
      messages: [{ role: 'user', content: 'Say "test"' }]
    });
    
    expect(response.content).toContain('test');
  });
});
```

### Test Utilities

**Mock Factories:**
```typescript
// tests/helpers/mock-factory.ts
export function createMockPortal(overrides?: Partial<AIPortal>): jest.Mocked<AIPortal> {
  return {
    name: 'mock-portal',
    initialize: jest.fn().mockResolvedValue(undefined),
    chat: jest.fn().mockResolvedValue({
      content: 'Mock response',
      role: 'assistant'
    }),
    destroy: jest.fn().mockResolvedValue(undefined),
    ...overrides
  };
}

export function createMockMemory(overrides?: Partial<MemoryProvider>): jest.Mocked<MemoryProvider> {
  return {
    name: 'mock-memory',
    initialize: jest.fn().mockResolvedValue(undefined),
    store: jest.fn().mockResolvedValue('mock-id'),
    retrieve: jest.fn().mockResolvedValue(null),
    query: jest.fn().mockResolvedValue([]),
    delete: jest.fn().mockResolvedValue(undefined),
    destroy: jest.fn().mockResolvedValue(undefined),
    ...overrides
  };
}
```

**Test Fixtures:**
```typescript
// tests/fixtures/agent-config.ts
export const validAgentConfig: AgentConfig = {
  name: 'test-agent',
  portal: createMockPortal(),
  memory: createMockMemory(),
  character: {
    personality: 'helpful',
    background: 'Test agent'
  }
};

export const invalidAgentConfig: Partial<AgentConfig> = {
  name: '', // Invalid empty name
  // Missing required fields
};
```

### Test Commands

```bash
# Run all tests
bun test

# Run tests in watch mode
bun test:watch

# Run specific test file
bun test src/core/agent.test.ts

# Run tests with coverage
bun test --coverage

# Run only integration tests
bun test --testPathPattern=integration

# Run tests in CI mode
bun test --ci --coverage --watchAll=false
```

## Documentation Standards

### Code Documentation

**JSDoc Comments:**
```typescript
/**
 * Creates and manages an AI agent with configurable components.
 * 
 * @example
 * ```typescript
 * const agent = new SYMindXAgent({
 *   name: 'MyAgent',
 *   portal: createOpenAIPortal({ apiKey: 'sk-...' }),
 *   memory: createSQLiteMemory({ database: 'agent.db' })
 * });
 * 
 * await agent.initialize();
 * const response = await agent.chat('Hello!');
 * ```
 */
export class SYMindXAgent {
  /**
   * Initializes the agent and all its components.
   * 
   * @throws {AgentInitializationError} When initialization fails
   * @returns Promise that resolves when initialization is complete
   */
  async initialize(): Promise<void> {
    // ...
  }

  /**
   * Processes a chat message and returns a response.
   * 
   * @param message - The user's message
   * @param options - Optional chat configuration
   * @returns Promise resolving to the agent's response
   * 
   * @example
   * ```typescript
   * const response = await agent.chat('What is the weather like?', {
   *   emotion: 'happy',
   *   context: { location: 'San Francisco' }
   * });
   * ```
   */
  async chat(
    message: string,
    options?: ChatOptions
  ): Promise<string> {
    // ...
  }
}
```

### README Files

Each major component should have a README:

```markdown
# Component Name

Brief description of what this component does.

## Installation

```bash
# Installation commands
```

## Usage

```typescript
// Basic usage example
```

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| option1 | string | 'default' | Description of option1 |

## API Reference

### Methods

#### `methodName(param: Type): ReturnType`

Description of the method.

**Parameters:**
- `param` (Type) - Description of parameter

**Returns:**
Type - Description of return value

## Examples

### Basic Example

```typescript
// Code example
```

### Advanced Example

```typescript
// More complex example
```
```

### Changelog

Keep a CHANGELOG.md following [Keep a Changelog](https://keepachangelog.com/):

```markdown
# Changelog

## [Unreleased]

### Added
- New feature descriptions

### Changed
- Changes in existing functionality

### Deprecated
- Soon-to-be removed features

### Removed
- Removed features

### Fixed
- Bug fixes

### Security
- Security improvements

## [1.2.0] - 2024-01-15

### Added
- Claude 3.5 Sonnet support in Anthropic portal
- Memory consolidation feature
- Real-time emotion tracking in web interface

### Fixed
- SQLite connection leak in memory provider
- WebSocket reconnection in Discord extension
```

## Review Process

### Pull Request Requirements

Before submitting a PR, ensure:

- [ ] **Tests pass**: All existing and new tests pass
- [ ] **Type checking**: No TypeScript errors
- [ ] **Linting**: Code follows ESLint rules
- [ ] **Documentation**: Code is properly documented
- [ ] **Performance**: No significant performance regressions
- [ ] **Security**: No security vulnerabilities introduced

### PR Description Template

```markdown
## Description

Brief description of changes made.

## Type of Change

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that causes existing functionality to change)
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Refactoring (no functional changes)

## Related Issues

Fixes #123
Related to #456

## Testing

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed
- [ ] Performance testing completed (if applicable)

## Screenshots (if applicable)

[Include screenshots for UI changes]

## Breaking Changes

Describe any breaking changes and migration steps required.

## Checklist

- [ ] My code follows the style guidelines
- [ ] I have performed a self-review of my code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
```

### Review Criteria

Reviewers will check for:

1. **Correctness**: Does the code do what it's supposed to do?
2. **Quality**: Is the code well-written and maintainable?
3. **Performance**: Are there any performance issues?
4. **Security**: Are there any security concerns?
5. **Testing**: Is the code adequately tested?
6. **Documentation**: Is the code properly documented?
7. **Style**: Does the code follow project conventions?

## Community Guidelines

### Code of Conduct

We follow the [Contributor Covenant](https://www.contributor-covenant.org/):

- **Be respectful**: Treat everyone with respect and kindness
- **Be inclusive**: Welcome newcomers and help them succeed
- **Be collaborative**: Work together to improve the project
- **Be constructive**: Provide helpful feedback and suggestions

### Communication Channels

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General questions and discussions
- **Discord**: Real-time chat and community support
- **Email**: security@symindx.com for security issues

### Getting Help

If you need help:

1. **Search existing issues** and discussions
2. **Read the documentation** thoroughly
3. **Ask in Discord** for quick questions
4. **Create a GitHub issue** for bugs or feature requests

### Recognition

Contributors are recognized in:

- **CONTRIBUTORS.md**: List of all contributors
- **Release notes**: Major contributions highlighted
- **Discord roles**: Special contributor roles
- **Swag**: Stickers and merchandise for active contributors

Thank you for contributing to SYMindX! Your efforts help make this project better for everyone. 🚀 