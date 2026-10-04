import type { Provider, ProviderRequest, ProviderResult, ToolCall } from './types.js';

type TokenUsage = NonNullable<ProviderResult['usage']>;

const ScriptedAbort: new (message?: string, name?: string) => DOMException = DOMException;

function cloneJson(value: ToolCall['arguments']): ToolCall['arguments'] {
  if (value === null || typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') {
    return value;
  }
  const serialized = JSON.stringify(value);
  const parsed: unknown = JSON.parse(serialized);
  if (!isJsonValue(parsed)) {
    throw new TypeError('scripted tool arguments were not JSON');
  }
  return parsed;
}

function isJsonValue(value: unknown): value is ToolCall['arguments'] {
  if (value === null || typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') {
    return true;
  }
  if (Array.isArray(value)) {
    return value.every((entry: unknown) => isJsonValue(entry));
  }
  if (typeof value === 'object') {
    return Object.keys(value).every((key) => {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      return (
        descriptor !== undefined && 'value' in descriptor && isJsonValue(descriptor.value)
      );
    });
  }
  return false;
}

function copyToolCall(call: ToolCall): ToolCall {
  return {
    id: call.id,
    name: call.name,
    arguments: cloneJson(call.arguments),
  };
}

function copyUsage(usage: TokenUsage): TokenUsage {
  const copied: TokenUsage = {};
  if (usage.inputTokens !== undefined) {
    copied.inputTokens = usage.inputTokens;
  }
  if (usage.outputTokens !== undefined) {
    copied.outputTokens = usage.outputTokens;
  }
  if (usage.totalTokens !== undefined) {
    copied.totalTokens = usage.totalTokens;
  }
  return copied;
}

function copyResult(result: ProviderResult): ProviderResult {
  const copied: ProviderResult = {
    text: result.text.slice(),
    toolCalls: result.toolCalls.map(copyToolCall),
  };
  if (result.usage !== undefined) {
    copied.usage = copyUsage(result.usage);
  }
  return copied;
}

export function createScriptedProvider(results: readonly ProviderResult[]): Provider {
  let index = 0;
  return {
    async generate(request: ProviderRequest): Promise<ProviderResult> {
      if (request.signal.aborted) {
        throw new ScriptedAbort('aborted', 'AbortError');
      }
      const next = results[index];
      if (next === undefined) {
        throw new Error('scripted provider exhausted');
      }
      index += 1;
      return copyResult(next);
    },
  };
}
