/**
 * Cognition Module Factory
 *
 * Simplified to use only the unified cognition module
 */

import { CognitionModuleType } from '../../types/agent';
// Agent imports should come first
import { CognitionModule } from '../../types/cognition';

import { UnifiedCognition, createUnifiedCognition } from './cognition';
import { TheoryOfMind } from './theory-of-mind';

/**
 * Create a cognition module based on type and configuration
 */
export function createCognitionModule(
  type: string,
  config: Record<string, unknown>
): CognitionModule {
  // Creating cognition module

  // Use enum values for type validation
  const supportedTypes = Object.values(CognitionModuleType);
  if (!supportedTypes.includes(type as CognitionModuleType)) {
    // Unknown cognition type, will use default
  }

  // All types now use unified cognition with different configs
  switch (type) {
    case CognitionModuleType.UNIFIED:
    case 'unified':
    case 'htn_planner': // Legacy compatibility
    case 'reactive': // Legacy compatibility
    case 'hybrid': // Legacy compatibility
      return createUnifiedCognition({
        ...(config as any),
        // Adjust config based on legacy type
        analysisDepth:
          type === 'htn_planner'
            ? 'deep'
            : type === 'reactive'
              ? 'shallow'
              : 'normal',
      });
    case CognitionModuleType.THEORY_OF_MIND:
    case 'theory_of_mind': {
      // Theory of mind is integrated into unified cognition
      const unifiedConfig = {
        ...(config as any),
        enableTheoryOfMind: true,
        theoryOfMindConfig: config,
      };
      return createUnifiedCognition(unifiedConfig);
    }
    default:
      // Unknown cognition type, using unified
      return createUnifiedCognition(config as any);
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

// Export factory functions for individual modules
export { createHtnPlannerCognition } from './htn-planner/index';
export { createReactiveCognition } from './reactive/index';
export { createHybridCognition } from './hybrid/index';

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
    if (
      'registerCognitionFactory' in registry &&
      typeof registry.registerCognitionFactory === 'function'
    ) {
      registry.registerCognitionFactory(
        'unified',
        (config: Record<string, unknown>) =>
          createUnifiedCognition(
            (config as any) || {
              thinkForActions: true,
              thinkForMentions: true,
              thinkOnRequest: true,
              quickResponseMode: true,
              analysisDepth: 'normal',
            }
          )
      );
    }

    // Register legacy names for compatibility
    const legacyTypes = ['htn_planner', 'reactive', 'hybrid'];
    for (const type of legacyTypes) {
      if (
        'registerCognitionFactory' in registry &&
        typeof registry.registerCognitionFactory === 'function'
      ) {
        registry.registerCognitionFactory(
          type,
          (config: Record<string, unknown>) =>
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
    }

    // Cognition factories registered - logged by runtime
  } catch (error) {
    void error;
    // Failed to register cognition modules

    // Fallback to manual registration
    if (
      'registerCognitionFactory' in registry &&
      typeof registry.registerCognitionFactory === 'function'
    ) {
      registry.registerCognitionFactory(
        'unified',
        (config: Record<string, unknown>) =>
          createUnifiedCognition(
            (config as any) || {
              thinkForActions: true,
              thinkForMentions: true,
              thinkOnRequest: true,
              quickResponseMode: true,
              analysisDepth: 'normal',
            }
          )
      );
    }
    throw error;
  }
}
