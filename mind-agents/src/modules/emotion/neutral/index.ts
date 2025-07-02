import { BaseEmotion, EmotionDefinition } from '../base-emotion.js'
import { NeutralEmotionConfig } from './types.js'

export class NeutralEmotion extends BaseEmotion {
  constructor(config: NeutralEmotionConfig = {}) {
    super(config)
  }

  getDefinition(): EmotionDefinition {
    return {
      name: 'neutral',
      intensity: 0.0,
      triggers: [
        'idle',
        'waiting',
        'observing',
        'calm',
        'balanced',
        'centered',
        'stable',
        'peaceful'
      ],
      color: '#9E9E9E',
      description: 'Feeling calm and balanced',
      modifiers: {
        creativity: 1.0,
        energy: 1.0,
        social: 1.0,
        focus: 1.0
      }
    }
  }

  processEvent(eventType: string, context?: any): any {
    // Neutral is the default state - it has very low reactivity
    if (context?.return_to_baseline) {
      this._intensity = 0.5 // Mild neutral state
      this.recordHistory('baseline_return')
    }
    
    // Neutral emotion has faster decay
    const timeSinceUpdate = Date.now() - this._lastUpdate.getTime()
    const decayRate = 0.02 * (timeSinceUpdate / 60000) // Faster decay
    this._intensity = Math.max(0, this._intensity - decayRate)
    
    return super.processEvent(eventType, context)
  }
}

export default NeutralEmotion