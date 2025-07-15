/**
 * Cohere AI Portal
 *
 * Enterprise-grade AI platform with strong capabilities in text generation,
 * embeddings, classification, and semantic search using AI SDK v5
 */

import { cohere } from '@ai-sdk/cohere';
import {
  generateText as aiGenerateText,
  streamText as aiStreamText,
  embed as aiEmbed,
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
  MessageRole,
  FinishReason,
  ImageGenerationOptions,
  ImageGenerationResult,
} from '../../types/portal';
import type { AIMessage as ModelMessage } from '../../types/portals/ai-sdk';
import { BasePortal } from '../base-portal';
import { convertUsage, buildAISDKParams } from '../utils';

export interface CohereConfig extends PortalConfig {
  apiKey: string;
  model?: string;
  version?: string;
  truncate?: 'NONE' | 'START' | 'END';
  citationQuality?: 'accurate' | 'fast';
  promptTruncation?: 'AUTO' | 'OFF';
  searchQueriesOnly?: boolean;
  preamble?: string;
  conversationId?: string;
}

export const defaultCohereConfig: Partial<CohereConfig> = {
  model: 'command-r-plus',
  version: '2024-04-15',
  maxTokens: 4000, // Keep as config property, map to maxOutputTokens in calls
  temperature: 0.7,
  timeout: 30000,
  baseUrl: 'https://api.cohere.ai/v1',
  truncate: 'END',
  citationQuality: 'accurate',
  promptTruncation: 'AUTO',
};

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
  'rerank-multilingual-v2.0',
];

export class CoherePortal extends BasePortal {
  type = PortalType.COHERE;
  supportedModels = [
    ModelType.TEXT_GENERATION,
    ModelType.CHAT,
    ModelType.EMBEDDING,
  ];

  private cohereProvider: typeof cohere;

  constructor(config: CohereConfig) {
    super('cohere-ai', 'Cohere AI', '1.0.0', config);
    this.cohereProvider = cohere;
  }

  override async init(_agent: Agent): Promise<void> {
    this.status = PortalStatus.INITIALIZING;
    // Initializing Cohere AI portal for agent

    try {
      await this.validateConfig();
      await this.healthCheck();
      this.status = PortalStatus.ACTIVE;
      // Cohere AI portal initialized successfully
    } catch (error) {
      this.status = PortalStatus.ERROR;
      // Failed to initialize Cohere AI portal
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Try a simple text generation to verify the API is working
      await aiGenerateText({
        model: this.cohereProvider('command-r-plus', {
          apiKey: (this.config as CohereConfig).apiKey,
          baseURL: (this.config as CohereConfig).baseUrl,
        }),
        messages: [{ role: 'user' as const, content: 'Hello' }],
        maxOutputTokens: 10,
      });
      return true;
    } catch {
      // Cohere AI health check failed
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
          return { role: 'system' as const, content: msg.content };
        case MessageRole.USER:
          return { role: 'user' as const, content: msg.content };
        case MessageRole.ASSISTANT:
          return { role: 'assistant' as const, content: msg.content };
        case MessageRole.TOOL:
          return {
            role: 'tool' as const,
            content: [
              {
                type: 'tool-result' as const,
                toolCallId: '',
                toolName: '',
                result: msg.content,
              },
            ],
          };
        case MessageRole.FUNCTION:
          // Convert function messages to assistant messages for compatibility
          return { role: 'assistant' as const, content: msg.content };
        default:
          return { role: 'user' as const, content: msg.content };
      }
    });
  }

  override async generateText(
    prompt: string,
    options?: TextGenerationOptions
  ): Promise<TextGenerationResult> {
    try {
      const baseParams = {
        model: this.cohereProvider(
          (this.config as CohereConfig).model || 'command-r-plus',
          {
            apiKey: (this.config as CohereConfig).apiKey,
            baseURL: (this.config as CohereConfig).baseUrl,
          }
        ),
        messages: [{ role: 'user' as const, content: prompt }],
      };

      const params = buildAISDKParams(baseParams, {
        maxOutputTokens: options?.maxTokens ?? this.config.maxTokens,
        temperature: options?.temperature ?? this.config.temperature,
        topP: options?.topP,
        frequencyPenalty: options?.frequencyPenalty,
        presencePenalty: options?.presencePenalty,
        stopSequences: options?.stop,
      });

      const { text, usage, finishReason } = await aiGenerateText(params);

      return {
        text,
        model: (this.config as CohereConfig).model || 'command-r-plus',
        usage: convertUsage(usage),
        finishReason: this.mapFinishReason(finishReason),
        timestamp: new Date(),
      };
    } catch (error) {
      throw new Error(`Cohere AI text generation failed: ${error}`);
    }
  }

  override async generateChat(
    messages: ChatMessage[],
    options?: ChatGenerationOptions
  ): Promise<ChatGenerationResult> {
    try {
      const modelMessages = this.convertToModelMessages(messages);

      // Add preamble as a system message if configured
      if ((this.config as CohereConfig).preamble) {
        modelMessages.unshift({
          role: 'system',
          content: (this.config as CohereConfig).preamble!,
        });
      }

      const baseParams = {
        model: this.cohereProvider(
          (this.config as CohereConfig).model || 'command-r-plus',
          {
            apiKey: (this.config as CohereConfig).apiKey,
            baseURL: (this.config as CohereConfig).baseUrl,
          }
        ),
        messages: modelMessages,
      };

      const params = buildAISDKParams(baseParams, {
        maxOutputTokens: options?.maxTokens ?? this.config.maxTokens,
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
        model: (this.config as CohereConfig).model || 'command-r-plus',
        message,
        usage: convertUsage(usage),
        finishReason: this.mapFinishReason(finishReason),
        timestamp: new Date(),
      };
    } catch (error) {
      throw new Error(`Cohere AI chat generation failed: ${error}`);
    }
  }

  override async generateEmbedding(
    text: string,
    options?: EmbeddingOptions
  ): Promise<EmbeddingResult> {
    try {
      const modelName = options?.model || 'embed-english-v3.0';
      const { embedding, usage } = await aiEmbed({
        model: this.cohereProvider.textEmbedding(modelName, {
          apiKey: (this.config as CohereConfig).apiKey,
          baseURL: (this.config as CohereConfig).baseUrl,
        }),
        value: text,
      });

      return {
        embedding,
        dimensions: embedding.length,
        model: modelName,
        usage: {
          promptTokens: usage?.tokens || 0,
          totalTokens: usage?.tokens || 0,
        },
      };
    } catch (error) {
      throw new Error(`Cohere AI embedding generation failed: ${error}`);
    }
  }

  /**
   * Generate images - Note: Cohere doesn't provide image generation models
   * This is a placeholder that throws an error
   */
  override async generateImage(
    _prompt: string,
    _options?: ImageGenerationOptions
  ): Promise<ImageGenerationResult> {
    throw new Error(
      'Cohere AI does not provide image generation models. Consider using OpenAI or another provider for image generation.'
    );
  }

  override async *streamText(
    prompt: string,
    options?: TextGenerationOptions
  ): AsyncGenerator<string> {
    try {
      const baseParams = {
        model: this.cohereProvider(
          (this.config as CohereConfig).model || 'command-r-plus',
          {
            apiKey: (this.config as CohereConfig).apiKey,
            baseURL: (this.config as CohereConfig).baseUrl,
          }
        ),
        messages: [{ role: 'user' as const, content: prompt }],
      };

      const params = buildAISDKParams(baseParams, {
        maxOutputTokens: options?.maxTokens ?? this.config.maxTokens,
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
      throw new Error(`Cohere AI text streaming failed: ${error}`);
    }
  }

  override async *streamChat(
    messages: ChatMessage[],
    options?: ChatGenerationOptions
  ): AsyncGenerator<string> {
    try {
      const modelMessages = this.convertToModelMessages(messages);

      // Add preamble as a system message if configured
      if ((this.config as CohereConfig).preamble) {
        modelMessages.unshift({
          role: 'system',
          content: (this.config as CohereConfig).preamble!,
        });
      }

      const baseParams = {
        model: this.cohereProvider(
          (this.config as CohereConfig).model || 'command-r-plus',
          {
            apiKey: (this.config as CohereConfig).apiKey,
            baseURL: (this.config as CohereConfig).baseUrl,
          }
        ),
        messages: modelMessages,
      };

      const params = buildAISDKParams(baseParams, {
        maxOutputTokens: options?.maxTokens ?? this.config.maxTokens,
        temperature: options?.temperature ?? this.config.temperature,
        topP: options?.topP,
        frequencyPenalty: options?.frequencyPenalty,
        presencePenalty: options?.presencePenalty,
        stopSequences: options?.stop,
        tools: options?.tools,
      });

      const { textStream } = await aiStreamText(params);

      for await (const chunk of textStream) {
        yield chunk;
      }
    } catch (error) {
      throw new Error(`Cohere AI chat streaming failed: ${error}`);
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
      case 'error':
        return FinishReason.ERROR;
      default:
        return FinishReason.STOP;
    }
  }
}

export function createCoherePortal(config: CohereConfig): CoherePortal {
  return new CoherePortal({
    ...defaultCohereConfig,
    ...config,
  });
}
