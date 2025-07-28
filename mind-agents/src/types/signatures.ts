/**
 * Function Signature Types for SYMindX
 *
 * This file contains standardized function signature types that replace void returns
 * with meaningful result types throughout the system.
 */

import {
  BaseConfig,
  ActionParameters,
  Metadata,
  Context,
  GenericData,
} from './common';
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
  config?: BaseConfig
) => Promise<InitializationResult>;
export type SyncInitializationFunction = (
  config?: BaseConfig
) => InitializationResult;
export type ModuleInitializationFunction = (
  moduleId: string,
  config?: BaseConfig
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
export type EventHandlerFunction<T = GenericData> = (
  event: T
) => Promise<EventProcessingResult>;
export type SyncEventHandlerFunction<T = GenericData> = (
  event: T
) => EventProcessingResult;
export type EventDispatchFunction<T = GenericData> = (
  eventType: string,
  data: T
) => Promise<EventDispatchResult>;
export type EventProcessingFunction = EventHandlerFunction;

/**
 * State management function signatures
 */
export type StateUpdateFunction<T = GenericData> = (
  state: T
) => Promise<StateUpdateResult>;
export type SyncStateUpdateFunction<T = GenericData> = (
  state: T
) => StateUpdateResult;
export type StateValidationFunction<T = GenericData> = (
  state: T
) => ValidationResult;

/**
 * Configuration function signatures
 */
export type ConfigurationSetFunction = (
  key: string,
  value: BaseConfig[string]
) => OperationResult;
export type ConfigurationValidationFunction = (
  config: BaseConfig
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
  config: BaseConfig
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
  parameters: ActionParameters
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
  memory: GenericData
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
  criteria: BaseConfig
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
  context: Context
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
  context: Context
) => Promise<ThoughtProcessingResult>;
export type PlanningFunction = (
  agentId: AgentId,
  goal: string
) => Promise<ExecutionResult>;
export type DecisionMakingFunction = (
  agentId: AgentId,
  options: GenericData[]
) => Promise<ExecutionResult>;

/**
 * Extension System Function Signatures
 */

/**
 * Extension lifecycle function signatures
 */
export type ExtensionInitializationFunction = (
  extensionId: string,
  config: BaseConfig
) => Promise<InitializationResult>;
export type ExtensionCleanupFunction = (
  extensionId: string
) => Promise<CleanupResult>;
export type ExtensionExecutionFunction = (
  extensionId: string,
  action: string,
  parameters: ActionParameters
) => Promise<ExtensionExecutionResult>;

/**
 * Portal System Function Signatures
 */

/**
 * Portal communication function signatures
 */
export type PortalGenerationFunction = (
  portalId: string,
  messages: GenericData[],
  options?: BaseConfig
) => Promise<PortalGenerationResult>;
export type PortalInitializationFunction = (
  portalId: string,
  config: BaseConfig
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
  data: GenericData
) => Promise<EventDispatchResult>;

/**
 * Command System Function Signatures
 */

/**
 * Command execution function signatures
 */
export type CommandExecutionFunction = (
  commandId: string,
  parameters: ActionParameters
) => Promise<CommandExecutionResult>;
export type CommandValidationFunction = (
  commandId: string,
  parameters: ActionParameters
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
  requirements: BaseConfig
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
  credentials: BaseConfig
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
  config: BaseConfig,
  destination: string
) => Promise<OperationResult>;
export type ConfigurationMergeFunction = (
  configs: BaseConfig[]
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
  metadata?: Metadata
) => OperationResult;
export type LogFormattingFunction = (entry: Metadata) => string;
export type LogFilteringFunction = (entry: Metadata) => boolean;

/**
 * Monitoring System Function Signatures
 */

/**
 * Metrics collection function signatures
 */
export type MetricsCollectionFunction = (
  componentId: string
) => Promise<ExecutionResult>;
export type MetricsAggregationFunction = (
  metrics: Metadata[]
) => ExecutionResult;
export type AlertingFunction = (
  condition: BaseConfig
) => Promise<OperationResult>;

/**
 * Backup and Recovery Function Signatures
 */

/**
 * Backup function signatures
 */
export type BackupFunction = (
  type: string,
  options: BaseConfig
) => Promise<ExecutionResult>;
export type RestoreFunction = (
  backupId: string,
  options: BaseConfig
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
  parameters: ActionParameters
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
  config: BaseConfig
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
  data: GenericData,
  schema: BaseConfig
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
  config: BaseConfig
) => Promise<InitializationResult>;
export type WorkerStopFunction = (workerId: string) => Promise<CleanupResult>;
export type WorkerTaskFunction = (
  workerId: string,
  task: ActionParameters
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
  options: BaseConfig
) => Promise<ExecutionResult>;
export type NetworkResponseFunction = (
  response: GenericData
) => ExecutionResult;
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
  parameters?: Array<BaseConfig[string]>
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
  transformations: TransformationFunction<unknown, unknown>[]
) => Promise<ExecutionResult<R>>;
export type WorkflowFunction = (
  workflowId: string,
  steps: ActionParameters[]
) => Promise<ExecutionResult>;

/**
 * Error Handling Function Signatures
 */

/**
 * Error handling function signatures
 */
export type ErrorHandlerFunction = (
  error: Error,
  context?: Context
) => OperationResult;
export type ErrorRecoveryFunction = (
  error: Error,
  context?: Context
) => Promise<OperationResult>;
export type ErrorReportingFunction = (
  error: Error,
  context?: Context
) => Promise<OperationResult>;

/**
 * Lifecycle Hook Function Signatures
 */

/**
 * Lifecycle hook function signatures
 */
export type BeforeHookFunction = (context: Context) => Promise<OperationResult>;
export type AfterHookFunction = (
  context: Context,
  result: ExecutionResult
) => Promise<OperationResult>;
export type ErrorHookFunction = (
  context: Context,
  error: Error
) => Promise<OperationResult>;

/**
 * Middleware Function Signatures
 */

/**
 * Middleware function signatures
 */
export type MiddlewareFunction = (
  context: Context,
  next: () => Promise<ExecutionResult>
) => Promise<ExecutionResult>;

export type MiddlewareChainFunction = (
  context: Context,
  middlewares: MiddlewareFunction[]
) => Promise<ExecutionResult>;

/**
 * Factory Function Signatures
 */

/**
 * Factory function signatures with proper result types
 */
export type FactoryFunction<T> = (config: BaseConfig) => ExecutionResult<T>;
export type AsyncFactoryFunction<T> = (
  config: BaseConfig
) => Promise<ExecutionResult<T>>;
export type FactoryValidationFunction = (
  config: BaseConfig
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
  config: BaseConfig
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
  config: BaseConfig
) => Promise<OperationResult>;
