import {
  ThoughtNode,
  ReasoningPath,
  DecisionMatrix,
  DecisionOption,
  DecisionCriterion,
  StructuredThoughtResult,
} from '../../../types';
import {
  Agent,
  ThoughtContext,
  ThoughtResult,
  Plan,
  Decision,
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

import { ReactiveCognitionConfig } from './types';

/**
 * Reactive pattern structure
 */
interface ReactivePattern {
  response: string;
  confidence: number;
  frequency: number;
  lastUsed: Date;
}

export class ReactiveCognition implements CognitionModule {
  public id: string;
  public type: string = 'reactive';
  private config: ReactiveCognitionConfig;
  private responsePatterns: Map<string, ReactivePattern> = new Map();
  private thoughtGraph: Map<string, ThoughtNode> = new Map();
  private decisionHistory: DecisionMatrix[] = [];

  constructor(config: ReactiveCognitionConfig = {}) {
    this.id = `reactive_${Date.now()}`;
    this.config = {
      reactionThreshold: 0.5,
      quickResponseMode: true,
      maxResponseTime: 1000,
      priorityStimuli: ['urgent', 'immediate', 'critical'],
      ignoredStimuli: ['noise', 'irrelevant'],
      enableLearning: true,
      adaptationRate: 0.1,
      ...config,
    };
    this.initializePatterns();
  }

  async think(_agent: Agent, context: ThoughtContext): Promise<ThoughtResult> {
    // Timing tracked for future performance metrics
    const _startTime = Date.now();

    // Quick pattern matching for reactive responses
    const stimulus = this.extractStimulus(context);
    const pattern = this.findMatchingPattern(stimulus);

    // Fast response generation
    const response = pattern || this.generateQuickResponse(context);

    // Learn from the interaction if enabled
    if (this.config.enableLearning) {
      this.learnPattern(stimulus, response);
    }

    // Processing time is tracked for metrics but not returned in result
    void _startTime;

    return {
      thoughts: [`Reactive response to: ${stimulus}`],
      // reasoning: 'Fast pattern-based reaction', // Removed - not part of ThoughtResult
      confidence: pattern ? 0.8 : 0.6,
      actions: [
        {
          id: `action_${Date.now()}_${Math.random()}`,
          agentId: _agent.id,
          type: 'reactive_response',
          extension: 'reactive_cognition',
          action: response,
          parameters: {},
          timestamp: new Date(),
          status: ActionStatus.PENDING,
        },
      ],
      emotions: this.assessEmotionalResponse(context),
      memories: [],
      // processingTime // Removed - not part of ThoughtResult
    };
  }

  async plan(_agent: Agent, goal: string): Promise<Plan> {
    // Reactive planning is minimal - just immediate steps
    return {
      id: `plan_${Date.now()}`,
      goal,
      steps: [
        {
          id: '1',
          action: 'immediate_response',
          description: `React to: ${goal}`,
          status: PlanStepStatus.PENDING,
          parameters: {},
          preconditions: [],
          effects: [],
        },
      ],
      priority: 1,
      estimatedDuration: this.config.maxResponseTime || 1000,
      dependencies: [],
      status: PlanStatus.PENDING,
      confidence: 0.7,
    };
  }

  async decide(_agent: Agent, options: Decision[]): Promise<Decision> {
    // Quick decision making - choose first viable option
    const viableOptions = options.filter((option) =>
      this.isOptionViable(option)
    );

    if (viableOptions.length === 0) {
      throw new Error('No viable options for reactive decision');
    }

    // Select based on confidence or first available
    return viableOptions.reduce((best, current) =>
      (current.confidence || 0) > (best.confidence || 0) ? current : best
    );
  }

  initialize(config: BaseConfig): void {
    this.config = { ...this.config, ...config };
  }

  getMetadata(): CognitionModuleMetadata {
    return {
      id: `reactive_${Date.now()}`,
      name: 'Reactive Cognition',
      version: '1.0.0',
      description: 'Fast pattern-based reactive response system',
      author: 'SYMindX',
      paradigms: ['reactive'],
      learningCapable: this.config.enableLearning || false,
    };
  }

  private extractStimulus(context: ThoughtContext): string {
    // Extract key stimulus from context events
    if (context.events.length > 0) {
      const latestEvent = context.events[context.events.length - 1];
      if (latestEvent?.data?.message) {
        const message = latestEvent.data.message;
        return typeof message === 'string'
          ? message.toLowerCase().trim()
          : String(message).toLowerCase().trim();
      }
      if (latestEvent?.type) {
        return latestEvent.type.toLowerCase().trim();
      }
    }

    // Fallback to goal if available
    if (context.goal) {
      return context.goal.toLowerCase().trim();
    }

    return 'unknown_stimulus';
  }

  private findMatchingPattern(stimulus: string): string | null {
    // Look for exact matches first
    const pattern = this.responsePatterns.get(stimulus);
    if (pattern) {
      return pattern.response;
    }

    // Look for partial matches
    for (const [patternKey, patternData] of this.responsePatterns) {
      if (stimulus.includes(patternKey) || patternKey.includes(stimulus)) {
        return patternData.response;
      }
    }

    return null;
  }

  private getContextContent(context: ThoughtContext): string {
    // Extract content from context events
    const latestEvent = context.events[context.events.length - 1];
    const message = latestEvent?.data?.message;
    const messageStr =
      typeof message === 'string' ? message : message ? String(message) : '';
    return messageStr || context.goal || '';
  }

  private generateQuickResponse(context: ThoughtContext): string {
    // Generate a quick response based on context type
    const content = this.getContextContent(context);

    if (content?.includes('?')) {
      return 'quick_answer';
    }

    if (content?.includes('help')) {
      return 'provide_help';
    }

    if (content?.includes('hello') || content?.includes('hi')) {
      return 'greeting_response';
    }

    return 'acknowledge';
  }

  private learnPattern(stimulus: string, response: string): void {
    if (this.config.enableLearning) {
      // Simple pattern learning with adaptation
      const currentPattern = this.responsePatterns.get(stimulus);

      if (currentPattern) {
        // Update existing pattern
        currentPattern.frequency++;
        currentPattern.lastUsed = new Date();
        currentPattern.confidence = Math.min(
          1.0,
          currentPattern.confidence + (this.config.adaptationRate || 0.1)
        );
      } else {
        // Create new pattern
        this.responsePatterns.set(stimulus, {
          response,
          confidence: 0.6,
          frequency: 1,
          lastUsed: new Date(),
        });
      }
    }
  }

  private assessEmotionalResponse(context: ThoughtContext): EmotionState {
    // Quick emotional assessment for reactive responses
    let emotion = 'neutral';
    let intensity = 0.5;
    const triggers: string[] = [];
    const content = this.getContextContent(context);

    if (content?.includes('urgent') || content?.includes('critical')) {
      emotion = 'anxious';
      intensity = 0.8;
      triggers.push('urgent_keyword');
    } else if (content?.includes('thank') || content?.includes('great')) {
      emotion = 'happy';
      intensity = 0.7;
      triggers.push('positive_feedback');
    } else if (content?.includes('problem') || content?.includes('error')) {
      emotion = 'concerned';
      intensity = 0.6;
      triggers.push('problem_detected');
    }

    return {
      current: emotion,
      intensity,
      triggers,
      history: [],
      timestamp: new Date(),
    };
  }

  private isOptionViable(option: Decision): boolean {
    // Quick viability check
    return option.confidence > (this.config.reactionThreshold || 0.5);
  }

  // Duplicate methods removed - implemented above

  private initializePatterns(): void {
    // Initialize common reactive patterns
    const patterns: Array<[string, ReactivePattern]> = [
      [
        'urgent',
        {
          response: 'immediate_action',
          confidence: 0.9,
          frequency: 0,
          lastUsed: new Date(),
        },
      ],
      [
        'help',
        {
          response: 'provide_assistance',
          confidence: 0.8,
          frequency: 0,
          lastUsed: new Date(),
        },
      ],
      [
        'error',
        {
          response: 'error_handling',
          confidence: 0.85,
          frequency: 0,
          lastUsed: new Date(),
        },
      ],
      [
        'greeting',
        {
          response: 'greeting_response',
          confidence: 0.7,
          frequency: 0,
          lastUsed: new Date(),
        },
      ],
      [
        'question',
        {
          response: 'answer_question',
          confidence: 0.75,
          frequency: 0,
          lastUsed: new Date(),
        },
      ],
    ];

    patterns.forEach(([key, pattern]) => {
      this.responsePatterns.set(key, pattern);
    });
  }

  private createThoughtNode(
    content: string,
    confidence: number,
    type:
      | 'observation'
      | 'inference'
      | 'hypothesis'
      | 'conclusion'
      | 'question' = 'observation'
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

  private createQuickDecisionMatrix(options: Decision[]): DecisionMatrix {
    const criteria: DecisionCriterion[] = [
      { id: 'speed', name: 'Response Speed', type: 'benefit' },
      { id: 'confidence', name: 'Confidence Level', type: 'benefit' },
      { id: 'simplicity', name: 'Simplicity', type: 'benefit' },
    ];

    const decisionOptions: DecisionOption[] = options.map((opt, idx) => ({
      id: opt.id,
      name: `Option ${idx + 1}`,
      description: opt.reasoning || 'No reasoning provided',
      cost: 1 - (opt.confidence || 0.5),
    }));

    const matrix: DecisionMatrix = {
      options: decisionOptions,
      criteria,
      weights: { speed: 0.5, confidence: 0.3, simplicity: 0.2 },
      scores: decisionOptions.map(() => [
        { value: 1, normalized: 1, confidence: 0.9 }, // speed
        { value: 0.8, normalized: 0.8, confidence: 0.8 }, // confidence
        { value: 0.9, normalized: 0.9, confidence: 0.9 }, // simplicity
      ]),
      method: 'weighted_sum',
    };

    this.decisionHistory.push(matrix);
    return matrix;
  }
}

// Factory function for discovery system

export function createReactiveCognition(
  config: ReactiveCognitionConfig = {}
): ReactiveCognition {
  return new ReactiveCognition(config);
}

export default ReactiveCognition;
