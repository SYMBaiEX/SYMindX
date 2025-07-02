import { BaseEmotion, EmotionDefinition } from '../base-emotion.js'
import { HappyEmotionConfig } from './types.js'

export class HappyEmotion extends BaseEmotion {
  constructor(config: HappyEmotionConfig = {}) {
    super(config)
  }

  getDefinition(): EmotionDefinition {
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
        'fun'
      ],
      color: '#FFD700',
      description: 'Feeling joyful and content',
      modifiers: {
        creativity: 1.2,
        energy: 1.1,
        social: 1.3,
        focus: 1.0
      }
    }
  }

  processEvent(eventType: string, context?: any): any {
    // Special processing for happy-specific events
    if (context?.outcome?.success === true) {
      this._intensity = Math.min(1.0, this._intensity + 0.2)
      this.recordHistory('successful_outcome')
    }
    
    // Call parent processing
    return super.processEvent(eventType, context)
  }
}

export default HappyEmotion