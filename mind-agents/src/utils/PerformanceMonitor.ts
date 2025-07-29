/**
 * Performance Monitoring System
 * Comprehensive performance tracking with metrics collection and alerting
 */

import { EventEmitter } from 'node:events';
import { runtimeLogger } from './logger';

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  tags?: Record<string, string>;
}

interface PerformanceAlert {
  metric: string;
  threshold: number;
  currentValue: number;
  severity: 'warning' | 'critical';
  timestamp: number;
}

interface MetricThreshold {
  warning: number;
  critical: number;
  comparison: 'gt' | 'lt' | 'eq';
}

interface PerformanceStats {
  min: number;
  max: number;
  avg: number;
  count: number;
  sum: number;
  p50: number;
  p95: number;
  p99: number;
}

export class PerformanceMonitor extends EventEmitter {
  private metrics = new Map<string, PerformanceMetric[]>();
  private thresholds = new Map<string, MetricThreshold>();
  private alerts: PerformanceAlert[] = [];
  private maxMetricsPerType = 1000;
  private cleanupInterval?: NodeJS.Timer;
  private isStarted = false;

  constructor(options?: {
    maxMetricsPerType?: number;
    cleanupIntervalMs?: number;
  }) {
    super();
    
    if (options?.maxMetricsPerType) {
      this.maxMetricsPerType = options.maxMetricsPerType;
    }
    
    // Start cleanup timer
    if (options?.cleanupIntervalMs) {
      this.cleanupInterval = setInterval(
        () => this.cleanupOldMetrics(),
        options.cleanupIntervalMs
      );
    }
  }

  /**
   * Start monitoring system
   */
  start(): void {
    if (this.isStarted) return;
    
    this.isStarted = true;
    
    // Monitor Node.js process metrics
    this.startNodeMetrics();
    
    // Monitor memory usage
    this.startMemoryMonitoring();
    
    // Monitor event loop lag
    this.startEventLoopMonitoring();
    
    runtimeLogger.info('Performance monitoring started');
    this.emit('started');
  }

  /**
   * Stop monitoring system
   */
  stop(): void {
    if (!this.isStarted) return;
    
    this.isStarted = false;
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
    
    runtimeLogger.info('Performance monitoring stopped');
    this.emit('stopped');
  }

  /**
   * Record a performance metric
   */
  recordMetric(
    name: string, 
    value: number, 
    unit = 'count',
    tags?: Record<string, string>
  ): void {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: Date.now(),
      tags
    };

    // Store metric
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    const metricArray = this.metrics.get(name)!;
    metricArray.push(metric);
    
    // Trim to max size
    if (metricArray.length > this.maxMetricsPerType) {
      metricArray.splice(0, metricArray.length - this.maxMetricsPerType);
    }

    // Check thresholds
    this.checkThreshold(name, value);

    this.emit('metric', metric);
  }

  /**
   * Time a function execution
   */
  async time<T>(
    name: string,
    fn: () => Promise<T>,
    tags?: Record<string, string>
  ): Promise<T> {
    const startTime = performance.now();
    const startMemory = process.memoryUsage().heapUsed;
    
    try {
      const result = await fn();
      const duration = performance.now() - startTime;
      const memoryDelta = process.memoryUsage().heapUsed - startMemory;
      
      this.recordMetric(`${name}.duration`, duration, 'ms', tags);
      this.recordMetric(`${name}.memory_delta`, memoryDelta, 'bytes', tags);
      this.recordMetric(`${name}.success`, 1, 'count', tags);
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.recordMetric(`${name}.duration`, duration, 'ms', tags);
      this.recordMetric(`${name}.error`, 1, 'count', tags);
      throw error;
    }
  }

  /**
   * Create a timer for manual timing
   */
  createTimer(name: string, tags?: Record<string, string>): {
    end: () => number;
    endWithMemory: () => { duration: number; memoryDelta: number };
  } {
    const startTime = performance.now();
    const startMemory = process.memoryUsage().heapUsed;
    
    return {
      end: () => {
        const duration = performance.now() - startTime;
        this.recordMetric(`${name}.duration`, duration, 'ms', tags);
        return duration;
      },
      endWithMemory: () => {
        const duration = performance.now() - startTime;
        const memoryDelta = process.memoryUsage().heapUsed - startMemory;
        
        this.recordMetric(`${name}.duration`, duration, 'ms', tags);
        this.recordMetric(`${name}.memory_delta`, memoryDelta, 'bytes', tags);
        
        return { duration, memoryDelta };
      }
    };
  }

  /**
   * Set threshold for a metric
   */
  setThreshold(
    metricName: string,
    warning: number,
    critical: number,
    comparison: 'gt' | 'lt' | 'eq' = 'gt'
  ): void {
    this.thresholds.set(metricName, {
      warning,
      critical,
      comparison
    });
  }

  /**
   * Get statistics for a metric
   */
  getStats(metricName: string): PerformanceStats | null {
    const metrics = this.metrics.get(metricName);
    if (!metrics || metrics.length === 0) {
      return null;
    }

    const values = metrics.map(m => m.value).sort((a, b) => a - b);
    const count = values.length;
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / count;

    return {
      min: values[0],
      max: values[count - 1],
      avg,
      count,
      sum,
      p50: this.percentile(values, 0.5),
      p95: this.percentile(values, 0.95),
      p99: this.percentile(values, 0.99)
    };
  }

  /**
   * Get all metrics for a name
   */
  getMetrics(metricName: string): PerformanceMetric[] {
    return this.metrics.get(metricName) || [];
  }

  /**
   * Get all metric names
   */
  getMetricNames(): string[] {
    return Array.from(this.metrics.keys());
  }

  /**
   * Get recent alerts
   */
  getAlerts(limit = 100): PerformanceAlert[] {
    return this.alerts
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics.clear();
    this.alerts = [];
    this.emit('cleared');
  }

  /**
   * Get comprehensive performance report
   */
  getReport(): {
    summary: {
      totalMetrics: number;
      metricTypes: number;
      alertCount: number;
      uptime: number;
    };
    topMetrics: Array<{
      name: string;
      stats: PerformanceStats;
    }>;
    recentAlerts: PerformanceAlert[];
    systemMetrics: {
      memory: NodeJS.MemoryUsage;
      cpu: NodeJS.CpuUsage;
    };
  } {
    const topMetrics = this.getMetricNames()
      .map(name => ({
        name,
        stats: this.getStats(name)!
      }))
      .filter(item => item.stats)
      .sort((a, b) => b.stats.count - a.stats.count)
      .slice(0, 10);

    return {
      summary: {
        totalMetrics: Array.from(this.metrics.values())
          .reduce((sum, metrics) => sum + metrics.length, 0),
        metricTypes: this.metrics.size,
        alertCount: this.alerts.length,
        uptime: process.uptime()
      },
      topMetrics,
      recentAlerts: this.getAlerts(10),
      systemMetrics: {
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
      }
    };
  }

  // Private helper methods

  private checkThreshold(metricName: string, value: number): void {
    const threshold = this.thresholds.get(metricName);
    if (!threshold) return;

    const exceedsThreshold = (val: number, limit: number): boolean => {
      switch (threshold.comparison) {
        case 'gt': return val > limit;
        case 'lt': return val < limit;
        case 'eq': return val === limit;
        default: return false;
      }
    };

    let severity: 'warning' | 'critical' | null = null;
    if (exceedsThreshold(value, threshold.critical)) {
      severity = 'critical';
    } else if (exceedsThreshold(value, threshold.warning)) {
      severity = 'warning';
    }

    if (severity) {
      const alert: PerformanceAlert = {
        metric: metricName,
        threshold: severity === 'critical' ? threshold.critical : threshold.warning,
        currentValue: value,
        severity,
        timestamp: Date.now()
      };

      this.alerts.push(alert);
      
      // Trim alerts
      if (this.alerts.length > 1000) {
        this.alerts = this.alerts.slice(-500);
      }

      this.emit('alert', alert);
      
      runtimeLogger.warn(`Performance alert: ${metricName}`, {
        severity,
        value,
        threshold: alert.threshold
      });
    }
  }

  private percentile(values: number[], p: number): number {
    const index = p * (values.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;
    
    if (upper >= values.length) return values[values.length - 1];
    
    return values[lower] * (1 - weight) + values[upper] * weight;
  }

  private cleanupOldMetrics(): void {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24 hours
    
    for (const [name, metrics] of this.metrics) {
      const filtered = metrics.filter(m => m.timestamp > cutoff);
      if (filtered.length !== metrics.length) {
        this.metrics.set(name, filtered);
      }
    }

    // Clean old alerts
    this.alerts = this.alerts.filter(a => a.timestamp > cutoff);
  }

  private startNodeMetrics(): void {
    const recordNodeMetrics = () => {
      if (!this.isStarted) return;
      
      const memory = process.memoryUsage();
      const cpu = process.cpuUsage();
      
      // Memory metrics
      this.recordMetric('node.memory.heap_used', memory.heapUsed, 'bytes');
      this.recordMetric('node.memory.heap_total', memory.heapTotal, 'bytes');
      this.recordMetric('node.memory.external', memory.external, 'bytes');
      this.recordMetric('node.memory.rss', memory.rss, 'bytes');
      
      // CPU metrics
      this.recordMetric('node.cpu.user', cpu.user, 'microseconds');
      this.recordMetric('node.cpu.system', cpu.system, 'microseconds');
      
      // Process metrics
      this.recordMetric('node.uptime', process.uptime(), 'seconds');
      
      setTimeout(recordNodeMetrics, 5000); // Every 5 seconds
    };
    
    recordNodeMetrics();
  }

  private startMemoryMonitoring(): void {
    // Set default memory thresholds
    this.setThreshold('node.memory.heap_used', 100 * 1024 * 1024, 200 * 1024 * 1024); // 100MB warning, 200MB critical
    this.setThreshold('node.memory.rss', 200 * 1024 * 1024, 500 * 1024 * 1024); // 200MB warning, 500MB critical
  }

  private startEventLoopMonitoring(): void {
    const measureEventLoopLag = () => {
      if (!this.isStarted) return;
      
      const start = process.hrtime.bigint();
      setImmediate(() => {
        const lag = Number(process.hrtime.bigint() - start) / 1e6; // Convert to milliseconds
        this.recordMetric('node.event_loop.lag', lag, 'ms');
      });
      
      setTimeout(measureEventLoopLag, 1000); // Every second
    };
    
    measureEventLoopLag();
    
    // Set event loop lag thresholds
    this.setThreshold('node.event_loop.lag', 10, 50); // 10ms warning, 50ms critical
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor({
  maxMetricsPerType: 1000,
  cleanupIntervalMs: 5 * 60 * 1000 // 5 minutes
});

// Auto-start if not in test environment
if (process.env.NODE_ENV !== 'test') {
  performanceMonitor.start();
}