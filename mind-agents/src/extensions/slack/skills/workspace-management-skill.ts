/**
 * Workspace Management Skill
 * Handles workspace information, user management, and workspace operations
 */

import { Agent, ExtensionAction, ActionCategory } from '../../../types';
import { runtimeLogger } from '../../../utils/logger';
import { BaseSlackSkill } from './base-slack-skill';
import { SlackUser, SlackChannel, SlackWorkspace, SlackSkillConfig } from '../types';

export interface WorkspaceManagementSkillConfig extends SlackSkillConfig {
  enableUserTracking?: boolean;
  enableChannelTracking?: boolean;
  enablePresenceTracking?: boolean;
  cacheUserInfo?: boolean;
  cacheChannelInfo?: boolean;
  cacheTtlMs?: number;
  maxCachedUsers?: number;
  maxCachedChannels?: number;
  enableWorkspaceAnalytics?: boolean;
}

interface UserCache {
  user: SlackUser;
  lastUpdated: number;
  presence?: {
    presence: string;
    online: boolean;
    auto_away?: boolean;
    manual_away?: boolean;
    connection_count?: number;
    last_activity?: number;
  };
}

interface ChannelCache {
  channel: SlackChannel;
  lastUpdated: number;
  memberCount?: number;
  isJoined?: boolean;
}

export class WorkspaceManagementSkill extends BaseSlackSkill {
  private userCache: Map<string, UserCache> = new Map();
  private channelCache: Map<string, ChannelCache> = new Map();
  private workspaceInfo?: SlackWorkspace;
  private presenceSubscriptions: Set<string> = new Set();

  constructor(config: WorkspaceManagementSkillConfig) {
    super({
      name: 'Workspace Management',
      description: 'Handles workspace information, users, and channel management',
      ...config
    });
  }

  getActions(): ExtensionAction[] {
    return [
      this.createAction(
        'getWorkspaceInfo',
        'Get workspace/team information',
        ActionCategory.UTILITY,
        {},
        async (agent: Agent, params: any) => {
          const result = await this.context!.client.team.info();

          if (!result.ok || !result.team) {
            throw new Error('Failed to get workspace information');
          }

          this.workspaceInfo = {
            id: result.team.id,
            name: result.team.name,
            domain: result.team.domain,
            email_domain: result.team.email_domain,
            icon: result.team.icon,
            enterprise_id: result.team.enterprise_id,
            enterprise_name: result.team.enterprise_name
          };

          return {
            workspace: this.workspaceInfo,
            fetchedAt: new Date().toISOString()
          };
        }
      ),

      this.createAction(
        'getUserInfo',
        'Get detailed information about a user',
        ActionCategory.UTILITY,
        {
          userId: { type: 'string', description: 'User ID' },
          includePresence: {
            type: 'boolean',
            description: 'Include presence information',
            optional: true
          },
          useCache: {
            type: 'boolean',
            description: 'Use cached data if available',
            optional: true
          }
        },
        async (agent: Agent, params: any) => {
          const config = this.config as WorkspaceManagementSkillConfig;
          const useCache = params.useCache !== false && config.cacheUserInfo;
          
          // Check cache first
          if (useCache && this.userCache.has(params.userId)) {
            const cached = this.userCache.get(params.userId)!;
            const cacheAge = Date.now() - cached.lastUpdated;
            const cacheTtl = config.cacheTtlMs || 300000; // 5 minutes
            
            if (cacheAge < cacheTtl) {
              return {
                user: cached.user,
                presence: cached.presence,
                fromCache: true,
                cacheAge
              };
            }
          }

          // Fetch fresh data
          const userResult = await this.context!.client.users.info({
            user: params.userId
          });

          if (!userResult.ok || !userResult.user) {
            throw new Error(`User not found: ${params.userId}`);
          }

          let presence;
          if (params.includePresence) {
            try {
              const presenceResult = await this.context!.client.users.getPresence({
                user: params.userId
              });
              if (presenceResult.ok) {
                presence = presenceResult;
              }
            } catch (error) {
              runtimeLogger.warn('Failed to get user presence:', error);
            }
          }

          // Cache the result
          if (useCache) {
            this.cacheUser(userResult.user as SlackUser, presence);
          }

          return {
            user: userResult.user,
            presence,
            fromCache: false
          };
        }
      ),

      this.createAction(
        'listUsers',
        'List all users in the workspace',
        ActionCategory.UTILITY,
        {
          limit: {
            type: 'number',
            description: 'Maximum users to return',
            optional: true
          },
          cursor: {
            type: 'string',
            description: 'Pagination cursor',
            optional: true
          },
          includeDeleted: {
            type: 'boolean',
            description: 'Include deleted users',
            optional: true
          },
          includePresence: {
            type: 'boolean',
            description: 'Include presence for each user',
            optional: true
          }
        },
        async (agent: Agent, params: any) => {
          const result = await this.context!.client.users.list({
            limit: params.limit || 100,
            cursor: params.cursor,
            include_locale: true
          });

          if (!result.ok || !result.members) {
            throw new Error('Failed to list users');
          }

          let users = result.members as SlackUser[];
          
          // Filter deleted users if not requested
          if (!params.includeDeleted) {
            users = users.filter(user => !user.deleted);
          }

          // Add presence information if requested
          if (params.includePresence) {
            const usersWithPresence = await Promise.all(
              users.map(async (user) => {
                try {
                  const presenceResult = await this.context!.client.users.getPresence({
                    user: user.id
                  });
                  return {
                    ...user,
                    presence: presenceResult.ok ? presenceResult : undefined
                  };
                } catch {
                  return user;
                }
              })
            );
            users = usersWithPresence;
          }

          // Cache users
          const config = this.config as WorkspaceManagementSkillConfig;
          if (config.cacheUserInfo) {
            for (const user of users) {
              this.cacheUser(user, (user as any).presence);
            }
          }

          return {
            users,
            count: users.length,
            nextCursor: result.response_metadata?.next_cursor,
            hasMore: !!result.response_metadata?.next_cursor
          };
        }
      ),

      this.createAction(
        'getChannelInfo',
        'Get detailed information about a channel',
        ActionCategory.UTILITY,
        {
          channelId: { type: 'string', description: 'Channel ID' },
          includeMemberCount: {
            type: 'boolean',
            description: 'Include member count',
            optional: true
          },
          useCache: {
            type: 'boolean',
            description: 'Use cached data if available',
            optional: true
          }
        },
        async (agent: Agent, params: any) => {
          const config = this.config as WorkspaceManagementSkillConfig;
          const useCache = params.useCache !== false && config.cacheChannelInfo;
          
          // Check cache first
          if (useCache && this.channelCache.has(params.channelId)) {
            const cached = this.channelCache.get(params.channelId)!;
            const cacheAge = Date.now() - cached.lastUpdated;
            const cacheTtl = config.cacheTtlMs || 300000; // 5 minutes
            
            if (cacheAge < cacheTtl) {
              return {
                channel: cached.channel,
                memberCount: cached.memberCount,
                isJoined: cached.isJoined,
                fromCache: true,
                cacheAge
              };
            }
          }

          // Fetch fresh data
          const channelResult = await this.context!.client.conversations.info({
            channel: params.channelId,
            include_locale: true,
            include_num_members: params.includeMemberCount
          });

          if (!channelResult.ok || !channelResult.channel) {
            throw new Error(`Channel not found: ${params.channelId}`);
          }

          const channel = channelResult.channel as SlackChannel;
          
          // Cache the result
          if (useCache) {
            this.cacheChannel(channel);
          }

          return {
            channel,
            memberCount: channel.num_members,
            isJoined: channel.is_member,
            fromCache: false
          };
        }
      ),

      this.createAction(
        'listChannels',
        'List channels in the workspace',
        ActionCategory.UTILITY,
        {
          types: {
            type: 'string',
            description: 'Channel types: public_channel,private_channel,mpim,im',
            optional: true
          },
          limit: {
            type: 'number',
            description: 'Maximum channels to return',
            optional: true
          },
          cursor: {
            type: 'string',
            description: 'Pagination cursor',
            optional: true
          },
          excludeArchived: {
            type: 'boolean',
            description: 'Exclude archived channels',
            optional: true
          },
          membersOnly: {
            type: 'boolean',
            description: 'Only channels the bot is a member of',
            optional: true
          }
        },
        async (agent: Agent, params: any) => {
          const types = params.types || 'public_channel,private_channel';
          
          const result = await this.context!.client.conversations.list({
            types,
            limit: params.limit || 100,
            cursor: params.cursor,
            exclude_archived: params.excludeArchived || false
          });

          if (!result.ok || !result.channels) {
            throw new Error('Failed to list channels');
          }

          let channels = result.channels as SlackChannel[];
          
          // Filter to only channels the bot is a member of
          if (params.membersOnly) {
            channels = channels.filter(channel => channel.is_member);
          }

          // Cache channels
          const config = this.config as WorkspaceManagementSkillConfig;
          if (config.cacheChannelInfo) {
            for (const channel of channels) {
              this.cacheChannel(channel);
            }
          }

          const categorized = {
            publicChannels: channels.filter(c => c.is_channel && !c.is_private),
            privateChannels: channels.filter(c => c.is_private),
            directMessages: channels.filter(c => c.is_im),
            multipartyIMs: channels.filter(c => c.is_mpim),
            total: channels.length
          };

          return {
            channels,
            categorized,
            nextCursor: result.response_metadata?.next_cursor,
            hasMore: !!result.response_metadata?.next_cursor
          };
        }
      ),

      this.createAction(
        'joinChannel',
        'Join a public channel',
        ActionCategory.UTILITY,
        {
          channelId: { type: 'string', description: 'Channel ID to join' }
        },
        async (agent: Agent, params: any) => {
          const result = await this.context!.client.conversations.join({
            channel: params.channelId
          });

          // Update cache
          if (result.ok && result.channel) {
            const channel = result.channel as SlackChannel;
            channel.is_member = true;
            this.cacheChannel(channel);
          }

          return {
            success: result.ok,
            channel: result.channel,
            channelId: params.channelId,
            joinedAt: new Date().toISOString()
          };
        }
      ),

      this.createAction(
        'leaveChannel',
        'Leave a channel',
        ActionCategory.UTILITY,
        {
          channelId: { type: 'string', description: 'Channel ID to leave' }
        },
        async (agent: Agent, params: any) => {
          const result = await this.context!.client.conversations.leave({
            channel: params.channelId
          });

          // Update cache
          if (result.ok && this.channelCache.has(params.channelId)) {
            const cached = this.channelCache.get(params.channelId)!;
            cached.channel.is_member = false;
            cached.isJoined = false;
          }

          return {
            success: result.ok,
            channelId: params.channelId,
            leftAt: new Date().toISOString()
          };
        }
      ),

      this.createAction(
        'getChannelMembers',
        'Get members of a channel',
        ActionCategory.UTILITY,
        {
          channelId: { type: 'string', description: 'Channel ID' },
          limit: {
            type: 'number',
            description: 'Maximum members to return',
            optional: true
          },
          cursor: {
            type: 'string',
            description: 'Pagination cursor',
            optional: true
          },
          includeUserInfo: {
            type: 'boolean',
            description: 'Include detailed user information',
            optional: true
          }
        },
        async (agent: Agent, params: any) => {
          const result = await this.context!.client.conversations.members({
            channel: params.channelId,
            limit: params.limit || 100,
            cursor: params.cursor
          });

          if (!result.ok || !result.members) {
            throw new Error(`Failed to get channel members for ${params.channelId}`);
          }

          let members = result.members;
          let detailedMembers;

          if (params.includeUserInfo) {
            detailedMembers = await Promise.all(
              members.map(async (userId) => {
                try {
                  const userResult = await this.getUserInfo(userId);
                  return userResult;
                } catch (error) {
                  runtimeLogger.warn(`Failed to get user info for ${userId}:`, error);
                  return { id: userId, error: 'Failed to fetch user info' };
                }
              })
            );
          }

          return {
            memberIds: members,
            members: detailedMembers,
            memberCount: members.length,
            channelId: params.channelId,
            nextCursor: result.response_metadata?.next_cursor,
            hasMore: !!result.response_metadata?.next_cursor
          };
        }
      ),

      this.createAction(
        'getUserPresence',
        'Get presence status for multiple users',
        ActionCategory.UTILITY,
        {
          userIds: { type: 'array', description: 'Array of user IDs' },
          subscribe: {
            type: 'boolean',
            description: 'Subscribe to presence updates',
            optional: true
          }
        },
        async (agent: Agent, params: any) => {
          const presenceData = await Promise.all(
            params.userIds.map(async (userId: string) => {
              try {
                const result = await this.context!.client.users.getPresence({
                  user: userId
                });
                
                if (params.subscribe) {
                  this.presenceSubscriptions.add(userId);
                }
                
                return {
                  userId,
                  presence: result.ok ? result : null,
                  error: result.ok ? null : result.error
                };
              } catch (error) {
                return {
                  userId,
                  presence: null,
                  error: error instanceof Error ? error.message : 'Unknown error'
                };
              }
            })
          );

          const onlineCount = presenceData.filter(p => p.presence?.presence === 'active').length;
          const awayCount = presenceData.filter(p => p.presence?.presence === 'away').length;

          return {
            users: presenceData,
            summary: {
              total: params.userIds.length,
              online: onlineCount,
              away: awayCount,
              unknown: params.userIds.length - onlineCount - awayCount
            },
            subscribed: params.subscribe ? params.userIds : []
          };
        }
      ),

      this.createAction(
        'searchUsers',
        'Search for users in the workspace',
        ActionCategory.UTILITY,
        {
          query: { type: 'string', description: 'Search query' },
          searchFields: {
            type: 'array',
            description: 'Fields to search: name, real_name, display_name, email',
            optional: true
          },
          includeDeleted: {
            type: 'boolean',
            description: 'Include deleted users',
            optional: true
          },
          limit: {
            type: 'number',
            description: 'Maximum results to return',
            optional: true
          }
        },
        async (agent: Agent, params: any) => {
          // Get all users (with caching)
          const allUsersResult = await this.getActions()
            .find(action => action.name === 'listUsers')!
            .execute(agent, { includeDeleted: params.includeDeleted });

          const allUsers = allUsersResult.result.users as SlackUser[];
          const searchFields = params.searchFields || ['name', 'real_name', 'display_name', 'email'];
          const query = params.query.toLowerCase();

          const matchingUsers = allUsers.filter(user => {
            return searchFields.some(field => {
              const value = this.getNestedValue(user, field);
              return value && value.toLowerCase().includes(query);
            });
          });

          const limited = params.limit ? matchingUsers.slice(0, params.limit) : matchingUsers;

          return {
            users: limited,
            matchCount: matchingUsers.length,
            totalUsers: allUsers.length,
            query: params.query,
            searchFields
          };
        }
      ),

      this.createAction(
        'getWorkspaceStats',
        'Get workspace statistics and analytics',
        ActionCategory.ANALYTICS,
        {},
        async (agent: Agent, params: any) => {
          const config = this.config as WorkspaceManagementSkillConfig;
          
          if (!config.enableWorkspaceAnalytics) {
            throw new Error('Workspace analytics not enabled');
          }

          // Get users and channels
          const [usersResult, channelsResult] = await Promise.all([
            this.getActions().find(action => action.name === 'listUsers')!.execute(agent, {}),
            this.getActions().find(action => action.name === 'listChannels')!.execute(agent, {})
          ]);

          const users = usersResult.result.users as SlackUser[];
          const channels = channelsResult.result.channels as SlackChannel[];

          const stats = {
            users: {
              total: users.length,
              active: users.filter(u => !u.deleted).length,
              bots: users.filter(u => u.is_bot).length,
              admins: users.filter(u => u.is_admin).length,
              owners: users.filter(u => u.is_owner).length
            },
            channels: {
              total: channels.length,
              public: channels.filter(c => c.is_channel && !c.is_private).length,
              private: channels.filter(c => c.is_private).length,
              directMessages: channels.filter(c => c.is_im).length,
              multiparty: channels.filter(c => c.is_mpim).length,
              archived: channels.filter(c => c.is_archived).length,
              joined: channels.filter(c => c.is_member).length
            },
            cache: {
              cachedUsers: this.userCache.size,
              cachedChannels: this.channelCache.size,
              presenceSubscriptions: this.presenceSubscriptions.size
            },
            workspace: this.workspaceInfo
          };

          return {
            statistics: stats,
            generatedAt: new Date().toISOString()
          };
        }
      ),

      this.createAction(
        'clearCache',
        'Clear cached user and channel data',
        ActionCategory.UTILITY,
        {
          type: {
            type: 'string',
            description: 'Cache type to clear: users, channels, all',
            optional: true
          },
          olderThan: {
            type: 'number',
            description: 'Clear entries older than this timestamp',
            optional: true
          }
        },
        async (agent: Agent, params: any) => {
          const type = params.type || 'all';
          let clearedUsers = 0;
          let clearedChannels = 0;

          if (type === 'users' || type === 'all') {
            if (params.olderThan) {
              for (const [key, cached] of this.userCache.entries()) {
                if (cached.lastUpdated < params.olderThan) {
                  this.userCache.delete(key);
                  clearedUsers++;
                }
              }
            } else {
              clearedUsers = this.userCache.size;
              this.userCache.clear();
            }
          }

          if (type === 'channels' || type === 'all') {
            if (params.olderThan) {
              for (const [key, cached] of this.channelCache.entries()) {
                if (cached.lastUpdated < params.olderThan) {
                  this.channelCache.delete(key);
                  clearedChannels++;
                }
              }
            } else {
              clearedChannels = this.channelCache.size;
              this.channelCache.clear();
            }
          }

          return {
            clearedUsers,
            clearedChannels,
            remainingUsers: this.userCache.size,
            remainingChannels: this.channelCache.size,
            type,
            olderThan: params.olderThan
          };
        }
      )
    ];
  }

  /**
   * Cache user information
   */
  private cacheUser(user: SlackUser, presence?: any): void {
    const config = this.config as WorkspaceManagementSkillConfig;
    const maxCached = config.maxCachedUsers || 1000;

    // Remove oldest entries if at limit
    if (this.userCache.size >= maxCached) {
      const oldestKey = Array.from(this.userCache.entries())
        .sort(([, a], [, b]) => a.lastUpdated - b.lastUpdated)[0][0];
      this.userCache.delete(oldestKey);
    }

    this.userCache.set(user.id, {
      user,
      presence,
      lastUpdated: Date.now()
    });
  }

  /**
   * Cache channel information
   */
  private cacheChannel(channel: SlackChannel): void {
    const config = this.config as WorkspaceManagementSkillConfig;
    const maxCached = config.maxCachedChannels || 500;

    // Remove oldest entries if at limit
    if (this.channelCache.size >= maxCached) {
      const oldestKey = Array.from(this.channelCache.entries())
        .sort(([, a], [, b]) => a.lastUpdated - b.lastUpdated)[0][0];
      this.channelCache.delete(oldestKey);
    }

    this.channelCache.set(channel.id, {
      channel,
      lastUpdated: Date.now(),
      memberCount: channel.num_members,
      isJoined: channel.is_member
    });
  }

  /**
   * Get nested object value by path
   */
  private getNestedValue(obj: any, path: string): string | undefined {
    const parts = path.split('.');
    let current = obj;
    
    for (const part of parts) {
      if (current && current[part] !== undefined) {
        current = current[part];
      } else {
        return undefined;
      }
    }
    
    return typeof current === 'string' ? current : undefined;
  }

  /**
   * Cleanup on skill shutdown
   */
  override async cleanup(): Promise<void> {
    await super.cleanup();
    this.userCache.clear();
    this.channelCache.clear();
    this.presenceSubscriptions.clear();
    this.workspaceInfo = undefined;
    runtimeLogger.info('🧹 Workspace Management skill cleaned up');
  }
}