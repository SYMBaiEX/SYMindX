import { EmotionState, EmotionRecord } from '../../types/agent.js'
import { EmotionModule } from '../../types/emotion.js'
import { BaseEmotion } from './base-emotion.js'

// Import all emotion types
import { HappyEmotion } from './happy/index.js'
import { SadEmotion } from './sad/index.js'
import { AngryEmotion } from './angry/index.js'
import { AnxiousEmotion } from './anxious/index.js'
import { ConfidentEmotion } from './confident/index.js'
import { NostalgicEmotion } from './nostalgic/index.js'
import { EmpatheticEmotion } from './empathetic/index.js'
import { CuriousEmotion } from './curious/index.js'
import { ProudEmotion } from './proud/index.js'
import { ConfusedEmotion } from './confused/index.js'
import { NeutralEmotion } from './neutral/index.js'

export class CompositeEmotionModule implements EmotionModule {
  private emotions: Map<string, BaseEmotion> = new Map()
  private _current: string = 'neutral'
  private _intensity: number = 0
  private _history: EmotionRecord[] = []
  private config: any

  constructor(config: any = {}) {
    this.config = config
    
    // Initialize all emotion modules
    this.emotions.set('happy', new HappyEmotion(config.happy))
    this.emotions.set('sad', new SadEmotion(config.sad))
    this.emotions.set('angry', new AngryEmotion(config.angry))
    this.emotions.set('anxious', new AnxiousEmotion(config.anxious))
    this.emotions.set('confident', new ConfidentEmotion(config.confident))
    this.emotions.set('nostalgic', new NostalgicEmotion(config.nostalgic))
    this.emotions.set('empathetic', new EmpatheticEmotion(config.empathetic))
    this.emotions.set('curious', new CuriousEmotion(config.curious))
    this.emotions.set('proud', new ProudEmotion(config.proud))
    this.emotions.set('confused', new ConfusedEmotion(config.confused))
    this.emotions.set('neutral', new NeutralEmotion(config.neutral))
  }

  get current(): string {
    return this._current
  }

  get intensity(): number {
    return this._intensity
  }

  get triggers(): string[] {
    const currentEmotion = this.emotions.get(this._current)
    return currentEmotion ? currentEmotion.triggers : []
  }

  get history(): EmotionRecord[] {
    return this._history
  }

  processEvent(eventType: string, context?: any): EmotionState {
    console.log(`🎭 Processing emotional event: ${eventType}`)
    
    // Process event through all emotions
    const emotionResponses: Array<{ name: string, intensity: number }> = []
    
    for (const [name, emotion] of this.emotions) {
      const state = emotion.processEvent(eventType, context)
      if (state.intensity > 0.1) { // Only consider emotions with meaningful intensity
        emotionResponses.push({ name, intensity: state.intensity })
      }
    }

    // Find the dominant emotion
    if (emotionResponses.length > 0) {
      emotionResponses.sort((a, b) => b.intensity - a.intensity)
      const dominant = emotionResponses[0]
      
      // Transition to the dominant emotion
      if (dominant.name !== this._current || Math.abs(dominant.intensity - this._intensity) > 0.1) {
        this.transitionToEmotion(dominant.name, dominant.intensity)
      }
    } else {
      // No strong emotions, gradually return to neutral
      if (this._current !== 'neutral') {
        this._intensity *= 0.9
        if (this._intensity < 0.1) {
          this.transitionToEmotion('neutral', 0)
        }
      }
    }

    return this.getCurrentState()
  }

  private transitionToEmotion(emotion: string, intensity: number): void {
    // Record the transition
    this._history.push({
      emotion: this._current,
      intensity: this._intensity,
      timestamp: new Date(),
      duration: this._history.length > 0 
        ? Date.now() - this._history[this._history.length - 1].timestamp.getTime()
        : 0,
      triggers: [`transition_to_${emotion}`]
    })

    this._current = emotion
    this._intensity = intensity

    console.log(`😊 Emotion changed to ${this._current} (${(this._intensity * 100).toFixed(0)}%)`)
  }

  getCurrentState(): EmotionState {
    const currentEmotion = this.emotions.get(this._current)
    return {
      current: this._current,
      intensity: this._intensity,
      triggers: currentEmotion?.triggers || [],
      history: this._history.slice(-10),
      timestamp: new Date()
    }
  }

  getCurrentEmotion(): string {
    return this._current
  }

  setEmotion(emotion: string, intensity: number, triggers: string[] = []): EmotionState {
    if (this.emotions.has(emotion)) {
      this.transitionToEmotion(emotion, intensity)
      
      // Also set it in the specific emotion module
      const emotionModule = this.emotions.get(emotion)
      if (emotionModule) {
        emotionModule.setEmotion(emotion, intensity, triggers)
      }
    }
    
    return this.getCurrentState()
  }

  getHistory(limit?: number): EmotionRecord[] {
    // Combine history from all emotions
    const allHistory: EmotionRecord[] = []
    
    for (const emotion of this.emotions.values()) {
      allHistory.push(...emotion.getHistory())
    }
    
    // Sort by timestamp
    allHistory.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    
    return limit ? allHistory.slice(0, limit) : allHistory
  }

  reset(): EmotionState {
    // Reset all emotions
    for (const emotion of this.emotions.values()) {
      emotion.reset()
    }
    
    this._current = 'neutral'
    this._intensity = 0
    this._history = []
    
    return this.getCurrentState()
  }

  // Helper methods
  getEmotionModifier(): Record<string, number> {
    const currentEmotion = this.emotions.get(this._current)
    return currentEmotion?.getEmotionModifier() || {
      creativity: 1.0,
      energy: 1.0,
      social: 1.0,
      focus: 1.0
    }
  }

  getEmotionColor(): string {
    const currentEmotion = this.emotions.get(this._current)
    return currentEmotion?.getEmotionColor() || '#9E9E9E'
  }

  getEmotionDescription(): string {
    const currentEmotion = this.emotions.get(this._current)
    return currentEmotion?.getEmotionDescription() || 'Feeling neutral'
  }

  // Get all emotion states for debugging/monitoring
  getAllEmotionStates(): Record<string, { intensity: number, state: EmotionState }> {
    const states: Record<string, { intensity: number, state: EmotionState }> = {}
    
    for (const [name, emotion] of this.emotions) {
      const state = emotion.getCurrentState()
      states[name] = {
        intensity: state.intensity,
        state
      }
    }
    
    return states
  }
}