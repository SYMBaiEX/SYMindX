import { createHash } from 'node:crypto';
import { open, mkdir, realpath, stat, chmod, unlink } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { parseCharacter } from './characters.js';
import { WORKSPACE_TOOL_NAMES } from './workspace-tools.js';
import { SYMindXError } from './errors.js';
import type { Character } from './types.js';

export interface CreateCharacterFileOptions {
  workspaceRoot: string;
  path?: string;
  id?: string;
  name?: string;
  model?: string;
  baseUrl?: string;
  apiKeyEnv?: string;
  offline?: boolean;
}

function requireWorkspaceRoot(workspaceRoot: string): string {
  if (typeof workspaceRoot !== 'string' || !workspaceRoot.trim()) {
    throw new SYMindXError('CONFIGURATION', 'A workspace root is required');
  }
  return resolve(workspaceRoot);
}

/** Resolve an explicit profile path or the workspace-local default profile path. */
export function resolveCharacterPath(workspaceRoot: string, override?: string): string {
  const root = requireWorkspaceRoot(workspaceRoot);
  if (override !== undefined && (!override.trim() || override.includes('\0'))) {
    throw new SYMindXError('CONFIGURATION', 'Character path must be a non-empty path');
  }
  return resolve(root, override ?? join('.symindx', 'character.json'));
}

/**
 * Ensure and return the private state directory for this canonical workspace.
 * Agent databases are isolated under the user's home directory, never beside legacy databases.
 */
export async function ensureAgentStateDirectory(workspaceRoot: string): Promise<string> {
  const requestedRoot = requireWorkspaceRoot(workspaceRoot);
  let canonicalRoot: string;
  try {
    const metadata = await stat(requestedRoot);
    if (!metadata.isDirectory()) {
      throw new SYMindXError('CONFIGURATION', 'Workspace root must be a directory');
    }
    canonicalRoot = await realpath(requestedRoot);
  } catch (error) {
    if (error instanceof SYMindXError) throw error;
    throw new SYMindXError('CONFIGURATION', 'Workspace root must exist and be accessible');
  }

  const key =
    process.platform === 'win32'
      ? canonicalRoot.replaceAll('/', '\\').toLowerCase()
      : canonicalRoot;
  const digest = createHash('sha256').update(key).digest('hex');
  const directory = join(homedir(), '.symindx', 'workspaces', digest);
  try {
    await mkdir(directory, { recursive: true, mode: 0o700 });
    if (process.platform !== 'win32') await chmod(directory, 0o700);
  } catch {
    throw new SYMindXError('CONFIGURATION', 'Could not create the private agent state directory');
  }
  return directory;
}

/** Resolve a caller-selected database or the isolated per-workspace default. */
export async function resolveDatabasePath(
  workspaceRoot: string,
  override?: string,
): Promise<string> {
  if (override !== undefined) {
    if (!override.trim() || override.includes('\0')) {
      throw new SYMindXError('CONFIGURATION', 'Database path must be a non-empty path');
    }
    return isAbsolute(override)
      ? resolve(override)
      : resolve(requireWorkspaceRoot(workspaceRoot), override);
  }
  return join(await ensureAgentStateDirectory(workspaceRoot), 'agents.sqlite');
}

/** Create a valid character file once; existing files are never replaced. */
export async function createCharacterFile(
  options: CreateCharacterFileOptions,
): Promise<{ path: string; character: Character }> {
  const destination = resolveCharacterPath(options.workspaceRoot, options.path);
  const offline = options.offline === true;
  let input: unknown;

  if (offline) {
    input = {
      schemaVersion: 1,
      id: options.id ?? 'workspace-agent',
      name: options.name ?? 'Workspace Demo',
      systemPrompt:
        'You are an offline demonstration assistant. You only repeat the latest user message with an Echo prefix; do not claim to reason, edit files, run commands, or perform other work.',
      provider: { type: 'echo', model: 'echo-v1' },
      tools: [],
      memory: { recentMessages: 20 },
      emotion: { enabled: false, decay: 0.85 },
    };
  } else {
    const model = options.model ?? process.env.SYMINDX_MODEL;
    if (model === undefined || !model.trim()) {
      throw new SYMindXError(
        'CONFIGURATION',
        'Configure a model with --model or SYMINDX_MODEL, or choose --offline',
      );
    }
    const baseUrl = options.baseUrl ?? process.env.SYMINDX_BASE_URL ?? 'https://api.openai.com/v1';
    const apiKeyEnv = options.apiKeyEnv ?? process.env.SYMINDX_API_KEY_ENV ?? 'OPENAI_API_KEY';
    input = {
      schemaVersion: 1,
      id: options.id ?? 'workspace-agent',
      name: options.name ?? 'Workspace Agent',
      systemPrompt:
        'You are a helpful assistant working with the user. Be clear about actions actually completed and never claim that files changed or commands ran unless the corresponding tool reports success.',
      provider: { type: 'openai-compatible', model, baseUrl, apiKeyEnv },
      tools: [...WORKSPACE_TOOL_NAMES],
      memory: { recentMessages: 20 },
      emotion: { enabled: false, decay: 0.85 },
    };
  }

  const character = parseCharacter(input);
  try {
    await mkdir(dirname(destination), { recursive: true, mode: 0o700 });
  } catch {
    throw new SYMindXError('CONFIGURATION', 'Could not create the character profile directory');
  }

  let file;
  try {
    file = await open(destination, 'wx', 0o600);
  } catch (error) {
    if (isAlreadyExists(error)) {
      throw new SYMindXError(
        'CONFLICT',
        'Character profile already exists; refusing to overwrite it',
      );
    }
    throw new SYMindXError('CONFIGURATION', 'Could not create the character profile');
  }

  try {
    await file.writeFile(JSON.stringify(character, null, 2) + '\n', 'utf8');
  } catch {
    await file.close();
    await unlink(destination).catch(() => undefined);
    throw new SYMindXError('CONFIGURATION', 'Could not write the character profile');
  }
  await file.close();
  return { path: destination, character };
}

function isAlreadyExists(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && 'code' in error && error['code'] === 'EEXIST'
  );
}
