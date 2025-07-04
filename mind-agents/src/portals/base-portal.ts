import { convertUsage } from './utils.js'
/**
 * Base Portal Implementation
 * 
 * This class provides a foundation for all AI provider portals.
 * It implements common functionality and defines the structure that
 * specific provider implementations should follow.
 */

import { Portal, PortalConfig, TextGenerationOptions, TextGenerationResult, 
  ChatMessage, ChatGenerationOptions, ChatGenerationResult, EmbeddingOptions, EmbeddingResult,
  ImageGenerationOptions, ImageGenerationResult, PortalCapability, PortalType, PortalStatus, ModelType,
  ToolEvaluationOptions, ToolEvaluationResult } from '../types/portal.js'
import { Agent } from '../types/agent.js'

export abstract class BasePortal implements Portal {
  id: string
  name: string
  version: string
  abstract type: PortalType
  enabled: boolean = true
  status: PortalStatus = PortalStatus.INACTIVE
  config: PortalConfig
  abstract supportedModels: ModelType[]

  constructor(id: string, name: string, version: string, config: PortalConfig) {
    this.id = id
    this.name = name
    this.version = version
    this.config = {
      maxOutputTokens: 1000,
      temperature: 0.7,
      timeout: 30000,
      ...config
    }
  }

  /**
   * Resolve model configuration with hierarchy: .env → character → defaults
   * This provides a unified way for all portals to handle model selection
   */
  protected resolveModel(type: 'chat' | 'tool' | 'embedding' | 'image' = 'chat', providerPrefix?: string): string {
    const prefix = providerPrefix || this.type.toUpperCase()
    const config = this.config as any
    
    switch (type) {
      case 'chat':
        return process.env[`${prefix}_CHAT_MODEL`] || 
               config.chatModel || 
               config.model || 
               this.getDefaultModel('chat')
      
      case 'tool':
        return process.env[`${prefix}_TOOL_MODEL`] || 
               config.toolModel || 
               config.model || 
               this.getDefaultModel('tool')
      
      case 'embedding':
        return process.env[`${prefix}_EMBEDDING_MODEL`] || 
               config.embeddingModel || 
               this.getDefaultModel('embedding')
      
      case 'image':
        return process.env[`${prefix}_IMAGE_MODEL`] || 
               config.imageModel || 
               this.getDefaultModel('image')
      
      default:
        return config.model || this.getDefaultModel('chat')
    }
  }

  /**
   * Get default model for each type - should be overridden by specific portals
   */
  protected getDefaultModel(type: 'chat' | 'tool' | 'embedding' | 'image'): string {
    switch (type) {
      case 'chat': return 'gpt-4o-mini'
      case 'tool': return 'gpt-4o-mini'
      case 'embedding': return 'text-embedding-3-small'
      case 'image': return 'dall-e-3'
      default: return 'gpt-4o-mini'
    }
  }

  /**
   * Initialize the portal with an agent
   * @param agent The agent to initialize with
   */
  async init(agent: Agent): Promise<void> {
    console.log(`🔮 Initializing ${this.name} portal for agent ${agent.name}`)
    
    try {
      await this.validateConfig()
      console.log(`✅ ${this.name} portal initialized for ${agent.name}`)
    } catch (error) {
      console.error(`❌ Failed to initialize ${this.name} portal:`, error)
      throw error
    }
  }

  /**
   * Validate the portal configuration
   */
  protected async validateConfig(): Promise<void> {
    if (!this.config.apiKey) {
      throw new Error(`API key is required for ${this.name} portal`)
    }
  }

  /**
   * Generate text from a prompt
   * @param prompt The prompt to generate text from
   * @param options Options for text generation
   */
  abstract generateText(prompt: string, options?: TextGenerationOptions): Promise<TextGenerationResult>

  /**
   * Generate a chat response from messages
   * @param messages The chat messages to generate a response from
   * @param options Options for chat generation
   */
  abstract generateChat(messages: ChatMessage[], options?: ChatGenerationOptions): Promise<ChatGenerationResult>

  /**
   * Generate an embedding for text
   * @param text The text to generate an embedding for
   * @param options Options for embedding generation
   */
  abstract generateEmbedding(text: string, options?: EmbeddingOptions): Promise<EmbeddingResult>
  
  /**
   * Generate an image from a prompt
   * @param prompt The prompt to generate an image from
   * @param options Options for image generation
   */
  async generateImage(prompt: string, options?: ImageGenerationOptions): Promise<ImageGenerationResult> {
    throw new Error(`Image generation not supported by ${this.name} portal`)
  }
  
  /**
   * Stream text generation for real-time responses
   * @param prompt The prompt to generate text from
   * @param options Options for text generation
   */
  async *streamText(prompt: string, options?: TextGenerationOptions): AsyncGenerator<string> {
    throw new Error(`Text streaming not supported by ${this.name} portal`)
  }
  
  /**
   * Stream chat generation for real-time responses
   * @param messages The chat messages to generate a response from
   * @param options Options for chat generation
   */
  async *streamChat(messages: ChatMessage[], options?: ChatGenerationOptions): AsyncGenerator<string> {
    throw new Error(`Chat streaming not supported by ${this.name} portal`)
  }
  
  /**
   * Evaluate a task using the tool model (small, efficient model)
   * This is the core method for background processing and decision-making
   */
  async evaluateTask(options: ToolEvaluationOptions): Promise<ToolEvaluationResult> {
    try {
      const startTime = Date.now()
      
      // Use tool model for evaluation (small, fast, cost-effective)
      const toolModel = this.resolveModel('tool')
      
      // Build evaluation prompt
      const evaluationPrompt = this.buildEvaluationPrompt(options)
      
      // Generate evaluation using tool model
      const result = await this.generateText(evaluationPrompt, {
        model: toolModel,
        maxOutputTokens: options.timeout ? Math.min(2000, options.timeout / 10) : 1000,
        temperature: 0.1, // Lower temperature for consistent evaluations
      })

      const processingTime = Date.now() - startTime

      // Parse the evaluation result
      const evaluation = this.parseEvaluationResult(result.text, options.outputFormat)

      return {
        analysis: evaluation.analysis,
        score: evaluation.score,
        confidence: evaluation.confidence,
        reasoning: evaluation.reasoning,
        recommendations: evaluation.recommendations,
        metadata: {
          model: toolModel,
          processingTime,
          tokenUsage: result.usage,
          evaluationCriteria: options.criteria,
          outputFormat: options.outputFormat
        }
      }
    } catch (error) {
      console.error(`${this.name} task evaluation error:`, error)
      throw new Error(`${this.name} task evaluation failed: ${error}`)
    }
  }

  /**
   * Build evaluation prompt based on task and criteria
   */
  protected buildEvaluationPrompt(options: ToolEvaluationOptions): string {
    let prompt = `You are an expert evaluator analyzing the following:\\n\\n`
    prompt += `TASK: ${options.task}\\n\\n`
    
    if (options.context) {
      prompt += `CONTEXT: ${options.context}\\n\\n`
    }
    
    if (options.criteria && options.criteria.length > 0) {
      prompt += `EVALUATION CRITERIA:\\n`
      options.criteria.forEach((criterion, index) => {
        prompt += `${index + 1}. ${criterion}\\n`
      })
      prompt += '\\n'
    }
    
    prompt += `Provide a comprehensive evaluation including:\\n`
    prompt += `1. Analysis: Detailed analysis of the task\\n`
    prompt += `2. Score: Numerical score from 0-100 if applicable\\n`
    prompt += `3. Confidence: Your confidence level (0-100)\\n`
    prompt += `4. Reasoning: Step-by-step reasoning\\n`
    prompt += `5. Recommendations: Specific actionable recommendations\\n\\n`
    
    if (options.outputFormat === 'json') {
      prompt += `Format as JSON: {"analysis":"...","score":85,"confidence":90,"reasoning":"...","recommendations":["..."]}`
    } else if (options.outputFormat === 'structured') {
      prompt += `Use clear sections: **ANALYSIS:**, **SCORE:**, **CONFIDENCE:**, **REASONING:**, **RECOMMENDATIONS:**`
    }
    
    return prompt
  }

  /**
   * Parse evaluation result based on output format
   */
  protected parseEvaluationResult(text: string, format?: string): ToolEvaluationResult {
    if (format === 'json') {
      try {
        const parsed = JSON.parse(text)
        return {
          analysis: parsed.analysis || '',
          score: parsed.score,
          confidence: parsed.confidence,
          reasoning: parsed.reasoning || '',
          recommendations: parsed.recommendations || []
        }
      } catch (error) {
        // Fallback to text parsing if JSON parsing fails
        return this.parseTextEvaluation(text)
      }
    } else {
      return this.parseTextEvaluation(text)
    }
  }

  /**
   * Parse evaluation from structured or unstructured text
   */
  protected parseTextEvaluation(text: string): ToolEvaluationResult {
    const lines = text.split('\\n')
    let analysis = ''
    let score: number | undefined
    let confidence: number | undefined
    let reasoning = ''
    const recommendations: string[] = []
    
    let currentSection = ''
    
    for (const line of lines) {
      const trimmed = line.trim()
      
      // Detect sections
      if (trimmed.toLowerCase().includes('analysis:') || trimmed.startsWith('**ANALYSIS:**')) {
        currentSection = 'analysis'
        continue
      } else if (trimmed.toLowerCase().includes('score:') || trimmed.startsWith('**SCORE:**')) {
        currentSection = 'score'
        const scoreMatch = trimmed.match(/(\\d+)/)
        if (scoreMatch) score = parseInt(scoreMatch[1])
        continue
      } else if (trimmed.toLowerCase().includes('confidence:') || trimmed.startsWith('**CONFIDENCE:**')) {
        currentSection = 'confidence'
        const confMatch = trimmed.match(/(\\d+)/)
        if (confMatch) confidence = parseInt(confMatch[1])
        continue
      } else if (trimmed.toLowerCase().includes('reasoning:') || trimmed.startsWith('**REASONING:**')) {
        currentSection = 'reasoning'
        continue
      } else if (trimmed.toLowerCase().includes('recommendations:') || trimmed.startsWith('**RECOMMENDATIONS:**')) {
        currentSection = 'recommendations'
        continue
      }
      
      // Add content to current section
      if (trimmed.length > 0) {
        switch (currentSection) {
          case 'analysis':
            analysis += (analysis ? '\\n' : '') + trimmed
            break
          case 'reasoning':
            reasoning += (reasoning ? '\\n' : '') + trimmed
            break
          case 'recommendations':
            if (trimmed.startsWith('-') || trimmed.startsWith('•')) {
              recommendations.push(trimmed.substring(1).trim())
            } else if (trimmed.match(/^\\d+\\./)) {
              recommendations.push(trimmed.replace(/^\\d+\\./, '').trim())
            }
            break
        }
      }
    }
    
    // If no structured sections found, use the entire text as analysis
    if (!analysis && !reasoning) {
      analysis = text.trim()
    }
    
    return {
      analysis: analysis || text.trim(),
      score,
      confidence,
      reasoning: reasoning || 'No specific reasoning provided',
      recommendations: recommendations.length > 0 ? recommendations : undefined
    }
  }

  /**
   * Determine if a request should use tool model vs chat model
   * This is the core routing logic for dual-model architecture
   */
  protected shouldUseToolModel(request: {
    type: 'chat' | 'action' | 'evaluation' | 'function_call'
    message?: string
    hasTools?: boolean
    complexity?: 'simple' | 'moderate' | 'complex'
    userFacing?: boolean
  }): boolean {
    // Always use tool model for evaluations and background processing
    if (request.type === 'evaluation') return true
    
    // Use tool model for function calls and actions
    if (request.type === 'action' || request.type === 'function_call') return true
    
    // Use tool model if tools are involved
    if (request.hasTools) return true
    
    // Use chat model for direct user-facing conversations
    if (request.type === 'chat' && request.userFacing !== false) return false
    
    // For complex tasks, use chat model for better quality
    if (request.complexity === 'complex') return false
    
    // Default to chat model for user interactions
    return false
  }

  /**
   * Check if the portal supports a specific capability
   * @param capability The capability to check for
   */
  hasCapability(capability: PortalCapability): boolean {
    switch (capability) {
      case PortalCapability.TEXT_GENERATION:
      case PortalCapability.CHAT_GENERATION:
      case PortalCapability.EMBEDDING_GENERATION:
      case PortalCapability.EVALUATION: // Add evaluation as base capability
        return true
      case PortalCapability.IMAGE_GENERATION:
      case PortalCapability.STREAMING:
      case PortalCapability.FUNCTION_CALLING:
      case PortalCapability.VISION:
      case PortalCapability.AUDIO:
      case PortalCapability.TOOL_USAGE:
        return false
      default:
        return false
    }
  }
}