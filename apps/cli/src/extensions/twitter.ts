import type { HostFetch } from './types.js';

const TWEET_URL = 'https://api.x.com/2/tweets';

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function tweetId(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const data: unknown = Reflect.get(value, 'data');
  if (!isRecord(data)) {
    return undefined;
  }
  const id: unknown = Reflect.get(data, 'id');
  if (typeof id !== 'string' || id.length === 0) {
    return undefined;
  }
  return id;
}

function parseJson(raw: string): unknown {
  return JSON.parse(raw) as unknown;
}

export async function postTweet(input: {
  readonly token: string;
  readonly text: string;
  readonly fetch: HostFetch;
  readonly signal: AbortSignal;
}): Promise<{ readonly ok: true; readonly id: string } | { readonly ok: false; readonly error: string }> {
  if (input.token.length === 0 || input.token.length > 400 || /\s/u.test(input.token)) {
    return { ok: false, error: 'twitter token is missing' };
  }
  const trimmed = input.text.trim();
  if (trimmed.length < 1 || trimmed.length > 280) {
    return { ok: false, error: 'twitter text must be 1 to 280 characters' };
  }
  const response = await input.fetch(TWEET_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text: trimmed }),
    signal: input.signal,
  });
  if (!response.ok) {
    return { ok: false, error: `twitter http ${response.status}` };
  }
  let parsed: unknown;
  try {
    parsed = parseJson(await response.text());
  } catch {
    return { ok: false, error: 'twitter payload was not a tweet' };
  }
  const id = tweetId(parsed);
  if (id === undefined) {
    return { ok: false, error: 'twitter payload was not a tweet' };
  }
  return { ok: true, id };
}
