/**
 * Relationship Management Skill
 *
 * Handles follower/following relationships and network management
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
  TwitterRelationship,
  TwitterAutonomousAction,
  UserV2Result,
  TwitterUserV2,
} from '../types';

export class RelationshipSkill extends BaseTwitterSkill {
  /**
   * Get all relationship-related actions
   */
  getActions(): Record<string, ExtensionAction> {
    return {
      follow_user: {
        name: 'follow_user',
        description: 'Follow a Twitter user',
        category: ActionCategory.SOCIAL,
        parameters: {
          userId: 'string',
        },
        execute: async (
          agent: Agent,
          params: SkillParameters
        ): Promise<ActionResult> => {
          return this.followUser(agent, params);
        },
      },
      unfollow_user: {
        name: 'unfollow_user',
        description: 'Unfollow a Twitter user',
        category: ActionCategory.SOCIAL,
        parameters: {
          userId: 'string',
        },
        execute: async (
          agent: Agent,
          params: SkillParameters
        ): Promise<ActionResult> => {
          return this.unfollowUser(agent, params);
        },
      },
      get_followers: {
        name: 'get_followers',
        description: 'Get list of followers',
        category: ActionCategory.DISCOVERY,
        parameters: {
          limit: 'number?',
          userId: 'string?',
        },
        execute: async (
          agent: Agent,
          params: SkillParameters
        ): Promise<ActionResult> => {
          return this.getFollowers(agent, params);
        },
      },
      get_following: {
        name: 'get_following',
        description: 'Get list of users being followed',
        category: ActionCategory.DISCOVERY,
        parameters: {
          limit: 'number?',
          userId: 'string?',
        },
        execute: async (
          agent: Agent,
          params: SkillParameters
        ): Promise<ActionResult> => {
          return this.getFollowing(agent, params);
        },
      },
      analyze_relationships: {
        name: 'analyze_relationships',
        description: 'Analyze follower/following relationships',
        category: ActionCategory.ANALYSIS,
        parameters: {
          autoFollowBack: 'boolean?',
          unfollow_inactive: 'boolean?',
        },
        execute: async (
          agent: Agent,
          params: SkillParameters
        ): Promise<ActionResult> => {
          return this.analyzeRelationships(agent, params);
        },
      },
      get_user_info: {
        name: 'get_user_info',
        description: 'Get information about a Twitter user',
        category: ActionCategory.DISCOVERY,
        parameters: {
          userId: 'string',
        },
        execute: async (
          agent: Agent,
          params: SkillParameters
        ): Promise<ActionResult> => {
          return this.getUserInfo(agent, params);
        },
      },
      find_similar_users: {
        name: 'find_similar_users',
        description: 'Find users with similar interests',
        category: ActionCategory.DISCOVERY,
        parameters: {
          topics: 'string[]?',
          limit: 'number?',
          autoFollow: 'boolean?',
        },
        execute: async (
          agent: Agent,
          params: SkillParameters
        ): Promise<ActionResult> => {
          return this.findSimilarUsers(agent, params);
        },
      },
    };
  }

  /**
   * Follow a user
   */
  private async followUser(
    agent: Agent,
    params: SkillParameters
  ): Promise<ActionResult> {
    try {
      const client = this.ensureTwitterClient();
      const userId = String(params['userId']);

      await client.v2.follow('self', userId);

      // Update relationship tracking
      this.extension.updateRelationship(userId, {
        id: userId,
        following: true,
        followingDate: new Date(),
        lastInteraction: new Date(),
      });

      this.log('info', 'Followed user', {
        agentId: agent.id,
        targetId: userId,
      });

      return this.successResult({
        userId,
        action: 'followed',
        timestamp: new Date(),
      });
    } catch (error) {
      this.log('error', 'Failed to follow user', {
        agentId: agent.id,
      });
      return this.errorResult(error as Error);
    }
  }

  /**
   * Unfollow a user
   */
  private async unfollowUser(
    agent: Agent,
    params: SkillParameters
  ): Promise<ActionResult> {
    try {
      const client = this.ensureTwitterClient();
      const userId = String(params['userId']);

      await client.v2.unfollow('self', userId);

      // Update relationship tracking
      this.extension.updateRelationship(userId, {
        id: userId,
        following: false,
        unfollowDate: new Date(),
        lastInteraction: new Date(),
      });

      this.log('info', 'Unfollowed user', {
        agentId: agent.id,
        targetId: userId,
      });

      return this.successResult({
        userId,
        action: 'unfollowed',
        timestamp: new Date(),
      });
    } catch (error) {
      this.log('error', 'Failed to unfollow user', {
        agentId: agent.id,
      });
      return this.errorResult(error as Error);
    }
  }

  /**
   * Get followers list
   */
  private async getFollowers(
    agent: Agent,
    params: SkillParameters
  ): Promise<ActionResult> {
    try {
      const client = this.ensureTwitterClient();
      const limit = params['limit'] ? Number(params['limit']) : 20;
      const userId = params['userId'] ? String(params['userId']) : 'self';

      const followers = await client.v2.followers(userId, {
        max_results: Math.min(limit, 100),
        'user.fields': ['created_at', 'description', 'public_metrics'],
      });

      return this.successResult({
        followers: followers.data || [],
        count: followers.data?.length || 0,
        timestamp: new Date(),
      });
    } catch (error) {
      this.log('error', 'Failed to get followers', {
        agentId: agent.id,
      });
      return this.errorResult(error as Error);
    }
  }

  /**
   * Get following list
   */
  private async getFollowing(
    agent: Agent,
    params: SkillParameters
  ): Promise<ActionResult> {
    try {
      const client = this.ensureTwitterClient();
      const limit = params['limit'] ? Number(params['limit']) : 20;
      const userId = params['userId'] ? String(params['userId']) : 'self';

      const following = await client.v2.following(userId, {
        max_results: Math.min(limit, 100),
        'user.fields': ['created_at', 'description', 'public_metrics'],
      });

      return this.successResult({
        following: following.data || [],
        count: following.data?.length || 0,
        timestamp: new Date(),
      });
    } catch (error) {
      this.log('error', 'Failed to get following list', {
        agentId: agent.id,
      });
      return this.errorResult(error as Error);
    }
  }

  /**
   * Analyze relationships
   */
  private async analyzeRelationships(
    agent: Agent,
    params: SkillParameters
  ): Promise<ActionResult> {
    try {
      const autoFollowBack = params['autoFollowBack'] === true;
      const unfollowInactive = params['unfollow_inactive'] === true;

      // Get followers and following lists
      const followersResult = await this.getFollowers(agent, { limit: 100 });
      const followingResult = await this.getFollowing(agent, { limit: 100 });

      const followers = (followersResult.result as any)?.followers || [];
      const following = (followingResult.result as any)?.following || [];

      // Find users who follow us but we don't follow back
      const notFollowingBack = followers.filter((follower: TwitterUserV2) =>
        !following.some((f: TwitterUserV2) => f.id === follower.id)
      );

      // Find users we follow who don't follow us back
      const notFollowedBack = following.filter((user: TwitterUserV2) =>
        !followers.some((f: TwitterUserV2) => f.id === user.id)
      );

      // Queue auto-follow actions if enabled
      if (autoFollowBack && this.isAutonomousMode()) {
        for (const user of notFollowingBack.slice(0, 5)) {
          const action: TwitterAutonomousAction = {
            type: 'follow',
            targetId: user.id,
            reasoning: `Following back ${user.name} who follows us`,
            confidence: 0.9,
            expectedOutcome: 'Build reciprocal relationships',
          };

          this.extension.queueAction(action);
        }
      }

      // Analyze inactive relationships
      const inactiveRelationships = this.findInactiveRelationships(following);

      // Queue unfollow actions if enabled
      if (unfollowInactive && this.isAutonomousMode()) {
        for (const user of inactiveRelationships.slice(0, 3)) {
          const action: TwitterAutonomousAction = {
            type: 'unfollow',
            targetId: user.id,
            reasoning: 'Unfollowing inactive account',
            confidence: 0.7,
            expectedOutcome: 'Maintain healthy follower ratio',
          };

          this.extension.queueAction(action);
        }
      }

      return this.successResult({
        followers: followers.length,
        following: following.length,
        notFollowingBack: notFollowingBack.length,
        notFollowedBack: notFollowedBack.length,
        inactiveRelationships: inactiveRelationships.length,
        actionsQueued: {
          followBack: autoFollowBack ? Math.min(notFollowingBack.length, 5) : 0,
          unfollow: unfollowInactive ? Math.min(inactiveRelationships.length, 3) : 0,
        },
        timestamp: new Date(),
      });
    } catch (error) {
      this.log('error', 'Failed to analyze relationships', {
        agentId: agent.id,
      });
      return this.errorResult(error as Error);
    }
  }

  /**
   * Get user information
   */
  private async getUserInfo(
    agent: Agent,
    params: SkillParameters
  ): Promise<ActionResult> {
    try {
      const client = this.ensureTwitterClient();
      const userId = String(params['userId']);

      const user = await client.v2.user(userId, {
        'user.fields': [
          'created_at',
          'description',
          'public_metrics',
          'verified',
          'location',
          'url',
        ],
      });

      return this.successResult({
        user: user.data,
        timestamp: new Date(),
      });
    } catch (error) {
      this.log('error', 'Failed to get user info', {
        agentId: agent.id,
      });
      return this.errorResult(error as Error);
    }
  }

  /**
   * Find users with similar interests
   */
  private async findSimilarUsers(
    agent: Agent,
    params: SkillParameters
  ): Promise<ActionResult> {
    try {
      const client = this.ensureTwitterClient();
      const topics = params['topics'] 
        ? (params['topics'] as string[])
        : this.extension.getContentStrategy().topics.slice(0, 3);
      const limit = params['limit'] ? Number(params['limit']) : 10;
      const autoFollow = params['autoFollow'] === true;

      const similarUsers: TwitterUserV2[] = [];

      // Search for users interested in our topics
      for (const topic of topics) {
        const searchQuery = `${topic} -is:retweet`;
        const results = await client.v2.search(searchQuery, {
          max_results: Math.min(limit, 100),
          'tweet.fields': ['author_id'],
          'user.fields': ['description', 'public_metrics'],
          'expansions': ['author_id'],
        });

        // Extract unique users from search results
        const users = results.includes?.users || [];
        for (const user of users) {
          const twitterUser = user as unknown as TwitterUserV2;
          if (this.isRelevantUser(twitterUser) && !similarUsers.some(u => u.id === twitterUser.id)) {
            similarUsers.push(twitterUser);

            // Auto-follow if enabled
            if (autoFollow && this.isAutonomousMode()) {
              const action: TwitterAutonomousAction = {
                type: 'follow',
                targetId: user.id,
                reasoning: `Following user interested in ${topic}`,
                confidence: 0.6,
                expectedOutcome: 'Connect with similar interests',
              };

              this.extension.queueAction(action);
            }
          }
        }
      }

      return this.successResult({
        users: similarUsers,
        count: similarUsers.length,
        topics,
        autoFollowEnabled: autoFollow,
        timestamp: new Date(),
      });
    } catch (error) {
      this.log('error', 'Failed to find similar users', {
        agentId: agent.id,
      });
      return this.errorResult(error as Error);
    }
  }

  /**
   * Find inactive relationships
   */
  private findInactiveRelationships(following: TwitterUserV2[]): TwitterUserV2[] {
    const inactive: TwitterUserV2[] = [];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    for (const user of following) {
      const relationship = this.extension.getRelationship(user.id);
      
      // Consider inactive if no interaction in 30 days
      if (relationship?.lastInteraction && 
          relationship.lastInteraction < thirtyDaysAgo) {
        inactive.push(user);
      }
      
      // Also consider inactive if very low engagement
      const metrics = user.public_metrics;
      if (metrics && metrics.tweet_count < 10) {
        inactive.push(user);
      }
    }

    return inactive;
  }

  /**
   * Check if a user is relevant based on metrics and description
   */
  private isRelevantUser(user: TwitterUserV2): boolean {
    // Check if user has reasonable activity
    const metrics = user.public_metrics;
    if (!metrics || metrics.tweet_count < 50) {
      return false;
    }

    // Check follower/following ratio
    if (metrics.followers_count < 100 || metrics.following_count > 5000) {
      return false;
    }

    // Check if bio contains our interests
    const interests = this.extension.getContentStrategy().topics;
    const bio = user.description?.toLowerCase() || '';
    
    return interests.some(interest => 
      bio.includes(interest.toLowerCase())
    );
  }

  /**
   * Build detailed relationship object from user data
   */
  private buildRelationship(user: TwitterUserV2, type: 'follower' | 'following' | 'mutual' | 'none'): TwitterRelationship {
    const existingRelation = this.extension.getRelationship(user.id);
    
    return {
      id: user.id,
      userId: user.id,
      username: user.username,
      relationshipType: type,
      following: type === 'following' || type === 'mutual',
      followingDate: existingRelation?.followingDate || new Date(),
      interactionHistory: existingRelation?.interactionHistory || [],
      lastInteraction: existingRelation?.lastInteraction,
      engagementScore: this.calculateEngagementScore(user),
      topics: this.extractUserTopics(user),
      influence: this.calculateInfluenceScore(user),
    };
  }

  /**
   * Calculate engagement score for a user
   */
  private calculateEngagementScore(user: TwitterUserV2): number {
    if (!user.public_metrics) return 0;
    
    const metrics = user.public_metrics;
    const engagementRate = metrics.tweet_count > 0 
      ? (metrics.followers_count / metrics.tweet_count) * 0.01
      : 0;
    
    return Math.min(engagementRate, 1);
  }

  /**
   * Extract topics from user description
   */
  private extractUserTopics(user: TwitterUserV2): string[] {
    const description = user.description?.toLowerCase() || '';
    const knownTopics = this.extension.getContentStrategy().topics;
    
    return knownTopics.filter(topic => 
      description.includes(topic.toLowerCase())
    );
  }

  /**
   * Calculate influence score based on follower count
   */
  private calculateInfluenceScore(user: TwitterUserV2): number {
    if (!user.public_metrics) return 0;
    
    const followers = user.public_metrics.followers_count;
    
    // Log scale influence score
    if (followers < 1000) return 0.1;
    if (followers < 10000) return 0.3;
    if (followers < 100000) return 0.5;
    if (followers < 1000000) return 0.7;
    return 1.0;
  }

  /**
   * Convert API user result to internal format
   */
  private convertUserResult(result: UserV2Result): TwitterUserV2 {
    return {
      id: result.data.id,
      name: result.data.name,
      username: result.data.username,
      created_at: new Date().toISOString(),
      public_metrics: {
        followers_count: 0,
        following_count: 0,
        tweet_count: 0,
        listed_count: 0,
      },
    };
  }
}