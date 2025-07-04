import { convertUsage } from '../utils.js'
/**
 * Vercel AI SDK Portal
 * 
 * Comprehensive AI portal providing unified access to 20+ AI providers through
 * the Vercel AI SDK's powerful abstraction layer with advanced features
 */

import { BasePortal } from '../base-portal.js'
import { 
  PortalConfig, PortalType, PortalStatus, ModelType, PortalCapability,
  TextGenerationOptions, TextGenerationResult, ChatMessage, ChatGenerationOptions, 
  ChatGenerationResult, EmbeddingOptions, EmbeddingResult, ImageGenerationOptions, 
  ImageGenerationResult, FinishReason, MessageRole
} from '../../types/portal.js'
import { Agent } from '../../types/agent.js'
import { 
  generateText, 
  streamText, 
  embed,
  experimental_generateImage as generateImage,
  tool,
  createProviderRegistry,
  type LanguageModel,
  type EmbeddingModel,
  type ImageModel
} from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createGroq } from '@ai-sdk/groq'
import { createCohere } from '@ai-sdk/cohere'
import { createPerplexity } from '@ai-sdk/perplexity'
import { z } from 'zod'

export interface VercelAIConfig extends PortalConfig {
  providers: ProviderConfig[]
  defaultProvider?: string
  defaultModel?: string
  enabledProviders?: string[]
  providerRegistry?: any
  tools?: ToolDefinition[]
  maxRetries?: number
  retryDelay?: number
}

export interface ProviderConfig {
  name: string
  type: 'openai' | 'anthropic' | 'google' | 'mistral' | 'groq' | 'togetherai' | 'cohere' | 'perplexity' | 'fireworks' | 'deepinfra' | 'replicate' | 'custom'
  apiKey?: string
  baseUrl?: string
  models?: ModelConfig[]
  enabled?: boolean
  settings?: Record<string, any>
}

export interface ModelConfig {
  id: string
  name: string
  type: 'text' | 'chat' | 'embedding' | 'image'
  capabilities: string[]
  maxTokens?: number
  supportsStreaming?: boolean
  supportsTools?: boolean
  supportsVision?: boolean
}

export interface ToolDefinition {
  name: string
  description: string
  parameters: z.ZodSchema
  execute: (args: any) => Promise<any>
}

export const defaultVercelConfig: Partial<VercelAIConfig> = {
  maxTokens: 4096, // Keep as config property, map to maxOutputTokens in calls
  temperature: 0.7,
  timeout: 60000,
  maxRetries: 3,
  retryDelay: 1000,
  enabledProviders: ['openai', 'anthropic', 'google'],
  defaultProvider: 'openai',
  defaultModel: 'gpt-4o-mini'
}

export const supportedProviders = [
  'openai',
  'anthropic', 
  'google',
  'mistral',
  'groq',
  'togetherai',
  'cohere',
  'perplexity',
  'fireworks',
  'deepinfra',
  'replicate'
]

export class VercelAIPortal extends BasePortal {
  type = PortalType.VERCEL_AI
  supportedModels = [
    ModelType.TEXT_GENERATION,
    ModelType.CHAT, 
    ModelType.MULTIMODAL,
    ModelType.EMBEDDING,
    ModelType.CODE_GENERATION,
    ModelType.IMAGE_GENERATION
  ]

  private registry: any
  private providers: Map<string, any> = new Map()
  private tools: Map<string, ToolDefinition> = new Map()
  private enabledProviders: Set<string> = new Set()

  constructor(config: VercelAIConfig) {
    super('vercel-ai', 'Vercel AI SDK', '1.0.0', config)
    this.initializeProviders(config)
    this.initializeTools(config.tools || [])
    this.setupProviderRegistry()
  }

  protected getDefaultModel(type: 'chat' | 'tool' | 'embedding' | 'image'): string {
    const config = this.config as VercelAIConfig
    const defaultProvider = config.defaultProvider || 'openai'
    
    switch (type) {
      case 'chat': return `${defaultProvider}:${config.defaultModel || 'gpt-4o-mini'}`
      case 'tool': return `${defaultProvider}:gpt-4o-mini`
      case 'embedding': 
        if (defaultProvider === 'openai') return 'openai:text-embedding-3-small'
        if (defaultProvider === 'cohere') return 'cohere:embed-english-v3.0'
        return 'openai:text-embedding-3-small'
      case 'image':
        if (defaultProvider === 'openai') return 'openai:dall-e-3'
        if (defaultProvider === 'replicate') return 'replicate:black-forest-labs/flux-schnell'
        return 'openai:dall-e-3'
      default: return `${defaultProvider}:${config.defaultModel || 'gpt-4o-mini'}`
    }
  }

  private initializeProviders(config: VercelAIConfig): void {
    const enabledProviders = config.enabledProviders || supportedProviders
    
    for (const providerName of enabledProviders) {
      this.enabledProviders.add(providerName)
      
      try {
        let provider: any
        const providerConfig = config.providers?.find(p => p.name === providerName)
        
        switch (providerName) {
          case 'openai':
            provider = createOpenAI({
              apiKey: providerConfig?.apiKey || process.env.OPENAI_API_KEY
            })
            break
          case 'anthropic': 
            provider = createAnthropic({
              apiKey: providerConfig?.apiKey || process.env.ANTHROPIC_API_KEY
            })
            break
          case 'groq':
            provider = createGroq({
              apiKey: providerConfig?.apiKey || process.env.GROQ_API_KEY
            })
            break
          case 'cohere':
            provider = createCohere({
              apiKey: providerConfig?.apiKey || process.env.COHERE_API_KEY
            })
            break
          case 'perplexity':
            provider = createPerplexity({
              apiKey: providerConfig?.apiKey || process.env.PERPLEXITY_API_KEY
            })
            break
          default:
            console.warn(`Unknown provider: ${providerName}`)
            continue
        }
        
        if (provider) {
          this.providers.set(providerName, provider)
          console.log(`✅ Initialized ${providerName} provider`)
        }
      } catch (error) {
        console.error(`❌ Failed to initialize ${providerName} provider:`, error)
      }
    }
  }

  private initializeTools(tools: ToolDefinition[]): void {
    for (const toolDef of tools) {
      this.tools.set(toolDef.name, toolDef)
    }
  }

  private setupProviderRegistry(): void {
    const registryConfig: Record<string, any> = {}
    
    for (const [name, provider] of Array.from(this.providers.entries())) {
      registryConfig[name] = provider
    }
    
    this.registry = createProviderRegistry(registryConfig)
  }

  async init(agent: Agent): Promise<void> {
    this.status = PortalStatus.INITIALIZING
    console.log(`🔮 Initializing Vercel AI SDK portal for agent ${agent.name}`)
    
    try {
      await this.validateConfig()
      await this.healthCheck()
      this.status = PortalStatus.ACTIVE
      console.log(`✅ Vercel AI SDK portal initialized for ${agent.name} with ${this.providers.size} providers`)
    } catch (error) {
      this.status = PortalStatus.ERROR
      console.error(`❌ Failed to initialize Vercel AI SDK portal:`, error)
      throw error
    }
  }

  protected async validateConfig(): Promise<void> {
    if (this.providers.size === 0) {
      throw new Error('At least one provider must be configured for Vercel AI SDK portal')
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const model = this.resolveModel('tool')
      const { text } = await generateText({
        model: this.getLanguageModel(model),
        prompt: 'Hello',
        maxOutputTokens: 10
      })
      return !!text
    } catch (error) {
      console.error('Vercel AI SDK health check failed:', error)
      return false
    }
  }

  private getLanguageModel(modelSpec: string): LanguageModel {
    if (modelSpec.includes(':')) {
      const [providerName, modelId] = modelSpec.split(':')
      const provider = this.providers.get(providerName)
      if (provider) {
        return provider(modelId)
      }
    }
    
    // Fallback to registry
    if (this.registry) {
      return this.registry.languageModel(modelSpec)
    }
    
    throw new Error(`Model not found: ${modelSpec}`)
  }

  private getEmbeddingModel(modelSpec: string): EmbeddingModel<string> {
    if (modelSpec.includes(':')) {
      const [providerName, modelId] = modelSpec.split(':')
      const provider = this.providers.get(providerName)
      if (provider && provider.textEmbeddingModel) {
        return provider.textEmbeddingModel(modelId)
      }
    }
    
    throw new Error(`Embedding model not found: ${modelSpec}`)
  }

  private getImageModel(modelSpec: string): ImageModel {
    if (modelSpec.includes(':')) {
      const [providerName, modelId] = modelSpec.split(':')
      const provider = this.providers.get(providerName)
      if (provider && provider.imageModel) {
        return provider.imageModel(modelId)
      }
    }
    
    throw new Error(`Image model not found: ${modelSpec}`)
  }

  async generateText(prompt: string, options?: TextGenerationOptions): Promise<TextGenerationResult> {
    const model = options?.model || this.resolveModel('chat')
    
    try {
      const toolsToUse = this.buildTools()
      
      const { text, usage, finishReason } = await generateText({
        model: this.getLanguageModel(model),
        prompt,
        maxOutputTokens: options?.maxTokens || this.config.maxTokens,
        temperature: options?.temperature || this.config.temperature,
        topP: options?.topP,
        frequencyPenalty: options?.frequencyPenalty,
        presencePenalty: options?.presencePenalty,
        stopSequences: options?.stop,
        tools: toolsToUse.size > 0 ? Object.fromEntries(toolsToUse) : undefined
      })
      
      return {
        text,
        model,
        usage: convertUsage(usage),
        finishReason: this.mapFinishReason(finishReason),
        timestamp: new Date()
      }
    } catch (error) {
      throw new Error(`Vercel AI SDK text generation failed: ${error}`)
    }
  }

  async generateChat(messages: ChatMessage[], options?: ChatGenerationOptions): Promise<ChatGenerationResult> {
    const model = options?.model || this.resolveModel('chat')
    
    try {
      const modelMessages = this.convertToModelMessages(messages)
      const toolsToUse = this.buildTools()
      
      const { text, usage, finishReason } = await generateText({
        model: this.getLanguageModel(model),
        messages: modelMessages,
        maxOutputTokens: options?.maxTokens || this.config.maxTokens,
        temperature: options?.temperature || this.config.temperature,
        topP: options?.topP,
        frequencyPenalty: options?.frequencyPenalty,
        presencePenalty: options?.presencePenalty,
        stopSequences: options?.stop,
        tools: toolsToUse.size > 0 ? Object.fromEntries(toolsToUse) : undefined
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
      throw new Error(`Vercel AI SDK chat generation failed: ${error}`)
    }
  }

  async generateEmbedding(text: string, options?: EmbeddingOptions): Promise<EmbeddingResult> {
    const model = options?.model || this.resolveModel('embedding')
    
    try {
      const { embedding, usage } = await embed({
        model: this.getEmbeddingModel(model),
        value: text
      })
      
      return {
        embedding,
        dimensions: embedding.length,
        model,
        usage: usage ? {
          promptTokens: usage.tokens,
          totalTokens: usage.tokens
        } : undefined
      }
    } catch (error) {
      throw new Error(`Vercel AI SDK embedding generation failed: ${error}`)
    }
  }

  async generateImage(prompt: string, options?: ImageGenerationOptions): Promise<ImageGenerationResult> {
    const model = options?.model || this.resolveModel('image')
    
    try {
      const { image } = await generateImage({
        model: this.getImageModel(model),
        prompt,
        size: options?.size as `${number}x${number}` | undefined,
        n: options?.n || 1
      })
      
      return {
        images: [{ url: (image as any).url || (image as any).b64_json || 'data:image/png;base64,' + image }],
        model,
        usage: {
          promptTokens: prompt.length,
          totalTokens: prompt.length
        }
      }
    } catch (error) {
      throw new Error(`Vercel AI SDK image generation failed: ${error}`)
    }
  }

  async *streamText(prompt: string, options?: TextGenerationOptions): AsyncGenerator<string> {
    const model = options?.model || this.resolveModel('chat')
    
    try {
      const toolsToUse = this.buildTools()
      
      const { textStream } = await streamText({
        model: this.getLanguageModel(model),
        prompt,
        maxOutputTokens: options?.maxTokens || this.config.maxTokens,
        temperature: options?.temperature || this.config.temperature,
        topP: options?.topP,
        frequencyPenalty: options?.frequencyPenalty,
        presencePenalty: options?.presencePenalty,
        stopSequences: options?.stop,
        tools: toolsToUse.size > 0 ? Object.fromEntries(toolsToUse) : undefined
      })
      
      for await (const textPart of textStream) {
        yield textPart
      }
    } catch (error) {
      throw new Error(`Vercel AI SDK text streaming failed: ${error}`)
    }
  }

  async *streamChat(messages: ChatMessage[], options?: ChatGenerationOptions): AsyncGenerator<string> {
    const model = options?.model || this.resolveModel('chat')
    
    try {
      const modelMessages = this.convertToModelMessages(messages)
      const toolsToUse = this.buildTools()
      
      const { textStream } = await streamText({
        model: this.getLanguageModel(model),
        messages: modelMessages,
        maxOutputTokens: options?.maxTokens || this.config.maxTokens,
        temperature: options?.temperature || this.config.temperature,
        topP: options?.topP,
        frequencyPenalty: options?.frequencyPenalty,
        presencePenalty: options?.presencePenalty,
        stopSequences: options?.stop,
        tools: toolsToUse.size > 0 ? Object.fromEntries(toolsToUse) : undefined
      })
      
      for await (const textPart of textStream) {
        yield textPart
      }
    } catch (error) {
      throw new Error(`Vercel AI SDK chat streaming failed: ${error}`)
    }
  }

  hasCapability(capability: PortalCapability): boolean {
    switch (capability) {
      case PortalCapability.TEXT_GENERATION:
      case PortalCapability.CHAT_GENERATION:
      case PortalCapability.EMBEDDING_GENERATION:
      case PortalCapability.STREAMING:
      case PortalCapability.FUNCTION_CALLING:
      case PortalCapability.TOOL_USAGE:
      case PortalCapability.EVALUATION:
        return true
      case PortalCapability.IMAGE_GENERATION:
        return this.providers.has('openai') || this.providers.has('replicate') || this.providers.has('deepinfra')
      case PortalCapability.VISION:
        return this.providers.has('openai') || this.providers.has('anthropic') || this.providers.has('google')
      case PortalCapability.AUDIO:
        return false // Not yet supported
      default:
        return false
    }
  }

  private convertToModelMessages(messages: ChatMessage[]) {
    return messages.map(msg => {
      const message = {
        role: msg.role,
        content: msg.content
      }

      // Handle attachments for multimodal support
      if (msg.attachments && msg.attachments.length > 0) {
        const content: any[] = [{ type: 'text', text: msg.content }]
        
        for (const attachment of msg.attachments) {
          if (attachment.type === 'image') {
            if (attachment.data) {
              content.push({
                type: 'image',
                image: attachment.data,
                mimeType: attachment.mimeType
              })
            } else if (attachment.url) {
              content.push({
                type: 'image',
                image: new URL(attachment.url)
              })
            }
          }
        }
        
        message.content = content
      }

      return message
    })
  }

  private buildTools(): Map<string, any> {
    const toolsMap = new Map()
    
    for (const [name, toolDef] of Array.from(this.tools.entries())) {
      toolsMap.set(name, tool({
        description: toolDef.description,
        parameters: toolDef.parameters,
        execute: toolDef.execute
      }))
    }
    
    return toolsMap
  }

  private mapFinishReason(reason?: string): FinishReason {
    switch (reason) {
      case 'stop':
        return FinishReason.STOP
      case 'length':
        return FinishReason.LENGTH
      case 'tool-calls':
      case 'function_call':
        return FinishReason.FUNCTION_CALL
      case 'content-filter':
        return FinishReason.CONTENT_FILTER
      case 'error':
        return FinishReason.ERROR
      case 'cancelled':
        return FinishReason.CANCELLED
      default:
        return FinishReason.STOP
    }
  }

  // Method to add a new tool at runtime
  addTool(toolDef: ToolDefinition): void {
    this.tools.set(toolDef.name, toolDef)
  }

  // Method to remove a tool
  removeTool(name: string): void {
    this.tools.delete(name)
  }

  // Method to list available models from all providers
  getAvailableModels(): Record<string, string[]> {
    const models: Record<string, string[]> = {}
    
    for (const providerName of Array.from(this.enabledProviders)) {
      models[providerName] = this.getProviderModels(providerName)
    }
    
    return models
  }

  private getProviderModels(providerName: string): string[] {
    // This would typically come from the provider's model list
    // For now, returning common models for each provider
    const commonModels: Record<string, string[]> = {
      openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
      anthropic: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'],
      google: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-pro'],
      mistral: ['mistral-large-latest', 'mistral-medium-latest', 'mistral-small-latest'],
      groq: ['llama-3.1-8b-instant', 'mixtral-8x7b-32768', 'gemma-7b-it'],
      togetherai: ['meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo', 'mistralai/Mixtral-8x7B-Instruct-v0.1'],
      cohere: ['command-r-plus', 'command-r', 'command'],
      perplexity: ['llama-3.1-sonar-small-128k-online', 'llama-3.1-sonar-large-128k-online'],
      fireworks: ['accounts/fireworks/models/llama-v3p1-8b-instruct', 'accounts/fireworks/models/mixtral-8x7b-instruct'],
      deepinfra: ['meta-llama/Meta-Llama-3.1-8B-Instruct', 'mistralai/Mixtral-8x7B-Instruct-v0.1'],
      replicate: ['meta/meta-llama-3.1-8b-instruct', 'mistralai/mixtral-8x7b-instruct-v0.1']
    }
    
    return commonModels[providerName] || []
  }
}

export function createVercelAIPortal(config: VercelAIConfig): VercelAIPortal {
  return new VercelAIPortal({
    ...defaultVercelConfig,
    ...config
  })
}