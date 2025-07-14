/**
 * OpenAI Portal Implementation
 *
 * This portal provides integration with OpenAI's API using the Vercel AI SDK v5.
 * It supports text generation, chat completion, embeddings, and image generation.
 */

import { openai } from '@ai-sdk/openai';
import {
  generateText,
  streamText,
  embed,
  type LanguageModel,
  type ModelMessage,
} from 'ai';

import {
  PortalConfig,
  TextGenerationOptions,
  TextGenerationResult,
  ChatMessage,
  ChatGenerationOptions,
  ChatGenerationResult,
  EmbeddingOptions,
  EmbeddingResult,
  ImageGenerationOptions,
  ImageGenerationResult,
  PortalCapability,
  MessageRole,
  FinishReason,
  PortalType,
  ModelType,
} from '../../types/portal';
import { AISDKParameterBuilder } from '../ai-sdk-utils';
import { BasePortal } from '../base-portal';
import { convertUsage, buildAISDKParams } from '../utils';

export interface OpenAIConfig extends PortalConfig {
  model?: string;
  chatModel?: string; // Specific model for chat operations
  toolModel?: string; // Faster model for tool/function calling
  embeddingModel?: string;
  imageModel?: string;
  organization?: string;
  baseURL?: string;
}

// Using shared convertUsage function from utils

export class OpenAIPortal extends BasePortal {
  type: PortalType = PortalType.OPENAI;
  supportedModels: ModelType[] = [
    ModelType.TEXT_GENERATION,
    ModelType.CHAT,
    ModelType.EMBEDDING,
    ModelType.IMAGE_GENERATION,
    ModelType.MULTIMODAL,
    ModelType.CODE_GENERATION,
  ];
  private openaiProvider: any;

  constructor(config: OpenAIConfig) {
    super('openai', 'OpenAI', '1.0.0', config);

    // Create OpenAI provider with proper configuration
    this.openaiProvider = openai;
  }

  /**
   * Get language model instance
   */
  private getLanguageModel(modelId?: string): LanguageModel {
    const model =
      modelId || (this.config as OpenAIConfig).model || 'gpt-4.1-mini';
    const config = this.config as OpenAIConfig;

    const configObj: any = {};
    const apiKey = config.apiKey || process.env.OPENAI_API_KEY;
    if (apiKey) configObj.apiKey = apiKey;
    if (config.organization) configObj.organization = config.organization;
    if (config.baseURL) configObj.baseURL = config.baseURL;

    const providerSettings = AISDKParameterBuilder.buildProviderConfig(
      {},
      configObj
    );

    return this.openaiProvider(model, providerSettings);
  }

  /**
   * Convert ChatMessage array to message format for AI SDK v5
   */
  private convertToModelMessages(messages: ChatMessage[]): ModelMessage[] {
    return messages.map((msg) => {
      switch (msg.role) {
        case MessageRole.SYSTEM:
          return { role: 'system', content: msg.content };

        case MessageRole.USER: {
          // Handle attachments for multimodal support
          if (msg.attachments && msg.attachments.length > 0) {
            const content: any[] = [{ type: 'text', text: msg.content }];

            for (const attachment of msg.attachments) {
              if (attachment.type === 'image') {
                if (attachment.data) {
                  content.push({
                    type: 'image',
                    image: attachment.data,
                    mediaType: attachment.mimeType,
                  });
                } else if (attachment.url) {
                  content.push({
                    type: 'image',
                    image: new URL(attachment.url),
                  });
                }
              }
            }

            return { role: 'user', content };
          } else {
            return { role: 'user', content: msg.content };
          }
        }

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

  /**
   * Generate text using OpenAI's completion API
   */
  override async generateText(
    prompt: string,
    options?: TextGenerationOptions
  ): Promise<TextGenerationResult> {
    try {
      const model =
        options?.model || (this.config as OpenAIConfig).model || 'gpt-4.1-mini';

      const baseParams = {
        model: this.getLanguageModel(model),
        prompt,
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
      });

      const result = await generateText(params);

      return {
        text: result.text,
        usage: convertUsage(result.usage),
        metadata: {
          model,
          provider: 'openai',
        },
      };
    } catch (error) {
      console.error('OpenAI text generation error:', error);
      throw new Error(`OpenAI text generation failed: ${error}`);
    }
  }

  /**
   * Generate chat response using OpenAI's chat completion API
   */
  override async generateChat(
    messages: ChatMessage[],
    options?: ChatGenerationOptions
  ): Promise<ChatGenerationResult> {
    try {
      // Intelligent model selection based on use case
      let model: string;

      if (options?.model) {
        // Use explicitly specified model
        model = options.model;
      } else if (options?.functions && options.functions.length > 0) {
        // Use tool model for function calling (faster, cheaper)
        model = (this.config as OpenAIConfig).toolModel || 'gpt-4.1-mini';
      } else {
        // Use chat model for regular conversations
        model =
          (this.config as OpenAIConfig).chatModel ||
          (this.config as OpenAIConfig).model ||
          'gpt-4.1-mini';
      }

      const modelMessages = this.convertToModelMessages(messages);

      const baseOptions = {
        model: this.getLanguageModel(model),
        messages: modelMessages,
      };

      const generateOptions = buildAISDKParams(baseOptions, {
        maxOutputTokens:
          options?.maxOutputTokens ??
          options?.maxTokens ??
          this.config.maxTokens,
        temperature: options?.temperature ?? this.config.temperature,
        topP: options?.topP,
        frequencyPenalty: options?.frequencyPenalty,
        presencePenalty: options?.presencePenalty,
      });

      // Add tools if provided (native AI SDK v5 tools)
      if (options?.tools) {
        // Native AI SDK v5 MCP tools - pass directly
        (generateOptions as any).tools = options.tools;
        (generateOptions as any).maxSteps = 5; // Enable multi-step tool execution
      }

      const result = await generateText(generateOptions);

      return {
        text: result.text,
        message: {
          role: MessageRole.ASSISTANT,
          content: result.text,
        },
        usage: convertUsage(result.usage),
        finishReason: this.mapFinishReason(result.finishReason),
        metadata: {
          model,
          provider: 'openai',
        },
      };
    } catch (error) {
      console.error('OpenAI chat generation error:', error);
      throw new Error(`OpenAI chat generation failed: ${error}`);
    }
  }

  /**
   * Generate embeddings using OpenAI's embedding API
   */
  override async generateEmbedding(
    _text: string,
    _options?: EmbeddingOptions
  ): Promise<EmbeddingResult> {
    try {
      const model =
        _options?.model ||
        (this.config as OpenAIConfig).embeddingModel ||
        'text-embedding-3-large';

      const { embedding, usage } = await embed({
        model: this.openaiProvider.embedding(model),
        value: _text,
      });

      return {
        embedding,
        dimensions: embedding.length,
        model,
        usage: {
          promptTokens: usage?.tokens || 0,
          totalTokens: usage?.tokens || 0,
        },
        metadata: {
          provider: 'openai',
        },
      };
    } catch (error) {
      console.error('OpenAI embedding generation error:', error);
      throw new Error(`OpenAI embedding generation failed: ${error}`);
    }
  }

  /**
   * Generate images using OpenAI's DALL-E API
   */
  override async generateImage(
    _prompt: string,
    _options?: ImageGenerationOptions
  ): Promise<ImageGenerationResult> {
    try {
      const model =
        _options?.model ||
        (this.config as OpenAIConfig).imageModel ||
        'dall-e-3';

      const response = await fetch(
        'https://api.openai.com/v1/images/generations',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            prompt: _prompt,
            size: _options?.size || '1024x1024',
            quality: _options?.quality || 'standard',
            response_format: _options?.responseFormat || 'url',
            n: _options?.n || 1,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        images: data.data.map((img: any) => ({
          url: img.url,
          b64_json: img.b64_json,
        })),
        model,
        metadata: {
          provider: 'openai',
          revised_prompt: data.data[0]?.revised_prompt,
        },
      };
    } catch (error) {
      console.error('OpenAI image generation error:', error);
      throw new Error(`OpenAI image generation failed: ${error}`);
    }
  }

  /**
   * Stream text generation for real-time responses
   */
  override async *streamText(
    prompt: string,
    options?: TextGenerationOptions
  ): AsyncGenerator<string> {
    try {
      const model =
        options?.model || (this.config as OpenAIConfig).model || 'gpt-4.1-mini';

      const baseParams = {
        model: this.getLanguageModel(model),
        prompt,
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
      });

      const { textStream } = await streamText(params);

      for await (const delta of textStream) {
        yield delta;
      }
    } catch (error) {
      console.error('OpenAI stream text error:', error);
      throw new Error(`OpenAI stream text failed: ${error}`);
    }
  }

  /**
   * Stream chat generation for real-time responses
   */
  override async *streamChat(
    messages: ChatMessage[],
    options?: ChatGenerationOptions
  ): AsyncGenerator<string> {
    try {
      // Intelligent model selection for streaming
      let model: string;

      if (options?.model) {
        model = options.model;
      } else if (options?.functions && options.functions.length > 0) {
        model = (this.config as OpenAIConfig).toolModel || 'gpt-4.1-mini';
      } else {
        model =
          (this.config as OpenAIConfig).chatModel ||
          (this.config as OpenAIConfig).model ||
          'gpt-4.1-mini';
      }

      const modelMessages = this.convertToModelMessages(messages);

      const baseOptions = {
        model: this.getLanguageModel(model),
        messages: modelMessages,
      };

      const streamOptions = buildAISDKParams(baseOptions, {
        maxOutputTokens:
          options?.maxOutputTokens ??
          options?.maxTokens ??
          this.config.maxTokens,
        temperature: options?.temperature ?? this.config.temperature,
        topP: options?.topP,
        frequencyPenalty: options?.frequencyPenalty,
        presencePenalty: options?.presencePenalty,
      });

      // Add tools if provided
      if (options?.tools) {
        (streamOptions as any).tools = options.tools;
        (streamOptions as any).maxSteps = 5; // Enable multi-step tool execution for streaming
      }

      const { textStream } = await streamText(streamOptions);

      for await (const delta of textStream) {
        yield delta;
      }
    } catch (error) {
      console.error('OpenAI stream chat error:', error);
      throw new Error(`OpenAI stream chat failed: ${error}`);
    }
  }

  /**
   * Check if the portal supports a specific capability
   */
  override hasCapability(capability: PortalCapability): boolean {
    switch (capability) {
      case PortalCapability.TEXT_GENERATION:
      case PortalCapability.CHAT_GENERATION:
      case PortalCapability.EMBEDDING_GENERATION:
      case PortalCapability.IMAGE_GENERATION:
      case PortalCapability.STREAMING:
      case PortalCapability.FUNCTION_CALLING:
      case PortalCapability.VISION:
      case PortalCapability.TOOL_USAGE:
      case PortalCapability.EVALUATION:
      case PortalCapability.REASONING:
        return true;
      case PortalCapability.AUDIO:
        return false;
      default:
        return false;
    }
  }

  /**
   * Map finish reason from AI SDK to our internal enum
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
      case 'error':
        return FinishReason.ERROR;
      case 'cancelled':
        return FinishReason.CANCELLED;
      default:
        return FinishReason.STOP;
    }
  }
}

// Export factory function for easy instantiation
export function createOpenAIPortal(config: OpenAIConfig): OpenAIPortal {
  return new OpenAIPortal(config);
}

// Export default configuration
export const defaultOpenAIConfig: Partial<OpenAIConfig> = {
  model: 'gpt-4.1-mini',
  chatModel: 'gpt-4.1-mini', // Default for regular chat
  toolModel: 'gpt-4.1-mini', // Fast model for tools/functions (updated based on user edit)
  embeddingModel: 'text-embedding-3-large',
  imageModel: 'dall-e-3',
  maxTokens: 1000,
  temperature: 0.7,
  timeout: 30000,
};

// Available OpenAI models
export const openAIModels = {
  // Latest GPT-4 Series
  'gpt-4.1': 'GPT-4.1 - Latest flagship model with enhanced capabilities',
  'gpt-4o': 'GPT-4o - Advanced multimodal model',
  'gpt-4.1-mini': 'GPT-4o Mini - Fast and cost-effective',
  'gpt-4-turbo': 'GPT-4 Turbo - Enhanced performance',
  'gpt-4': 'GPT-4 - Original flagship model',

  // Advanced Reasoning Models
  o3: 'o3 - State-of-the-art reasoning model',
  'o1-preview': 'o1 Preview - Advanced reasoning',
  'o1-mini': 'o1 Mini - Compact reasoning model',

  // Embedding Models
  'text-embedding-3-large':
    'Text Embedding 3 Large - High-dimensional embeddings',
  'text-embedding-3-small': 'Text Embedding 3 Small - Efficient embeddings',
};

// Available OpenAI embedding models
export const openAIEmbeddingModels = {
  'text-embedding-3-large': 'Text Embedding 3 Large - 3072 dimensions',
  'text-embedding-3-small': 'Text Embedding 3 Small - 1536 dimensions',
};

// Available OpenAI image models
export const openAIImageModels = {
  'dall-e-3': 'DALL-E 3 - High quality image generation',
};
