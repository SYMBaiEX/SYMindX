/**
 * XAI Portal Implementation
 * 
 * This portal provides integration with XAI's Grok API.
 * Since ai-sdk may not have direct XAI support, we'll use a generic HTTP approach.
 */

import { BasePortal } from '../base-portal.js'
import { PortalConfig, TextGenerationOptions, TextGenerationResult, 
  ChatMessage, ChatGenerationOptions, ChatGenerationResult, EmbeddingOptions, EmbeddingResult,
  ImageGenerationOptions, ImageGenerationResult, PortalCapability, MessageRole, FinishReason, PortalType, ModelType } from '../../types/portal.js'

export interface XAIConfig extends PortalConfig {
  model?: string
  baseURL?: string
}

export class XAIPortal extends BasePortal {
  type: PortalType = PortalType.XAI;
  supportedModels: ModelType[] = [ModelType.TEXT_GENERATION, ModelType.CHAT, ModelType.CODE_GENERATION];
  private baseURL: string
  
  constructor(config: XAIConfig) {
    super('xai', 'XAI', '1.0.0', config)
    this.baseURL = config.baseURL || 'https://api.x.ai/v1'
  }

  /**
   * Generate text using XAI's completion API
   */
  async generateText(prompt: string, options?: TextGenerationOptions): Promise<TextGenerationResult> {
    try {
      const model = (this.config as XAIConfig).model || 'grok-beta'
      
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: options?.maxTokens || this.config.maxTokens,
          temperature: options?.temperature || this.config.temperature,
          top_p: options?.topP,
          frequency_penalty: options?.frequencyPenalty,
          presence_penalty: options?.presencePenalty,
          stop: options?.stop
        })
      })

      if (!response.ok) {
        throw new Error(`XAI API error: ${response.statusText}`)
      }

      const data = await response.json()
      const choice = data.choices[0]

      return {
        text: choice.message.content,
        usage: {
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0
        },
        finishReason: (choice.finish_reason as FinishReason) || FinishReason.STOP,
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
      const model = (this.config as XAIConfig).model || 'grok-beta'
      
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          messages: messages.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          max_tokens: options?.maxTokens || this.config.maxTokens,
          temperature: options?.temperature || this.config.temperature,
          top_p: options?.topP,
          frequency_penalty: options?.frequencyPenalty,
          presence_penalty: options?.presencePenalty,
          tools: options?.functions?.map(fn => ({
            type: 'function',
            function: {
              name: fn.name,
              description: fn.description,
              parameters: fn.parameters
            }
          }))
        })
      })

      if (!response.ok) {
        throw new Error(`XAI API error: ${response.statusText}`)
      }

      const data = await response.json()
      const choice = data.choices[0]

      return {
        text: choice.message.content,
        message: {
          role: MessageRole.ASSISTANT,
          content: choice.message.content
        },
        usage: {
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0
        },
        finishReason: (choice.finish_reason as FinishReason) || FinishReason.STOP,
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
      const model = (this.config as XAIConfig).model || 'grok-beta'
      
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: options?.maxTokens || this.config.maxTokens,
          temperature: options?.temperature || this.config.temperature,
          stream: true
        })
      })

      if (!response.ok) {
        throw new Error(`XAI API error: ${response.statusText}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('Failed to get response reader')
      }

      const decoder = new TextDecoder()
      let buffer = ''

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              if (data === '[DONE]') return
              
              try {
                const parsed = JSON.parse(data)
                const delta = parsed.choices[0]?.delta?.content
                if (delta) {
                  yield delta
                }
              } catch (e) {
                // Skip invalid JSON lines
              }
            }
          }
        }
      } finally {
        reader.releaseLock()
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
      const model = (this.config as XAIConfig).model || 'grok-beta'
      
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          messages: messages.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          max_tokens: options?.maxTokens || this.config.maxTokens,
          temperature: options?.temperature || this.config.temperature,
          stream: true
        })
      })

      if (!response.ok) {
        throw new Error(`XAI API error: ${response.statusText}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('Failed to get response reader')
      }

      const decoder = new TextDecoder()
      let buffer = ''

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              if (data === '[DONE]') return
              
              try {
                const parsed = JSON.parse(data)
                const delta = parsed.choices[0]?.delta?.content
                if (delta) {
                  yield delta
                }
              } catch (e) {
                // Skip invalid JSON lines
              }
            }
          }
        }
      } finally {
        reader.releaseLock()
      }
    } catch (error) {
      console.error('XAI stream chat error:', error)
      throw new Error(`XAI stream chat failed: ${error}`)
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