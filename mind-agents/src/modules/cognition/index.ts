/**
 * Cognition Module Factory
 * 
 * This file exports all available cognition modules and provides factory functions
 * for creating them based on type.
 */

// Simple cognition module implementation for emergency build
class SimpleCognitionModule {
  constructor(public type: string, public config?: any) {}
  
  async think(agent: any, context: any): Promise<any> {
    console.log(`🧠 ${this.type} thinking...`);
    return {
      thoughts: [`I am thinking about: ${context.events?.length || 0} events`],
      emotions: {},
      actions: [],
      memories: [],
      confidence: 0.8
    };
  }
  
  async plan(agent: any, goal: string): Promise<any> {
    console.log(`📋 ${this.type} planning for goal: ${goal}`);
    return {
      id: `plan_${Date.now()}`,
      goal,
      steps: [],
      priority: 1,
      estimatedDuration: 0,
      dependencies: [],
      status: 'pending'
    };
  }
  
  async decide(agent: any, options: any[]): Promise<any> {
    console.log(`🎯 ${this.type} deciding between ${options.length} options`);
    return options[0] || {
      id: `decision_${Date.now()}`,
      description: 'Default decision',
      action: { id: 'default', type: 'wait', parameters: {} },
      confidence: 0.5,
      reasoning: 'Default reasoning',
      consequences: []
    };
  }
}

/**
 * Create a cognition module based on type and configuration
 */
export function createCognitionModule(type: string, config: any) {
  console.log(`🧠 Creating cognition module: ${type}`);
  return new SimpleCognitionModule(type, config);
}

/**
 * Get all available cognition module types
 */
export function getCognitionModuleTypes(): string[] {
  return ['htn_planner', 'reactive', 'hybrid'];
}

// Export simple cognition modules
export const HTNPlannerCognition = SimpleCognitionModule;
export const ReactiveCognition = SimpleCognitionModule;
export const HybridCognition = SimpleCognitionModule;

// Registration function
export function registerCognitionModules(registry: any) {
  console.log('🧠 Registering cognition modules...');
  registry.registerCognitionModule('htn_planner', new SimpleCognitionModule('htn_planner'));
  registry.registerCognitionModule('reactive', new SimpleCognitionModule('reactive'));
  registry.registerCognitionModule('hybrid', new SimpleCognitionModule('hybrid'));
  console.log('✅ Cognition modules registered: htn_planner, reactive, hybrid');
}