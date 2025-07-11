import {
  Agent,
  ThoughtContext,
  ThoughtResult,
  Plan,
  Decision,
  EmotionState,
  AgentAction,
} from '../../../types/agent';
import { CognitionModule } from '../../../types/cognition';

import { ReactiveCognitionConfig } from './types';

export class ReactiveCognition implements CognitionModule {
  public id: string;
  public type: string = 'reactive';
  private config: ReactiveCognitionConfig;
  private responsePatterns: Map<string, string> = new Map();

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
  }

  async think(agent: Agent, context: ThoughtContext): Promise<ThoughtResult> {
    const startTime = Date.now();

    // Quick pattern matching for reactive responses
    const stimulus = this.extractStimulus(context);
    const pattern = this.findMatchingPattern(stimulus);

    // Fast response generation
    const response = pattern || this.generateQuickResponse(context);

    // Learn from the interaction if enabled
    if (this.config.enableLearning) {
      this.learnPattern(stimulus, response);
    }

    const processingTime = Date.now() - startTime;

    return {
      thoughts: [`Reactive response to: ${stimulus}`],
      // reasoning: 'Fast pattern-based reaction', // Removed - not part of ThoughtResult
      confidence: pattern ? 0.8 : 0.6,
      actions: [
        {
          id: `action_${Date.now()}_${Math.random()}`,
          type: 'reactive_response',
          extension: 'reactive_cognition',
          action: response,
          parameters: {},
          timestamp: new Date(),
          status: 'pending' as any,
        },
      ],
      emotions: this.assessEmotionalResponse(context),
      memories: [],
      // processingTime // Removed - not part of ThoughtResult
    };
  }

  async plan(agent: Agent, goal: string): Promise<Plan> {
    // Reactive planning is minimal - just immediate steps
    return {
      id: `plan_${Date.now()}`,
      goal,
      steps: [
        {
          id: '1',
          action: 'immediate_response',
          description: `React to: ${goal}`,
          status: 'pending' as any,
          parameters: {},
          preconditions: [],
          effects: [],
        },
      ],
      priority: 1,
      estimatedDuration: this.config.maxResponseTime || 1000,
      dependencies: [],
      status: 'pending' as any,
      confidence: 0.7,
    };
  }

  async decide(agent: Agent, options: Decision[]): Promise<Decision> {
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

  initialize(config: any): void {
    this.config = { ...this.config, ...config };
  }

  getMetadata() {
    return {
      id: `reactive_${Date.now()}`,
      name: 'Reactive Cognition',
      version: '1.0.0',
      description: 'Fast pattern-based reactive response system',
      author: 'SYMindX',
      paradigms: ['reactive'] as any,
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
    if (this.responsePatterns.has(stimulus)) {
      return this.responsePatterns.get(stimulus)!;
    }

    // Look for partial matches
    for (const [pattern, response] of this.responsePatterns) {
      if (stimulus.includes(pattern) || pattern.includes(stimulus)) {
        return response;
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
      const currentResponse = this.responsePatterns.get(stimulus);

      if (currentResponse) {
        // Weighted update of existing pattern
        const adaptationRate = this.config.adaptationRate || 0.1;
        // In a real implementation, we'd have more sophisticated learning
        this.responsePatterns.set(stimulus, response);
      } else {
        this.responsePatterns.set(stimulus, response);
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

  // Remove duplicate methods - they already exist above
}

// Factory function for discovery system
export function createReactiveCognition(
  config: ReactiveCognitionConfig = {}
): ReactiveCognition {
  return new ReactiveCognition(config);
}

export default ReactiveCognition;
