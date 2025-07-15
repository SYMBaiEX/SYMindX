import {
  PortalConfig,
  TextGenerationOptions,
  TextGenerationResult,
  ChatMessage,
  ChatGenerationOptions,
  ChatGenerationResult,
  EmbeddingOptions,
  EmbeddingResult,
  MessageRole,
  FinishReason,
  PortalType,
  ModelType,
} from '../../types/portal';
import { BasePortal } from '../base-portal';
/**
 * OpenRouter Portal Implementation
 *
 * This portal provides integration with OpenRouter's API, which offers access
 * to multiple AI models from different providers through a unified interface.
 */

export interface OpenRouterConfig extends PortalConfig {
  model?: string;
  baseURL?: string;
  siteName?: string;
  siteUrl?: string;
}

export class OpenRouterPortal extends BasePortal {
  type: PortalType = PortalType.OPENROUTER;
  supportedModels: ModelType[] = [
    ModelType.TEXT_GENERATION,
    ModelType.CHAT,
    ModelType.CODE_GENERATION,
    ModelType.MULTIMODAL,
  ];
  private baseURL: string;

  constructor(config: OpenRouterConfig) {
    super('openrouter', 'OpenRouter', '1.0.0', config);
    this.baseURL = config.baseURL || 'https://openrouter.ai/api/v1';
  }

  /**
   * Generate text using OpenRouter's completion API
   */
  override async generateText(
    prompt: string,
    options?: TextGenerationOptions
  ): Promise<TextGenerationResult> {
    try {
      const model =
        (this.config as OpenRouterConfig).model ||
        'meta-llama/llama-3.1-8b-instruct:free';

      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer':
            (this.config as OpenRouterConfig).siteUrl ||
            'https://localhost:3000',
          'X-Title':
            (this.config as OpenRouterConfig).siteName || 'Symindx Agent',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: options?.maxTokens || this.config.maxTokens,
          temperature: options?.temperature || this.config.temperature,
          top_p: options?.topP,
          frequency_penalty: options?.frequencyPenalty,
          presence_penalty: options?.presencePenalty,
          stop: options?.stop,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.statusText}`);
      }

      const data = await response.json();
      const choice = data.choices[0];

      return {
        text: choice.message.content,
        usage: {
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0,
        },
        finishReason:
          (choice.finish_reason as FinishReason) || FinishReason.STOP,
        metadata: {
          model,
          provider: 'openrouter',
          cost: data.usage?.total_cost || 0,
        },
      };
    } catch (error) {
      void error;
      console.error('OpenRouter text generation error:', error);
      throw new Error(`OpenRouter text generation failed: ${error}`);
    }
  }

  /**
   * Generate chat response using OpenRouter's chat completion API
   */
  override async generateChat(
    messages: ChatMessage[],
    options?: ChatGenerationOptions
  ): Promise<ChatGenerationResult> {
    try {
      const model =
        (this.config as OpenRouterConfig).model ||
        'meta-llama/llama-3.1-8b-instruct:free';

      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer':
            (this.config as OpenRouterConfig).siteUrl ||
            'https://localhost:3000',
          'X-Title':
            (this.config as OpenRouterConfig).siteName || 'Symindx Agent',
        },
        body: JSON.stringify({
          model,
          messages: messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
          max_tokens: options?.maxTokens || this.config.maxTokens,
          temperature: options?.temperature || this.config.temperature,
          top_p: options?.topP,
          frequency_penalty: options?.frequencyPenalty,
          presence_penalty: options?.presencePenalty,
          tools: options?.functions?.map((fn) => ({
            type: 'function',
            function: {
              name: fn.name,
              description: fn.description,
              parameters: fn.parameters,
            },
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.statusText}`);
      }

      const data = await response.json();
      const choice = data.choices[0];

      return {
        text: choice.message.content,
        message: {
          role: MessageRole.ASSISTANT,
          content: choice.message.content,
        },
        usage: {
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0,
        },
        finishReason:
          (choice.finish_reason as FinishReason) || FinishReason.STOP,
        metadata: {
          model,
          provider: 'openrouter',
          cost: data.usage?.total_cost || 0,
        },
      };
    } catch (error) {
      void error;
      console.error('OpenRouter chat generation error:', error);
      throw new Error(`OpenRouter chat generation failed: ${error}`);
    }
  }

  /**
   * Generate embeddings using OpenRouter's embedding models
   */
  override async generateEmbedding(
    text: string,
    options?: EmbeddingOptions
  ): Promise<EmbeddingResult> {
    try {
      const model = options?.model || 'text-embedding-3-small';
      const response = await fetch(`${this.baseURL}/embeddings`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer':
            (this.config as OpenRouterConfig).siteUrl ||
            'https://localhost:3000',
          'X-Title':
            (this.config as OpenRouterConfig).siteName || 'Symindx Agent',
        },
        body: JSON.stringify({
          model,
          input: text,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.statusText}`);
      }

      const data = await response.json();
      const embedding = data.data[0].embedding;

      return {
        embedding,
        dimensions: embedding.length,
        model,
        usage: data.usage
          ? {
              promptTokens: data.usage.prompt_tokens,
              totalTokens: data.usage.total_tokens,
            }
          : {
              promptTokens: 0,
              totalTokens: 0,
            },
      };
    } catch (error) {
      void error;
      console.error('OpenRouter embedding generation error:', error);
      throw new Error(`OpenRouter embedding generation failed: ${error}`);
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
        (this.config as OpenRouterConfig).model ||
        'meta-llama/llama-3.1-8b-instruct:free';

      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer':
            (this.config as OpenRouterConfig).siteUrl ||
            'https://localhost:3000',
          'X-Title':
            (this.config as OpenRouterConfig).siteName || 'Symindx Agent',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: options?.maxTokens || this.config.maxTokens,
          temperature: options?.temperature || this.config.temperature,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Failed to get response reader');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') return;

              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices[0]?.delta?.content;
                if (delta) {
                  yield delta;
                }
              } catch {
                // Skip invalid JSON lines
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      void error;
      console.error('OpenRouter stream text error:', error);
      throw new Error(`OpenRouter stream text failed: ${error}`);
    }
  }
}

// Export factory function for easy instantiation
export function createOpenRouterPortal(
  config: OpenRouterConfig
): OpenRouterPortal {
  return new OpenRouterPortal(config);
}

// Export default configuration
export const defaultOpenRouterConfig: Partial<OpenRouterConfig> = {
  model: 'anthropic/claude-3.7-sonnet',
  maxTokens: 1000,
  temperature: 0.7,
  timeout: 30000,
  baseURL: 'https://openrouter.ai/api/v1',
};

// Popular OpenRouter models (Updated February 2025)
export const openRouterModels = {
  // Free models
  'meta-llama/llama-3.1-8b-instruct:free': 'Llama 3.1 8B Instruct (Free)',
  'microsoft/phi-3-mini-128k-instruct:free': 'Phi-3 Mini 128K Instruct (Free)',
  'google/gemma-2-9b-it:free': 'Gemma 2 9B IT (Free)',

  // Latest Premium Models
  'anthropic/claude-3.7-sonnet': 'Claude 3.7 Sonnet - Enhanced capabilities',
  'anthropic/claude-4-opus': 'Claude 4 Opus - Most capable Anthropic model',
  'openai/gpt-4o': 'GPT-4o - OpenAI multimodal flagship',
  'openai/o1-preview': 'OpenAI o1 Preview - Advanced reasoning',
  'qwen/qwq-32b-preview': 'Qwen QwQ 32B Preview - Reasoning specialist',
  'mistralai/mistral-small-3.1': 'Mistral Small 3.1 - Latest efficient model',

  // High-Performance Models
  'meta-llama/llama-3.3-70b-instruct': 'Llama 3.3 70B Instruct',
  'meta-llama/llama-3.1-405b-instruct': 'Llama 3.1 405B Instruct',
  'google/gemini-pro-1.5': 'Gemini Pro 1.5',
  'xai/grok-2': 'XAI Grok 2 - Advanced reasoning and vision',
};
