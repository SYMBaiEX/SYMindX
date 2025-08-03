/**
 * Secure Server Example
 * Demonstrates how to set up a secure Express server with all security features
 */

import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import { configManager, jwtAuth, inputValidator, httpsServer } from './index';

export function createSecureServer(): express.Application {
  const app = express();
  const securityConfig = configManager.getSecurityConfig();

  // Security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  }));

  // CORS configuration
  app.use(cors({
    origin: securityConfig.allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  // Rate limiting
  if (securityConfig.rateLimiting.enabled) {
    const limiter = rateLimit({
      windowMs: securityConfig.rateLimiting.windowMs,
      max: securityConfig.rateLimiting.maxRequests,
      message: {
        error: 'Too many requests from this IP, please try again later.',
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    app.use(limiter);
  }

  // Body parsing with size limits
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Authentication middleware
  if (securityConfig.enableAuth) {
    app.use('/api', (req, res, next) => {
      // Skip authentication for public endpoints
      const publicEndpoints = ['/api/health', '/api/auth/login'];
      if (publicEndpoints.includes(req.path)) {
        return next();
      }

      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid authorization header' });
      }

      const token = authHeader.substring(7);
      const authResult = jwtAuth.verifyToken(token);

      if (!authResult.success) {
        return res.status(401).json({ error: authResult.error });
      }

      // Add user info to request
      (req as any).user = authResult.payload;
      next();
    });
  }

  // Input validation middleware
  app.use((req, res, next) => {
    // Validate common parameters
    if (req.params.id) {
      const validation = inputValidator.validate(req.params.id, {
        type: 'string',
        minLength: 1,
        maxLength: 50,
        pattern: /^[a-zA-Z0-9_-]+$/,
      });

      if (!validation.isValid) {
        return res.status(400).json({
          error: 'Invalid ID parameter',
          details: validation.errors,
        });
      }
    }

    // Sanitize request body
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }

    next();
  });

  // Example secure endpoints
  app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  app.post('/api/auth/login', (req, res) => {
    // Validate login request
    const validation = inputValidator.validateObject(req.body, {
      username: { required: true, type: 'string', minLength: 3, maxLength: 50 },
      password: { required: true, type: 'string', minLength: 8, maxLength: 128 },
    });

    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Invalid login data',
        details: validation.errors,
      });
    }

    // In a real implementation, verify credentials against database
    const { username } = validation.sanitizedObject;
    
    // Generate JWT token
    const token = jwtAuth.generateToken({
      userId: username as string,
      roles: ['user'],
      permissions: ['read', 'write'],
    });

    res.json({ token, expiresIn: '24h' });
  });

  app.get('/api/agents', (req, res) => {
    // This endpoint requires authentication
    const user = (req as any).user;
    res.json({
      message: 'Agents list',
      user: user?.userId,
      agents: [],
    });
  });

  // Error handling
  app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Server error:', error);
    
    // Don't leak error details in production
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    res.status(500).json({
      error: 'Internal server error',
      ...(isDevelopment && { details: error.message, stack: error.stack }),
    });
  });

  return app;
}

function sanitizeObject(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = inputValidator.sanitizeString(value);
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

export function startSecureServer(port = 3000): void {
  const app = createSecureServer();
  
  // Validate configuration
  configManager.validateConfiguration();
  
  if (!httpsServer.validateTLSConfig()) {
    console.error('❌ Invalid TLS configuration, exiting');
    process.exit(1);
  }

  // Create server (HTTP or HTTPS based on configuration)
  const server = httpsServer.createServer(app, { port });
  
  server.listen(port, () => {
    const protocol = configManager.getSecurityConfig().enableHttps ? 'https' : 'http';
    console.log(`🚀 Secure server running on ${protocol}://localhost:${port}`);
    console.log(`🔒 Security features enabled:`);
    console.log(`   - Authentication: ${configManager.getSecurityConfig().enableAuth}`);
    console.log(`   - HTTPS/TLS: ${configManager.getSecurityConfig().enableHttps}`);
    console.log(`   - Rate Limiting: ${configManager.getSecurityConfig().rateLimiting.enabled}`);
    console.log(`   - Input Validation: ✅`);
    console.log(`   - Security Headers: ✅`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('🛑 Received SIGTERM, shutting down gracefully');
    server.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });
  });
}