import { BaseEmotion, EmotionDefinition } from '../base-emotion.js'
import { CuriousEmotionConfig } from './types.js'

export class CuriousEmotion extends BaseEmotion {
  constructor(config: CuriousEmotionConfig = {}) {
    super(config)
  }

  getDefinition(): EmotionDefinition {
    return {
      name: 'curious',
      intensity: 0.5,
      triggers: [
        'new_information',
        'mystery',
        'question',
        'discovery',
        'exploration',
        'learning',
        'wonder',
        'interesting',
        'tell_me',
        'how',
        'why',
        'what_if',
        'investigate',
        'research'
      ],
      color: '#00BCD4',
      description: 'Feeling interested and inquisitive',
      modifiers: {
        creativity: 1.3,
        energy: 1.1,
        social: 1.1,
        focus: 1.1
      }
    }
  }

  processEvent(eventType: string, context?: any): any {
    // Special processing for curiosity-specific events
    if (context?.new_discovery) {
      this._intensity = Math.min(1.0, this._intensity + 0.25)
      this.recordHistory('new_discovery')
    }
    
    if (context?.unanswered_question) {
      this._intensity = Math.min(1.0, this._intensity + 0.2)
      this.recordHistory('unanswered_question')
    }
    
    return super.processEvent(eventType, context)
  }
}

export default CuriousEmotion