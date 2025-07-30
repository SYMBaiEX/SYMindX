/**
 * Console Replacement Utilities
 * Provides standardized logging replacements for console.log/error/warn/debug
 */

import {
  logConsoleReplacement,
  LOGGER_CATEGORIES,
} from './standard-logging.js';

/**
 * Replace console.log with proper logging
 * @deprecated Use proper logger instances instead
 */
export function replacementLog(message: string, ...args: any[]): void {
  logConsoleReplacement('DEBUG', 'info', message, ...args);
}

/**
 * Replace console.info with proper logging
 * @deprecated Use proper logger instances instead
 */
export function replacementInfo(message: string, ...args: any[]): void {
  logConsoleReplacement('DEBUG', 'info', message, ...args);
}

/**
 * Replace console.warn with proper logging
 * @deprecated Use proper logger instances instead
 */
export function replacementWarn(message: string, ...args: any[]): void {
  logConsoleReplacement('DEBUG', 'warn', message, ...args);
}

/**
 * Replace console.error with proper logging
 * @deprecated Use proper logger instances instead
 */
export function replacementError(message: string, ...args: any[]): void {
  logConsoleReplacement('DEBUG', 'error', message, ...args);
}

/**
 * Replace console.debug with proper logging
 * @deprecated Use proper logger instances instead
 */
export function replacementDebug(message: string, ...args: any[]): void {
  logConsoleReplacement('DEBUG', 'debug', message, ...args);
}

// Expose replacement functions for global override if needed
export const consoleReplacements = {
  log: replacementLog,
  info: replacementInfo,
  warn: replacementWarn,
  error: replacementError,
  debug: replacementDebug,
} as const;
