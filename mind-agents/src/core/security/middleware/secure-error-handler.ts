/**
 * Secure Error Handler Middleware
 * Prevents sensitive information leakage in error responses
 */

import { Request, Response, NextFunction } from 'express';

export interface SecureErrorConfig {
  hideStackTraces: boolean;
  hideInternalPaths: boolean;
  logErrors: boolean;
  allowedErrorCodes: string[];
  sanitizeErrorMessages: boolean;
}

export interface SecureError extends Error {
  statusCode?: number;
  code?: string;
  expose?: boolean;
  details?: any;
}

export class SecureErrorHandler {
  private readonly config: SecureErrorConfig;
  private readonly sensitivePatterns: RegExp[] = [
    /\/home\/[\w-]+/g, // Home directories
    /\/var\/[\w-]+/g,  // System paths
    /process\.env/g,   // Environment references
    /password|secret|key|token/gi, // Sensitive keywords
    /SQL|database|connection/gi,   // Database information
    /stack trace|at [\w\.]+/gi,    // Stack trace patterns
  ];

  constructor(config: Partial<SecureErrorConfig> = {}) {
    this.config = {
      hideStackTraces: config.hideStackTraces !== false,
      hideInternalPaths: config.hideInternalPaths !== false,
      logErrors: config.logErrors !== false,
      allowedErrorCodes: config.allowedErrorCodes || [
        'VALIDATION_ERROR',
        'AUTH_REQUIRED',
        'INSUFFICIENT_SCOPES',
        'RATE_LIMIT_EXCEEDED',
        'NOT_FOUND',
        'METHOD_NOT_ALLOWED'
      ],
      sanitizeErrorMessages: config.sanitizeErrorMessages !== false
    };
  }

  /**
   * Express error handler middleware
   */
  handleError() {
    return (error: SecureError, req: Request, res: Response, next: NextFunction) => {
      // Log error internally if configured
      if (this.config.logErrors) {
        console.error('API Error:', {
          message: error.message,
          stack: error.stack,
          path: req.path,
          method: req.method,
          ip: req.ip,
          userAgent: req.get('user-agent'),
          timestamp: new Date().toISOString()
        });
      }

      // If response already sent, delegate to default Express error handler
      if (res.headersSent) {
        return next(error);
      }

      // Determine status code
      const statusCode = this.getStatusCode(error);
      
      // Create secure error response
      const errorResponse = this.createSecureErrorResponse(error, req);

      // Send response
      res.status(statusCode).json(errorResponse);
    };
  }

  /**
   * Create secure error response
   */
  private createSecureErrorResponse(error: SecureError, req: Request): any {
    const isProduction = process.env.NODE_ENV === 'production';
    const isDevelopment = process.env.NODE_ENV === 'development';

    // Base error response
    const response: any = {
      success: false,
      error: {
        message: this.sanitizeErrorMessage(error.message),
        code: this.getErrorCode(error),
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method
      }
    };

    // Add details only if error is marked as safe to expose
    if (error.expose && error.details) {
      response.error.details = this.sanitizeErrorDetails(error.details);
    }

    // Add debug information in development
    if (isDevelopment && !this.config.hideStackTraces) {
      response.error.stack = this.sanitizeStackTrace(error.stack);
      response.error.originalMessage = error.message;
    }

    // Add request ID if available
    const requestId = (req as any).requestId;
    if (requestId) {
      response.error.requestId = requestId;
    }

    return response;
  }

  /**
   * Get HTTP status code from error
   */
  private getStatusCode(error: SecureError): number {
    if (error.statusCode && error.statusCode >= 400 && error.statusCode < 600) {
      return error.statusCode;
    }

    // Map common error types to status codes
    if (error.name === 'ValidationError') return 400;
    if (error.name === 'UnauthorizedError') return 401;
    if (error.name === 'ForbiddenError') return 403;
    if (error.name === 'NotFoundError') return 404;
    if (error.name === 'ConflictError') return 409;
    if (error.name === 'TooManyRequestsError') return 429;

    // Default to 500 for unknown errors
    return 500;
  }

  /**
   * Get sanitized error code
   */
  private getErrorCode(error: SecureError): string {
    if (error.code && this.config.allowedErrorCodes.includes(error.code)) {
      return error.code;
    }

    // Map status codes to generic codes
    const statusCode = this.getStatusCode(error);
    switch (statusCode) {
      case 400: return 'BAD_REQUEST';
      case 401: return 'UNAUTHORIZED';
      case 403: return 'FORBIDDEN';
      case 404: return 'NOT_FOUND';
      case 409: return 'CONFLICT';
      case 429: return 'RATE_LIMITED';
      case 500: return 'INTERNAL_ERROR';
      default: return 'UNKNOWN_ERROR';
    }
  }

  /**
   * Sanitize error message
   */
  private sanitizeErrorMessage(message: string): string {
    if (!this.config.sanitizeErrorMessages) {
      return message;
    }

    let sanitized = message;

    // Remove sensitive patterns
    for (const pattern of this.sensitivePatterns) {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    }

    // Limit message length
    if (sanitized.length > 200) {
      sanitized = sanitized.substring(0, 200) + '...';
    }

    return sanitized;
  }

  /**
   * Sanitize stack trace
   */
  private sanitizeStackTrace(stack?: string): string | undefined {
    if (!stack || this.config.hideStackTraces) {
      return undefined;
    }

    let sanitized = stack;

    // Remove sensitive patterns
    for (const pattern of this.sensitivePatterns) {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    }

    // Hide internal paths if configured
    if (this.config.hideInternalPaths) {
      sanitized = sanitized.replace(/at\s+.*node_modules.*/g, 'at [NODE_MODULES]');
      sanitized = sanitized.replace(/at\s+.*\/usr\/.*\/node.*/g, 'at [NODE_RUNTIME]');
    }

    return sanitized;
  }

  /**
   * Sanitize error details
   */
  private sanitizeErrorDetails(details: any): any {
    if (typeof details === 'string') {
      return this.sanitizeErrorMessage(details);
    }

    if (Array.isArray(details)) {
      return details.map(item => this.sanitizeErrorDetails(item));
    }

    if (typeof details === 'object' && details !== null) {
      const sanitized: any = {};
      
      for (const [key, value] of Object.entries(details)) {
        // Skip sensitive keys
        if (/password|secret|key|token|credential/i.test(key)) {
          sanitized[key] = '[REDACTED]';
          continue;
        }

        sanitized[key] = this.sanitizeErrorDetails(value);
      }

      return sanitized;
    }

    return details;
  }

  /**
   * Create a secure error for throwing
   */
  static createError(
    message: string,
    statusCode: number = 500,
    code?: string,
    details?: any,
    expose: boolean = false
  ): SecureError {
    const error = new Error(message) as SecureError;
    error.statusCode = statusCode;
    error.code = code;
    error.details = details;
    error.expose = expose;
    return error;
  }

  /**
   * Middleware to catch 404 errors
   */
  static notFoundHandler() {
    return (req: Request, res: Response, next: NextFunction) => {
      const error = SecureErrorHandler.createError(
        `Route ${req.method} ${req.path} not found`,
        404,
        'NOT_FOUND',
        { path: req.path, method: req.method },
        true
      );
      next(error);
    };
  }

  /**
   * Middleware to add request ID for tracking
   */
  static requestIdMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      (req as any).requestId = requestId;
      res.set('X-Request-ID', requestId);
      next();
    };
  }
}