import { tool as aiTool, type CallSettings, type Tool } from 'ai';
import { z } from 'zod';

export function createTool(
  description: string,
  inputSchema: z.ZodType = z.object({}),
  execute?: (args: unknown) => Promise<unknown>
): Tool<unknown, unknown> {
  return aiTool({
    description,
    inputSchema,
    execute: execute ?? (args => Promise.resolve({ result: 'Tool executed', args })),
  });
}

export interface ProviderSettings {
  apiKey?: string;
  baseURL?: string;
}

export function createProviderSettings(
  apiKey?: string,
  baseURL?: string
): ProviderSettings {
  return {
    ...(apiKey === undefined ? {} : { apiKey }),
    ...(baseURL === undefined ? {} : { baseURL }),
  };
}

export function convertMessageRole(
  role: string
): 'system' | 'user' | 'assistant' | 'tool' {
  switch (role) {
    case 'system':
    case 'user':
    case 'assistant':
    case 'tool':
      return role;
    default:
      return 'user';
  }
}

export function buildSafeAISDKParams(
  params: Partial<CallSettings>
): Partial<CallSettings> {
  return Object.fromEntries(
    Object.entries(params).filter((entry) => entry[1] !== undefined)
  ) as Partial<CallSettings>;
}

export type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image'; image: string | URL | Uint8Array; mediaType?: string };

export function buildContentPart(
  type: 'text',
  data: { text?: string }
): Extract<ContentPart, { type: 'text' }>;
export function buildContentPart(
  type: 'image',
  data: { image?: string | URL | Uint8Array; mediaType?: string }
): Extract<ContentPart, { type: 'image' }>;
export function buildContentPart(type: string, data: unknown): ContentPart {
  if (typeof data !== 'object' || data === null) {
    throw new TypeError('Content part data must be an object');
  }

  const values = data as Record<string, unknown>;
  if (type === 'text') {
    const text = values['text'];
    if (typeof text !== 'string') {
      throw new TypeError('Text content part requires a string');
    }
    return { type: 'text', text };
  }

  if (type === 'image') {
    const image = values['image'];
    if (
      typeof image !== 'string' &&
      !(image instanceof URL) &&
      !(image instanceof Uint8Array)
    ) {
      throw new TypeError('Image content part requires a supported image value');
    }
    const mediaType = values['mediaType'];
    return {
      type: 'image',
      image,
      ...(typeof mediaType === 'string' ? { mediaType } : {}),
    };
  }

  throw new TypeError('Unsupported content part type: ' + type);
}
