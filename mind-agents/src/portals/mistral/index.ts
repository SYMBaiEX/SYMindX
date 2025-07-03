/**
 * Mistral AI Portal
 * 
 * European-based AI provider with strong capabilities in multilingual processing,
 * code generation, and enterprise compliance features using AI SDK v5
 */

import { BasePortal } from '../base-portal.js'
import { 
  Portal, PortalConfig, PortalType, PortalStatus, ModelType, PortalCapability,
  TextGenerationOptions, TextGenerationResult, ChatMessage, ChatGenerationOptions, 
  ChatGenerationResult, EmbeddingOptions, EmbeddingResult, MessageRole, FinishReason,
  ImageGenerationOptions, ImageGenerationResult
} from '../../types/portal.js'
import { Agent } from '../../types/agent.js'
import { mistral } from '@ai-sdk/mistral'
import { 
  generateText as aiGenerateText, 
  streamText as aiStreamText, 
  embed as aiEmbed, 
  tool,
  type CoreMessage 
} from 'ai'
import { z } from 'zod'

export interface MistralConfig extends PortalConfig {
  apiKey: string
  model?: string
  safeMode?: boolean
  randomSeed?: number
  responseFormat?: { type: 'json_object' | 'text' }
  toolChoice?: 'auto' | 'none' | { type: 'function', function: { name: string } }
}

export const defaultMistralConfig: Partial<MistralConfig> = {
  model: 'mistral-large-latest',
  maxTokens: 8192,
  temperature: 0.7,
  timeout: 30000,
  baseUrl: 'https://api.mistral.ai/v1',
  safeMode: false
}

export const mistralModels = [
  'mistral-large-latest',
  'mistral-large-2407',
  'mistral-large-2402',
  'mistral-medium-latest',
  'mistral-small-latest',
  'mistral-small-2402',
  'mistral-tiny',
  'open-mistral-7b',
  'open-mixtral-8x7b',
  'open-mixtral-8x22b',
  'mistral-embed',
  'codestral-latest',
  'codestral-2405'
]

export class MistralPortal extends BasePortal {
  type = PortalType.MISTRAL
  supportedModels = [
    ModelType.TEXT_GENERATION,
    ModelType.CHAT,
    ModelType.CODE_GENERATION,
    ModelType.EMBEDDING
  ]

  private model: any
  private embedModel: any

  constructor(config: MistralConfig) {
    super('mistral-ai', 'Mistral AI', '1.0.0', config)
    const modelName = config.model || 'mistral-large-latest'
    this.model = mistral(modelName)
    // For embeddings, use mistral-embed model
    this.embedModel = mistral('mistral-embed')
  }

  async init(agent: Agent): Promise<void> {
    this.status = PortalStatus.INITIALIZING
    console.log(`🔮 Initializing Mistral AI portal for agent ${agent.name}`)
    
    try {
      await this.validateConfig()
      await this.healthCheck()
      this.status = PortalStatus.ACTIVE
      console.log(`✅ Mistral AI portal initialized for ${agent.name}`)
    } catch (error) {
      this.status = PortalStatus.ERROR
      console.error(`❌ Failed to initialize Mistral AI portal:`, error)
      throw error
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Try a simple text generation to verify the API is working
      await aiGenerateText({
        model: this.model,
        messages: [{ role: 'user', content: 'Hello' }],
        maxTokens: 10
      })
      return true
    } catch (error) {
      console.error('Mistral AI health check failed:', error)
      return false
    }
  }

  /**
   * Convert ChatMessage to CoreMessage format
   */
  private convertToCoreMessage(message: ChatMessage): CoreMessage {
    const role = message.role === MessageRole.USER ? 'user' : 
                 message.role === MessageRole.ASSISTANT ? 'assistant' : 
                 message.role === MessageRole.SYSTEM ? 'system' : 'user'
    
    return {
      role: role as any,
      content: message.content
    }
  }


  async generateText(prompt: string, options?: TextGenerationOptions): Promise<TextGenerationResult> {
    try {
      const { text, usage, finishReason } = await aiGenerateText({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        maxTokens: options?.maxTokens ?? this.config.maxTokens,
        temperature: options?.temperature ?? this.config.temperature,
        topP: options?.topP,
        frequencyPenalty: options?.frequencyPenalty,
        presencePenalty: options?.presencePenalty,
        seed: (this.config as MistralConfig).randomSeed,
        stopSequences: options?.stop
      })

      return {
        text,
        model: (this.config as MistralConfig).model || 'mistral-large-latest',
        usage: {
          promptTokens: usage?.promptTokens || 0,
          completionTokens: usage?.completionTokens || 0,
          totalTokens: usage?.totalTokens || 0
        },
        finishReason: this.mapFinishReason(finishReason),
        timestamp: new Date()
      }
    } catch (error) {
      throw new Error(`Mistral AI text generation failed: ${error}`)
    }
  }

  async generateChat(messages: ChatMessage[], options?: ChatGenerationOptions): Promise<ChatGenerationResult> {
    try {
      const coreMessages: CoreMessage[] = messages.map(msg => this.convertToCoreMessage(msg))
      
      const { text, usage, finishReason } = await aiGenerateText({
        model: this.model,
        messages: coreMessages,
        maxTokens: options?.maxTokens ?? this.config.maxTokens,
        temperature: options?.temperature ?? this.config.temperature,
        topP: options?.topP,
        frequencyPenalty: options?.frequencyPenalty,
        presencePenalty: options?.presencePenalty,
        seed: (this.config as MistralConfig).randomSeed,
        // TODO: Implement tools support for AI SDK v5
      })

      const message: ChatMessage = {
        role: MessageRole.ASSISTANT,
        content: text,
        timestamp: new Date()
      }

      return {
        text,
        model: (this.config as MistralConfig).model || 'mistral-large-latest',
        message,
        usage: {
          promptTokens: usage?.promptTokens || 0,
          completionTokens: usage?.completionTokens || 0,
          totalTokens: usage?.totalTokens || 0
        },
        finishReason: this.mapFinishReason(finishReason),
        timestamp: new Date()
      }
    } catch (error) {
      throw new Error(`Mistral AI chat generation failed: ${error}`)
    }
  }

  async generateEmbedding(text: string, options?: EmbeddingOptions): Promise<EmbeddingResult> {
    try {
      const { embedding, usage } = await aiEmbed({
        model: this.embedModel,
        value: text
      })

      return {
        embedding,
        dimensions: embedding.length,
        model: 'mistral-embed',
        usage: {
          promptTokens: usage?.tokens || 0,
          totalTokens: usage?.tokens || 0
        }
      }
    } catch (error) {
      throw new Error(`Mistral AI embedding generation failed: ${error}`)
    }
  }

  /**
   * Generate images - Note: Mistral doesn't provide image generation models
   * This is a placeholder that throws an error
   */
  async generateImage(prompt: string, options?: ImageGenerationOptions): Promise<ImageGenerationResult> {
    throw new Error('Mistral AI does not provide image generation models. Consider using OpenAI or another provider for image generation.')
  }

  async *streamText(prompt: string, options?: TextGenerationOptions): AsyncGenerator<string> {
    try {
      const { textStream } = await aiStreamText({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        maxTokens: options?.maxTokens ?? this.config.maxTokens,
        temperature: options?.temperature ?? this.config.temperature,
        topP: options?.topP,
        frequencyPenalty: options?.frequencyPenalty,
        presencePenalty: options?.presencePenalty,
        seed: (this.config as MistralConfig).randomSeed,
        stopSequences: options?.stop
      })

      for await (const chunk of textStream) {
        yield chunk
      }
    } catch (error) {
      throw new Error(`Mistral AI text streaming failed: ${error}`)
    }
  }

  async *streamChat(messages: ChatMessage[], options?: ChatGenerationOptions): AsyncGenerator<string> {
    try {
      const coreMessages: CoreMessage[] = messages.map(msg => this.convertToCoreMessage(msg))
      
      const { textStream } = await aiStreamText({
        model: this.model,
        messages: coreMessages,
        maxTokens: options?.maxTokens ?? this.config.maxTokens,
        temperature: options?.temperature ?? this.config.temperature,
        topP: options?.topP,
        frequencyPenalty: options?.frequencyPenalty,
        presencePenalty: options?.presencePenalty,
        seed: (this.config as MistralConfig).randomSeed,
        // TODO: Implement tools support for AI SDK v5
      })

      for await (const chunk of textStream) {
        yield chunk
      }
    } catch (error) {
      throw new Error(`Mistral AI chat streaming failed: ${error}`)
    }
  }

  hasCapability(capability: PortalCapability): boolean {
    switch (capability) {
      case PortalCapability.TEXT_GENERATION:
      case PortalCapability.CHAT_GENERATION:
      case PortalCapability.EMBEDDING_GENERATION:
      case PortalCapability.STREAMING:
      case PortalCapability.FUNCTION_CALLING:
        return true
      case PortalCapability.IMAGE_GENERATION:
      case PortalCapability.VISION:
      case PortalCapability.AUDIO:
        return false
      default:
        return false
    }
  }

  /**
   * Map AI SDK finish reason to our FinishReason enum
   */
  private mapFinishReason(reason?: string): FinishReason {
    switch (reason) {
      case 'stop':
        return FinishReason.STOP
      case 'length':
        return FinishReason.LENGTH
      case 'content-filter':
        return FinishReason.CONTENT_FILTER
      case 'tool-calls':
        return FinishReason.FUNCTION_CALL
      default:
        return FinishReason.STOP
    }
  }
}

export function createMistralPortal(config: MistralConfig): MistralPortal {
  return new MistralPortal({
    ...defaultMistralConfig,
    ...config
  })
}