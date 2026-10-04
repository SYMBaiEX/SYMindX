export interface VoiceTraits {
  readonly warmth: number;
  readonly directness: number;
  readonly pace: number;
}

export interface VoiceHint {
  readonly warmth: number;
  readonly directness: number;
  readonly pace: number;
  readonly guidance: string;
}

function assertRange(value: number, name: string, min: number, max: number): void {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new RangeError(`${name} must be from ${min} to ${max}`);
  }
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export function express(
  traits: VoiceTraits,
  appraisal: { readonly valence: number; readonly arousal: number; readonly dominance: number },
): VoiceHint {
  assertRange(traits.warmth, 'traits.warmth', 0, 1);
  assertRange(traits.directness, 'traits.directness', 0, 1);
  assertRange(traits.pace, 'traits.pace', 0, 1);
  assertRange(appraisal.valence, 'appraisal.valence', -1, 1);
  assertRange(appraisal.arousal, 'appraisal.arousal', -1, 1);
  assertRange(appraisal.dominance, 'appraisal.dominance', -1, 1);

  const warmth = round3(clamp01(traits.warmth * 0.7 + ((appraisal.valence + 1) / 2) * 0.3));
  const pace = round3(clamp01(traits.pace * 0.7 + ((appraisal.arousal + 1) / 2) * 0.3));
  const directness = round3(
    clamp01(traits.directness * 0.7 + ((appraisal.dominance + 1) / 2) * 0.3),
  );
  const tone = warmth >= 0.6 ? 'warm' : 'reserved';
  const edge = directness >= 0.6 ? 'direct' : 'gentle';
  const tempo = pace >= 0.6 ? 'quick' : 'unhurried';
  const guidance = `Speak in a ${tone}, ${edge}, ${tempo} way as delivery guidance, without claiming a real feeling.`;
  return { warmth, directness, pace, guidance };
}
