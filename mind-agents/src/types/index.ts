/**
 * Centralized Type System for SYMindX
 *
 * This file exports all types used throughout the SYMindX system,
 * providing a single point of access for all type definitions.
 */

// Global type definitions
/// <reference path="./globals.d.ts" />

// Import types needed for local interface definitions
import type { CognitionModule } from './cognition';
import type { Metadata } from './common';
import type { PortalContext, ToolResult, MCPToolSet } from './context';
import type { EmotionModule } from './emotion';
import type { Extension } from './extensions';
import type {
  OperationResult,
  EventProcessingResult,
  EventDispatchResult,
  HealthCheckResult,
  SystemHealthResult,
  ComponentHealth,
  Duration,
  ConfigurationUpdateResult,
  ConfigurationLoadResult,
  ConfigurationSchema,
  LoggingResult,
  CleanupResult,
  ValidationResult,
} from './helpers';

// Import types from common for use in interface definitions

// Import module types for factory interfaces
import type { MemoryProvider } from './memory';
import type { Portal } from './portal';

// Core types - selective exports to avoid conflicts
export type {
  BaseConfig,
  ActionParameters,
  Metadata,
  Context,
  GenericData,
  SkillParameters,
  ExtensionConfig,
  ConfigValue,
  ConfigurationSchema,
  Message,
} from './common';
export { LogLevel, Priority, Status } from './enums';
export type {
  OperationResult,
  ExecutionResult,
  InitializationResult,
  CleanupResult,
  EventProcessingResult,
  HealthCheckResult,
  LifecycleEventResult,
  Duration,
  Timestamp,
  AgentId,
  MemoryId,
  EventId,
  ModuleId,
  CorrelationId,
  ValidationResult,
  ValidationError,
  ValidationWarning,
} from './helpers';
export type {
  AgentCreationResult,
  AgentDestructionResult,
  AgentStateTransitionResult,
  MemoryStorageResult,
  MemoryRetrievalResult,
  ThoughtProcessingResult,
  SystemHealthResult,
  ComponentHealth,
  EventDispatchResult,
  PerformanceMetrics,
  ConfigurationLoadResult,
  ConfigurationUpdateResult,
  LoggingResult,
} from './results';
// Define ModuleManifest inline to avoid import issues
export interface ModuleManifest {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  license?: string;
  homepage?: string;
  repository?: string;
  main: string;
  type: 'portal' | 'memory' | 'utility' | 'extension' | 'skill';
  dependencies?: string[];
  devDependencies?: string[];
  peerDependencies?: string[];
  keywords?: string[];
  engines?: Record<string, string>;
  files?: string[];
  scripts?: Record<string, string>;
  config?: Record<string, unknown>;
  permissions?: string[];
  platforms?: ('linux' | 'darwin' | 'win32')[];
}
export type {
  InitializationFunction,
  CleanupFunction,
  EventProcessingFunction,
  HealthCheckFunction,
} from './signatures';

// Agent system types (selective exports to avoid conflicts)
export type {
  Agent,
  AgentConfig,
  AgentState,
  LazyAgentState,
  LazyAgent,
  AgentFactory,
  AgentEvent,
  ExtensionAction,
  ExtensionEventHandler,
  ActionResult,
  MemoryProvider,
  MemoryRecord,
  AgentAction,
  ThoughtContext,
  ThoughtResult,
  EventBus,
  EventContext,
  EventContextFilter,
  EventPropagationRule,
} from './agent';
export {
  AgentStatus,
  LazyAgentStatus,
  ActionStatus,
  MemoryType,
  ExtensionStatus,
  ActionCategory,
  ActionResultType,
  ExtensionType,
  MemoryProviderType,
  EmotionModuleType,
  CognitionModuleType,
} from './agent';
export type { Extension } from './extension';
export type { Portal, PortalConfig, PortalType } from './portal';
export * from './portals/ai-sdk';
export * from './portals/responses';

// Export ExtensionMetadata from common (ExtensionConfig already exported above)
export type { ExtensionMetadata } from './common';

// Context types for improved type safety
export * from './context';

// Unified Context System - Phase 1 Implementation
export * from './context/index';

// Runtime configuration and stats
export * from './runtime-config';
export * from './runtime-stats';

// Advanced module types (selective exports)
export type {
  EmotionModule,
  PersonalityTraits,
  EmotionBlend,
  AdvancedEmotionConfig,
} from './emotion';
export type {
  EmotionTriggerEvent,
  EmotionModifier,
  EmotionTransition,
  EmotionBlendResult,
  EmotionHistoryEntry,
  EmotionResult,
  EmotionData,
  EmotionCalculation,
  EmotionEventHandler,
  EmotionDecayConfig,
  EmotionModuleRegistration,
} from './modules/emotions';
export type {
  CognitionModule,
  SerializableRule,
  PDDLExpression,
  ReasoningParadigm,
  ContextAnalysis,
  ReasoningState,
} from './cognition';

// Memory types (selective exports)
export type {
  SearchQuery,
  SearchResult,
  SearchQueryType,
  BoostFactors,
  TimeRange,
  MemoryRelationship,
  MemoryRelationshipType,
  MemoryManagementPolicy,
  MemoryPolicyConfig,
  PolicyCondition,
  PolicyAction,
  MemoryProviderMetadata,
  MemoryProviderFactory,
  MemoryProviderConfig,
  ConsolidationRule,
  MemoryTier,
  MemoryContext,
  MemoryPermission,
  SharedMemoryConfig,
  ArchivalStrategy,
} from './memory';

// Export enums as values (not types)
export { MemoryDuration, MemoryTierType } from './memory';

// Character configuration types
export type {
  CharacterConfig,
  EnvironmentConfig,
  PortalConfig as CharacterPortalConfig,
  PortalSpecificConfig,
  PortalCapability,
} from './character';
export { ConfigDefaults } from './character';

// Lifecycle and operations
export * from './lifecycle';

// EventSource types (for server-sent events)
// Note: eventsource.d.ts is a type declaration file, not exported


/**
 * Enhanced result types that replace the generic Result<T>
 * These provide better type safety and more detailed information
 */
// Already exported above to avoid duplicate exports

/**
 * Module-specific result types for better type safety
 */
// Already exported above to avoid duplicate exports

/**
 * Factory function type for creating modules
 */
export type ModuleFactory<T, C = unknown> = (config?: C) => T | Promise<T>;

/**
 * Plugin manifest for dynamic loading
 */
export interface PluginManifest {
  id?: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  license?: string;
  homepage?: string;
  repository?: string;
  main: string;
  type: 'portal' | 'memory' | 'utility' | 'extension' | 'skill';
  disabled: boolean;
  dependencies?: string[];
  devDependencies?: string[];
  peerDependencies?: string[];
  keywords?: string[];
  engines?: Record<string, string>;
  files?: string[];
  scripts?: Record<string, string>;
  config?: Record<string, unknown>;
  permissions?: string[];
  platforms?: ('linux' | 'darwin' | 'win32')[];
  enabled?: boolean;
}

/**
 * System configuration interface
 */
export interface SystemConfig {
  pluginsDirectory: string;
  allowUnsafePlugins: boolean;
  validateDependencies: boolean;
  maxConcurrentLoads: number;
  loadTimeout: number;
}

/**
 * Plugin configuration interface
 */
export interface PluginConfig {
  enabled: boolean;
  priority: number;
  loadTimeout: number;
  hotReload: boolean;
  security: {
    sandboxed: boolean;
    permissions: string[];
  };
  config: Record<string, unknown>;
}

/**
 * Security context for plugins
 */
export interface SecurityContext {
  sandboxed: boolean;
  permissions: Set<string>;
  resourceLimits: {
    memory: number;
    cpu: number;
    network: boolean;
    filesystem: boolean;
  };
  trustedPlugin: boolean;
}


/**
 * Dependency validation result
 */
export interface DependencyValidation {
  valid: boolean;
  missing: string[];
  circular: string[];
}


/**
 * Type-safe event emitter with proper result types
 */
export interface TypedEventEmitter<T extends Record<string, unknown>> {
  on<K extends keyof T>(
    event: K,
    listener: (data: T[K]) => EventProcessingResult
  ): OperationResult;
  off<K extends keyof T>(
    event: K,
    listener: (data: T[K]) => EventProcessingResult
  ): OperationResult;
  emit<K extends keyof T>(event: K, data: T[K]): EventDispatchResult;
  once<K extends keyof T>(
    event: K,
    listener: (data: T[K]) => EventProcessingResult
  ): OperationResult;
  listenerCount<K extends keyof T>(event: K): number;
  eventNames(): (keyof T)[];
  removeAllListeners<K extends keyof T>(event?: K): OperationResult;
}


/**
 * Module registry with proper result types
 */
export interface ModuleRegistryV5 {
  register<T>(name: string, factory: ModuleFactory<T>): OperationResult;
  get<T>(name: string): T | undefined;
  has(name: string): boolean;
  unregister(name: string): OperationResult;
  list(): string[];
  getMetadata(name: string): ModuleManifest | undefined;
  validate(name: string): ValidationResult;
  healthCheck(name: string): HealthCheckResult;
}


/**
 * Health monitoring service
 */
export interface HealthMonitoringService {
  checkHealth(componentId: string): Promise<HealthCheckResult>;
  checkSystemHealth(): Promise<SystemHealthResult>;
  registerHealthCheck(
    componentId: string,
    check: () => Promise<HealthCheckResult>
  ): OperationResult;
  unregisterHealthCheck(componentId: string): OperationResult;
  getHealthHistory(
    componentId: string,
    duration?: Duration
  ): Promise<HealthCheckResult[]>;
  subscribe(callback: (result: HealthCheckResult) => void): OperationResult;
  unsubscribe(callback: (result: HealthCheckResult) => void): OperationResult;
}


/**
 * Configuration provider with proper result types
 */
export interface ConfigProvider {
  get<T>(key: string, defaultValue?: T): T;
  set(key: string, value: unknown): ConfigurationUpdateResult;
  has(key: string): boolean;
  getAll(): Record<string, unknown>;
  reload(): Promise<ConfigurationLoadResult>;
  validate(key?: string): ValidationResult;
  getSchema(): ConfigurationSchema;
  watch(
    key: string,
    callback: (result: ConfigurationUpdateResult) => void
  ): OperationResult;
  unwatch(key: string): OperationResult;
}


/**
 * Logger interface with proper result types
 */
export interface LoggerV5 {
  debug(message: string, metadata?: Metadata): LoggingResult;
  info(message: string, metadata?: Metadata): LoggingResult;
  warn(message: string, metadata?: Metadata): LoggingResult;
  error(message: string, error?: Error, metadata?: Metadata): LoggingResult;
  fatal(message: string, error?: Error, metadata?: Metadata): LoggingResult;
  child(metadata: Metadata): LoggerV5;
  setLevel(
    level: 'debug' | 'info' | 'warn' | 'error' | 'fatal'
  ): OperationResult;
  getLevel(): string;
  flush(): Promise<OperationResult>;
}


/**
 * Disposable interface with proper result types
 */
export interface AsyncDisposable {
  dispose(): Promise<CleanupResult>;
  isDisposed(): boolean;
  getResourceInfo(): {
    type: string;
    id: string;
    status: 'active' | 'disposed' | 'disposing';
    metadata?: Record<string, unknown>;
  };
}


/**
 * Factory registry with proper result types
 */
export interface FactoryRegistry {
  registerMemoryFactory(
    name: string,
    factory: ModuleFactory<MemoryProvider>
  ): OperationResult;
  registerEmotionFactory(
    name: string,
    factory: ModuleFactory<EmotionModule>
  ): OperationResult;
  registerCognitionFactory(
    name: string,
    factory: ModuleFactory<CognitionModule>
  ): OperationResult;
  registerExtensionFactory(
    name: string,
    factory: ModuleFactory<Extension>
  ): OperationResult;
  registerPortalFactory(
    name: string,
    factory: ModuleFactory<Portal>
  ): OperationResult;

  getMemoryFactory(name: string): ModuleFactory<MemoryProvider> | undefined;
  getEmotionFactory(name: string): ModuleFactory<EmotionModule> | undefined;
  getCognitionFactory(name: string): ModuleFactory<CognitionModule> | undefined;
  getExtensionFactory(name: string): ModuleFactory<Extension> | undefined;
  getPortalFactory(name: string): ModuleFactory<Portal> | undefined;

  validateFactory(name: string): ValidationResult;
  listFactories(type?: string): string[];
  getFactoryMetadata(name: string): ModuleManifest | undefined;
}

// Export strict types to replace untyped usage
export type {
  LoggerMetadata,
  LoggerArgs,
  AgentData,
  AgentMetadata,
  AgentConfiguration,
  ConfigurationValue,
  AgentPerformanceMetrics,
  MemoryConfiguration,
  DatabaseConfiguration,
  VectorSearchConfiguration,
  RetentionConfiguration,
  EmotionConfiguration,
  EmotionType,
  EmotionState,
  EmotionContext,
  EmotionMetadata,
  SocialContextData,
  EnvironmentalContextData,
  CognitionConfiguration,
  CognitionContext,
  TimeConstraints,
  PortalConfiguration,
  ModelSettings,
  PortalResponse,
  PortalResponseData,
  TokenUsage,
  PortalMetadata,
  ExtensionConfiguration,
  ExtensionSettings,
  ExtensionData,
  CLIOptions,
  CLIMetrics,
  AgentMetrics,
  SystemMetrics,
  CommandOptions,
  CommandContext,
  CommandResult,
  CommandResultData,
  CommandMetadata,
  ChatPriority,
  ChatMessage,
  ChatMessageMetadata,
  MonitoringOptions,
  MonitoringCommand,
  MonitoringResult,
  MonitoringResultData,
  MonitoringMetrics,
  HookDependencies,
  NavigationData,
  NavigationParams,
  NavigationMetadata,
  ConnectionDetails,
  TerminalFunction,
  TerminalDimensions,
  GridContent,
  RuntimeClientResponse,
  RuntimeClientData,
  RuntimeClientMetadata,
  RuntimeClientRequestBody,
  AISDKParameters,
  AIMessage,
  AIMessageMetadata,
  AITool,
  AIToolParameters,
  AIToolProperty,
  GenerationOptions,
  StreamingOptions,
  ValidationOptions,
  ValidationSchema,
  ValidationRule,
  ExecutionContext,
  EnvironmentContext,
  RuntimeContext,
  CPUContext,
  ExecutionMetadata,
  SearchCriteria,
  SearchFilters,
  SearchSort,
  SearchPagination,
  SearchResults,
  SearchMetadata,
  DecisionCriteria,
  DecisionOption,
  DecisionMetadata,
  DecisionResult,
  KeyValuePair,
  StatusCounts,
  GradientFunction,
  UpdateData,
  CharacterConfiguration,
  PersonalityConfiguration,
  ModuleConfiguration,
  AutonomousConfiguration,
  AutonomousConstraints,
  // Strict type aliases
  StrictConfigurationValue,
  StrictLoggerArgs,
  StrictLoggerMetadata,
  StrictAgentData,
  StrictCLIOptions,
  StrictCommandOptions,
  StrictMonitoringOptions,
  StrictHookDependencies,
  StrictNavigationData,
  StrictConnectionDetails,
  StrictGridContent,
  StrictRuntimeClientResponse,
  StrictRuntimeClientRequestBody,
  StrictAISDKParameters,
  StrictGenerationOptions,
  StrictValidationOptions,
  StrictExecutionContext,
  StrictSearchCriteria,
  StrictDecisionCriteria,
  StrictKeyValuePair,
  StrictStatusCounts,
  StrictUpdateData,
} from './strict';

// Extension types
export * from './extensions';

// CLI types
export * from './cli/index';

// Module-specific types
export * from './modules/index';

// Core system types
export * from './core/runtime';
export * from './core/events';

// Utility types
export * from './utils/logger';
export * from './utils/validation';
export * from './utils/arrays';
export * from './utils/maps';

// Type safety enhancements
export * from './type-guards';
export * from './naming-migration';
export * from './api-versioning';
export * from './validation-utils';
export * from './agent-interfaces';

// Compliance types
export type {
  ComplianceConfig,
  DataClassification,
  DataHandlingRule,
  DataAction,
  DataRestriction,
  RetentionPolicy,
  AuditEntry,
  GDPRConfig,
  ConsentPurpose,
  ConsentRecord,
  ConsentStatus,
  UserDataExport,
  GDPRService,
  DataSubjectRequest,
  DataSubjectResponse,
  PrivacyPolicy,
  ThirdParty,
  HIPAAConfig,
  PHIClassification,
  HIPAAAuditLog,
  HIPAAService,
  EncryptedData,
  PHIAuthorization,
  BreachIncident,
  SecurityTraining,
  TrainingStatus,
  AuditFilter,
  AuditReport,
  AuditAnomaly,
  SOXConfig,
  SOXControl,
  FinancialDataTag,
  ChangeRequest,
  ChangeApproval,
  ChangeTest,
  SOXService,
  ChangeImplementation,
  ChangeSet,
  SOXAuditFilter,
  SOXAuditEntry,
  ControlTestResult,
  ControlEffectivenessReport,
  ControlCategoryStats,
  ReportPeriod,
  SOXComplianceReport,
  MaterialWeakness,
  SignificantDeficiency,
  RemediationPlan,
  RemediationAction,
  CertificationStatus,
  ComplianceManager,
  ComplianceStatus,
  ComplianceReport,
  GDPRComplianceReport,
  HIPAAComplianceReport,
  ComplianceServiceFactory,
} from './compliance';
