import { convertUsage } from '../utils'
/**
 * Kluster.ai Portal Implementation
 * 
 * This portal provides integration with Kluster.ai's API.
 * Kluster.ai appears to be a specialized AI platform, so we'll use a generic approach.
 */

import { BasePortal } from '../base-portal'
import { PortalConfig, TextGenerationOptions, TextGenerationResult, 
  ChatMessage, ChatGenerationOptions, ChatGenerationResult, EmbeddingOptions, EmbeddingResult, MessageRole, FinishReason, PortalType, ModelType } from '../../types/portal'

export interface KlusterAiConfig extends PortalConfig {
  model?: string
  baseURL?: string
  organizationId?: string
}

export class KlusterAiPortal extends BasePortal {
  type: PortalType = PortalType.KLUSTER_AI;
  supportedModels: ModelType[] = [ModelType.TEXT_GENERATION, ModelType.CHAT, ModelType.CODE_GENERATION];
  private baseURL: string
  
  constructor(config: KlusterAiConfig) {
    super('kluster.ai', 'Kluster.ai', '1.0.0', config)
    this.baseURL = config.baseURL || 'https://api.kluster.ai/v1'
  }

  /**
   * Generate text using Kluster.ai's completion API
   */
  async generateText(prompt: string, options?: TextGenerationOptions): Promise<TextGenerationResult> {
    try {
      const model = (this.config as KlusterAiConfig).model || 'kluster-default'
      
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          ...(((this.config as KlusterAiConfig).organizationId && {
            'Kluster-Organization': (this.config as KlusterAiConfig).organizationId
          }) || {})
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
        throw new Error(`Kluster.ai API error: ${response.statusText}`)
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
          provider: 'kluster.ai'
        }
      }
    } catch (error) {
      console.error('Kluster.ai text generation error:', error)
      throw new Error(`Kluster.ai text generation failed: ${error}`)
    }
  }

  /**
   * Generate chat response using Kluster.ai's chat completion API
   */
  async generateChat(messages: ChatMessage[], options?: ChatGenerationOptions): Promise<ChatGenerationResult> {
    try {
      const model = (this.config as KlusterAiConfig).model || 'kluster-default'
      
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          ...(((this.config as KlusterAiConfig).organizationId && {
            'Kluster-Organization': (this.config as KlusterAiConfig).organizationId
          }) || {})
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
        throw new Error(`Kluster.ai API error: ${response.statusText}`)
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
          provider: 'kluster.ai'
        }
      }
    } catch (error) {
      console.error('Kluster.ai chat generation error:', error)
      throw new Error(`Kluster.ai chat generation failed: ${error}`)
    }
  }

  /**
   * Generate embeddings using Kluster.ai's embedding API
   */
  async generateEmbedding(text: string, options?: EmbeddingOptions): Promise<EmbeddingResult> {
    try {
      const model = options?.model || 'kluster-embedding'
      const response = await fetch(`${this.baseURL}/embeddings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          ...(((this.config as KlusterAiConfig).organizationId && {
            'Kluster-Organization': (this.config as KlusterAiConfig).organizationId
          }) || {})
        },
        body: JSON.stringify({
          model,
          input: text
        })
      })

      if (!response.ok) {
        throw new Error(`Kluster.ai API error: ${response.statusText}`)
      }

      const data = await response.json()
      const embedding = data.data[0].embedding
      
      return {
        embedding,
        dimensions: embedding.length,
        model,
        usage: data.usage ? {
          promptTokens: data.usage.prompt_tokens,
          totalTokens: data.usage.total_tokens
        } : undefined
      }
    } catch (error) {
      console.error('Kluster.ai embedding generation error:', error)
      throw new Error(`Kluster.ai embedding generation failed: ${error}`)
    }
  }

  /**
   * Stream text generation for real-time responses
   */
  async *streamText(prompt: string, options?: TextGenerationOptions): AsyncGenerator<string> {
    try {
      const model = (this.config as KlusterAiConfig).model || 'kluster-default'
      
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          ...(((this.config as KlusterAiConfig).organizationId && {
            'Kluster-Organization': (this.config as KlusterAiConfig).organizationId
          }) || {})
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
        throw new Error(`Kluster.ai API error: ${response.statusText}`)
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
      console.error('Kluster.ai stream text error:', error)
      throw new Error(`Kluster.ai stream text failed: ${error}`)
    }
  }
}

// Export factory function for easy instantiation
export function createKlusterAiPortal(config: KlusterAiConfig): KlusterAiPortal {
  return new KlusterAiPortal(config)
}

// Export default configuration
export const defaultKlusterAiConfig: Partial<KlusterAiConfig> = {
  model: 'llama-4-maverick',
  maxTokens: 1000,
  temperature: 0.7,
  timeout: 30000,
  baseURL: 'https://api.kluster.ai/v1'
}

// Available Kluster.ai models (Updated February 2025)
export const klusterAiModels = {
  // Llama 4 Series (Latest)
  'llama-4-maverick': 'Llama 4 Maverick - Advanced flagship model',
  'llama-4-scout': 'Llama 4 Scout - Efficient performance model',
  
  // Vision Models
  'qwen2.5-vl-7b-instruct': 'Qwen2.5-VL 7B Instruct - Vision-language model',
  
  // DeepSeek Series
  'deepseek-v3-0324': 'DeepSeek-V3-0324 - Advanced reasoning model',
  'deepseek-r1-0528': 'DeepSeek-R1-0528 - Research-focused model',
  
  // Gemma Series
  'gemma-3': 'Gemma 3 - Latest Google model',
  
  // Llama Turbo Models
  'llama-8b-instruct-turbo': 'Llama 8B Instruct Turbo - Fast inference',
  'llama-70b-instruct-turbo': 'Llama 70B Instruct Turbo - High-performance',
  
  // Embedding Models
  'm3-embeddings': 'M3-Embeddings - Multilingual embedding model',
  
  // Legacy Models
  'kluster-default': 'Kluster Default Model',
  'kluster-advanced': 'Kluster Advanced Model',
  'kluster-fast': 'Kluster Fast Model'
}