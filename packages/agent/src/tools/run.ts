const WORD_COUNT = 'word-count';
const CLOCK = 'clock';
const JSON_KEYS = 'json-keys';

export function runBuiltin(name: string, input: string, now: number): string | undefined {
  if (name === WORD_COUNT) {
    return countWords(input);
  }
  if (name === CLOCK) {
    return readClock(now);
  }
  if (name === JSON_KEYS) {
    return listJsonKeys(input);
  }
  return undefined;
}

function countWords(input: string): string {
  const words = input.trim().split(/\s+/u).filter((word) => word.length > 0);
  return String(words.length);
}

function readClock(now: number): string {
  if (!Number.isFinite(now)) {
    throw new RangeError('now must be finite');
  }
  return new Date(now).toISOString();
}

function listJsonKeys(input: string): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch {
    return 'json-keys expects an object';
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return 'json-keys expects an object';
  }
  return Object.keys(parsed).join(', ');
}
