/**
 * Unified Context System - Cross-Platform Context Management and Activity Logging
 * 
 * Provides universal activity logging, cross-platform context bridging, activity synthesis,
 * and context-aware retrieval for seamless conversations across all platforms.
 */

import { EventBus, AgentEvent, AgentAction } from '../types/agent';
import { AutonomousAgent } from '../types/autonomous';
import { Logger } from '../utils/logger';

export interface UnifiedContextConfig {
  enabled: boolean;
  activityLogging: {
    enabled: boolean;
    logLevel: 'minimal' | 'standard' | 'detailed' | 'comprehensive';
    retentionDays: number;
    compressionEnabled: boolean;
    realTimeSync: boolean;
  };
  contextBridging: {
    enabled: boolean;
    bridgeThreshold: number; // similarity threshold for bridging contexts
    maxBridgeDistance: number; // maximum time distance for bridging (hours)
    semanticSimilarity: boolean;
    userIdentityLinking: boolean;
  };
  activitySynthesis: {
    enabled: boolean;
    synthesisInterval: number; // minutes
    summaryLevels: ('hourly' | 'daily' | 'weekly' | 'monthly')[];
    insightGeneration: boolean;
    trendAnalysis: boolean;
  };
  contextRetrieval: {
    enabled: boolean;
    maxResults: number;
    relevanceThreshold: number;
    temporalDecay: boolean;
    crossPlatformWeighting: boolean;
    personalizedRanking: boolean;
  };
  privacy: {
    anonymizeUsers: boolean;
    encryptSensitiveData: boolean;
    dataMinimization: boolean;
    consentTracking: boolean;
  };
}

export interface UniversalActivity {
  id: string;
  agentId: string;
  timestamp: Date;
  platform: string;
  activityType: ActivityType;
  action: AgentAction;
  context: ActivityContext;
  participants: Participant[];
  content: ActivityContent;
  outcomes: ActivityOutcome[];
  metadata: ActivityMetadata;
  relationships: ActivityRelationship[];
  privacy: PrivacySettings;
}

export enum ActivityType {
  MESSAGE = 'message',
  REPLY = 'reply',
  POST = 'post',
  REACTION = 'reaction',
  JOIN = 'join',
  LEAVE = 'leave',
  GAME_ACTION = 'game_action',
  SKILL_TRAINING = 'skill_training',
  QUEST_COMPLETION = 'quest_completion',
  SOCIAL_INTERACTION = 'social_interaction',
  CONTENT_CREATION = 'content_creation',
  LEARNING = 'learning',
  PLANNING = 'planning',
  REFLECTION = 'reflection',
  SYSTEM_ACTION = 'system_action'
}

export interface ActivityContext {
  platform: string;
  channel?: string;
  server?: string;
  group?: string;
  thread?: string;
  location?: GameLocation;
  timeContext: TimeContext;
  socialContext: SocialContext;
  environmentalContext: EnvironmentalContext;
  conversationContext?: ConversationContext;
}

export interface GameLocation {
  world: string;
  region: string;
  coordinates?: { x: number; y: number; z?: number };
  area: string;
}

export interface TimeContext {
  timestamp: Date;
  timeZone: string;
  dayOfWeek: number; // 0-6
  hourOfDay: number; // 0-23
  season: 'spring' | 'summer' | 'fall' | 'winter';
  isWeekend: boolean;
  isHoliday: boolean;
}

export interface SocialContext {
  participantCount: number;
  relationshipTypes: Record<string, string>; // userId -> relationship type
  groupDynamics: GroupDynamics;
  conversationTone: 'formal' | 'casual' | 'friendly' | 'professional' | 'playful';
  topicCategory: string;
}

export interface GroupDynamics {
  leadershipStyle: 'democratic' | 'autocratic' | 'laissez-faire';
  cohesion: number; // 0-1
  conflictLevel: number; // 0-1
  participationBalance: number; // 0-1
  newMemberIntegration: number; // 0-1
}

export interface EnvironmentalContext {
  platformActivity: number; // 0-1
  serverLoad: number; // 0-1
  networkLatency: number; // ms
  concurrentUsers: number;
  systemEvents: string[];
  externalFactors: ExternalFactor[];
}

export interface ExternalFactor {
  type: 'news' | 'trend' | 'event' | 'weather' | 'market' | 'social';
  description: string;
  impact: number; // -1 to 1
  relevance: number; // 0-1
}

export interface ConversationContext {
  conversationId: string;
  startTime: Date;
  messageCount: number;
  participants: string[];
  topic: string;
  sentiment: number; // -1 to 1
  engagement: number; // 0-1
  previousContexts: string[]; // related conversation IDs
}

export interface Participant {
  userId: string;
  username: string;
  platform: string;
  role: 'user' | 'moderator' | 'admin' | 'bot' | 'system';
  relationship: 'friend' | 'follower' | 'mutual' | 'stranger' | 'blocked';
  trustLevel: number; // 0-1
  interactionHistory: InteractionSummary;
}

export interface InteractionSummary {
  totalInteractions: number;
  lastInteraction: Date;
  averageSentiment: number; // -1 to 1
  commonTopics: string[];
  interactionQuality: number; // 0-1
}

export interface ActivityContent {
  text?: string;
  media?: MediaContent[];
  links?: LinkContent[];
  mentions?: string[];
  hashtags?: string[];
  gameData?: GameActivityData;
  structuredData?: Record<string, unknown>;
}

export interface MediaContent {
  type: 'image' | 'video' | 'audio' | 'document';
  url: string;
  description?: string;
  metadata: Record<string, unknown>;
}

export interface LinkContent {
  url: string;
  title?: string;
  description?: string;
  domain: string;
  preview?: string;
}

export interface GameActivityData {
  action: string;
  target?: string;
  location: GameLocation;
  items?: string[];
  stats?: Record<string, number>;
  experience?: number;
  achievements?: string[];
}

export interface ActivityOutcome {
  type: 'success' | 'failure' | 'partial' | 'pending';
  metrics: OutcomeMetrics;
  feedback: UserFeedback[];
  sideEffects: SideEffect[];
  learningValue: number; // 0-1
}

export interface OutcomeMetrics {
  engagement: number; // 0-1
  reach: number;
  sentiment: number; // -1 to 1
  goalProgress: number; // 0-1
  resourceUsage: number; // 0-1
  timeToComplete: number; // minutes
  errorRate: number; // 0-1
}

export interface UserFeedback {
  userId: string;
  type: 'positive' | 'negative' | 'neutral' | 'constructive';
  content: string;
  sentiment: number; // -1 to 1
  credibility: number; // 0-1
  timestamp: Date;
}

export interface SideEffect {
  type: 'positive' | 'negative' | 'neutral';
  description: string;
  impact: number; // -1 to 1
  platform: string;
  delayed: boolean;
  measuredAt: Date;
}

export interface ActivityMetadata {
  importance: number; // 0-1
  novelty: number; // 0-1
  complexity: number; // 0-1
  visibility: 'public' | 'private' | 'restricted';
  tags: string[];
  categories: string[];
  version: string;
  source: string;
}

export interface ActivityRelationship {
  type: 'causes' | 'enables' | 'follows' | 'references' | 'contradicts' | 'supports';
  targetActivityId: string;
  strength: number; // 0-1
  confidence: number; // 0-1
  description: string;
}

export interface PrivacySettings {
  level: 'public' | 'internal' | 'private' | 'confidential';
  retention: number; // days
  anonymized: boolean;
  encrypted: boolean;
  consentGiven: boolean;
  dataMinimized: boolean;
}

export interface ContextBridge {
  id: string;
  sourceActivityId: string;
  targetActivityId: string;
  bridgeType: 'temporal' | 'semantic' | 'participant' | 'topic' | 'causal';
  similarity: number; // 0-1
  confidence: number; // 0-1
  createdAt: Date;
  metadata: Record<string, unknown>;
}

export interface ActivitySynthesis {
  id: string;
  timeRange: { start: Date; end: Date };
  level: 'hourly' | 'daily' | 'weekly' | 'monthly';
  platforms: string[];
  summary: SynthesisSummary;
  insights: SynthesisInsight[];
  trends: SynthesisTrend[];
  patterns: SynthesisPattern[];
  recommendations: SynthesisRecommendation[];
  createdAt: Date;
}

export interface SynthesisSummary {
  totalActivities: number;
  platformDistribution: Record<string, number>;
  activityTypeDistribution: Record<string, number>;
  participantCount: number;
  averageEngagement: number;
  sentimentDistribution: { positive: number; neutral: number; negative: number };
  topTopics: string[];
  keyAchievements: string[];
}

export interface SynthesisInsight {
  type: 'behavioral' | 'social' | 'performance' | 'learning' | 'strategic';
  title: string;
  description: string;
  confidence: number; // 0-1
  impact: number; // 0-1
  evidence: string[];
  actionable: boolean;
}

export interface SynthesisTrend {
  metric: string;
  direction: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  magnitude: number; // 0-1
  confidence: number; // 0-1
  timeframe: string;
  platforms: string[];
}

export interface SynthesisPattern {
  name: string;
  description: string;
  frequency: number;
  platforms: string[];
  conditions: string[];
  outcomes: string[];
  reliability: number; // 0-1
}

export interface SynthesisRecommendation {
  type: 'optimization' | 'strategy' | 'learning' | 'social' | 'technical';
  priority: number; // 0-1
  title: string;
  description: string;
  expectedImpact: number; // 0-1
  effort: number; // 0-1
  platforms: string[];
  timeline: string;
}

export interface ContextQuery {
  query: string;
  platforms?: string[];
  timeRange?: { start: Date; end: Date };
  participants?: string[];
  activityTypes?: ActivityType[];
  contextFilters?: ContextFilter[];
  maxResults?: number;
  includeRelated?: boolean;
  crossPlatformBridging?: boolean;
}

export interface ContextFilter {
  field: string;
  operator: 'equals' | 'contains' | 'greater' | 'less' | 'between';
  value: unknown;
  weight?: number; // 0-1
}

export interface ContextSearchResult {
  activity: UniversalActivity;
  relevanceScore: number;
  matchReasons: string[];
  bridgedContexts: ContextBridge[];
  relatedActivities: string[];
  summary: string;
}

export class UnifiedContextSystem {
  private agent: AutonomousAgent;
  private config: UnifiedContextConfig;
  private eventBus: EventBus;
  private logger: Logger;

  private isRunning = false;
  private activityLog: Map<string, UniversalActivity> = new Map();
  private contextBridges: Map<string, ContextBridge> = new Map();
  private syntheses: Map<string, ActivitySynthesis> = new Map();
  private conversationContexts: Map<string, ConversationContext> = new Map();

  private synthesisTimer?: NodeJS.Timeout;
  private lastSynthesis = 0;
  private activityBuffer: UniversalActivity[] = [];

  constructor(
    agent: AutonomousAgent,
    config: UnifiedContextConfig,
    eventBus: EventBus
  ) {
    this.agent = agent;
    this.config = config;
    this.eventBus = eventBus;
    this.logger = new Logger(`unified-context-${agent.id}`);

    this.registerEventHandlers();
  }

  /**
   * Start the unified context system
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Unified context system already running');
      return;
    }

    this.logger.info('Starting unified context system...');
    this.isRunning = true;

    // Load existing activity log
    await this.loadActivityLog();

    // Start synthesis loop
    if (this.config.activitySynthesis.enabled) {
      this.startSynthesisLoop();
    }

    this.logger.info('Unified context system started successfully');
  }

  /**
   * Stop the unified context system
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return;

    this.logger.info('Stopping unified context system...');
    this.isRunning = false;

    // Clear synthesis timer
    if (this.synthesisTimer) {
      clearTimeout(this.synthesisTimer);
      this.synthesisTimer = undefined;
    }

    // Save activity log
    await this.saveActivityLog();

    this.logger.info('Unified context system stopped');
  }

  /**
   * Log a universal activity
   */
  async logActivity(
    action: AgentAction,
    context: ActivityContext,
    participants: Participant[],
    content: ActivityContent,
    outcomes: ActivityOutcome[] = []
  ): Promise<string> {
    if (!this.config.activityLogging.enabled) {
      return '';
    }

    const activityId = `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const activity: UniversalActivity = {
      id: activityId,
      agentId: this.agent.id,
      timestamp: new Date(),
      platform: context.platform,
      activityType: this.mapActionToActivityType(action),
      action,
      context,
      participants,
      content,
      outcomes,
      metadata: await this.generateActivityMetadata(action, context, content),
      relationships: await this.identifyActivityRelationships(action, context),
      privacy: this.determinePrivacySettings(context, content)
    };

    // Store activity
    this.activityLog.set(activityId, activity);
    this.activityBuffer.push(activity);

    // Create context bridges if enabled
    if (this.config.contextBridging.enabled) {
      await this.createContextBridges(activity);
    }

    // Update conversation context
    await this.updateConversationContext(activity);

    // Emit activity logged event
    await this.eventBus.publish({
      id: `event_${Date.now()}`,
      type: 'activity_logged',
      source: 'unified_context',
      data: {
        agentId: this.agent.id,
        activityId,
        platform: context.platform,
        activityType: activity.activityType,
        participantCount: participants.length
      },
      timestamp: new Date(),
      processed: false
    });

    this.logger.debug(`Logged activity: ${activityId} (${context.platform})`);
    return activityId;
  }

  /**
   * Search for contextually relevant activities
   */
  async searchContext(query: ContextQuery): Promise<ContextSearchResult[]> {
    if (!this.config.contextRetrieval.enabled) {
      return [];
    }

    const activities = Array.from(this.activityLog.values());
    let filteredActivities = activities;

    // Apply filters
    if (query.platforms) {
      filteredActivities = filteredActivities.filter(a => 
        query.platforms!.includes(a.platform)
      );
    }

    if (query.timeRange) {
      filteredActivities = filteredActivities.filter(a =>
        a.timestamp >= query.timeRange!.start && 
        a.timestamp <= query.timeRange!.end
      );
    }

    if (query.participants) {
      filteredActivities = filteredActivities.filter(a =>
        a.participants.some(p => query.participants!.includes(p.userId))
      );
    }

    if (query.activityTypes) {
      filteredActivities = filteredActivities.filter(a =>
        query.activityTypes!.includes(a.activityType)
      );
    }

    // Apply context filters
    if (query.contextFilters) {
      for (const filter of query.contextFilters) {
        filteredActivities = this.applyContextFilter(filteredActivities, filter);
      }
    }

    // Calculate relevance scores
    const results: ContextSearchResult[] = [];
    for (const activity of filteredActivities) {
      const relevanceScore = await this.calculateRelevanceScore(activity, query);
      
      if (relevanceScore >= this.config.contextRetrieval.relevanceThreshold) {
        const result: ContextSearchResult = {
          activity,
          relevanceScore,
          matchReasons: await this.generateMatchReasons(activity, query),
          bridgedContexts: await this.findBridgedContexts(activity.id),
          relatedActivities: await this.findRelatedActivities(activity.id),
          summary: await this.generateActivitySummary(activity)
        };

        results.push(result);
      }
    }

    // Sort by relevance and apply temporal decay if enabled
    results.sort((a, b) => {
      let scoreA = a.relevanceScore;
      let scoreB = b.relevanceScore;

      if (this.config.contextRetrieval.temporalDecay) {
        const now = Date.now();
        const ageA = (now - a.activity.timestamp.getTime()) / (24 * 60 * 60 * 1000); // days
        const ageB = (now - b.activity.timestamp.getTime()) / (24 * 60 * 60 * 1000); // days
        
        scoreA *= Math.exp(-ageA * 0.1); // Exponential decay
        scoreB *= Math.exp(-ageB * 0.1);
      }

      return scoreB - scoreA;
    });

    // Apply cross-platform bridging if enabled
    if (query.crossPlatformBridging && this.config.contextBridging.enabled) {
      await this.enhanceWithCrossPlatformContext(results);
    }

    // Limit results
    const maxResults = query.maxResults || this.config.contextRetrieval.maxResults;
    return results.slice(0, maxResults);
  }

  /**
   * Get activity synthesis for a time range
   */
  async getSynthesis(
    level: 'hourly' | 'daily' | 'weekly' | 'monthly',
    timeRange: { start: Date; end: Date },
    platforms?: string[]
  ): Promise<ActivitySynthesis | null> {
    const synthesisId = `${level}_${timeRange.start.getTime()}_${timeRange.end.getTime()}`;
    
    // Check if synthesis already exists
    let synthesis = this.syntheses.get(synthesisId);
    if (synthesis) {
      return synthesis;
    }

    // Generate new synthesis
    synthesis = await this.generateSynthesis(level, timeRange, platforms);
    if (synthesis) {
      this.syntheses.set(synthesisId, synthesis);
    }

    return synthesis;
  }

  /**
   * Get conversation context for cross-platform conversations
   */
  getConversationContext(conversationId: string): ConversationContext | undefined {
    return this.conversationContexts.get(conversationId);
  }

  /**
   * Get all activities for a specific platform
   */
  getPlatformActivities(platform: string, limit?: number): UniversalActivity[] {
    const activities = Array.from(this.activityLog.values())
      .filter(a => a.platform === platform)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return limit ? activities.slice(0, limit) : activities;
  }

  /**
   * Get activity statistics
   */
  getActivityStatistics(): {
    totalActivities: number;
    platformDistribution: Record<string, number>;
    activityTypeDistribution: Record<string, number>;
    averageEngagement: number;
    recentActivity: number;
  } {
    const activities = Array.from(this.activityLog.values());
    const now = Date.now();
    const recentThreshold = 24 * 60 * 60 * 1000; // 24 hours

    const platformDistribution: Record<string, number> = {};
    const activityTypeDistribution: Record<string, number> = {};
    let totalEngagement = 0;
    let recentActivity = 0;

    for (const activity of activities) {
      // Platform distribution
      platformDistribution[activity.platform] = (platformDistribution[activity.platform] || 0) + 1;

      // Activity type distribution
      activityTypeDistribution[activity.activityType] = (activityTypeDistribution[activity.activityType] || 0) + 1;

      // Engagement
      const engagement = activity.outcomes.reduce((sum, outcome) => sum + outcome.metrics.engagement, 0) / Math.max(1, activity.outcomes.length);
      totalEngagement += engagement;

      // Recent activity
      if (now - activity.timestamp.getTime() < recentThreshold) {
        recentActivity++;
      }
    }

    return {
      totalActivities: activities.length,
      platformDistribution,
      activityTypeDistribution,
      averageEngagement: activities.length > 0 ? totalEngagement / activities.length : 0,
      recentActivity
    };
  }

  /**
   * Start synthesis loop
   */
  private startSynthesisLoop(): void {
    const runSynthesis = async () => {
      if (!this.isRunning) return;

      try {
        const now = Date.now();

        if (now - this.lastSynthesis > this.config.activitySynthesis.synthesisInterval * 60 * 1000) {
          await this.performPeriodicSynthesis();
          this.lastSynthesis = now;
        }

        this.synthesisTimer = setTimeout(runSynthesis, 60000); // Run every minute

      } catch (error) {
        this.logger.error('Error in synthesis loop:', error);
        this.synthesisTimer = setTimeout(runSynthesis, 60000);
      }
    };

    runSynthesis();
  }

  /**
   * Perform periodic synthesis
   */
  private async performPeriodicSynthesis(): Promise<void> {
    const now = new Date();
    
    for (const level of this.config.activitySynthesis.summaryLevels) {
      const timeRange = this.getTimeRangeForLevel(level, now);
      await this.getSynthesis(level, timeRange);
    }

    this.logger.debug('Performed periodic synthesis');
  }

  // Helper methods
  private mapActionToActivityType(action: AgentAction): ActivityType {
    const mapping: Record<string, ActivityType> = {
      'send_message': ActivityType.MESSAGE,
      'reply': ActivityType.REPLY,
      'post': ActivityType.POST,
      'react': ActivityType.REACTION,
      'join': ActivityType.JOIN,
      'leave': ActivityType.LEAVE,
      'game_action': ActivityType.GAME_ACTION,
      'train_skill': ActivityType.SKILL_TRAINING,
      'complete_quest': ActivityType.QUEST_COMPLETION,
      'social_interaction': ActivityType.SOCIAL_INTERACTION,
      'create_content': ActivityType.CONTENT_CREATION,
      'learn': ActivityType.LEARNING,
      'plan': ActivityType.PLANNING,
      'reflect': ActivityType.REFLECTION
    };

    return mapping[action.action] || ActivityType.SYSTEM_ACTION;
  }

  private async generateActivityMetadata(
    action: AgentAction,
    context: ActivityContext,
    content: ActivityContent
  ): Promise<ActivityMetadata> {
    return {
      importance: await this.calculateImportance(action, context, content),
      novelty: await this.calculateNovelty(action, context, content),
      complexity: await this.calculateComplexity(action, context, content),
      visibility: this.determineVisibility(context, content),
      tags: this.generateTags(action, context, content),
      categories: this.generateCategories(action, context, content),
      version: '1.0',
      source: 'unified_context_system'
    };
  }

  private async identifyActivityRelationships(
    action: AgentAction,
    context: ActivityContext
  ): Promise<ActivityRelationship[]> {
    const relationships: ActivityRelationship[] = [];
    
    // Find related activities based on conversation context
    if (context.conversationContext) {
      const relatedActivities = Array.from(this.activityLog.values())
        .filter(a => a.context.conversationContext?.conversationId === context.conversationContext?.conversationId)
        .slice(-5); // Last 5 activities in conversation

      for (const relatedActivity of relatedActivities) {
        relationships.push({
          type: 'follows',
          targetActivityId: relatedActivity.id,
          strength: 0.8,
          confidence: 0.9,
          description: 'Part of same conversation'
        });
      }
    }

    return relationships;
  }

  private determinePrivacySettings(context: ActivityContext, content: ActivityContent): PrivacySettings {
    let level: PrivacySettings['level'] = 'public';
    
    // Determine privacy level based on context and content
    if (context.channel?.includes('private') || context.group?.includes('private')) {
      level = 'private';
    } else if (content.mentions && content.mentions.length > 0) {
      level = 'internal';
    }

    return {
      level,
      retention: this.config.activityLogging.retentionDays,
      anonymized: this.config.privacy.anonymizeUsers,
      encrypted: this.config.privacy.encryptSensitiveData,
      consentGiven: this.config.privacy.consentTracking,
      dataMinimized: this.config.privacy.dataMinimization
    };
  }

  private async createContextBridges(activity: UniversalActivity): Promise<void> {
    const recentActivities = Array.from(this.activityLog.values())
      .filter(a => 
        a.id !== activity.id &&
        Date.now() - a.timestamp.getTime() < this.config.contextBridging.maxBridgeDistance * 60 * 60 * 1000
      );

    for (const otherActivity of recentActivities) {
      const similarity = await this.calculateActivitySimilarity(activity, otherActivity);
      
      if (similarity >= this.config.contextBridging.bridgeThreshold) {
        const bridgeId = `bridge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const bridge: ContextBridge = {
          id: bridgeId,
          sourceActivityId: activity.id,
          targetActivityId: otherActivity.id,
          bridgeType: this.determineBridgeType(activity, otherActivity),
          similarity,
          confidence: similarity,
          createdAt: new Date(),
          metadata: {}
        };

        this.contextBridges.set(bridgeId, bridge);
      }
    }
  }

  private async updateConversationContext(activity: UniversalActivity): Promise<void> {
    const conversationId = activity.context.conversationContext?.conversationId;
    if (!conversationId) return;

    let context = this.conversationContexts.get(conversationId);
    
    if (!context) {
      context = {
        conversationId,
        startTime: activity.timestamp,
        messageCount: 0,
        participants: [],
        topic: '',
        sentiment: 0,
        engagement: 0,
        previousContexts: []
      };
    }

    // Update context
    context.messageCount++;
    
    // Add new participants
    for (const participant of activity.participants) {
      if (!context.participants.includes(participant.userId)) {
        context.participants.push(participant.userId);
      }
    }

    // Update sentiment and engagement
    if (activity.outcomes.length > 0) {
      const avgSentiment = activity.outcomes.reduce((sum, o) => sum + o.metrics.sentiment, 0) / activity.outcomes.length;
      const avgEngagement = activity.outcomes.reduce((sum, o) => sum + o.metrics.engagement, 0) / activity.outcomes.length;
      
      context.sentiment = (context.sentiment + avgSentiment) / 2;
      context.engagement = (context.engagement + avgEngagement) / 2;
    }

    this.conversationContexts.set(conversationId, context);
  }

  // Stub methods for complex calculations
  private async calculateActivitySimilarity(activity1: UniversalActivity, activity2: UniversalActivity): Promise<number> {
    let similarity = 0;

    // Platform similarity
    if (activity1.platform === activity2.platform) similarity += 0.2;

    // Activity type similarity
    if (activity1.activityType === activity2.activityType) similarity += 0.3;

    // Participant similarity
    const commonParticipants = activity1.participants.filter(p1 =>
      activity2.participants.some(p2 => p1.userId === p2.userId)
    );
    similarity += (commonParticipants.length / Math.max(activity1.participants.length, activity2.participants.length)) * 0.3;

    // Temporal similarity
    const timeDiff = Math.abs(activity1.timestamp.getTime() - activity2.timestamp.getTime());
    const maxTimeDiff = 24 * 60 * 60 * 1000; // 24 hours
    similarity += Math.max(0, 1 - (timeDiff / maxTimeDiff)) * 0.2;

    return Math.max(0, Math.min(1, similarity));
  }

  private determineBridgeType(activity1: UniversalActivity, activity2: UniversalActivity): ContextBridge['bridgeType'] {
    // Determine the type of bridge based on activities
    if (Math.abs(activity1.timestamp.getTime() - activity2.timestamp.getTime()) < 60 * 60 * 1000) {
      return 'temporal';
    }

    const commonParticipants = activity1.participants.filter(p1 =>
      activity2.participants.some(p2 => p1.userId === p2.userId)
    );
    if (commonParticipants.length > 0) {
      return 'participant';
    }

    if (activity1.activityType === activity2.activityType) {
      return 'semantic';
    }

    return 'semantic';
  }

  private async calculateRelevanceScore(activity: UniversalActivity, query: ContextQuery): Promise<number> {
    let score = 0;

    // Text similarity (simplified)
    if (query.query && activity.content.text) {
      const queryWords = query.query.toLowerCase().split(' ');
      const contentWords = activity.content.text.toLowerCase().split(' ');
      const commonWords = queryWords.filter(word => contentWords.includes(word));
      score += (commonWords.length / queryWords.length) * 0.5;
    }

    // Recency bonus
    const age = (Date.now() - activity.timestamp.getTime()) / (24 * 60 * 60 * 1000); // days
    score += Math.max(0, 1 - age * 0.1) * 0.3;

    // Importance bonus
    score += activity.metadata.importance * 0.2;

    return Math.max(0, Math.min(1, score));
  }

  private applyContextFilter(activities: UniversalActivity[], filter: ContextFilter): UniversalActivity[] {
    return activities.filter(activity => {
      const value = this.getFilterValue(activity, filter.field);
      return this.evaluateFilterCondition(value, filter.operator, filter.value);
    });
  }

  private getFilterValue(activity: UniversalActivity, field: string): unknown {
    // Extract value from activity based on field path
    const parts = field.split('.');
    let value: any = activity;
    
    for (const part of parts) {
      value = value?.[part];
    }
    
    return value;
  }

  private evaluateFilterCondition(value: unknown, operator: string, filterValue: unknown): boolean {
    switch (operator) {
      case 'equals':
        return value === filterValue;
      case 'contains':
        return typeof value === 'string' && typeof filterValue === 'string' && 
               value.toLowerCase().includes(filterValue.toLowerCase());
      case 'greater':
        return typeof value === 'number' && typeof filterValue === 'number' && value > filterValue;
      case 'less':
        return typeof value === 'number' && typeof filterValue === 'number' && value < filterValue;
      case 'between':
        return Array.isArray(filterValue) && typeof value === 'number' &&
               value >= filterValue[0] && value <= filterValue[1];
      default:
        return false;
    }
  }

  private async generateMatchReasons(activity: UniversalActivity, query: ContextQuery): Promise<string[]> {
    const reasons: string[] = [];
    
    if (query.query && activity.content.text?.toLowerCase().includes(query.query.toLowerCase())) {
      reasons.push('Text content match');
    }
    
    if (query.platforms?.includes(activity.platform)) {
      reasons.push('Platform match');
    }
    
    if (query.activityTypes?.includes(activity.activityType)) {
      reasons.push('Activity type match');
    }

    return reasons;
  }

  private async findBridgedContexts(activityId: string): Promise<ContextBridge[]> {
    return Array.from(this.contextBridges.values()).filter(bridge =>
      bridge.sourceActivityId === activityId || bridge.targetActivityId === activityId
    );
  }

  private async findRelatedActivities(activityId: string): Promise<string[]> {
    const activity = this.activityLog.get(activityId);
    if (!activity) return [];

    return activity.relationships.map(rel => rel.targetActivityId);
  }

  private async generateActivitySummary(activity: UniversalActivity): Promise<string> {
    return `${activity.activityType} on ${activity.platform} at ${activity.timestamp.toISOString()}`;
  }

  private async enhanceWithCrossPlatformContext(results: ContextSearchResult[]): Promise<void> {
    // Enhance results with cross-platform context
    for (const result of results) {
      const bridges = await this.findBridgedContexts(result.activity.id);
      result.bridgedContexts = bridges;
    }
  }

  private async generateSynthesis(
    level: 'hourly' | 'daily' | 'weekly' | 'monthly',
    timeRange: { start: Date; end: Date },
    platforms?: string[]
  ): Promise<ActivitySynthesis> {
    const activities = Array.from(this.activityLog.values()).filter(activity => {
      const inTimeRange = activity.timestamp >= timeRange.start && activity.timestamp <= timeRange.end;
      const inPlatforms = !platforms || platforms.includes(activity.platform);
      return inTimeRange && inPlatforms;
    });

    const synthesisId = `synthesis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      id: synthesisId,
      timeRange,
      level,
      platforms: platforms || [...new Set(activities.map(a => a.platform))],
      summary: await this.generateSynthesisSummary(activities),
      insights: await this.generateSynthesisInsights(activities),
      trends: await this.generateSynthesisTrends(activities),
      patterns: await this.generateSynthesisPatterns(activities),
      recommendations: await this.generateSynthesisRecommendations(activities),
      createdAt: new Date()
    };
  }

  private getTimeRangeForLevel(level: string, now: Date): { start: Date; end: Date } {
    const end = new Date(now);
    const start = new Date(now);

    switch (level) {
      case 'hourly':
        start.setHours(start.getHours() - 1);
        break;
      case 'daily':
        start.setDate(start.getDate() - 1);
        break;
      case 'weekly':
        start.setDate(start.getDate() - 7);
        break;
      case 'monthly':
        start.setMonth(start.getMonth() - 1);
        break;
    }

    return { start, end };
  }

  // Stub methods for complex operations
  private async loadActivityLog(): Promise<void> {
    this.logger.debug('Loading activity log from storage');
  }

  private async saveActivityLog(): Promise<void> {
    this.logger.debug('Saving activity log to storage');
  }

  private async calculateImportance(action: AgentAction, context: ActivityContext, content: ActivityContent): Promise<number> {
    return 0.5; // Placeholder
  }

  private async calculateNovelty(action: AgentAction, context: ActivityContext, content: ActivityContent): Promise<number> {
    return 0.5; // Placeholder
  }

  private async calculateComplexity(action: AgentAction, context: ActivityContext, content: ActivityContent): Promise<number> {
    return 0.5; // Placeholder
  }

  private determineVisibility(context: ActivityContext, content: ActivityContent): 'public' | 'private' | 'restricted' {
    return 'public'; // Placeholder
  }

  private generateTags(action: AgentAction, context: ActivityContext, content: ActivityContent): string[] {
    return [context.platform, action.type]; // Placeholder
  }

  private generateCategories(action: AgentAction, context: ActivityContext, content: ActivityContent): string[] {
    return ['general']; // Placeholder
  }

  private async generateSynthesisSummary(activities: UniversalActivity[]): Promise<SynthesisSummary> {
    const platformDistribution: Record<string, number> = {};
    const activityTypeDistribution: Record<string, number> = {};
    let totalEngagement = 0;
    const participants = new Set<string>();

    for (const activity of activities) {
      platformDistribution[activity.platform] = (platformDistribution[activity.platform] || 0) + 1;
      activityTypeDistribution[activity.activityType] = (activityTypeDistribution[activity.activityType] || 0) + 1;
      
      const engagement = activity.outcomes.reduce((sum, o) => sum + o.metrics.engagement, 0) / Math.max(1, activity.outcomes.length);
      totalEngagement += engagement;

      activity.participants.forEach(p => participants.add(p.userId));
    }

    return {
      totalActivities: activities.length,
      platformDistribution,
      activityTypeDistribution,
      participantCount: participants.size,
      averageEngagement: activities.length > 0 ? totalEngagement / activities.length : 0,
      sentimentDistribution: { positive: 0.6, neutral: 0.3, negative: 0.1 }, // Placeholder
      topTopics: ['general'], // Placeholder
      keyAchievements: ['Active participation'] // Placeholder
    };
  }

  private async generateSynthesisInsights(activities: UniversalActivity[]): Promise<SynthesisInsight[]> {
    return []; // Placeholder
  }

  private async generateSynthesisTrends(activities: UniversalActivity[]): Promise<SynthesisTrend[]> {
    return []; // Placeholder
  }

  private async generateSynthesisPatterns(activities: UniversalActivity[]): Promise<SynthesisPattern[]> {
    return []; // Placeholder
  }

  private async generateSynthesisRecommendations(activities: UniversalActivity[]): Promise<SynthesisRecommendation[]> {
    return []; // Placeholder
  }

  private registerEventHandlers(): void {
    // Register event handlers for context-related events
    this.logger.debug('Registering unified context event handlers');
  }
}

/**
 * Create default unified context configuration
 */
export function createDefaultUnifiedContextConfig(): UnifiedContextConfig {
  return {
    enabled: true,
    activityLogging: {
      enabled: true,
      logLevel: 'standard',
      retentionDays: 30,
      compressionEnabled: true,
      realTimeSync: true
    },
    contextBridging: {
      enabled: true,
      bridgeThreshold: 0.7,
      maxBridgeDistance: 24, // hours
      semanticSimilarity: true,
      userIdentityLinking: true
    },
    activitySynthesis: {
      enabled: true,
      synthesisInterval: 60, // minutes
      summaryLevels: ['daily', 'weekly'],
      insightGeneration: true,
      trendAnalysis: true
    },
    contextRetrieval: {
      enabled: true,
      maxResults: 50,
      relevanceThreshold: 0.5,
      temporalDecay: true,
      crossPlatformWeighting: true,
      personalizedRanking: true
    },
    privacy: {
      anonymizeUsers: false,
      encryptSensitiveData: true,
      dataMinimization: true,
      consentTracking: true
    }
  };
}