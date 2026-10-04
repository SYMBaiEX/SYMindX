/**
 * Groq Portal Implementation
 *
 * This portal provides integration with Groq's API using the AI SDK 7.
 * Groq specializes in fast inference with open-source models.
 */

import { createGroq } from '@ai-sdk/groq';
import { generateText, streamText, tool, isStepCount } from 'ai';
import type { ToolSet } from 'ai';
import { convertToAIMessages, getSystemInstructions } from '../../shared/message-converter';
import { z } from 'zod';

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
  PortalType,
  ModelType,
  MessageRole,
  FinishReason,
  ToolEvaluationOptions,
  ToolEvaluationResult,
} from '../../../types/portal';
import { BasePortal } from '../../core/base-portal';
import { buildAISDKParams, convertUsage } from '../../utils/usage';

export interface GroqConfig extends PortalConfig {
  model?: string;
  toolModel?: string;
  baseURL?: string;
  apiKey?: string; // Explicitly include apiKey from PortalConfig
}

export class GroqPortal extends BasePortal {
  type: PortalType = PortalType.GROQ;
  supportedModels: ModelType[] = [
    ModelType.TEXT_GENERATION,
    ModelType.CHAT,
    ModelType.CODE_GENERATION,
  ];
  private groqProvider: ReturnType<typeof createGroq>;

  constructor(config: GroqConfig) {
    super('groq', 'Groq', '1.0.0', config);

    // Create Groq provider with proper AI SDK 7 configuration
    const apiKey = config.apiKey || process.env['GROQ_API_KEY'];
    if (!apiKey) {
      throw new Error('Groq API key is required');
    }

    const providerConfig: any = {
      apiKey,
    };

    if (config.baseURL) {
      providerConfig.baseURL = config.baseURL;
    }

    this.groqProvider = createGroq(providerConfig);
  }

  /**
   * Override default models for Groq
   */
  protected override getDefaultModel(
    type: 'chat' | 'tool' | 'embedding' | 'image'
  ): string {
    switch (type) {
      case 'chat':
        return 'llama-3-groq-70b-8192-tool-use-preview'; // Use tool-enabled model
      case 'tool':
        return 'llama-3-groq-8b-8192-tool-use-preview'; // Use tool-enabled model
      case 'embedding':
        throw new Error('Groq does not support embeddings');
      case 'image':
        throw new Error('Groq does not support image generation');
      default:
        return 'meta-llama/llama-4-scout-17b-16e-instruct';
    }
  }

  /**
   * Convert function definitions to AI SDK 7 tool format
   */
  private convertFunctionsToTools(functions: unknown): ToolSet {
    if (!Array.isArray(functions)) {
      return functions as ToolSet;
    }
    const tools: ToolSet = {};
    for (const fn of functions) {
      if (!fn || typeof fn !== 'object' || !('name' in fn)) continue;
      const definition = fn as { name: string; description?: string };
      tools[definition.name] = tool({
        description: definition.description || definition.name,
        inputSchema: z.object({}),
        execute: async () => ({ error: 'Tool execution must be provided by the application' }),
      });
    }
    return tools;
  }
  override async generateText(
    prompt: string,
    options?: TextGenerationOptions
  ): Promise<TextGenerationResult> {
    try {
      const model = this.resolveModel('chat', 'GROQ');

      const baseParams = { model: this.groqProvider.languageModel(model),
        prompt,
      };

      // Build params with only defined values
      const optionalParams: Record<string, unknown> = {};

      const maxOutputTokens =
        options?.maxOutputTokens ?? options?.maxTokens ?? this.config['maxTokens'];
      if (maxOutputTokens !== undefined) {
        optionalParams['maxOutputTokens'] = maxOutputTokens;
      }

      const temperature = options?.temperature ?? this.config['temperature'];
      if (temperature !== undefined) {
        optionalParams['temperature'] = temperature;
      }

      if (options?.topP !== undefined) {
        optionalParams['topP'] = options.topP;
      }

      if (options?.frequencyPenalty !== undefined) {
        optionalParams['frequencyPenalty'] = options.frequencyPenalty;
      }

      if (options?.presencePenalty !== undefined) {
        optionalParams['presencePenalty'] = options.presencePenalty;
      }

      const params = buildAISDKParams(baseParams, optionalParams);

      const result = await generateText(params);

      return {
        text: result.text,
        usage: convertUsage(result.usage),
        finishReason:
          (result.finishReason as FinishReason) || FinishReason.STOP,
        metadata: {
          model,
          provider: 'groq',
        },
      };
    } catch (error) {
      void error;
      // Groq text generation error
      throw new Error(`Groq text generation failed: ${error}`);
    }
  }

  /**
   * Generate chat response using Groq's chat completion API
   */
  override async generateChat(
    messages: ChatMessage[],
    options?: ChatGenerationOptions
  ): Promise<ChatGenerationResult> {
    try {
      const model = this.resolveModel('chat', 'GROQ');

      // Convert portal messages to AI SDK 7 ModelMessage values
      const aiMessages = convertToAIMessages(messages, { supportsMultimodal: false });

      const tools = options?.tools || (options?.functions ? this.convertFunctionsToTools(options.functions) : undefined);

      const baseOptions = { model: this.groqProvider.languageModel(model),
        messages: aiMessages,
        ...(getSystemInstructions(messages) ? { instructions: getSystemInstructions(messages)! } : {}),
      };

      // Build params with only defined values
      const optionalParams: Record<string, unknown> = {};

      const maxOutputTokens =
        options?.maxOutputTokens ?? options?.maxTokens ?? this.config['maxTokens'];
      if (maxOutputTokens !== undefined) {
        optionalParams['maxOutputTokens'] = maxOutputTokens;
      }

      const temperature = options?.temperature ?? this.config['temperature'];
      if (temperature !== undefined) {
        optionalParams['temperature'] = temperature;
      }

      if (options?.topP !== undefined) {
        optionalParams['topP'] = options.topP;
      }

      if (options?.frequencyPenalty !== undefined) {
        optionalParams['frequencyPenalty'] = options.frequencyPenalty;
      }

      if (options?.presencePenalty !== undefined) {
        optionalParams['presencePenalty'] = options.presencePenalty;
      }

      const params = buildAISDKParams(baseOptions, optionalParams);
      const callOptions = { ...params, ...(tools && { tools, stopWhen: isStepCount(options?.maxSteps || 5) }), ...(options?.onStepFinish && { onStepEnd: ({ text, toolCalls, toolResults, finishReason, usage }: any) => options.onStepFinish!({ text, toolCalls, toolResults, finishReason, usage }) }) };
      const result = await generateText(callOptions);

      // Handle the case where the model wants to use tools but hasn't generated final text yet
      if (
        (result.finishReason === 'tool-calls' ||
          result.finishReason === 'length') &&
        (!result.text || result.text === '')
      ) {
        // If we have tool results, combine them into a response
        if (result.toolResults && result.toolResults.length > 0) {
          const toolResultsText = result.toolResults
            .map(
              (tr) =>
                `Tool ${tr.toolName} returned: ${JSON.stringify(tr.output)}`
            )
            .join('\n');
          return {
            message: {
              role: MessageRole.ASSISTANT,
              content: toolResultsText,
            },
            text: toolResultsText,
            usage: convertUsage(result.usage),
            finishReason:
              (result.finishReason as FinishReason) || FinishReason.STOP,
            metadata: {
              model,
              provider: 'groq',
            },
          };
        }
      }

      return {
        message: {
          role: MessageRole.ASSISTANT,
          content: result.text || '',
        },
        text: result.text || '',
        usage: convertUsage(result.usage),
        finishReason:
          (result.finishReason as FinishReason) || FinishReason.STOP,
        metadata: {
          model,
          provider: 'groq',
        },
      };
    } catch (error) {
      void error;
      // Groq chat generation error
      throw new Error(`Groq chat generation failed: ${error}`);
    }
  }

  /**
   * Generate embeddings - Note: Groq doesn't provide embedding models
   * This is a placeholder that throws an error
   */
  override async generateEmbedding(
    _text: string,
    _options?: EmbeddingOptions
  ): Promise<EmbeddingResult> {
    throw new Error(
      'Groq does not provide embedding models. Consider using OpenAI or another provider for embeddings.'
    );
  }

  /**
   * Generate images - Note: Groq doesn't provide image generation models
   * This is a placeholder that throws an error
   */
  override async generateImage(
    _prompt: string,
    _options?: ImageGenerationOptions
  ): Promise<ImageGenerationResult> {
    throw new Error(
      'Groq does not provide image generation models. Consider using OpenAI or another provider for image generation.'
    );
  }

  /**
   * Evaluate a task using the dedicated tool model
   * This allows background processing and evaluation while keeping chat responses fast
   */
  override async evaluateTask(
    options: ToolEvaluationOptions
  ): Promise<ToolEvaluationResult> {
    try {
      const toolModel = this.resolveModel('tool');
      const startTime = Date.now();

      // Build evaluation prompt using base method
      const evaluationPrompt = super.buildEvaluationPrompt(options);

      const baseParams = { model: this.groqProvider.languageModel(toolModel),
        prompt: evaluationPrompt,
      };

      const params = buildAISDKParams(baseParams, {
        maxOutputTokens: options.timeout
          ? Math.min(4000, options.timeout / 10)
          : 2000,
        temperature: 0.1, // Lower temperature for more consistent evaluations
        topP: 0.9,
      });

      const result = await generateText(params);

      const processingTime = Date.now() - startTime;

      // Parse the evaluation result
      const evaluation = this.parseEvaluationResult(
        result.text,
        options.outputFormat
      );

      const evalResult: ToolEvaluationResult = {
        analysis: evaluation.analysis,
        reasoning: evaluation.reasoning,
        metadata: {
          model: toolModel,
          processingTime,
          tokenUsage: convertUsage(result.usage),
        },
      };

      if (evaluation.score !== undefined) {
        evalResult.score = evaluation.score;
      }
      if (evaluation.confidence !== undefined) {
        evalResult.confidence = evaluation.confidence;
      }
      if (evaluation.recommendations !== undefined) {
        evalResult.recommendations = evaluation.recommendations;
      }

      // Add optional metadata fields
      if (options.criteria && evalResult.metadata)
        evalResult.metadata.evaluationCriteria = options.criteria;
      if (options.outputFormat && evalResult.metadata)
        evalResult.metadata.outputFormat = options.outputFormat;

      return evalResult;
    } catch (error) {
      // Groq task evaluation error
      throw new Error(
        `Groq task evaluation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Build evaluation prompt based on task and criteria
   * Override base implementation for Groq-specific formatting
   */
  protected override buildEvaluationPrompt(
    options: ToolEvaluationOptions
  ): string {
    let prompt = `You are an expert evaluator tasked with analyzing the following:\n\n`;
    prompt += `TASK: ${options.task}\n\n`;

    if (options.context) {
      prompt += `CONTEXT: ${options.context}\n\n`;
    }

    if (options.criteria && options.criteria.length > 0) {
      prompt += `EVALUATION CRITERIA:\n`;
      options.criteria.forEach((criterion: string, index: number) => {
        prompt += `${index + 1}. ${criterion}\n`;
      });
      prompt += '\n';
    }

    prompt += `Please provide a comprehensive evaluation that includes:\n`;
    prompt += `1. Analysis: Detailed analysis of the task\n`;
    prompt += `2. Score: Numerical score from 0-100 if applicable\n`;
    prompt += `3. Confidence: Your confidence level in this evaluation (0-100)\n`;
    prompt += `4. Reasoning: Step-by-step reasoning for your evaluation\n`;
    prompt += `5. Recommendations: Specific actionable recommendations\n\n`;

    if (options.outputFormat === 'json') {
      prompt += `Format your response as valid JSON with the following structure:
{
  "analysis": "detailed analysis here",
  "score": 85,
  "confidence": 90,
  "reasoning": "step-by-step reasoning",
  "recommendations": ["recommendation 1", "recommendation 2"]
}`;
    } else if (options.outputFormat === 'structured') {
      prompt += `Format your response with clear sections:
**ANALYSIS:**
[Your analysis here]

**SCORE:** [0-100]

**CONFIDENCE:** [0-100]

**REASONING:**
[Your reasoning here]

**RECOMMENDATIONS:**
- [Recommendation 1]
- [Recommendation 2]`;
    } else {
      prompt += `Provide a clear, well-structured evaluation in natural language.`;
    }

    return prompt;
  }

  /**
   * Parse evaluation result based on output format
   * Override base implementation for Groq-specific parsing
   */
  protected override parseEvaluationResult(
    text: string,
    format?: string
  ): ToolEvaluationResult {
    if (format === 'json') {
      try {
        const parsed = JSON.parse(text);
        return {
          analysis: parsed.analysis || '',
          score: parsed.score,
          confidence: parsed.confidence,
          reasoning: parsed.reasoning || '',
          recommendations: parsed.recommendations || [],
        };
      } catch {
        // Fallback to text parsing if JSON parsing fails
        return this.parseTextEvaluation(text);
      }
    } else {
      return this.parseTextEvaluation(text);
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
      const model = this.resolveModel('chat', 'GROQ');

      const baseParams = { model: this.groqProvider.languageModel(model),
        prompt,
      };

      // Build params with only defined values
      const optionalParams: Record<string, unknown> = {};

      const maxOutputTokens =
        options?.maxOutputTokens ?? options?.maxTokens ?? this.config['maxTokens'];
      if (maxOutputTokens !== undefined) {
        optionalParams['maxOutputTokens'] = maxOutputTokens;
      }

      const temperature = options?.temperature ?? this.config['temperature'];
      if (temperature !== undefined) {
        optionalParams['temperature'] = temperature;
      }

      const params = buildAISDKParams(baseParams, optionalParams);
      const streamOptions = { ...params, ...((options?.tools || options?.functions) && { tools: options?.tools || this.convertFunctionsToTools(options!.functions!), stopWhen: isStepCount(options?.maxSteps || 5) }), ...(options?.onStepFinish && { onStepEnd: ({ text, toolCalls, toolResults, finishReason, usage }: any) => options.onStepFinish!({ text, toolCalls, toolResults, finishReason, usage }) }) };
      const result = await streamText(streamOptions);

      for await (const delta of result.textStream) {
        yield delta;
      }
    } catch (error) {
      void error;
      // Groq stream text error
      throw new Error(`Groq stream text failed: ${error}`);
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
      const model = this.resolveModel('chat', 'GROQ');

      // Convert portal messages to AI SDK 7 ModelMessage values
      const aiMessages = convertToAIMessages(messages, { supportsMultimodal: false });

      const baseParams = { model: this.groqProvider.languageModel(model),
        messages: aiMessages,
        ...(getSystemInstructions(messages) ? { instructions: getSystemInstructions(messages)! } : {}),
      };

      // Build params with only defined values
      const optionalParams: Record<string, unknown> = {};

      const maxOutputTokens =
        options?.maxOutputTokens ?? options?.maxTokens ?? this.config['maxTokens'];
      if (maxOutputTokens !== undefined) {
        optionalParams['maxOutputTokens'] = maxOutputTokens;
      }

      const temperature = options?.temperature ?? this.config['temperature'];
      if (temperature !== undefined) {
        optionalParams['temperature'] = temperature;
      }

      if (options?.topP !== undefined) {
        optionalParams['topP'] = options.topP;
      }

      if (options?.frequencyPenalty !== undefined) {
        optionalParams['frequencyPenalty'] = options.frequencyPenalty;
      }

      if (options?.presencePenalty !== undefined) {
        optionalParams['presencePenalty'] = options.presencePenalty;
      }

      const params = buildAISDKParams(baseParams, optionalParams);
      const streamOptions = { ...params, ...((options?.tools || options?.functions) && { tools: options?.tools || this.convertFunctionsToTools(options!.functions!), stopWhen: isStepCount(options?.maxSteps || 5) }), ...(options?.onStepFinish && { onStepEnd: ({ text, toolCalls, toolResults, finishReason, usage }: any) => options.onStepFinish!({ text, toolCalls, toolResults, finishReason, usage }) }) };
      const result = await streamText(streamOptions);

      for await (const delta of result.textStream) {
        yield delta;
      }
    } catch (error) {
      void error;
      // Groq stream chat error
      throw new Error(`Groq stream chat failed: ${error}`);
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
      case PortalCapability.TOOL_USAGE:
      case PortalCapability.EVALUATION:
      case PortalCapability.REASONING:
        return true;
      case PortalCapability.EMBEDDING_GENERATION:
      case PortalCapability.IMAGE_GENERATION:
      case PortalCapability.VISION:
      case PortalCapability.AUDIO:
        return false;
      default:
        return false;
    }
  }
}

// Export factory function for easy instantiation
export function createGroqPortal(config: GroqConfig): GroqPortal {
  return new GroqPortal(config);
}

// Export default configuration
export const defaultGroqConfig: Partial<GroqConfig> = {
  model: 'llama-3-groq-70b-8192-tool-use-preview', // Use tool-enabled model by default
  toolModel: 'llama-3-groq-8b-8192-tool-use-preview',
  maxTokens: 1000, // Config property for backward compatibility
  temperature: 0.7,
  timeout: 30000,
};

// Available Groq models (Updated February 2025)
export const groqModels = {
  // Llama 4 Series (Latest)
  'meta-llama/llama-4-scout-17b-16e-instruct':
    'Llama 4 Scout 17B - Latest efficient chat model',

  // Llama 3.3 Series
  'llama-3.3-70b-versatile': 'Llama 3.3 70B Versatile - High quality flagship',

  // Llama 3.1 Series
  'llama-3.1-70b-versatile': 'Llama 3.1 70B Versatile',
  'llama-3.1-8b-instant': 'Llama 3.1 8B Instant - Fast tool model',

  // Llama Tool Use Models
  'llama-3-groq-70b-8192-tool-use-preview': 'Llama 3 Groq 70B Tool Use',
  'llama-3-groq-8b-8192-tool-use-preview': 'Llama 3 Groq 8B Tool Use',

  // Gemma Series
  'gemma2-9b-it': 'Gemma 2 9B IT',
  'gemma-7b-it': 'Gemma 7B IT',

  // Legacy Models (Still Available)
  'llama3-70b-8192': 'Llama 3 70B',
  'llama3-8b-8192': 'Llama 3 8B',

  // Note: Mixtral models have been deprecated as of 2024
};
