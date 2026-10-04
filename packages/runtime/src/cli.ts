#!/usr/bin/env bun
import { open } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { defaultDemoCharacter, loadCharacter } from './characters.js';
import { SYMindXError } from './errors.js';
import { SYMindXRuntime } from './runtime.js';
import { createApiServer, validateApiServerOptions } from './server.js';
import { resolve } from 'node:path';
import { createCharacterFile, resolveCharacterPath, resolveDatabasePath } from './agent-config.js';
import { openAgentSession } from './agent-session.js';
import { openCodexAgentSession } from './codex-agent.js';
import type {
  AgentReply,
  AgentSession,
  AgentSessionOptions,
  AgentBackend,
  AgentMode,
  ApprovalMode,
} from './agent-types.js';
import { loadCliEnvironment } from './cli-environment.js';
import { parseAgentInvocation, parseBoundedInteger } from './cli-args.js';
import { createCliInput } from './cli-input.js';
import {
  formatActionPreview,
  sanitizeTerminalText,
  writeFinalText,
  writeProgress,
} from './cli-display.js';

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
    if (command === 'agent') {
      if (rest.includes('--help') || rest.includes('-h')) {
        const subcommand = rest.find((item) => !item.startsWith('-'));
        printAgentHelp(subcommand);
        return 0;
      }
      return await agentCommand(rest);
    }
    if (rest.includes('--help') || rest.includes('-h')) {
      printHelp();
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

async function agentCommand(argv: string[]): Promise<number> {
  const invocation = parseAgentInvocation(argv);
  const { command, flags, positionals } = invocation;
  if (flags.has('env-file')) await loadCliEnvironment(flags.get('env-file')!);

  const workspaceRoot = resolve(flags.get('workspace') ?? process.cwd());
  const json = flags.has('json');

  if (command === 'create') {
    if (
      flags.has('offline') &&
      (flags.has('model') || flags.has('base-url') || flags.has('key-env'))
    ) {
      throw new SYMindXError('VALIDATION', '--offline cannot be combined with provider options');
    }
    if (positionals.length) {
      throw new SYMindXError('VALIDATION', 'agent create does not accept positional arguments');
    }
    const created = await createCharacterFile({
      workspaceRoot,
      ...(flags.has('out') ? { path: flags.get('out')! } : {}),
      ...(flags.has('id') ? { id: flags.get('id')! } : {}),
      ...(flags.has('name') ? { name: flags.get('name')! } : {}),
      ...(flags.has('model') ? { model: flags.get('model')! } : {}),
      ...(flags.has('base-url') ? { baseUrl: flags.get('base-url')! } : {}),
      ...(flags.has('key-env') ? { apiKeyEnv: flags.get('key-env')! } : {}),
      offline: flags.has('offline'),
    });
    if (json) {
      console.log(
        JSON.stringify({
          path: created.path,
          character: {
            id: created.character.id,
            name: created.character.name,
            provider: created.character.provider.type,
          },
        }),
      );
    } else {
      console.log('Created character profile: ' + created.path);
    }
    return 0;
  }

  if (flags.has('base-url') || flags.has('key-env') || flags.has('out') || flags.has('offline')) {
    throw new SYMindXError('VALIDATION', 'Create-only options require agent create');
  }

  const backendValue = flags.get('backend') ?? 'codex';
  if (backendValue !== 'api' && backendValue !== 'codex') {
    throw new SYMindXError('VALIDATION', '--backend must be api or codex');
  }
  const backend: AgentBackend = backendValue;
  if (backend === 'codex' && flags.has('db')) {
    throw new SYMindXError('VALIDATION', '--db is only valid with --backend api');
  }
  if (backend === 'codex' && flags.has('max-rounds')) {
    throw new SYMindXError('VALIDATION', '--max-rounds is only valid with --backend api');
  }
  const mode: AgentMode = command === 'code' || command === 'build' ? command : 'chat';
  const approvalValue = flags.get('approval');
  const approvalText = flags.has('yes') ? 'auto' : (approvalValue ?? 'ask');
  if (approvalText !== 'ask' && approvalText !== 'read-only' && approvalText !== 'auto') {
    throw new SYMindXError('VALIDATION', '--approval must be ask, read-only, or auto');
  }
  if (flags.has('yes') && approvalValue !== undefined && approvalValue !== 'auto') {
    throw new SYMindXError(
      'VALIDATION',
      '--yes cannot be combined with a different --approval mode',
    );
  }
  const approvalMode: ApprovalMode = approvalText;
  const maxToolRounds = parseBoundedInteger(flags.get('max-rounds'), 'max-rounds', 1, 32);
  const timeoutSeconds = parseBoundedInteger(flags.get('timeout'), 'timeout', 1, 300);
  const requestedMessage = flags.get('message');
  if (requestedMessage !== undefined && positionals.length) {
    throw new SYMindXError('VALIDATION', 'Use either --message or a positional task');
  }
  if (['list', 'show', 'history'].includes(command) && positionals.length) {
    throw new SYMindXError('VALIDATION', 'agent ' + command + ' does not accept positional tasks');
  }
  const task = requestedMessage ?? (positionals.length ? positionals.join(' ') : undefined);
  if (task !== undefined && (!task.trim() || task.length > 16_000)) {
    throw new SYMindXError('VALIDATION', 'Tasks must be 1 to 16000 characters');
  }
  let currentConversationId = flags.get('session');
  if (
    currentConversationId !== undefined &&
    !/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(currentConversationId)
  ) {
    throw new SYMindXError(
      'VALIDATION',
      '--session must contain 1 to 64 letters, digits, underscores, or hyphens',
    );
  }

  const databasePath = flags.has('db')
    ? await resolveDatabasePath(workspaceRoot, flags.get('db'))
    : backend === 'api'
      ? await resolveDatabasePath(workspaceRoot)
      : undefined;
  const characterPath = flags.has('character')
    ? resolveCharacterPath(workspaceRoot, flags.get('character'))
    : undefined;
  const input = createCliInput();
  const abort = new AbortController();
  let interrupted = false;
  let interruptionCode: 130 | 143 | undefined;
  let session: AgentSession | undefined;
  let currentMode = mode;

  const interrupt = (code: 130 | 143) => {
    if (interruptionCode !== undefined) return;
    interruptionCode = code;
    interrupted = true;
    abort.abort();
    input.close();
  };
  const onInterrupt = () => interrupt(130);
  const onTerminate = () => interrupt(143);
  input.onInterrupt(onInterrupt);
  process.once('SIGINT', onInterrupt);
  process.once('SIGTERM', onTerminate);

  const makeOptions = (): AgentSessionOptions => ({
    workspaceRoot,
    mode: currentMode,
    approvalMode,
    ...(characterPath ? { characterPath } : {}),
    ...(databasePath ? { dbPath: databasePath } : {}),
    ...(flags.has('agent') ? { agentId: flags.get('agent')! } : {}),
    ...(currentConversationId ? { conversationId: currentConversationId } : {}),
    ...(flags.has('model') ? { model: flags.get('model')! } : {}),
    ...(flags.has('codex-path') ? { codexExecutable: flags.get('codex-path')! } : {}),
    ...(maxToolRounds !== undefined ? { maxToolRounds } : {}),
    ...(timeoutSeconds !== undefined ? { requestTimeoutMs: timeoutSeconds * 1000 } : {}),
    onProgress: writeProgress,
    approveAction: async (action, signal) => {
      if (approvalMode === 'auto') return true;
      if (approvalMode === 'read-only' || !input.interactive) {
        writeProgress('Denied effect request because approval is unavailable.');
        return false;
      }
      writeProgress('Requested effect:');
      writeProgress(formatActionPreview(action));
      const answer = await input.question('Approve this action? [y/N] ', true, signal);
      const approved =
        answer?.trim().toLowerCase() === 'y' || answer?.trim().toLowerCase() === 'yes';
      writeProgress(approved ? 'Approved.' : 'Denied.');
      return approved;
    },
  });

  const openSession = async (): Promise<AgentSession> => {
    const options = makeOptions();
    return backend === 'api' ? openAgentSession(options) : openCodexAgentSession(options);
  };

  const reopenSession = async (): Promise<AgentSession> => {
    const previous = session;
    session = undefined;
    await previous?.close();
    return openSession();
  };

  const printHistory = (target: AgentSession) => {
    const history = target.history(100).map((entry) => ({
      role: entry.role,
      content: sanitizeTerminalText(entry.content),
      createdAt: entry.createdAt,
    }));
    if (json) console.log(JSON.stringify(history));
    else if (!history.length) console.log('No messages in this session.');
    else {
      for (const entry of history) {
        console.log('[' + entry.role + '] ' + entry.content);
      }
    }
  };

  const printReply = (reply: AgentReply) => {
    const safeReply = { ...reply, text: sanitizeTerminalText(reply.text) };
    if (json) console.log(JSON.stringify(safeReply));
    else writeFinalText(safeReply.text);
  };

  try {
    session = await openSession();
    if (interrupted) return interruptionCode ?? 130;

    if (command === 'list') {
      const allAgents = session.agents();
      const filterAgent = flags.get('agent');
      const agents = filterAgent
        ? allAgents.filter((agent) => agent.id === filterAgent)
        : allAgents;
      if (filterAgent && !agents.length) {
        throw new SYMindXError('NOT_FOUND', 'Requested agent is not available');
      }
      if (json) console.log(JSON.stringify(agents));
      else if (!agents.length) console.log('No agents are available.');
      else {
        for (const agent of agents) {
          console.log(
            sanitizeTerminalText(agent.id) +
              '\t' +
              sanitizeTerminalText(agent.name) +
              '\t' +
              agent.status +
              '\t' +
              agent.provider,
          );
        }
      }
      return 0;
    }

    if (command === 'show') {
      const description = session.describe();
      const selectedAgent = session.agents().find((agent) => agent.id === description.agentId);
      if (json) console.log(JSON.stringify({ session: description, agent: selectedAgent ?? null }));
      else {
        console.log('Backend: ' + description.backend);
        console.log('Agent: ' + sanitizeTerminalText(description.agentId));
        console.log('Session: ' + sanitizeTerminalText(description.conversationId));
        console.log('Workspace: ' + sanitizeTerminalText(description.workspaceRoot));
        if (description.model) console.log('Model: ' + sanitizeTerminalText(description.model));
        if (selectedAgent) {
          console.log('Name: ' + sanitizeTerminalText(selectedAgent.name));
          console.log('Status: ' + selectedAgent.status);
          console.log('Provider: ' + selectedAgent.provider);
        }
      }
      return 0;
    }

    if (command === 'history') {
      printHistory(session);
      return 0;
    }

    if (task !== undefined) {
      try {
        const reply = await session.send(task, abort.signal);
        if (!interrupted) printReply(reply);
      } catch (error) {
        if (!interrupted) throw error;
      }
      return interrupted ? (interruptionCode ?? 130) : 0;
    }

    if (input.interactive) {
      writeProgress(
        'Connected with ' +
          backend +
          ' backend in ' +
          currentMode +
          ' mode. Type /help for commands.',
      );
    }
    while (!interrupted) {
      const line = await input.question(input.interactive && !json ? 'You> ' : '');
      if (line === null) break;
      const text = line.trim();
      if (!text) continue;
      if (text === '/exit') break;
      if (text === '/help') {
        const helpText = '/help /exit /history /status /clear /mode chat|code|build /session <id>';
        if (json) writeProgress(helpText);
        else console.log(helpText);
        continue;
      }
      if (text === '/history') {
        printHistory(session);
        continue;
      }
      if (text === '/status') {
        const status = session.describe();
        if (json) console.log(JSON.stringify(status));
        else {
          console.log('Backend: ' + status.backend);
          console.log('Agent: ' + sanitizeTerminalText(status.agentId));
          console.log('Session: ' + sanitizeTerminalText(status.conversationId));
          console.log('Mode: ' + currentMode);
        }
        continue;
      }
      if (text === '/clear') {
        currentConversationId = 'session-' + crypto.randomUUID();
        session = await reopenSession();
        if (json)
          console.log(
            JSON.stringify({ event: 'session_changed', conversationId: currentConversationId }),
          );
        else writeProgress('Started a new session; previous history was preserved.');
        continue;
      }
      if (text.startsWith('/session ')) {
        const requestedId = text.slice('/session '.length).trim();
        if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(requestedId)) {
          writeProgress('Session IDs must be 1 to 64 letters, digits, underscores, or hyphens.');
          continue;
        }
        currentConversationId = requestedId;
        session = await reopenSession();
        if (json)
          console.log(
            JSON.stringify({ event: 'session_changed', conversationId: currentConversationId }),
          );
        else
          writeProgress('Switched session to ' + sanitizeTerminalText(currentConversationId) + '.');
        continue;
      }
      if (text.startsWith('/mode ')) {
        const requestedMode = text.slice('/mode '.length).trim();
        if (requestedMode !== 'chat' && requestedMode !== 'code' && requestedMode !== 'build') {
          writeProgress('Choose /mode chat, /mode code, or /mode build.');
          continue;
        }
        currentMode = requestedMode;
        session = await reopenSession();
        if (json) console.log(JSON.stringify({ event: 'mode_changed', mode: currentMode }));
        else writeProgress('Mode changed to ' + currentMode + '.');
        continue;
      }
      if (text.startsWith('/')) {
        writeProgress('Unknown interactive command. Type /help for available commands.');
        continue;
      }
      if (text.length > 16_000) {
        writeProgress('Tasks may contain at most 16000 characters.');
        continue;
      }
      try {
        const reply = await session.send(text, abort.signal);
        if (!interrupted) printReply(reply);
      } catch (error) {
        if (interrupted) break;
        writeProgress(formatCliError(error));
      }
    }
    return interrupted ? (interruptionCode ?? 130) : 0;
  } finally {
    process.removeListener('SIGINT', onInterrupt);
    process.removeListener('SIGTERM', onTerminate);
    input.close();
    await session?.close();
  }
}

function printAgentHelp(_command?: string): void {
  console.log(
    [
      'SYMindX Agent',
      '',
      'Usage:',
      '  symindx agent [chat|code|build] [task] [options]',
      '  symindx agent create [options]',
      '  symindx agent list|show|history [options]',
      '',
      'Commands:',
      '  chat (default), code, build, create (alias: init), list, show, history',
      '',
      'Options:',
      '  --backend api|codex        Backend (default: codex)',
      '  --workspace <path>         Workspace root',
      '  --character <path>         Character profile',
      '  --db <path>                API backend database',
      '  --agent <id>               Agent ID',
      '  --session <id>             Conversation/session ID',
      '  --model <id>               Provider/model ID',
      '  --message <task>           One-shot task (or positional task)',
      '  --approval ask|read-only|auto  Workspace effect policy',
      '  --yes                      Alias for --approval auto',
      '  --max-rounds 1..32         Maximum tool rounds',
      '  --timeout 1..300           Request timeout in seconds',
      '  --codex-path <path>        Codex executable path',
      '  --env-file <path>          Explicitly load selected environment file',
      '  --json                     Emit machine-readable final output',
      '',
      'Create options:',
      '  --out <path> --name <name> --id <id> --model <id>',
      '  --base-url <url> --key-env <name> --offline',
      '',
      'Interactive commands: /help /exit /history /status /clear /mode /session',
    ].join('\n'),
  );
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
  if (error instanceof SYMindXError) return sanitizeTerminalText(error.message);
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
      '  symindx agent [chat|code|build|create|list|show|history] [options]',
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
