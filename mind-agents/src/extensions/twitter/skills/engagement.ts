/**
 * Engagement Skill for Twitter Extension
 * 
 * Provides actions related to engaging with tweets and users.
 */

import { ExtensionAction, Agent, ActionResult, ActionCategory } from '../../../types/agent.js';
import { TwitterExtension } from '../index.js';
import { BaseTwitterSkill } from './base-skill.js';
import { TwitterActionType, TwitterErrorType } from '../types.js';

export class EngagementSkill extends BaseTwitterSkill {
  /**
   * Get all engagement-related actions
   */
  getActions(): Record<string, ExtensionAction> {
    return {
      [TwitterActionType.RETWEET]: {
        name: TwitterActionType.RETWEET,
        description: 'Retweet a tweet',
        category: ActionCategory.SOCIAL,
        parameters: { 
          tweet_id: 'string', 
          comment: 'string' 
        },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.retweetTweet(params.tweet_id, params.comment);
        }
      },
      
      [TwitterActionType.LIKE]: {
        name: TwitterActionType.LIKE,
        description: 'Like a tweet',
        category: ActionCategory.SOCIAL,
        parameters: { 
          tweet_id: 'string' 
        },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.likeTweet(params.tweet_id);
        }
      },
      
      [TwitterActionType.UNLIKE]: {
        name: TwitterActionType.UNLIKE,
        description: 'Unlike a tweet',
        category: ActionCategory.SOCIAL,
        parameters: { 
          tweet_id: 'string' 
        },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.unlikeTweet(params.tweet_id);
        }
      },
      
      [TwitterActionType.BOOKMARK]: {
        name: TwitterActionType.BOOKMARK,
        description: 'Bookmark a tweet',
        category: ActionCategory.SOCIAL,
        parameters: { 
          tweet_id: 'string' 
        },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.bookmarkTweet(params.tweet_id);
        }
      },
      
      [TwitterActionType.REMOVE_BOOKMARK]: {
        name: TwitterActionType.REMOVE_BOOKMARK,
        description: 'Remove a bookmark',
        category: ActionCategory.SOCIAL,
        parameters: { 
          tweet_id: 'string' 
        },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.removeBookmark(params.tweet_id);
        }
      },
      
      [TwitterActionType.QUOTE]: {
        name: TwitterActionType.QUOTE,
        description: 'Quote a tweet',
        category: ActionCategory.SOCIAL,
        parameters: { 
          tweet_id: 'string', 
          text: 'string', 
          media_ids: 'array' 
        },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.quoteTweet(params.tweet_id, params.text, params.media_ids);
        }
      }
    };
  }

  /**
   * Retweet a tweet
   */
  async retweetTweet(tweetId: string, comment?: string): Promise<ActionResult> {
    try {
      // Delegate to the extension's implementation
      return await this.extension.retweet(tweetId);
    } catch (error) {
      return this.createErrorResult(error, TwitterErrorType.INVALID_REQUEST);
    }
  }

  /**
   * Like a tweet
   */
  async likeTweet(tweetId: string): Promise<ActionResult> {
    try {
      // Delegate to the extension's implementation
      return await this.extension.likeTweet(tweetId);
    } catch (error) {
      return this.createErrorResult(error, TwitterErrorType.INVALID_REQUEST);
    }
  }

  /**
   * Unlike a tweet
   */
  async unlikeTweet(tweetId: string): Promise<ActionResult> {
    try {
      // Delegate to the extension's implementation
      return await this.extension.unlikeTweet(tweetId);
    } catch (error) {
      return this.createErrorResult(error, TwitterErrorType.INVALID_REQUEST);
    }
  }

  /**
   * Bookmark a tweet
   */
  async bookmarkTweet(tweetId: string): Promise<ActionResult> {
    try {
      // Delegate to the extension's implementation
      return await this.extension.bookmarkTweet(tweetId);
    } catch (error) {
      return this.createErrorResult(error, TwitterErrorType.INVALID_REQUEST);
    }
  }

  /**
   * Remove a bookmark
   */
  async removeBookmark(tweetId: string): Promise<ActionResult> {
    try {
      // Delegate to the extension's implementation
      return await this.extension.removeBookmark(tweetId);
    } catch (error) {
      return this.createErrorResult(error, TwitterErrorType.INVALID_REQUEST);
    }
  }

  /**
   * Quote a tweet
   */
  async quoteTweet(tweetId: string, text: string, mediaIds?: string[]): Promise<ActionResult> {
    try {
      // Delegate to the extension's implementation
      return await this.extension.quoteTweet(tweetId, text, mediaIds);
    } catch (error) {
      return this.createErrorResult(error, TwitterErrorType.INVALID_REQUEST);
    }
  }
}