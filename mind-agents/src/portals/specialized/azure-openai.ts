/**
 * Azure OpenAI Portal
 * 
 * Enterprise-grade Azure OpenAI Service integration with enhanced security,
 * compliance features, and regional deployment options
 */

import { BasePortal } from '../base-portal.js'
import { 
  Portal, PortalConfig, PortalType, PortalStatus, ModelType, PortalCapability,
  TextGenerationOptions, TextGenerationResult, ChatMessage, ChatGenerationOptions, 
  ChatGenerationResult, EmbeddingOptions, EmbeddingResult, ImageGenerationOptions,
  ImageGenerationResult, MessageRole, MessageType, FinishReason
} from '../../types/portal.js'
import { Agent } from '../../types/agent.js'

export interface AzureOpenAIConfig extends PortalConfig {
  apiKey: string
  endpoint: string
  apiVersion: string
  deploymentName?: string
  embeddingDeploymentName?: string
  imageDeploymentName?: string
  resourceName?: string
  adToken?: string
  region?: string
  enableContentFilter?: boolean
  contentFilterConfig?: ContentFilterConfig
  enablePrivateEndpoint?: boolean
  enableManagedIdentity?: boolean
  tenantId?: string
  clientId?: string
  clientSecret?: string
}

export interface ContentFilterConfig {
  hate?: ContentFilterLevel
  selfHarm?: ContentFilterLevel
  sexual?: ContentFilterLevel
  violence?: ContentFilterLevel
  profanity?: ContentFilterLevel
  customFilters?: CustomFilter[]
}

export interface CustomFilter {
  name: string
  enabled: boolean
  blockedTerms?: string[]
  allowedTerms?: string[]
  severity?: ContentFilterLevel
}

export enum ContentFilterLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  DISABLED = 'disabled'
}

export interface AzureOpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool' | 'function'
  content: string | AzureOpenAIContent[]
  name?: string
  function_call?: {
    name: string
    arguments: string
  }
  tool_calls?: AzureOpenAIToolCall[]
  tool_call_id?: string
}

export interface AzureOpenAIContent {
  type: 'text' | 'image_url'
  text?: string
  image_url?: {
    url: string
    detail?: 'low' | 'high' | 'auto'
  }
}

export interface AzureOpenAIToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

export interface AzureOpenAIFunction {
  name: string
  description?: string
  parameters: {
    type: 'object'
    properties: Record<string, any>
    required?: string[]
  }
}

export interface AzureOpenAIResponse {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    message?: {
      role: string
      content: string
      function_call?: {
        name: string
        arguments: string
      }
      tool_calls?: AzureOpenAIToolCall[]
    }
    text?: string
    finish_reason: string
    logprobs?: any
    content_filter_results?: {
      hate?: { filtered: boolean; severity: string }
      self_harm?: { filtered: boolean; severity: string }
      sexual?: { filtered: boolean; severity: string }
      violence?: { filtered: boolean; severity: string }
      profanity?: { filtered: boolean; severity: string }
      error?: { code: string; message: string }
    }
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
  system_fingerprint?: string
  prompt_filter_results?: Array<{
    prompt_index: number
    content_filter_results: {
      hate?: { filtered: boolean; severity: string }
      self_harm?: { filtered: boolean; severity: string }
      sexual?: { filtered: boolean; severity: string }
      violence?: { filtered: boolean; severity: string }
      profanity?: { filtered: boolean; severity: string }
      error?: { code: string; message: string }
    }
  }>
}

export interface AzureOpenAIEmbeddingResponse {
  object: string
  data: Array<{
    object: string
    embedding: number[]
    index: number
  }>
  model: string
  usage: {
    prompt_tokens: number
    total_tokens: number
  }
}

export interface AzureOpenAIImageResponse {
  created: number
  data: Array<{
    url?: string
    b64_json?: string
    revised_prompt?: string
    content_filter_results?: {
      hate?: { filtered: boolean; severity: string }
      self_harm?: { filtered: boolean; severity: string }
      sexual?: { filtered: boolean; severity: string }
      violence?: { filtered: boolean; severity: string }
    }
  }>
}

export const defaultAzureOpenAIConfig: Partial<AzureOpenAIConfig> = {
  apiVersion: '2024-06-01',
  maxTokens: 4000,
  temperature: 0.7,
  timeout: 60000,
  enableContentFilter: true,
  enablePrivateEndpoint: false,
  enableManagedIdentity: false,
  contentFilterConfig: {
    hate: ContentFilterLevel.MEDIUM,
    selfHarm: ContentFilterLevel.MEDIUM,
    sexual: ContentFilterLevel.MEDIUM,
    violence: ContentFilterLevel.MEDIUM,
    profanity: ContentFilterLevel.LOW
  }
}

export const azureOpenAIModels = [
  'gpt-4o',
  'gpt-4o-mini',
  'gpt-4',
  'gpt-4-32k',
  'gpt-4-vision-preview',
  'gpt-4-turbo',
  'gpt-4-turbo-preview',
  'gpt-35-turbo',
  'gpt-35-turbo-16k',
  'gpt-35-turbo-instruct',
  'text-embedding-ada-002',
  'text-embedding-3-small',
  'text-embedding-3-large',
  'dall-e-2',
  'dall-e-3'
]

export class AzureOpenAIPortal extends BasePortal {
  type = PortalType.AZURE
  supportedModels = [
    ModelType.TEXT_GENERATION,
    ModelType.CHAT,
    ModelType.EMBEDDING,
    ModelType.IMAGE_GENERATION,
    ModelType.MULTIMODAL
  ]

  private endpoint: string
  private apiVersion: string
  private deploymentName: string

  constructor(config: AzureOpenAIConfig) {
    super('azure-openai', 'Azure OpenAI', '1.0.0', config)
    this.endpoint = config.endpoint
    this.apiVersion = config.apiVersion
    this.deploymentName = config.deploymentName || 'gpt-4'
  }

  async init(agent: Agent): Promise<void> {
    this.status = PortalStatus.INITIALIZING
    console.log(`🔮 Initializing Azure OpenAI portal for agent ${agent.name}`)
    
    try {
      await this.validateConfig()
      await this.healthCheck()
      this.status = PortalStatus.ACTIVE
      console.log(`✅ Azure OpenAI portal initialized for ${agent.name}`)
    } catch (error) {
      this.status = PortalStatus.ERROR
      console.error(`❌ Failed to initialize Azure OpenAI portal:`, error)
      throw error
    }
  }

  protected async validateConfig(): Promise<void> {
    const config = this.config as AzureOpenAIConfig
    
    if (!config.apiKey && !config.enableManagedIdentity) {
      throw new Error('API key is required for Azure OpenAI portal (unless using managed identity)')
    }
    
    if (!config.endpoint) {
      throw new Error('Endpoint is required for Azure OpenAI portal')
    }
    
    if (!config.apiVersion) {
      throw new Error('API version is required for Azure OpenAI portal')
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.makeRequest(`/deployments/${this.deploymentName}/completions`, {
        prompt: 'Hello',
        max_tokens: 1
      })
      return response.choices?.length > 0
    } catch (error) {
      console.error('Azure OpenAI health check failed:', error)
      return false
    }
  }

  async generateText(prompt: string, options?: TextGenerationOptions): Promise<TextGenerationResult> {
    const deploymentName = options?.model || this.deploymentName
    
    const requestBody = {
      prompt,
      max_tokens: options?.maxTokens ?? this.config.maxTokens,
      temperature: options?.temperature ?? this.config.temperature,
      top_p: options?.topP,
      frequency_penalty: options?.frequencyPenalty,
      presence_penalty: options?.presencePenalty,
      stop: options?.stop,
      stream: false,
      logit_bias: options?.logitBias
    }

    try {
      const response = await this.makeRequest(`/deployments/${deploymentName}/completions`, requestBody)
      return this.parseTextResponse(response, deploymentName)
    } catch (error) {
      throw new Error(`Azure OpenAI text generation failed: ${error}`)
    }
  }

  async generateChat(messages: ChatMessage[], options?: ChatGenerationOptions): Promise<ChatGenerationResult> {
    const deploymentName = options?.model || this.deploymentName
    
    const azureMessages = this.convertMessagesToAzureFormat(messages)
    
    const requestBody = {
      messages: azureMessages,
      max_tokens: options?.maxTokens ?? this.config.maxTokens,
      temperature: options?.temperature ?? this.config.temperature,
      top_p: options?.topP,
      frequency_penalty: options?.frequencyPenalty,
      presence_penalty: options?.presencePenalty,
      stop: options?.stop,
      stream: false,
      functions: options?.functions?.map(f => ({
        name: f.name,
        description: f.description,
        parameters: f.parameters
      })),
      function_call: options?.functionCall
    }

    try {
      const response = await this.makeRequest(`/deployments/${deploymentName}/chat/completions`, requestBody)
      return this.parseChatResponse(response, deploymentName, messages)
    } catch (error) {
      throw new Error(`Azure OpenAI chat generation failed: ${error}`)
    }
  }

  async generateEmbedding(text: string, options?: EmbeddingOptions): Promise<EmbeddingResult> {
    const config = this.config as AzureOpenAIConfig
    const deploymentName = options?.model || config.embeddingDeploymentName || 'text-embedding-ada-002'
    
    const requestBody = {
      input: text,
      user: 'symindx-agent'
    }

    try {
      const response = await this.makeRequest(`/deployments/${deploymentName}/embeddings`, requestBody)
      
      if (!response.data?.[0]?.embedding) {
        throw new Error('Invalid embedding response format')
      }

      return {
        embedding: response.data[0].embedding,
        dimensions: response.data[0].embedding.length,
        model: deploymentName,
        usage: {
          promptTokens: response.usage.prompt_tokens,
          totalTokens: response.usage.total_tokens
        }
      }
    } catch (error) {
      throw new Error(`Azure OpenAI embedding generation failed: ${error}`)
    }
  }

  async generateImage(prompt: string, options?: ImageGenerationOptions): Promise<ImageGenerationResult> {
    const config = this.config as AzureOpenAIConfig
    const deploymentName = options?.model || config.imageDeploymentName || 'dall-e-3'
    
    const requestBody = {
      prompt,
      n: options?.n || 1,
      size: options?.size || '1024x1024',
      quality: options?.quality || 'standard',
      style: options?.style || 'vivid',
      response_format: options?.responseFormat || 'url',
      user: 'symindx-agent'
    }

    try {
      const response = await this.makeRequest(`/deployments/${deploymentName}/images/generations`, requestBody)
      
      return {
        images: response.data.map((item: any) => ({
          url: item.url,
          b64_json: item.b64_json,
          revised_prompt: item.revised_prompt
        })),
        model: deploymentName,
        usage: {
          promptTokens: prompt.length,
          totalTokens: prompt.length
        }
      }
    } catch (error) {
      throw new Error(`Azure OpenAI image generation failed: ${error}`)
    }
  }

  async *streamText(prompt: string, options?: TextGenerationOptions): AsyncGenerator<string> {
    const deploymentName = options?.model || this.deploymentName
    
    const requestBody = {
      prompt,
      max_tokens: options?.maxTokens ?? this.config.maxTokens,
      temperature: options?.temperature ?? this.config.temperature,
      top_p: options?.topP,
      frequency_penalty: options?.frequencyPenalty,
      presence_penalty: options?.presencePenalty,
      stop: options?.stop,
      stream: true,
      logit_bias: options?.logitBias
    }

    try {
      const response = await this.makeStreamRequest(`/deployments/${deploymentName}/completions`, requestBody)
      
      for await (const chunk of response) {
        if (chunk.choices?.[0]?.text) {
          yield chunk.choices[0].text
        }
      }
    } catch (error) {
      throw new Error(`Azure OpenAI text streaming failed: ${error}`)
    }
  }

  async *streamChat(messages: ChatMessage[], options?: ChatGenerationOptions): AsyncGenerator<string> {
    const deploymentName = options?.model || this.deploymentName
    
    const azureMessages = this.convertMessagesToAzureFormat(messages)
    
    const requestBody = {
      messages: azureMessages,
      max_tokens: options?.maxTokens ?? this.config.maxTokens,
      temperature: options?.temperature ?? this.config.temperature,
      top_p: options?.topP,
      frequency_penalty: options?.frequencyPenalty,
      presence_penalty: options?.presencePenalty,
      stop: options?.stop,
      stream: true,
      functions: options?.functions?.map(f => ({
        name: f.name,
        description: f.description,
        parameters: f.parameters
      })),
      function_call: options?.functionCall
    }

    try {
      const response = await this.makeStreamRequest(`/deployments/${deploymentName}/chat/completions`, requestBody)
      
      for await (const chunk of response) {
        if (chunk.choices?.[0]?.delta?.content) {
          yield chunk.choices[0].delta.content
        }
      }
    } catch (error) {
      throw new Error(`Azure OpenAI chat streaming failed: ${error}`)
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
        return false
      default:
        return false
    }
  }

  private async makeRequest(endpoint: string, body: any, method: string = 'POST'): Promise<any> {
    const config = this.config as AzureOpenAIConfig
    const url = `${this.endpoint}/openai${endpoint}?api-version=${this.apiVersion}`
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }

    // Add authentication headers
    if (config.enableManagedIdentity && config.adToken) {
      headers['Authorization'] = `Bearer ${config.adToken}`
    } else if (config.apiKey) {
      headers['api-key'] = config.apiKey
    }

    // Add custom headers
    if (config.headers) {
      Object.assign(headers, config.headers)
    }

    const options: RequestInit = {
      method,
      headers
    }

    if (method !== 'GET' && body) {
      options.body = JSON.stringify(body)
    }

    const response = await fetch(url, options)

    if (!response.ok) {
      const errorText = await response.text()
      
      // Handle Azure-specific error responses
      try {
        const errorData = JSON.parse(errorText)
        if (errorData.error?.code === 'content_filter') {
          throw new Error(`Content filter violation: ${errorData.error.message}`)
        }
        throw new Error(`Azure OpenAI API error: ${errorData.error?.message || errorText}`)
      } catch (parseError) {
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }
    }

    return response.json()
  }

  private async makeStreamRequest(endpoint: string, body: any): Promise<AsyncGenerator<any>> {
    const config = this.config as AzureOpenAIConfig
    const url = `${this.endpoint}/openai${endpoint}?api-version=${this.apiVersion}`
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream'
    }

    // Add authentication headers
    if (config.enableManagedIdentity && config.adToken) {
      headers['Authorization'] = `Bearer ${config.adToken}`
    } else if (config.apiKey) {
      headers['api-key'] = config.apiKey
    }

    // Add custom headers
    if (config.headers) {
      Object.assign(headers, config.headers)
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
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

  private convertMessagesToAzureFormat(messages: ChatMessage[]): AzureOpenAIMessage[] {
    return messages.map(message => {
      const azureMessage: AzureOpenAIMessage = {
        role: this.mapRole(message.role),
        content: message.content
      }

      if (message.name) {
        azureMessage.name = message.name
      }

      if (message.functionCall) {
        azureMessage.function_call = {
          name: message.functionCall.name,
          arguments: message.functionCall.arguments
        }
      }

      if (message.toolCalls) {
        azureMessage.tool_calls = message.toolCalls.map(call => ({
          id: call.id,
          type: 'function' as const,
          function: {
            name: call.function.name,
            arguments: call.function.arguments
          }
        }))
      }

      // Handle multimodal content (images)
      if (message.attachments && message.attachments.length > 0) {
        const content: AzureOpenAIContent[] = [{ type: 'text', text: message.content }]
        
        for (const attachment of message.attachments) {
          if (attachment.type === MessageType.IMAGE && attachment.url) {
            content.push({
              type: 'image_url',
              image_url: {
                url: attachment.url,
                detail: 'auto'
              }
            })
          }
        }
        
        azureMessage.content = content
      }

      return azureMessage
    })
  }

  private mapRole(role: MessageRole): 'system' | 'user' | 'assistant' | 'tool' | 'function' {
    switch (role) {
      case MessageRole.SYSTEM:
        return 'system'
      case MessageRole.USER:
        return 'user'
      case MessageRole.ASSISTANT:
        return 'assistant'
      case MessageRole.TOOL:
        return 'tool'
      case MessageRole.FUNCTION:
        return 'function'
      default:
        return 'user'
    }
  }

  private parseTextResponse(response: AzureOpenAIResponse, model: string): TextGenerationResult {
    if (!response.choices?.[0]?.text) {
      throw new Error('Invalid response format from Azure OpenAI')
    }

    const choice = response.choices[0]
    const text = choice.text

    if (!text) {
      throw new Error('No text content in response from Azure OpenAI')
    }

    return {
      text,
      model,
      usage: {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens
      },
      finishReason: this.mapFinishReason(choice.finish_reason),
      timestamp: new Date(),
      metadata: {
        contentFilterResults: choice.content_filter_results,
        systemFingerprint: response.system_fingerprint
      }
    }
  }

  private parseChatResponse(response: AzureOpenAIResponse, model: string, originalMessages: ChatMessage[]): ChatGenerationResult {
    if (!response.choices?.[0]?.message?.content) {
      throw new Error('Invalid response format from Azure OpenAI')
    }

    const choice = response.choices[0]
    const text = choice.message?.content

    if (!text) {
      throw new Error('No text content in response from Azure OpenAI')
    }

    const message: ChatMessage = {
      role: MessageRole.ASSISTANT,
      content: text,
      timestamp: new Date()
    }

    if (choice.message?.function_call) {
      message.functionCall = {
        name: choice.message.function_call.name,
        arguments: choice.message.function_call.arguments
      }
    }

    if (choice.message?.tool_calls) {
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
      timestamp: new Date(),
      metadata: {
        contentFilterResults: choice.content_filter_results,
        systemFingerprint: response.system_fingerprint
      }
    }
  }

  private mapFinishReason(reason: string): FinishReason {
    switch (reason) {
      case 'stop':
        return FinishReason.STOP
      case 'length':
        return FinishReason.LENGTH
      case 'function_call':
        return FinishReason.FUNCTION_CALL
      case 'content_filter':
        return FinishReason.CONTENT_FILTER
      default:
        return FinishReason.STOP
    }
  }
}

export function createAzureOpenAIPortal(config: AzureOpenAIConfig): AzureOpenAIPortal {
  return new AzureOpenAIPortal({
    ...defaultAzureOpenAIConfig,
    ...config
  })
}

