/**
 * Enhanced Logger utility for SYMindX
 * Provides clean, uniform formatting for all log messages
 */

import {
  LogLevel,
  LogContext,
  LogEntry,
  LogTransport,
  LogFormatter,
  ILogger,
} from '../types/utils/logger.js';

export interface LoggerOptions {
  level?: LogLevel;
  prefix?: string;
  colors?: boolean;
  transports?: LogTransport[];
  defaultContext?: LogContext | undefined;
  formatter?: LogFormatter | undefined;
}

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
};

// Log level icons for clean visual separation
const icons = {
  debug: '🔍',
  info: 'ℹ️ ',
  warn: '⚠️ ',
  error: '❌',
  success: '✅',
  start: '🚀',
  config: '⚙️ ',
  agent: '🤖',
  portal: '🔮',
  memory: '💾',
  emotion: '💭',
  cognition: '🧠',
  extension: '🔌',
  factory: '🏭',
  process: '⚡',
};

export class Logger implements ILogger {
  private level: LogLevel;
  private prefix: string;
  private useColors: boolean;
  private transports: LogTransport[];
  private defaultContext?: LogContext;
  private formatter?: LogFormatter;

  constructor(prefix: string = '', options: LoggerOptions = {}) {
    this.prefix = prefix;
    this.level = options.level || LogLevel.INFO;
    this.useColors = options.colors !== false && process.stdout.isTTY;
    this.transports = options.transports || [];
    if (options.defaultContext !== undefined) {
      this.defaultContext = options.defaultContext;
    }
    if (options.formatter !== undefined) {
      this.formatter = options.formatter;
    }
  }

  child(context: LogContext): ILogger {
    const childPrefix = context.source
      ? `${this.prefix}[${context.source}]`
      : this.prefix;
    const options: LoggerOptions = {
      level: this.level,
      colors: this.useColors,
      transports: this.transports,
      defaultContext: {
        ...(this.defaultContext || {}),
        ...(context || {}),
      } as LogContext,
    };
    if (this.formatter) {
      options.formatter = this.formatter;
    }
    return new Logger(childPrefix, options);
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.level;
  }

  private formatTime(): string {
    const now = new Date();
    const time = now.toTimeString().slice(0, 8);
    return this.useColors ? `${colors.gray}${time}${colors.reset}` : time;
  }

  private formatLevel(level: LogLevel): string {
    const levelName = LogLevel[level];
    const levelUpper = levelName.padEnd(5);
    let coloredLevel = levelUpper;

    if (this.useColors) {
      switch (level) {
        case LogLevel.DEBUG:
          coloredLevel = `${colors.gray}${levelUpper}${colors.reset}`;
          break;
        case LogLevel.INFO:
          coloredLevel = `${colors.blue}${levelUpper}${colors.reset}`;
          break;
        case LogLevel.WARN:
          coloredLevel = `${colors.yellow}${levelUpper}${colors.reset}`;
          break;
        case LogLevel.ERROR:
          coloredLevel = `${colors.red}${levelUpper}${colors.reset}`;
          break;
        case LogLevel.FATAL:
          coloredLevel = `${colors.red}${colors.bright}${levelUpper}${colors.reset}`;
          break;
      }
    }

    return coloredLevel;
  }

  private formatPrefix(): string {
    if (!this.prefix) return '';
    return this.useColors
      ? `${colors.cyan}${this.prefix}${colors.reset}`
      : this.prefix;
  }

  private formatMessage(level: LogLevel, message: string): string {
    const time = this.formatTime();
    const levelFormatted = this.formatLevel(level);
    const prefix = this.formatPrefix();
    const separator = prefix ? ' │ ' : '';

    return `${time} ${levelFormatted} ${prefix}${separator}${message}`;
  }

  // Core logging methods
  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorContext: LogContext = {
      ...context,
      error:
        error instanceof Error
          ? {
              code: 'ERROR',
              message: error.message,
              ...(error.stack ? { stack: error.stack } : {}),
              ...(error.cause ? { cause: error.cause } : {}),
            }
          : {
              code: 'UNKNOWN_ERROR',
              message: String(error),
            },
    };
    this.log(LogLevel.ERROR, message, errorContext);
  }

  fatal(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorContext: LogContext = {
      ...context,
      error:
        error instanceof Error
          ? {
              code: 'FATAL',
              message: error.message,
              ...(error.stack ? { stack: error.stack } : {}),
              ...(error.cause ? { cause: error.cause } : {}),
            }
          : {
              code: 'UNKNOWN_FATAL',
              message: String(error),
            },
    };
    this.log(LogLevel.FATAL, message, errorContext);
  }

  private log(level: LogLevel, message: string, context?: LogContext): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      context: {
        ...(this.defaultContext || {}),
        ...(context || {}),
      },
      category: this.prefix,
    };

    // Format message for console
    const formattedMessage = this.formatMessage(level, message);

    // Console output
    switch (level) {
      case LogLevel.DEBUG:
        // eslint-disable-next-line no-console
        console.debug(formattedMessage);
        break;
      case LogLevel.INFO:
        // eslint-disable-next-line no-console
        console.info(formattedMessage);
        break;
      case LogLevel.WARN:
        // eslint-disable-next-line no-console
        console.warn(formattedMessage);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        // eslint-disable-next-line no-console
        console.error(formattedMessage);
        break;
    }

    // Send to transports
    for (const transport of this.transports) {
      if (!transport.level || level >= transport.level) {
        transport.write(entry);
      }
    }
  }

  // ILogger interface methods
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  addTransport(transport: LogTransport): void {
    this.transports.push(transport);
  }

  removeTransport(name: string): void {
    this.transports = this.transports.filter((t) => t.name !== name);
  }

  async flush(): Promise<void> {
    await Promise.all(
      this.transports.filter((t) => t.flush).map((t) => t.flush!())
    );
  }

  // Specialized logging methods for clean, consistent output
  success(message: string, context?: LogContext): void {
    const icon = icons.success;
    const colored = this.useColors
      ? `${colors.green}${message}${colors.reset}`
      : message;
    this.info(`${icon} ${colored}`, context);
  }

  start(message: string, context?: LogContext): void {
    const icon = icons.start;
    const colored = this.useColors
      ? `${colors.bright}${message}${colors.reset}`
      : message;
    this.info(`${icon} ${colored}`, context);
  }

  config(message: string, context?: LogContext): void {
    const icon = icons.config;
    this.info(`${icon} ${message}`, context);
  }

  agent(message: string, context?: LogContext): void {
    const icon = icons.agent;
    this.info(`${icon} ${message}`, context);
  }

  portal(message: string, context?: LogContext): void {
    const icon = icons.portal;
    this.info(`${icon} ${message}`, context);
  }

  memory(message: string, context?: LogContext): void {
    const icon = icons.memory;
    this.info(`${icon} ${message}`, context);
  }

  emotion(message: string, context?: LogContext): void {
    const icon = icons.emotion;
    this.info(`${icon} ${message}`, context);
  }

  cognition(message: string, context?: LogContext): void {
    const icon = icons.cognition;
    this.info(`${icon} ${message}`, context);
  }

  extension(message: string, context?: LogContext): void {
    const icon = icons.extension;
    this.info(`${icon} ${message}`, context);
  }

  factory(message: string, context?: LogContext): void {
    const icon = icons.factory;
    this.info(`${icon} ${message}`, context);
  }

  process(message: string, context?: LogContext): void {
    const icon = icons.process;
    this.info(`${icon} ${message}`, context);
  }

  context(message: string, logContext?: LogContext): void {
    const icon = '🗂️';
    this.info(`${icon} ${message}`, logContext);
  }

  style(message: string, context?: LogContext): void {
    const icon = '🎨';
    this.info(`${icon} ${message}`, context);
  }

  // Helper method for clean startup banners
  banner(title: string, subtitle?: string): void {
    const line = '─'.repeat(50);
    // eslint-disable-next-line no-console
    console.log(
      `\n${this.useColors ? colors.cyan : ''}╭${line}╮${this.useColors ? colors.reset : ''}`
    );
    // eslint-disable-next-line no-console
    console.log(
      `${this.useColors ? colors.cyan : ''}│${this.useColors ? colors.bright : ''} ${title.padEnd(48)} ${this.useColors ? colors.reset + colors.cyan : ''}│${this.useColors ? colors.reset : ''}`
    );
    if (subtitle) {
      // eslint-disable-next-line no-console
      console.log(
        `${this.useColors ? colors.cyan : ''}│${this.useColors ? colors.dim : ''} ${subtitle.padEnd(48)} ${this.useColors ? colors.reset + colors.cyan : ''}│${this.useColors ? colors.reset : ''}`
      );
    }
    // eslint-disable-next-line no-console
    console.log(
      `${this.useColors ? colors.cyan : ''}╰${line}╯${this.useColors ? colors.reset : ''}\n`
    );
  }

  // Helper method for clean section separators
  section(title: string): void {
    const separator = this.useColors
      ? `${colors.cyan}▶ ${colors.bright}${title}${colors.reset}`
      : `▶ ${title}`;
    // eslint-disable-next-line no-console
    console.log(`\n${separator}`);
  }
}

export function createLogger(
  prefix: string = '',
  options: LoggerOptions = {}
): Logger {
  return new Logger(prefix, options);
}

// Create specialized logger instances
export const logger = new Logger('SYMindX');
export const runtimeLogger = new Logger('Runtime');
export const agentLogger = new Logger('Agent');
export const portalLogger = new Logger('Portal');
export const extensionLogger = new Logger('Extension');

export default Logger;
