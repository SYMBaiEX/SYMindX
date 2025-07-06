import { convertUsage } from '../utils'
/**
 * Google Generative AI Portal
 * 
 * Advanced AI portal using Vercel AI SDK for Google's Generative AI models
 */

import { BasePortal } from '../base-portal'
import { 
  PortalConfig, PortalType, PortalStatus, ModelType, PortalCapability,
  TextGenerationOptions, TextGenerationResult, ChatMessage, ChatGenerationOptions, 
  ChatGenerationResult, EmbeddingOptions, EmbeddingResult, ImageGenerationOptions, 
  ImageGenerationResult, MessageRole, FinishReason
} from '../../types/portal'
import { Agent } from '../../types/agent'
import { 
  generateText, 
  streamText, 
  generateObject,
  type LanguageModel,
  type ModelMessage
} from 'ai'
import { google } from '@ai-sdk/google'
import { z } from 'zod'

export interface GoogleGenerativeConfig extends PortalConfig {
  apiKey: string
  model?: string
  safetySettings?: SafetySetting[]
  generationConfig?: GenerationConfig
  systemInstruction?: string
  apiVersion?: 'v1' | 'v1alpha'
}

export interface SafetySetting {
  category: string
  threshold: string
}

export interface GenerationConfig {
  temperature?: number
  topP?: number
  topK?: number
  maxOutputTokens?: number
  candidateCount?: number
  stopSequences?: string[]
  responseMimeType?: string
  responseSchema?: any
}

export const defaultGenerativeConfig: Partial<GoogleGenerativeConfig> = {
  model: 'gemini-2.0-flash-exp',
  maxTokens: 8192, // Keep as config property, map to maxOutputTokens in calls
  temperature: 0.7,
  timeout: 60000,
  apiVersion: 'v1',
  generationConfig: {
    temperature: 0.7,
    topP: 0.8,
    topK: 40,
    maxOutputTokens: 8192
  }
}

export const generativeModels = [
  'gemini-2.0-flash-exp',
  'gemini-1.5-pro',
  'gemini-1.5-pro-002',
  'gemini-1.5-flash',
  'gemini-1.5-flash-002',
  'gemini-1.5-flash-8b',
  'gemini-1.0-pro'
]

export class GoogleGenerativePortal extends BasePortal {
  type = PortalType.GOOGLE_GENERATIVE
  supportedModels = [
    ModelType.TEXT_GENERATION,
    ModelType.CHAT, 
    ModelType.MULTIMODAL,
    ModelType.EMBEDDING,
    ModelType.CODE_GENERATION
  ]

  private googleProvider: any

  constructor(config: GoogleGenerativeConfig) {
    super('google-generative', 'Google Generative AI', '1.0.0', config)
    
    this.googleProvider = google
  }

  protected getDefaultModel(type: 'chat' | 'tool' | 'embedding' | 'image'): string {
    switch (type) {
      case 'chat': return 'gemini-2.0-flash-exp'
      case 'tool': return 'gemini-1.5-flash'
      case 'embedding': return 'text-embedding-004'
      case 'image': return 'gemini-2.0-flash-exp'
      default: return 'gemini-2.0-flash-exp'
    }
  }

  async init(agent: Agent): Promise<void> {
    this.status = PortalStatus.INITIALIZING
    console.log(`🔮 Initializing Google Generative AI portal for agent ${agent.name}`)
    
    try {
      await this.validateConfig()
      await this.healthCheck()
      this.status = PortalStatus.ACTIVE
      console.log(`✅ Google Generative AI portal initialized for ${agent.name}`)
    } catch (error) {
      this.status = PortalStatus.ERROR
      console.error(`❌ Failed to initialize Google Generative AI portal:`, error)
      throw error
    }
  }

  protected async validateConfig(): Promise<void> {
    const config = this.config as GoogleGenerativeConfig
    if (!config.apiKey && !process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      throw new Error('API key is required for Google Generative AI portal')
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const model = this.getLanguageModel('gemini-1.5-flash')
      const { text } = await generateText({
        model,
        prompt: 'Hello',
        maxOutputTokens: 10
      })
      return !!text
    } catch (error) {
      console.error('Google Generative AI health check failed:', error)
      return false
    }
  }

  private getLanguageModel(modelId?: string): LanguageModel {
    const model = modelId || this.resolveModel('chat')
    return this.googleProvider(model, {
      apiKey: (this.config as GoogleGenerativeConfig).apiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY
    })
  }

  async generateText(prompt: string, options?: TextGenerationOptions): Promise<TextGenerationResult> {
    const model = options?.model || this.resolveModel('chat')
    
    try {
      const config = this.config as GoogleGenerativeConfig
      const { text, usage, finishReason } = await generateText({
        model: this.getLanguageModel(model),
        prompt,
        maxOutputTokens: options?.maxTokens ?? config.generationConfig?.maxOutputTokens ?? this.config.maxTokens,
        temperature: options?.temperature ?? config.generationConfig?.temperature ?? this.config.temperature,
        topP: options?.topP ?? config.generationConfig?.topP,
        frequencyPenalty: options?.frequencyPenalty,
        presencePenalty: options?.presencePenalty,
        stopSequences: options?.stop ?? config.generationConfig?.stopSequences
      })
      
      return {
        text,
        model,
        usage: convertUsage(usage),
        finishReason: this.mapFinishReason(finishReason),
        timestamp: new Date()
      }
    } catch (error) {
      throw new Error(`Google Generative AI text generation failed: ${error}`)
    }
  }

  async generateChat(messages: ChatMessage[], options?: ChatGenerationOptions): Promise<ChatGenerationResult> {
    const model = options?.model || this.resolveModel('chat')
    
    try {
      const config = this.config as GoogleGenerativeConfig
      const modelMessages = this.convertToModelMessages(messages)
      
      const { text, usage, finishReason } = await generateText({
        model: this.getLanguageModel(model),
        messages: modelMessages,
        maxOutputTokens: options?.maxTokens ?? config.generationConfig?.maxOutputTokens ?? this.config.maxTokens,
        temperature: options?.temperature ?? config.generationConfig?.temperature ?? this.config.temperature,
        topP: options?.topP ?? config.generationConfig?.topP,
        frequencyPenalty: options?.frequencyPenalty,
        presencePenalty: options?.presencePenalty,
        stopSequences: options?.stop ?? config.generationConfig?.stopSequences
      })

      const assistantMessage: ChatMessage = {
        role: MessageRole.ASSISTANT,
        content: text,
        timestamp: new Date()
      }

      return {
        text,
        model,
        message: assistantMessage,
        usage: convertUsage(usage),
        finishReason: this.mapFinishReason(finishReason),
        timestamp: new Date()
      }
    } catch (error) {
      throw new Error(`Google Generative AI chat generation failed: ${error}`)
    }
  }

  async generateEmbedding(text: string, options?: EmbeddingOptions): Promise<EmbeddingResult> {
    const model = options?.model || this.resolveModel('embedding')
    
    try {
      // Note: Google AI SDK doesn't support embeddings yet in v5
      // This is a placeholder implementation
      return {
        embedding: new Array(768).fill(0).map(() => Math.random() * 2 - 1),
        dimensions: 768,
        model,
        usage: {
          promptTokens: text.length,
          totalTokens: text.length
        }
      }
    } catch (error) {
      throw new Error(`Google Generative AI embedding generation failed: ${error}`)
    }
  }

  async *streamText(prompt: string, options?: TextGenerationOptions): AsyncGenerator<string> {
    const model = options?.model || this.resolveModel('chat')
    
    try {
      const config = this.config as GoogleGenerativeConfig
      const { textStream } = streamText({
        model: this.getLanguageModel(model),
        prompt,
        maxOutputTokens: options?.maxTokens ?? config.generationConfig?.maxOutputTokens ?? this.config.maxTokens,
        temperature: options?.temperature ?? config.generationConfig?.temperature ?? this.config.temperature,
        topP: options?.topP ?? config.generationConfig?.topP,
        frequencyPenalty: options?.frequencyPenalty,
        presencePenalty: options?.presencePenalty,
        stopSequences: options?.stop ?? config.generationConfig?.stopSequences
      })
      
      for await (const textPart of textStream) {
        yield textPart
      }
    } catch (error) {
      throw new Error(`Google Generative AI text streaming failed: ${error}`)
    }
  }

  async *streamChat(messages: ChatMessage[], options?: ChatGenerationOptions): AsyncGenerator<string> {
    const model = options?.model || this.resolveModel('chat')
    
    try {
      const config = this.config as GoogleGenerativeConfig
      const modelMessages = this.convertToModelMessages(messages)
      
      const { textStream } = streamText({
        model: this.getLanguageModel(model),
        messages: modelMessages,
        maxOutputTokens: options?.maxTokens ?? config.generationConfig?.maxOutputTokens ?? this.config.maxTokens,
        temperature: options?.temperature ?? config.generationConfig?.temperature ?? this.config.temperature,
        topP: options?.topP ?? config.generationConfig?.topP,
        frequencyPenalty: options?.frequencyPenalty,
        presencePenalty: options?.presencePenalty,
        stopSequences: options?.stop ?? config.generationConfig?.stopSequences
      })
      
      for await (const textPart of textStream) {
        yield textPart
      }
    } catch (error) {
      throw new Error(`Google Generative AI chat streaming failed: ${error}`)
    }
  }

  hasCapability(capability: PortalCapability): boolean {
    switch (capability) {
      case PortalCapability.TEXT_GENERATION:
      case PortalCapability.CHAT_GENERATION:
      case PortalCapability.STREAMING:
      case PortalCapability.FUNCTION_CALLING:
      case PortalCapability.VISION:
      case PortalCapability.EVALUATION:
      case PortalCapability.TOOL_USAGE:
        return true
      case PortalCapability.EMBEDDING_GENERATION:
        return false // Not yet supported in AI SDK v5
      case PortalCapability.IMAGE_GENERATION:
      case PortalCapability.AUDIO:
        return false
      default:
        return false
    }
  }

  private convertToModelMessages(messages: ChatMessage[]): ModelMessage[] {
    return messages.map(msg => {
      switch (msg.role) {
        case MessageRole.SYSTEM:
          return { role: 'system', content: msg.content }
        
        case MessageRole.USER: {
          // Handle attachments for multimodal support
          if (msg.attachments && msg.attachments.length > 0) {
            const content: any[] = [{ type: 'text', text: msg.content }]
            
            for (const attachment of msg.attachments) {
              if (attachment.type === 'image') {
                if (attachment.data) {
                  content.push({
                    type: 'image',
                    image: attachment.data,
                    mediaType: attachment.mimeType
                  })
                } else if (attachment.url) {
                  content.push({
                    type: 'image',
                    image: new URL(attachment.url)
                  })
                }
              }
            }
            
            return { role: 'user', content }
          } else {
            return { role: 'user', content: msg.content }
          }
        }
        
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
}

export function createGoogleGenerativePortal(config: GoogleGenerativeConfig): GoogleGenerativePortal {
  return new GoogleGenerativePortal({
    ...defaultGenerativeConfig,
    ...config
  })
}