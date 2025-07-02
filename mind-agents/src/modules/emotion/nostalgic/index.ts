import { BaseEmotion, EmotionDefinition } from '../base-emotion.js'
import { NostalgicEmotionConfig } from './types.js'

export class NostalgicEmotion extends BaseEmotion {
  constructor(config: NostalgicEmotionConfig = {}) {
    super(config)
  }

  getDefinition(): EmotionDefinition {
    return {
      name: 'nostalgic',
      intensity: 0.5,
      triggers: [
        'memory',
        'past_experience',
        'familiar_place',
        'old_friend',
        'reflection',
        'anniversary',
        'remember',
        'used_to',
        'back_when',
        'old_days',
        'memories',
        'reminisce',
        'throwback',
        'history'
      ],
      color: '#95A5A6',
      description: 'Feeling wistful about the past',
      modifiers: {
        creativity: 1.1,
        energy: 0.9,
        social: 1.0,
        focus: 0.8
      }
    }
  }

  processEvent(eventType: string, context?: any): any {
    // Special processing for nostalgia-specific events
    if (context?.memory_type === 'personal' || context?.memory_age > 30) {
      this._intensity = Math.min(1.0, this._intensity + 0.2)
      this.recordHistory('personal_memory')
    }
    
    if (context?.anniversary || context?.milestone) {
      this._intensity = Math.min(1.0, this._intensity + 0.25)
      this.recordHistory('milestone_reached')
    }
    
    return super.processEvent(eventType, context)
  }
}

export default NostalgicEmotion