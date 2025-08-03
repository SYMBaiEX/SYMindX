/**
 * Twitter Extension Types
 *
 * Type definitions for the autonomous Twitter extension
 */

import { ExtensionConfig } from '../../types/common';
import { LogContext } from '../../types/utils/logger';

/**
 * Twitter configuration interface
 */
export interface TwitterConfig extends ExtensionConfig {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessTokenSecret: string;
  bearerToken?: string;
  
  // Autonomous behavior settings
  autonomous: {
    enabled: boolean;
    tweetFrequency: number; // minutes between autonomous tweets
    engagementFrequency: number; // minutes between engagement checks
    maxTweetsPerHour: number;
    maxEngagementsPerHour: number;
    
    // Content settings
    personalityTopics: string[];
    trendParticipation: boolean;
    replyToMentions: boolean;
    retweetRelevantContent: boolean;
    
    // Relationship building
    followRelevantUsers: boolean;
    maxFollowsPerDay: number;
    unfollowInactiveUsers: boolean;
    
    // Learning and optimization
    trackPerformance: boolean;
    adaptContentStrategy: boolean;
    learnFromEngagement: boolean;
  };
  
  // Rate limiting
  rateLimits: {
    tweets: { count: number; window: number }; // per 15 minutes
    follows: { count: number; window: number }; // per day
    likes: { count: number; window: number }; // per 15 minutes
    retweets: { count: number; window: number }; // per 15 minutes
  };
}

/**
 * Twitter user interface
 */
export interface TwitterUser {
  id: string;
  username: string;
  name: string;
  description?: string;
  profileImageUrl?: string;
  verified?: boolean;
  followersCount: number;
  followingCount: number;
  tweetCount: number;
  createdAt: string;
}

/**
 * Twitter V2 API user interface
 */
export interface TwitterUserV2 {
  id: string;
  name: string;
  username: string;
  created_at?: string;
  description?: string;
  public_metrics?: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
    listed_count: number;
  };
  verified?: boolean;
  location?: string;
  url?: string;
}

/**
 * Twitter tweet interface
 */
export interface TwitterTweet {
  id: string;
  text: string;
  authorId: string;
  createdAt: string;
  publicMetrics: {
    retweetCount: number;
    likeCount: number;
    replyCount: number;
    quoteCount: number;
  };
  contextAnnotations?: TwitterContextAnnotation[];
  entities?: TwitterEntities;
  referencedTweets?: TwitterReferencedTweet[];
}

/**
 * Twitter context annotation interface
 */
export interface TwitterContextAnnotation {
  domain: {
    id: string;
    name: string;
    description?: string;
  };
  entity: {
    id: string;
    name: string;
    description?: string;
  };
}

/**
 * Twitter entities interface
 */
export interface TwitterEntities {
  hashtags?: Array<{ start: number; end: number; tag: string }>;
  mentions?: Array<{ start: number; end: number; username: string; id: string }>;
  urls?: Array<{ start: number; end: number; url: string; expandedUrl: string }>;
}

/**
 * Twitter referenced tweet interface
 */
export interface TwitterReferencedTweet {
  type: 'retweeted' | 'quoted' | 'replied_to';
  id: string;
}

/**
 * Twitter trend interface
 */
export interface TwitterTrend {
  name: string;
  url: string;
  promotedContent?: boolean;
  query: string;
  tweetVolume?: number;
}

/**
 * Twitter engagement metrics interface
 */
export interface TwitterEngagementMetrics {
  tweetId: string;
  impressions: number;
  engagements: number;
  likes: number;
  retweets: number;
  replies: number;
  profileClicks: number;
  urlClicks: number;
  hashtags: string[];
  mentions: string[];
  timestamp: Date;
}

/**
 * Twitter relationship interface
 */
export interface TwitterRelationship {
  id: string; // User ID
  userId: string;
  username: string;
  relationshipType: 'follower' | 'following' | 'mutual' | 'none';
  following?: boolean;
  followingDate?: Date;
  unfollowDate?: Date;
  interactionHistory: TwitterInteraction[];
  lastInteraction?: Date;
  engagementScore: number; // 0-1 based on interaction quality
  topics: string[]; // topics this user tweets about
  influence: number; // follower count based influence score
}

/**
 * Twitter interaction interface
 */
export interface TwitterInteraction {
  type: 'mention' | 'reply' | 'retweet' | 'like' | 'quote';
  tweetId: string;
  content?: string;
  timestamp: Date;
  sentiment: number; // -1 to 1
}

/**
 * Twitter content strategy interface
 */
export interface TwitterContentStrategy {
  topics: string[];
  toneOfVoice: 'professional' | 'casual' | 'humorous' | 'educational' | 'inspirational' | 'empathetic';
  hashtagStrategy: string[];
  mentionStrategy: string[];
  postingTimes: string[]; // optimal posting times
  contentTypes: Array<'original' | 'retweet' | 'reply' | 'thread'>;
  performanceMetrics: {
    avgLikes: number;
    avgRetweets: number;
    avgReplies: number;
    bestPerformingTopics: string[];
    optimalLength: number;
  };
}

/**
 * Twitter autonomous action interface
 */
export interface TwitterAutonomousAction {
  type: 'tweet' | 'reply' | 'retweet' | 'like' | 'follow' | 'unfollow';
  content?: string;
  targetId?: string; // tweet ID or user ID
  reasoning: string;
  confidence: number; // 0-1
  expectedOutcome: string;
  scheduledFor?: Date;
}

/**
 * Twitter performance analytics interface
 */
export interface TwitterPerformanceAnalytics {
  period: 'hour' | 'day' | 'week' | 'month';
  metrics: {
    tweetsPosted: number;
    totalImpressions: number;
    totalEngagements: number;
    engagementRate: number;
    followerGrowth: number;
    topPerformingTweets: TwitterTweet[];
    topHashtags: string[];
    bestPostingTimes: string[];
  };
  insights: string[];
  recommendations: string[];
}

/**
 * Twitter error types enum
 */
export enum TwitterErrorType {
  AUTHENTICATION_FAILED = 'authentication_failed',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  NETWORK_ERROR = 'network_error',
  PERMISSION_DENIED = 'permission_denied',
  TWEET_NOT_FOUND = 'tweet_not_found',
  USER_NOT_FOUND = 'user_not_found',
  INVALID_REQUEST = 'invalid_request',
  ACCOUNT_SUSPENDED = 'account_suspended',
  INTERNAL_ERROR = 'internal_error',
  API_ERROR = 'api_error',
}

/**
 * Extended log context for Twitter extension
 */
export interface TwitterLogContext extends LogContext {
  autonomousMode?: boolean;
  tweetFrequency?: number;
  engagementFrequency?: number;
  queueLength?: number;
  trendsCount?: number;
  relevantTrends?: number;
  avgLikes?: number;
  avgRetweets?: number;
  avgReplies?: number;
  tweetId?: string;
  content?: string;
  reasoning?: string;
  targetId?: string;
  actionType?: string;
}

/**
 * Twitter API trend response
 */
export interface TwitterTrendResponse {
  name: string;
  url: string;
  promoted_content?: boolean;
  query?: string;
  tweet_volume?: number | null;
}

/**
 * Twitter API trends location
 */
export interface TwitterTrendsLocation {
  woeid: number;
  name: string;
  countryCode?: string;
  country?: string;
  placeType?: {
    code: number;
    name: string;
  };
}

/**
 * Twitter API trends result
 */
export interface TwitterTrendsResult {
  trends: TwitterTrendResponse[];
  as_of: string;
  created_at: string;
  locations: Array<{
    name: string;
    woeid: number;
  }>;
}

/**
 * Twitter API v2 Tweet response
 */
export interface TweetV2PostTweetResult {
  data: {
    id: string;
    text: string;
  };
}

/**
 * Twitter API v2 User response
 */
export interface UserV2Result {
  data: {
    id: string;
    name: string;
    username: string;
  };
}

/**
 * Twitter API v2 Timeline response
 */
export interface TimelineV2Result {
  data?: Array<{
    id: string;
    text: string;
    author_id?: string;
    created_at?: string;
    public_metrics?: {
      retweet_count: number;
      reply_count: number;
      like_count: number;
      quote_count: number;
    };
  }>;
  meta?: {
    result_count: number;
    next_token?: string;
  };
}

/**
 * Content generation context
 */
export interface ContentGenerationContext {
  topics: string[];
  emotion: string;
  personality: string[] | Record<string, unknown>;
  recentTrends: TwitterTrend[];
  performanceData: {
    avgLikes: number;
    avgRetweets: number;
    avgReplies: number;
    bestPerformingTopics: string[];
    optimalLength: number;
  };
}

/**
 * Twitter API v2 Tweet object
 */
export interface TweetV2 {
  id: string;
  text: string;
  author_id?: string;
  created_at?: string;
  public_metrics?: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
  };
}