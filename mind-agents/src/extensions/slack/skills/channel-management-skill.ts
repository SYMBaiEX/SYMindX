/**
 * Channel Management Skill
 * Handles Slack channel operations including joining, leaving, listing, and managing channels
 */

import { Agent, ExtensionAction, ActionCategory } from '../../../types';
import { runtimeLogger } from '../../../utils/logger';
import { BaseSlackSkill } from './base-slack-skill';
import { SlackChannel, SlackChannelState } from '../types';

export interface ChannelManagementSkillConfig {
  name: string;
  description: string;
  enabled?: boolean;
  autoJoinChannels?: string[];
  maxChannels?: number;
  allowPrivateChannels?: boolean;
  allowArchiving?: boolean;
}

export class ChannelManagementSkill extends BaseSlackSkill {
  private channelCache: Map<string, SlackChannel> = new Map();
  private joinedChannels: Set<string> = new Set();

  constructor(config: ChannelManagementSkillConfig) {
    super({
      name: 'Channel Management',
      description: 'Manages Slack channel operations',
      ...config
    });
  }

  override async initialize(agent: Agent, context: any): Promise<void> {
    await super.initialize(agent, context);
    
    // Auto-join configured channels
    const autoJoinChannels = (this.config as ChannelManagementSkillConfig).autoJoinChannels;
    if (autoJoinChannels && autoJoinChannels.length > 0) {
      for (const channel of autoJoinChannels) {
        try {
          await this.joinChannel(channel);
        } catch (error) {
          runtimeLogger.error(`Failed to auto-join channel ${channel}:`, error);
        }
      }
    }
  }

  getActions(): ExtensionAction[] {
    return [
      this.createAction(
        'listChannels',
        'List all available Slack channels',
        ActionCategory.COMMUNICATION,
        {
          types: { 
            type: 'array', 
            description: 'Channel types to include (public, private, im, mpim)',
            optional: true
          },
          excludeArchived: {
            type: 'boolean',
            description: 'Exclude archived channels',
            optional: true
          },
          limit: {
            type: 'number',
            description: 'Maximum number of channels to return',
            optional: true
          }
        },
        async (agent: Agent, params: any) => {
          const types = params.types || ['public_channel'];
          const excludeArchived = params.excludeArchived !== false;
          const limit = params.limit || 100;

          const result = await this.context!.client.conversations.list({
            types: types.join(','),
            exclude_archived: excludeArchived,
            limit
          });

          if (result.channels) {
            // Update cache
            for (const channel of result.channels) {
              this.channelCache.set(channel.id!, channel as SlackChannel);
            }
          }

          return {
            channels: result.channels,
            count: result.channels?.length || 0,
            hasMore: result.has_more || false
          };
        }
      ),

      this.createAction(
        'joinChannel',
        'Join a Slack channel',
        ActionCategory.COMMUNICATION,
        {
          channel: { type: 'string', description: 'Channel ID or name' }
        },
        async (agent: Agent, params: any) => {
          const channelId = await this.resolveChannelId(params.channel);
          
          const result = await this.context!.client.conversations.join({
            channel: channelId
          });

          if (result.ok) {
            this.joinedChannels.add(channelId);
            runtimeLogger.info(`Joined channel: ${channelId}`);
          }

          return {
            success: result.ok,
            channel: result.channel,
            channelId
          };
        }
      ),

      this.createAction(
        'leaveChannel',
        'Leave a Slack channel',
        ActionCategory.COMMUNICATION,
        {
          channel: { type: 'string', description: 'Channel ID or name' }
        },
        async (agent: Agent, params: any) => {
          const channelId = await this.resolveChannelId(params.channel);
          
          const result = await this.context!.client.conversations.leave({
            channel: channelId
          });

          if (result.ok) {
            this.joinedChannels.delete(channelId);
            runtimeLogger.info(`Left channel: ${channelId}`);
          }

          return {
            success: result.ok,
            channelId
          };
        }
      ),

      this.createAction(
        'getChannelInfo',
        'Get detailed information about a channel',
        ActionCategory.COMMUNICATION,
        {
          channel: { type: 'string', description: 'Channel ID or name' },
          includeNumMembers: {
            type: 'boolean',
            description: 'Include member count',
            optional: true
          }
        },
        async (agent: Agent, params: any) => {
          const channelId = await this.resolveChannelId(params.channel);
          
          const result = await this.context!.client.conversations.info({
            channel: channelId,
            include_num_members: params.includeNumMembers || false
          });

          if (result.channel) {
            this.channelCache.set(channelId, result.channel as SlackChannel);
          }

          return {
            channel: result.channel,
            isMember: result.channel?.is_member || false,
            memberCount: result.channel?.num_members
          };
        }
      ),

      this.createAction(
        'createChannel',
        'Create a new Slack channel',
        ActionCategory.COMMUNICATION,
        {
          name: { type: 'string', description: 'Channel name' },
          isPrivate: {
            type: 'boolean',
            description: 'Create as private channel',
            optional: true
          },
          description: {
            type: 'string',
            description: 'Channel description',
            optional: true
          }
        },
        async (agent: Agent, params: any) => {
          const result = await this.context!.client.conversations.create({
            name: params.name,
            is_private: params.isPrivate || false
          });

          if (result.channel) {
            this.channelCache.set(result.channel.id!, result.channel as SlackChannel);
            this.joinedChannels.add(result.channel.id!);

            // Set topic/purpose if provided
            if (params.description) {
              await this.context!.client.conversations.setPurpose({
                channel: result.channel.id!,
                purpose: params.description
              });
            }
          }

          return {
            success: result.ok,
            channel: result.channel,
            channelId: result.channel?.id
          };
        }
      ),

      this.createAction(
        'archiveChannel',
        'Archive a Slack channel',
        ActionCategory.COMMUNICATION,
        {
          channel: { type: 'string', description: 'Channel ID or name' }
        },
        async (agent: Agent, params: any) => {
          if (!(this.config as ChannelManagementSkillConfig).allowArchiving) {
            throw new Error('Channel archiving is not allowed');
          }

          const channelId = await this.resolveChannelId(params.channel);
          
          const result = await this.context!.client.conversations.archive({
            channel: channelId
          });

          if (result.ok) {
            const channel = this.channelCache.get(channelId);
            if (channel) {
              channel.is_archived = true;
            }
          }

          return {
            success: result.ok,
            channelId
          };
        }
      ),

      this.createAction(
        'unarchiveChannel',
        'Unarchive a Slack channel',
        ActionCategory.COMMUNICATION,
        {
          channel: { type: 'string', description: 'Channel ID or name' }
        },
        async (agent: Agent, params: any) => {
          const channelId = await this.resolveChannelId(params.channel);
          
          const result = await this.context!.client.conversations.unarchive({
            channel: channelId
          });

          if (result.ok) {
            const channel = this.channelCache.get(channelId);
            if (channel) {
              channel.is_archived = false;
            }
          }

          return {
            success: result.ok,
            channelId
          };
        }
      ),

      this.createAction(
        'setChannelTopic',
        'Set channel topic',
        ActionCategory.COMMUNICATION,
        {
          channel: { type: 'string', description: 'Channel ID or name' },
          topic: { type: 'string', description: 'New topic' }
        },
        async (agent: Agent, params: any) => {
          const channelId = await this.resolveChannelId(params.channel);
          
          const result = await this.context!.client.conversations.setTopic({
            channel: channelId,
            topic: params.topic
          });

          return {
            success: result.ok,
            channelId,
            topic: params.topic
          };
        }
      ),

      this.createAction(
        'setChannelPurpose',
        'Set channel purpose/description',
        ActionCategory.COMMUNICATION,
        {
          channel: { type: 'string', description: 'Channel ID or name' },
          purpose: { type: 'string', description: 'New purpose' }
        },
        async (agent: Agent, params: any) => {
          const channelId = await this.resolveChannelId(params.channel);
          
          const result = await this.context!.client.conversations.setPurpose({
            channel: channelId,
            purpose: params.purpose
          });

          return {
            success: result.ok,
            channelId,
            purpose: params.purpose
          };
        }
      ),

      this.createAction(
        'getChannelMembers',
        'Get members of a channel',
        ActionCategory.COMMUNICATION,
        {
          channel: { type: 'string', description: 'Channel ID or name' },
          limit: {
            type: 'number',
            description: 'Maximum number of members to return',
            optional: true
          }
        },
        async (agent: Agent, params: any) => {
          const channelId = await this.resolveChannelId(params.channel);
          
          const result = await this.context!.client.conversations.members({
            channel: channelId,
            limit: params.limit || 100
          });

          return {
            members: result.members,
            count: result.members?.length || 0,
            channelId
          };
        }
      ),

      this.createAction(
        'inviteToChannel',
        'Invite users to a channel',
        ActionCategory.COMMUNICATION,
        {
          channel: { type: 'string', description: 'Channel ID or name' },
          users: { type: 'array', description: 'User IDs to invite' }
        },
        async (agent: Agent, params: any) => {
          const channelId = await this.resolveChannelId(params.channel);
          const userIds = Array.isArray(params.users) ? params.users : [params.users];
          
          const result = await this.context!.client.conversations.invite({
            channel: channelId,
            users: userIds.join(',')
          });

          return {
            success: result.ok,
            channel: result.channel,
            invitedUsers: userIds
          };
        }
      ),

      this.createAction(
        'getJoinedChannels',
        'Get list of channels the bot has joined',
        ActionCategory.COMMUNICATION,
        {},
        async (agent: Agent, params: any) => {
          const joinedChannelsList = Array.from(this.joinedChannels);
          const channels: SlackChannel[] = [];

          for (const channelId of joinedChannelsList) {
            const channel = this.channelCache.get(channelId);
            if (channel) {
              channels.push(channel);
            }
          }

          return {
            channels,
            count: channels.length,
            channelIds: joinedChannelsList
          };
        }
      ),

      this.createAction(
        'searchChannels',
        'Search for channels by name',
        ActionCategory.COMMUNICATION,
        {
          query: { type: 'string', description: 'Search query' },
          excludeArchived: {
            type: 'boolean',
            description: 'Exclude archived channels',
            optional: true
          }
        },
        async (agent: Agent, params: any) => {
          // Get all channels first
          const result = await this.context!.client.conversations.list({
            exclude_archived: params.excludeArchived !== false
          });

          // Filter by query
          const query = params.query.toLowerCase();
          const matchingChannels = (result.channels || []).filter(channel => 
            channel.name?.toLowerCase().includes(query) ||
            channel.purpose?.value?.toLowerCase().includes(query) ||
            channel.topic?.value?.toLowerCase().includes(query)
          );

          return {
            channels: matchingChannels,
            count: matchingChannels.length,
            query: params.query
          };
        }
      )
    ];
  }

  /**
   * Resolve channel name to ID
   */
  private async resolveChannelId(channelNameOrId: string): Promise<string> {
    // If it's already an ID format (C followed by uppercase alphanumeric)
    if (/^C[A-Z0-9]+$/.test(channelNameOrId)) {
      return channelNameOrId;
    }

    // Remove # if present
    const channelName = channelNameOrId.replace(/^#/, '');

    // Check cache first
    for (const [id, channel] of this.channelCache) {
      if (channel.name === channelName) {
        return id;
      }
    }

    // Fetch from API
    const result = await this.context!.client.conversations.list({
      exclude_archived: false
    });

    const channel = result.channels?.find(ch => ch.name === channelName);
    if (!channel || !channel.id) {
      throw new Error(`Channel not found: ${channelNameOrId}`);
    }

    return channel.id;
  }

  /**
   * Join a channel
   */
  private async joinChannel(channelNameOrId: string): Promise<void> {
    try {
      const channelId = await this.resolveChannelId(channelNameOrId);
      
      await this.context!.client.conversations.join({
        channel: channelId
      });

      this.joinedChannels.add(channelId);
      runtimeLogger.info(`Auto-joined channel: ${channelNameOrId} (${channelId})`);
    } catch (error) {
      throw new Error(`Failed to join channel ${channelNameOrId}: ${error}`);
    }
  }

  override async cleanup(): Promise<void> {
    await super.cleanup();
    this.channelCache.clear();
    this.joinedChannels.clear();
  }
}