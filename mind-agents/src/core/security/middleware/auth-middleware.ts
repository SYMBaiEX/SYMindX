/**
 * Authentication Middleware
 * Comprehensive authentication and authorization middleware for Express
 */

import { Request, Response, NextFunction } from 'express';
import { JWTManager } from '../auth/jwt-manager';
import { SessionManager } from '../auth/session-manager';
import { createHash } from 'crypto';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        scopes: string[];
        sessionId?: string;
      };
      session?: any;
    }
  }
}

export interface AuthMiddlewareConfig {
  enableApiKey: boolean;
  enableJWT: boolean;
  enableSession: boolean;
  apiKeyHeader: string;
  apiKeyHashAlgorithm: string;
  requireHttps: boolean;
  trustedProxies: string[];
}

export interface ApiKeyData {
  id: string;
  key: string; // Hashed
  userId: string;
  name: string;
  scopes: string[];
  createdAt: Date;
  lastUsedAt?: Date;
  expiresAt?: Date;
  metadata: Record<string, any>;
}

export class AuthMiddleware {
  private readonly jwtManager: JWTManager;
  private readonly sessionManager: SessionManager;
  private readonly config: AuthMiddlewareConfig;
  private readonly apiKeys: Map<string, ApiKeyData> = new Map();

  constructor(
    jwtManager: JWTManager,
    sessionManager: SessionManager,
    config: Partial<AuthMiddlewareConfig> = {}
  ) {
    this.jwtManager = jwtManager;
    this.sessionManager = sessionManager;
    this.config = {
      enableApiKey: config.enableApiKey !== false,
      enableJWT: config.enableJWT !== false,
      enableSession: config.enableSession !== false,
      apiKeyHeader: config.apiKeyHeader || 'X-API-Key',
      apiKeyHashAlgorithm: config.apiKeyHashAlgorithm || 'sha256',
      requireHttps: config.requireHttps !== false,
      trustedProxies: config.trustedProxies || []
    };
  }

  /**
   * Main authentication middleware
   */
  authenticate(requiredScopes: string[] = []) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Check HTTPS requirement
        if (this.config.requireHttps && !this.isSecureConnection(req)) {
          return res.status(403).json({
            error: 'HTTPS required',
            code: 'HTTPS_REQUIRED'
          });
        }

        let authenticated = false;

        // Try API Key authentication
        if (this.config.enableApiKey) {
          const apiKeyResult = await this.authenticateApiKey(req);
          if (apiKeyResult.success) {
            req.user = apiKeyResult.user;
            authenticated = true;
          }
        }

        // Try JWT authentication
        if (!authenticated && this.config.enableJWT) {
          const jwtResult = await this.authenticateJWT(req);
          if (jwtResult.success) {
            req.user = jwtResult.user;
            authenticated = true;

            // Validate session if enabled
            if (this.config.enableSession && req.user.sessionId) {
              const session = await this.sessionManager.validateSession(
                req.user.sessionId,
                this.getClientIp(req),
                req.get('user-agent')
              );

              if (!session) {
                return res.status(401).json({
                  error: 'Session expired or invalid',
                  code: 'SESSION_INVALID'
                });
              }

              req.session = session;
            }
          }
        }

        // Check if authenticated
        if (!authenticated) {
          return res.status(401).json({
            error: 'Authentication required',
            code: 'AUTH_REQUIRED'
          });
        }

        // Check required scopes
        if (requiredScopes.length > 0) {
          const hasRequiredScopes = requiredScopes.every(scope =>
            req.user!.scopes.includes(scope)
          );

          if (!hasRequiredScopes) {
            return res.status(403).json({
              error: 'Insufficient permissions',
              code: 'INSUFFICIENT_SCOPES',
              required: requiredScopes,
              provided: req.user!.scopes
            });
          }
        }

        next();
      } catch (error) {
        console.error('Authentication error:', error);
        res.status(500).json({
          error: 'Authentication error',
          code: 'AUTH_ERROR'
        });
      }
    };
  }

  /**
   * Middleware for optional authentication
   */
  optionalAuth() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Try authentication but don't fail if not authenticated
        const authResult = await this.authenticateJWT(req) || 
                          await this.authenticateApiKey(req);
        
        if (authResult?.success) {
          req.user = authResult.user;
        }

        next();
      } catch (error) {
        // Log error but continue
        console.error('Optional auth error:', error);
        next();
      }
    };
  }

  /**
   * Authenticate using API Key
   */
  private async authenticateApiKey(req: Request): Promise<{
    success: boolean;
    user?: any;
  }> {
    const apiKey = req.get(this.config.apiKeyHeader);
    if (!apiKey) {
      return { success: false };
    }

    // Hash the provided key
    const hashedKey = this.hashApiKey(apiKey);
    const keyData = this.apiKeys.get(hashedKey);

    if (!keyData) {
      return { success: false };
    }

    // Check expiration
    if (keyData.expiresAt && keyData.expiresAt < new Date()) {
      return { success: false };
    }

    // Update last used
    keyData.lastUsedAt = new Date();
    this.apiKeys.set(hashedKey, keyData);

    return {
      success: true,
      user: {
        id: keyData.userId,
        scopes: keyData.scopes,
        apiKeyId: keyData.id
      }
    };
  }

  /**
   * Authenticate using JWT
   */
  private async authenticateJWT(req: Request): Promise<{
    success: boolean;
    user?: any;
  }> {
    const token = this.jwtManager.extractTokenFromHeader(req.get('authorization'));
    if (!token) {
      return { success: false };
    }

    try {
      const payload = await this.jwtManager.verifyToken(token, 'access');
      
      return {
        success: true,
        user: {
          id: payload.sub,
          scopes: payload.scopes || [],
          sessionId: payload.jti
        }
      };
    } catch (error) {
      return { success: false };
    }
  }

  /**
   * Create a new API key
   */
  async createApiKey(
    userId: string,
    name: string,
    scopes: string[] = [],
    expiresIn?: number
  ): Promise<{ id: string; key: string }> {
    const id = `key_${createHash('sha256').update(Date.now().toString()).digest('hex').substring(0, 16)}`;
    const rawKey = `sk_${createHash('sha512').update(Math.random().toString()).digest('hex')}`;
    const hashedKey = this.hashApiKey(rawKey);

    const keyData: ApiKeyData = {
      id,
      key: hashedKey,
      userId,
      name,
      scopes,
      createdAt: new Date(),
      expiresAt: expiresIn ? new Date(Date.now() + expiresIn) : undefined,
      metadata: {}
    };

    this.apiKeys.set(hashedKey, keyData);

    return { id, key: rawKey };
  }

  /**
   * Revoke an API key
   */
  revokeApiKey(keyId: string): boolean {
    for (const [hash, data] of this.apiKeys) {
      if (data.id === keyId) {
        this.apiKeys.delete(hash);
        return true;
      }
    }
    return false;
  }

  /**
   * Hash API key
   */
  private hashApiKey(key: string): string {
    return createHash(this.config.apiKeyHashAlgorithm)
      .update(key)
      .digest('hex');
  }

  /**
   * Check if connection is secure
   */
  private isSecureConnection(req: Request): boolean {
    // Direct HTTPS
    if (req.secure) return true;

    // Behind proxy
    if (this.config.trustedProxies.length > 0) {
      const clientIp = this.getClientIp(req);
      const isTrustedProxy = this.config.trustedProxies.includes(clientIp);
      
      if (isTrustedProxy) {
        // Check X-Forwarded-Proto header
        const proto = req.get('x-forwarded-proto');
        return proto === 'https';
      }
    }

    return false;
  }

  /**
   * Get client IP address
   */
  private getClientIp(req: Request): string {
    // Check for proxy headers
    const forwardedFor = req.get('x-forwarded-for');
    if (forwardedFor) {
      return forwardedFor.split(',')[0].trim();
    }

    const realIp = req.get('x-real-ip');
    if (realIp) {
      return realIp;
    }

    return req.ip || req.socket.remoteAddress || 'unknown';
  }
}