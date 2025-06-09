/**
 * User Management Skill for Twitter Extension
 * 
 * Provides actions related to managing user relationships and profile.
 */

import { ExtensionAction, Agent, ActionResult, ActionCategory } from '../../../types/agent.js';
import { TwitterExtension } from '../index.js';
import { BaseTwitterSkill } from './base-skill.js';
import { TwitterActionType, TwitterErrorType } from '../types.js';

export class UserManagementSkill extends BaseTwitterSkill {
  /**
   * Get all user management-related actions
   */
  getActions(): Record<string, ExtensionAction> {
    return {
      [TwitterActionType.FOLLOW]: {
        name: TwitterActionType.FOLLOW,
        description: 'Follow a user',
        category: ActionCategory.SOCIAL,
        parameters: { 
          user_id: 'string' 
        },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.followUser(params.user_id);
        }
      },
      
      [TwitterActionType.UNFOLLOW]: {
        name: TwitterActionType.UNFOLLOW,
        description: 'Unfollow a user',
        category: ActionCategory.SOCIAL,
        parameters: { 
          user_id: 'string' 
        },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.unfollowUser(params.user_id);
        }
      },
      
      [TwitterActionType.BLOCK]: {
        name: TwitterActionType.BLOCK,
        description: 'Block a user',
        category: ActionCategory.SOCIAL,
        parameters: { 
          user_id: 'string' 
        },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.blockUser(params.user_id);
        }
      },
      
      [TwitterActionType.UNBLOCK]: {
        name: TwitterActionType.UNBLOCK,
        description: 'Unblock a user',
        category: ActionCategory.SOCIAL,
        parameters: { 
          user_id: 'string' 
        },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.unblockUser(params.user_id);
        }
      },
      
      [TwitterActionType.MUTE]: {
        name: TwitterActionType.MUTE,
        description: 'Mute a user',
        category: ActionCategory.SOCIAL,
        parameters: { 
          user_id: 'string' 
        },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.muteUser(params.user_id);
        }
      },
      
      [TwitterActionType.UNMUTE]: {
        name: TwitterActionType.UNMUTE,
        description: 'Unmute a user',
        category: ActionCategory.SOCIAL,
        parameters: { 
          user_id: 'string' 
        },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.unmuteUser(params.user_id);
        }
      },
      
      'get_user_info': {
        name: 'get_user_info',
        description: 'Get information about a user',
        category: ActionCategory.OBSERVATION,
        parameters: { 
          username: 'string', 
          user_id: 'string' 
        },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.getUserInfo(params.username, params.user_id);
        }
      },
      
      'get_followers': {
        name: 'get_followers',
        description: 'Get followers of a user',
        category: ActionCategory.OBSERVATION,
        parameters: { 
          user_id: 'string', 
          max_results: 'number', 
          next_token: 'string' 
        },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.getFollowers(params.user_id, params.max_results, params.next_token);
        }
      },
      
      'get_following': {
        name: 'get_following',
        description: 'Get users that a user is following',
        category: ActionCategory.OBSERVATION,
        parameters: { 
          user_id: 'string', 
          max_results: 'number', 
          next_token: 'string' 
        },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.getFollowing(params.user_id, params.max_results, params.next_token);
        }
      }
    };
  }

  /**
   * Follow a user
   */
  async followUser(userId: string): Promise<ActionResult> {
    try {
      // Delegate to the extension's implementation
      return await this.extension.followUser(userId);
    } catch (error) {
      return this.createErrorResult(error, TwitterErrorType.INVALID_REQUEST);
    }
  }

  /**
   * Unfollow a user
   */
  async unfollowUser(userId: string): Promise<ActionResult> {
    try {
      // Delegate to the extension's implementation
      return await this.extension.unfollowUser(userId);
    } catch (error) {
      return this.createErrorResult(error, TwitterErrorType.INVALID_REQUEST);
    }
  }

  /**
   * Get information about a user
   */
  async getUserInfo(username?: string, userId?: string): Promise<ActionResult> {
    try {
      if (!username && !userId) {
        return this.createErrorResult('Either username or user_id must be provided', TwitterErrorType.INVALID_REQUEST);
      }
      
      // Delegate to the extension's implementation
      return await this.extension.getUserInfo(username, userId);
    } catch (error) {
      return this.createErrorResult(error, TwitterErrorType.RESOURCE_NOT_FOUND);
    }
  }

  /**
   * Get followers of a user
   */
  async getFollowers(userId: string, maxResults?: number, nextToken?: string): Promise<ActionResult> {
    try {
      // Delegate to the extension's implementation
      return await this.extension.getFollowers(userId, maxResults, nextToken);
    } catch (error) {
      return this.createErrorResult(error, TwitterErrorType.RESOURCE_NOT_FOUND);
    }
  }

  /**
   * Get users that a user is following
   */
  async getFollowing(userId: string, maxResults?: number, nextToken?: string): Promise<ActionResult> {
    try {
      // Delegate to the extension's implementation
      return await this.extension.getFollowing(userId, maxResults, nextToken);
    } catch (error) {
      return this.createErrorResult(error, TwitterErrorType.RESOURCE_NOT_FOUND);
    }
  }

  /**
   * Block a user
   */
  async blockUser(userId: string): Promise<ActionResult> {
    try {
      // Delegate to the extension's implementation
      return await this.extension.blockUser(userId);
    } catch (error) {
      return this.createErrorResult(error, TwitterErrorType.INVALID_REQUEST);
    }
  }

  /**
   * Unblock a user
   */
  async unblockUser(userId: string): Promise<ActionResult> {
    try {
      // Delegate to the extension's implementation
      return await this.extension.unblockUser(userId);
    } catch (error) {
      return this.createErrorResult(error, TwitterErrorType.INVALID_REQUEST);
    }
  }

  /**
   * Mute a user
   */
  async muteUser(userId: string): Promise<ActionResult> {
    try {
      // Delegate to the extension's implementation
      return await this.extension.muteUser(userId);
    } catch (error) {
      return this.createErrorResult(error, TwitterErrorType.INVALID_REQUEST);
    }
  }

  /**
   * Unmute a user
   */
  async unmuteUser(userId: string): Promise<ActionResult> {
    try {
      // Delegate to the extension's implementation
      return await this.extension.unmuteUser(userId);
    } catch (error) {
      return this.createErrorResult(error, TwitterErrorType.INVALID_REQUEST);
    }
  }
}