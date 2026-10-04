import { constants } from 'node:fs';
import { lstat, open } from 'node:fs/promises';
import { resolve } from 'node:path';
import { SYMindXError } from './errors.js';

/** Explicit opt-in only; no interpolation, shell execution or automatic .env discovery. */
export async function loadCliEnvironment(path: string): Promise<void> {
  const destination = resolve(path);
  let handle: Awaited<ReturnType<typeof open>> | undefined;
  try {
    const before = await lstat(destination);
    if (!before.isFile() || before.isSymbolicLink() || before.size > 65536)
      throw new SYMindXError('CONFIGURATION', 'Environment file must be a regular file under64KiB');
    handle = await open(destination, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
    const opened = await handle.stat();
    if (opened.dev !== before.dev || opened.ino !== before.ino || opened.size > 65536)
      throw new SYMindXError('CONFLICT', 'Environment file changed while opening it');
    const raw = await handle.readFile();
    if (raw.length > 65536)
      throw new SYMindXError('CONFIGURATION', 'Environment file is too large');
    const text = new TextDecoder('utf-8', { fatal: true }).decode(raw);
    const values = new Map<string, string>();
    const protectedNames =
      /^(?:PATH|PATHEXT|HOME|USERPROFILE|APPDATA|LOCALAPPDATA|SYSTEMROOT|WINDIR|COMSPEC|CODEX_HOME|NODE_OPTIONS|BUN_OPTIONS|LD_.*|DYLD_.*)$/i;
    for (const [index, line] of text
      .replace(/^\uFEFF/, '')
      .split(/\r?\n/)
      .entries()) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(trimmed);
      if (!match)
        throw new SYMindXError(
          'CONFIGURATION',
          `Invalid environment assignment on line ${index + 1}`,
        );
      const name = match[1]!;
      if (protectedNames.test(name) || values.has(name))
        throw new SYMindXError(
          'CONFIGURATION',
          `Unsupported or duplicate environment name on line ${index + 1}`,
        );
      let value = match[2]!;
      if (value.startsWith('"') || value.startsWith("'")) {
        const quote = value[0]!;
        const end = value.lastIndexOf(quote);
        if (end === 0 || !/^\s*(?:#.*)?$/.test(value.slice(end + 1)))
          throw new SYMindXError(
            'CONFIGURATION',
            `Invalid environment quoting on line ${index + 1}`,
          );
        value = value.slice(1, end);
      } else value = value.replace(/\s+#.*$/, '').trim();
      if (value.includes('\0') || value.length > 8192)
        throw new SYMindXError('CONFIGURATION', `Invalid environment value on line ${index + 1}`);
      values.set(name, value);
    }
    for (const [name, value] of values)
      if (process.env[name] === undefined) process.env[name] = value;
  } catch (error) {
    if (error instanceof SYMindXError) throw error;
    throw new SYMindXError('CONFIGURATION', 'Could not safely read the selected environment file');
  } finally {
    await handle?.close();
  }
}
