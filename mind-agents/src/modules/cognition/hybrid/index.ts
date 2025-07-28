import {
  Agent,
  ThoughtContext,
  ThoughtResult,
  Plan,
  Decision,
  EmotionState,
} from '../../../types/agent';
// Remove unused AgentAction import - actions are created inline
// Agent imports should come first
import {
  CognitionModule,
  CognitionModuleMetadata,
  ReasoningParadigm,
} from '../../../types/cognition';
import { runtimeLogger } from '../../../utils/logger';

import { HybridCognitionConfig } from './types';

export class HybridCognition implements CognitionModule {
  public id: string;
  public type: string = 'hybrid';
  private config: HybridCognitionConfig;
  private contextCache: Map<string, unknown> = new Map();
  private performanceHistory: Array<{
    approach: 'reactive' | 'planning';
    success: boolean;
  }> = [];

  constructor(config: HybridCognitionConfig = {}) {
    this.id = `hybrid_${Date.now()}`;
    this.config = {
      reactiveWeight: 0.4,
      planningWeight: 0.6,
      complexityThreshold: 0.7,
      urgencyThreshold: 0.8,
      maxPlanningTime: 5000,
      fallbackToReactive: true,
      enableAdaptation: true,
      adaptationRate: 0.05,
      contextAnalysisDepth: 'moderate',
      enableContextCaching: true,
      ...config,
    };
  }

  async think(agent: Agent, context: ThoughtContext): Promise<ThoughtResult> {
    const startTime = Date.now();

    // Analyze context to determine approach
    const contextAnalysis = this.analyzeContext(context);
    const approach = this.selectApproach(contextAnalysis);

    let result: ThoughtResult;

    try {
      if (approach === 'reactive') {
        result = await this.reactiveThinking(agent, context, contextAnalysis);
      } else {
        result = await this.planningThinking(agent, context, contextAnalysis);
      }

      // Record successful approach
      this.recordPerformance(approach, true);
    } catch (error) {
      void error;
      // Fallback to reactive if planning fails
      if (approach === 'planning' && this.config.fallbackToReactive) {
        result = await this.reactiveThinking(agent, context, contextAnalysis);
        this.recordPerformance('reactive', true);
      } else {
        this.recordPerformance(approach, false);
        throw error;
      }
    }

    // Log processing time
    const processingTime = Date.now() - startTime;
    result.thoughts.push(
      `Hybrid thinking completed in ${processingTime}ms using ${approach} approach`
    );

    // Add hybrid metadata
    result.thoughts.unshift(
      `Using ${approach} approach (${Math.round(contextAnalysis.complexity * 100)}% complexity)`
    );
    // result.reasoning = `Hybrid cognition: ${approach} - ${result.reasoning}` // Removed - not part of ThoughtResult

    // Adapt weights based on performance if enabled
    if (this.config.enableAdaptation) {
      this.adaptWeights();
    }

    return result;
  }

  async plan(agent: Agent, goal: string): Promise<Plan> {
    // Use a balanced approach for planning
    runtimeLogger.debug(
      `[Hybrid] Creating plan for agent ${agent.id}: ${goal}`
    );
    const complexity = this.assessGoalComplexity(goal);

    if (complexity > this.config.complexityThreshold!) {
      return this.createDetailedPlan(goal);
    } else {
      return this.createSimplePlan(goal);
    }
  }

  async decide(agent: Agent, options: Decision[]): Promise<Decision> {
    // Hybrid decision making
    runtimeLogger.debug(
      `[Hybrid] Agent ${agent.id} making decision from ${options.length} options`
    );
    const urgency = this.assessUrgency(options);

    if (urgency > this.config.urgencyThreshold!) {
      // Quick decision for urgent situations
      return this.makeQuickDecision(options);
    } else {
      // Deliberate decision for non-urgent situations
      return this.makeDeliberateDecision(options);
    }
  }

  initialize(config: any): void {
    this.config = { ...this.config, ...config };
  }

  getMetadata(): CognitionModuleMetadata {
    return {
      id: `hybrid_${Date.now()}`,
      name: 'Hybrid Cognition',
      version: '1.0.0',
      description: 'Hybrid reactive and planning cognition system',
      author: 'SYMindX',
      paradigms: [ReasoningParadigm.HYBRID, ReasoningParadigm.RULE_BASED],
      learningCapable: this.config.enableAdaptation || false,
    };
  }

  private analyzeContext(context: ThoughtContext): any {
    const cacheKey = JSON.stringify(context);

    if (this.config.enableContextCaching && this.contextCache.has(cacheKey)) {
      return this.contextCache.get(cacheKey);
    }

    const analysis = {
      complexity: this.assessComplexity(context),
      urgency: this.assessUrgency(context),
      emotionalContent: this.detectEmotionalContent(context),
      goalOriented: this.detectGoalOrientation(context),
      requiresPlanning: this.detectPlanningNeeds(context),
    };

    if (this.config.enableContextCaching) {
      this.contextCache.set(cacheKey, analysis);
    }

    return analysis;
  }

  private selectApproach(analysis: any): 'reactive' | 'planning' {
    // Calculate scores for each approach
    const reactiveScore = this.calculateReactiveScore(analysis);
    const planningScore = this.calculatePlanningScore(analysis);

    return reactiveScore > planningScore ? 'reactive' : 'planning';
  }

  private calculateReactiveScore(analysis: any): number {
    let score = this.config.reactiveWeight!;

    // Boost reactive for urgent situations
    if (analysis.urgency > 0.7) score += 0.3;

    // Boost reactive for simple contexts
    if (analysis.complexity < 0.4) score += 0.2;

    // Boost reactive for emotional content
    if (analysis.emotionalContent > 0.6) score += 0.1;

    return Math.min(1.0, score);
  }

  private calculatePlanningScore(analysis: any): number {
    let score = this.config.planningWeight!;

    // Boost planning for complex situations
    if (analysis.complexity > 0.6) score += 0.3;

    // Boost planning for goal-oriented contexts
    if (analysis.goalOriented > 0.5) score += 0.2;

    // Boost planning when planning is explicitly needed
    if (analysis.requiresPlanning > 0.7) score += 0.2;

    return Math.min(1.0, score);
  }

  private async reactiveThinking(
    agent: Agent,
    context: ThoughtContext,
    analysis: any
  ): Promise<ThoughtResult> {
    // Fast, pattern-based response based on agent's experience
    const thoughts = [
      `Applying reactive cognition pattern for agent: ${agent.name}`,
    ];

    // Adjust confidence based on agent's experience level and personality
    let confidence = 0.7 - analysis.complexity * 0.2;
    const traits =
      agent.characterConfig?.personality &&
      typeof agent.characterConfig.personality === 'object' &&
      'traits' in agent.characterConfig.personality
        ? agent.characterConfig.personality.traits
        : {};
    const conscientiousness =
      traits && typeof traits === 'object' && 'conscientiousness' in traits
        ? (traits as any).conscientiousness
        : 0.5;
    if (conscientiousness > 0.7) {
      confidence += 0.1; // More conscientious agents are more confident in quick decisions
    }
    confidence = Math.max(0.1, Math.min(1.0, confidence));

    return {
      thoughts,
      confidence,
      actions: this.generateQuickActions(context).map((action) => ({
        id: `action_${Date.now()}_${Math.random()}`,
        agentId: agent.id,
        type: 'reactive_action',
        extension: 'hybrid_cognition',
        action,
        parameters: {},
        timestamp: new Date(),
        status: 'pending' as any,
      })),
      emotions: this.quickEmotionalAssessment(context) || {
        current: 'neutral',
        intensity: 0.5,
        triggers: [],
        history: [],
        timestamp: new Date(),
      },
      memories: [],
    };
  }

  private async planningThinking(
    agent: Agent,
    context: ThoughtContext,
    analysis: any
  ): Promise<ThoughtResult> {
    const startTime = Date.now();

    // More deliberate, goal-oriented response tailored to agent
    const thoughts = [
      `Analyzing context for planning approach (agent: ${agent.name})`,
      'Identifying goals and sub-goals',
      'Considering multiple response strategies',
    ];

    // Use agent's planning style based on personality
    const traits =
      agent.characterConfig?.personality &&
      typeof agent.characterConfig.personality === 'object' &&
      'traits' in agent.characterConfig.personality
        ? agent.characterConfig.personality.traits
        : {};
    const openness =
      traits && typeof traits === 'object' && 'openness' in traits
        ? (traits as any).openness
        : 0.5;
    const conscientiousnessPlanning =
      traits && typeof traits === 'object' && 'conscientiousness' in traits
        ? (traits as any).conscientiousness
        : 0.5;
    if (openness > 0.7) {
      thoughts.push('Exploring creative planning alternatives');
    }
    if (conscientiousnessPlanning > 0.7) {
      thoughts.push('Applying systematic planning methodology');
    }

    // Check timeout
    const timeoutTime = startTime + this.config.maxPlanningTime!;

    const confidence = 0.8 + analysis.complexity * 0.1; // Higher confidence for complex situations

    const result: ThoughtResult = {
      thoughts,
      confidence,
      actions: this.generatePlannedActions(context, analysis).map((action) => ({
        id: `action_${Date.now()}_${Math.random()}`,
        agentId: agent.id,
        type: 'planned_action',
        extension: 'hybrid_cognition',
        action,
        parameters: {},
        timestamp: new Date(),
        status: 'pending' as any,
      })),
      emotions: this.deliberateEmotionalAssessment(context, analysis) || {
        current: 'focused',
        intensity: 0.7,
        triggers: ['planning'],
        history: [],
        timestamp: new Date(),
      },
      memories: [],
      plan: await this.createDetailedPlan(context.goal || 'respond'),
    };

    // Check if we exceeded timeout
    if (Date.now() > timeoutTime) {
      throw new Error('Planning timeout exceeded');
    }

    return result;
  }

  private assessComplexity(context: ThoughtContext | any): number {
    if ('complexity' in context) return context.complexity;

    let complexity = 0.3; // Base complexity

    if (context.goal) {
      // Longer content is more complex
      complexity += Math.min(0.3, context.goal.length / 1000);

      // Multiple questions increase complexity
      const questionCount = (context.goal.match(/\?/g) || []).length;
      complexity += questionCount * 0.1;

      // Technical terms increase complexity
      const technicalTerms = [
        'algorithm',
        'framework',
        'implementation',
        'architecture',
      ];
      const technicalCount = technicalTerms.filter((term) =>
        context.goal.toLowerCase().includes(term)
      ).length;
      complexity += technicalCount * 0.05;
    }

    return Math.min(1.0, complexity);
  }

  private assessUrgency(context: ThoughtContext | Decision[]): number {
    if (Array.isArray(context)) {
      // For decision options
      return context.some(
        (option) =>
          option.reasoning?.includes('urgent') ||
          option.reasoning?.includes('immediate')
      )
        ? 0.9
        : 0.3;
    }

    let urgency = 0.2; // Base urgency

    if (context.goal) {
      const urgentWords = [
        'urgent',
        'immediate',
        'asap',
        'emergency',
        'critical',
        'now',
      ];
      const urgentCount = urgentWords.filter((word) =>
        context.goal!.toLowerCase().includes(word)
      ).length;
      urgency += urgentCount * 0.2;
    }

    return Math.min(1.0, urgency);
  }

  private detectEmotionalContent(context: ThoughtContext): number {
    if (!context.goal) return 0;

    const emotionalWords = [
      'feel',
      'emotion',
      'happy',
      'sad',
      'angry',
      'excited',
      'worried',
    ];
    const emotionalCount = emotionalWords.filter((word) =>
      context.goal!.toLowerCase().includes(word)
    ).length;

    return Math.min(1.0, emotionalCount * 0.2);
  }

  private detectGoalOrientation(context: ThoughtContext): number {
    if (!context.goal) return 0;

    const goalWords = [
      'goal',
      'plan',
      'achieve',
      'accomplish',
      'objective',
      'target',
    ];
    const goalCount = goalWords.filter((word) =>
      context.goal!.toLowerCase().includes(word)
    ).length;

    return Math.min(1.0, goalCount * 0.2);
  }

  private detectPlanningNeeds(context: ThoughtContext): number {
    if (!context.goal) return 0;

    const planningWords = [
      'plan',
      'strategy',
      'approach',
      'method',
      'steps',
      'process',
    ];
    const planningCount = planningWords.filter((word) =>
      context.goal!.toLowerCase().includes(word)
    ).length;

    return Math.min(1.0, planningCount * 0.2);
  }

  private generateQuickActions(context: ThoughtContext): string[] {
    const actions: string[] = [];

    // Analyze context for quick action patterns
    if (context.goal?.includes('?')) {
      actions.push('provide_answer');
    }
    if (context.goal?.includes('help')) {
      actions.push('offer_assistance');
    }

    // Consider event types in context
    if (context.events.some((e) => e.type.includes('social'))) {
      actions.push('social_response');
    }
    if (context.events.some((e) => e.type.includes('urgent'))) {
      actions.push('priority_response');
    }

    // Consider memory relevance
    if (context.memories && context.memories.length > 0) {
      actions.push('reference_memory');
    }

    // Default action if no specific patterns match
    if (actions.length === 0) {
      actions.push('acknowledge_and_respond');
    }

    return actions;
  }

  private generatePlannedActions(
    context: ThoughtContext,
    analysis: any
  ): string[] {
    const actions: string[] = [];

    // Use context to inform planned actions
    if (context.goal?.includes('plan') || context.goal?.includes('strategy')) {
      actions.push('develop_detailed_plan');
    }

    if (context.events.some((e) => e.type.includes('urgent'))) {
      actions.push('prioritize_urgent_tasks');
    }

    if (context.memories && context.memories.length > 0) {
      actions.push('integrate_past_experience');
    }

    if (analysis.complexity > 0.7) {
      actions.push('analyze_deeply', 'consider_alternatives');
    }

    if (analysis.goalOriented > 0.5) {
      actions.push('identify_goals', 'create_strategy');
    }

    actions.push('provide_comprehensive_response');

    return actions;
  }

  private quickEmotionalAssessment(
    context: ThoughtContext
  ): EmotionState | undefined {
    if (!context.goal) return undefined;

    let emotion = 'neutral';
    let intensity = 0.5;
    const triggers: string[] = [];

    if (context.goal.includes('thank')) {
      emotion = 'grateful';
      intensity = 0.7;
      triggers.push('gratitude_expression');
    } else if (context.goal.includes('problem')) {
      emotion = 'concerned';
      intensity = 0.6;
      triggers.push('problem_detected');
    } else if (context.goal.includes('great')) {
      emotion = 'pleased';
      intensity = 0.8;
      triggers.push('positive_feedback');
    }

    return {
      current: emotion,
      intensity,
      triggers,
      history: [],
      timestamp: new Date(),
    };
  }

  private deliberateEmotionalAssessment(
    context: ThoughtContext,
    analysis: any
  ): EmotionState | undefined {
    // More nuanced emotional assessment
    let emotion = 'neutral';
    let intensity = 0.6;
    const triggers: string[] = ['deliberate_assessment'];

    if (analysis.complexity > 0.8) {
      emotion = 'focused';
      intensity = 0.8;
      triggers.push('high_complexity');
    } else if (analysis.goalOriented > 0.6) {
      emotion = 'determined';
      intensity = 0.7;
      triggers.push('goal_oriented');
    } else if (analysis.emotionalContent > 0.5) {
      emotion = 'empathetic';
      intensity = 0.7;
      triggers.push('emotional_content');
    } else {
      return this.quickEmotionalAssessment(context);
    }

    return {
      current: emotion,
      intensity,
      triggers,
      history: [],
      timestamp: new Date(),
    };
  }

  private createSimplePlan(goal: string): Plan {
    return {
      id: `plan_${Date.now()}`,
      goal,
      steps: [
        {
          id: '1',
          action: 'simple_response',
          description: `Respond to: ${goal}`,
          status: 'pending' as any,
          parameters: {},
          preconditions: [],
          effects: [],
        },
      ],
      priority: 2,
      estimatedDuration: 1000,
      dependencies: [],
      status: 'pending' as any,
      confidence: 0.7,
    };
  }

  private createDetailedPlan(goal: string): Plan {
    return {
      id: `plan_${Date.now()}`,
      goal,
      steps: [
        {
          id: '1',
          action: 'analyze_request',
          description: 'Analyze the request thoroughly',
          status: 'pending' as any,
          parameters: {},
          preconditions: [],
          effects: [],
        },
        {
          id: '2',
          action: 'develop_strategy',
          description: 'Develop comprehensive strategy',
          status: 'pending' as any,
          parameters: {},
          preconditions: ['1'],
          effects: [],
        },
        {
          id: '3',
          action: 'execute_plan',
          description: 'Execute the planned response',
          status: 'pending' as any,
          parameters: {},
          preconditions: ['2'],
          effects: [],
        },
      ],
      priority: 3,
      estimatedDuration: 7000,
      dependencies: [],
      status: 'pending' as any,
      confidence: 0.85,
    };
  }

  private assessGoalComplexity(goal: string): number {
    return this.assessComplexity({ goal: goal });
  }

  private makeQuickDecision(options: Decision[]): Decision {
    // Quick decision based on confidence
    return options.reduce((best, current) =>
      current.confidence > best.confidence ? current : best
    );
  }

  private makeDeliberateDecision(options: Decision[]): Decision {
    // More complex decision making with multiple criteria
    const scored = options.map((option) => ({
      ...option,
      score: this.scoreDecisionOption(option),
    }));

    return scored.reduce((best, current) =>
      current.score > best.score ? current : best
    );
  }

  private scoreDecisionOption(option: Decision): number {
    let score = option.confidence;

    // Add bonuses for various factors
    if (option.reasoning?.includes('goal')) score += 0.1;
    if (option.reasoning?.includes('plan')) score += 0.1;
    // Note: Decision interface doesn't have priority property, so removing this check

    return score;
  }

  private recordPerformance(
    approach: 'reactive' | 'planning',
    success: boolean
  ): void {
    this.performanceHistory.push({ approach, success });

    // Keep only recent history
    if (this.performanceHistory.length > 100) {
      this.performanceHistory.splice(0, 50);
    }
  }

  private adaptWeights(): void {
    if (this.performanceHistory.length < 10) return;

    const recentHistory = this.performanceHistory.slice(-20);
    const reactiveSuccess = recentHistory.filter(
      (h) => h.approach === 'reactive' && h.success
    ).length;
    const planningSuccess = recentHistory.filter(
      (h) => h.approach === 'planning' && h.success
    ).length;
    const reactiveTotal = recentHistory.filter(
      (h) => h.approach === 'reactive'
    ).length;
    const planningTotal = recentHistory.filter(
      (h) => h.approach === 'planning'
    ).length;

    if (reactiveTotal > 0 && planningTotal > 0) {
      const reactiveRate = reactiveSuccess / reactiveTotal;
      const planningRate = planningSuccess / planningTotal;

      // Adapt weights based on success rates
      const adaptationRate = this.config.adaptationRate!;

      if (reactiveRate > planningRate) {
        this.config.reactiveWeight = Math.min(
          0.8,
          this.config.reactiveWeight! + adaptationRate
        );
        this.config.planningWeight = Math.max(
          0.2,
          this.config.planningWeight! - adaptationRate
        );
      } else {
        this.config.planningWeight = Math.min(
          0.8,
          this.config.planningWeight! + adaptationRate
        );
        this.config.reactiveWeight = Math.max(
          0.2,
          this.config.reactiveWeight! - adaptationRate
        );
      }
    }
  }

  // Duplicate implementations removed - see lines 114-128 for the actual implementations
}

export default HybridCognition;

// Export factory function for easy instantiation
export function createHybridCognition(
  config: HybridCognitionConfig = {}
): HybridCognition {
  return new HybridCognition(config);
}
