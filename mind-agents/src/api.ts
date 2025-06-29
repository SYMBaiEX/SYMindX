/**
 * SYMindX Public API
 * 
 * This file provides the main public interface for the SYMindX runtime system,
 * exposing all the essential components and factory functions for building
 * AI agent applications.
 */

// === CORE RUNTIME ===
export { SYMindXRuntime } from './core/runtime.js';
export { SYMindXModuleRegistry } from './core/registry.js';
export type { EnhancedEventBus } from './core/enhanced-event-bus.js';
export type { SimplePluginLoader } from './core/simple-plugin-loader.js';
export { createPluginLoader } from './core/simple-plugin-loader.js';

// === TYPE SYSTEM ===
export type * from './types/index.js';

// === MODULES ===
export { 
  type ModuleFactories, 
  createModule, 
  registerCoreModules
} from './modules/index.js';

// Import module factories
import { createMemoryProvider } from './modules/memory/providers/index.js';
import { createEmotionModule } from './modules/emotion/index.js';
import { createCognitionModule } from './modules/cognition/index.js';
import { SYMindXRuntime } from './core/runtime.js';
import { Logger } from './utils/logger.js';

// === UTILITIES ===
export { Logger } from './utils/logger.js';

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