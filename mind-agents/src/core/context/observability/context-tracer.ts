/**
 * @module core/context/observability/context-tracer
 * @description Distributed tracing implementation for context flow tracking
 */

import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import type {
  ContextTracer,
  ContextTrace,
  ContextObservabilityConfig,
  ContextTransformationTrace,
  ContextAccessTrace,
  ContextFlowNode,
  ContextBottleneck,
  ContextEntryPoint,
  ContextExitPoint,
} from '../../../types/context/context-observability.ts';
import type { TraceSpan } from '../../../types/observability/index.ts';
import type { AgentId } from '../../../types/helpers.ts';
import { runtimeLogger } from '../../../utils/logger.ts';

/**
 * OpenTelemetry-compatible context tracer implementation
 */
export class ContextTracerImpl extends EventEmitter implements ContextTracer {
  private traces = new Map<string, ContextTrace>();
  private spans = new Map<string, TraceSpan>();
  private config: ContextObservabilityConfig['tracing'];
  private startTime = Date.now();

  constructor(config: ContextObservabilityConfig['tracing']) {
    super();
    this.config = config;
    this.setupCleanup();
  }

  /**
   * Start tracing a context instance
   */
  async startTrace(
    contextId: string,
    parentTrace?: ContextTrace
  ): Promise<ContextTrace> {
    if (!this.config.enabled) {
      throw new Error('Context tracing is disabled');
    }

    // Check sampling
    if (Math.random() > this.config.sampleRate) {
      runtimeLogger.debug('Trace skipped due to sampling', {
        contextId,
        sampleRate: this.config.sampleRate,
      });
      throw new Error('Trace not sampled');
    }

    const traceId = randomUUID();
    const now = new Date();

    const trace: ContextTrace = {
      // TraceContext properties
      traceId,
      spanId: randomUUID(),
      parentSpanId: parentTrace?.spanId,
      sampled: true,
      flags: 1,
      baggage: {},
      startTime: now,
      metadata: {},

      // ContextTrace specific properties
      contextId,
      contextType: this.inferContextType(contextId),
      hierarchy: {
        parentContextId: parentTrace?.contextId,
        childContextIds: [],
        depth: parentTrace ? parentTrace.hierarchy.depth + 1 : 0,
        rootContextId: parentTrace?.hierarchy.rootContextId || contextId,
      },
      lifecycle: {
        created: now,
      },
      transformations: [],
      accessPatterns: [],
      sharing: {
        shareCount: 0,
        sharedWith: [],
        shareType: 'read',
        isolationLevel: 'weak',
      },
      flow: {
        entryPoints: [],
        exitPoints: [],
        criticalPath: [],
        bottlenecks: [],
      },
      quality: {
        completeness: 1,
        consistency: 1,
        freshness: 1,
        relevance: 1,
        reliability: 1,
      },
    };

    // Update parent trace if exists
    if (parentTrace) {
      parentTrace.hierarchy.childContextIds.push(contextId);
    }

    this.traces.set(contextId, trace);

    // Check depth limits
    if (trace.hierarchy.depth > this.config.maxContextDepth) {
      runtimeLogger.warn('Context trace depth exceeded', {
        contextId,
        depth: trace.hierarchy.depth,
        maxDepth: this.config.maxContextDepth,
      });
    }

    runtimeLogger.debug('Context trace started', {
      contextId,
      traceId,
      parentTraceId: parentTrace?.traceId,
      depth: trace.hierarchy.depth,
    });

    this.emit('trace_started', { contextId, trace });

    return trace;
  }

  /**
   * End tracing for a context
   */
  async endTrace(contextId: string): Promise<void> {
    const trace = this.traces.get(contextId);
    if (!trace) {
      runtimeLogger.warn('Attempted to end non-existent trace', { contextId });
      return;
    }

    const now = new Date();
    trace.lifecycle.destroyed = now;
    trace.lifecycle.totalLifetimeMs =
      now.getTime() - trace.lifecycle.created.getTime();

    // Calculate quality metrics
    this.calculateQualityMetrics(trace);

    // Detect bottlenecks
    this.detectBottlenecks(trace);

    runtimeLogger.debug('Context trace ended', {
      contextId,
      traceId: trace.traceId,
      lifetimeMs: trace.lifecycle.totalLifetimeMs,
      transformations: trace.transformations.length,
      accesses: trace.accessPatterns.length,
    });

    this.emit('trace_ended', { contextId, trace });

    // Keep trace for retention period
    setTimeout(() => {
      this.traces.delete(contextId);
      runtimeLogger.debug('Context trace cleaned up', { contextId });
    }, this.config.traceRetentionMs);
  }

  /**
   * Create a span for an operation
   */
  async createSpan(
    contextId: string,
    operation: string,
    metadata: Record<string, unknown> = {}
  ): Promise<TraceSpan> {
    const trace = this.traces.get(contextId);
    if (!trace) {
      throw new Error(`No active trace for context: ${contextId}`);
    }

    const spanId = randomUUID();
    const now = new Date();

    const span: TraceSpan = {
      spanId,
      traceId: trace.traceId,
      parentSpanId: trace.spanId,
      operationName: operation,
      kind: 'internal',
      startTime: now,
      status: { code: 'ok' },
      tags: {
        'context.id': contextId,
        'context.type': trace.contextType,
        'context.depth': trace.hierarchy.depth,
      },
      events: [],
      resource: {
        serviceName: 'symindx-agent',
        serviceVersion: '1.0.0',
        instanceId: process.env.INSTANCE_ID || 'default',
        environment: process.env.NODE_ENV || 'development',
      },
    };

    // Add metadata as tags
    Object.entries(metadata).forEach(([key, value]) => {
      if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
      ) {
        span.tags[key] = value;
      }
    });

    this.spans.set(spanId, span);

    runtimeLogger.debug('Context span created', {
      contextId,
      spanId,
      operation,
      parentSpanId: span.parentSpanId,
    });

    return span;
  }

  /**
   * Finish a span
   */
  async finishSpan(
    spanId: string,
    result?: unknown,
    error?: Error
  ): Promise<void> {
    const span = this.spans.get(spanId);
    if (!span) {
      runtimeLogger.warn('Attempted to finish non-existent span', { spanId });
      return;
    }

    const now = new Date();
    span.endTime = now;
    span.duration = now.getTime() - span.startTime.getTime();

    if (error) {
      span.status = {
        code: 'error',
        message: error.message,
      };
      span.events.push({
        timestamp: now,
        name: 'error',
        attributes: {
          'error.type': error.constructor.name,
          'error.message': error.message,
          'error.stack': error.stack,
        },
      });
    } else {
      span.status = { code: 'ok' };
    }

    if (result !== undefined) {
      span.events.push({
        timestamp: now,
        name: 'result',
        attributes: {
          'result.type': typeof result,
          'result.size': JSON.stringify(result).length,
        },
      });
    }

    runtimeLogger.debug('Context span finished', {
      spanId,
      operation: span.operationName,
      duration: span.duration,
      status: span.status.code,
    });

    this.emit('span_finished', { spanId, span });

    // Keep span for a short time then remove
    setTimeout(() => {
      this.spans.delete(spanId);
    }, 60000); // 1 minute
  }

  /**
   * Get active traces
   */
  getActiveTraces(): ContextTrace[] {
    return Array.from(this.traces.values()).filter(
      (trace) => !trace.lifecycle.destroyed
    );
  }

  /**
   * Get trace by context ID
   */
  getTrace(contextId: string): ContextTrace | undefined {
    return this.traces.get(contextId);
  }

  /**
   * Export traces in various formats
   */
  async exportTraces(format: 'json' | 'jaeger' | 'zipkin'): Promise<string> {
    const traces = Array.from(this.traces.values());

    switch (format) {
      case 'json':
        return JSON.stringify(traces, null, 2);

      case 'jaeger':
        return this.exportJaegerFormat(traces);

      case 'zipkin':
        return this.exportZipkinFormat(traces);

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Record a context transformation
   */
  recordTransformation(
    contextId: string,
    transformationType: string,
    inputSize: number,
    outputSize: number,
    duration: number,
    success: boolean,
    error?: string,
    metadata: Record<string, unknown> = {}
  ): void {
    const trace = this.traces.get(contextId);
    if (!trace) return;

    const transformation: ContextTransformationTrace = {
      transformationId: randomUUID(),
      transformationType,
      appliedAt: new Date(),
      duration,
      inputSize,
      outputSize,
      success,
      error,
      metadata,
    };

    trace.transformations.push(transformation);

    // Update quality metrics
    if (!success) {
      trace.quality.reliability = Math.max(0, trace.quality.reliability - 0.1);
    }

    runtimeLogger.debug('Context transformation recorded', {
      contextId,
      transformationType,
      success,
      duration,
      dataReduction:
        (((inputSize - outputSize) / inputSize) * 100).toFixed(1) + '%',
    });
  }

  /**
   * Record a context access
   */
  recordAccess(
    contextId: string,
    accessor: string,
    accessType: 'read' | 'write' | 'merge' | 'transform',
    duration: number,
    dataSize: number,
    success: boolean,
    error?: string,
    callStack?: string[]
  ): void {
    const trace = this.traces.get(contextId);
    if (!trace) return;

    const access: ContextAccessTrace = {
      accessId: randomUUID(),
      accessor,
      accessType,
      accessedAt: new Date(),
      duration,
      dataSize,
      success,
      error,
      callStack,
    };

    trace.accessPatterns.push(access);

    // Update lifecycle timestamps
    if (!trace.lifecycle.firstAccess) {
      trace.lifecycle.firstAccess = access.accessedAt;
    }
    trace.lifecycle.lastAccess = access.accessedAt;

    // Update sharing information
    if (!trace.sharing.sharedWith.includes(accessor)) {
      trace.sharing.sharedWith.push(accessor);
      trace.sharing.shareCount++;
    }

    runtimeLogger.debug('Context access recorded', {
      contextId,
      accessor,
      accessType,
      success,
      duration,
      dataSize,
    });
  }

  /**
   * Record entry point
   */
  recordEntryPoint(
    contextId: string,
    source: string,
    entryType: 'creation' | 'injection' | 'merge' | 'transform',
    dataSize: number,
    metadata: Record<string, unknown> = {}
  ): void {
    const trace = this.traces.get(contextId);
    if (!trace) return;

    const entryPoint: ContextEntryPoint = {
      entryId: randomUUID(),
      source,
      entryType,
      timestamp: new Date(),
      dataSize,
      metadata,
    };

    trace.flow.entryPoints.push(entryPoint);

    runtimeLogger.debug('Context entry point recorded', {
      contextId,
      source,
      entryType,
      dataSize,
    });
  }

  /**
   * Record exit point
   */
  recordExitPoint(
    contextId: string,
    destination: string,
    exitType: 'consumption' | 'transformation' | 'storage' | 'disposal',
    dataSize: number,
    metadata: Record<string, unknown> = {}
  ): void {
    const trace = this.traces.get(contextId);
    if (!trace) return;

    const exitPoint: ContextExitPoint = {
      exitId: randomUUID(),
      destination,
      exitType,
      timestamp: new Date(),
      dataSize,
      metadata,
    };

    trace.flow.exitPoints.push(exitPoint);

    runtimeLogger.debug('Context exit point recorded', {
      contextId,
      destination,
      exitType,
      dataSize,
    });
  }

  /**
   * Infer context type from context ID
   */
  private inferContextType(contextId: string): ContextTrace['contextType'] {
    if (contextId.includes('portal')) return 'portal';
    if (contextId.includes('memory')) return 'memory';
    if (contextId.includes('cognition')) return 'cognition';
    if (contextId.includes('emotion')) return 'emotion';
    if (contextId.includes('extension')) return 'extension';
    return 'system';
  }

  /**
   * Calculate quality metrics for a trace
   */
  private calculateQualityMetrics(trace: ContextTrace): void {
    const now = Date.now();
    const age = now - trace.lifecycle.created.getTime();

    // Freshness decreases over time
    trace.quality.freshness = Math.max(0, 1 - age / (24 * 60 * 60 * 1000)); // Decay over 24 hours

    // Completeness based on transformations and accesses
    const expectedOperations = 5; // Baseline expectation
    const actualOperations =
      trace.transformations.length + trace.accessPatterns.length;
    trace.quality.completeness = Math.min(
      1,
      actualOperations / expectedOperations
    );

    // Consistency based on successful operations
    const totalOperations =
      trace.transformations.length + trace.accessPatterns.length;
    const successfulOperations =
      trace.transformations.filter((t) => t.success).length +
      trace.accessPatterns.filter((a) => a.success).length;

    trace.quality.consistency =
      totalOperations > 0 ? successfulOperations / totalOperations : 1;

    // Relevance based on access patterns
    const recentAccesses = trace.accessPatterns.filter(
      (a) => now - a.accessedAt.getTime() < 60 * 60 * 1000 // Within last hour
    ).length;
    trace.quality.relevance = Math.min(1, recentAccesses / 3); // Expect at least 3 recent accesses

    runtimeLogger.debug('Quality metrics calculated', {
      contextId: trace.contextId,
      completeness: trace.quality.completeness.toFixed(2),
      consistency: trace.quality.consistency.toFixed(2),
      freshness: trace.quality.freshness.toFixed(2),
      relevance: trace.quality.relevance.toFixed(2),
      reliability: trace.quality.reliability.toFixed(2),
    });
  }

  /**
   * Detect performance bottlenecks
   */
  private detectBottlenecks(trace: ContextTrace): void {
    const bottlenecks: ContextBottleneck[] = [];

    // Analyze transformation performance
    const slowTransformations = trace.transformations.filter(
      (t) => t.duration > 1000
    ); // > 1 second
    slowTransformations.forEach((t) => {
      bottlenecks.push({
        bottleneckId: randomUUID(),
        location: `transformation:${t.transformationType}`,
        bottleneckType: 'processing',
        impact:
          t.duration > 5000
            ? 'critical'
            : t.duration > 3000
              ? 'high'
              : 'medium',
        delay: t.duration,
        suggestions: [
          'Consider optimizing transformation algorithm',
          'Implement caching for expensive operations',
          'Use incremental processing for large datasets',
        ],
        detectedAt: new Date(),
      });
    });

    // Analyze access patterns
    const slowAccesses = trace.accessPatterns.filter((a) => a.duration > 500); // > 500ms
    slowAccesses.forEach((a) => {
      bottlenecks.push({
        bottleneckId: randomUUID(),
        location: `access:${a.accessor}`,
        bottleneckType: 'memory',
        impact: a.duration > 2000 ? 'high' : 'medium',
        delay: a.duration,
        suggestions: [
          'Optimize data access patterns',
          'Implement data locality improvements',
          'Consider async access where possible',
        ],
        detectedAt: new Date(),
      });
    });

    trace.flow.bottlenecks = bottlenecks;

    if (bottlenecks.length > 0) {
      runtimeLogger.warn('Performance bottlenecks detected', {
        contextId: trace.contextId,
        bottleneckCount: bottlenecks.length,
        criticalCount: bottlenecks.filter((b) => b.impact === 'critical')
          .length,
      });
    }
  }

  /**
   * Export traces in Jaeger format
   */
  private exportJaegerFormat(traces: ContextTrace[]): string {
    const jaegerTraces = traces.map((trace) => ({
      traceID: trace.traceId,
      spans: [
        {
          traceID: trace.traceId,
          spanID: trace.spanId,
          parentSpanID: trace.parentSpanId,
          operationName: `context:${trace.contextType}`,
          startTime: trace.startTime.getTime() * 1000, // microseconds
          duration: trace.lifecycle.totalLifetimeMs
            ? trace.lifecycle.totalLifetimeMs * 1000
            : 0,
          tags: [
            { key: 'context.id', value: trace.contextId },
            { key: 'context.type', value: trace.contextType },
            { key: 'context.depth', value: trace.hierarchy.depth },
            {
              key: 'quality.score',
              value:
                Object.values(trace.quality).reduce((a, b) => a + b, 0) / 5,
            },
          ],
          process: {
            serviceName: 'symindx-agent',
            tags: [
              { key: 'version', value: '1.0.0' },
              { key: 'instance', value: process.env.INSTANCE_ID || 'default' },
            ],
          },
        },
      ],
    }));

    return JSON.stringify({ data: jaegerTraces }, null, 2);
  }

  /**
   * Export traces in Zipkin format
   */
  private exportZipkinFormat(traces: ContextTrace[]): string {
    const zipkinSpans = traces.map((trace) => ({
      traceId: trace.traceId,
      id: trace.spanId,
      parentId: trace.parentSpanId,
      name: `context:${trace.contextType}`,
      timestamp: trace.startTime.getTime() * 1000,
      duration: trace.lifecycle.totalLifetimeMs
        ? trace.lifecycle.totalLifetimeMs * 1000
        : 0,
      kind: 'SERVER',
      localEndpoint: {
        serviceName: 'symindx-agent',
        ipv4: '127.0.0.1',
        port: 3000,
      },
      tags: {
        'context.id': trace.contextId,
        'context.type': trace.contextType,
        'context.depth': trace.hierarchy.depth.toString(),
      },
    }));

    return JSON.stringify(zipkinSpans, null, 2);
  }

  /**
   * Setup cleanup intervals
   */
  private setupCleanup(): void {
    // Clean up old spans every minute
    setInterval(() => {
      const cutoff = Date.now() - 300000; // 5 minutes ago
      let cleanedCount = 0;

      for (const [spanId, span] of this.spans.entries()) {
        if (span.endTime && span.endTime.getTime() < cutoff) {
          this.spans.delete(spanId);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        runtimeLogger.debug('Cleaned up old spans', { cleanedCount });
      }
    }, 60000);

    // Clean up old traces based on retention
    setInterval(() => {
      const cutoff = Date.now() - this.config.traceRetentionMs;
      let cleanedCount = 0;

      for (const [contextId, trace] of this.traces.entries()) {
        if (
          trace.lifecycle.destroyed &&
          trace.lifecycle.destroyed.getTime() < cutoff
        ) {
          this.traces.delete(contextId);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        runtimeLogger.debug('Cleaned up old traces', { cleanedCount });
      }
    }, 300000); // Every 5 minutes
  }

  /**
   * Get statistics about the tracer
   */
  getStatistics() {
    return {
      activeTraces: this.getActiveTraces().length,
      totalTraces: this.traces.size,
      activeSpans: this.spans.size,
      uptime: Date.now() - this.startTime,
      config: this.config,
    };
  }
}
