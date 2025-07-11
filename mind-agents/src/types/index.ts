/**
 * Centralized Type System for SYMindX
 *
 * This file exports all types used throughout the SYMindX system,
 * providing a single point of access for all type definitions.
 */

// Core types
export * from './common';
export * from './enums';
export * from './helpers';
export * from './results';
export * from './signatures';

// Agent system types (selective exports to avoid conflicts)
export type { Agent, AgentConfig, AgentStatus, AgentState, AgentAction } from './agent';
export type { Extension } from './extension';
export type { Portal, PortalConfig, PortalType } from './portal';

// Export ExtensionMetadata and ExtensionConfig from common
export type { ExtensionMetadata, ExtensionConfig } from './common';

// Advanced module types (selective exports)
export type {
  EmotionModule,
  PersonalityTraits,
  EmotionBlend,
  AdvancedEmotionConfig,
} from './emotion';
export type { CognitionModule } from './cognition';

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

// Lifecycle and operations (commented out due to conflicts)
// export * from './lifecycle';

// EventSource types (for server-sent events)
// Note: eventsource.d.ts is a type declaration file, not exported

/**
 * Result type for standardized error handling
 * @deprecated Use OperationResult, ExecutionResult, or specific result types from helpers/results instead
 */
export interface Result<T> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * Enhanced result types that replace the generic Result<T>
 * These provide better type safety and more detailed information
 */
export type {
  OperationResult,
  ExecutionResult,
  AsyncOperationResult,
  ValidationResult as EnhancedValidationResult,
  InitializationResult,
  CleanupResult,
  EventProcessingResult,
  StateUpdateResult,
  HealthCheckResult,
  LifecycleEventResult
} from './helpers';

/**
 * Module-specific result types for better type safety
 */
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
  AuthenticationResult,
  AuthorizationResult,
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
  LoggingResult
} from './results';

/**
 * Factory function type for creating modules
 */
export type ModuleFactory<T, C = any> = (config?: C) => T | Promise<T>;

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
  config?: Record<string, any>;
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
  config: Record<string, any>;
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
 * Validation result interface
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
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
 * Type-safe event emitter interface
 * @deprecated Use enhanced event emitter with proper result types
 */
export interface TypedEventEmitter<T extends Record<string, any>> {
  on<K extends keyof T>(event: K, listener: (data: T[K]) => void): void;
  off<K extends keyof T>(event: K, listener: (data: T[K]) => void): void;
  emit<K extends keyof T>(event: K, data: T[K]): void;
}

/**
 * Enhanced type-safe event emitter with proper result types
 */
export interface EnhancedTypedEventEmitter<T extends Record<string, any>> {
  on<K extends keyof T>(event: K, listener: (data: T[K]) => EventProcessingResult): OperationResult;
  off<K extends keyof T>(event: K, listener: (data: T[K]) => EventProcessingResult): OperationResult;
  emit<K extends keyof T>(event: K, data: T[K]): EventDispatchResult;
  once<K extends keyof T>(event: K, listener: (data: T[K]) => EventProcessingResult): OperationResult;
  listenerCount<K extends keyof T>(event: K): number;
  eventNames(): (keyof T)[];
  removeAllListeners<K extends keyof T>(event?: K): OperationResult;
}

/**
 * Module registry interface for type-safe module management
 * @deprecated Use enhanced registry types with proper result types
 */
export interface ModuleRegistry {
  register<T>(name: string, factory: ModuleFactory<T>): void;
  get<T>(name: string): T | undefined;
  has(name: string): boolean;
  unregister(name: string): boolean;
  list(): string[];
}

/**
 * Enhanced module registry with proper result types
 */
export interface EnhancedModuleRegistry {
  register<T>(name: string, factory: ModuleFactory<T>): OperationResult;
  get<T>(name: string): T | undefined;
  has(name: string): boolean;
  unregister(name: string): OperationResult;
  list(): string[];
  getMetadata(name: string): ModuleManifest | undefined;
  validate(name: string): EnhancedValidationResult;
  healthCheck(name: string): HealthCheckResult;
}

/**
 * Health check interface for system monitoring
 * @deprecated Use HealthCheckResult from helpers instead
 */
export interface HealthCheck {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  details?: Record<string, any>;
  lastChecked: Date;
  responseTime?: number;
}

/**
 * Enhanced health monitoring service
 */
export interface HealthMonitoringService {
  checkHealth(componentId: string): Promise<HealthCheckResult>;
  checkSystemHealth(): Promise<SystemHealthResult>;
  registerHealthCheck(componentId: string, check: () => Promise<HealthCheckResult>): OperationResult;
  unregisterHealthCheck(componentId: string): OperationResult;
  getHealthHistory(componentId: string, duration?: Duration): Promise<HealthCheckResult[]>;
  subscribe(callback: (result: HealthCheckResult) => void): OperationResult;
  unsubscribe(callback: (result: HealthCheckResult) => void): OperationResult;
}

/**
 * Performance metrics interface
 */
export interface PerformanceMetrics {
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
  cpuUsage: {
    user: number;
    system: number;
  };
  uptime: number;
  loadAverage: number[];
  timestamp: Date;
}

/**
 * Configuration provider interface
 * @deprecated Use enhanced configuration provider with proper result types
 */
export interface ConfigProvider {
  get<T>(key: string, defaultValue?: T): T;
  set(key: string, value: any): void;
  has(key: string): boolean;
  getAll(): Record<string, any>;
  reload(): Promise<void>;
}

/**
 * Enhanced configuration provider with proper result types
 */
export interface EnhancedConfigProvider {
  get<T>(key: string, defaultValue?: T): T;
  set(key: string, value: any): ConfigurationUpdateResult;
  has(key: string): boolean;
  getAll(): Record<string, any>;
  reload(): Promise<ConfigurationLoadResult>;
  validate(key?: string): ValidationResult;
  getSchema(): ConfigurationSchema;
  watch(key: string, callback: (result: ConfigurationUpdateResult) => void): OperationResult;
  unwatch(key: string): OperationResult;
}

/**
 * Logger interface for consistent logging
 * @deprecated Use enhanced logger interface with proper result types
 */
export interface ILogger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, error?: Error, ...args: any[]): void;
  child(metadata: Record<string, any>): ILogger;
}

/**
 * Enhanced logger interface with proper result types
 */
export interface EnhancedLogger {
  debug(message: string, metadata?: Record<string, any>): LoggingResult;
  info(message: string, metadata?: Record<string, any>): LoggingResult;
  warn(message: string, metadata?: Record<string, any>): LoggingResult;
  error(message: string, error?: Error, metadata?: Record<string, any>): LoggingResult;
  fatal(message: string, error?: Error, metadata?: Record<string, any>): LoggingResult;
  child(metadata: Record<string, any>): EnhancedLogger;
  setLevel(level: 'debug' | 'info' | 'warn' | 'error' | 'fatal'): OperationResult;
  getLevel(): string;
  flush(): Promise<OperationResult>;
}

/**
 * Async disposable interface for resource cleanup
 * @deprecated Use enhanced disposable interface with proper result types
 */
export interface AsyncDisposable {
  dispose(): Promise<void>;
}

/**
 * Enhanced disposable interface with proper result types
 */
export interface EnhancedAsyncDisposable {
  dispose(): Promise<CleanupResult>;
  isDisposed(): boolean;
  getResourceInfo(): {
    type: string;
    id: string;
    status: 'active' | 'disposed' | 'disposing';
    metadata?: Record<string, any>;
  };
}

/**
 * Factory registry for managing different types of factories
 * @deprecated Use enhanced factory registry with proper result types
 */
export interface FactoryRegistry {
  registerMemoryFactory(name: string, factory: ModuleFactory<any>): void;
  registerEmotionFactory(name: string, factory: ModuleFactory<any>): void;
  registerCognitionFactory(name: string, factory: ModuleFactory<any>): void;
  registerExtensionFactory(name: string, factory: ModuleFactory<any>): void;
  registerPortalFactory(name: string, factory: ModuleFactory<any>): void;

  getMemoryFactory(name: string): ModuleFactory<any> | undefined;
  getEmotionFactory(name: string): ModuleFactory<any> | undefined;
  getCognitionFactory(name: string): ModuleFactory<any> | undefined;
  getExtensionFactory(name: string): ModuleFactory<any> | undefined;
  getPortalFactory(name: string): ModuleFactory<any> | undefined;
}

/**
 * Enhanced factory registry with proper result types
 */
export interface EnhancedFactoryRegistry {
  registerMemoryFactory(name: string, factory: ModuleFactory<any>): OperationResult;
  registerEmotionFactory(name: string, factory: ModuleFactory<any>): OperationResult;
  registerCognitionFactory(name: string, factory: ModuleFactory<any>): OperationResult;
  registerExtensionFactory(name: string, factory: ModuleFactory<any>): OperationResult;
  registerPortalFactory(name: string, factory: ModuleFactory<any>): OperationResult;

  getMemoryFactory(name: string): ModuleFactory<any> | undefined;
  getEmotionFactory(name: string): ModuleFactory<any> | undefined;
  getCognitionFactory(name: string): ModuleFactory<any> | undefined;
  getExtensionFactory(name: string): ModuleFactory<any> | undefined;
  getPortalFactory(name: string): ModuleFactory<any> | undefined;

  validateFactory(name: string): EnhancedValidationResult;
  listFactories(type?: string): string[];
  getFactoryMetadata(name: string): ModuleManifest | undefined;
}
