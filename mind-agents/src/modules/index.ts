/**
 * SYMindX Modules (Emergency Cleanup Version)
 * 
 * Simplified module loading with core modules only
 */

import { ModuleRegistry } from '../types/agent.js'
import { createMemoryProvider } from './memory/index.js'
import { createEmotionModule } from './emotion/index.js'  
import { createCognitionModule } from './cognition/index.js'

// Re-export core module factories
export { createMemoryProvider, createEmotionModule, createCognitionModule }

// TEMPORARILY DISABLED - behavior and lifecycle modules have type conflicts
// Export autonomous behavior system
// export * from './behaviors/index.js'

// Export lifecycle management
// export * from './life-cycle/index.js'

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
      return createMemoryProvider(moduleType, config)
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
  console.log('📚 Registering core modules (simplified for emergency cleanup)')
  
  try {
    // Import and register memory providers
    const { registerMemoryProviders } = await import('./memory/index.js')
    await registerMemoryProviders(registry)
    
    // Import and register emotion modules  
    const { registerEmotionModules } = await import('./emotion/index.js')
    await registerEmotionModules(registry)
    
    // Import and register cognition modules
    const { registerCognitionModules } = await import('./cognition/index.js')
    await registerCognitionModules(registry)
    
    console.log('✅ Core modules registered successfully')
  } catch (error) {
    console.error('❌ Failed to register core modules:', error)
    throw error
  }
}