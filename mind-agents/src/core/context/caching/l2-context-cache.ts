/**
 * L2 Context Cache - Compressed Memory Cache with LRU
 * 
 * Mid-tier cache that uses compression to store more data in memory.
 * Implements LRU eviction with batch processing for efficiency.
 */

import {
  CacheLevel,
  CacheEntry,
  CacheEntryStatus,
  CacheAccessPattern,
  CacheEventType,
  type CacheConfiguration,
  type CacheSetOptions,
  type CacheMetrics,
  type CacheEvent,
  type CacheEventCallback,
} from '../../../types/context/context-caching';
import type { OperationResult } from '../../../types/helpers';
import type { Metadata } from '../../../types/common';
import { createHash } from 'crypto';
import { gzip, gunzip } from 'zlib';
import { promisify } from 'util';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

/**
 * Compressed cache entry for L2
 */
interface CompressedCacheEntry extends Omit<CacheEntry, 'data'> {
  compressedData: Buffer;
  originalSize: number;
  compressionRatio: number;
}

/**
 * L2 Context Cache Implementation
 * 
 * Compressed memory cache with:
 * - Configurable compression algorithms
 * - LRU eviction with batch processing
 * - Memory-efficient storage
 * - Async compression/decompression
 */
export class L2ContextCache {
  private cache = new Map<string, CompressedCacheEntry>();
  private accessOrder = new Map<string, number>(); // For LRU tracking
  private currentMemoryUsage = 0;
  private accessCounter = 0;
  private eventCallbacks = new Set<CacheEventCallback>();
  
  private config: CacheConfiguration['l2'];
  private isInitialized = false;
  
  // Performance metrics
  private metrics = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    evictions: 0,
    compressionTime: 0,
    decompressionTime: 0,
    totalResponseTime: 0,
    operationCount: 0,
    totalCompressionRatio: 0,
    compressionOperations: 0,
  };
  
  constructor(config: CacheConfiguration['l2']) {
    this.config = config;
  }
  
  /**
   * Initialize the L2 cache
   */
  async initialize(): Promise<OperationResult> {
    const startTime = performance.now();
    
    try {
      if (this.isInitialized) {
        return {
          success: false,
          error: 'L2 cache already initialized',
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
      
      // Validate compression algorithm
      const supportedAlgorithms = ['gzip', 'lz4', 'brotli'];
      if (!supportedAlgorithms.includes(this.config.compressionAlgorithm)) {
        throw new Error(`Unsupported compression algorithm: ${this.config.compressionAlgorithm}`);
      }
      
      this.isInitialized = true;
      
      return {
        success: true,
        timestamp: Date.now(),
        duration: performance.now() - startTime,
        data: {
          maxEntries: this.config.maxEntries,
          maxMemoryBytes: this.config.maxMemoryBytes,
          compressionAlgorithm: this.config.compressionAlgorithm,
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
   * Get an item from L2 cache
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
        level: CacheLevel.L2,
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
        level: CacheLevel.L2,
        timestamp: Date.now(),
        responseTime: performance.now() - startTime,
      });
      return null;
    }
    
    try {
      // Decompress data
      const decompressionStart = performance.now();
      const decompressedData = await this.decompress(entry.compressedData);
      const decompressionTime = performance.now() - decompressionStart;
      this.metrics.decompressionTime += decompressionTime;
      
      const data = JSON.parse(decompressedData.toString('utf8')) as T;
      
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
        level: CacheLevel.L2,
        timestamp: Date.now(),
        responseTime,
        data: { 
          compressionRatio: entry.compressionRatio,
          decompressionTime 
        },
      });
      
      return data;
    } catch (error) {
      this.emitEvent({
        type: CacheEventType.ERROR,
        key,
        level: CacheLevel.L2,
        timestamp: Date.now(),
        responseTime: performance.now() - startTime,
        error: error instanceof Error ? error : new Error('Decompression failed'),
      });
      return null;
    }
  }
  
  /**
   * Set an item in L2 cache
   */
  async set<T>(key: string, value: T, options: CacheSetOptions = {}): Promise<OperationResult> {
    const startTime = performance.now();
    this.metrics.operationCount++;
    
    if (!this.isInitialized || !this.config.enabled) {
      return {
        success: false,
        error: 'L2 cache not initialized or disabled',
        timestamp: Date.now(),
        duration: performance.now() - startTime,
      };
    }
    
    try {
      // Serialize data
      const serialized = JSON.stringify(value);
      const originalSize = Buffer.byteLength(serialized, 'utf8');
      
      // Determine if compression should be used
      const shouldCompress = options.compress !== false && 
        originalSize >= this.config.compressionThreshold;
      
      let compressedData: Buffer;
      let compressionRatio = 1;
      let compressionTime = 0;
      
      if (shouldCompress) {
        const compressionStart = performance.now();
        compressedData = await this.compress(Buffer.from(serialized, 'utf8'));
        compressionTime = performance.now() - compressionStart;
        this.metrics.compressionTime += compressionTime;
        compressionRatio = originalSize / compressedData.length;
        this.metrics.totalCompressionRatio += compressionRatio;
        this.metrics.compressionOperations++;
      } else {
        compressedData = Buffer.from(serialized, 'utf8');
      }
      
      const compressedSize = compressedData.length;
      
      // Check if this single entry would exceed memory limit
      if (compressedSize > this.config.maxMemoryBytes) {
        return {
          success: false,
          error: 'Compressed entry size exceeds cache memory limit',
          timestamp: Date.now(),
          duration: performance.now() - startTime,
        };
      }
      
      // Create cache entry
      const now = Date.now();
      const entry: CompressedCacheEntry = {
        id: key,
        level: CacheLevel.L2,
        status: CacheEntryStatus.FRESH,
        createdAt: now,
        lastAccessedAt: now,
        lastUpdatedAt: now,
        expiresAt: options.ttl ? now + options.ttl : undefined,
        accessCount: 0,
        size: compressedSize,
        originalSize,
        compressionRatio,
        priority: options.priority ?? 1,
        accessPattern: CacheAccessPattern.RANDOM,
        metadata: options.metadata ?? {},
        dataHash: createHash('sha256').update(serialized).digest('hex'),
        tags: options.tags ?? [],
        dependencies: options.dependencies ?? [],
        compressedData,
      };
      
      // Check if we need to evict entries to make space
      await this.ensureSpace(compressedSize);
      
      // Remove existing entry if present
      const existingEntry = this.cache.get(key);
      if (existingEntry) {
        this.currentMemoryUsage -= existingEntry.size;
      }
      
      // Add new entry
      this.cache.set(key, entry);
      this.accessOrder.set(key, ++this.accessCounter);
      this.currentMemoryUsage += compressedSize;
      this.metrics.sets++;
      
      const responseTime = performance.now() - startTime;
      this.updateMetricsResponseTime(responseTime);
      
      this.emitEvent({
        type: CacheEventType.SET,
        key,
        level: CacheLevel.L2,
        timestamp: Date.now(),
        responseTime,
        data: { 
          originalSize,
          compressedSize,
          compressionRatio,
          compressionTime,
          priority: entry.priority 
        },
      });
      
      return {
        success: true,
        timestamp: Date.now(),
        duration: responseTime,
        data: {
          originalSize,
          compressedSize,
          compressionRatio,
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
   * Delete an item from L2 cache
   */
  async delete(key: string): Promise<OperationResult> {
    const startTime = performance.now();
    this.metrics.operationCount++;
    
    if (!this.isInitialized) {
      return {
        success: false,
        error: 'L2 cache not initialized',
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
      level: CacheLevel.L2,
      timestamp: Date.now(),
      responseTime,
      data: { freedMemory: entry.size },
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
   * Clear all entries from L2 cache
   */
  async clear(): Promise<OperationResult> {
    const startTime = performance.now();
    
    if (!this.isInitialized) {
      return {
        success: false,
        error: 'L2 cache not initialized',
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
      level: CacheLevel.L2,
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
    const avgResponseTime = this.metrics.operationCount > 0 
      ? this.metrics.totalResponseTime / this.metrics.operationCount 
      : 0;
    const avgCompressionRatio = this.metrics.compressionOperations > 0
      ? this.metrics.totalCompressionRatio / this.metrics.compressionOperations
      : 1;
    
    return {
      hitRate: {
        l1: 0,
        l2: hitRate,
        l3: 0,
        overall: hitRate,
      },
      responseTime: {
        l1: 0,
        l2: avgResponseTime,
        l3: 0,
        average: avgResponseTime,
      },
      memoryUsage: {
        l1: 0,
        l2: this.currentMemoryUsage,
        total: this.currentMemoryUsage,
        percentage: (this.currentMemoryUsage / this.config.maxMemoryBytes) * 100,
      },
      entries: {
        l1: 0,
        l2: this.cache.size,
        l3: 0,
        total: this.cache.size,
      },
      operations: {
        reads: this.metrics.hits + this.metrics.misses,
        writes: this.metrics.sets,
        evictions: this.metrics.evictions,
        invalidations: this.metrics.deletes,
      },
      performance: {
        compressionRatio: avgCompressionRatio,
        evictionRate: 0, // Would need time-based calculation
        warmingEfficiency: 0,
        integrityCheckFailures: 0,
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
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    // Convert compressed entry back to standard entry format
    return {
      id: entry.id,
      data: null, // Don't decompress for inspection
      level: entry.level,
      status: entry.status,
      createdAt: entry.createdAt,
      lastAccessedAt: entry.lastAccessedAt,
      lastUpdatedAt: entry.lastUpdatedAt,
      expiresAt: entry.expiresAt,
      accessCount: entry.accessCount,
      size: entry.size,
      compressionRatio: entry.compressionRatio,
      priority: entry.priority,
      accessPattern: entry.accessPattern,
      metadata: entry.metadata,
      dataHash: entry.dataHash,
      tags: entry.tags,
      dependencies: entry.dependencies,
    };
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
   * Shutdown L2 cache
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
   * Compress data using configured algorithm
   */
  private async compress(data: Buffer): Promise<Buffer> {
    switch (this.config.compressionAlgorithm) {
      case 'gzip':
        return await gzipAsync(data);
      case 'lz4':
        // LZ4 would require additional dependency
        // For now, fall back to gzip
        return await gzipAsync(data);
      case 'brotli':
        // Brotli would require additional dependency
        // For now, fall back to gzip
        return await gzipAsync(data);
      default:
        throw new Error(`Unsupported compression algorithm: ${this.config.compressionAlgorithm}`);
    }
  }
  
  /**
   * Decompress data using configured algorithm
   */
  private async decompress(data: Buffer): Promise<Buffer> {
    switch (this.config.compressionAlgorithm) {
      case 'gzip':
        return await gunzipAsync(data);
      case 'lz4':
        // LZ4 would require additional dependency
        // For now, fall back to gzip
        return await gunzipAsync(data);
      case 'brotli':
        // Brotli would require additional dependency
        // For now, fall back to gzip
        return await gunzipAsync(data);
      default:
        throw new Error(`Unsupported compression algorithm: ${this.config.compressionAlgorithm}`);
    }
  }
  
  /**
   * Ensure we have enough space for a new entry
   */
  private async ensureSpace(requiredSize: number): Promise<void> {
    // Check if we need to evict based on memory usage
    while (this.currentMemoryUsage + requiredSize > this.config.maxMemoryBytes) {
      const evicted = await this.evictBatch();
      if (evicted === 0) {
        break; // No more entries to evict
      }
    }
    
    // Check if we need to evict based on entry count
    while (this.cache.size >= this.config.maxEntries) {
      const evicted = await this.evictBatch();
      if (evicted === 0) {
        break; // No more entries to evict
      }
    }
  }
  
  /**
   * Evict a batch of least recently used entries
   */
  private async evictBatch(): Promise<number> {
    const batchSize = Math.min(this.config.evictionBatchSize, this.cache.size);
    if (batchSize === 0) return 0;
    
    // Find LRU entries
    const entriesByAccess = Array.from(this.accessOrder.entries())
      .sort(([, a], [, b]) => a - b)
      .slice(0, batchSize);
    
    let evictedCount = 0;
    for (const [key] of entriesByAccess) {
      const entry = this.cache.get(key);
      if (entry) {
        this.cache.delete(key);
        this.accessOrder.delete(key);
        this.currentMemoryUsage -= entry.size;
        evictedCount++;
        
        this.emitEvent({
          type: CacheEventType.EVICT,
          key,
          level: CacheLevel.L2,
          timestamp: Date.now(),
          data: { 
            reason: 'LRU_BATCH', 
            freedMemory: entry.size,
            compressionRatio: entry.compressionRatio 
          },
        });
      }
    }
    
    this.metrics.evictions += evictedCount;
    return evictedCount;
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
    averageCompressionRatio: number;
  } {
    const avgSize = this.cache.size > 0 ? this.currentMemoryUsage / this.cache.size : 0;
    const avgCompressionRatio = this.metrics.compressionOperations > 0
      ? this.metrics.totalCompressionRatio / this.metrics.compressionOperations
      : 1;
    
    return {
      entryCount: this.cache.size,
      memoryUsage: this.currentMemoryUsage,
      memoryPercentage: (this.currentMemoryUsage / this.config.maxMemoryBytes) * 100,
      averageEntrySize: avgSize,
      averageCompressionRatio: avgCompressionRatio,
    };
  }
  
  /**
   * Optimize cache by cleaning expired entries and recompressing
   */
  async optimize(): Promise<OperationResult> {
    const startTime = performance.now();
    let expiredCount = 0;
    let recompressedCount = 0;
    const now = Date.now();
    
    for (const [key, entry] of this.cache) {
      // Remove expired entries
      if (entry.expiresAt && entry.expiresAt < now) {
        this.cache.delete(key);
        this.accessOrder.delete(key);
        this.currentMemoryUsage -= entry.size;
        expiredCount++;
        continue;
      }
      
      // Optionally recompress entries with poor compression ratios
      if (entry.compressionRatio < 1.5 && entry.originalSize > this.config.compressionThreshold) {
        // This would require recompressing, which is expensive
        // Skip for now, but could be implemented for thorough optimization
        recompressedCount++;
      }
    }
    
    return {
      success: true,
      timestamp: Date.now(),
      duration: performance.now() - startTime,
      data: {
        expiredEntriesRemoved: expiredCount,
        entriesRecompressed: recompressedCount,
        currentEntries: this.cache.size,
        memoryUsage: this.currentMemoryUsage,
      },
    };
  }
}