import type {
  Provider,
  ProviderMessage,
  ProviderRequest,
  ProviderResult,
} from '../../../../packages/agent/src/index.js';
import type { HostFetch } from './types.js';

export type PortalId = 'openai' | 'anthropic' | 'groq' | 'xai' | 'openrouter';

export interface PortalSpec {
  readonly id: PortalId;
  readonly model: string;
  readonly baseUrl: string;
}

export const HOST_PORTALS: readonly PortalSpec[] = [
  { id: 'openai', model: 'gpt-4.1-mini', baseUrl: 'https://api.openai.com/v1' },
  { id: 'anthropic', model: 'claude-sonnet-4-5', baseUrl: 'https://api.anthropic.com/v1' },
  { id: 'groq', model: 'llama-3.3-70b-versatile', baseUrl: 'https://api.groq.com/openai/v1' },
  { id: 'xai', model: 'grok-3', baseUrl: 'https://api.x.ai/v1' },
  { id: 'openrouter', model: 'openai/gpt-4.1-mini', baseUrl: 'https://openrouter.ai/api/v1' },
];

interface WireMessage {
  readonly role: 'system' | 'user' | 'assistant' | 'tool';
  readonly content: string;
}

interface AnthropicTurn {
  readonly role: 'user' | 'assistant';
  readonly content: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isUnknownArray(value: unknown): value is readonly unknown[] {
  return Array.isArray(value);
}

function parseJson(raw: string): unknown {
  return JSON.parse(raw) as unknown;
}

function portalModel(override: string | undefined, fallback: string): string {
  if (override !== undefined && override.length >= 1 && override.length <= 80) {
    return override;
  }
  return fallback;
}

function chatMessages(request: ProviderRequest): WireMessage[] {
  const messages: WireMessage[] = [{ role: 'system', content: request.system }];
  for (const message of request.messages) {
    messages.push({ role: message.role, content: message.content });
  }
  return messages;
}

function anthropicMessages(messages: readonly ProviderMessage[]): AnthropicTurn[] {
  const turns: AnthropicTurn[] = [];
  for (const message of messages) {
    if (message.role === 'user' || message.role === 'assistant') {
      turns.push({ role: message.role, content: message.content });
    }
  }
  return turns;
}

function openAiText(payload: unknown): string {
  if (!isRecord(payload)) {
    return '';
  }
  const choices: unknown = Reflect.get(payload, 'choices');
  if (!isUnknownArray(choices)) {
    return '';
  }
  const first: unknown = choices[0];
  if (!isRecord(first)) {
    return '';
  }
  const message: unknown = Reflect.get(first, 'message');
  if (!isRecord(message)) {
    return '';
  }
  const content: unknown = Reflect.get(message, 'content');
  return typeof content === 'string' ? content : '';
}

function anthropicText(payload: unknown): string {
  if (!isRecord(payload)) {
    return '';
  }
  const content: unknown = Reflect.get(payload, 'content');
  if (!isUnknownArray(content)) {
    return '';
  }
  let text = '';
  for (const item of content) {
    if (!isRecord(item)) {
      continue;
    }
    const kind: unknown = Reflect.get(item, 'type');
    const part: unknown = Reflect.get(item, 'text');
    if (kind === 'text' && typeof part === 'string') {
      text += part;
    }
  }
  return text;
}

async function postPortal(
  fetch: HostFetch,
  url: string,
  headers: Readonly<Record<string, string>>,
  body: string,
  signal: AbortSignal,
): Promise<unknown> {
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body,
    signal,
  });
  if (!response.ok) {
    throw new Error(`portal http ${response.status}`);
  }
  return parseJson(await response.text());
}

export function portalSpec(id: string): PortalSpec {
  for (const spec of HOST_PORTALS) {
    if (spec.id === id) {
      return { id: spec.id, model: spec.model, baseUrl: spec.baseUrl };
    }
  }
  throw new Error('unknown portal');
}

export function createPortal(input: {
  readonly id: PortalId;
  readonly apiKey: string;
  readonly fetch: HostFetch;
  readonly model?: string;
}): Provider {
  const spec = portalSpec(input.id);
  const model = portalModel(input.model, spec.model);
  return {
    async generate(request: ProviderRequest): Promise<ProviderResult> {
      if (input.apiKey.trim().length === 0) {
        throw new Error('portal key is missing');
      }
      if (spec.id === 'anthropic') {
        const payload = await postPortal(
          input.fetch,
          `${spec.baseUrl}/messages`,
          {
            'x-api-key': input.apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          JSON.stringify({
            model,
            max_tokens: 1024,
            system: request.system,
            messages: anthropicMessages(request.messages),
          }),
          request.signal,
        );
        return { text: anthropicText(payload), toolCalls: [] };
      }
      const payload = await postPortal(
        input.fetch,
        `${spec.baseUrl}/chat/completions`,
        {
          Authorization: `Bearer ${input.apiKey}`,
          'Content-Type': 'application/json',
        },
        JSON.stringify({
          model,
          messages: chatMessages(request),
          temperature: 0,
        }),
        request.signal,
      );
      return { text: openAiText(payload), toolCalls: [] };
    },
  };
}
