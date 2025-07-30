/**
 * Memory Context Enricher for SYMindX
 *
 * This enricher adds relevant memories and memory-based context to the agent's
 * current context, enabling memory-informed decision making and responses.
 */

import { BaseContextEnricher } from './base-enricher';
import {
  EnrichmentRequest,
  MemoryEnrichmentData,
  EnrichmentPriority,
  EnrichmentStage,
} from '../../../types/context/context-enrichment';
import { Context } from '../../../types/common';
import {
  MemoryProvider,
  MemoryRecord,
  SearchQuery,
} from '../../../types/memory';
import { OperationResult } from '../../../types/helpers';

/**
 * Configuration specific to memory enrichment
 */
export interface MemoryEnricherConfig {
  maxMemories: number;
  searchRadius: number; // How far back to search (in days)
  relevanceThreshold: number; // 0-1, minimum relevance score
  includeEmotionalMemories: boolean;
  includeTemporalContext: boolean;
  memoryTypes: string[]; // Filter by memory types
}

/**
 * Memory Context Enricher
 *
 * Enriches context with relevant memories, providing the agent with
 * historical context and learned experiences.
 */
export class MemoryContextEnricher extends BaseContextEnricher {
  private memoryProvider: MemoryProvider | null = null;
  private enricherConfig: MemoryEnricherConfig;

  constructor(
    memoryProvider: MemoryProvider,
    config: Partial<MemoryEnricherConfig> = {}
  ) {
    super('memory-context-enricher', 'Memory Context Enricher', '1.0.0', {
      enabled: true,
      priority: EnrichmentPriority.HIGH,
      stage: EnrichmentStage.CORE_ENRICHMENT,
      timeout: 2000,
      maxRetries: 3,
      cacheEnabled: true,
      cacheTtl: 300,
      dependsOn: [],
    });

    this.memoryProvider = memoryProvider;

    // Default memory enricher configuration
    this.enricherConfig = {
      maxMemories: 10,
      searchRadius: 30, // 30 days
      relevanceThreshold: 0.3,
      includeEmotionalMemories: true,
      includeTemporalContext: true,
      memoryTypes: [], // Empty means all types
      ...config,
    };
  }

  /**
   * Get the keys this enricher provides
   */
  getProvidedKeys(): string[] {
    return [
      'memoryContext',
      'relevantMemories',
      'memoryInsights',
      'historicalPatterns',
    ];
  }

  /**
   * Get the keys this enricher requires
   */
  getRequiredKeys(): string[] {
    return []; // Memory enricher doesn't depend on other enrichers
  }

  /**
   * Perform memory enricher initialization
   */
  protected async doInitialize(): Promise<OperationResult> {
    try {
      if (!this.memoryProvider) {
        return {
          success: false,
          error: 'Memory provider is required for memory enrichment',
        };
      }

      // Test memory provider connection
      const healthCheck = (await this.memoryProvider.healthCheck?.()) || {
        success: true,
      };
      if (!healthCheck.success) {
        return {
          success: false,
          error: `Memory provider health check failed: ${healthCheck.error}`,
        };
      }

      this.log('info', 'Memory context enricher initialized', {
        maxMemories: this.enricherConfig.maxMemories,
        searchRadius: this.enricherConfig.searchRadius,
        relevanceThreshold: this.enricherConfig.relevanceThreshold,
      });

      return {
        success: true,
        message: 'Memory context enricher initialized successfully',
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
   * Perform memory-based context enrichment
   */
  protected async doEnrich(
    request: EnrichmentRequest
  ): Promise<Record<string, unknown>> {
    if (!this.memoryProvider) {
      throw new Error('Memory provider not available');
    }

    const agentId = request.agentId;
    const context = request.context;

    // Extract searchable content from context
    const searchQuery = this.buildSearchQuery(context);

    // Search for relevant memories
    const relevantMemories = await this.searchRelevantMemories(
      agentId,
      searchQuery
    );

    // Build temporal context if enabled
    const temporalContext = this.enricherConfig.includeTemporalContext
      ? await this.buildTemporalContext(agentId)
      : undefined;

    // Analyze memory patterns
    const memoryInsights = this.analyzeMemoryPatterns(relevantMemories);

    // Generate historical patterns
    const historicalPatterns = this.extractHistoricalPatterns(relevantMemories);

    const enrichmentData: MemoryEnrichmentData = {
      relevantMemories,
      memoryCount: relevantMemories.length,
      searchQuery: searchQuery.query,
      searchScore: this.calculateSearchScore(relevantMemories),
      temporalContext,
    };

    return {
      memoryContext: enrichmentData,
      relevantMemories: relevantMemories.map(this.sanitizeMemoryForContext),
      memoryInsights,
      historicalPatterns,
    };
  }

  /**
   * Check if this enricher can process the given context
   */
  protected doCanEnrich(context: Context): boolean {
    // Memory enricher can work with any context, but is more useful
    // when there's textual content to search against
    return this.memoryProvider !== null;
  }

  /**
   * Perform memory enricher health check
   */
  protected async doHealthCheck(): Promise<OperationResult> {
    try {
      if (!this.memoryProvider) {
        return {
          success: false,
          error: 'Memory provider not available',
        };
      }

      // Check memory provider health
      const providerHealth = (await this.memoryProvider.healthCheck?.()) || {
        success: true,
      };
      if (!providerHealth.success) {
        return {
          success: false,
          error: `Memory provider unhealthy: ${providerHealth.error}`,
        };
      }

      return {
        success: true,
        message: 'Memory context enricher is healthy',
        metadata: {
          memoryProviderHealthy: true,
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
   * Clean up memory enricher resources
   */
  protected async doDispose(): Promise<OperationResult> {
    try {
      // Memory provider cleanup is handled by the provider itself
      this.memoryProvider = null;

      return {
        success: true,
        message: 'Memory context enricher disposed successfully',
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
   * Build search query from context
   */
  private buildSearchQuery(context: Context): SearchQuery {
    const searchTerms: string[] = [];

    // Extract searchable text from various context fields
    if (context.message && typeof context.message === 'string') {
      searchTerms.push(context.message);
    }

    if (context.topic && typeof context.topic === 'string') {
      searchTerms.push(context.topic);
    }

    if (context.keywords && Array.isArray(context.keywords)) {
      searchTerms.push(
        ...context.keywords.filter((k) => typeof k === 'string')
      );
    }

    // If no specific search terms, create a general query
    const query =
      searchTerms.length > 0
        ? searchTerms.join(' ')
        : 'recent interactions and experiences';

    return {
      query,
      limit: this.enricherConfig.maxMemories,
      types:
        this.enricherConfig.memoryTypes.length > 0
          ? this.enricherConfig.memoryTypes
          : undefined,
      since: new Date(
        Date.now() - this.enricherConfig.searchRadius * 24 * 60 * 60 * 1000
      ),
    };
  }

  /**
   * Search for relevant memories
   */
  private async searchRelevantMemories(
    agentId: string,
    query: SearchQuery
  ): Promise<MemoryRecord[]> {
    if (!this.memoryProvider) {
      return [];
    }

    try {
      const searchResult = await this.memoryProvider.search(agentId, query);

      if (!searchResult.success || !searchResult.memories) {
        this.log('warn', 'Memory search failed or returned no results', {
          agentId,
          query: query.query,
          error: searchResult.error,
        });
        return [];
      }

      // Filter by relevance threshold
      return searchResult.memories.filter(
        (memory) =>
          !memory.metadata?.relevanceScore ||
          memory.metadata.relevanceScore >=
            this.enricherConfig.relevanceThreshold
      );
    } catch (error) {
      this.log('error', 'Failed to search memories', {
        agentId,
        query: query.query,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Build temporal context from recent memories
   */
  private async buildTemporalContext(agentId: string): Promise<
    | {
        recentMemories: MemoryRecord[];
        historicalMemories: MemoryRecord[];
      }
    | undefined
  > {
    if (!this.memoryProvider) {
      return undefined;
    }

    try {
      // Get recent memories (last 24 hours)
      const recentQuery: SearchQuery = {
        query: '',
        limit: 5,
        since: new Date(Date.now() - 24 * 60 * 60 * 1000),
      };

      const recentResult = await this.memoryProvider.search(
        agentId,
        recentQuery
      );
      const recentMemories =
        recentResult.success && recentResult.memories
          ? recentResult.memories
          : [];

      // Get historical memories (older than 7 days)
      const historicalQuery: SearchQuery = {
        query: '',
        limit: 5,
        until: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      };

      const historicalResult = await this.memoryProvider.search(
        agentId,
        historicalQuery
      );
      const historicalMemories =
        historicalResult.success && historicalResult.memories
          ? historicalResult.memories
          : [];

      return {
        recentMemories,
        historicalMemories,
      };
    } catch (error) {
      this.log('warn', 'Failed to build temporal context', {
        agentId,
        error: error instanceof Error ? error.message : String(error),
      });
      return undefined;
    }
  }

  /**
   * Analyze patterns in retrieved memories
   */
  private analyzeMemoryPatterns(
    memories: MemoryRecord[]
  ): Record<string, unknown> {
    if (memories.length === 0) {
      return {
        patternCount: 0,
        commonThemes: [],
        emotionalTrends: {},
      };
    }

    // Analyze common themes
    const themes = new Map<string, number>();
    const emotions = new Map<string, number>();

    for (const memory of memories) {
      // Extract themes from memory content
      if (memory.content) {
        const words = memory.content.toLowerCase().match(/\w+/g) || [];
        for (const word of words) {
          if (word.length > 3) {
            // Filter out short words
            themes.set(word, (themes.get(word) || 0) + 1);
          }
        }
      }

      // Track emotional patterns if available
      if (memory.metadata?.emotion) {
        const emotion = memory.metadata.emotion as string;
        emotions.set(emotion, (emotions.get(emotion) || 0) + 1);
      }
    }

    // Get top themes
    const commonThemes = Array.from(themes.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([theme]) => theme);

    // Get emotional trends
    const emotionalTrends = Object.fromEntries(emotions.entries());

    return {
      patternCount: memories.length,
      commonThemes,
      emotionalTrends,
      memoryTypeDistribution: this.analyzeMemoryTypes(memories),
      temporalDistribution: this.analyzeTemporalDistribution(memories),
    };
  }

  /**
   * Extract historical patterns from memories
   */
  private extractHistoricalPatterns(
    memories: MemoryRecord[]
  ): Record<string, unknown> {
    const patterns = {
      interactionFrequency: this.calculateInteractionFrequency(memories),
      topicEvolution: this.analyzeTopicEvolution(memories),
      learningProgression: this.analyzeLearningProgression(memories),
    };

    return patterns;
  }

  /**
   * Calculate interaction frequency patterns
   */
  private calculateInteractionFrequency(
    memories: MemoryRecord[]
  ): Record<string, number> {
    const frequency = new Map<string, number>();

    for (const memory of memories) {
      const date = memory.timestamp.toISOString().split('T')[0]; // YYYY-MM-DD
      frequency.set(date, (frequency.get(date) || 0) + 1);
    }

    return Object.fromEntries(frequency.entries());
  }

  /**
   * Analyze how topics have evolved over time
   */
  private analyzeTopicEvolution(
    memories: MemoryRecord[]
  ): Array<{ date: string; topics: string[] }> {
    const evolution: Array<{ date: string; topics: string[] }> = [];

    // Group memories by date
    const byDate = new Map<string, MemoryRecord[]>();
    for (const memory of memories) {
      const date = memory.timestamp.toISOString().split('T')[0];
      if (!byDate.has(date)) {
        byDate.set(date, []);
      }
      byDate.get(date)!.push(memory);
    }

    // Extract topics for each date
    for (const [date, dateMemories] of byDate) {
      const topics = new Set<string>();
      for (const memory of dateMemories) {
        if (memory.metadata?.topics && Array.isArray(memory.metadata.topics)) {
          memory.metadata.topics.forEach((topic) => topics.add(topic));
        }
      }

      evolution.push({
        date,
        topics: Array.from(topics),
      });
    }

    return evolution.sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Analyze learning progression from memories
   */
  private analyzeLearningProgression(
    memories: MemoryRecord[]
  ): Record<string, unknown> {
    const learningMemories = memories.filter(
      (memory) =>
        memory.type === 'learning' || memory.metadata?.isLearning === true
    );

    return {
      learningSessionCount: learningMemories.length,
      averageConfidence: this.calculateAverageConfidence(learningMemories),
      skillAreas: this.identifySkillAreas(learningMemories),
    };
  }

  /**
   * Calculate average confidence from learning memories
   */
  private calculateAverageConfidence(memories: MemoryRecord[]): number {
    const confidenceScores = memories
      .map((memory) => memory.metadata?.confidence as number)
      .filter((confidence) => typeof confidence === 'number');

    if (confidenceScores.length === 0) {
      return 0;
    }

    return (
      confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length
    );
  }

  /**
   * Identify skill areas from learning memories
   */
  private identifySkillAreas(memories: MemoryRecord[]): string[] {
    const skills = new Set<string>();

    for (const memory of memories) {
      if (memory.metadata?.skillArea) {
        skills.add(memory.metadata.skillArea as string);
      }
    }

    return Array.from(skills);
  }

  /**
   * Analyze memory type distribution
   */
  private analyzeMemoryTypes(memories: MemoryRecord[]): Record<string, number> {
    const types = new Map<string, number>();

    for (const memory of memories) {
      const type = memory.type || 'unknown';
      types.set(type, (types.get(type) || 0) + 1);
    }

    return Object.fromEntries(types.entries());
  }

  /**
   * Analyze temporal distribution of memories
   */
  private analyzeTemporalDistribution(
    memories: MemoryRecord[]
  ): Record<string, number> {
    const distribution = new Map<string, number>();
    const now = Date.now();

    for (const memory of memories) {
      const ageHours = Math.floor(
        (now - memory.timestamp.getTime()) / (1000 * 60 * 60)
      );
      let category: string;

      if (ageHours < 24) {
        category = 'recent';
      } else if (ageHours < 168) {
        // 7 days
        category = 'this_week';
      } else if (ageHours < 720) {
        // 30 days
        category = 'this_month';
      } else {
        category = 'older';
      }

      distribution.set(category, (distribution.get(category) || 0) + 1);
    }

    return Object.fromEntries(distribution.entries());
  }

  /**
   * Calculate search score based on memory relevance
   */
  private calculateSearchScore(memories: MemoryRecord[]): number {
    if (memories.length === 0) {
      return 0;
    }

    const relevanceScores = memories
      .map((memory) => memory.metadata?.relevanceScore as number)
      .filter((score) => typeof score === 'number');

    if (relevanceScores.length === 0) {
      return 0.5; // Default score when no relevance scores available
    }

    return relevanceScores.reduce((a, b) => a + b, 0) / relevanceScores.length;
  }

  /**
   * Sanitize memory record for context inclusion
   */
  private sanitizeMemoryForContext(
    memory: MemoryRecord
  ): Record<string, unknown> {
    return {
      id: memory.id,
      type: memory.type,
      content: memory.content,
      timestamp: memory.timestamp,
      importance: memory.importance,
      // Include only safe metadata
      metadata: {
        relevanceScore: memory.metadata?.relevanceScore,
        emotion: memory.metadata?.emotion,
        topics: memory.metadata?.topics,
        skillArea: memory.metadata?.skillArea,
      },
    };
  }

  /**
   * Calculate confidence score for memory enrichment
   */
  protected calculateConfidence(
    context: Context,
    enrichedData: Record<string, unknown>
  ): number {
    const memoryContext = enrichedData.memoryContext as MemoryEnrichmentData;

    if (!memoryContext || memoryContext.relevantMemories.length === 0) {
      return 0.1; // Low confidence when no memories found
    }

    // Base confidence on number of memories and their search score
    const memoryCount = memoryContext.relevantMemories.length;
    const searchScore = memoryContext.searchScore || 0.5;
    const maxMemories = this.enricherConfig.maxMemories;

    // Higher confidence with more relevant memories
    const countScore = Math.min(1, memoryCount / maxMemories);
    const combinedScore = countScore * 0.4 + searchScore * 0.6;

    return Math.min(0.95, Math.max(0.1, combinedScore));
  }
}
