export interface Reaction {
  readonly intent: 'answer' | 'ask' | 'act' | 'defer';
  readonly urgency: number;
  readonly note: string;
}

const ACT_WORDS: ReadonlySet<string> = new Set([
  'please',
  'make',
  'build',
  'fix',
  'add',
  'update',
  'run',
  'create',
  'write',
  'delete',
  'send',
  'open',
  'show',
  'explain',
]);

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function firstWord(message: string): string {
  const parts = message.trim().split(/\s+/);
  const word = parts[0];
  return word === undefined ? '' : word.toLowerCase();
}

export function react(message: string, arousal: number): Reaction {
  if (!Number.isFinite(arousal) || arousal < -1 || arousal > 1) {
    throw new RangeError('arousal must be from -1 to 1');
  }
  if (message.trim().length === 0) {
    return { intent: 'defer', urgency: 0, note: 'nothing to answer' };
  }

  const intent = message.includes('?') ? 'ask' : ACT_WORDS.has(firstWord(message)) ? 'act' : 'answer';
  const urgency = round3(
    clamp01((arousal + 1) / 2) * 0.5 + clamp01(Math.min(message.length, 400) / 400) * 0.5,
  );
  return { intent, urgency, note: intent };
}
