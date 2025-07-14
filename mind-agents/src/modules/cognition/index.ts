/**
 * Cognition Module Factory
 *
 * Simplified to use only the unified cognition module
 */

import { CognitionModuleType } from '../../types/agent';

import { UnifiedCognition, createUnifiedCognition } from './cognition';
import { TheoryOfMind, createTheoryOfMind } from './theory-of-mind';

/**
 * Create a cognition module based on type and configuration
 */
export function createCognitionModule(type: string, config: any) {
  console.log(`🧠 Creating cognition module: ${type}`);

  // Use enum values for type validation
  const supportedTypes = Object.values(CognitionModuleType);
  if (!supportedTypes.includes(type as CognitionModuleType)) {
    console.warn(
      `Unknown cognition type: ${type}, supported types: ${supportedTypes.join(', ')}`
    );
  }

  // All types now use unified cognition with different configs
  switch (type) {
    case CognitionModuleType.UNIFIED:
    case 'unified':
    case 'htn_planner': // Legacy compatibility
    case 'reactive': // Legacy compatibility
    case 'hybrid': // Legacy compatibility
      return createUnifiedCognition({
        ...config,
        // Adjust config based on legacy type
        analysisDepth:
          type === 'htn_planner'
            ? 'deep'
            : type === 'reactive'
              ? 'shallow'
              : 'normal',
      });
    case CognitionModuleType.THEORY_OF_MIND:
    case 'theory_of_mind':
      // Add theory of mind capability alongside unified cognition
      const unifiedModule = createUnifiedCognition(config);
      const theoryOfMindModule = createTheoryOfMind(config);
      return {
        ...unifiedModule,
        theoryOfMind: theoryOfMindModule,
      };
    default:
      console.warn(`Unknown cognition type: ${type}, using unified`);
      return createUnifiedCognition(config);
  }
}

/**
 * Get all available cognition module types
 */
export function getCognitionModuleTypes(): string[] {
  return ['unified']; // Simplified to just unified
}

// Export the cognition modules
export { UnifiedCognition, TheoryOfMind };

// Registration function with auto-discovery
export async function registerCognitionModules(registry: any): Promise<void> {
  try {
    // Use the new cognition discovery system
    const { createCognitionDiscovery } = await import('./cognition-discovery');
    const projectRoot = process.cwd();
    const discovery = createCognitionDiscovery(projectRoot);

    // Auto-discover and register all cognition modules
    await discovery.autoRegisterCognitions(registry);

    // Register the main cognition module types as fallback
    registry.registerCognitionFactory('unified', (config: any) =>
      createUnifiedCognition(
        config || {
          thinkForActions: true,
          thinkForMentions: true,
          thinkOnRequest: true,
          quickResponseMode: true,
          analysisDepth: 'normal',
        }
      )
    );

    // Register legacy names for compatibility
    const legacyTypes = ['htn_planner', 'reactive', 'hybrid'];
    for (const type of legacyTypes) {
      registry.registerCognitionFactory(type, (config: any) =>
        createUnifiedCognition({
          ...config,
          analysisDepth:
            type === 'htn_planner'
              ? 'deep'
              : type === 'reactive'
                ? 'shallow'
                : 'normal',
        })
      );
    }

    // Cognition factories registered - logged by runtime
  } catch (error) {
    console.error('❌ Failed to register cognition modules:', error);

    // Fallback to manual registration
    registry.registerCognitionFactory('unified', (config: any) =>
      createUnifiedCognition(
        config || {
          thinkForActions: true,
          thinkForMentions: true,
          thinkOnRequest: true,
          quickResponseMode: true,
          analysisDepth: 'normal',
        }
      )
    );
    throw error;
  }
}
