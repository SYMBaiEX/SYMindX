/**
 * Session Manager for secure session handling
 * Implements session storage, validation, and lifecycle management
 */

import * as crypto from 'crypto';
import { JWTManager, JWTPayload } from './jwt-manager';

export interface Session {
  id: string;
  userId: string;
  createdAt: Date;
  lastActivityAt: Date;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
  metadata: Record<string, any>;
  isActive: boolean;
}

export interface SessionConfig {
  sessionDuration: number; // in milliseconds
  maxConcurrentSessions: number;
  enableFingerprinting: boolean;
  sessionIdleTimeout: number; // in milliseconds
}

export class SessionManager {
  private readonly sessions: Map<string, Session> = new Map();
  private readonly userSessions: Map<string, Set<string>> = new Map();
  private readonly config: SessionConfig;
  private readonly jwtManager: JWTManager;

  constructor(jwtManager: JWTManager, config: Partial<SessionConfig> = {}) {
    this.jwtManager = jwtManager;
    this.config = {
      sessionDuration: config.sessionDuration || 24 * 60 * 60 * 1000, // 24 hours
      maxConcurrentSessions: config.maxConcurrentSessions || 5,
      enableFingerprinting: config.enableFingerprinting !== false,
      sessionIdleTimeout: config.sessionIdleTimeout || 30 * 60 * 1000, // 30 minutes
    };

    // Start cleanup interval
    setInterval(() => this.cleanupExpiredSessions(), 300000); // Every 5 minutes
  }

  /**
   * Create a new session
   */
  async createSession(
    userId: string,
    ipAddress?: string,
    userAgent?: string,
    metadata: Record<string, any> = {}
  ): Promise<{ session: Session; tokens: any }> {
    // Check concurrent session limit
    await this.enforceSessionLimit(userId);

    const sessionId = this.generateSecureSessionId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.config.sessionDuration);

    const session: Session = {
      id: sessionId,
      userId,
      createdAt: now,
      lastActivityAt: now,
      expiresAt,
      ipAddress,
      userAgent,
      metadata: {
        ...metadata,
        fingerprint: this.config.enableFingerprinting
          ? this.generateFingerprint(ipAddress, userAgent)
          : undefined,
      },
      isActive: true,
    };

    // Store session
    this.sessions.set(sessionId, session);

    // Track user sessions
    if (!this.userSessions.has(userId)) {
      this.userSessions.set(userId, new Set());
    }
    this.userSessions.get(userId)!.add(sessionId);

    // Generate JWT tokens
    const tokens = await this.jwtManager.generateTokenPair(userId, ['user']);

    return { session, tokens };
  }

  /**
   * Validate and update session activity
   */
  async validateSession(
    sessionId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<Session | null> {
    const session = this.sessions.get(sessionId);

    if (!session || !session.isActive) {
      return null;
    }

    const now = new Date();

    // Check if session expired
    if (session.expiresAt < now) {
      await this.terminateSession(sessionId);
      return null;
    }

    // Check idle timeout
    const idleTime = now.getTime() - session.lastActivityAt.getTime();
    if (idleTime > this.config.sessionIdleTimeout) {
      await this.terminateSession(sessionId, 'Session idle timeout');
      return null;
    }

    // Validate fingerprint if enabled
    if (this.config.enableFingerprinting) {
      const currentFingerprint = this.generateFingerprint(ipAddress, userAgent);
      if (session.metadata.fingerprint !== currentFingerprint) {
        await this.terminateSession(sessionId, 'Security fingerprint mismatch');
        return null;
      }
    }

    // Update last activity
    session.lastActivityAt = now;
    this.sessions.set(sessionId, session);

    return session;
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): Session | null {
    const session = this.sessions.get(sessionId);
    return session && session.isActive ? session : null;
  }

  /**
   * Get all active sessions for a user
   */
  getUserSessions(userId: string): Session[] {
    const sessionIds = this.userSessions.get(userId);
    if (!sessionIds) return [];

    return Array.from(sessionIds)
      .map((id) => this.sessions.get(id))
      .filter(
        (session): session is Session =>
          session !== undefined && session.isActive
      );
  }

  /**
   * Terminate a session
   */
  async terminateSession(sessionId: string, reason?: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // Mark as inactive
    session.isActive = false;
    session.metadata.terminationReason = reason;
    session.metadata.terminatedAt = new Date();

    this.sessions.set(sessionId, session);

    // Remove from user sessions
    const userSessions = this.userSessions.get(session.userId);
    if (userSessions) {
      userSessions.delete(sessionId);
    }
  }

  /**
   * Terminate all sessions for a user
   */
  async terminateUserSessions(userId: string, reason?: string): Promise<void> {
    const sessions = this.getUserSessions(userId);

    for (const session of sessions) {
      await this.terminateSession(session.id, reason);
    }
  }

  /**
   * Extend session expiration
   */
  extendSession(sessionId: string, duration?: number): boolean {
    const session = this.sessions.get(sessionId);
    if (!session || !session.isActive) return false;

    const extensionDuration = duration || this.config.sessionDuration;
    session.expiresAt = new Date(Date.now() + extensionDuration);
    session.lastActivityAt = new Date();

    this.sessions.set(sessionId, session);
    return true;
  }

  /**
   * Generate secure session ID
   */
  private generateSecureSessionId(): string {
    return `sess_${crypto.randomBytes(32).toString('base64url')}`;
  }

  /**
   * Generate device fingerprint
   */
  private generateFingerprint(ipAddress?: string, userAgent?: string): string {
    const data = `${ipAddress || 'unknown'}:${userAgent || 'unknown'}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Enforce session limit per user
   */
  private async enforceSessionLimit(userId: string): Promise<void> {
    const sessions = this.getUserSessions(userId);

    if (sessions.length >= this.config.maxConcurrentSessions) {
      // Remove oldest session
      const oldestSession = sessions.sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
      )[0];

      if (oldestSession) {
        await this.terminateSession(
          oldestSession.id,
          'Maximum concurrent sessions exceeded'
        );
      }
    }
  }

  /**
   * Clean up expired sessions
   */
  private cleanupExpiredSessions(): void {
    const now = new Date();

    for (const [sessionId, session] of this.sessions) {
      if (session.expiresAt < now || !session.isActive) {
        // Remove from maps
        this.sessions.delete(sessionId);

        const userSessions = this.userSessions.get(session.userId);
        if (userSessions) {
          userSessions.delete(sessionId);

          // Clean up empty user session sets
          if (userSessions.size === 0) {
            this.userSessions.delete(session.userId);
          }
        }
      }
    }
  }

  /**
   * Get session statistics
   */
  getSessionStats(): {
    totalSessions: number;
    activeSessions: number;
    uniqueUsers: number;
  } {
    const activeSessions = Array.from(this.sessions.values()).filter(
      (s) => s.isActive
    ).length;

    return {
      totalSessions: this.sessions.size,
      activeSessions,
      uniqueUsers: this.userSessions.size,
    };
  }
}
