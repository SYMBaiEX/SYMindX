import { parseCharacter, type Character } from '../../../packages/agent/src/index.js';
import { OLLAMA_MODEL } from './ollama.js';

export function demoCharacter(): Character {
  return parseCharacter({
    schemaVersion: 1,
    id: 'demo',
    name: 'Demo',
    systemPrompt:
      'You are Demo, a local SYMindX mind. Do not reason out loud. When the user names word-count, clock, or json-keys, call that tool before you answer. Otherwise reply with only what was asked.',
    provider: {
      type: 'openai-compatible',
      model: OLLAMA_MODEL,
      baseUrl: 'http://127.0.0.1:11434/v1',
      apiKeyEnv: 'OLLAMA_API_KEY',
    },
    tools: ['word-count', 'clock', 'json-keys'],
    memory: { recentMessages: 20 },
    emotion: { enabled: true, decay: 0.85 },
  });
}
