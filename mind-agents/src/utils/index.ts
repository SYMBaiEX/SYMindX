/**
 * @module utils
 * @description Utility functions and classes for SYMindX
 */

// Error handling system
export * from './error-handler.js';
export * from './standard-errors.js';

// Core utilities
export * from './logger.js';
export * from './config-resolver.js';
export * from './config-validator.js';
export * from './type-helpers.js';

// Development utilities
export * from './debug-utilities.js';
export * from './health-monitor.js';
export * from './cli-ui.js';

// Re-export commonly used error functions for convenience
export {
  createRuntimeError,
  createPortalError,
  createExtensionError,
  createConfigurationError,
  createMemoryError,
  createAuthError,
  createNetworkError,
  createValidationError,
  createAgentError,
  createToolError,
  safeAsync,
  safeSync,
  formatError,
  isSYMindXError,
  isErrorOfType,
} from './standard-errors.js';

export {
  errorHandler,
  ErrorCategory,
  ErrorSeverity,
  RecoveryStrategy,
} from './error-handler.js';