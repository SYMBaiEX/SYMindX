/**
 * Shared Memory Pool System
 * Implements shared memory pools for common data structures to reduce memory usage
 */

import { EventEmitter } from 'node:events';
import { runtimeLogger } from './logger';
import { performanceMonitor } from './PerformanceMonitor';

interface PooledObject<T = unknown> {
  id: string;
  data: T;
  refCount: number;
  createdAt: number;
  lastAccessed: number;
  size: number; // estimated size in bytes
}

interface MemoryPoolOptions {
  maxSize: number; // Maximum number of objects in pool
  maxMemory: number; // Maximum memory usage in bytes
  ttl: number; // Time to live for unused objects
  cleanupInterval: number; // Cleanup interval in ms
}

export class SharedMemoryPool<T = unknown> extends EventEmitter {
  private pool = new Map<string, PooledObject<T>>();
  private keyGenerator: (data: T) => string;
  private sizeEstimator: (data: T) => number;
  private options: MemoryPoolOptions;
  private currentMemoryUsage = 0;
  private cleanupTimer?: NodeJS.Timer;

  constructor(
    keyGenerator: (data: T) => string,
    sizeEstimator: (data: T) => number,
    options: Partial<MemoryPoolOptions> = {}
  ) {
    super();

    this.keyGenerator = keyGenerator;
    this.sizeEstimator = sizeEstimator;
    this.options = {
      maxSize: options.maxSize ?? 1000,
      maxMemory: options.maxMemory ?? 10 * 1024 * 1024, // 10MB
      ttl: options.ttl ?? 5 * 60 * 1000, // 5 minutes
      cleanupInterval: options.cleanupInterval ?? 60 * 1000, // 1 minute
    };

    // Start cleanup timer
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.options.cleanupInterval);
  }

  /**
   * Get or create an object in the pool
   */
  getOrCreate(data: T): T {
    const key = this.keyGenerator(data);
    const existing = this.pool.get(key);

    if (existing) {
      // Update access info
      existing.refCount++;
      existing.lastAccessed = Date.now();
      
      performanceMonitor.recordMetric('memory_pool.hit', 1, 'count', { key });
      this.emit('hit', { key, refCount: existing.refCount });
      
      return existing.data;
    }

    // Create new object
    const size = this.sizeEstimator(data);
    
    // Check if we need to make space
    if (this.shouldEvict(size)) {
      this.evictLRU(size);
    }

    const pooledObject: PooledObject<T> = {
      id: key,
      data,
      refCount: 1,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      size,
    };

    this.pool.set(key, pooledObject);
    this.currentMemoryUsage += size;

    performanceMonitor.recordMetric('memory_pool.miss', 1, 'count', { key });
    performanceMonitor.recordMetric('memory_pool.created', 1, 'count', { 
      key, 
      size 
    });

    this.emit('created', { key, size, data });
    
    return data;
  }

  /**
   * Release a reference to an object
   */
  release(data: T): boolean {
    const key = this.keyGenerator(data);
    const pooled = this.pool.get(key);

    if (!pooled) {
      return false;
    }

    pooled.refCount = Math.max(0, pooled.refCount - 1);
    pooled.lastAccessed = Date.now();

    performanceMonitor.recordMetric('memory_pool.released', 1, 'count', { 
      key, 
      refCount: pooled.refCount 
    });

    this.emit('released', { key, refCount: pooled.refCount });

    return true;
  }

  /**
   * Get object if it exists in pool
   */
  get(data: T): T | null {
    const key = this.keyGenerator(data);
    const pooled = this.pool.get(key);

    if (pooled) {
      pooled.lastAccessed = Date.now();
      return pooled.data;
    }

    return null;
  }

  /**
   * Check if object exists in pool
   */
  has(data: T): boolean {
    const key = this.keyGenerator(data);
    return this.pool.has(key);
  }

  /**
   * Remove object from pool
   */
  remove(data: T): boolean {
    const key = this.keyGenerator(data);
    const pooled = this.pool.get(key);

    if (!pooled) {
      return false;
    }

    this.pool.delete(key);
    this.currentMemoryUsage -= pooled.size;

    performanceMonitor.recordMetric('memory_pool.removed', 1, 'count', { 
      key, 
      size: pooled.size 
    });

    this.emit('removed', { key, size: pooled.size });

    return true;
  }

  /**
   * Get pool statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    memoryUsage: number;
    maxMemory: number;
    hitRate: number;
    objects: Array<{
      key: string;
      refCount: number;
      size: number;
      age: number;
      lastAccessed: number;
    }>;
  } {
    const now = Date.now();
    const objects = Array.from(this.pool.entries()).map(([key, pooled]) => ({
      key,
      refCount: pooled.refCount,
      size: pooled.size,
      age: now - pooled.createdAt,
      lastAccessed: pooled.lastAccessed,
    }));

    // Calculate hit rate from performance metrics
    const hits = performanceMonitor.getStats('memory_pool.hit')?.sum ?? 0;
    const misses = performanceMonitor.getStats('memory_pool.miss')?.sum ?? 0;
    const hitRate = hits + misses > 0 ? hits / (hits + misses) : 0;

    return {
      size: this.pool.size,
      maxSize: this.options.maxSize,
      memoryUsage: this.currentMemoryUsage,
      maxMemory: this.options.maxMemory,
      hitRate,
      objects,
    };
  }

  /**
   * Force cleanup of unused objects
   */
  cleanup(): number {
    const now = Date.now();
    let removedCount = 0;

    // Find objects to remove (unused and expired)
    const toRemove: string[] = [];

    for (const [key, pooled] of this.pool.entries()) {
      const age = now - pooled.lastAccessed;
      
      if (pooled.refCount === 0 && age > this.options.ttl) {
        toRemove.push(key);
      }
    }

    // Remove expired objects
    for (const key of toRemove) {
      const pooled = this.pool.get(key);
      if (pooled) {
        this.pool.delete(key);
        this.currentMemoryUsage -= pooled.size;
        removedCount++;
      }
    }

    if (removedCount > 0) {
      performanceMonitor.recordMetric('memory_pool.cleanup', removedCount, 'count');
      this.emit('cleanup', { removedCount });
      
      runtimeLogger.debug(`Memory pool cleanup: removed ${removedCount} objects`);
    }

    return removedCount;
  }

  /**
   * Clear all objects from pool
   */
  clear(): void {
    const size = this.pool.size;
    this.pool.clear();
    this.currentMemoryUsage = 0;

    performanceMonitor.recordMetric('memory_pool.cleared', size, 'count');
    this.emit('cleared', { size });
  }

  /**
   * Destroy the pool and cleanup resources
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }

    this.clear();
    this.removeAllListeners();
  }

  // Private helper methods

  private shouldEvict(newObjectSize: number): boolean {
    const wouldExceedSize = this.pool.size >= this.options.maxSize;
    const wouldExceedMemory = this.currentMemoryUsage + newObjectSize > this.options.maxMemory;
    
    return wouldExceedSize || wouldExceedMemory;
  }

  private evictLRU(requiredSpace: number): void {
    // Sort by reference count (0 first) then by last accessed (oldest first)
    const candidates = Array.from(this.pool.entries())
      .map(([key, pooled]) => ({ key, pooled }))
      .sort((a, b) => {
        if (a.pooled.refCount !== b.pooled.refCount) {
          return a.pooled.refCount - b.pooled.refCount;
        }
        return a.pooled.lastAccessed - b.pooled.lastAccessed;
      });

    let freedSpace = 0;
    let evictedCount = 0;

    for (const candidate of candidates) {
      // Don't evict objects with references unless absolutely necessary
      if (candidate.pooled.refCount > 0 && freedSpace >= requiredSpace) {
        break;
      }

      this.pool.delete(candidate.key);
      this.currentMemoryUsage -= candidate.pooled.size;
      freedSpace += candidate.pooled.size;
      evictedCount++;

      this.emit('evicted', { 
        key: candidate.key, 
        size: candidate.pooled.size,
        refCount: candidate.pooled.refCount 
      });

      // Stop if we've freed enough space and objects
      if (freedSpace >= requiredSpace && this.pool.size < this.options.maxSize) {
        break;
      }
    }

    if (evictedCount > 0) {
      performanceMonitor.recordMetric('memory_pool.evicted', evictedCount, 'count');
      runtimeLogger.debug(`Memory pool eviction: removed ${evictedCount} objects, freed ${freedSpace} bytes`);
    }
  }
}

/**
 * Specialized memory pools for common data types
 */

// String pool for frequently used strings
export const stringPool = new SharedMemoryPool<string>(
  (str) => `str_${str}`,
  (str) => str.length * 2, // Rough estimate for UTF-16
  {
    maxSize: 5000,
    maxMemory: 2 * 1024 * 1024, // 2MB
    ttl: 10 * 60 * 1000, // 10 minutes
  }
);

// Object pool for configuration objects
export const configPool = new SharedMemoryPool<Record<string, unknown>>(
  (obj) => `cfg_${JSON.stringify(obj)}`,
  (obj) => JSON.stringify(obj).length * 2,
  {
    maxSize: 1000,
    maxMemory: 5 * 1024 * 1024, // 5MB
    ttl: 15 * 60 * 1000, // 15 minutes
  }
);

// Array pool for frequently used arrays
export const arrayPool = new SharedMemoryPool<unknown[]>(
  (arr) => `arr_${JSON.stringify(arr)}`,
  (arr) => JSON.stringify(arr).length * 2,
  {
    maxSize: 2000,
    maxMemory: 3 * 1024 * 1024, // 3MB
    ttl: 5 * 60 * 1000, // 5 minutes
  }
);

// Buffer pool for binary data
export const bufferPool = new SharedMemoryPool<Buffer>(
  (buf) => `buf_${buf.toString('hex').slice(0, 32)}`, // Use first 32 chars of hex
  (buf) => buf.length,
  {
    maxSize: 500,
    maxMemory: 10 * 1024 * 1024, // 10MB
    ttl: 2 * 60 * 1000, // 2 minutes
  }
);