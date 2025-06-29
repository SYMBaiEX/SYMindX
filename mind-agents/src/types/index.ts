/**
 * Centralized Type System for SYMindX
 * 
 * This file exports all types used throughout the SYMindX system,
 * providing a single point of access for all type definitions.
 */

// Core types
export * from './common.js';
export * from './enums.js';

// Agent system types (selective exports to avoid conflicts)
export type { Agent, AgentConfig, AgentStatus, AgentState } from './agent.js';
export type { Extension } from './extension.js';
export type { Portal, PortalConfig, PortalType } from './portal.js';

// Advanced module types (selective exports)
export type { EmotionModule } from './emotion.js';
export type { CognitionModule } from './cognition.js';

// Lifecycle and operations (commented out due to conflicts)
// export * from './lifecycle.js';

// EventSource types (for server-sent events)
// Note: eventsource.d.ts is a type declaration file, not exported

/**
 * Result type for standardized error handling
 */
export interface Result<T> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: Record<string, any>;
}

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
 */
export interface TypedEventEmitter<T extends Record<string, any>> {
  on<K extends keyof T>(event: K, listener: (data: T[K]) => void): void;
  off<K extends keyof T>(event: K, listener: (data: T[K]) => void): void;
  emit<K extends keyof T>(event: K, data: T[K]): void;
}

/**
 * Module registry interface for type-safe module management
 */
export interface ModuleRegistry {
  register<T>(name: string, factory: ModuleFactory<T>): void;
  get<T>(name: string): T | undefined;
  has(name: string): boolean;
  unregister(name: string): boolean;
  list(): string[];
}

/**
 * Health check interface for system monitoring
 */
export interface HealthCheck {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  details?: Record<string, any>;
  lastChecked: Date;
  responseTime?: number;
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
 */
export interface ConfigProvider {
  get<T>(key: string, defaultValue?: T): T;
  set(key: string, value: any): void;
  has(key: string): boolean;
  getAll(): Record<string, any>;
  reload(): Promise<void>;
}

/**
 * Logger interface for consistent logging
 */
export interface ILogger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, error?: Error, ...args: any[]): void;
  child(metadata: Record<string, any>): ILogger;
}

/**
 * Async disposable interface for resource cleanup
 */
export interface AsyncDisposable {
  dispose(): Promise<void>;
}

/**
 * Factory registry for managing different types of factories
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