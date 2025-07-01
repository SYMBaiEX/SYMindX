/**
 * Dynamic Portal Selector
 * 
 * Intelligently selects the best portal based on context and requirements
 */

import { Agent } from '../types/agent.js'
import { Portal, PortalCapability, PortalType } from '../types/portal.js'

export interface PortalSelectionCriteria {
  capability: PortalCapability
  priority?: 'speed' | 'quality' | 'cost' | 'local'
  maxLatency?: number
  minQuality?: number
  requireLocal?: boolean
  preferredProviders?: string[]
  context?: {
    messageLength?: number
    complexity?: 'simple' | 'moderate' | 'complex'
    urgency?: 'low' | 'medium' | 'high'
    creativity?: number // 0-1
  }
}

export class DynamicPortalSelector {
  /**
   * Select the best portal based on criteria
   */
  static selectPortal(
    agent: Agent,
    criteria: PortalSelectionCriteria
  ): Portal | undefined {
    if (!agent.portals || agent.portals.length === 0) {
      return agent.portal
    }

    // Filter portals by capability
    const capablePortals = agent.portals.filter(portal => {
      if (!portal.enabled) return false
      
      // Check if portal has the required capability
      if (typeof (portal as any).hasCapability === 'function') {
        return (portal as any).hasCapability(criteria.capability)
      }
      
      // Fallback to checking capabilities array
      return (portal as any).capabilities?.includes(criteria.capability)
    })

    if (capablePortals.length === 0) {
      return agent.portal // Fallback to default
    }

    // Score portals based on criteria
    const scoredPortals = capablePortals.map(portal => ({
      portal,
      score: this.scorePortal(portal, criteria)
    }))

    // Sort by score (highest first)
    scoredPortals.sort((a, b) => b.score - a.score)

    return scoredPortals[0].portal
  }

  /**
   * Score a portal based on selection criteria
   */
  private static scorePortal(
    portal: Portal,
    criteria: PortalSelectionCriteria
  ): number {
    let score = 0
    const config = (portal as any).config || {}

    // Check if it's a preferred provider
    if (criteria.preferredProviders?.includes(portal.type)) {
      score += 50
    }

    // Priority-based scoring
    switch (criteria.priority) {
      case 'speed':
        // Groq and local models are typically faster
        if (portal.type === PortalType.CUSTOM || portal.type === PortalType.OLLAMA) {
          score += 30
        }
        // Smaller models are faster
        if (config.model?.includes('8b') || config.model?.includes('mini')) {
          score += 20
        }
        break

      case 'quality':
        // GPT-4 and Claude models are highest quality
        if (config.model?.includes('gpt-4') || config.model?.includes('claude')) {
          score += 30
        }
        // Larger models have better quality
        if (config.model?.includes('70b') || config.model?.includes('opus')) {
          score += 20
        }
        break

      case 'cost':
        // Local models are free
        if (portal.type === PortalType.OLLAMA) {
          score += 40
        }
        // Smaller models are cheaper
        if (config.model?.includes('mini') || config.model?.includes('haiku')) {
          score += 20
        }
        break

      case 'local':
        // Prefer local models
        if (portal.type === PortalType.OLLAMA) {
          score += 50
        }
        break
    }

    // Context-based scoring
    if (criteria.context) {
      const ctx = criteria.context

      // Complex queries benefit from better models
      if (ctx.complexity === 'complex') {
        if (config.model?.includes('gpt-4') || config.model?.includes('70b')) {
          score += 15
        }
      }

      // High urgency prefers fast models
      if (ctx.urgency === 'high') {
        if (portal.type === PortalType.CUSTOM || config.model?.includes('instant')) {
          score += 15
        }
      }

      // Creative tasks benefit from higher temperature models
      if (ctx.creativity && ctx.creativity > 0.7) {
        if (config.temperature && config.temperature > 0.7) {
          score += 10
        }
      }
    }

    // Bonus for primary portal (slight preference)
    if ((portal as any).primary) {
      score += 5
    }

    return score
  }

  /**
   * Create a portal selection strategy for common scenarios
   */
  static strategies = {
    fastResponse: (): PortalSelectionCriteria => ({
      capability: PortalCapability.CHAT_GENERATION,
      priority: 'speed',
      context: { urgency: 'high' }
    }),

    highQuality: (): PortalSelectionCriteria => ({
      capability: PortalCapability.CHAT_GENERATION,
      priority: 'quality',
      context: { complexity: 'complex' }
    }),

    creative: (): PortalSelectionCriteria => ({
      capability: PortalCapability.CHAT_GENERATION,
      priority: 'quality',
      context: { creativity: 0.9 }
    }),

    costEffective: (): PortalSelectionCriteria => ({
      capability: PortalCapability.CHAT_GENERATION,
      priority: 'cost'
    }),

    privateLocal: (): PortalSelectionCriteria => ({
      capability: PortalCapability.CHAT_GENERATION,
      priority: 'local',
      requireLocal: true
    })
  }
}