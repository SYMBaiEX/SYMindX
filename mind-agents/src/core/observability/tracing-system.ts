/**
 * @module observability/tracing-system
 * @description Distributed tracing system for SYMindX
 *
 * Provides comprehensive request tracing across agent interactions,
 * portal calls, and extension operations with minimal overhead.
 */

import { EventEmitter } from 'events';
import { randomBytes } from 'crypto';
import { performance } from 'perf_hooks';

import type {
  TraceContext,
  TraceSpan,
  ObservabilityConfig,
  ObservabilityEvent,
} from './types.js';
import { OBSERVABILITY_CONSTANTS } from './constants.js';
import { runtimeLogger } from '../../utils/logger.js';

/**
 * Trace context manager for correlation ID generation and propagation
 */
export class TraceContextManager {
  private static instance: TraceContextManager;
  private currentContext: Map<string, TraceContext> = new Map();
  private contextStack: TraceContext[] = [];

  public static getInstance(): TraceContextManager {
    if (!TraceContextManager.instance) {
      TraceContextManager.instance = new TraceContextManager();
    }
    return TraceContextManager.instance;
  }

  /**
   * Generate a new trace ID
   */
  public generateTraceId(): string {
    return randomBytes(16).toString('hex');
  }

  /**
   * Generate a new span ID
   */
  public generateSpanId(): string {
    return randomBytes(8).toString('hex');
  }

  /**
   * Create a new trace context
   */
  public createTraceContext(
    operationName: string,
    parentContext?: TraceContext,
    baggage: Record<string, string> = {}
  ): TraceContext {
    const traceId = parentContext?.traceId || this.generateTraceId();
    const spanId = this.generateSpanId();
    const parentSpanId = parentContext?.spanId;

    const context: TraceContext = {
      traceId,
      spanId,
      parentSpanId,
      sampled: this.shouldSample(traceId),
      flags: 0,
      baggage: {
        ...parentContext?.baggage,
        ...baggage,
        operation: operationName,
      },
      startTime: new Date(),
      metadata: {
        operationName,
        ...parentContext?.metadata,
      },
    };

    // Store context for async correlation
    this.currentContext.set(traceId, context);

    return context;
  }

  /**
   * Get current trace context
   */
  public getCurrentContext(): TraceContext | undefined {
    return this.contextStack[this.contextStack.length - 1];
  }

  /**
   * Set current trace context
   */
  public setCurrentContext(context: TraceContext): void {
    this.contextStack.push(context);
    this.currentContext.set(context.traceId, context);
  }

  /**
   * Clear current trace context
   */
  public clearCurrentContext(): TraceContext | undefined {
    const context = this.contextStack.pop();
    if (context) {
      this.currentContext.delete(context.traceId);
    }
    return context;
  }

  /**
   * Get trace context by ID
   */
  public getContextById(traceId: string): TraceContext | undefined {
    return this.currentContext.get(traceId);
  }

  /**
   * Create child context from parent
   */
  public createChildContext(
    parentContext: TraceContext,
    operationName: string,
    baggage: Record<string, string> = {}
  ): TraceContext {
    return this.createTraceContext(operationName, parentContext, baggage);
  }

  /**
   * Determine if trace should be sampled
   */
  private shouldSample(traceId: string): boolean {
    // Use consistent sampling based on trace ID
    const hash = parseInt(traceId.slice(-8), 16);
    const sampleRate = 0.1; // 10% default, should be configurable
    return hash / 0xffffffff < sampleRate;
  }

  /**
   * Extract trace context from headers
   */
  public extractFromHeaders(
    headers: Record<string, string>
  ): TraceContext | undefined {
    const traceId = headers[OBSERVABILITY_CONSTANTS.TRACE_HEADERS.TRACE_ID];
    const spanId = headers[OBSERVABILITY_CONSTANTS.TRACE_HEADERS.SPAN_ID];
    const parentSpanId =
      headers[OBSERVABILITY_CONSTANTS.TRACE_HEADERS.PARENT_SPAN_ID];
    const sampled =
      headers[OBSERVABILITY_CONSTANTS.TRACE_HEADERS.SAMPLED] === 'true';
    const flags = parseInt(
      headers[OBSERVABILITY_CONSTANTS.TRACE_HEADERS.FLAGS] || '0',
      10
    );

    if (!traceId || !spanId) {
      return undefined;
    }

    return {
      traceId,
      spanId,
      parentSpanId,
      sampled,
      flags,
      baggage: {},
      startTime: new Date(),
      metadata: {},
    };
  }

  /**
   * Inject trace context into headers
   */
  public injectIntoHeaders(
    context: TraceContext,
    headers: Record<string, string> = {}
  ): Record<string, string> {
    return {
      ...headers,
      [OBSERVABILITY_CONSTANTS.TRACE_HEADERS.TRACE_ID]: context.traceId,
      [OBSERVABILITY_CONSTANTS.TRACE_HEADERS.SPAN_ID]: context.spanId,
      [OBSERVABILITY_CONSTANTS.TRACE_HEADERS.PARENT_SPAN_ID]:
        context.parentSpanId || '',
      [OBSERVABILITY_CONSTANTS.TRACE_HEADERS.SAMPLED]:
        context.sampled.toString(),
      [OBSERVABILITY_CONSTANTS.TRACE_HEADERS.FLAGS]: context.flags.toString(),
    };
  }
}

/**
 * Span manager for tracking operation lifecycles
 */
export class SpanManager {
  private spans: Map<string, TraceSpan> = new Map();
  private activeSpans: Map<string, TraceSpan> = new Map();
  private completedSpans: TraceSpan[] = [];
  private maxRetainedSpans = 10000;

  /**
   * Start a new span
   */
  public startSpan(
    context: TraceContext,
    operationName: string,
    kind: TraceSpan['kind'] = 'internal',
    tags: Record<string, string | number | boolean> = {}
  ): TraceSpan {
    const span: TraceSpan = {
      spanId: context.spanId,
      traceId: context.traceId,
      parentSpanId: context.parentSpanId,
      operationName,
      kind,
      startTime: new Date(),
      status: { code: 'ok' },
      tags: {
        ...tags,
        'service.name': OBSERVABILITY_CONSTANTS.SERVICE.NAME,
        'service.version': OBSERVABILITY_CONSTANTS.SERVICE.VERSION,
      },
      events: [],
      resource: {
        serviceName: OBSERVABILITY_CONSTANTS.SERVICE.NAME,
        serviceVersion: OBSERVABILITY_CONSTANTS.SERVICE.VERSION,
        instanceId: OBSERVABILITY_CONSTANTS.SERVICE.INSTANCE_ID,
        environment: OBSERVABILITY_CONSTANTS.SERVICE.ENVIRONMENT,
      },
    };

    this.spans.set(span.spanId, span);
    this.activeSpans.set(span.spanId, span);

    return span;
  }

  /**
   * Finish a span
   */
  public finishSpan(
    spanId: string,
    status?: TraceSpan['status']
  ): TraceSpan | undefined {
    const span = this.activeSpans.get(spanId);
    if (!span) {
      return undefined;
    }

    span.endTime = new Date();
    span.duration = span.endTime.getTime() - span.startTime.getTime();

    if (status) {
      span.status = status;
    }

    // Move from active to completed
    this.activeSpans.delete(spanId);
    this.completedSpans.push(span);

    // Manage memory by limiting retained spans
    if (this.completedSpans.length > this.maxRetainedSpans) {
      this.completedSpans.shift();
    }

    return span;
  }

  /**
   * Add event to span
   */
  public addEvent(
    spanId: string,
    name: string,
    attributes?: Record<string, unknown>
  ): void {
    const span = this.activeSpans.get(spanId);
    if (span) {
      span.events.push({
        timestamp: new Date(),
        name,
        attributes,
      });
    }
  }

  /**
   * Set span status
   */
  public setSpanStatus(spanId: string, status: TraceSpan['status']): void {
    const span = this.activeSpans.get(spanId);
    if (span) {
      span.status = status;
    }
  }

  /**
   * Add tags to span
   */
  public setSpanTags(
    spanId: string,
    tags: Record<string, string | number | boolean>
  ): void {
    const span = this.activeSpans.get(spanId);
    if (span) {
      span.tags = { ...span.tags, ...tags };
    }
  }

  /**
   * Get span by ID
   */
  public getSpan(spanId: string): TraceSpan | undefined {
    return this.spans.get(spanId);
  }

  /**
   * Get all spans for a trace
   */
  public getTraceSpans(traceId: string): TraceSpan[] {
    return Array.from(this.spans.values()).filter(
      (span) => span.traceId === traceId
    );
  }

  /**
   * Get completed spans
   */
  public getCompletedSpans(limit?: number): TraceSpan[] {
    return limit ? this.completedSpans.slice(-limit) : [...this.completedSpans];
  }

  /**
   * Clear old spans
   */
  public cleanup(maxAgeMs: number = 24 * 60 * 60 * 1000): void {
    const cutoff = new Date(Date.now() - maxAgeMs);

    // Clean completed spans
    this.completedSpans = this.completedSpans.filter(
      (span) => span.endTime && span.endTime > cutoff
    );

    // Clean stored spans
    for (const [spanId, span] of this.spans.entries()) {
      if (span.endTime && span.endTime < cutoff) {
        this.spans.delete(spanId);
      }
    }
  }
}

/**
 * Main tracing system
 */
export class TracingSystem extends EventEmitter {
  private contextManager: TraceContextManager;
  private spanManager: SpanManager;
  private config: ObservabilityConfig['tracing'];
  private enabled = true;

  constructor(config: ObservabilityConfig['tracing']) {
    super();
    this.config = config;
    this.enabled = config.enableTracing;
    this.contextManager = TraceContextManager.getInstance();
    this.spanManager = new SpanManager();

    // Setup cleanup interval
    setInterval(
      () => {
        this.spanManager.cleanup(config.traceRetentionMs);
      },
      60 * 60 * 1000
    ); // Clean up every hour
  }

  /**
   * Create a new trace
   */
  public startTrace(
    operationName: string,
    baggage: Record<string, string> = {}
  ): TraceContext | undefined {
    if (!this.enabled) return undefined;

    const context = this.contextManager.createTraceContext(
      operationName,
      undefined,
      baggage
    );

    if (context.sampled) {
      const span = this.spanManager.startSpan(context, operationName);
      this.emit('traceStarted', { context, span });

      runtimeLogger.debug('Trace started', {
        correlationId: context.traceId,
        metadata: {
          operation: operationName,
          spanId: context.spanId,
          sampled: context.sampled,
        },
      });
    }

    return context;
  }

  /**
   * Create a child trace from parent context
   */
  public startChildTrace(
    parentContext: TraceContext,
    operationName: string,
    baggage: Record<string, string> = {}
  ): TraceContext | undefined {
    if (!this.enabled || !parentContext.sampled) return undefined;

    const context = this.contextManager.createChildContext(
      parentContext,
      operationName,
      baggage
    );

    if (context.sampled) {
      const span = this.spanManager.startSpan(context, operationName);
      this.emit('childTraceStarted', { parentContext, context, span });
    }

    return context;
  }

  /**
   * Finish a trace
   */
  public finishTrace(
    context: TraceContext,
    status?: TraceSpan['status']
  ): void {
    if (!this.enabled || !context.sampled) return;

    const span = this.spanManager.finishSpan(context.spanId, status);
    if (span) {
      this.emit('traceFinished', { context, span });

      runtimeLogger.debug('Trace finished', {
        correlationId: context.traceId,
        metadata: {
          operation: span.operationName,
          spanId: context.spanId,
          duration: span.duration,
          status: span.status.code,
        },
      });
    }
  }

  /**
   * Add event to current trace
   */
  public addTraceEvent(
    context: TraceContext,
    name: string,
    attributes?: Record<string, unknown>
  ): void {
    if (!this.enabled || !context.sampled) return;

    this.spanManager.addEvent(context.spanId, name, attributes);
  }

  /**
   * Set trace status
   */
  public setTraceStatus(
    context: TraceContext,
    status: TraceSpan['status']
  ): void {
    if (!this.enabled || !context.sampled) return;

    this.spanManager.setSpanStatus(context.spanId, status);
  }

  /**
   * Add tags to trace
   */
  public setTraceTags(
    context: TraceContext,
    tags: Record<string, string | number | boolean>
  ): void {
    if (!this.enabled || !context.sampled) return;

    this.spanManager.setSpanTags(context.spanId, tags);
  }

  /**
   * Trace an observability event
   */
  public traceEvent(event: ObservabilityEvent): TraceContext | undefined {
    if (!this.enabled) return undefined;

    const operationName = `${event.type}.${event.operation || 'unknown'}`;
    const context = this.startTrace(operationName, {
      eventType: event.type,
      ...(event.metadata as Record<string, string>),
    });

    if (context) {
      // Add event-specific tags
      const tags: Record<string, string | number | boolean> = {
        'event.type': event.type,
      };

      switch (event.type) {
        case 'agent':
          tags['agent.id'] = event.agentId;
          tags['agent.operation'] = event.operation;
          if (event.status) tags['agent.status'] = event.status;
          if (event.duration) tags['agent.duration'] = event.duration;
          break;
        case 'portal':
          tags['portal.id'] = event.portalId;
          tags['portal.operation'] = event.operation;
          if (event.model) tags['portal.model'] = event.model;
          if (event.tokens) tags['portal.tokens'] = event.tokens;
          if (event.duration) tags['portal.duration'] = event.duration;
          break;
        case 'extension':
          tags['extension.id'] = event.extensionId;
          tags['extension.operation'] = event.operation;
          if (event.status) tags['extension.status'] = event.status;
          if (event.duration) tags['extension.duration'] = event.duration;
          break;
        case 'memory':
          tags['memory.provider'] = event.providerId;
          tags['memory.operation'] = event.operation;
          if (event.recordCount) tags['memory.records'] = event.recordCount;
          if (event.duration) tags['memory.duration'] = event.duration;
          break;
        case 'health':
          tags['health.component'] = event.componentId;
          tags['health.operation'] = event.operation;
          tags['health.status'] = event.status;
          if (event.responseTime)
            tags['health.response_time'] = event.responseTime;
          break;
        case 'system':
          tags['system.operation'] = event.operation;
          if (event.value !== undefined) tags['system.value'] = event.value;
          break;
      }

      this.setTraceTags(context, tags);
    }

    return context;
  }

  /**
   * Get trace by ID
   */
  public getTrace(traceId: string): TraceSpan[] {
    return this.spanManager.getTraceSpans(traceId);
  }

  /**
   * Get recent traces
   */
  public getRecentTraces(limit: number = 100): TraceSpan[] {
    return this.spanManager.getCompletedSpans(limit);
  }

  /**
   * Export traces in OpenTelemetry format
   */
  public exportTraces(traceIds?: string[]): unknown[] {
    const spans = traceIds
      ? traceIds.flatMap((id) => this.spanManager.getTraceSpans(id))
      : this.spanManager.getCompletedSpans();

    return spans.map((span) => ({
      traceId: span.traceId,
      spanId: span.spanId,
      parentSpanId: span.parentSpanId,
      operationName: span.operationName,
      startTime: span.startTime.getTime() * 1000000, // nanoseconds
      endTime: span.endTime ? span.endTime.getTime() * 1000000 : undefined,
      duration: span.duration ? span.duration * 1000000 : undefined,
      tags: span.tags,
      events: span.events.map((event) => ({
        timestamp: event.timestamp.getTime() * 1000000,
        name: event.name,
        attributes: event.attributes,
      })),
      status: span.status,
      kind: span.kind,
      resource: span.resource,
    }));
  }

  /**
   * Get tracing statistics
   */
  public getStatistics(): {
    totalTraces: number;
    activeSpans: number;
    completedSpans: number;
    samplingRate: number;
    averageSpanDuration: number;
  } {
    const completedSpans = this.spanManager.getCompletedSpans();
    const totalDuration = completedSpans.reduce(
      (sum, span) => sum + (span.duration || 0),
      0
    );

    return {
      totalTraces: new Set(completedSpans.map((span) => span.traceId)).size,
      activeSpans: this.spanManager['activeSpans'].size,
      completedSpans: completedSpans.length,
      samplingRate: this.config.sampleRate,
      averageSpanDuration:
        completedSpans.length > 0 ? totalDuration / completedSpans.length : 0,
    };
  }

  /**
   * Enable/disable tracing
   */
  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    runtimeLogger.info(`Tracing ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<ObservabilityConfig['tracing']>): void {
    this.config = { ...this.config, ...config };
    this.enabled = this.config.enableTracing;
  }
}
