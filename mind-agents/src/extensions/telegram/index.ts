/**
 * Telegram Extension
 * 
 * Provides integration with the Telegram Bot API using the Telegraf library.
 */

import { Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';
import {
  Extension,
  ExtensionContext,
  ExtensionType,
  ActionResult,
  ExtensionAction,
  ActionResultType,
  ExtensionStatus
} from '../../types/agent.js';
import { TelegramConfig, TelegramErrorType, TelegramMessage, TelegramUser, TelegramChat } from './types.js';
import { initializeSkills, TelegramSkill } from './skills/index.js';
import { Logger } from '../../utils/logger.js';

/**
 * Telegram Extension class
 * 
 * Provides integration with the Telegram Bot API using the Telegraf library.
 */
export class TelegramExtension implements Extension {
  id = 'telegram';
  name = 'Telegram';
  description = 'Telegram Bot API integration';
  version = '1.0.0';
  type = ExtensionType.COMMUNICATION;
  status = ExtensionStatus.STOPPED;
  
  private bot: Telegraf | null = null;
  private config: TelegramConfig;
  private logger: Logger;
  private skills: TelegramSkill[] = [];
  private context: ExtensionContext;
  private messageHandlers: Array<(message: TelegramMessage) => void> = [];
  
  /**
   * Constructor
   * @param context Extension context
   */
  constructor(context: ExtensionContext) {
    this.context = context;
    this.logger = context.logger.child({ extension: this.id });
    this.config = context.config as TelegramConfig;
    
    // Initialize skills
    this.skills = initializeSkills(this);
    
    // Register actions from all skills
    this.registerSkillActions();
  }
  
  /**
   * Initialize the extension
   */
  async init(): Promise<void> {
    try {
      if (!this.config.botToken) {
        throw new Error('Bot token is required');
      }
      
      // Create Telegraf instance
      this.bot = new Telegraf(this.config.botToken);
      
      // Set up message handlers
      this.setupMessageHandlers();
      
      // Launch the bot
      await this.bot.launch();
      
      this.logger.info('Telegram bot started successfully');
      this.status = ExtensionStatus.RUNNING;
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
  async tick(): Promise<void> {
    // Nothing to do on tick for Telegram as it uses webhooks/polling
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
      message_id: telegrafMessage.message_id,
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
    for (const skill of this.skills) {
      const actions = skill.getActions();
      for (const [actionId, action] of Object.entries(actions)) {
        this.context.registerAction(actionId, action);
      }
    }
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
      
      const result = await this.bot.telegram.sendMessage(chatId, text, {
        parse_mode: parseMode,
        disable_web_page_preview: disableWebPagePreview,
        disable_notification: disableNotification,
        reply_to_message_id: replyToMessageId
      });
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: result as GenericData,
        metadata: { timestamp: new Date().toISOString() }
      };
    } catch (error) {
      this.logger.error('Failed to send message', error);
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `${TelegramErrorType.INVALID_REQUEST}: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { 
          timestamp: new Date().toISOString(),
          errorType: TelegramErrorType.INVALID_REQUEST
        }
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
      
      const result = await this.bot.telegram.editMessageText(chatId, messageId, undefined, text, {
        parse_mode: parseMode,
        disable_web_page_preview: disableWebPagePreview
      });
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: result as GenericData,
        metadata: { timestamp: new Date().toISOString() }
      };
    } catch (error) {
      this.logger.error('Failed to edit message', error);
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `${TelegramErrorType.INVALID_REQUEST}: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { 
          timestamp: new Date().toISOString(),
          errorType: TelegramErrorType.INVALID_REQUEST
        }
      };
    }
  }
  
  /**
   * Delete a message
   */
  async deleteMessage(chatId: string | number, messageId: number): Promise<ActionResult> {
    try {
      if (!this.bot) {
        throw new Error('Bot is not initialized');
      }
      
      const result = await this.bot.telegram.deleteMessage(chatId, messageId);
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: result as GenericData,
        metadata: { timestamp: new Date().toISOString() }
      };
    } catch (error) {
      this.logger.error('Failed to delete message', error);
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `${TelegramErrorType.INVALID_REQUEST}: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { 
          timestamp: new Date().toISOString(),
          errorType: TelegramErrorType.INVALID_REQUEST
        }
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
      
      const result = await this.bot.telegram.pinChatMessage(chatId, messageId, {
        disable_notification: disableNotification
      });
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: result as GenericData,
        metadata: { timestamp: new Date().toISOString() }
      };
    } catch (error) {
      this.logger.error('Failed to pin message', error);
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `${TelegramErrorType.INVALID_REQUEST}: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { 
          timestamp: new Date().toISOString(),
          errorType: TelegramErrorType.INVALID_REQUEST
        }
      };
    }
  }
  
  /**
   * Unpin a message in a chat
   */
  async unpinMessage(chatId: string | number, messageId: number): Promise<ActionResult> {
    try {
      if (!this.bot) {
        throw new Error('Bot is not initialized');
      }
      
      const result = await this.bot.telegram.unpinChatMessage(chatId, messageId);
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: result as GenericData,
        metadata: { timestamp: new Date().toISOString() }
      };
    } catch (error) {
      this.logger.error('Failed to unpin message', error);
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `${TelegramErrorType.INVALID_REQUEST}: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { 
          timestamp: new Date().toISOString(),
          errorType: TelegramErrorType.INVALID_REQUEST
        }
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
        result: result as GenericData,
        metadata: { timestamp: new Date().toISOString() }
      };
    } catch (error) {
      this.logger.error('Failed to get chat', error);
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `${TelegramErrorType.INVALID_REQUEST}: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { 
          timestamp: new Date().toISOString(),
          errorType: TelegramErrorType.INVALID_REQUEST
        }
      };
    }
  }
  
  /**
   * Get information about a member of a chat
   */
  async getChatMember(chatId: string | number, userId: number): Promise<ActionResult> {
    try {
      if (!this.bot) {
        throw new Error('Bot is not initialized');
      }
      
      const result = await this.bot.telegram.getChatMember(chatId, userId);
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: result as GenericData,
        metadata: { timestamp: new Date().toISOString() }
      };
    } catch (error) {
      this.logger.error('Failed to get chat member', error);
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `${TelegramErrorType.INVALID_REQUEST}: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { 
          timestamp: new Date().toISOString(),
          errorType: TelegramErrorType.INVALID_REQUEST
        }
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
        result: result as GenericData,
        metadata: { timestamp: new Date().toISOString() }
      };
    } catch (error) {
      this.logger.error('Failed to get chat administrators', error);
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `${TelegramErrorType.INVALID_REQUEST}: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { 
          timestamp: new Date().toISOString(),
          errorType: TelegramErrorType.INVALID_REQUEST
        }
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
      
      const result = await this.bot.telegram.getChatMemberCount(chatId);
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: result as GenericData,
        metadata: { timestamp: new Date().toISOString() }
      };
    } catch (error) {
      this.logger.error('Failed to get chat members count', error);
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `${TelegramErrorType.INVALID_REQUEST}: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { 
          timestamp: new Date().toISOString(),
          errorType: TelegramErrorType.INVALID_REQUEST
        }
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
        result: result as GenericData,
        metadata: { timestamp: new Date().toISOString() }
      };
    } catch (error) {
      this.logger.error('Failed to leave chat', error);
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `${TelegramErrorType.INVALID_REQUEST}: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { 
          timestamp: new Date().toISOString(),
          errorType: TelegramErrorType.INVALID_REQUEST
        }
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
      
      const result = await this.bot.telegram.banChatMember(chatId, userId, {
        until_date: untilDate,
        revoke_messages: revokeMessages
      });
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: result as GenericData,
        metadata: { timestamp: new Date().toISOString() }
      };
    } catch (error) {
      this.logger.error('Failed to ban chat member', error);
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `${TelegramErrorType.INVALID_REQUEST}: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { 
          timestamp: new Date().toISOString(),
          errorType: TelegramErrorType.INVALID_REQUEST
        }
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
      
      const result = await this.bot.telegram.unbanChatMember(chatId, userId, {
        only_if_banned: onlyIfBanned
      });
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: result as GenericData,
        metadata: { timestamp: new Date().toISOString() }
      };
    } catch (error) {
      this.logger.error('Failed to unban chat member', error);
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `${TelegramErrorType.INVALID_REQUEST}: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { 
          timestamp: new Date().toISOString(),
          errorType: TelegramErrorType.INVALID_REQUEST
        }
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
      
      const result = await this.bot.telegram.restrictChatMember(chatId, userId, {
        ...permissions,
        until_date: untilDate
      });
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: result as GenericData,
        metadata: { timestamp: new Date().toISOString() }
      };
    } catch (error) {
      this.logger.error('Failed to restrict chat member', error);
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `${TelegramErrorType.INVALID_REQUEST}: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { 
          timestamp: new Date().toISOString(),
          errorType: TelegramErrorType.INVALID_REQUEST
        }
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
      
      const result = await this.bot.telegram.promoteChatMember(chatId, userId, permissions);
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: result as GenericData,
        metadata: { timestamp: new Date().toISOString() }
      };
    } catch (error) {
      this.logger.error('Failed to promote chat member', error);
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `${TelegramErrorType.INVALID_REQUEST}: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { 
          timestamp: new Date().toISOString(),
          errorType: TelegramErrorType.INVALID_REQUEST
        }
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
      
      const result = await this.bot.telegram.sendPhoto(chatId, photo, {
        caption,
        parse_mode: parseMode,
        disable_notification: disableNotification,
        reply_to_message_id: replyToMessageId
      });
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: result as GenericData,
        metadata: { timestamp: new Date().toISOString() }
      };
    } catch (error) {
      this.logger.error('Failed to send photo', error);
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `${TelegramErrorType.INVALID_REQUEST}: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { 
          timestamp: new Date().toISOString(),
          errorType: TelegramErrorType.INVALID_REQUEST
        }
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
      
      const result = await this.bot.telegram.sendVideo(chatId, video, {
        caption,
        parse_mode: parseMode,
        duration,
        width,
        height,
        disable_notification: disableNotification,
        reply_to_message_id: replyToMessageId
      });
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: result as GenericData,
        metadata: { timestamp: new Date().toISOString() }
      };
    } catch (error) {
      this.logger.error('Failed to send video', error);
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `${TelegramErrorType.INVALID_REQUEST}: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { 
          timestamp: new Date().toISOString(),
          errorType: TelegramErrorType.INVALID_REQUEST
        }
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
      
      const result = await this.bot.telegram.sendAudio(chatId, audio, {
        caption,
        parse_mode: parseMode,
        duration,
        performer,
        title,
        disable_notification: disableNotification,
        reply_to_message_id: replyToMessageId
      });
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: result as GenericData,
        metadata: { timestamp: new Date().toISOString() }
      };
    } catch (error) {
      this.logger.error('Failed to send audio', error);
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `${TelegramErrorType.INVALID_REQUEST}: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { 
          timestamp: new Date().toISOString(),
          errorType: TelegramErrorType.INVALID_REQUEST
        }
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
      
      const result = await this.bot.telegram.sendDocument(chatId, document, {
        caption,
        parse_mode: parseMode,
        disable_notification: disableNotification,
        reply_to_message_id: replyToMessageId
      });
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: result as GenericData,
        metadata: { timestamp: new Date().toISOString() }
      };
    } catch (error) {
      this.logger.error('Failed to send document', error);
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `${TelegramErrorType.INVALID_REQUEST}: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { 
          timestamp: new Date().toISOString(),
          errorType: TelegramErrorType.INVALID_REQUEST
        }
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
      
      const result = await this.bot.telegram.sendSticker(chatId, sticker, {
        disable_notification: disableNotification,
        reply_to_message_id: replyToMessageId
      });
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: result as GenericData,
        metadata: { timestamp: new Date().toISOString() }
      };
    } catch (error) {
      this.logger.error('Failed to send sticker', error);
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `${TelegramErrorType.INVALID_REQUEST}: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { 
          timestamp: new Date().toISOString(),
          errorType: TelegramErrorType.INVALID_REQUEST
        }
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
      
      const result = await this.bot.telegram.sendLocation(chatId, latitude, longitude, {
        disable_notification: disableNotification,
        reply_to_message_id: replyToMessageId
      });
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: result as GenericData,
        metadata: { timestamp: new Date().toISOString() }
      };
    } catch (error) {
      this.logger.error('Failed to send location', error);
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `${TelegramErrorType.INVALID_REQUEST}: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { 
          timestamp: new Date().toISOString(),
          errorType: TelegramErrorType.INVALID_REQUEST
        }
      };
    }
  }
}