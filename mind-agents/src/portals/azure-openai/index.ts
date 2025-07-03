import { convertUsage } from '../utils.js'
/**
 * Azure OpenAI Portal
 * 
 * Enterprise-grade Azure OpenAI Service integration with enhanced security,
 * compliance features, and regional deployment options using AI SDK v5
 */

import { BasePortal } from '../base-portal.js'
import { 
  Portal, PortalConfig, PortalType, PortalStatus, ModelType, PortalCapability,
  TextGenerationOptions, TextGenerationResult, ChatMessage, ChatGenerationOptions, 
  ChatGenerationResult, EmbeddingOptions, EmbeddingResult, ImageGenerationOptions,
  ImageGenerationResult, MessageRole, MessageType, FinishReason
} from '../../types/portal.js'
import { Agent } from '../../types/agent.js'
import { createAzure } from '@ai-sdk/azure'
import { generateText as aiGenerateText, streamText as aiStreamText, embed as aiEmbed, experimental_generateImage as aiGenerateImage, CoreMessage } from 'ai'

export interface AzureOpenAIConfig extends PortalConfig {
  apiKey: string
  resourceName: string
  apiVersion?: string
  deploymentName?: string
  embeddingDeploymentName?: string
  imageDeploymentName?: string
  baseURL?: string
}

export const defaultAzureOpenAIConfig: Partial<AzureOpenAIConfig> = {
  apiVersion: '2024-06-01',
  maxTokens: 4000,
  temperature: 0.7,
  timeout: 60000
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
  type = PortalType.AZURE_OPENAI
  supportedModels = [
    ModelType.TEXT_GENERATION,
    ModelType.CHAT,
    ModelType.EMBEDDING,
    ModelType.IMAGE_GENERATION,
    ModelType.MULTIMODAL
  ]

  private azure: any
  private model: any
  private embedModel: any
  private imageModel: any

  constructor(config: AzureOpenAIConfig) {
    super('azure-openai', 'Azure OpenAI', '1.0.0', config)
    
    // Create Azure client
    this.azure = createAzure({
      apiKey: config.apiKey,
      resourceName: config.resourceName,
      apiVersion: config.apiVersion || '2024-06-01',
      baseURL: config.baseURL
    })
    
    // Create model instances
    const deploymentName = config.deploymentName || 'gpt-4'
    this.model = this.azure(deploymentName)
    
    // For embeddings
    const embeddingDeployment = config.embeddingDeploymentName || 'text-embedding-ada-002'
    this.embedModel = this.azure(embeddingDeployment)
    
    // For images
    const imageDeployment = config.imageDeploymentName || 'dall-e-3'
    this.imageModel = this.azure(imageDeployment)
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
    
    if (!config.apiKey) {
      throw new Error('API key is required for Azure OpenAI portal')
    }
    
    if (!config.resourceName) {
      throw new Error('Resource name is required for Azure OpenAI portal')
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Try a simple text generation to verify the API is working
      await aiGenerateText({
        model: this.model,
        messages: [{ role: 'user', content: 'Hello' }],
        maxOutputTokens: 10
      })
      return true
    } catch (error) {
      console.error('Azure OpenAI health check failed:', error)
      return false
    }
  }

  /**
   * Convert ChatMessage to CoreMessage format
   */
  private convertToCoreMessage(message: ChatMessage): CoreMessage {
    const coreMessage: CoreMessage = {
      role: message.role === MessageRole.USER ? 'user' : 
            message.role === MessageRole.ASSISTANT ? 'assistant' : 
            message.role === MessageRole.SYSTEM ? 'system' :
            message.role === MessageRole.TOOL || message.role === MessageRole.FUNCTION ? 'tool' :
            'user',
      content: message.content
    }

    // Handle multimodal content (images)
    if (message.attachments && message.attachments.length > 0) {
      const parts: any[] = [{ type: 'text', text: message.content }]
      
      for (const attachment of message.attachments) {
        if (attachment.type === MessageType.IMAGE && attachment.url) {
          parts.push({
            type: 'image',
            image: attachment.url
          })
        }
      }
      
      coreMessage.content = parts
    }

    return coreMessage
  }

  async generateText(prompt: string, options?: TextGenerationOptions): Promise<TextGenerationResult> {
    try {
      const { text, usage, finishReason } = await aiGenerateText({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        maxOutputTokens: options?.maxTokens ?? this.config.maxTokens,
        temperature: options?.temperature ?? this.config.temperature,
        topP: options?.topP,
        frequencyPenalty: options?.frequencyPenalty,
        presencePenalty: options?.presencePenalty,
        stopSequences: options?.stop
      })

      return {
        text,
        model: (this.config as AzureOpenAIConfig).deploymentName || 'gpt-4',
        usage: convertUsage(usage),
        finishReason: this.mapFinishReason(finishReason),
        timestamp: new Date()
      }
    } catch (error) {
      throw new Error(`Azure OpenAI text generation failed: ${error}`)
    }
  }

  async generateChat(messages: ChatMessage[], options?: ChatGenerationOptions): Promise<ChatGenerationResult> {
    try {
      const coreMessages: CoreMessage[] = messages.map(msg => this.convertToCoreMessage(msg))
      
      const { text, usage, finishReason } = await aiGenerateText({
        model: this.model,
        messages: coreMessages,
        maxOutputTokens: options?.maxTokens ?? this.config.maxTokens,
        temperature: options?.temperature ?? this.config.temperature,
        topP: options?.topP,
        frequencyPenalty: options?.frequencyPenalty,
        presencePenalty: options?.presencePenalty,
        stopSequences: options?.stop,
        tools: options?.functions ? options.functions.map(fn => ({
          type: 'function' as const,
          function: {
            name: fn.name,
            description: fn.description,
            parameters: fn.parameters
          }
        })) : undefined
      })

      const message: ChatMessage = {
        role: MessageRole.ASSISTANT,
        content: text,
        timestamp: new Date()
      }

      return {
        text,
        model: (this.config as AzureOpenAIConfig).deploymentName || 'gpt-4',
        message,
        usage: convertUsage(usage),
        finishReason: this.mapFinishReason(finishReason),
        timestamp: new Date()
      }
    } catch (error) {
      throw new Error(`Azure OpenAI chat generation failed: ${error}`)
    }
  }

  async generateEmbedding(text: string, options?: EmbeddingOptions): Promise<EmbeddingResult> {
    try {
      const { embedding, usage } = await aiEmbed({
        model: this.embedModel,
        value: text
      })

      return {
        embedding,
        dimensions: embedding.length,
        model: (this.config as AzureOpenAIConfig).embeddingDeploymentName || 'text-embedding-ada-002',
        usage: {
          promptTokens: usage?.tokens || 0,
          totalTokens: usage?.tokens || 0
        }
      }
    } catch (error) {
      throw new Error(`Azure OpenAI embedding generation failed: ${error}`)
    }
  }

  async generateImage(prompt: string, options?: ImageGenerationOptions): Promise<ImageGenerationResult> {
    try {
      const { images } = await aiGenerateImage({
        model: this.imageModel,
        prompt,
        n: options?.n || 1,
        size: options?.size || '1024x1024',
        quality: options?.quality || 'standard',
        style: options?.style || 'vivid'
      })

      return {
        images: images.map(img => ({
          url: img.url,
          revised_prompt: img.text
        })),
        model: (this.config as AzureOpenAIConfig).imageDeploymentName || 'dall-e-3',
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
    try {
      const { textStream } = await aiStreamText({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        maxOutputTokens: options?.maxTokens ?? this.config.maxTokens,
        temperature: options?.temperature ?? this.config.temperature,
        topP: options?.topP,
        frequencyPenalty: options?.frequencyPenalty,
        presencePenalty: options?.presencePenalty,
        stopSequences: options?.stop
      })

      for await (const chunk of textStream) {
        yield chunk
      }
    } catch (error) {
      throw new Error(`Azure OpenAI text streaming failed: ${error}`)
    }
  }

  async *streamChat(messages: ChatMessage[], options?: ChatGenerationOptions): AsyncGenerator<string> {
    try {
      const coreMessages: CoreMessage[] = messages.map(msg => this.convertToCoreMessage(msg))
      
      const { textStream } = await aiStreamText({
        model: this.model,
        messages: coreMessages,
        maxOutputTokens: options?.maxTokens ?? this.config.maxTokens,
        temperature: options?.temperature ?? this.config.temperature,
        topP: options?.topP,
        frequencyPenalty: options?.frequencyPenalty,
        presencePenalty: options?.presencePenalty,
        stopSequences: options?.stop,
        tools: options?.functions ? options.functions.map(fn => ({
          type: 'function' as const,
          function: {
            name: fn.name,
            description: fn.description,
            parameters: fn.parameters
          }
        })) : undefined
      })

      for await (const chunk of textStream) {
        yield chunk
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

  /**
   * Map AI SDK finish reason to our FinishReason enum
   */
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