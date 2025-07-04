import { convertUsage } from '../utils.js'
/**
 * Groq Portal Implementation
 * 
 * This portal provides integration with Groq's API using the Vercel AI SDK.
 * Groq specializes in fast inference with open-source models.
 */

import { groq } from '@ai-sdk/groq'
import { generateText, streamText, CoreMessage } from 'ai'
import { BasePortal } from '../base-portal.js'
import { PortalConfig, TextGenerationOptions, TextGenerationResult, 
  ChatMessage, ChatGenerationOptions, ChatGenerationResult, EmbeddingOptions, EmbeddingResult,
  ImageGenerationOptions, ImageGenerationResult, PortalCapability, PortalType, ModelType, MessageRole, FinishReason,
  ToolEvaluationOptions, ToolEvaluationResult } from '../../types/portal.js'

export interface GroqConfig extends PortalConfig {
  model?: string
  toolModel?: string
  baseURL?: string
}

export class GroqPortal extends BasePortal {
  type: PortalType = PortalType.GROQ;
  supportedModels: ModelType[] = [ModelType.TEXT_GENERATION, ModelType.CHAT, ModelType.CODE_GENERATION];
  private groqProvider: any
  
  constructor(config: GroqConfig) {
    super('groq', 'Groq', '1.0.0', config)
    
    // Initialize the Groq provider with configuration
    this.groqProvider = groq
  }

  /**
   * Override default models for Groq
   */
  protected getDefaultModel(type: 'chat' | 'tool' | 'embedding' | 'image'): string {
    switch (type) {
      case 'chat': return 'meta-llama/llama-4-scout-17b-16e-instruct'
      case 'tool': return 'llama-3.1-8b-instant'
      case 'embedding': throw new Error('Groq does not support embeddings')
      case 'image': throw new Error('Groq does not support image generation')
      default: return 'meta-llama/llama-4-scout-17b-16e-instruct'
    }
  }

  /**
   * Generate text using Groq's completion API
   */
  async generateText(prompt: string, options?: TextGenerationOptions): Promise<TextGenerationResult> {
    try {
      const model = this.resolveModel('chat', 'GROQ')
      
      const result = await generateText({
        model: this.groqProvider(model, {
          apiKey: (this.config as GroqConfig).apiKey || process.env.GROQ_API_KEY,
          baseURL: (this.config as GroqConfig).baseURL
        }),
        prompt,
        maxOutputTokens: options?.maxTokens || this.config.maxTokens,
        temperature: options?.temperature || this.config.temperature,
        topP: options?.topP,
        frequencyPenalty: options?.frequencyPenalty,
        presencePenalty: options?.presencePenalty
      })

      return {
        text: result.text,
        usage: convertUsage(result.usage),
        finishReason: (result.finishReason as FinishReason) || FinishReason.STOP,
        metadata: {
          model,
          provider: 'groq'
        }
      }
    } catch (error) {
      console.error('Groq text generation error:', error)
      throw new Error(`Groq text generation failed: ${error}`)
    }
  }

  /**
   * Generate chat response using Groq's chat completion API
   */
  async generateChat(messages: ChatMessage[], options?: ChatGenerationOptions): Promise<ChatGenerationResult> {
    try {
      const model = this.resolveModel('chat', 'GROQ')
      
      // Convert ChatMessage[] to CoreMessage[]
      const coreMessages: CoreMessage[] = messages.map(msg => ({
        role: msg.role === 'function' ? 'assistant' : msg.role,
        content: msg.content
      }) as CoreMessage)
      
      const result = await generateText({
        model: this.groqProvider(model, {
          apiKey: (this.config as GroqConfig).apiKey || process.env.GROQ_API_KEY,
          baseURL: (this.config as GroqConfig).baseURL
        }),
        messages: coreMessages,
        maxOutputTokens: options?.maxTokens || this.config.maxTokens,
        temperature: options?.temperature || this.config.temperature,
        topP: options?.topP,
        frequencyPenalty: options?.frequencyPenalty,
        presencePenalty: options?.presencePenalty,
        tools: options?.functions ? Object.fromEntries(
          options.functions.map(fn => [
            fn.name,
            {
              description: fn.description,
              parameters: fn.parameters
            }
          ])
        ) : undefined
      })

      return {
        message: {
          role: MessageRole.ASSISTANT,
          content: result.text
        },
        text: result.text,
        usage: convertUsage(result.usage),
        finishReason: (result.finishReason as FinishReason) || FinishReason.STOP,
        metadata: {
          model,
          provider: 'groq'
        }
      }
    } catch (error) {
      console.error('Groq chat generation error:', error)
      throw new Error(`Groq chat generation failed: ${error}`)
    }
  }

  /**
   * Generate embeddings - Note: Groq doesn't provide embedding models
   * This is a placeholder that throws an error
   */
  async generateEmbedding(text: string, options?: EmbeddingOptions): Promise<EmbeddingResult> {
    throw new Error('Groq does not provide embedding models. Consider using OpenAI or another provider for embeddings.')
  }
  
  /**
   * Generate images - Note: Groq doesn't provide image generation models
   * This is a placeholder that throws an error
   */
  async generateImage(prompt: string, options?: ImageGenerationOptions): Promise<ImageGenerationResult> {
    throw new Error('Groq does not provide image generation models. Consider using OpenAI or another provider for image generation.')
  }

  /**
   * Evaluate a task using the dedicated tool model
   * This allows background processing and evaluation while keeping chat responses fast
   */
  async evaluateTask(options: ToolEvaluationOptions): Promise<ToolEvaluationResult> {
    try {
      const toolModel = this.resolveModel('tool')
      const startTime = Date.now()
      
      // Build evaluation prompt using base method
      const evaluationPrompt = super.buildEvaluationPrompt(options)
      
      const result = await generateText({
        model: this.groqProvider(toolModel, {
          apiKey: (this.config as GroqConfig).apiKey || process.env.GROQ_API_KEY,
          baseURL: (this.config as GroqConfig).baseURL
        }),
        prompt: evaluationPrompt,
        maxOutputTokens: options.timeout ? Math.min(4000, options.timeout / 10) : 2000,
        temperature: 0.1, // Lower temperature for more consistent evaluations
        topP: 0.9
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
          tokenUsage: convertUsage(result.usage),
          evaluationCriteria: options.criteria,
          outputFormat: options.outputFormat
        }
      }
    } catch (error) {
      console.error('Groq task evaluation error:', error)
      throw new Error(`Groq task evaluation failed: ${error}`)
    }
  }

  /**
   * Build evaluation prompt based on task and criteria
   * Override base implementation for Groq-specific formatting
   */
  protected buildEvaluationPrompt(options: ToolEvaluationOptions): string {
    let prompt = `You are an expert evaluator tasked with analyzing the following:\n\n`
    prompt += `TASK: ${options.task}\n\n`
    
    if (options.context) {
      prompt += `CONTEXT: ${options.context}\n\n`
    }
    
    if (options.criteria && options.criteria.length > 0) {
      prompt += `EVALUATION CRITERIA:\n`
      options.criteria.forEach((criterion, index) => {
        prompt += `${index + 1}. ${criterion}\n`
      })
      prompt += '\n'
    }
    
    prompt += `Please provide a comprehensive evaluation that includes:\n`
    prompt += `1. Analysis: Detailed analysis of the task\n`
    prompt += `2. Score: Numerical score from 0-100 if applicable\n`
    prompt += `3. Confidence: Your confidence level in this evaluation (0-100)\n`
    prompt += `4. Reasoning: Step-by-step reasoning for your evaluation\n`
    prompt += `5. Recommendations: Specific actionable recommendations\n\n`
    
    if (options.outputFormat === 'json') {
      prompt += `Format your response as valid JSON with the following structure:
{
  "analysis": "detailed analysis here",
  "score": 85,
  "confidence": 90,
  "reasoning": "step-by-step reasoning",
  "recommendations": ["recommendation 1", "recommendation 2"]
}`
    } else if (options.outputFormat === 'structured') {
      prompt += `Format your response with clear sections:
**ANALYSIS:**
[Your analysis here]

**SCORE:** [0-100]

**CONFIDENCE:** [0-100]

**REASONING:**
[Your reasoning here]

**RECOMMENDATIONS:**
- [Recommendation 1]
- [Recommendation 2]`
    } else {
      prompt += `Provide a clear, well-structured evaluation in natural language.`
    }
    
    return prompt
  }

  /**
   * Parse evaluation result based on output format
   * Override base implementation for Groq-specific parsing
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
   * Stream text generation for real-time responses
   */
  async *streamText(prompt: string, options?: TextGenerationOptions): AsyncGenerator<string> {
    try {
      const model = this.resolveModel('chat', 'GROQ')
      
      const result = streamText({
        model: this.groqProvider(model, {
          apiKey: (this.config as GroqConfig).apiKey || process.env.GROQ_API_KEY,
          baseURL: (this.config as GroqConfig).baseURL
        }),
        prompt,
        maxOutputTokens: options?.maxTokens || this.config.maxTokens,
        temperature: options?.temperature || this.config.temperature
      })

      for await (const delta of result.textStream) {
        yield delta
      }
    } catch (error) {
      console.error('Groq stream text error:', error)
      throw new Error(`Groq stream text failed: ${error}`)
    }
  }
  
  /**
   * Stream chat generation for real-time responses
   */
  async *streamChat(messages: ChatMessage[], options?: ChatGenerationOptions): AsyncGenerator<string> {
    try {
      const model = this.resolveModel('chat', 'GROQ')
      
      // Convert ChatMessage[] to CoreMessage[]
      const coreMessages: CoreMessage[] = messages.map(msg => ({
        role: msg.role === 'function' ? 'assistant' : msg.role,
        content: msg.content
      }) as CoreMessage)
      
      const result = streamText({
        model: this.groqProvider(model, {
          apiKey: (this.config as GroqConfig).apiKey || process.env.GROQ_API_KEY,
          baseURL: (this.config as GroqConfig).baseURL
        }),
        messages: coreMessages,
        maxOutputTokens: options?.maxTokens || this.config.maxTokens,
        temperature: options?.temperature || this.config.temperature,
        topP: options?.topP,
        frequencyPenalty: options?.frequencyPenalty,
        presencePenalty: options?.presencePenalty
      })

      for await (const delta of result.textStream) {
        yield delta
      }
    } catch (error) {
      console.error('Groq stream chat error:', error)
      throw new Error(`Groq stream chat failed: ${error}`)
    }
  }
  
  /**
   * Check if the portal supports a specific capability
   */
  hasCapability(capability: PortalCapability): boolean {
    switch (capability) {
      case PortalCapability.TEXT_GENERATION:
      case PortalCapability.CHAT_GENERATION:
      case PortalCapability.STREAMING:
      case PortalCapability.FUNCTION_CALLING:
      case PortalCapability.TOOL_USAGE:
      case PortalCapability.EVALUATION:
        return true;
      case PortalCapability.EMBEDDING_GENERATION:
      case PortalCapability.IMAGE_GENERATION:
      case PortalCapability.VISION:
      case PortalCapability.AUDIO:
        return false;
      default:
        return false;
    }
  }
}

// Export factory function for easy instantiation
export function createGroqPortal(config: GroqConfig): GroqPortal {
  return new GroqPortal(config)
}

// Export default configuration
export const defaultGroqConfig: Partial<GroqConfig> = {
  model: 'meta-llama/llama-4-scout-17b-16e-instruct',
  toolModel: 'llama-3.1-8b-instant',
  maxOutputTokens: 1000,
  temperature: 0.7,
  timeout: 30000
}

// Available Groq models (Updated February 2025)
export const groqModels = {
  // Llama 4 Series (Latest)
  'meta-llama/llama-4-scout-17b-16e-instruct': 'Llama 4 Scout 17B - Latest efficient chat model',
  
  // Llama 3.3 Series
  'llama-3.3-70b-versatile': 'Llama 3.3 70B Versatile - High quality flagship',
  
  // Llama 3.1 Series
  'llama-3.1-70b-versatile': 'Llama 3.1 70B Versatile',
  'llama-3.1-8b-instant': 'Llama 3.1 8B Instant - Fast tool model',
  
  // Llama Tool Use Models
  'llama-3-groq-70b-8192-tool-use-preview': 'Llama 3 Groq 70B Tool Use',
  'llama-3-groq-8b-8192-tool-use-preview': 'Llama 3 Groq 8B Tool Use',
  
  // Gemma Series
  'gemma2-9b-it': 'Gemma 2 9B IT',
  'gemma-7b-it': 'Gemma 7B IT',
  
  // Legacy Models (Still Available)
  'llama3-70b-8192': 'Llama 3 70B',
  'llama3-8b-8192': 'Llama 3 8B'
  
  // Note: Mixtral models have been deprecated as of 2024
}