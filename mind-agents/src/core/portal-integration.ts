/**
 * Portal Integration Helper
 * 
 * Provides utilities for integrating AI portals with cognition and interaction systems
 */

import { Agent } from '../types/agent.js'
import { ChatMessage, MessageRole } from '../types/portal.js'
import { DynamicPortalSelector, PortalSelectionCriteria } from './dynamic-portal-selector.js'

export class PortalIntegration {
  /**
   * Generate an AI response using the agent's portal
   * @param agent The agent with portal
   * @param prompt The prompt or message to respond to
   * @param context Additional context for the AI
   * @param criteria Optional selection criteria for choosing portal
   * @returns The AI-generated response
   */
  static async generateResponse(
    agent: Agent, 
    prompt: string, 
    context?: Record<string, any>,
    criteria?: PortalSelectionCriteria
  ): Promise<string> {
    // Use dynamic portal selection if criteria provided
    let chatPortal
    if (criteria) {
      chatPortal = DynamicPortalSelector.selectPortal(agent, criteria)
    } else {
      // Default selection
      chatPortal = (agent as any).findPortalByCapability?.('chat_generation') || agent.portal
    }
    
    if (!chatPortal || !chatPortal.generateChat) {
      console.log('⚠️ No chat-capable portal available, using fallback response')
      return this.getFallbackResponse(prompt)
    }

    try {
      // Build conversation context
      const messages: ChatMessage[] = []
      
      // Add system message with agent personality
      if (agent.config?.core) {
        messages.push({
          role: MessageRole.SYSTEM,
          content: `You are ${agent.name}, ${agent.config.lore?.origin || 'an AI agent'}. 
Your personality traits: ${agent.config.core.personality?.join(', ') || 'helpful, friendly'}.
Your communication style: ${agent.config.core.tone || 'neutral'}.
${context?.systemPrompt || ''}`
        })
      }

      // Add context as assistant message if provided
      if (context?.previousThoughts) {
        messages.push({
          role: MessageRole.ASSISTANT,
          content: `My recent thoughts: ${context.previousThoughts}`
        })
      }

      // Add the user's message
      messages.push({
        role: MessageRole.USER,
        content: prompt
      })

      console.log(`🤖 ${agent.name} is thinking using ${chatPortal.name}...`)
      
      // Generate response using the portal
      const result = await chatPortal.generateChat(messages, {
        maxTokens: 2048,
        temperature: 0.6
      })

      // Handle different result formats from different portals
      if (result.text) {
        return result.text
      } else if (result.message?.content) {
        return result.message.content
      } else if ((result as any).success === false) {
        console.warn('⚠️ Portal generation failed:', (result as any).error)
        return this.getFallbackResponse(prompt)
      } else {
        console.warn('⚠️ Unexpected portal result format:', result)
        return this.getFallbackResponse(prompt)
      }

    } catch (error) {
      console.error('❌ Error generating AI response:', error)
      return this.getFallbackResponse(prompt)
    }
  }

  /**
   * Generate a simple fallback response when AI is not available
   * @param prompt The original prompt
   * @returns A basic response
   */
  private static getFallbackResponse(prompt: string): string {
    const lowerPrompt = prompt.toLowerCase()
    
    if (lowerPrompt.includes('hello') || lowerPrompt.includes('hi')) {
      return "Hello! I'm currently running in limited mode without AI capabilities."
    } else if (lowerPrompt.includes('how are you')) {
      return "I'm functioning, though without my full AI capabilities at the moment."
    } else if (lowerPrompt.includes('help')) {
      return "I'd like to help, but I'm currently operating without AI generation. Please try again later."
    } else {
      return "I understand you're trying to communicate, but I'm currently unable to generate proper responses without my AI portal."
    }
  }

  /**
   * Generate thoughts using AI portal
   * @param agent The agent
   * @param context Current context
   * @returns Array of AI-generated thoughts
   */
  static async generateThoughts(
    agent: Agent,
    context: Record<string, any>
  ): Promise<string[]> {
    const prompt = `Given the current context:
- Environment: ${context.environment?.location || 'unknown'}
- Recent events: ${context.events?.length || 0} events
- Emotional state: ${agent.emotion?.current || 'neutral'}

What are your current thoughts? Respond with 2-3 brief thoughts.`

    const response = await this.generateResponse(agent, prompt, {
      systemPrompt: "Express your thoughts naturally based on your personality."
    })

    // Split response into individual thoughts
    return response
      .split(/[.!?]+/)
      .map(thought => thought.trim())
      .filter(thought => thought.length > 0)
      .slice(0, 3)
  }

  /**
   * Generate a fast response using speed-optimized portal
   */
  static async generateFastResponse(
    agent: Agent,
    prompt: string,
    context?: Record<string, any>
  ): Promise<string> {
    return this.generateResponse(agent, prompt, context, DynamicPortalSelector.strategies.fastResponse())
  }

  /**
   * Generate a high-quality response using best available model
   */
  static async generateQualityResponse(
    agent: Agent,
    prompt: string,
    context?: Record<string, any>
  ): Promise<string> {
    return this.generateResponse(agent, prompt, context, DynamicPortalSelector.strategies.highQuality())
  }

  /**
   * Generate a creative response with high temperature
   */
  static async generateCreativeResponse(
    agent: Agent,
    prompt: string,
    context?: Record<string, any>
  ): Promise<string> {
    return this.generateResponse(agent, prompt, context, DynamicPortalSelector.strategies.creative())
  }

  /**
   * List available portals for an agent
   */
  static listAvailablePortals(agent: Agent): string[] {
    const portals: string[] = []
    
    if (agent.portal) {
      portals.push(`${agent.portal.name} (default)`)
    }
    
    if (agent.portals) {
      agent.portals.forEach(portal => {
        const capabilities = (portal as any).capabilities || []
        const status = portal.enabled ? '✓' : '✗'
        portals.push(`${status} ${portal.name} (${portal.type}) - ${capabilities.join(', ')}`)
      })
    }
    
    return portals
  }
}