/**
 * Performance profiling and memory usage monitoring for SYMindX agents
 */

import { performance } from 'perf_hooks';
import { Agent, PerformanceMetrics } from './types.js';

export interface ProfilerConfig {
  enableCPUProfiling: boolean;
  enableMemoryProfiling: boolean;
  enableNetworkProfiling: boolean;
  sampleInterval: number;
  maxSamples: number;
  alertThresholds: {
    responseTime: number;
    memoryUsage: number;
    cpuUsage: number;
    errorRate: number;
  };
}

export interface ProfileSample {
  timestamp: number;
  cpuUsage: number;
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
  responseTime?: number;
  operationCount: number;
  errorCount: number;
}

export interface PerformanceAlert {
  type: 'cpu' | 'memory' | 'response_time' | 'error_rate';
  severity: 'warning' | 'critical';
  message: string;
  value: number;
  threshold: number;
  timestamp: Date;
}

export class PerformanceMonitor {
  private agent: Agent;
  private config: ProfilerConfig;
  private samples: ProfileSample[] = [];
  private alerts: PerformanceAlert[] = [];
  private isRunning = false;
  private intervalId?: NodeJS.Timeout;
  private operationCount = 0;
  private errorCount = 0;
  private responseTimeSum = 0;
  private responseTimeCount = 0;

  constructor(agent: Agent, config: Partial<ProfilerConfig> = {}) {
    this.agent = agent;
    this.config = {
      enableCPUProfiling: config.enableCPUProfiling ?? true,
      enableMemoryProfiling: config.enableMemoryProfiling ?? true,
      enableNetworkProfiling: config.enableNetworkProfiling ?? false,
      sampleInterval: config.sampleInterval ?? 1000,
      maxSamples: config.maxSamples ?? 1000,
      alertThresholds: {
        responseTime: config.alertThresholds?.responseTime ?? 2000,
        memoryUsage: config.alertThresholds?.memoryUsage ?? 512 * 1024 * 1024, // 512MB
        cpuUsage: config.alertThresholds?.cpuUsage ?? 80,
        errorRate: config.alertThresholds?.errorRate ?? 0.1, // 10%
        ...config.alertThresholds
      }
    };

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Monitor message processing
    this.agent.on('message_received', () => {
      this.operationCount++;
    });

    this.agent.on('error_occurred', () => {
      this.errorCount++;
    });

    // Wrap agent methods to measure performance
    this.wrapAgentMethods();
  }

  private wrapAgentMethods(): void {
    const originalProcessMessage = this.agent.processMessage.bind(this.agent);
    
    this.agent.processMessage = async (message: string, metadata?: any) => {
      const startTime = performance.now();
      
      try {
        const result = await originalProcessMessage(message, metadata);
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        this.recordResponseTime(responseTime);
        return result;
      } catch (error) {
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        this.recordResponseTime(responseTime);
        this.errorCount++;
        throw error;
      }
    };
  }

  private recordResponseTime(responseTime: number): void {
    this.responseTimeSum += responseTime;
    this.responseTimeCount++;
  }

  public start(): void {
    if (this.isRunning) {
      console.warn('Performance monitor is already running');
      return;
    }

    this.isRunning = true;
    console.log(`🔍 Starting performance monitoring (${this.config.sampleInterval}ms intervals)`);

    this.intervalId = setInterval(() => {
      this.collectSample();
      this.checkAlerts();
    }, this.config.sampleInterval);
  }

  public stop(): void {
    if (!this.isRunning) {
      console.warn('Performance monitor is not running');
      return;
    }

    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    console.log('🛑 Performance monitoring stopped');
  }

  private collectSample(): void {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = this.getCPUUsage();
    
    const sample: ProfileSample = {
      timestamp: Date.now(),
      cpuUsage,
      memoryUsage: {
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
        external: memoryUsage.external,
        rss: memoryUsage.rss
      },
      responseTime: this.getAverageResponseTime(),
      operationCount: this.operationCount,
      errorCount: this.errorCount
    };

    this.samples.push(sample);

    // Trim samples if we exceed max
    if (this.samples.length > this.config.maxSamples) {
      this.samples = this.samples.slice(-this.config.maxSamples);
    }

    // Reset counters for next interval
    this.resetCounters();
  }

  private getCPUUsage(): number {
    // Simple CPU usage calculation
    // In a real implementation, you'd use more sophisticated methods
    const usage = process.cpuUsage();
    const totalUsage = usage.user + usage.system;
    return (totalUsage / 1000000) / this.config.sampleInterval * 100;
  }

  private getAverageResponseTime(): number {
    if (this.responseTimeCount === 0) return 0;
    return this.responseTimeSum / this.responseTimeCount;
  }

  private resetCounters(): void {
    this.operationCount = 0;
    this.responseTimeSum = 0;
    this.responseTimeCount = 0;
    // Don't reset errorCount as it's cumulative
  }

  private checkAlerts(): void {
    if (this.samples.length === 0) return;

    const latest = this.samples[this.samples.length - 1];
    const { alertThresholds } = this.config;

    // Check CPU usage
    if (latest.cpuUsage > alertThresholds.cpuUsage) {
      this.createAlert('cpu', 'critical', 
        `High CPU usage: ${latest.cpuUsage.toFixed(1)}%`, 
        latest.cpuUsage, alertThresholds.cpuUsage);
    }

    // Check memory usage
    const memoryUsageMB = latest.memoryUsage.rss / 1024 / 1024;
    const thresholdMB = alertThresholds.memoryUsage / 1024 / 1024;
    if (latest.memoryUsage.rss > alertThresholds.memoryUsage) {
      this.createAlert('memory', 'critical',
        `High memory usage: ${memoryUsageMB.toFixed(1)}MB`,
        latest.memoryUsage.rss, alertThresholds.memoryUsage);
    }

    // Check response time
    if (latest.responseTime && latest.responseTime > alertThresholds.responseTime) {
      this.createAlert('response_time', 'warning',
        `Slow response time: ${latest.responseTime.toFixed(1)}ms`,
        latest.responseTime, alertThresholds.responseTime);
    }

    // Check error rate
    const totalOperations = this.samples.reduce((sum, s) => sum + s.operationCount, 0);
    const totalErrors = this.samples.reduce((sum, s) => sum + s.errorCount, 0);
    const errorRate = totalOperations > 0 ? totalErrors / totalOperations : 0;
    
    if (errorRate > alertThresholds.errorRate) {
      this.createAlert('error_rate', 'critical',
        `High error rate: ${(errorRate * 100).toFixed(1)}%`,
        errorRate, alertThresholds.errorRate);
    }
  }

  private createAlert(type: PerformanceAlert['type'], severity: PerformanceAlert['severity'], 
                     message: string, value: number, threshold: number): void {
    const alert: PerformanceAlert = {
      type,
      severity,
      message,
      value,
      threshold,
      timestamp: new Date()
    };

    this.alerts.push(alert);

    // Trim alerts if we have too many
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }

    // Log the alert
    const color = severity === 'critical' ? '\x1b[31m' : '\x1b[33m'; // Red or Yellow
    console.log(`${color}⚠️  ALERT [${severity.toUpperCase()}]: ${message}\x1b[0m`);
  }

  public getMetrics(): PerformanceMetrics {
    if (this.samples.length === 0) {
      return {
        responseTime: { average: 0, min: 0, max: 0, p95: 0 },
        memoryUsage: { current: 0, peak: 0, average: 0 },
        cpuUsage: { current: 0, average: 0 },
        throughput: { messagesPerSecond: 0, operationsPerSecond: 0 }
      };
    }

    const responseTimes = this.samples
      .map(s => s.responseTime)
      .filter(rt => rt !== undefined) as number[];
    
    const memoryUsages = this.samples.map(s => s.memoryUsage.rss);
    const cpuUsages = this.samples.map(s => s.cpuUsage);

    // Calculate response time metrics
    const sortedResponseTimes = responseTimes.sort((a, b) => a - b);
    const p95Index = Math.floor(sortedResponseTimes.length * 0.95);

    // Calculate throughput (operations per second)
    const timeSpan = this.samples.length * (this.config.sampleInterval / 1000);
    const totalOperations = this.samples.reduce((sum, s) => sum + s.operationCount, 0);

    return {
      responseTime: {
        average: responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length || 0,
        min: Math.min(...responseTimes) || 0,
        max: Math.max(...responseTimes) || 0,
        p95: sortedResponseTimes[p95Index] || 0
      },
      memoryUsage: {
        current: memoryUsages[memoryUsages.length - 1] || 0,
        peak: Math.max(...memoryUsages) || 0,
        average: memoryUsages.reduce((sum, mu) => sum + mu, 0) / memoryUsages.length || 0
      },
      cpuUsage: {
        current: cpuUsages[cpuUsages.length - 1] || 0,
        average: cpuUsages.reduce((sum, cpu) => sum + cpu, 0) / cpuUsages.length || 0
      },
      throughput: {
        messagesPerSecond: totalOperations / timeSpan || 0,
        operationsPerSecond: totalOperations / timeSpan || 0
      }
    };
  }

  public getSamples(limit?: number): ProfileSample[] {
    return limit ? this.samples.slice(-limit) : [...this.samples];
  }

  public getAlerts(limit?: number): PerformanceAlert[] {
    return limit ? this.alerts.slice(-limit) : [...this.alerts];
  }

  public generateReport(): string {
    const metrics = this.getMetrics();
    const recentAlerts = this.getAlerts(10);
    const recentSamples = this.getSamples(20);

    const report = {
      timestamp: new Date().toISOString(),
      agent: {
        id: this.agent.id,
        name: this.agent.name
      },
      monitoring: {
        isRunning: this.isRunning,
        sampleInterval: this.config.sampleInterval,
        totalSamples: this.samples.length
      },
      metrics,
      alerts: {
        total: this.alerts.length,
        recent: recentAlerts
      },
      samples: recentSamples,
      summary: {
        averageResponseTime: `${metrics.responseTime.average.toFixed(2)}ms`,
        currentMemoryUsage: `${(metrics.memoryUsage.current / 1024 / 1024).toFixed(2)}MB`,
        averageCPUUsage: `${metrics.cpuUsage.average.toFixed(1)}%`,
        throughput: `${metrics.throughput.operationsPerSecond.toFixed(2)} ops/sec`,
        alertCount: this.alerts.length
      }
    };

    return JSON.stringify(report, null, 2);
  }

  public exportCSV(): string {
    const headers = [
      'timestamp', 'cpuUsage', 'heapUsed', 'heapTotal', 'rss', 
      'responseTime', 'operationCount', 'errorCount'
    ];

    const rows = this.samples.map(sample => [
      new Date(sample.timestamp).toISOString(),
      sample.cpuUsage.toFixed(2),
      sample.memoryUsage.heapUsed,
      sample.memoryUsage.heapTotal,
      sample.memoryUsage.rss,
      sample.responseTime?.toFixed(2) || '0',
      sample.operationCount,
      sample.errorCount
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }

  public clearData(): void {
    this.samples = [];
    this.alerts = [];
    this.errorCount = 0;
    console.log('📊 Performance monitoring data cleared');
  }
}

// Memory leak detection
export class MemoryLeakDetector {
  private baselineMemory: number;
  private samples: number[] = [];
  private isMonitoring = false;
  private intervalId?: NodeJS.Timeout;

  constructor() {
    this.baselineMemory = process.memoryUsage().heapUsed;
  }

  public start(intervalMs: number = 30000): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    console.log('🔍 Starting memory leak detection');

    this.intervalId = setInterval(() => {
      this.checkMemoryGrowth();
    }, intervalMs);
  }

  public stop(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    console.log('🛑 Memory leak detection stopped');
  }

  private checkMemoryGrowth(): void {
    const currentMemory = process.memoryUsage().heapUsed;
    this.samples.push(currentMemory);

    // Keep only last 20 samples (10 minutes if sampling every 30 seconds)
    if (this.samples.length > 20) {
      this.samples = this.samples.slice(-20);
    }

    // Check for consistent growth
    if (this.samples.length >= 10) {
      const trend = this.calculateTrend();
      const growthRate = (currentMemory - this.baselineMemory) / this.baselineMemory;

      if (trend > 0.1 && growthRate > 0.5) { // 10% trend and 50% growth
        console.log(`⚠️  Potential memory leak detected:`);
        console.log(`   Growth rate: ${(growthRate * 100).toFixed(1)}%`);
        console.log(`   Current usage: ${(currentMemory / 1024 / 1024).toFixed(2)}MB`);
        console.log(`   Baseline: ${(this.baselineMemory / 1024 / 1024).toFixed(2)}MB`);
      }
    }
  }

  private calculateTrend(): number {
    if (this.samples.length < 2) return 0;

    const n = this.samples.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = this.samples.reduce((sum, val) => sum + val, 0);
    const sumXY = this.samples.reduce((sum, val, i) => sum + (i * val), 0);
    const sumX2 = this.samples.reduce((sum, _, i) => sum + (i * i), 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope / (sumY / n); // Normalize by average
  }
}