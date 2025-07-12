/**
 * Helper Types for SYMindX
 *
 * This file contains utility types and type helpers that replace void/undefined usage
 * and provide better type safety throughout the system.
 */

/**
 * Operation Result Types
 * These replace void returns with meaningful result types
 */
export type VoidResult = {
  success: true;
  timestamp: Date;
  metadata?: Record<string, any>;
};

export type VoidError = {
  success: false;
  error: string;
  timestamp: Date;
  metadata?: Record<string, any>;
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
    [key: string]: any;
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
    [key: string]: any;
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
    stateChanges?: Record<string, any>;
    [key: string]: any;
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
    oldValue: any;
    newValue: any;
  }[];
  metadata?: {
    updateType: 'single' | 'batch' | 'cascade';
    conflictsResolved?: number;
    [key: string]: any;
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
    [key: string]: any;
  };
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: any;
  severity: 'error' | 'critical';
  suggestion?: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
  value?: any;
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
    oldValue: any;
    newValue: any;
  }[];
  metadata?: {
    source: 'file' | 'environment' | 'runtime' | 'default';
    validation: ValidationResult;
    [key: string]: any;
  };
}

/**
 * Execution Result Types
 * For command and action execution
 */
export interface ExecutionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
  duration: number;
  metadata?: {
    commandId: string;
    executorId: string;
    retryCount?: number;
    [key: string]: any;
  };
}

/**
 * Async Operation Result Types
 * For long-running operations
 */
export interface AsyncOperationResult<T = any> {
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
    [key: string]: any;
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
    [key: string]: any;
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
    config: Record<string, any>;
    dependencies?: string[];
    [key: string]: any;
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
    [key: string]: any;
  };
}

/**
 * Health Check Result Types
 * For system health monitoring
 */
export interface HealthCheckResult {
  healthy: boolean;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  timestamp: Date;
  componentId: string;
  details: {
    message?: string;
    uptime?: number;
    responseTime?: number;
    memory?: number;
    cpu?: number;
    errors?: string[];
    warnings?: string[];
  };
  metadata?: {
    checkType: 'basic' | 'detailed' | 'comprehensive';
    dependencies?: HealthCheckResult[];
    [key: string]: any;
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
    [key: string]: any;
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
// export type Brand<T, K> = T & { __brand: K };

/**
 * Simplified ID types (previously branded)
 * These are now plain strings for easier assignment and compatibility
 */
export type AgentId = string;
export type MemoryId = string;
export type EventId = string;
export type ExtensionId = string;
export type PortalId = string;
export type ModuleId = string;
export type SessionId = string;
export type CorrelationId = string;

/**
 * Simplified timestamp types (previously branded)
 */
export type Timestamp = Date;
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
export type AsyncFunction<T = any, R = any> = (args: T) => Promise<R>;

export type SyncFunction<T = any, R = any> = (args: T) => R;

export type EventHandler<T = any> = (event: T) => OperationResult;

export type AsyncEventHandler<T = any> = (event: T) => Promise<OperationResult>;

export type Factory<T, C = any> = (config: C) => T;

export type AsyncFactory<T, C = any> = (config: C) => Promise<T>;

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
  metadata?: Record<string, any>;
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

export type Subject<T> = {
  attach: (observer: Observer<T>) => OperationResult;
  detach: (observer: Observer<T>) => OperationResult;
  notify: (data: T) => OperationResult;
};

/**
 * Command pattern types
 */
export type Command<T = any> = {
  execute: (context: T) => OperationResult;
  undo?: (context: T) => OperationResult;
  redo?: (context: T) => OperationResult;
};

export type CommandInvoker<T = any> = {
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
export type ErrorHandler<T = any> = (
  error: Error,
  context?: T
) => OperationResult;

export type AsyncErrorHandler<T = any> = (
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
  metadata?: Record<string, any>;
  correlationId?: CorrelationId;
};

export type Logger = {
  log: (entry: LogEntry) => OperationResult;
  debug: (message: string, metadata?: Record<string, any>) => OperationResult;
  info: (message: string, metadata?: Record<string, any>) => OperationResult;
  warn: (message: string, metadata?: Record<string, any>) => OperationResult;
  error: (
    message: string,
    error?: Error,
    metadata?: Record<string, any>
  ) => OperationResult;
  fatal: (
    message: string,
    error?: Error,
    metadata?: Record<string, any>
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
  metadata?: Record<string, any>;
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
  metadata?: Record<string, any>;
};

export type ResourceManager = {
  allocate: (
    type: string,
    requirements?: Record<string, any>
  ) => Promise<Resource>;
  deallocate: (resourceId: string) => Promise<OperationResult>;
  query: (type: string, filters?: Record<string, any>) => Promise<Resource[]>;
  getStatus: (resourceId: string) => Promise<Resource>;
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
  metadata?: Record<string, any>;
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

export type Subject = {
  id: string;
  type: 'user' | 'service' | 'agent';
  roles: Role[];
};

export type SecurityContext = {
  subject: Subject;
  permissions: Permission[];
  hasPermission: (permission: string) => boolean;
};

export type AuthenticationResult = {
  success: boolean;
  subject?: Subject;
  token?: string;
  error?: string;
  metadata?: Record<string, any>;
};

export type AuthorizationResult = {
  authorized: boolean;
  reason?: string;
  metadata?: Record<string, any>;
};
