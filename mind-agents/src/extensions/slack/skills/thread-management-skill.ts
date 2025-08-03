/**
 * Thread Management Skill
 * Handles Slack thread operations and thread-based interactions
 */

import { Agent, ExtensionAction, ActionCategory } from '../../../types';
import { runtimeLogger } from '../../../utils/logger';
import { BaseSlackSkill } from './base-slack-skill';
import { SlackMessage, SlackConversation, SlackSkillConfig } from '../types';

export interface ThreadManagementSkillConfig extends SlackSkillConfig {
  maxThreadHistory?: number;
  enableThreadNotifications?: boolean;
  autoSubscribeToThreads?: boolean;
  threadTimeoutMs?: number;
  maxConcurrentThreads?: number;
}

export class ThreadManagementSkill extends BaseSlackSkill {
  private threads: Map<string, SlackConversation> = new Map();
  private activeThreads: Set<string> = new Set();
  private threadSubscriptions: Map<string, string[]> = new Map(); // thread_ts -> user_ids

  constructor(config: ThreadManagementSkillConfig) {
    super({
      name: 'Thread Management',
      description: 'Handles Slack thread operations and management',
      ...config
    });
  }

  getActions(): ExtensionAction[] {
    return [
      this.createAction(
        'replyToThread',
        'Reply to a message thread',
        ActionCategory.COMMUNICATION,
        {
          channel: { type: 'string', description: 'Channel ID' },
          threadTs: { type: 'string', description: 'Thread timestamp' },
          text: { type: 'string', description: 'Reply text' },
          broadcast: {
            type: 'boolean',
            description: 'Broadcast reply to channel',
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
          }
        },
        async (agent: Agent, params: any) => {
          const messageOptions: any = {
            thread_ts: params.threadTs,
            reply_broadcast: params.broadcast || false
          };

          if (params.blocks) {
            messageOptions.blocks = params.blocks;
          }

          if (params.attachments) {
            messageOptions.attachments = params.attachments;
          }

          const result = await this.sendMessage(
            params.channel,
            params.text,
            messageOptions
          );

          // Update thread tracking
          if (result.ok && result.ts) {
            await this.updateThreadConversation(params.channel, params.threadTs, {
              type: 'message',
              channel: params.channel,
              user: this.context?.botUser?.id || 'bot',
              text: params.text,
              ts: result.ts,
              thread_ts: params.threadTs,
              blocks: params.blocks,
              attachments: params.attachments
            });
          }

          return {
            success: result.ok,
            timestamp: result.ts,
            threadTs: params.threadTs,
            channel: params.channel,
            broadcast: params.broadcast || false
          };
        }
      ),

      this.createAction(
        'getThreadReplies',
        'Get all replies in a thread',
        ActionCategory.COMMUNICATION,
        {
          channel: { type: 'string', description: 'Channel ID' },
          threadTs: { type: 'string', description: 'Thread timestamp' },
          limit: {
            type: 'number',
            description: 'Maximum replies to retrieve',
            optional: true
          },
          oldest: {
            type: 'string',
            description: 'Oldest reply timestamp',
            optional: true
          },
          latest: {
            type: 'string',
            description: 'Latest reply timestamp',
            optional: true
          }
        },
        async (agent: Agent, params: any) => {
          const result = await this.context!.client.conversations.replies({
            channel: params.channel,
            ts: params.threadTs,
            limit: params.limit || 100,
            oldest: params.oldest,
            latest: params.latest
          });

          // Update local thread tracking
          if (result.messages && result.messages.length > 0) {
            const threadKey = `${params.channel}-${params.threadTs}`;
            const conversation: SlackConversation = {
              id: threadKey,
              messages: result.messages as SlackMessage[],
              channel: params.channel,
              thread_ts: params.threadTs,
              reply_count: result.messages.length - 1, // Exclude parent message
              reply_users: [...new Set(result.messages.map(m => m.user))],
              reply_users_count: new Set(result.messages.map(m => m.user)).size
            };
            this.threads.set(threadKey, conversation);
          }

          return {
            messages: result.messages,
            replyCount: result.messages ? result.messages.length - 1 : 0,
            hasMore: result.has_more || false,
            channel: params.channel,
            threadTs: params.threadTs
          };
        }
      ),

      this.createAction(
        'subscribeToThread',
        'Subscribe to thread notifications',
        ActionCategory.COMMUNICATION,
        {
          channel: { type: 'string', description: 'Channel ID' },
          threadTs: { type: 'string', description: 'Thread timestamp' },
          userId: {
            type: 'string',
            description: 'User ID to subscribe',
            optional: true
          }
        },
        async (agent: Agent, params: any) => {
          const userId = params.userId || this.context?.botUser?.id;
          if (!userId) {
            throw new Error('User ID required for thread subscription');
          }

          const threadKey = `${params.channel}-${params.threadTs}`;
          
          if (!this.threadSubscriptions.has(threadKey)) {
            this.threadSubscriptions.set(threadKey, []);
          }

          const subscribers = this.threadSubscriptions.get(threadKey)!;
          if (!subscribers.includes(userId)) {
            subscribers.push(userId);
            this.activeThreads.add(threadKey);
          }

          return {
            success: true,
            threadKey,
            userId,
            subscriberCount: subscribers.length
          };
        }
      ),

      this.createAction(
        'unsubscribeFromThread',
        'Unsubscribe from thread notifications',
        ActionCategory.COMMUNICATION,
        {
          channel: { type: 'string', description: 'Channel ID' },
          threadTs: { type: 'string', description: 'Thread timestamp' },
          userId: {
            type: 'string',
            description: 'User ID to unsubscribe',
            optional: true
          }
        },
        async (agent: Agent, params: any) => {
          const userId = params.userId || this.context?.botUser?.id;
          if (!userId) {
            throw new Error('User ID required for thread unsubscription');
          }

          const threadKey = `${params.channel}-${params.threadTs}`;
          const subscribers = this.threadSubscriptions.get(threadKey);
          
          if (subscribers) {
            const index = subscribers.indexOf(userId);
            if (index > -1) {
              subscribers.splice(index, 1);
              
              if (subscribers.length === 0) {
                this.threadSubscriptions.delete(threadKey);
                this.activeThreads.delete(threadKey);
              }
            }
          }

          return {
            success: true,
            threadKey,
            userId,
            subscriberCount: subscribers?.length || 0
          };
        }
      ),

      this.createAction(
        'getThreadInfo',
        'Get information about a thread',
        ActionCategory.COMMUNICATION,
        {
          channel: { type: 'string', description: 'Channel ID' },
          threadTs: { type: 'string', description: 'Thread timestamp' }
        },
        async (agent: Agent, params: any) => {
          const threadKey = `${params.channel}-${params.threadTs}`;
          const cachedThread = this.threads.get(threadKey);
          
          // Get fresh thread data
          const result = await this.context!.client.conversations.replies({
            channel: params.channel,
            ts: params.threadTs,
            limit: 1000
          });

          if (!result.messages || result.messages.length === 0) {
            throw new Error('Thread not found or empty');
          }

          const parentMessage = result.messages[0];
          const replies = result.messages.slice(1);
          const uniqueUsers = new Set(replies.map(m => m.user));

          const threadInfo = {
            threadTs: params.threadTs,
            parentMessage,
            replyCount: replies.length,
            uniqueParticipants: uniqueUsers.size,
            participants: Array.from(uniqueUsers),
            latestReply: replies[replies.length - 1]?.ts,
            isSubscribed: this.threadSubscriptions.has(threadKey),
            subscriberCount: this.threadSubscriptions.get(threadKey)?.length || 0,
            lastActivity: replies[replies.length - 1]?.ts || parentMessage.ts,
            channel: params.channel
          };

          return threadInfo;
        }
      ),

      this.createAction(
        'listActiveThreads',
        'List all active threads being tracked',
        ActionCategory.COMMUNICATION,
        {
          channel: {
            type: 'string',
            description: 'Filter by channel',
            optional: true
          },
          limit: {
            type: 'number',
            description: 'Maximum threads to return',
            optional: true
          }
        },
        async (agent: Agent, params: any) => {
          let threads = Array.from(this.threads.entries());
          
          if (params.channel) {
            threads = threads.filter(([key, thread]) => 
              thread.channel === params.channel
            );
          }

          if (params.limit) {
            threads = threads.slice(0, params.limit);
          }

          const threadSummaries = threads.map(([key, thread]) => ({
            threadKey: key,
            channel: thread.channel,
            threadTs: thread.thread_ts,
            messageCount: thread.messages.length,
            replyCount: thread.reply_count || 0,
            participantCount: thread.reply_users_count || 0,
            lastActivity: thread.latest_reply,
            isSubscribed: this.threadSubscriptions.has(key)
          }));

          return {
            threads: threadSummaries,
            totalCount: threadSummaries.length,
            activeThreadsCount: this.activeThreads.size
          };
        }
      ),

      this.createAction(
        'markThreadAsRead',
        'Mark a thread as read',
        ActionCategory.COMMUNICATION,
        {
          channel: { type: 'string', description: 'Channel ID' },
          threadTs: { type: 'string', description: 'Thread timestamp' }
        },
        async (agent: Agent, params: any) => {
          // Get the latest message in the thread
          const result = await this.context!.client.conversations.replies({
            channel: params.channel,
            ts: params.threadTs,
            limit: 1,
            latest: new Date().getTime() / 1000
          });

          if (result.messages && result.messages.length > 0) {
            const latestMessage = result.messages[result.messages.length - 1];
            
            // Mark the channel as read up to this timestamp
            await this.context!.client.conversations.mark({
              channel: params.channel,
              ts: latestMessage.ts
            });
          }

          return {
            success: true,
            channel: params.channel,
            threadTs: params.threadTs,
            markedAt: new Date().toISOString()
          };
        }
      ),

      this.createAction(
        'getThreadParticipants',
        'Get all participants in a thread',
        ActionCategory.COMMUNICATION,
        {
          channel: { type: 'string', description: 'Channel ID' },
          threadTs: { type: 'string', description: 'Thread timestamp' },
          includeUserInfo: {
            type: 'boolean',
            description: 'Include detailed user information',
            optional: true
          }
        },
        async (agent: Agent, params: any) => {
          const result = await this.context!.client.conversations.replies({
            channel: params.channel,
            ts: params.threadTs,
            limit: 1000
          });

          if (!result.messages) {
            throw new Error('Thread not found');
          }

          const userIds = [...new Set(result.messages.map(m => m.user))];
          const participants: any[] = [];

          if (params.includeUserInfo) {
            for (const userId of userIds) {
              if (userId) {
                const userInfo = await this.getUserInfo(userId);
                if (userInfo) {
                  participants.push({
                    id: userId,
                    name: userInfo.name,
                    realName: userInfo.real_name,
                    displayName: userInfo.profile?.display_name,
                    isBot: userInfo.is_bot,
                    messageCount: result.messages.filter(m => m.user === userId).length
                  });
                }
              }
            }
          } else {
            participants.push(...userIds.filter(id => id).map(id => ({ id })));
          }

          return {
            participants,
            participantCount: participants.length,
            channel: params.channel,
            threadTs: params.threadTs
          };
        }
      ),

      this.createAction(
        'cleanupOldThreads',
        'Clean up old thread data from memory',
        ActionCategory.UTILITY,
        {
          maxAgeMs: {
            type: 'number',
            description: 'Maximum age in milliseconds',
            optional: true
          },
          maxThreads: {
            type: 'number',
            description: 'Maximum threads to keep',
            optional: true
          }
        },
        async (agent: Agent, params: any) => {
          const config = this.config as ThreadManagementSkillConfig;
          const maxAge = params.maxAgeMs || config.threadTimeoutMs || (24 * 60 * 60 * 1000); // 24 hours
          const maxThreads = params.maxThreads || config.maxConcurrentThreads || 100;
          const now = Date.now();
          
          let cleanedCount = 0;
          const threadsToRemove: string[] = [];

          // Check for old threads
          for (const [key, thread] of this.threads.entries()) {
            const lastActivity = thread.latest_reply || thread.messages[thread.messages.length - 1]?.ts;
            if (lastActivity) {
              const lastActivityMs = parseFloat(lastActivity) * 1000;
              if (now - lastActivityMs > maxAge) {
                threadsToRemove.push(key);
              }
            }
          }

          // Remove excess threads if over limit
          if (this.threads.size > maxThreads) {
            const sortedThreads = Array.from(this.threads.entries())
              .sort(([, a], [, b]) => {
                const aTime = parseFloat(a.latest_reply || a.messages[a.messages.length - 1]?.ts || '0');
                const bTime = parseFloat(b.latest_reply || b.messages[b.messages.length - 1]?.ts || '0');
                return aTime - bTime; // Oldest first
              });
            
            const excessCount = this.threads.size - maxThreads;
            for (let i = 0; i < excessCount; i++) {
              threadsToRemove.push(sortedThreads[i][0]);
            }
          }

          // Remove threads
          for (const key of threadsToRemove) {
            this.threads.delete(key);
            this.threadSubscriptions.delete(key);
            this.activeThreads.delete(key);
            cleanedCount++;
          }

          return {
            cleanedCount,
            remainingThreads: this.threads.size,
            activeThreads: this.activeThreads.size,
            maxAge,
            maxThreads
          };
        }
      )
    ];
  }

  /**
   * Update thread conversation data
   */
  private async updateThreadConversation(channel: string, threadTs: string, newMessage: SlackMessage): Promise<void> {
    const threadKey = `${channel}-${threadTs}`;
    const existing = this.threads.get(threadKey);
    
    if (existing) {
      existing.messages.push(newMessage);
      existing.reply_count = (existing.reply_count || 0) + 1;
      existing.latest_reply = newMessage.ts;
      
      // Update unique users
      if (!existing.reply_users?.includes(newMessage.user)) {
        existing.reply_users = existing.reply_users || [];
        existing.reply_users.push(newMessage.user);
        existing.reply_users_count = existing.reply_users.length;
      }
    } else {
      // Create new thread entry
      const conversation: SlackConversation = {
        id: threadKey,
        messages: [newMessage],
        channel,
        thread_ts: threadTs,
        reply_count: 1,
        reply_users: [newMessage.user],
        reply_users_count: 1,
        latest_reply: newMessage.ts
      };
      this.threads.set(threadKey, conversation);
    }

    // Enforce memory limits
    const config = this.config as ThreadManagementSkillConfig;
    const maxHistory = config.maxThreadHistory || 1000;
    
    const conversation = this.threads.get(threadKey)!;
    if (conversation.messages.length > maxHistory) {
      conversation.messages = conversation.messages.slice(-maxHistory);
    }
  }

  /**
   * Check if a thread is being actively tracked
   */
  private isThreadActive(channel: string, threadTs: string): boolean {
    const threadKey = `${channel}-${threadTs}`;
    return this.activeThreads.has(threadKey);
  }

  /**
   * Cleanup on skill shutdown
   */
  override async cleanup(): Promise<void> {
    await super.cleanup();
    this.threads.clear();
    this.activeThreads.clear();
    this.threadSubscriptions.clear();
    runtimeLogger.info('🧹 Thread Management skill cleaned up');
  }
}