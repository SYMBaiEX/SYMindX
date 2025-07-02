/**
 * Ollama Edge AI Portal
 * 
 * Local AI model execution with privacy preservation, edge computing capabilities,
 * and support for quantized models for efficient inference
 */

import { BasePortal } from '../base-portal.js'
import { 
  Portal, PortalConfig, PortalType, PortalStatus, ModelType, PortalCapability,
  TextGenerationOptions, TextGenerationResult, ChatMessage, ChatGenerationOptions, 
  ChatGenerationResult, EmbeddingOptions, EmbeddingResult, MessageRole, FinishReason
} from '../../types/portal.js'
import { Agent } from '../../types/agent.js'

export interface OllamaConfig extends PortalConfig {
  host?: string
  port?: number
  model?: string
  enableGPU?: boolean
  gpuLayers?: number
  numCtx?: number
  numPredict?: number
  numBatch?: number
  numGqa?: number
  numGpu?: number
  numThread?: number
  repeatLastN?: number
  repeatPenalty?: number
  temperature?: number
  seed?: number
  stop?: string[]
  tfsZ?: number
  numKeep?: number
  typicalP?: number
  presencePenalty?: number
  frequencyPenalty?: number
  mirostat?: number
  mirostatEta?: number
  mirostatTau?: number
  penalizeNewline?: boolean
  numa?: boolean
  lowVram?: boolean
  f16Kv?: boolean
  vocabOnly?: boolean
  useMmap?: boolean
  useMlock?: boolean
  keepAlive?: string
  format?: 'json' | 'text'
  template?: string
  system?: string
  modelfile?: string
  enablePrivacyMode?: boolean
  enableOfflineMode?: boolean
  modelQuantization?: 'q4_0' | 'q4_1' | 'q5_0' | 'q5_1' | 'q8_0' | 'fp16' | 'fp32'
  maxConcurrentRequests?: number
  requestTimeout?: number
}

export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
  images?: string[]
}

export interface OllamaRequest {
  model: string
  prompt?: string
  messages?: OllamaMessage[]
  format?: 'json' | 'text'
  options?: OllamaOptions
  system?: string
  template?: string
  context?: number[]
  stream?: boolean
  raw?: boolean
  keep_alive?: string
}

export interface OllamaOptions {
  numa?: boolean
  num_ctx?: number
  num_batch?: number
  num_gqa?: number
  num_gpu?: number
  main_gpu?: number
  low_vram?: boolean
  f16_kv?: boolean
  logits_all?: boolean
  vocab_only?: boolean
  use_mmap?: boolean
  use_mlock?: boolean
  embedding_only?: boolean
  num_thread?: number
  num_keep?: number
  seed?: number
  num_predict?: number
  top_k?: number
  top_p?: number
  tfs_z?: number
  typical_p?: number
  repeat_last_n?: number
  temperature?: number
  repeat_penalty?: number
  presence_penalty?: number
  frequency_penalty?: number
  mirostat?: number
  mirostat_tau?: number
  mirostat_eta?: number
  penalize_newline?: boolean
  stop?: string[]
}

export interface OllamaResponse {
  model: string
  created_at: string
  response?: string
  message?: {
    role: string
    content: string
  }
  done: boolean
  context?: number[]
  total_duration?: number
  load_duration?: number
  prompt_eval_count?: number
  prompt_eval_duration?: number
  eval_count?: number
  eval_duration?: number
}

export interface OllamaModelInfo {
  name: string
  model: string
  modified_at: string
  size: number
  digest: string
  details: {
    parent_model?: string
    format: string
    family: string
    families?: string[]
    parameter_size: string
    quantization_level: string
  }
}

export interface OllamaEmbeddingResponse {
  embedding: number[]
}

export interface OllamaModelStatus {
  name: string
  size: number
  loaded: boolean
  available: boolean
  pullProgress?: {
    status: string
    digest: string
    total: number
    completed: number
  }
}

export const defaultOllamaConfig: Partial<OllamaConfig> = {
  host: 'localhost',
  port: 11434,
  model: 'llama3.2',
  maxTokens: 4000,
  temperature: 0.7,
  timeout: 120000,
  enableGPU: true,
  numCtx: 4096,
  numPredict: -1,
  numBatch: 512,
  numThread: -1,
  repeatLastN: 64,
  repeatPenalty: 1.1,
  keepAlive: '5m',
  enablePrivacyMode: true,
  enableOfflineMode: true,
  modelQuantization: 'q4_0',
  maxConcurrentRequests: 4,
  requestTimeout: 300000
}

export const ollamaModels = [
  'llama3.2',
  'llama3.2:1b',
  'llama3.2:3b',
  'llama3.1',
  'llama3.1:8b',
  'llama3.1:70b',
  'llama3.1:405b',
  'llama3',
  'llama3:8b',
  'llama3:70b',
  'codellama',
  'codellama:7b',
  'codellama:13b',
  'codellama:34b',
  'mistral',
  'mistral:7b',
  'mixtral',
  'mixtral:8x7b',
  'mixtral:8x22b',
  'gemma2',
  'gemma2:2b',
  'gemma2:9b',
  'gemma2:27b',
  'qwen2',
  'qwen2:0.5b',
  'qwen2:1.5b',
  'qwen2:7b',
  'qwen2:72b',
  'phi3',
  'phi3:mini',
  'phi3:medium',
  'codeqwen',
  'deepseek-coder',
  'nomic-embed-text',
  'mxbai-embed-large',
  'all-minilm',
  'starcoder2',
  'dolphin-mistral',
  'neural-chat',
  'starling-lm',
  'solar'
]

export class OllamaPortal extends BasePortal {
  type = PortalType.OLLAMA
  supportedModels = [
    ModelType.TEXT_GENERATION,
    ModelType.CHAT,
    ModelType.CODE_GENERATION,
    ModelType.EMBEDDING
  ]

  private baseUrl: string
  private activeRequests: Set<string> = new Set()
  private modelCache: Map<string, OllamaModelInfo> = new Map()
  private lastHealthCheck: Date | null = null

  constructor(config: OllamaConfig) {
    super('ollama-local', 'Ollama Local AI', '1.0.0', config)
    const ollamaConfig = config as OllamaConfig
    this.baseUrl = `http://${ollamaConfig.host || 'localhost'}:${ollamaConfig.port || 11434}`
  }

  async init(agent: Agent): Promise<void> {
    this.status = PortalStatus.INITIALIZING
    console.log(`🔮 Initializing Ollama portal for agent ${agent.name}`)
    
    try {
      await this.validateConfig()
      await this.ensureModelAvailable()
      await this.healthCheck()
      this.status = PortalStatus.ACTIVE
      console.log(`✅ Ollama portal initialized for ${agent.name}`)
    } catch (error) {
      this.status = PortalStatus.ERROR
      console.error(`❌ Failed to initialize Ollama portal:`, error)
      throw error
    }
  }

  protected async validateConfig(): Promise<void> {
    const config = this.config as OllamaConfig
    
    if (!config.model) {
      throw new Error('Model name is required for Ollama portal')
    }
    
    // Test connection to Ollama server
    try {
      await this.makeRequest('/', {}, 'GET')
    } catch (error) {
      throw new Error(`Cannot connect to Ollama server at ${this.baseUrl}. Please ensure Ollama is running.`)
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.makeRequest('/', {}, 'GET')
      this.lastHealthCheck = new Date()
      return response.status === 'ok' || typeof response === 'string'
    } catch (error) {
      console.error('Ollama health check failed:', error)
      return false
    }
  }

  async ensureModelAvailable(): Promise<void> {
    const config = this.config as OllamaConfig
    const modelName = config.model!
    
    try {
      // Check if model is already loaded
      const models = await this.listModels()
      const modelExists = models.some(model => model.name === modelName)
      
      if (!modelExists) {
        console.log(`📥 Pulling model ${modelName}...`)
        await this.pullModel(modelName)
        console.log(`✅ Model ${modelName} pulled successfully`)
      } else {
        console.log(`✅ Model ${modelName} is available`)
      }
    } catch (error) {
      console.warn(`⚠️ Could not ensure model availability: ${error}`)
      // Continue initialization - model might be available but not listed
    }
  }

  async listModels(): Promise<OllamaModelInfo[]> {
    try {
      const response = await this.makeRequest('/api/tags', {}, 'GET')
      return response.models || []
    } catch (error) {
      console.error('Failed to list Ollama models:', error)
      return []
    }
  }

  async pullModel(modelName: string): Promise<void> {
    const requestBody = { name: modelName }
    
    try {
      // Note: This is a streaming endpoint, but we'll make a simple request
      await this.makeRequest('/api/pull', requestBody)
    } catch (error) {
      throw new Error(`Failed to pull model ${modelName}: ${error}`)
    }
  }

  async generateText(prompt: string, options?: TextGenerationOptions): Promise<TextGenerationResult> {
    const config = this.config as OllamaConfig
    const model = options?.model || config.model!
    
    const requestBody: OllamaRequest = {
      model,
      prompt,
      stream: false,
      options: this.buildOllamaOptions(options),
      system: config.system,
      template: config.template,
      keep_alive: config.keepAlive
    }

    try {
      const requestId = this.generateRequestId()
      this.activeRequests.add(requestId)
      
      const response = await this.makeRequest('/api/generate', requestBody)
      
      this.activeRequests.delete(requestId)
      return this.parseGenerateResponse(response, model)
    } catch (error) {
      throw new Error(`Ollama text generation failed: ${error}`)
    }
  }

  async generateChat(messages: ChatMessage[], options?: ChatGenerationOptions): Promise<ChatGenerationResult> {
    const config = this.config as OllamaConfig
    const model = options?.model || config.model!
    
    const ollamaMessages = this.convertMessagesToOllamaFormat(messages)
    
    const requestBody: OllamaRequest = {
      model,
      messages: ollamaMessages,
      stream: false,
      options: this.buildOllamaOptions(options),
      format: config.format,
      keep_alive: config.keepAlive
    }

    try {
      const requestId = this.generateRequestId()
      this.activeRequests.add(requestId)
      
      const response = await this.makeRequest('/api/chat', requestBody)
      
      this.activeRequests.delete(requestId)
      return this.parseChatResponse(response, model, messages)
    } catch (error) {
      throw new Error(`Ollama chat generation failed: ${error}`)
    }
  }

  async generateEmbedding(text: string, options?: EmbeddingOptions): Promise<EmbeddingResult> {
    const config = this.config as OllamaConfig
    const model = options?.model || 'nomic-embed-text'
    
    const requestBody = {
      model,
      prompt: text,
      options: {
        embedding_only: true
      }
    }

    try {
      const response = await this.makeRequest('/api/embeddings', requestBody)
      
      if (!response.embedding) {
        throw new Error('Invalid embedding response format')
      }

      return {
        embedding: response.embedding,
        dimensions: response.embedding.length,
        model,
        usage: {
          promptTokens: text.length,
          totalTokens: text.length
        }
      }
    } catch (error) {
      throw new Error(`Ollama embedding generation failed: ${error}`)
    }
  }

  async *streamText(prompt: string, options?: TextGenerationOptions): AsyncGenerator<string> {
    const config = this.config as OllamaConfig
    const model = options?.model || config.model!
    
    const requestBody: OllamaRequest = {
      model,
      prompt,
      stream: true,
      options: this.buildOllamaOptions(options),
      system: config.system,
      template: config.template,
      keep_alive: config.keepAlive
    }

    try {
      const response = await this.makeStreamRequest('/api/generate', requestBody)
      
      for await (const chunk of response) {
        if (chunk.response && !chunk.done) {
          yield chunk.response
        }
      }
    } catch (error) {
      throw new Error(`Ollama text streaming failed: ${error}`)
    }
  }

  async *streamChat(messages: ChatMessage[], options?: ChatGenerationOptions): AsyncGenerator<string> {
    const config = this.config as OllamaConfig
    const model = options?.model || config.model!
    
    const ollamaMessages = this.convertMessagesToOllamaFormat(messages)
    
    const requestBody: OllamaRequest = {
      model,
      messages: ollamaMessages,
      stream: true,
      options: this.buildOllamaOptions(options),
      format: config.format,
      keep_alive: config.keepAlive
    }

    try {
      const response = await this.makeStreamRequest('/api/chat', requestBody)
      
      for await (const chunk of response) {
        if (chunk.message?.content && !chunk.done) {
          yield chunk.message.content
        }
      }
    } catch (error) {
      throw new Error(`Ollama chat streaming failed: ${error}`)
    }
  }

  hasCapability(capability: PortalCapability): boolean {
    switch (capability) {
      case PortalCapability.TEXT_GENERATION:
      case PortalCapability.CHAT_GENERATION:
      case PortalCapability.EMBEDDING_GENERATION:
      case PortalCapability.STREAMING:
        return true
      case PortalCapability.FUNCTION_CALLING:
      case PortalCapability.IMAGE_GENERATION:
      case PortalCapability.VISION:
      case PortalCapability.AUDIO:
        return false
      default:
        return false
    }
  }

  /**
   * Get current model status and performance metrics
   */
  async getModelStatus(): Promise<OllamaModelStatus> {
    const config = this.config as OllamaConfig
    const modelName = config.model!
    
    try {
      const models = await this.listModels()
      const model = models.find(m => m.name === modelName)
      
      return {
        name: modelName,
        size: model?.size || 0,
        loaded: !!model,
        available: !!model
      }
    } catch {
      return {
        name: modelName,
        size: 0,
        loaded: false,
        available: false
      }
    }
  }

  /**
   * Get privacy and security status
   */
  getPrivacyStatus(): {
    offlineMode: boolean
    privacyMode: boolean
    dataRetention: string
    localProcessing: boolean
  } {
    const config = this.config as OllamaConfig
    
    return {
      offlineMode: config.enableOfflineMode || true,
      privacyMode: config.enablePrivacyMode || true,
      dataRetention: 'No data retention - all processing is local',
      localProcessing: true
    }
  }

  private async makeRequest(endpoint: string, body: any, method: string = 'POST'): Promise<any> {
    const config = this.config as OllamaConfig
    const url = `${this.baseUrl}${endpoint}`
    
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.headers || {})
      },
      signal: AbortSignal.timeout(config.requestTimeout || 300000)
    }

    if (method !== 'GET' && body) {
      options.body = JSON.stringify(body)
    }

    const response = await fetch(url, options)

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTTP ${response.status}: ${errorText}`)
    }

    // Handle text responses from some endpoints
    const contentType = response.headers.get('content-type')
    if (contentType?.includes('application/json')) {
      return response.json()
    } else {
      return response.text()
    }
  }

  private async makeStreamRequest(endpoint: string, body: any): Promise<AsyncGenerator<any>> {
    const config = this.config as OllamaConfig
    const url = `${this.baseUrl}${endpoint}`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.headers || {})
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(config.requestTimeout || 300000)
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

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const text = decoder.decode(value, { stream: true })
        const lines = text.split('\n').filter(line => line.trim())

        for (const line of lines) {
          try {
            const parsed = JSON.parse(line)
            yield parsed
            
            if (parsed.done) {
              return
            }
          } catch (e) {
            // Skip invalid JSON lines
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  private buildOllamaOptions(options?: TextGenerationOptions | ChatGenerationOptions): OllamaOptions {
    const config = this.config as OllamaConfig
    
    return {
      numa: config.numa,
      num_ctx: config.numCtx,
      num_batch: config.numBatch,
      num_gqa: config.numGqa,
      num_gpu: config.numGpu,
      low_vram: config.lowVram,
      f16_kv: config.f16Kv,
      use_mmap: config.useMmap,
      use_mlock: config.useMlock,
      num_thread: config.numThread,
      num_keep: config.numKeep,
      seed: config.seed,
      num_predict: options?.maxTokens ?? config.numPredict,
      top_p: options?.topP,
      temperature: options?.temperature ?? config.temperature,
      repeat_last_n: config.repeatLastN,
      repeat_penalty: config.repeatPenalty,
      presence_penalty: options?.presencePenalty ?? config.presencePenalty,
      frequency_penalty: options?.frequencyPenalty ?? config.frequencyPenalty,
      mirostat: config.mirostat,
      mirostat_tau: config.mirostatTau,
      mirostat_eta: config.mirostatEta,
      penalize_newline: config.penalizeNewline,
      stop: options?.stop ?? config.stop
    }
  }

  private convertMessagesToOllamaFormat(messages: ChatMessage[]): OllamaMessage[] {
    return messages.map(message => ({
      role: this.mapRole(message.role),
      content: message.content
    }))
  }

  private mapRole(role: MessageRole): 'system' | 'user' | 'assistant' {
    switch (role) {
      case MessageRole.SYSTEM:
        return 'system'
      case MessageRole.USER:
        return 'user'
      case MessageRole.ASSISTANT:
        return 'assistant'
      default:
        return 'user'
    }
  }

  private parseGenerateResponse(response: OllamaResponse, model: string): TextGenerationResult {
    if (!response.response) {
      throw new Error('Invalid response format from Ollama')
    }

    return {
      text: response.response,
      model,
      usage: {
        promptTokens: response.prompt_eval_count || 0,
        completionTokens: response.eval_count || 0,
        totalTokens: (response.prompt_eval_count || 0) + (response.eval_count || 0)
      },
      finishReason: response.done ? FinishReason.STOP : FinishReason.LENGTH,
      timestamp: new Date(),
      metadata: {
        totalDuration: response.total_duration,
        loadDuration: response.load_duration,
        promptEvalDuration: response.prompt_eval_duration,
        evalDuration: response.eval_duration,
        context: response.context
      }
    }
  }

  private parseChatResponse(response: OllamaResponse, model: string, originalMessages: ChatMessage[]): ChatGenerationResult {
    if (!response.message?.content) {
      throw new Error('Invalid response format from Ollama')
    }

    const text = response.message.content

    const message: ChatMessage = {
      role: MessageRole.ASSISTANT,
      content: text,
      timestamp: new Date()
    }

    return {
      text,
      model,
      message,
      usage: {
        promptTokens: response.prompt_eval_count || 0,
        completionTokens: response.eval_count || 0,
        totalTokens: (response.prompt_eval_count || 0) + (response.eval_count || 0)
      },
      finishReason: response.done ? FinishReason.STOP : FinishReason.LENGTH,
      timestamp: new Date(),
      metadata: {
        totalDuration: response.total_duration,
        loadDuration: response.load_duration,
        promptEvalDuration: response.prompt_eval_duration,
        evalDuration: response.eval_duration,
        context: response.context
      }
    }
  }

  private generateRequestId(): string {
    return `ollama-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
}

export function createOllamaPortal(config: OllamaConfig): OllamaPortal {
  return new OllamaPortal({
    ...defaultOllamaConfig,
    ...config
  })
}

