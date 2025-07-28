import { EmotionResult } from '../../../types/modules/emotions';
import { BaseEmotion, EmotionDefinition } from '../base-emotion';

import { ConfusedEmotionConfig } from './types';
export class ConfusedEmotion extends BaseEmotion {
  constructor(config: ConfusedEmotionConfig = {}) {
    super(config);
  }

  override getDefinition(): EmotionDefinition {
    return {
      name: 'confused',
      intensity: 0.6,
      triggers: [
        'complexity',
        'contradiction',
        'ambiguity',
        'unexpected_result',
        'unclear_instruction',
        'puzzled',
        'lost',
        'unclear',
        'what',
        'dont_understand',
        'mixed_signals',
        'paradox',
      ],
      color: '#9370DB',
      description: 'Feeling uncertain or unable to understand something',
      coordinates: {
        valence: -0.3, // Slightly negative
        arousal: 0.4, // Moderate arousal
        dominance: -0.5, // Low sense of control
      },
      modifiers: {
        creativity: 0.3,
        energy: -0.2,
        social: -0.1,
        focus: -0.4,
      },
    };
  }

  override processEvent(eventType: string, context?: any): EmotionResult {
    // Special processing for confusion-specific events
    if (context?.contradiction_detected) {
      this._intensity = Math.min(1.0, this._intensity + 0.2);
      this.recordHistory('contradiction');
    }

    if (context?.clarity_level && context.clarity_level < 0.3) {
      this._intensity = Math.min(1.0, this._intensity + 0.15);
      this.recordHistory('low_clarity');
    }

    return super.processEvent(eventType, context);
  }
}

export default ConfusedEmotion;

// Export factory function for easy instantiation
export function createConfusedEmotion(
  config: ConfusedEmotionConfig = {}
): ConfusedEmotion {
  return new ConfusedEmotion(config);
}

// Export module factory for registry
export function createConfusedEmotionModule(config?: any): ConfusedEmotion {
  return new ConfusedEmotion(config || {});
}
