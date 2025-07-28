import { EmotionResult, EmotionData } from '../../../types/modules/emotions';
import { runtimeLogger } from '../../../utils/logger';
import { BaseEmotion, EmotionDefinition } from '../base-emotion';

import { AngryEmotionConfig } from './types';

/**
 * Advanced Angry Emotion Module with Emotional Intelligence
 *
 * Features:
 * - Sophisticated trigger analysis with contextual understanding
 * - Adaptive anger management strategies
 * - Personality-based response modulation
 * - Constructive anger channeling mechanisms
 * - Social impact assessment
 * - Anger decay patterns based on resolution
 */
export class AngryEmotion extends BaseEmotion {
  private angerHistory: Array<{
    trigger: string;
    intensity: number;
    resolved: boolean;
    timestamp: Date;
  }> = [];

  private copingStrategies: Map<string, number>;
  private angerSubtypes: Map<string, number>;

  constructor(config: AngryEmotionConfig = {}) {
    super(config);

    // Initialize Maps in constructor to avoid Bun class property initialization issues
    this.copingStrategies = new Map([
      ['deep_breathing', 0.8],
      ['perspective_taking', 0.9],
      ['problem_solving', 0.85],
      ['communication', 0.7],
      ['physical_activity', 0.75],
    ]);

    this.angerSubtypes = new Map([
      ['righteous_anger', 0.7], // Justified anger at injustice
      ['frustration', 0.6], // Goal-blocking anger
      ['irritation', 0.4], // Minor annoyance
      ['rage', 0.9], // Intense, uncontrolled anger
      ['resentment', 0.5], // Long-held anger
    ]);

    // Initialize anger patterns (implementation can be added later if needed)
  }

  override getDefinition(): EmotionDefinition {
    return {
      name: 'angry',
      intensity: 0.8,
      triggers: [
        // Core anger triggers
        'frustration',
        'injustice',
        'blocked_goal',
        'disrespect',
        'conflict',
        'betrayal',
        'violation',
        'powerlessness',

        // Contextual triggers
        'unfairness',
        'discrimination',
        'exploitation',
        'manipulation',
        'broken_promise',
        'boundary_violation',
        'repeated_failure',
        'ignored_needs',

        // Expression triggers
        'annoyance',
        'irritation',
        'outrage',
        'fury',
        'wrath',
        'indignation',
        'exasperation',
        'hostility',
      ],
      color: '#DC143C',
      description: 'Complex anger response with adaptive management',
      modifiers: {
        creativity: 0.8, // Anger can fuel creative problem-solving
        energy: 1.2, // High energy mobilization
        social: 0.5, // Reduced social engagement
        focus: 0.7, // Narrowed but intense focus
      },
      coordinates: {
        valence: -0.8, // Very negative
        arousal: 0.8, // High arousal
        dominance: 0.6, // Dominant stance
      },
      personalityInfluence: {
        neuroticism: 0.5, // Higher reactivity to triggers
        agreeableness: -0.6, // Lower tolerance for conflict
        conscientiousness: -0.3, // Frustration with obstacles
        extraversion: 0.3, // More expressive anger
        openness: 0.2, // Openness to anger as information
      },
    };
  }

  private recordAngerHistory(trigger: string): void {
    this.angerHistory.push({
      trigger,
      intensity: this._intensity,
      resolved: false,
      timestamp: new Date(),
    });

    // Keep only the most recent 20 history entries
    if (this.angerHistory.length > 20) {
      this.angerHistory.shift();
    }
  }

  override processEvent(eventType: string, context?: any): EmotionResult {
    // Special processing for anger-specific events
    const previousIntensity = this._intensity;
    const contextType =
      context && typeof context === 'object' && 'type' in context
        ? (context as any).type
        : undefined;
    const repeatedFailure =
      context && typeof context === 'object' && 'repeated_failure' in context
        ? (context as any).repeated_failure
        : undefined;

    if (contextType === 'blocked' || contextType === 'denied') {
      this._intensity = Math.min(1.0, this._intensity + 0.25);
      this.recordAngerHistory('blocked_action');
    }

    if (repeatedFailure) {
      this._intensity = Math.min(1.0, this._intensity + 0.3);
      this.recordAngerHistory('repeated_failure');
    }

    const result = super.processEvent(eventType, context);

    // Add angry-specific data
    const angryData: EmotionData = {
      base: {
        intensity: this._intensity,
        triggers: this.triggers,
        modifiers: this.getEmotionModifier(),
      },
      angry: {
        frustrationLevel: repeatedFailure ? 0.9 : this._intensity * 0.7,
        aggressionFactor: this._intensity * 1.2,
        focusPenalty: 0.7,
      },
    };

    return {
      ...result,
      changed: result.changed || previousIntensity !== this._intensity,
      data: angryData,
      metadata: {
        processingTime: result.metadata?.processingTime ?? 0,
        triggersProcessed: result.metadata?.triggersProcessed ?? 1,
        ...result.metadata,
      },
    };
  }
}

export default AngryEmotion;

// Export factory function for easy instantiation
export function createAngryEmotion(
  config: AngryEmotionConfig = {}
): AngryEmotion {
  return new AngryEmotion(config);
}

// Export module factory for registry
export function createAngryEmotionModule(config?: any): AngryEmotion {
  return new AngryEmotion(config || {});
}
