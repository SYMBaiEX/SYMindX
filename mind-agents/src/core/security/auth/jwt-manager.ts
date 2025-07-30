/**
 * JWT Manager for secure authentication
 * Implements JWT token generation, validation, and refresh token mechanism
 */

import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { promisify } from 'util';

const generateKeyPair = promisify(crypto.generateKeyPair);

export interface JWTPayload {
  sub: string; // Subject (user ID)
  iat?: number; // Issued at
  exp?: number; // Expiration
  jti?: string; // JWT ID for tracking
  aud?: string; // Audience
  iss?: string; // Issuer
  scopes?: string[]; // Permission scopes
  type?: 'access' | 'refresh';
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
}

export interface JWTConfig {
  issuer: string;
  audience: string;
  accessTokenExpiry: string; // e.g., '15m'
  refreshTokenExpiry: string; // e.g., '7d'
  algorithm: jwt.Algorithm;
}

export class JWTManager {
  private publicKey: string = '';
  private privateKey: string = '';
  private readonly config: JWTConfig;
  private readonly blacklistedTokens: Set<string> = new Set();
  private readonly refreshTokenStore: Map<
    string,
    { userId: string; expiresAt: Date }
  > = new Map();

  constructor(config: Partial<JWTConfig> = {}) {
    this.config = {
      issuer: config.issuer || 'symindx-api',
      audience: config.audience || 'symindx-client',
      accessTokenExpiry: config.accessTokenExpiry || '15m',
      refreshTokenExpiry: config.refreshTokenExpiry || '7d',
      algorithm: config.algorithm || 'RS256',
    };
  }

  /**
   * Initialize JWT manager with RSA key pair
   */
  async initialize(): Promise<void> {
    if (this.config.algorithm.startsWith('RS')) {
      const { publicKey, privateKey } = await generateKeyPair('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem',
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem',
        },
      });

      this.publicKey = publicKey;
      this.privateKey = privateKey;
    } else {
      // For HMAC algorithms, use a secure secret
      const secret =
        process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
      this.privateKey = secret;
      this.publicKey = secret;
    }

    // Start cleanup interval for expired tokens
    setInterval(() => this.cleanupExpiredTokens(), 3600000); // Every hour
  }

  /**
   * Generate a token pair (access + refresh tokens)
   */
  async generateTokenPair(
    userId: string,
    scopes: string[] = []
  ): Promise<TokenPair> {
    const jti = crypto.randomBytes(16).toString('hex');
    const now = Math.floor(Date.now() / 1000);

    // Generate access token
    const accessPayload: JWTPayload = {
      sub: userId,
      iat: now,
      jti: `${jti}-access`,
      aud: this.config.audience,
      iss: this.config.issuer,
      scopes,
      type: 'access',
    };

    const accessToken = jwt.sign(accessPayload, this.privateKey, {
      algorithm: this.config.algorithm,
      expiresIn: this.config.accessTokenExpiry,
    });

    // Generate refresh token
    const refreshPayload: JWTPayload = {
      sub: userId,
      iat: now,
      jti: `${jti}-refresh`,
      aud: this.config.audience,
      iss: this.config.issuer,
      type: 'refresh',
    };

    const refreshToken = jwt.sign(refreshPayload, this.privateKey, {
      algorithm: this.config.algorithm,
      expiresIn: this.config.refreshTokenExpiry,
    });

    // Store refresh token
    const refreshExpiresAt = new Date(
      now * 1000 + this.parseExpiry(this.config.refreshTokenExpiry)
    );
    this.refreshTokenStore.set(refreshToken, {
      userId,
      expiresAt: refreshExpiresAt,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.parseExpiry(this.config.accessTokenExpiry) / 1000,
      refreshExpiresIn: this.parseExpiry(this.config.refreshTokenExpiry) / 1000,
    };
  }

  /**
   * Verify and decode a token
   */
  async verifyToken(
    token: string,
    tokenType: 'access' | 'refresh' = 'access'
  ): Promise<JWTPayload> {
    // Check if token is blacklisted
    if (this.blacklistedTokens.has(token)) {
      throw new Error('Token has been revoked');
    }

    try {
      const decoded = jwt.verify(token, this.publicKey, {
        algorithms: [this.config.algorithm],
        audience: this.config.audience,
        issuer: this.config.issuer,
      }) as JWTPayload;

      // Verify token type
      if (decoded.type !== tokenType) {
        throw new Error(
          `Invalid token type. Expected ${tokenType}, got ${decoded.type}`
        );
      }

      // For refresh tokens, verify they're in our store
      if (tokenType === 'refresh' && !this.refreshTokenStore.has(token)) {
        throw new Error('Refresh token not found or expired');
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token has expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      }
      throw error;
    }
  }

  /**
   * Refresh an access token using a refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<TokenPair> {
    const payload = await this.verifyToken(refreshToken, 'refresh');

    // Revoke old refresh token
    this.revokeToken(refreshToken);

    // Generate new token pair
    return this.generateTokenPair(payload.sub, payload.scopes);
  }

  /**
   * Revoke a token
   */
  revokeToken(token: string): void {
    this.blacklistedTokens.add(token);
    this.refreshTokenStore.delete(token);
  }

  /**
   * Extract token from Authorization header
   */
  extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }

  /**
   * Get public key for token verification (useful for microservices)
   */
  getPublicKey(): string {
    return this.publicKey;
  }

  /**
   * Clean up expired tokens
   */
  private cleanupExpiredTokens(): void {
    const now = new Date();

    // Clean refresh token store
    for (const [token, data] of this.refreshTokenStore.entries()) {
      if (data.expiresAt < now) {
        this.refreshTokenStore.delete(token);
      }
    }

    // Note: In production, blacklisted tokens should be stored in Redis with TTL
    // This is a simplified in-memory implementation
  }

  /**
   * Parse expiry string to milliseconds
   */
  private parseExpiry(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error(`Invalid expiry format: ${expiry}`);
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        throw new Error(`Invalid time unit: ${unit}`);
    }
  }
}
