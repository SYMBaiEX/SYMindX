import { BaseEmotion, EmotionDefinition } from '../base-emotion.js'
import { ConfusedEmotionConfig } from './types.js'

export class ConfusedEmotion extends BaseEmotion {
  constructor(config: ConfusedEmotionConfig = {}) {
    super(config)
  }

  getDefinition(): EmotionDefinition {
    return {
      name: 'confused',
      intensity: 0.4,
      triggers: [
        'complexity',
        'contradiction',
        'ambiguity',
        'unexpected_result',
        'unclear_instruction',
        'puzzled',
        'lost',
        'unclear',
        'what',
        'dont_understand',
        'mixed_signals',
        'paradox'
      ],
      color: '#795548',
      description: 'Feeling uncertain or puzzled',
      modifiers: {
        creativity: 0.9,
        energy: 0.9,
        social: 0.8,
        focus: 0.6
      }
    }
  }

  processEvent(eventType: string, context?: any): any {
    // Special processing for confusion-specific events
    if (context?.contradiction_detected) {
      this._intensity = Math.min(1.0, this._intensity + 0.2)
      this.recordHistory('contradiction')
    }
    
    if (context?.clarity_level && context.clarity_level < 0.3) {
      this._intensity = Math.min(1.0, this._intensity + 0.15)
      this.recordHistory('low_clarity')
    }
    
    return super.processEvent(eventType, context)
  }
}

export default ConfusedEmotion