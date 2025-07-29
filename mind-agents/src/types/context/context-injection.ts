/**
 * Context Injection Framework for SYMindX
 * 
 * Provides dependency injection patterns for automatic context propagation
 * throughout the system, eliminating manual context passing.
 */

import type { 
  OperationResult, 
  ValidationResult, 
  Metadata, 
  AgentId, 
  ModuleId,
  CorrelationId 
} from '../helpers';
import type { BaseContext } from '../context';
import type { Agent } from '../agent';
import type { Extension } from '../extension';
import type { Portal } from '../portal';
import type { MemoryProvider } from '../memory';

/**
 * Context provider interface for context sources
 * Implementations provide context data from various sources
 */
export interface ContextProvider<T = unknown> {
  /** Unique identifier for this provider */
  readonly id: string;
  
  /** Priority for provider ordering (higher = higher priority) */
  readonly priority: number;
  
  /** Whether this provider can provide async context */
  readonly supportsAsync: boolean;
  
  /**
   * Synchronously provide context data
   * @param scope - The context scope being requested
   * @returns Context data or undefined if not available
   */
  provide(scope: ContextScope): T | undefined;
  
  /**
   * Asynchronously provide context data
   * @param scope - The context scope being requested
   * @returns Promise resolving to context data or undefined
   */
  provideAsync?(scope: ContextScope): Promise<T | undefined>;
  
  /**
   * Check if this provider can provide context for the given scope
   * @param scope - The context scope to check
   * @returns true if provider can provide context for this scope
   */
  canProvide(scope: ContextScope): boolean;
  
  /**
   * Initialize the provider
   * @param injector - Reference to the context injector
   */
  initialize?(injector: ContextInjector): Promise<OperationResult>;
  
  /**
   * Cleanup resources
   */
  dispose?(): Promise<OperationResult>;
}

/**
 * Context middleware interface for context transformation
 * Allows modification of context as it flows through the injection pipeline
 */
export interface ContextMiddleware<TInput = unknown, TOutput = unknown> {
  /** Unique identifier for this middleware */
  readonly id: string;
  
  /** Priority for middleware ordering (higher = executed first) */
  readonly priority: number;
  
  /**
   * Transform context data
   * @param context - Current context data
   * @param scope - The context scope
   * @param next - Function to call next middleware in chain
   * @returns Transformed context data
   */
  transform(
    context: TInput,
    scope: ContextScope,
    next: (context: TInput) => Promise<TOutput>
  ): Promise<TOutput>;
  
  /**
   * Check if this middleware should process the given scope
   * @param scope - The context scope to check
   * @returns true if middleware should process this scope
   */
  shouldProcess(scope: ContextScope): boolean;
  
  /**
   * Initialize the middleware
   * @param injector - Reference to the context injector
   */
  initialize?(injector: ContextInjector): Promise<OperationResult>;
  
  /**
   * Cleanup resources
   */
  dispose?(): Promise<OperationResult>;
}

/**
 * Context scope definition
 * Defines the scope and target for context injection
 */
export interface ContextScope {
  /** The type of scope (module, extension, portal, etc.) */
  type: ContextScopeType;
  
  /** Target identifier within the scope */
  target: string;
  
  /** Agent ID if scope is agent-specific */
  agentId?: AgentId;
  
  /** Correlation ID for request tracking */
  correlationId?: CorrelationId;
  
  /** Additional metadata for scope resolution */
  metadata?: Metadata;
  
  /** Parent scope if this is a nested scope */
  parent?: ContextScope;
  
  /** Child scopes for hierarchical contexts */
  children?: ContextScope[];
}

/**
 * Types of context scopes
 */
export enum ContextScopeType {
  /** Global application context */
  Global = 'global',
  
  /** Agent-specific context */
  Agent = 'agent',
  
  /** Module-specific context */
  Module = 'module',
  
  /** Extension-specific context */
  Extension = 'extension',
  
  /** Portal-specific context */
  Portal = 'portal',
  
  /** Service-specific context */
  Service = 'service',
  
  /** Request-specific context */
  Request = 'request',
  
  /** Session-specific context */
  Session = 'session',
  
  /** User-specific context */
  User = 'user',
  
  /** Custom context scope */
  Custom = 'custom'
}

/**
 * Context injection configuration
 */
export interface ContextInjectionConfig {
  /** Whether to enable async context providers */
  enableAsync: boolean;
  
  /** Maximum time to wait for async providers (ms) */
  asyncTimeout: number;
  
  /** Whether to enable context caching */
  enableCaching: boolean;
  
  /** Cache TTL in milliseconds */
  cacheTtl: number;
  
  /** Whether to validate context data */
  enableValidation: boolean;
  
  /** Maximum depth for nested context resolution */
  maxDepth: number;
  
  /** Whether to enable context enrichment */
  enableEnrichment: boolean;
  
  /** Whether to enable context middleware */
  enableMiddleware: boolean;
  
  /** Default context merger strategy */
  mergeStrategy: ContextMergeStrategy;
}

/**
 * Context merge strategies
 */
export enum ContextMergeStrategy {
  /** Replace existing context completely */
  Replace = 'replace',
  
  /** Merge context objects (shallow) */
  Merge = 'merge',
  
  /** Deep merge context objects */
  DeepMerge = 'deep-merge',
  
  /** Override only undefined values */
  Override = 'override',
  
  /** Custom merge function */
  Custom = 'custom'
}

/**
 * Context enricher interface
 * Enriches context with additional data
 */
export interface ContextEnricher<T = unknown> {
  /** Unique identifier for this enricher */
  readonly id: string;
  
  /** Priority for enricher ordering */
  readonly priority: number;
  
  /**
   * Enrich context with additional data
   * @param context - Current context data
   * @param scope - The context scope
   * @returns Enriched context data
   */
  enrich(context: T, scope: ContextScope): Promise<T>;
  
  /**
   * Check if this enricher should process the given scope
   * @param scope - The context scope to check
   * @returns true if enricher should process this scope
   */
  shouldEnrich(scope: ContextScope): boolean;
  
  /**
   * Initialize the enricher
   * @param injector - Reference to the context injector
   */
  initialize?(injector: ContextInjector): Promise<OperationResult>;
  
  /**
   * Cleanup resources
   */
  dispose?(): Promise<OperationResult>;
}

/**
 * Type wrapper for components with injected context
 */
export type WithContext<T, C = BaseContext> = T & {
  /** Injected context data */
  readonly context: C;
  
  /** Context scope for this component */
  readonly contextScope: ContextScope;
  
  /** Update context data */
  updateContext?(updates: Partial<C>): Promise<OperationResult>;
  
  /** Get context value by key */
  getContextValue?<K extends keyof C>(key: K): C[K];
  
  /** Set context value by key */
  setContextValue?<K extends keyof C>(key: K, value: C[K]): Promise<OperationResult>;
};

/**
 * Context injection result
 */
export interface ContextInjectionResult<T = unknown> {
  /** Whether injection was successful */
  success: boolean;
  
  /** Injected context data */
  context?: T;
  
  /** Context scope that was resolved */
  scope: ContextScope;
  
  /** Providers that contributed to the context */
  providers: string[];
  
  /** Middleware that processed the context */
  middleware: string[];
  
  /** Enrichers that enhanced the context */
  enrichers: string[];
  
  /** Any errors that occurred during injection */
  errors?: Error[];
  
  /** Validation results if validation was enabled */
  validation?: ValidationResult;
  
  /** Performance metrics for the injection */
  metrics: {
    totalTime: number;
    providerTime: number;
    middlewareTime: number;
    enrichmentTime: number;
    cacheHit: boolean;
  };
}

/**
 * Context injector interface
 * Main interface for the context injection system
 */
export interface ContextInjector {
  /**
   * Register a context provider
   * @param provider - The context provider to register
   * @returns Operation result
   */
  registerProvider<T>(provider: ContextProvider<T>): OperationResult;
  
  /**
   * Unregister a context provider
   * @param providerId - ID of the provider to unregister
   * @returns Operation result
   */
  unregisterProvider(providerId: string): OperationResult;
  
  /**
   * Register context middleware
   * @param middleware - The middleware to register
   * @returns Operation result
   */
  registerMiddleware<TInput, TOutput>(
    middleware: ContextMiddleware<TInput, TOutput>
  ): OperationResult;
  
  /**
   * Unregister context middleware
   * @param middlewareId - ID of the middleware to unregister
   * @returns Operation result
   */
  unregisterMiddleware(middlewareId: string): OperationResult;
  
  /**
   * Register a context enricher
   * @param enricher - The enricher to register
   * @returns Operation result
   */
  registerEnricher<T>(enricher: ContextEnricher<T>): OperationResult;
  
  /**
   * Unregister a context enricher
   * @param enricherId - ID of the enricher to unregister
   * @returns Operation result
   */
  unregisterEnricher(enricherId: string): OperationResult;
  
  /**
   * Inject context for a given scope
   * @param scope - The context scope to inject for
   * @returns Context injection result
   */
  inject<T = BaseContext>(scope: ContextScope): Promise<ContextInjectionResult<T>>;
  
  /**
   * Create a scoped injector for a specific context
   * @param scope - The scope to create injector for
   * @returns New context injector scoped to the given context
   */
  createScopedInjector(scope: ContextScope): Promise<ContextInjector>;
  
  /**
   * Clear context cache
   * @param scope - Optional scope to clear (clears all if not provided)
   * @returns Operation result
   */
  clearCache(scope?: ContextScope): OperationResult;
  
  /**
   * Get injector configuration
   * @returns Current configuration
   */
  getConfig(): ContextInjectionConfig;
  
  /**
   * Update injector configuration
   * @param config - New configuration (partial)
   * @returns Operation result
   */
  updateConfig(config: Partial<ContextInjectionConfig>): OperationResult;
  
  /**
   * Get registered providers
   * @returns Array of provider IDs
   */
  getProviders(): string[];
  
  /**
   * Get registered middleware
   * @returns Array of middleware IDs
   */
  getMiddleware(): string[];
  
  /**
   * Get registered enrichers
   * @returns Array of enricher IDs  
   */
  getEnrichers(): string[];
  
  /**
   * Validate context data
   * @param context - Context data to validate
   * @param scope - Context scope
   * @returns Validation result
   */
  validateContext(context: unknown, scope: ContextScope): Promise<ValidationResult>;
  
  /**
   * Initialize the injector
   * @param config - Injector configuration
   * @returns Operation result
   */
  initialize(config?: Partial<ContextInjectionConfig>): Promise<OperationResult>;
  
  /**
   * Cleanup resources and dispose of injector
   * @returns Operation result
   */
  dispose(): Promise<OperationResult>;
}

/**
 * Context injection decorators (if using decorator pattern)
 */
export interface ContextInjectionDecorators {
  /**
   * Inject context into a class or method
   * @param scope - Context scope to inject
   */
  InjectContext(scope?: Partial<ContextScope>): ClassDecorator | MethodDecorator;
  
  /**
   * Mark a parameter for context injection
   * @param key - Context key to inject
   */
  Context(key?: string): ParameterDecorator;
  
  /**
   * Mark a class as context-aware
   * @param config - Context configuration
   */
  ContextAware(config?: Partial<ContextInjectionConfig>): ClassDecorator;
}

/**
 * Built-in context providers
 */
export interface BuiltInContextProviders {
  /** Agent context provider */
  agent: ContextProvider<Agent>;
  
  /** Extension context provider */
  extension: ContextProvider<Extension>;
  
  /** Portal context provider */
  portal: ContextProvider<Portal>;
  
  /** Memory provider context */
  memory: ContextProvider<MemoryProvider>;
  
  /** Environment context provider */
  environment: ContextProvider<Record<string, string>>;
  
  /** Session context provider */
  session: ContextProvider<{ sessionId: string; userId?: string }>;
  
  /** Request context provider */
  request: ContextProvider<{ correlationId: CorrelationId; timestamp: Date }>;
}

/**
 * Context injection factory
 */
export interface ContextInjectionFactory {
  /**
   * Create a new context injector
   * @param config - Injector configuration
   * @returns New context injector instance
   */
  createInjector(config?: Partial<ContextInjectionConfig>): Promise<ContextInjector>;
  
  /**
   * Create built-in context providers
   * @returns Built-in providers
   */
  createBuiltInProviders(): BuiltInContextProviders;
  
  /**
   * Create a context scope
   * @param type - Scope type
   * @param target - Target identifier
   * @param options - Additional scope options
   * @returns Context scope
   */
  createScope(
    type: ContextScopeType, 
    target: string, 
    options?: Partial<ContextScope>
  ): ContextScope;
}

/**
 * Module context injection patterns
 */
export interface ModuleContextInjection {
  /** Module ID */
  moduleId: ModuleId;
  
  /** Module configuration context */
  config: unknown;
  
  /** Module runtime context */
  runtime: {
    startTime: Date;
    status: 'initializing' | 'running' | 'stopping' | 'stopped';
    metrics: Record<string, number>;
  };
  
  /** Module dependencies context */
  dependencies: Record<string, unknown>;
}

/**
 * Extension context injection patterns
 */
export interface ExtensionContextInjection {
  /** Extension ID */
  extensionId: string;
  
  /** Extension configuration */
  config: unknown;
  
  /** Extension capabilities */
  capabilities: string[];
  
  /** Extension state */
  state: Record<string, unknown>;
  
  /** Associated agent */
  agent?: Agent;
}

/**
 * Portal context injection patterns
 */
export interface PortalContextInjection {
  /** Portal ID */
  portalId: string;
  
  /** Portal configuration */
  config: unknown;
  
  /** Current model settings */
  model: {
    name: string;
    provider: string;
    parameters: Record<string, unknown>;
  };
  
  /** Token usage tracking */
  tokenUsage: {
    input: number;
    output: number;
    total: number;
  };
}

/**
 * Service context injection patterns
 */
export interface ServiceContextInjection {
  /** Service ID */
  serviceId: string;
  
  /** Service configuration */
  config: unknown;
  
  /** Service health status */
  health: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    lastCheck: Date;
    metrics: Record<string, number>;
  };
  
  /** Service dependencies */
  dependencies: string[];
}