/**
 * Unified Cognition Module
 *
 * A streamlined cognition system that thinks only when necessary:
 * - When performing actions (Twitter posts, Telegram responses)
 * - When explicitly asked to analyze or plan
 * - When dealing with complex tasks
 *
 * For simple conversation, it bypasses thinking to be more responsive.
 */

import {
  Agent,
  ThoughtContext,
  ThoughtResult,
  Plan,
  Decision,
  AgentAction,
  MemoryRecord,
  ActionStatus,
  ActionCategory,
  PlanStep,
  PlanStepStatus,
} from '../../types/agent';
import {
  CognitionModule,
  CognitionModuleMetadata,
} from '../../types/cognition';
import { BaseConfig, ActionParameters } from '../../types/common';
import { MemoryType, MemoryDuration } from '../../types/enums';

import { TheoryOfMind, MentalModel } from './theory-of-mind';

export interface UnifiedCognitionConfig extends BaseConfig {
  // When to think
  thinkForActions?: boolean; // Think before taking actions
  thinkForMentions?: boolean; // Think when mentioned/tagged
  thinkOnRequest?: boolean; // Think when explicitly asked

  // Thinking parameters
  minThinkingConfidence?: number; // Minimum confidence to act
  quickResponseMode?: boolean; // Skip thinking for casual chat
  analysisDepth?: 'shallow' | 'normal' | 'deep';

  // Memory integration
  useMemories?: boolean;
  maxMemoryRecall?: number;

  // Prompt integration ready
  promptEnhanced?: boolean;

  // Dual-process thinking
  enableDualProcess?: boolean;
  system1Threshold?: number; // Confidence threshold for System 1
  system2Timeout?: number; // Max time for System 2 thinking (ms)

  // Metacognition
  enableMetacognition?: boolean;
  uncertaintyThreshold?: number; // When to doubt decisions

  // Goal management
  enableGoalTracking?: boolean;
  maxActiveGoals?: number;
  goalPersistence?: number; // How long to pursue goals (ms)

  // Theory of mind
  enableTheoryOfMind?: boolean;
  theoryOfMindConfig?: any;
}

export class UnifiedCognition implements CognitionModule {
  public id: string;
  public type: string = 'unified';
  private config: UnifiedCognitionConfig;
  private theoryOfMind?: any; // Theory of Mind module (optional)

  // Dual-process state
  private system1Cache: Map<string, { response: any; timestamp: number }> =
    new Map();
  private activeGoals: Map<
    string,
    { goal: string; priority: number; created: Date }
  > = new Map();
  private metacognitiveState = {
    confidence: 0.5,
    uncertainty: 0.5,
    cognitiveLoad: 0,
    recentErrors: [] as string[],
  };

  constructor(config: UnifiedCognitionConfig = {}) {
    this.id = `unified_${Date.now()}`;
    this.config = {
      // Defaults
      thinkForActions: true,
      thinkForMentions: true,
      thinkOnRequest: true,
      minThinkingConfidence: 0.6,
      quickResponseMode: true,
      analysisDepth: 'normal',
      useMemories: true,
      maxMemoryRecall: 10,
      promptEnhanced: false,
      enableDualProcess: true,
      system1Threshold: 0.8,
      system2Timeout: 5000,
      enableMetacognition: true,
      uncertaintyThreshold: 0.7,
      enableGoalTracking: true,
      maxActiveGoals: 5,
      goalPersistence: 86400000, // 24 hours
      ...config,
    };

    // Initialize theory of mind if enabled
    if (this.config.enableTheoryOfMind) {
      // Theory of mind would be initialized here if we had the module
      // For now, we'll leave it undefined
      // this.theoryOfMind = new TheoryOfMind(this.config.theoryOfMindConfig)
    }
  }

  /**
   * Initialize the cognition module
   */
  initialize(config: BaseConfig): void {
    // Merge any additional config
    this.config = { ...this.config, ...config };
  }

  getMetadata(): CognitionModuleMetadata {
    return {
      id: this.id,
      name: 'Unified Cognition',
      version: '1.0.0',
      description: 'Unified cognition with conditional thinking',
      author: 'SYMindX',
    };
  }

  /**
   * Main thinking method - implements dual-process thinking
   */
  async think(agent: Agent, context: ThoughtContext): Promise<ThoughtResult> {
    // Update metacognitive state
    if (this.config.enableMetacognition) {
      this.updateMetacognition(context);
    }

    // Check if we should skip thinking entirely
    if (this.shouldSkipThinking(context)) {
      return this.getQuickResponse();
    }

    // Dual-process thinking
    if (this.config.enableDualProcess) {
      // Try System 1 (fast, intuitive)
      const system1Result = await this.system1Think(agent, context);

      // If System 1 is confident enough, use it
      if (system1Result.confidence >= this.config.system1Threshold!) {
        return system1Result;
      }

      // Otherwise, engage System 2 (slow, deliberative)
      return this.system2Think(agent, context, system1Result);
    }

    // Fallback to legacy thinking
    const depth = this.determineThinkingDepth(context);
    if (depth === 'shallow') {
      return this.shallowThink(agent, context);
    }
    return this.deepThink(agent, context);
  }

  /**
   * Determines if we should skip thinking entirely
   */
  private shouldSkipThinking(context: ThoughtContext): boolean {
    // Skip if quick response mode and no special triggers
    if (!this.config.quickResponseMode) return false;

    // Check for action events
    const hasActionEvent = context.events.some(
      (e) =>
        e.type.includes('action') ||
        e.type.includes('command') ||
        e.type.includes('tool')
    );
    if (hasActionEvent && this.config.thinkForActions) return false;

    // Check for mentions/tags
    const hasMention = context.events.some(
      (e) =>
        e.data?.mentioned === true ||
        e.data?.tagged === true ||
        e.type.includes('mention')
    );
    if (hasMention && this.config.thinkForMentions) return false;

    // Check for explicit thinking requests
    const hasThinkRequest = context.events.some((e) => {
      const message = e.data?.message;
      if (typeof message !== 'string') return false;
      const lowerMessage = message.toLowerCase();
      return (
        lowerMessage.includes('think about') ||
        lowerMessage.includes('analyze') ||
        lowerMessage.includes('plan') ||
        lowerMessage.includes('what do you think')
      );
    });
    if (hasThinkRequest && this.config.thinkOnRequest) return false;

    // Check if goal requires thinking
    if (context.goal && context.goal.length > 0) return false;

    // Skip thinking for simple conversation
    return true;
  }

  /**
   * Quick response without thinking
   */
  private getQuickResponse(): ThoughtResult {
    return {
      thoughts: [],
      actions: [],
      emotions: {
        current: 'neutral',
        intensity: 0.5,
        triggers: [],
        history: [],
        timestamp: new Date(),
      },
      memories: [],
      confidence: 0.8,
    };
  }

  /**
   * Determines how deeply to think
   */
  private determineThinkingDepth(
    context: ThoughtContext
  ): 'shallow' | 'normal' | 'deep' {
    // Deep thinking for complex goals
    if (context.goal && context.goal.includes('complex')) return 'deep';

    // Deep thinking for multiple events
    if (context.events.length > 3) return 'deep';

    // Shallow thinking for simple queries
    const simplePatterns = ['hello', 'hi', 'thanks', 'okay', 'yes', 'no'];
    const hasSimpleMessage = context.events.some((e) => {
      const msg = e.data?.message;
      if (typeof msg !== 'string') return false;
      return simplePatterns.some((p) => msg.toLowerCase().includes(p));
    });
    if (hasSimpleMessage) return 'shallow';

    return this.config.analysisDepth || 'normal';
  }

  /**
   * Shallow thinking - quick analysis
   */
  private async shallowThink(
    _agent: Agent,
    context: ThoughtContext
  ): Promise<ThoughtResult> {
    const thoughts: string[] = [];
    const memories: MemoryRecord[] = [];

    // Quick situation assessment
    if (context.events.length > 0) {
      const event = context.events[0];
      if (event) {
        thoughts.push(`Received ${event.type} event`);
      }
    }

    // Basic emotion from context
    const emotion = this.assessBasicEmotion(context);

    return {
      thoughts,
      actions: [],
      emotions: emotion,
      memories,
      confidence: 0.7,
    };
  }

  /**
   * Deep thinking - full analysis
   */
  private async deepThink(
    _agent: Agent,
    context: ThoughtContext
  ): Promise<ThoughtResult> {
    const thoughts: string[] = [];
    const actions: AgentAction[] = [];
    const memories: MemoryRecord[] = [];

    // 1. Analyze the situation
    const situation = this.analyzeSituation(context);
    thoughts.push(`Situation: ${situation.summary}`);

    // 2. Retrieve relevant memories if enabled
    let relevantMemories: any[] = [];
    if (this.config.useMemories && agent.memory && context.memories) {
      relevantMemories = context.memories.slice(0, this.config.maxMemoryRecall);
      if (relevantMemories.length > 0) {
        thoughts.push(`Recalled ${relevantMemories.length} relevant memories`);
      }
    }

    // 3. Determine if action is needed
    if (situation.requiresAction) {
      const action = this.determineAction(agent, situation, context);
      if (action) {
        actions.push(action);
        thoughts.push(`Decided to: ${action.type} - ${action.action}`);
      }
    }

    // 4. Process emotions based on situation
    const emotion = this.processEmotions(agent, situation, context);

    // 5. Create memories if significant
    if (situation.significance > 0.6) {
      const memory = this.createMemory(agent, situation, thoughts);
      memories.push(memory as MemoryRecord);
    }

    // 6. Build response with confidence
    const confidence = this.calculateConfidence(situation, relevantMemories);

    return {
      thoughts,
      actions,
      emotions: emotion,
      memories,
      confidence,
    };
  }

  /**
   * Analyze the current situation
   */
  private analyzeSituation(context: ThoughtContext): any {
    const situation = {
      type: 'unknown',
      summary: 'Processing events',
      requiresAction: false,
      requiresPlanning: false,
      significance: 0.5,
      complexity: 0.3,
    };

    // Analyze events
    for (const event of context.events) {
      // Communication events
      if (
        event.type.includes('communication') ||
        event.type.includes('message')
      ) {
        situation.type = 'communication';
        situation.summary = 'Responding to communication';
        situation.significance = 0.6;

        // Check if it's a question
        const message = event.data?.message;
        if (typeof message === 'string' && message.includes('?')) {
          situation.requiresAction = true;
          situation.significance = 0.7;
        }
      }

      // Action requests
      if (event.type.includes('action') || event.type.includes('command')) {
        situation.type = 'action_request';
        situation.summary = 'Action requested';
        situation.requiresAction = true;
        situation.significance = 0.8;
      }

      // Mentions/tags (social media)
      if (event.data?.mentioned || event.type.includes('mention')) {
        situation.type = 'social_mention';
        situation.summary = 'Mentioned on social media';
        situation.requiresAction = true;
        situation.significance = 0.9;
      }
    }

    // Check goals
    if (context.goal) {
      situation.requiresPlanning = true;
      situation.complexity = 0.7;
    }

    return situation;
  }

  /**
   * Determine what action to take
   */
  private determineAction(
    agent: Agent,
    situation: any,
    context: ThoughtContext
  ): AgentAction | null {
    // Don't create actions for simple communication
    if (situation.type === 'communication' && !situation.requiresAction) {
      return null;
    }

    // Social media response
    if (situation.type === 'social_mention') {
      return {
        id: `action_${Date.now()}`,
        agentId: agent.id,
        type: ActionCategory.COMMUNICATION,
        action: 'respond_to_mention',
        parameters: {
          platform: context.events[0]?.source || 'unknown',
          responseType: 'thoughtful',
        },
        priority: 0.8,
        status: ActionStatus.PENDING,
        extension: context.events[0]?.source || 'social',
        timestamp: new Date(),
      };
    }

    // Action request
    if (situation.type === 'action_request') {
      const event = context.events.find((e) => e.type.includes('action'));
      return {
        id: `action_${Date.now()}`,
        agentId: agent.id,
        type: ActionCategory.COMMUNICATION,
        action: (event?.data?.action as string) || 'process_request',
        parameters:
          typeof event?.data?.parameters === 'object' &&
          event?.data?.parameters !== null &&
          !(event?.data?.parameters instanceof Date) &&
          !Array.isArray(event?.data?.parameters)
            ? (event.data.parameters as ActionParameters)
            : {},
        priority: 0.9,
        status: ActionStatus.PENDING,
        extension: event?.source || 'unknown',
        timestamp: new Date(),
      };
    }

    return null;
  }

  /**
   * Process emotions based on situation
   */
  private processEmotions(
    agent: Agent,
    situation: any,
    context: ThoughtContext
  ): any {
    // Base emotion
    let emotion = 'neutral';
    let intensity = 0.5;
    const triggers: string[] = [];

    // Adjust based on situation
    if (situation.type === 'social_mention') {
      emotion = 'excited';
      intensity = 0.7;
      triggers.push('social_interaction');
    } else if (situation.type === 'communication') {
      // Check sentiment of messages
      const hasPositive = context.events.some((e) => {
        const msg = e.data?.message;
        if (typeof msg !== 'string') return false;
        const lowerMsg = msg.toLowerCase();
        return (
          lowerMsg.includes('thanks') ||
          lowerMsg.includes('great') ||
          lowerMsg.includes('awesome')
        );
      });
      if (hasPositive) {
        emotion = 'happy';
        intensity = 0.6;
        triggers.push('positive_feedback');
      }
    }

    return {
      current: emotion,
      intensity,
      triggers,
      history: [],
      timestamp: new Date(),
    };
  }

  /**
   * Basic emotion assessment for shallow thinking
   */
  private assessBasicEmotion(_context: ThoughtContext): any {
    return {
      current: 'neutral',
      intensity: 0.5,
      triggers: [],
      history: [],
      timestamp: new Date(),
    };
  }

  /**
   * Create a memory record
   */
  private createMemory(
    agent: Agent,
    situation: any,
    thoughts: string[]
  ): MemoryRecord {
    return {
      id: `memory_${Date.now()}`,
      agentId: agent.id,
      type: MemoryType.EXPERIENCE,
      content: `${situation.summary}: ${thoughts.join('. ')}`,
      metadata: {
        situationType: situation.type,
        significance: situation.significance,
        timestamp: new Date(),
      },
      importance: situation.significance,
      timestamp: new Date(),
      tags: [situation.type, 'thinking', 'cognition'],
      duration: MemoryDuration.LONG_TERM,
    };
  }

  /**
   * Calculate confidence in thinking
   */
  private calculateConfidence(situation: any, memories: any[]): number {
    let confidence = 0.5;

    // Higher confidence for familiar situations
    if (memories.length > 3) confidence += 0.2;

    // Higher confidence for clear situation types
    if (situation.type !== 'unknown') confidence += 0.2;

    // Lower confidence for complex situations
    if (situation.complexity > 0.7) confidence -= 0.1;

    return Math.max(0.1, Math.min(1.0, confidence));
  }

  /**
   * System 1 thinking - fast, intuitive, pattern-based
   */
  private async system1Think(
    agent: Agent,
    context: ThoughtContext
  ): Promise<ThoughtResult> {
    const thoughts: string[] = ['[System 1] Quick intuitive response'];

    // Check cache for similar contexts
    const cacheKey = this.generateContextHash(context);
    const cached = this.system1Cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < 60000) {
      // 1 minute cache
      thoughts.push('Using cached intuitive response');
      return cached.response;
    }

    // Pattern matching for common situations
    const patterns = this.matchPatterns(context);
    let confidence = 0.5;

    if (patterns.greeting) {
      confidence = 0.9;
      thoughts.push('Recognized greeting pattern');
    } else if (patterns.question) {
      confidence = 0.7;
      thoughts.push('Recognized question pattern');
    } else if (patterns.command) {
      confidence = 0.6;
      thoughts.push('Recognized command pattern');
    }

    // Quick emotional assessment
    const emotion = this.assessBasicEmotion(context);

    const result: ThoughtResult = {
      thoughts,
      actions: [],
      emotions: emotion,
      memories: [],
      confidence,
    };

    // Cache the result
    this.system1Cache.set(cacheKey, {
      response: result,
      timestamp: Date.now(),
    });

    return result;
  }

  /**
   * System 2 thinking - slow, deliberative, analytical
   */
  private async system2Think(
    agent: Agent,
    context: ThoughtContext,
    system1Result: ThoughtResult
  ): Promise<ThoughtResult> {
    const thoughts: string[] = ['[System 2] Engaging deliberative thinking'];
    const _startTime = Date.now();

    // Include System 1 insights
    thoughts.push(
      `System 1 confidence: ${system1Result.confidence.toFixed(2)}`
    );

    // Deep analysis with timeout
    const analysisPromise = this.deepAnalysis(agent, context);
    const timeoutPromise = new Promise<any>((resolve) =>
      setTimeout(() => resolve({ timedOut: true }), this.config.system2Timeout!)
    );

    const analysis = await Promise.race([analysisPromise, timeoutPromise]);

    if (analysis.timedOut) {
      thoughts.push('System 2 timeout - using best available analysis');
      return {
        ...system1Result,
        thoughts: [...system1Result.thoughts, ...thoughts],
        confidence: system1Result.confidence * 0.8,
      };
    }

    // Goal management
    if (this.config.enableGoalTracking) {
      this.updateGoals(context, analysis);
    }

    // Metacognitive reflection
    if (this.config.enableMetacognition) {
      const reflection = this.reflect(analysis, system1Result);
      thoughts.push(`Metacognition: ${reflection}`);
    }

    return {
      thoughts: [...thoughts, ...analysis.thoughts],
      actions: analysis.actions,
      emotions: analysis.emotions,
      memories: analysis.memories,
      confidence: analysis.confidence,
    };
  }

  /**
   * Deep analysis for System 2
   */
  private async deepAnalysis(
    agent: Agent,
    context: ThoughtContext
  ): Promise<any> {
    // This is the enhanced version of deepThink
    const result = await this.deepThink(agent, context);

    // Add causal reasoning
    const causalChain = this.traceCausality(context);
    if (causalChain.length > 0) {
      result.thoughts.push(`Causal chain: ${causalChain.join(' → ')}`);
    }

    // Add counterfactual thinking
    const alternatives = this.considerAlternatives(context);
    if (alternatives.length > 0) {
      result.thoughts.push(`Alternatives considered: ${alternatives.length}`);
    }

    return result;
  }

  /**
   * Update metacognitive state
   */
  private updateMetacognition(context: ThoughtContext): void {
    // Update cognitive load
    this.metacognitiveState.cognitiveLoad = context.events.length / 10;

    // Track uncertainty
    const hasConflicts = context.events.some(
      (e) => e.type.includes('conflict') || e.type.includes('error')
    );
    if (hasConflicts) {
      this.metacognitiveState.uncertainty = Math.min(
        1,
        this.metacognitiveState.uncertainty + 0.1
      );
    } else {
      this.metacognitiveState.uncertainty = Math.max(
        0,
        this.metacognitiveState.uncertainty - 0.05
      );
    }

    // Update overall confidence
    this.metacognitiveState.confidence =
      1 - this.metacognitiveState.uncertainty;
  }

  /**
   * Pattern matching for System 1
   */
  private matchPatterns(context: ThoughtContext): any {
    const patterns = {
      greeting: false,
      question: false,
      command: false,
      emotion: false,
      social: false,
    };

    for (const event of context.events) {
      const message = event.data?.message;
      if (typeof message === 'string') {
        const lower = message.toLowerCase();
        patterns.greeting =
          patterns.greeting || /^(hi|hello|hey|greetings)/.test(lower);
        patterns.question = patterns.question || message.includes('?');
        patterns.command =
          patterns.command || /^(do|make|create|show|tell)/.test(lower);
        patterns.emotion =
          patterns.emotion || /(feel|happy|sad|angry)/.test(lower);
      }
      patterns.social = patterns.social || event.type.includes('social');
    }

    return patterns;
  }

  /**
   * Generate context hash for caching
   */
  private generateContextHash(context: ThoughtContext): string {
    const key = context.events
      .map((e) => `${e.type}:${e.data?.message || ''}`)
      .join('|');
    return key.substring(0, 100); // Limit length
  }

  /**
   * Trace causal relationships
   */
  private traceCausality(context: ThoughtContext): string[] {
    const chain: string[] = [];

    // Simple causality detection
    for (let i = 1; i < context.events.length; i++) {
      const prev = context.events[i - 1];
      const curr = context.events[i];

      if (
        prev &&
        curr &&
        curr.timestamp.getTime() - prev.timestamp.getTime() < 5000
      ) {
        chain.push(`${prev.type} → ${curr.type}`);
      }
    }

    return chain;
  }

  /**
   * Consider alternative interpretations
   */
  private considerAlternatives(context: ThoughtContext): string[] {
    const alternatives: string[] = [];

    // For questions, consider multiple interpretations
    const questions = context.events.filter(
      (e) =>
        e.data?.message &&
        typeof e.data.message === 'string' &&
        e.data.message.includes('?')
    );

    for (const q of questions) {
      if (
        q.data?.message &&
        typeof q.data.message === 'string' &&
        q.data.message.includes('or')
      ) {
        alternatives.push('Multiple choice detected');
      }
      if (
        q.data?.message &&
        typeof q.data.message === 'string' &&
        q.data.message.includes('why')
      ) {
        alternatives.push('Causal explanation needed');
      }
    }

    return alternatives;
  }

  /**
   * Reflect on thinking process
   */
  private reflect(system2Result: any, system1Result: ThoughtResult): string {
    const disagreement = Math.abs(
      system2Result.confidence - system1Result.confidence
    );

    if (disagreement > 0.3) {
      return 'Significant disagreement between intuition and analysis';
    } else if (
      this.metacognitiveState.uncertainty > this.config.uncertaintyThreshold!
    ) {
      return 'High uncertainty - recommend gathering more information';
    } else if (this.metacognitiveState.cognitiveLoad > 0.8) {
      return 'High cognitive load - may need to simplify approach';
    }

    return 'Thinking process appears sound';
  }

  /**
   * Update goal tracking
   */
  private updateGoals(context: ThoughtContext, analysis: any): void {
    // Extract goals from context
    if (context.goal) {
      const goalId = `goal_${Date.now()}`;
      this.activeGoals.set(goalId, {
        goal: context.goal,
        priority: analysis.significance || 0.5,
        created: new Date(),
      });
    }

    // Clean up old goals
    const now = Date.now();
    for (const [id, goal] of this.activeGoals) {
      if (now - goal.created.getTime() > this.config.goalPersistence!) {
        this.activeGoals.delete(id);
      }
    }

    // Limit active goals
    if (this.activeGoals.size > this.config.maxActiveGoals!) {
      // Remove lowest priority goals
      const sorted = Array.from(this.activeGoals.entries()).sort(
        (a, b) => b[1].priority - a[1].priority
      );

      for (let i = this.config.maxActiveGoals!; i < sorted.length; i++) {
        const entry = sorted[i];
        if (entry) {
          this.activeGoals.delete(entry[0]);
        }
      }
    }
  }

  /**
   * Create a simple plan
   */
  private _createSimplePlan(situation: any): Plan | null {
    if (!situation.requiresPlanning) return null;

    const steps: PlanStep[] = [
      {
        id: `step_1`,
        action: 'analyze_requirements',
        description: 'Understand what needs to be done',
        status: PlanStepStatus.PENDING,
        parameters: {},
        preconditions: [],
        effects: [],
      },
      {
        id: `step_2`,
        action: 'execute_task',
        description: 'Perform the required action',
        status: PlanStepStatus.PENDING,
        parameters: {},
        preconditions: ['step_1'],
        effects: [],
      },
    ];

    return {
      id: `plan_${Date.now()}`,
      goal: situation.summary,
      steps,
      priority: 0.7,
      estimatedDuration: 3600000, // 1 hour
      dependencies: [],
      status: PlanStatus.PENDING,
    };
  }

  /**
   * Apply theory of mind to understand others
   */
  private _applyTheoryOfMind(context: ThoughtContext): string[] {
    if (!this.theoryOfMind) return [];

    const insights: string[] = [];

    // Analyze social interactions
    const socialEvents = context.events.filter(
      (e) =>
        e.type.includes('social') ||
        e.type.includes('communication') ||
        e.data?.fromAgent
    );

    for (const event of socialEvents) {
      const otherAgentId = event.data?.fromAgent || event.source;
      if (!otherAgentId) continue;

      // Update mental model
      this.theoryOfMind.updateModel(otherAgentId, {
        message: event.data?.message,
        action: event.data?.action,
        emotion: event.data?.emotion,
        context: event.data,
      });

      // Get insights
      const _model = this.theoryOfMind.getModel(otherAgentId);

      // Predict behavior
      if (event.type.includes('question')) {
        const prediction = this.theoryOfMind.predict(
          otherAgentId,
          'response_to_question'
        );
        insights.push(
          `[ToM] ${otherAgentId} likely to: ${prediction.action} (${(prediction.confidence * 100).toFixed(0)}% confidence)`
        );
      }

      // Empathize
      const empathy = this.theoryOfMind.empathize(otherAgentId);
      if (empathy.intensity > 0.5) {
        insights.push(
          `[ToM] Sensing ${empathy.emotion} from ${otherAgentId} - ${empathy.understanding}`
        );
      }

      // Relationship assessment
      const relationship =
        this.theoryOfMind.getRelationshipSummary(otherAgentId);
      if (socialEvents.length === 1) {
        // Only show for single interactions
        insights.push(
          `[ToM] Relationship with ${otherAgentId}: ${relationship}`
        );
      }
    }

    return insights;
  }

  /**
   * Plan method - creates plans for goals
   */
  async plan(_agent: Agent, goal: string): Promise<Plan> {
    // Simple planning - just create basic steps
    const steps: PlanStep[] = [
      {
        id: 'analyze',
        action: 'analyze_goal',
        description: `Analyze: ${goal}`,
        status: PlanStepStatus.PENDING,
        parameters: {},
        preconditions: [],
        effects: [],
      },
      {
        id: 'execute',
        action: 'work_towards_goal',
        description: `Work on: ${goal}`,
        status: PlanStepStatus.PENDING,
        parameters: {},
        preconditions: ['analyze'],
        effects: [],
      },
    ];

    return {
      id: `plan_${Date.now()}`,
      goal,
      steps,
      priority: 0.7,
      estimatedDuration: 3600000,
      dependencies: [],
      status: PlanStatus.PENDING,
    };
  }

  /**
   * Decide method - makes decisions between options
   */
  async decide(_agent: Agent, options: Decision[]): Promise<Decision> {
    // Simple decision making - pick highest confidence option
    if (options.length === 0) {
      throw new Error('No options to decide between');
    }

    const firstOption = options[0];
    if (!firstOption) {
      throw new Error('Invalid options array');
    }

    if (options.length === 1) {
      return firstOption;
    }

    // Weight options based on confidence
    let bestOption = firstOption;
    let bestScore = bestOption.confidence || 0;

    for (const option of options) {
      const score = option.confidence || 0;

      if (score > bestScore) {
        bestScore = score;
        bestOption = option;
      }
    }

    return bestOption;
  }

  /**
   * Initialize the cognition module
   */
  initialize(config: BaseConfig): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get metadata about the cognition module
   */
  getMetadata(): CognitionModuleMetadata {
    return {
      id: this.id,
      name: 'Unified Cognition',
      description: 'Unified cognition system with dual-process thinking',
      version: '1.0.0',
      author: 'SYMindX',
      paradigms: ['dual_process', 'unified'],
      learningCapable: false,
    };
  }
}

// Add missing import
import { PlanStatus } from '../../types/agent';

// Factory function
export function createUnifiedCognition(
  config?: UnifiedCognitionConfig
): UnifiedCognition {
  return new UnifiedCognition(config);
}
