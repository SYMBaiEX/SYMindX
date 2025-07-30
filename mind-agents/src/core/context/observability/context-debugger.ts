/**
 * @module core/context/observability/context-debugger
 * @description Interactive debugging tools and utilities for context operations
 */

import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import { inspect } from 'util';
import type {
  ContextDebugger,
  ContextDebugInfo,
  ContextBreakpoint,
  ContextStackFrame,
  ContextDebugEvent,
  ContextHotSpot,
  ContextMemoryProfile,
  ContextTimeProfile,
  ContextObservabilityConfig,
} from '../../../types/context/context-observability.ts';
import { runtimeLogger } from '../../../utils/logger.ts';

interface DebugSession {
  sessionId: string;
  contextId: string;
  state: 'running' | 'paused' | 'stepping' | 'stopped';
  breakpoints: Map<string, ContextBreakpoint>;
  callStack: ContextStackFrame[];
  variables: Map<string, any>;
  history: ContextDebugEvent[];
  createdAt: Date;
  lastActivity: Date;
  stepMode?: 'into' | 'over' | 'out';
  pauseReason?: string;
}

interface PerformanceData {
  operation: string;
  startTime: number;
  endTime?: number;
  memoryBefore: number;
  memoryAfter?: number;
  cpuBefore: number;
  cpuAfter?: number;
}

/**
 * Interactive context debugger with breakpoints and step-through execution
 */
export class ContextDebuggerImpl
  extends EventEmitter
  implements ContextDebugger
{
  private sessions = new Map<string, DebugSession>();
  private config: ContextObservabilityConfig['debug'];
  private performanceData = new Map<string, PerformanceData[]>();
  private consoleIntegration?: any;

  constructor(config: ContextObservabilityConfig['debug']) {
    super();
    this.config = config;

    if (config.enabled && config.enableConsoleIntegration) {
      this.setupConsoleIntegration();
    }
  }

  /**
   * Start a new debug session
   */
  async startDebugSession(contextId: string): Promise<string> {
    if (!this.config.enabled) {
      throw new Error('Context debugging is disabled');
    }

    const sessionId = randomUUID();
    const now = new Date();

    const session: DebugSession = {
      sessionId,
      contextId,
      state: 'running',
      breakpoints: new Map(),
      callStack: [],
      variables: new Map(),
      history: [],
      createdAt: now,
      lastActivity: now,
    };

    this.sessions.set(sessionId, session);

    runtimeLogger.debug('Debug session started', { sessionId, contextId });
    this.emit('session_started', { sessionId, contextId });

    return sessionId;
  }

  /**
   * Stop a debug session
   */
  async stopDebugSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Debug session not found: ${sessionId}`);
    }

    session.state = 'stopped';
    session.lastActivity = new Date();

    // Add final debug event
    const stopEvent: ContextDebugEvent = {
      eventId: randomUUID(),
      eventType: 'step',
      timestamp: new Date(),
      location: {
        moduleId: 'debugger',
        operation: 'stop_session',
      },
      data: { reason: 'session_stopped' },
    };

    session.history.push(stopEvent);

    runtimeLogger.debug('Debug session stopped', {
      sessionId,
      contextId: session.contextId,
      duration: Date.now() - session.createdAt.getTime(),
    });

    this.emit('session_stopped', { sessionId, session });

    // Cleanup after a delay
    setTimeout(() => {
      this.sessions.delete(sessionId);
      runtimeLogger.debug('Debug session cleaned up', { sessionId });
    }, 60000); // 1 minute
  }

  /**
   * Set a breakpoint
   */
  async setBreakpoint(
    sessionId: string,
    breakpoint: Omit<
      ContextBreakpoint,
      'breakpointId' | 'hitCount' | 'createdAt'
    >
  ): Promise<string> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Debug session not found: ${sessionId}`);
    }

    const breakpointId = randomUUID();
    const fullBreakpoint: ContextBreakpoint = {
      ...breakpoint,
      breakpointId,
      hitCount: 0,
      createdAt: new Date(),
    };

    session.breakpoints.set(breakpointId, fullBreakpoint);
    session.lastActivity = new Date();

    runtimeLogger.debug('Breakpoint set', {
      sessionId,
      breakpointId,
      type: breakpoint.type,
      location: breakpoint.location,
    });

    this.emit('breakpoint_set', { sessionId, breakpoint: fullBreakpoint });

    return breakpointId;
  }

  /**
   * Remove a breakpoint
   */
  async removeBreakpoint(
    sessionId: string,
    breakpointId: string
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Debug session not found: ${sessionId}`);
    }

    const removed = session.breakpoints.delete(breakpointId);
    if (!removed) {
      throw new Error(`Breakpoint not found: ${breakpointId}`);
    }

    session.lastActivity = new Date();

    runtimeLogger.debug('Breakpoint removed', { sessionId, breakpointId });
    this.emit('breakpoint_removed', { sessionId, breakpointId });
  }

  /**
   * Step through execution
   */
  async step(sessionId: string, type: 'into' | 'over' | 'out'): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Debug session not found: ${sessionId}`);
    }

    if (session.state !== 'paused') {
      throw new Error(`Cannot step while session is ${session.state}`);
    }

    session.state = 'stepping';
    session.stepMode = type;
    session.lastActivity = new Date();

    const stepEvent: ContextDebugEvent = {
      eventId: randomUUID(),
      eventType: 'step',
      timestamp: new Date(),
      location: {
        moduleId: 'debugger',
        operation: 'step',
      },
      data: {
        stepType: type,
        callStackDepth: session.callStack.length,
      },
    };

    session.history.push(stepEvent);
    this.trimHistory(session);

    runtimeLogger.debug('Step command issued', {
      sessionId,
      stepType: type,
      currentDepth: session.callStack.length,
    });

    this.emit('step_issued', { sessionId, stepType: type });

    // Simulate stepping for demo (in real implementation, this would coordinate with execution)
    setTimeout(() => {
      if (session.state === 'stepping') {
        session.state = 'paused';
        this.emit('step_completed', { sessionId, stepType: type });
      }
    }, 100);
  }

  /**
   * Continue execution
   */
  async continue(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Debug session not found: ${sessionId}`);
    }

    session.state = 'running';
    session.stepMode = undefined;
    session.lastActivity = new Date();

    const continueEvent: ContextDebugEvent = {
      eventId: randomUUID(),
      eventType: 'step',
      timestamp: new Date(),
      location: {
        moduleId: 'debugger',
        operation: 'continue',
      },
      data: { reason: 'continue_requested' },
    };

    session.history.push(continueEvent);
    this.trimHistory(session);

    runtimeLogger.debug('Continue command issued', { sessionId });
    this.emit('continue_issued', { sessionId });
  }

  /**
   * Pause execution
   */
  async pause(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Debug session not found: ${sessionId}`);
    }

    if (session.state === 'stopped') {
      throw new Error('Cannot pause stopped session');
    }

    session.state = 'paused';
    session.pauseReason = 'user_requested';
    session.lastActivity = new Date();

    const pauseEvent: ContextDebugEvent = {
      eventId: randomUUID(),
      eventType: 'step',
      timestamp: new Date(),
      location: {
        moduleId: 'debugger',
        operation: 'pause',
      },
      data: { reason: 'user_requested' },
    };

    session.history.push(pauseEvent);
    this.trimHistory(session);

    runtimeLogger.debug('Pause command issued', { sessionId });
    this.emit('pause_issued', { sessionId });
  }

  /**
   * Inspect context variables
   */
  async inspectVariables(sessionId: string): Promise<Record<string, unknown>> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Debug session not found: ${sessionId}`);
    }

    session.lastActivity = new Date();

    const variables: Record<string, unknown> = {};

    // Convert Map to plain object with detailed inspection
    for (const [key, value] of session.variables.entries()) {
      variables[key] = {
        value: this.sanitizeValue(value),
        type: typeof value,
        mutable: this.isValueMutable(value),
        sensitive: this.isValueSensitive(key),
        inspection: inspect(value, {
          depth: 2,
          maxArrayLength: 10,
          breakLength: 80,
        }),
      };
    }

    runtimeLogger.debug('Variables inspected', {
      sessionId,
      variableCount: Object.keys(variables).length,
    });

    return variables;
  }

  /**
   * Evaluate expression in context
   */
  async evaluate(sessionId: string, expression: string): Promise<unknown> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Debug session not found: ${sessionId}`);
    }

    session.lastActivity = new Date();

    try {
      // Create a safe evaluation context
      const context = this.createEvaluationContext(session);

      // For security, only allow basic expressions
      if (!this.isExpressionSafe(expression)) {
        throw new Error('Unsafe expression not allowed');
      }

      // Simple evaluation (in production, use a safer evaluator)
      const result = this.evaluateExpression(expression, context);

      const evaluationEvent: ContextDebugEvent = {
        eventId: randomUUID(),
        eventType: 'variable_change',
        timestamp: new Date(),
        location: {
          moduleId: 'debugger',
          operation: 'evaluate',
        },
        data: {
          expression,
          result: this.sanitizeValue(result),
          success: true,
        },
      };

      session.history.push(evaluationEvent);
      this.trimHistory(session);

      runtimeLogger.debug('Expression evaluated', {
        sessionId,
        expression: expression.substring(0, 50),
        resultType: typeof result,
      });

      return result;
    } catch (error) {
      const evaluationEvent: ContextDebugEvent = {
        eventId: randomUUID(),
        eventType: 'variable_change',
        timestamp: new Date(),
        location: {
          moduleId: 'debugger',
          operation: 'evaluate',
        },
        data: {
          expression,
          error: error instanceof Error ? error.message : String(error),
          success: false,
        },
      };

      session.history.push(evaluationEvent);
      this.trimHistory(session);

      runtimeLogger.warn('Expression evaluation failed', {
        sessionId,
        expression: expression.substring(0, 50),
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  /**
   * Get complete debug information
   */
  async getDebugInfo(sessionId: string): Promise<ContextDebugInfo> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Debug session not found: ${sessionId}`);
    }

    session.lastActivity = new Date();

    const variables: Record<string, any> = {};
    for (const [key, value] of session.variables.entries()) {
      variables[key] = {
        value: this.sanitizeValue(value),
        type: typeof value,
        mutable: this.isValueMutable(value),
        sensitive: this.isValueSensitive(key),
      };
    }

    const currentPosition =
      session.callStack.length > 0
        ? {
            moduleId: session.callStack[0].moduleId,
            operation: session.callStack[0].operation,
            line: session.callStack[0].line,
            column: session.callStack[0].column,
            stackTrace: session.callStack.map(
              (frame) =>
                `${frame.moduleId}:${frame.operation}${frame.line ? `:${frame.line}` : ''}`
            ),
          }
        : {
            moduleId: 'unknown',
            operation: 'unknown',
            stackTrace: [],
          };

    const debugInfo: ContextDebugInfo = {
      contextId: session.contextId,
      debugSessionId: sessionId,
      state: session.state,
      breakpoints: Array.from(session.breakpoints.values()),
      position: currentPosition,
      variables,
      callStack: session.callStack,
      history: session.history.slice(-50), // Last 50 events
      profile: {
        hotSpots: this.generateHotSpots(session.contextId),
        memoryProfile: this.generateMemoryProfile(session.contextId),
        timeProfile: this.generateTimeProfile(session.contextId),
      },
    };

    runtimeLogger.debug('Debug info retrieved', {
      sessionId,
      contextId: session.contextId,
      breakpointsCount: debugInfo.breakpoints.length,
      historyCount: debugInfo.history.length,
    });

    return debugInfo;
  }

  /**
   * Simulate hitting a breakpoint
   */
  hitBreakpoint(
    sessionId: string,
    moduleId: string,
    operation: string,
    line?: number,
    variables?: Record<string, unknown>
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // Check if any breakpoints match
    const matchingBreakpoints = Array.from(session.breakpoints.values()).filter(
      (bp) => {
        if (
          bp.type === 'line' &&
          bp.location.moduleId === moduleId &&
          bp.location.operation === operation &&
          bp.location.line === line
        ) {
          return bp.enabled;
        }
        // Add other breakpoint type checks here
        return false;
      }
    );

    if (matchingBreakpoints.length === 0) return;

    // Hit the breakpoint
    session.state = 'paused';
    session.pauseReason = 'breakpoint_hit';
    session.lastActivity = new Date();

    // Update hit counts
    matchingBreakpoints.forEach((bp) => {
      bp.hitCount++;
    });

    // Update variables if provided
    if (variables) {
      for (const [key, value] of Object.entries(variables)) {
        session.variables.set(key, value);
      }
    }

    // Add stack frame
    const frame: ContextStackFrame = {
      frameId: randomUUID(),
      moduleId,
      operation,
      arguments: {},
      locals: variables || {},
      line,
      sourceFile: `${moduleId}.ts`,
    };

    session.callStack.unshift(frame);

    // Add debug event
    const breakpointEvent: ContextDebugEvent = {
      eventId: randomUUID(),
      eventType: 'breakpoint',
      timestamp: new Date(),
      location: { moduleId, operation, line },
      data: {
        breakpointIds: matchingBreakpoints.map((bp) => bp.breakpointId),
        variables: this.sanitizeValue(variables),
      },
    };

    session.history.push(breakpointEvent);
    this.trimHistory(session);

    runtimeLogger.debug('Breakpoint hit', {
      sessionId,
      moduleId,
      operation,
      line,
      breakpointCount: matchingBreakpoints.length,
    });

    this.emit('breakpoint_hit', {
      sessionId,
      breakpoints: matchingBreakpoints,
      location: { moduleId, operation, line },
    });
  }

  /**
   * Record performance data
   */
  recordPerformanceStart(contextId: string, operation: string): string {
    const perfId = randomUUID();
    const perfData: PerformanceData = {
      operation,
      startTime: performance.now(),
      memoryBefore: process.memoryUsage().heapUsed,
      cpuBefore: process.cpuUsage().user,
    };

    if (!this.performanceData.has(contextId)) {
      this.performanceData.set(contextId, []);
    }

    this.performanceData.get(contextId)!.push(perfData);

    return perfId;
  }

  /**
   * Complete performance recording
   */
  recordPerformanceEnd(contextId: string, operation: string): void {
    const contextPerf = this.performanceData.get(contextId);
    if (!contextPerf) return;

    const perfData = contextPerf.find(
      (p) => p.operation === operation && !p.endTime
    );
    if (!perfData) return;

    perfData.endTime = performance.now();
    perfData.memoryAfter = process.memoryUsage().heapUsed;
    perfData.cpuAfter = process.cpuUsage().user;
  }

  /**
   * Set up console integration for debugging
   */
  private setupConsoleIntegration(): void {
    if (typeof window !== 'undefined' && window.console) {
      // Browser environment
      this.consoleIntegration = {
        debug: (contextId: string, message: string, data?: any) => {
          console.group(`🔍 Context Debug: ${contextId}`);
          console.log(message);
          if (data) console.log(data);
          console.groupEnd();
        },

        inspect: (contextId: string, variables: Record<string, unknown>) => {
          console.group(`🔍 Context Variables: ${contextId}`);
          console.table(variables);
          console.groupEnd();
        },
      };
    } else {
      // Node.js environment
      this.consoleIntegration = {
        debug: (contextId: string, message: string, data?: any) => {
          console.log(`🔍 [${contextId}] ${message}`);
          if (data) console.log(inspect(data, { colors: true, depth: 2 }));
        },

        inspect: (contextId: string, variables: Record<string, unknown>) => {
          console.log(`🔍 Variables for ${contextId}:`);
          console.log(inspect(variables, { colors: true, depth: 2 }));
        },
      };
    }

    runtimeLogger.debug('Console integration enabled');
  }

  /**
   * Generate hot spots analysis
   */
  private generateHotSpots(contextId: string): ContextHotSpot[] {
    const contextPerf = this.performanceData.get(contextId) || [];
    const operationStats = new Map<
      string,
      { count: number; totalTime: number }
    >();

    contextPerf.forEach((perf) => {
      if (perf.endTime) {
        const duration = perf.endTime - perf.startTime;
        const existing = operationStats.get(perf.operation) || {
          count: 0,
          totalTime: 0,
        };
        operationStats.set(perf.operation, {
          count: existing.count + 1,
          totalTime: existing.totalTime + duration,
        });
      }
    });

    const totalTime = Array.from(operationStats.values()).reduce(
      (sum, stats) => sum + stats.totalTime,
      0
    );

    return Array.from(operationStats.entries())
      .map(([operation, stats]) => ({
        location: `context:${contextId}`,
        operation,
        executionCount: stats.count,
        totalTime: stats.totalTime,
        averageTime: stats.totalTime / stats.count,
        percentOfTotal: totalTime > 0 ? (stats.totalTime / totalTime) * 100 : 0,
        suggestions: this.generateOptimizationSuggestions(operation, stats),
      }))
      .sort((a, b) => b.totalTime - a.totalTime)
      .slice(0, 10); // Top 10 hot spots
  }

  /**
   * Generate memory profile
   */
  private generateMemoryProfile(contextId: string): ContextMemoryProfile {
    const contextPerf = this.performanceData.get(contextId) || [];

    const allocations = contextPerf
      .filter(
        (perf) => perf.memoryAfter && perf.memoryAfter > perf.memoryBefore
      )
      .map((perf) => ({
        location: `${contextId}:${perf.operation}`,
        size: perf.memoryAfter! - perf.memoryBefore,
        type: 'heap',
        timestamp: new Date(Date.now() - (performance.now() - perf.startTime)),
      }));

    const totalAllocated = allocations.reduce(
      (sum, alloc) => sum + alloc.size,
      0
    );
    const currentUsage = process.memoryUsage().heapUsed;
    const peakUsage = Math.max(
      ...contextPerf.map((p) => p.memoryAfter || p.memoryBefore)
    );

    return {
      totalAllocated,
      currentUsage,
      peakUsage,
      allocations,
      leaks: [], // Would need more sophisticated leak detection
    };
  }

  /**
   * Generate time profile
   */
  private generateTimeProfile(contextId: string): ContextTimeProfile {
    const contextPerf = this.performanceData.get(contextId) || [];

    const operationTimes: Record<string, any> = {};
    let totalExecutionTime = 0;

    contextPerf.forEach((perf) => {
      if (perf.endTime) {
        const duration = perf.endTime - perf.startTime;
        totalExecutionTime += duration;

        if (!operationTimes[perf.operation]) {
          operationTimes[perf.operation] = {
            totalTime: 0,
            callCount: 0,
            minTime: Infinity,
            maxTime: 0,
          };
        }

        const opTime = operationTimes[perf.operation];
        opTime.totalTime += duration;
        opTime.callCount++;
        opTime.minTime = Math.min(opTime.minTime, duration);
        opTime.maxTime = Math.max(opTime.maxTime, duration);
        opTime.averageTime = opTime.totalTime / opTime.callCount;
      }
    });

    const criticalPath = contextPerf
      .filter((perf) => perf.endTime)
      .sort((a, b) => a.startTime - b.startTime)
      .map((perf) => ({
        operation: perf.operation,
        duration: perf.endTime! - perf.startTime,
        startTime: new Date(Date.now() - (performance.now() - perf.startTime)),
        dependencies: [], // Would need dependency tracking
      }));

    return {
      totalExecutionTime,
      operationTimes,
      criticalPath,
    };
  }

  /**
   * Helper methods
   */
  private trimHistory(session: DebugSession): void {
    if (session.history.length > this.config.maxDebugHistorySize) {
      session.history = session.history.slice(-this.config.maxDebugHistorySize);
    }
  }

  private sanitizeValue(value: unknown): unknown {
    if (value === null || value === undefined) return value;

    if (typeof value === 'object') {
      // Avoid circular references and limit depth
      try {
        return JSON.parse(JSON.stringify(value, null, 2));
      } catch {
        return '[Circular Reference]';
      }
    }

    return value;
  }

  private isValueMutable(value: unknown): boolean {
    return typeof value === 'object' && value !== null;
  }

  private isValueSensitive(key: string): boolean {
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth'];
    return sensitiveKeys.some((sensitive) =>
      key.toLowerCase().includes(sensitive.toLowerCase())
    );
  }

  private createEvaluationContext(
    session: DebugSession
  ): Record<string, unknown> {
    const context: Record<string, unknown> = {};

    // Add session variables to context
    for (const [key, value] of session.variables.entries()) {
      context[key] = value;
    }

    // Add some safe utilities
    context.console = { log: console.log, error: console.error };
    context.JSON = JSON;
    context.Math = Math;
    context.Date = Date;

    return context;
  }

  private isExpressionSafe(expression: string): boolean {
    // Block dangerous operations
    const dangerous = [
      'eval',
      'Function',
      'require',
      'import',
      'process',
      'global',
      '__proto__',
      'constructor',
      'prototype',
      'delete',
      'with',
    ];

    return !dangerous.some((keyword) => expression.includes(keyword));
  }

  private evaluateExpression(
    expression: string,
    context: Record<string, unknown>
  ): unknown {
    // Simple expression evaluation (in production, use a proper safe evaluator)
    try {
      // Create function with context as parameters
      const keys = Object.keys(context);
      const values = Object.values(context);
      const func = new Function(...keys, `return ${expression}`);
      return func(...values);
    } catch (error) {
      throw new Error(
        `Evaluation error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private generateOptimizationSuggestions(
    operation: string,
    stats: { count: number; totalTime: number }
  ): string[] {
    const suggestions: string[] = [];

    if (stats.totalTime > 1000) {
      suggestions.push('Consider optimizing this slow operation');
    }

    if (stats.count > 100) {
      suggestions.push('High call frequency - consider caching results');
    }

    if (operation.includes('transform')) {
      suggestions.push('Consider incremental transformation strategies');
    }

    if (operation.includes('access')) {
      suggestions.push('Optimize data access patterns');
    }

    return suggestions;
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    // Stop all active sessions
    for (const [sessionId] of this.sessions) {
      this.stopDebugSession(sessionId).catch(() => {
        // Ignore errors during cleanup
      });
    }

    this.sessions.clear();
    this.performanceData.clear();
    this.removeAllListeners();

    runtimeLogger.debug('Context debugger disposed');
  }

  /**
   * Get debugger statistics
   */
  getStatistics() {
    const activeSessions = Array.from(this.sessions.values()).filter(
      (s) => s.state !== 'stopped'
    ).length;

    return {
      totalSessions: this.sessions.size,
      activeSessions,
      totalBreakpoints: Array.from(this.sessions.values()).reduce(
        (sum, s) => sum + s.breakpoints.size,
        0
      ),
      performanceDataPoints: Array.from(this.performanceData.values()).reduce(
        (sum, data) => sum + data.length,
        0
      ),
      config: this.config,
    };
  }
}
