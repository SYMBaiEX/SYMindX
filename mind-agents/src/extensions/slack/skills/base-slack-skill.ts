/**
 * Base Slack Skill
 * Abstract base class for all Slack skills
 */

import { Agent, ExtensionAction, ActionCategory, ActionResult, ActionResultType } from '../../../types';
import { runtimeLogger } from '../../../utils/logger';
import { SlackSkillConfig, SlackSkillContext } from '../types';

export abstract class BaseSlackSkill {
  protected agent?: Agent;
  protected context?: SlackSkillContext;
  protected config: SlackSkillConfig;

  constructor(config: SlackSkillConfig) {
    this.config = {
      enabled: true,
      priority: 1,
      ...config
    };
  }

  /**
   * Initialize the skill with agent and context
   */
  async initialize(agent: Agent, context: SlackSkillContext): Promise<void> {
    this.agent = agent;
    this.context = context;
    runtimeLogger.info(`🔧 Initializing Slack skill: ${this.config.name}`);
  }

  /**
   * Cleanup the skill
   */
  async cleanup(): Promise<void> {
    runtimeLogger.info(`🧹 Cleaning up Slack skill: ${this.config.name}`);
  }

  /**
   * Get all actions provided by this skill
   */
  abstract getActions(): ExtensionAction[];

  /**
   * Get skill information
   */
  getInfo(): { name: string; description: string; enabled: boolean } {
    return {
      name: this.config.name,
      description: this.config.description,
      enabled: this.config.enabled || true
    };
  }

  /**
   * Check if skill is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled !== false;
  }

  /**
   * Create a standard action for Slack operations
   */
  protected createAction(
    name: string,
    description: string,
    category: ActionCategory,
    parameters: Record<string, any>,
    execute: (agent: Agent, params: any) => Promise<any>
  ): ExtensionAction {
    return {
      name,
      description,
      category,
      parameters,
      execute: async (agent: Agent, params: any): Promise<ActionResult> => {
        try {
          if (!this.context || !this.context.client) {
            throw new Error('Slack client not initialized');
          }

          const result = await execute.call(this, agent, params);
          
          return {
            success: true,
            type: ActionResultType.SUCCESS,
            result,
            timestamp: new Date()
          };
        } catch (error) {
          runtimeLogger.error(`Slack skill action error (${name}):`, error);
          
          return {
            success: false,
            type: ActionResultType.ERROR,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date()
          };
        }
      }
    };
  }

  /**
   * Send a message using Slack client
   */
  protected async sendMessage(
    channel: string,
    text: string,
    options?: any
  ): Promise<any> {
    if (!this.context?.client) {
      throw new Error('Slack client not available');
    }

    return await this.context.client.chat.postMessage({
      channel,
      text,
      ...options
    });
  }

  /**
   * React to a message
   */
  protected async addReaction(
    channel: string,
    timestamp: string,
    emoji: string
  ): Promise<any> {
    if (!this.context?.client) {
      throw new Error('Slack client not available');
    }

    return await this.context.client.reactions.add({
      channel,
      timestamp,
      name: emoji
    });
  }

  /**
   * Get channel information
   */
  protected async getChannelInfo(channel: string): Promise<any> {
    if (!this.context?.client) {
      throw new Error('Slack client not available');
    }

    try {
      const result = await this.context.client.conversations.info({
        channel
      });
      return result.channel;
    } catch (error) {
      runtimeLogger.error('Failed to get channel info:', error);
      return null;
    }
  }

  /**
   * Get user information
   */
  protected async getUserInfo(user: string): Promise<any> {
    if (!this.context?.client) {
      throw new Error('Slack client not available');
    }

    try {
      const result = await this.context.client.users.info({
        user
      });
      return result.user;
    } catch (error) {
      runtimeLogger.error('Failed to get user info:', error);
      return null;
    }
  }

  /**
   * Check if the skill has required permissions
   */
  protected hasPermission(permission: string): boolean {
    // In a real implementation, this would check OAuth scopes
    return true;
  }

  /**
   * Rate limiting check
   */
  protected async checkRateLimit(channel: string): Promise<boolean> {
    if (!this.context?.config.rateLimitPerChannel) {
      return true; // No rate limiting configured
    }

    // Simple rate limiting implementation
    // In production, this would use a more sophisticated approach
    return true;
  }

  /**
   * Format message for Slack
   */
  protected formatMessage(text: string, options?: any): any {
    const formatted: any = {
      text,
      mrkdwn: true
    };

    if (options?.blocks) {
      formatted.blocks = options.blocks;
    }

    if (options?.attachments) {
      formatted.attachments = options.attachments;
    }

    if (options?.thread_ts) {
      formatted.thread_ts = options.thread_ts;
    }

    return formatted;
  }

  /**
   * Parse Slack command
   */
  protected parseCommand(text: string): { command: string; args: string[] } {
    const parts = text.trim().split(/\s+/);
    const command = parts[0]?.toLowerCase() || '';
    const args = parts.slice(1);

    return { command, args };
  }

  /**
   * Check if message mentions the bot
   */
  protected isBotMentioned(text: string, botUserId?: string): boolean {
    if (!botUserId) return false;
    return text.includes(`<@${botUserId}>`);
  }

  /**
   * Extract mentioned users from message
   */
  protected extractMentions(text: string): string[] {
    const mentionRegex = /<@([A-Z0-9]+)>/g;
    const mentions: string[] = [];
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[1]);
    }

    return mentions;
  }

  /**
   * Extract channel references from message
   */
  protected extractChannels(text: string): string[] {
    const channelRegex = /<#([A-Z0-9]+)\|([^>]+)>/g;
    const channels: string[] = [];
    let match;

    while ((match = channelRegex.exec(text)) !== null) {
      channels.push(match[1]);
    }

    return channels;
  }

  /**
   * Clean message text
   */
  protected cleanMessageText(text: string): string {
    // Remove user mentions
    let cleaned = text.replace(/<@[A-Z0-9]+>/g, '');
    
    // Remove channel mentions
    cleaned = cleaned.replace(/<#[A-Z0-9]+\|([^>]+)>/g, '#$1');
    
    // Remove URLs
    cleaned = cleaned.replace(/<(https?:\/\/[^>|]+)(\|([^>]+))?>/g, '$3' || '$1');
    
    // Trim extra whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    return cleaned;
  }
}