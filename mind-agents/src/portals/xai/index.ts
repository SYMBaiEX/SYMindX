import { convertUsage } from '../utils.js'
/**
 * XAI Portal Implementation
 * 
 * This portal provides integration with XAI's Grok API using AI SDK v5.
 */

import { BasePortal } from '../base-portal.js'
import { PortalConfig, TextGenerationOptions, TextGenerationResult, 
  ChatMessage, ChatGenerationOptions, ChatGenerationResult, EmbeddingOptions, EmbeddingResult,
  ImageGenerationOptions, ImageGenerationResult, PortalCapability, MessageRole, FinishReason, PortalType, ModelType } from '../../types/portal.js'
import { xai } from '@ai-sdk/xai'
import { generateText as aiGenerateText, streamText as aiStreamText, tool, type CoreMessage } from 'ai'
import { z } from 'zod'

export interface XAIConfig extends PortalConfig {
  model?: string
  baseURL?: string
}

export class XAIPortal extends BasePortal {
  type: PortalType = PortalType.XAI;
  supportedModels: ModelType[] = [ModelType.TEXT_GENERATION, ModelType.CHAT, ModelType.CODE_GENERATION];
  private model: any
  
  constructor(config: XAIConfig) {
    super('xai', 'XAI', '1.0.0', config)
    const modelName = config.model || 'grok-2'
    this.model = xai(modelName)
  }

  /**
   * Convert ChatMessage to CoreMessage format
   */
  private convertToCoreMessage(message: ChatMessage): CoreMessage {
    return {
      role: message.role === MessageRole.USER ? 'user' : 
            message.role === MessageRole.ASSISTANT ? 'assistant' : 
            'system',
      content: message.content
    }
  }


  /**
   * Generate text using XAI's completion API
   */
  async generateText(prompt: string, options?: TextGenerationOptions): Promise<TextGenerationResult> {
    try {
      const { text, usage, finishReason } = await aiGenerateText({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        maxOutputTokens: options?.maxTokens || this.config.maxTokens,
        temperature: options?.temperature || this.config.temperature,
        topP: options?.topP,
        frequencyPenalty: options?.frequencyPenalty,
        presencePenalty: options?.presencePenalty,
        stopSequences: options?.stop
      })

      return {
        text,
        usage: convertUsage(usage),
        finishReason: this.mapFinishReason(finishReason),
        metadata: {
          model: (this.config as XAIConfig).model || 'grok-2',
          provider: 'xai'
        }
      }
    } catch (error) {
      console.error('XAI text generation error:', error)
      throw new Error(`XAI text generation failed: ${error}`)
    }
  }

  /**
   * Generate chat response using XAI's chat completion API
   */
  async generateChat(messages: ChatMessage[], options?: ChatGenerationOptions): Promise<ChatGenerationResult> {
    try {
      const coreMessages: CoreMessage[] = messages.map(msg => this.convertToCoreMessage(msg))
      
      const { text, usage, finishReason } = await aiGenerateText({
        model: this.model,
        messages: coreMessages,
        maxOutputTokens: options?.maxTokens || this.config.maxTokens,
        temperature: options?.temperature || this.config.temperature,
        topP: options?.topP,
        frequencyPenalty: options?.frequencyPenalty,
        presencePenalty: options?.presencePenalty,
        // TODO: Implement tools support for AI SDK v5
      })

      return {
        text,
        message: {
          role: MessageRole.ASSISTANT,
          content: text
        },
        usage: convertUsage(usage),
        finishReason: this.mapFinishReason(finishReason),
        metadata: {
          model: (this.config as XAIConfig).model || 'grok-2',
          provider: 'xai'
        }
      }
    } catch (error) {
      console.error('XAI chat generation error:', error)
      throw new Error(`XAI chat generation failed: ${error}`)
    }
  }

  /**
   * Generate embeddings - Note: XAI doesn't provide embedding models
   * This is a placeholder that throws an error
   */
  async generateEmbedding(text: string, options?: EmbeddingOptions): Promise<EmbeddingResult> {
    throw new Error('XAI does not provide embedding models. Consider using OpenAI or another provider for embeddings.')
  }
  
  /**
   * Generate images - Note: XAI doesn't provide image generation models
   * This is a placeholder that throws an error
   */
  async generateImage(prompt: string, options?: ImageGenerationOptions): Promise<ImageGenerationResult> {
    throw new Error('XAI does not provide image generation models. Consider using OpenAI or another provider for image generation.')
  }

  /**
   * Stream text generation for real-time responses
   */
  async *streamText(prompt: string, options?: TextGenerationOptions): AsyncGenerator<string> {
    try {
      const { textStream } = await aiStreamText({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        maxOutputTokens: options?.maxTokens || this.config.maxTokens,
        temperature: options?.temperature || this.config.temperature,
        topP: options?.topP,
        frequencyPenalty: options?.frequencyPenalty,
        presencePenalty: options?.presencePenalty,
        stopSequences: options?.stop
      })

      for await (const chunk of textStream) {
        yield chunk
      }
    } catch (error) {
      console.error('XAI stream text error:', error)
      throw new Error(`XAI stream text failed: ${error}`)
    }
  }
  
  /**
   * Stream chat generation for real-time responses
   */
  async *streamChat(messages: ChatMessage[], options?: ChatGenerationOptions): AsyncGenerator<string> {
    try {
      const coreMessages: CoreMessage[] = messages.map(msg => this.convertToCoreMessage(msg))
      
      const { textStream } = await aiStreamText({
        model: this.model,
        messages: coreMessages,
        maxOutputTokens: options?.maxTokens || this.config.maxTokens,
        temperature: options?.temperature || this.config.temperature,
        topP: options?.topP,
        frequencyPenalty: options?.frequencyPenalty,
        presencePenalty: options?.presencePenalty,
        // TODO: Implement tools support for AI SDK v5
      })

      for await (const chunk of textStream) {
        yield chunk
      }
    } catch (error) {
      console.error('XAI stream chat error:', error)
      throw new Error(`XAI stream chat failed: ${error}`)
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
  
  /**
   * Check if the portal supports a specific capability
   */
  hasCapability(capability: PortalCapability): boolean {
    switch (capability) {
      case PortalCapability.TEXT_GENERATION:
      case PortalCapability.CHAT_GENERATION:
      case PortalCapability.STREAMING:
      case PortalCapability.FUNCTION_CALLING:
      case PortalCapability.VISION:
        return true;
      case PortalCapability.EMBEDDING_GENERATION:
      case PortalCapability.IMAGE_GENERATION:
      case PortalCapability.AUDIO:
        return false;
      default:
        return false;
    }
  }
}

// Export factory function for easy instantiation
export function createXAIPortal(config: XAIConfig): XAIPortal {
  return new XAIPortal(config)
}

// Export default configuration
export const defaultXAIConfig: Partial<XAIConfig> = {
  model: 'grok-2',
  maxTokens: 1000,
  temperature: 0.7,
  timeout: 30000,
  baseURL: 'https://api.x.ai/v1'
}

// Available XAI models (Updated February 2025)
export const xaiModels = {
  // Grok 3 Series (Latest)
  'grok-3': 'Grok 3 - Latest flagship model with advanced reasoning and multimodal capabilities',
  
  // Grok 2 Series
  'grok-2': 'Grok 2 - Enhanced model with vision, reasoning, and tool calling',
  'grok-2-mini': 'Grok 2 Mini - Faster and more efficient version',
  
  // Legacy Models
  'grok-beta': 'Grok Beta - Experimental model',
  'grok-1': 'Grok 1 - First generation model'
}