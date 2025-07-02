/**
 * Cognition Module Factory
 * 
 * Simplified to use only the unified cognition module
 */

import { UnifiedCognition, createUnifiedCognition } from './cognition.js'
import { CognitionModuleType } from '../../types/agent.js'
import { TheoryOfMind, createTheoryOfMind } from './theory-of-mind.js'

/**
 * Create a cognition module based on type and configuration
 */
export function createCognitionModule(type: string, config: any) {
  console.log(`🧠 Creating cognition module: ${type}`);
  
  // All types now use unified cognition with different configs
  switch (type) {
    case 'unified':
    case 'htn_planner': // Legacy compatibility
    case 'reactive':    // Legacy compatibility  
    case 'hybrid':      // Legacy compatibility
      return createUnifiedCognition({
        ...config,
        // Adjust config based on legacy type
        analysisDepth: type === 'htn_planner' ? 'deep' : 
                      type === 'reactive' ? 'shallow' : 
                      'normal'
      })
    default:
      console.warn(`Unknown cognition type: ${type}, using unified`)
      return createUnifiedCognition(config)
  }
}

/**
 * Get all available cognition module types
 */
export function getCognitionModuleTypes(): string[] {
  return ['unified'] // Simplified to just unified
}

// Export the cognition modules
export { UnifiedCognition, TheoryOfMind }

// Registration function
export function registerCognitionModules(registry: any) {
  console.log('🧠 Registering unified cognition module...')
  
  // Register factory for unified cognition
  registry.registerCognitionFactory('unified', (config: any) => 
    createUnifiedCognition(config || {
      thinkForActions: true,
      thinkForMentions: true,
      thinkOnRequest: true,
      quickResponseMode: true,
      analysisDepth: 'normal'
    }))
  
  // Register legacy names for compatibility
  const legacyTypes = ['htn_planner', 'reactive', 'hybrid']
  for (const type of legacyTypes) {
    registry.registerCognitionFactory(type, (config: any) => 
      createUnifiedCognition({
        ...config,
        analysisDepth: type === 'htn_planner' ? 'deep' : 
                      type === 'reactive' ? 'shallow' : 
                      'normal'
      }))
  }
  
  console.log('✅ Cognition module registered: unified (with legacy compatibility)')
}