/**
 * Logger type definitions for SYMindX
 * Provides structured logging with proper type safety
 */

/**
 * Log levels with numeric values for comparison
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

/**
 * Structured log context with metadata
 */
export interface LogContext {
  /** Unique identifier for tracking related logs */
  correlationId?: string;
  /** Source component or module */
  source?: string;
  /** User or agent identifier */
  userId?: string;
  /** Agent identifier if applicable */
  agentId?: string;
  /** Additional metadata for the log entry */
  metadata?: LogMetadata;
  /** Performance timing information */
  timing?: {
    start: number;
    end?: number;
    duration?: number;
  };
  /** Error details if applicable */
  error?: {
    code: string;
    message: string;
    stack?: string;
    cause?: unknown;
  };
}

/**
 * Metadata structure for log entries
 */
export interface LogMetadata {
  /** Module or component name */
  module?: string;
  /** Operation or action being performed */
  operation?: string;
  /** Request or transaction ID */
  requestId?: string;
  /** Session identifier */
  sessionId?: string;
  /** Environment (development, staging, production) */
  environment?: string;
  /** Version information */
  version?: string;
  /** Custom tags for filtering */
  tags?: string[];
  /** Additional properties */
  [key: string]: string | number | boolean | string[] | undefined;
}

/**
 * Log formatter function signature
 */
export type LogFormatter = (entry: LogEntry) => string;

/**
 * Log transport interface for output destinations
 */
export interface LogTransport {
  /** Transport name for identification */
  name: string;
  /** Transport level filter */
  level?: LogLevel;
  /** Write log entry to destination */
  write(entry: LogEntry): void | Promise<void>;
  /** Flush any buffered logs */
  flush?(): void | Promise<void>;
  /** Close transport and cleanup resources */
  close?(): void | Promise<void>;
  /** Custom formatter for this transport */
  formatter?: LogFormatter;
}

/**
 * Structured log entry
 */
export interface LogEntry {
  /** Log severity level */
  level: LogLevel;
  /** Log message */
  message: string;
  /** Timestamp when log was created */
  timestamp: Date;
  /** Structured context information */
  context?: LogContext;
  /** Additional arguments passed to log method */
  args?: unknown[];
  /** Stack trace for errors */
  stack?: string;
  /** Log category or namespace */
  category?: string;
}

/**
 * Logger configuration options
 */
export interface LoggerConfig {
  /** Minimum log level to output */
  level?: LogLevel;
  /** Logger prefix or namespace */
  prefix?: string;
  /** Enable colored output */
  colors?: boolean;
  /** Transport destinations */
  transports?: LogTransport[];
  /** Default context to include in all logs */
  defaultContext?: LogContext;
  /** Custom formatter function */
  formatter?: LogFormatter;
  /** Enable timestamps */
  timestamps?: boolean;
  /** Maximum message length before truncation */
  maxMessageLength?: number;
}

/**
 * Logger interface with typed methods
 */
export interface ILogger {
  /** Log debug level message */
  debug(message: string, context?: LogContext): void;
  /** Log info level message */
  info(message: string, context?: LogContext): void;
  /** Log warning level message */
  warn(message: string, context?: LogContext): void;
  /** Log error level message */
  error(message: string, error?: Error | unknown, context?: LogContext): void;
  /** Log fatal level message */
  fatal(message: string, error?: Error | unknown, context?: LogContext): void;
  /** Create child logger with additional context */
  child(context: LogContext): ILogger;
  /** Set log level */
  setLevel(level: LogLevel): void;
  /** Add transport */
  addTransport(transport: LogTransport): void;
  /** Remove transport */
  removeTransport(name: string): void;
  /** Flush all transports */
  flush(): Promise<void>;
}

/**
 * Console transport configuration
 */
export interface ConsoleTransportConfig {
  level?: LogLevel;
  colors?: boolean;
  timestamps?: boolean;
  formatter?: LogFormatter;
}

/**
 * File transport configuration
 */
export interface FileTransportConfig {
  level?: LogLevel;
  filename: string;
  maxSize?: number;
  maxFiles?: number;
  formatter?: LogFormatter;
  compress?: boolean;
}

/**
 * Structured log query for filtering
 */
export interface LogQuery {
  /** Filter by log level */
  level?: LogLevel | LogLevel[];
  /** Filter by time range */
  timeRange?: {
    start: Date;
    end: Date;
  };
  /** Filter by correlation ID */
  correlationId?: string;
  /** Filter by source */
  source?: string | string[];
  /** Filter by tags */
  tags?: string[];
  /** Filter by message pattern */
  messagePattern?: string | RegExp;
  /** Maximum results to return */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

/**
 * Log aggregation result
 */
export interface LogAggregation {
  /** Total log count */
  total: number;
  /** Count by level */
  byLevel: Record<LogLevel, number>;
  /** Count by source */
  bySource: Record<string, number>;
  /** Time-based distribution */
  timeline?: Array<{
    timestamp: Date;
    count: number;
  }>;
}
