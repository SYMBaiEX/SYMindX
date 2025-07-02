import { BaseEmotion, EmotionDefinition } from '../base-emotion.js'
import { EmpatheticEmotionConfig } from './types.js'

export class EmpatheticEmotion extends BaseEmotion {
  constructor(config: EmpatheticEmotionConfig = {}) {
    super(config)
  }

  getDefinition(): EmotionDefinition {
    return {
      name: 'empathetic',
      intensity: 0.6,
      triggers: [
        'others_pain',
        'helping',
        'understanding',
        'connection',
        'compassion',
        'shared_experience',
        'sympathy',
        'care',
        'concern_for_others',
        'support',
        'relate',
        'feel_for',
        'solidarity'
      ],
      color: '#E74C3C',
      description: 'Feeling connected to others\' emotions',
      modifiers: {
        creativity: 1.0,
        energy: 1.0,
        social: 1.4,
        focus: 0.9
      }
    }
  }

  processEvent(eventType: string, context?: any): any {
    // Special processing for empathy-specific events
    if (context?.others_emotion && context.others_emotion !== 'neutral') {
      this._intensity = Math.min(1.0, this._intensity + 0.2)
      this.recordHistory('shared_emotion')
    }
    
    if (context?.helping_action) {
      this._intensity = Math.min(1.0, this._intensity + 0.15)
      this.recordHistory('helped_someone')
    }
    
    return super.processEvent(eventType, context)
  }
}

export default EmpatheticEmotion