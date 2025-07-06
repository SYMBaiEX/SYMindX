import { BaseEmotion, EmotionDefinition } from '../base-emotion'
import { AnxiousEmotionConfig } from './types'

export class AnxiousEmotion extends BaseEmotion {
  constructor(config: AnxiousEmotionConfig = {}) {
    super(config)
  }

  getDefinition(): EmotionDefinition {
    return {
      name: 'anxious',
      intensity: 0.7,
      triggers: [
        'uncertainty',
        'pressure',
        'deadline',
        'unknown_outcome',
        'waiting',
        'stress',
        'worried',
        'nervous',
        'scared',
        'afraid',
        'concern',
        'risk',
        'danger',
        'unknown'
      ],
      color: '#FFA500',
      description: 'Feeling worried or uneasy about something with an uncertain outcome',
      coordinates: {
        valence: -0.6,    // Negative emotion
        arousal: 0.8,     // High arousal/excitement
        dominance: -0.4   // Low sense of control
      },
      modifiers: {
        creativity: -0.2,
        energy: 0.3,
        social: -0.3,
        focus: 0.4
      }
    }
  }

  processEvent(eventType: string, context?: any): any {
    // Special processing for anxiety-specific events
    if (context?.uncertainty_level && context.uncertainty_level > 0.5) {
      this._intensity = Math.min(1.0, this._intensity + 0.2)
      this.recordHistory('high_uncertainty')
    }
    
    if (context?.time_pressure) {
      this._intensity = Math.min(1.0, this._intensity + 0.15)
      this.recordHistory('time_pressure')
    }
    
    return super.processEvent(eventType, context)
  }
}

export default AnxiousEmotion

// Export factory function for easy instantiation
export function createAnxiousEmotion(config: AnxiousEmotionConfig = {}): AnxiousEmotion {
  return new AnxiousEmotion(config)
}