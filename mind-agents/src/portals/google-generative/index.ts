/**
 * Google Generative AI Portal
 * 
 * Advanced AI portal using Google's Generative AI SDK for direct access to Gemini models
 * with simple API key authentication through the Gemini Developer API
 */

import { BasePortal } from '../base-portal.js'
import { 
  Portal, PortalConfig, PortalType, PortalStatus, ModelType, PortalCapability,
  TextGenerationOptions, TextGenerationResult, ChatMessage, ChatGenerationOptions, 
  ChatGenerationResult, EmbeddingOptions, EmbeddingResult, ImageGenerationOptions, 
  ImageGenerationResult, MessageRole, MessageType, FinishReason
} from '../../types/portal.js'
import { Agent } from '../../types/agent.js'
import { GoogleGenAI } from '@google/genai'

export interface GoogleGenerativeConfig extends PortalConfig {
  apiKey: string
  model?: string
  safetySettings?: SafetySetting[]
  generationConfig?: GenerationConfig
  systemInstruction?: string
  tools?: Tool[]
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

export interface Tool {
  functionDeclarations?: FunctionDeclaration[]
  codeExecution?: CodeExecutionTool
  googleSearchRetrieval?: GoogleSearchRetrievalTool
}

export interface FunctionDeclaration {
  name: string
  description: string
  parameters?: {
    type: string
    properties: Record<string, any>
    required?: string[]
  }
}

export interface CodeExecutionTool {
  enabled: boolean
}

export interface GoogleSearchRetrievalTool {
  enabled: boolean
}

export interface GenAIContent {
  role: 'user' | 'model'
  parts: GenAIPart[]
}

export interface GenAIPart {
  text?: string
  inlineData?: {
    mimeType: string
    data: string
  }
  fileData?: {
    mimeType: string
    fileUri: string
  }
  functionCall?: {
    name: string
    args: Record<string, any>
  }
  functionResponse?: {
    name: string
    response: Record<string, any>
  }
}

export const defaultGenerativeConfig: Partial<GoogleGenerativeConfig> = {
  model: 'gemini-2.0-flash-001',
  maxTokens: 8192,
  temperature: 0.7,
  timeout: 60000,
  apiVersion: 'v1',
  safetySettings: [
    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' }
  ],
  generationConfig: {
    temperature: 0.7,
    topP: 0.8,
    topK: 40,
    maxOutputTokens: 8192
  }
}

export const generativeModels = [
  'gemini-2.0-flash-001',
  'gemini-2.0-flash-exp',
  'gemini-1.5-pro',
  'gemini-1.5-pro-001',
  'gemini-1.5-pro-002',
  'gemini-1.5-flash',
  'gemini-1.5-flash-001',
  'gemini-1.5-flash-002',
  'gemini-1.5-flash-8b',
  'gemini-1.0-pro',
  'gemini-1.0-pro-001',
  'text-embedding-004'
]

export class GoogleGenerativePortal extends BasePortal {
  type = PortalType.GOOGLE
  supportedModels = [
    ModelType.TEXT_GENERATION,
    ModelType.CHAT, 
    ModelType.MULTIMODAL,
    ModelType.EMBEDDING,
    ModelType.CODE_GENERATION
  ]

  private genAI: GoogleGenAI
  private models: Map<string, any> = new Map()

  constructor(config: GoogleGenerativeConfig) {
    super('google-generative', 'Google Generative AI', '1.0.0', config)
    
    this.genAI = new GoogleGenAI({
      apiKey: config.apiKey,
      apiVersion: config.apiVersion || 'v1'
    })
  }

  protected getDefaultModel(type: 'chat' | 'tool' | 'embedding' | 'image'): string {
    switch (type) {
      case 'chat': return 'gemini-2.0-flash-001'
      case 'tool': return 'gemini-1.5-flash'
      case 'embedding': return 'text-embedding-004'
      case 'image': return 'gemini-2.0-flash-001'
      default: return 'gemini-2.0-flash-001'
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
    if (!this.config.apiKey) {
      throw new Error('API key is required for Google Generative AI portal')
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.genAI.models.generateContent({
        model: 'gemini-2.0-flash-001',
        contents: 'Hello'
      })
      return !!response.text
    } catch (error) {
      console.error('Google Generative AI health check failed:', error)
      return false
    }
  }

  async generateText(prompt: string, options?: TextGenerationOptions): Promise<TextGenerationResult> {
    const model = options?.model || this.resolveModel('chat')
    
    try {
      const config = this.config as GoogleGenerativeConfig
      const response = await this.genAI.models.generateContent({
        model,
        contents: prompt,
        config: {
          temperature: options?.temperature ?? config.generationConfig?.temperature,
          maxOutputTokens: options?.maxTokens ?? config.generationConfig?.maxOutputTokens,
          topP: options?.topP ?? config.generationConfig?.topP,
          topK: config.generationConfig?.topK,
          stopSequences: options?.stop ?? config.generationConfig?.stopSequences,
          safetySettings: config.safetySettings,
          tools: config.tools,
          systemInstruction: config.systemInstruction ? {
            role: 'system',
            parts: [{ text: config.systemInstruction }]
          } : undefined
        }
      })
      
      return {
        text: response.text,
        model,
        usage: response.usage ? {
          promptTokens: response.usage.inputTokens || 0,
          completionTokens: response.usage.outputTokens || 0,
          totalTokens: response.usage.totalTokens || 0
        } : undefined,
        finishReason: this.mapFinishReason(response.finishReason),
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
      const chat = this.genAI.chats.create({
        model,
        config: {
          temperature: options?.temperature ?? config.generationConfig?.temperature,
          maxOutputTokens: options?.maxTokens ?? config.generationConfig?.maxOutputTokens,
          topP: options?.topP ?? config.generationConfig?.topP,
          topK: config.generationConfig?.topK,
          stopSequences: options?.stop ?? config.generationConfig?.stopSequences,
          safetySettings: config.safetySettings,
          tools: config.tools,
          systemInstruction: config.systemInstruction ? {
            role: 'system',
            parts: [{ text: config.systemInstruction }]
          } : undefined
        },
        history: this.convertToGenAIHistory(messages.slice(0, -1))
      })

      const lastMessage = messages[messages.length - 1]
      const response = await chat.sendMessage({
        message: this.convertMessageToGenAI(lastMessage)
      })

      const assistantMessage: ChatMessage = {
        role: MessageRole.ASSISTANT,
        content: response.text,
        timestamp: new Date()
      }

      return {
        text: response.text,
        model,
        message: assistantMessage,
        usage: response.usage ? {
          promptTokens: response.usage.inputTokens || 0,
          completionTokens: response.usage.outputTokens || 0,
          totalTokens: response.usage.totalTokens || 0
        } : undefined,
        finishReason: this.mapFinishReason(response.finishReason),
        timestamp: new Date()
      }
    } catch (error) {
      throw new Error(`Google Generative AI chat generation failed: ${error}`)
    }
  }

  async generateEmbedding(text: string, options?: EmbeddingOptions): Promise<EmbeddingResult> {
    const model = options?.model || this.resolveModel('embedding')
    
    try {
      // Note: Google Gen AI SDK doesn't directly support embeddings yet
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
      const response = await this.genAI.models.generateContentStream({
        model,
        contents: prompt,
        config: {
          temperature: options?.temperature ?? config.generationConfig?.temperature,
          maxOutputTokens: options?.maxTokens ?? config.generationConfig?.maxOutputTokens,
          topP: options?.topP ?? config.generationConfig?.topP,
          topK: config.generationConfig?.topK,
          stopSequences: options?.stop ?? config.generationConfig?.stopSequences,
          safetySettings: config.safetySettings,
          tools: config.tools
        }
      })
      
      for await (const chunk of response) {
        if (chunk.text) {
          yield chunk.text
        }
      }
    } catch (error) {
      throw new Error(`Google Generative AI text streaming failed: ${error}`)
    }
  }

  async *streamChat(messages: ChatMessage[], options?: ChatGenerationOptions): AsyncGenerator<string> {
    const model = options?.model || this.resolveModel('chat')
    
    try {
      const config = this.config as GoogleGenerativeConfig
      const chat = this.genAI.chats.create({
        model,
        config: {
          temperature: options?.temperature ?? config.generationConfig?.temperature,
          maxOutputTokens: options?.maxTokens ?? config.generationConfig?.maxOutputTokens,
          topP: options?.topP ?? config.generationConfig?.topP,
          topK: config.generationConfig?.topK,
          stopSequences: options?.stop ?? config.generationConfig?.stopSequences,
          safetySettings: config.safetySettings,
          tools: config.tools
        },
        history: this.convertToGenAIHistory(messages.slice(0, -1))
      })

      const lastMessage = messages[messages.length - 1]
      const response = await chat.sendMessageStream({
        message: this.convertMessageToGenAI(lastMessage)
      })

      for await (const chunk of response) {
        if (chunk.text) {
          yield chunk.text
        }
      }
    } catch (error) {
      throw new Error(`Google Generative AI chat streaming failed: ${error}`)
    }
  }

  hasCapability(capability: PortalCapability): boolean {
    switch (capability) {
      case PortalCapability.TEXT_GENERATION:
      case PortalCapability.CHAT_GENERATION:
      case PortalCapability.EMBEDDING_GENERATION:
      case PortalCapability.STREAMING:
      case PortalCapability.FUNCTION_CALLING:
      case PortalCapability.VISION:
      case PortalCapability.EVALUATION:
        return true
      case PortalCapability.IMAGE_GENERATION:
      case PortalCapability.AUDIO:
        return false // Not supported by Generative AI SDK yet
      default:
        return false
    }
  }

  private convertToGenAIHistory(messages: ChatMessage[]): any[] {
    const history: any[] = []
    
    for (const message of messages) {
      if (message.role === MessageRole.SYSTEM) {
        // System messages are handled in systemInstruction
        continue
      }

      history.push({
        role: message.role === MessageRole.USER ? 'user' : 'model',
        parts: this.convertMessagePartsToGenAI(message)
      })
    }

    return history
  }

  private convertMessageToGenAI(message: ChatMessage): any {
    return {
      parts: this.convertMessagePartsToGenAI(message)
    }
  }

  private convertMessagePartsToGenAI(message: ChatMessage): any[] {
    const parts: any[] = []

    // Handle text content
    if (message.content) {
      parts.push({ text: message.content })
    }

    // Handle attachments (multimodal content)
    if (message.attachments) {
      for (const attachment of message.attachments) {
        if (attachment.type === MessageType.IMAGE) {
          if (attachment.data) {
            parts.push({
              inlineData: {
                mimeType: attachment.mimeType || 'image/jpeg',
                data: attachment.data
              }
            })
          } else if (attachment.url) {
            parts.push({
              fileData: {
                mimeType: attachment.mimeType || 'image/jpeg',
                fileUri: attachment.url
              }
            })
          }
        }
      }
    }

    // Handle function calls
    if (message.functionCall) {
      parts.push({
        functionCall: {
          name: message.functionCall.name,
          args: JSON.parse(message.functionCall.arguments)
        }
      })
    }

    return parts
  }

  private mapFinishReason(reason?: string): FinishReason {
    switch (reason) {
      case 'STOP':
        return FinishReason.STOP
      case 'MAX_TOKENS':
        return FinishReason.LENGTH
      case 'SAFETY':
        return FinishReason.CONTENT_FILTER
      case 'RECITATION':
        return FinishReason.CONTENT_FILTER
      case 'FUNCTION_CALL':
        return FinishReason.FUNCTION_CALL
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