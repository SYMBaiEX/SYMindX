/**
 * Slack Extension for SYMindX
 *
 * Provides comprehensive Slack integration with skills-based architecture
 * including messaging, channel management, threading, reactions, and workspace features.
 */

import { WebClient } from '@slack/web-api';
import { createServer } from '@slack/interactive-messages';
import { 
  Extension,
  ExtensionType,
  ExtensionStatus,
  Agent,
  ExtensionAction,
  ExtensionEventHandler,
  AgentEvent
} from '../../types/agent';
import { ExtensionConfig, ExtensionMetadata } from '../../types/common';
import { runtimeLogger } from '../../utils/logger';

// Import skills system
import {
  DefaultSlackSkillManager,
  ChannelManagementSkill,
  MessagingSkill,
  ThreadManagementSkill,
  ReactionManagementSkill,
  WorkspaceManagementSkill,
  createSlackSkillManager,
  createChannelManagementSkill,
  createMessagingSkill,
  createThreadManagementSkill,
  createReactionManagementSkill,
  createWorkspaceManagementSkill,
  defaultSkillConfigs
} from './skills';

import { 
  SlackConfig,
  SlackSkillContext,
  SlackWorkspace,
  SlackUser,
  SlackMessage,
  SlackEventContext,
  SlackCommandContext,
  SlackActionContext
} from './types';

export class SlackExtension implements Extension {
  public readonly id: string = 'slack';
  public readonly name: string = 'Slack Extension';
  public readonly version: string = '1.0.0';
  public readonly type: ExtensionType = ExtensionType.COMMUNICATION;
  public enabled: boolean = true;
  public status: ExtensionStatus = ExtensionStatus.STOPPED;
  public actions: Record<string, ExtensionAction> = {};
  public events: Record<string, ExtensionEventHandler> = {};

  public readonly metadata: ExtensionMetadata = {
    name: 'slack',
    version: '1.0.0',
    description:
      'Comprehensive Slack integration with messaging, channels, threads, reactions, and workspace management',
    author: 'SYMindX',
  };

  public config: ExtensionConfig;
  private slackConfig: SlackConfig;
  private agent?: Agent;
  private client?: WebClient;
  private socketMode: boolean = false;
  private workspace?: SlackWorkspace;
  private botUser?: SlackUser;

  // Skills system
  private skillManager: DefaultSlackSkillManager;
  private channelSkill?: ChannelManagementSkill;
  private messagingSkill?: MessagingSkill;
  private threadSkill?: ThreadManagementSkill;
  private reactionSkill?: ReactionManagementSkill;
  private workspaceSkill?: WorkspaceManagementSkill;

  // Event handlers
  private messageHandlers: Map<string, (event: SlackEventContext) => Promise<void>> = new Map();
  private commandHandlers: Map<string, (event: SlackCommandContext) => Promise<void>> = new Map();
  private actionHandlers: Map<string, (event: SlackActionContext) => Promise<void>> = new Map();

  constructor(config: SlackConfig) {
    this.config = {
      enabled: config.enabled ?? true,
      priority: config.priority ?? 1,
      settings: config.settings ?? {},
      dependencies: config.dependencies ?? [],
      capabilities: config.capabilities ?? [],
    };

    this.slackConfig = {
      ...this.config,
      botToken: config.botToken,
      appToken: config.appToken,
      signingSecret: config.signingSecret,
      socketMode: config.socketMode ?? false,
      channels: config.channels ?? [],
      allowedWorkspaces: config.allowedWorkspaces ?? [],
      enableThreading: config.enableThreading ?? true,
      enableReactions: config.enableReactions ?? true,
      enableFileSharing: config.enableFileSharing ?? false,
      enableAdminFeatures: config.enableAdminFeatures ?? false,
      autoJoinChannels: config.autoJoinChannels ?? true,
      responseTimeout: config.responseTimeout ?? 30000,
      maxMessageLength: config.maxMessageLength ?? 4000,
      rateLimitPerChannel: config.rateLimitPerChannel ?? 10,
      rateLimitWindow: config.rateLimitWindow ?? 60000,
    };

    // Initialize skills system
    this.skillManager = createSlackSkillManager({
      maxSkills: 10,
      skillTimeout: 30000,
      enableAutoDiscovery: false
    });

    // Initialize WebClient
    if (this.slackConfig.botToken) {
      this.client = new WebClient(this.slackConfig.botToken);
    }

    runtimeLogger.info('💬 Slack Extension initialized');
  }

  async init(agent: Agent): Promise<void> {
    if (!this.config.enabled) {
      runtimeLogger.info('⏸️ Slack Extension is disabled');
      return;
    }

    if (!this.slackConfig.botToken) {
      throw new Error('Slack bot token is required');
    }

    this.agent = agent;
    this.status = ExtensionStatus.INITIALIZING;

    try {
      // Initialize client if not already done
      if (!this.client) {
        this.client = new WebClient(this.slackConfig.botToken);
      }

      // Test authentication and get bot info
      const authResult = await this.client.auth.test();
      if (!authResult.ok) {
        throw new Error('Slack authentication failed');
      }

      this.workspace = {
        id: authResult.team_id!,
        name: authResult.team!,
      };

      this.botUser = {
        id: authResult.user_id!,
        name: authResult.user!,
      };

      runtimeLogger.info(`🤖 Slack bot authenticated as ${this.botUser.name} in workspace ${this.workspace.name}`);

      // Initialize skills
      await this.initializeSkills(agent);

      // Register extension events
      this.registerExtensionEvents();

      // Set up event listeners if socket mode is enabled
      if (this.slackConfig.socketMode && this.slackConfig.appToken) {
        await this.setupSocketMode();
      }

      this.status = ExtensionStatus.RUNNING;
      runtimeLogger.info('💬 Slack Extension initialized successfully');
    } catch (error) {
      this.status = ExtensionStatus.ERROR;
      runtimeLogger.error('❌ Failed to initialize Slack Extension:', error);
      throw error;
    }
  }

  async tick(agent: Agent): Promise<void> {
    try {
      // Update agent reference if needed
      if (this.agent?.id !== agent.id) {
        this.agent = agent;
      }

      // Skills system handles periodic operations
      // Any periodic maintenance can be done here
    } catch (error) {
      runtimeLogger.error('❌ Error during Slack Extension tick:', error);
    }
  }

  async cleanup(): Promise<void> {
    try {
      this.status = ExtensionStatus.STOPPING;

      // Clean up skills
      await this.skillManager.cleanup();

      // Clear handlers
      this.messageHandlers.clear();
      this.commandHandlers.clear();
      this.actionHandlers.clear();

      // Clear references
      this.client = undefined;
      this.workspace = undefined;
      this.botUser = undefined;
      this.agent = undefined;

      this.status = ExtensionStatus.STOPPED;
      runtimeLogger.info('💬 Slack Extension cleaned up');
    } catch (error) {
      this.status = ExtensionStatus.ERROR;
      runtimeLogger.error('❌ Error during Slack Extension cleanup:', error);
    }
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Initialize skills system
   */
  private async initializeSkills(agent: Agent): Promise<void> {
    const skillContext: SlackSkillContext = {
      client: this.client!,
      workspace: this.workspace,
      botUser: this.botUser,
      config: this.slackConfig
    };

    // Create and register skills
    this.channelSkill = createChannelManagementSkill({
      ...defaultSkillConfigs.channelManagement,
      autoJoinChannels: this.slackConfig.channels,
      maxChannels: 100,
      allowPrivateChannels: this.slackConfig.enableAdminFeatures,
      allowArchiving: this.slackConfig.enableAdminFeatures
    });
    await this.skillManager.registerSkill(this.channelSkill);

    this.messagingSkill = createMessagingSkill({
      ...defaultSkillConfigs.messaging,
      maxMessageLength: this.slackConfig.maxMessageLength,
      enableFormatting: true,
      enableAttachments: true,
      enableBlocks: true,
      rateLimitPerChannel: this.slackConfig.rateLimitPerChannel,
      rateLimitWindow: this.slackConfig.rateLimitWindow
    });
    await this.skillManager.registerSkill(this.messagingSkill);

    if (this.slackConfig.enableThreading) {
      this.threadSkill = createThreadManagementSkill({
        ...defaultSkillConfigs.threadManagement,
        maxThreads: 100,
        enableBroadcast: true,
        autoSubscribe: true
      });
      await this.skillManager.registerSkill(this.threadSkill);
    }

    if (this.slackConfig.enableReactions) {
      this.reactionSkill = createReactionManagementSkill({
        ...defaultSkillConfigs.reactionManagement,
        maxReactionsPerMessage: 20,
        enableCustomEmojis: true,
        trackReactionHistory: true
      });
      await this.skillManager.registerSkill(this.reactionSkill);
    }

    this.workspaceSkill = createWorkspaceManagementSkill({
      ...defaultSkillConfigs.workspaceManagement,
      cacheTimeout: 300000,
      enablePresence: true,
      enableUserSearch: true
    });
    await this.skillManager.registerSkill(this.workspaceSkill);

    // Initialize the skill manager
    await this.skillManager.initialize(agent, skillContext);

    // Get all actions from skills
    const skillActions = this.skillManager.getAllActions();
    skillActions.forEach(action => {
      this.actions[action.name] = action;
    });

    runtimeLogger.info(`💬 Initialized ${skillActions.length} Slack actions from skills`);
  }

  /**
   * Set up Socket Mode for real-time events
   */
  private async setupSocketMode(): Promise<void> {
    try {
      // Socket Mode setup would go here
      // This requires @slack/socket-mode package
      runtimeLogger.info('📡 Socket Mode setup would be implemented here');
    } catch (error) {
      runtimeLogger.error('Failed to set up Socket Mode:', error);
    }
  }

  /**
   * Register extension events
   */
  private registerExtensionEvents(): void {
    // Register event handlers
    this.events['message'] = {
      event: 'message',
      description: 'Handle incoming Slack messages',
      handler: async (agent: Agent, event: AgentEvent): Promise<void> => {
        try {
          const slackEvent = event.data as SlackMessage;
          
          // Skip bot's own messages
          if (slackEvent.user === this.botUser?.id) {
            return;
          }

          // Create event context
          const context: SlackEventContext = {
            type: 'message',
            event: slackEvent,
            user: slackEvent.user,
            channel: slackEvent.channel,
            text: slackEvent.text,
            thread_ts: slackEvent.thread_ts,
            message: slackEvent,
            say: async (text: string | any) => {
              const messagingAction = this.actions['sendMessage'];
              if (messagingAction) {
                await messagingAction.execute(agent, {
                  channel: slackEvent.channel,
                  text: typeof text === 'string' ? text : text.text,
                  thread_ts: slackEvent.thread_ts,
                  blocks: typeof text === 'object' ? text.blocks : undefined
                });
              }
            },
            respond: async (response: string | any) => {
              const messagingAction = this.actions['sendMessage'];
              if (messagingAction) {
                await messagingAction.execute(agent, {
                  channel: slackEvent.channel,
                  text: typeof response === 'string' ? response : response.text,
                  thread_ts: slackEvent.ts, // Reply in thread
                  blocks: typeof response === 'object' ? response.blocks : undefined
                });
              }
            }
          };

          // Process message handlers
          for (const [pattern, handler] of this.messageHandlers) {
            if (slackEvent.text.includes(pattern)) {
              await handler(context);
            }
          }

          // Emit event for agent processing
          agent.emit('slack:message', context);
        } catch (error) {
          runtimeLogger.error('Error handling Slack message:', error);
        }
      },
    };

    this.events['app_mention'] = {
      event: 'app_mention',
      description: 'Handle bot mentions',
      handler: async (agent: Agent, event: AgentEvent): Promise<void> => {
        try {
          const slackEvent = event.data as SlackMessage;
          
          // Similar context creation as message event
          const context: SlackEventContext = {
            type: 'app_mention',
            event: slackEvent,
            user: slackEvent.user,
            channel: slackEvent.channel,
            text: slackEvent.text,
            thread_ts: slackEvent.thread_ts,
            message: slackEvent,
            say: async (text: string | any) => {
              const messagingAction = this.actions['sendMessage'];
              if (messagingAction) {
                await messagingAction.execute(agent, {
                  channel: slackEvent.channel,
                  text: typeof text === 'string' ? text : text.text,
                  thread_ts: slackEvent.thread_ts,
                  blocks: typeof text === 'object' ? text.blocks : undefined
                });
              }
            },
            respond: async (response: string | any) => {
              const messagingAction = this.actions['sendMessage'];
              if (messagingAction) {
                await messagingAction.execute(agent, {
                  channel: slackEvent.channel,
                  text: typeof response === 'string' ? response : response.text,
                  thread_ts: slackEvent.ts,
                  blocks: typeof response === 'object' ? response.blocks : undefined
                });
              }
            }
          };

          // Emit event for agent processing
          agent.emit('slack:mention', context);
        } catch (error) {
          runtimeLogger.error('Error handling bot mention:', error);
        }
      },
    };

    this.events['reaction_added'] = {
      event: 'reaction_added',
      description: 'Handle reaction added events',
      handler: async (agent: Agent, event: AgentEvent): Promise<void> => {
        try {
          agent.emit('slack:reaction_added', event.data);
        } catch (error) {
          runtimeLogger.error('Error handling reaction added:', error);
        }
      },
    };

    this.events['reaction_removed'] = {
      event: 'reaction_removed',
      description: 'Handle reaction removed events',
      handler: async (agent: Agent, event: AgentEvent): Promise<void> => {
        try {
          agent.emit('slack:reaction_removed', event.data);
        } catch (error) {
          runtimeLogger.error('Error handling reaction removed:', error);
        }
      },
    };

    this.events['channel_joined'] = {
      event: 'channel_joined',
      description: 'Handle channel joined events',
      handler: async (agent: Agent, event: AgentEvent): Promise<void> => {
        try {
          agent.emit('slack:channel_joined', event.data);
        } catch (error) {
          runtimeLogger.error('Error handling channel joined:', error);
        }
      },
    };

    this.events['channel_left'] = {
      event: 'channel_left',
      description: 'Handle channel left events',
      handler: async (agent: Agent, event: AgentEvent): Promise<void> => {
        try {
          agent.emit('slack:channel_left', event.data);
        } catch (error) {
          runtimeLogger.error('Error handling channel left:', error);
        }
      },
    };
  }

  /**
   * Register a message handler
   */
  registerMessageHandler(pattern: string, handler: (event: SlackEventContext) => Promise<void>): void {
    this.messageHandlers.set(pattern, handler);
    runtimeLogger.info(`📝 Registered Slack message handler for pattern: ${pattern}`);
  }

  /**
   * Register a command handler
   */
  registerCommandHandler(command: string, handler: (event: SlackCommandContext) => Promise<void>): void {
    this.commandHandlers.set(command, handler);
    runtimeLogger.info(`📝 Registered Slack command handler: ${command}`);
  }

  /**
   * Register an action handler
   */
  registerActionHandler(actionId: string, handler: (event: SlackActionContext) => Promise<void>): void {
    this.actionHandlers.set(actionId, handler);
    runtimeLogger.info(`📝 Registered Slack action handler: ${actionId}`);
  }

  /**
   * Get skill manager
   */
  getSkillManager(): DefaultSlackSkillManager {
    return this.skillManager;
  }

  /**
   * Get specific skills
   */
  getChannelSkill(): ChannelManagementSkill | undefined {
    return this.channelSkill;
  }

  getMessagingSkill(): MessagingSkill | undefined {
    return this.messagingSkill;
  }

  getThreadSkill(): ThreadManagementSkill | undefined {
    return this.threadSkill;
  }

  getReactionSkill(): ReactionManagementSkill | undefined {
    return this.reactionSkill;
  }

  getWorkspaceSkill(): WorkspaceManagementSkill | undefined {
    return this.workspaceSkill;
  }

  /**
   * Get Slack client
   */
  getClient(): WebClient | undefined {
    return this.client;
  }

  /**
   * Get workspace info
   */
  getWorkspace(): SlackWorkspace | undefined {
    return this.workspace;
  }

  /**
   * Get bot user info
   */
  getBotUser(): SlackUser | undefined {
    return this.botUser;
  }

  /**
   * Get extension configuration
   */
  getConfig(): SlackConfig {
    return { ...this.slackConfig };
  }

  /**
   * Update extension configuration
   */
  async updateConfig(updates: Partial<SlackConfig>): Promise<void> {
    this.slackConfig = { ...this.slackConfig, ...updates };
    this.config = { ...this.config, ...updates };

    // Re-initialize if needed
    if (this.agent && updates.enabled !== undefined) {
      if (updates.enabled && !this.config.enabled) {
        await this.init(this.agent);
      } else if (!updates.enabled && this.config.enabled) {
        await this.cleanup();
      }
    }
  }
}

// Factory function for creating Slack Extension
export function createSlackExtension(config: SlackConfig): SlackExtension {
  return new SlackExtension(config);
}

// Export types
export { SlackConfig } from './types';
export default SlackExtension;