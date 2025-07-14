import {
  HTNOperator,
  HTNPrecondition,
  HTNEffect,
  HTNDecomposition,
  HTNSubtask,
  PlanExecutionResult,
  DecisionMatrix,
  DecisionOption,
  DecisionCriterion,
  StructuredThoughtResult,
  ThoughtNode,
  ReasoningPath,
} from '../../../types';
import {
  Agent,
  ThoughtContext,
  ThoughtResult,
  Plan,
  Decision,
  PlanStep,
  EmotionState,
  AgentAction,
  PlanStatus,
  PlanStepStatus,
  ActionStatus,
} from '../../../types/agent';
import {
  CognitionModule,
  CognitionModuleMetadata,
} from '../../../types/cognition';
import { BaseConfig } from '../../../types/common';

import { HTNPlannerConfig, TaskNetwork, Task } from './types';

export class HTNPlannerCognition implements CognitionModule {
  public id: string;
  public type: string = 'htn_planner';
  private config: HTNPlannerConfig;
  private taskNetworks: Map<string, TaskNetwork> = new Map();
  private decompositionCache: Map<string, Task[]> = new Map();
  private operators: Map<string, HTNOperator> = new Map();
  private thoughtGraph: Map<string, ThoughtNode> = new Map();

  constructor(config: HTNPlannerConfig = {}) {
    this.id = `htn_planner_${Date.now()}`;
    this.config = {
      maxPlanningDepth: 5,
      maxPlanSteps: 20,
      planningTimeout: 10000,
      enableDecomposition: true,
      maxDecompositionLevels: 3,
      goalPriorityWeighting: true,
      parallelGoalHandling: false,
      cacheDecompositions: true,
      optimizePlans: true,
      useHeuristics: true,
      ...config,
    };
    this.initializeOperators();
  }

  async think(agent: Agent, context: ThoughtContext): Promise<ThoughtResult> {
    const startTime = Date.now();

    // Analyze the context to identify goals
    const goals = this.extractGoals(context);
    const thoughts: string[] = [];

    // Deep analysis for complex goals
    thoughts.push(`Analyzing ${goals.length} identified goals...`);

    // Create hierarchical plans for each goal
    const plans: Plan[] = [];
    for (const goal of goals) {
      const plan = await this.plan(agent, goal);
      plans.push(plan);
      thoughts.push(
        `Decomposed goal "${goal}" into ${plan.steps.length} steps`
      );
    }

    // Determine next actions based on plan priorities
    const nextActions = this.prioritizeActions(agent, plans);

    const processingTime = Date.now() - startTime;
    thoughts.push(`HTN planning completed in ${processingTime}ms`);

    return {
      thoughts,
      confidence: 0.85,
      actions: nextActions,
      emotions: this.assessEmotionalResponse(context, plans),
      memories: [],
    };
  }

  async plan(agent: Agent, goal: string): Promise<Plan> {
    const startTime = Date.now();

    // Use agent context for personalized planning
    const agentContext = {
      id: agent.id,
      personality: agent.config.core.personality,
      capabilities: agent.extensions ? Object.keys(agent.extensions) : [],
    };

    // Planning for agent context

    // Create or retrieve task network for this goal
    const network = this.getOrCreateTaskNetwork(goal);

    // Decompose the goal into hierarchical tasks
    const decomposedTasks = await this.decomposeGoal(goal, network);

    // Convert tasks to plan steps
    const steps = this.tasksToSteps(decomposedTasks);

    // Optimize the plan if enabled
    if (this.config.optimizePlans) {
      this.optimizePlan(steps);
    }

    const duration = Date.now() - startTime;

    return {
      id: `plan_${Date.now()}`,
      goal,
      steps,
      priority: this.calculatePriority(goal),
      estimatedDuration: duration * steps.length, // Rough estimate
      dependencies: [],
      status: PlanStatus.PENDING,
    };
  }

  async decide(agent: Agent, options: Decision[]): Promise<Decision> {
    // HTN-based decision making
    const rankedOptions = await this.rankOptions(options, agent);

    if (rankedOptions.length === 0) {
      throw new Error('No viable options for HTN decision');
    }

    // Select the highest-ranked option
    return rankedOptions[0]!;
  }

  initialize(config: BaseConfig): void {
    this.config = { ...this.config, ...config };
  }

  getMetadata(): CognitionModuleMetadata {
    return {
      id: `htn_planner_${Date.now()}`,
      name: 'HTN Planner Cognition',
      version: '1.0.0',
      description: 'Hierarchical Task Network planning cognition system',
      author: 'SYMindX',
      paradigms: ['hierarchical', 'planning'],
      learningCapable: false,
    };
  }

  private extractGoals(context: ThoughtContext): string[] {
    const goals: string[] = [];

    // Extract explicit goals from content
    if (context.goal) {
      // Look for goal indicators
      const goalPatterns = [
        /want to (.*?)(?:\.|$)/gi,
        /need to (.*?)(?:\.|$)/gi,
        /should (.*?)(?:\.|$)/gi,
        /plan to (.*?)(?:\.|$)/gi,
      ];

      for (const pattern of goalPatterns) {
        const matches = context.goal.matchAll(pattern);
        for (const match of matches) {
          const captured = match[1];
          if (captured) {
            goals.push(captured.trim());
          }
        }
      }
    }

    // If no explicit goals found, infer from context
    if (goals.length === 0) {
      goals.push(context.goal || 'respond_appropriately');
    }

    return goals;
  }

  private getOrCreateTaskNetwork(goal: string): TaskNetwork {
    if (this.taskNetworks.has(goal)) {
      return this.taskNetworks.get(goal)!;
    }

    // Create a basic task network for this goal
    const network: TaskNetwork = {
      tasks: [
        {
          id: 'root',
          name: goal,
          type: 'compound',
          parameters: {},
        },
      ],
      methods: [],
      ordering: [],
    };

    this.taskNetworks.set(goal, network);
    return network;
  }

  private async decomposeGoal(
    goal: string,
    network: TaskNetwork
  ): Promise<Task[]> {
    // Check cache first
    const cacheKey = `${goal}_${network.tasks.length}`;
    if (
      this.config.cacheDecompositions &&
      this.decompositionCache.has(cacheKey)
    ) {
      return this.decompositionCache.get(cacheKey)!;
    }

    const decomposedTasks: Task[] = [];

    // Simple goal decomposition based on goal type
    if (goal.includes('respond')) {
      decomposedTasks.push(
        {
          id: 'analyze_input',
          name: 'Analyze input context',
          type: 'primitive',
          parameters: { goal },
        },
        {
          id: 'generate_response',
          name: 'Generate appropriate response',
          type: 'primitive',
          parameters: { goal },
        },
        {
          id: 'validate_response',
          name: 'Validate response quality',
          type: 'primitive',
          parameters: { goal },
        }
      );
    } else if (goal.includes('plan')) {
      decomposedTasks.push(
        {
          id: 'understand_objective',
          name: 'Understand planning objective',
          type: 'primitive',
          parameters: { goal },
        },
        {
          id: 'identify_constraints',
          name: 'Identify constraints and resources',
          type: 'primitive',
          parameters: { goal },
        },
        {
          id: 'create_strategy',
          name: 'Create strategic approach',
          type: 'primitive',
          parameters: { goal },
        }
      );
    } else {
      // Generic decomposition
      decomposedTasks.push(
        {
          id: 'understand_goal',
          name: `Understand: ${goal}`,
          type: 'primitive',
          parameters: { goal },
        },
        {
          id: 'execute_goal',
          name: `Execute: ${goal}`,
          type: 'primitive',
          parameters: { goal },
        }
      );
    }

    // Cache the result
    if (this.config.cacheDecompositions) {
      this.decompositionCache.set(cacheKey, decomposedTasks);
    }

    return decomposedTasks;
  }

  private tasksToSteps(tasks: Task[]): PlanStep[] {
    return tasks.map((task, index) => ({
      id: task.id,
      action: task.name,
      description: `HTN Task: ${task.name}`,
      status: PlanStepStatus.PENDING,
      parameters: {},
      preconditions:
        index > 0 && tasks[index - 1] ? [tasks[index - 1]?.id ?? ''] : [],
      effects: [],
    }));
  }

  private optimizePlan(steps: PlanStep[]): void {
    // Simple optimization: remove redundant steps
    const uniqueSteps = steps.filter(
      (step, index, array) =>
        array.findIndex((s) => s.action === step.action) === index
    );

    // Update the original array
    steps.splice(0, steps.length, ...uniqueSteps);
  }

  private calculatePriority(goal: string): number {
    // Priority based on goal urgency indicators
    if (goal.includes('urgent') || goal.includes('critical')) return 5;
    if (goal.includes('important') || goal.includes('priority')) return 4;
    if (goal.includes('should') || goal.includes('need')) return 3;
    return 2;
  }

  private prioritizeActions(agent: Agent, plans: Plan[]): AgentAction[] {
    // Extract and prioritize next actions from all plans
    const actions: Array<{ step: PlanStep; priority: number }> = [];

    for (const plan of plans) {
      const firstStep = plan.steps.find((step) => step.status === 'pending');
      if (firstStep) {
        actions.push({
          step: firstStep,
          priority: plan.priority,
        });
      }
    }

    // Sort by priority and convert to AgentAction objects
    return actions
      .sort((a, b) => b.priority - a.priority)
      .map((item) => ({
        id: `action_${item.step.id}_${Date.now()}`,
        agentId: agent.id,
        type: 'planned_action',
        extension: 'htn_planner',
        action: item.step.action,
        parameters: item.step.parameters,
        timestamp: new Date(),
        status: ActionStatus.PENDING,
        priority: item.priority,
      }));
  }

  private assessEmotionalResponse(
    context: ThoughtContext,
    plans: Plan[]
  ): EmotionState {
    // Use context to assess emotional impact
    const hasUrgentEvents = context.events.some((e) =>
      e.type.includes('urgent')
    );
    const hasSocialEvents = context.events.some((e) =>
      e.type.includes('social')
    );
    // Emotional assessment based on planning complexity
    const totalSteps = plans.reduce((sum, plan) => sum + plan.steps.length, 0);

    let emotion = 'thoughtful';
    let intensity = 0.6;
    const triggers: string[] = ['planning'];

    // Adjust emotion based on event urgency and social context
    if (hasUrgentEvents) {
      emotion = 'focused';
      intensity = Math.min(1.0, intensity + 0.3);
      triggers.push('urgent_events');
    } else if (hasSocialEvents) {
      emotion = 'empathetic';
      intensity = Math.min(1.0, intensity + 0.2);
      triggers.push('social_events');
    }

    if (totalSteps > 10) {
      emotion = 'focused';
      intensity = 0.8;
      triggers.push('complex_planning');
    } else if (plans.some((plan) => plan.priority >= 4)) {
      emotion = 'determined';
      intensity = 0.9;
      triggers.push('high_priority_goal');
    }

    return {
      current: emotion,
      intensity,
      triggers,
      history: [],
      timestamp: new Date(),
    };
  }

  private async rankOptions(
    options: Decision[],
    agent: Agent
  ): Promise<Decision[]> {
    // Rank options based on HTN planning criteria
    const scored = options.map((option) => ({
      ...option,
      score: this.scoreOption(option, agent),
    }));

    return scored
      .sort((a, b) => b.score - a.score)
      .filter((option) => option.score > 0.3); // Filter out poor options
  }

  private scoreOption(option: Decision, agent: Agent): number {
    let score = option.confidence || 0.5;

    // Adjust score based on agent's personality traits
    if (agent.config.psyche?.traits) {
      if (
        agent.config.psyche.traits.includes('analytical') &&
        option.reasoning?.includes('analysis')
      ) {
        score += 0.1;
      }
      if (
        agent.config.psyche.traits.includes('cautious') &&
        option.reasoning?.includes('safe')
      ) {
        score += 0.1;
      }
    }

    // Boost score for strategic options
    if (
      option.reasoning?.includes('plan') ||
      option.reasoning?.includes('strategy')
    ) {
      score += 0.2;
    }

    // Boost score for goal-aligned options
    if (
      option.reasoning?.includes('goal') ||
      option.reasoning?.includes('objective')
    ) {
      score += 0.1;
    }

    return Math.min(1.0, score);
  }

  private initializeOperators(): void {
    // Initialize basic HTN operators
    const basicOperators: HTNOperator[] = [
      {
        id: 'analyze_context',
        name: 'Analyze Context',
        type: 'primitive',
        preconditions: [
          {
            type: 'state',
            predicate: 'has_context',
            parameters: ['agent'],
            positive: true,
          },
        ],
        effects: [
          {
            type: 'add',
            predicate: 'context_analyzed',
            parameters: ['agent'],
          },
        ],
        cost: 1.0,
      },
      {
        id: 'decompose_goal',
        name: 'Decompose Goal',
        type: 'compound',
        preconditions: [
          {
            type: 'state',
            predicate: 'has_goal',
            parameters: ['agent', 'goal'],
            positive: true,
          },
        ],
        effects: [
          {
            type: 'add',
            predicate: 'goal_decomposed',
            parameters: ['agent', 'goal'],
          },
        ],
        cost: 2.0,
        decomposition: {
          method: 'goal_analysis',
          subtasks: [
            {
              id: 'identify_subgoals',
              task: 'identify_subgoals',
              parameters: ['goal'],
            },
            {
              id: 'prioritize_subgoals',
              task: 'prioritize_subgoals',
              parameters: ['subgoals'],
            },
          ],
          ordering: [
            {
              type: 'before',
              first: 'identify_subgoals',
              second: 'prioritize_subgoals',
            },
          ],
        },
      },
    ];

    basicOperators.forEach((op) => this.operators.set(op.id, op));
  }

  private createThoughtNode(
    content: string,
    confidence: number,
    type?:
      | 'observation'
      | 'inference'
      | 'hypothesis'
      | 'conclusion'
      | 'question'
  ): ThoughtNode {
    const node: ThoughtNode = {
      id: `thought_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content,
      confidence,
      type,
      connections: [],
      timestamp: new Date(),
    };
    this.thoughtGraph.set(node.id, node);
    return node;
  }

  private createReasoningPath(goal: string, plan: Plan): ReasoningPath {
    return {
      id: `path_${plan.id}`,
      steps: plan.steps.map((step, index) => ({
        stepNumber: index + 1,
        thoughtNodeId: this.createThoughtNode(
          `Execute: ${step.action}`,
          0.8,
          'inference'
        ).id,
        action: step.action,
        justification: step.description || 'Required for goal achievement',
        confidence: 0.8,
        dependencies:
          step.preconditions
            ?.map((p) => plan.steps.findIndex((s) => s.id === p))
            .filter((i) => i >= 0) || [],
      })),
      probability: 0.75,
      outcome: `Achieve: ${goal}`,
      evaluation: {
        consistency: 0.85,
        completeness: 0.8,
        efficiency: 0.7,
        risk: plan.priority >= 4 ? 'high' : 'medium',
      },
    };
  }

  private evaluateOperatorPreconditions(
    operator: HTNOperator,
    state: Set<string>
  ): boolean {
    return operator.preconditions.every((precond) => {
      const predicate = `${precond.predicate}(${precond.parameters.join(',')})`;
      return precond.positive ? state.has(predicate) : !state.has(predicate);
    });
  }

  private applyOperatorEffects(
    operator: HTNOperator,
    state: Set<string>
  ): Set<string> {
    const newState = new Set(state);

    operator.effects.forEach((effect) => {
      const predicate = `${effect.predicate}(${effect.parameters.join(',')})`;

      switch (effect.type) {
        case 'add':
          newState.add(predicate);
          break;
        case 'delete':
          newState.delete(predicate);
          break;
        case 'update':
          // For updates, remove old value and add new
          const oldPredicate = Array.from(newState).find((p) =>
            p.startsWith(`${effect.predicate}(`)
          );
          if (oldPredicate) newState.delete(oldPredicate);
          newState.add(predicate);
          break;
      }
    });

    return newState;
  }
}

export default HTNPlannerCognition;

// Export factory function for easy instantiation
export function createHtnPlannerCognition(
  config: HTNPlannerConfig = {}
): HTNPlannerCognition {
  return new HTNPlannerCognition(config);
}
