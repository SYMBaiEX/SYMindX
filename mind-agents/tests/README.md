# SYMindX Test Suite

This directory contains all tests for the SYMindX mind-agents system.

## Structure

```
tests/
├── unit/           # Unit tests for individual modules
├── integration/    # Integration tests for system components
└── scripts/        # Test utilities and debugging scripts
```

## Running Tests

### Using Bun (Recommended)
```bash
# Run all tests
bun test

# Run tests with coverage
bun test --coverage

# Run specific test file
bun test tests/unit/runtime.test.ts

# Run tests in watch mode
bun test --watch
```

### Using Jest
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Run with verbose output
npm run test:verbose
```

## Test Files

### Unit Tests
- `runtime.test.ts` - Core runtime system tests
- `registry.test.ts` - Module registry tests
- `event-bus.test.ts` - Event system tests
- `error-handler.test.ts` - Error handling tests
- `config-validator.test.ts` - Configuration validation tests

### Integration Tests
- `integration.test.ts` - Cross-system integration tests

### Test Scripts
- `test-agent-loading.js` - Agent loading verification
- `test-runtime.js` - Runtime functionality testing
- `debug-agents.cjs` - Agent debugging utilities

## Writing Tests

All tests should follow the pattern:
- Use descriptive test names
- Test one thing at a time
- Include both positive and negative test cases
- Mock external dependencies
- Clean up after tests

Example:
```typescript
import { describe, it, expect } from 'bun:test';

describe('MyModule', () => {
  it('should do something correctly', () => {
    // Arrange
    const input = 'test';
    
    // Act
    const result = myFunction(input);
    
    // Assert
    expect(result).toBe('expected');
  });
});
```