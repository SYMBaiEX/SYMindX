/**
 * Logger utility for SYMindX
 */

export interface LoggerOptions {
  level?: 'debug' | 'info' | 'warn' | 'error'
  prefix?: string
}

export class Logger {
  private level: string
  private prefix: string

  constructor(prefix: string = '', options: LoggerOptions = {}) {
    this.prefix = prefix
    this.level = options.level || 'info'
  }

  child(options: { extension?: string; [key: string]: any }): Logger {
    const childPrefix = options.extension ? `${this.prefix}[${options.extension}]` : this.prefix
    return new Logger(childPrefix, { level: this.level as any })
  }

  private shouldLog(level: string): boolean {
    const levels = ['debug', 'info', 'warn', 'error']
    const currentLevelIndex = levels.indexOf(this.level)
    const messageLevelIndex = levels.indexOf(level)
    return messageLevelIndex >= currentLevelIndex
  }

  private formatMessage(level: string, message: string, ...args: any[]): string {
    const timestamp = new Date().toISOString()
    const prefix = this.prefix ? `${this.prefix} ` : ''
    return `[${timestamp}] ${level.toUpperCase()} ${prefix}${message}`
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message), ...args)
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message), ...args)
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message), ...args)
    }
  }

  error(message: string, ...args: any[]): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message), ...args)
    }
  }
}

export function createLogger(options: LoggerOptions = {}): Logger {
  return new Logger('', options)
}

export default Logger