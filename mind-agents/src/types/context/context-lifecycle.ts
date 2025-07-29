/**
 * Context Lifecycle Management System for SYMindX
 * 
 * Provides comprehensive lifecycle management for agent contexts including
 * creation, validation, enrichment, propagation, and cleanup.
 */

import { Agent } from '../agent';
import { BaseContext } from '../context';
import { OperationResult } from '../helpers';
import { EmotionState } from '../emotion';
import { MemoryRecord } from '../memory';

/**
 * Context lifecycle states
 */
export enum ContextLifecycleState {
  INITIALIZING = 'initializing',
  ACTIVE = 'active',
  ENRICHING = 'enriching',
  PROPAGATING = 'propagating',
  STALE = 'stale',
  CLEANUP = 'cleanup',
  DISPOSED = 'disposed',
  ERROR = 'error'
}

/**
 * Context lifecycle events
 */
export enum ContextLifecycleEvent {
  // Creation events
  CONTEXT_REQUESTED = 'context_requested',
  CONTEXT_CREATED = 'context_created',
  CONTEXT_INITIALIZED = 'context_initialized',
  
  // Validation events
  VALIDATION_STARTED = 'validation_started',
  VALIDATION_PASSED = 'validation_passed',
  VALIDATION_FAILED = 'validation_failed',
  
  // Enrichment events
  ENRICHMENT_STARTED = 'enrichment_started',
  ENRICHMENT_COMPLETED = 'enrichment_completed',
  ENRICHMENT_FAILED = 'enrichment_failed',
  
  // State transitions
  STATE_TRANSITION = 'state_transition',
  CONTEXT_ACTIVATED = 'context_activated',
  CONTEXT_DEACTIVATED = 'context_deactivated',
  
  // Propagation events
  PROPAGATION_STARTED = 'propagation_started',
  PROPAGATION_COMPLETED = 'propagation_completed',
  CONTEXT_INHERITED = 'context_inherited',
  
  // Cleanup events
  CLEANUP_SCHEDULED = 'cleanup_scheduled',
  CLEANUP_STARTED = 'cleanup_started',
  CLEANUP_COMPLETED = 'cleanup_completed',
  CONTEXT_DISPOSED = 'context_disposed',
  
  // Error events
  LIFECYCLE_ERROR = 'lifecycle_error',
  VALIDATION_ERROR = 'validation_error',
  ENRICHMENT_ERROR = 'enrichment_error',
  PROPAGATION_ERROR = 'propagation_error',
  CLEANUP_ERROR = 'cleanup_error'
}

/**
 * Context request configuration
 */
export interface ContextRequest {
  /** Agent requesting the context */
  agentId: string;
  
  /** Request type and purpose */
  requestType: 'conversation' | 'task' | 'emotion' | 'memory' | 'autonomous' | 'custom';
  
  /** Base context data */
  baseContext?: Partial<BaseContext>;
  
  /** Context inheritance configuration */
  inheritance?: {
    /** Parent context to inherit from */
    parentContextId?: string;
    /** Properties to inherit */
    inheritableProperties?: string[];
    /** Whether to merge or override inherited properties */
    mergeStrategy?: 'merge' | 'override' | 'selective';
  };
  
  /** Context scoping */
  scope?: {
    /** Context visibility */
    visibility: 'private' | 'shared' | 'global';
    /** Access permissions */
    permissions?: string[];
    /** TTL for context */
    ttl?: number;
  };
  
  /** Enrichment configuration */
  enrichment?: {
    /** Enable automatic enrichment */
    enabled: boolean;
    /** Enrichment pipeline steps */
    steps?: string[];
    /** Custom enrichment configuration */
    config?: Record<string, any>;
  };
  
  /** Performance monitoring */
  monitoring?: {
    /** Enable performance tracking */
    enabled: boolean;
    /** Metrics to collect */
    metrics?: string[];
    /** Alerting thresholds */
    thresholds?: Record<string, number>;
  };
  
  /** Custom metadata */
  metadata?: Record<string, any>;
}

/**
 * Context validation result
 */
export interface ContextValidationResult {
  /** Whether validation passed */
  isValid: boolean;
  
  /** Validation score (0-1) */
  score: number;
  
  /** Validation errors */
  errors: Array<{
    property: string;
    message: string;
    severity: 'error' | 'warning' | 'info';
    code?: string;
  }>;
  
  /** Validation warnings */
  warnings: string[];
  
  /** Suggested fixes */
  suggestions: Array<{
    property: string;
    suggestion: string;
    autofix?: boolean;
  }>;
  
  /** Validation metadata */
  metadata: {
    validatedAt: Date;
    validatorVersion: string;
    validationDuration: number;
    rulesApplied: string[];
  };
}

/**
 * Context lifecycle event data
 */
export interface ContextLifecycleEventData {
  /** Context ID */
  contextId: string;
  
  /** Agent ID */
  agentId: string;
  
  /** Event type */
  event: ContextLifecycleEvent;
  
  /** Previous state (for transitions) */
  previousState?: ContextLifecycleState;
  
  /** Current state */
  currentState: ContextLifecycleState;
  
  /** Event timestamp */
  timestamp: Date;
  
  /** Event metadata */
  metadata?: {
    /** Duration of operation */
    duration?: number;
    /** Performance metrics */
    metrics?: Record<string, number>;
    /** Error information */
    error?: Error;
    /** Additional data */
    data?: Record<string, any>;
  };
}

/**
 * Context lifecycle hooks
 */
export interface ContextLifecycleHooks {
  /** Called before context creation */
  beforeCreate?: (request: ContextRequest) => Promise<ContextRequest>;
  
  /** Called after context creation */
  afterCreate?: (contextId: string, context: BaseContext) => Promise<void>;
  
  /** Called before validation */
  beforeValidation?: (contextId: string, context: BaseContext) => Promise<void>;
  
  /** Called after validation */
  afterValidation?: (contextId: string, result: ContextValidationResult) => Promise<void>;
  
  /** Called before enrichment */
  beforeEnrichment?: (contextId: string, context: BaseContext) => Promise<void>;
  
  /** Called after enrichment */
  afterEnrichment?: (contextId: string, context: BaseContext) => Promise<void>;
  
  /** Called before state transitions */
  beforeStateTransition?: (
    contextId: string,
    fromState: ContextLifecycleState,
    toState: ContextLifecycleState
  ) => Promise<boolean>;
  
  /** Called after state transitions */
  afterStateTransition?: (
    contextId: string,
    fromState: ContextLifecycleState,
    toState: ContextLifecycleState
  ) => Promise<void>;
  
  /** Called before cleanup */
  beforeCleanup?: (contextId: string) => Promise<void>;
  
  /** Called after cleanup */
  afterCleanup?: (contextId: string) => Promise<void>;
  
  /** Called on lifecycle errors */
  onError?: (contextId: string, error: Error, event: ContextLifecycleEvent) => Promise<void>;
}

/**
 * Context lifecycle metrics
 */
export interface ContextLifecycleMetrics {
  /** Context ID */
  contextId: string;
  
  /** Agent ID */
  agentId: string;
  
  /** Lifecycle timestamps */
  timestamps: {
    requested: Date;
    created: Date;
    validated?: Date;
    enriched?: Date;
    activated?: Date;
    deactivated?: Date;
    disposed?: Date;
  };
  
  /** Performance metrics */
  performance: {
    /** Creation duration (ms) */
    creationDuration: number;
    /** Validation duration (ms) */
    validationDuration?: number;
    /** Enrichment duration (ms) */
    enrichmentDuration?: number;
    /** Total lifecycle duration (ms) */
    totalDuration?: number;
    /** Memory usage (bytes) */
    memoryUsage: number;
    /** CPU time (ms) */
    cpuTime: number;
  };
  
  /** State transition history */
  stateHistory: Array<{
    state: ContextLifecycleState;
    timestamp: Date;
    duration: number;
  }>;
  
  /** Event counts */
  eventCounts: Record<ContextLifecycleEvent, number>;
  
  /** Error tracking */
  errors: Array<{
    error: Error;
    event: ContextLifecycleEvent;
    timestamp: Date;
    recovered: boolean;
  }>;
  
  /** Custom metrics */
  custom: Record<string, number>;
}

/**
 * Managed context wrapper
 */
export interface ManagedContext {
  /** Context ID */
  id: string;
  
  /** Agent ID */
  agentId: string;
  
  /** Current lifecycle state */
  state: ContextLifecycleState;
  
  /** The actual context data */
  context: BaseContext;
  
  /** Context configuration */
  config: ContextRequest;
  
  /** Lifecycle metrics */
  metrics: ContextLifecycleMetrics;
  
  /** Parent context reference */
  parentId?: string;
  
  /** Child context references */
  childIds: Set<string>;
  
  /** Context dependencies */
  dependencies: Set<string>;
  
  /** Context references (weak references to prevent cycles) */
  references: WeakSet<any>;
  
  /** Cleanup scheduled timestamp */
  cleanupScheduled?: Date;
  
  /** Last accessed timestamp */
  lastAccessed: Date;
  
  /** Context metadata */
  metadata: Record<string, any>;
}

/**
 * Context lifecycle manager interface
 */
export interface ContextLifecycleManager {
  /**
   * Request a new context
   */
  requestContext(request: ContextRequest): Promise<string>;
  
  /**
   * Get a managed context by ID
   */
  getContext(contextId: string): Promise<ManagedContext | null>;
  
  /**
   * Get context by agent ID
   */
  getContextByAgent(agentId: string): Promise<ManagedContext | null>;
  
  /**
   * Validate a context
   */
  validateContext(contextId: string): Promise<ContextValidationResult>;
  
  /**
   * Enrich a context with additional data
   */
  enrichContext(contextId: string): Promise<void>;
  
  /**
   * Propagate context to child agents
   */
  propagateContext(contextId: string, targetAgentIds: string[]): Promise<string[]>;
  
  /**
   * Inherit context from parent
   */
  inheritContext(childContextId: string, parentContextId: string): Promise<void>;
  
  /**
   * Update context state
   */
  updateContextState(contextId: string, newState: ContextLifecycleState): Promise<void>;
  
  /**
   * Schedule context cleanup
   */
  scheduleCleanup(contextId: string, delay?: number): Promise<void>;
  
  /**
   * Force immediate cleanup
   */
  cleanupContext(contextId: string): Promise<void>;
  
  /**
   * Dispose of context and release resources
   */
  disposeContext(contextId: string): Promise<void>;
  
  /**
   * List all contexts for an agent
   */
  listContexts(agentId?: string): Promise<ManagedContext[]>;
  
  /**
   * Get context metrics
   */
  getMetrics(contextId: string): Promise<ContextLifecycleMetrics | null>;
  
  /**
   * Register lifecycle hooks
   */
  registerHooks(hooks: Partial<ContextLifecycleHooks>): void;
  
  /**
   * Unregister lifecycle hooks
   */
  unregisterHooks(hooks: Partial<ContextLifecycleHooks>): void;
  
  /**
   * Subscribe to lifecycle events
   */
  onLifecycleEvent(
    event: ContextLifecycleEvent,
    handler: (data: ContextLifecycleEventData) => Promise<void>
  ): () => void;
  
  /**
   * Health check for lifecycle manager
   */
  healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    metrics: {
      activeContexts: number;
      totalContexts: number;
      avgCreationTime: number;
      errorRate: number;
      memoryUsage: number;
    };
    issues: string[];
  }>;
  
  /**
   * Cleanup stale contexts
   */
  cleanupStaleContexts(): Promise<number>;
  
  /**
   * Export context data for persistence
   */
  exportContext(contextId: string): Promise<any>;
  
  /**
   * Import context data from persistence
   */
  importContext(data: unknown): Promise<string>;
  
  /**
   * Initialize the lifecycle manager
   */
  initialize(): Promise<void>;
  
  /**
   * Shutdown the lifecycle manager
   */
  shutdown(): Promise<void>;
}

/**
 * Context lifecycle manager configuration
 */
export interface ContextLifecycleManagerConfig {
  /** Maximum number of contexts per agent */
  maxContextsPerAgent?: number;
  
  /** Default context TTL (ms) */
  defaultTtl?: number;
  
  /** Cleanup interval (ms) */
  cleanupInterval?: number;
  
  /** Enable performance monitoring */
  enableMonitoring?: boolean;
  
  /** Enable automatic enrichment */
  enableEnrichment?: boolean;
  
  /** Memory thresholds */
  memoryThresholds?: {
    warning: number;
    critical: number;
  };
  
  /** Error recovery settings */
  errorRecovery?: {
    maxRetries: number;
    retryDelay: number;
    enableAutoRecovery: boolean;
  };
  
  /** Validation settings */
  validation?: {
    strict: boolean;
    rules: string[];
    customValidators?: Record<string, (context: BaseContext) => ContextValidationResult>;
  };
  
  /** Custom configuration */
  custom?: Record<string, any>;
}