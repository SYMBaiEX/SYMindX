export interface ContextSlice {
  readonly label: string;
  readonly text: string;
  readonly priority: number;
}

export interface AssembledContext {
  readonly text: string;
  readonly usedChars: number;
  readonly included: readonly string[];
  readonly dropped: readonly string[];
}

const LABEL_PATTERN = /^[a-z][a-z0-9-]{0,31}$/;
const MAX_TEXT_CHARS = 16_000;
const MAX_BUDGET_CHARS = 48_000;

interface RankedSlice {
  readonly slice: ContextSlice;
  readonly index: number;
}

function assertBudget(budgetChars: number): void {
  if (!Number.isInteger(budgetChars) || budgetChars < 1 || budgetChars > MAX_BUDGET_CHARS) {
    throw new RangeError('budgetChars must be an integer from 1 to 48000');
  }
}

function assertSlice(slice: ContextSlice, index: number, seen: Set<string>): void {
  if (typeof slice.label !== 'string' || !LABEL_PATTERN.test(slice.label) || seen.has(slice.label)) {
    throw new RangeError(`invalid context label at ${index}`);
  }
  seen.add(slice.label);
  if (typeof slice.text !== 'string' || slice.text.length > MAX_TEXT_CHARS || !Number.isFinite(slice.priority)) {
    throw new RangeError(`invalid context slice ${slice.label}`);
  }
}

function assertSlices(slices: readonly ContextSlice[]): void {
  if (!Array.isArray(slices)) {
    throw new RangeError('slices must be an array');
  }
  const seen = new Set<string>();
  for (let index = 0; index < slices.length; index += 1) {
    const slice = slices[index];
    if (slice === undefined) {
      throw new RangeError(`invalid context label at ${index}`);
    }
    assertSlice(slice, index, seen);
  }
}

function compareRank(left: RankedSlice, right: RankedSlice): number {
  if (left.slice.priority < right.slice.priority) {
    return 1;
  }
  if (left.slice.priority > right.slice.priority) {
    return -1;
  }
  return left.index - right.index;
}

export function assemble(slices: readonly ContextSlice[], budgetChars: number): AssembledContext {
  assertBudget(budgetChars);
  assertSlices(slices);

  const ordered = slices.map((slice, index) => ({ slice, index }));
  ordered.sort(compareRank);

  const included: string[] = [];
  const dropped: string[] = [];
  const parts: string[] = [];
  let used = 0;
  let stopped = false;

  for (const entry of ordered) {
    const { label, text } = entry.slice;
    if (stopped || text.length === 0) {
      dropped.push(label);
      continue;
    }
    const separator = parts.length === 0 ? 0 : 2;
    const nextLength = used + separator + text.length;
    if (nextLength > budgetChars) {
      stopped = true;
      dropped.push(label);
      continue;
    }
    parts.push(text);
    included.push(label);
    used = nextLength;
  }

  const text = parts.join('\n\n');
  return { text, usedChars: text.length, included, dropped };
}
