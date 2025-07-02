import { BaseEmotion, EmotionDefinition } from '../base-emotion.js'
import { ProudEmotionConfig } from './types.js'

export class ProudEmotion extends BaseEmotion {
  constructor(config: ProudEmotionConfig = {}) {
    super(config)
  }

  getDefinition(): EmotionDefinition {
    return {
      name: 'proud',
      intensity: 0.6,
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
        'honor'
      ],
      color: '#9C27B0',
      description: 'Feeling accomplished and satisfied',
      modifiers: {
        creativity: 1.0,
        energy: 1.1,
        social: 1.2,
        focus: 1.0
      }
    }
  }

  processEvent(eventType: string, context?: any): any {
    // Special processing for pride-specific events
    if (context?.personal_achievement) {
      this._intensity = Math.min(1.0, this._intensity + 0.3)
      this.recordHistory('personal_achievement')
    }
    
    if (context?.recognition_received) {
      this._intensity = Math.min(1.0, this._intensity + 0.2)
      this.recordHistory('recognized')
    }
    
    return super.processEvent(eventType, context)
  }
}

export default ProudEmotion