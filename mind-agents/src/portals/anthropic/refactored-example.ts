/**
 * Refactored Anthropic Portal Implementation Example
 * 
 * This demonstrates how the shared utilities dramatically reduce code duplication
 * and improve maintainability across portal implementations.
 */

import { generateText } from 'ai';
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
  PortalType,
  ModelType,
} from '../../types/portal';
import { BasePortal } from '../base-portal';
import { convertUsage } from '../utils';
import { createPortalHelper, type ProviderConfig } from '../shared';

export interface AnthropicConfig extends PortalConfig {
  model?: string;
  baseURL?: string;
  enableComputerUse?: boolean;
  maxSteps?: number;
  enableToolStreaming?: boolean;
}

/**
 * Simplified Anthropic Portal using shared utilities
 * 
 * Compare this implementation to the original - much cleaner!
 */
export class RefactoredAnthropicPortal extends BasePortal {
  type: PortalType = PortalType.ANTHROPIC;
  supportedModels: ModelType[] = [
    ModelType.TEXT_GENERATION,
    ModelType.CHAT,
    ModelType.MULTIMODAL,
  ];
  
  private helper: ReturnType<typeof createPortalHelper>;
  private provider: any;

  constructor(config: AnthropicConfig) {
    super('anthropic', 'Anthropic', '1.0.0', config);

    // Create portal helper with all shared utilities configured
    this.helper = createPortalHelper('anthropic', config);

    // Create provider using shared factory
    const providerConfig: ProviderConfig = {
      apiKey: config.apiKey || process.env["ANTHROPIC_API_KEY"],
      baseURL: config.baseURL,
    };

    this.provider = this.helper.createProvider(providerConfig);
  }

  /**
   * Generate text - dramatically simplified with shared utilities
   */
  override async generateText(
    prompt: string,
    options?: TextGenerationOptions
  ): Promise<TextGenerationResult> {
    return this.helper.withRetry(async () => {
      const model = this.helper.resolveModel('chat', options?.model);
      const languageModel = this.helper.getLanguageModel(this.provider, model);

      const params = this.helper.buildTextParams({
        model: languageModel,
        prompt,
      }, options);

      const result = await generateText(params);

      return {
        text: result.text,
        usage: convertUsage(result.usage),
        finishReason: this.helper.mapFinishReason(result.finishReason),
        metadata: { model, provider: 'anthropic' },
      };
    }, 'generateText', options?.model);
  }

  /**
   * Generate chat - dramatically simplified with shared utilities
   */
  override async generateChat(
    messages: ChatMessage[],
    options?: ChatGenerationOptions
  ): Promise<ChatGenerationResult> {
    return this.helper.withRetry(async () => {
      const model = this.helper.resolveModel('chat', options?.model);
      const languageModel = this.helper.getLanguageModel(this.provider, model);
      const modelMessages = this.helper.convertMessages(messages);

      const params = this.helper.buildChatParams({
        model: languageModel,
        messages: modelMessages,
      }, options);

      // Add Anthropic-specific options
      if ((this.config as AnthropicConfig).enableComputerUse && params.tools) {
        params.providerOptions = {
          anthropic: { betaVersion: 'computer-use-2024-10-22' }
        };
      }

      const result = await generateText(params);

      return {
        text: result.text,
        message: { role: MessageRole.ASSISTANT, content: result.text },
        usage: convertUsage(result.usage),
        finishReason: this.helper.mapFinishReason(result.finishReason),
        metadata: { model, provider: 'anthropic' },
      };
    }, 'generateChat', options?.model);
  }

  /**
   * Anthropic doesn't support embeddings - clean error handling
   */
  override async generateEmbedding(
    _text: string,
    _options?: EmbeddingOptions
  ): Promise<EmbeddingResult> {
    throw this.helper.handleError(
      new Error('Anthropic does not provide embedding models'),
      'generateEmbedding'
    );
  }

  /**
   * Anthropic doesn't support image generation - clean error handling  
   */
  override async generateImage(
    _prompt: string,
    _options?: ImageGenerationOptions
  ): Promise<ImageGenerationResult> {
    throw this.helper.handleError(
      new Error('Anthropic does not provide image generation models'),
      'generateImage'
    );
  }

  /**
   * Stream text - dramatically simplified
   */
  override async *streamText(
    prompt: string,
    options?: TextGenerationOptions
  ): AsyncGenerator<string> {
    const model = this.helper.resolveModel('chat', options?.model);
    const languageModel = this.helper.getLanguageModel(this.provider, model);

    const params = this.helper.buildTextParams({
      model: languageModel,
      prompt,
    }, options);

    yield* this.helper.createTextStream(languageModel, params);
  }

  /**
   * Stream chat - dramatically simplified
   */
  override async *streamChat(
    messages: ChatMessage[],
    options?: ChatGenerationOptions
  ): AsyncGenerator<string> {
    const model = this.helper.resolveModel('chat', options?.model);
    const languageModel = this.helper.getLanguageModel(this.provider, model);
    const modelMessages = this.helper.convertMessages(messages);

    const params = this.helper.buildChatParams({
      model: languageModel,
      messages: modelMessages,
    }, options);

    yield* this.helper.createChatStream(languageModel, params, {
      enableToolStreaming: (this.config as AnthropicConfig).enableToolStreaming !== false
    });
  }

  /**
   * Check capabilities - simplified
   */
  override hasCapability(capability: PortalCapability): boolean {
    const supportedCapabilities = [
      PortalCapability.TEXT_GENERATION,
      PortalCapability.CHAT_GENERATION,
      PortalCapability.STREAMING,
      PortalCapability.FUNCTION_CALLING,
      PortalCapability.VISION,
      PortalCapability.TOOL_USAGE,
      PortalCapability.EVALUATION,
    ];
    return supportedCapabilities.includes(capability);
  }

  /**
   * Get supported models - delegated to shared utilities
   */
  override getSupportedModelsForCapability(capability: PortalCapability): string[] {
    return this.helper.modelResolver.getSupportedModels(capability);
  }

  /**
   * Get optimal model - delegated to shared utilities
   */
  override getOptimalModelForCapability(capability: PortalCapability): string | null {
    return this.helper.modelResolver.getOptimalModel(capability);
  }
}

// Factory function
export function createRefactoredAnthropicPortal(config: AnthropicConfig): RefactoredAnthropicPortal {
  return new RefactoredAnthropicPortal(config);
}

/*
 * COMPARISON ANALYSIS:
 * 
 * Original Anthropic Portal: ~900+ lines of code
 * Refactored Portal: ~200 lines of code
 * 
 * Reduction: ~75% less code while maintaining full functionality
 * 
 * Benefits:
 * 1. Dramatic reduction in code duplication
 * 2. Consistent error handling across all portals
 * 3. Standardized parameter building and validation
 * 4. Shared model resolution and capability management
 * 5. Unified message conversion logic
 * 6. Consistent streaming implementations
 * 7. Much easier to maintain and extend
 * 8. Better type safety through shared utilities
 * 9. Consistent retry logic and error recovery
 * 10. Provider-specific optimizations through configuration
 */