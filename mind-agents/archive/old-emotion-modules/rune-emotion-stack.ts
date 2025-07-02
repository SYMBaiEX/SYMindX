import { EmotionState, EmotionRecord, EmotionConfig } from '../../types/agent.js'
import { EmotionModule } from '../../types/emotion.js'
import { Context, GenericData } from '../../types/common'

// RuneScape-inspired emotions with game-specific context
export const RUNE_EMOTIONS = {
  // Combat emotions
  focused: { intensity: 0.7, triggers: ['combat', 'training', 'grinding'], color: '#4CAF50' },
  frustrated: { intensity: 0.8, triggers: ['death', 'failure', 'rng'], color: '#F44336' },
  excited: { intensity: 0.9, triggers: ['rare_drop', 'level_up', 'achievement'], color: '#FF9800' },
  determined: { intensity: 0.6, triggers: ['goal_setting', 'challenge'], color: '#2196F3' },
  
  // Social emotions
  friendly: { intensity: 0.5, triggers: ['chat', 'helping', 'trading'], color: '#8BC34A' },
  competitive: { intensity: 0.7, triggers: ['pvp', 'racing', 'comparison'], color: '#E91E63' },
  proud: { intensity: 0.6, triggers: ['showing_off', 'achievement', 'rare_item'], color: '#9C27B0' },
  
  // Exploration emotions
  curious: { intensity: 0.4, triggers: ['new_area', 'mystery', 'quest'], color: '#00BCD4' },
  adventurous: { intensity: 0.6, triggers: ['exploring', 'risk_taking'], color: '#FF5722' },
  cautious: { intensity: 0.3, triggers: ['danger', 'wilderness', 'uncertainty'], color: '#795548' },
  
  // Economic emotions
  greedy: { intensity: 0.8, triggers: ['profit', 'expensive_item', 'opportunity'], color: '#FFC107' },
  generous: { intensity: 0.4, triggers: ['giving', 'helping_noob', 'charity'], color: '#CDDC39' },
  
  // Base emotions
  neutral: { intensity: 0.0, triggers: [], color: '#9E9E9E' },
  bored: { intensity: 0.2, triggers: ['idle', 'repetitive_task'], color: '#607D8B' },
  tired: { intensity: 0.3, triggers: ['long_session', 'grinding'], color: '#424242' },
  confused: { intensity: 0.4, triggers: ['complex_quest', 'new_mechanic'], color: '#795548' },
  
  // New human-like emotions
  anxious: { intensity: 0.6, triggers: ['uncertainty', 'pressure', 'deadline', 'unknown_outcome', 'waiting'], color: '#FF6B6B' },
  confident: { intensity: 0.7, triggers: ['success', 'mastery', 'praise', 'accomplishment', 'expertise'], color: '#4ECDC4' },
  nostalgic: { intensity: 0.5, triggers: ['memory', 'past_experience', 'familiar_place', 'old_friend', 'reflection'], color: '#95A5A6' },
  empathetic: { intensity: 0.6, triggers: ['others_pain', 'helping', 'understanding', 'connection', 'compassion'], color: '#E74C3C' }
}

export type RuneEmotion = keyof typeof RUNE_EMOTIONS

export class RuneEmotionStack implements EmotionModule {
  private config: EmotionConfig
  private emotionHistory: EmotionRecord[] = []
  private currentEmotion: RuneEmotion = 'neutral'
  private _intensity = 0.0
  private lastUpdate = new Date()

  constructor(config: EmotionConfig) {
    this.config = config
  }

  get current(): string {
    return this.currentEmotion
  }

  get intensity(): number {
    return this._intensity
  }

  processEvent(eventType: string, context: Context = {}): EmotionState {
    const triggers = this.findTriggeredEmotions(eventType, context)
    
    if (triggers.length > 0) {
      const newEmotion = this.selectDominantEmotion(triggers)
      this.transitionToEmotion(newEmotion, triggers)
    } else {
      this.decayCurrentEmotion()
    }

    return this.getCurrentState()
  }

  private findTriggeredEmotions(eventType: string, context: Context): RuneEmotion[] {
    const triggered: RuneEmotion[] = []
    
    for (const [emotion, data] of Object.entries(RUNE_EMOTIONS)) {
      if (data.triggers.some(trigger => 
        eventType.includes(trigger) || 
        Object.keys(context).some(key => key.includes(trigger))
      )) {
        triggered.push(emotion as RuneEmotion)
      }
    }

    // Special emotion logic based on context
    if (context.hp_low) triggered.push('cautious')
    if (context.rare_drop) triggered.push('excited')
    if (typeof context.death_count === 'number' && context.death_count > 3) triggered.push('frustrated')
    if (typeof context.profit === 'number' && context.profit > 1000000) triggered.push('greedy')
    if (context.helping_player) triggered.push('friendly', 'generous')
    if (context.wilderness) triggered.push('cautious', 'adventurous')
    if (context.level_up) triggered.push('excited', 'proud')
    if (context.quest_complete) triggered.push('proud', 'excited')
    if (context.pk_kill) triggered.push('competitive', 'excited')
    if (context.long_grind) triggered.push('bored', 'tired', 'determined')

    return triggered
  }

  private selectDominantEmotion(candidates: RuneEmotion[]): RuneEmotion {
    if (candidates.length === 0) return 'neutral'
    if (candidates.length === 1) return candidates[0]

    // Emotion priority system
    const priorities: Record<RuneEmotion, number> = {
      excited: 10,
      frustrated: 9,
      proud: 8,
      competitive: 7,
      greedy: 6,
      determined: 5,
      adventurous: 4,
      curious: 3,
      friendly: 3,
      cautious: 2,
      generous: 2,
      confused: 1,
      bored: 1,
      tired: 1,
      focused: 4,
      neutral: 0
    }

    // Select emotion with highest priority, with some randomness
    const weighted = candidates.map(emotion => ({
      emotion,
      weight: priorities[emotion] + Math.random() * 2
    }))

    weighted.sort((a, b) => b.weight - a.weight)
    return weighted[0].emotion
  }

  private transitionToEmotion(newEmotion: RuneEmotion, triggers: RuneEmotion[]): void {
    const emotionData = RUNE_EMOTIONS[newEmotion]
    const baseIntensity = emotionData.intensity
    
    // Adjust intensity based on sensitivity and current state
    let newIntensity = baseIntensity * this.config.sensitivity
    
    // Amplify if multiple triggers
    if (triggers.length > 1) {
      newIntensity = Math.min(1.0, newIntensity * (1 + triggers.length * 0.1))
    }
    
    // Smooth transition based on transition speed
    const transitionFactor = this.config.transitionSpeed
    this._intensity = this._intensity * (1 - transitionFactor) + newIntensity * transitionFactor
    
    // Record emotion change if significant
    if (newEmotion !== this.currentEmotion || Math.abs(this._intensity - newIntensity) > 0.1) {
      this.recordEmotionChange(newEmotion, triggers)
      this.currentEmotion = newEmotion
    }
    
    this.lastUpdate = new Date()
  }

  private decayCurrentEmotion(): void {
    const timeSinceUpdate = Date.now() - this.lastUpdate.getTime()
    const decayAmount = (timeSinceUpdate / 1000) * this.config.decayRate
    
    this._intensity = Math.max(0, this._intensity - decayAmount)
    
    // Return to neutral if intensity is very low
    if (this._intensity < 0.1 && this.currentEmotion !== 'neutral') {
      this.currentEmotion = 'neutral'
      this._intensity = 0
    }
    
    this.lastUpdate = new Date()
  }

  private recordEmotionChange(emotion: RuneEmotion, triggers: RuneEmotion[]): void {
    const record: EmotionRecord = {
      emotion,
      intensity: this.intensity,
      timestamp: new Date(),
      triggers: triggers.map(t => t.toString()),
      duration: 0 // Will be calculated when emotion changes again
    }
    
    // Update duration of previous emotion
    if (this.emotionHistory.length > 0) {
      const lastRecord = this.emotionHistory[this.emotionHistory.length - 1]
      lastRecord.duration = record.timestamp.getTime() - lastRecord.timestamp.getTime()
    }
    
    this.emotionHistory.push(record)
    
    // Keep only recent history
    if (this.emotionHistory.length > 100) {
      this.emotionHistory = this.emotionHistory.slice(-50)
    }
  }

  getCurrentState(): EmotionState {
    return {
      current: this.currentEmotion,
      intensity: this._intensity,
      triggers: RUNE_EMOTIONS[this.currentEmotion].triggers,
      history: this.emotionHistory.slice(-10),
      timestamp: new Date()
    }
  }

  /**
   * Get the current emotion
   * @returns The current emotion string
   */
  getCurrentEmotion(): string {
    return this.currentEmotion;
  }
  
  getEmotionColor(): string {
    return RUNE_EMOTIONS[this.currentEmotion].color
  }

  getEmotionModifier(): Record<string, number> {
    const modifiers: Record<RuneEmotion, Record<string, number>> = {
      focused: { accuracy: 1.1, patience: 1.2 },
      frustrated: { aggression: 1.3, patience: 0.7, risk_taking: 1.2 },
      excited: { energy: 1.4, risk_taking: 1.3, social: 1.2 },
      determined: { persistence: 1.3, focus: 1.2 },
      friendly: { social: 1.4, helpfulness: 1.3, generosity: 1.2 },
      competitive: { aggression: 1.2, risk_taking: 1.1, focus: 1.1 },
      proud: { confidence: 1.3, social: 1.1, showing_off: 1.4 },
      curious: { exploration: 1.3, learning: 1.2, risk_taking: 1.1 },
      adventurous: { exploration: 1.4, risk_taking: 1.3, energy: 1.2 },
      cautious: { risk_taking: 0.6, patience: 1.3, analysis: 1.2 },
      greedy: { profit_focus: 1.4, risk_taking: 1.2, patience: 0.8 },
      generous: { helpfulness: 1.4, social: 1.2, profit_focus: 0.7 },
      neutral: {},
      bored: { energy: 0.7, focus: 0.8, patience: 0.6 },
      tired: { energy: 0.6, accuracy: 0.8, patience: 0.7 },
      confused: { decision_speed: 0.7, confidence: 0.6, learning: 1.2 }
    }

    const baseModifiers = modifiers[this.currentEmotion] || {}
    const scaledModifiers: Record<string, number> = {}
    
    // Scale modifiers by intensity
    for (const [key, value] of Object.entries(baseModifiers)) {
      const scaledValue = 1 + (value - 1) * this._intensity
      scaledModifiers[key] = scaledValue
    }
    
    return scaledModifiers
  }

  // Get emotional context for decision making
  getEmotionalContext(): GenericData {
    return {
      emotion: this.currentEmotion,
      intensity: this.intensity,
      modifiers: this.getEmotionModifier(),
      color: this.getEmotionColor(),
      recentEmotions: this.emotionHistory.slice(-5).map(r => r.emotion),
      emotionalState: this.categorizeEmotionalState()
    }
  }

  private categorizeEmotionalState(): string {
    if (this.intensity < 0.2) return 'calm'
    if (this.intensity < 0.5) return 'mild'
    if (this.intensity < 0.8) return 'strong'
    return 'intense'
  }

  // Reset emotion system
  reset(): EmotionState {
    this.currentEmotion = 'neutral'
    this._intensity = 0
    this.emotionHistory = []
    this.lastUpdate = new Date()
    return this.getCurrentState()
  }

  // EmotionModule interface methods
  setEmotion(emotion: string, intensity: number, triggers?: string[]): EmotionState {
    if (emotion in RUNE_EMOTIONS) {
      this.currentEmotion = emotion as RuneEmotion
      this._intensity = Math.max(0, Math.min(1, intensity))
      
      // Add to history
      this.emotionHistory.push({
        emotion: this.currentEmotion,
        intensity: this._intensity,
        timestamp: new Date(),
        triggers: triggers || [],
        duration: 0
      })
      
      this.lastUpdate = new Date()
    }
    
    return this.getCurrentState()
  }
  
  getHistory(limit?: number): EmotionRecord[] {
    const history = [...this.emotionHistory].reverse()
    return limit ? history.slice(0, limit) : history
  }

  // Get emotion statistics
  getStats(): GenericData {
    const emotionCounts: Record<string, number> = {}
    let totalDuration = 0
    
    this.emotionHistory.forEach(record => {
      emotionCounts[record.emotion] = (emotionCounts[record.emotion] || 0) + 1
      totalDuration += record.duration
    })
    
    const avgIntensity = this.emotionHistory.reduce((sum, r) => sum + r.intensity, 0) / this.emotionHistory.length || 0
    
    return {
      currentEmotion: this.currentEmotion,
      currentIntensity: this._intensity,
      totalEmotionChanges: this.emotionHistory.length,
      averageIntensity: avgIntensity,
      emotionDistribution: emotionCounts,
      totalEmotionalTime: totalDuration,
      dominantEmotion: Object.entries(emotionCounts).sort(([,a], [,b]) => b - a)[0]?.[0] || 'neutral'
    }
  }
}