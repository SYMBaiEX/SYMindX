/**
 * Standard Logging System for SYMindX
 * Provides consistent logging patterns across all modules
 */

import { Logger, createLogger, LoggerOptions } from './logger.js';
import { LogLevel, LogContext } from '../types/utils/logger.js';

// Standard logger categories with consistent prefixes
export const LOGGER_CATEGORIES = {
  RUNTIME: 'Runtime',
  AGENT: 'Agent',
  PORTAL: 'Portal',
  MEMORY: 'Memory',
  EMOTION: 'Emotion',
  COGNITION: 'Cognition',
  EXTENSION: 'Extension',
  API: 'API',
  CLI: 'CLI',
  WEBUI: 'WebUI',
  FACTORY: 'Factory',
  CONFIG: 'Config',
  DEBUG: 'Debug',
} as const;

// Standard logging context keys for structured logging
export interface StandardLogContext extends LogContext {
  agentId?: string;
  agentName?: string;
  extensionId?: string;
  portalName?: string;
  memoryProvider?: string;
  emotionType?: string;
  operation?: string;
  duration?: number;
  success?: boolean;
  errorCode?: string;
  moduleType?: string;
  sessionId?: string;
  requestId?: string;
  version?: string;
}

// Performance logging helper
export interface PerformanceMetrics {
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  success?: boolean;
  error?: Error;
  metadata?: Record<string, any>;
}

/**
 * Standard Logger Factory
 * Creates loggers with consistent configuration and context
 */
export class StandardLoggerFactory {
  private static defaultOptions: LoggerOptions = {
    level: LogLevel.INFO,
    colors: true,
  };

  /**
   * Create a logger for a specific category
   */
  static createLogger(
    category: keyof typeof LOGGER_CATEGORIES,
    options?: Partial<LoggerOptions>
  ): Logger {
    const prefix = LOGGER_CATEGORIES[category];
    return createLogger(prefix, { ...this.defaultOptions, ...options });
  }

  /**
   * Create a child logger with additional context
   */
  static createChildLogger(
    parentLogger: Logger,
    context: StandardLogContext
  ): Logger {
    return parentLogger.child(context);
  }

  /**
   * Set global log level for all new loggers
   */
  static setGlobalLogLevel(level: LogLevel): void {
    this.defaultOptions.level = level;
  }
}

/**
 * Performance Logger
 * Provides consistent performance and timing measurements
 */
export class PerformanceLogger {
  private logger: Logger;
  private metrics: Map<string, PerformanceMetrics> = new Map();

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Start timing an operation
   */
  startOperation(
    operationId: string,
    operation: string,
    metadata?: Record<string, any>
  ): void {
    const metrics: PerformanceMetrics = {
      operation,
      startTime: Date.now(),
      metadata,
    };
    this.metrics.set(operationId, metrics);

    this.logger.debug(`⏱️ Started: ${operation}`, {
      operation,
      operationId,
      ...metadata,
    });
  }

  /**
   * End timing an operation and log results
   */
  endOperation(
    operationId: string,
    success: boolean = true,
    error?: Error
  ): void {
    const metrics = this.metrics.get(operationId);
    if (!metrics) {
      this.logger.warn(`⚠️ No metrics found for operation: ${operationId}`);
      return;
    }

    metrics.endTime = Date.now();
    metrics.duration = metrics.endTime - metrics.startTime;
    metrics.success = success;
    metrics.error = error;

    const context: StandardLogContext = {
      operation: metrics.operation,
      duration: metrics.duration,
      success: metrics.success,
      ...metrics.metadata,
    };

    if (success) {
      this.logger.info(
        `✅ Completed: ${metrics.operation} (${metrics.duration}ms)`,
        context
      );
    } else {
      this.logger.error(
        `❌ Failed: ${metrics.operation} (${metrics.duration}ms)`,
        error,
        context
      );
    }

    this.metrics.delete(operationId);
  }

  /**
   * Log a quick timing measurement
   */
  timeOperation<T>(
    operation: string,
    fn: () => T | Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const operationId = `${operation}-${Date.now()}`;
    this.startOperation(operationId, operation, metadata);

    const result = fn();

    if (result instanceof Promise) {
      return result
        .then((value) => {
          this.endOperation(operationId, true);
          return value;
        })
        .catch((error) => {
          this.endOperation(operationId, false, error);
          throw error;
        });
    } else {
      this.endOperation(operationId, true);
      return Promise.resolve(result);
    }
  }
}

/**
 * Standard logging patterns for common operations
 */
export class StandardLoggingPatterns {
  private logger: Logger;
  private performanceLogger: PerformanceLogger;

  constructor(logger: Logger) {
    this.logger = logger;
    this.performanceLogger = new PerformanceLogger(logger);
  }

  /**
   * Log module initialization
   */
  logInitialization(
    moduleName: string,
    config?: any,
    context?: StandardLogContext
  ): void {
    this.logger.start(`Initializing ${moduleName}`, {
      module: moduleName,
      config: config ? Object.keys(config) : undefined,
      ...context,
    });
  }

  /**
   * Log successful initialization
   */
  logInitializationSuccess(
    moduleName: string,
    duration?: number,
    context?: StandardLogContext
  ): void {
    this.logger.success(`${moduleName} initialized successfully`, {
      module: moduleName,
      duration,
      ...context,
    });
  }

  /**
   * Log initialization failure
   */
  logInitializationFailure(
    moduleName: string,
    error: Error,
    context?: StandardLogContext
  ): void {
    this.logger.error(`Failed to initialize ${moduleName}`, error, {
      module: moduleName,
      ...context,
    });
  }

  /**
   * Log configuration loading
   */
  logConfigurationLoad(
    configType: string,
    source: string,
    context?: StandardLogContext
  ): void {
    this.logger.config(`Loading ${configType} from ${source}`, {
      configType,
      source,
      ...context,
    });
  }

  /**
   * Log agent operations
   */
  logAgentOperation(
    agentId: string,
    operation: string,
    success: boolean,
    error?: Error,
    context?: StandardLogContext
  ): void {
    const baseContext = { agentId, operation, success, ...context };

    if (success) {
      this.logger.agent(`Agent ${operation} completed`, baseContext);
    } else {
      this.logger.error(`Agent ${operation} failed`, error, baseContext);
    }
  }

  /**
   * Log memory operations
   */
  logMemoryOperation(
    operation: string,
    provider: string,
    recordCount?: number,
    context?: StandardLogContext
  ): void {
    this.logger.memory(`Memory ${operation}`, {
      operation,
      memoryProvider: provider,
      recordCount,
      ...context,
    });
  }

  /**
   * Log portal operations
   */
  logPortalOperation(
    portalName: string,
    operation: string,
    tokenCount?: number,
    context?: StandardLogContext
  ): void {
    this.logger.portal(`Portal ${operation}`, {
      portalName,
      operation,
      tokenCount,
      ...context,
    });
  }

  /**
   * Log extension operations
   */
  logExtensionOperation(
    extensionId: string,
    operation: string,
    success: boolean,
    context?: StandardLogContext
  ): void {
    const baseContext = { extensionId, operation, success, ...context };

    if (success) {
      this.logger.extension(`Extension ${operation} completed`, baseContext);
    } else {
      this.logger.extension(`Extension ${operation} failed`, baseContext);
    }
  }

  /**
   * Get performance logger for timing operations
   */
  getPerformanceLogger(): PerformanceLogger {
    return this.performanceLogger;
  }
}

/**
 * Standard logger instances for common use cases
 */
export const standardLoggers = {
  runtime: StandardLoggerFactory.createLogger('RUNTIME'),
  agent: StandardLoggerFactory.createLogger('AGENT'),
  portal: StandardLoggerFactory.createLogger('PORTAL'),
  memory: StandardLoggerFactory.createLogger('MEMORY'),
  emotion: StandardLoggerFactory.createLogger('EMOTION'),
  cognition: StandardLoggerFactory.createLogger('COGNITION'),
  extension: StandardLoggerFactory.createLogger('EXTENSION'),
  api: StandardLoggerFactory.createLogger('API'),
  cli: StandardLoggerFactory.createLogger('CLI'),
  webui: StandardLoggerFactory.createLogger('WEBUI'),
  factory: StandardLoggerFactory.createLogger('FACTORY'),
  config: StandardLoggerFactory.createLogger('CONFIG'),
  debug: StandardLoggerFactory.createLogger('DEBUG'),
} as const;

/**
 * Create standard logging patterns for a specific logger
 */
export function createStandardLoggingPatterns(
  logger: Logger
): StandardLoggingPatterns {
  return new StandardLoggingPatterns(logger);
}

/**
 * Helper function to replace console.log usage
 */
export function logConsoleReplacement(
  category: keyof typeof LOGGER_CATEGORIES,
  level: 'debug' | 'info' | 'warn' | 'error',
  message: string,
  ...args: any[]
): void {
  const logger = StandardLoggerFactory.createLogger(category);
  const fullMessage =
    args.length > 0 ? `${message} ${args.map(String).join(' ')}` : message;

  switch (level) {
    case 'debug':
      logger.debug(fullMessage);
      break;
    case 'info':
      logger.info(fullMessage);
      break;
    case 'warn':
      logger.warn(fullMessage);
      break;
    case 'error':
      logger.error(fullMessage);
      break;
  }
}

export default StandardLoggerFactory;
