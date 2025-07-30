/**
 * Performance Benchmarking Suite
 * Comprehensive benchmarking tools for performance optimization validation
 */

import { EventEmitter } from 'node:events';
import { performanceMonitor } from './PerformanceMonitor';
import { memoryManager } from './MemoryManager';
import { runtimeLogger } from './logger';

interface BenchmarkOptions {
  warmupRuns?: number;
  benchmarkRuns?: number;
  timeout?: number;
  collectMemory?: boolean;
  collectGC?: boolean;
}

interface BenchmarkResult {
  name: string;
  runs: number;
  duration: {
    min: number;
    max: number;
    avg: number;
    median: number;
    p95: number;
    p99: number;
    total: number;
  };
  throughput: {
    opsPerSecond: number;
    totalOps: number;
  };
  memory?: {
    initial: number;
    peak: number;
    final: number;
    leaked: number;
  };
  gc?: {
    forced: number;
    collections: number;
  };
  timestamp: number;
}

interface ComparisonResult {
  baseline: BenchmarkResult;
  optimized: BenchmarkResult;
  improvement: {
    duration: number; // percentage improvement
    throughput: number;
    memory: number;
  };
  verdict: 'better' | 'worse' | 'similar';
}

export class PerformanceBenchmark extends EventEmitter {
  private results = new Map<string, BenchmarkResult[]>();
  private isRunning = false;

  /**
   * Run a benchmark for a function
   */
  async benchmark(
    name: string,
    fn: () => Promise<any> | any,
    options: BenchmarkOptions = {}
  ): Promise<BenchmarkResult> {
    const config = {
      warmupRuns: options.warmupRuns ?? 5,
      benchmarkRuns: options.benchmarkRuns ?? 100,
      timeout: options.timeout ?? 30000,
      collectMemory: options.collectMemory ?? true,
      collectGC: options.collectGC ?? true,
      ...options,
    };

    if (this.isRunning) {
      throw new Error('Benchmark already running');
    }

    this.isRunning = true;

    try {
      runtimeLogger.info(`Starting benchmark: ${name}`);
      this.emit('benchmarkStarted', name);

      // Initial memory snapshot
      const initialMemory = config.collectMemory
        ? process.memoryUsage().heapUsed
        : 0;
      let peakMemory = initialMemory;
      let gcCount = 0;

      // Warmup runs
      runtimeLogger.debug(`Warmup runs: ${config.warmupRuns}`);
      for (let i = 0; i < config.warmupRuns; i++) {
        await Promise.resolve(fn());
      }

      // Force GC if available
      if (global.gc && config.collectGC) {
        global.gc();
        gcCount++;
      }

      // Benchmark runs
      const durations: number[] = [];
      const startTime = performance.now();
      let timeoutReached = false;

      runtimeLogger.debug(`Benchmark runs: ${config.benchmarkRuns}`);

      for (let i = 0; i < config.benchmarkRuns && !timeoutReached; i++) {
        // Check timeout
        if (performance.now() - startTime > config.timeout) {
          timeoutReached = true;
          runtimeLogger.warn(`Benchmark timeout reached after ${i} runs`);
          break;
        }

        const runStart = performance.now();
        await Promise.resolve(fn());
        const runEnd = performance.now();

        durations.push(runEnd - runStart);

        // Track peak memory
        if (config.collectMemory) {
          const currentMemory = process.memoryUsage().heapUsed;
          peakMemory = Math.max(peakMemory, currentMemory);
        }

        // Periodic GC to prevent memory pressure affecting results
        if (config.collectGC && i % 20 === 0 && global.gc) {
          global.gc();
          gcCount++;
        }
      }

      const totalTime = performance.now() - startTime;
      const finalMemory = config.collectMemory
        ? process.memoryUsage().heapUsed
        : 0;

      // Calculate statistics
      const sortedDurations = durations.sort((a, b) => a - b);
      const actualRuns = durations.length;

      const result: BenchmarkResult = {
        name,
        runs: actualRuns,
        duration: {
          min: sortedDurations[0] || 0,
          max: sortedDurations[actualRuns - 1] || 0,
          avg:
            durations.length > 0
              ? durations.reduce((a, b) => a + b, 0) / durations.length
              : 0,
          median: this.percentile(sortedDurations, 0.5),
          p95: this.percentile(sortedDurations, 0.95),
          p99: this.percentile(sortedDurations, 0.99),
          total: totalTime,
        },
        throughput: {
          opsPerSecond: actualRuns > 0 ? (actualRuns / totalTime) * 1000 : 0,
          totalOps: actualRuns,
        },
        memory: config.collectMemory
          ? {
              initial: initialMemory,
              peak: peakMemory,
              final: finalMemory,
              leaked: finalMemory - initialMemory,
            }
          : undefined,
        gc: config.collectGC
          ? {
              forced: gcCount,
              collections: gcCount,
            }
          : undefined,
        timestamp: Date.now(),
      };

      // Store result
      if (!this.results.has(name)) {
        this.results.set(name, []);
      }
      this.results.get(name)!.push(result);

      // Keep only last 10 results per benchmark
      const results = this.results.get(name)!;
      if (results.length > 10) {
        this.results.set(name, results.slice(-10));
      }

      runtimeLogger.info(`Benchmark completed: ${name}`, {
        runs: actualRuns,
        avgDuration: result.duration.avg,
        opsPerSecond: result.throughput.opsPerSecond,
      });

      this.emit('benchmarkCompleted', result);
      return result;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Compare two benchmark results
   */
  compare(
    baseline: BenchmarkResult,
    optimized: BenchmarkResult
  ): ComparisonResult {
    const durationImprovement =
      ((baseline.duration.avg - optimized.duration.avg) /
        baseline.duration.avg) *
      100;
    const throughputImprovement =
      ((optimized.throughput.opsPerSecond - baseline.throughput.opsPerSecond) /
        baseline.throughput.opsPerSecond) *
      100;

    let memoryImprovement = 0;
    if (baseline.memory && optimized.memory) {
      memoryImprovement =
        ((baseline.memory.peak - optimized.memory.peak) /
          baseline.memory.peak) *
        100;
    }

    let verdict: 'better' | 'worse' | 'similar' = 'similar';

    if (durationImprovement > 5 && throughputImprovement > 5) {
      verdict = 'better';
    } else if (durationImprovement < -5 || throughputImprovement < -5) {
      verdict = 'worse';
    }

    return {
      baseline,
      optimized,
      improvement: {
        duration: durationImprovement,
        throughput: throughputImprovement,
        memory: memoryImprovement,
      },
      verdict,
    };
  }

  /**
   * Run automated performance tests
   */
  async runPerformanceTests(): Promise<Map<string, ComparisonResult>> {
    const results = new Map<string, ComparisonResult>();

    runtimeLogger.info('Running automated performance tests');

    // Event Bus Performance Test
    try {
      const eventBusResults = await this.benchmarkEventBus();
      results.set('event-bus', eventBusResults);
    } catch (error) {
      runtimeLogger.error('Event bus benchmark failed:', error);
    }

    // Cache Performance Test
    try {
      const cacheResults = await this.benchmarkCache();
      results.set('cache', cacheResults);
    } catch (error) {
      runtimeLogger.error('Cache benchmark failed:', error);
    }

    // Memory Operations Test
    try {
      const memoryResults = await this.benchmarkMemoryOperations();
      results.set('memory', memoryResults);
    } catch (error) {
      runtimeLogger.error('Memory benchmark failed:', error);
    }

    // Async Queue Test
    try {
      const queueResults = await this.benchmarkAsyncQueue();
      results.set('async-queue', queueResults);
    } catch (error) {
      runtimeLogger.error('Async queue benchmark failed:', error);
    }

    return results;
  }

  /**
   * Get benchmark history for a test
   */
  getHistory(name: string): BenchmarkResult[] {
    return this.results.get(name) || [];
  }

  /**
   * Get all benchmark results
   */
  getAllResults(): Map<string, BenchmarkResult[]> {
    return new Map(this.results);
  }

  /**
   * Clear benchmark history
   */
  clearHistory(name?: string): void {
    if (name) {
      this.results.delete(name);
    } else {
      this.results.clear();
    }
  }

  // Private benchmark implementations

  private async benchmarkEventBus(): Promise<ComparisonResult> {
    const { SimpleEventBus } = await import('../core/event-bus');
    const { OptimizedEventBus } = await import('../core/OptimizedEventBus');

    // Baseline - Simple Event Bus
    const simpleEventBus = new SimpleEventBus();
    let eventCount = 0;
    simpleEventBus.on('test-event', () => {
      eventCount++;
    });

    const baselineResult = await this.benchmark(
      'event-bus-simple',
      () => {
        simpleEventBus.emit({
          id: `event-${eventCount}`,
          type: 'test-event',
          agentId: 'test-agent',
          timestamp: new Date(),
          payload: { data: 'test-data', count: eventCount },
        });
      },
      { benchmarkRuns: 1000 }
    );

    simpleEventBus.shutdown();

    // Optimized - Optimized Event Bus
    const optimizedEventBus = new OptimizedEventBus();
    eventCount = 0;
    optimizedEventBus.on('test-event', () => {
      eventCount++;
    });

    const optimizedResult = await this.benchmark(
      'event-bus-optimized',
      () => {
        optimizedEventBus.emit({
          id: `event-${eventCount}`,
          type: 'test-event',
          agentId: 'test-agent',
          timestamp: new Date(),
          payload: { data: 'test-data', count: eventCount },
        });
      },
      { benchmarkRuns: 1000 }
    );

    optimizedEventBus.shutdown();

    return this.compare(baselineResult, optimizedResult);
  }

  private async benchmarkCache(): Promise<ComparisonResult> {
    const { LRUCache } = await import('../utils/LRUCache');

    // Baseline - Map-based cache
    const mapCache = new Map<string, any>();
    const baselineResult = await this.benchmark(
      'cache-map',
      () => {
        const key = `key-${Math.floor(Math.random() * 1000)}`;
        if (Math.random() > 0.3) {
          mapCache.set(key, { data: 'test-data', timestamp: Date.now() });
        } else {
          mapCache.get(key);
        }
      },
      { benchmarkRuns: 5000 }
    );

    // Optimized - LRU Cache
    const lruCache = new LRUCache<string, any>({ maxSize: 1000, ttl: 60000 });
    const optimizedResult = await this.benchmark(
      'cache-lru',
      () => {
        const key = `key-${Math.floor(Math.random() * 1000)}`;
        if (Math.random() > 0.3) {
          lruCache.set(key, { data: 'test-data', timestamp: Date.now() });
        } else {
          lruCache.get(key);
        }
      },
      { benchmarkRuns: 5000 }
    );

    return this.compare(baselineResult, optimizedResult);
  }

  private async benchmarkMemoryOperations(): Promise<ComparisonResult> {
    // Baseline - Manual memory management
    const objects: any[] = [];
    const baselineResult = await this.benchmark(
      'memory-manual',
      () => {
        const obj = {
          data: new Array(100).fill('test'),
          timestamp: Date.now(),
        };
        objects.push(obj);

        // Manual cleanup
        if (objects.length > 1000) {
          objects.splice(0, 500);
        }
      },
      { benchmarkRuns: 2000, collectMemory: true }
    );

    // Optimized - Managed memory with weak references
    const { memoryManager } = await import('../utils/MemoryManager');
    const optimizedResult = await this.benchmark(
      'memory-managed',
      () => {
        const obj = {
          data: new Array(100).fill('test'),
          timestamp: Date.now(),
        };
        memoryManager.trackWeakRef(obj);

        memoryManager.registerResource(
          'test-object',
          obj,
          () => {
            // Cleanup logic
          },
          { ttl: 60000 }
        );
      },
      { benchmarkRuns: 2000, collectMemory: true }
    );

    return this.compare(baselineResult, optimizedResult);
  }

  private async benchmarkAsyncQueue(): Promise<ComparisonResult> {
    const { globalQueue } = await import('../utils/AsyncQueue');

    // Baseline - setTimeout
    const baselineResult = await this.benchmark(
      'async-timeout',
      async () => {
        return new Promise<void>((resolve) => {
          setTimeout(() => {
            // Simulate work
            Math.random() * 1000;
            resolve();
          }, 1);
        });
      },
      { benchmarkRuns: 100 }
    );

    // Optimized - AsyncQueue
    const optimizedResult = await this.benchmark(
      'async-queue',
      async () => {
        return new Promise<void>((resolve) => {
          globalQueue.add(
            () => {
              // Simulate work
              Math.random() * 1000;
              resolve();
            },
            { delay: 1 }
          );
        });
      },
      { benchmarkRuns: 100 }
    );

    return this.compare(baselineResult, optimizedResult);
  }

  private percentile(values: number[], p: number): number {
    if (values.length === 0) return 0;

    const index = p * (values.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;

    if (upper >= values.length) return values[values.length - 1];

    return values[lower] * (1 - weight) + values[upper] * weight;
  }
}

// Global benchmark instance
export const performanceBenchmark = new PerformanceBenchmark();

/**
 * Quick benchmark function for ad-hoc testing
 */
export async function quickBenchmark(
  name: string,
  fn: () => Promise<any> | any,
  runs = 100
): Promise<BenchmarkResult> {
  return performanceBenchmark.benchmark(name, fn, { benchmarkRuns: runs });
}

/**
 * Compare performance between two functions
 */
export async function compareFunctions(
  baselineFn: () => Promise<any> | any,
  optimizedFn: () => Promise<any> | any,
  name = 'comparison',
  runs = 100
): Promise<ComparisonResult> {
  const baseline = await performanceBenchmark.benchmark(
    `${name}-baseline`,
    baselineFn,
    { benchmarkRuns: runs }
  );
  const optimized = await performanceBenchmark.benchmark(
    `${name}-optimized`,
    optimizedFn,
    { benchmarkRuns: runs }
  );

  return performanceBenchmark.compare(baseline, optimized);
}
