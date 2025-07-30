/**
 * Legacy Agent Types (v1.x compatibility)
 */

export interface Agent {
  id: string;
  name?: string;
  personality?: string | string[];

  // Legacy methods
  processMessage(message: string): string;
  getCurrentEmotion(): string;
  getMemories(): any[];

  // Legacy properties
  memoryType?: string;
  emotionType?: string;
  cognitionType?: string;
  communicationStyle?: string;
  primaryPortal?: string;

  // Configuration objects
  memoryConfig?: any;
  emotionConfig?: any;
  cognitionConfig?: any;
  portalConfig?: any;
  extensions?: any[];
}

export interface Memory {
  store(data: any): void;
  retrieve(query?: any): any[];
  type: string;
}

export interface Emotion {
  currentEmotion: string;
  intensity: number;
  processEmotion(context: any): void;
}

export interface Cognition {
  think(input: any): any;
  plan(goal: any): any;
  type: string;
}

export interface Extension {
  name: string;
  enabled: boolean;
  config?: any;
}

export interface LegacyRuntimeConfig {
  agents?: Agent[];
  monitoring?: boolean;
  caching?: boolean;
  maxContexts?: number;
  contextTtl?: number;
  enableEnrichment?: boolean;
}
