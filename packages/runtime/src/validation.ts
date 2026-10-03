import { SYMindXError } from './errors.js';
import type { AgentState, Message, ProviderResult, ToolAudit, ToolCall } from './types.js';

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function onlyKeys(value: Record<string, unknown>, keys: string[], description: string): void {
  if (Object.keys(value).some((key) => !keys.includes(key))) invalid(description);
}
function invalid(description: string): never {
  throw new SYMindXError('CONFIGURATION', `Stored ${description} is invalid`);
}
export function decodeAgentState(value: unknown): AgentState {
  if (
    !record(value) ||
    !record(value.emotion) ||
    typeof value.emotion.valence !== 'number' ||
    !Number.isFinite(value.emotion.valence) ||
    value.emotion.valence < -1 ||
    value.emotion.valence > 1 ||
    typeof value.emotion.arousal !== 'number' ||
    !Number.isFinite(value.emotion.arousal) ||
    value.emotion.arousal < 0 ||
    value.emotion.arousal > 1 ||
    !Number.isSafeInteger(value.updatedAt) ||
    (value.updatedAt as number) < 0
  )
    invalid('agent state');
  onlyKeys(value, ['emotion', 'updatedAt'], 'agent state');
  onlyKeys(value.emotion, ['valence', 'arousal'], 'agent emotion');
  return {
    emotion: { valence: value.emotion.valence, arousal: value.emotion.arousal },
    updatedAt: value.updatedAt as number,
  };
}
export function decodeToolCall(value: unknown, description = 'tool call'): ToolCall {
  if (
    !record(value) ||
    typeof value.id !== 'string' ||
    !value.id ||
    value.id.length > 128 ||
    typeof value.name !== 'string' ||
    !/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(value.name) ||
    !isJsonValue(value.arguments)
  )
    invalid(description);
  onlyKeys(value, ['id', 'name', 'arguments'], description);
  return { id: value.id, name: value.name, arguments: value.arguments };
}
export function decodeMessage(value: unknown): Message {
  if (
    !record(value) ||
    typeof value.id !== 'string' ||
    !value.id ||
    typeof value.agentId !== 'string' ||
    !value.agentId ||
    typeof value.conversationId !== 'string' ||
    !value.conversationId ||
    typeof value.content !== 'string' ||
    !Number.isSafeInteger(value.createdAt) ||
    (value.createdAt as number) < 0
  )
    invalid('message');
  const metadata = {
    id: value.id,
    agentId: value.agentId,
    conversationId: value.conversationId,
    createdAt: value.createdAt as number,
    content: value.content,
  };
  onlyKeys(
    value,
    ['id', 'agentId', 'conversationId', 'createdAt', 'content', 'role', 'toolCallId', 'toolCalls'],
    'message',
  );
  if (value.role === 'user') {
    if ('toolCallId' in value || 'toolCalls' in value) invalid('user message');
    return { ...metadata, role: 'user' };
  }
  if (value.role === 'assistant') {
    if ('toolCallId' in value) invalid('assistant message');
    if (value.toolCalls !== undefined) {
      if (!Array.isArray(value.toolCalls) || value.toolCalls.length > 8)
        invalid('assistant tool calls');
      const calls = value.toolCalls.map((call) => decodeToolCall(call, 'message tool call'));
      if (new Set(calls.map((call) => call.id)).size !== calls.length)
        invalid('message tool call identifiers');
      return { ...metadata, role: 'assistant', toolCalls: calls };
    }
    return { ...metadata, role: 'assistant' };
  }
  if (
    value.role === 'tool' &&
    typeof value.toolCallId === 'string' &&
    value.toolCallId &&
    !('toolCalls' in value)
  )
    return { ...metadata, role: 'tool', toolCallId: value.toolCallId };
  invalid('message role');
}
export function decodeProviderResult(value: unknown): ProviderResult {
  if (
    !record(value) ||
    typeof value.text !== 'string' ||
    value.text.length > 32_000 ||
    !Array.isArray(value.toolCalls) ||
    value.toolCalls.length > 8 ||
    (!value.text.trim() && value.toolCalls.length === 0)
  )
    throw new SYMindXError('PROVIDER', 'Provider returned an invalid or oversized response');
  if (Object.keys(value).some((key) => !['text', 'toolCalls', 'usage'].includes(key)))
    throw new SYMindXError('PROVIDER', 'Provider returned an invalid response field');
  let calls: ToolCall[];
  try {
    calls = value.toolCalls.map((call) => decodeToolCallProvider(call));
  } catch {
    throw new SYMindXError('PROVIDER', 'Provider returned a malformed tool call');
  }
  if (new Set(calls.map((call) => call.id)).size !== calls.length)
    throw new SYMindXError('PROVIDER', 'Provider returned duplicate tool call identifiers');
  let usage: ProviderResult['usage'];
  if (value.usage !== undefined) {
    if (!record(value.usage)) throw new SYMindXError('PROVIDER', 'Provider usage is invalid');
    const decoded: NonNullable<ProviderResult['usage']> = {};
    for (const key of ['inputTokens', 'outputTokens', 'totalTokens'] as const) {
      const count = value.usage[key];
      if (count !== undefined) {
        if (!Number.isSafeInteger(count) || (count as number) < 0)
          throw new SYMindXError('PROVIDER', 'Provider usage is invalid');
        decoded[key] = count as number;
      }
    }
    if (
      Object.keys(value.usage).some(
        (key) => !['inputTokens', 'outputTokens', 'totalTokens'].includes(key),
      )
    )
      throw new SYMindXError('PROVIDER', 'Provider usage is invalid');
    usage = decoded;
  }
  return { text: value.text, toolCalls: calls, ...(usage === undefined ? {} : { usage }) };
}
function decodeToolCallProvider(value: unknown): ToolCall {
  const call = decodeToolCall(value, 'provider tool call');
  if (JSON.stringify(call.arguments).length > 16_000)
    throw new SYMindXError('PROVIDER', 'Provider tool arguments exceeded the size limit');
  return call;
}
export function decodeToolAudit(value: unknown): ToolAudit {
  if (
    !record(value) ||
    typeof value.id !== 'string' ||
    !value.id ||
    typeof value.agentId !== 'string' ||
    !value.agentId ||
    typeof value.conversationId !== 'string' ||
    !value.conversationId ||
    typeof value.name !== 'string' ||
    !/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(value.name) ||
    !['started', 'completed', 'denied', 'failed'].includes(value.status as string) ||
    !Number.isSafeInteger(value.createdAt) ||
    (value.createdAt as number) < 0 ||
    (value.finishedAt !== undefined &&
      (!Number.isSafeInteger(value.finishedAt) || (value.finishedAt as number) < 0))
  )
    invalid('tool audit');
  onlyKeys(
    value,
    ['id', 'agentId', 'conversationId', 'name', 'status', 'createdAt', 'finishedAt'],
    'tool audit',
  );
  return {
    id: value.id,
    agentId: value.agentId,
    conversationId: value.conversationId,
    name: value.name,
    status: value.status as ToolAudit['status'],
    createdAt: value.createdAt as number,
    ...(value.finishedAt === undefined ? {} : { finishedAt: value.finishedAt as number }),
  };
}
export function isJsonValue(value: unknown, depth = 0): value is import('./types.js').JsonValue {
  if (depth > 12) return false;
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.every((item) => isJsonValue(item, depth + 1));
  if (!record(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return (
    (proto === Object.prototype || proto === null) &&
    Object.values(value).every((item) => isJsonValue(item, depth + 1))
  );
}
