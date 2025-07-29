# SYMindX Error Handling Framework Guide

## Overview

The SYMindX Error Handling Framework provides comprehensive error management, recovery strategies, and analytics for the entire agent runtime system. This guide covers implementation patterns, best practices, and usage examples.

## Architecture Components

### 1. Core Error Handler (`error-handler.ts`)
- **Circuit Breaker**: Prevents cascading failures
- **Retry Logic**: Exponential backoff with configurable limits  
- **Recovery Strategies**: Retry, fallback, graceful degradation
- **Error Classification**: Categorization and severity levels
- **Metrics Collection**: Error tracking and analysis

### 2. Standard Error Classes (`standard-errors.ts`)  
- **Unified Error Hierarchy**: `SYMindXError` base class
- **Domain-Specific Errors**: Portal, Extension, Memory, Network, etc.
- **Error Factories**: Convenient error creation functions
- **Safe Operations**: `safeAsync()` and `safeSync()` wrappers
- **Type Guards**: Error identification and classification

### 3. Portal Integration (`portal-error-integration.ts`)
- **AI-Specific Error Patterns**: Rate limits, authentication, model errors
- **Fallback Strategies**: Automatic portal switching
- **Health Monitoring**: Portal connectivity and performance tracking
- **Error Enhancement**: AI provider context and metadata

### 4. Runtime Integration (`runtime-error-integration.ts`)
- **Agent Wrapping**: Comprehensive agent error handling
- **Configuration Management**: Runtime-wide error handling setup
- **Health Reports**: System health and recommendations
- **Component Coordination**: Unified error handling across all components

## Quick Start

### Basic Setup

```typescript
import { 
  initializeRuntimeErrorHandling,
  wrapAgentWithErrorHandling 
} from './core/runtime-error-integration.js';
import { errorHandler } from './utils/error-handler.js';

// Initialize error handling system
await initializeRuntimeErrorHandling(runtimeConfig);

// Wrap agents with error handling
const enhancedAgent = wrapAgentWithErrorHandling(agent);

// Monitor system health
const healthReport = errorHandler.getSystemAnalytics();
```

### Component Registration

```typescript
import { errorHandler } from './utils/error-handler.js';

// Register a custom component
errorHandler.registerComponent({
  componentName: 'my-extension',
  defaultCategory: ErrorCategory.SYSTEM,
  defaultSeverity: ErrorSeverity.MEDIUM,
  enableRetry: true,
  maxRetries: 3,
  enableCircuitBreaker: true,
  enableFallback: false,
});
```

### Portal Error Handling

```typescript
import { 
  portalErrorHandler,
  registerPortalWithFallback,
  wrapPortalWithErrorHandling 
} from './portals/portal-error-integration.js';

// Register portal with fallback chain
registerPortalWithFallback('openai', ['anthropic', 'groq']);

// Wrap portal instance
const enhancedPortal = wrapPortalWithErrorHandling(portal, 'openai');
```

## Usage Patterns

### 1. Safe Operations

```typescript
import { safeAsync, createRuntimeError } from './utils/standard-errors.js';

// Safe async operation
const { data, error } = await safeAsync(
  async () => riskyOperation(),
  (err) => createRuntimeError('Operation failed', 'OP_FAILED', {}, err)
);

if (error) {
  console.error('Operation failed:', error.message);
  return;
}

console.log('Success:', data);
```

### 2. Function Wrapping

```typescript
import { withRuntimeErrorHandling } from './utils/error-handler.js';

const safeFn = withRuntimeErrorHandling(async (input: string) => {
  // This function is now wrapped with error handling
  return processInput(input);
});

try {
  const result = await safeFn('test-input');
  console.log('Result:', result);
} catch (error) {
  // Error has been processed through the framework
  console.error('Processed error:', error.message);
}
```

### 3. Component Error Handling

```typescript
import { errorHandler } from './utils/error-handler.js';

class MyExtension {
  async performOperation(data: any) {
    return await errorHandler.handleComponentError(
      'my-extension',
      new Error('Operation failed'),
      async () => {
        // Your operation logic here
        return await processData(data);
      },
      { operationName: 'performOperation', data }
    );
  }
}
```

### 4. Portal Operations

```typescript
import { portalErrorHandler } from './portals/portal-error-integration.js';

class MyPortal implements Portal {
  async generateResponse(messages: Message[]) {
    return await portalErrorHandler.handlePortalOperation(
      'my-portal',
      async () => {
        // Portal-specific logic
        return await this.callAPI(messages);
      },
      {
        portalName: 'my-portal',
        operation: 'generateResponse',
        model: this.model,
      }
    );
  }
}
```

### 5. Error Analytics and Monitoring

```typescript
import { errorHandler } from './utils/error-handler.js';

// Get system-wide analytics
const analytics = errorHandler.getSystemAnalytics();
console.log('System Error Rate:', analytics.overall.errorRate);
console.log('Active Alerts:', analytics.alerts.length);

// Get component health
const componentHealth = errorHandler.getComponentHealth('my-component');
console.log('Component Status:', componentHealth.status);
console.log('Recommendations:', componentHealth.recommendations);

// Export data for external analysis
const csvData = errorHandler.exportAnalytics('csv');
await fs.writeFile('error-report.csv', csvData);
```

## Best Practices

### 1. Error Creation

**✅ Do**: Use specific error types
```typescript
// Good - specific error with context
throw createPortalError(
  'OpenAI API rate limit exceeded',
  'openai',
  'gpt-4',
  'RATE_LIMIT_EXCEEDED',
  { requestId, retryAfter: 60 }
);
```

**❌ Don't**: Use generic errors
```typescript
// Bad - generic error without context
throw new Error('Something went wrong');
```

### 2. Error Context

**✅ Do**: Provide rich context
```typescript
const error = createAgentError(
  'Agent thinking process failed',
  'THINKING_FAILED',
  agentId,
  'think',
  {
    thoughtContext: context,
    stage: 'reasoning',
    attempt: 2,
    duration: Date.now() - startTime,
  }
);
```

**❌ Don't**: Lose important context
```typescript
// Bad - no context for debugging
throw createAgentError('Failed', 'FAILED', agentId);
```

### 3. Recovery Strategies

**✅ Do**: Implement appropriate fallbacks
```typescript
// Register with fallback chain
registerPortalWithFallback('primary-portal', [
  'fallback-portal-1',
  'fallback-portal-2'
]);

// Custom fallback logic
errorHandler.registerComponent({
  componentName: 'my-service',
  // ... config
  fallbackHandler: async (error) => {
    if (error.code === 'SERVICE_UNAVAILABLE') {
      return await this.useLocalCache();
    }
    throw error;
  }
});
```

**❌ Don't**: Ignore recovery opportunities
```typescript
// Bad - no recovery strategy
try {
  return await primaryService.call();
} catch (error) {
  throw error; // No fallback, no recovery
}
```

### 4. Circuit Breaker Usage

**✅ Do**: Use circuit breakers for external services
```typescript
enhancedErrorHandler.registerComponent({
  componentName: 'external-api',
  enableCircuitBreaker: true,
  enableRetry: true,
  maxRetries: 3,
  // Circuit breaker will open after failures
});
```

**❌ Don't**: Use circuit breakers for user errors
```typescript
// Bad - circuit breaker for validation errors
enhancedErrorHandler.registerComponent({
  componentName: 'user-input-validator',
  enableCircuitBreaker: true, // Wrong - user errors aren't service failures
});
```

### 5. Monitoring and Alerts

**✅ Do**: Set appropriate thresholds
```typescript
initializeErrorAnalytics({
  alertThresholds: {
    errorRate: 0.05,      // 5% error rate threshold
    criticalErrors: 3,     // Alert after 3 critical errors
    circuitBreakerTrips: 2 // Alert after 2 circuit breaker trips
  }
});
```

**❌ Don't**: Set overly sensitive thresholds
```typescript
// Bad - too sensitive, will generate noise
initializeErrorAnalytics({
  alertThresholds: {
    errorRate: 0.001,     // 0.1% - too sensitive
    criticalErrors: 1,    // Alert on first critical error - too noisy
  }
});
```

## Error Categories and Severity Levels

### Error Categories

- **`SYSTEM`**: Core system failures, portal issues
- **`NETWORK`**: Connection problems, timeouts
- **`VALIDATION`**: Input validation, data format errors
- **`AUTHENTICATION`**: API key issues, auth failures
- **`AUTHORIZATION`**: Permission denied, access control
- **`RESOURCE`**: Memory issues, storage problems
- **`CONFIGURATION`**: Setup errors, missing config
- **`RUNTIME`**: General runtime errors, unexpected failures
- **`USER`**: User-caused errors, invalid requests

### Severity Levels

- **`CRITICAL`**: System-threatening errors requiring immediate attention
- **`HIGH`**: Important errors that may affect functionality
- **`MEDIUM`**: Standard errors with some impact
- **`LOW`**: Minor issues or informational errors

## Recovery Strategies

### Available Strategies

1. **`NONE`**: No automatic recovery
2. **`RETRY`**: Exponential backoff retry
3. **`FALLBACK`**: Switch to alternative implementation
4. **`CIRCUIT_BREAKER`**: Prevent further requests when failing
5. **`GRACEFUL_DEGRADATION`**: Provide reduced functionality
6. **`RESTART`**: Component or system restart

### Strategy Selection Guidelines

| Error Type | Recommended Strategy | Reasoning |
|------------|---------------------|-----------|
| Network timeout | `RETRY` | Transient issue likely to resolve |
| API rate limit | `CIRCUIT_BREAKER` | Prevent further limit violations |
| Service unavailable | `FALLBACK` | Switch to backup service |
| Invalid input | `NONE` | User error, no recovery needed |
| Memory exhaustion | `GRACEFUL_DEGRADATION` | Reduce functionality to continue |
| Critical system error | `RESTART` | Full recovery needed |

## Monitoring and Alerting

### Health Check Endpoints

```typescript
import { getRuntimeHealthReport } from './core/runtime-error-integration.js';

// HTTP endpoint for health checks
app.get('/health', (req, res) => {
  const health = getRuntimeHealthReport();
  
  res.status(health.status === 'healthy' ? 200 : 503).json({
    status: health.status,
    timestamp: new Date().toISOString(),
    components: health.components,
    recommendations: health.recommendations
  });
});
```

### Alert Webhook Integration

```typescript
import { errorAnalytics } from './utils/error-analytics.js';

// Monitor for new alerts
setInterval(() => {
  const alerts = errorAnalytics.getActiveAlerts();
  
  alerts.forEach(alert => {
    if (alert.severity === 'critical') {
      // Send to monitoring system
      sendWebhook({
        type: 'error_alert',
        alert,
        timestamp: alert.timestamp,
      });
    }
  });
}, 60000); // Check every minute
```

### Dashboard Integration

```typescript
import { errorAnalytics } from './utils/error-analytics.js';

// Dashboard data endpoint
app.get('/api/error-analytics', (req, res) => {
  const analytics = errorAnalytics.getSystemAnalytics();
  
  res.json({
    overview: analytics.overall,
    components: analytics.components.map(comp => ({
      name: comp.componentName,
      status: comp.status,
      errorRate: comp.errorRate,
      avgResponseTime: comp.avgResponseTime,
      recommendations: comp.recommendations
    })),
    trends: analytics.trends,
    topErrors: analytics.topErrors,
    alerts: analytics.alerts
  });
});
```

## Testing Error Handling

### Unit Tests

```typescript
import { enhancedErrorHandler } from './utils/enhanced-error-handler.js';

describe('Component Error Handling', () => {
  beforeEach(() => {
    enhancedErrorHandler.registerComponent({
      componentName: 'test-component',
      defaultCategory: ErrorCategory.RUNTIME,
      defaultSeverity: ErrorSeverity.MEDIUM,
      enableRetry: true,
      maxRetries: 2,
      enableCircuitBreaker: false,
      enableFallback: false,
    });
  });

  test('should handle component errors with retry', async () => {
    let attempts = 0;
    
    const result = await enhancedErrorHandler.handleComponentError(
      'test-component',
      new Error('Test error'),
      async () => {
        attempts++;
        if (attempts < 3) throw new Error('Retry needed');
        return 'success';
      }
    );

    expect(result.success).toBe(true);
    expect(result.attempts).toBe(3);
    expect(result.data).toBe('success');
  });
});
```

### Integration Tests

```typescript
import { portalErrorHandler } from './portals/portal-error-integration.js';

describe('Portal Error Integration', () => {
  test('should fallback to secondary portal on failure', async () => {
    portalErrorHandler.registerPortal('primary', {
      enabled: true,
      fallbackPortals: ['secondary'],
      maxFallbackRetries: 1,
      fallbackDelayMs: 100,
    });

    let primaryCalled = false;
    let secondaryCalled = false;

    const result = await portalErrorHandler.handlePortalOperation(
      'primary',
      async () => {
        primaryCalled = true;
        throw new Error('Primary portal failed');
      },
      { portalName: 'primary', operation: 'test' }
    );

    expect(primaryCalled).toBe(true);
    // Note: In real implementation, secondary would be called
  });
});
```

## Performance Considerations

### Memory Management

- Error history is automatically cleaned up based on retention policies
- Circuit breaker state is stored efficiently
- Metrics use rolling windows to limit memory usage

### Performance Impact

- Error handling adds ~1-5ms overhead per operation
- Circuit breakers prevent resource waste on failing services
- Analytics processing is done asynchronously
- Batch processing for high-volume error scenarios

### Optimization Tips

1. **Tune Retry Policies**: Balance recovery vs. performance
2. **Set Appropriate Timeouts**: Prevent hanging operations
3. **Use Circuit Breakers**: Fail fast on broken services
4. **Monitor Memory Usage**: Adjust retention policies as needed
5. **Batch Analytics**: Process errors in batches during low load

## Troubleshooting

### Common Issues

1. **High Memory Usage**
   - **Cause**: Long retention periods or high error volume
   - **Solution**: Reduce retention days or increase cleanup frequency

2. **Circuit Breaker Not Opening**
   - **Cause**: Threshold too high or timeout too long
   - **Solution**: Adjust `circuitBreakerThreshold` and `circuitBreakerTimeout`

3. **Too Many Alerts**
   - **Cause**: Thresholds set too low
   - **Solution**: Increase alert thresholds or add alert suppression

4. **Fallback Not Working**
   - **Cause**: Fallback portals not registered or misconfigured
   - **Solution**: Verify portal registration and health status

### Debug Information

```typescript
import { errorHandler } from './utils/error-handler.js';
import { portalErrorHandler } from './portals/portal-error-integration.js';

// Check circuit breaker status
const cbStatus = errorHandler.getCircuitBreakerStatus('my-component');
console.log('Circuit Breaker:', cbStatus);

// Check portal health
const portalHealth = portalErrorHandler.getAllPortalHealth();
console.log('Portal Health:', portalHealth);

// Get error metrics
const metrics = errorHandler.getMetrics();
console.log('Error Metrics:', metrics);
```

## Migration Guide

### From Basic Error Handling

```typescript
// Before: Basic try-catch
try {
  const result = await riskyOperation();
  return result;
} catch (error) {
  console.error('Error:', error);
  throw error;
}

// After: Enhanced error handling
const { data, error } = await safeAsync(
  () => riskyOperation(),
  (err) => createRuntimeError('Operation failed', 'OP_FAILED', { operation: 'risky' }, err)
);

if (error) {
  console.error('Enhanced error:', formatError(error));
  throw error;
}

return data;
```

### Adding Component Registration

```typescript
// Initialize error handling for existing components
enhancedErrorHandler.registerComponent({
  componentName: 'existing-component',
  defaultCategory: ErrorCategory.RUNTIME,
  defaultSeverity: ErrorSeverity.MEDIUM,
  enableRetry: true,
  maxRetries: 3,
  enableCircuitBreaker: false,
  enableFallback: false,
});

// Wrap existing functions
const existingFunction = enhancedErrorHandler.wrapComponentFunction(
  'existing-component',
  originalFunction
);
```

## Advanced Topics

### Custom Recovery Strategies

```typescript
import { RecoveryStrategy } from './utils/error-handler.js';

// Implement custom recovery logic
class CustomRecoveryHandler {
  async handleError(error: SYMindXError, operation: () => Promise<any>) {
    switch (error.code) {
      case 'RATE_LIMIT_EXCEEDED':
        const retryAfter = error.context?.retryAfter || 60;
        await this.sleep(retryAfter * 1000);
        return await operation();
      
      case 'SERVICE_UNAVAILABLE':
        return await this.fallbackToCache();
      
      default:
        throw error;
    }
  }
}
```

### Custom Error Types

```typescript
import { SYMindXError, ErrorCategory, ErrorSeverity } from './utils/standard-errors.js';

export class CustomError extends SYMindXError {
  public readonly customProperty: string;

  constructor(
    message: string,
    customProperty: string,
    context?: Record<string, unknown>,
    cause?: Error
  ) {
    super(
      message,
      'CUSTOM_ERROR',
      ErrorCategory.RUNTIME,
      ErrorSeverity.MEDIUM,
      { ...context, customProperty },
      cause
    );
    
    this.customProperty = customProperty;
  }
}
```

### External System Integration

```typescript
// Webhook notifications
errorAnalytics.onAlert((alert) => {
  if (alert.severity === 'critical') {
    sendToSlack({
      channel: '#alerts',
      message: `🚨 Critical Error: ${alert.message}`,
      fields: {
        Component: alert.component,
        Time: alert.timestamp.toISOString(),
      }
    });
  }
});

// Metrics export to monitoring systems
setInterval(() => {
  const metrics = errorAnalytics.getSystemAnalytics();
  
  sendToDatadog({
    'symindx.error_rate': metrics.overall.errorRate,
    'symindx.avg_response_time': metrics.overall.avgResponseTime,
    'symindx.active_alerts': metrics.alerts.length,
  });
}, 60000);
```

## Conclusion

The SYMindX Error Handling Framework provides comprehensive error management capabilities designed for resilient AI agent systems. By following the patterns and best practices outlined in this guide, you can build robust applications that gracefully handle failures, provide detailed diagnostics, and maintain high availability.

For additional support or questions, refer to the source code documentation or create an issue in the project repository.