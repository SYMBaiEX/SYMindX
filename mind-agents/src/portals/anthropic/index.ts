/**
 * Anthropic Portal Implementation
 *
 * This portal provides integration with Anthropic's Claude API using the Vercel AI SDK.
 * Supports Claude's advanced reasoning and safety features.
 */

import { anthropic, createAnthropic } from '@ai-sdk/anthropic';
import {
  generateText,
  streamText,
  tool,
  // CoreTool, // Not available in current version
  // stepCountIs, // Not available in ai@5.0.0-canary.24
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
import { UnifiedContext } from '../../types/context/unified-context.js';
import type {
  AIMessage as ModelMessage,
  AIContentPart,
} from '../../types/portals/ai-sdk';
import { BasePortal } from '../base-portal';
import { convertUsage } from '../utils';
import {
  ContextPromptTransformer,
  ContextModelSelector,
  ContextPerformanceOptimizer,
} from '../context-helpers.js';

export interface AnthropicConfig extends PortalConfig {
  model?: string;
  baseURL?: string;
  // Advanced AI SDK v5 features
  enableToolStreaming?: boolean;
  maxSteps?: number;
  enableComputerUse?: boolean; // Claude's computer use capability
}

export class AnthropicPortal extends BasePortal {
  type: PortalType = PortalType.ANTHROPIC;
  supportedModels: ModelType[] = [
    ModelType.TEXT_GENERATION,
    ModelType.CHAT,
    ModelType.MULTIMODAL,
  ];
  private anthropicProvider: ReturnType<typeof createAnthropic>;

  constructor(config: AnthropicConfig) {
    super('anthropic', 'Anthropic', '1.0.0', config);

    // Create Anthropic provider with proper AI SDK v5 configuration
    const apiKey = config.apiKey || process.env['ANTHROPIC_API_KEY'];
    if (!apiKey) {
      throw new Error('Anthropic API key is required');
    }

    const providerConfig: any = {
      apiKey,
    };

    if (config.baseURL) {
      providerConfig.baseURL = config.baseURL;
    }

    this.anthropicProvider = anthropic;
  }

  /**
   * Get language model instance using AI SDK v5 patterns
   */
  private getLanguageModel(modelId?: string) {
    const model =
      modelId ||
      (this.config as AnthropicConfig).model ||
      'claude-3-5-sonnet-20241022';

    return this.anthropicProvider(model);
  }

  /**
   * Create a tool using AI SDK v5 tool function
   */
  createTool(
    name: string,
    description: string,
    parameters: any,
    execute: Function
  ) {
    return tool({
      description,
      parameters,
      execute,
    });
  }

  /**
   * Map MessageRole to AI SDK role type
   */
  private mapMessageRole(
    role: MessageRole
  ): 'system' | 'user' | 'assistant' | 'tool' {
    switch (role) {
      case MessageRole.SYSTEM:
        return 'system';
      case MessageRole.USER:
        return 'user';
      case MessageRole.ASSISTANT:
        return 'assistant';
      case MessageRole.TOOL:
        return 'tool';
      case MessageRole.FUNCTION:
        return 'assistant'; // Functions are mapped to assistant
      default:
        return 'user'; // Default fallback
    }
  }

  /**
   * Generate text using Anthropic's completion API
   */
  override async generateText(
    prompt: string,
    options?: TextGenerationOptions
  ): Promise<TextGenerationResult> {
    try {
      const model =
        options?.model ||
        (this.config as AnthropicConfig).model ||
        'claude-3-5-sonnet-20241022';

      const baseParams = {
        model: this.getLanguageModel(model),
        prompt,
      };

      const params: any = { ...baseParams };

      // Use maxOutputTokens for AI SDK v5
      const maxOutputTokens =
        options?.maxOutputTokens ?? options?.maxTokens ?? this.config.maxTokens;
      if (maxOutputTokens !== undefined) {
        params.maxOutputTokens = maxOutputTokens;
      }

      if (options?.temperature ?? this.config.temperature) {
        params.temperature = options?.temperature ?? this.config.temperature;
      }

      if (options?.topP) {
        params.topP = options.topP;
      }

      const result = await generateText(params);

      return {
        text: result.text,
        usage: convertUsage(result.usage),
        finishReason: this.mapFinishReason(result.finishReason),
        metadata: {
          model,
          provider: 'anthropic',
        },
      };
    } catch (error) {
      void error;
      throw new Error(`Anthropic text generation failed: ${error}`);
    }
  }

  /**
   * Generate chat response using Anthropic's messages API
   */
  override async generateChat(
    messages: ChatMessage[],
    options?: ChatGenerationOptions
  ): Promise<ChatGenerationResult> {
    try {
      const model =
        options?.model ||
        (this.config as AnthropicConfig).model ||
        'claude-3-5-sonnet-20241022';
      const modelMessages = this.convertToModelMessages(messages);

      const baseOptions = {
        model: this.getLanguageModel(model),
        messages: modelMessages,
      };

      const generateOptions: any = { ...baseOptions };

      // Use maxOutputTokens (AI SDK v5) instead of maxTokens
      if (
        options?.maxOutputTokens ??
        options?.maxTokens ??
        this.config.maxTokens
      ) {
        generateOptions.maxOutputTokens =
          options?.maxOutputTokens ??
          options?.maxTokens ??
          this.config.maxTokens;
      }

      if (options?.temperature ?? this.config.temperature) {
        generateOptions.temperature =
          options?.temperature ?? this.config.temperature;
      }

      if (options?.topP) {
        generateOptions.topP = options.topP;
      }

      // Add tools if provided (native AI SDK v5 tools)
      if (options?.tools) {
        generateOptions.tools = options.tools;
        generateOptions.maxSteps = options?.maxSteps || 5; // Enable multi-step tool execution

        // Add comprehensive tool streaming callbacks
        if (options?.onStepFinish) {
          generateOptions.onStepFinish = options.onStepFinish;
        }
      }

      const result = await generateText(generateOptions);

      const assistantMessage: ChatMessage = {
        role: MessageRole.ASSISTANT,
        content: result.text,
        timestamp: new Date(),
      };

      return {
        message: assistantMessage,
        text: result.text,
        model,
        usage: convertUsage(result.usage),
        finishReason: this.mapFinishReason(result.finishReason),
        timestamp: new Date(),
        metadata: {
          model,
          provider: 'anthropic',
        },
      };
    } catch (error) {
      void error;
      throw new Error(`Anthropic chat generation failed: ${error}`);
    }
  }

  /**
   * Generate embeddings - Note: Anthropic doesn't provide embedding models
   * This is a placeholder that throws an error
   */
  override async generateEmbedding(
    _text: string,
    _options?: EmbeddingOptions
  ): Promise<EmbeddingResult> {
    throw new Error(
      'Anthropic does not provide embedding models. Consider using OpenAI or another provider for embeddings.'
    );
  }

  /**
   * Generate images - Note: Anthropic doesn't provide image generation models
   * This is a placeholder that throws an error
   */
  override async generateImage(
    _prompt: string,
    _options?: ImageGenerationOptions
  ): Promise<ImageGenerationResult> {
    throw new Error(
      'Anthropic does not provide image generation models. Consider using OpenAI or another provider for image generation.'
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
      const model =
        options?.model ||
        (this.config as AnthropicConfig).model ||
        'claude-3-5-sonnet-20241022';

      const baseParams = {
        model: this.getLanguageModel(model),
        prompt,
      };

      const params: any = { ...baseParams };

      // Use maxOutputTokens for AI SDK v5
      const maxOutputTokens =
        options?.maxOutputTokens ?? options?.maxTokens ?? this.config.maxTokens;
      if (maxOutputTokens !== undefined) {
        params.maxOutputTokens = maxOutputTokens;
      }

      if (options?.temperature ?? this.config.temperature) {
        params.temperature = options?.temperature ?? this.config.temperature;
      }

      if (options?.topP) {
        params.topP = options.topP;
      }

      const result = await streamText(params);

      for await (const textPart of result.textStream) {
        yield textPart;
      }
    } catch (error) {
      void error;
      throw new Error(`Anthropic stream text failed: ${error}`);
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
      const model =
        options?.model ||
        (this.config as AnthropicConfig).model ||
        'claude-3-5-sonnet-20241022';
      const modelMessages = this.convertToModelMessages(messages);

      const baseOptions = {
        model: this.getLanguageModel(model),
        messages: modelMessages,
      };

      const streamOptions: any = { ...baseOptions };

      // Use maxOutputTokens (AI SDK v5) instead of maxTokens
      if (
        options?.maxOutputTokens ??
        options?.maxTokens ??
        this.config.maxTokens
      ) {
        streamOptions.maxOutputTokens =
          options?.maxOutputTokens ??
          options?.maxTokens ??
          this.config.maxTokens;
      }

      if (options?.temperature ?? this.config.temperature) {
        streamOptions.temperature =
          options?.temperature ?? this.config.temperature;
      }

      if (options?.topP) {
        streamOptions.topP = options.topP;
      }

      // Add tools if provided with comprehensive AI SDK v5 streaming support
      if (options?.tools) {
        streamOptions.tools = options.tools;
        streamOptions.maxSteps = options?.maxSteps || 5; // Enable multi-step tool execution

        // Add comprehensive tool streaming callbacks for AI SDK v5
        if (options?.onStepFinish) {
          streamOptions.onStepFinish = options.onStepFinish;
        }

        // Enable tool call streaming (default in AI SDK v5)
        streamOptions.toolCallStreaming = true;
      }

      const result = await streamText(streamOptions);

      for await (const textPart of result.textStream) {
        yield textPart;
      }
    } catch (error) {
      void error;
      throw new Error(`Anthropic stream chat failed: ${error}`);
    }
  }

  /**
   * Convert ChatMessage[] to ModelMessage[] format for AI SDK v5
   */
  private convertToModelMessages(messages: ChatMessage[]): ModelMessage[] {
    const modelMessages: ModelMessage[] = [];

    // Extract system messages and combine them
    const systemMessages = messages.filter(
      (msg) => msg.role === MessageRole.SYSTEM
    );
    if (systemMessages.length > 0) {
      // Anthropic expects a single system message at the beginning
      const systemContent = systemMessages
        .map((msg) => msg.content)
        .join('\n\n');
      modelMessages.push({
        role: 'system',
        content: systemContent,
      });
    }

    // Add non-system messages
    for (const msg of messages) {
      if (msg.role === MessageRole.SYSTEM) continue;

      const modelMessage: ModelMessage = {
        role:
          msg.role === MessageRole.FUNCTION
            ? 'assistant'
            : this.mapMessageRole(msg.role),
        content: msg.content,
      };

      // Handle attachments for multimodal support
      if (msg.attachments && msg.attachments.length > 0) {
        const content: AIContentPart[] = [{ type: 'text', text: msg.content }];

        for (const attachment of msg.attachments) {
          if (attachment.type === 'image') {
            if (attachment.data) {
              const imagePart: any = {
                type: 'image',
                image: attachment.data,
              };
              if (attachment.mimeType) {
                imagePart.mimeType = attachment.mimeType;
              }
              content.push(imagePart);
            } else if (attachment.url) {
              content.push({
                type: 'image',
                image: new URL(attachment.url),
              });
            }
          }
        }

        modelMessage.content = content;
      }

      modelMessages.push(modelMessage);
    }

    return modelMessages;
  }

  /**
   * Map finish reasons from AI SDK to our internal format
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

  /**
   * Stream text generation with full stream access for advanced tool calling
   * Provides access to all stream events including tool calls, tool results, and text
   */
  async *streamTextWithFullAccess(
    prompt: string,
    options?: TextGenerationOptions & {
      onToolCall?: (toolCall: any) => void;
      onToolResult?: (toolResult: any) => void;
      onStepFinish?: (step: any) => void;
    }
  ): AsyncGenerator<{
    type: 'text' | 'tool-call' | 'tool-result' | 'finish' | 'error';
    content: any;
  }> {
    try {
      const model =
        options?.model ||
        (this.config as AnthropicConfig).model ||
        'claude-3-5-sonnet-20241022';

      const baseParams = {
        model: this.getLanguageModel(model),
        prompt,
      };

      const params: any = { ...baseParams };

      if (
        options?.maxOutputTokens ??
        options?.maxTokens ??
        this.config.maxTokens
      ) {
        params.maxOutputTokens =
          options?.maxOutputTokens ??
          options?.maxTokens ??
          this.config.maxTokens;
      }

      if (options?.temperature ?? this.config.temperature) {
        params.temperature = options?.temperature ?? this.config.temperature;
      }

      if (options?.topP) {
        params.topP = options.topP;
      }

      // Add tools with full streaming support
      if (options?.tools) {
        params.tools = options.tools;
        params.maxSteps = options?.maxSteps || 5;
        params.toolCallStreaming = true;

        if (options?.onStepFinish) {
          params.onStepFinish = options.onStepFinish;
        }
      }

      const result = await streamText(params);

      // Stream all events from the full stream
      for await (const part of result.fullStream) {
        switch (part.type) {
          case 'text':
            yield { type: 'text', content: part.text };
            break;
          case 'tool-call':
            if (options?.onToolCall) {
              options.onToolCall(part);
            }
            yield { type: 'tool-call', content: part };
            break;
          case 'tool-result':
            if (options?.onToolResult) {
              options.onToolResult(part);
            }
            yield { type: 'tool-result', content: part };
            break;
          case 'finish':
            yield { type: 'finish', content: part };
            break;
          case 'error':
            yield { type: 'error', content: part };
            break;
        }
      }
    } catch (error) {
      void error;
      yield { type: 'error', content: error };
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
      case PortalCapability.TOOL_USAGE:
      case PortalCapability.EVALUATION:
        return true;
      case PortalCapability.EMBEDDING_GENERATION:
      case PortalCapability.IMAGE_GENERATION:
      case PortalCapability.AUDIO:
        return false;
      default:
        return false;
    }
  }

  /**
   * Generate text with multi-step support (AI SDK v5 feature)
   * Supports tool calling with multiple steps
   */
  override async generateTextMultiStep(
    prompt: string,
    options?: TextGenerationOptions & {
      tools?: Record<string, any>;
      maxSteps?: number;
      onStepFinish?: (step: number, result: any) => void;
    }
  ): Promise<TextGenerationResult> {
    const config = this.config as AnthropicConfig;
    const maxSteps = options?.maxSteps || config.maxSteps || 5;

    try {
      const params: any = {
        model: this.getLanguageModel(
          options?.model || this.resolveModel('chat')
        ),
        messages: [{ role: 'user' as const, content: prompt }],
        maxOutputTokens:
          options?.maxOutputTokens ??
          options?.maxTokens ??
          this.config.maxTokens,
        temperature: options?.temperature ?? this.config.temperature,
      };

      // Add tools if provided
      if (options?.tools) {
        params.tools = options.tools;
        params.toolChoice = 'auto';
        // TODO: Re-enable when stepCountIs is available in stable AI SDK v5
        // params.stopWhen = stepCountIs(maxSteps);
        params.maxSteps = maxSteps; // Fallback to maxSteps
      }

      // Add step callbacks
      if (options?.onStepFinish) {
        params.onStepFinish = async ({
          stepType,
          stepCount,
          toolCalls,
          toolResults,
        }: any) => {
          options.onStepFinish!(stepCount, {
            stepType,
            toolCalls,
            toolResults,
          });
        };
      }

      // Add computer use support for Claude if enabled
      if (config.enableComputerUse && params.tools) {
        params.providerOptions = {
          anthropic: {
            betaVersion: 'computer-use-2024-10-22',
          },
        };
      }

      const { text, usage, finishReason, steps } = await generateText(params);

      return {
        text,
        model: options?.model || this.resolveModel('chat'),
        usage: convertUsage(usage),
        finishReason: this.mapFinishReason(finishReason),
        timestamp: new Date(),
        metadata: {
          steps: steps?.length || 1,
          toolCalls: steps?.flatMap((s) => s.toolCalls || []),
        },
      };
    } catch (error) {
      throw new Error(`Anthropic multi-step text generation failed: ${error}`);
    }
  }

  /**
   * Generate chat with multi-step support (AI SDK v5 feature)
   */
  override async generateChatMultiStep(
    messages: ChatMessage[],
    options?: ChatGenerationOptions & {
      tools?: Record<string, any>;
      maxSteps?: number;
      onStepFinish?: (step: number, result: any) => void;
    }
  ): Promise<ChatGenerationResult> {
    const config = this.config as AnthropicConfig;
    const maxSteps = options?.maxSteps || config.maxSteps || 5;

    try {
      const modelMessages = this.convertToModelMessages(messages);

      const params: any = {
        model: this.getLanguageModel(
          options?.model || this.resolveModel('chat')
        ),
        messages: modelMessages,
        maxOutputTokens:
          options?.maxOutputTokens ??
          options?.maxTokens ??
          this.config.maxTokens,
        temperature: options?.temperature ?? this.config.temperature,
      };

      // Add tools if provided
      if (options?.tools) {
        params.tools = options.tools;
        params.toolChoice = 'auto';
        // TODO: Re-enable when stepCountIs is available in stable AI SDK v5
        // params.stopWhen = stepCountIs(maxSteps);
        params.maxSteps = maxSteps; // Fallback to maxSteps
      }

      // Add step callbacks
      if (options?.onStepFinish) {
        params.onStepFinish = async ({
          stepType,
          stepCount,
          toolCalls,
          toolResults,
        }: any) => {
          options.onStepFinish!(stepCount, {
            stepType,
            toolCalls,
            toolResults,
          });
        };
      }

      // Add computer use support for Claude if enabled
      if (config.enableComputerUse && params.tools) {
        params.providerOptions = {
          anthropic: {
            betaVersion: 'computer-use-2024-10-22',
          },
        };
      }

      const { text, usage, finishReason, steps } = await generateText(params);

      const message: ChatMessage = {
        role: MessageRole.ASSISTANT,
        content: text,
        timestamp: new Date(),
      };

      return {
        text,
        model: options?.model || this.resolveModel('chat'),
        message,
        usage: convertUsage(usage),
        finishReason: this.mapFinishReason(finishReason),
        timestamp: new Date(),
        metadata: {
          steps: steps?.length || 1,
          toolCalls: steps?.flatMap((s) => s.toolCalls || []),
        },
      };
    } catch (error) {
      throw new Error(`Anthropic multi-step chat generation failed: ${error}`);
    }
  }

  /**
   * Stream text with enhanced tool support (AI SDK v5 feature)
   */
  override async *streamTextEnhanced(
    prompt: string,
    options?: TextGenerationOptions & {
      tools?: Record<string, any>;
      onToolCallStart?: (toolCallId: string, toolName: string) => void;
      onToolCallFinish?: (toolCallId: string, result: any) => void;
    }
  ): AsyncGenerator<string> {
    const config = this.config as AnthropicConfig;

    try {
      const params: any = {
        model: this.getLanguageModel(
          options?.model || this.resolveModel('chat')
        ),
        messages: [{ role: 'user' as const, content: prompt }],
        maxOutputTokens:
          options?.maxOutputTokens ??
          options?.maxTokens ??
          this.config.maxTokens,
        temperature: options?.temperature ?? this.config.temperature,
      };

      // Add tools if provided
      if (options?.tools) {
        params.tools = options.tools;
        params.toolChoice = 'auto';
        params.toolCallStreaming = config.enableToolStreaming !== false;
      }

      // Add computer use support for Claude if enabled
      if (config.enableComputerUse && params.tools) {
        params.providerOptions = {
          anthropic: {
            betaVersion: 'computer-use-2024-10-22',
          },
        };
      }

      const { textStream, fullStream } = await streamText(params);

      // Process the full stream to handle tool calls
      if (options?.onToolCallStart || options?.onToolCallFinish) {
        const streamIterator = fullStream[Symbol.asyncIterator]();

        while (true) {
          const { done, value } = await streamIterator.next();
          if (done) break;

          switch (value.type) {
            case 'text':
              yield value.text;
              break;
            case 'tool-call':
              if (options.onToolCallStart) {
                options.onToolCallStart(value.toolCallId, value.toolName);
              }
              break;
            case 'tool-result':
              if (options.onToolCallFinish) {
                options.onToolCallFinish(value.toolCallId, value.result);
              }
              break;
          }
        }
      } else {
        // Just yield text chunks
        for await (const chunk of textStream) {
          yield chunk;
        }
      }
    } catch (error) {
      throw new Error(`Anthropic enhanced text streaming failed: ${error}`);
    }
  }

  /**
   * Get supported models for different capabilities
   */
  override getSupportedModelsForCapability(
    capability: PortalCapability
  ): string[] {
    switch (capability) {
      case PortalCapability.TEXT_GENERATION:
      case PortalCapability.CHAT_GENERATION:
        return [
          'claude-3-7-sonnet-20250219',
          'claude-3-5-sonnet-20241022',
          'claude-3-5-sonnet-20240620',
          'claude-3-opus-20240229',
          'claude-3-sonnet-20240229',
          'claude-3-haiku-20240307',
        ];
      case PortalCapability.VISION:
        return [
          'claude-3-7-sonnet-20250219',
          'claude-3-5-sonnet-20241022',
          'claude-3-5-sonnet-20240620',
          'claude-3-opus-20240229',
          'claude-3-sonnet-20240229',
          'claude-3-haiku-20240307',
        ];
      case PortalCapability.FUNCTION_CALLING:
      case PortalCapability.TOOL_USAGE:
        return [
          'claude-3-7-sonnet-20250219',
          'claude-3-5-sonnet-20241022',
          'claude-3-5-sonnet-20240620',
          'claude-3-opus-20240229',
        ];
      default:
        return [];
    }
  }

  /**
   * Get the optimal model for a specific capability
   */
  override getOptimalModelForCapability(
    capability: PortalCapability
  ): string | null {
    switch (capability) {
      case PortalCapability.TEXT_GENERATION:
      case PortalCapability.CHAT_GENERATION:
        return 'claude-3-5-sonnet-20241022'; // Latest and most capable
      case PortalCapability.VISION:
        return 'claude-3-5-sonnet-20241022'; // Best vision capabilities
      case PortalCapability.FUNCTION_CALLING:
      case PortalCapability.TOOL_USAGE:
        return 'claude-3-5-sonnet-20241022'; // Best tool support
      default:
        return null;
    }
  }

  /**
   * Generate text with context awareness (Anthropic-specific implementation)
   * Enhances the base implementation with Claude-specific optimizations
   */
  override async generateTextWithContext(
    prompt: string,
    context: UnifiedContext,
    options?: Omit<TextGenerationOptions, 'context'>
  ): Promise<TextGenerationResult> {
    try {
      // Use context helpers to optimize for Claude
      const contextPrompt =
        ContextPromptTransformer.transformToPromptContext(context);
      const enhancedPrompt = contextPrompt
        ? `${contextPrompt}\n\n${prompt}`
        : prompt;

      // Select optimal Claude model based on context
      const availableModels = this.getSupportedModelsForCapability(
        PortalCapability.TEXT_GENERATION
      );
      const contextModel = ContextModelSelector.selectModel(
        context,
        availableModels,
        PortalCapability.TEXT_GENERATION
      );

      // Optimize options for Claude specifics
      const optimizedOptions = ContextPerformanceOptimizer.optimizeOptions(
        context,
        options
      );

      // Use Claude-specific model selection
      const modelToUse =
        contextModel ||
        this.selectClaudeModelFromContext(context) ||
        (this.config as AnthropicConfig).model ||
        'claude-3-5-sonnet-20241022';

      const baseParams = {
        model: this.getLanguageModel(modelToUse),
        prompt: enhancedPrompt,
      };

      const params: any = { ...baseParams };

      // Apply optimized options
      if (optimizedOptions.maxOutputTokens || optimizedOptions.maxTokens) {
        params.maxOutputTokens =
          optimizedOptions.maxOutputTokens || optimizedOptions.maxTokens;
      }

      if (optimizedOptions.temperature !== undefined) {
        params.temperature = optimizedOptions.temperature;
      }

      if (optimizedOptions.topP) {
        params.topP = optimizedOptions.topP;
      }

      // Add context to metadata
      (params as any).context = context;

      const result = await generateText(params);

      return {
        text: result.text,
        usage: convertUsage(result.usage),
        finishReason: this.mapFinishReason(result.finishReason),
        metadata: {
          model: modelToUse,
          provider: 'anthropic',
          contextEnhanced: true,
          contextScope: context.metadata.scope,
        },
      };
    } catch (error) {
      // Fallback to base implementation
      return super.generateTextWithContext(prompt, context, options);
    }
  }

  /**
   * Generate chat with context awareness (Anthropic-specific implementation)
   * Enhances the base implementation with Claude-specific optimizations
   */
  override async generateChatWithContext(
    messages: ChatMessage[],
    context: UnifiedContext,
    options?: Omit<ChatGenerationOptions, 'context'>
  ): Promise<ChatGenerationResult> {
    try {
      // Build context-enhanced messages using base implementation
      const enhancedMessages = this.buildContextualMessages(messages, context);

      // Select optimal Claude model based on context
      const availableModels = this.getSupportedModelsForCapability(
        PortalCapability.CHAT_GENERATION
      );
      const contextModel = ContextModelSelector.selectModel(
        context,
        availableModels,
        PortalCapability.CHAT_GENERATION
      );

      // Optimize options for Claude specifics
      const optimizedOptions = ContextPerformanceOptimizer.optimizeOptions(
        context,
        options
      );

      // Use Claude-specific model selection
      const modelToUse =
        contextModel ||
        this.selectClaudeModelFromContext(context) ||
        (this.config as AnthropicConfig).model ||
        'claude-3-5-sonnet-20241022';

      const modelMessages = this.convertToModelMessages(enhancedMessages);

      const baseOptions = {
        model: this.getLanguageModel(modelToUse),
        messages: modelMessages,
      };

      const generateOptions: any = { ...baseOptions };

      // Apply optimized options
      if (optimizedOptions.maxOutputTokens || optimizedOptions.maxTokens) {
        generateOptions.maxOutputTokens =
          optimizedOptions.maxOutputTokens || optimizedOptions.maxTokens;
      }

      if (optimizedOptions.temperature !== undefined) {
        generateOptions.temperature = optimizedOptions.temperature;
      }

      if (optimizedOptions.topP) {
        generateOptions.topP = optimizedOptions.topP;
      }

      // Add tools if available in context
      if (
        optimizedOptions.tools ||
        (context.tools?.available && context.tools.available.length > 0)
      ) {
        generateOptions.tools =
          optimizedOptions.tools || this.selectToolsFromContext(context);
        generateOptions.maxSteps = optimizedOptions.maxSteps || 5;

        // Add comprehensive tool streaming callbacks
        if (optimizedOptions.onStepFinish) {
          generateOptions.onStepFinish = optimizedOptions.onStepFinish;
        }

        // Enable computer use if configured
        const config = this.config as AnthropicConfig;
        if (config.enableComputerUse) {
          generateOptions.providerOptions = {
            anthropic: {
              betaVersion: 'computer-use-2024-10-22',
            },
          };
        }
      }

      // Add context to metadata
      (generateOptions as any).context = context;

      const result = await generateText(generateOptions);

      const assistantMessage: ChatMessage = {
        role: MessageRole.ASSISTANT,
        content: result.text,
        timestamp: new Date(),
      };

      return {
        message: assistantMessage,
        text: result.text,
        model: modelToUse,
        usage: convertUsage(result.usage),
        finishReason: this.mapFinishReason(result.finishReason),
        timestamp: new Date(),
        metadata: {
          model: modelToUse,
          provider: 'anthropic',
          contextEnhanced: true,
          contextScope: context.metadata.scope,
          toolsUsed: !!generateOptions.tools,
        },
      };
    } catch (error) {
      // Fallback to base implementation
      return super.generateChatWithContext(messages, context, options);
    }
  }

  /**
   * Claude-specific model selection based on context
   */
  private selectClaudeModelFromContext(
    context: UnifiedContext
  ): string | undefined {
    // Check for Anthropic-specific context preferences
    if (
      context.portal?.active &&
      (context.portal.active as any).provider === 'anthropic'
    ) {
      return context.portal.active.model;
    }

    // Use latest Claude for complex reasoning tasks
    if (
      (context.agent?.config?.personality as any)?.reasoning === 'high' ||
      (context.communication?.conversationHistory &&
        context.communication.conversationHistory.length > 20)
    ) {
      return 'claude-3-5-sonnet-20241022'; // Latest Claude for complex tasks
    }

    // Use Claude with computer use for tool-heavy tasks
    if (context.tools?.available && context.tools.available.length > 3) {
      const config = this.config as AnthropicConfig;
      if (config.enableComputerUse) {
        return 'claude-3-5-sonnet-20241022'; // Computer use capable
      }
    }

    // Use Haiku for simple, fast responses
    if (
      context.communication?.style &&
      (context.communication.style as any).speed === 'high' &&
      (context.communication.style as any).complexity === 'low'
    ) {
      return 'claude-3-haiku-20240307';
    }

    // Use multimodal capabilities if needed
    if (
      context.communication?.channel?.capabilities?.includes('image') ||
      context.communication?.channel?.capabilities?.includes('video')
    ) {
      return 'claude-3-5-sonnet-20241022'; // Best multimodal support
    }

    // Default to latest Sonnet
    return 'claude-3-5-sonnet-20241022';
  }

  /**
   * Context-aware temperature selection for Claude models
   * Override base implementation with Claude-specific optimizations
   */
  protected override selectTemperatureFromContext(
    context: UnifiedContext
  ): number {
    // Claude works well with slightly higher temperatures for creativity
    if (context.communication?.style) {
      const style = context.communication.style as any;
      if (style.creativity === 'high') return 0.9; // Higher than base implementation
      if (style.creativity === 'low') return 0.2;
    }

    // Lower temperature for computer use tasks
    const config = this.config as AnthropicConfig;
    if (
      config.enableComputerUse &&
      context.tools?.available &&
      context.tools.available.length > 0
    ) {
      return 0.1;
    }

    // Use base implementation for other cases
    return super.selectTemperatureFromContext(context);
  }
}

// Export factory function for easy instantiation
export function createAnthropicPortal(
  config: AnthropicConfig
): AnthropicPortal {
  return new AnthropicPortal(config);
}

// Export default configuration
export const defaultAnthropicConfig: Partial<AnthropicConfig> = {
  model: 'claude-3-5-sonnet-20241022',
  maxTokens: 1000, // Config property for backward compatibility
  temperature: 0.7,
  timeout: 30000,
};

// Available Anthropic models
export const anthropicModels = {
  // Claude 3.5 Series (Latest)
  'claude-3-5-sonnet-20241022': 'Claude 3.5 Sonnet (Latest) - Best performance',
  'claude-3-5-sonnet-20241120':
    'Claude 3.5 Sonnet (November) - Enhanced capabilities',
  'claude-3-5-haiku-20241022': 'Claude 3.5 Haiku - Fast and efficient',

  // Claude 3 Series
  'claude-3-opus-20240229': 'Claude 3 Opus - Highest intelligence',
  'claude-3-sonnet-20240229': 'Claude 3 Sonnet - Balanced performance',
  'claude-3-haiku-20240307': 'Claude 3 Haiku - Speed optimized',
};
