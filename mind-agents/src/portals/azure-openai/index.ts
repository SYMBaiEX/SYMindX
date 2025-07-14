/**
 * Azure OpenAI Portal
 *
 * Enterprise-grade Azure OpenAI Service integration with enhanced security,
 * compliance features, and regional deployment options using AI SDK v5
 */

import { createAzure } from '@ai-sdk/azure';
import {
  generateText as aiGenerateText,
  streamText as aiStreamText,
  embed as aiEmbed,
  experimental_generateImage as aiGenerateImage,
} from 'ai';

import { Agent } from '../../types/agent';
import {
  PortalConfig,
  PortalType,
  PortalStatus,
  ModelType,
  PortalCapability,
  TextGenerationOptions,
  TextGenerationResult,
  ChatMessage,
  ChatGenerationOptions,
  ChatGenerationResult,
  EmbeddingOptions,
  EmbeddingResult,
  ImageGenerationOptions,
  ImageGenerationResult,
  MessageRole,
  FinishReason,
} from '../../types/portal';
import type { AIMessage as ModelMessage } from '../../types/portals/ai-sdk';
import { AISDKParameterBuilder } from '../ai-sdk-utils';
import { BasePortal } from '../base-portal';
import { convertUsage, buildAISDKParams } from '../utils';

export interface AzureOpenAIConfig extends PortalConfig {
  apiKey: string;
  resourceName: string;
  apiVersion?: string;
  deploymentName?: string;
  embeddingDeploymentName?: string;
  imageDeploymentName?: string;
  baseURL?: string;
}

export const defaultAzureOpenAIConfig: Partial<AzureOpenAIConfig> = {
  apiVersion: '2024-06-01',
  maxTokens: 4000, // Keep as config property, map to maxOutputTokens in calls
  temperature: 0.7,
  timeout: 60000,
};

export const azureOpenAIModels = [
  'gpt-4o',
  'gpt-4.1-mini',
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
  'dall-e-3',
];

export class AzureOpenAIPortal extends BasePortal {
  type = PortalType.AZURE_OPENAI;
  supportedModels = [
    ModelType.TEXT_GENERATION,
    ModelType.CHAT,
    ModelType.EMBEDDING,
    ModelType.IMAGE_GENERATION,
    ModelType.MULTIMODAL,
  ];

  private azure: ReturnType<typeof createAzure>;
  private model: ReturnType<ReturnType<typeof createAzure>>;
  private embedModel: ReturnType<ReturnType<typeof createAzure>>;
  private imageModel: ReturnType<ReturnType<typeof createAzure>>;

  constructor(config: AzureOpenAIConfig) {
    super('azure-openai', 'Azure OpenAI', '1.0.0', config);

    // Create Azure client with proper null checking
    const azureConfig = AISDKParameterBuilder.buildSafeObject({
      apiKey: config.apiKey,
      resourceName: config.resourceName,
      apiVersion: config.apiVersion || '2024-06-01',
      baseURL: config.baseURL,
    });

    this.azure = createAzure(azureConfig);

    // Create model instances
    const deploymentName = config.deploymentName || 'gpt-4';
    this.model = this.azure(deploymentName);

    // For embeddings
    const embeddingDeployment =
      config.embeddingDeploymentName || 'text-embedding-ada-002';
    this.embedModel = this.azure(embeddingDeployment);

    // For images
    const imageDeployment = config.imageDeploymentName || 'dall-e-3';
    this.imageModel = this.azure(imageDeployment);
  }

  override async init(_agent: Agent): Promise<void> {
    this.status = PortalStatus.INITIALIZING;
    // Initializing Azure OpenAI portal for agent

    try {
      await this.validateConfig();
      await this.healthCheck();
      this.status = PortalStatus.ACTIVE;
      // Azure OpenAI portal initialized successfully
    } catch (_error) {
      this.status = PortalStatus.ERROR;
      // Failed to initialize Azure OpenAI portal
      throw _error;
    }
  }

  protected override async validateConfig(): Promise<void> {
    const config = this.config as AzureOpenAIConfig;

    if (!config.apiKey) {
      throw new Error('API key is required for Azure OpenAI portal');
    }

    if (!config.resourceName) {
      throw new Error('Resource name is required for Azure OpenAI portal');
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Try a simple text generation to verify the API is working
      await aiGenerateText({
        model: this.model,
        messages: [{ role: 'user', content: 'Hello' }],
        maxOutputTokens: 10,
      });
      return true;
    } catch (_error) {
      // Azure OpenAI health check failed
      return false;
    }
  }

  /**
   * Convert ChatMessage[] to message format for AI SDK v5
   */
  private convertToModelMessages(messages: ChatMessage[]): ModelMessage[] {
    return messages.map((msg) => {
      switch (msg.role) {
        case MessageRole.SYSTEM:
          return { role: 'system', content: msg.content };
        case MessageRole.USER:
          return { role: 'user', content: msg.content };
        case MessageRole.ASSISTANT:
          return { role: 'assistant', content: msg.content };
        case MessageRole.TOOL:
          return {
            role: 'tool',
            content: [
              {
                type: 'tool-result',
                toolCallId: '',
                toolName: '',
                result: msg.content,
              },
            ],
          };
        case MessageRole.FUNCTION:
          // Convert function messages to assistant messages for compatibility
          return { role: 'assistant', content: msg.content };
        default:
          return { role: 'user', content: msg.content };
      }
    });
  }

  override async generateText(
    prompt: string,
    options?: TextGenerationOptions
  ): Promise<TextGenerationResult> {
    try {
      const params: Parameters<typeof aiGenerateText>[0] = {
        model: this.model,
        messages: [{ role: 'user' as const, content: prompt }],
      };

      const maxOutputTokens =
        options?.maxOutputTokens ?? options?.maxTokens ?? this.config.maxTokens;
      if (maxOutputTokens !== undefined) {
        params.maxOutputTokens = maxOutputTokens;
      }

      const temperature = options?.temperature ?? this.config.temperature;
      if (temperature !== undefined) {
        params.temperature = temperature;
      }

      if (options?.topP !== undefined) {
        params.topP = options.topP;
      }

      if (options?.frequencyPenalty !== undefined) {
        params.frequencyPenalty = options.frequencyPenalty;
      }

      if (options?.presencePenalty !== undefined) {
        params.presencePenalty = options.presencePenalty;
      }

      if (options?.stop !== undefined) {
        params.stopSequences = options.stop;
      }

      const { text, usage, finishReason } = await aiGenerateText(params);

      return {
        text,
        model: (this.config as AzureOpenAIConfig).deploymentName || 'gpt-4',
        usage: convertUsage(usage),
        finishReason: this.mapFinishReason(finishReason),
        timestamp: new Date(),
      };
    } catch (error) {
      throw new Error(`Azure OpenAI text generation failed: ${error}`);
    }
  }

  override async generateChat(
    messages: ChatMessage[],
    options?: ChatGenerationOptions
  ): Promise<ChatGenerationResult> {
    try {
      const modelMessages = this.convertToModelMessages(messages);

      const baseParams = {
        model: this.model,
        messages: modelMessages,
      };

      const params = buildAISDKParams(baseParams, {
        maxOutputTokens:
          options?.maxOutputTokens ??
          options?.maxTokens ??
          this.config.maxTokens,
        temperature: options?.temperature ?? this.config.temperature,
        topP: options?.topP,
        frequencyPenalty: options?.frequencyPenalty,
        presencePenalty: options?.presencePenalty,
        stopSequences: options?.stop,
        tools: options?.tools,
      });

      const { text, usage, finishReason } = await aiGenerateText(params);

      const message: ChatMessage = {
        role: MessageRole.ASSISTANT,
        content: text,
        timestamp: new Date(),
      };

      return {
        text,
        model: (this.config as AzureOpenAIConfig).deploymentName || 'gpt-4',
        message,
        usage: convertUsage(usage),
        finishReason: this.mapFinishReason(finishReason),
        timestamp: new Date(),
      };
    } catch (error) {
      throw new Error(`Azure OpenAI chat generation failed: ${error}`);
    }
  }

  override async generateEmbedding(
    text: string,
    _options?: EmbeddingOptions
  ): Promise<EmbeddingResult> {
    try {
      const { embedding, usage } = await aiEmbed({
        model: this.embedModel,
        value: text,
      });

      return {
        embedding,
        dimensions: embedding.length,
        model:
          (this.config as AzureOpenAIConfig).embeddingDeploymentName ||
          'text-embedding-ada-002',
        usage: {
          promptTokens: usage?.tokens || 0,
          totalTokens: usage?.tokens || 0,
        },
      };
    } catch (error) {
      throw new Error(`Azure OpenAI embedding generation failed: ${error}`);
    }
  }

  override async generateImage(
    prompt: string,
    options?: ImageGenerationOptions
  ): Promise<ImageGenerationResult> {
    try {
      const { images } = await aiGenerateImage({
        model: this.imageModel,
        prompt,
        n: options?.n || 1,
        size: (options?.size || '1024x1024') as `${number}x${number}`,
        aspectRatio: '1:1',
      });

      return {
        images: images.map((img) => ({
          url:
            'url' in img && typeof img.url === 'string' ? img.url : undefined,
          b64_json:
            'base64' in img && typeof img.base64 === 'string'
              ? img.base64
              : undefined,
        })),
        model:
          (this.config as AzureOpenAIConfig).imageDeploymentName || 'dall-e-3',
        usage: {
          promptTokens: prompt.length,
          totalTokens: prompt.length,
        },
      };
    } catch (error) {
      throw new Error(`Azure OpenAI image generation failed: ${error}`);
    }
  }

  override async *streamText(
    prompt: string,
    options?: TextGenerationOptions
  ): AsyncGenerator<string> {
    try {
      const baseParams = {
        model: this.model,
        messages: [{ role: 'user' as const, content: prompt }],
      };

      const params = buildAISDKParams(baseParams, {
        maxOutputTokens:
          options?.maxOutputTokens ??
          options?.maxTokens ??
          this.config.maxTokens,
        temperature: options?.temperature ?? this.config.temperature,
        topP: options?.topP,
        frequencyPenalty: options?.frequencyPenalty,
        presencePenalty: options?.presencePenalty,
        stopSequences: options?.stop,
      });

      const { textStream } = await aiStreamText(params);

      for await (const chunk of textStream) {
        yield chunk;
      }
    } catch (error) {
      throw new Error(`Azure OpenAI text streaming failed: ${error}`);
    }
  }

  override async *streamChat(
    messages: ChatMessage[],
    options?: ChatGenerationOptions
  ): AsyncGenerator<string> {
    try {
      const modelMessages = this.convertToModelMessages(messages);

      const baseParams = {
        model: this.model,
        messages: modelMessages,
      };

      const streamParams = AISDKParameterBuilder.buildChatGenerationParams(
        baseParams,
        options,
        AISDKParameterBuilder.getProviderDefaults('azure-openai')
      );

      const { textStream } = await aiStreamText(streamParams);

      for await (const chunk of textStream) {
        yield chunk;
      }
    } catch (error) {
      throw new Error(`Azure OpenAI chat streaming failed: ${error}`);
    }
  }

  override hasCapability(capability: PortalCapability): boolean {
    switch (capability) {
      case PortalCapability.TEXT_GENERATION:
      case PortalCapability.CHAT_GENERATION:
      case PortalCapability.EMBEDDING_GENERATION:
      case PortalCapability.IMAGE_GENERATION:
      case PortalCapability.STREAMING:
      case PortalCapability.FUNCTION_CALLING:
      case PortalCapability.VISION:
        return true;
      case PortalCapability.AUDIO:
        return false;
      default:
        return false;
    }
  }

  /**
   * Map AI SDK finish reason to our FinishReason enum
   */
  private mapFinishReason(reason?: string): FinishReason {
    switch (reason) {
      case 'stop':
        return FinishReason.STOP;
      case 'length':
        return FinishReason.LENGTH;
      case 'content-filter':
        return FinishReason.CONTENT_FILTER;
      case 'tool-calls':
      case 'function-call':
        return FinishReason.FUNCTION_CALL;
      default:
        return FinishReason.STOP;
    }
  }
}

export function createAzureOpenAIPortal(
  config: AzureOpenAIConfig
): AzureOpenAIPortal {
  return new AzureOpenAIPortal({
    ...defaultAzureOpenAIConfig,
    ...config,
  });
}
