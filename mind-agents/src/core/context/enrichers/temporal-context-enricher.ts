/**
 * Temporal Context Enricher for SYMindX
 *
 * This enricher adds time-based context information including current time,
 * temporal patterns, session duration, and chronological markers to help
 * agents understand temporal context and make time-aware decisions.
 */

import { BaseContextEnricher } from './base-enricher';
import {
  EnrichmentRequest,
  TemporalEnrichmentData,
  EnrichmentPriority,
  EnrichmentStage,
} from '../../../types/context/context-enrichment';
import { Context } from '../../../types/common';
import { OperationResult } from '../../../types/helpers';

/**
 * Configuration specific to temporal enrichment
 */
export interface TemporalEnricherConfig {
  includeSeasonalContext: boolean;
  includeRelativeTime: boolean;
  includeChronologicalMarkers: boolean;
  timezone: string; // IANA timezone identifier
  sessionTrackingEnabled: boolean;
  businessHours: {
    start: string; // HH:MM format
    end: string; // HH:MM format
    weekdays: number[]; // 0-6, Sunday = 0
  };
}

/**
 * Session tracking data for temporal context
 */
interface SessionData {
  sessionId: string;
  startTime: Date;
  lastActivity: Date;
  interactionCount: number;
  isFirstSession: boolean;
}

/**
 * Temporal Context Enricher
 *
 * Enriches context with temporal information, time patterns,
 * and chronological awareness to enable time-sensitive agent behavior.
 */
export class TemporalContextEnricher extends BaseContextEnricher {
  private enricherConfig: TemporalEnricherConfig;
  private sessionData = new Map<string, SessionData>();
  private userSessionHistory = new Map<string, Date[]>(); // User ID -> session start times

  constructor(config: Partial<TemporalEnricherConfig> = {}) {
    super('temporal-context-enricher', 'Temporal Context Enricher', '1.0.0', {
      enabled: true,
      priority: EnrichmentPriority.LOW,
      stage: EnrichmentStage.PRE_PROCESSING,
      timeout: 500,
      maxRetries: 2,
      cacheEnabled: true,
      cacheTtl: 30, // 30 seconds cache for temporal data
      dependsOn: [],
    });

    // Default temporal enricher configuration
    this.enricherConfig = {
      includeSeasonalContext: true,
      includeRelativeTime: true,
      includeChronologicalMarkers: true,
      timezone: 'UTC',
      sessionTrackingEnabled: true,
      businessHours: {
        start: '09:00',
        end: '17:00',
        weekdays: [1, 2, 3, 4, 5], // Monday to Friday
      },
      ...config,
    };
  }

  /**
   * Get the keys this enricher provides
   */
  getProvidedKeys(): string[] {
    return [
      'temporalContext',
      'currentTimestamp',
      'timeOfDay',
      'dayOfWeek',
      'seasonalContext',
      'relativeTime',
      'chronologicalMarkers',
      'temporalInsights',
    ];
  }

  /**
   * Get the keys this enricher requires
   */
  getRequiredKeys(): string[] {
    return []; // Temporal enricher doesn't depend on other enrichers
  }

  /**
   * Perform temporal enricher initialization
   */
  protected async doInitialize(): Promise<OperationResult> {
    try {
      this.log('info', 'Temporal context enricher initialized', {
        timezone: this.enricherConfig.timezone,
        sessionTrackingEnabled: this.enricherConfig.sessionTrackingEnabled,
        businessHours: this.enricherConfig.businessHours,
      });

      return {
        success: true,
        message: 'Temporal context enricher initialized successfully',
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Perform temporal-based context enrichment
   */
  protected async doEnrich(
    request: EnrichmentRequest
  ): Promise<Record<string, unknown>> {
    const now = new Date();
    const agentId = request.agentId;
    const context = request.context;

    // Get or create session data
    const sessionData = this.getOrCreateSessionData(context, now);

    // Build comprehensive temporal data
    const temporalData: TemporalEnrichmentData = {
      currentTimestamp: now,
      timezone: this.enricherConfig.timezone,
      timeOfDay: this.getTimeOfDay(now),
      dayOfWeek: this.getDayOfWeek(now),
      isWeekend: this.isWeekend(now),
      seasonalContext: this.enricherConfig.includeSeasonalContext
        ? this.getSeasonalContext(now)
        : undefined,
      relativeTime: this.enricherConfig.includeRelativeTime
        ? this.getRelativeTime(sessionData, context, now)
        : {
            sessionDuration: 0,
            timeSinceLastInteraction: 0,
            conversationAge: 0,
          },
      chronologicalMarkers: this.enricherConfig.includeChronologicalMarkers
        ? this.getChronologicalMarkers(sessionData, context, agentId)
        : {
            isFirstInteraction: false,
            isNewSession: false,
            isReturningUser: false,
          },
    };

    // Update session data
    if (sessionData) {
      this.updateSessionData(sessionData, now);
    }

    // Generate temporal insights
    const temporalInsights = this.generateTemporalInsights(
      temporalData,
      context
    );

    return {
      temporalContext: temporalData,
      currentTimestamp: temporalData.currentTimestamp,
      timeOfDay: temporalData.timeOfDay,
      dayOfWeek: temporalData.dayOfWeek,
      seasonalContext: temporalData.seasonalContext,
      relativeTime: temporalData.relativeTime,
      chronologicalMarkers: temporalData.chronologicalMarkers,
      temporalInsights,
    };
  }

  /**
   * Check if this enricher can process the given context
   */
  protected doCanEnrich(context: Context): boolean {
    // Temporal enricher can work with any context
    return true;
  }

  /**
   * Perform temporal enricher health check
   */
  protected async doHealthCheck(): Promise<OperationResult> {
    try {
      // Test timezone and date functionality
      const now = new Date();
      const timeOfDay = this.getTimeOfDay(now);
      const dayOfWeek = this.getDayOfWeek(now);

      const isValid = timeOfDay !== 'unknown' && dayOfWeek !== 'unknown';

      return {
        success: isValid,
        message: isValid
          ? 'Temporal context enricher is healthy'
          : 'Temporal context enricher has issues with time calculation',
        metadata: {
          currentTime: now,
          timeOfDay,
          dayOfWeek,
          timezone: this.enricherConfig.timezone,
          activeSessions: this.sessionData.size,
          trackedUsers: this.userSessionHistory.size,
          configuration: this.enricherConfig,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Clean up temporal enricher resources
   */
  protected async doDispose(): Promise<OperationResult> {
    try {
      // Clear session data
      this.sessionData.clear();
      this.userSessionHistory.clear();

      return {
        success: true,
        message: 'Temporal context enricher disposed successfully',
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  // Private helper methods

  /**
   * Get or create session data
   */
  private getOrCreateSessionData(
    context: Context,
    now: Date
  ): SessionData | null {
    if (!this.enricherConfig.sessionTrackingEnabled) {
      return null;
    }

    const sessionId = this.extractSessionId(context);
    if (!sessionId) {
      return null;
    }

    let session = this.sessionData.get(sessionId);

    if (!session) {
      const userId = (context.userId as string) || 'unknown';
      const userSessions = this.userSessionHistory.get(userId) || [];

      session = {
        sessionId,
        startTime: now,
        lastActivity: now,
        interactionCount: 0,
        isFirstSession: userSessions.length === 0,
      };

      this.sessionData.set(sessionId, session);

      // Track user session history
      userSessions.push(now);
      this.userSessionHistory.set(userId, userSessions);
    }

    return session;
  }

  /**
   * Extract session ID from context
   */
  private extractSessionId(context: Context): string | null {
    // Try various ways to get session ID
    if (context.sessionId && typeof context.sessionId === 'string') {
      return context.sessionId;
    }

    if (context.conversationId && typeof context.conversationId === 'string') {
      return context.conversationId;
    }

    // Generate session ID from user ID and current hour (simple session grouping)
    if (context.userId && typeof context.userId === 'string') {
      const hour = new Date().getHours();
      const date = new Date().toDateString();
      return `${context.userId}-${date}-${hour}`;
    }

    return null;
  }

  /**
   * Update session data with new activity
   */
  private updateSessionData(session: SessionData, now: Date): void {
    session.lastActivity = now;
    session.interactionCount++;
  }

  /**
   * Get time of day classification
   */
  private getTimeOfDay(date: Date): TemporalEnrichmentData['timeOfDay'] {
    const hour = date.getHours();

    if (hour >= 5 && hour < 12) {
      return 'morning';
    } else if (hour >= 12 && hour < 17) {
      return 'afternoon';
    } else if (hour >= 17 && hour < 21) {
      return 'evening';
    } else {
      return 'night';
    }
  }

  /**
   * Get day of week
   */
  private getDayOfWeek(date: Date): string {
    const days = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];
    return days[date.getDay()] || 'unknown';
  }

  /**
   * Check if date is weekend
   */
  private isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6; // Sunday or Saturday
  }

  /**
   * Get seasonal context
   */
  private getSeasonalContext(
    date: Date
  ): TemporalEnrichmentData['seasonalContext'] {
    const month = date.getMonth() + 1; // 0-based to 1-based
    const quarter = Math.ceil(month / 3);

    let season: 'spring' | 'summer' | 'fall' | 'winter';

    // Northern hemisphere seasons (approximate)
    if (month >= 3 && month <= 5) {
      season = 'spring';
    } else if (month >= 6 && month <= 8) {
      season = 'summer';
    } else if (month >= 9 && month <= 11) {
      season = 'fall';
    } else {
      season = 'winter';
    }

    return {
      season,
      month: date.toLocaleString('default', { month: 'long' }),
      quarter,
    };
  }

  /**
   * Get relative time information
   */
  private getRelativeTime(
    sessionData: SessionData | null,
    context: Context,
    now: Date
  ): TemporalEnrichmentData['relativeTime'] {
    const relativeTime: TemporalEnrichmentData['relativeTime'] = {
      sessionDuration: 0,
      timeSinceLastInteraction: 0,
      conversationAge: 0,
    };

    if (sessionData) {
      relativeTime.sessionDuration =
        now.getTime() - sessionData.startTime.getTime();
      relativeTime.timeSinceLastInteraction =
        now.getTime() - sessionData.lastActivity.getTime();
    }

    // Try to get conversation age from context
    if (
      context.conversationStartTime &&
      context.conversationStartTime instanceof Date
    ) {
      relativeTime.conversationAge =
        now.getTime() - context.conversationStartTime.getTime();
    } else if (context.timestamp && context.timestamp instanceof Date) {
      relativeTime.conversationAge =
        now.getTime() - context.timestamp.getTime();
    } else if (sessionData) {
      relativeTime.conversationAge = relativeTime.sessionDuration;
    }

    return relativeTime;
  }

  /**
   * Get chronological markers
   */
  private getChronologicalMarkers(
    sessionData: SessionData | null,
    context: Context,
    agentId: string
  ): TemporalEnrichmentData['chronologicalMarkers'] {
    const markers: TemporalEnrichmentData['chronologicalMarkers'] = {
      isFirstInteraction: false,
      isNewSession: false,
      isReturningUser: false,
    };

    if (sessionData) {
      // Check if this is the first interaction in the session
      markers.isFirstInteraction = sessionData.interactionCount === 0;

      // Check if this is a new session (less than 5 minutes old)
      const sessionAge = Date.now() - sessionData.startTime.getTime();
      markers.isNewSession = sessionAge < 5 * 60 * 1000; // 5 minutes

      // Check if this is a returning user (not first session)
      markers.isReturningUser = !sessionData.isFirstSession;
    }

    return markers;
  }

  /**
   * Generate temporal insights
   */
  private generateTemporalInsights(
    temporalData: TemporalEnrichmentData,
    context: Context
  ): Record<string, unknown> {
    const insights = {
      available: true,
      timestamp: temporalData.currentTimestamp,
      businessHoursAnalysis: this.analyzeBusinessHours(temporalData),
      sessionAnalysis: this.analyzeSession(temporalData),
      temporalPatterns: this.analyzeTemporalPatterns(temporalData),
      recommendations: this.generateTemporalRecommendations(temporalData),
    };

    return insights;
  }

  /**
   * Analyze business hours context
   */
  private analyzeBusinessHours(
    temporalData: TemporalEnrichmentData
  ): Record<string, unknown> {
    const now = temporalData.currentTimestamp;
    const dayOfWeek = now.getDay();
    const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const isBusinessDay =
      this.enricherConfig.businessHours.weekdays.includes(dayOfWeek);
    const isBusinessHours =
      isBusinessDay &&
      timeString >= this.enricherConfig.businessHours.start &&
      timeString <= this.enricherConfig.businessHours.end;

    return {
      isBusinessHours,
      isBusinessDay,
      currentTime: timeString,
      businessStart: this.enricherConfig.businessHours.start,
      businessEnd: this.enricherConfig.businessHours.end,
      minutesUntilBusinessStart:
        isBusinessDay && !isBusinessHours
          ? this.calculateMinutesUntilBusinessStart(now)
          : null,
      minutesUntilBusinessEnd: isBusinessHours
        ? this.calculateMinutesUntilBusinessEnd(now)
        : null,
    };
  }

  /**
   * Calculate minutes until business hours start
   */
  private calculateMinutesUntilBusinessStart(now: Date): number {
    const [startHour, startMinute] = this.enricherConfig.businessHours.start
      .split(':')
      .map(Number);
    const businessStart = new Date(now);
    businessStart.setHours(startHour, startMinute, 0, 0);

    // If business start is earlier in the day, move to next business day
    if (businessStart <= now) {
      businessStart.setDate(businessStart.getDate() + 1);
    }

    return Math.floor((businessStart.getTime() - now.getTime()) / (1000 * 60));
  }

  /**
   * Calculate minutes until business hours end
   */
  private calculateMinutesUntilBusinessEnd(now: Date): number {
    const [endHour, endMinute] = this.enricherConfig.businessHours.end
      .split(':')
      .map(Number);
    const businessEnd = new Date(now);
    businessEnd.setHours(endHour, endMinute, 0, 0);

    return Math.floor((businessEnd.getTime() - now.getTime()) / (1000 * 60));
  }

  /**
   * Analyze session temporal data
   */
  private analyzeSession(
    temporalData: TemporalEnrichmentData
  ): Record<string, unknown> {
    const relativeTime = temporalData.relativeTime;

    return {
      sessionDurationMinutes: Math.floor(
        relativeTime.sessionDuration / (1000 * 60)
      ),
      timeSinceLastInteractionSeconds: Math.floor(
        relativeTime.timeSinceLastInteraction / 1000
      ),
      conversationAgeMinutes: Math.floor(
        relativeTime.conversationAge / (1000 * 60)
      ),
      isLongSession: relativeTime.sessionDuration > 30 * 60 * 1000, // > 30 minutes
      isIdleSession: relativeTime.timeSinceLastInteraction > 5 * 60 * 1000, // > 5 minutes
      isNewConversation: relativeTime.conversationAge < 2 * 60 * 1000, // < 2 minutes
      chronologicalMarkers: temporalData.chronologicalMarkers,
    };
  }

  /**
   * Analyze temporal patterns
   */
  private analyzeTemporalPatterns(
    temporalData: TemporalEnrichmentData
  ): Record<string, unknown> {
    const patterns = {
      timeOfDayContext: this.getTimeOfDayContext(temporalData.timeOfDay),
      weekdayContext: this.getWeekdayContext(
        temporalData.dayOfWeek,
        temporalData.isWeekend
      ),
      seasonalContext: temporalData.seasonalContext,
      expectedActivityLevel: this.getExpectedActivityLevel(temporalData),
    };

    return patterns;
  }

  /**
   * Get context for current time of day
   */
  private getTimeOfDayContext(
    timeOfDay: TemporalEnrichmentData['timeOfDay']
  ): Record<string, unknown> {
    const contexts = {
      morning: {
        energy: 'rising',
        focus: 'high',
        mood: 'fresh',
        commonActivities: ['planning', 'learning', 'starting tasks'],
      },
      afternoon: {
        energy: 'peak',
        focus: 'high',
        mood: 'productive',
        commonActivities: ['meetings', 'collaboration', 'deep work'],
      },
      evening: {
        energy: 'declining',
        focus: 'moderate',
        mood: 'reflective',
        commonActivities: ['reviewing', 'socializing', 'winding down'],
      },
      night: {
        energy: 'low',
        focus: 'low',
        mood: 'relaxed',
        commonActivities: ['leisure', 'personal time', 'rest'],
      },
    };

    return contexts[timeOfDay] || contexts.morning;
  }

  /**
   * Get context for current day of week
   */
  private getWeekdayContext(
    dayOfWeek: string,
    isWeekend: boolean
  ): Record<string, unknown> {
    return {
      dayType: isWeekend ? 'weekend' : 'weekday',
      expectedPace: isWeekend ? 'relaxed' : 'active',
      expectedFormality: isWeekend ? 'casual' : 'professional',
      commonMood: isWeekend ? 'leisurely' : 'focused',
    };
  }

  /**
   * Get expected activity level
   */
  private getExpectedActivityLevel(
    temporalData: TemporalEnrichmentData
  ): 'low' | 'medium' | 'high' {
    // Business hours on weekdays = high activity
    if (
      !temporalData.isWeekend &&
      ['morning', 'afternoon'].includes(temporalData.timeOfDay)
    ) {
      return 'high';
    }

    // Evenings and weekends = medium activity
    if (temporalData.timeOfDay === 'evening' || temporalData.isWeekend) {
      return 'medium';
    }

    // Night time = low activity
    return 'low';
  }

  /**
   * Generate temporal recommendations
   */
  private generateTemporalRecommendations(
    temporalData: TemporalEnrichmentData
  ): Array<{
    type: string;
    message: string;
    priority: 'low' | 'medium' | 'high';
  }> {
    const recommendations = [];

    // Long session recommendation
    if (temporalData.relativeTime.sessionDuration > 45 * 60 * 1000) {
      // > 45 minutes
      recommendations.push({
        type: 'session_length',
        message: 'Long session detected - consider break or summary',
        priority: 'medium' as const,
      });
    }

    // Late night interaction
    if (temporalData.timeOfDay === 'night') {
      recommendations.push({
        type: 'time_awareness',
        message: 'Late night interaction - use gentler, more supportive tone',
        priority: 'low' as const,
      });
    }

    // First interaction
    if (temporalData.chronologicalMarkers.isFirstInteraction) {
      recommendations.push({
        type: 'first_interaction',
        message: 'First interaction - provide welcoming introduction',
        priority: 'high' as const,
      });
    }

    // Weekend interaction
    if (temporalData.isWeekend) {
      recommendations.push({
        type: 'weekend_context',
        message: 'Weekend interaction - adopt more casual communication style',
        priority: 'low' as const,
      });
    }

    // Idle session
    if (temporalData.relativeTime.timeSinceLastInteraction > 10 * 60 * 1000) {
      // > 10 minutes
      recommendations.push({
        type: 'idle_session',
        message: 'Session has been idle - provide gentle re-engagement',
        priority: 'medium' as const,
      });
    }

    return recommendations;
  }

  /**
   * Calculate confidence score for temporal enrichment
   */
  protected calculateConfidence(
    context: Context,
    enrichedData: Record<string, unknown>
  ): number {
    const temporalData = enrichedData.temporalContext as TemporalEnrichmentData;

    if (!temporalData) {
      return 0.1;
    }

    let confidenceScore = 0.8; // High base confidence for temporal data (always reliable)

    // Higher confidence when we have session tracking data
    if (temporalData.relativeTime.sessionDuration > 0) {
      confidenceScore += 0.1;
    }

    // Higher confidence with chronological markers
    if (
      temporalData.chronologicalMarkers.isFirstInteraction ||
      temporalData.chronologicalMarkers.isNewSession ||
      temporalData.chronologicalMarkers.isReturningUser
    ) {
      confidenceScore += 0.1;
    }

    return Math.min(0.95, confidenceScore);
  }
}
