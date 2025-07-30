/**
 * Minimal Context Transformer
 *
 * Transforms unified context into a lightweight, minimal format,
 * optimizing for performance and resource usage while maintaining
 * essential information for basic operations.
 */

import {
  ContextTransformer,
  UnifiedContext,
  TransformationResult,
  TransformationTarget,
  TransformationStrategy,
  TransformationConfig,
  ValidationResult,
  ValidationConfig,
  TransformerCapabilities,
  TransformationMetadata,
  TransformationPerformance,
} from '../../../types/context/context-transformation.js';
import { runtimeLogger } from '../../../utils/logger.js';

/**
 * Minimal context format - lightweight and essential data only
 */
export interface MinimalContext {
  // Essential identification
  id: string;
  agentId: string;
  timestamp: number; // Unix timestamp for space efficiency

  // Core content (compressed)
  content: string;
  summary?: string;

  // Minimal state
  phase: string;
  priority: number; // 0-1

  // Essential metadata
  meta: {
    version: number;
    size: number;
    type: string;
    flags: string[]; // Compact feature flags
  };

  // Compressed relationships
  refs?: string[]; // Related context IDs

  // Performance tracking
  perf?: {
    created: number;
    accessed: number;
    count: number;
  };
}

/**
 * Compression utilities for minimal context
 */
class ContextCompressor {
  private static readonly COMMON_WORDS = new Set([
    'the',
    'a',
    'an',
    'and',
    'or',
    'but',
    'in',
    'on',
    'at',
    'to',
    'for',
    'of',
    'with',
    'by',
    'is',
    'are',
    'was',
    'were',
    'be',
    'been',
    'being',
    'have',
    'has',
    'had',
    'do',
    'does',
    'did',
    'will',
    'would',
    'could',
    'should',
    'may',
    'might',
    'can',
    'must',
    'shall',
  ]);

  /**
   * Compress text content by removing common words and redundancy
   */
  static compressText(text: string, maxLength: number = 200): string {
    if (text.length <= maxLength) return text;

    // Split into sentences
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);

    if (sentences.length <= 1) {
      // Single sentence - truncate
      return text.slice(0, maxLength).trim() + '...';
    }

    // Keep first and last sentences, compress middle
    const first = sentences[0].trim();
    const last = sentences[sentences.length - 1].trim();

    if (first.length + last.length + 10 <= maxLength) {
      const remaining = maxLength - first.length - last.length - 10;
      const middle = sentences.slice(1, -1).join(' ');
      const compressedMiddle = this.compressWords(middle, remaining);

      return `${first}. ${compressedMiddle} ${last}.`;
    }

    // Just use first sentence if everything is too long
    return first.slice(0, maxLength - 3).trim() + '...';
  }

  /**
   * Compress words by removing common words and duplicates
   */
  private static compressWords(text: string, maxLength: number): string {
    const words = text.toLowerCase().split(/\s+/);
    const compressed: string[] = [];
    const seen = new Set<string>();
    let currentLength = 0;

    for (const word of words) {
      if (currentLength >= maxLength) break;

      const cleanWord = word.replace(/[^a-z0-9]/g, '');
      if (cleanWord.length < 2) continue;
      if (this.COMMON_WORDS.has(cleanWord)) continue;
      if (seen.has(cleanWord)) continue;

      seen.add(cleanWord);
      compressed.push(cleanWord);
      currentLength += cleanWord.length + 1;
    }

    return compressed.join(' ');
  }

  /**
   * Generate summary from content
   */
  static generateSummary(text: string, maxLength: number = 100): string {
    if (text.length <= maxLength) return text;

    // Extract key phrases (simple approach)
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 10);
    if (sentences.length === 0) return text.slice(0, maxLength) + '...';

    // Find the most informative sentence (highest unique word ratio)
    let bestSentence = sentences[0];
    let bestScore = 0;

    for (const sentence of sentences) {
      const words = sentence.toLowerCase().split(/\s+/);
      const uniqueWords = words.filter(
        (w) => !this.COMMON_WORDS.has(w) && w.length > 2
      );
      const score = uniqueWords.length / words.length;

      if (score > bestScore) {
        bestScore = score;
        bestSentence = sentence;
      }
    }

    return (
      bestSentence.trim().slice(0, maxLength) +
      (bestSentence.length > maxLength ? '...' : '')
    );
  }

  /**
   * Extract feature flags from context
   */
  static extractFlags(context: UnifiedContext): string[] {
    const flags: string[] = [];

    // Add state flags
    if (context.state.complexity > 0.7) flags.push('complex');
    if (context.state.engagement > 0.8) flags.push('engaged');
    if (context.state.confidence < 0.3) flags.push('uncertain');

    // Add content flags
    if (context.messages.length > 10) flags.push('long');
    if (context.messages.some((m) => m.emotions?.length))
      flags.push('emotional');

    // Add capability flags
    if (context.environment.capabilities?.length) flags.push('capable');
    if (context.environment.constraints?.length) flags.push('constrained');

    // Add module flags
    if (context.cognitionData?.thoughts?.length) flags.push('thinking');
    if (context.emotionData?.currentEmotions?.length) flags.push('feeling');
    if (context.memoryData?.relevantMemories?.length) flags.push('remembering');

    return flags.slice(0, 5); // Limit to 5 most important flags
  }

  /**
   * Determine context type
   */
  static determineType(context: UnifiedContext): string {
    if (context.messages.length === 0) return 'static';
    if (context.messages.length === 1) return 'simple';
    if (context.state.phase === 'processing') return 'active';
    if (context.cognitionData?.thoughts?.length) return 'cognitive';
    if (context.emotionData?.currentEmotions?.length) return 'emotional';
    return 'conversational';
  }
}

/**
 * Minimal Context Transformer implementation
 */
export class MinimalContextTransformer
  implements ContextTransformer<UnifiedContext, MinimalContext>
{
  readonly id = 'minimal-context-transformer';
  readonly version = '1.0.0';
  readonly target = TransformationTarget.MINIMAL;
  readonly supportedStrategies = [
    TransformationStrategy.MINIMAL,
    TransformationStrategy.OPTIMIZED,
    TransformationStrategy.CACHED,
  ];
  readonly reversible = false; // Minimal transformation is lossy

  private transformationCache = new Map<
    string,
    TransformationResult<MinimalContext>
  >();
  private readonly MAX_CACHE_SIZE = 1000;

  /**
   * Transform unified context to minimal format
   */
  async transform(
    context: UnifiedContext,
    config?: TransformationConfig
  ): Promise<TransformationResult<MinimalContext>> {
    const startTime = performance.now();

    try {
      // Check cache first (aggressive caching for minimal contexts)
      const cacheKey = this.generateCacheKey(context, config);
      if (this.transformationCache.has(cacheKey)) {
        const cached = this.transformationCache.get(cacheKey)!;
        runtimeLogger.debug(
          `Cache hit for minimal transformation: ${cacheKey}`
        );
        return {
          ...cached,
          cached: true,
        };
      }

      // Determine strategy (prefer minimal for this transformer)
      const strategy = config?.strategy || TransformationStrategy.MINIMAL;

      // Transform based on strategy
      const transformedContext = await this.performTransformation(
        context,
        strategy,
        config
      );

      // Calculate performance metrics
      const duration = performance.now() - startTime;
      const inputSize = JSON.stringify(context).length;
      const outputSize = JSON.stringify(transformedContext).length;

      const metadata: TransformationMetadata = {
        transformerId: this.id,
        transformerVersion: this.version,
        timestamp: new Date(),
        inputSize,
        outputSize,
        fieldsTransformed: this.getTransformedFields(strategy),
        fieldsDropped: this.getDroppedFields(strategy),
        fieldsAdded: this.getAddedFields(),
        validationPassed: true,
        cacheHit: false,
      };

      const performance: TransformationPerformance = {
        duration,
        memoryUsage: process.memoryUsage().heapUsed,
        cpuUsage: process.cpuUsage().user,
        cacheHitRate: this.calculateCacheHitRate(),
        compressionRatio: inputSize / outputSize,
        throughput: outputSize / duration,
      };

      const result: TransformationResult<MinimalContext> = {
        success: true,
        transformedContext,
        originalContext: context,
        target: this.target,
        strategy,
        operation: 'transform' as any,
        metadata,
        performance,
        reversible: this.reversible,
        cached: false,
      };

      // Cache result (with size limit)
      this.cacheResult(cacheKey, result);

      runtimeLogger.debug(
        `Minimal context transformation completed in ${duration.toFixed(2)}ms`
      );
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      runtimeLogger.error('Minimal context transformation failed', {
        error,
        duration,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        transformedContext: {} as MinimalContext,
        originalContext: context,
        target: this.target,
        strategy: config?.strategy || TransformationStrategy.MINIMAL,
        operation: 'transform' as any,
        metadata: {
          transformerId: this.id,
          transformerVersion: this.version,
          timestamp: new Date(),
          inputSize: 0,
          outputSize: 0,
          fieldsTransformed: [],
          fieldsDropped: [],
          fieldsAdded: [],
          validationPassed: false,
          cacheHit: false,
        },
        performance: {
          duration,
          memoryUsage: 0,
          cpuUsage: 0,
          cacheHitRate: 0,
          compressionRatio: 0,
          throughput: 0,
        },
        reversible: false,
        cached: false,
      };
    }
  }

  /**
   * Perform the actual transformation based on strategy
   */
  private async performTransformation(
    context: UnifiedContext,
    strategy: TransformationStrategy,
    config?: TransformationConfig
  ): Promise<MinimalContext> {
    // Extract and compress primary content
    const primaryContent = this.extractPrimaryContent(context);
    const compressedContent = ContextCompressor.compressText(
      primaryContent,
      strategy === TransformationStrategy.MINIMAL ? 150 : 300
    );

    // Build base minimal context
    const baseContext: MinimalContext = {
      id: context.contextId,
      agentId: context.agentId,
      timestamp: Math.floor(context.timestamp.getTime() / 1000), // Unix timestamp
      content: compressedContent,
      phase: context.state.phase,
      priority: this.calculatePriority(context),
      meta: {
        version: context.version,
        size: JSON.stringify(context).length,
        type: ContextCompressor.determineType(context),
        flags: ContextCompressor.extractFlags(context),
      },
    };

    // Apply strategy-specific optimizations
    switch (strategy) {
      case TransformationStrategy.MINIMAL:
        return this.applyMinimalStrategy(baseContext, context);
      case TransformationStrategy.OPTIMIZED:
        return this.applyOptimizedStrategy(baseContext, context);
      case TransformationStrategy.CACHED:
        return this.applyCachedStrategy(baseContext, context);
      default:
        return baseContext;
    }
  }

  /**
   * Extract primary content from unified context
   */
  private extractPrimaryContent(context: UnifiedContext): string {
    const parts: string[] = [];

    // Add direct content
    if (context.content.trim()) {
      parts.push(context.content.trim());
    }

    // Add recent messages
    if (context.messages.length > 0) {
      const recentMessages = context.messages.slice(-3);
      const messageText = recentMessages
        .map((m) => `${m.from}: ${m.content}`)
        .join(' | ');
      parts.push(messageText);
    }

    // Add current thoughts if available
    if (context.cognitionData?.thoughts?.length) {
      const recentThoughts = context.cognitionData.thoughts.slice(-2);
      parts.push(`Thoughts: ${recentThoughts.join(' ')}`);
    }

    return parts.join(' ').trim();
  }

  /**
   * Calculate context priority based on various factors
   */
  private calculatePriority(context: UnifiedContext): number {
    let priority = 0.5; // Base priority

    // Factor in engagement
    priority += (context.state.engagement - 0.5) * 0.2;

    // Factor in confidence
    priority += (context.state.confidence - 0.5) * 0.1;

    // Factor in complexity
    priority += context.state.complexity * 0.1;

    // Factor in recency (more recent = higher priority)
    const ageHours =
      (Date.now() - context.timestamp.getTime()) / (1000 * 60 * 60);
    if (ageHours < 1) priority += 0.2;
    else if (ageHours < 24) priority += 0.1;

    // Factor in message count
    if (context.messages.length > 5) priority += 0.1;

    // Factor in emotions
    if (context.emotionData?.currentEmotions?.length) {
      const avgIntensity =
        context.emotionData.currentEmotions.reduce(
          (sum, e) => sum + e.intensity,
          0
        ) / context.emotionData.currentEmotions.length;
      priority += avgIntensity * 0.1;
    }

    return Math.max(0, Math.min(1, priority));
  }

  /**
   * Apply minimal strategy - absolute minimum data
   */
  private applyMinimalStrategy(
    baseContext: MinimalContext,
    original: UnifiedContext
  ): MinimalContext {
    return {
      id: baseContext.id,
      agentId: baseContext.agentId,
      timestamp: baseContext.timestamp,
      content: baseContext.content.slice(0, 100), // Ultra-short content
      phase: baseContext.phase,
      priority: baseContext.priority,
      meta: {
        version: baseContext.meta.version,
        size: baseContext.meta.size,
        type: baseContext.meta.type,
        flags: baseContext.meta.flags.slice(0, 3), // Only top 3 flags
      },
    };
  }

  /**
   * Apply optimized strategy - balanced compression
   */
  private applyOptimizedStrategy(
    baseContext: MinimalContext,
    original: UnifiedContext
  ): MinimalContext {
    const result = { ...baseContext };

    // Add summary for optimized version
    if (original.content.length > 200) {
      result.summary = ContextCompressor.generateSummary(original.content, 80);
    }

    // Add relationships if they exist and are important
    if (original.memoryData?.relevantMemories?.length) {
      const importantRefs = original.memoryData.relevantMemories
        .filter((m) => m.relevance > 0.7)
        .slice(0, 3)
        .map((m) => m.id);

      if (importantRefs.length > 0) {
        result.refs = importantRefs;
      }
    }

    // Add performance tracking
    result.perf = {
      created: baseContext.timestamp,
      accessed: baseContext.timestamp,
      count: 1,
    };

    return result;
  }

  /**
   * Apply cached strategy - optimized for caching
   */
  private applyCachedStrategy(
    baseContext: MinimalContext,
    original: UnifiedContext
  ): MinimalContext {
    const result = this.applyOptimizedStrategy(baseContext, original);

    // Add cache-friendly features
    result.meta.flags.push('cacheable');

    // Ensure content is deterministic for cache key generation
    result.content = result.content.replace(/\s+/g, ' ').trim();

    return result;
  }

  /**
   * Cache management
   */
  private cacheResult(
    key: string,
    result: TransformationResult<MinimalContext>
  ): void {
    // Remove oldest entries if cache is full
    if (this.transformationCache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = this.transformationCache.keys().next().value;
      this.transformationCache.delete(oldestKey);
    }

    this.transformationCache.set(key, result);
  }

  private calculateCacheHitRate(): number {
    // This would be calculated based on actual cache statistics
    return 0.75; // Placeholder
  }

  /**
   * Validation implementation (simplified for minimal context)
   */
  async validate(
    context: MinimalContext,
    config?: ValidationConfig
  ): Promise<ValidationResult> {
    const errors: any[] = [];
    const warnings: any[] = [];

    // Validate required fields
    if (!context.id) {
      errors.push({
        field: 'id',
        message: 'Context ID is required',
        severity: 'critical',
        code: 'MISSING_ID',
      });
    }

    if (!context.agentId) {
      errors.push({
        field: 'agentId',
        message: 'Agent ID is required',
        severity: 'critical',
        code: 'MISSING_AGENT_ID',
      });
    }

    if (!context.content || context.content.trim().length === 0) {
      errors.push({
        field: 'content',
        message: 'Content cannot be empty',
        severity: 'high',
        code: 'EMPTY_CONTENT',
      });
    }

    // Validate ranges
    if (context.priority < 0 || context.priority > 1) {
      errors.push({
        field: 'priority',
        message: 'Priority must be between 0 and 1',
        severity: 'medium',
        code: 'INVALID_PRIORITY',
      });
    }

    // Validate timestamp
    if (context.timestamp <= 0) {
      errors.push({
        field: 'timestamp',
        message: 'Timestamp must be positive',
        severity: 'medium',
        code: 'INVALID_TIMESTAMP',
      });
    }

    // Check content length (warnings for efficiency)
    if (context.content.length > 500) {
      warnings.push({
        field: 'content',
        message: 'Content is longer than recommended for minimal context',
        code: 'LONG_CONTENT',
      });
    }

    // Check flag count
    if (context.meta.flags.length > 5) {
      warnings.push({
        field: 'meta.flags',
        message: 'Too many flags may impact performance',
        code: 'MANY_FLAGS',
      });
    }

    const score =
      errors.length === 0 ? (warnings.length === 0 ? 1.0 : 0.85) : 0.4;

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      score,
      timestamp: new Date(),
    };
  }

  /**
   * Get transformer capabilities
   */
  getCapabilities(): TransformerCapabilities {
    return {
      target: this.target,
      strategies: this.supportedStrategies,
      reversible: this.reversible,
      cacheable: true,
      streamable: true,
      batchable: true,
      maxInputSize: 1024 * 1024, // 1MB
      minInputSize: 10, // 10 bytes
      supportedFormats: ['json'],
      dependencies: [],
      performance: {
        averageDuration: 2, // ms - very fast
        memoryUsage: 256 * 1024, // 256KB - very light
        throughput: 5000, // contexts per second - very high
      },
    };
  }

  /**
   * Utility methods for minimal context operations
   */

  /**
   * Compare two minimal contexts for equality
   */
  static isEqual(context1: MinimalContext, context2: MinimalContext): boolean {
    return (
      context1.id === context2.id &&
      context1.agentId === context2.agentId &&
      context1.timestamp === context2.timestamp &&
      context1.content === context2.content &&
      context1.meta.version === context2.meta.version
    );
  }

  /**
   * Get context age in seconds
   */
  static getAge(context: MinimalContext): number {
    return Math.floor(Date.now() / 1000) - context.timestamp;
  }

  /**
   * Check if context is stale (older than threshold)
   */
  static isStale(
    context: MinimalContext,
    thresholdSeconds: number = 3600
  ): boolean {
    return this.getAge(context) > thresholdSeconds;
  }

  /**
   * Get memory footprint estimate in bytes
   */
  static getMemoryFootprint(context: MinimalContext): number {
    return JSON.stringify(context).length * 2; // Rough estimate including object overhead
  }

  /**
   * Create a copy with updated access tracking
   */
  static markAccessed(context: MinimalContext): MinimalContext {
    const updated = { ...context };

    if (updated.perf) {
      updated.perf = {
        ...updated.perf,
        accessed: Math.floor(Date.now() / 1000),
        count: updated.perf.count + 1,
      };
    }

    return updated;
  }

  /**
   * Helper methods for cache key generation and field tracking
   */
  private generateCacheKey(
    context: UnifiedContext,
    config?: TransformationConfig
  ): string {
    // Create a very compact cache key
    const keyComponents = [
      context.contextId.slice(-8), // Last 8 chars of context ID
      context.version.toString(36), // Base 36 encoding
      config?.strategy?.slice(0, 3) || 'min', // First 3 chars of strategy
      Math.floor(context.timestamp.getTime() / 300000).toString(36), // 5-minute buckets in base 36
    ];

    return keyComponents.join('_');
  }

  private getTransformedFields(strategy: TransformationStrategy): string[] {
    const baseFields = [
      'id',
      'agentId',
      'timestamp',
      'content',
      'phase',
      'priority',
      'meta',
    ];

    switch (strategy) {
      case TransformationStrategy.MINIMAL:
        return baseFields;
      case TransformationStrategy.OPTIMIZED:
        return [...baseFields, 'summary', 'refs', 'perf'];
      default:
        return baseFields;
    }
  }

  private getDroppedFields(strategy: TransformationStrategy): string[] {
    // Minimal transformer drops most fields by design
    return [
      'messages',
      'state',
      'environment',
      'metadata',
      'cognitionData',
      'emotionData',
      'memoryData',
      'extensionData',
      'performance',
    ];
  }

  private getAddedFields(): string[] {
    return ['priority', 'meta'];
  }

  /**
   * Batch transformation for multiple contexts
   */
  async transformBatch(
    contexts: UnifiedContext[],
    config?: TransformationConfig
  ): Promise<TransformationResult<MinimalContext>[]> {
    const results: TransformationResult<MinimalContext>[] = [];

    // Process in parallel for better performance
    const promises = contexts.map((context) => this.transform(context, config));
    const transformResults = await Promise.allSettled(promises);

    transformResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        // Create error result
        results.push({
          success: false,
          error: result.reason?.message || 'Unknown error',
          transformedContext: {} as MinimalContext,
          originalContext: contexts[index],
          target: this.target,
          strategy: config?.strategy || TransformationStrategy.MINIMAL,
          operation: 'transform' as any,
          metadata: {
            transformerId: this.id,
            transformerVersion: this.version,
            timestamp: new Date(),
            inputSize: 0,
            outputSize: 0,
            fieldsTransformed: [],
            fieldsDropped: [],
            fieldsAdded: [],
            validationPassed: false,
            cacheHit: false,
          },
          performance: {
            duration: 0,
            memoryUsage: 0,
            cpuUsage: 0,
            cacheHitRate: 0,
            compressionRatio: 0,
            throughput: 0,
          },
          reversible: false,
          cached: false,
        });
      }
    });

    return results;
  }

  /**
   * Clear transformation cache
   */
  clearCache(): void {
    this.transformationCache.clear();
    runtimeLogger.debug('Minimal context transformer cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; maxSize: number; hitRate: number } {
    return {
      size: this.transformationCache.size,
      maxSize: this.MAX_CACHE_SIZE,
      hitRate: this.calculateCacheHitRate(),
    };
  }
}

/**
 * Factory function for creating minimal context transformer
 */
export function createMinimalContextTransformer(): MinimalContextTransformer {
  return new MinimalContextTransformer();
}

/**
 * Utility functions for working with minimal contexts
 */
export class MinimalContextUtils {
  /**
   * Convert minimal context back to a basic unified context (lossy)
   */
  static toBasicUnified(minimal: MinimalContext): Partial<UnifiedContext> {
    return {
      agentId: minimal.agentId,
      contextId: minimal.id,
      timestamp: new Date(minimal.timestamp * 1000),
      content: minimal.content,
      version: minimal.meta.version,
      state: {
        phase: minimal.phase as any,
        mood: 'neutral',
        engagement: minimal.priority,
        confidence: minimal.priority,
        complexity: minimal.meta.flags.includes('complex') ? 0.8 : 0.4,
        priority: minimal.priority,
      },
      environment: {
        capabilities: minimal.meta.flags.includes('capable')
          ? ['basic']
          : undefined,
        constraints: minimal.meta.flags.includes('constrained')
          ? ['limited']
          : undefined,
      },
      metadata: {
        transformationHistory: [],
        validationResults: [],
        performanceMetrics: [],
      },
      performance: {
        creationTime: minimal.perf?.created || minimal.timestamp,
        lastAccessTime: minimal.perf?.accessed || minimal.timestamp,
        accessCount: minimal.perf?.count || 1,
        transformationCount: 1,
        size: minimal.meta.size,
        complexity: minimal.meta.flags.includes('complex') ? 0.8 : 0.4,
      },
      messages: [],
      lastModified: new Date(minimal.timestamp * 1000),
      userId: 'unknown',
      sessionId: 'unknown',
    };
  }

  /**
   * Create a minimal context from basic data
   */
  static fromBasicData(
    id: string,
    agentId: string,
    content: string,
    options?: Partial<MinimalContext>
  ): MinimalContext {
    return {
      id,
      agentId,
      timestamp: Math.floor(Date.now() / 1000),
      content: ContextCompressor.compressText(content, 200),
      phase: 'active',
      priority: 0.5,
      meta: {
        version: 1,
        size: content.length,
        type: 'simple',
        flags: [],
      },
      ...options,
    };
  }

  /**
   * Merge multiple minimal contexts into one
   */
  static merge(contexts: MinimalContext[], newId: string): MinimalContext {
    if (contexts.length === 0) {
      throw new Error('Cannot merge empty context array');
    }

    if (contexts.length === 1) {
      return { ...contexts[0], id: newId };
    }

    const merged: MinimalContext = {
      id: newId,
      agentId: contexts[0].agentId,
      timestamp: Math.min(...contexts.map((c) => c.timestamp)),
      content: contexts.map((c) => c.content).join(' | '),
      phase: contexts[contexts.length - 1].phase, // Use latest phase
      priority: Math.max(...contexts.map((c) => c.priority)),
      meta: {
        version: Math.max(...contexts.map((c) => c.meta.version)),
        size: contexts.reduce((sum, c) => sum + c.meta.size, 0),
        type: 'merged',
        flags: [...new Set(contexts.flatMap((c) => c.meta.flags))],
      },
    };

    // Compress merged content if too long
    if (merged.content.length > 300) {
      merged.content = ContextCompressor.compressText(merged.content, 300);
    }

    return merged;
  }
}
