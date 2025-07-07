/**
 * Portal Integration Helper
 * 
 * Provides utilities for integrating AI portals with cognition and interaction systems
 */

import { Agent } from '../types/agent'
import { ChatMessage, MessageRole, Portal, PortalCapability, PortalType } from '../types/portal'
import { runtimeLogger } from '../utils/logger'
import { PortalRouter } from '../portals/index'
import { MCPResponseFormatter } from './mcp-response-formatter'

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

export class PortalIntegration {
  /**
   * Generate an AI response using the agent's portal
   * @param agent The agent with portal
   * @param prompt The prompt or message to respond to
   * @param context Additional context for the AI (includes emotional and cognitive context)
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
      chatPortal = this.selectPortal(agent, criteria)
    } else {
      // Default selection
      chatPortal = (agent as any).findPortalByCapability?.('chat_generation') || agent.portal
    }
    
    if (!chatPortal || !chatPortal.generateChat) {
      runtimeLogger.warn('⚠️ No chat-capable portal available, using fallback response')
      return this.getFallbackResponse(prompt)
    }

    try {
      // Build conversation context
      const messages: ChatMessage[] = []
      
      // Add system message with agent personality and enhanced context
      if (agent.config?.core) {
        let systemContent = `You are ${agent.name}${agent.config.lore?.origin ? `, ${agent.config.lore.origin}` : ''}. 
Your personality traits: ${agent.config.core.personality?.join(', ') || 'helpful, friendly'}.`

        // Add communication style and guidelines from character config
        if (agent.characterConfig?.communication) {
          const comm = agent.characterConfig.communication
          if (comm.style) {
            systemContent += `\nCommunication style: ${comm.style}.`
          }
          if (comm.tone) {
            systemContent += `\nTone: ${comm.tone}.`
          }
          if (comm.verbosity) {
            systemContent += `\nResponse length: ${comm.verbosity}.`
          }
          
          // Add communication guidelines for natural conversation
          if (comm.guidelines && Array.isArray(comm.guidelines)) {
            systemContent += `\n\nCommunication guidelines:`
            comm.guidelines.forEach((guideline: string) => {
              systemContent += `\n- ${guideline}`
            })
          }
        }

        // Add enhanced system prompt that includes emotional and cognitive context
        if (context?.systemPrompt) {
          systemContent += `\n\n${context.systemPrompt}`
        }

        // Add cognitive insights if available
        if (context && context.cognitiveContext && context.cognitiveContext.thoughts && context.cognitiveContext.thoughts.length > 0) {
          systemContent += `\n\nYour recent cognitive analysis:`
          systemContent += `\n- Thoughts: ${context.cognitiveContext.thoughts.join(', ')}`
          
          if (context.cognitiveContext.cognitiveConfidence !== undefined) {
            systemContent += `\n- Analysis confidence: ${(context.cognitiveContext.cognitiveConfidence * 100).toFixed(0)}%`
          }
          
          systemContent += `\nIncorporate these insights naturally into your response.`
        }

        messages.push({
          role: MessageRole.SYSTEM,
          content: systemContent
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

      runtimeLogger.portal(`🤖 ${agent.name} is thinking using ${chatPortal.name}...`)
      
      // Check if agent has MCP tools available
      const hasMCPTools = agent.toolSystem && Object.keys(agent.toolSystem).length > 0
      if (hasMCPTools) {
        runtimeLogger.portal(`🔧 Including ${Object.keys(agent.toolSystem!).length} MCP tools in chat generation`)
        // Log tool details for debugging
        for (const [toolName, toolDef] of Object.entries(agent.toolSystem!)) {
          runtimeLogger.debug(`Tool: ${toolName} - ${JSON.stringify(toolDef).substring(0, 100)}...`)
        }
      }
      
      // Generate response using the portal
      const result = await chatPortal.generateChat(messages, {
        maxTokens: 2048,
        temperature: 0.4,
        functions: hasMCPTools ? agent.toolSystem : undefined
      })

      // Log conversation flow stages as per AI SDK v5 best practices
      MCPResponseFormatter.logConversationFlow('portal-response-received', {
        hasText: !!result.text,
        hasToolResults: !!(result as any).toolResults?.length,
        model: (result as any).metadata?.model || chatPortal.name
      })

      // Handle tool results if present (AI SDK v5 pattern)
      if ((result as any).toolResults && (result as any).toolResults.length > 0) {
        const toolResults = (result as any).toolResults
        
        // Format tool results naturally
        const formattedToolResults = MCPResponseFormatter.formatToolResults(
          toolResults.map((tr: any) => ({
            toolName: tr.toolName,
            args: tr.args,
            result: tr.result,
            error: tr.error,
            timestamp: new Date()
          })),
          {
            userQuery: prompt,
            agentPersonality: agent.name,
            responseStyle: 'conversational',
            previousMessages: messages
          }
        )

        // Log tool execution completion
        MCPResponseFormatter.logConversationFlow('tool-results-integrated', {
          toolCount: toolResults.length,
          formattedLength: formattedToolResults.length
        })

        // Combine AI response with formatted tool results
        const aiText = result.text || result.message?.content || ''
        
        // AI SDK v5 pattern: Let the model's response lead, augmented by tool results
        if (aiText) {
          // Model already incorporated tool results in its response
          return aiText
        } else {
          // Model didn't provide text, use formatted tool results
          return formattedToolResults
        }
      }

      // Handle regular responses (no tool results)
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
      // Log more details about the error
      if (error instanceof Error) {
        console.error('Error message:', error.message)
        console.error('Error stack:', error.stack)
      }
      // Log the portal and tools info for debugging
      console.error('Portal used:', chatPortal.name)
      console.error('Tools available:', agent.toolSystem ? Object.keys(agent.toolSystem).length : 0)
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
      return "Hey! I'm having some technical issues right now."
    } else if (lowerPrompt.includes('how are you')) {
      return "I'm here, but having some connection problems at the moment."
    } else if (lowerPrompt.includes('help')) {
      return "I'd like to help, but I'm having technical difficulties. Try again in a bit?"
    } else {
      return "Sorry, I'm having some technical issues right now. Give me a moment to sort this out."
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
      systemPrompt: "Think naturally about the situation. Express your thoughts as if talking to yourself."
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
    return this.generateResponse(agent, prompt, context, this.strategies.fastResponse())
  }

  /**
   * Generate a high-quality response using best available model
   */
  static async generateQualityResponse(
    agent: Agent,
    prompt: string,
    context?: Record<string, any>
  ): Promise<string> {
    return this.generateResponse(agent, prompt, context, this.strategies.highQuality())
  }

  /**
   * Generate a creative response with high temperature
   */
  static async generateCreativeResponse(
    agent: Agent,
    prompt: string,
    context?: Record<string, any>
  ): Promise<string> {
    return this.generateResponse(agent, prompt, context, this.strategies.creative())
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
        if (portal.type === PortalType.GROQ || portal.type === PortalType.OLLAMA || portal.type === PortalType.LMSTUDIO) {
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
        if (portal.type === PortalType.OLLAMA || portal.type === PortalType.LMSTUDIO) {
          score += 40
        }
        // Smaller models are cheaper
        if (config.model?.includes('mini') || config.model?.includes('haiku')) {
          score += 20
        }
        break

      case 'local':
        // Prefer local models
        if (portal.type === PortalType.OLLAMA || portal.type === PortalType.LMSTUDIO) {
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
        if (portal.type === PortalType.GROQ || config.model?.includes('instant')) {
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
   * Evaluate a task using the tool model (background processing)
   * This is the new dual-model architecture entry point
   */
  static async evaluateTask(
    agent: Agent,
    task: string,
    context?: string,
    criteria?: string[]
  ): Promise<{
    analysis: string
    recommendations?: string[]
    confidence?: number
    model?: string
  }> {
    try {
      const result = await PortalRouter.evaluateTask(agent, {
        task,
        context,
        criteria,
        outputFormat: 'structured'
      })

      runtimeLogger.portal(`🔧 Task evaluated using tool model: ${result.metadata?.model}`)
      
      return {
        analysis: result.analysis,
        recommendations: result.recommendations,
        confidence: result.confidence,
        model: result.metadata?.model
      }
    } catch (error) {
      console.error('❌ Task evaluation failed:', error)
      return {
        analysis: 'Unable to evaluate task at this time',
        confidence: 0
      }
    }
  }

  /**
   * Intelligent request routing based on type and complexity
   */
  static async routeRequest(
    agent: Agent,
    request: {
      type: 'chat' | 'action' | 'evaluation' | 'function_call'
      message?: string
      hasTools?: boolean
      userFacing?: boolean
    }
  ): Promise<{
    portal: Portal | undefined
    modelType: 'chat' | 'tool'
    reasoning: string
  }> {
    const decision = PortalRouter.getModelType(agent, request)
    
    runtimeLogger.portal(
      `🚦 Routing ${request.type} to ${decision.modelType} model: ${decision.reasoning}`
    )
    
    return decision
  }

  /**
   * Generate a streaming response with MCP tool support (AI SDK v5 pattern)
   * @param agent The agent with portal and MCP tools
   * @param prompt The prompt to respond to
   * @param context Additional context
   * @param onChunk Callback for streaming chunks
   * @returns Async iterator of response chunks
   */
  static async *generateStreamingResponse(
    agent: Agent,
    prompt: string,
    context?: Record<string, any>,
    onChunk?: (chunk: string) => void
  ): AsyncGenerator<string, void, unknown> {
    const chatPortal = (agent as any).findPortalByCapability?.('chat_generation') || agent.portal
    
    if (!chatPortal || !(chatPortal as any).generateChatStream) {
      // Fallback to non-streaming
      const response = await this.generateResponse(agent, prompt, context)
      yield response
      return
    }

    try {
      const messages: ChatMessage[] = []
      
      // Build messages array (same as generateResponse)
      if (agent.config?.core) {
        let systemContent = `You are ${agent.name}. `
        if (agent.characterConfig?.communication) {
          const comm = agent.characterConfig.communication
          if (comm.style) systemContent += `Communication style: ${comm.style}. `
          if (comm.tone) systemContent += `Tone: ${comm.tone}. `
        }
        
        messages.push({
          role: MessageRole.SYSTEM,
          content: systemContent
        })
      }
      
      messages.push({
        role: MessageRole.USER,
        content: prompt
      })

      // Check for MCP tools
      const hasMCPTools = agent.toolSystem && Object.keys(agent.toolSystem).length > 0
      
      // Stream the response
      const stream = await (chatPortal as any).generateChatStream(messages, {
        maxTokens: 2048,
        temperature: 0.4,
        functions: hasMCPTools ? agent.toolSystem : undefined
      })

      let buffer = ''
      const toolResults: any[] = []

      // Process the stream following AI SDK v5 patterns
      for await (const chunk of stream) {
        // Handle different chunk types
        if (chunk.type === 'text-delta') {
          buffer += chunk.text
          if (onChunk) onChunk(chunk.text)
          yield chunk.text
        } else if (chunk.type === 'tool-call') {
          // Log tool call initiation
          MCPResponseFormatter.logConversationFlow('tool-call-initiated', {
            toolName: chunk.toolName,
            args: chunk.args
          })
        } else if (chunk.type === 'tool-result') {
          // Collect tool results
          toolResults.push({
            toolName: chunk.toolName,
            args: chunk.args,
            result: chunk.result,
            error: chunk.error,
            timestamp: new Date()
          })
        }
      }

      // If we have tool results, format and yield them
      if (toolResults.length > 0) {
        const formattedResults = MCPResponseFormatter.formatToolResults(
          toolResults,
          {
            userQuery: prompt,
            agentPersonality: agent.name,
            responseStyle: 'conversational'
          }
        )
        
        // Only yield tool results if no text was generated
        if (!buffer.trim()) {
          if (onChunk) onChunk(formattedResults)
          yield formattedResults
        }
      }

    } catch (error) {
      console.error('❌ Error in streaming generation:', error)
      const fallback = this.getFallbackResponse(prompt)
      if (onChunk) onChunk(fallback)
      yield fallback
    }
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
    }),

    toolEvaluation: (): PortalSelectionCriteria => ({
      capability: PortalCapability.EVALUATION,
      priority: 'speed',
      context: { complexity: 'simple' }
    })
  }
}