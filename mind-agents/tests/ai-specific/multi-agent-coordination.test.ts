import { Agent } from '../../src/types/agent';
import { Message } from '../../src/types/message';
import { createAgent, createMessage } from '../utils/test-factories';

/**
 * Multi-Agent Coordination Tests
 * Validates agent collaboration, consensus, and communication
 */

export interface CoordinationMetrics {
  consensusRate: number;
  communicationEfficiency: number;
  taskCompletionRate: number;
  conflictResolutionTime: number;
  synchronizationAccuracy: number;
}

export interface AgentInteraction {
  fromAgent: string;
  toAgent: string;
  message: Message;
  timestamp: Date;
  responseTime?: number;
  success: boolean;
}

export interface ConsensusResult {
  topic: string;
  participants: string[];
  votes: Map<string, any>;
  consensus: any;
  achieved: boolean;
  rounds: number;
  duration: number;
}

export interface TaskDistribution {
  taskId: string;
  assignments: Map<string, string[]>;
  loadBalance: number;
  efficiency: number;
}

export class MultiAgentCoordinator {
  private agents: Map<string, Agent> = new Map();
  private interactions: AgentInteraction[] = [];
  private consensusHistory: ConsensusResult[] = [];
  private taskDistributions: TaskDistribution[] = [];

  public registerAgent(agent: Agent): void {
    this.agents.set(agent.id, agent);
  }

  public async coordinateTask(
    taskId: string,
    taskDescription: string,
    requiredAgents: string[]
  ): Promise<{
    success: boolean;
    assignments: Map<string, string[]>;
    coordinationTime: number;
    errors: string[];
  }> {
    const startTime = Date.now();
    const assignments = new Map<string, string[]>();
    const errors: string[] = [];

    // Verify all required agents are available
    for (const agentId of requiredAgents) {
      if (!this.agents.has(agentId)) {
        errors.push(`Agent ${agentId} not available`);
      }
    }

    if (errors.length > 0) {
      return {
        success: false,
        assignments,
        coordinationTime: Date.now() - startTime,
        errors,
      };
    }

    // Simulate task decomposition and assignment
    const subtasks = this.decomposeTask(taskDescription);
    const optimalAssignments = this.optimizeTaskDistribution(subtasks, requiredAgents);

    // Record distribution
    this.taskDistributions.push({
      taskId,
      assignments: optimalAssignments,
      loadBalance: this.calculateLoadBalance(optimalAssignments),
      efficiency: this.calculateDistributionEfficiency(optimalAssignments, subtasks),
    });

    return {
      success: true,
      assignments: optimalAssignments,
      coordinationTime: Date.now() - startTime,
      errors,
    };
  }

  private decomposeTask(description: string): string[] {
    // Simple task decomposition simulation
    const keywords = ['analyze', 'design', 'implement', 'test', 'document', 'review'];
    const subtasks: string[] = [];

    for (const keyword of keywords) {
      if (description.toLowerCase().includes(keyword)) {
        subtasks.push(`${keyword}_subtask`);
      }
    }

    // Ensure at least one subtask
    if (subtasks.length === 0) {
      subtasks.push('general_subtask');
    }

    return subtasks;
  }

  private optimizeTaskDistribution(
    subtasks: string[],
    agents: string[]
  ): Map<string, string[]> {
    const assignments = new Map<string, string[]>();
    
    // Initialize agent assignments
    agents.forEach(agent => assignments.set(agent, []));

    // Round-robin distribution with capability matching
    let agentIndex = 0;
    for (const subtask of subtasks) {
      const selectedAgent = agents[agentIndex % agents.length];
      const agentTasks = assignments.get(selectedAgent) || [];
      agentTasks.push(subtask);
      assignments.set(selectedAgent, agentTasks);
      agentIndex++;
    }

    return assignments;
  }

  private calculateLoadBalance(assignments: Map<string, string[]>): number {
    const loads = Array.from(assignments.values()).map(tasks => tasks.length);
    if (loads.length === 0) return 1;

    const avgLoad = loads.reduce((a, b) => a + b, 0) / loads.length;
    const variance = loads.reduce((sum, load) => sum + Math.pow(load - avgLoad, 2), 0) / loads.length;
    
    // Lower variance means better balance
    return Math.max(0, 1 - (Math.sqrt(variance) / avgLoad));
  }

  private calculateDistributionEfficiency(
    assignments: Map<string, string[]>,
    subtasks: string[]
  ): number {
    const totalAssigned = Array.from(assignments.values())
      .reduce((sum, tasks) => sum + tasks.length, 0);
    
    return subtasks.length > 0 ? totalAssigned / subtasks.length : 0;
  }

  public async achieveConsensus(
    topic: string,
    participants: string[],
    options: {
      maxRounds?: number;
      threshold?: number;
      timeout?: number;
    } = {}
  ): Promise<ConsensusResult> {
    const { maxRounds = 5, threshold = 0.7, timeout = 30000 } = options;
    const startTime = Date.now();
    
    const votes = new Map<string, any>();
    let rounds = 0;
    let consensusAchieved = false;
    let consensusValue: any = null;

    // Simulate consensus rounds
    while (rounds < maxRounds && !consensusAchieved && (Date.now() - startTime) < timeout) {
      rounds++;
      
      // Collect votes from participants
      for (const participant of participants) {
        const vote = this.simulateAgentVote(participant, topic, rounds);
        votes.set(participant, vote);
      }

      // Check for consensus
      const voteAnalysis = this.analyzeVotes(votes);
      if (voteAnalysis.agreement >= threshold) {
        consensusAchieved = true;
        consensusValue = voteAnalysis.majorityValue;
      }
    }

    const result: ConsensusResult = {
      topic,
      participants,
      votes,
      consensus: consensusValue,
      achieved: consensusAchieved,
      rounds,
      duration: Date.now() - startTime,
    };

    this.consensusHistory.push(result);
    return result;
  }

  private simulateAgentVote(agentId: string, topic: string, round: number): any {
    // Simulate voting behavior that converges over rounds
    const convergenceFactor = Math.min(round / 3, 1);
    const randomFactor = Math.random() * (1 - convergenceFactor);
    
    // Simulate different vote types based on topic
    if (topic.includes('priority')) {
      return Math.floor(randomFactor * 10) + 1;
    } else if (topic.includes('boolean')) {
      return randomFactor < 0.5;
    } else {
      return ['option_a', 'option_b', 'option_c'][Math.floor(randomFactor * 3)];
    }
  }

  private analyzeVotes(votes: Map<string, any>): {
    agreement: number;
    majorityValue: any;
  } {
    const voteValues = Array.from(votes.values());
    const valueCounts = new Map<any, number>();
    
    // Count occurrences of each value
    for (const value of voteValues) {
      const key = JSON.stringify(value);
      valueCounts.set(key, (valueCounts.get(key) || 0) + 1);
    }

    // Find majority value
    let maxCount = 0;
    let majorityValue: any = null;
    
    for (const [key, count] of valueCounts) {
      if (count > maxCount) {
        maxCount = count;
        majorityValue = JSON.parse(key);
      }
    }

    return {
      agreement: maxCount / voteValues.length,
      majorityValue,
    };
  }

  public async broadcastMessage(
    fromAgent: string,
    message: Message,
    toAgents?: string[]
  ): Promise<{
    delivered: number;
    failed: number;
    avgResponseTime: number;
  }> {
    const recipients = toAgents || Array.from(this.agents.keys()).filter(id => id !== fromAgent);
    const startTime = Date.now();
    
    let delivered = 0;
    let failed = 0;
    const responseTimes: number[] = [];

    for (const recipient of recipients) {
      const deliveryStart = Date.now();
      
      // Simulate message delivery with possible failures
      const success = Math.random() > 0.05; // 95% success rate
      
      if (success) {
        delivered++;
        const responseTime = Math.random() * 100 + 50; // 50-150ms
        responseTimes.push(responseTime);
        
        this.interactions.push({
          fromAgent,
          toAgent: recipient,
          message,
          timestamp: new Date(),
          responseTime,
          success: true,
        });
      } else {
        failed++;
        
        this.interactions.push({
          fromAgent,
          toAgent: recipient,
          message,
          timestamp: new Date(),
          success: false,
        });
      }
    }

    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;

    return {
      delivered,
      failed,
      avgResponseTime,
    };
  }

  public detectConflicts(): Array<{
    type: 'resource' | 'goal' | 'communication';
    agents: string[];
    description: string;
    severity: 'low' | 'medium' | 'high';
  }> {
    const conflicts: any[] = [];

    // Detect resource conflicts from task distributions
    for (const distribution of this.taskDistributions) {
      const overloadedAgents = Array.from(distribution.assignments.entries())
        .filter(([agent, tasks]) => tasks.length > 5)
        .map(([agent]) => agent);

      if (overloadedAgents.length > 0) {
        conflicts.push({
          type: 'resource',
          agents: overloadedAgents,
          description: 'Agent overloaded with tasks',
          severity: 'medium',
        });
      }
    }

    // Detect communication conflicts from interaction patterns
    const recentInteractions = this.interactions.slice(-50);
    const failureRates = new Map<string, number>();
    
    for (const interaction of recentInteractions) {
      if (!interaction.success) {
        const key = `${interaction.fromAgent}-${interaction.toAgent}`;
        failureRates.set(key, (failureRates.get(key) || 0) + 1);
      }
    }

    for (const [agentPair, failures] of failureRates) {
      if (failures > 3) {
        const [from, to] = agentPair.split('-');
        conflicts.push({
          type: 'communication',
          agents: [from, to],
          description: 'Repeated communication failures',
          severity: 'high',
        });
      }
    }

    // Detect goal conflicts from consensus history
    const recentConsensus = this.consensusHistory.slice(-10);
    const failedConsensus = recentConsensus.filter(c => !c.achieved);
    
    if (failedConsensus.length > 3) {
      const involvedAgents = new Set<string>();
      failedConsensus.forEach(c => c.participants.forEach(p => involvedAgents.add(p)));
      
      conflicts.push({
        type: 'goal',
        agents: Array.from(involvedAgents),
        description: 'Repeated consensus failures indicate conflicting goals',
        severity: 'high',
      });
    }

    return conflicts;
  }

  public calculateCoordinationMetrics(): CoordinationMetrics {
    // Consensus rate
    const consensusRate = this.consensusHistory.length > 0
      ? this.consensusHistory.filter(c => c.achieved).length / this.consensusHistory.length
      : 1;

    // Communication efficiency
    const successfulInteractions = this.interactions.filter(i => i.success).length;
    const communicationEfficiency = this.interactions.length > 0
      ? successfulInteractions / this.interactions.length
      : 1;

    // Task completion rate (simulated)
    const taskCompletionRate = this.taskDistributions.length > 0
      ? this.taskDistributions.filter(t => t.efficiency >= 1).length / this.taskDistributions.length
      : 1;

    // Conflict resolution time (average consensus duration for achieved consensus)
    const achievedConsensus = this.consensusHistory.filter(c => c.achieved);
    const conflictResolutionTime = achievedConsensus.length > 0
      ? achievedConsensus.reduce((sum, c) => sum + c.duration, 0) / achievedConsensus.length
      : 0;

    // Synchronization accuracy (based on load balance)
    const synchronizationAccuracy = this.taskDistributions.length > 0
      ? this.taskDistributions.reduce((sum, t) => sum + t.loadBalance, 0) / this.taskDistributions.length
      : 1;

    return {
      consensusRate,
      communicationEfficiency,
      taskCompletionRate,
      conflictResolutionTime,
      synchronizationAccuracy,
    };
  }
}

// Test suite for multi-agent coordination
describe('Multi-Agent Coordination Tests', () => {
  let coordinator: MultiAgentCoordinator;
  let agents: Agent[];

  beforeEach(() => {
    coordinator = new MultiAgentCoordinator();
    agents = [
      createAgent({ id: 'agent-1', name: 'Alpha' }),
      createAgent({ id: 'agent-2', name: 'Beta' }),
      createAgent({ id: 'agent-3', name: 'Gamma' }),
      createAgent({ id: 'agent-4', name: 'Delta' }),
    ];

    agents.forEach(agent => coordinator.registerAgent(agent));
  });

  describe('Task Coordination', () => {
    test('should distribute tasks among agents', async () => {
      const result = await coordinator.coordinateTask(
        'task-123',
        'Analyze system performance, design improvements, and implement optimizations',
        ['agent-1', 'agent-2', 'agent-3']
      );

      expect(result.success).toBe(true);
      expect(result.assignments.size).toBe(3);
      
      // Check load balancing
      const loads = Array.from(result.assignments.values()).map(tasks => tasks.length);
      const maxLoad = Math.max(...loads);
      const minLoad = Math.min(...loads);
      expect(maxLoad - minLoad).toBeLessThanOrEqual(1); // Good load balance
    });

    test('should handle missing agents gracefully', async () => {
      const result = await coordinator.coordinateTask(
        'task-456',
        'Complex task requiring coordination',
        ['agent-1', 'agent-missing', 'agent-3']
      );

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Agent agent-missing not available');
    });
  });

  describe('Consensus Achievement', () => {
    test('should achieve consensus among agents', async () => {
      const result = await coordinator.achieveConsensus(
        'priority_level',
        ['agent-1', 'agent-2', 'agent-3'],
        { maxRounds: 5, threshold: 0.6 }
      );

      expect(result.rounds).toBeLessThanOrEqual(5);
      expect(result.participants).toHaveLength(3);
      
      // Most of the time consensus should be achieved
      if (result.achieved) {
        expect(result.consensus).toBeDefined();
      }
    });

    test('should handle consensus timeout', async () => {
      const result = await coordinator.achieveConsensus(
        'complex_decision',
        agents.map(a => a.id),
        { maxRounds: 2, threshold: 0.95, timeout: 100 }
      );

      // With high threshold and short timeout, consensus likely won't be achieved
      expect(result.rounds).toBeLessThanOrEqual(2);
      expect(result.duration).toBeLessThanOrEqual(200); // Some buffer for execution
    });
  });

  describe('Message Broadcasting', () => {
    test('should broadcast messages to all agents', async () => {
      const message = createMessage({
        content: 'System update notification',
        from: 'agent-1',
      });

      const result = await coordinator.broadcastMessage('agent-1', message);

      expect(result.delivered + result.failed).toBe(3); // 4 agents - 1 sender
      expect(result.delivered).toBeGreaterThan(0);
      expect(result.avgResponseTime).toBeGreaterThan(0);
    });

    test('should broadcast to specific agents', async () => {
      const message = createMessage({
        content: 'Private team message',
        from: 'agent-1',
      });

      const result = await coordinator.broadcastMessage(
        'agent-1',
        message,
        ['agent-2', 'agent-3']
      );

      expect(result.delivered + result.failed).toBe(2);
    });
  });

  describe('Conflict Detection', () => {
    test('should detect resource conflicts', async () => {
      // Create task overload
      const tasks = Array(10).fill('subtask');
      await coordinator.coordinateTask(
        'overload-task',
        tasks.join(', '),
        ['agent-1'] // Single agent for many tasks
      );

      const conflicts = coordinator.detectConflicts();
      const resourceConflicts = conflicts.filter(c => c.type === 'resource');
      
      expect(resourceConflicts.length).toBeGreaterThan(0);
      expect(resourceConflicts[0].agents).toContain('agent-1');
    });

    test('should detect communication failures', async () => {
      // Simulate multiple failed communications
      const message = createMessage({ content: 'Test', from: 'agent-1' });
      
      // Force failures by mocking
      for (let i = 0; i < 5; i++) {
        coordinator['interactions'].push({
          fromAgent: 'agent-1',
          toAgent: 'agent-2',
          message,
          timestamp: new Date(),
          success: false,
        });
      }

      const conflicts = coordinator.detectConflicts();
      const commConflicts = conflicts.filter(c => c.type === 'communication');
      
      expect(commConflicts.length).toBeGreaterThan(0);
      expect(commConflicts[0].severity).toBe('high');
    });
  });

  describe('Coordination Metrics', () => {
    test('should calculate comprehensive metrics', async () => {
      // Perform various coordination activities
      await coordinator.coordinateTask(
        'metric-task-1',
        'Test task for metrics',
        ['agent-1', 'agent-2']
      );

      await coordinator.achieveConsensus(
        'test_consensus',
        ['agent-1', 'agent-2', 'agent-3'],
        { threshold: 0.6 }
      );

      const message = createMessage({ content: 'Metric test', from: 'agent-1' });
      await coordinator.broadcastMessage('agent-1', message);

      const metrics = coordinator.calculateCoordinationMetrics();

      expect(metrics.consensusRate).toBeGreaterThanOrEqual(0);
      expect(metrics.consensusRate).toBeLessThanOrEqual(1);
      expect(metrics.communicationEfficiency).toBeGreaterThan(0.8);
      expect(metrics.synchronizationAccuracy).toBeGreaterThan(0.5);
    });
  });
});