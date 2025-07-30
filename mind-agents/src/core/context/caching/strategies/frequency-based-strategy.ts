/**
 * Frequency-Based Cache Strategy
 *
 * Manages cache based on access frequency patterns.
 * Frequently accessed items are promoted to higher cache levels.
 */

import {
  CacheLevel,
  CacheStrategy,
  CacheEntry,
  CacheInvalidationCriteria,
  type CacheStrategyInterface,
} from '../../../../types/context/context-caching';
import type { OperationResult } from '../../../../types/helpers';
import type { Metadata } from '../../../../types/common';

/**
 * Configuration for frequency-based strategy
 */
interface FrequencyStrategyConfig {
  /** Minimum access count for L1 cache */
  l1MinAccessCount: number;

  /** Minimum access count for L2 cache */
  l2MinAccessCount: number;

  /** Time window for frequency calculation (ms) */
  frequencyWindow: number;

  /** Access frequency weight (0-1) */
  frequencyWeight: number;

  /** Recency weight (0-1) */
  recencyWeight: number;

  /** Memory pressure threshold for aggressive eviction */
  memoryPressureThreshold: number;
}

/**
 * Frequency tracking data
 */
interface FrequencyData {
  totalAccesses: number;
  recentAccesses: number[];
  firstAccess: number;
  lastAccess: number;
  accessVelocity: number; // accesses per hour
}

/**
 * Frequency-based cache strategy implementation
 */
export class FrequencyBasedStrategy implements CacheStrategyInterface {
  readonly name = CacheStrategy.FREQUENCY_BASED;

  private config: FrequencyStrategyConfig;
  private frequencyData = new Map<string, FrequencyData>();
  private isInitialized = false;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(config?: Partial<FrequencyStrategyConfig>) {
    this.config = {
      l1MinAccessCount: 10,
      l2MinAccessCount: 5,
      frequencyWindow: 3600000, // 1 hour
      frequencyWeight: 0.7,
      recencyWeight: 0.3,
      memoryPressureThreshold: 0.8,
      ...config,
    };
  }

  /**
   * Initialize the frequency-based strategy
   */
  async initialize(
    config?: Partial<FrequencyStrategyConfig>
  ): Promise<OperationResult> {
    const startTime = performance.now();

    try {
      if (this.isInitialized) {
        return {
          success: false,
          error: 'Frequency strategy already initialized',
          timestamp: Date.now(),
          duration: performance.now() - startTime,
        };
      }

      if (config) {
        this.config = { ...this.config, ...config };
      }

      // Validate configuration
      if (this.config.frequencyWeight + this.config.recencyWeight !== 1) {
        throw new Error('Frequency weight and recency weight must sum to 1');
      }

      if (this.config.l1MinAccessCount <= this.config.l2MinAccessCount) {
        throw new Error('L1 minimum access count must be greater than L2');
      }

      // Start cleanup interval for old frequency data
      this.startCleanup();

      this.isInitialized = true;

      return {
        success: true,
        timestamp: Date.now(),
        duration: performance.now() - startTime,
        data: { config: this.config },
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
   * Determine optimal cache level based on frequency
   */
  determineCacheLevel(
    key: string,
    data: unknown,
    metadata: Metadata
  ): CacheLevel {
    const frequency = this.getFrequencyData(key);
    const recentAccessCount = this.calculateRecentAccesses(frequency);

    // Update frequency data
    this.updateFrequencyData(key);

    // Determine level based on access patterns
    if (recentAccessCount >= this.config.l1MinAccessCount) {
      return CacheLevel.L1;
    }

    if (recentAccessCount >= this.config.l2MinAccessCount) {
      return CacheLevel.L2;
    }

    return CacheLevel.L3;
  }

  /**
   * Calculate priority score based on frequency and recency
   */
  calculatePriority(entry: CacheEntry): number {
    const frequency = this.getFrequencyData(entry.id);
    const now = Date.now();

    // Calculate frequency score (0-10)
    const recentAccessCount = this.calculateRecentAccesses(frequency);
    const maxExpectedAccesses = Math.max(this.config.l1MinAccessCount, 20);
    const frequencyScore = Math.min(
      (recentAccessCount / maxExpectedAccesses) * 10,
      10
    );

    // Calculate recency score (0-10)
    const timeSinceLastAccess = now - entry.lastAccessedAt;
    const maxAgeForFullScore = this.config.frequencyWindow / 4; // 15 minutes for 1-hour window
    const recencyScore = Math.max(
      0,
      10 - (timeSinceLastAccess / maxAgeForFullScore) * 10
    );

    // Weighted combination
    const priority =
      frequencyScore * this.config.frequencyWeight +
      recencyScore * this.config.recencyWeight;

    return Math.max(1, Math.min(10, Math.round(priority)));
  }

  /**
   * Predict access probability based on frequency patterns
   */
  predictAccess(key: string, context: Metadata): number {
    const frequency = this.getFrequencyData(key);
    const now = Date.now();

    if (frequency.totalAccesses === 0) {
      return 0.1; // Low baseline probability for new keys
    }

    // Calculate access velocity (accesses per hour)
    const ageHours = (now - frequency.firstAccess) / 3600000;
    const velocity = ageHours > 0 ? frequency.totalAccesses / ageHours : 0;

    // Time since last access factor
    const timeSinceLastAccess = now - frequency.lastAccess;
    const expectedInterval = velocity > 0 ? 3600000 / velocity : Infinity;

    let probability = 0;

    if (timeSinceLastAccess < expectedInterval) {
      // Still within expected interval
      probability = 0.8;
    } else if (timeSinceLastAccess < expectedInterval * 2) {
      // Slightly overdue
      probability = 0.6;
    } else if (timeSinceLastAccess < expectedInterval * 4) {
      // Significantly overdue, might be accessed soon
      probability = 0.4;
    } else {
      // Very overdue, low probability
      probability = 0.2;
    }

    // Adjust based on recent trend
    const recentTrend = this.calculateAccessTrend(frequency);
    if (recentTrend > 1) {
      probability *= 1.2; // Increasing trend
    } else if (recentTrend < 1) {
      probability *= 0.8; // Decreasing trend
    }

    return Math.max(0, Math.min(1, probability));
  }

  /**
   * Recommend items for warming based on frequency patterns
   */
  recommendWarming(context: Metadata): string[] {
    const recommendations: Array<{ key: string; score: number }> = [];
    const now = Date.now();

    for (const [key, frequency] of this.frequencyData) {
      const accessProbability = this.predictAccess(key, context);
      const timeSinceLastAccess = now - frequency.lastAccess;

      // Recommend if high probability and not accessed recently
      if (accessProbability > 0.6 && timeSinceLastAccess > 300000) {
        // 5 minutes
        recommendations.push({
          key,
          score: accessProbability * (1 + frequency.accessVelocity / 10),
        });
      }
    }

    // Sort by score and return top recommendations
    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)
      .map((r) => r.key);
  }

  /**
   * Handle memory pressure by identifying items for eviction
   */
  handleMemoryPressure(
    currentUsage: number,
    threshold: number
  ): CacheInvalidationCriteria[] {
    const pressureRatio = currentUsage / threshold;
    const criteria: CacheInvalidationCriteria[] = [];

    if (pressureRatio > this.config.memoryPressureThreshold) {
      // Aggressive cleanup - remove items with low access count
      criteria.push({
        accessCountLessThan: Math.max(1, this.config.l2MinAccessCount / 2),
        filter: (entry) => {
          const frequency = this.getFrequencyData(entry.id);
          const recentAccesses = this.calculateRecentAccesses(frequency);
          return recentAccesses < this.config.l2MinAccessCount / 2;
        },
      });

      // Remove old items that haven't been accessed recently
      const oldThreshold = Date.now() - this.config.frequencyWindow * 2;
      criteria.push({
        olderThan: this.config.frequencyWindow * 2,
        filter: (entry) => entry.lastAccessedAt < oldThreshold,
      });
    }

    if (pressureRatio > 0.9) {
      // Critical memory pressure - more aggressive cleanup
      criteria.push({
        accessCountLessThan: this.config.l2MinAccessCount,
        filter: (entry) => {
          const frequency = this.getFrequencyData(entry.id);
          const accessProbability = this.predictAccess(entry.id, {});
          return accessProbability < 0.3;
        },
      });
    }

    return criteria;
  }

  /**
   * Get or create frequency data for a key
   */
  private getFrequencyData(key: string): FrequencyData {
    let data = this.frequencyData.get(key);

    if (!data) {
      const now = Date.now();
      data = {
        totalAccesses: 0,
        recentAccesses: [],
        firstAccess: now,
        lastAccess: now,
        accessVelocity: 0,
      };
      this.frequencyData.set(key, data);
    }

    return data;
  }

  /**
   * Update frequency data when key is accessed
   */
  private updateFrequencyData(key: string): void {
    const data = this.getFrequencyData(key);
    const now = Date.now();

    data.totalAccesses++;
    data.lastAccess = now;
    data.recentAccesses.push(now);

    // Remove old accesses outside the frequency window
    const cutoff = now - this.config.frequencyWindow;
    data.recentAccesses = data.recentAccesses.filter((time) => time > cutoff);

    // Update access velocity (accesses per hour)
    const ageHours = (now - data.firstAccess) / 3600000;
    data.accessVelocity = ageHours > 0 ? data.totalAccesses / ageHours : 0;
  }

  /**
   * Calculate recent access count within frequency window
   */
  private calculateRecentAccesses(frequency: FrequencyData): number {
    const now = Date.now();
    const cutoff = now - this.config.frequencyWindow;

    return frequency.recentAccesses.filter((time) => time > cutoff).length;
  }

  /**
   * Calculate access trend (increasing/decreasing)
   */
  private calculateAccessTrend(frequency: FrequencyData): number {
    if (frequency.recentAccesses.length < 4) {
      return 1; // Neutral trend
    }

    // Split recent accesses into two halves
    const midpoint = Math.floor(frequency.recentAccesses.length / 2);
    const firstHalf = frequency.recentAccesses.slice(0, midpoint);
    const secondHalf = frequency.recentAccesses.slice(midpoint);

    // Compare access density between halves
    const firstHalfTime = firstHalf[firstHalf.length - 1] - firstHalf[0];
    const secondHalfTime = secondHalf[secondHalf.length - 1] - secondHalf[0];

    if (firstHalfTime === 0 || secondHalfTime === 0) {
      return 1;
    }

    const firstHalfDensity = firstHalf.length / firstHalfTime;
    const secondHalfDensity = secondHalf.length / secondHalfTime;

    return secondHalfDensity / firstHalfDensity;
  }

  /**
   * Start cleanup interval for old frequency data
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const maxAge = this.config.frequencyWindow * 4; // Keep data for 4x the frequency window

      for (const [key, data] of this.frequencyData) {
        if (now - data.lastAccess > maxAge) {
          this.frequencyData.delete(key);
        }
      }
    }, this.config.frequencyWindow); // Run cleanup every frequency window
  }

  /**
   * Shutdown strategy and cleanup resources
   */
  async shutdown(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }

    this.frequencyData.clear();
    this.isInitialized = false;
  }

  /**
   * Get strategy statistics
   */
  getStats(): {
    trackedKeys: number;
    totalAccesses: number;
    averageVelocity: number;
    config: FrequencyStrategyConfig;
  } {
    const totalAccesses = Array.from(this.frequencyData.values()).reduce(
      (sum, data) => sum + data.totalAccesses,
      0
    );

    const averageVelocity =
      Array.from(this.frequencyData.values()).reduce(
        (sum, data) => sum + data.accessVelocity,
        0
      ) / this.frequencyData.size;

    return {
      trackedKeys: this.frequencyData.size,
      totalAccesses,
      averageVelocity: averageVelocity || 0,
      config: this.config,
    };
  }
}
