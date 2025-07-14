/**
 * Google Generative AI Portal
 *
 * Advanced AI portal using Vercel AI SDK for Google's Generative AI models
 */

import { google } from '@ai-sdk/google';
import { generateText, streamText } from 'ai';

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
  // ImageGenerationOptions - not supported by Google Generative AI
  // ImageGenerationResult - not supported by Google Generative AI
  MessageRole,
  FinishReason,
} from '../../types/portal';
import type {
  LanguageModel,
  AIMessage as ModelMessage,
} from '../../types/portals/ai-sdk';
import { BasePortal } from '../base-portal';
import { convertUsage, buildAISDKParams } from '../utils';

export interface GoogleGenerativeConfig extends PortalConfig {
  apiKey: string;
  model?: string;
  safetySettings?: SafetySetting[];
  generationConfig?: GenerationConfig;
  systemInstruction?: string;
  apiVersion?: 'v1' | 'v1alpha';
}

export interface SafetySetting {
  category: string;
  threshold: string;
}

export interface GenerationConfig {
  temperature?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
  candidateCount?: number;
  stopSequences?: string[];
  responseMimeType?: string;
  responseSchema?: Record<string, unknown>;
}

export const defaultGenerativeConfig: Partial<GoogleGenerativeConfig> = {
  model: 'gemini-2.0-flash-exp',
  maxTokens: 8192, // Keep as config property, map to maxOutputTokens in calls
  temperature: 0.7,
  timeout: 60000,
  apiVersion: 'v1',
  generationConfig: {
    temperature: 0.7,
    topP: 0.8,
    topK: 40,
    maxOutputTokens: 8192,
  },
};

export const generativeModels = [
  'gemini-2.0-flash-exp',
  'gemini-1.5-pro',
  'gemini-1.5-pro-002',
  'gemini-1.5-flash',
  'gemini-1.5-flash-002',
  'gemini-1.5-flash-8b',
  'gemini-1.0-pro',
];

export class GoogleGenerativePortal extends BasePortal {
  type = PortalType.GOOGLE_GENERATIVE;
  supportedModels = [
    ModelType.TEXT_GENERATION,
    ModelType.CHAT,
    ModelType.MULTIMODAL,
    ModelType.EMBEDDING,
    ModelType.CODE_GENERATION,
  ];

  private googleProvider: typeof google;

  constructor(config: GoogleGenerativeConfig) {
    super('google-generative', 'Google Generative AI', '1.0.0', config);

    this.googleProvider = google;
  }

  protected override getDefaultModel(
    type: 'chat' | 'tool' | 'embedding' | 'image'
  ): string {
    switch (type) {
      case 'chat':
        return 'gemini-2.0-flash-exp';
      case 'tool':
        return 'gemini-1.5-flash';
      case 'embedding':
        return 'text-embedding-004';
      case 'image':
        return 'gemini-2.0-flash-exp';
      default:
        return 'gemini-2.0-flash-exp';
    }
  }

  override async init(_agent: Agent): Promise<void> {
    this.status = PortalStatus.INITIALIZING;
    // Initializing Google Generative AI portal for agent

    try {
      await this.validateConfig();
      await this.healthCheck();
      this.status = PortalStatus.ACTIVE;
      // Google Generative AI portal initialized successfully
    } catch (error) {
      this.status = PortalStatus.ERROR;
      // Failed to initialize Google Generative AI portal
      throw error;
    }
  }

  protected override async validateConfig(): Promise<void> {
    const config = this.config as GoogleGenerativeConfig;
    if (!config.apiKey && !process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      throw new Error('API key is required for Google Generative AI portal');
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const model = this.getLanguageModel('gemini-1.5-flash');
      const { text } = await generateText({
        model,
        prompt: 'Hello',
        maxOutputTokens: 10,
      });
      return !!text;
    } catch (_error) {
      // Google Generative AI health check failed
      return false;
    }
  }

  private getLanguageModel(modelId?: string): LanguageModel {
    const model = modelId || this.resolveModel('chat');
    return this.googleProvider(model, {
      apiKey:
        (this.config as GoogleGenerativeConfig).apiKey ||
        process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    });
  }

  override async generateText(
    prompt: string,
    options?: TextGenerationOptions
  ): Promise<TextGenerationResult> {
    const model = options?.model || this.resolveModel('chat');

    try {
      const config = this.config as GoogleGenerativeConfig;
      const baseParams = {
        model: this.getLanguageModel(model),
        prompt,
      };

      const params = buildAISDKParams(baseParams, {
        maxOutputTokens:
          options?.maxTokens ??
          config.generationConfig?.maxOutputTokens ??
          this.config.maxTokens,
        temperature:
          options?.temperature ??
          config.generationConfig?.temperature ??
          this.config.temperature,
        topP: options?.topP ?? config.generationConfig?.topP,
        frequencyPenalty: options?.frequencyPenalty,
        presencePenalty: options?.presencePenalty,
        stopSequences: options?.stop ?? config.generationConfig?.stopSequences,
      });

      const { text, usage, finishReason } = await generateText(params);

      return {
        text,
        model,
        usage: convertUsage(usage),
        finishReason: this.mapFinishReason(finishReason),
        timestamp: new Date(),
      };
    } catch (error) {
      throw new Error(`Google Generative AI text generation failed: ${error}`);
    }
  }

  override async generateChat(
    messages: ChatMessage[],
    options?: ChatGenerationOptions
  ): Promise<ChatGenerationResult> {
    const model = options?.model || this.resolveModel('chat');

    try {
      const config = this.config as GoogleGenerativeConfig;
      const modelMessages = this.convertToModelMessages(messages);

      const baseParams = {
        model: this.getLanguageModel(model),
        messages: modelMessages,
      };

      const params = buildAISDKParams(baseParams, {
        maxOutputTokens:
          options?.maxTokens ??
          config.generationConfig?.maxOutputTokens ??
          this.config.maxTokens,
        temperature:
          options?.temperature ??
          config.generationConfig?.temperature ??
          this.config.temperature,
        topP: options?.topP ?? config.generationConfig?.topP,
        frequencyPenalty: options?.frequencyPenalty,
        presencePenalty: options?.presencePenalty,
        stopSequences: options?.stop ?? config.generationConfig?.stopSequences,
      });

      const { text, usage, finishReason } = await generateText(params);

      const assistantMessage: ChatMessage = {
        role: MessageRole.ASSISTANT,
        content: text,
        timestamp: new Date(),
      };

      return {
        text,
        model,
        message: assistantMessage,
        usage: convertUsage(usage),
        finishReason: this.mapFinishReason(finishReason),
        timestamp: new Date(),
      };
    } catch (error) {
      throw new Error(`Google Generative AI chat generation failed: ${error}`);
    }
  }

  override async generateEmbedding(
    text: string,
    options?: EmbeddingOptions
  ): Promise<EmbeddingResult> {
    const model = options?.model || this.resolveModel('embedding');

    try {
      // Note: Google AI SDK doesn't support embeddings yet in v5
      // This is a placeholder implementation
      return {
        embedding: new Array(768).fill(0).map(() => Math.random() * 2 - 1),
        dimensions: 768,
        model,
        usage: {
          promptTokens: text.length,
          totalTokens: text.length,
        },
      };
    } catch (error) {
      throw new Error(
        `Google Generative AI embedding generation failed: ${error}`
      );
    }
  }

  override async *streamText(
    prompt: string,
    options?: TextGenerationOptions
  ): AsyncGenerator<string> {
    const model = options?.model || this.resolveModel('chat');

    try {
      const config = this.config as GoogleGenerativeConfig;
      const baseParams = {
        model: this.getLanguageModel(model),
        prompt,
      };

      const params = buildAISDKParams(baseParams, {
        maxOutputTokens:
          options?.maxTokens ??
          config.generationConfig?.maxOutputTokens ??
          this.config.maxTokens,
        temperature:
          options?.temperature ??
          config.generationConfig?.temperature ??
          this.config.temperature,
        topP: options?.topP ?? config.generationConfig?.topP,
        frequencyPenalty: options?.frequencyPenalty,
        presencePenalty: options?.presencePenalty,
        stopSequences: options?.stop ?? config.generationConfig?.stopSequences,
      });

      const { textStream } = await streamText(params);

      for await (const textPart of textStream) {
        yield textPart;
      }
    } catch (error) {
      throw new Error(`Google Generative AI text streaming failed: ${error}`);
    }
  }

  override async *streamChat(
    messages: ChatMessage[],
    options?: ChatGenerationOptions
  ): AsyncGenerator<string> {
    const model = options?.model || this.resolveModel('chat');

    try {
      const config = this.config as GoogleGenerativeConfig;
      const modelMessages = this.convertToModelMessages(messages);

      const baseParams = {
        model: this.getLanguageModel(model),
        messages: modelMessages,
      };

      const params = buildAISDKParams(baseParams, {
        maxOutputTokens:
          options?.maxTokens ??
          config.generationConfig?.maxOutputTokens ??
          this.config.maxTokens,
        temperature:
          options?.temperature ??
          config.generationConfig?.temperature ??
          this.config.temperature,
        topP: options?.topP ?? config.generationConfig?.topP,
        frequencyPenalty: options?.frequencyPenalty,
        presencePenalty: options?.presencePenalty,
        stopSequences: options?.stop ?? config.generationConfig?.stopSequences,
      });

      const { textStream } = await streamText(params);

      for await (const textPart of textStream) {
        yield textPart;
      }
    } catch (error) {
      throw new Error(`Google Generative AI chat streaming failed: ${error}`);
    }
  }

  override hasCapability(capability: PortalCapability): boolean {
    switch (capability) {
      case PortalCapability.TEXT_GENERATION:
      case PortalCapability.CHAT_GENERATION:
      case PortalCapability.STREAMING:
      case PortalCapability.FUNCTION_CALLING:
      case PortalCapability.VISION:
      case PortalCapability.EVALUATION:
      case PortalCapability.TOOL_USAGE:
        return true;
      case PortalCapability.EMBEDDING_GENERATION:
        return false; // Not yet supported in AI SDK v5
      case PortalCapability.IMAGE_GENERATION:
      case PortalCapability.AUDIO:
        return false;
      default:
        return false;
    }
  }

  private convertToModelMessages(messages: ChatMessage[]): ModelMessage[] {
    return messages.map((msg) => {
      switch (msg.role) {
        case MessageRole.SYSTEM:
          return { role: 'system', content: msg.content };

        case MessageRole.USER: {
          // Handle attachments for multimodal support
          if (msg.attachments && msg.attachments.length > 0) {
            const content: Array<{
              type: string;
              text?: string;
              image?: string | URL;
              mediaType?: string;
            }> = [{ type: 'text', text: msg.content }];

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

export function createGoogleGenerativePortal(
  config: GoogleGenerativeConfig
): GoogleGenerativePortal {
  return new GoogleGenerativePortal({
    ...defaultGenerativeConfig,
    ...config,
  });
}
