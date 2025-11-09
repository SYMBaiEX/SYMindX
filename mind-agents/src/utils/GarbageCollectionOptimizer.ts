/**
 * Garbage Collection Optimizer
 * Optimizes garbage collection patterns and prevents memory leaks
 */

import { EventEmitter } from 'node:events';
import { runtimeLogger } from './logger';
import { performanceMonitor } from './PerformanceMonitor';

interface GCStats {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  gcDuration?: number;
  gcType?: string;
}

interface GCOptimizerOptions {
  enableAutoGC: boolean;
  gcThreshold: number; // Memory threshold to trigger GC (bytes)
  gcInterval: number; // Minimum interval between forced GCs (ms)
  monitorInterval: number; // Memory monitoring interval (ms)
  maxHeapSize: number; // Maximum heap size before aggressive GC (bytes)
  enableWeakRefCleanup: boolean;
}

export class GarbageCollectionOptimizer extends EventEmitter {
  private options: GCOptimizerOptions;
  private gcStats: GCStats[] = [];
  private lastForcedGC = 0;
  private monitorTimer?: NodeJS.Timer;
  private weakRefs = new Set<WeakRef<object>>();
  private isMonitoring = false;

  // GC performance tracking
  private gcCount = 0;
  private totalGCTime = 0;
  private lastGCTime = 0;

  constructor(options: Partial<GCOptimizerOptions> = {}) {
    super();

    this.options = {
      enableAutoGC: options.enableAutoGC ?? true,
      gcThreshold: options.gcThreshold ?? 50 * 1024 * 1024, // 50MB
      gcInterval: options.gcInterval ?? 30 * 1000, // 30 seconds
      monitorInterval: options.monitorInterval ?? 10 * 1000, // 10 seconds
      maxHeapSize: options.maxHeapSize ?? 100 * 1024 * 1024, // 100MB
      enableWeakRefCleanup: options.enableWeakRefCleanup ?? true,
    };

    // Enable GC monitoring if available
    this.setupGCMonitoring();
  }

  /**
   * Start GC optimization
   */
  start(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;

    // Start memory monitoring
    this.monitorTimer = setInterval(() => {
      this.monitorMemory();
    }, this.options.monitorInterval);

    // Take initial measurement
    this.recordGCStats();

    runtimeLogger.info('GC Optimizer started', {
      autoGC: this.options.enableAutoGC,
      threshold: `${Math.round(this.options.gcThreshold / 1024 / 1024)}MB`,
    });

    this.emit('started');
  }

  /**
   * Stop GC optimization
   */
  stop(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;

    if (this.monitorTimer) {
      clearInterval(this.monitorTimer);
      this.monitorTimer = undefined;
    }

    runtimeLogger.info('GC Optimizer stopped');
    this.emit('stopped');
  }

  /**
   * Force garbage collection
   */
  forceGC(): boolean {
    if (!global.gc) {
      runtimeLogger.warn('Garbage collection not available (run with --expose-gc)');
      return false;
    }

    const now = Date.now();
    
    // Respect minimum interval
    if (now - this.lastForcedGC < this.options.gcInterval) {
      return false;
    }

    const startTime = process.hrtime.bigint();
    const beforeMemory = process.memoryUsage();

    try {
      global.gc();
      
      const endTime = process.hrtime.bigint();
      const afterMemory = process.memoryUsage();
      const gcDuration = Number(endTime - startTime) / 1e6; // Convert to milliseconds

      this.lastForcedGC = now;
      this.gcCount++;
      this.totalGCTime += gcDuration;
      this.lastGCTime = gcDuration;

      const memoryFreed = beforeMemory.heapUsed - afterMemory.heapUsed;

      // Record stats
      this.recordGCStats(gcDuration, 'forced');

      // Record metrics
      performanceMonitor.recordMetric('gc.forced', 1, 'count');
      performanceMonitor.recordMetric('gc.duration', gcDuration, 'ms');
      performanceMonitor.recordMetric('gc.memory_freed', memoryFreed, 'bytes');

      runtimeLogger.debug('Forced GC completed', {
        duration: `${gcDuration.toFixed(2)}ms`,
        memoryFreed: `${Math.round(memoryFreed / 1024 / 1024)}MB`,
      });

      this.emit('gc', {
        type: 'forced',
        duration: gcDuration,
        memoryFreed,
        beforeMemory,
        afterMemory,
      });

      return true;
    } catch (error) {
      runtimeLogger.error('Failed to force GC:', error);
      return false;
    }
  }

  /**
   * Register a weak reference for cleanup tracking
   */
  trackWeakRef<T extends object>(obj: T): WeakRef<T> {
    if (!this.options.enableWeakRefCleanup) {
      return new WeakRef(obj);
    }

    const weakRef = new WeakRef(obj);
    this.weakRefs.add(weakRef as WeakRef<object>);

    performanceMonitor.recordMetric('gc.weak_ref_created', 1, 'count');

    return weakRef;
  }

  /**
   * Clean up dead weak references
   */
  cleanupWeakRefs(): number {
    if (!this.options.enableWeakRefCleanup) {
      return 0;
    }

    const initialSize = this.weakRefs.size;
    const deadRefs: WeakRef<object>[] = [];

    for (const weakRef of this.weakRefs) {
      if (weakRef.deref() === undefined) {
        deadRefs.push(weakRef);
      }
    }

    for (const deadRef of deadRefs) {
      this.weakRefs.delete(deadRef);
    }

    const cleanedCount = deadRefs.length;

    if (cleanedCount > 0) {
      performanceMonitor.recordMetric('gc.weak_refs_cleaned', cleanedCount, 'count');
      
      runtimeLogger.debug(`Cleaned up ${cleanedCount} dead weak references`);
    }

    return cleanedCount;
  }

  /**
   * Get GC statistics
   */
  getStats(): {
    gcCount: number;
    totalGCTime: number;
    averageGCTime: number;
    lastGCTime: number;
    currentMemory: NodeJS.MemoryUsage;
    weakRefCount: number;
    recentStats: GCStats[];
    recommendations: string[];
  } {
    const currentMemory = process.memoryUsage();
    const averageGCTime = this.gcCount > 0 ? this.totalGCTime / this.gcCount : 0;
    
    const recommendations = this.generateRecommendations(currentMemory);

    return {
      gcCount: this.gcCount,
      totalGCTime: this.totalGCTime,
      averageGCTime,
      lastGCTime: this.lastGCTime,
      currentMemory,
      weakRefCount: this.weakRefs.size,
      recentStats: this.gcStats.slice(-10), // Last 10 measurements
      recommendations,
    };
  }

  /**
   * Optimize memory usage
   */
  async optimize(): Promise<{
    gcPerformed: boolean;
    weakRefsCleanedUp: number;
    memoryBefore: number;
    memoryAfter: number;
  }> {
    const memoryBefore = process.memoryUsage().heapUsed;

    // Clean up weak references first
    const weakRefsCleanedUp = this.cleanupWeakRefs();

    // Force GC if needed
    const gcPerformed = this.shouldForceGC() && this.forceGC();

    const memoryAfter = process.memoryUsage().heapUsed;

    const result = {
      gcPerformed,
      weakRefsCleanedUp,
      memoryBefore,
      memoryAfter,
    };

    this.emit('optimized', result);

    return result;
  }

  // Private helper methods

  private setupGCMonitoring(): void {
    // Try to set up GC monitoring if available
    try {
      if (process.versions.node) {
        // Node.js specific GC monitoring could be added here
        // For now, we'll rely on manual monitoring
      }
    } catch (error) {
      runtimeLogger.debug('GC monitoring not available:', error);
    }
  }

  private monitorMemory(): void {
    const memory = process.memoryUsage();
    
    // Record current stats
    this.recordGCStats();

    // Check if we should force GC
    if (this.options.enableAutoGC && this.shouldForceGC()) {
      this.forceGC();
    }

    // Clean up weak references periodically
    if (this.options.enableWeakRefCleanup && Math.random() < 0.1) { // 10% chance
      this.cleanupWeakRefs();
    }

    // Record memory metrics
    performanceMonitor.recordMetric('gc.heap_used', memory.heapUsed, 'bytes');
    performanceMonitor.recordMetric('gc.heap_total', memory.heapTotal, 'bytes');
    performanceMonitor.recordMetric('gc.external', memory.external, 'bytes');
    performanceMonitor.recordMetric('gc.rss', memory.rss, 'bytes');
  }

  private recordGCStats(gcDuration?: number, gcType?: string): void {
    const memory = process.memoryUsage();
    
    const stats: GCStats = {
      timestamp: Date.now(),
      heapUsed: memory.heapUsed,
      heapTotal: memory.heapTotal,
      external: memory.external,
      rss: memory.rss,
      gcDuration,
      gcType,
    };

    this.gcStats.push(stats);

    // Keep only recent stats (last 100)
    if (this.gcStats.length > 100) {
      this.gcStats = this.gcStats.slice(-100);
    }
  }

  private shouldForceGC(): boolean {
    const memory = process.memoryUsage();
    const now = Date.now();

    // Check memory threshold
    if (memory.heapUsed > this.options.gcThreshold) {
      return true;
    }

    // Check maximum heap size
    if (memory.heapUsed > this.options.maxHeapSize) {
      return true;
    }

    // Check if enough time has passed since last GC
    if (now - this.lastForcedGC < this.options.gcInterval) {
      return false;
    }

    // Check memory growth trend
    if (this.gcStats.length >= 3) {
      const recent = this.gcStats.slice(-3);
      const growth = recent[2].heapUsed - recent[0].heapUsed;
      const growthRate = growth / (recent[2].timestamp - recent[0].timestamp); // bytes per ms
      
      // If growing fast, trigger GC
      if (growthRate > 1024) { // 1KB per ms = 1MB per second
        return true;
      }
    }

    return false;
  }

  private generateRecommendations(memory: NodeJS.MemoryUsage): string[] {
    const recommendations: string[] = [];

    // Memory usage recommendations
    const heapUsageMB = memory.heapUsed / 1024 / 1024;
    if (heapUsageMB > 100) {
      recommendations.push('High heap usage detected - consider reducing memory footprint');
    }

    // GC frequency recommendations
    if (this.gcCount > 0) {
      const avgGCTime = this.totalGCTime / this.gcCount;
      if (avgGCTime > 50) {
        recommendations.push('GC taking too long - consider reducing object allocations');
      }
    }

    // Weak reference recommendations
    if (this.weakRefs.size > 1000) {
      recommendations.push('Large number of weak references - consider cleanup frequency');
    }

    // External memory recommendations
    const externalMB = memory.external / 1024 / 1024;
    if (externalMB > 50) {
      recommendations.push('High external memory usage - check for buffer leaks');
    }

    // Growth trend recommendations
    if (this.gcStats.length >= 5) {
      const recent = this.gcStats.slice(-5);
      const totalGrowth = recent[4].heapUsed - recent[0].heapUsed;
      if (totalGrowth > 10 * 1024 * 1024) { // 10MB growth
        recommendations.push('Memory usage trending upward - investigate potential leaks');
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('Memory usage appears healthy');
    }

    return recommendations;
  }
}

// Global GC optimizer instance
export const gcOptimizer = new GarbageCollectionOptimizer({
  enableAutoGC: true,
  gcThreshold: 10 * 1024 * 1024, // 10MB for optimized memory usage
  gcInterval: 15 * 1000, // 15 seconds
  monitorInterval: 5 * 1000, // 5 seconds
  maxHeapSize: 50 * 1024 * 1024, // 50MB max heap
  enableWeakRefCleanup: true,
});

// Auto-start if not in test environment
if (process.env.NODE_ENV !== 'test') {
  gcOptimizer.start();
}