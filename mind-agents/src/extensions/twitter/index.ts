/**
 * Autonomous Twitter Extension for SYMindX
 *
 * Provides autonomous Twitter account management with:
 * - Autonomous tweet creation based on personality and interests
 * - Community engagement with mentions and conversations
 * - Trend monitoring and relevant topic participation
 * - Relationship building and follower management
 * - Content performance learning and optimization
 */

import { TwitterApi } from 'twitter-api-v2';
import { BaseExtension } from '../base-extension';
import { Agent, AgentEvent, ExtensionStatus, ExtensionType, ThoughtContext, EnvironmentType } from '../../types/agent';
import { runtimeLogger } from '../../utils/logger';
import {
  TwitterConfig,
  TwitterTweet,
  TwitterTrend,
  TwitterRelationship,
  TwitterContentStrategy,
  TwitterAutonomousAction,
  TwitterPerformanceAnalytics,
  TwitterLogContext,
  TwitterTrendsLocation,
  TwitterTrendsResult,
  TwitterTrendResponse,
  TweetV2PostTweetResult,
  UserV2Result,
  TimelineV2Result,
  ContentGenerationContext,
  TweetV2,
} from './types';
import {
  TweetSkill,
  EngagementSkill,
  TrendsSkill,
  AnalyticsSkill,
  RelationshipSkill,
} from './skills';

/**
 * Autonomous Twitter Extension
 */
export class TwitterExtension extends BaseExtension {
  private twitterClient?: TwitterApi;
  private twitterConfig: TwitterConfig;
  private autonomousMode = false;
  private tweetScheduler: NodeJS.Timeout | undefined;
  private engagementScheduler: NodeJS.Timeout | undefined;
  private trendMonitor: NodeJS.Timeout | undefined;
  private performanceTracker: NodeJS.Timeout | undefined;
  
  // State management
  private relationships: Map<string, TwitterRelationship> = new Map();
  private contentStrategy: TwitterContentStrategy;
  private performanceMetrics: TwitterPerformanceAnalytics;
  private recentTweets: TwitterTweet[] = [];
  private currentTrends: TwitterTrend[] = [];
  private actionQueue: TwitterAutonomousAction[] = [];
  
  // Skills
  private tweetSkill: TweetSkill;
  private engagementSkill: EngagementSkill;
  private trendsSkill: TrendsSkill;
  private analyticsSkill: AnalyticsSkill;
  private relationshipSkill: RelationshipSkill;
  
  // Rate limiting
  private rateLimitTracker = {
    tweets: { count: 0, resetTime: Date.now() + 15 * 60 * 1000 },
    follows: { count: 0, resetTime: Date.now() + 24 * 60 * 60 * 1000 },
    likes: { count: 0, resetTime: Date.now() + 15 * 60 * 1000 },
    retweets: { count: 0, resetTime: Date.now() + 15 * 60 * 1000 },
  };

  constructor(config: TwitterConfig) {
    super(
      'twitter-extension',
      'Autonomous Twitter Extension',
      '1.0.0',
      ExtensionType.COMMUNICATION,
      config
    );

    this.twitterConfig = config;
    this.autonomousMode = config.autonomous.enabled;

    // Initialize content strategy
    this.contentStrategy = {
      topics: config.autonomous.personalityTopics,
      toneOfVoice: 'casual',
      hashtagStrategy: [],
      mentionStrategy: [],
      postingTimes: ['09:00', '12:00', '15:00', '18:00', '21:00'],
      contentTypes: ['original', 'reply', 'retweet'],
      performanceMetrics: {
        avgLikes: 0,
        avgRetweets: 0,
        avgReplies: 0,
        bestPerformingTopics: [],
        optimalLength: 280,
      },
    };

    // Initialize performance metrics
    this.performanceMetrics = {
      period: 'day',
      metrics: {
        tweetsPosted: 0,
        totalImpressions: 0,
        totalEngagements: 0,
        engagementRate: 0,
        followerGrowth: 0,
        topPerformingTweets: [],
        topHashtags: [],
        bestPostingTimes: [],
      },
      insights: [],
      recommendations: [],
    };

    // Initialize skills
    this.tweetSkill = new TweetSkill(this);
    this.engagementSkill = new EngagementSkill(this);
    this.trendsSkill = new TrendsSkill(this);
    this.analyticsSkill = new AnalyticsSkill(this);
    this.relationshipSkill = new RelationshipSkill(this);

    // Initialize actions from skills
    this.initializeSkillActions();
  }

  /**
   * Initialize actions from all skills
   */
  private initializeSkillActions(): void {
    // Combine all skill actions
    this.actions = {
      ...this.tweetSkill.getActions(),
      ...this.engagementSkill.getActions(),
      ...this.trendsSkill.getActions(),
      ...this.analyticsSkill.getActions(),
      ...this.relationshipSkill.getActions(),
    };
  }

  /**
   * Initialize the Twitter extension
   */
  protected async onInitialize(agent: Agent): Promise<void> {
    try {
      // Initialize Twitter API client
      this.twitterClient = new TwitterApi({
        appKey: this.twitterConfig.apiKey,
        appSecret: this.twitterConfig.apiSecret,
        accessToken: this.twitterConfig.accessToken,
        accessSecret: this.twitterConfig.accessTokenSecret,
      });

      // Verify credentials
      await this.verifyCredentials();

      // Load existing relationships and performance data
      await this.loadRelationships();
      await this.loadPerformanceData();

      runtimeLogger.info('Twitter extension initialized successfully', {
        source: 'twitter-extension',
        agentId: agent.id,
        autonomousMode: this.autonomousMode,
      } as TwitterLogContext);
    } catch (error) {
      runtimeLogger.error('Failed to initialize Twitter extension', {
        source: 'twitter-extension',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Start the Twitter extension
   */
  protected async onStart(): Promise<void> {
    if (this.autonomousMode) {
      await this.startAutonomousMode();
    }

    runtimeLogger.info('Twitter extension started', {
      source: 'twitter-extension',
      agentId: this.agent?.id,
      autonomousMode: this.autonomousMode,
    } as TwitterLogContext);
  }

  /**
   * Stop the Twitter extension
   */
  protected async onStop(): Promise<void> {
    await this.stopAutonomousMode();

    runtimeLogger.info('Twitter extension stopped', {
      source: 'twitter-extension',
    });
  }

  /**
   * Handle periodic tick
   */
  protected async onTick(_agent: Agent): Promise<void> {
    if (this.autonomousMode && this.status === ExtensionStatus.ACTIVE) {
      await this.processActionQueue();
      await this.updateRateLimits();
    }
  }

  /**
   * Handle agent events
   */
  protected async onEvent(event: AgentEvent): Promise<void> {
    switch (event.type) {
      case 'message':
        if (this.autonomousMode) {
          await this.handleMessageEvent(event);
        }
        break;
      case 'emotion_change':
        await this.handleEmotionChange(event);
        break;
      case 'goal_update':
        await this.handleGoalUpdate(event);
        break;
    }
  }

  /**
   * Start autonomous mode
   */
  private async startAutonomousMode(): Promise<void> {
    if (!this.twitterClient) {
      throw new Error('Twitter client not initialized');
    }

    // Start tweet scheduler
    this.tweetScheduler = setInterval(
      () => this.scheduleAutonomousTweet(),
      this.twitterConfig.autonomous.tweetFrequency * 60 * 1000
    );

    // Start engagement scheduler
    this.engagementScheduler = setInterval(
      () => this.scheduleEngagementCheck(),
      this.twitterConfig.autonomous.engagementFrequency * 60 * 1000
    );

    // Start trend monitor
    this.trendMonitor = setInterval(
      () => this.monitorTrends(),
      30 * 60 * 1000 // Every 30 minutes
    );

    // Start performance tracker
    this.performanceTracker = setInterval(
      () => this.trackPerformance(),
      60 * 60 * 1000 // Every hour
    );

    runtimeLogger.info('Autonomous Twitter mode started', {
      source: 'twitter-extension',
      tweetFrequency: this.twitterConfig.autonomous.tweetFrequency,
      engagementFrequency: this.twitterConfig.autonomous.engagementFrequency,
    } as TwitterLogContext);
  }

  /**
   * Stop autonomous mode
   */
  private async stopAutonomousMode(): Promise<void> {
    if (this.tweetScheduler) {
      clearInterval(this.tweetScheduler);
      this.tweetScheduler = undefined;
    }

    if (this.engagementScheduler) {
      clearInterval(this.engagementScheduler);
      this.engagementScheduler = undefined;
    }

    if (this.trendMonitor) {
      clearInterval(this.trendMonitor);
      this.trendMonitor = undefined;
    }

    if (this.performanceTracker) {
      clearInterval(this.performanceTracker);
      this.performanceTracker = undefined;
    }

    runtimeLogger.info('Autonomous Twitter mode stopped', {
      source: 'twitter-extension',
    });
  }

  /**
   * Schedule autonomous tweet creation
   */
  private async scheduleAutonomousTweet(): Promise<void> {
    if (!this.canPerformAction('tweet')) {
      return;
    }

    try {
      const action: TwitterAutonomousAction = {
        type: 'tweet',
        reasoning: 'Scheduled autonomous tweet based on personality and interests',
        confidence: 0.8,
        expectedOutcome: 'Engage audience with personality-driven content',
      };

      this.actionQueue.push(action);

      runtimeLogger.debug('Scheduled autonomous tweet', {
        source: 'twitter-extension',
        queueLength: this.actionQueue.length,
      } as TwitterLogContext);
    } catch (error) {
      runtimeLogger.error('Failed to schedule autonomous tweet', {
        source: 'twitter-extension',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Schedule engagement check
   */
  private async scheduleEngagementCheck(): Promise<void> {
    if (!this.canPerformAction('like')) {
      return;
    }

    try {
      // Check for mentions and replies
      if (this.twitterConfig.autonomous.replyToMentions) {
        await this.checkMentions();
      }

      // Engage with relevant content
      if (this.twitterConfig.autonomous.retweetRelevantContent) {
        await this.findRelevantContent();
      }

      runtimeLogger.debug('Completed engagement check', {
        source: 'twitter-extension',
      });
    } catch (error) {
      runtimeLogger.error('Failed to perform engagement check', {
        source: 'twitter-extension',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Monitor trending topics
   */
  private async monitorTrends(): Promise<void> {
    if (!this.twitterClient || !this.twitterConfig.autonomous.trendParticipation) {
      return;
    }

    try {
      // Get trending topics (using a default location - can be configured)
      const trends = await this.twitterClient.v1.trendsAvailable() as TwitterTrendsLocation[];
      
      if (trends.length > 0 && trends[0]) {
        const woeid = trends[0].woeid;
        const trendData = await this.twitterClient.v1.get(`trends/place.json?id=${woeid}`) as TwitterTrendsResult[];
        
        this.currentTrends = (trendData[0]?.trends || []).map((trend: TwitterTrendResponse) => ({
          name: trend.name,
          url: trend.url,
          query: trend.query || trend.name,
          tweetVolume: trend.tweet_volume || 0,
        }));

        // Find relevant trends based on personality topics
        const relevantTrends = this.findRelevantTrends();
        
        for (const trend of relevantTrends) {
          const action: TwitterAutonomousAction = {
            type: 'tweet',
            content: await this.generateTrendTweet(trend),
            reasoning: `Participating in trending topic: ${trend.name}`,
            confidence: 0.7,
            expectedOutcome: 'Increase visibility through trend participation',
          };

          this.actionQueue.push(action);
        }

        runtimeLogger.debug('Updated trending topics', {
          source: 'twitter-extension',
          trendsCount: this.currentTrends.length,
          relevantTrends: relevantTrends.length,
        } as TwitterLogContext);
      }
    } catch (error) {
      runtimeLogger.error('Failed to monitor trends', {
        source: 'twitter-extension',
      });
    }
  }

  /**
   * Track performance metrics
   */
  private async trackPerformance(): Promise<void> {
    if (!this.twitterClient || !this.twitterConfig.autonomous.trackPerformance) {
      return;
    }

    try {
      // Get recent tweets performance
      const recentTweets = await this.getRecentTweets();
      
      // Calculate performance metrics
      let totalLikes = 0;
      let totalRetweets = 0;
      let totalReplies = 0;
      
      for (const tweet of recentTweets) {
        totalLikes += tweet.publicMetrics.likeCount;
        totalRetweets += tweet.publicMetrics.retweetCount;
        totalReplies += tweet.publicMetrics.replyCount;
      }

      // Update content strategy based on performance
      if (recentTweets.length > 0) {
        this.contentStrategy.performanceMetrics.avgLikes = totalLikes / recentTweets.length;
        this.contentStrategy.performanceMetrics.avgRetweets = totalRetweets / recentTweets.length;
        this.contentStrategy.performanceMetrics.avgReplies = totalReplies / recentTweets.length;
      }

      // Adapt content strategy if enabled
      if (this.twitterConfig.autonomous.adaptContentStrategy) {
        await this.adaptContentStrategy();
      }

      runtimeLogger.debug('Updated performance metrics', {
        source: 'twitter-extension',
        avgLikes: this.contentStrategy.performanceMetrics.avgLikes,
        avgRetweets: this.contentStrategy.performanceMetrics.avgRetweets,
        avgReplies: this.contentStrategy.performanceMetrics.avgReplies,
      } as TwitterLogContext);
    } catch (error) {
      runtimeLogger.error('Failed to track performance', {
        source: 'twitter-extension',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Process action queue
   */
  private async processActionQueue(): Promise<void> {
    if (this.actionQueue.length === 0) {
      return;
    }

    const action = this.actionQueue.shift();
    if (!action) {
      return;
    }

    try {
      await this.executeTwitterAction(action);
    } catch (error) {
      runtimeLogger.error('Failed to execute Twitter action', {
        source: 'twitter-extension',
        actionType: action.type,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Execute a Twitter action
   */
  private async executeTwitterAction(action: TwitterAutonomousAction): Promise<void> {
    if (!this.twitterClient) {
      throw new Error('Twitter client not initialized');
    }

    switch (action.type) {
      case 'tweet':
        await this.executeTweet(action);
        break;
      case 'reply':
        await this.executeReply(action);
        break;
      case 'retweet':
        await this.executeRetweet(action);
        break;
      case 'like':
        await this.executeLike(action);
        break;
      case 'follow':
        await this.executeFollow(action);
        break;
      case 'unfollow':
        await this.executeUnfollow(action);
        break;
    }
  }

  /**
   * Execute tweet action
   */
  private async executeTweet(action: TwitterAutonomousAction): Promise<void> {
    if (!this.twitterClient || !this.canPerformAction('tweet')) {
      return;
    }

    try {
      const content = action.content || await this.generateTweetContent();
      const result = await this.twitterClient.v2.tweet(content) as TweetV2PostTweetResult;

      this.rateLimitTracker.tweets.count++;
      this.performanceMetrics.metrics.tweetsPosted++;

      runtimeLogger.info('Posted autonomous tweet', {
        source: 'twitter-extension',
        tweetId: result.data.id,
        content: content.substring(0, 50) + '...',
        reasoning: action.reasoning,
      } as TwitterLogContext);

      // Track the tweet for performance analysis
      this.recentTweets.push({
        id: result.data.id,
        text: content,
        authorId: 'self',
        createdAt: new Date().toISOString(),
        publicMetrics: {
          retweetCount: 0,
          likeCount: 0,
          replyCount: 0,
          quoteCount: 0,
        },
      });

      // Keep only recent tweets (last 50)
      if (this.recentTweets.length > 50) {
        this.recentTweets = this.recentTweets.slice(-50);
      }
    } catch (error) {
      runtimeLogger.error('Failed to post tweet', {
        source: 'twitter-extension',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Execute reply action
   */
  private async executeReply(action: TwitterAutonomousAction): Promise<void> {
    if (!this.twitterClient || !action.targetId || !action.content) {
      return;
    }

    try {
      await this.twitterClient.v2.reply(action.content, action.targetId);
      
      runtimeLogger.info('Posted reply', {
        source: 'twitter-extension',
        targetId: action.targetId,
        reasoning: action.reasoning,
      } as TwitterLogContext);
    } catch (error) {
      runtimeLogger.error('Failed to post reply', {
        source: 'twitter-extension',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Execute retweet action
   */
  private async executeRetweet(action: TwitterAutonomousAction): Promise<void> {
    if (!this.twitterClient || !action.targetId || !this.canPerformAction('retweet')) {
      return;
    }

    try {
      await this.twitterClient.v2.retweet('self', action.targetId);
      this.rateLimitTracker.retweets.count++;

      runtimeLogger.info('Retweeted content', {
        source: 'twitter-extension',
        targetId: action.targetId,
        reasoning: action.reasoning,
      } as TwitterLogContext);
    } catch (error) {
      runtimeLogger.error('Failed to retweet', {
        source: 'twitter-extension',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Execute like action
   */
  private async executeLike(action: TwitterAutonomousAction): Promise<void> {
    if (!this.twitterClient || !action.targetId || !this.canPerformAction('like')) {
      return;
    }

    try {
      await this.twitterClient.v2.like('self', action.targetId);
      this.rateLimitTracker.likes.count++;

      runtimeLogger.debug('Liked tweet', {
        source: 'twitter-extension',
        targetId: action.targetId,
      } as TwitterLogContext);
    } catch (error) {
      runtimeLogger.error('Failed to like tweet', {
        source: 'twitter-extension',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Execute follow action
   */
  private async executeFollow(action: TwitterAutonomousAction): Promise<void> {
    if (!this.twitterClient || !action.targetId || !this.canPerformAction('follow')) {
      return;
    }

    try {
      await this.twitterClient.v2.follow('self', action.targetId);
      this.rateLimitTracker.follows.count++;

      runtimeLogger.info('Followed user', {
        source: 'twitter-extension',
        targetId: action.targetId,
        reasoning: action.reasoning,
      } as TwitterLogContext);
    } catch (error) {
      runtimeLogger.error('Failed to follow user', {
        source: 'twitter-extension',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Execute unfollow action
   */
  private async executeUnfollow(action: TwitterAutonomousAction): Promise<void> {
    if (!this.twitterClient || !action.targetId) {
      return;
    }

    try {
      await this.twitterClient.v2.unfollow('self', action.targetId);

      runtimeLogger.info('Unfollowed user', {
        source: 'twitter-extension',
        targetId: action.targetId,
        reasoning: action.reasoning,
      } as TwitterLogContext);
    } catch (error) {
      runtimeLogger.error('Failed to unfollow user', {
        source: 'twitter-extension',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Generate tweet content based on personality and interests
   */
  private async generateTweetContent(): Promise<string> {
    if (!this.agent) {
      throw new Error('Agent not available for content generation');
    }

    try {
      // Get current emotion and personality context
      const emotionState = this.agent.emotion;
      // personality is defined in config.core.personality (string[]) or config.psyche.traits (string[])
      const personalityTraits = this.agent.config.core.personality || this.agent.config.psyche.traits || [];

      // Create context for content generation
      const context: ContentGenerationContext = {
        topics: this.contentStrategy.topics,
        emotion: emotionState?.current || 'neutral',
        personality: personalityTraits,
        recentTrends: this.currentTrends.slice(0, 3),
        performanceData: this.contentStrategy.performanceMetrics,
      };

      // Generate content using agent's cognition
      const prompt = this.buildContentPrompt(context);
      const thoughtContext: ThoughtContext = {
        events: [],
        memories: [],
        currentState: {
          goals: ['Generate engaging Twitter content'],
          context: {}
        },
        environment: {
          type: EnvironmentType.SOCIAL_PLATFORM,
          time: new Date()
        },
        goal: prompt
      };
      const response = await this.agent.cognition.think(this.agent, thoughtContext);

      // Ensure tweet is within character limit
      let content = response?.thoughts?.[0] || this.generateFallbackContent();
      if (content.length > 280) {
        content = content.substring(0, 277) + '...';
      }

      return content;
    } catch (error) {
      runtimeLogger.error('Failed to generate tweet content', {
        source: 'twitter-extension',
        error: error instanceof Error ? error.message : String(error),
      });
      
      return this.generateFallbackContent();
    }
  }

  /**
   * Build content generation prompt
   */
  private buildContentPrompt(context: ContentGenerationContext): string {
    return `Create a Twitter post that reflects your personality and interests. 

Context:
- Your main topics: ${context.topics.join(', ')}
- Current emotion: ${context.emotion}
- Recent trends: ${context.recentTrends.map((t: TwitterTrend) => t.name).join(', ')}
- Best performing topics: ${context.performanceData.bestPerformingTopics.join(', ')}

Guidelines:
- Keep it under 280 characters
- Be authentic to your personality
- Engage your audience
- Consider current trends if relevant
- Use a ${this.contentStrategy.toneOfVoice} tone

Generate a single tweet:`;
  }

  /**
   * Generate fallback content when AI generation fails
   */
  private generateFallbackContent(): string {
    const topics = this.contentStrategy.topics;
    const randomTopic = topics[Math.floor(Math.random() * topics.length)] || topics[0] || 'life';
    
    const templates = [
      `Thinking about ${randomTopic} today. What's your take on it?`,
      `Just had an interesting thought about ${randomTopic}...`,
      `${randomTopic} is fascinating. Anyone else exploring this?`,
      `Quick thought on ${randomTopic}: it's more complex than it seems.`,
      `Diving deep into ${randomTopic}. The possibilities are endless.`,
    ];

    return templates[Math.floor(Math.random() * templates.length)] || `Thinking about ${randomTopic} today.`;
  }

  /**
   * Generate trend-based tweet
   */
  private async generateTrendTweet(trend: TwitterTrend): Promise<string> {
    const templates = [
      `Interesting to see ${trend.name} trending. Here's my take...`,
      `${trend.name} is everywhere today. What do you think?`,
      `Thoughts on ${trend.name}? I find it fascinating.`,
      `${trend.name} got me thinking about...`,
    ];

    const template = templates[Math.floor(Math.random() * templates.length)] || `${trend.name} is trending.`;
    return template.length > 280 ? template.substring(0, 277) + '...' : template;
  }

  /**
   * Check for mentions and create reply actions
   */
  private async checkMentions(): Promise<void> {
    if (!this.twitterClient) {
      return;
    }

    try {
      // Get recent mentions
      const mentionsResponse = await this.twitterClient.v2.userMentionTimeline('self', {
        max_results: 10,
        'tweet.fields': ['author_id', 'created_at', 'public_metrics'],
      });
      const mentions: TimelineV2Result = {
        data: mentionsResponse.data?.data,
        meta: mentionsResponse.data?.meta,
      };

      for (const mention of mentions.data || []) {
        // Check if we should reply to this mention
        if (await this.shouldReplyToMention(mention)) {
          const replyContent = await this.generateReplyContent(mention);
          
          const action: TwitterAutonomousAction = {
            type: 'reply',
            content: replyContent,
            targetId: mention.id,
            reasoning: `Replying to mention from user ${mention.author_id}`,
            confidence: 0.8,
            expectedOutcome: 'Maintain engagement and build relationships',
          };

          this.actionQueue.push(action);
        }
      }
    } catch (error) {
      runtimeLogger.error('Failed to check mentions', {
        source: 'twitter-extension',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Find relevant content to engage with
   */
  private async findRelevantContent(): Promise<void> {
    if (!this.twitterClient) {
      return;
    }

    try {
      // Search for content related to our topics
      for (const topic of this.contentStrategy.topics.slice(0, 3)) {
        const searchResponse = await this.twitterClient.v2.search(topic, {
          max_results: 10,
          'tweet.fields': ['author_id', 'created_at', 'public_metrics'],
        });
        const searchResults: TimelineV2Result = {
          data: searchResponse.data?.data,
          meta: searchResponse.data?.meta,
        };

        for (const tweet of searchResults.data || []) {
          if (await this.shouldEngageWithTweet(tweet)) {
            // Randomly choose engagement type
            const engagementTypes = ['like', 'retweet'];
            const engagementType = engagementTypes[Math.floor(Math.random() * engagementTypes.length)] || 'like';

            const action: TwitterAutonomousAction = {
              type: engagementType as 'like' | 'retweet',
              targetId: tweet.id,
              reasoning: `Engaging with relevant content about ${topic}`,
              confidence: 0.6,
              expectedOutcome: 'Build community connections and visibility',
            };

            this.actionQueue.push(action);
          }
        }
      }
    } catch (error) {
      runtimeLogger.error('Failed to find relevant content', {
        source: 'twitter-extension',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Find relevant trends based on personality topics
   */
  private findRelevantTrends(): TwitterTrend[] {
    return this.currentTrends.filter(trend => {
      const trendName = trend.name.toLowerCase();
      return this.contentStrategy.topics.some(topic => 
        trendName.includes(topic.toLowerCase()) || 
        topic.toLowerCase().includes(trendName)
      );
    }).slice(0, 2); // Limit to 2 relevant trends
  }

  /**
   * Adapt content strategy based on performance
   */
  private async adaptContentStrategy(): Promise<void> {
    // Analyze recent tweet performance
    const recentPerformance = this.recentTweets.slice(-10);
    
    if (recentPerformance.length === 0) {
      return;
    }

    // Find best performing topics
    const topicPerformance = new Map<string, number>();
    
    for (const tweet of recentPerformance) {
      for (const topic of this.contentStrategy.topics) {
        if (tweet.text.toLowerCase().includes(topic.toLowerCase())) {
          const engagement = tweet.publicMetrics.likeCount + 
                           tweet.publicMetrics.retweetCount + 
                           tweet.publicMetrics.replyCount;
          
          topicPerformance.set(topic, (topicPerformance.get(topic) || 0) + engagement);
        }
      }
    }

    // Update best performing topics
    this.contentStrategy.performanceMetrics.bestPerformingTopics = 
      Array.from(topicPerformance.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([topic]) => topic);

    runtimeLogger.debug('Adapted content strategy', {
      source: 'twitter-extension',
    } as TwitterLogContext);
  }

  /**
   * Check if we should reply to a mention
   */
  private async shouldReplyToMention(mention: TweetV2): Promise<boolean> {
    // Basic checks
    if (!mention.author_id || mention.author_id === 'self') {
      return false;
    }

    // Check if we've already replied recently
    const relationship = this.relationships.get(mention.author_id);
    if (relationship?.lastInteraction && 
        Date.now() - relationship.lastInteraction.getTime() < 60 * 60 * 1000) {
      return false;
    }

    // Check rate limits
    if (!this.canPerformAction('reply')) {
      return false;
    }

    return true;
  }

  /**
   * Check if we should engage with a tweet
   */
  private async shouldEngageWithTweet(tweet: TweetV2): Promise<boolean> {
    // Don't engage with our own tweets
    if (tweet.author_id === 'self') {
      return false;
    }

    // Check engagement quality (avoid low-quality content)
    const engagement = tweet.public_metrics?.like_count || 0;
    if (engagement < 1) {
      return false;
    }

    // Random engagement to avoid being too predictable
    return Math.random() < 0.3; // 30% chance to engage
  }

  /**
   * Generate reply content
   */
  private async generateReplyContent(_mention: TweetV2): Promise<string> {
    // Simple reply generation - in a full implementation, this would use the agent's cognition
    const templates = [
      "Thanks for the mention! Interesting perspective.",
      "Great point! I've been thinking about this too.",
      "Appreciate you sharing this. What's your take?",
      "This is fascinating. Thanks for bringing it up!",
      "Good question! Let me think about that...",
    ];

    const template = templates[Math.floor(Math.random() * templates.length)] || templates[0];
    return template as string;
  }


  /**
   * Update rate limit trackers
   */
  private async updateRateLimits(): Promise<void> {
    const now = Date.now();

    // Reset counters if time windows have passed
    if (now > this.rateLimitTracker.tweets.resetTime) {
      this.rateLimitTracker.tweets.count = 0;
      this.rateLimitTracker.tweets.resetTime = now + 15 * 60 * 1000;
    }

    if (now > this.rateLimitTracker.follows.resetTime) {
      this.rateLimitTracker.follows.count = 0;
      this.rateLimitTracker.follows.resetTime = now + 24 * 60 * 60 * 1000;
    }

    if (now > this.rateLimitTracker.likes.resetTime) {
      this.rateLimitTracker.likes.count = 0;
      this.rateLimitTracker.likes.resetTime = now + 15 * 60 * 1000;
    }

    if (now > this.rateLimitTracker.retweets.resetTime) {
      this.rateLimitTracker.retweets.count = 0;
      this.rateLimitTracker.retweets.resetTime = now + 15 * 60 * 1000;
    }
  }

  /**
   * Handle message events
   */
  private async handleMessageEvent(event: AgentEvent): Promise<void> {
    // If the message is Twitter-related, we might want to create a tweet about it
    if (event.data && typeof event.data === 'object' && 'platform' in event.data) {
      if (event.data['platform'] !== 'twitter') {
        // Cross-platform content sharing
        const action: TwitterAutonomousAction = {
          type: 'tweet',
          reasoning: 'Sharing interesting content from another platform',
          confidence: 0.6,
          expectedOutcome: 'Cross-platform engagement',
        };

        this.actionQueue.push(action);
      }
    }
  }

  /**
   * Handle emotion change events
   */
  private async handleEmotionChange(event: AgentEvent): Promise<void> {
    // Adjust content strategy based on emotion
    if (event.data && typeof event.data === 'object' && 'emotion' in event.data) {
      const emotion = event.data['emotion'] as string;
      
      // Adjust tone of voice based on emotion
      switch (emotion) {
        case 'happy':
          this.contentStrategy.toneOfVoice = 'inspirational';
          break;
        case 'confident':
          this.contentStrategy.toneOfVoice = 'professional';
          break;
        case 'sad':
          this.contentStrategy.toneOfVoice = 'empathetic';
          break;
        default:
          this.contentStrategy.toneOfVoice = 'casual';
      }

      runtimeLogger.debug('Adjusted content strategy for emotion change', {
        source: 'twitter-extension',
      } as TwitterLogContext);
    }
  }

  /**
   * Handle goal update events
   */
  private async handleGoalUpdate(event: AgentEvent): Promise<void> {
    // Update content topics based on new goals
    if (event.data && typeof event.data === 'object' && 'goals' in event.data) {
      // This would extract topics from goals and update content strategy
      runtimeLogger.debug('Goal update received, may adjust content strategy', {
        source: 'twitter-extension',
      });
    }
  }

  /**
   * Verify Twitter API credentials
   */
  private async verifyCredentials(): Promise<void> {
    if (!this.twitterClient) {
      throw new Error('Twitter client not initialized');
    }

    try {
      const user = await this.twitterClient.v2.me() as UserV2Result;
      
      runtimeLogger.info('Twitter credentials verified', {
        source: 'twitter-extension',
        userId: user.data.id,
        username: user.data.username,
      } as TwitterLogContext);
    } catch (error) {
      runtimeLogger.error('Twitter credential verification failed', {
        source: 'twitter-extension',
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error('Invalid Twitter API credentials');
    }
  }

  /**
   * Load existing relationships from memory
   */
  private async loadRelationships(): Promise<void> {
    // In a full implementation, this would load from the agent's memory system
    // For now, we'll initialize with empty relationships
    this.relationships.clear();
    
    runtimeLogger.debug('Loaded Twitter relationships', {
      source: 'twitter-extension',
    } as TwitterLogContext);
  }

  /**
   * Load performance data from memory
   */
  private async loadPerformanceData(): Promise<void> {
    // In a full implementation, this would load historical performance data
    // For now, we'll use default values
    
    runtimeLogger.debug('Loaded Twitter performance data', {
      source: 'twitter-extension',
    } as TwitterLogContext);
  }

  /**
   * Get recent tweets for performance analysis
   */
  private async getRecentTweets(): Promise<TwitterTweet[]> {
    if (!this.twitterClient) {
      return [];
    }

    try {
      const timelineResponse = await this.twitterClient.v2.userTimeline('self', {
        max_results: 20,
        'tweet.fields': ['created_at', 'public_metrics'],
      });
      const timeline: TimelineV2Result = {
        data: timelineResponse.data?.data,
        meta: timelineResponse.data?.meta,
      };

      return (timeline.data || []).map(tweet => ({
        id: tweet.id,
        text: tweet.text,
        authorId: 'self',
        createdAt: tweet.created_at || new Date().toISOString(),
        publicMetrics: {
          retweetCount: tweet.public_metrics?.retweet_count || 0,
          likeCount: tweet.public_metrics?.like_count || 0,
          replyCount: tweet.public_metrics?.reply_count || 0,
          quoteCount: tweet.public_metrics?.quote_count || 0,
        },
      }));
    } catch (error) {
      runtimeLogger.error('Failed to get recent tweets', {
        source: 'twitter-extension',
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Get extension status and metrics
   */
  public getTwitterStatus() {
    return {
      autonomousMode: this.autonomousMode,
      status: this.status,
      queueLength: this.actionQueue.length,
      rateLimits: this.rateLimitTracker,
      performanceMetrics: this.performanceMetrics,
      relationshipCount: this.relationships.size,
      contentStrategy: this.contentStrategy,
    };
  }

  /**
   * Enable/disable autonomous mode
   */
  public async setAutonomousMode(enabled: boolean): Promise<void> {
    if (enabled === this.autonomousMode) {
      return;
    }

    this.autonomousMode = enabled;
    this.twitterConfig.autonomous.enabled = enabled;

    if (enabled && this.status === ExtensionStatus.ACTIVE) {
      await this.startAutonomousMode();
    } else {
      await this.stopAutonomousMode();
    }

    runtimeLogger.info('Twitter autonomous mode changed', {
      source: 'twitter-extension',
    } as TwitterLogContext);
  }

  /**
   * Manually trigger a tweet
   */
  public async triggerTweet(content?: string): Promise<void> {
    const action: TwitterAutonomousAction = {
      type: 'tweet',
      ...(content && { content }),
      reasoning: 'Manually triggered tweet',
      confidence: 1.0,
      expectedOutcome: 'Direct user-requested content',
    };

    this.actionQueue.push(action);
  }

  /**
   * Get current trends
   */
  public getCurrentTrends(): TwitterTrend[] {
    return [...this.currentTrends];
  }

  /**
   * Get performance analytics
   */
  public getPerformanceAnalytics(): TwitterPerformanceAnalytics {
    return { ...this.performanceMetrics };
  }

  /**
   * Get content strategy
   */
  public getContentStrategy(): TwitterContentStrategy {
    return { ...this.contentStrategy };
  }

  /**
   * Get Twitter client
   */
  public getTwitterClient(): TwitterApi | undefined {
    return this.twitterClient;
  }

  /**
   * Get extension configuration
   */
  public getConfig(): TwitterConfig {
    return { ...this.twitterConfig };
  }

  /**
   * Update current trends
   */
  public updateCurrentTrends(trends: TwitterTrend[]): void {
    this.currentTrends = trends;
  }

  /**
   * Queue an autonomous action
   */
  public queueAction(action: TwitterAutonomousAction): void {
    this.actionQueue.push(action);
  }

  /**
   * Get relationship data for a user
   */
  public getRelationship(userId: string): TwitterRelationship | undefined {
    return this.relationships.get(userId);
  }

  /**
   * Update relationship data
   */
  public updateRelationship(userId: string, relationship: Partial<TwitterRelationship>): void {
    const existing = this.relationships.get(userId);
    const newRelationship: TwitterRelationship = {
      id: userId,
      userId: userId,
      username: existing?.username || '',
      relationshipType: existing?.relationshipType || 'none',
      interactionHistory: existing?.interactionHistory || [],
      engagementScore: existing?.engagementScore || 0,
      topics: existing?.topics || [],
      influence: existing?.influence || 0,
      ...relationship,
    };
    this.relationships.set(userId, newRelationship);
  }

  /**
   * Check if performance tracking is enabled
   */
  public isTrackingPerformance(): boolean {
    return this.twitterConfig.autonomous.trackPerformance;
  }

  /**
   * Track a tweet for performance analysis
   */
  public trackTweet(tweet: TwitterTweet): void {
    this.recentTweets.push(tweet);
    // Keep only last 100 tweets
    if (this.recentTweets.length > 100) {
      this.recentTweets.shift();
    }
  }

  /**
   * Check if we can perform an action based on rate limits
   */
  public canPerformAction(actionType: 'tweet' | 'follow' | 'like' | 'retweet' | 'reply'): boolean {
    const now = Date.now();
    const tracker = this.rateLimitTracker;

    // Reset counters if needed
    if (now > tracker.tweets.resetTime) {
      tracker.tweets.count = 0;
      tracker.tweets.resetTime = now + 15 * 60 * 1000;
    }
    if (now > tracker.follows.resetTime) {
      tracker.follows.count = 0;
      tracker.follows.resetTime = now + 24 * 60 * 60 * 1000;
    }
    if (now > tracker.likes.resetTime) {
      tracker.likes.count = 0;
      tracker.likes.resetTime = now + 15 * 60 * 1000;
    }
    if (now > tracker.retweets.resetTime) {
      tracker.retweets.count = 0;
      tracker.retweets.resetTime = now + 15 * 60 * 1000;
    }

    // Check limits
    switch (actionType) {
      case 'tweet':
      case 'reply':
        return tracker.tweets.count < 50; // 50 tweets per 15 minutes
      case 'follow':
        return tracker.follows.count < 400; // 400 follows per day
      case 'like':
        return tracker.likes.count < 1000; // 1000 likes per 15 minutes
      case 'retweet':
        return tracker.retweets.count < 300; // 300 retweets per 15 minutes
      default:
        return true;
    }
  }

  /**
   * Get the current action queue length
   */
  public getQueueLength(): number {
    return this.actionQueue.length;
  }

  /**
   * Update performance metrics
   */
  public updatePerformanceMetrics(metrics: Partial<TwitterContentStrategy['performanceMetrics']>): void {
    this.contentStrategy.performanceMetrics = {
      ...this.contentStrategy.performanceMetrics,
      ...metrics,
    };
  }
}

/**
 * Factory function to create Twitter extension
 */
export function createTwitterExtension(config: TwitterConfig): TwitterExtension {
  return new TwitterExtension(config);
}

export default TwitterExtension;