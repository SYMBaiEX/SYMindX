/**
 * Emotion module for SYMindX
 * 
 * This module provides different implementations of emotion systems
 * for agents to express and process emotions.
 */

// Simple emotion module implementation for emergency build
class SimpleEmotionModule {
  constructor(public type: string, public config?: any) {}
  
  current = 'neutral'
  intensity = 0.5
  triggers: string[] = []
  history: any[] = []
  
  async update(agent: any, events: any[]): Promise<void> {
    console.log(`💭 ${this.type} processing ${events.length} emotional events`);
    // Simple emotion logic
    if (events.some(e => e.type === 'positive')) {
      this.current = 'happy';
      this.intensity = Math.min(1, this.intensity + 0.1);
    } else if (events.some(e => e.type === 'negative')) {
      this.current = 'sad';
      this.intensity = Math.min(1, this.intensity + 0.1);
    }
  }
  
  async getState(): Promise<any> {
    return {
      current: this.current,
      intensity: this.intensity,
      triggers: this.triggers,
      history: this.history,
      timestamp: new Date()
    };
  }
  
  async setState(state: any): Promise<void> {
    this.current = state.current || 'neutral';
    this.intensity = state.intensity || 0.5;
  }
}

/**
 * Create an emotion module based on configuration
 */
export function createEmotionModule(type: string, config: any) {
  console.log(`💭 Creating emotion module: ${type}`);
  return new SimpleEmotionModule(type, config);
}

/**
 * Get all available emotion module types
 */
export function getEmotionModuleTypes(): string[] {
  return ['rune_emotion_stack', 'basic_emotions', 'complex_emotions'];
}

export const RuneEmotionStack = SimpleEmotionModule;

// Registration function
export function registerEmotionModules(registry: any) {
  console.log('💭 Registering emotion modules...');
  registry.registerEmotionModule('rune_emotion_stack', new SimpleEmotionModule('rune_emotion_stack'));
  registry.registerEmotionModule('basic_emotions', new SimpleEmotionModule('basic_emotions'));
  registry.registerEmotionModule('complex_emotions', new SimpleEmotionModule('complex_emotions'));
  console.log('✅ Emotion modules registered: rune_emotion_stack, basic_emotions, complex_emotions');
}