import type { HostFetch } from './types.js';

export const MEMORY_PROVIDERS = ['sqlite', 'supabase', 'neon'] as const;
export type MemoryProviderId = (typeof MEMORY_PROVIDERS)[number];

const SUPABASE_HOST = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.supabase\.co$/u;

type MemoryResult = { readonly ok: true } | { readonly ok: false; readonly error: string };

function missingKey(apiKey: string): boolean {
  return apiKey.length === 0 || apiKey.length > 400 || /\s/u.test(apiKey);
}

function memoryText(text: string): string | undefined {
  const trimmed = text.trim();
  if (trimmed.length < 1 || trimmed.length > 4000) {
    return undefined;
  }
  return trimmed;
}

function supabaseOrigin(raw: string): string | undefined {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return undefined;
  }
  if (url.protocol !== 'https:' || url.username.length > 0 || url.password.length > 0) {
    return undefined;
  }
  if (url.pathname !== '/' && url.pathname !== '') {
    return undefined;
  }
  if (url.search.length > 0 || url.hash.length > 0 || url.port.length > 0) {
    return undefined;
  }
  if (!SUPABASE_HOST.test(url.hostname)) {
    return undefined;
  }
  return url.origin;
}

function neonEndpoint(raw: string): string | undefined {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return undefined;
  }
  if (url.protocol !== 'https:' || url.username.length > 0 || url.password.length > 0) {
    return undefined;
  }
  const host = url.hostname;
  if (!host.endsWith('.neon.tech') || host.length <= '.neon.tech'.length) {
    return undefined;
  }
  return url.href;
}

export async function rememberSupabase(input: {
  readonly url: string;
  readonly apiKey: string;
  readonly text: string;
  readonly fetch: HostFetch;
  readonly signal: AbortSignal;
}): Promise<MemoryResult> {
  const origin = supabaseOrigin(input.url);
  if (origin === undefined) {
    return { ok: false, error: 'supabase url is invalid' };
  }
  if (missingKey(input.apiKey)) {
    return { ok: false, error: 'supabase key is missing' };
  }
  const trimmed = memoryText(input.text);
  if (trimmed === undefined) {
    return { ok: false, error: 'memory text is invalid' };
  }
  const response = await input.fetch(`${origin}/rest/v1/symindx_memory`, {
    method: 'POST',
    headers: {
      apikey: input.apiKey,
      Authorization: `Bearer ${input.apiKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ text: trimmed }),
    signal: input.signal,
  });
  if (!response.ok) {
    return { ok: false, error: `supabase http ${response.status}` };
  }
  return { ok: true };
}

export async function rememberNeon(input: {
  readonly endpoint: string;
  readonly apiKey: string;
  readonly text: string;
  readonly fetch: HostFetch;
  readonly signal: AbortSignal;
}): Promise<MemoryResult> {
  const endpoint = neonEndpoint(input.endpoint);
  if (endpoint === undefined) {
    return { ok: false, error: 'neon endpoint is invalid' };
  }
  if (missingKey(input.apiKey)) {
    return { ok: false, error: 'neon key is missing' };
  }
  const trimmed = memoryText(input.text);
  if (trimmed === undefined) {
    return { ok: false, error: 'memory text is invalid' };
  }
  const response = await input.fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: 'insert into symindx_memory (text) values ($1)',
      params: [trimmed],
    }),
    signal: input.signal,
  });
  if (!response.ok) {
    return { ok: false, error: `neon http ${response.status}` };
  }
  return { ok: true };
}
