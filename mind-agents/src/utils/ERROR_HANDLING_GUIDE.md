# SYMindX Error Handling Guide

This document outlines the unified error handling system implemented across the SYMindX codebase to reduce technical debt and ensure consistent error patterns.

## Architecture Overview

The error handling system consists of three main components:

1. **ErrorHandler** (`error-handler.ts`) - Core error handling and recovery system
2. **Standard Errors** (`standard-errors.ts`) - Standardized error classes and utilities
3. **Integration Pattern** - Consistent usage across all modules

## Standard Error Classes

### Base Error Class

All SYMindX errors extend `SYMindXError`, which provides:

- Structured error information (category, severity, code, context)
- Automatic timestamp and error ID generation
- Error chaining for root cause analysis
- JSON serialization for logging and debugging

### Specialized Error Classes

```typescript
// Portal-related errors (AI provider issues)
PortalError - For AI provider failures, connection issues, model errors

// Extension-related errors  
ExtensionError - For plugin/extension failures, action errors

// Configuration-related errors
ConfigurationError - For invalid configs, missing settings, validation failures

// Memory provider errors
MemoryError - For database connection issues, query failures

// Authentication and authorization errors
AuthError - For login failures, permission denied, token issues

// Network-related errors
NetworkError - For HTTP errors, connection timeouts, API failures

// Validation errors
ValidationError - For input validation, schema validation, data integrity

// Agent-related errors
AgentError - For agent lifecycle issues, state management problems

// Tool system errors
ToolError - For tool execution failures, missing tools

// General runtime errors
RuntimeError - For general execution failures, unexpected conditions
```

## Usage Patterns

### Basic Error Creation

```typescript
import { createPortalError, createConfigurationError } from '../utils/standard-errors';

// Create a portal error
throw createPortalError(
  'OpenAI API request failed',
  'openai',           // portal type
  'gpt-4',           // model
  'API_REQUEST_FAILED', // optional error code
  {                  // optional context
    requestId: '123',
    statusCode: 429
  },
  originalError      // optional cause
);

// Create a configuration error
throw createConfigurationError(
  'Missing required API key',
  'config.json',     // config path
  'apiKey',          // field name
  'MISSING_API_KEY', // error code
  { required: true }, // context
  originalError      // cause
);
```

### Safe Operation Wrappers

```typescript
import { safeAsync, safeSync } from '../utils/standard-errors';

// Async operations
const { data, error } = await safeAsync(
  async () => await apiCall(),
  (err) => createNetworkError('API call failed', url, 'GET', undefined, 'API_CALL_ERROR', {}, err)
);

if (error) {
  console.error('Operation failed:', formatError(error));
  return;
}

// Use data safely here
```

### Error Handler Integration

```typescript
import { errorHandler } from '../utils/error-handler';

// Automatic error handling with recovery
const result = await errorHandler.handleError(
  createPortalError('Generation failed', 'openai', 'gpt-4'),
  async () => {
    // The operation to retry/recover
    return await generateResponse();
  },
  {
    // Context for recovery
    agentId: 'agent-123',
    operation: 'generateResponse'
  }
);

if (result.success) {
  console.log('Operation succeeded:', result.data);
} else {
  console.error('Recovery failed:', result.error);
}
```

### Function Wrapping

```typescript
import { errorHandler } from '../utils/error-handler';

// Wrap a function with automatic error handling
const safeGenerate = errorHandler.wrap(
  async (prompt: string) => {
    return await portal.generateText(prompt);
  },
  { operation: 'textGeneration' }
);

// Use the wrapped function
try {
  const result = await safeGenerate('Hello world');
  console.log(result);
} catch (error) {
  // Error has been handled and potentially recovered
  console.error('Final failure:', error);
}
```

## Error Recovery Strategies

The error handler automatically determines recovery strategies based on error category and severity:

- **NETWORK** errors → Retry with exponential backoff
- **RESOURCE** errors → Graceful degradation
- **CONFIGURATION** errors → Fallback to defaults
- **VALIDATION** errors → No recovery (fail fast)
- **CRITICAL** errors → System restart

### Custom Recovery

```typescript
// Configure error handler with custom settings
const customErrorHandler = ErrorHandler.createTestInstance({
  retryAttempts: 5,
  retryDelay: 2000,
  enableCircuitBreaker: true,
  circuitBreakerThreshold: 3,
});
```

## Logging Integration

The system integrates with the existing `runtimeLogger`:

```typescript
import { formatError } from '../utils/standard-errors';

try {
  await riskyOperation();
} catch (error) {
  const structuredError = createRuntimeError(
    'Operation failed',
    'RISKY_OPERATION_ERROR',
    { operationId: '123' },
    error
  );
  
  // Consistent error formatting
  runtimeLogger.error(formatError(structuredError));
  
  // Or log the full structured error
  runtimeLogger.error('Operation failed', structuredError.toJSON());
}
```

## Migration Patterns

### Before (Inconsistent)

```typescript
// Old inconsistent patterns
try {
  const result = await apiCall();
} catch (error) {
  console.error('API call failed:', error);
  throw new Error(`Failed: ${error}`);
}

// Mixed patterns
someOperation().catch(err => {
  logger.error('Operation failed', err);
  return fallbackValue;
});
```

### After (Standardized)

```typescript
// New consistent pattern
try {
  const result = await apiCall();
} catch (error) {
  throw createNetworkError(
    'API call failed',
    url,
    'POST',
    error.status,
    'API_CALL_ERROR',
    { endpoint: '/api/chat' },
    error
  );
}

// Or using safe wrapper
const { data, error } = await safeAsync(
  () => apiCall(),
  (err) => createNetworkError('API call failed', url, 'POST', undefined, 'API_CALL_ERROR', {}, err)
);
```

## Error Metrics and Monitoring

The error handler provides built-in metrics:

```typescript
// Get error statistics
const metrics = errorHandler.getMetrics();
console.log('Error counts by type:', metrics);

// Check circuit breaker status
const status = errorHandler.getCircuitBreakerStatus('api-calls');
console.log('Circuit breaker state:', status);

// Reset metrics (useful for testing)
errorHandler.resetMetrics();
```

## Testing Patterns

```typescript
import { ErrorHandler } from '../utils/error-handler';
import { createRuntimeError } from '../utils/standard-errors';

describe('Error handling', () => {
  let testErrorHandler: ErrorHandler;
  
  beforeEach(() => {
    testErrorHandler = ErrorHandler.createTestInstance({
      retryAttempts: 2,
      retryDelay: 100,
    });
  });
  
  it('should retry failed operations', async () => {
    let attempts = 0;
    const operation = async () => {
      attempts++;
      if (attempts < 2) {
        throw new Error('Temporary failure');
      }
      return 'success';
    };
    
    const result = await testErrorHandler.handleError(
      createRuntimeError('Test error'),
      operation
    );
    
    expect(result.success).toBe(true);
    expect(result.data).toBe('success');
    expect(attempts).toBe(2);
  });
});
```

## Migration Checklist

When migrating a module to use the unified error handling:

1. **Import the standard errors**: Add imports for relevant error types
2. **Replace throw statements**: Convert `throw new Error()` to appropriate `create*Error()` calls
3. **Update try-catch blocks**: Use `formatError()` for consistent logging
4. **Add context**: Include relevant context information in error creation
5. **Consider recovery**: Use `errorHandler.handleError()` for operations that could benefit from retry/recovery
6. **Update tests**: Verify error types and messages in test assertions

## Best Practices

1. **Use specific error types**: Choose the most appropriate error class for the situation
2. **Include context**: Always provide relevant context information
3. **Chain errors**: Pass the original error as the cause parameter
4. **Don't over-catch**: Let errors bubble up unless you can meaningfully handle them
5. **Log consistently**: Use `formatError()` for consistent error formatting
6. **Test error paths**: Write tests for error conditions and recovery scenarios
7. **Monitor metrics**: Regularly check error metrics for patterns and issues

## Performance Considerations

- Error creation is lightweight but includes stack trace capture
- Circuit breakers prevent cascading failures
- Recovery strategies avoid unnecessary retries
- Metrics collection has minimal overhead
- Error formatting is optimized for readability and machine parsing

This unified system provides consistent error handling across the entire SYMindX codebase while enabling automatic recovery and comprehensive monitoring.