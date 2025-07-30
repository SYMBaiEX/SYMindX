/**
 * Cache Warmer - Predictive Cache Warming System
 *
 * Intelligently pre-loads cache entries based on access patterns,
 * prediction models, and warming strategies to improve cache hit rates.
 */

import {
  CacheLevel,
  CacheAccessPattern,
  type ContextCacheManager,
  type CacheConfiguration,
  type CacheWarmingRequest,
  type CacheWarmingConfig,
  type CacheSetOptions,
} from '../../../types/context/context-caching';
import type { OperationResult } from '../../../types/helpers';
import type { Metadata } from '../../../types/common';

/**
 * Access pattern tracking
 */
interface AccessPattern {
  key: string;
  accessTimes: number[];
  frequency: number;
  lastAccess: number;
  contextualKeys: Set<string>;
  pattern: CacheAccessPattern;
}

/**
 * Warming prediction result
 */
interface WarmingPrediction {
  key: string;
  confidence: number;
  reason: string;
  suggestedLevel: CacheLevel;
  priority: number;
  estimatedAccessTime?: number;
}

/**
 * Warming job for execution
 */
interface WarmingJob {
  id: string;
  predictions: WarmingPrediction[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime?: number;
  endTime?: number;
  itemsWarmed: number;
  errors: Error[];
}

/**
 * Cache warmer implementation
 */
export class CacheWarmer {
  private cacheManager: ContextCacheManager;
  private config: CacheWarmingConfig;
  private isInitialized = false;

  // Pattern tracking
  private accessPatterns = new Map<string, AccessPattern>();
  private contextualRelationships = new Map<string, Set<string>>();

  // Warming state
  private activeJobs = new Map<string, WarmingJob>();
  private warmingHistory: WarmingJob[] = [];
  private isWarming = false;

  // Scheduled warming
  private scheduledWarmingInterval?: NodeJS.Timeout;

  // Performance metrics
  private metrics = {
    totalWarmingJobs: 0,
    successfulWarming: 0,
    failedWarming: 0,
    itemsWarmed: 0,
    warmingTime: 0,
    hitRateImprovement: 0,
  };

  constructor(
    cacheManager: ContextCacheManager,
    cacheConfig: CacheConfiguration
  ) {
    this.cacheManager = cacheManager;

    // Extract warming config with defaults
    this.config = {
      enabled: cacheConfig.global.enableWarming,
      strategies: {
        predictive: {
          enabled: true,
          lookAheadWindow: 3600000, // 1 hour
          confidenceThreshold: 0.7,
        },
        frequency: {
          enabled: true,
          minimumAccessCount: 3,
          timeWindow: 1800000, // 30 minutes
        },
        contextual: {
          enabled: true,
          relatedItemsDepth: 2,
        },
        temporal: {
          enabled: false,
          schedules: [],
        },
      },
      constraints: {
        maxConcurrentWarmingOps: 5,
        maxWarmingMemory: 50 * 1024 * 1024, // 50MB
        maxWarmingTime: 300000, // 5 minutes
      },
    };
  }

  /**
   * Initialize the cache warmer
   */
  async initialize(): Promise<OperationResult> {
    const startTime = performance.now();

    try {
      if (this.isInitialized) {
        return {
          success: false,
          error: 'Cache warmer already initialized',
          timestamp: Date.now(),
          duration: performance.now() - startTime,
        };
      }

      if (!this.config.enabled) {
        return {
          success: true,
          timestamp: Date.now(),
          duration: performance.now() - startTime,
          data: { enabled: false },
        };
      }

      // Start scheduled warming if enabled
      if (this.config.strategies.temporal.enabled) {
        this.startScheduledWarming();
      }

      // Start periodic pattern analysis
      this.startPatternAnalysis();

      this.isInitialized = true;

      return {
        success: true,
        timestamp: Date.now(),
        duration: performance.now() - startTime,
        data: {
          enabled: true,
          strategiesEnabled: Object.entries(this.config.strategies)
            .filter(([, strategy]) => strategy.enabled)
            .map(([name]) => name),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
        duration: performance.now() - startTime,
      };
    }
  }

  /**
   * Warm cache with specific items or predictions
   */
  async warmCache(items?: CacheWarmingRequest[]): Promise<OperationResult> {
    if (!this.isInitialized || !this.config.enabled) {
      return {
        success: false,
        error: 'Cache warmer not initialized or disabled',
        timestamp: Date.now(),
        duration: 0,
      };
    }

    const startTime = performance.now();
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Create warming job
      const job: WarmingJob = {
        id: jobId,
        predictions: [],
        status: 'pending',
        itemsWarmed: 0,
        errors: [],
      };

      this.activeJobs.set(jobId, job);

      let warmingItems: CacheWarmingRequest[] = [];

      if (items && items.length > 0) {
        // Use provided items
        warmingItems = items;
      } else {
        // Generate predictions
        const predictions = await this.generateWarmingPredictions();
        job.predictions = predictions;

        // Convert predictions to warming requests
        warmingItems = predictions.map((prediction) => ({
          key: prediction.key,
          loader: async () => {
            // This would typically load data from external source
            // For now, return null to indicate no data available
            return null;
          },
          options: {
            level: prediction.suggestedLevel,
            priority: prediction.priority,
            metadata: {
              warmingReason: prediction.reason,
              warmingConfidence: prediction.confidence,
              warmingTime: Date.now(),
            },
          },
        }));
      }

      job.status = 'running';
      job.startTime = Date.now();

      // Execute warming with concurrency control
      const results = await this.executeWarmingBatch(warmingItems);

      // Update job status
      job.status = results.every((r) => r.success) ? 'completed' : 'failed';
      job.endTime = Date.now();
      job.itemsWarmed = results.filter((r) => r.success).length;
      job.errors = results
        .filter((r) => !r.success)
        .map((r) => new Error(r.error || 'Unknown error'));

      // Move to history
      this.warmingHistory.push({ ...job });
      this.activeJobs.delete(jobId);

      // Update metrics
      this.metrics.totalWarmingJobs++;
      if (job.status === 'completed') {
        this.metrics.successfulWarming++;
      } else {
        this.metrics.failedWarming++;
      }
      this.metrics.itemsWarmed += job.itemsWarmed;
      this.metrics.warmingTime += job.endTime - job.startTime!;

      const duration = performance.now() - startTime;

      return {
        success: job.status === 'completed',
        timestamp: Date.now(),
        duration,
        data: {
          jobId,
          itemsWarmed: job.itemsWarmed,
          totalItems: warmingItems.length,
          errors: job.errors.length,
          predictions: job.predictions.length,
        },
      };
    } catch (error) {
      // Clean up failed job
      this.activeJobs.delete(jobId);
      this.metrics.failedWarming++;

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
        duration: performance.now() - startTime,
      };
    }
  }

  /**
   * Record access pattern for future predictions
   */
  recordAccess(key: string, context?: Metadata): void {
    if (!this.isInitialized || !this.config.enabled) {
      return;
    }

    const now = Date.now();

    // Update access pattern
    let pattern = this.accessPatterns.get(key);
    if (!pattern) {
      pattern = {
        key,
        accessTimes: [],
        frequency: 0,
        lastAccess: now,
        contextualKeys: new Set(),
        pattern: CacheAccessPattern.RANDOM,
      };
      this.accessPatterns.set(key, pattern);
    }

    pattern.accessTimes.push(now);
    pattern.frequency++;
    pattern.lastAccess = now;

    // Keep only recent access times
    const cutoff = now - this.config.strategies.frequency.timeWindow;
    pattern.accessTimes = pattern.accessTimes.filter((time) => time > cutoff);

    // Analyze access pattern
    pattern.pattern = this.analyzeAccessPattern(pattern.accessTimes);

    // Record contextual relationships
    if (context && context.relatedKeys) {
      const relatedKeys = Array.isArray(context.relatedKeys)
        ? context.relatedKeys
        : [context.relatedKeys];

      for (const relatedKey of relatedKeys) {
        if (typeof relatedKey === 'string') {
          pattern.contextualKeys.add(relatedKey);

          // Update bidirectional relationship
          if (!this.contextualRelationships.has(key)) {
            this.contextualRelationships.set(key, new Set());
          }
          if (!this.contextualRelationships.has(relatedKey)) {
            this.contextualRelationships.set(relatedKey, new Set());
          }

          this.contextualRelationships.get(key)!.add(relatedKey);
          this.contextualRelationships.get(relatedKey)!.add(key);
        }
      }
    }
  }

  /**
   * Get warming statistics
   */
  getWarmingStats(): {
    metrics: typeof this.metrics;
    activeJobs: number;
    patternCount: number;
    relationshipCount: number;
    recentHistory: WarmingJob[];
  } {
    return {
      metrics: { ...this.metrics },
      activeJobs: this.activeJobs.size,
      patternCount: this.accessPatterns.size,
      relationshipCount: this.contextualRelationships.size,
      recentHistory: this.warmingHistory.slice(-10), // Last 10 jobs
    };
  }

  /**
   * Shutdown cache warmer
   */
  async shutdown(): Promise<OperationResult> {
    const startTime = performance.now();

    try {
      // Stop scheduled warming
      if (this.scheduledWarmingInterval) {
        clearInterval(this.scheduledWarmingInterval);
        this.scheduledWarmingInterval = undefined;
      }

      // Wait for active jobs to complete (with timeout)
      const jobPromises = Array.from(this.activeJobs.values()).map(
        async (job) => {
          // Wait up to 30 seconds for job completion
          let attempts = 0;
          while (job.status === 'running' && attempts < 300) {
            await new Promise((resolve) => setTimeout(resolve, 100));
            attempts++;
          }
        }
      );

      await Promise.all(jobPromises);

      // Clear state
      this.activeJobs.clear();
      this.accessPatterns.clear();
      this.contextualRelationships.clear();
      this.isInitialized = false;

      return {
        success: true,
        timestamp: Date.now(),
        duration: performance.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
        duration: performance.now() - startTime,
      };
    }
  }

  /**
   * Generate warming predictions based on configured strategies
   */
  private async generateWarmingPredictions(): Promise<WarmingPrediction[]> {
    const predictions: WarmingPrediction[] = [];
    const now = Date.now();

    // Frequency-based predictions
    if (this.config.strategies.frequency.enabled) {
      for (const [key, pattern] of this.accessPatterns) {
        if (
          pattern.frequency >=
          this.config.strategies.frequency.minimumAccessCount
        ) {
          const timeSinceLastAccess = now - pattern.lastAccess;
          const averageInterval = this.calculateAverageInterval(
            pattern.accessTimes
          );

          // Predict if key should be accessed soon
          if (timeSinceLastAccess >= averageInterval * 0.8) {
            predictions.push({
              key,
              confidence: Math.min(pattern.frequency / 10, 0.9),
              reason: `Frequent access pattern (${pattern.frequency} times)`,
              suggestedLevel: this.determineLevelFromPattern(pattern),
              priority: Math.min(pattern.frequency, 10),
              estimatedAccessTime:
                now + (averageInterval - timeSinceLastAccess),
            });
          }
        }
      }
    }

    // Predictive strategy based on trends
    if (this.config.strategies.predictive.enabled) {
      for (const [key, pattern] of this.accessPatterns) {
        if (pattern.accessTimes.length >= 3) {
          const trend = this.analyzeTrend(pattern.accessTimes);

          if (
            trend.increasing &&
            trend.confidence >
              this.config.strategies.predictive.confidenceThreshold
          ) {
            predictions.push({
              key,
              confidence: trend.confidence,
              reason: `Increasing access trend (${trend.slope.toFixed(2)} increase/hour)`,
              suggestedLevel: CacheLevel.L1,
              priority: Math.ceil(trend.confidence * 10),
            });
          }
        }
      }
    }

    // Contextual predictions
    if (this.config.strategies.contextual.enabled) {
      for (const [key, pattern] of this.accessPatterns) {
        if (pattern.lastAccess > now - 300000) {
          // Recently accessed (5 min)
          const relatedKeys = this.contextualRelationships.get(key);

          if (relatedKeys && relatedKeys.size > 0) {
            for (const relatedKey of relatedKeys) {
              const relatedPattern = this.accessPatterns.get(relatedKey);

              if (
                relatedPattern &&
                !predictions.some((p) => p.key === relatedKey)
              ) {
                predictions.push({
                  key: relatedKey,
                  confidence: 0.6,
                  reason: `Contextually related to recently accessed key: ${key}`,
                  suggestedLevel: CacheLevel.L2,
                  priority: 5,
                });
              }
            }
          }
        }
      }
    }

    // Sort by confidence and limit
    return predictions.sort((a, b) => b.confidence - a.confidence).slice(0, 50); // Limit to top 50 predictions
  }

  /**
   * Execute warming batch with concurrency control
   */
  private async executeWarmingBatch(
    items: CacheWarmingRequest[]
  ): Promise<OperationResult[]> {
    const results: OperationResult[] = [];
    const semaphore = new Array(
      this.config.constraints.maxConcurrentWarmingOps
    ).fill(null);

    const executeItem = async (
      item: CacheWarmingRequest
    ): Promise<OperationResult> => {
      try {
        let data = item.data;

        // Load data if not provided
        if (data === undefined && item.loader) {
          data = await item.loader();
        }

        // Skip if no data available
        if (data === null || data === undefined) {
          return {
            success: false,
            error: 'No data available for warming',
            timestamp: Date.now(),
            duration: 0,
          };
        }

        // Set in cache
        return await this.cacheManager.set(item.key, data, item.options);
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: Date.now(),
          duration: 0,
        };
      }
    };

    // Execute with concurrency control
    let index = 0;
    const executeNext = async (): Promise<void> => {
      if (index >= items.length) return;

      const currentIndex = index++;
      const item = items[currentIndex];
      const result = await executeItem(item);
      results[currentIndex] = result;

      // Continue with next item
      await executeNext();
    };

    // Start concurrent executions
    const promises = semaphore.map(() => executeNext());
    await Promise.all(promises);

    return results;
  }

  /**
   * Analyze access pattern type
   */
  private analyzeAccessPattern(accessTimes: number[]): CacheAccessPattern {
    if (accessTimes.length < 2) {
      return CacheAccessPattern.RANDOM;
    }

    // Calculate intervals between accesses
    const intervals: number[] = [];
    for (let i = 1; i < accessTimes.length; i++) {
      intervals.push(accessTimes[i] - accessTimes[i - 1]);
    }

    // Calculate variance in intervals
    const avgInterval =
      intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    const variance =
      intervals.reduce(
        (sum, interval) => sum + Math.pow(interval - avgInterval, 2),
        0
      ) / intervals.length;
    const stdDev = Math.sqrt(variance);
    const coefficient = stdDev / avgInterval;

    // Classify pattern based on regularity
    if (coefficient < 0.3) {
      return CacheAccessPattern.TEMPORAL; // Regular intervals
    } else if (coefficient < 0.7) {
      return CacheAccessPattern.SEQUENTIAL; // Somewhat regular
    } else {
      return CacheAccessPattern.RANDOM; // Irregular
    }
  }

  /**
   * Calculate average interval between accesses
   */
  private calculateAverageInterval(accessTimes: number[]): number {
    if (accessTimes.length < 2) {
      return 3600000; // Default 1 hour
    }

    const intervals: number[] = [];
    for (let i = 1; i < accessTimes.length; i++) {
      intervals.push(accessTimes[i] - accessTimes[i - 1]);
    }

    return (
      intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length
    );
  }

  /**
   * Analyze trend in access times
   */
  private analyzeTrend(accessTimes: number[]): {
    increasing: boolean;
    slope: number;
    confidence: number;
  } {
    if (accessTimes.length < 3) {
      return { increasing: false, slope: 0, confidence: 0 };
    }

    // Simple linear regression on access frequency over time
    const timeWindows = Math.floor(accessTimes.length / 3);
    const windowSize = Math.floor(accessTimes.length / timeWindows);

    const frequencies: number[] = [];
    for (let i = 0; i < timeWindows; i++) {
      const start = i * windowSize;
      const end = Math.min(start + windowSize, accessTimes.length);
      const windowAccesses = end - start;
      frequencies.push(windowAccesses);
    }

    // Calculate slope
    let sumX = 0,
      sumY = 0,
      sumXY = 0,
      sumX2 = 0;
    for (let i = 0; i < frequencies.length; i++) {
      sumX += i;
      sumY += frequencies[i];
      sumXY += i * frequencies[i];
      sumX2 += i * i;
    }

    const n = frequencies.length;
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    // Calculate confidence (R-squared)
    const meanY = sumY / n;
    let ssRes = 0,
      ssTot = 0;
    for (let i = 0; i < frequencies.length; i++) {
      const predicted = slope * i + (sumY - slope * sumX) / n;
      ssRes += Math.pow(frequencies[i] - predicted, 2);
      ssTot += Math.pow(frequencies[i] - meanY, 2);
    }

    const rSquared = 1 - ssRes / ssTot;

    return {
      increasing: slope > 0,
      slope: slope * 3600000, // Convert to per hour
      confidence: Math.max(0, Math.min(1, rSquared)),
    };
  }

  /**
   * Determine cache level from access pattern
   */
  private determineLevelFromPattern(pattern: AccessPattern): CacheLevel {
    // High frequency, recent access -> L1
    if (pattern.frequency >= 10 && Date.now() - pattern.lastAccess < 300000) {
      return CacheLevel.L1;
    }

    // Medium frequency -> L2
    if (pattern.frequency >= 5) {
      return CacheLevel.L2;
    }

    // Default to L3
    return CacheLevel.L3;
  }

  /**
   * Start scheduled warming based on temporal configuration
   */
  private startScheduledWarming(): void {
    // This would implement cron-like scheduling
    // For now, just a simple interval
    this.scheduledWarmingInterval = setInterval(async () => {
      if (!this.isWarming) {
        this.isWarming = true;
        try {
          await this.warmCache();
        } catch (error) {
          console.warn('Scheduled warming failed:', error);
        } finally {
          this.isWarming = false;
        }
      }
    }, 600000); // Every 10 minutes
  }

  /**
   * Start periodic pattern analysis
   */
  private startPatternAnalysis(): void {
    setInterval(() => {
      this.cleanupOldPatterns();
    }, 300000); // Every 5 minutes
  }

  /**
   * Clean up old access patterns
   */
  private cleanupOldPatterns(): void {
    const cutoff = Date.now() - 24 * 3600000; // 24 hours

    for (const [key, pattern] of this.accessPatterns) {
      if (pattern.lastAccess < cutoff) {
        this.accessPatterns.delete(key);
        this.contextualRelationships.delete(key);
      }
    }
  }
}
