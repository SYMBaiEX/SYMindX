/**
 * Emotional Context Enricher for SYMindX
 *
 * This enricher adds emotional state information, emotional history,
 * and contextual emotional insights to help agents make emotionally
 * aware decisions and responses.
 */

import { BaseContextEnricher } from './base-enricher';
import {
  EnrichmentRequest,
  EmotionalEnrichmentData,
  EnrichmentPriority,
  EnrichmentStage,
} from '../../../types/context/context-enrichment';
import { Context } from '../../../types/common';
import { EmotionModule, EmotionState } from '../../../types/emotion';
import { OperationResult } from '../../../types/helpers';

/**
 * Configuration specific to emotional enrichment
 */
export interface EmotionalEnricherConfig {
  includeEmotionalHistory: boolean;
  historyDepth: number; // Number of historical emotion records to include
  includeEmotionalTrends: boolean;
  includeContextualEmotions: boolean;
  emotionRelevanceThreshold: number; // 0-1, minimum relevance for contextual emotions
  volatilityWindowMs: number; // Time window for calculating emotional volatility
}

/**
 * Emotional Context Enricher
 *
 * Enriches context with current emotional state, emotional history,
 * and emotional insights to enable emotionally aware agent behavior.
 */
export class EmotionalContextEnricher extends BaseContextEnricher {
  private emotionProvider: () => EmotionModule | null;
  private enricherConfig: EmotionalEnricherConfig;

  constructor(
    emotionProvider: () => EmotionModule | null,
    config: Partial<EmotionalEnricherConfig> = {}
  ) {
    super('emotional-context-enricher', 'Emotional Context Enricher', '1.0.0', {
      enabled: true,
      priority: EnrichmentPriority.HIGH,
      stage: EnrichmentStage.CORE_ENRICHMENT,
      timeout: 1500,
      maxRetries: 2,
      cacheEnabled: true,
      cacheTtl: 30, // Short cache time for emotional data
      dependsOn: [],
    });

    this.emotionProvider = emotionProvider;

    // Default emotional enricher configuration
    this.enricherConfig = {
      includeEmotionalHistory: true,
      historyDepth: 10,
      includeEmotionalTrends: true,
      includeContextualEmotions: true,
      emotionRelevanceThreshold: 0.3,
      volatilityWindowMs: 300000, // 5 minutes
      ...config,
    };
  }

  /**
   * Get the keys this enricher provides
   */
  getProvidedKeys(): string[] {
    return [
      'emotionalContext',
      'currentEmotion',
      'emotionalHistory',
      'emotionalTrends',
      'contextualEmotions',
      'emotionalInsights',
    ];
  }

  /**
   * Get the keys this enricher requires
   */
  getRequiredKeys(): string[] {
    return []; // Emotional enricher doesn't depend on other enrichers
  }

  /**
   * Perform emotional enricher initialization
   */
  protected async doInitialize(): Promise<OperationResult> {
    try {
      // Test emotion provider
      const emotionModule = this.emotionProvider();

      this.log('info', 'Emotional context enricher initialized', {
        emotionModuleAvailable: emotionModule !== null,
        configuration: this.enricherConfig,
      });

      return {
        success: true,
        message: 'Emotional context enricher initialized successfully',
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
   * Perform emotion-based context enrichment
   */
  protected async doEnrich(
    request: EnrichmentRequest
  ): Promise<Record<string, unknown>> {
    const emotionModule = this.emotionProvider();

    if (!emotionModule) {
      this.log('warn', 'Emotion module not available for enrichment', {
        agentId: request.agentId,
      });

      return {
        emotionalContext: this.createEmptyEmotionalData(),
        currentEmotion: null,
        emotionalHistory: [],
        emotionalTrends: {},
        contextualEmotions: {},
        emotionalInsights: {
          available: false,
          reason: 'Emotion module not available',
        },
      };
    }

    // Get current emotional state
    const currentEmotion = emotionModule.getCurrentState();

    // Get emotional history if enabled
    const emotionalHistory = this.enricherConfig.includeEmotionalHistory
      ? this.getEmotionalHistory(emotionModule)
      : [];

    // Calculate emotional trends if enabled
    const emotionalTrends = this.enricherConfig.includeEmotionalTrends
      ? this.calculateEmotionalTrends(emotionalHistory, currentEmotion)
      : {};

    // Generate contextual emotions if enabled
    const contextualEmotions = this.enricherConfig.includeContextualEmotions
      ? this.generateContextualEmotions(
          request.context,
          currentEmotion,
          emotionalHistory
        )
      : {};

    // Create comprehensive emotional enrichment data
    const emotionalData: EmotionalEnrichmentData = {
      currentEmotion,
      emotionalHistory: emotionalHistory.map(this.formatEmotionalHistoryEntry),
      emotionalTrends,
      contextualEmotions,
    };

    // Generate emotional insights
    const emotionalInsights = this.generateEmotionalInsights(
      emotionalData,
      request.context
    );

    return {
      emotionalContext: emotionalData,
      currentEmotion,
      emotionalHistory: emotionalData.emotionalHistory,
      emotionalTrends,
      contextualEmotions,
      emotionalInsights,
    };
  }

  /**
   * Check if this enricher can process the given context
   */
  protected doCanEnrich(context: Context): boolean {
    // Emotional enricher can work with any context when emotion module is available
    return this.emotionProvider() !== null;
  }

  /**
   * Perform emotional enricher health check
   */
  protected async doHealthCheck(): Promise<OperationResult> {
    try {
      const emotionModule = this.emotionProvider();

      if (!emotionModule) {
        return {
          success: false,
          error: 'Emotion module not available',
        };
      }

      // Test emotion module functionality
      const currentState = emotionModule.getCurrentState();
      const hasValidState =
        currentState && typeof currentState.emotion === 'string';

      return {
        success: hasValidState,
        message: hasValidState
          ? 'Emotional context enricher is healthy'
          : 'Emotion module state is invalid',
        metadata: {
          emotionModuleAvailable: true,
          currentEmotion: currentState?.emotion || 'unknown',
          currentIntensity: currentState?.intensity || 0,
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
   * Clean up emotional enricher resources
   */
  protected async doDispose(): Promise<OperationResult> {
    try {
      // No specific cleanup needed for emotional enricher
      return {
        success: true,
        message: 'Emotional context enricher disposed successfully',
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
   * Create empty emotional data when emotion module is unavailable
   */
  private createEmptyEmotionalData(): EmotionalEnrichmentData {
    return {
      currentEmotion: {
        emotion: 'neutral',
        intensity: 0,
        triggers: [],
        confidence: 0,
        timestamp: new Date(),
      },
      emotionalHistory: [],
      emotionalTrends: {
        dominantEmotion: 'neutral',
        averageIntensity: 0,
        volatility: 0,
      },
      contextualEmotions: {},
    };
  }

  /**
   * Get emotional history from the emotion module
   */
  private getEmotionalHistory(emotionModule: EmotionModule): Array<{
    emotion: string;
    intensity: number;
    timestamp: Date;
    trigger?: string;
  }> {
    try {
      const history = emotionModule.getHistory(
        this.enricherConfig.historyDepth
      );

      return history.map((record) => ({
        emotion: record.emotion,
        intensity: record.intensity,
        timestamp: record.timestamp,
        trigger: record.trigger,
      }));
    } catch (error) {
      this.log('warn', 'Failed to get emotional history', {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Calculate emotional trends from history and current state
   */
  private calculateEmotionalTrends(
    history: Array<{
      emotion: string;
      intensity: number;
      timestamp: Date;
      trigger?: string;
    }>,
    currentEmotion: EmotionState
  ): EmotionalEnrichmentData['emotionalTrends'] {
    if (history.length === 0) {
      return {
        dominantEmotion: currentEmotion?.emotion || 'neutral',
        averageIntensity: currentEmotion?.intensity || 0,
        volatility: 0,
      };
    }

    // Count emotion occurrences
    const emotionCounts = new Map<string, number>();
    let totalIntensity = 0;

    for (const entry of history) {
      emotionCounts.set(
        entry.emotion,
        (emotionCounts.get(entry.emotion) || 0) + 1
      );
      totalIntensity += entry.intensity;
    }

    // Add current emotion
    if (currentEmotion) {
      emotionCounts.set(
        currentEmotion.emotion,
        (emotionCounts.get(currentEmotion.emotion) || 0) + 1
      );
      totalIntensity += currentEmotion.intensity;
    }

    // Find dominant emotion
    let dominantEmotion = 'neutral';
    let maxCount = 0;
    for (const [emotion, count] of emotionCounts) {
      if (count > maxCount) {
        maxCount = count;
        dominantEmotion = emotion;
      }
    }

    // Calculate average intensity
    const totalEntries = history.length + (currentEmotion ? 1 : 0);
    const averageIntensity =
      totalEntries > 0 ? totalIntensity / totalEntries : 0;

    // Calculate emotional volatility (how much emotions change)
    const volatility = this.calculateEmotionalVolatility(
      history,
      currentEmotion
    );

    return {
      dominantEmotion,
      averageIntensity,
      volatility,
    };
  }

  /**
   * Calculate emotional volatility from recent history
   */
  private calculateEmotionalVolatility(
    history: Array<{ emotion: string; intensity: number; timestamp: Date }>,
    currentEmotion: EmotionState | null
  ): number {
    if (history.length < 2) {
      return 0;
    }

    // Filter to recent entries within volatility window
    const now = new Date();
    const windowStart = new Date(
      now.getTime() - this.enricherConfig.volatilityWindowMs
    );

    const recentHistory = history.filter(
      (entry) => entry.timestamp >= windowStart
    );
    if (currentEmotion) {
      recentHistory.push({
        emotion: currentEmotion.emotion,
        intensity: currentEmotion.intensity,
        timestamp: currentEmotion.timestamp || now,
      });
    }

    if (recentHistory.length < 2) {
      return 0;
    }

    // Calculate volatility as the sum of intensity differences
    let volatilitySum = 0;
    for (let i = 1; i < recentHistory.length; i++) {
      const prev = recentHistory[i - 1];
      const curr = recentHistory[i];

      // Calculate change in intensity
      const intensityChange = Math.abs(curr.intensity - prev.intensity);

      // Add emotion change factor (different emotions = higher volatility)
      const emotionChange = prev.emotion !== curr.emotion ? 0.5 : 0;

      volatilitySum += intensityChange + emotionChange;
    }

    // Normalize by number of changes
    const averageVolatility = volatilitySum / (recentHistory.length - 1);

    // Cap at 1.0
    return Math.min(1.0, averageVolatility);
  }

  /**
   * Generate contextual emotions based on context and emotional state
   */
  private generateContextualEmotions(
    context: Context,
    currentEmotion: EmotionState | null,
    history: Array<{
      emotion: string;
      intensity: number;
      timestamp: Date;
      trigger?: string;
    }>
  ): Record<string, number> {
    const contextualEmotions: Record<string, number> = {};

    // Analyze context for emotional triggers
    const contextText = this.extractContextText(context);
    const emotionalKeywords = this.getEmotionalKeywords();

    // Calculate relevance scores for different emotions
    for (const [emotion, keywords] of emotionalKeywords) {
      let relevanceScore = 0;

      // Check for keyword matches in context
      for (const keyword of keywords) {
        if (contextText.toLowerCase().includes(keyword.toLowerCase())) {
          relevanceScore += 0.2;
        }
      }

      // Boost if this emotion is currently active
      if (currentEmotion && currentEmotion.emotion === emotion) {
        relevanceScore += currentEmotion.intensity * 0.3;
      }

      // Boost based on recent emotional history
      const recentEmotionCount = history
        .slice(-5) // Last 5 entries
        .filter((entry) => entry.emotion === emotion).length;
      relevanceScore += (recentEmotionCount / 5) * 0.2;

      // Only include emotions above threshold
      if (relevanceScore >= this.enricherConfig.emotionRelevanceThreshold) {
        contextualEmotions[emotion] = Math.min(1.0, relevanceScore);
      }
    }

    return contextualEmotions;
  }

  /**
   * Extract text content from context for analysis
   */
  private extractContextText(context: Context): string {
    const textParts: string[] = [];

    // Extract various text fields from context
    if (context.message && typeof context.message === 'string') {
      textParts.push(context.message);
    }

    if (context.topic && typeof context.topic === 'string') {
      textParts.push(context.topic);
    }

    if (context.description && typeof context.description === 'string') {
      textParts.push(context.description);
    }

    if (context.keywords && Array.isArray(context.keywords)) {
      textParts.push(...context.keywords.filter((k) => typeof k === 'string'));
    }

    return textParts.join(' ');
  }

  /**
   * Get mapping of emotions to relevant keywords
   */
  private getEmotionalKeywords(): Map<string, string[]> {
    return new Map([
      [
        'happy',
        [
          'joy',
          'celebrate',
          'success',
          'achievement',
          'positive',
          'good',
          'excellent',
          'wonderful',
        ],
      ],
      [
        'sad',
        [
          'loss',
          'grief',
          'disappointment',
          'failure',
          'negative',
          'bad',
          'terrible',
          'awful',
        ],
      ],
      [
        'angry',
        [
          'frustration',
          'annoyance',
          'rage',
          'mad',
          'furious',
          'irritated',
          'upset',
        ],
      ],
      [
        'anxious',
        [
          'worry',
          'fear',
          'concern',
          'nervous',
          'stress',
          'tension',
          'uncertainty',
        ],
      ],
      [
        'confident',
        [
          'sure',
          'certain',
          'assured',
          'strong',
          'capable',
          'skilled',
          'expert',
        ],
      ],
      [
        'curious',
        [
          'wonder',
          'question',
          'explore',
          'discover',
          'learn',
          'investigate',
          'research',
        ],
      ],
      [
        'empathetic',
        [
          'understand',
          'feel',
          'compassion',
          'sympathy',
          'care',
          'support',
          'help',
        ],
      ],
      [
        'proud',
        [
          'accomplished',
          'achieved',
          'successful',
          'recognition',
          'honor',
          'praise',
        ],
      ],
      [
        'confused',
        ['unclear', 'puzzled', 'uncertain', 'lost', 'complicated', 'complex'],
      ],
      [
        'nostalgic',
        ['remember', 'past', 'memory', 'history', 'before', 'used to', 'miss'],
      ],
    ]);
  }

  /**
   * Generate emotional insights based on enrichment data and context
   */
  private generateEmotionalInsights(
    emotionalData: EmotionalEnrichmentData,
    context: Context
  ): Record<string, unknown> {
    const insights: Record<string, unknown> = {
      available: true,
      timestamp: new Date(),
    };

    // Current emotional state insights
    if (emotionalData.currentEmotion) {
      insights.currentState = {
        isIntense: emotionalData.currentEmotion.intensity > 0.7,
        isStable: emotionalData.emotionalTrends.volatility < 0.3,
        dominantInfluence: emotionalData.emotionalTrends.dominantEmotion,
      };
    }

    // Historical patterns
    if (emotionalData.emotionalHistory.length > 0) {
      insights.patterns = {
        mostFrequent: emotionalData.emotionalTrends.dominantEmotion,
        averageIntensity: emotionalData.emotionalTrends.averageIntensity,
        isVolatile: emotionalData.emotionalTrends.volatility > 0.5,
        recentChanges: this.analyzeRecentEmotionalChanges(
          emotionalData.emotionalHistory
        ),
      };
    }

    // Contextual relevance
    const contextualEmotionCount = Object.keys(
      emotionalData.contextualEmotions
    ).length;
    insights.contextualRelevance = {
      hasRelevantEmotions: contextualEmotionCount > 0,
      emotionCount: contextualEmotionCount,
      topContextualEmotion: this.getTopContextualEmotion(
        emotionalData.contextualEmotions
      ),
    };

    // Recommendations
    insights.recommendations = this.generateEmotionalRecommendations(
      emotionalData,
      context
    );

    return insights;
  }

  /**
   * Analyze recent emotional changes
   */
  private analyzeRecentEmotionalChanges(
    history: Array<{
      emotion: string;
      intensity: number;
      timestamp: Date;
      trigger?: string;
    }>
  ): Record<string, unknown> {
    const recent = history.slice(-3); // Last 3 entries

    if (recent.length < 2) {
      return { hasChanges: false };
    }

    const changes = [];
    for (let i = 1; i < recent.length; i++) {
      const prev = recent[i - 1];
      const curr = recent[i];

      changes.push({
        from: prev.emotion,
        to: curr.emotion,
        intensityChange: curr.intensity - prev.intensity,
        emotionChanged: prev.emotion !== curr.emotion,
        trigger: curr.trigger,
      });
    }

    return {
      hasChanges: true,
      changeCount: changes.length,
      changes,
      trending: this.detectEmotionalTrend(changes),
    };
  }

  /**
   * Detect emotional trend from recent changes
   */
  private detectEmotionalTrend(
    changes: Array<{
      intensityChange: number;
      emotionChanged: boolean;
    }>
  ): string {
    if (changes.length === 0) return 'stable';

    const intensitySum = changes.reduce(
      (sum, change) => sum + change.intensityChange,
      0
    );
    const changeCount = changes.filter(
      (change) => change.emotionChanged
    ).length;

    if (intensitySum > 0.3) return 'intensifying';
    if (intensitySum < -0.3) return 'calming';
    if (changeCount >= changes.length * 0.6) return 'fluctuating';

    return 'stable';
  }

  /**
   * Get the top contextual emotion
   */
  private getTopContextualEmotion(
    contextualEmotions: Record<string, number>
  ): string | null {
    const entries = Object.entries(contextualEmotions);
    if (entries.length === 0) return null;

    return (
      entries.reduce(
        (top, [emotion, score]) =>
          score > top.score ? { emotion, score } : top,
        { emotion: '', score: -1 }
      ).emotion || null
    );
  }

  /**
   * Generate emotional recommendations based on current state and context
   */
  private generateEmotionalRecommendations(
    emotionalData: EmotionalEnrichmentData,
    context: Context
  ): Array<{
    type: string;
    message: string;
    priority: 'low' | 'medium' | 'high';
  }> {
    const recommendations = [];

    // High volatility recommendation
    if (emotionalData.emotionalTrends.volatility > 0.7) {
      recommendations.push({
        type: 'stability',
        message:
          'Consider emotional regulation techniques due to high volatility',
        priority: 'high' as const,
      });
    }

    // Low intensity but negative emotion
    if (
      emotionalData.currentEmotion?.emotion === 'sad' &&
      emotionalData.currentEmotion.intensity < 0.3
    ) {
      recommendations.push({
        type: 'support',
        message: 'Provide empathetic response to address underlying concerns',
        priority: 'medium' as const,
      });
    }

    // High positive emotion - capitalize on it
    if (
      emotionalData.currentEmotion?.intensity > 0.7 &&
      ['happy', 'confident', 'proud'].includes(
        emotionalData.currentEmotion.emotion
      )
    ) {
      recommendations.push({
        type: 'engagement',
        message: 'Leverage positive emotional state for enhanced interaction',
        priority: 'medium' as const,
      });
    }

    return recommendations;
  }

  /**
   * Format emotional history entry for context inclusion
   */
  private formatEmotionalHistoryEntry(entry: {
    emotion: string;
    intensity: number;
    timestamp: Date;
    trigger?: string;
  }): EmotionalEnrichmentData['emotionalHistory'][0] {
    return {
      emotion: entry.emotion,
      intensity: entry.intensity,
      timestamp: entry.timestamp,
      trigger: entry.trigger,
    };
  }

  /**
   * Calculate confidence score for emotional enrichment
   */
  protected calculateConfidence(
    context: Context,
    enrichedData: Record<string, unknown>
  ): number {
    const emotionalData =
      enrichedData.emotionalContext as EmotionalEnrichmentData;

    if (!emotionalData || !emotionalData.currentEmotion) {
      return 0.1;
    }

    let confidenceScore = 0.5; // Base confidence

    // Higher confidence if we have current emotion data
    if (emotionalData.currentEmotion.confidence) {
      confidenceScore += emotionalData.currentEmotion.confidence * 0.3;
    }

    // Higher confidence with more emotional history
    const historyLength = emotionalData.emotionalHistory.length;
    confidenceScore += Math.min(0.2, historyLength * 0.02);

    // Higher confidence with contextual emotions
    const contextualEmotionCount = Object.keys(
      emotionalData.contextualEmotions
    ).length;
    confidenceScore += Math.min(0.2, contextualEmotionCount * 0.05);

    return Math.min(0.95, Math.max(0.1, confidenceScore));
  }
}
