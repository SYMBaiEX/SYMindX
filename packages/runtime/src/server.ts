import { timingSafeEqual } from 'node:crypto';
import type { SYMindXRuntime } from './runtime.js';
import { SYMindXError } from './errors.js';

const MAX_BODY_BYTES = 64 * 1024;
const BODY_READ_TIMEOUT_MS = 10_000;

export interface ApiServerOptions {
  host?: string;
  port?: number;
  token: string;
}

/** Validate all API bind/auth options without starting a listener. */
export function validateApiServerOptions(options: ApiServerOptions): void {
  const host = options.host ?? '127.0.0.1';
  const port = options.port ?? 8000;
  validateHost(host);
  if (!Number.isInteger(port) || port < 0 || port > 65535)
    throw new SYMindXError('VALIDATION', 'port must be an integer from 0 to 65535');
  if (
    typeof options.token !== 'string' ||
    Buffer.byteLength(options.token, 'utf8') < 32 ||
    Buffer.byteLength(options.token, 'utf8') > 4096 ||
    [...options.token].some((character) => character.trim() === '')
  ) {
    throw new SYMindXError('CONFIGURATION', 'API token must be 32 to 4096 non-whitespace bytes');
  }
}

/** Start the authenticated, loopback-only HTTP API. The caller owns shutdown. */
export function createApiServer(runtime: SYMindXRuntime, options: ApiServerOptions) {
  validateApiServerOptions(options);
  const host = options.host ?? '127.0.0.1';
  const port = options.port ?? 8000;
  const token = Buffer.from(options.token, 'utf8');

  return Bun.serve({
    hostname: host,
    port,
    maxRequestBodySize: MAX_BODY_BYTES,
    fetch: async (request) => {
      const url = new URL(request.url);
      if (!isLoopbackHostname(url.hostname)) return json({ error: 'Forbidden' }, 403);
      if (url.pathname === '/health' && request.method === 'GET') {
        return runtime.isRunning ? json({ status: 'ok' }) : json({ status: 'unavailable' }, 503);
      }

      if (isCrossOrigin(request, url)) return json({ error: 'Forbidden' }, 403);
      if (!authorized(request, token))
        return json({ error: 'Unauthorized' }, 401, { 'www-authenticate': 'Bearer' });

      if (url.pathname === '/agents' && request.method === 'GET') {
        if ([...url.searchParams.keys()].length)
          return json({ error: 'Unexpected query parameters' }, 400);
        try {
          return json({ agents: runtime.listAgents() });
        } catch (error) {
          return runtimeError(error);
        }
      }

      const match = /^\/agents\/([a-zA-Z0-9][a-zA-Z0-9_-]{0,63})(?:\/(chat|history))?$/.exec(
        url.pathname,
      );
      if (!match) return json({ error: 'Not found' }, 404);
      const agentId = match[1]!;
      const resource = match[2];

      if (resource === 'chat' && request.method === 'POST') {
        if ([...url.searchParams.keys()].length)
          return json({ error: 'Unexpected query parameters' }, 400);
        const parsed = await readJson(request);
        if (!parsed.ok) return json({ error: parsed.error }, parsed.status);
        const body = parsed.value;
        if (
          !isRecord(body) ||
          Object.keys(body).some((key) => key !== 'text' && key !== 'conversationId') ||
          typeof body['text'] !== 'string' ||
          !body['text'].trim() ||
          body['text'].length > 16_000 ||
          (body['conversationId'] !== undefined &&
            (typeof body['conversationId'] !== 'string' ||
              !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(body['conversationId'])))
        ) {
          return json(
            { error: 'Request must contain text and may contain a valid conversationId only' },
            400,
          );
        }
        const abort = new AbortController();
        const disconnected = () => abort.abort();
        request.signal.addEventListener('abort', disconnected, { once: true });
        if (request.signal.aborted) disconnected();
        try {
          const result = await runtime.sendMessage(agentId, body['text'], {
            ...(typeof body['conversationId'] === 'string'
              ? { conversationId: body['conversationId'] }
              : {}),
            signal: abort.signal,
          });
          return json({ result });
        } catch (error) {
          return runtimeError(error);
        } finally {
          request.signal.removeEventListener('abort', disconnected);
        }
      }

      if (resource === 'history' && request.method === 'GET') {
        for (const key of url.searchParams.keys())
          if (key !== 'conversationId' && key !== 'limit')
            return json({ error: 'Unexpected query parameter' }, 400);
        if (
          url.searchParams.getAll('conversationId').length > 1 ||
          url.searchParams.getAll('limit').length > 1
        ) {
          return json({ error: 'Duplicate history query parameter' }, 400);
        }
        const conversationId = url.searchParams.get('conversationId');
        const rawLimit = url.searchParams.get('limit');
        const limit = rawLimit === null ? undefined : Number(rawLimit);
        if (
          (conversationId !== null && !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(conversationId)) ||
          (rawLimit !== null &&
            (!/^\d{1,3}$/.test(rawLimit) || !Number.isInteger(limit) || limit! < 1 || limit! > 500))
        ) {
          return json({ error: 'Invalid history query parameters' }, 400);
        }
        try {
          return json({ messages: runtime.history(agentId, conversationId ?? undefined, limit) });
        } catch (error) {
          return runtimeError(error);
        }
      }
      return json({ error: 'Not found' }, 404);
    },
  });
}

function validateHost(host: string): void {
  if (!isLoopbackHostname(host))
    throw new SYMindXError('CONFIGURATION', 'The API server can bind only to a loopback host');
}

function isLoopbackHostname(host: string): boolean {
  return ['127.0.0.1', 'localhost', '::1', '[::1]'].includes(host.toLowerCase());
}

function isCrossOrigin(request: Request, url: URL): boolean {
  const origin = request.headers.get('origin');
  if (origin) {
    try {
      if (new URL(origin).origin !== url.origin) return true;
    } catch {
      return true;
    }
  }
  return request.headers.get('sec-fetch-site') === 'cross-site';
}

function authorized(request: Request, expected: Buffer): boolean {
  const value = request.headers.get('authorization');
  if (!value || value.slice(0, 7).toLowerCase() !== 'bearer ') return false;
  const supplied = Buffer.from(value.slice(7), 'utf8');
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

async function readJson(
  request: Request,
): Promise<{ ok: true; value: unknown } | { ok: false; status: number; error: string }> {
  const contentType = request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase();
  if (contentType !== 'application/json')
    return { ok: false, status: 415, error: 'Content-Type must be application/json' };
  const length = request.headers.get('content-length');
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > MAX_BODY_BYTES)) {
    return { ok: false, status: 413, error: 'Request body exceeds 64 KiB' };
  }
  if (!request.body) return { ok: false, status: 400, error: 'Expected a JSON request body' };
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    void reader.cancel();
  }, BODY_READ_TIMEOUT_MS);
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel();
        return { ok: false, status: 413, error: 'Request body exceeds 64 KiB' };
      }
      chunks.push(value);
    }
  } catch {
    return {
      ok: false,
      status: timedOut ? 408 : 400,
      error: timedOut ? 'Request body read timed out' : 'Could not read request body',
    };
  } finally {
    clearTimeout(timer);
    reader.releaseLock();
  }
  if (timedOut) return { ok: false, status: 408, error: 'Request body read timed out' };
  try {
    return {
      ok: true,
      value: JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(concat(chunks, size))),
    };
  } catch {
    return { ok: false, status: 400, error: 'Request body must be valid UTF-8 JSON' };
  }
}

function concat(chunks: Uint8Array[], size: number): Uint8Array {
  const result = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

function runtimeError(error: unknown): Response {
  if (!(error instanceof SYMindXError)) return json({ error: 'Internal server error' }, 500);
  const safe: Record<SYMindXError['code'], { status: number; message: string }> = {
    CONFIGURATION: { status: 400, message: 'Request configuration is invalid' },
    NOT_RUNNING: { status: 503, message: 'Runtime is unavailable' },
    NOT_FOUND: { status: 404, message: 'Agent not found' },
    BUSY: { status: 409, message: 'Agent is busy' },
    ABORTED: { status: 499, message: 'Request was cancelled' },
    TIMEOUT: { status: 504, message: 'Request timed out' },
    PROVIDER: { status: 502, message: 'Provider request failed' },
    TOOL: { status: 502, message: 'Tool execution failed' },
    VALIDATION: { status: 400, message: 'Request is invalid' },
    CONFLICT: { status: 409, message: 'Request conflicts with current state' },
  };
  const result = safe[error.code];
  return json({ error: result.message, code: error.code }, result.status);
}

function json(value: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...extraHeaders,
    },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
