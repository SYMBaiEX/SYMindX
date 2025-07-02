import { BaseEmotion, EmotionDefinition } from '../base-emotion.js'
import { AngryEmotionConfig } from './types.js'

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