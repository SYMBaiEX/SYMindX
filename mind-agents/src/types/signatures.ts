/**
 * Function Signature Types for SYMindX
 *
 * This file contains standardized function signature types that replace void returns
 * with meaningful result types throughout the system.
 */

import {
  OperationResult,
  ExecutionResult,
  ValidationResult,
  InitializationResult,
  CleanupResult,
  EventProcessingResult,
  StateUpdateResult,
  HealthCheckResult,
  AgentId,
  MemoryId,
  Duration,
} from './helpers';
import {
  AgentCreationResult,
  AgentDestructionResult,
  AgentStateTransitionResult,
  MemoryStorageResult,
  MemoryRetrievalResult,
  EmotionUpdateResult,
  ThoughtProcessingResult,
  ExtensionExecutionResult,
  PortalGenerationResult,
  EventDispatchResult,
  CommandExecutionResult,
} from './results';

/**
 * Core System Function Signatures
 */

/**
 * Initialization function signatures
 */
export type InitializationFunction = (
  config?: Record<string, any>
) => Promise<InitializationResult>;
export type SyncInitializationFunction = (
  config?: Record<string, any>
) => InitializationResult;
export type ModuleInitializationFunction = (
  moduleId: string,
  config?: Record<string, any>
) => Promise<InitializationResult>;

/**
 * Cleanup function signatures
 */
export type CleanupFunction = () => Promise<CleanupResult>;
export type SyncCleanupFunction = () => CleanupResult;
export type ModuleCleanupFunction = (
  moduleId: string
) => Promise<CleanupResult>;

/**
 * Event handling function signatures
 */
export type EventHandlerFunction<T = any> = (
  event: T
) => Promise<EventProcessingResult>;
export type SyncEventHandlerFunction<T = any> = (
  event: T
) => EventProcessingResult;
export type EventDispatchFunction<T = any> = (
  eventType: string,
  data: T
) => Promise<EventDispatchResult>;
export type EventProcessingFunction = EventHandlerFunction;

/**
 * State management function signatures
 */
export type StateUpdateFunction<T = any> = (
  state: T
) => Promise<StateUpdateResult>;
export type SyncStateUpdateFunction<T = any> = (state: T) => StateUpdateResult;
export type StateValidationFunction<T = any> = (state: T) => ValidationResult;

/**
 * Configuration function signatures
 */
export type ConfigurationSetFunction = (
  key: string,
  value: any
) => OperationResult;
export type ConfigurationValidationFunction = (
  config: Record<string, any>
) => ValidationResult;
export type ConfigurationReloadFunction = () => Promise<OperationResult>;

/**
 * Health check function signatures
 */
export type HealthCheckFunction = (
  componentId: string
) => Promise<HealthCheckResult>;
export type SystemHealthCheckFunction = () => Promise<HealthCheckResult>;

/**
 * Agent System Function Signatures
 */

/**
 * Agent lifecycle function signatures
 */
export type AgentCreationFunction = (
  config: Record<string, any>
) => Promise<AgentCreationResult>;
export type AgentDestructionFunction = (
  agentId: AgentId
) => Promise<AgentDestructionResult>;
export type AgentStateTransitionFunction = (
  agentId: AgentId,
  newState: string
) => Promise<AgentStateTransitionResult>;

/**
 * Agent action function signatures
 */
export type AgentActionFunction = (
  agentId: AgentId,
  action: string,
  parameters: Record<string, any>
) => Promise<ExecutionResult>;
export type AgentTickFunction = (agentId: AgentId) => Promise<OperationResult>;

/**
 * Memory System Function Signatures
 */

/**
 * Memory storage function signatures
 */
export type MemoryStoreFunction = (
  agentId: AgentId,
  memory: Record<string, any>
) => Promise<MemoryStorageResult>;
export type MemoryRetrieveFunction = (
  agentId: AgentId,
  query: string
) => Promise<MemoryRetrievalResult>;
export type MemoryDeleteFunction = (
  agentId: AgentId,
  memoryId: MemoryId
) => Promise<OperationResult>;

/**
 * Memory management function signatures
 */
export type MemoryConsolidationFunction = (
  agentId: AgentId
) => Promise<OperationResult>;
export type MemoryArchiveFunction = (
  agentId: AgentId,
  criteria: Record<string, any>
) => Promise<OperationResult>;

/**
 * Emotion System Function Signatures
 */

/**
 * Emotion processing function signatures
 */
export type EmotionUpdateFunction = (
  agentId: AgentId,
  emotion: string,
  intensity: number
) => Promise<EmotionUpdateResult>;
export type EmotionProcessingFunction = (
  agentId: AgentId,
  eventType: string,
  context: Record<string, any>
) => Promise<EmotionUpdateResult>;
export type EmotionResetFunction = (
  agentId: AgentId
) => Promise<OperationResult>;

/**
 * Cognition System Function Signatures
 */

/**
 * Thought processing function signatures
 */
export type ThoughtProcessingFunction = (
  agentId: AgentId,
  context: Record<string, any>
) => Promise<ThoughtProcessingResult>;
export type PlanningFunction = (
  agentId: AgentId,
  goal: string
) => Promise<ExecutionResult>;
export type DecisionMakingFunction = (
  agentId: AgentId,
  options: any[]
) => Promise<ExecutionResult>;

/**
 * Extension System Function Signatures
 */

/**
 * Extension lifecycle function signatures
 */
export type ExtensionInitializationFunction = (
  extensionId: string,
  config: Record<string, any>
) => Promise<InitializationResult>;
export type ExtensionCleanupFunction = (
  extensionId: string
) => Promise<CleanupResult>;
export type ExtensionExecutionFunction = (
  extensionId: string,
  action: string,
  parameters: Record<string, any>
) => Promise<ExtensionExecutionResult>;

/**
 * Portal System Function Signatures
 */

/**
 * Portal communication function signatures
 */
export type PortalGenerationFunction = (
  portalId: string,
  messages: any[],
  options?: Record<string, any>
) => Promise<PortalGenerationResult>;
export type PortalInitializationFunction = (
  portalId: string,
  config: Record<string, any>
) => Promise<InitializationResult>;
export type PortalHealthCheckFunction = (
  portalId: string
) => Promise<HealthCheckResult>;

/**
 * Event System Function Signatures
 */

/**
 * Event bus function signatures
 */
export type EventSubscriptionFunction = (
  eventType: string,
  handler: EventHandlerFunction
) => OperationResult;
export type EventUnsubscriptionFunction = (
  eventType: string,
  handler: EventHandlerFunction
) => OperationResult;
export type EventEmissionFunction = (
  eventType: string,
  data: any
) => Promise<EventDispatchResult>;

/**
 * Command System Function Signatures
 */

/**
 * Command execution function signatures
 */
export type CommandExecutionFunction = (
  commandId: string,
  parameters: Record<string, any>
) => Promise<CommandExecutionResult>;
export type CommandValidationFunction = (
  commandId: string,
  parameters: Record<string, any>
) => ValidationResult;
export type CommandRegistrationFunction = (
  commandId: string,
  handler: CommandExecutionFunction
) => OperationResult;

/**
 * Resource Management Function Signatures
 */

/**
 * Resource allocation function signatures
 */
export type ResourceAllocationFunction = (
  resourceType: string,
  requirements: Record<string, any>
) => Promise<ExecutionResult>;
export type ResourceDeallocationFunction = (
  resourceId: string
) => Promise<OperationResult>;
export type ResourceMonitoringFunction = (
  resourceId?: string
) => Promise<ExecutionResult>;

/**
 * Security System Function Signatures
 */

/**
 * Authentication function signatures
 */
export type AuthenticationFunction = (
  credentials: Record<string, any>
) => Promise<ExecutionResult>;
export type AuthorizationFunction = (
  subject: string,
  resource: string,
  action: string
) => Promise<ExecutionResult>;
export type TokenValidationFunction = (token: string) => ValidationResult;

/**
 * Configuration System Function Signatures
 */

/**
 * Configuration management function signatures
 */
export type ConfigurationLoadFunction = (
  source: string
) => Promise<ExecutionResult>;
export type ConfigurationSaveFunction = (
  config: Record<string, any>,
  destination: string
) => Promise<OperationResult>;
export type ConfigurationMergeFunction = (
  configs: Record<string, any>[]
) => ExecutionResult;

/**
 * Logging System Function Signatures
 */

/**
 * Logging function signatures
 */
export type LoggingFunction = (
  level: string,
  message: string,
  metadata?: Record<string, any>
) => OperationResult;
export type LogFormattingFunction = (entry: Record<string, any>) => string;
export type LogFilteringFunction = (entry: Record<string, any>) => boolean;

/**
 * Monitoring System Function Signatures
 */

/**
 * Metrics collection function signatures
 */
export type MetricsCollectionFunction = (
  componentId: string
) => Promise<ExecutionResult>;
export type MetricsAggregationFunction = (metrics: any[]) => ExecutionResult;
export type AlertingFunction = (
  condition: Record<string, any>
) => Promise<OperationResult>;

/**
 * Backup and Recovery Function Signatures
 */

/**
 * Backup function signatures
 */
export type BackupFunction = (
  type: string,
  options: Record<string, any>
) => Promise<ExecutionResult>;
export type RestoreFunction = (
  backupId: string,
  options: Record<string, any>
) => Promise<ExecutionResult>;
export type BackupVerificationFunction = (
  backupId: string
) => Promise<ValidationResult>;

/**
 * Migration Function Signatures
 */

/**
 * Migration function signatures
 */
export type MigrationFunction = (
  fromVersion: string,
  toVersion: string
) => Promise<ExecutionResult>;
export type MigrationValidationFunction = (
  migrationId: string
) => Promise<ValidationResult>;
export type MigrationRollbackFunction = (
  migrationId: string
) => Promise<ExecutionResult>;

/**
 * Testing Function Signatures
 */

/**
 * Testing function signatures
 */
export type TestFunction = (
  testId: string,
  parameters: Record<string, any>
) => Promise<ExecutionResult>;
export type TestValidationFunction = (
  result: ExecutionResult
) => ValidationResult;
export type TestSetupFunction = (
  testId: string
) => Promise<InitializationResult>;
export type TestTeardownFunction = (testId: string) => Promise<CleanupResult>;

/**
 * Plugin System Function Signatures
 */

/**
 * Plugin lifecycle function signatures
 */
export type PluginLoadFunction = (
  pluginId: string,
  config: Record<string, any>
) => Promise<InitializationResult>;
export type PluginUnloadFunction = (pluginId: string) => Promise<CleanupResult>;
export type PluginValidationFunction = (
  pluginId: string
) => Promise<ValidationResult>;

/**
 * Utility Function Signatures
 */

/**
 * Serialization function signatures
 */
export type SerializationFunction<T> = (data: T) => ExecutionResult<string>;
export type DeserializationFunction<T> = (data: string) => ExecutionResult<T>;

/**
 * Validation function signatures
 */
export type GenericValidationFunction<T> = (data: T) => ValidationResult;
export type SchemaValidationFunction = (
  data: any,
  schema: Record<string, any>
) => ValidationResult;

/**
 * Transformation function signatures
 */
export type TransformationFunction<T, R> = (input: T) => ExecutionResult<R>;
export type BatchTransformationFunction<T, R> = (
  inputs: T[]
) => ExecutionResult<R[]>;

/**
 * Cache Function Signatures
 */

/**
 * Cache operation function signatures
 */
export type CacheGetFunction<T> = (key: string) => T | undefined;
export type CacheSetFunction<T> = (
  key: string,
  value: T,
  ttl?: Duration
) => OperationResult;
export type CacheDeleteFunction = (key: string) => OperationResult;
export type CacheClearFunction = () => OperationResult;

/**
 * Queue Function Signatures
 */

/**
 * Queue operation function signatures
 */
export type QueueEnqueueFunction<T> = (item: T) => OperationResult;
export type QueueDequeueFunction<T> = () => ExecutionResult<T>;
export type QueuePeekFunction<T> = () => T | undefined;
export type QueueSizeFunction = () => number;

/**
 * Worker Function Signatures
 */

/**
 * Worker management function signatures
 */
export type WorkerStartFunction = (
  workerId: string,
  config: Record<string, any>
) => Promise<InitializationResult>;
export type WorkerStopFunction = (workerId: string) => Promise<CleanupResult>;
export type WorkerTaskFunction = (
  workerId: string,
  task: Record<string, any>
) => Promise<ExecutionResult>;

/**
 * Scheduler Function Signatures
 */

/**
 * Scheduler function signatures
 */
export type ScheduleFunction = (
  taskId: string,
  schedule: string,
  handler: () => Promise<ExecutionResult>
) => OperationResult;
export type UnscheduleFunction = (taskId: string) => OperationResult;
export type SchedulerTickFunction = () => Promise<OperationResult>;

/**
 * Network Function Signatures
 */

/**
 * Network operation function signatures
 */
export type NetworkRequestFunction = (
  url: string,
  options: Record<string, any>
) => Promise<ExecutionResult>;
export type NetworkResponseFunction = (response: any) => ExecutionResult;
export type NetworkErrorHandlerFunction = (error: Error) => OperationResult;

/**
 * Database Function Signatures
 */

/**
 * Database operation function signatures
 */
export type DatabaseConnectFunction = (
  connectionString: string
) => Promise<InitializationResult>;
export type DatabaseDisconnectFunction = () => Promise<CleanupResult>;
export type DatabaseQueryFunction = (
  query: string,
  parameters?: any[]
) => Promise<ExecutionResult>;
export type DatabaseTransactionFunction = (
  operations: (() => Promise<ExecutionResult>)[]
) => Promise<ExecutionResult>;

/**
 * File System Function Signatures
 */

/**
 * File system operation function signatures
 */
export type FileReadFunction = (
  path: string
) => Promise<ExecutionResult<string>>;
export type FileWriteFunction = (
  path: string,
  content: string
) => Promise<OperationResult>;
export type FileDeleteFunction = (path: string) => Promise<OperationResult>;
export type DirectoryCreateFunction = (
  path: string
) => Promise<OperationResult>;

/**
 * Composite Function Signatures
 */

/**
 * Complex operation function signatures that combine multiple operations
 */
export type BatchOperationFunction<T> = (
  operations: (() => Promise<ExecutionResult<T>>)[]
) => Promise<ExecutionResult<T[]>>;
export type PipelineFunction<T, R> = (
  input: T,
  transformations: TransformationFunction<any, any>[]
) => Promise<ExecutionResult<R>>;
export type WorkflowFunction = (
  workflowId: string,
  steps: Record<string, any>[]
) => Promise<ExecutionResult>;

/**
 * Error Handling Function Signatures
 */

/**
 * Error handling function signatures
 */
export type ErrorHandlerFunction = (
  error: Error,
  context?: Record<string, any>
) => OperationResult;
export type ErrorRecoveryFunction = (
  error: Error,
  context?: Record<string, any>
) => Promise<OperationResult>;
export type ErrorReportingFunction = (
  error: Error,
  context?: Record<string, any>
) => Promise<OperationResult>;

/**
 * Lifecycle Hook Function Signatures
 */

/**
 * Lifecycle hook function signatures
 */
export type BeforeHookFunction = (
  context: Record<string, any>
) => Promise<OperationResult>;
export type AfterHookFunction = (
  context: Record<string, any>,
  result: ExecutionResult
) => Promise<OperationResult>;
export type ErrorHookFunction = (
  context: Record<string, any>,
  error: Error
) => Promise<OperationResult>;

/**
 * Middleware Function Signatures
 */

/**
 * Middleware function signatures
 */
export type MiddlewareFunction = (
  context: Record<string, any>,
  next: () => Promise<ExecutionResult>
) => Promise<ExecutionResult>;

export type MiddlewareChainFunction = (
  context: Record<string, any>,
  middlewares: MiddlewareFunction[]
) => Promise<ExecutionResult>;

/**
 * Factory Function Signatures
 */

/**
 * Factory function signatures with proper result types
 */
export type FactoryFunction<T> = (
  config: Record<string, any>
) => ExecutionResult<T>;
export type AsyncFactoryFunction<T> = (
  config: Record<string, any>
) => Promise<ExecutionResult<T>>;
export type FactoryValidationFunction = (
  config: Record<string, any>
) => ValidationResult;

/**
 * Registry Function Signatures
 */

/**
 * Registry operation function signatures
 */
export type RegistryRegisterFunction<T> = (
  key: string,
  value: T
) => OperationResult;
export type RegistryUnregisterFunction = (key: string) => OperationResult;
export type RegistryGetFunction<T> = (key: string) => T | undefined;
export type RegistryListFunction = () => string[];
export type RegistryHasFunction = (key: string) => boolean;

/**
 * Service Function Signatures
 */

/**
 * Service lifecycle function signatures
 */
export type ServiceStartFunction = (
  serviceId: string,
  config: Record<string, any>
) => Promise<InitializationResult>;
export type ServiceStopFunction = (serviceId: string) => Promise<CleanupResult>;
export type ServiceRestartFunction = (
  serviceId: string
) => Promise<ExecutionResult>;
export type ServiceHealthCheckFunction = (
  serviceId: string
) => Promise<HealthCheckResult>;
export type ServiceConfigurationFunction = (
  serviceId: string,
  config: Record<string, any>
) => Promise<OperationResult>;
