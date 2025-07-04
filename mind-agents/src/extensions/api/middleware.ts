/**
 * Extension API Middleware
 * 
 * Common middleware patterns for all SYMindX extension APIs
 */

import { Request, Response, NextFunction } from 'express'
import { Agent } from '../../types/agent.js'
import { ExtensionApiError, ExtensionErrorHandler, ExtensionValidator } from './error-handler.js'
import { runtimeLogger } from '../../utils/logger.js'

export interface ExtensionRequest extends Request {
  agent?: Agent
  agentId?: string
  requestId: string
  startTime: number
  extensionContext?: {
    extensionId: string
    operation: string
    metadata?: Record<string, any>
  }
}

export interface RequestLoggingConfig {
  logRequests: boolean
  logResponses: boolean
  logErrors: boolean
  includeBody: boolean
  includeHeaders: boolean
  maxBodyLength: number
}

export interface RateLimitConfig {
  windowMs: number
  maxRequests: number
  skipSuccessful?: boolean
  skipFailedRequests?: boolean
  keyGenerator?: (req: Request) => string
}

export interface CacheConfig {
  enabled: boolean
  ttl: number
  keyGenerator?: (req: Request) => string
  excludeHeaders?: string[]
}

export class ExtensionMiddleware {
  private static requestCounts = new Map<string, { count: number; resetTime: number }>()
  private static responseCache = new Map<string, { data: any; timestamp: number; ttl: number }>()

  /**
   * Request ID middleware - ensures all requests have unique IDs
   */
  static requestId() {
    return (req: ExtensionRequest, res: Response, next: NextFunction): void => {
      req.requestId = req.headers['x-request-id'] as string || 
                     `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
      
      req.startTime = Date.now()
      res.set('X-Request-Id', req.requestId)
      next()
    }
  }

  /**
   * Extension context middleware
   */
  static extensionContext(extensionId: string, operation?: string) {
    return (req: ExtensionRequest, res: Response, next: NextFunction): void => {
      req.extensionContext = {
        extensionId,
        operation: operation || req.method + ' ' + req.path,
        metadata: {
          userAgent: req.headers['user-agent'],
          ip: req.ip,
          timestamp: new Date()
        }
      }
      next()
    }
  }

  /**
   * Request logging middleware
   */
  static requestLogging(config: RequestLoggingConfig = {
    logRequests: true,
    logResponses: true,
    logErrors: true,
    includeBody: false,
    includeHeaders: false,
    maxBodyLength: 1000
  }) {
    return (req: ExtensionRequest, res: Response, next: NextFunction): void => {
      if (config.logRequests) {
        const logData: any = {
          requestId: req.requestId,
          method: req.method,
          path: req.path,
          ip: req.ip,
          userAgent: req.headers['user-agent']
        }

        if (config.includeHeaders) {
          logData.headers = req.headers
        }

        if (config.includeBody && req.body) {
          const bodyStr = JSON.stringify(req.body)
          logData.body = bodyStr.length > config.maxBodyLength 
            ? bodyStr.substring(0, config.maxBodyLength) + '...'
            : bodyStr
        }

        runtimeLogger.info('API Request', logData)
      }

      // Hook into response to log completion
      const originalSend = res.send
      res.send = function(data: any) {
        if (config.logResponses) {
          const duration = Date.now() - req.startTime
          runtimeLogger.info('API Response', {
            requestId: req.requestId,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            success: res.statusCode >= 200 && res.statusCode < 300
          })
        }
        return originalSend.call(this, data)
      }

      next()
    }
  }

  /**
   * Agent validation middleware
   */
  static validateAgent(getAgent: (agentId: string) => Agent | undefined) {
    return (req: ExtensionRequest, res: Response, next: NextFunction): void => {
      const agentId = req.params.agentId || req.body.agentId || req.query.agentId as string
      
      if (!agentId) {
        const error = new ExtensionApiError(
          'Agent ID is required',
          'INVALID_AGENT_ID',
          400,
          undefined,
          req.extensionContext
        )
        
        const response = ExtensionErrorHandler.createErrorResponse(error, req.extensionContext, req.requestId)
        res.status(400).json(response)
        return
      }

      const validation = ExtensionValidator.validateAgentId(agentId)
      if (!validation.valid) {
        const error = new ExtensionApiError(
          'Invalid agent ID format',
          'INVALID_AGENT_ID',
          400,
          validation.errors,
          req.extensionContext
        )
        
        const response = ExtensionErrorHandler.createErrorResponse(error, req.extensionContext, req.requestId)
        res.status(400).json(response)
        return
      }

      const agent = getAgent(agentId)
      if (!agent) {
        const error = new ExtensionApiError(
          `Agent ${agentId} not found`,
          'AGENT_NOT_FOUND',
          404,
          undefined,
          req.extensionContext
        )
        
        const response = ExtensionErrorHandler.createErrorResponse(error, req.extensionContext, req.requestId)
        res.status(404).json(response)
        return
      }

      req.agent = agent
      req.agentId = agentId
      next()
    }
  }

  /**
   * Input validation middleware
   */
  static validateInput(validator: (req: ExtensionRequest) => { valid: boolean; errors?: any[] }) {
    return (req: ExtensionRequest, res: Response, next: NextFunction): void => {
      const validation = validator(req)
      
      if (!validation.valid) {
        const error = new ExtensionApiError(
          'Input validation failed',
          'VALIDATION_ERROR',
          400,
          validation.errors,
          req.extensionContext
        )
        
        const response = ExtensionErrorHandler.createErrorResponse(error, req.extensionContext, req.requestId)
        res.status(400).json(response)
        return
      }
      
      next()
    }
  }

  /**
   * Rate limiting middleware
   */
  static rateLimit(config: RateLimitConfig) {
    return (req: ExtensionRequest, res: Response, next: NextFunction): void => {
      const key = config.keyGenerator ? config.keyGenerator(req) : req.ip || 'unknown'
      const now = Date.now()
      
      // Clean up old entries
      for (const [k, v] of this.requestCounts.entries()) {
        if (now > v.resetTime) {
          this.requestCounts.delete(k)
        }
      }
      
      let rateLimitData = this.requestCounts.get(key)
      if (!rateLimitData) {
        rateLimitData = {
          count: 0,
          resetTime: now + config.windowMs
        }
        this.requestCounts.set(key, rateLimitData)
      }
      
      // Check if rate limit exceeded
      if (rateLimitData.count >= config.maxRequests) {
        const error = new ExtensionApiError(
          'Rate limit exceeded',
          'RATE_LIMITED',
          429,
          {
            limit: config.maxRequests,
            windowMs: config.windowMs,
            resetTime: rateLimitData.resetTime
          },
          req.extensionContext
        )
        
        const response = ExtensionErrorHandler.createErrorResponse(error, req.extensionContext, req.requestId)
        res.status(429).json(response)
        return
      }
      
      rateLimitData.count++
      
      // Set rate limit headers
      res.set('X-RateLimit-Limit', config.maxRequests.toString())
      res.set('X-RateLimit-Remaining', (config.maxRequests - rateLimitData.count).toString())
      res.set('X-RateLimit-Reset', new Date(rateLimitData.resetTime).toISOString())
      
      next()
    }
  }

  /**
   * Response caching middleware
   */
  static cache(config: CacheConfig) {
    return (req: ExtensionRequest, res: Response, next: NextFunction): void => {
      if (!config.enabled) {
        next()
        return
      }

      const key = config.keyGenerator ? config.keyGenerator(req) : 
                  `${req.method}:${req.path}:${JSON.stringify(req.query)}`
      
      // Check cache
      const cached = this.responseCache.get(key)
      if (cached && Date.now() - cached.timestamp < cached.ttl) {
        res.set('X-Cache', 'HIT')
        res.json(cached.data)
        return
      }
      
      // Hook into response to cache
      const originalJson = res.json
      res.json = function(data: any) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          ExtensionMiddleware.responseCache.set(key, {
            data,
            timestamp: Date.now(),
            ttl: config.ttl
          })
          res.set('X-Cache', 'MISS')
        }
        return originalJson.call(this, data)
      }
      
      next()
    }
  }

  /**
   * CORS middleware with security headers
   */
  static security(options: {
    cors?: {
      origins: string[]
      methods: string[]
      headers: string[]
      credentials?: boolean
    }
    helmet?: boolean
    rateLimitHeaders?: boolean
  } = {}) {
    return (req: ExtensionRequest, res: Response, next: NextFunction): void => {
      // Security headers
      if (options.helmet !== false) {
        res.set('X-Content-Type-Options', 'nosniff')
        res.set('X-Frame-Options', 'DENY')
        res.set('X-XSS-Protection', '1; mode=block')
        res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
      }

      // CORS headers
      if (options.cors) {
        const origin = req.headers.origin
        if (origin && options.cors.origins.includes(origin)) {
          res.set('Access-Control-Allow-Origin', origin)
        }
        
        res.set('Access-Control-Allow-Methods', options.cors.methods.join(', '))
        res.set('Access-Control-Allow-Headers', options.cors.headers.join(', '))
        
        if (options.cors.credentials) {
          res.set('Access-Control-Allow-Credentials', 'true')
        }
      }

      next()
    }
  }

  /**
   * Async error handling wrapper
   */
  static asyncHandler(
    fn: (req: ExtensionRequest, res: Response, next: NextFunction) => Promise<void>
  ) {
    return (req: ExtensionRequest, res: Response, next: NextFunction): void => {
      Promise.resolve(fn(req, res, next)).catch(next)
    }
  }

  /**
   * Response formatting middleware
   */
  static formatResponse() {
    return (req: ExtensionRequest, res: Response, next: NextFunction): void => {
      const originalJson = res.json
      
      res.json = function(data: any) {
        // If data is already formatted (has success field), pass through
        if (data && typeof data === 'object' && 'success' in data) {
          return originalJson.call(this, data)
        }
        
        // Format success response
        const formatted = ExtensionErrorHandler.createSuccessResponse(
          data,
          undefined,
          req.requestId
        )
        
        return originalJson.call(this, formatted)
      }
      
      next()
    }
  }

  /**
   * Health check middleware
   */
  static healthCheck(healthChecker?: () => Promise<{ healthy: boolean; details?: any }>) {
    return async (req: ExtensionRequest, res: Response, next: NextFunction): Promise<void> => {
      if (req.path === '/health' || req.path === '/health/check') {
        try {
          const health = healthChecker ? await healthChecker() : { healthy: true }
          
          const response = {
            healthy: health.healthy,
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            details: health.details
          }
          
          res.status(health.healthy ? 200 : 503).json(response)
        } catch (error) {
          res.status(503).json({
            healthy: false,
            error: error instanceof Error ? error.message : 'Health check failed',
            timestamp: new Date().toISOString()
          })
        }
        return
      }
      
      next()
    }
  }

  /**
   * Cleanup method for periodic maintenance
   */
  static cleanup(): void {
    const now = Date.now()
    
    // Clean up old rate limit entries
    for (const [key, data] of this.requestCounts.entries()) {
      if (now > data.resetTime) {
        this.requestCounts.delete(key)
      }
    }
    
    // Clean up old cache entries
    for (const [key, data] of this.responseCache.entries()) {
      if (now - data.timestamp > data.ttl) {
        this.responseCache.delete(key)
      }
    }
  }
}

export default ExtensionMiddleware