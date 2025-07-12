/**
 * Telegram Extension
 *
 * Provides integration with the Telegram Bot API using the Telegraf library.
 */

import { Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';

import {
  Extension,
  ExtensionAction,
  ExtensionEventHandler,
  ExtensionType,
  Agent,
  ActionResult,
  ActionResultType,
  ActionCategory,
  ExtensionStatus,
  AgentEvent,
} from '../../types/agent.js';
import {
  GenericData,
  ExtensionConfig,
  SkillParameters,
} from '../../types/common.js';
import { Logger } from '../../utils/logger.js';

import {
  TelegramConfig,
  TelegramErrorType,
  TelegramMessage,
  TelegramUser,
  TelegramChat,
} from './types.js';

// Define a simple skill interface since skills/index.js doesn't exist
interface TelegramSkill {
  getActions(): Record<string, any>;
}

/**
 * Telegram Extension class
 *
 * Provides integration with the Telegram Bot API using the Telegraf library.
 */
export class TelegramExtension implements Extension {
  public readonly id = 'telegram';
  public readonly name = 'Telegram Bot Extension';
  public readonly version = '1.0.0';
  public readonly type = ExtensionType.COMMUNICATION;
  public status: ExtensionStatus = ExtensionStatus.DISABLED;
  public enabled: boolean = true;
  public actions: Record<string, ExtensionAction> = {};
  public events: Record<string, ExtensionEventHandler> = {};

  public config: TelegramConfig;
  private bot: Telegraf | null = null;
  private skills: Map<string, TelegramSkill> = new Map();
  private logger: Logger;
  // private context: ExtensionContext;
  private messageHandlers: Array<(message: TelegramMessage) => void> = [];

  /**
   * Constructor
   * @param context Extension context
   */
  constructor(config: TelegramConfig) {
    this.config = config;
    this.logger = new Logger('telegram');

    // Initialize skills map (empty for now since skills system is not implemented)
    this.skills = new Map();

    // Register actions from all skills
    this.registerSkillActions();
  }

  /**
   * Initialize the extension
   */
  async init(_agent: Agent): Promise<void> {
    try {
      if (!this.config.token) {
        throw new Error('Bot token is required');
      }

      // Create Telegraf instance
      this.bot = new Telegraf(this.config.token);

      // Set up message handlers
      this.setupMessageHandlers();

      // Launch the bot
      await this.bot.launch();

      this.logger.info('Telegram bot started successfully');
      this.status = ExtensionStatus.RUNNING;

      // Register extension actions
      this.registerExtensionActions();
    } catch (error) {
      this.logger.error('Failed to initialize Telegram extension', error);
      this.status = ExtensionStatus.ERROR;
      throw error;
    }
  }

  /**
   * Clean up resources when extension is stopped
   */
  async cleanup(): Promise<void> {
    if (this.bot) {
      // Stop the bot gracefully
      await this.bot.stop();
      this.bot = null;
    }
    this.status = ExtensionStatus.STOPPED;
    this.logger.info('Telegram extension stopped');
  }

  /**
   * Periodic tick function
   */
  async tick(_agent: Agent): Promise<void> {
    // Nothing to do on tick for Telegram as it uses webhooks/polling
    // Store agent reference for use in message handlers
    // Note: agent parameter is required by Extension interface
  }

  /**
   * Register a message handler
   * @param handler Function to handle incoming messages
   */
  registerMessageHandler(handler: (message: TelegramMessage) => void): void {
    this.messageHandlers.push(handler);
  }

  /**
   * Set up message handlers for the bot
   */
  private setupMessageHandlers(): void {
    if (!this.bot) return;

    // Handle text messages
    this.bot.on(message('text'), (ctx) => {
      const message = this.convertToTelegramMessage(ctx.message);
      this.notifyMessageHandlers(message);
    });

    // Handle photo messages
    this.bot.on(message('photo'), (ctx) => {
      const message = this.convertToTelegramMessage(ctx.message);
      this.notifyMessageHandlers(message);
    });

    // Handle document messages
    this.bot.on(message('document'), (ctx) => {
      const message = this.convertToTelegramMessage(ctx.message);
      this.notifyMessageHandlers(message);
    });

    // Handle errors
    this.bot.catch((err) => {
      this.logger.error('Telegram bot error', err);
    });
  }

  /**
   * Convert Telegraf message to our TelegramMessage format
   * @param telegrafMessage Message from Telegraf
   * @returns Standardized TelegramMessage
   */
  private convertToTelegramMessage(telegrafMessage: any): TelegramMessage {
    // Basic conversion - would need to be expanded for a complete implementation
    return {
      messageId: telegrafMessage.message_id,
      from: telegrafMessage.from as TelegramUser,
      chat: telegrafMessage.chat as TelegramChat,
      date: telegrafMessage.date,
      text: telegrafMessage.text || '',
      // Other fields would be added here
    };
  }

  /**
   * Notify all registered message handlers about a new message
   * @param message The message to notify about
   */
  private notifyMessageHandlers(message: TelegramMessage): void {
    for (const handler of this.messageHandlers) {
      try {
        handler(message);
      } catch (error) {
        this.logger.error('Error in message handler', error);
      }
    }
  }

  /**
   * Register all actions from skills
   */
  private registerSkillActions(): void {
    // Register actions from skills when skill system is implemented
    for (const skill of Array.from(this.skills.values())) {
      const actions = skill.getActions();
      for (const [actionId, action] of Object.entries(actions)) {
        this.actions[actionId] = action as ExtensionAction;
      }
    }
  }

  /**
   * Register core extension actions
   */
  private registerExtensionActions(): void {
    // Register built-in Telegram actions
    this.actions['sendMessage'] = {
      name: 'sendMessage',
      description: 'Send a text message to a Telegram chat',
      category: ActionCategory.COMMUNICATION,
      parameters: {
        chatId: {
          type: 'string',
          required: true,
          description: 'Chat ID or username',
        },
        text: { type: 'string', required: true, description: 'Message text' },
        parseMode: {
          type: 'string',
          required: false,
          description: 'Parse mode (HTML, Markdown)',
        },
        disableWebPagePreview: {
          type: 'boolean',
          required: false,
          description: 'Disable web page preview',
        },
        disableNotification: {
          type: 'boolean',
          required: false,
          description: 'Send silently',
        },
        replyToMessageId: {
          type: 'number',
          required: false,
          description: 'Reply to message ID',
        },
      },
      execute: async (
        _agent: Agent,
        params: SkillParameters
      ): Promise<ActionResult> => {
        const {
          chatId,
          text,
          parseMode,
          disableWebPagePreview,
          disableNotification,
          replyToMessageId,
        } = params;
        return this.sendMessage(
          chatId as string | number,
          text as string,
          parseMode as string | undefined,
          disableWebPagePreview as boolean | undefined,
          disableNotification as boolean | undefined,
          replyToMessageId as number | undefined
        );
      },
    };

    this.actions['editMessage'] = {
      name: 'editMessage',
      description: 'Edit a previously sent message',
      category: ActionCategory.COMMUNICATION,
      parameters: {
        chatId: {
          type: 'string',
          required: true,
          description: 'Chat ID or username',
        },
        messageId: {
          type: 'number',
          required: true,
          description: 'Message ID',
        },
        text: {
          type: 'string',
          required: true,
          description: 'New message text',
        },
        parseMode: {
          type: 'string',
          required: false,
          description: 'Parse mode (HTML, Markdown)',
        },
        disableWebPagePreview: {
          type: 'boolean',
          required: false,
          description: 'Disable web page preview',
        },
      },
      execute: async (
        _agent: Agent,
        params: SkillParameters
      ): Promise<ActionResult> => {
        const { chatId, messageId, text, parseMode, disableWebPagePreview } =
          params;
        return this.editMessage(
          chatId as string | number,
          messageId as number,
          text as string,
          parseMode as string | undefined,
          disableWebPagePreview as boolean | undefined
        );
      },
    };

    this.actions['deleteMessage'] = {
      name: 'deleteMessage',
      description: 'Delete a message',
      category: ActionCategory.COMMUNICATION,
      parameters: {
        chatId: {
          type: 'string',
          required: true,
          description: 'Chat ID or username',
        },
        messageId: {
          type: 'number',
          required: true,
          description: 'Message ID',
        },
      },
      execute: async (
        _agent: Agent,
        params: SkillParameters
      ): Promise<ActionResult> => {
        const { chatId, messageId } = params;
        return this.deleteMessage(
          chatId as string | number,
          messageId as number
        );
      },
    };

    this.actions['sendPhoto'] = {
      name: 'sendPhoto',
      description: 'Send a photo to a Telegram chat',
      category: ActionCategory.COMMUNICATION,
      parameters: {
        chatId: {
          type: 'string',
          required: true,
          description: 'Chat ID or username',
        },
        photo: {
          type: 'string',
          required: true,
          description: 'Photo file path or URL',
        },
        caption: {
          type: 'string',
          required: false,
          description: 'Photo caption',
        },
        parseMode: {
          type: 'string',
          required: false,
          description: 'Parse mode (HTML, Markdown)',
        },
        disableNotification: {
          type: 'boolean',
          required: false,
          description: 'Send silently',
        },
        replyToMessageId: {
          type: 'number',
          required: false,
          description: 'Reply to message ID',
        },
      },
      execute: async (
        _agent: Agent,
        params: SkillParameters
      ): Promise<ActionResult> => {
        const {
          chatId,
          photo,
          caption,
          parseMode,
          disableNotification,
          replyToMessageId,
        } = params;
        return this.sendPhoto(
          chatId as string | number,
          photo as string,
          caption as string | undefined,
          parseMode as string | undefined,
          disableNotification as boolean | undefined,
          replyToMessageId as number | undefined
        );
      },
    };

    // Register event handlers
    this.events['message'] = {
      event: 'message',
      description: 'Handle incoming Telegram messages',
      handler: async (_agent: Agent, event: AgentEvent): Promise<void> => {
        // Handle incoming message events
        this.logger.info('Received message event', event);
        // TODO: Forward message to agent for processing
      },
    };

    this.events['error'] = {
      event: 'error',
      description: 'Handle Telegram errors',
      handler: async (_agent: Agent, event: AgentEvent): Promise<void> => {
        this.logger.error('Telegram error event', event);
      },
    };
  }

  /**
   * Send a text message to a chat
   */
  async sendMessage(
    chatId: string | number,
    text: string,
    parseMode?: string,
    disableWebPagePreview?: boolean,
    disableNotification?: boolean,
    replyToMessageId?: number
  ): Promise<ActionResult> {
    try {
      if (!this.bot) {
        throw new Error('Bot is not initialized');
      }

      const options: any = {
        parse_mode: parseMode as any,
        disable_notification: disableNotification,
        reply_parameters: replyToMessageId
          ? {
              message_id: replyToMessageId,
              allow_sending_without_reply: true,
            }
          : undefined,
      };

      // Handle deprecated disable_web_page_preview
      if (disableWebPagePreview !== undefined) {
        options.link_preview_options = {
          is_disabled: disableWebPagePreview,
        };
      }

      const result = await this.bot.telegram.sendMessage(chatId, text, options);

      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: result as unknown as GenericData,
        metadata: { timestamp: new Date().toISOString() },
      };
    } catch (error) {
      this.logger.error('Failed to send message', error);
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `${TelegramErrorType.INVALID_REQUEST}: ${error instanceof Error ? error.message : String(error)}`,
        metadata: {
          timestamp: new Date().toISOString(),
          errorType: TelegramErrorType.INVALID_REQUEST,
        },
      };
    }
  }

  /**
   * Edit a previously sent message
   */
  async editMessage(
    chatId: string | number,
    messageId: number,
    text: string,
    parseMode?: string,
    disableWebPagePreview?: boolean
  ): Promise<ActionResult> {
    try {
      if (!this.bot) {
        throw new Error('Bot is not initialized');
      }

      const options: any = {
        parse_mode: parseMode as any,
      };

      // Handle deprecated disable_web_page_preview
      if (disableWebPagePreview !== undefined) {
        options.link_preview_options = {
          is_disabled: disableWebPagePreview,
        };
      }

      const result = await this.bot.telegram.editMessageText(
        chatId,
        messageId,
        undefined,
        text,
        options
      );

      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: result as unknown as GenericData,
        metadata: { timestamp: new Date().toISOString() },
      };
    } catch (error) {
      this.logger.error('Failed to edit message', error);
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `${TelegramErrorType.INVALID_REQUEST}: ${error instanceof Error ? error.message : String(error)}`,
        metadata: {
          timestamp: new Date().toISOString(),
          errorType: TelegramErrorType.INVALID_REQUEST,
        },
      };
    }
  }

  /**
   * Delete a message
   */
  async deleteMessage(
    chatId: string | number,
    messageId: number
  ): Promise<ActionResult> {
    try {
      if (!this.bot) {
        throw new Error('Bot is not initialized');
      }

      const result = await this.bot.telegram.deleteMessage(chatId, messageId);

      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: result as unknown as GenericData,
        metadata: { timestamp: new Date().toISOString() },
      };
    } catch (error) {
      this.logger.error('Failed to delete message', error);
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `${TelegramErrorType.INVALID_REQUEST}: ${error instanceof Error ? error.message : String(error)}`,
        metadata: {
          timestamp: new Date().toISOString(),
          errorType: TelegramErrorType.INVALID_REQUEST,
        },
      };
    }
  }

  /**
   * Pin a message in a chat
   */
  async pinMessage(
    chatId: string | number,
    messageId: number,
    disableNotification?: boolean
  ): Promise<ActionResult> {
    try {
      if (!this.bot) {
        throw new Error('Bot is not initialized');
      }

      const options: any = {};
      if (disableNotification !== undefined) {
        options.disable_notification = disableNotification;
      }

      const result = await this.bot.telegram.pinChatMessage(
        chatId,
        messageId,
        options
      );

      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: result as unknown as GenericData,
        metadata: { timestamp: new Date().toISOString() },
      };
    } catch (error) {
      this.logger.error('Failed to pin message', error);
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `${TelegramErrorType.INVALID_REQUEST}: ${error instanceof Error ? error.message : String(error)}`,
        metadata: {
          timestamp: new Date().toISOString(),
          errorType: TelegramErrorType.INVALID_REQUEST,
        },
      };
    }
  }

  /**
   * Unpin a message in a chat
   */
  async unpinMessage(
    chatId: string | number,
    messageId: number
  ): Promise<ActionResult> {
    try {
      if (!this.bot) {
        throw new Error('Bot is not initialized');
      }

      const result = await this.bot.telegram.unpinChatMessage(
        chatId,
        messageId
      );

      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: result as unknown as GenericData,
        metadata: { timestamp: new Date().toISOString() },
      };
    } catch (error) {
      this.logger.error('Failed to unpin message', error);
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `${TelegramErrorType.INVALID_REQUEST}: ${error instanceof Error ? error.message : String(error)}`,
        metadata: {
          timestamp: new Date().toISOString(),
          errorType: TelegramErrorType.INVALID_REQUEST,
        },
      };
    }
  }

  /**
   * Get information about a chat
   */
  async getChat(chatId: string | number): Promise<ActionResult> {
    try {
      if (!this.bot) {
        throw new Error('Bot is not initialized');
      }

      const result = await this.bot.telegram.getChat(chatId);

      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: result as unknown as GenericData,
        metadata: { timestamp: new Date().toISOString() },
      };
    } catch (error) {
      this.logger.error('Failed to get chat', error);
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `${TelegramErrorType.INVALID_REQUEST}: ${error instanceof Error ? error.message : String(error)}`,
        metadata: {
          timestamp: new Date().toISOString(),
          errorType: TelegramErrorType.INVALID_REQUEST,
        },
      };
    }
  }

  /**
   * Get information about a member of a chat
   */
  async getChatMember(
    chatId: string | number,
    userId: number
  ): Promise<ActionResult> {
    try {
      if (!this.bot) {
        throw new Error('Bot is not initialized');
      }

      const result = await this.bot.telegram.getChatMember(chatId, userId);

      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: result as unknown as GenericData,
        metadata: { timestamp: new Date().toISOString() },
      };
    } catch (error) {
      this.logger.error('Failed to get chat member', error);
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `${TelegramErrorType.INVALID_REQUEST}: ${error instanceof Error ? error.message : String(error)}`,
        metadata: {
          timestamp: new Date().toISOString(),
          errorType: TelegramErrorType.INVALID_REQUEST,
        },
      };
    }
  }

  /**
   * Get a list of administrators in a chat
   */
  async getChatAdministrators(chatId: string | number): Promise<ActionResult> {
    try {
      if (!this.bot) {
        throw new Error('Bot is not initialized');
      }

      const result = await this.bot.telegram.getChatAdministrators(chatId);

      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: result as unknown as GenericData,
        metadata: { timestamp: new Date().toISOString() },
      };
    } catch (error) {
      this.logger.error('Failed to get chat administrators', error);
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `${TelegramErrorType.INVALID_REQUEST}: ${error instanceof Error ? error.message : String(error)}`,
        metadata: {
          timestamp: new Date().toISOString(),
          errorType: TelegramErrorType.INVALID_REQUEST,
        },
      };
    }
  }

  /**
   * Get the number of members in a chat
   */
  async getChatMembersCount(chatId: string | number): Promise<ActionResult> {
    try {
      if (!this.bot) {
        throw new Error('Bot is not initialized');
      }

      const result = await this.bot.telegram.getChatMembersCount(chatId);

      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: result as unknown as GenericData,
        metadata: { timestamp: new Date().toISOString() },
      };
    } catch (error) {
      this.logger.error('Failed to get chat members count', error);
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `${TelegramErrorType.INVALID_REQUEST}: ${error instanceof Error ? error.message : String(error)}`,
        metadata: {
          timestamp: new Date().toISOString(),
          errorType: TelegramErrorType.INVALID_REQUEST,
        },
      };
    }
  }

  /**
   * Leave a chat
   */
  async leaveChat(chatId: string | number): Promise<ActionResult> {
    try {
      if (!this.bot) {
        throw new Error('Bot is not initialized');
      }

      const result = await this.bot.telegram.leaveChat(chatId);

      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: result as unknown as GenericData,
        metadata: { timestamp: new Date().toISOString() },
      };
    } catch (error) {
      this.logger.error('Failed to leave chat', error);
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `${TelegramErrorType.INVALID_REQUEST}: ${error instanceof Error ? error.message : String(error)}`,
        metadata: {
          timestamp: new Date().toISOString(),
          errorType: TelegramErrorType.INVALID_REQUEST,
        },
      };
    }
  }

  /**
   * Ban a user from a chat
   */
  async banChatMember(
    chatId: string | number,
    userId: number,
    untilDate?: number,
    revokeMessages?: boolean
  ): Promise<ActionResult> {
    try {
      if (!this.bot) {
        throw new Error('Bot is not initialized');
      }

      const options: any = {};
      if (untilDate !== undefined) options.until_date = untilDate;
      if (revokeMessages !== undefined)
        options.revoke_messages = revokeMessages;

      const result = await this.bot.telegram.banChatMember(
        chatId,
        userId,
        options
      );

      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: result as unknown as GenericData,
        metadata: { timestamp: new Date().toISOString() },
      };
    } catch (error) {
      this.logger.error('Failed to ban chat member', error);
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `${TelegramErrorType.INVALID_REQUEST}: ${error instanceof Error ? error.message : String(error)}`,
        metadata: {
          timestamp: new Date().toISOString(),
          errorType: TelegramErrorType.INVALID_REQUEST,
        },
      };
    }
  }

  /**
   * Unban a previously banned user in a chat
   */
  async unbanChatMember(
    chatId: string | number,
    userId: number,
    onlyIfBanned?: boolean
  ): Promise<ActionResult> {
    try {
      if (!this.bot) {
        throw new Error('Bot is not initialized');
      }

      const options: any = {};
      if (onlyIfBanned !== undefined) {
        options.only_if_banned = onlyIfBanned;
      }

      const result = await this.bot.telegram.unbanChatMember(
        chatId,
        userId,
        options
      );

      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: result as unknown as GenericData,
        metadata: { timestamp: new Date().toISOString() },
      };
    } catch (error) {
      this.logger.error('Failed to unban chat member', error);
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `${TelegramErrorType.INVALID_REQUEST}: ${error instanceof Error ? error.message : String(error)}`,
        metadata: {
          timestamp: new Date().toISOString(),
          errorType: TelegramErrorType.INVALID_REQUEST,
        },
      };
    }
  }

  /**
   * Restrict a user in a chat
   */
  async restrictChatMember(
    chatId: string | number,
    userId: number,
    permissions: any,
    untilDate?: number
  ): Promise<ActionResult> {
    try {
      if (!this.bot) {
        throw new Error('Bot is not initialized');
      }

      const result = await this.bot.telegram.restrictChatMember(
        chatId,
        userId,
        {
          ...permissions,
          until_date: untilDate,
        }
      );

      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: result as unknown as GenericData,
        metadata: { timestamp: new Date().toISOString() },
      };
    } catch (error) {
      this.logger.error('Failed to restrict chat member', error);
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `${TelegramErrorType.INVALID_REQUEST}: ${error instanceof Error ? error.message : String(error)}`,
        metadata: {
          timestamp: new Date().toISOString(),
          errorType: TelegramErrorType.INVALID_REQUEST,
        },
      };
    }
  }

  /**
   * Promote or demote a user in a chat
   */
  async promoteChatMember(
    chatId: string | number,
    userId: number,
    permissions: any
  ): Promise<ActionResult> {
    try {
      if (!this.bot) {
        throw new Error('Bot is not initialized');
      }

      const result = await this.bot.telegram.promoteChatMember(
        chatId,
        userId,
        permissions
      );

      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: result as unknown as GenericData,
        metadata: { timestamp: new Date().toISOString() },
      };
    } catch (error) {
      this.logger.error('Failed to promote chat member', error);
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `${TelegramErrorType.INVALID_REQUEST}: ${error instanceof Error ? error.message : String(error)}`,
        metadata: {
          timestamp: new Date().toISOString(),
          errorType: TelegramErrorType.INVALID_REQUEST,
        },
      };
    }
  }

  /**
   * Send a photo
   */
  async sendPhoto(
    chatId: string | number,
    photo: string,
    caption?: string,
    parseMode?: string,
    disableNotification?: boolean,
    replyToMessageId?: number
  ): Promise<ActionResult> {
    try {
      if (!this.bot) {
        throw new Error('Bot is not initialized');
      }

      const options: any = {
        caption,
        parse_mode: parseMode as any,
        reply_parameters: replyToMessageId
          ? {
              message_id: replyToMessageId,
              allow_sending_without_reply: true,
            }
          : undefined,
      };

      if (disableNotification !== undefined) {
        options.disable_notification = disableNotification;
      }

      const result = await this.bot.telegram.sendPhoto(chatId, photo, options);

      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: result as unknown as GenericData,
        metadata: { timestamp: new Date().toISOString() },
      };
    } catch (error) {
      this.logger.error('Failed to send photo', error);
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `${TelegramErrorType.INVALID_REQUEST}: ${error instanceof Error ? error.message : String(error)}`,
        metadata: {
          timestamp: new Date().toISOString(),
          errorType: TelegramErrorType.INVALID_REQUEST,
        },
      };
    }
  }

  /**
   * Send a video
   */
  async sendVideo(
    chatId: string | number,
    video: string,
    caption?: string,
    parseMode?: string,
    duration?: number,
    width?: number,
    height?: number,
    disableNotification?: boolean,
    replyToMessageId?: number
  ): Promise<ActionResult> {
    try {
      if (!this.bot) {
        throw new Error('Bot is not initialized');
      }

      const options: any = {
        caption,
        parse_mode: parseMode as any,
        duration,
        width,
        height,
        reply_parameters: replyToMessageId
          ? {
              message_id: replyToMessageId,
              allow_sending_without_reply: true,
            }
          : undefined,
      };

      if (disableNotification !== undefined) {
        options.disable_notification = disableNotification;
      }

      const result = await this.bot.telegram.sendVideo(chatId, video, options);

      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: result as unknown as GenericData,
        metadata: { timestamp: new Date().toISOString() },
      };
    } catch (error) {
      this.logger.error('Failed to send video', error);
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `${TelegramErrorType.INVALID_REQUEST}: ${error instanceof Error ? error.message : String(error)}`,
        metadata: {
          timestamp: new Date().toISOString(),
          errorType: TelegramErrorType.INVALID_REQUEST,
        },
      };
    }
  }

  /**
   * Send an audio file
   */
  async sendAudio(
    chatId: string | number,
    audio: string,
    caption?: string,
    parseMode?: string,
    duration?: number,
    performer?: string,
    title?: string,
    disableNotification?: boolean,
    replyToMessageId?: number
  ): Promise<ActionResult> {
    try {
      if (!this.bot) {
        throw new Error('Bot is not initialized');
      }

      const options: any = {
        caption,
        parse_mode: parseMode as any,
        duration,
        performer,
        title,
        reply_parameters: replyToMessageId
          ? {
              message_id: replyToMessageId,
              allow_sending_without_reply: true,
            }
          : undefined,
      };

      if (disableNotification !== undefined) {
        options.disable_notification = disableNotification;
      }

      const result = await this.bot.telegram.sendAudio(chatId, audio, options);

      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: result as unknown as GenericData,
        metadata: { timestamp: new Date().toISOString() },
      };
    } catch (error) {
      this.logger.error('Failed to send audio', error);
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `${TelegramErrorType.INVALID_REQUEST}: ${error instanceof Error ? error.message : String(error)}`,
        metadata: {
          timestamp: new Date().toISOString(),
          errorType: TelegramErrorType.INVALID_REQUEST,
        },
      };
    }
  }

  /**
   * Send a document
   */
  async sendDocument(
    chatId: string | number,
    document: string,
    caption?: string,
    parseMode?: string,
    disableNotification?: boolean,
    replyToMessageId?: number
  ): Promise<ActionResult> {
    try {
      if (!this.bot) {
        throw new Error('Bot is not initialized');
      }

      const options: any = {
        caption,
        parse_mode: parseMode as any,
        reply_parameters: replyToMessageId
          ? {
              message_id: replyToMessageId,
              allow_sending_without_reply: true,
            }
          : undefined,
      };

      if (disableNotification !== undefined) {
        options.disable_notification = disableNotification;
      }

      const result = await this.bot.telegram.sendDocument(
        chatId,
        document,
        options
      );

      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: result as unknown as GenericData,
        metadata: { timestamp: new Date().toISOString() },
      };
    } catch (error) {
      this.logger.error('Failed to send document', error);
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `${TelegramErrorType.INVALID_REQUEST}: ${error instanceof Error ? error.message : String(error)}`,
        metadata: {
          timestamp: new Date().toISOString(),
          errorType: TelegramErrorType.INVALID_REQUEST,
        },
      };
    }
  }

  /**
   * Send a sticker
   */
  async sendSticker(
    chatId: string | number,
    sticker: string,
    disableNotification?: boolean,
    replyToMessageId?: number
  ): Promise<ActionResult> {
    try {
      if (!this.bot) {
        throw new Error('Bot is not initialized');
      }

      const options: any = {
        reply_parameters: replyToMessageId
          ? {
              message_id: replyToMessageId,
              allow_sending_without_reply: true,
            }
          : undefined,
      };

      if (disableNotification !== undefined) {
        options.disable_notification = disableNotification;
      }

      const result = await this.bot.telegram.sendSticker(
        chatId,
        sticker,
        options
      );

      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: result as unknown as GenericData,
        metadata: { timestamp: new Date().toISOString() },
      };
    } catch (error) {
      this.logger.error('Failed to send sticker', error);
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `${TelegramErrorType.INVALID_REQUEST}: ${error instanceof Error ? error.message : String(error)}`,
        metadata: {
          timestamp: new Date().toISOString(),
          errorType: TelegramErrorType.INVALID_REQUEST,
        },
      };
    }
  }

  /**
   * Send a location
   */
  async sendLocation(
    chatId: string | number,
    latitude: number,
    longitude: number,
    disableNotification?: boolean,
    replyToMessageId?: number
  ): Promise<ActionResult> {
    try {
      if (!this.bot) {
        throw new Error('Bot is not initialized');
      }

      const options: any = {
        reply_parameters: replyToMessageId
          ? {
              message_id: replyToMessageId,
              allow_sending_without_reply: true,
            }
          : undefined,
      };

      if (disableNotification !== undefined) {
        options.disable_notification = disableNotification;
      }

      const result = await this.bot.telegram.sendLocation(
        chatId,
        latitude,
        longitude,
        options
      );

      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: result as unknown as GenericData,
        metadata: { timestamp: new Date().toISOString() },
      };
    } catch (error) {
      this.logger.error('Failed to send location', error);
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `${TelegramErrorType.INVALID_REQUEST}: ${error instanceof Error ? error.message : String(error)}`,
        metadata: {
          timestamp: new Date().toISOString(),
          errorType: TelegramErrorType.INVALID_REQUEST,
        },
      };
    }
  }
}
