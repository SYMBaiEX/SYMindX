import type { HostFetch } from './types.js';

const POST_MESSAGE_URL = 'https://slack.com/api/chat.postMessage';
const TOKEN_MAX = 200;
const TEXT_MAX = 4000;

const CHANNEL_CODE = /^[A-Z0-9]{1,32}$/;
const CHANNEL_ID = /^[CDG][A-Z0-9]{8,}$/;
const CHANNEL_NAME = /^[a-z0-9_-]{1,80}$/;

export function parseSlackApproval(text: string): 'approve' | 'reject' | 'pending' {
  const word = text.trim().toLowerCase();
  if (word === 'approve' || word === 'approved' || word === 'yes') {
    return 'approve';
  }
  if (word === 'reject' || word === 'rejected' || word === 'no') {
    return 'reject';
  }
  return 'pending';
}

export async function postSlackMessage(input: {
  readonly token: string;
  readonly channel: string;
  readonly text: string;
  readonly fetch: HostFetch;
  readonly signal: AbortSignal;
}): Promise<{ readonly ok: true; readonly channel: string } | { readonly ok: false; readonly error: string }> {
  if (!isSlackToken(input.token)) {
    return { ok: false, error: 'slack token is missing' };
  }
  if (!isSlackChannel(input.channel)) {
    return { ok: false, error: 'slack channel is invalid' };
  }
  const text = input.text.trim();
  if (text.length < 1 || text.length > TEXT_MAX) {
    return { ok: false, error: 'slack text is invalid' };
  }

  const response = await input.fetch(POST_MESSAGE_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.token}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({ channel: input.channel, text }),
    signal: input.signal,
  });
  if (!response.ok) {
    return { ok: false, error: `slack http ${response.status}` };
  }

  const payload = parseJson(await response.text());
  if (!isRecord(payload)) {
    return { ok: false, error: 'slack payload was not an object' };
  }
  if (payload.ok === true) {
    return { ok: true, channel: input.channel };
  }
  const error = payload.error;
  return { ok: false, error: typeof error === 'string' ? error : 'slack request failed' };
}

function isSlackToken(token: string): boolean {
  return token.length > 0 && token.length <= TOKEN_MAX && !/\s/.test(token);
}

function isSlackChannel(channel: string): boolean {
  return CHANNEL_CODE.test(channel) || CHANNEL_ID.test(channel) || CHANNEL_NAME.test(channel);
}

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return undefined;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
