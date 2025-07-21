import { ExtensionConfig } from '../../types/common.js';

export interface RuneLiteSettings {
  port?: number;
  events?: string[];
}

export interface RuneLiteConfig extends ExtensionConfig {
  settings: RuneLiteSettings;
}

export interface GameEvent {
  type: string;
  [key: string]: unknown;
}

export interface RuneLiteCommand {
  name: string;
  args?: Record<string, unknown>;
}
