export type DriveKind = 'reply' | 'reflect' | 'reach_out' | 'rest';

export interface DriveChoice {
  readonly kind: DriveKind;
  readonly score: number;
  readonly reason: string;
}

export interface DriveInput {
  readonly hasInbound: boolean;
  readonly arousal: number;
  readonly valence: number;
  readonly silenceMs: number;
  readonly regard: number;
  readonly trust: number;
  readonly openSteps: number;
}

const REACH_OUT_SILENCE_MS = 60_000;

function assertFiniteRange(value: number, name: string, min: number, max: number): void {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new RangeError(`${name} must be from ${min} to ${max}`);
  }
}

function assertDriveInput(input: DriveInput): void {
  assertFiniteRange(input.arousal, 'arousal', -1, 1);
  assertFiniteRange(input.valence, 'valence', -1, 1);
  if (!Number.isFinite(input.silenceMs) || input.silenceMs < 0) {
    throw new RangeError('silenceMs must be finite and at least 0');
  }
  assertFiniteRange(input.regard, 'regard', -1, 1);
  assertFiniteRange(input.trust, 'trust', 0, 1);
  if (!Number.isInteger(input.openSteps) || input.openSteps < 0) {
    throw new RangeError('openSteps must be an integer >= 0');
  }
}

function scoreReply(input: DriveInput): DriveChoice {
  if (input.hasInbound) {
    return {
      kind: 'reply',
      score: 0.6 + Math.max(0, input.arousal) * 0.3,
      reason: 'someone is waiting',
    };
  }
  return { kind: 'reply', score: 0, reason: 'no inbound' };
}

function scoreReflect(input: DriveInput): DriveChoice {
  if (input.openSteps > 0) {
    return {
      kind: 'reflect',
      score: 0.35 + (1 - Math.max(0, input.arousal)) * 0.2,
      reason: 'open intention',
    };
  }
  return { kind: 'reflect', score: 0.15, reason: 'quiet review' };
}

function scoreReachOut(input: DriveInput): DriveChoice {
  if (
    !input.hasInbound &&
    input.silenceMs > REACH_OUT_SILENCE_MS &&
    input.regard > 0.3 &&
    input.trust > 0.4
  ) {
    return { kind: 'reach_out', score: 0.45, reason: 'relationship is quiet' };
  }
  return { kind: 'reach_out', score: 0, reason: 'no reason to reach out' };
}

function scoreRest(input: DriveInput): DriveChoice {
  if (!input.hasInbound && input.arousal < 0.2) {
    return { kind: 'rest', score: 0.4, reason: 'low activation' };
  }
  return { kind: 'rest', score: 0.05, reason: 'still engaged' };
}

function pickHighest(candidates: readonly [DriveChoice, DriveChoice, DriveChoice, DriveChoice]): DriveChoice {
  const [reply, reflect, reachOut, rest] = candidates;
  let winner = reply;
  if (reflect.score > winner.score) {
    winner = reflect;
  }
  if (reachOut.score > winner.score) {
    winner = reachOut;
  }
  if (rest.score > winner.score) {
    winner = rest;
  }
  return winner;
}

export function selectDrive(input: DriveInput): DriveChoice {
  assertDriveInput(input);
  return pickHighest([scoreReply(input), scoreReflect(input), scoreReachOut(input), scoreRest(input)]);
}
