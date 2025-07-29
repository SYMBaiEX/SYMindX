/**
 * @module performance-tools
 * @description Performance measurement and benchmarking tools for context system testing
 */

/**
 * Performance metrics collection
 */
export interface PerformanceMetrics {
  executionTime: number;
  memoryUsage: {
    before: NodeJS.MemoryUsage;
    after: NodeJS.MemoryUsage;
    delta: number; // MB
  };
  operations: number;
  throughput: number; // ops/sec
  timestamp: Date;
}

/**
 * Benchmark result for comparison
 */
export interface BenchmarkResult {
  name: string;
  metrics: PerformanceMetrics;
  baseline?: PerformanceMetrics;
  improvement?: number; // percentage
}

/**
 * Performance profiler for measuring operation performance
 */
export class PerformanceProfiler {
  private measurements: Map<string, PerformanceMetrics[]> = new Map();
  private baselines: Map<string, PerformanceMetrics> = new Map();

  /**
   * Measure the performance of an operation
   */
  async measure<T>(
    name: string,
    operation: () => Promise<T> | T,
    iterations: number = 1
  ): Promise<{ result: T; metrics: PerformanceMetrics }> {
    const startTime = performance.now();
    const startMemory = process.memoryUsage();

    let result: T;
    for (let i = 0; i < iterations; i++) {
      result = await operation();
    }

    const endTime = performance.now();
    const endMemory = process.memoryUsage();

    const metrics: PerformanceMetrics = {
      executionTime: endTime - startTime,
      memoryUsage: {
        before: startMemory,
        after: endMemory,
        delta: (endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024, // MB
      },
      operations: iterations,
      throughput: iterations / ((endTime - startTime) / 1000), // ops/sec
      timestamp: new Date(),
    };

    // Store measurement
    if (!this.measurements.has(name)) {
      this.measurements.set(name, []);
    }
    this.measurements.get(name)!.push(metrics);

    return { result: result!, metrics };
  }

  /**
   * Set a baseline measurement for comparison
   */
  setBaseline(name: string, metrics: PerformanceMetrics): void {
    this.baselines.set(name, metrics);
  }

  /**
   * Get benchmark results with baseline comparison
   */
  getBenchmark(name: string): BenchmarkResult | null {
    const measurements = this.measurements.get(name);
    if (!measurements || measurements.length === 0) {
      return null;
    }

    const latest = measurements[measurements.length - 1];
    const baseline = this.baselines.get(name);

    let improvement: number | undefined;
    if (baseline) {
      improvement = ((baseline.executionTime - latest.executionTime) / baseline.executionTime) * 100;
    }

    return {
      name,
      metrics: latest,
      baseline,
      improvement,
    };
  }

  /**
   * Get average performance metrics for an operation
   */
  getAverageMetrics(name: string): PerformanceMetrics | null {
    const measurements = this.measurements.get(name);
    if (!measurements || measurements.length === 0) {
      return null;
    }

    const avg = measurements.reduce(
      (acc, metrics) => ({
        executionTime: acc.executionTime + metrics.executionTime,
        memoryUsage: {
          before: acc.memoryUsage.before,
          after: acc.memoryUsage.after,
          delta: acc.memoryUsage.delta + metrics.memoryUsage.delta,
        },
        operations: acc.operations + metrics.operations,
        throughput: acc.throughput + metrics.throughput,
        timestamp: acc.timestamp,
      }),
      {
        executionTime: 0,
        memoryUsage: { before: measurements[0].memoryUsage.before, after: measurements[0].memoryUsage.after, delta: 0 },
        operations: 0,
        throughput: 0,
        timestamp: measurements[0].timestamp,
      }
    );

    return {
      executionTime: avg.executionTime / measurements.length,
      memoryUsage: {
        before: avg.memoryUsage.before,
        after: avg.memoryUsage.after,
        delta: avg.memoryUsage.delta / measurements.length,
      },
      operations: avg.operations / measurements.length,
      throughput: avg.throughput / measurements.length,
      timestamp: avg.timestamp,
    };
  }

  /**
   * Clear all measurements
   */
  clear(): void {
    this.measurements.clear();
    this.baselines.clear();
  }

  /**
   * Generate performance report
   */
  generateReport(): string {
    const report = ['Performance Report', '=================', ''];

    for (const [name, measurements] of this.measurements) {
      const avg = this.getAverageMetrics(name);
      const benchmark = this.getBenchmark(name);

      if (avg && benchmark) {
        report.push(`Operation: ${name}`);
        report.push(`  Measurements: ${measurements.length}`);
        report.push(`  Avg Execution Time: ${avg.executionTime.toFixed(2)}ms`);
        report.push(`  Avg Memory Delta: ${avg.memoryUsage.delta.toFixed(2)}MB`);
        report.push(`  Avg Throughput: ${avg.throughput.toFixed(2)} ops/sec`);

        if (benchmark.baseline && benchmark.improvement !== undefined) {
          const sign = benchmark.improvement > 0 ? '+' : '';
          report.push(`  Improvement: ${sign}${benchmark.improvement.toFixed(1)}%`);
        }

        report.push('');
      }
    }

    return report.join('\n');
  }
}

/**
 * Load testing utilities
 */
export class LoadTester {
  private profiler = new PerformanceProfiler();

  /**
   * Run load test with increasing concurrency
   */
  async runLoadTest(
    name: string,
    operation: () => Promise<any>,
    maxConcurrency: number = 100,
    step: number = 10,
    durationMs: number = 10000
  ): Promise<Array<{ concurrency: number; metrics: PerformanceMetrics }>> {
    const results: Array<{ concurrency: number; metrics: PerformanceMetrics }> = [];

    for (let concurrency = step; concurrency <= maxConcurrency; concurrency += step) {
      console.log(`Testing concurrency: ${concurrency}`);

      const startTime = Date.now();
      const operations: Array<() => Promise<any>> = [];

      // Create concurrent operations
      for (let i = 0; i < concurrency; i++) {
        operations.push(operation);
      }

      // Measure concurrent execution
      const { metrics } = await this.profiler.measure(
        `${name}_concurrency_${concurrency}`,
        async () => {
          const promises = operations.map(op => op());
          return Promise.all(promises);
        }
      );

      results.push({ concurrency, metrics });

      // Stop if we've run for too long
      if (Date.now() - startTime > durationMs) {
        break;
      }
    }

    return results;
  }

  /**
   * Run stress test with continuous load
   */
  async runStressTest(
    name: string,
    operation: () => Promise<any>,
    durationMs: number = 30000,
    targetOpsPerSec: number = 100
  ): Promise<{
    totalOperations: number;
    successfulOperations: number;
    failedOperations: number;
    averageResponseTime: number;
    maxResponseTime: number;
    minResponseTime: number;
  }> {
    const startTime = Date.now();
    const results: number[] = [];
    let totalOperations = 0;
    let successfulOperations = 0;
    let failedOperations = 0;

    const intervalMs = 1000 / targetOpsPerSec;

    while (Date.now() - startTime < durationMs) {
      const operationStart = performance.now();

      try {
        await operation();
        const operationTime = performance.now() - operationStart;
        results.push(operationTime);
        successfulOperations++;
      } catch (error) {
        failedOperations++;
      }

      totalOperations++;

      // Wait for next operation based on target rate
      const elapsed = performance.now() - operationStart;
      if (elapsed < intervalMs) {
        await new Promise(resolve => setTimeout(resolve, intervalMs - elapsed));
      }
    }

    return {
      totalOperations,
      successfulOperations,
      failedOperations,
      averageResponseTime: results.reduce((a, b) => a + b, 0) / results.length,
      maxResponseTime: Math.max(...results),
      minResponseTime: Math.min(...results),
    };
  }

  /**
   * Memory leak detection
   */
  async detectMemoryLeaks(
    name: string,
    operation: () => Promise<any>,
    iterations: number = 1000,
    checkInterval: number = 100
  ): Promise<{
    hasLeak: boolean;
    memoryGrowth: number; // MB
    measurements: Array<{ iteration: number; heapUsed: number }>;
  }> {
    const measurements: Array<{ iteration: number; heapUsed: number }> = [];
    
    // Force garbage collection at start
    if (global.gc) {
      global.gc();
    }

    const initialMemory = process.memoryUsage().heapUsed;

    for (let i = 0; i < iterations; i++) {
      await operation();

      if (i % checkInterval === 0) {
        // Force garbage collection before measurement
        if (global.gc) {
          global.gc();
        }

        const currentMemory = process.memoryUsage().heapUsed;
        measurements.push({
          iteration: i,
          heapUsed: currentMemory / 1024 / 1024, // MB
        });
      }
    }

    const finalMemory = process.memoryUsage().heapUsed;
    const memoryGrowth = (finalMemory - initialMemory) / 1024 / 1024; // MB

    // Consider it a leak if memory grew by more than 10MB per 1000 operations
    const leakThreshold = (iterations / 1000) * 10; // 10MB per 1000 operations
    const hasLeak = memoryGrowth > leakThreshold;

    return {
      hasLeak,
      memoryGrowth,
      measurements,
    };
  }

  /**
   * Get profiler for additional measurements
   */
  getProfiler(): PerformanceProfiler {
    return this.profiler;
  }
}

/**
 * Benchmarking suite for context operations
 */
export class ContextBenchmarkSuite {
  private profiler = new PerformanceProfiler();
  private loadTester = new LoadTester();

  /**
   * Benchmark context creation performance
   */
  async benchmarkContextCreation(
    createContext: () => any,
    iterations: number = 1000
  ): Promise<BenchmarkResult> {
    const { metrics } = await this.profiler.measure(
      'context_creation',
      () => {
        for (let i = 0; i < iterations; i++) {
          createContext();
        }
      }
    );

    return {
      name: 'Context Creation',
      metrics,
    };
  }

  /**
   * Benchmark message processing performance
   */
  async benchmarkMessageProcessing(
    processMessage: (message: string) => Promise<void>,
    messageCount: number = 1000
  ): Promise<BenchmarkResult> {
    const messages = Array.from({ length: messageCount }, (_, i) => `Test message ${i}`);

    const { metrics } = await this.profiler.measure(
      'message_processing',
      async () => {
        for (const message of messages) {
          await processMessage(message);
        }
      }
    );

    return {
      name: 'Message Processing',
      metrics,
    };
  }

  /**
   * Benchmark context querying performance
   */
  async benchmarkContextQueries(
    queryContext: () => any,
    iterations: number = 10000
  ): Promise<BenchmarkResult> {
    const { metrics } = await this.profiler.measure(
      'context_queries',
      () => {
        for (let i = 0; i < iterations; i++) {
          queryContext();
        }
      }
    );

    return {
      name: 'Context Queries',
      metrics,
    };
  }

  /**
   * Run full benchmark suite
   */
  async runFullSuite(operations: {
    createContext: () => any;
    processMessage: (message: string) => Promise<void>;
    queryContext: () => any;
  }): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = [];

    // Context creation benchmark
    results.push(await this.benchmarkContextCreation(operations.createContext));

    // Message processing benchmark
    results.push(await this.benchmarkMessageProcessing(operations.processMessage));

    // Context querying benchmark
    results.push(await this.benchmarkContextQueries(operations.queryContext));

    return results;
  }

  /**
   * Generate benchmark report
   */
  generateBenchmarkReport(results: BenchmarkResult[]): string {
    const report = ['Context System Benchmark Report', '================================', ''];

    for (const result of results) {
      report.push(`${result.name}:`);
      report.push(`  Execution Time: ${result.metrics.executionTime.toFixed(2)}ms`);
      report.push(`  Memory Delta: ${result.metrics.memoryUsage.delta.toFixed(2)}MB`);
      report.push(`  Throughput: ${result.metrics.throughput.toFixed(2)} ops/sec`);
      report.push(`  Operations: ${result.metrics.operations}`);

      if (result.improvement !== undefined) {
        const sign = result.improvement > 0 ? '+' : '';
        report.push(`  Improvement: ${sign}${result.improvement.toFixed(1)}%`);
      }

      report.push('');
    }

    return report.join('\n');
  }
}

/**
 * Utility functions for performance testing
 */
export class PerformanceTestUtils {
  /**
   * Sleep for specified milliseconds
   */
  static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate CPU load for testing
   */
  static generateCPULoad(durationMs: number): void {
    const start = Date.now();
    while (Date.now() - start < durationMs) {
      // Busy wait to consume CPU
      Math.random();
    }
  }

  /**
   * Generate memory pressure for testing
   */
  static generateMemoryPressure(sizeMB: number): Buffer {
    return Buffer.alloc(sizeMB * 1024 * 1024, 'x');
  }

  /**
   * Wait for system to stabilize after operations
   */
  static async waitForStabilization(timeoutMs: number = 1000): Promise<void> {
    await this.sleep(timeoutMs);
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  }

  /**
   * Monitor system resources during operation
   */
  static async monitorResources<T>(
    operation: () => Promise<T>,
    intervalMs: number = 100
  ): Promise<{
    result: T;
    resourceHistory: Array<{
      timestamp: number;
      memory: NodeJS.MemoryUsage;
    }>;
  }> {
    const resourceHistory: Array<{ timestamp: number; memory: NodeJS.MemoryUsage }> = [];
    
    const monitor = setInterval(() => {
      resourceHistory.push({
        timestamp: Date.now(),
        memory: process.memoryUsage(),
      });
    }, intervalMs);

    try {
      const result = await operation();
      return { result, resourceHistory };
    } finally {
      clearInterval(monitor);
    }
  }
}