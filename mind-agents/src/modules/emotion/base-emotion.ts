import { EmotionState, EmotionRecord } from '../../types/agent'
import { EmotionModule, PersonalityTraits, EmotionBlend } from '../../types/emotion'

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
  // Continuous emotion space coordinates (valence, arousal, dominance)
  coordinates: {
    valence: number      // -1 (negative) to 1 (positive)
    arousal: number      // -1 (calm) to 1 (excited)
    dominance: number    // -1 (submissive) to 1 (dominant)
  }
  // Personality trait influences
  personalityInfluence?: {
    openness?: number
    conscientiousness?: number
    extraversion?: number
    agreeableness?: number
    neuroticism?: number
  }
}

export abstract class BaseEmotion implements EmotionModule {
  protected _intensity: number = 0
  protected _history: EmotionRecord[] = []
  protected _lastUpdate: Date = new Date()
  protected _blendWeights: Map<string, number> = new Map()
  protected _personalityTraits?: PersonalityTraits
  protected _contextualModifiers: Map<string, number> = new Map()
  protected _emotionalInertia: number = 0.3 // Resistance to change
  
  constructor(protected config: any) {
    this._intensity = this.getDefinition().intensity
    this._personalityTraits = config.personalityTraits
    this._emotionalInertia = config.emotionalInertia ?? 0.3
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

    // Apply personality trait modulation
    if (shouldTrigger && this._personalityTraits && definition.personalityInfluence) {
      let modifier = 1.0
      
      for (const [trait, influence] of Object.entries(definition.personalityInfluence)) {
        const traitValue = (this._personalityTraits as any)[trait] ?? 0.5
        modifier *= (1 + (traitValue - 0.5) * influence)
      }
      
      triggerIntensity *= modifier
    }

    // Apply contextual modifiers
    if (context?.emotionalContext) {
      for (const [key, value] of Object.entries(context.emotionalContext)) {
        this._contextualModifiers.set(key, value as number)
      }
    }

    // If triggered, increase intensity with inertia
    if (shouldTrigger) {
      const targetIntensity = Math.min(1.0, this._intensity + triggerIntensity * 0.1)
      this._intensity = this.applyInertia(this._intensity, targetIntensity)
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
    
    // Apply personality-based decay modulation
    let decayModifier = 1.0
    if (this._personalityTraits?.neuroticism) {
      // High neuroticism = slower decay (emotions linger)
      decayModifier = 1 - (this._personalityTraits.neuroticism - 0.5) * 0.5
    }
    
    const targetIntensity = Math.max(0, this._intensity - decayRate * decayModifier)
    this._intensity = this.applyInertia(this._intensity, targetIntensity)
    this._lastUpdate = new Date()
  }

  protected applyInertia(current: number, target: number): number {
    // Apply emotional inertia - emotions don't change instantly
    return current + (target - current) * (1 - this._emotionalInertia)
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
    const baseModifiers = this.getDefinition().modifiers
    const modifiedModifiers: Record<string, number> = {}
    
    // Apply intensity scaling
    for (const [key, value] of Object.entries(baseModifiers)) {
      modifiedModifiers[key] = value * this._intensity
    }
    
    return modifiedModifiers
  }

  getEmotionColor(): string {
    return this.getDefinition().color
  }

  getEmotionDescription(): string {
    return this.getDefinition().description
  }

  // Blending support methods
  setBlendWeight(emotionName: string, weight: number): void {
    this._blendWeights.set(emotionName, Math.max(0, Math.min(1, weight)))
  }

  getBlendWeight(emotionName: string): number {
    return this._blendWeights.get(emotionName) ?? 0
  }

  getCoordinates(): { valence: number; arousal: number; dominance: number } {
    const definition = this.getDefinition()
    const coords = definition.coordinates || { valence: 0, arousal: 0, dominance: 0 }
    
    // Apply intensity to coordinates
    return {
      valence: coords.valence * this._intensity,
      arousal: coords.arousal * this._intensity,
      dominance: coords.dominance * this._intensity
    }
  }

  // Calculate distance to another emotion in continuous space
  distanceTo(other: BaseEmotion): number {
    const thisCoords = this.getCoordinates()
    const otherCoords = other.getCoordinates()
    
    return Math.sqrt(
      Math.pow(thisCoords.valence - otherCoords.valence, 2) +
      Math.pow(thisCoords.arousal - otherCoords.arousal, 2) +
      Math.pow(thisCoords.dominance - otherCoords.dominance, 2)
    )
  }

  // Blend with another emotion
  blendWith(other: BaseEmotion, weight: number = 0.5): EmotionBlend {
    const thisCoords = this.getCoordinates()
    const otherCoords = other.getCoordinates()
    
    return {
      coordinates: {
        valence: thisCoords.valence * (1 - weight) + otherCoords.valence * weight,
        arousal: thisCoords.arousal * (1 - weight) + otherCoords.arousal * weight,
        dominance: thisCoords.dominance * (1 - weight) + otherCoords.dominance * weight
      },
      intensity: this._intensity * (1 - weight) + other.intensity * weight,
      components: [
        { emotion: this.current, weight: 1 - weight },
        { emotion: other.current, weight: weight }
      ]
    }
  }

  // Set personality traits
  setPersonalityTraits(traits: PersonalityTraits): void {
    this._personalityTraits = traits
  }

  // Get emotional context for decision making
  getEmotionalContext(): Record<string, any> {
    return {
      emotion: this.current,
      intensity: this._intensity,
      coordinates: this.getCoordinates(),
      modifiers: this.getEmotionModifier(),
      contextualFactors: Object.fromEntries(this._contextualModifiers),
      personalityInfluence: this._personalityTraits
    }
  }
}