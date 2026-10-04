export type EpisodeSource = 'user' | 'assistant' | 'reflection' | 'system';

export interface Episode {
  readonly id: string;
  readonly text: string;
  readonly createdAt: number;
  readonly salience: number;
  readonly valence: number;
  readonly source: EpisodeSource;
}

export interface MemoryStore {
  remember(episode: Episode): void;
  list(): readonly Episode[];
  size(): number;
}

const SOURCES = new Set<EpisodeSource>(['user', 'assistant', 'reflection', 'system']);

function assertEpisode(episode: Episode): void {
  if (episode.id.trim().length === 0) {
    throw new RangeError('episode id is required');
  }
  if (episode.text.trim().length === 0 || episode.text.length > 4000) {
    throw new RangeError('episode text must be 1 to 4000 characters');
  }
  if (!Number.isFinite(episode.createdAt)) {
    throw new RangeError('episode createdAt must be finite');
  }
  if (!Number.isFinite(episode.salience) || episode.salience < 0 || episode.salience > 1) {
    throw new RangeError('episode salience must be from 0 to 1');
  }
  if (!Number.isFinite(episode.valence) || episode.valence < -1 || episode.valence > 1) {
    throw new RangeError('episode valence must be from -1 to 1');
  }
  if (!SOURCES.has(episode.source)) {
    throw new RangeError('unknown episode source');
  }
}

function evictionScore(episode: Episode): number {
  return episode.salience;
}

export function createMemoryStore(capacity: number): MemoryStore {
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 10000) {
    throw new RangeError('capacity must be an integer from 1 to 10000');
  }
  const episodes: Episode[] = [];
  return {
    remember(episode: Episode): void {
      assertEpisode(episode);
      episodes.push({ ...episode });
      while (episodes.length > capacity) {
        let dropAt = 0;
        for (let index = 1; index < episodes.length; index += 1) {
          const candidate = episodes[index];
          const current = episodes[dropAt];
          if (candidate === undefined || current === undefined) {
            continue;
          }
          if (
            evictionScore(candidate) < evictionScore(current) ||
            (evictionScore(candidate) === evictionScore(current) && candidate.createdAt < current.createdAt)
          ) {
            dropAt = index;
          }
        }
        episodes.splice(dropAt, 1);
      }
    },
    list(): readonly Episode[] {
      return episodes.map((episode) => ({ ...episode }));
    },
    size(): number {
      return episodes.length;
    },
  };
}
