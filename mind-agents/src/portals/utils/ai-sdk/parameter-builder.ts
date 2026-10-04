import {
  stepCountIs,
  type CallSettings,
  type ToolSet,
} from 'ai';
import type {
  ChatGenerationOptions,
  ImageGenerationOptions,
  TextGenerationOptions,
} from '../../../types/portal';

type ParameterRecord = Record<string, unknown>;
type ChatSettings = CallSettings & {
  tools?: ToolSet;
  stopWhen?: ReturnType<typeof stepCountIs>[];
};

export class AISDKParameterBuilder {
  static buildTextGenerationParams<T extends ParameterRecord>(
    baseParams: T,
    options?: TextGenerationOptions,
    defaults?: {
      maxOutputTokens?: number;
      temperature?: number;
      topP?: number;
      frequencyPenalty?: number;
      presencePenalty?: number;
    }
  ): T & CallSettings {
    const settings: Partial<CallSettings> = {};
    const maxOutputTokens =
      options?.maxOutputTokens ?? options?.maxTokens ?? defaults?.maxOutputTokens;
    if (maxOutputTokens !== undefined && maxOutputTokens > 0) {
      settings.maxOutputTokens = maxOutputTokens;
    }
    const temperature = options?.temperature ?? defaults?.temperature;
    if (temperature !== undefined) {
      settings.temperature = Math.min(Math.max(temperature, 0), 2);
    }
    const topP = options?.topP ?? defaults?.topP;
    if (topP !== undefined && topP > 0) {
      settings.topP = Math.min(Math.max(topP, 0), 1);
    }
    const frequencyPenalty =
      options?.frequencyPenalty ?? defaults?.frequencyPenalty;
    if (frequencyPenalty !== undefined) {
      settings.frequencyPenalty = Math.min(Math.max(frequencyPenalty, -2), 2);
    }
    const presencePenalty =
      options?.presencePenalty ?? defaults?.presencePenalty;
    if (presencePenalty !== undefined) {
      settings.presencePenalty = Math.min(Math.max(presencePenalty, -2), 2);
    }
    if (options?.stop?.length) settings.stopSequences = options.stop;
    return Object.assign({}, baseParams, settings) as T & CallSettings;
  }

  static buildChatGenerationParams<T extends ParameterRecord>(
    baseParams: T,
    options?: ChatGenerationOptions,
    defaults?: {
      maxOutputTokens?: number;
      temperature?: number;
      topP?: number;
      frequencyPenalty?: number;
      presencePenalty?: number;
    }
  ): T & ChatSettings {
    const settings = this.buildTextGenerationParams(
      baseParams,
      options,
      defaults
    ) as T & ChatSettings;
    if (options?.tools && Object.keys(options.tools).length > 0) {
      settings.tools = options.tools;
      settings.stopWhen = [stepCountIs(options.maxSteps ?? 5)];
    }
    return settings;
  }

  static buildImageGenerationParams<T extends ParameterRecord>(
    baseParams: T,
    options?: ImageGenerationOptions
  ): T & ParameterRecord {
    const params: ParameterRecord = {};
    if (options?.size !== undefined) params['size'] = options.size;
    if (options?.n !== undefined && options.n > 0) params['n'] = options.n;
    if (options?.quality !== undefined) params['quality'] = options.quality;
    if (options?.style !== undefined) params['style'] = options.style;
    return Object.assign({}, baseParams, params);
  }

  static buildProviderConfig<T extends ParameterRecord>(
    baseConfig: T,
    options?: {
      apiKey?: string;
      baseURL?: string;
      organization?: string;
      headers?: Record<string, string>;
    }
  ): T & ParameterRecord {
    const additions: ParameterRecord = {};
    if (options?.apiKey !== undefined) additions['apiKey'] = options.apiKey;
    if (options?.baseURL !== undefined) additions['baseURL'] = options.baseURL;
    if (options?.organization !== undefined) {
      additions['organization'] = options.organization;
    }
    if (options?.headers !== undefined) additions['headers'] = options.headers;
    return Object.assign({}, baseConfig, additions);
  }

  static buildSafeObject<T extends ParameterRecord>(
    source: T
  ): ParameterRecord {
    const result: ParameterRecord = {};
    for (const [key, value] of Object.entries(source)) {
      if (value !== undefined) result[key] = value;
    }
    return result;
  }

  static getProviderDefaults(provider: string): {
    maxOutputTokens: number;
    temperature: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
  } {
    switch (provider.toLowerCase()) {
      case 'openai':
      case 'groq':
      case 'mistral':
      case 'cohere':
        return {
          maxOutputTokens: provider.toLowerCase() === 'mistral' ? 8192 : 1000,
          temperature: 0.7,
          topP: 1,
          frequencyPenalty: 0,
          presencePenalty: 0,
        };
      case 'xai':
      case 'grok':
        return {
          maxOutputTokens: 2000,
          temperature: 0.8,
          topP: 1,
          frequencyPenalty: 0,
          presencePenalty: 0,
        };
      default:
        return { maxOutputTokens: 1000, temperature: 0.7, topP: 1 };
    }
  }
}

export function handleAISDKError(error: unknown, provider: string): Error {
  const details =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : 'Unknown error';
  const errorName =
    typeof error === 'object' && error !== null && 'name' in error
      ? error.name
      : undefined;
  if (errorName === 'AI_APICallError') {
    return new Error(`${provider} API Error: ${details}`);
  }
  if (errorName === 'AI_InvalidArgumentError') {
    return new Error(`Invalid ${provider} parameters: ${details}`);
  }
  if (errorName === 'AI_RateLimitError') {
    return new Error(`${provider} rate limit exceeded: ${details}`);
  }
  if (errorName === 'AI_AuthenticationError') {
    return new Error(`${provider} authentication failed: ${details}`);
  }
  return new Error(`${provider} Error: ${details}`);
}

export function validateGenerationOptions(
  options: TextGenerationOptions | ChatGenerationOptions,
  provider: string
): void {
  if (options.maxOutputTokens !== undefined && options.maxOutputTokens <= 0) {
    throw new Error(`Invalid maxOutputTokens for ${provider}: must be positive`);
  }
  if (
    options.temperature !== undefined &&
    (options.temperature < 0 || options.temperature > 2)
  ) {
    throw new Error(`Invalid temperature for ${provider}: must be between 0 and 2`);
  }
  if (options.topP !== undefined && (options.topP <= 0 || options.topP > 1)) {
    throw new Error(`Invalid topP for ${provider}: must be between 0 and 1`);
  }
  if (
    options.frequencyPenalty !== undefined &&
    (options.frequencyPenalty < -2 || options.frequencyPenalty > 2)
  ) {
    throw new Error(`Invalid frequencyPenalty for ${provider}: must be between -2 and 2`);
  }
  if (
    options.presencePenalty !== undefined &&
    (options.presencePenalty < -2 || options.presencePenalty > 2)
  ) {
    throw new Error(`Invalid presencePenalty for ${provider}: must be between -2 and 2`);
  }
}

export interface PortalUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export function convertUsage(usage: unknown): Partial<PortalUsage> {
  if (typeof usage !== 'object' || usage === null) return {};
  const values = usage as Record<string, unknown>;
  const promptTokens =
    typeof values['promptTokens'] === 'number' ? values['promptTokens'] : 0;
  const completionTokens =
    typeof values['completionTokens'] === 'number' ? values['completionTokens'] : 0;
  return {
    promptTokens,
    completionTokens,
    totalTokens:
      typeof values['totalTokens'] === 'number'
        ? values['totalTokens']
        : promptTokens + completionTokens,
  };
}
