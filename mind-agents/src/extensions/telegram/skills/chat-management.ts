/**
 * Chat Management Skill for Telegram Extension
 * 
 * Provides actions related to managing chats and chat members.
 */

import { ExtensionAction, Agent, ActionResult, ActionCategory } from '../../../types/agent';
import { TelegramExtension } from '../index';
import { BaseTelegramSkill } from './base-skill';
import { TelegramActionType, TelegramErrorType } from '../types';

export class ChatManagementSkill extends BaseTelegramSkill {
  /**
   * Get all chat management-related actions
   */
  getActions(): Record<string, ExtensionAction> {
    return {
      [TelegramActionType.GET_CHAT_INFO]: {
        name: TelegramActionType.GET_CHAT_INFO,
        description: 'Get information about a chat',
        category: ActionCategory.OBSERVATION,
        parameters: { 
          chat_id: 'string|number'
        },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.getChat(params.chat_id);
        }
      },
      
      [TelegramActionType.GET_USER_INFO]: {
        name: TelegramActionType.GET_USER_INFO,
        description: 'Get information about a member of a chat',
        category: ActionCategory.OBSERVATION,
        parameters: { 
          chat_id: 'string|number', 
          user_id: 'number'
        },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.getChatMember(params.chat_id, params.user_id);
        }
      },
      
      [TelegramActionType.GET_CHAT_MEMBERS]: {
        name: TelegramActionType.GET_CHAT_MEMBERS,
        description: 'Get a list of administrators in a chat',
        category: ActionCategory.OBSERVATION,
        parameters: { 
          chat_id: 'string|number'
        },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.getChatAdministrators(params.chat_id);
        }
      },
      
      'get_chat_member_count': {
         name: 'get_chat_member_count',
         description: 'Get the number of members in a chat',
        category: ActionCategory.OBSERVATION,
        parameters: { 
          chat_id: 'string|number'
        },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.getChatMembersCount(params.chat_id);
        }
      },
      
      [TelegramActionType.LEAVE_CHAT]: {
        name: TelegramActionType.LEAVE_CHAT,
        description: 'Leave a chat',
        category: ActionCategory.SYSTEM,
        parameters: { 
          chat_id: 'string|number'
        },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.leaveChat(params.chat_id);
        }
      },
      
      [TelegramActionType.BAN_USER]: {
        name: TelegramActionType.BAN_USER,
        description: 'Ban a user from a chat',
        category: ActionCategory.SOCIAL,
        parameters: { 
          chat_id: 'string|number', 
          user_id: 'number',
          until_date: 'number',
          revoke_messages: 'boolean'
        },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.banChatMember(
            params.chat_id, 
            params.user_id, 
            params.until_date,
            params.revoke_messages
          );
        }
      },
      
      [TelegramActionType.UNBAN_USER]: {
        name: TelegramActionType.UNBAN_USER,
        description: 'Unban a previously banned user in a chat',
        category: ActionCategory.SOCIAL,
        parameters: { 
          chat_id: 'string|number', 
          user_id: 'number',
          only_if_banned: 'boolean'
        },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.unbanChatMember(params.chat_id, params.user_id, params.only_if_banned);
        }
      },
      
      [TelegramActionType.RESTRICT_USER]: {
        name: TelegramActionType.RESTRICT_USER,
        description: 'Restrict a user in a chat',
        category: ActionCategory.SOCIAL,
        parameters: { 
          chat_id: 'string|number', 
          user_id: 'number',
          permissions: 'object',
          until_date: 'number'
        },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.restrictChatMember(
            params.chat_id, 
            params.user_id, 
            params.permissions,
            params.until_date
          );
        }
      },
      
      [TelegramActionType.PROMOTE_USER]: {
        name: TelegramActionType.PROMOTE_USER,
        description: 'Promote or demote a user in a chat',
        category: ActionCategory.SOCIAL,
        parameters: { 
          chat_id: 'string|number', 
          user_id: 'number',
          is_anonymous: 'boolean',
          can_manage_chat: 'boolean',
          can_post_messages: 'boolean',
          can_edit_messages: 'boolean',
          can_delete_messages: 'boolean',
          can_manage_video_chats: 'boolean',
          can_restrict_members: 'boolean',
          can_promote_members: 'boolean',
          can_change_info: 'boolean',
          can_invite_users: 'boolean',
          can_pin_messages: 'boolean'
        },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.promoteChatMember(params.chat_id, params.user_id, params);
        }
      }
    };
  }

  /**
   * Get information about a chat
   */
  async getChat(chatId: string | number): Promise<ActionResult> {
    try {
      const bot = this.extension.getBot();
      const result = await bot.telegram.getChat(chatId);
      
      return this.createSuccessResult({
        chat: result
      });
    } catch (error) {
      return this.createErrorResult(error, TelegramErrorType.INVALID_REQUEST);
    }
  }

  /**
   * Get information about a member of a chat
   */
  async getChatMember(chatId: string | number, userId: number): Promise<ActionResult> {
    try {
      const bot = this.extension.getBot();
      const result = await bot.telegram.getChatMember(chatId, userId);
      
      return this.createSuccessResult({
        member: result
      });
    } catch (error) {
      return this.createErrorResult(error, TelegramErrorType.INVALID_REQUEST);
    }
  }

  /**
   * Get a list of administrators in a chat
   */
  async getChatAdministrators(chatId: string | number): Promise<ActionResult> {
    try {
      const bot = this.extension.getBot();
      const result = await bot.telegram.getChatAdministrators(chatId);
      
      return this.createSuccessResult({
        administrators: result
      });
    } catch (error) {
      return this.createErrorResult(error, TelegramErrorType.INVALID_REQUEST);
    }
  }

  /**
   * Get the number of members in a chat
   */
  async getChatMembersCount(chatId: string | number): Promise<ActionResult> {
    try {
      const bot = this.extension.getBot();
      const result = await bot.telegram.getChatMembersCount(chatId);
      
      return this.createSuccessResult({
        count: result
      });
    } catch (error) {
      return this.createErrorResult(error, TelegramErrorType.INVALID_REQUEST);
    }
  }

  /**
   * Leave a chat
   */
  async leaveChat(chatId: string | number): Promise<ActionResult> {
    try {
      const bot = this.extension.getBot();
      const result = await bot.telegram.leaveChat(chatId);
      
      return this.createSuccessResult({
        success: result
      });
    } catch (error) {
      return this.createErrorResult(error, TelegramErrorType.INVALID_REQUEST);
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
      const bot = this.extension.getBot();
      const options: any = {};
      if (untilDate) options.until_date = untilDate;
      if (revokeMessages) options.revoke_messages = revokeMessages;
      
      const result = await bot.telegram.banChatMember(chatId, userId, options);
      
      return this.createSuccessResult({
        success: result
      });
    } catch (error) {
      return this.createErrorResult(error, TelegramErrorType.INVALID_REQUEST);
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
      const bot = this.extension.getBot();
      const options: any = {};
      if (onlyIfBanned) options.only_if_banned = onlyIfBanned;
      
      const result = await bot.telegram.unbanChatMember(chatId, userId, options);
      
      return this.createSuccessResult({
        success: result
      });
    } catch (error) {
      return this.createErrorResult(error, TelegramErrorType.INVALID_REQUEST);
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
      const bot = this.extension.getBot();
      const options: any = { permissions };
      if (untilDate) options.until_date = untilDate;
      
      const result = await bot.telegram.restrictChatMember(chatId, userId, options);
      
      return this.createSuccessResult({
        success: result
      });
    } catch (error) {
      return this.createErrorResult(error, TelegramErrorType.INVALID_REQUEST);
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
      const bot = this.extension.getBot();
      const result = await bot.telegram.promoteChatMember(chatId, userId, permissions);
      
      return this.createSuccessResult({
        success: result
      });
    } catch (error) {
      return this.createErrorResult(error, TelegramErrorType.INVALID_REQUEST);
    }
  }
}