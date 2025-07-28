/**
 * Performance Monitor for SYMindX Runtime
 *
 * Comprehensive performance monitoring and optimization system
 * implementing Node.js best practices for async/await optimization
 */

import { createHook } from 'node:async_hooks';
import { performance, PerformanceObserver } from 'node:perf_hooks';
import { nextTick } from 'node:process';

import { runtimeLogger } from '../utils/logger';

interface PerformanceMetrics {
  operationsPerSecond: number;
  averageLatency: number;
  asyncOperationLatency: number;
  eventLoopDelay: number;
  memoryUsage: NodeJS.MemoryUsage;
  gcMetrics: {
    major: number;
    minor: number;
    incremental: number;
  };
  asyncOperations: {
    active: number;
    completed: number;
    failed: number;
  };
}

interface TimingData {
  startTime: number;
  endTime?: number;
  duration?: number;
  operationType: string;
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics;
  private timings: Map<string, TimingData[]> = new Map();
  private operationCounts: Map<string, number> = new Map();
  private asyncHook?: ReturnType<typeof createHook>;
  private performanceObserver?: PerformanceObserver;
  private startTime: number;
  private isMonitoring = false;

  // Performance thresholds (configurable)
  private thresholds = {
    operationLatency: 100, // milliseconds
    eventLoopDelay: 10, // milliseconds
    memoryThreshold: 512 * 1024 * 1024, // 512MB
    maxAsyncOperations: 1000,
  };

  // Optimization flags
  private optimizations = {
    enableBatching: true,
    enableCaching: true,
    enableParallelProcessing: true,
    enableLazyLoading: true,
  };

  constructor() {
    this.startTime = performance.now();
    this.metrics = this.createEmptyMetrics();
    this.initializePerformanceObserver();
  }

  /**
   * Initialize performance monitoring
   */
  public startMonitoring(): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.initializeAsyncHooks();
    this.startPerformanceTracking();

    runtimeLogger.info('⚡ Performance monitoring started');
  }

  /**
   * Stop performance monitoring
   */
  public stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;

    if (this.asyncHook) {
      this.asyncHook.disable();
    }

    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }

    runtimeLogger.info('⚡ Performance monitoring stopped');
  }

  /**
   * Record operation start time
   */
  public recordOperationStart(
    operationId: string,
    operationType: string
  ): void {
    performance.mark(`${operationType}-${operationId}-start`);

    if (!this.timings.has(operationType)) {
      this.timings.set(operationType, []);
    }

    const timings = this.timings.get(operationType)!;
    timings.push({
      startTime: performance.now(),
      operationType,
    });

    // Keep only recent timings to prevent memory leaks
    if (timings.length > 1000) {
      timings.splice(0, timings.length - 1000);
    }
  }

  /**
   * Record operation end time and calculate metrics
   */
  public recordOperationEnd(
    operationId: string,
    operationType: string,
    success = true
  ): void {
    const endTime = performance.now();
    performance.mark(`${operationType}-${operationId}-end`);

    try {
      performance.measure(
        `${operationType}-${operationId}`,
        `${operationType}-${operationId}-start`,
        `${operationType}-${operationId}-end`
      );
    } catch (error) {
      // Mark not found, operation might have been too fast or not started
      runtimeLogger.debug(
        `Performance mark not found for ${operationType}-${operationId}`
      );
    }

    // Update operation counts
    const currentCount = this.operationCounts.get(operationType) || 0;
    this.operationCounts.set(operationType, currentCount + 1);

    // Update timing data
    const timings = this.timings.get(operationType);
    if (timings && timings.length > 0) {
      const lastTiming = timings[timings.length - 1];
      lastTiming.endTime = endTime;
      lastTiming.duration = endTime - lastTiming.startTime;
    }

    if (!success) {
      this.metrics.asyncOperations.failed++;
    } else {
      this.metrics.asyncOperations.completed++;
    }

    // Update real-time metrics
    this.updateMetrics();
  }

  /**
   * Wrap async function with performance monitoring
   */
  public wrapAsyncFunction<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    operationType: string
  ): T {
    return (async (...args: any[]) => {
      const operationId = Math.random().toString(36).substring(7);

      this.recordOperationStart(operationId, operationType);

      try {
        const result = await fn(...args);
        this.recordOperationEnd(operationId, operationType, true);
        return result;
      } catch (error) {
        this.recordOperationEnd(operationId, operationType, false);
        throw error;
      }
    }) as T;
  }

  /**
   * Optimize async operation with batching
   */
  public async batchAsyncOperations<T>(
    operations: (() => Promise<T>)[],
    batchSize = 10
  ): Promise<T[]> {
    if (!this.optimizations.enableBatching) {
      return Promise.all(operations.map((op) => op()));
    }

    const results: T[] = [];

    for (let i = 0; i < operations.length; i += batchSize) {
      const batch = operations.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map((op) => op()));
      results.push(...batchResults);

      // Use nextTick to yield control to event loop between batches
      await new Promise((resolve) => nextTick(resolve));
    }

    return results;
  }

  /**
   * Get current performance metrics
   */
  public getMetrics(): PerformanceMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }

  /**
   * Get detailed performance report
   */
  public getPerformanceReport(): {
    summary: PerformanceMetrics;
    operationBreakdown: Map<string, number>;
    warnings: string[];
    recommendations: string[];
  } {
    this.updateMetrics();

    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Check thresholds and generate warnings
    if (this.metrics.averageLatency > this.thresholds.operationLatency) {
      warnings.push(
        `High operation latency: ${this.metrics.averageLatency.toFixed(2)}ms`
      );
      recommendations.push(
        'Consider optimizing async/await patterns and reducing synchronous operations'
      );
    }

    if (this.metrics.eventLoopDelay > this.thresholds.eventLoopDelay) {
      warnings.push(
        `High event loop delay: ${this.metrics.eventLoopDelay.toFixed(2)}ms`
      );
      recommendations.push(
        'Reduce CPU-intensive synchronous operations and use setImmediate for heavy tasks'
      );
    }

    if (this.metrics.memoryUsage.heapUsed > this.thresholds.memoryThreshold) {
      warnings.push(
        `High memory usage: ${(this.metrics.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`
      );
      recommendations.push(
        'Check for memory leaks and implement object pooling for frequently created objects'
      );
    }

    if (
      this.metrics.asyncOperations.active > this.thresholds.maxAsyncOperations
    ) {
      warnings.push(
        `Too many active async operations: ${this.metrics.asyncOperations.active}`
      );
      recommendations.push(
        'Implement operation queuing and limit concurrent async operations'
      );
    }

    return {
      summary: { ...this.metrics },
      operationBreakdown: new Map(this.operationCounts),
      warnings,
      recommendations,
    };
  }

  /**
   * Optimize runtime performance based on current metrics
   */
  public async optimizePerformance(): Promise<void> {
    const report = this.getPerformanceReport();

    // Force garbage collection if memory usage is high
    if (this.metrics.memoryUsage.heapUsed > this.thresholds.memoryThreshold) {
      if (global.gc) {
        global.gc();
        runtimeLogger.info(
          '⚡ Forced garbage collection due to high memory usage'
        );
      }
    }

    // Clear old performance marks and measures
    performance.clearMarks();
    performance.clearMeasures();

    // Reset metrics if they're getting too large
    if (this.operationCounts.size > 1000) {
      this.operationCounts.clear();
      runtimeLogger.info('⚡ Cleared operation counts to prevent memory bloat');
    }

    // Log optimization recommendations
    if (report.recommendations.length > 0) {
      runtimeLogger.info('💡 Performance recommendations:', {
        metadata: {
          recommendations: report.recommendations,
        },
      });
    }
  }

  private createEmptyMetrics(): PerformanceMetrics {
    return {
      operationsPerSecond: 0,
      averageLatency: 0,
      asyncOperationLatency: 0,
      eventLoopDelay: 0,
      memoryUsage: process.memoryUsage(),
      gcMetrics: {
        major: 0,
        minor: 0,
        incremental: 0,
      },
      asyncOperations: {
        active: 0,
        completed: 0,
        failed: 0,
      },
    };
  }

  private initializePerformanceObserver(): void {
    this.performanceObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();

      for (const entry of entries) {
        if (entry.entryType === 'measure') {
          // Update latency metrics based on measurements
          this.updateLatencyMetrics(entry.duration);
        } else if (entry.entryType === 'gc') {
          // Update GC metrics
          this.updateGCMetrics(entry as any);
        }
      }
    });

    this.performanceObserver.observe({
      entryTypes: ['measure', 'gc'],
      buffered: true,
    });
  }

  private initializeAsyncHooks(): void {
    const activeOperations = new Set<number>();

    this.asyncHook = createHook({
      init: (asyncId: number, type: string) => {
        if (type === 'Timeout' || type === 'Immediate' || type === 'Promise') {
          activeOperations.add(asyncId);
          this.metrics.asyncOperations.active++;
        }
      },
      destroy: (asyncId: number) => {
        if (activeOperations.has(asyncId)) {
          activeOperations.delete(asyncId);
          this.metrics.asyncOperations.active--;
        }
      },
    });

    this.asyncHook.enable();
  }

  private startPerformanceTracking(): void {
    // Track metrics every second
    setInterval(() => {
      this.updateMetrics();
    }, 1000);
  }

  private updateMetrics(): void {
    // Update memory usage
    this.metrics.memoryUsage = process.memoryUsage();

    // Calculate operations per second
    const totalOperations = Array.from(this.operationCounts.values()).reduce(
      (sum, count) => sum + count,
      0
    );
    const elapsedSeconds = (performance.now() - this.startTime) / 1000;
    this.metrics.operationsPerSecond = totalOperations / elapsedSeconds;

    // Calculate average latency from timing data
    let totalDuration = 0;
    let totalCount = 0;

    for (const timings of this.timings.values()) {
      for (const timing of timings) {
        if (timing.duration !== undefined) {
          totalDuration += timing.duration;
          totalCount++;
        }
      }
    }

    this.metrics.averageLatency =
      totalCount > 0 ? totalDuration / totalCount : 0;

    // Measure event loop delay
    const start = performance.now();
    setImmediate(() => {
      this.metrics.eventLoopDelay = performance.now() - start;
    });
  }

  private updateLatencyMetrics(duration: number): void {
    // Update async operation latency (running average)
    this.metrics.asyncOperationLatency =
      this.metrics.asyncOperationLatency * 0.9 + duration * 0.1;
  }

  private updateGCMetrics(entry: any): void {
    switch (entry.kind) {
      case 1: // Major GC
        this.metrics.gcMetrics.major++;
        break;
      case 2: // Minor GC
        this.metrics.gcMetrics.minor++;
        break;
      case 4: // Incremental GC
        this.metrics.gcMetrics.incremental++;
        break;
    }
  }
}

export const performanceMonitor = new PerformanceMonitor();
