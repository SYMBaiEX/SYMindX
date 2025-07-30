/**
 * @module error-handler
 * @description Comprehensive error handling and recovery system for SYMindX with enhanced component-specific configurations and analytics
 */

import type {
  OperationResult,
  ExecutionResult,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  LogContext,
  LogMetadata,
  ConfigValue,
} from '../types/index.js';

import { runtimeLogger } from './logger.js';
import {
  SYMindXError,
  createRuntimeError,
  createPortalError,
  createExtensionError,
  createMemoryError,
  createConfigurationError,
  createNetworkError,
  safeAsync,
  isSYMindXError,
} from './standard-errors.js';

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
 * Component-specific error handling configuration
 */
export interface ComponentErrorConfig {
  readonly componentName: string;
  readonly defaultCategory: ErrorCategory;
  readonly defaultSeverity: ErrorSeverity;
  readonly enableRetry: boolean;
  readonly maxRetries: number;
  readonly enableCircuitBreaker: boolean;
  readonly enableFallback: boolean;
  readonly fallbackHandler?: (error: SYMindXError) => Promise<any>;
}

/**
 * Enhanced recovery result with component context
 */
export interface EnhancedRecoveryResult<T = any> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: SYMindXError;
  readonly strategy: RecoveryStrategy;
  readonly attempts: number;
  readonly duration: number;
  readonly componentName: string;
  readonly recoveryPath: string[];
  readonly metrics: {
    readonly errorCount: number;
    readonly successRate: number;
    readonly avgRecoveryTime: number;
  };
}

/**
 * Error analytics configuration
 */
export interface ErrorAnalyticsConfig {
  readonly enabled: boolean;
  readonly retentionDays: number;
  readonly alertThresholds: {
    readonly errorRate: number;
    readonly criticalErrors: number;
    readonly circuitBreakerTrips: number;
  };
  readonly aggregationInterval: number;
}

/**
 * Error trend data
 */
export interface ErrorTrend {
  readonly timestamp: Date;
  readonly errorCount: number;
  readonly successCount: number;
  readonly errorRate: number;
  readonly avgResponseTime: number;
  readonly topErrors: Array<{
    readonly code: string;
    readonly count: number;
    readonly category: ErrorCategory;
    readonly severity: ErrorSeverity;
  }>;
}

/**
 * Component health status
 */
export interface ComponentHealth {
  readonly componentName: string;
  readonly status: 'healthy' | 'degraded' | 'critical' | 'down';
  readonly errorRate: number;
  readonly successRate: number;
  readonly avgResponseTime: number;
  readonly circuitBreakerState: string;
  readonly lastError?: {
    readonly timestamp: Date;
    readonly message: string;
    readonly code: string;
    readonly severity: ErrorSeverity;
  };
  readonly recommendations: string[];
}

/**
 * System-wide error analytics
 */
export interface SystemErrorAnalytics {
  readonly overall: {
    readonly totalErrors: number;
    readonly totalRequests: number;
    readonly errorRate: number;
    readonly avgResponseTime: number;
    readonly uptime: number;
  };
  readonly components: ComponentHealth[];
  readonly trends: ErrorTrend[];
  readonly alerts: ErrorAlert[];
  readonly topErrors: Array<{
    readonly code: string;
    readonly count: number;
    readonly impact: 'low' | 'medium' | 'high' | 'critical';
    readonly components: string[];
  }>;
}

/**
 * Error alert
 */
export interface ErrorAlert {
  readonly id: string;
  readonly type:
    | 'error_rate'
    | 'critical_error'
    | 'circuit_breaker'
    | 'component_down';
  readonly severity: 'warning' | 'critical';
  readonly message: string;
  readonly component?: string;
  readonly timestamp: Date;
  readonly acknowledged: boolean;
  readonly metadata: Record<string, unknown>;
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
 * Comprehensive error handler with recovery mechanisms and enhanced component support
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

  // Component-specific configurations
  private componentConfigs = new Map<string, ComponentErrorConfig>();
  private componentMetrics = new Map<
    string,
    {
      errorCount: number;
      successCount: number;
      totalRecoveryTime: number;
      lastError?: Date;
    }
  >();

  // Analytics support
  private analyticsConfig: ErrorAnalyticsConfig = {
    enabled: true,
    retentionDays: 7,
    alertThresholds: {
      errorRate: 0.1,
      criticalErrors: 5,
      circuitBreakerTrips: 3,
    },
    aggregationInterval: 60000,
  };
  private errorHistory: Array<{
    timestamp: Date;
    error: SYMindXError | ErrorInfo;
    component: string;
    recovered: boolean;
    responseTime: number;
  }> = [];
  private alerts: ErrorAlert[] = [];
  private analyticsTimer?: ReturnType<typeof setInterval>;
  private startTime = new Date();

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
   * Register component-specific error handling configuration
   */
  public registerComponent(config: ComponentErrorConfig): void {
    this.componentConfigs.set(config.componentName, config);

    // Initialize metrics
    this.componentMetrics.set(config.componentName, {
      errorCount: 0,
      successCount: 0,
      totalRecoveryTime: 0,
    });

    runtimeLogger.info(
      `Registered error handling for component: ${config.componentName}`,
      {
        config: {
          category: config.defaultCategory,
          severity: config.defaultSeverity,
          retryEnabled: config.enableRetry,
          circuitBreakerEnabled: config.enableCircuitBreaker,
          fallbackEnabled: config.enableFallback,
        },
      }
    );
  }

  /**
   * Handle error with component-specific configuration
   */
  public async handleComponentError<T>(
    componentName: string,
    error: Error | SYMindXError,
    operation: () => Promise<T>,
    context?: Record<string, unknown>
  ): Promise<EnhancedRecoveryResult<T>> {
    const startTime = Date.now();
    const config = this.componentConfigs.get(componentName);

    if (!config) {
      throw createRuntimeError(
        `Component '${componentName}' not registered for error handling`,
        'COMPONENT_NOT_REGISTERED',
        { componentName }
      );
    }

    // Convert to SYMindXError if needed
    const symindxError = this.normalizeError(error, config, context);

    // Update metrics
    this.updateComponentMetrics(componentName, 'error');

    try {
      // Use the core error handler with component context
      const result = await this.handleError(symindxError, operation, {
        ...context,
        componentName,
      });

      const duration = Date.now() - startTime;
      const metrics = this.getComponentMetrics(componentName);

      if (result.success) {
        this.updateComponentMetrics(componentName, 'success', duration);
      }

      // Record for analytics
      if (this.analyticsConfig.enabled) {
        this.recordError(symindxError, componentName, result.success, duration);
      }

      return {
        success: result.success,
        data: result.data,
        error: result.success ? undefined : symindxError,
        strategy: result.metadata?.recovery?.strategy || RecoveryStrategy.NONE,
        attempts: result.metadata?.recovery?.attempts || 1,
        duration,
        componentName,
        recoveryPath: this.buildRecoveryPath(
          symindxError,
          result.metadata?.recovery?.strategy
        ),
        metrics: {
          errorCount: metrics.errorCount,
          successRate:
            metrics.successCount / (metrics.errorCount + metrics.successCount),
          avgRecoveryTime:
            metrics.totalRecoveryTime / Math.max(metrics.successCount, 1),
        },
      };
    } catch (recoveryError) {
      const duration = Date.now() - startTime;
      const finalError = createRuntimeError(
        'Component error recovery failed',
        'COMPONENT_RECOVERY_FAILED',
        {
          componentName,
          originalError: symindxError.toJSON(),
          recoveryError:
            recoveryError instanceof Error
              ? recoveryError.message
              : String(recoveryError),
        },
        recoveryError instanceof Error ? recoveryError : undefined
      );

      return {
        success: false,
        error: finalError,
        strategy: RecoveryStrategy.NONE,
        attempts: 1,
        duration,
        componentName,
        recoveryPath: ['failed'],
        metrics: this.getComponentMetrics(componentName),
      };
    }
  }

  /**
   * Wrap a function with component-specific error handling
   */
  public wrapComponentFunction<TArgs extends unknown[], TReturn>(
    componentName: string,
    fn: (...args: TArgs) => Promise<TReturn>,
    operationName?: string
  ): (...args: TArgs) => Promise<TReturn> {
    return async (...args: TArgs) => {
      const result = await this.handleComponentError(
        componentName,
        new Error('Function execution failed'),
        () => fn(...args),
        { operationName, args: args.length }
      );

      if (!result.success) {
        throw result.error || new Error('Component function execution failed');
      }

      return result.data!;
    };
  }

  /**
   * Create component-specific error
   */
  public createComponentError(
    componentName: string,
    message: string,
    code: string,
    context?: Record<string, unknown>,
    cause?: Error
  ): SYMindXError {
    const config = this.componentConfigs.get(componentName);

    if (!config) {
      return createRuntimeError(message, code, context, cause);
    }

    const enrichedContext = {
      ...context,
      componentName,
      componentConfig: {
        category: config.defaultCategory,
        severity: config.defaultSeverity,
      },
    };

    switch (config.defaultCategory) {
      case ErrorCategory.SYSTEM:
        return createPortalError(
          message,
          componentName,
          undefined,
          code,
          enrichedContext,
          cause
        );
      case ErrorCategory.CONFIGURATION:
        return createConfigurationError(
          message,
          code,
          componentName,
          undefined,
          enrichedContext,
          cause
        );
      case ErrorCategory.NETWORK:
        return createNetworkError(
          message,
          code,
          undefined,
          undefined,
          undefined,
          enrichedContext,
          cause
        );
      case ErrorCategory.RESOURCE:
        return createMemoryError(
          message,
          code,
          componentName,
          undefined,
          enrichedContext,
          cause
        );
      default:
        return createRuntimeError(message, code, enrichedContext, cause);
    }
  }

  /**
   * Get component error metrics
   */
  public getComponentMetrics(componentName: string) {
    const metrics = this.componentMetrics.get(componentName);
    if (!metrics) {
      return {
        errorCount: 0,
        successRate: 0,
        avgRecoveryTime: 0,
      };
    }

    return {
      errorCount: metrics.errorCount,
      successRate:
        metrics.successCount /
        Math.max(metrics.errorCount + metrics.successCount, 1),
      avgRecoveryTime:
        metrics.totalRecoveryTime / Math.max(metrics.successCount, 1),
    };
  }

  /**
   * Get all component metrics for dashboard
   */
  public getAllComponentMetrics(): Record<
    string,
    ReturnType<typeof this.getComponentMetrics> & { componentName: string }
  > {
    const result: Record<string, any> = {};

    for (const [componentName] of this.componentConfigs) {
      result[componentName] = {
        ...this.getComponentMetrics(componentName),
        componentName,
      };
    }

    return result;
  }

  /**
   * Reset component metrics
   */
  public resetComponentMetrics(componentName?: string): void {
    if (componentName) {
      this.componentMetrics.set(componentName, {
        errorCount: 0,
        successCount: 0,
        totalRecoveryTime: 0,
      });
    } else {
      this.componentMetrics.clear();
      for (const [name] of this.componentConfigs) {
        this.componentMetrics.set(name, {
          errorCount: 0,
          successCount: 0,
          totalRecoveryTime: 0,
        });
      }
    }
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
      recoveryStrategy: this.determineRecoveryStrategy(category, severity),
      metadata: {
        environment: process.env['NODE_ENV'] || 'development',
        nodeVersion: process.version,
        platform: process.platform,
      },
      ...(cause instanceof Error && cause.stack ? { stack: cause.stack } : {}),
      ...(context !== undefined ? { context } : {}),
      ...(cause !== undefined ? { cause } : {}),
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

      const result: ExecutionResult<T> = {
        success: recovery.success,
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

      if (
        recovery.success &&
        'data' in recovery &&
        recovery.data !== undefined
      ) {
        result.data = recovery.data;
      }

      if (!recovery.success) {
        result.error = recovery.message || 'Recovery failed';
      }

      return result;
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
  public wrap<TArgs extends unknown[], TReturn>(
    fn: (...args: TArgs) => Promise<TReturn>,
    context?: Record<string, unknown>
  ): (...args: TArgs) => Promise<TReturn> {
    return async (...args: TArgs) => {
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
    };
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
        value: config.name as ConfigValue,
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
            value: value as ConfigValue,
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
            value: value as ConfigValue,
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
            value: value as ConfigValue,
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
            // data omitted when undefined
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
        message: 'Providing degraded functionality',
        // data omitted when undefined
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

  /**
   * Normalize error to SYMindXError
   */
  private normalizeError(
    error: Error | SYMindXError,
    config: ComponentErrorConfig,
    context?: Record<string, unknown>
  ): SYMindXError {
    if (isSYMindXError(error)) {
      return error;
    }

    return this.createComponentError(
      config.componentName,
      error.message,
      'COMPONENT_ERROR',
      context,
      error
    );
  }

  /**
   * Update component metrics
   */
  private updateComponentMetrics(
    componentName: string,
    type: 'error' | 'success',
    duration?: number
  ): void {
    const metrics = this.componentMetrics.get(componentName);
    if (!metrics) return;

    if (type === 'error') {
      metrics.errorCount++;
      metrics.lastError = new Date();
    } else {
      metrics.successCount++;
      if (duration) {
        metrics.totalRecoveryTime += duration;
      }
    }
  }

  /**
   * Build recovery path for debugging
   */
  private buildRecoveryPath(
    error: SYMindXError | ErrorInfo,
    strategy?: RecoveryStrategy
  ): string[] {
    const path = [
      'category' in error ? error.category : 'unknown',
      'code' in error ? error.code : 'unknown',
    ];

    if (strategy) {
      path.push(strategy);
    }

    return path;
  }

  // Analytics Methods

  /**
   * Configure analytics settings
   */
  public configureAnalytics(config: Partial<ErrorAnalyticsConfig>): void {
    this.analyticsConfig = { ...this.analyticsConfig, ...config };

    if (this.analyticsConfig.enabled && !this.analyticsTimer) {
      this.startAnalytics();
    } else if (!this.analyticsConfig.enabled && this.analyticsTimer) {
      this.stopAnalytics();
    }
  }

  /**
   * Record an error event for analytics
   */
  private recordError(
    error: SYMindXError | ErrorInfo,
    component: string,
    recovered: boolean,
    responseTime: number
  ): void {
    if (!this.analyticsConfig.enabled) return;

    this.errorHistory.push({
      timestamp: new Date(),
      error,
      component,
      recovered,
      responseTime,
    });

    // Check for alerts
    this.checkAlertThresholds(error, component);

    // Clean old entries
    this.cleanupHistory();
  }

  /**
   * Get system-wide error analytics
   */
  public getSystemAnalytics(): SystemErrorAnalytics {
    const now = new Date();
    const recentHistory = this.errorHistory.filter(
      (entry) => now.getTime() - entry.timestamp.getTime() < 24 * 60 * 60 * 1000 // Last 24 hours
    );

    const totalRequests = recentHistory.length;
    const totalErrors = recentHistory.filter(
      (entry) => !entry.recovered
    ).length;
    const errorRate = totalRequests > 0 ? totalErrors / totalRequests : 0;
    const avgResponseTime =
      recentHistory.length > 0
        ? recentHistory.reduce((sum, entry) => sum + entry.responseTime, 0) /
          recentHistory.length
        : 0;

    return {
      overall: {
        totalErrors,
        totalRequests,
        errorRate,
        avgResponseTime,
        uptime: now.getTime() - this.startTime.getTime(),
      },
      components: this.getComponentsHealth(),
      trends: this.generateTrends(),
      alerts: this.getActiveAlerts(),
      topErrors: this.getTopErrors(),
    };
  }

  /**
   * Get component health status
   */
  public getComponentHealth(componentName: string): ComponentHealth {
    const componentErrors = this.errorHistory.filter(
      (entry) => entry.component === componentName
    );
    const recentErrors = componentErrors.filter(
      (entry) =>
        new Date().getTime() - entry.timestamp.getTime() < 60 * 60 * 1000 // Last hour
    );

    const totalRequests = recentErrors.length;
    const failedRequests = recentErrors.filter(
      (entry) => !entry.recovered
    ).length;
    const errorRate = totalRequests > 0 ? failedRequests / totalRequests : 0;
    const successRate = 1 - errorRate;
    const avgResponseTime =
      recentErrors.length > 0
        ? recentErrors.reduce((sum, entry) => sum + entry.responseTime, 0) /
          recentErrors.length
        : 0;

    const lastError = componentErrors.sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    )[0];

    // Determine status
    let status: ComponentHealth['status'] = 'healthy';
    if (errorRate > 0.5) status = 'critical';
    else if (errorRate > 0.2) status = 'degraded';
    else if (totalRequests === 0) status = 'down';

    // Get circuit breaker state
    const circuitBreakerStatus = this.getCircuitBreakerStatus(componentName);

    const recommendations = this.generateRecommendations(
      errorRate,
      avgResponseTime,
      circuitBreakerStatus
    );

    return {
      componentName,
      status,
      errorRate,
      successRate,
      avgResponseTime,
      circuitBreakerState: circuitBreakerStatus.state,
      lastError: lastError
        ? {
            timestamp: lastError.timestamp,
            message: lastError.error.message,
            code: 'code' in lastError.error ? lastError.error.code : 'UNKNOWN',
            severity:
              'severity' in lastError.error
                ? lastError.error.severity
                : ErrorSeverity.MEDIUM,
          }
        : undefined,
      recommendations,
    };
  }

  /**
   * Get error trends over time
   */
  public getErrorTrends(hours = 24): ErrorTrend[] {
    const now = new Date();
    const trends: ErrorTrend[] = [];
    const intervalMs = 60 * 60 * 1000; // 1 hour intervals

    for (let i = hours; i >= 0; i--) {
      const endTime = new Date(now.getTime() - i * intervalMs);
      const startTime = new Date(endTime.getTime() - intervalMs);

      const intervalErrors = this.errorHistory.filter(
        (entry) => entry.timestamp >= startTime && entry.timestamp < endTime
      );

      const errorCount = intervalErrors.filter(
        (entry) => !entry.recovered
      ).length;
      const successCount = intervalErrors.filter(
        (entry) => entry.recovered
      ).length;
      const totalCount = intervalErrors.length;
      const errorRate = totalCount > 0 ? errorCount / totalCount : 0;
      const avgResponseTime =
        totalCount > 0
          ? intervalErrors.reduce((sum, entry) => sum + entry.responseTime, 0) /
            totalCount
          : 0;

      // Get top errors for this interval
      const errorCounts = new Map<
        string,
        { count: number; category: ErrorCategory; severity: ErrorSeverity }
      >();
      intervalErrors.forEach((entry) => {
        const code = 'code' in entry.error ? entry.error.code : 'UNKNOWN';
        const existing = errorCounts.get(code);
        errorCounts.set(code, {
          count: (existing?.count || 0) + 1,
          category:
            'category' in entry.error
              ? entry.error.category
              : ErrorCategory.RUNTIME,
          severity:
            'severity' in entry.error
              ? entry.error.severity
              : ErrorSeverity.MEDIUM,
        });
      });

      const topErrors = Array.from(errorCounts.entries())
        .map(([code, data]) => ({ code, ...data }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      trends.push({
        timestamp: endTime,
        errorCount,
        successCount,
        errorRate,
        avgResponseTime,
        topErrors,
      });
    }

    return trends;
  }

  /**
   * Acknowledge an alert
   */
  public acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (alert) {
      (alert as any).acknowledged = true;
      return true;
    }
    return false;
  }

  /**
   * Get active alerts
   */
  public getActiveAlerts(): ErrorAlert[] {
    return this.alerts.filter((alert) => !alert.acknowledged);
  }

  /**
   * Clear acknowledged alerts
   */
  public clearAcknowledgedAlerts(): number {
    const before = this.alerts.length;
    this.alerts = this.alerts.filter((alert) => !alert.acknowledged);
    return before - this.alerts.length;
  }

  /**
   * Export analytics data for external systems
   */
  public exportAnalytics(format: 'json' | 'csv' = 'json'): string {
    const analytics = this.getSystemAnalytics();

    if (format === 'csv') {
      const headers = [
        'timestamp',
        'component',
        'error_code',
        'error_message',
        'severity',
        'recovered',
        'response_time',
      ];
      const rows = this.errorHistory.map((entry) => [
        entry.timestamp.toISOString(),
        entry.component,
        'code' in entry.error ? entry.error.code : 'UNKNOWN',
        entry.error.message.replace(/,/g, ';'), // Escape commas
        'severity' in entry.error ? entry.error.severity : ErrorSeverity.MEDIUM,
        entry.recovered.toString(),
        entry.responseTime.toString(),
      ]);

      return [headers.join(','), ...rows.map((row) => row.join(','))].join(
        '\n'
      );
    }

    return JSON.stringify(analytics, null, 2);
  }

  /**
   * Start analytics processing
   */
  private startAnalytics(): void {
    if (this.analyticsTimer) return;

    this.analyticsTimer = setInterval(() => {
      this.processAnalytics();
    }, this.analyticsConfig.aggregationInterval);

    runtimeLogger.info('Error analytics engine started', {
      config: this.analyticsConfig,
    });
  }

  /**
   * Stop analytics processing
   */
  public stopAnalytics(): void {
    if (this.analyticsTimer) {
      clearInterval(this.analyticsTimer);
      this.analyticsTimer = undefined;
    }
  }

  /**
   * Process analytics and generate insights
   */
  private processAnalytics(): void {
    // Clean up old data
    this.cleanupHistory();
    this.cleanupAlerts();

    // Generate system health report
    const analytics = this.getSystemAnalytics();

    runtimeLogger.debug('Error analytics processed', {
      totalErrors: analytics.overall.totalErrors,
      errorRate: analytics.overall.errorRate,
      activeAlerts: analytics.alerts.length,
    });
  }

  /**
   * Check alert thresholds
   */
  private checkAlertThresholds(
    error: SYMindXError | ErrorInfo,
    component: string
  ): void {
    // Check critical error threshold
    const severity =
      'severity' in error ? error.severity : ErrorSeverity.MEDIUM;
    if (severity === ErrorSeverity.CRITICAL) {
      const recentCritical = this.errorHistory.filter((entry) => {
        const entrySeverity =
          'severity' in entry.error
            ? entry.error.severity
            : ErrorSeverity.MEDIUM;
        return (
          entrySeverity === ErrorSeverity.CRITICAL &&
          new Date().getTime() - entry.timestamp.getTime() < 60 * 60 * 1000
        ); // Last hour
      }).length;

      if (
        recentCritical >= this.analyticsConfig.alertThresholds.criticalErrors
      ) {
        this.createAlert(
          'critical_error',
          'critical',
          `Critical error threshold exceeded: ${recentCritical} critical errors in the last hour`,
          component,
          { criticalErrorCount: recentCritical }
        );
      }
    }

    // Check error rate threshold
    const componentHealth = this.getComponentHealth(component);
    if (
      componentHealth.errorRate > this.analyticsConfig.alertThresholds.errorRate
    ) {
      this.createAlert(
        'error_rate',
        'warning',
        `High error rate detected: ${(componentHealth.errorRate * 100).toFixed(1)}%`,
        component,
        { errorRate: componentHealth.errorRate }
      );
    }

    // Check circuit breaker trips
    const circuitBreakerStatus = this.getCircuitBreakerStatus(component);
    if (circuitBreakerStatus.state === 'open') {
      this.createAlert(
        'circuit_breaker',
        'critical',
        `Circuit breaker tripped for component: ${component}`,
        component,
        {
          state: circuitBreakerStatus.state,
          failureCount: circuitBreakerStatus.failureCount,
        }
      );
    }
  }

  /**
   * Create an alert
   */
  private createAlert(
    type: ErrorAlert['type'],
    severity: ErrorAlert['severity'],
    message: string,
    component?: string,
    metadata: Record<string, unknown> = {}
  ): void {
    // Check if similar alert already exists
    const existingAlert = this.alerts.find(
      (alert) =>
        alert.type === type &&
        alert.component === component &&
        !alert.acknowledged &&
        new Date().getTime() - alert.timestamp.getTime() < 60 * 60 * 1000 // Within last hour
    );

    if (existingAlert) return; // Don't create duplicate alerts

    const alert: ErrorAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      type,
      severity,
      message,
      component,
      timestamp: new Date(),
      acknowledged: false,
      metadata,
    };

    this.alerts.push(alert);

    runtimeLogger.warn(`Error alert created: ${message}`, {
      alert: {
        id: alert.id,
        type: alert.type,
        severity: alert.severity,
        component: alert.component,
      },
    });
  }

  /**
   * Get components health status
   */
  private getComponentsHealth(): ComponentHealth[] {
    const components = new Set(
      this.errorHistory.map((entry) => entry.component)
    );
    return Array.from(components).map((component) =>
      this.getComponentHealth(component)
    );
  }

  /**
   * Generate error trends
   */
  private generateTrends(): ErrorTrend[] {
    return this.getErrorTrends(24);
  }

  /**
   * Get top errors across all components
   */
  private getTopErrors() {
    const errorCounts = new Map<
      string,
      { count: number; components: Set<string> }
    >();

    this.errorHistory.forEach((entry) => {
      const code = 'code' in entry.error ? entry.error.code : 'UNKNOWN';
      const existing = errorCounts.get(code);
      if (existing) {
        existing.count++;
        existing.components.add(entry.component);
      } else {
        errorCounts.set(code, {
          count: 1,
          components: new Set([entry.component]),
        });
      }
    });

    return Array.from(errorCounts.entries())
      .map(([code, data]) => ({
        code,
        count: data.count,
        impact: this.determineErrorImpact(data.count, data.components.size),
        components: Array.from(data.components),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  /**
   * Determine error impact level
   */
  private determineErrorImpact(
    count: number,
    componentCount: number
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (count > 100 || componentCount > 5) return 'critical';
    if (count > 50 || componentCount > 3) return 'high';
    if (count > 10 || componentCount > 1) return 'medium';
    return 'low';
  }

  /**
   * Generate recommendations for component health
   */
  private generateRecommendations(
    errorRate: number,
    avgResponseTime: number,
    circuitBreakerStatus: { state: string; failureCount: number }
  ): string[] {
    const recommendations: string[] = [];

    if (errorRate > 0.3) {
      recommendations.push('High error rate detected - investigate root cause');
    }
    if (avgResponseTime > 5000) {
      recommendations.push(
        'Slow response times - consider performance optimization'
      );
    }
    if (circuitBreakerStatus.state === 'open') {
      recommendations.push(
        'Circuit breaker is open - check downstream dependencies'
      );
    }
    if (circuitBreakerStatus.failureCount > 3) {
      recommendations.push(
        'Multiple failures detected - consider increasing timeout or implementing fallback'
      );
    }

    return recommendations;
  }

  /**
   * Clean up old error history
   */
  private cleanupHistory(): void {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - this.analyticsConfig.retentionDays);

    this.errorHistory = this.errorHistory.filter(
      (entry) => entry.timestamp >= cutoff
    );
  }

  /**
   * Clean up old alerts
   */
  private cleanupAlerts(): void {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 1); // Keep alerts for 1 day

    this.alerts = this.alerts.filter((alert) => alert.timestamp >= cutoff);
  }
}

/**
 * Global error handler instance
 */
export const errorHandler = ErrorHandler.getInstance();

/**
 * Enhanced error handler alias for compatibility
 */
export const enhancedErrorHandler = errorHandler;

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
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (this: unknown, ...args: unknown[]) {
      try {
        return await originalMethod.apply(this, args);
      } catch (error) {
        const errorInfo = errorHandler.createError(
          error instanceof Error ? error.message : String(error),
          'DECORATED_METHOD_ERROR',
          category,
          severity,
          {
            methodName: propertyKey,
            className: (target as any).constructor.name,
          },
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

/**
 * Component registration helpers
 */
export const registerRuntimeComponent = () =>
  errorHandler.registerComponent({
    componentName: 'runtime',
    defaultCategory: ErrorCategory.RUNTIME,
    defaultSeverity: ErrorSeverity.HIGH,
    enableRetry: true,
    maxRetries: 3,
    enableCircuitBreaker: true,
    enableFallback: true,
  });

export const registerPortalComponent = (portalName: string) =>
  errorHandler.registerComponent({
    componentName: `portal:${portalName}`,
    defaultCategory: ErrorCategory.SYSTEM,
    defaultSeverity: ErrorSeverity.HIGH,
    enableRetry: true,
    maxRetries: 2,
    enableCircuitBreaker: true,
    enableFallback: true,
  });

export const registerExtensionComponent = (extensionName: string) =>
  errorHandler.registerComponent({
    componentName: `extension:${extensionName}`,
    defaultCategory: ErrorCategory.SYSTEM,
    defaultSeverity: ErrorSeverity.MEDIUM,
    enableRetry: false,
    maxRetries: 1,
    enableCircuitBreaker: false,
    enableFallback: true,
  });

export const registerMemoryComponent = (providerType: string) =>
  errorHandler.registerComponent({
    componentName: `memory:${providerType}`,
    defaultCategory: ErrorCategory.RESOURCE,
    defaultSeverity: ErrorSeverity.MEDIUM,
    enableRetry: true,
    maxRetries: 2,
    enableCircuitBreaker: true,
    enableFallback: true,
  });

/**
 * Convenience wrapper functions
 */
export const withRuntimeErrorHandling = <T extends unknown[], R>(
  fn: (...args: T) => Promise<R>
) => errorHandler.wrapComponentFunction('runtime', fn);

export const withPortalErrorHandling = <T extends unknown[], R>(
  portalName: string,
  fn: (...args: T) => Promise<R>
) => errorHandler.wrapComponentFunction(`portal:${portalName}`, fn);

export const withExtensionErrorHandling = <T extends unknown[], R>(
  extensionName: string,
  fn: (...args: T) => Promise<R>
) => errorHandler.wrapComponentFunction(`extension:${extensionName}`, fn);

export const withMemoryErrorHandling = <T extends unknown[], R>(
  providerType: string,
  fn: (...args: T) => Promise<R>
) => errorHandler.wrapComponentFunction(`memory:${providerType}`, fn);

/**
 * Initialize error handler with analytics
 */
export function initializeErrorHandler(
  config?: Partial<ErrorHandlerConfig & ErrorAnalyticsConfig>
): void {
  const handler = ErrorHandler.getInstance(config);

  if (config?.enabled !== false) {
    handler.configureAnalytics({
      enabled: config?.enabled ?? true,
      retentionDays: config?.retentionDays ?? 7,
      alertThresholds: config?.alertThresholds,
      aggregationInterval: config?.aggregationInterval ?? 60000,
    });
  }

  runtimeLogger.info('Error handler initialized with integrated analytics');
}
