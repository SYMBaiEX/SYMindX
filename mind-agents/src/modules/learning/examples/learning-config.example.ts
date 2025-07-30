/**
 * Example configurations for SYMindX Learning System
 *
 * This file demonstrates how to configure different learning paradigms
 * for various use cases and scenarios.
 */

import {
  LearningParadigm,
  OnlineLearningConfig,
  FewShotConfig,
  NASConfig,
  RLConfig,
  DistillationConfig,
  RLAlgorithm,
  DistillationType,
  CurriculumStage,
  CompletionCriteria,
} from '../types';

// Example 1: Online Learning for Continual Knowledge Acquisition
export const onlineLearningConfig: OnlineLearningConfig = {
  paradigm: LearningParadigm.ONLINE_LEARNING,
  learningRate: 0.001,
  batchSize: 32,
  forgettingRate: 0.01,
  replayBufferSize: 10000,
  consolidationInterval: 1000,

  // Elastic Weight Consolidation to prevent catastrophic forgetting
  elasticWeightConsolidation: {
    lambda: 0.5,
    fisherSamples: 100,
    fisherUpdateInterval: 1000,
  },

  // Experience replay configuration
  experienceReplay: {
    prioritized: true,
    alpha: 0.6,
    beta: 0.4,
    maxPriority: 1.0,
  },
};

// Example 2: Few-Shot Learning for Rapid Task Adaptation
export const fewShotConfig: FewShotConfig = {
  paradigm: LearningParadigm.FEW_SHOT,
  supportSetSize: 5, // Learn from 5 examples
  querySetSize: 15, // Test on 15 examples
  adaptationSteps: 10, // 10 gradient steps for adaptation
  metaLearningRate: 0.001,
  learningRate: 0.01, // Inner loop learning rate
  taskSimilarityThreshold: 0.7,
};

// Example 3: Neural Architecture Search for Mobile Deployment
export const nasConfig: NASConfig = {
  paradigm: LearningParadigm.NEURAL_ARCHITECTURE_SEARCH,

  // Define search space
  searchSpace: {
    layers: [
      {
        type: 'dense',
        sizeRange: [16, 128],
        activations: ['relu', 'tanh', 'sigmoid'],
        optional: false,
      },
      {
        type: 'conv',
        sizeRange: [8, 64],
        activations: ['relu', 'leaky_relu'],
        optional: true,
      },
      {
        type: 'attention',
        sizeRange: [32, 256],
        activations: ['softmax'],
        optional: true,
      },
    ],
    connections: {
      allowSkipConnections: true,
      maxSkipDistance: 2,
      allowAttention: true,
      connectionProbability: 0.3,
    },
    hyperparameters: {
      learningRate: [0.0001, 0.1],
      batchSize: [16, 32, 64, 128],
      dropout: [0.0, 0.5],
      weightDecay: [0.0, 0.01],
    },
  },

  // Evolutionary search strategy
  searchStrategy: {
    type: 'evolutionary',
    populationSize: 50,
    mutationRate: 0.1,
    crossoverRate: 0.8,
    explorationFactor: 0.2,
  },

  evaluationBudget: 1000,

  // Hardware constraints for mobile deployment
  hardwareConstraints: {
    maxMemory: 100, // 100MB
    maxLatency: 50, // 50ms
    maxPower: 5, // 5W
    targetDevice: 'edge',
  },

  // Multi-objective optimization
  objectives: [
    {
      name: 'accuracy',
      type: 'maximize',
      weight: 0.5,
      metric: (arch) => arch.performance?.accuracy || 0,
    },
    {
      name: 'latency',
      type: 'minimize',
      weight: 0.3,
      metric: (arch) => arch.performance?.latency || 100,
    },
    {
      name: 'memory',
      type: 'minimize',
      weight: 0.2,
      metric: (arch) => arch.performance?.memoryUsage || 200,
    },
  ],
};

// Example 4: Reinforcement Learning with Human Feedback
export const rlhfConfig: RLConfig = {
  paradigm: LearningParadigm.REINFORCEMENT_LEARNING,
  algorithm: RLAlgorithm.PPO,
  discountFactor: 0.99,
  learningRate: 0.0003,
  batchSize: 64,

  // Exploration strategy
  explorationStrategy: {
    type: 'epsilon_greedy',
    initialValue: 1.0,
    decayRate: 0.995,
    minValue: 0.01,
  },

  // Reward shaping for better learning
  rewardShaping: {
    shapeReward: (rawReward, state, action, nextState) => {
      // Add potential-based shaping
      const potential = (state: any) =>
        state.distanceToGoal ? -state.distanceToGoal : 0;
      const phi = potential(state);
      const phiNext = potential(nextState);
      return rawReward + 0.99 * phiNext - phi;
    },
  },

  // Multi-agent configuration
  multiAgent: {
    numAgents: 4,
    communicationProtocol: 'targeted',
    coordinationStrategy: 'decentralized',
    sharedReward: false,
  },

  // Curriculum learning stages
  curriculum: {
    stages: [
      {
        name: 'basic_navigation',
        difficulty: 0.1,
        tasks: [
          {
            id: 'move_forward',
            name: 'Move Forward',
            description: 'Learn to move in a straight line',
            supportSet: [],
            querySet: [],
          },
        ],
        completionCriteria: {
          type: 'threshold',
          value: 0.8,
          window: 10,
        },
      },
      {
        name: 'obstacle_avoidance',
        difficulty: 0.5,
        tasks: [
          {
            id: 'avoid_obstacles',
            name: 'Avoid Obstacles',
            description: 'Navigate around simple obstacles',
            supportSet: [],
            querySet: [],
          },
        ],
        completionCriteria: {
          type: 'threshold',
          value: 0.9,
          window: 20,
        },
      },
      {
        name: 'goal_reaching',
        difficulty: 1.0,
        tasks: [
          {
            id: 'reach_goal',
            name: 'Reach Goal',
            description: 'Navigate to specific target locations',
            supportSet: [],
            querySet: [],
          },
        ],
        completionCriteria: {
          type: 'convergence',
          value: 0.01,
          window: 50,
        },
      },
    ],
    currentStage: 0,
    progressMetric: (performance) => performance > 0.8,
    adaptive: true,
  },
};

// Example 5: Knowledge Distillation for Model Compression
export const distillationConfig: DistillationConfig = {
  paradigm: LearningParadigm.KNOWLEDGE_DISTILLATION,

  // Teacher model (would be replaced with actual model)
  teacherModel: {
    id: 'large_language_model',
    type: 'transformer',
    predict: (input: any) => ({
      logits: [0.1, 0.8, 0.1],
      confidence: 0.9,
    }),
    getFeatures: (input: any, layer: string) => [
      [0.1, 0.2],
      [0.3, 0.4],
    ],
  },

  temperature: 3.0, // Softening temperature
  alpha: 0.7, // Weight for distillation loss
  distillationType: DistillationType.FEATURE_BASED,
  compressionRatio: 10, // Compress to 1/10th the size

  learningRate: 0.001,
  batchSize: 32,

  // Optimization configuration
  optimization: {
    optimizer: 'adam',
    schedulerType: 'cosine',
    warmupSteps: 1000,
    gradientClipping: 1.0,
  },

  // Regularization to prevent overfitting
  regularization: {
    l2: 0.01,
    dropout: 0.1,
  },
};

// Example 6: Hybrid Learning System Configuration
export const hybridLearningConfig = [
  {
    paradigm: LearningParadigm.ONLINE_LEARNING,
    config: onlineLearningConfig,
    weight: 0.4, // 40% weight for continual learning
  },
  {
    paradigm: LearningParadigm.FEW_SHOT,
    config: fewShotConfig,
    weight: 0.3, // 30% weight for rapid adaptation
  },
  {
    paradigm: LearningParadigm.REINFORCEMENT_LEARNING,
    config: rlhfConfig,
    weight: 0.3, // 30% weight for reward-based learning
  },
];

// Example 7: Domain-Specific Configurations

// Scientific Research Assistant
export const scientificResearchConfig: FewShotConfig = {
  paradigm: LearningParadigm.FEW_SHOT,
  supportSetSize: 3, // Learn from few research papers
  querySetSize: 10,
  adaptationSteps: 20, // More steps for complex reasoning
  metaLearningRate: 0.0005,
  learningRate: 0.005,
  taskSimilarityThreshold: 0.8, // High similarity for scientific domains
};

// Creative Writing Assistant
export const creativeWritingConfig: OnlineLearningConfig = {
  paradigm: LearningParadigm.ONLINE_LEARNING,
  learningRate: 0.0001, // Slow learning to preserve creativity
  forgettingRate: 0.005, // Low forgetting for style consistency
  replayBufferSize: 5000,
  consolidationInterval: 2000,
  experienceReplay: {
    prioritized: true,
    alpha: 0.4, // Less aggressive prioritization
    beta: 0.6,
    maxPriority: 1.0,
  },
};

// Gaming AI with Curriculum Learning
export const gamingAIConfig: RLConfig = {
  paradigm: LearningParadigm.REINFORCEMENT_LEARNING,
  algorithm: RLAlgorithm.DQN,
  discountFactor: 0.95,
  learningRate: 0.001,

  explorationStrategy: {
    type: 'boltzmann',
    initialValue: 2.0,
    decayRate: 0.999,
    minValue: 0.1,
  },

  curriculum: {
    stages: [
      {
        name: 'tutorial',
        difficulty: 0.1,
        tasks: [
          {
            id: 'basic_controls',
            name: 'Basic Controls',
            description: 'Learn basic game controls',
            supportSet: [],
            querySet: [],
          },
        ],
        completionCriteria: { type: 'threshold', value: 0.95, window: 5 },
      },
      {
        name: 'beginner',
        difficulty: 0.3,
        tasks: [
          {
            id: 'simple_strategy',
            name: 'Simple Strategy',
            description: 'Develop basic game strategies',
            supportSet: [],
            querySet: [],
          },
        ],
        completionCriteria: { type: 'threshold', value: 0.85, window: 10 },
      },
      {
        name: 'advanced',
        difficulty: 0.8,
        tasks: [
          {
            id: 'complex_strategy',
            name: 'Complex Strategy',
            description: 'Master advanced game mechanics',
            supportSet: [],
            querySet: [],
          },
        ],
        completionCriteria: { type: 'improvement', value: 0.1, window: 20 },
      },
    ],
    currentStage: 0,
    progressMetric: (perf) => perf > 0.9,
    adaptive: true,
  },
};

// Edge Computing Deployment
export const edgeDeploymentConfig: DistillationConfig = {
  paradigm: LearningParadigm.KNOWLEDGE_DISTILLATION,
  teacherModel: {
    id: 'cloud_model',
    type: 'large_transformer',
    predict: (input: any) => ({ logits: [], confidence: 0.9 }),
    getFeatures: (input: any, layer: string) => [[]],
  },
  temperature: 4.0,
  alpha: 0.8,
  distillationType: DistillationType.RESPONSE_BASED,
  compressionRatio: 50, // Aggressive compression for edge

  // Hardware-specific optimization
  hardware: {
    device: 'cpu',
    precision: 'int8',
    parallelism: 'data',
    batchingStrategy: 'dynamic',
  },
};

// Export all configurations
export const exampleConfigs = {
  onlineLearning: onlineLearningConfig,
  fewShot: fewShotConfig,
  nas: nasConfig,
  rlhf: rlhfConfig,
  distillation: distillationConfig,
  hybrid: hybridLearningConfig,
  scientificResearch: scientificResearchConfig,
  creativeWriting: creativeWritingConfig,
  gamingAI: gamingAIConfig,
  edgeDeployment: edgeDeploymentConfig,
};
