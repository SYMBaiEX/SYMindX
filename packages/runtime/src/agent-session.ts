import { randomUUID } from 'node:crypto';
import { realpath, stat } from 'node:fs/promises';
import { createWorkspaceTools, WORKSPACE_TOOL_NAMES } from './workspace-tools.js';
import { defaultDemoCharacter, loadCharacter, parseCharacter, validateId } from './characters.js';
import { SYMindXError } from './errors.js';
import { redactOutput } from './agent-security.js';
import { OpenAICompatibleProvider, createProvider } from './providers.js';
import { SYMindXRuntime } from './runtime.js';
import { resolveCharacterPath, resolveDatabasePath } from './agent-config.js';
import type {
  AgentHistoryEntry,
  AgentReply,
  AgentSession,
  AgentSessionOptions,
} from './agent-types.js';
import type { Character, JsonValue, ToolDefinition } from './types.js';

const WRITE_TOOL_NAMES = WORKSPACE_TOOL_NAMES.slice(3);

function modeInstructions(mode: AgentSessionOptions['mode']): string {
  if (mode === 'chat') {
    return 'The current mode is chat. Answer questions and use only read-only workspace tools when useful. Never claim to edit files or run commands.';
  }
  if (mode === 'code') {
    return 'The current mode is code. Inspect the workspace, explain a focused implementation plan, and make code changes only through workspace tools after the application approves each action. Report only actions that completed.';
  }
  return 'The current mode is build. Inspect the workspace, make the requested changes through workspace tools after the application approves each action, and report only actions that completed.';
}

function configuredCharacter(options: AgentSessionOptions): Character | undefined {
  const model = options.model ?? process.env.SYMINDX_MODEL;
  if (model === undefined || !model.trim()) return undefined;
  const baseUrl = process.env.SYMINDX_BASE_URL ?? 'https://api.openai.com/v1';
  const apiKeyEnv = process.env.SYMINDX_API_KEY_ENV ?? 'OPENAI_API_KEY';
  return parseCharacter({
    schemaVersion: 1,
    id: 'workspace-agent',
    name: 'Workspace Agent',
    systemPrompt:
      'You are a helpful assistant working with the user. Be clear about actions actually completed and never claim that files changed or commands ran unless the corresponding tool reports success.',
    provider: { type: 'openai-compatible', model, baseUrl, apiKeyEnv },
    tools: [...WORKSPACE_TOOL_NAMES],
    memory: { recentMessages: 20 },
    emotion: { enabled: false, decay: 0.85 },
  });
}

function sessionCharacter(character: Character): Character {
  const unsupported = character.tools.filter(
    (name) => !WORKSPACE_TOOL_NAMES.includes(name as (typeof WORKSPACE_TOOL_NAMES)[number]),
  );
  if (unsupported.length) {
    throw new SYMindXError(
      'CONFIGURATION',
      'Character requests tools unavailable in the local agent session',
    );
  }
  return parseCharacter(character);
}
function redactJson(value: JsonValue, secretEnvNames: string[]): JsonValue {
  if (typeof value === 'string') return redactOutput(value, secretEnvNames);
  if (Array.isArray(value)) return value.map((item) => redactJson(item, secretEnvNames));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, redactJson(item, secretEnvNames)]),
    );
  }
  return value;
}

function redactTool(tool: ToolDefinition, secretEnvNames: string[]): ToolDefinition {
  return {
    ...tool,
    execute: async (args, context): Promise<JsonValue> => {
      try {
        return redactJson(await tool.execute(args, context), secretEnvNames);
      } catch (error) {
        if (error instanceof Error) {
          const message = redactOutput(error.message, secretEnvNames);
          if (message !== error.message) throw new SYMindXError('TOOL', message);
        }
        throw error;
      }
    },
  };
}

function messageHistory(
  agentId: string,
  conversationId: string,
  runtime: SYMindXRuntime,
  limit?: number,
): AgentHistoryEntry[] {
  if (limit !== undefined && (!Number.isInteger(limit) || limit < 1 || limit > 500)) {
    throw new SYMindXError('VALIDATION', 'History limit must be an integer from 1 to 500');
  }
  const boundedLimit = limit ?? 100;
  return runtime.history(agentId, conversationId, boundedLimit).map((message) => ({
    role: message.role,
    content: message.content,
    createdAt: message.createdAt,
  }));
}

export async function openAgentSession(options: AgentSessionOptions): Promise<AgentSession> {
  if (!options || typeof options !== 'object') {
    throw new SYMindXError('CONFIGURATION', 'Agent session options are required');
  }
  const requestedWorkspaceRoot = options.workspaceRoot;
  if (typeof requestedWorkspaceRoot !== 'string' || !requestedWorkspaceRoot.trim()) {
    throw new SYMindXError('CONFIGURATION', 'A workspace root is required');
  }
  let workspaceRoot: string;
  try {
    workspaceRoot = await realpath(requestedWorkspaceRoot);
  } catch {
    throw new SYMindXError('CONFIGURATION', 'Workspace root must exist and be accessible');
  }
  if (!['chat', 'code', 'build'].includes(options.mode)) {
    throw new SYMindXError('CONFIGURATION', 'Agent mode must be chat, code, or build');
  }
  if (
    options.approvalMode !== undefined &&
    !['ask', 'read-only', 'auto'].includes(options.approvalMode)
  ) {
    throw new SYMindXError('VALIDATION', 'Invalid agent approval policy');
  }

  const characterPath = resolveCharacterPath(workspaceRoot, options.characterPath);
  let profile: Character | undefined;
  let hasProfile = false;
  try {
    const details = await stat(characterPath);
    if (!details.isFile() || details.size > 64 * 1024) {
      throw new SYMindXError(
        'CONFIGURATION',
        'Character profile must be a regular file up to 64 KiB',
      );
    }
    profile = await loadCharacter(characterPath);
    hasProfile = true;
  } catch (error) {
    if (options.characterPath !== undefined || !isMissing(error)) throw error;
  }

  const environmentCharacter = profile ? undefined : configuredCharacter(options);
  const initialCharacters = profile
    ? [sessionCharacter(profile)]
    : environmentCharacter
      ? [sessionCharacter(environmentCharacter)]
      : [];

  const dbPath = await resolveDatabasePath(workspaceRoot, options.dbPath);
  const secretEnvNames = initialCharacters.flatMap((character) =>
    character.provider.type === 'openai-compatible' ? [character.provider.apiKeyEnv] : [],
  );
  const approveAction = async (
    request: Parameters<NonNullable<AgentSessionOptions['approveAction']>>[0],
    signal?: AbortSignal,
  ): Promise<boolean> => {
    if (options.approvalMode === 'auto') return true;
    if (options.approvalMode === 'read-only') return false;
    return options.approveAction ? options.approveAction(request, signal) : false;
  };
  const tools = (
    await createWorkspaceTools({
      root: workspaceRoot,
      approve: approveAction,
      ...(options.onProgress ? { onProgress: options.onProgress } : {}),
      secretEnvNames,
    })
  ).map((tool) => redactTool(tool, secretEnvNames));
  const runtime = new SYMindXRuntime({
    dbPath,
    characters: initialCharacters,
    tools,
    requestTimeoutMs: options.requestTimeoutMs ?? 300_000,
    toolTimeoutMs: 60_000,
    maxToolRounds: options.maxToolRounds ?? 16,
    maxContextChars: 127_000,
    providerFactory: (config) => {
      const provider =
        config.type === 'openai-compatible'
          ? new OpenAICompatibleProvider(
              { ...config, model: options.model ?? config.model },
              { timeoutMs: 120_000 },
            )
          : createProvider(config);
      return {
        generate: async (request) => {
          const result = await provider.generate({
            ...request,
            system: request.system + '\n\n' + modeInstructions(options.mode),
          });
          return { ...result, text: redactOutput(result.text, secretEnvNames) };
        },
      };
    },
  });

  try {
    await runtime.start();
    const agents = runtime.listAgents();
    for (const agent of agents) {
      const snapshot = runtime.getAgent(agent.id);
      if (snapshot?.character.provider.type === 'openai-compatible') {
        secretEnvNames.push(snapshot.character.provider.apiKeyEnv);
      }
    }
    if (agents.length === 0) {
      if (options.mode !== 'chat') {
        throw new SYMindXError(
          'CONFIGURATION',
          'No agent is configured. Create a character profile or configure SYMINDX_MODEL and SYMINDX_BASE_URL before code/build sessions.',
        );
      }
      runtime.registerCharacter(sessionCharacter(defaultDemoCharacter));
    }

    const selectedAgentId = validateId(
      options.agentId ??
        (profile?.id && runtime.getAgent(profile.id) ? profile.id : runtime.listAgents()[0]?.id),
      'agentId',
    );
    const selected = runtime.getAgent(selectedAgentId);
    if (!selected) throw new SYMindXError('NOT_FOUND', 'Requested agent is not configured');
    const conversationId = validateId(options.conversationId ?? randomUUID(), 'conversationId');
    const selectedSecretNames =
      selected.character.provider.type === 'openai-compatible'
        ? [selected.character.provider.apiKeyEnv]
        : [];
    if (options.model !== undefined && selected.character.provider.type === 'echo') {
      throw new SYMindXError(
        'CONFIGURATION',
        'An echo character cannot use --model; select a real API character',
      );
    }
    if (options.mode !== 'chat' && selected.character.provider.type === 'echo') {
      throw new SYMindXError(
        'CONFIGURATION',
        'The offline echo agent supports chat only; configure a real model for code/build sessions.',
      );
    }
    const finalAgent = runtime.getAgent(selectedAgentId)!;

    const description = {
      backend: 'api' as const,
      agentId: selectedAgentId,
      conversationId,
      workspaceRoot,
      ...(finalAgent.character.provider.model
        ? { model: options.model ?? finalAgent.character.provider.model }
        : {}),
      ...(hasProfile ? { characterPath } : {}),
      dbPath,
    };
    let closed = false;
    return {
      describe: () => ({ ...description }),
      agents: () => runtime.listAgents(),
      history: (limit?: number) => messageHistory(selectedAgentId, conversationId, runtime, limit),
      send: async (text: string, signal?: AbortSignal): Promise<AgentReply> => {
        if (closed) throw new SYMindXError('NOT_RUNNING', 'Agent session is closed');
        if (typeof text !== 'string' || !text.trim()) {
          throw new SYMindXError('VALIDATION', 'Message must contain text');
        }
        const approvalMode = options.approvalMode ?? 'ask';
        const approvedTools =
          options.mode === 'chat' || approvalMode === 'read-only' ? [] : [...WRITE_TOOL_NAMES];
        const result = await runtime.sendMessage(selectedAgentId, text, {
          conversationId,
          ...(signal ? { signal } : {}),
          approvedTools,
        });
        return {
          backend: 'api',
          agentId: result.agentId,
          conversationId: result.conversationId,
          text: redactOutput(result.message.content, selectedSecretNames),
          tools: result.toolCalls,
        };
      },
      close: async (): Promise<void> => {
        if (closed) return;
        closed = true;
        await runtime.stop();
      },
    };
  } catch (error) {
    await runtime.stop().catch(() => undefined);
    throw error;
  }
}

function isMissing(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';
}
