export interface PortalPreset {
  id: 'openai' | 'groq' | 'openrouter';
  baseUrl: string;
}

export const PORTAL_PRESETS: readonly PortalPreset[] = [
  { id: 'openai', baseUrl: 'https://api.openai.com/v1' },
  { id: 'groq', baseUrl: 'https://api.groq.com/openai/v1' },
  { id: 'openrouter', baseUrl: 'https://openrouter.ai/api/v1' },
];

export function getPreset(id: string): PortalPreset {
  for (const preset of PORTAL_PRESETS) {
    if (preset.id === id) {
      return { id: preset.id, baseUrl: preset.baseUrl };
    }
  }
  throw new Error('unknown portal preset');
}
