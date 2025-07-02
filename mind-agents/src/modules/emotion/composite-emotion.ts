import { EmotionState, EmotionRecord } from '../../types/agent.js'
import { EmotionModule, PersonalityTraits, EmotionBlend, AdvancedEmotionConfig } from '../../types/emotion.js'
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
  private config: AdvancedEmotionConfig
  
  // Continuous emotion space tracking
  private _currentCoordinates = { valence: 0, arousal: 0, dominance: 0 }
  private _blendedState: EmotionBlend | null = null
  private _personalityTraits?: PersonalityTraits
  private _enableBlending: boolean = false
  private _blendSmoothing: number = 0.3
  private _contextSensitivity: number = 0.5

  constructor(config: AdvancedEmotionConfig = {}) {
    this.config = config
    this._personalityTraits = config.personalityTraits
    this._enableBlending = config.enableBlending ?? false
    this._blendSmoothing = config.blendSmoothing ?? 0.3
    this._contextSensitivity = config.contextSensitivity ?? 0.5
    
    // Initialize all emotion modules with personality traits
    const emotionConfig = {
      ...config,
      personalityTraits: this._personalityTraits
    }
    
    this.emotions.set('happy', new HappyEmotion(emotionConfig))
    this.emotions.set('sad', new SadEmotion(emotionConfig))
    this.emotions.set('angry', new AngryEmotion(emotionConfig))
    this.emotions.set('anxious', new AnxiousEmotion(emotionConfig))
    this.emotions.set('confident', new ConfidentEmotion(emotionConfig))
    this.emotions.set('nostalgic', new NostalgicEmotion(emotionConfig))
    this.emotions.set('empathetic', new EmpatheticEmotion(emotionConfig))
    this.emotions.set('curious', new CuriousEmotion(emotionConfig))
    this.emotions.set('proud', new ProudEmotion(emotionConfig))
    this.emotions.set('confused', new ConfusedEmotion(emotionConfig))
    this.emotions.set('neutral', new NeutralEmotion(emotionConfig))
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
    const emotionResponses: Array<{ name: string, emotion: BaseEmotion, intensity: number }> = []
    
    for (const [name, emotion] of this.emotions) {
      const state = emotion.processEvent(eventType, context)
      if (state.intensity > 0.1) { // Only consider emotions with meaningful intensity
        emotionResponses.push({ name, emotion, intensity: state.intensity })
      }
    }

    if (this._enableBlending && emotionResponses.length > 1) {
      // Blend multiple emotions in continuous space
      this.blendEmotions(emotionResponses)
    } else {
      // Traditional dominant emotion approach
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
    }

    return this.getCurrentState()
  }

  private transitionToEmotion(emotion: string, intensity: number): void {
    // Only transition if it's a significant change
    const isSignificantChange = 
      emotion !== this._current || 
      Math.abs(intensity - this._intensity) > 0.2

    if (!isSignificantChange) return

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

    // Only log significant emotion changes (not neutral or minor changes)
    if (emotion !== 'neutral' && intensity > 0.3) {
      console.log(`😊 Emotion changed to ${this._current} (${(this._intensity * 100).toFixed(0)}%)`)
    }
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

  // Blend multiple emotions in continuous space
  private blendEmotions(emotionResponses: Array<{ name: string, emotion: BaseEmotion, intensity: number }>): void {
    // Calculate weighted average coordinates
    let totalWeight = 0
    let blendedCoords = { valence: 0, arousal: 0, dominance: 0 }
    const components: Array<{ emotion: string, weight: number }> = []
    
    for (const response of emotionResponses) {
      const weight = response.intensity
      const coords = response.emotion.getCoordinates()
      
      blendedCoords.valence += coords.valence * weight
      blendedCoords.arousal += coords.arousal * weight
      blendedCoords.dominance += coords.dominance * weight
      
      totalWeight += weight
      components.push({ emotion: response.name, weight })
    }
    
    // Normalize
    if (totalWeight > 0) {
      blendedCoords.valence /= totalWeight
      blendedCoords.arousal /= totalWeight
      blendedCoords.dominance /= totalWeight
    }
    
    // Apply smoothing to avoid jittery transitions
    this._currentCoordinates.valence += (blendedCoords.valence - this._currentCoordinates.valence) * this._blendSmoothing
    this._currentCoordinates.arousal += (blendedCoords.arousal - this._currentCoordinates.arousal) * this._blendSmoothing
    this._currentCoordinates.dominance += (blendedCoords.dominance - this._currentCoordinates.dominance) * this._blendSmoothing
    
    // Store blended state
    this._blendedState = {
      coordinates: this._currentCoordinates,
      intensity: totalWeight / emotionResponses.length,
      components
    }
    
    // Find closest named emotion for display
    const closestEmotion = this.findClosestNamedEmotion(this._currentCoordinates)
    this._current = closestEmotion.name
    this._intensity = this._blendedState.intensity
    
    // Log blended state
    if (components.length > 1) {
      const componentStr = components
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 3)
        .map(c => `${c.emotion}(${(c.weight * 100).toFixed(0)}%)`)
        .join(' + ')
      console.log(`🎨 Blended emotion: ${componentStr} → ${this._current}`)
    }
  }

  // Find the closest named emotion to given coordinates
  private findClosestNamedEmotion(coords: { valence: number, arousal: number, dominance: number }): { name: string, distance: number } {
    let closestEmotion = { name: 'neutral', distance: Infinity }
    
    for (const [name, emotion] of this.emotions) {
      const emotionCoords = emotion.getCoordinates()
      const distance = Math.sqrt(
        Math.pow(coords.valence - emotionCoords.valence, 2) +
        Math.pow(coords.arousal - emotionCoords.arousal, 2) +
        Math.pow(coords.dominance - emotionCoords.dominance, 2)
      )
      
      if (distance < closestEmotion.distance) {
        closestEmotion = { name, distance }
      }
    }
    
    return closestEmotion
  }

  // Get current emotion coordinates
  getEmotionCoordinates(): { valence: number, arousal: number, dominance: number } {
    return { ...this._currentCoordinates }
  }

  // Get blended state if available
  getBlendedState(): EmotionBlend | null {
    return this._blendedState
  }

  // Set personality traits
  setPersonalityTraits(traits: PersonalityTraits): void {
    this._personalityTraits = traits
    
    // Update all emotion modules
    for (const emotion of this.emotions.values()) {
      emotion.setPersonalityTraits(traits)
    }
  }

  // Enable/disable emotion blending
  setBlendingEnabled(enabled: boolean): void {
    this._enableBlending = enabled
  }

  // Get emotional context for other systems
  getEmotionalContext(): Record<string, any> {
    const currentEmotion = this.emotions.get(this._current)
    return {
      primary: this._current,
      intensity: this._intensity,
      coordinates: this._currentCoordinates,
      blendedState: this._blendedState,
      modifiers: currentEmotion?.getEmotionModifier() || {},
      personalityTraits: this._personalityTraits,
      contextSensitivity: this._contextSensitivity
    }
  }
}