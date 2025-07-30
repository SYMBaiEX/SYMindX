/**
 * SYMindX Public API
 *
 * This file provides the main public interface for the SYMindX runtime system,
 * exposing all the essential components and factory functions for building
 * AI agent applications.
 */

// === CORE RUNTIME ===
export { SYMindXRuntime } from './core/runtime';
export { SYMindXModuleRegistry } from './core/registry';
export type { SimpleEventBus } from './core/event-bus';
export type { ExtensionLoader } from './core/extension-loader';
export { createExtensionLoader } from './core/extension-loader';

// === TYPE SYSTEM ===
export type * from './types/index';

// === MODULES ===
export {
  type ModuleFactories,
  createModule,
  registerCoreModules,
  createMultiModalModule,
} from './modules/index';

// Import module factories
import { SYMindXRuntime } from './core/runtime';
import { createCognitionModule } from './modules/cognition/index';
import { createEmotionModule } from './modules/emotion/index';
import { createMemoryProvider } from './modules/memory/providers/index';
import { createMultiModalModule } from './modules/multimodal/index';
import type { AgentConfig } from './types/index';
import { LogLevel } from './types/index';
import { Logger } from './utils/logger';

// === UTILITIES ===
export { Logger } from './utils/logger';

/**
 * Quick factory functions for common use cases
 */
export const SYMindX = {
  // Core components
  Runtime: SYMindXRuntime,

  // Quick module creation
  createMemory: createMemoryProvider,
  createEmotion: createEmotionModule,
  createCognition: createCognitionModule,
  createMultiModal: createMultiModalModule,

  // Utility functions
  Logger,
};

/**
 * Default export for easy importing
 */
/**
 * Create a new agent with multi-modal capabilities
 */
export async function createAgent(config: {
  name: string;
  characterPath?: string;
  extensions?: string[];
  multimodal?: any;
  [key: string]: any;
}): Promise<any> {
  // Create runtime with minimal config
  const runtime = new SYMindXRuntime({
    tickInterval: 1000,
    maxAgents: 10,
    logLevel: LogLevel.DEBUG,
    persistence: {
      enabled: false,
      path: './data',
    },
    extensions: {
      autoLoad: false,
      paths: [],
    },
  });
  // Initialize runtime
  await runtime.initialize();
  // Create agent config compatible with AgentConfig interface
  const agentConfig: AgentConfig = {
    core: {
      name: config.name,
      tone: 'helpful',
      personality: ['intelligent', 'adaptive'],
    },
    lore: {
      origin: 'SYMindX Framework',
      motive: 'Assistance and Problem Solving',
    },
    psyche: {
      traits: ['analytical', 'helpful'],
      defaults: {
        memory: 'sqlite',
        emotion: 'composite',
        cognition: 'hybrid',
      },
    },
    modules: {
      extensions: config.extensions || [],
    },
  };

  // Create agent
  const agent = await runtime.createAgent(agentConfig);
  // Add multi-modal capabilities if configured
  if (config.multimodal) {
    const multimodal = await createMultiModalModule(config.multimodal);
    // Attach to agent (implementation would depend on agent structure)
    (agent as any).multimodal = multimodal;
  }
  return agent;
}

export default SYMindX;
