/**
 * Utility functions for portals
 */

import type { LanguageModelUsage } from 'ai';

/**
 * Convert AI SDK v5 usage to our internal format
 * Returns a guaranteed usage object (never undefined) for type safety
 */
export function convertUsage(usage?: LanguageModelUsage | Record<string, any>): {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
} {
  if (!usage) {
    return {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    };
  }

  // Handle different usage formats
  const promptTokens = (usage as any).promptTokens || 0;
  const completionTokens = (usage as any).completionTokens || 0;

  return {
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
  };
}

/**
 * Safely build AI SDK v5 parameters with conditional inclusion
 * This helper ensures that optional parameters are only included when they have values
 * Prevents TypeScript exactOptionalPropertyTypes errors by only including defined values
 */
export function buildAISDKParams<T extends Record<string, any>>(
  baseParams: T,
  options?: Record<string, any>
): T {
  const params = { ...baseParams };

  if (!options) return params;

  // Dynamically add only defined and non-null properties
  for (const [key, value] of Object.entries(options)) {
    if (value !== undefined && value !== null) {
      // Special handling for arrays - only include if not empty
      if (Array.isArray(value)) {
        if (value.length > 0) {
          (params as any)[key] = value;
        }
      } else if (typeof value === 'number') {
        // Numbers should be included even if 0
        (params as any)[key] = value;
      } else if (typeof value === 'boolean') {
        // Booleans should be included even if false
        (params as any)[key] = value;
      } else if (typeof value === 'string') {
        // Strings should be included even if empty
        (params as any)[key] = value;
      } else if (typeof value === 'object' && Object.keys(value).length > 0) {
        // Objects should be included if they have properties
        (params as any)[key] = value;
      }
    }
  }

  return params;
}

/**
 * Safely build provider settings with conditional inclusion
 * Only includes properties that are defined (not undefined)
 */
export function buildProviderSettings(settings: {
  apiKey?: string;
  baseURL?: string;
  organization?: string;
  [key: string]: any;
}): Record<string, any> {
  const result: Record<string, any> = {};

  // Only include defined properties to avoid TypeScript exactOptionalPropertyTypes errors
  if (settings.apiKey !== undefined && settings.apiKey !== null) {
    result.apiKey = settings.apiKey;
  }

  if (settings.baseURL !== undefined && settings.baseURL !== null) {
    result.baseURL = settings.baseURL;
  }

  if (settings.organization !== undefined && settings.organization !== null) {
    result.organization = settings.organization;
  }

  // Include any other defined properties
  for (const [key, value] of Object.entries(settings)) {
    if (value !== undefined && value !== null && !['apiKey', 'baseURL', 'organization'].includes(key)) {
      result[key] = value;
    }
  }

  return result;
}
