/**
 * Emotion module for SYMindX
 *
 * This module provides a comprehensive emotion system where each emotion
 * has its own module with specific behaviors and triggers.
 */

import { EmotionModule } from '../../types/emotion';
import { runtimeLogger } from '../../utils/logger';

import { CompositeEmotionModule } from './composite-emotion';

// Export individual emotions for direct use if needed
export { HappyEmotion } from './happy/index';
export { SadEmotion } from './sad/index';
export { AngryEmotion } from './angry/index';
export { AnxiousEmotion } from './anxious/index';
export { ConfidentEmotion } from './confident/index';
export { NostalgicEmotion } from './nostalgic/index';
export { EmpatheticEmotion } from './empathetic/index';
export { CuriousEmotion } from './curious/index';
export { ProudEmotion } from './proud/index';
export { ConfusedEmotion } from './confused/index';
export { NeutralEmotion } from './neutral/index';

/**
 * Create an emotion module based on configuration
 */
export function createEmotionModule(
  type: string,
  config: unknown
): EmotionModule {
  // Creating emotion module - logged by runtime

  try {
    // All emotion types now use the composite module
    switch (type) {
      case 'composite':
      case 'unified':
      default:
        // Creating CompositeEmotionModule - logged by runtime
        return new CompositeEmotionModule(config as any);
    }
  } catch (error) {
    void error;
    runtimeLogger.error(`❌ Failed to create emotion module ${type}:`, error);
    // Creating default CompositeEmotionModule - logged by runtime
    return new CompositeEmotionModule(config as any);
  }
}

/**
 * Get all available emotion module types
 */
export function getEmotionModuleTypes(): string[] {
  return ['composite', 'unified'];
}

/**
 * Get all available emotion types
 */
export function getEmotionTypes(): string[] {
  return [
    'happy',
    'sad',
    'angry',
    'anxious',
    'confident',
    'nostalgic',
    'empathetic',
    'curious',
    'proud',
    'confused',
    'neutral',
  ];
}

// Export the composite implementation
export {
  CompositeEmotionModule,
  createCompositeEmotionModule,
} from './composite-emotion';
export { BaseEmotion } from './base-emotion';

// Export factory functions for registry
export { createHappyEmotionModule } from './happy/index';
export { createSadEmotionModule } from './sad/index';
export { createAngryEmotionModule } from './angry/index';
export { createAnxiousEmotionModule } from './anxious/index';
export { createConfidentEmotionModule } from './confident/index';
export { createNostalgicEmotionModule } from './nostalgic/index';
export { createEmpatheticEmotionModule } from './empathetic/index';
export { createCuriousEmotionModule } from './curious/index';
export { createProudEmotionModule } from './proud/index';
export { createConfusedEmotionModule } from './confused/index';
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
