#!/usr/bin/env bun
import { open } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { defaultDemoCharacter, loadCharacter } from './characters.js';
import { SYMindXError } from './errors.js';
import { SYMindXRuntime } from './runtime.js';
import { createApiServer, validateApiServerOptions } from './server.js';

const VERSION = '0.1.0';
const DEFAULT_DB = './symindx.sqlite';
type ParsedArgs = { flags: Map<string, string>; positionals: string[] };

export async function main(argv: string[] = process.argv.slice(2)): Promise<number> {
  try {
    const [command, ...rest] = argv;
    if (!command || command === 'help' || command === '--help' || command === '-h') {
      printHelp();
      return 0;
    }
    if (command === 'version' || command === '--version' || command === '-v') {
      console.log('symindx runtime ' + VERSION);
      return 0;
    }
    if (command === 'init') return await initCommand(parseArgs(rest, ['out'], []));
    if (command === 'agents') return await agentsCommand(parseArgs(rest, ['db'], []));
    if (command === 'chat')
      return await chatCommand(parseArgs(rest, ['character', 'db', 'agent', 'message'], []));
    if (command === 'serve')
      return await serveCommand(
        parseArgs(rest, ['character', 'db', 'host', 'port', 'token-env'], []),
      );
    console.error('Unknown command: ' + command);
    printHelp();
    return 2;
  } catch (error) {
    console.error(formatCliError(error));
    return 1;
  }
}

function parseArgs(args: string[], allowed: string[], required: string[]): ParsedArgs {
  const flags = new Map<string, string>();
  const positionals: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const item = args[i]!;
    if (!item.startsWith('--')) {
      positionals.push(item);
      continue;
    }
    const key = item.slice(2);
    if (!allowed.includes(key)) throw new SYMindXError('VALIDATION', 'Unknown option: ' + item);
    if (flags.has(key)) throw new SYMindXError('VALIDATION', 'Duplicate option: ' + item);
    const value = args[++i];
    if (value === undefined || value.startsWith('--'))
      throw new SYMindXError('VALIDATION', 'Option ' + item + ' requires a value');
    flags.set(key, value);
  }
  for (const name of required)
    if (!flags.has(name)) throw new SYMindXError('VALIDATION', 'Missing required option --' + name);
  return { flags, positionals };
}

async function initCommand(args: ParsedArgs): Promise<number> {
  if (args.positionals.length > 1)
    throw new SYMindXError('VALIDATION', 'init accepts one output path');
  const destination = args.flags.get('out') ?? args.positionals[0];
  if (!destination)
    throw new SYMindXError('VALIDATION', 'Choose a path with --out <path> or init <path>');
  if (args.flags.has('out') && args.positionals.length)
    throw new SYMindXError('VALIDATION', 'Use either --out or a positional path');
  let file;
  try {
    file = await open(destination, 'wx', 0o600);
  } catch (error) {
    if (isCode(error, 'EEXIST'))
      throw new SYMindXError('CONFLICT', 'Refusing to overwrite existing file: ' + destination);
    throw new SYMindXError('CONFIGURATION', 'Could not create character file at ' + destination);
  }
  try {
    await file.writeFile(JSON.stringify(defaultDemoCharacter, null, 2) + '\n', 'utf8');
  } catch {
    await file.close();
    throw new SYMindXError('CONFIGURATION', 'Could not write character file at ' + destination);
  }
  await file.close();
  console.log('Created character: ' + destination);
  return 0;
}

async function agentsCommand(args: ParsedArgs): Promise<number> {
  if (args.positionals.length)
    throw new SYMindXError('VALIDATION', 'agents does not accept positional arguments');
  const runtime = new SYMindXRuntime({ dbPath: args.flags.get('db') ?? DEFAULT_DB });
  await runtime.start();
  try {
    console.log(JSON.stringify(runtime.listAgents(), null, 2));
  } finally {
    await runtime.stop();
  }
  return 0;
}

async function chatCommand(args: ParsedArgs): Promise<number> {
  if (args.positionals.length)
    throw new SYMindXError('VALIDATION', 'chat does not accept positional arguments');
  const dbPath = args.flags.get('db') ?? DEFAULT_DB;
  const characterPath = args.flags.get('character');
  const character = characterPath ? await loadCharacter(characterPath) : undefined;
  const runtime = new SYMindXRuntime({ dbPath, ...(character ? { characters: [character] } : {}) });
  await runtime.start();
  const abort = new AbortController();
  let interrupted = false;
  let input: ReturnType<typeof createInterface> | undefined;
  const onSignal = () => {
    interrupted = true;
    abort.abort();
    input?.close();
  };
  process.once('SIGINT', onSignal);
  process.once('SIGTERM', onSignal);
  try {
    let agents = runtime.listAgents();
    if (!agents.length && !character) {
      runtime.registerCharacter(defaultDemoCharacter);
      agents = runtime.listAgents();
    }
    const requestedId = args.flags.get('agent');
    const agentId = requestedId ?? character?.id ?? agents[0]?.id;
    if (!agentId || !agents.some((agent) => agent.id === agentId)) {
      throw new SYMindXError(
        'NOT_FOUND',
        'Agent not found. Choose an existing agent with --agent or initialize a character.',
      );
    }
    const oneShot = args.flags.get('message');
    if (oneShot !== undefined) {
      if (!oneShot.trim() || oneShot.length > 16_000)
        throw new SYMindXError('VALIDATION', '--message must be 1 to 16000 characters');
      try {
        const result = await runtime.sendMessage(agentId, oneShot, { signal: abort.signal });
        if (!interrupted) console.log(result.message.content);
      } catch (error) {
        if (!interrupted) throw error;
      }
      return interrupted ? 130 : 0;
    }

    input = createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: Boolean(process.stdin.isTTY),
    });
    input.on('SIGINT', onSignal);
    if (input.terminal) {
      input.setPrompt('You> ');
      input.prompt();
    }
    try {
      for await (const line of input) {
        if (interrupted) break;
        const text = line.trim();
        if (!text) {
          if (input.terminal) input.prompt();
          continue;
        }
        try {
          const result = await runtime.sendMessage(agentId, text, { signal: abort.signal });
          if (!interrupted) console.log(result.message.content);
        } catch (error) {
          if (interrupted) break;
          console.error(formatCliError(error));
        }
        if (input.terminal && !interrupted) input.prompt();
      }
    } finally {
      input.close();
    }
    return interrupted ? 130 : 0;
  } finally {
    process.removeListener('SIGINT', onSignal);
    process.removeListener('SIGTERM', onSignal);
    await runtime.stop();
  }
}

async function serveCommand(args: ParsedArgs): Promise<number> {
  if (args.positionals.length)
    throw new SYMindXError('VALIDATION', 'serve does not accept positional arguments');
  const dbPath = args.flags.get('db') ?? DEFAULT_DB;
  const host = args.flags.get('host') ?? '127.0.0.1';
  const port = parsePort(args.flags.get('port') ?? '8000');
  const envName = args.flags.get('token-env') ?? 'SYMINDX_API_TOKEN';
  if (!/^[A-Z][A-Z0-9_]{0,127}$/.test(envName))
    throw new SYMindXError('VALIDATION', '--token-env must be an environment variable name');
  const token = process.env[envName];
  if (token === undefined)
    throw new SYMindXError(
      'CONFIGURATION',
      envName + ' must be set to a token of at least 32 bytes',
    );
  validateApiServerOptions({ host, port, token });
  const characterPath = args.flags.get('character');
  const character = characterPath ? await loadCharacter(characterPath) : undefined;
  const runtime = new SYMindXRuntime({ dbPath, ...(character ? { characters: [character] } : {}) });
  await runtime.start();
  let server: ReturnType<typeof createApiServer> | undefined;
  let onSignal: (() => void) | undefined;
  let onTerminate: (() => void) | undefined;
  try {
    if (!runtime.listAgents().length && !character) runtime.registerCharacter(defaultDemoCharacter);
    server = createApiServer(runtime, { host, port, token });
    const displayHost = host.includes(':') && !host.startsWith('[') ? '[' + host + ']' : host;
    console.log('SYMindX API listening at http://' + displayHost + ':' + server.port);
    await new Promise<void>((resolve) => {
      onSignal = () => resolve();
      onTerminate = () => resolve();
      process.once('SIGINT', onSignal);
      process.once('SIGTERM', onTerminate);
    });
    return 0;
  } finally {
    if (onSignal) process.removeListener('SIGINT', onSignal);
    if (onTerminate) process.removeListener('SIGTERM', onTerminate);
    try {
      if (server) await server.stop(true);
    } finally {
      await runtime.stop();
    }
  }
}

function parsePort(value: string): number {
  if (!/^\d{1,5}$/.test(value))
    throw new SYMindXError('VALIDATION', '--port must be an integer from 1 to 65535');
  const port = Number(value);
  if (port < 1 || port > 65535)
    throw new SYMindXError('VALIDATION', '--port must be an integer from 1 to 65535');
  return port;
}

function isCode(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === code
  );
}

function formatCliError(error: unknown): string {
  if (error instanceof SYMindXError) return error.message;
  return 'Unexpected error. Inspect local runtime diagnostics for details.';
}

function printHelp(): void {
  console.log(
    [
      'SYMindX Runtime ' + VERSION,
      '',
      'Usage:',
      '  symindx init --out <path>',
      '  symindx chat [--character <path>] [--db <path>] [--agent <id>] [--message <text>]',
      '  symindx agents [--db <path>]',
      '  symindx serve [--character <path>] [--db <path>] [--host 127.0.0.1] [--port 8000] [--token-env SYMINDX_API_TOKEN]',
      '  symindx --help',
      '  symindx --version',
      '',
      'Examples:',
      '  symindx init --out ./character.json',
      '  symindx chat --character ./character.json',
      '  symindx chat --db ./symindx.sqlite --agent demo --message "Hello"',
      '  symindx serve --db ./symindx.sqlite',
    ].join('\n'),
  );
}

if (import.meta.main) {
  main()
    .then((code) => {
      process.exitCode = code;
    })
    .catch(() => {
      console.error('Unexpected CLI failure.');
      process.exitCode = 1;
    });
}
