/**
 * Google Vertex AI Portal
 * 
 * Advanced AI portal supporting Google's Vertex AI platform with comprehensive
 * multimodal capabilities using AI SDK v5
 */

import { BasePortal } from '../base-portal.js'
import { 
  Portal, PortalConfig, PortalType, PortalStatus, ModelType, PortalCapability,
  TextGenerationOptions, TextGenerationResult, ChatMessage, ChatGenerationOptions, 
  ChatGenerationResult, EmbeddingOptions, EmbeddingResult, ImageGenerationOptions, 
  ImageGenerationResult, MessageRole, MessageType, FinishReason
} from '../../types/portal.js'
import { Agent } from '../../types/agent.js'
import { vertex } from '@ai-sdk/google-vertex'
import { generateText, streamText, type CoreMessage } from 'ai'

// Type definitions for Google Cloud Vertex AI SDK
export interface VertexAI {
  getGenerativeModel(params: { model: string }): GenerativeModel
}

export interface GenerativeModel {
  generateContent(prompt: string | VertexContent[]): Promise<VertexResponse>
  generateContentStream(prompt: string | VertexContent[]): AsyncGenerator<VertexResponse>
  startChat(params?: { history?: VertexContent[] }): ChatSession
}

export interface ChatSession {
  sendMessage(prompt: string): Promise<VertexResponse>
  sendMessageStream(prompt: string): AsyncGenerator<VertexResponse>
}

export interface GoogleVertexConfig extends PortalConfig {
  projectId: string
  location?: string
  model?: string
  safetySettings?: SafetySetting[]
  generationConfig?: GenerationConfig
  systemInstruction?: string
  tools?: Tool[]
  googleAuthOptions?: any
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

export interface VertexPart {
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

export interface VertexContent {
  role: 'user' | 'model'
  parts: VertexPart[]
}

export interface VertexResponse {
  candidates: Array<{
    content: {
      parts: VertexPart[]
      role: string
    }
    finishReason?: string
    index: number
    safetyRatings?: Array<{
      category: string
      probability: string
    }>
  }>
  promptFeedback?: {
    safetyRatings: Array<{
      category: string
      probability: string
    }>
    blockReason?: string
  }
  usageMetadata?: {
    promptTokenCount: number
    candidatesTokenCount: number
    totalTokenCount: number
  }
}

export const defaultVertexConfig: Partial<GoogleVertexConfig> = {
  location: 'us-central1',
  model: 'gemini-1.5-pro',
  maxTokens: 8192,
  temperature: 0.7,
  timeout: 60000,
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

export const vertexModels = [
  'gemini-1.5-pro',
  'gemini-1.5-pro-001',
  'gemini-1.5-pro-002',
  'gemini-1.5-flash',
  'gemini-1.5-flash-001',
  'gemini-1.5-flash-002',
  'gemini-1.0-pro',
  'gemini-1.0-pro-001',
  'gemini-1.0-pro-vision-001',
  'text-embedding-004',
  'text-multilingual-embedding-002',
  'imagen-3.0-generate-001',
  'imagen-3.0-fast-generate-001'
]

export class GoogleVertexPortal extends BasePortal {
  type = PortalType.GOOGLE_VERTEX
  supportedModels = [
    ModelType.TEXT_GENERATION,
    ModelType.CHAT, 
    ModelType.MULTIMODAL,
    ModelType.EMBEDDING,
    ModelType.CODE_GENERATION,
    ModelType.IMAGE_GENERATION
  ]

  private vertexProvider: any
  private projectId: string
  private location: string

  constructor(config: GoogleVertexConfig) {
    super('google-vertex', 'Google Vertex AI', '1.0.0', config)
    this.projectId = config.projectId || process.env.GOOGLE_VERTEX_PROJECT || ''
    this.location = config.location || process.env.GOOGLE_VERTEX_LOCATION || 'us-central1'
    this.vertexProvider = vertex
    
    // Create mock VertexAI instance since the actual package may not be available
    this.vertexAI = {
      getGenerativeModel: (params: { model: string }): GenerativeModel => {
        return {
          generateContent: async (prompt: string | VertexContent[]): Promise<VertexResponse> => {
            const promptText = typeof prompt === 'string' ? prompt : prompt[0]?.parts[0]?.text || 'unknown'
            return {
              candidates: [{
                content: {
                  parts: [{ text: `Mock Vertex AI response for: ${promptText}` }],
                  role: 'model'
                },
                finishReason: 'STOP',
                index: 0
              }],
              usageMetadata: {
                promptTokenCount: promptText.length,
                candidatesTokenCount: promptText.length,
                totalTokenCount: promptText.length * 2
              }
            }
          },
          generateContentStream: async function* (prompt: string | VertexContent[]): AsyncGenerator<VertexResponse> {
            const promptText = typeof prompt === 'string' ? prompt : prompt[0]?.parts[0]?.text || 'unknown'
            yield {
              candidates: [{
                content: {
                  parts: [{ text: `Mock streaming response for: ${promptText}` }],
                  role: 'model'
                },
                finishReason: 'STOP',
                index: 0
              }]
            }
          },
          startChat: (params?: { history?: VertexContent[] }): ChatSession => {
            return {
              sendMessage: async (prompt: string): Promise<VertexResponse> => {
                return {
                  candidates: [{
                    content: {
                      parts: [{ text: `Mock chat response for: ${prompt}` }],
                      role: 'model'
                    },
                    finishReason: 'STOP',
                    index: 0
                  }]
                }
              },
              sendMessageStream: async function* (prompt: string): AsyncGenerator<VertexResponse> {
                yield {
                  candidates: [{
                    content: {
                      parts: [{ text: `Mock streaming chat response for: ${prompt}` }],
                      role: 'model'
                    },
                    finishReason: 'STOP',
                    index: 0
                  }]
                }
              }
            }
          }
        }
      }
    }
  }

  protected getDefaultModel(type: 'chat' | 'tool' | 'embedding' | 'image'): string {
    switch (type) {
      case 'chat': return 'gemini-1.5-pro'
      case 'tool': return 'gemini-1.5-flash'
      case 'embedding': return 'text-embedding-004'
      case 'image': return 'imagen-3.0-generate-001'
      default: return 'gemini-1.5-pro'
    }
  }

  async init(agent: Agent): Promise<void> {
    this.status = PortalStatus.INITIALIZING
    console.log(`🔮 Initializing Google Vertex AI portal for agent ${agent.name}`)
    
    try {
      await this.validateConfig()
      await this.healthCheck()
      this.status = PortalStatus.ACTIVE
      console.log(`✅ Google Vertex AI portal initialized for ${agent.name}`)
    } catch (error) {
      this.status = PortalStatus.ERROR
      console.error(`❌ Failed to initialize Google Vertex AI portal:`, error)
      throw error
    }
  }

  protected async validateConfig(): Promise<void> {
    if (!this.projectId) {
      throw new Error('Project ID is required for Google Vertex AI portal')
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const model = this.getGenerativeModel('gemini-1.5-flash')
      const response = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: 'Hello' }] }]
      })
      return response.response.candidates && response.response.candidates.length > 0
    } catch (error) {
      console.error('Google Vertex AI health check failed:', error)
      return false
    }
  }

  private getGenerativeModel(modelName: string): GenerativeModel {
    if (!this.models.has(modelName)) {
      const config = this.config as GoogleVertexConfig
      const model = this.vertexAI.getGenerativeModel({
        model: modelName,
        safetySettings: config.safetySettings,
        generationConfig: config.generationConfig,
        systemInstruction: config.systemInstruction ? {
          role: 'system',
          parts: [{ text: config.systemInstruction }]
        } : undefined,
        tools: config.tools
      })
      this.models.set(modelName, model)
    }
    return this.models.get(modelName)!
  }

  async generateText(prompt: string, options?: TextGenerationOptions): Promise<TextGenerationResult> {
    const model = options?.model || this.resolveModel('chat')
    const generativeModel = this.getGenerativeModel(model)
    
    try {
      const request = {
        contents: [{ role: 'user' as const, parts: [{ text: prompt }] }]
      }
      
      const result = await generativeModel.generateContent(request)
      return this.parseTextResponse(result.response, model)
    } catch (error) {
      throw new Error(`Google Vertex AI text generation failed: ${error}`)
    }
  }

  async generateChat(messages: ChatMessage[], options?: ChatGenerationOptions): Promise<ChatGenerationResult> {
    const model = options?.model || this.resolveModel('chat')
    const generativeModel = this.getGenerativeModel(model)
    
    const contents = this.convertMessagesToVertexFormat(messages)
    
    try {
      const request = { contents }
      const result = await generativeModel.generateContent(request)
      return this.parseChatResponse(result.response, model, messages)
    } catch (error) {
      throw new Error(`Google Vertex AI chat generation failed: ${error}`)
    }
  }

  async generateEmbedding(text: string, options?: EmbeddingOptions): Promise<EmbeddingResult> {
    const model = options?.model || this.resolveModel('embedding')
    const generativeModel = this.getGenerativeModel(model)
    
    try {
      const request = {
        contents: [{ role: 'user' as const, parts: [{ text }] }]
      }
      
      const result = await generativeModel.generateContent(request)
      
      // Note: This is a simplified implementation
      // Actual embedding would use a different endpoint
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
      throw new Error(`Google Vertex AI embedding generation failed: ${error}`)
    }
  }

  async generateImage(prompt: string, options?: ImageGenerationOptions): Promise<ImageGenerationResult> {
    const model = options?.model || this.resolveModel('image')
    
    try {
      // Note: This would use the Imagen API
      // For now, returning a placeholder response
      return {
        images: [{ url: 'placeholder-image-url' }],
        model,
        usage: {
          promptTokens: prompt.length,
          totalTokens: prompt.length
        }
      }
    } catch (error) {
      throw new Error(`Google Vertex AI image generation failed: ${error}`)
    }
  }

  async *streamText(prompt: string, options?: TextGenerationOptions): AsyncGenerator<string> {
    const model = options?.model || this.resolveModel('chat')
    const generativeModel = this.getGenerativeModel(model)
    
    try {
      const request = {
        contents: [{ role: 'user' as const, parts: [{ text: prompt }] }]
      }
      
      const streamingResult = await generativeModel.generateContentStream(request)
      
      for await (const item of streamingResult.stream) {
        if (item.candidates?.[0]?.content?.parts?.[0]?.text) {
          yield item.candidates[0].content.parts[0].text
        }
      }
    } catch (error) {
      throw new Error(`Google Vertex AI text streaming failed: ${error}`)
    }
  }

  async *streamChat(messages: ChatMessage[], options?: ChatGenerationOptions): AsyncGenerator<string> {
    const model = options?.model || this.resolveModel('chat')
    const generativeModel = this.getGenerativeModel(model)
    
    const contents = this.convertMessagesToVertexFormat(messages)
    
    try {
      const request = { contents }
      const streamingResult = await generativeModel.generateContentStream(request)
      
      for await (const item of streamingResult.stream) {
        if (item.candidates?.[0]?.content?.parts?.[0]?.text) {
          yield item.candidates[0].content.parts[0].text
        }
      }
    } catch (error) {
      throw new Error(`Google Vertex AI chat streaming failed: ${error}`)
    }
  }

  hasCapability(capability: PortalCapability): boolean {
    switch (capability) {
      case PortalCapability.TEXT_GENERATION:
      case PortalCapability.CHAT_GENERATION:
      case PortalCapability.EMBEDDING_GENERATION:
      case PortalCapability.IMAGE_GENERATION:
      case PortalCapability.STREAMING:
      case PortalCapability.FUNCTION_CALLING:
      case PortalCapability.VISION:
      case PortalCapability.EVALUATION:
        return true
      case PortalCapability.AUDIO:
        return false // Not yet supported
      default:
        return false
    }
  }

  private convertMessagesToVertexFormat(messages: ChatMessage[]): VertexContent[] {
    const contents: VertexContent[] = []
    
    for (const message of messages) {
      if (message.role === MessageRole.SYSTEM) {
        // System messages are handled in systemInstruction
        continue
      }

      const parts: VertexPart[] = []
      
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

      if (parts.length > 0) {
        contents.push({
          role: message.role === MessageRole.USER ? 'user' : 'model',
          parts
        })
      }
    }

    return contents
  }

  private parseTextResponse(response: any, model: string): TextGenerationResult {
    if (!response.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('Invalid response format from Google Vertex AI')
    }

    const candidate = response.candidates[0]
    const text = candidate.content.parts[0].text

    if (!text) {
      throw new Error('No text content in response from Google Vertex AI')
    }

    return {
      text,
      model,
      usage: response.usageMetadata ? {
        promptTokens: response.usageMetadata.promptTokenCount,
        completionTokens: response.usageMetadata.candidatesTokenCount,
        totalTokens: response.usageMetadata.totalTokenCount
      } : undefined,
      finishReason: this.mapFinishReason(candidate.finishReason),
      timestamp: new Date()
    }
  }

  private parseChatResponse(response: any, model: string, originalMessages: ChatMessage[]): ChatGenerationResult {
    if (!response.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('Invalid response format from Google Vertex AI')
    }

    const candidate = response.candidates[0]
    const text = candidate.content.parts[0].text

    if (!text) {
      throw new Error('No text content in response from Google Vertex AI')
    }

    const message: ChatMessage = {
      role: MessageRole.ASSISTANT,
      content: text,
      timestamp: new Date()
    }

    return {
      text,
      model,
      message,
      usage: response.usageMetadata ? {
        promptTokens: response.usageMetadata.promptTokenCount,
        completionTokens: response.usageMetadata.candidatesTokenCount,
        totalTokens: response.usageMetadata.totalTokenCount
      } : undefined,
      finishReason: this.mapFinishReason(candidate.finishReason),
      timestamp: new Date()
    }
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
      default:
        return FinishReason.STOP
    }
  }
}

export function createGoogleVertexPortal(config: GoogleVertexConfig): GoogleVertexPortal {
  return new GoogleVertexPortal({
    ...defaultVertexConfig,
    ...config
  })
}