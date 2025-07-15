import { EmotionResult } from '../../../types/modules/emotions';
import { BaseEmotion, EmotionDefinition } from '../base-emotion';

import { CuriousEmotionConfig } from './types';

export class CuriousEmotion extends BaseEmotion {
  constructor(config: CuriousEmotionConfig = {}) {
    super(config);
  }

  override getDefinition(): EmotionDefinition {
    return {
      name: 'curious',
      intensity: 0.7,
      triggers: [
        'new_information',
        'mystery',
        'question',
        'discovery',
        'exploration',
        'learning',
        'wonder',
        'interesting',
        'tell_me',
        'how',
        'why',
        'what_if',
        'investigate',
        'research',
      ],
      color: '#20B2AA',
      description: 'Feeling eager to know or learn something',
      coordinates: {
        valence: 0.5, // Positive emotion
        arousal: 0.7, // High arousal
        dominance: 0.3, // Moderate control
      },
      modifiers: {
        creativity: 0.8,
        energy: 0.5,
        social: 0.2,
        focus: 0.6,
      },
    };
  }

  override processEvent(eventType: string, context?: unknown): EmotionResult {
    // Special processing for curiosity-specific events
    if (context?.new_discovery) {
      this._intensity = Math.min(1.0, this._intensity + 0.25);
      this.recordHistory('new_discovery');
    }

    if (context?.unanswered_question) {
      this._intensity = Math.min(1.0, this._intensity + 0.2);
      this.recordHistory('unanswered_question');
    }

    return super.processEvent(eventType, context);
  }
}

export default CuriousEmotion;

// Export factory function for easy instantiation
export function createCuriousEmotion(
  config: CuriousEmotionConfig = {}
): CuriousEmotion {
  return new CuriousEmotion(config);
}
