/**
 * Module Context Injection Patterns for SYMindX
 *
 * Provides dependency injection patterns specifically for modules,
 * including automatic configuration injection, dependency resolution,
 * and runtime context management.
 */

import type {
  ContextProvider,
  ContextMiddleware,
  ContextEnricher,
  ContextScope,
  ContextScopeType,
  ModuleContextInjection,
} from '../../../types/context/context-injection';
import type { OperationResult, ModuleId } from '../../../types/helpers';
import type { Agent } from '../../../types/agent';
import type { CognitionModule } from '../../../types/cognition';
import type { EmotionModule } from '../../../types/emotion';
import type { MemoryProvider } from '../../../types/memory';
import { runtimeLogger } from '../../../utils/logger';

/**
 * Module configuration context provider
 * Provides module-specific configuration data
 */
export class ModuleConfigProvider implements ContextProvider<unknown> {
  readonly id = 'module-config';
  readonly priority = 90;
  readonly supportsAsync = false;

  private readonly configRegistry = new Map<string, unknown>();

  provide(scope: ContextScope): unknown | undefined {
    if (scope.type !== ContextScopeType.Module) {
      return undefined;
    }

    return this.configRegistry.get(scope.target);
  }

  canProvide(scope: ContextScope): boolean {
    return (
      scope.type === ContextScopeType.Module &&
      this.configRegistry.has(scope.target)
    );
  }

  /**
   * Register configuration for a module
   */
  registerConfig(moduleId: string, config: unknown): void {
    this.configRegistry.set(moduleId, config);
    runtimeLogger.debug('Module configuration registered', { moduleId });
  }

  /**
   * Unregister configuration for a module
   */
  unregisterConfig(moduleId: string): void {
    this.configRegistry.delete(moduleId);
    runtimeLogger.debug('Module configuration unregistered', { moduleId });
  }
}

/**
 * Module dependencies context provider
 * Provides resolved module dependencies
 */
export class ModuleDependenciesProvider
  implements ContextProvider<Record<string, unknown>>
{
  readonly id = 'module-dependencies';
  readonly priority = 85;
  readonly supportsAsync = true;

  private readonly dependencyRegistry = new Map<
    string,
    Record<string, unknown>
  >();
  private readonly dependencyResolvers = new Map<
    string,
    () => Promise<unknown>
  >();

  provide(scope: ContextScope): Record<string, unknown> | undefined {
    if (scope.type !== ContextScopeType.Module) {
      return undefined;
    }

    return this.dependencyRegistry.get(scope.target);
  }

  async provideAsync(
    scope: ContextScope
  ): Promise<Record<string, unknown> | undefined> {
    if (scope.type !== ContextScopeType.Module) {
      return undefined;
    }

    const moduleId = scope.target;
    let dependencies = this.dependencyRegistry.get(moduleId);

    if (!dependencies) {
      // Resolve dependencies asynchronously
      dependencies = await this.resolveDependencies(moduleId);
      if (dependencies) {
        this.dependencyRegistry.set(moduleId, dependencies);
      }
    }

    return dependencies;
  }

  canProvide(scope: ContextScope): boolean {
    return scope.type === ContextScopeType.Module;
  }

  /**
   * Register a dependency resolver for a module
   */
  registerDependencyResolver(
    moduleId: string,
    dependencyName: string,
    resolver: () => Promise<unknown>
  ): void {
    const key = `${moduleId}:${dependencyName}`;
    this.dependencyResolvers.set(key, resolver);
    runtimeLogger.debug('Module dependency resolver registered', {
      moduleId,
      dependencyName,
    });
  }

  /**
   * Resolve all dependencies for a module
   */
  private async resolveDependencies(
    moduleId: string
  ): Promise<Record<string, unknown> | undefined> {
    const dependencies: Record<string, unknown> = {};
    const resolvers = Array.from(this.dependencyResolvers.entries()).filter(
      ([key]) => key.startsWith(`${moduleId}:`)
    );

    if (resolvers.length === 0) {
      return undefined;
    }

    try {
      await Promise.all(
        resolvers.map(async ([key, resolver]) => {
          const dependencyName = key.split(':')[1];
          try {
            dependencies[dependencyName] = await resolver();
          } catch (error) {
            runtimeLogger.warn('Failed to resolve module dependency', {
              moduleId,
              dependencyName,
              error,
            });
          }
        })
      );

      return dependencies;
    } catch (error) {
      runtimeLogger.error('Failed to resolve module dependencies', error, {
        moduleId,
      });
      return undefined;
    }
  }
}

/**
 * Module runtime context provider
 * Provides runtime information about modules
 */
export class ModuleRuntimeProvider
  implements ContextProvider<ModuleContextInjection['runtime']>
{
  readonly id = 'module-runtime';
  readonly priority = 80;
  readonly supportsAsync = false;

  private readonly runtimeInfo = new Map<
    string,
    ModuleContextInjection['runtime']
  >();

  provide(scope: ContextScope): ModuleContextInjection['runtime'] | undefined {
    if (scope.type !== ContextScopeType.Module) {
      return undefined;
    }

    return this.runtimeInfo.get(scope.target);
  }

  canProvide(scope: ContextScope): boolean {
    return (
      scope.type === ContextScopeType.Module &&
      this.runtimeInfo.has(scope.target)
    );
  }

  /**
   * Register runtime information for a module
   */
  registerRuntime(
    moduleId: string,
    runtime: ModuleContextInjection['runtime']
  ): void {
    this.runtimeInfo.set(moduleId, runtime);
    runtimeLogger.debug('Module runtime info registered', {
      moduleId,
      status: runtime.status,
    });
  }

  /**
   * Update module status
   */
  updateStatus(
    moduleId: string,
    status: ModuleContextInjection['runtime']['status']
  ): boolean {
    const runtime = this.runtimeInfo.get(moduleId);
    if (!runtime) {
      return false;
    }

    runtime.status = status;
    runtimeLogger.debug('Module status updated', { moduleId, status });
    return true;
  }

  /**
   * Update module metrics
   */
  updateMetrics(moduleId: string, metrics: Record<string, number>): boolean {
    const runtime = this.runtimeInfo.get(moduleId);
    if (!runtime) {
      return false;
    }

    runtime.metrics = { ...runtime.metrics, ...metrics };
    return true;
  }
}

/**
 * Module context enricher
 * Enriches module context with additional metadata
 */
export class ModuleContextEnricher
  implements ContextEnricher<ModuleContextInjection>
{
  readonly id = 'module-enricher';
  readonly priority = 70;

  async enrich(
    context: ModuleContextInjection,
    scope: ContextScope
  ): Promise<ModuleContextInjection> {
    if (scope.type !== ContextScopeType.Module) {
      return context;
    }

    // Add enrichment metadata
    const enriched = {
      ...context,
      enrichedAt: new Date(),
      enrichedBy: this.id,
      scopeMetadata: {
        agentId: scope.agentId,
        correlationId: scope.correlationId,
        ...scope.metadata,
      },
    };

    // Add performance tracking if runtime info exists
    if (context.runtime) {
      enriched.performance = {
        uptime: Date.now() - context.runtime.startTime.getTime(),
        lastActivity: new Date(),
        metricsSnapshot: { ...context.runtime.metrics },
      };
    }

    return enriched;
  }

  shouldEnrich(scope: ContextScope): boolean {
    return scope.type === ContextScopeType.Module;
  }
}

/**
 * Module context validation middleware
 * Validates and sanitizes module context data
 */
export class ModuleContextValidator
  implements ContextMiddleware<ModuleContextInjection>
{
  readonly id = 'module-validator';
  readonly priority = 100;

  async transform(
    context: ModuleContextInjection,
    scope: ContextScope,
    next: (context: ModuleContextInjection) => Promise<ModuleContextInjection>
  ): Promise<ModuleContextInjection> {
    // Validate required fields
    if (!context.moduleId) {
      throw new Error('Module context must include moduleId');
    }

    // Sanitize configuration
    if (context.config && typeof context.config === 'object') {
      context.config = this.sanitizeConfig(context.config);
    }

    // Validate runtime status
    if (context.runtime) {
      const validStatuses = ['initializing', 'running', 'stopping', 'stopped'];
      if (!validStatuses.includes(context.runtime.status)) {
        runtimeLogger.warn('Invalid module status, defaulting to stopped', {
          moduleId: context.moduleId,
          status: context.runtime.status,
        });
        context.runtime.status = 'stopped';
      }
    }

    return next(context);
  }

  shouldProcess(scope: ContextScope): boolean {
    return scope.type === ContextScopeType.Module;
  }

  /**
   * Sanitize configuration object
   */
  private sanitizeConfig(config: unknown): unknown {
    if (typeof config !== 'object' || config === null) {
      return config;
    }

    const sanitized = { ...(config as Record<string, unknown>) };

    // Remove sensitive fields
    const sensitiveFields = ['password', 'secret', 'key', 'token'];
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}

/**
 * Module injection helper functions
 */
export class ModuleInjectionHelper {
  /**
   * Create context scope for a module
   */
  static createModuleScope(
    moduleId: ModuleId,
    agentId?: string,
    correlationId?: string
  ): ContextScope {
    return {
      type: ContextScopeType.Module,
      target: moduleId,
      agentId,
      correlationId,
      metadata: {
        moduleType: this.getModuleType(moduleId),
        createdAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Create module context injection configuration
   */
  static createModuleContext(
    moduleId: ModuleId,
    config?: unknown,
    dependencies?: Record<string, unknown>
  ): ModuleContextInjection {
    return {
      moduleId,
      config: config || {},
      runtime: {
        startTime: new Date(),
        status: 'initializing',
        metrics: {},
      },
      dependencies: dependencies || {},
    };
  }

  /**
   * Inject context into a cognition module
   */
  static async injectCognitionContext(
    module: CognitionModule,
    context: ModuleContextInjection,
    agent?: Agent
  ): Promise<CognitionModule & { context: ModuleContextInjection }> {
    const contextualModule = module as CognitionModule & {
      context: ModuleContextInjection;
      updateContext?: (
        updates: Partial<ModuleContextInjection>
      ) => Promise<OperationResult>;
    };

    contextualModule.context = context;

    // Add context update method
    contextualModule.updateContext = async (
      updates: Partial<ModuleContextInjection>
    ) => {
      try {
        contextualModule.context = { ...contextualModule.context, ...updates };
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    };

    return contextualModule;
  }

  /**
   * Inject context into an emotion module
   */
  static async injectEmotionContext(
    module: EmotionModule,
    context: ModuleContextInjection,
    agent?: Agent
  ): Promise<EmotionModule & { context: ModuleContextInjection }> {
    const contextualModule = module as EmotionModule & {
      context: ModuleContextInjection;
      updateContext?: (
        updates: Partial<ModuleContextInjection>
      ) => Promise<OperationResult>;
    };

    contextualModule.context = context;

    // Add context update method
    contextualModule.updateContext = async (
      updates: Partial<ModuleContextInjection>
    ) => {
      try {
        contextualModule.context = { ...contextualModule.context, ...updates };
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    };

    return contextualModule;
  }

  /**
   * Inject context into a memory provider
   */
  static async injectMemoryContext(
    provider: MemoryProvider,
    context: ModuleContextInjection,
    agent?: Agent
  ): Promise<MemoryProvider & { context: ModuleContextInjection }> {
    const contextualProvider = provider as MemoryProvider & {
      context: ModuleContextInjection;
      updateContext?: (
        updates: Partial<ModuleContextInjection>
      ) => Promise<OperationResult>;
    };

    contextualProvider.context = context;

    // Add context update method
    contextualProvider.updateContext = async (
      updates: Partial<ModuleContextInjection>
    ) => {
      try {
        contextualProvider.context = {
          ...contextualProvider.context,
          ...updates,
        };
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    };

    return contextualProvider;
  }

  /**
   * Get module type from module ID
   */
  private static getModuleType(moduleId: ModuleId): string {
    // Extract module type from ID (e.g., 'cognition-htn-planner' -> 'cognition')
    const parts = moduleId.split('-');
    return parts[0] || 'unknown';
  }
}

/**
 * Export all module injection patterns
 */
export const moduleInjectionPatterns = {
  providers: {
    config: ModuleConfigProvider,
    dependencies: ModuleDependenciesProvider,
    runtime: ModuleRuntimeProvider,
  },
  enrichers: {
    context: ModuleContextEnricher,
  },
  middleware: {
    validator: ModuleContextValidator,
  },
  helpers: ModuleInjectionHelper,
};
