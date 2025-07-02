/**
 * Emotion module for SYMindX
 * 
 * This module provides a comprehensive emotion system where each emotion
 * has its own module with specific behaviors and triggers.
 */

import { CompositeEmotionModule } from './composite-emotion.js';
import { EmotionModule } from '../../types/emotion.js';
import { EmotionConfig } from '../../types/agent.js';
import { runtimeLogger } from '../../utils/logger.js';

// Export individual emotions for direct use if needed
export { HappyEmotion } from './happy/index.js'
export { SadEmotion } from './sad/index.js'
export { AngryEmotion } from './angry/index.js'
export { AnxiousEmotion } from './anxious/index.js'
export { ConfidentEmotion } from './confident/index.js'
export { NostalgicEmotion } from './nostalgic/index.js'
export { EmpatheticEmotion } from './empathetic/index.js'
export { CuriousEmotion } from './curious/index.js'
export { ProudEmotion } from './proud/index.js'
export { ConfusedEmotion } from './confused/index.js'
export { NeutralEmotion } from './neutral/index.js'

/**
 * Create an emotion module based on configuration
 */
export function createEmotionModule(type: string, config: any): EmotionModule {
  runtimeLogger.emotion(`💭 Creating emotion module: ${type}`);
  
  try {
    // All emotion types now use the composite module
    switch (type) {
      case 'composite':
      case 'unified':
      case 'rune_emotion_stack': // Legacy compatibility
      case 'basic_emotions':     // Legacy compatibility
      case 'complex_emotions':   // Legacy compatibility
      default:
        runtimeLogger.success(`✅ Creating CompositeEmotionModule with all emotions`);
        return new CompositeEmotionModule(config);
    }
  } catch (error) {
    runtimeLogger.error(`❌ Failed to create emotion module ${type}:`, error);
    runtimeLogger.emotion(`🔄 Creating default CompositeEmotionModule`);
    return new CompositeEmotionModule(config);
  }
}

/**
 * Get all available emotion module types
 */
export function getEmotionModuleTypes(): string[] {
  return ['composite', 'unified', 'rune_emotion_stack', 'basic_emotions', 'complex_emotions'];
}

/**
 * Get all available emotion types
 */
export function getEmotionTypes(): string[] {
  return ['happy', 'sad', 'angry', 'anxious', 'confident', 'nostalgic', 'empathetic', 'curious', 'proud', 'confused', 'neutral'];
}

// Export the composite implementation
export { CompositeEmotionModule } from './composite-emotion.js';
export { BaseEmotion } from './base-emotion.js';

// Registration function
export function registerEmotionModules(registry: any) {
  runtimeLogger.emotion('💭 Registering emotion modules...');
  
  // Register all as using the composite module
  const emotionTypes = getEmotionModuleTypes();
  for (const type of emotionTypes) {
    registry.registerEmotionFactory(type, (config: any) => createEmotionModule(type, config));
  }
  
  runtimeLogger.success(`✅ Emotion module factories registered: ${emotionTypes.join(', ')}`);
}