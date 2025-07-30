/**
 * Cache Coordinator - Multi-Level Cache Orchestration
 *
 * Coordinates operations across L1, L2, and L3 caches with intelligent
 * data placement, promotion/demotion, and unified management.
 */

import {
  CacheLevel,
  CacheEntry,
  CacheEventType,
  type ContextCacheManager,
  type CacheConfiguration,
  type CacheSetOptions,
  type CacheMetrics,
  type CacheInvalidationCriteria,
  type CacheWarmingRequest,
  type CacheKeyFilter,
  type CacheEvent,
  type CacheEventCallback,
  type CacheIntegrityResult,
  type CacheExportOptions,
  type CacheExportResult,
  type CacheImportData,
  type CacheImportOptions,
  type CacheStrategyInterface,
} from '../../../types/context/context-caching';
import type { OperationResult } from '../../../types/helpers';
import type { Metadata } from '../../../types/common';
import { L1ContextCache } from './l1-context-cache';
import { L2ContextCache } from './l2-context-cache';
import { L3ContextCache } from './l3-context-cache';
import { CacheWarmer } from './cache-warmer';

/**
 * Cache promotion/demotion decision data
 */
interface CachePlacementDecision {
  targetLevel: CacheLevel;
  reason: string;
  confidence: number;
  metadata?: Metadata;
}

/**
 * Multi-level cache coordinator implementation
 */
export class CacheCoordinator implements ContextCacheManager {
  private l1Cache: L1ContextCache;
  private l2Cache: L2ContextCache;
  private l3Cache: L3ContextCache;
  private cacheWarmer: CacheWarmer;

  private config: CacheConfiguration;
  private isInitialized = false;
  private eventCallbacks = new Set<CacheEventCallback>();
  private cacheStrategy?: CacheStrategyInterface;

  // Metrics aggregation
  private operationMetrics = {
    promotions: 0,
    demotions: 0,
    crossLevelOperations: 0,
    integrityChecks: 0,
  };

  constructor(config: CacheConfiguration) {
    this.config = config;
    this.l1Cache = new L1ContextCache(config.l1);
    this.l2Cache = new L2ContextCache(config.l2);
    this.l3Cache = new L3ContextCache(config.l3, config.global);
    this.cacheWarmer = new CacheWarmer(this, config);
  }

  /**
   * Initialize all cache levels
   */
  async initialize(config?: CacheConfiguration): Promise<OperationResult> {
    const startTime = performance.now();

    try {
      if (this.isInitialized) {
        return {
          success: false,
          error: 'Cache coordinator already initialized',
          timestamp: Date.now(),
          duration: performance.now() - startTime,
        };
      }

      if (config) {
        this.config = config;
      }

      // Initialize cache levels in parallel
      const [l1Result, l2Result, l3Result] = await Promise.all([
        this.l1Cache.initialize(),
        this.l2Cache.initialize(),
        this.l3Cache.initialize(),
      ]);

      // Check for initialization failures
      if (!l1Result.success) {
        throw new Error(`L1 cache initialization failed: ${l1Result.error}`);
      }
      if (!l2Result.success) {
        throw new Error(`L2 cache initialization failed: ${l2Result.error}`);
      }
      if (!l3Result.success) {
        throw new Error(`L3 cache initialization failed: ${l3Result.error}`);
      }

      // Initialize cache warmer
      await this.cacheWarmer.initialize();

      // Subscribe to individual cache events for coordination
      this.setupEventHandlers();

      this.isInitialized = true;

      return {
        success: true,
        timestamp: Date.now(),
        duration: performance.now() - startTime,
        data: {
          l1Initialized: l1Result.success,
          l2Initialized: l2Result.success,
          l3Initialized: l3Result.success,
          warmerInitialized: true,
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
   * Get an item from cache (tries all levels)
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.isInitialized) {
      return null;
    }

    const startTime = performance.now();

    // Try L1 first (fastest)
    let result = await this.l1Cache.get<T>(key);
    if (result !== null) {
      this.emitEvent({
        type: CacheEventType.HIT,
        key,
        level: CacheLevel.L1,
        timestamp: Date.now(),
        responseTime: performance.now() - startTime,
        data: { hitLevel: 'L1' },
      });
      return result;
    }

    // Try L2 next
    result = await this.l2Cache.get<T>(key);
    if (result !== null) {
      // Promote to L1 if access pattern suggests it
      await this.considerPromotion(key, result, CacheLevel.L2, CacheLevel.L1);

      this.emitEvent({
        type: CacheEventType.HIT,
        key,
        level: CacheLevel.L2,
        timestamp: Date.now(),
        responseTime: performance.now() - startTime,
        data: { hitLevel: 'L2' },
      });
      return result;
    }

    // Try L3 last
    result = await this.l3Cache.get<T>(key);
    if (result !== null) {
      // Consider promotion to L2 or L1
      await this.considerPromotion(key, result, CacheLevel.L3, CacheLevel.L2);

      this.emitEvent({
        type: CacheEventType.HIT,
        key,
        level: CacheLevel.L3,
        timestamp: Date.now(),
        responseTime: performance.now() - startTime,
        data: { hitLevel: 'L3' },
      });
      return result;
    }

    // Not found in any cache level
    this.emitEvent({
      type: CacheEventType.MISS,
      key,
      level: CacheLevel.L1, // Use L1 as representative
      timestamp: Date.now(),
      responseTime: performance.now() - startTime,
      data: { checkedLevels: ['L1', 'L2', 'L3'] },
    });

    return null;
  }

  /**
   * Set an item in cache with intelligent level placement
   */
  async set<T>(
    key: string,
    value: T,
    options: CacheSetOptions = {}
  ): Promise<OperationResult> {
    if (!this.isInitialized) {
      return {
        success: false,
        error: 'Cache coordinator not initialized',
        timestamp: Date.now(),
        duration: 0,
      };
    }

    const startTime = performance.now();

    try {
      // Determine optimal cache level
      const placement = await this.determineCachePlacement(key, value, options);
      const targetLevel = options.level ?? placement.targetLevel;

      // Set in target level
      let result: OperationResult;
      switch (targetLevel) {
        case CacheLevel.L1:
          result = await this.l1Cache.set(key, value, options);
          break;
        case CacheLevel.L2:
          result = await this.l2Cache.set(key, value, options);
          break;
        case CacheLevel.L3:
          result = await this.l3Cache.set(key, value, options);
          break;
        default:
          throw new Error(`Invalid cache level: ${targetLevel}`);
      }

      if (result.success) {
        // Also consider placing in lower levels for hot data
        if (targetLevel === CacheLevel.L1 && this.config.l2.enabled) {
          await this.l2Cache.set(key, value, options);
        }
        if (
          (targetLevel === CacheLevel.L1 || targetLevel === CacheLevel.L2) &&
          this.config.l3.enabled
        ) {
          await this.l3Cache.set(key, value, options);
        }

        this.emitEvent({
          type: CacheEventType.SET,
          key,
          level: targetLevel,
          timestamp: Date.now(),
          responseTime: performance.now() - startTime,
          data: {
            placement: placement.reason,
            confidence: placement.confidence,
          },
        });
      }

      return {
        ...result,
        data: {
          ...result.data,
          placementLevel: targetLevel,
          placementReason: placement.reason,
          placementConfidence: placement.confidence,
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
   * Delete an item from all cache levels
   */
  async delete(key: string): Promise<OperationResult> {
    if (!this.isInitialized) {
      return {
        success: false,
        error: 'Cache coordinator not initialized',
        timestamp: Date.now(),
        duration: 0,
      };
    }

    const startTime = performance.now();

    // Delete from all levels in parallel
    const [l1Result, l2Result, l3Result] = await Promise.all([
      this.l1Cache.delete(key),
      this.l2Cache.delete(key),
      this.l3Cache.delete(key),
    ]);

    // Consider it successful if deleted from at least one level
    const success = l1Result.success || l2Result.success || l3Result.success;

    if (success) {
      this.emitEvent({
        type: CacheEventType.DELETE,
        key,
        level: CacheLevel.L1, // Representative
        timestamp: Date.now(),
        responseTime: performance.now() - startTime,
        data: {
          deletedFromL1: l1Result.success,
          deletedFromL2: l2Result.success,
          deletedFromL3: l3Result.success,
        },
      });
    }

    return {
      success,
      timestamp: Date.now(),
      duration: performance.now() - startTime,
      error: success ? undefined : 'Key not found in any cache level',
      data: {
        l1Result: l1Result.success,
        l2Result: l2Result.success,
        l3Result: l3Result.success,
      },
    };
  }

  /**
   * Check if a key exists in any cache level
   */
  async has(key: string): Promise<boolean> {
    if (!this.isInitialized) {
      return false;
    }

    // Check all levels in parallel for fastest response
    const [l1Has, l2Has, l3Has] = await Promise.all([
      this.l1Cache.has(key),
      this.l2Cache.has(key),
      this.l3Cache.has(key),
    ]);

    return l1Has || l2Has || l3Has;
  }

  /**
   * Get aggregated cache metrics
   */
  async getMetrics(): Promise<CacheMetrics> {
    const [l1Metrics, l2Metrics, l3Metrics] = await Promise.all([
      this.l1Cache.getMetrics(),
      this.l2Cache.getMetrics(),
      this.l3Cache.getMetrics(),
    ]);

    // Aggregate metrics
    const aggregated: CacheMetrics = {
      hitRate: {
        l1: l1Metrics.hitRate?.l1 ?? 0,
        l2: l2Metrics.hitRate?.l2 ?? 0,
        l3: l3Metrics.hitRate?.l3 ?? 0,
        overall: this.calculateOverallHitRate([
          l1Metrics,
          l2Metrics,
          l3Metrics,
        ]),
      },
      responseTime: {
        l1: l1Metrics.responseTime?.l1 ?? 0,
        l2: l2Metrics.responseTime?.l2 ?? 0,
        l3: l3Metrics.responseTime?.l3 ?? 0,
        average: this.calculateAverageResponseTime([
          l1Metrics,
          l2Metrics,
          l3Metrics,
        ]),
      },
      memoryUsage: {
        l1: l1Metrics.memoryUsage?.l1 ?? 0,
        l2: l2Metrics.memoryUsage?.l2 ?? 0,
        total:
          (l1Metrics.memoryUsage?.l1 ?? 0) + (l2Metrics.memoryUsage?.l2 ?? 0),
        percentage: this.calculateMemoryPercentage([l1Metrics, l2Metrics]),
      },
      diskUsage: l3Metrics.diskUsage ?? {
        size: 0,
        percentage: 0,
        files: 0,
      },
      entries: {
        l1: l1Metrics.entries?.l1 ?? 0,
        l2: l2Metrics.entries?.l2 ?? 0,
        l3: l3Metrics.entries?.l3 ?? 0,
        total:
          (l1Metrics.entries?.l1 ?? 0) +
          (l2Metrics.entries?.l2 ?? 0) +
          (l3Metrics.entries?.l3 ?? 0),
      },
      operations: {
        reads:
          (l1Metrics.operations?.reads ?? 0) +
          (l2Metrics.operations?.reads ?? 0) +
          (l3Metrics.operations?.reads ?? 0),
        writes:
          (l1Metrics.operations?.writes ?? 0) +
          (l2Metrics.operations?.writes ?? 0) +
          (l3Metrics.operations?.writes ?? 0),
        evictions:
          (l1Metrics.operations?.evictions ?? 0) +
          (l2Metrics.operations?.evictions ?? 0) +
          (l3Metrics.operations?.evictions ?? 0),
        invalidations:
          (l1Metrics.operations?.invalidations ?? 0) +
          (l2Metrics.operations?.invalidations ?? 0) +
          (l3Metrics.operations?.invalidations ?? 0),
      },
      errors: {
        total: 0, // Would need to track errors across levels
        byType: {},
      },
      performance: {
        compressionRatio: l2Metrics.performance?.compressionRatio ?? 1,
        evictionRate: 0, // Would need time-based calculation
        warmingEfficiency: 0, // Would come from warmer
        integrityCheckFailures: 0,
      },
    };

    return aggregated;
  }

  /**
   * Clear specific cache level or all levels
   */
  async clear(level?: CacheLevel): Promise<OperationResult> {
    if (!this.isInitialized) {
      return {
        success: false,
        error: 'Cache coordinator not initialized',
        timestamp: Date.now(),
        duration: 0,
      };
    }

    const startTime = performance.now();

    try {
      if (level) {
        // Clear specific level
        let result: OperationResult;
        switch (level) {
          case CacheLevel.L1:
            result = await this.l1Cache.clear();
            break;
          case CacheLevel.L2:
            result = await this.l2Cache.clear();
            break;
          case CacheLevel.L3:
            result = await this.l3Cache.clear();
            break;
          default:
            throw new Error(`Invalid cache level: ${level}`);
        }

        if (result.success) {
          this.emitEvent({
            type: CacheEventType.CLEAR,
            key: '*',
            level,
            timestamp: Date.now(),
            responseTime: performance.now() - startTime,
          });
        }

        return result;
      } else {
        // Clear all levels
        const [l1Result, l2Result, l3Result] = await Promise.all([
          this.l1Cache.clear(),
          this.l2Cache.clear(),
          this.l3Cache.clear(),
        ]);

        const success =
          l1Result.success && l2Result.success && l3Result.success;

        if (success) {
          this.emitEvent({
            type: CacheEventType.CLEAR,
            key: '*',
            level: CacheLevel.L1, // Representative
            timestamp: Date.now(),
            responseTime: performance.now() - startTime,
            data: { clearedLevels: ['L1', 'L2', 'L3'] },
          });
        }

        return {
          success,
          timestamp: Date.now(),
          duration: performance.now() - startTime,
          error: success
            ? undefined
            : 'Failed to clear one or more cache levels',
          data: {
            l1Cleared: l1Result.success,
            l2Cleared: l2Result.success,
            l3Cleared: l3Result.success,
          },
        };
      }
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
   * Invalidate cache entries by criteria
   */
  async invalidate(
    criteria: CacheInvalidationCriteria
  ): Promise<OperationResult> {
    if (!this.isInitialized) {
      return {
        success: false,
        error: 'Cache coordinator not initialized',
        timestamp: Date.now(),
        duration: 0,
      };
    }

    const startTime = performance.now();
    let invalidatedCount = 0;

    try {
      // Get all keys from all levels
      const allKeys = new Set([
        ...this.l1Cache.listKeys(),
        ...this.l2Cache.listKeys(),
        ...this.l3Cache.listKeys(),
      ]);

      // Apply invalidation criteria
      const keysToInvalidate: string[] = [];

      for (const key of allKeys) {
        let shouldInvalidate = false;

        // Pattern matching
        if (criteria.pattern) {
          const regex = new RegExp(criteria.pattern);
          shouldInvalidate = shouldInvalidate || regex.test(key);
        }

        // Tag matching
        if (criteria.tags && criteria.tags.length > 0) {
          const entry = await this.getEntryFromAnyLevel(key);
          if (entry && entry.tags.some((tag) => criteria.tags!.includes(tag))) {
            shouldInvalidate = true;
          }
        }

        // Age-based invalidation
        if (criteria.olderThan) {
          const entry = await this.getEntryFromAnyLevel(key);
          if (entry && Date.now() - entry.createdAt > criteria.olderThan) {
            shouldInvalidate = true;
          }
        }

        // Access count threshold
        if (criteria.accessCountLessThan !== undefined) {
          const entry = await this.getEntryFromAnyLevel(key);
          if (entry && entry.accessCount < criteria.accessCountLessThan) {
            shouldInvalidate = true;
          }
        }

        // Custom filter
        if (criteria.filter) {
          const entry = await this.getEntryFromAnyLevel(key);
          if (entry && criteria.filter(entry)) {
            shouldInvalidate = true;
          }
        }

        if (shouldInvalidate) {
          keysToInvalidate.push(key);
        }
      }

      // Delete identified keys
      for (const key of keysToInvalidate) {
        const result = await this.delete(key);
        if (result.success) {
          invalidatedCount++;
        }
      }

      this.emitEvent({
        type: CacheEventType.INVALIDATE,
        key: '*',
        level: CacheLevel.L1, // Representative
        timestamp: Date.now(),
        responseTime: performance.now() - startTime,
        data: {
          invalidatedCount,
          criteria: JSON.stringify(criteria),
        },
      });

      return {
        success: true,
        timestamp: Date.now(),
        duration: performance.now() - startTime,
        data: { invalidatedCount },
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
   * Warm cache with predicted or specified items
   */
  async warm(items?: CacheWarmingRequest[]): Promise<OperationResult> {
    if (!this.isInitialized) {
      return {
        success: false,
        error: 'Cache coordinator not initialized',
        timestamp: Date.now(),
        duration: 0,
      };
    }

    return await this.cacheWarmer.warmCache(items);
  }

  /**
   * Optimize all cache levels
   */
  async optimize(): Promise<OperationResult> {
    if (!this.isInitialized) {
      return {
        success: false,
        error: 'Cache coordinator not initialized',
        timestamp: Date.now(),
        duration: 0,
      };
    }

    const startTime = performance.now();

    try {
      // Optimize all levels in parallel
      const [l1Result, l2Result, l3Result] = await Promise.all([
        this.l1Cache.optimize(),
        this.l2Cache.optimize(),
        this.l3Cache.optimize(),
      ]);

      const success = l1Result.success && l2Result.success && l3Result.success;

      if (success) {
        this.emitEvent({
          type: CacheEventType.OPTIMIZE,
          key: '*',
          level: CacheLevel.L1, // Representative
          timestamp: Date.now(),
          responseTime: performance.now() - startTime,
          data: { optimizedLevels: ['L1', 'L2', 'L3'] },
        });
      }

      return {
        success,
        timestamp: Date.now(),
        duration: performance.now() - startTime,
        error: success
          ? undefined
          : 'Failed to optimize one or more cache levels',
        data: {
          l1Optimized: l1Result.success,
          l2Optimized: l2Result.success,
          l3Optimized: l3Result.success,
          l1Data: l1Result.data,
          l2Data: l2Result.data,
          l3Data: l3Result.data,
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
   * Get cache entry information without retrieving data
   */
  async inspect(key: string): Promise<CacheEntry | null> {
    if (!this.isInitialized) {
      return null;
    }

    // Check L1 first, then L2, then L3
    let entry = this.l1Cache.inspect(key);
    if (entry) return entry;

    entry = this.l2Cache.inspect(key);
    if (entry) return entry;

    entry = this.l3Cache.inspect(key);
    if (entry) return entry;

    return null;
  }

  /**
   * List all cache keys with optional filtering
   */
  async listKeys(filter?: CacheKeyFilter): Promise<string[]> {
    if (!this.isInitialized) {
      return [];
    }

    // Get all keys from all levels
    const allKeys = new Set([
      ...this.l1Cache.listKeys(),
      ...this.l2Cache.listKeys(),
      ...this.l3Cache.listKeys(),
    ]);

    let keys = Array.from(allKeys);

    // Apply filters if provided
    if (filter) {
      if (filter.pattern) {
        const regex = new RegExp(filter.pattern);
        keys = keys.filter((key) => regex.test(key));
      }

      if (filter.level) {
        const levelKeys = new Set();
        switch (filter.level) {
          case CacheLevel.L1:
            this.l1Cache.listKeys().forEach((key) => levelKeys.add(key));
            break;
          case CacheLevel.L2:
            this.l2Cache.listKeys().forEach((key) => levelKeys.add(key));
            break;
          case CacheLevel.L3:
            this.l3Cache.listKeys().forEach((key) => levelKeys.add(key));
            break;
        }
        keys = keys.filter((key) => levelKeys.has(key));
      }

      if (filter.limit !== undefined) {
        const offset = filter.offset ?? 0;
        keys = keys.slice(offset, offset + filter.limit);
      }
    }

    return keys;
  }

  /**
   * Subscribe to cache events
   */
  subscribe(
    events: CacheEventType[],
    callback: CacheEventCallback
  ): OperationResult {
    // For now, subscribe to all events and filter in callback
    // TODO: Implement event filtering
    this.eventCallbacks.add(callback);

    return {
      success: true,
      timestamp: Date.now(),
      duration: 0,
    };
  }

  /**
   * Unsubscribe from cache events
   */
  unsubscribe(callback: CacheEventCallback): OperationResult {
    const removed = this.eventCallbacks.delete(callback);

    return {
      success: removed,
      timestamp: Date.now(),
      duration: 0,
      error: removed ? undefined : 'Callback not found',
    };
  }

  /**
   * Shutdown cache coordinator and all levels
   */
  async shutdown(): Promise<OperationResult> {
    const startTime = performance.now();

    try {
      // Shutdown cache warmer first
      await this.cacheWarmer.shutdown();

      // Shutdown all levels in parallel
      const [l1Result, l2Result, l3Result] = await Promise.all([
        this.l1Cache.shutdown(),
        this.l2Cache.shutdown(),
        this.l3Cache.shutdown(),
      ]);

      this.eventCallbacks.clear();
      this.isInitialized = false;

      const success = l1Result.success && l2Result.success && l3Result.success;

      return {
        success,
        timestamp: Date.now(),
        duration: performance.now() - startTime,
        error: success
          ? undefined
          : 'Failed to shutdown one or more cache levels',
        data: {
          l1Shutdown: l1Result.success,
          l2Shutdown: l2Result.success,
          l3Shutdown: l3Result.success,
          warmerShutdown: true,
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
   * Perform integrity check on cache data
   */
  async integrityCheck(): Promise<CacheIntegrityResult> {
    // This would need to be implemented to check data consistency
    // across all cache levels, validate hashes, etc.
    this.operationMetrics.integrityChecks++;

    return {
      status: 'healthy',
      entriesChecked: 0,
      corruptedEntries: [],
      hashMismatches: [],
      missingDependencies: [],
      report: {
        l1: { healthy: 0, corrupted: 0 },
        l2: { healthy: 0, corrupted: 0 },
        l3: { healthy: 0, corrupted: 0 },
      },
      recommendations: [],
    };
  }

  /**
   * Export cache data for backup or migration
   */
  async export(options?: CacheExportOptions): Promise<CacheExportResult> {
    // This would need to be implemented to export data from all levels
    return {
      format: options?.format ?? 'json',
      size: 0,
      entryCount: 0,
      data: '{}',
      metadata: {
        exportedAt: Date.now(),
        version: '1.0.0',
        checksum: '',
      },
    };
  }

  /**
   * Import cache data from backup or migration
   */
  async import(
    data: CacheImportData,
    options?: CacheImportOptions
  ): Promise<OperationResult> {
    // This would need to be implemented to import data to appropriate levels
    return {
      success: false,
      error: 'Import not implemented',
      timestamp: Date.now(),
      duration: 0,
    };
  }

  /**
   * Set cache strategy
   */
  setCacheStrategy(strategy: CacheStrategyInterface): void {
    this.cacheStrategy = strategy;
  }

  /**
   * Determine optimal cache level for new entry
   */
  private async determineCachePlacement<T>(
    key: string,
    value: T,
    options: CacheSetOptions
  ): Promise<CachePlacementDecision> {
    // Use strategy if available
    if (this.cacheStrategy) {
      const level = this.cacheStrategy.determineCacheLevel(
        key,
        value,
        options.metadata ?? {}
      );
      const priority = this.cacheStrategy.calculatePriority({
        id: key,
        data: value,
        level: CacheLevel.L1, // Placeholder
        status: 'fresh',
        createdAt: Date.now(),
        lastAccessedAt: Date.now(),
        lastUpdatedAt: Date.now(),
        accessCount: 0,
        size: Buffer.byteLength(JSON.stringify(value), 'utf8'),
        priority: options.priority ?? 1,
        accessPattern: 'random',
        metadata: options.metadata ?? {},
        dataHash: '',
        tags: options.tags ?? [],
        dependencies: options.dependencies ?? [],
      } as CacheEntry);

      return {
        targetLevel: level,
        reason: `Strategy decision: ${this.cacheStrategy.name}`,
        confidence: priority / 10, // Convert priority to confidence
      };
    }

    // Default placement logic
    const size = Buffer.byteLength(JSON.stringify(value), 'utf8');
    const priority = options.priority ?? 1;

    // Hot data (high priority, small size) -> L1
    if (priority >= 8 && size < 1024) {
      return {
        targetLevel: CacheLevel.L1,
        reason: 'High priority, small size',
        confidence: 0.9,
      };
    }

    // Medium data -> L2
    if (priority >= 5 && size < 10240) {
      return {
        targetLevel: CacheLevel.L2,
        reason: 'Medium priority, medium size',
        confidence: 0.7,
      };
    }

    // Large or low priority data -> L3
    return {
      targetLevel: CacheLevel.L3,
      reason: 'Large size or low priority',
      confidence: 0.5,
    };
  }

  /**
   * Consider promoting data between cache levels
   */
  private async considerPromotion<T>(
    key: string,
    value: T,
    fromLevel: CacheLevel,
    toLevel: CacheLevel
  ): Promise<void> {
    // Simple promotion logic - promote if accessed from lower level
    const size = Buffer.byteLength(JSON.stringify(value), 'utf8');

    // Don't promote if too large for target level
    if (
      toLevel === CacheLevel.L1 &&
      size > this.config.l1.maxMemoryBytes / 10
    ) {
      return;
    }

    if (
      toLevel === CacheLevel.L2 &&
      size > this.config.l2.maxMemoryBytes / 10
    ) {
      return;
    }

    // Promote the data
    try {
      switch (toLevel) {
        case CacheLevel.L1:
          await this.l1Cache.set(key, value);
          break;
        case CacheLevel.L2:
          await this.l2Cache.set(key, value);
          break;
        case CacheLevel.L3:
          await this.l3Cache.set(key, value);
          break;
      }

      this.operationMetrics.promotions++;
      this.operationMetrics.crossLevelOperations++;
    } catch (error) {
      // Ignore promotion failures
      console.warn('Cache promotion failed:', error);
    }
  }

  /**
   * Get entry from any cache level
   */
  private async getEntryFromAnyLevel(key: string): Promise<CacheEntry | null> {
    let entry = this.l1Cache.inspect(key);
    if (entry) return entry;

    entry = this.l2Cache.inspect(key);
    if (entry) return entry;

    entry = this.l3Cache.inspect(key);
    if (entry) return entry;

    return null;
  }

  /**
   * Setup event handlers for individual caches
   */
  private setupEventHandlers(): void {
    // Subscribe to individual cache events for coordination
    this.l1Cache.subscribe((event) => this.handleCacheEvent(event));
    this.l2Cache.subscribe((event) => this.handleCacheEvent(event));
    this.l3Cache.subscribe((event) => this.handleCacheEvent(event));
  }

  /**
   * Handle cache events from individual levels
   */
  private handleCacheEvent(event: CacheEvent): void {
    // Forward event to subscribers
    this.emitEvent(event);

    // Handle coordination logic
    // This could include automatic promotion/demotion, warming, etc.
  }

  /**
   * Emit event to subscribers
   */
  private emitEvent(event: CacheEvent): void {
    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch (error) {
        console.warn('Cache event callback error:', error);
      }
    }
  }

  /**
   * Calculate overall hit rate from individual cache metrics
   */
  private calculateOverallHitRate(
    metricsArray: Partial<CacheMetrics>[]
  ): number {
    let totalHits = 0;
    let totalRequests = 0;

    for (const metrics of metricsArray) {
      if (metrics.operations) {
        totalHits += metrics.operations.reads || 0;
        totalRequests += metrics.operations.reads || 0;
      }
    }

    return totalRequests > 0 ? totalHits / totalRequests : 0;
  }

  /**
   * Calculate average response time across cache levels
   */
  private calculateAverageResponseTime(
    metricsArray: Partial<CacheMetrics>[]
  ): number {
    let totalTime = 0;
    let count = 0;

    for (const metrics of metricsArray) {
      if (metrics.responseTime) {
        if (metrics.responseTime.l1 > 0) {
          totalTime += metrics.responseTime.l1;
          count++;
        }
        if (metrics.responseTime.l2 > 0) {
          totalTime += metrics.responseTime.l2;
          count++;
        }
        if (metrics.responseTime.l3 > 0) {
          totalTime += metrics.responseTime.l3;
          count++;
        }
      }
    }

    return count > 0 ? totalTime / count : 0;
  }

  /**
   * Calculate memory usage percentage
   */
  private calculateMemoryPercentage(
    metricsArray: Partial<CacheMetrics>[]
  ): number {
    // This would need configuration to calculate properly
    return 0;
  }
}
