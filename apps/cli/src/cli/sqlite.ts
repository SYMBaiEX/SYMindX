import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Database } from 'bun:sqlite';
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

export function createSqliteCatalog(root: string): CatalogStore {
  const file = join(root, 'catalog.sqlite');
  const json = join(root, 'catalog.json');
  const db = new Database(file);
  db.exec(`CREATE TABLE IF NOT EXISTS catalog_document (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    body TEXT NOT NULL
  )`);
  return {
    async load(): Promise<Catalog> {
      const row = db.query('SELECT body FROM catalog_document WHERE id = 1').get();
      if (isBody(row)) {
        return parseCatalog(readJson(row.body));
      }
      const imported = await readLegacy(json);
      const catalog = parseCatalog(imported ?? EMPTY_CATALOG);
      write(db, serializeCatalog(catalog));
      return catalog;
    },
    async save(catalog: Catalog): Promise<void> {
      write(db, serializeCatalog(parseCatalog(catalog)));
    },
  };
}

function write(db: Database, body: string): void {
  db.exec('BEGIN IMMEDIATE');
  try {
    db.query('DELETE FROM catalog_document').run();
    db.query('INSERT INTO catalog_document (id, body) VALUES (1, ?)').run(body);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

async function readLegacy(file: string): Promise<unknown> {
  try {
    const raw = await readFile(file, 'utf8');
    return readJson(raw);
  } catch (error) {
    if (isMissing(error)) {
      return undefined;
    }
    throw error;
  }
}

function isBody(value: unknown): value is { body: string } {
  return value !== null && typeof value === 'object' && typeof Reflect.get(value, 'body') === 'string';
}

function readJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('catalog is not valid JSON');
  }
}

function isMissing(error: unknown): boolean {
  return error !== null && typeof error === 'object' && Reflect.get(error, 'code') === 'ENOENT';
}
