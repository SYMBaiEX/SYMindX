export type ChannelName = 'local' | 'slack' | 'telegram' | 'discord';

export interface InboundText {
  channel: ChannelName;
  sender: string;
  text: string;
}

const CHANNEL_NAMES: readonly ChannelName[] = ['local', 'slack', 'telegram', 'discord'];
const SENDER_PATTERN = /^[A-Za-z0-9_.:-]{1,64}$/;
const MIN_TEXT_LENGTH = 1;
const MAX_TEXT_LENGTH = 16000;
const INBOUND_KEYS = ['channel', 'sender', 'text'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isChannelName(value: unknown): value is ChannelName {
  for (const name of CHANNEL_NAMES) {
    if (value === name) {
      return true;
    }
  }
  return false;
}

function hasOnlyInboundKeys(value: Record<string, unknown>): boolean {
  if (Object.getOwnPropertySymbols(value).length > 0) {
    return false;
  }
  const allowed: ReadonlySet<string> = new Set(INBOUND_KEYS);
  for (const name of Object.getOwnPropertyNames(value)) {
    if (!allowed.has(name)) {
      return false;
    }
  }
  return true;
}

function requireChannel(value: unknown): ChannelName {
  if (!isChannelName(value)) {
    throw new Error('unknown channel');
  }
  return value;
}

function requireSender(value: unknown): string {
  if (typeof value !== 'string' || !SENDER_PATTERN.test(value)) {
    throw new Error('invalid sender');
  }
  return value;
}

function requireText(value: unknown): string {
  if (
    typeof value !== 'string' ||
    value.length < MIN_TEXT_LENGTH ||
    value.length > MAX_TEXT_LENGTH
  ) {
    throw new Error('invalid text');
  }
  return value;
}

/** Validate one local payload. This function does not contact those channels. */
export function parseInbound(value: unknown): InboundText {
  if (!isRecord(value) || !hasOnlyInboundKeys(value)) {
    throw new Error('invalid inbound');
  }

  return {
    channel: requireChannel(value['channel']),
    sender: requireSender(value['sender']),
    text: requireText(value['text']),
  };
}
