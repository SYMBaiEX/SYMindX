import {
  jsonSchema,
  stepCountIs,
  type CallSettings,
  type GenerateTextOnStepFinishCallback,
  type JSONSchema7,
  type StopCondition,
  type ToolSet,
} from 'ai';
import {
  FinishReason as PortalFinishReason,
  type ChatGenerationOptions,
  type EmbeddingOptions,
  type FunctionDefinition,
  type ImageGenerationOptions,
  type TextGenerationOptions,
} from '../../types/portal';

type ParameterRecord = Record<string, unknown>;
type ChatCallSettings = CallSettings & {
  tools?: ToolSet;
  stopWhen?: StopCondition<ToolSet>[];
  onStepEnd?: GenerateTextOnStepFinishCallback<ToolSet>;
};

export interface ParameterBuilderOptions {
  defaults?: {
    maxOutputTokens?: number;
    temperature?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
  };
  provider?: string;
  useProviderOptimizations?: boolean;
}

export function buildTextGenerationParams<T extends ParameterRecord>(
  baseParams: T,
  options?: TextGenerationOptions,
  config?: ParameterBuilderOptions
): T & CallSettings {
  const { defaults, provider = 'openai' } = config || {};
  const providerDefaults = getProviderDefaults(provider);
  const finalDefaults = { ...providerDefaults, ...defaults };
  const params: Partial<CallSettings> = {};

  const maxTokens =
    options?.maxOutputTokens ?? options?.maxTokens ?? finalDefaults.maxOutputTokens;
  if (maxTokens !== undefined && maxTokens > 0) {
    params.maxOutputTokens = maxTokens;
  }

  const temperature = options?.temperature ?? finalDefaults.temperature;
  if (temperature !== undefined) {
    params.temperature = Math.min(Math.max(temperature, 0), 2);
  }

  const topP = options?.topP ?? finalDefaults.topP;
  if (topP !== undefined) {
    params.topP = Math.min(Math.max(topP, 0), 1);
  }

  if (supportsParameter(provider, 'frequencyPenalty')) {
    const frequencyPenalty =
      options?.frequencyPenalty ?? finalDefaults.frequencyPenalty;
    if (frequencyPenalty !== undefined) {
      params.frequencyPenalty = Math.min(Math.max(frequencyPenalty, -2), 2);
    }
  }

  if (supportsParameter(provider, 'presencePenalty')) {
    const presencePenalty =
      options?.presencePenalty ?? finalDefaults.presencePenalty;
    if (presencePenalty !== undefined) {
      params.presencePenalty = Math.min(Math.max(presencePenalty, -2), 2);
    }
  }

  if (options?.stop?.length) {
    params.stopSequences = options.stop;
  }

  return Object.assign({}, baseParams, params) as T & CallSettings;
}

export function buildChatGenerationParams<T extends ParameterRecord>(
  baseParams: T,
  options?: ChatGenerationOptions,
  config?: ParameterBuilderOptions
): T & ChatCallSettings {
  const params = buildTextGenerationParams(baseParams, options, config) as T &
    ChatCallSettings;

  if (options?.tools && Object.keys(options.tools).length > 0) {
    params.tools = options.tools;
    params.stopWhen = [stepCountIs(options.maxSteps ?? 5)];
    if (options.onStepFinish) {
      params.onStepEnd = (event) =>
        options.onStepFinish?.({
          text: event.text,
          toolCalls: event.toolCalls.map((call) => ({
            id: call.toolCallId,
            type: 'function',
            function: {
              name: call.toolName,
              arguments: JSON.stringify(call.input),
            },
          })),
          toolResults: event.toolResults,
          finishReason: mapFinishReason(event.finishReason),
          usage: {
            promptTokens: event.usage.inputTokens ?? 0,
            completionTokens: event.usage.outputTokens ?? 0,
            totalTokens: event.usage.totalTokens ?? 0,
          },
        });
    }
  }

  if (options?.functions?.length) {
    params.tools = convertFunctionsToTools(options.functions);
    params.stopWhen = [stepCountIs(options.maxSteps ?? 5)];
  }

  return params;
}

export function buildImageGenerationParams<T extends ParameterRecord>(
  baseParams: T,
  options?: ImageGenerationOptions,
  config?: ParameterBuilderOptions
): T & ParameterRecord {
  const params: ParameterRecord = {};
  const provider = config?.provider ?? 'openai';

  if (options?.size !== undefined) params['size'] = options.size;
  if (options?.n !== undefined && options.n > 0) params['n'] = options.n;
  if (options?.quality && supportsParameter(provider, 'quality')) {
    params['quality'] = options.quality;
  }
  if (options?.style && supportsParameter(provider, 'style')) {
    params['style'] = options.style;
  }

  if (provider === 'openai' && options) {
    const providerOptions: Record<string, unknown> = {};
    if (options.quality) providerOptions['quality'] = options.quality;
    if (options.style) providerOptions['style'] = options.style;
    if (options.responseFormat) {
      providerOptions['response_format'] = options.responseFormat;
    }
    if (Object.keys(providerOptions).length > 0) {
      params['providerOptions'] = { openai: providerOptions };
    }
  }

  return Object.assign({}, baseParams, params);
}

export function buildEmbeddingParams<T extends ParameterRecord>(
  baseParams: T,
  options?: EmbeddingOptions,
  _config?: ParameterBuilderOptions
): T & ParameterRecord {
  const params: ParameterRecord = {};
  if (options?.dimensions !== undefined && options.dimensions > 0) {
    params['dimensions'] = options.dimensions;
  }
  return Object.assign({}, baseParams, params);
}

function getProviderDefaults(provider: string): {
  maxOutputTokens: number;
  temperature: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
} {
  switch (provider.toLowerCase()) {
    case 'openai':
    case 'groq':
      return {
        maxOutputTokens: 1000,
        temperature: 0.7,
        topP: 1,
        frequencyPenalty: 0,
        presencePenalty: 0,
      };
    case 'anthropic':
    case 'google':
    case 'gemini':
      return { maxOutputTokens: 1000, temperature: 0.7, topP: 1 };
    case 'xai':
    case 'grok':
      return {
        maxOutputTokens: 2000,
        temperature: 0.8,
        topP: 1,
        frequencyPenalty: 0,
        presencePenalty: 0,
      };
    case 'mistral':
      return {
        maxOutputTokens: 8192,
        temperature: 0.7,
        topP: 1,
        frequencyPenalty: 0,
        presencePenalty: 0,
      };
    case 'cohere':
      return {
        maxOutputTokens: 1000,
        temperature: 0.7,
        topP: 1,
        frequencyPenalty: 0,
        presencePenalty: 0,
      };
    default:
      return { maxOutputTokens: 1000, temperature: 0.7, topP: 1 };
  }
}

function supportsParameter(provider: string, parameter: string): boolean {
  const supportMatrix: Record<string, readonly string[]> = {
    openai: ['frequencyPenalty', 'presencePenalty', 'quality', 'style'],
    groq: ['frequencyPenalty', 'presencePenalty'],
    xai: ['frequencyPenalty', 'presencePenalty'],
    mistral: ['frequencyPenalty', 'presencePenalty'],
    cohere: ['frequencyPenalty', 'presencePenalty'],
  };
  return supportMatrix[provider.toLowerCase()]?.includes(parameter) ?? false;
}

function convertFunctionsToTools(functions: FunctionDefinition[]): ToolSet {
  const tools: ToolSet = {};
  for (const func of functions) {
    if (func.name && func.description && func.parameters) {
      tools[func.name] = {
        description: func.description,
        inputSchema: jsonSchema(func.parameters as JSONSchema7),
        execute: async (input) => input,
      };
    }
  }
  return tools;
}

function mapFinishReason(reason: string): PortalFinishReason {
  switch (reason) {
    case 'length':
      return PortalFinishReason.LENGTH;
    case 'tool-calls':
    case 'function-call':
      return PortalFinishReason.FUNCTION_CALL;
    case 'content-filter':
      return PortalFinishReason.CONTENT_FILTER;
    case 'error':
      return PortalFinishReason.ERROR;
    default:
      return PortalFinishReason.STOP;
  }
}

export function createParameterBuilder(
  provider: string,
  defaults?: ParameterBuilderOptions['defaults']
) {
  const config: ParameterBuilderOptions = {
    provider,
    ...(defaults === undefined ? {} : { defaults }),
    useProviderOptimizations: true,
  };

  return {
    buildTextParams: <T extends ParameterRecord>(
      baseParams: T,
      options?: TextGenerationOptions
    ) => buildTextGenerationParams(baseParams, options, config),
    buildChatParams: <T extends ParameterRecord>(
      baseParams: T,
      options?: ChatGenerationOptions
    ) => buildChatGenerationParams(baseParams, options, config),
    buildImageParams: <T extends ParameterRecord>(
      baseParams: T,
      options?: ImageGenerationOptions
    ) => buildImageGenerationParams(baseParams, options, config),
    buildEmbeddingParams: <T extends ParameterRecord>(
      baseParams: T,
      options?: EmbeddingOptions
    ) => buildEmbeddingParams(baseParams, options, config),
  };
}
