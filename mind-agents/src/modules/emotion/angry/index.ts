import { BaseEmotion, EmotionDefinition } from '../base-emotion'
import { AngryEmotionConfig } from './types'

export class AngryEmotion extends BaseEmotion {
  constructor(config: AngryEmotionConfig = {}) {
    super(config)
  }

  getDefinition(): EmotionDefinition {
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
        'irritated'
      ],
      color: '#DC143C',
      description: 'Feeling frustrated or irritated',
      modifiers: {
        creativity: 0.8,
        energy: 1.2,
        social: 0.5,
        focus: 0.7
      },
      coordinates: {
        valence: -0.8,     // Very negative
        arousal: 0.8,      // High arousal
        dominance: 0.6     // Dominant
      },
      personalityInfluence: {
        neuroticism: 0.5,          // Neuroticism can trigger anger
        agreeableness: -0.6,       // Low agreeableness = more anger
        conscientiousness: -0.3,   // Low conscientiousness = frustration
        extraversion: 0.3          // Extraverts express anger more
      }
    }
  }

  processEvent(eventType: string, context?: any): any {
    // Special processing for anger-specific events
    if (context?.type === 'blocked' || context?.type === 'denied') {
      this._intensity = Math.min(1.0, this._intensity + 0.25)
      this.recordHistory('blocked_action')
    }
    
    if (context?.repeated_failure) {
      this._intensity = Math.min(1.0, this._intensity + 0.3)
      this.recordHistory('repeated_failure')
    }
    
    return super.processEvent(eventType, context)
  }
}

export default AngryEmotion

// Export factory function for easy instantiation
export function createAngryEmotion(config: AngryEmotionConfig = {}): AngryEmotion {
  return new AngryEmotion(config)
}