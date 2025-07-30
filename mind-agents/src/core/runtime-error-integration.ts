/**
 * @module runtime-error-integration
 * @description Enhanced error handling integration for the SYMindX runtime system
 */

import {
  enhancedErrorHandler,
  registerRuntimeComponent,
  registerExtensionComponent,
  registerMemoryComponent,
  withRuntimeErrorHandling,
  withExtensionErrorHandling,
  withMemoryErrorHandling,
  errorHandler,
  initializeErrorHandler,
} from '../utils/error-handler.js';
import {
  portalErrorHandler,
  registerPortalWithFallback,
  wrapPortalWithErrorHandling,
} from '../portals/portal-error-integration.js';
import {
  createRuntimeError,
  createAgentError,
  createConfigurationError,
  SYMindXError,
  safeAsync,
} from '../utils/standard-errors.js';
import { runtimeLogger } from '../utils/logger.js';
import type { Agent, RuntimeConfig } from '../types/agent.js';
import type { Portal } from '../types/portal.js';

/**
 * Runtime error context
 */
export interface RuntimeErrorContext {
  readonly phase: 'initialization' | 'runtime' | 'shutdown';
  readonly component: string;
  readonly agentId?: string;
  readonly operationId?: string;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Agent error context
 */
export interface AgentErrorContext extends RuntimeErrorContext {
  readonly agentId: string;
  readonly agentName?: string;
  readonly operation: 'think' | 'action' | 'memory' | 'emotion' | 'extension';
}

/**
 * Enhanced runtime error handler integration
 */
export class RuntimeErrorIntegration {
  private static instance: RuntimeErrorIntegration;
  private initialized = false;

  private constructor() {}

  public static getInstance(): RuntimeErrorIntegration {
    if (!RuntimeErrorIntegration.instance) {
      RuntimeErrorIntegration.instance = new RuntimeErrorIntegration();
    }
    return RuntimeErrorIntegration.instance;
  }

  /**
   * Initialize error handling for the runtime system
   */
  public async initialize(config: RuntimeConfig): Promise<void> {
    if (this.initialized) return;

    try {
      // Register core components
      this.registerCoreComponents();

      // Initialize error analytics
      initializeErrorHandler({
        enabled: true,
        retentionDays: 7,
        alertThresholds: {
          errorRate: 0.1,
          criticalErrors: 5,
          circuitBreakerTrips: 3,
        },
        aggregationInterval: 60000,
      });

      // Register portals with fallback strategies
      await this.registerPortals(config);

      // Register memory providers
      this.registerMemoryProviders(config);

      this.initialized = true;

      runtimeLogger.info('Runtime error integration initialized successfully', {
        componentsRegistered: this.getRegisteredComponents(),
      });
    } catch (error) {
      const initError = createRuntimeError(
        'Failed to initialize runtime error integration',
        'RUNTIME_ERROR_INIT_FAILED',
        { config: this.sanitizeConfig(config) },
        error instanceof Error ? error : undefined
      );

      runtimeLogger.error(
        'Runtime error integration initialization failed',
        initError
      );
      throw initError;
    }
  }

  /**
   * Wrap agent with comprehensive error handling
   */
  public wrapAgent(agent: Agent): Agent {
    const self = this;

    return new Proxy(agent, {
      get(target, prop, receiver) {
        const value = Reflect.get(target, prop, receiver);

        if (typeof value === 'function') {
          return async function (this: Agent, ...args: any[]) {
            const context: AgentErrorContext = {
              phase: 'runtime',
              component: 'agent',
              agentId: target.id,
              agentName: target.name,
              operation: self.mapMethodToOperation(prop as string),
              operationId: `${prop as string}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            };

            return await self.handleAgentOperation(
              target.id,
              () => value.apply(this, args),
              context
            );
          };
        }

        return value;
      },
    });
  }

  /**
   * Handle agent operation with error handling
   */
  public async handleAgentOperation<T>(
    agentId: string,
    operation: () => Promise<T>,
    context: AgentErrorContext
  ): Promise<T> {
    const result = await enhancedErrorHandler.handleComponentError(
      'runtime',
      new Error('Agent operation failed'),
      async () => {
        try {
          return await operation();
        } catch (error) {
          throw this.enhanceAgentError(error, context);
        }
      },
      context
    );

    if (!result.success) {
      throw (
        result.error ||
        createAgentError(
          'Agent operation failed',
          'AGENT_OPERATION_FAILED',
          agentId,
          context.operation,
          context
        )
      );
    }

    return result.data!;
  }

  /**
   * Handle runtime configuration errors
   */
  public async handleConfigurationError<T>(
    operation: () => Promise<T>,
    context: RuntimeErrorContext
  ): Promise<T> {
    const { data, error } = await safeAsync(operation, (err) =>
      createConfigurationError(
        `Configuration error in ${context.component}`,
        'CONFIG_OPERATION_FAILED',
        context.component,
        undefined,
        context,
        err
      )
    );

    if (error) {
      runtimeLogger.error('Configuration error occurred', error);
      throw error;
    }

    return data!;
  }

  /**
   * Get runtime error statistics
   */
  public getRuntimeErrorStats() {
    const systemAnalytics = errorHandler.getSystemAnalytics();
    const componentMetrics = enhancedErrorHandler.getAllComponentMetrics();
    const portalHealth = portalErrorHandler.getAllPortalHealth();

    return {
      overall: systemAnalytics.overall,
      components: {
        runtime: componentMetrics.runtime,
        agents: Object.entries(componentMetrics)
          .filter(([name]) => name.startsWith('agent:'))
          .reduce(
            (acc, [name, metrics]) => {
              acc[name.replace('agent:', '')] = metrics;
              return acc;
            },
            {} as Record<string, any>
          ),
        extensions: Object.entries(componentMetrics)
          .filter(([name]) => name.startsWith('extension:'))
          .reduce(
            (acc, [name, metrics]) => {
              acc[name.replace('extension:', '')] = metrics;
              return acc;
            },
            {} as Record<string, any>
          ),
        memory: Object.entries(componentMetrics)
          .filter(([name]) => name.startsWith('memory:'))
          .reduce(
            (acc, [name, metrics]) => {
              acc[name.replace('memory:', '')] = metrics;
              return acc;
            },
            {} as Record<string, any>
          ),
        portals: portalHealth,
      },
      alerts: systemAnalytics.alerts,
      trends: systemAnalytics.trends.slice(-12), // Last 12 hours
      recommendations: this.generateRuntimeRecommendations(systemAnalytics),
    };
  }

  /**
   * Generate health report for the runtime
   */
  public generateHealthReport(): {
    status: 'healthy' | 'degraded' | 'critical';
    issues: string[];
    recommendations: string[];
    components: Record<string, { status: string; issues: string[] }>;
  } {
    const stats = this.getRuntimeErrorStats();
    const issues: string[] = [];
    const recommendations: string[] = [];
    const components: Record<string, { status: string; issues: string[] }> = {};

    // Overall system health
    let overallStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';

    if (stats.overall.errorRate > 0.2) {
      overallStatus = 'critical';
      issues.push(
        `High system error rate: ${(stats.overall.errorRate * 100).toFixed(1)}%`
      );
      recommendations.push('Investigate root causes of high error rate');
    } else if (stats.overall.errorRate > 0.1) {
      overallStatus = 'degraded';
      issues.push(
        `Elevated error rate: ${(stats.overall.errorRate * 100).toFixed(1)}%`
      );
      recommendations.push(
        'Monitor error trends and optimize failure-prone components'
      );
    }

    // Check critical alerts
    const criticalAlerts = stats.alerts.filter(
      (alert) => alert.severity === 'critical'
    );
    if (criticalAlerts.length > 0) {
      overallStatus = 'critical';
      issues.push(`${criticalAlerts.length} critical alerts active`);
      recommendations.push('Address critical alerts immediately');
    }

    // Component health analysis
    Object.entries(stats.components.portals).forEach(([portalName, health]) => {
      const componentIssues: string[] = [];
      let componentStatus = 'healthy';

      if (!health.isHealthy) {
        componentStatus = 'critical';
        componentIssues.push('Portal marked as unhealthy');
      } else if (health.errorRate > 0.2) {
        componentStatus = 'degraded';
        componentIssues.push(
          `High error rate: ${(health.errorRate * 100).toFixed(1)}%`
        );
      }

      components[`portal:${portalName}`] = {
        status: componentStatus,
        issues: componentIssues,
      };
    });

    return {
      status: overallStatus,
      issues,
      recommendations,
      components,
    };
  }

  /**
   * Export error handling configuration
   */
  public exportConfiguration(): {
    components: string[];
    portals: string[];
    memoryProviders: string[];
    analytics: {
      enabled: boolean;
      retentionDays: number;
      alertThresholds: any;
    };
  } {
    return {
      components: this.getRegisteredComponents(),
      portals: Object.keys(portalErrorHandler.getAllPortalHealth()),
      memoryProviders: this.getRegisteredMemoryProviders(),
      analytics: {
        enabled: true,
        retentionDays: 7,
        alertThresholds: {
          errorRate: 0.1,
          criticalErrors: 5,
          circuitBreakerTrips: 3,
        },
      },
    };
  }

  /**
   * Register core runtime components
   */
  private registerCoreComponents(): void {
    registerRuntimeComponent();

    // Register common extension types
    const commonExtensions = [
      'api',
      'telegram',
      'slack',
      'runelite',
      'mcp-server',
    ];
    commonExtensions.forEach((ext) => registerExtensionComponent(ext));

    runtimeLogger.info('Core components registered for error handling');
  }

  /**
   * Register portals with fallback strategies
   */
  private async registerPortals(config: RuntimeConfig): Promise<void> {
    const portalConfigs = config.portals || {};

    // Define fallback chains for common portals
    const fallbackStrategies: Record<string, string[]> = {
      openai: ['anthropic', 'groq'],
      anthropic: ['openai', 'groq'],
      groq: ['openai', 'anthropic'],
      mistral: ['openai', 'anthropic'],
      cohere: ['openai', 'anthropic'],
      'google-generative': ['openai', 'anthropic'],
      'azure-openai': ['openai', 'anthropic'],
    };

    for (const [portalName, portalConfig] of Object.entries(portalConfigs)) {
      if (portalConfig.enabled !== false) {
        const fallbackPortals = fallbackStrategies[portalName] || [];
        registerPortalWithFallback(portalName, fallbackPortals);
      }
    }

    runtimeLogger.info('Portals registered with fallback strategies', {
      registeredPortals: Object.keys(portalConfigs).length,
    });
  }

  /**
   * Register memory providers
   */
  private registerMemoryProviders(config: RuntimeConfig): void {
    const memoryTypes = ['sqlite', 'postgres', 'supabase', 'neon', 'memory'];
    memoryTypes.forEach((type) => registerMemoryComponent(type));

    runtimeLogger.info('Memory providers registered for error handling');
  }

  /**
   * Enhance agent error with additional context
   */
  private enhanceAgentError(
    error: unknown,
    context: AgentErrorContext
  ): SYMindXError {
    if (error instanceof SYMindXError) {
      return error;
    }

    const message = error instanceof Error ? error.message : String(error);
    const cause = error instanceof Error ? error : undefined;

    return createAgentError(
      `Agent ${context.operation} failed: ${message}`,
      'AGENT_OPERATION_ERROR',
      context.agentId,
      context.operation,
      {
        ...context,
        errorSource: 'agent_operation',
      },
      cause
    );
  }

  /**
   * Map method names to operation types
   */
  private mapMethodToOperation(
    methodName: string
  ): AgentErrorContext['operation'] {
    if (methodName.includes('think') || methodName.includes('cognition'))
      return 'think';
    if (methodName.includes('action') || methodName.includes('execute'))
      return 'action';
    if (methodName.includes('memory') || methodName.includes('remember'))
      return 'memory';
    if (methodName.includes('emotion') || methodName.includes('feel'))
      return 'emotion';
    if (methodName.includes('extension') || methodName.includes('plugin'))
      return 'extension';
    return 'action';
  }

  /**
   * Generate runtime-specific recommendations
   */
  private generateRuntimeRecommendations(analytics: any): string[] {
    const recommendations: string[] = [];

    if (analytics.overall.errorRate > 0.15) {
      recommendations.push(
        'Consider implementing additional error recovery mechanisms'
      );
    }

    if (analytics.overall.avgResponseTime > 5000) {
      recommendations.push(
        'Optimize runtime performance - high response times detected'
      );
    }

    const criticalErrors = analytics.topErrors.filter(
      (e: any) => e.impact === 'critical'
    );
    if (criticalErrors.length > 0) {
      recommendations.push(
        'Address critical errors immediately to prevent system instability'
      );
    }

    return recommendations;
  }

  /**
   * Get registered components list
   */
  private getRegisteredComponents(): string[] {
    return ['runtime', 'api', 'telegram', 'slack', 'runelite', 'mcp-server'];
  }

  /**
   * Get registered memory providers
   */
  private getRegisteredMemoryProviders(): string[] {
    return ['sqlite', 'postgres', 'supabase', 'neon', 'memory'];
  }

  /**
   * Sanitize config for logging (remove sensitive data)
   */
  private sanitizeConfig(config: RuntimeConfig): any {
    const sanitized = { ...config };

    // Remove API keys and sensitive data
    if (sanitized.portals) {
      Object.values(sanitized.portals).forEach((portal: any) => {
        if (portal.apiKey) portal.apiKey = '[REDACTED]';
        if (portal.config?.apiKey) portal.config.apiKey = '[REDACTED]';
      });
    }

    return sanitized;
  }
}

/**
 * Global runtime error integration instance
 */
export const runtimeErrorIntegration = RuntimeErrorIntegration.getInstance();

/**
 * Convenience functions for runtime integration
 */
export const initializeRuntimeErrorHandling = async (
  config: RuntimeConfig
): Promise<void> => {
  await runtimeErrorIntegration.initialize(config);
};

export const wrapAgentWithErrorHandling = (agent: Agent): Agent => {
  return runtimeErrorIntegration.wrapAgent(agent);
};

export const getRuntimeHealthReport = () => {
  return runtimeErrorIntegration.generateHealthReport();
};

export const getRuntimeErrorStatistics = () => {
  return runtimeErrorIntegration.getRuntimeErrorStats();
};
