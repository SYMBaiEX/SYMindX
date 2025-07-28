import { EmotionResult, EmotionData } from '../../../types/modules/emotions';
import { BaseEmotion, EmotionDefinition } from '../base-emotion';

import { HappyEmotionConfig } from './types';
export class HappyEmotion extends BaseEmotion {
  constructor(config: HappyEmotionConfig = {}) {
    super(config);
  }

  override getDefinition(): EmotionDefinition {
    return {
      name: 'happy',
      intensity: 0.7,
      triggers: [
        'success',
        'achievement',
        'positive_feedback',
        'compliment',
        'goal_reached',
        'good_news',
        'praise',
        'reward',
        'victory',
        'celebration',
        'friendship',
        'love',
        'joy',
        'excitement',
        'fun',
      ],
      color: '#FFD700',
      description: 'Feeling joyful and content',
      modifiers: {
        creativity: 1.2,
        energy: 1.1,
        social: 1.3,
        focus: 1.0,
      },
      coordinates: {
        valence: 0.8, // Very positive
        arousal: 0.6, // Moderately high arousal
        dominance: 0.4, // Slightly dominant
      },
      personalityInfluence: {
        extraversion: 0.6, // Extraverts experience happiness more intensely
        neuroticism: -0.4, // High neuroticism dampens happiness
        agreeableness: 0.3, // Agreeable people find joy in social harmony
        openness: 0.2, // Open people find joy in new experiences
      },
    };
  }

  override processEvent(eventType: string, context?: any): EmotionResult {
    // Special processing for happy-specific events
    const previousIntensity = this._intensity;
    if (context?.outcome?.success === true) {
      this._intensity = Math.min(1.0, this._intensity + 0.2);
      this.recordHistory('successful_outcome');
    }

    // Call parent processing
    const result = super.processEvent(eventType, context);

    // Add happy-specific data
    const happyData: EmotionData = {
      base: {
        intensity: this._intensity,
        triggers: this.triggers,
        modifiers: this.getEmotionModifier(),
      },
      happy: {
        joyLevel: this._intensity * 0.8,
        excitementFactor: context?.outcome?.success ? 1.2 : 1.0,
        socialBonus: 1.3,
      },
    };

    return {
      ...result,
      changed: result.changed || previousIntensity !== this._intensity,
      data: happyData,
    };
  }
}

export default HappyEmotion;

// Export factory function for easy instantiation
export function createHappyEmotion(
  config: HappyEmotionConfig = {}
): HappyEmotion {
  return new HappyEmotion(config);
}

// Export module factory for registry
export function createHappyEmotionModule(config?: any): HappyEmotion {
  return new HappyEmotion(config || {});
}
