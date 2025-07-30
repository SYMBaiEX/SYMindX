import * as v8 from 'v8';
import * as os from 'os';
import { performance, PerformanceObserver } from 'perf_hooks';
import { EventEmitter } from 'events';

/**
 * Advanced Performance Monitoring for SYMindX
 * Tracks memory, CPU, latency, and other performance metrics
 */

export interface PerformanceMetrics {
  timestamp: number;
  memory: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
    arrayBuffers: number;
    v8: {
      totalHeapSize: number;
      totalHeapSizeExecutable: number;
      totalPhysicalSize: number;
      totalAvailableSize: number;
      usedHeapSize: number;
      heapSizeLimit: number;
      mallocedMemory: number;
      peakMallocedMemory: number;
      doesZapGarbage: boolean;
    };
  };
  cpu: {
    user: number;
    system: number;
    percent: number;
    loadAverage: number[];
  };
  eventLoop: {
    latency: number;
    utilization: number;
  };
  gc: {
    count: number;
    duration: number;
    type: string;
  }[];
  custom: Map<string, number>;
}

export interface MemoryLeakDetectionResult {
  hasLeak: boolean;
  confidence: number;
  growth: {
    rate: number; // bytes per second
    trend: 'stable' | 'growing' | 'shrinking';
    correlation: number;
  };
  snapshots: Array<{
    timestamp: number;
    heapUsed: number;
    delta: number;
  }>;
  analysis: string;
}

export interface LatencyDistribution {
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
  p999: number;
  min: number;
  max: number;
  mean: number;
  stdDev: number;
  count: number;
}

export class PerformanceMonitor extends EventEmitter {
  private metrics: PerformanceMetrics[] = [];
  private gcObserver?: PerformanceObserver;
  private customMetrics: Map<string, number[]> = new Map();
  private startTime: number;
  private cpuUsage: NodeJS.CpuUsage;
  private isMonitoring: boolean = false;
  private monitoringInterval?: NodeJS.Timer;
  private eventLoopMonitor?: NodeJS.Timer;
  private lastEventLoopCheck: number = 0;

  constructor(private options: {
    sampleInterval?: number;
    maxMetrics?: number;
    enableGCTracking?: boolean;
    enableEventLoopMonitoring?: boolean;
  } = {}) {
    super();
    this.startTime = Date.now();
    this.cpuUsage = process.cpuUsage();
    
    if (options.enableGCTracking) {
      this.setupGCTracking();
    }
    
    if (options.enableEventLoopMonitoring) {
      this.setupEventLoopMonitoring();
    }
  }

  public start(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    const interval = this.options.sampleInterval || 1000;
    
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
    }, interval);

    this.emit('monitoring:started');
  }

  public stop(): void {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    if (this.eventLoopMonitor) {
      clearInterval(this.eventLoopMonitor);
    }
    
    if (this.gcObserver) {
      this.gcObserver.disconnect();
    }

    this.emit('monitoring:stopped');
  }

  private collectMetrics(): void {
    const memoryUsage = process.memoryUsage();
    const v8HeapStats = v8.getHeapStatistics();
    const cpuUsage = process.cpuUsage(this.cpuUsage);
    const loadAverage = os.loadavg();
    
    const metrics: PerformanceMetrics = {
      timestamp: Date.now(),
      memory: {
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
        external: memoryUsage.external,
        rss: memoryUsage.rss,
        arrayBuffers: memoryUsage.arrayBuffers || 0,
        v8: {
          totalHeapSize: v8HeapStats.total_heap_size,
          totalHeapSizeExecutable: v8HeapStats.total_heap_size_executable,
          totalPhysicalSize: v8HeapStats.total_physical_size,
          totalAvailableSize: v8HeapStats.total_available_size,
          usedHeapSize: v8HeapStats.used_heap_size,
          heapSizeLimit: v8HeapStats.heap_size_limit,
          mallocedMemory: v8HeapStats.malloced_memory,
          peakMallocedMemory: v8HeapStats.peak_malloced_memory,
          doesZapGarbage: v8HeapStats.does_zap_garbage,
        },
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
        percent: this.calculateCPUPercent(cpuUsage),
        loadAverage,
      },
      eventLoop: {
        latency: this.lastEventLoopCheck,
        utilization: 0, // Will be calculated if event loop monitoring is enabled
      },
      gc: [], // Will be populated by GC observer
      custom: new Map(this.customMetrics),
    };

    this.metrics.push(metrics);
    
    // Maintain max metrics limit
    if (this.options.maxMetrics && this.metrics.length > this.options.maxMetrics) {
      this.metrics = this.metrics.slice(-this.options.maxMetrics);
    }

    this.emit('metrics:collected', metrics);
    
    // Check for anomalies
    this.checkForAnomalies(metrics);
  }

  private setupGCTracking(): void {
    this.gcObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      
      entries.forEach((entry) => {
        if (entry.entryType === 'gc') {
          const gcInfo = {
            count: 1,
            duration: entry.duration,
            type: (entry as any).kind ? this.getGCType((entry as any).kind) : 'unknown',
          };
          
          if (this.metrics.length > 0) {
            this.metrics[this.metrics.length - 1].gc.push(gcInfo);
          }
          
          this.emit('gc:detected', gcInfo);
        }
      });
    });

    this.gcObserver.observe({ entryTypes: ['gc'] });
  }

  private setupEventLoopMonitoring(): void {
    let lastCheck = process.hrtime.bigint();
    
    this.eventLoopMonitor = setInterval(() => {
      const now = process.hrtime.bigint();
      const delay = Number(now - lastCheck) / 1e6; // Convert to milliseconds
      
      // Expected delay is the interval (100ms)
      const expectedDelay = 100;
      this.lastEventLoopCheck = Math.max(0, delay - expectedDelay);
      
      lastCheck = now;
    }, 100);
  }

  private calculateCPUPercent(usage: NodeJS.CpuUsage): number {
    const totalUsage = usage.user + usage.system;
    const elapsedTime = Date.now() - this.startTime;
    
    return (totalUsage / 1000 / elapsedTime) * 100;
  }

  private getGCType(kind: number): string {
    const gcTypes: { [key: number]: string } = {
      1: 'Scavenge',
      2: 'MarkSweepCompact',
      4: 'IncrementalMarking',
      8: 'ProcessWeakCallbacks',
      15: 'All',
    };
    
    return gcTypes[kind] || `Unknown(${kind})`;
  }

  private checkForAnomalies(metrics: PerformanceMetrics): void {
    // Memory anomalies
    if (metrics.memory.heapUsed > metrics.memory.v8.heapSizeLimit * 0.9) {
      this.emit('anomaly:detected', {
        type: 'memory_pressure',
        severity: 'critical',
        value: metrics.memory.heapUsed,
        threshold: metrics.memory.v8.heapSizeLimit * 0.9,
      });
    }

    // CPU anomalies
    if (metrics.cpu.percent > 80) {
      this.emit('anomaly:detected', {
        type: 'high_cpu',
        severity: 'warning',
        value: metrics.cpu.percent,
        threshold: 80,
      });
    }

    // Event loop anomalies
    if (metrics.eventLoop.latency > 50) {
      this.emit('anomaly:detected', {
        type: 'event_loop_blocked',
        severity: 'warning',
        value: metrics.eventLoop.latency,
        threshold: 50,
      });
    }
  }

  public recordCustomMetric(name: string, value: number): void {
    if (!this.customMetrics.has(name)) {
      this.customMetrics.set(name, []);
    }
    
    const values = this.customMetrics.get(name)!;
    values.push(value);
    
    // Keep only recent values
    if (values.length > 1000) {
      values.shift();
    }
  }

  public detectMemoryLeak(
    options: {
      duration?: number;
      threshold?: number;
      samples?: number;
    } = {}
  ): MemoryLeakDetectionResult {
    const {
      duration = 60000, // 1 minute
      threshold = 0.1, // 10% growth
      samples = Math.min(this.metrics.length, 60),
    } = options;

    if (this.metrics.length < 2) {
      return {
        hasLeak: false,
        confidence: 0,
        growth: { rate: 0, trend: 'stable', correlation: 0 },
        snapshots: [],
        analysis: 'Insufficient data for analysis',
      };
    }

    // Get recent metrics
    const recentMetrics = this.metrics.slice(-samples);
    const snapshots = recentMetrics.map((m, i) => ({
      timestamp: m.timestamp,
      heapUsed: m.memory.heapUsed,
      delta: i > 0 ? m.memory.heapUsed - recentMetrics[i - 1].memory.heapUsed : 0,
    }));

    // Calculate linear regression
    const regression = this.calculateLinearRegression(
      snapshots.map(s => s.timestamp),
      snapshots.map(s => s.heapUsed)
    );

    // Determine if there's a leak
    const growthRate = regression.slope; // bytes per millisecond
    const growthPerSecond = growthRate * 1000;
    const initialHeap = snapshots[0].heapUsed;
    const finalHeap = snapshots[snapshots.length - 1].heapUsed;
    const growthPercent = (finalHeap - initialHeap) / initialHeap;

    const hasLeak = growthPercent > threshold && regression.r2 > 0.7;
    const trend = growthRate > 1000 ? 'growing' : growthRate < -1000 ? 'shrinking' : 'stable';

    return {
      hasLeak,
      confidence: regression.r2,
      growth: {
        rate: growthPerSecond,
        trend,
        correlation: regression.r2,
      },
      snapshots,
      analysis: this.generateLeakAnalysis(hasLeak, growthPercent, regression.r2, trend),
    };
  }

  private calculateLinearRegression(x: number[], y: number[]): {
    slope: number;
    intercept: number;
    r2: number;
  } {
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((total, xi, i) => total + xi * y[i], 0);
    const sumX2 = x.reduce((total, xi) => total + xi * xi, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Calculate R²
    const yMean = sumY / n;
    const ssTotal = y.reduce((total, yi) => total + Math.pow(yi - yMean, 2), 0);
    const ssResidual = y.reduce((total, yi, i) => {
      const prediction = slope * x[i] + intercept;
      return total + Math.pow(yi - prediction, 2);
    }, 0);
    
    const r2 = 1 - (ssResidual / ssTotal);
    
    return { slope, intercept, r2 };
  }

  private generateLeakAnalysis(
    hasLeak: boolean,
    growthPercent: number,
    confidence: number,
    trend: string
  ): string {
    if (!hasLeak) {
      return `Memory usage is ${trend}. No memory leak detected (${(growthPercent * 100).toFixed(1)}% change, confidence: ${(confidence * 100).toFixed(1)}%)`;
    }
    
    return `Potential memory leak detected! Memory grew by ${(growthPercent * 100).toFixed(1)}% with ${(confidence * 100).toFixed(1)}% confidence. Trend: ${trend}`;
  }

  public calculateLatencyDistribution(values: number[]): LatencyDistribution {
    if (values.length === 0) {
      return {
        p50: 0, p75: 0, p90: 0, p95: 0, p99: 0, p999: 0,
        min: 0, max: 0, mean: 0, stdDev: 0, count: 0,
      };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const count = sorted.length;
    
    const percentile = (p: number) => {
      const index = Math.ceil(count * p) - 1;
      return sorted[Math.max(0, Math.min(index, count - 1))];
    };

    const sum = sorted.reduce((a, b) => a + b, 0);
    const mean = sum / count;
    
    const variance = sorted.reduce((total, value) => {
      return total + Math.pow(value - mean, 2);
    }, 0) / count;
    
    const stdDev = Math.sqrt(variance);

    return {
      p50: percentile(0.5),
      p75: percentile(0.75),
      p90: percentile(0.9),
      p95: percentile(0.95),
      p99: percentile(0.99),
      p999: percentile(0.999),
      min: sorted[0],
      max: sorted[count - 1],
      mean,
      stdDev,
      count,
    };
  }

  public getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  public getLatestMetrics(): PerformanceMetrics | undefined {
    return this.metrics[this.metrics.length - 1];
  }

  public reset(): void {
    this.metrics = [];
    this.customMetrics.clear();
    this.startTime = Date.now();
    this.cpuUsage = process.cpuUsage();
  }

  public generateReport(): {
    summary: {
      duration: number;
      samples: number;
      memory: {
        initial: number;
        final: number;
        peak: number;
        average: number;
      };
      cpu: {
        average: number;
        peak: number;
      };
      gc: {
        totalCount: number;
        totalDuration: number;
        averageDuration: number;
      };
    };
    memoryLeak: MemoryLeakDetectionResult;
    latencies: Map<string, LatencyDistribution>;
  } {
    if (this.metrics.length === 0) {
      throw new Error('No metrics collected');
    }

    const first = this.metrics[0];
    const last = this.metrics[this.metrics.length - 1];
    
    const memoryValues = this.metrics.map(m => m.memory.heapUsed);
    const cpuValues = this.metrics.map(m => m.cpu.percent);
    
    const gcStats = this.metrics.reduce(
      (acc, m) => {
        acc.count += m.gc.length;
        acc.duration += m.gc.reduce((sum, gc) => sum + gc.duration, 0);
        return acc;
      },
      { count: 0, duration: 0 }
    );

    const latencies = new Map<string, LatencyDistribution>();
    
    for (const [name, values] of this.customMetrics) {
      latencies.set(name, this.calculateLatencyDistribution(values));
    }

    return {
      summary: {
        duration: last.timestamp - first.timestamp,
        samples: this.metrics.length,
        memory: {
          initial: first.memory.heapUsed,
          final: last.memory.heapUsed,
          peak: Math.max(...memoryValues),
          average: memoryValues.reduce((a, b) => a + b, 0) / memoryValues.length,
        },
        cpu: {
          average: cpuValues.reduce((a, b) => a + b, 0) / cpuValues.length,
          peak: Math.max(...cpuValues),
        },
        gc: {
          totalCount: gcStats.count,
          totalDuration: gcStats.duration,
          averageDuration: gcStats.count > 0 ? gcStats.duration / gcStats.count : 0,
        },
      },
      memoryLeak: this.detectMemoryLeak(),
      latencies,
    };
  }
}

// Performance testing utilities
export class PerformanceBenchmark {
  private monitor: PerformanceMonitor;

  constructor() {
    this.monitor = new PerformanceMonitor({
      sampleInterval: 100,
      enableGCTracking: true,
      enableEventLoopMonitoring: true,
    });
  }

  public async benchmark<T>(
    name: string,
    fn: () => Promise<T>,
    options: {
      iterations?: number;
      warmup?: number;
      concurrent?: boolean;
    } = {}
  ): Promise<{
    name: string;
    iterations: number;
    duration: number;
    latency: LatencyDistribution;
    memory: {
      before: number;
      after: number;
      peak: number;
    };
    result: T;
  }> {
    const { iterations = 100, warmup = 10, concurrent = false } = options;
    
    // Warmup
    for (let i = 0; i < warmup; i++) {
      await fn();
    }

    // Force GC before benchmark
    if (global.gc) {
      global.gc();
    }

    const memoryBefore = process.memoryUsage().heapUsed;
    this.monitor.start();
    
    const latencies: number[] = [];
    let result: T;
    
    const startTime = performance.now();
    
    if (concurrent) {
      const promises: Promise<T>[] = [];
      for (let i = 0; i < iterations; i++) {
        const iterStart = performance.now();
        promises.push(
          fn().then((res) => {
            latencies.push(performance.now() - iterStart);
            return res;
          })
        );
      }
      const results = await Promise.all(promises);
      result = results[results.length - 1];
    } else {
      for (let i = 0; i < iterations; i++) {
        const iterStart = performance.now();
        result = await fn();
        latencies.push(performance.now() - iterStart);
      }
    }
    
    const duration = performance.now() - startTime;
    this.monitor.stop();
    
    const memoryAfter = process.memoryUsage().heapUsed;
    const metrics = this.monitor.getMetrics();
    const peakMemory = Math.max(...metrics.map(m => m.memory.heapUsed));
    
    latencies.forEach((latency, i) => {
      this.monitor.recordCustomMetric(`${name}_latency`, latency);
    });

    return {
      name,
      iterations,
      duration,
      latency: this.monitor.calculateLatencyDistribution(latencies),
      memory: {
        before: memoryBefore,
        after: memoryAfter,
        peak: peakMemory,
      },
      result: result!,
    };
  }

  public async stress(
    name: string,
    fn: () => Promise<void>,
    options: {
      duration: number;
      concurrency: number;
      rampUp?: number;
    }
  ): Promise<{
    name: string;
    duration: number;
    totalOperations: number;
    throughput: number;
    errors: number;
    report: any;
  }> {
    const { duration, concurrency, rampUp = 0 } = options;
    
    this.monitor.start();
    
    let totalOperations = 0;
    let errors = 0;
    let running = true;
    
    const startTime = Date.now();
    const workers: Promise<void>[] = [];
    
    // Ramp up workers
    for (let i = 0; i < concurrency; i++) {
      if (rampUp > 0) {
        await new Promise(resolve => setTimeout(resolve, (rampUp * 1000) / concurrency));
      }
      
      workers.push(
        (async () => {
          while (running) {
            try {
              const opStart = performance.now();
              await fn();
              const opDuration = performance.now() - opStart;
              
              this.monitor.recordCustomMetric(`${name}_operation`, opDuration);
              totalOperations++;
            } catch (error) {
              errors++;
              this.monitor.recordCustomMetric(`${name}_error`, 1);
            }
          }
        })()
      );
    }

    // Run for specified duration
    await new Promise(resolve => setTimeout(resolve, duration));
    running = false;
    
    // Wait for all workers to finish
    await Promise.all(workers);
    
    this.monitor.stop();
    
    const actualDuration = Date.now() - startTime;
    const throughput = (totalOperations / actualDuration) * 1000;
    
    return {
      name,
      duration: actualDuration,
      totalOperations,
      throughput,
      errors,
      report: this.monitor.generateReport(),
    };
  }
}