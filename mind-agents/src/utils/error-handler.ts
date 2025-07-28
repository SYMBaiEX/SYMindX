/**
 * @module error-handler
 * @description Comprehensive error handling and recovery system for SYMindX
 */

import type {
  OperationResult,
  ExecutionResult,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  LogContext,
  LogMetadata,
} from '../types/index.js';

import { runtimeLogger } from './logger.js';

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Error categories for better classification
 */
export enum ErrorCategory {
  SYSTEM = 'system',
  NETWORK = 'network',
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  RESOURCE = 'resource',
  CONFIGURATION = 'configuration',
  RUNTIME = 'runtime',
  USER = 'user',
}

/**
 * Error recovery strategies
 */
export enum RecoveryStrategy {
  NONE = 'none',
  RETRY = 'retry',
  FALLBACK = 'fallback',
  CIRCUIT_BREAKER = 'circuit_breaker',
  GRACEFUL_DEGRADATION = 'graceful_degradation',
  RESTART = 'restart',
}

/**
 * Structured error information
 */
export interface ErrorInfo {
  readonly id: string;
  readonly message: string;
  readonly code: string;
  readonly category: ErrorCategory;
  readonly severity: ErrorSeverity;
  readonly timestamp: Date;
  readonly stack?: string;
  readonly context?: Record<string, unknown>;
  readonly cause?: Error | ErrorInfo;
  readonly recoveryStrategy?: RecoveryStrategy;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Error recovery context
 */
export interface RecoveryContext {
  readonly error: ErrorInfo;
  readonly attemptCount: number;
  readonly maxAttempts: number;
  readonly backoffDelay: number;
  readonly context?: Record<string, unknown>;
}

/**
 * Recovery result
 */
export interface RecoveryResult {
  readonly success: boolean;
  readonly recovered: boolean;
  readonly strategy: RecoveryStrategy;
  readonly attempts: number;
  readonly duration: number;
  readonly message?: string;
  readonly newError?: ErrorInfo;
}

/**
 * Error handler configuration
 */
export interface ErrorHandlerConfig {
  readonly retryAttempts: number;
  readonly retryDelay: number;
  readonly backoffMultiplier: number;
  readonly maxRetryDelay: number;
  readonly enableCircuitBreaker: boolean;
  readonly circuitBreakerThreshold: number;
  readonly circuitBreakerTimeout: number;
  readonly enableLogging: boolean;
  readonly enableMetrics: boolean;
}

/**
 * Circuit breaker state
 */
enum CircuitBreakerState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open',
}

/**
 * Circuit breaker implementation
 */
class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount = 0;
  private lastFailureTime?: Date;
  private nextRetryTime?: Date;

  constructor(
    private readonly threshold: number,
    private readonly timeout: number
  ) {}

  public canExecute(): boolean {
    if (this.state === CircuitBreakerState.CLOSED) {
      return true;
    }

    if (this.state === CircuitBreakerState.OPEN) {
      const now = new Date();
      if (this.nextRetryTime && now >= this.nextRetryTime) {
        this.state = CircuitBreakerState.HALF_OPEN;
        return true;
      }
      return false;
    }

    // HALF_OPEN state
    return true;
  }

  public onSuccess(): void {
    this.failureCount = 0;
    this.state = CircuitBreakerState.CLOSED;
    this.lastFailureTime = undefined;
    this.nextRetryTime = undefined;
  }

  public onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = new Date();

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.state = CircuitBreakerState.OPEN;
      this.nextRetryTime = new Date(Date.now() + this.timeout);
    } else if (this.failureCount >= this.threshold) {
      this.state = CircuitBreakerState.OPEN;
      this.nextRetryTime = new Date(Date.now() + this.timeout);
    }
  }

  public getState(): CircuitBreakerState {
    return this.state;
  }

  public getFailureCount(): number {
    return this.failureCount;
  }
}

/**
 * Comprehensive error handler with recovery mechanisms
 */
export class ErrorHandler {
  private static instance: ErrorHandler;
  private readonly config: ErrorHandlerConfig;
  private readonly circuitBreakers = new Map<string, CircuitBreaker>();
  private readonly errorMetrics = new Map<
    string,
    {
      count: number;
      lastOccurrence: Date;
      severity: ErrorSeverity;
    }
  >();

  private constructor(config: Partial<ErrorHandlerConfig> = {}) {
    this.config = {
      retryAttempts: 3,
      retryDelay: 1000,
      backoffMultiplier: 2,
      maxRetryDelay: 10000,
      enableCircuitBreaker: true,
      circuitBreakerThreshold: 5,
      circuitBreakerTimeout: 60000,
      enableLogging: true,
      enableMetrics: true,
      ...config,
    };
  }

  /**
   * Get singleton instance
   */
  public static getInstance(
    config?: Partial<ErrorHandlerConfig>
  ): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler(config);
    }
    return ErrorHandler.instance;
  }

  /**
   * Create a new instance for testing
   */
  public static createTestInstance(
    config?: Partial<ErrorHandlerConfig>
  ): ErrorHandler {
    return new ErrorHandler(config);
  }

  /**
   * Create structured error information
   */
  public createError(
    message: string,
    code: string,
    category: ErrorCategory,
    severity: ErrorSeverity,
    context?: Record<string, unknown>,
    cause?: Error | ErrorInfo
  ): ErrorInfo {
    const error: ErrorInfo = {
      id: this.generateErrorId(),
      message,
      code,
      category,
      severity,
      timestamp: new Date(),
      stack: cause instanceof Error ? cause.stack : undefined,
      context,
      cause,
      recoveryStrategy: this.determineRecoveryStrategy(category, severity),
      metadata: {
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        platform: process.platform,
      },
    };

    if (this.config.enableMetrics) {
      this.updateMetrics(error);
    }

    if (this.config.enableLogging) {
      this.logError(error);
    }

    return error;
  }

  /**
   * Handle error with automatic recovery
   */
  public async handleError<T>(
    error: Error | ErrorInfo,
    operation: () => Promise<T>,
    context?: Record<string, unknown>
  ): Promise<ExecutionResult<T>> {
    const errorInfo =
      error instanceof Error
        ? this.createError(
            error.message,
            'UNHANDLED_ERROR',
            ErrorCategory.RUNTIME,
            ErrorSeverity.MEDIUM,
            context,
            error
          )
        : error;

    const startTime = Date.now();
    const operationId = this.generateOperationId();

    try {
      const recovery = await this.attemptRecovery(
        errorInfo,
        operation,
        context
      );

      return {
        success: recovery.success,
        data: recovery.success ? (recovery as any).data : undefined,
        error: recovery.success
          ? undefined
          : recovery.message || 'Recovery failed',
        timestamp: new Date(),
        duration: Date.now() - startTime,
        metadata: {
          commandId: operationId,
          executorId: 'error-handler',
          operationId,
          recovery: {
            strategy: recovery.strategy,
            attempts: recovery.attempts,
            recovered: recovery.recovered,
          },
        },
      };
    } catch (recoveryError) {
      const finalError = this.createError(
        'Recovery failed',
        'RECOVERY_FAILURE',
        ErrorCategory.SYSTEM,
        ErrorSeverity.HIGH,
        { originalError: errorInfo, recoveryError },
        recoveryError instanceof Error ? recoveryError : undefined
      );

      return {
        success: false,
        timestamp: new Date(),
        duration: Date.now() - startTime,
        error: finalError.message,
        metadata: {
          commandId: operationId,
          executorId: 'error-handler',
          operationId,
          errorInfo: finalError,
        },
      };
    }
  }

  /**
   * Validate operation result and handle errors
   */
  public async validateAndHandle<T>(
    result: OperationResult,
    operation: () => Promise<T>,
    context?: Record<string, unknown>
  ): Promise<ExecutionResult<T>> {
    if (result.success) {
      // Execute the operation to get the actual data
      const startTime = Date.now();
      const data = await operation();
      return {
        success: true,
        data,
        timestamp: new Date(),
        duration: Date.now() - startTime,
        metadata: {
          commandId: this.generateOperationId(),
          executorId: 'error-handler',
        },
      };
    }

    const errorMessage =
      'success' in result && result.success
        ? 'Operation failed'
        : 'error' in result
          ? result.error
          : 'Operation failed';
    const error = this.createError(
      errorMessage,
      'OPERATION_FAILURE',
      ErrorCategory.RUNTIME,
      ErrorSeverity.MEDIUM,
      context
    );

    return this.handleError(error, operation, context);
  }

  /**
   * Wrap function with error handling
   */
  public wrap<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    context?: Record<string, unknown>
  ): T {
    return (async (...args: Parameters<T>) => {
      try {
        return await fn(...args);
      } catch (error) {
        const errorInfo = this.createError(
          error instanceof Error ? error.message : String(error),
          'WRAPPED_FUNCTION_ERROR',
          ErrorCategory.RUNTIME,
          ErrorSeverity.MEDIUM,
          { ...context, args },
          error instanceof Error ? error : undefined
        );

        const result = await this.handleError(
          errorInfo,
          () => fn(...args),
          context
        );

        if (!result.success) {
          throw new Error(result.error || 'Function execution failed');
        }

        return result.data;
      }
    }) as T;
  }

  /**
   * Get error metrics
   */
  public getMetrics(): Record<
    string,
    {
      count: number;
      lastOccurrence: Date;
      severity: ErrorSeverity;
    }
  > {
    return Object.fromEntries(this.errorMetrics);
  }

  /**
   * Reset error metrics
   */
  public resetMetrics(): void {
    this.errorMetrics.clear();
  }

  /**
   * Get circuit breaker status
   */
  public getCircuitBreakerStatus(operationId: string): {
    state: string;
    failureCount: number;
    canExecute: boolean;
  } {
    const breaker = this.circuitBreakers.get(operationId);
    if (!breaker) {
      return {
        state: 'not_initialized',
        failureCount: 0,
        canExecute: true,
      };
    }

    return {
      state: breaker.getState(),
      failureCount: breaker.getFailureCount(),
      canExecute: breaker.canExecute(),
    };
  }

  /**
   * Validate configuration
   */
  public validateConfig(config: Record<string, unknown>): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check required fields
    if (!config.name || typeof config.name !== 'string') {
      errors.push({
        field: 'name',
        message: 'Configuration must have a valid name',
        code: 'CONFIG_NAME_REQUIRED',
        value: config.name,
        severity: 'error',
      });
    }

    // Check API keys
    if (config.apiKeys && typeof config.apiKeys === 'object') {
      const apiKeys = config.apiKeys as Record<string, string>;
      for (const [key, value] of Object.entries(apiKeys)) {
        if (typeof value !== 'string' || value.length === 0) {
          warnings.push({
            field: `apiKeys.${key}`,
            message: `API key '${key}' is empty or invalid`,
            code: 'API_KEY_INVALID',
            value: value as any,
            severity: 'warning',
          });
        }
      }
    }

    // Check numeric values
    const numericFields = ['port', 'timeout', 'maxConnections'];
    for (const field of numericFields) {
      if (config[field] !== undefined) {
        const value = config[field];
        if (typeof value !== 'number' || value < 0) {
          errors.push({
            field,
            message: `Field '${field}' must be a positive number`,
            code: 'NUMERIC_VALUE_INVALID',
            value: value as any,
            severity: 'error',
          });
        }
      }
    }

    // Check boolean values
    const booleanFields = ['enabled', 'debug', 'ssl'];
    for (const field of booleanFields) {
      if (config[field] !== undefined) {
        const value = config[field];
        if (typeof value !== 'boolean') {
          errors.push({
            field,
            message: `Field '${field}' must be a boolean`,
            code: 'BOOLEAN_VALUE_INVALID',
            value: value as any,
            severity: 'error',
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      timestamp: new Date(),
    };
  }

  /**
   * Attempt recovery using appropriate strategy
   */
  private async attemptRecovery<T>(
    error: ErrorInfo,
    operation: () => Promise<T>,
    context?: Record<string, unknown>
  ): Promise<RecoveryResult & { data?: T }> {
    const startTime = Date.now();
    // Use a consistent circuit breaker ID based on error category and code
    const circuitBreakerId = `${error.category}-${error.code}`;

    if (this.config.enableCircuitBreaker) {
      const breaker = this.getOrCreateCircuitBreaker(circuitBreakerId);
      if (!breaker.canExecute()) {
        return {
          success: false,
          recovered: false,
          strategy: RecoveryStrategy.CIRCUIT_BREAKER,
          attempts: 0,
          duration: Date.now() - startTime,
          message: 'Circuit breaker is open',
        };
      }
    }

    switch (error.recoveryStrategy) {
      case RecoveryStrategy.RETRY:
        return this.retryOperation(operation, error, context, circuitBreakerId);

      case RecoveryStrategy.FALLBACK:
        return this.fallbackOperation(operation, error, context);

      case RecoveryStrategy.GRACEFUL_DEGRADATION:
        return this.gracefulDegradation(operation, error, context);

      default:
        // For NONE strategy, try to execute the operation once
        try {
          const result = await operation();
          return {
            success: true,
            recovered: true,
            strategy: RecoveryStrategy.NONE,
            attempts: 1,
            duration: Date.now() - startTime,
            message: 'Operation executed without recovery',
            data: result,
          };
        } catch {
          return {
            success: false,
            recovered: false,
            strategy: RecoveryStrategy.NONE,
            attempts: 1,
            duration: Date.now() - startTime,
            message: 'Operation failed without recovery strategy',
            data: undefined,
          };
        }
    }
  }

  /**
   * Retry operation with exponential backoff
   */
  private async retryOperation<T>(
    operation: () => Promise<T>,
    error: ErrorInfo,
    context?: Record<string, unknown>,
    circuitBreakerId?: string
  ): Promise<RecoveryResult & { data?: T }> {
    const startTime = Date.now();
    let lastError: Error | undefined;
    let delay = this.config.retryDelay;

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        if (attempt > 1) {
          await this.sleep(delay);
          delay = Math.min(
            delay * this.config.backoffMultiplier,
            this.config.maxRetryDelay
          );
        }

        const result = await operation();

        if (this.config.enableCircuitBreaker && circuitBreakerId) {
          const breaker = this.getOrCreateCircuitBreaker(circuitBreakerId);
          breaker.onSuccess();
        }

        return {
          success: true,
          recovered: true,
          strategy: RecoveryStrategy.RETRY,
          attempts: attempt,
          duration: Date.now() - startTime,
          data: result,
        };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));

        if (this.config.enableCircuitBreaker && circuitBreakerId) {
          const breaker = this.getOrCreateCircuitBreaker(circuitBreakerId);
          breaker.onFailure();
        }

        if (this.config.enableLogging) {
          runtimeLogger.warn(
            `Retry attempt ${attempt}/${this.config.retryAttempts} failed`,
            {
              error: {
                code: 'RETRY_ATTEMPT_FAILED',
                message: lastError.message,
                stack: lastError.stack,
              },
              metadata: context,
            } as LogContext
          );
        }
      }
    }

    return {
      success: false,
      recovered: false,
      strategy: RecoveryStrategy.RETRY,
      attempts: this.config.retryAttempts,
      duration: Date.now() - startTime,
      message: `All retry attempts failed: ${lastError?.message}`,
      newError: this.createError(
        `Retry failed after ${this.config.retryAttempts} attempts`,
        'RETRY_EXHAUSTED',
        ErrorCategory.SYSTEM,
        ErrorSeverity.HIGH,
        { originalError: error, lastError: lastError?.message },
        lastError
      ),
    };
  }

  /**
   * Fallback operation
   */
  private async fallbackOperation<T>(
    operation: () => Promise<T>,
    error: ErrorInfo,
    context?: Record<string, unknown>
  ): Promise<RecoveryResult & { data?: T }> {
    const startTime = Date.now();

    try {
      // Try original operation first
      const result = await operation();
      return {
        success: true,
        recovered: true,
        strategy: RecoveryStrategy.FALLBACK,
        attempts: 1,
        duration: Date.now() - startTime,
        data: result,
      };
    } catch (primaryError) {
      // Implement fallback logic here
      // This is a simplified example - in practice, you'd have specific fallback operations

      if (this.config.enableLogging) {
        const primaryErrorObj =
          primaryError instanceof Error
            ? primaryError
            : new Error(String(primaryError));
        runtimeLogger.warn('Primary operation failed, attempting fallback', {
          error: {
            code: 'FALLBACK_PRIMARY_ERROR',
            message: primaryErrorObj.message,
            stack: primaryErrorObj.stack,
          },
          metadata: context,
        } as LogContext);
      }

      return {
        success: false,
        recovered: false,
        strategy: RecoveryStrategy.FALLBACK,
        attempts: 1,
        duration: Date.now() - startTime,
        message: 'Fallback operation not implemented',
      };
    }
  }

  /**
   * Graceful degradation
   */
  private async gracefulDegradation<T>(
    operation: () => Promise<T>,
    error: ErrorInfo,
    context?: Record<string, unknown>
  ): Promise<RecoveryResult & { data?: T }> {
    const startTime = Date.now();

    try {
      const result = await operation();
      return {
        success: true,
        recovered: true,
        strategy: RecoveryStrategy.GRACEFUL_DEGRADATION,
        attempts: 1,
        duration: Date.now() - startTime,
        data: result,
      };
    } catch (err) {
      // Provide degraded functionality
      if (this.config.enableLogging) {
        const errorObj = err instanceof Error ? err : new Error(String(err));
        runtimeLogger.warn(
          'Operation failed, providing degraded functionality',
          {
            error: {
              code: 'GRACEFUL_DEGRADATION_ERROR',
              message: errorObj.message,
              stack: errorObj.stack,
            },
            metadata: context,
          } as LogContext
        );
      }

      return {
        success: true,
        recovered: true,
        strategy: RecoveryStrategy.GRACEFUL_DEGRADATION,
        attempts: 1,
        duration: Date.now() - startTime,
        data: undefined, // Degraded response
        message: 'Providing degraded functionality',
      };
    }
  }

  /**
   * Determine recovery strategy based on error category and severity
   */
  private determineRecoveryStrategy(
    category: ErrorCategory,
    severity: ErrorSeverity
  ): RecoveryStrategy {
    if (severity === ErrorSeverity.CRITICAL) {
      return RecoveryStrategy.RESTART;
    }

    switch (category) {
      case ErrorCategory.NETWORK:
        return RecoveryStrategy.RETRY;
      case ErrorCategory.RESOURCE:
        return RecoveryStrategy.GRACEFUL_DEGRADATION;
      case ErrorCategory.CONFIGURATION:
        return RecoveryStrategy.FALLBACK;
      case ErrorCategory.VALIDATION:
        return RecoveryStrategy.NONE;
      default:
        return RecoveryStrategy.RETRY;
    }
  }

  /**
   * Get or create circuit breaker
   */
  private getOrCreateCircuitBreaker(operationId: string): CircuitBreaker {
    if (!this.circuitBreakers.has(operationId)) {
      this.circuitBreakers.set(
        operationId,
        new CircuitBreaker(
          this.config.circuitBreakerThreshold,
          this.config.circuitBreakerTimeout
        )
      );
    }
    return this.circuitBreakers.get(operationId)!;
  }

  /**
   * Update error metrics
   */
  private updateMetrics(error: ErrorInfo): void {
    const key = `${error.category}:${error.code}`;
    const existing = this.errorMetrics.get(key);

    this.errorMetrics.set(key, {
      count: existing ? existing.count + 1 : 1,
      lastOccurrence: error.timestamp,
      severity: error.severity,
    });
  }

  /**
   * Log error information
   */
  private logError(error: ErrorInfo): void {
    const logContext: LogContext = {
      correlationId: error.id,
      error: {
        code: error.code,
        message: error.message,
        stack: error.stack || '',
      },
      metadata: {
        module: 'error-handler',
        operation: 'error-logging',
        tags: [error.severity, error.category],
        errorDetails: JSON.stringify({
          ...error.metadata,
          severity: error.severity,
          category: error.category,
        }),
      } as LogMetadata,
    };

    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        runtimeLogger.error(
          `CRITICAL ERROR: ${error.message}`,
          new Error(error.message),
          logContext
        );
        break;
      case ErrorSeverity.HIGH:
        runtimeLogger.error(
          `HIGH SEVERITY: ${error.message}`,
          new Error(error.message),
          logContext
        );
        break;
      case ErrorSeverity.MEDIUM:
        runtimeLogger.warn(`MEDIUM SEVERITY: ${error.message}`, logContext);
        break;
      case ErrorSeverity.LOW:
        runtimeLogger.info(`LOW SEVERITY: ${error.message}`, logContext);
        break;
    }
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Generate unique operation ID
   */
  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Global error handler instance
 */
export const errorHandler = ErrorHandler.getInstance();

/**
 * Convenience functions for creating specific error types
 */
export const createValidationError = (
  message: string,
  context?: Record<string, unknown>
): ErrorInfo =>
  errorHandler.createError(
    message,
    'VALIDATION_ERROR',
    ErrorCategory.VALIDATION,
    ErrorSeverity.MEDIUM,
    context
  );

export const createNetworkError = (
  message: string,
  context?: Record<string, unknown>
): ErrorInfo =>
  errorHandler.createError(
    message,
    'NETWORK_ERROR',
    ErrorCategory.NETWORK,
    ErrorSeverity.HIGH,
    context
  );

export const createConfigurationError = (
  message: string,
  context?: Record<string, unknown>
): ErrorInfo =>
  errorHandler.createError(
    message,
    'CONFIG_ERROR',
    ErrorCategory.CONFIGURATION,
    ErrorSeverity.HIGH,
    context
  );

export const createSystemError = (
  message: string,
  context?: Record<string, unknown>
): ErrorInfo =>
  errorHandler.createError(
    message,
    'SYSTEM_ERROR',
    ErrorCategory.SYSTEM,
    ErrorSeverity.CRITICAL,
    context
  );

export const createAuthenticationError = (
  message: string,
  context?: Record<string, unknown>
): ErrorInfo =>
  errorHandler.createError(
    message,
    'AUTH_ERROR',
    ErrorCategory.AUTHENTICATION,
    ErrorSeverity.HIGH,
    context
  );

export const createResourceError = (
  message: string,
  context?: Record<string, unknown>
): ErrorInfo =>
  errorHandler.createError(
    message,
    'RESOURCE_ERROR',
    ErrorCategory.RESOURCE,
    ErrorSeverity.MEDIUM,
    context
  );

/**
 * Decorator for automatic error handling
 */
export function handleErrors(
  category: ErrorCategory = ErrorCategory.RUNTIME,
  severity: ErrorSeverity = ErrorSeverity.MEDIUM
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      try {
        return await originalMethod.apply(this, args);
      } catch (error) {
        const errorInfo = errorHandler.createError(
          error instanceof Error ? error.message : String(error),
          'DECORATED_METHOD_ERROR',
          category,
          severity,
          { methodName: propertyKey, className: target.constructor.name },
          error instanceof Error ? error : undefined
        );

        const result = await errorHandler.handleError(
          errorInfo,
          () => originalMethod.apply(this, args),
          { methodName: propertyKey, className: target.constructor.name }
        );

        if (!result.success) {
          throw new Error(result.error || 'Method execution failed');
        }

        return result.data;
      }
    };

    return descriptor;
  };
}
