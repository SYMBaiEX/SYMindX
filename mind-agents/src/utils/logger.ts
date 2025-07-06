/**
 * Enhanced Logger utility for SYMindX
 * Provides clean, uniform formatting for all log messages
 */

import { LogLevel } from '../types/agent'

export interface LoggerOptions {
  level?: LogLevel | 'debug' | 'info' | 'warn' | 'error'
  prefix?: string
  colors?: boolean
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
  gray: '\x1b[90m'
}

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
  process: '⚡'
}

export class Logger {
  private level: string
  private prefix: string
  private useColors: boolean

  constructor(prefix: string = '', options: LoggerOptions = {}) {
    this.prefix = prefix
    this.level = options.level || 'info'
    this.useColors = options.colors !== false && process.stdout.isTTY
  }

  child(options: { extension?: string; [key: string]: any }): Logger {
    const childPrefix = options.extension ? `${this.prefix}[${options.extension}]` : this.prefix
    return new Logger(childPrefix, { level: this.level as any, colors: this.useColors })
  }

  private shouldLog(level: string): boolean {
    const levels = ['debug', 'info', 'warn', 'error']
    const currentLevelIndex = levels.indexOf(this.level)
    const messageLevelIndex = levels.indexOf(level)
    return messageLevelIndex >= currentLevelIndex
  }

  private formatTime(): string {
    const now = new Date()
    const time = now.toTimeString().slice(0, 8)
    return this.useColors ? `${colors.gray}${time}${colors.reset}` : time
  }

  private formatLevel(level: string): string {
    const levelUpper = level.toUpperCase().padEnd(5)
    let coloredLevel = levelUpper
    
    if (this.useColors) {
      switch (level) {
        case 'debug': coloredLevel = `${colors.gray}${levelUpper}${colors.reset}`; break
        case 'info': coloredLevel = `${colors.blue}${levelUpper}${colors.reset}`; break
        case 'warn': coloredLevel = `${colors.yellow}${levelUpper}${colors.reset}`; break
        case 'error': coloredLevel = `${colors.red}${levelUpper}${colors.reset}`; break
      }
    }
    
    return coloredLevel
  }

  private formatPrefix(): string {
    if (!this.prefix) return ''
    return this.useColors ? `${colors.cyan}${this.prefix}${colors.reset}` : this.prefix
  }

  private formatMessage(level: string, message: string): string {
    const time = this.formatTime()
    const levelFormatted = this.formatLevel(level)
    const prefix = this.formatPrefix()
    const separator = prefix ? ' │ ' : ''
    
    return `${time} ${levelFormatted} ${prefix}${separator}${message}`
  }

  // Core logging methods
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

  // Specialized logging methods for clean, consistent output
  success(message: string, ...args: any[]): void {
    const icon = icons.success
    const colored = this.useColors ? `${colors.green}${message}${colors.reset}` : message
    this.info(`${icon} ${colored}`, ...args)
  }

  start(message: string, ...args: any[]): void {
    const icon = icons.start
    const colored = this.useColors ? `${colors.bright}${message}${colors.reset}` : message
    this.info(`${icon} ${colored}`, ...args)
  }

  config(message: string, ...args: any[]): void {
    const icon = icons.config
    this.info(`${icon} ${message}`, ...args)
  }

  agent(message: string, ...args: any[]): void {
    const icon = icons.agent
    this.info(`${icon} ${message}`, ...args)
  }

  portal(message: string, ...args: any[]): void {
    const icon = icons.portal
    this.info(`${icon} ${message}`, ...args)
  }

  memory(message: string, ...args: any[]): void {
    const icon = icons.memory
    this.info(`${icon} ${message}`, ...args)
  }

  emotion(message: string, ...args: any[]): void {
    const icon = icons.emotion
    this.info(`${icon} ${message}`, ...args)
  }

  cognition(message: string, ...args: any[]): void {
    const icon = icons.cognition
    this.info(`${icon} ${message}`, ...args)
  }

  extension(message: string, ...args: any[]): void {
    const icon = icons.extension
    this.info(`${icon} ${message}`, ...args)
  }

  factory(message: string, ...args: any[]): void {
    const icon = icons.factory
    this.info(`${icon} ${message}`, ...args)
  }

  process(message: string, ...args: any[]): void {
    const icon = icons.process
    this.info(`${icon} ${message}`, ...args)
  }

  context(message: string, ...args: any[]): void {
    const icon = '🗂️'
    this.info(`${icon} ${message}`, ...args)
  }

  style(message: string, ...args: any[]): void {
    const icon = '🎨'
    this.info(`${icon} ${message}`, ...args)
  }

  // Helper method for clean startup banners
  banner(title: string, subtitle?: string): void {
    const line = '─'.repeat(50)
    console.log(`\n${this.useColors ? colors.cyan : ''}╭${line}╮${this.useColors ? colors.reset : ''}`)
    console.log(`${this.useColors ? colors.cyan : ''}│${this.useColors ? colors.bright : ''} ${title.padEnd(48)} ${this.useColors ? colors.reset + colors.cyan : ''}│${this.useColors ? colors.reset : ''}`)
    if (subtitle) {
      console.log(`${this.useColors ? colors.cyan : ''}│${this.useColors ? colors.dim : ''} ${subtitle.padEnd(48)} ${this.useColors ? colors.reset + colors.cyan : ''}│${this.useColors ? colors.reset : ''}`)
    }
    console.log(`${this.useColors ? colors.cyan : ''}╰${line}╯${this.useColors ? colors.reset : ''}\n`)
  }

  // Helper method for clean section separators
  section(title: string): void {
    const separator = this.useColors ? `${colors.cyan}▶ ${colors.bright}${title}${colors.reset}` : `▶ ${title}`
    console.log(`\n${separator}`)
  }
}

export function createLogger(prefix: string = '', options: LoggerOptions = {}): Logger {
  return new Logger(prefix, options)
}

// Create specialized logger instances
export const logger = new Logger('SYMindX')
export const runtimeLogger = new Logger('Runtime')
export const agentLogger = new Logger('Agent')
export const portalLogger = new Logger('Portal')
export const extensionLogger = new Logger('Extension')

export default Logger