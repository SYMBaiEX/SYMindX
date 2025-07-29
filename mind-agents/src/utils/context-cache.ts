/**
 * Context Caching Utilities for SYMindX
 * 
 * Provides efficient multi-level caching for context operations
 * with minimal overhead and clean integration.
 */

import { contextTracer } from './context-observability';
import { runtimeLogger } from './logger';

/**
 * Cache entry with metadata
 */
export interface CacheEntry<T> {
  value: T;
  timestamp: Date;
  hits: number;
  size: number;
  ttl?: number;
  metadata?: Record<string, any>;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
  entries: number;
  hitRate: number;
}

/**
 * Simple LRU cache implementation
 */
export class LRUCache<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private accessOrder: string[] = [];
  private maxSize: number;
  private maxEntries: number;
  private defaultTTL: number;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    size: 0,
    entries: 0,
    hitRate: 0,
  };

  constructor(options: {
    maxSize?: number;
    maxEntries?: number;
    defaultTTL?: number;
  } = {}) {
    this.maxSize = options.maxSize || 10 * 1024 * 1024; // 10MB default
    this.maxEntries = options.maxEntries || 1000;
    this.defaultTTL = options.defaultTTL || 300000; // 5 minutes default
  }

  /**
   * Get value from cache
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      contextTracer.recordMetric('cacheMisses', 1);
      return undefined;
    }

    // Check TTL
    if (entry.ttl && Date.now() - entry.timestamp.getTime() > entry.ttl) {
      this.delete(key);
      this.stats.misses++;
      this.updateHitRate();
      return undefined;
    }

    // Update access order
    this.updateAccessOrder(key);
    entry.hits++;
    this.stats.hits++;
    this.updateHitRate();
    contextTracer.recordMetric('cacheHits', 1);

    return entry.value;
  }

  /**
   * Set value in cache
   */
  set(key: string, value: T, ttl?: number): void {
    const size = this.estimateSize(value);
    
    // Check if we need to evict entries
    while (this.cache.size >= this.maxEntries || this.stats.size + size > this.maxSize) {
      this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      value,
      timestamp: new Date(),
      hits: 0,
      size,
      ttl: ttl || this.defaultTTL,
    };

    this.cache.set(key, entry);
    this.updateAccessOrder(key);
    this.stats.size += size;
    this.stats.entries = this.cache.size;
  }

  /**
   * Delete entry from cache
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    this.cache.delete(key);
    this.accessOrder = this.accessOrder.filter(k => k !== key);
    this.stats.size -= entry.size;
    this.stats.entries = this.cache.size;
    
    return true;
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      size: 0,
      entries: 0,
      hitRate: 0,
    };
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Estimate size of value
   */
  private estimateSize(value: any): number {
    try {
      return JSON.stringify(value).length;
    } catch {
      return 1000; // Default size for non-serializable objects
    }
  }

  /**
   * Update access order for LRU
   */
  private updateAccessOrder(key: string): void {
    this.accessOrder = this.accessOrder.filter(k => k !== key);
    this.accessOrder.push(key);
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    if (this.accessOrder.length === 0) return;

    const lruKey = this.accessOrder.shift()!;
    const entry = this.cache.get(lruKey);
    
    if (entry) {
      this.cache.delete(lruKey);
      this.stats.size -= entry.size;
      this.stats.evictions++;
      this.stats.entries = this.cache.size;
    }
  }

  /**
   * Update hit rate
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }
}

/**
 * Multi-level context cache
 */
export class ContextCache {
  private l1Cache: LRUCache<any>; // Hot cache - in memory
  private l2Cache: LRUCache<string>; // Warm cache - compressed
  private cleanupInterval?: NodeJS.Timeout;

  constructor() {
    // L1: Small, fast cache for frequently accessed contexts
    this.l1Cache = new LRUCache({
      maxSize: 5 * 1024 * 1024, // 5MB
      maxEntries: 100,
      defaultTTL: 60000, // 1 minute
    });

    // L2: Larger, compressed cache for less frequent access
    this.l2Cache = new LRUCache({
      maxSize: 50 * 1024 * 1024, // 50MB
      maxEntries: 1000,
      defaultTTL: 300000, // 5 minutes
    });

    // Start cleanup interval
    this.startCleanup();
  }

  /**
   * Get context from cache
   */
  async get(key: string): Promise<any | undefined> {
    // Check L1 first
    const l1Result = this.l1Cache.get(key);
    if (l1Result) {
      return l1Result;
    }

    // Check L2
    const l2Result = this.l2Cache.get(key);
    if (l2Result) {
      try {
        const decompressed = JSON.parse(l2Result);
        // Promote to L1
        this.l1Cache.set(key, decompressed);
        return decompressed;
      } catch (error) {
        runtimeLogger.error('Failed to decompress L2 cache entry', { key, error });
        this.l2Cache.delete(key);
      }
    }

    return undefined;
  }

  /**
   * Set context in cache
   */
  async set(key: string, value: any, options: { ttl?: number; priority?: 'high' | 'normal' } = {}): Promise<void> {
    // Always set in L1 for immediate access
    this.l1Cache.set(key, value, options.ttl);

    // Also set in L2 if not high priority (to save space in L1)
    if (options.priority !== 'high') {
      try {
        const compressed = JSON.stringify(value);
        this.l2Cache.set(key, compressed, options.ttl);
      } catch (error) {
        runtimeLogger.error('Failed to compress context for L2 cache', { key, error });
      }
    }
  }

  /**
   * Delete from all cache levels
   */
  delete(key: string): void {
    this.l1Cache.delete(key);
    this.l2Cache.delete(key);
  }

  /**
   * Clear all caches
   */
  clear(): void {
    this.l1Cache.clear();
    this.l2Cache.clear();
  }

  /**
   * Get combined cache statistics
   */
  getStats(): { l1: CacheStats; l2: CacheStats; combined: CacheStats } {
    const l1Stats = this.l1Cache.getStats();
    const l2Stats = this.l2Cache.getStats();

    const combined: CacheStats = {
      hits: l1Stats.hits + l2Stats.hits,
      misses: l2Stats.misses, // Only L2 misses count as total misses
      evictions: l1Stats.evictions + l2Stats.evictions,
      size: l1Stats.size + l2Stats.size,
      entries: l1Stats.entries + l2Stats.entries,
      hitRate: 0,
    };

    const totalOps = combined.hits + combined.misses;
    combined.hitRate = totalOps > 0 ? combined.hits / totalOps : 0;

    return { l1: l1Stats, l2: l2Stats, combined };
  }

  /**
   * Start periodic cleanup
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      // Clean up expired entries
      const now = Date.now();
      
      // This would be more efficient with a proper expiry index
      // For now, we rely on LRU eviction and TTL checks on access
      
      // Log cache statistics periodically
      if (process.env.NODE_ENV === 'development') {
        const stats = this.getStats();
        runtimeLogger.debug('Context cache statistics', stats);
      }
    }, 60000); // Every minute
  }

  /**
   * Stop cleanup
   */
  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
  }
}

/**
 * Cache key generator for contexts
 */
export class ContextCacheKeyGenerator {
  /**
   * Generate cache key for agent context
   */
  static forAgentContext(agentId: string, sessionId?: string): string {
    return sessionId ? `context:agent:${agentId}:${sessionId}` : `context:agent:${agentId}`;
  }

  /**
   * Generate cache key for enriched context
   */
  static forEnrichedContext(baseKey: string, enrichers: string[]): string {
    const enricherHash = enrichers.sort().join('-');
    return `${baseKey}:enriched:${enricherHash}`;
  }

  /**
   * Generate cache key for transformed context
   */
  static forTransformedContext(baseKey: string, target: string): string {
    return `${baseKey}:transform:${target}`;
  }

  /**
   * Generate cache key for memory context
   */
  static forMemoryContext(agentId: string, memoryType: string): string {
    return `context:memory:${agentId}:${memoryType}`;
  }
}

// Export singleton cache instance
export const contextCache = new ContextCache();

// Cleanup on process exit
process.on('beforeExit', () => {
  contextCache.stop();
});