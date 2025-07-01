/**
 * Emotion module for SYMindX
 * 
 * This module provides different implementations of emotion systems
 * for agents to express and process emotions.
 */

import { RuneEmotionStack } from './rune-emotion-stack.js';
import { EmotionModule } from '../../types/emotion.js';
import { EmotionConfig } from '../../types/agent.js';

// Simple emotion module implementation for basic emotions
class SimpleEmotionModule implements EmotionModule {
  constructor(public type: string, public config?: any) {}
  
  current = 'neutral'
  intensity = 0.5
  triggers: string[] = []
  history: any[] = []
  
  processEvent(eventType: string, context?: any): any {
    console.log(`💭 ${this.type} processing event: ${eventType}`);
    // Simple emotion logic
    if (eventType.includes('positive') || context?.positive) {
      this.current = 'happy';
      this.intensity = Math.min(1, this.intensity + 0.1);
    } else if (eventType.includes('negative') || context?.negative) {
      this.current = 'sad';
      this.intensity = Math.min(1, this.intensity + 0.1);
    }
    return this.getCurrentState();
  }
  
  getCurrentState(): any {
    return {
      current: this.current,
      intensity: this.intensity,
      triggers: this.triggers,
      history: this.history.slice(-10),
      timestamp: new Date()
    };
  }
  
  getCurrentEmotion(): string {
    return this.current;
  }
  
  setEmotion(emotion: string, intensity: number, triggers: string[] = []): any {
    this.current = emotion;
    this.intensity = intensity;
    this.triggers = triggers;
    this.history.push({
      emotion,
      intensity,
      triggers,
      timestamp: new Date(),
      duration: 0
    });
    return this.getCurrentState();
  }
  
  getHistory(limit?: number): any[] {
    const history = [...this.history].reverse();
    return limit ? history.slice(0, limit) : history;
  }
  
  reset(): any {
    this.current = 'neutral';
    this.intensity = 0;
    this.triggers = [];
    this.history = [];
    return this.getCurrentState();
  }
}

/**
 * Create an emotion module based on configuration
 */
export function createEmotionModule(type: string, config: any): EmotionModule {
  console.log(`💭 Creating emotion module: ${type}`);
  
  try {
    switch (type) {
      case 'rune_emotion_stack':
        // Create proper emotion config with defaults
        const emotionConfig: EmotionConfig = {
          sensitivity: config?.intensity_multiplier || 0.8,
          transitionSpeed: config?.transition_speed || 0.5,
          decayRate: config?.decay_rate || 0.1,
          emotionalMemory: config?.emotional_memory ?? true,
          empathyLevel: config?.empathy_level || 0.7,
          emotionalGrowth: config?.emotional_growth ?? true,
          ...config
        };
        
        console.log(`✅ Creating RuneEmotionStack with config:`, emotionConfig);
        return new RuneEmotionStack(emotionConfig);
        
      case 'basic_emotions':
        console.log(`✅ Creating SimpleEmotionModule for basic emotions`);
        return new SimpleEmotionModule(type, config);
        
      case 'complex_emotions':
        console.log(`✅ Creating SimpleEmotionModule for complex emotions`);
        return new SimpleEmotionModule(type, config);
        
      default:
        console.warn(`⚠️ Unknown emotion module type: ${type}, falling back to SimpleEmotionModule`);
        return new SimpleEmotionModule(type, config);
    }
  } catch (error) {
    console.error(`❌ Failed to create emotion module ${type}:`, error);
    console.log(`🔄 Falling back to SimpleEmotionModule`);
    return new SimpleEmotionModule(type, config);
  }
}

/**
 * Get all available emotion module types
 */
export function getEmotionModuleTypes(): string[] {
  return ['rune_emotion_stack', 'basic_emotions', 'complex_emotions'];
}

// Export the actual implementation
export { RuneEmotionStack } from './rune-emotion-stack.js';

// Registration function
export function registerEmotionModules(registry: any) {
  console.log('💭 Registering emotion modules...');
  
  // Register factory functions instead of creating instances
  registry.registerEmotionFactory('rune_emotion_stack', (config: any) => createEmotionModule('rune_emotion_stack', config));
  registry.registerEmotionFactory('basic_emotions', (config: any) => createEmotionModule('basic_emotions', config));
  registry.registerEmotionFactory('complex_emotions', (config: any) => createEmotionModule('complex_emotions', config));
  
  console.log('✅ Emotion module factories registered: rune_emotion_stack, basic_emotions, complex_emotions');
}