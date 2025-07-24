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
import { SkillParameters } from '../../types/common.js';
import { runtimeLogger } from '../../utils/logger.js';

import { RuneLiteConfig, GameEvent, RuneLiteCommand } from './types.js';

export class RuneLiteExtension implements Extension {
  public readonly id = 'runelite';
  public readonly name = 'RuneLite Extension';
  public readonly version = '1.2.0';
  public readonly type = ExtensionType.GAME_INTEGRATION;
  public enabled = true;
  public status = ExtensionStatus.STOPPED;
  public actions: Record<string, ExtensionAction> = {};
  public events: Record<string, ExtensionEventHandler> = {};

  public config: RuneLiteConfig;
  private wss?: WebSocketServer;
  private clients = new Map<string, WebSocket>();
  private agent?: Agent;

  constructor(config: RuneLiteConfig) {
    this.config = {
      enabled: config.enabled ?? true,
      priority: config.priority ?? 1,
      settings: {
        port: 8081,
        events: [],
        ...config.settings,
      },
    };

    this.registerExtensionActions();
  }

  async init(agent: Agent): Promise<void> {
    if (!this.config.enabled) {
      runtimeLogger.info('⏸️ RuneLite extension is disabled');
      return;
    }

    this.agent = agent;
    const port = this.config.settings.port ?? 8081;

    this.wss = new WebSocketServer({ port });
    this.wss.on('connection', (ws) => {
      const id = uuidv4();
      this.clients.set(id, ws);

      ws.on('message', (data) => {
        try {
          const event = JSON.parse(data.toString()) as GameEvent;
          void this.handleGameEvent(id, event);
        } catch (err) {
          runtimeLogger.warn('⚠️ RuneLite event parse error', err);
        }
      });

      ws.on('close', () => {
        this.clients.delete(id);
      });
    });

    this.status = ExtensionStatus.RUNNING;
    runtimeLogger.info(`🎮 RuneLite extension listening on port ${port}`);
  }

  async tick(_agent: Agent): Promise<void> {
    // No periodic tasks yet
  }

  async cleanup(): Promise<void> {
    if (this.wss) {
      this.wss.close();
      this.wss = undefined;
    }
    this.clients.clear();
    this.status = ExtensionStatus.STOPPED;
    runtimeLogger.info('🎮 RuneLite extension stopped');
  }

  private async handleGameEvent(
    clientId: string,
    event: GameEvent
  ): Promise<void> {
    if (!this.agent) return;

    // Filter events if a whitelist is configured
    const allowedEvents = this.config.settings.events;
    if (Array.isArray(allowedEvents) && allowedEvents.length > 0) {
      if (!event.type || !allowedEvents.includes(event.type)) {
        return;
      }
    }

    const agentEvent: AgentEvent = {
      id: `${clientId}-${Date.now()}`,
      type: 'game_event',
      source: 'runelite',
      data: event,
      timestamp: new Date(),
      processed: false,
      agentId: this.agent.id,
    };

    if (this.agent.eventBus) {
      await this.agent.eventBus.emit('game.event', agentEvent);
    }
  }

  private sendCommand(command: RuneLiteCommand): void {
    const payload = JSON.stringify({ type: 'command', command });
    for (const ws of this.clients.values()) {
      ws.send(payload);
    }
  }

  private registerExtensionActions(): void {
    this.actions['sendCommand'] = {
      name: 'sendCommand',
      description: 'Send a command to RuneLite clients',
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
        this.sendCommand({
          name: params.command as string,
          args: params.args as Record<string, unknown> | undefined,
        });
        return { success: true, type: ActionResultType.SUCCESS };
      },
    };

    this.actions['broadcastMessage'] = {
      name: 'broadcastMessage',
      description: 'Broadcast a chat message to all RuneLite clients',
      category: ActionCategory.INTERACTION,
      parameters: {
        message: {
          type: 'string',
          required: true,
          description: 'Message text',
        },
      },
      execute: async (
        _agent: Agent,
        params: SkillParameters
      ): Promise<ActionResult> => {
        this.sendCommand({
          name: 'broadcast_message',
          args: { text: params.message },
        });
        return { success: true, type: ActionResultType.SUCCESS };
      },
    };

    this.actions['moveTo'] = {
      name: 'moveTo',
      description: 'Move the player to specific coordinates',
      category: ActionCategory.INTERACTION,
      parameters: {
        x: {
          type: 'number',
          required: true,
          description: 'X coordinate',
        },
        y: {
          type: 'number',
          required: true,
          description: 'Y coordinate',
        },
      },
      execute: async (
        _agent: Agent,
        params: SkillParameters
      ): Promise<ActionResult> => {
        this.sendCommand({
          name: 'move_to',
          args: { x: params.x, y: params.y },
        });
        return { success: true, type: ActionResultType.SUCCESS };
      },
    };

    this.actions['farmResource'] = {
      name: 'farmResource',
      description: 'Gather a specified resource',
      category: ActionCategory.INTERACTION,
      parameters: {
        resource: {
          type: 'string',
          required: true,
          description: 'Resource name',
        },
      },
      execute: async (
        _agent: Agent,
        params: SkillParameters
      ): Promise<ActionResult> => {
        this.sendCommand({
          name: 'farm_resource',
          args: { type: params.resource },
        });
        return { success: true, type: ActionResultType.SUCCESS };
      },
    };
  }
}

export function createRuneLiteExtension(
  config: RuneLiteConfig
): RuneLiteExtension {
  return new RuneLiteExtension(config);
}
