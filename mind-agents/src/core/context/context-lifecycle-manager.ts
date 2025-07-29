/**
 * Context Lifecycle Manager Implementation for SYMindX
 * 
 * Manages the complete lifecycle of agent contexts including creation,
 * validation, enrichment, propagation, and cleanup with performance monitoring.
 */

import { EventEmitter } from 'events';
import { 
  ContextLifecycleManager,
  ContextLifecycleManagerConfig,
  ContextRequest,
  ContextValidationResult,
  ContextLifecycleState,
  ContextLifecycleEvent,
  ContextLifecycleEventData,
  ContextLifecycleHooks,
  ContextLifecycleMetrics,
  ManagedContext
} from '../../types/context/context-lifecycle';
import { BaseContext } from '../../types/context';
import { Agent } from '../../types/agent';
import { runtimeLogger } from '../../utils/logger';
import { createRuntimeError } from '../../utils/standard-errors';

/**
 * Context Lifecycle Manager Implementation
 */
export class SYMindXContextLifecycleManager extends EventEmitter implements ContextLifecycleManager {
  private contexts: Map<string, ManagedContext> = new Map();
  private agentContexts: Map<string, Set<string>> = new Map(); // agentId -> contextIds
  private contextIndex: Map<string, string> = new Map(); // agentId -> primary contextId
  private hooks: ContextLifecycleHooks = {};
  private cleanupTimer?: NodeJS.Timeout;
  private isInitialized = false;
  private config: Required<ContextLifecycleManagerConfig>;

  constructor(config: ContextLifecycleManagerConfig = {}) {
    super();
    
    // Set default configuration
    this.config = {
      maxContextsPerAgent: config.maxContextsPerAgent ?? 10,
      defaultTtl: config.defaultTtl ?? 3600000, // 1 hour
      cleanupInterval: config.cleanupInterval ?? 300000, // 5 minutes
      enableMonitoring: config.enableMonitoring ?? true,
      enableEnrichment: config.enableEnrichment ?? true,
      memoryThresholds: config.memoryThresholds ?? {
        warning: 100 * 1024 * 1024, // 100MB
        critical: 500 * 1024 * 1024  // 500MB
      },
      errorRecovery: config.errorRecovery ?? {
        maxRetries: 3,
        retryDelay: 1000,
        enableAutoRecovery: true
      },
      validation: config.validation ?? {
        strict: false,
        rules: ['required_fields', 'type_validation', 'circular_dependency']
      },
      custom: config.custom ?? {}
    };

    this.setupEventHandlers();
  }

  /**
   * Initialize the lifecycle manager
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      runtimeLogger.info('🔄 Initializing Context Lifecycle Manager...');

      // Start cleanup timer
      this.startCleanupTimer();

      // Setup monitoring if enabled
      if (this.config.enableMonitoring) {
        this.setupMonitoring();
      }

      this.isInitialized = true;
      runtimeLogger.success('✅ Context Lifecycle Manager initialized');
    } catch (error) {
      runtimeLogger.error('❌ Failed to initialize Context Lifecycle Manager:', error as Error);
      throw createRuntimeError('Failed to initialize Context Lifecycle Manager', 'LIFECYCLE_INIT_ERROR', { error });
    }
  }

  /**
   * Shutdown the lifecycle manager
   */
  async shutdown(): Promise<void> {
    if (!this.isInitialized) return;

    try {
      runtimeLogger.info('🛑 Shutting down Context Lifecycle Manager...');

      // Stop cleanup timer
      if (this.cleanupTimer) {
        clearInterval(this.cleanupTimer);
        this.cleanupTimer = undefined;
      }

      // Cleanup all contexts
      const contextIds = Array.from(this.contexts.keys());
      await Promise.all(contextIds.map(id => this.disposeContext(id)));

      // Clear all maps
      this.contexts.clear();
      this.agentContexts.clear();
      this.contextIndex.clear();

      this.isInitialized = false;
      runtimeLogger.success('✅ Context Lifecycle Manager shut down');
    } catch (error) {
      runtimeLogger.error('❌ Error during Context Lifecycle Manager shutdown:', error as Error);
      throw error;
    }
  }

  /**
   * Request a new context
   */
  async requestContext(request: ContextRequest): Promise<string> {
    try {
      // Generate unique context ID
      const contextId = this.generateContextId(request.agentId);
      
      // Emit request event
      await this.emitLifecycleEvent(contextId, request.agentId, ContextLifecycleEvent.CONTEXT_REQUESTED, ContextLifecycleState.INITIALIZING);

      // Execute before create hook
      const processedRequest = await this.executeHook('beforeCreate', request) || request;

      // Check agent context limits
      await this.checkContextLimits(request.agentId);

      // Create managed context
      const managedContext = await this.createManagedContext(contextId, processedRequest);

      // Store context
      this.contexts.set(contextId, managedContext);
      this.indexContext(request.agentId, contextId);

      // Execute after create hook
      await this.executeHook('afterCreate', contextId, managedContext.context);

      // Emit created event
      await this.emitLifecycleEvent(contextId, request.agentId, ContextLifecycleEvent.CONTEXT_CREATED, ContextLifecycleState.INITIALIZING);

      // Initialize context
      await this.initializeContext(contextId);

      runtimeLogger.info(`🔄 Context created: ${contextId} for agent ${request.agentId}`);
      return contextId;
    } catch (error) {
      runtimeLogger.error(`❌ Failed to create context for agent ${request.agentId}:`, error as Error);
      throw createRuntimeError('Failed to create context', 'CONTEXT_CREATION_ERROR', { agentId: request.agentId, error });
    }
  }

  /**
   * Get a managed context by ID
   */
  async getContext(contextId: string): Promise<ManagedContext | null> {
    const context = this.contexts.get(contextId);
    if (!context) return null;

    // Update last accessed timestamp
    context.lastAccessed = new Date();
    
    return context;
  }

  /**
   * Get context by agent ID
   */
  async getContextByAgent(agentId: string): Promise<ManagedContext | null> {
    const contextId = this.contextIndex.get(agentId);
    if (!contextId) return null;

    return this.getContext(contextId);
  }

  /**
   * Validate a context
   */
  async validateContext(contextId: string): Promise<ContextValidationResult> {
    const managedContext = this.contexts.get(contextId);
    if (!managedContext) {
      throw createRuntimeError('Context not found', 'CONTEXT_NOT_FOUND', { contextId });
    }

    try {
      // Execute before validation hook
      await this.executeHook('beforeValidation', contextId, managedContext.context);

      // Emit validation started event
      await this.emitLifecycleEvent(contextId, managedContext.agentId, ContextLifecycleEvent.VALIDATION_STARTED, managedContext.state);

      const startTime = Date.now();
      const result = await this.performValidation(managedContext);
      const duration = Date.now() - startTime;

      // Update metrics
      managedContext.metrics.performance.validationDuration = duration;
      managedContext.metrics.timestamps.validated = new Date();

      // Execute after validation hook
      await this.executeHook('afterValidation', contextId, result);

      // Emit validation result event
      const event = result.isValid ? ContextLifecycleEvent.VALIDATION_PASSED : ContextLifecycleEvent.VALIDATION_FAILED;
      await this.emitLifecycleEvent(contextId, managedContext.agentId, event, managedContext.state, { result });

      return result;
    } catch (error) {
      await this.emitLifecycleEvent(contextId, managedContext.agentId, ContextLifecycleEvent.VALIDATION_ERROR, managedContext.state, { error });
      throw error;
    }
  }

  /**
   * Enrich a context with additional data
   */
  async enrichContext(contextId: string): Promise<void> {
    if (!this.config.enableEnrichment) return;

    const managedContext = this.contexts.get(contextId);
    if (!managedContext) {
      throw createRuntimeError('Context not found', 'CONTEXT_NOT_FOUND', { contextId });
    }

    try {
      // Execute before enrichment hook
      await this.executeHook('beforeEnrichment', contextId, managedContext.context);

      // Update state
      await this.updateContextState(contextId, ContextLifecycleState.ENRICHING);

      // Emit enrichment started event
      await this.emitLifecycleEvent(contextId, managedContext.agentId, ContextLifecycleEvent.ENRICHMENT_STARTED, ContextLifecycleState.ENRICHING);

      const startTime = Date.now();
      await this.performEnrichment(managedContext);
      const duration = Date.now() - startTime;

      // Update metrics
      managedContext.metrics.performance.enrichmentDuration = duration;
      managedContext.metrics.timestamps.enriched = new Date();

      // Execute after enrichment hook
      await this.executeHook('afterEnrichment', contextId, managedContext.context);

      // Update state back to active
      await this.updateContextState(contextId, ContextLifecycleState.ACTIVE);

      // Emit enrichment completed event
      await this.emitLifecycleEvent(contextId, managedContext.agentId, ContextLifecycleEvent.ENRICHMENT_COMPLETED, ContextLifecycleState.ACTIVE);

      runtimeLogger.info(`🔄 Context enriched: ${contextId} in ${duration}ms`);
    } catch (error) {
      await this.updateContextState(contextId, ContextLifecycleState.ERROR);
      await this.emitLifecycleEvent(contextId, managedContext.agentId, ContextLifecycleEvent.ENRICHMENT_ERROR, ContextLifecycleState.ERROR, { error });
      runtimeLogger.error(`❌ Context enrichment failed: ${contextId}:`, error as Error);
      throw error;
    }
  }

  /**
   * Propagate context to child agents
   */
  async propagateContext(contextId: string, targetAgentIds: string[]): Promise<string[]> {
    const parentContext = this.contexts.get(contextId);
    if (!parentContext) {
      throw createRuntimeError('Parent context not found', 'CONTEXT_NOT_FOUND', { contextId });
    }

    try {
      // Update state
      await this.updateContextState(contextId, ContextLifecycleState.PROPAGATING);

      // Emit propagation started event
      await this.emitLifecycleEvent(contextId, parentContext.agentId, ContextLifecycleEvent.PROPAGATION_STARTED, ContextLifecycleState.PROPAGATING);

      const childContextIds: string[] = [];

      for (const targetAgentId of targetAgentIds) {
        try {
          // Create child context request
          const childRequest: ContextRequest = {
            agentId: targetAgentId,
            requestType: parentContext.config.requestType,
            baseContext: { ...parentContext.context },
            inheritance: {
              parentContextId: contextId,
              inheritableProperties: parentContext.config.inheritance?.inheritableProperties,
              mergeStrategy: parentContext.config.inheritance?.mergeStrategy || 'merge'
            },
            scope: {
              ...parentContext.config.scope,
              visibility: 'shared' // Child contexts are shared by default
            },
            enrichment: parentContext.config.enrichment,
            monitoring: parentContext.config.monitoring,
            metadata: {
              ...parentContext.config.metadata,
              parentContextId: contextId,
              propagated: true
            }
          };

          // Create child context
          const childContextId = await this.requestContext(childRequest);
          childContextIds.push(childContextId);

          // Update parent-child relationships
          parentContext.childIds.add(childContextId);
          const childContext = this.contexts.get(childContextId);
          if (childContext) {
            childContext.parentId = contextId;
          }

          // Emit context inherited event
          await this.emitLifecycleEvent(childContextId, targetAgentId, ContextLifecycleEvent.CONTEXT_INHERITED, ContextLifecycleState.ACTIVE);
        } catch (error) {
          runtimeLogger.error(`❌ Failed to propagate context to agent ${targetAgentId}:`, error as Error);
          // Continue with other agents
        }
      }

      // Update state back to active
      await this.updateContextState(contextId, ContextLifecycleState.ACTIVE);

      // Emit propagation completed event
      await this.emitLifecycleEvent(contextId, parentContext.agentId, ContextLifecycleEvent.PROPAGATION_COMPLETED, ContextLifecycleState.ACTIVE, { childContextIds });

      runtimeLogger.info(`🔄 Context propagated: ${contextId} to ${childContextIds.length} child contexts`);
      return childContextIds;
    } catch (error) {
      await this.updateContextState(contextId, ContextLifecycleState.ERROR);
      await this.emitLifecycleEvent(contextId, parentContext.agentId, ContextLifecycleEvent.PROPAGATION_ERROR, ContextLifecycleState.ERROR, { error });
      throw error;
    }
  }

  /**
   * Inherit context from parent
   */
  async inheritContext(childContextId: string, parentContextId: string): Promise<void> {
    const childContext = this.contexts.get(childContextId);
    const parentContext = this.contexts.get(parentContextId);

    if (!childContext || !parentContext) {
      throw createRuntimeError('Context not found for inheritance', 'CONTEXT_NOT_FOUND', { childContextId, parentContextId });
    }

    try {
      const inheritableProperties = childContext.config.inheritance?.inheritableProperties || Object.keys(parentContext.context);
      const mergeStrategy = childContext.config.inheritance?.mergeStrategy || 'merge';

      for (const property of inheritableProperties) {
        const parentValue = (parentContext.context as any)[property];
        if (parentValue !== undefined) {
          if (mergeStrategy === 'override') {
            (childContext.context as any)[property] = parentValue;
          } else if (mergeStrategy === 'merge' && typeof parentValue === 'object' && parentValue !== null) {
            (childContext.context as any)[property] = {
              ...(childContext.context as any)[property],
              ...parentValue
            };
          } else if (mergeStrategy === 'selective' && (childContext.context as any)[property] === undefined) {
            (childContext.context as any)[property] = parentValue;
          }
        }
      }

      // Update relationships
      childContext.parentId = parentContextId;
      parentContext.childIds.add(childContextId);

      runtimeLogger.info(`🔄 Context inheritance completed: ${childContextId} from ${parentContextId}`);
    } catch (error) {
      runtimeLogger.error(`❌ Context inheritance failed: ${childContextId} from ${parentContextId}:`, error as Error);
      throw error;
    }
  }

  /**
   * Update context state
   */
  async updateContextState(contextId: string, newState: ContextLifecycleState): Promise<void> {
    const managedContext = this.contexts.get(contextId);
    if (!managedContext) {
      throw createRuntimeError('Context not found', 'CONTEXT_NOT_FOUND', { contextId });
    }

    const previousState = managedContext.state;
    if (previousState === newState) return;

    try {
      // Execute before state transition hook
      const shouldTransition = await this.executeHook('beforeStateTransition', contextId, previousState, newState);
      if (shouldTransition === false) {
        runtimeLogger.warn(`🔄 State transition blocked by hook: ${contextId} ${previousState} -> ${newState}`);
        return;
      }

      // Update state
      managedContext.state = newState;

      // Update metrics
      managedContext.metrics.stateHistory.push({
        state: newState,
        timestamp: new Date(),
        duration: 0 // Will be calculated on next transition
      });

      // Calculate duration for previous state
      if (managedContext.metrics.stateHistory.length > 1) {
        const previousEntry = managedContext.metrics.stateHistory[managedContext.metrics.stateHistory.length - 2];
        const currentEntry = managedContext.metrics.stateHistory[managedContext.metrics.stateHistory.length - 1];
        previousEntry.duration = currentEntry.timestamp.getTime() - previousEntry.timestamp.getTime();
      }

      // Execute after state transition hook
      await this.executeHook('afterStateTransition', contextId, previousState, newState);

      // Emit state transition event
      await this.emitLifecycleEvent(contextId, managedContext.agentId, ContextLifecycleEvent.STATE_TRANSITION, newState, { previousState });

      runtimeLogger.debug(`🔄 Context state updated: ${contextId} ${previousState} -> ${newState}`);
    } catch (error) {
      // Revert state on error
      managedContext.state = previousState;
      runtimeLogger.error(`❌ Failed to update context state: ${contextId}:`, error as Error);
      throw error;
    }
  }

  /**
   * Schedule context cleanup
   */
  async scheduleCleanup(contextId: string, delay: number = this.config.defaultTtl): Promise<void> {
    const managedContext = this.contexts.get(contextId);
    if (!managedContext) {
      throw createRuntimeError('Context not found', 'CONTEXT_NOT_FOUND', { contextId });
    }

    const cleanupTime = new Date(Date.now() + delay);
    managedContext.cleanupScheduled = cleanupTime;

    // Emit cleanup scheduled event
    await this.emitLifecycleEvent(contextId, managedContext.agentId, ContextLifecycleEvent.CLEANUP_SCHEDULED, managedContext.state, { cleanupTime });

    runtimeLogger.debug(`🔄 Context cleanup scheduled: ${contextId} at ${cleanupTime.toISOString()}`);
  }

  /**
   * Force immediate cleanup
   */
  async cleanupContext(contextId: string): Promise<void> {
    const managedContext = this.contexts.get(contextId);
    if (!managedContext) return;

    try {
      // Execute before cleanup hook
      await this.executeHook('beforeCleanup', contextId);

      // Update state
      await this.updateContextState(contextId, ContextLifecycleState.CLEANUP);

      // Emit cleanup started event
      await this.emitLifecycleEvent(contextId, managedContext.agentId, ContextLifecycleEvent.CLEANUP_STARTED, ContextLifecycleState.CLEANUP);

      // Cleanup child contexts first
      for (const childId of managedContext.childIds) {
        await this.cleanupContext(childId);
      }

      // Remove from parent's children
      if (managedContext.parentId) {
        const parentContext = this.contexts.get(managedContext.parentId);
        if (parentContext) {
          parentContext.childIds.delete(contextId);
        }
      }

      // Clear references
      managedContext.references = new WeakSet();

      // Execute after cleanup hook
      await this.executeHook('afterCleanup', contextId);

      // Update state
      await this.updateContextState(contextId, ContextLifecycleState.DISPOSED);

      // Emit cleanup completed event
      await this.emitLifecycleEvent(contextId, managedContext.agentId, ContextLifecycleEvent.CLEANUP_COMPLETED, ContextLifecycleState.DISPOSED);

      runtimeLogger.info(`🔄 Context cleaned up: ${contextId}`);
    } catch (error) {
      await this.updateContextState(contextId, ContextLifecycleState.ERROR);
      await this.emitLifecycleEvent(contextId, managedContext.agentId, ContextLifecycleEvent.CLEANUP_ERROR, ContextLifecycleState.ERROR, { error });
      runtimeLogger.error(`❌ Context cleanup failed: ${contextId}:`, error as Error);
      throw error;
    }
  }

  /**
   * Dispose of context and release resources
   */
  async disposeContext(contextId: string): Promise<void> {
    const managedContext = this.contexts.get(contextId);
    if (!managedContext) return;

    try {
      // Cleanup first if not already done
      if (managedContext.state !== ContextLifecycleState.DISPOSED) {
        await this.cleanupContext(contextId);
      }

      // Remove from all indexes
      this.contexts.delete(contextId);
      
      const agentContexts = this.agentContexts.get(managedContext.agentId);
      if (agentContexts) {
        agentContexts.delete(contextId);
        if (agentContexts.size === 0) {
          this.agentContexts.delete(managedContext.agentId);
        }
      }

      if (this.contextIndex.get(managedContext.agentId) === contextId) {
        this.contextIndex.delete(managedContext.agentId);
      }

      // Emit disposed event
      await this.emitLifecycleEvent(contextId, managedContext.agentId, ContextLifecycleEvent.CONTEXT_DISPOSED, ContextLifecycleState.DISPOSED);

      runtimeLogger.info(`🔄 Context disposed: ${contextId}`);
    } catch (error) {
      runtimeLogger.error(`❌ Context disposal failed: ${contextId}:`, error as Error);
      throw error;
    }
  }

  /**
   * List all contexts for an agent
   */
  async listContexts(agentId?: string): Promise<ManagedContext[]> {
    if (agentId) {
      const contextIds = this.agentContexts.get(agentId);
      if (!contextIds) return [];
      
      return Array.from(contextIds)
        .map(id => this.contexts.get(id))
        .filter((ctx): ctx is ManagedContext => ctx !== undefined);
    }
    
    return Array.from(this.contexts.values());
  }

  /**
   * Get context metrics
   */
  async getMetrics(contextId: string): Promise<ContextLifecycleMetrics | null> {
    const managedContext = this.contexts.get(contextId);
    if (!managedContext) return null;

    // Update total duration
    const now = Date.now();
    managedContext.metrics.performance.totalDuration = now - managedContext.metrics.timestamps.requested.getTime();

    return managedContext.metrics;
  }

  /**
   * Register lifecycle hooks
   */
  registerHooks(hooks: Partial<ContextLifecycleHooks>): void {
    this.hooks = { ...this.hooks, ...hooks };
    runtimeLogger.debug('🔄 Context lifecycle hooks registered');
  }

  /**
   * Unregister lifecycle hooks
   */
  unregisterHooks(hooks: Partial<ContextLifecycleHooks>): void {
    for (const key of Object.keys(hooks) as (keyof ContextLifecycleHooks)[]) {
      delete this.hooks[key];
    }
    runtimeLogger.debug('🔄 Context lifecycle hooks unregistered');
  }

  /**
   * Subscribe to lifecycle events
   */
  onLifecycleEvent(
    event: ContextLifecycleEvent,
    handler: (data: ContextLifecycleEventData) => Promise<void>
  ): () => void {
    this.on(event, handler);
    return () => this.off(event, handler);
  }

  /**
   * Health check for lifecycle manager
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    metrics: {
      activeContexts: number;
      totalContexts: number;
      avgCreationTime: number;
      errorRate: number;
      memoryUsage: number;
    };
    issues: string[];
  }> {
    const contexts = Array.from(this.contexts.values());
    const activeContexts = contexts.filter(ctx => ctx.state === ContextLifecycleState.ACTIVE).length;
    const totalContexts = contexts.length;
    
    // Calculate average creation time
    const creationTimes = contexts
      .filter(ctx => ctx.metrics.performance.creationDuration > 0)
      .map(ctx => ctx.metrics.performance.creationDuration);
    const avgCreationTime = creationTimes.length > 0 
      ? creationTimes.reduce((sum, time) => sum + time, 0) / creationTimes.length 
      : 0;

    // Calculate error rate
    const totalErrors = contexts.reduce((sum, ctx) => sum + ctx.metrics.errors.length, 0);
    const errorRate = totalContexts > 0 ? totalErrors / totalContexts : 0;

    // Calculate memory usage
    const memoryUsage = contexts.reduce((sum, ctx) => sum + ctx.metrics.performance.memoryUsage, 0);

    const issues: string[] = [];
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    // Check for issues
    if (memoryUsage > this.config.memoryThresholds.critical) {
      issues.push('Critical memory usage');
      status = 'unhealthy';
    } else if (memoryUsage > this.config.memoryThresholds.warning) {
      issues.push('High memory usage');
      if (status === 'healthy') status = 'degraded';
    }

    if (errorRate > 0.1) {
      issues.push('High error rate');
      status = 'unhealthy';
    } else if (errorRate > 0.05) {
      issues.push('Elevated error rate');
      if (status === 'healthy') status = 'degraded';
    }

    if (avgCreationTime > 1000) {
      issues.push('Slow context creation');
      if (status === 'healthy') status = 'degraded';
    }

    return {
      status,
      metrics: {
        activeContexts,
        totalContexts,
        avgCreationTime,
        errorRate,
        memoryUsage
      },
      issues
    };
  }

  /**
   * Cleanup stale contexts
   */
  async cleanupStaleContexts(): Promise<number> {
    const now = Date.now();
    const staleContexts: string[] = [];

    for (const [contextId, managedContext] of this.contexts) {
      // Check if context is stale
      const isStale = 
        (managedContext.cleanupScheduled && now >= managedContext.cleanupScheduled.getTime()) ||
        (now - managedContext.lastAccessed.getTime() > this.config.defaultTtl * 2) ||
        managedContext.state === ContextLifecycleState.STALE;

      if (isStale) {
        staleContexts.push(contextId);
      }
    }

    // Cleanup stale contexts
    for (const contextId of staleContexts) {
      try {
        await this.disposeContext(contextId);
      } catch (error) {
        runtimeLogger.error(`❌ Failed to cleanup stale context ${contextId}:`, error as Error);
      }
    }

    if (staleContexts.length > 0) {
      runtimeLogger.info(`🔄 Cleaned up ${staleContexts.length} stale contexts`);
    }

    return staleContexts.length;
  }

  /**
   * Export context data for persistence
   */
  async exportContext(contextId: string): Promise<any> {
    const managedContext = this.contexts.get(contextId);
    if (!managedContext) {
      throw createRuntimeError('Context not found', 'CONTEXT_NOT_FOUND', { contextId });
    }

    return {
      id: managedContext.id,
      agentId: managedContext.agentId,
      state: managedContext.state,
      context: managedContext.context,
      config: managedContext.config,
      metrics: managedContext.metrics,
      parentId: managedContext.parentId,
      childIds: Array.from(managedContext.childIds),
      dependencies: Array.from(managedContext.dependencies),
      lastAccessed: managedContext.lastAccessed,
      metadata: managedContext.metadata,
      exportedAt: new Date()
    };
  }

  /**
   * Import context data from persistence
   */
  async importContext(data: any): Promise<string> {
    const contextId = data.id;
    
    if (this.contexts.has(contextId)) {
      throw createRuntimeError('Context already exists', 'CONTEXT_EXISTS', { contextId });
    }

    const managedContext: ManagedContext = {
      id: data.id,
      agentId: data.agentId,
      state: data.state,
      context: data.context,
      config: data.config,
      metrics: data.metrics,
      parentId: data.parentId,
      childIds: new Set(data.childIds || []),
      dependencies: new Set(data.dependencies || []),
      references: new WeakSet(),
      lastAccessed: new Date(data.lastAccessed),
      metadata: data.metadata || {}
    };

    this.contexts.set(contextId, managedContext);
    this.indexContext(data.agentId, contextId);

    runtimeLogger.info(`🔄 Context imported: ${contextId}`);
    return contextId;
  }

  // Private helper methods

  private generateContextId(agentId: string): string {
    return `ctx_${agentId}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private async createManagedContext(contextId: string, request: ContextRequest): Promise<ManagedContext> {
    const now = new Date();
    
    const managedContext: ManagedContext = {
      id: contextId,
      agentId: request.agentId,
      state: ContextLifecycleState.INITIALIZING,
      context: request.baseContext || {},
      config: request,
      metrics: {
        contextId,
        agentId: request.agentId,
        timestamps: {
          requested: now,
          created: now
        },
        performance: {
          creationDuration: 0,
          memoryUsage: this.estimateMemoryUsage(request.baseContext || {}),
          cpuTime: 0
        },
        stateHistory: [{
          state: ContextLifecycleState.INITIALIZING,
          timestamp: now,
          duration: 0
        }],
        eventCounts: {} as Record<ContextLifecycleEvent, number>,
        errors: [],
        custom: {}
      },
      childIds: new Set(),
      dependencies: new Set(),
      references: new WeakSet(),
      lastAccessed: now,
      metadata: request.metadata || {}
    };

    return managedContext;
  }

  private async initializeContext(contextId: string): Promise<void> {
    const managedContext = this.contexts.get(contextId);
    if (!managedContext) return;

    const startTime = Date.now();

    try {
      // Validate context
      if (this.config.validation.strict) {
        const validationResult = await this.validateContext(contextId);
        if (!validationResult.isValid) {
          throw createRuntimeError('Context validation failed', 'CONTEXT_VALIDATION_ERROR', { 
            contextId, 
            errors: validationResult.errors 
          });
        }
      }

      // Enrich context if enabled
      if (this.config.enableEnrichment && managedContext.config.enrichment?.enabled) {
        await this.enrichContext(contextId);
      }

      // Update state
      await this.updateContextState(contextId, ContextLifecycleState.ACTIVE);

      // Calculate creation duration
      const creationDuration = Date.now() - startTime;
      managedContext.metrics.performance.creationDuration = creationDuration;

      // Emit initialized event
      await this.emitLifecycleEvent(contextId, managedContext.agentId, ContextLifecycleEvent.CONTEXT_INITIALIZED, ContextLifecycleState.ACTIVE);

      // Schedule cleanup if TTL is set
      if (managedContext.config.scope?.ttl) {
        await this.scheduleCleanup(contextId, managedContext.config.scope.ttl);
      }

      runtimeLogger.debug(`🔄 Context initialized: ${contextId} in ${creationDuration}ms`);
    } catch (error) {
      await this.updateContextState(contextId, ContextLifecycleState.ERROR);
      await this.recordError(contextId, error as Error, ContextLifecycleEvent.CONTEXT_INITIALIZED);
      throw error;
    }
  }

  private async checkContextLimits(agentId: string): Promise<void> {
    const agentContexts = this.agentContexts.get(agentId);
    const contextCount = agentContexts ? agentContexts.size : 0;

    if (contextCount >= this.config.maxContextsPerAgent) {
      throw createRuntimeError('Maximum contexts per agent exceeded', 'CONTEXT_LIMIT_EXCEEDED', { 
        agentId, 
        currentCount: contextCount, 
        maxAllowed: this.config.maxContextsPerAgent 
      });
    }
  }

  private indexContext(agentId: string, contextId: string): void {
    if (!this.agentContexts.has(agentId)) {
      this.agentContexts.set(agentId, new Set());
    }
    this.agentContexts.get(agentId)!.add(contextId);

    // Set as primary context if none exists
    if (!this.contextIndex.has(agentId)) {
      this.contextIndex.set(agentId, contextId);
    }
  }

  private async performValidation(managedContext: ManagedContext): Promise<ContextValidationResult> {
    const startTime = Date.now();
    const errors: ContextValidationResult['errors'] = [];
    const warnings: string[] = [];
    const suggestions: ContextValidationResult['suggestions'] = [];

    // Required fields validation
    if (this.config.validation.rules.includes('required_fields')) {
      if (!managedContext.agentId) {
        errors.push({
          property: 'agentId',
          message: 'Agent ID is required',
          severity: 'error',
          code: 'REQUIRED_FIELD'
        });
      }
    }

    // Type validation
    if (this.config.validation.rules.includes('type_validation')) {
      if (managedContext.context && typeof managedContext.context !== 'object') {
        errors.push({
          property: 'context',
          message: 'Context must be an object',
          severity: 'error',
          code: 'INVALID_TYPE'
        });
      }
    }

    // Circular dependency check
    if (this.config.validation.rules.includes('circular_dependency')) {
      if (await this.hasCircularDependency(managedContext.id)) {
        errors.push({
          property: 'dependencies',
          message: 'Circular dependency detected',
          severity: 'error',
          code: 'CIRCULAR_DEPENDENCY'
        });
      }
    }

    // Custom validators
    if (this.config.validation.customValidators) {
      for (const [name, validator] of Object.entries(this.config.validation.customValidators)) {
        try {
          const result = validator(managedContext.context);
          errors.push(...result.errors);
          warnings.push(...result.warnings);
          suggestions.push(...result.suggestions);
        } catch (error) {
          warnings.push(`Custom validator ${name} failed: ${(error as Error).message}`);
        }
      }
    }

    const duration = Date.now() - startTime;
    const score = Math.max(0, 1 - (errors.length * 0.2) - (warnings.length * 0.1));

    return {
      isValid: errors.length === 0,
      score,
      errors,
      warnings,
      suggestions,
      metadata: {
        validatedAt: new Date(),
        validatorVersion: '1.0.0',
        validationDuration: duration,
        rulesApplied: this.config.validation.rules
      }
    };
  }

  private async performEnrichment(managedContext: ManagedContext): Promise<void> {
    const enrichmentSteps = managedContext.config.enrichment?.steps || ['basic_enrichment'];

    for (const step of enrichmentSteps) {
      switch (step) {
        case 'basic_enrichment':
          await this.basicEnrichment(managedContext);
          break;
        case 'memory_enrichment':
          await this.memoryEnrichment(managedContext);
          break;
        case 'emotion_enrichment':
          await this.emotionEnrichment(managedContext);
          break;
        default:
          runtimeLogger.warn(`🔄 Unknown enrichment step: ${step}`);
      }
    }
  }

  private async basicEnrichment(managedContext: ManagedContext): Promise<void> {
    // Add timestamp and metadata
    managedContext.context.timestamp = new Date().toISOString();
    managedContext.context.agentId = managedContext.agentId;
    managedContext.context.contextId = managedContext.id;
  }

  private async memoryEnrichment(managedContext: ManagedContext): Promise<void> {
    // This would integrate with the memory system to add relevant memories
    // For now, we'll add a placeholder
    managedContext.context.memories = [];
  }

  private async emotionEnrichment(managedContext: ManagedContext): Promise<void> {
    // This would integrate with the emotion system to add emotional context
    // For now, we'll add a placeholder
    managedContext.context.emotions = { current: 'neutral', history: [] };
  }

  private async hasCircularDependency(contextId: string): Promise<boolean> {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const checkCircular = (id: string): boolean => {
      if (recursionStack.has(id)) return true;
      if (visited.has(id)) return false;

      visited.add(id);
      recursionStack.add(id);

      const context = this.contexts.get(id);
      if (context) {
        for (const depId of context.dependencies) {
          if (checkCircular(depId)) return true;
        }
      }

      recursionStack.delete(id);
      return false;
    };

    return checkCircular(contextId);
  }

  private async executeHook(hookName: keyof ContextLifecycleHooks, ...args: any[]): Promise<any> {
    const hook = this.hooks[hookName];
    if (!hook) return undefined;

    try {
      return await (hook as any)(...args);
    } catch (error) {
      runtimeLogger.error(`❌ Lifecycle hook ${hookName} failed:`, error as Error);
      if (this.config.errorRecovery.enableAutoRecovery) {
        return undefined; // Allow execution to continue
      }
      throw error;
    }
  }

  private async emitLifecycleEvent(
    contextId: string,
    agentId: string,
    event: ContextLifecycleEvent,
    state: ContextLifecycleState,
    metadata?: any
  ): Promise<void> {
    const eventData: ContextLifecycleEventData = {
      contextId,
      agentId,
      event,
      currentState: state,
      timestamp: new Date(),
      metadata
    };

    // Update event counts
    const managedContext = this.contexts.get(contextId);
    if (managedContext) {
      managedContext.metrics.eventCounts[event] = (managedContext.metrics.eventCounts[event] || 0) + 1;
    }

    this.emit(event, eventData);
  }

  private async recordError(contextId: string, error: Error, event: ContextLifecycleEvent): Promise<void> {
    const managedContext = this.contexts.get(contextId);
    if (!managedContext) return;

    managedContext.metrics.errors.push({
      error,
      event,
      timestamp: new Date(),
      recovered: false
    });

    // Execute error hook
    await this.executeHook('onError', contextId, error, event);
  }

  private estimateMemoryUsage(context: any): number {
    try {
      return JSON.stringify(context).length * 2; // Rough estimate in bytes
    } catch {
      return 1024; // Default fallback
    }
  }

  private setupEventHandlers(): void {
    // Handle uncaught errors
    this.on('error', (error) => {
      runtimeLogger.error('❌ Context Lifecycle Manager error:', error);
    });
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(async () => {
      try {
        await this.cleanupStaleContexts();
      } catch (error) {
        runtimeLogger.error('❌ Automated cleanup failed:', error as Error);
      }
    }, this.config.cleanupInterval);
  }

  private setupMonitoring(): void {
    // Setup performance monitoring
    setInterval(() => {
      const health = this.healthCheck();
      health.then(result => {
        if (result.status !== 'healthy') {
          runtimeLogger.warn(`🔄 Context Lifecycle Manager health: ${result.status}`, result.issues);
        }
      }).catch(error => {
        runtimeLogger.error('❌ Health check failed:', error as Error);
      });
    }, 60000); // Check every minute
  }
}

/**
 * Factory function to create a context lifecycle manager
 */
export function createContextLifecycleManager(config?: ContextLifecycleManagerConfig): ContextLifecycleManager {
  return new SYMindXContextLifecycleManager(config);
}