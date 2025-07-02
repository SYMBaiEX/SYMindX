/**
 * Cohere AI Portal
 * 
 * Enterprise-grade AI platform with strong capabilities in text generation,
 * embeddings, classification, and semantic search
 */

import { BasePortal } from '../base-portal.js'
import { 
  Portal, PortalConfig, PortalType, PortalStatus, ModelType, PortalCapability,
  TextGenerationOptions, TextGenerationResult, ChatMessage, ChatGenerationOptions, 
  ChatGenerationResult, EmbeddingOptions, EmbeddingResult, MessageRole, FinishReason
} from '../../types/portal.js'
import { Agent } from '../../types/agent.js'

export interface CohereConfig extends PortalConfig {
  apiKey: string
  model?: string
  version?: string
  truncate?: 'NONE' | 'START' | 'END'
  connectors?: CohereConnector[]
  citationQuality?: 'accurate' | 'fast'
  promptTruncation?: 'AUTO' | 'OFF'
  searchQueriesOnly?: boolean
  preamble?: string
  chatHistory?: CohereChatMessage[]
  conversationId?: string
  tools?: CohereTool[]
  toolResults?: CohereToolResult[]
}

export interface CohereConnector {
  id: string
  userAccessToken?: string
  continueOnFailure?: boolean
  options?: Record<string, any>
}

export interface CohereChatMessage {
  role: 'USER' | 'CHATBOT' | 'SYSTEM' | 'TOOL'
  message: string
  toolResults?: CohereToolResult[]
}

export interface CohereTool {
  name: string
  description: string
  parameterDefinitions?: Record<string, CohereParameterDefinition>
}

export interface CohereParameterDefinition {
  description: string
  type: string
  required?: boolean
  enum?: string[]
}

export interface CohereToolResult {
  call: {
    name: string
    parameters: Record<string, any>
  }
  outputs: Array<Record<string, any>>
}

export interface CohereGenerateRequest {
  model?: string
  prompt: string
  max_tokens?: number
  temperature?: number
  k?: number
  p?: number
  frequency_penalty?: number
  presence_penalty?: number
  end_sequences?: string[]
  stop_sequences?: string[]
  return_likelihoods?: 'GENERATION' | 'ALL' | 'NONE'
  logit_bias?: Record<string, number>
  truncate?: 'NONE' | 'START' | 'END'
  stream?: boolean
}

export interface CohereChatRequest {
  model?: string
  message: string
  chat_history?: CohereChatMessage[]
  conversation_id?: string
  prompt_truncation?: 'AUTO' | 'OFF'
  connectors?: CohereConnector[]
  search_queries_only?: boolean
  preamble?: string
  max_tokens?: number
  temperature?: number
  p?: number
  k?: number
  seed?: number
  stop_sequences?: string[]
  frequency_penalty?: number
  presence_penalty?: number
  tools?: CohereTool[]
  tool_results?: CohereToolResult[]
  citation_quality?: 'accurate' | 'fast'
  stream?: boolean
}

export interface CohereEmbedRequest {
  model?: string
  texts: string[]
  input_type?: 'search_document' | 'search_query' | 'classification' | 'clustering'
  embedding_types?: Array<'float' | 'int8' | 'uint8' | 'binary' | 'ubinary'>
  truncate?: 'NONE' | 'START' | 'END'
}

export interface CohereGenerateResponse {
  id: string
  generations: Array<{
    id: string
    text: string
    likelihood?: number
    token_likelihoods?: Array<{
      token: string
      likelihood: number
    }>
    finish_reason: string
  }>
  prompt: string
  meta: {
    api_version: {
      version: string
    }
    billed_units: {
      input_tokens: number
      output_tokens: number
    }
    tokens?: {
      input_tokens: number
      output_tokens: number
    }
  }
}

export interface CohereChatResponse {
  response_id: string
  text: string
  generation_id: string
  token_count: {
    prompt_tokens: number
    response_tokens: number
    total_tokens: number
    billed_tokens: number
  }
  meta: {
    api_version: {
      version: string
    }
    billed_units: {
      input_tokens: number
      output_tokens: number
    }
  }
  finish_reason: string
  chat_history?: CohereChatMessage[]
  conversation_id?: string
  tool_calls?: Array<{
    name: string
    parameters: Record<string, any>
  }>
  search_results?: Array<{
    search_query: {
      text: string
      generation_id: string
    }
    connector: {
      id: string
    }
    document_ids: string[]
    error_message?: string
    continue_on_failure?: boolean
  }>
  search_queries?: Array<{
    text: string
    generation_id: string
  }>
  documents?: Array<{
    id: string
    title: string
    snippet: string
    timestamp: string
    url: string
  }>
  citations?: Array<{
    start: number
    end: number
    text: string
    document_ids: string[]
  }>
}

export interface CohereEmbedResponse {
  id: string
  embeddings: number[][]
  texts: string[]
  meta: {
    api_version: {
      version: string
    }
    billed_units: {
      input_tokens: number
    }
  }
}

export const defaultCohereConfig: Partial<CohereConfig> = {
  model: 'command-r-plus',
  version: '2024-04-15',
  maxTokens: 4000,
  temperature: 0.7,
  timeout: 30000,
  baseUrl: 'https://api.cohere.ai/v1',
  truncate: 'END',
  citationQuality: 'accurate',
  promptTruncation: 'AUTO'
}

export const cohereModels = [
  'command-r-plus',
  'command-r',
  'command',
  'command-nightly',
  'command-light',
  'command-light-nightly',
  'embed-english-v3.0',
  'embed-multilingual-v3.0',
  'embed-english-light-v3.0',
  'embed-multilingual-light-v3.0',
  'embed-english-v2.0',
  'embed-english-light-v2.0',
  'embed-multilingual-v2.0',
  'rerank-english-v3.0',
  'rerank-multilingual-v3.0',
  'rerank-english-v2.0',
  'rerank-multilingual-v2.0'
]

export class CoherePortal extends BasePortal {
  type = PortalType.CUSTOM
  supportedModels = [
    ModelType.TEXT_GENERATION,
    ModelType.CHAT,
    ModelType.EMBEDDING
  ]

  private baseUrl: string
  private cohereVersion: string

  constructor(config: CohereConfig) {
    super('cohere-ai', 'Cohere AI', '1.0.0', config)
    this.baseUrl = config.baseUrl || 'https://api.cohere.ai/v1'
    this.cohereVersion = config.version || '2024-04-15'
  }

  async init(agent: Agent): Promise<void> {
    this.status = PortalStatus.INITIALIZING
    console.log(`🔮 Initializing Cohere AI portal for agent ${agent.name}`)
    
    try {
      await this.validateConfig()
      await this.healthCheck()
      this.status = PortalStatus.ACTIVE
      console.log(`✅ Cohere AI portal initialized for ${agent.name}`)
    } catch (error) {
      this.status = PortalStatus.ERROR
      console.error(`❌ Failed to initialize Cohere AI portal:`, error)
      throw error
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.makeRequest('/models', {}, 'GET')
      return response.models && Array.isArray(response.models)
    } catch (error) {
      console.error('Cohere AI health check failed:', error)
      return false
    }
  }

  async generateText(prompt: string, options?: TextGenerationOptions): Promise<TextGenerationResult> {
    const model = options?.model || this.config.defaultModel || 'command-r-plus'
    
    const requestBody: CohereGenerateRequest = {
      model,
      prompt,
      max_tokens: options?.maxTokens ?? this.config.maxTokens,
      temperature: options?.temperature ?? this.config.temperature,
      p: options?.topP,
      frequency_penalty: options?.frequencyPenalty,
      presence_penalty: options?.presencePenalty,
      stop_sequences: options?.stop,
      truncate: (this.config as CohereConfig).truncate,
      stream: false
    }

    try {
      const response = await this.makeRequest('/generate', requestBody)
      return this.parseGenerateResponse(response, model)
    } catch (error) {
      throw new Error(`Cohere AI text generation failed: ${error}`)
    }
  }

  async generateChat(messages: ChatMessage[], options?: ChatGenerationOptions): Promise<ChatGenerationResult> {
    const model = options?.model || this.config.defaultModel || 'command-r-plus'
    
    const { message, chatHistory } = this.convertMessagesToCohereFormat(messages)
    
    const requestBody: CohereChatRequest = {
      model,
      message,
      chat_history: chatHistory,
      conversation_id: (this.config as CohereConfig).conversationId,
      prompt_truncation: (this.config as CohereConfig).promptTruncation,
      connectors: (this.config as CohereConfig).connectors,
      search_queries_only: (this.config as CohereConfig).searchQueriesOnly,
      preamble: (this.config as CohereConfig).preamble,
      max_tokens: options?.maxTokens ?? this.config.maxTokens,
      temperature: options?.temperature ?? this.config.temperature,
      p: options?.topP,
      stop_sequences: options?.stop,
      frequency_penalty: options?.frequencyPenalty,
      presence_penalty: options?.presencePenalty,
      tools: (this.config as CohereConfig).tools,
      tool_results: (this.config as CohereConfig).toolResults,
      citation_quality: (this.config as CohereConfig).citationQuality,
      stream: false
    }

    try {
      const response = await this.makeRequest('/chat', requestBody)
      return this.parseChatResponse(response, model, messages)
    } catch (error) {
      throw new Error(`Cohere AI chat generation failed: ${error}`)
    }
  }

  async generateEmbedding(text: string, options?: EmbeddingOptions): Promise<EmbeddingResult> {
    const model = options?.model || 'embed-english-v3.0'
    
    const requestBody: CohereEmbedRequest = {
      model,
      texts: [text],
      input_type: 'search_document',
      embedding_types: ['float'],
      truncate: (this.config as CohereConfig).truncate
    }

    try {
      const response = await this.makeRequest('/embed', requestBody)
      
      if (!response.embeddings?.[0]) {
        throw new Error('Invalid embedding response format')
      }

      return {
        embedding: response.embeddings[0],
        dimensions: response.embeddings[0].length,
        model,
        usage: {
          promptTokens: response.meta?.billed_units?.input_tokens || 0,
          totalTokens: response.meta?.billed_units?.input_tokens || 0
        }
      }
    } catch (error) {
      throw new Error(`Cohere AI embedding generation failed: ${error}`)
    }
  }

  async *streamText(prompt: string, options?: TextGenerationOptions): AsyncGenerator<string> {
    const model = options?.model || this.config.defaultModel || 'command-r-plus'
    
    const requestBody: CohereGenerateRequest = {
      model,
      prompt,
      max_tokens: options?.maxTokens ?? this.config.maxTokens,
      temperature: options?.temperature ?? this.config.temperature,
      p: options?.topP,
      frequency_penalty: options?.frequencyPenalty,
      presence_penalty: options?.presencePenalty,
      stop_sequences: options?.stop,
      truncate: (this.config as CohereConfig).truncate,
      stream: true
    }

    try {
      const response = await this.makeStreamRequest('/generate', requestBody)
      
      for await (const chunk of response) {
        if (chunk.text) {
          yield chunk.text
        }
      }
    } catch (error) {
      throw new Error(`Cohere AI text streaming failed: ${error}`)
    }
  }

  async *streamChat(messages: ChatMessage[], options?: ChatGenerationOptions): AsyncGenerator<string> {
    const model = options?.model || this.config.defaultModel || 'command-r-plus'
    
    const { message, chatHistory } = this.convertMessagesToCohereFormat(messages)
    
    const requestBody: CohereChatRequest = {
      model,
      message,
      chat_history: chatHistory,
      conversation_id: (this.config as CohereConfig).conversationId,
      prompt_truncation: (this.config as CohereConfig).promptTruncation,
      connectors: (this.config as CohereConfig).connectors,
      search_queries_only: (this.config as CohereConfig).searchQueriesOnly,
      preamble: (this.config as CohereConfig).preamble,
      max_tokens: options?.maxTokens ?? this.config.maxTokens,
      temperature: options?.temperature ?? this.config.temperature,
      p: options?.topP,
      stop_sequences: options?.stop,
      frequency_penalty: options?.frequencyPenalty,
      presence_penalty: options?.presencePenalty,
      tools: (this.config as CohereConfig).tools,
      tool_results: (this.config as CohereConfig).toolResults,
      citation_quality: (this.config as CohereConfig).citationQuality,
      stream: true
    }

    try {
      const response = await this.makeStreamRequest('/chat', requestBody)
      
      for await (const chunk of response) {
        if (chunk.text) {
          yield chunk.text
        }
      }
    } catch (error) {
      throw new Error(`Cohere AI chat streaming failed: ${error}`)
    }
  }

  hasCapability(capability: PortalCapability): boolean {
    switch (capability) {
      case PortalCapability.TEXT_GENERATION:
      case PortalCapability.CHAT_GENERATION:
      case PortalCapability.EMBEDDING_GENERATION:
      case PortalCapability.STREAMING:
      case PortalCapability.FUNCTION_CALLING:
        return true
      case PortalCapability.IMAGE_GENERATION:
      case PortalCapability.VISION:
      case PortalCapability.AUDIO:
        return false
      default:
        return false
    }
  }

  private async makeRequest(endpoint: string, body: any, method: string = 'POST'): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`
    
    const options: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        'Cohere-Version': this.cohereVersion,
        ...(this.config.headers || {})
      }
    }

    if (method !== 'GET' && body) {
      options.body = JSON.stringify(body)
    }

    const response = await fetch(url, options)

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTTP ${response.status}: ${errorText}`)
    }

    return response.json()
  }

  private async makeStreamRequest(endpoint: string, body: any): Promise<AsyncGenerator<any>> {
    const url = `${this.baseUrl}${endpoint}`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        'Cohere-Version': this.cohereVersion,
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

  private convertMessagesToCohereFormat(messages: ChatMessage[]): { message: string; chatHistory: CohereChatMessage[] } {
    const chatHistory: CohereChatMessage[] = []
    let currentMessage = ''

    for (let i = 0; i < messages.length; i++) {
      const message = messages[i]
      
      if (i === messages.length - 1) {
        // Last message becomes the current message
        currentMessage = message.content
      } else {
        // Previous messages become chat history
        chatHistory.push({
          role: this.mapRole(message.role),
          message: message.content
        })
      }
    }

    return { message: currentMessage, chatHistory }
  }

  private mapRole(role: MessageRole): 'USER' | 'CHATBOT' | 'SYSTEM' | 'TOOL' {
    switch (role) {
      case MessageRole.SYSTEM:
        return 'SYSTEM'
      case MessageRole.USER:
        return 'USER'
      case MessageRole.ASSISTANT:
        return 'CHATBOT'
      case MessageRole.TOOL:
      case MessageRole.FUNCTION:
        return 'TOOL'
      default:
        return 'USER'
    }
  }

  private parseGenerateResponse(response: CohereGenerateResponse, model: string): TextGenerationResult {
    if (!response.generations?.[0]?.text) {
      throw new Error('Invalid response format from Cohere AI')
    }

    const generation = response.generations[0]
    const text = generation.text

    return {
      text,
      model,
      usage: {
        promptTokens: response.meta?.billed_units?.input_tokens || 0,
        completionTokens: response.meta?.billed_units?.output_tokens || 0,
        totalTokens: (response.meta?.billed_units?.input_tokens || 0) + (response.meta?.billed_units?.output_tokens || 0)
      },
      finishReason: this.mapFinishReason(generation.finish_reason),
      timestamp: new Date()
    }
  }

  private parseChatResponse(response: CohereChatResponse, model: string, originalMessages: ChatMessage[]): ChatGenerationResult {
    if (!response.text) {
      throw new Error('Invalid response format from Cohere AI')
    }

    const text = response.text

    const message: ChatMessage = {
      role: MessageRole.ASSISTANT,
      content: text,
      timestamp: new Date()
    }

    // Add citations if available
    if (response.citations && response.citations.length > 0) {
      message.content += '\n\n**Citations:**\n'
      response.citations.forEach((citation, index) => {
        message.content += `[${index + 1}] ${citation.text}\n`
      })
    }

    // Add search results if available
    if (response.documents && response.documents.length > 0) {
      message.content += '\n\n**Sources:**\n'
      response.documents.forEach((doc, index) => {
        message.content += `[${index + 1}] ${doc.title}: ${doc.snippet}\n`
      })
    }

    return {
      text,
      model,
      message,
      usage: {
        promptTokens: response.token_count?.prompt_tokens || 0,
        completionTokens: response.token_count?.response_tokens || 0,
        totalTokens: response.token_count?.total_tokens || 0
      },
      finishReason: this.mapFinishReason(response.finish_reason),
      timestamp: new Date()
    }
  }

  private mapFinishReason(reason: string): FinishReason {
    switch (reason) {
      case 'COMPLETE':
        return FinishReason.STOP
      case 'MAX_TOKENS':
        return FinishReason.LENGTH
      case 'ERROR':
        return FinishReason.ERROR
      case 'ERROR_TOXIC':
        return FinishReason.CONTENT_FILTER
      default:
        return FinishReason.STOP
    }
  }
}

export function createCoherePortal(config: CohereConfig): Portal {
  return new CoherePortal({
    ...defaultCohereConfig,
    ...config
  })
}

