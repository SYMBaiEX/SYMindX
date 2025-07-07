import { convertUsage } from '../utils'
/**
 * XAI Portal Implementation
 * 
 * This portal provides integration with XAI's Grok API using AI SDK v5.
 */

import { BasePortal } from '../base-portal'
import { PortalConfig, TextGenerationOptions, TextGenerationResult, 
  ChatMessage, ChatGenerationOptions, ChatGenerationResult, EmbeddingOptions, EmbeddingResult,
  ImageGenerationOptions, ImageGenerationResult, PortalCapability, MessageRole, FinishReason, PortalType, ModelType } from '../../types/portal'
import { xai } from '@ai-sdk/xai'
import { generateText as aiGenerateText, streamText as aiStreamText, type LanguageModel, type ModelMessage } from 'ai'

export interface XAIConfig extends PortalConfig {
  model?: string
  baseURL?: string
}

export class XAIPortal extends BasePortal {
  type: PortalType = PortalType.XAI;
  supportedModels: ModelType[] = [ModelType.TEXT_GENERATION, ModelType.CHAT, ModelType.CODE_GENERATION];
  private xaiProvider: any
  
  constructor(config: XAIConfig) {
    super('xai', 'XAI', '1.0.0', config)
    this.xaiProvider = xai
  }

  /**
   * Get language model instance
   */
  private getLanguageModel(modelId?: string): LanguageModel {
    const model = modelId || (this.config as XAIConfig).model || 'grok-2'
    const config = this.config as XAIConfig
    return this.xaiProvider(model, {
      apiKey: config.apiKey || process.env.XAI_API_KEY,
      baseURL: config.baseURL
    })
  }

  /**
   * Convert ChatMessage array to message format for AI SDK v5
   */
  private convertToModelMessages(messages: ChatMessage[]): ModelMessage[] {
    return messages.map(msg => {
      switch (msg.role) {
        case MessageRole.SYSTEM:
          return { role: 'system', content: msg.content }
        case MessageRole.USER:
          return { role: 'user', content: msg.content }
        case MessageRole.ASSISTANT:
          return { role: 'assistant', content: msg.content }
        case MessageRole.TOOL:
          return { 
            role: 'tool', 
            content: [{ 
              type: 'tool-result', 
              toolCallId: '', 
              toolName: '', 
              result: msg.content 
            }] 
          }
        case MessageRole.FUNCTION:
          // Convert function messages to assistant messages for compatibility
          return { role: 'assistant', content: msg.content }
        default:
          return { role: 'user', content: msg.content }
      }
    })
  }



  /**
   * Generate text using XAI's completion API
   */
  async generateText(prompt: string, options?: TextGenerationOptions): Promise<TextGenerationResult> {
    try {
      const model = options?.model || (this.config as XAIConfig).model || 'grok-2'
      
      const result = await aiGenerateText({
        model: this.getLanguageModel(model),
        prompt,
        maxOutputTokens: options?.maxOutputTokens || options?.maxTokens || this.config.maxTokens,
        temperature: options?.temperature || this.config.temperature,
        topP: options?.topP,
        frequencyPenalty: options?.frequencyPenalty,
        presencePenalty: options?.presencePenalty
      })

      return {
        text: result.text,
        usage: convertUsage(result.usage),
        finishReason: this.mapFinishReason(result.finishReason),
        metadata: {
          model,
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
      const model = options?.model || (this.config as XAIConfig).model || 'grok-2'
      const modelMessages = this.convertToModelMessages(messages)
      
      // Prepare AI SDK v5 parameters
      const aiParams: any = {
        model: this.getLanguageModel(model),
        messages: modelMessages,
        maxOutputTokens: options?.maxOutputTokens || options?.maxTokens || this.config.maxTokens,
        temperature: options?.temperature || this.config.temperature,
        topP: options?.topP,
        frequencyPenalty: options?.frequencyPenalty,
        presencePenalty: options?.presencePenalty
      }

      // Add tools if provided
      if (options?.tools) {
        aiParams.tools = options.tools
        aiParams.maxSteps = 5 // Enable multi-step tool execution
      }

      const result = await aiGenerateText(aiParams)

      return {
        text: result.text,
        message: {
          role: MessageRole.ASSISTANT,
          content: result.text
        },
        usage: convertUsage(result.usage),
        finishReason: this.mapFinishReason(result.finishReason),
        metadata: {
          model,
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
      const model = options?.model || (this.config as XAIConfig).model || 'grok-2'
      
      const result = await aiStreamText({
        model: this.getLanguageModel(model),
        prompt,
        maxOutputTokens: options?.maxOutputTokens || options?.maxTokens || this.config.maxTokens,
        temperature: options?.temperature || this.config.temperature,
        topP: options?.topP,
        frequencyPenalty: options?.frequencyPenalty,
        presencePenalty: options?.presencePenalty
      })

      for await (const chunk of result.textStream) {
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
      const model = options?.model || (this.config as XAIConfig).model || 'grok-2'
      const modelMessages = this.convertToModelMessages(messages)
      
      // Prepare AI SDK v5 parameters
      const aiParams: any = {
        model: this.getLanguageModel(model),
        messages: modelMessages,
        maxOutputTokens: options?.maxOutputTokens || options?.maxTokens || this.config.maxTokens,
        temperature: options?.temperature || this.config.temperature,
        topP: options?.topP,
        frequencyPenalty: options?.frequencyPenalty,
        presencePenalty: options?.presencePenalty
      }

      // Add tools if provided
      if (options?.tools) {
        aiParams.tools = options.tools
        aiParams.maxSteps = 5 // Enable multi-step tool execution
      }

      const result = await aiStreamText(aiParams)

      for await (const chunk of result.textStream) {
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
  maxTokens: 1000, // Keep as config property, map to maxOutputTokens in calls
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