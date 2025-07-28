/**
 * Vercel AI SDK Portal
 *
 * Comprehensive AI portal providing unified access to 20+ AI providers through
 * the Vercel AI SDK's powerful abstraction layer with advanced features
 */

import { createAnthropic } from '@ai-sdk/anthropic';
import { createCohere } from '@ai-sdk/cohere';
import { createGroq } from '@ai-sdk/groq';
import { createOpenAI } from '@ai-sdk/openai';
import { createPerplexity } from '@ai-sdk/perplexity';
import {
  generateText,
  streamText,
  embed,
  experimental_generateImage as generateImage,
  tool,
  createProviderRegistry,
  type EmbeddingModel,
  type ImageModel,
  CoreMessage as AIMessage,
} from 'ai';
import { z } from 'zod';

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
  FinishReason,
  MessageRole,
} from '../../types/portal';
import type {
  LanguageModel,
  AIMessage as ModelMessage,
} from '../../types/portals/ai-sdk';
import { AISDKParameterBuilder } from '../ai-sdk-utils';
import { BasePortal } from '../base-portal';
import { convertUsage } from '../utils';

export interface VercelAIConfig extends PortalConfig {
  providers: ProviderConfig[];
  defaultProvider?: string;
  defaultModel?: string;
  enabledProviders?: string[];
  providerRegistry?: unknown;
  tools?: ToolDefinition[];
  maxRetries?: number;
  retryDelay?: number;
}

export interface ProviderConfig {
  name: string;
  type:
    | 'openai'
    | 'anthropic'
    | 'google'
    | 'mistral'
    | 'groq'
    | 'togetherai'
    | 'cohere'
    | 'perplexity'
    | 'fireworks'
    | 'deepinfra'
    | 'replicate'
    | 'custom';
  apiKey?: string;
  baseUrl?: string;
  models?: ModelConfig[];
  enabled?: boolean;
  settings?: Record<string, unknown>;
}

export interface ModelConfig {
  id: string;
  name: string;
  type: 'text' | 'chat' | 'embedding' | 'image';
  capabilities: string[];
  maxTokens?: number;
  supportsStreaming?: boolean;
  supportsTools?: boolean;
  supportsVision?: boolean;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: z.ZodSchema;
  execute: (args: unknown) => Promise<unknown>;
}

export const defaultVercelConfig: Partial<VercelAIConfig> = {
  maxTokens: 4096, // Keep as config property, map to maxOutputTokens in calls
  temperature: 0.7,
  timeout: 60000,
  maxRetries: 3,
  retryDelay: 1000,
  enabledProviders: ['openai', 'anthropic', 'google'],
  defaultProvider: 'openai',
  defaultModel: 'gpt-4.1-mini',
};

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
  'replicate',
];

export class VercelAIPortal extends BasePortal {
  type = PortalType.VERCEL_AI;
  supportedModels = [
    ModelType.TEXT_GENERATION,
    ModelType.CHAT,
    ModelType.MULTIMODAL,
    ModelType.EMBEDDING,
    ModelType.CODE_GENERATION,
    ModelType.IMAGE_GENERATION,
  ];

  private registry: any;
  private providers: Map<string, any> = new Map();
  private tools: Map<string, ToolDefinition> = new Map();
  private enabledProviders: Set<string> = new Set();

  constructor(config: VercelAIConfig) {
    super('vercel-ai', 'Vercel AI SDK', '1.0.0', config);
    this.initializeProviders(config);
    this.initializeTools(config.tools || []);
    this.setupProviderRegistry();
  }

  protected override getDefaultModel(
    type: 'chat' | 'tool' | 'embedding' | 'image'
  ): string {
    const config = this.config as VercelAIConfig;
    const defaultProvider = config.defaultProvider || 'openai';

    switch (type) {
      case 'chat':
        return `${defaultProvider}:${config.defaultModel || 'gpt-4.1-mini'}`;
      case 'tool':
        return `${defaultProvider}:gpt-4.1-mini`;
      case 'embedding':
        if (defaultProvider === 'openai')
          return 'openai:text-embedding-3-small';
        if (defaultProvider === 'cohere') return 'cohere:embed-english-v3.0';
        return 'openai:text-embedding-3-small';
      case 'image':
        if (defaultProvider === 'openai') return 'openai:dall-e-3';
        if (defaultProvider === 'replicate')
          return 'replicate:black-forest-labs/flux-schnell';
        return 'openai:dall-e-3';
      default:
        return `${defaultProvider}:${config.defaultModel || 'gpt-4.1-mini'}`;
    }
  }

  private initializeProviders(config: VercelAIConfig): void {
    const enabledProviders = config.enabledProviders || supportedProviders;

    for (const providerName of enabledProviders) {
      this.enabledProviders.add(providerName);

      try {
        let provider: unknown;
        const providerConfig = config.providers?.find(
          (p) => p.name === providerName
        );

        switch (providerName) {
          case 'openai': {
            const apiKey = providerConfig?.apiKey || process.env.OPENAI_API_KEY;
            if (apiKey) {
              provider = createOpenAI({
                apiKey,
              });
            } else {
              // OpenAI API key not found
              continue;
            }
            break;
          }
          case 'anthropic': {
            const apiKey =
              providerConfig?.apiKey || process.env.ANTHROPIC_API_KEY;
            if (apiKey) {
              provider = createAnthropic({
                apiKey,
              });
            } else {
              // Anthropic API key not found
              continue;
            }
            break;
          }
          case 'groq': {
            const apiKey = providerConfig?.apiKey || process.env.GROQ_API_KEY;
            if (apiKey) {
              provider = createGroq({
                apiKey,
              });
            } else {
              // Groq API key not found
              continue;
            }
            break;
          }
          case 'cohere': {
            const apiKey = providerConfig?.apiKey || process.env.COHERE_API_KEY;
            if (apiKey) {
              provider = createCohere({
                apiKey,
              });
            } else {
              // Cohere API key not found
              continue;
            }
            break;
          }
          case 'perplexity': {
            const apiKey =
              providerConfig?.apiKey || process.env.PERPLEXITY_API_KEY;
            if (apiKey) {
              provider = createPerplexity({
                apiKey,
              });
            } else {
              // Perplexity API key not found
              continue;
            }
            break;
          }
          default:
            // Unknown provider
            continue;
        }

        if (provider) {
          this.providers.set(providerName, provider);
          // Initialized provider successfully
        }
      } catch {
        // Failed to initialize provider
      }
    }
  }

  private initializeTools(tools: ToolDefinition[]): void {
    for (const toolDef of tools) {
      this.tools.set(toolDef.name, toolDef);
    }
  }

  private setupProviderRegistry(): void {
    const registryConfig: Record<string, any> = {};

    for (const [name, provider] of Array.from(this.providers.entries())) {
      registryConfig[name] = provider;
    }

    this.registry = createProviderRegistry(registryConfig as any);
  }

  override async init(_agent: Agent): Promise<void> {
    this.status = PortalStatus.INITIALIZING;
    // Initializing Vercel AI SDK portal for agent

    try {
      await this.validateConfig();
      await this.healthCheck();
      this.status = PortalStatus.ACTIVE;
      // Vercel AI SDK portal initialized successfully
    } catch (error) {
      void error;
      this.status = PortalStatus.ERROR;
      // Failed to initialize Vercel AI SDK portal
      throw error;
    }
  }

  protected override async validateConfig(): Promise<void> {
    if (this.providers.size === 0) {
      throw new Error(
        'At least one provider must be configured for Vercel AI SDK portal'
      );
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const model = this.resolveModel('tool');
      const { text } = await generateText({
        model: this.getLanguageModel(model),
        prompt: 'Hello',
        maxOutputTokens: 10,
      });
      return !!text;
    } catch {
      // Vercel AI SDK health check failed
      return false;
    }
  }

  private getLanguageModel(modelSpec: string): any {
    if (modelSpec.includes(':')) {
      const [providerName, modelId] = modelSpec.split(':');
      if (providerName && modelId) {
        const provider = this.providers.get(providerName);
        if (provider && typeof provider === 'function') {
          return provider(modelId);
        }
      }
    }

    // Fallback to registry
    if (this.registry) {
      return (this.registry as any).languageModel(modelSpec);
    }

    throw new Error(`Model not found: ${modelSpec}`);
  }

  private getEmbeddingModel(modelSpec: string): EmbeddingModel<string> {
    if (modelSpec.includes(':')) {
      const [providerName, modelId] = modelSpec.split(':');
      if (providerName && modelId) {
        const provider = this.providers.get(providerName) as any;
        if (provider && provider.textEmbeddingModel) {
          return provider.textEmbeddingModel(modelId);
        }
      }
    }

    throw new Error(`Embedding model not found: ${modelSpec}`);
  }

  private getImageModel(modelSpec: string): ImageModel {
    if (modelSpec.includes(':')) {
      const [providerName, modelId] = modelSpec.split(':');
      if (providerName && modelId) {
        const provider = this.providers.get(providerName) as any;
        if (provider && provider.imageModel) {
          return provider.imageModel(modelId);
        }
      }
    }

    throw new Error(`Image model not found: ${modelSpec}`);
  }

  override async generateText(
    prompt: string,
    options?: TextGenerationOptions
  ): Promise<TextGenerationResult> {
    const model = options?.model || this.resolveModel('chat');

    try {
      const toolsToUse = this.buildTools();

      const params: any = {
        model: this.getLanguageModel(model),
        prompt,
      };

      const maxOutputTokens = options?.maxTokens || this.config.maxTokens;
      if (maxOutputTokens !== undefined) {
        params.maxOutputTokens = maxOutputTokens;
      }

      const temperature = options?.temperature || this.config.temperature;
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

      const { text, usage, finishReason } = await generateText({
        ...params,
        ...(toolsToUse.size > 0 && { tools: Object.fromEntries(toolsToUse) }),
      });

      return {
        text,
        model,
        usage: convertUsage(usage),
        finishReason: this.mapFinishReason(finishReason),
        timestamp: new Date(),
      };
    } catch (error) {
      void error;
      throw new Error(`Vercel AI SDK text generation failed: ${error}`);
    }
  }

  override async generateChat(
    messages: ChatMessage[],
    options?: ChatGenerationOptions
  ): Promise<ChatGenerationResult> {
    const model = options?.model || this.resolveModel('chat');

    try {
      const modelMessages = this.convertToModelMessages(messages);
      const toolsToUse = this.buildTools();

      const params: any = {
        model: this.getLanguageModel(model),
        messages: modelMessages,
      };

      const maxOutputTokens = options?.maxTokens || this.config.maxTokens;
      if (maxOutputTokens !== undefined) {
        params.maxOutputTokens = maxOutputTokens;
      }

      const temperature = options?.temperature || this.config.temperature;
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

      if (toolsToUse.size > 0) {
        params.tools = Object.fromEntries(toolsToUse);
      }

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
      void error;
      throw new Error(`Vercel AI SDK chat generation failed: ${error}`);
    }
  }

  override async generateEmbedding(
    text: string,
    options?: EmbeddingOptions
  ): Promise<EmbeddingResult> {
    const model = options?.model || this.resolveModel('embedding');

    try {
      const { embedding, usage } = await embed({
        model: this.getEmbeddingModel(model),
        value: text,
      });

      const result: EmbeddingResult = {
        embedding,
        dimensions: embedding.length,
        model,
      };

      if (usage) {
        result.usage = {
          promptTokens: usage.tokens,
          totalTokens: usage.tokens,
        };
      }

      return result;
    } catch (error) {
      void error;
      throw new Error(`Vercel AI SDK embedding generation failed: ${error}`);
    }
  }

  override async generateImage(
    prompt: string,
    options?: ImageGenerationOptions
  ): Promise<ImageGenerationResult> {
    const model = options?.model || this.resolveModel('image');

    try {
      const imageParams = AISDKParameterBuilder.buildImageGenerationParams(
        {
          model: this.getImageModel(model),
          prompt,
          n: options?.n || 1,
        },
        options
      );

      const { image } = await generateImage(imageParams);

      return {
        images: [
          {
            url:
              (image as any).url ||
              (image as any).b64_json ||
              'data:image/png;base64,' + image,
          },
        ],
        model,
        usage: {
          promptTokens: prompt.length,
          totalTokens: prompt.length,
        },
      };
    } catch (error) {
      void error;
      throw new Error(`Vercel AI SDK image generation failed: ${error}`);
    }
  }

  override async *streamText(
    prompt: string,
    options?: TextGenerationOptions
  ): AsyncGenerator<string> {
    const model = options?.model || this.resolveModel('chat');

    try {
      const toolsToUse = this.buildTools();

      const baseParams = {
        model: this.getLanguageModel(model),
        prompt,
      };

      const streamParams = {
        ...baseParams,
        ...(options?.maxTokens && { maxOutputTokens: options.maxTokens }),
        ...(this.config.maxTokens &&
          !options?.maxTokens && { maxOutputTokens: this.config.maxTokens }),
        ...(options?.temperature && { temperature: options.temperature }),
        ...(this.config.temperature &&
          !options?.temperature && { temperature: this.config.temperature }),
        ...(options?.topP && { topP: options.topP }),
        ...(options?.frequencyPenalty && {
          frequencyPenalty: options.frequencyPenalty,
        }),
        ...(options?.presencePenalty && {
          presencePenalty: options.presencePenalty,
        }),
        ...(options?.stop && { stopSequences: options.stop }),
        ...(toolsToUse.size > 0 && { tools: Object.fromEntries(toolsToUse) }),
      };

      const { textStream } = await streamText(streamParams);

      for await (const textPart of textStream) {
        yield textPart;
      }
    } catch (error) {
      void error;
      throw new Error(`Vercel AI SDK text streaming failed: ${error}`);
    }
  }

  override async *streamChat(
    messages: ChatMessage[],
    options?: ChatGenerationOptions
  ): AsyncGenerator<string> {
    const model = options?.model || this.resolveModel('chat');

    try {
      const modelMessages = this.convertToModelMessages(messages);
      const toolsToUse = this.buildTools();

      const streamParams: any = {
        model: this.getLanguageModel(model),
        messages: modelMessages,
      };

      // Add required parameters
      const maxTokens = options?.maxTokens || this.config.maxTokens;
      if (maxTokens) streamParams.maxOutputTokens = maxTokens;

      const temperature = options?.temperature || this.config.temperature;
      if (temperature !== undefined) streamParams.temperature = temperature;

      // Add optional parameters
      if (options?.topP) streamParams.topP = options.topP;
      if (options?.frequencyPenalty)
        streamParams.frequencyPenalty = options.frequencyPenalty;
      if (options?.presencePenalty)
        streamParams.presencePenalty = options.presencePenalty;
      if (options?.stop) streamParams.stopSequences = options.stop;
      if (toolsToUse.size > 0)
        streamParams.tools = Object.fromEntries(toolsToUse);

      const { textStream } = await streamText(streamParams);

      for await (const textPart of textStream) {
        yield textPart;
      }
    } catch (error) {
      void error;
      throw new Error(`Vercel AI SDK chat streaming failed: ${error}`);
    }
  }

  override hasCapability(capability: PortalCapability): boolean {
    switch (capability) {
      case PortalCapability.TEXT_GENERATION:
      case PortalCapability.CHAT_GENERATION:
      case PortalCapability.EMBEDDING_GENERATION:
      case PortalCapability.STREAMING:
      case PortalCapability.FUNCTION_CALLING:
      case PortalCapability.TOOL_USAGE:
      case PortalCapability.EVALUATION:
        return true;
      case PortalCapability.IMAGE_GENERATION:
        return (
          this.providers.has('openai') ||
          this.providers.has('replicate') ||
          this.providers.has('deepinfra')
        );
      case PortalCapability.VISION:
        return (
          this.providers.has('openai') ||
          this.providers.has('anthropic') ||
          this.providers.has('google')
        );
      case PortalCapability.AUDIO:
        return false; // Not yet supported
      default:
        return false;
    }
  }

  private convertToModelMessages(messages: ChatMessage[]): AIMessage[] {
    return messages.map((msg) => {
      switch (msg.role) {
        case MessageRole.SYSTEM:
          return { role: 'system', content: msg.content };

        case MessageRole.USER: {
          // Handle attachments for multimodal support
          if (msg.attachments && msg.attachments.length > 0) {
            type TextPart = { type: 'text'; text: string };
            type ImagePart = {
              type: 'image';
              image: string | URL;
              mediaType?: string;
            };
            const content: Array<TextPart | ImagePart> = [
              { type: 'text', text: msg.content },
            ];

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

  private buildTools(): Map<string, unknown> {
    const toolsMap = new Map();

    for (const [name, toolDef] of Array.from(this.tools.entries())) {
      toolsMap.set(
        name,
        tool({
          description: toolDef.description,
          parameters: toolDef.parameters,
          execute: toolDef.execute,
        })
      );
    }

    return toolsMap;
  }

  private mapFinishReason(reason?: string): FinishReason {
    switch (reason) {
      case 'stop':
        return FinishReason.STOP;
      case 'length':
        return FinishReason.LENGTH;
      case 'tool-calls':
      case 'function_call':
        return FinishReason.FUNCTION_CALL;
      case 'content-filter':
        return FinishReason.CONTENT_FILTER;
      case 'error':
        return FinishReason.ERROR;
      case 'cancelled':
        return FinishReason.CANCELLED;
      default:
        return FinishReason.STOP;
    }
  }

  // Method to add a new tool at runtime
  addTool(toolDef: ToolDefinition): void {
    this.tools.set(toolDef.name, toolDef);
  }

  // Method to remove a tool
  removeTool(name: string): void {
    this.tools.delete(name);
  }

  // Method to list available models from all providers
  getAvailableModels(): Record<string, string[]> {
    const models: Record<string, string[]> = {};

    for (const providerName of Array.from(this.enabledProviders)) {
      models[providerName] = this.getProviderModels(providerName);
    }

    return models;
  }

  private getProviderModels(providerName: string): string[] {
    // This would typically come from the provider's model list
    // For now, returning common models for each provider
    const commonModels: Record<string, string[]> = {
      openai: ['gpt-4o', 'gpt-4.1-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
      anthropic: [
        'claude-3-5-sonnet-20241022',
        'claude-3-5-haiku-20241022',
        'claude-3-opus-20240229',
      ],
      google: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-pro'],
      mistral: [
        'mistral-large-latest',
        'mistral-medium-latest',
        'mistral-small-latest',
      ],
      groq: ['llama-3.1-8b-instant', 'mixtral-8x7b-32768', 'gemma-7b-it'],
      togetherai: [
        'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
        'mistralai/Mixtral-8x7B-Instruct-v0.1',
      ],
      cohere: ['command-r-plus', 'command-r', 'command'],
      perplexity: [
        'llama-3.1-sonar-small-128k-online',
        'llama-3.1-sonar-large-128k-online',
      ],
      fireworks: [
        'accounts/fireworks/models/llama-v3p1-8b-instruct',
        'accounts/fireworks/models/mixtral-8x7b-instruct',
      ],
      deepinfra: [
        'meta-llama/Meta-Llama-3.1-8B-Instruct',
        'mistralai/Mixtral-8x7B-Instruct-v0.1',
      ],
      replicate: [
        'meta/meta-llama-3.1-8b-instruct',
        'mistralai/mixtral-8x7b-instruct-v0.1',
      ],
    };

    return commonModels[providerName] || [];
  }
}

export function createVercelAIPortal(config: VercelAIConfig): VercelAIPortal {
  return new VercelAIPortal({
    ...defaultVercelConfig,
    ...config,
  });
}
