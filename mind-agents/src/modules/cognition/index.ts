/**
 * Cognition Module Factory
 * 
 * This file exports all available cognition modules and provides factory functions
 * for creating them based on type.
 */

import { 
  HTNPlannerCognition, 
  createHTNPlannerCognition,
  ReactiveCognition,
  createReactiveCognition, 
  HybridCognition,
  createHybridCognition,
  createCognitionModule as createCognitionModuleFactory,
  getAvailableCognitionModuleTypes
} from './cognitive-functions/index.js'
import { CognitionModuleType } from '../../types/agent.js'

/**
 * Create a cognition module based on type and configuration
 */
export function createCognitionModule(type: string, config: any) {
  console.log(`🧠 Creating cognition module: ${type}`);
  
  // Map string types to enum types
  let moduleType: CognitionModuleType;
  switch (type) {
    case 'htn_planner':
      moduleType = CognitionModuleType.HTN_PLANNER;
      break;
    case 'reactive':
      moduleType = CognitionModuleType.REACTIVE;
      break;
    case 'hybrid':
      moduleType = CognitionModuleType.HYBRID;
      break;
    default:
      throw new Error(`Unknown cognition module type: ${type}`);
  }
  
  return createCognitionModuleFactory(moduleType, config);
}

/**
 * Get all available cognition module types
 */
export function getCognitionModuleTypes(): string[] {
  return ['htn_planner', 'reactive', 'hybrid'];
}

// Export cognition modules
export { HTNPlannerCognition, ReactiveCognition, HybridCognition };

// Registration function
export function registerCognitionModules(registry: any) {
  console.log('🧠 Registering cognition modules...');
  
  // Register factory functions for dynamic creation
  registry.registerCognitionFactory('htn_planner', (config: any) => 
    createHTNPlannerCognition(config || { planningDepth: 3, memoryIntegration: true, creativityLevel: 0.5 }));
  registry.registerCognitionFactory('reactive', (config: any) => 
    createReactiveCognition(config || { responseSpeed: 0.8, emotionalInfluence: 0.6, adaptability: 0.4 }));
  registry.registerCognitionFactory('hybrid', (config: any) => 
    createHybridCognition(config || { 
      planningDepth: 3,
      planningBreadth: 5,
      planningHorizon: 10,
      responseSpeed: 0.8, 
      emotionalInfluence: 0.6, 
      adaptability: 0.4,
      planningThreshold: 0.5,
      contextualWeight: 0.7
    }));
  
  // Also register default instances for backwards compatibility
  registry.registerCognitionModule('htn_planner', createHTNPlannerCognition({ 
    planningDepth: 3, 
    memoryIntegration: true, 
    creativityLevel: 0.5 
  }));
  registry.registerCognitionModule('reactive', createReactiveCognition({ 
    responseSpeed: 0.8, 
    emotionalInfluence: 0.6, 
    adaptability: 0.4 
  }));
  registry.registerCognitionModule('hybrid', createHybridCognition({ 
    planningDepth: 3,
    planningBreadth: 5,
    planningHorizon: 10, 
    responseSpeed: 0.8, 
    emotionalInfluence: 0.6, 
    adaptability: 0.4,
    planningThreshold: 0.5,
    contextualWeight: 0.7
  }));
  
  console.log('✅ Cognition modules registered: htn_planner, reactive, hybrid');
}