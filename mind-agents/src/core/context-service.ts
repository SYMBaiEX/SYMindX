/**
 * @fileoverview Context Service for SYMindX
 * @description Centralized context management service that provides context enhancement,
 * caching, validation, and integration helpers for the runtime system.
 *
 * This service acts as the primary interface between the runtime and the unified
 * context system, providing seamless integration without breaking existing code.
 *
 * @version 1.0.0
 * @author SYMindX Core Team
 */

import type {
  Agent,
  AgentEvent,
  AgentState,
  EnvironmentState,
  MemoryRecord,
  ThoughtContext,
  EmotionState,
} from '../types/agent.js';
import {
  UnifiedContext,
  ContextScope,
  ContextPriority,
  ContextMetadata,
  AgentContextData,
  MemoryContextData,
  TemporalContext,
  ExecutionContext,
  PerformanceContext,
} from '../types/context/unified-context.js';
import type { Timestamp } from '../types/helpers.js';
import { runtimeLogger } from '../utils/logger.js';
import type { LogContext } from '../types/utils/logger.js';

/**
 * Context Cache Entry
 * Represents a cached context with metadata
 */
interface ContextCacheEntry {
  context: UnifiedContext;
  createdAt: Timestamp;
  expiresAt: Timestamp;
  accessCount: number;
  lastAccessed: Timestamp;
}

/**
 * Context Enhancement Options
 * Configuration for context enhancement operations
 */
export interface ContextEnhancementOptions {
  /** Include memory data in enhancement */
  includeMemory?: boolean;
  /** Include emotion data in enhancement */
  includeEmotions?: boolean;
  /** Include temporal context */
  includeTemporal?: boolean;
  /** Include performance metrics */
  includePerformance?: boolean;
  /** Cache the enhanced context */
  cache?: boolean;
  /** Cache TTL in milliseconds */
  cacheTtl?: number;
  /** Custom enhancement functions */
  customEnhancements?: Array<
    (context: UnifiedContext, agent: Agent) => Promise<UnifiedContext>
  >;
}

/**
 * Context Validation Result
 * Result of context validation operations
 */
export interface ContextValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  metadata: {
    validatedAt: Timestamp;
    validator: string;
    schema: string;
  };
}

/**
 * Context Service Configuration
 */
export interface ContextServiceConfig {
  /** Enable context caching */
  enableCaching: boolean;
  /** Cache size limit */
  cacheSize: number;
  /** Default cache TTL in milliseconds */
  defaultCacheTtl: number;
  /** Enable context validation */
  enableValidation: boolean;
  /** Enable performance monitoring */
  enablePerformanceMonitoring: boolean;
  /** Enable context tracing */
  enableTracing: boolean;
  /** Garbage collection interval in milliseconds */
  gcInterval: number;
}

/**
 * Default Context Service Configuration
 */
const DEFAULT_CONFIG: ContextServiceConfig = {
  enableCaching: true,
  cacheSize: 1000,
  defaultCacheTtl: 300000, // 5 minutes
  enableValidation: true,
  enablePerformanceMonitoring: false,
  enableTracing: false,
  gcInterval: 60000, // 1 minute
};

/**
 * Context Service
 *
 * Centralized service for context management, enhancement, caching, and validation.
 * Provides seamless integration between legacy and unified context systems.
 */
export class ContextService {
  private config: ContextServiceConfig;
  private contextCache: Map<string, ContextCacheEntry> = new Map();
  private gcTimer?: ReturnType<typeof setInterval>;
  private performanceMetrics: Map<string, number[]> = new Map();

  constructor(config: Partial<ContextServiceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    if (this.config.enableCaching && this.config.gcInterval > 0) {
      this.startGarbageCollection();
    }

    runtimeLogger.info('Context service initialized');
  }

  /**
   * Enhance Legacy ThoughtContext with Unified Context Data
   *
   * Takes a basic ThoughtContext and enriches it with additional contextual
   * information from the unified context system while maintaining backward compatibility.
   */
  async enhanceThoughtContext(
    agent: Agent,
    basicContext: ThoughtContext,
    options: ContextEnhancementOptions = {}
  ): Promise<ThoughtContext> {
    const startTime = performance.now();

    try {
      // Check cache first if enabled
      if (this.config.enableCaching && options.cache !== false) {
        const cached = this.getCachedContext(agent.id);
        if (cached) {
          this.recordPerformance('cache_hit', performance.now() - startTime);
          return this.extractThoughtContextFromUnified(cached);
        }
      }

      // Create unified context from basic context
      const unifiedContext = await this.createUnifiedContext(
        agent,
        basicContext,
        options
      );

      // Enhance with additional data
      const enhancedContext = await this.applyEnhancements(
        unifiedContext,
        agent,
        options
      );

      // Cache if enabled
      if (this.config.enableCaching && options.cache !== false) {
        this.setCachedContext(agent.id, enhancedContext, options.cacheTtl);
      }

      // Convert back to ThoughtContext for backward compatibility
      const result = this.extractThoughtContextFromUnified(enhancedContext);

      this.recordPerformance('enhancement', performance.now() - startTime);
      return result;
    } catch (error) {
      runtimeLogger.error(
        'Failed to enhance thought context',
        error as Error,
        { agentId: agent.id } as LogContext
      );

      // Return basic context on error
      return basicContext;
    }
  }

  /**
   * Create Unified Context from Basic Components
   *
   * Converts legacy context components into a unified context structure.
   */
  async createUnifiedContext(
    agent: Agent,
    basicContext: ThoughtContext,
    options: ContextEnhancementOptions = {}
  ): Promise<UnifiedContext> {
    const now = new Date() as Timestamp;

    // Create context metadata
    const metadata: ContextMetadata = {
      id: `ctx-${agent.id}-${Date.now()}`,
      scope: ContextScope.AGENT,
      priority: ContextPriority.AGENT,
      createdAt: now,
      lastModified: now,
      source: 'context-service',
      version: '1.0.0',
      tags: ['runtime', 'agent', agent.name],
    };

    // Build unified context
    const unifiedContext: UnifiedContext = {
      metadata,

      // Agent-specific context
      agent: await this.createAgentContextData(agent, basicContext),

      // Memory context
      memory:
        options.includeMemory !== false
          ? await this.createMemoryContextData(agent, basicContext.memories)
          : undefined,

      // Temporal context
      temporal:
        options.includeTemporal !== false
          ? this.createTemporalContext(now)
          : undefined,

      // Execution context
      execution: this.createExecutionContext(),

      // Performance context
      performance: options.includePerformance
        ? this.createPerformanceContext()
        : undefined,

      // Session context (derived from events)
      session: {
        id: `session-${agent.id}`,
        startTime: now,
        events: basicContext.events,
        state: basicContext.currentState as any,
      },

      // Environment context (converted from basic environment state)
      environment: this.convertEnvironmentState(basicContext.environment),

      // Legacy context for backward compatibility
      legacy: {
        events: basicContext.events,
        memories: basicContext.memories,
        currentState: basicContext.currentState,
        environment: basicContext.environment,
      } as any,
    };

    return unifiedContext;
  }

  /**
   * Apply Context Enhancements
   *
   * Applies additional enhancements to the unified context based on configuration.
   */
  private async applyEnhancements(
    context: UnifiedContext,
    agent: Agent,
    options: ContextEnhancementOptions
  ): Promise<UnifiedContext> {
    let enhanced = { ...context };

    // Apply custom enhancements if provided
    if (options.customEnhancements) {
      for (const enhancement of options.customEnhancements) {
        try {
          enhanced = await enhancement(enhanced, agent);
        } catch (error) {
          runtimeLogger.warn(
            'Custom context enhancement failed',
            error as Error,
            {} as LogContext
          );
        }
      }
    }

    // Update last modified timestamp
    enhanced.metadata.lastModified = new Date() as Timestamp;

    return enhanced;
  }

  /**
   * Extract ThoughtContext from Unified Context
   *
   * Converts unified context back to legacy ThoughtContext for backward compatibility.
   */
  private extractThoughtContextFromUnified(
    unifiedContext: UnifiedContext
  ): ThoughtContext {
    return {
      events: (unifiedContext.session?.events ||
        (unifiedContext.legacy as any)?.events ||
        []) as any,
      memories: (unifiedContext.memory?.recent ||
        (unifiedContext.legacy as any)?.memories ||
        []) as any,
      currentState: (unifiedContext.session?.state ||
        (unifiedContext.legacy as any)?.currentState || {
          location: 'unknown',
          inventory: {},
          stats: {},
          goals: [],
          context: {},
        }) as any,
      environment: ((unifiedContext.legacy as any)?.environment || {
        type: 'virtual_world' as any,
        time: new Date(),
        weather: 'clear',
        location: 'virtual',
        npcs: [],
        objects: [],
        events: [],
      }) as any,
      goal: unifiedContext.agent?.goals?.[0],
    };
  }

  /**
   * Validate Context
   *
   * Validates context structure and content for consistency and completeness.
   */
  async validateContext(
    context: UnifiedContext
  ): Promise<ContextValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Validate metadata
      if (!context.metadata) {
        errors.push('Missing context metadata');
      } else {
        if (!context.metadata.id) errors.push('Missing metadata.id');
        if (!context.metadata.scope) errors.push('Missing metadata.scope');
        if (!context.metadata.priority)
          errors.push('Missing metadata.priority');
        if (!context.metadata.createdAt)
          errors.push('Missing metadata.createdAt');
        if (!context.metadata.source) errors.push('Missing metadata.source');
      }

      // Validate agent context
      if (context.agent) {
        if (!context.agent.config) warnings.push('Missing agent.config');
        if (!context.agent.state) warnings.push('Missing agent.state');
      }

      // Validate temporal consistency
      if (context.temporal && context.metadata) {
        if (context.temporal.now < context.metadata.createdAt) {
          errors.push('Temporal inconsistency: now < createdAt');
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        metadata: {
          validatedAt: new Date() as Timestamp,
          validator: 'context-service',
          schema: '1.0.0',
        },
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [`Validation error: ${(error as Error).message}`],
        warnings: [],
        metadata: {
          validatedAt: new Date() as Timestamp,
          validator: 'context-service',
          schema: '1.0.0',
        },
      };
    }
  }

  /**
   * Context Caching Methods
   */
  private getCachedContext(agentId: string): UnifiedContext | null {
    const entry = this.contextCache.get(agentId);
    if (!entry) return null;

    const now = new Date() as Timestamp;
    if (now > entry.expiresAt) {
      this.contextCache.delete(agentId);
      return null;
    }

    entry.accessCount++;
    entry.lastAccessed = now;
    return entry.context;
  }

  private setCachedContext(
    agentId: string,
    context: UnifiedContext,
    ttl?: number
  ): void {
    if (!this.config.enableCaching) return;

    const now = new Date() as Timestamp;
    const cacheTtl = ttl || this.config.defaultCacheTtl;

    const entry: ContextCacheEntry = {
      context,
      createdAt: now,
      expiresAt: new Date(now.getTime() + cacheTtl) as Timestamp,
      accessCount: 1,
      lastAccessed: now,
    };

    // Remove oldest entry if cache is full
    if (this.contextCache.size >= this.config.cacheSize) {
      const oldestKey = Array.from(this.contextCache.keys())[0];
      this.contextCache.delete(oldestKey);
    }

    this.contextCache.set(agentId, entry);
  }

  /**
   * Clear cached context for specific agent
   */
  clearContextCache(agentId?: string): void {
    if (agentId) {
      this.contextCache.delete(agentId);
    } else {
      this.contextCache.clear();
    }
  }

  /**
   * Helper Methods for Context Creation
   */
  private async createAgentContextData(
    agent: Agent,
    basicContext: ThoughtContext
  ): Promise<AgentContextData> {
    return {
      config: agent.config,
      state: basicContext.currentState,
      emotions:
        agent.emotion?.getCurrentState() ||
        ({
          current: 'neutral',
          intensity: 0.5,
          secondary: [],
          history: [],
          triggers: [],
        } as any),
      recentMemories: basicContext.memories,
      goals: basicContext.goal ? [basicContext.goal] : [],
      capabilities: agent.extensions?.map((ext) => ext.id) || [],
    };
  }

  private async createMemoryContextData(
    agent: Agent,
    memories: MemoryRecord[]
  ): Promise<MemoryContextData> {
    return {
      recent: memories,
      relevant: memories.slice(0, 5), // Simple relevance heuristic
      working: memories.slice(0, 3),
      longTerm: [],
      statistics: {
        totalRecords: memories.length,
        memoryUsage: memories.reduce(
          (sum, m) => sum + (m.content?.length || 0),
          0
        ),
        averageImportance:
          memories.reduce((sum, m) => sum + (m.importance || 0.5), 0) /
          Math.max(memories.length, 1),
      },
    };
  }

  private createTemporalContext(now: Timestamp): TemporalContext {
    return {
      now,
      startTime: now,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      locale: Intl.DateTimeFormat().resolvedOptions().locale,
    };
  }

  private createExecutionContext(): ExecutionContext {
    return {
      mode: (process.env.NODE_ENV as any) || 'development',
      environment: process.env as Record<string, string>,
      version: {
        runtime: '1.0.0',
        nodejs: process.version,
      },
      debug: {
        enabled: process.env.NODE_ENV !== 'production',
        level: process.env.LOG_LEVEL || 'info',
        tracing: this.config.enableTracing,
      },
    };
  }

  private createPerformanceContext(): PerformanceContext {
    const memUsage = process.memoryUsage();
    return {
      startTime: new Date() as Timestamp,
      memoryUsage: memUsage.heapUsed,
      cpuUsage: process.cpuUsage().user / 1000000, // Convert to ms
    };
  }

  private convertEnvironmentState(envState: EnvironmentState): any {
    return {
      location: {
        address: envState.location,
      },
      factors: {
        weather: envState.weather,
        timeOfDay: this.getTimeOfDay(),
      },
    };
  }

  private getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 22) return 'evening';
    return 'night';
  }

  /**
   * Performance Monitoring
   */
  private recordPerformance(operation: string, duration: number): void {
    if (!this.config.enablePerformanceMonitoring) return;

    if (!this.performanceMetrics.has(operation)) {
      this.performanceMetrics.set(operation, []);
    }

    const metrics = this.performanceMetrics.get(operation)!;
    metrics.push(duration);

    // Keep only last 100 measurements
    if (metrics.length > 100) {
      metrics.shift();
    }
  }

  /**
   * Get Performance Statistics
   */
  getPerformanceStats(): Record<
    string,
    { avg: number; min: number; max: number; count: number }
  > {
    const stats: Record<
      string,
      { avg: number; min: number; max: number; count: number }
    > = {};

    for (const [operation, metrics] of this.performanceMetrics) {
      if (metrics.length > 0) {
        stats[operation] = {
          avg: metrics.reduce((sum, val) => sum + val, 0) / metrics.length,
          min: Math.min(...metrics),
          max: Math.max(...metrics),
          count: metrics.length,
        };
      }
    }

    return stats;
  }

  /**
   * Garbage Collection
   */
  private startGarbageCollection(): void {
    this.gcTimer = setInterval(() => {
      this.runGarbageCollection();
    }, this.config.gcInterval);
  }

  private runGarbageCollection(): void {
    const now = new Date() as Timestamp;
    let removed = 0;

    for (const [key, entry] of this.contextCache) {
      if (now > entry.expiresAt) {
        this.contextCache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      runtimeLogger.debug(
        `Context cache GC: removed ${removed} expired entries`
      );
    }
  }

  /**
   * Shutdown
   */
  shutdown(): void {
    if (this.gcTimer) {
      clearInterval(this.gcTimer);
    }
    this.contextCache.clear();
    this.performanceMetrics.clear();
    runtimeLogger.info('Context service shutdown');
  }
}

/**
 * Create Context Service Instance
 *
 * Factory function for creating a new context service instance.
 */
export function createContextService(
  config?: Partial<ContextServiceConfig>
): ContextService {
  return new ContextService(config);
}

/**
 * Default Context Service Instance
 *
 * Singleton instance for use across the runtime system.
 */
let defaultContextService: ContextService | null = null;

/**
 * Get Default Context Service
 *
 * Returns the default context service instance, creating it if necessary.
 */
export function getDefaultContextService(): ContextService {
  if (!defaultContextService) {
    defaultContextService = createContextService();
  }
  return defaultContextService;
}

/**
 * Set Default Context Service
 *
 * Sets a custom context service as the default instance.
 */
export function setDefaultContextService(service: ContextService): void {
  if (defaultContextService) {
    defaultContextService.shutdown();
  }
  defaultContextService = service;
}
