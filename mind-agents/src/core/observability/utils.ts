/**
 * @module observability/utils
 * @description Utility functions and middleware for the observability system
 *
 * Provides decorators, middleware, and helper functions for easy
 * integration of observability into existing code.
 */

import { performance } from 'perf_hooks';
import { randomBytes } from 'crypto';

import type {
  TraceContext,
  ObservabilityEvent,
  ObservabilityLogContext,
  ObservabilityMiddleware,
  ObservabilityHooks,
} from './types.js';
import { OBSERVABILITY_CONSTANTS } from './constants.js';
import { ObservabilityManager } from './observability-manager.js';
import { runtimeLogger, type ILogger } from '../../utils/logger.js';

/**
 * Create a new trace context
 */
export function createTraceContext(
  operationName: string,
  parentContext?: TraceContext,
  baggage: Record<string, string> = {}
): TraceContext {
  const traceId = parentContext?.traceId || randomBytes(16).toString('hex');
  const spanId = randomBytes(8).toString('hex');

  return {
    traceId,
    spanId,
    parentSpanId: parentContext?.spanId,
    sampled: parentContext?.sampled ?? true,
    flags: parentContext?.flags ?? 0,
    baggage: {
      ...parentContext?.baggage,
      ...baggage,
      operation: operationName,
    },
    startTime: new Date(),
    metadata: {
      operationName,
      ...parentContext?.metadata,
    },
  };
}

/**
 * Format trace context for output
 */
export function formatTraceOutput(context: TraceContext): string {
  return `trace=${context.traceId.slice(-8)} span=${context.spanId.slice(-8)}`;
}

/**
 * Extract trace context from HTTP headers
 */
export function extractTraceFromHeaders(
  headers: Record<string, string>
): TraceContext | undefined {
  const traceId =
    headers[OBSERVABILITY_CONSTANTS.TRACE_HEADERS.TRACE_ID.toLowerCase()];
  const spanId =
    headers[OBSERVABILITY_CONSTANTS.TRACE_HEADERS.SPAN_ID.toLowerCase()];

  if (!traceId || !spanId) return undefined;

  return {
    traceId,
    spanId,
    parentSpanId:
      headers[
        OBSERVABILITY_CONSTANTS.TRACE_HEADERS.PARENT_SPAN_ID.toLowerCase()
      ],
    sampled:
      headers[OBSERVABILITY_CONSTANTS.TRACE_HEADERS.SAMPLED.toLowerCase()] ===
      'true',
    flags: parseInt(
      headers[OBSERVABILITY_CONSTANTS.TRACE_HEADERS.FLAGS.toLowerCase()] || '0',
      10
    ),
    baggage: {},
    startTime: new Date(),
    metadata: {},
  };
}

/**
 * Inject trace context into HTTP headers
 */
export function injectTraceIntoHeaders(
  context: TraceContext,
  headers: Record<string, string> = {}
): Record<string, string> {
  return {
    ...headers,
    [OBSERVABILITY_CONSTANTS.TRACE_HEADERS.TRACE_ID]: context.traceId,
    [OBSERVABILITY_CONSTANTS.TRACE_HEADERS.SPAN_ID]: context.spanId,
    [OBSERVABILITY_CONSTANTS.TRACE_HEADERS.PARENT_SPAN_ID]:
      context.parentSpanId || '',
    [OBSERVABILITY_CONSTANTS.TRACE_HEADERS.SAMPLED]: context.sampled.toString(),
    [OBSERVABILITY_CONSTANTS.TRACE_HEADERS.FLAGS]: context.flags.toString(),
  };
}

/**
 * Create enhanced log context with observability data
 */
export function createObservabilityLogContext(
  context: TraceContext,
  additionalContext: Record<string, unknown> = {}
): ObservabilityLogContext {
  return {
    correlationId: context.traceId,
    source: context.metadata.operationName as string,
    trace: {
      traceId: context.traceId,
      spanId: context.spanId,
      sampled: context.sampled,
    },
    service: {
      name: OBSERVABILITY_CONSTANTS.SERVICE.NAME,
      version: OBSERVABILITY_CONSTANTS.SERVICE.VERSION,
      instance: OBSERVABILITY_CONSTANTS.SERVICE.INSTANCE_ID,
      environment: OBSERVABILITY_CONSTANTS.SERVICE.ENVIRONMENT,
    },
    metadata: {
      ...context.metadata,
      ...additionalContext,
    },
  };
}

/**
 * Decorator for automatic tracing
 */
export function withTracing(operationName?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const traceOperation =
      operationName || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      const observability = ObservabilityManager.getInstance();

      return observability.traceOperation(
        traceOperation,
        (context) => originalMethod.apply(this, args),
        undefined,
        {
          className: target.constructor.name,
          methodName: propertyKey,
          arguments: args.length,
        }
      );
    };

    return descriptor;
  };
}

/**
 * Decorator for automatic metrics collection
 */
export function withMetrics(
  metricName?: string,
  metricType: 'counter' | 'gauge' | 'histogram' = 'histogram'
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const metric =
      metricName ||
      `${target.constructor.name.toLowerCase()}_${propertyKey}_duration`;

    descriptor.value = async function (...args: any[]) {
      const observability = ObservabilityManager.getInstance();
      const startTime = performance.now();

      try {
        const result = await originalMethod.apply(this, args);

        // Record success metric
        const duration = performance.now() - startTime;
        observability.recordEvent({
          type: 'system',
          operation: propertyKey,
          value: duration,
          metadata: {
            className: target.constructor.name,
            success: true,
          },
        });

        return result;
      } catch (error) {
        // Record error metric
        const duration = performance.now() - startTime;
        observability.recordEvent({
          type: 'system',
          operation: `${propertyKey}_error`,
          value: duration,
          metadata: {
            className: target.constructor.name,
            success: false,
            error: error instanceof Error ? error.message : String(error),
          },
        });

        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Decorator combining tracing and metrics
 */
export function withObservability(
  options: {
    operationName?: string;
    metricName?: string;
    metricType?: 'counter' | 'gauge' | 'histogram';
    includeArgs?: boolean;
    includeResult?: boolean;
  } = {}
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const traceOperation =
      options.operationName || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      const observability = ObservabilityManager.getInstance();

      return observability.traceOperation(
        traceOperation,
        async (context) => {
          const startTime = performance.now();

          try {
            const result = await originalMethod.apply(this, args);

            // Record success metrics and trace data
            const duration = performance.now() - startTime;

            const metadata: Record<string, unknown> = {
              className: target.constructor.name,
              methodName: propertyKey,
              success: true,
              duration,
            };

            if (options.includeArgs) {
              metadata.argumentCount = args.length;
              metadata.arguments = args.map((arg, i) => ({
                index: i,
                type: typeof arg,
              }));
            }

            if (options.includeResult && result !== undefined) {
              metadata.resultType = typeof result;
              metadata.hasResult = true;
            }

            observability.recordEvent({
              type: 'system',
              operation: propertyKey,
              value: duration,
              metadata,
            });

            return result;
          } catch (error) {
            // Record error metrics and trace data
            const duration = performance.now() - startTime;

            observability.recordEvent({
              type: 'system',
              operation: `${propertyKey}_error`,
              value: duration,
              metadata: {
                className: target.constructor.name,
                methodName: propertyKey,
                success: false,
                error: error instanceof Error ? error.message : String(error),
                errorType:
                  error instanceof Error ? error.constructor.name : 'Unknown',
              },
            });

            throw error;
          }
        },
        undefined,
        {
          className: target.constructor.name,
          methodName: propertyKey,
        }
      );
    };

    return descriptor;
  };
}

/**
 * Agent operation tracing helper
 */
export function traceAgentOperation<T>(
  agentId: string,
  operation: string,
  fn: (context: TraceContext) => Promise<T> | T,
  parentContext?: TraceContext
): Promise<T> {
  const observability = ObservabilityManager.getInstance();

  return observability.traceOperation(
    OBSERVABILITY_CONSTANTS.TRACE_OPERATIONS.AGENT_THINK,
    fn,
    parentContext,
    {
      agentId,
      operation,
      component: 'agent',
    }
  );
}

/**
 * Portal operation tracing helper
 */
export function tracePortalOperation<T>(
  portalId: string,
  operation: string,
  model: string | undefined,
  fn: (context: TraceContext) => Promise<T> | T,
  parentContext?: TraceContext
): Promise<T> {
  const observability = ObservabilityManager.getInstance();

  return observability.traceOperation(
    OBSERVABILITY_CONSTANTS.TRACE_OPERATIONS.PORTAL_REQUEST,
    fn,
    parentContext,
    {
      portalId,
      operation,
      model: model || 'unknown',
      component: 'portal',
    }
  );
}

/**
 * Extension operation tracing helper
 */
export function traceExtensionOperation<T>(
  extensionId: string,
  operation: string,
  fn: (context: TraceContext) => Promise<T> | T,
  parentContext?: TraceContext
): Promise<T> {
  const observability = ObservabilityManager.getInstance();

  return observability.traceOperation(
    OBSERVABILITY_CONSTANTS.TRACE_OPERATIONS.EXTENSION_MESSAGE,
    fn,
    parentContext,
    {
      extensionId,
      operation,
      component: 'extension',
    }
  );
}

/**
 * Memory operation tracing helper
 */
export function traceMemoryOperation<T>(
  providerId: string,
  operation: string,
  fn: (context: TraceContext) => Promise<T> | T,
  parentContext?: TraceContext
): Promise<T> {
  const observability = ObservabilityManager.getInstance();

  return observability.traceOperation(
    OBSERVABILITY_CONSTANTS.TRACE_OPERATIONS.MEMORY_STORE,
    fn,
    parentContext,
    {
      providerId,
      operation,
      component: 'memory',
    }
  );
}

/**
 * Create Express.js middleware for request tracing
 */
export function createTracingMiddleware() {
  return (req: any, res: any, next: any) => {
    const observability = ObservabilityManager.getInstance();

    // Extract trace context from headers
    const parentContext = extractTraceFromHeaders(req.headers);

    // Start trace for request
    const operationName = `${req.method} ${req.route?.path || req.path}`;

    observability
      .traceOperation(
        operationName,
        async (context) => {
          // Inject trace context into request
          req.traceContext = context;

          // Inject trace headers into response
          const traceHeaders = injectTraceIntoHeaders(context);
          for (const [key, value] of Object.entries(traceHeaders)) {
            res.setHeader(key, value);
          }

          // Continue with request processing
          return new Promise<void>((resolve, reject) => {
            res.on('finish', () => {
              // Record HTTP metrics
              observability.recordEvent({
                type: 'system',
                operation: 'http_request',
                metadata: {
                  method: req.method,
                  path: req.path,
                  statusCode: res.statusCode,
                  userAgent: req.get('User-Agent'),
                  ip: req.ip,
                },
              });

              resolve();
            });

            res.on('error', (error: Error) => {
              reject(error);
            });

            next();
          });
        },
        parentContext,
        {
          method: req.method,
          path: req.path,
          userAgent: req.get('User-Agent'),
          ip: req.ip,
        }
      )
      .catch(next);
  };
}

/**
 * Create logging middleware with observability context
 */
export function createLoggingMiddleware(logger: ILogger = runtimeLogger) {
  return (req: any, res: any, next: any) => {
    // Create child logger with trace context
    const traceContext = req.traceContext as TraceContext;
    if (traceContext) {
      const logContext = createObservabilityLogContext(traceContext, {
        method: req.method,
        path: req.path,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
      });

      req.logger = logger.child(logContext);
    } else {
      req.logger = logger;
    }

    next();
  };
}

/**
 * Create custom observability middleware
 */
export function createObservabilityMiddleware(
  name: string,
  hooks: ObservabilityHooks,
  config: Record<string, unknown> = {},
  priority: number = 100
): ObservabilityMiddleware {
  return {
    name,
    priority,
    enabled: true,
    hooks,
    config,
  };
}

/**
 * Performance monitoring middleware
 */
export function createPerformanceMiddleware(
  thresholds: {
    slowRequestMs?: number;
    memoryWarningMb?: number;
  } = {}
): ObservabilityMiddleware {
  const { slowRequestMs = 1000, memoryWarningMb = 100 } = thresholds;

  return createObservabilityMiddleware(
    'performance-monitor',
    {
      beforeOperation: async (context, operation, metadata) => {
        // Record initial memory usage
        const memUsage = process.memoryUsage();
        context.metadata.initialMemory = memUsage.heapUsed;
      },

      afterOperation: async (context, operation, result, duration) => {
        // Check for slow operations
        if (duration > slowRequestMs) {
          runtimeLogger.warn(
            `Slow operation detected: ${operation}`,
            createObservabilityLogContext(context, {
              duration,
              threshold: slowRequestMs,
              slow: true,
            })
          );
        }

        // Check memory usage
        const memUsage = process.memoryUsage();
        const memoryDelta =
          memUsage.heapUsed - ((context.metadata.initialMemory as number) || 0);
        const memoryMb = memoryDelta / 1024 / 1024;

        if (memoryMb > memoryWarningMb) {
          runtimeLogger.warn(
            `High memory usage in operation: ${operation}`,
            createObservabilityLogContext(context, {
              memoryUsageMb: memoryMb,
              threshold: memoryWarningMb,
              highMemory: true,
            })
          );
        }
      },

      onError: async (context, operation, error, duration) => {
        runtimeLogger.error(
          `Operation failed: ${operation}`,
          error,
          createObservabilityLogContext(context, {
            duration,
            failed: true,
          })
        );
      },
    },
    { slowRequestMs, memoryWarningMb },
    50 // High priority
  );
}

/**
 * Security monitoring middleware
 */
export function createSecurityMiddleware(): ObservabilityMiddleware {
  return createObservabilityMiddleware(
    'security-monitor',
    {
      beforeOperation: async (context, operation, metadata) => {
        // Log security-sensitive operations
        if (
          operation.includes('auth') ||
          operation.includes('login') ||
          operation.includes('password')
        ) {
          runtimeLogger.info(
            `Security operation started: ${operation}`,
            createObservabilityLogContext(context, {
              securityOperation: true,
              sensitive: true,
            })
          );
        }
      },

      onError: async (context, operation, error, duration) => {
        // Enhanced logging for security failures
        if (operation.includes('auth') || error.message.includes('auth')) {
          runtimeLogger.error(
            `Security operation failed: ${operation}`,
            error,
            createObservabilityLogContext(context, {
              securityFailure: true,
              sensitive: true,
              duration,
            })
          );
        }
      },
    },
    {},
    25 // Medium-high priority
  );
}

/**
 * Rate limiting monitoring middleware
 */
export function createRateLimitMiddleware(
  limits: {
    requestsPerMinute?: number;
    burstLimit?: number;
  } = {}
): ObservabilityMiddleware {
  const { requestsPerMinute = 60, burstLimit = 10 } = limits;
  const requestCounts = new Map<string, { count: number; lastReset: number }>();

  return createObservabilityMiddleware(
    'rate-limit-monitor',
    {
      beforeOperation: async (context, operation, metadata) => {
        const key = `${context.traceId.slice(-8)}_${operation}`;
        const now = Date.now();
        const minuteMs = 60 * 1000;

        let requestData = requestCounts.get(key);
        if (!requestData || now - requestData.lastReset > minuteMs) {
          requestData = { count: 0, lastReset: now };
          requestCounts.set(key, requestData);
        }

        requestData.count++;

        if (requestData.count > requestsPerMinute) {
          runtimeLogger.warn(
            `Rate limit exceeded for operation: ${operation}`,
            createObservabilityLogContext(context, {
              rateLimitExceeded: true,
              requestCount: requestData.count,
              limit: requestsPerMinute,
            })
          );
        }
      },
    },
    { requestsPerMinute, burstLimit },
    75 // Lower priority
  );
}

/**
 * Health check helper
 */
export function createObservabilityHealthCheck() {
  return async () => {
    const observability = ObservabilityManager.getInstance();
    const status = observability.getStatus();

    let healthy = status.enabled;
    let message = 'Observability system is operational';

    if (!status.enabled) {
      healthy = false;
      message = 'Observability system is disabled';
    } else if (!status.overhead.withinThreshold) {
      healthy = false;
      message = `Observability overhead is excessive: ${status.overhead.p95Ms.toFixed(2)}ms`;
    } else if (status.subsystems.alerting.alerts > 10) {
      healthy = false;
      message = `Too many active alerts: ${status.subsystems.alerting.alerts}`;
    }

    return {
      healthy,
      status: healthy ? 'healthy' : 'unhealthy',
      message,
      timestamp: new Date(),
      componentId: 'observability_system',
      details: {
        message,
        ...status,
      },
    };
  };
}

/**
 * Utility to safely execute async operations with observability
 */
export async function safeExecuteWithObservability<T>(
  operationName: string,
  operation: () => Promise<T>,
  options: {
    timeout?: number;
    retries?: number;
    parentContext?: TraceContext;
    metadata?: Record<string, unknown>;
  } = {}
): Promise<T> {
  const {
    timeout = 30000,
    retries = 0,
    parentContext,
    metadata = {},
  } = options;
  const observability = ObservabilityManager.getInstance();

  return observability.traceOperation(
    operationName,
    async (context) => {
      let lastError: Error | undefined;

      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          // Add timeout if specified
          const operationPromise = operation();

          if (timeout > 0) {
            const timeoutPromise = new Promise<never>((_, reject) => {
              setTimeout(
                () => reject(new Error(`Operation timeout: ${operationName}`)),
                timeout
              );
            });

            return await Promise.race([operationPromise, timeoutPromise]);
          } else {
            return await operationPromise;
          }
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));

          if (attempt < retries) {
            runtimeLogger.warn(
              `Operation failed, retrying: ${operationName}`,
              createObservabilityLogContext(context, {
                attempt: attempt + 1,
                maxRetries: retries,
                error: lastError.message,
              })
            );

            // Exponential backoff
            await new Promise((resolve) =>
              setTimeout(resolve, Math.pow(2, attempt) * 1000)
            );
          }
        }
      }

      throw lastError!;
    },
    parentContext,
    {
      ...metadata,
      timeout,
      retries,
    }
  );
}
