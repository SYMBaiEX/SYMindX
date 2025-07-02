/**
 * Cognitive Functions Index
 * 
 * This file exports all available cognition modules and provides factory functions
 * for creating them based on type.
 */

import { CognitionModuleType } from '../../../types/agent.js'

// Import all cognition modules
import { HTNPlannerCognition, createHTNPlannerCognition } from './htn-planner/index.js'
import { ReactiveCognition, createReactiveCognition } from './reactive/index.js'
import { HybridCognition, createHybridCognition } from './hybrid/index.js'

// Export all cognition modules
export {
  HTNPlannerCognition,
  createHTNPlannerCognition,
  ReactiveCognition,
  createReactiveCognition,
  HybridCognition,
  createHybridCognition
}

/**
 * Get all available cognition module types
 * @returns Array of available cognition module types
 */
export function getAvailableCognitionModuleTypes(): CognitionModuleType[] {
  return [CognitionModuleType.HTN_PLANNER, CognitionModuleType.REACTIVE, CognitionModuleType.HYBRID]
}

/**
 * Create a cognition module based on type and configuration
 * @param type The type of cognition module to create
 * @param config The configuration for the cognition module
 * @returns The created cognition module
 */
export function createCognitionModule(type: CognitionModuleType, config: any) {
  switch (type) {
    case CognitionModuleType.HTN_PLANNER:
      return createHTNPlannerCognition(config)
    case CognitionModuleType.REACTIVE:
      return createReactiveCognition(config)
    case CognitionModuleType.HYBRID:
      return createHybridCognition(config)
    default:
      throw new Error(`Unknown cognition module type: ${type}`)
  }
}