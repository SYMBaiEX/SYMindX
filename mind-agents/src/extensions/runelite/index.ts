import { EventEmitter } from 'events';

import { v4 as uuidv4 } from 'uuid';
import { WebSocketServer, WebSocket } from 'ws';

import {
  Extension,
  ExtensionType,
  ExtensionStatus,
  Agent,
  ExtensionAction,
  ExtensionEventHandler,
  ActionCategory,
  ActionResult,
  ActionResultType,
  AgentEvent,
} from '../../types/agent.js';
import { SkillParameters, GenericData } from '../../types/common.js';
import { runtimeLogger } from '../../utils/logger.js';

import {
  PathfindingSystem,
  MacroSystem,
  AutomationSystem,
  EventRecordingSystem,
  PluginBridgeSystem,
  EventBatchingSystem,
  CompressionUtils,
  StateSyncSystem,
} from './advanced-features.js';
import {
  RuneLiteConfig,
  GameEvent,
  RuneLiteCommand,
  PlayerInfo,
  InventoryItem,
  SkillInfo,
  CombatInfo,
  QuestInfo,
  GameState,
  ActionType,
  EventType,
  EventPriority,
  WebSocketMessage,
  EventBatch,
  ProtocolCapabilities,
  AutomationSafetyConfig,
  PathfindingOptions,
  MacroAction,
  RuneLiteErrorType,
} from './types.js';

export class RuneLiteExtension extends EventEmitter implements Extension {
  public readonly id = 'runelite';
  public readonly name = 'RuneLite Extension';
  public readonly version = '2.0.0';
  public readonly type = ExtensionType.GAME_INTEGRATION;
  public enabled = true;
  public status = ExtensionStatus.STOPPED;
  public actions: Record<string, ExtensionAction> = {};
  public events: Record<string, ExtensionEventHandler> = {};

  public config: any;
  private wss?: WebSocketServer;
  private clients = new Map<string, WebSocket>();
  private agent?: Agent;
  private gameState: GameState = {
    player: null,
    location: { x: 0, y: 0, plane: 0, region: 0 },
    inventory: [],
    equipment: [],
    skills: [],
    combat: null,
    quests: [],
    isLoggedIn: false,
    worldId: 0,
    gameMode: 'normal',
    timestamp: Date.now(),
  };
  private eventHandlers = new Map<EventType, Set<(event: GameEvent) => void>>();
  private commandQueue: RuneLiteCommand[] = [];
  private reconnectInterval?: NodeJS.Timeout;
  private heartbeatInterval?: NodeJS.Timeout;
  private connectionAttempts = 0;
  private maxReconnectAttempts = 10;

  // Advanced systems
  private pathfinding?: PathfindingSystem;
  private macroSystem?: MacroSystem;
  private automationSystem?: AutomationSystem;
  private eventRecording?: EventRecordingSystem;
  private pluginBridge?: PluginBridgeSystem;
  private eventBatching?: EventBatchingSystem;
  private stateSync?: StateSyncSystem;
  private protocolCapabilities: ProtocolCapabilities;
  private acknowledgments = new Map<
    string,
    (success: boolean, data?: any) => void
  >();

  constructor(config: RuneLiteConfig) {
    super();
    this.config = {
      enabled: config['enabled'] ?? true,
      priority: config['priority'] ?? 1,
      settings: {
        port: 8081,
        host: 'localhost',
        events: [],
        reconnectDelay: 5000,
        heartbeatInterval: 30000,
        commandTimeout: 10000,
        enableAutoReconnect: true,
        enableHeartbeat: true,
        enableEventFiltering: true,
        enableGameStateTracking: true,
        enableAdvancedCommands: true,
        enableSecurityValidation: true,
        allowedOrigins: ['runelite://localhost'],
        eventWhitelist: [],
        eventBlacklist: [],
        maxEventQueueSize: 1000,
        ...config['settings'],
      },
    } as RuneLiteConfig;

    this.setupEventHandlers();
    this.registerExtensionActions();
    this.initializeAdvancedSystems();

    // Set protocol capabilities
    this.protocolCapabilities = {
      version: '2.0.0',
      compression: this.config['settings']['enableCompression'] ?? true,
      batching: this.config['settings']['enableBatching'] ?? true,
      eventRecording: this.config['settings']['enableEventRecording'] ?? true,
      macroSystem: this.config['settings']['enableMacroSystem'] ?? true,
      pathfinding: this.config['settings']['enablePathfinding'] ?? true,
      pluginBridge: this.config['settings']['enablePluginBridge'] ?? true,
      stateSync: true,
      acknowledgments: true,
      priorities: true,
    };

    runtimeLogger.info(
      '🎮 RuneLite extension v2.0.0 initialized with advanced features'
    );
  }

  private initializeAdvancedSystems(): void {
    // Initialize pathfinding
    if (this.config['settings']['enablePathfinding'] !== false) {
      this.pathfinding = new PathfindingSystem(this.gameState);
      runtimeLogger.info('🗺️ Pathfinding system initialized');
    }

    // Initialize macro system
    if (this.config['settings']['enableMacroSystem'] !== false) {
      this.macroSystem = new MacroSystem();
      this.macroSystem.on('action:execute', (action: MacroAction) => {
        this.queueCommand(action['type'], action['parameters']);
      });
      runtimeLogger.info('📹 Macro system initialized');
    }

    // Initialize automation system
    if (this.config['settings']['enableAutomation'] !== false) {
      const safetyConfig: AutomationSafetyConfig = this.config['settings'][
        'automationSafety'
      ] || {
        enableAntiPattern: true,
        minActionDelay: 600,
        maxActionDelay: 3000,
        randomDelayVariance: 500,
        maxActionsPerMinute: 60,
        breakInterval: 3600000, // 1 hour
        breakDuration: 300000, // 5 minutes
        humanMouseMovement: true,
        misclickChance: 0.02,
        reactionTimeRange: [100, 300],
      };
      this.automationSystem = new AutomationSystem(safetyConfig);
      runtimeLogger.info(
        '🤖 Automation system initialized with safety features'
      );
    }

    // Initialize event recording
    if (this.config['settings']['enableEventRecording'] !== false) {
      this.eventRecording = new EventRecordingSystem();
      runtimeLogger.info('🔴 Event recording system initialized');
    }

    // Initialize plugin bridge
    if (this.config['settings']['enablePluginBridge'] !== false) {
      this.pluginBridge = new PluginBridgeSystem();
      runtimeLogger.info('🔌 Plugin bridge system initialized');
    }

    // Initialize event batching
    if (this.config['settings']['enableBatching'] !== false) {
      const batchSize = this.config['settings']['eventBatchSize'] || 50;
      const batchInterval =
        this.config['settings']['eventBatchInterval'] || 100;
      this.eventBatching = new EventBatchingSystem(batchSize, batchInterval);
      this.eventBatching.on('batch:ready', (batch: EventBatch) => {
        this.processBatch(batch);
      });
      runtimeLogger.info('📦 Event batching system initialized');
    }

    // Initialize state sync
    this.stateSync = new StateSyncSystem();
    this.stateSync.on('state:delta', (delta) => {
      this.broadcastStateDelta(delta);
    });
    runtimeLogger.info('🔄 State synchronization system initialized');
  }

  async init(agent: Agent): Promise<void> {
    if (!this.config['enabled']) {
      runtimeLogger.info('⏸️ RuneLite extension is disabled');
      return;
    }

    this.agent = agent;
    this.status = ExtensionStatus.INITIALIZING;

    try {
      await this.initializeServer();
      this.setupHeartbeat();
      this.setupAutoReconnect();

      this.status = ExtensionStatus.RUNNING;
      runtimeLogger.info(`🎮 RuneLite extension v2.0.0 started successfully`);
      this.emit('extension:started');
    } catch (error) {
      this.status = ExtensionStatus.ERROR;
      runtimeLogger.error('❌ Failed to initialize RuneLite extension:', error);
      throw error;
    }
  }

  private async initializeServer(): Promise<void> {
    const port = this.config['settings']['port'] ?? 8081;
    const host = this.config['settings']['host'] ?? 'localhost';

    this.wss = new WebSocketServer({
      port,
      host,
      perMessageDeflate: true,
      maxPayload: 1024 * 1024, // 1MB max payload
    });

    this.wss.on('connection', (ws, request) => {
      this.handleNewConnection(ws, request);
    });

    this.wss.on('error', (error) => {
      runtimeLogger.error('🔴 WebSocket server error:', error);
      this.emit('server:error', error);
    });

    runtimeLogger.info(
      `🎮 RuneLite WebSocket server listening on ${host}:${port}`
    );
  }

  private handleNewConnection(ws: WebSocket, request: any): void {
    const id = uuidv4();
    const clientInfo = {
      id,
      remoteAddress: request.socket['remoteAddress'],
      userAgent: request['headers']['user-agent'],
      connectedAt: Date.now(),
      lastHeartbeat: Date.now(),
      authenticated: false,
    };

    // Security validation
    if (this.config['settings']['enableSecurityValidation']) {
      const origin = request['headers']['origin'];
      const allowedOrigins = this.config['settings']['allowedOrigins'] ?? [];

      if (
        allowedOrigins.length > 0 &&
        (!origin || !allowedOrigins.includes(origin))
      ) {
        runtimeLogger.warn(
          `🚫 Rejected connection from unauthorized origin: ${origin}`
        );
        ws['close'](1008, 'Unauthorized origin');
        return;
      }
    }

    this.clients.set(id, ws);
    runtimeLogger.info(
      `🔗 New RuneLite client connected: ${id} from ${clientInfo['remoteAddress']}`
    );

    // Set up client event handlers
    ws['on']('message', (data) => {
      try {
        this.handleWebSocketMessage(id, data);
      } catch (err) {
        runtimeLogger.error(`❌ Error handling message from ${id}:`, err);
        this.sendError(
          ws,
          'MESSAGE_PARSE_ERROR',
          err instanceof Error ? err['message'] : String(err)
        );
      }
    });

    ws['on']('close', (code, reason) => {
      this.clients['delete'](id);
      runtimeLogger.info(
        `🔌 RuneLite client disconnected: ${id} (${code}: ${reason['toString']()})`
      );
      this.emit('client:disconnected', {
        id,
        code,
        reason: reason['toString'](),
      });
    });

    ws['on']('error', (error) => {
      runtimeLogger.error(`🔴 Client ${id} error:`, error);
      this.sendError(ws, 'CONNECTION_ERROR', error['message']);
    });

    ws['on']('pong', () => {
      clientInfo['lastHeartbeat'] = Date.now();
    });

    // Store client info for heartbeat tracking
    (ws as any)['clientInfo'] = clientInfo;

    // Send welcome message with protocol capabilities
    this.sendMessage(ws, {
      type: 'auth',
      data: {
        message: 'Connected to SYMindX RuneLite Extension v2.0.0',
        clientId: id,
        timestamp: Date.now(),
        capabilities: this.getCapabilities(),
        protocol: this.protocolCapabilities,
      },
      timestamp: Date.now(),
      id: uuidv4(),
      version: '2.0.0',
    });

    this.emit('client:connected', { id, clientInfo });
  }

  private processBatch(batch: EventBatch): void {
    // Process event batch based on priority
    for (const event of batch['events']) {
      this.handleGameEvent('batch', event);
    }
  }

  private broadcastStateDelta(delta: any): void {
    const message: WebSocketMessage = {
      type: 'state',
      data: delta,
      timestamp: Date.now(),
      id: uuidv4(),
      compressed: this.protocolCapabilities.compression,
    };

    if (this.protocolCapabilities.compression) {
      // Compress the delta
      const compressed = CompressionUtils.compressJSON(delta);
      message['data'] = compressed;
    }

    this.broadcastMessage(message);
  }

  async tick(agent: Agent): Promise<void> {
    // Process command queue
    await this.processCommandQueue();

    // Update game state tracking
    if (this.config['settings']['enableGameStateTracking']) {
      this.updateGameStateTracking();
    }

    // Clean up old events
    this.cleanupEventQueue();

    // Check client health
    this.checkClientHealth();
  }

  private async processCommandQueue(): Promise<void> {
    if (this.commandQueue.length === 0) return;

    const now = Date.now();
    const readyCommands = this.commandQueue.filter(
      (cmd) =>
        !cmd['timeout'] ||
        now - cmd['timestamp'] <
          (cmd['timeout'] || this.config['settings']['commandTimeout'] || 10000)
    );

    for (const command of readyCommands.slice(0, 10)) {
      // Process max 10 commands per tick
      try {
        await this.executeCommand(command);
        this.commandQueue = this.commandQueue.filter(
          (c) => c['id'] !== command['id']
        );
      } catch (error) {
        runtimeLogger.error(
          `Failed to execute command ${command['name']}:`,
          error
        );
        if (command['callback']) {
          command['callback']({
            success: false,
            error: error instanceof Error ? error['message'] : String(error),
          });
        }
        this.commandQueue = this.commandQueue.filter(
          (c) => c['id'] !== command['id']
        );
      }
    }

    // Remove timed out commands
    const timeoutLimit =
      now - (this.config['settings']['commandTimeout'] || 10000);
    this.commandQueue = this.commandQueue.filter(
      (cmd) => cmd['timestamp'] > timeoutLimit
    );
  }

  private updateGameStateTracking(): void {
    // Update game state timestamp
    this.gameState['timestamp'] = Date.now();

    // Emit game state update event
    this.emit('gamestate:updated', this.gameState);
  }

  private cleanupEventQueue(): void {
    const maxSize = this.config['settings']['maxEventQueueSize'] || 1000;
    // This would clean up any event queues if we were maintaining them
  }

  private checkClientHealth(): void {
    if (!this.config['settings']['enableHeartbeat']) return;

    const now = Date.now();
    const heartbeatTimeout =
      (this.config['settings']['heartbeatInterval'] || 30000) * 2; // 2x heartbeat interval

    for (const [clientId, ws] of this.clients.entries()) {
      const clientInfo = (ws as any)['clientInfo'];
      if (clientInfo && now - clientInfo['lastHeartbeat'] > heartbeatTimeout) {
        runtimeLogger.warn(
          `💔 Client ${clientId} heartbeat timeout, closing connection`
        );
        ws['close'](1001, 'Heartbeat timeout');
        this.clients['delete'](clientId);
      }
    }
  }

  async cleanup(): Promise<void> {
    this.status = ExtensionStatus.STOPPING;

    // Clear intervals
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
    }

    // Close all client connections
    for (const [clientId, ws] of this.clients.entries()) {
      ws['close'](1001, 'Server shutting down');
    }
    this.clients.clear();

    // Close WebSocket server
    if (this.wss) {
      await new Promise<void>((resolve) => {
        this.wss?.['close'](() => {
          resolve();
        });
      });
      delete this.wss;
    }

    // Clear command queue
    this.commandQueue = [];

    // Cleanup advanced systems
    if (this.macroSystem) {
      this.macroSystem.stopMacro();
    }

    if (this.automationSystem) {
      this.automationSystem.cleanup();
    }

    if (this.eventRecording) {
      this.eventRecording.stopRecording();
      this.eventRecording.stopReplay();
    }

    if (this.eventBatching) {
      this.eventBatching.cleanup();
    }

    // Clear acknowledgment handlers
    this.acknowledgments.clear();

    this.status = ExtensionStatus.STOPPED;
    runtimeLogger.info('🎮 RuneLite extension v2.0.0 stopped');
    this.emit('extension:stopped');
  }

  // ========================================
  // ADVANCED METHODS
  // ========================================

  private setupEventHandlers(): void {
    // Register handlers for all event types
    Object.values(EventType)['forEach']((eventType) => {
      this.eventHandlers.set(eventType, new Set());
    });
  }

  private setupHeartbeat(): void {
    if (!this.config['settings']['enableHeartbeat']) return;

    const interval = this.config['settings']['heartbeatInterval'] || 30000;
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeatToClients();
    }, interval);

    runtimeLogger.debug(`💓 Heartbeat enabled with ${interval}ms interval`);
  }

  private setupAutoReconnect(): void {
    if (!this.config['settings']['enableAutoReconnect']) return;

    // This would be used if we were a client connecting to RuneLite
    // For now, we're the server, so this is for future client-side functionality
  }

  private sendHeartbeatToClients(): void {
    const heartbeatMessage = {
      type: 'heartbeat' as const,
      data: {
        timestamp: Date.now(),
        gameState: this.config['settings']['enableGameStateTracking']
          ? this.gameState
          : undefined,
      },
      timestamp: Date.now(),
      id: uuidv4(),
    };

    this.broadcastMessage(heartbeatMessage);
  }

  private handleWebSocketMessage(clientId: string, data: any): void {
    const message = JSON.parse(data['toString']()) as any;

    runtimeLogger.debug(
      `📨 Received message from ${clientId}:`,
      message['type']
    );

    switch (message['type']) {
      case 'event':
        this.handleGameEvent(clientId, message['data']);
        break;
      case 'command':
        this.handleCommandResponse(clientId, message);
        break;
      case 'heartbeat':
        this.handleHeartbeat(clientId, message);
        break;
      case 'auth':
        this.handleAuthentication(clientId, message);
        break;
      case 'error':
        this.handleClientError(clientId, message);
        break;
      case 'batch':
        this.handleEventBatch(clientId, message['data']);
        break;
      case 'plugin':
        this.handlePluginMessage(clientId, message);
        break;
      case 'ack':
        this.handleAcknowledgment(clientId, message);
        break;
      case 'state':
        this.handleStateUpdate(clientId, message);
        break;
      default:
        runtimeLogger.warn(`❓ Unknown message type: ${message['type']}`);
    }

    // Send acknowledgment if required
    if ((message as any).requiresAck) {
      this.sendAcknowledgment(clientId, (message as any)['id']!);
    }
  }

  private sendAcknowledgment(clientId: string, messageId: string): void {
    const ws = this.clients.get(clientId);
    if (!ws) return;

    this.sendMessage(ws, {
      type: 'ack',
      data: { messageId, received: true },
      timestamp: Date.now(),
      id: uuidv4(),
      replyTo: messageId,
    });
  }

  private handleEventBatch(clientId: string, data: any): void {
    const batch = data as EventBatch;

    if (this.eventBatching) {
      // Process through batching system
      for (const event of batch['events']) {
        const priority = batch['priority'] || EventPriority.NORMAL;
        this.eventBatching.addEvent(event, priority);
      }
    } else {
      // Process directly
      for (const event of batch['events']) {
        this.handleGameEvent(clientId, event);
      }
    }
  }

  private handlePluginMessage(clientId: string, message: any): void {
    if (!this.pluginBridge) {
      runtimeLogger.warn('Plugin bridge not enabled');
      return;
    }

    const pluginMessage = message['data'] as any;
    this.pluginBridge.sendMessage({
      source: `client-${clientId}`,
      target: pluginMessage.target,
      type: pluginMessage['type'],
      data: pluginMessage['data'],
      timestamp: Date.now(),
    });
  }

  private handleAcknowledgment(clientId: string, message: any): void {
    const ackData = message['data'] as any;
    const handler = this.acknowledgments.get(ackData.messageId);

    if (handler) {
      handler(true, ackData);
      this.acknowledgments['delete'](ackData['messageId']);
    }
  }

  private handleStateUpdate(clientId: string, message: any): void {
    const newState = message['data'] as GameState;

    // Update game state
    this.gameState = newState;

    // Update dependent systems
    if (this.pathfinding) {
      this.pathfinding.updateGameState(newState);
    }

    // Calculate and broadcast state delta
    if (this.stateSync) {
      this.stateSync.updateState(newState);
    }

    this.emit('state:updated', newState);
  }

  private handleAuthentication(clientId: string, message: any): void {
    const ws = this.clients.get(clientId);
    if (!ws) return;

    const clientInfo = (ws as any)['clientInfo'];
    if (clientInfo) {
      clientInfo['authenticated'] = true;
      runtimeLogger.info(`✅ Client ${clientId} authenticated`);

      this.sendMessage(ws, {
        type: 'auth',
        data: { success: true, message: 'Authentication successful' },
        timestamp: Date.now(),
        id: uuidv4(),
      });
    }
  }

  private handleHeartbeat(clientId: string, message: any): void {
    const ws = this.clients.get(clientId);
    if (!ws) return;

    const clientInfo = (ws as any)['clientInfo'];
    if (clientInfo) {
      clientInfo['lastHeartbeat'] = Date.now();
    }

    // Respond with heartbeat ack
    this.sendMessage(ws, {
      type: 'heartbeat',
      data: { ack: true, timestamp: Date.now() },
      timestamp: Date.now(),
      id: message['id'] || uuidv4(),
    });
  }

  private handleCommandResponse(clientId: string, message: any): void {
    // Handle responses to commands we sent
    const commandId = message['data']?.['commandId'];
    if (commandId) {
      const command = this.commandQueue.find((c) => c['id'] === commandId);
      if (command && command['callback']) {
        command['callback'](message['data']);
        this.commandQueue = this.commandQueue.filter(
          (c) => c['id'] !== commandId
        );
      }
    }
  }

  private handleClientError(clientId: string, message: any): void {
    runtimeLogger.error(
      `🔴 Client ${clientId} reported error:`,
      message['data']
    );
    this.emit('client:error', { clientId, error: message['data'] });
  }

  private async executeCommand(command: RuneLiteCommand): Promise<void> {
    const message = {
      type: 'command' as const,
      data: {
        commandId: command['id'],
        action: command['action'],
        args: command['args'],
        timestamp: command['timestamp'],
      },
      timestamp: Date.now(),
      id: uuidv4(),
    };

    this.broadcastMessage(message);
    runtimeLogger.debug(
      `🎮 Executed command: ${command['name']} (${command['action']})`
    );
  }

  private sendMessage(ws: WebSocket, message: any): void {
    if (ws['readyState'] === WebSocket.OPEN) {
      ws['send'](JSON.stringify(message));
    }
  }

  private broadcastMessage(message: any): void {
    const messageStr = JSON.stringify(message);
    for (const ws of this.clients.values()) {
      if (ws['readyState'] === WebSocket.OPEN) {
        ws['send'](messageStr);
      }
    }
  }

  private sendError(ws: WebSocket, errorType: string, message: string): void {
    this.sendMessage(ws, {
      type: 'error',
      data: {
        errorType,
        message,
        timestamp: Date.now(),
      },
      timestamp: Date.now(),
      id: uuidv4(),
    });
  }

  private getCapabilities(): string[] {
    const capabilities = [
      'game_events',
      'command_execution',
      'heartbeat',
      'authentication',
    ];

    if (this.config['settings']['enableGameStateTracking']) {
      capabilities.push('game_state_tracking');
    }
    if (this.config['settings']['enableAdvancedCommands']) {
      capabilities.push('advanced_commands');
    }
    if (this.config['settings']['enableEventFiltering']) {
      capabilities.push('event_filtering');
    }

    return capabilities;
  }

  // Game State Management
  public getGameState(): GameState {
    return { ...this.gameState };
  }

  public updatePlayerInfo(playerInfo: Partial<PlayerInfo>): void {
    if (this.gameState['player']) {
      this.gameState['player'] = { ...this.gameState['player'], ...playerInfo };
    } else {
      this.gameState['player'] = playerInfo as PlayerInfo;
    }
    this.emit('gamestate:player_updated', this.gameState['player']);
  }

  public updateInventory(inventory: InventoryItem[]): void {
    this.gameState['inventory'] = inventory;
    this.emit('gamestate:inventory_updated', inventory);
  }

  public updateSkills(skills: SkillInfo[]): void {
    this.gameState['skills'] = skills;
    this.emit('gamestate:skills_updated', skills);
  }

  // Event Management
  public addEventListener(
    eventType: EventType,
    handler: (event: GameEvent) => void
  ): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      handlers['add'](handler);
    }
  }

  public removeEventListener(
    eventType: EventType,
    handler: (event: GameEvent) => void
  ): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      handlers['delete'](handler);
    }
  }

  // Command Management
  public queueCommand(
    action: ActionType,
    args?: Record<string, unknown>,
    options?: {
      timeout?: number;
      priority?: number;
      callback?: (result: any) => void;
    }
  ): string {
    const command: RuneLiteCommand = {
      id: uuidv4(),
      name: action,
      action,
      timestamp: Date.now(),
      priority: options?.['priority'] || 1,
      ...(args !== undefined ? { args } : {}),
      ...(options?.['timeout'] !== undefined
        ? { timeout: options['timeout'] }
        : {}),
      ...(options?.['callback'] !== undefined
        ? { callback: options['callback'] }
        : {}),
    };

    // Insert based on priority
    const insertIndex = this.commandQueue.findIndex(
      (c) => (c['priority'] || 1) < command['priority']!
    );
    if (insertIndex === -1) {
      this.commandQueue.push(command);
    } else {
      this.commandQueue.splice(insertIndex, 0, command);
    }

    runtimeLogger.debug(`📋 Queued command: ${action} (ID: ${command['id']})`);
    return command['id'];
  }

  // Client Management
  public getConnectedClients(): string[] {
    return Array.from(this.clients.keys());
  }

  public getClientInfo(clientId: string): any {
    const ws = this.clients.get(clientId);
    return ws ? (ws as any)['clientInfo'] : null;
  }

  public disconnectClient(
    clientId: string,
    reason = 'Server request'
  ): boolean {
    const ws = this.clients.get(clientId);
    if (ws) {
      ws['close'](1000, reason);
      this.clients.delete(clientId);
      return true;
    }
    return false;
  }

  private async handleGameEvent(
    clientId: string,
    event: GameEvent
  ): Promise<void> {
    if (!this.agent) return;

    // Enhanced event filtering
    if (this.config['settings']['enableEventFiltering']) {
      const whitelist = this.config['settings']['eventWhitelist'];
      const blacklist = this.config['settings']['eventBlacklist'];

      if (
        whitelist &&
        whitelist.length > 0 &&
        !whitelist.includes(event['type'])
      ) {
        return; // Event not in whitelist
      }

      if (blacklist && blacklist.includes(event['type'])) {
        return; // Event is blacklisted
      }
    }

    // Update game state based on event
    if (this.config['settings']['enableGameStateTracking']) {
      this.updateGameStateFromEvent(event);
    }

    // Trigger event handlers
    const handlers = this.eventHandlers.get(event['type']);
    if (handlers) {
      handlers['forEach']((handler) => {
        try {
          handler(event);
        } catch (error) {
          runtimeLogger.error(
            `Error in event handler for ${event['type']}:`,
            error
          );
        }
      });
    }

    // Create agent event
    const agentEvent: AgentEvent = {
      id: event['id'] || `${clientId}-${Date.now()}`,
      type: 'game_event',
      source: 'runelite',
      data: {
        clientId,
        eventType: event['type'],
        eventData: event['data'],
        timestamp: event['timestamp'],
        player: event['player'],
      } as unknown as GenericData,
      timestamp: new Date(event['timestamp']),
      processed: false,
      agentId: this.agent['id'],
    };

    // Emit to agent event bus
    if (this.agent.eventBus) {
      try {
        await this.agent.eventBus.emit(agentEvent);
        runtimeLogger.debug(
          `🎯 Processed game event: ${event['type']} from client ${clientId}`
        );
      } catch (error) {
        runtimeLogger.error(`Failed to emit game event to agent:`, error);
      }
    }

    // Emit locally for extension listeners
    this.emit('game:event', { clientId, event, agentEvent });
  }

  private updateGameStateFromEvent(event: GameEvent): void {
    switch (event['type']) {
      case EventType.PLAYER_LOGIN:
        if (event['player']) {
          this.gameState['player'] = event['player'];
          this.gameState['isLoggedIn'] = true;
        }
        break;

      case EventType.PLAYER_LOGOUT:
        this.gameState['isLoggedIn'] = false;
        break;

      case EventType.LOCATION_CHANGED:
        if (event['data']['location']) {
          this.gameState['location'] = event['data']['location'] as any;
        }
        break;

      case EventType.ITEM_ADDED:
      case EventType.ITEM_REMOVED:
        if (event['data']['inventory']) {
          this.gameState['inventory'] = event['data'][
            'inventory'
          ] as InventoryItem[];
        }
        break;

      case EventType.SKILL_EXP_GAINED:
      case EventType.PLAYER_LEVEL_UP:
        if (event['data']['skills']) {
          this.gameState['skills'] = event['data']['skills'] as SkillInfo[];
        }
        break;

      case EventType.COMBAT_START:
        if (event['data']['combat']) {
          this.gameState['combat'] = event['data']['combat'] as CombatInfo;
        }
        break;

      case EventType.COMBAT_END:
        this.gameState['combat'] = null;
        break;
    }

    this.gameState['timestamp'] = Date.now();
  }

  private registerExtensionActions(): void {
    // ========================================
    // GAME CONTROL ACTIONS
    // ========================================

    this.actions['walkTo'] = {
      name: 'walkTo',
      description: 'Walk to specific coordinates in the game',
      category: ActionCategory.INTERACTION,
      parameters: {
        x: { type: 'number', required: true, description: 'X coordinate' },
        y: { type: 'number', required: true, description: 'Y coordinate' },
        plane: {
          type: 'number',
          required: false,
          description: 'Plane level (default: current)',
        },
      },
      execute: async (
        _agent: Agent,
        params: SkillParameters
      ): Promise<ActionResult> => {
        const commandId = this.queueCommand(ActionType.WALK_TO, {
          x: params['x'],
          y: params['y'],
          plane: params['plane'],
        });
        return {
          success: true,
          type: ActionResultType.SUCCESS,
          result: { commandId },
        };
      },
    };

    this.actions['runTo'] = {
      name: 'runTo',
      description: 'Run to specific coordinates in the game',
      category: ActionCategory.INTERACTION,
      parameters: {
        x: { type: 'number', required: true, description: 'X coordinate' },
        y: { type: 'number', required: true, description: 'Y coordinate' },
        plane: {
          type: 'number',
          required: false,
          description: 'Plane level (default: current)',
        },
      },
      execute: async (
        _agent: Agent,
        params: SkillParameters
      ): Promise<ActionResult> => {
        const commandId = this.queueCommand(ActionType.RUN_TO, {
          x: params['x'],
          y: params['y'],
          plane: params['plane'],
        });
        return {
          success: true,
          type: ActionResultType.SUCCESS,
          result: { commandId },
        };
      },
    };

    this.actions['clickObject'] = {
      name: 'clickObject',
      description: 'Click on a game object',
      category: ActionCategory.INTERACTION,
      parameters: {
        objectId: { type: 'number', required: true, description: 'Object ID' },
        action: {
          type: 'string',
          required: false,
          description: 'Interaction action (e.g., "Mine", "Chop")',
        },
        x: {
          type: 'number',
          required: false,
          description: 'Object X coordinate',
        },
        y: {
          type: 'number',
          required: false,
          description: 'Object Y coordinate',
        },
      },
      execute: async (
        _agent: Agent,
        params: SkillParameters
      ): Promise<ActionResult> => {
        const commandId = this.queueCommand(ActionType.CLICK_OBJECT, {
          objectId: params['objectId'],
          action: params['action'],
          x: params['x'],
          y: params['y'],
        });
        return {
          success: true,
          type: ActionResultType.SUCCESS,
          result: { commandId },
        };
      },
    };

    this.actions['clickNPC'] = {
      name: 'clickNPC',
      description: 'Click on an NPC',
      category: ActionCategory.INTERACTION,
      parameters: {
        npcId: { type: 'number', required: true, description: 'NPC ID' },
        action: {
          type: 'string',
          required: false,
          description: 'Interaction action (e.g., "Talk-to", "Attack")',
        },
      },
      execute: async (
        _agent: Agent,
        params: SkillParameters
      ): Promise<ActionResult> => {
        const commandId = this.queueCommand(ActionType.CLICK_NPC, {
          npcId: params['npcId'],
          action: params['action'],
        });
        return {
          success: true,
          type: ActionResultType.SUCCESS,
          result: { commandId },
        };
      },
    };

    this.actions['useItem'] = {
      name: 'useItem',
      description: 'Use an item from inventory',
      category: ActionCategory.INTERACTION,
      parameters: {
        itemId: { type: 'number', required: true, description: 'Item ID' },
        slot: {
          type: 'number',
          required: false,
          description: 'Inventory slot',
        },
        target: {
          type: 'object',
          required: false,
          description: 'Target object/NPC to use item on',
        },
      },
      execute: async (
        _agent: Agent,
        params: SkillParameters
      ): Promise<ActionResult> => {
        const commandId = this.queueCommand(ActionType.USE_ITEM, {
          itemId: params['itemId'],
          slot: params['slot'],
          target: params['target'],
        });
        return {
          success: true,
          type: ActionResultType.SUCCESS,
          result: { commandId },
        };
      },
    };

    this.actions['dropItem'] = {
      name: 'dropItem',
      description: 'Drop an item from inventory',
      category: ActionCategory.INTERACTION,
      parameters: {
        itemId: { type: 'number', required: true, description: 'Item ID' },
        slot: {
          type: 'number',
          required: false,
          description: 'Inventory slot',
        },
        quantity: {
          type: 'number',
          required: false,
          description: 'Quantity to drop (default: all)',
        },
      },
      execute: async (
        _agent: Agent,
        params: SkillParameters
      ): Promise<ActionResult> => {
        const commandId = this.queueCommand(ActionType.DROP_ITEM, {
          itemId: params['itemId'],
          slot: params['slot'],
          quantity: params['quantity'],
        });
        return {
          success: true,
          type: ActionResultType.SUCCESS,
          result: { commandId },
        };
      },
    };

    // ========================================
    // COMBAT ACTIONS
    // ========================================

    this.actions['attackNPC'] = {
      name: 'attackNPC',
      description: 'Attack an NPC',
      category: ActionCategory.INTERACTION,
      parameters: {
        npcId: {
          type: 'number',
          required: true,
          description: 'NPC ID to attack',
        },
        combatStyle: {
          type: 'string',
          required: false,
          description:
            'Combat style (accurate, aggressive, defensive, controlled)',
        },
      },
      execute: async (
        _agent: Agent,
        params: SkillParameters
      ): Promise<ActionResult> => {
        const commandId = this.queueCommand(ActionType.ATTACK_NPC, {
          npcId: params['npcId'],
          combatStyle: params['combatStyle'],
        });
        return {
          success: true,
          type: ActionResultType.SUCCESS,
          result: { commandId },
        };
      },
    };

    this.actions['activatePrayer'] = {
      name: 'activatePrayer',
      description: 'Activate a prayer',
      category: ActionCategory.INTERACTION,
      parameters: {
        prayer: { type: 'string', required: true, description: 'Prayer name' },
      },
      execute: async (
        _agent: Agent,
        params: SkillParameters
      ): Promise<ActionResult> => {
        const commandId = this.queueCommand(ActionType.ACTIVATE_PRAYER, {
          prayer: params['prayer'],
        });
        return {
          success: true,
          type: ActionResultType.SUCCESS,
          result: { commandId },
        };
      },
    };

    this.actions['eatFood'] = {
      name: 'eatFood',
      description: 'Eat food for healing',
      category: ActionCategory.INTERACTION,
      parameters: {
        foodId: { type: 'number', required: true, description: 'Food item ID' },
        slot: {
          type: 'number',
          required: false,
          description: 'Inventory slot',
        },
      },
      execute: async (
        _agent: Agent,
        params: SkillParameters
      ): Promise<ActionResult> => {
        const commandId = this.queueCommand(ActionType.EAT_FOOD, {
          foodId: params['foodId'],
          slot: params['slot'],
        });
        return {
          success: true,
          type: ActionResultType.SUCCESS,
          result: { commandId },
        };
      },
    };

    // ========================================
    // SKILLING ACTIONS
    // ========================================

    this.actions['fish'] = {
      name: 'fish',
      description: 'Fish at a fishing spot',
      category: ActionCategory.INTERACTION,
      parameters: {
        spotId: {
          type: 'number',
          required: true,
          description: 'Fishing spot ID',
        },
        tool: { type: 'string', required: false, description: 'Fishing tool' },
      },
      execute: async (
        _agent: Agent,
        params: SkillParameters
      ): Promise<ActionResult> => {
        const commandId = this.queueCommand(ActionType.FISH, {
          spotId: params['spotId'],
          tool: params['tool'],
        });
        return {
          success: true,
          type: ActionResultType.SUCCESS,
          result: { commandId },
        };
      },
    };

    this.actions['mine'] = {
      name: 'mine',
      description: 'Mine a rock or ore',
      category: ActionCategory.INTERACTION,
      parameters: {
        rockId: { type: 'number', required: true, description: 'Rock/ore ID' },
        tool: { type: 'string', required: false, description: 'Mining tool' },
      },
      execute: async (
        _agent: Agent,
        params: SkillParameters
      ): Promise<ActionResult> => {
        const commandId = this.queueCommand(ActionType.MINE, {
          rockId: params['rockId'],
          tool: params['tool'],
        });
        return {
          success: true,
          type: ActionResultType.SUCCESS,
          result: { commandId },
        };
      },
    };

    this.actions['woodcut'] = {
      name: 'woodcut',
      description: 'Cut down a tree',
      category: ActionCategory.INTERACTION,
      parameters: {
        treeId: { type: 'number', required: true, description: 'Tree ID' },
        tool: {
          type: 'string',
          required: false,
          description: 'Woodcutting tool',
        },
      },
      execute: async (
        _agent: Agent,
        params: SkillParameters
      ): Promise<ActionResult> => {
        const commandId = this.queueCommand(ActionType.WOODCUT, {
          treeId: params['treeId'],
          tool: params['tool'],
        });
        return {
          success: true,
          type: ActionResultType.SUCCESS,
          result: { commandId },
        };
      },
    };

    // ========================================
    // BANKING ACTIONS
    // ========================================

    this.actions['openBank'] = {
      name: 'openBank',
      description: 'Open bank interface',
      category: ActionCategory.INTERACTION,
      parameters: {
        bankerId: {
          type: 'number',
          required: false,
          description: 'Banker NPC ID',
        },
        boothId: {
          type: 'number',
          required: false,
          description: 'Bank booth object ID',
        },
      },
      execute: async (
        _agent: Agent,
        params: SkillParameters
      ): Promise<ActionResult> => {
        const commandId = this.queueCommand(ActionType.OPEN_BANK, {
          bankerId: params['bankerId'],
          boothId: params['boothId'],
        });
        return {
          success: true,
          type: ActionResultType.SUCCESS,
          result: { commandId },
        };
      },
    };

    this.actions['depositItem'] = {
      name: 'depositItem',
      description: 'Deposit item into bank',
      category: ActionCategory.INTERACTION,
      parameters: {
        itemId: {
          type: 'number',
          required: true,
          description: 'Item ID to deposit',
        },
        quantity: {
          type: 'number',
          required: false,
          description: 'Quantity to deposit',
        },
      },
      execute: async (
        _agent: Agent,
        params: SkillParameters
      ): Promise<ActionResult> => {
        const commandId = this.queueCommand(ActionType.DEPOSIT_ITEM, {
          itemId: params['itemId'],
          quantity: params['quantity'],
        });
        return {
          success: true,
          type: ActionResultType.SUCCESS,
          result: { commandId },
        };
      },
    };

    this.actions['withdrawItem'] = {
      name: 'withdrawItem',
      description: 'Withdraw item from bank',
      category: ActionCategory.INTERACTION,
      parameters: {
        itemId: {
          type: 'number',
          required: true,
          description: 'Item ID to withdraw',
        },
        quantity: {
          type: 'number',
          required: false,
          description: 'Quantity to withdraw',
        },
        noted: {
          type: 'boolean',
          required: false,
          description: 'Withdraw as noted',
        },
      },
      execute: async (
        _agent: Agent,
        params: SkillParameters
      ): Promise<ActionResult> => {
        const commandId = this.queueCommand(ActionType.WITHDRAW_ITEM, {
          itemId: params['itemId'],
          quantity: params['quantity'],
          noted: params['noted'],
        });
        return {
          success: true,
          type: ActionResultType.SUCCESS,
          result: { commandId },
        };
      },
    };

    // ========================================
    // TRADING ACTIONS
    // ========================================

    this.actions['tradePlayer'] = {
      name: 'tradePlayer',
      description: 'Initiate trade with another player',
      category: ActionCategory.INTERACTION,
      parameters: {
        playerName: {
          type: 'string',
          required: true,
          description: 'Player name to trade',
        },
      },
      execute: async (
        _agent: Agent,
        params: SkillParameters
      ): Promise<ActionResult> => {
        const commandId = this.queueCommand(ActionType.TRADE_PLAYER, {
          playerName: params['playerName'],
        });
        return {
          success: true,
          type: ActionResultType.SUCCESS,
          result: { commandId },
        };
      },
    };

    // ========================================
    // GRAND EXCHANGE ACTIONS
    // ========================================

    this.actions['geBuy'] = {
      name: 'geBuy',
      description: 'Create buy offer on Grand Exchange',
      category: ActionCategory.INTERACTION,
      parameters: {
        itemId: {
          type: 'number',
          required: true,
          description: 'Item ID to buy',
        },
        quantity: {
          type: 'number',
          required: true,
          description: 'Quantity to buy',
        },
        price: {
          type: 'number',
          required: true,
          description: 'Price per item',
        },
      },
      execute: async (
        _agent: Agent,
        params: SkillParameters
      ): Promise<ActionResult> => {
        const commandId = this.queueCommand(ActionType.GE_BUY, {
          itemId: params['itemId'],
          quantity: params['quantity'],
          price: params['price'],
        });
        return {
          success: true,
          type: ActionResultType.SUCCESS,
          result: { commandId },
        };
      },
    };

    this.actions['geSell'] = {
      name: 'geSell',
      description: 'Create sell offer on Grand Exchange',
      category: ActionCategory.INTERACTION,
      parameters: {
        itemId: {
          type: 'number',
          required: true,
          description: 'Item ID to sell',
        },
        quantity: {
          type: 'number',
          required: true,
          description: 'Quantity to sell',
        },
        price: {
          type: 'number',
          required: true,
          description: 'Price per item',
        },
      },
      execute: async (
        _agent: Agent,
        params: SkillParameters
      ): Promise<ActionResult> => {
        const commandId = this.queueCommand(ActionType.GE_SELL, {
          itemId: params['itemId'],
          quantity: params['quantity'],
          price: params['price'],
        });
        return {
          success: true,
          type: ActionResultType.SUCCESS,
          result: { commandId },
        };
      },
    };

    // ========================================
    // PATHFINDING ACTIONS
    // ========================================

    this.actions['findPath'] = {
      name: 'findPath',
      description: 'Find optimal path between two locations',
      category: ActionCategory.QUERY,
      parameters: {
        startX: {
          type: 'number',
          required: true,
          description: 'Starting X coordinate',
        },
        startY: {
          type: 'number',
          required: true,
          description: 'Starting Y coordinate',
        },
        endX: {
          type: 'number',
          required: true,
          description: 'Destination X coordinate',
        },
        endY: {
          type: 'number',
          required: true,
          description: 'Destination Y coordinate',
        },
        avoidPlayers: {
          type: 'boolean',
          required: false,
          description: 'Avoid other players',
        },
        avoidCombat: {
          type: 'boolean',
          required: false,
          description: 'Avoid combat areas',
        },
        allowTeleports: {
          type: 'boolean',
          required: false,
          description: 'Use teleports if available',
        },
      },
      execute: async (
        _agent: Agent,
        params: SkillParameters
      ): Promise<ActionResult> => {
        if (!this.pathfinding) {
          return {
            success: false,
            type: ActionResultType.FAILURE,
            error: 'Pathfinding not enabled',
          };
        }

        const path = await this.pathfinding.findPath(
          {
            x: params['startX'] as number,
            y: params['startY'] as number,
            plane: 0,
          },
          {
            x: params['endX'] as number,
            y: params['endY'] as number,
            plane: 0,
          },
          {
            avoidPlayers: params['avoidPlayers'] as boolean,
            avoidCombat: params['avoidCombat'] as boolean,
            allowTeleports: params['allowTeleports'] as boolean,
          }
        );

        return {
          success: path !== null,
          type: path ? ActionResultType.SUCCESS : ActionResultType.FAILURE,
          result: path as unknown as GenericData,
        };
      },
    };

    // ========================================
    // MACRO ACTIONS
    // ========================================

    this.actions['startMacroRecording'] = {
      name: 'startMacroRecording',
      description: 'Start recording a macro',
      category: ActionCategory.SYSTEM,
      parameters: {
        name: { type: 'string', required: true, description: 'Macro name' },
        description: {
          type: 'string',
          required: false,
          description: 'Macro description',
        },
      },
      execute: async (
        _agent: Agent,
        params: SkillParameters
      ): Promise<ActionResult> => {
        if (!this.macroSystem) {
          return {
            success: false,
            type: ActionResultType.FAILURE,
            error: 'Macro system not enabled',
          };
        }

        this.macroSystem.startRecording(
          params['name'] as string,
          params['description'] as string
        );
        return { success: true, type: ActionResultType.SUCCESS };
      },
    };

    this.actions['stopMacroRecording'] = {
      name: 'stopMacroRecording',
      description: 'Stop recording macro',
      category: ActionCategory.SYSTEM,
      parameters: {},
      execute: async (
        _agent: Agent,
        _params: SkillParameters
      ): Promise<ActionResult> => {
        if (!this.macroSystem) {
          return {
            success: false,
            type: ActionResultType.FAILURE,
            error: 'Macro system not enabled',
          };
        }

        const macro = this.macroSystem.stopRecording();
        return {
          success: macro !== null,
          type: macro ? ActionResultType.SUCCESS : ActionResultType.FAILURE,
          result: macro as unknown as GenericData,
        };
      },
    };

    this.actions['playMacro'] = {
      name: 'playMacro',
      description: 'Play a recorded macro',
      category: ActionCategory.SYSTEM,
      parameters: {
        macroId: {
          type: 'string',
          required: true,
          description: 'Macro ID to play',
        },
        speed: {
          type: 'number',
          required: false,
          description: 'Playback speed multiplier',
        },
        loop: {
          type: 'boolean',
          required: false,
          description: 'Loop the macro',
        },
      },
      execute: async (
        _agent: Agent,
        params: SkillParameters
      ): Promise<ActionResult> => {
        if (!this.macroSystem) {
          return {
            success: false,
            type: ActionResultType.FAILURE,
            error: 'Macro system not enabled',
          };
        }

        try {
          await this.macroSystem.playMacro(params['macroId'] as string, {
            speed: params['speed'] as number,
            loop: params['loop'] as boolean,
          });
          return { success: true, type: ActionResultType.SUCCESS };
        } catch (error) {
          return {
            success: false,
            type: ActionResultType.FAILURE,
            error: error instanceof Error ? error['message'] : String(error),
          };
        }
      },
    };

    // ========================================
    // AUTOMATION ACTIONS
    // ========================================

    this.actions['createAutomationTask'] = {
      name: 'createAutomationTask',
      description: 'Create an automation task',
      category: ActionCategory.SYSTEM,
      parameters: {
        type: {
          type: 'string',
          required: true,
          description: 'Task type (skill, combat, quest, travel, custom)',
        },
        name: { type: 'string', required: true, description: 'Task name' },
        actions: {
          type: 'array',
          required: true,
          description: 'List of actions to perform',
        },
        config: {
          type: 'object',
          required: false,
          description: 'Task configuration',
        },
      },
      execute: async (
        _agent: Agent,
        params: SkillParameters
      ): Promise<ActionResult> => {
        if (!this.automationSystem) {
          return {
            success: false,
            type: ActionResultType.FAILURE,
            error: 'Automation system not enabled',
          };
        }

        const task = this.automationSystem.createTask(
          params['type'] as any,
          params['name'] as string,
          params['actions'] as ActionType[],
          params['config'] as Record<string, unknown>
        );

        return {
          success: true,
          type: ActionResultType.SUCCESS,
          result: task as unknown as GenericData,
        };
      },
    };

    // ========================================
    // GAME STATE ACTIONS
    // ========================================

    this.actions['getGameState'] = {
      name: 'getGameState',
      description: 'Get current game state information',
      category: ActionCategory.QUERY,
      parameters: {},
      execute: async (
        _agent: Agent,
        _params: SkillParameters
      ): Promise<ActionResult> => {
        const gameState = this.getGameState();
        return {
          success: true,
          type: ActionResultType.SUCCESS,
          result: gameState as unknown as GenericData,
        };
      },
    };

    this.actions['getPlayerInfo'] = {
      name: 'getPlayerInfo',
      description: 'Get current player information',
      category: ActionCategory.QUERY,
      parameters: {},
      execute: async (
        _agent: Agent,
        _params: SkillParameters
      ): Promise<ActionResult> => {
        return {
          success: true,
          type: ActionResultType.SUCCESS,
          result: {
            player: this.gameState['player'],
          } as unknown as GenericData,
        };
      },
    };

    this.actions['getInventory'] = {
      name: 'getInventory',
      description: 'Get current inventory items',
      category: ActionCategory.QUERY,
      parameters: {},
      execute: async (
        _agent: Agent,
        _params: SkillParameters
      ): Promise<ActionResult> => {
        return {
          success: true,
          type: ActionResultType.SUCCESS,
          result: {
            inventory: this.gameState['inventory'],
          } as unknown as GenericData,
        };
      },
    };

    this.actions['getSkills'] = {
      name: 'getSkills',
      description: 'Get current skill levels and experience',
      category: ActionCategory.QUERY,
      parameters: {},
      execute: async (
        _agent: Agent,
        _params: SkillParameters
      ): Promise<ActionResult> => {
        return {
          success: true,
          type: ActionResultType.SUCCESS,
          result: {
            skills: this.gameState['skills'],
          } as unknown as GenericData,
        };
      },
    };

    // ========================================
    // CLIENT MANAGEMENT ACTIONS
    // ========================================

    this.actions['getConnectedClients'] = {
      name: 'getConnectedClients',
      description: 'Get list of connected RuneLite clients',
      category: ActionCategory.SYSTEM,
      parameters: {},
      execute: async (
        _agent: Agent,
        _params: SkillParameters
      ): Promise<ActionResult> => {
        const clients = this.getConnectedClients();
        const clientInfo = clients.map((id) => ({
          id,
          info: this.getClientInfo(id),
        }));
        return {
          success: true,
          type: ActionResultType.SUCCESS,
          result: { clients: clientInfo } as GenericData,
        };
      },
    };

    this.actions['disconnectClient'] = {
      name: 'disconnectClient',
      description: 'Disconnect a specific RuneLite client',
      category: ActionCategory.SYSTEM,
      parameters: {
        clientId: {
          type: 'string',
          required: true,
          description: 'Client ID to disconnect',
        },
        reason: {
          type: 'string',
          required: false,
          description: 'Disconnect reason',
        },
      },
      execute: async (
        _agent: Agent,
        params: SkillParameters
      ): Promise<ActionResult> => {
        const success = this.disconnectClient(
          params['clientId'] as string,
          params['reason'] as string
        );
        return {
          success,
          type: success ? ActionResultType.SUCCESS : ActionResultType.FAILURE,
          result: { disconnected: success } as GenericData,
        };
      },
    };

    // ========================================
    // UTILITY ACTIONS
    // ========================================

    this.actions['takeScreenshot'] = {
      name: 'takeScreenshot',
      description: 'Take a screenshot of the game client',
      category: ActionCategory.INTERACTION,
      parameters: {
        filename: {
          type: 'string',
          required: false,
          description: 'Screenshot filename',
        },
        format: {
          type: 'string',
          required: false,
          description: 'Image format (png, jpg)',
        },
      },
      execute: async (
        _agent: Agent,
        params: SkillParameters
      ): Promise<ActionResult> => {
        const commandId = this.queueCommand(ActionType.TAKE_SCREENSHOT, {
          filename: params['filename'],
          format: params['format'] || 'png',
        });
        return {
          success: true,
          type: ActionResultType.SUCCESS,
          result: { commandId },
        };
      },
    };

    this.actions['sendChat'] = {
      name: 'sendChat',
      description: 'Send a chat message in game',
      category: ActionCategory.COMMUNICATION,
      parameters: {
        message: {
          type: 'string',
          required: true,
          description: 'Chat message',
        },
        type: {
          type: 'string',
          required: false,
          description: 'Chat type (public, private, clan)',
        },
      },
      execute: async (
        _agent: Agent,
        params: SkillParameters
      ): Promise<ActionResult> => {
        const commandId = this.queueCommand(ActionType.SEND_CHAT, {
          message: params['message'],
          type: params['type'] || 'public',
        });
        return {
          success: true,
          type: ActionResultType.SUCCESS,
          result: { commandId },
        };
      },
    };

    // Legacy compatibility
    this.actions['sendCommand'] = {
      name: 'sendCommand',
      description:
        'Send a legacy command to RuneLite clients (deprecated - use specific actions)',
      category: ActionCategory.INTERACTION,
      parameters: {
        command: {
          type: 'string',
          required: true,
          description: 'Command name',
        },
        args: {
          type: 'object',
          required: false,
          description: 'Command arguments',
        },
      },
      execute: async (
        _agent: Agent,
        params: SkillParameters
      ): Promise<ActionResult> => {
        const commandId = this.queueCommand(ActionType.CUSTOM_ACTION, {
          command: params['command'],
          args: params['args'],
        });
        return {
          success: true,
          type: ActionResultType.SUCCESS,
          result: { commandId },
        };
      },
    };

    // ========================================
    // EVENT MANAGEMENT ACTIONS
    // ========================================

    this.actions['addEventListener'] = {
      name: 'addEventListener',
      description: 'Register an event listener for game events',
      category: ActionCategory.SYSTEM,
      parameters: {
        eventType: {
          type: 'string',
          required: true,
          description: 'Event type to listen for',
        },
      },
      execute: async (
        _agent: Agent,
        params: SkillParameters
      ): Promise<ActionResult> => {
        const eventType = params['eventType'] as EventType;
        // This would register a listener - for API use, the agent would handle this differently
        return {
          success: true,
          type: ActionResultType.SUCCESS,
          result: { registered: eventType } as GenericData,
        };
      },
    };

    this.actions['getAvailableEvents'] = {
      name: 'getAvailableEvents',
      description: 'Get list of available event types',
      category: ActionCategory.QUERY,
      parameters: {},
      execute: async (
        _agent: Agent,
        _params: SkillParameters
      ): Promise<ActionResult> => {
        const events = Object.values(EventType);
        return {
          success: true,
          type: ActionResultType.SUCCESS,
          result: { events } as GenericData,
        };
      },
    };

    this.actions['getAvailableActions'] = {
      name: 'getAvailableActions',
      description: 'Get list of available action types',
      category: ActionCategory.QUERY,
      parameters: {},
      execute: async (
        _agent: Agent,
        _params: SkillParameters
      ): Promise<ActionResult> => {
        const actions = Object.values(ActionType);
        return {
          success: true,
          type: ActionResultType.SUCCESS,
          result: { actions } as GenericData,
        };
      },
    };

    runtimeLogger.info(
      `✅ Registered ${Object.keys(this.actions).length} RuneLite extension actions`
    );
  }
}

export function createRuneLiteExtension(
  config: RuneLiteConfig
): RuneLiteExtension {
  return new RuneLiteExtension(config);
}
