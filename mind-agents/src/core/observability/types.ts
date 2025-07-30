/**
 * @module observability/types
 * @description Type definitions for the unified observability system
 */

import type { LogLevel, LogContext } from '../../types/utils/logger.js';
import type { HealthStatus } from '../../utils/health-monitor.js';
import type { MetricType as BaseMetricType } from '../../utils/performance-monitor.js';

/**
 * Observability system configuration
 */
export interface ObservabilityConfig {
  /** Enable/disable observability system */
  enabled: boolean;

  /** Logging configuration */
  logging: {
    level: LogLevel;
    enableStructuredLogging: boolean;
    enableCorrelationIds: boolean;
    maxLogSizeBytes: number;
    retentionDays: number;
  };

  /** Metrics configuration */
  metrics: {
    enableCollection: boolean;
    collectionIntervalMs: number;
    enableCustomMetrics: boolean;
    maxMetricsInMemory: number;
    exportFormat: 'prometheus' | 'json' | 'both';
  };

  /** Tracing configuration */
  tracing: {
    enableTracing: boolean;
    sampleRate: number; // 0.0 - 1.0
    maxTraceDepth: number;
    enableSpanDebugging: boolean;
    traceRetentionMs: number;
  };

  /** Health monitoring configuration */
  health: {
    enableHealthChecks: boolean;
    checkIntervalMs: number;
    enablePredictiveAlerts: boolean;
    alertThresholds: {
      memory: number;
      cpu: number;
      responseTime: number;
      errorRate: number;
    };
  };

  /** Performance monitoring */
  performance: {
    enableMonitoring: boolean;
    maxOverheadMs: number; // Maximum observability overhead
    enableProfiling: boolean;
    profilingIntervalMs: number;
  };

  /** Dashboard configuration */
  dashboard: {
    enableDashboard: boolean;
    refreshIntervalMs: number;
    maxDataPoints: number;
    enableRealTime: boolean;
  };
}

/**
 * Trace context for distributed tracing
 */
export interface TraceContext {
  /** Unique trace identifier */
  traceId: string;

  /** Span identifier */
  spanId: string;

  /** Parent span identifier */
  parentSpanId?: string;

  /** Trace sampling decision */
  sampled: boolean;

  /** Trace flags */
  flags: number;

  /** Baggage items for trace context propagation */
  baggage: Record<string, string>;

  /** Timestamp when trace started */
  startTime: Date;

  /** Additional trace metadata */
  metadata: Record<string, unknown>;
}

/**
 * Trace span for operation tracking
 */
export interface TraceSpan {
  /** Span identifier */
  spanId: string;

  /** Trace identifier */
  traceId: string;

  /** Parent span identifier */
  parentSpanId?: string;

  /** Operation name */
  operationName: string;

  /** Span kind */
  kind: 'internal' | 'server' | 'client' | 'producer' | 'consumer';

  /** Start timestamp */
  startTime: Date;

  /** End timestamp */
  endTime?: Date;

  /** Span duration in milliseconds */
  duration?: number;

  /** Span status */
  status: {
    code: 'ok' | 'error' | 'timeout';
    message?: string;
  };

  /** Span tags/attributes */
  tags: Record<string, string | number | boolean>;

  /** Span events/logs */
  events: Array<{
    timestamp: Date;
    name: string;
    attributes?: Record<string, unknown>;
  }>;

  /** Resource information */
  resource: {
    serviceName: string;
    serviceVersion: string;
    instanceId: string;
    environment: string;
  };
}

/**
 * Enhanced metric type with observability features
 */
export interface MetricType extends BaseMetricType {
  /** Metric observability labels */
  labels: Record<string, string>;

  /** Metric sampling configuration */
  sampling: {
    enabled: boolean;
    rate: number;
  };

  /** Metric alerting configuration */
  alerting: {
    enabled: boolean;
    rules: AlertRule[];
  };
}

/**
 * Alert rule configuration
 */
export interface AlertRule {
  /** Rule identifier */
  id: string;

  /** Rule name */
  name: string;

  /** Metric to monitor */
  metricName: string;

  /** Alert condition */
  condition: {
    operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'ne';
    threshold: number;
    duration: number; // Duration in milliseconds
  };

  /** Alert severity */
  severity: 'info' | 'warning' | 'error' | 'critical';

  /** Alert labels */
  labels: Record<string, string>;

  /** Alert actions */
  actions: Array<{
    type: 'log' | 'email' | 'webhook' | 'slack';
    config: Record<string, unknown>;
  }>;

  /** Rule enabled status */
  enabled: boolean;

  /** Rule evaluation interval */
  evaluationInterval: number;
}

/**
 * Observability metrics collection
 */
export interface ObservabilityMetrics {
  /** System metrics */
  system: {
    memory: {
      heapUsed: number;
      heapTotal: number;
      usage: number;
    };
    cpu: {
      usage: number;
      loadAverage: number[];
    };
    uptime: number;
    eventLoopDelay: number;
  };

  /** Agent metrics */
  agents: Record<
    string,
    {
      status: string;
      thinkTime: number;
      responseTime: number;
      actionCount: number;
      errorCount: number;
      memoryUsage: number;
    }
  >;

  /** Portal metrics */
  portals: Record<
    string,
    {
      requestCount: number;
      errorCount: number;
      averageLatency: number;
      tokenUsage: number;
    }
  >;

  /** Extension metrics */
  extensions: Record<
    string,
    {
      activeConnections: number;
      messageCount: number;
      errorCount: number;
      latency: number;
    }
  >;

  /** Memory provider metrics */
  memory: Record<
    string,
    {
      operationCount: number;
      averageLatency: number;
      errorCount: number;
      storageSize: number;
    }
  >;

  /** Health metrics */
  health: {
    overall: HealthStatus;
    components: Record<
      string,
      {
        status: HealthStatus;
        responseTime: number;
        uptime: number;
      }
    >;
  };

  /** Observability system metrics */
  observability: {
    logEntriesPerSecond: number;
    metricsCollected: number;
    tracesGenerated: number;
    alertsTriggered: number;
    overheadMs: number;
  };
}

/**
 * Dashboard data structure
 */
export interface DashboardData {
  /** Dashboard metadata */
  metadata: {
    generatedAt: Date;
    dataPoints: number;
    refreshInterval: number;
  };

  /** Real-time metrics */
  realTimeMetrics: ObservabilityMetrics;

  /** Historical data */
  timeSeries: Array<{
    timestamp: Date;
    metrics: Partial<ObservabilityMetrics>;
  }>;

  /** Active alerts */
  alerts: Array<{
    id: string;
    rule: string;
    severity: string;
    message: string;
    timestamp: Date;
    acknowledged: boolean;
  }>;

  /** System health summary */
  healthSummary: {
    overall: HealthStatus;
    componentCount: number;
    healthyComponents: number;
    degradedComponents: number;
    unhealthyComponents: number;
  };

  /** Performance insights */
  insights: Array<{
    type: 'performance' | 'resource' | 'error' | 'trend';
    severity: 'info' | 'warning' | 'error';
    message: string;
    recommendation?: string;
    data?: Record<string, unknown>;
  }>;
}

/**
 * Enhanced log context with observability features
 */
export interface ObservabilityLogContext extends LogContext {
  /** Trace information */
  trace?: {
    traceId: string;
    spanId: string;
    sampled: boolean;
  };

  /** Service information */
  service?: {
    name: string;
    version: string;
    instance: string;
    environment: string;
  };

  /** Request information */
  request?: {
    id: string;
    method?: string;
    path?: string;
    userAgent?: string;
    ip?: string;
  };

  /** Performance information */
  performance?: {
    duration: number;
    memoryUsage: number;
    cpuUsage: number;
  };

  /** Business context */
  business?: {
    agentId?: string;
    portalType?: string;
    extensionId?: string;
    operationType?: string;
  };
}

/**
 * Observability event types
 */
export type ObservabilityEvent =
  | AgentObservabilityEvent
  | PortalObservabilityEvent
  | ExtensionObservabilityEvent
  | MemoryObservabilityEvent
  | HealthObservabilityEvent
  | SystemObservabilityEvent;

export interface AgentObservabilityEvent {
  type: 'agent';
  agentId: string;
  operation: 'think' | 'act' | 'remember' | 'feel';
  status: 'started' | 'completed' | 'failed';
  duration?: number;
  metadata: Record<string, unknown>;
}

export interface PortalObservabilityEvent {
  type: 'portal';
  portalId: string;
  operation: 'request' | 'response' | 'error';
  model?: string;
  tokens?: number;
  duration?: number;
  metadata: Record<string, unknown>;
}

export interface ExtensionObservabilityEvent {
  type: 'extension';
  extensionId: string;
  operation: 'message' | 'action' | 'error';
  status: 'started' | 'completed' | 'failed';
  duration?: number;
  metadata: Record<string, unknown>;
}

export interface MemoryObservabilityEvent {
  type: 'memory';
  providerId: string;
  operation: 'store' | 'retrieve' | 'query' | 'delete';
  recordCount?: number;
  duration?: number;
  metadata: Record<string, unknown>;
}

export interface HealthObservabilityEvent {
  type: 'health';
  componentId: string;
  operation: 'check' | 'alert' | 'recovery';
  status: HealthStatus;
  responseTime?: number;
  metadata: Record<string, unknown>;
}

export interface SystemObservabilityEvent {
  type: 'system';
  operation: 'startup' | 'shutdown' | 'gc' | 'memory' | 'cpu';
  value?: number;
  metadata: Record<string, unknown>;
}

/**
 * Observability hook types for middleware integration
 */
export interface ObservabilityHooks {
  /** Pre-operation hook */
  beforeOperation?: (
    context: TraceContext,
    operation: string,
    metadata: Record<string, unknown>
  ) => Promise<void>;

  /** Post-operation hook */
  afterOperation?: (
    context: TraceContext,
    operation: string,
    result: unknown,
    duration: number
  ) => Promise<void>;

  /** Error hook */
  onError?: (
    context: TraceContext,
    operation: string,
    error: Error,
    duration: number
  ) => Promise<void>;

  /** Metric collection hook */
  onMetric?: (
    metricName: string,
    value: number,
    labels: Record<string, string>
  ) => Promise<void>;

  /** Alert hook */
  onAlert?: (
    alert: AlertRule,
    value: number,
    context: Record<string, unknown>
  ) => Promise<void>;
}

/**
 * Observability middleware configuration
 */
export interface ObservabilityMiddleware {
  /** Middleware name */
  name: string;

  /** Middleware priority (lower = higher priority) */
  priority: number;

  /** Middleware enabled status */
  enabled: boolean;

  /** Middleware hooks */
  hooks: ObservabilityHooks;

  /** Middleware configuration */
  config: Record<string, unknown>;
}
