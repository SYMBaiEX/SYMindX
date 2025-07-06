import { BaseEmotion, EmotionDefinition } from '../base-emotion'
import { NeutralEmotionConfig } from './types'

export class NeutralEmotion extends BaseEmotion {
  constructor(config: NeutralEmotionConfig = {}) {
    super(config)
  }

  getDefinition(): EmotionDefinition {
    return {
      name: 'neutral',
      intensity: 0.0,
      triggers: [
        'idle',
        'waiting',
        'observing',
        'calm',
        'balanced',
        'centered',
        'stable',
        'peaceful'
      ],
      color: '#9E9E9E',
      description: 'Feeling calm and balanced',
      modifiers: {
        creativity: 1.0,
        energy: 1.0,
        social: 1.0,
        focus: 1.0
      },
      coordinates: {
        valence: 0,        // Neutral valence
        arousal: 0,        // Neutral arousal
        dominance: 0       // Neutral dominance
      },
      personalityInfluence: {
        // Neutral emotion is less influenced by personality
        neuroticism: -0.1,     // Slightly less neutral if neurotic
        extraversion: 0.05,    // Minimal influence
        agreeableness: 0.05,   // Minimal influence
        conscientiousness: 0.1 // Slightly more stable if conscientious
      }
    }
  }

  processEvent(eventType: string, context?: any): any {
    // Neutral is the default state - it has very low reactivity
    if (context?.return_to_baseline) {
      this._intensity = 0.5 // Mild neutral state
      this.recordHistory('baseline_return')
    }
    
    // Neutral emotion has faster decay
    const timeSinceUpdate = Date.now() - this._lastUpdate.getTime()
    const decayRate = 0.02 * (timeSinceUpdate / 60000) // Faster decay
    this._intensity = Math.max(0, this._intensity - decayRate)
    
    return super.processEvent(eventType, context)
  }
}

export default NeutralEmotion

// Export factory function for easy instantiation
export function createNeutralEmotion(config: NeutralEmotionConfig = {}): NeutralEmotion {
  return new NeutralEmotion(config)
}