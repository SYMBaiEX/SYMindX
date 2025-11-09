/**
 * Intelligent Response Cache System
 * Advanced caching with TTL, invalidation, and semantic similarity
 */

import { EventEmitter } from 'node:events';
import { LRUCache } from './LRUCache';
import { runtimeLogger } from './logger';
import { performanceMonitor } from './PerformanceMonitor';
import { stringPool } from './SharedMemoryPool';

interface CacheEntry<T = unknown> {
  key: string;
  value: T;
  metadata: {
    createdAt: number;
    lastAccessed: number;
    accessCount: number;
    ttl: number;
    tags: string[];
    size: number;
    hash: string;
    semanticKey?: string;
  };
}

interface CacheOptions {
  maxSize: number;
  defaultTTL: number;
  enableSemanticSimilarity: boolean;
  similarityThreshold: number;
  enableCompression: boolean;
  enableInvalidation: boolean;
}

interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  memoryUsage: number;
  averageAccessTime: number;
  semanticHits: number;
  compressionRatio: number;
}

export class IntelligentResponseCache<T = unknown> extends EventEmitter {
  private cache: LRUCache<string, CacheEntry<T>>;
  private semanticIndex = new Map<string, string[]>(); // semantic key -> cache keys
  private tagIndex = new Map<string, Set<string>>(); // tag -> cache keys
  private options: CacheOptions;
  private stats = {
    hits: 0,
    misses: 0,
    semanticHits: 0,
    totalAccessTime: 0,
    compressionSaved: 0,
    originalSize: 0,
  };

  constructor(options: Partial<CacheOptions> = {}) {
    super();

    this.options = {
      maxSize: options.maxSize ?? 1000,
      defaultTTL: options.defaultTTL ?? 5 * 60 * 1000, // 5 minutes
      enableSemanticSimilarity: options.enableSemanticSimilarity ?? false,
      similarityThreshold: options.similarityThreshold ?? 0.8,
      enableCompression: options.enableCompression ?? true,
      enableInvalidation: options.enableInvalidation ?? true,
    };

    this.cache = new LRUCache<string, CacheEntry<T>>({
      maxSize: this.options.maxSize,
      ttl: this.options.defaultTTL,
      onEvict: (key, entry) => this.onEvict(key, entry),
    });
  }

  /**
   * Get value from cache
   */
  async get(key: string, semanticKey?: string): Promise<T | null> {
    const startTime = performance.now();

    // Try exact key match first
    const normalizedKey = this.normalizeKey(key);
    let entry = this.cache.get(normalizedKey);

    if (entry) {
      // Check if entry is still valid
      if (this.isEntryValid(entry)) {
        this.recordHit(performance.now() - startTime);
        this.emit('hit', { key: normalizedKey, entry });
        return this.deserializeValue(entry.value);
      } else {
        // Entry expired, remove it
        this.cache.delete(normalizedKey);
        this.removeFromIndices(normalizedKey, entry);
      }
    }

    // Try semantic similarity if enabled
    if (this.options.enableSemanticSimilarity && semanticKey) {
      const similarEntry = await this.findSimilarEntry(semanticKey);
      if (similarEntry) {
        this.recordSemanticHit(performance.now() - startTime);
        this.emit('semanticHit', { key: normalizedKey, similarKey: similarEntry.key });
        return this.deserializeValue(similarEntry.value);
      }
    }

    this.recordMiss(performance.now() - startTime);
    this.emit('miss', { key: normalizedKey });
    return null;
  }

  /**
   * Set value in cache
   */
  async set(
    key: string,
    value: T,
    options?: {
      ttl?: number;
      tags?: string[];
      semanticKey?: string;
    }
  ): Promise<void> {
    const normalizedKey = this.normalizeKey(key);
    const ttl = options?.ttl ?? this.options.defaultTTL;
    const tags = options?.tags ?? [];
    const semanticKey = options?.semanticKey;

    // Serialize and potentially compress the value
    const serializedValue = await this.serializeValue(value);
    const hash = this.generateHash(serializedValue);
    const size = this.estimateSize(serializedValue);

    const entry: CacheEntry<T> = {
      key: normalizedKey,
      value: serializedValue,
      metadata: {
        createdAt: Date.now(),
        lastAccessed: Date.now(),
        accessCount: 0,
        ttl,
        tags,
        size,
        hash,
        semanticKey,
      },
    };

    // Store in cache
    this.cache.set(normalizedKey, entry);

    // Update indices
    this.updateIndices(normalizedKey, entry);

    // Record metrics
    performanceMonitor.recordMetric('cache.set', 1, 'count', {
      size: size.toString(),
      ttl: ttl.toString(),
    });

    this.emit('set', { key: normalizedKey, entry });
  }

  /**
   * Check if key exists in cache
   */
  has(key: string): boolean {
    const normalizedKey = this.normalizeKey(key);
    const entry = this.cache.get(normalizedKey);
    return entry ? this.isEntryValid(entry) : false;
  }

  /**
   * Delete key from cache
   */
  delete(key: string): boolean {
    const normalizedKey = this.normalizeKey(key);
    const entry = this.cache.get(normalizedKey);
    
    if (entry) {
      this.removeFromIndices(normalizedKey, entry);
    }

    const deleted = this.cache.delete(normalizedKey);
    
    if (deleted) {
      this.emit('delete', { key: normalizedKey });
    }

    return deleted;
  }

  /**
   * Invalidate cache entries by tag
   */
  invalidateByTag(tag: string): number {
    if (!this.options.enableInvalidation) {
      return 0;
    }

    const keys = this.tagIndex.get(tag);
    if (!keys) {
      return 0;
    }

    let invalidatedCount = 0;
    for (const key of keys) {
      if (this.delete(key)) {
        invalidatedCount++;
      }
    }

    performanceMonitor.recordMetric('cache.invalidated_by_tag', invalidatedCount, 'count', {
      tag,
    });

    this.emit('invalidatedByTag', { tag, count: invalidatedCount });
    return invalidatedCount;
  }

  /**
   * Invalidate cache entries by pattern
   */
  invalidateByPattern(pattern: RegExp): number {
    if (!this.options.enableInvalidation) {
      return 0;
    }

    const keys = this.cache.keys().filter(key => pattern.test(key));
    let invalidatedCount = 0;

    for (const key of keys) {
      if (this.delete(key)) {
        invalidatedCount++;
      }
    }

    performanceMonitor.recordMetric('cache.invalidated_by_pattern', invalidatedCount, 'count');

    this.emit('invalidatedByPattern', { pattern: pattern.toString(), count: invalidatedCount });
    return invalidatedCount;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    const size = this.cache.getStats().size;
    
    this.cache.clear();
    this.semanticIndex.clear();
    this.tagIndex.clear();

    // Reset stats
    this.stats = {
      hits: 0,
      misses: 0,
      semanticHits: 0,
      totalAccessTime: 0,
      compressionSaved: 0,
      originalSize: 0,
    };

    this.emit('cleared', { size });
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const cacheStats = this.cache.getStats();
    const totalRequests = this.stats.hits + this.stats.misses;
    
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: totalRequests > 0 ? this.stats.hits / totalRequests : 0,
      size: cacheStats.size,
      memoryUsage: this.estimateMemoryUsage(),
      averageAccessTime: totalRequests > 0 ? this.stats.totalAccessTime / totalRequests : 0,
      semanticHits: this.stats.semanticHits,
      compressionRatio: this.stats.originalSize > 0 ? 
        (this.stats.originalSize - this.stats.compressionSaved) / this.stats.originalSize : 1,
    };
  }

  /**
   * Prune expired entries
   */
  prune(): number {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (!this.isEntryValid(entry, now)) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.delete(key);
    }

    if (expiredKeys.length > 0) {
      performanceMonitor.recordMetric('cache.pruned', expiredKeys.length, 'count');
    }

    return expiredKeys.length;
  }

  // Private helper methods

  private normalizeKey(key: string): string {
    // Use string pool for memory efficiency
    return stringPool.getOrCreate(key.toLowerCase().trim());
  }

  private generateHash(value: unknown): string {
    // Simple hash function for cache validation
    const str = typeof value === 'string' ? value : JSON.stringify(value);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  private async serializeValue(value: T): Promise<T> {
    if (!this.options.enableCompression) {
      return value;
    }

    // For now, return as-is. In a real implementation, you might compress large objects
    return value;
  }

  private deserializeValue(value: T): T {
    // For now, return as-is. In a real implementation, you might decompress
    return value;
  }

  private estimateSize(value: unknown): number {
    if (typeof value === 'string') {
      return value.length * 2; // UTF-16
    } else if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value).length * 2;
    } else {
      return 8; // Rough estimate for primitives
    }
  }

  private estimateMemoryUsage(): number {
    let totalSize = 0;
    
    for (const entry of this.cache.values()) {
      totalSize += entry.metadata.size;
    }

    return totalSize;
  }

  private isEntryValid(entry: CacheEntry<T>, now = Date.now()): boolean {
    return (now - entry.metadata.createdAt) < entry.metadata.ttl;
  }

  private updateIndices(key: string, entry: CacheEntry<T>): void {
    // Update tag index
    for (const tag of entry.metadata.tags) {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }
      this.tagIndex.get(tag)!.add(key);
    }

    // Update semantic index
    if (entry.metadata.semanticKey) {
      if (!this.semanticIndex.has(entry.metadata.semanticKey)) {
        this.semanticIndex.set(entry.metadata.semanticKey, []);
      }
      this.semanticIndex.get(entry.metadata.semanticKey)!.push(key);
    }
  }

  private removeFromIndices(key: string, entry: CacheEntry<T>): void {
    // Remove from tag index
    for (const tag of entry.metadata.tags) {
      const tagKeys = this.tagIndex.get(tag);
      if (tagKeys) {
        tagKeys.delete(key);
        if (tagKeys.size === 0) {
          this.tagIndex.delete(tag);
        }
      }
    }

    // Remove from semantic index
    if (entry.metadata.semanticKey) {
      const semanticKeys = this.semanticIndex.get(entry.metadata.semanticKey);
      if (semanticKeys) {
        const index = semanticKeys.indexOf(key);
        if (index !== -1) {
          semanticKeys.splice(index, 1);
        }
        if (semanticKeys.length === 0) {
          this.semanticIndex.delete(entry.metadata.semanticKey);
        }
      }
    }
  }

  private async findSimilarEntry(semanticKey: string): Promise<CacheEntry<T> | null> {
    // Simple semantic similarity - in a real implementation, you might use embeddings
    for (const [indexKey, cacheKeys] of this.semanticIndex.entries()) {
      if (this.calculateSimilarity(semanticKey, indexKey) >= this.options.similarityThreshold) {
        for (const cacheKey of cacheKeys) {
          const entry = this.cache.get(cacheKey);
          if (entry && this.isEntryValid(entry)) {
            return entry;
          }
        }
      }
    }

    return null;
  }

  private calculateSimilarity(str1: string, str2: string): number {
    // Simple Jaccard similarity for demonstration
    const set1 = new Set(str1.toLowerCase().split(/\s+/));
    const set2 = new Set(str2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }

  private recordHit(accessTime: number): void {
    this.stats.hits++;
    this.stats.totalAccessTime += accessTime;
    
    performanceMonitor.recordMetric('cache.hit', 1, 'count');
    performanceMonitor.recordMetric('cache.access_time', accessTime, 'ms');
  }

  private recordMiss(accessTime: number): void {
    this.stats.misses++;
    this.stats.totalAccessTime += accessTime;
    
    performanceMonitor.recordMetric('cache.miss', 1, 'count');
    performanceMonitor.recordMetric('cache.access_time', accessTime, 'ms');
  }

  private recordSemanticHit(accessTime: number): void {
    this.stats.semanticHits++;
    this.stats.totalAccessTime += accessTime;
    
    performanceMonitor.recordMetric('cache.semantic_hit', 1, 'count');
    performanceMonitor.recordMetric('cache.access_time', accessTime, 'ms');
  }

  private onEvict(key: string, entry: CacheEntry<T>): void {
    this.removeFromIndices(key, entry);
    this.emit('evict', { key, entry });
  }
}

// Global response cache instances
export const aiResponseCache = new IntelligentResponseCache<string>({
  maxSize: 500,
  defaultTTL: 10 * 60 * 1000, // 10 minutes
  enableSemanticSimilarity: true,
  similarityThreshold: 0.85,
  enableCompression: true,
  enableInvalidation: true,
});

export const configCache = new IntelligentResponseCache<Record<string, unknown>>({
  maxSize: 200,
  defaultTTL: 30 * 60 * 1000, // 30 minutes
  enableSemanticSimilarity: false,
  enableCompression: false,
  enableInvalidation: true,
});

export const memoryCache = new IntelligentResponseCache<unknown>({
  maxSize: 1000,
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  enableSemanticSimilarity: false,
  enableCompression: true,
  enableInvalidation: true,
});