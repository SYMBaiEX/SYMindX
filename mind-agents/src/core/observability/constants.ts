/**
 * @module observability/constants
 * @description Constants and configuration for the observability system
 */

import type { ObservabilityConfig } from './types.js';
import { LogLevel } from '../../types/utils/logger.js';

/**
 * Default observability configuration
 */
export const DEFAULT_OBSERVABILITY_CONFIG: ObservabilityConfig = {
  enabled: true,

  logging: {
    level: LogLevel.INFO,
    enableStructuredLogging: true,
    enableCorrelationIds: true,
    maxLogSizeBytes: 10 * 1024 * 1024, // 10MB
    retentionDays: 30,
  },

  metrics: {
    enableCollection: true,
    collectionIntervalMs: 5000, // 5 seconds
    enableCustomMetrics: true,
    maxMetricsInMemory: 10000,
    exportFormat: 'prometheus',
  },

  tracing: {
    enableTracing: true,
    sampleRate: 0.1, // 10% sampling
    maxTraceDepth: 50,
    enableSpanDebugging: false,
    traceRetentionMs: 24 * 60 * 60 * 1000, // 24 hours
  },

  health: {
    enableHealthChecks: true,
    checkIntervalMs: 30000, // 30 seconds
    enablePredictiveAlerts: true,
    alertThresholds: {
      memory: 0.85, // 85% memory usage
      cpu: 0.8, // 80% CPU usage
      responseTime: 5000, // 5 seconds
      errorRate: 0.05, // 5% error rate
    },
  },

  performance: {
    enableMonitoring: true,
    maxOverheadMs: 5, // Maximum 5ms overhead
    enableProfiling: false,
    profilingIntervalMs: 60000, // 1 minute
  },

  dashboard: {
    enableDashboard: true,
    refreshIntervalMs: 5000, // 5 seconds
    maxDataPoints: 1000,
    enableRealTime: true,
  },
};

/**
 * Observability system constants
 */
export const OBSERVABILITY_CONSTANTS = {
  /** Trace header names */
  TRACE_HEADERS: {
    TRACE_ID: 'x-trace-id',
    SPAN_ID: 'x-span-id',
    PARENT_SPAN_ID: 'x-parent-span-id',
    SAMPLED: 'x-trace-sampled',
    FLAGS: 'x-trace-flags',
  },

  /** Metric name prefixes */
  METRIC_PREFIXES: {
    SYSTEM: 'symindx_system_',
    AGENT: 'symindx_agent_',
    PORTAL: 'symindx_portal_',
    EXTENSION: 'symindx_extension_',
    MEMORY: 'symindx_memory_',
    HEALTH: 'symindx_health_',
    OBSERVABILITY: 'symindx_observability_',
  },

  /** Standard metric names */
  METRICS: {
    // System metrics
    SYSTEM_MEMORY_USAGE: 'symindx_system_memory_usage_bytes',
    SYSTEM_CPU_USAGE: 'symindx_system_cpu_usage_percent',
    SYSTEM_UPTIME: 'symindx_system_uptime_seconds',
    SYSTEM_EVENT_LOOP_LAG: 'symindx_system_event_loop_lag_ms',

    // Agent metrics
    AGENT_THINK_TIME: 'symindx_agent_think_time_ms',
    AGENT_RESPONSE_TIME: 'symindx_agent_response_time_ms',
    AGENT_ACTIONS_TOTAL: 'symindx_agent_actions_total',
    AGENT_ERRORS_TOTAL: 'symindx_agent_errors_total',
    AGENT_MEMORY_USAGE: 'symindx_agent_memory_usage_bytes',

    // Portal metrics
    PORTAL_REQUESTS_TOTAL: 'symindx_portal_requests_total',
    PORTAL_REQUEST_DURATION: 'symindx_portal_request_duration_ms',
    PORTAL_TOKENS_USED: 'symindx_portal_tokens_used_total',
    PORTAL_ERRORS_TOTAL: 'symindx_portal_errors_total',

    // Extension metrics
    EXTENSION_MESSAGES_TOTAL: 'symindx_extension_messages_total',
    EXTENSION_CONNECTIONS_ACTIVE: 'symindx_extension_connections_active',
    EXTENSION_ERRORS_TOTAL: 'symindx_extension_errors_total',
    EXTENSION_LATENCY: 'symindx_extension_latency_ms',

    // Memory metrics
    MEMORY_OPERATIONS_TOTAL: 'symindx_memory_operations_total',
    MEMORY_OPERATION_DURATION: 'symindx_memory_operation_duration_ms',
    MEMORY_STORAGE_SIZE: 'symindx_memory_storage_size_bytes',
    MEMORY_ERRORS_TOTAL: 'symindx_memory_errors_total',

    // Health metrics
    HEALTH_CHECK_DURATION: 'symindx_health_check_duration_ms',
    HEALTH_CHECKS_TOTAL: 'symindx_health_checks_total',
    HEALTH_STATUS: 'symindx_health_status',

    // Observability metrics
    OBSERVABILITY_OVERHEAD: 'symindx_observability_overhead_ms',
    OBSERVABILITY_LOGS_TOTAL: 'symindx_observability_logs_total',
    OBSERVABILITY_METRICS_TOTAL: 'symindx_observability_metrics_total',
    OBSERVABILITY_TRACES_TOTAL: 'symindx_observability_traces_total',
  },

  /** Standard log fields */
  LOG_FIELDS: {
    TRACE_ID: 'traceId',
    SPAN_ID: 'spanId',
    AGENT_ID: 'agentId',
    PORTAL_TYPE: 'portalType',
    EXTENSION_ID: 'extensionId',
    OPERATION: 'operation',
    DURATION: 'duration',
    ERROR_CODE: 'errorCode',
    ERROR_MESSAGE: 'errorMessage',
    MEMORY_USAGE: 'memoryUsage',
    CPU_USAGE: 'cpuUsage',
  },

  /** Standard trace operations */
  TRACE_OPERATIONS: {
    // Agent operations
    AGENT_THINK: 'agent.think',
    AGENT_ACT: 'agent.act',
    AGENT_REMEMBER: 'agent.remember',
    AGENT_FEEL: 'agent.feel',

    // Portal operations
    PORTAL_REQUEST: 'portal.request',
    PORTAL_GENERATE: 'portal.generate',
    PORTAL_STREAM: 'portal.stream',

    // Extension operations
    EXTENSION_MESSAGE: 'extension.message',
    EXTENSION_ACTION: 'extension.action',
    EXTENSION_CONNECT: 'extension.connect',

    // Memory operations
    MEMORY_STORE: 'memory.store',
    MEMORY_RETRIEVE: 'memory.retrieve',
    MEMORY_QUERY: 'memory.query',
    MEMORY_DELETE: 'memory.delete',

    // System operations
    SYSTEM_STARTUP: 'system.startup',
    SYSTEM_SHUTDOWN: 'system.shutdown',
    SYSTEM_HEALTH_CHECK: 'system.health_check',
  },

  /** Alert severity levels */
  ALERT_SEVERITY: {
    INFO: 'info',
    WARNING: 'warning',
    ERROR: 'error',
    CRITICAL: 'critical',
  } as const,

  /** Health status values */
  HEALTH_STATUS: {
    HEALTHY: 'healthy',
    DEGRADED: 'degraded',
    UNHEALTHY: 'unhealthy',
    CRITICAL: 'critical',
    UNKNOWN: 'unknown',
  } as const,

  /** Trace sampling strategies */
  SAMPLING: {
    ALWAYS: 1.0,
    NEVER: 0.0,
    DEFAULT: 0.1, // 10%
    DEBUG: 1.0,
    PRODUCTION: 0.01, // 1%
  },

  /** Performance thresholds */
  PERFORMANCE_THRESHOLDS: {
    MAX_OBSERVABILITY_OVERHEAD_MS: 5,
    MAX_THINK_TIME_MS: 10000, // 10 seconds
    MAX_RESPONSE_TIME_MS: 5000, // 5 seconds
    MAX_MEMORY_USAGE_PERCENT: 85,
    MAX_CPU_USAGE_PERCENT: 80,
    MAX_EVENT_LOOP_LAG_MS: 100,
  },

  /** Data retention periods */
  RETENTION: {
    TRACES_MS: 24 * 60 * 60 * 1000, // 24 hours
    METRICS_MS: 7 * 24 * 60 * 60 * 1000, // 7 days
    LOGS_MS: 30 * 24 * 60 * 60 * 1000, // 30 days
    HEALTH_DATA_MS: 7 * 24 * 60 * 60 * 1000, // 7 days
  },

  /** Dashboard configuration */
  DASHBOARD: {
    DEFAULT_REFRESH_INTERVAL_MS: 5000,
    MAX_DATA_POINTS: 1000,
    MAX_CHART_SERIES: 10,
    DEFAULT_TIME_RANGE_MS: 60 * 60 * 1000, // 1 hour
  },

  /** Error codes */
  ERROR_CODES: {
    OBSERVABILITY_DISABLED: 'OBSERVABILITY_DISABLED',
    TRACE_CONTEXT_MISSING: 'TRACE_CONTEXT_MISSING',
    METRIC_COLLECTION_FAILED: 'METRIC_COLLECTION_FAILED',
    HEALTH_CHECK_FAILED: 'HEALTH_CHECK_FAILED',
    ALERT_EVALUATION_FAILED: 'ALERT_EVALUATION_FAILED',
    DASHBOARD_DATA_UNAVAILABLE: 'DASHBOARD_DATA_UNAVAILABLE',
    OVERHEAD_EXCEEDED: 'OVERHEAD_EXCEEDED',
  },

  /** Service metadata */
  SERVICE: {
    NAME: 'symindx',
    VERSION: '1.0.0',
    ENVIRONMENT: process.env.NODE_ENV || 'development',
    INSTANCE_ID: process.env.INSTANCE_ID || 'local',
  },
} as const;

/**
 * Default alert rules
 */
export const DEFAULT_ALERT_RULES = [
  {
    id: 'high_memory_usage',
    name: 'High Memory Usage',
    metricName: OBSERVABILITY_CONSTANTS.METRICS.SYSTEM_MEMORY_USAGE,
    condition: {
      operator: 'gt' as const,
      threshold: 0.85,
      duration: 60000, // 1 minute
    },
    severity: 'warning' as const,
    labels: { component: 'system' },
    actions: [
      {
        type: 'log' as const,
        config: { level: 'warn' },
      },
    ],
    enabled: true,
    evaluationInterval: 30000, // 30 seconds
  },
  {
    id: 'high_error_rate',
    name: 'High Error Rate',
    metricName: OBSERVABILITY_CONSTANTS.METRICS.AGENT_ERRORS_TOTAL,
    condition: {
      operator: 'gt' as const,
      threshold: 10,
      duration: 300000, // 5 minutes
    },
    severity: 'error' as const,
    labels: { component: 'agent' },
    actions: [
      {
        type: 'log' as const,
        config: { level: 'error' },
      },
    ],
    enabled: true,
    evaluationInterval: 60000, // 1 minute
  },
  {
    id: 'slow_response_time',
    name: 'Slow Response Time',
    metricName: OBSERVABILITY_CONSTANTS.METRICS.AGENT_RESPONSE_TIME,
    condition: {
      operator: 'gt' as const,
      threshold: 5000, // 5 seconds
      duration: 120000, // 2 minutes
    },
    severity: 'warning' as const,
    labels: { component: 'agent' },
    actions: [
      {
        type: 'log' as const,
        config: { level: 'warn' },
      },
    ],
    enabled: true,
    evaluationInterval: 30000, // 30 seconds
  },
] as const;

/**
 * Environment-specific configurations
 */
export const ENVIRONMENT_CONFIGS = {
  development: {
    ...DEFAULT_OBSERVABILITY_CONFIG,
    tracing: {
      ...DEFAULT_OBSERVABILITY_CONFIG.tracing,
      sampleRate: 1.0, // 100% sampling in development
      enableSpanDebugging: true,
    },
    performance: {
      ...DEFAULT_OBSERVABILITY_CONFIG.performance,
      enableProfiling: true,
    },
  },

  staging: {
    ...DEFAULT_OBSERVABILITY_CONFIG,
    tracing: {
      ...DEFAULT_OBSERVABILITY_CONFIG.tracing,
      sampleRate: 0.5, // 50% sampling in staging
    },
  },

  production: {
    ...DEFAULT_OBSERVABILITY_CONFIG,
    tracing: {
      ...DEFAULT_OBSERVABILITY_CONFIG.tracing,
      sampleRate: 0.01, // 1% sampling in production
      enableSpanDebugging: false,
    },
    performance: {
      ...DEFAULT_OBSERVABILITY_CONFIG.performance,
      enableProfiling: false,
    },
  },
} as const;
