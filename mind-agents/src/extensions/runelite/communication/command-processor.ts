import { runtimeLogger } from '../../../utils/logger.js';
import {
  RuneLiteCommand,
  ActionType,
  RuneLiteErrorType,
  WebSocketMessage,
} from '../types.js';
import {
  CommandProcessorConfig,
  CommandResult,
  CommandResultData,
  CommandOptions,
} from './types.js';

export class RuneLiteCommandProcessor {
  private commandQueue: RuneLiteCommand[] = [];
  private processingCommands = new Map<string, Promise<CommandResult>>();
  private config: CommandProcessorConfig;
  private commandHandlers = new Map<ActionType, (command: RuneLiteCommand) => Promise<CommandResult>>();

  constructor(config: CommandProcessorConfig = {}) {
    this.config = {
      maxQueueSize: 100,
      commandTimeout: 10000,
      retryAttempts: 3,
      enablePriority: true,
      ...config,
    };
  }

  public queueCommand(
    action: ActionType,
    args?: Record<string, unknown>,
    options?: CommandOptions
  ): string {
    const commandId = this.generateCommandId();
    const command: RuneLiteCommand = {
      id: commandId,
      name: action,
      action,
      args: args || {},
      timestamp: Date.now(),
      timeout: options?.timeout || this.config.commandTimeout,
      priority: options?.priority || 0,
      retries: 0,
      callback: options?.callback as ((result: CommandResult) => void) | undefined,
    };

    // Add to queue with priority if enabled
    if (this.config.enablePriority && command.priority > 0) {
      this.insertWithPriority(command);
    } else {
      this.commandQueue.push(command);
    }

    runtimeLogger.debug(`📋 Queued command: ${action} (ID: ${commandId})`);
    return commandId;
  }

  public async processCommandQueue(): Promise<void> {
    if (this.commandQueue.length === 0) return;

    const command = this.commandQueue.shift();
    if (!command) return;

    try {
      const result = await this.executeCommand(command);
      this.handleCommandResult(command, result);
    } catch (error) {
      runtimeLogger.error(`Failed to execute command ${command.id}:`, error);
      this.handleCommandError(command, error as Error);
    }
  }

  public async executeCommand(command: RuneLiteCommand): Promise<CommandResult> {
    const startTime = Date.now();
    
    // Check if command is already being processed
    if (this.processingCommands.has(command.id)) {
      return this.processingCommands.get(command.id)!;
    }

    // Create processing promise
    const processingPromise = this.executeCommandInternal(command);
    this.processingCommands.set(command.id, processingPromise);

    try {
      const result = await processingPromise;
      const executionTime = Date.now() - startTime;
      
      return {
        ...result,
        commandId: command.id,
        executionTime,
      };
    } finally {
      this.processingCommands.delete(command.id);
    }
  }

  private async executeCommandInternal(command: RuneLiteCommand): Promise<CommandResult> {
    const handler = this.commandHandlers.get(command.action);
    if (!handler) {
      return {
        success: false,
        error: `No handler for action: ${command.action}`,
        commandId: command.id,
        executionTime: 0,
      };
    }

    try {
      const result = await handler(command);
      return {
        ...result,
        commandId: command.id,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        commandId: command.id,
        executionTime: 0,
      };
    }
  }

  public registerCommandHandler(
    action: ActionType,
    handler: (command: RuneLiteCommand) => Promise<CommandResult>
  ): void {
    this.commandHandlers.set(action, handler);
    runtimeLogger.debug(`🔧 Registered command handler for: ${action}`);
  }

  public unregisterCommandHandler(action: ActionType): void {
    this.commandHandlers.delete(action);
    runtimeLogger.debug(`🔧 Unregistered command handler for: ${action}`);
  }

  public getQueueStatus(): {
    queueLength: number;
    processingCount: number;
    handlersCount: number;
  } {
    return {
      queueLength: this.commandQueue.length,
      processingCount: this.processingCommands.size,
      handlersCount: this.commandHandlers.size,
    };
  }

  public clearQueue(): void {
    this.commandQueue = [];
    runtimeLogger.info('🗑️ Command queue cleared');
  }

  public getCommandById(commandId: string): RuneLiteCommand | null {
    return this.commandQueue.find(cmd => cmd.id === commandId) || null;
  }

  public cancelCommand(commandId: string): boolean {
    const index = this.commandQueue.findIndex(cmd => cmd.id === commandId);
    if (index !== -1) {
      this.commandQueue.splice(index, 1);
      runtimeLogger.info(`❌ Cancelled command: ${commandId}`);
      return true;
    }
    return false;
  }

  private insertWithPriority(command: RuneLiteCommand): void {
    // Find the correct position based on priority (higher priority first)
    let insertIndex = 0;
    for (let i = 0; i < this.commandQueue.length; i++) {
      if (this.commandQueue[i].priority < command.priority) {
        insertIndex = i;
        break;
      }
      insertIndex = i + 1;
    }
    
    this.commandQueue.splice(insertIndex, 0, command);
  }

  private handleCommandResult(command: RuneLiteCommand, result: CommandResult): void {
    if (command.callback) {
      try {
        command.callback(result);
      } catch (error) {
        runtimeLogger.error(`Error in command callback for ${command.id}:`, error);
      }
    }

    if (result.success) {
      runtimeLogger.debug(`✅ Command executed successfully: ${command.action} (${result.executionTime}ms)`);
    } else {
      runtimeLogger.warn(`❌ Command failed: ${command.action} - ${result.error}`);
    }
  }

  private handleCommandError(command: RuneLiteCommand, error: Error): void {
    // Retry logic
    if (command.retries < (this.config.retryAttempts || 3)) {
      command.retries++;
      command.timestamp = Date.now();
      
      // Re-queue with lower priority
      command.priority = Math.max(0, command.priority - 1);
      this.commandQueue.unshift(command);
      
      runtimeLogger.warn(`🔄 Retrying command ${command.id} (attempt ${command.retries})`);
    } else {
      const result: CommandResult = {
        success: false,
        error: error.message,
        commandId: command.id,
        executionTime: 0,
      };
      
      this.handleCommandResult(command, result);
    }
  }

  private generateCommandId(): string {
    return `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Default command handlers
  public registerDefaultHandlers(): void {
    // Movement commands
    this.registerCommandHandler(ActionType.WALK_TO, this.handleWalkTo.bind(this));
    this.registerCommandHandler(ActionType.RUN_TO, this.handleRunTo.bind(this));
    this.registerCommandHandler(ActionType.TELEPORT_TO, this.handleTeleportTo.bind(this));

    // Interaction commands
    this.registerCommandHandler(ActionType.CLICK_OBJECT, this.handleClickObject.bind(this));
    this.registerCommandHandler(ActionType.CLICK_NPC, this.handleClickNPC.bind(this));
    this.registerCommandHandler(ActionType.CLICK_ITEM, this.handleClickItem.bind(this));
    this.registerCommandHandler(ActionType.USE_ITEM, this.handleUseItem.bind(this));
    this.registerCommandHandler(ActionType.EXAMINE, this.handleExamine.bind(this));

    // Combat commands
    this.registerCommandHandler(ActionType.ATTACK_NPC, this.handleAttackNPC.bind(this));
    this.registerCommandHandler(ActionType.ACTIVATE_PRAYER, this.handleActivatePrayer.bind(this));
    this.registerCommandHandler(ActionType.EAT_FOOD, this.handleEatFood.bind(this));

    // Skill commands
    this.registerCommandHandler(ActionType.FISH, this.handleFish.bind(this));
    this.registerCommandHandler(ActionType.MINE, this.handleMine.bind(this));
    this.registerCommandHandler(ActionType.WOODCUT, this.handleWoodcut.bind(this));

    // Banking commands
    this.registerCommandHandler(ActionType.OPEN_BANK, this.handleOpenBank.bind(this));
    this.registerCommandHandler(ActionType.DEPOSIT_ITEM, this.handleDepositItem.bind(this));
    this.registerCommandHandler(ActionType.WITHDRAW_ITEM, this.handleWithdrawItem.bind(this));

    // Interface commands
    this.registerCommandHandler(ActionType.SEND_CHAT, this.handleSendChat.bind(this));
    this.registerCommandHandler(ActionType.LOGOUT, this.handleLogout.bind(this));

    runtimeLogger.info('🔧 Registered default command handlers');
  }

  // Default command handler implementations
  private async handleWalkTo(command: RuneLiteCommand): Promise<CommandResult> {
    const { x, y, plane = 0 } = command.args;
    return {
      success: true,
      data: { action: 'walk_to', x, y, plane },
      commandId: command.id,
      executionTime: 0,
    };
  }

  private async handleRunTo(command: RuneLiteCommand): Promise<CommandResult> {
    const { x, y, plane = 0 } = command.args;
    return {
      success: true,
      data: { action: 'run_to', x, y, plane },
      commandId: command.id,
      executionTime: 0,
    };
  }

  private async handleTeleportTo(command: RuneLiteCommand): Promise<CommandResult> {
    const { destination } = command.args;
    return {
      success: true,
      data: { action: 'teleport_to', destination },
      commandId: command.id,
      executionTime: 0,
    };
  }

  private async handleClickObject(command: RuneLiteCommand): Promise<CommandResult> {
    const { objectId, action = 'click' } = command.args;
    return {
      success: true,
      data: { action: 'click_object', objectId, action },
      commandId: command.id,
      executionTime: 0,
    };
  }

  private async handleClickNPC(command: RuneLiteCommand): Promise<CommandResult> {
    const { npcId, action = 'click' } = command.args;
    return {
      success: true,
      data: { action: 'click_npc', npcId, action },
      commandId: command.id,
      executionTime: 0,
    };
  }

  private async handleClickItem(command: RuneLiteCommand): Promise<CommandResult> {
    const { itemId, slot, action = 'click' } = command.args;
    return {
      success: true,
      data: { action: 'click_item', itemId, slot, action },
      commandId: command.id,
      executionTime: 0,
    };
  }

  private async handleUseItem(command: RuneLiteCommand): Promise<CommandResult> {
    const { itemId, slot } = command.args;
    return {
      success: true,
      data: { action: 'use_item', itemId, slot },
      commandId: command.id,
      executionTime: 0,
    };
  }

  private async handleExamine(command: RuneLiteCommand): Promise<CommandResult> {
    const { targetId, targetType } = command.args;
    return {
      success: true,
      data: { action: 'examine', targetId, targetType },
      commandId: command.id,
      executionTime: 0,
    };
  }

  private async handleAttackNPC(command: RuneLiteCommand): Promise<CommandResult> {
    const { npcId } = command.args;
    return {
      success: true,
      data: { action: 'attack_npc', npcId },
      commandId: command.id,
      executionTime: 0,
    };
  }

  private async handleActivatePrayer(command: RuneLiteCommand): Promise<CommandResult> {
    const { prayerName } = command.args;
    return {
      success: true,
      data: { action: 'activate_prayer', prayerName },
      commandId: command.id,
      executionTime: 0,
    };
  }

  private async handleEatFood(command: RuneLiteCommand): Promise<CommandResult> {
    const { itemId, slot } = command.args;
    return {
      success: true,
      data: { action: 'eat_food', itemId, slot },
      commandId: command.id,
      executionTime: 0,
    };
  }

  private async handleFish(command: RuneLiteCommand): Promise<CommandResult> {
    const { spotId, toolId } = command.args;
    return {
      success: true,
      data: { action: 'fish', spotId, toolId },
      commandId: command.id,
      executionTime: 0,
    };
  }

  private async handleMine(command: RuneLiteCommand): Promise<CommandResult> {
    const { rockId, toolId } = command.args;
    return {
      success: true,
      data: { action: 'mine', rockId, toolId },
      commandId: command.id,
      executionTime: 0,
    };
  }

  private async handleWoodcut(command: RuneLiteCommand): Promise<CommandResult> {
    const { treeId, toolId } = command.args;
    return {
      success: true,
      data: { action: 'woodcut', treeId, toolId },
      commandId: command.id,
      executionTime: 0,
    };
  }

  private async handleOpenBank(command: RuneLiteCommand): Promise<CommandResult> {
    return {
      success: true,
      data: { action: 'open_bank' },
      commandId: command.id,
      executionTime: 0,
    };
  }

  private async handleDepositItem(command: RuneLiteCommand): Promise<CommandResult> {
    const { itemId, quantity } = command.args;
    return {
      success: true,
      data: { action: 'deposit_item', itemId, quantity },
      commandId: command.id,
      executionTime: 0,
    };
  }

  private async handleWithdrawItem(command: RuneLiteCommand): Promise<CommandResult> {
    const { itemId, quantity } = command.args;
    return {
      success: true,
      data: { action: 'withdraw_item', itemId, quantity },
      commandId: command.id,
      executionTime: 0,
    };
  }

  private async handleSendChat(command: RuneLiteCommand): Promise<CommandResult> {
    const { message, type = 'public' } = command.args;
    return {
      success: true,
      data: { action: 'send_chat', message, type },
      commandId: command.id,
      executionTime: 0,
    };
  }

  private async handleLogout(command: RuneLiteCommand): Promise<CommandResult> {
    return {
      success: true,
      data: { action: 'logout' },
      commandId: command.id,
      executionTime: 0,
    };
  }
} 