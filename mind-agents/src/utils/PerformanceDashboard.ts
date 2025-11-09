/**
 * Real-time Performance Dashboard
 * Provides real-time metrics and visualization data for performance monitoring
 */

import { EventEmitter } from 'node:events';
import { performanceMonitor } from './PerformanceMonitor';
import { memoryManager } from './MemoryManager';
import { healthCheckSystem } from './HealthCheckSystem';
import { gcOptimizer } from './GarbageCollectionOptimizer';
import { runtimeLogger } from './logger';

interface DashboardMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  trend: 'up' | 'down' | 'stable';
  status: 'healthy' | 'warning' | 'critical';
}

interface DashboardChart {
  name: string;
  type: 'line' | 'bar' | 'gauge' | 'pie';
  data: Array<{
    timestamp: number;
    value: number;
    label?: string;
  }>;
  config: {
    color?: string;
    threshold?: {
      warning: number;
      critical: number;
    };
    unit?: string;
  };
}

interface DashboardData {
  timestamp: number;
  overview: {
    status: 'healthy' | 'warning' | 'critical';
    score: number;
    uptime: number;
    version: string;
  };
  metrics: DashboardMetric[];
  charts: DashboardChart[];
  alerts: Array<{
    id: string;
    severity: 'info' | 'warning' | 'error' | 'critical';
    message: string;
    timestamp: number;
  }>;
  system: {
    memory: {
      heapUsed: number;
      heapTotal: number;
      rss: number;
      external: number;
    };
    cpu: {
      usage: number;
      eventLoopLag: number;
    };
    gc: {
      count: number;
      averageTime: number;
      lastTime: number;
    };
  };
}

interface DashboardOptions {
  updateInterval: number; // ms
  historySize: number;
  enableRealTime: boolean;
  enableCharts: boolean;
  enableAlerts: boolean;
}

export class PerformanceDashboard extends EventEmitter {
  private options: DashboardOptions;
  private updateTimer?: NodeJS.Timer;
  private isRunning = false;
  private history: DashboardData[] = [];
  private subscribers = new Set<(data: DashboardData) => void>();

  constructor(options: Partial<DashboardOptions> = {}) {
    super();

    this.options = {
      updateInterval: options.updateInterval ?? 1000, // 1 second
      historySize: options.historySize ?? 300, // 5 minutes at 1s intervals
      enableRealTime: options.enableRealTime ?? true,
      enableCharts: options.enableCharts ?? true,
      enableAlerts: options.enableAlerts ?? true,
    };
  }

  /**
   * Start the dashboard
   */
  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;

    if (this.options.enableRealTime) {
      this.updateTimer = setInterval(() => {
        this.updateDashboard();
      }, this.options.updateInterval);
    }

    // Initial update
    this.updateDashboard();

    runtimeLogger.info('Performance dashboard started', {
      updateInterval: this.options.updateInterval,
      realTime: this.options.enableRealTime,
    });

    this.emit('started');
  }

  /**
   * Stop the dashboard
   */
  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;

    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = undefined;
    }

    runtimeLogger.info('Performance dashboard stopped');
    this.emit('stopped');
  }

  /**
   * Get current dashboard data
   */
  getCurrentData(): DashboardData {
    return this.generateDashboardData();
  }

  /**
   * Get historical dashboard data
   */
  getHistoricalData(minutes = 5): DashboardData[] {
    const cutoff = Date.now() - (minutes * 60 * 1000);
    return this.history.filter(data => data.timestamp > cutoff);
  }

  /**
   * Subscribe to real-time updates
   */
  subscribe(callback: (data: DashboardData) => void): () => void {
    this.subscribers.add(callback);
    
    // Send current data immediately
    callback(this.getCurrentData());

    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Get dashboard configuration for frontend
   */
  getConfig(): {
    updateInterval: number;
    features: {
      realTime: boolean;
      charts: boolean;
      alerts: boolean;
    };
    thresholds: {
      memory: { warning: number; critical: number };
      cpu: { warning: number; critical: number };
      eventLoop: { warning: number; critical: number };
    };
  } {
    return {
      updateInterval: this.options.updateInterval,
      features: {
        realTime: this.options.enableRealTime,
        charts: this.options.enableCharts,
        alerts: this.options.enableAlerts,
      },
      thresholds: {
        memory: { warning: 50, critical: 100 }, // MB
        cpu: { warning: 70, critical: 90 }, // %
        eventLoop: { warning: 50, critical: 100 }, // ms
      },
    };
  }

  /**
   * Export dashboard data for external systems
   */
  exportData(format: 'json' | 'csv' = 'json'): string {
    const data = this.getCurrentData();

    if (format === 'csv') {
      return this.convertToCSV(data);
    }

    return JSON.stringify(data, null, 2);
  }

  // Private helper methods

  private updateDashboard(): void {
    try {
      const data = this.generateDashboardData();
      
      // Add to history
      this.history.push(data);
      
      // Trim history
      if (this.history.length > this.options.historySize) {
        this.history = this.history.slice(-this.options.historySize);
      }

      // Notify subscribers
      for (const callback of this.subscribers) {
        try {
          callback(data);
        } catch (error) {
          runtimeLogger.error('Dashboard subscriber error:', error);
        }
      }

      this.emit('update', data);
    } catch (error) {
      runtimeLogger.error('Dashboard update error:', error);
    }
  }

  private generateDashboardData(): DashboardData {
    const timestamp = Date.now();
    const healthStatus = healthCheckSystem.getHealthStatus();
    const performanceReport = performanceMonitor.getReport();
    const memoryStats = memoryManager.getComprehensiveStats();
    const gcStats = gcOptimizer.getStats();

    // Generate metrics
    const metrics = this.generateMetrics();

    // Generate charts
    const charts = this.options.enableCharts ? this.generateCharts() : [];

    // Get alerts
    const alerts = this.options.enableAlerts ? 
      healthCheckSystem.getAlerts(10).map(alert => ({
        id: alert.id,
        severity: alert.severity,
        message: alert.message,
        timestamp: alert.timestamp,
      })) : [];

    return {
      timestamp,
      overview: {
        status: healthStatus.overall,
        score: healthStatus.score,
        uptime: performanceReport.summary.uptime,
        version: '2.0.0',
      },
      metrics,
      charts,
      alerts,
      system: {
        memory: {
          heapUsed: memoryStats.memoryManager.currentMemory.heapUsed,
          heapTotal: memoryStats.memoryManager.currentMemory.heapTotal,
          rss: memoryStats.memoryManager.currentMemory.rss,
          external: memoryStats.memoryManager.currentMemory.external,
        },
        cpu: {
          usage: 0, // Would be calculated from CPU metrics
          eventLoopLag: 0, // Would be from event loop monitoring
        },
        gc: {
          count: gcStats.gcCount,
          averageTime: gcStats.averageGCTime,
          lastTime: gcStats.lastGCTime,
        },
      },
    };
  }

  private generateMetrics(): DashboardMetric[] {
    const metrics: DashboardMetric[] = [];
    const memory = process.memoryUsage();
    const gcStats = gcOptimizer.getStats();

    // Memory metrics
    const heapUsedMB = Math.round(memory.heapUsed / 1024 / 1024);
    metrics.push({
      name: 'Memory Usage',
      value: heapUsedMB,
      unit: 'MB',
      timestamp: Date.now(),
      trend: this.calculateTrend('memory.heapUsed', heapUsedMB),
      status: heapUsedMB > 100 ? 'critical' : heapUsedMB > 50 ? 'warning' : 'healthy',
    });

    // GC metrics
    metrics.push({
      name: 'GC Average Time',
      value: Math.round(gcStats.averageGCTime * 100) / 100,
      unit: 'ms',
      timestamp: Date.now(),
      trend: this.calculateTrend('gc.averageTime', gcStats.averageGCTime),
      status: gcStats.averageGCTime > 50 ? 'warning' : 'healthy',
    });

    // Performance metrics
    const performanceReport = performanceMonitor.getReport();
    metrics.push({
      name: 'Total Metrics',
      value: performanceReport.summary.totalMetrics,
      unit: 'count',
      timestamp: Date.now(),
      trend: this.calculateTrend('performance.totalMetrics', performanceReport.summary.totalMetrics),
      status: 'healthy',
    });

    // Uptime
    metrics.push({
      name: 'Uptime',
      value: Math.round(performanceReport.summary.uptime),
      unit: 'seconds',
      timestamp: Date.now(),
      trend: 'up',
      status: 'healthy',
    });

    return metrics;
  }

  private generateCharts(): DashboardChart[] {
    const charts: DashboardChart[] = [];
    const now = Date.now();

    // Memory usage chart
    const memoryData = this.history.slice(-60).map(data => ({
      timestamp: data.timestamp,
      value: Math.round(data.system.memory.heapUsed / 1024 / 1024),
    }));

    charts.push({
      name: 'Memory Usage',
      type: 'line',
      data: memoryData,
      config: {
        color: '#3b82f6',
        threshold: {
          warning: 50,
          critical: 100,
        },
        unit: 'MB',
      },
    });

    // GC performance chart
    const gcData = this.history.slice(-60).map(data => ({
      timestamp: data.timestamp,
      value: data.system.gc.averageTime,
    }));

    charts.push({
      name: 'GC Performance',
      type: 'line',
      data: gcData,
      config: {
        color: '#10b981',
        threshold: {
          warning: 30,
          critical: 50,
        },
        unit: 'ms',
      },
    });

    // Health score gauge
    const healthStatus = healthCheckSystem.getHealthStatus();
    charts.push({
      name: 'Health Score',
      type: 'gauge',
      data: [{
        timestamp: now,
        value: healthStatus.score,
      }],
      config: {
        color: healthStatus.score > 80 ? '#10b981' : 
               healthStatus.score > 60 ? '#f59e0b' : '#ef4444',
        threshold: {
          warning: 70,
          critical: 50,
        },
        unit: '%',
      },
    });

    // Alert severity distribution
    const alerts = healthCheckSystem.getAlerts();
    const alertCounts = alerts.reduce((acc, alert) => {
      acc[alert.severity] = (acc[alert.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const alertData = Object.entries(alertCounts).map(([severity, count]) => ({
      timestamp: now,
      value: count,
      label: severity,
    }));

    if (alertData.length > 0) {
      charts.push({
        name: 'Alert Distribution',
        type: 'pie',
        data: alertData,
        config: {
          color: '#ef4444',
        },
      });
    }

    return charts;
  }

  private calculateTrend(metricName: string, currentValue: number): 'up' | 'down' | 'stable' {
    // Simple trend calculation based on recent history
    const recentData = this.history.slice(-5);
    if (recentData.length < 2) return 'stable';

    const oldValue = recentData[0]?.system?.memory?.heapUsed || currentValue;
    const diff = currentValue - oldValue;
    const threshold = Math.abs(oldValue * 0.05); // 5% threshold

    if (Math.abs(diff) < threshold) return 'stable';
    return diff > 0 ? 'up' : 'down';
  }

  private convertToCSV(data: DashboardData): string {
    const headers = ['timestamp', 'status', 'score', 'heapUsed', 'gcCount', 'uptime'];
    const rows = [headers.join(',')];

    rows.push([
      data.timestamp,
      data.overview.status,
      data.overview.score,
      Math.round(data.system.memory.heapUsed / 1024 / 1024),
      data.system.gc.count,
      data.overview.uptime,
    ].join(','));

    return rows.join('\n');
  }
}

// Global performance dashboard
export const performanceDashboard = new PerformanceDashboard({
  updateInterval: 2000, // 2 seconds for optimized performance
  historySize: 150, // 5 minutes at 2s intervals
  enableRealTime: true,
  enableCharts: true,
  enableAlerts: true,
});

// Auto-start if not in test environment
if (process.env.NODE_ENV !== 'test') {
  performanceDashboard.start();
}