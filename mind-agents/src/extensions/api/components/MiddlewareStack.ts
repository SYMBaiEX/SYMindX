/**
 * MiddlewareStack.ts - Express middleware configuration and management
 *
 * This module handles:
 * - Security middleware (CORS, Helmet, Rate Limiting)
 * - Authentication and authorization
 * - Input validation and sanitization
 * - Request logging and metrics
 * - Error handling middleware
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// Security imports
import { JWTManager } from '../../../core/security/auth/jwt-manager';
import { SessionManager } from '../../../core/security/auth/session-manager';
import { AuthMiddleware } from '../../../core/security/middleware/auth-middleware';
import { InputValidator } from '../../../core/security/middleware/input-validation';

import { ApiSettings } from '../types';
import { standardLoggers } from '../../../utils/standard-logging';
import { errorHandler } from '../../../utils/error-handler';
import { createValidationError } from '../../../utils/standard-errors';

export class MiddlewareStack {
  private logger = standardLoggers.api;
  private config: ApiSettings;

  // Security components
  private jwtManager: JWTManager;
  private sessionManager: SessionManager;
  private authMiddleware: AuthMiddleware;
  private inputValidator: InputValidator;

  // Rate limiting
  private rateLimiters = new Map<
    string,
    { count: number; resetTime: number }
  >();

  constructor(config: ApiSettings) {
    this.config = config;

    // Initialize security components
    this.jwtManager = new JWTManager({
      secretKey: this.config.auth?.jwtSecret || 'default-secret',
      tokenExpiry: this.config.auth?.tokenExpiry || '24h',
    });

    this.sessionManager = new SessionManager({
      maxSessions: this.config.auth?.maxSessions || 100,
      sessionTimeout: this.config.auth?.sessionTimeout || 3600000, // 1 hour
    });

    this.authMiddleware = new AuthMiddleware(
      this.jwtManager,
      this.sessionManager
    );
    this.inputValidator = new InputValidator();
  }

  /**
   * Apply all middleware to Express app
   */
  applyMiddleware(app: express.Application): void {
    this.logger.start('Applying middleware stack...');

    try {
      // Security middleware
      this.applySecurityMiddleware(app);

      // Body parsing middleware
      this.applyBodyParsingMiddleware(app);

      // Authentication middleware
      this.applyAuthenticationMiddleware(app);

      // Validation middleware
      this.applyValidationMiddleware(app);

      // Logging middleware
      this.applyLoggingMiddleware(app);

      // Rate limiting middleware
      this.applyRateLimitingMiddleware(app);

      // Error handling middleware (must be last)
      this.applyErrorHandlingMiddleware(app);

      this.logger.info('Middleware stack applied successfully');
    } catch (error) {
      this.logger.error('Failed to apply middleware stack', { error });
      throw error;
    }
  }

  /**
   * Apply security middleware (CORS, Helmet)
   */
  private applySecurityMiddleware(app: express.Application): void {
    // CORS configuration
    const corsOptions: cors.CorsOptions = {
      origin: this.config.cors?.allowedOrigins || '*',
      methods: this.config.cors?.allowedMethods || [
        'GET',
        'POST',
        'PUT',
        'DELETE',
        'OPTIONS',
      ],
      allowedHeaders: this.config.cors?.allowedHeaders || [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin',
      ],
      credentials: this.config.cors?.allowCredentials ?? true,
      maxAge: this.config.cors?.maxAge || 86400, // 24 hours
    };

    app.use(cors(corsOptions));

    // Helmet security headers
    app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'", 'ws:', 'wss:'],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
          },
        },
        crossOriginEmbedderPolicy: false, // Disabled for WebSocket compatibility
      })
    );

    this.logger.debug('Security middleware applied');
  }

  /**
   * Apply body parsing middleware
   */
  private applyBodyParsingMiddleware(app: express.Application): void {
    // JSON body parser with size limit
    app.use(
      express.json({
        limit: this.config.maxRequestSize || '10mb',
        strict: true,
      })
    );

    // URL-encoded body parser
    app.use(
      express.urlencoded({
        extended: true,
        limit: this.config.maxRequestSize || '10mb',
      })
    );

    // Raw body parser for specific endpoints
    app.use('/api/webhooks/*', express.raw({ type: 'application/json' }));

    this.logger.debug('Body parsing middleware applied');
  }

  /**
   * Apply authentication middleware
   */
  private applyAuthenticationMiddleware(app: express.Application): void {
    if (!this.config.auth?.enabled) {
      this.logger.debug('Authentication disabled, skipping auth middleware');
      return;
    }

    // Apply authentication to API routes
    app.use('/api/*', (req, res, next) => {
      // Skip authentication for public endpoints
      const publicEndpoints = [
        '/api/health',
        '/api/status',
        '/api/auth/login',
        '/api/auth/register',
      ];

      if (publicEndpoints.some((endpoint) => req.path.startsWith(endpoint))) {
        return next();
      }

      // Apply authentication
      this.authMiddleware.authenticate(req, res, next);
    });

    this.logger.debug('Authentication middleware applied');
  }

  /**
   * Apply validation middleware
   */
  private applyValidationMiddleware(app: express.Application): void {
    // Input validation for all API routes
    app.use('/api/*', (req, res, next) => {
      try {
        // Validate request body
        if (req.body) {
          const validationResult = this.inputValidator.validateInput(req.body);
          if (!validationResult.isValid) {
            throw createValidationError(
              `Invalid input: ${validationResult.errors.join(', ')}`
            );
          }
        }

        // Validate query parameters
        if (req.query) {
          const validationResult = this.inputValidator.validateInput(req.query);
          if (!validationResult.isValid) {
            throw createValidationError(
              `Invalid query parameters: ${validationResult.errors.join(', ')}`
            );
          }
        }

        next();
      } catch (error) {
        next(error);
      }
    });

    this.logger.debug('Validation middleware applied');
  }

  /**
   * Apply logging middleware
   */
  private applyLoggingMiddleware(app: express.Application): void {
    // Request logging
    app.use((req, res, next) => {
      const startTime = Date.now();

      // Log request
      this.logger.debug(`${req.method} ${req.path}`, {
        method: req.method,
        path: req.path,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        query: req.query,
      });

      // Log response when finished
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        const logLevel = res.statusCode >= 400 ? 'error' : 'debug';

        this.logger[logLevel](`${req.method} ${req.path} - ${res.statusCode}`, {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration,
          contentLength: res.get('content-length'),
        });
      });

      next();
    });

    this.logger.debug('Logging middleware applied');
  }

  /**
   * Apply rate limiting middleware
   */
  private applyRateLimitingMiddleware(app: express.Application): void {
    if (!this.config.rateLimit?.enabled) {
      this.logger.debug('Rate limiting disabled');
      return;
    }

    // Create rate limiter
    const limiter = rateLimit({
      windowMs: this.config.rateLimit.windowMs || 15 * 60 * 1000, // 15 minutes
      max: this.config.rateLimit.maxRequests || 100, // Limit each IP to maxRequests per windowMs
      message: {
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: this.config.rateLimit.windowMs || 15 * 60 * 1000,
      },
      standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
      legacyHeaders: false, // Disable the `X-RateLimit-*` headers
      handler: (req, res) => {
        this.logger.warn('Rate limit exceeded', {
          ip: req.ip,
          path: req.path,
          userAgent: req.get('User-Agent'),
        });

        res.status(429).json({
          error: 'Too many requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: this.config.rateLimit?.windowMs || 15 * 60 * 1000,
        });
      },
    });

    // Apply to API routes
    app.use('/api/', limiter);

    // Stricter rate limiting for authentication endpoints
    const authLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // Limit auth attempts
      skipSuccessfulRequests: true,
    });

    app.use('/api/auth/', authLimiter);

    this.logger.debug('Rate limiting middleware applied');
  }

  /**
   * Apply error handling middleware
   */
  private applyErrorHandlingMiddleware(app: express.Application): void {
    // 404 handler
    app.use((req, res, next) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.path} not found`,
        timestamp: new Date().toISOString(),
      });
    });

    // Error handler
    app.use(
      (
        error: any,
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
      ) => {
        this.logger.error('API error', {
          error: error.message,
          stack: error.stack,
          path: req.path,
          method: req.method,
          ip: req.ip,
        });

        const statusCode = error.statusCode || error.status || 500;
        const message = error.message || 'Internal Server Error';

        res.status(statusCode).json({
          error: error.name || 'Error',
          message,
          timestamp: new Date().toISOString(),
          ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
        });
      }
    );

    this.logger.debug('Error handling middleware applied');
  }

  /**
   * Get security components for use in other modules
   */
  getSecurityComponents() {
    return {
      jwtManager: this.jwtManager,
      sessionManager: this.sessionManager,
      authMiddleware: this.authMiddleware,
      inputValidator: this.inputValidator,
    };
  }

  /**
   * Get rate limiting status
   */
  getRateLimitingStatus(): {
    enabled: boolean;
    windowMs: number;
    maxRequests: number;
    currentLimits: Array<{ ip: string; count: number; resetTime: number }>;
  } {
    return {
      enabled: this.config.rateLimit?.enabled ?? false,
      windowMs: this.config.rateLimit?.windowMs || 15 * 60 * 1000,
      maxRequests: this.config.rateLimit?.maxRequests || 100,
      currentLimits: Array.from(this.rateLimiters.entries()).map(
        ([ip, data]) => ({
          ip,
          count: data.count,
          resetTime: data.resetTime,
        })
      ),
    };
  }
}
