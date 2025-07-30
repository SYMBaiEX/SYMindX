/**
 * Portal Context Injection Patterns for SYMindX
 *
 * Provides dependency injection patterns specifically for portals,
 * including automatic configuration injection, model management,
 * and token usage tracking.
 */

import type {
  ContextProvider,
  ContextMiddleware,
  ContextEnricher,
  ContextScope,
  ContextScopeType,
  PortalContextInjection,
} from '../../../types/context/context-injection';
import type { OperationResult } from '../../../types/helpers';
import type { Portal, PortalConfig } from '../../../types/portal';
import { runtimeLogger } from '../../../utils/logger';

/**
 * Portal configuration context provider
 * Provides portal-specific configuration data
 */
export class PortalConfigProvider implements ContextProvider<unknown> {
  readonly id = 'portal-config';
  readonly priority = 90;
  readonly supportsAsync = false;

  private readonly configRegistry = new Map<string, unknown>();

  provide(scope: ContextScope): unknown | undefined {
    if (scope.type !== ContextScopeType.Portal) {
      return undefined;
    }

    return this.configRegistry.get(scope.target);
  }

  canProvide(scope: ContextScope): boolean {
    return (
      scope.type === ContextScopeType.Portal &&
      this.configRegistry.has(scope.target)
    );
  }

  /**
   * Register configuration for a portal
   */
  registerConfig(portalId: string, config: unknown): void {
    this.configRegistry.set(portalId, config);
    runtimeLogger.debug('Portal configuration registered', { portalId });
  }

  /**
   * Update portal configuration
   */
  updateConfig(portalId: string, updates: Partial<PortalConfig>): boolean {
    const config = this.configRegistry.get(portalId);
    if (!config || typeof config !== 'object') {
      return false;
    }

    Object.assign(config, updates);
    runtimeLogger.debug('Portal configuration updated', {
      portalId,
      updates: Object.keys(updates),
    });
    return true;
  }

  /**
   * Unregister configuration for a portal
   */
  unregisterConfig(portalId: string): void {
    this.configRegistry.delete(portalId);
    runtimeLogger.debug('Portal configuration unregistered', { portalId });
  }
}

/**
 * Portal model context provider
 * Provides current model settings and capabilities
 */
export class PortalModelProvider
  implements ContextProvider<PortalContextInjection['model']>
{
  readonly id = 'portal-model';
  readonly priority = 85;
  readonly supportsAsync = false;

  private readonly modelRegistry = new Map<
    string,
    PortalContextInjection['model']
  >();

  provide(scope: ContextScope): PortalContextInjection['model'] | undefined {
    if (scope.type !== ContextScopeType.Portal) {
      return undefined;
    }

    return this.modelRegistry.get(scope.target);
  }

  canProvide(scope: ContextScope): boolean {
    return (
      scope.type === ContextScopeType.Portal &&
      this.modelRegistry.has(scope.target)
    );
  }

  /**
   * Register model information for a portal
   */
  registerModel(
    portalId: string,
    model: PortalContextInjection['model']
  ): void {
    this.modelRegistry.set(portalId, { ...model });
    runtimeLogger.debug('Portal model registered', {
      portalId,
      modelName: model.name,
      provider: model.provider,
    });
  }

  /**
   * Update model parameters
   */
  updateModelParameters(
    portalId: string,
    parameters: Record<string, unknown>
  ): boolean {
    const model = this.modelRegistry.get(portalId);
    if (!model) {
      return false;
    }

    model.parameters = { ...model.parameters, ...parameters };
    runtimeLogger.debug('Portal model parameters updated', {
      portalId,
      parameters: Object.keys(parameters),
    });
    return true;
  }

  /**
   * Switch model for a portal
   */
  switchModel(
    portalId: string,
    modelName: string,
    parameters?: Record<string, unknown>
  ): boolean {
    const model = this.modelRegistry.get(portalId);
    if (!model) {
      return false;
    }

    model.name = modelName;
    if (parameters) {
      model.parameters = { ...model.parameters, ...parameters };
    }

    runtimeLogger.debug('Portal model switched', { portalId, modelName });
    return true;
  }
}

/**
 * Portal token usage context provider
 * Tracks and provides token usage information
 */
export class PortalTokenUsageProvider
  implements ContextProvider<PortalContextInjection['tokenUsage']>
{
  readonly id = 'portal-token-usage';
  readonly priority = 80;
  readonly supportsAsync = false;

  private readonly usageRegistry = new Map<
    string,
    PortalContextInjection['tokenUsage']
  >();

  provide(
    scope: ContextScope
  ): PortalContextInjection['tokenUsage'] | undefined {
    if (scope.type !== ContextScopeType.Portal) {
      return undefined;
    }

    return this.usageRegistry.get(scope.target);
  }

  canProvide(scope: ContextScope): boolean {
    return scope.type === ContextScopeType.Portal;
  }

  /**
   * Initialize token usage tracking for a portal
   */
  initializeUsage(portalId: string): void {
    this.usageRegistry.set(portalId, {
      input: 0,
      output: 0,
      total: 0,
    });
    runtimeLogger.debug('Portal token usage initialized', { portalId });
  }

  /**
   * Record token usage
   */
  recordUsage(
    portalId: string,
    inputTokens: number,
    outputTokens: number
  ): boolean {
    let usage = this.usageRegistry.get(portalId);
    if (!usage) {
      // Initialize if not exists
      usage = { input: 0, output: 0, total: 0 };
      this.usageRegistry.set(portalId, usage);
    }

    usage.input += inputTokens;
    usage.output += outputTokens;
    usage.total = usage.input + usage.output;

    runtimeLogger.debug('Portal token usage recorded', {
      portalId,
      inputTokens,
      outputTokens,
      totalUsage: usage.total,
    });
    return true;
  }

  /**
   * Reset token usage for a portal
   */
  resetUsage(portalId: string): boolean {
    const usage = this.usageRegistry.get(portalId);
    if (!usage) {
      return false;
    }

    usage.input = 0;
    usage.output = 0;
    usage.total = 0;

    runtimeLogger.debug('Portal token usage reset', { portalId });
    return true;
  }

  /**
   * Get usage statistics
   */
  getUsageStatistics(portalId: string):
    | {
        usage: PortalContextInjection['tokenUsage'];
        averageInputPerRequest: number;
        averageOutputPerRequest: number;
        requestCount: number;
      }
    | undefined {
    const usage = this.usageRegistry.get(portalId);
    if (!usage) {
      return undefined;
    }

    // This is a simplified version - in practice, you'd track request counts
    const requestCount = Math.max(1, Math.floor(usage.total / 1000)); // Estimate

    return {
      usage: { ...usage },
      averageInputPerRequest: usage.input / requestCount,
      averageOutputPerRequest: usage.output / requestCount,
      requestCount,
    };
  }
}

/**
 * Portal performance context provider
 * Provides portal performance metrics
 */
export class PortalPerformanceProvider
  implements
    ContextProvider<{
      responseTime: number;
      requestCount: number;
      errorRate: number;
      lastRequest: Date;
    }>
{
  readonly id = 'portal-performance';
  readonly priority = 75;
  readonly supportsAsync = false;

  private readonly performanceRegistry = new Map<
    string,
    {
      responseTime: number;
      requestCount: number;
      errorCount: number;
      errorRate: number;
      lastRequest: Date;
      totalResponseTime: number;
    }
  >();

  provide(scope: ContextScope):
    | {
        responseTime: number;
        requestCount: number;
        errorRate: number;
        lastRequest: Date;
      }
    | undefined {
    if (scope.type !== ContextScopeType.Portal) {
      return undefined;
    }

    const metrics = this.performanceRegistry.get(scope.target);
    if (!metrics) {
      return undefined;
    }

    return {
      responseTime: metrics.responseTime,
      requestCount: metrics.requestCount,
      errorRate: metrics.errorRate,
      lastRequest: metrics.lastRequest,
    };
  }

  canProvide(scope: ContextScope): boolean {
    return scope.type === ContextScopeType.Portal;
  }

  /**
   * Initialize performance tracking for a portal
   */
  initializePerformance(portalId: string): void {
    this.performanceRegistry.set(portalId, {
      responseTime: 0,
      requestCount: 0,
      errorCount: 0,
      errorRate: 0,
      lastRequest: new Date(),
      totalResponseTime: 0,
    });
    runtimeLogger.debug('Portal performance tracking initialized', {
      portalId,
    });
  }

  /**
   * Record successful request
   */
  recordRequest(portalId: string, responseTime: number): boolean {
    let metrics = this.performanceRegistry.get(portalId);
    if (!metrics) {
      // Initialize if not exists
      metrics = {
        responseTime: 0,
        requestCount: 0,
        errorCount: 0,
        errorRate: 0,
        lastRequest: new Date(),
        totalResponseTime: 0,
      };
      this.performanceRegistry.set(portalId, metrics);
    }

    metrics.requestCount++;
    metrics.totalResponseTime += responseTime;
    metrics.responseTime = metrics.totalResponseTime / metrics.requestCount;
    metrics.errorRate = metrics.errorCount / metrics.requestCount;
    metrics.lastRequest = new Date();

    return true;
  }

  /**
   * Record error
   */
  recordError(portalId: string): boolean {
    const metrics = this.performanceRegistry.get(portalId);
    if (!metrics) {
      return false;
    }

    metrics.errorCount++;
    metrics.errorRate = metrics.errorCount / Math.max(1, metrics.requestCount);

    return true;
  }
}

/**
 * Portal context enricher
 * Enriches portal context with additional metadata
 */
export class PortalContextEnricher
  implements ContextEnricher<PortalContextInjection>
{
  readonly id = 'portal-enricher';
  readonly priority = 70;

  async enrich(
    context: PortalContextInjection,
    scope: ContextScope
  ): Promise<PortalContextInjection> {
    if (scope.type !== ContextScopeType.Portal) {
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

    // Add model analysis
    if (context.model) {
      enriched.modelAnalysis = {
        providerType: this.getProviderType(context.model.provider),
        modelCategory: this.categorizeModel(context.model.name),
        estimatedCost: this.estimateModelCost(
          context.model,
          context.tokenUsage
        ),
        capabilities: this.inferModelCapabilities(context.model.name),
      };
    }

    // Add usage analysis
    if (context.tokenUsage) {
      enriched.usageAnalysis = {
        efficiency: this.calculateEfficiency(context.tokenUsage),
        costEstimate: this.estimateTokenCost(
          context.tokenUsage,
          context.model?.provider
        ),
        usageLevel: this.categorizeUsage(context.tokenUsage.total),
        recommendations: this.generateUsageRecommendations(context.tokenUsage),
      };
    }

    return enriched;
  }

  shouldEnrich(scope: ContextScope): boolean {
    return scope.type === ContextScopeType.Portal;
  }

  /**
   * Get provider type category
   */
  private getProviderType(provider: string): string {
    const providerMap: Record<string, string> = {
      openai: 'commercial',
      anthropic: 'commercial',
      google: 'commercial',
      cohere: 'commercial',
      ollama: 'local',
      lmstudio: 'local',
      huggingface: 'open-source',
    };

    return providerMap[provider.toLowerCase()] || 'unknown';
  }

  /**
   * Categorize model by capabilities
   */
  private categorizeModel(modelName: string): string {
    const name = modelName.toLowerCase();

    if (
      name.includes('gpt-4') ||
      name.includes('claude-3') ||
      name.includes('gemini-pro')
    ) {
      return 'large-language-model';
    } else if (name.includes('gpt-3.5') || name.includes('claude-2')) {
      return 'medium-language-model';
    } else if (name.includes('embedding') || name.includes('ada')) {
      return 'embedding-model';
    } else if (name.includes('whisper') || name.includes('speech')) {
      return 'audio-model';
    } else if (name.includes('vision') || name.includes('multimodal')) {
      return 'multimodal-model';
    }

    return 'language-model';
  }

  /**
   * Estimate model cost based on usage
   */
  private estimateModelCost(
    model: PortalContextInjection['model'],
    usage?: PortalContextInjection['tokenUsage']
  ): number {
    if (!usage) {
      return 0;
    }

    // Simplified cost estimation - in practice, use actual pricing
    const costPer1kTokens = this.getModelCostPer1kTokens(
      model.provider,
      model.name
    );
    return (usage.total / 1000) * costPer1kTokens;
  }

  /**
   * Get cost per 1K tokens for a model
   */
  private getModelCostPer1kTokens(provider: string, modelName: string): number {
    // Simplified pricing - use actual pricing in production
    const pricingMap: Record<string, Record<string, number>> = {
      openai: {
        'gpt-4': 0.03,
        'gpt-3.5-turbo': 0.002,
        'text-embedding-ada-002': 0.0001,
      },
      anthropic: {
        'claude-3-opus': 0.015,
        'claude-3-sonnet': 0.003,
        'claude-3-haiku': 0.00025,
      },
    };

    return pricingMap[provider]?.[modelName] || 0.001;
  }

  /**
   * Infer model capabilities
   */
  private inferModelCapabilities(modelName: string): string[] {
    const capabilities: string[] = ['text-generation'];
    const name = modelName.toLowerCase();

    if (name.includes('gpt-4') || name.includes('claude-3')) {
      capabilities.push('reasoning', 'code-generation', 'analysis');
    }

    if (name.includes('vision') || name.includes('multimodal')) {
      capabilities.push('image-understanding', 'multimodal');
    }

    if (name.includes('turbo') || name.includes('fast')) {
      capabilities.push('fast-inference');
    }

    return capabilities;
  }

  /**
   * Calculate token usage efficiency
   */
  private calculateEfficiency(
    usage: PortalContextInjection['tokenUsage']
  ): number {
    if (usage.input === 0) {
      return 0;
    }

    // Simple efficiency metric: output tokens per input token
    return usage.output / usage.input;
  }

  /**
   * Estimate token cost
   */
  private estimateTokenCost(
    usage: PortalContextInjection['tokenUsage'],
    provider?: string
  ): number {
    const avgCostPer1kTokens = 0.002; // Default cost
    return (usage.total / 1000) * avgCostPer1kTokens;
  }

  /**
   * Categorize usage level
   */
  private categorizeUsage(totalTokens: number): string {
    if (totalTokens < 1000) {
      return 'light';
    } else if (totalTokens < 10000) {
      return 'moderate';
    } else if (totalTokens < 100000) {
      return 'heavy';
    } else {
      return 'enterprise';
    }
  }

  /**
   * Generate usage recommendations
   */
  private generateUsageRecommendations(
    usage: PortalContextInjection['tokenUsage']
  ): string[] {
    const recommendations: string[] = [];

    if (usage.input > usage.output * 2) {
      recommendations.push(
        'Consider reducing input length for better efficiency'
      );
    }

    if (usage.total > 50000) {
      recommendations.push(
        'High token usage detected - consider implementing caching'
      );
    }

    if (usage.output < usage.input * 0.1) {
      recommendations.push(
        'Low output ratio - check if prompts are too complex'
      );
    }

    return recommendations;
  }
}

/**
 * Portal context validation middleware
 * Validates and sanitizes portal context data
 */
export class PortalContextValidator
  implements ContextMiddleware<PortalContextInjection>
{
  readonly id = 'portal-validator';
  readonly priority = 100;

  async transform(
    context: PortalContextInjection,
    scope: ContextScope,
    next: (context: PortalContextInjection) => Promise<PortalContextInjection>
  ): Promise<PortalContextInjection> {
    // Validate required fields
    if (!context.portalId) {
      throw new Error('Portal context must include portalId');
    }

    // Sanitize configuration
    if (context.config && typeof context.config === 'object') {
      context.config = this.sanitizeConfig(context.config);
    }

    // Validate model information
    if (context.model) {
      context.model = this.validateModel(context.model);
    }

    // Validate token usage
    if (context.tokenUsage) {
      context.tokenUsage = this.validateTokenUsage(context.tokenUsage);
    }

    return next(context);
  }

  shouldProcess(scope: ContextScope): boolean {
    return scope.type === ContextScopeType.Portal;
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
    const sensitiveFields = ['apiKey', 'secret', 'token', 'password', 'key'];
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Validate model information
   */
  private validateModel(
    model: PortalContextInjection['model']
  ): PortalContextInjection['model'] {
    const validated = { ...model };

    // Ensure required fields
    if (!validated.name || typeof validated.name !== 'string') {
      throw new Error('Model must have a valid name');
    }

    if (!validated.provider || typeof validated.provider !== 'string') {
      throw new Error('Model must have a valid provider');
    }

    // Validate parameters
    if (validated.parameters) {
      // Ensure numeric parameters are within reasonable bounds
      if (typeof validated.parameters.temperature === 'number') {
        validated.parameters.temperature = Math.max(
          0,
          Math.min(2, validated.parameters.temperature)
        );
      }

      if (typeof validated.parameters.maxTokens === 'number') {
        validated.parameters.maxTokens = Math.max(
          1,
          Math.min(100000, validated.parameters.maxTokens)
        );
      }
    }

    return validated;
  }

  /**
   * Validate token usage
   */
  private validateTokenUsage(
    usage: PortalContextInjection['tokenUsage']
  ): PortalContextInjection['tokenUsage'] {
    const validated = { ...usage };

    // Ensure non-negative values
    validated.input = Math.max(0, validated.input || 0);
    validated.output = Math.max(0, validated.output || 0);
    validated.total = validated.input + validated.output;

    return validated;
  }
}

/**
 * Portal injection helper functions
 */
export class PortalInjectionHelper {
  /**
   * Create context scope for a portal
   */
  static createPortalScope(
    portalId: string,
    agentId?: string,
    correlationId?: string
  ): ContextScope {
    return {
      type: ContextScopeType.Portal,
      target: portalId,
      agentId,
      correlationId,
      metadata: {
        portalType: this.getPortalType(portalId),
        createdAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Create portal context injection configuration
   */
  static createPortalContext(
    portalId: string,
    config?: unknown,
    model?: Partial<PortalContextInjection['model']>
  ): PortalContextInjection {
    return {
      portalId,
      config: config || {},
      model: model
        ? {
            name: model.name || 'unknown',
            provider: model.provider || 'unknown',
            parameters: model.parameters || {},
          }
        : {
            name: 'unknown',
            provider: 'unknown',
            parameters: {},
          },
      tokenUsage: {
        input: 0,
        output: 0,
        total: 0,
      },
    };
  }

  /**
   * Inject context into a portal
   */
  static async injectPortalContext(
    portal: Portal,
    context: PortalContextInjection
  ): Promise<Portal & { context: PortalContextInjection }> {
    const contextualPortal = portal as Portal & {
      context: PortalContextInjection;
      updateContext?: (
        updates: Partial<PortalContextInjection>
      ) => Promise<OperationResult>;
      recordTokenUsage?: (input: number, output: number) => void;
    };

    contextualPortal.context = { ...context };

    // Add context update method
    contextualPortal.updateContext = async (
      updates: Partial<PortalContextInjection>
    ) => {
      try {
        contextualPortal.context = { ...contextualPortal.context, ...updates };
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    };

    // Add token usage recording method
    contextualPortal.recordTokenUsage = (input: number, output: number) => {
      contextualPortal.context.tokenUsage.input += input;
      contextualPortal.context.tokenUsage.output += output;
      contextualPortal.context.tokenUsage.total =
        contextualPortal.context.tokenUsage.input +
        contextualPortal.context.tokenUsage.output;
    };

    return contextualPortal;
  }

  /**
   * Get portal type from portal ID
   */
  private static getPortalType(portalId: string): string {
    // Extract portal type from ID (e.g., 'openai-gpt4' -> 'openai')
    const parts = portalId.split('-');
    return parts[0] || 'unknown';
  }
}

/**
 * Export all portal injection patterns
 */
export const portalInjectionPatterns = {
  providers: {
    config: PortalConfigProvider,
    model: PortalModelProvider,
    tokenUsage: PortalTokenUsageProvider,
    performance: PortalPerformanceProvider,
  },
  enrichers: {
    context: PortalContextEnricher,
  },
  middleware: {
    validator: PortalContextValidator,
  },
  helpers: PortalInjectionHelper,
};
