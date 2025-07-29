/**
 * Context Conflict Resolver for Multi-Agent Systems
 * 
 * Handles detection, analysis, and resolution of context conflicts
 * between multiple agents using various resolution strategies.
 */

import { EventEmitter } from 'events';
import {
  ContextConflict,
  ConflictResolutionStrategy,
  AgentContext,
  ContextConsensusState,
  ContextVote
} from '../../../types/context/multi-agent-context';
import { AgentId, OperationResult } from '../../../types/helpers';
import { runtimeLogger } from '../../../utils/logger';

/**
 * Conflict resolution result
 */
export interface ConflictResolutionResult {
  conflictId: string;
  resolved: boolean;
  strategy: ConflictResolutionStrategy;
  resolvedValue: unknown;
  metadata: {
    resolutionTime: number;
    votesRequired?: number;
    votesReceived?: number;
    consensusReached?: boolean;
  };
}

/**
 * Manages context conflicts and their resolution
 */
export class ContextConflictResolver extends EventEmitter {
  private pendingConflicts: Map<string, ContextConflict> = new Map();
  private resolutionStrategies: Map<ConflictResolutionStrategy, (conflict: ContextConflict) => Promise<unknown>> = new Map();
  private consensusStates: Map<string, ContextConsensusState> = new Map();
  private manualResolutionQueue: ContextConflict[] = [];

  constructor() {
    super();
    this.initializeResolutionStrategies();
    this.setupConsensusTimeouts();
  }

  /**
   * Resolve multiple conflicts using specified strategies
   */
  async resolveConflicts(
    conflicts: ContextConflict[],
    defaultStrategy: ConflictResolutionStrategy = 'last_writer_wins'
  ): Promise<OperationResult> {
    try {
      const results: ConflictResolutionResult[] = [];
      const startTime = Date.now();

      runtimeLogger.debug('Starting conflict resolution', {
        conflictCount: conflicts.length,
        defaultStrategy
      });

      for (const conflict of conflicts) {
        if (conflict.resolved) {
          continue; // Skip already resolved conflicts
        }

        const strategy = conflict.resolutionStrategy || defaultStrategy;
        const result = await this.resolveSingleConflict(conflict, strategy);
        results.push(result);

        // Update conflict status
        if (result.resolved) {
          conflict.resolved = true;
          conflict.resolvedAt = new Date().toISOString();
          conflict.resolvedValue = result.resolvedValue;
          conflict.resolutionStrategy = strategy;

          this.emit('conflictResolved', {
            conflictId: conflict.conflictId,
            strategy,
            resolvedValue: result.resolvedValue
          });
        } else {
          this.pendingConflicts.set(conflict.conflictId, conflict);
          
          this.emit('conflictUnresolved', {
            conflictId: conflict.conflictId,
            strategy,
            reason: 'Resolution failed or requires manual intervention'
          });
        }
      }

      const resolutionTime = Date.now() - startTime;
      const resolvedCount = results.filter(r => r.resolved).length;

      runtimeLogger.debug('Conflict resolution completed', {
        totalConflicts: conflicts.length,
        resolvedCount,
        resolutionTime,
        pendingCount: this.pendingConflicts.size
      });

      return {
        success: true,
        data: {
          resolvedConflicts: resolvedCount,
          totalConflicts: conflicts.length,
          resolutionTime,
          results
        },
        metadata: {
          operation: 'resolveConflicts',
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      runtimeLogger.error('Conflict resolution failed', error as Error, {
        conflictCount: conflicts.length,
        defaultStrategy
      });

      return {
        success: false,
        error: `Conflict resolution failed: ${(error as Error).message}`,
        metadata: {
          operation: 'resolveConflicts',
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Resolve a single conflict
   */
  async resolveSingleConflict(
    conflict: ContextConflict,
    strategy: ConflictResolutionStrategy
  ): Promise<ConflictResolutionResult> {
    const startTime = Date.now();

    try {
      const resolverFunction = this.resolutionStrategies.get(strategy);
      if (!resolverFunction) {
        throw new Error(`Unknown resolution strategy: ${strategy}`);
      }

      const resolvedValue = await resolverFunction(conflict);
      const resolutionTime = Date.now() - startTime;

      runtimeLogger.debug('Conflict resolved', {
        conflictId: conflict.conflictId,
        strategy,
        fieldPath: conflict.fieldPath,
        resolutionTime
      });

      return {
        conflictId: conflict.conflictId,
        resolved: true,
        strategy,
        resolvedValue,
        metadata: {
          resolutionTime
        }
      };

    } catch (error) {
      const resolutionTime = Date.now() - startTime;

      runtimeLogger.error('Failed to resolve conflict', error as Error, {
        conflictId: conflict.conflictId,
        strategy,
        fieldPath: conflict.fieldPath
      });

      return {
        conflictId: conflict.conflictId,
        resolved: false,
        strategy,
        resolvedValue: undefined,
        metadata: {
          resolutionTime,
          error: (error as Error).message
        }
      };
    }
  }

  /**
   * Start consensus-based resolution for a conflict
   */
  async startConsensusResolution(
    conflict: ContextConflict,
    participatingAgents: AgentId[],
    timeoutMs: number = 30000
  ): Promise<OperationResult> {
    try {
      const consensusId = `consensus_${conflict.conflictId}_${Date.now()}`;
      const expiresAt = new Date(Date.now() + timeoutMs).toISOString();

      const consensusState: ContextConsensusState = {
        proposalId: consensusId,
        proposedBy: conflict.conflictingAgents[0], // First conflicting agent proposes
        proposedAt: new Date().toISOString(),
        votes: {},
        requiredVotes: Math.ceil(participatingAgents.length / 2), // Majority
        status: 'pending',
        expiresAt
      };

      this.consensusStates.set(consensusId, consensusState);

      // Set timeout for consensus
      setTimeout(() => {
        this.handleConsensusTimeout(consensusId);
      }, timeoutMs);

      this.emit('consensusStarted', {
        conflictId: conflict.conflictId,
        consensusId,
        participatingAgents,
        expiresAt
      });

      runtimeLogger.debug('Consensus resolution started', {
        conflictId: conflict.conflictId,
        consensusId,
        participatingAgents: participatingAgents.length,
        timeoutMs
      });

      return {
        success: true,
        data: {
          consensusId,
          expiresAt,
          requiredVotes: consensusState.requiredVotes
        },
        metadata: {
          operation: 'startConsensusResolution',
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      return {
        success: false,
        error: `Failed to start consensus: ${(error as Error).message}`,
        metadata: {
          operation: 'startConsensusResolution',
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Submit a vote for consensus-based resolution
   */
  async submitConsensusVote(
    consensusId: string,
    agentId: AgentId,
    vote: 'approve' | 'reject' | 'abstain',
    reason?: string
  ): Promise<OperationResult> {
    try {
      const consensusState = this.consensusStates.get(consensusId);
      if (!consensusState) {
        return {
          success: false,
          error: 'Consensus proposal not found',
          metadata: { operation: 'submitConsensusVote' }
        };
      }

      if (consensusState.status !== 'pending') {
        return {
          success: false,
          error: `Consensus already ${consensusState.status}`,
          metadata: { operation: 'submitConsensusVote' }
        };
      }

      if (new Date() > new Date(consensusState.expiresAt)) {
        consensusState.status = 'timeout';
        return {
          success: false,
          error: 'Consensus proposal has expired',
          metadata: { operation: 'submitConsensusVote' }
        };
      }

      // Record the vote
      const contextVote: ContextVote = {
        agentId,
        vote,
        timestamp: new Date().toISOString(),
        reason
      };

      consensusState.votes[agentId] = contextVote;

      // Check if consensus is reached
      const approveVotes = Object.values(consensusState.votes)
        .filter(v => v.vote === 'approve').length;
      const rejectVotes = Object.values(consensusState.votes)
        .filter(v => v.vote === 'reject').length;

      let consensusReached = false;

      if (approveVotes >= consensusState.requiredVotes) {
        consensusState.status = 'accepted';
        consensusReached = true;
        this.emit('consensusReached', {
          consensusId,
          result: 'accepted',
          approveVotes,
          totalVotes: Object.keys(consensusState.votes).length
        });
      } else if (rejectVotes >= consensusState.requiredVotes) {
        consensusState.status = 'rejected';
        consensusReached = true;
        this.emit('consensusReached', {
          consensusId,
          result: 'rejected',
          rejectVotes,
          totalVotes: Object.keys(consensusState.votes).length
        });
      }

      runtimeLogger.debug('Consensus vote submitted', {
        consensusId,
        agentId,
        vote,
        approveVotes,
        rejectVotes,
        consensusReached
      });

      return {
        success: true,
        data: {
          consensusReached,
          currentStatus: consensusState.status,
          approveVotes,
          rejectVotes,
          totalVotes: Object.keys(consensusState.votes).length
        },
        metadata: {
          operation: 'submitConsensusVote',
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      return {
        success: false,
        error: `Failed to submit vote: ${(error as Error).message}`,
        metadata: {
          operation: 'submitConsensusVote',
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Queue conflict for manual resolution
   */
  async queueForManualResolution(conflict: ContextConflict): Promise<OperationResult> {
    try {
      if (!this.manualResolutionQueue.find(c => c.conflictId === conflict.conflictId)) {
        this.manualResolutionQueue.push(conflict);
        
        this.emit('manualResolutionQueued', {
          conflictId: conflict.conflictId,
          fieldPath: conflict.fieldPath,
          queuePosition: this.manualResolutionQueue.length
        });

        runtimeLogger.debug('Conflict queued for manual resolution', {
          conflictId: conflict.conflictId,
          queuePosition: this.manualResolutionQueue.length
        });
      }

      return {
        success: true,
        data: {
          queuePosition: this.manualResolutionQueue.findIndex(c => c.conflictId === conflict.conflictId) + 1,
          totalQueued: this.manualResolutionQueue.length
        },
        metadata: {
          operation: 'queueForManualResolution',
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      return {
        success: false,
        error: `Failed to queue for manual resolution: ${(error as Error).message}`,
        metadata: {
          operation: 'queueForManualResolution',
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Manually resolve a conflict
   */
  async manuallyResolveConflict(
    conflictId: string,
    resolvedValue: unknown,
    resolvedBy: AgentId
  ): Promise<OperationResult> {
    try {
      // Find conflict in pending conflicts
      const conflict = this.pendingConflicts.get(conflictId);
      if (!conflict) {
        // Check manual resolution queue
        const queueIndex = this.manualResolutionQueue.findIndex(c => c.conflictId === conflictId);
        if (queueIndex === -1) {
          return {
            success: false,
            error: 'Conflict not found',
            metadata: { operation: 'manuallyResolveConflict' }
          };
        }

        // Remove from queue and resolve
        const queuedConflict = this.manualResolutionQueue.splice(queueIndex, 1)[0];
        queuedConflict.resolved = true;
        queuedConflict.resolvedAt = new Date().toISOString();
        queuedConflict.resolvedValue = resolvedValue;
        queuedConflict.resolvedBy = resolvedBy;
        queuedConflict.resolutionStrategy = 'manual_resolution';

        this.emit('conflictResolvedManually', {
          conflictId,
          resolvedBy,
          resolvedValue
        });

        return {
          success: true,
          data: {
            conflictId,
            resolvedValue,
            resolvedBy
          },
          metadata: {
            operation: 'manuallyResolveConflict',
            timestamp: new Date().toISOString()
          }
        };
      }

      // Resolve pending conflict
      conflict.resolved = true;
      conflict.resolvedAt = new Date().toISOString();
      conflict.resolvedValue = resolvedValue;
      conflict.resolvedBy = resolvedBy;
      conflict.resolutionStrategy = 'manual_resolution';

      this.pendingConflicts.delete(conflictId);

      this.emit('conflictResolvedManually', {
        conflictId,
        resolvedBy,
        resolvedValue
      });

      runtimeLogger.debug('Conflict manually resolved', {
        conflictId,
        resolvedBy,
        fieldPath: conflict.fieldPath
      });

      return {
        success: true,
        data: {
          conflictId,
          resolvedValue,
          resolvedBy
        },
        metadata: {
          operation: 'manuallyResolveConflict',
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      return {
        success: false,
        error: `Manual resolution failed: ${(error as Error).message}`,
        metadata: {
          operation: 'manuallyResolveConflict',
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Initialize resolution strategies
   */
  private initializeResolutionStrategies(): void {
    this.resolutionStrategies.set('last_writer_wins', this.resolveLastWriterWins.bind(this));
    this.resolutionStrategies.set('first_writer_wins', this.resolveFirstWriterWins.bind(this));
    this.resolutionStrategies.set('priority_based', this.resolvePriorityBased.bind(this));
    this.resolutionStrategies.set('merge_values', this.resolveMergeValues.bind(this));
    this.resolutionStrategies.set('consensus_based', this.resolveConsensusBased.bind(this));
    this.resolutionStrategies.set('manual_resolution', this.resolveManual.bind(this));
    this.resolutionStrategies.set('custom', this.resolveCustom.bind(this));
  }

  /**
   * Resolution strategy implementations
   */
  private async resolveLastWriterWins(conflict: ContextConflict): Promise<unknown> {
    // For now, just return the first value (in a real implementation, 
    // we'd need timestamp information)
    return Object.values(conflict.values)[0];
  }

  private async resolveFirstWriterWins(conflict: ContextConflict): Promise<unknown> {
    // For now, just return the first value
    return Object.values(conflict.values)[0];
  }

  private async resolvePriorityBased(conflict: ContextConflict): Promise<unknown> {
    // In a real implementation, this would use agent priorities
    return Object.values(conflict.values)[0];
  }

  private async resolveMergeValues(conflict: ContextConflict): Promise<unknown> {
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

  private async resolveConsensusBased(conflict: ContextConflict): Promise<unknown> {
    // For existing conflicts, we can't start a new consensus process
    // This would need to be handled differently in a real implementation
    throw new Error('Consensus-based resolution requires active consensus process');
  }

  private async resolveManual(conflict: ContextConflict): Promise<unknown> {
    // Queue for manual resolution
    await this.queueForManualResolution(conflict);
    throw new Error('Conflict queued for manual resolution');
  }

  private async resolveCustom(conflict: ContextConflict): Promise<unknown> {
    // In a real implementation, this would use custom resolution logic
    // For now, fall back to last writer wins
    return this.resolveLastWriterWins(conflict);
  }

  /**
   * Handle consensus timeout
   */
  private handleConsensusTimeout(consensusId: string): void {
    const consensusState = this.consensusStates.get(consensusId);
    if (!consensusState || consensusState.status !== 'pending') {
      return;
    }

    consensusState.status = 'timeout';

    this.emit('consensusTimeout', {
      consensusId,
      votesReceived: Object.keys(consensusState.votes).length,
      requiredVotes: consensusState.requiredVotes
    });

    runtimeLogger.warn('Consensus resolution timed out', {
      consensusId,
      votesReceived: Object.keys(consensusState.votes).length,
      requiredVotes: consensusState.requiredVotes
    });
  }

  /**
   * Setup periodic cleanup of expired consensus states
   */
  private setupConsensusTimeouts(): void {
    setInterval(() => {
      const now = new Date();
      for (const [consensusId, state] of this.consensusStates.entries()) {
        if (state.status === 'pending' && new Date(state.expiresAt) < now) {
          this.handleConsensusTimeout(consensusId);
        }
        
        // Clean up completed consensus states older than 1 hour
        if (state.status !== 'pending' && 
            new Date(state.proposedAt).getTime() < now.getTime() - 3600000) {
          this.consensusStates.delete(consensusId);
        }
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Get conflict resolution statistics
   */
  getStatistics() {
    const activeConsensus = Array.from(this.consensusStates.values())
      .filter(s => s.status === 'pending').length;
    
    const completedConsensus = Array.from(this.consensusStates.values())
      .filter(s => s.status !== 'pending').length;

    return {
      pendingConflicts: this.pendingConflicts.size,
      manualResolutionQueue: this.manualResolutionQueue.length,
      activeConsensusProcesses: activeConsensus,
      completedConsensusProcesses: completedConsensus,
      totalConsensusStates: this.consensusStates.size
    };
  }

  /**
   * Get pending conflicts
   */
  getPendingConflicts(): ContextConflict[] {
    return Array.from(this.pendingConflicts.values());
  }

  /**
   * Get manual resolution queue
   */
  getManualResolutionQueue(): ContextConflict[] {
    return [...this.manualResolutionQueue];
  }

  /**
   * Get consensus state
   */
  getConsensusState(consensusId: string): ContextConsensusState | undefined {
    return this.consensusStates.get(consensusId);
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.pendingConflicts.clear();
    this.manualResolutionQueue.length = 0;
    this.consensusStates.clear();
    this.removeAllListeners();
  }
}