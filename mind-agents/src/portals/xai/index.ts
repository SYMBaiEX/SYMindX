/**
 * XAI Portal Implementation
 *
 * This portal provides integration with XAI's Grok API using AI SDK v5.
 */

import { xai } from '@ai-sdk/xai';
import { generateText as aiGenerateText, streamText as aiStreamText } from 'ai';

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
import type {
  LanguageModel,
  AIMessage as ModelMessage,
} from '../../types/portals/ai-sdk';
import {
  AISDKParameterBuilder,
  handleAISDKError,
  validateGenerationOptions,
} from '../ai-sdk-utils';
import { BasePortal } from '../base-portal';
import { convertUsage } from '../utils';

export interface XAIConfig extends PortalConfig {
  model?: string;
  baseURL?: string;
}

export class XAIPortal extends BasePortal {
  type: PortalType = PortalType.XAI;
  supportedModels: ModelType[] = [
    ModelType.TEXT_GENERATION,
    ModelType.CHAT,
    ModelType.CODE_GENERATION,
  ];
  private xaiProvider: typeof xai;

  constructor(config: XAIConfig) {
    super('xai', 'XAI', '1.0.0', config);
    this.xaiProvider = xai;
  }

  /**
   * Get language model instance
   */
  private getLanguageModel(modelId?: string): any {
    const model = modelId || (this.config as XAIConfig).model || 'grok-2';
    const config = this.config as XAIConfig;
    return this.xaiProvider(model);
  }

  /**
   * Convert ChatMessage array to message format for AI SDK v5
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

  /**
   * Get default parameters for XAI/Grok
   */
  private getGrokDefaults(): {
    maxOutputTokens: number;
    temperature: number;
    topP: number;
    frequencyPenalty: number;
    presencePenalty: number;
  } {
    return {
      maxOutputTokens: this.config.maxTokens ?? 2000, // Grok supports larger contexts
      temperature: this.config.temperature ?? 0.8, // Grok performs well with slightly higher temperature
      topP: 1.0,
      frequencyPenalty: 0,
      presencePenalty: 0,
    };
  }

  /**
   * Build XAI-specific parameters with context limits
   */
  private buildXAIParams<T extends Record<string, unknown>>(
    baseParams: T,
    options?: TextGenerationOptions | ChatGenerationOptions
  ): T & Record<string, unknown> {
    const params = AISDKParameterBuilder.buildTextGenerationParams(
      baseParams,
      options,
      this.getGrokDefaults()
    );

    // Apply Grok-specific optimizations
    const mutableParams = params as Record<string, unknown>;
    if (
      mutableParams.maxOutputTokens !== undefined &&
      typeof mutableParams.maxOutputTokens === 'number'
    ) {
      // Grok supports large contexts, cap at 8192 for safety
      mutableParams.maxOutputTokens = Math.min(
        mutableParams.maxOutputTokens,
        8192
      );
    }

    if (
      mutableParams.topP !== undefined &&
      typeof mutableParams.topP === 'number' &&
      mutableParams.topP < 0.1
    ) {
      // Grok performs better with topP >= 0.1
      mutableParams.topP = Math.max(mutableParams.topP, 0.1);
    }

    return params;
  }

  /**
   * Build XAI-specific chat parameters with tool support
   */
  private buildXAIChatParams<T extends Record<string, unknown>>(
    baseParams: T,
    options?: ChatGenerationOptions
  ): T & Record<string, unknown> {
    const params = AISDKParameterBuilder.buildChatGenerationParams(
      baseParams,
      options,
      this.getGrokDefaults()
    );

    // Apply Grok-specific optimizations
    const mutableParams = params as Record<string, unknown>;
    if (
      mutableParams.maxOutputTokens !== undefined &&
      typeof mutableParams.maxOutputTokens === 'number'
    ) {
      // Grok supports large contexts, cap at 8192 for safety
      mutableParams.maxOutputTokens = Math.min(
        mutableParams.maxOutputTokens,
        8192
      );
    }

    if (
      mutableParams.topP !== undefined &&
      typeof mutableParams.topP === 'number' &&
      mutableParams.topP < 0.1
    ) {
      // Grok performs better with topP >= 0.1
      mutableParams.topP = Math.max(mutableParams.topP, 0.1);
    }

    return params;
  }

  /**
   * Generate text using XAI's completion API
   */
  override async generateText(
    prompt: string,
    options?: TextGenerationOptions
  ): Promise<TextGenerationResult> {
    try {
      // Validate options
      if (options) {
        validateGenerationOptions(options, 'XAI');
      }

      const model =
        options?.model || (this.config as XAIConfig).model || 'grok-2';

      const baseParams = {
        model: this.getLanguageModel(model),
        prompt,
      };

      // Build parameters conditionally to satisfy exactOptionalPropertyTypes
      const generateParams = this.buildXAIParams(baseParams, options);

      const result = await aiGenerateText(generateParams);

      return {
        text: result.text,
        usage: convertUsage(result.usage),
        finishReason: this.mapFinishReason(result.finishReason),
        metadata: {
          model,
          provider: 'xai',
        },
      };
    } catch (error) {
      void error;
      throw handleAISDKError(error, 'XAI');
    }
  }

  /**
   * Generate chat response using XAI's chat completion API
   */
  override async generateChat(
    messages: ChatMessage[],
    options?: ChatGenerationOptions
  ): Promise<ChatGenerationResult> {
    try {
      // Validate options
      if (options) {
        validateGenerationOptions(options, 'XAI');
      }

      const model =
        options?.model || (this.config as XAIConfig).model || 'grok-2';
      const modelMessages = this.convertToModelMessages(messages);

      const baseParams = {
        model: this.getLanguageModel(model),
        messages: modelMessages,
      };

      // Build parameters conditionally to satisfy exactOptionalPropertyTypes
      const generateParams = this.buildXAIChatParams(baseParams, options);

      const result = await aiGenerateText(generateParams as any);

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
          provider: 'xai',
        },
      };
    } catch (error) {
      void error;
      throw handleAISDKError(error, 'XAI');
    }
  }

  /**
   * Generate embeddings - Note: XAI doesn't provide embedding models
   * This is a placeholder that throws an error
   */
  override async generateEmbedding(
    _text: string,
    _options?: EmbeddingOptions
  ): Promise<EmbeddingResult> {
    throw new Error(
      'XAI does not provide embedding models. Consider using OpenAI or another provider for embeddings.'
    );
  }

  /**
   * Generate images - Note: XAI doesn't provide image generation models
   * This is a placeholder that throws an error
   */
  override async generateImage(
    _prompt: string,
    _options?: ImageGenerationOptions
  ): Promise<ImageGenerationResult> {
    throw new Error(
      'XAI does not provide image generation models. Consider using OpenAI or another provider for image generation.'
    );
  }

  /**
   * Stream text generation for real-time responses
   */
  override async *streamText(
    prompt: string,
    options?: TextGenerationOptions
  ): AsyncGenerator<string> {
    try {
      // Validate options
      if (options) {
        validateGenerationOptions(options, 'XAI');
      }

      const model =
        options?.model || (this.config as XAIConfig).model || 'grok-2';

      const baseParams = {
        model: this.getLanguageModel(model),
        prompt,
      };

      // Build parameters conditionally to satisfy exactOptionalPropertyTypes
      const streamParams = this.buildXAIParams(baseParams, options);

      const result = await aiStreamText(streamParams);

      for await (const chunk of result.textStream) {
        yield chunk;
      }
    } catch (error) {
      void error;
      throw handleAISDKError(error, 'XAI');
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
      // Validate options
      if (options) {
        validateGenerationOptions(options, 'XAI');
      }

      const model =
        options?.model || (this.config as XAIConfig).model || 'grok-2';
      const modelMessages = this.convertToModelMessages(messages);

      const baseParams = {
        model: this.getLanguageModel(model),
        messages: modelMessages,
      };

      // Build parameters conditionally to satisfy exactOptionalPropertyTypes
      const streamParams = this.buildXAIChatParams(baseParams, options);

      const result = await aiStreamText(streamParams as any);

      for await (const chunk of result.textStream) {
        yield chunk;
      }
    } catch (error) {
      void error;
      throw handleAISDKError(error, 'XAI');
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
        return FinishReason.FUNCTION_CALL;
      default:
        return FinishReason.STOP;
    }
  }

  /**
   * Check if the portal supports a specific capability
   */
  override hasCapability(capability: PortalCapability): boolean {
    switch (capability) {
      case PortalCapability.TEXT_GENERATION:
      case PortalCapability.CHAT_GENERATION:
      case PortalCapability.STREAMING:
      case PortalCapability.FUNCTION_CALLING:
      case PortalCapability.VISION:
        return true;
      case PortalCapability.EMBEDDING_GENERATION:
      case PortalCapability.IMAGE_GENERATION:
      case PortalCapability.AUDIO:
        return false;
      default:
        return false;
    }
  }
}

// Export factory function for easy instantiation
export function createXAIPortal(config: XAIConfig): XAIPortal {
  return new XAIPortal(config);
}

// Export default configuration
export const defaultXAIConfig: Partial<XAIConfig> = {
  model: 'grok-2',
  maxTokens: 1000, // Keep as config property, map to maxOutputTokens in calls
  temperature: 0.7,
  timeout: 30000,
  baseURL: 'https://api.x.ai/v1',
};

// Available XAI models (Updated February 2025)
export const xaiModels = {
  // Grok 3 Series (Latest)
  'grok-3':
    'Grok 3 - Latest flagship model with advanced reasoning and multimodal capabilities',

  // Grok 2 Series
  'grok-2': 'Grok 2 - Enhanced model with vision, reasoning, and tool calling',
  'grok-2-mini': 'Grok 2 Mini - Faster and more efficient version',

  // Legacy Models
  'grok-beta': 'Grok Beta - Experimental model',
  'grok-1': 'Grok 1 - First generation model',
};
