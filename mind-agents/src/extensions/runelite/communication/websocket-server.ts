import { EventEmitter } from 'events';
import { WebSocketServer, WebSocket } from 'ws';
import { runtimeLogger } from '../../../utils/logger.js';
import {
  WebSocketMessage,
  EventBatch,
  ProtocolCapabilities,
  RuneLiteErrorType,
  EventPriority,
} from '../types.js';
import {
  WebSocketServerConfig,
  ClientInfo,
  WebSocketRequest,
  AcknowledgmentInfo,
  ConnectionMessage,
  HeartbeatMessage,
  ErrorMessage,
} from './types.js';

export class RuneLiteWebSocketServer extends EventEmitter {
  private wss?: WebSocketServer;
  private clients = new Map<string, ClientInfo>();
  private config: WebSocketServerConfig;
  private heartbeatInterval?: NodeJS.Timeout;
  private acknowledgments = new Map<string, AcknowledgmentInfo>();

  constructor(config: WebSocketServerConfig) {
    super();
    this.config = {
      port: 8080,
      host: 'localhost',
      maxConnections: 10,
      heartbeatInterval: 30000,
      commandTimeout: 10000,
      enableCompression: true,
      enableBatching: true,
      ...config,
    };
  }

  async start(): Promise<void> {
    try {
      this.wss = new WebSocketServer({
        port: this.config.port,
        host: this.config.host,
      });

      this.setupEventHandlers();
      this.startHeartbeat();
      this.startHealthCheck();

      runtimeLogger.info(`🌐 RuneLite WebSocket server started on ${this.config.host}:${this.config.port}`);
    } catch (error) {
      runtimeLogger.error('Failed to start WebSocket server:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Close all client connections
    for (const [clientId, client] of this.clients) {
      this.disconnectClient(clientId, 'Server shutdown');
    }

    if (this.wss) {
      this.wss.close();
      runtimeLogger.info('🔌 RuneLite WebSocket server stopped');
    }
  }

  private setupEventHandlers(): void {
    if (!this.wss) return;

    this.wss.on('connection', (ws: WebSocket, request: WebSocketRequest) => {
      this.handleNewConnection(ws, request);
    });

    this.wss.on('error', (error: Error) => {
      runtimeLogger.error('WebSocket server error:', error);
      this.emit('error', error);
    });
  }

  private handleNewConnection(ws: WebSocket, request: WebSocketRequest): void {
    const clientId = this.generateClientId();
    const clientInfo: ClientInfo = {
      id: clientId,
      ws,
      connectedAt: new Date(),
      lastHeartbeat: new Date(),
      capabilities: this.getDefaultCapabilities(),
      isAlive: true,
    };

    this.clients.set(clientId, clientInfo);

    // Send connection confirmation
    const connectionMessage: WebSocketMessage = {
      type: 'connection',
      data: {
        clientId,
        capabilities: this.getDefaultCapabilities(),
        timestamp: Date.now(),
      } as ConnectionMessage,
      timestamp: Date.now(),
      id: uuidv4(),
    };
    this.sendMessage(ws, connectionMessage);

    this.setupClientEventHandlers(clientId, ws);
    runtimeLogger.info(`🔗 New RuneLite client connected: ${clientId}`);
    this.emit('clientConnected', clientId, clientInfo);
  }

  private setupClientEventHandlers(clientId: string, ws: WebSocket): void {
    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleWebSocketMessage(clientId, message);
      } catch (error) {
        runtimeLogger.error(`Failed to parse message from client ${clientId}:`, error);
        this.sendError(ws, RuneLiteErrorType.INVALID_COMMAND, 'Invalid message format');
      }
    });

    ws.on('close', () => {
      this.handleClientDisconnect(clientId);
    });

    ws.on('error', (error: Error) => {
      runtimeLogger.error(`WebSocket error for client ${clientId}:`, error);
      this.handleClientDisconnect(clientId);
    });
  }

  private handleWebSocketMessage(clientId: string, message: WebSocketMessage): void {
    const client = this.clients.get(clientId);
    if (!client) {
      runtimeLogger.warn(`Received message from unknown client: ${clientId}`);
      return;
    }

    // Update last activity
    client.lastHeartbeat = new Date();

    switch (message.type) {
      case 'event':
        this.handleEvent(clientId, message);
        break;
      case 'command':
        this.handleCommand(clientId, message);
        break;
      case 'heartbeat':
        this.handleHeartbeat(clientId, message);
        break;
      case 'auth':
        this.handleAuthentication(clientId, message);
        break;
      case 'batch':
        this.handleEventBatch(clientId, message);
        break;
      case 'ack':
        this.handleAcknowledgment(clientId, message);
        break;
      case 'plugin':
        this.handlePluginMessage(clientId, message);
        break;
      case 'state':
        this.handleStateUpdate(clientId, message);
        break;
      default:
        runtimeLogger.warn(`Unknown message type from client ${clientId}: ${message.type}`);
        this.sendError(client.ws, RuneLiteErrorType.INVALID_COMMAND, `Unknown message type: ${message.type}`);
    }
  }

  private handleEvent(clientId: string, message: WebSocketMessage): void {
    this.emit('gameEvent', clientId, message.data);
  }

  private handleCommand(clientId: string, message: WebSocketMessage): void {
    this.emit('command', clientId, message.data);
  }

  private handleHeartbeat(clientId: string, message: WebSocketMessage): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.lastHeartbeat = new Date();
      client.isAlive = true;
    }
  }

  private handleAuthentication(clientId: string, message: WebSocketMessage): void {
    // Implement authentication logic here
    this.emit('authentication', clientId, message.data);
  }

  private handleEventBatch(clientId: string, message: WebSocketMessage): void {
    const batch = message.data as EventBatch;
    this.emit('eventBatch', clientId, batch);
  }

  private handleAcknowledgment(clientId: string, message: WebSocketMessage): void {
    const ackId = message.replyTo;
    if (ackId && this.acknowledgments.has(ackId)) {
      const ack = this.acknowledgments.get(ackId);
      if (ack?.callback) {
        ack.callback();
      }
      this.acknowledgments.delete(ackId);
    }
  }

  private handlePluginMessage(clientId: string, message: WebSocketMessage): void {
    this.emit('pluginMessage', clientId, message.data);
  }

  private handleStateUpdate(clientId: string, message: WebSocketMessage): void {
    this.emit('stateUpdate', clientId, message.data);
  }

  private handleClientDisconnect(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      this.clients.delete(clientId);
      runtimeLogger.info(`🔌 RuneLite client disconnected: ${clientId}`);
      this.emit('clientDisconnected', clientId);
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeatToClients();
    }, this.config.heartbeatInterval);
  }

  private startHealthCheck(): void {
    setInterval(() => {
      this.checkClientHealth();
    }, 60000); // Check every minute
  }

  private sendHeartbeatToClients(): void {
    const heartbeatMessage: WebSocketMessage = {
      type: 'heartbeat',
      data: { timestamp: Date.now() } as HeartbeatMessage,
      timestamp: Date.now(),
      id: uuidv4(),
    };

    this.broadcastMessage(heartbeatMessage);
  }

  private checkClientHealth(): void {
    const now = Date.now();
    const timeout = this.config.heartbeatInterval * 2;

    for (const [clientId, client] of this.clients) {
      const timeSinceHeartbeat = now - client.lastHeartbeat.getTime();
      if (timeSinceHeartbeat > timeout) {
        runtimeLogger.warn(`Client ${clientId} appears to be unresponsive, disconnecting`);
        this.disconnectClient(clientId, 'No heartbeat response');
      }
    }
  }

  public sendMessage(ws: WebSocket, message: WebSocketMessage): void {
    try {
      const data = JSON.stringify(message);
      ws.send(data);
    } catch (error) {
      runtimeLogger.error('Failed to send message:', error);
    }
  }

  public broadcastMessage(message: WebSocketMessage): void {
    for (const client of this.clients.values()) {
      if (client.isAlive) {
        this.sendMessage(client.ws, message);
      }
    }
  }

  public sendToClient(clientId: string, message: WebSocketMessage): boolean {
    const client = this.clients.get(clientId);
    if (client && client.isAlive) {
      this.sendMessage(client.ws, message);
      return true;
    }
    return false;
  }

  public sendError(ws: WebSocket, errorType: RuneLiteErrorType, message: string): void {
    const errorMessage: WebSocketMessage = {
      type: 'error',
      data: {
        errorType,
        message,
        timestamp: Date.now(),
      } as ErrorMessage,
      timestamp: Date.now(),
      id: uuidv4(),
    };

    this.sendMessage(ws, errorMessage);
  }

  public disconnectClient(clientId: string, reason = 'Server request'): boolean {
    const client = this.clients.get(clientId);
    if (client) {
      client.ws.close(1000, reason);
      this.clients.delete(clientId);
      return true;
    }
    return false;
  }

  public getConnectedClients(): string[] {
    return Array.from(this.clients.keys());
  }

  public getClientInfo(clientId: string): ClientInfo | null {
    return this.clients.get(clientId) || null;
  }

  public getClientCount(): number {
    return this.clients.size;
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDefaultCapabilities(): ProtocolCapabilities {
    return {
      version: '2.0.0',
      compression: this.config.enableCompression || false,
      batching: this.config.enableBatching || false,
      eventRecording: true,
      macroSystem: true,
      pathfinding: true,
      pluginBridge: true,
      stateSync: true,
      acknowledgments: true,
      priorities: true,
    };
  }
}

// Helper function for UUID generation
function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
} 