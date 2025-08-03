/**
 * JWT Authentication System
 * Provides basic JWT token generation and validation
 */

import jwt from 'jsonwebtoken';
import { configManager } from './config-manager';

export interface JWTPayload {
  userId: string;
  roles: string[];
  permissions: string[];
  iat?: number;
  exp?: number;
}

export interface AuthResult {
  success: boolean;
  payload?: JWTPayload;
  error?: string;
}

export class JWTAuth {
  private static instance: JWTAuth;
  private jwtSecret: string;

  private constructor() {
    const securityConfig = configManager.getSecurityConfig();
    this.jwtSecret = securityConfig.jwtSecret;
  }

  public static getInstance(): JWTAuth {
    if (!JWTAuth.instance) {
      JWTAuth.instance = new JWTAuth();
    }
    return JWTAuth.instance;
  }

  public generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>, expiresIn = '24h'): string {
    return jwt.sign(payload, this.jwtSecret, {
      expiresIn,
      issuer: 'symindx',
      audience: 'symindx-api',
    });
  }

  public verifyToken(token: string): AuthResult {
    try {
      const payload = jwt.verify(token, this.jwtSecret, {
        issuer: 'symindx',
        audience: 'symindx-api',
      }) as JWTPayload;

      return {
        success: true,
        payload,
      };
    } catch (error) {
      let errorMessage = 'Invalid token';
      
      if (error instanceof jwt.TokenExpiredError) {
        errorMessage = 'Token expired';
      } else if (error instanceof jwt.JsonWebTokenError) {
        errorMessage = 'Invalid token format';
      } else if (error instanceof jwt.NotBeforeError) {
        errorMessage = 'Token not active yet';
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  public refreshToken(token: string): string | null {
    const result = this.verifyToken(token);
    if (!result.success || !result.payload) {
      return null;
    }

    // Generate new token with same payload but fresh expiration
    const { iat, exp, ...payload } = result.payload;
    return this.generateToken(payload);
  }

  public hasPermission(payload: JWTPayload, requiredPermission: string): boolean {
    return payload.permissions.includes(requiredPermission) || 
           payload.permissions.includes('*') ||
           payload.roles.includes('admin');
  }

  public hasRole(payload: JWTPayload, requiredRole: string): boolean {
    return payload.roles.includes(requiredRole) || payload.roles.includes('admin');
  }
}

export const jwtAuth = JWTAuth.getInstance();