/**
 * Enhanced WebSocket Server Skill
 *
 * Provides comprehensive real-time WebSocket functionality:
 * - Connection management
 * - Message broadcasting
 * - Agent communication
 * - Live monitoring
 * - Command execution
 * - Status streaming
 */

import type { IncomingMessage } from 'http';
import { createServer } from 'http';
import { parse } from 'url';

import { WebSocket, WebSocketServer } from 'ws';

// CommandSystem types are available from the extension
import {
  ExtensionAction,
  Agent,
  ActionResult,
  ActionResultType,
  ActionCategory,
  AgentEvent,
} from '../../../types/agent';
import { runtimeLogger } from '../../../utils/logger';
import { WebSocketMessage, ConnectionInfo } from '../types';

export interface WebSocketConnection {
  id: string;
  ws: WebSocket;
  clientInfo: {
    userAgent?: string;
    ip: string;
    connectedAt: Date;
    lastActivity: Date;
  };
  subscriptions: Set<string>;
  metadata: Record<string, any>;
}

export interface WebSocketConfig {
  port?: number;
  path?: string;
  heartbeatInterval?: number;
  maxConnections?: number;
}

export class WebSocketServerSkill {
  private extension: any;
  private server: WebSocketServer | null = null;
  private connections = new Map<string, WebSocketConnection>();
  private config: WebSocketConfig;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(extension: any, config: WebSocketConfig = {}) {
    this.extension = extension;
    this.config = {
      port: 3001,
      path: '/ws',
      heartbeatInterval: 30000,
      maxConnections: 100,
      ...config,
    };
  }

  /**
   * Get all WebSocket-related actions
   */
  getActions(): Record<string, ExtensionAction> {
    return {
      broadcast_message: {
        name: 'broadcast_message',
        description: 'Broadcast a message to all connected WebSocket clients',
        category: ActionCategory.COMMUNICATION,
        parameters: { message: 'string', type: 'string', data: 'object' },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.broadcastMessage(agent, params);
        },
      },
      send_to_connection: {
        name: 'send_to_connection',
        description: 'Send a message to a specific WebSocket connection',
        category: ActionCategory.COMMUNICATION,
        parameters: {
          connectionId: 'string',
          message: 'string',
          type: 'string',
          data: 'object',
        },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.sendToConnection(agent, params);
        },
      },
      get_connections: {
        name: 'get_connections',
        description: 'Get information about active WebSocket connections',
        category: ActionCategory.SYSTEM,
        parameters: {},
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.getConnections(agent, params);
        },
      },
    };
  }

  /**
   * Initialize the WebSocket server
   */
  async initialize(httpServer?: any): Promise<void> {
    try {
      const serverOptions: any = {
        path: this.config.path,
        perMessageDeflate: false, // Disable compression completely
        backlog: 511, // Increase connection backlog
        maxPayload: 100 * 1024 * 1024, // 100MB max payload
        skipUTF8Validation: false, // Maintain UTF8 validation for security
      };

      if (httpServer) {
        serverOptions.server = httpServer;
      } else {
        // Create standalone HTTP server if none provided
        const standaloneServer = createServer();
        serverOptions.server = standaloneServer;
        standaloneServer.listen(this.config.port, () => {
          runtimeLogger.extension(
            `🌐 HTTP server for WebSocket listening on port ${this.config.port}`
          );
        });
      }

      this.server = new WebSocketServer(serverOptions);

      this.server.on('connection', (ws: WebSocket, req: IncomingMessage) => {
        this.handleConnection(ws, req);
      });

      this.server.on('error', (error) => {
        runtimeLogger.error('❌ WebSocket server error:', error);
      });

      // Start heartbeat
      this.startHeartbeat();

      runtimeLogger.extension(
        `🔌 WebSocket server initialized on ${this.config.path}`
      );
    } catch (error) {
      runtimeLogger.error('❌ Failed to initialize WebSocket server:', error);
      throw error;
    }
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(ws: WebSocket, req: IncomingMessage): void {
    const connectionId = this.generateConnectionId();
    const ip = req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'];

    // Parse URL for additional connection metadata
    const urlInfo = parse(req.url || '', true);
    const query = urlInfo.query;

    // Log connection details including parsed URL parameters
    runtimeLogger.extension(
      `🔗 New WebSocket connection attempt from ${ip}${urlInfo.pathname ? ` (${urlInfo.pathname})` : ''}`
    );

    // Check connection limit
    if (this.connections.size >= this.config.maxConnections!) {
      runtimeLogger.warn(
        `⚠️ WebSocket connection limit reached, rejecting connection from ${ip}`
      );
      ws.close(1013, 'Service overloaded');
      return;
    }

    const connection: WebSocketConnection = {
      id: connectionId,
      ws,
      clientInfo: {
        ip,
        connectedAt: new Date(),
        lastActivity: new Date(),
      },
      subscriptions: new Set(),
      metadata: {
        // Store URL query parameters in metadata
        urlQuery: query,
        requestPath: urlInfo.pathname,
      },
    };

    if (userAgent) {
      connection.clientInfo.userAgent = userAgent;
    }

    // Force disable any compression extensions that might have been negotiated
    if ((ws as any).extensions) {
      Object.keys((ws as any).extensions).forEach((key: string) => {
        if (key.includes('deflate') || key.includes('compress')) {
          delete (ws as any).extensions[key];
        }
      });
    }

    this.connections.set(connectionId, connection);
    runtimeLogger.extension(
      `🔌 WebSocket client connected: ${connectionId} from ${ip}`
    );

    // Send welcome message
    this.sendToWebSocket(ws, {
      type: 'connection_established',
      connectionId,
      timestamp: new Date().toISOString(),
    });

    // Set up message handling
    ws.on('message', (data: Buffer) => {
      this.handleMessage(connection, data);
    });

    ws.on('close', (code: number, reason: Buffer) => {
      this.handleDisconnection(connection, code, reason);
    });

    ws.on('error', (error: Error) => {
      runtimeLogger.error(
        `❌ WebSocket connection error for ${connectionId}:`,
        error
      );
    });

    ws.on('pong', () => {
      connection.clientInfo.lastActivity = new Date();
    });
  }

  /**
   * Handle incoming WebSocket message
   */
  private async handleMessage(
    connection: WebSocketConnection,
    data: Buffer
  ): Promise<void> {
    try {
      connection.clientInfo.lastActivity = new Date();

      const message = JSON.parse(data.toString()) as WebSocketMessage;
      runtimeLogger.extension(
        `📨 WebSocket message from ${connection.id}: ${message.type}`
      );

      switch (message.type) {
        case 'subscribe':
          this.handleSubscription(connection, message);
          break;
        case 'unsubscribe':
          this.handleUnsubscription(connection, message);
          break;
        case 'chat_message':
          await this.handleChatMessage(connection, message);
          break;
        case 'command':
          await this.handleCommand(connection, message);
          break;
        case 'ping':
          this.sendToWebSocket(connection.ws, {
            type: 'pong',
            timestamp: new Date().toISOString(),
          });
          break;
        default:
          runtimeLogger.warn(
            `⚠️ Unknown WebSocket message type: ${message.type}`
          );
          this.sendToWebSocket(connection.ws, {
            type: 'error',
            error: `Unknown message type: ${message.type}`,
          });
      }
    } catch (error) {
      runtimeLogger.error(`❌ Error handling WebSocket message:`, error);
      this.sendToWebSocket(connection.ws, {
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Handle subscription requests
   */
  private handleSubscription(
    connection: WebSocketConnection,
    message: WebSocketMessage
  ): void {
    const { channel } = message.data || {};
    if (channel) {
      connection.subscriptions.add(channel);
      this.sendToWebSocket(connection.ws, {
        type: 'subscribed',
        channel,
        timestamp: new Date().toISOString(),
      });
      runtimeLogger.extension(
        `📡 Client ${connection.id} subscribed to ${channel}`
      );
    }
  }

  /**
   * Handle unsubscription requests
   */
  private handleUnsubscription(
    connection: WebSocketConnection,
    message: WebSocketMessage
  ): void {
    const { channel } = message.data || {};
    if (channel) {
      connection.subscriptions.delete(channel);
      this.sendToWebSocket(connection.ws, {
        type: 'unsubscribed',
        channel,
        timestamp: new Date().toISOString(),
      });
      runtimeLogger.extension(
        `📡 Client ${connection.id} unsubscribed from ${channel}`
      );
    }
  }

  /**
   * Handle chat messages
   */
  private async handleChatMessage(
    connection: WebSocketConnection,
    message: WebSocketMessage
  ): Promise<void> {
    const { agentId, data } = message;

    try {
      // Use the chat skill to handle the message
      const chatSkill = this.extension.skills?.chat;
      if (chatSkill) {
        const response = await chatSkill.sendMessage({ id: agentId } as Agent, {
          agentId,
          message: data.message,
          conversationId: data.conversationId,
        });

        this.sendToWebSocket(connection.ws, {
          type: 'chat_response',
          agentId,
          data: response,
        });
      } else {
        throw new Error('Chat skill not available');
      }
    } catch (error) {
      this.sendToWebSocket(connection.ws, {
        type: 'error',
        error:
          error instanceof Error
            ? error.message
            : 'Failed to process chat message',
      });
    }
  }

  /**
   * Handle command execution
   */
  private async handleCommand(
    connection: WebSocketConnection,
    message: WebSocketMessage
  ): Promise<void> {
    const { agentId, data } = message;

    try {
      // Execute command through the extension's command system
      const result = await this.extension.executeCommand(
        agentId,
        data.command,
        data.parameters
      );

      this.sendToWebSocket(connection.ws, {
        type: 'command_result',
        agentId,
        data: result,
      });
    } catch (error) {
      this.sendToWebSocket(connection.ws, {
        type: 'error',
        error:
          error instanceof Error ? error.message : 'Failed to execute command',
      });
    }
  }

  /**
   * Handle client disconnection
   */
  private handleDisconnection(
    connection: WebSocketConnection,
    code: number,
    reason: Buffer
  ): void {
    this.connections.delete(connection.id);
    const reasonStr = reason.toString() || 'No reason provided';
    runtimeLogger.extension(
      `🔌 WebSocket client disconnected: ${connection.id} (code: ${code}, reason: ${reasonStr})`
    );

    // Log disconnect details for debugging
    if (code !== 1000 && code !== 1001) {
      // Not normal closure
      runtimeLogger.extension(`⚠️ Abnormal WebSocket closure: ${reasonStr}`);
    }
  }

  /**
   * Broadcast message to all connections
   */
  async broadcastMessage(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { message, type, data } = params;

      const wsMessage = {
        type: type || 'broadcast',
        message,
        data,
        timestamp: new Date().toISOString(),
        from: agent.id,
      };

      let sentCount = 0;
      for (const connection of this.connections.values()) {
        try {
          this.sendToWebSocket(connection.ws, wsMessage);
          sentCount++;
        } catch (error) {
          runtimeLogger.warn(
            `⚠️ Failed to send message to ${connection.id}:`,
            error
          );
        }
      }

      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: { sentTo: sentCount, totalConnections: this.connections.size },
      };
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.ERROR,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send message to specific connection
   */
  async sendToConnection(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { connectionId, message, type, data } = params;

      const connection = this.connections.get(connectionId);
      if (!connection) {
        return {
          success: false,
          type: ActionResultType.ERROR,
          error: `Connection ${connectionId} not found`,
        };
      }

      const wsMessage = {
        type: type || 'direct_message',
        message,
        data,
        timestamp: new Date().toISOString(),
        from: agent.id,
      };

      this.sendToWebSocket(connection.ws, wsMessage);

      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: { sentTo: connectionId },
      };
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.ERROR,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get connection information
   */
  async getConnections(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { includeMetadata = false, filterByAgent = false } = params || {};

      // Log request details
      runtimeLogger.extension(
        `📊 Getting WebSocket connections for agent: ${agent.name} (filter: ${filterByAgent})`
      );

      let connectionsToProcess = Array.from(this.connections.values());

      // Filter by agent if requested
      if (filterByAgent) {
        connectionsToProcess = connectionsToProcess.filter(
          (conn) => conn.metadata?.agentId === agent.id
        );
      }

      const connectionInfo: ConnectionInfo[] = connectionsToProcess.map(
        (conn) => {
          const info: ConnectionInfo = {
            id: conn.id,
            readyState: conn.ws.readyState,
            ip: conn.clientInfo.ip,
            connectedAt: conn.clientInfo.connectedAt,
            lastActivity: conn.clientInfo.lastActivity,
            subscriptions: Array.from(conn.subscriptions),
            metadata: includeMetadata ? conn.metadata : {}, // Always include metadata field, but only populate if requested
          };

          if (conn.clientInfo.userAgent) {
            info.userAgent = conn.clientInfo.userAgent;
          }

          return info;
        }
      );

      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          totalConnections: this.connections.size,
          connections: connectionInfo.map(
            (info) =>
              ({
                id: info.id,
                readyState: info.readyState,
                ip: info.ip,
                userAgent: info.userAgent,
                connectedAt: info.connectedAt.toISOString(),
                lastActivity: info.lastActivity.toISOString(),
                subscriptions: info.subscriptions,
                metadata: info.metadata,
              }) as Record<string, any>
          ),
        },
      };
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.ERROR,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Broadcast agent event to subscribed clients
   */
  broadcastAgentEvent(event: AgentEvent): void {
    const message = {
      type: 'agent_event',
      data: event,
      timestamp: new Date().toISOString(),
    };

    for (const connection of this.connections.values()) {
      if (
        connection.subscriptions.has('agent_events') ||
        connection.subscriptions.has(`agent:${event.agentId}`)
      ) {
        try {
          this.sendToWebSocket(connection.ws, message);
        } catch (error) {
          runtimeLogger.warn(
            `⚠️ Failed to send agent event to ${connection.id}:`,
            error
          );
        }
      }
    }
  }

  /**
   * Send message to WebSocket
   */
  private sendToWebSocket(ws: WebSocket, message: any): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Start heartbeat to keep connections alive
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      for (const [id, connection] of this.connections.entries()) {
        if (connection.ws.readyState === WebSocket.OPEN) {
          // Check if client is still responsive
          const timeSinceActivity =
            Date.now() - connection.clientInfo.lastActivity.getTime();
          if (timeSinceActivity > this.config.heartbeatInterval! * 2) {
            runtimeLogger.warn(
              `⚠️ Closing inactive WebSocket connection: ${id}`
            );
            connection.ws.terminate();
            this.connections.delete(id);
          } else {
            // Send ping
            connection.ws.ping();
          }
        } else {
          this.connections.delete(id);
        }
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Generate unique connection ID
   */
  private generateConnectionId(): string {
    return `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Stop the WebSocket server
   */
  async stop(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    for (const connection of this.connections.values()) {
      connection.ws.close(1001, 'Server shutting down');
    }
    this.connections.clear();

    if (this.server) {
      return new Promise((resolve) => {
        this.server!.close(() => {
          runtimeLogger.extension('🛑 WebSocket server stopped');
          resolve();
        });
      });
    }
  }
}
