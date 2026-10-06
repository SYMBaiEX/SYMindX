/**
 * Typed link for a caller-owned RuneLite plugin socket.
 * Parses plugin events and encodes high-level actions. Does not open a connection.
 */

export type RuneEvent =
  | { readonly type: 'chat'; readonly speaker: string; readonly text: string }
  | { readonly type: 'skill'; readonly name: string; readonly level: number }
  | { readonly type: 'location'; readonly region: string; readonly x: number; readonly y: number }
  | { readonly type: 'idle' };

export type RuneAction =
  | { readonly type: 'say'; readonly text: string }
  | { readonly type: 'walk'; readonly x: number; readonly y: number }
  | { readonly type: 'examine'; readonly target: string };

export interface RuneSocket {
  send(data: string): void;
  close(): void;
}

const SKILL_NAME = /^[a-z ]+$/;
const LOOPBACK_SOCKET =
  /^ws:\/\/(?:127\.0\.0\.1|localhost):([1-9][0-9]{0,4})(?:\/[A-Za-z0-9/]*)?$/;
const MAX_PORT = 65535;
const MAX_TILE = 20000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isBoundedString(value: unknown, min: number, max: number): value is string {
  return typeof value === 'string' && value.length >= min && value.length <= max;
}

function isBoundedInteger(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
}

function readJson(text: string): unknown {
  try {
    const value: unknown = JSON.parse(text);
    return value;
  } catch {
    throw new Error('rune event is not json');
  }
}

function invalidEvent(): never {
  throw new Error('rune event is invalid');
}

function parseChat(value: Record<string, unknown>): RuneEvent {
  const speaker = value['speaker'];
  const text = value['text'];
  if (!isBoundedString(speaker, 1, 80) || !isBoundedString(text, 1, 200)) {
    return invalidEvent();
  }
  return { type: 'chat', speaker, text };
}

function parseSkill(value: Record<string, unknown>): RuneEvent {
  const name = value['name'];
  const level = value['level'];
  if (!isBoundedString(name, 1, 32) || !SKILL_NAME.test(name) || !isBoundedInteger(level, 1, 99)) {
    return invalidEvent();
  }
  return { type: 'skill', name, level };
}

function parseLocation(value: Record<string, unknown>): RuneEvent {
  const region = value['region'];
  const x = value['x'];
  const y = value['y'];
  if (
    !isBoundedString(region, 1, 40) ||
    !isBoundedInteger(x, 0, MAX_TILE) ||
    !isBoundedInteger(y, 0, MAX_TILE)
  ) {
    return invalidEvent();
  }
  return { type: 'location', region, x, y };
}

export function parseRuneEvent(input: unknown): RuneEvent {
  const value = typeof input === 'string' ? readJson(input) : input;
  if (!isRecord(value)) {
    return invalidEvent();
  }
  switch (value['type']) {
    case 'chat':
      return parseChat(value);
    case 'skill':
      return parseSkill(value);
    case 'location':
      return parseLocation(value);
    case 'idle':
      return { type: 'idle' };
    default:
      return invalidEvent();
  }
}

export function encodeRuneAction(action: RuneAction): string {
  switch (action.type) {
    case 'say':
      if (!isBoundedString(action.text, 1, 80)) {
        throw new Error('rune say is invalid');
      }
      return JSON.stringify(action);
    case 'walk':
      if (!isBoundedInteger(action.x, 0, MAX_TILE) || !isBoundedInteger(action.y, 0, MAX_TILE)) {
        throw new Error('rune walk is invalid');
      }
      return JSON.stringify(action);
    case 'examine':
      if (!isBoundedString(action.target, 1, 40)) {
        throw new Error('rune examine is invalid');
      }
      return JSON.stringify(action);
  }
}

function isLoopbackPort(portText: string): boolean {
  const port = Number(portText);
  return Number.isInteger(port) && port >= 1 && port <= MAX_PORT;
}

export function assertRuneSocket(url: string): string {
  const match = LOOPBACK_SOCKET.exec(url);
  const portText = match?.[1];
  if (match === null || portText === undefined || !isLoopbackPort(portText)) {
    throw new Error('rune socket must be loopback');
  }
  return url;
}

export function bindRuneLink(
  url: string,
  socket: RuneSocket,
  onEvent: (event: RuneEvent) => void,
): { act(action: RuneAction): void; receive(raw: string): void; close(): void } {
  assertRuneSocket(url);
  return {
    act(action: RuneAction): void {
      socket.send(encodeRuneAction(action));
    },
    receive(raw: string): void {
      const event = parseRuneEvent(raw);
      onEvent(event);
    },
    close(): void {
      socket.close();
    },
  };
}
