import { WorkspaceError } from './error.js';

const FORBIDDEN = new Set(['.git', 'node_modules', '.symindx', 'dist', '.cursor']);

export function normalizeRelative(input: string): string {
  const trimmed = input.trim();
  if (trimmed.length === 0 || trimmed === '.') {
    return '';
  }
  if (trimmed.includes('\0')) {
    throw new WorkspaceError('path contains a null byte');
  }
  if (trimmed.startsWith('/') || trimmed.startsWith('\\') || /^[A-Za-z]:/.test(trimmed)) {
    throw new WorkspaceError('path must stay inside the workspace');
  }
  const safe: string[] = [];
  for (const segment of trimmed.split(/[/\\]+/u)) {
    if (segment.length === 0 || segment === '.') {
      continue;
    }
    if (segment === '..') {
      throw new WorkspaceError('path leaves the workspace');
    }
    if (FORBIDDEN.has(segment) || segment === '.env' || segment.startsWith('.env.')) {
      throw new WorkspaceError(`path cannot include ${segment}`);
    }
    safe.push(segment);
  }
  return safe.join('/');
}

export function applyReplacement(source: string, oldText: string, nextText: string): string {
  if (oldText.length === 0) {
    throw new WorkspaceError('edit old text must be non-empty');
  }
  if (oldText.length > 16_000 || nextText.length > 16_000) {
    throw new WorkspaceError('edit text must be at most 16000 characters');
  }
  const start = source.indexOf(oldText);
  if (start < 0) {
    throw new WorkspaceError('edit old text was not found');
  }
  if (source.indexOf(oldText, start + oldText.length) >= 0) {
    throw new WorkspaceError('edit old text matched more than once');
  }
  const next = `${source.slice(0, start)}${nextText}${source.slice(start + oldText.length)}`;
  if (next.length > 100_000) {
    throw new WorkspaceError('edited file would exceed 100000 characters');
  }
  return next;
}
