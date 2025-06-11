/**
 * Media Skill for Telegram Extension
 * 
 * Provides actions related to sending and managing media files.
 */

import { ExtensionAction, Agent, ActionResult, ActionCategory } from '../../../types/agent.js';
import { TelegramExtension } from '../index.js';
import { BaseTelegramSkill } from './base-skill.js';
import { TelegramActionType, TelegramErrorType } from '../types.js';

export class MediaSkill extends BaseTelegramSkill {
  /**
   * Get all media-related actions
   */
  getActions(): Record<string, ExtensionAction> {
    return {
      [TelegramActionType.SEND_PHOTO]: {
        name: TelegramActionType.SEND_PHOTO,
        description: 'Send a photo',
        category: ActionCategory.COMMUNICATION,
        parameters: { 
          chat_id: 'string|number', 
          photo: 'string',
          caption: 'string',
          parse_mode: 'string',
          disable_notification: 'boolean',
          reply_to_message_id: 'number'
        },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.sendPhoto(
            params.chat_id, 
            params.photo, 
            params.caption, 
            params.parse_mode,
            params.disable_notification,
            params.reply_to_message_id
          );
        }
      },
      
      [TelegramActionType.SEND_VIDEO]: {
        name: TelegramActionType.SEND_VIDEO,
        description: 'Send a video',
        category: ActionCategory.COMMUNICATION,
        parameters: { 
          chat_id: 'string|number', 
          video: 'string',
          caption: 'string',
          parse_mode: 'string',
          duration: 'number',
          width: 'number',
          height: 'number',
          disable_notification: 'boolean',
          reply_to_message_id: 'number'
        },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.sendVideo(
            params.chat_id, 
            params.video, 
            params.caption, 
            params.parse_mode,
            params.duration,
            params.width,
            params.height,
            params.disable_notification,
            params.reply_to_message_id
          );
        }
      },
      
      [TelegramActionType.SEND_AUDIO]: {
        name: TelegramActionType.SEND_AUDIO,
        description: 'Send an audio file',
        category: ActionCategory.COMMUNICATION,
        parameters: { 
          chat_id: 'string|number', 
          audio: 'string',
          caption: 'string',
          parse_mode: 'string',
          duration: 'number',
          performer: 'string',
          title: 'string',
          disable_notification: 'boolean',
          reply_to_message_id: 'number'
        },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.sendAudio(
            params.chat_id, 
            params.audio, 
            params.caption, 
            params.parse_mode,
            params.duration,
            params.performer,
            params.title,
            params.disable_notification,
            params.reply_to_message_id
          );
        }
      },
      
      [TelegramActionType.SEND_DOCUMENT]: {
        name: TelegramActionType.SEND_DOCUMENT,
        description: 'Send a document',
        category: ActionCategory.COMMUNICATION,
        parameters: { 
          chat_id: 'string|number', 
          document: 'string',
          caption: 'string',
          parse_mode: 'string',
          disable_notification: 'boolean',
          reply_to_message_id: 'number'
        },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.sendDocument(
            params.chat_id, 
            params.document, 
            params.caption, 
            params.parse_mode,
            params.disable_notification,
            params.reply_to_message_id
          );
        }
      },
      
      [TelegramActionType.SEND_STICKER]: {
        name: TelegramActionType.SEND_STICKER,
        description: 'Send a sticker',
        category: ActionCategory.COMMUNICATION,
        parameters: { 
          chat_id: 'string|number', 
          sticker: 'string',
          disable_notification: 'boolean',
          reply_to_message_id: 'number'
        },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.sendSticker(
            params.chat_id, 
            params.sticker, 
            params.disable_notification,
            params.reply_to_message_id
          );
        }
      },
      
      [TelegramActionType.SEND_LOCATION]: {
        name: TelegramActionType.SEND_LOCATION,
        description: 'Send a location',
        category: ActionCategory.COMMUNICATION,
        parameters: { 
          chat_id: 'string|number', 
          latitude: 'number',
          longitude: 'number',
          disable_notification: 'boolean',
          reply_to_message_id: 'number'
        },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.sendLocation(
            params.chat_id, 
            params.latitude, 
            params.longitude,
            params.disable_notification,
            params.reply_to_message_id
          );
        }
      }
    };
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
      // Delegate to the extension's implementation
      return await this.extension.sendPhoto(
        chatId, 
        photo, 
        caption, 
        parseMode,
        disableNotification,
        replyToMessageId
      );
    } catch (error) {
      return this.createErrorResult(error, TelegramErrorType.INVALID_REQUEST);
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
      // Delegate to the extension's implementation
      return await this.extension.sendVideo(
        chatId, 
        video, 
        caption, 
        parseMode,
        duration,
        width,
        height,
        disableNotification,
        replyToMessageId
      );
    } catch (error) {
      return this.createErrorResult(error, TelegramErrorType.INVALID_REQUEST);
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
      // Delegate to the extension's implementation
      return await this.extension.sendAudio(
        chatId, 
        audio, 
        caption, 
        parseMode,
        duration,
        performer,
        title,
        disableNotification,
        replyToMessageId
      );
    } catch (error) {
      return this.createErrorResult(error, TelegramErrorType.INVALID_REQUEST);
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
      // Delegate to the extension's implementation
      return await this.extension.sendDocument(
        chatId, 
        document, 
        caption, 
        parseMode,
        disableNotification,
        replyToMessageId
      );
    } catch (error) {
      return this.createErrorResult(error, TelegramErrorType.INVALID_REQUEST);
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
      // Delegate to the extension's implementation
      return await this.extension.sendSticker(
        chatId, 
        sticker, 
        disableNotification,
        replyToMessageId
      );
    } catch (error) {
      return this.createErrorResult(error, TelegramErrorType.INVALID_REQUEST);
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
      // Delegate to the extension's implementation
      return await this.extension.sendLocation(
        chatId, 
        latitude, 
        longitude,
        disableNotification,
        replyToMessageId
      );
    } catch (error) {
      return this.createErrorResult(error, TelegramErrorType.INVALID_REQUEST);
    }
  }
}