/**
 * Mistral AI Portal
 *
 * European-based AI provider with strong capabilities in multilingual processing,
 * code generation, and enterprise compliance features using AI SDK v5
 */

import { mistral } from '@ai-sdk/mistral';
import {
  generateText as aiGenerateText,
  streamText as aiStreamText,
  embed as aiEmbed,
} from 'ai';

import { Agent } from '../../types/agent';
import {
  // Portal - interface already imported via BasePortal
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
  MessageRole,
  FinishReason,
  ImageGenerationOptions,
  ImageGenerationResult,
} from '../../types/portal';
import {
  AISDKParameterBuilder,
  handleAISDKError,
  validateGenerationOptions,
} from '../ai-sdk-utils';
import { BasePortal } from '../base-portal';
import { convertUsage } from '../utils';

export interface MistralConfig extends PortalConfig {
  apiKey: string;
  model?: string;
  safeMode?: boolean;
  randomSeed?: number;
  responseFormat?: { type: 'json_object' | 'text' };
  toolChoice?:
    | 'auto'
    | 'none'
    | { type: 'function'; function: { name: string } };
}

export const defaultMistralConfig: Partial<MistralConfig> = {
  model: 'mistral-large-latest',
  maxTokens: 8192, // Keep as config property, map to maxOutputTokens in calls
  temperature: 0.7,
  timeout: 30000,
  baseUrl: 'https://api.mistral.ai/v1',
  safeMode: false,
};

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
  'codestral-2405',
];

export class MistralPortal extends BasePortal {
  type = PortalType.MISTRAL;
  supportedModels = [
    ModelType.TEXT_GENERATION,
    ModelType.CHAT,
    ModelType.CODE_GENERATION,
    ModelType.EMBEDDING,
  ];

  private model: ReturnType<typeof mistral>;
  private embedModel: ReturnType<typeof mistral>;

  constructor(config: MistralConfig) {
    super('mistral-ai', 'Mistral AI', '1.0.0', config);
    const modelName = config.model || 'mistral-large-latest';
    this.model = mistral(modelName);
    // For embeddings, use mistral-embed model
    this.embedModel = mistral('mistral-embed');
  }

  override async init(_agent: Agent): Promise<void> {
    this.status = PortalStatus.INITIALIZING;
    // Initializing Mistral AI portal for agent

    try {
      await this.validateConfig();
      await this.healthCheck();
      this.status = PortalStatus.ACTIVE;
      // Mistral AI portal initialized successfully
    } catch (error) {
      this.status = PortalStatus.ERROR;
      // Failed to initialize Mistral AI portal
      throw error;
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
    } catch {
      // Mistral AI health check failed
      return false;
    }
  }

  /**
   * Convert ChatMessage array to message format for AI SDK
   */
  private convertToModelMessages(
    messages: ChatMessage[]
  ): Array<{ role: 'user' | 'assistant' | 'system'; content: string }> {
    return messages.map((msg) => {
      const role =
        msg.role === MessageRole.USER
          ? ('user' as const)
          : msg.role === MessageRole.ASSISTANT
            ? ('assistant' as const)
            : msg.role === MessageRole.SYSTEM
              ? ('system' as const)
              : ('user' as const);

      return {
        role,
        content: msg.content,
      };
    });
  }

  /**
   * Get default parameters for Mistral AI
   */
  private getMistralDefaults(): {
    maxOutputTokens: number;
    temperature: number;
    topP: number;
    frequencyPenalty: number;
    presencePenalty: number;
  } {
    return {
      maxOutputTokens: this.config.maxTokens ?? 8192,
      temperature: this.config.temperature ?? 0.7,
      topP: 1.0,
      frequencyPenalty: 0,
      presencePenalty: 0,
    };
  }

  /**
   * Build Mistral-specific parameters with seed support
   */
  private buildMistralParams<T extends Record<string, unknown>>(
    baseParams: T,
    options?: TextGenerationOptions | ChatGenerationOptions
  ): T & Record<string, unknown> {
    const params = AISDKParameterBuilder.buildTextGenerationParams(
      baseParams,
      options,
      this.getMistralDefaults()
    );

    // Add Mistral-specific seed parameter
    const randomSeed = (this.config as MistralConfig).randomSeed;
    if (randomSeed !== undefined) {
      (params as Record<string, unknown>).seed = randomSeed;
    }

    return params;
  }

  override async generateText(
    prompt: string,
    options?: TextGenerationOptions
  ): Promise<TextGenerationResult> {
    try {
      // Validate options
      if (options) {
        validateGenerationOptions(options, 'Mistral');
      }

      const baseParams = {
        model: this.model,
        messages: [{ role: 'user' as const, content: prompt }],
      };

      // Build parameters conditionally to satisfy exactOptionalPropertyTypes
      const generateParams = this.buildMistralParams(baseParams, options);

      const { text, usage, finishReason } =
        await aiGenerateText(generateParams);

      return {
        text,
        model: (this.config as MistralConfig).model || 'mistral-large-latest',
        usage: convertUsage(usage),
        finishReason: this.mapFinishReason(finishReason),
        timestamp: new Date(),
      };
    } catch (error) {
      throw handleAISDKError(error, 'Mistral');
    }
  }

  /**
   * Build Mistral-specific chat parameters with tool support
   */
  private buildMistralChatParams<T extends Record<string, unknown>>(
    baseParams: T,
    options?: ChatGenerationOptions
  ): T & Record<string, unknown> {
    const params = AISDKParameterBuilder.buildChatGenerationParams(
      baseParams,
      options,
      this.getMistralDefaults()
    );

    // Add Mistral-specific seed parameter
    const randomSeed = (this.config as MistralConfig).randomSeed;
    if (randomSeed !== undefined) {
      (params as Record<string, unknown>).seed = randomSeed;
    }

    return params;
  }

  override async generateChat(
    messages: ChatMessage[],
    options?: ChatGenerationOptions
  ): Promise<ChatGenerationResult> {
    try {
      // Validate options
      if (options) {
        validateGenerationOptions(options, 'Mistral');
      }

      const modelMessages = this.convertToModelMessages(messages);

      const baseParams = {
        model: this.model,
        messages: modelMessages,
      };

      // Build parameters conditionally to satisfy exactOptionalPropertyTypes
      const generateParams = this.buildMistralChatParams(baseParams, options);

      const { text, usage, finishReason } =
        await aiGenerateText(generateParams);

      const message: ChatMessage = {
        role: MessageRole.ASSISTANT,
        content: text,
        timestamp: new Date(),
      };

      return {
        text,
        model: (this.config as MistralConfig).model || 'mistral-large-latest',
        message,
        usage: convertUsage(usage),
        finishReason: this.mapFinishReason(finishReason),
        timestamp: new Date(),
      };
    } catch (error) {
      throw handleAISDKError(error, 'Mistral');
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
        model: 'mistral-embed',
        usage: {
          promptTokens: usage?.tokens || 0,
          totalTokens: usage?.tokens || 0,
        },
      };
    } catch (error) {
      throw new Error(`Mistral AI embedding generation failed: ${error}`);
    }
  }

  /**
   * Generate images - Note: Mistral doesn't provide image generation models
   * This is a placeholder that throws an error
   */
  override async generateImage(
    _prompt: string,
    _options?: ImageGenerationOptions
  ): Promise<ImageGenerationResult> {
    throw new Error(
      'Mistral AI does not provide image generation models. Consider using OpenAI or another provider for image generation.'
    );
  }

  override async *streamText(
    prompt: string,
    options?: TextGenerationOptions
  ): AsyncGenerator<string> {
    try {
      // Validate options
      if (options) {
        validateGenerationOptions(options, 'Mistral');
      }

      const baseParams = {
        model: this.model,
        messages: [{ role: 'user' as const, content: prompt }],
      };

      // Build parameters conditionally to satisfy exactOptionalPropertyTypes
      const streamParams = this.buildMistralParams(baseParams, options);

      const { textStream } = await aiStreamText(streamParams);

      for await (const chunk of textStream) {
        yield chunk;
      }
    } catch (error) {
      throw handleAISDKError(error, 'Mistral');
    }
  }

  override async *streamChat(
    messages: ChatMessage[],
    options?: ChatGenerationOptions
  ): AsyncGenerator<string> {
    try {
      // Validate options
      if (options) {
        validateGenerationOptions(options, 'Mistral');
      }

      const modelMessages = this.convertToModelMessages(messages);

      const baseParams = {
        model: this.model,
        messages: modelMessages,
      };

      // Build parameters conditionally to satisfy exactOptionalPropertyTypes
      const streamParams = this.buildMistralChatParams(baseParams, options);

      const { textStream } = await aiStreamText(streamParams);

      for await (const chunk of textStream) {
        yield chunk;
      }
    } catch (error) {
      throw handleAISDKError(error, 'Mistral');
    }
  }

  override hasCapability(capability: PortalCapability): boolean {
    switch (capability) {
      case PortalCapability.TEXT_GENERATION:
      case PortalCapability.CHAT_GENERATION:
      case PortalCapability.EMBEDDING_GENERATION:
      case PortalCapability.STREAMING:
      case PortalCapability.FUNCTION_CALLING:
        return true;
      case PortalCapability.IMAGE_GENERATION:
      case PortalCapability.VISION:
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
        return FinishReason.FUNCTION_CALL;
      default:
        return FinishReason.STOP;
    }
  }
}

export function createMistralPortal(config: MistralConfig): MistralPortal {
  return new MistralPortal({
    ...defaultMistralConfig,
    ...config,
  });
}
