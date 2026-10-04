import { constants } from 'node:fs';
import { lstat, open, readdir, realpath, rename, stat, unlink } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';
import { abortable, SYMindXError, throwIfAborted } from './errors.js';
import { childEnvironment, displayText, redactOutput } from './agent-security.js';
import type { JsonSchema, JsonValue, ToolContext, ToolDefinition } from './types.js';

export type WorkspaceActionRequest =
  | { kind: 'write'; path: string; before: string | null; after: string }
  | { kind: 'command'; command: string; args: string[]; cwd: string };

export interface WorkspaceToolsOptions {
  root: string;
  approve?: (request: WorkspaceActionRequest, signal?: AbortSignal) => Promise<boolean>;
  onProgress?: (text: string) => void;
  secretEnvNames?: string[];
}

export const WORKSPACE_TOOL_NAMES = [
  'workspace_list',
  'workspace_read',
  'workspace_search',
  'workspace_write',
  'workspace_run',
] as const;

const MAX_FILE_BYTES = 256 * 1024;
const MAX_WRITE_BYTES = 64 * 1024;
const MAX_SCAN_FILES = 500;
const MAX_MATCHES = 50;
const MAX_RESULT_JSON_CHARS = 7_500;
const MAX_RUN_MS = 45_000;
const MAX_OUTPUT_CHARS = 2_800;
const MAX_CAPTURE_CHARS = 128 * 1024;

class WorkspacePolicyError extends SYMindXError {
  constructor(message: string) {
    super('POLICY', message);
  }
}

function fail(code: ConstructorParameters<typeof SYMindXError>[0], message: string): never {
  throw new SYMindXError(code, message);
}

function boundedResult(value: JsonValue): JsonValue {
  const serialized = JSON.stringify(value);
  if (serialized.length <= MAX_RESULT_JSON_CHARS) return value;
  return {
    truncated: true,
    preview: serialized.slice(0, 3000),
    notice: 'Output was shortened to fit the workspace tool result limit.',
  };
}

function inputRecord(value: JsonValue): Record<string, JsonValue> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    fail('VALIDATION', 'Tool input must be an object');
  return value;
}

function stringField(
  value: Record<string, JsonValue>,
  name: string,
  required = true,
): string | undefined {
  const field = value[name];
  if (field === undefined && !required) return undefined;
  if (typeof field !== 'string') fail('VALIDATION', 'Tool input ' + name + ' must be a string');
  return field;
}

function booleanField(value: Record<string, JsonValue>, name: string, fallback: boolean): boolean {
  const field = value[name];
  if (field === undefined) return fallback;
  if (typeof field !== 'boolean') fail('VALIDATION', 'Tool input ' + name + ' must be a boolean');
  return field;
}

function integerField(
  value: Record<string, JsonValue>,
  name: string,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const field = value[name];
  if (field === undefined) return fallback;
  if (typeof field !== 'number' || !Number.isInteger(field) || field < minimum || field > maximum)
    fail('VALIDATION', 'Tool input ' + name + ' is invalid');
  return field;
}

function isWithin(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return (
    relative === '' ||
    (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative))
  );
}

const BINARY_EXTENSIONS = new Set([
  '.7z',
  '.avi',
  '.bin',
  '.class',
  '.db',
  '.dll',
  '.dylib',
  '.exe',
  '.gif',
  '.gz',
  '.ico',
  '.jar',
  '.jpeg',
  '.jpg',
  '.mp3',
  '.mp4',
  '.pdf',
  '.png',
  '.so',
  '.sqlite',
  '.tar',
  '.ttf',
  '.wasm',
  '.wav',
  '.webp',
  '.woff',
  '.woff2',
  '.zip',
]);
function isBinaryPath(relativePath: string): boolean {
  return BINARY_EXTENSIONS.has(path.extname(relativePath).toLowerCase());
}

function isSecretPath(relativePath: string): boolean {
  return relativePath.split(path.sep).some((segment) => {
    const name = segment.toLowerCase();
    return (
      name === '.git' ||
      name === '.ssh' ||
      name === '.aws' ||
      relativePath.toLowerCase().replaceAll(path.sep, '/').includes('/.config/gcloud') ||
      relativePath.toLowerCase().startsWith('.config/gcloud') ||
      name === '.env' ||
      name.startsWith('.env.') ||
      name === '.npmrc' ||
      name === '.pypirc' ||
      name === '.netrc' ||
      name === 'credentials' ||
      name.includes('.credentials') ||
      name.includes('.secret') ||
      /^id_(rsa|dsa|ecdsa|ed25519)(\.pub)?$/.test(name) ||
      /\.(pem|key|p12|pfx|keystore)$/.test(name)
    );
  });
}

function isBlockedWorkspaceTree(relativePath: string): boolean {
  const blocked = new Set(['node_modules', 'dist', 'build', 'coverage', '.next', '.cache']);
  return relativePath.split(path.sep).some((segment) => blocked.has(segment.toLowerCase()));
}

function normalizeRelativePath(input: string, allowRoot: boolean): string {
  if (input.length > 2_048 || input.includes('\0')) fail('VALIDATION', 'Invalid workspace path');
  const normalized = input.split(String.fromCharCode(92)).join('/');
  if (normalized.startsWith('/') || /^[a-zA-Z]:/.test(normalized) || normalized.startsWith('//'))
    fail('POLICY', 'Workspace paths must be relative');
  const segments = normalized.split('/').filter((segment) => segment !== '' && segment !== '.');
  if (segments.some((segment) => segment === '..'))
    fail('POLICY', 'Workspace path traversal is not allowed');
  const relative = segments.join(path.sep);
  if (!relative && !allowRoot) fail('VALIDATION', 'A workspace file path is required');
  if (isSecretPath(relative)) fail('POLICY', 'This workspace path is not accessible');
  if (isBlockedWorkspaceTree(relative))
    fail('POLICY', 'Dependency and generated build paths are not accessible');
  return relative;
}

async function ensureNoSymlinkPath(
  root: string,
  relativePath: string,
  allowMissingFinal: boolean,
): Promise<string> {
  const target = path.resolve(root, relativePath);
  if (!isWithin(root, target)) fail('POLICY', 'Workspace path escapes the configured root');
  const segments = relativePath ? relativePath.split(path.sep) : [];
  let current = root;
  for (let index = 0; index < segments.length; index++) {
    current = path.join(current, segments[index]!);
    try {
      const details = await lstat(current);
      if (details.isSymbolicLink()) fail('POLICY', 'Symbolic links are not accessible');
      if (index < segments.length - 1 && !details.isDirectory())
        fail('VALIDATION', 'Workspace path parent is not a directory');
    } catch (error) {
      if (
        allowMissingFinal &&
        index === segments.length - 1 &&
        (error as NodeJS.ErrnoException).code === 'ENOENT'
      )
        return target;
      throw error;
    }
  }
  try {
    const canonical = await realpath(target);
    if (!isWithin(root, canonical))
      fail('POLICY', 'Workspace path resolves outside the configured root');
  } catch (error) {
    if (!(allowMissingFinal && (error as NodeJS.ErrnoException).code === 'ENOENT')) throw error;
  }
  return target;
}

async function readUtf8File(
  root: string,
  relativePath: string,
): Promise<{ text: string; bytes: number; sha256: string }> {
  if (isBinaryPath(relativePath)) fail('VALIDATION', 'Binary files are not accessible');
  const fullPath = await ensureNoSymlinkPath(root, relativePath, false);
  const handle = await open(fullPath, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const details = await handle.stat();
    if (!details.isFile()) fail('VALIDATION', 'Workspace path is not a regular file');
    if (details.size > MAX_FILE_BYTES) fail('VALIDATION', 'Workspace files are limited to 256 KiB');
    const buffer = Buffer.alloc(MAX_FILE_BYTES + 1);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    if (bytesRead > MAX_FILE_BYTES) fail('VALIDATION', 'Workspace files are limited to 256 KiB');
    const bytes = buffer.subarray(0, bytesRead);
    if (bytes.includes(0)) fail('VALIDATION', 'Binary files are not accessible');
    let text: string;
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
      fail('VALIDATION', 'Workspace file is not valid UTF-8');
    }
    return {
      text,
      bytes: bytesRead,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    };
  } finally {
    await handle.close();
  }
}

async function approveAction(
  approve: WorkspaceToolsOptions['approve'],
  request: WorkspaceActionRequest,
  signal: AbortSignal,
): Promise<void> {
  throwIfAborted(signal);
  if (!approve) throw new WorkspacePolicyError('Workspace action was not approved');
  const approved = await abortable(approve(request, signal), signal);
  throwIfAborted(signal);
  if (!approved) throw new WorkspacePolicyError('Workspace action was not approved');
}

function toolDefinition(
  name: string,
  description: string,
  inputSchema: JsonSchema,
  effect: ToolDefinition['effect'],
  execute: ToolDefinition['execute'],
): ToolDefinition {
  return { name, description, inputSchema, effect, execute };
}

const pathProperty: JsonSchema = { type: 'string', minLength: 1, maxLength: 2_048 };
const listSchema: JsonSchema = {
  type: 'object',
  properties: {
    path: { type: 'string', maxLength: 2_048 },
    recursive: { type: 'boolean' },
  },
  additionalProperties: false,
};
const readSchema: JsonSchema = {
  type: 'object',
  properties: {
    path: pathProperty,
    startLine: { type: 'integer', minimum: 1, maximum: 1_000_000 },
    endLine: { type: 'integer', minimum: 1, maximum: 1_000_000 },
    startColumn: { type: 'integer', minimum: 1, maximum: 1_000_000 },
  },
  required: ['path'],
  additionalProperties: false,
};
const searchSchema: JsonSchema = {
  type: 'object',
  properties: {
    query: { type: 'string', minLength: 1, maxLength: 512 },
    path: { type: 'string', maxLength: 2_048 },
    caseSensitive: { type: 'boolean' },
  },
  required: ['query'],
  additionalProperties: false,
};
const writeSchema: JsonSchema = {
  type: 'object',
  properties: {
    path: pathProperty,
    content: { type: 'string', maxLength: MAX_WRITE_BYTES },
    expectedSha256: { type: 'string', minLength: 64, maxLength: 64 },
  },
  required: ['path', 'content'],
  additionalProperties: false,
};
const runSchema: JsonSchema = {
  type: 'object',
  properties: {
    command: { type: 'string', minLength: 1, maxLength: 1_024 },
    args: { type: 'array', items: { type: 'string', maxLength: 4_096 }, maxItems: 64 },
    cwd: { type: 'string', maxLength: 2_048 },
  },
  required: ['command', 'args'],
  additionalProperties: false,
};

export async function createWorkspaceTools(
  options: WorkspaceToolsOptions,
): Promise<ToolDefinition[]> {
  if (typeof options.root !== 'string' || !options.root)
    fail('CONFIGURATION', 'Workspace root is required');
  let root: string;
  try {
    root = await realpath(options.root);
    if (!(await stat(root)).isDirectory())
      fail('CONFIGURATION', 'Workspace root must be a directory');
  } catch (error) {
    if (error instanceof SYMindXError) throw error;
    throw new SYMindXError('CONFIGURATION', 'Workspace root must be an existing directory', {
      cause: error,
    });
  }

  const listTool = toolDefinition(
    'workspace_list',
    'List safe workspace files and directories. Secret paths, .git, dependency/build/cache trees, and symlinks are skipped.',
    listSchema,
    'read',
    async (args) => {
      const input = inputRecord(args);
      const relative = normalizeRelativePath(stringField(input, 'path', false) ?? '', true);
      const recursive = booleanField(input, 'recursive', false);
      const start = await ensureNoSymlinkPath(root, relative, false);
      const startDetails = await stat(start);
      if (!startDetails.isDirectory())
        fail('VALIDATION', 'Workspace list path must be a directory');
      const entries: JsonValue[] = [];
      let scanned = 0;
      let truncated = false;
      const visit = async (directory: string, relativeDirectory: string): Promise<void> => {
        if (scanned >= MAX_SCAN_FILES || entries.length >= 80) {
          truncated = true;
          return;
        }
        const names = (await readdir(directory)).sort((a, b) => a.localeCompare(b));
        for (const name of names) {
          if (scanned >= MAX_SCAN_FILES || entries.length >= 80) {
            truncated = true;
            break;
          }
          const rel = relativeDirectory ? path.join(relativeDirectory, name) : name;
          if (isSecretPath(rel) || isBlockedWorkspaceTree(rel)) continue;
          scanned++;
          const full = path.join(directory, name);
          const details = await lstat(full);
          if (details.isSymbolicLink()) continue;
          if (details.isFile() && isBinaryPath(rel)) continue;
          if (details.isDirectory() || details.isFile()) {
            entries.push({
              path: rel.split(path.sep).join('/'),
              type: details.isDirectory() ? 'directory' : 'file',
            });
            if (recursive && details.isDirectory()) await visit(full, rel);
          }
        }
      };
      await visit(start, relative);
      return boundedResult({ entries, scanned, truncated });
    },
  );

  const readTool = toolDefinition(
    'workspace_read',
    'Read a UTF-8 text file by line range. Returns the full-file SHA-256 for safe edits; use startLine/endLine to page through bounded content.',
    readSchema,
    'read',
    async (args, context: ToolContext) => {
      throwIfAborted(context.signal);
      const input = inputRecord(args);
      const relative = normalizeRelativePath(stringField(input, 'path')!, false);
      const file = await readUtf8File(root, relative);
      const lines = file.text.split(/\r?\n/);
      const startLine = integerField(input, 'startLine', 1, 1, 1_000_000);
      const endLine = integerField(input, 'endLine', startLine + 199, startLine, 1_000_000);
      const startColumn = integerField(input, 'startColumn', 1, 1, 1_000_000);
      let content = '';
      let actualEnd = startLine - 1;
      let nextStartLine: number | null = null;
      let nextStartColumn: number | null = null;
      for (let index = startLine - 1; index < Math.min(lines.length, endLine); index++) {
        const column = index === startLine - 1 ? startColumn : 1;
        const line = lines[index]!;
        const remaining = 4_500 - content.length;
        const piece = line.slice(column - 1);
        if (piece.length > remaining) {
          content += piece.slice(0, remaining);
          actualEnd = index + 1;
          nextStartLine = index + 1;
          nextStartColumn = column + remaining;
          break;
        }
        content += piece + (index < lines.length - 1 ? '\n' : '');
        actualEnd = index + 1;
        if (content.length >= 4_500 && actualEnd < Math.min(lines.length, endLine)) {
          nextStartLine = actualEnd + 1;
          nextStartColumn = 1;
          break;
        }
      }
      if (nextStartLine === null && actualEnd < Math.min(lines.length, endLine)) {
        nextStartLine = actualEnd + 1;
        nextStartColumn = 1;
      }
      return boundedResult({
        path: relative.split(path.sep).join('/'),
        sha256: file.sha256,
        bytes: file.bytes,
        totalLines: lines.length,
        startLine,
        startColumn,
        endLine: actualEnd,
        nextStartLine,
        nextStartColumn,
        content: redactOutput(content, options.secretEnvNames),
      });
    },
  );

  const searchTool = toolDefinition(
    'workspace_search',
    'Search safe UTF-8 text files for a literal substring, skipping secret paths and dependency/build/cache trees. Scans at most 500 files and returns at most 50 bounded matches.',
    searchSchema,
    'read',
    async (args, context: ToolContext) => {
      throwIfAborted(context.signal);
      const input = inputRecord(args);
      const query = stringField(input, 'query')!;
      const relative = normalizeRelativePath(stringField(input, 'path', false) ?? '', true);
      const caseSensitive = booleanField(input, 'caseSensitive', false);
      const start = await ensureNoSymlinkPath(root, relative, false);
      if (!(await stat(start)).isDirectory())
        fail('VALIDATION', 'Workspace search path must be a directory');
      const needle = caseSensitive ? query : query.toLocaleLowerCase();
      const matches: JsonValue[] = [];
      let scanned = 0;
      let truncated = false;
      const visit = async (directory: string, relativeDirectory: string): Promise<void> => {
        if (scanned >= MAX_SCAN_FILES || matches.length >= MAX_MATCHES) {
          truncated = true;
          return;
        }
        const names = (await readdir(directory)).sort((a, b) => a.localeCompare(b));
        for (const name of names) {
          if (scanned >= MAX_SCAN_FILES || matches.length >= MAX_MATCHES) {
            truncated = true;
            break;
          }
          const rel = relativeDirectory ? path.join(relativeDirectory, name) : name;
          if (isSecretPath(rel) || isBlockedWorkspaceTree(rel)) continue;
          const full = path.join(directory, name);
          const details = await lstat(full);
          if (details.isSymbolicLink()) continue;
          if (details.isDirectory()) {
            await visit(full, rel);
          } else if (details.isFile()) {
            scanned++;
            if (details.size > MAX_FILE_BYTES) continue;
            let file: { text: string; bytes: number; sha256: string };
            try {
              file = await readUtf8File(root, rel);
            } catch (error) {
              if (error instanceof SYMindXError && error.code === 'VALIDATION') continue;
              throw error;
            }
            const lines = file.text.split(/\r?\n/);
            for (let index = 0; index < lines.length && matches.length < MAX_MATCHES; index++) {
              const line = lines[index]!;
              const searchable = caseSensitive ? line : line.toLocaleLowerCase();
              if (searchable.includes(needle)) {
                matches.push({
                  path: rel.split(path.sep).join('/'),
                  line: index + 1,
                  text: redactOutput(line.slice(0, 100), options.secretEnvNames),
                });
              }
            }
          }
        }
      };
      await visit(start, relative);
      return boundedResult({ matches, scanned, truncated });
    },
  );

  const writeTool = toolDefinition(
    'workspace_write',
    'Write UTF-8 text inside the workspace after explicit per-action approval. Existing files require expectedSha256 from workspace_read; approval preview is rechecked before replacement.',
    writeSchema,
    'write',
    async (args, context: ToolContext) => {
      throwIfAborted(context.signal);
      const input = inputRecord(args);
      const relative = normalizeRelativePath(stringField(input, 'path')!, false);
      const content = stringField(input, 'content')!;
      if (Buffer.byteLength(content, 'utf8') > MAX_WRITE_BYTES)
        fail('VALIDATION', 'Workspace writes are limited to 64 KiB');
      const full = await ensureNoSymlinkPath(root, relative, true);
      const expectedSha256 = stringField(input, 'expectedSha256', false);
      let before: string | null = null;
      let beforeSha256: string | null = null;
      try {
        const current = await readUtf8File(root, relative);
        before = current.text;
        beforeSha256 = current.sha256;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
      if (before !== null) {
        if (!expectedSha256 || !/^[a-f0-9]{64}$/i.test(expectedSha256))
          fail('CONFLICT', 'Existing files require the current expectedSha256 value');
        if (expectedSha256.toLowerCase() !== beforeSha256)
          fail('CONFLICT', 'Workspace file changed; reread it before writing');
      } else if (expectedSha256 !== undefined) {
        fail('CONFLICT', 'expectedSha256 was supplied for a new file');
      }
      await approveAction(
        options.approve,
        {
          kind: 'write',
          path: relative.split(path.sep).join('/'),
          before,
          after: content,
        },
        context.signal,
      );
      throwIfAborted(context.signal);
      await ensureNoSymlinkPath(root, relative, true);
      let currentSha256: string | null = null;
      try {
        currentSha256 = (await readUtf8File(root, relative)).sha256;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
      if (currentSha256 !== beforeSha256)
        fail('CONFLICT', 'Workspace file changed during approval');
      if (before === null) {
        const targetHandle = await open(full, 'wx', 0o600);
        try {
          await targetHandle.writeFile(content, { encoding: 'utf8' });
          await targetHandle.sync();
        } finally {
          await targetHandle.close();
        }
      } else {
        const tempPath = path.join(path.dirname(full), '.symindx-write-' + randomUUID() + '.tmp');
        let tempCreated = false;
        try {
          const tempHandle = await open(tempPath, 'wx', 0o600);
          tempCreated = true;
          try {
            await tempHandle.writeFile(content, { encoding: 'utf8' });
            await tempHandle.sync();
          } finally {
            await tempHandle.close();
          }
          await ensureNoSymlinkPath(root, relative, false);
          const finalFile = await readUtf8File(root, relative);
          if (finalFile.sha256 !== beforeSha256)
            fail('CONFLICT', 'Workspace file changed during write');
          await rename(tempPath, full);
          tempCreated = false;
        } finally {
          if (tempCreated) {
            try {
              await unlink(tempPath);
            } catch {
              // Cleanup is best effort if the filesystem already removed the temporary file.
            }
          }
        }
      }
      return boundedResult({
        path: relative.split(path.sep).join('/'),
        sha256: createHash('sha256').update(content, 'utf8').digest('hex'),
        bytes: Buffer.byteLength(content, 'utf8'),
        created: before === null,
      });
    },
  );

  const runTool = toolDefinition(
    'workspace_run',
    'Run an explicitly approved executable with an argument array (shell disabled) and a workspace-relative cwd. Commands are trusted and are not confined or sandboxed to the workspace root.',
    runSchema,
    'write',
    async (args, context: ToolContext) => {
      throwIfAborted(context.signal);
      const input = inputRecord(args);
      const command = stringField(input, 'command')!;
      const rawArgs = input['args'];
      if (
        !Array.isArray(rawArgs) ||
        rawArgs.length > 64 ||
        rawArgs.some((item) => typeof item !== 'string')
      )
        fail('VALIDATION', 'Command args must be an array of at most 64 strings');
      const commandArgs = rawArgs as string[];
      if (
        commandArgs.some((arg) => arg.length > 4_096) ||
        Buffer.byteLength(command + commandArgs.join(''), 'utf8') > 16_000
      )
        fail('VALIDATION', 'Command and arguments exceed the supported size');
      const cwdRelative = normalizeRelativePath(stringField(input, 'cwd', false) ?? '', true);
      const cwd = await ensureNoSymlinkPath(root, cwdRelative, false);
      if (!(await stat(cwd)).isDirectory()) fail('VALIDATION', 'Command cwd must be a directory');
      await approveAction(
        options.approve,
        {
          kind: 'command',
          command,
          args: [...commandArgs],
          cwd: cwdRelative.split(path.sep).join('/') || '.',
        },
        context.signal,
      );
      throwIfAborted(context.signal);
      await ensureNoSymlinkPath(root, cwdRelative, false);

      // Bun.spawn launches the executable directly from argv without invoking a shell.
      const child = Bun.spawn([command, ...commandArgs], {
        cwd,
        env: childEnvironment(),
        stdout: 'pipe',
        stderr: 'pipe',
      });
      const stdoutStream = child.stdout;
      const stderrStream = child.stderr;
      if (!stdoutStream || !stderrStream) {
        child.kill('SIGTERM');
        fail('TOOL', 'Command output pipes could not be opened');
      }
      let stdout = '';
      let stderr = '';
      let stopReason: 'timeout' | 'abort' | undefined;
      let waitedForStop = false;
      const readers: ReadableStreamDefaultReader<Uint8Array>[] = [];
      let resolveStopped: (() => void) | undefined;
      const stopped = new Promise<void>((resolve) => {
        resolveStopped = resolve;
      });
      const reportProgress = (message: string): void => {
        try {
          options.onProgress?.(message);
        } catch {
          /* Progress is observational. */
        }
      };
      reportProgress('Workspace command started');
      let killTimer: ReturnType<typeof setTimeout> | undefined;
      const terminate = (reason: 'timeout' | 'abort'): void => {
        if (stopReason) return;
        stopReason = reason;
        resolveStopped?.();
        for (const reader of readers) void reader.cancel().catch(() => undefined);
        try {
          child.kill('SIGTERM');
        } catch {
          // The child may have exited between the signal and kill call.
        }
        killTimer = setTimeout(() => {
          try {
            child.kill('SIGKILL');
          } catch {
            // The child may have exited during the grace period.
          }
        }, 1_000);
      };
      const abortListener = (): void => terminate('abort');
      context.signal.addEventListener('abort', abortListener, { once: true });
      const timeout = setTimeout(() => terminate('timeout'), MAX_RUN_MS);
      let stdoutTruncated = false;
      let stderrTruncated = false;
      const capture = async (stream: ReadableStream<Uint8Array>, label: string): Promise<void> => {
        const reader = stream.getReader();
        readers.push(reader);
        const decoder = new TextDecoder();
        let stored = '';
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const decoded = decoder.decode(value, { stream: true });
            const remaining = Math.max(0, MAX_CAPTURE_CHARS - stored.length);
            stored += decoded.slice(0, remaining);
            if (decoded.length > remaining) {
              if (label === 'stdout') stdoutTruncated = true;
              else stderrTruncated = true;
            }
          }
          stored += decoder.decode();
        } finally {
          reader.releaseLock();
        }
        if (label === 'stdout') stdout = stored;
        else stderr = stored;
      };
      try {
        const completed = Promise.all([
          capture(stdoutStream, 'stdout'),
          capture(stderrStream, 'stderr'),
        ]).then(() => child.exited);
        const outcome = await Promise.race([
          completed.then((exitCode) => ({ kind: 'completed' as const, exitCode })),
          stopped.then(() => ({ kind: 'stopped' as const })),
        ]);
        if (outcome.kind === 'stopped') {
          await Promise.race([child.exited, new Promise((resolve) => setTimeout(resolve, 1_100))]);
          waitedForStop = true;
          if (stopReason === 'abort' || context.signal.aborted)
            throw new SYMindXError('ABORTED', 'Workspace command was cancelled');
          throw new SYMindXError('TIMEOUT', 'Workspace command exceeded 45 seconds');
        }
        const exitCode = outcome.exitCode;
        reportProgress('Workspace command finished with exit code ' + exitCode);
        return boundedResult({
          command,
          args: commandArgs,
          cwd: cwdRelative.split(path.sep).join('/') || '.',
          exitCode,
          stdout: displayText(redactOutput(stdout, options.secretEnvNames)).slice(
            0,
            MAX_OUTPUT_CHARS,
          ),
          stderr: displayText(redactOutput(stderr, options.secretEnvNames)).slice(
            0,
            MAX_OUTPUT_CHARS,
          ),
          outputTruncated:
            stdoutTruncated ||
            stderrTruncated ||
            stdout.length > MAX_OUTPUT_CHARS ||
            stderr.length > MAX_OUTPUT_CHARS,
        });
      } catch (error) {
        terminate(context.signal.aborted ? 'abort' : 'timeout');
        throw error;
      } finally {
        clearTimeout(timeout);
        if (stopReason && !waitedForStop)
          await Promise.race([child.exited, new Promise((resolve) => setTimeout(resolve, 1_100))]);
        if (killTimer) clearTimeout(killTimer);
        context.signal.removeEventListener('abort', abortListener);
      }
    },
  );

  return [listTool, readTool, searchTool, writeTool, runTool];
}
