/**
 * Learning Module System for SYMindX
 *
 * Central hub for all advanced learning capabilities including:
 * - Online learning without catastrophic forgetting
 * - Few-shot adaptation and meta-learning
 * - Neural architecture search
 * - Reinforcement learning with human feedback
 * - Knowledge distillation and compression
 */

import {
  LearningModule,
  LearningModuleFactory,
  LearningModuleRegistration,
  LearningConfig,
  LearningParadigm,
  OnlineLearningConfig,
  FewShotConfig,
  NASConfig,
  RLConfig,
  DistillationConfig,
} from './types';

// Import all learning modules
import { OnlineLearningModule, createOnlineLearningModule } from './online';
import {
  FewShotAdaptationModule,
  createFewShotAdaptationModule,
} from './adaptation';
import {
  NeuralArchitectureSearchModule,
  createNeuralArchitectureSearchModule,
} from './nas';
import {
  ReinforcementLearningModule,
  createReinforcementLearningModule,
} from './rl';
import {
  KnowledgeDistillationModule,
  createKnowledgeDistillationModule,
} from './distillation';

// Export all types
export * from './types';
export * from './base-learning-module';

// Export individual modules
export {
  OnlineLearningModule,
  FewShotAdaptationModule,
  NeuralArchitectureSearchModule,
  ReinforcementLearningModule,
  KnowledgeDistillationModule,
};

/**
 * Registry of available learning modules
 */
const learningModuleRegistry: Map<
  LearningParadigm,
  LearningModuleRegistration
> = new Map();

/**
 * Register all built-in learning modules
 */
function registerBuiltInModules(): void {
  // Online Learning
  learningModuleRegistry.set(LearningParadigm.ONLINE_LEARNING, {
    paradigm: LearningParadigm.ONLINE_LEARNING,
    factory: createOnlineLearningModule as LearningModuleFactory,
    description: 'Continual learning without catastrophic forgetting',
    capabilities: [
      'experience_replay',
      'elastic_weight_consolidation',
      'incremental_learning',
      'forgetting_prevention',
    ],
    requirements: ['memory_buffer', 'gradient_computation'],
  });

  // Few-Shot Adaptation
  learningModuleRegistry.set(LearningParadigm.FEW_SHOT, {
    paradigm: LearningParadigm.FEW_SHOT,
    factory: createFewShotAdaptationModule as LearningModuleFactory,
    description: 'Rapid adaptation from few examples',
    capabilities: [
      'in_context_learning',
      'meta_learning',
      'task_vectors',
      'cross_agent_transfer',
    ],
    requirements: ['example_storage', 'similarity_computation'],
  });

  // Neural Architecture Search
  learningModuleRegistry.set(LearningParadigm.NEURAL_ARCHITECTURE_SEARCH, {
    paradigm: LearningParadigm.NEURAL_ARCHITECTURE_SEARCH,
    factory: createNeuralArchitectureSearchModule as LearningModuleFactory,
    description: 'Automated architecture optimization',
    capabilities: [
      'evolutionary_search',
      'hardware_aware_optimization',
      'multi_objective_optimization',
      'architecture_compression',
    ],
    requirements: ['evaluation_budget', 'search_space_definition'],
  });

  // Reinforcement Learning
  learningModuleRegistry.set(LearningParadigm.REINFORCEMENT_LEARNING, {
    paradigm: LearningParadigm.REINFORCEMENT_LEARNING,
    factory: createReinforcementLearningModule as LearningModuleFactory,
    description: 'Learning from environmental feedback and human preferences',
    capabilities: [
      'human_feedback_integration',
      'reward_modeling',
      'multi_agent_coordination',
      'curriculum_learning',
    ],
    requirements: ['environment_interface', 'reward_signal'],
  });

  // Knowledge Distillation
  learningModuleRegistry.set(LearningParadigm.KNOWLEDGE_DISTILLATION, {
    paradigm: LearningParadigm.KNOWLEDGE_DISTILLATION,
    factory: createKnowledgeDistillationModule as LearningModuleFactory,
    description: 'Knowledge compression and transfer',
    capabilities: [
      'teacher_student_learning',
      'model_compression',
      'cross_modal_transfer',
      'efficient_deployment',
    ],
    requirements: ['teacher_model', 'compression_target'],
  });

  // Meta-Learning
  learningModuleRegistry.set(LearningParadigm.META_LEARNING, {
    paradigm: LearningParadigm.META_LEARNING,
    factory: createFewShotAdaptationModule as LearningModuleFactory, // Reuse few-shot for meta-learning
    description: 'Learning to learn - optimizing the learning process itself',
    capabilities: [
      'learning_algorithm_optimization',
      'hyperparameter_adaptation',
      'task_distribution_modeling',
      'fast_adaptation',
    ],
  });

  // Continual Learning
  learningModuleRegistry.set(LearningParadigm.CONTINUAL_LEARNING, {
    paradigm: LearningParadigm.CONTINUAL_LEARNING,
    factory: createOnlineLearningModule as LearningModuleFactory, // Reuse online learning
    description: 'Sequential task learning without forgetting',
    capabilities: [
      'task_incremental_learning',
      'domain_incremental_learning',
      'class_incremental_learning',
      'memory_management',
    ],
  });

  // Transfer Learning
  learningModuleRegistry.set(LearningParadigm.TRANSFER_LEARNING, {
    paradigm: LearningParadigm.TRANSFER_LEARNING,
    factory: createFewShotAdaptationModule as LearningModuleFactory, // Reuse few-shot for transfer
    description: 'Leveraging knowledge from related tasks',
    capabilities: [
      'domain_adaptation',
      'feature_transfer',
      'fine_tuning',
      'zero_shot_transfer',
    ],
  });
}

// Initialize registry
registerBuiltInModules();

/**
 * Create a learning module based on configuration
 */
export async function createLearningModule(
  paradigm: LearningParadigm,
  config: LearningConfig
): Promise<LearningModule> {
  const registration = learningModuleRegistry.get(paradigm);

  if (!registration) {
    throw new Error(`Unknown learning paradigm: ${paradigm}`);
  }

  // Validate config based on paradigm
  validateConfig(paradigm, config);

  // Create module using factory
  const module = await registration.factory(config);

  return module;
}

/**
 * Get information about a learning paradigm
 */
export function getLearningParadigmInfo(
  paradigm: LearningParadigm
): LearningModuleRegistration | undefined {
  return learningModuleRegistry.get(paradigm);
}

/**
 * List all available learning paradigms
 */
export function listLearningParadigms(): LearningParadigm[] {
  return Array.from(learningModuleRegistry.keys());
}

/**
 * Get capabilities of a learning paradigm
 */
export function getLearningCapabilities(paradigm: LearningParadigm): string[] {
  const registration = learningModuleRegistry.get(paradigm);
  return registration?.capabilities || [];
}

/**
 * Validate configuration for a specific paradigm
 */
function validateConfig(
  paradigm: LearningParadigm,
  config: LearningConfig
): void {
  // Basic validation
  if (!config.paradigm || config.paradigm !== paradigm) {
    throw new Error(
      `Config paradigm ${config.paradigm} does not match requested ${paradigm}`
    );
  }

  // Paradigm-specific validation
  switch (paradigm) {
    case LearningParadigm.ONLINE_LEARNING:
      const olConfig = config as OnlineLearningConfig;
      if (
        !olConfig.forgettingRate ||
        !olConfig.replayBufferSize ||
        !olConfig.consolidationInterval
      ) {
        throw new Error(
          'Online learning requires forgettingRate, replayBufferSize, and consolidationInterval'
        );
      }
      break;

    case LearningParadigm.FEW_SHOT:
      const fsConfig = config as FewShotConfig;
      if (
        !fsConfig.supportSetSize ||
        !fsConfig.querySetSize ||
        !fsConfig.adaptationSteps
      ) {
        throw new Error(
          'Few-shot learning requires supportSetSize, querySetSize, and adaptationSteps'
        );
      }
      break;

    case LearningParadigm.NEURAL_ARCHITECTURE_SEARCH:
      const nasConfig = config as NASConfig;
      if (
        !nasConfig.searchSpace ||
        !nasConfig.searchStrategy ||
        !nasConfig.objectives
      ) {
        throw new Error(
          'NAS requires searchSpace, searchStrategy, and objectives'
        );
      }
      break;

    case LearningParadigm.REINFORCEMENT_LEARNING:
      const rlConfig = config as RLConfig;
      if (
        !rlConfig.algorithm ||
        !rlConfig.discountFactor ||
        !rlConfig.explorationStrategy
      ) {
        throw new Error(
          'RL requires algorithm, discountFactor, and explorationStrategy'
        );
      }
      break;

    case LearningParadigm.KNOWLEDGE_DISTILLATION:
      const kdConfig = config as DistillationConfig;
      if (
        !kdConfig.teacherModel ||
        !kdConfig.temperature ||
        kdConfig.alpha === undefined
      ) {
        throw new Error(
          'Knowledge distillation requires teacherModel, temperature, and alpha'
        );
      }
      break;
  }
}

/**
 * Create a hybrid learning system combining multiple paradigms
 */
export async function createHybridLearningSystem(
  paradigms: Array<{
    paradigm: LearningParadigm;
    config: LearningConfig;
    weight: number;
  }>
): Promise<{
  modules: Map<LearningParadigm, LearningModule>;
  weights: Map<LearningParadigm, number>;
  coordinate: (experience: any) => Promise<any>;
}> {
  const modules = new Map<LearningParadigm, LearningModule>();
  const weights = new Map<LearningParadigm, number>();

  // Create all modules
  for (const { paradigm, config, weight } of paradigms) {
    const module = await createLearningModule(paradigm, config);
    modules.set(paradigm, module);
    weights.set(paradigm, weight);
  }

  // Normalize weights
  const totalWeight = Array.from(weights.values()).reduce((a, b) => a + b, 0);
  for (const [paradigm, weight] of weights.entries()) {
    weights.set(paradigm, weight / totalWeight);
  }

  // Coordination function
  const coordinate = async (experience: any) => {
    const results = new Map();

    // Run all modules in parallel
    const promises = Array.from(modules.entries()).map(
      async ([paradigm, module]) => {
        const result = await module.learn(experience);
        results.set(paradigm, result);
      }
    );

    await Promise.all(promises);

    // Combine results based on weights
    let combinedUpdate: any = {
      paradigm: 'hybrid',
      metrics: {},
      changes: { updated: {} },
    };

    for (const [paradigm, result] of results.entries()) {
      const weight = weights.get(paradigm)!;

      // Combine metrics
      for (const [key, value] of Object.entries(result.metrics || {})) {
        if (typeof value === 'number') {
          combinedUpdate.metrics[`${paradigm}_${key}`] = value;
          combinedUpdate.metrics[key] =
            (combinedUpdate.metrics[key] || 0) + value * weight;
        }
      }

      // Combine parameter changes
      for (const [key, value] of Object.entries(
        result.changes?.updated || {}
      )) {
        if (typeof value === 'number') {
          combinedUpdate.changes.updated[key] =
            (combinedUpdate.changes.updated[key] || 0) + value * weight;
        }
      }
    }

    return combinedUpdate;
  };

  return { modules, weights, coordinate };
}

/**
 * Utility function to suggest best learning paradigm for a task
 */
export function suggestLearningParadigm(taskCharacteristics: {
  dataAvailability: 'abundant' | 'limited' | 'none';
  feedbackType: 'supervised' | 'reward' | 'human' | 'none';
  adaptationSpeed: 'immediate' | 'fast' | 'gradual';
  deploymentConstraints?: 'size' | 'speed' | 'accuracy';
  taskVariability: 'static' | 'dynamic' | 'evolving';
}): LearningParadigm[] {
  const suggestions: LearningParadigm[] = [];

  // Data availability
  if (taskCharacteristics.dataAvailability === 'limited') {
    suggestions.push(LearningParadigm.FEW_SHOT);
    suggestions.push(LearningParadigm.TRANSFER_LEARNING);
  } else if (taskCharacteristics.dataAvailability === 'abundant') {
    suggestions.push(LearningParadigm.KNOWLEDGE_DISTILLATION);
    suggestions.push(LearningParadigm.NEURAL_ARCHITECTURE_SEARCH);
  }

  // Feedback type
  if (
    taskCharacteristics.feedbackType === 'reward' ||
    taskCharacteristics.feedbackType === 'human'
  ) {
    suggestions.push(LearningParadigm.REINFORCEMENT_LEARNING);
  }

  // Adaptation speed
  if (taskCharacteristics.adaptationSpeed === 'immediate') {
    suggestions.push(LearningParadigm.FEW_SHOT);
    suggestions.push(LearningParadigm.META_LEARNING);
  } else if (taskCharacteristics.adaptationSpeed === 'gradual') {
    suggestions.push(LearningParadigm.ONLINE_LEARNING);
    suggestions.push(LearningParadigm.CONTINUAL_LEARNING);
  }

  // Deployment constraints
  if (taskCharacteristics.deploymentConstraints === 'size') {
    suggestions.push(LearningParadigm.KNOWLEDGE_DISTILLATION);
  } else if (taskCharacteristics.deploymentConstraints === 'speed') {
    suggestions.push(LearningParadigm.NEURAL_ARCHITECTURE_SEARCH);
  }

  // Task variability
  if (taskCharacteristics.taskVariability === 'evolving') {
    suggestions.push(LearningParadigm.CONTINUAL_LEARNING);
    suggestions.push(LearningParadigm.ONLINE_LEARNING);
  }

  // Remove duplicates and return
  return Array.from(new Set(suggestions));
}

/**
 * Register all learning modules with the module registry
 */
export async function registerLearningModules(registry: any): Promise<void> {
  // Register factory functions for each learning paradigm
  for (const [paradigm, registration] of learningModuleRegistry.entries()) {
    registry.registerModuleFactory('learning', paradigm, registration.factory);
  }
}

// Re-export factory functions for direct access
export {
  createOnlineLearningModule,
  createFewShotAdaptationModule,
  createNeuralArchitectureSearchModule,
  createReinforcementLearningModule,
  createKnowledgeDistillationModule,
};
