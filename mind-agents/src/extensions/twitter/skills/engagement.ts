/**
 * Engagement Skill
 *
 * Handles likes, retweets, replies, and mentions
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
  TwitterAutonomousAction,
  TimelineV2Result,
  TweetV2,
} from '../types';

export class EngagementSkill extends BaseTwitterSkill {
  /**
   * Get all engagement-related actions
   */
  getActions(): Record<string, ExtensionAction> {
    return {
      like_tweet: {
        name: 'like_tweet',
        description: 'Like a tweet',
        category: ActionCategory.SOCIAL,
        parameters: {
          tweetId: 'string',
        },
        execute: async (
          agent: Agent,
          params: SkillParameters
        ): Promise<ActionResult> => {
          return this.likeTweet(agent, params);
        },
      },
      unlike_tweet: {
        name: 'unlike_tweet',
        description: 'Unlike a tweet',
        category: ActionCategory.SOCIAL,
        parameters: {
          tweetId: 'string',
        },
        execute: async (
          agent: Agent,
          params: SkillParameters
        ): Promise<ActionResult> => {
          return this.unlikeTweet(agent, params);
        },
      },
      retweet: {
        name: 'retweet',
        description: 'Retweet a tweet',
        category: ActionCategory.SOCIAL,
        parameters: {
          tweetId: 'string',
        },
        execute: async (
          agent: Agent,
          params: SkillParameters
        ): Promise<ActionResult> => {
          return this.retweet(agent, params);
        },
      },
      unretweet: {
        name: 'unretweet',
        description: 'Remove a retweet',
        category: ActionCategory.SOCIAL,
        parameters: {
          tweetId: 'string',
        },
        execute: async (
          agent: Agent,
          params: SkillParameters
        ): Promise<ActionResult> => {
          return this.unretweet(agent, params);
        },
      },
      reply_to_tweet: {
        name: 'reply_to_tweet',
        description: 'Reply to a tweet',
        category: ActionCategory.SOCIAL,
        parameters: {
          tweetId: 'string',
          content: 'string',
        },
        execute: async (
          agent: Agent,
          params: SkillParameters
        ): Promise<ActionResult> => {
          return this.replyToTweet(agent, params);
        },
      },
      check_mentions: {
        name: 'check_mentions',
        description: 'Check recent mentions',
        category: ActionCategory.SOCIAL,
        parameters: {
          limit: 'number?',
          autoReply: 'boolean?',
        },
        execute: async (
          agent: Agent,
          params: SkillParameters
        ): Promise<ActionResult> => {
          return this.checkMentions(agent, params);
        },
      },
      find_relevant_content: {
        name: 'find_relevant_content',
        description: 'Find relevant content to engage with',
        category: ActionCategory.DISCOVERY,
        parameters: {
          topics: 'string[]?',
          limit: 'number?',
          autoEngage: 'boolean?',
        },
        execute: async (
          agent: Agent,
          params: SkillParameters
        ): Promise<ActionResult> => {
          return this.findRelevantContent(agent, params);
        },
      },
    };
  }

  /**
   * Like a tweet
   */
  private async likeTweet(
    agent: Agent,
    params: SkillParameters
  ): Promise<ActionResult> {
    try {
      const client = this.ensureTwitterClient();
      const tweetId = String(params['tweetId']);

      await client.v2.like('self', tweetId);

      this.log('debug', 'Liked tweet', {
        agentId: agent.id,
        targetId: tweetId,
      });

      return this.successResult({
        tweetId,
        action: 'liked',
        timestamp: new Date(),
      });
    } catch (error) {
      this.log('error', 'Failed to like tweet', {
        agentId: agent.id,
      });
      return this.errorResult(error as Error);
    }
  }

  /**
   * Unlike a tweet
   */
  private async unlikeTweet(
    agent: Agent,
    params: SkillParameters
  ): Promise<ActionResult> {
    try {
      const client = this.ensureTwitterClient();
      const tweetId = String(params['tweetId']);

      await client.v2.unlike('self', tweetId);

      this.log('debug', 'Unliked tweet', {
        agentId: agent.id,
        targetId: tweetId,
      });

      return this.successResult({
        tweetId,
        action: 'unliked',
        timestamp: new Date(),
      });
    } catch (error) {
      this.log('error', 'Failed to unlike tweet', {
        agentId: agent.id,
      });
      return this.errorResult(error as Error);
    }
  }

  /**
   * Retweet a tweet
   */
  private async retweet(
    agent: Agent,
    params: SkillParameters
  ): Promise<ActionResult> {
    try {
      const client = this.ensureTwitterClient();
      const tweetId = String(params['tweetId']);

      await client.v2.retweet('self', tweetId);

      this.log('info', 'Retweeted content', {
        agentId: agent.id,
        targetId: tweetId,
      });

      return this.successResult({
        tweetId,
        action: 'retweeted',
        timestamp: new Date(),
      });
    } catch (error) {
      this.log('error', 'Failed to retweet', {
        agentId: agent.id,
      });
      return this.errorResult(error as Error);
    }
  }

  /**
   * Remove a retweet
   */
  private async unretweet(
    agent: Agent,
    params: SkillParameters
  ): Promise<ActionResult> {
    try {
      const client = this.ensureTwitterClient();
      const tweetId = String(params['tweetId']);

      await client.v2.unretweet('self', tweetId);

      this.log('debug', 'Removed retweet', {
        agentId: agent.id,
        targetId: tweetId,
      });

      return this.successResult({
        tweetId,
        action: 'unretweeted',
        timestamp: new Date(),
      });
    } catch (error) {
      this.log('error', 'Failed to remove retweet', {
        agentId: agent.id,
      });
      return this.errorResult(error as Error);
    }
  }

  /**
   * Reply to a tweet
   */
  private async replyToTweet(
    agent: Agent,
    params: SkillParameters
  ): Promise<ActionResult> {
    try {
      const client = this.ensureTwitterClient();
      const tweetId = String(params['tweetId']);
      const content = String(params['content']);

      if (content.length > 280) {
        return this.errorResult(
          'Reply content exceeds 280 character limit',
          'CONTENT_TOO_LONG'
        );
      }

      await client.v2.reply(content, tweetId);

      this.log('info', 'Posted reply', {
        agentId: agent.id,
        targetId: tweetId,
      });

      return this.successResult({
        tweetId,
        action: 'replied',
        content,
        timestamp: new Date(),
      });
    } catch (error) {
      this.log('error', 'Failed to post reply', {
        agentId: agent.id,
      });
      return this.errorResult(error as Error);
    }
  }

  /**
   * Check recent mentions
   */
  private async checkMentions(
    agent: Agent,
    params: SkillParameters
  ): Promise<ActionResult> {
    try {
      const client = this.ensureTwitterClient();
      const limit = params['limit'] ? Number(params['limit']) : 10;
      const autoReply = params['autoReply'] === true;

      const mentionsResponse = await client.v2.userMentionTimeline('self', {
        max_results: Math.min(limit, 100),
        'tweet.fields': ['author_id', 'created_at', 'public_metrics'],
      });
      const mentions: TimelineV2Result = {
        data: mentionsResponse.data?.data,
        meta: mentionsResponse.data?.meta,
      };

      const mentionsList = mentions.data || [];

      // If auto-reply is enabled and autonomous mode is on
      if (autoReply && this.isAutonomousMode()) {
        for (const mention of mentionsList) {
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

            this.extension.queueAction(action);
          }
        }
      }

      return this.successResult({
        mentions: mentionsList,
        count: mentionsList.length,
        autoReplyEnabled: autoReply,
        timestamp: new Date(),
      });
    } catch (error) {
      this.log('error', 'Failed to check mentions', {
        agentId: agent.id,
      });
      return this.errorResult(error as Error);
    }
  }

  /**
   * Find relevant content to engage with
   */
  private async findRelevantContent(
    agent: Agent,
    params: SkillParameters
  ): Promise<ActionResult> {
    try {
      const client = this.ensureTwitterClient();
      const topics = params['topics'] 
        ? (params['topics'] as string[])
        : this.extension.getContentStrategy().topics.slice(0, 3);
      const limit = params['limit'] ? Number(params['limit']) : 10;
      const autoEngage = params['autoEngage'] === true;

      const relevantTweets: TweetV2[] = [];

      // Search for content related to topics
      for (const topic of topics) {
        const searchResponse = await client.v2.search(topic, {
          max_results: Math.min(limit, 100),
          'tweet.fields': ['author_id', 'created_at', 'public_metrics'],
        });
        const searchResults: TimelineV2Result = {
          data: searchResponse.data?.data,
          meta: searchResponse.data?.meta,
        };

        for (const tweet of searchResults.data || []) {
          if (await this.shouldEngageWithTweet(tweet)) {
            relevantTweets.push(tweet);

            // Auto-engage if enabled
            if (autoEngage && this.isAutonomousMode()) {
              const engagementTypes = ['like', 'retweet'];
              const engagementType = engagementTypes[Math.floor(Math.random() * engagementTypes.length)] || 'like';

              const action: TwitterAutonomousAction = {
                type: engagementType as 'like' | 'retweet',
                targetId: tweet.id,
                reasoning: `Engaging with relevant content about ${topic}`,
                confidence: 0.6,
                expectedOutcome: 'Build community connections and visibility',
              };

              this.extension.queueAction(action);
            }
          }
        }
      }

      return this.successResult({
        tweets: relevantTweets,
        count: relevantTweets.length,
        topics,
        autoEngageEnabled: autoEngage,
        timestamp: new Date(),
      });
    } catch (error) {
      this.log('error', 'Failed to find relevant content', {
        agentId: agent.id,
      });
      return this.errorResult(error as Error);
    }
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
    const relationship = this.extension.getRelationship(mention.author_id);
    if (relationship?.lastInteraction && 
        Date.now() - relationship.lastInteraction.getTime() < 60 * 60 * 1000) {
      return false;
    }

    // Check rate limits
    if (!this.extension.canPerformAction('reply')) {
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
   * Generate reply content based on the mention
   */
  private async generateReplyContent(mention: TweetV2): Promise<string> {
    const mentionText = mention.text?.toLowerCase() || '';
    
    // Context-aware reply generation based on mention content
    if (mentionText.includes('question') || mentionText.includes('?')) {
      const questionTemplates = [
        "Great question! Let me think about that...",
        "That's an interesting question. Here's my perspective:",
        "Good question! I'd love to explore this further.",
        "Thanks for asking! From what I understand...",
      ];
      const template = questionTemplates[Math.floor(Math.random() * questionTemplates.length)] || questionTemplates[0];
      return template as string;
    }
    
    if (mentionText.includes('agree') || mentionText.includes('disagree')) {
      const opinionTemplates = [
        "I appreciate your perspective on this!",
        "Thanks for sharing your thoughts. It's great to see different viewpoints.",
        "Interesting take! What led you to that conclusion?",
        "Your point is well taken. Let's discuss further!",
      ];
      const template = opinionTemplates[Math.floor(Math.random() * opinionTemplates.length)] || opinionTemplates[0];
      return template as string;
    }
    
    if (mentionText.includes('help') || mentionText.includes('assist')) {
      const helpTemplates = [
        "I'd be happy to help! What specifically can I assist you with?",
        "Sure, I'm here to help. Can you tell me more?",
        "Absolutely! Let me know what you need assistance with.",
        "Happy to help out! What's on your mind?",
      ];
      const template = helpTemplates[Math.floor(Math.random() * helpTemplates.length)] || helpTemplates[0];
      return template as string;
    }
    
    if (mentionText.includes('thank') || mentionText.includes('appreciate')) {
      const gratitudeTemplates = [
        "You're very welcome! Happy to be part of the conversation.",
        "My pleasure! Thanks for engaging with me.",
        "Glad I could help! Feel free to reach out anytime.",
        "You're welcome! I appreciate the kind words.",
      ];
      const template = gratitudeTemplates[Math.floor(Math.random() * gratitudeTemplates.length)] || gratitudeTemplates[0];
      return template as string;
    }
    
    // Check for specific topics in the mention
    const topics = this.extension.getContentStrategy().topics;
    for (const topic of topics) {
      if (mentionText.includes(topic.toLowerCase())) {
        return `Ah, ${topic}! That's one of my favorite topics to discuss. What aspects interest you most?`;
      }
    }
    
    // Default templates for general mentions
    const defaultTemplates = [
      "Thanks for the mention! Interesting perspective.",
      "Great point! I've been thinking about this too.",
      "Appreciate you sharing this. What's your take?",
      "This is fascinating. Thanks for bringing it up!",
      "I'm intrigued by your thoughts here. Tell me more!",
    ];
    
    const template = defaultTemplates[Math.floor(Math.random() * defaultTemplates.length)] || defaultTemplates[0];
    return template as string;
  }
}