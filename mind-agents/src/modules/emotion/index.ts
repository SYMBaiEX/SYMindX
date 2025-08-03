/**
 * Enhanced Emotion Module for SYMindX
 *
 * This module provides a simplified 5-emotion system with advanced blending,
 * state transitions, and decay management as specified in the requirements.
 */

import { EmotionModule } from '../../types/emotion';
import { runtimeLogger } from '../../utils/logger';

import { CompositeEmotionModule } from './composite-emotion';
import { EmotionEngine, EmotionEngineConfig } from './emotion-engine';

// Export 5 core emotions for direct use if needed
export { HappyEmotion } from './happy/index';
export { SadEmotion } from './sad/index';
export { AngryEmotion } from './angry/index';
export { ConfidentEmotion } from './confident/index';
export { NeutralEmotion } from './neutral/index';

/**
 * Create an emotion module based on configuration
 */
export function createEmotionModule(
  type: string,
  config: unknown
): EmotionModule {
  try {
    switch (type) {
      case 'composite':
      case 'unified':
      case 'enhanced':
      default:
        // Use the enhanced composite module (now includes all advanced features)
        return new CompositeEmotionModule(config as any);
    }
  } catch (error) {
    void error;
    runtimeLogger.error(`❌ Failed to create emotion module ${type}:`, error);
    // Fallback to enhanced composite module
    return new CompositeEmotionModule(config as any);
  }
}

/**
 * Get all available emotion module types
 */
export function getEmotionModuleTypes(): string[] {
  return ['composite', 'unified', 'enhanced'];
}

/**
 * Get all available emotion types (5 core emotions)
 */
export function getEmotionTypes(): string[] {
  return [
    'happy',
    'sad',
    'angry',
    'confident',
    'neutral',
  ];
}

// Export the composite implementation
export {
  CompositeEmotionModule,
  createCompositeEmotionModule,
} from './composite-emotion';
export { BaseEmotion } from './base-emotion';

// Export factory functions for registry (5 core emotions)
export { createHappyEmotionModule } from './happy/index';
export { createSadEmotionModule } from './sad/index';
export { createAngryEmotionModule } from './angry/index';
export { createConfidentEmotionModule } from './confident/index';
export { createNeutralEmotionModule } from './neutral/index';

// Registration function with auto-discovery
export async function registerEmotionModules(registry: any): Promise<void> {
  try {
    // Use the new emotion discovery system
    const { createEmotionDiscovery } = await import('./emotion-discovery');
    const projectRoot = process.cwd();
    const discovery = createEmotionDiscovery(projectRoot);

    // Auto-discover and register all emotions
    await discovery.autoRegisterEmotions(registry);

    // Register the main emotion module types as fallback
    const emotionTypes = getEmotionModuleTypes();
    for (const type of emotionTypes) {
      registry.registerEmotionFactory(type, (config: Record<string, unknown>) =>
        createEmotionModule(type, config)
      );
    }

    // Emotion factories registered - logged by runtime
  } catch (error) {
    void error;
    runtimeLogger.error('❌ Failed to register emotion modules:', error);

    // Fallback to manual registration
    const emotionTypes = getEmotionModuleTypes();
    for (const type of emotionTypes) {
      registry.registerEmotionFactory(type, (config: Record<string, unknown>) =>
        createEmotionModule(type, config)
      );
    }
    throw error;
  }
}
