import { BaseEmotion, EmotionDefinition } from '../base-emotion.js'
import { ConfidentEmotionConfig } from './types.js'

export class ConfidentEmotion extends BaseEmotion {
  constructor(config: ConfidentEmotionConfig = {}) {
    super(config)
  }

  getDefinition(): EmotionDefinition {
    return {
      name: 'confident',
      intensity: 0.8,
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
      color: '#FFD700',
      description: 'Feeling certain of one\'s ability to succeed',
      coordinates: {
        valence: 0.7,     // Positive emotion
        arousal: 0.6,     // Moderately high arousal
        dominance: 0.8    // High sense of control
      },
      modifiers: {
        creativity: 0.4,
        energy: 0.6,
        social: 0.5,
        focus: 0.7
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