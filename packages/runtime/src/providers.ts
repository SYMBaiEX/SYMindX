import { abortable, SYMindXError, throwIfAborted } from './errors.js';
import { decodeProviderResult } from './validation.js';
import type {
  JsonValue,
  Provider,
  ProviderConfig,
  ProviderRequest,
  ProviderResult,
  ToolCall,
} from './types.js';

const MAX_RESPONSE_BYTES = 4 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 30_000;

/** Deterministic demonstration provider; it never simulates model tool use. */
export class EchoProvider implements Provider {
  async generate(request: ProviderRequest): Promise<ProviderResult> {
    throwIfAborted(request.signal);
    const lastUser = [...request.messages].reverse().find((message) => message.role === 'user');
    return { text: `Echo: ${lastUser?.content ?? ''}`, toolCalls: [] };
  }
}

export interface OpenAICompatibleProviderOptions {
  fetch?: typeof fetch;
  timeoutMs?: number;
}

/** Chat Completions adapter. Calls are returned as data for runtime policy, never executed here. */
export class OpenAICompatibleProvider implements Provider {
  private readonly endpoint: string;
  private readonly transport: typeof fetch;
  private readonly timeoutMs: number;

  private readonly config: Extract<ProviderConfig, { type: 'openai-compatible' }>;

  constructor(
    config: Extract<ProviderConfig, { type: 'openai-compatible' }>,
    options: OpenAICompatibleProviderOptions = {},
  ) {
    if (config.type !== 'openai-compatible')
      throw new SYMindXError(
        'CONFIGURATION',
        'OpenAI-compatible provider requires matching config',
      );
    if (!config.model.trim() || config.model.length > 200)
      throw new SYMindXError('CONFIGURATION', 'Provider model must be non-empty');
    if (!config.apiKeyEnv || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(config.apiKeyEnv))
      throw new SYMindXError('CONFIGURATION', 'A valid apiKeyEnv variable name is required');
    this.config = Object.freeze(structuredClone(config));
    this.endpoint = validateBaseUrl(config.baseUrl);
    this.transport = options.fetch ?? globalThis.fetch;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    if (typeof this.transport !== 'function')
      throw new SYMindXError('CONFIGURATION', 'Fetch transport is unavailable');
    if (!Number.isFinite(this.timeoutMs) || this.timeoutMs <= 0 || this.timeoutMs > 600_000)
      throw new SYMindXError(
        'CONFIGURATION',
        'Provider timeout must be between 1 and 600000 milliseconds',
      );
    const maxOutputTokens = config.maxOutputTokens ?? 2048;
    if (!Number.isInteger(maxOutputTokens) || maxOutputTokens < 1 || maxOutputTokens > 16_384)
      throw new SYMindXError('CONFIGURATION', 'maxOutputTokens must be between 1 and 16384');
  }

  async generate(request: ProviderRequest): Promise<ProviderResult> {
    throwIfAborted(request.signal);
    const apiKey = readApiKey(this.config.apiKeyEnv);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort('timeout'), this.timeoutMs);
    const abortFromCaller = () => controller.abort('caller');
    request.signal.addEventListener('abort', abortFromCaller, { once: true });
    if (request.signal.aborted) abortFromCaller();
    try {
      let response: Response;
      try {
        response = await abortable(
          this.transport(this.endpoint, {
            method: 'POST',
            redirect: 'error',
            headers: { authorization: 'Bearer ' + apiKey, 'content-type': 'application/json' },
            body: JSON.stringify(
              buildPayload(this.config.model, request, this.config.maxOutputTokens ?? 2048),
            ),
            signal: controller.signal,
          }),
          controller.signal,
        );
      } catch (error) {
        if (request.signal.aborted)
          throw new SYMindXError('ABORTED', 'Provider request was cancelled');
        if (controller.signal.aborted)
          throw new SYMindXError('TIMEOUT', 'Provider request timed out');
        throw providerFailure(controller, request.signal);
      }
      if (!response.ok) {
        try {
          if (response.body) void response.body.cancel().catch(() => undefined);
        } catch {
          /* Keep the sanitized status error if disposal fails. */
        }
        throw new SYMindXError('PROVIDER', `Provider returned HTTP ${response.status}`);
      }
      const raw = await readBoundedResponse(response, controller, request.signal);
      let decoded: unknown;
      try {
        decoded = JSON.parse(raw);
      } catch (error) {
        throw new SYMindXError('PROVIDER', 'Provider returned invalid JSON');
      }
      return parseCompletion(decoded);
    } finally {
      clearTimeout(timer);
      request.signal.removeEventListener('abort', abortFromCaller);
    }
  }
}

export function createProvider(config: ProviderConfig): Provider {
  switch (config.type) {
    case 'echo':
      return new EchoProvider();
    case 'openai-compatible':
      return new OpenAICompatibleProvider(config);
    default:
      throw new SYMindXError('CONFIGURATION', 'Unsupported provider type');
  }
}

function validateBaseUrl(baseUrl: string | undefined): string {
  if (!baseUrl || baseUrl.length > 2000)
    throw new SYMindXError('CONFIGURATION', 'Provider baseUrl is required');
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    throw new SYMindXError('CONFIGURATION', 'Provider baseUrl must be a valid URL');
  }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname.toLowerCase());
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local))
    throw new SYMindXError(
      'CONFIGURATION',
      'Provider baseUrl must use HTTPS (HTTP only for loopback)',
    );
  if (url.username || url.password || url.search || url.hash)
    throw new SYMindXError(
      'CONFIGURATION',
      'Provider baseUrl cannot contain credentials, query, or fragment',
    );
  const rootPath = url.pathname.replace(/\/+$/, '');
  url.pathname = rootPath.endsWith('/v1')
    ? `${rootPath}/chat/completions`
    : `${rootPath}/v1/chat/completions`;
  return url.toString();
}

function readApiKey(envName: string): string {
  const env = (
    globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }
  ).process?.env;
  const key = env?.[envName];
  if (!key?.trim())
    throw new SYMindXError('CONFIGURATION', `API key environment variable ${envName} is not set`);
  return key;
}

function buildPayload(model: string, request: ProviderRequest, maxOutputTokens = 2048): unknown {
  const messages: unknown[] = [{ role: 'system', content: request.system }];
  for (const message of request.messages) {
    if (message.role === 'tool') {
      if (!message.toolCallId)
        throw new SYMindXError('VALIDATION', 'Tool result is missing toolCallId');
      messages.push({ role: 'tool', tool_call_id: message.toolCallId, content: message.content });
    } else if (message.role === 'assistant' && message.toolCalls?.length) {
      messages.push({
        role: 'assistant',
        content: message.content || null,
        tool_calls: message.toolCalls.map((call) => ({
          id: call.id,
          type: 'function',
          function: { name: call.name, arguments: JSON.stringify(call.arguments) },
        })),
      });
    } else messages.push({ role: message.role, content: message.content });
  }
  const payload: Record<string, unknown> = {
    model,
    messages,
    max_completion_tokens: maxOutputTokens,
  };
  if (request.tools.length) {
    payload.tools = request.tools.map((tool) => ({
      type: 'function',
      function: { name: tool.name, description: tool.description, parameters: tool.parameters },
    }));
    payload.tool_choice = 'auto';
  }
  return payload;
}

async function readBoundedResponse(
  response: Response,
  controller: AbortController,
  callerSignal: AbortSignal,
): Promise<string> {
  if (!response.body) throw new SYMindXError('PROVIDER', 'Provider response has no body');
  const declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > MAX_RESPONSE_BYTES) {
    void response.body.cancel().catch(() => undefined);
    throw new SYMindXError('PROVIDER', 'Provider response exceeded the size limit');
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      let part: Awaited<ReturnType<typeof reader.read>>;
      try {
        part = await abortable(reader.read(), controller.signal);
      } catch {
        void reader.cancel().catch(() => undefined);
        throw providerFailure(controller, callerSignal);
      }
      if (part.done) break;
      size += part.value.byteLength;
      if (size > MAX_RESPONSE_BYTES) {
        void reader.cancel().catch(() => undefined);
        throw new SYMindXError('PROVIDER', 'Provider response exceeded the size limit');
      }
      chunks.push(part.value);
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      /* A pending read owns the lock until it settles. */
    }
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new SYMindXError('PROVIDER', 'Provider response is not valid UTF-8');
  }
}

function providerFailure(controller: AbortController, callerSignal: AbortSignal): SYMindXError {
  if (callerSignal.aborted || controller.signal.reason === 'caller')
    return new SYMindXError('ABORTED', 'Provider request was cancelled');
  if (controller.signal.aborted) return new SYMindXError('TIMEOUT', 'Provider request timed out');
  return new SYMindXError('PROVIDER', 'Provider request failed');
}
function parseCompletion(value: unknown): ProviderResult {
  if (!isRecord(value) || !Array.isArray(value.choices) || !value.choices.length)
    throw new SYMindXError('PROVIDER', 'Provider response has an invalid completion shape');
  const choice = value.choices[0];
  if (!isRecord(choice) || !isRecord(choice.message))
    throw new SYMindXError('PROVIDER', 'Provider response is missing a completion message');
  if (
    choice.finish_reason !== null &&
    choice.finish_reason !== 'stop' &&
    choice.finish_reason !== 'tool_calls'
  )
    throw new SYMindXError('PROVIDER', 'Provider returned an incomplete completion');
  const message = choice.message;
  if (message.content !== null && typeof message.content !== 'string')
    throw new SYMindXError('PROVIDER', 'Provider response message content is invalid');
  if (typeof message.content === 'string' && message.content.length > 32_000)
    throw new SYMindXError('PROVIDER', 'Provider response text exceeded the size limit');
  const toolCalls: ToolCall[] = [];
  const seenIds = new Set<string>();
  if (
    message.content === null &&
    (!Array.isArray(message.tool_calls) || message.tool_calls.length === 0)
  )
    throw new SYMindXError('PROVIDER', 'Provider returned neither text nor tool calls');
  if (message.tool_calls !== undefined) {
    if (!Array.isArray(message.tool_calls) || message.tool_calls.length > 8)
      throw new SYMindXError('PROVIDER', 'Provider tool calls are invalid');
    for (const item of message.tool_calls) {
      if (
        !isRecord(item) ||
        typeof item.id !== 'string' ||
        !item.id ||
        item.id.length > 128 ||
        seenIds.has(item.id) ||
        item.type !== 'function' ||
        !isRecord(item.function) ||
        typeof item.function.name !== 'string' ||
        !/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(item.function.name) ||
        typeof item.function.arguments !== 'string' ||
        item.function.arguments.length > 16_384
      )
        throw new SYMindXError('PROVIDER', 'Provider returned a malformed tool call');
      let args: unknown;
      try {
        args = JSON.parse(item.function.arguments);
      } catch {
        throw new SYMindXError('PROVIDER', 'Provider returned invalid tool arguments');
      }
      if (!isJsonValue(args))
        throw new SYMindXError('PROVIDER', 'Provider tool arguments are not JSON values');
      seenIds.add(item.id);
      toolCalls.push({ id: item.id, name: item.function.name, arguments: args });
    }
  }
  const result: ProviderResult = { text: message.content ?? '', toolCalls };
  const usage = parseUsage(value.usage);
  if (usage) result.usage = usage;
  return decodeProviderResult(result);
}

function parseUsage(value: unknown): ProviderResult['usage'] {
  if (value === undefined) return undefined;
  if (!isRecord(value)) throw new SYMindXError('PROVIDER', 'Provider usage is invalid');
  const usage: NonNullable<ProviderResult['usage']> = {};
  for (const [source, target] of [
    ['prompt_tokens', 'inputTokens'],
    ['completion_tokens', 'outputTokens'],
    ['total_tokens', 'totalTokens'],
  ] as const) {
    const count = value[source];
    if (count !== undefined) {
      if (!Number.isSafeInteger(count) || (count as number) < 0)
        throw new SYMindXError('PROVIDER', 'Provider usage is invalid');
      usage[target] = count as number;
    }
  }
  return usage;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function isJsonValue(value: unknown, depth = 0): value is JsonValue {
  if (depth > 12) return false;
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.every((item) => isJsonValue(item, depth + 1));
  if (isRecord(value)) return Object.values(value).every((item) => isJsonValue(item, depth + 1));
  return false;
}
