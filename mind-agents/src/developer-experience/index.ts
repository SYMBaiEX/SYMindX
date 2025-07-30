/**
 * SYMindX Developer Experience Revolution
 * The most intuitive, AI-assisted developer experience for AI agent frameworks
 */

// Core Developer Experience Components
export * from './interactive-tutorials/index.js';
export * from './ai-assisted-coding/index.js';
export * from './visual-debugger/index.js';
export * from './productivity-tools/index.js';
export * from './documentation-platform/index.js';

// Developer Experience Manager
export * from './dx-manager.js';

// Types and Interfaces
export * from './types/index.js';

// Utilities
export * from './utils/index.js';

// Configuration
export * from './config/index.js';

/**
 * Initialize the complete Developer Experience suite
 */
export async function initializeDeveloperExperience() {
  const { DeveloperExperienceManager } = await import('./dx-manager.js');

  const dxManager = new DeveloperExperienceManager({
    enableInteractiveTutorials: true,
    enableAIAssistedCoding: true,
    enableVisualDebugger: true,
    enableProductivityTools: true,
    enableDocumentationPlatform: true,
    enableAnalytics: true,
  });

  await dxManager.initialize();
  return dxManager;
}
