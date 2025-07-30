/**
 * Service Context Injection Patterns for SYMindX
 *
 * Provides dependency injection patterns specifically for services,
 * including automatic configuration injection, health monitoring,
 * and dependency management.
 */

import type {
  ContextProvider,
  ContextMiddleware,
  ContextEnricher,
  ContextScope,
  ContextScopeType,
  ServiceContextInjection,
} from '../../../types/context/context-injection';
import type {
  OperationResult,
  HealthCheckResult,
  ComponentHealth,
} from '../../../types/helpers';
import { runtimeLogger } from '../../../utils/logger';

/**
 * Service configuration context provider
 * Provides service-specific configuration data
 */
export class ServiceConfigProvider implements ContextProvider<unknown> {
  readonly id = 'service-config';
  readonly priority = 90;
  readonly supportsAsync = false;

  private readonly configRegistry = new Map<string, unknown>();

  provide(scope: ContextScope): unknown | undefined {
    if (scope.type !== ContextScopeType.Service) {
      return undefined;
    }

    return this.configRegistry.get(scope.target);
  }

  canProvide(scope: ContextScope): boolean {
    return (
      scope.type === ContextScopeType.Service &&
      this.configRegistry.has(scope.target)
    );
  }

  /**
   * Register configuration for a service
   */
  registerConfig(serviceId: string, config: unknown): void {
    this.configRegistry.set(serviceId, config);
    runtimeLogger.debug('Service configuration registered', { serviceId });
  }

  /**
   * Update service configuration
   */
  updateConfig(serviceId: string, updates: Record<string, unknown>): boolean {
    const config = this.configRegistry.get(serviceId);
    if (!config || typeof config !== 'object') {
      return false;
    }

    Object.assign(config, updates);
    runtimeLogger.debug('Service configuration updated', {
      serviceId,
      updates: Object.keys(updates),
    });
    return true;
  }

  /**
   * Unregister configuration for a service
   */
  unregisterConfig(serviceId: string): void {
    this.configRegistry.delete(serviceId);
    runtimeLogger.debug('Service configuration unregistered', { serviceId });
  }
}

/**
 * Service health context provider
 * Provides service health status and metrics
 */
export class ServiceHealthProvider
  implements ContextProvider<ServiceContextInjection['health']>
{
  readonly id = 'service-health';
  readonly priority = 85;
  readonly supportsAsync = true;

  private readonly healthRegistry = new Map<
    string,
    ServiceContextInjection['health']
  >();
  private readonly healthCheckers = new Map<
    string,
    () => Promise<HealthCheckResult>
  >();

  provide(scope: ContextScope): ServiceContextInjection['health'] | undefined {
    if (scope.type !== ContextScopeType.Service) {
      return undefined;
    }

    return this.healthRegistry.get(scope.target);
  }

  async provideAsync(
    scope: ContextScope
  ): Promise<ServiceContextInjection['health'] | undefined> {
    if (scope.type !== ContextScopeType.Service) {
      return undefined;
    }

    const serviceId = scope.target;
    const healthChecker = this.healthCheckers.get(serviceId);

    if (healthChecker) {
      try {
        const healthResult = await healthChecker();
        const health: ServiceContextInjection['health'] = {
          status: healthResult.healthy ? 'healthy' : 'unhealthy',
          lastCheck: new Date(),
          metrics: healthResult.metrics || {},
        };

        this.healthRegistry.set(serviceId, health);
        return health;
      } catch (error) {
        const health: ServiceContextInjection['health'] = {
          status: 'unhealthy',
          lastCheck: new Date(),
          metrics: { error: 1 },
        };

        this.healthRegistry.set(serviceId, health);
        return health;
      }
    }

    return this.healthRegistry.get(serviceId);
  }

  canProvide(scope: ContextScope): boolean {
    return scope.type === ContextScopeType.Service;
  }

  /**
   * Register health checker for a service
   */
  registerHealthChecker(
    serviceId: string,
    checker: () => Promise<HealthCheckResult>
  ): void {
    this.healthCheckers.set(serviceId, checker);
    runtimeLogger.debug('Service health checker registered', { serviceId });
  }

  /**
   * Update service health status manually
   */
  updateHealth(
    serviceId: string,
    health: ServiceContextInjection['health']
  ): void {
    this.healthRegistry.set(serviceId, { ...health });
    runtimeLogger.debug('Service health updated', {
      serviceId,
      status: health.status,
    });
  }

  /**
   * Update service metrics
   */
  updateMetrics(serviceId: string, metrics: Record<string, number>): boolean {
    const health = this.healthRegistry.get(serviceId);
    if (!health) {
      return false;
    }

    health.metrics = { ...health.metrics, ...metrics };
    health.lastCheck = new Date();

    runtimeLogger.debug('Service metrics updated', {
      serviceId,
      metrics: Object.keys(metrics),
    });
    return true;
  }

  /**
   * Mark service as degraded
   */
  markDegraded(serviceId: string, reason?: string): boolean {
    const health = this.healthRegistry.get(serviceId);
    if (!health) {
      return false;
    }

    health.status = 'degraded';
    health.lastCheck = new Date();
    if (reason) {
      health.metrics.degradation_reason = reason;
    }

    runtimeLogger.warn('Service marked as degraded', { serviceId, reason });
    return true;
  }

  /**
   * Mark service as unhealthy
   */
  markUnhealthy(serviceId: string, reason?: string): boolean {
    const health = this.healthRegistry.get(serviceId);
    if (!health) {
      return false;
    }

    health.status = 'unhealthy';
    health.lastCheck = new Date();
    if (reason) {
      health.metrics.failure_reason = reason;
    }

    runtimeLogger.error('Service marked as unhealthy', { serviceId, reason });
    return true;
  }
}

/**
 * Service dependencies context provider
 * Provides service dependency information
 */
export class ServiceDependenciesProvider implements ContextProvider<string[]> {
  readonly id = 'service-dependencies';
  readonly priority = 80;
  readonly supportsAsync = true;

  private readonly dependencyRegistry = new Map<string, string[]>();
  private readonly dependencyResolvers = new Map<
    string,
    () => Promise<string[]>
  >();

  provide(scope: ContextScope): string[] | undefined {
    if (scope.type !== ContextScopeType.Service) {
      return undefined;
    }

    return this.dependencyRegistry.get(scope.target);
  }

  async provideAsync(scope: ContextScope): Promise<string[] | undefined> {
    if (scope.type !== ContextScopeType.Service) {
      return undefined;
    }

    const serviceId = scope.target;
    let dependencies = this.dependencyRegistry.get(serviceId);

    if (!dependencies) {
      const resolver = this.dependencyResolvers.get(serviceId);
      if (resolver) {
        try {
          dependencies = await resolver();
          this.dependencyRegistry.set(serviceId, dependencies);
        } catch (error) {
          runtimeLogger.warn('Failed to resolve service dependencies', {
            serviceId,
            error,
          });
        }
      }
    }

    return dependencies;
  }

  canProvide(scope: ContextScope): boolean {
    return scope.type === ContextScopeType.Service;
  }

  /**
   * Register static dependencies for a service
   */
  registerDependencies(serviceId: string, dependencies: string[]): void {
    this.dependencyRegistry.set(serviceId, [...dependencies]);
    runtimeLogger.debug('Service dependencies registered', {
      serviceId,
      dependencies,
    });
  }

  /**
   * Register dynamic dependency resolver
   */
  registerDependencyResolver(
    serviceId: string,
    resolver: () => Promise<string[]>
  ): void {
    this.dependencyResolvers.set(serviceId, resolver);
    runtimeLogger.debug('Service dependency resolver registered', {
      serviceId,
    });
  }

  /**
   * Add dependency to a service
   */
  addDependency(serviceId: string, dependency: string): boolean {
    const dependencies = this.dependencyRegistry.get(serviceId);
    if (!dependencies) {
      return false;
    }

    if (!dependencies.includes(dependency)) {
      dependencies.push(dependency);
      runtimeLogger.debug('Service dependency added', {
        serviceId,
        dependency,
      });
    }

    return true;
  }

  /**
   * Remove dependency from a service
   */
  removeDependency(serviceId: string, dependency: string): boolean {
    const dependencies = this.dependencyRegistry.get(serviceId);
    if (!dependencies) {
      return false;
    }

    const index = dependencies.indexOf(dependency);
    if (index > -1) {
      dependencies.splice(index, 1);
      runtimeLogger.debug('Service dependency removed', {
        serviceId,
        dependency,
      });
      return true;
    }

    return false;
  }
}

/**
 * Service context enricher
 * Enriches service context with additional metadata
 */
export class ServiceContextEnricher
  implements ContextEnricher<ServiceContextInjection>
{
  readonly id = 'service-enricher';
  readonly priority = 70;

  async enrich(
    context: ServiceContextInjection,
    scope: ContextScope
  ): Promise<ServiceContextInjection> {
    if (scope.type !== ContextScopeType.Service) {
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

    // Add health analysis
    if (context.health) {
      enriched.healthAnalysis = {
        uptime: this.calculateUptime(context.health.lastCheck),
        status: context.health.status,
        metricsCount: Object.keys(context.health.metrics).length,
        lastHealthyCheck: this.findLastHealthyCheck(context.health),
        healthTrend: this.analyzeHealthTrend(context.health),
      };
    }

    // Add dependency analysis
    if (context.dependencies && context.dependencies.length > 0) {
      enriched.dependencyAnalysis = {
        totalDependencies: context.dependencies.length,
        criticalDependencies: this.identifyCriticalDependencies(
          context.dependencies
        ),
        dependencyTypes: this.categorizedDependencies(context.dependencies),
        circularDependencies: await this.detectCircularDependencies(
          context.serviceId,
          context.dependencies
        ),
      };
    }

    // Add service maturity indicators
    enriched.maturityIndicators = {
      hasHealthChecks: !!context.health,
      hasDependencies: !!(
        context.dependencies && context.dependencies.length > 0
      ),
      hasMetrics: !!(
        context.health?.metrics &&
        Object.keys(context.health.metrics).length > 0
      ),
      configurationComplexity: this.assessConfigurationComplexity(
        context.config
      ),
    };

    return enriched;
  }

  shouldEnrich(scope: ContextScope): boolean {
    return scope.type === ContextScopeType.Service;
  }

  /**
   * Calculate service uptime
   */
  private calculateUptime(lastCheck: Date): number {
    // Simplified uptime calculation - in practice, track service start time
    return Date.now() - lastCheck.getTime();
  }

  /**
   * Find last healthy check (placeholder)
   */
  private findLastHealthyCheck(
    health: ServiceContextInjection['health']
  ): Date {
    // In practice, track health check history
    return health.status === 'healthy' ? health.lastCheck : new Date(0);
  }

  /**
   * Analyze health trend (placeholder)
   */
  private analyzeHealthTrend(
    health: ServiceContextInjection['health']
  ): 'improving' | 'stable' | 'degrading' {
    // In practice, analyze health check history
    return health.status === 'healthy' ? 'stable' : 'degrading';
  }

  /**
   * Identify critical dependencies
   */
  private identifyCriticalDependencies(dependencies: string[]): string[] {
    // Simplified - identify database, authentication, and core services
    return dependencies.filter(
      (dep) =>
        dep.includes('database') ||
        dep.includes('auth') ||
        dep.includes('core') ||
        dep.includes('critical')
    );
  }

  /**
   * Categorize dependencies by type
   */
  private categorizedDependencies(
    dependencies: string[]
  ): Record<string, string[]> {
    const categories: Record<string, string[]> = {
      database: [],
      external: [],
      internal: [],
      infrastructure: [],
    };

    for (const dep of dependencies) {
      const lower = dep.toLowerCase();

      if (
        lower.includes('database') ||
        lower.includes('db') ||
        lower.includes('storage')
      ) {
        categories.database.push(dep);
      } else if (
        lower.includes('api') ||
        (lower.includes('service') && !lower.includes('internal'))
      ) {
        categories.external.push(dep);
      } else if (lower.includes('internal') || lower.includes('local')) {
        categories.internal.push(dep);
      } else if (
        lower.includes('redis') ||
        lower.includes('queue') ||
        lower.includes('cache')
      ) {
        categories.infrastructure.push(dep);
      }
    }

    return categories;
  }

  /**
   * Detect circular dependencies (simplified)
   */
  private async detectCircularDependencies(
    serviceId: string,
    dependencies: string[]
  ): Promise<string[]> {
    // Simplified circular dependency detection
    // In practice, implement proper graph traversal
    const circular: string[] = [];

    for (const dep of dependencies) {
      if (dep === serviceId) {
        circular.push(dep);
      }
    }

    return circular;
  }

  /**
   * Assess configuration complexity
   */
  private assessConfigurationComplexity(
    config: unknown
  ): 'low' | 'medium' | 'high' {
    if (!config || typeof config !== 'object') {
      return 'low';
    }

    const configStr = JSON.stringify(config);
    const configSize = configStr.length;
    const nestingLevel = this.calculateNestingLevel(config);

    if (configSize > 10000 || nestingLevel > 5) {
      return 'high';
    } else if (configSize > 1000 || nestingLevel > 3) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Calculate object nesting level
   */
  private calculateNestingLevel(obj: unknown, level = 0): number {
    if (typeof obj !== 'object' || obj === null) {
      return level;
    }

    let maxLevel = level;
    for (const value of Object.values(obj)) {
      if (typeof value === 'object' && value !== null) {
        maxLevel = Math.max(
          maxLevel,
          this.calculateNestingLevel(value, level + 1)
        );
      }
    }

    return maxLevel;
  }
}

/**
 * Service context validation middleware
 * Validates and sanitizes service context data
 */
export class ServiceContextValidator
  implements ContextMiddleware<ServiceContextInjection>
{
  readonly id = 'service-validator';
  readonly priority = 100;

  async transform(
    context: ServiceContextInjection,
    scope: ContextScope,
    next: (context: ServiceContextInjection) => Promise<ServiceContextInjection>
  ): Promise<ServiceContextInjection> {
    // Validate required fields
    if (!context.serviceId) {
      throw new Error('Service context must include serviceId');
    }

    // Sanitize configuration
    if (context.config && typeof context.config === 'object') {
      context.config = this.sanitizeConfig(context.config);
    }

    // Validate health status
    if (context.health) {
      context.health = this.validateHealth(context.health);
    }

    // Validate dependencies
    if (context.dependencies) {
      context.dependencies = this.validateDependencies(context.dependencies);
    }

    return next(context);
  }

  shouldProcess(scope: ContextScope): boolean {
    return scope.type === ContextScopeType.Service;
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
    const sensitiveFields = [
      'password',
      'secret',
      'key',
      'token',
      'apiKey',
      'clientSecret',
      'privateKey',
      'connectionString',
    ];

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Validate health information
   */
  private validateHealth(
    health: ServiceContextInjection['health']
  ): ServiceContextInjection['health'] {
    const validated = { ...health };

    // Validate status
    const validStatuses = ['healthy', 'degraded', 'unhealthy'];
    if (!validStatuses.includes(validated.status)) {
      runtimeLogger.warn(
        'Invalid service health status, defaulting to unhealthy',
        {
          status: validated.status,
        }
      );
      validated.status = 'unhealthy';
    }

    // Validate lastCheck is not in the future
    if (validated.lastCheck > new Date()) {
      validated.lastCheck = new Date();
    }

    // Ensure metrics is an object
    if (!validated.metrics || typeof validated.metrics !== 'object') {
      validated.metrics = {};
    }

    return validated;
  }

  /**
   * Validate dependencies array
   */
  private validateDependencies(dependencies: string[]): string[] {
    return dependencies
      .filter((dep) => typeof dep === 'string' && dep.trim().length > 0)
      .map((dep) => dep.trim())
      .filter((dep, index, arr) => arr.indexOf(dep) === index); // Remove duplicates
  }
}

/**
 * Service injection helper functions
 */
export class ServiceInjectionHelper {
  /**
   * Create context scope for a service
   */
  static createServiceScope(
    serviceId: string,
    agentId?: string,
    correlationId?: string
  ): ContextScope {
    return {
      type: ContextScopeType.Service,
      target: serviceId,
      agentId,
      correlationId,
      metadata: {
        serviceType: this.getServiceType(serviceId),
        createdAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Create service context injection configuration
   */
  static createServiceContext(
    serviceId: string,
    config?: unknown,
    dependencies?: string[]
  ): ServiceContextInjection {
    return {
      serviceId,
      config: config || {},
      health: {
        status: 'healthy',
        lastCheck: new Date(),
        metrics: {},
      },
      dependencies: dependencies || [],
    };
  }

  /**
   * Create service health monitor
   */
  static createServiceHealthMonitor(serviceId: string) {
    return {
      /**
       * Check service health
       */
      async checkHealth(): Promise<ComponentHealth> {
        try {
          // Implementation would perform actual health check
          return {
            component: serviceId,
            healthy: true,
            responseTime: Date.now(),
            details: { status: 'operational' },
          };
        } catch (error) {
          return {
            component: serviceId,
            healthy: false,
            responseTime: Date.now(),
            error:
              error instanceof Error ? error.message : 'Health check failed',
            details: { status: 'failed' },
          };
        }
      },

      /**
       * Record service metric
       */
      recordMetric(name: string, value: number): void {
        // Implementation would use ServiceHealthProvider
        runtimeLogger.debug('Service metric recorded', {
          serviceId,
          name,
          value,
        });
      },

      /**
       * Mark service as degraded
       */
      markDegraded(reason: string): void {
        // Implementation would use ServiceHealthProvider
        runtimeLogger.warn('Service marked as degraded', { serviceId, reason });
      },

      /**
       * Mark service as healthy
       */
      markHealthy(): void {
        // Implementation would use ServiceHealthProvider
        runtimeLogger.info('Service marked as healthy', { serviceId });
      },
    };
  }

  /**
   * Get service type from service ID
   */
  private static getServiceType(serviceId: string): string {
    // Extract service type from ID (e.g., 'api-gateway' -> 'api')
    const parts = serviceId.split('-');
    return parts[0] || 'unknown';
  }
}

/**
 * Export all service injection patterns
 */
export const serviceInjectionPatterns = {
  providers: {
    config: ServiceConfigProvider,
    health: ServiceHealthProvider,
    dependencies: ServiceDependenciesProvider,
  },
  enrichers: {
    context: ServiceContextEnricher,
  },
  middleware: {
    validator: ServiceContextValidator,
  },
  helpers: ServiceInjectionHelper,
};
