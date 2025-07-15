/**
 * SYMindX Modules (Emergency Cleanup Version)
 *
 * Simplified module loading with core modules only
 */

import { ModuleRegistry } from '../types/agent';
import { runtimeLogger } from '../utils/logger';

import { createCognitionModule } from './cognition/index';
import { createEmotionModule } from './emotion/index';
import { createMemoryProvider } from './memory/index';
import { createMemoryProviderByName } from './memory/providers/index';
import { createToolSystem } from './tools/factory';

// Re-export core module factories
export {
  createMemoryProvider,
  createMemoryProviderByName,
  createEmotionModule,
  createCognitionModule,
  createToolSystem,
};

// Future modules - see /TODO.md for details
// - Behavior system: Pre-programmed behavioral patterns
// - Lifecycle management: Deployment, versioning, testing

/**
 * Module factory type
 */
export interface ModuleFactories {
  memory: typeof createMemoryProvider;
  emotion: typeof createEmotionModule;
  cognition: typeof createCognitionModule;
  tools: typeof createToolSystem;
}

/**
 * Create a module of the specified type
 */
export function createModule(
  type: 'memory' | 'emotion' | 'cognition' | 'tools',
  moduleType: string,
  config: unknown
): unknown {
  switch (type) {
    case 'memory':
      return createMemoryProviderByName(moduleType, config);
    case 'emotion':
      return createEmotionModule(moduleType, config);
    case 'cognition':
      return createCognitionModule(moduleType, config);
    case 'tools':
      return createToolSystem(moduleType, config);
    default:
      throw new Error(`Unknown module type: ${type}`);
  }
}

/**
 * Register core modules with registry
 */
export async function registerCoreModules(
  registry: ModuleRegistry
): Promise<void> {
  try {
    // Import and register memory providers
    const { registerMemoryProviders } = await import('./memory/index');
    await registerMemoryProviders(registry);

    // Import and register emotion modules
    const { registerEmotionModules } = await import('./emotion/index');
    await registerEmotionModules(registry);

    // Import and register cognition modules
    const { registerCognitionModules } = await import('./cognition/index');
    await registerCognitionModules(registry);

    // Import and register tool systems
    const { registerToolSystemFactory } = await import('./tools/factory');
    registerToolSystemFactory('dynamic', (config) =>
      createToolSystem('dynamic', config)
    );

    // Register extension factories
    await registerExtensionFactories(registry);

    // Core modules registered - logged by runtime
  } catch (error) {
    runtimeLogger.error('❌ Failed to register core modules:', error);
    throw error;
  }
}

/**
 * Register extension factories with registry
 */
export async function registerExtensionFactories(
  registry: ModuleRegistry
): Promise<void> {
  try {
    // Use the new extension discovery system
    const { createExtensionDiscovery } = await import(
      '../extensions/extension-discovery'
    );
    const projectRoot = process.cwd();
    const discovery = createExtensionDiscovery(projectRoot);

    // Auto-discover and register all extensions
    await discovery.autoRegisterExtensions(registry);

    // Manual registration as fallback for critical extensions
    // MCP Client extension removed - handled directly in portal integration

    try {
      const { createMCPServerExtension } = await import(
        '../extensions/mcp-server/index'
      );
      registry.registerExtensionFactory('mcp-server', createMCPServerExtension);
    } catch (error) {
      runtimeLogger.warn('⚠️ MCP Server extension not available:', error);
    }

    try {
      const { createAPIExtension } = await import('../extensions/api/index');
      registry.registerExtensionFactory('api', createAPIExtension);
    } catch (error) {
      runtimeLogger.warn('⚠️ API extension not available:', error);
    }
  } catch (error) {
    runtimeLogger.error('❌ Failed to register extension factories:', error);
    throw error;
  }
}
