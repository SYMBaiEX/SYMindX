import { BaseEmotion, EmotionDefinition } from '../base-emotion.js'
import { ConfidentEmotionConfig } from './types.js'

export class ConfidentEmotion extends BaseEmotion {
  constructor(config: ConfidentEmotionConfig = {}) {
    super(config)
  }

  getDefinition(): EmotionDefinition {
    return {
      name: 'confident',
      intensity: 0.7,
      triggers: [
        'success',
        'mastery',
        'praise',
        'accomplishment',
        'expertise',
        'recognition',
        'capable',
        'strong',
        'ready',
        'prepared',
        'skilled',
        'competent',
        'assured',
        'certain'
      ],
      color: '#4ECDC4',
      description: 'Feeling self-assured and capable',
      modifiers: {
        creativity: 1.1,
        energy: 1.1,
        social: 1.2,
        focus: 1.2
      }
    }
  }

  processEvent(eventType: string, context?: any): any {
    // Special processing for confidence-specific events
    if (context?.skill_improvement) {
      this._intensity = Math.min(1.0, this._intensity + 0.15)
      this.recordHistory('skill_improved')
    }
    
    if (context?.challenge_overcome) {
      this._intensity = Math.min(1.0, this._intensity + 0.25)
      this.recordHistory('challenge_overcome')
    }
    
    return super.processEvent(eventType, context)
  }
}

export default ConfidentEmotion