/**
 * Messaging Skill
 * Handles sending, receiving, and managing Slack messages
 */

import { Agent, ExtensionAction, ActionCategory } from '../../../types';
import { runtimeLogger } from '../../../utils/logger';
import { BaseSlackSkill } from './base-slack-skill';
import { SlackMessage, SlackBlock, SlackAttachment, SlackMessageOptions } from '../types';

export interface MessagingSkillConfig {
  name: string;
  description: string;
  enabled?: boolean;
  maxMessageLength?: number;
  enableFormatting?: boolean;
  enableAttachments?: boolean;
  enableBlocks?: boolean;
  defaultParseMode?: 'full' | 'none';
  rateLimitPerChannel?: number;
  rateLimitWindow?: number;
}

export class MessagingSkill extends BaseSlackSkill {
  private messageHistory: Map<string, SlackMessage[]> = new Map();
  private rateLimiters: Map<string, { count: number; resetTime: number }> = new Map();

  constructor(config: MessagingSkillConfig) {
    super({
      name: 'Messaging',
      description: 'Handles Slack messaging operations',
      ...config
    });
  }

  getActions(): ExtensionAction[] {
    return [
      this.createAction(
        'sendMessage',
        'Send a message to a Slack channel',
        ActionCategory.COMMUNICATION,
        {
          channel: { type: 'string', description: 'Channel ID or name' },
          text: { type: 'string', description: 'Message text' },
          threadTs: {
            type: 'string',
            description: 'Thread timestamp for replies',
            optional: true
          },
          blocks: {
            type: 'array',
            description: 'Block Kit blocks',
            optional: true
          },
          attachments: {
            type: 'array',
            description: 'Message attachments',
            optional: true
          },
          unfurlLinks: {
            type: 'boolean',
            description: 'Enable link unfurling',
            optional: true
          },
          unfurlMedia: {
            type: 'boolean',
            description: 'Enable media unfurling',
            optional: true
          }
        },
        async (agent: Agent, params: any) => {
          // Check rate limit
          if (!await this.checkRateLimit(params.channel)) {
            throw new Error('Rate limit exceeded for channel');
          }

          // Validate message length
          const maxLength = (this.config as MessagingSkillConfig).maxMessageLength || 4000;
          if (params.text && params.text.length > maxLength) {
            params.text = params.text.substring(0, maxLength - 3) + '...';
          }

          const messageOptions: SlackMessageOptions = {
            thread_ts: params.threadTs,
            unfurl_links: params.unfurlLinks !== false,
            unfurl_media: params.unfurlMedia !== false
          };

          if (params.blocks && (this.config as MessagingSkillConfig).enableBlocks !== false) {
            messageOptions.blocks = params.blocks;
          }

          if (params.attachments && (this.config as MessagingSkillConfig).enableAttachments !== false) {
            messageOptions.attachments = params.attachments;
          }

          const result = await this.sendMessage(
            params.channel,
            params.text,
            messageOptions
          );

          // Store in history
          if (result.ok && result.ts) {
            const message: SlackMessage = {
              type: 'message',
              channel: params.channel,
              user: this.context?.botUser?.id || 'bot',
              text: params.text,
              ts: result.ts,
              thread_ts: params.threadTs,
              blocks: params.blocks,
              attachments: params.attachments
            };
            this.addToHistory(params.channel, message);
          }

          return {
            success: result.ok,
            timestamp: result.ts,
            channel: result.channel,
            message: result.message
          };
        }
      ),

      this.createAction(
        'updateMessage',
        'Update an existing message',
        ActionCategory.COMMUNICATION,
        {
          channel: { type: 'string', description: 'Channel ID' },
          timestamp: { type: 'string', description: 'Message timestamp' },
          text: { type: 'string', description: 'New message text' },
          blocks: {
            type: 'array',
            description: 'New blocks',
            optional: true
          },
          attachments: {
            type: 'array',
            description: 'New attachments',
            optional: true
          }
        },
        async (agent: Agent, params: any) => {
          const updateParams: any = {
            channel: params.channel,
            ts: params.timestamp,
            text: params.text
          };

          if (params.blocks) {
            updateParams.blocks = params.blocks;
          }

          if (params.attachments) {
            updateParams.attachments = params.attachments;
          }

          const result = await this.context!.client.chat.update(updateParams);

          return {
            success: result.ok,
            timestamp: result.ts,
            channel: result.channel,
            text: result.text
          };
        }
      ),

      this.createAction(
        'deleteMessage',
        'Delete a message',
        ActionCategory.COMMUNICATION,
        {
          channel: { type: 'string', description: 'Channel ID' },
          timestamp: { type: 'string', description: 'Message timestamp' }
        },
        async (agent: Agent, params: any) => {
          const result = await this.context!.client.chat.delete({
            channel: params.channel,
            ts: params.timestamp
          });

          return {
            success: result.ok,
            timestamp: params.timestamp,
            channel: params.channel
          };
        }
      ),

      this.createAction(
        'getMessageHistory',
        'Get message history for a channel',
        ActionCategory.COMMUNICATION,
        {
          channel: { type: 'string', description: 'Channel ID' },
          limit: {
            type: 'number',
            description: 'Number of messages to retrieve',
            optional: true
          },
          oldest: {
            type: 'string',
            description: 'Oldest message timestamp',
            optional: true
          },
          latest: {
            type: 'string',
            description: 'Latest message timestamp',
            optional: true
          },
          inclusive: {
            type: 'boolean',
            description: 'Include messages with latest/oldest timestamp',
            optional: true
          }
        },
        async (agent: Agent, params: any) => {
          const result = await this.context!.client.conversations.history({
            channel: params.channel,
            limit: params.limit || 100,
            oldest: params.oldest,
            latest: params.latest,
            inclusive: params.inclusive
          });

          // Store in local history
          if (result.messages) {
            for (const message of result.messages) {
              this.addToHistory(params.channel, message as SlackMessage);
            }
          }

          return {
            messages: result.messages,
            count: result.messages?.length || 0,
            hasMore: result.has_more || false,
            channel: params.channel
          };
        }
      ),

      this.createAction(
        'sendEphemeral',
        'Send an ephemeral message (visible only to one user)',
        ActionCategory.COMMUNICATION,
        {
          channel: { type: 'string', description: 'Channel ID' },
          user: { type: 'string', description: 'User ID' },
          text: { type: 'string', description: 'Message text' },
          blocks: {
            type: 'array',
            description: 'Block Kit blocks',
            optional: true
          },
          attachments: {
            type: 'array',
            description: 'Message attachments',
            optional: true
          }
        },
        async (agent: Agent, params: any) => {
          const result = await this.context!.client.chat.postEphemeral({
            channel: params.channel,
            user: params.user,
            text: params.text,
            blocks: params.blocks,
            attachments: params.attachments
          });

          return {
            success: result.ok,
            messageTimestamp: result.message_ts
          };
        }
      ),

      this.createAction(
        'scheduleMessage',
        'Schedule a message for later',
        ActionCategory.COMMUNICATION,
        {
          channel: { type: 'string', description: 'Channel ID' },
          text: { type: 'string', description: 'Message text' },
          postAt: { type: 'number', description: 'Unix timestamp when to post' },
          threadTs: {
            type: 'string',
            description: 'Thread timestamp for replies',
            optional: true
          }
        },
        async (agent: Agent, params: any) => {
          const result = await this.context!.client.chat.scheduleMessage({
            channel: params.channel,
            text: params.text,
            post_at: params.postAt,
            thread_ts: params.threadTs
          });

          return {
            success: result.ok,
            scheduledMessageId: result.scheduled_message_id,
            postAt: result.post_at,
            channel: params.channel
          };
        }
      ),

      this.createAction(
        'getScheduledMessages',
        'List scheduled messages',
        ActionCategory.COMMUNICATION,
        {
          channel: {
            type: 'string',
            description: 'Filter by channel',
            optional: true
          },
          limit: {
            type: 'number',
            description: 'Maximum number to return',
            optional: true
          }
        },
        async (agent: Agent, params: any) => {
          const result = await this.context!.client.chat.scheduledMessages.list({
            channel: params.channel,
            limit: params.limit || 100
          });

          return {
            messages: result.scheduled_messages,
            count: result.scheduled_messages?.length || 0
          };
        }
      ),

      this.createAction(
        'deleteScheduledMessage',
        'Delete a scheduled message',
        ActionCategory.COMMUNICATION,
        {
          channel: { type: 'string', description: 'Channel ID' },
          scheduledMessageId: { type: 'string', description: 'Scheduled message ID' }
        },
        async (agent: Agent, params: any) => {
          const result = await this.context!.client.chat.deleteScheduledMessage({
            channel: params.channel,
            scheduled_message_id: params.scheduledMessageId
          });

          return {
            success: result.ok
          };
        }
      ),

      this.createAction(
        'getPermalink',
        'Get permalink for a message',
        ActionCategory.COMMUNICATION,
        {
          channel: { type: 'string', description: 'Channel ID' },
          timestamp: { type: 'string', description: 'Message timestamp' }
        },
        async (agent: Agent, params: any) => {
          const result = await this.context!.client.chat.getPermalink({
            channel: params.channel,
            message_ts: params.timestamp
          });

          return {
            permalink: result.permalink,
            channel: params.channel,
            timestamp: params.timestamp
          };
        }
      ),

      this.createAction(
        'searchMessages',
        'Search for messages',
        ActionCategory.COMMUNICATION,
        {
          query: { type: 'string', description: 'Search query' },
          count: {
            type: 'number',
            description: 'Number of results',
            optional: true
          },
          page: {
            type: 'number',
            description: 'Page number',
            optional: true
          }
        },
        async (agent: Agent, params: any) => {
          // Note: search.messages requires additional OAuth scopes
          const result = await this.context!.client.search.messages({
            query: params.query,
            count: params.count || 20,
            page: params.page || 1
          });

          return {
            messages: result.messages?.matches,
            total: result.messages?.total,
            query: params.query,
            page: result.messages?.page,
            pageCount: result.messages?.page_count
          };
        }
      ),

      this.createAction(
        'createBlock',
        'Create a Block Kit block',
        ActionCategory.COMMUNICATION,
        {
          type: { type: 'string', description: 'Block type (section, divider, image, etc.)' },
          text: { 
            type: 'string', 
            description: 'Text content',
            optional: true
          },
          imageUrl: {
            type: 'string',
            description: 'Image URL for image blocks',
            optional: true
          },
          altText: {
            type: 'string',
            description: 'Alt text for images',
            optional: true
          },
          fields: {
            type: 'array',
            description: 'Fields for section blocks',
            optional: true
          }
        },
        async (agent: Agent, params: any) => {
          const block: SlackBlock = {
            type: params.type
          };

          switch (params.type) {
            case 'section':
              if (params.text) {
                block.text = {
                  type: 'mrkdwn',
                  text: params.text
                };
              }
              if (params.fields) {
                block.fields = params.fields.map((field: string) => ({
                  type: 'mrkdwn',
                  text: field
                }));
              }
              break;
            
            case 'image':
              block.image_url = params.imageUrl;
              block.alt_text = params.altText || 'Image';
              break;
            
            case 'divider':
              // Divider blocks don't need additional properties
              break;
            
            case 'header':
              block.text = {
                type: 'plain_text',
                text: params.text || 'Header'
              };
              break;
          }

          return {
            block,
            type: params.type
          };
        }
      ),

      this.createAction(
        'getLocalHistory',
        'Get locally cached message history',
        ActionCategory.COMMUNICATION,
        {
          channel: { type: 'string', description: 'Channel ID' },
          limit: {
            type: 'number',
            description: 'Maximum messages to return',
            optional: true
          }
        },
        async (agent: Agent, params: any) => {
          const history = this.messageHistory.get(params.channel) || [];
          const limit = params.limit || history.length;
          
          return {
            messages: history.slice(-limit),
            count: Math.min(history.length, limit),
            channel: params.channel,
            totalCached: history.length
          };
        }
      )
    ];
  }

  /**
   * Add message to history
   */
  private addToHistory(channel: string, message: SlackMessage): void {
    if (!this.messageHistory.has(channel)) {
      this.messageHistory.set(channel, []);
    }
    
    const history = this.messageHistory.get(channel)!;
    history.push(message);
    
    // Keep only last 1000 messages per channel
    if (history.length > 1000) {
      history.shift();
    }
  }

  /**
   * Check rate limit for channel
   */
  protected override async checkRateLimit(channel: string): Promise<boolean> {
    const rateLimitConfig = this.config as MessagingSkillConfig;
    if (!rateLimitConfig.rateLimitPerChannel) {
      return true;
    }

    const now = Date.now();
    const limiter = this.rateLimiters.get(channel);
    
    if (!limiter || now > limiter.resetTime) {
      this.rateLimiters.set(channel, {
        count: 1,
        resetTime: now + (rateLimitConfig.rateLimitWindow || 60000)
      });
      return true;
    }

    if (limiter.count >= rateLimitConfig.rateLimitPerChannel) {
      return false;
    }

    limiter.count++;
    return true;
  }

  override async cleanup(): Promise<void> {
    await super.cleanup();
    this.messageHistory.clear();
    this.rateLimiters.clear();
  }
}