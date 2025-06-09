/**
 * Search Skill for Twitter Extension
 * 
 * Provides actions related to searching tweets, users, and trends.
 */

import { ExtensionAction, Agent, ActionResult, ActionCategory } from '../../../types/agent.js';
import { TwitterExtension } from '../index.js';
import { BaseTwitterSkill } from './base-skill.js';
import { TwitterActionType, TwitterErrorType } from '../types.js';

export class SearchSkill extends BaseTwitterSkill {
  /**
   * Get all search-related actions
   */
  getActions(): Record<string, ExtensionAction> {
    return {
      [TwitterActionType.SEARCH_TWEETS]: {
        name: TwitterActionType.SEARCH_TWEETS,
        description: 'Search for tweets',
        category: ActionCategory.OBSERVATION,
        parameters: { 
          query: 'string', 
          max_results: 'string', 
          next_token: 'string' 
        },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.searchTweets(params.query, params.max_results, params.next_token);
        }
      },
      
      [TwitterActionType.SEARCH_USERS]: {
        name: TwitterActionType.SEARCH_USERS,
        description: 'Search for users',
        category: ActionCategory.OBSERVATION,
        parameters: { 
          query: 'string', 
          max_results: 'number', 
          next_token: 'string' 
        },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.searchUsers(params.query, params.max_results, params.next_token);
        }
      },
      
      [TwitterActionType.SEARCH_TRENDING]: {
        name: TwitterActionType.SEARCH_TRENDING,
        description: 'Get trending topics',
        category: ActionCategory.OBSERVATION,
        parameters: { 
          woeid: 'number' 
        },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.getTrends(params.woeid);
        }
      }
    };
  }

  /**
   * Search for tweets
   */
  async searchTweets(query: string, maxResults?: number, nextToken?: string): Promise<ActionResult> {
    try {
      // Delegate to the extension's implementation
      return await this.extension.searchTweets(query, maxResults, nextToken);
    } catch (error) {
      return this.createErrorResult(error, TwitterErrorType.INVALID_REQUEST);
    }
  }

  /**
   * Search for users
   */
  async searchUsers(query: string, maxResults?: number, nextToken?: string): Promise<ActionResult> {
    try {
      // Delegate to the extension's implementation
      return await this.extension.searchUsers(query, maxResults, nextToken);
    } catch (error) {
      return this.createErrorResult(error, TwitterErrorType.INVALID_REQUEST);
    }
  }

  /**
   * Get trending topics
   * @param woeid - Where On Earth ID (Yahoo's location identifier)
   */
  async getTrends(woeid: number = 1): Promise<ActionResult> {
    try {
      // Delegate to the extension's implementation
      return await this.extension.getTrends(woeid);
    } catch (error) {
      return this.createErrorResult(error, TwitterErrorType.INVALID_REQUEST);
    }
  }
}