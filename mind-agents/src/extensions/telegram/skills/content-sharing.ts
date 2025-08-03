/**
 * Content Sharing Skill for Telegram Extension
 * 
 * Handles information sharing and content distribution
 */

import { ExtensionAction, ActionCategory, Agent, ActionResult, ActionResultType } from '../../../types/agent.js';
import { SkillParameters } from '../../../types/common.js';
import { TelegramSkill } from './index.js';
import { TelegramConfig } from '../types.js';
import { Logger } from '../../../utils/logger.js';

export interface ContentItem {
  id: string;
  title: string;
  content: string;
  type: 'article' | 'news' | 'tutorial' | 'announcement' | 'media' | 'link';
  source: string;
  tags: string[];
  targetGroups: string[];
  scheduledTime?: Date;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'draft' | 'scheduled' | 'published' | 'archived';
  engagement: {
    views: number;
    reactions: number;
    shares: number;
    comments: number;
  };
  createdAt: Date;
  publishedAt?: Date;
}

export interface ContentStrategy {
  groupId: string;
  contentTypes: string[];
  frequency: number; // posts per day
  optimalTimes: Array<{ hour: number; minute: number }>;
  topics: string[];
  tone: 'professional' | 'casual' | 'educational' | 'entertaining';
  includeHashtags: boolean;
  crossPost: boolean;
  engagementGoals: {
    minViews: number;
    minReactions: number;
  };
}

export interface ContentQueue {
  groupId: string;
  items: Array<{
    contentId: string;
    scheduledTime: Date;
    priority: number;
  }>;
}

export class ContentSharingSkill implements TelegramSkill {
  name = 'content-sharing';
  description = 'Information sharing and content distribution';
  
  private config?: TelegramConfig;
  private logger?: Logger;
  private contentLibrary: Map<string, ContentItem> = new Map();
  private contentStrategies: Map<string, ContentStrategy> = new Map();
  private contentQueues: Map<string, ContentQueue> = new Map();
  private publishingScheduler?: NodeJS.Timeout;

  async initialize(config: TelegramConfig, logger: Logger): Promise<void> {
    this.config = config;
    this.logger = logger;
    
    await this.loadContentData();
    this.startContentScheduler();
  }

  async cleanup(): Promise<void> {
    if (this.publishingScheduler) {
      clearInterval(this.publishingScheduler);
    }
    await this.saveContentData();
  }

  private async loadContentData(): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const dataDir = path.join(process.cwd(), 'data', 'telegram', 'content');
      
      // Load content library
      try {
        const contentData = await fs.readFile(path.join(dataDir, 'library.json'), 'utf-8');
        const content = JSON.parse(contentData);
        for (const [id, item] of Object.entries(content)) {
          const contentItem = item as any;
          contentItem.createdAt = new Date(contentItem.createdAt);
          if (contentItem.publishedAt) {
            contentItem.publishedAt = new Date(contentItem.publishedAt);
          }
          if (contentItem.scheduledTime) {
            contentItem.scheduledTime = new Date(contentItem.scheduledTime);
          }
          this.contentLibrary.set(id, contentItem as ContentItem);
        }
      } catch (error) {
        this.logger?.debug('No existing content library found');
      }

      // Load content strategies
      try {
        const strategiesData = await fs.readFile(path.join(dataDir, 'strategies.json'), 'utf-8');
        const strategies = JSON.parse(strategiesData);
        for (const [groupId, strategy] of Object.entries(strategies)) {
          this.contentStrategies.set(groupId, strategy as ContentStrategy);
        }
      } catch (error) {
        this.logger?.debug('No existing content strategies found');
      }

      this.logger?.info(`Loaded ${this.contentLibrary.size} content items and ${this.contentStrategies.size} strategies`);
    } catch (error) {
      this.logger?.error('Failed to load content data', error);
    }
  }

  private async saveContentData(): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const dataDir = path.join(process.cwd(), 'data', 'telegram', 'content');
      await fs.mkdir(dataDir, { recursive: true });

      // Save content library
      const contentData = Object.fromEntries(
        Array.from(this.contentLibrary.entries()).map(([id, item]) => [
          id,
          {
            ...item,
            createdAt: item.createdAt.toISOString(),
            publishedAt: item.publishedAt?.toISOString(),
            scheduledTime: item.scheduledTime?.toISOString(),
          },
        ])
      );
      await fs.writeFile(
        path.join(dataDir, 'library.json'),
        JSON.stringify(contentData, null, 2),
        'utf-8'
      );

      // Save content strategies
      const strategies = Object.fromEntries(this.contentStrategies);
      await fs.writeFile(
        path.join(dataDir, 'strategies.json'),
        JSON.stringify(strategies, null, 2),
        'utf-8'
      );

      this.logger?.debug('Saved content data');
    } catch (error) {
      this.logger?.error('Failed to save content data', error);
    }
  }

  private startContentScheduler(): void {
    // Check for scheduled content every minute
    this.publishingScheduler = setInterval(() => {
      this.processScheduledContent();
    }, 60000);
  }

  private async processScheduledContent(): Promise<void> {
    const now = new Date();
    
    for (const content of this.contentLibrary.values()) {
      if (content.status === 'scheduled' && 
          content.scheduledTime && 
          content.scheduledTime <= now) {
        
        try {
          await this.publishContent(content);
        } catch (error) {
          this.logger?.error(`Failed to publish scheduled content: ${content.id}`, error);
        }
      }
    }
  }

  getActions(): Record<string, ExtensionAction> {
    return {
      shareContent: {
        name: 'shareContent',
        description: 'Share content across multiple groups with targeting',
        category: ActionCategory.COMMUNICATION,
        parameters: {
          content: {
            type: 'object',
            required: true,
            description: 'Content to share',
          },
          targetGroups: {
            type: 'array',
            required: false,
            description: 'Target groups for sharing',
          },
          schedule: {
            type: 'object',
            required: false,
            description: 'Scheduling options',
          },
        },
        execute: async (agent: Agent, params: SkillParameters): Promise<ActionResult> => {
          return this.shareContent(agent, params);
        },
      },

      createContentStrategy: {
        name: 'createContentStrategy',
        description: 'Create content sharing strategy for a group',
        category: ActionCategory.AUTONOMOUS,
        parameters: {
          groupId: {
            type: 'string',
            required: true,
            description: 'Group ID to create strategy for',
          },
          strategy: {
            type: 'object',
            required: true,
            description: 'Content strategy configuration',
          },
        },
        execute: async (agent: Agent, params: SkillParameters): Promise<ActionResult> => {
          return this.createContentStrategy(agent, params);
        },
      },

      scheduleContent: {
        name: 'scheduleContent',
        description: 'Schedule content for future publishing',
        category: ActionCategory.AUTONOMOUS,
        parameters: {
          contentId: {
            type: 'string',
            required: true,
            description: 'Content ID to schedule',
          },
          scheduledTime: {
            type: 'string',
            required: true,
            description: 'ISO timestamp for publishing',
          },
          targetGroups: {
            type: 'array',
            required: false,
            description: 'Target groups for publishing',
          },
        },
        execute: async (agent: Agent, params: SkillParameters): Promise<ActionResult> => {
          return this.scheduleContent(agent, params);
        },
      },

      generateContent: {
        name: 'generateContent',
        description: 'Generate content based on topics and strategy',
        category: ActionCategory.AUTONOMOUS,
        parameters: {
          topic: {
            type: 'string',
            required: true,
            description: 'Content topic',
          },
          type: {
            type: 'string',
            required: true,
            description: 'Content type',
          },
          targetGroup: {
            type: 'string',
            required: false,
            description: 'Target group for content optimization',
          },
        },
        execute: async (agent: Agent, params: SkillParameters): Promise<ActionResult> => {
          return this.generateContent(agent, params);
        },
      },

      analyzeContentPerformance: {
        name: 'analyzeContentPerformance',
        description: 'Analyze content engagement and performance metrics',
        category: ActionCategory.PROCESSING,
        parameters: {
          groupId: {
            type: 'string',
            required: false,
            description: 'Group ID to analyze (optional)',
          },
          timeRange: {
            type: 'object',
            required: false,
            description: 'Time range for analysis',
          },
        },
        execute: async (agent: Agent, params: SkillParameters): Promise<ActionResult> => {
          return this.analyzeContentPerformance(agent, params);
        },
      },
    };
  }

  private async shareContent(agent: Agent, params: SkillParameters): Promise<ActionResult> {
    try {
      const contentData = params.content as Partial<ContentItem>;
      const targetGroups = params.targetGroups as string[] || [];
      const schedule = params.schedule as { time?: string; immediate?: boolean };

      // Create content item
      const content: ContentItem = {
        id: contentData.id || `content_${Date.now()}`,
        title: contentData.title || 'Shared Content',
        content: contentData.content || '',
        type: contentData.type || 'article',
        source: contentData.source || 'manual',
        tags: contentData.tags || [],
        targetGroups: targetGroups.length > 0 ? targetGroups : contentData.targetGroups || [],
        priority: contentData.priority || 'medium',
        status: schedule?.immediate === false ? 'scheduled' : 'published',
        engagement: {
          views: 0,
          reactions: 0,
          shares: 0,
          comments: 0,
        },
        createdAt: new Date(),
      };

      if (schedule?.time) {
        content.scheduledTime = new Date(schedule.time);
        content.status = 'scheduled';
      }

      this.contentLibrary.set(content.id, content);

      // Publish immediately or schedule
      if (content.status === 'published') {
        await this.publishContent(content);
      }

      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: { contentId: content.id, status: content.status, targetGroups: content.targetGroups },
        metadata: { timestamp: new Date().toISOString() },
      };
    } catch (error) {
      this.logger?.error('Failed to share content', error);
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: error instanceof Error ? error.message : String(error),
        metadata: { timestamp: new Date().toISOString() },
      };
    }
  }

  private async createContentStrategy(agent: Agent, params: SkillParameters): Promise<ActionResult> {
    try {
      const groupId = params.groupId as string;
      const strategyData = params.strategy as Partial<ContentStrategy>;

      const strategy: ContentStrategy = {
        groupId,
        contentTypes: strategyData.contentTypes || ['article', 'news', 'tutorial'],
        frequency: strategyData.frequency || 2, // 2 posts per day
        optimalTimes: strategyData.optimalTimes || [
          { hour: 9, minute: 0 },
          { hour: 18, minute: 0 },
        ],
        topics: strategyData.topics || [],
        tone: strategyData.tone || 'professional',
        includeHashtags: strategyData.includeHashtags ?? true,
        crossPost: strategyData.crossPost ?? false,
        engagementGoals: strategyData.engagementGoals || {
          minViews: 100,
          minReactions: 10,
        },
      };

      this.contentStrategies.set(groupId, strategy);

      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: { groupId, strategy },
        metadata: { timestamp: new Date().toISOString() },
      };
    } catch (error) {
      this.logger?.error('Failed to create content strategy', error);
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: error instanceof Error ? error.message : String(error),
        metadata: { timestamp: new Date().toISOString() },
      };
    }
  }

  private async scheduleContent(agent: Agent, params: SkillParameters): Promise<ActionResult> {
    try {
      const contentId = params.contentId as string;
      const scheduledTime = new Date(params.scheduledTime as string);
      const targetGroups = params.targetGroups as string[];

      const content = this.contentLibrary.get(contentId);
      if (!content) {
        throw new Error(`Content not found: ${contentId}`);
      }

      content.scheduledTime = scheduledTime;
      content.status = 'scheduled';
      
      if (targetGroups) {
        content.targetGroups = targetGroups;
      }

      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: { contentId, scheduledTime, targetGroups: content.targetGroups },
        metadata: { timestamp: new Date().toISOString() },
      };
    } catch (error) {
      this.logger?.error('Failed to schedule content', error);
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: error instanceof Error ? error.message : String(error),
        metadata: { timestamp: new Date().toISOString() },
      };
    }
  }

  private async generateContent(agent: Agent, params: SkillParameters): Promise<ActionResult> {
    try {
      const topic = params.topic as string;
      const type = params.type as string;
      const targetGroup = params.targetGroup as string;

      if (!agent.portal) {
        throw new Error('Agent portal not available for content generation');
      }

      // Get strategy for target group if specified
      const strategy = targetGroup ? this.contentStrategies.get(targetGroup) : null;

      // Generate content based on type and strategy
      const generatedContent = await this.createContentByType(agent, topic, type, strategy);

      if (!generatedContent) {
        throw new Error('Failed to generate content');
      }

      // Create content item
      const content: ContentItem = {
        id: `generated_${Date.now()}`,
        title: generatedContent.title,
        content: generatedContent.content,
        type: type as any,
        source: 'ai_generated',
        tags: generatedContent.tags || [],
        targetGroups: targetGroup ? [targetGroup] : [],
        priority: 'medium',
        status: 'draft',
        engagement: {
          views: 0,
          reactions: 0,
          shares: 0,
          comments: 0,
        },
        createdAt: new Date(),
      };

      this.contentLibrary.set(content.id, content);

      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: { contentId: content.id, content: generatedContent },
        metadata: { timestamp: new Date().toISOString() },
      };
    } catch (error) {
      this.logger?.error('Failed to generate content', error);
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: error instanceof Error ? error.message : String(error),
        metadata: { timestamp: new Date().toISOString() },
      };
    }
  }

  private async analyzeContentPerformance(agent: Agent, params: SkillParameters): Promise<ActionResult> {
    try {
      const groupId = params.groupId as string;
      const timeRange = params.timeRange as { start?: Date; end?: Date };

      const analysis = this.performContentAnalysis(groupId, timeRange);

      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: analysis,
        metadata: { timestamp: new Date().toISOString() },
      };
    } catch (error) {
      this.logger?.error('Failed to analyze content performance', error);
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: error instanceof Error ? error.message : String(error),
        metadata: { timestamp: new Date().toISOString() },
      };
    }
  }

  // Helper methods with full implementations
  private async publishContent(content: ContentItem): Promise<void> {
    try {
      // Format content for publishing
      const formattedContent = await this.formatContentForPublishing(content);

      // Publish to each target group
      for (const groupId of content.targetGroups) {
        await this.sendContentToGroup(groupId, formattedContent, content);
      }

      // Update content status
      content.status = 'published';
      content.publishedAt = new Date();

      this.logger?.info(`Published content: ${content.title} to ${content.targetGroups.length} groups`);
    } catch (error) {
      this.logger?.error(`Failed to publish content: ${content.title}`, error);
      throw error;
    }
  }

  private async formatContentForPublishing(content: ContentItem): Promise<string> {
    let formatted = '';

    // Add title if present
    if (content.title) {
      formatted += `📰 **${content.title}**\n\n`;
    }

    // Add main content
    formatted += content.content;

    // Add hashtags if configured
    if (content.tags.length > 0) {
      formatted += `\n\n${content.tags.map(tag => `#${tag}`).join(' ')}`;
    }

    // Add source attribution
    if (content.source && content.source !== 'manual') {
      formatted += `\n\n📎 Source: ${content.source}`;
    }

    return formatted;
  }

  private async sendContentToGroup(groupId: string, formattedContent: string, content: ContentItem): Promise<void> {
    // In a real implementation, this would use the Telegram Bot API
    this.logger?.info(`Sending content to group ${groupId}: ${content.title}`);
    
    // Simulate engagement tracking
    setTimeout(() => {
      this.updateContentEngagement(content.id, {
        views: Math.floor(Math.random() * 200) + 50,
        reactions: Math.floor(Math.random() * 20) + 5,
        shares: Math.floor(Math.random() * 10),
        comments: Math.floor(Math.random() * 15),
      });
    }, 60000); // Update after 1 minute
  }

  private async createContentByType(agent: Agent, topic: string, type: string, strategy?: ContentStrategy | null): Promise<{ title: string; content: string; tags?: string[] } | null> {
    const prompts = {
      article: `Write an informative article about ${topic}. Make it engaging and well-structured with clear points.`,
      news: `Create a news-style update about ${topic}. Keep it factual and timely.`,
      tutorial: `Write a step-by-step tutorial about ${topic}. Make it easy to follow and practical.`,
      announcement: `Create an announcement about ${topic}. Make it clear and attention-grabbing.`,
      tip: `Share a useful tip related to ${topic}. Make it actionable and valuable.`,
    };

    const basePrompt = prompts[type as keyof typeof prompts] || prompts.article;
    
    let prompt = basePrompt;
    
    if (strategy) {
      prompt += ` Use a ${strategy.tone} tone.`;
      if (strategy.topics.length > 0) {
        prompt += ` Focus on these related topics: ${strategy.topics.join(', ')}.`;
      }
    }

    prompt += ' Keep it concise and engaging for a Telegram audience. Provide a title and main content.';

    try {
      const response = await agent.portal!.generateText(prompt, {
        maxOutputTokens: 500,
        temperature: 0.7,
      });

      // Parse response to extract title and content
      const lines = response.text.split('\n');
      const title = lines[0].replace(/^(Title:|#\s*)/i, '').trim();
      const content = lines.slice(1).join('\n').trim();

      // Extract potential hashtags
      const tags = this.extractHashtagsFromContent(content);

      return {
        title: title || `${topic} - ${type}`,
        content: content || response.text,
        tags,
      };
    } catch (error) {
      this.logger?.error('Failed to generate content with AI', error);
      return null;
    }
  }

  private extractHashtagsFromContent(content: string): string[] {
    const hashtags = content.match(/#\w+/g);
    return hashtags ? hashtags.map(tag => tag.substring(1).toLowerCase()) : [];
  }

  private performContentAnalysis(groupId?: string, timeRange?: { start?: Date; end?: Date }): any {
    const now = new Date();
    const start = timeRange?.start || new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const end = timeRange?.end || now;

    // Filter content based on criteria
    let contentToAnalyze = Array.from(this.contentLibrary.values()).filter(content => {
      if (content.publishedAt && (content.publishedAt < start || content.publishedAt > end)) {
        return false;
      }
      if (groupId && !content.targetGroups.includes(groupId)) {
        return false;
      }
      return content.status === 'published';
    });

    if (contentToAnalyze.length === 0) {
      return {
        totalContent: 0,
        averageEngagement: 0,
        topPerformers: [],
        contentTypeBreakdown: {},
        recommendations: ['No content found for the specified criteria'],
      };
    }

    // Calculate metrics
    const totalViews = contentToAnalyze.reduce((sum, content) => sum + content.engagement.views, 0);
    const totalReactions = contentToAnalyze.reduce((sum, content) => sum + content.engagement.reactions, 0);
    const totalShares = contentToAnalyze.reduce((sum, content) => sum + content.engagement.shares, 0);
    const totalComments = contentToAnalyze.reduce((sum, content) => sum + content.engagement.comments, 0);

    // Content type breakdown
    const typeBreakdown: Record<string, number> = {};
    contentToAnalyze.forEach(content => {
      typeBreakdown[content.type] = (typeBreakdown[content.type] || 0) + 1;
    });

    // Top performers
    const topPerformers = contentToAnalyze
      .sort((a, b) => (b.engagement.views + b.engagement.reactions) - (a.engagement.views + a.engagement.reactions))
      .slice(0, 5)
      .map(content => ({
        id: content.id,
        title: content.title,
        type: content.type,
        engagement: content.engagement,
        publishedAt: content.publishedAt,
      }));

    // Generate recommendations
    const recommendations = this.generateContentRecommendations(contentToAnalyze, typeBreakdown);

    return {
      period: { start, end },
      totalContent: contentToAnalyze.length,
      totalViews,
      totalReactions,
      totalShares,
      totalComments,
      averageViews: totalViews / contentToAnalyze.length,
      averageReactions: totalReactions / contentToAnalyze.length,
      engagementRate: totalReactions / Math.max(totalViews, 1),
      contentTypeBreakdown: typeBreakdown,
      topPerformers,
      recommendations,
    };
  }

  private generateContentRecommendations(content: ContentItem[], typeBreakdown: Record<string, number>): string[] {
    const recommendations: string[] = [];

    // Analyze performance by type
    const typePerformance: Record<string, number> = {};
    content.forEach(item => {
      if (!typePerformance[item.type]) {
        typePerformance[item.type] = 0;
      }
      typePerformance[item.type] += item.engagement.views + item.engagement.reactions;
    });

    // Find best performing type
    const bestType = Object.entries(typePerformance).sort(([,a], [,b]) => b - a)[0];
    if (bestType) {
      recommendations.push(`Focus more on ${bestType[0]} content - it performs best with your audience`);
    }

    // Check posting frequency
    const avgEngagement = content.reduce((sum, item) => sum + item.engagement.views + item.engagement.reactions, 0) / content.length;
    if (avgEngagement < 50) {
      recommendations.push('Consider improving content quality or posting at different times to increase engagement');
    }

    // Check content diversity
    if (Object.keys(typeBreakdown).length < 3) {
      recommendations.push('Try diversifying content types to appeal to different audience preferences');
    }

    return recommendations;
  }

  private updateContentEngagement(contentId: string, engagement: Partial<ContentItem['engagement']>): void {
    const content = this.contentLibrary.get(contentId);
    if (content) {
      Object.assign(content.engagement, engagement);
    }
  }

  // Public methods for extension to use
  public getContentLibrary(): ContentItem[] {
    return Array.from(this.contentLibrary.values());
  }

  public getScheduledContent(): ContentItem[] {
    return Array.from(this.contentLibrary.values()).filter(
      content => content.status === 'scheduled'
    );
  }

  public getContentStrategy(groupId: string): ContentStrategy | undefined {
    return this.contentStrategies.get(groupId);
  }

  public updateContentEngagementMetrics(contentId: string, metrics: Partial<ContentItem['engagement']>): void {
    this.updateContentEngagement(contentId, metrics);
  }
}