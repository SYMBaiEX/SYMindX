import type { JsonValue, ToolCall } from '../../../packages/agent/src/provider/types.js';

export const OLLAMA_MODEL = 'qwen3.5:9b';

const LOOPBACK = new Set(['127.0.0.1', 'localhost', '[::1]']);

export interface OllamaMessage {
  readonly role: 'system' | 'user' | 'assistant' | 'tool';
  readonly content: string;
  readonly toolCalls?: readonly ToolCall[];
  readonly toolName?: string;
}

export interface OllamaReply {
  readonly text: string;
  readonly toolCalls: readonly ToolCall[];
}

export interface OllamaTool {
  readonly name: string;
  readonly description: string;
  readonly parameters?: JsonValue;
}

const TOOL_PARAMETERS: Readonly<Record<string, JsonValue>> = {
  'word-count': {
    type: 'object',
    properties: { text: { type: 'string' } },
    required: ['text'],
  },
  clock: { type: 'object', properties: {} },
  'json-keys': {
    type: 'object',
    properties: { json: { type: 'string' } },
    required: ['json'],
  },
};

export function ollamaChatUrl(base: string): string {
  if (base.startsWith('/')) {
    return `${base.replace(/\/$/, '')}/api/chat`;
  }
  return loopbackUrl(base, '/api/chat');
}

export async function ollamaVersion(base: string, signal: AbortSignal): Promise<string> {
  const response = await fetch(loopbackUrl(base, '/api/version'), { signal });
  if (!response.ok) {
    throw new Error(`Ollama version check failed (${response.status})`);
  }
  const payload: unknown = await response.json();
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Ollama version payload was not an object');
  }
  const version = Reflect.get(payload, 'version');
  if (typeof version !== 'string' || version.trim().length === 0) {
    throw new Error('Ollama version payload had no version');
  }
  return version;
}

function loopbackUrl(base: string, pathname: string): string {
  const url = new URL(base);
  const host = url.hostname.toLowerCase();
  if (url.protocol !== 'http:' || !LOOPBACK.has(host)) {
    throw new Error('Ollama must be reached over HTTP on loopback');
  }
  if (url.username || url.password) {
    throw new Error('Ollama URL cannot contain credentials');
  }
  url.pathname = pathname;
  url.search = '';
  url.hash = '';
  return url.toString();
}

export async function ollamaChat(
  base: string,
  messages: readonly OllamaMessage[],
  tools: readonly OllamaTool[],
  signal: AbortSignal,
  options?: { readonly numPredict?: number },
): Promise<OllamaReply> {
  const numPredict = options?.numPredict ?? 128;
  if (!Number.isInteger(numPredict) || numPredict < 1 || numPredict > 4096) {
    throw new Error('num_predict must be from 1 to 4096');
  }
  const response = await fetch(ollamaChatUrl(base), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      think: false,
      stream: false,
      keep_alive: '10m',
      options: { temperature: 0, num_predict: numPredict },
      messages: messages.map(toWireMessage),
      tools: tools.map((tool) => ({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters ?? TOOL_PARAMETERS[tool.name] ?? { type: 'object', properties: {} },
        },
      })),
    }),
    signal,
  });
  if (!response.ok) {
    throw new Error(`Ollama chat failed (${response.status})`);
  }
  const payload: unknown = await response.json();
  return parseReply(payload);
}

function toWireMessage(message: OllamaMessage): Record<string, unknown> {
  if (message.role === 'tool') {
    return {
      role: 'tool',
      content: message.content,
      tool_name: message.toolName ?? '',
    };
  }
  if (message.role === 'assistant' && message.toolCalls !== undefined && message.toolCalls.length > 0) {
    return {
      role: 'assistant',
      content: message.content,
      tool_calls: message.toolCalls.map((call) => ({
        type: 'function',
        function: { name: call.name, arguments: call.arguments },
      })),
    };
  }
  return { role: message.role, content: message.content };
}

function parseReply(payload: unknown): OllamaReply {
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Ollama returned an unexpected payload');
  }
  const message = Reflect.get(payload, 'message');
  if (message === null || typeof message !== 'object' || Array.isArray(message)) {
    throw new Error('Ollama returned no message');
  }
  const thinking = Reflect.get(message, 'thinking');
  const reasoning = Reflect.get(message, 'reasoning');
  if (typeof thinking === 'string' && thinking.trim().length > 0) {
    throw new Error('Ollama returned a reasoning trace. Thinking must stay off.');
  }
  if (typeof reasoning === 'string' && reasoning.trim().length > 0) {
    throw new Error('Ollama returned a reasoning trace. Thinking must stay off.');
  }
  const content = Reflect.get(message, 'content');
  const text = typeof content === 'string' ? content.trim() : '';
  const rawCalls = Reflect.get(message, 'tool_calls');
  const toolCalls: ToolCall[] = [];
  if (Array.isArray(rawCalls)) {
    for (const call of rawCalls) {
      const parsed = parseToolCall(call);
      if (parsed !== undefined) {
        toolCalls.push(parsed);
      }
    }
  }
  return { text, toolCalls };
}

function parseToolCall(value: unknown): ToolCall | undefined {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }
  const fn = Reflect.get(value, 'function');
  const source = fn !== null && typeof fn === 'object' && !Array.isArray(fn) ? fn : value;
  const name = Reflect.get(source, 'name');
  if (typeof name !== 'string' || name.length === 0) {
    return undefined;
  }
  const idValue = Reflect.get(value, 'id');
  const id = typeof idValue === 'string' && idValue.length > 0 ? idValue : name;
  return { id, name, arguments: asJson(Reflect.get(source, 'arguments')) };
}

function asJson(value: unknown): JsonValue {
  if (typeof value === 'string') {
    try {
      return asJson(JSON.parse(value));
    } catch {
      return value;
    }
  }
  if (value === null || typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => asJson(entry));
  }
  if (typeof value === 'object') {
    const record: { [key: string]: JsonValue } = {};
    for (const key of Object.keys(value)) {
      record[key] = asJson(Reflect.get(value, key));
    }
    return record;
  }
  return null;
}
