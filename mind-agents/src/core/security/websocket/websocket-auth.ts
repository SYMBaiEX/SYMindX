/**
 * WebSocket Authentication and Security
 * Secure WebSocket connections with JWT authentication and message validation
 */

import { WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { URL } from 'url';
import { JWTManager } from '../auth/jwt-manager';
import { SessionManager } from '../auth/session-manager';
import { InputValidator } from '../middleware/input-validation';

export interface WebSocketSecurityConfig {
  requireAuth: boolean;
  allowedOrigins: string[];
  maxMessageSize: number;
  maxMessagesPerMinute: number;
  heartbeatInterval: number;
  connectionTimeout: number;
}

export interface SecureWebSocketConnection {
  ws: WebSocket;
  userId?: string;
  sessionId?: string;
  ipAddress: string;
  userAgent?: string;
  connectedAt: Date;
  lastActivity: Date;
  messageCount: number;
  authenticated: boolean;
}

export class WebSocketSecurity {
  private readonly config: WebSocketSecurityConfig;
  private readonly jwtManager: JWTManager;
  private readonly sessionManager: SessionManager;
  private readonly inputValidator: InputValidator;
  private readonly connections: Map<WebSocket, SecureWebSocketConnection> = new Map();
  private readonly rateLimiters: Map<string, { count: number; resetTime: number }> = new Map();

  constructor(
    jwtManager: JWTManager,
    sessionManager: SessionManager,
    config: Partial<WebSocketSecurityConfig> = {}
  ) {
    this.jwtManager = jwtManager;
    this.sessionManager = sessionManager;
    this.config = {
      requireAuth: config.requireAuth !== false,
      allowedOrigins: config.allowedOrigins || ['*'],
      maxMessageSize: config.maxMessageSize || 1024 * 1024, // 1MB
      maxMessagesPerMinute: config.maxMessagesPerMinute || 60,
      heartbeatInterval: config.heartbeatInterval || 30000, // 30 seconds
      connectionTimeout: config.connectionTimeout || 60000, // 1 minute
    };

    this.inputValidator = new InputValidator({
      maxStringLength: this.config.maxMessageSize,
      sanitizeHtml: true,
      preventSqlInjection: true
    });

    // Start cleanup intervals
    setInterval(() => this.cleanupConnections(), 60000); // Every minute
    setInterval(() => this.cleanupRateLimiters(), 300000); // Every 5 minutes
  }

  /**
   * Authenticate WebSocket connection
   */
  async authenticateConnection(
    ws: WebSocket,
    request: IncomingMessage
  ): Promise<boolean> {
    try {
      // Get client info
      const ipAddress = this.getClientIp(request);
      const userAgent = request.headers['user-agent'];
      const origin = request.headers.origin;

      // Validate origin
      if (!this.validateOrigin(origin)) {
        console.warn(`WebSocket connection rejected: invalid origin ${origin}`);
        return false;
      }

      // Check rate limiting
      if (!this.checkRateLimit(ipAddress)) {
        console.warn(`WebSocket connection rejected: rate limit exceeded for ${ipAddress}`);
        return false;
      }

      // Create connection record
      const connection: SecureWebSocketConnection = {
        ws,
        ipAddress,
        userAgent,
        connectedAt: new Date(),
        lastActivity: new Date(),
        messageCount: 0,
        authenticated: !this.config.requireAuth // Default to true if auth not required
      };

      // Authenticate if required
      if (this.config.requireAuth) {
        const authenticated = await this.performAuthentication(request, connection);
        connection.authenticated = authenticated;
        
        if (!authenticated) {
          console.warn(`WebSocket authentication failed for ${ipAddress}`);
          return false;
        }
      }

      // Store connection
      this.connections.set(ws, connection);

      // Set up connection handlers
      this.setupConnectionHandlers(ws, connection);

      console.log(`WebSocket connection established: ${ipAddress} (auth: ${connection.authenticated})`);
      return true;

    } catch (error) {
      console.error('WebSocket authentication error:', error);
      return false;
    }
  }

  /**
   * Validate incoming WebSocket message
   */
  async validateMessage(ws: WebSocket, data: any): Promise<boolean> {
    const connection = this.connections.get(ws);
    if (!connection) {
      return false;
    }

    try {
      // Check authentication
      if (this.config.requireAuth && !connection.authenticated) {
        await this.sendError(ws, 'Authentication required', 'AUTH_REQUIRED');
        return false;
      }

      // Check message size
      const messageSize = Buffer.byteLength(JSON.stringify(data));
      if (messageSize > this.config.maxMessageSize) {
        await this.sendError(ws, 'Message too large', 'MESSAGE_TOO_LARGE');
        return false;
      }

      // Check rate limiting
      if (!this.checkMessageRateLimit(connection)) {
        await this.sendError(ws, 'Rate limit exceeded', 'RATE_LIMIT_EXCEEDED');
        return false;
      }

      // Validate and sanitize message content
      try {
        // This would involve validating the message structure
        // For now, we'll do basic sanitization
        if (typeof data === 'object' && data !== null) {
          this.sanitizeObject(data);
        }
      } catch (validationError) {
        await this.sendError(ws, 'Invalid message format', 'VALIDATION_ERROR');
        return false;
      }

      // Update activity
      connection.lastActivity = new Date();
      connection.messageCount++;

      return true;

    } catch (error) {
      console.error('Message validation error:', error);
      await this.sendError(ws, 'Internal error', 'INTERNAL_ERROR');
      return false;
    }
  }

  /**
   * Get connection info for WebSocket
   */
  getConnection(ws: WebSocket): SecureWebSocketConnection | undefined {
    return this.connections.get(ws);
  }

  /**
   * Close and cleanup connection
   */
  closeConnection(ws: WebSocket, reason?: string): void {
    const connection = this.connections.get(ws);
    if (connection) {
      console.log(`Closing WebSocket connection: ${connection.ipAddress} (reason: ${reason || 'unknown'})`);
      this.connections.delete(ws);
    }

    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
      ws.close();
    }
  }

  /**
   * Get connection statistics
   */
  getConnectionStats(): {
    totalConnections: number;
    authenticatedConnections: number;
    connectionsByIp: Record<string, number>;
  } {
    const stats = {
      totalConnections: this.connections.size,
      authenticatedConnections: 0,
      connectionsByIp: {} as Record<string, number>
    };

    for (const connection of this.connections.values()) {
      if (connection.authenticated) {
        stats.authenticatedConnections++;
      }

      stats.connectionsByIp[connection.ipAddress] = 
        (stats.connectionsByIp[connection.ipAddress] || 0) + 1;
    }

    return stats;
  }

  /**
   * Perform WebSocket authentication
   */
  private async performAuthentication(
    request: IncomingMessage,
    connection: SecureWebSocketConnection
  ): Promise<boolean> {
    try {
      // Try to get token from query parameters or headers
      const url = new URL(request.url || '', 'http://localhost');
      const token = url.searchParams.get('token') || 
                   request.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return false;
      }

      // Verify JWT token
      const payload = await this.jwtManager.verifyToken(token, 'access');
      
      // Validate session if session ID is available
      if (payload.jti) {
        const session = await this.sessionManager.validateSession(
          payload.jti,
          connection.ipAddress,
          connection.userAgent
        );

        if (!session) {
          return false;
        }

        connection.sessionId = session.id;
      }

      connection.userId = payload.sub;
      return true;

    } catch (error) {
      console.warn('WebSocket authentication failed:', error);
      return false;
    }
  }

  /**
   * Setup connection event handlers
   */
  private setupConnectionHandlers(ws: WebSocket, connection: SecureWebSocketConnection): void {
    // Heartbeat
    const heartbeatInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      } else {
        clearInterval(heartbeatInterval);
      }
    }, this.config.heartbeatInterval);

    // Connection timeout
    const timeoutHandle = setTimeout(() => {
      if (ws.readyState === WebSocket.OPEN) {
        this.closeConnection(ws, 'Connection timeout');
      }
    }, this.config.connectionTimeout);

    // Handle pong responses
    ws.on('pong', () => {
      connection.lastActivity = new Date();
    });

    // Clear timeout and interval on close
    ws.on('close', () => {
      clearTimeout(timeoutHandle);
      clearInterval(heartbeatInterval);
      this.connections.delete(ws);
    });
  }

  /**
   * Validate origin header
   */
  private validateOrigin(origin?: string): boolean {
    if (this.config.allowedOrigins.includes('*')) {
      return true;
    }

    if (!origin) {
      return false;
    }

    return this.config.allowedOrigins.includes(origin);
  }

  /**
   * Check connection rate limit
   */
  private checkRateLimit(ipAddress: string): boolean {
    const now = Date.now();
    const key = `conn:${ipAddress}`;
    const limiter = this.rateLimiters.get(key);

    if (!limiter || now > limiter.resetTime) {
      this.rateLimiters.set(key, { count: 1, resetTime: now + 60000 });
      return true;
    }

    if (limiter.count >= 10) { // Max 10 connections per minute
      return false;
    }

    limiter.count++;
    return true;
  }

  /**
   * Check message rate limit
   */
  private checkMessageRateLimit(connection: SecureWebSocketConnection): boolean {
    const now = Date.now();
    const windowStart = now - 60000; // 1 minute window

    // This is simplified - in production, you'd want more sophisticated rate limiting
    if (connection.messageCount > this.config.maxMessagesPerMinute) {
      return false;
    }

    return true;
  }

  /**
   * Get client IP address
   */
  private getClientIp(request: IncomingMessage): string {
    const forwarded = request.headers['x-forwarded-for'];
    if (forwarded) {
      return Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
    }

    const realIp = request.headers['x-real-ip'];
    if (realIp) {
      return Array.isArray(realIp) ? realIp[0] : realIp;
    }

    return request.socket.remoteAddress || 'unknown';
  }

  /**
   * Send error message to WebSocket
   */
  private async sendError(ws: WebSocket, message: string, code: string): Promise<void> {
    if (ws.readyState === WebSocket.OPEN) {
      const errorResponse = {
        type: 'error',
        error: {
          message,
          code,
          timestamp: new Date().toISOString()
        }
      };

      ws.send(JSON.stringify(errorResponse));
    }
  }

  /**
   * Sanitize object recursively
   */
  private sanitizeObject(obj: any): void {
    if (typeof obj !== 'object' || obj === null) {
      return;
    }

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        obj[key] = this.sanitizeString(value);
      } else if (typeof value === 'object' && value !== null) {
        this.sanitizeObject(value);
      }
    }
  }

  /**
   * Sanitize string value
   */
  private sanitizeString(str: string): string {
    // Remove null bytes
    str = str.replace(/\0/g, '');
    
    // Basic XSS prevention
    str = str.replace(/[<>]/g, (match) => {
      return match === '<' ? '&lt;' : '&gt;';
    });

    return str.trim();
  }

  /**
   * Cleanup inactive connections
   */
  private cleanupConnections(): void {
    const now = new Date();
    const timeout = 5 * 60 * 1000; // 5 minutes

    for (const [ws, connection] of this.connections) {
      const inactive = now.getTime() - connection.lastActivity.getTime() > timeout;
      
      if (inactive || ws.readyState === WebSocket.CLOSED) {
        this.closeConnection(ws, 'Inactive or closed connection');
      }
    }
  }

  /**
   * Cleanup rate limiters
   */
  private cleanupRateLimiters(): void {
    const now = Date.now();
    
    for (const [key, limiter] of this.rateLimiters) {
      if (now > limiter.resetTime) {
        this.rateLimiters.delete(key);
      }
    }
  }
}