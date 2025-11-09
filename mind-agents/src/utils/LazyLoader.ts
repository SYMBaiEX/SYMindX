/**
 * Lazy Loading System for Memory Optimization
 * Implements lazy loading of modules, extensions, and resources to reduce memory usage
 */

import { EventEmitter } from 'node:events';
import { runtimeLogger } from './logger';
import { performanceMonitor } from './PerformanceMonitor';
import { memoryManager } from './MemoryManager';

interface LazyLoadable<T = unknown> {
  id: string;
  type: string;
  loader: () => Promise<T>;
  priority: number;
  dependencies?: string[];
  memoryEstimate?: number; // bytes
  ttl?: number; // time to live in ms
}

interface LoadedResource<T = unknown> {
  id: string;
  resource: T;
  loadedAt: number;
  lastAccessed: number;
  accessCount: number;
  memoryUsage: number;
  priority: number;
}

interface LazyLoaderOptions {
  maxMemoryUsage: number; // Maximum memory usage in bytes
  maxConcurrentLoads: number;
  defaultTTL: number;
  unloadThreshold: number; // Memory threshold to trigger unloading
  accessThreshold: number; // Minimum access count to keep loaded
}

export class LazyLoader<T = unknown> extends EventEmitter {
  private loadables = new Map<string, LazyLoadable<T>>();
  private loaded = new Map<string, LoadedResource<T>>();
  private loading = new Set<string>();
  private loadQueue: string[] = [];
  private currentMemoryUsage = 0;
  private options: LazyLoaderOptions;

  constructor(options: Partial<LazyLoaderOptions> = {}) {
    super();

    this.options = {
      maxMemoryUsage: options.maxMemoryUsage ?? 50 * 1024 * 1024, // 50MB default
      maxConcurrentLoads: options.maxConcurrentLoads ?? 3,
      defaultTTL: options.defaultTTL ?? 5 * 60 * 1000, // 5 minutes
      unloadThreshold: options.unloadThreshold ?? 0.8, // 80% of max memory
      accessThreshold: options.accessThreshold ?? 2,
    };

    // Start periodic cleanup
    setInterval(() => this.cleanup(), 60000); // Every minute
  }

  /**
   * Register a resource for lazy loading
   */
  register(loadable: LazyLoadable<T>): void {
    this.loadables.set(loadable.id, {
      ...loadable,
      memoryEstimate: loadable.memoryEstimate ?? 1024 * 1024, // 1MB default
      ttl: loadable.ttl ?? this.options.defaultTTL,
    });

    performanceMonitor.recordMetric('lazy_loader.registered', 1, 'count', {
      type: loadable.type,
      id: loadable.id,
    });

    this.emit('registered', loadable);
  }

  /**
   * Unregister a resource
   */
  unregister(id: string): boolean {
    const loadable = this.loadables.get(id);
    if (!loadable) return false;

    // Unload if currently loaded
    this.unload(id);

    this.loadables.delete(id);
    
    performanceMonitor.recordMetric('lazy_loader.unregistered', 1, 'count', {
      type: loadable.type,
      id,
    });

    this.emit('unregistered', loadable);
    return true;
  }

  /**
   * Load a resource (lazy loading)
   */
  async load(id: string): Promise<T | null> {
    // Check if already loaded
    const loaded = this.loaded.get(id);
    if (loaded) {
      loaded.lastAccessed = Date.now();
      loaded.accessCount++;
      return loaded.resource;
    }

    // Check if currently loading
    if (this.loading.has(id)) {
      return this.waitForLoad(id);
    }

    const loadable = this.loadables.get(id);
    if (!loadable) {
      runtimeLogger.warn(`Lazy loadable not found: ${id}`);
      return null;
    }

    // Check memory constraints
    if (this.shouldDelayLoad(loadable)) {
      await this.freeMemory(loadable.memoryEstimate!);
    }

    return this.performLoad(id, loadable);
  }

  /**
   * Preload high-priority resources
   */
  async preload(maxItems = 5): Promise<void> {
    const candidates = Array.from(this.loadables.values())
      .filter(l => !this.loaded.has(l.id) && !this.loading.has(l.id))
      .sort((a, b) => b.priority - a.priority)
      .slice(0, maxItems);

    const preloadPromises = candidates.map(async (loadable) => {
      try {
        await this.load(loadable.id);
        runtimeLogger.debug(`Preloaded: ${loadable.id}`);
      } catch (error) {
        runtimeLogger.error(`Failed to preload ${loadable.id}:`, error);
      }
    });

    await Promise.all(preloadPromises);
  }

  /**
   * Unload a resource
   */
  unload(id: string): boolean {
    const loaded = this.loaded.get(id);
    if (!loaded) return false;

    try {
      // Cleanup if resource has cleanup method
      if (loaded.resource && typeof (loaded.resource as any).cleanup === 'function') {
        (loaded.resource as any).cleanup();
      }

      this.loaded.delete(id);
      this.currentMemoryUsage -= loaded.memoryUsage;

      performanceMonitor.recordMetric('lazy_loader.unloaded', 1, 'count', {
        id,
        memoryFreed: loaded.memoryUsage,
      });

      this.emit('unloaded', { id, memoryFreed: loaded.memoryUsage });
      return true;
    } catch (error) {
      runtimeLogger.error(`Failed to unload ${id}:`, error);
      return false;
    }
  }

  /**
   * Get resource if loaded (without triggering load)
   */
  get(id: string): T | null {
    const loaded = this.loaded.get(id);
    if (loaded) {
      loaded.lastAccessed = Date.now();
      loaded.accessCount++;
      return loaded.resource;
    }
    return null;
  }

  /**
   * Check if resource is loaded
   */
  isLoaded(id: string): boolean {
    return this.loaded.has(id);
  }

  /**
   * Check if resource is loading
   */
  isLoading(id: string): boolean {
    return this.loading.has(id);
  }

  /**
   * Get memory usage statistics
   */
  getStats(): {
    totalRegistered: number;
    totalLoaded: number;
    currentMemoryUsage: number;
    maxMemoryUsage: number;
    memoryUtilization: number;
    loadedResources: Array<{
      id: string;
      type: string;
      memoryUsage: number;
      accessCount: number;
      lastAccessed: number;
    }>;
  } {
    const loadedResources = Array.from(this.loaded.entries()).map(([id, loaded]) => {
      const loadable = this.loadables.get(id);
      return {
        id,
        type: loadable?.type ?? 'unknown',
        memoryUsage: loaded.memoryUsage,
        accessCount: loaded.accessCount,
        lastAccessed: loaded.lastAccessed,
      };
    });

    return {
      totalRegistered: this.loadables.size,
      totalLoaded: this.loaded.size,
      currentMemoryUsage: this.currentMemoryUsage,
      maxMemoryUsage: this.options.maxMemoryUsage,
      memoryUtilization: this.currentMemoryUsage / this.options.maxMemoryUsage,
      loadedResources,
    };
  }

  /**
   * Force cleanup of unused resources
   */
  async cleanup(): Promise<number> {
    const now = Date.now();
    let unloadedCount = 0;

    // Find candidates for unloading
    const candidates = Array.from(this.loaded.entries())
      .map(([id, loaded]) => {
        const loadable = this.loadables.get(id);
        const age = now - loaded.lastAccessed;
        const ttl = loadable?.ttl ?? this.options.defaultTTL;
        
        return {
          id,
          loaded,
          loadable,
          age,
          ttl,
          shouldUnload: age > ttl && loaded.accessCount < this.options.accessThreshold,
        };
      })
      .filter(c => c.shouldUnload)
      .sort((a, b) => b.age - a.age); // Oldest first

    // Unload candidates
    for (const candidate of candidates) {
      if (this.unload(candidate.id)) {
        unloadedCount++;
      }
    }

    if (unloadedCount > 0) {
      performanceMonitor.recordMetric('lazy_loader.cleanup', unloadedCount, 'count');
      runtimeLogger.debug(`Lazy loader cleanup: unloaded ${unloadedCount} resources`);
    }

    return unloadedCount;
  }

  /**
   * Clear all loaded resources
   */
  async clear(): Promise<void> {
    const loadedIds = Array.from(this.loaded.keys());
    
    for (const id of loadedIds) {
      this.unload(id);
    }

    this.loading.clear();
    this.loadQueue = [];
    this.currentMemoryUsage = 0;

    performanceMonitor.recordMetric('lazy_loader.cleared', loadedIds.length, 'count');
    this.emit('cleared', loadedIds.length);
  }

  // Private helper methods

  private async performLoad(id: string, loadable: LazyLoadable<T>): Promise<T> {
    this.loading.add(id);

    try {
      const startTime = Date.now();
      const startMemory = process.memoryUsage().heapUsed;

      // Load dependencies first
      if (loadable.dependencies) {
        await Promise.all(loadable.dependencies.map(dep => this.load(dep)));
      }

      // Load the resource
      const resource = await loadable.loader();
      
      const endTime = Date.now();
      const endMemory = process.memoryUsage().heapUsed;
      const actualMemoryUsage = Math.max(endMemory - startMemory, loadable.memoryEstimate!);

      // Store loaded resource
      const loadedResource: LoadedResource<T> = {
        id,
        resource,
        loadedAt: Date.now(),
        lastAccessed: Date.now(),
        accessCount: 1,
        memoryUsage: actualMemoryUsage,
        priority: loadable.priority,
      };

      this.loaded.set(id, loadedResource);
      this.currentMemoryUsage += actualMemoryUsage;

      // Register with memory manager for tracking
      memoryManager.registerResource(
        `lazy_${loadable.type}`,
        resource,
        () => this.unload(id),
        { ttl: loadable.ttl, id }
      );

      performanceMonitor.recordMetric('lazy_loader.loaded', 1, 'count', {
        type: loadable.type,
        id,
        loadTime: endTime - startTime,
        memoryUsage: actualMemoryUsage,
      });

      this.emit('loaded', { id, resource, loadTime: endTime - startTime });
      return resource;

    } catch (error) {
      runtimeLogger.error(`Failed to load ${id}:`, error);
      performanceMonitor.recordMetric('lazy_loader.load_error', 1, 'count', {
        type: loadable.type,
        id,
      });
      throw error;
    } finally {
      this.loading.delete(id);
    }
  }

  private async waitForLoad(id: string): Promise<T | null> {
    return new Promise((resolve) => {
      const checkLoaded = () => {
        const loaded = this.loaded.get(id);
        if (loaded) {
          resolve(loaded.resource);
        } else if (!this.loading.has(id)) {
          resolve(null);
        } else {
          setTimeout(checkLoaded, 10);
        }
      };
      checkLoaded();
    });
  }

  private shouldDelayLoad(loadable: LazyLoadable<T>): boolean {
    const projectedUsage = this.currentMemoryUsage + loadable.memoryEstimate!;
    const threshold = this.options.maxMemoryUsage * this.options.unloadThreshold;
    
    return projectedUsage > threshold;
  }

  private async freeMemory(requiredBytes: number): Promise<void> {
    // Find least recently used resources to unload
    const candidates = Array.from(this.loaded.entries())
      .map(([id, loaded]) => ({ id, loaded }))
      .sort((a, b) => {
        // Sort by priority (lower first) then by last accessed (older first)
        if (a.loaded.priority !== b.loaded.priority) {
          return a.loaded.priority - b.loaded.priority;
        }
        return a.loaded.lastAccessed - b.loaded.lastAccessed;
      });

    let freedBytes = 0;
    for (const candidate of candidates) {
      if (freedBytes >= requiredBytes) break;
      
      if (this.unload(candidate.id)) {
        freedBytes += candidate.loaded.memoryUsage;
      }
    }

    if (freedBytes < requiredBytes) {
      runtimeLogger.warn(`Could only free ${freedBytes} bytes, needed ${requiredBytes}`);
    }
  }
}

// Global lazy loader instance
export const globalLazyLoader = new LazyLoader({
  maxMemoryUsage: 10 * 1024 * 1024, // 10MB for optimized memory usage
  maxConcurrentLoads: 2,
  defaultTTL: 2 * 60 * 1000, // 2 minutes
  unloadThreshold: 0.7, // 70% threshold
  accessThreshold: 1,
});