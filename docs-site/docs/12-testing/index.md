---
sidebar_position: 12
sidebar_label: "Testing"
title: "Testing"
description: "Testing strategies and tools"
---

# Testing

Testing strategies and tools

## Overview

SYMindX follows a comprehensive testing strategy to ensure reliability, performance, and maintainability. Our testing framework combines unit tests, integration tests, and end-to-end tests using Jest and modern TypeScript testing patterns.

## Testing Philosophy

Testing in SYMindX adheres to these core principles:

- **Test Early, Test Often**: Write tests alongside code development
- **Coverage Matters**: Aim for >80% code coverage with meaningful tests
- **Real-World Scenarios**: Focus on testing actual user workflows
- **Fast Feedback**: Keep tests fast to enable rapid development cycles
- **Isolation**: Each test should be independent and repeatable

## Test Types

### Unit Tests
Unit tests verify individual components in isolation:

```typescript
// Example: Testing a memory provider
describe('SQLiteMemoryProvider', () => {
  it('should store and retrieve memories', async () => {
    const provider = createMemoryProvider('sqlite', { dbPath: ':memory:' });
    await provider.save({ content: 'Test memory', agentId: 'test-agent' });
    
    const memories = await provider.search({ query: 'Test' });
    expect(memories).toHaveLength(1);
    expect(memories[0].content).toBe('Test memory');
  });
});
```

### Integration Tests
Integration tests verify component interactions:

```typescript
// Example: Testing agent with modules
describe('Agent Integration', () => {
  it('should process emotions through cognition', async () => {
    const agent = new Agent({
      id: 'test-agent',
      modules: {
        emotion: createEmotionModule('rune_emotion_stack'),
        cognition: createCognitionModule('htn_planner')
      }
    });
    
    await agent.perceive({ event: 'user_message', data: 'Hello!' });
    expect(agent.emotionState.happiness).toBeGreaterThan(0);
  });
});
```

### End-to-End Tests
E2E tests verify complete user workflows:

```typescript
// Example: Testing WebSocket communication
describe('WebSocket API E2E', () => {
  it('should handle agent lifecycle', async () => {
    const client = new WebSocketClient('ws://localhost:3000');
    
    await client.connect();
    await client.send({ command: 'agent.start', agentId: 'nyx' });
    
    const response = await client.waitForMessage('agent.started');
    expect(response.agentId).toBe('nyx');
  });
});
```

## Testing Tools

### Jest Configuration
SYMindX uses Jest with TypeScript support:

```javascript
// jest.config.js
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        module: 'esnext',
        target: 'esnext'
      }
    }]
  }
};
```

### Testing Utilities
Custom utilities for common testing patterns:

```typescript
// test-utils.ts
export function createMockAgent(overrides?: Partial<AgentConfig>) {
  return new Agent({
    id: 'test-agent',
    name: 'Test Agent',
    ...overrides
  });
}

export async function waitForEmission(
  eventBus: EventBus,
  event: string,
  timeout = 5000
): Promise<any> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timeout')), timeout);
    eventBus.once(event, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}
```

## Best Practices

### 1. Use Descriptive Test Names
```typescript
// Good
it('should return empty array when no memories match the search query', ...)

// Bad
it('search test', ...)
```

### 2. Follow AAA Pattern
Arrange, Act, Assert:
```typescript
it('should update emotion state', () => {
  // Arrange
  const emotion = createEmotionModule('rune_emotion_stack');
  
  // Act
  emotion.updateState({ happiness: 10 });
  
  // Assert
  expect(emotion.getState().happiness).toBe(10);
});
```

### 3. Mock External Dependencies
```typescript
jest.mock('@ai-sdk/openai');

it('should handle AI provider errors gracefully', async () => {
  mockOpenAI.generateText.mockRejectedValue(new Error('API Error'));
  
  const result = await agent.think('Test prompt');
  expect(result.error).toBeDefined();
  expect(agent.isOperational).toBe(true);
});
```

### 4. Test Error Scenarios
```typescript
it('should handle database connection failure', async () => {
  const provider = createMemoryProvider('sqlite', { dbPath: '/invalid/path' });
  
  await expect(provider.initialize()).rejects.toThrow('Database connection failed');
});
```

## Running Tests

### Command Line
```bash
# Run all tests
bun test

# Run tests in watch mode
bun test --watch

# Run tests with coverage
bun test --coverage

# Run specific test file
bun test src/modules/memory/sqlite.test.ts

# Run tests matching pattern
bun test --testNamePattern="memory"
```

### VS Code Integration
Install the Jest extension for inline test running and debugging:
```json
// .vscode/settings.json
{
  "jest.autoRun": {
    "watch": true,
    "onSave": "test-file"
  },
  "jest.showCoverageOnLoad": true
}
```

## Test Coverage

Monitor and maintain test coverage:

```bash
# Generate coverage report
bun test --coverage

# View coverage in browser
open coverage/lcov-report/index.html
```

Target coverage goals:
- **Statements**: >85%
- **Branches**: >80%
- **Functions**: >85%
- **Lines**: >85%

## Continuous Integration

Tests run automatically on every commit:

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun test --coverage
      - uses: codecov/codecov-action@v3
```

## Performance Testing

For performance-critical code:

```typescript
describe('Performance', () => {
  it('should process 1000 memories in under 100ms', async () => {
    const start = performance.now();
    
    for (let i = 0; i < 1000; i++) {
      await provider.save({ content: `Memory ${i}` });
    }
    
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(100);
  });
});
```

## Next Steps

- Explore [Unit Testing Guide](./unit-testing) for detailed patterns
- Learn about [Integration Testing](./integration-testing) strategies
- Set up [E2E Testing](./e2e-testing) for your extensions
- Configure [Test Automation](./automation) for your workflow
