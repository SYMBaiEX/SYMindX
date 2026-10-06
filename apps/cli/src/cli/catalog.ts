import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  parseCatalog,
  serializeCatalog,
  type Catalog,
  type CatalogStore,
} from '../../../../packages/orchestration/src/index.js';

const EMPTY_CATALOG = {
  schemaVersion: 1,
  sequence: 0,
  agents: [],
  sessions: [],
  rooms: [],
} as const;

export function createFileCatalog(root: string): CatalogStore {
  const file = join(root, 'catalog.json');
  return {
    async load(): Promise<Catalog> {
      try {
        const raw = await readFile(file, 'utf8');
        return parseCatalog(readJson(raw));
      } catch (error) {
        if (isMissing(error)) {
          return parseCatalog(EMPTY_CATALOG);
        }
        throw error;
      }
    },
    async save(catalog: Catalog): Promise<void> {
      const body = serializeCatalog(parseCatalog(catalog));
      await mkdir(root, { recursive: true });
      await writeFile(file, body, 'utf8');
    },
  };
}

function readJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('catalog.json is not valid JSON');
  }
}

function isMissing(error: unknown): boolean {
  return error !== null && typeof error === 'object' && Reflect.get(error, 'code') === 'ENOENT';
}
