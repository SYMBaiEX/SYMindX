import { spawn } from 'node:child_process';
import { lstat, mkdir, readdir, readFile, realpath, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { normalizeRelative, type WorkspaceCommand, type WorkspaceEntry, type WorkspaceHit, type WorkspaceIO } from '../../../../packages/orchestration/src/index.js';

const FILE_LIMIT = 100_000;
const SEARCH_FILES = 400;
const SEARCH_HITS = 30;
const SEARCH_DEPTH = 8;
const OUTPUT_LIMIT = 16_000;
const SKIP = new Set(['.git', 'node_modules', '.symindx', 'dist', '.cursor']);

export function createWorkspaceIO(root: string): WorkspaceIO {
  const rootPath = resolve(root);

  async function locate(relativePath: string): Promise<{ readonly rootReal: string; readonly full: string }> {
    const safe = normalizeRelative(relativePath);
    const rootReal = await realpath(rootPath);
    const full = safe.length === 0 ? rootReal : resolve(rootReal, ...safe.split('/'));
    const rel = relative(rootReal, full);
    if (rel.startsWith('..') || isAbsolute(rel)) {
      throw new Error('path leaves the workspace');
    }
    await assertInside(rootReal, full);
    return { rootReal, full };
  }

  return {
    async list(relativeDir: string): Promise<readonly WorkspaceEntry[]> {
      const { rootReal, full } = await locate(relativeDir);
      const info = await lstat(full);
      if (info.isSymbolicLink()) {
        throw new Error('path is a symlink');
      }
      if (!info.isDirectory()) {
        throw new Error('path is not a directory');
      }
      const entries = await readdir(full, { withFileTypes: true });
      const listed: WorkspaceEntry[] = [];
      for (const entry of entries) {
        if (entry.isSymbolicLink() || SKIP.has(entry.name) || isEnvName(entry.name)) {
          continue;
        }
        const child = relative(rootReal, resolve(full, entry.name)).split(sep).join('/');
        if (entry.isDirectory()) {
          listed.push({ path: child, kind: 'dir' });
        } else if (entry.isFile()) {
          listed.push({ path: child, kind: 'file' });
        }
        if (listed.length === 200) {
          break;
        }
      }
      listed.sort((left, right) => left.path.localeCompare(right.path));
      return listed;
    },

    async read(relativeFile: string): Promise<string> {
      const { full } = await locate(relativeFile);
      return readText(full);
    },

    async write(relativeFile: string, text: string): Promise<void> {
      const { full } = await locate(relativeFile);
      const existing = await lstat(full).catch((error: unknown) => {
        if (isMissing(error)) {
          return undefined;
        }
        throw error;
      });
      if (existing?.isSymbolicLink() === true) {
        throw new Error('path is a symlink');
      }
      if (existing !== undefined && !existing.isFile()) {
        throw new Error('path is not a file');
      }
      await mkdir(dirname(full), { recursive: true });
      await writeFile(full, text, 'utf8');
    },

    async exists(relativeFile: string): Promise<boolean> {
      const { full } = await locate(relativeFile);
      const existing = await lstat(full).catch((error: unknown) => {
        if (isMissing(error)) {
          return undefined;
        }
        throw error;
      });
      return existing !== undefined && existing.isFile() && !existing.isSymbolicLink();
    },

    async search(query: string): Promise<readonly WorkspaceHit[]> {
      const { rootReal } = await locate('');
      const hits: WorkspaceHit[] = [];
      await walk(rootReal, rootReal, query, 0, { files: 0 }, hits);
      return hits;
    },

    async run(command: string, signal: AbortSignal): Promise<WorkspaceCommand> {
      const rootReal = await realpath(rootPath);
      return runCommand(rootReal, command, signal);
    },
  };
}

async function assertInside(rootReal: string, full: string): Promise<void> {
  let current = full;
  for (;;) {
    try {
      const real = await realpath(current);
      const rel = relative(rootReal, real);
      if (rel.startsWith('..') || isAbsolute(rel)) {
        throw new Error('path leaves the workspace');
      }
      return;
    } catch (error) {
      if (!isMissing(error)) {
        throw error;
      }
      const parent = dirname(current);
      if (parent === current) {
        throw new Error('path leaves the workspace');
      }
      current = parent;
    }
  }
}

async function readText(full: string): Promise<string> {
  const info = await lstat(full);
  if (info.isSymbolicLink()) {
    throw new Error('path is a symlink');
  }
  if (!info.isFile()) {
    throw new Error('path is not a file');
  }
  if (info.size > FILE_LIMIT) {
    throw new Error('file is too large');
  }
  const raw = await readFile(full);
  if (raw.includes(0)) {
    throw new Error('file is not text');
  }
  return raw.toString('utf8');
}

async function walk(
  rootReal: string,
  dir: string,
  query: string,
  depth: number,
  seen: { files: number },
  hits: WorkspaceHit[],
): Promise<void> {
  if (depth > SEARCH_DEPTH || seen.files >= SEARCH_FILES || hits.length >= SEARCH_HITS) {
    return;
  }
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (hits.length >= SEARCH_HITS || seen.files >= SEARCH_FILES) {
      return;
    }
    if (entry.isSymbolicLink() || SKIP.has(entry.name) || isEnvName(entry.name)) {
      continue;
    }
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(rootReal, full, query, depth + 1, seen, hits);
      continue;
    }
    if (!entry.isFile()) {
      continue;
    }
    seen.files += 1;
    const info = await lstat(full);
    if (!info.isFile() || info.size > FILE_LIMIT) {
      continue;
    }
    const raw = await readFile(full);
    if (raw.includes(0)) {
      continue;
    }
    const text = raw.toString('utf8');
    const lines = text.split('\n');
    for (let index = 0; index < lines.length && hits.length < SEARCH_HITS; index += 1) {
      const line = lines[index];
      if (line !== undefined && line.includes(query)) {
        hits.push({
          path: relative(rootReal, full).split(sep).join('/'),
          line: index + 1,
          text: line.length > 200 ? `${line.slice(0, 200)}…` : line,
        });
      }
    }
  }
}

function runCommand(root: string, command: string, signal: AbortSignal): Promise<WorkspaceCommand> {
  return new Promise((resolveCommand, reject) => {
    const child = spawn('/bin/sh', ['-c', command], {
      cwd: root,
      signal,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    if (child.stdout === null || child.stderr === null) {
      reject(new Error('command pipes were not available'));
      return;
    }
    let output = '';
    let settled = false;
    const take = (chunk: Uint8Array): void => {
      if (output.length >= OUTPUT_LIMIT) {
        return;
      }
      output += Buffer.from(chunk).toString('utf8');
      if (output.length > OUTPUT_LIMIT) {
        output = `${output.slice(0, OUTPUT_LIMIT)}\n[truncated]`;
      }
    };
    child.stdout.on('data', take);
    child.stderr.on('data', take);
    child.on('error', (error) => {
      if (settled) {
        return;
      }
      settled = true;
      reject(error);
    });
    child.on('close', (code) => {
      if (settled) {
        return;
      }
      settled = true;
      resolveCommand({ exitCode: code ?? 1, output });
    });
  });
}

function isEnvName(name: string): boolean {
  return name === '.env' || name.startsWith('.env.');
}

function isMissing(error: unknown): boolean {
  return error !== null && typeof error === 'object' && Reflect.get(error, 'code') === 'ENOENT';
}
