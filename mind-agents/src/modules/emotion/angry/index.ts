import { EmotionResult, EmotionData } from '../../../types/modules/emotions';
import { BaseEmotion, EmotionDefinition } from '../base-emotion';

import { AngryEmotionConfig } from './types';
export class AngryEmotion extends BaseEmotion {
  constructor(config: AngryEmotionConfig = {}) {
    super(config);
  }

  override getDefinition(): EmotionDefinition {
    return {
      name: 'angry',
      intensity: 0.8,
      triggers: [
        'frustration',
        'injustice',
        'blocked_goal',
        'disrespect',
        'conflict',
        'annoyance',
        'unfair',
        'wrong',
        'mistake',
        'error',
        'stupid',
        'hate',
        'mad',
        'furious',
        'irritated',
      ],
      color: '#DC143C',
      description: 'Feeling frustrated or irritated',
      modifiers: {
        creativity: 0.8,
        energy: 1.2,
        social: 0.5,
        focus: 0.7,
      },
      coordinates: {
        valence: -0.8, // Very negative
        arousal: 0.8, // High arousal
        dominance: 0.6, // Dominant
      },
      personalityInfluence: {
        neuroticism: 0.5, // Neuroticism can trigger anger
        agreeableness: -0.6, // Low agreeableness = more anger
        conscientiousness: -0.3, // Low conscientiousness = frustration
        extraversion: 0.3, // Extraverts express anger more
      },
    };
  }

  override processEvent(eventType: string, context?: unknown): EmotionResult {
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
      this.recordHistory('blocked_action');
    }

    if (repeatedFailure) {
      this._intensity = Math.min(1.0, this._intensity + 0.3);
      this.recordHistory('repeated_failure');
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
      metadata: {
        ...result.metadata,
        angryData,
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
