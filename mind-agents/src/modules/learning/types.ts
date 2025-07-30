/**
 * Advanced Learning System Types for SYMindX
 *
 * Comprehensive type definitions for online learning, few-shot adaptation,
 * neural architecture search, reinforcement learning, and knowledge distillation.
 */

import { Agent, AgentAction, MemoryRecord } from '../../types/agent';
import { EmotionState } from '../../types/emotion';

// Simple Experience and Reward interfaces needed for RL
export interface Experience {
  state: any;
  action: any;
  reward: Reward;
  nextState: any;
  done: boolean;
}

export interface Reward {
  value: number;
  shaped?: number;
  intrinsic?: number;
  extrinsic?: number;
}

/**
 * Learning paradigms supported by the system
 */
export enum LearningParadigm {
  ONLINE_LEARNING = 'online_learning',
  FEW_SHOT = 'few_shot',
  NEURAL_ARCHITECTURE_SEARCH = 'neural_architecture_search',
  REINFORCEMENT_LEARNING = 'reinforcement_learning',
  KNOWLEDGE_DISTILLATION = 'knowledge_distillation',
  META_LEARNING = 'meta_learning',
  CONTINUAL_LEARNING = 'continual_learning',
  TRANSFER_LEARNING = 'transfer_learning',
}

/**
 * Learning module interface
 */
export interface LearningModule {
  id: string;
  paradigm: LearningParadigm;
  initialize(config: LearningConfig): Promise<void>;
  learn(experience: LearningExperience): Promise<LearningUpdate>;
  adapt(context: AdaptationContext): Promise<AdaptationResult>;
  evaluate(testData: TestData): Promise<EvaluationResult>;
  getState(): LearningState;
  setState(state: LearningState): void;
  reset(): void;
}

/**
 * Learning configuration
 */
export interface LearningConfig {
  paradigm: LearningParadigm;
  learningRate?: number;
  batchSize?: number;
  memorySize?: number;
  adaptationSpeed?: number;
  regularization?: RegularizationConfig;
  optimization?: OptimizationConfig;
  hardware?: HardwareConfig;
  [key: string]: any;
}

/**
 * Learning experience data
 */
export interface LearningExperience {
  id: string;
  agentId: string;
  timestamp: Date;
  input: LearningInput;
  output: LearningOutput;
  feedback?: LearningFeedback;
  context?: LearningContext;
  importance: number;
  tags?: string[];
}

/**
 * Learning input types
 */
export interface LearningInput {
  state?: Record<string, any>;
  observation?: any;
  query?: string;
  examples?: Example[];
  features?: number[];
  embeddings?: number[][];
}

/**
 * Learning output types
 */
export interface LearningOutput {
  action?: AgentAction;
  prediction?: any;
  distribution?: number[];
  embeddings?: number[][];
  confidence?: number;
}

/**
 * Learning feedback
 */
export interface LearningFeedback {
  reward?: number;
  correction?: any;
  humanFeedback?: HumanFeedback;
  environmentFeedback?: EnvironmentFeedback;
  success?: boolean;
}

/**
 * Learning context
 */
export interface LearningContext {
  task?: string;
  domain?: string;
  modality?: string; // Added for cross-modal distillation
  constraints?: Constraint[];
  priorKnowledge?: KnowledgeItem[];
  relatedExperiences?: string[];
}

/**
 * Learning update result
 */
export interface LearningUpdate {
  paradigm: LearningParadigm;
  updateType: UpdateType;
  metrics: LearningMetrics;
  changes: ParameterChanges;
  newCapabilities?: string[];
  improvedAreas?: string[];
}

/**
 * Learning state
 */
export interface LearningState {
  paradigm: LearningParadigm;
  parameters: Record<string, any>;
  statistics: LearningStatistics;
  history: LearningHistory;
  checkpoints?: Checkpoint[];
}

/**
 * Online Learning specific types
 */
export interface OnlineLearningConfig extends LearningConfig {
  forgettingRate: number;
  replayBufferSize: number;
  consolidationInterval: number;
  elasticWeightConsolidation?: EWCConfig;
  experienceReplay?: ExperienceReplayConfig;
}

export interface ExperienceReplayBuffer {
  capacity: number;
  experiences: LearningExperience[];
  prioritized: boolean;
  add(experience: LearningExperience): void;
  sample(batchSize: number): LearningExperience[];
  update(id: string, priority: number): void;
  clear(): void;
}

export interface EWCConfig {
  lambda: number; // Importance of previous tasks
  fisherSamples: number;
  fisherUpdateInterval: number;
}

export interface ExperienceReplayConfig {
  prioritized: boolean;
  alpha: number; // Prioritization exponent
  beta: number; // Importance sampling exponent
  maxPriority: number;
}

export interface ContinualLearningStrategy {
  type: 'ewc' | 'si' | 'mas' | 'gem' | 'agem';
  preventForgetting(
    currentTask: Task,
    previousTasks: Task[]
  ): ParameterConstraints;
  consolidate(experiences: LearningExperience[]): void;
}

/**
 * Few-Shot Adaptation types
 */
export interface FewShotConfig extends LearningConfig {
  supportSetSize: number;
  querySetSize: number;
  adaptationSteps: number;
  metaLearningRate: number;
  taskSimilarityThreshold: number;
}

export interface Task {
  id: string;
  name: string;
  description: string;
  supportSet: Example[];
  querySet: Example[];
  taskVector?: number[];
  domain?: string;
}

export interface Example {
  input: any;
  output: any;
  metadata?: Record<string, any>;
}

export interface TaskVector {
  taskId: string;
  embedding: number[];
  performance: number;
  timestamp: Date;
}

export interface AdaptationContext {
  task: Task;
  availableExamples: Example[];
  timeConstraint?: number;
  performanceTarget?: number;
}

export interface AdaptationResult {
  adapted: boolean;
  performance: number;
  adaptationTime: number;
  strategy: string;
  confidence: number;
}

/**
 * Neural Architecture Search types
 */
export interface NASConfig extends LearningConfig {
  searchSpace: SearchSpace;
  searchStrategy: SearchStrategy;
  evaluationBudget: number;
  hardwareConstraints?: HardwareConstraints;
  objectives: Objective[];
}

export interface SearchSpace {
  layers: LayerSearchSpace[];
  connections: ConnectionSearchSpace;
  hyperparameters: HyperparameterSpace;
}

export interface LayerSearchSpace {
  type: 'dense' | 'conv' | 'recurrent' | 'attention' | 'custom';
  sizeRange: [number, number];
  activations: string[];
  optional: boolean;
}

export interface Architecture {
  id: string;
  layers: Layer[];
  connections: Connection[];
  hyperparameters: Record<string, any>;
  performance?: ArchitecturePerformance;
}

export interface Layer {
  id: string;
  type: string;
  size: number;
  activation: string;
  parameters: Record<string, any>;
}

export interface Connection {
  from: string;
  to: string;
  type: 'sequential' | 'skip' | 'attention';
}

export interface ArchitecturePerformance {
  accuracy: number;
  latency: number;
  memoryUsage: number;
  energyConsumption?: number;
  flops?: number;
}

export interface SearchStrategy {
  type: 'evolutionary' | 'reinforcement' | 'gradient' | 'random' | 'bayesian';
  populationSize?: number;
  mutationRate?: number;
  crossoverRate?: number;
  explorationFactor?: number;
}

export interface HardwareConstraints {
  maxMemory: number;
  maxLatency: number;
  maxPower?: number;
  targetDevice: 'cpu' | 'gpu' | 'tpu' | 'edge';
}

export interface Objective {
  name: string;
  type: 'minimize' | 'maximize';
  weight: number;
  metric: (arch: Architecture) => number;
}

/**
 * Reinforcement Learning types
 */
export interface RLConfig extends LearningConfig {
  algorithm: RLAlgorithm;
  discountFactor: number;
  explorationStrategy: ExplorationStrategy;
  rewardShaping?: RewardShaping;
  multiAgent?: MultiAgentConfig;
}

export enum RLAlgorithm {
  DQN = 'dqn',
  PPO = 'ppo',
  A3C = 'a3c',
  SAC = 'sac',
  DDPG = 'ddpg',
  RAINBOW = 'rainbow',
  IMPALA = 'impala',
}

export interface ExplorationStrategy {
  type: 'epsilon_greedy' | 'boltzmann' | 'ucb' | 'thompson';
  initialValue: number;
  decayRate: number;
  minValue: number;
}

export interface RewardShaping {
  shapeReward(
    rawReward: number,
    state: any,
    action: any,
    nextState: any
  ): number;
  potentialFunction?(state: any): number;
}

export interface RewardModel {
  predict(state: any, action: any): number;
  update(feedback: HumanFeedback): void;
  uncertainty(state: any, action: any): number;
}

export interface HumanFeedback {
  stateActionPair: [any, any];
  rating: number;
  comparison?: ComparisonFeedback;
  explanation?: string;
  timestamp: Date;
}

export interface ComparisonFeedback {
  preferred: [any, any];
  rejected: [any, any];
  margin?: number;
}

export interface MultiAgentConfig {
  numAgents: number;
  communicationProtocol: 'broadcast' | 'targeted' | 'none';
  coordinationStrategy: 'centralized' | 'decentralized' | 'hierarchical';
  sharedReward: boolean;
}

export interface Curriculum {
  stages: CurriculumStage[];
  currentStage: number;
  progressMetric: (performance: number) => boolean;
  adaptive: boolean;
}

export interface CurriculumStage {
  name: string;
  difficulty: number;
  tasks: Task[];
  completionCriteria: CompletionCriteria;
  minDuration?: number;
  maxDuration?: number;
}

export interface CompletionCriteria {
  type: 'threshold' | 'improvement' | 'convergence';
  value: number;
  window: number;
}

/**
 * Knowledge Distillation types
 */
export interface DistillationConfig extends LearningConfig {
  teacherModel: TeacherModel;
  temperature: number;
  alpha: number; // Weight for distillation loss
  distillationType: DistillationType;
  compressionRatio?: number;
}

export enum DistillationType {
  RESPONSE_BASED = 'response_based',
  FEATURE_BASED = 'feature_based',
  RELATION_BASED = 'relation_based',
  CROSS_MODAL = 'cross_modal',
}

export interface TeacherModel {
  id: string;
  type: string;
  predict(input: any): TeacherOutput;
  getFeatures(input: any, layer: string): number[][];
  getAttention?(input: any): AttentionMap;
}

export interface TeacherOutput {
  logits: number[];
  features?: Record<string, number[][]>;
  attention?: AttentionMap;
  confidence: number;
}

export interface AttentionMap {
  weights: number[][];
  queries?: number[][];
  keys?: number[][];
  values?: number[][];
}

export interface StudentModel {
  id: string;
  architecture: Architecture;
  predict(input: any): TeacherOutput; // Added missing predict method
  learn(
    input: any,
    teacherOutput: TeacherOutput,
    target?: any
  ): DistillationLoss;
  compress(): CompressedModel;
}

export interface DistillationLoss {
  total: number;
  distillation: number;
  task?: number;
  feature?: number;
  attention?: number;
}

export interface CompressedModel {
  architecture: Architecture;
  parameters: ArrayBuffer;
  compressionRatio: number;
  performanceLoss: number;
}

export interface ModelPruning {
  strategy: 'magnitude' | 'gradient' | 'fisher' | 'lottery';
  sparsity: number;
  structured: boolean;
  iterative: boolean;
  prune(model: StudentModel): PrunedModel;
}

export interface PrunedModel {
  model: StudentModel;
  sparsity: number;
  performanceDrop: number;
  compressionRatio: number;
}

/**
 * Common types across learning paradigms
 */
export interface LearningMetrics {
  loss?: number;
  accuracy?: number;
  perplexity?: number;
  rewards?: number[];
  adaptationSpeed?: number;
  forgettingRate?: number;
  compressionRatio?: number;
  [key: string]: any;
}

export interface LearningStatistics {
  totalExperiences: number;
  totalUpdates: number;
  averagePerformance: number;
  performanceHistory: PerformancePoint[];
  learningCurve: LearningCurve;
}

export interface PerformancePoint {
  timestamp: Date;
  metric: string;
  value: number;
  context?: string;
}

export interface LearningCurve {
  points: [number, number][];
  smoothed: [number, number][];
  trend: 'improving' | 'stable' | 'declining';
  convergence?: number;
}

export interface LearningHistory {
  experiences: string[]; // Experience IDs
  updates: LearningUpdate[];
  checkpoints: Checkpoint[];
  milestones: Milestone[];
}

export interface Checkpoint {
  id: string;
  timestamp: Date;
  state: LearningState;
  performance: LearningMetrics;
  reason: string;
}

export interface Milestone {
  name: string;
  timestamp: Date;
  achievement: string;
  metrics: LearningMetrics;
}

export interface ParameterChanges {
  updated: Record<string, number>;
  added?: Record<string, any>;
  removed?: string[];
  frozen?: string[];
}

export interface ParameterConstraints {
  frozen: Set<string>;
  bounded: Map<string, [number, number]>;
  regularized: Map<string, number>;
}

export enum UpdateType {
  GRADIENT = 'gradient',
  EVOLUTIONARY = 'evolutionary',
  RULE_BASED = 'rule_based',
  ARCHITECTURAL = 'architectural',
  HYPERPARAMETER = 'hyperparameter',
}

export interface TestData {
  examples: Example[];
  domain?: string;
  difficulty?: number;
  metadata?: Record<string, any>;
}

export interface EvaluationResult {
  paradigm: LearningParadigm;
  metrics: LearningMetrics;
  generalization: GeneralizationMetrics;
  robustness: RobustnessMetrics;
  efficiency: EfficiencyMetrics;
}

export interface GeneralizationMetrics {
  inDomain: number;
  outOfDomain: number;
  fewShot: number;
  zeroShot: number;
}

export interface RobustnessMetrics {
  noiseResistance: number;
  adversarialRobustness: number;
  distributionShift: number;
  catastrophicForgetting?: number;
}

export interface EfficiencyMetrics {
  inferenceTime: number;
  memoryUsage: number;
  learningSpeed: number;
  sampleEfficiency: number;
}

export interface Constraint {
  type: 'memory' | 'time' | 'compute' | 'accuracy';
  limit: number;
  priority: number;
}

export interface KnowledgeItem {
  id: string;
  type: 'fact' | 'rule' | 'example' | 'concept';
  content: any;
  confidence: number;
  source?: string;
}

export interface RegularizationConfig {
  l1?: number;
  l2?: number;
  dropout?: number;
  elasticNet?: number;
  spectralNorm?: boolean;
}

export interface OptimizationConfig {
  optimizer: 'sgd' | 'adam' | 'rmsprop' | 'adagrad' | 'lamb';
  schedulerType?: 'constant' | 'linear' | 'cosine' | 'exponential';
  warmupSteps?: number;
  gradientClipping?: number;
}

export interface HardwareConfig {
  device: 'cpu' | 'gpu' | 'tpu';
  precision: 'fp32' | 'fp16' | 'int8';
  parallelism?: 'data' | 'model' | 'pipeline';
  batchingStrategy?: 'dynamic' | 'static';
}

export interface ConnectionSearchSpace {
  allowSkipConnections: boolean;
  maxSkipDistance: number;
  allowAttention: boolean;
  connectionProbability: number;
}

export interface HyperparameterSpace {
  learningRate: [number, number];
  batchSize: number[];
  dropout: [number, number];
  weightDecay: [number, number];
  [key: string]: any;
}

export interface EnvironmentFeedback {
  stateChange: any;
  reward: number;
  done: boolean;
  info?: Record<string, any>;
}

/**
 * Factory function type for creating learning modules
 */
export type LearningModuleFactory = (
  config: LearningConfig
) => Promise<LearningModule>;

/**
 * Learning module registry entry
 */
export interface LearningModuleRegistration {
  paradigm: LearningParadigm;
  factory: LearningModuleFactory;
  description: string;
  capabilities: string[];
  requirements?: string[];
}
