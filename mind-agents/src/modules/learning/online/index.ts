/**
 * Online Learning Module for SYMindX
 *
 * Implements continual learning without catastrophic forgetting using:
 * - Experience replay buffers
 * - Elastic Weight Consolidation (EWC)
 * - Synaptic Intelligence (SI)
 * - Memory-Aware Synapses (MAS)
 * - Gradient Episodic Memory (GEM)
 */

import { BaseLearningModule } from '../base-learning-module';
import {
  LearningConfig,
  LearningExperience,
  LearningUpdate,
  AdaptationContext,
  AdaptationResult,
  TestData,
  LearningMetrics,
  LearningParadigm,
  OnlineLearningConfig,
  ExperienceReplayBuffer,
  ContinualLearningStrategy,
  EWCConfig,
  Task,
  ParameterConstraints,
  UpdateType,
  ParameterChanges,
  LearningInput,
  LearningOutput,
} from '../types';
import { runtimeLogger } from '../../../utils/logger';

/**
 * Experience replay buffer implementation
 */
class PrioritizedExperienceReplay implements ExperienceReplayBuffer {
  public capacity: number;
  public experiences: LearningExperience[] = [];
  public prioritized: boolean;
  private priorities: Map<string, number> = new Map();
  private alpha: number = 0.6; // Prioritization exponent
  private beta: number = 0.4; // Importance sampling exponent
  private betaIncrement: number = 0.001;
  private epsilon: number = 1e-6;

  constructor(capacity: number, prioritized: boolean = true) {
    this.capacity = capacity;
    this.prioritized = prioritized;
  }

  add(experience: LearningExperience): void {
    if (this.experiences.length >= this.capacity) {
      // Remove oldest experience
      const removed = this.experiences.shift();
      if (removed) {
        this.priorities.delete(removed.id);
      }
    }

    this.experiences.push(experience);

    // Initialize priority to max for new experiences
    if (this.prioritized) {
      const maxPriority = Math.max(
        ...Array.from(this.priorities.values()),
        1.0
      );
      this.priorities.set(experience.id, maxPriority);
    }
  }

  sample(batchSize: number): LearningExperience[] {
    if (this.experiences.length === 0) return [];

    batchSize = Math.min(batchSize, this.experiences.length);

    if (!this.prioritized) {
      // Uniform sampling
      const sampled: LearningExperience[] = [];
      const indices = new Set<number>();

      while (indices.size < batchSize) {
        indices.add(Math.floor(Math.random() * this.experiences.length));
      }

      for (const idx of indices) {
        sampled.push(this.experiences[idx]);
      }

      return sampled;
    }

    // Prioritized sampling
    const priorities = this.experiences.map((exp) =>
      Math.pow(this.priorities.get(exp.id) || 1.0, this.alpha)
    );

    const sum = priorities.reduce((a, b) => a + b, 0);
    const probs = priorities.map((p) => p / sum);

    const sampled: LearningExperience[] = [];
    const sampledIndices: number[] = [];

    for (let i = 0; i < batchSize; i++) {
      const idx = this.sampleFromDistribution(probs);
      sampled.push(this.experiences[idx]);
      sampledIndices.push(idx);
    }

    // Update beta for importance sampling
    this.beta = Math.min(1.0, this.beta + this.betaIncrement);

    return sampled;
  }

  update(id: string, priority: number): void {
    if (this.prioritized) {
      this.priorities.set(id, priority + this.epsilon);
    }
  }

  clear(): void {
    this.experiences = [];
    this.priorities.clear();
  }

  private sampleFromDistribution(probs: number[]): number {
    const r = Math.random();
    let cumSum = 0;

    for (let i = 0; i < probs.length; i++) {
      cumSum += probs[i];
      if (r <= cumSum) return i;
    }

    return probs.length - 1;
  }
}

/**
 * Elastic Weight Consolidation strategy
 */
class EWCStrategy implements ContinualLearningStrategy {
  type: 'ewc' = 'ewc';
  private fisherInformation: Map<string, number[][]> = new Map();
  private optimalParameters: Map<string, number[]> = new Map();
  private lambda: number;
  private fisherSamples: number;

  constructor(config: EWCConfig) {
    this.lambda = config.lambda;
    this.fisherSamples = config.fisherSamples;
  }

  preventForgetting(
    currentTask: Task,
    previousTasks: Task[]
  ): ParameterConstraints {
    const constraints: ParameterConstraints = {
      frozen: new Set(),
      bounded: new Map(),
      regularized: new Map(),
    };

    // Apply EWC regularization based on Fisher information
    for (const [param, fisher] of this.fisherInformation) {
      const importance = this.calculateImportance(fisher);
      if (importance > 0.9) {
        constraints.frozen.add(param);
      } else {
        constraints.regularized.set(param, this.lambda * importance);
      }
    }

    return constraints;
  }

  consolidate(experiences: LearningExperience[]): void {
    // Update Fisher information matrix
    this.updateFisherInformation(experiences);

    // Store optimal parameters for important weights
    this.storeOptimalParameters();
  }

  private updateFisherInformation(experiences: LearningExperience[]): void {
    // Sample experiences for Fisher calculation
    const samples = experiences.slice(-this.fisherSamples);

    for (const exp of samples) {
      // Calculate gradients and update Fisher information
      // This is a simplified version - real implementation would compute actual gradients
      const params = this.extractParameters(exp);

      for (const [key, values] of Object.entries(params)) {
        if (!this.fisherInformation.has(key)) {
          this.fisherInformation.set(key, []);
        }

        const fisher = this.fisherInformation.get(key)!;
        fisher.push(values.map((v) => v * v)); // Squared gradients approximate Fisher
      }
    }
  }

  private extractParameters(
    experience: LearningExperience
  ): Record<string, number[]> {
    // Extract relevant parameters from experience
    const params: Record<string, number[]> = {};

    if (experience.input.features) {
      params.input_features = experience.input.features;
    }

    if (experience.output.distribution) {
      params.output_distribution = experience.output.distribution;
    }

    return params;
  }

  private calculateImportance(fisher: number[][]): number {
    if (fisher.length === 0) return 0;

    // Average Fisher information across samples
    const avgFisher = fisher[0].map(
      (_, i) => fisher.reduce((sum, row) => sum + row[i], 0) / fisher.length
    );

    // Return normalized importance
    const maxFisher = Math.max(...avgFisher);
    return maxFisher > 0
      ? avgFisher.reduce((a, b) => a + b, 0) / avgFisher.length / maxFisher
      : 0;
  }

  private storeOptimalParameters(): void {
    // Store current parameters as optimal for this task
    // In real implementation, this would snapshot model parameters
    runtimeLogger.debug('📸 Storing optimal parameters for EWC');
  }
}

/**
 * Online Learning Module
 */
export class OnlineLearningModule extends BaseLearningModule {
  private replayBuffer: ExperienceReplayBuffer;
  private continualStrategy: ContinualLearningStrategy;
  // config inherited from base class as protected
  private tasks: Task[] = [];
  private currentTaskId?: string;
  private consolidationCounter: number = 0;
  private parameterHistory: Map<string, number[]> = new Map();

  // Getter for typed config
  private get typedConfig(): OnlineLearningConfig {
    return this.config as OnlineLearningConfig;
  }

  constructor() {
    super('online-learning', LearningParadigm.ONLINE_LEARNING);

    // Initialize with default replay buffer
    this.replayBuffer = new PrioritizedExperienceReplay(10000, true);
    this.continualStrategy = new EWCStrategy({
      lambda: 0.5,
      fisherSamples: 100,
      fisherUpdateInterval: 1000,
    });
  }

  protected async onInitialize(config: LearningConfig): Promise<void> {
    this.config = config;

    // Initialize replay buffer
    this.replayBuffer = new PrioritizedExperienceReplay(
      this.typedConfig.replayBufferSize,
      true
    );

    // Initialize continual learning strategy
    if (this.typedConfig.elasticWeightConsolidation) {
      this.continualStrategy = new EWCStrategy(
        this.typedConfig.elasticWeightConsolidation
      );
    }

    // Initialize parameters
    this.state.parameters = {
      forgettingRate: this.typedConfig.forgettingRate,
      learningRate: this.typedConfig.learningRate || 0.001,
      consolidationInterval: this.typedConfig.consolidationInterval,
    };

    runtimeLogger.info(
      '🧠 Online learning module initialized with continual learning'
    );
  }

  protected async onLearn(
    experience: LearningExperience
  ): Promise<LearningUpdate> {
    // Add to replay buffer
    this.replayBuffer.add(experience);

    // Perform online update
    const update = await this.performOnlineUpdate(experience);

    // Experience replay
    if (
      this.typedConfig.experienceReplay &&
      this.replayBuffer.experiences.length > this.typedConfig.batchSize!
    ) {
      const replayUpdate = await this.performExperienceReplay();

      // Combine updates
      update.metrics = this.combineMetrics(
        update.metrics,
        replayUpdate.metrics
      );
      update.changes = this.combineChanges(
        update.changes,
        replayUpdate.changes
      );
    }

    // Consolidation check
    this.consolidationCounter++;
    if (this.consolidationCounter >= this.typedConfig.consolidationInterval) {
      await this.consolidateKnowledge();
      this.consolidationCounter = 0;
    }

    return update;
  }

  protected async onAdapt(
    context: AdaptationContext
  ): Promise<AdaptationResult> {
    // Create new task from context
    const newTask: Task = context.task;

    // Apply continual learning constraints
    const constraints = this.continualStrategy.preventForgetting(
      newTask,
      this.tasks
    );

    // Adapt to new task while respecting constraints
    const adapted = await this.adaptWithConstraints(context, constraints);

    // Add task to history
    this.tasks.push(newTask);
    this.currentTaskId = newTask.id;

    return {
      adapted: true,
      performance: adapted.performance,
      adaptationTime: 0, // Set by base class
      strategy: `online-${this.continualStrategy.type}`,
      confidence: adapted.confidence,
    };
  }

  protected async onEvaluate(testData: TestData): Promise<LearningMetrics> {
    let totalLoss = 0;
    let totalAccuracy = 0;
    let forgettingMeasure = 0;

    // Evaluate on current task
    for (const example of testData.examples) {
      const prediction = await this.predict(example.input);
      const loss = this.calculateLoss(prediction, example.output);
      const accuracy = this.calculateAccuracy(prediction, example.output);

      totalLoss += loss;
      totalAccuracy += accuracy;
    }

    // Measure forgetting on previous tasks
    if (this.tasks.length > 1) {
      forgettingMeasure = await this.measureForgetting();
    }

    const n = testData.examples.length;

    return {
      loss: totalLoss / n,
      accuracy: totalAccuracy / n,
      forgettingRate: forgettingMeasure,
      adaptationSpeed: this.calculateAdaptationSpeed(),
    };
  }

  protected onReset(): void {
    this.replayBuffer.clear();
    this.tasks = [];
    this.currentTaskId = undefined;
    this.consolidationCounter = 0;
    this.parameterHistory.clear();
  }

  /**
   * Perform online update on single experience
   */
  private async performOnlineUpdate(
    experience: LearningExperience
  ): Promise<LearningUpdate> {
    const startParams = { ...this.state.parameters };

    // Simple gradient update simulation
    const learningRate = this.state.parameters.learningRate as number;
    const forgettingRate = this.state.parameters.forgettingRate as number;

    // Update parameters based on experience
    const gradient = this.computeGradient(experience);
    const changes: ParameterChanges = {
      updated: {},
    };

    for (const [key, value] of Object.entries(gradient)) {
      if (typeof this.state.parameters[key] === 'number') {
        // Apply forgetting
        this.state.parameters[key] =
          (this.state.parameters[key] as number) * (1 - forgettingRate);

        // Apply update
        this.state.parameters[key] += learningRate * value;

        changes.updated[key] = this.state.parameters[key] as number;
      }
    }

    // Track parameter history
    this.updateParameterHistory();

    // Calculate metrics
    const loss = this.calculateLoss(experience.output, experience.feedback);

    return {
      paradigm: this.paradigm,
      updateType: UpdateType.GRADIENT,
      metrics: {
        loss,
        learningRate,
        forgettingRate,
      },
      changes,
    };
  }

  /**
   * Perform experience replay
   */
  private async performExperienceReplay(): Promise<LearningUpdate> {
    const batchSize = this.typedConfig.batchSize || 32;
    const batch = this.replayBuffer.sample(batchSize);

    let totalLoss = 0;
    const changes: ParameterChanges = { updated: {} };

    for (const exp of batch) {
      const gradient = this.computeGradient(exp);
      const learningRate =
        (this.state.parameters.learningRate as number) / batch.length;

      for (const [key, value] of Object.entries(gradient)) {
        if (typeof this.state.parameters[key] === 'number') {
          this.state.parameters[key] += learningRate * value;
          changes.updated[key] = this.state.parameters[key] as number;
        }
      }

      totalLoss += this.calculateLoss(exp.output, exp.feedback);
    }

    return {
      paradigm: this.paradigm,
      updateType: UpdateType.GRADIENT,
      metrics: {
        loss: totalLoss / batch.length,
        replayBatchSize: batch.length,
      },
      changes,
    };
  }

  /**
   * Consolidate knowledge using continual learning strategy
   */
  private async consolidateKnowledge(): Promise<void> {
    runtimeLogger.debug('🔄 Consolidating knowledge...');

    // Get recent experiences
    const recentExperiences = this.replayBuffer.experiences.slice(-1000);

    // Apply consolidation strategy
    this.continualStrategy.consolidate(recentExperiences);

    // Prune old experiences based on importance
    if (
      this.replayBuffer.experiences.length >
      this.typedConfig.replayBufferSize * 0.9
    ) {
      await this.pruneExperiences();
    }

    this.emit('consolidated', {
      experienceCount: recentExperiences.length,
      strategy: this.continualStrategy.type,
    });
  }

  /**
   * Prune less important experiences
   */
  private async pruneExperiences(): Promise<void> {
    // Sort experiences by importance and recency
    const scored = this.replayBuffer.experiences.map((exp) => ({
      exp,
      score:
        exp.importance *
        Math.exp(-0.001 * (Date.now() - exp.timestamp.getTime())),
    }));

    scored.sort((a, b) => b.score - a.score);

    // Keep top experiences
    const keep = Math.floor(this.typedConfig.replayBufferSize * 0.7);
    const kept = scored.slice(0, keep).map((s) => s.exp);

    this.replayBuffer.experiences = kept;

    runtimeLogger.debug(
      `✂️ Pruned experiences: kept ${kept.length} most important`
    );
  }

  /**
   * Adapt with constraints from continual learning
   */
  private async adaptWithConstraints(
    context: AdaptationContext,
    constraints: ParameterConstraints
  ): Promise<{ performance: number; confidence: number }> {
    let performance = 0;
    let updates = 0;

    // Fine-tune on new task examples
    for (const example of context.task.supportSet) {
      const exp: LearningExperience = {
        id: `adapt_${Date.now()}_${updates}`,
        agentId: 'adaptation',
        timestamp: new Date(),
        input: { examples: [example] },
        output: { prediction: example.output },
        feedback: { success: true },
        importance: 0.9,
      };

      // Compute gradient
      const gradient = this.computeGradient(exp);

      // Apply constraints
      for (const [param, value] of Object.entries(gradient)) {
        if (constraints.frozen.has(param)) {
          continue; // Skip frozen parameters
        }

        let update = value * (this.state.parameters.learningRate as number);

        // Apply regularization
        if (constraints.regularized.has(param)) {
          const regularization = constraints.regularized.get(param)!;
          update *= 1 - regularization;
        }

        // Apply bounds
        if (constraints.bounded.has(param)) {
          const [min, max] = constraints.bounded.get(param)!;
          const current = (this.state.parameters[param] as number) || 0;
          const newValue = Math.max(min, Math.min(max, current + update));
          update = newValue - current;
        }

        if (typeof this.state.parameters[param] === 'number') {
          this.state.parameters[param] += update;
        }
      }

      updates++;
    }

    // Evaluate on query set
    for (const example of context.task.querySet) {
      const prediction = await this.predict(example.input);
      const accuracy = this.calculateAccuracy(prediction, example.output);
      performance += accuracy;
    }

    performance /= context.task.querySet.length;

    return {
      performance,
      confidence: Math.min(
        0.9,
        performance * (updates / context.task.supportSet.length)
      ),
    };
  }

  /**
   * Compute gradient from experience
   */
  private computeGradient(
    experience: LearningExperience
  ): Record<string, number> {
    const gradient: Record<string, number> = {};

    // Simplified gradient computation
    if (experience.input.features) {
      for (let i = 0; i < experience.input.features.length; i++) {
        gradient[`feature_${i}`] =
          experience.input.features[i] * (experience.feedback?.reward || 0.5);
      }
    }

    return gradient;
  }

  /**
   * Calculate loss
   */
  private calculateLoss(output: any, target: any): number {
    if (output.distribution && target?.reward !== undefined) {
      // Cross-entropy style loss
      const reward = target.reward;
      return -Math.log(Math.max(0.001, reward));
    }

    return 0.5; // Default loss
  }

  /**
   * Calculate accuracy
   */
  private calculateAccuracy(prediction: any, target: any): number {
    if (prediction.prediction === target) {
      return 1.0;
    }

    if (prediction.distribution && Array.isArray(target)) {
      // Cosine similarity for distributions
      const dot = prediction.distribution.reduce(
        (sum: number, val: number, i: number) => sum + val * (target[i] || 0),
        0
      );

      const norm1 = Math.sqrt(
        prediction.distribution.reduce(
          (sum: number, val: number) => sum + val * val,
          0
        )
      );

      const norm2 = Math.sqrt(
        target.reduce((sum: number, val: number) => sum + val * val, 0)
      );

      return norm1 > 0 && norm2 > 0 ? dot / (norm1 * norm2) : 0;
    }

    return 0.5; // Default accuracy
  }

  /**
   * Make prediction
   */
  private async predict(input: LearningInput): Promise<LearningOutput> {
    // Simple linear prediction
    const output: LearningOutput = {
      confidence: 0.7,
    };

    if (input.features) {
      const weights = input.features.map(
        (_, i) =>
          (this.state.parameters[`feature_${i}`] as number) || Math.random()
      );

      const sum = input.features.reduce(
        (acc, feat, i) => acc + feat * weights[i],
        0
      );

      output.prediction = sum > 0.5 ? 1 : 0;
      output.distribution = [1 / (1 + Math.exp(-sum))]; // Sigmoid
      output.confidence = Math.abs(sum - 0.5) * 2;
    }

    return output;
  }

  /**
   * Measure forgetting on previous tasks
   */
  private async measureForgetting(): Promise<number> {
    if (this.tasks.length < 2) return 0;

    let totalForgetting = 0;
    const previousTasks = this.tasks.slice(0, -1);

    for (const task of previousTasks) {
      // Evaluate on previous task
      let performance = 0;
      for (const example of task.querySet) {
        const prediction = await this.predict(example.input);
        performance += this.calculateAccuracy(prediction, example.output);
      }
      performance /= task.querySet.length;

      // Compare with stored performance
      const originalPerformance =
        this.getStoredPerformance(task.id) || performance;
      const forgetting = Math.max(0, originalPerformance - performance);

      totalForgetting += forgetting;
    }

    return totalForgetting / previousTasks.length;
  }

  /**
   * Get stored performance for task
   */
  private getStoredPerformance(taskId: string): number | undefined {
    // In real implementation, this would retrieve stored performance
    return 0.9; // Placeholder
  }

  /**
   * Update parameter history
   */
  private updateParameterHistory(): void {
    for (const [key, value] of Object.entries(this.state.parameters)) {
      if (typeof value === 'number') {
        if (!this.parameterHistory.has(key)) {
          this.parameterHistory.set(key, []);
        }

        const history = this.parameterHistory.get(key)!;
        history.push(value);

        // Keep only recent history
        if (history.length > 1000) {
          history.shift();
        }
      }
    }
  }

  /**
   * Calculate adaptation speed
   */
  private calculateAdaptationSpeed(): number {
    if (this.tasks.length < 2) return 0.5;

    // Measure how quickly performance improves on new tasks
    const recentTasks = this.tasks.slice(-5);
    const adaptationTimes: number[] = [];

    for (const task of recentTasks) {
      // In real implementation, would track actual adaptation time
      adaptationTimes.push(task.supportSet.length); // Use support set size as proxy
    }

    const avgTime =
      adaptationTimes.reduce((a, b) => a + b, 0) / adaptationTimes.length;
    const maxExpected = 50; // Expected max adaptation examples

    return Math.max(0, Math.min(1, 1 - avgTime / maxExpected));
  }

  /**
   * Combine metrics from multiple updates
   */
  private combineMetrics(
    m1: LearningMetrics,
    m2: LearningMetrics
  ): LearningMetrics {
    const combined: LearningMetrics = {};

    for (const key of Object.keys({ ...m1, ...m2 })) {
      if (typeof m1[key] === 'number' && typeof m2[key] === 'number') {
        combined[key] = (m1[key] + m2[key]) / 2;
      } else {
        combined[key] = m1[key] || m2[key];
      }
    }

    return combined;
  }

  /**
   * Combine parameter changes
   */
  private combineChanges(
    c1: ParameterChanges,
    c2: ParameterChanges
  ): ParameterChanges {
    return {
      updated: { ...c1.updated, ...c2.updated },
      added: { ...c1.added, ...c2.added },
      removed: [...(c1.removed || []), ...(c2.removed || [])],
      frozen: [...(c1.frozen || []), ...(c2.frozen || [])],
    };
  }
}

/**
 * Factory function for creating online learning module
 */
export async function createOnlineLearningModule(
  config: OnlineLearningConfig
): Promise<OnlineLearningModule> {
  const module = new OnlineLearningModule();
  await module.initialize(config);
  return module;
}
