/**
 * Context Integration Hub for SYMindX
 * 
 * Central module that integrates all context utilities and provides
 * a unified API for the enhanced context system.
 */

import { contextCache, ContextCacheKeyGenerator } from './context-cache';
import { contextTransformer } from './context-transformation';
import { contextTracer, contextDebugger, contextMonitor } from './context-observability';
import { multiAgentOrchestrator } from './multi-agent-context';
import { enrichThoughtContext, validateThoughtContextForUnified } from './context-helpers';
import type { ThoughtContext, Agent } from '../types/agent';
import type { BaseContext, PortalContext } from '../types/context';
import { runtimeLogger } from './logger';

/**
 * Context integration configuration
 */
export interface ContextIntegrationConfig {
  enableCaching?: boolean;
  enableTracing?: boolean;
  enableMultiAgent?: boolean;
  cacheConfig?: {
    defaultTTL?: number;
    maxSize?: number;
  };
  debugMode?: boolean;
}

/**
 * Main context integration service
 */
export class ContextIntegrationService {
  private config: ContextIntegrationConfig;
  private initialized: boolean = false;

  constructor(config: ContextIntegrationConfig = {}) {
    this.config = {
      enableCaching: true,
      enableTracing: true,
      enableMultiAgent: true,
      debugMode: process.env.NODE_ENV === 'development',
      ...config,
    };
  }

  /**
   * Initialize the context integration system
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Start monitoring if enabled
      if (this.config.enableTracing && process.env.NODE_ENV === 'production') {
        contextMonitor.start();
      }

      this.initialized = true;
      runtimeLogger.info('Context integration service initialized', {
        config: this.config,
      });
    } catch (error) {
      runtimeLogger.error('Failed to initialize context integration', { error });
      throw error;
    }
  }

  /**
   * Create enhanced context for an agent
   */
  async createContext(
    agent: Agent,
    baseContext?: Partial<ThoughtContext>
  ): Promise<ThoughtContext> {
    const traceId = this.config.enableTracing
      ? contextTracer.startTrace('context:create', agent.id)
      : undefined;

    try {
      // Check cache first if enabled
      if (this.config.enableCaching) {
        const cacheKey = ContextCacheKeyGenerator.forAgentContext(agent.id);
        const cached = await contextCache.get(cacheKey);
        if (cached) {
          contextTracer.incrementMetric('cacheHits');
          return cached;
        }
      }

      // Create enhanced context
      const context = enrichThoughtContext(
        baseContext || this.createBaseThoughtContext(agent),
        {
          includeConversationHistory: true,
          includeEmotionalContext: true,
          includeCognitiveState: true,
          includeEnvironmentalFactors: true,
          includeToolContext: true,
        }
      );

      // Validate context
      const validation = validateThoughtContextForUnified(context);
      if (!validation.isValid && validation.errors.length > 0) {
        runtimeLogger.warn('Context validation warnings', {
          warnings: validation.warnings,
          errors: validation.errors,
        });
      }

      // Cache if enabled
      if (this.config.enableCaching) {
        const cacheKey = ContextCacheKeyGenerator.forAgentContext(agent.id);
        await contextCache.set(cacheKey, context, {
          ttl: this.config.cacheConfig?.defaultTTL,
        });
      }

      // Track in debugger if enabled
      if (this.config.debugMode && contextDebugger) {
        contextDebugger.trackContext(`ctx-${agent.id}-${Date.now()}`, agent.id);
      }

      return context;
    } finally {
      if (traceId) {
        contextTracer.endTrace(traceId);
      }
    }
  }

  /**
   * Transform context for a specific target
   */
  async transformContext(
    context: ThoughtContext | any,
    target: 'portal' | 'cognition' | 'memory' | 'emotion' | 'extension',
    options?: any
  ): Promise<any> {
    const traceId = this.config.enableTracing
      ? contextTracer.startTrace('context:transform')
      : undefined;

    try {
      // Check transform cache if enabled
      if (this.config.enableCaching && context.id) {
        const cacheKey = ContextCacheKeyGenerator.forTransformedContext(
          context.id,
          target
        );
        const cached = await contextCache.get(cacheKey);
        if (cached) {
          return cached;
        }
      }

      // Perform transformation
      const transformed = contextTransformer.transform(context, target, options);

      // Cache transformed result if enabled
      if (this.config.enableCaching && context.id) {
        const cacheKey = ContextCacheKeyGenerator.forTransformedContext(
          context.id,
          target
        );
        await contextCache.set(cacheKey, transformed, {
          ttl: this.config.cacheConfig?.defaultTTL,
        });
      }

      // Track transformation in debugger
      if (this.config.debugMode && contextDebugger && context.id) {
        contextDebugger.trackTransformation(context.id, target);
      }

      return transformed;
    } finally {
      if (traceId) {
        contextTracer.endTrace(traceId);
      }
    }
  }

  /**
   * Share context between agents
   */
  async shareContext(
    fromAgent: Agent,
    toAgent: Agent | string,
    context: any,
    permissions?: any
  ): Promise<void> {
    if (!this.config.enableMultiAgent) {
      throw new Error('Multi-agent context sharing is disabled');
    }

    const toAgentId = typeof toAgent === 'string' ? toAgent : toAgent.id;

    await multiAgentOrchestrator.shareContext({
      fromAgentId: fromAgent.id,
      toAgentId,
      contextData: context,
      permissions: permissions || {
        read: true,
        write: false,
        share: false,
        ttl: 3600000, // 1 hour default
      },
    });
  }

  /**
   * Get shared contexts for an agent
   */
  async getSharedContexts(agent: Agent | string): Promise<any[]> {
    if (!this.config.enableMultiAgent) {
      return [];
    }

    const agentId = typeof agent === 'string' ? agent : agent.id;
    return multiAgentOrchestrator.getSharedContexts(agentId);
  }

  /**
   * Aggregate contexts from multiple agents
   */
  async aggregateContexts(
    agentIds: string[],
    strategy?: 'merge' | 'override' | 'append',
    options?: any
  ): Promise<any> {
    if (!this.config.enableMultiAgent) {
      throw new Error('Multi-agent context aggregation is disabled');
    }

    return multiAgentOrchestrator.aggregateContexts(agentIds, strategy, options);
  }

  /**
   * Get observability metrics
   */
  getMetrics(): any {
    return {
      tracing: this.config.enableTracing ? contextTracer.getMetrics() : null,
      cache: this.config.enableCaching ? contextCache.getStats() : null,
      monitor: this.config.enableTracing ? contextMonitor.getPerformanceSummary() : null,
    };
  }

  /**
   * Get debug information
   */
  getDebugInfo(): any {
    if (!this.config.debugMode || !contextDebugger) {
      return null;
    }

    return {
      contexts: contextDebugger.getAllDebugInfo(),
      report: contextDebugger.generateReport(),
    };
  }

  /**
   * Clear all caches
   */
  clearCaches(): void {
    if (this.config.enableCaching) {
      contextCache.clear();
    }
    if (this.config.enableTracing) {
      contextTracer.clearTraces();
      contextTracer.resetMetrics();
    }
  }

  /**
   * Shutdown the service
   */
  async shutdown(): Promise<void> {
    if (this.config.enableTracing) {
      contextMonitor.stop();
    }
    contextCache.stop();
    this.initialized = false;
  }

  // Private helpers

  private createBaseThoughtContext(agent: Agent): ThoughtContext {
    return {
      events: [],
      memories: [],
      currentState: {
        status: agent.status,
        lastUpdate: agent.lastUpdate,
      } as any,
      environment: {
        platform: process.platform,
        timestamp: new Date(),
      } as any,
    };
  }
}

// Export singleton instance with default configuration
export const contextIntegration = new ContextIntegrationService();

// Export all utilities for direct access if needed
export {
  contextCache,
  ContextCacheKeyGenerator,
  contextTransformer,
  contextTracer,
  contextDebugger,
  contextMonitor,
  multiAgentOrchestrator,
} from './index';

// Helper function for quick context creation
export async function createEnhancedContext(
  agent: Agent,
  options?: Partial<ThoughtContext>
): Promise<ThoughtContext> {
  if (!contextIntegration['initialized']) {
    await contextIntegration.initialize();
  }
  return contextIntegration.createContext(agent, options);
}

// Helper function for quick context transformation
export async function transformContextFor(
  context: any,
  target: 'portal' | 'cognition' | 'memory' | 'emotion' | 'extension',
  options?: any
): Promise<any> {
  if (!contextIntegration['initialized']) {
    await contextIntegration.initialize();
  }
  return contextIntegration.transformContext(context, target, options);
}