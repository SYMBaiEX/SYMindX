import { BaseEmotion, EmotionDefinition } from '../base-emotion.js'
import { SadEmotionConfig } from './types.js'

export class SadEmotion extends BaseEmotion {
  constructor(config: SadEmotionConfig = {}) {
    super(config)
  }

  getDefinition(): EmotionDefinition {
    return {
      name: 'sad',
      intensity: 0.6,
      triggers: [
        'loss',
        'failure', 
        'negative_feedback',
        'disappointment',
        'rejection',
        'bad_news',
        'goodbye',
        'missing',
        'lonely',
        'hurt',
        'grief',
        'regret',
        'sorry',
        'unfortunate'
      ],
      color: '#4682B4',
      description: 'Feeling down or melancholic',
      modifiers: {
        creativity: 0.9,
        energy: 0.7,
        social: 0.6,
        focus: 0.8
      }
    }
  }

  processEvent(eventType: string, context?: any): any {
    // Special processing for sad-specific events
    if (context?.outcome?.success === false) {
      this._intensity = Math.min(1.0, this._intensity + 0.15)
      this.recordHistory('failed_outcome')
    }
    
    if (context?.type === 'loss' || context?.type === 'goodbye') {
      this._intensity = Math.min(1.0, this._intensity + 0.3)
      this.recordHistory(context.type)
    }
    
    return super.processEvent(eventType, context)
  }
}

export default SadEmotion