/**
 * Comprehensive Health Check System
 * Monitors system health with real-time dashboards and alerting
 */

import { EventEmitter } from 'node:events';
import { runtimeLogger } from './logger';
import { performanceMonitor } from './PerformanceMonitor';
import { memoryManager } from './MemoryManager';
import { gcOptimizer } from './GarbageCollectionOptimizer';

interface HealthCheck {
  name: string;
  description: string;
  category: 'system' | 'database' | 'ai_provider' | 'memory' | 'network' | 'custom';
  priority: 'low' | 'medium' | 'high' | 'critical';
  check: () => Promise<HealthCheckResult>;
  interval: number; // ms
  timeout: number; // ms
  retries: number;
  enabled: boolean;
}

interface HealthCheckResult {
  healthy: boolean;
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  message: string;
  details?: Record<string, unknown>;
  metrics?: Record<string, number>;
  timestamp: number;
  duration: number;
}

interface HealthStatus {
  overall: 'healthy' | 'warning' | 'critical' | 'unknown';
  score: number; // 0-100
  checks: Record<string, HealthCheckResult>;
  summary: {
    total: number;
    healthy: number;
    warning: number;
    critical: number;
    unknown: number;
  };
  lastUpdate: number;
}

interface AlertRule {
  name: string;
  condition: (status: HealthStatus) => boolean;
  severity: 'info' | 'warning' | 'error' | 'critical';
  cooldown: number; // ms
  enabled: boolean;
}

interface Alert {
  id: string;
  rule: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  timestamp: number;
  resolved: boolean;
  resolvedAt?: number;
}

export class HealthCheckSystem extends EventEmitter {
  private checks = new Map<string, HealthCheck>();
  private results = new Map<string, HealthCheckResult>();
  private timers = new Map<string, NodeJS.Timer>();
  private alertRules = new Map<string, AlertRule>();
  private alerts: Alert[] = [];
  private alertCooldowns = new Map<string, number>();
  private isRunning = false;

  constructor() {
    super();
    this.setupDefaultChecks();
    this.setupDefaultAlerts();
  }

  /**
   * Register a health check
   */
  registerCheck(check: HealthCheck): void {
    this.checks.set(check.name, check);

    if (this.isRunning && check.enabled) {
      this.startCheck(check.name);
    }

    this.emit('checkRegistered', check);
  }

  /**
   * Unregister a health check
   */
  unregisterCheck(name: string): boolean {
    const check = this.checks.get(name);
    if (!check) return false;

    this.stopCheck(name);
    this.checks.delete(name);
    this.results.delete(name);

    this.emit('checkUnregistered', name);
    return true;
  }

  /**
   * Register an alert rule
   */
  registerAlert(rule: AlertRule): void {
    this.alertRules.set(rule.name, rule);
    this.emit('alertRegistered', rule);
  }

  /**
   * Start health monitoring
   */
  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;

    // Start all enabled checks
    for (const [name, check] of this.checks) {
      if (check.enabled) {
        this.startCheck(name);
      }
    }

    runtimeLogger.info('Health check system started', {
      totalChecks: this.checks.size,
      enabledChecks: Array.from(this.checks.values()).filter(c => c.enabled).length,
    });

    this.emit('started');
  }

  /**
   * Stop health monitoring
   */
  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;

    // Stop all timers
    for (const [name] of this.checks) {
      this.stopCheck(name);
    }

    runtimeLogger.info('Health check system stopped');
    this.emit('stopped');
  }

  /**
   * Run a specific health check immediately
   */
  async runCheck(name: string): Promise<HealthCheckResult> {
    const check = this.checks.get(name);
    if (!check) {
      throw new Error(`Health check not found: ${name}`);
    }

    return await this.executeCheck(check);
  }

  /**
   * Run all health checks immediately
   */
  async runAllChecks(): Promise<HealthStatus> {
    const checkPromises = Array.from(this.checks.entries())
      .filter(([, check]) => check.enabled)
      .map(async ([name, check]) => {
        try {
          const result = await this.executeCheck(check);
          this.results.set(name, result);
          return [name, result] as const;
        } catch (error) {
          const errorResult: HealthCheckResult = {
            healthy: false,
            status: 'critical',
            message: `Check failed: ${(error as Error).message}`,
            timestamp: Date.now(),
            duration: 0,
          };
          this.results.set(name, errorResult);
          return [name, errorResult] as const;
        }
      });

    await Promise.all(checkPromises);
    return this.getHealthStatus();
  }

  /**
   * Get current health status
   */
  getHealthStatus(): HealthStatus {
    const checks: Record<string, HealthCheckResult> = {};
    let totalScore = 0;
    let totalWeight = 0;

    const summary = {
      total: 0,
      healthy: 0,
      warning: 0,
      critical: 0,
      unknown: 0,
    };

    for (const [name, result] of this.results) {
      checks[name] = result;
      summary.total++;

      // Calculate weighted score
      const check = this.checks.get(name);
      const weight = this.getPriorityWeight(check?.priority || 'medium');
      
      let score = 0;
      switch (result.status) {
        case 'healthy':
          score = 100;
          summary.healthy++;
          break;
        case 'warning':
          score = 60;
          summary.warning++;
          break;
        case 'critical':
          score = 0;
          summary.critical++;
          break;
        case 'unknown':
          score = 30;
          summary.unknown++;
          break;
      }

      totalScore += score * weight;
      totalWeight += weight;
    }

    const overallScore = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
    const overall = this.determineOverallStatus(overallScore, summary);

    const status: HealthStatus = {
      overall,
      score: overallScore,
      checks,
      summary,
      lastUpdate: Date.now(),
    };

    // Check alert rules
    this.checkAlerts(status);

    return status;
  }

  /**
   * Get health check history
   */
  getHistory(name: string, limit = 100): HealthCheckResult[] {
    // In a real implementation, you would store historical results
    // For now, return current result
    const current = this.results.get(name);
    return current ? [current] : [];
  }

  /**
   * Get active alerts
   */
  getAlerts(limit = 50): Alert[] {
    return this.alerts
      .filter(alert => !alert.resolved)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Get all alerts (including resolved)
   */
  getAllAlerts(limit = 100): Alert[] {
    return this.alerts
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert || alert.resolved) return false;

    alert.resolved = true;
    alert.resolvedAt = Date.now();

    this.emit('alertResolved', alert);
    return true;
  }

  /**
   * Get system metrics dashboard data
   */
  getDashboardData(): {
    health: HealthStatus;
    performance: ReturnType<typeof performanceMonitor.getReport>;
    memory: ReturnType<typeof memoryManager.getComprehensiveStats>;
    gc: ReturnType<typeof gcOptimizer.getStats>;
    alerts: Alert[];
  } {
    return {
      health: this.getHealthStatus(),
      performance: performanceMonitor.getReport(),
      memory: memoryManager.getComprehensiveStats(),
      gc: gcOptimizer.getStats(),
      alerts: this.getAlerts(10),
    };
  }

  // Private helper methods

  private async executeCheck(check: HealthCheck): Promise<HealthCheckResult> {
    const startTime = performance.now();

    try {
      // Execute with timeout
      const result = await Promise.race([
        check.check(),
        new Promise<HealthCheckResult>((_, reject) =>
          setTimeout(() => reject(new Error('Health check timeout')), check.timeout)
        ),
      ]);

      const duration = performance.now() - startTime;
      result.timestamp = Date.now();
      result.duration = duration;

      // Record metrics
      performanceMonitor.recordMetric(`health_check.${check.name}.duration`, duration, 'ms');
      performanceMonitor.recordMetric(`health_check.${check.name}.status`, 
        result.healthy ? 1 : 0, 'boolean');

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      return {
        healthy: false,
        status: 'critical',
        message: `Health check failed: ${(error as Error).message}`,
        timestamp: Date.now(),
        duration,
      };
    }
  }

  private startCheck(name: string): void {
    const check = this.checks.get(name);
    if (!check) return;

    // Stop existing timer if any
    this.stopCheck(name);

    // Run immediately
    this.executeCheck(check).then(result => {
      this.results.set(name, result);
      this.emit('checkResult', { name, result });
    }).catch(error => {
      runtimeLogger.error(`Health check ${name} failed:`, error);
    });

    // Set up recurring timer
    const timer = setInterval(async () => {
      try {
        const result = await this.executeCheck(check);
        this.results.set(name, result);
        this.emit('checkResult', { name, result });
      } catch (error) {
        runtimeLogger.error(`Health check ${name} failed:`, error);
      }
    }, check.interval);

    this.timers.set(name, timer);
  }

  private stopCheck(name: string): void {
    const timer = this.timers.get(name);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(name);
    }
  }

  private getPriorityWeight(priority: string): number {
    switch (priority) {
      case 'critical': return 4;
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 2;
    }
  }

  private determineOverallStatus(score: number, summary: HealthStatus['summary']): HealthStatus['overall'] {
    if (summary.critical > 0) return 'critical';
    if (score < 70) return 'critical';
    if (summary.warning > 0 || score < 90) return 'warning';
    return 'healthy';
  }

  private checkAlerts(status: HealthStatus): void {
    const now = Date.now();

    for (const [name, rule] of this.alertRules) {
      if (!rule.enabled) continue;

      // Check cooldown
      const lastAlert = this.alertCooldowns.get(name);
      if (lastAlert && now - lastAlert < rule.cooldown) {
        continue;
      }

      // Check condition
      if (rule.condition(status)) {
        const alert: Alert = {
          id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          rule: name,
          severity: rule.severity,
          message: `Alert: ${rule.name}`,
          timestamp: now,
          resolved: false,
        };

        this.alerts.push(alert);
        this.alertCooldowns.set(name, now);

        // Trim alerts to prevent memory growth
        if (this.alerts.length > 1000) {
          this.alerts = this.alerts.slice(-500);
        }

        this.emit('alert', alert);
        
        runtimeLogger.warn(`Health alert triggered: ${rule.name}`, {
          severity: rule.severity,
          alertId: alert.id,
        });
      }
    }
  }

  private setupDefaultChecks(): void {
    // Memory health check
    this.registerCheck({
      name: 'memory',
      description: 'System memory usage',
      category: 'memory',
      priority: 'high',
      interval: 30000, // 30 seconds
      timeout: 5000,
      retries: 2,
      enabled: true,
      check: async () => {
        const memory = process.memoryUsage();
        const heapUsedMB = Math.round(memory.heapUsed / 1024 / 1024);
        const rssMB = Math.round(memory.rss / 1024 / 1024);

        let status: HealthCheckResult['status'] = 'healthy';
        let message = `Memory usage: ${heapUsedMB}MB heap, ${rssMB}MB RSS`;

        if (heapUsedMB > 100) {
          status = 'critical';
          message = `High memory usage: ${heapUsedMB}MB heap`;
        } else if (heapUsedMB > 50) {
          status = 'warning';
          message = `Elevated memory usage: ${heapUsedMB}MB heap`;
        }

        return {
          healthy: status === 'healthy',
          status,
          message,
          details: {
            heapUsed: memory.heapUsed,
            heapTotal: memory.heapTotal,
            rss: memory.rss,
            external: memory.external,
          },
          metrics: {
            heapUsedMB,
            rssMB,
          },
          timestamp: 0,
          duration: 0,
        };
      },
    });

    // CPU health check
    this.registerCheck({
      name: 'cpu',
      description: 'CPU usage and event loop lag',
      category: 'system',
      priority: 'high',
      interval: 15000, // 15 seconds
      timeout: 3000,
      retries: 1,
      enabled: true,
      check: async () => {
        const cpuUsage = process.cpuUsage();
        const eventLoopLag = await this.measureEventLoopLag();

        let status: HealthCheckResult['status'] = 'healthy';
        let message = `Event loop lag: ${eventLoopLag.toFixed(2)}ms`;

        if (eventLoopLag > 100) {
          status = 'critical';
          message = `High event loop lag: ${eventLoopLag.toFixed(2)}ms`;
        } else if (eventLoopLag > 50) {
          status = 'warning';
          message = `Elevated event loop lag: ${eventLoopLag.toFixed(2)}ms`;
        }

        return {
          healthy: status === 'healthy',
          status,
          message,
          details: {
            cpuUsage,
            eventLoopLag,
          },
          metrics: {
            eventLoopLag,
            cpuUser: cpuUsage.user,
            cpuSystem: cpuUsage.system,
          },
          timestamp: 0,
          duration: 0,
        };
      },
    });

    // Performance health check
    this.registerCheck({
      name: 'performance',
      description: 'Overall system performance',
      category: 'system',
      priority: 'medium',
      interval: 60000, // 1 minute
      timeout: 5000,
      retries: 1,
      enabled: true,
      check: async () => {
        const report = performanceMonitor.getReport();
        const avgResponseTime = report.topMetrics
          .find(m => m.name.includes('response_time'))?.stats.avg || 0;

        let status: HealthCheckResult['status'] = 'healthy';
        let message = `Average response time: ${avgResponseTime.toFixed(2)}ms`;

        if (avgResponseTime > 1000) {
          status = 'critical';
          message = `Slow response time: ${avgResponseTime.toFixed(2)}ms`;
        } else if (avgResponseTime > 500) {
          status = 'warning';
          message = `Elevated response time: ${avgResponseTime.toFixed(2)}ms`;
        }

        return {
          healthy: status === 'healthy',
          status,
          message,
          details: {
            totalMetrics: report.summary.totalMetrics,
            alertCount: report.summary.alertCount,
            uptime: report.summary.uptime,
          },
          metrics: {
            avgResponseTime,
            totalMetrics: report.summary.totalMetrics,
          },
          timestamp: 0,
          duration: 0,
        };
      },
    });
  }

  private setupDefaultAlerts(): void {
    // Critical memory alert
    this.registerAlert({
      name: 'critical_memory',
      condition: (status) => {
        const memoryCheck = status.checks.memory;
        return memoryCheck?.status === 'critical';
      },
      severity: 'critical',
      cooldown: 300000, // 5 minutes
      enabled: true,
    });

    // High event loop lag alert
    this.registerAlert({
      name: 'high_event_loop_lag',
      condition: (status) => {
        const cpuCheck = status.checks.cpu;
        return cpuCheck?.metrics?.eventLoopLag && cpuCheck.metrics.eventLoopLag > 100;
      },
      severity: 'error',
      cooldown: 180000, // 3 minutes
      enabled: true,
    });

    // Overall health degradation alert
    this.registerAlert({
      name: 'health_degradation',
      condition: (status) => {
        return status.overall === 'critical' || status.score < 50;
      },
      severity: 'error',
      cooldown: 600000, // 10 minutes
      enabled: true,
    });
  }

  private async measureEventLoopLag(): Promise<number> {
    return new Promise((resolve) => {
      const start = process.hrtime.bigint();
      setImmediate(() => {
        const lag = Number(process.hrtime.bigint() - start) / 1e6; // Convert to milliseconds
        resolve(lag);
      });
    });
  }
}

// Global health check system
export const healthCheckSystem = new HealthCheckSystem();

// Auto-start if not in test environment
if (process.env.NODE_ENV !== 'test') {
  healthCheckSystem.start();
}