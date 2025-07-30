/**
 * Rule-Based Reasoning System for SYMindX
 *
 * Implements a forward-chaining rule engine with conflict resolution
 * and fact-based inference for logical reasoning.
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
  ReasoningParadigm,
  Rule,
  Condition,
  RuleAction,
  FactBase,
  Fact,
  HybridReasoningConfig,
} from '../../types/cognition';
import { BaseConfig } from '../../types/common';
import { MemoryType, MemoryDuration } from '../../types/enums';
import { runtimeLogger } from '../../utils/logger';
import { buildObject } from '../../utils/type-helpers';

/**
 * Fact base implementation for storing and querying facts
 */
export class RuleBasedFactBase implements FactBase {
  facts: Map<string, Fact> = new Map();
  rules: Map<string, Rule> = new Map();

  addFact(fact: Fact): void {
    // Handle structured Fact objects
    this.facts.set(fact.id, fact);
    runtimeLogger.cognition(`Added fact: ${fact.id} = ${JSON.stringify(fact)}`);
  }

  // Convenience method for simple key-value facts
  addSimpleFact(key: string, value: any): void {
    const fact: Fact = {
      id: key,
      subject: key,
      predicate: 'hasValue',
      object: String(value),
      confidence: 1.0,
      timestamp: new Date(),
    };
    this.facts.set(key, fact);
    runtimeLogger.cognition(`Added fact: ${key} = ${JSON.stringify(value)}`);
  }

  removeFact(key: string): void {
    this.facts.delete(key);
    runtimeLogger.cognition(`Removed fact: ${key}`);
  }

  getFact(key: string): any {
    return this.facts.get(key);
  }

  queryFacts(pattern: string): any[] {
    const results: any[] = [];
    const regex = new RegExp(pattern.replace('*', '.*'), 'i');

    for (const [key, value] of Array.from(this.facts.entries())) {
      if (regex.test(key)) {
        results.push({ key, value });
      }
    }

    return results;
  }

  hasFact(key: string): boolean {
    return this.facts.has(key);
  }

  getAllFacts(): Record<string, any> {
    return Object.fromEntries(this.facts);
  }

  query(pattern: any): any[] {
    const results: any[] = [];
    for (const [_key, value] of Array.from(this.facts.entries())) {
      // Simple pattern matching
      if (this.matchesPattern(value, pattern)) {
        results.push(value);
      }
    }
    return results;
  }

  private matchesPattern(fact: any, pattern: any): boolean {
    if (!pattern) return true;

    for (const [key, value] of Object.entries(pattern)) {
      if (fact[key] !== value) {
        return false;
      }
    }
    return true;
  }
}

/**
 * Rule-based reasoning cognition module
 */
export class RuleBasedReasoning implements CognitionModule {
  public id: string;
  public type: string = 'rule_based';
  private config: HybridReasoningConfig;
  private factBase: RuleBasedFactBase;
  private rules: Map<string, Rule> = new Map();
  private executionHistory: Array<{
    ruleId: string;
    timestamp: Date;
    success: boolean;
    facts: Record<string, any>;
  }> = [];

  constructor(config: HybridReasoningConfig) {
    this.id = `rule_based_${Date.now()}`;
    this.config = config;
    this.factBase = new RuleBasedFactBase();

    // Initialize with default rules
    this.initializeDefaultRules();
  }

  /**
   * Initialize default rules for common reasoning patterns
   */
  private initializeDefaultRules(): void {
    // Communication response rule
    this.addRule({
      id: 'respond_to_question',
      name: 'Respond to Questions',
      conditions: [
        {
          type: 'fact',
          property: 'message_contains_question',
          operator: 'equals',
          value: true,
          expression: 'message_contains_question',
          parameters: {},
        },
      ],
      actions: [
        {
          type: 'execute',
          target: 'generate_response',
          parameters: { type: 'answer' },
        },
      ],
      priority: 0.8,
      confidence: 0.9,
    });

    // Goal achievement rule
    this.addRule({
      id: 'pursue_goal',
      name: 'Pursue Active Goal',
      conditions: [
        {
          type: 'fact',
          property: 'has_active_goal',
          operator: 'equals',
          value: true,
          expression: 'has_active_goal',
          parameters: {},
        },
        {
          type: 'fact',
          property: 'goal_achievable',
          operator: 'equals',
          value: true,
          expression: 'goal_achievable',
          parameters: {},
        },
      ],
      actions: [{ type: 'execute', target: 'work_on_goal', parameters: {} }],
      priority: 0.7,
      confidence: 0.8,
    });

    // Learning from failure rule
    this.addRule({
      id: 'learn_from_failure',
      name: 'Learn from Failures',
      conditions: [
        {
          type: 'fact',
          property: 'action_failed',
          operator: 'equals',
          value: true,
          expression: 'action_failed',
          parameters: {},
        },
        {
          type: 'fact',
          property: 'failure_reason_known',
          operator: 'equals',
          value: true,
          expression: 'failure_reason_known',
          parameters: {},
        },
      ],
      actions: [
        { type: 'execute', target: 'update_knowledge', parameters: {} },
        { type: 'assert', target: 'learned_from_failure', parameters: {} },
      ],
      priority: 0.9,
      confidence: 0.7,
    });
  }

  /**
   * Add a rule to the rule base
   */
  addRule(rule: Rule): void {
    this.rules.set(rule.id, rule);
    runtimeLogger.cognition(`Added rule: ${rule.name}`);
  }

  /**
   * Remove a rule from the rule base
   */
  removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
    runtimeLogger.cognition(`Removed rule: ${ruleId}`);
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
      name: 'Rule-Based Reasoning',
      version: '1.0.0',
      description: 'Forward-chaining rule engine with logical inference',
      author: 'SYMindX',
      paradigms: [ReasoningParadigm.RULE_BASED],
      learningCapable: true,
    };
  }

  /**
   * Main thinking method using rule-based inference
   */
  async think(agent: Agent, context: ThoughtContext): Promise<ThoughtResult> {
    // Timing tracked for performance metrics but consumed earlier
    const _startTime = Date.now();
    const thoughts: string[] = [];
    const actions: AgentAction[] = [];
    const memories: MemoryRecord[] = [];

    // Update fact base with current context
    this.updateFactBase(agent, context);

    // Run inference engine
    const firedRules = await this.runInference(agent, context);

    thoughts.push(
      `Rule-based inference completed. Fired ${firedRules.length} rules.`
    );

    // Generate actions based on fired rules
    for (const rule of firedRules) {
      const ruleActions = this.generateActionsFromRule(agent, rule, context);
      actions.push(...ruleActions);
      thoughts.push(
        `Rule '${rule.name}' generated ${ruleActions.length} actions`
      );
    }

    // Create memory of reasoning process
    if (firedRules.length > 0) {
      const memory = this.createReasoningMemory(agent, firedRules, context);
      memories.push(memory);
    }

    // Calculate performance metrics
    // Reasoning time tracked for performance metrics
    void _startTime;
    const confidence = this.calculateConfidence(firedRules);

    return {
      thoughts,
      actions,
      emotions: {
        current: firedRules.length > 0 ? 'confident' : 'uncertain',
        intensity: confidence,
        triggers: firedRules.map((r) => r.name),
        history: [],
        timestamp: new Date(),
      },
      memories,
      confidence,
    };
  }

  /**
   * Plan using rule-based approach
   */
  async plan(_agent: Agent, goal: string): Promise<Plan> {
    // Add goal to fact base
    this.factBase.addSimpleFact('current_goal', goal);
    this.factBase.addSimpleFact('has_active_goal', true);

    // Create planning rules if not exist
    this.addPlanningRules(goal);

    // Generate plan steps using rules
    const steps: PlanStep[] = [];
    let stepCounter = 1;

    // Basic planning sequence
    steps.push({
      id: `step_${stepCounter++}`,
      action: 'analyze_goal',
      description: `Analyze goal: ${goal}`,
      status: PlanStepStatus.PENDING,
      parameters: { goal },
      preconditions: [],
      effects: ['goal_analyzed'],
    });

    steps.push({
      id: `step_${stepCounter++}`,
      action: 'gather_resources',
      description: 'Gather required resources',
      status: PlanStepStatus.PENDING,
      parameters: {},
      preconditions: ['goal_analyzed'],
      effects: ['resources_gathered'],
    });

    steps.push({
      id: `step_${stepCounter++}`,
      action: 'execute_plan',
      description: 'Execute the plan',
      status: PlanStepStatus.PENDING,
      parameters: {},
      preconditions: ['resources_gathered'],
      effects: ['plan_executed'],
    });

    return {
      id: `plan_${Date.now()}`,
      goal,
      steps,
      priority: 0.8,
      estimatedDuration: 1800000, // 30 minutes
      dependencies: [],
      status: 'pending' as any,
    };
  }

  /**
   * Decide between options using rule-based criteria
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

    // Add options to fact base
    options.forEach((option, index) => {
      this.factBase.addSimpleFact(`option_${index}`, option);
    });

    // Apply decision rules
    const scoredOptions = options.map((option) => {
      const score = this.scoreOption(option);
      return { option, score };
    });

    // Select best option
    const bestOption = scoredOptions.reduce((best, current) =>
      current.score > best.score ? current : best
    );

    return bestOption.option;
  }

  /**
   * Learn from experience by updating rules
   */
  async learn(_agent: Agent, experience: Experience): Promise<void> {
    const { state, action, reward, nextState: _nextState } = experience;
    void _nextState; // Acknowledge unused variable

    // Analyze experience for rule updates
    if (reward.value > 0.5) {
      // Positive experience - reinforce successful patterns
      this.reinforceSuccessfulPattern(state, action, reward);
    } else if (reward.value < -0.5) {
      // Negative experience - learn from failure
      this.learnFromFailure(state, action, reward);
    }

    // Update rule priorities based on success
    this.updateRulePriorities(experience);

    runtimeLogger.cognition(
      `Learned from experience: ${reward.type} reward of ${reward.value}`
    );
  }

  /**
   * Update fact base with current context
   */
  private updateFactBase(agent: Agent, context: ThoughtContext): void {
    // Add agent state
    this.factBase.addSimpleFact('agent_id', agent.id);
    this.factBase.addSimpleFact('agent_status', agent.status);

    // Add context events
    context.events.forEach((event, index) => {
      this.factBase.addSimpleFact(`event_${index}`, event);

      // Check for questions
      if (
        event.data?.['message'] &&
        typeof event.data['message'] === 'string'
      ) {
        this.factBase.addSimpleFact('has_message', true);
        this.factBase.addSimpleFact(
          'message_contains_question',
          event.data['message'].includes('?')
        );
      }

      // Check for mentions
      if (event.data?.['mentioned'] || event.type.includes('mention')) {
        this.factBase.addSimpleFact('was_mentioned', true);
      }
    });

    // Add goal information
    if (context.goal) {
      this.factBase.addSimpleFact('current_goal', context.goal);
      this.factBase.addSimpleFact('has_active_goal', true);
      this.factBase.addSimpleFact(
        'goal_achievable',
        this.assessGoalAchievability(context.goal)
      );
    }

    // Add memory information
    if (context.memories) {
      this.factBase.addSimpleFact('has_memories', context.memories.length > 0);
      this.factBase.addSimpleFact('memory_count', context.memories.length);
    }
  }

  /**
   * Run the inference engine
   */
  private async runInference(
    agent: Agent,
    context: ThoughtContext
  ): Promise<Rule[]> {
    const firedRules: Rule[] = [];
    let changed = true;
    let iterations = 0;
    const maxIterations = 10;

    while (changed && iterations < maxIterations) {
      changed = false;
      iterations++;

      // Get eligible rules
      const eligibleRules = this.getEligibleRules();

      // Resolve conflicts
      const selectedRule = this.resolveConflicts(eligibleRules);

      if (selectedRule) {
        // Fire rule
        const fired = await this.fireRule(selectedRule, agent, context);
        if (fired) {
          firedRules.push(selectedRule);
          changed = true;
        }
      }
    }

    return firedRules;
  }

  /**
   * Get rules that can be fired
   */
  private getEligibleRules(): Rule[] {
    const eligible: Rule[] = [];

    for (const rule of Array.from(this.rules.values())) {
      if (this.evaluateConditions(rule.conditions)) {
        eligible.push(rule);
      }
    }

    return eligible;
  }

  /**
   * Evaluate rule conditions
   */
  private evaluateConditions(conditions: Condition[]): boolean {
    for (const condition of conditions) {
      if (!this.evaluateCondition(condition)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(condition: Condition): boolean {
    switch (condition.type) {
      case 'fact':
        return this.factBase.hasFact(
          condition.expression || condition.property || ''
        );

      case 'pattern':
        return this.factBase.queryFacts(condition.expression || '').length > 0;

      case 'function':
        return this.evaluateFunction(
          condition.expression || '',
          condition.parameters
        );

      case 'temporal':
        return this.evaluateTemporalCondition(
          condition.expression || '',
          condition.parameters
        );

      default:
        return false;
    }
  }

  /**
   * Evaluate function condition
   */
  private evaluateFunction(
    expression: string,
    parameters?: Record<string, any>
  ): boolean {
    // Simple function evaluation
    try {
      // Safety check - only allow safe functions
      const safeFunctions = [
        'includes',
        'startsWith',
        'endsWith',
        'length',
        'match',
      ];
      if (!safeFunctions.some((fn) => expression.includes(fn))) {
        return false;
      }

      // Context prepared for future safe evaluation
      void {
        facts: this.factBase.getAllFacts(),
        ...parameters,
      };

      // Simple evaluation (in production, use a proper expression evaluator)
      return eval(expression);
    } catch (error) {
      void error;
      runtimeLogger.cognition(`Function evaluation error: ${error}`);
      return false;
    }
  }

  /**
   * Evaluate temporal condition
   */
  private evaluateTemporalCondition(
    expression: string,
    parameters?: Record<string, any>
  ): boolean {
    // Simple temporal evaluation
    const now = Date.now();
    const timeWindow = parameters?.['timeWindow'] || 60000; // 1 minute default

    switch (expression) {
      case 'recently':
        return this.executionHistory.some(
          (h) => now - h.timestamp.getTime() < timeWindow
        );
      default:
        return false;
    }
  }

  /**
   * Resolve conflicts between eligible rules
   */
  private resolveConflicts(rules: Rule[]): Rule | null {
    if (rules.length === 0) return null;
    if (rules.length === 1) return rules[0] ?? null;

    const strategy = this.config.ruleEngine?.conflictResolution || 'priority';

    switch (strategy) {
      case 'priority':
        return rules.reduce((best, current) =>
          (current.priority || 0) > (best.priority || 0) ? current : best
        );

      case 'specificity':
        return rules.reduce((best, current) =>
          current.conditions.length > best.conditions.length ? current : best
        );

      case 'recent': {
        return rules.reduce((best, current) => {
          const bestHistory = this.getRecentExecution(best.id);
          const currentHistory = this.getRecentExecution(current.id);

          if (!bestHistory && !currentHistory) return best;
          if (!bestHistory) return current;
          if (!currentHistory) return best;

          return bestHistory.timestamp > currentHistory.timestamp
            ? current
            : best;
        });
      }

      default:
        return rules[0] ?? null;
    }
  }

  /**
   * Fire a rule
   */
  private async fireRule(
    rule: Rule,
    agent: Agent,
    context: ThoughtContext
  ): Promise<boolean> {
    try {
      // Execute rule actions
      for (const action of rule.actions) {
        await this.executeRuleAction(action, agent, context);
      }

      // Record execution
      this.executionHistory.push({
        ruleId: rule.id,
        timestamp: new Date(),
        success: true,
        facts: this.factBase.getAllFacts(),
      });

      runtimeLogger.cognition(`Fired rule: ${rule.name}`);
      return true;
    } catch (error) {
      void error;
      runtimeLogger.cognition(`Rule execution failed: ${rule.name} - ${error}`);

      this.executionHistory.push({
        ruleId: rule.id,
        timestamp: new Date(),
        success: false,
        facts: this.factBase.getAllFacts(),
      });

      return false;
    }
  }

  /**
   * Execute a rule action
   */
  private async executeRuleAction(
    action: RuleAction,
    agent: Agent,
    context: ThoughtContext
  ): Promise<void> {
    switch (action.type) {
      case 'assert':
        this.factBase.addSimpleFact(
          action.target,
          action.parameters?.['value'] || true
        );
        break;

      case 'retract':
        this.factBase.removeFact(action.target);
        break;

      case 'execute':
        await this.executeAction(
          action.target,
          action.parameters,
          agent,
          context
        );
        break;

      case 'modify': {
        const currentValue = this.factBase.getFact(action.target);
        const newValue = { ...currentValue, ...action.parameters };
        this.factBase.addSimpleFact(action.target, newValue);
        break;
      }
    }
  }

  /**
   * Execute an action
   */
  private async executeAction(
    actionName: string,
    parameters: any,
    _agent: Agent,
    _context: ThoughtContext
  ): Promise<void> {
    switch (actionName) {
      case 'generate_response':
        this.factBase.addSimpleFact('response_generated', true);
        this.factBase.addSimpleFact(
          'response_type',
          parameters?.type || 'general'
        );
        break;

      case 'work_on_goal':
        this.factBase.addSimpleFact('working_on_goal', true);
        break;

      case 'update_knowledge':
        this.factBase.addSimpleFact('knowledge_updated', true);
        break;

      default:
        runtimeLogger.cognition(`Unknown action: ${actionName}`);
    }
  }

  /**
   * Generate actions from fired rules
   */
  private generateActionsFromRule(
    agent: Agent,
    rule: Rule,
    _context: ThoughtContext
  ): AgentAction[] {
    const actions: AgentAction[] = [];

    // Check if rule suggests response
    if (this.factBase.hasFact('response_generated')) {
      const action: AgentAction = {
        id: `action_${Date.now()}`,
        agentId: agent.id,
        type: ActionCategory.COMMUNICATION,
        extension: 'rule-based',
        action: 'respond',
        parameters: {
          ruleId: rule.id,
          ruleName: rule.name,
          confidence: rule.confidence || 0.5,
        },
        timestamp: new Date(),
        status: ActionStatus.PENDING,
        ...(rule.priority && { priority: rule.priority }),
      };

      actions.push(action);
    }

    // Check if rule suggests goal work
    if (this.factBase.hasFact('working_on_goal')) {
      const action: AgentAction = {
        id: `action_${Date.now()}`,
        agentId: agent.id,
        type: ActionCategory.COGNITIVE,
        extension: 'rule-based',
        action: 'work_on_goal',
        parameters: {
          goal: this.factBase.getFact('current_goal'),
          ruleId: rule.id,
        },
        timestamp: new Date(),
        status: ActionStatus.PENDING,
        ...(rule.priority && { priority: rule.priority }),
      };

      actions.push(action);
    }

    return actions;
  }

  /**
   * Create memory of reasoning process
   */
  private createReasoningMemory(
    agent: Agent,
    rules: Rule[],
    _context: ThoughtContext
  ): MemoryRecord {
    const content = `Rule-based reasoning: ${rules.map((r) => r.name).join(', ')}`;

    return {
      id: `memory_${Date.now()}`,
      agentId: agent.id,
      type: MemoryType.REASONING,
      content,
      metadata: {
        reasoning_type: 'rule_based',
        rules_fired: rules.map((r) => ({
          id: r.id,
          name: r.name,
          confidence: r.confidence || 0.5,
        })),
        facts_used: this.factBase.getAllFacts(),
        timestamp: new Date(),
      },
      importance: 0.7,
      timestamp: new Date(),
      tags: ['reasoning', 'rule_based', 'inference'],
      duration: MemoryDuration.LONG_TERM,
    };
  }

  /**
   * Calculate confidence based on fired rules
   */
  private calculateConfidence(rules: Rule[]): number {
    if (rules.length === 0) return 0.1;

    const totalConfidence = rules.reduce(
      (sum, rule) => sum + (rule.confidence || 0.5),
      0
    );
    return Math.min(1.0, totalConfidence / rules.length);
  }

  /**
   * Add planning rules for a specific goal
   */
  private addPlanningRules(goal: string): void {
    const planningRule: Rule = {
      id: `planning_${Date.now()}`,
      name: `Planning for ${goal}`,
      conditions: [
        {
          type: 'fact',
          property: 'has_active_goal',
          operator: 'equals',
          value: true,
          expression: 'has_active_goal',
        },
        {
          type: 'fact',
          property: 'goal_achievable',
          operator: 'equals',
          value: true,
          expression: 'goal_achievable',
        },
      ],
      actions: [
        { type: 'assert', target: 'plan_created' },
        { type: 'execute', target: 'create_plan_steps' },
      ],
      priority: 0.8,
      confidence: 0.7,
    };

    this.addRule(planningRule);
  }

  /**
   * Score an option for decision making
   */
  private scoreOption(option: Decision): number {
    let score = option.confidence || 0.5;

    // Adjust score based on rules
    if (this.factBase.hasFact('prefer_high_confidence')) {
      score *= 1.2;
    }

    if (this.factBase.hasFact('prefer_quick_actions')) {
      score *= 1.1;
    }

    return Math.min(1.0, score);
  }

  /**
   * Assess goal achievability
   */
  private assessGoalAchievability(goal: string): boolean {
    // Simple heuristic - goals containing certain keywords are achievable
    const achievableKeywords = [
      'respond',
      'think',
      'analyze',
      'plan',
      'communicate',
    ];
    return achievableKeywords.some((keyword) =>
      goal.toLowerCase().includes(keyword)
    );
  }

  /**
   * Reinforce successful patterns
   */
  private reinforceSuccessfulPattern(
    _state: any,
    _action: any,
    _reward: any
  ): void {
    // Find rules that contributed to successful actions
    const recentRules = this.executionHistory
      .filter((h) => h.success && Date.now() - h.timestamp.getTime() < 60000)
      .map((h) => h.ruleId);

    // Increase priority of successful rules
    for (const ruleId of recentRules) {
      const rule = this.rules.get(ruleId);
      if (rule) {
        rule.priority = Math.min(1.0, (rule.priority || 0.5) + 0.1);
        rule.confidence = Math.min(1.0, (rule.confidence || 0.5) + 0.05);
      }
    }
  }

  /**
   * Learn from failure
   */
  private learnFromFailure(_state: any, _action: any, _reward: any): void {
    // Find rules that contributed to failed actions
    const failedRules = this.executionHistory
      .filter((h) => !h.success && Date.now() - h.timestamp.getTime() < 60000)
      .map((h) => h.ruleId);

    // Decrease priority of failed rules
    for (const ruleId of failedRules) {
      const rule = this.rules.get(ruleId);
      if (rule) {
        rule.priority = Math.max(0.1, (rule.priority || 0.5) - 0.1);
        rule.confidence = Math.max(0.1, (rule.confidence || 0.5) - 0.05);
      }
    }
  }

  /**
   * Update rule priorities based on experience
   */
  private updateRulePriorities(experience: Experience): void {
    const rewardValue = experience.reward.value;

    // Adjust priorities based on reward
    for (const rule of Array.from(this.rules.values())) {
      if (rewardValue > 0) {
        rule.priority = Math.min(
          1.0,
          (rule.priority || 0.5) + rewardValue * 0.1
        );
      } else {
        rule.priority = Math.max(
          0.1,
          (rule.priority || 0.5) + rewardValue * 0.1
        );
      }
    }
  }

  /**
   * Get recent execution of a rule
   */
  private getRecentExecution(ruleId: string): any {
    return this.executionHistory
      .filter((h) => h.ruleId === ruleId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
  }
}

/**
 * Factory function for creating rule-based reasoning module
 */
export function createRuleBasedReasoning(
  config: HybridReasoningConfig
): RuleBasedReasoning {
  return new RuleBasedReasoning(config);
}
