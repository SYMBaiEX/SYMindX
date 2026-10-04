import type { AgentSummary, JsonValue, Message } from './api-types.js';

export type { AgentSummary } from './api-types.js';
export type ConversationMessage = Message;

const MAX_RESPONSE_BYTES = 8 * 1024 * 1024;
const MAX_TOKEN_BYTES = 4096;

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function onlyKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  return Object.keys(value).every((key) => allowed.includes(key));
}

function validId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(value);
}

function isJsonValue(value: unknown, depth = 0): value is JsonValue {
  if (depth > 12) return false;
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.every((item) => isJsonValue(item, depth + 1));
  if (!record(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return (
    (prototype === Object.prototype || prototype === null) &&
    Object.values(value).every((item) => isJsonValue(item, depth + 1))
  );
}

function decodeMessage(value: unknown): Message {
  if (
    !record(value) ||
    !onlyKeys(value, [
      'id',
      'agentId',
      'conversationId',
      'role',
      'content',
      'createdAt',
      'toolCallId',
      'toolCalls',
    ]) ||
    typeof value.id !== 'string' ||
    !value.id ||
    !validId(value.agentId) ||
    !validId(value.conversationId) ||
    typeof value.content !== 'string' ||
    !Number.isSafeInteger(value.createdAt) ||
    (value.createdAt as number) < 0 ||
    (value.createdAt as number) > 8_640_000_000_000_000
  ) {
    throw new Error('The API returned an invalid conversation message.');
  }
  const base = {
    id: value.id,
    agentId: value.agentId,
    conversationId: value.conversationId,
    content: value.content,
    createdAt: value.createdAt as number,
  };
  if (value.role === 'user') {
    if ('toolCallId' in value || 'toolCalls' in value)
      throw new Error('The API returned an invalid user message.');
    return { ...base, role: 'user' };
  }
  if (value.role === 'tool') {
    if (typeof value.toolCallId !== 'string' || !value.toolCallId || 'toolCalls' in value) {
      throw new Error('The API returned an invalid tool message.');
    }
    return { ...base, role: 'tool', toolCallId: value.toolCallId };
  }
  if (value.role === 'assistant') {
    if ('toolCallId' in value) throw new Error('The API returned an invalid assistant message.');
    if (value.toolCalls === undefined) return { ...base, role: 'assistant' };
    if (!Array.isArray(value.toolCalls) || value.toolCalls.length > 8) {
      throw new Error('The API returned invalid assistant tool calls.');
    }
    const toolCalls = value.toolCalls.map((call) => {
      if (
        !record(call) ||
        !onlyKeys(call, ['id', 'name', 'arguments']) ||
        typeof call.id !== 'string' ||
        !call.id ||
        typeof call.name !== 'string' ||
        !/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(call.name) ||
        !isJsonValue(call.arguments)
      ) {
        throw new Error('The API returned an invalid assistant tool call.');
      }
      return { id: call.id, name: call.name, arguments: call.arguments };
    });
    return { ...base, role: 'assistant', toolCalls };
  }
  throw new Error('The API returned an unknown conversation role.');
}

export function decodeAgents(value: unknown): AgentSummary[] {
  if (!record(value) || !onlyKeys(value, ['agents']) || !Array.isArray(value.agents)) {
    throw new Error('The API returned an invalid agent list.');
  }
  return value.agents.map((item) => {
    if (
      !record(item) ||
      !onlyKeys(item, ['id', 'name', 'status', 'emotion', 'provider']) ||
      !validId(item.id) ||
      typeof item.name !== 'string' ||
      !item.name.trim() ||
      (item.status !== 'ready' && item.status !== 'busy') ||
      !record(item.emotion) ||
      !onlyKeys(item.emotion, ['valence', 'arousal']) ||
      typeof item.emotion.valence !== 'number' ||
      !Number.isFinite(item.emotion.valence) ||
      item.emotion.valence < -1 ||
      item.emotion.valence > 1 ||
      typeof item.emotion.arousal !== 'number' ||
      !Number.isFinite(item.emotion.arousal) ||
      item.emotion.arousal < 0 ||
      item.emotion.arousal > 1 ||
      (item.provider !== 'echo' && item.provider !== 'openai-compatible')
    ) {
      throw new Error('The API returned an invalid agent entry.');
    }
    return {
      id: item.id,
      name: item.name,
      status: item.status,
      emotion: { valence: item.emotion.valence, arousal: item.emotion.arousal },
      provider: item.provider,
    };
  });
}

export function decodeHistory(value: unknown): Message[] {
  if (!record(value) || !onlyKeys(value, ['messages']) || !Array.isArray(value.messages)) {
    throw new Error('The API returned invalid conversation history.');
  }
  return value.messages.map(decodeMessage);
}

export function decodeTurnMessage(
  value: unknown,
  expectedAgentId: string,
  expectedConversationId: string,
): Message {
  if (
    !record(value) ||
    !onlyKeys(value, ['result']) ||
    !record(value.result) ||
    !onlyKeys(value.result, ['agentId', 'conversationId', 'message', 'state', 'toolCalls']) ||
    value.result.agentId !== expectedAgentId ||
    value.result.conversationId !== expectedConversationId ||
    !Array.isArray(value.result.toolCalls) ||
    value.result.toolCalls.length > 24 ||
    value.result.toolCalls.some(
      (entry) =>
        !record(entry) ||
        !onlyKeys(entry, ['name', 'status']) ||
        typeof entry.name !== 'string' ||
        !/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(entry.name) ||
        !['completed', 'denied', 'failed'].includes(entry.status as string),
    ) ||
    !record(value.result.state) ||
    !onlyKeys(value.result.state, ['emotion', 'updatedAt']) ||
    !record(value.result.state.emotion) ||
    !onlyKeys(value.result.state.emotion, ['valence', 'arousal']) ||
    typeof value.result.state.emotion.valence !== 'number' ||
    !Number.isFinite(value.result.state.emotion.valence) ||
    value.result.state.emotion.valence < -1 ||
    value.result.state.emotion.valence > 1 ||
    typeof value.result.state.emotion.arousal !== 'number' ||
    !Number.isFinite(value.result.state.emotion.arousal) ||
    value.result.state.emotion.arousal < 0 ||
    value.result.state.emotion.arousal > 1 ||
    !Number.isSafeInteger(value.result.state.updatedAt) ||
    (value.result.state.updatedAt as number) < 0
  ) {
    throw new Error('The API returned an invalid chat result.');
  }
  const message = decodeMessage(value.result.message);
  if (
    message.agentId !== expectedAgentId ||
    message.conversationId !== expectedConversationId ||
    message.role !== 'assistant'
  ) {
    throw new Error('The API returned a chat result for a different scope.');
  }
  return message;
}

async function decodeResponse(response: Response): Promise<unknown> {
  const contentLength = response.headers.get('content-length');
  if (contentLength !== null && Number(contentLength) > MAX_RESPONSE_BYTES) {
    await response.body?.cancel();
    throw new Error('The local runtime response exceeded the 8 MiB limit.');
  }
  if (!response.body)
    throw new Error(`The local runtime returned HTTP ${response.status} without a body.`);
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      total += part.value.byteLength;
      if (total > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throw new Error('The local runtime response exceeded the 8 MiB limit.');
      }
      chunks.push(part.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  let value: unknown;
  try {
    value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) as unknown;
  } catch {
    throw new Error('The local runtime returned invalid UTF-8 JSON.');
  }
  return value;
}

async function requestJson(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  parentSignal?: AbortSignal,
): Promise<unknown> {
  const controller = new AbortController();
  const abortFromParent = () => controller.abort(parentSignal?.reason);
  parentSignal?.addEventListener('abort', abortFromParent, { once: true });
  if (parentSignal?.aborted) abortFromParent();
  const timer = setTimeout(() => controller.abort(new Error('Request timed out.')), timeoutMs);
  try {
    const response = await fetch(url, {
      ...init,
      redirect: 'error',
      cache: 'no-store',
      signal: controller.signal,
    });
    const value = await decodeResponse(response);
    if (!response.ok) {
      const message =
        record(value) && typeof value.error === 'string' ? value.error : `HTTP ${response.status}`;
      throw new Error(message);
    }
    return value;
  } catch (cause) {
    if (parentSignal?.aborted) throw new DOMException('Request cancelled.', 'AbortError');
    if (controller.signal.aborted) throw new Error('The local runtime request timed out.');
    if (cause instanceof Error) throw cause;
    throw new Error('Could not reach the local runtime.');
  } finally {
    clearTimeout(timer);
    parentSignal?.removeEventListener('abort', abortFromParent);
  }
}

export async function apiRequest(
  token: string,
  path: string,
  init: RequestInit = {},
  signal?: AbortSignal,
): Promise<unknown> {
  if (!path.startsWith('/') || path.startsWith('//'))
    throw new Error('API path must be same-origin and path-relative.');
  if (new TextEncoder().encode(token).byteLength > MAX_TOKEN_BYTES)
    throw new Error('The bearer token exceeds the runtime limit.');
  const headers = new Headers(init.headers);
  headers.set('accept', 'application/json');
  headers.set('authorization', `Bearer ${token}`);
  if (init.body !== undefined) headers.set('content-type', 'application/json');
  return requestJson(`/api${path}`, { ...init, headers }, 70_000, signal);
}

export async function checkRuntime(signal?: AbortSignal): Promise<void> {
  const value = await requestJson('/api/health', {}, 5_000, signal);
  if (!record(value) || !onlyKeys(value, ['status']) || value.status !== 'ok') {
    throw new Error('The local runtime is not ready.');
  }
}
