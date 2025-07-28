/**
 * @module debug-utilities
 * @description Advanced debugging and diagnostic utilities for SYMindX
 */

import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { performance } from 'perf_hooks';
import { inspect } from 'util';

import type {
  Agent,
  AgentEvent,
  MemoryRecord,
  ThoughtResult,
  LogContext,
} from '../types/index.js';

import { runtimeLogger } from './logger.js';
import { performanceMonitor } from './performance-monitor.js';

/**
 * Debug levels
 */
export enum DebugLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  FATAL = 5,
}

/**
 * Debug session information
 */
export interface DebugSession {
  readonly id: string;
  readonly name: string;
  readonly startTime: Date;
  readonly level: DebugLevel;
  readonly filters: DebugFilter[];
  readonly outputs: DebugOutput[];
  active: boolean;
}

/**
 * Debug filter configuration
 */
export interface DebugFilter {
  readonly type: 'include' | 'exclude';
  readonly pattern: string | RegExp;
  readonly field?: string; // Which field to apply the filter to
}

/**
 * Debug output configuration
 */
export interface DebugOutput {
  readonly type: 'console' | 'file' | 'memory' | 'websocket';
  readonly config: Record<string, any>;
  enabled: boolean;
}

/**
 * Debug trace entry
 */
export interface DebugTrace {
  readonly id: string;
  readonly timestamp: Date;
  readonly level: DebugLevel;
  readonly category: string;
  readonly message: string;
  readonly data?: any;
  readonly context?: DebugContext;
  readonly stack?: string;
  readonly performance?: {
    duration?: number;
    memory?: number;
    cpu?: number;
  };
}

/**
 * Debug context information
 */
export interface DebugContext {
  readonly sessionId?: string;
  readonly agentId?: string;
  readonly operationId?: string;
  readonly correlationId?: string;
  readonly parentTraceId?: string;
  readonly tags?: string[];
  readonly metadata?: Record<string, any>;
}

/**
 * Agent state snapshot for debugging
 */
export interface AgentDebugSnapshot {
  readonly agentId: string;
  readonly agentName: string;
  readonly timestamp: Date;
  readonly state: {
    status: string;
    currentEmotion: string;
    emotionIntensity: number;
    recentMemories: MemoryRecord[];
    recentThoughts: string[];
    activeActions: string[];
    configuration: Record<string, any>;
  };
  readonly performance: {
    thinkTime: number;
    responseTime: number;
    memoryUsage: number;
    actionCount: number;
    errorCount: number;
  };
  readonly context: {
    runtime: Record<string, any>;
    environment: Record<string, any>;
    extensions: string[];
  };
}

/**
 * System debug snapshot
 */
export interface SystemDebugSnapshot {
  readonly timestamp: Date;
  readonly system: {
    uptime: number;
    memory: NodeJS.MemoryUsage;
    cpu: NodeJS.CpuUsage;
    platform: string;
    nodeVersion: string;
  };
  readonly runtime: {
    agentCount: number;
    activeAgents: string[];
    lazyAgents: string[];
    extensions: string[];
    portals: string[];
  };
  readonly metrics: {
    eventRate: number;
    actionRate: number;
    errorRate: number;
    memoryUsage: number;
  };
  readonly agents: AgentDebugSnapshot[];
}

/**
 * Memory profiler for tracking allocations
 */
export class MemoryProfiler {
  private snapshots: Map<string, NodeJS.MemoryUsage> = new Map();
  private leakDetector: Map<string, number> = new Map();
  private readonly thresholds = {
    heapUsedGrowth: 50 * 1024 * 1024, // 50MB
    rssGrowth: 100 * 1024 * 1024, // 100MB
  };

  /**
   * Take a memory snapshot
   */
  public takeSnapshot(label: string = 'default'): NodeJS.MemoryUsage {
    const snapshot = process.memoryUsage();
    this.snapshots.set(label, snapshot);
    return snapshot;
  }

  /**
   * Compare memory usage between snapshots
   */
  public compareSnapshots(
    before: string = 'before',
    after: string = 'after'
  ): {
    heapUsedDiff: number;
    heapTotalDiff: number;
    rssDiff: number;
    externalDiff: number;
    arrayBuffersDiff: number;
    summary: string;
  } {
    const beforeSnapshot = this.snapshots.get(before);
    const afterSnapshot = this.snapshots.get(after);

    if (!beforeSnapshot || !afterSnapshot) {
      throw new Error(`Snapshots '${before}' or '${after}' not found`);
    }

    const heapUsedDiff = afterSnapshot.heapUsed - beforeSnapshot.heapUsed;
    const heapTotalDiff = afterSnapshot.heapTotal - beforeSnapshot.heapTotal;
    const rssDiff = afterSnapshot.rss - beforeSnapshot.rss;
    const externalDiff = afterSnapshot.external - beforeSnapshot.external;
    const arrayBuffersDiff =
      afterSnapshot.arrayBuffers - beforeSnapshot.arrayBuffers;

    const summary = [
      `Heap Used: ${this.formatBytes(heapUsedDiff)}`,
      `Heap Total: ${this.formatBytes(heapTotalDiff)}`,
      `RSS: ${this.formatBytes(rssDiff)}`,
      `External: ${this.formatBytes(externalDiff)}`,
      `Array Buffers: ${this.formatBytes(arrayBuffersDiff)}`,
    ].join(', ');

    return {
      heapUsedDiff,
      heapTotalDiff,
      rssDiff,
      externalDiff,
      arrayBuffersDiff,
      summary,
    };
  }

  /**
   * Check for memory leaks
   */
  public checkForLeaks(label: string): {
    hasLeak: boolean;
    details: string[];
    recommendations: string[];
  } {
    const current = process.memoryUsage();
    const baseline = this.snapshots.get(label);

    if (!baseline) {
      return {
        hasLeak: false,
        details: ['No baseline snapshot available'],
        recommendations: ['Take a baseline snapshot first'],
      };
    }

    const details: string[] = [];
    const recommendations: string[] = [];
    let hasLeak = false;

    const heapGrowth = current.heapUsed - baseline.heapUsed;
    const rssGrowth = current.rss - baseline.rss;

    if (heapGrowth > this.thresholds.heapUsedGrowth) {
      hasLeak = true;
      details.push(`Heap usage increased by ${this.formatBytes(heapGrowth)}`);
      recommendations.push('Check for retained objects or circular references');
    }

    if (rssGrowth > this.thresholds.rssGrowth) {
      hasLeak = true;
      details.push(`RSS increased by ${this.formatBytes(rssGrowth)}`);
      recommendations.push('Check for native memory leaks or large buffers');
    }

    const growthRate =
      heapGrowth / (Date.now() - (this.leakDetector.get(label) || Date.now()));
    if (growthRate > 1000) {
      // 1KB per millisecond
      hasLeak = true;
      details.push(
        `High memory growth rate: ${this.formatBytes(growthRate * 1000)}/second`
      );
      recommendations.push('Monitor for continuous memory allocation patterns');
    }

    this.leakDetector.set(label, Date.now());

    return { hasLeak, details, recommendations };
  }

  /**
   * Get all snapshots
   */
  public getAllSnapshots(): Map<string, NodeJS.MemoryUsage> {
    return new Map(this.snapshots);
  }

  /**
   * Clear all snapshots
   */
  public clearSnapshots(): void {
    this.snapshots.clear();
    this.leakDetector.clear();
  }

  /**
   * Format bytes for display
   */
  private formatBytes(bytes: number): string {
    const sign = bytes >= 0 ? '+' : '';
    const abs = Math.abs(bytes);

    if (abs >= 1024 * 1024 * 1024) {
      return `${sign}${(bytes / (1024 * 1024 * 1024)).toFixed(2)}GB`;
    } else if (abs >= 1024 * 1024) {
      return `${sign}${(bytes / (1024 * 1024)).toFixed(2)}MB`;
    } else if (abs >= 1024) {
      return `${sign}${(bytes / 1024).toFixed(2)}KB`;
    } else {
      return `${sign}${bytes}B`;
    }
  }
}

/**
 * Call stack tracer for debugging execution paths
 */
export class CallStackTracer {
  private traces: Map<string, string[]> = new Map();
  private activeTraces: Set<string> = new Set();

  /**
   * Start tracing a call stack
   */
  public startTrace(traceId: string): void {
    this.traces.set(traceId, []);
    this.activeTraces.add(traceId);
  }

  /**
   * Add a call to the trace
   */
  public addCall(traceId: string, functionName: string, args?: any[]): void {
    if (!this.activeTraces.has(traceId)) {
      return;
    }

    const stack = new Error().stack;
    const caller = stack?.split('\n')[3]?.trim() || 'unknown';

    const trace = this.traces.get(traceId) || [];
    const argsStr = args
      ? ` with args: ${inspect(args, { depth: 2, maxArrayLength: 5 })}`
      : '';
    trace.push(`${functionName}${argsStr} (called from ${caller})`);

    this.traces.set(traceId, trace);
  }

  /**
   * End tracing and get the call stack
   */
  public endTrace(traceId: string): string[] {
    this.activeTraces.delete(traceId);
    return this.traces.get(traceId) || [];
  }

  /**
   * Get current trace
   */
  public getTrace(traceId: string): string[] {
    return this.traces.get(traceId) || [];
  }

  /**
   * Clear all traces
   */
  public clearTraces(): void {
    this.traces.clear();
    this.activeTraces.clear();
  }
}

/**
 * Advanced debugging utilities
 */
export class DebugUtilities {
  private static instance: DebugUtilities;

  private sessions: Map<string, DebugSession> = new Map();
  private traces: DebugTrace[] = [];
  private memoryProfiler = new MemoryProfiler();
  private callStackTracer = new CallStackTracer();

  private readonly config = {
    maxTraces: 10000,
    maxSessionDuration: 24 * 60 * 60 * 1000, // 24 hours
    outputDirectory: './debug-output',
    enablePerformanceTracing: true,
    enableMemoryProfiling: true,
  };

  private constructor() {
    this.ensureOutputDirectory();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): DebugUtilities {
    if (!DebugUtilities.instance) {
      DebugUtilities.instance = new DebugUtilities();
    }
    return DebugUtilities.instance;
  }

  /**
   * Create a new debug session
   */
  public createSession(
    name: string,
    level: DebugLevel = DebugLevel.DEBUG,
    filters: DebugFilter[] = [],
    outputs: DebugOutput[] = []
  ): string {
    const sessionId = `debug_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const session: DebugSession = {
      id: sessionId,
      name,
      startTime: new Date(),
      level,
      filters,
      outputs:
        outputs.length > 0
          ? outputs
          : [
              {
                type: 'console',
                config: {},
                enabled: true,
              },
            ],
      active: true,
    };

    this.sessions.set(sessionId, session);

    this.trace(
      DebugLevel.INFO,
      'debug',
      `Debug session '${name}' started`,
      {
        sessionId,
        level: DebugLevel[level],
        filters: filters.length,
        outputs: outputs.length,
      },
      { sessionId }
    );

    // Auto-cleanup after max duration
    setTimeout(() => {
      this.endSession(sessionId);
    }, this.config.maxSessionDuration);

    return sessionId;
  }

  /**
   * End a debug session
   */
  public endSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    session.active = false;

    this.trace(
      DebugLevel.INFO,
      'debug',
      `Debug session '${session.name}' ended`,
      {
        sessionId,
        duration: Date.now() - session.startTime.getTime(),
      },
      { sessionId }
    );

    // Generate session report
    this.generateSessionReport(session);

    return true;
  }

  /**
   * Add a debug trace
   */
  public trace(
    level: DebugLevel,
    category: string,
    message: string,
    data?: any,
    context?: DebugContext
  ): void {
    const trace: DebugTrace = {
      id: `trace_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      timestamp: new Date(),
      level,
      category,
      message,
      data,
      context,
      stack: level >= DebugLevel.ERROR ? new Error().stack : undefined,
      performance: this.config.enablePerformanceTracing
        ? {
            memory: process.memoryUsage().heapUsed,
          }
        : undefined,
    };

    this.traces.push(trace);

    // Trim traces to prevent memory growth
    if (this.traces.length > this.config.maxTraces) {
      this.traces = this.traces.slice(-this.config.maxTraces);
    }

    // Process trace for active sessions
    this.processTrace(trace);
  }

  /**
   * Debug an agent's state
   */
  public debugAgent(agent: Agent, context?: DebugContext): AgentDebugSnapshot {
    const snapshot: AgentDebugSnapshot = {
      agentId: agent.id,
      agentName: agent.name,
      timestamp: new Date(),
      state: {
        status: agent.status,
        currentEmotion: agent.emotion?.current || 'unknown',
        emotionIntensity: agent.emotion?.intensity || 0,
        recentMemories: [], // Would retrieve from memory provider
        recentThoughts: [], // Would retrieve from cognition module
        activeActions: [], // Would retrieve from action queue
        configuration: agent.config ? this.sanitizeConfig(agent.config) : {},
      },
      performance: {
        thinkTime: 0, // Would get from performance monitor
        responseTime: 0,
        memoryUsage: 0,
        actionCount: 0,
        errorCount: 0,
      },
      context: {
        runtime: {
          uptime: process.uptime(),
          pid: process.pid,
        },
        environment: {
          nodeVersion: process.version,
          platform: process.platform,
        },
        extensions: agent.extensions?.map((ext) => ext.name) || [],
      },
    };

    this.trace(
      DebugLevel.DEBUG,
      'agent',
      `Agent snapshot taken for ${agent.name}`,
      snapshot,
      context
    );

    return snapshot;
  }

  /**
   * Debug system state
   */
  public debugSystem(agents: Agent[] = []): SystemDebugSnapshot {
    const systemMetrics = performanceMonitor.getSystemMetrics();

    const snapshot: SystemDebugSnapshot = {
      timestamp: new Date(),
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        platform: process.platform,
        nodeVersion: process.version,
      },
      runtime: {
        agentCount: agents.length,
        activeAgents: agents
          .filter((a) => a.status === 'active')
          .map((a) => a.id),
        lazyAgents: [], // Would get from runtime
        extensions: [], // Would get from runtime
        portals: [], // Would get from runtime
      },
      metrics: {
        eventRate: 0, // Would calculate from performance monitor
        actionRate: 0,
        errorRate: 0,
        memoryUsage: systemMetrics.memory.usage,
      },
      agents: agents.map((agent) => this.debugAgent(agent)),
    };

    this.trace(DebugLevel.DEBUG, 'system', 'System snapshot taken', snapshot);

    return snapshot;
  }

  /**
   * Profile memory usage for a function
   */
  public async profileMemory<T>(
    name: string,
    fn: () => Promise<T> | T,
    context?: DebugContext
  ): Promise<{ result: T; profile: any }> {
    this.memoryProfiler.takeSnapshot(`${name}_before`);

    const startTime = performance.now();

    try {
      const result = await fn();
      const endTime = performance.now();

      this.memoryProfiler.takeSnapshot(`${name}_after`);
      const comparison = this.memoryProfiler.compareSnapshots(
        `${name}_before`,
        `${name}_after`
      );
      const leakCheck = this.memoryProfiler.checkForLeaks(`${name}_before`);

      const profile = {
        duration: endTime - startTime,
        memory: comparison,
        leakCheck,
      };

      this.trace(
        DebugLevel.DEBUG,
        'memory',
        `Memory profile for ${name}`,
        profile,
        context
      );

      return { result, profile };
    } catch (error) {
      this.trace(
        DebugLevel.ERROR,
        'memory',
        `Memory profiling failed for ${name}`,
        { error },
        context
      );
      throw error;
    }
  }

  /**
   * Trace execution path
   */
  public traceExecution<T>(
    name: string,
    fn: () => Promise<T> | T,
    context?: DebugContext
  ): Promise<{ result: T; trace: string[] }> | { result: T; trace: string[] } {
    const traceId = `exec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    this.callStackTracer.startTrace(traceId);
    this.callStackTracer.addCall(traceId, name);

    const executeWithTrace = async (): Promise<{
      result: T;
      trace: string[];
    }> => {
      try {
        const result = await fn();
        const trace = this.callStackTracer.endTrace(traceId);

        this.trace(
          DebugLevel.DEBUG,
          'execution',
          `Execution trace for ${name}`,
          { trace },
          context
        );

        return { result, trace };
      } catch (error) {
        const trace = this.callStackTracer.endTrace(traceId);
        this.trace(
          DebugLevel.ERROR,
          'execution',
          `Execution failed for ${name}`,
          { error, trace },
          context
        );
        throw error;
      }
    };

    // Handle both sync and async functions
    const isAsync =
      fn.constructor.name === 'AsyncFunction' ||
      (typeof fn === 'function' && fn.toString().includes('async'));

    if (isAsync) {
      return executeWithTrace();
    } else {
      try {
        const result = fn() as T;
        const trace = this.callStackTracer.endTrace(traceId);

        this.trace(
          DebugLevel.DEBUG,
          'execution',
          `Execution trace for ${name}`,
          { trace },
          context
        );

        return { result, trace };
      } catch (error) {
        const trace = this.callStackTracer.endTrace(traceId);
        this.trace(
          DebugLevel.ERROR,
          'execution',
          `Execution failed for ${name}`,
          { error, trace },
          context
        );
        throw error;
      }
    }
  }

  /**
   * Export debug data
   */
  public exportData(format: 'json' | 'csv' | 'html' = 'json'): string {
    const data = {
      sessions: Array.from(this.sessions.values()),
      traces: this.traces,
      memorySnapshots: Array.from(
        this.memoryProfiler.getAllSnapshots().entries()
      ),
      systemInfo: {
        platform: process.platform,
        nodeVersion: process.version,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
      },
      exportTimestamp: new Date(),
    };

    switch (format) {
      case 'json':
        return JSON.stringify(data, null, 2);

      case 'csv':
        return this.convertToCSV(data);

      case 'html':
        return this.convertToHTML(data);

      default:
        return JSON.stringify(data, null, 2);
    }
  }

  /**
   * Save debug report to file
   */
  public saveReport(filename?: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const file = filename || `debug-report-${timestamp}.json`;
    const filepath = join(this.config.outputDirectory, file);

    const data = this.exportData('json');
    writeFileSync(filepath, data, 'utf8');

    this.trace(DebugLevel.INFO, 'debug', `Debug report saved to ${filepath}`);

    return filepath;
  }

  /**
   * Get debug statistics
   */
  public getStatistics(): {
    sessions: number;
    activeSession: number;
    traces: number;
    memorySnapshots: number;
    averageTraceLevel: number;
    topCategories: Array<{ category: string; count: number }>;
    errorRate: number;
  } {
    const activeSessions = Array.from(this.sessions.values()).filter(
      (s) => s.active
    ).length;

    const categoryCount = new Map<string, number>();
    let totalLevel = 0;
    let errorCount = 0;

    for (const trace of this.traces) {
      categoryCount.set(
        trace.category,
        (categoryCount.get(trace.category) || 0) + 1
      );
      totalLevel += trace.level;
      if (trace.level >= DebugLevel.ERROR) {
        errorCount++;
      }
    }

    const topCategories = Array.from(categoryCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([category, count]) => ({ category, count }));

    return {
      sessions: this.sessions.size,
      activeSession: activeSessions,
      traces: this.traces.length,
      memorySnapshots: this.memoryProfiler.getAllSnapshots().size,
      averageTraceLevel:
        this.traces.length > 0 ? totalLevel / this.traces.length : 0,
      topCategories,
      errorRate: this.traces.length > 0 ? errorCount / this.traces.length : 0,
    };
  }

  /**
   * Clear all debug data
   */
  public clearAll(): void {
    this.sessions.clear();
    this.traces = [];
    this.memoryProfiler.clearSnapshots();
    this.callStackTracer.clearTraces();

    this.trace(DebugLevel.INFO, 'debug', 'All debug data cleared');
  }

  /**
   * Process trace for active sessions
   */
  private processTrace(trace: DebugTrace): void {
    for (const session of this.sessions.values()) {
      if (!session.active || trace.level < session.level) {
        continue;
      }

      // Apply filters
      let shouldInclude = true;
      for (const filter of session.filters) {
        const fieldValue = this.getFilterFieldValue(trace, filter.field);
        const matches =
          typeof filter.pattern === 'string'
            ? fieldValue.includes(filter.pattern)
            : filter.pattern.test(fieldValue);

        if (filter.type === 'include' && !matches) {
          shouldInclude = false;
          break;
        } else if (filter.type === 'exclude' && matches) {
          shouldInclude = false;
          break;
        }
      }

      if (!shouldInclude) {
        continue;
      }

      // Output trace to configured outputs
      for (const output of session.outputs) {
        if (!output.enabled) {
          continue;
        }

        this.outputTrace(trace, output, session);
      }
    }
  }

  /**
   * Output trace to specific output type
   */
  private outputTrace(
    trace: DebugTrace,
    output: DebugOutput,
    session: DebugSession
  ): void {
    const formatted = this.formatTrace(trace);

    switch (output.type) {
      case 'console':
        console.log(`[${session.name}] ${formatted}`);
        break;

      case 'file':
        this.writeToFile(
          formatted,
          output.config.filename || `debug-${session.id}.log`
        );
        break;

      case 'memory':
        // Store in memory buffer (implemented in output.config.buffer)
        break;

      case 'websocket':
        // Send via WebSocket (would need WebSocket connection)
        break;
    }
  }

  /**
   * Format trace for output
   */
  private formatTrace(trace: DebugTrace): string {
    const timestamp = trace.timestamp.toISOString();
    const level = DebugLevel[trace.level].padEnd(5);
    const category = trace.category.padEnd(10);

    let formatted = `${timestamp} [${level}] [${category}] ${trace.message}`;

    if (trace.data) {
      formatted += `\n  Data: ${inspect(trace.data, { depth: 3, colors: false })}`;
    }

    if (trace.context) {
      formatted += `\n  Context: ${inspect(trace.context, { depth: 2, colors: false })}`;
    }

    if (trace.performance) {
      formatted += `\n  Performance: ${inspect(trace.performance, { depth: 1, colors: false })}`;
    }

    if (trace.stack) {
      formatted += `\n  Stack: ${trace.stack}`;
    }

    return formatted;
  }

  /**
   * Get field value for filtering
   */
  private getFilterFieldValue(trace: DebugTrace, field?: string): string {
    if (!field) {
      return trace.message;
    }

    switch (field) {
      case 'category':
        return trace.category;
      case 'message':
        return trace.message;
      case 'level':
        return DebugLevel[trace.level];
      case 'data':
        return JSON.stringify(trace.data || {});
      case 'context':
        return JSON.stringify(trace.context || {});
      default:
        return trace.message;
    }
  }

  /**
   * Generate session report
   */
  private generateSessionReport(session: DebugSession): void {
    const sessionTraces = this.traces.filter(
      (t) =>
        t.context?.sessionId === session.id || t.timestamp >= session.startTime
    );

    const report = {
      session,
      summary: {
        duration: Date.now() - session.startTime.getTime(),
        traceCount: sessionTraces.length,
        errorCount: sessionTraces.filter((t) => t.level >= DebugLevel.ERROR)
          .length,
        categories: [...new Set(sessionTraces.map((t) => t.category))],
      },
      traces: sessionTraces,
    };

    const filename = `session-report-${session.id}.json`;
    const filepath = join(this.config.outputDirectory, filename);

    writeFileSync(filepath, JSON.stringify(report, null, 2), 'utf8');
  }

  /**
   * Sanitize configuration for debugging (remove sensitive data)
   */
  private sanitizeConfig(config: any): any {
    const sanitized = { ...config };
    const sensitiveKeys = ['apiKey', 'password', 'token', 'secret', 'key'];

    const sanitizeObject = (obj: any): any => {
      if (typeof obj !== 'object' || obj === null) {
        return obj;
      }

      const result: any = Array.isArray(obj) ? [] : {};

      for (const [key, value] of Object.entries(obj)) {
        if (
          sensitiveKeys.some((sensitive) =>
            key.toLowerCase().includes(sensitive)
          )
        ) {
          result[key] = '[REDACTED]';
        } else if (typeof value === 'object') {
          result[key] = sanitizeObject(value);
        } else {
          result[key] = value;
        }
      }

      return result;
    };

    return sanitizeObject(sanitized);
  }

  /**
   * Ensure output directory exists
   */
  private ensureOutputDirectory(): void {
    if (!existsSync(this.config.outputDirectory)) {
      mkdirSync(this.config.outputDirectory, { recursive: true });
    }
  }

  /**
   * Write to file
   */
  private writeToFile(content: string, filename: string): void {
    const filepath = join(this.config.outputDirectory, filename);
    writeFileSync(filepath, content + '\n', { flag: 'a' });
  }

  /**
   * Convert data to CSV format
   */
  private convertToCSV(data: any): string {
    const traces = data.traces;
    const headers = [
      'timestamp',
      'level',
      'category',
      'message',
      'sessionId',
      'agentId',
    ];

    const rows = traces.map((trace: DebugTrace) => [
      trace.timestamp.toISOString(),
      DebugLevel[trace.level],
      trace.category,
      JSON.stringify(trace.message),
      trace.context?.sessionId || '',
      trace.context?.agentId || '',
    ]);

    return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  }

  /**
   * Convert data to HTML format
   */
  private convertToHTML(data: any): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>SYMindX Debug Report</title>
      <style>
        body { font-family: monospace; margin: 20px; }
        .trace { margin: 10px 0; padding: 10px; border-left: 3px solid #ccc; }
        .error { border-left-color: #f00; }
        .warn { border-left-color: #fa0; }
        .info { border-left-color: #0af; }
        .debug { border-left-color: #ccc; }
        pre { background: #f5f5f5; padding: 10px; overflow-x: auto; }
      </style>
    </head>
    <body>
      <h1>SYMindX Debug Report</h1>
      <h2>Export Date: ${data.exportTimestamp}</h2>
      <h2>System Info</h2>
      <pre>${JSON.stringify(data.systemInfo, null, 2)}</pre>
      <h2>Debug Traces</h2>
      ${data.traces
        .map(
          (trace: DebugTrace) => `
        <div class="trace ${DebugLevel[trace.level].toLowerCase()}">
          <strong>${trace.timestamp.toISOString()} [${DebugLevel[trace.level]}] [${trace.category}]</strong><br>
          ${trace.message}
          ${trace.data ? `<pre>${JSON.stringify(trace.data, null, 2)}</pre>` : ''}
        </div>
      `
        )
        .join('')}
    </body>
    </html>
    `;
  }
}

/**
 * Global debug utilities instance
 */
export const debugUtilities = DebugUtilities.getInstance();

/**
 * Convenience functions for common debugging patterns
 */
export const debugAgent = (agent: Agent, context?: DebugContext) =>
  debugUtilities.debugAgent(agent, context);

export const debugSystem = (agents?: Agent[]) =>
  debugUtilities.debugSystem(agents);

export const traceExecution = <T>(
  name: string,
  fn: () => Promise<T> | T,
  context?: DebugContext
) => debugUtilities.traceExecution(name, fn, context);

export const profileMemory = <T>(
  name: string,
  fn: () => Promise<T> | T,
  context?: DebugContext
) => debugUtilities.profileMemory(name, fn, context);

/**
 * Debug decorator for automatic method tracing
 */
export function debug(
  category: string = 'method',
  level: DebugLevel = DebugLevel.DEBUG
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const methodName = `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      const context: DebugContext = {
        operationId: `${methodName}_${Date.now()}`,
        tags: ['decorated-method'],
        metadata: {
          className: target.constructor.name,
          methodName: propertyKey,
        },
      };

      debugUtilities.trace(
        level,
        category,
        `Starting ${methodName}`,
        { args },
        context
      );

      try {
        const result = await originalMethod.apply(this, args);
        debugUtilities.trace(
          level,
          category,
          `Completed ${methodName}`,
          { result },
          context
        );
        return result;
      } catch (error) {
        debugUtilities.trace(
          DebugLevel.ERROR,
          category,
          `Failed ${methodName}`,
          { error },
          context
        );
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Create a debug session for specific operations
 */
export const createDebugSession = (
  name: string,
  level: DebugLevel = DebugLevel.DEBUG,
  filters: DebugFilter[] = []
) => debugUtilities.createSession(name, level, filters);

/**
 * Memory profiler instance
 */
export const memoryProfiler = new MemoryProfiler();

/**
 * Call stack tracer instance
 */
export const callStackTracer = new CallStackTracer();
