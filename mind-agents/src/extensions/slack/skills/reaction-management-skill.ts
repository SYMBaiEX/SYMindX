/**
 * Reaction Management Skill
 * Handles emoji reactions and reaction-based interactions
 */

import { Agent, ExtensionAction, ActionCategory } from '../../../types';
import { runtimeLogger } from '../../../utils/logger';
import { BaseSlackSkill } from './base-slack-skill';
import { SlackReaction, SlackSkillConfig } from '../types';

export interface ReactionManagementSkillConfig extends SlackSkillConfig {
  enableReactionTracking?: boolean;
  trackReactionHistory?: boolean;
  maxReactionHistory?: number;
  allowedReactions?: string[];
  blockedReactions?: string[];
  enableReactionNotifications?: boolean;
  reactionCooldownMs?: number;
}

interface ReactionEvent {
  emoji: string;
  user: string;
  channel: string;
  messageTs: string;
  action: 'added' | 'removed';
  timestamp: number;
}

export class ReactionManagementSkill extends BaseSlackSkill {
  private reactionHistory: ReactionEvent[] = [];
  private reactionCounts: Map<string, Map<string, number>> = new Map(); // channel-messageTs -> emoji -> count
  private reactionCooldowns: Map<string, number> = new Map(); // user-emoji -> timestamp
  private customEmojis: Map<string, any> = new Map();

  constructor(config: ReactionManagementSkillConfig) {
    super({
      name: 'Reaction Management',
      description: 'Handles Slack emoji reactions and reaction-based interactions',
      ...config
    });
  }

  getActions(): ExtensionAction[] {
    return [
      this.createAction(
        'addReaction',
        'Add an emoji reaction to a message',
        ActionCategory.COMMUNICATION,
        {
          channel: { type: 'string', description: 'Channel ID' },
          timestamp: { type: 'string', description: 'Message timestamp' },
          emoji: { type: 'string', description: 'Emoji name (without colons)' }
        },
        async (agent: Agent, params: any) => {
          // Check cooldown
          const cooldownKey = `${this.context?.botUser?.id || 'bot'}-${params.emoji}`;
          const config = this.config as ReactionManagementSkillConfig;
          const cooldown = config.reactionCooldownMs || 1000;
          
          if (this.reactionCooldowns.has(cooldownKey)) {
            const lastUsed = this.reactionCooldowns.get(cooldownKey)!;
            if (Date.now() - lastUsed < cooldown) {
              throw new Error(`Reaction cooldown active. Wait ${Math.ceil((cooldown - (Date.now() - lastUsed)) / 1000)}s`);
            }
          }

          // Check if emoji is allowed
          if (!this.isEmojiAllowed(params.emoji)) {
            throw new Error(`Emoji '${params.emoji}' is not allowed`);
          }

          const result = await this.addReaction(
            params.channel,
            params.timestamp,
            params.emoji
          );

          // Track reaction
          if (config.enableReactionTracking && result.ok) {
            this.trackReaction({
              emoji: params.emoji,
              user: this.context?.botUser?.id || 'bot',
              channel: params.channel,
              messageTs: params.timestamp,
              action: 'added',
              timestamp: Date.now()
            });
            
            this.reactionCooldowns.set(cooldownKey, Date.now());
          }

          return {
            success: result.ok,
            emoji: params.emoji,
            channel: params.channel,
            messageTs: params.timestamp
          };
        }
      ),

      this.createAction(
        'removeReaction',
        'Remove an emoji reaction from a message',
        ActionCategory.COMMUNICATION,
        {
          channel: { type: 'string', description: 'Channel ID' },
          timestamp: { type: 'string', description: 'Message timestamp' },
          emoji: { type: 'string', description: 'Emoji name (without colons)' }
        },
        async (agent: Agent, params: any) => {
          const result = await this.context!.client.reactions.remove({
            channel: params.channel,
            timestamp: params.timestamp,
            name: params.emoji
          });

          // Track reaction removal
          const config = this.config as ReactionManagementSkillConfig;
          if (config.enableReactionTracking && result.ok) {
            this.trackReaction({
              emoji: params.emoji,
              user: this.context?.botUser?.id || 'bot',
              channel: params.channel,
              messageTs: params.timestamp,
              action: 'removed',
              timestamp: Date.now()
            });
          }

          return {
            success: result.ok,
            emoji: params.emoji,
            channel: params.channel,
            messageTs: params.timestamp
          };
        }
      ),

      this.createAction(
        'getMessageReactions',
        'Get all reactions on a message',
        ActionCategory.COMMUNICATION,
        {
          channel: { type: 'string', description: 'Channel ID' },
          timestamp: { type: 'string', description: 'Message timestamp' },
          full: {
            type: 'boolean',
            description: 'Get full reaction details',
            optional: true
          }
        },
        async (agent: Agent, params: any) => {
          const result = await this.context!.client.reactions.get({
            channel: params.channel,
            timestamp: params.timestamp,
            full: params.full || false
          });

          if (!result.message) {
            throw new Error('Message not found or no reactions');
          }

          const reactions = result.message.reactions || [];
          const formattedReactions = reactions.map((reaction: any) => ({
            emoji: reaction.name,
            count: reaction.count,
            users: reaction.users || []
          }));

          return {
            reactions: formattedReactions,
            totalReactions: reactions.length,
            totalCount: reactions.reduce((sum: number, r: any) => sum + r.count, 0),
            channel: params.channel,
            messageTs: params.timestamp
          };
        }
      ),

      this.createAction(
        'getReactionHistory',
        'Get reaction history for tracking and analytics',
        ActionCategory.ANALYTICS,
        {
          channel: {
            type: 'string',
            description: 'Filter by channel',
            optional: true
          },
          user: {
            type: 'string',
            description: 'Filter by user',
            optional: true
          },
          emoji: {
            type: 'string',
            description: 'Filter by emoji',
            optional: true
          },
          limit: {
            type: 'number',
            description: 'Maximum events to return',
            optional: true
          },
          since: {
            type: 'number',
            description: 'Unix timestamp - events since this time',
            optional: true
          }
        },
        async (agent: Agent, params: any) => {
          let filteredHistory = this.reactionHistory;

          // Apply filters
          if (params.channel) {
            filteredHistory = filteredHistory.filter(event => event.channel === params.channel);
          }
          if (params.user) {
            filteredHistory = filteredHistory.filter(event => event.user === params.user);
          }
          if (params.emoji) {
            filteredHistory = filteredHistory.filter(event => event.emoji === params.emoji);
          }
          if (params.since) {
            filteredHistory = filteredHistory.filter(event => event.timestamp >= params.since);
          }

          // Apply limit
          if (params.limit) {
            filteredHistory = filteredHistory.slice(-params.limit);
          }

          // Calculate statistics
          const stats = {
            totalEvents: filteredHistory.length,
            addedCount: filteredHistory.filter(e => e.action === 'added').length,
            removedCount: filteredHistory.filter(e => e.action === 'removed').length,
            uniqueEmojis: new Set(filteredHistory.map(e => e.emoji)).size,
            uniqueUsers: new Set(filteredHistory.map(e => e.user)).size,
            uniqueChannels: new Set(filteredHistory.map(e => e.channel)).size
          };

          return {
            events: filteredHistory,
            statistics: stats,
            filters: {
              channel: params.channel,
              user: params.user,
              emoji: params.emoji,
              limit: params.limit,
              since: params.since
            }
          };
        }
      ),

      this.createAction(
        'getTopReactions',
        'Get most popular reactions by various metrics',
        ActionCategory.ANALYTICS,
        {
          metric: {
            type: 'string',
            description: 'Metric to sort by: count, users, channels',
            optional: true
          },
          timeframe: {
            type: 'number',
            description: 'Time window in milliseconds',
            optional: true
          },
          limit: {
            type: 'number',
            description: 'Number of top reactions to return',
            optional: true
          }
        },
        async (agent: Agent, params: any) => {
          const metric = params.metric || 'count';
          const limit = params.limit || 10;
          const timeframe = params.timeframe;
          
          let events = this.reactionHistory;
          
          // Filter by timeframe if provided
          if (timeframe) {
            const cutoff = Date.now() - timeframe;
            events = events.filter(event => event.timestamp >= cutoff);
          }

          // Group by emoji
          const emojiStats = new Map<string, {
            emoji: string;
            count: number;
            uniqueUsers: Set<string>;
            uniqueChannels: Set<string>;
            addedCount: number;
            removedCount: number;
          }>();

          for (const event of events) {
            if (!emojiStats.has(event.emoji)) {
              emojiStats.set(event.emoji, {
                emoji: event.emoji,
                count: 0,
                uniqueUsers: new Set(),
                uniqueChannels: new Set(),
                addedCount: 0,
                removedCount: 0
              });
            }

            const stats = emojiStats.get(event.emoji)!;
            stats.uniqueUsers.add(event.user);
            stats.uniqueChannels.add(event.channel);
            
            if (event.action === 'added') {
              stats.count++;
              stats.addedCount++;
            } else {
              stats.removedCount++;
            }
          }

          // Convert to array and sort
          const sortedReactions = Array.from(emojiStats.values()).map(stats => ({
            emoji: stats.emoji,
            count: stats.count,
            uniqueUsers: stats.uniqueUsers.size,
            uniqueChannels: stats.uniqueChannels.size,
            addedCount: stats.addedCount,
            removedCount: stats.removedCount,
            netCount: stats.addedCount - stats.removedCount
          }));

          // Sort by specified metric
          sortedReactions.sort((a, b) => {
            switch (metric) {
              case 'users':
                return b.uniqueUsers - a.uniqueUsers;
              case 'channels':
                return b.uniqueChannels - a.uniqueChannels;
              case 'net':
                return b.netCount - a.netCount;
              default:
                return b.count - a.count;
            }
          });

          return {
            topReactions: sortedReactions.slice(0, limit),
            metric,
            timeframe,
            totalEmojis: sortedReactions.length,
            totalEvents: events.length
          };
        }
      ),

      this.createAction(
        'bulkAddReactions',
        'Add multiple reactions to a message',
        ActionCategory.COMMUNICATION,
        {
          channel: { type: 'string', description: 'Channel ID' },
          timestamp: { type: 'string', description: 'Message timestamp' },
          emojis: { type: 'array', description: 'Array of emoji names' },
          delay: {
            type: 'number',
            description: 'Delay between reactions in ms',
            optional: true
          }
        },
        async (agent: Agent, params: any) => {
          const delay = params.delay || 500;
          const results: any[] = [];
          const config = this.config as ReactionManagementSkillConfig;

          for (const emoji of params.emojis) {
            try {
              if (!this.isEmojiAllowed(emoji)) {
                results.push({
                  emoji,
                  success: false,
                  error: `Emoji '${emoji}' is not allowed`
                });
                continue;
              }

              const result = await this.addReaction(
                params.channel,
                params.timestamp,
                emoji
              );

              results.push({
                emoji,
                success: result.ok,
                error: result.ok ? null : result.error
              });

              // Track successful reactions
              if (config.enableReactionTracking && result.ok) {
                this.trackReaction({
                  emoji,
                  user: this.context?.botUser?.id || 'bot',
                  channel: params.channel,
                  messageTs: params.timestamp,
                  action: 'added',
                  timestamp: Date.now()
                });
              }

              // Add delay between reactions to avoid rate limits
              if (delay > 0) {
                await new Promise(resolve => setTimeout(resolve, delay));
              }

            } catch (error) {
              results.push({
                emoji,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
              });
            }
          }

          const successCount = results.filter(r => r.success).length;

          return {
            results,
            successCount,
            totalCount: params.emojis.length,
            channel: params.channel,
            messageTs: params.timestamp
          };
        }
      ),

      this.createAction(
        'listCustomEmojis',
        'List available custom emojis in the workspace',
        ActionCategory.UTILITY,
        {
          limit: {
            type: 'number',
            description: 'Maximum emojis to return',
            optional: true
          }
        },
        async (agent: Agent, params: any) => {
          const result = await this.context!.client.emoji.list();

          if (!result.ok || !result.emoji) {
            throw new Error('Failed to fetch emoji list');
          }

          const emojis = Object.entries(result.emoji).map(([name, url]) => ({
            name,
            url,
            isCustom: true
          }));

          // Cache the results
          for (const emoji of emojis) {
            this.customEmojis.set(emoji.name, emoji);
          }

          const limited = params.limit ? emojis.slice(0, params.limit) : emojis;

          return {
            emojis: limited,
            totalCount: emojis.length,
            returnedCount: limited.length
          };
        }
      ),

      this.createAction(
        'reactWithPattern',
        'Add reactions following a specific pattern',
        ActionCategory.COMMUNICATION,
        {
          channel: { type: 'string', description: 'Channel ID' },
          timestamp: { type: 'string', description: 'Message timestamp' },
          pattern: {
            type: 'string',
            description: 'Pattern type: numbers, letters, thumbs, hearts, checkmark'
          },
          count: {
            type: 'number',
            description: 'Number of reactions to add',
            optional: true
          }
        },
        async (agent: Agent, params: any) => {
          const patterns: Record<string, string[]> = {
            numbers: ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'keycap_ten'],
            letters: ['regional_indicator_a', 'regional_indicator_b', 'regional_indicator_c', 'regional_indicator_d', 'regional_indicator_e'],
            thumbs: ['thumbsup', 'thumbsdown'],
            hearts: ['heart', 'yellow_heart', 'green_heart', 'blue_heart', 'purple_heart', 'orange_heart'],
            checkmark: ['white_check_mark', 'ballot_box_with_check', 'heavy_check_mark'],
            rating: ['star', 'star2', 'sparkles', 'glowing_star']
          };

          const patternEmojis = patterns[params.pattern];
          if (!patternEmojis) {
            throw new Error(`Unknown pattern: ${params.pattern}. Available: ${Object.keys(patterns).join(', ')}`);
          }

          const count = Math.min(params.count || patternEmojis.length, patternEmojis.length);
          const emojisToAdd = patternEmojis.slice(0, count);

          // Use bulk add reactions
          const bulkResult = await this.getActions()
            .find(action => action.name === 'bulkAddReactions')!
            .execute(agent, {
              channel: params.channel,
              timestamp: params.timestamp,
              emojis: emojisToAdd,
              delay: 300
            });

          return {
            pattern: params.pattern,
            emojisAdded: emojisToAdd,
            ...bulkResult.result
          };
        }
      ),

      this.createAction(
        'clearReactionHistory',
        'Clear stored reaction history',
        ActionCategory.UTILITY,
        {
          olderThan: {
            type: 'number',
            description: 'Clear events older than this timestamp',
            optional: true
          },
          channel: {
            type: 'string',
            description: 'Clear events for specific channel only',
            optional: true
          }
        },
        async (agent: Agent, params: any) => {
          const originalCount = this.reactionHistory.length;
          
          if (params.olderThan || params.channel) {
            this.reactionHistory = this.reactionHistory.filter(event => {
              if (params.olderThan && event.timestamp < params.olderThan) {
                return false;
              }
              if (params.channel && event.channel === params.channel) {
                return false;
              }
              return true;
            });
          } else {
            this.reactionHistory = [];
          }

          const clearedCount = originalCount - this.reactionHistory.length;

          return {
            clearedCount,
            remainingCount: this.reactionHistory.length,
            filters: {
              olderThan: params.olderThan,
              channel: params.channel
            }
          };
        }
      )
    ];
  }

  /**
   * Track a reaction event
   */
  private trackReaction(event: ReactionEvent): void {
    const config = this.config as ReactionManagementSkillConfig;
    
    if (!config.trackReactionHistory) {
      return;
    }

    this.reactionHistory.push(event);

    // Maintain history size limit
    const maxHistory = config.maxReactionHistory || 10000;
    if (this.reactionHistory.length > maxHistory) {
      this.reactionHistory = this.reactionHistory.slice(-maxHistory);
    }

    // Update reaction counts
    const messageKey = `${event.channel}-${event.messageTs}`;
    if (!this.reactionCounts.has(messageKey)) {
      this.reactionCounts.set(messageKey, new Map());
    }

    const messageCounts = this.reactionCounts.get(messageKey)!;
    const currentCount = messageCounts.get(event.emoji) || 0;
    
    if (event.action === 'added') {
      messageCounts.set(event.emoji, currentCount + 1);
    } else if (event.action === 'removed' && currentCount > 0) {
      messageCounts.set(event.emoji, currentCount - 1);
    }

    runtimeLogger.debug('Tracked reaction event', {
      emoji: event.emoji,
      action: event.action,
      user: event.user,
      channel: event.channel
    });
  }

  /**
   * Check if an emoji is allowed
   */
  private isEmojiAllowed(emoji: string): boolean {
    const config = this.config as ReactionManagementSkillConfig;

    // Check blocked list first
    if (config.blockedReactions?.includes(emoji)) {
      return false;
    }

    // If allowed list exists, emoji must be in it
    if (config.allowedReactions && config.allowedReactions.length > 0) {
      return config.allowedReactions.includes(emoji);
    }

    // Default: allow all emojis
    return true;
  }

  /**
   * Cleanup on skill shutdown
   */
  override async cleanup(): Promise<void> {
    await super.cleanup();
    this.reactionHistory = [];
    this.reactionCounts.clear();
    this.reactionCooldowns.clear();
    this.customEmojis.clear();
    runtimeLogger.info('🧹 Reaction Management skill cleaned up');
  }
}