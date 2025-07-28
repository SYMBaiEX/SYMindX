/**
 * Probabilistic Reasoning System for SYMindX
 *
 * Implements Bayesian networks for probabilistic inference and reasoning
 * under uncertainty.
 */

import {
  Agent,
  ThoughtContext,
  ThoughtResult,
  Plan,
  Decision,
  AgentAction,
  ActionCategory,
  ActionStatus,
  PlanStep,
  PlanStepStatus,
  MemoryRecord,
} from '../../types/agent';
import { Experience } from '../../types/autonomous';
import {
  CognitionModule,
  CognitionModuleMetadata,
  BayesianNetwork,
  BayesianNode,
  BayesianEdge,
  ReasoningParadigm,
  HybridReasoningConfig,
} from '../../types/cognition';
import { BaseConfig } from '../../types/common';
import { MemoryType, MemoryDuration } from '../../types/enums';
import { runtimeLogger } from '../../utils/logger';

/**
 * Simple Bayesian Network implementation
 */
export class SimpleBayesianNetwork implements BayesianNetwork {
  private nodeMap: Map<string, BayesianNode> = new Map();
  private edgeMap: Map<string, string[]> = new Map();

  get nodes(): BayesianNode[] {
    return Array.from(this.nodeMap.values());
  }

  get edges(): BayesianEdge[] {
    const edgeList: BayesianEdge[] = [];
    for (const from of Array.from(this.edgeMap.keys())) {
      const toList = this.edgeMap.get(from) || [];
      for (const to of toList) {
        edgeList.push({ from, to, probability: 1.0 });
      }
    }
    return edgeList;
  }

  addNode(node: BayesianNode): void {
    this.nodeMap.set(node.id, node);
    this.edgeMap.set(node.id, [...node.children]);

    // Update parent-child relationships
    for (const parentId of node.parents) {
      const parentEdges = this.edgeMap.get(parentId) || [];
      if (!parentEdges.includes(node.id)) {
        parentEdges.push(node.id);
        this.edgeMap.set(parentId, parentEdges);
      }
    }

    runtimeLogger.cognition(`Added Bayesian node: ${node.name}`);
  }

  query(evidence: Record<string, string>): Record<string, number> {
    // Enhanced query implementation using both calculation methods
    const results: Record<string, number> = {};
    for (const node of Array.from(this.nodeMap.values())) {
      // Use the basic calculation as primary method
      results[node.id] = this.calculateProbability(node, evidence);

      // Use computeProbability for validation/comparison
      const alternativeResult = this.computeProbability(node.id, evidence);
      const currentResult = results[node.id];
      if (
        currentResult !== undefined &&
        Math.abs(currentResult - alternativeResult) > 0.1
      ) {
        // Average the results if they differ significantly
        results[node.id] = (currentResult + alternativeResult) / 2;
      }
    }
    return results;
  }

  learn(data: Record<string, string>[]): void {
    // Enhanced learning from data
    const nodeCounts = new Map<string, Map<string, number>>();

    // Count occurrences for each node
    for (const sample of data) {
      for (const [nodeId] of Object.entries(sample)) {
        const node = this.nodeMap.get(nodeId);
        if (node) {
          // Generate proper condition key using helper method
          const key = this._generateConditionKey(sample, node);

          if (!nodeCounts.has(nodeId)) {
            nodeCounts.set(nodeId, new Map());
          }
          const counts = nodeCounts.get(nodeId)!;
          counts.set(key, (counts.get(key) || 0) + 1);
        }
      }
    }

    // Update probabilities for each node using the helper method
    for (const [nodeId, counts] of nodeCounts.entries()) {
      const node = this.nodeMap.get(nodeId);
      if (node) {
        this._updateProbabilities(node, counts, data.length);
      }
    }
  }

  private calculateProbability(
    node: BayesianNode,
    evidence: Record<string, string>
  ): number {
    // Simple probability calculation
    if (node.conditionalProbabilities) {
      const key = JSON.stringify(evidence);
      return node.conditionalProbabilities[key] || 0.5;
    }
    return 0.5;
  }

  addEdge(from: string, to: string): void {
    const edges = this.edgeMap.get(from) || [];
    if (!edges.includes(to)) {
      edges.push(to);
      this.edgeMap.set(from, edges);

      // Update child node's parents
      const toNode = this.nodeMap.get(to);
      if (toNode && !toNode.parents.includes(from)) {
        toNode.parents.push(from);
      }

      // Update parent node's children
      const fromNode = this.nodeMap.get(from);
      if (fromNode && !fromNode.children.includes(to)) {
        fromNode.children.push(to);
      }
    }
  }

  /**
   * Compute probability of a node given evidence
   */
  private computeProbability(
    nodeId: string,
    evidence: Record<string, any>
  ): number {
    const node = this.nodeMap.get(nodeId);
    if (!node) return 0.5;

    // Simple computation based on parent states
    if (node.parents.length === 0) {
      // Root node - return prior probability
      return node.conditionalProbabilities?.[''] || 0.5;
    }

    // Generate condition key from parents
    const conditionKey = node.parents
      .map((parentId) => `${parentId}=${evidence[parentId] || 'unknown'}`)
      .join(',');

    return node.conditionalProbabilities?.[conditionKey] || 0.5;
  }

  /**
   * Generate condition key for learning
   */
  private _generateConditionKey(
    dataPoint: Record<string, any>,
    node: BayesianNode
  ): string {
    if (node.parents.length === 0) return '';

    return node.parents
      .map((parentId) => `${parentId}=${dataPoint[parentId] || 'unknown'}`)
      .join(',');
  }

  /**
   * Update probabilities from counts
   */
  private _updateProbabilities(
    node: BayesianNode,
    counts: Map<string, number>,
    totalData: number
  ): void {
    if (!node.conditionalProbabilities) {
      node.conditionalProbabilities = {};
    }
    for (const key of Array.from(counts.keys())) {
      const count = counts.get(key) || 0;
      node.conditionalProbabilities[key] = count / totalData;
    }
  }
}

/**
 * Probabilistic reasoning cognition module
 */
export class ProbabilisticReasoning implements CognitionModule {
  public id: string;
  public type: string = 'probabilistic';
  private config: HybridReasoningConfig;
  private network: BayesianNetwork;
  private evidenceHistory: Array<{
    evidence: Record<string, any>;
    result: Record<string, number>;
    timestamp: Date;
  }> = [];

  constructor(config: HybridReasoningConfig) {
    this.id = `probabilistic_${Date.now()}`;
    this.config = config;
    this.network = new SimpleBayesianNetwork();

    // Initialize default network
    this.initializeDefaultNetwork();
  }

  /**
   * Initialize default Bayesian network for agent reasoning
   */
  private initializeDefaultNetwork(): void {
    // Create nodes for common reasoning scenarios

    // Context understanding
    this.network.addNode({
      id: 'context_clear',
      name: 'Context is Clear',
      states: ['true', 'false'],
      conditionalProbabilities: { '': 0.7 },
      parents: [],
      children: ['should_respond', 'confidence_level'],
    });

    // Message type
    this.network.addNode({
      id: 'message_type',
      name: 'Message Type',
      states: ['question', 'statement', 'request', 'greeting'],
      conditionalProbabilities: {
        '': 0.3, // question
        statement: 0.3,
        request: 0.2,
        greeting: 0.2,
      },
      parents: [],
      children: ['should_respond', 'response_urgency'],
    });

    // Should respond
    this.network.addNode({
      id: 'should_respond',
      name: 'Should Respond',
      states: ['true', 'false'],
      conditionalProbabilities: {
        'context_clear=true,message_type=question': 0.9,
        'context_clear=true,message_type=request': 0.95,
        'context_clear=true,message_type=greeting': 0.8,
        'context_clear=false,message_type=question': 0.6,
        'context_clear=false,message_type=request': 0.7,
        'context_clear=false,message_type=greeting': 0.5,
      },
      parents: ['context_clear', 'message_type'],
      children: ['action_type'],
    });

    // Confidence level
    this.network.addNode({
      id: 'confidence_level',
      name: 'Confidence Level',
      states: ['high', 'medium', 'low'],
      conditionalProbabilities: {
        'context_clear=true': 0.8,
        'context_clear=false': 0.3,
      },
      parents: ['context_clear'],
      children: ['response_quality'],
    });

    // Response urgency
    this.network.addNode({
      id: 'response_urgency',
      name: 'Response Urgency',
      states: ['high', 'medium', 'low'],
      conditionalProbabilities: {
        'message_type=question': 0.7,
        'message_type=request': 0.8,
        'message_type=greeting': 0.4,
        'message_type=statement': 0.3,
      },
      parents: ['message_type'],
      children: ['action_priority'],
    });

    // Action type
    this.network.addNode({
      id: 'action_type',
      name: 'Action Type',
      states: ['respond', 'analyze', 'plan', 'wait'],
      conditionalProbabilities: {
        'should_respond=true': 0.8,
        'should_respond=false': 0.2,
      },
      parents: ['should_respond'],
      children: [],
    });

    // Response quality
    this.network.addNode({
      id: 'response_quality',
      name: 'Response Quality',
      states: ['excellent', 'good', 'poor'],
      conditionalProbabilities: {
        'confidence_level=high': 0.8,
        'confidence_level=medium': 0.6,
        'confidence_level=low': 0.3,
      },
      parents: ['confidence_level'],
      children: [],
    });

    // Action priority
    this.network.addNode({
      id: 'action_priority',
      name: 'Action Priority',
      states: ['high', 'medium', 'low'],
      conditionalProbabilities: {
        'response_urgency=high': 0.9,
        'response_urgency=medium': 0.6,
        'response_urgency=low': 0.3,
      },
      parents: ['response_urgency'],
      children: [],
    });
  }

  /**
   * Initialize the cognition module
   */
  initialize(config: BaseConfig): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get module metadata
   */
  getMetadata(): CognitionModuleMetadata {
    return {
      id: this.id,
      name: 'Probabilistic Reasoning',
      version: '1.0.0',
      description: 'Bayesian network-based probabilistic inference',
      author: 'SYMindX',
      paradigms: [ReasoningParadigm.PROBABILISTIC],
      learningCapable: true,
    };
  }

  /**
   * Main thinking method using probabilistic inference
   */
  async think(agent: Agent, context: ThoughtContext): Promise<ThoughtResult> {
    const startTime = Date.now();
    const thoughts: string[] = [];
    const actions: AgentAction[] = [];
    const memories: MemoryRecord[] = [];

    // Extract evidence from context
    const evidence = this.extractEvidence(agent, context);
    thoughts.push(
      `Extracted evidence: ${Object.keys(evidence).length} variables`
    );

    // Perform probabilistic inference
    const probabilities = this.network.query(evidence);
    thoughts.push(
      `Computed probabilities for ${Object.keys(probabilities).length} variables`
    );

    // Make decisions based on probabilities
    const decisions = this.makeDecisions(probabilities);
    thoughts.push(`Made ${decisions.length} probabilistic decisions`);

    // Generate actions based on decisions
    const generatedActions = this.generateActions(
      agent,
      decisions,
      probabilities
    );
    actions.push(...generatedActions);

    // Record inference
    this.evidenceHistory.push({
      evidence,
      result: probabilities,
      timestamp: new Date(),
    });

    // Create memory of probabilistic reasoning
    const memory = this.createProbabilisticMemory(
      agent,
      evidence,
      probabilities
    );
    memories.push(memory);

    // Calculate confidence and timing
    const confidence = this.calculateOverallConfidence(probabilities);
    const reasoningTime = Date.now() - startTime;

    // Log reasoning performance
    runtimeLogger.debug(
      `🎲 Probabilistic reasoning completed in ${reasoningTime}ms (confidence: ${confidence.toFixed(2)})`
    );

    return {
      thoughts,
      actions,
      emotions: {
        current:
          confidence > 0.7
            ? 'confident'
            : confidence > 0.4
              ? 'uncertain'
              : 'confused',
        intensity: confidence,
        triggers: ['probabilistic_inference'],
        history: [],
        timestamp: new Date(),
      },
      memories,
      confidence,
    };
  }

  /**
   * Plan using probabilistic approach
   */
  async plan(_agent: Agent, goal: string): Promise<Plan> {
    // Set up evidence for planning
    const evidence = {
      has_goal: 'true',
      goal_complexity: this.assessGoalComplexity(goal),
      available_resources: 'medium',
    };

    // Query network for planning decisions
    const probabilities = this.network.query(evidence);

    // Generate plan steps based on probabilities
    const steps: PlanStep[] = [];
    let stepCounter = 1;

    // Analysis step (always included)
    steps.push({
      id: `step_${stepCounter++}`,
      action: 'analyze_goal',
      description: `Analyze goal: ${goal}`,
      status: PlanStepStatus.PENDING,
      parameters: {
        goal,
        confidence: probabilities['confidence_level'] || 0.5,
      },
      preconditions: [],
      effects: ['goal_analyzed'],
    });

    // Conditional steps based on probabilities
    if ((probabilities['should_respond'] || 0.5) > 0.6) {
      steps.push({
        id: `step_${stepCounter++}`,
        action: 'prepare_response',
        description: 'Prepare response strategy',
        status: PlanStepStatus.PENDING,
        parameters: {},
        preconditions: ['goal_analyzed'],
        effects: ['response_prepared'],
      });
    }

    if ((probabilities['action_priority'] || 0.5) > 0.7) {
      steps.push({
        id: `step_${stepCounter++}`,
        action: 'execute_with_priority',
        description: 'Execute with high priority',
        status: PlanStepStatus.PENDING,
        parameters: { priority: 'high' },
        preconditions: ['response_prepared'],
        effects: ['goal_achieved'],
      });
    } else {
      steps.push({
        id: `step_${stepCounter++}`,
        action: 'execute_standard',
        description: 'Execute with standard approach',
        status: PlanStepStatus.PENDING,
        parameters: { priority: 'medium' },
        preconditions: ['response_prepared'],
        effects: ['goal_achieved'],
      });
    }

    return {
      id: `plan_${Date.now()}`,
      goal,
      steps,
      priority: probabilities['action_priority'] || 0.5,
      estimatedDuration: this.estimateDuration(steps, probabilities),
      dependencies: [],
      status: 'pending' as any,
    };
  }

  /**
   * Decide using probabilistic reasoning
   */
  async decide(_agent: Agent, options: Decision[]): Promise<Decision> {
    if (options.length === 0) {
      throw new Error('No options to decide between');
    }

    if (options.length === 1) {
      const firstOption = options[0];
      if (!firstOption) {
        throw new Error('First option is undefined');
      }
      return firstOption;
    }

    // Evaluate each option probabilistically
    const evaluatedOptions = options.map((option) => {
      const evidence = this.createDecisionEvidence(option);
      const probabilities = this.network.query(evidence);
      const score = this.scoreOption(probabilities);

      return {
        option,
        probabilities,
        score,
      };
    });

    // Select option with highest expected utility
    const bestOption = evaluatedOptions.reduce((best, current) =>
      current.score > best.score ? current : best
    );

    return bestOption.option;
  }

  /**
   * Learn from experience
   */
  async learn(_agent: Agent, experience: Experience): Promise<void> {
    const { state, action, reward, nextState: _nextState } = experience;
    void _nextState; // Acknowledge unused variable

    // Log learning from experience
    runtimeLogger.debug(
      `🎲 Learning from experience: state=${JSON.stringify(state)}, action=${action}, reward=${reward}`
    );

    // Convert experience to training data
    const dataPoint = this.experienceToDataPoint(experience);

    // Update network with new data
    this.network.learn([dataPoint]);

    // Adjust probabilities based on reward
    this.adjustProbabilitiesFromReward(reward);

    runtimeLogger.cognition(
      `Learned from probabilistic experience: ${reward.type}`
    );
  }

  /**
   * Extract evidence from context
   */
  private extractEvidence(
    agent: Agent,
    context: ThoughtContext
  ): Record<string, any> {
    const evidence: Record<string, any> = {};

    // Context clarity
    evidence['context_clear'] = context.events.length > 0 ? 'true' : 'false';

    // Message analysis
    const messageEvents = context.events.filter((e) => e.data?.['message']);
    if (messageEvents.length > 0) {
      const message = messageEvents[0]?.data?.['message'] as string;
      evidence['message_type'] = this.classifyMessage(message);
    }

    // Goal presence
    evidence['has_goal'] = context.goal ? 'true' : 'false';

    // Agent status
    evidence['agent_status'] = agent.status;

    return evidence;
  }

  /**
   * Classify message type
   */
  private classifyMessage(message: string): string {
    const lower = message.toLowerCase();

    if (lower.includes('?')) return 'question';
    if (lower.includes('please') || lower.includes('can you')) return 'request';
    if (lower.match(/^(hi|hello|hey)/)) return 'greeting';
    return 'statement';
  }

  /**
   * Make decisions based on probabilities
   */
  private makeDecisions(probabilities: Record<string, number>): Array<{
    variable: string;
    decision: string;
    confidence: number;
  }> {
    const decisions: Array<{
      variable: string;
      decision: string;
      confidence: number;
    }> = [];

    const threshold =
      this.config.probabilisticReasoning?.confidenceThreshold || 0.6;

    for (const [variable, probability] of Object.entries(probabilities)) {
      if (probability > threshold) {
        decisions.push({
          variable,
          decision: 'true',
          confidence: probability,
        });
      } else if (probability < 1 - threshold) {
        decisions.push({
          variable,
          decision: 'false',
          confidence: 1 - probability,
        });
      }
    }

    return decisions;
  }

  /**
   * Generate actions based on decisions
   */
  private generateActions(
    agent: Agent,
    decisions: Array<{
      variable: string;
      decision: string;
      confidence: number;
    }>,
    probabilities: Record<string, number>
  ): AgentAction[] {
    const actions: AgentAction[] = [];

    // Check if should respond
    const shouldRespond = decisions.find(
      (d) => d.variable === 'should_respond' && d.decision === 'true'
    );
    if (shouldRespond) {
      actions.push({
        id: `action_${Date.now()}`,
        agentId: agent.id,
        type: ActionCategory.COMMUNICATION,
        action: 'probabilistic_response',
        parameters: {
          confidence: shouldRespond.confidence,
          response_quality: probabilities['response_quality'] || 0.5,
        },
        priority: probabilities['action_priority'] || 0.5,
        status: ActionStatus.PENDING,
        extension: 'probabilistic_reasoning',
        timestamp: new Date(),
      });
    }

    // Check if should analyze
    const actionType = probabilities['action_type'] || 0;
    if (actionType > 0.5) {
      actions.push({
        id: `action_${Date.now()}`,
        agentId: agent.id,
        type: ActionCategory.PROCESSING,
        action: 'probabilistic_analysis',
        parameters: {
          confidence: actionType,
        },
        priority: 0.6,
        status: ActionStatus.PENDING,
        extension: 'probabilistic_reasoning',
        timestamp: new Date(),
      });
    }

    return actions;
  }

  /**
   * Create probabilistic reasoning memory
   */
  private createProbabilisticMemory(
    agent: Agent,
    evidence: Record<string, any>,
    probabilities: Record<string, number>
  ): MemoryRecord {
    const content = `Probabilistic reasoning: ${Object.keys(evidence).length} evidence variables, ${Object.keys(probabilities).length} inferred probabilities`;

    return {
      id: `memory_${Date.now()}`,
      agentId: agent.id,
      type: MemoryType.REASONING,
      content,
      metadata: {
        reasoning_type: 'probabilistic',
        evidence,
        probabilities,
        timestamp: new Date(),
      },
      importance: 0.6,
      timestamp: new Date(),
      tags: ['reasoning', 'probabilistic', 'bayesian'],
      duration: MemoryDuration.LONG_TERM,
    };
  }

  /**
   * Calculate overall confidence
   */
  private calculateOverallConfidence(
    probabilities: Record<string, number>
  ): number {
    const values = Object.values(probabilities);
    if (values.length === 0) return 0.5;

    // Calculate average confidence (how far from 0.5)
    const confidences = values.map((p) => Math.abs(p - 0.5) * 2);
    return confidences.reduce((sum, c) => sum + c, 0) / confidences.length;
  }

  /**
   * Assess goal complexity
   */
  private assessGoalComplexity(goal: string): string {
    const wordCount = goal.split(/\s+/).length;
    if (wordCount > 10) return 'high';
    if (wordCount > 5) return 'medium';
    return 'low';
  }

  /**
   * Create decision evidence
   */
  private createDecisionEvidence(option: Decision): Record<string, any> {
    return {
      option_confidence: option.confidence || 0.5,
      option_complexity: 'medium',
      decision_context: 'choice',
    };
  }

  /**
   * Score option based on probabilities
   */
  private scoreOption(probabilities: Record<string, number>): number {
    // Simple scoring based on expected utility
    const confidence = probabilities['confidence_level'] || 0.5;
    const quality = probabilities['response_quality'] || 0.5;
    const priority = probabilities['action_priority'] || 0.5;

    return (confidence + quality + priority) / 3;
  }

  /**
   * Convert experience to data point
   */
  private experienceToDataPoint(experience: Experience): Record<string, any> {
    return {
      action_taken: 'true',
      reward_received: experience.reward.value > 0 ? 'positive' : 'negative',
      context_clear: 'true',
      outcome_quality: experience.reward.value > 0.5 ? 'good' : 'poor',
    };
  }

  /**
   * Adjust probabilities based on reward
   */
  private adjustProbabilitiesFromReward(reward: any): void {
    // Simple adjustment - in practice, this would be more sophisticated
    if (reward.value > 0.5) {
      // Positive reward - reinforce current probabilities
      runtimeLogger.cognition(
        'Reinforcing probabilistic model from positive reward'
      );
    } else {
      // Negative reward - adjust probabilities
      runtimeLogger.cognition(
        'Adjusting probabilistic model from negative reward'
      );
    }
  }

  /**
   * Estimate plan duration
   */
  private estimateDuration(
    steps: PlanStep[],
    probabilities: Record<string, number>
  ): number {
    const baseTime = steps.length * 20000; // 20 seconds per step
    const urgencyMultiplier =
      (probabilities['response_urgency'] || 0.5) > 0.7 ? 0.7 : 1.0;

    return baseTime * urgencyMultiplier;
  }
}

/**
 * Factory function for creating probabilistic reasoning module
 */
export function createProbabilisticReasoning(
  config: HybridReasoningConfig
): ProbabilisticReasoning {
  return new ProbabilisticReasoning(config);
}
