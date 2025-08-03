/**
 * Group Management Skill for Telegram Extension
 * 
 * Handles multi-group participation with context awareness
 */

import { ExtensionAction, ActionCategory, Agent, ActionResult, ActionResultType } from '../../../types/agent.js';
import { SkillParameters } from '../../../types/common.js';
import { TelegramSkill } from './index.js';
import { TelegramConfig, TelegramGroup, TelegramChat } from '../types.js';
import { Logger } from '../../../utils/logger.js';

export interface GroupParticipationStrategy {
  responseFrequency: number; // 0-1, how often to respond
  topicRelevance: number; // 0-1, how relevant topics must be
  engagementStyle: 'helpful' | 'conversational' | 'informative' | 'social';
  timeWindows?: Array<{ start: string; end: string }>; // Active hours
  cooldownPeriod?: number; // Minutes between messages
}

export interface TelegramGroupInfo {
  id: string;
  title: string;
  type: 'group' | 'supergroup' | 'channel';
  memberCount: number;
  description: string;
  permissions: Record<string, boolean>;
  admins: string[];
  pinnedMessage?: string;
  inviteLink?: string;
  fetchedAt: Date;
}

export interface MessageAnalysis {
  groupId: string;
  messageCount: number;
  timeRange: {
    start: Date;
    end: Date;
  };
  topUsers: Array<{ userId: string; username: string; messageCount: number }>;
  commonTopics: string[];
  sentimentAnalysis: {
    positive: number;
    negative: number;
    neutral: number;
  };
  activityPatterns: Array<{ hour: number; messageCount: number }>;
  languageDistribution: Record<string, number>;
  analyzedAt: Date;
}

export interface TopicAnalysis {
  topic: string;
  count: number;
  percentage: number;
  sampleMessages: string[];
}

export interface EngagementTimeAnalysis {
  type: 'hourly' | 'daily';
  period: string;
  activityCount: number;
  score: number;
}

export interface MemberActivity {
  userId: string;
  username: string;
  messageCount: number;
  totalCharacters: number;
  averageMessageLength: number;
  lastActivity: Date;
  topics: Set<string>;
  engagementScore: number;
}

export interface KeyMemberAnalysis {
  userId: string;
  username: string;
  messageCount: number;
  averageMessageLength: number;
  topicCount: number;
  engagementScore: number;
  lastActivity: Date;
  influence: 'high' | 'medium' | 'low';
}

export interface TelegramMessageData {
  messageId: number;
  from?: {
    id: number;
    username?: string;
    firstName: string;
    lastName?: string;
  };
  text?: string;
  date: number;
  chat: {
    id: number;
    type: string;
  };
}

export class GroupManagementSkill implements TelegramSkill {
  name = 'group-management';
  description = 'Multi-group participation with context awareness';
  
  private config?: TelegramConfig;
  private logger?: Logger;
  private activeGroups: Map<string, TelegramGroup> = new Map();
  private participationStrategies: Map<string, GroupParticipationStrategy> = new Map();
  private lastMessageTimes: Map<string, Date> = new Map();

  async initialize(config: TelegramConfig, logger: Logger): Promise<void> {
    this.config = config;
    this.logger = logger;
    
    // Load saved group configurations
    await this.loadGroupConfigurations();
  }

  async cleanup(): Promise<void> {
    // Save current group states
    await this.saveGroupConfigurations();
  }

  private async loadGroupConfigurations(): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const configPath = path.join(process.cwd(), 'data', 'telegram', 'groups.json');
      
      try {
        const data = await fs.readFile(configPath, 'utf-8');
        const configs = JSON.parse(data);
        
        // Load active groups
        if (configs.activeGroups) {
          for (const [groupId, groupData] of Object.entries(configs.activeGroups)) {
            this.activeGroups.set(groupId, groupData as TelegramGroup);
          }
        }
        
        // Load participation strategies
        if (configs.participationStrategies) {
          for (const [groupId, strategy] of Object.entries(configs.participationStrategies)) {
            this.participationStrategies.set(groupId, strategy as GroupParticipationStrategy);
          }
        }
        
        // Load last message times
        if (configs.lastMessageTimes) {
          for (const [groupId, timestamp] of Object.entries(configs.lastMessageTimes)) {
            this.lastMessageTimes.set(groupId, new Date(timestamp as string));
          }
        }
        
        this.logger?.info(`Loaded configurations for ${this.activeGroups.size} groups`);
      } catch (fileError) {
        // File doesn't exist or is invalid, start with empty configurations
        this.logger?.debug('No existing group configurations found, starting fresh');
      }
    } catch (error) {
      this.logger?.error('Failed to load group configurations', error);
    }
  }

  private async saveGroupConfigurations(): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const configDir = path.join(process.cwd(), 'data', 'telegram');
      const configPath = path.join(configDir, 'groups.json');
      
      // Ensure directory exists
      await fs.mkdir(configDir, { recursive: true });
      
      const configs = {
        activeGroups: Object.fromEntries(this.activeGroups),
        participationStrategies: Object.fromEntries(this.participationStrategies),
        lastMessageTimes: Object.fromEntries(
          Array.from(this.lastMessageTimes.entries()).map(([key, date]) => [key, date.toISOString()])
        ),
        savedAt: new Date().toISOString(),
      };
      
      await fs.writeFile(configPath, JSON.stringify(configs, null, 2), 'utf-8');
      this.logger?.debug(`Saved configurations for ${this.activeGroups.size} groups`);
    } catch (error) {
      this.logger?.error('Failed to save group configurations', error);
    }
  }

  getActions(): Record<string, ExtensionAction> {
    return {
      participateInGroups: {
        name: 'participateInGroups',
        description: 'Actively participate in multiple Telegram groups with context awareness',
        category: ActionCategory.AUTONOMOUS,
        parameters: {
          groups: {
            type: 'array',
            required: true,
            description: 'Array of group configurations to participate in',
          },
          strategy: {
            type: 'object',
            required: false,
            description: 'Participation strategy configuration',
          },
        },
        execute: async (agent: Agent, params: SkillParameters): Promise<ActionResult> => {
          return this.participateInGroups(agent, params);
        },
      },

      joinGroup: {
        name: 'joinGroup',
        description: 'Join a new Telegram group and set up participation',
        category: ActionCategory.SOCIAL,
        parameters: {
          groupId: {
            type: 'string',
            required: true,
            description: 'Group ID or invite link',
          },
          participationLevel: {
            type: 'string',
            required: false,
            description: 'Level of participation: active, moderate, passive',
          },
        },
        execute: async (agent: Agent, params: SkillParameters): Promise<ActionResult> => {
          return this.joinGroup(agent, params);
        },
      },

      leaveGroup: {
        name: 'leaveGroup',
        description: 'Leave a Telegram group gracefully',
        category: ActionCategory.SOCIAL,
        parameters: {
          groupId: {
            type: 'string',
            required: true,
            description: 'Group ID to leave',
          },
          farewellMessage: {
            type: 'string',
            required: false,
            description: 'Optional farewell message',
          },
        },
        execute: async (agent: Agent, params: SkillParameters): Promise<ActionResult> => {
          return this.leaveGroup(agent, params);
        },
      },

      analyzeGroupActivity: {
        name: 'analyzeGroupActivity',
        description: 'Analyze group activity patterns and engagement opportunities',
        category: ActionCategory.PROCESSING,
        parameters: {
          groupId: {
            type: 'string',
            required: true,
            description: 'Group ID to analyze',
          },
          timeRange: {
            type: 'object',
            required: false,
            description: 'Time range for analysis',
          },
        },
        execute: async (agent: Agent, params: SkillParameters): Promise<ActionResult> => {
          return this.analyzeGroupActivity(agent, params);
        },
      },

      updateParticipationStrategy: {
        name: 'updateParticipationStrategy',
        description: 'Update participation strategy for a specific group',
        category: ActionCategory.AUTONOMOUS,
        parameters: {
          groupId: {
            type: 'string',
            required: true,
            description: 'Group ID to update strategy for',
          },
          strategy: {
            type: 'object',
            required: true,
            description: 'New participation strategy',
          },
        },
        execute: async (agent: Agent, params: SkillParameters): Promise<ActionResult> => {
          return this.updateParticipationStrategy(agent, params);
        },
      },
    };
  }

  private async participateInGroups(agent: Agent, params: SkillParameters): Promise<ActionResult> {
    try {
      const groups = params.groups as TelegramGroup[];
      const strategy = params.strategy as GroupParticipationStrategy;

      for (const group of groups) {
        // Store group configuration
        this.activeGroups.set(group.id, group);
        
        // Set participation strategy
        if (strategy) {
          this.participationStrategies.set(group.id, strategy);
        }

        // Initialize group participation
        await this.initializeGroupParticipation(agent, group);
      }

      this.logger?.info(`Started participating in ${groups.length} groups`);

      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          groupsJoined: groups.length,
          activeGroups: Array.from(this.activeGroups.keys()),
        },
        metadata: { timestamp: new Date().toISOString() },
      };
    } catch (error) {
      this.logger?.error('Failed to participate in groups', error);
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: error instanceof Error ? error.message : String(error),
        metadata: { timestamp: new Date().toISOString() },
      };
    }
  }

  private async initializeGroupParticipation(agent: Agent, group: TelegramGroup): Promise<void> {
    // Get group information and context
    const groupInfo = await this.getGroupInfo(group.id);
    
    // Analyze recent messages for context
    const recentContext = await this.analyzeRecentMessages(group.id);
    
    // Store context in agent memory
    if (agent.memory) {
      await agent.memory.store({
        id: `telegram-group-${group.id}`,
        content: `Joined Telegram group: ${group.title}`,
        metadata: {
          type: 'group_join',
          platform: 'telegram',
          groupId: group.id,
          groupInfo,
          recentContext,
        },
        timestamp: new Date(),
        importance: 0.7,
      });
    }

    this.logger?.info(`Initialized participation in group: ${group.title}`);
  }

  private async joinGroup(agent: Agent, params: SkillParameters): Promise<ActionResult> {
    try {
      const groupId = params.groupId as string;
      const participationLevel = (params.participationLevel as string) || 'moderate';

      // Create group configuration
      const group: TelegramGroup = {
        id: groupId,
        title: 'Unknown', // Will be updated after joining
        type: 'group',
        participationLevel: participationLevel as 'active' | 'moderate' | 'passive',
        lastActivity: new Date(),
      };

      // Join the group (implementation would depend on bot permissions)
      // For now, we'll simulate successful joining
      this.activeGroups.set(groupId, group);

      // Set default participation strategy
      const defaultStrategy: GroupParticipationStrategy = {
        responseFrequency: participationLevel === 'active' ? 0.8 : participationLevel === 'moderate' ? 0.4 : 0.1,
        topicRelevance: 0.6,
        engagementStyle: 'helpful',
        cooldownPeriod: 5, // 5 minutes between messages
      };

      this.participationStrategies.set(groupId, defaultStrategy);

      this.logger?.info(`Joined group: ${groupId} with ${participationLevel} participation`);

      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: { groupId, participationLevel },
        metadata: { timestamp: new Date().toISOString() },
      };
    } catch (error) {
      this.logger?.error('Failed to join group', error);
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: error instanceof Error ? error.message : String(error),
        metadata: { timestamp: new Date().toISOString() },
      };
    }
  }

  private async leaveGroup(agent: Agent, params: SkillParameters): Promise<ActionResult> {
    try {
      const groupId = params.groupId as string;
      const farewellMessage = params.farewellMessage as string;

      // Send farewell message if provided
      if (farewellMessage) {
        // Implementation would send the farewell message
        this.logger?.info(`Sending farewell message to group ${groupId}: ${farewellMessage}`);
      }

      // Remove from active groups
      this.activeGroups.delete(groupId);
      this.participationStrategies.delete(groupId);
      this.lastMessageTimes.delete(groupId);

      // Store leaving event in memory
      if (agent.memory) {
        await agent.memory.store({
          id: `telegram-group-leave-${groupId}`,
          content: `Left Telegram group: ${groupId}`,
          metadata: {
            type: 'group_leave',
            platform: 'telegram',
            groupId,
            farewellMessage,
          },
          timestamp: new Date(),
          importance: 0.5,
        });
      }

      this.logger?.info(`Left group: ${groupId}`);

      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: { groupId, left: true },
        metadata: { timestamp: new Date().toISOString() },
      };
    } catch (error) {
      this.logger?.error('Failed to leave group', error);
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: error instanceof Error ? error.message : String(error),
        metadata: { timestamp: new Date().toISOString() },
      };
    }
  }

  private async analyzeGroupActivity(agent: Agent, params: SkillParameters): Promise<ActionResult> {
    try {
      const groupId = params.groupId as string;
      const timeRange = params.timeRange as { start?: Date; end?: Date };

      const group = this.activeGroups.get(groupId);
      if (!group) {
        throw new Error(`Group ${groupId} not found in active groups`);
      }

      // Analyze group activity patterns
      const analysis = {
        groupId,
        memberCount: group.memberCount || 0,
        activityLevel: this.calculateActivityLevel(groupId),
        popularTopics: await this.getPopularTopics(groupId, timeRange),
        bestEngagementTimes: await this.getBestEngagementTimes(groupId, timeRange),
        keyMembers: await this.getKeyMembers(groupId),
        recommendedActions: this.getRecommendedActions(groupId),
      };

      this.logger?.info(`Analyzed activity for group: ${groupId}`);

      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: analysis,
        metadata: { timestamp: new Date().toISOString() },
      };
    } catch (error) {
      this.logger?.error('Failed to analyze group activity', error);
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: error instanceof Error ? error.message : String(error),
        metadata: { timestamp: new Date().toISOString() },
      };
    }
  }

  private async updateParticipationStrategy(agent: Agent, params: SkillParameters): Promise<ActionResult> {
    try {
      const groupId = params.groupId as string;
      const strategy = params.strategy as GroupParticipationStrategy;

      if (!this.activeGroups.has(groupId)) {
        throw new Error(`Group ${groupId} not found in active groups`);
      }

      // Update strategy
      this.participationStrategies.set(groupId, strategy);

      this.logger?.info(`Updated participation strategy for group: ${groupId}`);

      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: { groupId, strategy },
        metadata: { timestamp: new Date().toISOString() },
      };
    } catch (error) {
      this.logger?.error('Failed to update participation strategy', error);
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: error instanceof Error ? error.message : String(error),
        metadata: { timestamp: new Date().toISOString() },
      };
    }
  }

  // Helper methods
  private async getGroupInfo(groupId: string): Promise<TelegramGroupInfo> {
    try {
      // In a real implementation, this would use the Telegram Bot API
      // For now, we'll simulate fetching group information
      const group = this.activeGroups.get(groupId);
      
      return {
        id: groupId,
        title: group?.title || 'Unknown Group',
        type: group?.type || 'group',
        memberCount: group?.memberCount || 0,
        description: group?.description || '',
        permissions: group?.permissions || {},
        admins: await this.getGroupAdmins(groupId),
        pinnedMessage: await this.getPinnedMessage(groupId),
        inviteLink: group?.inviteLink,
        fetchedAt: new Date(),
      };
    } catch (error) {
      this.logger?.error(`Failed to get group info for ${groupId}`, error);
      throw error;
    }
  }

  private async analyzeRecentMessages(groupId: string, limit: number = 100): Promise<MessageAnalysis> {
    try {
      // In a real implementation, this would fetch and analyze recent messages
      const messages = await this.getRecentMessages(groupId, limit);
      
      const analysis: MessageAnalysis = {
        groupId,
        messageCount: messages.length,
        timeRange: {
          start: messages.length > 0 ? messages[messages.length - 1].date : new Date(),
          end: messages.length > 0 ? messages[0].date : new Date(),
        },
        topUsers: this.extractTopUsers(messages),
        commonTopics: this.extractTopics(messages),
        sentimentAnalysis: this.analyzeSentiment(messages),
        activityPatterns: this.analyzeActivityPatterns(messages),
        languageDistribution: this.analyzeLanguages(messages),
        analyzedAt: new Date(),
      };
      
      return analysis;
    } catch (error) {
      this.logger?.error(`Failed to analyze recent messages for ${groupId}`, error);
      throw error;
    }
  }

  private calculateActivityLevel(groupId: string): 'high' | 'medium' | 'low' {
    const group = this.activeGroups.get(groupId);
    if (!group) return 'low';
    
    const lastActivity = group.lastActivity;
    if (!lastActivity) return 'low';
    
    const hoursSinceLastActivity = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceLastActivity < 1) return 'high';
    if (hoursSinceLastActivity < 6) return 'medium';
    return 'low';
  }

  private async getPopularTopics(groupId: string, timeRange?: { start?: Date; end?: Date }): Promise<TopicAnalysis[]> {
    try {
      const messages = await this.getRecentMessages(groupId, 500, timeRange);
      const topicCounts = new Map<string, number>();
      const topicMessages = new Map<string, string[]>();
      
      // Extract topics from messages using keyword analysis
      for (const message of messages) {
        if (!message.text) continue;
        
        const topics = this.extractTopicsFromText(message.text);
        for (const topic of topics) {
          topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
          if (!topicMessages.has(topic)) {
            topicMessages.set(topic, []);
          }
          topicMessages.get(topic)!.push(message.text.substring(0, 100));
        }
      }
      
      // Sort topics by frequency and return top 10
      return Array.from(topicCounts.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([topic, count]) => ({
          topic,
          count,
          percentage: (count / messages.length) * 100,
          sampleMessages: topicMessages.get(topic)?.slice(0, 3) || [],
        }));
    } catch (error) {
      this.logger?.error(`Failed to get popular topics for ${groupId}`, error);
      return [];
    }
  }

  private async getBestEngagementTimes(groupId: string, timeRange?: { start?: Date; end?: Date }): Promise<EngagementTimeAnalysis[]> {
    try {
      const messages = await this.getRecentMessages(groupId, 1000, timeRange);
      const hourlyActivity = new Map<number, number>();
      const dailyActivity = new Map<number, number>();
      
      // Analyze message timestamps
      for (const message of messages) {
        const date = new Date(message.date * 1000);
        const hour = date.getHours();
        const dayOfWeek = date.getDay();
        
        hourlyActivity.set(hour, (hourlyActivity.get(hour) || 0) + 1);
        dailyActivity.set(dayOfWeek, (dailyActivity.get(dayOfWeek) || 0) + 1);
      }
      
      // Find peak hours
      const peakHours = Array.from(hourlyActivity.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 6)
        .map(([hour, count]) => ({
          type: 'hourly' as const,
          period: `${hour.toString().padStart(2, '0')}:00-${(hour + 1).toString().padStart(2, '0')}:00`,
          activityCount: count,
          score: count / Math.max(...Array.from(hourlyActivity.values())),
        }));
      
      // Find peak days
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const peakDays = Array.from(dailyActivity.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([day, count]) => ({
          type: 'daily' as const,
          period: dayNames[day],
          activityCount: count,
          score: count / Math.max(...Array.from(dailyActivity.values())),
        }));
      
      return [...peakHours, ...peakDays];
    } catch (error) {
      this.logger?.error(`Failed to get best engagement times for ${groupId}`, error);
      return [];
    }
  }

  private async getKeyMembers(groupId: string): Promise<KeyMemberAnalysis[]> {
    try {
      const messages = await this.getRecentMessages(groupId, 1000);
      const memberActivity = new Map<string, MemberActivity>();
      
      // Analyze member activity
      for (const message of messages) {
        if (!message.from) continue;
        
        const userId = message.from.id.toString();
        const username = message.from.username || message.from.firstName || 'Unknown';
        
        if (!memberActivity.has(userId)) {
          memberActivity.set(userId, {
            userId,
            username,
            messageCount: 0,
            totalCharacters: 0,
            averageMessageLength: 0,
            lastActivity: new Date(message.date * 1000),
            topics: new Set(),
            engagementScore: 0,
          });
        }
        
        const activity = memberActivity.get(userId)!;
        activity.messageCount++;
        activity.totalCharacters += message.text?.length || 0;
        activity.averageMessageLength = activity.totalCharacters / activity.messageCount;
        
        if (message.text) {
          const topics = this.extractTopicsFromText(message.text);
          topics.forEach(topic => activity.topics.add(topic));
        }
        
        // Calculate engagement score based on various factors
        activity.engagementScore = this.calculateEngagementScore(activity);
      }
      
      // Return top 10 most active members
      return Array.from(memberActivity.values())
        .sort((a, b) => b.engagementScore - a.engagementScore)
        .slice(0, 10)
        .map(activity => ({
          userId: activity.userId,
          username: activity.username,
          messageCount: activity.messageCount,
          averageMessageLength: activity.averageMessageLength,
          topicCount: activity.topics.size,
          engagementScore: activity.engagementScore,
          lastActivity: activity.lastActivity,
          influence: this.calculateInfluence(activity),
        }));
    } catch (error) {
      this.logger?.error(`Failed to get key members for ${groupId}`, error);
      return [];
    }
  }

  private getRecommendedActions(groupId: string): string[] {
    const strategy = this.participationStrategies.get(groupId);
    const recommendations = [];

    if (strategy?.responseFrequency && strategy.responseFrequency > 0.7) {
      recommendations.push('Increase engagement with group discussions');
    }

    if (strategy?.engagementStyle === 'helpful') {
      recommendations.push('Look for opportunities to help other members');
    }

    return recommendations;
  }

  // Public methods for extension to use
  public shouldRespondToMessage(groupId: string, messageContent: string): boolean {
    const strategy = this.participationStrategies.get(groupId);
    if (!strategy) return false;

    // Check cooldown period
    const lastMessage = this.lastMessageTimes.get(groupId);
    if (lastMessage && strategy.cooldownPeriod) {
      const timeSinceLastMessage = (Date.now() - lastMessage.getTime()) / (1000 * 60);
      if (timeSinceLastMessage < strategy.cooldownPeriod) {
        return false;
      }
    }

    // Check response frequency (random chance based on strategy)
    if (Math.random() > strategy.responseFrequency) {
      return false;
    }

    // Check topic relevance (simplified implementation)
    const group = this.activeGroups.get(groupId);
    if (group?.topics && strategy.topicRelevance > 0.5) {
      const hasRelevantTopic = group.topics.some(topic => 
        messageContent.toLowerCase().includes(topic.toLowerCase())
      );
      if (!hasRelevantTopic) {
        return false;
      }
    }

    return true;
  }

  public recordMessageSent(groupId: string): void {
    this.lastMessageTimes.set(groupId, new Date());
  }

  public getActiveGroups(): TelegramGroup[] {
    return Array.from(this.activeGroups.values());
  }

  // Additional helper methods for full implementation
  private async getGroupAdmins(groupId: string): Promise<string[]> {
    try {
      // In a real implementation, this would call Telegram Bot API getChatAdministrators
      // For now, return empty array or mock data
      return [];
    } catch (error) {
      this.logger?.error(`Failed to get group admins for ${groupId}`, error);
      return [];
    }
  }

  private async getPinnedMessage(groupId: string): Promise<string | undefined> {
    try {
      // In a real implementation, this would fetch the pinned message
      return undefined;
    } catch (error) {
      this.logger?.error(`Failed to get pinned message for ${groupId}`, error);
      return undefined;
    }
  }

  private async getRecentMessages(groupId: string, limit: number = 100, timeRange?: { start?: Date; end?: Date }): Promise<TelegramMessageData[]> {
    try {
      // In a real implementation, this would fetch messages from Telegram or local storage
      // For now, return empty array - this would be populated by the main extension
      // when it receives and stores messages
      return [];
    } catch (error) {
      this.logger?.error(`Failed to get recent messages for ${groupId}`, error);
      return [];
    }
  }

  private extractTopUsers(messages: TelegramMessageData[]): Array<{ userId: string; username: string; messageCount: number }> {
    const userCounts = new Map<string, { username: string; count: number }>();
    
    for (const message of messages) {
      if (!message.from) continue;
      
      const userId = message.from.id.toString();
      const username = message.from.username || message.from.firstName || 'Unknown';
      
      if (!userCounts.has(userId)) {
        userCounts.set(userId, { username, count: 0 });
      }
      userCounts.get(userId)!.count++;
    }
    
    return Array.from(userCounts.entries())
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 10)
      .map(([userId, data]) => ({
        userId,
        username: data.username,
        messageCount: data.count,
      }));
  }

  private extractTopics(messages: TelegramMessageData[]): string[] {
    const topicCounts = new Map<string, number>();
    
    for (const message of messages) {
      if (!message.text) continue;
      
      const topics = this.extractTopicsFromText(message.text);
      for (const topic of topics) {
        topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
      }
    }
    
    return Array.from(topicCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([topic]) => topic);
  }

  private extractTopicsFromText(text: string): string[] {
    // Simple topic extraction using keywords and hashtags
    const topics: string[] = [];
    
    // Extract hashtags
    const hashtags = text.match(/#\w+/g);
    if (hashtags) {
      topics.push(...hashtags.map(tag => tag.substring(1).toLowerCase()));
    }
    
    // Extract common topic keywords
    const topicKeywords = [
      'ai', 'artificial intelligence', 'machine learning', 'ml', 'deep learning',
      'programming', 'coding', 'development', 'software', 'tech', 'technology',
      'blockchain', 'crypto', 'bitcoin', 'ethereum', 'web3', 'nft',
      'javascript', 'python', 'react', 'nodejs', 'typescript',
      'startup', 'business', 'entrepreneur', 'marketing', 'finance',
      'design', 'ui', 'ux', 'frontend', 'backend', 'fullstack',
      'data', 'analytics', 'database', 'api', 'cloud', 'aws', 'docker',
    ];
    
    const lowerText = text.toLowerCase();
    for (const keyword of topicKeywords) {
      if (lowerText.includes(keyword)) {
        topics.push(keyword);
      }
    }
    
    return [...new Set(topics)]; // Remove duplicates
  }

  private analyzeSentiment(messages: TelegramMessageData[]): { positive: number; negative: number; neutral: number } {
    // Simple sentiment analysis using keyword matching
    let positive = 0;
    let negative = 0;
    let neutral = 0;
    
    const positiveWords = ['good', 'great', 'awesome', 'excellent', 'amazing', 'love', 'like', 'happy', 'thanks', 'thank you'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'dislike', 'sad', 'angry', 'frustrated', 'problem', 'issue'];
    
    for (const message of messages) {
      if (!message.text) {
        neutral++;
        continue;
      }
      
      const lowerText = message.text.toLowerCase();
      const hasPositive = positiveWords.some(word => lowerText.includes(word));
      const hasNegative = negativeWords.some(word => lowerText.includes(word));
      
      if (hasPositive && !hasNegative) {
        positive++;
      } else if (hasNegative && !hasPositive) {
        negative++;
      } else {
        neutral++;
      }
    }
    
    const total = messages.length || 1;
    return {
      positive: (positive / total) * 100,
      negative: (negative / total) * 100,
      neutral: (neutral / total) * 100,
    };
  }

  private analyzeActivityPatterns(messages: TelegramMessageData[]): Array<{ hour: number; messageCount: number }> {
    const hourlyActivity = new Map<number, number>();
    
    for (const message of messages) {
      const date = new Date(message.date * 1000);
      const hour = date.getHours();
      hourlyActivity.set(hour, (hourlyActivity.get(hour) || 0) + 1);
    }
    
    return Array.from(hourlyActivity.entries())
      .map(([hour, messageCount]) => ({ hour, messageCount }))
      .sort((a, b) => a.hour - b.hour);
  }

  private analyzeLanguages(messages: TelegramMessageData[]): Record<string, number> {
    // Simple language detection based on character patterns
    const languageCounts: Record<string, number> = {};
    
    for (const message of messages) {
      if (!message.text) continue;
      
      const language = this.detectLanguage(message.text);
      languageCounts[language] = (languageCounts[language] || 0) + 1;
    }
    
    return languageCounts;
  }

  private detectLanguage(text: string): string {
    // Very simple language detection - in a real implementation, use a proper library
    const cyrillicPattern = /[\u0400-\u04FF]/;
    const arabicPattern = /[\u0600-\u06FF]/;
    const chinesePattern = /[\u4e00-\u9fff]/;
    const japanesePattern = /[\u3040-\u309f\u30a0-\u30ff]/;
    
    if (cyrillicPattern.test(text)) return 'ru';
    if (arabicPattern.test(text)) return 'ar';
    if (chinesePattern.test(text)) return 'zh';
    if (japanesePattern.test(text)) return 'ja';
    
    return 'en'; // Default to English
  }

  private calculateEngagementScore(activity: MemberActivity): number {
    // Calculate engagement score based on multiple factors
    const messageWeight = Math.min(activity.messageCount / 100, 1) * 40; // Max 40 points for messages
    const lengthWeight = Math.min(activity.averageMessageLength / 100, 1) * 20; // Max 20 points for message length
    const topicWeight = Math.min(activity.topics.size / 10, 1) * 20; // Max 20 points for topic diversity
    const recentWeight = this.calculateRecencyScore(activity.lastActivity) * 20; // Max 20 points for recent activity
    
    return messageWeight + lengthWeight + topicWeight + recentWeight;
  }

  private calculateRecencyScore(lastActivity: Date): number {
    const hoursSinceActivity = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceActivity < 24) return 1.0;
    if (hoursSinceActivity < 72) return 0.8;
    if (hoursSinceActivity < 168) return 0.6; // 1 week
    if (hoursSinceActivity < 720) return 0.4; // 1 month
    return 0.2;
  }

  private calculateInfluence(activity: MemberActivity): 'high' | 'medium' | 'low' {
    if (activity.engagementScore > 70) return 'high';
    if (activity.engagementScore > 40) return 'medium';
    return 'low';
  }
}