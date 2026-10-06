export interface Temperament {
  readonly valence: number;
  readonly arousal: number;
  readonly dominance: number;
}

export interface AppraisalState {
  readonly valence: number;
  readonly arousal: number;
  readonly dominance: number;
  readonly updatedAt: number;
}

export type CueKind =
  | 'user_message'
  | 'goal_progress'
  | 'goal_blocked'
  | 'social'
  | 'silence'
  | 'reflection';

export interface AppraisalCue {
  readonly kind: CueKind;
  readonly intensity: number;
  readonly valence: number;
  readonly at: number;
}

const DECAY_HALF_LIFE_MS = 30_000;
const VALENCE_GAIN = 0.35;
const AROUSAL_GAIN = 0.25;
const DOMINANCE_GAIN = 0.1;
const CUE_KINDS: ReadonlySet<CueKind> = new Set([
  'user_message',
  'goal_progress',
  'goal_blocked',
  'social',
  'silence',
  'reflection',
]);

function assertRange(value: number, name: string, min: number, max: number): void {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new RangeError(`${name} must be from ${min} to ${max}`);
  }
}

function assertFinite(value: number, name: string): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${name} must be finite`);
  }
}

function assertAxes(
  axes: { readonly valence: number; readonly arousal: number; readonly dominance: number },
  prefix: string,
): void {
  assertRange(axes.valence, `${prefix}.valence`, -1, 1);
  assertRange(axes.arousal, `${prefix}.arousal`, -1, 1);
  assertRange(axes.dominance, `${prefix}.dominance`, -1, 1);
}

function assertState(state: AppraisalState): void {
  assertAxes(state, 'state');
  assertFinite(state.updatedAt, 'state.updatedAt');
}

function assertCue(cue: AppraisalCue): void {
  if (!CUE_KINDS.has(cue.kind)) {
    throw new RangeError('cue.kind must be a known appraisal cue');
  }
  assertRange(cue.intensity, 'cue.intensity', 0, 1);
  assertRange(cue.valence, 'cue.valence', -1, 1);
  assertFinite(cue.at, 'cue.at');
}

function clampAxis(value: number): number {
  return Math.min(1, Math.max(-1, value));
}

function decayToward(current: number, baseline: number, retain: number): number {
  return baseline + (current - baseline) * retain;
}

function arousalDelta(kind: CueKind, intensity: number): number {
  if (kind === 'silence') {
    return -intensity * AROUSAL_GAIN;
  }
  return intensity * AROUSAL_GAIN;
}

function dominanceDelta(kind: CueKind, intensity: number): number {
  if (kind === 'goal_progress') {
    return intensity * DOMINANCE_GAIN;
  }
  if (kind === 'goal_blocked') {
    return -intensity * DOMINANCE_GAIN;
  }
  return 0;
}

export function baselineAppraisal(temperament: Temperament, at: number): AppraisalState {
  assertAxes(temperament, 'temperament');
  assertFinite(at, 'at');
  return {
    valence: temperament.valence,
    arousal: temperament.arousal,
    dominance: temperament.dominance,
    updatedAt: at,
  };
}

export function appraisalHalfLife(decay: number): number {
  if (!Number.isFinite(decay) || decay < 0 || decay > 1) {
    throw new RangeError('decay must be from 0 to 1');
  }
  if (decay >= 1) {
    return Number.POSITIVE_INFINITY;
  }
  if (decay <= 0) {
    return 0;
  }
  return DECAY_HALF_LIFE_MS * (Math.log(0.85) / Math.log(decay));
}

export function updateAppraisal(
  state: AppraisalState,
  cue: AppraisalCue,
  temperament: Temperament,
  decay = 0.85,
): AppraisalState {
  assertState(state);
  assertCue(cue);
  assertAxes(temperament, 'temperament');

  const elapsed = Math.max(0, cue.at - state.updatedAt);
  const halfLife = appraisalHalfLife(decay);
  const retain = halfLife === 0 ? 0 : halfLife === Number.POSITIVE_INFINITY ? 1 : 0.5 ** (elapsed / halfLife);
  const valence = decayToward(state.valence, temperament.valence, retain) + cue.valence * cue.intensity * VALENCE_GAIN;
  const arousal = decayToward(state.arousal, temperament.arousal, retain) + arousalDelta(cue.kind, cue.intensity);
  const dominance =
    decayToward(state.dominance, temperament.dominance, retain) + dominanceDelta(cue.kind, cue.intensity);

  return {
    valence: clampAxis(valence),
    arousal: clampAxis(arousal),
    dominance: clampAxis(dominance),
    updatedAt: cue.at,
  };
}

export type RuneTone = 'calm' | 'focused' | 'excited' | 'frustrated';

export function runeTone(state: AppraisalState): RuneTone {
  const label = labelAppraisal(state);
  if (label === 'activated' && state.valence < 0) {
    return 'frustrated';
  }
  if (label === 'activated') {
    return 'excited';
  }
  if (label === 'positive' || state.dominance > 0.2) {
    return 'focused';
  }
  return 'calm';
}

export function labelAppraisal(state: AppraisalState): 'positive' | 'negative' | 'calm' | 'activated' {
  assertState(state);
  if (state.arousal > 0.45) {
    return 'activated';
  }
  if (state.valence > 0.2) {
    return 'positive';
  }
  if (state.valence < -0.2) {
    return 'negative';
  }
  return 'calm';
}
