/**
 * Emotion module for SYMindX
 * 
 * This module provides a comprehensive emotion system where each emotion
 * has its own module with specific behaviors and triggers.
 */

import { CompositeEmotionModule } from './composite-emotion.js';
import { EmotionModule } from '../../types/emotion.js';
import { EmotionConfig } from '../../types/agent.js';

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
  console.log(`💭 Creating emotion module: ${type}`);
  
  try {
    // All emotion types now use the composite module
    switch (type) {
      case 'composite':
      case 'unified':
      case 'rune_emotion_stack': // Legacy compatibility
      case 'basic_emotions':     // Legacy compatibility
      case 'complex_emotions':   // Legacy compatibility
      default:
        console.log(`✅ Creating CompositeEmotionModule with all emotions`);
        return new CompositeEmotionModule(config);
    }
  } catch (error) {
    console.error(`❌ Failed to create emotion module ${type}:`, error);
    console.log(`🔄 Creating default CompositeEmotionModule`);
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
  console.log('💭 Registering emotion modules...');
  
  // Register all as using the composite module
  const emotionTypes = getEmotionModuleTypes();
  for (const type of emotionTypes) {
    registry.registerEmotionFactory(type, (config: any) => createEmotionModule(type, config));
  }
  
  console.log(`✅ Emotion module factories registered: ${emotionTypes.join(', ')}`);
}