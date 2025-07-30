/**
 * Complete Type Exports for SYMindX
 *
 * This file provides a clean export interface for all enhanced types
 * to avoid conflicts and ensure proper type resolution.
 */

// Re-export all helper types with proper names
export type {
  // Operation Result Types
  OperationResult,
  VoidResult,
  VoidError,
  InitializationResult,
  CleanupResult,
  EventProcessingResult,
  StateUpdateResult,
  ExecutionResult,
  AsyncOperationResult,
  ResourceResult,
  FactoryResult,
  RegistryResult,
  HealthCheckResult,
  LifecycleEventResult,

  // Validation Types
  ValidationResult as EnhancedValidationResult,
  ValidationError as EnhancedValidationError,
  ValidationWarning as EnhancedValidationWarning,

  // Configuration Types
  ConfigurationResult,

  // Branded Types
  Brand,
  AgentId,
  MemoryId,
  EventId,
  ExtensionId,
  PortalId,
  ModuleId,
  SessionId,
  CorrelationId,
  Timestamp,
  Duration,
  Milliseconds,
  Percentage,
  Confidence,
  Priority,
  Version,

  // Utility Types
  DeepReadonly,
  DeepPartial,
  RequiredFields,
  OptionalFields,
  Nullable,
  Optional,
  NonEmptyArray,
  StringKeys,
  NumberKeys,
  SymbolKeys,

  // Function Types
  AsyncFunction,
  SyncFunction,
  EventHandler,
  AsyncEventHandler,
  Factory,
  AsyncFactory,
  Validator,
  AsyncValidator,
  Transformer,
  AsyncTransformer,
  Predicate,
  AsyncPredicate,
  Comparator,
  Equals,

  // Pattern Types
  Builder,
  FluentBuilder,
  State,
  Transition,
  StateMachine,
  Observer,
  Command,
  CommandInvoker,
  Strategy,
  StrategyContext,

  // Error Handling Types
  ErrorHandler,
  AsyncErrorHandler,
  RetryPolicy,
  CircuitBreakerConfig,

  // Cache Types
  CacheKey,
  Cache,

  // Serialization Types
  Serializer,
  JSONSerializable,

  // Logging Types
  LogLevel,
  LogEntry,
  Logger,

  // Metrics Types
  Metric,
  Counter,
  Gauge,
  Timer,

  // Configuration Types
  ConfigValue,
  ConfigProvider,

  // Event System Types
  EventBus,

  // Resource Management Types
  Resource,
  ResourceManager,

  // Dependency Injection Types
  Container,

  // Plugin System Types
  Plugin,
  PluginManager,

  // Security Types
  Permission,
  Role,
  SecurityContext,
  AuthenticationResult,
  AuthorizationResult,
} from './helpers';

// Re-export all result types with proper names
export type {
  AgentCreationResult,
  AgentDestructionResult,
  AgentStateTransitionResult,
  MemoryStorageResult,
  MemoryRetrievalResult,
  MemoryConsolidationResult,
  EmotionUpdateResult,
  EmotionProcessingResult,
  ThoughtProcessingResult,
  PlanningResult,
  DecisionMakingResult,
  ExtensionLoadResult,
  ExtensionExecutionResult,
  PortalConnectionResult,
  PortalGenerationResult,
  EventDispatchResult,
  EventSubscriptionResult,
  CommandExecutionResult,
  CommandValidationResult,
  ResourceAllocationResult,
  ResourceMonitoringResult,
  AuthenticationResult as AuthResult,
  AuthorizationResult as AuthZResult,
  ConfigurationLoadResult,
  ConfigurationUpdateResult,
  SystemHealthResult,
  ComponentHealthResult,
  ModuleLifecycleResult,
  SystemLifecycleResult,
  BatchOperationResult,
  MigrationResult,
  BackupResult,
  RestoreResult,
  AuditResult,
  LoggingResult,
} from './results';

// Re-export ModuleManifest from index
export type { ModuleManifest } from './index';

// Re-export all function signature types
export type {
  // Core System Functions
  InitializationFunction,
  SyncInitializationFunction,
  ModuleInitializationFunction,
  CleanupFunction,
  SyncCleanupFunction,
  ModuleCleanupFunction,
  EventHandlerFunction,
  SyncEventHandlerFunction,
  EventDispatchFunction,
  StateUpdateFunction,
  SyncStateUpdateFunction,
  StateValidationFunction,
  ConfigurationSetFunction,
  ConfigurationValidationFunction,
  ConfigurationReloadFunction,
  HealthCheckFunction,
  SystemHealthCheckFunction,

  // Agent System Functions
  AgentCreationFunction,
  AgentDestructionFunction,
  AgentStateTransitionFunction,
  AgentActionFunction,
  AgentTickFunction,

  // Memory System Functions
  MemoryStoreFunction,
  MemoryRetrieveFunction,
  MemoryDeleteFunction,
  MemoryConsolidationFunction,
  MemoryArchiveFunction,

  // Emotion System Functions
  EmotionUpdateFunction,
  EmotionProcessingFunction,
  EmotionResetFunction,

  // Cognition System Functions
  ThoughtProcessingFunction,
  PlanningFunction,
  DecisionMakingFunction,

  // Extension System Functions
  ExtensionInitializationFunction,
  ExtensionCleanupFunction,
  ExtensionExecutionFunction,

  // Portal System Functions
  PortalGenerationFunction,
  PortalInitializationFunction,
  PortalHealthCheckFunction,

  // Event System Functions
  EventSubscriptionFunction,
  EventUnsubscriptionFunction,
  EventEmissionFunction,

  // Command System Functions
  CommandExecutionFunction,
  CommandValidationFunction,
  CommandRegistrationFunction,

  // Resource Management Functions
  ResourceAllocationFunction,
  ResourceDeallocationFunction,
  ResourceMonitoringFunction,

  // Security System Functions
  AuthenticationFunction,
  AuthorizationFunction,
  TokenValidationFunction,

  // Configuration System Functions
  ConfigurationLoadFunction,
  ConfigurationSaveFunction,
  ConfigurationMergeFunction,

  // Logging System Functions
  LoggingFunction,
  LogFormattingFunction,
  LogFilteringFunction,

  // Monitoring System Functions
  MetricsCollectionFunction,
  MetricsAggregationFunction,
  AlertingFunction,

  // Backup and Recovery Functions
  BackupFunction,
  RestoreFunction,
  BackupVerificationFunction,

  // Migration Functions
  MigrationFunction,
  MigrationValidationFunction,
  MigrationRollbackFunction,

  // Testing Functions
  TestFunction,
  TestValidationFunction,
  TestSetupFunction,
  TestTeardownFunction,

  // Plugin System Functions
  PluginLoadFunction,
  PluginUnloadFunction,
  PluginValidationFunction,

  // Utility Functions
  SerializationFunction,
  DeserializationFunction,
  GenericValidationFunction,
  SchemaValidationFunction,
  TransformationFunction,
  BatchTransformationFunction,

  // Cache Functions
  CacheGetFunction,
  CacheSetFunction,
  CacheDeleteFunction,
  CacheClearFunction,

  // Queue Functions
  QueueEnqueueFunction,
  QueueDequeueFunction,
  QueuePeekFunction,
  QueueSizeFunction,

  // Worker Functions
  WorkerStartFunction,
  WorkerStopFunction,
  WorkerTaskFunction,

  // Scheduler Functions
  ScheduleFunction,
  UnscheduleFunction,
  SchedulerTickFunction,

  // Network Functions
  NetworkRequestFunction,
  NetworkResponseFunction,
  NetworkErrorHandlerFunction,

  // Database Functions
  DatabaseConnectFunction,
  DatabaseDisconnectFunction,
  DatabaseQueryFunction,
  DatabaseTransactionFunction,

  // File System Functions
  FileReadFunction,
  FileWriteFunction,
  FileDeleteFunction,
  DirectoryCreateFunction,

  // Composite Functions
  BatchOperationFunction,
  PipelineFunction,
  WorkflowFunction,

  // Error Handling Functions
  ErrorHandlerFunction,
  ErrorRecoveryFunction,
  ErrorReportingFunction,

  // Lifecycle Hook Functions
  BeforeHookFunction,
  AfterHookFunction,
  ErrorHookFunction,

  // Middleware Functions
  MiddlewareFunction,
  MiddlewareChainFunction,

  // Factory Functions
  FactoryFunction,
  AsyncFactoryFunction,
  FactoryValidationFunction,

  // Registry Functions
  RegistryRegisterFunction,
  RegistryUnregisterFunction,
  RegistryGetFunction,
  RegistryListFunction,
  RegistryHasFunction,

  // Service Functions
  ServiceStartFunction,
  ServiceStopFunction,
  ServiceRestartFunction,
  ServiceHealthCheckFunction,
  ServiceConfigurationFunction,
} from './signatures';

// Re-export common types
export type {
  // Configuration Types
  BaseConfig,
  ConfigValue as CommonConfigValue,
  ActionParameters,
  ParameterValue,
  Metadata,
  MetadataValue,
  Context,
  ContextValue,
  GenericData,
  DataValue,
  EventData,
  ToolInput,
  ToolOutput,
  ApiResponse,
  SkillParameters,
  SkillParameterValue,
  ExtensionConfig,
  ExtensionMetadata,
  PortalSettings,
  ModelSettings,
  MemoryMetadata,
  EmotionContext,
  SocialContext,
  EnvironmentalContext,
  CognitionContext,
  TimeConstraints,

  // Enhanced Types
  ServiceResult,
  ServiceError,
  ConfigurationSchema,
  RuntimeContext,
  SystemEvent,
  ServiceConfiguration,
  Message,
  Task,
  WorkflowStep,
  Workflow,

  // Game State Types
  GameState,
  Position,
  PlayerStats,
  InventoryItem,
  Player,
  GameObject,
  Equipment,
  QuestState,

  // Social Media Types
  SlackMessage,
  SlackBlock,
  SlackText,
  SlackElement,
  SlackAttachment,
  SlackField,
  SlackAction,
  TwitterUser,
  TwitterTweet,
  TwitterMetrics,
  TwitterReference,
  TwitterAttachment,

  // MCP Types
  McpToolDefinition,
  JsonSchema,
  JsonSchemaProperty,
  McpResource,
  McpPrompt,
  McpPromptArgument,
} from './common';

// Re-export enum types
export {
  // Agent Status Enums
  AgentStatus,
  ActionStatus,
  ActionResultType,
  ActionCategory,
  EventType,
  EventSource,
  MemoryType,
  MemoryDuration,
  MemoryProviderType,
  EmotionModuleType,
  CognitionModuleType,
  ExtensionType,
  ExtensionStatus,
  PlanStatus,
  PlanStepStatus,
  EnvironmentType,

  // Portal Enums
  PortalType,
  PortalStatus,
  ModelType,
  ConfigurationLevel,
} from './enums';

// Re-export additional enums as types
export type { RuntimeStatus, ModuleStatus, FactoryStatus } from './enums';

// Re-export Result types separately since they may be type-only
export type { BaseResult, ErrorResult, SuccessResult, Result } from './enums';

// Re-export specific types from other modules
export type {
  // Agent Types
  Agent,
  AgentConfig,
  AgentState,
  AgentAction,
  AgentEvent,
  AgentRuntime,
  EmotionState,
  EmotionRecord,
  EmotionConfig,
  MemoryRecord,
  MemoryProvider,
  MemoryConfig,
  CognitionModule,
  ThoughtContext,
  ThoughtResult,
  Plan,
  PlanStep,
  Decision,
  Extension,
  ExtensionAction,
  ExtensionEventHandler,
  ActionResult,
  EnvironmentState,
  ModuleRegistry,
  RuntimeConfig,
  ToolsConfig,
} from './agent';

// Re-export emotion types
export type {
  EmotionModule,
  EmotionDefinition,
  EmotionModuleMetadata,
  EmotionModuleFactory,
  PersonalityTraits,
  EmotionBlend,
  AdvancedEmotionConfig,
} from './emotion';

// Re-export memory types
export type {
  MemoryTierType,
  MemoryType as MemoryTierTypeAlias,
  ConsolidationRule,
  MemoryTier,
  MemoryContext,
  MemoryPermission,
  SharedMemoryConfig,
  ArchivalStrategy,
  MemoryProviderMetadata,
  MemoryProviderFactory,
  MemoryProviderConfig,
  SearchQueryType,
  SearchQuery,
  SearchResult,
  BoostFactors,
  TimeRange,
  MemoryRelationshipType,
  MemoryRelationship,
  MemoryManagementPolicy,
  MemoryPolicyConfig,
  PolicyCondition,
  PolicyAction,
} from './memory';

// Re-export cognition types
export type {
  CognitionModule as CognitionModuleBase,
  CognitionModuleMetadata,
  CognitionModuleFactory,
  ReasoningParadigm,
  Rule,
  Condition,
  RuleAction,
  FactBase,
  BayesianNetwork,
  BayesianNode,
  BayesianEdge,
  LearningCapability,
  Knowledge,
  Fact,
  Pattern,
  Model,
  ReasoningPerformance,
  HybridReasoningConfig,
  PDDLDomain,
  PDDLPredicate,
  PDDLParameter,
  PDDLAction,
  PDDLExpression,
  PDDLProblem,
  PDDLObject,
  PDDLCondition,
  PDDLEffect,
  ContextAnalysis,
  ReasoningState,
} from './cognition';

// Re-export portal types
export type {
  Portal,
  PortalConfig,
  PortalUsage,
  TextGenerationOptions,
  FinishReason,
  TextGenerationResult,
  MessageRole,
  MessageType,
  ChatMessage,
  ToolCall,
  MessageAttachment,
  AISDKToolSet,
  ChatGenerationOptions,
  ChatGenerationResult,
  FunctionDefinition,
  PortalRegistry,
  PortalModuleConfig,
  EmbeddingOptions,
  EmbeddingResult,
  ImageGenerationOptions,
  ImageGenerationResult,
  ToolEvaluationOptions,
  ToolEvaluationResult,
  VectorStoreConfig,
  PortalCapability,
} from './portal';

// Re-export extension types
export type { ExtensionContext, Extension as ExtensionBase } from './extension';

// Performance metrics
export type { PerformanceMetrics } from './index';
