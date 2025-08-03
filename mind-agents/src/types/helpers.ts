/**
 * Helper Types for SYMindX
 *
 * This file contains utility types and type helpers that replace void/undefined usage
 * and provide better type safety throughout the system.
 */

import type { BaseConfig, GenericData, Context, Metadata } from './common';
import type { CommunicationStyle } from './communication';

/**
 * Basic ID and timestamp types
 */
export type AgentId = string;
export type MemoryId = string;
export type EventId = string;
export type ModuleId = string;
export type CorrelationId = string;
export type Timestamp = Date;

/**
 * Operation Result Types
 * These replace void returns with meaningful result types
 */
export type VoidResult = {
  success: true;
  timestamp: Date;
  metadata?: Metadata;
};

export type VoidError = {
  success: false;
  error: string;
  timestamp: Date;
  metadata?: Metadata;
};

export type OperationResult = VoidResult | VoidError;

/**
 * Initialization Result Types
 * For module initialization that traditionally returned void
 */
export interface InitializationResult {
  success: boolean;
  message?: string;
  timestamp: Date;
  duration: number;
  metadata?: {
    moduleId: string;
    version: string;
    dependencies?: string[];
    [key: string]: BaseConfig[string];
  };
}

/**
 * Cleanup Result Types
 * For cleanup operations that traditionally returned void
 */
export interface CleanupResult {
  success: boolean;
  message?: string;
  timestamp: Date;
  resourcesReleased: string[];
  metadata?: {
    moduleId: string;
    cleanupType: 'graceful' | 'forced' | 'emergency';
    [key: string]: BaseConfig[string];
  };
}

/**
 * Event Processing Result Types
 * For event handlers that traditionally returned void
 */
export interface EventProcessingResult {
  success: boolean;
  processed: boolean;
  message?: string;
  timestamp: Date;
  eventId: string;
  metadata?: {
    processingTime: number;
    actionsTriggered: string[];
    stateChanges?: GenericData;
    [key: string]: BaseConfig[string];
  };
}

/**
 * State Update Result Types
 * For state mutations that traditionally returned void
 */
export interface StateUpdateResult {
  success: boolean;
  message?: string;
  timestamp: Date;
  changes: {
    field: string;
    oldValue: BaseConfig[string];
    newValue: BaseConfig[string];
  }[];
  metadata?: {
    updateType: 'single' | 'batch' | 'cascade';
    conflictsResolved?: number;
    [key: string]: BaseConfig[string];
  };
}

/**
 * Validation Result Types
 * Enhanced validation results with detailed feedback
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  timestamp: Date;
  metadata?: {
    validatorId: string;
    validationType: string;
    [key: string]: BaseConfig[string];
  };
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: BaseConfig[string];
  severity: 'error' | 'critical';
  suggestion?: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
  value?: BaseConfig[string];
  severity: 'warning' | 'info';
  suggestion?: string;
}

/**
 * Configuration Result Types
 * For configuration operations
 */
export interface ConfigurationResult {
  success: boolean;
  message?: string;
  timestamp: Date;
  configId: string;
  changes: {
    key: string;
    oldValue: BaseConfig[string];
    newValue: BaseConfig[string];
  }[];
  metadata?: {
    source: 'file' | 'environment' | 'runtime' | 'default';
    validation: ValidationResult;
    [key: string]: BaseConfig[string];
  };
}

/**
 * Execution Result Types
 * For command and action execution
 */
export interface ExecutionResult<T = GenericData> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
  duration: number;
  metadata?: {
    commandId: string;
    executorId: string;
    retryCount?: number;
    [key: string]: BaseConfig[string];
  };
}

/**
 * Async Operation Result Types
 * For long-running operations
 */
export interface AsyncOperationResult<T = GenericData> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
  duration: number;
  operationId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress?: {
    current: number;
    total: number;
    percentage: number;
    message?: string;
  };
  metadata?: {
    startTime: Date;
    endTime?: Date;
    checkpoints?: string[];
    [key: string]: BaseConfig[string];
  };
}

/**
 * Resource Management Result Types
 * For resource allocation and deallocation
 */
export interface ResourceResult {
  success: boolean;
  message?: string;
  timestamp: Date;
  resourceId: string;
  resourceType: string;
  operation: 'allocate' | 'deallocate' | 'update' | 'query';
  metadata?: {
    resourceState: 'available' | 'allocated' | 'locked' | 'released';
    usage?: {
      memory?: number;
      cpu?: number;
      storage?: number;
      network?: number;
    };
    [key: string]: BaseConfig[string];
  };
}

/**
 * Factory Result Types
 * For factory method results
 */
export interface FactoryResult<T> {
  success: boolean;
  instance?: T;
  error?: string;
  timestamp: Date;
  factoryId: string;
  metadata?: {
    factoryType: string;
    config: BaseConfig;
    dependencies?: string[];
    [key: string]: BaseConfig[string];
  };
}

/**
 * Registry Result Types
 * For registry operations
 */
export interface RegistryResult {
  success: boolean;
  message?: string;
  timestamp: Date;
  operation: 'register' | 'unregister' | 'update' | 'query';
  itemId: string;
  itemType: string;
  metadata?: {
    registrySize: number;
    conflicts?: string[];
    [key: string]: BaseConfig[string];
  };
}

/**
 * Health Check Result Types
 * For system health monitoring
 */
export interface HealthCheckResult {
  healthy: boolean;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  message?: string;
  timestamp: Date;
  checkId?: string;
  componentId: string;
  responseTime?: number;
  attempt?: number;
  error?: string;
  details?: {
    message?: string;
    uptime?: number;
    responseTime?: number;
    retries?: number;
    memory?: number;
    cpu?: number;
    errors?: string[];
    warnings?: string[];
    [key: string]: BaseConfig[string];
  };
  metadata?: {
    checkType: 'basic' | 'detailed' | 'comprehensive';
    dependencies?: HealthCheckResult[];
    [key: string]: BaseConfig[string];
  };
}

/**
 * Lifecycle Event Result Types
 * For lifecycle event handling
 */
export interface LifecycleEventResult {
  success: boolean;
  message?: string;
  timestamp: Date;
  eventType: 'start' | 'stop' | 'pause' | 'resume' | 'restart' | 'reload';
  componentId: string;
  metadata?: {
    previousState: string;
    newState: string;
    stateTransitionTime: number;
    [key: string]: BaseConfig[string];
  };
}

/**
 * Utility Types for Better Type Safety
 */

/**
 * Branded types for better type safety
 * NOTE: Brand type preserved for future use but currently disabled
 * to simplify type assignments and fix compilation errors
 */
export type Brand<T, K> = T & { __brand: K };

/**
 * Additional ID types (previously branded)
 * These are now plain strings for easier assignment and compatibility
 */
export type ExtensionId = string;
export type PortalId = string;
export type SessionId = string;

/**
 * Additional timestamp types (previously branded)
 */
export type Duration = number;
export type Milliseconds = number;

/**
 * Simplified numeric types (previously branded)
 */
export type Percentage = number;
export type Confidence = number;
export type Priority = number;
export type Version = string;

/**
 * Advanced utility types
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalFields<T, K extends keyof T> = Omit<T, K> &
  Partial<Pick<T, K>>;

export type Nullable<T> = T | null;

export type Optional<T> = T | undefined;

export type NonEmptyArray<T> = [T, ...T[]];

export type StringKeys<T> = Extract<keyof T, string>;

export type NumberKeys<T> = Extract<keyof T, number>;

export type SymbolKeys<T> = Extract<keyof T, symbol>;

/**
 * Function types for better type safety
 */
export type AsyncFunction<T = unknown, R = unknown> = (args: T) => Promise<R>;

export type SyncFunction<T = unknown, R = unknown> = (args: T) => R;

export type EventHandler<T = GenericData> = (event: T) => OperationResult;

export type AsyncEventHandler<T = GenericData> = (
  event: T
) => Promise<OperationResult>;

export type Factory<T, C = BaseConfig> = (config: C) => T;

export type AsyncFactory<T, C = BaseConfig> = (config: C) => Promise<T>;

export type Validator<T> = (value: T) => ValidationResult;

export type AsyncValidator<T> = (value: T) => Promise<ValidationResult>;

export type Transformer<T, R> = (input: T) => R;

export type AsyncTransformer<T, R> = (input: T) => Promise<R>;

/**
 * Predicate types
 */
export type Predicate<T> = (value: T) => boolean;

export type AsyncPredicate<T> = (value: T) => Promise<boolean>;

/**
 * Comparison types
 */
export type Comparator<T> = (a: T, b: T) => number;

export type Equals<T> = (a: T, b: T) => boolean;

/**
 * Builder pattern types
 */
export type Builder<T> = {
  build(): T;
};

export type FluentBuilder<T> = {
  [K in keyof T]: (value: T[K]) => FluentBuilder<T>;
} & Builder<T>;

/**
 * State machine types
 */
export type State<T> = {
  name: string;
  value: T;
  metadata?: Metadata;
};

export type Transition<T> = {
  from: string;
  to: string;
  trigger: string;
  guard?: Predicate<T>;
  action?: (context: T) => OperationResult;
};

export type StateMachine<T> = {
  currentState: State<T>;
  states: State<T>[];
  transitions: Transition<T>[];
  trigger: (event: string, context: T) => OperationResult;
};

/**
 * Observer pattern types
 */
export type Observer<T> = {
  update: (data: T) => OperationResult;
};

export type ObservableSubject<T> = {
  attach: (observer: Observer<T>) => OperationResult;
  detach: (observer: Observer<T>) => OperationResult;
  notify: (data: T) => OperationResult;
};

/**
 * Command pattern types
 */
export type Command<T = Context> = {
  execute: (context: T) => OperationResult;
  undo?: (context: T) => OperationResult;
  redo?: (context: T) => OperationResult;
};

export type CommandInvoker<T = Context> = {
  execute: (command: Command<T>, context: T) => OperationResult;
  undo: () => OperationResult;
  redo: () => OperationResult;
};

/**
 * Strategy pattern types
 */
export type Strategy<T, R> = {
  execute: (input: T) => R;
};

export type StrategyContext<T, R> = {
  strategy: Strategy<T, R>;
  setStrategy: (strategy: Strategy<T, R>) => OperationResult;
  execute: (input: T) => R;
};

/**
 * Error handling types
 */
export type ErrorHandler<T = Context> = (
  error: Error,
  context?: T
) => OperationResult;

export type AsyncErrorHandler<T = Context> = (
  error: Error,
  context?: T
) => Promise<OperationResult>;

export type RetryPolicy = {
  maxAttempts: number;
  initialDelay: number;
  backoffFactor: number;
  maxDelay: number;
  retryCondition?: (error: Error) => boolean;
};

export type CircuitBreakerConfig = {
  failureThreshold: number;
  resetTimeout: number;
  monitor?: (result: OperationResult) => void;
};

/**
 * Caching types
 */
export type CacheKey = string | number | symbol;

export type Cache<T> = {
  get: (key: CacheKey) => Optional<T>;
  set: (key: CacheKey, value: T, ttl?: number) => OperationResult;
  delete: (key: CacheKey) => OperationResult;
  clear: () => OperationResult;
  has: (key: CacheKey) => boolean;
  size: () => number;
};

/**
 * Serialization types
 */
export type Serializer<T> = {
  serialize: (data: T) => string;
  deserialize: (data: string) => T;
};

export type JSONSerializable =
  | string
  | number
  | boolean
  | null
  | JSONSerializable[]
  | { [key: string]: JSONSerializable };

/**
 * Logging types
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export type LogEntry = {
  level: LogLevel;
  message: string;
  timestamp: Timestamp;
  metadata?: Metadata;
  correlationId?: CorrelationId;
};

export type Logger = {
  log: (entry: LogEntry) => OperationResult;
  debug: (message: string, metadata?: Metadata) => OperationResult;
  info: (message: string, metadata?: Metadata) => OperationResult;
  warn: (message: string, metadata?: Metadata) => OperationResult;
  error: (
    message: string,
    error?: Error,
    metadata?: Metadata
  ) => OperationResult;
  fatal: (
    message: string,
    error?: Error,
    metadata?: Metadata
  ) => OperationResult;
};

/**
 * Metrics types
 */
export type Metric = {
  name: string;
  value: number;
  timestamp: Timestamp;
  tags?: Record<string, string>;
  metadata?: Metadata;
};

export type Counter = {
  increment: (amount?: number) => OperationResult;
  decrement: (amount?: number) => OperationResult;
  getValue: () => number;
  reset: () => OperationResult;
};

export type Gauge = {
  setValue: (value: number) => OperationResult;
  getValue: () => number;
};

export type Timer = {
  start: () => OperationResult;
  stop: () => Duration;
  record: (duration: Duration) => OperationResult;
};

/**
 * Configuration types
 */
export type ConfigValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | ConfigValue[]
  | { [key: string]: ConfigValue };

export type ConfigProvider = {
  get: <T extends ConfigValue>(key: string, defaultValue?: T) => T;
  set: (key: string, value: ConfigValue) => OperationResult;
  has: (key: string) => boolean;
  delete: (key: string) => OperationResult;
  getAll: () => Record<string, ConfigValue>;
  reload: () => Promise<OperationResult>;
};

/**
 * Event system types
 */
export type EventBus = {
  emit: <T>(event: string, data: T) => OperationResult;
  on: <T>(event: string, handler: EventHandler<T>) => OperationResult;
  off: <T>(event: string, handler: EventHandler<T>) => OperationResult;
  once: <T>(event: string, handler: EventHandler<T>) => OperationResult;
  listenerCount: (event: string) => number;
};

/**
 * Resource management types
 */
export type Resource = {
  id: string;
  type: string;
  status: 'available' | 'allocated' | 'locked' | 'released';
  metadata?: Metadata;
};

export type ResourceManager = {
  allocate: (type: string, requirements?: BaseConfig) => Promise<Resource>;
  deallocate: (resourceId: string) => Promise<OperationResult>;
  query: (type: string, filters?: BaseConfig) => Promise<Resource[]>;
  getStatus: (resourceId: string) => Promise<Resource>;
  // Additional methods required by the codebase
  allocateResources: (
    agentId: string,
    requirements: BaseConfig
  ) => Promise<OperationResult>;
  releaseResources: (agentId: string) => Promise<OperationResult>;
  checkAvailability: (
    type: string,
    requirements?: BaseConfig
  ) => Promise<boolean>;
  getCurrentUsage: (agentId?: string) => Promise<GenericData>;
};

/**
 * Dependency injection types
 */
export type Container = {
  register: <T>(name: string, factory: Factory<T>) => OperationResult;
  resolve: <T>(name: string) => T;
  has: (name: string) => boolean;
  unregister: (name: string) => OperationResult;
};

/**
 * Plugin system types
 */
export type Plugin = {
  id: string;
  name: string;
  version: string;
  initialize: (container: Container) => Promise<OperationResult>;
  cleanup: () => Promise<OperationResult>;
  metadata?: Metadata;
};

export type PluginManager = {
  register: (plugin: Plugin) => Promise<OperationResult>;
  unregister: (pluginId: string) => Promise<OperationResult>;
  enable: (pluginId: string) => Promise<OperationResult>;
  disable: (pluginId: string) => Promise<OperationResult>;
  list: () => Plugin[];
  get: (pluginId: string) => Optional<Plugin>;
};

/**
 * Security types
 */
export type Permission = {
  id: string;
  name: string;
  description: string;
  scope: string;
};

export type Role = {
  id: string;
  name: string;
  permissions: Permission[];
};

export type SecuritySubject = {
  id: string;
  type: 'user' | 'service' | 'agent';
  roles: Role[];
};

export type SecurityContext = {
  subject: SecuritySubject;
  permissions: Permission[];
  hasPermission: (permission: string) => boolean;
};

export type AuthenticationResult = {
  success: boolean;
  subject?: SecuritySubject;
  token?: string;
  error?: string;
  metadata?: Metadata;
};

export type AuthorizationResult = {
  authorized: boolean;
  reason?: string;
  metadata?: Metadata;
};

/**
 * Additional Result Types
 * These are commonly used result types that were missing
 */
export interface EventDispatchResult {
  success: boolean;
  message?: string;
  timestamp: Date;
  eventId: EventId;
  handlersTriggered: number;
  errors?: string[];
  metadata?: Metadata;
}

export interface SystemHealthResult {
  success: boolean;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'critical';
  timestamp: Date;
  uptime: number;
  components: ComponentHealth[];
  metrics: {
    totalChecks: number;
    healthyChecks: number;
    degradedChecks: number;
    unhealthyChecks: number;
    criticalChecks: number;
    averageResponseTime: number;
    successRate: number;
  };
  details?: GenericData;
  metadata?: Metadata;
}

export interface ComponentHealth {
  component: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'critical';
  details: GenericData;
  lastChecked: Date;
  responseTime: number;
  uptime: number;
  dependencies: ComponentHealth[];
}

export interface ConfigurationUpdateResult {
  success: boolean;
  message?: string;
  timestamp: Date;
  key: string;
  oldValue?: BaseConfig[string];
  newValue?: BaseConfig[string];
  metadata?: Metadata;
}

export interface ConfigurationLoadResult {
  success: boolean;
  configuration?: BaseConfig;
  error?: string;
  timestamp: Date;
  source: 'file' | 'environment' | 'remote' | 'default';
  metadata?: Metadata;
}

export interface LoggingResult {
  success: boolean;
  message?: string;
  timestamp: Date;
  logLevel: string;
  logMessage: string;
  metadata?: Metadata;
}

export interface ConfigurationSchema {
  properties: Record<
    string,
    {
      type: string;
      description?: string;
      required?: boolean;
      default?: BaseConfig[string];
      enum?: BaseConfig[string][];
    }
  >;
  required: string[];
  additionalProperties: boolean;
}

/**
 * Feedback Entry for style learning
 */
export interface FeedbackEntry {
  feedback: 'positive' | 'negative' | 'neutral';
  style: CommunicationStyle;
  timestamp: Date;
  context?: {
    originalLength: number;
    adaptedLength: number;
    styleUsed: CommunicationStyle;
  };
}

// Re-export types from other files
export type { PerformanceMetrics } from './results';

export type { ModuleManifest } from './index';
/**
 * Validation Result Types
 */
export interface ValidationResult {
  success: boolean;
  valid?: boolean; // For compatibility
  errors: ValidationError[];
  warnings: ValidationWarning[];
  timestamp: Date;
  metadata?: Metadata;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  severity: 'error' | 'warning' | 'info';
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
  severity: 'warning' | 'info';
}