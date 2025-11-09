/**
 * Discord Extension Types
 *
 * Type definitions for the autonomous Discord extension
 */

import { ExtensionConfig } from '../../types/common';
import { LogContext } from '../../types/utils/logger';

/**
 * Discord configuration interface
 */
export interface DiscordConfig extends ExtensionConfig {
  token: string;
  clientId: string;
  
  // Autonomous behavior settings
  autonomous: {
    enabled: boolean;
    messageFrequency: number; // minutes between autonomous messages
    engagementFrequency: number; // minutes between engagement checks
    maxMessagesPerHour: number;
    maxEngagementsPerHour: number;
    
    // Server and channel settings
    servers: string[]; // Server IDs to participate in
    channels: string[]; // Channel IDs to monitor
    voiceChannels: string[]; // Voice channel IDs to join
    
    // Community engagement
    participateInEvents: boolean;
    organizeEvents: boolean;
    moderateChannels: boolean;
    
    // Gaming coordination
    gamingCoordination: boolean;
    joinGamingSessions: boolean;
    organizeGamingSessions: boolean;
    
    // Content creation
    shareContent: boolean;
    hostCommunityEvents: boolean;
    
    // Learning and optimization
    trackPerformance: boolean;
    adaptBehavior: boolean;
    learnFromInteractions: boolean;
  };
  
  // Rate limiting
  rateLimits: {
    messages: { count: number; window: number }; // per minute
    reactions: { count: number; window: number }; // per minute
    voiceJoins: { count: number; window: number }; // per hour
  };
}

/**
 * Discord user interface
 */
export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  displayName?: string;
  avatar?: string;
  bot: boolean;
  joinedAt?: Date;
  roles: string[];
  status: 'online' | 'idle' | 'dnd' | 'offline';
}

/**
 * Discord server interface
 */
export interface DiscordServer {
  id: string;
  name: string;
  description?: string;
  memberCount: number;
  channels: DiscordChannel[];
  roles: DiscordRole[];
  joinedAt: Date;
}

/**
 * Discord channel interface
 */
export interface DiscordChannel {
  id: string;
  name: string;
  type: 'text' | 'voice' | 'category' | 'news' | 'thread';
  serverId: string;
  topic?: string;
  memberCount?: number;
  lastActivity?: Date;
}

/**
 * Discord role interface
 */
export interface DiscordRole {
  id: string;
  name: string;
  color: number;
  permissions: string[];
  position: number;
  mentionable: boolean;
}

/**
 * Discord message interface
 */
export interface DiscordMessage {
  id: string;
  content: string;
  authorId: string;
  channelId: string;
  serverId: string;
  timestamp: Date;
  reactions: DiscordReaction[];
  mentions: string[];
  attachments: DiscordAttachment[];
  embeds: DiscordEmbed[];
  replyTo?: string;
}

/**
 * Discord reaction interface
 */
export interface DiscordReaction {
  emoji: string;
  count: number;
  users: string[];
}

/**
 * Discord attachment interface
 */
export interface DiscordAttachment {
  id: string;
  filename: string;
  url: string;
  size: number;
  contentType?: string;
}

/**
 * Discord embed interface
 */
export interface DiscordEmbed {
  title?: string;
  description?: string;
  url?: string;
  color?: number;
  timestamp?: Date;
  footer?: { text: string; iconUrl?: string };
  image?: { url: string };
  thumbnail?: { url: string };
  author?: { name: string; iconUrl?: string; url?: string };
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
}

/**
 * Discord event interface
 */
export interface DiscordEvent {
  id: string;
  name: string;
  description?: string;
  serverId: string;
  channelId?: string;
  startTime: Date;
  endTime?: Date;
  participants: string[];
  organizer: string;
  type: 'gaming' | 'community' | 'voice' | 'custom';
}

/**
 * Discord relationship interface
 */
export interface DiscordRelationship {
  userId: string;
  username: string;
  serverId: string;
  relationshipType: 'friend' | 'member' | 'moderator' | 'admin';
  interactionHistory: DiscordInteraction[];
  lastInteraction?: Date;
  engagementScore: number; // 0-1 based on interaction quality
  commonServers: string[];
  commonInterests: string[];
}

/**
 * Discord interaction interface
 */
export interface DiscordInteraction {
  type: 'message' | 'reaction' | 'voice' | 'game' | 'event';
  messageId?: string;
  channelId: string;
  content?: string;
  timestamp: Date;
  sentiment: number; // -1 to 1
}

/**
 * Discord autonomous action interface
 */
export interface DiscordAutonomousAction {
  type: 'message' | 'reaction' | 'voice_join' | 'voice_leave' | 'event_create' | 'event_join';
  content?: string;
  targetId?: string; // message ID, channel ID, or event ID
  channelId?: string;
  serverId?: string;
  reasoning: string;
  confidence: number; // 0-1
  expectedOutcome: string;
  scheduledFor?: Date;
}

/**
 * Discord performance analytics interface
 */
export interface DiscordPerformanceAnalytics {
  period: 'hour' | 'day' | 'week' | 'month';
  metrics: {
    messagesPosted: number;
    reactionsGiven: number;
    voiceTimeMinutes: number;
    eventsOrganized: number;
    eventsParticipated: number;
    engagementRate: number;
    popularChannels: string[];
    activeServers: string[];
    bestEngagementTimes: string[];
  };
  insights: string[];
  recommendations: string[];
}

/**
 * Discord gaming session interface
 */
export interface DiscordGamingSession {
  id: string;
  game: string;
  serverId: string;
  channelId: string;
  voiceChannelId?: string;
  organizer: string;
  participants: string[];
  maxParticipants?: number;
  startTime: Date;
  endTime?: Date;
  status: 'planned' | 'active' | 'completed' | 'cancelled';
  description?: string;
}

/**
 * Discord voice activity interface
 */
export interface DiscordVoiceActivity {
  channelId: string;
  serverId: string;
  joinTime: Date;
  leaveTime?: Date;
  participants: string[];
  activity: 'gaming' | 'chatting' | 'music' | 'meeting' | 'other';
}

/**
 * Extended log context for Discord extension
 */
export interface DiscordLogContext extends LogContext {
  autonomousMode?: boolean;
  messageFrequency?: number;
  engagementFrequency?: number;
  queueLength?: number;
  serversCount?: number;
  channelsCount?: number;
  messageId?: string;
  channelId?: string;
  serverId?: string;
  content?: string;
  reasoning?: string;
  targetId?: string;
  actionType?: string;
  voiceChannelId?: string;
  eventId?: string;
  gamingSessionId?: string;
}

/**
 * Discord error types enum
 */
export enum DiscordErrorType {
  AUTHENTICATION_FAILED = 'authentication_failed',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  NETWORK_ERROR = 'network_error',
  PERMISSION_DENIED = 'permission_denied',
  MESSAGE_NOT_FOUND = 'message_not_found',
  CHANNEL_NOT_FOUND = 'channel_not_found',
  SERVER_NOT_FOUND = 'server_not_found',
  USER_NOT_FOUND = 'user_not_found',
  INVALID_REQUEST = 'invalid_request',
  BOT_BANNED = 'bot_banned',
  INTERNAL_ERROR = 'internal_error',
  API_ERROR = 'api_error',
}

/**
 * Content generation context for Discord
 */
export interface DiscordContentGenerationContext {
  channelType: 'text' | 'voice' | 'thread';
  serverContext: string;
  channelTopic?: string;
  recentMessages: DiscordMessage[];
  activeUsers: string[];
  emotion: string;
  personality: string[] | Record<string, unknown>;
  currentActivity?: string;
}