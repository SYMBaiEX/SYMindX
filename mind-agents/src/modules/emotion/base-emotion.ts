import { EmotionState, EmotionRecord } from '../../types/agent.js'
import { EmotionModule } from '../../types/emotion.js'

export interface EmotionDefinition {
  name: string
  intensity: number
  triggers: string[]
  color: string
  description: string
  modifiers: {
    creativity: number
    energy: number
    social: number
    focus: number
  }
}

export abstract class BaseEmotion implements EmotionModule {
  protected _intensity: number = 0
  protected _history: EmotionRecord[] = []
  protected _lastUpdate: Date = new Date()
  
  constructor(protected config: any) {
    this._intensity = this.getDefinition().intensity
  }

  abstract getDefinition(): EmotionDefinition

  get current(): string {
    return this.getDefinition().name
  }

  get intensity(): number {
    return this._intensity
  }

  get triggers(): string[] {
    return this.getDefinition().triggers
  }

  get history(): EmotionRecord[] {
    return this._history
  }

  processEvent(eventType: string, context?: any): EmotionState {
    // Check if this event should trigger this emotion
    const definition = this.getDefinition()
    let shouldTrigger = false
    let triggerIntensity = definition.intensity

    // Check direct triggers
    for (const trigger of definition.triggers) {
      if (eventType.includes(trigger) || context?.type?.includes(trigger)) {
        shouldTrigger = true
        break
      }
    }

    // Check context
    if (context?.message) {
      const lowerMessage = context.message.toLowerCase()
      for (const trigger of definition.triggers) {
        if (lowerMessage.includes(trigger)) {
          shouldTrigger = true
          break
        }
      }
    }

    // If triggered, increase intensity
    if (shouldTrigger) {
      this._intensity = Math.min(1.0, this._intensity + 0.1)
      this.recordHistory(eventType)
    } else {
      // Decay intensity over time
      this.decay()
    }

    return this.getCurrentState()
  }

  protected decay(): void {
    const timeSinceUpdate = Date.now() - this._lastUpdate.getTime()
    const decayRate = 0.01 * (timeSinceUpdate / 60000) // Decay per minute
    this._intensity = Math.max(0, this._intensity - decayRate)
    this._lastUpdate = new Date()
  }

  protected recordHistory(trigger: string): void {
    this._history.push({
      emotion: this.current,
      intensity: this._intensity,
      timestamp: new Date(),
      duration: Date.now() - this._lastUpdate.getTime(),
      triggers: [trigger]
    })
    this._lastUpdate = new Date()
  }

  getCurrentState(): EmotionState {
    return {
      current: this.current,
      intensity: this._intensity,
      triggers: this.triggers,
      history: this._history.slice(-10),
      timestamp: new Date()
    }
  }

  getCurrentEmotion(): string {
    return this.current
  }

  setEmotion(emotion: string, intensity: number, triggers: string[] = []): EmotionState {
    // This is a specific emotion module, so we only set our own emotion
    if (emotion === this.current) {
      this._intensity = intensity
      if (triggers.length > 0) {
        this.recordHistory(triggers.join(', '))
      }
    }
    return this.getCurrentState()
  }

  getHistory(limit?: number): EmotionRecord[] {
    const history = [...this._history].reverse()
    return limit ? history.slice(0, limit) : history
  }

  reset(): EmotionState {
    this._intensity = 0
    this._history = []
    this._lastUpdate = new Date()
    return this.getCurrentState()
  }

  // Helper methods
  getEmotionModifier(): Record<string, number> {
    return this.getDefinition().modifiers
  }

  getEmotionColor(): string {
    return this.getDefinition().color
  }

  getEmotionDescription(): string {
    return this.getDefinition().description
  }
}