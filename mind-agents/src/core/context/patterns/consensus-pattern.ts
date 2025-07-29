/**
 * Consensus Pattern for Multi-Agent Context Coordination
 * 
 * Implements distributed consensus algorithms for achieving agreement
 * on context state across multiple agents.
 */

import { EventEmitter } from 'events';
import {
  AgentContext,
  ContextUpdate,
  ContextConsensusState,
  ContextVote
} from '../../../types/context/multi-agent-context';
import { AgentId, OperationResult } from '../../../types/helpers';
import { runtimeLogger } from '../../../utils/logger';

/**
 * Consensus proposal information
 */
export interface ConsensusProposal {
  proposalId: string;
  proposedBy: AgentId;
  proposedAt: string;
  context: AgentContext;
  update: ContextUpdate;
  participatingAgents: AgentId[];
  requiredVotes: number;
  timeoutMs: number;
  consensusState: ContextConsensusState;
  metadata?: Record<string, unknown>;
}

/**
 * Consensus round information for multi-round consensus
 */
export interface ConsensusRound {
  roundId: string;
  proposalId: string;
  roundNumber: number;
  startedAt: string;
  endedAt?: string;
  votes: ContextVote[];
  result: 'pending' | 'accepted' | 'rejected' | 'timeout';
  nextRoundNeeded: boolean;
}

/**
 * Agent participation in consensus
 */
export interface AgentParticipation {
  agentId: AgentId;
  joinedAt: string;
  lastActivity: string;
  votingWeight: number;
  isActive: boolean;
  responseTime: number;
  successfulVotes: number;
  totalVotes: number;
  reliability: number; // 0-1 scale
}

/**
 * Consensus algorithm configuration
 */
export interface ConsensusConfig {
  algorithm: 'simple_majority' | 'two_phase_commit' | 'raft' | 'pbft' | 'custom';
  requirementType: 'majority' | 'super_majority' | 'unanimous' | 'quorum' | 'weighted';
  threshold: number; // percentage for majority-based, absolute number for quorum
  maxRounds: number;
  roundTimeoutMs: number;
  participantTimeoutMs: number;
  allowPartialConsensus: boolean;
  retryFailedProposals: boolean;
  customAlgorithm?: (proposal: ConsensusProposal) => Promise<OperationResult>;
}

/**
 * Implements consensus-based coordination pattern
 */
export class ConsensusPattern extends EventEmitter {
  private activeProposals: Map<string, ConsensusProposal> = new Map();
  private consensusHistory: Map<string, ConsensusProposal[]> = new Map();
  private participants: Map<AgentId, AgentParticipation> = new Map();
  private consensusRounds: Map<string, ConsensusRound[]> = new Map();
  private timeouts: Map<string, NodeJS.Timeout> = new Map();
  private config: ConsensusConfig;

  private readonly defaultConfig: ConsensusConfig = {
    algorithm: 'simple_majority',
    requirementType: 'majority',
    threshold: 50, // 50% for majority
    maxRounds: 3,
    roundTimeoutMs: 30000, // 30 seconds
    participantTimeoutMs: 300000, // 5 minutes
    allowPartialConsensus: false,
    retryFailedProposals: true
  };

  constructor(config?: Partial<ConsensusConfig>) {
    super();
    this.config = { ...this.defaultConfig, ...config };
    this.setupCleanup();
  }

  /**
   * Start consensus process for context update
   */
  async startConsensus(
    proposedBy: AgentId,
    context: AgentContext,
    update: ContextUpdate,
    participatingAgents: AgentId[],
    options?: {
      timeoutMs?: number;
      metadata?: Record<string, unknown>;
      customRequirement?: {
        type: ConsensusConfig['requirementType'];
        threshold: number;
      };
    }
  ): Promise<OperationResult> {
    try {
      const proposalId = `consensus_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();

      runtimeLogger.debug('Starting consensus process', {
        proposalId,
        proposedBy,
        participants: participatingAgents.length,
        algorithm: this.config.algorithm
      });

      // Validate participants
      if (participatingAgents.length === 0) {
        return {
          success: false,
          error: 'No participating agents provided',
          metadata: { operation: 'startConsensus' }
        };
      }

      // Calculate required votes
      const requiredVotes = this.calculateRequiredVotes(
        participatingAgents.length,
        options?.customRequirement?.type || this.config.requirementType,
        options?.customRequirement?.threshold || this.config.threshold
      );

      // Create consensus state
      const consensusState: ContextConsensusState = {
        proposalId,
        proposedBy,
        proposedAt: now,
        votes: {},
        requiredVotes,
        status: 'pending',
        expiresAt: new Date(Date.now() + (options?.timeoutMs || this.config.roundTimeoutMs)).toISOString()
      };

      // Create proposal
      const proposal: ConsensusProposal = {
        proposalId,
        proposedBy,
        proposedAt: now,
        context,
        update,
        participatingAgents,
        requiredVotes,
        timeoutMs: options?.timeoutMs || this.config.roundTimeoutMs,
        consensusState,
        metadata: options?.metadata
      };

      this.activeProposals.set(proposalId, proposal);

      // Create first round
      const firstRound: ConsensusRound = {
        roundId: `${proposalId}_round_1`,
        proposalId,
        roundNumber: 1,
        startedAt: now,
        votes: [],
        result: 'pending',
        nextRoundNeeded: false
      };

      this.consensusRounds.set(proposalId, [firstRound]);

      // Set timeout
      const timeout = setTimeout(() => {
        this.handleConsensusTimeout(proposalId);
      }, proposal.timeoutMs);

      this.timeouts.set(proposalId, timeout);

      // Initialize participant tracking
      for (const agentId of participatingAgents) {
        this.initializeParticipant(agentId);
      }

      this.emit('consensusStarted', {
        proposalId,
        proposedBy,
        participatingAgents,
        requiredVotes,
        algorithm: this.config.algorithm,
        expiresAt: consensusState.expiresAt
      });

      return {
        success: true,
        data: {
          proposalId,
          requiredVotes,
          participatingAgents,
          expiresAt: consensusState.expiresAt
        },
        metadata: {
          operation: 'startConsensus',
          timestamp: now
        }
      };

    } catch (error) {
      runtimeLogger.error('Failed to start consensus', error as Error, {
        proposedBy,
        participants: participatingAgents.length
      });

      return {
        success: false,
        error: `Consensus start failed: ${(error as Error).message}`,
        metadata: {
          operation: 'startConsensus',
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Submit vote for consensus proposal
   */
  async submitVote(
    proposalId: string,
    agentId: AgentId,
    vote: 'approve' | 'reject' | 'abstain',
    reason?: string
  ): Promise<OperationResult> {
    try {
      const proposal = this.activeProposals.get(proposalId);
      if (!proposal) {
        return {
          success: false,
          error: 'Consensus proposal not found',
          metadata: { operation: 'submitVote' }
        };
      }

      // Check if agent is participant
      if (!proposal.participatingAgents.includes(agentId)) {
        return {
          success: false,
          error: 'Agent is not a participant in this consensus',
          metadata: { operation: 'submitVote' }
        };
      }

      // Check if consensus is still active
      if (proposal.consensusState.status !== 'pending') {
        return {
          success: false,
          error: `Consensus already ${proposal.consensusState.status}`,
          metadata: { operation: 'submitVote' }
        };
      }

      // Check if expired
      if (new Date() > new Date(proposal.consensusState.expiresAt)) {
        proposal.consensusState.status = 'timeout';
        return {
          success: false,
          error: 'Consensus proposal has expired',
          metadata: { operation: 'submitVote' }
        };
      }

      const now = new Date().toISOString();

      // Create vote
      const contextVote: ContextVote = {
        agentId,
        vote,
        timestamp: now,
        reason
      };

      // Record vote
      proposal.consensusState.votes[agentId] = contextVote;

      // Add to current round
      const rounds = this.consensusRounds.get(proposalId)!;
      const currentRound = rounds[rounds.length - 1];
      currentRound.votes.push(contextVote);

      // Update participant stats
      const participant = this.participants.get(agentId);
      if (participant) {
        participant.lastActivity = now;
        participant.totalVotes++;
      }

      // Check if consensus is reached
      const consensusResult = await this.evaluateConsensus(proposal);

      this.emit('voteSubmitted', {
        proposalId,
        agentId,
        vote,
        currentVotes: Object.keys(proposal.consensusState.votes).length,
        requiredVotes: proposal.requiredVotes,
        consensusReached: consensusResult.consensusReached
      });

      runtimeLogger.debug('Vote submitted', {
        proposalId,
        agentId,
        vote,
        currentVotes: Object.keys(proposal.consensusState.votes).length,
        requiredVotes: proposal.requiredVotes
      });

      return {
        success: true,
        data: {
          proposalId,
          voteSubmitted: true,
          consensusReached: consensusResult.consensusReached,
          currentStatus: proposal.consensusState.status,
          votingProgress: {
            currentVotes: Object.keys(proposal.consensusState.votes).length,
            requiredVotes: proposal.requiredVotes,
            totalParticipants: proposal.participatingAgents.length
          }
        },
        metadata: {
          operation: 'submitVote',
          timestamp: now
        }
      };

    } catch (error) {
      runtimeLogger.error('Failed to submit vote', error as Error, {
        proposalId,
        agentId,
        vote
      });

      return {
        success: false,
        error: `Vote submission failed: ${(error as Error).message}`,
        metadata: {
          operation: 'submitVote',
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Get consensus proposal status
   */
  getConsensusStatus(proposalId: string): ConsensusProposal | undefined {
    return this.activeProposals.get(proposalId);
  }

  /**
   * Get all active consensus proposals
   */
  getActiveProposals(): ConsensusProposal[] {
    return Array.from(this.activeProposals.values());
  }

  /**
   * Get consensus history for context
   */
  getConsensusHistory(contextKey: string): ConsensusProposal[] {
    return this.consensusHistory.get(contextKey) || [];
  }

  /**
   * Get agent participation statistics
   */
  getParticipantStats(agentId: AgentId): AgentParticipation | undefined {
    return this.participants.get(agentId);
  }

  /**
   * Calculate required votes based on requirement type
   */
  private calculateRequiredVotes(
    totalParticipants: number,
    requirementType: ConsensusConfig['requirementType'],
    threshold: number
  ): number {
    switch (requirementType) {
      case 'majority':
        return Math.floor(totalParticipants / 2) + 1;
      
      case 'super_majority':
        return Math.ceil(totalParticipants * (threshold / 100));
      
      case 'unanimous':
        return totalParticipants;
      
      case 'quorum':
        return Math.min(threshold, totalParticipants);
      
      case 'weighted':
        // For weighted voting, threshold represents the required weight percentage
        const totalWeight = Array.from(this.participants.values())
          .reduce((sum, p) => sum + p.votingWeight, 0);
        return Math.ceil(totalWeight * (threshold / 100));
      
      default:
        return Math.floor(totalParticipants / 2) + 1;
    }
  }

  /**
   * Evaluate if consensus has been reached
   */
  private async evaluateConsensus(proposal: ConsensusProposal): Promise<{ consensusReached: boolean; result: 'accepted' | 'rejected' | 'pending' }> {
    const votes = Object.values(proposal.consensusState.votes);
    const approveVotes = votes.filter(v => v.vote === 'approve').length;
    const rejectVotes = votes.filter(v => v.vote === 'reject').length;

    switch (this.config.algorithm) {
      case 'simple_majority':
        return this.evaluateSimpleMajority(proposal, approveVotes, rejectVotes);
      
      case 'two_phase_commit':
        return this.evaluateTwoPhaseCommit(proposal, approveVotes, rejectVotes);
      
      case 'raft':
        return this.evaluateRaft(proposal, approveVotes, rejectVotes);
      
      case 'pbft':
        return this.evaluatePBFT(proposal, approveVotes, rejectVotes);
      
      case 'custom':
        if (this.config.customAlgorithm) {
          const result = await this.config.customAlgorithm(proposal);
          return {
            consensusReached: result.success,
            result: result.success ? 'accepted' : 'rejected'
          };
        }
        // Fallback to simple majority
        return this.evaluateSimpleMajority(proposal, approveVotes, rejectVotes);
      
      default:
        return this.evaluateSimpleMajority(proposal, approveVotes, rejectVotes);
    }
  }

  /**
   * Evaluate simple majority consensus
   */
  private evaluateSimpleMajority(
    proposal: ConsensusProposal,
    approveVotes: number,
    rejectVotes: number
  ): { consensusReached: boolean; result: 'accepted' | 'rejected' | 'pending' } {
    if (approveVotes >= proposal.requiredVotes) {
      proposal.consensusState.status = 'accepted';
      this.finalizeConsensus(proposal, 'accepted');
      return { consensusReached: true, result: 'accepted' };
    }

    // Check if rejection is inevitable
    const remainingVotes = proposal.participatingAgents.length - (approveVotes + rejectVotes);
    if (approveVotes + remainingVotes < proposal.requiredVotes) {
      proposal.consensusState.status = 'rejected';
      this.finalizeConsensus(proposal, 'rejected');
      return { consensusReached: true, result: 'rejected' };
    }

    return { consensusReached: false, result: 'pending' };
  }

  /**
   * Evaluate two-phase commit consensus
   */
  private evaluateTwoPhaseCommit(
    proposal: ConsensusProposal,
    approveVotes: number,
    rejectVotes: number
  ): { consensusReached: boolean; result: 'accepted' | 'rejected' | 'pending' } {
    // In 2PC, all participants must agree (unanimous)
    const totalVotes = approveVotes + rejectVotes;
    
    if (rejectVotes > 0) {
      proposal.consensusState.status = 'rejected';
      this.finalizeConsensus(proposal, 'rejected');
      return { consensusReached: true, result: 'rejected' };
    }

    if (approveVotes === proposal.participatingAgents.length) {
      proposal.consensusState.status = 'accepted';
      this.finalizeConsensus(proposal, 'accepted');
      return { consensusReached: true, result: 'accepted' };
    }

    return { consensusReached: false, result: 'pending' };
  }

  /**
   * Evaluate Raft consensus (simplified)
   */
  private evaluateRaft(
    proposal: ConsensusProposal,
    approveVotes: number,
    rejectVotes: number
  ): { consensusReached: boolean; result: 'accepted' | 'rejected' | 'pending' } {
    // Raft requires majority of cluster
    const majority = Math.floor(proposal.participatingAgents.length / 2) + 1;
    
    if (approveVotes >= majority) {
      proposal.consensusState.status = 'accepted';
      this.finalizeConsensus(proposal, 'accepted');
      return { consensusReached: true, result: 'accepted' };
    }

    if (rejectVotes >= majority) {
      proposal.consensusState.status = 'rejected';
      this.finalizeConsensus(proposal, 'rejected');
      return { consensusReached: true, result: 'rejected' };
    }

    return { consensusReached: false, result: 'pending' };
  }

  /**
   * Evaluate PBFT consensus (simplified)
   */
  private evaluatePBFT(
    proposal: ConsensusProposal,
    approveVotes: number,
    rejectVotes: number
  ): { consensusReached: boolean; result: 'accepted' | 'rejected' | 'pending' } {
    // PBFT requires 2/3 + 1 votes to handle up to 1/3 Byzantine failures
    const required = Math.floor((2 * proposal.participatingAgents.length) / 3) + 1;
    
    if (approveVotes >= required) {
      proposal.consensusState.status = 'accepted';
      this.finalizeConsensus(proposal, 'accepted');
      return { consensusReached: true, result: 'accepted' };
    }

    // Check if consensus is impossible
    const remainingVotes = proposal.participatingAgents.length - (approveVotes + rejectVotes);
    if (approveVotes + remainingVotes < required) {
      proposal.consensusState.status = 'rejected';
      this.finalizeConsensus(proposal, 'rejected');
      return { consensusReached: true, result: 'rejected' };
    }

    return { consensusReached: false, result: 'pending' };
  }

  /**
   * Finalize consensus and move to history
   */
  private finalizeConsensus(proposal: ConsensusProposal, result: 'accepted' | 'rejected'): void {
    // Update current round
    const rounds = this.consensusRounds.get(proposal.proposalId);
    if (rounds && rounds.length > 0) {
      const currentRound = rounds[rounds.length - 1];
      currentRound.result = result;
      currentRound.endedAt = new Date().toISOString();
    }

    // Update participant stats
    const successfulVoters = Object.values(proposal.consensusState.votes)
      .filter(vote => (result === 'accepted' && vote.vote === 'approve') || 
                      (result === 'rejected' && vote.vote === 'reject'));

    for (const vote of successfulVoters) {
      const participant = this.participants.get(vote.agentId);
      if (participant) {
        participant.successfulVotes++;
        participant.reliability = participant.successfulVotes / participant.totalVotes;
      }
    }

    // Move to history
    const contextKey = `${proposal.context.agentId}:${proposal.update.fieldPath}`;
    if (!this.consensusHistory.has(contextKey)) {
      this.consensusHistory.set(contextKey, []);
    }
    this.consensusHistory.get(contextKey)!.push(proposal);

    // Remove from active proposals
    this.activeProposals.delete(proposal.proposalId);

    // Clear timeout
    const timeout = this.timeouts.get(proposal.proposalId);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(proposal.proposalId);
    }

    this.emit('consensusFinalized', {
      proposalId: proposal.proposalId,
      result,
      finalVotes: Object.keys(proposal.consensusState.votes).length,
      requiredVotes: proposal.requiredVotes,
      duration: Date.now() - new Date(proposal.proposedAt).getTime()
    });

    runtimeLogger.info('Consensus finalized', {
      proposalId: proposal.proposalId,
      result,
      algorithm: this.config.algorithm,
      participants: proposal.participatingAgents.length,
      finalVotes: Object.keys(proposal.consensusState.votes).length
    });
  }

  /**
   * Handle consensus timeout
   */
  private handleConsensusTimeout(proposalId: string): void {
    const proposal = this.activeProposals.get(proposalId);
    if (!proposal || proposal.consensusState.status !== 'pending') {
      return;
    }

    proposal.consensusState.status = 'timeout';

    // Update current round
    const rounds = this.consensusRounds.get(proposalId);
    if (rounds && rounds.length > 0) {
      const currentRound = rounds[rounds.length - 1];
      currentRound.result = 'timeout';
      currentRound.endedAt = new Date().toISOString();
    }

    // Check if we should retry or start next round
    if (this.config.retryFailedProposals && rounds && rounds.length < this.config.maxRounds) {
      this.startNextRound(proposal);
    } else {
      this.finalizeConsensus(proposal, 'rejected');
    }

    this.emit('consensusTimeout', {
      proposalId,
      votesReceived: Object.keys(proposal.consensusState.votes).length,
      requiredVotes: proposal.requiredVotes,
      willRetry: this.config.retryFailedProposals && rounds && rounds.length < this.config.maxRounds
    });

    runtimeLogger.warn('Consensus timed out', {
      proposalId,
      algorithm: this.config.algorithm,
      votesReceived: Object.keys(proposal.consensusState.votes).length,
      requiredVotes: proposal.requiredVotes
    });
  }

  /**
   * Start next round of consensus
   */
  private startNextRound(proposal: ConsensusProposal): void {
    const rounds = this.consensusRounds.get(proposal.proposalId)!;
    const nextRoundNumber = rounds.length + 1;
    const now = new Date().toISOString();

    const nextRound: ConsensusRound = {
      roundId: `${proposal.proposalId}_round_${nextRoundNumber}`,
      proposalId: proposal.proposalId,
      roundNumber: nextRoundNumber,
      startedAt: now,
      votes: [],
      result: 'pending',
      nextRoundNeeded: false
    };

    rounds.push(nextRound);

    // Reset consensus state for next round
    proposal.consensusState.votes = {};
    proposal.consensusState.status = 'pending';
    proposal.consensusState.proposedAt = now;
    proposal.consensusState.expiresAt = new Date(Date.now() + proposal.timeoutMs).toISOString();

    // Set new timeout
    const timeout = setTimeout(() => {
      this.handleConsensusTimeout(proposal.proposalId);
    }, proposal.timeoutMs);

    this.timeouts.set(proposal.proposalId, timeout);

    this.emit('consensusRoundStarted', {
      proposalId: proposal.proposalId,
      roundNumber: nextRoundNumber,
      maxRounds: this.config.maxRounds
    });

    runtimeLogger.debug('Started next consensus round', {
      proposalId: proposal.proposalId,
      roundNumber: nextRoundNumber,
      maxRounds: this.config.maxRounds
    });
  }

  /**
   * Initialize participant tracking
   */
  private initializeParticipant(agentId: AgentId): void {
    if (!this.participants.has(agentId)) {
      const participant: AgentParticipation = {
        agentId,
        joinedAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        votingWeight: 1.0, // Default weight
        isActive: true,
        responseTime: 0,
        successfulVotes: 0,
        totalVotes: 0,
        reliability: 1.0
      };

      this.participants.set(agentId, participant);
    }
  }

  /**
   * Setup periodic cleanup
   */
  private setupCleanup(): void {
    setInterval(() => {
      this.cleanupExpiredProposals();
      this.cleanupInactiveParticipants();
    }, 60000); // Run every minute
  }

  /**
   * Clean up expired proposals
   */
  private cleanupExpiredProposals(): void {
    const now = Date.now();
    const expiredProposals: string[] = [];

    for (const [proposalId, proposal] of this.activeProposals.entries()) {
      const expirationTime = new Date(proposal.consensusState.expiresAt).getTime();
      
      if (now > expirationTime && proposal.consensusState.status === 'pending') {
        expiredProposals.push(proposalId);
      }
    }

    for (const proposalId of expiredProposals) {
      this.handleConsensusTimeout(proposalId);
    }
  }

  /**
   * Clean up inactive participants
   */
  private cleanupInactiveParticipants(): void {
    const now = Date.now();
    const inactiveThreshold = this.config.participantTimeoutMs;

    for (const [agentId, participant] of this.participants.entries()) {
      const lastActivityTime = new Date(participant.lastActivity).getTime();
      
      if (now - lastActivityTime > inactiveThreshold) {
        participant.isActive = false;
        
        runtimeLogger.debug('Participant marked as inactive', {
          agentId,
          lastActivity: participant.lastActivity
        });
      }
    }
  }

  /**
   * Get pattern statistics
   */
  getStatistics() {
    const totalProposals = this.activeProposals.size;
    const totalHistory = Array.from(this.consensusHistory.values())
      .reduce((sum, history) => sum + history.length, 0);
    const activeParticipants = Array.from(this.participants.values())
      .filter(p => p.isActive).length;
    const avgReliability = Array.from(this.participants.values())
      .reduce((sum, p) => sum + p.reliability, 0) / this.participants.size;

    return {
      activeProposals: totalProposals,
      historicalProposals: totalHistory,
      totalParticipants: this.participants.size,
      activeParticipants,
      inactiveParticipants: this.participants.size - activeParticipants,
      avgReliability: avgReliability || 0,
      algorithm: this.config.algorithm,
      consensusRounds: Array.from(this.consensusRounds.values())
        .reduce((sum, rounds) => sum + rounds.length, 0)
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    // Clear all timeouts
    for (const timeout of this.timeouts.values()) {
      clearTimeout(timeout);
    }

    this.activeProposals.clear();
    this.consensusHistory.clear();
    this.participants.clear();
    this.consensusRounds.clear();
    this.timeouts.clear();
    this.removeAllListeners();
  }
}