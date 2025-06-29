/**
 * Mistral AI Portal
 * 
 * European-based AI provider with strong capabilities in multilingual processing,
 * code generation, and enterprise compliance features
 */

import { BasePortal } from '../base-portal.js'
import { 
  Portal, PortalConfig, PortalType, PortalStatus, ModelType, PortalCapability,
  TextGenerationOptions, TextGenerationResult, ChatMessage, ChatGenerationOptions, 
  ChatGenerationResult, EmbeddingOptions, EmbeddingResult, MessageRole, FinishReason
} from '../../types/portal.js'
import { Agent } from '../../types/agent.js'

export interface MistralConfig extends PortalConfig {
  apiKey: string
  model?: string
  safeMode?: boolean
  randomSeed?: number
  responseFormat?: { type: 'json_object' | 'text' }
  toolChoice?: 'auto' | 'none' | { type: 'function', function: { name: string } }
  tools?: MistralTool[]
}

export interface MistralTool {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: {
      type: 'object'
      properties: Record<string, any>
      required?: string[]
    }
  }
}

export interface MistralMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | MistralContent[]
  name?: string
  tool_calls?: MistralToolCall[]
  tool_call_id?: string
}

export interface MistralContent {
  type: 'text' | 'image_url'
  text?: string
  image_url?: {
    url: string
    detail?: 'low' | 'high' | 'auto'
  }
}

export interface MistralToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

export interface MistralResponse {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    message: {
      role: string
      content: string
      tool_calls?: MistralToolCall[]
    }
    finish_reason: string
    logprobs?: any
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export const defaultMistralConfig: Partial<MistralConfig> = {
  model: 'mistral-large-latest',
  maxTokens: 8192,
  temperature: 0.7,
  timeout: 30000,
  baseUrl: 'https://api.mistral.ai/v1',
  safeMode: false
}

export const mistralModels = [
  'mistral-large-latest',
  'mistral-large-2407',
  'mistral-large-2402',
  'mistral-medium-latest',
  'mistral-small-latest',
  'mistral-small-2402',
  'mistral-tiny',
  'open-mistral-7b',
  'open-mixtral-8x7b',
  'open-mixtral-8x22b',
  'mistral-embed',
  'codestral-latest',
  'codestral-2405'
]

export class MistralPortal extends BasePortal {
  type = PortalType.CUSTOM
  supportedModels = [
    ModelType.TEXT_GENERATION,
    ModelType.CHAT,
    ModelType.CODE_GENERATION,
    ModelType.EMBEDDING
  ]

  private baseUrl: string

  constructor(config: MistralConfig) {
    super('mistral-ai', 'Mistral AI', '1.0.0', config)
    this.baseUrl = config.baseUrl || 'https://api.mistral.ai/v1'
  }

  async init(agent: Agent): Promise<void> {
    this.status = PortalStatus.INITIALIZING
    console.log(`🔮 Initializing Mistral AI portal for agent ${agent.name}`)
    
    try {
      await this.validateConfig()
      await this.healthCheck()
      this.status = PortalStatus.ACTIVE
      console.log(`✅ Mistral AI portal initialized for ${agent.name}`)
    } catch (error) {
      this.status = PortalStatus.ERROR
      console.error(`❌ Failed to initialize Mistral AI portal:`, error)
      throw error
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.makeRequest('/models', {}, 'GET')
      return response.data && Array.isArray(response.data)
    } catch (error) {
      console.error('Mistral AI health check failed:', error)
      return false
    }
  }

  async generateText(prompt: string, options?: TextGenerationOptions): Promise<TextGenerationResult> {
    const model = options?.model || this.config.defaultModel || 'mistral-large-latest'
    
    const requestBody = {
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: options?.maxTokens ?? this.config.maxTokens,
      temperature: options?.temperature ?? this.config.temperature,
      top_p: options?.topP,
      random_seed: (this.config as MistralConfig).randomSeed,
      safe_mode: (this.config as MistralConfig).safeMode,
      stream: false
    }

    try {
      const response = await this.makeRequest('/chat/completions', requestBody)
      return this.parseTextResponse(response, model)
    } catch (error) {
      throw new Error(`Mistral AI text generation failed: ${error}`)
    }
  }

  async generateChat(messages: ChatMessage[], options?: ChatGenerationOptions): Promise<ChatGenerationResult> {
    const model = options?.model || this.config.defaultModel || 'mistral-large-latest'
    
    const mistralMessages = this.convertMessagesToMistralFormat(messages)
    
    const requestBody = {
      model,
      messages: mistralMessages,
      max_tokens: options?.maxTokens ?? this.config.maxTokens,
      temperature: options?.temperature ?? this.config.temperature,
      top_p: options?.topP,
      random_seed: (this.config as MistralConfig).randomSeed,
      safe_mode: (this.config as MistralConfig).safeMode,
      tools: (this.config as MistralConfig).tools,
      tool_choice: (this.config as MistralConfig).toolChoice,
      response_format: (this.config as MistralConfig).responseFormat,
      stream: false
    }

    try {
      const response = await this.makeRequest('/chat/completions', requestBody)
      return this.parseChatResponse(response, model, messages)
    } catch (error) {
      throw new Error(`Mistral AI chat generation failed: ${error}`)
    }
  }

  async generateEmbedding(text: string, options?: EmbeddingOptions): Promise<EmbeddingResult> {
    const model = options?.model || 'mistral-embed'
    
    const requestBody = {
      model,
      input: [text],
      encoding_format: 'float'
    }

    try {
      const response = await this.makeRequest('/embeddings', requestBody)
      
      if (!response.data?.[0]?.embedding) {
        throw new Error('Invalid embedding response format')
      }

      return {
        embedding: response.data[0].embedding,
        dimensions: response.data[0].embedding.length,
        model,
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0
        }
      }
    } catch (error) {
      throw new Error(`Mistral AI embedding generation failed: ${error}`)
    }
  }

  async *streamText(prompt: string, options?: TextGenerationOptions): AsyncGenerator<string> {
    const model = options?.model || this.config.defaultModel || 'mistral-large-latest'
    
    const requestBody = {
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: options?.maxTokens ?? this.config.maxTokens,
      temperature: options?.temperature ?? this.config.temperature,
      top_p: options?.topP,
      random_seed: (this.config as MistralConfig).randomSeed,
      safe_mode: (this.config as MistralConfig).safeMode,
      stream: true
    }

    try {
      const response = await this.makeStreamRequest('/chat/completions', requestBody)
      
      for await (const chunk of response) {
        if (chunk.choices?.[0]?.delta?.content) {
          yield chunk.choices[0].delta.content
        }
      }
    } catch (error) {
      throw new Error(`Mistral AI text streaming failed: ${error}`)
    }
  }

  async *streamChat(messages: ChatMessage[], options?: ChatGenerationOptions): AsyncGenerator<string> {
    const model = options?.model || this.config.defaultModel || 'mistral-large-latest'
    
    const mistralMessages = this.convertMessagesToMistralFormat(messages)
    
    const requestBody = {
      model,
      messages: mistralMessages,
      max_tokens: options?.maxTokens ?? this.config.maxTokens,
      temperature: options?.temperature ?? this.config.temperature,
      top_p: options?.topP,
      random_seed: (this.config as MistralConfig).randomSeed,
      safe_mode: (this.config as MistralConfig).safeMode,
      tools: (this.config as MistralConfig).tools,
      tool_choice: (this.config as MistralConfig).toolChoice,
      stream: true
    }

    try {
      const response = await this.makeStreamRequest('/chat/completions', requestBody)
      
      for await (const chunk of response) {
        if (chunk.choices?.[0]?.delta?.content) {
          yield chunk.choices[0].delta.content
        }
      }
    } catch (error) {
      throw new Error(`Mistral AI chat streaming failed: ${error}`)
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

  private convertMessagesToMistralFormat(messages: ChatMessage[]): MistralMessage[] {
    return messages.map(message => {
      const mistralMessage: MistralMessage = {
        role: this.mapRole(message.role),
        content: message.content
      }

      if (message.name) {
        mistralMessage.name = message.name
      }

      if (message.toolCalls) {
        mistralMessage.tool_calls = message.toolCalls.map(call => ({
          id: call.id,
          type: 'function' as const,
          function: {
            name: call.function.name,
            arguments: call.function.arguments
          }
        }))
      }

      return mistralMessage
    })
  }

  private mapRole(role: MessageRole): 'system' | 'user' | 'assistant' | 'tool' {
    switch (role) {
      case MessageRole.SYSTEM:
        return 'system'
      case MessageRole.USER:
        return 'user'
      case MessageRole.ASSISTANT:
        return 'assistant'
      case MessageRole.TOOL:
      case MessageRole.FUNCTION:
        return 'tool'
      default:
        return 'user'
    }
  }

  private parseTextResponse(response: MistralResponse, model: string): TextGenerationResult {
    if (!response.choices?.[0]?.message?.content) {
      throw new Error('Invalid response format from Mistral AI')
    }

    const choice = response.choices[0]
    const text = choice.message.content

    return {
      text,
      model,
      usage: {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens
      },
      finishReason: this.mapFinishReason(choice.finish_reason),
      timestamp: new Date()
    }
  }

  private parseChatResponse(response: MistralResponse, model: string, originalMessages: ChatMessage[]): ChatGenerationResult {
    if (!response.choices?.[0]?.message?.content) {
      throw new Error('Invalid response format from Mistral AI')
    }

    const choice = response.choices[0]
    const text = choice.message.content

    const message: ChatMessage = {
      role: MessageRole.ASSISTANT,
      content: text,
      timestamp: new Date()
    }

    if (choice.message.tool_calls) {
      message.toolCalls = choice.message.tool_calls.map(call => ({
        id: call.id,
        type: call.type,
        function: {
          name: call.function.name,
          arguments: call.function.arguments
        }
      }))
    }

    return {
      text,
      model,
      message,
      usage: {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens
      },
      finishReason: this.mapFinishReason(choice.finish_reason),
      timestamp: new Date()
    }
  }

  private mapFinishReason(reason: string): FinishReason {
    switch (reason) {
      case 'stop':
        return FinishReason.STOP
      case 'length':
        return FinishReason.LENGTH
      case 'tool_calls':
        return FinishReason.FUNCTION_CALL
      case 'content_filter':
        return FinishReason.CONTENT_FILTER
      default:
        return FinishReason.STOP
    }
  }
}

export function createMistralPortal(config: MistralConfig): MistralPortal {
  return new MistralPortal({
    ...defaultMistralConfig,
    ...config
  })
}

