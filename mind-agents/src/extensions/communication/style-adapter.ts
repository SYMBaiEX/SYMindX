/**
 * Style Adapter for SYMindX
 * 
 * Adapts agent communication style based on user preferences,
 * context, and learned patterns.
 */

import { BaseConfig } from '../../types/common.js'
import { PersonalityTraits } from '../../types/emotion.js'
import { Agent } from '../../types/agent.js'
import { runtimeLogger } from '../../utils/logger.js'

/**
 * Communication style parameters
 */
export interface CommunicationStyle {
  // Formality level
  formality: number           // 0 = very casual, 1 = very formal
  
  // Verbosity
  verbosity: number          // 0 = terse, 1 = verbose
  
  // Emotional expression
  emotionality: number       // 0 = logical/factual, 1 = highly emotional
  
  // Directness
  directness: number         // 0 = indirect/subtle, 1 = very direct
  
  // Humor usage
  humor: number             // 0 = serious, 1 = humorous
  
  // Technical level
  technicality: number      // 0 = simple, 1 = technical
  
  // Empathy expression
  empathy: number           // 0 = detached, 1 = highly empathetic
  
  // Response speed preference
  responseSpeed: 'instant' | 'thoughtful' | 'deliberate'
  
  // Preferred response length
  preferredLength: 'concise' | 'moderate' | 'detailed'
  
  // Cultural adaptations
  culturalContext?: {
    greeting: string[]
    farewell: string[]
    politeness: string[]
    taboos: string[]
  }
}

/**
 * Style adaptation configuration
 */
export interface StyleAdapterConfig extends BaseConfig {
  // Learning settings
  enableLearning?: boolean          // Learn from interactions
  learningRate?: number            // How fast to adapt
  
  // Adaptation limits
  maxAdaptation?: number           // Maximum style change
  preservePersonality?: boolean    // Maintain core personality
  
  // Context sensitivity
  contextWeight?: number           // How much context affects style
  moodInfluence?: number          // How much mood affects style
  
  // Presets
  defaultStyle?: Partial<CommunicationStyle>
}

/**
 * Style Adapter implementation
 */
export class StyleAdapter {
  private userStyles: Map<string, CommunicationStyle> = new Map()
  private config: StyleAdapterConfig
  private defaultStyle: CommunicationStyle
  private learningHistory: Map<string, Array<{
    feedback: 'positive' | 'negative' | 'neutral'
    style: CommunicationStyle
    timestamp: Date
  }>> = new Map()
  private agent?: Agent
  
  constructor(config: StyleAdapterConfig = {}) {
    this.config = {
      enableLearning: true,
      learningRate: 0.1,
      maxAdaptation: 0.5,
      preservePersonality: true,
      contextWeight: 0.3,
      moodInfluence: 0.2,
      ...config
    }
    
    // Initialize default style
    this.defaultStyle = {
      formality: 0.5,
      verbosity: 0.5,
      emotionality: 0.5,
      directness: 0.5,
      humor: 0.3,
      technicality: 0.5,
      empathy: 0.6,
      responseSpeed: 'thoughtful',
      preferredLength: 'moderate',
      ...this.config.defaultStyle
    }
  }

  /**
   * Initialize with agent
   */
  async initialize(agent: Agent): Promise<void> {
    this.agent = agent
    runtimeLogger.debug('🎨 Style Adapter initialized for agent', agent.name)
  }

  /**
   * Adapt style based on context and user preferences
   */
  async adaptStyle(context: {
    mood?: string
    formality?: number
    participantStyle?: any
    topics?: string[]
    conversationPhase?: string
  }): Promise<any> {
    const adaptedStyle = { ...this.defaultStyle }

    // Apply context-based adaptations
    if (context.mood) {
      adaptedStyle.emotionality = this.adjustForMood(adaptedStyle.emotionality, context.mood)
    }

    if (context.formality !== undefined) {
      adaptedStyle.formality = context.formality
    }

    if (context.conversationPhase === 'greeting') {
      adaptedStyle.empathy += 0.1
    }

    return adaptedStyle
  }

  /**
   * Apply style to a message
   */
  async applyStyle(message: string, styleParams: {
    mood?: string
    formality?: number
    participantStyle?: any
    topics?: string[]
    conversationPhase?: string
  }): Promise<string> {
    const style = await this.adaptStyle(styleParams)
    return this.adaptMessage(message, 'default', {
      emotion: styleParams.mood,
      phase: styleParams.conversationPhase
    }, style)
  }
  
  /**
   * Get or create style for a user
   */
  getStyle(userId: string): CommunicationStyle {
    if (!this.userStyles.has(userId)) {
      this.userStyles.set(userId, { ...this.defaultStyle })
    }
    return this.userStyles.get(userId)!
  }
  
  /**
   * Adapt message based on style
   */
  adaptMessage(
    message: string,
    userId: string,
    context?: {
      emotion?: string
      mood?: string
      topic?: string
      phase?: string
    },
    overrideStyle?: CommunicationStyle
  ): string {
    const style = overrideStyle || this.getStyle(userId)
    let adapted = message
    
    // Apply formality adaptations
    adapted = this.adaptFormality(adapted, style.formality)
    
    // Apply verbosity adaptations
    adapted = this.adaptVerbosity(adapted, style.verbosity)
    
    // Apply emotional expression
    if (context?.emotion) {
      adapted = this.adaptEmotionality(adapted, style.emotionality, context.emotion)
    }
    
    // Apply directness
    adapted = this.adaptDirectness(adapted, style.directness)
    
    // Apply humor if appropriate
    if (style.humor > 0.5 && context?.mood === 'positive') {
      adapted = this.addHumor(adapted, style.humor)
    }
    
    // Apply technical level
    adapted = this.adaptTechnicality(adapted, style.technicality)
    
    // Apply empathy
    if (style.empathy > 0.5) {
      adapted = this.addEmpathy(adapted, style.empathy, context)
    }
    
    // Apply cultural context
    if (style.culturalContext) {
      adapted = this.applyCulturalContext(adapted, style.culturalContext, context?.phase)
    }
    
    return adapted
  }
  
  /**
   * Learn from user feedback
   */
  learnFromFeedback(
    userId: string,
    feedback: 'positive' | 'negative' | 'neutral',
    messageContext?: {
      originalMessage: string
      adaptedMessage: string
      style: CommunicationStyle
    }
  ): void {
    if (!this.config.enableLearning) return
    
    const currentStyle = this.getStyle(userId)
    const history = this.learningHistory.get(userId) || []
    
    // Record feedback
    history.push({
      feedback,
      style: { ...currentStyle },
      timestamp: new Date()
    })
    
    // Keep only recent history
    const recentHistory = history.filter(h => 
      Date.now() - h.timestamp.getTime() < 7 * 24 * 60 * 60 * 1000 // 7 days
    )
    this.learningHistory.set(userId, recentHistory)
    
    // Adapt style based on feedback
    if (feedback === 'positive') {
      // Reinforce current style
      this.reinforceStyle(userId, currentStyle)
    } else if (feedback === 'negative') {
      // Adjust style away from current
      this.adjustStyle(userId, currentStyle)
    }
    
    runtimeLogger.debug(`Learned from ${feedback} feedback for user ${userId}`)
  }
  
  /**
   * Analyze user message to infer preferences
   */
  analyzeUserStyle(userId: string, message: string): Partial<CommunicationStyle> {
    const inferred: Partial<CommunicationStyle> = {}
    const lower = message.toLowerCase()
    
    // Formality analysis
    if (lower.includes('please') || lower.includes('would you') || lower.includes('could you')) {
      inferred.formality = 0.7
    } else if (lower.includes('hey') || lower.includes('gonna') || lower.includes('wanna')) {
      inferred.formality = 0.3
    }
    
    // Verbosity preference
    const wordCount = message.split(/\s+/).length
    if (wordCount < 10) {
      inferred.verbosity = 0.3
      inferred.preferredLength = 'concise'
    } else if (wordCount > 50) {
      inferred.verbosity = 0.7
      inferred.preferredLength = 'detailed'
    }
    
    // Emotional expression
    const emotionalWords = ['feel', 'love', 'hate', 'excited', 'worried', 'happy', 'sad']
    const emotionalCount = emotionalWords.filter(w => lower.includes(w)).length
    if (emotionalCount > 2) {
      inferred.emotionality = 0.7
    }
    
    // Directness
    if (lower.includes('?') && wordCount < 15) {
      inferred.directness = 0.8
    }
    
    // Technical level
    const technicalWords = ['api', 'database', 'algorithm', 'function', 'parameter', 'code']
    const technicalCount = technicalWords.filter(w => lower.includes(w)).length
    if (technicalCount > 0) {
      inferred.technicality = 0.7
    }
    
    return inferred
  }
  
  /**
   * Apply personality traits to style
   */
  applyPersonalityTraits(
    style: CommunicationStyle,
    traits: PersonalityTraits
  ): CommunicationStyle {
    if (!this.config.preservePersonality) return style
    
    const adapted = { ...style }
    
    // Extraversion affects verbosity and emotionality
    adapted.verbosity = style.verbosity * (0.5 + traits.extraversion * 0.5)
    adapted.emotionality = style.emotionality * (0.5 + traits.extraversion * 0.5)
    
    // Agreeableness affects empathy and directness
    adapted.empathy = style.empathy * (0.5 + traits.agreeableness * 0.5)
    adapted.directness = style.directness * (1.5 - traits.agreeableness * 0.5)
    
    // Openness affects humor and technicality tolerance
    adapted.humor = style.humor * (0.5 + traits.openness * 0.5)
    
    // Conscientiousness affects formality
    adapted.formality = style.formality * (0.5 + traits.conscientiousness * 0.5)
    
    // Neuroticism affects emotional expression
    adapted.emotionality = adapted.emotionality * (0.7 + traits.neuroticism * 0.3)
    
    return adapted
  }

  /**
   * Adjust emotionality based on mood
   */
  private adjustForMood(baseEmotionality: number, mood: string): number {
    const moodAdjustments: Record<string, number> = {
      positive: 0.1,
      negative: -0.1,
      neutral: 0
    }

    const adjustment = moodAdjustments[mood] || 0
    return Math.max(0, Math.min(1, baseEmotionality + adjustment))
  }
  
  /**
   * Adapt formality level
   */
  private adaptFormality(message: string, formality: number): string {
    if (formality > 0.7) {
      // Make more formal
      message = message
        .replace(/\bhi\b/gi, 'Hello')
        .replace(/\bbye\b/gi, 'Goodbye')
        .replace(/\byeah\b/gi, 'Yes')
        .replace(/\bnope\b/gi, 'No')
        .replace(/\bthanks\b/gi, 'Thank you')
        .replace(/\bgonna\b/gi, 'going to')
        .replace(/\bwanna\b/gi, 'want to')
      
      // Add formal phrases
      if (!message.includes('please') && message.includes('?')) {
        message = message.replace('?', ', please?')
      }
    } else if (formality < 0.3) {
      // Make more casual
      message = message
        .replace(/\bHello\b/g, 'Hey')
        .replace(/\bYes\b/g, 'Yeah')
        .replace(/\bThank you\b/g, 'Thanks')
        .replace(/\bgoing to\b/g, 'gonna')
    }
    
    return message
  }
  
  /**
   * Adapt verbosity
   */
  private adaptVerbosity(message: string, verbosity: number): string {
    if (verbosity < 0.3) {
      // Make more concise
      message = message
        .replace(/\bIn order to\b/gi, 'To')
        .replace(/\bDue to the fact that\b/gi, 'Because')
        .replace(/\bAt this point in time\b/gi, 'Now')
      
      // Remove filler words
      const fillers = ['actually', 'basically', 'essentially', 'really']
      fillers.forEach(filler => {
        message = message.replace(new RegExp(`\\b${filler}\\b`, 'gi'), '')
      })
    } else if (verbosity > 0.7) {
      // Add elaboration
      if (message.length < 50) {
        message += " Let me know if you'd like more details."
      }
    }
    
    return message.trim()
  }
  
  /**
   * Adapt emotional expression
   */
  private adaptEmotionality(message: string, emotionality: number, emotion: string): string {
    if (emotionality > 0.7) {
      // Add emotional expressions
      const expressions: Record<string, string[]> = {
        happy: ["I'm delighted to", "It's wonderful that", "I'm so glad"],
        sad: ["I understand this is difficult", "I'm sorry to hear", "That must be hard"],
        excited: ["How exciting!", "That's fantastic!", "I'm thrilled about"],
        worried: ["I can see why you're concerned", "That is concerning", "I understand your worry"]
      }
      
      const expList = expressions[emotion] || []
      if (expList.length > 0 && !message.includes(expList[0])) {
        const exp = expList[Math.floor(Math.random() * expList.length)]
        message = `${exp} - ${message}`
      }
    } else if (emotionality < 0.3) {
      // Remove emotional language
      const emotionalPhrases = [
        "I'm delighted", "I'm sorry", "How exciting", "That's wonderful",
        "I feel", "I'm worried", "I'm concerned"
      ]
      emotionalPhrases.forEach(phrase => {
        message = message.replace(new RegExp(phrase, 'gi'), '')
      })
    }
    
    return message.trim()
  }
  
  /**
   * Adapt directness
   */
  private adaptDirectness(message: string, directness: number): string {
    if (directness < 0.3) {
      // Make more indirect
      if (message.startsWith("You should")) {
        message = message.replace("You should", "You might consider")
      }
      if (message.startsWith("Do")) {
        message = "Would you like to " + message.charAt(2).toLowerCase() + message.slice(3)
      }
    } else if (directness > 0.7) {
      // Make more direct
      message = message
        .replace(/\bperhaps\b/gi, '')
        .replace(/\bmaybe\b/gi, '')
        .replace(/\bpossibly\b/gi, '')
        .replace("You might consider", "You should")
        .replace("Would you like to", "Please")
    }
    
    return message.trim()
  }
  
  /**
   * Add humor elements
   */
  private addHumor(message: string, humorLevel: number): string {
    if (humorLevel > 0.7 && Math.random() < humorLevel) {
      // Add light humor (very context-dependent in production)
      const humorous = [
        " 😊",
        " (No pressure though!)",
        " - easy peasy!",
        " (I promise it's not as complicated as it sounds)"
      ]
      
      if (!message.includes('!') && !message.includes('?')) {
        message += humorous[Math.floor(Math.random() * humorous.length)]
      }
    }
    
    return message
  }
  
  /**
   * Adapt technical level
   */
  private adaptTechnicality(message: string, technicality: number): string {
    if (technicality < 0.3) {
      // Simplify technical terms
      message = message
        .replace(/\bAPI\b/g, 'connection')
        .replace(/\balgorithm\b/g, 'process')
        .replace(/\bparameter\b/g, 'setting')
        .replace(/\bfunction\b/g, 'feature')
    }
    
    return message
  }
  
  /**
   * Add empathetic elements
   */
  private addEmpathy(message: string, empathyLevel: number, context?: any): string {
    if (empathyLevel > 0.7 && context?.emotion) {
      const empathetic = {
        frustrated: "I understand this can be frustrating. ",
        confused: "I know this might be confusing. ",
        worried: "I can see why this would be concerning. ",
        disappointed: "I understand your disappointment. "
      }
      
      const prefix = empathetic[context.emotion as keyof typeof empathetic]
      if (prefix && !message.includes("understand")) {
        message = prefix + message
      }
    }
    
    return message
  }
  
  /**
   * Apply cultural context
   */
  private applyCulturalContext(
    message: string, 
    cultural: CommunicationStyle['culturalContext'],
    phase?: string
  ): string {
    if (!cultural) return message
    
    // Apply greetings
    if (phase === 'greeting' && cultural.greeting.length > 0) {
      const greeting = cultural.greeting[Math.floor(Math.random() * cultural.greeting.length)]
      if (!message.toLowerCase().includes(greeting.toLowerCase())) {
        message = `${greeting} ${message}`
      }
    }
    
    // Apply farewells
    if (phase === 'closing' && cultural.farewell.length > 0) {
      const farewell = cultural.farewell[Math.floor(Math.random() * cultural.farewell.length)]
      if (!message.toLowerCase().includes(farewell.toLowerCase())) {
        message = `${message} ${farewell}`
      }
    }
    
    // Avoid taboos
    cultural.taboos?.forEach(taboo => {
      if (message.toLowerCase().includes(taboo.toLowerCase())) {
        message = message.replace(new RegExp(taboo, 'gi'), '[...]')
      }
    })
    
    return message
  }
  
  /**
   * Reinforce successful style
   */
  private reinforceStyle(userId: string, style: CommunicationStyle): void {
    const current = this.getStyle(userId)
    
    // Move current style slightly towards successful style
    Object.keys(current).forEach(key => {
      if (typeof current[key as keyof CommunicationStyle] === 'number' &&
          typeof style[key as keyof CommunicationStyle] === 'number') {
        const currentVal = current[key as keyof CommunicationStyle] as number
        const targetVal = style[key as keyof CommunicationStyle] as number
        const newVal = currentVal + (targetVal - currentVal) * this.config.learningRate!
        ;(current as any)[key] = Math.max(0, Math.min(1, newVal))
      }
    })
  }
  
  /**
   * Adjust style away from unsuccessful
   */
  private adjustStyle(userId: string, style: CommunicationStyle): void {
    const current = this.getStyle(userId)
    
    // Move away from unsuccessful style
    Object.keys(current).forEach(key => {
      if (typeof current[key as keyof CommunicationStyle] === 'number') {
        const currentVal = current[key as keyof CommunicationStyle] as number
        // Add some randomness to explore new styles
        const adjustment = (Math.random() - 0.5) * this.config.learningRate! * 2
        const newVal = currentVal + adjustment
        ;(current as any)[key] = Math.max(0, Math.min(1, newVal))
      }
    })
  }
  
  /**
   * Export user styles
   */
  exportStyles(): Record<string, CommunicationStyle> {
    const exported: Record<string, CommunicationStyle> = {}
    for (const [userId, style] of this.userStyles) {
      exported[userId] = { ...style }
    }
    return exported
  }
  
  /**
   * Import user styles
   */
  importStyles(styles: Record<string, CommunicationStyle>): void {
    for (const [userId, style] of Object.entries(styles)) {
      this.userStyles.set(userId, style)
    }
  }
}

// Factory function
export function createStyleAdapter(config?: StyleAdapterConfig): StyleAdapter {
  return new StyleAdapter(config)
}