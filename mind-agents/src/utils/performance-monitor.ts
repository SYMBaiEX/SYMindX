/**
 * @module performance-monitor
 * @description Comprehensive performance monitoring and metrics collection system for SYMindX
 */

import { performance, PerformanceObserver, PerformanceEntry } from 'perf_hooks';
import { EventEmitter } from 'events';
import { runtimeLogger } from './logger.js';
import type { LogContext, Timestamp } from '../types/index.js';

/**
 * Performance metric types
 */
export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  TIMER = 'timer',
  RATE = 'rate',
}

/**
 * Metric data point
 */
export interface MetricDataPoint {
  readonly timestamp: Date;
  readonly value: number;
  readonly labels?: Record<string, string> | undefined;
  readonly metadata?: Record<string, unknown> | undefined;
}

/**
 * Performance metric interface
 */
export interface PerformanceMetric {
  readonly name: string;
  readonly type: MetricType;
  readonly description: string;
  readonly unit: string;
  readonly data: MetricDataPoint[];
  readonly currentValue: number;
  readonly lastUpdated: Date;
}

/**
 * System resource metrics
 */
export interface SystemMetrics {
  readonly cpu: {
    usage: number;
    user: number;
    system: number;
    idle: number;
    loadAverage: number[];
  };
  readonly memory: {
    heapUsed: number;
    heapTotal: number;
    rss: number;
    external: number;
    arrayBuffers: number;
    usage: number;
  };
  readonly uptime: number;
  readonly eventLoopDelay: number;
  readonly timestamp: Date;
}

/**
 * Agent performance metrics
 */
export interface AgentMetrics {
  readonly agentId: string;
  readonly agentName: string;
  readonly thinkTime: {
    average: number;
    min: number;
    max: number;
    p95: number;
    p99: number;
  };
  readonly responseTime: {
    average: number;
    min: number;
    max: number;
    p95: number;
    p99: number;
  };
  readonly actionCount: number;
  readonly errorCount: number;
  readonly memoryUsage: number;
  readonly emotionChanges: number;
  readonly timestamp: Date;
}

/**
 * Performance alert configuration
 */
export interface AlertConfig {
  readonly threshold: number;
  readonly comparison: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  readonly duration: number; // ms
  readonly enabled: boolean;
}

/**
 * Performance alert
 */
export interface PerformanceAlert {
  readonly id: string;
  readonly metricName: string;
  readonly message: string;
  readonly severity: 'info' | 'warning' | 'error' | 'critical';
  readonly value: number;
  readonly threshold: number;
  readonly timestamp: Date;
  readonly acknowledged: boolean;
}

/**
 * Timer for measuring execution time
 */
export class Timer {
  private startTime: number;
  private endTime?: number;
  private marks: Map<string, number> = new Map();

  constructor(
    private readonly name: string,
    private readonly monitor: PerformanceMonitor
  ) {
    this.startTime = performance.now();
  }

  /**
   * Add a performance mark
   */
  public mark(name: string): void {
    this.marks.set(name, performance.now());
  }

  /**
   * Get duration since start or between marks
   */
  public getDuration(fromMark?: string, toMark?: string): number {
    const startTime = fromMark ? this.marks.get(fromMark) ?? this.startTime : this.startTime;
    const endTime = toMark ? this.marks.get(toMark) ?? performance.now() : performance.now();
    return endTime - startTime;
  }

  /**
   * Stop timer and record metric
   */
  public stop(labels?: Record<string, string>): number {
    this.endTime = performance.now();
    const duration = this.endTime - this.startTime;
    
    this.monitor.recordTimer(this.name, duration, labels);
    
    return duration;
  }

  /**
   * Get all marks
   */
  public getMarks(): Record<string, number> {
    return Object.fromEntries(this.marks);
  }
}

/**
 * Histogram for tracking value distributions
 */
export class Histogram {
  private values: number[] = [];
  private buckets: Map<number, number> = new Map();

  constructor(
    private readonly bucketBounds: number[] = [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000]
  ) {
    // Initialize buckets
    this.bucketBounds.forEach(bound => this.buckets.set(bound, 0));
    this.buckets.set(Infinity, 0);
  }

  /**
   * Record a value
   */
  public record(value: number): void {
    this.values.push(value);
    
    // Update buckets
    for (const bound of this.bucketBounds) {
      if (value <= bound) {
        this.buckets.set(bound, (this.buckets.get(bound) || 0) + 1);
        break;
      }
    }
    
    // If value exceeds all bounds, add to infinity bucket
    if (value > Math.max(...this.bucketBounds)) {
      this.buckets.set(Infinity, (this.buckets.get(Infinity) || 0) + 1);
    }
    
    // Keep only recent values (last 1000)
    if (this.values.length > 1000) {
      this.values = this.values.slice(-1000);
    }
  }

  /**
   * Get percentile value
   */
  public getPercentile(percentile: number): number {
    if (this.values.length === 0) return 0;
    
    const sorted = [...this.values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)] || 0;
  }

  /**
   * Get statistical summary
   */
  public getSummary(): {
    count: number;
    sum: number;
    average: number;
    min: number;
    max: number;
    p50: number;
    p95: number;
    p99: number;
    buckets: Record<string, number>;
  } {
    const count = this.values.length;
    const sum = this.values.reduce((a, b) => a + b, 0);
    const average = count > 0 ? sum / count : 0;
    const min = count > 0 ? Math.min(...this.values) : 0;
    const max = count > 0 ? Math.max(...this.values) : 0;

    return {
      count,
      sum,
      average,
      min,
      max,
      p50: this.getPercentile(50),
      p95: this.getPercentile(95),
      p99: this.getPercentile(99),
      buckets: Object.fromEntries(
        Array.from(this.buckets.entries()).map(([k, v]) => [
          k === Infinity ? '+Inf' : k.toString(),
          v
        ])
      ),
    };
  }

  /**
   * Reset histogram
   */
  public reset(): void {
    this.values = [];
    this.buckets.clear();
    this.bucketBounds.forEach(bound => this.buckets.set(bound, 0));
    this.buckets.set(Infinity, 0);
  }
}

/**
 * Rate tracker for measuring events per time period
 */
export class RateTracker {
  private events: Date[] = [];
  private readonly windowMs: number;

  constructor(windowMs: number = 60000) { // Default 1 minute window
    this.windowMs = windowMs;
  }

  /**
   * Record an event
   */
  public record(): void {
    this.events.push(new Date());
    this.cleanup();
  }

  /**
   * Get current rate (events per second)
   */
  public getRate(): number {
    this.cleanup();
    return (this.events.length / this.windowMs) * 1000;
  }

  /**
   * Get event count in window
   */
  public getCount(): number {
    this.cleanup();
    return this.events.length;
  }

  /**
   * Reset rate tracker
   */
  public reset(): void {
    this.events = [];
  }

  /**
   * Remove events outside the window
   */
  private cleanup(): void {
    const cutoff = new Date(Date.now() - this.windowMs);
    this.events = this.events.filter(event => event > cutoff);
  }
}

/**
 * Comprehensive performance monitoring system
 */
export class PerformanceMonitor extends EventEmitter {
  private static instance: PerformanceMonitor;
  
  private readonly metrics = new Map<string, PerformanceMetric>();
  private readonly histograms = new Map<string, Histogram>();
  private readonly rateTrackers = new Map<string, RateTracker>();
  private readonly alerts = new Map<string, AlertConfig>();
  private readonly activeAlerts = new Map<string, PerformanceAlert>();
  
  private systemMetricsInterval?: NodeJS.Timeout;
  private alertCheckInterval?: NodeJS.Timeout;
  private performanceObserver?: PerformanceObserver;
  
  private readonly config = {
    systemMetricsInterval: 5000, // 5 seconds
    alertCheckInterval: 1000, // 1 second
    maxDataPoints: 1000,
    enableNodeMetrics: true,
    enableCustomMetrics: true,
  };

  private constructor() {
    super();
    this.initializeSystemMetrics();
    this.setupPerformanceObserver();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Start monitoring
   */
  public start(): void {
    if (this.config.enableNodeMetrics) {
      this.startSystemMetrics();
    }
    
    this.startAlertChecking();
    
    runtimeLogger.info('Performance monitoring started', {
      metadata: {
        systemMetricsInterval: this.config.systemMetricsInterval,
        alertCheckInterval: this.config.alertCheckInterval,
      },
    } as LogContext);
  }

  /**
   * Stop monitoring
   */
  public stop(): void {
    if (this.systemMetricsInterval) {
      clearInterval(this.systemMetricsInterval);
      this.systemMetricsInterval = undefined;
    }
    
    if (this.alertCheckInterval) {
      clearInterval(this.alertCheckInterval);
      this.alertCheckInterval = undefined;
    }
    
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
      this.performanceObserver = undefined;
    }
    
    runtimeLogger.info('Performance monitoring stopped');
  }

  /**
   * Create a timer for measuring execution time
   */
  public createTimer(name: string): Timer {
    return new Timer(name, this);
  }

  /**
   * Record a counter metric
   */
  public recordCounter(
    name: string, 
    value: number = 1, 
    labels?: Record<string, string>
  ): void {
    const metric = this.getOrCreateMetric(name, MetricType.COUNTER, 'Counter metric', 'count');
    const dataPoint: MetricDataPoint = {
      timestamp: new Date(),
      value,
      labels: labels || undefined,
    };
    
    metric.data.push(dataPoint);
    (metric as any).currentValue += value;
    (metric as any).lastUpdated = dataPoint.timestamp;
    
    this.trimMetricData(metric);
    this.emit('metricUpdated', { name, type: MetricType.COUNTER, value });
  }

  /**
   * Record a gauge metric
   */
  public recordGauge(
    name: string, 
    value: number, 
    labels?: Record<string, string>
  ): void {
    const metric = this.getOrCreateMetric(name, MetricType.GAUGE, 'Gauge metric', 'value');
    const dataPoint: MetricDataPoint = {
      timestamp: new Date(),
      value,
      labels: labels || undefined,
    };
    
    metric.data.push(dataPoint);
    (metric as any).currentValue = value;
    (metric as any).lastUpdated = dataPoint.timestamp;
    
    this.trimMetricData(metric);
    this.emit('metricUpdated', { name, type: MetricType.GAUGE, value });
  }

  /**
   * Record a histogram metric
   */
  public recordHistogram(
    name: string, 
    value: number, 
    labels?: Record<string, string>
  ): void {
    const histogram = this.getOrCreateHistogram(name);
    histogram.record(value);
    
    const metric = this.getOrCreateMetric(name, MetricType.HISTOGRAM, 'Histogram metric', 'value');
    const dataPoint: MetricDataPoint = {
      timestamp: new Date(),
      value,
      labels: labels || undefined,
      metadata: histogram.getSummary(),
    };
    
    metric.data.push(dataPoint);
    (metric as any).currentValue = histogram.getSummary().average;
    (metric as any).lastUpdated = dataPoint.timestamp;
    
    this.trimMetricData(metric);
    this.emit('metricUpdated', { name, type: MetricType.HISTOGRAM, value });
  }

  /**
   * Record a timer metric
   */
  public recordTimer(
    name: string, 
    durationMs: number, 
    labels?: Record<string, string>
  ): void {
    this.recordHistogram(`${name}_duration`, durationMs, labels);
    this.recordCounter(`${name}_total`, 1, labels);
  }

  /**
   * Record a rate metric
   */
  public recordRate(name: string, labels?: Record<string, string>): void {
    const tracker = this.getOrCreateRateTracker(name);
    tracker.record();
    
    const metric = this.getOrCreateMetric(name, MetricType.RATE, 'Rate metric', 'events/sec');
    const dataPoint: MetricDataPoint = {
      timestamp: new Date(),
      value: tracker.getRate(),
      labels: labels || undefined,
      metadata: { count: tracker.getCount() },
    };
    
    metric.data.push(dataPoint);
    (metric as any).currentValue = tracker.getRate();
    (metric as any).lastUpdated = dataPoint.timestamp;
    
    this.trimMetricData(metric);
    this.emit('metricUpdated', { name, type: MetricType.RATE, value: tracker.getRate() });
  }

  /**
   * Get current system metrics
   */
  public getSystemMetrics(): SystemMetrics {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      cpu: {
        usage: 0, // Would need additional calculation for actual CPU usage
        user: cpuUsage.user / 1000000, // Convert microseconds to seconds
        system: cpuUsage.system / 1000000,
        idle: 0,
        loadAverage: process.platform !== 'win32' ? require('os').loadavg() : [0, 0, 0],
      },
      memory: {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        rss: memUsage.rss,
        external: memUsage.external,
        arrayBuffers: memUsage.arrayBuffers,
        usage: memUsage.heapUsed / memUsage.heapTotal,
      },
      uptime: process.uptime(),
      eventLoopDelay: 0, // Would need additional measurement
      timestamp: new Date(),
    };
  }

  /**
   * Get agent metrics
   */
  public getAgentMetrics(agentId: string): AgentMetrics | undefined {
    const thinkTimeMetric = this.metrics.get(`agent_${agentId}_think_time`);
    const responseTimeMetric = this.metrics.get(`agent_${agentId}_response_time`);
    const actionCountMetric = this.metrics.get(`agent_${agentId}_actions`);
    const errorCountMetric = this.metrics.get(`agent_${agentId}_errors`);
    
    if (!thinkTimeMetric && !responseTimeMetric) {
      return undefined;
    }
    
    const thinkTimeHistogram = this.histograms.get(`agent_${agentId}_think_time`);
    const responseTimeHistogram = this.histograms.get(`agent_${agentId}_response_time`);
    
    return {
      agentId,
      agentName: agentId, // Would get actual name from agent registry
      thinkTime: thinkTimeHistogram ? {
        average: thinkTimeHistogram.getSummary().average,
        min: thinkTimeHistogram.getSummary().min,
        max: thinkTimeHistogram.getSummary().max,
        p95: thinkTimeHistogram.getSummary().p95,
        p99: thinkTimeHistogram.getSummary().p99,
      } : { average: 0, min: 0, max: 0, p95: 0, p99: 0 },
      responseTime: responseTimeHistogram ? {
        average: responseTimeHistogram.getSummary().average,
        min: responseTimeHistogram.getSummary().min,
        max: responseTimeHistogram.getSummary().max,
        p95: responseTimeHistogram.getSummary().p95,
        p99: responseTimeHistogram.getSummary().p99,
      } : { average: 0, min: 0, max: 0, p95: 0, p99: 0 },
      actionCount: actionCountMetric?.currentValue || 0,
      errorCount: errorCountMetric?.currentValue || 0,
      memoryUsage: 0, // Would calculate agent-specific memory usage
      emotionChanges: 0, // Would track emotion state changes
      timestamp: new Date(),
    };
  }

  /**
   * Get all metrics
   */
  public getAllMetrics(): PerformanceMetric[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Get metric by name
   */
  public getMetric(name: string): PerformanceMetric | undefined {
    return this.metrics.get(name);
  }

  /**
   * Configure alert
   */
  public configureAlert(
    metricName: string,
    config: AlertConfig
  ): void {
    this.alerts.set(metricName, config);
  }

  /**
   * Get active alerts
   */
  public getActiveAlerts(): PerformanceAlert[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Acknowledge alert
   */
  public acknowledgeAlert(alertId: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      (alert as any).acknowledged = true;
      return true;
    }
    return false;
  }

  /**
   * Clear all metrics
   */
  public clearMetrics(): void {
    this.metrics.clear();
    this.histograms.clear();
    this.rateTrackers.clear();
    this.activeAlerts.clear();
  }

  /**
   * Export metrics in Prometheus format
   */
  public exportPrometheusMetrics(): string {
    const lines: string[] = [];
    
    for (const metric of this.metrics.values()) {
      // Add metric help and type
      lines.push(`# HELP ${metric.name} ${metric.description}`);
      lines.push(`# TYPE ${metric.name} ${metric.type}`);
      
      // Add metric value
      if (metric.data.length > 0) {
        const latest = metric.data[metric.data.length - 1];
        if (latest) {
          const labelsStr = latest.labels 
            ? '{' + Object.entries(latest.labels).map(([k, v]) => `${k}="${v}"`).join(',') + '}'
            : '';
          lines.push(`${metric.name}${labelsStr} ${latest.value}`);
        }
      }
    }
    
    return lines.join('\n') + '\n';
  }

  /**
   * Measure execution time of a function
   */
  public async measure<T>(
    name: string,
    fn: () => Promise<T> | T,
    labels?: Record<string, string>
  ): Promise<T> {
    const timer = this.createTimer(name);
    try {
      const result = await fn();
      timer.stop(labels);
      return result;
    } catch (error) {
      timer.stop({ ...labels, error: 'true' });
      throw error;
    }
  }

  /**
   * Create decorator for automatic performance measurement
   */
  public createMeasureDecorator(metricName?: string) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
      const originalMethod = descriptor.value;
      const name = metricName || `${target.constructor.name}_${propertyKey}`;
      
      descriptor.value = async function (...args: any[]) {
        const monitor = PerformanceMonitor.getInstance();
        return monitor.measure(name, () => originalMethod.apply(this, args));
      };
      
      return descriptor;
    };
  }

  /**
   * Initialize system metrics collection
   */
  private initializeSystemMetrics(): void {
    if (!this.config.enableNodeMetrics) return;
    
    // Initialize basic system metrics
    this.getOrCreateMetric('system_uptime', MetricType.GAUGE, 'System uptime', 'seconds');
    this.getOrCreateMetric('system_memory_usage', MetricType.GAUGE, 'Memory usage', 'bytes');
    this.getOrCreateMetric('system_cpu_usage', MetricType.GAUGE, 'CPU usage', 'percent');
  }

  /**
   * Start system metrics collection
   */
  private startSystemMetrics(): void {
    this.systemMetricsInterval = setInterval(() => {
      const metrics = this.getSystemMetrics();
      
      this.recordGauge('system_uptime', metrics.uptime);
      this.recordGauge('system_memory_usage', metrics.memory.heapUsed);
      this.recordGauge('system_memory_usage_percent', metrics.memory.usage * 100);
      this.recordGauge('system_rss', metrics.memory.rss);
      this.recordGauge('system_external', metrics.memory.external);
      
      // CPU metrics
      this.recordGauge('system_cpu_user', metrics.cpu.user);
      this.recordGauge('system_cpu_system', metrics.cpu.system);
      
      // Load average (Unix only)
      if (metrics.cpu.loadAverage.length > 0) {
        this.recordGauge('system_load_1m', metrics.cpu.loadAverage[0] || 0);
        this.recordGauge('system_load_5m', metrics.cpu.loadAverage[1] || 0);
        this.recordGauge('system_load_15m', metrics.cpu.loadAverage[2] || 0);
      }
      
    }, this.config.systemMetricsInterval);
  }

  /**
   * Setup performance observer for Node.js performance entries
   */
  private setupPerformanceObserver(): void {
    if (typeof PerformanceObserver === 'undefined') return;
    
    this.performanceObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.recordHistogram(`node_${entry.entryType}`, entry.duration, {
          name: entry.name,
        });
      }
    });
    
    this.performanceObserver.observe({ entryTypes: ['measure', 'function', 'http', 'net'] });
  }

  /**
   * Start alert checking
   */
  private startAlertChecking(): void {
    this.alertCheckInterval = setInterval(() => {
      this.checkAlerts();
    }, this.config.alertCheckInterval);
  }

  /**
   * Check for alert conditions
   */
  private checkAlerts(): void {
    for (const [metricName, alertConfig] of this.alerts) {
      if (!alertConfig.enabled) continue;
      
      const metric = this.metrics.get(metricName);
      if (!metric || metric.data.length === 0) continue;
      
      const currentValue = metric.currentValue;
      const shouldAlert = this.evaluateAlertCondition(currentValue, alertConfig);
      
      if (shouldAlert) {
        const alertId = `${metricName}_${Date.now()}`;
        const alert: PerformanceAlert = {
          id: alertId,
          metricName,
          message: `Metric ${metricName} ${alertConfig.comparison} ${alertConfig.threshold}`,
          severity: this.determineSeverity(metricName, currentValue, alertConfig.threshold),
          value: currentValue,
          threshold: alertConfig.threshold,
          timestamp: new Date(),
          acknowledged: false,
        };
        
        this.activeAlerts.set(alertId, alert);
        this.emit('alert', alert);
        
        runtimeLogger.warn(`Performance alert: ${alert.message}`, {
          metadata: {
            metricName,
            value: currentValue,
            threshold: alertConfig.threshold,
            severity: alert.severity,
          },
        } as LogContext);
      }
    }
  }

  /**
   * Evaluate alert condition
   */
  private evaluateAlertCondition(value: number, config: AlertConfig): boolean {
    switch (config.comparison) {
      case 'gt': return value > config.threshold;
      case 'gte': return value >= config.threshold;
      case 'lt': return value < config.threshold;
      case 'lte': return value <= config.threshold;
      case 'eq': return value === config.threshold;
      default: return false;
    }
  }

  /**
   * Determine alert severity
   */
  private determineSeverity(
    _metricName: string, 
    value: number, 
    threshold: number
  ): 'info' | 'warning' | 'error' | 'critical' {
    const ratio = Math.abs(value - threshold) / threshold;
    
    if (ratio > 2) return 'critical';
    if (ratio > 1) return 'error';
    if (ratio > 0.5) return 'warning';
    return 'info';
  }

  /**
   * Get or create metric
   */
  private getOrCreateMetric(
    name: string,
    type: MetricType,
    description: string,
    unit: string
  ): PerformanceMetric {
    if (!this.metrics.has(name)) {
      const metric: PerformanceMetric = {
        name,
        type,
        description,
        unit,
        data: [],
        currentValue: 0,
        lastUpdated: new Date(),
      };
      this.metrics.set(name, metric);
    }
    return this.metrics.get(name)!;
  }

  /**
   * Get or create histogram
   */
  private getOrCreateHistogram(name: string): Histogram {
    if (!this.histograms.has(name)) {
      this.histograms.set(name, new Histogram());
    }
    return this.histograms.get(name)!;
  }

  /**
   * Get or create rate tracker
   */
  private getOrCreateRateTracker(name: string): RateTracker {
    if (!this.rateTrackers.has(name)) {
      this.rateTrackers.set(name, new RateTracker());
    }
    return this.rateTrackers.get(name)!;
  }

  /**
   * Trim metric data to prevent memory growth
   */
  private trimMetricData(metric: PerformanceMetric): void {
    if (metric.data.length > this.config.maxDataPoints) {
      (metric.data as MetricDataPoint[]).splice(0, metric.data.length - this.config.maxDataPoints);
    }
  }
}

/**
 * Global performance monitor instance
 */
export const performanceMonitor = PerformanceMonitor.getInstance();

/**
 * Decorator for automatic performance measurement
 */
export const measure = performanceMonitor.createMeasureDecorator();

/**
 * Helper functions for common monitoring patterns
 */
export const monitorAgentAction = (agentId: string, actionType: string) => {
  return performanceMonitor.createTimer(`agent_${agentId}_action_${actionType}`);
};

export const monitorAgentThinking = (agentId: string) => {
  return performanceMonitor.createTimer(`agent_${agentId}_think_time`);
};

export const monitorPortalRequest = (portalType: string, model?: string) => {
  const labels = model ? { portal: portalType, model } : { portal: portalType };
  const timer = performanceMonitor.createTimer(`portal_request_${portalType}`);
  // Store labels for future use in timer completion
  (timer as any).labels = labels;
  return timer;
};

export const recordAgentError = (agentId: string, errorType: string) => {
  performanceMonitor.recordCounter(`agent_${agentId}_errors`, 1, { type: errorType });
};

export const recordMemoryOperation = (operation: string, duration: number) => {
  performanceMonitor.recordTimer(`memory_${operation}`, duration);
};

/**
 * Performance monitoring middleware for Express.js
 */
export const createPerformanceMiddleware = () => {
  return (req: any, res: any, next: any) => {
    const timer = performanceMonitor.createTimer('http_request');
    
    res.on('finish', () => {
      timer.stop({
        method: req.method,
        route: req.route?.path || req.url,
        status: res.statusCode.toString(),
      });
      
      performanceMonitor.recordRate('http_requests', {
        method: req.method,
        status: res.statusCode.toString(),
      });
    });
    
    next();
  };
};