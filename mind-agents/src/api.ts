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
} from './modules/index';

// Import module factories
import { SYMindXRuntime } from './core/runtime';
import { createCognitionModule } from './modules/cognition/index';
import { createEmotionModule } from './modules/emotion/index';
import { createMemoryProvider } from './modules/memory/providers/index';
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

  // Utility functions
  Logger,
};

/**
 * Default export for easy importing
 */
export default SYMindX;
