/**
 * SYMindX Modules (Emergency Cleanup Version)
 * 
 * Simplified module loading with core modules only
 */

import { ModuleRegistry } from '../types/agent'
import { createMemoryProvider } from './memory/index'
import { createMemoryProviderByName } from './memory/providers/index'
import { createEmotionModule } from './emotion/index'  
import { createCognitionModule } from './cognition/index'

// Re-export core module factories
export { createMemoryProvider, createMemoryProviderByName, createEmotionModule, createCognitionModule }

// Future modules - see /TODO.md for details
// - Behavior system: Pre-programmed behavioral patterns
// - Lifecycle management: Deployment, versioning, testing

/**
 * Module factory type
 */
export interface ModuleFactories {
  memory: typeof createMemoryProvider
  emotion: typeof createEmotionModule
  cognition: typeof createCognitionModule
}

/**
 * Create a module of the specified type
 */
export function createModule(type: 'memory' | 'emotion' | 'cognition', moduleType: string, config: any) {
  switch (type) {
    case 'memory':
      return createMemoryProviderByName(moduleType, config)
    case 'emotion':
      return createEmotionModule(moduleType, config)
    case 'cognition':
      return createCognitionModule(moduleType, config)
    default:
      throw new Error(`Unknown module type: ${type}`)
  }
}

/**
 * Register core modules with registry
 */
export async function registerCoreModules(registry: ModuleRegistry): Promise<void> {
  try {
    // Import and register memory providers
    const { registerMemoryProviders } = await import('./memory/index')
    await registerMemoryProviders(registry)
    
    // Import and register emotion modules  
    const { registerEmotionModules } = await import('./emotion/index')
    await registerEmotionModules(registry)
    
    // Import and register cognition modules
    const { registerCognitionModules } = await import('./cognition/index')
    await registerCognitionModules(registry)
    
    // Register extension factories
    await registerExtensionFactories(registry)
    
    // Core modules registered - logged by runtime
  } catch (error) {
    console.error('❌ Failed to register core modules:', error)
    throw error
  }
}

/**
 * Register extension factories with registry
 */
export async function registerExtensionFactories(registry: ModuleRegistry): Promise<void> {
  try {
    // Use the new extension discovery system
    const { createExtensionDiscovery } = await import('../extensions/extension-discovery')
    const projectRoot = process.cwd()
    const discovery = createExtensionDiscovery(projectRoot)
    
    // Auto-discover and register all extensions
    await discovery.autoRegisterExtensions(registry)
    
    // Manual registration as fallback for critical extensions
    try {
      const { createMCPClientExtension } = await import('../extensions/mcp-client/index')
      registry.registerExtensionFactory('mcp-client', createMCPClientExtension)
    } catch (error) {
      console.warn('⚠️ MCP Client extension not available:', error)
    }
    
    try {
      const { createMCPServerExtension } = await import('../extensions/mcp-server/index')
      registry.registerExtensionFactory('mcp-server', createMCPServerExtension)
    } catch (error) {
      console.warn('⚠️ MCP Server extension not available:', error)
    }
    
    try {
      const { createAPIExtension } = await import('../extensions/api/index')
      registry.registerExtensionFactory('api', createAPIExtension)
    } catch (error) {
      console.warn('⚠️ API extension not available:', error)
    }
    
  } catch (error) {
    console.error('❌ Failed to register extension factories:', error)
    throw error
  }
}