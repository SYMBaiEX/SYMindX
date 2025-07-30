/**
 * Multi-Agent Context Orchestration for SYMindX
 *
 * Provides context sharing and coordination capabilities between multiple agents
 * with security, privacy, and performance considerations.
 */

import { EventEmitter } from 'events';
import { Agent } from '../types/agent';
import { contextCache, ContextCacheKeyGenerator } from './context-cache';
import { contextTracer } from './context-observability';
import { runtimeLogger } from './logger';

/**
 * Context sharing permissions
 */
export interface ContextPermissions {
  read: boolean;
  write: boolean;
  share: boolean;
  fields?: string[]; // Specific fields allowed
  excludeFields?: string[]; // Fields to exclude
  ttl?: number; // Permission expiry
}

/**
 * Context sharing request
 */
export interface ContextSharingRequest {
  fromAgentId: string;
  toAgentId: string;
  contextData: any;
  permissions: ContextPermissions;
  purpose?: string;
  requestId?: string;
}

/**
 * Context aggregation strategy
 */
export type AggregationStrategy = 'merge' | 'override' | 'append' | 'custom';

/**
 * Context conflict resolution
 */
export interface ConflictResolution {
  field: string;
  strategy: 'newest' | 'oldest' | 'highest_confidence' | 'source_priority';
  customResolver?: (values: any[]) => any;
}

/**
 * Shared context metadata
 */
export interface SharedContextMetadata {
  sharedBy: string;
  sharedWith: string[];
  sharedAt: Date;
  permissions: ContextPermissions;
  purpose?: string;
}

/**
 * Multi-agent context orchestrator
 */
export class MultiAgentContextOrchestrator extends EventEmitter {
  private sharedContexts: Map<string, Map<string, any>> = new Map(); // agentId -> shared contexts
  private permissions: Map<string, Map<string, ContextPermissions>> = new Map(); // fromAgent -> toAgent -> permissions
  private contextSubscriptions: Map<string, Set<string>> = new Map(); // contextId -> subscriber agentIds
  private conflictRules: Map<string, ConflictResolution[]> = new Map();

  /**
   * Share context between agents
   */
  async shareContext(request: ContextSharingRequest): Promise<void> {
    const traceId = contextTracer.startTrace(
      'context:share',
      request.fromAgentId
    );

    try {
      // Validate permissions
      if (!this.validateSharingPermissions(request)) {
        throw new Error('Invalid sharing permissions');
      }

      // Filter context based on permissions
      const filteredContext = this.filterContext(
        request.contextData,
        request.permissions
      );

      // Store shared context
      const sharedKey = `shared:${request.fromAgentId}:${request.toAgentId}`;
      if (!this.sharedContexts.has(request.toAgentId)) {
        this.sharedContexts.set(request.toAgentId, new Map());
      }

      this.sharedContexts.get(request.toAgentId)!.set(sharedKey, {
        ...filteredContext,
        _metadata: {
          sharedBy: request.fromAgentId,
          sharedAt: new Date(),
          purpose: request.purpose,
        } as SharedContextMetadata,
      });

      // Store permissions
      if (!this.permissions.has(request.fromAgentId)) {
        this.permissions.set(request.fromAgentId, new Map());
      }
      this.permissions
        .get(request.fromAgentId)!
        .set(request.toAgentId, request.permissions);

      // Cache shared context
      await contextCache.set(sharedKey, filteredContext, {
        ttl: request.permissions.ttl,
      });

      // Emit sharing event
      this.emit('context:shared', {
        fromAgent: request.fromAgentId,
        toAgent: request.toAgentId,
        contextSize: JSON.stringify(filteredContext).length,
        purpose: request.purpose,
      });

      runtimeLogger.info('Context shared between agents', {
        from: request.fromAgentId,
        to: request.toAgentId,
        fields: Object.keys(filteredContext).length,
      });
    } catch (error) {
      contextTracer.endTrace(traceId, error as Error);
      throw error;
    }

    contextTracer.endTrace(traceId);
  }

  /**
   * Get shared contexts for an agent
   */
  async getSharedContexts(agentId: string): Promise<any[]> {
    const contexts: any[] = [];
    const agentContexts = this.sharedContexts.get(agentId);

    if (!agentContexts) {
      return contexts;
    }

    for (const [key, context] of agentContexts) {
      // Check cache first
      const cached = await contextCache.get(key);
      if (cached) {
        contexts.push(cached);
      } else {
        contexts.push(context);
      }
    }

    return contexts;
  }

  /**
   * Aggregate contexts from multiple agents
   */
  async aggregateContexts(
    agentIds: string[],
    strategy: AggregationStrategy = 'merge',
    options: {
      conflictResolution?: ConflictResolution[];
      includeShared?: boolean;
    } = {}
  ): Promise<any> {
    const traceId = contextTracer.startTrace('context:aggregate');
    const contexts: any[] = [];

    try {
      // Collect contexts from all agents
      for (const agentId of agentIds) {
        // Get agent's own context (would need agent reference in real implementation)
        const agentContextKey =
          ContextCacheKeyGenerator.forAgentContext(agentId);
        const agentContext = await contextCache.get(agentContextKey);

        if (agentContext) {
          contexts.push({
            ...agentContext,
            _source: agentId,
          });
        }

        // Include shared contexts if requested
        if (options.includeShared) {
          const sharedContexts = await this.getSharedContexts(agentId);
          contexts.push(
            ...sharedContexts.map((ctx) => ({ ...ctx, _source: agentId }))
          );
        }
      }

      // Apply aggregation strategy
      let aggregated: any = {};

      switch (strategy) {
        case 'merge':
          aggregated = this.mergeContexts(contexts, options.conflictResolution);
          break;
        case 'override':
          aggregated = contexts.reduce((acc, ctx) => ({ ...acc, ...ctx }), {});
          break;
        case 'append':
          aggregated = { contexts };
          break;
        default:
          aggregated = contexts;
      }

      // Cache aggregated result
      const aggregatedKey = `aggregated:${agentIds.join('-')}:${Date.now()}`;
      await contextCache.set(aggregatedKey, aggregated, { ttl: 60000 }); // 1 minute cache

      return aggregated;
    } finally {
      contextTracer.endTrace(traceId);
    }
  }

  /**
   * Subscribe to context updates
   */
  subscribeToContext(contextId: string, agentId: string): void {
    if (!this.contextSubscriptions.has(contextId)) {
      this.contextSubscriptions.set(contextId, new Set());
    }
    this.contextSubscriptions.get(contextId)!.add(agentId);

    this.emit('context:subscribed', { contextId, agentId });
  }

  /**
   * Unsubscribe from context updates
   */
  unsubscribeFromContext(contextId: string, agentId: string): void {
    const subscribers = this.contextSubscriptions.get(contextId);
    if (subscribers) {
      subscribers.delete(agentId);
      if (subscribers.size === 0) {
        this.contextSubscriptions.delete(contextId);
      }
    }

    this.emit('context:unsubscribed', { contextId, agentId });
  }

  /**
   * Notify subscribers of context update
   */
  notifyContextUpdate(contextId: string, updates: any): void {
    const subscribers = this.contextSubscriptions.get(contextId);
    if (!subscribers) return;

    for (const agentId of subscribers) {
      this.emit('context:updated', {
        contextId,
        agentId,
        updates,
      });
    }
  }

  /**
   * Resolve context conflicts
   */
  resolveConflicts(contexts: any[], rules?: ConflictResolution[]): any {
    const resolved: any = {};
    const allFields = new Set<string>();

    // Collect all fields
    contexts.forEach((ctx) => {
      Object.keys(ctx).forEach((field) => allFields.add(field));
    });

    // Resolve each field
    for (const field of allFields) {
      const values = contexts
        .filter((ctx) => field in ctx)
        .map((ctx) => ({
          value: ctx[field],
          source: ctx._source || 'unknown',
        }));

      if (values.length === 0) continue;
      if (values.length === 1) {
        resolved[field] = values[0].value;
        continue;
      }

      // Find resolution rule
      const rule = rules?.find((r) => r.field === field);

      if (rule?.customResolver) {
        resolved[field] = rule.customResolver(values.map((v) => v.value));
      } else if (rule) {
        resolved[field] = this.applyResolutionStrategy(values, rule.strategy);
      } else {
        // Default: use most recent
        resolved[field] = values[values.length - 1].value;
      }
    }

    return resolved;
  }

  /**
   * Clean up expired permissions and contexts
   */
  cleanup(): void {
    const now = Date.now();

    // Clean up expired permissions
    for (const [fromAgent, toAgentPerms] of this.permissions) {
      for (const [toAgent, perms] of toAgentPerms) {
        if (perms.ttl && now > perms.ttl) {
          toAgentPerms.delete(toAgent);
        }
      }
      if (toAgentPerms.size === 0) {
        this.permissions.delete(fromAgent);
      }
    }

    // Clean up old shared contexts
    for (const [agentId, contexts] of this.sharedContexts) {
      for (const [key, context] of contexts) {
        if (context._metadata?.sharedAt) {
          const age = now - context._metadata.sharedAt.getTime();
          if (age > 3600000) {
            // 1 hour
            contexts.delete(key);
          }
        }
      }
      if (contexts.size === 0) {
        this.sharedContexts.delete(agentId);
      }
    }
  }

  // Private helper methods

  private validateSharingPermissions(request: ContextSharingRequest): boolean {
    // Basic validation
    if (
      !request.permissions.read &&
      !request.permissions.write &&
      !request.permissions.share
    ) {
      return false;
    }

    // Validate TTL if specified
    if (request.permissions.ttl && request.permissions.ttl < Date.now()) {
      return false;
    }

    return true;
  }

  private filterContext(context: any, permissions: ContextPermissions): any {
    const filtered: any = {};

    // Apply field filtering
    if (permissions.fields) {
      // Whitelist approach
      permissions.fields.forEach((field) => {
        if (field in context) {
          filtered[field] = context[field];
        }
      });
    } else {
      // Copy all fields
      Object.assign(filtered, context);
    }

    // Apply exclusions
    if (permissions.excludeFields) {
      permissions.excludeFields.forEach((field) => {
        delete filtered[field];
      });
    }

    // Always exclude sensitive fields
    const sensitiveFields = [
      'password',
      'token',
      'key',
      'secret',
      'credential',
    ];
    sensitiveFields.forEach((field) => {
      delete filtered[field];
      // Also check for fields containing these terms
      Object.keys(filtered).forEach((key) => {
        if (key.toLowerCase().includes(field)) {
          delete filtered[key];
        }
      });
    });

    return filtered;
  }

  private mergeContexts(contexts: any[], rules?: ConflictResolution[]): any {
    if (contexts.length === 0) return {};
    if (contexts.length === 1) return contexts[0];

    return this.resolveConflicts(contexts, rules);
  }

  private applyResolutionStrategy(values: any[], strategy: string): any {
    switch (strategy) {
      case 'newest':
        return values[values.length - 1].value;
      case 'oldest':
        return values[0].value;
      case 'highest_confidence':
        // Assumes values have confidence scores
        return values.reduce((best, current) => {
          const currentConf = current.value?.confidence || 0;
          const bestConf = best.value?.confidence || 0;
          return currentConf > bestConf ? current : best;
        }).value;
      case 'source_priority':
        // Would need priority configuration
        return values[0].value;
      default:
        return values[values.length - 1].value;
    }
  }
}

// Export singleton instance
export const multiAgentOrchestrator = new MultiAgentContextOrchestrator();

// Periodic cleanup
setInterval(() => {
  multiAgentOrchestrator.cleanup();
}, 300000); // Every 5 minutes
