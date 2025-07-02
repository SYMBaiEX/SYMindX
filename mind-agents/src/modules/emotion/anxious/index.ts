import { BaseEmotion, EmotionDefinition } from '../base-emotion.js'
import { AnxiousEmotionConfig } from './types.js'

export class AnxiousEmotion extends BaseEmotion {
  constructor(config: AnxiousEmotionConfig = {}) {
    super(config)
  }

  getDefinition(): EmotionDefinition {
    return {
      name: 'anxious',
      intensity: 0.6,
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
      color: '#FF6B6B',
      description: 'Feeling worried or nervous',
      modifiers: {
        creativity: 0.9,
        energy: 0.9,
        social: 0.7,
        focus: 0.6
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