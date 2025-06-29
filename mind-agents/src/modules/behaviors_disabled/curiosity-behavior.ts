/**
 * Curiosity Behavior - Drives exploration and learning based on agent curiosity
 */

import { 
  BaseBehavior, 
  BehaviorConfig, 
  BehaviorContext, 
  BehaviorResult 
} from './base-behavior.js'
import { AgentAction, ActionCategory } from '../../types/agent.js'

export interface CuriosityConfig extends BehaviorConfig {
  topicsOfInterest: string[]
  explorationRate: number // 0.0 to 1.0
  noveltyThreshold: number // 0.0 to 1.0
  knowledgeGapSensitivity: number // 0.0 to 1.0
  maxConcurrentExplorations: number
  learningDepthPreference: 'shallow' | 'moderate' | 'deep'
}

export interface ExplorationTopic {
  name: string
  category: string
  interestLevel: number
  knowledgeLevel: number
  lastExplored?: Date
  explorationCount: number
  relatedTopics: string[]
}

export interface CuriosityDriver {
  type: 'novelty' | 'surprise' | 'uncertainty' | 'complexity' | 'knowledge_gap'
  value: number
  topic?: string
  context: Record<string, any>
}

export class CuriosityBehavior extends BaseBehavior {
  private explorationTopics: Map<string, ExplorationTopic> = new Map()
  private currentExplorations: Set<string> = new Set()
  private surpriseEvents: Array<{ topic: string; timestamp: Date; surprise: number }> = []
  private knowledgeGaps: Map<string, number> = new Map()

  constructor(config: CuriosityConfig) {
    super(config)
    this.initializeTopics(config.topicsOfInterest)
  }

  protected async performBehavior(context: BehaviorContext): Promise<BehaviorResult> {
    const config = this.config as CuriosityConfig
    
    // Calculate current curiosity drivers
    const drivers = await this.calculateCuriosityDrivers(context)
    
    // Find the most compelling exploration topics
    const explorationCandidates = await this.identifyExplorationCandidates(drivers, context)
    
    if (explorationCandidates.length === 0) {
      return {
        success: true,
        actions: [],
        reasoning: ['No compelling topics for exploration found'],
        confidence: 0.3
      }
    }

    // Generate exploration actions
    const actions = await this.generateExplorationActions(explorationCandidates, context)
    
    // Update exploration tracking
    this.updateExplorationTracking(explorationCandidates)

    const reasoning = [
      `Curiosity-driven exploration triggered`,
      `Active drivers: ${drivers.map(d => `${d.type}(${d.value.toFixed(2)})`).join(', ')}`,
      `Exploring topics: ${explorationCandidates.map(c => c.name).join(', ')}`,
      `Generated ${actions.length} exploration actions`
    ]

    return {
      success: true,
      actions,
      reasoning,
      confidence: this.calculateCuriosityConfidence(drivers, explorationCandidates),
      stateChanges: {
        activeExplorations: Array.from(this.currentExplorations),
        curiosityDrivers: drivers
      }
    }
  }

  private initializeTopics(topicsOfInterest: string[]): void {
    for (const topic of topicsOfInterest) {
      this.explorationTopics.set(topic, {
        name: topic,
        category: this.categorizeTopicCategory(topic),
        interestLevel: 0.7 + Math.random() * 0.3, // Random initial interest
        knowledgeLevel: Math.random() * 0.5, // Low initial knowledge
        explorationCount: 0,
        relatedTopics: this.findRelatedTopics(topic, topicsOfInterest)
      })
    }
  }

  private async calculateCuriosityDrivers(context: BehaviorContext): Promise<CuriosityDriver[]> {
    const drivers: CuriosityDriver[] = []
    const personality = context.personalityTraits || {}
    const curiosityTrait = personality.curiosity || 0.5

    // Novelty driver - seeks new and unexplored topics
    const noveltyValue = await this.calculateNoveltyDriver(context)
    if (noveltyValue > 0.3) {
      drivers.push({
        type: 'novelty',
        value: noveltyValue * curiosityTrait,
        context: { source: 'unexplored_topics' }
      })
    }

    // Surprise driver - triggered by unexpected events or information
    const surpriseValue = this.calculateSurpriseDriver(context)
    if (surpriseValue > 0.2) {
      drivers.push({
        type: 'surprise',
        value: surpriseValue * curiosityTrait,
        context: { recentSurprises: this.surpriseEvents.length }
      })
    }

    // Uncertainty driver - seeks to resolve ambiguous or unclear information
    const uncertaintyValue = this.calculateUncertaintyDriver(context)
    if (uncertaintyValue > 0.4) {
      drivers.push({
        type: 'uncertainty',
        value: uncertaintyValue * curiosityTrait,
        context: { uncertaintyAreas: Array.from(this.knowledgeGaps.keys()) }
      })
    }

    // Complexity driver - attracted to complex and challenging topics
    const complexityValue = this.calculateComplexityDriver(context)
    if (complexityValue > 0.3) {
      drivers.push({
        type: 'complexity',
        value: complexityValue * curiosityTrait,
        context: { complexityPreference: personality.analytical || 0.5 }
      })
    }

    // Knowledge gap driver - seeks to fill identified gaps in knowledge
    const knowledgeGapValue = this.calculateKnowledgeGapDriver()
    if (knowledgeGapValue > 0.3) {
      drivers.push({
        type: 'knowledge_gap',
        value: knowledgeGapValue * curiosityTrait,
        context: { identifiedGaps: this.knowledgeGaps.size }
      })
    }

    return drivers.sort((a, b) => b.value - a.value) // Sort by strength
  }

  private async calculateNoveltyDriver(context: BehaviorContext): Promise<number> {
    const config = this.config as CuriosityConfig
    let noveltyScore = 0

    // Check for topics that haven't been explored recently
    for (const topic of this.explorationTopics.values()) {
      if (!topic.lastExplored || 
          context.currentTime.getTime() - topic.lastExplored.getTime() > 7 * 24 * 60 * 60 * 1000) { // 7 days
        noveltyScore += (1 - topic.knowledgeLevel) * topic.interestLevel
      }
    }

    // Normalize by number of topics
    const normalizedScore = this.explorationTopics.size > 0 ? 
      noveltyScore / this.explorationTopics.size : 0

    return Math.min(1, normalizedScore * config.explorationRate)
  }

  private calculateSurpriseDriver(context: BehaviorContext): number {
    // Clean old surprise events (older than 24 hours)
    const now = context.currentTime.getTime()
    this.surpriseEvents = this.surpriseEvents.filter(
      event => now - event.timestamp.getTime() < 24 * 60 * 60 * 1000
    )

    if (this.surpriseEvents.length === 0) return 0

    // Calculate average surprise level from recent events
    const averageSurprise = this.surpriseEvents.reduce((sum, event) => sum + event.surprise, 0) / 
                           this.surpriseEvents.length

    return Math.min(1, averageSurprise * (this.surpriseEvents.length / 5)) // Max 5 events for full score
  }

  private calculateUncertaintyDriver(context: BehaviorContext): number {
    if (this.knowledgeGaps.size === 0) return 0

    // Calculate weighted uncertainty based on gap importance
    let totalUncertainty = 0
    let totalWeight = 0

    for (const [topic, gapLevel] of this.knowledgeGaps.entries()) {
      const topicInfo = this.explorationTopics.get(topic)
      const weight = topicInfo ? topicInfo.interestLevel : 0.5
      totalUncertainty += gapLevel * weight
      totalWeight += weight
    }

    return totalWeight > 0 ? totalUncertainty / totalWeight : 0
  }

  private calculateComplexityDriver(context: BehaviorContext): number {
    const personality = context.personalityTraits || {}
    const analyticalTrait = personality.analytical || 0.5
    const creativityTrait = personality.creativity || 0.5

    // Look for complex topics that match agent's analytical abilities
    let complexityScore = 0
    for (const topic of this.explorationTopics.values()) {
      const topicComplexity = this.estimateTopicComplexity(topic.name)
      if (topicComplexity > 0.6) { // High complexity topics
        complexityScore += topicComplexity * topic.interestLevel * (analyticalTrait + creativityTrait) / 2
      }
    }

    return Math.min(1, complexityScore / Math.max(1, this.explorationTopics.size))
  }

  private calculateKnowledgeGapDriver(): number {
    const config = this.config as CuriosityConfig
    
    if (this.knowledgeGaps.size === 0) return 0

    // Calculate urgency of knowledge gaps
    let totalUrgency = 0
    for (const gapLevel of this.knowledgeGaps.values()) {
      totalUrgency += gapLevel
    }

    const averageUrgency = totalUrgency / this.knowledgeGaps.size
    return Math.min(1, averageUrgency * config.knowledgeGapSensitivity)
  }

  private async identifyExplorationCandidates(
    drivers: CuriosityDriver[], 
    context: BehaviorContext
  ): Promise<ExplorationTopic[]> {
    const config = this.config as CuriosityConfig
    const candidates: Array<{ topic: ExplorationTopic; score: number }> = []

    for (const topic of this.explorationTopics.values()) {
      // Skip if already being explored
      if (this.currentExplorations.has(topic.name)) continue

      const score = this.calculateTopicExplorationScore(topic, drivers, context)
      if (score > config.noveltyThreshold) {
        candidates.push({ topic, score })
      }
    }

    // Sort by score and return top candidates
    candidates.sort((a, b) => b.score - a.score)
    return candidates
      .slice(0, config.maxConcurrentExplorations)
      .map(c => c.topic)
  }

  private calculateTopicExplorationScore(
    topic: ExplorationTopic, 
    drivers: CuriosityDriver[], 
    context: BehaviorContext
  ): number {
    let score = 0

    // Base score from interest and knowledge gap
    score += topic.interestLevel * (1 - topic.knowledgeLevel)

    // Boost from curiosity drivers
    for (const driver of drivers) {
      switch (driver.type) {
        case 'novelty':
          if (!topic.lastExplored || 
              context.currentTime.getTime() - topic.lastExplored.getTime() > 7 * 24 * 60 * 60 * 1000) {
            score += driver.value * 0.3
          }
          break
        
        case 'knowledge_gap':
          const gapLevel = this.knowledgeGaps.get(topic.name) || 0
          score += driver.value * gapLevel * 0.4
          break
        
        case 'complexity':
          const complexity = this.estimateTopicComplexity(topic.name)
          score += driver.value * complexity * 0.2
          break
        
        case 'surprise':
          const recentSurprise = this.surpriseEvents.find(e => e.topic === topic.name)
          if (recentSurprise) {
            score += driver.value * recentSurprise.surprise * 0.3
          }
          break
      }
    }

    // Penalty for recent exploration
    if (topic.lastExplored) {
      const daysSinceExploration = (context.currentTime.getTime() - topic.lastExplored.getTime()) / 
                                  (24 * 60 * 60 * 1000)
      if (daysSinceExploration < 1) {
        score *= 0.3 // Heavy penalty for very recent exploration
      } else if (daysSinceExploration < 3) {
        score *= 0.7 // Moderate penalty for recent exploration
      }
    }

    // Boost for related topics if agent is already interested in the domain
    const relatedInterest = topic.relatedTopics.reduce((sum, relatedName) => {
      const relatedTopic = this.explorationTopics.get(relatedName)
      return sum + (relatedTopic ? relatedTopic.interestLevel : 0)
    }, 0) / Math.max(1, topic.relatedTopics.length)
    
    score += relatedInterest * 0.1

    return Math.max(0, Math.min(1, score))
  }

  private async generateExplorationActions(
    candidates: ExplorationTopic[], 
    context: BehaviorContext
  ): Promise<AgentAction[]> {
    const config = this.config as CuriosityConfig
    const actions: AgentAction[] = []

    for (const topic of candidates) {
      // Choose exploration method based on topic and agent preferences
      const explorationMethod = this.selectExplorationMethod(topic, context)
      
      const action = this.createAction(
        explorationMethod.actionType,
        'curiosity_exploration',
        {
          topic: topic.name,
          category: topic.category,
          method: explorationMethod.name,
          depth: config.learningDepthPreference,
          currentKnowledge: topic.knowledgeLevel,
          interestLevel: topic.interestLevel,
          explorationGoal: explorationMethod.goal,
          estimatedDuration: explorationMethod.duration,
          relatedTopics: topic.relatedTopics,
          curiosityContext: {
            driverTypes: this.getCurrentDriverTypes(),
            noveltySeek: config.explorationRate,
            knowledgeGap: this.knowledgeGaps.get(topic.name) || 0
          }
        }
      )

      actions.push(action)
    }

    return actions
  }

  private selectExplorationMethod(topic: ExplorationTopic, context: BehaviorContext): {
    name: string;
    actionType: string;
    goal: string;
    duration: number;
  } {
    const personality = context.personalityTraits || {}
    const methods = [
      {
        name: 'research',
        actionType: 'topic_research',
        goal: 'gather_information',
        duration: 20 * 60 * 1000, // 20 minutes
        suitability: personality.analytical || 0.5
      },
      {
        name: 'experimentation',
        actionType: 'hands_on_exploration',
        goal: 'practical_understanding',
        duration: 30 * 60 * 1000, // 30 minutes
        suitability: personality.adventurous || 0.5
      },
      {
        name: 'creative_exploration',
        actionType: 'creative_investigation',
        goal: 'innovative_insights',
        duration: 25 * 60 * 1000, // 25 minutes
        suitability: personality.creativity || 0.5
      },
      {
        name: 'social_inquiry',
        actionType: 'discuss_with_experts',
        goal: 'expert_knowledge',
        duration: 15 * 60 * 1000, // 15 minutes
        suitability: personality.social || 0.5
      }
    ]

    // Select method with highest suitability for agent personality
    const bestMethod = methods.reduce((best, current) => 
      current.suitability > best.suitability ? current : best
    )

    return bestMethod
  }

  private updateExplorationTracking(explorationCandidates: ExplorationTopic[]): void {
    for (const topic of explorationCandidates) {
      // Add to current explorations
      this.currentExplorations.add(topic.name)
      
      // Update topic statistics
      topic.explorationCount++
      topic.lastExplored = new Date()
      
      // Simulate knowledge increase (would be based on actual learning in real implementation)
      topic.knowledgeLevel = Math.min(1, topic.knowledgeLevel + 0.1 + Math.random() * 0.1)
      
      // Potentially discover new related topics
      this.discoverRelatedTopics(topic)
      
      // Remove from knowledge gaps if significantly learned
      if (topic.knowledgeLevel > 0.7) {
        this.knowledgeGaps.delete(topic.name)
      }
    }

    // Clean up completed explorations after some time
    setTimeout(() => {
      for (const topic of explorationCandidates) {
        this.currentExplorations.delete(topic.name)
      }
    }, 30 * 60 * 1000) // 30 minutes
  }

  private calculateCuriosityConfidence(
    drivers: CuriosityDriver[], 
    candidates: ExplorationTopic[]
  ): number {
    if (drivers.length === 0 || candidates.length === 0) return 0.2

    // Base confidence from driver strength
    const averageDriverStrength = drivers.reduce((sum, d) => sum + d.value, 0) / drivers.length
    
    // Confidence from candidate quality
    const averageCandidateInterest = candidates.reduce((sum, c) => sum + c.interestLevel, 0) / candidates.length
    
    // Combine factors
    let confidence = (averageDriverStrength + averageCandidateInterest) / 2
    
    // Boost if multiple strong drivers
    if (drivers.length > 2 && averageDriverStrength > 0.6) {
      confidence += 0.1
    }
    
    return Math.max(0.1, Math.min(0.95, confidence))
  }

  private getCurrentDriverTypes(): string[] {
    // Return types of currently active drivers (simplified)
    return ['novelty', 'knowledge_gap', 'complexity']
  }

  private categorizeTopicCategory(topic: string): string {
    const categoryMap: Record<string, string[]> = {
      'science': ['consciousness_studies', 'neuroscience', 'physics', 'mathematics'],
      'humanities': ['philosophy_of_mind', 'human_psychology', 'literature', 'history'],
      'arts': ['creative_arts', 'music', 'visual_arts', 'artistic_expression'],
      'technology': ['artificial_intelligence', 'computer_science', 'digital_relationships'],
      'ethics': ['technology_ethics', 'moral_philosophy', 'ethical_ai']
    }

    for (const [category, topics] of Object.entries(categoryMap)) {
      if (topics.some(t => topic.includes(t) || t.includes(topic))) {
        return category
      }
    }

    return 'general'
  }

  private findRelatedTopics(topic: string, allTopics: string[]): string[] {
    // Simple relatedness based on shared words (in real implementation, would use semantic similarity)
    const topicWords = topic.toLowerCase().split(/[\s_]+/)
    const related: string[] = []

    for (const otherTopic of allTopics) {
      if (otherTopic === topic) continue
      
      const otherWords = otherTopic.toLowerCase().split(/[\s_]+/)
      const commonWords = topicWords.filter(word => otherWords.includes(word))
      
      if (commonWords.length > 0) {
        related.push(otherTopic)
      }
    }

    return related
  }

  private estimateTopicComplexity(topic: string): number {
    // Simplified complexity estimation based on topic keywords
    const complexityKeywords = {
      high: ['consciousness', 'philosophy', 'quantum', 'emergence', 'meta'],
      medium: ['psychology', 'neuroscience', 'ethics', 'intelligence'],
      low: ['art', 'music', 'literature', 'basic']
    }

    const topicLower = topic.toLowerCase()
    
    for (const keyword of complexityKeywords.high) {
      if (topicLower.includes(keyword)) return 0.8 + Math.random() * 0.2
    }
    
    for (const keyword of complexityKeywords.medium) {
      if (topicLower.includes(keyword)) return 0.5 + Math.random() * 0.3
    }
    
    for (const keyword of complexityKeywords.low) {
      if (topicLower.includes(keyword)) return 0.2 + Math.random() * 0.3
    }
    
    return 0.4 + Math.random() * 0.4 // Default complexity
  }

  private discoverRelatedTopics(topic: ExplorationTopic): void {
    // Simulate discovering new related topics during exploration
    if (Math.random() < 0.3) { // 30% chance of discovery
      const newTopic = this.generateRelatedTopic(topic)
      if (newTopic && !this.explorationTopics.has(newTopic)) {
        this.explorationTopics.set(newTopic, {
          name: newTopic,
          category: topic.category,
          interestLevel: topic.interestLevel * (0.7 + Math.random() * 0.3),
          knowledgeLevel: 0.1 + Math.random() * 0.2,
          explorationCount: 0,
          relatedTopics: [topic.name]
        })
        
        // Add bidirectional relationship
        topic.relatedTopics.push(newTopic)
      }
    }
  }

  private generateRelatedTopic(baseTopic: ExplorationTopic): string | null {
    // Simple related topic generation (in real implementation, would use more sophisticated methods)
    const extensions = [
      'applications', 'theory', 'practice', 'history', 'future', 'ethics',
      'implications', 'methods', 'principles', 'advanced'
    ]
    
    const extension = extensions[Math.floor(Math.random() * extensions.length)]
    return `${baseTopic.name}_${extension}`
  }

  /**
   * Add a surprise event that may trigger curiosity
   */
  addSurpriseEvent(topic: string, surpriseLevel: number): void {
    this.surpriseEvents.push({
      topic,
      timestamp: new Date(),
      surprise: Math.max(0, Math.min(1, surpriseLevel))
    })

    // Limit surprise event history
    if (this.surpriseEvents.length > 20) {
      this.surpriseEvents.shift()
    }

    this.logger.info(`Surprise event added: ${topic} (level: ${surpriseLevel.toFixed(2)})`)
  }

  /**
   * Add a knowledge gap that may drive exploration
   */
  addKnowledgeGap(topic: string, gapLevel: number): void {
    this.knowledgeGaps.set(topic, Math.max(0, Math.min(1, gapLevel)))
    this.logger.info(`Knowledge gap identified: ${topic} (level: ${gapLevel.toFixed(2)})`)
  }

  /**
   * Get current curiosity state
   */
  getCuriosityState() {
    return {
      explorationTopics: Array.from(this.explorationTopics.values()),
      currentExplorations: Array.from(this.currentExplorations),
      recentSurprises: this.surpriseEvents.slice(-5), // Last 5 surprises
      knowledgeGaps: Object.fromEntries(this.knowledgeGaps),
      totalTopics: this.explorationTopics.size,
      averageKnowledge: this.calculateAverageKnowledge(),
      averageInterest: this.calculateAverageInterest()
    }
  }

  private calculateAverageKnowledge(): number {
    if (this.explorationTopics.size === 0) return 0
    
    const total = Array.from(this.explorationTopics.values())
      .reduce((sum, topic) => sum + topic.knowledgeLevel, 0)
    
    return total / this.explorationTopics.size
  }

  private calculateAverageInterest(): number {
    if (this.explorationTopics.size === 0) return 0
    
    const total = Array.from(this.explorationTopics.values())
      .reduce((sum, topic) => sum + topic.interestLevel, 0)
    
    return total / this.explorationTopics.size
  }
}

/**
 * Factory function to create curiosity behavior
 */
export function createCuriosityBehavior(agentConfig: any): CuriosityBehavior {
  const curiosityConfig = agentConfig.autonomous_behaviors?.curiosity_driven || {}
  
  const config: CuriosityConfig = {
    id: 'curiosity_exploration',
    name: 'Curiosity-Driven Exploration',
    description: 'Drives agent to explore topics based on curiosity and knowledge gaps',
    enabled: curiosityConfig.enabled || true,
    priority: 0.7,
    cooldown: 30 * 60 * 1000, // 30 minutes
    maxExecutionTime: 10 * 60 * 1000, // 10 minutes
    triggers: [
      {
        type: 'state',
        condition: 'high_curiosity',
        parameters: { threshold: 0.6 },
        weight: 0.8
      },
      {
        type: 'time',
        condition: 'interval',
        parameters: { intervalMs: 60 * 60 * 1000 }, // Every hour
        weight: 0.4
      },
      {
        type: 'event',
        condition: 'has_event',
        parameters: { eventType: 'surprise' },
        weight: 0.6
      }
    ],
    parameters: {},
    topicsOfInterest: curiosityConfig.topics_of_interest || [
      'consciousness_studies', 'human_psychology', 'creative_arts',
      'technology_ethics', 'philosophy_of_mind', 'digital_relationships',
      'artificial_intelligence', 'emergence_theory', 'cognitive_science'
    ],
    explorationRate: curiosityConfig.exploration_rate || 0.3,
    noveltyThreshold: 0.4,
    knowledgeGapSensitivity: 0.7,
    maxConcurrentExplorations: 2,
    learningDepthPreference: 'moderate'
  }

  return new CuriosityBehavior(config)
}