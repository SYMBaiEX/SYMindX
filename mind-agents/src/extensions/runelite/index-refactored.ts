import { EventEmitter } from 'events';

import { v4 as uuidv4 } from 'uuid';

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

// Import communication modules
import {
  RuneLiteWebSocketServer,
  RuneLiteCommandProcessor,
  RuneLiteEventProcessor,
  type WebSocketServerConfig,
  type CommandProcessorConfig,
  type EventProcessorConfig,
} from './communication/index.js';

// Import advanced features
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

// Import skills
import {
  DefaultRuneLiteSkillManager,
  SkillTrainerSkill,
  QuestManagerSkill,
  EconomicManagerSkill,
  SocialManagerSkill,
  PvPManagerSkill,
  SkillTrainingConfig,
  QuestCompletionConfig,
  EconomicManagementConfig,
  SocialInteractionConfig,
  PvPCombatConfig,
  AutonomousActivity,
  RiskLevel,
  QuestManagerConfig,
  EconomicManagerConfig,
  SocialManagerConfig,
  PvPManagerConfig,
  SocialActivity
} from './skills/index.js';

// Import types
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

  public config: RuneLiteConfig;
  
  // Communication modules
  private webSocketServer: RuneLiteWebSocketServer;
  private commandProcessor: RuneLiteCommandProcessor;
  private eventProcessor: RuneLiteEventProcessor;
  
  // Advanced systems
  private pathfinding?: PathfindingSystem;
  private macroSystem?: MacroSystem;
  private automationSystem?: AutomationSystem;
  private eventRecording?: EventRecordingSystem;
  private pluginBridge?: PluginBridgeSystem;
  private eventBatching?: EventBatchingSystem;
  private stateSync?: StateSyncSystem;
  
  // Skills system
  private skillManager: DefaultRuneLiteSkillManager;
  
  // Agent reference
  private agent?: Agent;
  
  // Protocol capabilities
  private protocolCapabilities: ProtocolCapabilities;

  constructor(config: RuneLiteConfig) {
    super();
    this.config = config;

    // Initialize communication modules
    this.webSocketServer = new RuneLiteWebSocketServer({
      port: config.settings?.port || 8080,
      host: config.settings?.host || 'localhost',
      maxConnections: 10,
      heartbeatInterval: config.settings?.heartbeatInterval || 30000,
      commandTimeout: config.settings?.commandTimeout || 10000,
      enableCompression: config.settings?.enableCompression || true,
      enableBatching: config.settings?.enableBatching || true,
    });

    this.commandProcessor = new RuneLiteCommandProcessor({
      maxQueueSize: 100,
      commandTimeout: 10000,
      retryAttempts: 3,
      enablePriority: true,
    });

    this.eventProcessor = new RuneLiteEventProcessor({
      maxEventQueueSize: 1000,
      batchSize: 50,
      batchInterval: 100,
      enableCompression: true,
      enableFiltering: true,
      eventWhitelist: config.settings?.eventWhitelist || [],
      eventBlacklist: config.settings?.eventBlacklist || [],
    });

    // Initialize skill manager
    this.skillManager = new DefaultRuneLiteSkillManager({
      maxConcurrentSkills: 5,
      skillTimeout: 30000,
    });

    // Initialize protocol capabilities
    this.protocolCapabilities = {
      version: '2.0.0',
      compression: config.settings?.enableCompression || false,
      batching: config.settings?.enableBatching || false,
      eventRecording: true,
      macroSystem: true,
      pathfinding: true,
      pluginBridge: true,
      stateSync: true,
      acknowledgments: true,
      priorities: true,
    };

    this.initializeAdvancedSystems();
    this.setupEventHandlers();
  }

  private initializeAdvancedSystems(): void {
    if (this.config.settings?.enablePathfinding) {
      this.pathfinding = new PathfindingSystem();
      runtimeLogger.info('🗺️ Pathfinding system initialized');
    }

    if (this.config.settings?.enableMacroSystem) {
      this.macroSystem = new MacroSystem();
      runtimeLogger.info('🎭 Macro system initialized');
    }

    if (this.config.settings?.enableAutomation) {
      this.automationSystem = new AutomationSystem();
      runtimeLogger.info('🤖 Automation system initialized');
    }

    if (this.config.settings?.enableEventRecording) {
      this.eventRecording = new EventRecordingSystem();
      runtimeLogger.info('📹 Event recording system initialized');
    }

    if (this.config.settings?.enablePluginBridge) {
      this.pluginBridge = new PluginBridgeSystem();
      runtimeLogger.info('🔌 Plugin bridge system initialized');
    }

    if (this.config.settings?.enableBatching) {
      this.eventBatching = new EventBatchingSystem();
      runtimeLogger.info('📦 Event batching system initialized');
    }

    this.stateSync = new StateSyncSystem();
    runtimeLogger.info('🔄 State sync system initialized');
  }

  private setupEventHandlers(): void {
    // WebSocket server events
    this.webSocketServer.on('clientConnected', (clientId: string) => {
      runtimeLogger.info(`🔗 Client connected: ${clientId}`);
      this.emit('clientConnected', clientId);
    });

    this.webSocketServer.on('clientDisconnected', (clientId: string) => {
      runtimeLogger.info(`🔌 Client disconnected: ${clientId}`);
      this.emit('clientDisconnected', clientId);
    });

    this.webSocketServer.on('gameEvent', (clientId: string, event: GameEvent) => {
      this.handleGameEvent(clientId, event);
    });

    this.webSocketServer.on('command', (clientId: string, command: any) => {
      this.handleCommand(clientId, command);
    });

    this.webSocketServer.on('eventBatch', (clientId: string, batch: EventBatch) => {
      this.handleEventBatch(clientId, batch);
    });

    // Event processor events
    this.eventProcessor.on('playerLogin', (data: any) => {
      runtimeLogger.info('👤 Player login detected');
      this.emit('playerLogin', data);
    });

    this.eventProcessor.on('playerLogout', (data: any) => {
      runtimeLogger.info('👤 Player logout detected');
      this.emit('playerLogout', data);
    });

    this.eventProcessor.on('combatStart', (data: any) => {
      runtimeLogger.info('⚔️ Combat start detected');
      this.emit('combatStart', data);
    });

    this.eventProcessor.on('combatEnd', (data: any) => {
      runtimeLogger.info('⚔️ Combat end detected');
      this.emit('combatEnd', data);
    });

    this.eventProcessor.on('skillExpGained', (data: any) => {
      runtimeLogger.debug('📈 Skill exp gained');
      this.emit('skillExpGained', data);
    });

    this.eventProcessor.on('questCompleted', (data: any) => {
      runtimeLogger.info('🎯 Quest completed');
      this.emit('questCompleted', data);
    });

    this.eventProcessor.on('locationChanged', (data: any) => {
      runtimeLogger.debug('📍 Location changed');
      this.emit('locationChanged', data);
    });
  }

  async init(agent: Agent): Promise<void> {
    this.agent = agent;
    this.status = ExtensionStatus.STARTING;

    try {
      // Start WebSocket server
      await this.webSocketServer.start();

      // Initialize command processor
      this.commandProcessor.registerDefaultHandlers();

      // Initialize event processor
      this.eventProcessor.registerDefaultHandlers();

      // Initialize skills
      await this.initializeSkills(agent);

      // Register extension actions
      this.registerExtensionActions();

      this.status = ExtensionStatus.RUNNING;
      runtimeLogger.info('🚀 RuneLite extension initialized successfully');

    } catch (error) {
      this.status = ExtensionStatus.ERROR;
      runtimeLogger.error('❌ Failed to initialize RuneLite extension:', error);
      throw error;
    }
  }

  private async initializeSkills(agent: Agent): Promise<void> {
    // Initialize skill trainer
    const skillTrainer = new SkillTrainerSkill({
      name: 'skill-trainer',
      description: 'Autonomous skill training system',
      enabled: true,
    });
    skillTrainer.updateGameState(this.eventProcessor.getGameState());
    this.skillManager.registerSkill(skillTrainer);

    // Initialize quest manager
    const questManager = new QuestManagerSkill({
      name: 'quest-manager',
      description: 'Quest completion automation',
      enabled: true,
    });
    questManager.updateGameState(this.eventProcessor.getGameState());
    this.skillManager.registerSkill(questManager);

    // Initialize economic manager
    const economicManager = new EconomicManagerSkill({
      name: 'economic-manager',
      description: 'Economic management and trading',
      enabled: true,
    });
    economicManager.updateGameState(this.eventProcessor.getGameState());
    this.skillManager.registerSkill(economicManager);

    // Initialize social manager
    const socialManager = new SocialManagerSkill({
      name: 'social-manager',
      description: 'Social interaction management',
      enabled: true,
    });
    socialManager.updateGameState(this.eventProcessor.getGameState());
    this.skillManager.registerSkill(socialManager);

    // Initialize PvP manager
    const pvpManager = new PvPManagerSkill({
      name: 'pvp-manager',
      description: 'PvP combat automation',
      enabled: true,
    });
    pvpManager.updateGameState(this.eventProcessor.getGameState());
    this.skillManager.registerSkill(pvpManager);

    runtimeLogger.info('🎯 Skills system initialized');
  }

  async tick(agent: Agent): Promise<void> {
    if (this.status !== ExtensionStatus.RUNNING) return;

    try {
      // Process command queue
      await this.commandProcessor.processCommandQueue();

      // Update game state tracking
      this.updateGameStateTracking();

      // Update autonomous game state
      this.updateAutonomousGameState();

      // Clean up event queue
      this.cleanupEventQueue();

    } catch (error) {
      runtimeLogger.error('Error in RuneLite extension tick:', error);
    }
  }

  async cleanup(): Promise<void> {
    this.status = ExtensionStatus.STOPPING;

    try {
      // Stop WebSocket server
      await this.webSocketServer.stop();

      // Clear command queue
      this.commandProcessor.clearQueue();

      // Clear event queue
      this.eventProcessor.clearEventQueue();

      // Cleanup skills
      await this.skillManager.cleanup();

      // Cleanup advanced systems
      if (this.pathfinding) {
        // Cleanup pathfinding
      }
      if (this.macroSystem) {
        // Cleanup macro system
      }
      if (this.automationSystem) {
        // Cleanup automation system
      }
      if (this.eventRecording) {
        // Cleanup event recording
      }
      if (this.pluginBridge) {
        // Cleanup plugin bridge
      }
      if (this.eventBatching) {
        // Cleanup event batching
      }
      if (this.stateSync) {
        // Cleanup state sync
      }

      this.status = ExtensionStatus.STOPPED;
      runtimeLogger.info('🧹 RuneLite extension cleaned up');

    } catch (error) {
      runtimeLogger.error('Error cleaning up RuneLite extension:', error);
      throw error;
    }
  }

  // Autonomous activity methods
  async startAutonomousSkillTraining(config: SkillTrainingConfig): Promise<AutonomousActivity> {
    const skillTrainer = this.skillManager.getSkill('skill-trainer') as SkillTrainerSkill;
    if (!skillTrainer) {
      throw new Error('Skill trainer not available');
    }
    return await skillTrainer.startSkillTraining(config);
  }

  async startAutonomousQuestCompletion(config: QuestCompletionConfig): Promise<AutonomousActivity> {
    const questManager = this.skillManager.getSkill('quest-manager') as QuestManagerSkill;
    if (!questManager) {
      throw new Error('Quest manager not available');
    }
    return await questManager.startQuestCompletion(config);
  }

  async startAutonomousEconomicManagement(config: EconomicManagementConfig): Promise<AutonomousActivity> {
    const economicManager = this.skillManager.getSkill('economic-manager') as EconomicManagerSkill;
    if (!economicManager) {
      throw new Error('Economic manager not available');
    }
    return await economicManager.startEconomicManagement(config);
  }

  async startAutonomousSocialInteraction(config: SocialInteractionConfig): Promise<AutonomousActivity> {
    const socialManager = this.skillManager.getSkill('social-manager') as SocialManagerSkill;
    if (!socialManager) {
      throw new Error('Social manager not available');
    }
    return await socialManager.startSocialInteraction(config);
  }

  async startAutonomousPvPCombat(config: PvPCombatConfig): Promise<AutonomousActivity> {
    const pvpManager = this.skillManager.getSkill('pvp-manager') as PvPManagerSkill;
    if (!pvpManager) {
      throw new Error('PvP manager not available');
    }
    return await pvpManager.startPvPCombat(config);
  }

  async getAutonomousStatus(): Promise<Record<string, any>> {
    const status: Record<string, any> = {
      skillTraining: [],
      questCompletion: [],
      economicManagement: [],
      socialInteraction: [],
      pvpCombat: []
    };

    const skillTrainer = this.skillManager.getSkill('skill-trainer') as SkillTrainerSkill;
    if (skillTrainer) {
      status['skillTraining'] = skillTrainer.getAllActivities();
    }

    const questManager = this.skillManager.getSkill('quest-manager') as QuestManagerSkill;
    if (questManager) {
      status['questCompletion'] = questManager.getAllActivities();
    }

    const economicManager = this.skillManager.getSkill('economic-manager') as EconomicManagerSkill;
    if (economicManager) {
      status['economicManagement'] = economicManager.getAllActivities();
    }

    const socialManager = this.skillManager.getSkill('social-manager') as SocialManagerSkill;
    if (socialManager) {
      status['socialInteraction'] = socialManager.getAllActivities();
    }

    const pvpManager = this.skillManager.getSkill('pvp-manager') as PvPManagerSkill;
    if (pvpManager) {
      status['pvpCombat'] = pvpManager.getAllActivities();
    }

    return status;
  }

  async stopAutonomousActivity(activityType: string, activityId?: string): Promise<boolean> {
    let stopped = false;

    switch (activityType) {
      case 'skill_training': {
        const skillTrainer = this.skillManager.getSkill('skill-trainer') as SkillTrainerSkill;
        if (skillTrainer) {
          if (activityId) {
            stopped = skillTrainer.stopActivity(activityId);
          } else {
            skillTrainer.getActiveActivities().forEach(activity => {
              skillTrainer.stopActivity(activity.id);
            });
            stopped = true;
          }
        }
        break;
      }
      case 'quest_completion': {
        const questManager = this.skillManager.getSkill('quest-manager') as QuestManagerSkill;
        if (questManager) {
          if (activityId) {
            stopped = questManager.stopActivity(activityId);
          } else {
            questManager.getActiveActivities().forEach(activity => {
              questManager.stopActivity(activity.id);
            });
            stopped = true;
          }
        }
        break;
      }
      case 'economic_management': {
        const economicManager = this.skillManager.getSkill('economic-manager') as EconomicManagerSkill;
        if (economicManager) {
          if (activityId) {
            stopped = economicManager.stopActivity(activityId);
          } else {
            economicManager.getActiveActivities().forEach(activity => {
              economicManager.stopActivity(activity.id);
            });
            stopped = true;
          }
        }
        break;
      }
      case 'social_interaction': {
        const socialManager = this.skillManager.getSkill('social-manager') as SocialManagerSkill;
        if (socialManager) {
          if (activityId) {
            stopped = socialManager.stopActivity(activityId);
          } else {
            socialManager.getActiveActivities().forEach(activity => {
              socialManager.stopActivity(activity.id);
            });
            stopped = true;
          }
        }
        break;
      }
      case 'pvp_combat': {
        const pvpManager = this.skillManager.getSkill('pvp-manager') as PvPManagerSkill;
        if (pvpManager) {
          if (activityId) {
            stopped = pvpManager.stopActivity(activityId);
          } else {
            pvpManager.getActiveActivities().forEach(activity => {
              pvpManager.stopActivity(activity.id);
            });
            stopped = true;
          }
        }
        break;
      }
    }

    return stopped;
  }

  // Public API methods
  public getGameState(): GameState {
    return this.eventProcessor.getGameState();
  }

  public updatePlayerInfo(playerInfo: Partial<PlayerInfo>): void {
    const currentState = this.eventProcessor.getGameState();
    this.eventProcessor.updateGameState({
      ...currentState,
      player: { ...currentState.player, ...playerInfo },
    });
  }

  public updateInventory(inventory: InventoryItem[]): void {
    const currentState = this.eventProcessor.getGameState();
    this.eventProcessor.updateGameState({
      ...currentState,
      inventory,
    });
  }

  public updateSkills(skills: SkillInfo[]): void {
    const currentState = this.eventProcessor.getGameState();
    this.eventProcessor.updateGameState({
      ...currentState,
      skills,
    });
  }

  public addEventListener(
    eventType: EventType,
    handler: (event: GameEvent) => void
  ): void {
    this.eventProcessor.addEventHandler({
      id: `custom-${eventType}-${Date.now()}`,
      eventType,
      priority: EventPriority.NORMAL,
      enabled: true,
      handler: async (event: GameEvent) => {
        handler(event);
      },
      metadata: {},
    });
  }

  public removeEventListener(
    eventType: EventType,
    handler: (event: GameEvent) => void
  ): void {
    // Implementation would need to track handler references
    // For now, this is a placeholder
  }

  public queueCommand(
    action: ActionType,
    args?: Record<string, unknown>,
    options?: {
      timeout?: number;
      priority?: number;
      callback?: (result: any) => void;
    }
  ): string {
    return this.commandProcessor.queueCommand(action, args, options);
  }

  public getConnectedClients(): string[] {
    return this.webSocketServer.getConnectedClients();
  }

  public getClientInfo(clientId: string): any {
    return this.webSocketServer.getClientInfo(clientId);
  }

  public disconnectClient(
    clientId: string,
    reason = 'Server request'
  ): boolean {
    return this.webSocketServer.disconnectClient(clientId, reason);
  }

  // Private helper methods
  private async handleGameEvent(clientId: string, event: GameEvent): Promise<void> {
    this.eventProcessor.processEvent(event);
  }

  private async handleCommand(clientId: string, command: any): Promise<void> {
    // Handle incoming commands from clients
    runtimeLogger.debug(`📨 Received command from ${clientId}:`, command);
  }

  private async handleEventBatch(clientId: string, batch: EventBatch): Promise<void> {
    this.eventProcessor.processEventBatch(batch);
  }

  private updateGameStateTracking(): void {
    // Update game state tracking logic
    const currentState = this.eventProcessor.getGameState();
    
    // Update skills with current game state
    this.skillManager.getAllSkills().forEach(skill => {
      if ('updateGameState' in skill) {
        (skill as any).updateGameState(currentState);
      }
    });
  }

  private updateAutonomousGameState(): void {
    // Update autonomous game state logic
  }

  private cleanupEventQueue(): void {
    // Cleanup event queue logic
  }

  private registerExtensionActions(): void {
    // Register core extension actions
    this.registerCoreActions();
    
    // Register skill actions
    this.registerSkillActions();
  }

  private registerCoreActions(): void {
    // Movement actions
    this.actions['walkTo'] = {
      name: 'walkTo',
      description: 'Walk to a specific location',
      category: ActionCategory.MOVEMENT,
      parameters: {
        x: { type: 'number', required: true },
        y: { type: 'number', required: true },
        plane: { type: 'number', required: false },
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

    // Game state query actions
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
            player: this.getGameState().player,
          } as unknown as GenericData,
        };
      },
    };

    // Client management actions
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
  }

  private registerSkillActions(): void {
    // Get all actions from the skill manager
    const skillActions = this.skillManager.getAllActions();
    
    // Register skill actions
    for (const action of skillActions) {
      if (this.actions[action.name]) {
        runtimeLogger.warn(`⚠️ Action ${action.name} already exists, skipping skill action`);
        continue;
      }
      this.actions[action.name] = action;
    }

    runtimeLogger.info(`📋 Registered ${skillActions.length} skill-based actions`);
  }
}

export function createRuneLiteExtension(
  config: RuneLiteConfig
): RuneLiteExtension {
  return new RuneLiteExtension(config);
} 