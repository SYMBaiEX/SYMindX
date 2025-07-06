/**
 * Extension API Error Handler
 * 
 * Provides centralized error handling, validation, and response formatting
 * for all API extensions in the SYMindX system.
 */

import { Request, Response, NextFunction } from 'express'
import { ValidationResult, ValidationError } from '../../types/common'
import { runtimeLogger } from '../../utils/logger'

export interface ApiError {
  code: string
  message: string
  details?: any
  statusCode: number
  timestamp: Date
  requestId?: string
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: ApiError
  message?: string
  timestamp: Date
  requestId?: string
}

export interface ExtensionErrorContext {
  extensionId: string
  agentId?: string
  operation: string
  metadata?: Record<string, any>
}

export class ExtensionApiError extends Error {
  public readonly code: string
  public readonly statusCode: number
  public readonly details?: any
  public readonly context?: ExtensionErrorContext

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    details?: any,
    context?: ExtensionErrorContext
  ) {
    super(message)
    this.name = 'ExtensionApiError'
    this.code = code
    this.statusCode = statusCode
    this.details = details
    this.context = context
  }
}

export class ExtensionValidator {
  /**
   * Validate required fields in request body
   */
  static validateRequired(body: any, fields: string[]): ValidationResult {
    const errors: ValidationError[] = []
    
    for (const field of fields) {
      if (!body[field]) {
        errors.push({
          field,
          message: `${field} is required`,
          code: 'REQUIRED_FIELD_MISSING',
          value: body[field]
        })
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Validate agent ID format
   */
  static validateAgentId(agentId: string): ValidationResult {
    const errors: ValidationError[] = []
    
    if (!agentId || typeof agentId !== 'string') {
      errors.push({
        field: 'agentId',
        message: 'Agent ID must be a non-empty string',
        code: 'INVALID_AGENT_ID',
        value: agentId
      })
    } else if (agentId.length < 2 || agentId.length > 64) {
      errors.push({
        field: 'agentId',
        message: 'Agent ID must be between 2 and 64 characters',
        code: 'INVALID_AGENT_ID_LENGTH',
        value: agentId
      })
    }
    
    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Validate pagination parameters
   */
  static validatePagination(query: any): ValidationResult {
    const errors: ValidationError[] = []
    
    if (query.limit !== undefined) {
      const limit = parseInt(query.limit)
      if (isNaN(limit) || limit < 1 || limit > 1000) {
        errors.push({
          field: 'limit',
          message: 'Limit must be a number between 1 and 1000',
          code: 'INVALID_LIMIT',
          value: query.limit
        })
      }
    }
    
    if (query.offset !== undefined) {
      const offset = parseInt(query.offset)
      if (isNaN(offset) || offset < 0) {
        errors.push({
          field: 'offset',
          message: 'Offset must be a non-negative number',
          code: 'INVALID_OFFSET',
          value: query.offset
        })
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Validate message content
   */
  static validateMessage(message: string): ValidationResult {
    const errors: ValidationError[] = []
    
    if (!message || typeof message !== 'string') {
      errors.push({
        field: 'message',
        message: 'Message must be a non-empty string',
        code: 'INVALID_MESSAGE',
        value: message
      })
    } else if (message.length > 10000) {
      errors.push({
        field: 'message',
        message: 'Message must be less than 10,000 characters',
        code: 'MESSAGE_TOO_LONG',
        value: message
      })
    }
    
    return {
      valid: errors.length === 0,
      errors
    }
  }
}

export class ExtensionErrorHandler {
  private static readonly ERROR_CODES = {
    // Validation errors (400)
    VALIDATION_ERROR: { code: 'VALIDATION_ERROR', statusCode: 400 },
    REQUIRED_FIELD_MISSING: { code: 'REQUIRED_FIELD_MISSING', statusCode: 400 },
    INVALID_INPUT: { code: 'INVALID_INPUT', statusCode: 400 },
    INVALID_AGENT_ID: { code: 'INVALID_AGENT_ID', statusCode: 400 },
    INVALID_REQUEST_FORMAT: { code: 'INVALID_REQUEST_FORMAT', statusCode: 400 },
    
    // Authentication errors (401)
    UNAUTHORIZED: { code: 'UNAUTHORIZED', statusCode: 401 },
    INVALID_TOKEN: { code: 'INVALID_TOKEN', statusCode: 401 },
    TOKEN_EXPIRED: { code: 'TOKEN_EXPIRED', statusCode: 401 },
    
    // Permission errors (403)
    FORBIDDEN: { code: 'FORBIDDEN', statusCode: 403 },
    INSUFFICIENT_PERMISSIONS: { code: 'INSUFFICIENT_PERMISSIONS', statusCode: 403 },
    AGENT_ACCESS_DENIED: { code: 'AGENT_ACCESS_DENIED', statusCode: 403 },
    
    // Not found errors (404)
    AGENT_NOT_FOUND: { code: 'AGENT_NOT_FOUND', statusCode: 404 },
    RESOURCE_NOT_FOUND: { code: 'RESOURCE_NOT_FOUND', statusCode: 404 },
    EXTENSION_NOT_FOUND: { code: 'EXTENSION_NOT_FOUND', statusCode: 404 },
    
    // Conflict errors (409)
    AGENT_ALREADY_EXISTS: { code: 'AGENT_ALREADY_EXISTS', statusCode: 409 },
    RESOURCE_CONFLICT: { code: 'RESOURCE_CONFLICT', statusCode: 409 },
    
    // Rate limiting (429)
    RATE_LIMITED: { code: 'RATE_LIMITED', statusCode: 429 },
    TOO_MANY_REQUESTS: { code: 'TOO_MANY_REQUESTS', statusCode: 429 },
    
    // Server errors (500)
    INTERNAL_ERROR: { code: 'INTERNAL_ERROR', statusCode: 500 },
    AGENT_UNAVAILABLE: { code: 'AGENT_UNAVAILABLE', statusCode: 500 },
    EXTENSION_ERROR: { code: 'EXTENSION_ERROR', statusCode: 500 },
    MEMORY_ERROR: { code: 'MEMORY_ERROR', statusCode: 500 },
    PORTAL_ERROR: { code: 'PORTAL_ERROR', statusCode: 500 },
    
    // Service unavailable (503)
    SERVICE_UNAVAILABLE: { code: 'SERVICE_UNAVAILABLE', statusCode: 503 },
    MAINTENANCE_MODE: { code: 'MAINTENANCE_MODE', statusCode: 503 }
  }

  /**
   * Create standardized error response
   */
  static createErrorResponse(
    error: string | Error | ExtensionApiError,
    context?: ExtensionErrorContext,
    requestId?: string
  ): ApiResponse {
    let apiError: ApiError

    if (error instanceof ExtensionApiError) {
      apiError = {
        code: error.code,
        message: error.message,
        details: error.details,
        statusCode: error.statusCode,
        timestamp: new Date(),
        requestId
      }
    } else if (error instanceof Error) {
      apiError = {
        code: 'INTERNAL_ERROR',
        message: error.message,
        statusCode: 500,
        timestamp: new Date(),
        requestId
      }
    } else {
      apiError = {
        code: 'INTERNAL_ERROR',
        message: String(error),
        statusCode: 500,
        timestamp: new Date(),
        requestId
      }
    }

    // Log error with context
    if (context) {
      runtimeLogger.error(`Extension API Error [${context.extensionId}:${context.operation}]`, {
        error: apiError,
        context,
        requestId
      })
    }

    return {
      success: false,
      error: apiError,
      timestamp: new Date(),
      requestId
    }
  }

  /**
   * Create success response
   */
  static createSuccessResponse<T>(
    data: T,
    message?: string,
    requestId?: string
  ): ApiResponse<T> {
    return {
      success: true,
      data,
      message,
      timestamp: new Date(),
      requestId
    }
  }

  /**
   * Express error handling middleware
   */
  static middleware(
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
  ): void {
    const requestId = req.headers['x-request-id'] as string || 
                     Math.random().toString(36).substring(2, 15)

    const response = ExtensionErrorHandler.createErrorResponse(err, undefined, requestId)
    
    // Set response headers
    res.set('X-Request-Id', requestId)
    res.set('Content-Type', 'application/json')
    
    // Send error response
    res.status(response.error!.statusCode).json(response)
  }

  /**
   * Validation middleware factory
   */
  static validateRequest(validator: (req: Request) => ValidationResult) {
    return (req: Request, res: Response, next: NextFunction): void => {
      const validation = validator(req)
      
      if (!validation.valid) {
        const error = new ExtensionApiError(
          'Validation failed',
          'VALIDATION_ERROR',
          400,
          validation.errors
        )
        
        const response = ExtensionErrorHandler.createErrorResponse(
          error,
          undefined,
          req.headers['x-request-id'] as string
        )
        
        res.status(400).json(response)
        return
      }
      
      next()
    }
  }

  /**
   * Agent existence middleware
   */
  static validateAgentExists(getAgent: (agentId: string) => any) {
    return (req: Request, res: Response, next: NextFunction): void => {
      const agentId = req.params.agentId
      
      if (!agentId) {
        const error = new ExtensionApiError(
          'Agent ID is required',
          'INVALID_AGENT_ID',
          400
        )
        
        const response = ExtensionErrorHandler.createErrorResponse(error)
        res.status(400).json(response)
        return
      }
      
      const agent = getAgent(agentId)
      if (!agent) {
        const error = new ExtensionApiError(
          `Agent ${agentId} not found`,
          'AGENT_NOT_FOUND',
          404
        )
        
        const response = ExtensionErrorHandler.createErrorResponse(error)
        res.status(404).json(response)
        return
      }
      
      // Attach agent to request for use in handlers
      (req as any).agent = agent
      next()
    }
  }

  /**
   * Async handler wrapper to catch errors
   */
  static asyncHandler(
    fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
  ) {
    return (req: Request, res: Response, next: NextFunction): void => {
      Promise.resolve(fn(req, res, next)).catch(next)
    }
  }

  /**
   * Get error information by code
   */
  static getErrorInfo(code: string): { code: string; statusCode: number } {
    return this.ERROR_CODES[code as keyof typeof this.ERROR_CODES] || 
           this.ERROR_CODES.INTERNAL_ERROR
  }
}

export default ExtensionErrorHandler