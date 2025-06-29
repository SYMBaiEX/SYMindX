/**
 * Google Gemini Portal
 * 
 * Advanced multimodal AI portal supporting text, image, and video understanding
 * Implements Google's Gemini API with comprehensive multimodal capabilities
 */

import { BasePortal } from '../base-portal.js'
import { 
  Portal, PortalConfig, PortalType, PortalStatus, ModelType, PortalCapability,
  TextGenerationOptions, TextGenerationResult, ChatMessage, ChatGenerationOptions, 
  ChatGenerationResult, EmbeddingOptions, EmbeddingResult, ImageGenerationOptions, 
  ImageGenerationResult, MessageRole, MessageType, FinishReason
} from '../../types/portal.js'
import { Agent } from '../../types/agent.js'

export interface GoogleConfig extends PortalConfig {
  apiKey: string
  projectId?: string
  location?: string
  model?: string
  safetySettings?: SafetySetting[]
  generationConfig?: GenerationConfig
  systemInstruction?: string
  tools?: Tool[]
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

export interface MultimodalContent {
  text?: string
  inlineData?: {
    mimeType: string
    data: string
  }
  fileData?: {
    mimeType: string
    fileUri: string
  }
  videoMetadata?: {
    startOffset: string
    endOffset: string
  }
}

export interface GooglePart {
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

export interface GoogleMessage {
  role: 'user' | 'model'
  parts: GooglePart[]
}

export interface GoogleResponse {
  candidates: Array<{
    content: {
      parts: GooglePart[]
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

export const defaultGoogleConfig: Partial<GoogleConfig> = {
  model: 'gemini-1.5-pro',
  maxTokens: 8192,
  temperature: 0.7,
  timeout: 60000,
  location: 'us-central1',
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

export const googleModels = [
  'gemini-1.5-pro',
  'gemini-1.5-flash',
  'gemini-1.0-pro',
  'gemini-1.0-pro-vision',
  'gemini-1.0-pro-001',
  'gemini-1.5-pro-001',
  'gemini-1.5-flash-001'
]

export class GooglePortal extends BasePortal {
  type = PortalType.GOOGLE
  supportedModels = [
    ModelType.TEXT_GENERATION,
    ModelType.CHAT, 
    ModelType.MULTIMODAL,
    ModelType.EMBEDDING,
    ModelType.CODE_GENERATION
  ]

  private baseUrl: string
  private projectId: string
  private location: string

  constructor(config: GoogleConfig) {
    super('google-gemini', 'Google Gemini', '1.0.0', config)
    this.projectId = config.projectId || 'default-project'
    this.location = config.location || 'us-central1'
    this.baseUrl = `https://${this.location}-aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${this.location}/publishers/google/models`
  }

  async init(agent: Agent): Promise<void> {
    this.status = PortalStatus.INITIALIZING
    console.log(`🔮 Initializing Google Gemini portal for agent ${agent.name}`)
    
    try {
      await this.validateConfig()
      await this.healthCheck()
      this.status = PortalStatus.ACTIVE
      console.log(`✅ Google Gemini portal initialized for ${agent.name}`)
    } catch (error) {
      this.status = PortalStatus.ERROR
      console.error(`❌ Failed to initialize Google Gemini portal:`, error)
      throw error
    }
  }

  protected async validateConfig(): Promise<void> {
    if (!this.config.apiKey) {
      throw new Error('API key is required for Google Gemini portal')
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.makeRequest(`${this.config.defaultModel || 'gemini-1.5-pro'}:generateContent`, {
        contents: [{
          role: 'user',
          parts: [{ text: 'Hello' }]
        }]
      })
      return response.candidates?.length > 0
    } catch (error) {
      console.error('Google Gemini health check failed:', error)
      return false
    }
  }

  async generateText(prompt: string, options?: TextGenerationOptions): Promise<TextGenerationResult> {
    const model = options?.model || this.config.defaultModel || 'gemini-1.5-pro'
    
    const requestBody = {
      contents: [{
        role: 'user',
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: options?.temperature ?? this.config.temperature,
        maxOutputTokens: options?.maxTokens ?? this.config.maxTokens,
        topP: options?.topP,
        stopSequences: options?.stop
      },
      safetySettings: (this.config as GoogleConfig).safetySettings
    }

    try {
      const response = await this.makeRequest(`${model}:generateContent`, requestBody)
      return this.parseTextResponse(response, model)
    } catch (error) {
      throw new Error(`Google Gemini text generation failed: ${error}`)
    }
  }

  async generateChat(messages: ChatMessage[], options?: ChatGenerationOptions): Promise<ChatGenerationResult> {
    const model = options?.model || this.config.defaultModel || 'gemini-1.5-pro'
    
    const contents = await this.convertMessagesToGoogleFormat(messages)
    
    const requestBody = {
      contents,
      generationConfig: {
        temperature: options?.temperature ?? this.config.temperature,
        maxOutputTokens: options?.maxTokens ?? this.config.maxTokens,
        topP: options?.topP,
        stopSequences: options?.stop
      },
      safetySettings: (this.config as GoogleConfig).safetySettings,
      tools: (this.config as GoogleConfig).tools,
      systemInstruction: (this.config as GoogleConfig).systemInstruction ? {
        role: 'user',
        parts: [{ text: (this.config as GoogleConfig).systemInstruction }]
      } : undefined
    }

    try {
      const response = await this.makeRequest(`${model}:generateContent`, requestBody)
      return this.parseChatResponse(response, model, messages)
    } catch (error) {
      throw new Error(`Google Gemini chat generation failed: ${error}`)
    }
  }

  async generateEmbedding(text: string, options?: EmbeddingOptions): Promise<EmbeddingResult> {
    const model = options?.model || 'text-embedding-004'
    
    const requestBody = {
      instances: [{
        content: text,
        task_type: 'RETRIEVAL_DOCUMENT'
      }]
    }

    try {
      const response = await this.makeRequest(`${model}:predict`, requestBody)
      
      if (!response.predictions?.[0]?.embeddings?.values) {
        throw new Error('Invalid embedding response format')
      }

      return {
        embedding: response.predictions[0].embeddings.values,
        dimensions: response.predictions[0].embeddings.values.length,
        model,
        usage: {
          promptTokens: text.length,
          totalTokens: text.length
        }
      }
    } catch (error) {
      throw new Error(`Google Embedding generation failed: ${error}`)
    }
  }

  async generateImage(prompt: string, options?: ImageGenerationOptions): Promise<ImageGenerationResult> {
    // Google doesn't have native image generation in Gemini, but we can use Imagen
    const model = options?.model || 'imagegeneration'
    
    const requestBody = {
      instances: [{
        prompt: prompt
      }],
      parameters: {
        sampleCount: options?.n || 1,
        aspectRatio: this.parseImageSize(options?.size),
        safetyFilterLevel: 'block_some',
        personGeneration: 'dont_allow'
      }
    }

    try {
      const response = await this.makeRequest(`${model}:predict`, requestBody)
      
      return {
        images: response.predictions.map((prediction: any) => ({
          b64_json: prediction.bytesBase64Encoded
        })),
        model,
        usage: {
          promptTokens: prompt.length,
          totalTokens: prompt.length
        }
      }
    } catch (error) {
      throw new Error(`Google Image generation failed: ${error}`)
    }
  }

  async *streamText(prompt: string, options?: TextGenerationOptions): AsyncGenerator<string> {
    const model = options?.model || this.config.defaultModel || 'gemini-1.5-pro'
    
    const requestBody = {
      contents: [{
        role: 'user',
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: options?.temperature ?? this.config.temperature,
        maxOutputTokens: options?.maxTokens ?? this.config.maxTokens,
        topP: options?.topP,
        stopSequences: options?.stop
      },
      safetySettings: (this.config as GoogleConfig).safetySettings
    }

    try {
      const response = await this.makeStreamRequest(`${model}:streamGenerateContent`, requestBody)
      
      for await (const chunk of response) {
        if (chunk.candidates?.[0]?.content?.parts?.[0]?.text) {
          yield chunk.candidates[0].content.parts[0].text
        }
      }
    } catch (error) {
      throw new Error(`Google Gemini text streaming failed: ${error}`)
    }
  }

  async *streamChat(messages: ChatMessage[], options?: ChatGenerationOptions): AsyncGenerator<string> {
    const model = options?.model || this.config.defaultModel || 'gemini-1.5-pro'
    
    const contents = await this.convertMessagesToGoogleFormat(messages)
    
    const requestBody = {
      contents,
      generationConfig: {
        temperature: options?.temperature ?? this.config.temperature,
        maxOutputTokens: options?.maxTokens ?? this.config.maxTokens,
        topP: options?.topP,
        stopSequences: options?.stop
      },
      safetySettings: (this.config as GoogleConfig).safetySettings,
      tools: (this.config as GoogleConfig).tools
    }

    try {
      const response = await this.makeStreamRequest(`${model}:streamGenerateContent`, requestBody)
      
      for await (const chunk of response) {
        if (chunk.candidates?.[0]?.content?.parts?.[0]?.text) {
          yield chunk.candidates[0].content.parts[0].text
        }
      }
    } catch (error) {
      throw new Error(`Google Gemini chat streaming failed: ${error}`)
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
        return true
      case PortalCapability.AUDIO:
        return false // Not yet supported
      default:
        return false
    }
  }

  private async makeRequest(endpoint: string, body: any): Promise<any> {
    const url = `${this.baseUrl}/${endpoint}`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        ...(this.config.headers || {})
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTTP ${response.status}: ${errorText}`)
    }

    return response.json()
  }

  private async makeStreamRequest(endpoint: string, body: any): Promise<AsyncGenerator<any>> {
    const url = `${this.baseUrl}/${endpoint}`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        ...(this.config.headers || {})
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTTP ${response.status}: ${errorText}`)
    }

    return this.parseStreamResponse(response)
  }

  private async *parseStreamResponse(response: Response): AsyncGenerator<any> {
    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response body')

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
              yield parsed
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  private async convertMessagesToGoogleFormat(messages: ChatMessage[]): Promise<GoogleMessage[]> {
    const contents: GoogleMessage[] = []
    
    for (const message of messages) {
      if (message.role === MessageRole.SYSTEM) {
        // System messages are handled separately in systemInstruction
        continue
      }

      const parts: GooglePart[] = []
      
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

  private parseTextResponse(response: GoogleResponse, model: string): TextGenerationResult {
    if (!response.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('Invalid response format from Google Gemini')
    }

    const candidate = response.candidates[0]
    const text = candidate.content.parts[0].text

    if (!text) {
      throw new Error('No text content in response from Google Gemini')
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

  private parseChatResponse(response: GoogleResponse, model: string, originalMessages: ChatMessage[]): ChatGenerationResult {
    if (!response.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('Invalid response format from Google Gemini')
    }

    const candidate = response.candidates[0]
    const text = candidate.content.parts[0].text

    if (!text) {
      throw new Error('No text content in response from Google Gemini')
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

  private parseImageSize(size?: string): string {
    switch (size) {
      case '256x256':
        return '1:1'
      case '512x512':
        return '1:1'
      case '1024x1024':
        return '1:1'
      case '1024x1792':
        return '9:16'
      case '1792x1024':
        return '16:9'
      default:
        return '1:1'
    }
  }
}

export function createGooglePortal(config: GoogleConfig): GooglePortal {
  return new GooglePortal({
    ...defaultGoogleConfig,
    ...config
  })
}

