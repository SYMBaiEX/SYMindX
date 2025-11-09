/**
 * Memory Management and Leak Detection System
 * Comprehensive memory monitoring, leak detection, and cleanup automation
 */

import { EventEmitter } from 'node:events';
import { performanceMonitor } from './PerformanceMonitor';
import { runtimeLogger } from './logger';
import { globalLazyLoader } from './LazyLoader';
import { stringPool, configPool, arrayPool, bufferPool } from './SharedMemoryPool';
import { gcOptimizer } from './GarbageCollectionOptimizer';

interface MemorySnapshot {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  arrayBuffers: number;
}

interface LeakDetectionResult {
  isLeaking: boolean;
  trend: 'increasing' | 'stable' | 'decreasing';
  growthRate: number; // bytes per second
  severity: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
}

interface ManagedResource<T = unknown> {
  id: string;
  type: string;
  resource: T;
  cleanup: () => Promise<void> | void;
  createdAt: number;
  lastAccessed: number;
  accessCount: number;
  ttl?: number;
}

export class MemoryManager<T = unknown> extends EventEmitter {
  private snapshots: MemorySnapshot[] = [];
  private maxSnapshots = 100;
  private snapshotInterval = 30000; // 30 seconds
  private resources = new Map<string, ManagedResource<T>>();
  private weakRefs = new Set<WeakRef<T>>();
  private isMonitoring = false;
  private monitoringTimer?: NodeJS.Timer;
  private cleanupTimer?: NodeJS.Timer;

  // Thresholds for leak detection
  private readonly thresholds = {
    growthRate: {
      low: 1024 * 1024, // 1MB/minute
      medium: 5 * 1024 * 1024, // 5MB/minute
      high: 10 * 1024 * 1024, // 10MB/minute
      critical: 50 * 1024 * 1024, // 50MB/minute
    },
    heapUsage: {
      warning: 100 * 1024 * 1024, // 100MB
      critical: 500 * 1024 * 1024, // 500MB
    },
  };

  constructor(options?: { snapshotInterval?: number; maxSnapshots?: number }) {
    super();

    if (options?.snapshotInterval) {
      this.snapshotInterval = options.snapshotInterval;
    }

    if (options?.maxSnapshots) {
      this.maxSnapshots = options.maxSnapshots;
    }

    // Set up performance monitoring thresholds
    this.setupThresholds();
  }

  /**
   * Start memory monitoring
   */
  start(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;

    // Take initial snapshot
    this.takeSnapshot();

    // Start GC optimizer
    gcOptimizer.start();

    // Start periodic monitoring
    this.monitoringTimer = setInterval(() => {
      this.takeSnapshot();
      this.analyzeMemoryTrends();
      this.optimizeMemoryUsage();
    }, this.snapshotInterval);

    // Start resource cleanup
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredResources();
      this.cleanupWeakRefs();
      this.cleanupSharedPools();
    }, 60000); // Every minute

    runtimeLogger.info('Memory monitoring started with optimization');
    this.emit('started');
  }

  /**
   * Stop memory monitoring
   */
  stop(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;

    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = undefined;
    }

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }

    // Stop GC optimizer
    gcOptimizer.stop();

    runtimeLogger.info('Memory monitoring stopped');
    this.emit('stopped');
  }

  /**
   * Register a resource for automatic cleanup
   */
  registerResource(
    type: string,
    resource: T,
    cleanup: () => Promise<void> | void,
    options?: {
      ttl?: number;
      id?: string;
    }
  ): string {
    const id = options?.id || this.generateResourceId();

    const managedResource: ManagedResource<T> = {
      id,
      type,
      resource,
      cleanup,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      accessCount: 0,
      ttl: options?.ttl,
    };

    this.resources.set(id, managedResource);

    performanceMonitor.recordMetric('memory.resource.registered', 1, 'count', {
      type,
    });

    this.emit('resourceRegistered', managedResource);
    return id;
  }

  /**
   * Unregister a resource
   */
  async unregisterResource(id: string): Promise<boolean> {
    const resource = this.resources.get(id);
    if (!resource) return false;

    try {
      await Promise.resolve(resource.cleanup());
      this.resources.delete(id);

      performanceMonitor.recordMetric(
        'memory.resource.unregistered',
        1,
        'count',
        {
          type: resource.type,
        }
      );

      this.emit('resourceUnregistered', resource);
      return true;
    } catch (error) {
      runtimeLogger.error(`Failed to cleanup resource ${id}:`, error);
      return false;
    }
  }

  /**
   * Access a registered resource (updates access tracking)
   */
  accessResource(id: string): T | null {
    const resource = this.resources.get(id);
    if (!resource) return null;

    resource.lastAccessed = Date.now();
    resource.accessCount++;

    return resource.resource;
  }

  /**
   * Register a weak reference for tracking
   */
  trackWeakRef<T extends object>(obj: T): WeakRef<T> {
    // Use GC optimizer for better weak ref management
    return gcOptimizer.trackWeakRef(obj);
  }

  /**
   * Force garbage collection if available
   */
  forceGC(): boolean {
    return gcOptimizer.forceGC();
  }

  /**
   * Take a memory snapshot
   */
  takeSnapshot(): MemorySnapshot {
    const memUsage = process.memoryUsage();

    const snapshot: MemorySnapshot = {
      timestamp: Date.now(),
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      rss: memUsage.rss,
      arrayBuffers: memUsage.arrayBuffers || 0,
    };

    this.snapshots.push(snapshot);

    // Trim snapshots to max size
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots = this.snapshots.slice(-this.maxSnapshots);
    }

    // Record metrics
    performanceMonitor.recordMetric(
      'memory.heap.used',
      snapshot.heapUsed,
      'bytes'
    );
    performanceMonitor.recordMetric(
      'memory.heap.total',
      snapshot.heapTotal,
      'bytes'
    );
    performanceMonitor.recordMetric(
      'memory.external',
      snapshot.external,
      'bytes'
    );
    performanceMonitor.recordMetric('memory.rss', snapshot.rss, 'bytes');

    this.emit('snapshot', snapshot);
    return snapshot;
  }

  /**
   * Detect memory leaks
   */
  detectLeaks(): LeakDetectionResult {
    if (this.snapshots.length < 5) {
      return {
        isLeaking: false,
        trend: 'stable',
        growthRate: 0,
        severity: 'low',
        recommendations: ['Insufficient data for analysis'],
      };
    }

    // Analyze heap usage trend
    const recentSnapshots = this.snapshots.slice(-10);
    const growthRate = this.calculateGrowthRate(recentSnapshots);
    const trend = this.analyzeTrend(recentSnapshots);

    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let isLeaking = false;

    // Determine severity based on growth rate
    if (Math.abs(growthRate) > this.thresholds.growthRate.critical) {
      severity = 'critical';
      isLeaking = true;
    } else if (Math.abs(growthRate) > this.thresholds.growthRate.high) {
      severity = 'high';
      isLeaking = true;
    } else if (Math.abs(growthRate) > this.thresholds.growthRate.medium) {
      severity = 'medium';
      isLeaking = growthRate > 0;
    } else if (Math.abs(growthRate) > this.thresholds.growthRate.low) {
      severity = 'low';
      isLeaking = growthRate > 0;
    }

    const recommendations = this.generateRecommendations(
      growthRate,
      severity,
      trend
    );

    return {
      isLeaking,
      trend,
      growthRate,
      severity,
      recommendations,
    };
  }

  /**
   * Get memory statistics
   */
  getStats(): {
    currentMemory: MemorySnapshot;
    leakDetection: LeakDetectionResult;
    resourceCount: number;
    resourcesByType: Record<string, number>;
    weakRefCount: number;
    snapshotCount: number;
  } {
    const current =
      this.snapshots[this.snapshots.length - 1] || this.takeSnapshot();
    const leakDetection = this.detectLeaks();

    const resourcesByType: Record<string, number> = {};
    for (const resource of this.resources.values()) {
      resourcesByType[resource.type] =
        (resourcesByType[resource.type] || 0) + 1;
    }

    return {
      currentMemory: current,
      leakDetection,
      resourceCount: this.resources.size,
      resourcesByType,
      weakRefCount: this.weakRefs.size,
      snapshotCount: this.snapshots.length,
    };
  }

  /**
   * Clean up all registered resources
   */
  async cleanup(): Promise<void> {
    const resources = Array.from(this.resources.values());

    const cleanupPromises = resources.map(async (resource) => {
      try {
        await Promise.resolve(resource.cleanup());
        this.resources.delete(resource.id);
      } catch (error) {
        runtimeLogger.error(
          `Failed to cleanup resource ${resource.id}:`,
          error
        );
      }
    });

    await Promise.all(cleanupPromises);

    // Clean up shared pools
    this.cleanupSharedPools();

    // Clear lazy loader
    await globalLazyLoader.clear();

    performanceMonitor.recordMetric(
      'memory.cleanup.completed',
      resources.length
    );
    this.emit('cleanupCompleted', resources.length);
  }

  /**
   * Optimize memory usage using all available techniques
   */
  async optimizeMemoryUsage(): Promise<{
    gcOptimized: boolean;
    lazyLoaderCleaned: number;
    sharedPoolsCleaned: number;
    resourcesCleaned: number;
  }> {
    // Optimize GC
    const gcResult = await gcOptimizer.optimize();

    // Clean up lazy loader
    const lazyLoaderCleaned = await globalLazyLoader.cleanup();

    // Clean up shared pools
    const sharedPoolsCleaned = this.cleanupSharedPools();

    // Clean up expired resources
    const resourcesCleaned = await this.cleanupExpiredResources();

    const result = {
      gcOptimized: gcResult.gcPerformed,
      lazyLoaderCleaned,
      sharedPoolsCleaned,
      resourcesCleaned,
    };

    this.emit('memoryOptimized', result);
    return result;
  }

  /**
   * Get comprehensive memory statistics
   */
  getComprehensiveStats(): {
    memoryManager: ReturnType<typeof this.getStats>;
    lazyLoader: ReturnType<typeof globalLazyLoader.getStats>;
    sharedPools: {
      stringPool: ReturnType<typeof stringPool.getStats>;
      configPool: ReturnType<typeof configPool.getStats>;
      arrayPool: ReturnType<typeof arrayPool.getStats>;
      bufferPool: ReturnType<typeof bufferPool.getStats>;
    };
    gcOptimizer: ReturnType<typeof gcOptimizer.getStats>;
  } {
    return {
      memoryManager: this.getStats(),
      lazyLoader: globalLazyLoader.getStats(),
      sharedPools: {
        stringPool: stringPool.getStats(),
        configPool: configPool.getStats(),
        arrayPool: arrayPool.getStats(),
        bufferPool: bufferPool.getStats(),
      },
      gcOptimizer: gcOptimizer.getStats(),
    };
  }

  // Private methods

  private generateResourceId(): string {
    return `res_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupThresholds(): void {
    performanceMonitor.setThreshold(
      'memory.heap.used',
      this.thresholds.heapUsage.warning,
      this.thresholds.heapUsage.critical
    );
  }

  private analyzeMemoryTrends(): void {
    const leakDetection = this.detectLeaks();

    if (leakDetection.isLeaking && leakDetection.severity === 'critical') {
      this.emit('criticalLeak', leakDetection);
      runtimeLogger.error('Critical memory leak detected!', leakDetection);
      this.handleCriticalLeak();
    } else if (leakDetection.isLeaking && leakDetection.severity === 'high') {
      this.emit('memoryLeak', leakDetection);
      runtimeLogger.warn('Memory leak detected', leakDetection);
    }
  }

  private calculateGrowthRate(snapshots: MemorySnapshot[]): number {
    if (snapshots.length < 2) return 0;

    const first = snapshots[0];
    const last = snapshots[snapshots.length - 1];
    const timeDiff = (last.timestamp - first.timestamp) / 1000; // seconds
    const memoryDiff = last.heapUsed - first.heapUsed;

    return timeDiff > 0 ? memoryDiff / timeDiff : 0;
  }

  private analyzeTrend(
    snapshots: MemorySnapshot[]
  ): 'increasing' | 'stable' | 'decreasing' {
    if (snapshots.length < 3) return 'stable';

    let increasing = 0;
    let decreasing = 0;

    for (let i = 1; i < snapshots.length; i++) {
      const diff = snapshots[i].heapUsed - snapshots[i - 1].heapUsed;
      if (diff > 1024 * 1024) {
        // 1MB threshold
        increasing++;
      } else if (diff < -1024 * 1024) {
        decreasing++;
      }
    }

    if (increasing > decreasing * 1.5) return 'increasing';
    if (decreasing > increasing * 1.5) return 'decreasing';
    return 'stable';
  }

  private generateRecommendations(
    growthRate: number,
    severity: string,
    trend: string
  ): string[] {
    const recommendations: string[] = [];

    if (severity === 'critical') {
      recommendations.push(
        'Immediate action required: Critical memory leak detected'
      );
      recommendations.push('Consider restarting the application');
      recommendations.push(
        'Enable --expose-gc flag and force garbage collection'
      );
    }

    if (growthRate > 0 && trend === 'increasing') {
      recommendations.push('Check for event listener leaks');
      recommendations.push('Review closure usage and variable scope');
      recommendations.push('Verify proper cleanup of timers and intervals');
      recommendations.push('Check for circular references');
    }

    if (this.resources.size > 100) {
      recommendations.push(
        'Large number of managed resources - consider cleanup frequency'
      );
    }

    if (trend === 'stable' && severity === 'low') {
      recommendations.push('Memory usage appears stable');
    }

    return recommendations;
  }

  private async handleCriticalLeak(): Promise<void> {
    runtimeLogger.warn('Handling critical memory leak - cleaning up resources');

    // Force garbage collection
    this.forceGC();

    // Clean up expired resources
    await this.cleanupExpiredResources();

    // Clean up weak references
    this.cleanupWeakRefs();

    // Take emergency snapshot
    this.takeSnapshot();
  }

  private async cleanupExpiredResources(): Promise<number> {
    const now = Date.now();
    const toCleanup: string[] = [];

    for (const [id, resource] of this.resources) {
      const isExpired = resource.ttl && now - resource.createdAt > resource.ttl;
      const isStale = now - resource.lastAccessed > 300000; // 5 minutes

      if (isExpired || (resource.accessCount === 0 && isStale)) {
        toCleanup.push(id);
      }
    }

    for (const id of toCleanup) {
      await this.unregisterResource(id);
    }

    if (toCleanup.length > 0) {
      performanceMonitor.recordMetric(
        'memory.cleanup.expired',
        toCleanup.length
      );
    }

    return toCleanup.length;
  }

  private cleanupWeakRefs(): void {
    // Delegate to GC optimizer for better weak ref management
    const cleaned = gcOptimizer.cleanupWeakRefs();
    
    if (cleaned > 0) {
      performanceMonitor.recordMetric('memory.weakrefs.cleaned', cleaned);
    }
  }

  private cleanupSharedPools(): number {
    let totalCleaned = 0;

    // Clean up all shared pools
    totalCleaned += stringPool.cleanup();
    totalCleaned += configPool.cleanup();
    totalCleaned += arrayPool.cleanup();
    totalCleaned += bufferPool.cleanup();

    if (totalCleaned > 0) {
      performanceMonitor.recordMetric('memory.shared_pools.cleaned', totalCleaned);
    }

    return totalCleaned;
  }
}

// Global memory manager instance with optimized settings
export const memoryManager = new MemoryManager({
  snapshotInterval: 15000, // 15 seconds for better monitoring
  maxSnapshots: 50, // Reduced for memory optimization
});

// Auto-start if not in test environment
if (process.env.NODE_ENV !== 'test') {
  memoryManager.start();
}
