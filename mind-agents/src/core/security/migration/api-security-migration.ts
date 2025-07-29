/**
 * API Security Migration Script
 * Updates existing API routes with proper authentication and validation
 */

import { Express } from 'express';
import { z } from 'zod';
import { AuthMiddleware } from '../middleware/auth-middleware';
import { InputValidator } from '../middleware/input-validation';
import { SecureErrorHandler } from '../middleware/secure-error-handler';

export class ApiSecurityMigration {
  private readonly authMiddleware: AuthMiddleware;
  private readonly inputValidator: InputValidator;
  private readonly errorHandler: SecureErrorHandler;

  constructor(
    authMiddleware: AuthMiddleware,
    inputValidator: InputValidator,
    errorHandler: SecureErrorHandler
  ) {
    this.authMiddleware = authMiddleware;
    this.inputValidator = inputValidator;
    this.errorHandler = errorHandler;
  }

  /**
   * Apply security middleware to API routes
   */
  applySecurityToRoutes(app: Express): void {
    // Add request ID middleware
    app.use(SecureErrorHandler.requestIdMiddleware());

    // Add global authentication for protected routes
    app.use('/api', this.authMiddleware.authenticate(['user']));

    // Add input validation for specific routes
    this.addChatValidation(app);
    this.addAgentValidation(app);
    this.addMemoryValidation(app);
    this.addConversationValidation(app);

    // Add 404 handler
    app.use(SecureErrorHandler.notFoundHandler());

    // Add global error handler (must be last)
    app.use(this.errorHandler.handleError());
  }

  /**
   * Add validation for chat endpoints
   */
  private addChatValidation(app: Express): void {
    // Chat message validation
    const chatMessageSchema = z.object({
      message: z.string().min(1).max(10000),
      userId: z.string().uuid().optional(),
      conversationId: z.string().uuid().optional(),
      metadata: z.record(z.any()).optional()
    });

    app.use('/api/chat*', this.inputValidator.validate({
      body: chatMessageSchema.partial()
    }));

    // Chat history validation
    const chatHistorySchema = z.object({
      limit: z.coerce.number().int().positive().max(100).default(20),
      offset: z.coerce.number().int().min(0).default(0),
      startDate: z.coerce.date().optional(),
      endDate: z.coerce.date().optional()
    });

    app.use('/chat/history/:agentId', this.inputValidator.validate({
      params: z.object({
        agentId: z.string().uuid()
      }),
      query: chatHistorySchema
    }));
  }

  /**
   * Add validation for agent endpoints
   */
  private addAgentValidation(app: Express): void {
    // Agent ID validation
    const agentIdSchema = z.object({
      agentId: z.string().uuid()
    });

    app.use('/api/agent/:agentId*', this.inputValidator.validate({
      params: agentIdSchema
    }));

    app.use('/api/agents/:agentId*', this.inputValidator.validate({
      params: agentIdSchema
    }));

    // Agent spawn validation
    const spawnAgentSchema = z.object({
      characterId: z.string().min(1).max(100),
      config: z.record(z.any()).optional(),
      autoStart: z.boolean().default(false)
    });

    app.use('/api/agents/spawn', this.inputValidator.validate({
      body: spawnAgentSchema
    }));

    // Agent routing validation
    const routeAgentSchema = z.object({
      message: z.string().min(1).max(10000),
      context: z.record(z.any()).optional(),
      preferences: z.array(z.string()).optional()
    });

    app.use('/api/agents/route', this.inputValidator.validate({
      body: routeAgentSchema
    }));
  }

  /**
   * Add validation for memory endpoints
   */
  private addMemoryValidation(app: Express): void {
    // Memory creation validation
    const memorySchema = z.object({
      content: z.string().min(1).max(50000),
      type: z.enum(['conversation', 'observation', 'reflection', 'plan']),
      agentId: z.string().uuid(),
      importance: z.number().min(0).max(1).default(0.5),
      metadata: z.record(z.any()).optional()
    });

    app.use('/memory', this.inputValidator.validate({
      body: memorySchema.partial()
    }));
  }

  /**
   * Add validation for conversation endpoints
   */
  private addConversationValidation(app: Express): void {
    // Conversation creation validation
    const createConversationSchema = z.object({
      title: z.string().min(1).max(200).optional(),
      participants: z.array(z.string().uuid()).min(1),
      metadata: z.record(z.any()).optional()
    });

    app.use('/api/conversations', this.inputValidator.validate({
      body: createConversationSchema.partial()
    }));

    // Conversation ID validation
    const conversationIdSchema = z.object({
      conversationId: z.string().uuid()
    });

    app.use('/api/conversations/:conversationId*', this.inputValidator.validate({
      params: conversationIdSchema
    }));

    // Message creation validation
    const messageSchema = z.object({
      content: z.string().min(1).max(10000),
      senderId: z.string().uuid(),
      messageType: z.enum(['text', 'image', 'file', 'system']).default('text'),
      metadata: z.record(z.any()).optional()
    });

    app.use('/api/conversations/:conversationId/messages', this.inputValidator.validate({
      body: messageSchema.partial()
    }));

    // Transfer conversation validation
    const transferSchema = z.object({
      reason: z.string().max(500).optional(),
      metadata: z.record(z.any()).optional()
    });

    app.use('/api/conversations/:conversationId/transfer/:newAgentId', this.inputValidator.validate({
      params: z.object({
        conversationId: z.string().uuid(),
        newAgentId: z.string().uuid()
      }),
      body: transferSchema
    }));
  }

  /**
   * Add rate limiting for specific endpoints
   */
  addEndpointRateLimits(app: Express): void {
    // Strict rate limiting for authentication endpoints
    const authLimiter = this.createRateLimiter({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // 5 attempts per window
      message: {
        error: 'Too many authentication attempts',
        code: 'AUTH_RATE_LIMIT'
      }
    });

    app.use('/api/auth*', authLimiter);

    // Moderate rate limiting for chat endpoints
    const chatLimiter = this.createRateLimiter({
      windowMs: 60 * 1000, // 1 minute
      max: 30, // 30 messages per minute
      message: {
        error: 'Too many chat messages',
        code: 'CHAT_RATE_LIMIT'
      }
    });

    app.use('/api/chat*', chatLimiter);

    // Agent operation rate limiting
    const agentLimiter = this.createRateLimiter({
      windowMs: 60 * 1000, // 1 minute
      max: 10, // 10 operations per minute
      message: {
        error: 'Too many agent operations',
        code: 'AGENT_RATE_LIMIT'
      }
    });

    app.use('/api/agents/spawn', agentLimiter);
    app.use('/api/agents/:agentId/start', agentLimiter);
    app.use('/api/agents/:agentId/stop', agentLimiter);
    app.use('/api/agents/:agentId/restart', agentLimiter);
  }

  /**
   * Create rate limiter with custom configuration
   */
  private createRateLimiter(options: {
    windowMs: number;
    max: number;
    message: any;
  }) {
    const rateLimit = require('express-rate-limit');
    
    return rateLimit({
      windowMs: options.windowMs,
      max: options.max,
      message: options.message,
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req: any) => {
        // Use user ID if authenticated, otherwise IP
        return req.user?.id || req.ip;
      },
      onLimitReached: (req: any) => {
        console.warn(`Rate limit exceeded for ${req.user?.id || req.ip} on ${req.path}`);
      }
    });
  }

  /**
   * Add security monitoring and logging
   */
  addSecurityMonitoring(app: Express): void {
    // Log security events
    app.use((req, res, next) => {
      const securityEvents = {
        suspiciousUserAgent: /bot|crawler|spider|scraper/i.test(req.get('user-agent') || ''),
        rapidRequests: false, // Would need to implement request frequency analysis
        unusualPatterns: false // Would need to implement pattern detection
      };

      if (Object.values(securityEvents).some(Boolean)) {
        console.warn('Security event detected:', {
          ip: req.ip,
          userAgent: req.get('user-agent'),
          path: req.path,
          method: req.method,
          events: securityEvents,
          timestamp: new Date().toISOString()
        });
      }

      next();
    });
  }
}