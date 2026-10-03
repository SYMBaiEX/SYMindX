import type { Character, EmotionState } from './types.js';
const positive = new Set([
  'thanks',
  'thank',
  'happy',
  'great',
  'good',
  'love',
  'excited',
  'wonderful',
]);
const negative = new Set([
  'sad',
  'angry',
  'bad',
  'hate',
  'upset',
  'frustrated',
  'worried',
  'terrible',
]);
const clamp = (n: number, min: number, max: number): number => Math.max(min, Math.min(max, n));
// An inspectable English word heuristic, not a claim about psychological understanding.
export function updateEmotion(
  previous: EmotionState,
  text: string,
  config: Character['emotion'],
): EmotionState {
  if (!config.enabled) return { valence: 0, arousal: 0 };
  const words = text.toLowerCase().match(/[a-z]+/g) ?? [];
  let score = 0;
  for (const word of words) score += positive.has(word) ? 1 : negative.has(word) ? -1 : 0;
  return {
    valence: clamp(previous.valence * config.decay + clamp(score * 0.1, -0.3, 0.3), -1, 1),
    arousal: clamp(previous.arousal * config.decay + Math.min(Math.abs(score) * 0.08, 0.25), 0, 1),
  };
}
