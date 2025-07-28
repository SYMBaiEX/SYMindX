/**
 * AI SDK v5 Compatibility Layer
 *
 * This file provides compatibility helpers for working with AI SDK v5
 * and resolves type issues between different versions and providers.
 */

import { tool as aiTool } from 'ai';
import { z } from 'zod';

/**
 * Create a compatible tool definition for AI SDK v5
 * This handles the overload issues with the tool function
 */
export function createTool(
  description: string,
  parameters: z.ZodSchema = z.object({}),
  execute?: (args: any) => Promise<any>
) {
  // Use the exact overload signature expected by AI SDK v5
  return aiTool({
    description,
    parameters,
    execute:
      execute || (async (args: any) => ({ result: 'Tool executed', args })),
  });
}

/**
 * Create provider settings with proper typing for AI SDK providers
 */
export function createProviderSettings(apiKey?: string, baseURL?: string) {
  const settings: any = {};

  if (apiKey) {
    settings.apiKey = apiKey;
  }

  if (baseURL) {
    settings.baseURL = baseURL;
  }

  return settings;
}

/**
 * Convert message role to AI SDK compatible format
 */
export function convertMessageRole(
  role: string
): 'system' | 'user' | 'assistant' | 'tool' {
  switch (role) {
    case 'system':
      return 'system';
    case 'user':
      return 'user';
    case 'assistant':
      return 'assistant';
    case 'tool':
    case 'function':
      return 'tool';
    default:
      return 'user';
  }
}

/**
 * Build safe AI SDK parameters avoiding exactOptionalPropertyTypes issues
 */
export function buildSafeAISDKParams(
  params: Record<string, any>
): Record<string, any> {
  const result: Record<string, any> = {};

  for (const [key, value] of Object.entries(params)) {
    // Only include defined values
    if (value !== undefined) {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Convert content parts safely for multimodal messages
 */
export function buildContentPart(type: string, data: any) {
  const part: any = { type };

  if (type === 'text' && data.text !== undefined) {
    part.text = data.text;
  }

  if (type === 'image') {
    if (data.image !== undefined) {
      part.image = data.image;
    }
    // Don't include mediaType if undefined
    if (data.mediaType) {
      part.mediaType = data.mediaType;
    }
  }

  return part;
}
