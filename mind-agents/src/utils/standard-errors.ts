/**
 * @module standard-errors
 * @description Standard error classes for consistent error handling across SYMindX
 */

import { ErrorCategory, ErrorSeverity, errorHandler } from './error-handler.js';

/**
 * Base error class for all SYMindX errors
 */
export abstract class SYMindXError extends Error {
  public readonly category: ErrorCategory;
  public readonly severity: ErrorSeverity;
  public readonly code: string;
  public readonly timestamp: Date;
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    category: ErrorCategory,
    severity: ErrorSeverity,
    context?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.category = category;
    this.severity = severity;
    this.timestamp = new Date();
    this.context = context;
    
    if (cause) {
      this.cause = cause;
      this.stack = cause.stack;
    }

    // Ensure proper prototype chain
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /**
   * Convert to ErrorInfo format
   */
  toErrorInfo() {
    return errorHandler.createError(
      this.message,
      this.code,
      this.category,
      this.severity,
      this.context,
      this.cause instanceof Error ? this.cause : undefined
    );
  }

  /**
   * Get a JSON representation
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      category: this.category,
      severity: this.severity,
      timestamp: this.timestamp.toISOString(),
      context: this.context,
      stack: this.stack,
    };
  }
}

/**
 * Runtime execution errors
 */
export class RuntimeError extends SYMindXError {
  constructor(
    message: string,
    code: string = 'RUNTIME_ERROR',
    context?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message, code, ErrorCategory.RUNTIME, ErrorSeverity.MEDIUM, context, cause);
  }
}

/**
 * Portal-related errors (AI provider issues)
 */
export class PortalError extends SYMindXError {
  public readonly portalType?: string;
  public readonly model?: string;

  constructor(
    message: string,
    code: string = 'PORTAL_ERROR',
    portalType?: string,
    model?: string,
    context?: Record<string, unknown>,
    cause?: Error
  ) {
    const enrichedContext = {
      ...context,
      portalType,
      model,
    };
    
    super(message, code, ErrorCategory.SYSTEM, ErrorSeverity.HIGH, enrichedContext, cause);
    
    this.portalType = portalType;
    this.model = model;
  }
}

/**
 * Extension-related errors
 */
export class ExtensionError extends SYMindXError {
  public readonly extensionName?: string;
  public readonly action?: string;

  constructor(
    message: string,
    code: string = 'EXTENSION_ERROR',
    extensionName?: string,
    action?: string,
    context?: Record<string, unknown>,
    cause?: Error
  ) {
    const enrichedContext = {
      ...context,
      extensionName,
      action,
    };
    
    super(message, code, ErrorCategory.SYSTEM, ErrorSeverity.MEDIUM, enrichedContext, cause);
    
    this.extensionName = extensionName;
    this.action = action;
  }
}

/**
 * Configuration-related errors
 */
export class ConfigurationError extends SYMindXError {
  public readonly configPath?: string;
  public readonly field?: string;

  constructor(
    message: string,
    code: string = 'CONFIG_ERROR',
    configPath?: string,
    field?: string,
    context?: Record<string, unknown>,
    cause?: Error
  ) {
    const enrichedContext = {
      ...context,
      configPath,
      field,
    };
    
    super(message, code, ErrorCategory.CONFIGURATION, ErrorSeverity.HIGH, enrichedContext, cause);
    
    this.configPath = configPath;
    this.field = field;
  }
}

/**
 * Memory provider errors
 */
export class MemoryError extends SYMindXError {
  public readonly provider?: string;
  public readonly operation?: string;

  constructor(
    message: string,
    code: string = 'MEMORY_ERROR',
    provider?: string,
    operation?: string,
    context?: Record<string, unknown>,
    cause?: Error
  ) {
    const enrichedContext = {
      ...context,
      provider,
      operation,
    };
    
    super(message, code, ErrorCategory.RESOURCE, ErrorSeverity.MEDIUM, enrichedContext, cause);
    
    this.provider = provider;
    this.operation = operation;
  }
}

/**
 * Authentication and authorization errors
 */
export class AuthError extends SYMindXError {
  public readonly operation?: string;
  public readonly resource?: string;

  constructor(
    message: string,
    code: string = 'AUTH_ERROR',
    operation?: string,
    resource?: string,
    context?: Record<string, unknown>,
    cause?: Error
  ) {
    const enrichedContext = {
      ...context,
      operation,
      resource,
    };
    
    super(message, code, ErrorCategory.AUTHENTICATION, ErrorSeverity.HIGH, enrichedContext, cause);
    
    this.operation = operation;
    this.resource = resource;
  }
}

/**
 * Network-related errors
 */
export class NetworkError extends SYMindXError {
  public readonly url?: string;
  public readonly method?: string;
  public readonly statusCode?: number;

  constructor(
    message: string,
    code: string = 'NETWORK_ERROR',
    url?: string,
    method?: string,
    statusCode?: number,
    context?: Record<string, unknown>,
    cause?: Error
  ) {
    const enrichedContext = {
      ...context,
      url,
      method,
      statusCode,
    };
    
    super(message, code, ErrorCategory.NETWORK, ErrorSeverity.HIGH, enrichedContext, cause);
    
    this.url = url;
    this.method = method;
    this.statusCode = statusCode;
  }
}

/**
 * Validation errors
 */
export class ValidationError extends SYMindXError {
  public readonly field?: string;
  public readonly value?: unknown;

  constructor(
    message: string,
    code: string = 'VALIDATION_ERROR',
    field?: string,
    value?: unknown,
    context?: Record<string, unknown>,
    cause?: Error
  ) {
    const enrichedContext = {
      ...context,
      field,
      value,
    };
    
    super(message, code, ErrorCategory.VALIDATION, ErrorSeverity.MEDIUM, enrichedContext, cause);
    
    this.field = field;
    this.value = value;
  }
}

/**
 * Agent-related errors
 */
export class AgentError extends SYMindXError {
  public readonly agentId?: string;
  public readonly operation?: string;

  constructor(
    message: string,
    code: string = 'AGENT_ERROR',
    agentId?: string,
    operation?: string,
    context?: Record<string, unknown>,
    cause?: Error
  ) {
    const enrichedContext = {
      ...context,
      agentId,
      operation,
    };
    
    super(message, code, ErrorCategory.RUNTIME, ErrorSeverity.MEDIUM, enrichedContext, cause);
    
    this.agentId = agentId;
    this.operation = operation;
  }
}

/**
 * Tool system errors
 */
export class ToolError extends SYMindXError {
  public readonly toolName?: string;
  public readonly operation?: string;

  constructor(
    message: string,
    code: string = 'TOOL_ERROR',
    toolName?: string,
    operation?: string,
    context?: Record<string, unknown>,
    cause?: Error
  ) {
    const enrichedContext = {
      ...context,
      toolName,
      operation,
    };
    
    super(message, code, ErrorCategory.SYSTEM, ErrorSeverity.MEDIUM, enrichedContext, cause);
    
    this.toolName = toolName;
    this.operation = operation;
  }
}

/**
 * Error factory functions for convenient error creation
 */
export const createRuntimeError = (
  message: string,
  code?: string,
  context?: Record<string, unknown>,
  cause?: Error
) => new RuntimeError(message, code, context, cause);

export const createPortalError = (
  message: string,
  portalType?: string,
  model?: string,
  code?: string,
  context?: Record<string, unknown>,
  cause?: Error
) => new PortalError(message, code, portalType, model, context, cause);

export const createExtensionError = (
  message: string,
  extensionName?: string,
  action?: string,
  code?: string,
  context?: Record<string, unknown>,
  cause?: Error
) => new ExtensionError(message, code, extensionName, action, context, cause);

export const createConfigurationError = (
  message: string,
  configPath?: string,
  field?: string,
  code?: string,
  context?: Record<string, unknown>,
  cause?: Error
) => new ConfigurationError(message, code, configPath, field, context, cause);

export const createMemoryError = (
  message: string,
  provider?: string,
  operation?: string,
  code?: string,
  context?: Record<string, unknown>,
  cause?: Error
) => new MemoryError(message, code, provider, operation, context, cause);

export const createAuthError = (
  message: string,
  operation?: string,
  resource?: string,
  code?: string,
  context?: Record<string, unknown>,
  cause?: Error
) => new AuthError(message, code, operation, resource, context, cause);

export const createNetworkError = (
  message: string,
  url?: string,
  method?: string,
  statusCode?: number,
  code?: string,
  context?: Record<string, unknown>,
  cause?: Error
) => new NetworkError(message, code, url, method, statusCode, context, cause);

export const createValidationError = (
  message: string,
  field?: string,
  value?: unknown,
  code?: string,
  context?: Record<string, unknown>,
  cause?: Error
) => new ValidationError(message, code, field, value, context, cause);

export const createAgentError = (
  message: string,
  agentId?: string,
  operation?: string,
  code?: string,
  context?: Record<string, unknown>,
  cause?: Error
) => new AgentError(message, code, agentId, operation, context, cause);

export const createToolError = (
  message: string,
  toolName?: string,
  operation?: string,
  code?: string,
  context?: Record<string, unknown>,
  cause?: Error
) => new ToolError(message, code, toolName, operation, context, cause);

/**
 * Error handling utilities
 */

/**
 * Safe async function wrapper with automatic error conversion
 */
export async function safeAsync<T>(
  operation: () => Promise<T>,
  errorFactory: (error: Error) => SYMindXError = (error) => new RuntimeError(error.message, 'SAFE_ASYNC_ERROR', {}, error)
): Promise<{ data?: T; error?: SYMindXError }> {
  try {
    const data = await operation();
    return { data };
  } catch (error) {
    const symindxError = error instanceof SYMindXError 
      ? error 
      : errorFactory(error instanceof Error ? error : new Error(String(error)));
    return { error: symindxError };
  }
}

/**
 * Safe sync function wrapper with automatic error conversion
 */
export function safeSync<T>(
  operation: () => T,
  errorFactory: (error: Error) => SYMindXError = (error) => new RuntimeError(error.message, 'SAFE_SYNC_ERROR', {}, error)
): { data?: T; error?: SYMindXError } {
  try {
    const data = operation();
    return { data };
  } catch (error) {
    const symindxError = error instanceof SYMindXError 
      ? error 
      : errorFactory(error instanceof Error ? error : new Error(String(error)));
    return { error: symindxError };
  }
}

/**
 * Type guard to check if an error is a SYMindX error
 */
export function isSYMindXError(error: unknown): error is SYMindXError {
  return error instanceof SYMindXError;
}

/**
 * Type guard to check if an error is of a specific type
 */
export function isErrorOfType<T extends SYMindXError>(
  error: unknown,
  errorClass: new (...args: any[]) => T
): error is T {
  return error instanceof errorClass;
}

/**
 * Format error for logging or display
 */
export function formatError(error: unknown): string {
  if (isSYMindXError(error)) {
    return `[${error.code}] ${error.message} (${error.category}:${error.severity})`;
  }
  
  if (error instanceof Error) {
    return `[ERROR] ${error.message}`;
  }
  
  return `[UNKNOWN] ${String(error)}`;
}

/**
 * Extract error details for debugging
 */
export function extractErrorDetails(error: unknown): Record<string, unknown> {
  if (isSYMindXError(error)) {
    return {
      name: error.name,
      message: error.message,
      code: error.code,
      category: error.category,
      severity: error.severity,
      timestamp: error.timestamp,
      context: error.context,
      stack: error.stack,
    };
  }
  
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  
  return {
    value: error,
    type: typeof error,
  };
}