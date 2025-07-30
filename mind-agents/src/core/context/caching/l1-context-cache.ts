/**
 * L1 Context Cache - In-Memory Hot Cache
 *
 * Ultra-fast in-memory cache optimized for sub-millisecond access times.
 * Uses Map-based storage with size-based and count-based eviction.
 */

import {
  CacheLevel,
  CacheEntry,
  CacheEntryStatus,
  CacheAccessPattern,
  CacheEventType,
  type ContextCacheManager,
  type CacheConfiguration,
  type CacheSetOptions,
  type CacheMetrics,
  type CacheEvent,
  type CacheEventCallback,
} from '../../../types/context/context-caching';
import type { OperationResult, Timestamp } from '../../../types/helpers';
import type { Metadata } from '../../../types/common';
import { createHash } from 'crypto';

/**
 * L1 Context Cache Implementation
 *
 * High-performance in-memory cache with:
 * - Sub-millisecond access times
 * - LRU eviction policy
 * - Size-based memory management
 * - Hot data prefetching
 */
export class L1ContextCache {
  private cache = new Map<string, CacheEntry>();
  private accessOrder = new Map<string, number>(); // For LRU tracking
  private currentMemoryUsage = 0;
  private accessCounter = 0;
  private eventCallbacks = new Set<CacheEventCallback>();

  private config: CacheConfiguration['l1'];
  private isInitialized = false;

  // Performance metrics
  private metrics = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    evictions: 0,
    totalResponseTime: 0,
    operationCount: 0,
  };

  constructor(config: CacheConfiguration['l1']) {
    this.config = config;
  }

  /**
   * Initialize the L1 cache
   */
  async initialize(): Promise<OperationResult> {
    const startTime = performance.now();

    try {
      if (this.isInitialized) {
        return {
          success: false,
          error: 'L1 cache already initialized',
          timestamp: Date.now(),
          duration: performance.now() - startTime,
        };
      }

      // Validate configuration
      if (this.config.maxEntries <= 0) {
        throw new Error('maxEntries must be greater than 0');
      }

      if (this.config.maxMemoryBytes <= 0) {
        throw new Error('maxMemoryBytes must be greater than 0');
      }

      this.isInitialized = true;

      return {
        success: true,
        timestamp: Date.now(),
        duration: performance.now() - startTime,
        data: {
          maxEntries: this.config.maxEntries,
          maxMemoryBytes: this.config.maxMemoryBytes,
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
   * Get an item from L1 cache
   */
  async get<T>(key: string): Promise<T | null> {
    const startTime = performance.now();
    this.metrics.operationCount++;

    if (!this.isInitialized || !this.config.enabled) {
      this.metrics.misses++;
      return null;
    }

    const entry = this.cache.get(key);

    if (!entry) {
      this.metrics.misses++;
      this.updateMetricsResponseTime(performance.now() - startTime);
      this.emitEvent({
        type: CacheEventType.MISS,
        key,
        level: CacheLevel.L1,
        timestamp: Date.now(),
        responseTime: performance.now() - startTime,
      });
      return null;
    }

    // Check if entry is expired
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
      this.currentMemoryUsage -= entry.size;
      this.metrics.misses++;
      this.updateMetricsResponseTime(performance.now() - startTime);
      this.emitEvent({
        type: CacheEventType.EXPIRE,
        key,
        level: CacheLevel.L1,
        timestamp: Date.now(),
        responseTime: performance.now() - startTime,
      });
      return null;
    }

    // Update access tracking
    entry.lastAccessedAt = Date.now();
    entry.accessCount++;
    this.accessOrder.set(key, ++this.accessCounter);

    this.metrics.hits++;
    const responseTime = performance.now() - startTime;
    this.updateMetricsResponseTime(responseTime);

    this.emitEvent({
      type: CacheEventType.HIT,
      key,
      level: CacheLevel.L1,
      timestamp: Date.now(),
      responseTime,
    });

    return entry.data as T;
  }

  /**
   * Set an item in L1 cache
   */
  async set<T>(
    key: string,
    value: T,
    options: CacheSetOptions = {}
  ): Promise<OperationResult> {
    const startTime = performance.now();
    this.metrics.operationCount++;

    if (!this.isInitialized || !this.config.enabled) {
      return {
        success: false,
        error: 'L1 cache not initialized or disabled',
        timestamp: Date.now(),
        duration: performance.now() - startTime,
      };
    }

    try {
      // Calculate data size
      const serialized = JSON.stringify(value);
      const size = Buffer.byteLength(serialized, 'utf8');

      // Check if this single entry would exceed memory limit
      if (size > this.config.maxMemoryBytes) {
        return {
          success: false,
          error: 'Entry size exceeds cache memory limit',
          timestamp: Date.now(),
          duration: performance.now() - startTime,
        };
      }

      // Create cache entry
      const now = Date.now();
      const entry: CacheEntry<T> = {
        id: key,
        data: value,
        level: CacheLevel.L1,
        status: CacheEntryStatus.FRESH,
        createdAt: now,
        lastAccessedAt: now,
        lastUpdatedAt: now,
        expiresAt: options.ttl ? now + options.ttl : undefined,
        accessCount: 0,
        size,
        priority: options.priority ?? 1,
        accessPattern: CacheAccessPattern.RANDOM, // Will be updated based on usage
        metadata: options.metadata ?? {},
        dataHash: createHash('sha256').update(serialized).digest('hex'),
        tags: options.tags ?? [],
        dependencies: options.dependencies ?? [],
      };

      // Check if we need to evict entries to make space
      await this.ensureSpace(size);

      // Remove existing entry if present
      const existingEntry = this.cache.get(key);
      if (existingEntry) {
        this.currentMemoryUsage -= existingEntry.size;
      }

      // Add new entry
      this.cache.set(key, entry);
      this.accessOrder.set(key, ++this.accessCounter);
      this.currentMemoryUsage += size;
      this.metrics.sets++;

      const responseTime = performance.now() - startTime;
      this.updateMetricsResponseTime(responseTime);

      this.emitEvent({
        type: CacheEventType.SET,
        key,
        level: CacheLevel.L1,
        timestamp: Date.now(),
        responseTime,
        data: { size, priority: entry.priority },
      });

      return {
        success: true,
        timestamp: Date.now(),
        duration: responseTime,
        data: {
          size,
          memoryUsage: this.currentMemoryUsage,
          entryCount: this.cache.size,
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
   * Delete an item from L1 cache
   */
  async delete(key: string): Promise<OperationResult> {
    const startTime = performance.now();
    this.metrics.operationCount++;

    if (!this.isInitialized) {
      return {
        success: false,
        error: 'L1 cache not initialized',
        timestamp: Date.now(),
        duration: performance.now() - startTime,
      };
    }

    const entry = this.cache.get(key);
    if (!entry) {
      return {
        success: false,
        error: 'Key not found',
        timestamp: Date.now(),
        duration: performance.now() - startTime,
      };
    }

    this.cache.delete(key);
    this.accessOrder.delete(key);
    this.currentMemoryUsage -= entry.size;
    this.metrics.deletes++;

    const responseTime = performance.now() - startTime;
    this.updateMetricsResponseTime(responseTime);

    this.emitEvent({
      type: CacheEventType.DELETE,
      key,
      level: CacheLevel.L1,
      timestamp: Date.now(),
      responseTime,
    });

    return {
      success: true,
      timestamp: Date.now(),
      duration: responseTime,
      data: {
        memoryUsage: this.currentMemoryUsage,
        entryCount: this.cache.size,
      },
    };
  }

  /**
   * Check if a key exists
   */
  async has(key: string): Promise<boolean> {
    if (!this.isInitialized || !this.config.enabled) {
      return false;
    }

    const entry = this.cache.get(key);

    // Check expiration
    if (entry && entry.expiresAt && entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
      this.currentMemoryUsage -= entry.size;
      return false;
    }

    return !!entry;
  }

  /**
   * Clear all entries from L1 cache
   */
  async clear(): Promise<OperationResult> {
    const startTime = performance.now();

    if (!this.isInitialized) {
      return {
        success: false,
        error: 'L1 cache not initialized',
        timestamp: Date.now(),
        duration: performance.now() - startTime,
      };
    }

    const entryCount = this.cache.size;
    this.cache.clear();
    this.accessOrder.clear();
    this.currentMemoryUsage = 0;
    this.accessCounter = 0;

    this.emitEvent({
      type: CacheEventType.CLEAR,
      key: '*',
      level: CacheLevel.L1,
      timestamp: Date.now(),
      responseTime: performance.now() - startTime,
      data: { clearedEntries: entryCount },
    });

    return {
      success: true,
      timestamp: Date.now(),
      duration: performance.now() - startTime,
      data: { clearedEntries: entryCount },
    };
  }

  /**
   * Get cache metrics
   */
  getMetrics(): Partial<CacheMetrics> {
    const totalOps = this.metrics.hits + this.metrics.misses;
    const hitRate = totalOps > 0 ? this.metrics.hits / totalOps : 0;
    const avgResponseTime =
      this.metrics.operationCount > 0
        ? this.metrics.totalResponseTime / this.metrics.operationCount
        : 0;

    return {
      hitRate: {
        l1: hitRate,
        l2: 0,
        l3: 0,
        overall: hitRate,
      },
      responseTime: {
        l1: avgResponseTime,
        l2: 0,
        l3: 0,
        average: avgResponseTime,
      },
      memoryUsage: {
        l1: this.currentMemoryUsage,
        l2: 0,
        total: this.currentMemoryUsage,
        percentage:
          (this.currentMemoryUsage / this.config.maxMemoryBytes) * 100,
      },
      entries: {
        l1: this.cache.size,
        l2: 0,
        l3: 0,
        total: this.cache.size,
      },
      operations: {
        reads: this.metrics.hits + this.metrics.misses,
        writes: this.metrics.sets,
        evictions: this.metrics.evictions,
        invalidations: this.metrics.deletes,
      },
    };
  }

  /**
   * Get all cache keys
   */
  listKeys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Inspect cache entry without accessing data
   */
  inspect(key: string): CacheEntry | null {
    return this.cache.get(key) ?? null;
  }

  /**
   * Subscribe to cache events
   */
  subscribe(callback: CacheEventCallback): void {
    this.eventCallbacks.add(callback);
  }

  /**
   * Unsubscribe from cache events
   */
  unsubscribe(callback: CacheEventCallback): void {
    this.eventCallbacks.delete(callback);
  }

  /**
   * Shutdown L1 cache
   */
  async shutdown(): Promise<OperationResult> {
    const startTime = performance.now();

    this.cache.clear();
    this.accessOrder.clear();
    this.eventCallbacks.clear();
    this.currentMemoryUsage = 0;
    this.accessCounter = 0;
    this.isInitialized = false;

    return {
      success: true,
      timestamp: Date.now(),
      duration: performance.now() - startTime,
    };
  }

  /**
   * Ensure we have enough space for a new entry
   */
  private async ensureSpace(requiredSize: number): Promise<void> {
    // Check if we need to evict based on memory usage
    while (
      this.currentMemoryUsage + requiredSize >
      this.config.maxMemoryBytes
    ) {
      if (!this.evictLRUEntry()) {
        break; // No more entries to evict
      }
    }

    // Check if we need to evict based on entry count
    while (this.cache.size >= this.config.maxEntries) {
      if (!this.evictLRUEntry()) {
        break; // No more entries to evict
      }
    }
  }

  /**
   * Evict the least recently used entry
   */
  private evictLRUEntry(): boolean {
    let oldestKey: string | null = null;
    let oldestAccess = Infinity;

    for (const [key, accessOrder] of this.accessOrder) {
      if (accessOrder < oldestAccess) {
        oldestAccess = accessOrder;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      const entry = this.cache.get(oldestKey);
      if (entry) {
        this.cache.delete(oldestKey);
        this.accessOrder.delete(oldestKey);
        this.currentMemoryUsage -= entry.size;
        this.metrics.evictions++;

        this.emitEvent({
          type: CacheEventType.EVICT,
          key: oldestKey,
          level: CacheLevel.L1,
          timestamp: Date.now(),
          data: { reason: 'LRU', freedMemory: entry.size },
        });

        return true;
      }
    }

    return false;
  }

  /**
   * Update metrics response time
   */
  private updateMetricsResponseTime(responseTime: number): void {
    this.metrics.totalResponseTime += responseTime;
  }

  /**
   * Emit cache event to subscribers
   */
  private emitEvent(event: CacheEvent): void {
    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch (error) {
        // Silently ignore callback errors to prevent cache disruption
        console.warn('Cache event callback error:', error);
      }
    }
  }

  /**
   * Get cache size information
   */
  getSizeInfo(): {
    entryCount: number;
    memoryUsage: number;
    memoryPercentage: number;
    averageEntrySize: number;
  } {
    const avgSize =
      this.cache.size > 0 ? this.currentMemoryUsage / this.cache.size : 0;

    return {
      entryCount: this.cache.size,
      memoryUsage: this.currentMemoryUsage,
      memoryPercentage:
        (this.currentMemoryUsage / this.config.maxMemoryBytes) * 100,
      averageEntrySize: avgSize,
    };
  }

  /**
   * Optimize cache by cleaning expired entries
   */
  async optimize(): Promise<OperationResult> {
    const startTime = performance.now();
    let expiredCount = 0;
    const now = Date.now();

    for (const [key, entry] of this.cache) {
      if (entry.expiresAt && entry.expiresAt < now) {
        this.cache.delete(key);
        this.accessOrder.delete(key);
        this.currentMemoryUsage -= entry.size;
        expiredCount++;
      }
    }

    return {
      success: true,
      timestamp: Date.now(),
      duration: performance.now() - startTime,
      data: {
        expiredEntriesRemoved: expiredCount,
        currentEntries: this.cache.size,
        memoryUsage: this.currentMemoryUsage,
      },
    };
  }
}
