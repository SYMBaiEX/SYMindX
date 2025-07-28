import { EmotionResult, EmotionData } from '../../../types/modules/emotions';
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

  override processEvent(eventType: string, context?: any): EmotionResult {
    // Special processing for sad-specific events
    const previousIntensity = this._intensity;
    if (context?.outcome?.success === false) {
      this._intensity = Math.min(1.0, this._intensity + 0.15);
      this.recordHistory('failed_outcome');
    }

    if (context?.type === 'loss' || context?.type === 'goodbye') {
      this._intensity = Math.min(1.0, this._intensity + 0.3);
      this.recordHistory(context.type);
    }

    const result = super.processEvent(eventType, context);

    // Add sad-specific data
    const sadData: EmotionData = {
      base: {
        intensity: this._intensity,
        triggers: this.triggers,
        modifiers: this.getEmotionModifier(),
      },
      sad: {
        griefLevel: context?.type === 'loss' ? 0.8 : this._intensity * 0.6,
        isolationFactor: 1.4,
        energyPenalty: 0.7,
      },
    };

    return {
      ...result,
      changed: result.changed || previousIntensity !== this._intensity,
      data: sadData,
    };
  }
}

export default SadEmotion;

// Export factory function for easy instantiation
export function createSadEmotion(config: SadEmotionConfig = {}): SadEmotion {
  return new SadEmotion(config);
}

// Export module factory for registry
export function createSadEmotionModule(config?: any): SadEmotion {
  return new SadEmotion(config || {});
}
