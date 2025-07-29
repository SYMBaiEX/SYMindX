/**
 * Memory Context Integration Helpers for SYMindX
 *
 * This module provides helper functions for context-enhanced memory operations,
 * migration utilities for existing memory stores, context-based memory analytics,
 * and performance optimization for context queries.
 */

import { MemoryRecord, MemoryType, MemoryDuration } from '../../types/agent';
import {
  MemoryTierType,
  SearchQuery,
  SearchResult,
  SearchQueryType,
  BoostFactors,
  TimeRange,
} from '../../types/memory';
import { UnifiedContext, ContextScope } from '../../types/context/unified-context';
import { ContextEnhancedMemoryRecord, ContextAwareSearchOptions } from './base-memory-provider';

// Re-export for external usage
export type { ContextAwareSearchOptions };

/**
 * Context similarity calculation options
 */
export interface ContextSimilarityOptions {
  agentWeight?: number;
  sessionWeight?: number;
  temporalWeight?: number;
  emotionalWeight?: number;
  environmentWeight?: number;
  extensionWeight?: number;
}

/**
 * Memory migration options
 */
export interface MemoryMigrationOptions {
  batchSize?: number;
  preserveOriginal?: boolean;
  skipExisting?: boolean;
  addContextAnalytics?: boolean;
}

/**
 * Context analytics result
 */
export interface ContextAnalytics {
  totalMemories: number;
  contextEnhancedMemories: number;
  averageContextScore: number;
  topContextScopes: Array<{ scope: ContextScope; count: number }>;
  contextCoverage: number;
  insightDistribution: Record<string, number>;
}

/**
 * Calculate semantic similarity between two unified contexts
 * @param context1 First context
 * @param context2 Second context
 * @param options Similarity calculation options
 * @returns Similarity score (0-1)
 */
export function calculateContextSimilarity(
  context1: UnifiedContext,
  context2: UnifiedContext,
  options: ContextSimilarityOptions = {}
): number {
  const {
    agentWeight = 0.3,
    sessionWeight = 0.2,
    temporalWeight = 0.15,
    emotionalWeight = 0.15,
    environmentWeight = 0.1,
    extensionWeight = 0.1,
  } = options;

  let similarity = 0;
  let totalWeight = 0;

  // Agent context similarity
  if (context1.agent && context2.agent) {
    const agentSimilarity = context1.agent.id === context2.agent.id ? 1.0 : 0.0;
    similarity += agentSimilarity * agentWeight;
    totalWeight += agentWeight;
  }

  // Session context similarity
  if (context1.session && context2.session) {
    const sessionSimilarity = context1.session.id === context2.session.id ? 1.0 : 0.0;
    similarity += sessionSimilarity * sessionWeight;
    totalWeight += sessionWeight;
  }

  // Temporal context similarity
  if (context1.temporal && context2.temporal) {
    const timeDiff = Math.abs(
      (context1.temporal.timestamp?.getTime() || 0) - 
      (context2.temporal.timestamp?.getTime() || 0)
    );
    const maxDiff = 24 * 60 * 60 * 1000; // 24 hours
    const temporalSimilarity = Math.max(0, 1 - (timeDiff / maxDiff));
    similarity += temporalSimilarity * temporalWeight;
    totalWeight += temporalWeight;
  }

  // Emotional context similarity
  if (context1.agent?.emotionalState && context2.agent?.emotionalState) {
    const emotionalSimilarity = calculateEmotionalSimilarity(
      context1.agent.emotionalState,
      context2.agent.emotionalState
    );
    similarity += emotionalSimilarity * emotionalWeight;
    totalWeight += emotionalWeight;
  }

  // Environment context similarity
  if (context1.environment && context2.environment) {
    const envSimilarity = context1.environment.nodeEnv === context2.environment.nodeEnv ? 1.0 : 0.0;
    similarity += envSimilarity * environmentWeight;
    totalWeight += environmentWeight;
  }

  // Extension context similarity
  if (context1.extensions && context2.extensions) {
    const ext1Keys = Object.keys(context1.extensions);
    const ext2Keys = Object.keys(context2.extensions);
    const intersection = ext1Keys.filter(key => ext2Keys.includes(key));
    const union = [...new Set([...ext1Keys, ...ext2Keys])];
    const extSimilarity = union.length > 0 ? intersection.length / union.length : 0;
    similarity += extSimilarity * extensionWeight;
    totalWeight += extensionWeight;
  }

  return totalWeight > 0 ? similarity / totalWeight : 0;
}

/**
 * Calculate emotional state similarity
 * @param emotions1 First emotional state
 * @param emotions2 Second emotional state
 * @returns Similarity score (0-1)
 */
function calculateEmotionalSimilarity(
  emotions1: Record<string, any>,
  emotions2: Record<string, any>
): number {
  const allEmotions = [...new Set([...Object.keys(emotions1), ...Object.keys(emotions2)])];
  
  if (allEmotions.length === 0) return 1.0;

  let totalDifference = 0;
  for (const emotion of allEmotions) {
    const intensity1 = emotions1[emotion]?.intensity || 0;
    const intensity2 = emotions2[emotion]?.intensity || 0;
    totalDifference += Math.abs(intensity1 - intensity2);
  }

  const maxPossibleDifference = allEmotions.length;
  return maxPossibleDifference > 0 ? 1 - (totalDifference / maxPossibleDifference) : 1.0;
}

/**
 * Create context-aware search query from simple parameters
 * @param query The search string
 * @param context Current context for enhancement
 * @param options Search options
 * @returns Enhanced search query
 */
export function createContextAwareSearchQuery(
  query: string,
  context?: UnifiedContext,
  options: ContextAwareSearchOptions = {}
): SearchQuery {
  const searchQuery: SearchQuery = {
    type: SearchQueryType.HYBRID,
    query,
    limit: 10,
    threshold: 0.3,
  };

  // Add context-based boost factors
  if (context && options.useContextualRanking) {
    searchQuery.boostFactors = {
      importance: 0.3,
      recency: options.contextWeight || 0.2,
      semantic: 0.4,
      emotional: context.agent?.emotionalState ? 0.1 : 0,
    };
  }

  // Add time range based on context
  if (context?.temporal) {
    searchQuery.timeRange = {
      relative: {
        value: 7,
        unit: 'days',
      },
    };
  }

  // Enhance query with contextual terms
  if (context && options.enrichWithContext) {
    const contextTerms = extractContextTerms(context);
    if (contextTerms.length > 0) {
      searchQuery.query = `${query} ${contextTerms.join(' ')}`;
    }
  }

  return searchQuery;
}

/**
 * Extract searchable terms from context
 * @param context The unified context
 * @returns Array of search terms
 */
function extractContextTerms(context: UnifiedContext): string[] {
  const terms: string[] = [];

  // Agent-based terms
  if (context.agent?.id) {
    terms.push(`agent:${context.agent.id}`);
  }

  // Session-based terms
  if (context.session?.id) {
    terms.push(`session:${context.session.id}`);
  }

  // Extension-based terms
  if (context.extensions) {
    Object.keys(context.extensions).forEach(ext => {
      terms.push(`extension:${ext}`);
    });
  }

  // Environment-based terms
  if (context.environment?.nodeEnv) {
    terms.push(`env:${context.environment.nodeEnv}`);
  }

  return terms;
}

/**
 * Migrate existing memory records to context-enhanced format
 * @param memories Array of existing memory records
 * @param options Migration options
 * @returns Array of context-enhanced memory records
 */
export async function migrateMemoriesToContextEnhanced(
  memories: MemoryRecord[],
  options: MemoryMigrationOptions = {}
): Promise<ContextEnhancedMemoryRecord[]> {
  const {
    batchSize = 100,
    addContextAnalytics = true,
  } = options;

  const enhancedMemories: ContextEnhancedMemoryRecord[] = [];
  
  // Process in batches for performance
  for (let i = 0; i < memories.length; i += batchSize) {
    const batch = memories.slice(i, i + batchSize);
    
    for (const memory of batch) {
      const enhanced: ContextEnhancedMemoryRecord = {
        ...memory,
        // Generate synthetic context score based on existing data
        contextScore: calculateSyntheticContextScore(memory),
        // Extract insights from existing metadata
        derivedInsights: extractInsightsFromMetadata(memory),
      };

      // Generate context fingerprint from available data
      if (addContextAnalytics) {
        enhanced.contextFingerprint = generateSyntheticFingerprint(memory);
      }

      enhancedMemories.push(enhanced);
    }
  }

  return enhancedMemories;
}

/**
 * Calculate synthetic context score from existing memory data
 * @param memory The memory record
 * @returns Context score (0-1)
 */
function calculateSyntheticContextScore(memory: MemoryRecord): number {
  let score = 0;

  // Base score from importance
  score += (memory.importance || 0) * 0.4;

  // Metadata richness
  const metadataKeys = Object.keys(memory.metadata || {});
  score += Math.min(metadataKeys.length / 10, 0.3);

  // Tag richness
  const tagCount = (memory.tags || []).length;
  score += Math.min(tagCount / 5, 0.2);

  // Content richness (longer content might have more context)
  const contentLength = memory.content.length;
  score += Math.min(contentLength / 1000, 0.1);

  return Math.min(score, 1.0);
}

/**
 * Extract insights from existing metadata
 * @param memory The memory record
 * @returns Array of insights
 */
function extractInsightsFromMetadata(memory: MemoryRecord): string[] {
  const insights: string[] = [];
  const metadata = memory.metadata || {};

  // Extract source information
  if (metadata.source) {
    insights.push(`Memory source: ${metadata.source}`);
  }

  // Extract interaction type
  if (metadata.messageType) {
    insights.push(`Message type: ${metadata.messageType}`);
  }

  // Extract extension information
  if (metadata.extension) {
    insights.push(`From extension: ${metadata.extension}`);
  }

  // Extract temporal information
  insights.push(`Created: ${memory.timestamp.toLocaleString()}`);

  // Extract importance level
  if (memory.importance) {
    const importance = memory.importance > 0.8 ? 'high' : 
                     memory.importance > 0.5 ? 'medium' : 'low';
    insights.push(`Importance: ${importance}`);
  }

  return insights;
}

/**
 * Generate synthetic fingerprint from existing memory data
 * @param memory The memory record
 * @returns Fingerprint string
 */
function generateSyntheticFingerprint(memory: MemoryRecord): string {
  const data = {
    agentId: memory.agentId,
    type: memory.type,
    source: memory.metadata?.source,
    extension: memory.metadata?.extension,
    messageType: memory.metadata?.messageType,
    hour: memory.timestamp.getHours(),
    dayOfWeek: memory.timestamp.getDay(),
  };

  return simpleHash(JSON.stringify(data));
}

/**
 * Simple hash function for fingerprinting
 * @param str The string to hash
 * @returns A simple hash
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Analyze context distribution and patterns in memory collection
 * @param memories Array of context-enhanced memories
 * @returns Context analytics
 */
export function analyzeContextDistribution(
  memories: ContextEnhancedMemoryRecord[]
): ContextAnalytics {
  const analytics: ContextAnalytics = {
    totalMemories: memories.length,
    contextEnhancedMemories: 0,
    averageContextScore: 0,
    topContextScopes: [],
    contextCoverage: 0,
    insightDistribution: {},
  };

  if (memories.length === 0) return analytics;

  let totalContextScore = 0;
  const scopeCounts = new Map<ContextScope, number>();
  const insightCounts = new Map<string, number>();

  for (const memory of memories) {
    // Count context-enhanced memories
    if (memory.contextScore !== undefined || memory.unifiedContext) {
      analytics.contextEnhancedMemories++;
    }

    // Accumulate context scores
    if (memory.contextScore !== undefined) {
      totalContextScore += memory.contextScore;
    }

    // Count context scopes
    if (memory.unifiedContext?.metadata?.scope) {
      const scope = memory.unifiedContext.metadata.scope;
      scopeCounts.set(scope, (scopeCounts.get(scope) || 0) + 1);
    }

    // Count insight types
    if (memory.derivedInsights) {
      for (const insight of memory.derivedInsights) {
        const insightType = insight.split(':')[0]; // Extract type from "Type: value" format
        insightCounts.set(insightType, (insightCounts.get(insightType) || 0) + 1);
      }
    }
  }

  // Calculate averages
  analytics.averageContextScore = analytics.contextEnhancedMemories > 0 
    ? totalContextScore / analytics.contextEnhancedMemories 
    : 0;

  analytics.contextCoverage = analytics.contextEnhancedMemories / analytics.totalMemories;

  // Top context scopes
  analytics.topContextScopes = Array.from(scopeCounts.entries())
    .map(([scope, count]) => ({ scope, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Insight distribution
  analytics.insightDistribution = Object.fromEntries(insightCounts);

  return analytics;
}

/**
 * Optimize search results for context-aware queries
 * @param results Initial search results
 * @param context Current context
 * @param options Search options
 * @returns Optimized search results
 */
export function optimizeContextAwareResults(
  results: SearchResult[],
  context: UnifiedContext,
  options: ContextAwareSearchOptions = {}
): SearchResult[] {
  const {
    contextWeight = 0.3,
    contextSimilarityThreshold = 0.5,
    useContextualRanking = true,
  } = options;

  if (!useContextualRanking) return results;

  return results.map(result => {
    const memory = result.record as ContextEnhancedMemoryRecord;
    let contextSimilarity = 0;

    // Calculate context similarity if both contexts exist
    if (memory.unifiedContext && context) {
      contextSimilarity = calculateContextSimilarity(memory.unifiedContext, context);
    }

    // Apply context weight to score
    const originalScore = result.score;
    const enhancedScore = (originalScore * (1 - contextWeight)) + (contextSimilarity * contextWeight);

    // Filter by context similarity threshold
    if (contextSimilarity < contextSimilarityThreshold) {
      return {
        ...result,
        score: enhancedScore * 0.5, // Penalize low context similarity
        contextScore: contextSimilarity,
        reason: 'Low contextual relevance',
      };
    }

    return {
      ...result,
      score: enhancedScore,
      contextScore: contextSimilarity,
      reason: contextSimilarity > 0.8 ? 'High contextual similarity' : 
              contextSimilarity > 0.5 ? 'Moderate contextual similarity' : undefined,
    };
  }).sort((a, b) => b.score - a.score);
}

/**
 * Create context-based memory relationships
 * @param memories Array of context-enhanced memories
 * @param similarityThreshold Minimum similarity for relationship
 * @returns Array of memory relationships
 */
export function createContextBasedRelationships(
  memories: ContextEnhancedMemoryRecord[],
  similarityThreshold = 0.7
): Array<{ sourceId: string; targetId: string; similarity: number; type: string }> {
  const relationships: Array<{ sourceId: string; targetId: string; similarity: number; type: string }> = [];

  for (let i = 0; i < memories.length; i++) {
    for (let j = i + 1; j < memories.length; j++) {
      const memory1 = memories[i];
      const memory2 = memories[j];

      if (!memory1.unifiedContext || !memory2.unifiedContext) continue;

      const similarity = calculateContextSimilarity(
        memory1.unifiedContext,
        memory2.unifiedContext
      );

      if (similarity >= similarityThreshold) {
        relationships.push({
          sourceId: memory1.id,
          targetId: memory2.id,
          similarity,
          type: 'contextual',
        });
      }
    }
  }

  return relationships;
}

/**
 * Performance metrics for context queries
 */
export interface ContextQueryMetrics {
  queryTime: number;
  resultCount: number;
  contextEnhancedResults: number;
  averageContextScore: number;
  cacheHitRate?: number;
}

/**
 * Create performance metrics for context queries
 * @param startTime Query start time
 * @param results Search results
 * @returns Performance metrics
 */
export function createContextQueryMetrics(
  startTime: number,
  results: SearchResult[]
): ContextQueryMetrics {
  const queryTime = Date.now() - startTime;
  const contextEnhancedResults = results.filter(r => 
    (r as any).contextScore !== undefined
  ).length;
  
  const contextScores = results
    .map(r => (r as any).contextScore)
    .filter(score => score !== undefined);
  
  const averageContextScore = contextScores.length > 0 
    ? contextScores.reduce((sum, score) => sum + score, 0) / contextScores.length
    : 0;

  return {
    queryTime,
    resultCount: results.length,
    contextEnhancedResults,
    averageContextScore,
  };
}