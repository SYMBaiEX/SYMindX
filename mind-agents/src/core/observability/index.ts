/**
 * @module observability
 * @description Unified observability system for SYMindX
 * 
 * This module provides comprehensive observability across all SYMindX components:
 * - Unified logging with structured metadata
 * - Metrics collection and analysis
 * - Distributed tracing for agent interactions
 * - Health monitoring with intelligent alerting
 * - Performance monitoring and optimization insights
 * 
 * Features:
 * - <5ms observability overhead
 * - End-to-end request tracing
 * - Automated health checks and alerting
 * - Real-time metrics dashboards
 * - Integration with existing logging infrastructure
 */

export { ObservabilityManager } from './observability-manager.js';
export { TracingSystem } from './tracing-system.js';
export { MetricsCollector } from './metrics-collector.js';
export { AlertingSystem } from './alerting-system.js';
export { ObservabilityDashboard } from './dashboard.js';

// Types
export type {
  ObservabilityConfig,
  TraceContext,
  TraceSpan,
  MetricType,
  AlertRule,
  DashboardData,
  ObservabilityMetrics,
} from './types.js';

// Utilities
export {
  withTracing,
  withMetrics,
  createTraceContext,
  formatTraceOutput,
} from './utils.js';

// Constants
export { OBSERVABILITY_CONSTANTS } from './constants.js';