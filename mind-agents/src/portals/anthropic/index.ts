/**
 * Anthropic Portal Implementation
 * 
 * This portal provides integration with Anthropic's Claude API using the Vercel AI SDK.
 * Supports Claude's advanced reasoning and safety features.
 */

import { anthropic } from '@ai-sdk/anthropic'
import { generateText, streamText, tool, type ModelMessage, type LanguageModel } from 'ai'
import { z } from 'zod'
import { BasePortal } from '../base-portal'
import { PortalConfig, TextGenerationOptions, TextGenerationResult, 
  ChatMessage, ChatGenerationOptions, ChatGenerationResult, EmbeddingOptions, EmbeddingResult,
  ImageGenerationOptions, ImageGenerationResult, PortalCapability, MessageRole, FinishReason, PortalType, ModelType } from '../../types/portal'

export interface AnthropicConfig extends PortalConfig {
  model?: string
  baseURL?: string
}

/**
 * Convert AI SDK usage to our internal format
 */
function convertUsage(usage: any) {
  if (!usage) return { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
  
  return {
    promptTokens: usage.promptTokens || 0,
    completionTokens: usage.completionTokens || 0,
    totalTokens: usage.totalTokens || (usage.promptTokens || 0) + (usage.completionTokens || 0)
  }
}

export class AnthropicPortal extends BasePortal {
  type: PortalType = PortalType.ANTHROPIC;
  supportedModels: ModelType[] = [ModelType.TEXT_GENERATION, ModelType.CHAT, ModelType.MULTIMODAL];
  private anthropicProvider: any
  
  constructor(config: AnthropicConfig) {
    super('anthropic', 'Anthropic', '1.0.0', config)
    
    // Store the anthropic function
    this.anthropicProvider = anthropic
  }

  /**
   * Get language model instance
   */
  private getLanguageModel(modelId?: string): LanguageModel {
    const model = modelId || (this.config as AnthropicConfig).model || 'claude-4-sonnet'
    return this.anthropicProvider(model, {
      apiKey: (this.config as AnthropicConfig).apiKey || process.env.ANTHROPIC_API_KEY,
      baseURL: (this.config as AnthropicConfig).baseURL
    })
  }

  /**
   * Convert function definitions to AI SDK v5 tool format
   */
  private convertFunctionsToTools(functions: any[]) {
    const tools: Record<string, any> = {}
    
    for (const fn of functions) {
      tools[fn.name] = tool({
        description: fn.description,
        parameters: z.object(fn.parameters?.properties || {}),
        execute: async (args: any) => {
          // Since we're just converting the interface, we return the args
          // The actual execution would be handled by the caller
          return args
        }
      })
    }
    
    return tools
  }

  /**
   * Generate text using Anthropic's completion API
   */
  async generateText(prompt: string, options?: TextGenerationOptions): Promise<TextGenerationResult> {
    try {
      const model = options?.model || (this.config as AnthropicConfig).model || 'claude-4-sonnet'
      
      const result = await generateText({
        model: this.getLanguageModel(model),
        prompt,
        maxOutputTokens: options?.maxTokens || this.config.maxTokens,
        temperature: options?.temperature || this.config.temperature,
        topP: options?.topP
      })

      return {
        text: result.text,
        usage: convertUsage(result.usage),
        finishReason: this.mapFinishReason(result.finishReason),
        metadata: {
          model,
          provider: 'anthropic'
        }
      }
    } catch (error) {
      console.error('Anthropic text generation error:', error)
      throw new Error(`Anthropic text generation failed: ${error}`)
    }
  }

  /**
   * Generate chat response using Anthropic's messages API
   */
  async generateChat(messages: ChatMessage[], options?: ChatGenerationOptions): Promise<ChatGenerationResult> {
    try {
      const model = options?.model || (this.config as AnthropicConfig).model || 'claude-4-sonnet'
      const modelMessages = this.convertToModelMessages(messages)
      
      const generateOptions: any = {
        model: this.getLanguageModel(model),
        messages: modelMessages,
        maxOutputTokens: options?.maxTokens || this.config.maxTokens,
        temperature: options?.temperature || this.config.temperature,
        topP: options?.topP
      }

      // Add tools if functions are provided
      if (options?.functions && options.functions.length > 0) {
        generateOptions.tools = this.convertFunctionsToTools(options.functions)
      }

      const result = await generateText(generateOptions)

      const assistantMessage: ChatMessage = {
        role: MessageRole.ASSISTANT,
        content: result.text,
        timestamp: new Date()
      }

      return {
        message: assistantMessage,
        text: result.text,
        model,
        usage: convertUsage(result.usage),
        finishReason: this.mapFinishReason(result.finishReason),
        timestamp: new Date(),
        metadata: {
          model,
          provider: 'anthropic'
        }
      }
    } catch (error) {
      console.error('Anthropic chat generation error:', error)
      throw new Error(`Anthropic chat generation failed: ${error}`)
    }
  }

  /**
   * Generate embeddings - Note: Anthropic doesn't provide embedding models
   * This is a placeholder that throws an error
   */
  async generateEmbedding(text: string, options?: EmbeddingOptions): Promise<EmbeddingResult> {
    throw new Error('Anthropic does not provide embedding models. Consider using OpenAI or another provider for embeddings.')
  }
  
  /**
   * Generate images - Note: Anthropic doesn't provide image generation models
   * This is a placeholder that throws an error
   */
  async generateImage(prompt: string, options?: ImageGenerationOptions): Promise<ImageGenerationResult> {
    throw new Error('Anthropic does not provide image generation models. Consider using OpenAI or another provider for image generation.')
  }

  /**
   * Stream text generation for real-time responses
   */
  async *streamText(prompt: string, options?: TextGenerationOptions): AsyncGenerator<string> {
    try {
      const model = options?.model || (this.config as AnthropicConfig).model || 'claude-4-sonnet'
      
      const result = await streamText({
        model: this.getLanguageModel(model),
        prompt,
        maxOutputTokens: options?.maxTokens || this.config.maxTokens,
        temperature: options?.temperature || this.config.temperature,
        topP: options?.topP
      })

      for await (const textPart of result.textStream) {
        yield textPart
      }
    } catch (error) {
      console.error('Anthropic stream text error:', error)
      throw new Error(`Anthropic stream text failed: ${error}`)
    }
  }
  
  /**
   * Stream chat generation for real-time responses
   */
  async *streamChat(messages: ChatMessage[], options?: ChatGenerationOptions): AsyncGenerator<string> {
    try {
      const model = options?.model || (this.config as AnthropicConfig).model || 'claude-4-sonnet'
      const modelMessages = this.convertToModelMessages(messages)
      
      const streamOptions: any = {
        model: this.getLanguageModel(model),
        messages: modelMessages,
        maxOutputTokens: options?.maxTokens || this.config.maxTokens,
        temperature: options?.temperature || this.config.temperature,
        topP: options?.topP
      }

      // Add tools if functions are provided
      if (options?.functions && options.functions.length > 0) {
        streamOptions.tools = this.convertFunctionsToTools(options.functions)
      }

      const result = await streamText(streamOptions)

      for await (const textPart of result.textStream) {
        yield textPart
      }
    } catch (error) {
      console.error('Anthropic stream chat error:', error)
      throw new Error(`Anthropic stream chat failed: ${error}`)
    }
  }
  
  /**
   * Convert ChatMessage[] to ModelMessage[] format for AI SDK v5
   */
  private convertToModelMessages(messages: ChatMessage[]): ModelMessage[] {
    const modelMessages: ModelMessage[] = []
    
    // Extract system messages and combine them
    const systemMessages = messages.filter(msg => msg.role === MessageRole.SYSTEM)
    if (systemMessages.length > 0) {
      // Anthropic expects a single system message at the beginning
      const systemContent = systemMessages.map(msg => msg.content).join('\n\n')
      modelMessages.push({
        role: 'system',
        content: systemContent
      })
    }
    
    // Add non-system messages
    for (const msg of messages) {
      if (msg.role === MessageRole.SYSTEM) continue
      
      const modelMessage: ModelMessage = {
        role: msg.role === MessageRole.FUNCTION ? 'assistant' : msg.role as any,
        content: msg.content
      }

      // Handle attachments for multimodal support
      if (msg.attachments && msg.attachments.length > 0) {
        const content: any[] = [{ type: 'text', text: msg.content }]
        
        for (const attachment of msg.attachments) {
          if (attachment.type === 'image') {
            if (attachment.data) {
              content.push({
                type: 'image',
                image: attachment.data,
                mimeType: attachment.mimeType
              })
            } else if (attachment.url) {
              content.push({
                type: 'image',
                image: new URL(attachment.url)
              })
            }
          }
        }
        
        modelMessage.content = content
      }

      modelMessages.push(modelMessage)
    }

    return modelMessages
  }

  /**
   * Map finish reasons from AI SDK to our internal format
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
      case 'function-call':
        return FinishReason.FUNCTION_CALL
      case 'error':
        return FinishReason.ERROR
      case 'cancelled':
        return FinishReason.CANCELLED
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
export function createAnthropicPortal(config: AnthropicConfig): AnthropicPortal {
  return new AnthropicPortal(config)
}

// Export default configuration
export const defaultAnthropicConfig: Partial<AnthropicConfig> = {
  model: 'claude-4-sonnet',
  maxTokens: 1000, // Keep as config property, map to maxOutputTokens in calls
  temperature: 0.7,
  timeout: 30000
}

// Available Anthropic models (Updated with Claude 4)
export const anthropicModels = {
  // Claude 4 Series (Latest - Best coding and reasoning models)
  'claude-4-opus': 'Claude 4 Opus - World\'s best coding model with sustained performance',
  'claude-4-sonnet': 'Claude 4 Sonnet - Significant upgrade with superior coding and reasoning',
  
  // Claude 3.7 Series
  'claude-3.7-sonnet': 'Claude 3.7 Sonnet - Enhanced capabilities',
  
  // Claude 3.5 Series
  'claude-3-5-sonnet-20241022': 'Claude 3.5 Sonnet (Latest)',
  'claude-3-5-haiku-20241022': 'Claude 3.5 Haiku'
}