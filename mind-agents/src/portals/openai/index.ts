/**
 * OpenAI Portal Implementation
 * 
 * This portal provides integration with OpenAI's API using the Vercel AI SDK.
 * It supports text generation, chat completion, and embeddings.
 */

import { openai, createOpenAI } from '@ai-sdk/openai'
import { generateText, streamText } from 'ai'
import { BasePortal } from '../base-portal.js'
import { PortalConfig, TextGenerationOptions, TextGenerationResult, 
  ChatMessage, ChatGenerationOptions, ChatGenerationResult, EmbeddingOptions, EmbeddingResult,
  ImageGenerationOptions, ImageGenerationResult, PortalCapability, MessageRole, FinishReason, PortalType, ModelType } from '../../types/portal.js'

export interface OpenAIConfig extends PortalConfig {
  model?: string
  chatModel?: string  // Specific model for chat operations
  toolModel?: string  // Faster model for tool/function calling
  embeddingModel?: string
  imageModel?: string
  organization?: string
  baseURL?: string
}

export class OpenAIPortal extends BasePortal {
  type: PortalType = PortalType.OPENAI;
  supportedModels: ModelType[] = [ModelType.TEXT_GENERATION, ModelType.CHAT, ModelType.EMBEDDING, ModelType.IMAGE_GENERATION, ModelType.MULTIMODAL, ModelType.CODE_GENERATION];
  private provider: any
  
  constructor(config: OpenAIConfig) {
    super('openai', 'OpenAI', '1.0.0', config)
    
    // Create a custom OpenAI provider instance if we have custom settings
    if (config.organization || config.baseURL) {
      this.provider = createOpenAI({
        apiKey: config.apiKey,
        organization: config.organization,
        baseURL: config.baseURL,
        compatibility: 'strict'
      })
    } else {
      // Use the default provider with API key from environment or config
      this.provider = openai
      // Set API key in environment if provided in config
      if (config.apiKey && !process.env.OPENAI_API_KEY) {
        process.env.OPENAI_API_KEY = config.apiKey
      }
    }
  }

  /**
   * Generate text using OpenAI's completion API
   */
  async generateText(prompt: string, options?: TextGenerationOptions): Promise<TextGenerationResult> {
    try {
      // Use the general model for text generation
      const model = options?.model || (this.config as OpenAIConfig).model || 'gpt-4o-mini'
      
      const result = await generateText({
        model: this.provider(model),
        prompt,
        maxTokens: options?.maxTokens || this.config.maxTokens,
        temperature: options?.temperature || this.config.temperature,
        topP: options?.topP,
        frequencyPenalty: options?.frequencyPenalty,
        presencePenalty: options?.presencePenalty
      })

      return {
        text: result.text,
        usage: {
          promptTokens: result.usage?.promptTokens || 0,
          completionTokens: result.usage?.completionTokens || 0,
          totalTokens: result.usage?.totalTokens || 0
        },
        metadata: {
          model,
          provider: 'openai'
        }
      }
    } catch (error) {
      console.error('OpenAI text generation error:', error)
      throw new Error(`OpenAI text generation failed: ${error}`)
    }
  }

  /**
   * Generate chat response using OpenAI's chat completion API
   */
  async generateChat(messages: ChatMessage[], options?: ChatGenerationOptions): Promise<ChatGenerationResult> {
    try {
      // Intelligent model selection based on use case
      let model: string
      
      if (options?.model) {
        // Use explicitly specified model
        model = options.model
      } else if (options?.functions && options.functions.length > 0) {
        // Use tool model for function calling (faster, cheaper)
        model = (this.config as OpenAIConfig).toolModel || 'gpt-4o-mini'
      } else {
        // Use chat model for regular conversations
        model = (this.config as OpenAIConfig).chatModel || (this.config as OpenAIConfig).model || 'gpt-4o-mini'
      }
      
      const result = await generateText({
        model: this.provider(model),
        messages: messages.map(msg => ({
          role: msg.role === 'function' ? 'assistant' : msg.role,
          content: msg.content
        })) as any,
        maxTokens: options?.maxTokens || this.config.maxTokens,
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
        text: result.text,
        message: {
          role: MessageRole.ASSISTANT,
          content: result.text
        },
        usage: {
          promptTokens: result.usage?.promptTokens || 0,
          completionTokens: result.usage?.completionTokens || 0,
          totalTokens: result.usage?.totalTokens || 0
        },
        finishReason: (result.finishReason as FinishReason) || FinishReason.STOP,
        metadata: {
          model,
          provider: 'openai'
        }
      }
    } catch (error) {
      console.error('OpenAI chat generation error:', error)
      throw new Error(`OpenAI chat generation failed: ${error}`)
    }
  }

  /**
   * Generate embeddings using OpenAI's embedding API
   */
  async generateEmbedding(text: string, options?: EmbeddingOptions): Promise<EmbeddingResult> {
    try {
      const model = options?.model || (this.config as OpenAIConfig).embeddingModel || 'text-embedding-3-large'
      
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          input: text,
          dimensions: options?.dimensions
        })
      })

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`)
      }

      const data = await response.json()
      const embedding = data.data[0].embedding
      
      return {
        embedding,
        dimensions: embedding.length,
        model,
        usage: {
          promptTokens: data.usage?.prompt_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0
        },
        metadata: {
          provider: 'openai'
        }
      }
    } catch (error) {
      console.error('OpenAI embedding generation error:', error)
      throw new Error(`OpenAI embedding generation failed: ${error}`)
    }
  }
  
  /**
   * Generate images using OpenAI's DALL-E API
   */
  async generateImage(prompt: string, options?: ImageGenerationOptions): Promise<ImageGenerationResult> {
    try {
      const model = options?.model || (this.config as OpenAIConfig).imageModel || 'dall-e-3'
      
      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          prompt,
          size: options?.size || '1024x1024',
          quality: options?.quality || 'standard',
          response_format: options?.responseFormat || 'url',
          n: options?.n || 1
        })
      })

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`)
      }

      const data = await response.json()
      
      return {
        images: data.data.map((img: any) => ({
          url: img.url,
          b64_json: img.b64_json
        })),
        model,
        metadata: {
          provider: 'openai',
          revised_prompt: data.data[0]?.revised_prompt
        }
      }
    } catch (error) {
      console.error('OpenAI image generation error:', error)
      throw new Error(`OpenAI image generation failed: ${error}`)
    }
  }

  /**
   * Stream text generation for real-time responses
   */
  async *streamText(prompt: string, options?: TextGenerationOptions): AsyncGenerator<string> {
    try {
      // Use the general model for text generation
      const model = options?.model || (this.config as OpenAIConfig).model || 'gpt-4o-mini'
      
      const result = await streamText({
        model: this.provider(model),
        prompt,
        maxTokens: options?.maxTokens || this.config.maxTokens,
        temperature: options?.temperature || this.config.temperature
      })

      for await (const delta of result.textStream) {
        yield delta
      }
    } catch (error) {
      console.error('OpenAI stream text error:', error)
      throw new Error(`OpenAI stream text failed: ${error}`)
    }
  }

  /**
   * Stream chat generation for real-time responses
   */
  async *streamChat(messages: ChatMessage[], options?: ChatGenerationOptions): AsyncGenerator<string> {
    try {
      // Intelligent model selection for streaming
      let model: string
      
      if (options?.model) {
        model = options.model
      } else if (options?.functions && options.functions.length > 0) {
        model = (this.config as OpenAIConfig).toolModel || 'gpt-4o-mini'
      } else {
        model = (this.config as OpenAIConfig).chatModel || (this.config as OpenAIConfig).model || 'gpt-4o-mini'
      }
      
      const result = await streamText({
        model: this.provider(model),
        messages: messages.map(msg => ({
          role: msg.role === 'function' ? 'assistant' : msg.role,
          content: msg.content
        })) as any,
        maxTokens: options?.maxTokens || this.config.maxTokens,
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

      for await (const delta of result.textStream) {
        yield delta
      }
    } catch (error) {
      console.error('OpenAI stream chat error:', error)
      throw new Error(`OpenAI stream chat failed: ${error}`)
    }
  }

  /**
   * Check if the portal supports a specific capability
   */
  hasCapability(capability: PortalCapability): boolean {
    switch (capability) {
      case PortalCapability.TEXT_GENERATION:
      case PortalCapability.CHAT_GENERATION:
      case PortalCapability.EMBEDDING_GENERATION:
      case PortalCapability.IMAGE_GENERATION:
      case PortalCapability.STREAMING:
      case PortalCapability.FUNCTION_CALLING:
      case PortalCapability.VISION:
        return true;
      case PortalCapability.AUDIO:
        return false;
      default:
        return false;
    }
  }
}

// Export factory function for easy instantiation
export function createOpenAIPortal(config: OpenAIConfig): OpenAIPortal {
  return new OpenAIPortal(config)
}

// Export default configuration
export const defaultOpenAIConfig: Partial<OpenAIConfig> = {
  model: 'gpt-4o-mini',
  chatModel: 'gpt-4o-mini',  // Default for regular chat
  toolModel: 'gpt-4o-mini',   // Fast model for tools/functions
  embeddingModel: 'text-embedding-3-large',
  imageModel: 'dall-e-3',
  maxTokens: 1000,
  temperature: 0.7,
  timeout: 30000
}

// Available OpenAI models
export const openAIModels = {
  // Latest GPT-4 Series
  'gpt-4.1': 'GPT-4.1 - Latest flagship model with enhanced capabilities',
  'gpt-4o': 'GPT-4o - Advanced multimodal model',
  'gpt-4o-mini': 'GPT-4o Mini - Fast and cost-effective',
  'gpt-4-turbo': 'GPT-4 Turbo - Enhanced performance',
  'gpt-4': 'GPT-4 - Original flagship model',
  
  // Advanced Reasoning Models
  'o3': 'o3 - State-of-the-art reasoning model',
  'o1-preview': 'o1 Preview - Advanced reasoning',
  'o1-mini': 'o1 Mini - Compact reasoning model',
  
  // Embedding Models
  'text-embedding-3-large': 'Text Embedding 3 Large - High-dimensional embeddings',
  'text-embedding-3-small': 'Text Embedding 3 Small - Efficient embeddings'
}

// Available OpenAI embedding models
export const openAIEmbeddingModels = {
  'text-embedding-3-large': 'Text Embedding 3 Large - 3072 dimensions',
  'text-embedding-3-small': 'Text Embedding 3 Small - 1536 dimensions'
}

// Available OpenAI image models
export const openAIImageModels = {
  'dall-e-3': 'DALL-E 3 - High quality image generation'
}