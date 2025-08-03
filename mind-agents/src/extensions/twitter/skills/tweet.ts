/**
 * Tweet Management Skill
 *
 * Handles tweet creation, deletion, and content generation
 */

import {
  ExtensionAction,
  Agent,
  ActionResult,
  ActionCategory,
  ThoughtContext,
  EnvironmentType,
} from '../../../types/agent';
import { SkillParameters } from '../../../types/common';
import { BaseTwitterSkill } from './base';
import {
  TwitterTweet,
  TwitterAutonomousAction,
  TweetV2PostTweetResult,
  ContentGenerationContext,
} from '../types';

export class TweetSkill extends BaseTwitterSkill {
  /**
   * Get all tweet-related actions
   */
  getActions(): Record<string, ExtensionAction> {
    return {
      post_tweet: {
        name: 'post_tweet',
        description: 'Post a tweet to Twitter',
        category: ActionCategory.SOCIAL,
        parameters: {
          content: 'string',
          inReplyTo: 'string?',
          mediaIds: 'string[]?',
        },
        execute: async (
          agent: Agent,
          params: SkillParameters
        ): Promise<ActionResult> => {
          return this.postTweet(agent, params);
        },
      },
      generate_tweet: {
        name: 'generate_tweet',
        description: 'Generate tweet content based on agent personality',
        category: ActionCategory.GENERATION,
        parameters: {
          topic: 'string?',
          style: 'string?',
          includeHashtags: 'boolean?',
        },
        execute: async (
          agent: Agent,
          params: SkillParameters
        ): Promise<ActionResult> => {
          return this.generateTweet(agent, params);
        },
      },
      delete_tweet: {
        name: 'delete_tweet',
        description: 'Delete a tweet',
        category: ActionCategory.SOCIAL,
        parameters: {
          tweetId: 'string',
        },
        execute: async (
          agent: Agent,
          params: SkillParameters
        ): Promise<ActionResult> => {
          return this.deleteTweet(agent, params);
        },
      },
      schedule_tweet: {
        name: 'schedule_tweet',
        description: 'Schedule a tweet for autonomous posting',
        category: ActionCategory.SOCIAL,
        parameters: {
          content: 'string?',
          scheduledFor: 'string?',
          reasoning: 'string',
        },
        execute: async (
          agent: Agent,
          params: SkillParameters
        ): Promise<ActionResult> => {
          return this.scheduleTweet(agent, params);
        },
      },
    };
  }

  /**
   * Post a tweet
   */
  private async postTweet(
    agent: Agent,
    params: SkillParameters
  ): Promise<ActionResult> {
    try {
      const client = this.ensureTwitterClient();
      const content = String(params['content']);

      // Ensure content is within Twitter's character limit
      if (content.length > 280) {
        return this.errorResult(
          'Tweet content exceeds 280 character limit',
          'CONTENT_TOO_LONG'
        );
      }

      const result = await client.v2.tweet(content) as TweetV2PostTweetResult;

      this.log('info', 'Posted tweet', {
        agentId: agent.id,
        tweetId: result.data.id,
        content: content.substring(0, 50) + '...',
      });

      // Track the tweet if extension is tracking performance
      if (this.extension.isTrackingPerformance()) {
        this.extension.trackTweet({
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
      }

      return this.successResult({
        tweetId: result.data.id,
        content: content,
        timestamp: new Date(),
      });
    } catch (error) {
      this.log('error', 'Failed to post tweet', {
        agentId: agent.id,
      });
      return this.errorResult(error as Error);
    }
  }

  /**
   * Generate tweet content
   */
  private async generateTweet(
    agent: Agent,
    params: SkillParameters
  ): Promise<ActionResult> {
    try {
      const topic = params['topic'] ? String(params['topic']) : undefined;
      const style = params['style'] ? String(params['style']) : undefined;
      const includeHashtags = params['includeHashtags'] === true;

      const options: Parameters<typeof this.generateTweetContent>[1] = {
        includeHashtags,
      };
      if (topic !== undefined) options.topic = topic;
      if (style !== undefined) options.style = style;

      const content = await this.generateTweetContent(agent, options);

      return this.successResult({
        content,
        generated: true,
        timestamp: new Date(),
      });
    } catch (error) {
      this.log('error', 'Failed to generate tweet content', {
        agentId: agent.id,
      });
      return this.errorResult(error as Error);
    }
  }

  /**
   * Delete a tweet
   */
  private async deleteTweet(
    agent: Agent,
    params: SkillParameters
  ): Promise<ActionResult> {
    try {
      const client = this.ensureTwitterClient();
      const tweetId = String(params['tweetId']);

      await client.v2.deleteTweet(tweetId);

      this.log('info', 'Deleted tweet', {
        agentId: agent.id,
        tweetId,
      });

      return this.successResult({
        tweetId,
        deleted: true,
        timestamp: new Date(),
      });
    } catch (error) {
      this.log('error', 'Failed to delete tweet', {
        agentId: agent.id,
      });
      return this.errorResult(error as Error);
    }
  }

  /**
   * Schedule a tweet for autonomous posting
   */
  private async scheduleTweet(
    agent: Agent,
    params: SkillParameters
  ): Promise<ActionResult> {
    try {
      if (!this.isAutonomousMode()) {
        return this.errorResult(
          'Autonomous mode is not enabled',
          'AUTONOMOUS_MODE_DISABLED'
        );
      }

      const baseAction: TwitterAutonomousAction = {
        type: 'tweet',
        reasoning: String(params['reasoning']),
        confidence: 0.8,
        expectedOutcome: 'Engage audience with scheduled content',
      };

      const content = params['content'] ? String(params['content']) : undefined;
      if (content !== undefined) {
        baseAction.content = content;
      }

      const scheduledFor = params['scheduledFor'] 
        ? new Date(String(params['scheduledFor']))
        : undefined;
      if (scheduledFor !== undefined) {
        baseAction.scheduledFor = scheduledFor;
      }

      const action = baseAction;

      this.extension.queueAction(action);

      this.log('debug', 'Scheduled tweet', {
        agentId: agent.id,
        queueLength: this.extension.getQueueLength(),
      });

      return this.successResult({
        scheduled: true,
        action,
        timestamp: new Date(),
      });
    } catch (error) {
      this.log('error', 'Failed to schedule tweet', {
        agentId: agent.id,
      });
      return this.errorResult(error as Error);
    }
  }

  /**
   * Generate tweet content using agent's cognition
   */
  public async generateTweetContent(
    agent: Agent,
    options: {
      topic?: string;
      style?: string;
      includeHashtags?: boolean;
    } = {}
  ): Promise<string> {
    // Get current emotion and personality context
    const emotionState = agent.emotion;
    const personality = agent.personality || 
      (agent.characterConfig?.['personality'] as string[] | undefined) || 
      [];

    // Create context for content generation
    const context: ContentGenerationContext = {
      topics: options.topic 
        ? [options.topic]
        : this.extension.getContentStrategy().topics,
      emotion: emotionState?.current || 'neutral',
      personality: personality,
      recentTrends: this.extension.getCurrentTrends().slice(0, 3),
      performanceData: this.extension.getContentStrategy().performanceMetrics,
    };

    // Generate content using agent's cognition
    const prompt = this.buildContentPrompt(context, options);
    const thoughtContext: ThoughtContext = {
      events: [],
      memories: [],
      currentState: {
        goals: ['Generate engaging Twitter content'],
        context: {},
      },
      environment: {
        type: EnvironmentType.SOCIAL_PLATFORM,
        time: new Date(),
      },
      goal: prompt,
    };

    const response = await agent.cognition.think(agent, thoughtContext);

    // Ensure tweet is within character limit
    let content = response?.thoughts?.[0] || this.generateFallbackContent(context);
    if (content.length > 280) {
      content = content.substring(0, 277) + '...';
    }

    // Add hashtags if requested
    if (options.includeHashtags) {
      const hashtags = this.generateHashtags(context);
      const hashtagsText = hashtags.join(' ');
      
      if (content.length + hashtagsText.length + 1 <= 280) {
        content += ' ' + hashtagsText;
      }
    }

    return content;
  }

  /**
   * Build content generation prompt
   */
  private buildContentPrompt(
    context: ContentGenerationContext,
    options: {
      style?: string;
    }
  ): string {
    return `Create a Twitter post that reflects your personality and interests. 

Context:
- Your main topics: ${context.topics.join(', ')}
- Current emotion: ${context.emotion}
- Recent trends: ${context.recentTrends.map(t => t.name).join(', ')}
- Best performing topics: ${context.performanceData.bestPerformingTopics.join(', ')}
${options.style ? `- Style: ${options.style}` : ''}

Guidelines:
- Keep it under 280 characters
- Be authentic to your personality
- Engage your audience
- Consider current trends if relevant

Generate a single tweet:`;
  }

  /**
   * Generate fallback content when AI generation fails
   */
  private generateFallbackContent(context: ContentGenerationContext): string {
    const topics = context.topics;
    const randomTopic = topics[Math.floor(Math.random() * topics.length)] || topics[0] || 'technology';
    
    const templates = [
      `Thinking about ${randomTopic} today. What's your take on it?`,
      `Just had an interesting thought about ${randomTopic}...`,
      `${randomTopic} is fascinating. Anyone else exploring this?`,
      `Quick thought on ${randomTopic}: it's more complex than it seems.`,
      `Diving deep into ${randomTopic}. The possibilities are endless.`,
    ];

    const template = templates[Math.floor(Math.random() * templates.length)] || templates[0];
    return template as string;
  }

  /**
   * Generate relevant hashtags
   */
  private generateHashtags(context: ContentGenerationContext): string[] {
    const hashtags: string[] = [];
    
    // Add topic-based hashtags
    for (const topic of context.topics.slice(0, 2)) {
      hashtags.push(`#${topic.replace(/\s+/g, '')}`);
    }

    // Add trend-based hashtags if relevant
    for (const trend of context.recentTrends.slice(0, 1)) {
      if (trend.name.startsWith('#')) {
        hashtags.push(trend.name);
      }
    }

    return hashtags.slice(0, 3); // Limit to 3 hashtags
  }
}