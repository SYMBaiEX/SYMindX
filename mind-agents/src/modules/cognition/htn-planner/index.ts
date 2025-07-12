import {
  Agent,
  ThoughtContext,
  ThoughtResult,
  Plan,
  Decision,
  PlanStep,
  EmotionState,
  AgentAction,
} from '../../../types/agent';
import { CognitionModule } from '../../../types/cognition';

import { HTNPlannerConfig, TaskNetwork, Task, Method } from './types';

export class HTNPlannerCognition implements CognitionModule {
  public id: string;
  public type: string = 'htn_planner';
  private config: HTNPlannerConfig;
  private taskNetworks: Map<string, TaskNetwork> = new Map();
  private decompositionCache: Map<string, Task[]> = new Map();

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
    const nextActions = this.prioritizeActions(plans);

    const processingTime = Date.now() - startTime;

    return {
      thoughts,
      // reasoning: 'Hierarchical task decomposition and goal-oriented planning', // Removed - not part of ThoughtResult
      confidence: 0.85,
      actions: nextActions,
      emotions: this.assessEmotionalResponse(context, plans),
      memories: [],
      // processingTime // Removed - not part of ThoughtResult
    };
  }

  async plan(agent: Agent, goal: string): Promise<Plan> {
    const startTime = Date.now();

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
      status: 'pending' as any, // TODO: Use proper enum
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

  initialize(config: any): void {
    this.config = { ...this.config, ...config };
  }

  getMetadata() {
    return {
      id: `htn_planner_${Date.now()}`,
      name: 'HTN Planner Cognition',
      version: '1.0.0',
      description: 'Hierarchical Task Network planning cognition system',
      author: 'SYMindX',
      paradigms: ['hierarchical', 'planning'] as any,
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
      status: 'pending' as any,
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

  private prioritizeActions(plans: Plan[]): AgentAction[] {
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
        type: 'planned_action',
        extension: 'htn_planner',
        action: item.step.action,
        parameters: item.step.parameters,
        timestamp: new Date(),
        status: 'pending' as any,
        priority: item.priority,
      }));
  }

  private assessEmotionalResponse(
    context: ThoughtContext,
    plans: Plan[]
  ): EmotionState {
    // Emotional assessment based on planning complexity
    const totalSteps = plans.reduce((sum, plan) => sum + plan.steps.length, 0);

    let emotion = 'thoughtful';
    let intensity = 0.6;
    const triggers: string[] = ['planning'];

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
}

export default HTNPlannerCognition;

// Export factory function for easy instantiation
export function createHtnPlannerCognition(
  config: HTNPlannerConfig = {}
): HTNPlannerCognition {
  return new HTNPlannerCognition(config);
}
