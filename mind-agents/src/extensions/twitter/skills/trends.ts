/**
 * Trends Monitoring Skill
 *
 * Handles trend discovery, analysis, and participation
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
  TwitterTrend,
  TwitterTrendsLocation,
  TwitterTrendsResult,
  TwitterTrendResponse,
  TwitterAutonomousAction,
} from '../types';

export class TrendsSkill extends BaseTwitterSkill {
  /**
   * Get all trend-related actions
   */
  getActions(): Record<string, ExtensionAction> {
    return {
      get_trends: {
        name: 'get_trends',
        description: 'Get current trending topics',
        category: ActionCategory.DISCOVERY,
        parameters: {
          location: 'string?',
          woeid: 'number?',
        },
        execute: async (
          agent: Agent,
          params: SkillParameters
        ): Promise<ActionResult> => {
          return this.getTrends(agent, params);
        },
      },
      get_trend_locations: {
        name: 'get_trend_locations',
        description: 'Get available trend locations',
        category: ActionCategory.DISCOVERY,
        parameters: {},
        execute: async (
          agent: Agent,
          params: SkillParameters
        ): Promise<ActionResult> => {
          return this.getTrendLocations(agent, params);
        },
      },
      analyze_trends: {
        name: 'analyze_trends',
        description: 'Analyze trends for relevance to agent interests',
        category: ActionCategory.ANALYSIS,
        parameters: {
          participateIfRelevant: 'boolean?',
        },
        execute: async (
          agent: Agent,
          params: SkillParameters
        ): Promise<ActionResult> => {
          return this.analyzeTrends(agent, params);
        },
      },
      participate_in_trend: {
        name: 'participate_in_trend',
        description: 'Create content to participate in a trend',
        category: ActionCategory.SOCIAL,
        parameters: {
          trendName: 'string',
          generateContent: 'boolean?',
        },
        execute: async (
          agent: Agent,
          params: SkillParameters
        ): Promise<ActionResult> => {
          return this.participateInTrend(agent, params);
        },
      },
    };
  }

  /**
   * Get current trending topics
   */
  private async getTrends(
    agent: Agent,
    params: SkillParameters
  ): Promise<ActionResult> {
    try {
      const client = this.ensureTwitterClient();
      const woeid = params['woeid'] ? Number(params['woeid']) : 1; // Default to worldwide

      const trendData = await client.v1.get(`trends/place.json?id=${woeid}`) as TwitterTrendsResult[];
      
      const trends: TwitterTrend[] = (trendData[0]?.trends || []).map((trend: TwitterTrendResponse) => ({
        name: trend.name,
        url: trend.url,
        query: trend.query || trend.name,
        ...(trend.tweet_volume !== null && trend.tweet_volume !== undefined && { tweetVolume: trend.tweet_volume }),
      }));

      // Update extension's current trends
      this.extension.updateCurrentTrends(trends);

      this.log('debug', 'Retrieved trends', {
        agentId: agent.id,
        trendsCount: trends.length,
      });

      return this.successResult({
        trends,
        location: trendData[0]?.locations?.[0] || { name: 'Worldwide', woeid },
        timestamp: new Date(),
      });
    } catch (error) {
      this.log('error', 'Failed to get trends', {
        agentId: agent.id,
      });
      return this.errorResult(error as Error);
    }
  }

  /**
   * Get available trend locations
   */
  private async getTrendLocations(
    agent: Agent,
    _params: SkillParameters
  ): Promise<ActionResult> {
    try {
      const client = this.ensureTwitterClient();
      const locations = await client.v1.trendsAvailable() as TwitterTrendsLocation[];

      return this.successResult({
        locations,
        count: locations.length,
        timestamp: new Date(),
      });
    } catch (error) {
      this.log('error', 'Failed to get trend locations', {
        agentId: agent.id,
      });
      return this.errorResult(error as Error);
    }
  }

  /**
   * Analyze trends for relevance
   */
  private async analyzeTrends(
    agent: Agent,
    params: SkillParameters
  ): Promise<ActionResult> {
    try {
      const participateIfRelevant = params['participateIfRelevant'] === true;
      
      // Get current trends if not already loaded
      if (this.extension.getCurrentTrends().length === 0) {
        await this.getTrends(agent, {});
      }

      const currentTrends = this.extension.getCurrentTrends();
      const relevantTrends = this.findRelevantTrends(currentTrends);

      // Queue participation actions if enabled
      if (participateIfRelevant && this.isAutonomousMode()) {
        for (const trend of relevantTrends) {
          const action: TwitterAutonomousAction = {
            type: 'tweet',
            content: await this.generateTrendTweet(trend),
            reasoning: `Participating in trending topic: ${trend.name}`,
            confidence: 0.7,
            expectedOutcome: 'Increase visibility through trend participation',
          };

          this.extension.queueAction(action);
        }
      }

      this.log('debug', 'Analyzed trends', {
        agentId: agent.id,
        trendsCount: currentTrends.length,
        relevantTrends: relevantTrends.length,
      });

      return this.successResult({
        totalTrends: currentTrends.length,
        relevantTrends,
        queued: participateIfRelevant && relevantTrends.length > 0,
        timestamp: new Date(),
      });
    } catch (error) {
      this.log('error', 'Failed to analyze trends', {
        agentId: agent.id,
      });
      return this.errorResult(error as Error);
    }
  }

  /**
   * Participate in a specific trend
   */
  private async participateInTrend(
    agent: Agent,
    params: SkillParameters
  ): Promise<ActionResult> {
    try {
      const trendName = String(params['trendName']);
      const generateContent = params['generateContent'] !== false;

      let content: string;
      if (generateContent) {
        // Find the trend object
        const trend = this.extension.getCurrentTrends().find(t => 
          t.name === trendName || t.query === trendName
        );

        content = await this.generateTrendTweet(trend || { 
          name: trendName, 
          url: '',
          query: trendName 
        });
      } else {
        content = `Thoughts on ${trendName}`;
      }

      // Queue the tweet action
      const action: TwitterAutonomousAction = {
        type: 'tweet',
        content,
        reasoning: `User-requested participation in trend: ${trendName}`,
        confidence: 0.9,
        expectedOutcome: 'Engage with trending topic as requested',
      };

      this.extension.queueAction(action);

      return this.successResult({
        trend: trendName,
        content,
        queued: true,
        timestamp: new Date(),
      });
    } catch (error) {
      this.log('error', 'Failed to participate in trend', {
        agentId: agent.id,
      });
      return this.errorResult(error as Error);
    }
  }

  /**
   * Find relevant trends based on personality topics
   */
  private findRelevantTrends(trends: TwitterTrend[]): TwitterTrend[] {
    const contentStrategy = this.extension.getContentStrategy();
    
    return trends.filter(trend => {
      const trendName = trend.name.toLowerCase();
      return contentStrategy.topics.some(topic => 
        trendName.includes(topic.toLowerCase()) || 
        topic.toLowerCase().includes(trendName)
      );
    }).slice(0, 2); // Limit to 2 relevant trends
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

    const template = templates[Math.floor(Math.random() * templates.length)];
    return template ? (template.length > 280 ? template.substring(0, 277) + '...' : template) : `Thoughts on ${trend.name}`;
  }
}