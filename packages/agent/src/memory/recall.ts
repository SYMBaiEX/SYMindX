import type { Episode } from './store.js';

export function recall(
  episodes: readonly Episode[],
  now: number,
  moodValence: number,
  budgetChars: number,
  limit: number,
): Episode[] {
  if (!Number.isFinite(now)) {
    throw new RangeError('now must be finite');
  }
  if (!Number.isFinite(moodValence) || moodValence < -1 || moodValence > 1) {
    throw new RangeError('moodValence must be from -1 to 1');
  }
  if (!Number.isInteger(budgetChars) || budgetChars < 1 || budgetChars > 48000) {
    throw new RangeError('budgetChars must be an integer from 1 to 48000');
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
    throw new RangeError('limit must be an integer from 1 to 50');
  }

  const ranked = episodes.map((episode, index) => ({ episode, index, score: scoreEpisode(episode, now, moodValence) }));
  ranked.sort((left, right) => right.score - left.score || left.episode.createdAt - right.episode.createdAt || left.index - right.index);

  const chosen: Episode[] = [];
  let used = 0;
  for (const entry of ranked) {
    if (chosen.length >= limit) {
      break;
    }
    if (used + entry.episode.text.length > budgetChars) {
      continue;
    }
    chosen.push(entry.episode);
    used += entry.episode.text.length;
  }
  chosen.sort((left, right) => left.createdAt - right.createdAt);
  return chosen.map((episode) => ({ ...episode }));
}

function scoreEpisode(episode: Episode, now: number, moodValence: number): number {
  const recency = 1 / (1 + Math.max(0, now - episode.createdAt) / 3_600_000);
  const congruence = 1 - Math.abs(moodValence - episode.valence) / 2;
  return episode.salience * recency * (1 + 0.25 * congruence);
}
