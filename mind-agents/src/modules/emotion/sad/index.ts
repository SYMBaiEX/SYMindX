import { BaseEmotion, EmotionDefinition } from '../base-emotion';

import { SadEmotionConfig } from './types';

export class SadEmotion extends BaseEmotion {
  constructor(config: SadEmotionConfig = {}) {
    super(config);
  }

  override getDefinition(): EmotionDefinition {
    return {
      name: 'sad',
      intensity: 0.6,
      triggers: [
        'loss',
        'failure',
        'negative_feedback',
        'disappointment',
        'rejection',
        'bad_news',
        'goodbye',
        'missing',
        'lonely',
        'hurt',
        'grief',
        'regret',
        'sorry',
        'unfortunate',
      ],
      color: '#4682B4',
      description: 'Feeling down or melancholic',
      modifiers: {
        creativity: 0.9,
        energy: 0.7,
        social: 0.6,
        focus: 0.8,
      },
      coordinates: {
        valence: -0.7, // Very negative
        arousal: -0.4, // Low arousal
        dominance: -0.5, // Submissive
      },
      personalityInfluence: {
        neuroticism: 0.7, // High neuroticism intensifies sadness
        extraversion: -0.3, // Low extraversion can deepen sadness
        agreeableness: 0.2, // Agreeable people feel others' sadness
        openness: 0.1, // Open people process sadness differently
      },
    };
  }

  override processEvent(eventType: string, context?: any): any {
    // Special processing for sad-specific events
    if (context?.outcome?.success === false) {
      this._intensity = Math.min(1.0, this._intensity + 0.15);
      this.recordHistory('failed_outcome');
    }

    if (context?.type === 'loss' || context?.type === 'goodbye') {
      this._intensity = Math.min(1.0, this._intensity + 0.3);
      this.recordHistory(context.type);
    }

    return super.processEvent(eventType, context);
  }
}

export default SadEmotion;

// Export factory function for easy instantiation
export function createSadEmotion(config: SadEmotionConfig = {}): SadEmotion {
  return new SadEmotion(config);
}
