# SYMindX Observability System

A comprehensive observability solution providing unified logging, metrics, tracing, health monitoring, and alerting across all SYMindX components with intelligent overhead management.

## Features

- **🔍 Distributed Tracing**: End-to-end request tracing across agent interactions, portal calls, and extension operations
- **📊 Metrics Collection**: Comprehensive metrics with Prometheus export and real-time aggregation
- **🚨 Intelligent Alerting**: Predictive alerting with customizable rules and automated response actions
- **💊 Health Monitoring**: Automated health checks with degradation detection and recovery recommendations
- **📈 Real-time Dashboard**: Interactive dashboard with customizable widgets and live data streaming
- **⚡ Performance Optimized**: <5ms observability overhead with intelligent sampling and caching

## Quick Start

### Basic Setup

```typescript
import { ObservabilityManager, DEFAULT_OBSERVABILITY_CONFIG } from './core/observability/index.js';

// Initialize observability system
const observability = ObservabilityManager.getInstance({
  ...DEFAULT_OBSERVABILITY_CONFIG,
  tracing: {
    ...DEFAULT_OBSERVABILITY_CONFIG.tracing,
    sampleRate: 0.1, // 10% sampling
  },
  metrics: {
    ...DEFAULT_OBSERVABILITY_CONFIG.metrics,
    collectionIntervalMs: 5000, // 5 second intervals
  },
});

// Start the system
observability.start();
```

### Environment Configuration

The system automatically adapts to your environment:

```bash
# Development (100% sampling, debugging enabled)
NODE_ENV=development

# Staging (50% sampling, moderate monitoring)
NODE_ENV=staging

# Production (1% sampling, optimized for performance)
NODE_ENV=production
```

## Core Components

### 1. Tracing System

Provides distributed tracing with correlation IDs and span management:

```typescript
import { withTracing, traceAgentOperation } from './core/observability/utils.js';

class MyAgent {
  @withTracing('agent_think')
  async think(input: string): Promise<string> {
    // Method automatically traced
    return "thinking...";
  }

  async processRequest(agentId: string, request: string): Promise<string> {
    return traceAgentOperation(
      agentId,
      'process_request',
      async (context) => {
        // Your processing logic with automatic tracing
        return "processed";
      }
    );
  }
}
```

### 2. Metrics Collection

Automatic and custom metrics with multiple export formats:

```typescript
import { withMetrics } from './core/observability/utils.js';

class MyService {
  @withMetrics('service_operation_duration', 'histogram')
  async processData(data: any): Promise<any> {
    // Automatically recorded as histogram metric
    return processedData;
  }

  recordCustomMetric(): void {
    const observability = ObservabilityManager.getInstance();
    observability.recordEvent({
      type: 'system',
      operation: 'custom_metric',
      value: 42,
      metadata: { custom: true },
    });
  }
}
```

### 3. Alerting System

Intelligent alerting with predictive capabilities:

```typescript
import { AlertingSystem } from './core/observability/alerting-system.js';

// Add custom alert rule
observability.alertingSystem.addRule({
  id: 'custom_metric_alert',
  name: 'Custom Metric Alert',
  metricName: 'custom.metric.value',
  condition: {
    operator: 'gt',
    threshold: 100,
    duration: 60000, // 1 minute
  },
  severity: 'warning',
  labels: { service: 'my-service' },
  actions: [
    {
      type: 'log',
      config: { level: 'warn' },
    },
    {
      type: 'webhook',
      config: { url: 'https://hooks.slack.com/...' },
    },
  ],
  enabled: true,
  evaluationInterval: 30000,
});
```

### 4. Health Monitoring

Automated health checks with intelligent recommendations:

```typescript
import { createObservabilityHealthCheck } from './core/observability/utils.js';
import { healthMonitor } from '../utils/health-monitor.js';

// Register custom health check
healthMonitor.registerCheck(
  {
    id: 'my_service_health',
    name: 'My Service Health',
    type: 'custom',
    description: 'Health check for my service',
    interval: 30000,
    timeout: 5000,
    retries: 2,
    enabled: true,
    criticalThreshold: 0.8,
    degradedThreshold: 0.6,
    dependencies: [],
    tags: ['service'],
  },
  async () => {
    // Your health check logic
    const isHealthy = await checkServiceHealth();
    
    return {
      healthy: isHealthy,
      status: isHealthy ? 'healthy' : 'unhealthy',
      message: isHealthy ? 'Service is healthy' : 'Service is down',
      timestamp: new Date(),
      componentId: 'my_service',
      details: {
        // Additional health details
      },
    };
  }
);
```

### 5. Dashboard Integration

Real-time monitoring dashboard:

```typescript
import { ObservabilityDashboard } from './core/observability/dashboard.js';

// Get dashboard instance
const dashboard = new ObservabilityDashboard(
  observability.config.dashboard,
  observability
);

// Subscribe to real-time updates
const unsubscribe = dashboard.subscribe('metrics', (data) => {
  console.log('Real-time metrics:', data);
});

// Get dashboard data
const dashboardData = await dashboard.getDashboardData();
console.log('Dashboard insights:', dashboardData.insights);
```

## Integration Patterns

### Agent Integration

```typescript
import { withObservability, createObservabilityLogContext } from './core/observability/utils.js';

class Agent {
  @withObservability({
    operationName: 'agent.think',
    includeArgs: true,
    includeResult: false, // Don't log sensitive results
  })
  async think(context: ThoughtContext): Promise<ThoughtResult> {
    const observability = ObservabilityManager.getInstance();
    
    // Record agent-specific event
    observability.recordEvent({
      type: 'agent',
      agentId: this.id,
      operation: 'think',
      status: 'started',
      metadata: {
        contextType: context.type,
        complexity: context.complexity,
      },
    });

    try {
      const result = await this.performThinking(context);
      
      // Record success
      observability.recordEvent({
        type: 'agent',
        agentId: this.id,
        operation: 'think',
        status: 'completed',
        duration: performance.now() - startTime,
        metadata: {
          resultConfidence: result.confidence,
        },
      });

      return result;
    } catch (error) {
      // Record failure
      observability.recordEvent({
        type: 'agent',
        agentId: this.id,
        operation: 'think',
        status: 'failed',
        duration: performance.now() - startTime,
        metadata: {
          error: error.message,
        },
      });
      throw error;
    }
  }
}
```

### Portal Integration

```typescript
import { tracePortalOperation } from './core/observability/utils.js';

class Portal {
  async generateResponse(messages: Message[], model?: string): Promise<Response> {
    return tracePortalOperation(
      this.id,
      'generate_response',
      model,
      async (context) => {
        const startTime = performance.now();
        
        try {
          const response = await this.callLLM(messages, model);
          
          // Record portal metrics
          ObservabilityManager.getInstance().recordEvent({
            type: 'portal',
            portalId: this.id,
            operation: 'response',
            model,
            tokens: response.usage?.totalTokens,
            duration: performance.now() - startTime,
            metadata: {
              messageCount: messages.length,
              model: model || 'default',
            },
          });

          return response;
        } catch (error) {
          // Record error
          ObservabilityManager.getInstance().recordEvent({
            type: 'portal',
            portalId: this.id,
            operation: 'error',
            model,
            duration: performance.now() - startTime,
            metadata: {
              error: error.message,
            },
          });
          throw error;
        }
      }
    );
  }
}
```

### Extension Integration

```typescript
import { traceExtensionOperation } from './core/observability/utils.js';

class Extension {
  async handleMessage(message: any): Promise<void> {
    return traceExtensionOperation(
      this.id,
      'handle_message',
      async (context) => {
        const observability = ObservabilityManager.getInstance();
        
        observability.recordEvent({
          type: 'extension',
          extensionId: this.id,
          operation: 'message',
          status: 'started',
          metadata: {
            messageType: message.type,
            channel: message.channel,
          },
        });

        // Process message with observability context
        await this.processMessage(message, context);
        
        observability.recordEvent({
          type: 'extension',
          extensionId: this.id,
          operation: 'message',
          status: 'completed',
          metadata: {
            processed: true,
          },
        });
      }
    );
  }
}
```

### Memory Provider Integration

```typescript
import { traceMemoryOperation } from './core/observability/utils.js';

class MemoryProvider {
  async store(record: MemoryRecord): Promise<void> {
    return traceMemoryOperation(
      this.id,
      'store',
      async (context) => {
        const startTime = performance.now();
        
        try {
          await this.performStore(record);
          
          // Record successful storage
          ObservabilityManager.getInstance().recordEvent({
            type: 'memory',
            providerId: this.id,
            operation: 'store',
            duration: performance.now() - startTime,
            metadata: {
              recordType: record.type,
              recordSize: JSON.stringify(record).length,
            },
          });
        } catch (error) {
          // Record storage error
          ObservabilityManager.getInstance().recordEvent({
            type: 'memory',
            providerId: this.id,
            operation: 'store',
            duration: performance.now() - startTime,
            metadata: {
              error: error.message,
              recordType: record.type,
            },
          });
          throw error;
        }
      }
    );
  }
}
```

## Middleware Integration

### Express.js Integration

```typescript
import express from 'express';
import { 
  createTracingMiddleware, 
  createLoggingMiddleware,
  createPerformanceMiddleware 
} from './core/observability/utils.js';

const app = express();

// Add observability middleware
app.use(createTracingMiddleware());
app.use(createLoggingMiddleware());

// Register performance monitoring middleware
const observability = ObservabilityManager.getInstance();
observability.registerMiddleware(createPerformanceMiddleware({
  slowRequestMs: 1000,
  memoryWarningMb: 100,
}));

app.get('/api/health', async (req, res) => {
  const healthData = await observability.getDashboardData();
  res.json(healthData.healthSummary);
});

app.get('/api/metrics', (req, res) => {
  const format = req.query.format || 'prometheus';
  const metrics = observability.exportMetrics(format as 'prometheus' | 'json');
  
  if (format === 'prometheus') {
    res.set('Content-Type', 'text/plain');
  } else {
    res.set('Content-Type', 'application/json');
  }
  
  res.send(metrics);
});
```

### Custom Middleware

```typescript
import { 
  createObservabilityMiddleware,
  createSecurityMiddleware,
  createRateLimitMiddleware 
} from './core/observability/utils.js';

// Register custom middleware
const observability = ObservabilityManager.getInstance();

// Security monitoring
observability.registerMiddleware(createSecurityMiddleware());

// Rate limiting monitoring
observability.registerMiddleware(createRateLimitMiddleware({
  requestsPerMinute: 60,
  burstLimit: 10,
}));

// Custom business logic middleware
observability.registerMiddleware(createObservabilityMiddleware(
  'business-logic-monitor',
  {
    beforeOperation: async (context, operation, metadata) => {
      if (operation.includes('payment')) {
        runtimeLogger.info('Payment operation started', 
          createObservabilityLogContext(context, {
            paymentOperation: true,
            sensitive: true,
          })
        );
      }
    },
    onError: async (context, operation, error, duration) => {
      if (operation.includes('payment')) {
        // Send alert for payment failures
        runtimeLogger.error('Payment operation failed',
          error,
          createObservabilityLogContext(context, {
            paymentFailure: true,
            critical: true,
            duration,
          })
        );
      }
    },
  },
  { 
    alertOnPaymentFailure: true,
    paymentErrorThreshold: 5,
  },
  10 // High priority
));
```

## Configuration

### Complete Configuration Example

```typescript
import { ObservabilityConfig, ENVIRONMENT_CONFIGS } from './core/observability/constants.js';

const config: ObservabilityConfig = {
  enabled: true,
  
  logging: {
    level: LogLevel.INFO,
    enableStructuredLogging: true,
    enableCorrelationIds: true,
    maxLogSizeBytes: 10 * 1024 * 1024, // 10MB
    retentionDays: 30,
  },
  
  metrics: {
    enableCollection: true,
    collectionIntervalMs: 5000,
    enableCustomMetrics: true,
    maxMetricsInMemory: 10000,
    exportFormat: 'prometheus',
  },
  
  tracing: {
    enableTracing: true,
    sampleRate: 0.1, // 10% sampling
    maxTraceDepth: 50,
    enableSpanDebugging: false,
    traceRetentionMs: 24 * 60 * 60 * 1000, // 24 hours
  },
  
  health: {
    enableHealthChecks: true,
    checkIntervalMs: 30000,
    enablePredictiveAlerts: true,
    alertThresholds: {
      memory: 0.85,
      cpu: 0.80,
      responseTime: 5000,
      errorRate: 0.05,
    },
  },
  
  performance: {
    enableMonitoring: true,
    maxOverheadMs: 5,
    enableProfiling: false,
    profilingIntervalMs: 60000,
  },
  
  dashboard: {
    enableDashboard: true,
    refreshIntervalMs: 5000,
    maxDataPoints: 1000,
    enableRealTime: true,
  },
};

// Or use environment-specific configuration
const envConfig = ENVIRONMENT_CONFIGS[process.env.NODE_ENV || 'development'];
```

### Runtime Configuration Updates

```typescript
// Update configuration at runtime
observability.updateConfig({
  tracing: {
    sampleRate: 0.05, // Reduce sampling to 5%
  },
  metrics: {
    collectionIntervalMs: 10000, // Increase interval to 10 seconds
  },
});

// Monitor configuration changes
observability.on('configUpdated', (newConfig) => {
  console.log('Observability configuration updated:', newConfig);
});
```

## Monitoring and Alerting

### Custom Alert Rules

```typescript
// High memory usage alert
observability.alertingSystem.addRule({
  id: 'high_memory_usage',
  name: 'High Memory Usage',
  metricName: 'system.memory.usage',
  condition: {
    operator: 'gt',
    threshold: 0.85,
    duration: 60000,
  },
  severity: 'warning',
  labels: { component: 'system' },
  actions: [
    {
      type: 'log',
      config: { level: 'warn' },
    },
    {
      type: 'slack',
      config: { 
        channel: '#alerts',
        webhook: process.env.SLACK_WEBHOOK_URL,
      },
    },
  ],
  enabled: true,
  evaluationInterval: 30000,
});

// Agent error rate alert
observability.alertingSystem.addRule({
  id: 'agent_error_spike',
  name: 'Agent Error Rate Spike',
  metricName: 'agents.*.errorCount',
  condition: {
    operator: 'gt',
    threshold: 10,
    duration: 300000, // 5 minutes
  },
  severity: 'error',
  labels: { component: 'agent' },
  actions: [
    {
      type: 'webhook',
      config: {
        url: 'https://hooks.pagerduty.com/...',
        method: 'POST',
      },
    },
  ],
  enabled: true,
  evaluationInterval: 60000,
});
```

### Dashboard Widgets

```typescript
// Add custom dashboard widget
dashboard.addWidget({
  id: 'custom_metric_chart',
  type: 'chart',
  title: 'Custom Metrics Over Time',
  config: {
    metricPath: 'custom.business.metric',
    timeRange: 3600000, // 1 hour
    chartType: 'line',
    refreshRate: 5000,
  },
  position: { x: 0, y: 8, width: 12, height: 4 },
  enabled: true,
});

// Subscribe to real-time widget updates
const unsubscribe = dashboard.subscribe('custom_metric_chart', (data) => {
  console.log('Custom metric updated:', data);
});
```

## Performance Optimization

### Overhead Management

The observability system automatically manages overhead:

```typescript
// Check observability overhead
const status = observability.getStatus();
console.log('Observability overhead:', status.overhead);

// Monitor overhead events
observability.on('excessiveOverhead', (stats) => {
  console.warn('Observability overhead is excessive:', stats);
  
  // System will automatically reduce sampling rates
});

// Manual overhead optimization
if (status.overhead.p95Ms > 5) {
  observability.updateConfig({
    tracing: {
      sampleRate: Math.max(0.01, observability.config.tracing.sampleRate * 0.5),
    },
    metrics: {
      collectionIntervalMs: observability.config.metrics.collectionIntervalMs * 1.5,
    },
  });
}
```

### Sampling Strategies

```typescript
// Custom sampling logic
class CustomSampler {
  shouldSample(traceId: string, operationName: string): boolean {
    // Always sample errors
    if (operationName.includes('error')) return true;
    
    // Higher sampling for critical operations
    if (operationName.includes('payment') || operationName.includes('auth')) {
      return true;
    }
    
    // Lower sampling for routine operations
    if (operationName.includes('health_check')) {
      return Math.random() < 0.01; // 1%
    }
    
    // Default sampling rate
    return Math.random() < 0.1; // 10%
  }
}
```

## Troubleshooting

### Common Issues

#### High Observability Overhead

```typescript
// Check overhead statistics
const stats = observability.getStatus().overhead;
if (!stats.withinThreshold) {
  console.warn('High observability overhead detected:', stats);
  
  // Reduce sampling
  observability.updateConfig({
    tracing: { sampleRate: 0.01 },
    metrics: { collectionIntervalMs: 30000 },
  });
}
```

#### Missing Traces

```typescript
// Verify tracing is enabled and sampled
const context = createTraceContext('test_operation');
console.log('Trace sampled:', context.sampled);

// Check sampling rate
console.log('Sample rate:', observability.config.tracing.sampleRate);
```

#### Alert Fatigue

```typescript
// Review alert rules
const rules = observability.alertingSystem.getAllRules();
const activeAlerts = observability.alertingSystem.getActiveAlerts();

console.log('Alert rules:', rules.length);
console.log('Active alerts:', activeAlerts.length);

// Adjust thresholds
observability.alertingSystem.updateRule('high_memory_usage', {
  condition: {
    operator: 'gt',
    threshold: 0.90, // Increase threshold
    duration: 120000, // Increase duration
  },
});
```

### Debug Mode

```typescript
// Enable debug mode for troubleshooting
observability.updateConfig({
  tracing: {
    enableSpanDebugging: true,
    sampleRate: 1.0, // 100% sampling
  },
  performance: {
    enableProfiling: true,
  },
});

// Monitor debug events
observability.on('traceStarted', ({ context, span }) => {
  console.log('Trace started:', formatTraceOutput(context));
});

observability.on('traceFinished', ({ context, span }) => {
  console.log('Trace finished:', formatTraceOutput(context), span.duration);
});
```

## Best Practices

### 1. Structured Logging

Always use structured logging with observability context:

```typescript
// Good
runtimeLogger.info('User action completed', 
  createObservabilityLogContext(context, {
    userId: user.id,
    action: 'profile_update',
    duration: 145,
    success: true,
  })
);

// Bad
console.log('User updated profile');
```

### 2. Meaningful Metrics

Choose meaningful metric names and labels:

```typescript
// Good
observability.recordEvent({
  type: 'agent',
  agentId: 'agent-001',
  operation: 'think',
  status: 'completed',
  duration: 234,
  metadata: {
    complexity: 'high',
    confidence: 0.85,
    tokens_used: 150,
  },
});

// Bad
observability.recordEvent({
  type: 'system',
  operation: 'stuff',
  value: 1,
  metadata: {},
});
```

### 3. Alert Tuning

Set appropriate alert thresholds and durations:

```typescript
// Good - considers normal variability
{
  threshold: 0.85,      // 85% memory usage
  duration: 300000,     // Sustained for 5 minutes
  evaluationInterval: 30000, // Check every 30 seconds
}

// Bad - too sensitive
{
  threshold: 0.50,      // 50% memory usage
  duration: 10000,      // Only 10 seconds
  evaluationInterval: 5000,  // Check every 5 seconds
}
```

### 4. Resource Management

Monitor and manage observability resource usage:

```typescript
// Regular cleanup
setInterval(() => {
  const stats = observability.getStatus();
  
  if (stats.overhead.p95Ms > 10) {
    // Reduce observability load
    observability.updateConfig({
      tracing: { sampleRate: stats.subsystems.tracing.enabled ? 0.01 : 0 },
      metrics: { collectionIntervalMs: 60000 },
    });
  }
}, 300000); // Check every 5 minutes
```

### 5. Privacy and Security

Be mindful of sensitive data in observability:

```typescript
// Good - no sensitive data
observability.recordEvent({
  type: 'agent',
  agentId: 'agent-001',
  operation: 'process_payment',
  status: 'completed',
  metadata: {
    payment_method: 'card',
    amount_range: '100-500',
    currency: 'USD',
  },
});

// Bad - includes sensitive data
observability.recordEvent({
  type: 'agent',
  agentId: 'agent-001',
  operation: 'process_payment',
  metadata: {
    credit_card: '4111-1111-1111-1111',
    cvv: '123',
    user_email: 'user@example.com',
  },
});
```

## API Reference

### ObservabilityManager

The main entry point for the observability system.

#### Methods

- `getInstance(config?: ObservabilityConfig): ObservabilityManager`
- `start(): void`
- `stop(): Promise<void>`
- `recordEvent(event: ObservabilityEvent): TraceContext | undefined`
- `traceOperation<T>(operationName, operation, parentContext?, metadata?): Promise<T>`
- `getMetrics(): ObservabilityMetrics`
- `getDashboardData(): Promise<DashboardData>`
- `exportMetrics(format): string`
- `updateConfig(updates: Partial<ObservabilityConfig>): void`
- `getStatus(): SystemStatus`

#### Events

- `started`: Observability system started
- `stopped`: Observability system stopped
- `eventRecorded`: New observability event recorded
- `alertTriggered`: Alert was triggered
- `alertResolved`: Alert was resolved
- `excessiveOverhead`: Observability overhead is excessive
- `configUpdated`: Configuration was updated

### Decorators

- `@withTracing(operationName?)`: Automatic operation tracing
- `@withMetrics(metricName?, metricType?)`: Automatic metrics collection
- `@withObservability(options?)`: Combined tracing and metrics

### Utility Functions

- `createTraceContext(operationName, parentContext?, baggage?)`: Create trace context
- `formatTraceOutput(context)`: Format trace for logging
- `traceAgentOperation(agentId, operation, fn, parentContext?)`: Trace agent operations
- `tracePortalOperation(portalId, operation, model, fn, parentContext?)`: Trace portal operations
- `createTracingMiddleware()`: Express.js tracing middleware
- `createLoggingMiddleware(logger?)`: Express.js logging middleware
- `safeExecuteWithObservability(operationName, operation, options?)`: Safe execution wrapper

For complete API documentation, see the TypeScript type definitions in `types.ts`.

## License

This observability system is part of the SYMindX project and follows the same licensing terms.