import { EmotionResult } from '../../../types/modules/emotions';
import { BaseEmotion, EmotionDefinition } from '../base-emotion';

import { ProudEmotionConfig } from './types';
export class ProudEmotion extends BaseEmotion {
  constructor(config: ProudEmotionConfig = {}) {
    super(config);
  }

  override getDefinition(): EmotionDefinition {
    return {
      name: 'proud',
      intensity: 0.8,
      triggers: [
        'achievement',
        'recognition',
        'overcoming_challenge',
        'growth',
        'helping_others',
        'accomplished',
        'succeeded',
        'did_it',
        'finally',
        'milestone',
        'progress',
        'improvement',
        'honor',
      ],
      color: '#4169E1',
      description: "Feeling deep satisfaction from one's achievements",
      coordinates: {
        valence: 0.8, // Highly positive
        arousal: 0.5, // Moderate arousal
        dominance: 0.7, // High sense of control/agency
      },
      modifiers: {
        creativity: 0.3,
        energy: 0.4,
        social: 0.2,
        focus: 0.5,
      },
    };
  }

  override processEvent(eventType: string, context?: any): EmotionResult {
    // Special processing for pride-specific events
    if (context?.personal_achievement) {
      this._intensity = Math.min(1.0, this._intensity + 0.3);
      this.recordHistory('personal_achievement');
    }

    if (context?.recognition_received) {
      this._intensity = Math.min(1.0, this._intensity + 0.2);
      this.recordHistory('recognized');
    }

    return super.processEvent(eventType, context);
  }
}

export default ProudEmotion;

// Export factory function for easy instantiation
export function createProudEmotion(
  config: ProudEmotionConfig = {}
): ProudEmotion {
  return new ProudEmotion(config);
}

// Export module factory for registry
export function createProudEmotionModule(config?: any): ProudEmotion {
  return new ProudEmotion(config || {});
}
