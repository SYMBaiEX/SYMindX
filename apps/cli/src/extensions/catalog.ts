import type { ExtensionInfo } from './types.js';

export const HOST_EXTENSIONS: readonly ExtensionInfo[] = [
  { id: 'slack', name: 'Slack', actions: ['post', 'approval'] },
  { id: 'twitter', name: 'Twitter', actions: ['post'] },
  { id: 'runelite', name: 'RuneLite', actions: ['say', 'walk', 'examine'] },
  { id: 'direct', name: 'Direct', actions: ['cli'] },
];
