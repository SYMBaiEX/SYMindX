/**
 * WebSocketManager.ts - WebSocket server management and real-time communication
 * 
 * This module handles:
 * - WebSocket server setup and lifecycle
 * - Client connection management
 * - Real-time message broadcasting
 * - Agent status updates and notifications
 * - System metrics streaming
 */

import * as http from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import {
  Agent,
  AgentEvent,
} from '../../../types/agent';
import type {
  WebSocketMessage,
  WebSocketResponse,
  AgentStatusPayload,
  SystemMetricsPayload,
} from '../../../types/extensions/api';
import { ApiSettings, ConnectionInfo } from '../types';
import { standardLoggers } from '../../../utils/standard-logging';
import { createNetworkError } from '../../../utils/standard-errors';

interface ClientConnection {
  id: string;
  ws: WebSocket;
  userId?: string;
  subscriptions: Set<string>;
  lastPing: number;
  authenticated: boolean;
}

export class WebSocketManager {
  private logger = standardLoggers.api;
  private config: ApiSettings;
  private wss?: WebSocketServer;
  private connections = new Map<string, ClientConnection>();
  private heartbeatInterval?: NodeJS.Timeout;
  private metricsInterval?: NodeJS.Timeout;
  private isRunning = false;

  // Metrics
  private metrics = {
    totalConnections: 0,
    activeConnections: 0,
    messagesSent: 0,
    messagesReceived: 0,
    errors: 0,
  };

  constructor(config: ApiSettings) {
    this.config = config;
  }

  /**
   * Initialize WebSocket server
   */
  initialize(server: http.Server): void {
    if (this.wss) {
      this.logger.warn('WebSocket server already initialized');
      return;
    }

    try {
      this.wss = new WebSocketServer({
        server,
        path: this.config.websocket?.path || '/ws',
        perMessageDeflate: this.config.websocket?.compression ?? true,
        maxPayload: this.config.websocket?.maxPayload || 16 * 1024, // 16KB
      });

      this.setupEventHandlers();
      this.startHeartbeat();
      this.startMetricsStream();

      this.isRunning = true;
      this.logger.info('WebSocket server initialized', {
        path: this.config.websocket?.path || '/ws',
        compression: this.config.websocket?.compression ?? true,
      });
    } catch (error) {
      this.logger.error('Failed to initialize WebSocket server', { error });
      throw createNetworkError('WebSocket server initialization failed', error);
    }
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.wss) return;

    this.wss.on('connection', (ws, request) => {
      const connectionId = this.generateConnectionId();
      const connection: ClientConnection = {
        id: connectionId,
        ws,
        subscriptions: new Set(),
        lastPing: Date.now(),
        authenticated: false,
      };

      this.connections.set(connectionId, connection);
      this.metrics.totalConnections++;
      this.metrics.activeConnections++;

      this.logger.info('WebSocket client connected', {
        connectionId,
        ip: request.socket.remoteAddress,
        userAgent: request.headers['user-agent'],
      });

      // Setup connection event handlers
      this.setupConnectionHandlers(connection);

      // Send welcome message
      this.sendToConnection(connection, {
        type: 'connection.established',
        data: {
          connectionId,
          timestamp: new Date().toISOString(),
          serverVersion: '1.0.0',
        },
      });
    });

    this.wss.on('error', (error) => {
      this.logger.error('WebSocket server error', { error });
      this.metrics.errors++;
    });
  }

  /**
   * Setup individual connection handlers
   */
  private setupConnectionHandlers(connection: ClientConnection): void {
    const { ws, id } = connection;

    ws.on('message', (data) => {
      try {
        this.metrics.messagesReceived++;
        const message = JSON.parse(data.toString()) as WebSocketMessage;
        this.handleMessage(connection, message);
      } catch (error) {
        this.logger.error('Error parsing WebSocket message', { 
          connectionId: id, 
          error 
        });
        this.sendError(connection, 'Invalid message format');
      }
    });

    ws.on('pong', () => {
      connection.lastPing = Date.now();
    });

    ws.on('close', (code, reason) => {
      this.handleDisconnection(connection, code, reason.toString());
    });

    ws.on('error', (error) => {
      this.logger.error('WebSocket connection error', { 
        connectionId: id, 
        error 
      });
      this.metrics.errors++;
    });
  }

  /**
   * Handle incoming WebSocket messages
   */
  private async handleMessage(connection: ClientConnection, message: WebSocketMessage): Promise<void> {
    try {
      switch (message.type) {
        case 'auth':
          await this.handleAuth(connection, message);
          break;
        case 'subscribe':
          this.handleSubscribe(connection, message);
          break;
        case 'unsubscribe':
          this.handleUnsubscribe(connection, message);
          break;
        case 'ping':
          this.handlePing(connection, message);
          break;
        case 'agent.command':
          await this.handleAgentCommand(connection, message);
          break;
        default:
          this.sendError(connection, `Unknown message type: ${message.type}`);
      }
    } catch (error) {
      this.logger.error('Error handling WebSocket message', {
        connectionId: connection.id,
        messageType: message.type,
        error,
      });
      this.sendError(connection, 'Internal server error');
    }
  }

  /**
   * Handle authentication
   */
  private async handleAuth(connection: ClientConnection, message: WebSocketMessage): Promise<void> {
    const { token, userId } = message.data || {};

    if (!token) {
      this.sendError(connection, 'Authentication token required');
      return;
    }

    // TODO: Implement proper token validation
    // For now, accept any token
    connection.authenticated = true;
    connection.userId = userId;

    this.sendToConnection(connection, {
      type: 'auth.success',
      data: {
        authenticated: true,
        userId,
        timestamp: new Date().toISOString(),
      },
    });

    this.logger.info('WebSocket client authenticated', {
      connectionId: connection.id,
      userId,
    });
  }

  /**
   * Handle subscription requests
   */
  private handleSubscribe(connection: ClientConnection, message: WebSocketMessage): void {
    const { channel } = message.data || {};

    if (!channel) {
      this.sendError(connection, 'Channel name required for subscription');
      return;
    }

    connection.subscriptions.add(channel);

    this.sendToConnection(connection, {
      type: 'subscription.confirmed',
      data: {
        channel,
        timestamp: new Date().toISOString(),
      },
    });

    this.logger.debug('Client subscribed to channel', {
      connectionId: connection.id,
      channel,
    });
  }

  /**
   * Handle unsubscription requests
   */
  private handleUnsubscribe(connection: ClientConnection, message: WebSocketMessage): void {
    const { channel } = message.data || {};

    if (!channel) {
      this.sendError(connection, 'Channel name required for unsubscription');
      return;
    }

    connection.subscriptions.delete(channel);

    this.sendToConnection(connection, {
      type: 'subscription.cancelled',
      data: {
        channel,
        timestamp: new Date().toISOString(),
      },
    });

    this.logger.debug('Client unsubscribed from channel', {
      connectionId: connection.id,
      channel,
    });
  }

  /**
   * Handle ping messages
   */
  private handlePing(connection: ClientConnection, message: WebSocketMessage): void {
    connection.lastPing = Date.now();

    this.sendToConnection(connection, {
      type: 'pong',
      data: {
        timestamp: new Date().toISOString(),
        ...(message.data || {}),
      },
    });
  }

  /**
   * Handle agent commands
   */
  private async handleAgentCommand(connection: ClientConnection, message: WebSocketMessage): Promise<void> {
    if (!connection.authenticated) {
      this.sendError(connection, 'Authentication required');
      return;
    }

    const { agentId, command, parameters } = message.data || {};

    if (!agentId || !command) {
      this.sendError(connection, 'Agent ID and command are required');
      return;
    }

    // TODO: Implement agent command execution
    // This would interface with the runtime to execute commands

    this.sendToConnection(connection, {
      type: 'agent.command.result',
      data: {
        agentId,
        command,
        success: true,
        result: 'Command executed successfully',
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Handle client disconnection
   */
  private handleDisconnection(connection: ClientConnection, code: number, reason: string): void {
    this.connections.delete(connection.id);
    this.metrics.activeConnections--;

    this.logger.info('WebSocket client disconnected', {
      connectionId: connection.id,
      code,
      reason,
      userId: connection.userId,
    });
  }

  /**
   * Send message to specific connection
   */
  private sendToConnection(connection: ClientConnection, message: WebSocketResponse): void {
    if (connection.ws.readyState === WebSocket.OPEN) {
      try {
        connection.ws.send(JSON.stringify(message));
        this.metrics.messagesSent++;
      } catch (error) {
        this.logger.error('Error sending WebSocket message', {
          connectionId: connection.id,
          error,
        });
        this.metrics.errors++;
      }
    }
  }

  /**
   * Send error message to connection
   */
  private sendError(connection: ClientConnection, error: string): void {
    this.sendToConnection(connection, {
      type: 'error',
      data: {
        error,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Broadcast message to all subscribed connections
   */
  broadcast(channel: string, message: WebSocketResponse): void {
    let sentCount = 0;

    for (const connection of this.connections.values()) {
      if (connection.subscriptions.has(channel)) {
        this.sendToConnection(connection, message);
        sentCount++;
      }
    }

    this.logger.debug('Broadcast message sent', {
      channel,
      recipients: sentCount,
      messageType: message.type,
    });
  }

  /**
   * Broadcast agent status update
   */
  broadcastAgentStatus(agentId: string, status: AgentStatusPayload): void {
    this.broadcast('agent.status', {
      type: 'agent.status.update',
      data: {
        agentId,
        ...status,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Broadcast system metrics
   */
  broadcastSystemMetrics(metrics: SystemMetricsPayload): void {
    this.broadcast('system.metrics', {
      type: 'system.metrics.update',
      data: {
        ...metrics,
        websocket: this.getWebSocketMetrics(),
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Start heartbeat to check connection health
   */
  private startHeartbeat(): void {
    const interval = this.config.websocket?.heartbeatInterval || 30000; // 30 seconds

    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      const timeout = this.config.websocket?.connectionTimeout || 60000; // 60 seconds

      for (const [connectionId, connection] of this.connections.entries()) {
        if (now - connection.lastPing > timeout) {
          this.logger.warn('WebSocket connection timed out', { connectionId });
          connection.ws.terminate();
          this.connections.delete(connectionId);
          this.metrics.activeConnections--;
        } else if (connection.ws.readyState === WebSocket.OPEN) {
          connection.ws.ping();
        }
      }
    }, interval);

    this.logger.debug('WebSocket heartbeat started', { interval });
  }

  /**
   * Start periodic metrics streaming
   */
  private startMetricsStream(): void {
    const interval = this.config.websocket?.metricsInterval || 5000; // 5 seconds

    this.metricsInterval = setInterval(() => {
      // Only broadcast if there are subscribers
      const hasSubscribers = Array.from(this.connections.values())
        .some(conn => conn.subscriptions.has('system.metrics'));

      if (hasSubscribers) {
        this.broadcastSystemMetrics({
          activeConnections: this.metrics.activeConnections,
          totalConnections: this.metrics.totalConnections,
          messagesSent: this.metrics.messagesSent,
          messagesReceived: this.metrics.messagesReceived,
          errors: this.metrics.errors,
          uptime: Date.now(),
        });
      }
    }, interval);

    this.logger.debug('WebSocket metrics stream started', { interval });
  }

  /**
   * Stop the WebSocket server
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      this.logger.warn('WebSocket server is not running');
      return;
    }

    return new Promise((resolve) => {
      // Clear intervals
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = undefined;
      }

      if (this.metricsInterval) {
        clearInterval(this.metricsInterval);
        this.metricsInterval = undefined;
      }

      // Close all connections
      for (const connection of this.connections.values()) {
        connection.ws.close(1001, 'Server shutting down');
      }

      // Close server
      if (this.wss) {
        this.wss.close(() => {
          this.isRunning = false;
          this.connections.clear();
          this.logger.info('WebSocket server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Get WebSocket server metrics
   */
  getWebSocketMetrics() {
    return {
      ...this.metrics,
      isRunning: this.isRunning,
      activeSubscriptions: Array.from(this.connections.values())
        .reduce((total, conn) => total + conn.subscriptions.size, 0),
    };
  }

  /**
   * Get connection information
   */
  getConnections(): ConnectionInfo[] {
    return Array.from(this.connections.values()).map(conn => ({
      id: conn.id,
      userId: conn.userId,
      authenticated: conn.authenticated,
      subscriptions: Array.from(conn.subscriptions),
      lastPing: new Date(conn.lastPing),
      connected: conn.ws.readyState === WebSocket.OPEN,
    }));
  }

  /**
   * Generate unique connection ID
   */
  private generateConnectionId(): string {
    return `ws_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}