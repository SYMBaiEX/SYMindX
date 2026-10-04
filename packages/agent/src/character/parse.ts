export interface Character {
  schemaVersion: 1;
  id: string;
  name: string;
  systemPrompt: string;
  provider: ProviderConfig;
  tools: string[];
  memory: { recentMessages: number };
  emotion: { enabled: boolean; decay: number };
  temperament: { valence: number; arousal: number; dominance: number };
  voice: { warmth: number; directness: number; pace: number };
}

export type ProviderConfig =
  | { type: 'echo'; model: string; maxOutputTokens?: number }
  | {
      type: 'openai-compatible';
      model: string;
      baseUrl: string;
      apiKeyEnv: string;
      maxOutputTokens?: number;
    };

function fail(message: string): never {
  throw new Error(message);
}

function object(
  value: unknown,
  name: string,
  allowed: readonly string[],
): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail(`${name} must be an object`);
  }
  const record: Record<string, unknown> = {};
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) {
      fail(`Unknown ${name} field: ${key}`);
    }
    record[key] = Reflect.get(value, key);
  }
  return record;
}

function text(value: unknown, name: string, max: number): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) {
    fail(`${name} must be non-empty text up to ${max} characters`);
  }
  return value;
}

export function validateId(value: unknown, name = 'id'): string {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(value)) {
    fail(`${name} must contain 1–64 letters, numbers, underscores or hyphens`);
  }
  return value;
}

function optionalTokenLimit(value: unknown): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 16384) {
    fail('provider.maxOutputTokens must be from 1 to 16384');
  }
  return value;
}

function parseTools(value: unknown): string[] {
  const tools = value ?? [];
  if (!Array.isArray(tools) || tools.length > 32) {
    fail('tools must be a unique list of up to 32 valid tool names');
  }
  const names: string[] = [];
  const seen = new Set<string>();
  for (const toolName of tools) {
    if (
      typeof toolName !== 'string' ||
      !/^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/.test(toolName) ||
      seen.has(toolName)
    ) {
      fail('tools must be a unique list of up to 32 valid tool names');
    }
    seen.add(toolName);
    names.push(toolName);
  }
  return names;
}

export function parseCharacter(input: unknown): Character {
  const source = object(input, 'character', [
    'schemaVersion',
    'id',
    'name',
    'systemPrompt',
    'provider',
    'tools',
    'memory',
    'emotion',
    'temperament',
    'voice',
  ]);
  if (source['schemaVersion'] !== 1) {
    fail('Unsupported character schemaVersion; expected 1');
  }
  const providerSource = object(source['provider'], 'provider', [
    'type',
    'model',
    'baseUrl',
    'apiKeyEnv',
    'maxOutputTokens',
  ]);
  const kind = providerSource['type'];
  if (kind !== 'echo' && kind !== 'openai-compatible') {
    fail('provider.type must be echo or openai-compatible');
  }
  const model = text(providerSource['model'], 'provider.model', 200);
  const maxOutputTokens = optionalTokenLimit(providerSource['maxOutputTokens']);
  let provider: Character['provider'];
  if (kind === 'echo') {
    if (providerSource['baseUrl'] !== undefined || providerSource['apiKeyEnv'] !== undefined) {
      fail('echo provider does not use credentials or a base URL');
    }
    provider =
      maxOutputTokens === undefined
        ? { type: 'echo', model }
        : { type: 'echo', model, maxOutputTokens };
  } else {
    const baseUrl = text(providerSource['baseUrl'], 'provider.baseUrl', 2048);
    const apiKeyEnv = providerSource['apiKeyEnv'];
    if (typeof apiKeyEnv !== 'string' || !/^[A-Z][A-Z0-9_]{0,127}$/.test(apiKeyEnv)) {
      fail('provider.apiKeyEnv must be an environment variable name');
    }
    provider =
      maxOutputTokens === undefined
        ? { type: 'openai-compatible', model, baseUrl, apiKeyEnv }
        : { type: 'openai-compatible', model, baseUrl, apiKeyEnv, maxOutputTokens };
  }
  const memory = object(source['memory'] ?? {}, 'memory', ['recentMessages']);
  const recentMessages = memory['recentMessages'] ?? 20;
  if (
    typeof recentMessages !== 'number' ||
    !Number.isInteger(recentMessages) ||
    recentMessages < 2 ||
    recentMessages > 200
  ) {
    fail('memory.recentMessages must be an integer from 2 to 200');
  }
  const emotion = object(source['emotion'] ?? {}, 'emotion', ['enabled', 'decay']);
  const enabled = emotion['enabled'] ?? false;
  const decay = emotion['decay'] ?? 0.85;
  if (typeof enabled !== 'boolean') {
    fail('emotion.enabled must be boolean');
  }
  if (typeof decay !== 'number' || !Number.isFinite(decay) || decay < 0 || decay > 1) {
    fail('emotion.decay must be from 0 to 1');
  }
  const temperament = parseTemperament(source['temperament']);
  const voice = parseVoice(source['voice']);
  return {
    schemaVersion: 1,
    id: validateId(source['id']),
    name: text(source['name'], 'name', 200),
    systemPrompt: text(source['systemPrompt'], 'systemPrompt', 16000),
    provider,
    tools: parseTools(source['tools']),
    memory: { recentMessages },
    emotion: { enabled, decay },
    temperament,
    voice,
  };
}

function parseTemperament(value: unknown): { valence: number; arousal: number; dominance: number } {
  const source = object(value ?? {}, 'temperament', ['valence', 'arousal', 'dominance']);
  return {
    valence: axis(source['valence'], 'temperament.valence', -1, 1, 0),
    arousal: axis(source['arousal'], 'temperament.arousal', -1, 1, 0),
    dominance: axis(source['dominance'], 'temperament.dominance', -1, 1, 0),
  };
}

function parseVoice(value: unknown): { warmth: number; directness: number; pace: number } {
  const source = object(value ?? {}, 'voice', ['warmth', 'directness', 'pace']);
  return {
    warmth: axis(source['warmth'], 'voice.warmth', 0, 1, 0.5),
    directness: axis(source['directness'], 'voice.directness', 0, 1, 0.5),
    pace: axis(source['pace'], 'voice.pace', 0, 1, 0.5),
  };
}

function axis(value: unknown, name: string, min: number, max: number, fallback: number): number {
  const number = value ?? fallback;
  if (typeof number !== 'number' || !Number.isFinite(number) || number < min || number > max) {
    fail(`${name} must be from ${min} to ${max}`);
  }
  return number;
}
