import { EmotionResult } from '../../../types/modules/emotions';
import { BaseEmotion, EmotionDefinition } from '../base-emotion';

import { EmpatheticEmotionConfig } from './types';
export class EmpatheticEmotion extends BaseEmotion {
  constructor(config: EmpatheticEmotionConfig = {}) {
    super(config);
  }

  override getDefinition(): EmotionDefinition {
    return {
      name: 'empathetic',
      intensity: 0.8,
      triggers: [
        'others_pain',
        'helping',
        'understanding',
        'connection',
        'compassion',
        'shared_experience',
        'sympathy',
        'care',
        'concern_for_others',
        'support',
        'relate',
        'feel_for',
        'solidarity',
      ],
      color: '#FF69B4',
      description: 'Feeling understanding and sharing the feelings of others',
      coordinates: {
        valence: 0.4, // Positive but can vary
        arousal: 0.5, // Moderate arousal
        dominance: 0.2, // Low to moderate control
      },
      modifiers: {
        creativity: 0.3,
        energy: 0.2,
        social: 0.9,
        focus: 0.4,
      },
    };
  }

  override processEvent(eventType: string, context?: unknown): EmotionResult {
    // Special processing for empathy-specific events
    if (context?.others_emotion && context.others_emotion !== 'neutral') {
      this._intensity = Math.min(1.0, this._intensity + 0.2);
      this.recordHistory('shared_emotion');
    }

    if (context?.helping_action) {
      this._intensity = Math.min(1.0, this._intensity + 0.15);
      this.recordHistory('helped_someone');
    }

    return super.processEvent(eventType, context);
  }
}

export default EmpatheticEmotion;

// Export factory function for easy instantiation
export function createEmpatheticEmotion(
  config: EmpatheticEmotionConfig = {}
): EmpatheticEmotion {
  return new EmpatheticEmotion(config);
}
