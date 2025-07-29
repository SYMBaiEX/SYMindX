/**
 * Context Aggregator for Multi-Agent Systems
 * 
 * Combines contexts from multiple agents using various aggregation strategies
 * while handling conflicts and maintaining data integrity.
 */

import {
  AgentContext,
  AggregationStrategy,
  ContextAggregationConfig,
  ContextConflict,
  ConflictResolutionStrategy,
  VectorClock
} from '../../../types/context/multi-agent-context';
import { AgentId, OperationResult } from '../../../types/helpers';
import { Priority } from '../../../types/enums';
import { runtimeLogger } from '../../../utils/logger';

/**
 * Aggregates contexts from multiple agents
 */
export class ContextAggregator {
  private conflictHistory: Map<string, ContextConflict[]> = new Map();

  /**
   * Aggregate contexts from multiple agents
   */
  async aggregateContexts(
    contexts: AgentContext[],
    config: ContextAggregationConfig
  ): Promise<AgentContext> {
    try {
      if (contexts.length === 0) {
        throw new Error('No contexts provided for aggregation');
      }

      if (contexts.length === 1) {
        return contexts[0];
      }

      // Filter contexts by age if specified
      const filteredContexts = this.filterContextsByAge(contexts, config.maxContextAge);

      runtimeLogger.debug('Starting context aggregation', {
        strategy: config.strategy,
        contextCount: filteredContexts.length,
        includeMetadata: config.includeMetadata
      });

      // Detect conflicts before aggregation
      const conflicts = await this.detectConflicts(filteredContexts);
      
      // Resolve conflicts if any exist
      const resolvedContexts = conflicts.length > 0
        ? await this.resolveConflictsInContexts(filteredContexts, conflicts, config.conflictResolution)
        : filteredContexts;

      // Perform aggregation based on strategy
      const aggregatedContext = await this.performAggregation(resolvedContexts, config);

      // Add aggregation metadata if requested
      if (config.includeMetadata) {
        aggregatedContext.aggregationMetadata = {
          strategy: config.strategy,
          sourceAgents: resolvedContexts.map(c => c.agentId),
          aggregatedAt: new Date().toISOString(),
          conflictsResolved: conflicts.length,
          resolvedConflicts: conflicts
        };
      }

      runtimeLogger.debug('Context aggregation completed', {
        resultVersion: aggregatedContext.version,
        sourceAgents: resolvedContexts.length,
        conflictsResolved: conflicts.length
      });

      return aggregatedContext;

    } catch (error) {
      runtimeLogger.error('Context aggregation failed', error as Error, {
        strategy: config.strategy,
        contextCount: contexts.length
      });
      throw error;
    }
  }

  /**
   * Detect conflicts between contexts
   */
  async detectConflicts(contexts: AgentContext[]): Promise<ContextConflict[]> {
    const conflicts: ContextConflict[] = [];
    const fieldMap = new Map<string, Map<AgentId, unknown>>();

    // Build field map with values from each agent
    for (const context of contexts) {
      for (const [field, value] of Object.entries(context)) {
        if (!fieldMap.has(field)) {
          fieldMap.set(field, new Map());
        }
        fieldMap.get(field)!.set(context.agentId, value);
      }
    }

    // Check for conflicts in each field
    for (const [field, agentValues] of fieldMap.entries()) {
      if (agentValues.size > 1) {
        const values = Array.from(agentValues.values());
        const uniqueValues = new Set(values.map(v => JSON.stringify(v)));
        
        if (uniqueValues.size > 1) {
          // Conflict detected
          const conflict: ContextConflict = {
            conflictId: `conflict_${field}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            fieldPath: field,
            conflictingAgents: Array.from(agentValues.keys()),
            values: Object.fromEntries(agentValues.entries()),
            resolutionStrategy: 'last_writer_wins', // Default strategy
            resolved: false
          };

          conflicts.push(conflict);
        }
      }
    }

    return conflicts;
  }

  /**
   * Resolve conflicts in contexts
   */
  async resolveConflictsInContexts(
    contexts: AgentContext[],
    conflicts: ContextConflict[],
    strategy: ConflictResolutionStrategy
  ): Promise<AgentContext[]> {
    const resolvedContexts = contexts.map(c => ({ ...c }));

    for (const conflict of conflicts) {
      const resolvedValue = await this.resolveConflict(conflict, strategy, contexts);
      
      // Apply resolved value to all contexts
      for (const context of resolvedContexts) {
        if (conflict.conflictingAgents.includes(context.agentId)) {
          (context as any)[conflict.fieldPath] = resolvedValue;
        }
      }

      // Mark conflict as resolved
      conflict.resolved = true;
      conflict.resolvedAt = new Date().toISOString();
      conflict.resolvedValue = resolvedValue;
      conflict.resolutionStrategy = strategy;

      // Store in history
      const historyKey = conflict.fieldPath;
      if (!this.conflictHistory.has(historyKey)) {
        this.conflictHistory.set(historyKey, []);
      }
      this.conflictHistory.get(historyKey)!.push(conflict);
    }

    return resolvedContexts;
  }

  /**
   * Resolve a single conflict using the specified strategy
   */
  async resolveConflict(
    conflict: ContextConflict,
    strategy: ConflictResolutionStrategy,
    contexts: AgentContext[]
  ): Promise<unknown> {
    switch (strategy) {
      case 'last_writer_wins':
        return this.resolveLastWriterWins(conflict, contexts);
      
      case 'first_writer_wins':
        return this.resolveFirstWriterWins(conflict, contexts);
      
      case 'priority_based':
        return this.resolvePriorityBased(conflict, contexts);
      
      case 'merge_values':
        return this.resolveMergeValues(conflict);
      
      case 'consensus_based':
        return this.resolveConsensusBased(conflict);
      
      case 'manual_resolution':
        return this.resolveManually(conflict);
      
      case 'custom':
        return this.resolveCustom(conflict, contexts);
      
      default:
        runtimeLogger.warn('Unknown conflict resolution strategy, using last_writer_wins', {
          strategy,
          conflictId: conflict.conflictId
        });
        return this.resolveLastWriterWins(conflict, contexts);
    }
  }

  /**
   * Perform aggregation based on strategy
   */
  private async performAggregation(
    contexts: AgentContext[],
    config: ContextAggregationConfig
  ): Promise<AgentContext> {
    switch (config.strategy) {
      case 'union':
        return this.aggregateUnion(contexts);
      
      case 'intersection':
        return this.aggregateIntersection(contexts);
      
      case 'weighted_merge':
        return this.aggregateWeightedMerge(contexts, config.weights || {});
      
      case 'priority_based':
        return this.aggregatePriorityBased(contexts, config.priorities || {});
      
      case 'consensus_based':
        return this.aggregateConsensusBased(contexts);
      
      case 'custom':
        if (config.customAggregator) {
          return config.customAggregator(contexts);
        }
        throw new Error('Custom aggregator not provided');
      
      default:
        runtimeLogger.warn('Unknown aggregation strategy, using union', {
          strategy: config.strategy
        });
        return this.aggregateUnion(contexts);
    }
  }

  /**
   * Union aggregation - combines all fields from all contexts
   */
  private aggregateUnion(contexts: AgentContext[]): AgentContext {
    const baseContext = { ...contexts[0] };
    
    for (let i = 1; i < contexts.length; i++) {
      const context = contexts[i];
      
      for (const [key, value] of Object.entries(context)) {
        if (!(key in baseContext) || baseContext[key as keyof AgentContext] === undefined) {
          (baseContext as any)[key] = value;
        }
      }
    }

    // Update metadata
    baseContext.version = Math.max(...contexts.map(c => c.version)) + 1;
    baseContext.lastModified = new Date().toISOString();
    baseContext.sharedWith = Array.from(new Set(contexts.flatMap(c => c.sharedWith)));
    baseContext.vectorClock = this.mergeVectorClocks(contexts.map(c => c.vectorClock));

    return baseContext;
  }

  /**
   * Intersection aggregation - only keeps fields present in all contexts
   */
  private aggregateIntersection(contexts: AgentContext[]): AgentContext {
    const baseContext = { ...contexts[0] };
    
    // Find common fields
    const commonFields = new Set(Object.keys(contexts[0]));
    for (let i = 1; i < contexts.length; i++) {
      const contextFields = new Set(Object.keys(contexts[i]));
      for (const field of commonFields) {
        if (!contextFields.has(field)) {
          commonFields.delete(field);
        }
      }
    }

    // Keep only common fields
    const result: Partial<AgentContext> = {};
    for (const field of commonFields) {
      (result as any)[field] = (baseContext as any)[field];
    }

    // Ensure required fields
    const finalContext = result as AgentContext;
    finalContext.version = Math.max(...contexts.map(c => c.version)) + 1;
    finalContext.lastModified = new Date().toISOString();
    finalContext.vectorClock = this.mergeVectorClocks(contexts.map(c => c.vectorClock));

    return finalContext;
  }

  /**
   * Weighted merge aggregation
   */
  private aggregateWeightedMerge(
    contexts: AgentContext[],
    weights: Record<AgentId, number>
  ): AgentContext {
    const baseContext = { ...contexts[0] };
    const totalWeight = contexts.reduce((sum, ctx) => sum + (weights[ctx.agentId] || 1), 0);

    // For numeric fields, compute weighted average
    for (const key of Object.keys(baseContext)) {
      const values = contexts
        .map(ctx => (ctx as any)[key])
        .filter(val => typeof val === 'number');
      
      if (values.length === contexts.length) {
        // All values are numeric, compute weighted average
        const weightedSum = contexts.reduce((sum, ctx, idx) => {
          const weight = weights[ctx.agentId] || 1;
          return sum + ((ctx as any)[key] * weight);
        }, 0);
        
        (baseContext as any)[key] = weightedSum / totalWeight;
      }
    }

    baseContext.version = Math.max(...contexts.map(c => c.version)) + 1;
    baseContext.lastModified = new Date().toISOString();
    baseContext.vectorClock = this.mergeVectorClocks(contexts.map(c => c.vectorClock));

    return baseContext;
  }

  /**
   * Priority-based aggregation
   */
  private aggregatePriorityBased(
    contexts: AgentContext[],
    priorities: Record<AgentId, Priority>
  ): AgentContext {
    // Sort contexts by priority (High -> Medium -> Low)
    const sortedContexts = contexts.sort((a, b) => {
      const priorityA = priorities[a.agentId] || Priority.Medium;
      const priorityB = priorities[b.agentId] || Priority.Medium;
      return priorityB - priorityA; // Higher priority first
    });

    // Use highest priority context as base, fill in missing fields from lower priority
    const result = { ...sortedContexts[0] };
    
    for (let i = 1; i < sortedContexts.length; i++) {
      const context = sortedContexts[i];
      
      for (const [key, value] of Object.entries(context)) {
        if (!(key in result) || result[key as keyof AgentContext] === undefined) {
          (result as any)[key] = value;
        }
      }
    }

    result.version = Math.max(...contexts.map(c => c.version)) + 1;
    result.lastModified = new Date().toISOString();
    result.vectorClock = this.mergeVectorClocks(contexts.map(c => c.vectorClock));

    return result;
  }

  /**
   * Consensus-based aggregation
   */
  private aggregateConsensusBased(contexts: AgentContext[]): AgentContext {
    const baseContext = { ...contexts[0] };
    const requiredConsensus = Math.ceil(contexts.length / 2); // Majority

    for (const key of Object.keys(baseContext)) {
      const valueFreq = new Map<string, number>();
      
      // Count frequency of each value
      for (const context of contexts) {
        const value = JSON.stringify((context as any)[key]);
        valueFreq.set(value, (valueFreq.get(value) || 0) + 1);
      }

      // Find consensus value (most frequent that meets threshold)
      let consensusValue = undefined;
      let maxCount = 0;
      
      for (const [value, count] of valueFreq.entries()) {
        if (count >= requiredConsensus && count > maxCount) {
          consensusValue = JSON.parse(value);
          maxCount = count;
        }
      }

      if (consensusValue !== undefined) {
        (baseContext as any)[key] = consensusValue;
      }
      // If no consensus, keep original value
    }

    baseContext.version = Math.max(...contexts.map(c => c.version)) + 1;
    baseContext.lastModified = new Date().toISOString();
    baseContext.vectorClock = this.mergeVectorClocks(contexts.map(c => c.vectorClock));

    return baseContext;
  }

  /**
   * Conflict resolution strategies
   */
  private resolveLastWriterWins(conflict: ContextConflict, contexts: AgentContext[]): unknown {
    let latestContext = contexts[0];
    let latestTime = new Date(contexts[0].lastModified);

    for (const context of contexts.slice(1)) {
      const contextTime = new Date(context.lastModified);
      if (contextTime > latestTime) {
        latestContext = context;
        latestTime = contextTime;
      }
    }

    return conflict.values[latestContext.agentId];
  }

  private resolveFirstWriterWins(conflict: ContextConflict, contexts: AgentContext[]): unknown {
    let earliestContext = contexts[0];
    let earliestTime = new Date(contexts[0].lastModified);

    for (const context of contexts.slice(1)) {
      const contextTime = new Date(context.lastModified);
      if (contextTime < earliestTime) {
        earliestContext = context;
        earliestTime = contextTime;
      }
    }

    return conflict.values[earliestContext.agentId];
  }

  private resolvePriorityBased(conflict: ContextConflict, contexts: AgentContext[]): unknown {
    // In a real implementation, this would use agent priorities
    // For now, use the first conflicting agent
    const firstAgent = conflict.conflictingAgents[0];
    return conflict.values[firstAgent];
  }

  private resolveMergeValues(conflict: ContextConflict): unknown {
    const values = Object.values(conflict.values);
    
    // If all values are arrays, merge them
    if (values.every(v => Array.isArray(v))) {
      return Array.from(new Set(values.flat()));
    }
    
    // If all values are objects, merge them
    if (values.every(v => typeof v === 'object' && v !== null && !Array.isArray(v))) {
      return Object.assign({}, ...values);
    }
    
    // If all values are strings, concatenate them
    if (values.every(v => typeof v === 'string')) {
      return values.join(' ');
    }
    
    // Default: return first value
    return values[0];
  }

  private resolveConsensusBased(conflict: ContextConflict): unknown {
    const valueFreq = new Map<string, { value: unknown; count: number }>();
    
    for (const value of Object.values(conflict.values)) {
      const key = JSON.stringify(value);
      if (valueFreq.has(key)) {
        valueFreq.get(key)!.count++;
      } else {
        valueFreq.set(key, { value, count: 1 });
      }
    }

    // Return most frequent value
    let maxCount = 0;
    let consensusValue = Object.values(conflict.values)[0];
    
    for (const { value, count } of valueFreq.values()) {
      if (count > maxCount) {
        maxCount = count;
        consensusValue = value;
      }
    }

    return consensusValue;
  }

  private resolveManually(conflict: ContextConflict): unknown {
    // In a real implementation, this would trigger manual resolution process
    // For now, return first value and log
    runtimeLogger.warn('Manual conflict resolution required', {
      conflictId: conflict.conflictId,
      fieldPath: conflict.fieldPath
    });
    
    return Object.values(conflict.values)[0];
  }

  private resolveCustom(conflict: ContextConflict, contexts: AgentContext[]): unknown {
    // In a real implementation, this would use custom resolution logic
    // For now, use last writer wins
    return this.resolveLastWriterWins(conflict, contexts);
  }

  /**
   * Merge vector clocks from multiple contexts
   */
  private mergeVectorClocks(vectorClocks: VectorClock[]): VectorClock {
    const mergedClocks: Record<AgentId, number> = {};
    let maxVersion = 0;

    for (const vectorClock of vectorClocks) {
      maxVersion = Math.max(maxVersion, vectorClock.version);
      
      for (const [agentId, clock] of Object.entries(vectorClock.clocks)) {
        mergedClocks[agentId] = Math.max(mergedClocks[agentId] || 0, clock);
      }
    }

    return {
      clocks: mergedClocks,
      version: maxVersion + 1
    };
  }

  /**
   * Filter contexts by maximum age
   */
  private filterContextsByAge(
    contexts: AgentContext[],
    maxAge?: number
  ): AgentContext[] {
    if (!maxAge) {
      return contexts;
    }

    const cutoffTime = new Date(Date.now() - maxAge);
    return contexts.filter(context => 
      new Date(context.lastModified) >= cutoffTime
    );
  }

  /**
   * Get conflict history for a field
   */
  getConflictHistory(fieldPath: string): ContextConflict[] {
    return this.conflictHistory.get(fieldPath) || [];
  }

  /**
   * Get aggregation statistics
   */
  getStatistics() {
    const totalConflicts = Array.from(this.conflictHistory.values())
      .reduce((sum, conflicts) => sum + conflicts.length, 0);
    
    const resolvedConflicts = Array.from(this.conflictHistory.values())
      .reduce((sum, conflicts) => sum + conflicts.filter(c => c.resolved).length, 0);

    return {
      totalConflicts,
      resolvedConflicts,
      unresolvedConflicts: totalConflicts - resolvedConflicts,
      fieldsWithConflicts: this.conflictHistory.size
    };
  }

  /**
   * Clear conflict history
   */
  clearHistory(): void {
    this.conflictHistory.clear();
  }
}