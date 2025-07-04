import { BaseEmotion, EmotionDefinition } from '../base-emotion.js'
import { NostalgicEmotionConfig } from './types.js'

export class NostalgicEmotion extends BaseEmotion {
  constructor(config: NostalgicEmotionConfig = {}) {
    super(config)
  }

  getDefinition(): EmotionDefinition {
    return {
      name: 'nostalgic',
      intensity: 0.6,
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
      color: '#DDA0DD',
      description: 'Feeling a sentimental longing for the past',
      coordinates: {
        valence: 0.2,     // Bittersweet (mildly positive)
        arousal: -0.3,    // Low arousal
        dominance: -0.2   // Low control (swept by memories)
      },
      modifiers: {
        creativity: 0.5,
        energy: -0.3,
        social: 0.1,
        focus: -0.2
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