/**
 * Perplexity Portal Implementation
 *
 * This portal provides integration with Perplexity's API using HTTP fetch.
 * Supports Perplexity's search-enhanced AI capabilities.
 */

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
import { BasePortal } from '../base-portal';

export interface PerplexityConfig extends PortalConfig {
  model?: string;
  baseURL?: string;
  searchMode?: 'web' | 'academic';
  reasoningEffort?: 'low' | 'medium' | 'high';
  returnSearchResults?: boolean;
  returnRelatedQuestions?: boolean;
  returnImages?: boolean;
  searchDomainFilter?: string[];
  searchRecencyFilter?: string;
  searchContextSize?: 'low' | 'medium' | 'high';
  userLocation?: {
    latitude?: number;
    longitude?: number;
    country?: string;
  };
}

interface PerplexityMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface PerplexityRequest {
  model: string;
  messages: PerplexityMessage[];
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  search_mode?: string;
  reasoning_effort?: string;
  return_search_results?: boolean;
  return_related_questions?: boolean;
  return_images?: boolean;
  search_domain_filter?: string[];
  search_recency_filter?: string;
  search_after_date_filter?: string;
  search_before_date_filter?: string;
  stream?: boolean;
  presence_penalty?: number;
  frequency_penalty?: number;
  response_format?: Record<string, any>;
  web_search_options?: {
    search_context_size?: string;
    user_location?: {
      latitude?: number;
      longitude?: number;
      country?: string;
    };
  };
}

interface PerplexityResponse {
  id: string;
  model: string;
  created: number;
  object: string;
  choices: Array<{
    index: number;
    finish_reason: string;
    message: {
      role: string;
      content: string;
    };
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    search_context_size?: string;
    citation_tokens?: number;
    num_search_queries?: number;
    reasoning_tokens?: number;
  };
  citations?: string[];
  search_results?: Array<{
    title: string;
    url: string;
    date?: string;
  }>;
}

export class PerplexityPortal extends BasePortal {
  type: PortalType = PortalType.PERPLEXITY;
  supportedModels: ModelType[] = [ModelType.TEXT_GENERATION, ModelType.CHAT];

  private baseURL: string;
  private apiKey: string;

  constructor(config: PerplexityConfig) {
    super('perplexity', 'Perplexity', '1.0.0', config);

    this.apiKey = config.apiKey || process.env["PERPLEXITY_API_KEY"] || '';
    if (!this.apiKey) {
      throw new Error('Perplexity API key is required');
    }

    this.baseURL = config.baseURL || 'https://api.perplexity.ai';
  }

  getCapabilities(): PortalCapability[] {
    return [
      PortalCapability.TEXT_GENERATION,
      PortalCapability.CHAT_GENERATION,
      PortalCapability.STREAMING,
      PortalCapability.REASONING,
    ];
  }

  /**
   * Map MessageRole to Perplexity role type
   */
  private mapMessageRole(role: MessageRole): 'system' | 'user' | 'assistant' {
    switch (role) {
      case MessageRole.SYSTEM:
        return 'system';
      case MessageRole.USER:
        return 'user';
      case MessageRole.ASSISTANT:
        return 'assistant';
      case MessageRole.TOOL:
      case MessageRole.FUNCTION:
        return 'assistant'; // Tools/functions mapped to assistant
      default:
        return 'user'; // Default fallback
    }
  }

  /**
   * Map Perplexity finish reason to our FinishReason enum
   */
  private mapFinishReason(reason: string): FinishReason {
    switch (reason) {
      case 'stop':
        return FinishReason.STOP;
      case 'length':
        return FinishReason.LENGTH;
      case 'content_filter':
        return FinishReason.CONTENT_FILTER;
      default:
        return FinishReason.ERROR;
    }
  }

  /**
   * Convert usage metrics to our format
   */
  private convertUsage(usage: PerplexityResponse['usage']): {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  } {
    return {
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens,
    };
  }

  /**
   * Make HTTP request to Perplexity API
   */
  private async makeRequest(
    request: PerplexityRequest
  ): Promise<PerplexityResponse> {
    const url = `${this.baseURL}/chat/completions`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Perplexity API error (${response.status}): ${errorText}`
      );
    }

    return response.json();
  }

  /**
   * Generate text using Perplexity's completion API
   */
  override async generateText(
    prompt: string,
    options?: TextGenerationOptions
  ): Promise<TextGenerationResult> {
    try {
      const config = this.config as PerplexityConfig;
      const model = options?.model || config.model || 'sonar-pro';

      const request: PerplexityRequest = {
        model,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      };

      // Add optional parameters
      const maxTokens = options?.maxOutputTokens ?? options?.maxTokens ?? config.maxTokens;
      if (maxTokens !== undefined) {
        request.max_tokens = maxTokens;
      }

      const temperature = options?.temperature ?? config.temperature;
      if (temperature !== undefined) {
        request.temperature = temperature;
      }

      if (options?.topP) {
        request.top_p = options.topP;
      }

      // Add Perplexity-specific options
      if (config.searchMode) {
        request.search_mode = config.searchMode;
      }

      if (config.reasoningEffort) {
        request.reasoning_effort = config.reasoningEffort;
      }

      if (config.returnSearchResults) {
        request.return_search_results = config.returnSearchResults;
      }

      if (config.returnRelatedQuestions) {
        request.return_related_questions = config.returnRelatedQuestions;
      }

      if (config.returnImages) {
        request.return_images = config.returnImages;
      }

      if (config.searchDomainFilter) {
        request.search_domain_filter = config.searchDomainFilter;
      }

      if (config.searchRecencyFilter) {
        request.search_recency_filter = config.searchRecencyFilter;
      }

      // Add web search options
      if (config.searchContextSize || config.userLocation) {
        request.web_search_options = {};

        if (config.searchContextSize) {
          request.web_search_options.search_context_size =
            config.searchContextSize;
        }

        if (config.userLocation) {
          request.web_search_options.user_location = config.userLocation;
        }
      }

      const result = await this.makeRequest(request);

      return {
        text: result.choices[0]?.message?.content || '',
        usage: this.convertUsage(result.usage),
        finishReason: this.mapFinishReason(
          result.choices[0]?.finish_reason || 'stop'
        ),
        metadata: {
          model,
          provider: 'perplexity',
          citations: result.citations,
          searchResults: result.search_results,
          id: result.id,
          created: result.created,
        },
      };
    } catch (error) {
      throw new Error(`Perplexity text generation failed: ${error}`);
    }
  }

  /**
   * Generate chat response using Perplexity's messages API
   */
  override async generateChat(
    messages: ChatMessage[],
    options?: ChatGenerationOptions
  ): Promise<ChatGenerationResult> {
    try {
      const config = this.config as PerplexityConfig;
      const model = options?.model || config.model || 'sonar-pro';

      const perplexityMessages: PerplexityMessage[] = messages.map((msg) => ({
        role: this.mapMessageRole(msg.role),
        content: msg.content,
      }));

      const request: PerplexityRequest = {
        model,
        messages: perplexityMessages,
      };

      // Add optional parameters
      const maxTokens = options?.maxOutputTokens ?? options?.maxTokens ?? config.maxTokens;
      if (maxTokens !== undefined) {
        request.max_tokens = maxTokens;
      }

      const temperature = options?.temperature ?? config.temperature;
      if (temperature !== undefined) {
        request.temperature = temperature;
      }

      if (options?.topP) {
        request.top_p = options.topP;
      }

      // Add Perplexity-specific options
      if (config.searchMode) {
        request.search_mode = config.searchMode;
      }

      if (config.reasoningEffort) {
        request.reasoning_effort = config.reasoningEffort;
      }

      if (config.returnSearchResults) {
        request.return_search_results = config.returnSearchResults;
      }

      if (config.returnRelatedQuestions) {
        request.return_related_questions = config.returnRelatedQuestions;
      }

      if (config.returnImages) {
        request.return_images = config.returnImages;
      }

      if (config.searchDomainFilter) {
        request.search_domain_filter = config.searchDomainFilter;
      }

      if (config.searchRecencyFilter) {
        request.search_recency_filter = config.searchRecencyFilter;
      }

      // Add web search options
      if (config.searchContextSize || config.userLocation) {
        request.web_search_options = {};

        if (config.searchContextSize) {
          request.web_search_options.search_context_size =
            config.searchContextSize;
        }

        if (config.userLocation) {
          request.web_search_options.user_location = config.userLocation;
        }
      }

      const result = await this.makeRequest(request);

      const assistantMessage: ChatMessage = {
        role: MessageRole.ASSISTANT,
        content: result.choices[0]?.message?.content || '',
        timestamp: new Date(),
      };

      return {
        text: assistantMessage.content,
        message: assistantMessage,
        usage: this.convertUsage(result.usage),
        finishReason: this.mapFinishReason(
          result.choices[0]?.finish_reason || 'stop'
        ),
        metadata: {
          model,
          provider: 'perplexity',
          citations: result.citations,
          searchResults: result.search_results,
          id: result.id,
          created: result.created,
        },
      };
    } catch (error) {
      throw new Error(`Perplexity chat generation failed: ${error}`);
    }
  }

  /**
   * Generate embeddings - not supported by Perplexity
   */
  override async generateEmbedding(
    _text: string,
    _options?: EmbeddingOptions
  ): Promise<EmbeddingResult> {
    throw new Error('Embeddings are not supported by Perplexity API');
  }

  /**
   * Generate images - not supported by Perplexity
   */
  override async generateImage(
    _prompt: string,
    _options?: ImageGenerationOptions
  ): Promise<ImageGenerationResult> {
    throw new Error('Image generation is not supported by Perplexity API');
  }
}

/**
 * Factory function to create a Perplexity portal
 */
export function createPerplexityPortal(
  config: PerplexityConfig
): PerplexityPortal {
  return new PerplexityPortal(config);
}

/**
 * Default export for the portal
 */
export default PerplexityPortal;
