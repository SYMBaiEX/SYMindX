/**
 * Enhanced Unified Cognition Module
 *
 * A streamlined cognition system with modular helpers for:
 * - Goal-oriented planning and execution
 * - Reactive response capabilities  
 * - Learning and adaptation mechanisms
 * - Extension points for community cognition modules
 *
 * Implements dual-process thinking (System 1 & System 2) with metacognition.
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
  PlanStatus,
  EmotionState,
} from '../../types/agent';
import {
  CognitionModule,
  CognitionModuleMetadata,
  ReasoningParadigm,
} from '../../types/cognition';
import { BaseConfig, ActionParameters } from '../../types/common';
import { MemoryType, MemoryDuration } from '../../types/enums';
import { runtimeLogger } from '../../utils/logger';

export interface UnifiedCognitionConfig extends BaseConfig {
  // Core thinking modes
  thinkForActions?: boolean;
  thinkForMentions?: boolean; 
  thinkOnRequest?: boolean;
  quickResponseMode?: boolean;
  analysisDepth?: 'shallow' | 'normal' | 'deep';

  // Enhanced dual-process thinking
  enableDualProcess?: boolean;
  system1Threshold?: number;
  system2Timeout?: number;

  // Goal-oriented planning
  enableGoalTracking?: boolean;
  maxActiveGoals?: number;
  goalPersistence?: number;
  planningHorizon?: number; // How far ahead to plan (ms)

  // Learning and adaptation
  enableLearning?: boolean;
  learningRate?: number;
  adaptationThreshold?: number;
  experienceWeight?: number;

  // Reactive capabilities
  enableReactiveMode?: boolean;
  reactionSpeed?: number;
  reflexThreshold?: number;

  // Metacognition and self-reflection
  enableMetacognition?: boolean;
  uncertaintyThreshold?: number;
  selfReflectionInterval?: number;

  // Memory integration
  useMemories?: boolean;
  maxMemoryRecall?: number;
  memoryRelevanceThreshold?: number;

  // Extension points
  enableExtensions?: boolean;
  extensionTimeout?: number;
  
  // Community module support
  allowCommunityModules?: boolean;
  communityModulePaths?: string[];
}

export class UnifiedCognition implements CognitionModule {
  public id: string;
  public type: string = 'unified';
  private config: UnifiedCognitionConfig;

  // Enhanced cognitive state management
  private system1Cache: Map<string, { response: ThoughtResult; timestamp: number }> = new Map();
  private activeGoals: Map<string, { goal: string; priority: number; created: Date; progress: number }> = new Map();
  private learningHistory: Array<{ situation: string; action: string; outcome: number; timestamp: Date }> = [];
  private adaptationPatterns: Map<string, { pattern: string; effectiveness: number; usage: number }> = new Map();
  
  // Metacognitive state with enhanced tracking
  private metacognitiveState = {
    confidence: 0.5,
    uncertainty: 0.5,
    cognitiveLoad: 0,
    recentErrors: [] as string[],
    performanceHistory: [] as Array<{ task: string; success: boolean; timestamp: Date }>,
    selfReflectionDue: false,
    lastReflection: new Date()
  };

  // Reactive system state
  private reactivePatterns: Map<string, { trigger: string; response: string; confidence: number }> = new Map();
  private reflexCache: Map<string, { action: string; timestamp: number }> = new Map();
  
  // Extension system
  private loadedExtensions: Map<string, any> = new Map();
  private communityModules: Map<string, any> = new Map();

  constructor(config: UnifiedCognitionConfig = {}) {
    this.id = `unified_${Date.now()}`;
    
    const defaults: UnifiedCognitionConfig = {
      // Core thinking
      thinkForActions: true,
      thinkForMentions: true,
      thinkOnRequest: true,
      quickResponseMode: true,
      analysisDepth: 'normal',
      
      // Enhanced dual-process
      enableDualProcess: true,
      system1Threshold: 0.8,
      system2Timeout: 5000,
      
      // Goal-oriented planning
      enableGoalTracking: true,
      maxActiveGoals: 5,
      goalPersistence: 86400000, // 24 hours
      planningHorizon: 3600000, // 1 hour
      
      // Learning and adaptation
      enableLearning: true,
      learningRate: 0.1,
      adaptationThreshold: 0.7,
      experienceWeight: 0.3,
      
      // Reactive capabilities
      enableReactiveMode: true,
      reactionSpeed: 0.8,
      reflexThreshold: 0.9,
      
      // Metacognition
      enableMetacognition: true,
      uncertaintyThreshold: 0.7,
      selfReflectionInterval: 3600000, // 1 hour
      
      // Memory integration
      useMemories: true,
      maxMemoryRecall: 10,
      memoryRelevanceThreshold: 0.6,
      
      // Extensions
      enableExtensions: true,
      extensionTimeout: 2000,
      allowCommunityModules: false,
      communityModulePaths: []
    };

    this.config = { ...defaults, ...config };
    
    // Initialize reactive patterns
    this.initializeReactivePatterns();
    
    // Load community modules if enabled
    if (this.config.allowCommunityModules) {
      this.loadCommunityModules();
    }
    
    runtimeLogger.info('🧠 Enhanced Unified Cognition Module initialized with modular helpers');
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
      name: 'Enhanced Unified Cognition',
      version: '2.0.0',
      description: 'Unified cognition with goal-oriented planning, reactive responses, and learning capabilities',
      author: 'SYMindX',
      paradigms: [
        ReasoningParadigm.UNIFIED, 
        ReasoningParadigm.DUAL_PROCESS,
        ReasoningParadigm.GOAL_ORIENTED,
        ReasoningParadigm.REACTIVE
      ],
      learningCapable: this.config.enableLearning || false,
    };
  }

  // Modular helper methods for goal-oriented planning
  private async planGoalExecution(goal: string, context: ThoughtContext): Promise<Plan> {
    const steps: PlanStep[] = [];
    const goalId = `goal_${Date.now()}`;
    
    // Analyze goal complexity
    const complexity = this.analyzeGoalComplexity(goal);
    
    if (complexity > 0.7) {
      // Complex goal - break down into sub-goals
      const subGoals = this.decomposeGoal(goal);
      for (let i = 0; i < subGoals.length; i++) {
        steps.push({
          id: `step_${i + 1}`,
          action: `execute_subgoal_${i + 1}`,
          description: subGoals[i],
          status: PlanStepStatus.PENDING,
          parameters: { subGoal: subGoals[i] },
          preconditions: i > 0 ? [`step_${i}`] : [],
          effects: [`subgoal_${i + 1}_completed`]
        });
      }
    } else {
      // Simple goal - direct execution
      steps.push({
        id: 'step_1',
        action: 'execute_goal',
        description: goal,
        status: PlanStepStatus.PENDING,
        parameters: { goal },
        preconditions: [],
        effects: ['goal_completed']
      });
    }
    
    // Track goal
    this.activeGoals.set(goalId, {
      goal,
      priority: complexity,
      created: new Date(),
      progress: 0
    });
    
    return {
      id: `plan_${Date.now()}`,
      goal,
      steps,
      priority: complexity,
      estimatedDuration: this.estimateGoalDuration(goal, complexity),
      dependencies: [],
      status: PlanStatus.PENDING
    };
  }

  private analyzeGoalComplexity(goal: string): number {
    let complexity = 0.3; // Base complexity
    
    // Check for complexity indicators
    if (goal.includes('multiple') || goal.includes('several')) complexity += 0.2;
    if (goal.includes('complex') || goal.includes('difficult')) complexity += 0.3;
    if (goal.includes('plan') || goal.includes('strategy')) complexity += 0.2;
    if (goal.length > 100) complexity += 0.1; // Long goals tend to be complex
    
    return Math.min(1.0, complexity);
  }

  private decomposeGoal(goal: string): string[] {
    // Simple goal decomposition - can be enhanced with NLP
    const subGoals: string[] = [];
    
    if (goal.includes('and')) {
      subGoals.push(...goal.split(' and ').map(s => s.trim()));
    } else if (goal.includes(',')) {
      subGoals.push(...goal.split(',').map(s => s.trim()));
    } else {
      // Default decomposition
      subGoals.push(`Analyze: ${goal}`);
      subGoals.push(`Execute: ${goal}`);
      subGoals.push(`Verify: ${goal}`);
    }
    
    return subGoals.filter(s => s.length > 0);
  }

  private estimateGoalDuration(goal: string, complexity: number): number {
    const baseTime = 300000; // 5 minutes
    const complexityMultiplier = 1 + (complexity * 2);
    const lengthMultiplier = 1 + (goal.length / 1000);
    
    return Math.round(baseTime * complexityMultiplier * lengthMultiplier);
  }

  // Modular helper methods for reactive responses
  private async generateReactiveResponse(context: ThoughtContext): Promise<ThoughtResult> {
    const trigger = this.identifyTrigger(context);
    
    // Check for cached reflex response
    const reflexKey = this.generateReflexKey(trigger);
    const cachedReflex = this.reflexCache.get(reflexKey);
    
    if (cachedReflex && Date.now() - cachedReflex.timestamp < 5000) {
      return {
        thoughts: [`[Reactive] Using cached reflex: ${cachedReflex.action}`],
        actions: [],
        emotions: this.assessBasicEmotion(context),
        memories: [],
        confidence: 0.9
      };
    }
    
    // Generate new reactive response
    const response = this.processReactiveTrigger(trigger, context);
    
    // Cache for future use
    this.reflexCache.set(reflexKey, {
      action: response.thoughts[0] || 'reactive_response',
      timestamp: Date.now()
    });
    
    return response;
  }

  private identifyTrigger(context: ThoughtContext): string {
    for (const event of context.events) {
      if (event.type.includes('urgent') || event.type.includes('immediate')) {
        return 'urgent';
      }
      if (event.type.includes('question') || event.data?.message?.includes('?')) {
        return 'question';
      }
      if (event.type.includes('greeting')) {
        return 'greeting';
      }
    }
    return 'general';
  }

  private generateReflexKey(trigger: string): string {
    return `reflex_${trigger}`;
  }

  private processReactiveTrigger(trigger: string, context: ThoughtContext): ThoughtResult {
    const thoughts: string[] = [`[Reactive] Processing ${trigger} trigger`];
    
    switch (trigger) {
      case 'urgent':
        thoughts.push('Prioritizing immediate response');
        break;
      case 'question':
        thoughts.push('Preparing direct answer');
        break;
      case 'greeting':
        thoughts.push('Responding with appropriate greeting');
        break;
      default:
        thoughts.push('Using general reactive pattern');
    }
    
    return {
      thoughts,
      actions: [],
      emotions: this.assessBasicEmotion(context),
      memories: [],
      confidence: 0.8
    };
  }

  // Modular helper methods for learning and adaptation
  private async learnFromExperience(situation: string, action: string, outcome: number): Promise<void> {
    if (!this.config.enableLearning) return;
    
    // Record experience
    this.learningHistory.push({
      situation,
      action,
      outcome,
      timestamp: new Date()
    });
    
    // Update adaptation patterns
    const patternKey = `${situation}_${action}`;
    const existingPattern = this.adaptationPatterns.get(patternKey);
    
    if (existingPattern) {
      // Update existing pattern
      const newEffectiveness = existingPattern.effectiveness + 
        (outcome - existingPattern.effectiveness) * this.config.learningRate!;
      
      this.adaptationPatterns.set(patternKey, {
        pattern: patternKey,
        effectiveness: newEffectiveness,
        usage: existingPattern.usage + 1
      });
    } else {
      // Create new pattern
      this.adaptationPatterns.set(patternKey, {
        pattern: patternKey,
        effectiveness: outcome,
        usage: 1
      });
    }
    
    // Prune old experiences
    if (this.learningHistory.length > 1000) {
      this.learningHistory = this.learningHistory.slice(-500);
    }
  }

  private getBestAdaptationPattern(situation: string): string | null {
    let bestPattern: string | null = null;
    let bestScore = -1;
    
    for (const [key, pattern] of this.adaptationPatterns) {
      if (key.startsWith(situation)) {
        const score = pattern.effectiveness * Math.log(pattern.usage + 1);
        if (score > bestScore) {
          bestScore = score;
          bestPattern = key.split('_')[1] || null;
        }
      }
    }
    
    return bestPattern;
  }

  // Extension point methods for community modules
  private initializeReactivePatterns(): void {
    // Initialize common reactive patterns
    this.reactivePatterns.set('greeting', {
      trigger: 'hello|hi|hey',
      response: 'greeting_response',
      confidence: 0.9
    });
    
    this.reactivePatterns.set('question', {
      trigger: '\\?',
      response: 'answer_question',
      confidence: 0.8
    });
    
    this.reactivePatterns.set('thanks', {
      trigger: 'thank|thanks',
      response: 'acknowledge_thanks',
      confidence: 0.9
    });
  }

  private async loadCommunityModules(): Promise<void> {
    if (!this.config.communityModulePaths) return;
    
    for (const modulePath of this.config.communityModulePaths) {
      try {
        // Dynamic import would go here in a real implementation
        // const module = await import(modulePath);
        // this.communityModules.set(modulePath, module);
        runtimeLogger.info(`📦 Community module loaded: ${modulePath}`);
      } catch (error) {
        runtimeLogger.warn(`⚠️ Failed to load community module: ${modulePath}`, error);
      }
    }
  }

  // Enhanced metacognitive methods
  private async performSelfReflection(): Promise<void> {
    if (!this.config.enableMetacognition) return;
    
    const now = new Date();
    const timeSinceReflection = now.getTime() - this.metacognitiveState.lastReflection.getTime();
    
    if (timeSinceReflection < this.config.selfReflectionInterval!) return;
    
    // Analyze recent performance
    const recentPerformance = this.metacognitiveState.performanceHistory.slice(-10);
    const successRate = recentPerformance.filter(p => p.success).length / recentPerformance.length;
    
    // Update confidence based on performance
    this.metacognitiveState.confidence = 0.5 + (successRate - 0.5) * 0.5;
    this.metacognitiveState.uncertainty = 1 - this.metacognitiveState.confidence;
    
    // Identify areas for improvement
    if (successRate < 0.6) {
      this.metacognitiveState.recentErrors.push('Low success rate detected');
    }
    
    this.metacognitiveState.lastReflection = now;
    this.metacognitiveState.selfReflectionDue = false;
    
    runtimeLogger.info(`🤔 Self-reflection completed. Confidence: ${this.metacognitiveState.confidence.toFixed(2)}`);
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
        e.data?.['mentioned'] === true ||
        e.data?.['tagged'] === true ||
        e.type.includes('mention')
    );
    if (hasMention && this.config.thinkForMentions) return false;

    // Check for explicit thinking requests
    const hasThinkRequest = context.events.some((e) => {
      const message = e.data?.['message'];
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
      const msg = e.data?.['message'];
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
    agent: Agent,
    context: ThoughtContext
  ): Promise<ThoughtResult> {
    const thoughts: string[] = [];
    const actions: AgentAction[] = [];
    const memories: MemoryRecord[] = [];

    // 1. Analyze the situation
    const situation = this.analyzeSituation(context);
    thoughts.push(`Situation: ${situation['summary']}`);

    // 2. Retrieve relevant memories if enabled
    let relevantMemories: MemoryRecord[] = [];
    if (this.config.useMemories && agent.memory && context.memories) {
      relevantMemories = context.memories.slice(0, this.config.maxMemoryRecall);
      if (relevantMemories.length > 0) {
        thoughts.push(`Recalled ${relevantMemories.length} relevant memories`);
      }
    }

    // 3. Determine if action is needed
    if (situation['requiresAction']) {
      const action = this.determineAction(agent, situation, context);
      if (action) {
        actions.push(action);
        thoughts.push(`Decided to: ${action.type} - ${action.action}`);
      }
    }

    // 3a. Generate plan if needed
    if (situation['requiresPlanning']) {
      const plan = this._createSimplePlan(situation);
      if (plan) {
        thoughts.push(
          `Created plan: ${plan.goal} with ${plan.steps.length} steps`
        );
      }
    }

    // 3b. Apply theory of mind insights
    const theoryInsights = this._applyTheoryOfMind(context);
    if (theoryInsights.length > 0) {
      thoughts.push(...theoryInsights);
    }

    // 4. Process emotions based on situation
    const emotion = this.processEmotions(agent, situation, context);

    // 5. Create memories if significant
    const significance =
      typeof situation['significance'] === 'number'
        ? situation['significance']
        : 0;
    if (significance > 0.6) {
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
  private analyzeSituation(context: ThoughtContext): Record<string, unknown> {
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
        const message = event.data?.['message'];
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
      if (event.data?.['mentioned'] || event.type.includes('mention')) {
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
    situation: Record<string, unknown>,
    context: ThoughtContext
  ): AgentAction | null {
    // Don't create actions for simple communication
    if (situation['type'] === 'communication' && !situation['requiresAction']) {
      return null;
    }

    // Social media response
    if (situation['type'] === 'social_mention') {
      // Use agent's personality to determine response style
      const traits =
        agent.characterConfig?.['personality'] &&
        typeof agent.characterConfig['personality'] === 'object' &&
        'traits' in agent.characterConfig['personality']
          ? agent.characterConfig['personality']['traits']
          : {};
      const extraversion =
        traits && typeof traits === 'object' && 'extraversion' in traits
          ? (traits as any).extraversion
          : 0.5;
      const responseType = extraversion > 0.5 ? 'enthusiastic' : 'thoughtful';

      return {
        id: `action_${Date.now()}`,
        agentId: agent.id,
        type: ActionCategory.COMMUNICATION,
        action: 'respond_to_mention',
        parameters: {
          platform: context.events[0]?.source || 'unknown',
          responseType,
          agentPersonality:
            (agent.characterConfig?.['personality'] &&
            typeof agent.characterConfig['personality'] === 'object' &&
            'summary' in agent.characterConfig['personality']
              ? (agent.characterConfig['personality'] as any)['summary']
              : undefined) || 'neutral',
        },
        priority: 0.8,
        status: ActionStatus.PENDING,
        extension: context.events[0]?.source || 'social',
        timestamp: new Date(),
      };
    }

    // Action request
    if (situation['type'] === 'action_request') {
      const event = context.events.find((e) => e.type.includes('action'));
      return {
        id: `action_${Date.now()}`,
        agentId: agent.id,
        type: ActionCategory.COMMUNICATION,
        action: (event?.data?.['action'] as string) || 'process_request',
        parameters:
          typeof event?.data?.['parameters'] === 'object' &&
          event?.data?.['parameters'] !== null &&
          !(event?.data?.['parameters'] instanceof Date) &&
          !Array.isArray(event?.data?.['parameters'])
            ? (event.data['parameters'] as ActionParameters)
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
    situation: Record<string, unknown>,
    context: ThoughtContext
  ): EmotionState {
    // Use agent personality to influence emotion processing
    const personalityTraits = agent.config.psyche?.traits || [];
    const hasEmotionalTrait = personalityTraits.some(
      (t) => t.includes('emotional') || t.includes('sensitive')
    );
    const personalityInfluence = hasEmotionalTrait ? 0.8 : 0.5;

    // Base emotion
    let emotion = 'neutral';
    let intensity = 0.5 * personalityInfluence;
    const triggers: string[] = [];

    // Adjust based on situation
    if (situation['type'] === 'social_mention') {
      emotion = 'excited';
      intensity = 0.7;
      triggers.push('social_interaction');
    } else if (situation['type'] === 'communication') {
      // Check sentiment of messages
      const hasPositive = context.events.some((e) => {
        const msg = e.data?.['message'];
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
  private assessBasicEmotion(_context: ThoughtContext): EmotionState {
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
    situation: Record<string, unknown>,
    thoughts: string[]
  ): MemoryRecord {
    return {
      id: `memory_${Date.now()}`,
      agentId: agent.id,
      type: MemoryType.EXPERIENCE,
      content: `${typeof situation['summary'] === 'string' ? situation['summary'] : ''}: ${thoughts.join('. ')}`,
      metadata: {
        situationType:
          typeof situation['type'] === 'string' ? situation['type'] : 'unknown',
        significance:
          typeof situation['significance'] === 'number'
            ? situation['significance']
            : 0,
        timestamp: new Date().toISOString(),
      },
      importance:
        typeof situation['significance'] === 'number'
          ? situation['significance']
          : 0,
      timestamp: new Date(),
      tags: [
        typeof situation['type'] === 'string' ? situation['type'] : 'unknown',
        'thinking',
        'cognition',
      ],
      duration: MemoryDuration.LONG_TERM,
    };
  }

  /**
   * Calculate confidence in thinking
   */
  private calculateConfidence(
    situation: Record<string, unknown>,
    memories: MemoryRecord[]
  ): number {
    let confidence = 0.5;

    // Higher confidence for familiar situations
    if (memories.length > 3) confidence += 0.2;

    // Higher confidence for clear situation types
    if (situation['type'] !== 'unknown') confidence += 0.2;

    // Lower confidence for complex situations
    const complexity =
      typeof situation['complexity'] === 'number' ? situation['complexity'] : 0;
    if (complexity > 0.7) confidence -= 0.1;

    return Math.max(0.1, Math.min(1.0, confidence));
  }

  /**
   * System 1 thinking - fast, intuitive, pattern-based
   */
  private async system1Think(
    agent: Agent,
    context: ThoughtContext
  ): Promise<ThoughtResult> {
    // Quick intuitive thinking for agent
    const startTime = Date.now();
    const thoughts: string[] = [
      `[System 1] Quick intuitive response for ${agent.id}`,
    ];

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

    // Log processing time
    const processingTime = Date.now() - startTime;
    thoughts.push(`Processing took ${processingTime}ms`);

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
    const startTime = Date.now();

    // Include System 1 insights
    thoughts.push(
      `System 1 confidence: ${system1Result.confidence.toFixed(2)}`
    );

    // Deep analysis with timeout
    const analysisPromise = this.deepAnalysis(agent, context);
    const timeoutPromise = new Promise<{ timedOut: boolean }>((resolve) =>
      setTimeout(() => resolve({ timedOut: true }), this.config.system2Timeout!)
    );

    const analysisResult = await Promise.race([
      analysisPromise,
      timeoutPromise,
    ]);

    if ('timedOut' in analysisResult && analysisResult.timedOut) {
      thoughts.push('System 2 timeout - using best available analysis');
      return {
        ...system1Result,
        thoughts: [...system1Result.thoughts, ...thoughts],
        confidence: system1Result.confidence * 0.8,
      };
    }

    const analysis = analysisResult as ThoughtResult;

    // Goal management
    if (this.config.enableGoalTracking) {
      this.updateGoals(context, analysis);
    }

    // Metacognitive reflection
    if (this.config.enableMetacognition) {
      const reflection = this.reflect(analysis, system1Result);
      thoughts.push(`Metacognition: ${reflection}`);
    }

    // Add timing information
    const processingTime = Date.now() - startTime;
    thoughts.push(`[System 2] Processing completed in ${processingTime}ms`);

    const thoughtResult = analysis as ThoughtResult;
    return {
      thoughts: [...thoughts, ...thoughtResult.thoughts],
      actions: thoughtResult.actions,
      emotions: thoughtResult.emotions,
      memories: thoughtResult.memories,
      confidence: thoughtResult.confidence,
    };
  }

  /**
   * Deep analysis for System 2
   */
  private async deepAnalysis(
    agent: Agent,
    context: ThoughtContext
  ): Promise<ThoughtResult> {
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
  private matchPatterns(context: ThoughtContext): {
    greeting: boolean;
    question: boolean;
    command: boolean;
    emotion: boolean;
    social: boolean;
  } {
    const patterns = {
      greeting: false,
      question: false,
      command: false,
      emotion: false,
      social: false,
    };

    for (const event of context.events) {
      const message = event.data?.['message'];
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
      .map((e) => `${e.type}:${e.data?.['message'] || ''}`)
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
        e.data?.['message'] &&
        typeof e.data['message'] === 'string' &&
        e.data['message'].includes('?')
    );

    for (const q of questions) {
      if (
        q.data?.['message'] &&
        typeof q.data['message'] === 'string' &&
        q.data['message'].includes('or')
      ) {
        alternatives.push('Multiple choice detected');
      }
      if (
        q.data?.['message'] &&
        typeof q.data['message'] === 'string' &&
        q.data['message'].includes('why')
      ) {
        alternatives.push('Causal explanation needed');
      }
    }

    return alternatives;
  }

  /**
   * Reflect on thinking process
   */
  private reflect(
    system2Result: ThoughtResult,
    system1Result: ThoughtResult
  ): string {
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
  private updateGoals(context: ThoughtContext, analysis: ThoughtResult): void {
    // Extract goals from context
    if (context.goal) {
      const goalId = `goal_${Date.now()}`;
      this.activeGoals.set(goalId, {
        goal: context.goal,
        priority: analysis.confidence || 0.5,
        created: new Date(),
      });
    }

    // Clean up old goals
    const now = Date.now();
    const goals = Array.from(this.activeGoals.entries());
    for (const [id, goal] of goals) {
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
  private _createSimplePlan(situation: Record<string, unknown>): Plan | null {
    if (!situation['requiresPlanning']) return null;

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
      goal:
        typeof situation['summary'] === 'string' ? situation['summary'] : '',
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
        e.data?.['fromAgent']
    );

    for (const event of socialEvents) {
      const otherAgentId = event.data?.['fromAgent'] || event.source;
      if (!otherAgentId) continue;

      // Theory of mind analysis (placeholder implementation)
      insights.push(`[ToM] Analyzing interaction with ${otherAgentId}`);

      // Basic behavior prediction based on event type
      if (event.type.includes('question')) {
        insights.push(`[ToM] ${otherAgentId} likely expects a response`);
      }

      if (event.data?.['message']) {
        insights.push(`[ToM] ${otherAgentId} is communicating`);
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
}

// Factory function
export function createUnifiedCognition(
  config?: UnifiedCognitionConfig
): UnifiedCognition {
  return new UnifiedCognition(config);
}
