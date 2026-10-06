import { WorkspaceError } from './error.js';
import { applyReplacement, normalizeRelative } from './path.js';

const READ_LIMIT = 24_000;
const WRITE_LIMIT = 100_000;

export interface WorkspaceEntry {
  readonly path: string;
  readonly kind: 'file' | 'dir';
}

export interface WorkspaceHit {
  readonly path: string;
  readonly line: number;
  readonly text: string;
}

export interface WorkspaceCommand {
  readonly exitCode: number;
  readonly output: string;
}

export interface WorkspaceIO {
  list(relativeDir: string): Promise<readonly WorkspaceEntry[]>;
  read(relativeFile: string): Promise<string>;
  write(relativeFile: string, text: string): Promise<void>;
  exists(relativeFile: string): Promise<boolean>;
  search(query: string): Promise<readonly WorkspaceHit[]>;
  run(command: string, signal: AbortSignal): Promise<WorkspaceCommand>;
}

export interface WorkspacePolicy {
  readonly writes: boolean;
  readonly commands: boolean;
}

export interface WorkspaceEffect {
  readonly text: string;
  readonly changed: readonly string[];
}

export interface WorkspaceTool {
  readonly name: string;
  readonly description: string;
  readonly parameters: {
    readonly type: 'object';
    readonly properties: Readonly<Record<string, { readonly type: 'string' | 'boolean'; readonly description: string }>>;
    readonly required: readonly string[];
  };
}

export function codingPolicy(): WorkspacePolicy {
  return { writes: true, commands: true };
}

export function planPolicy(): WorkspacePolicy {
  return { writes: false, commands: false };
}

export function workspaceTools(policy: WorkspacePolicy): readonly WorkspaceTool[] {
  const tools: WorkspaceTool[] = [
    tool(
      'list',
      'List files and directories at a workspace-relative path. Omit path to list the workspace root.',
      { path: stringProp('Workspace-relative directory. Defaults to the root.') },
      [],
    ),
    tool(
      'read',
      'Read a workspace text file. Large files return the first 24000 characters.',
      { path: stringProp('Workspace-relative file path.') },
      ['path'],
    ),
    tool(
      'search',
      'Find a literal string in workspace text files. Returns path, line number, and line text.',
      { query: stringProp('Literal text to find.') },
      ['query'],
    ),
  ];
  if (policy.writes) {
    tools.push(
      tool(
        'edit',
        'Replace one exact occurrence of old text in a file. Read the file first and include enough context to match once.',
        {
          path: stringProp('Workspace-relative file path.'),
          old: stringProp('Exact text to replace.'),
          next: stringProp('Replacement text. Empty deletes the match.'),
        },
        ['path', 'old', 'next'],
      ),
      tool(
        'write',
        'Create a text file. Set overwrite true to replace an existing file. Prefer edit for small changes.',
        {
          path: stringProp('Workspace-relative file path.'),
          text: stringProp('Full file contents.'),
          overwrite: booleanProp('Replace the file when it already exists.'),
        },
        ['path', 'text'],
      ),
    );
  }
  if (policy.commands) {
    tools.push(
      tool(
        'run',
        'Run one shell command in the workspace directory as the current user.',
        { command: stringProp('Shell command. Working directory is the workspace root.') },
        ['command'],
      ),
    );
  }
  return tools;
}

export async function executeWorkspaceTool(
  name: string,
  args: unknown,
  io: WorkspaceIO,
  policy: WorkspacePolicy,
  signal: AbortSignal,
): Promise<WorkspaceEffect> {
  try {
    if (signal.aborted) {
      throw abortError();
    }
    const record = argumentRecord(args);
    if (name === 'list') {
      const relative = relativePath(record, true);
      return effect(formatList(await io.list(relative)));
    }
    if (name === 'read') {
      return effect(clip(await io.read(relativePath(record, false)), READ_LIMIT));
    }
    if (name === 'search') {
      return effect(formatHits(await io.search(requireQuery(record))));
    }
    if (name === 'edit') {
      requireWrites(policy);
      return await editFile(io, record);
    }
    if (name === 'write') {
      requireWrites(policy);
      return await writeFile(io, record);
    }
    if (name === 'run') {
      if (!policy.commands) {
        throw new WorkspaceError('run is not available in this session');
      }
      const command = requireCommand(record);
      const result = await io.run(command, signal);
      const body = result.output.length > 0 ? clip(result.output, READ_LIMIT) : '';
      return effect(body.length > 0 ? `exit ${result.exitCode}\n${body}` : `exit ${result.exitCode}`);
    }
    throw new WorkspaceError(`unknown tool ${name}`);
  } catch (error) {
    if (isAbort(error)) {
      throw error;
    }
    const message = error instanceof Error ? error.message : 'tool failed';
    return effect(`error: ${message}`);
  }
}

async function editFile(io: WorkspaceIO, record: Record<string, unknown>): Promise<WorkspaceEffect> {
  const relative = relativePath(record, false);
  const oldText = requireText(record, 'old', false);
  const nextText = requireText(record, 'next', true);
  const source = await io.read(relative);
  if (source.length > WRITE_LIMIT) {
    throw new WorkspaceError('file is too large to edit');
  }
  await io.write(relative, applyReplacement(source, oldText, nextText));
  return effect(`edited ${relative}`, [relative]);
}

async function writeFile(io: WorkspaceIO, record: Record<string, unknown>): Promise<WorkspaceEffect> {
  const relative = relativePath(record, false);
  const text = requireText(record, 'text', true);
  if (text.length > WRITE_LIMIT) {
    throw new WorkspaceError('file text must be at most 100000 characters');
  }
  const exists = await io.exists(relative);
  if (exists && record['overwrite'] !== true) {
    throw new WorkspaceError('file exists; pass overwrite true or use edit');
  }
  await io.write(relative, text);
  return effect(exists ? `replaced ${relative}` : `created ${relative}`, [relative]);
}

function effect(text: string, changed: readonly string[] = []): WorkspaceEffect {
  return { text, changed };
}

function relativePath(record: Record<string, unknown>, allowRoot: boolean): string {
  const raw = record['path'];
  if (raw === undefined) {
    if (allowRoot) {
      return '';
    }
    throw new WorkspaceError('path is required');
  }
  if (typeof raw !== 'string') {
    throw new WorkspaceError('path must be a string');
  }
  const relative = normalizeRelative(raw);
  if (!allowRoot && relative.length === 0) {
    throw new WorkspaceError('path must be a file');
  }
  return relative;
}

function requireQuery(record: Record<string, unknown>): string {
  const query = record['query'];
  if (typeof query !== 'string' || query.length < 1 || query.length > 200) {
    throw new WorkspaceError('query must be 1 to 200 characters');
  }
  return query;
}

function requireCommand(record: Record<string, unknown>): string {
  const command = record['command'];
  if (typeof command !== 'string' || command.trim().length < 1 || command.length > 2000 || command.includes('\0')) {
    throw new WorkspaceError('command must be 1 to 2000 characters');
  }
  return command.trim();
}

function requireText(record: Record<string, unknown>, key: string, allowEmpty: boolean): string {
  const value = record[key];
  if (typeof value !== 'string' || (!allowEmpty && value.length === 0)) {
    throw new WorkspaceError(`${key} must be a string`);
  }
  return value;
}

function requireWrites(policy: WorkspacePolicy): void {
  if (!policy.writes) {
    throw new WorkspaceError('writes are not available in this mode');
  }
}

function argumentRecord(value: unknown): Record<string, unknown> {
  let current = value;
  if (typeof current === 'string') {
    try {
      const parsed: unknown = JSON.parse(current);
      current = parsed;
    } catch {
      throw new WorkspaceError('tool arguments must be an object');
    }
  }
  const record = copyRecord(current);
  const nested = record['json'];
  if (
    isRecord(nested) &&
    record['path'] === undefined &&
    record['query'] === undefined &&
    record['command'] === undefined
  ) {
    return copyRecord(nested);
  }
  return record;
}

function copyRecord(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new WorkspaceError('tool arguments must be an object');
  }
  const copy: Record<string, unknown> = {};
  for (const key of Object.keys(value)) {
    copy[key] = Reflect.get(value, key);
  }
  return copy;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function formatList(entries: readonly WorkspaceEntry[]): string {
  if (entries.length === 0) {
    return 'empty';
  }
  return entries.map((entry) => `${entry.kind} ${entry.path}`).join('\n');
}

function formatHits(hits: readonly WorkspaceHit[]): string {
  if (hits.length === 0) {
    return 'no matches';
  }
  return hits.map((hit) => `${hit.path}:${hit.line}: ${hit.text}`).join('\n');
}

function clip(text: string, limit: number): string {
  if (text.length <= limit) {
    return text;
  }
  return `${text.slice(0, limit)}\n[truncated]`;
}

function tool(
  name: string,
  description: string,
  properties: Readonly<Record<string, { readonly type: 'string' | 'boolean'; readonly description: string }>>,
  required: readonly string[],
): WorkspaceTool {
  return {
    name,
    description,
    parameters: { type: 'object', properties, required },
  };
}

function stringProp(description: string): { readonly type: 'string'; readonly description: string } {
  return { type: 'string', description };
}

function booleanProp(description: string): { readonly type: 'boolean'; readonly description: string } {
  return { type: 'boolean', description };
}

function abortError(): Error {
  const error = new Error('aborted');
  error.name = 'AbortError';
  return error;
}

function isAbort(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}
