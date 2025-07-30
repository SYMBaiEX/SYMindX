/**
 * Adaptive Model Selection System
 *
 * Intelligent model selection based on context, performance metrics, cost optimization,
 * and dynamic routing with fallback strategies for AI SDK v5 portals.
 */

import { runtimeLogger } from '../../utils/logger';

// === MODEL PERFORMANCE METRICS ===

export interface ModelPerformanceMetrics {
  modelId: string;
  provider: string;
  metrics: {
    avgResponseTime: number;
    successRate: number;
    avgTokensPerSecond: number;
    costPerToken: number;
    qualityScore: number; // 0-1 based on user feedback/evaluation
    reliability: number; // 0-1 based on uptime and consistency
  };
  contextMetrics: {
    performanceByComplexity: Record<
      'simple' | 'moderate' | 'complex',
      ModelPerformanceMetrics['metrics']
    >;
    performanceByDomain: Record<string, ModelPerformanceMetrics['metrics']>;
    performanceByTokenLength: Record<
      'short' | 'medium' | 'long',
      ModelPerformanceMetrics['metrics']
    >;
  };
  lastUpdated: Date;
  sampleSize: number;
}

export interface ModelCapabilities {
  modelId: string;
  provider: string;
  capabilities: {
    maxTokens: number;
    supportsStreaming: boolean;
    supportsTools: boolean;
    supportsMultimodal: boolean;
    supportsVision: boolean;
    supportsAudio: boolean;
    supportedLanguages: string[];
    specializations: string[]; // e.g., ['code', 'math', 'creative']
  };
  constraints: {
    rateLimits: {
      requestsPerMinute: number;
      tokensPerMinute: number;
    };
    availability: {
      regions: string[];
      uptime: number; // 0-1
    };
  };
}

export interface RequestContext {
  complexity: 'simple' | 'moderate' | 'complex';
  domain?: string;
  expectedTokens: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  budget?: {
    maxCostPerRequest: number;
    totalBudget: number;
    remainingBudget: number;
  };
  requirements: {
    needsStreaming?: boolean;
    needsTools?: boolean;
    needsMultimodal?: boolean;
    maxLatency?: number;
    minQuality?: number;
  };
  userPreferences?: {
    preferredProviders: string[];
    avoidProviders: string[];
    preferredModels: string[];
  };
}

// === ADAPTIVE MODEL SELECTOR ===

export class AdaptiveModelSelector {
  private performanceMetrics = new Map<string, ModelPerformanceMetrics>();
  private modelCapabilities = new Map<string, ModelCapabilities>();
  private selectionHistory: Array<{
    modelId: string;
    context: RequestContext;
    actualPerformance: Partial<ModelPerformanceMetrics['metrics']>;
    timestamp: Date;
  }> = [];

  constructor(
    private config: {
      performanceWeight: number; // 0-1, weight of performance in selection
      costWeight: number; // 0-1, weight of cost in selection
      qualityWeight: number; // 0-1, weight of quality in selection
      fallbackChainLength: number; // Number of fallback models to prepare
      metricsRetentionDays: number; // How long to keep performance metrics
      minSampleSize: number; // Min samples before trusting metrics
    } = {
      performanceWeight: 0.4,
      costWeight: 0.3,
      qualityWeight: 0.3,
      fallbackChainLength: 3,
      metricsRetentionDays: 30,
      minSampleSize: 10,
    }
  ) {}

  /**
   * Register a model with its capabilities
   */
  registerModel(capabilities: ModelCapabilities): void {
    this.modelCapabilities.set(capabilities.modelId, capabilities);

    // Initialize performance metrics if not exists
    if (!this.performanceMetrics.has(capabilities.modelId)) {
      this.performanceMetrics.set(capabilities.modelId, {
        modelId: capabilities.modelId,
        provider: capabilities.provider,
        metrics: {
          avgResponseTime: 1000, // Default 1s
          successRate: 0.95, // Default 95%
          avgTokensPerSecond: 50, // Default 50 tokens/s
          costPerToken: 0.0001, // Default cost
          qualityScore: 0.8, // Default quality
          reliability: 0.9, // Default reliability
        },
        contextMetrics: {
          performanceByComplexity: {
            simple: this.getDefaultMetrics(),
            moderate: this.getDefaultMetrics(),
            complex: this.getDefaultMetrics(),
          },
          performanceByDomain: {},
          performanceByTokenLength: {
            short: this.getDefaultMetrics(),
            medium: this.getDefaultMetrics(),
            long: this.getDefaultMetrics(),
          },
        },
        lastUpdated: new Date(),
        sampleSize: 0,
      });
    }
  }

  /**
   * Select the optimal model for a given context
   */
  selectModel(context: RequestContext): {
    primary: string;
    fallbacks: string[];
    reasoning: {
      score: number;
      factors: Record<string, number>;
      alternatives: Array<{ modelId: string; score: number; reason: string }>;
    };
  } {
    // Filter models based on hard requirements
    const eligibleModels = this.filterEligibleModels(context);

    if (eligibleModels.length === 0) {
      throw new Error('No eligible models found for the given context');
    }

    // Score all eligible models
    const scoredModels = eligibleModels.map((modelId) => ({
      modelId,
      score: this.calculateModelScore(modelId, context),
      factors: this.getScoreFactors(modelId, context),
    }));

    // Sort by score (highest first)
    scoredModels.sort((a, b) => b.score - a.score);

    // Select primary and fallbacks
    const primary = scoredModels[0].modelId;
    const fallbacks = scoredModels
      .slice(1, this.config.fallbackChainLength + 1)
      .map((m) => m.modelId);

    // Generate reasoning
    const reasoning = {
      score: scoredModels[0].score,
      factors: scoredModels[0].factors,
      alternatives: scoredModels.slice(1, 5).map((m) => ({
        modelId: m.modelId,
        score: m.score,
        reason: this.generateSelectionReason(m.modelId, m.factors),
      })),
    };

    runtimeLogger.debug('Model selection completed', {
      primary,
      fallbacks,
      reasoning,
      context,
    });

    return { primary, fallbacks, reasoning };
  }

  /**
   * Update performance metrics based on actual execution results
   */
  updatePerformanceMetrics(
    modelId: string,
    context: RequestContext,
    actualMetrics: {
      responseTime: number;
      success: boolean;
      tokensPerSecond?: number;
      cost?: number;
      qualityScore?: number;
    }
  ): void {
    const existing = this.performanceMetrics.get(modelId);
    if (!existing) {
      runtimeLogger.warn(`Cannot update metrics for unknown model: ${modelId}`);
      return;
    }

    // Update overall metrics with exponential moving average
    const alpha = 0.1; // Learning rate
    existing.metrics.avgResponseTime =
      existing.metrics.avgResponseTime * (1 - alpha) +
      actualMetrics.responseTime * alpha;

    existing.metrics.successRate =
      existing.metrics.successRate * (1 - alpha) +
      (actualMetrics.success ? 1 : 0) * alpha;

    if (actualMetrics.tokensPerSecond) {
      existing.metrics.avgTokensPerSecond =
        existing.metrics.avgTokensPerSecond * (1 - alpha) +
        actualMetrics.tokensPerSecond * alpha;
    }

    if (actualMetrics.cost) {
      existing.metrics.costPerToken =
        existing.metrics.costPerToken * (1 - alpha) +
        actualMetrics.cost * alpha;
    }

    if (actualMetrics.qualityScore) {
      existing.metrics.qualityScore =
        existing.metrics.qualityScore * (1 - alpha) +
        actualMetrics.qualityScore * alpha;
    }

    // Update context-specific metrics
    const complexityMetrics =
      existing.contextMetrics.performanceByComplexity[context.complexity];
    complexityMetrics.avgResponseTime =
      complexityMetrics.avgResponseTime * (1 - alpha) +
      actualMetrics.responseTime * alpha;
    complexityMetrics.successRate =
      complexityMetrics.successRate * (1 - alpha) +
      (actualMetrics.success ? 1 : 0) * alpha;

    if (context.domain) {
      if (!existing.contextMetrics.performanceByDomain[context.domain]) {
        existing.contextMetrics.performanceByDomain[context.domain] =
          this.getDefaultMetrics();
      }
      const domainMetrics =
        existing.contextMetrics.performanceByDomain[context.domain];
      domainMetrics.avgResponseTime =
        domainMetrics.avgResponseTime * (1 - alpha) +
        actualMetrics.responseTime * alpha;
      domainMetrics.successRate =
        domainMetrics.successRate * (1 - alpha) +
        (actualMetrics.success ? 1 : 0) * alpha;
    }

    // Update token length metrics
    const tokenCategory = this.categorizeTokenLength(context.expectedTokens);
    const tokenMetrics =
      existing.contextMetrics.performanceByTokenLength[tokenCategory];
    tokenMetrics.avgResponseTime =
      tokenMetrics.avgResponseTime * (1 - alpha) +
      actualMetrics.responseTime * alpha;
    tokenMetrics.successRate =
      tokenMetrics.successRate * (1 - alpha) +
      (actualMetrics.success ? 1 : 0) * alpha;

    existing.sampleSize++;
    existing.lastUpdated = new Date();

    // Store in selection history
    this.selectionHistory.push({
      modelId,
      context,
      actualPerformance: {
        avgResponseTime: actualMetrics.responseTime,
        successRate: actualMetrics.success ? 1 : 0,
        avgTokensPerSecond: actualMetrics.tokensPerSecond,
        costPerToken: actualMetrics.cost,
        qualityScore: actualMetrics.qualityScore,
      },
      timestamp: new Date(),
    });

    // Cleanup old history
    this.cleanupOldMetrics();
  }

  /**
   * Get model recommendations for different scenarios
   */
  getModelRecommendations(): {
    fastest: string[];
    mostCostEffective: string[];
    highestQuality: string[];
    mostReliable: string[];
    byComplexity: Record<'simple' | 'moderate' | 'complex', string[]>;
  } {
    const models = Array.from(this.performanceMetrics.values()).filter(
      (m) => m.sampleSize >= this.config.minSampleSize
    );

    return {
      fastest: models
        .sort((a, b) => a.metrics.avgResponseTime - b.metrics.avgResponseTime)
        .slice(0, 5)
        .map((m) => m.modelId),

      mostCostEffective: models
        .sort((a, b) => a.metrics.costPerToken - b.metrics.costPerToken)
        .slice(0, 5)
        .map((m) => m.modelId),

      highestQuality: models
        .sort((a, b) => b.metrics.qualityScore - a.metrics.qualityScore)
        .slice(0, 5)
        .map((m) => m.modelId),

      mostReliable: models
        .sort((a, b) => b.metrics.reliability - a.metrics.reliability)
        .slice(0, 5)
        .map((m) => m.modelId),

      byComplexity: {
        simple: models
          .sort(
            (a, b) =>
              this.calculateComplexityScore(b, 'simple') -
              this.calculateComplexityScore(a, 'simple')
          )
          .slice(0, 3)
          .map((m) => m.modelId),

        moderate: models
          .sort(
            (a, b) =>
              this.calculateComplexityScore(b, 'moderate') -
              this.calculateComplexityScore(a, 'moderate')
          )
          .slice(0, 3)
          .map((m) => m.modelId),

        complex: models
          .sort(
            (a, b) =>
              this.calculateComplexityScore(b, 'complex') -
              this.calculateComplexityScore(a, 'complex')
          )
          .slice(0, 3)
          .map((m) => m.modelId),
      },
    };
  }

  /**
   * Filter models based on hard requirements
   */
  private filterEligibleModels(context: RequestContext): string[] {
    const eligible: string[] = [];

    for (const [modelId, capabilities] of this.modelCapabilities) {
      // Check token requirements
      if (context.expectedTokens > capabilities.capabilities.maxTokens) {
        continue;
      }

      // Check required capabilities
      if (
        context.requirements.needsStreaming &&
        !capabilities.capabilities.supportsStreaming
      ) {
        continue;
      }

      if (
        context.requirements.needsTools &&
        !capabilities.capabilities.supportsTools
      ) {
        continue;
      }

      if (
        context.requirements.needsMultimodal &&
        !capabilities.capabilities.supportsMultimodal
      ) {
        continue;
      }

      // Check user preferences
      if (
        context.userPreferences?.avoidProviders?.includes(capabilities.provider)
      ) {
        continue;
      }

      if (
        context.userPreferences?.preferredProviders?.length &&
        !context.userPreferences.preferredProviders.includes(
          capabilities.provider
        )
      ) {
        continue;
      }

      // Check budget constraints
      if (context.budget) {
        const metrics = this.performanceMetrics.get(modelId);
        if (metrics) {
          const estimatedCost =
            metrics.metrics.costPerToken * context.expectedTokens;
          if (
            estimatedCost > context.budget.maxCostPerRequest ||
            estimatedCost > context.budget.remainingBudget
          ) {
            continue;
          }
        }
      }

      eligible.push(modelId);
    }

    return eligible;
  }

  /**
   * Calculate overall score for a model given context
   */
  private calculateModelScore(
    modelId: string,
    context: RequestContext
  ): number {
    const metrics = this.performanceMetrics.get(modelId);
    const capabilities = this.modelCapabilities.get(modelId);

    if (!metrics || !capabilities) return 0;

    // Base scores (0-1)
    const performanceScore = this.calculatePerformanceScore(metrics, context);
    const costScore = this.calculateCostScore(metrics, context);
    const qualityScore = this.calculateQualityScore(metrics, context);

    // Apply weights
    const weightedScore =
      performanceScore * this.config.performanceWeight +
      costScore * this.config.costWeight +
      qualityScore * this.config.qualityWeight;

    // Apply modifiers
    let finalScore = weightedScore;

    // Priority modifier
    if (context.priority === 'critical') {
      finalScore *= 1.2; // Boost reliable models for critical requests
    } else if (context.priority === 'low') {
      finalScore *= 0.9; // Slight penalty for non-critical requests
    }

    // Sample size confidence modifier
    if (metrics.sampleSize < this.config.minSampleSize) {
      finalScore *= 0.8; // Reduce confidence for models with limited data
    }

    // User preference bonus
    if (context.userPreferences?.preferredModels?.includes(modelId)) {
      finalScore *= 1.1;
    }

    return Math.min(1, Math.max(0, finalScore));
  }

  private calculatePerformanceScore(
    metrics: ModelPerformanceMetrics,
    context: RequestContext
  ): number {
    // Get context-specific metrics if available
    const contextMetrics =
      context.complexity in metrics.contextMetrics.performanceByComplexity
        ? metrics.contextMetrics.performanceByComplexity[context.complexity]
        : metrics.metrics;

    // Response time score (inverse relationship)
    const responseTimeScore = Math.max(
      0,
      1 - contextMetrics.avgResponseTime / 5000
    ); // 5s max

    // Success rate score
    const successRateScore = contextMetrics.successRate;

    // Tokens per second score
    const speedScore = Math.min(1, contextMetrics.avgTokensPerSecond / 100); // 100 tokens/s max

    // Reliability score
    const reliabilityScore = metrics.metrics.reliability;

    return (
      responseTimeScore * 0.3 +
      successRateScore * 0.3 +
      speedScore * 0.2 +
      reliabilityScore * 0.2
    );
  }

  private calculateCostScore(
    metrics: ModelPerformanceMetrics,
    context: RequestContext
  ): number {
    if (!context.budget) return 1; // No budget constraints

    const estimatedCost = metrics.metrics.costPerToken * context.expectedTokens;
    const budgetUtilization = estimatedCost / context.budget.maxCostPerRequest;

    // Return inverse score (lower cost = higher score)
    return Math.max(0, 1 - budgetUtilization);
  }

  private calculateQualityScore(
    metrics: ModelPerformanceMetrics,
    context: RequestContext
  ): number {
    let qualityScore = metrics.metrics.qualityScore;

    // Apply domain-specific quality adjustments if available
    if (
      context.domain &&
      metrics.contextMetrics.performanceByDomain[context.domain]
    ) {
      const domainMetrics =
        metrics.contextMetrics.performanceByDomain[context.domain];
      qualityScore = (qualityScore + domainMetrics.qualityScore) / 2;
    }

    // Apply minimum quality requirements
    if (
      context.requirements.minQuality &&
      qualityScore < context.requirements.minQuality
    ) {
      return 0; // Disqualify if below minimum quality
    }

    return qualityScore;
  }

  private calculateComplexityScore(
    metrics: ModelPerformanceMetrics,
    complexity: 'simple' | 'moderate' | 'complex'
  ): number {
    const complexityMetrics =
      metrics.contextMetrics.performanceByComplexity[complexity];
    return (
      complexityMetrics.successRate * 0.4 +
      (1 - Math.min(1, complexityMetrics.avgResponseTime / 3000)) * 0.3 +
      complexityMetrics.qualityScore * 0.3
    );
  }

  private getScoreFactors(
    modelId: string,
    context: RequestContext
  ): Record<string, number> {
    const metrics = this.performanceMetrics.get(modelId);
    if (!metrics) return {};

    return {
      performance: this.calculatePerformanceScore(metrics, context),
      cost: this.calculateCostScore(metrics, context),
      quality: this.calculateQualityScore(metrics, context),
      reliability: metrics.metrics.reliability,
      sampleSize: Math.min(1, metrics.sampleSize / this.config.minSampleSize),
    };
  }

  private generateSelectionReason(
    modelId: string,
    factors: Record<string, number>
  ): string {
    const topFactors = Object.entries(factors)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 2);

    return `Strong ${topFactors.map(([factor]) => factor).join(' and ')}`;
  }

  private categorizeTokenLength(tokens: number): 'short' | 'medium' | 'long' {
    if (tokens < 500) return 'short';
    if (tokens < 2000) return 'medium';
    return 'long';
  }

  private getDefaultMetrics(): ModelPerformanceMetrics['metrics'] {
    return {
      avgResponseTime: 1000,
      successRate: 0.95,
      avgTokensPerSecond: 50,
      costPerToken: 0.0001,
      qualityScore: 0.8,
      reliability: 0.9,
    };
  }

  private cleanupOldMetrics(): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.metricsRetentionDays);

    this.selectionHistory = this.selectionHistory.filter(
      (entry) => entry.timestamp > cutoffDate
    );
  }

  /**
   * Export performance data for analysis
   */
  exportPerformanceData(): {
    metrics: ModelPerformanceMetrics[];
    history: typeof this.selectionHistory;
    summary: {
      totalRequests: number;
      modelUsage: Record<string, number>;
      avgPerformanceByProvider: Record<
        string,
        ModelPerformanceMetrics['metrics']
      >;
    };
  } {
    const metrics = Array.from(this.performanceMetrics.values());

    // Calculate usage statistics
    const modelUsage: Record<string, number> = {};
    const providerStats: Record<
      string,
      { count: number; metrics: ModelPerformanceMetrics['metrics'] }
    > = {};

    for (const entry of this.selectionHistory) {
      modelUsage[entry.modelId] = (modelUsage[entry.modelId] || 0) + 1;

      const modelMetrics = this.performanceMetrics.get(entry.modelId);
      if (modelMetrics) {
        const provider = modelMetrics.provider;
        if (!providerStats[provider]) {
          providerStats[provider] = {
            count: 0,
            metrics: this.getDefaultMetrics(),
          };
        }
        providerStats[provider].count++;
      }
    }

    // Calculate average performance by provider
    const avgPerformanceByProvider: Record<
      string,
      ModelPerformanceMetrics['metrics']
    > = {};
    for (const [provider, stats] of Object.entries(providerStats)) {
      const providerModels = metrics.filter((m) => m.provider === provider);
      if (providerModels.length > 0) {
        avgPerformanceByProvider[provider] = {
          avgResponseTime:
            providerModels.reduce(
              (sum, m) => sum + m.metrics.avgResponseTime,
              0
            ) / providerModels.length,
          successRate:
            providerModels.reduce((sum, m) => sum + m.metrics.successRate, 0) /
            providerModels.length,
          avgTokensPerSecond:
            providerModels.reduce(
              (sum, m) => sum + m.metrics.avgTokensPerSecond,
              0
            ) / providerModels.length,
          costPerToken:
            providerModels.reduce((sum, m) => sum + m.metrics.costPerToken, 0) /
            providerModels.length,
          qualityScore:
            providerModels.reduce((sum, m) => sum + m.metrics.qualityScore, 0) /
            providerModels.length,
          reliability:
            providerModels.reduce((sum, m) => sum + m.metrics.reliability, 0) /
            providerModels.length,
        };
      }
    }

    return {
      metrics,
      history: [...this.selectionHistory],
      summary: {
        totalRequests: this.selectionHistory.length,
        modelUsage,
        avgPerformanceByProvider,
      },
    };
  }
}

// === UTILITY FUNCTIONS ===

/**
 * Create request context from portal options
 */
export function createRequestContext(options: {
  prompt?: string;
  maxTokens?: number;
  tools?: any;
  domain?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  budget?: number;
  userPreferences?: any;
}): RequestContext {
  // Estimate complexity based on prompt and tools
  const complexity = estimateComplexity(options.prompt, options.tools);

  // Estimate expected tokens
  const expectedTokens = options.maxTokens || estimateTokens(options.prompt);

  return {
    complexity,
    domain: options.domain,
    expectedTokens,
    priority: options.priority || 'medium',
    budget: options.budget
      ? {
          maxCostPerRequest: options.budget,
          totalBudget: options.budget * 100, // Assume 100x budget for total
          remainingBudget: options.budget * 50, // Assume 50x remaining
        }
      : undefined,
    requirements: {
      needsStreaming: false, // Default
      needsTools: !!options.tools,
      needsMultimodal: false, // Default
    },
    userPreferences: options.userPreferences,
  };
}

function estimateComplexity(
  prompt?: string,
  tools?: any
): 'simple' | 'moderate' | 'complex' {
  if (!prompt) return 'simple';

  let score = 0;

  // Length factor
  if (prompt.length > 1000) score += 2;
  else if (prompt.length > 300) score += 1;

  // Complexity indicators
  const complexityIndicators = [
    'analyze',
    'complex',
    'detailed',
    'comprehensive',
    'multi-step',
    'reasoning',
    'logical',
    'problem-solving',
    'algorithm',
    'strategy',
  ];

  for (const indicator of complexityIndicators) {
    if (prompt.toLowerCase().includes(indicator)) score += 1;
  }

  // Tool usage
  if (tools && Object.keys(tools).length > 0) {
    score += Object.keys(tools).length > 3 ? 2 : 1;
  }

  if (score >= 4) return 'complex';
  if (score >= 2) return 'moderate';
  return 'simple';
}

function estimateTokens(prompt?: string): number {
  if (!prompt) return 100;

  // Rough estimation: ~4 characters per token
  return Math.ceil(prompt.length / 4) + 100; // Add buffer for response
}

// Export singleton selector for global use
export let globalModelSelector: AdaptiveModelSelector | null = null;

export function initializeGlobalModelSelector(
  config?: ConstructorParameters<typeof AdaptiveModelSelector>[0]
): AdaptiveModelSelector {
  globalModelSelector = new AdaptiveModelSelector(config);
  return globalModelSelector;
}

export function getGlobalModelSelector(): AdaptiveModelSelector {
  if (!globalModelSelector) {
    throw new Error(
      'Global model selector not initialized. Call initializeGlobalModelSelector first.'
    );
  }
  return globalModelSelector;
}
