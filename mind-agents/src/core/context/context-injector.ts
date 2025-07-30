/**
 * Context Injector Implementation for SYMindX
 *
 * Provides the main implementation of the context injection system,
 * including provider management, middleware pipeline, and context resolution.
 */

import type {
  ContextInjector,
  ContextProvider,
  ContextMiddleware,
  ContextEnricher,
  ContextScope,
  ContextInjectionConfig,
  ContextInjectionResult,
  ContextMergeStrategy,
  ContextScopeType,
  BuiltInContextProviders,
  ContextInjectionFactory,
} from '../../types/context/context-injection';
import type {
  OperationResult,
  ValidationResult,
  Metadata,
} from '../../types/helpers';
import type { BaseContext } from '../../types/context';
import type { Agent } from '../../types/agent';
import type { Extension } from '../../types/extension';
import type { Portal } from '../../types/portal';
import type { MemoryProvider } from '../../types/memory';
import { runtimeLogger } from '../../utils/logger';

/**
 * Default configuration for context injection
 */
const DEFAULT_CONFIG: ContextInjectionConfig = {
  enableAsync: true,
  asyncTimeout: 5000, // 5 seconds
  enableCaching: true,
  cacheTtl: 300000, // 5 minutes
  enableValidation: true,
  maxDepth: 10,
  enableEnrichment: true,
  enableMiddleware: true,
  mergeStrategy: ContextMergeStrategy.DeepMerge,
};

/**
 * Context cache entry
 */
interface ContextCacheEntry<T = unknown> {
  context: T;
  timestamp: number;
  scope: ContextScope;
  ttl: number;
}

/**
 * Context injection metrics
 */
interface InjectionMetrics {
  totalTime: number;
  providerTime: number;
  middlewareTime: number;
  enrichmentTime: number;
  cacheHit: boolean;
}

/**
 * Implementation of the context injector
 */
export class ContextInjectorImpl implements ContextInjector {
  private readonly providers = new Map<string, ContextProvider>();
  private readonly middleware = new Map<string, ContextMiddleware>();
  private readonly enrichers = new Map<string, ContextEnricher>();
  private readonly cache = new Map<string, ContextCacheEntry>();
  private config: ContextInjectionConfig;
  private initialized = false;

  constructor(config?: Partial<ContextInjectionConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the context injector
   */
  async initialize(
    config?: Partial<ContextInjectionConfig>
  ): Promise<OperationResult> {
    try {
      if (config) {
        this.config = { ...this.config, ...config };
      }

      // Initialize all providers
      for (const [id, provider] of this.providers) {
        if (provider.initialize) {
          const result = await provider.initialize(this);
          if (!result.success) {
            runtimeLogger.warn('Failed to initialize context provider', {
              providerId: id,
              error: result.error,
            });
          }
        }
      }

      // Initialize all middleware
      for (const [id, middleware] of this.middleware) {
        if (middleware.initialize) {
          const result = await middleware.initialize(this);
          if (!result.success) {
            runtimeLogger.warn('Failed to initialize context middleware', {
              middlewareId: id,
              error: result.error,
            });
          }
        }
      }

      // Initialize all enrichers
      for (const [id, enricher] of this.enrichers) {
        if (enricher.initialize) {
          const result = await enricher.initialize(this);
          if (!result.success) {
            runtimeLogger.warn('Failed to initialize context enricher', {
              enricherId: id,
              error: result.error,
            });
          }
        }
      }

      this.initialized = true;

      // Start cache cleanup timer if caching is enabled
      if (this.config.enableCaching) {
        this.startCacheCleanup();
      }

      runtimeLogger.info('Context injector initialized successfully', {
        providers: this.providers.size,
        middleware: this.middleware.size,
        enrichers: this.enrichers.size,
        config: this.config,
      });

      return { success: true };
    } catch (error) {
      runtimeLogger.error('Failed to initialize context injector', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Register a context provider
   */
  registerProvider<T>(provider: ContextProvider<T>): OperationResult {
    try {
      if (this.providers.has(provider.id)) {
        return {
          success: false,
          error: `Provider with id '${provider.id}' already exists`,
        };
      }

      this.providers.set(provider.id, provider as ContextProvider);

      runtimeLogger.debug('Context provider registered', {
        providerId: provider.id,
        priority: provider.priority,
        supportsAsync: provider.supportsAsync,
      });

      return { success: true };
    } catch (error) {
      runtimeLogger.error('Failed to register context provider', error, {
        providerId: provider.id,
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Unregister a context provider
   */
  unregisterProvider(providerId: string): OperationResult {
    try {
      const provider = this.providers.get(providerId);
      if (!provider) {
        return {
          success: false,
          error: `Provider with id '${providerId}' not found`,
        };
      }

      // Call dispose if available
      if (provider.dispose) {
        provider.dispose().catch((error) => {
          runtimeLogger.warn('Error disposing context provider', {
            providerId,
            error,
          });
        });
      }

      this.providers.delete(providerId);

      runtimeLogger.debug('Context provider unregistered', { providerId });

      return { success: true };
    } catch (error) {
      runtimeLogger.error('Failed to unregister context provider', error, {
        providerId,
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Register context middleware
   */
  registerMiddleware<TInput, TOutput>(
    middleware: ContextMiddleware<TInput, TOutput>
  ): OperationResult {
    try {
      if (this.middleware.has(middleware.id)) {
        return {
          success: false,
          error: `Middleware with id '${middleware.id}' already exists`,
        };
      }

      this.middleware.set(middleware.id, middleware as ContextMiddleware);

      runtimeLogger.debug('Context middleware registered', {
        middlewareId: middleware.id,
        priority: middleware.priority,
      });

      return { success: true };
    } catch (error) {
      runtimeLogger.error('Failed to register context middleware', error, {
        middlewareId: middleware.id,
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Unregister context middleware
   */
  unregisterMiddleware(middlewareId: string): OperationResult {
    try {
      const middleware = this.middleware.get(middlewareId);
      if (!middleware) {
        return {
          success: false,
          error: `Middleware with id '${middlewareId}' not found`,
        };
      }

      // Call dispose if available
      if (middleware.dispose) {
        middleware.dispose().catch((error) => {
          runtimeLogger.warn('Error disposing context middleware', {
            middlewareId,
            error,
          });
        });
      }

      this.middleware.delete(middlewareId);

      runtimeLogger.debug('Context middleware unregistered', { middlewareId });

      return { success: true };
    } catch (error) {
      runtimeLogger.error('Failed to unregister context middleware', error, {
        middlewareId,
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Register a context enricher
   */
  registerEnricher<T>(enricher: ContextEnricher<T>): OperationResult {
    try {
      if (this.enrichers.has(enricher.id)) {
        return {
          success: false,
          error: `Enricher with id '${enricher.id}' already exists`,
        };
      }

      this.enrichers.set(enricher.id, enricher as ContextEnricher);

      runtimeLogger.debug('Context enricher registered', {
        enricherId: enricher.id,
        priority: enricher.priority,
      });

      return { success: true };
    } catch (error) {
      runtimeLogger.error('Failed to register context enricher', error, {
        enricherId: enricher.id,
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Unregister a context enricher
   */
  unregisterEnricher(enricherId: string): OperationResult {
    try {
      const enricher = this.enrichers.get(enricherId);
      if (!enricher) {
        return {
          success: false,
          error: `Enricher with id '${enricherId}' not found`,
        };
      }

      // Call dispose if available
      if (enricher.dispose) {
        enricher.dispose().catch((error) => {
          runtimeLogger.warn('Error disposing context enricher', {
            enricherId,
            error,
          });
        });
      }

      this.enrichers.delete(enricherId);

      runtimeLogger.debug('Context enricher unregistered', { enricherId });

      return { success: true };
    } catch (error) {
      runtimeLogger.error('Failed to unregister context enricher', error, {
        enricherId,
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Inject context for a given scope
   */
  async inject<T = BaseContext>(
    scope: ContextScope
  ): Promise<ContextInjectionResult<T>> {
    const startTime = Date.now();
    const metrics: InjectionMetrics = {
      totalTime: 0,
      providerTime: 0,
      middlewareTime: 0,
      enrichmentTime: 0,
      cacheHit: false,
    };

    const result: ContextInjectionResult<T> = {
      success: false,
      scope,
      providers: [],
      middleware: [],
      enrichers: [],
      errors: [],
      metrics,
    };

    try {
      if (!this.initialized) {
        throw new Error('Context injector not initialized');
      }

      // Check cache first
      if (this.config.enableCaching) {
        const cached = this.getCachedContext<T>(scope);
        if (cached) {
          metrics.cacheHit = true;
          metrics.totalTime = Date.now() - startTime;

          return {
            ...result,
            success: true,
            context: cached,
            metrics,
          };
        }
      }

      // Collect context from providers
      const providerStartTime = Date.now();
      const contextData = await this.collectContextFromProviders<T>(
        scope,
        result
      );
      metrics.providerTime = Date.now() - providerStartTime;

      if (!contextData) {
        throw new Error('No context data collected from providers');
      }

      // Apply middleware transformations
      const middlewareStartTime = Date.now();
      const transformedContext = await this.applyMiddleware<T>(
        contextData,
        scope,
        result
      );
      metrics.middlewareTime = Date.now() - middlewareStartTime;

      // Apply enrichers
      const enrichmentStartTime = Date.now();
      const enrichedContext = await this.applyEnrichers<T>(
        transformedContext,
        scope,
        result
      );
      metrics.enrichmentTime = Date.now() - enrichmentStartTime;

      // Validate context if enabled
      if (this.config.enableValidation) {
        const validation = await this.validateContext(enrichedContext, scope);
        result.validation = validation;

        if (!validation.isValid) {
          runtimeLogger.warn('Context validation failed', {
            scope,
            errors: validation.errors,
          });
        }
      }

      // Cache the result if caching is enabled
      if (this.config.enableCaching) {
        this.cacheContext(scope, enrichedContext);
      }

      metrics.totalTime = Date.now() - startTime;

      result.success = true;
      result.context = enrichedContext;
      result.metrics = metrics;

      runtimeLogger.debug('Context injection completed', {
        scope: scope.type,
        target: scope.target,
        providers: result.providers.length,
        middleware: result.middleware.length,
        enrichers: result.enrichers.length,
        totalTime: metrics.totalTime,
        cacheHit: metrics.cacheHit,
      });

      return result;
    } catch (error) {
      metrics.totalTime = Date.now() - startTime;
      result.metrics = metrics;
      result.errors = [
        error instanceof Error ? error : new Error('Unknown error'),
      ];

      runtimeLogger.error('Context injection failed', error, { scope });

      return result;
    }
  }

  /**
   * Create a scoped injector for a specific context
   */
  async createScopedInjector(scope: ContextScope): Promise<ContextInjector> {
    const scopedInjector = new ContextInjectorImpl(this.config);

    // Copy providers that can handle this scope
    for (const [id, provider] of this.providers) {
      if (provider.canProvide(scope)) {
        scopedInjector.providers.set(id, provider);
      }
    }

    // Copy middleware that should process this scope
    for (const [id, middleware] of this.middleware) {
      if (middleware.shouldProcess(scope)) {
        scopedInjector.middleware.set(id, middleware);
      }
    }

    // Copy enrichers that should enrich this scope
    for (const [id, enricher] of this.enrichers) {
      if (enricher.shouldEnrich(scope)) {
        scopedInjector.enrichers.set(id, enricher);
      }
    }

    await scopedInjector.initialize();

    return scopedInjector;
  }

  /**
   * Clear context cache
   */
  clearCache(scope?: ContextScope): OperationResult {
    try {
      if (scope) {
        const cacheKey = this.generateCacheKey(scope);
        this.cache.delete(cacheKey);
        runtimeLogger.debug('Context cache cleared for scope', { scope });
      } else {
        this.cache.clear();
        runtimeLogger.debug('All context cache cleared');
      }

      return { success: true };
    } catch (error) {
      runtimeLogger.error('Failed to clear context cache', error, { scope });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get injector configuration
   */
  getConfig(): ContextInjectionConfig {
    return { ...this.config };
  }

  /**
   * Update injector configuration
   */
  updateConfig(config: Partial<ContextInjectionConfig>): OperationResult {
    try {
      this.config = { ...this.config, ...config };

      runtimeLogger.debug('Context injector configuration updated', { config });

      return { success: true };
    } catch (error) {
      runtimeLogger.error(
        'Failed to update context injector configuration',
        error
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get registered providers
   */
  getProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Get registered middleware
   */
  getMiddleware(): string[] {
    return Array.from(this.middleware.keys());
  }

  /**
   * Get registered enrichers
   */
  getEnrichers(): string[] {
    return Array.from(this.enrichers.keys());
  }

  /**
   * Validate context data
   */
  async validateContext(
    context: unknown,
    scope: ContextScope
  ): Promise<ValidationResult> {
    try {
      const errors: string[] = [];
      const warnings: string[] = [];

      // Basic validation
      if (context === null || context === undefined) {
        errors.push('Context cannot be null or undefined');
      }

      if (typeof context !== 'object') {
        errors.push(`Context must be an object, got ${typeof context}`);
      }

      // Scope-specific validation
      if (
        scope.type === ContextScopeType.Agent &&
        context &&
        typeof context === 'object'
      ) {
        if (!('agentId' in context)) {
          warnings.push('Agent context should include agentId');
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        metadata: { scope, validatedAt: new Date().toISOString() },
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [error instanceof Error ? error.message : 'Validation error'],
        warnings: [],
        metadata: { scope, validatedAt: new Date().toISOString() },
      };
    }
  }

  /**
   * Cleanup resources and dispose of injector
   */
  async dispose(): Promise<OperationResult> {
    try {
      // Dispose all providers
      await Promise.all(
        Array.from(this.providers.values()).map(async (provider) => {
          if (provider.dispose) {
            try {
              await provider.dispose();
            } catch (error) {
              runtimeLogger.warn('Error disposing provider', {
                providerId: provider.id,
                error,
              });
            }
          }
        })
      );

      // Dispose all middleware
      await Promise.all(
        Array.from(this.middleware.values()).map(async (middleware) => {
          if (middleware.dispose) {
            try {
              await middleware.dispose();
            } catch (error) {
              runtimeLogger.warn('Error disposing middleware', {
                middlewareId: middleware.id,
                error,
              });
            }
          }
        })
      );

      // Dispose all enrichers
      await Promise.all(
        Array.from(this.enrichers.values()).map(async (enricher) => {
          if (enricher.dispose) {
            try {
              await enricher.dispose();
            } catch (error) {
              runtimeLogger.warn('Error disposing enricher', {
                enricherId: enricher.id,
                error,
              });
            }
          }
        })
      );

      // Clear all collections
      this.providers.clear();
      this.middleware.clear();
      this.enrichers.clear();
      this.cache.clear();

      this.initialized = false;

      runtimeLogger.info('Context injector disposed successfully');

      return { success: true };
    } catch (error) {
      runtimeLogger.error('Failed to dispose context injector', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Collect context from providers
   */
  private async collectContextFromProviders<T>(
    scope: ContextScope,
    result: ContextInjectionResult<T>
  ): Promise<T | undefined> {
    const providers = Array.from(this.providers.values())
      .filter((provider) => provider.canProvide(scope))
      .sort((a, b) => b.priority - a.priority);

    if (providers.length === 0) {
      return undefined;
    }

    let contextData: any = {};
    const errors: Error[] = [];

    for (const provider of providers) {
      try {
        let providerContext: unknown;

        if (
          provider.supportsAsync &&
          provider.provideAsync &&
          this.config.enableAsync
        ) {
          // Use async provider with timeout
          providerContext = await Promise.race([
            provider.provideAsync(scope),
            new Promise<undefined>((_, reject) =>
              setTimeout(
                () => reject(new Error('Provider timeout')),
                this.config.asyncTimeout
              )
            ),
          ]);
        } else {
          providerContext = provider.provide(scope);
        }

        if (providerContext !== undefined) {
          contextData = this.mergeContext(contextData, providerContext);
          result.providers.push(provider.id);
        }
      } catch (error) {
        const err =
          error instanceof Error ? error : new Error('Provider error');
        errors.push(err);
        runtimeLogger.warn('Context provider failed', {
          providerId: provider.id,
          error: err.message,
        });
      }
    }

    if (errors.length > 0) {
      result.errors = result.errors || [];
      result.errors.push(...errors);
    }

    return contextData;
  }

  /**
   * Apply middleware transformations
   */
  private async applyMiddleware<T>(
    context: T,
    scope: ContextScope,
    result: ContextInjectionResult<T>
  ): Promise<T> {
    if (!this.config.enableMiddleware) {
      return context;
    }

    const middleware = Array.from(this.middleware.values())
      .filter((mw) => mw.shouldProcess(scope))
      .sort((a, b) => b.priority - a.priority);

    if (middleware.length === 0) {
      return context;
    }

    let currentContext = context;
    const errors: Error[] = [];

    // Create middleware chain
    const createNext = (index: number) => async (ctx: any) => {
      if (index >= middleware.length) {
        return ctx;
      }

      const mw = middleware[index];
      try {
        const nextContext = await mw.transform(
          ctx,
          scope,
          createNext(index + 1)
        );
        result.middleware.push(mw.id);
        return nextContext;
      } catch (error) {
        const err =
          error instanceof Error ? error : new Error('Middleware error');
        errors.push(err);
        runtimeLogger.warn('Context middleware failed', {
          middlewareId: mw.id,
          error: err.message,
        });
        return ctx; // Continue with original context
      }
    };

    currentContext = await createNext(0)(currentContext);

    if (errors.length > 0) {
      result.errors = result.errors || [];
      result.errors.push(...errors);
    }

    return currentContext;
  }

  /**
   * Apply enrichers
   */
  private async applyEnrichers<T>(
    context: T,
    scope: ContextScope,
    result: ContextInjectionResult<T>
  ): Promise<T> {
    if (!this.config.enableEnrichment) {
      return context;
    }

    const enrichers = Array.from(this.enrichers.values())
      .filter((enricher) => enricher.shouldEnrich(scope))
      .sort((a, b) => b.priority - a.priority);

    if (enrichers.length === 0) {
      return context;
    }

    let currentContext = context;
    const errors: Error[] = [];

    for (const enricher of enrichers) {
      try {
        currentContext = await enricher.enrich(currentContext, scope);
        result.enrichers.push(enricher.id);
      } catch (error) {
        const err =
          error instanceof Error ? error : new Error('Enricher error');
        errors.push(err);
        runtimeLogger.warn('Context enricher failed', {
          enricherId: enricher.id,
          error: err.message,
        });
      }
    }

    if (errors.length > 0) {
      result.errors = result.errors || [];
      result.errors.push(...errors);
    }

    return currentContext;
  }

  /**
   * Merge context data using configured strategy
   */
  private mergeContext(target: any, source: any): any {
    switch (this.config.mergeStrategy) {
      case ContextMergeStrategy.Replace:
        return source;

      case ContextMergeStrategy.Merge:
        return { ...target, ...source };

      case ContextMergeStrategy.DeepMerge:
        return this.deepMerge(target, source);

      case ContextMergeStrategy.Override:
        const result = { ...target };
        for (const [key, value] of Object.entries(source)) {
          if (result[key] === undefined) {
            result[key] = value;
          }
        }
        return result;

      default:
        return { ...target, ...source };
    }
  }

  /**
   * Deep merge two objects
   */
  private deepMerge(target: any, source: any): any {
    const result = { ...target };

    for (const [key, value] of Object.entries(source)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = this.deepMerge(result[key] || {}, value);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Get cached context if available and valid
   */
  private getCachedContext<T>(scope: ContextScope): T | undefined {
    const cacheKey = this.generateCacheKey(scope);
    const entry = this.cache.get(cacheKey);

    if (!entry) {
      return undefined;
    }

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(cacheKey);
      return undefined;
    }

    return entry.context as T;
  }

  /**
   * Cache context data
   */
  private cacheContext<T>(scope: ContextScope, context: T): void {
    const cacheKey = this.generateCacheKey(scope);
    const entry: ContextCacheEntry<T> = {
      context,
      timestamp: Date.now(),
      scope,
      ttl: this.config.cacheTtl,
    };

    this.cache.set(cacheKey, entry);
  }

  /**
   * Generate cache key for scope
   */
  private generateCacheKey(scope: ContextScope): string {
    const parts = [
      scope.type,
      scope.target,
      scope.agentId || '',
      scope.correlationId || '',
    ];

    return parts.join(':');
  }

  /**
   * Start cache cleanup timer
   */
  private startCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      const expiredKeys: string[] = [];

      for (const [key, entry] of this.cache) {
        if (now - entry.timestamp > entry.ttl) {
          expiredKeys.push(key);
        }
      }

      for (const key of expiredKeys) {
        this.cache.delete(key);
      }

      if (expiredKeys.length > 0) {
        runtimeLogger.debug('Context cache cleanup completed', {
          expired: expiredKeys.length,
          remaining: this.cache.size,
        });
      }
    }, 60000); // Cleanup every minute
  }
}

/**
 * Built-in context providers implementation
 */
export class BuiltInProviders implements BuiltInContextProviders {
  agent: ContextProvider<Agent>;
  extension: ContextProvider<Extension>;
  portal: ContextProvider<Portal>;
  memory: ContextProvider<MemoryProvider>;
  environment: ContextProvider<Record<string, string>>;
  session: ContextProvider<{ sessionId: string; userId?: string }>;
  request: ContextProvider<{ correlationId: string; timestamp: Date }>;

  constructor() {
    this.agent = this.createAgentProvider();
    this.extension = this.createExtensionProvider();
    this.portal = this.createPortalProvider();
    this.memory = this.createMemoryProvider();
    this.environment = this.createEnvironmentProvider();
    this.session = this.createSessionProvider();
    this.request = this.createRequestProvider();
  }

  private createAgentProvider(): ContextProvider<Agent> {
    return {
      id: 'builtin-agent',
      priority: 100,
      supportsAsync: false,

      provide(scope: ContextScope): Agent | undefined {
        // Implementation would retrieve agent from registry/runtime
        // This is a placeholder implementation
        return undefined;
      },

      canProvide(scope: ContextScope): boolean {
        return scope.type === ContextScopeType.Agent && !!scope.agentId;
      },
    };
  }

  private createExtensionProvider(): ContextProvider<Extension> {
    return {
      id: 'builtin-extension',
      priority: 100,
      supportsAsync: false,

      provide(scope: ContextScope): Extension | undefined {
        // Implementation would retrieve extension from registry
        return undefined;
      },

      canProvide(scope: ContextScope): boolean {
        return scope.type === ContextScopeType.Extension;
      },
    };
  }

  private createPortalProvider(): ContextProvider<Portal> {
    return {
      id: 'builtin-portal',
      priority: 100,
      supportsAsync: false,

      provide(scope: ContextScope): Portal | undefined {
        // Implementation would retrieve portal from registry
        return undefined;
      },

      canProvide(scope: ContextScope): boolean {
        return scope.type === ContextScopeType.Portal;
      },
    };
  }

  private createMemoryProvider(): ContextProvider<MemoryProvider> {
    return {
      id: 'builtin-memory',
      priority: 100,
      supportsAsync: false,

      provide(scope: ContextScope): MemoryProvider | undefined {
        // Implementation would retrieve memory provider from registry
        return undefined;
      },

      canProvide(scope: ContextScope): boolean {
        return (
          scope.type === ContextScopeType.Agent ||
          scope.type === ContextScopeType.Module
        );
      },
    };
  }

  private createEnvironmentProvider(): ContextProvider<Record<string, string>> {
    return {
      id: 'builtin-environment',
      priority: 50,
      supportsAsync: false,

      provide(): Record<string, string> {
        return process.env as Record<string, string>;
      },

      canProvide(): boolean {
        return true;
      },
    };
  }

  private createSessionProvider(): ContextProvider<{
    sessionId: string;
    userId?: string;
  }> {
    return {
      id: 'builtin-session',
      priority: 75,
      supportsAsync: false,

      provide(
        scope: ContextScope
      ): { sessionId: string; userId?: string } | undefined {
        // Implementation would extract session info from scope
        return scope.metadata?.sessionId
          ? {
              sessionId: scope.metadata.sessionId as string,
              userId: scope.metadata.userId as string | undefined,
            }
          : undefined;
      },

      canProvide(scope: ContextScope): boolean {
        return (
          scope.type === ContextScopeType.Session || !!scope.metadata?.sessionId
        );
      },
    };
  }

  private createRequestProvider(): ContextProvider<{
    correlationId: string;
    timestamp: Date;
  }> {
    return {
      id: 'builtin-request',
      priority: 75,
      supportsAsync: false,

      provide(
        scope: ContextScope
      ): { correlationId: string; timestamp: Date } | undefined {
        return scope.correlationId
          ? {
              correlationId: scope.correlationId,
              timestamp: new Date(),
            }
          : undefined;
      },

      canProvide(scope: ContextScope): boolean {
        return scope.type === ContextScopeType.Request || !!scope.correlationId;
      },
    };
  }
}

/**
 * Context injection factory implementation
 */
export class ContextInjectionFactoryImpl implements ContextInjectionFactory {
  /**
   * Create a new context injector
   */
  async createInjector(
    config?: Partial<ContextInjectionConfig>
  ): Promise<ContextInjector> {
    const injector = new ContextInjectorImpl(config);
    await injector.initialize();
    return injector;
  }

  /**
   * Create built-in context providers
   */
  createBuiltInProviders(): BuiltInContextProviders {
    return new BuiltInProviders();
  }

  /**
   * Create a context scope
   */
  createScope(
    type: ContextScopeType,
    target: string,
    options?: Partial<ContextScope>
  ): ContextScope {
    return {
      type,
      target,
      ...options,
    };
  }
}

/**
 * Global context injection factory instance
 */
export const contextInjectionFactory = new ContextInjectionFactoryImpl();

/**
 * Create a new context injector with default configuration
 */
export async function createContextInjector(
  config?: Partial<ContextInjectionConfig>
): Promise<ContextInjector> {
  return contextInjectionFactory.createInjector(config);
}

/**
 * Create built-in context providers
 */
export function createBuiltInProviders(): BuiltInContextProviders {
  return contextInjectionFactory.createBuiltInProviders();
}

/**
 * Create a context scope
 */
export function createScope(
  type: ContextScopeType,
  target: string,
  options?: Partial<ContextScope>
): ContextScope {
  return contextInjectionFactory.createScope(type, target, options);
}
