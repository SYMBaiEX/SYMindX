import { EventEmitter } from 'events';
import { runtimeLogger } from '../../../utils/logger.js';
import {
  GameEvent,
  EventType,
  EventPriority,
  EventBatch,
  GameState,
  PlayerInfo,
  InventoryItem,
  SkillInfo,
  CombatInfo,
  QuestInfo,
} from '../types.js';
import {
  EventProcessorConfig,
  EventHandler,
  EventCondition,
  GameStateData,
  PlayerLoginData,
  PlayerLogoutData,
  CombatStartData,
  CombatEndData,
  SkillExpGainedData,
  QuestCompletedData,
  LocationChangedData,
} from './types.js';

export class RuneLiteEventProcessor extends EventEmitter {
  private eventQueue: GameEvent[] = [];
  private eventHandlers = new Map<EventType, EventHandler[]>();
  private gameState: GameStateData;
  private config: EventProcessorConfig;
  private batchTimer?: NodeJS.Timeout;
  private processingEvents = false;

  constructor(config: EventProcessorConfig = {}) {
    super();
    this.config = {
      maxEventQueueSize: 1000,
      batchSize: 50,
      batchInterval: 100,
      enableCompression: true,
      enableFiltering: true,
      eventWhitelist: [],
      eventBlacklist: [],
      ...config,
    };

    this.gameState = this.getInitialGameState();
  }

  public addEventHandler(handler: EventHandler): void {
    const handlers = this.eventHandlers.get(handler.eventType) || [];
    handlers.push(handler);
    
    // Sort by priority (higher priority first)
    handlers.sort((a, b) => b.priority - a.priority);
    
    this.eventHandlers.set(handler.eventType, handlers);
    runtimeLogger.debug(`📝 Registered event handler: ${handler.id} for ${handler.eventType}`);
  }

  public removeEventHandler(handlerId: string): boolean {
    for (const [eventType, handlers] of this.eventHandlers) {
      const index = handlers.findIndex(h => h.id === handlerId);
      if (index !== -1) {
        handlers.splice(index, 1);
        runtimeLogger.debug(`📝 Removed event handler: ${handlerId} from ${eventType}`);
        return true;
      }
    }
    return false;
  }

  public processEvent(event: GameEvent): void {
    // Apply filtering
    if (this.shouldFilterEvent(event)) {
      return;
    }

    // Add to queue
    this.eventQueue.push(event);

    // Check queue size limit
    if (this.eventQueue.length > this.config.maxEventQueueSize!) {
      this.eventQueue.shift(); // Remove oldest event
      runtimeLogger.warn('⚠️ Event queue full, dropping oldest event');
    }

    // Update game state from event
    this.updateGameStateFromEvent(event);

    // Emit event for external listeners
    this.emit('eventReceived', event);

    // Start batch processing if not already running
    if (!this.processingEvents) {
      this.startBatchProcessing();
    }
  }

  public processEventBatch(batch: EventBatch): void {
    for (const event of batch.events) {
      this.processEvent(event);
    }
  }

  public getGameState(): GameStateData {
    return { ...this.gameState };
  }

  public updateGameState(newState: Partial<GameStateData>): void {
    this.gameState = { ...this.gameState, ...newState };
    this.emit('gameStateUpdated', this.gameState);
  }

  public getEventQueueStatus(): {
    queueLength: number;
    handlersCount: number;
    processingEvents: boolean;
  } {
    return {
      queueLength: this.eventQueue.length,
      handlersCount: this.getTotalHandlerCount(),
      processingEvents: this.processingEvents,
    };
  }

  public clearEventQueue(): void {
    this.eventQueue = [];
    runtimeLogger.info('🗑️ Event queue cleared');
  }

  public getEventHandlers(eventType: EventType): EventHandler[] {
    return this.eventHandlers.get(eventType) || [];
  }

  public enableEventHandler(handlerId: string): boolean {
    for (const handlers of this.eventHandlers.values()) {
      const handler = handlers.find(h => h.id === handlerId);
      if (handler) {
        handler.enabled = true;
        runtimeLogger.debug(`✅ Enabled event handler: ${handlerId}`);
        return true;
      }
    }
    return false;
  }

  public disableEventHandler(handlerId: string): boolean {
    for (const handlers of this.eventHandlers.values()) {
      const handler = handlers.find(h => h.id === handlerId);
      if (handler) {
        handler.enabled = false;
        runtimeLogger.debug(`❌ Disabled event handler: ${handlerId}`);
        return true;
      }
    }
    return false;
  }

  private startBatchProcessing(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }

    this.batchTimer = setTimeout(() => {
      this.processEventBatch();
    }, this.config.batchInterval);
  }

  private async processEventBatch(): Promise<void> {
    if (this.processingEvents || this.eventQueue.length === 0) {
      return;
    }

    this.processingEvents = true;

    try {
      const batchSize = Math.min(this.config.batchSize!, this.eventQueue.length);
      const batch = this.eventQueue.splice(0, batchSize);

      runtimeLogger.debug(`🔄 Processing batch of ${batch.length} events`);

      for (const event of batch) {
        await this.processSingleEvent(event);
      }

      // Emit batch processed event
      this.emit('batchProcessed', batch);

    } catch (error) {
      runtimeLogger.error('Error processing event batch:', error);
      this.emit('batchError', error);
    } finally {
      this.processingEvents = false;

      // Continue processing if there are more events
      if (this.eventQueue.length > 0) {
        this.startBatchProcessing();
      }
    }
  }

  private async processSingleEvent(event: GameEvent): Promise<void> {
    const handlers = this.eventHandlers.get(event.type) || [];

    for (const handler of handlers) {
      if (!handler.enabled) continue;

      // Check conditions
      if (handler.conditions && !this.evaluateConditions(handler.conditions)) {
        continue;
      }

      try {
        await handler.handler(event);
        runtimeLogger.debug(`✅ Processed event ${event.type} with handler ${handler.id}`);
      } catch (error) {
        runtimeLogger.error(`❌ Error in event handler ${handler.id} for event ${event.type}:`, error);
        this.emit('handlerError', handler, event, error);
      }
    }
  }

  private shouldFilterEvent(event: GameEvent): boolean {
    if (!this.config.enableFiltering) return false;

    // Check whitelist
    if (this.config.eventWhitelist!.length > 0) {
      return !this.config.eventWhitelist!.includes(event.type);
    }

    // Check blacklist
    if (this.config.eventBlacklist!.includes(event.type)) {
      return true;
    }

    return false;
  }

  private evaluateConditions(conditions: EventCondition[]): boolean {
    for (const condition of conditions) {
      if (!condition.evaluate(this.gameState)) {
        return false;
      }
    }
    return true;
  }

  private updateGameStateFromEvent(event: GameEvent): void {
    switch (event.type) {
      case EventType.PLAYER_LOGIN:
        this.updatePlayerInfo(event.data as Partial<PlayerInfo>);
        break;
      case EventType.PLAYER_LOGOUT:
        this.gameState.isLoggedIn = false;
        break;
      case EventType.ITEM_ADDED:
      case EventType.ITEM_REMOVED:
        this.updateInventory(event.data as InventoryItem[]);
        break;
      case EventType.SKILL_EXP_GAINED:
        this.updateSkills(event.data as SkillInfo[]);
        break;
      case EventType.COMBAT_START:
      case EventType.COMBAT_END:
        this.updateCombatInfo(event.data as CombatInfo);
        break;
      case EventType.PLAYER_QUEST_COMPLETE:
        this.updateQuestInfo(event.data as QuestInfo);
        break;
      case EventType.LOCATION_CHANGED:
        this.updateLocation(event.data as { x: number; y: number; plane: number; region: number });
        break;
    }

    this.gameState.timestamp = Date.now();
  }

  private updatePlayerInfo(playerInfo: Partial<PlayerLoginData>): void {
    if (this.gameState.player) {
      this.gameState.player = { ...this.gameState.player, ...playerInfo };
    } else {
      this.gameState.player = playerInfo as PlayerLoginData;
    }
    this.gameState.isLoggedIn = true;
  }

  private updateInventory(inventory: InventoryItem[]): void {
    this.gameState.inventory = inventory;
  }

  private updateSkills(skills: SkillInfo[]): void {
    this.gameState.skills = skills;
  }

  private updateCombatInfo(combatInfo: CombatInfo): void {
    this.gameState.combat = combatInfo;
  }

  private updateQuestInfo(questInfo: QuestInfo): void {
    const existingQuestIndex = this.gameState.quests.findIndex(q => q.id === questInfo.id);
    if (existingQuestIndex !== -1) {
      this.gameState.quests[existingQuestIndex] = questInfo;
    } else {
      this.gameState.quests.push(questInfo);
    }
  }

  private updateLocation(location: { x: number; y: number; plane: number; region: number }): void {
    this.gameState.location = location;
  }

  private getTotalHandlerCount(): number {
    let count = 0;
    for (const handlers of this.eventHandlers.values()) {
      count += handlers.length;
    }
    return count;
  }

  private getInitialGameState(): GameStateData {
    return {
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
  }

  // Default event handlers
  public registerDefaultHandlers(): void {
    // Player events
    this.addEventHandler({
      id: 'player-login-handler',
      eventType: EventType.PLAYER_LOGIN,
      priority: EventPriority.HIGH,
      enabled: true,
      handler: async (event: GameEvent) => {
        runtimeLogger.info('👤 Player logged in');
        this.emit('playerLogin', event.data);
      },
      metadata: {},
    });

    this.addEventHandler({
      id: 'player-logout-handler',
      eventType: EventType.PLAYER_LOGOUT,
      priority: EventPriority.HIGH,
      enabled: true,
      handler: async (event: GameEvent) => {
        runtimeLogger.info('👤 Player logged out');
        this.emit('playerLogout', event.data);
      },
      metadata: {},
    });

    // Combat events
    this.addEventHandler({
      id: 'combat-start-handler',
      eventType: EventType.COMBAT_START,
      priority: EventPriority.HIGH,
      enabled: true,
      handler: async (event: GameEvent) => {
        runtimeLogger.info('⚔️ Combat started');
        this.emit('combatStart', event.data);
      },
      metadata: {},
    });

    this.addEventHandler({
      id: 'combat-end-handler',
      eventType: EventType.COMBAT_END,
      priority: EventPriority.HIGH,
      enabled: true,
      handler: async (event: GameEvent) => {
        runtimeLogger.info('⚔️ Combat ended');
        this.emit('combatEnd', event.data);
      },
      metadata: {},
    });

    // Skill events
    this.addEventHandler({
      id: 'skill-exp-handler',
      eventType: EventType.SKILL_EXP_GAINED,
      priority: EventPriority.NORMAL,
      enabled: true,
      handler: async (event: GameEvent) => {
        const { skillName, experience, level } = event.data as any;
        runtimeLogger.debug(`📈 Skill exp gained: ${skillName} +${experience} (Level ${level})`);
        this.emit('skillExpGained', event.data);
      },
      metadata: {},
    });

    // Quest events
    this.addEventHandler({
      id: 'quest-complete-handler',
      eventType: EventType.PLAYER_QUEST_COMPLETE,
      priority: EventPriority.HIGH,
      enabled: true,
      handler: async (event: GameEvent) => {
        const { questName } = event.data as any;
        runtimeLogger.info(`🎯 Quest completed: ${questName}`);
        this.emit('questCompleted', event.data);
      },
      metadata: {},
    });

    // Location events
    this.addEventHandler({
      id: 'location-change-handler',
      eventType: EventType.LOCATION_CHANGED,
      priority: EventPriority.NORMAL,
      enabled: true,
      handler: async (event: GameEvent) => {
        const { x, y, plane, region } = event.data as any;
        runtimeLogger.debug(`📍 Location changed: ${x}, ${y}, ${plane} (Region ${region})`);
        this.emit('locationChanged', event.data);
      },
      metadata: {},
    });

    runtimeLogger.info('📝 Registered default event handlers');
  }
} 