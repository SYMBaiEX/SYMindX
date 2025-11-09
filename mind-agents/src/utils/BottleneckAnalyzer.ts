/**
 * Performance Bottleneck Analyzer
 * Identifies and analyzes performance bottlenecks in the system
 */

import { EventEmitter } from 'node:events';
import { performanceMonitor } from './PerformanceMonitor';
import { memoryManager } from './MemoryManager';
import { runtimeLogger } from './logger';

interface BottleneckMetric {
  name: string;
  category: 'cpu' | 'memory' | 'io' | 'network' | 'database' | 'ai_provider';
  severity: 'low' | 'medium' | 'high' | 'critical';
  impact: number; // 0-100
  frequency: number; // occurrences per minute
  averageDuration: number; // ms
  description: string;
  recommendations: string[];
  firstSeen: number;
  lastSeen: number;
}

interface PerformanceProfile {
  timestamp: number;
  duration: number;
  operations: Array<{
    name: string;
    duration: number;
    percentage: number;
    calls: number;
  }>;
  bottlenecks: BottleneckMetric[];
  summary: {
    totalTime: number;
    slowestOperation: string;
    mostFrequentOperation: string;
    memoryPressure: boolean;
    cpuPressure: boolean;
  };
}

interface AnalysisOptions {
  analysisInterval: number; // ms
  profileDuration: number; // ms
  bottleneckThreshold: number; // ms
  memoryThreshold: number; // bytes
  enableContinuousAnalysis: boolean;
  enableProfiling: boolean;
}

export class BottleneckAnalyzer extends EventEmitter {
  private options: AnalysisOptions;
  private analysisTimer?: NodeJS.Timer;
  private isRunning = false;
  private bottlenecks = new Map<string, BottleneckMetric>();
  private profiles: PerformanceProfile[] = [];
  private operationTimes = new Map<string, number[]>();
  private operationCounts = new Map<string, number>();

  constructor(options: Partial<AnalysisOptions> = {}) {
    super();

    this.options = {
      analysisInterval: options.analysisInterval ?? 30000, // 30 seconds
      profileDuration: options.profileDuration ?? 10000, // 10 seconds
      bottleneckThreshold: options.bottleneckThreshold ?? 100, // 100ms
      memoryThreshold: options.memoryThreshold ?? 50 * 1024 * 1024, // 50MB
      enableContinuousAnalysis: options.enableContinuousAnalysis ?? true,
      enableProfiling: options.enableProfiling ?? true,
    };
  }

  /**
   * Start bottleneck analysis
   */
  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;

    if (this.options.enableContinuousAnalysis) {
      this.analysisTimer = setInterval(() => {
        this.performAnalysis();
      }, this.options.analysisInterval);
    }

    // Initial analysis
    this.performAnalysis();

    runtimeLogger.info('Bottleneck analyzer started', {
      analysisInterval: this.options.analysisInterval,
      continuous: this.options.enableContinuousAnalysis,
    });

    this.emit('started');
  }

  /**
   * Stop bottleneck analysis
   */
  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;

    if (this.analysisTimer) {
      clearInterval(this.analysisTimer);
      this.analysisTimer = undefined;
    }

    runtimeLogger.info('Bottleneck analyzer stopped');
    this.emit('stopped');
  }

  /**
   * Record operation timing
   */
  recordOperation(name: string, duration: number): void {
    // Store timing data
    if (!this.operationTimes.has(name)) {
      this.operationTimes.set(name, []);
    }
    
    const times = this.operationTimes.get(name)!;
    times.push(duration);
    
    // Keep only recent data (last 100 operations)
    if (times.length > 100) {
      times.shift();
    }

    // Update call count
    this.operationCounts.set(name, (this.operationCounts.get(name) || 0) + 1);

    // Check for immediate bottleneck
    if (duration > this.options.bottleneckThreshold) {
      this.identifyBottleneck(name, duration);
    }
  }

  /**
   * Perform comprehensive analysis
   */
  async performAnalysis(): Promise<PerformanceProfile> {
    const startTime = Date.now();
    
    try {
      // Analyze current performance state
      const profile = await this.createPerformanceProfile();
      
      // Identify bottlenecks
      await this.analyzeBottlenecks(profile);
      
      // Store profile
      this.profiles.push(profile);
      
      // Trim profiles to prevent memory growth
      if (this.profiles.length > 100) {
        this.profiles = this.profiles.slice(-50);
      }

      const analysisTime = Date.now() - startTime;
      
      performanceMonitor.recordMetric('bottleneck_analysis.duration', analysisTime, 'ms');
      
      this.emit('analysisComplete', profile);
      
      return profile;
    } catch (error) {
      runtimeLogger.error('Bottleneck analysis failed:', error);
      throw error;
    }
  }

  /**
   * Get current bottlenecks
   */
  getBottlenecks(): BottleneckMetric[] {
    return Array.from(this.bottlenecks.values())
      .sort((a, b) => b.impact - a.impact);
  }

  /**
   * Get performance profiles
   */
  getProfiles(limit = 10): PerformanceProfile[] {
    return this.profiles
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Get bottleneck recommendations
   */
  getRecommendations(): Array<{
    category: string;
    priority: 'high' | 'medium' | 'low';
    recommendations: string[];
  }> {
    const recommendations: Array<{
      category: string;
      priority: 'high' | 'medium' | 'low';
      recommendations: string[];
    }> = [];

    // Group bottlenecks by category
    const categories = new Map<string, BottleneckMetric[]>();
    
    for (const bottleneck of this.bottlenecks.values()) {
      if (!categories.has(bottleneck.category)) {
        categories.set(bottleneck.category, []);
      }
      categories.get(bottleneck.category)!.push(bottleneck);
    }

    // Generate recommendations for each category
    for (const [category, bottlenecks] of categories) {
      const highSeverity = bottlenecks.filter(b => b.severity === 'critical' || b.severity === 'high');
      const priority = highSeverity.length > 0 ? 'high' : 
                     bottlenecks.some(b => b.severity === 'medium') ? 'medium' : 'low';

      const categoryRecommendations = new Set<string>();
      
      for (const bottleneck of bottlenecks) {
        bottleneck.recommendations.forEach(rec => categoryRecommendations.add(rec));
      }

      recommendations.push({
        category,
        priority,
        recommendations: Array.from(categoryRecommendations),
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Clear analysis data
   */
  clear(): void {
    this.bottlenecks.clear();
    this.profiles = [];
    this.operationTimes.clear();
    this.operationCounts.clear();
    
    this.emit('cleared');
  }

  // Private helper methods

  private async createPerformanceProfile(): Promise<PerformanceProfile> {
    const timestamp = Date.now();
    const startTime = performance.now();

    // Analyze operations
    const operations = this.analyzeOperations();
    
    // Get current bottlenecks
    const bottlenecks = this.getBottlenecks();
    
    // Calculate summary
    const totalTime = operations.reduce((sum, op) => sum + op.duration, 0);
    const slowestOperation = operations.length > 0 ? 
      operations.reduce((max, op) => op.duration > max.duration ? op : max).name : '';
    const mostFrequentOperation = operations.length > 0 ?
      operations.reduce((max, op) => op.calls > max.calls ? op : max).name : '';

    // Check system pressure
    const memory = process.memoryUsage();
    const memoryPressure = memory.heapUsed > this.options.memoryThreshold;
    const cpuPressure = await this.checkCPUPressure();

    const duration = performance.now() - startTime;

    return {
      timestamp,
      duration,
      operations,
      bottlenecks,
      summary: {
        totalTime,
        slowestOperation,
        mostFrequentOperation,
        memoryPressure,
        cpuPressure,
      },
    };
  }

  private analyzeOperations(): Array<{
    name: string;
    duration: number;
    percentage: number;
    calls: number;
  }> {
    const operations: Array<{
      name: string;
      duration: number;
      percentage: number;
      calls: number;
    }> = [];

    let totalDuration = 0;

    // Calculate total duration and average times
    for (const [name, times] of this.operationTimes) {
      const avgDuration = times.reduce((sum, time) => sum + time, 0) / times.length;
      const calls = this.operationCounts.get(name) || 0;
      
      operations.push({
        name,
        duration: avgDuration,
        percentage: 0, // Will be calculated below
        calls,
      });

      totalDuration += avgDuration;
    }

    // Calculate percentages
    for (const operation of operations) {
      operation.percentage = totalDuration > 0 ? 
        (operation.duration / totalDuration) * 100 : 0;
    }

    return operations.sort((a, b) => b.duration - a.duration);
  }

  private async analyzeBottlenecks(profile: PerformanceProfile): Promise<void> {
    // Analyze slow operations
    for (const operation of profile.operations) {
      if (operation.duration > this.options.bottleneckThreshold) {
        this.identifyBottleneck(operation.name, operation.duration);
      }
    }

    // Analyze memory pressure
    if (profile.summary.memoryPressure) {
      this.identifyMemoryBottleneck();
    }

    // Analyze CPU pressure
    if (profile.summary.cpuPressure) {
      this.identifyCPUBottleneck();
    }

    // Clean up old bottlenecks
    this.cleanupOldBottlenecks();
  }

  private identifyBottleneck(operationName: string, duration: number): void {
    const now = Date.now();
    const bottleneckKey = `operation_${operationName}`;

    let bottleneck = this.bottlenecks.get(bottleneckKey);
    
    if (bottleneck) {
      // Update existing bottleneck
      bottleneck.frequency++;
      bottleneck.averageDuration = (bottleneck.averageDuration + duration) / 2;
      bottleneck.lastSeen = now;
      
      // Update severity based on frequency and duration
      bottleneck.severity = this.calculateSeverity(bottleneck.averageDuration, bottleneck.frequency);
      bottleneck.impact = this.calculateImpact(bottleneck.averageDuration, bottleneck.frequency);
    } else {
      // Create new bottleneck
      bottleneck = {
        name: operationName,
        category: this.categorizeOperation(operationName),
        severity: this.calculateSeverity(duration, 1),
        impact: this.calculateImpact(duration, 1),
        frequency: 1,
        averageDuration: duration,
        description: `Slow operation: ${operationName} taking ${duration.toFixed(2)}ms`,
        recommendations: this.generateRecommendations(operationName, duration),
        firstSeen: now,
        lastSeen: now,
      };
      
      this.bottlenecks.set(bottleneckKey, bottleneck);
      
      performanceMonitor.recordMetric('bottleneck.identified', 1, 'count', {
        operation: operationName,
        severity: bottleneck.severity,
      });
      
      this.emit('bottleneckIdentified', bottleneck);
    }
  }

  private identifyMemoryBottleneck(): void {
    const bottleneckKey = 'memory_pressure';
    const now = Date.now();
    const memory = process.memoryUsage();

    let bottleneck = this.bottlenecks.get(bottleneckKey);
    
    if (bottleneck) {
      bottleneck.frequency++;
      bottleneck.lastSeen = now;
    } else {
      bottleneck = {
        name: 'Memory Pressure',
        category: 'memory',
        severity: 'high',
        impact: 80,
        frequency: 1,
        averageDuration: 0,
        description: `High memory usage: ${Math.round(memory.heapUsed / 1024 / 1024)}MB`,
        recommendations: [
          'Implement memory pooling',
          'Optimize data structures',
          'Enable garbage collection optimization',
          'Review memory leaks',
        ],
        firstSeen: now,
        lastSeen: now,
      };
      
      this.bottlenecks.set(bottleneckKey, bottleneck);
      this.emit('bottleneckIdentified', bottleneck);
    }
  }

  private identifyCPUBottleneck(): void {
    const bottleneckKey = 'cpu_pressure';
    const now = Date.now();

    let bottleneck = this.bottlenecks.get(bottleneckKey);
    
    if (bottleneck) {
      bottleneck.frequency++;
      bottleneck.lastSeen = now;
    } else {
      bottleneck = {
        name: 'CPU Pressure',
        category: 'cpu',
        severity: 'high',
        impact: 75,
        frequency: 1,
        averageDuration: 0,
        description: 'High CPU usage or event loop lag detected',
        recommendations: [
          'Optimize CPU-intensive operations',
          'Implement async processing',
          'Use worker threads for heavy tasks',
          'Profile CPU usage patterns',
        ],
        firstSeen: now,
        lastSeen: now,
      };
      
      this.bottlenecks.set(bottleneckKey, bottleneck);
      this.emit('bottleneckIdentified', bottleneck);
    }
  }

  private categorizeOperation(operationName: string): BottleneckMetric['category'] {
    const name = operationName.toLowerCase();
    
    if (name.includes('db') || name.includes('query') || name.includes('database')) {
      return 'database';
    } else if (name.includes('ai') || name.includes('openai') || name.includes('anthropic')) {
      return 'ai_provider';
    } else if (name.includes('memory') || name.includes('gc')) {
      return 'memory';
    } else if (name.includes('network') || name.includes('http') || name.includes('request')) {
      return 'network';
    } else if (name.includes('io') || name.includes('file') || name.includes('read') || name.includes('write')) {
      return 'io';
    } else {
      return 'cpu';
    }
  }

  private calculateSeverity(duration: number, frequency: number): BottleneckMetric['severity'] {
    const score = (duration / 100) + (frequency / 10); // Weighted score
    
    if (score > 10) return 'critical';
    if (score > 5) return 'high';
    if (score > 2) return 'medium';
    return 'low';
  }

  private calculateImpact(duration: number, frequency: number): number {
    // Impact based on duration and frequency
    const durationImpact = Math.min(duration / 10, 50); // Max 50 points for duration
    const frequencyImpact = Math.min(frequency * 2, 50); // Max 50 points for frequency
    
    return Math.min(Math.round(durationImpact + frequencyImpact), 100);
  }

  private generateRecommendations(operationName: string, duration: number): string[] {
    const recommendations: string[] = [];
    const category = this.categorizeOperation(operationName);

    switch (category) {
      case 'database':
        recommendations.push(
          'Add database connection pooling',
          'Optimize database queries',
          'Add query result caching',
          'Consider database indexing'
        );
        break;
      case 'ai_provider':
        recommendations.push(
          'Implement response caching',
          'Add connection pooling',
          'Use streaming for long responses',
          'Implement circuit breakers'
        );
        break;
      case 'memory':
        recommendations.push(
          'Optimize memory usage',
          'Implement lazy loading',
          'Use memory pools',
          'Enable garbage collection optimization'
        );
        break;
      case 'network':
        recommendations.push(
          'Add request caching',
          'Implement connection pooling',
          'Use compression',
          'Add retry logic with backoff'
        );
        break;
      case 'io':
        recommendations.push(
          'Use async I/O operations',
          'Implement file caching',
          'Batch file operations',
          'Use streaming for large files'
        );
        break;
      default:
        recommendations.push(
          'Profile CPU usage',
          'Optimize algorithms',
          'Use async processing',
          'Consider worker threads'
        );
    }

    return recommendations;
  }

  private async checkCPUPressure(): Promise<boolean> {
    // Simple event loop lag check
    return new Promise((resolve) => {
      const start = process.hrtime.bigint();
      setImmediate(() => {
        const lag = Number(process.hrtime.bigint() - start) / 1e6; // Convert to milliseconds
        resolve(lag > 50); // Consider > 50ms as pressure
      });
    });
  }

  private cleanupOldBottlenecks(): void {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes

    for (const [key, bottleneck] of this.bottlenecks) {
      if (now - bottleneck.lastSeen > maxAge) {
        this.bottlenecks.delete(key);
        this.emit('bottleneckResolved', bottleneck);
      }
    }
  }
}

// Global bottleneck analyzer
export const bottleneckAnalyzer = new BottleneckAnalyzer({
  analysisInterval: 30000, // 30 seconds
  profileDuration: 10000, // 10 seconds
  bottleneckThreshold: 50, // 50ms for optimized performance
  memoryThreshold: 10 * 1024 * 1024, // 10MB for optimized memory usage
  enableContinuousAnalysis: true,
  enableProfiling: true,
});

// Auto-start if not in test environment
if (process.env.NODE_ENV !== 'test') {
  bottleneckAnalyzer.start();
}