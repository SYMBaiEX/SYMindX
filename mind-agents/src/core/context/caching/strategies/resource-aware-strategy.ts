/**
 * Resource-Aware Cache Strategy
 *
 * Adapts cache behavior based on system resource availability
 * including memory, CPU, and I/O constraints.
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
 * Configuration for resource-aware strategy
 */
interface ResourceAwareConfig {
  /** Memory usage threshold for strategy adjustments (0-1) */
  memoryThreshold: number;

  /** CPU usage threshold for strategy adjustments (0-1) */
  cpuThreshold: number;

  /** I/O latency threshold in milliseconds */
  ioLatencyThreshold: number;

  /** Sample interval for resource monitoring (ms) */
  monitoringInterval: number;

  /** Number of samples to keep for trend analysis */
  sampleHistorySize: number;

  /** Aggressiveness factor for resource-based decisions (0-2) */
  aggressiveness: number;
}

/**
 * System resource metrics
 */
interface ResourceMetrics {
  /** Memory usage percentage (0-1) */
  memoryUsage: number;

  /** CPU usage percentage (0-1) */
  cpuUsage: number;

  /** Average I/O latency in milliseconds */
  ioLatency: number;

  /** Available memory in bytes */
  availableMemory: number;

  /** Timestamp of measurement */
  timestamp: number;
}

/**
 * Resource pressure levels
 */
enum ResourcePressure {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Cache behavior adjustments based on resource pressure
 */
interface BehaviorAdjustments {
  /** Preferred cache level for new entries */
  preferredLevel: CacheLevel;

  /** Maximum entry size to cache */
  maxEntrySize: number;

  /** TTL multiplier for entries */
  ttlMultiplier: number;

  /** Compression threshold adjustment */
  compressionThreshold: number;

  /** Eviction aggressiveness (0-1) */
  evictionAggressiveness: number;
}

/**
 * Resource-aware cache strategy implementation
 */
export class ResourceAwareStrategy implements CacheStrategyInterface {
  readonly name = CacheStrategy.RESOURCE_AWARE;

  private config: ResourceAwareConfig;
  private resourceHistory: ResourceMetrics[] = [];
  private currentPressure = ResourcePressure.LOW;
  private behaviorAdjustments: BehaviorAdjustments;
  private isInitialized = false;
  private monitoringInterval?: NodeJS.Timeout;

  constructor(config?: Partial<ResourceAwareConfig>) {
    this.config = {
      memoryThreshold: 0.8,
      cpuThreshold: 0.7,
      ioLatencyThreshold: 100,
      monitoringInterval: 5000, // 5 seconds
      sampleHistorySize: 60, // 5 minutes of samples
      aggressiveness: 1.0,
      ...config,
    };

    // Initialize with default behavior
    this.behaviorAdjustments = this.getDefaultBehavior();
  }

  /**
   * Initialize the resource-aware strategy
   */
  async initialize(
    config?: Partial<ResourceAwareConfig>
  ): Promise<OperationResult> {
    const startTime = performance.now();

    try {
      if (this.isInitialized) {
        return {
          success: false,
          error: 'Resource-aware strategy already initialized',
          timestamp: Date.now(),
          duration: performance.now() - startTime,
        };
      }

      if (config) {
        this.config = { ...this.config, ...config };
      }

      // Validate configuration
      if (this.config.memoryThreshold <= 0 || this.config.memoryThreshold > 1) {
        throw new Error('Memory threshold must be between 0 and 1');
      }

      if (this.config.aggressiveness < 0 || this.config.aggressiveness > 2) {
        throw new Error('Aggressiveness must be between 0 and 2');
      }

      // Start resource monitoring
      await this.startResourceMonitoring();

      this.isInitialized = true;

      return {
        success: true,
        timestamp: Date.now(),
        duration: performance.now() - startTime,
        data: {
          config: this.config,
          initialPressure: this.currentPressure,
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
   * Determine cache level based on current resource situation
   */
  determineCacheLevel(
    key: string,
    data: unknown,
    metadata: Metadata
  ): CacheLevel {
    // Update resource assessment
    this.updateResourcePressure();

    const dataSize = this.estimateDataSize(data);
    const adjustments = this.behaviorAdjustments;

    // Don't cache large items under resource pressure
    if (dataSize > adjustments.maxEntrySize) {
      return CacheLevel.L3;
    }

    // Prefer the level suggested by current resource situation
    const preferredLevel = adjustments.preferredLevel;

    // Consider data size for level selection
    if (preferredLevel === CacheLevel.L1 && dataSize > 10240) {
      // 10KB
      return CacheLevel.L2;
    }

    if (preferredLevel === CacheLevel.L2 && dataSize > 102400) {
      // 100KB
      return CacheLevel.L3;
    }

    return preferredLevel;
  }

  /**
   * Calculate priority based on resource constraints
   */
  calculatePriority(entry: CacheEntry): number {
    const basePriority = entry.priority || 1;
    const adjustments = this.behaviorAdjustments;

    // Adjust priority based on resource pressure
    let resourceAdjustedPriority = basePriority;

    // Penalize large entries under resource pressure
    const sizeRatio = entry.size / adjustments.maxEntrySize;
    if (sizeRatio > 0.5) {
      resourceAdjustedPriority *=
        1 - (sizeRatio - 0.5) * adjustments.evictionAggressiveness;
    }

    // Boost priority for recently accessed items under high pressure
    if (
      this.currentPressure === ResourcePressure.HIGH ||
      this.currentPressure === ResourcePressure.CRITICAL
    ) {
      const timeSinceAccess = Date.now() - entry.lastAccessedAt;
      const hoursSinceAccess = timeSinceAccess / 3600000;

      if (hoursSinceAccess < 1) {
        resourceAdjustedPriority *= 1.5; // Boost recent items
      } else if (hoursSinceAccess > 4) {
        resourceAdjustedPriority *= 0.7; // Penalize old items
      }
    }

    return Math.max(1, Math.min(10, Math.round(resourceAdjustedPriority)));
  }

  /**
   * Predict access probability considering resource constraints
   */
  predictAccess(key: string, context: Metadata): number {
    // Base prediction would come from other strategies
    // Here we adjust based on resource situation
    let basePrediction = 0.5; // Would be calculated by other means

    // Under high resource pressure, reduce prediction confidence
    // to avoid aggressive caching
    switch (this.currentPressure) {
      case ResourcePressure.CRITICAL:
        basePrediction *= 0.3;
        break;
      case ResourcePressure.HIGH:
        basePrediction *= 0.6;
        break;
      case ResourcePressure.MEDIUM:
        basePrediction *= 0.8;
        break;
      case ResourcePressure.LOW:
        // No adjustment
        break;
    }

    return Math.max(0, Math.min(1, basePrediction));
  }

  /**
   * Recommend warming based on resource availability
   */
  recommendWarming(context: Metadata): string[] {
    // Don't recommend warming under resource pressure
    if (
      this.currentPressure === ResourcePressure.HIGH ||
      this.currentPressure === ResourcePressure.CRITICAL
    ) {
      return [];
    }

    // Under medium pressure, recommend only high-confidence items
    const maxRecommendations =
      this.currentPressure === ResourcePressure.MEDIUM ? 5 : 20;

    // This would typically work with other strategies to get recommendations
    // and filter them based on resource constraints
    return []; // Placeholder
  }

  /**
   * Handle memory pressure with resource-aware eviction
   */
  handleMemoryPressure(
    currentUsage: number,
    threshold: number
  ): CacheInvalidationCriteria[] {
    const pressureRatio = currentUsage / threshold;
    const criteria: CacheInvalidationCriteria[] = [];

    // Aggressive cleanup based on current resource pressure
    const aggressiveness = this.behaviorAdjustments.evictionAggressiveness;

    if (pressureRatio > 0.9) {
      // Critical pressure - remove large and old items
      criteria.push({
        filter: (entry) => {
          const sizeThreshold = this.behaviorAdjustments.maxEntrySize * 0.1;
          const ageThreshold = Date.now() - 3600000 * aggressiveness; // 1 hour * aggressiveness

          return (
            entry.size > sizeThreshold || entry.lastAccessedAt < ageThreshold
          );
        },
      });
    }

    if (pressureRatio > 0.8) {
      // High pressure - remove items based on access patterns
      criteria.push({
        accessCountLessThan: Math.ceil(5 * aggressiveness),
        filter: (entry) => {
          const timeSinceAccess = Date.now() - entry.lastAccessedAt;
          return timeSinceAccess > 1800000 * aggressiveness; // 30 minutes * aggressiveness
        },
      });
    }

    // Consider current resource trends
    const trend = this.getResourceTrend();
    if (trend.memoryTrend > 0.1) {
      // Memory usage increasing
      criteria.push({
        filter: (entry) => {
          // More aggressive eviction if memory usage is trending up
          return entry.priority < 5 * (2 - aggressiveness);
        },
      });
    }

    return criteria;
  }

  /**
   * Start resource monitoring
   */
  private async startResourceMonitoring(): Promise<void> {
    // Take initial measurement
    await this.measureResources();

    // Start periodic monitoring
    this.monitoringInterval = setInterval(async () => {
      await this.measureResources();
      this.updateResourcePressure();
      this.adjustBehavior();
    }, this.config.monitoringInterval);
  }

  /**
   * Measure current system resources
   */
  private async measureResources(): Promise<void> {
    try {
      const metrics: ResourceMetrics = {
        memoryUsage: await this.getMemoryUsage(),
        cpuUsage: await this.getCPUUsage(),
        ioLatency: await this.getIOLatency(),
        availableMemory: await this.getAvailableMemory(),
        timestamp: Date.now(),
      };

      this.resourceHistory.push(metrics);

      // Keep only recent history
      if (this.resourceHistory.length > this.config.sampleHistorySize) {
        this.resourceHistory = this.resourceHistory.slice(
          -this.config.sampleHistorySize
        );
      }
    } catch (error) {
      console.warn('Failed to measure resources:', error);
    }
  }

  /**
   * Get memory usage percentage
   */
  private async getMemoryUsage(): Promise<number> {
    // In a real implementation, this would use process.memoryUsage()
    // or system-level memory information
    const usage = process.memoryUsage();
    const totalMemory = 8 * 1024 * 1024 * 1024; // Assume 8GB total (would be dynamic)
    return usage.heapUsed / totalMemory;
  }

  /**
   * Get CPU usage percentage
   */
  private async getCPUUsage(): Promise<number> {
    // Simple CPU usage estimation based on event loop lag
    const start = process.hrtime.bigint();
    await new Promise((resolve) => setTimeout(resolve, 1));
    const end = process.hrtime.bigint();

    const lag = Number(end - start) / 1000000; // Convert to milliseconds
    return Math.min(1, lag / 10); // Rough approximation
  }

  /**
   * Get I/O latency
   */
  private async getIOLatency(): Promise<number> {
    // Simple I/O latency test
    const start = performance.now();
    try {
      await import('fs/promises').then((fs) => fs.access('.'));
    } catch {
      // Ignore errors
    }
    return performance.now() - start;
  }

  /**
   * Get available memory
   */
  private async getAvailableMemory(): Promise<number> {
    const usage = process.memoryUsage();
    return usage.heapTotal - usage.heapUsed;
  }

  /**
   * Update resource pressure level
   */
  private updateResourcePressure(): void {
    if (this.resourceHistory.length === 0) return;

    const latest = this.resourceHistory[this.resourceHistory.length - 1];

    // Calculate composite pressure score
    let pressureScore = 0;

    if (latest.memoryUsage > this.config.memoryThreshold) {
      pressureScore += (latest.memoryUsage - this.config.memoryThreshold) * 2;
    }

    if (latest.cpuUsage > this.config.cpuThreshold) {
      pressureScore += (latest.cpuUsage - this.config.cpuThreshold) * 1.5;
    }

    if (latest.ioLatency > this.config.ioLatencyThreshold) {
      pressureScore +=
        (latest.ioLatency / this.config.ioLatencyThreshold - 1) * 1;
    }

    // Apply aggressiveness factor
    pressureScore *= this.config.aggressiveness;

    // Determine pressure level
    if (pressureScore > 1.5) {
      this.currentPressure = ResourcePressure.CRITICAL;
    } else if (pressureScore > 1.0) {
      this.currentPressure = ResourcePressure.HIGH;
    } else if (pressureScore > 0.5) {
      this.currentPressure = ResourcePressure.MEDIUM;
    } else {
      this.currentPressure = ResourcePressure.LOW;
    }
  }

  /**
   * Adjust cache behavior based on resource pressure
   */
  private adjustBehavior(): void {
    switch (this.currentPressure) {
      case ResourcePressure.CRITICAL:
        this.behaviorAdjustments = {
          preferredLevel: CacheLevel.L3,
          maxEntrySize: 1024, // 1KB
          ttlMultiplier: 0.5,
          compressionThreshold: 512,
          evictionAggressiveness: 1.0,
        };
        break;

      case ResourcePressure.HIGH:
        this.behaviorAdjustments = {
          preferredLevel: CacheLevel.L3,
          maxEntrySize: 10240, // 10KB
          ttlMultiplier: 0.7,
          compressionThreshold: 1024,
          evictionAggressiveness: 0.8,
        };
        break;

      case ResourcePressure.MEDIUM:
        this.behaviorAdjustments = {
          preferredLevel: CacheLevel.L2,
          maxEntrySize: 51200, // 50KB
          ttlMultiplier: 0.9,
          compressionThreshold: 2048,
          evictionAggressiveness: 0.6,
        };
        break;

      case ResourcePressure.LOW:
        this.behaviorAdjustments = this.getDefaultBehavior();
        break;
    }
  }

  /**
   * Get default behavior settings
   */
  private getDefaultBehavior(): BehaviorAdjustments {
    return {
      preferredLevel: CacheLevel.L1,
      maxEntrySize: 1024 * 1024, // 1MB
      ttlMultiplier: 1.0,
      compressionThreshold: 10240, // 10KB
      evictionAggressiveness: 0.3,
    };
  }

  /**
   * Calculate resource usage trends
   */
  private getResourceTrend(): {
    memoryTrend: number;
    cpuTrend: number;
    ioTrend: number;
  } {
    if (this.resourceHistory.length < 10) {
      return { memoryTrend: 0, cpuTrend: 0, ioTrend: 0 };
    }

    const recent = this.resourceHistory.slice(-5);
    const older = this.resourceHistory.slice(-10, -5);

    const avgRecent = {
      memory: recent.reduce((sum, m) => sum + m.memoryUsage, 0) / recent.length,
      cpu: recent.reduce((sum, m) => sum + m.cpuUsage, 0) / recent.length,
      io: recent.reduce((sum, m) => sum + m.ioLatency, 0) / recent.length,
    };

    const avgOlder = {
      memory: older.reduce((sum, m) => sum + m.memoryUsage, 0) / older.length,
      cpu: older.reduce((sum, m) => sum + m.cpuUsage, 0) / older.length,
      io: older.reduce((sum, m) => sum + m.ioLatency, 0) / older.length,
    };

    return {
      memoryTrend: avgRecent.memory - avgOlder.memory,
      cpuTrend: avgRecent.cpu - avgOlder.cpu,
      ioTrend: (avgRecent.io - avgOlder.io) / this.config.ioLatencyThreshold,
    };
  }

  /**
   * Estimate data size for caching decisions
   */
  private estimateDataSize(data: unknown): number {
    try {
      return Buffer.byteLength(JSON.stringify(data), 'utf8');
    } catch {
      return 1024; // Default estimate
    }
  }

  /**
   * Shutdown strategy
   */
  async shutdown(): Promise<void> {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    this.resourceHistory = [];
    this.isInitialized = false;
  }

  /**
   * Get current resource status
   */
  getCurrentResourceStatus(): {
    pressure: ResourcePressure;
    metrics: ResourceMetrics | null;
    adjustments: BehaviorAdjustments;
    trend: ReturnType<typeof this.getResourceTrend>;
    config: ResourceAwareConfig;
  } {
    return {
      pressure: this.currentPressure,
      metrics: this.resourceHistory[this.resourceHistory.length - 1] || null,
      adjustments: this.behaviorAdjustments,
      trend: this.getResourceTrend(),
      config: this.config,
    };
  }
}
