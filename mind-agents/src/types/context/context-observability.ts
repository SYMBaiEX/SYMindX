/**
 * @module types/context/context-observability
 * @description Context-specific observability types for comprehensive tracing and debugging
 */

import type {
  TraceContext,
  TraceSpan,
  ObservabilityMetrics,
} from '../observability/index.ts';
import type { AgentId, CorrelationId, ModuleId } from '../helpers.ts';
import type { PortalContext } from '../context.ts';

/**
 * Context observability system interface
 */
export interface ContextObservabilitySystem {
  /** Context tracer for distributed tracing */
  tracer: ContextTracer;

  /** Metrics collector for performance monitoring */
  metrics: ContextMetricsCollector;

  /** Debugger for development and troubleshooting */
  debugger: ContextDebugger;

  /** Versioning system for context evolution tracking */
  versioning: ContextVersioning;

  /** Visualizer for context flow representation */
  visualizer: ContextVisualizer;

  /** Start observability for a context instance */
  startObservation(
    contextId: string,
    config?: ContextObservabilityConfig
  ): Promise<ContextTrace>;

  /** Stop observability for a context instance */
  stopObservation(contextId: string): Promise<void>;

  /** Get current observability state */
  getObservabilityState(contextId?: string): ContextObservabilityState;

  /** Configure observability settings */
  configure(config: Partial<ContextObservabilityConfig>): void;

  /** Cleanup resources */
  dispose(): Promise<void>;
}

/**
 * Context observability configuration
 */
export interface ContextObservabilityConfig {
  /** Enable/disable context tracing */
  tracing: {
    enabled: boolean;
    sampleRate: number;
    maxContextDepth: number;
    enableFlowVisualization: boolean;
    traceRetentionMs: number;
  };

  /** Metrics collection settings */
  metrics: {
    enabled: boolean;
    collectionIntervalMs: number;
    enableContextMetrics: boolean;
    enableTransformationMetrics: boolean;
    enableFlowMetrics: boolean;
    maxMetricsPerContext: number;
  };

  /** Debug configuration */
  debug: {
    enabled: boolean;
    enableBreakpoints: boolean;
    enableStepThrough: boolean;
    enableContextInspection: boolean;
    maxDebugHistorySize: number;
    enableConsoleIntegration: boolean;
  };

  /** Versioning settings */
  versioning: {
    enabled: boolean;
    enableDiffTracking: boolean;
    enableRollback: boolean;
    maxVersionHistory: number;
    compressionEnabled: boolean;
  };

  /** Visualization settings */
  visualization: {
    enabled: boolean;
    enableRealTimeUpdates: boolean;
    maxNodesInGraph: number;
    enableInteractiveMode: boolean;
    renderFormat: 'svg' | 'canvas' | 'webgl';
  };

  /** Performance settings */
  performance: {
    maxOverheadMs: number;
    enableProfiling: boolean;
    enableMemoryTracking: boolean;
    enableAsyncTracking: boolean;
  };
}

/**
 * Context trace for tracking context flow through the system
 */
export interface ContextTrace extends TraceContext {
  /** Context identifier */
  contextId: string;

  /** Agent that owns this context */
  agentId?: AgentId;

  /** Context type information */
  contextType:
    | 'portal'
    | 'memory'
    | 'cognition'
    | 'emotion'
    | 'extension'
    | 'system';

  /** Context hierarchy information */
  hierarchy: {
    parentContextId?: string;
    childContextIds: string[];
    depth: number;
    rootContextId: string;
  };

  /** Context lifecycle stages */
  lifecycle: {
    created: Date;
    initialized?: Date;
    firstAccess?: Date;
    lastAccess?: Date;
    destroyed?: Date;
    totalLifetimeMs?: number;
  };

  /** Context transformations applied */
  transformations: ContextTransformationTrace[];

  /** Context access patterns */
  accessPatterns: ContextAccessTrace[];

  /** Context sharing information */
  sharing: {
    shareCount: number;
    sharedWith: string[];
    shareType: 'read' | 'write' | 'readwrite';
    isolationLevel: 'none' | 'weak' | 'strong';
  };

  /** Flow analysis */
  flow: {
    entryPoints: ContextEntryPoint[];
    exitPoints: ContextExitPoint[];
    criticalPath: ContextFlowNode[];
    bottlenecks: ContextBottleneck[];
  };

  /** Context quality metrics */
  quality: {
    completeness: number; // 0-1
    consistency: number; // 0-1
    freshness: number; // 0-1
    relevance: number; // 0-1
    reliability: number; // 0-1
  };
}

/**
 * Context transformation tracking
 */
export interface ContextTransformationTrace {
  transformationId: string;
  transformationType: string;
  appliedAt: Date;
  duration: number;
  inputSize: number;
  outputSize: number;
  success: boolean;
  error?: string;
  metadata: Record<string, unknown>;
}

/**
 * Context access tracking
 */
export interface ContextAccessTrace {
  accessId: string;
  accessor: string; // Module or component that accessed context
  accessType: 'read' | 'write' | 'merge' | 'transform';
  accessedAt: Date;
  duration: number;
  dataSize: number;
  success: boolean;
  error?: string;
  callStack?: string[];
}

/**
 * Context flow entry point
 */
export interface ContextEntryPoint {
  entryId: string;
  source: string;
  entryType: 'creation' | 'injection' | 'merge' | 'transform';
  timestamp: Date;
  dataSize: number;
  metadata: Record<string, unknown>;
}

/**
 * Context flow exit point
 */
export interface ContextExitPoint {
  exitId: string;
  destination: string;
  exitType: 'consumption' | 'transformation' | 'storage' | 'disposal';
  timestamp: Date;
  dataSize: number;
  metadata: Record<string, unknown>;
}

/**
 * Context flow node for critical path analysis
 */
export interface ContextFlowNode {
  nodeId: string;
  nodeType: string;
  processingTime: number;
  queueTime: number;
  throughput: number;
  timestamp: Date;
  dependencies: string[];
}

/**
 * Context bottleneck identification
 */
export interface ContextBottleneck {
  bottleneckId: string;
  location: string;
  bottleneckType: 'processing' | 'memory' | 'network' | 'dependency';
  impact: 'low' | 'medium' | 'high' | 'critical';
  delay: number;
  suggestions: string[];
  detectedAt: Date;
}

/**
 * Context-specific metrics
 */
export interface ContextMetrics extends ObservabilityMetrics {
  /** Context-specific metrics */
  context: {
    /** Context instance metrics */
    instances: Record<
      string,
      {
        lifetimeMs: number;
        accessCount: number;
        transformationCount: number;
        memoryUsage: number;
        lastActivity: Date;
        qualityScore: number;
      }
    >;

    /** Context type metrics */
    types: Record<
      string,
      {
        instanceCount: number;
        averageLifetime: number;
        averageSize: number;
        errorRate: number;
        throughput: number;
      }
    >;

    /** Context flow metrics */
    flow: {
      totalFlows: number;
      activeFlows: number;
      averageFlowTime: number;
      bottleneckCount: number;
      flowEfficiency: number;
    };

    /** Context transformation metrics */
    transformations: Record<
      string,
      {
        count: number;
        successRate: number;
        averageDuration: number;
        dataReduction: number;
        errorCount: number;
      }
    >;

    /** Context sharing metrics */
    sharing: {
      shareCount: number;
      concurrentShares: number;
      isolationViolations: number;
      sharingEfficiency: number;
    };
  };
}

/**
 * Context debug information
 */
export interface ContextDebugInfo {
  /** Context identifier */
  contextId: string;

  /** Debug session identifier */
  debugSessionId: string;

  /** Current debug state */
  state: 'running' | 'paused' | 'stepping' | 'stopped';

  /** Debug breakpoints */
  breakpoints: ContextBreakpoint[];

  /** Current execution position */
  position: {
    moduleId: string;
    operation: string;
    line?: number;
    column?: number;
    stackTrace: string[];
  };

  /** Context variables for inspection */
  variables: Record<
    string,
    {
      value: unknown;
      type: string;
      mutable: boolean;
      sensitive: boolean;
    }
  >;

  /** Context call stack */
  callStack: ContextStackFrame[];

  /** Debug history */
  history: ContextDebugEvent[];

  /** Performance profile */
  profile: {
    hotSpots: ContextHotSpot[];
    memoryProfile: ContextMemoryProfile;
    timeProfile: ContextTimeProfile;
  };
}

/**
 * Context breakpoint definition
 */
export interface ContextBreakpoint {
  breakpointId: string;
  type: 'line' | 'condition' | 'data' | 'access';
  location: {
    moduleId?: string;
    operation?: string;
    line?: number;
  };
  condition?: string;
  enabled: boolean;
  hitCount: number;
  createdAt: Date;
}

/**
 * Context stack frame for debugging
 */
export interface ContextStackFrame {
  frameId: string;
  moduleId: string;
  operation: string;
  arguments: Record<string, unknown>;
  locals: Record<string, unknown>;
  line?: number;
  column?: number;
  sourceFile?: string;
}

/**
 * Context debug event
 */
export interface ContextDebugEvent {
  eventId: string;
  eventType: 'breakpoint' | 'step' | 'exception' | 'variable_change';
  timestamp: Date;
  location: {
    moduleId: string;
    operation: string;
    line?: number;
  };
  data: Record<string, unknown>;
}

/**
 * Context performance hot spot
 */
export interface ContextHotSpot {
  location: string;
  operation: string;
  executionCount: number;
  totalTime: number;
  averageTime: number;
  percentOfTotal: number;
  suggestions: string[];
}

/**
 * Context memory profile
 */
export interface ContextMemoryProfile {
  totalAllocated: number;
  currentUsage: number;
  peakUsage: number;
  allocations: Array<{
    location: string;
    size: number;
    type: string;
    timestamp: Date;
  }>;
  leaks: Array<{
    location: string;
    size: number;
    age: number;
    suspectedCause: string;
  }>;
}

/**
 * Context time profile
 */
export interface ContextTimeProfile {
  totalExecutionTime: number;
  operationTimes: Record<
    string,
    {
      totalTime: number;
      callCount: number;
      averageTime: number;
      minTime: number;
      maxTime: number;
    }
  >;
  criticalPath: Array<{
    operation: string;
    duration: number;
    startTime: Date;
    dependencies: string[];
  }>;
}

/**
 * Context versioning information
 */
export interface ContextVersion {
  versionId: string;
  contextId: string;
  version: number;
  parentVersion?: number;
  createdAt: Date;
  createdBy: string;
  changeType: 'create' | 'update' | 'merge' | 'transform' | 'delete';
  changeDescription: string;
  dataSnapshot: unknown;
  dataSize: number;
  checksum: string;
  tags: string[];
  metadata: Record<string, unknown>;
}

/**
 * Context diff for version comparison
 */
export interface ContextDiff {
  fromVersion: number;
  toVersion: number;
  changes: ContextChange[];
  summary: {
    additions: number;
    deletions: number;
    modifications: number;
    totalChanges: number;
  };
  impact: 'low' | 'medium' | 'high' | 'breaking';
}

/**
 * Individual context change
 */
export interface ContextChange {
  changeId: string;
  changeType: 'add' | 'delete' | 'modify' | 'move';
  path: string;
  oldValue?: unknown;
  newValue?: unknown;
  impact: 'low' | 'medium' | 'high';
  description: string;
}

/**
 * Context visualization data
 */
export interface ContextVisualization {
  /** Visualization identifier */
  visualizationId: string;

  /** Visualization type */
  type: 'flow' | 'hierarchy' | 'network' | 'timeline' | 'heatmap';

  /** Graph nodes */
  nodes: ContextVisualNode[];

  /** Graph edges */
  edges: ContextVisualEdge[];

  /** Layout information */
  layout: {
    algorithm: 'force' | 'hierarchy' | 'circular' | 'grid';
    dimensions: { width: number; height: number; depth?: number };
    bounds: { minX: number; maxX: number; minY: number; maxY: number };
  };

  /** Interactive features */
  interactions: {
    enableZoom: boolean;
    enablePan: boolean;
    enableSelection: boolean;
    enableFiltering: boolean;
    enableAnimation: boolean;
  };

  /** Rendering metadata */
  rendering: {
    generatedAt: Date;
    nodeCount: number;
    edgeCount: number;
    renderTime: number;
    format: string;
  };
}

/**
 * Context visualization node
 */
export interface ContextVisualNode {
  nodeId: string;
  label: string;
  type: string;
  position: { x: number; y: number; z?: number };
  size: { width: number; height: number };
  style: {
    color: string;
    borderColor: string;
    shape: 'circle' | 'rectangle' | 'diamond' | 'ellipse';
    opacity: number;
  };
  data: Record<string, unknown>;
  metadata: {
    contextId?: string;
    moduleId?: string;
    operation?: string;
    status: 'active' | 'inactive' | 'error' | 'pending';
    metrics?: Record<string, number>;
  };
}

/**
 * Context visualization edge
 */
export interface ContextVisualEdge {
  edgeId: string;
  sourceNodeId: string;
  targetNodeId: string;
  label?: string;
  type: 'data' | 'control' | 'dependency' | 'communication';
  style: {
    color: string;
    width: number;
    style: 'solid' | 'dashed' | 'dotted';
    arrow: boolean;
    opacity: number;
  };
  data: Record<string, unknown>;
  metadata: {
    flowRate?: number;
    latency?: number;
    errorRate?: number;
    bandwidth?: number;
  };
}

/**
 * Context monitoring event types
 */
export type ContextMonitoringEvent =
  | ContextLifecycleEvent
  | ContextAccessEvent
  | ContextTransformEvent
  | ContextFlowEvent
  | ContextErrorEvent
  | ContextPerformanceEvent;

export interface ContextLifecycleEvent {
  type: 'context_lifecycle';
  contextId: string;
  stage:
    | 'created'
    | 'initialized'
    | 'accessed'
    | 'transformed'
    | 'shared'
    | 'destroyed';
  timestamp: Date;
  duration?: number;
  metadata: Record<string, unknown>;
}

export interface ContextAccessEvent {
  type: 'context_access';
  contextId: string;
  accessor: string;
  accessType: 'read' | 'write' | 'merge';
  timestamp: Date;
  duration: number;
  dataSize: number;
  success: boolean;
  metadata: Record<string, unknown>;
}

export interface ContextTransformEvent {
  type: 'context_transform';
  contextId: string;
  transformationType: string;
  inputSize: number;
  outputSize: number;
  duration: number;
  success: boolean;
  error?: string;
  metadata: Record<string, unknown>;
}

export interface ContextFlowEvent {
  type: 'context_flow';
  flowId: string;
  sourceContextId: string;
  targetContextId: string;
  flowType: 'merge' | 'split' | 'transform' | 'copy';
  timestamp: Date;
  duration: number;
  dataSize: number;
  metadata: Record<string, unknown>;
}

export interface ContextErrorEvent {
  type: 'context_error';
  contextId: string;
  errorType: string;
  errorMessage: string;
  errorStack?: string;
  operation: string;
  timestamp: Date;
  recovery?: {
    attempted: boolean;
    successful: boolean;
    strategy: string;
  };
  metadata: Record<string, unknown>;
}

export interface ContextPerformanceEvent {
  type: 'context_performance';
  contextId: string;
  metric: string;
  value: number;
  threshold?: number;
  severity: 'info' | 'warning' | 'error';
  timestamp: Date;
  metadata: Record<string, unknown>;
}

/**
 * Context observability state
 */
export interface ContextObservabilityState {
  /** Overall observability status */
  status: 'active' | 'paused' | 'error' | 'disabled';

  /** Currently traced contexts */
  tracedContexts: string[];

  /** Active debug sessions */
  debugSessions: string[];

  /** Metrics collection status */
  metricsStatus: {
    collecting: boolean;
    lastCollection: Date;
    totalMetrics: number;
  };

  /** Tracing status */
  tracingStatus: {
    active: boolean;
    sampleRate: number;
    totalTraces: number;
    activeTraces: number;
  };

  /** System health */
  health: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    issues: string[];
    lastCheck: Date;
  };

  /** Resource usage */
  resources: {
    memoryUsage: number;
    cpuUsage: number;
    storageUsage: number;
    overhead: number;
  };
}

/**
 * Context tracer interface
 */
export interface ContextTracer {
  /** Start tracing a context */
  startTrace(
    contextId: string,
    parentTrace?: ContextTrace
  ): Promise<ContextTrace>;

  /** End tracing a context */
  endTrace(contextId: string): Promise<void>;

  /** Create a span for an operation */
  createSpan(
    contextId: string,
    operation: string,
    metadata?: Record<string, unknown>
  ): Promise<TraceSpan>;

  /** Finish a span */
  finishSpan(spanId: string, result?: unknown, error?: Error): Promise<void>;

  /** Get active traces */
  getActiveTraces(): ContextTrace[];

  /** Get trace by ID */
  getTrace(contextId: string): ContextTrace | undefined;

  /** Export traces */
  exportTraces(format: 'json' | 'jaeger' | 'zipkin'): Promise<string>;
}

/**
 * Context metrics collector interface
 */
export interface ContextMetricsCollector {
  /** Start collecting metrics for a context */
  startCollection(contextId: string): Promise<void>;

  /** Stop collecting metrics for a context */
  stopCollection(contextId: string): Promise<void>;

  /** Record a metric */
  recordMetric(
    contextId: string,
    metric: string,
    value: number,
    labels?: Record<string, string>
  ): void;

  /** Get metrics for a context */
  getMetrics(contextId: string): ContextMetrics | undefined;

  /** Get all metrics */
  getAllMetrics(): ContextMetrics;

  /** Export metrics */
  exportMetrics(format: 'prometheus' | 'json'): Promise<string>;
}

/**
 * Context debugger interface
 */
export interface ContextDebugger {
  /** Start debug session */
  startDebugSession(contextId: string): Promise<string>;

  /** Stop debug session */
  stopDebugSession(sessionId: string): Promise<void>;

  /** Set breakpoint */
  setBreakpoint(
    sessionId: string,
    breakpoint: Omit<
      ContextBreakpoint,
      'breakpointId' | 'hitCount' | 'createdAt'
    >
  ): Promise<string>;

  /** Remove breakpoint */
  removeBreakpoint(sessionId: string, breakpointId: string): Promise<void>;

  /** Step through execution */
  step(sessionId: string, type: 'into' | 'over' | 'out'): Promise<void>;

  /** Continue execution */
  continue(sessionId: string): Promise<void>;

  /** Pause execution */
  pause(sessionId: string): Promise<void>;

  /** Inspect context variables */
  inspectVariables(sessionId: string): Promise<Record<string, unknown>>;

  /** Evaluate expression */
  evaluate(sessionId: string, expression: string): Promise<unknown>;

  /** Get debug info */
  getDebugInfo(sessionId: string): Promise<ContextDebugInfo>;
}

/**
 * Context versioning interface
 */
export interface ContextVersioning {
  /** Create version snapshot */
  createVersion(
    contextId: string,
    description: string,
    tags?: string[]
  ): Promise<ContextVersion>;

  /** Get version history */
  getVersionHistory(contextId: string): Promise<ContextVersion[]>;

  /** Get version by ID */
  getVersion(versionId: string): Promise<ContextVersion | undefined>;

  /** Compare versions */
  compareVersions(
    contextId: string,
    fromVersion: number,
    toVersion: number
  ): Promise<ContextDiff>;

  /** Rollback to version */
  rollbackToVersion(contextId: string, version: number): Promise<void>;

  /** Tag version */
  tagVersion(versionId: string, tags: string[]): Promise<void>;

  /** Clean up old versions */
  cleanupVersions(contextId: string, keepCount: number): Promise<void>;
}

/**
 * Context visualizer interface
 */
export interface ContextVisualizer {
  /** Generate visualization */
  generateVisualization(
    contextIds: string[],
    type: ContextVisualization['type']
  ): Promise<ContextVisualization>;

  /** Update visualization */
  updateVisualization(visualizationId: string): Promise<void>;

  /** Export visualization */
  exportVisualization(
    visualizationId: string,
    format: 'svg' | 'png' | 'json'
  ): Promise<string | Buffer>;

  /** Get visualization data */
  getVisualization(
    visualizationId: string
  ): Promise<ContextVisualization | undefined>;

  /** Subscribe to real-time updates */
  subscribeToUpdates(
    visualizationId: string,
    callback: (update: ContextVisualization) => void
  ): Promise<void>;

  /** Unsubscribe from updates */
  unsubscribeFromUpdates(visualizationId: string): Promise<void>;
}
