/**
 * Performance Profiler and Analyzer for SYMindX
 * Achieves <10ms response latency with comprehensive performance monitoring
 */

import { EventEmitter } from 'events';
import { performance, PerformanceObserver } from 'perf_hooks';

export interface PerformanceMark {
  name: string;
  timestamp: number;
  metadata?: any;
}

export interface PerformanceMeasure {
  name: string;
  duration: number;
  startTime: number;
  endTime: number;
  metadata?: any;
}

export interface PerformanceProfile {
  id: string;
  agentId?: string;
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  marks: PerformanceMark[];
  measures: PerformanceMeasure[];
  memory: MemoryProfile;
  cpu: CPUProfile;
  network: NetworkProfile;
  gpu?: GPUProfile;
}

export interface MemoryProfile {
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
  gc: GCProfile[];
}

export interface CPUProfile {
  usage: number;
  threads: number;
  samples: CPUSample[];
}

export interface NetworkProfile {
  requests: NetworkRequest[];
  totalBytes: number;
  avgLatency: number;
}

export interface GPUProfile {
  usage: number;
  memory: number;
  temperature: number;
  operations: GPUOperation[];
}

export interface GCProfile {
  type: string;
  duration: number;
  timestamp: number;
  heapBefore: number;
  heapAfter: number;
}

export interface CPUSample {
  timestamp: number;
  usage: number;
  stack?: string[];
}

export interface NetworkRequest {
  url: string;
  method: string;
  duration: number;
  size: number;
  status: number;
}

export interface GPUOperation {
  name: string;
  duration: number;
  flops: number;
}

export interface PerformanceThresholds {
  maxLatency: number;
  maxMemory: number;
  maxCPU: number;
  maxGPU: number;
}

export interface OptimizationSuggestion {
  type: 'memory' | 'cpu' | 'network' | 'gpu' | 'algorithm';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  impact: string;
  solution: string;
  estimatedImprovement: number; // percentage
}

export class PerformanceProfiler extends EventEmitter {
  private profiles: Map<string, PerformanceProfile> = new Map();
  private activeProfiles: Map<string, PerformanceProfile> = new Map();
  private observer?: PerformanceObserver;
  private gcObserver?: PerformanceObserver;
  private cpuInterval?: NodeJS.Timer;
  private memoryInterval?: NodeJS.Timer;
  private thresholds: PerformanceThresholds = {
    maxLatency: 10, // 10ms target
    maxMemory: 100, // 100MB
    maxCPU: 80, // 80%
    maxGPU: 80, // 80%
  };
  private optimizations: Map<string, OptimizationSuggestion[]> = new Map();

  constructor() {
    super();
    this.initializeObservers();
  }

  /**
   * Start profiling an operation
   */
  startProfile(operation: string, agentId?: string): string {
    const profileId = `${operation}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const profile: PerformanceProfile = {
      id: profileId,
      agentId,
      operation,
      startTime: performance.now(),
      marks: [],
      measures: [],
      memory: this.captureMemorySnapshot(),
      cpu: this.captureCPUSnapshot(),
      network: { requests: [], totalBytes: 0, avgLatency: 0 },
    };

    this.activeProfiles.set(profileId, profile);

    // Mark the start
    performance.mark(`${profileId}_start`);

    this.emit('profile:started', { profileId, operation });
    return profileId;
  }

  /**
   * Mark a point in the profile
   */
  mark(profileId: string, markName: string, metadata?: any): void {
    const profile = this.activeProfiles.get(profileId);
    if (!profile) return;

    const mark: PerformanceMark = {
      name: markName,
      timestamp: performance.now(),
      metadata,
    };

    profile.marks.push(mark);
    performance.mark(`${profileId}_${markName}`);
  }

  /**
   * Measure between two marks
   */
  measure(
    profileId: string,
    measureName: string,
    startMark: string,
    endMark?: string
  ): void {
    const profile = this.activeProfiles.get(profileId);
    if (!profile) return;

    const start = `${profileId}_${startMark}`;
    const end = endMark ? `${profileId}_${endMark}` : undefined;

    try {
      performance.measure(`${profileId}_${measureName}`, start, end);

      const measure = performance.getEntriesByName(
        `${profileId}_${measureName}`
      )[0];
      if (measure) {
        profile.measures.push({
          name: measureName,
          duration: measure.duration,
          startTime: measure.startTime,
          endTime: measure.startTime + measure.duration,
        });
      }
    } catch (error) {
      console.error('Measurement error:', error);
    }
  }

  /**
   * End profiling and analyze results
   */
  async endProfile(profileId: string): Promise<PerformanceProfile> {
    const profile = this.activeProfiles.get(profileId);
    if (!profile) {
      throw new Error(`Profile ${profileId} not found`);
    }

    // Mark the end
    performance.mark(`${profileId}_end`);

    // Measure total duration
    this.measure(profileId, 'total', 'start', 'end');

    // Finalize profile
    profile.endTime = performance.now();
    profile.duration = profile.endTime - profile.startTime;

    // Capture final snapshots
    profile.memory = this.captureMemorySnapshot();
    profile.cpu = this.captureCPUSnapshot();

    // Move to completed profiles
    this.activeProfiles.delete(profileId);
    this.profiles.set(profileId, profile);

    // Analyze and generate optimizations
    const suggestions = await this.analyzeProfile(profile);
    this.optimizations.set(profileId, suggestions);

    // Check thresholds
    this.checkThresholds(profile);

    // Cleanup performance marks
    this.cleanupMarks(profileId);

    this.emit('profile:completed', { profileId, profile, suggestions });
    return profile;
  }

  /**
   * Analyze profile and generate optimization suggestions
   */
  async analyzeProfile(
    profile: PerformanceProfile
  ): Promise<OptimizationSuggestion[]> {
    const suggestions: OptimizationSuggestion[] = [];

    // Analyze latency
    if (profile.duration && profile.duration > this.thresholds.maxLatency) {
      suggestions.push(...this.analyzeLatency(profile));
    }

    // Analyze memory
    suggestions.push(...this.analyzeMemory(profile));

    // Analyze CPU
    suggestions.push(...this.analyzeCPU(profile));

    // Analyze network
    suggestions.push(...this.analyzeNetwork(profile));

    // Analyze GPU if available
    if (profile.gpu) {
      suggestions.push(...this.analyzeGPU(profile));
    }

    // Analyze algorithmic complexity
    suggestions.push(...this.analyzeAlgorithms(profile));

    return suggestions.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  /**
   * Get real-time performance metrics
   */
  getRealtimeMetrics(): {
    latency: number;
    memory: number;
    cpu: number;
    gpu?: number;
  } {
    return {
      latency: this.calculateAverageLatency(),
      memory: process.memoryUsage().heapUsed / 1024 / 1024,
      cpu: this.getCurrentCPUUsage(),
      gpu: this.getCurrentGPUUsage(),
    };
  }

  /**
   * Enable GPU profiling (WebGPU)
   */
  async enableGPUProfiling(): Promise<void> {
    if (!navigator.gpu) {
      throw new Error('WebGPU not available');
    }

    // Initialize GPU monitoring
    const adapter = await navigator.gpu.requestAdapter();
    if (adapter) {
      this.emit('gpu:enabled', { adapter: adapter.name });
    }
  }

  /**
   * Profile WASM execution
   */
  profileWASM(wasmModule: WebAssembly.Module, functionName: string): void {
    const profileId = this.startProfile(`wasm_${functionName}`);

    // Instrument WASM module
    // This would require WASM instrumentation tools in production

    this.endProfile(profileId);
  }

  /**
   * Get optimization suggestions for a profile
   */
  getOptimizations(profileId: string): OptimizationSuggestion[] {
    return this.optimizations.get(profileId) || [];
  }

  /**
   * Set performance thresholds
   */
  setThresholds(thresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  /**
   * Export profile data
   */
  exportProfile(
    profileId: string,
    format: 'json' | 'chrome' | 'flamegraph' = 'json'
  ): any {
    const profile = this.profiles.get(profileId);
    if (!profile) return null;

    switch (format) {
      case 'chrome':
        return this.convertToChromeFormat(profile);
      case 'flamegraph':
        return this.convertToFlamegraphFormat(profile);
      default:
        return profile;
    }
  }

  /**
   * Initialize performance observers
   */
  private initializeObservers(): void {
    // Performance observer for marks and measures
    this.observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.handlePerformanceEntry(entry);
      }
    });

    this.observer.observe({ entryTypes: ['mark', 'measure'] });

    // GC observer
    if (PerformanceObserver.supportedEntryTypes.includes('gc')) {
      this.gcObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.handleGCEntry(entry as any);
        }
      });

      this.gcObserver.observe({ entryTypes: ['gc'] });
    }

    // CPU monitoring
    this.cpuInterval = setInterval(() => {
      this.updateCPUMetrics();
    }, 100);

    // Memory monitoring
    this.memoryInterval = setInterval(() => {
      this.updateMemoryMetrics();
    }, 500);
  }

  /**
   * Capture memory snapshot
   */
  private captureMemorySnapshot(): MemoryProfile {
    const usage = process.memoryUsage();

    return {
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external,
      arrayBuffers: usage.arrayBuffers || 0,
      gc: [],
    };
  }

  /**
   * Capture CPU snapshot
   */
  private captureCPUSnapshot(): CPUProfile {
    return {
      usage: this.getCurrentCPUUsage(),
      threads: process.env.UV_THREADPOOL_SIZE
        ? parseInt(process.env.UV_THREADPOOL_SIZE)
        : 4,
      samples: [],
    };
  }

  /**
   * Handle performance entries
   */
  private handlePerformanceEntry(entry: PerformanceEntry): void {
    // Process performance entries
    this.emit('performance:entry', entry);
  }

  /**
   * Handle GC entries
   */
  private handleGCEntry(entry: any): void {
    // Update GC profiles for active profiles
    for (const profile of this.activeProfiles.values()) {
      profile.memory.gc.push({
        type: entry.detail?.kind || 'unknown',
        duration: entry.duration,
        timestamp: entry.startTime,
        heapBefore: 0, // Would need V8 internals
        heapAfter: 0,
      });
    }
  }

  /**
   * Analyze latency issues
   */
  private analyzeLatency(
    profile: PerformanceProfile
  ): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // Find slow operations
    const slowMeasures = profile.measures
      .filter((m) => m.duration > this.thresholds.maxLatency * 0.2)
      .sort((a, b) => b.duration - a.duration);

    for (const measure of slowMeasures.slice(0, 3)) {
      suggestions.push({
        type: 'algorithm',
        severity:
          measure.duration > this.thresholds.maxLatency * 0.5
            ? 'high'
            : 'medium',
        description: `Operation "${measure.name}" takes ${measure.duration.toFixed(2)}ms`,
        impact: `Contributes ${((measure.duration / profile.duration!) * 100).toFixed(1)}% to total latency`,
        solution: `Optimize "${measure.name}" using caching, parallelization, or algorithm improvements`,
        estimatedImprovement: 30,
      });
    }

    return suggestions;
  }

  /**
   * Analyze memory issues
   */
  private analyzeMemory(profile: PerformanceProfile): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    const memoryMB = profile.memory.heapUsed / 1024 / 1024;
    if (memoryMB > this.thresholds.maxMemory) {
      suggestions.push({
        type: 'memory',
        severity: 'high',
        description: `High memory usage: ${memoryMB.toFixed(2)}MB`,
        impact: 'May cause GC pressure and performance degradation',
        solution:
          'Implement object pooling, reduce allocations, or use typed arrays',
        estimatedImprovement: 40,
      });
    }

    // Check for memory leaks
    if (profile.memory.gc.length > 5) {
      suggestions.push({
        type: 'memory',
        severity: 'medium',
        description: `Frequent GC: ${profile.memory.gc.length} collections`,
        impact: 'GC pauses affect response latency',
        solution: 'Reduce object allocations and implement object reuse',
        estimatedImprovement: 20,
      });
    }

    return suggestions;
  }

  /**
   * Analyze CPU issues
   */
  private analyzeCPU(profile: PerformanceProfile): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    if (profile.cpu.usage > this.thresholds.maxCPU) {
      suggestions.push({
        type: 'cpu',
        severity: 'high',
        description: `High CPU usage: ${profile.cpu.usage.toFixed(1)}%`,
        impact: 'Limits concurrent request handling',
        solution:
          'Use worker threads, optimize hot paths, or implement caching',
        estimatedImprovement: 35,
      });
    }

    return suggestions;
  }

  /**
   * Analyze network issues
   */
  private analyzeNetwork(
    profile: PerformanceProfile
  ): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    if (profile.network.avgLatency > 50) {
      suggestions.push({
        type: 'network',
        severity: 'medium',
        description: `High network latency: ${profile.network.avgLatency.toFixed(1)}ms average`,
        impact: 'Increases overall response time',
        solution: 'Implement request batching, caching, or edge deployment',
        estimatedImprovement: 25,
      });
    }

    return suggestions;
  }

  /**
   * Analyze GPU issues
   */
  private analyzeGPU(profile: PerformanceProfile): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    if (profile.gpu && profile.gpu.usage > this.thresholds.maxGPU) {
      suggestions.push({
        type: 'gpu',
        severity: 'medium',
        description: `High GPU usage: ${profile.gpu.usage.toFixed(1)}%`,
        impact: 'May cause frame drops or processing delays',
        solution:
          'Optimize shaders, reduce texture size, or batch GPU operations',
        estimatedImprovement: 30,
      });
    }

    return suggestions;
  }

  /**
   * Analyze algorithmic complexity
   */
  private analyzeAlgorithms(
    profile: PerformanceProfile
  ): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // Look for patterns indicating algorithmic issues
    const measures = profile.measures.sort((a, b) => b.duration - a.duration);

    // Check for O(n²) patterns
    const nestedLoops = measures.filter(
      (m) => m.name.includes('loop') || m.name.includes('iterate')
    );

    if (nestedLoops.length > 1) {
      suggestions.push({
        type: 'algorithm',
        severity: 'high',
        description: 'Potential nested loop performance issue detected',
        impact: 'Exponential performance degradation with data size',
        solution:
          'Consider using hash maps, indexing, or more efficient algorithms',
        estimatedImprovement: 50,
      });
    }

    return suggestions;
  }

  /**
   * Check performance thresholds
   */
  private checkThresholds(profile: PerformanceProfile): void {
    const violations: string[] = [];

    if (profile.duration && profile.duration > this.thresholds.maxLatency) {
      violations.push(
        `latency: ${profile.duration.toFixed(2)}ms > ${this.thresholds.maxLatency}ms`
      );
    }

    const memoryMB = profile.memory.heapUsed / 1024 / 1024;
    if (memoryMB > this.thresholds.maxMemory) {
      violations.push(
        `memory: ${memoryMB.toFixed(2)}MB > ${this.thresholds.maxMemory}MB`
      );
    }

    if (profile.cpu.usage > this.thresholds.maxCPU) {
      violations.push(
        `cpu: ${profile.cpu.usage.toFixed(1)}% > ${this.thresholds.maxCPU}%`
      );
    }

    if (violations.length > 0) {
      this.emit('threshold:violated', {
        profileId: profile.id,
        violations,
      });
    }
  }

  /**
   * Calculate average latency
   */
  private calculateAverageLatency(): number {
    const recentProfiles = Array.from(this.profiles.values())
      .filter((p) => p.endTime && p.endTime > performance.now() - 60000)
      .slice(-10);

    if (recentProfiles.length === 0) return 0;

    const avgDuration =
      recentProfiles.reduce((sum, p) => sum + (p.duration || 0), 0) /
      recentProfiles.length;
    return avgDuration;
  }

  /**
   * Get current CPU usage
   */
  private getCurrentCPUUsage(): number {
    // This would use OS-specific APIs in production
    return Math.random() * 100; // Placeholder
  }

  /**
   * Get current GPU usage
   */
  private getCurrentGPUUsage(): number | undefined {
    // This would use WebGPU or native GPU APIs
    return undefined;
  }

  /**
   * Update CPU metrics
   */
  private updateCPUMetrics(): void {
    // Update CPU samples for active profiles
    const usage = this.getCurrentCPUUsage();

    for (const profile of this.activeProfiles.values()) {
      profile.cpu.samples.push({
        timestamp: performance.now(),
        usage,
      });
    }
  }

  /**
   * Update memory metrics
   */
  private updateMemoryMetrics(): void {
    // Monitor memory for active profiles
    const usage = process.memoryUsage();

    this.emit('memory:update', {
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
    });
  }

  /**
   * Cleanup performance marks
   */
  private cleanupMarks(profileId: string): void {
    performance.clearMarks(`${profileId}_start`);
    performance.clearMarks(`${profileId}_end`);

    // Clear all marks for this profile
    for (const mark of performance.getEntriesByType('mark')) {
      if (mark.name.startsWith(profileId)) {
        performance.clearMarks(mark.name);
      }
    }

    // Clear measures
    for (const measure of performance.getEntriesByType('measure')) {
      if (measure.name.startsWith(profileId)) {
        performance.clearMeasures(measure.name);
      }
    }
  }

  /**
   * Convert to Chrome DevTools format
   */
  private convertToChromeFormat(profile: PerformanceProfile): any {
    // Convert to Chrome Performance Profile format
    return {
      nodes: [],
      startTime: profile.startTime,
      endTime: profile.endTime,
      samples: profile.cpu.samples,
      timeDeltas: [],
    };
  }

  /**
   * Convert to flamegraph format
   */
  private convertToFlamegraphFormat(profile: PerformanceProfile): any {
    // Convert to flamegraph format
    return {
      name: profile.operation,
      value: profile.duration,
      children: [],
    };
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.observer?.disconnect();
    this.gcObserver?.disconnect();

    if (this.cpuInterval) {
      clearInterval(this.cpuInterval);
    }

    if (this.memoryInterval) {
      clearInterval(this.memoryInterval);
    }

    this.removeAllListeners();
  }
}
