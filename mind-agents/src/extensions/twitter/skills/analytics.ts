/**
 * Analytics Skill
 *
 * Handles performance tracking, metrics analysis, and content strategy optimization
 */

import {
  ExtensionAction,
  Agent,
  ActionResult,
  ActionCategory,
} from '../../../types/agent';
import { SkillParameters } from '../../../types/common';
import { BaseTwitterSkill } from './base';
import {
  TwitterTweet,
  TwitterPerformanceAnalytics,
  TimelineV2Result,
  TwitterContentStrategy,
} from '../types';

export class AnalyticsSkill extends BaseTwitterSkill {
  /**
   * Get all analytics-related actions
   */
  getActions(): Record<string, ExtensionAction> {
    return {
      get_performance_metrics: {
        name: 'get_performance_metrics',
        description: 'Get current performance metrics',
        category: ActionCategory.ANALYSIS,
        parameters: {
          period: 'string?',
        },
        execute: async (
          agent: Agent,
          params: SkillParameters
        ): Promise<ActionResult> => {
          return this.getPerformanceMetrics(agent, params);
        },
      },
      analyze_tweet_performance: {
        name: 'analyze_tweet_performance',
        description: 'Analyze performance of recent tweets',
        category: ActionCategory.ANALYSIS,
        parameters: {
          limit: 'number?',
          adaptStrategy: 'boolean?',
        },
        execute: async (
          agent: Agent,
          params: SkillParameters
        ): Promise<ActionResult> => {
          return this.analyzeTweetPerformance(agent, params);
        },
      },
      get_best_performing_content: {
        name: 'get_best_performing_content',
        description: 'Get best performing tweets and topics',
        category: ActionCategory.ANALYSIS,
        parameters: {
          metric: 'string?',
          limit: 'number?',
        },
        execute: async (
          agent: Agent,
          params: SkillParameters
        ): Promise<ActionResult> => {
          return this.getBestPerformingContent(agent, params);
        },
      },
      adapt_content_strategy: {
        name: 'adapt_content_strategy',
        description: 'Adapt content strategy based on performance',
        category: ActionCategory.PLANNING,
        parameters: {
          autoApply: 'boolean?',
        },
        execute: async (
          agent: Agent,
          params: SkillParameters
        ): Promise<ActionResult> => {
          return this.adaptContentStrategy(agent, params);
        },
      },
      get_engagement_insights: {
        name: 'get_engagement_insights',
        description: 'Get insights about audience engagement',
        category: ActionCategory.ANALYSIS,
        parameters: {},
        execute: async (
          agent: Agent,
          params: SkillParameters
        ): Promise<ActionResult> => {
          return this.getEngagementInsights(agent, params);
        },
      },
    };
  }

  /**
   * Get current performance metrics
   */
  private async getPerformanceMetrics(
    agent: Agent,
    params: SkillParameters
  ): Promise<ActionResult> {
    try {
      const period = params['period'] ? String(params['period']) : 'day';
      const metrics = this.extension.getPerformanceAnalytics();

      // Update period if different
      if (metrics.period !== period) {
        metrics.period = period as 'hour' | 'day' | 'week' | 'month';
      }

      return this.successResult({
        metrics: metrics.metrics,
        period: metrics.period,
        insights: metrics.insights,
        recommendations: metrics.recommendations,
        timestamp: new Date(),
      });
    } catch (error) {
      this.log('error', 'Failed to get performance metrics', {
        agentId: agent.id,
      });
      return this.errorResult(error as Error);
    }
  }

  /**
   * Analyze performance of recent tweets
   */
  private async analyzeTweetPerformance(
    agent: Agent,
    params: SkillParameters
  ): Promise<ActionResult> {
    try {
      const limit = params['limit'] ? Number(params['limit']) : 20;
      const adaptStrategy = params['adaptStrategy'] === true;

      // Get recent tweets
      const recentTweets = await this.getRecentTweets(limit);
      
      // Calculate performance metrics
      let totalLikes = 0;
      let totalRetweets = 0;
      let totalReplies = 0;
      
      for (const tweet of recentTweets) {
        totalLikes += tweet.publicMetrics.likeCount;
        totalRetweets += tweet.publicMetrics.retweetCount;
        totalReplies += tweet.publicMetrics.replyCount;
      }

      const avgMetrics = recentTweets.length > 0 ? {
        avgLikes: totalLikes / recentTweets.length,
        avgRetweets: totalRetweets / recentTweets.length,
        avgReplies: totalReplies / recentTweets.length,
      } : {
        avgLikes: 0,
        avgRetweets: 0,
        avgReplies: 0,
      };

      // Update content strategy performance metrics
      const strategy = this.extension.getContentStrategy();
      const updatedMetrics = {
        ...strategy.performanceMetrics,
        ...avgMetrics,
      };
      // Update the performance metrics in the extension
      this.extension.updatePerformanceMetrics(updatedMetrics);

      // Adapt strategy if requested
      if (adaptStrategy && this.config.autonomous.adaptContentStrategy) {
        await this.performStrategyAdaptation(recentTweets);
      }

      this.log('debug', 'Analyzed tweet performance', {
        agentId: agent.id,
        avgLikes: avgMetrics.avgLikes,
        avgRetweets: avgMetrics.avgRetweets,
        avgReplies: avgMetrics.avgReplies,
      });

      return this.successResult({
        tweetsAnalyzed: recentTweets.length,
        metrics: avgMetrics,
        strategyAdapted: adaptStrategy,
        timestamp: new Date(),
      });
    } catch (error) {
      this.log('error', 'Failed to analyze tweet performance', {
        agentId: agent.id,
      });
      return this.errorResult(error as Error);
    }
  }

  /**
   * Get best performing content
   */
  private async getBestPerformingContent(
    agent: Agent,
    params: SkillParameters
  ): Promise<ActionResult> {
    try {
      const metric = params['metric'] ? String(params['metric']) : 'engagement';
      const limit = params['limit'] ? Number(params['limit']) : 10;

      const recentTweets = await this.getRecentTweets(50);
      
      // Sort tweets by the specified metric
      const sortedTweets = [...recentTweets].sort((a, b) => {
        switch (metric) {
          case 'likes':
            return b.publicMetrics.likeCount - a.publicMetrics.likeCount;
          case 'retweets':
            return b.publicMetrics.retweetCount - a.publicMetrics.retweetCount;
          case 'replies':
            return b.publicMetrics.replyCount - a.publicMetrics.replyCount;
          case 'engagement':
          default:
            const engagementA = a.publicMetrics.likeCount + a.publicMetrics.retweetCount + a.publicMetrics.replyCount;
            const engagementB = b.publicMetrics.likeCount + b.publicMetrics.retweetCount + b.publicMetrics.replyCount;
            return engagementB - engagementA;
        }
      });

      const topTweets = sortedTweets.slice(0, limit);

      // Extract topics from best performing tweets
      const topicPerformance = this.analyzeTopicPerformance(topTweets);

      return this.successResult({
        topTweets: topTweets.map(t => ({
          id: t.id,
          text: t.text.substring(0, 100) + '...',
          metrics: t.publicMetrics,
        })),
        topPerformingTopics: topicPerformance,
        metric,
        timestamp: new Date(),
      });
    } catch (error) {
      this.log('error', 'Failed to get best performing content', {
        agentId: agent.id,
      });
      return this.errorResult(error as Error);
    }
  }

  /**
   * Adapt content strategy based on performance
   */
  private async adaptContentStrategy(
    agent: Agent,
    params: SkillParameters
  ): Promise<ActionResult> {
    try {
      const autoApply = params['autoApply'] === true;

      // Get recent performance data
      const recentTweets = await this.getRecentTweets(50);
      
      // Analyze and generate recommendations
      const recommendations = await this.performStrategyAdaptation(recentTweets);

      // Apply changes if requested
      if (autoApply) {
        const updatedMetrics: Partial<TwitterContentStrategy['performanceMetrics']> = {};
        if (recommendations.bestPerformingTopics.length > 0) {
          updatedMetrics.bestPerformingTopics = recommendations.bestPerformingTopics;
        }
        if (recommendations.optimalLength) {
          updatedMetrics.optimalLength = recommendations.optimalLength;
        }
        this.extension.updatePerformanceMetrics(updatedMetrics);
      }

      return this.successResult({
        recommendations,
        applied: autoApply,
        timestamp: new Date(),
      });
    } catch (error) {
      this.log('error', 'Failed to adapt content strategy', {
        agentId: agent.id,
      });
      return this.errorResult(error as Error);
    }
  }

  /**
   * Get engagement insights
   */
  private async getEngagementInsights(
    agent: Agent,
    _params: SkillParameters
  ): Promise<ActionResult> {
    try {
      const recentTweets = await this.getRecentTweets(50);
      const analytics = this.extension.getPerformanceAnalytics();

      // Calculate engagement patterns
      const engagementByHour = this.calculateEngagementByHour(recentTweets);
      const engagementByLength = this.calculateEngagementByLength(recentTweets);

      const insights = [
        `Average engagement rate: ${analytics.metrics.engagementRate.toFixed(2)}%`,
        `Best posting times: ${engagementByHour.bestHours.join(', ')}`,
        `Optimal tweet length: ${engagementByLength.optimalLength} characters`,
        `Top performing topics: ${analytics.metrics.topHashtags.join(', ')}`,
      ];

      return this.successResult({
        insights,
        engagementByHour,
        engagementByLength,
        totalTweetsAnalyzed: recentTweets.length,
        timestamp: new Date(),
      });
    } catch (error) {
      this.log('error', 'Failed to get engagement insights', {
        agentId: agent.id,
      });
      return this.errorResult(error as Error);
    }
  }

  /**
   * Get recent tweets for analysis
   */
  private async getRecentTweets(limit: number = 20): Promise<TwitterTweet[]> {
    try {
      const client = this.ensureTwitterClient();
      const timeline = await client.v2.userTimeline('self', {
        max_results: Math.min(limit, 100),
        'tweet.fields': ['created_at', 'public_metrics'],
      });

      const tweets = timeline.data?.data || [];
      return tweets.map((tweet: any) => ({
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
      this.log('error', 'Failed to get recent tweets for analytics');
      return [];
    }
  }

  /**
   * Perform strategy adaptation based on tweet performance
   */
  private async performStrategyAdaptation(tweets: TwitterTweet[]) {
    const topicPerformance = this.analyzeTopicPerformance(tweets);
    const lengthAnalysis = this.calculateEngagementByLength(tweets);
    
    return {
      bestPerformingTopics: topicPerformance.slice(0, 5),
      optimalLength: lengthAnalysis.optimalLength,
      recommendations: [
        `Focus on topics: ${topicPerformance.slice(0, 3).join(', ')}`,
        `Target tweet length: ${lengthAnalysis.optimalLength} characters`,
      ],
    };
  }

  /**
   * Analyze topic performance from tweets
   */
  private analyzeTopicPerformance(tweets: TwitterTweet[]): string[] {
    const topicPerformance = new Map<string, number>();
    const topics = this.extension.getContentStrategy().topics;
    
    for (const tweet of tweets) {
      for (const topic of topics) {
        if (tweet.text.toLowerCase().includes(topic.toLowerCase())) {
          const engagement = tweet.publicMetrics.likeCount + 
                           tweet.publicMetrics.retweetCount + 
                           tweet.publicMetrics.replyCount;
          
          topicPerformance.set(topic, (topicPerformance.get(topic) || 0) + engagement);
        }
      }
    }

    return Array.from(topicPerformance.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([topic]) => topic);
  }

  /**
   * Calculate engagement by hour
   */
  private calculateEngagementByHour(tweets: TwitterTweet[]) {
    const hourlyEngagement = new Map<number, number>();
    
    for (const tweet of tweets) {
      const hour = new Date(tweet.createdAt).getHours();
      const engagement = tweet.publicMetrics.likeCount + 
                        tweet.publicMetrics.retweetCount + 
                        tweet.publicMetrics.replyCount;
      
      hourlyEngagement.set(hour, (hourlyEngagement.get(hour) || 0) + engagement);
    }

    const sortedHours = Array.from(hourlyEngagement.entries())
      .sort((a, b) => b[1] - a[1]);

    return {
      bestHours: sortedHours.slice(0, 3).map(([hour]) => `${hour}:00`),
      engagement: Object.fromEntries(hourlyEngagement),
    };
  }

  /**
   * Calculate engagement by tweet length
   */
  private calculateEngagementByLength(tweets: TwitterTweet[]) {
    let totalEngagement = 0;
    let totalLength = 0;
    let bestTweet = tweets[0];
    let bestEngagement = 0;

    for (const tweet of tweets) {
      const engagement = tweet.publicMetrics.likeCount + 
                        tweet.publicMetrics.retweetCount + 
                        tweet.publicMetrics.replyCount;
      
      totalEngagement += engagement;
      totalLength += tweet.text.length * engagement; // Weight by engagement

      if (engagement > bestEngagement) {
        bestEngagement = engagement;
        bestTweet = tweet;
      }
    }

    const optimalLength = totalEngagement > 0 
      ? Math.round(totalLength / totalEngagement) 
      : 140;

    return {
      optimalLength: Math.min(optimalLength, 200), // Cap at 200 for quality
      bestTweetLength: bestTweet?.text.length || 140,
    };
  }

  /**
   * Generate comprehensive performance analytics
   */
  private generatePerformanceAnalytics(tweets: TwitterTweet[]): TwitterPerformanceAnalytics {
    const now = new Date();
    const totalEngagements = tweets.reduce((sum, tweet) => 
      sum + tweet.publicMetrics.likeCount + tweet.publicMetrics.retweetCount + tweet.publicMetrics.replyCount, 0
    );
    
    const topHashtags = this.extractTopHashtags(tweets);
    const hourlyData = this.calculateEngagementByHour(tweets);

    return {
      period: 'week',
      metrics: {
        tweetsPosted: tweets.length,
        totalImpressions: tweets.length * 1000, // Estimated
        totalEngagements: totalEngagements,
        engagementRate: tweets.length > 0 ? totalEngagements / (tweets.length * 1000) : 0,
        followerGrowth: 0, // Would need historical data
        topPerformingTweets: tweets.slice(0, 5),
        topHashtags: topHashtags,
        bestPostingTimes: hourlyData.bestHours,
      },
      insights: [
        `Average engagement per tweet: ${Math.round(totalEngagements / tweets.length)}`,
        `Best posting times: ${hourlyData.bestHours.join(', ')}`,
        `Top hashtags: ${topHashtags.slice(0, 3).join(', ')}`,
      ],
      recommendations: [
        `Post during your peak engagement hours: ${hourlyData.bestHours[0]}`,
        `Use trending hashtags to increase visibility`,
        `Maintain consistent posting schedule`,
      ],
    };
  }

  /**
   * Extract top hashtags from tweets
   */
  private extractTopHashtags(tweets: TwitterTweet[]): string[] {
    const hashtagCounts: Record<string, number> = {};
    
    for (const tweet of tweets) {
      const hashtags = tweet.text.match(/#\w+/g) || [];
      for (const hashtag of hashtags) {
        hashtagCounts[hashtag] = (hashtagCounts[hashtag] || 0) + 1;
      }
    }
    
    return Object.entries(hashtagCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([tag]) => tag);
  }

  /**
   * Convert timeline result to analytics data
   */
  private async convertTimelineToAnalytics(timeline: TimelineV2Result): Promise<TwitterPerformanceAnalytics> {
    const tweets = this.timelineToTweets(timeline);
    return this.generatePerformanceAnalytics(tweets);
  }

  /**
   * Convert timeline result to tweet array
   */
  private timelineToTweets(timeline: TimelineV2Result): TwitterTweet[] {
    if (!timeline.data) return [];
    
    return timeline.data.map(tweet => ({
      id: tweet.id,
      text: tweet.text,
      authorId: tweet.author_id || 'self',
      createdAt: tweet.created_at || new Date().toISOString(),
      publicMetrics: {
        retweetCount: tweet.public_metrics?.retweet_count || 0,
        likeCount: tweet.public_metrics?.like_count || 0,
        replyCount: tweet.public_metrics?.reply_count || 0,
        quoteCount: tweet.public_metrics?.quote_count || 0,
      },
    }));
  }
}