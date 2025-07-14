/**
 * PDDL Planning System for SYMindX
 *
 * Implements Planning Domain Definition Language (PDDL) for automated planning
 * with goal-directed reasoning and action decomposition.
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
  PDDLDomain,
  PDDLAction,
  PDDLProblem,
  PDDLExpression,
  HybridReasoningConfig,
  ReasoningParadigm,
} from '../../types/cognition';
import { BaseConfig } from '../../types/common';
import { MemoryType, MemoryDuration } from '../../types/enums';
import { runtimeLogger } from '../../utils/logger';

/**
 * PDDL State representation
 */
interface PDDLState {
  predicates: Set<string>;
  objects: Map<string, string>; // object -> type
  timestamp: Date;
}

/**
 * PDDL Plan representation
 */
interface PDDLPlan {
  actions: PDDLActionInstance[];
  cost: number;
  length: number;
  valid: boolean;
}

/**
 * PDDL Action instance
 */
interface PDDLActionInstance {
  name: string;
  parameters: Record<string, string>;
  precondition: string[];
  effects: string[];
  cost: number;
}

/**
 * PDDL Planning cognition module
 */
export class PDDLPlanner implements CognitionModule {
  public id: string;
  public type: string = 'pddl_planner';
  private config: HybridReasoningConfig;
  private domain: PDDLDomain;
  private currentState: PDDLState;
  private planningHistory: Array<{
    problem: PDDLProblem;
    plan: PDDLPlan;
    success: boolean;
    timestamp: Date;
  }> = [];

  constructor(config: HybridReasoningConfig) {
    this.id = `pddl_planner_${Date.now()}`;
    this.config = config;
    this.domain = this.createDefaultDomain();
    this.currentState = this.createInitialState();
  }

  /**
   * Create default PDDL domain for agent actions
   */
  private createDefaultDomain(): PDDLDomain {
    return {
      name: 'agent_actions',
      requirements: [':strips', ':typing'],
      types: ['agent', 'message', 'goal', 'resource', 'location'],
      predicates: [
        {
          name: 'at',
          parameters: [
            { name: 'agent', type: 'agent' },
            { name: 'location', type: 'location' },
          ],
        },
        {
          name: 'has',
          parameters: [
            { name: 'agent', type: 'agent' },
            { name: 'resource', type: 'resource' },
          ],
        },
        {
          name: 'knows',
          parameters: [
            { name: 'agent', type: 'agent' },
            { name: 'message', type: 'message' },
          ],
        },
        { name: 'achieved', parameters: [{ name: 'goal', type: 'goal' }] },
        {
          name: 'available',
          parameters: [{ name: 'resource', type: 'resource' }],
        },
        {
          name: 'connected',
          parameters: [
            { name: 'location', type: 'location' },
            { name: 'location', type: 'location' },
          ],
        },
      ],
      actions: [
        {
          name: 'move',
          parameters: [
            { name: 'agent', type: 'agent' },
            { name: 'from', type: 'location' },
            { name: 'to', type: 'location' },
          ],
          precondition: {
            type: 'and',
            expressions: [
              { type: 'predicate', predicate: 'at(agent, from)' },
              { type: 'predicate', predicate: 'connected(from, to)' },
            ],
          },
          effect: {
            type: 'and',
            expressions: [
              {
                type: 'not',
                expressions: [
                  { type: 'predicate', predicate: 'at(agent, from)' },
                ],
              },
              { type: 'predicate', predicate: 'at(agent, to)' },
            ],
          },
          effects: [
            { type: 'not', predicate: 'at(agent, from)' },
            { type: 'predicate', predicate: 'at(agent, to)' },
          ],
        },
        {
          name: 'communicate',
          parameters: [
            { name: 'agent', type: 'agent' },
            { name: 'message', type: 'message' },
          ],
          precondition: {
            type: 'and',
            expressions: [
              { type: 'predicate', predicate: 'knows(agent, message)' },
            ],
          },
          effect: {
            type: 'predicate',
            predicate: 'communicated(agent, message)',
          },
          effects: [
            { type: 'predicate', predicate: 'communicated(agent, message)' },
          ],
        },
        {
          name: 'acquire_resource',
          parameters: [
            { name: 'agent', type: 'agent' },
            { name: 'resource', type: 'resource' },
          ],
          precondition: {
            type: 'and',
            expressions: [
              { type: 'predicate', predicate: 'available(resource)' },
            ],
          },
          effect: {
            type: 'and',
            expressions: [
              { type: 'predicate', predicate: 'has(agent, resource)' },
              {
                type: 'not',
                expressions: [
                  { type: 'predicate', predicate: 'available(resource)' },
                ],
              },
            ],
          },
          effects: [
            { type: 'predicate', predicate: 'has(agent, resource)' },
            { type: 'not', predicate: 'available(resource)' },
          ],
        },
        {
          name: 'work_on_goal',
          parameters: [
            { name: 'agent', type: 'agent' },
            { name: 'goal', type: 'goal' },
          ],
          precondition: {
            type: 'and',
            expressions: [
              { type: 'predicate', predicate: 'has(agent, knowledge)' },
              { type: 'predicate', predicate: 'has(agent, tools)' },
            ],
          },
          effect: { type: 'predicate', predicate: 'achieved(goal)' },
          effects: [{ type: 'predicate', predicate: 'achieved(goal)' }],
        },
      ],
    };
  }

  /**
   * Create initial state
   */
  private createInitialState(): PDDLState {
    return {
      predicates: new Set([
        'at(agent1, home)',
        'available(knowledge)',
        'available(tools)',
        'connected(home, workspace)',
        'connected(workspace, communication_channel)',
      ]),
      objects: new Map([
        ['agent1', 'agent'],
        ['home', 'location'],
        ['workspace', 'location'],
        ['communication_channel', 'location'],
        ['knowledge', 'resource'],
        ['tools', 'resource'],
      ]),
      timestamp: new Date(),
    };
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
      name: 'PDDL Planner',
      version: '1.0.0',
      description:
        'Automated planning using Planning Domain Definition Language',
      author: 'SYMindX',
      paradigms: [ReasoningParadigm.PDDL_PLANNING],
      learningCapable: true,
    };
  }

  /**
   * Main thinking method using PDDL planning
   */
  async think(agent: Agent, context: ThoughtContext): Promise<ThoughtResult> {
    const startTime = Date.now();
    const thoughts: string[] = [];
    const actions: AgentAction[] = [];
    const memories: MemoryRecord[] = [];

    // Update current state with context
    this.updateState(agent, context);

    // Generate planning problem
    const problem = this.generateProblem(agent, context);
    thoughts.push(`Generated PDDL problem: ${problem.domain}`);

    // Solve planning problem
    const plan = await this.solveProblem(problem);
    thoughts.push(`Generated plan with ${plan.actions.length} steps`);

    // Convert plan to agent actions
    if (plan.valid) {
      const agentActions = this.convertPlanToActions(agent, plan);
      actions.push(...agentActions);
      thoughts.push(
        `Converted plan to ${agentActions.length} executable actions`
      );
    }

    // Record planning attempt
    this.planningHistory.push({
      problem,
      plan,
      success: plan.valid,
      timestamp: new Date(),
    });

    // Create memory of planning process
    const memory = this.createPlanningMemory(agent, problem, plan);
    memories.push(memory);

    // Calculate performance
    const reasoningTime = Date.now() - startTime;
    const confidence = plan.valid ? 0.8 : 0.3;

    // Log reasoning performance
    runtimeLogger.debug(
      `🧠 PDDL planning completed in ${reasoningTime}ms (confidence: ${confidence})`
    );

    return {
      thoughts,
      actions,
      emotions: {
        current: plan.valid ? 'confident' : 'frustrated',
        intensity: confidence,
        triggers: ['planning'],
        history: [],
        timestamp: new Date(),
      },
      memories,
      confidence,
    };
  }

  /**
   * Plan using PDDL approach
   */
  async plan(agent: Agent, goal: string): Promise<Plan> {
    // Generate PDDL problem for the goal
    const problem = this.generateGoalProblem(agent, goal);

    // Solve the problem
    const pddlPlan = await this.solveProblem(problem);

    // Convert to Plan format
    const steps: PlanStep[] = pddlPlan.actions.map((action, index) => ({
      id: `step_${index + 1}`,
      action: action.name,
      description: this.generateActionDescription(action),
      status: PlanStepStatus.PENDING,
      parameters: action.parameters,
      preconditions: [],
      effects: action.effects,
    }));

    return {
      id: `plan_${Date.now()}`,
      goal,
      steps,
      priority: 0.8,
      estimatedDuration: this.estimatePlanDuration(pddlPlan),
      dependencies: [],
      status: pddlPlan.valid ? ('pending' as any) : ('failed' as any),
    };
  }

  /**
   * Decide using PDDL planning
   */
  async decide(agent: Agent, options: Decision[]): Promise<Decision> {
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

    // Create planning problems for each option
    const evaluatedOptions = await Promise.all(
      options.map(async (option) => {
        const problem = this.generateDecisionProblem(agent, option);
        const plan = await this.solveProblem(problem);
        return {
          option,
          plan,
          score: this.scorePlan(plan),
        };
      })
    );

    // Select best option
    const bestOption = evaluatedOptions.reduce((best, current) =>
      current.score > best.score ? current : best
    );

    return bestOption.option;
  }

  /**
   * Learn from experience
   */
  async learn(_agent: Agent, experience: Experience): Promise<void> {
    const { state, action, reward, nextState } = experience;

    // Update domain based on experience
    if (reward.value > 0.5) {
      this.reinforceSuccessfulActions(action, reward);
    } else if (reward.value < -0.5) {
      this.adjustFailedActions(action, reward);
    }

    // Update state model
    this.updateStateModel(state, action, nextState);

    runtimeLogger.cognition(
      `PDDL planner learned from experience: ${reward.type}`
    );
  }

  /**
   * Update current state with context
   */
  private updateState(agent: Agent, context: ThoughtContext): void {
    // Add agent state predicates
    this.currentState.predicates.add(
      `agent_status(${agent.id}, ${agent.status})`
    );

    // Add context predicates
    context.events.forEach((event, index) => {
      this.currentState.predicates.add(`event(event_${index}, ${event.type})`);

      if (event.data?.message) {
        this.currentState.predicates.add(`has_message(event_${index})`);
      }
    });

    // Add goal predicates
    if (context.goal) {
      this.currentState.predicates.add(
        `active_goal(${context.goal.replace(/\s+/g, '_')})`
      );
    }

    this.currentState.timestamp = new Date();
  }

  /**
   * Generate PDDL problem from context
   */
  private generateProblem(agent: Agent, context: ThoughtContext): PDDLProblem {
    const objects = [
      { name: agent.id, type: 'agent' },
      { name: 'current_location', type: 'location' },
      { name: 'target_location', type: 'location' },
    ];

    const initialState = Array.from(this.currentState.predicates);
    const init = initialState;

    // Generate goal state
    const goalExpressions: PDDLExpression[] = [];
    if (context.goal) {
      goalExpressions.push({
        type: 'predicate',
        predicate: `achieved(${context.goal.replace(/\s+/g, '_')})`,
      });
    }

    // Default goal if none specified
    if (goalExpressions.length === 0) {
      goalExpressions.push({
        type: 'predicate',
        predicate: 'communicated(agent, response)',
      });
    }

    return {
      name: 'thinking_problem',
      domain: this.domain.name,
      objects,
      init,
      initialState: this.currentState.predicates,
      goal: { type: 'and', expressions: goalExpressions },
      goalState: new Set(goalExpressions.map((expr) => expr.predicate || '')),
    };
  }

  /**
   * Generate PDDL problem for a specific goal
   */
  private generateGoalProblem(agent: Agent, goal: string): PDDLProblem {
    const goalId = `goal_${Date.now()}`;
    const objects = [
      { name: agent.id, type: 'agent' },
      { name: goalId, type: 'goal' },
    ];

    const initialState = Array.from(this.currentState.predicates);

    // Create goal expressions based on the actual goal content
    const goalExpressions: PDDLExpression[] = [
      { type: 'predicate', predicate: `achieved(${goalId})` },
    ];

    // Add specific goal predicates based on goal content
    if (goal.includes('help')) {
      goalExpressions.push({
        type: 'predicate',
        predicate: `helped(${agent.id})`,
      });
    }
    if (goal.includes('answer')) {
      goalExpressions.push({
        type: 'predicate',
        predicate: `answered(${agent.id})`,
      });
    }
    if (goal.includes('plan')) {
      goalExpressions.push({
        type: 'predicate',
        predicate: `planned(${agent.id})`,
      });
    }

    return {
      name: 'goal_problem',
      domain: this.domain.name,
      objects,
      init: initialState,
      initialState: this.currentState.predicates,
      goal: { type: 'and', expressions: goalExpressions },
      goalState: new Set(goalExpressions.map((expr) => expr.predicate || '')),
    };
  }

  /**
   * Generate PDDL problem for decision making
   */
  private generateDecisionProblem(agent: Agent, option: Decision): PDDLProblem {
    const objects = [
      { name: agent.id, type: 'agent' },
      { name: option.id, type: 'goal' },
    ];

    const initialState = Array.from(this.currentState.predicates);
    const goalExpressions: PDDLExpression[] = [
      { type: 'predicate', predicate: `achieved(${option.id})` },
    ];

    // Add decision-specific predicates based on option properties
    if (option.confidence > 0.7) {
      goalExpressions.push({
        type: 'predicate',
        predicate: `high_confidence(${option.id})`,
      });
    }
    if (option.rationale.includes('critical')) {
      goalExpressions.push({
        type: 'predicate',
        predicate: `critical_decision(${option.id})`,
      });
    }

    return {
      name: 'decision_problem',
      domain: this.domain.name,
      objects,
      init: initialState,
      initialState: this.currentState.predicates,
      goal: { type: 'and', expressions: goalExpressions },
      goalState: new Set(goalExpressions.map((expr) => expr.predicate || '')),
    };
  }

  /**
   * Solve PDDL problem (simplified forward search)
   */
  private async solveProblem(problem: PDDLProblem): Promise<PDDLPlan> {
    const maxDepth = this.config.pddlPlanner?.maxPlanLength || 10;
    const timeout = this.config.pddlPlanner?.timeout || 5000;

    const startTime = Date.now();

    // Simple forward search
    const queue: Array<{
      state: Set<string>;
      actions: PDDLActionInstance[];
      cost: number;
    }> = [
      {
        state: new Set(problem.initialState),
        actions: [],
        cost: 0,
      },
    ];

    while (queue.length > 0 && Date.now() - startTime < timeout) {
      const current = queue.shift()!;

      // Check if goal is achieved
      if (
        this.isGoalAchieved(current.state, Array.from(problem.goalState || []))
      ) {
        return {
          actions: current.actions,
          cost: current.cost,
          length: current.actions.length,
          valid: true,
        };
      }

      // Check depth limit
      if (current.actions.length >= maxDepth) {
        continue;
      }

      // Generate successor states
      const successors = this.generateSuccessors(
        current.state,
        current.actions,
        current.cost
      );
      queue.push(...successors);
    }

    // No solution found
    return {
      actions: [],
      cost: Infinity,
      length: 0,
      valid: false,
    };
  }

  /**
   * Check if goal is achieved
   */
  private isGoalAchieved(state: Set<string>, goalState: string[]): boolean {
    return goalState.every((goal) => state.has(goal));
  }

  /**
   * Generate successor states
   */
  private generateSuccessors(
    state: Set<string>,
    actions: PDDLActionInstance[],
    cost: number
  ): Array<{
    state: Set<string>;
    actions: PDDLActionInstance[];
    cost: number;
  }> {
    const successors: Array<{
      state: Set<string>;
      actions: PDDLActionInstance[];
      cost: number;
    }> = [];

    // Try each action in the domain
    for (const action of this.domain.actions) {
      const instances = this.instantiateAction(action, state);

      for (const instance of instances) {
        if (this.canApplyAction(instance, state)) {
          const newState = this.applyAction(instance, state);
          successors.push({
            state: newState,
            actions: [...actions, instance],
            cost: cost + instance.cost,
          });
        }
      }
    }

    return successors;
  }

  /**
   * Instantiate action with objects
   */
  private instantiateAction(
    action: PDDLAction,
    _state: Set<string>
  ): PDDLActionInstance[] {
    // Simple instantiation - in practice, this would be more sophisticated
    const instances: PDDLActionInstance[] = [];

    // Create a basic instance
    const instance: PDDLActionInstance = {
      name: action.name,
      parameters: {},
      precondition:
        action.precondition.expressions?.map((e) => e.predicate || '') ||
        [action.precondition.predicate || ''].filter(Boolean),
      effects: action.effects
        ? action.effects.map((e) => e.predicate || '')
        : [],
      cost: 1,
    };

    instances.push(instance);
    return instances;
  }

  /**
   * Check if action can be applied
   */
  private canApplyAction(
    action: PDDLActionInstance,
    state: Set<string>
  ): boolean {
    return action.precondition.every((precondition) => {
      // Simple check - in practice, this would handle variable binding
      const simplified = precondition.replace(/\([^)]*\)/g, '');
      return Array.from(state).some((s) => s.includes(simplified));
    });
  }

  /**
   * Apply action to state
   */
  private applyAction(
    action: PDDLActionInstance,
    state: Set<string>
  ): Set<string> {
    const newState = new Set(state);

    // Apply effects
    for (const effect of action.effects) {
      if (effect.includes('achieved')) {
        newState.add(effect);
      }
    }

    return newState;
  }

  /**
   * Convert PDDL plan to agent actions
   */
  private convertPlanToActions(agent: Agent, plan: PDDLPlan): AgentAction[] {
    return plan.actions.map((action, index) => ({
      id: `action_${Date.now()}_${index}`,
      agentId: agent.id,
      type: this.mapActionType(action.name),
      action: action.name,
      parameters: action.parameters,
      priority: 0.8,
      status: ActionStatus.PENDING,
      extension: 'pddl_planner',
      timestamp: new Date(),
    }));
  }

  /**
   * Map PDDL action to agent action type
   */
  private mapActionType(actionName: string): ActionCategory {
    switch (actionName) {
      case 'communicate':
        return ActionCategory.COMMUNICATION;
      case 'move':
        return ActionCategory.MOVEMENT;
      case 'acquire_resource':
        return ActionCategory.RESOURCE_MANAGEMENT;
      case 'work_on_goal':
        return ActionCategory.PROCESSING;
      default:
        return ActionCategory.PROCESSING;
    }
  }

  /**
   * Create planning memory
   */
  private createPlanningMemory(
    agent: Agent,
    problem: PDDLProblem,
    plan: PDDLPlan
  ): MemoryRecord {
    const content = `PDDL planning: ${plan.valid ? 'successful' : 'failed'} plan with ${plan.actions.length} steps`;

    return {
      id: `memory_${Date.now()}`,
      agentId: agent.id,
      type: MemoryType.REASONING,
      content,
      metadata: {
        reasoning_type: 'pddl_planning',
        problem: problem as any,
        plan: plan as any,
        timestamp: new Date(),
      },
      importance: plan.valid ? 0.8 : 0.5,
      timestamp: new Date(),
      tags: ['reasoning', 'pddl', 'planning'],
      duration: MemoryDuration.LONG_TERM,
    };
  }

  /**
   * Generate action description
   */
  private generateActionDescription(action: PDDLActionInstance): string {
    return `${action.name} with parameters: ${JSON.stringify(action.parameters)}`;
  }

  /**
   * Estimate plan duration
   */
  private estimatePlanDuration(plan: PDDLPlan): number {
    return plan.actions.length * 30000; // 30 seconds per action
  }

  /**
   * Score a plan for decision making
   */
  private scorePlan(plan: PDDLPlan): number {
    if (!plan.valid) return 0;

    // Simple scoring - prefer shorter, lower-cost plans
    const lengthScore = 1 / (1 + plan.length);
    const costScore = 1 / (1 + plan.cost);

    return (lengthScore + costScore) / 2;
  }

  /**
   * Reinforce successful actions
   */
  private reinforceSuccessfulActions(action: any, _reward: any): void {
    // Update action costs (lower cost for successful actions)
    const actionName = action.type || 'unknown';
    const domainAction = this.domain.actions.find((a) => a.name === actionName);

    if (domainAction) {
      // In practice, we'd update the action's cost model
      runtimeLogger.cognition(`Reinforcing successful action: ${actionName}`);
    }
  }

  /**
   * Adjust failed actions
   */
  private adjustFailedActions(action: any, _reward: any): void {
    // Update action costs (higher cost for failed actions)
    const actionName = action.type || 'unknown';
    const domainAction = this.domain.actions.find((a) => a.name === actionName);

    if (domainAction) {
      // In practice, we'd update the action's cost model
      runtimeLogger.cognition(`Adjusting failed action: ${actionName}`);
    }
  }

  /**
   * Update state model based on experience
   */
  private updateStateModel(_state: any, _action: any, _nextState: any): void {
    // Learn state transitions
    // In practice, this would update the domain model
    runtimeLogger.cognition('Updated state model from experience');
  }
}

/**
 * Factory function for creating PDDL planner
 */
export function createPDDLPlanner(config: HybridReasoningConfig): PDDLPlanner {
  return new PDDLPlanner(config);
}
