/**
 * Runtime Context Adapter
 * 
 * Bridges the existing runtime context system with the new unified context system.
 * Provides seamless adaptation between old ThoughtContext and new UnifiedContext.
 */

import {
  Agent,
  AgentEvent,
  MemoryRecord,
  AgentState,
  EnvironmentState,
  ThoughtContext,
} from '../../../types/agent';
import { runtimeLogger } from '../../../utils/logger';
import { ContextManager, ConversationContext } from '../../context-manager';

// Import the unified context types when they become available
// For now, we'll define basic interfaces to support the adapter pattern
export interface UnifiedContext {
  id: string;
  agentId: string;
  timestamp: Date;
  
  // Legacy compatibility
  thoughtContext?: ThoughtContext;
  conversationContext?: ConversationContext;
  
  // Enhanced context data
  sessionContext?: SessionContext;
  environmentContext?: EnvironmentContext;
  cognitiveContext?: CognitiveContext;
  socialContext?: SocialContext;
  
  metadata: Record<string, unknown>;
}

export interface SessionContext {
  sessionId: string;
  startTime: Date;
  duration?: number;
  participantCount: number;
  context: 'conversation' | 'task' | 'autonomous' | 'learning';
}

export interface EnvironmentContext {
  location: string;
  time: Date;
  weather?: string;
  npcs: unknown[];
  objects: unknown[];
  events: unknown[];
  constraints: Record<string, unknown>;
}

export interface CognitiveContext {
  attentionLevel: number;
  processingLoad: number;
  confidenceLevel: number;
  recentDecisions: unknown[];
  activeGoals: string[];
  memoryActivation: Record<string, number>;
}

export interface SocialContext {
  participants: string[];
  relationships: Record<string, unknown>;
  socialDynamics: unknown[];
  communicationHistory: unknown[];
}

/**
 * Configuration for the runtime context adapter
 */
export interface RuntimeContextAdapterConfig {
  // Enable/disable different context enhancements
  enableSessionTracking?: boolean;
  enableCognitiveContext?: boolean;
  enableSocialContext?: boolean;
  
  // Performance settings
  cacheSize?: number;
  contextRetentionMs?: number;
  
  // Compatibility settings
  preserveLegacyContext?: boolean;
  enableGradualMigration?: boolean;
}

/**
 * RuntimeContextAdapter class - bridges old and new context systems
 */
export class RuntimeContextAdapter {
  private contextManager: ContextManager;
  private config: RuntimeContextAdapterConfig;
  private contextCache = new Map<string, UnifiedContext>();
  private migrationState = new Map<string, { stage: string; timestamp: Date }>();

  constructor(
    contextManager: ContextManager,
    config: RuntimeContextAdapterConfig = {}
  ) {
    this.contextManager = contextManager;
    this.config = {
      enableSessionTracking: true,
      enableCognitiveContext: true,
      enableSocialContext: true,
      cacheSize: 100,
      contextRetentionMs: 3600000, // 1 hour
      preserveLegacyContext: true,
      enableGradualMigration: true,
      ...config,
    };

    // Start cleanup timer
    if (this.config.contextRetentionMs) {
      setInterval(() => this.cleanupCache(), 60000); // Every minute
    }
  }

  /**
   * Convert legacy ThoughtContext to UnifiedContext
   */
  adaptThoughtContext(
    agent: Agent,
    thoughtContext: ThoughtContext,
    conversationContext?: ConversationContext
  ): UnifiedContext {
    const contextId = `unified_${agent.id}_${Date.now()}`;
    
    const unifiedContext: UnifiedContext = {
      id: contextId,
      agentId: agent.id,
      timestamp: new Date(),
      thoughtContext,
      conversationContext,
      metadata: {},
    };

    // Add session context if enabled
    if (this.config.enableSessionTracking && conversationContext) {
      unifiedContext.sessionContext = {
        sessionId: conversationContext.id,
        startTime: conversationContext.startedAt,
        duration: Date.now() - conversationContext.startedAt.getTime(),
        participantCount: conversationContext.participants.size,
        context: this.determineSessionContext(conversationContext),
      };
    }

    // Add environment context
    unifiedContext.environmentContext = this.adaptEnvironmentState(
      thoughtContext.environment
    );

    // Add cognitive context if enabled
    if (this.config.enableCognitiveContext) {
      unifiedContext.cognitiveContext = this.buildCognitiveContext(
        agent,
        thoughtContext
      );
    }

    // Add social context if enabled
    if (this.config.enableSocialContext && conversationContext) {
      unifiedContext.socialContext = this.buildSocialContext(
        conversationContext
      );
    }

    // Cache the context
    this.contextCache.set(contextId, unifiedContext);


    runtimeLogger.debug(
      `Adapted ThoughtContext to UnifiedContext for agent ${agent.id}`,
      { contextId, thoughtContextKeys: Object.keys(thoughtContext) }
    );

    return unifiedContext;
  }

  /**
   * Convert UnifiedContext back to ThoughtContext for legacy compatibility
   */
  extractThoughtContext(unifiedContext: UnifiedContext): ThoughtContext {
    // If we have the original ThoughtContext, return it
    if (unifiedContext.thoughtContext) {
      return unifiedContext.thoughtContext;
    }

    // Otherwise, construct one from the unified context data
    const thoughtContext: ThoughtContext = {
      events: [],
      memories: [],
      currentState: {
        location: unifiedContext.environmentContext?.location || 'unknown',
        inventory: {},
        stats: {},
        goals: unifiedContext.cognitiveContext?.activeGoals || [],
        context: unifiedContext.metadata || {},
      },
      environment: {
        type: 'virtual' as any,
        time: unifiedContext.environmentContext?.time || new Date(),
        weather: unifiedContext.environmentContext?.weather || 'clear',
        location: unifiedContext.environmentContext?.location || 'virtual',
        npcs: unifiedContext.environmentContext?.npcs || [],
        objects: unifiedContext.environmentContext?.objects || [],
        events: unifiedContext.environmentContext?.events || [],
      },
    };

    return thoughtContext;
  }

  /**
   * Get or create unified context for an agent
   */
  getOrCreateUnifiedContext(
    agent: Agent,
    thoughtContext: ThoughtContext
  ): UnifiedContext {
    // Try to get existing context from cache
    const existingContextId = Array.from(this.contextCache.keys()).find(
      (id) => this.contextCache.get(id)?.agentId === agent.id
    );

    if (existingContextId) {
      const existing = this.contextCache.get(existingContextId)!;
      // Update with new thought context
      existing.thoughtContext = thoughtContext;
      existing.timestamp = new Date();
      return existing;
    }

    // Get conversation context if available
    const conversationContext = this.contextManager.getActiveContext(agent.id);

    // Create new unified context
    return this.adaptThoughtContext(agent, thoughtContext, conversationContext);
  }

  /**
   * Update unified context with new information
   */
  updateUnifiedContext(
    contextId: string,
    updates: Partial<UnifiedContext>
  ): UnifiedContext | null {
    const context = this.contextCache.get(contextId);
    if (!context) {
      runtimeLogger.warn(`Unified context not found: ${contextId}`);
      return null;
    }

    // Apply updates
    Object.assign(context, updates);
    context.timestamp = new Date();

    // Update metadata
    context.metadata = {
      ...context.metadata,
      lastUpdated: new Date(),
      updateCount: ((context.metadata.updateCount as number) || 0) + 1,
    };

    return context;
  }

  /**
   * Check if agent is in migration process
   */
  isMigrating(agentId: string): boolean {
    const state = this.migrationState.get(agentId);
    return state !== undefined && state.stage !== 'completed';
  }

  /**
   * Mark agent migration as completed
   */
  completeMigration(agentId: string): void {
    this.migrationState.set(agentId, {
      stage: 'completed',
      timestamp: new Date(),
    });
  }

  /**
   * Get migration status for all agents
   */
  getMigrationStatus(): Record<string, { stage: string; timestamp: Date }> {
    const status: Record<string, { stage: string; timestamp: Date }> = {};
    for (const [agentId, state] of this.migrationState) {
      status[agentId] = state;
    }
    return status;
  }

  /**
   * Clear cached context for an agent
   */
  clearContext(agentId: string): void {
    const contextIds = Array.from(this.contextCache.keys()).filter(
      (id) => this.contextCache.get(id)?.agentId === agentId
    );

    for (const contextId of contextIds) {
      this.contextCache.delete(contextId);
    }

    this.migrationState.delete(agentId);
  }

  // Private helper methods

  private determineSessionContext(
    conversationContext: ConversationContext
  ): 'conversation' | 'task' | 'autonomous' | 'learning' {
    // Simple heuristic - could be enhanced
    if (conversationContext.pendingQuestions.length > 0) {
      return 'learning';
    }
    if (conversationContext.state.phase === 'active') {
      return 'conversation';
    }
    return 'conversation';
  }

  private adaptEnvironmentState(
    environmentState: EnvironmentState
  ): EnvironmentContext {
    return {
      location: environmentState.location,
      time: environmentState.time,
      weather: environmentState.weather,
      npcs: environmentState.npcs,
      objects: environmentState.objects,
      events: environmentState.events,
      constraints: {},
    };
  }

  private buildCognitiveContext(
    agent: Agent,
    thoughtContext: ThoughtContext
  ): CognitiveContext {
    return {
      attentionLevel: 0.8, // Default attention level
      processingLoad: thoughtContext.events.length / 10, // Simple load calculation
      confidenceLevel: 0.7, // Default confidence
      recentDecisions: [],
      activeGoals: thoughtContext.currentState.goals,
      memoryActivation: this.calculateMemoryActivation(thoughtContext.memories),
    };
  }

  private buildSocialContext(
    conversationContext: ConversationContext
  ): SocialContext {
    return {
      participants: Array.from(conversationContext.participants),
      relationships: {},
      socialDynamics: [],
      communicationHistory: conversationContext.messages,
    };
  }

  private calculateMemoryActivation(
    memories: MemoryRecord[]
  ): Record<string, number> {
    const activation: Record<string, number> = {};
    
    for (const memory of memories) {
      // Simple activation based on recency and importance
      const recency = 1 - (Date.now() - memory.timestamp.getTime()) / 86400000;
      const importance = memory.importance || 0.5;
      activation[memory.id] = Math.max(0, recency * importance);
    }

    return activation;
  }

  private cleanupCache(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [contextId, context] of this.contextCache) {
      const age = now - context.timestamp.getTime();
      if (age > this.config.contextRetentionMs!) {
        toDelete.push(contextId);
      }
    }

    for (const contextId of toDelete) {
      this.contextCache.delete(contextId);
    }

    // Cleanup migration state for old entries
    const migrationToDelete: string[] = [];
    for (const [agentId, state] of this.migrationState) {
      const age = now - state.timestamp.getTime();
      if (age > this.config.contextRetentionMs! * 2) {
        migrationToDelete.push(agentId);
      }
    }

    for (const agentId of migrationToDelete) {
      this.migrationState.delete(agentId);
    }

    if (toDelete.length > 0 || migrationToDelete.length > 0) {
      runtimeLogger.debug(
        `Cleaned up context cache: ${toDelete.length} contexts, ${migrationToDelete.length} migration states`
      );
    }
  }
}

/**
 * Factory function to create the runtime context adapter
 */
export function createRuntimeContextAdapter(
  contextManager: ContextManager,
  config?: RuntimeContextAdapterConfig
): RuntimeContextAdapter {
  return new RuntimeContextAdapter(contextManager, config);
}