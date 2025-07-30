/**
 * Few-Shot Adaptation Module for SYMindX
 *
 * Implements rapid adaptation capabilities through:
 * - In-context learning
 * - Prompt-based task adaptation
 * - Task vector storage and retrieval
 * - Cross-agent knowledge transfer
 * - Meta-learning (MAML-style)
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
  FewShotConfig,
  Task,
  TaskVector,
  Example,
  UpdateType,
  ParameterChanges,
  LearningInput,
  LearningOutput,
} from '../types';
import { runtimeLogger } from '../../../utils/logger';
import { MemoryRecord } from '../../../types/agent';

/**
 * Task vector store for efficient retrieval
 */
class TaskVectorStore {
  private vectors: Map<string, TaskVector> = new Map();
  private embeddings: Map<string, number[]> = new Map();
  private dimensionality: number = 128;

  add(task: Task, performance: number): void {
    const vector = this.computeTaskVector(task);

    const taskVector: TaskVector = {
      taskId: task.id,
      embedding: vector,
      performance,
      timestamp: new Date(),
    };

    this.vectors.set(task.id, taskVector);
    this.embeddings.set(task.id, vector);

    runtimeLogger.debug(
      `📊 Added task vector for ${task.id} with performance ${performance}`
    );
  }

  findSimilar(task: Task, k: number = 5): TaskVector[] {
    const queryVector = this.computeTaskVector(task);
    const similarities: Array<{
      id: string;
      similarity: number;
      vector: TaskVector;
    }> = [];

    for (const [id, vector] of Array.from(this.vectors.entries())) {
      const similarity = this.cosineSimilarity(queryVector, vector.embedding);
      similarities.push({ id, similarity, vector });
    }

    // Sort by similarity and return top k
    similarities.sort((a, b) => b.similarity - a.similarity);

    return similarities.slice(0, k).map((s) => s.vector);
  }

  transfer(sourceTaskId: string, targetTask: Task): number[] {
    const sourceVector = this.vectors.get(sourceTaskId);
    if (!sourceVector) return [];

    const targetVector = this.computeTaskVector(targetTask);

    // Compute transfer gradient
    const gradient = targetVector.map(
      (v, i) => (v - sourceVector.embedding[i]) * sourceVector.performance
    );

    return gradient;
  }

  private computeTaskVector(task: Task): number[] {
    // Compute task embedding from support set
    const vector = new Array(this.dimensionality).fill(0);

    // Aggregate features from examples
    for (const example of task.supportSet) {
      if (example.input.features) {
        for (
          let i = 0;
          i < Math.min(example.input.features.length, this.dimensionality);
          i++
        ) {
          vector[i] += example.input.features[i];
        }
      }
    }

    // Normalize
    const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    if (norm > 0) {
      for (let i = 0; i < vector.length; i++) {
        vector[i] /= norm;
      }
    }

    // Add task-specific features
    if (task.taskVector) {
      for (
        let i = 0;
        i < Math.min(task.taskVector.length, this.dimensionality);
        i++
      ) {
        vector[i] = (vector[i] + task.taskVector[i]) / 2;
      }
    }

    return vector;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0,
      normA = 0,
      normB = 0;

    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    return normA > 0 && normB > 0 ? dot / (normA * normB) : 0;
  }

  getStatistics(): {
    totalTasks: number;
    averagePerformance: number;
    performanceDistribution: Record<string, number>;
  } {
    const performances = Array.from(this.vectors.values()).map(
      (v) => v.performance
    );

    return {
      totalTasks: this.vectors.size,
      averagePerformance:
        performances.reduce((a, b) => a + b, 0) / performances.length || 0,
      performanceDistribution: {
        excellent: performances.filter((p) => p >= 0.9).length,
        good: performances.filter((p) => p >= 0.7 && p < 0.9).length,
        fair: performances.filter((p) => p >= 0.5 && p < 0.7).length,
        poor: performances.filter((p) => p < 0.5).length,
      },
    };
  }
}

/**
 * In-context learning engine
 */
class InContextLearner {
  private contextWindow: number = 2048;
  private attentionMechanism: 'full' | 'sparse' | 'local' = 'full';

  async learnFromContext(
    examples: Example[],
    query: any
  ): Promise<{ prediction: any; confidence: number }> {
    // Build context from examples
    const context = this.buildContext(examples);

    // Apply attention to find relevant examples
    const attendedExamples = this.applyAttention(examples, query);

    // Generate prediction based on attended examples
    const prediction = this.generatePrediction(attendedExamples, query);

    // Calculate confidence based on example relevance
    const confidence = this.calculateConfidence(attendedExamples, query);

    return { prediction, confidence };
  }

  buildPrompt(task: Task, query: any): string {
    let prompt = `Task: ${task.name}\nDescription: ${task.description}\n\n`;

    // Add examples
    prompt += 'Examples:\n';
    for (const example of task.supportSet) {
      prompt += `Input: ${JSON.stringify(example.input)}\n`;
      prompt += `Output: ${JSON.stringify(example.output)}\n\n`;
    }

    // Add query
    prompt += `Query: ${JSON.stringify(query)}\n`;
    prompt += 'Output: ';

    return prompt;
  }

  private buildContext(examples: Example[]): string {
    return examples
      .map(
        (ex) => `${JSON.stringify(ex.input)} -> ${JSON.stringify(ex.output)}`
      )
      .join('\n');
  }

  private applyAttention(examples: Example[], query: any): Example[] {
    if (this.attentionMechanism === 'full') {
      // Full attention - consider all examples
      return examples;
    }

    // Calculate relevance scores
    const scores = examples.map((ex) => this.calculateRelevance(ex, query));

    // Sort by relevance and take top examples
    const indexed = examples.map((ex, i) => ({ ex, score: scores[i] }));
    indexed.sort((a, b) => b.score - a.score);

    const topK = Math.min(5, examples.length);
    return indexed.slice(0, topK).map((item) => item.ex);
  }

  private calculateRelevance(example: Example, query: any): number {
    // Simple feature-based relevance
    if (example.input.features && query.features) {
      let similarity = 0;
      const minLen = Math.min(
        example.input.features.length,
        query.features.length
      );

      for (let i = 0; i < minLen; i++) {
        similarity +=
          1 - Math.abs(example.input.features[i] - query.features[i]);
      }

      return similarity / minLen;
    }

    return 0.5; // Default relevance
  }

  private generatePrediction(examples: Example[], query: any): any {
    if (examples.length === 0) {
      return { type: 'unknown', value: null };
    }

    // Weighted voting based on relevance
    const predictions: Map<string, number> = new Map();

    for (const example of examples) {
      const relevance = this.calculateRelevance(example, query);
      const outputKey = JSON.stringify(example.output);

      predictions.set(outputKey, (predictions.get(outputKey) || 0) + relevance);
    }

    // Find most likely prediction
    let bestPrediction = examples[0].output;
    let bestScore = 0;

    for (const [key, score] of predictions.entries()) {
      if (score > bestScore) {
        bestScore = score;
        bestPrediction = JSON.parse(key);
      }
    }

    return bestPrediction;
  }

  private calculateConfidence(examples: Example[], query: any): number {
    if (examples.length === 0) return 0;

    // Confidence based on:
    // 1. Number of relevant examples
    // 2. Consistency of predictions
    // 3. Average relevance score

    const relevances = examples.map((ex) => this.calculateRelevance(ex, query));
    const avgRelevance =
      relevances.reduce((a, b) => a + b, 0) / relevances.length;

    // Check prediction consistency
    const outputs = examples.map((ex) => JSON.stringify(ex.output));
    const uniqueOutputs = new Set(outputs).size;
    const consistency = 1 - (uniqueOutputs - 1) / examples.length;

    // Combine factors
    const confidence =
      avgRelevance * 0.5 +
      consistency * 0.3 +
      Math.min(examples.length / 10, 1) * 0.2;

    return Math.min(0.95, confidence);
  }
}

/**
 * Few-Shot Adaptation Module
 */
export class FewShotAdaptationModule extends BaseLearningModule {
  private taskVectorStore: TaskVectorStore;
  private inContextLearner: InContextLearner;
  // config inherited from base class as protected

  // Getter for typed config
  private get typedConfig(): FewShotConfig {
    return this.config as FewShotConfig;
  }

  private adaptationHistory: Map<string, AdaptationResult[]> = new Map();
  private metaParameters: Map<string, number[]> = new Map();
  private prototypeNetworks: Map<string, number[]> = new Map();

  constructor() {
    super('few-shot-adaptation', LearningParadigm.FEW_SHOT);

    this.taskVectorStore = new TaskVectorStore();
    this.inContextLearner = new InContextLearner();
  }

  protected async onInitialize(config: LearningConfig): Promise<void> {
    this.config = config;

    // Initialize meta-learning parameters
    this.state.parameters = {
      supportSetSize: this.typedConfig.supportSetSize,
      querySetSize: this.typedConfig.querySetSize,
      adaptationSteps: this.typedConfig.adaptationSteps,
      metaLearningRate: this.typedConfig.metaLearningRate,
      innerLearningRate: 0.01,
      taskSimilarityThreshold: this.typedConfig.taskSimilarityThreshold,
    };

    runtimeLogger.info('🎯 Few-shot adaptation module initialized');
  }

  protected async onLearn(
    experience: LearningExperience
  ): Promise<LearningUpdate> {
    const changes: ParameterChanges = { updated: {} };

    // Extract task from experience if available
    if (experience.context?.task) {
      const task = await this.createTaskFromExperience(experience);

      // Perform meta-learning update
      const metaUpdate = await this.performMetaLearning(task, experience);

      // Update task vector store
      const performance = experience.feedback?.success ? 1.0 : 0.5;
      this.taskVectorStore.add(task, performance);

      // Update prototype networks
      await this.updatePrototypes(task, experience);

      changes.updated = metaUpdate.parameterUpdates;
    }

    // In-context learning from examples
    if (experience.input.examples && experience.input.examples.length > 0) {
      const contextUpdate = await this.performInContextLearning(experience);
      Object.assign(changes.updated, contextUpdate.parameterUpdates);
    }

    return {
      paradigm: this.paradigm,
      updateType: UpdateType.GRADIENT,
      metrics: {
        adaptationSpeed: this.calculateCurrentAdaptationSpeed(),
        taskVectorCount: this.taskVectorStore.getStatistics().totalTasks,
        averagePerformance:
          this.taskVectorStore.getStatistics().averagePerformance,
      },
      changes,
      newCapabilities: this.detectNewCapabilities(experience),
    };
  }

  protected async onAdapt(
    context: AdaptationContext
  ): Promise<AdaptationResult> {
    const startTime = Date.now();

    // Find similar tasks
    const similarTasks = this.taskVectorStore.findSimilar(context.task, 5);

    // Initialize with meta-learned parameters
    const initialParams = this.getMetaParameters(context.task);

    // Perform adaptation steps
    let bestPerformance = 0;
    let adaptationParams = { ...initialParams };

    for (let step = 0; step < this.typedConfig.adaptationSteps; step++) {
      // Sample batch from support set
      const batch = this.sampleBatch(
        context.task.supportSet,
        Math.min(
          this.typedConfig.supportSetSize,
          context.task.supportSet.length
        )
      );

      // Compute gradients and update
      const gradients = await this.computeTaskGradients(
        batch,
        adaptationParams
      );
      adaptationParams = this.updateParameters(
        adaptationParams,
        gradients,
        this.state.parameters.innerLearningRate as number
      );

      // Evaluate on query set
      const performance = await this.evaluateOnQuerySet(
        context.task.querySet,
        adaptationParams
      );

      if (performance > bestPerformance) {
        bestPerformance = performance;
      }

      // Early stopping if performance is good enough
      if (performance > 0.95) break;
    }

    // Apply knowledge transfer from similar tasks
    if (similarTasks.length > 0) {
      const transferBoost = await this.applyKnowledgeTransfer(
        context.task,
        similarTasks,
        adaptationParams
      );

      bestPerformance = Math.min(1.0, bestPerformance + transferBoost);
    }

    // Store adaptation result
    const result: AdaptationResult = {
      adapted: true,
      performance: bestPerformance,
      adaptationTime: Date.now() - startTime,
      strategy: similarTasks.length > 0 ? 'transfer-learning' : 'meta-learning',
      confidence: this.calculateAdaptationConfidence(
        bestPerformance,
        context.task.supportSet.length,
        similarTasks.length
      ),
    };

    // Record adaptation
    if (!this.adaptationHistory.has(context.task.id)) {
      this.adaptationHistory.set(context.task.id, []);
    }
    this.adaptationHistory.get(context.task.id)!.push(result);

    // Update task vector store
    this.taskVectorStore.add(context.task, bestPerformance);

    return result;
  }

  protected async onEvaluate(testData: TestData): Promise<LearningMetrics> {
    let totalAccuracy = 0;
    let adaptationSpeeds: number[] = [];
    let transferSuccess = 0;

    // Create few-shot tasks from test data
    const tasks = this.createTasksFromTestData(testData);

    for (const task of tasks) {
      const startTime = Date.now();

      // Adapt to task
      const result = await this.adapt({
        task,
        availableExamples: task.supportSet,
        performanceTarget: 0.8,
      });

      totalAccuracy += result.performance;
      adaptationSpeeds.push(result.adaptationTime);

      // Check if transfer learning was successful
      if (result.strategy === 'transfer-learning' && result.performance > 0.7) {
        transferSuccess++;
      }
    }

    const n = tasks.length;

    return {
      accuracy: totalAccuracy / n,
      adaptationSpeed:
        1 - adaptationSpeeds.reduce((a, b) => a + b, 0) / n / 10000,
      transferSuccessRate: transferSuccess / n,
      taskVectorCount: this.taskVectorStore.getStatistics().totalTasks,
    };
  }

  protected onReset(): void {
    this.taskVectorStore = new TaskVectorStore();
    this.adaptationHistory.clear();
    this.metaParameters.clear();
    this.prototypeNetworks.clear();
  }

  /**
   * Create task from experience
   */
  private async createTaskFromExperience(
    experience: LearningExperience
  ): Promise<Task> {
    const examples = experience.input.examples || [];

    // Split into support and query
    const splitIdx = Math.floor(examples.length * 0.8);

    return {
      id: `task_${experience.id}`,
      name: experience.context?.task || 'unknown',
      description: 'Task from experience',
      supportSet: examples.slice(0, splitIdx),
      querySet: examples.slice(splitIdx),
      domain: experience.context?.domain,
    };
  }

  /**
   * Perform meta-learning update (MAML-style)
   */
  private async performMetaLearning(
    task: Task,
    experience: LearningExperience
  ): Promise<{ parameterUpdates: Record<string, number> }> {
    const metaGradients: Record<string, number> = {};

    // Get current meta-parameters
    const theta = this.getMetaParameters(task);

    // Inner loop: adapt to task
    let phi = { ...theta };
    for (let i = 0; i < this.typedConfig.adaptationSteps; i++) {
      const batch = this.sampleBatch(
        task.supportSet,
        this.typedConfig.supportSetSize
      );
      const gradients = await this.computeTaskGradients(batch, phi);

      phi = this.updateParameters(
        phi,
        gradients,
        this.state.parameters.innerLearningRate as number
      );
    }

    // Outer loop: compute meta-gradients
    const queryBatch = this.sampleBatch(
      task.querySet,
      this.typedConfig.querySetSize
    );
    const queryGradients = await this.computeTaskGradients(queryBatch, phi);

    // Meta-gradient is gradient of query loss w.r.t. initial parameters theta
    for (const [key, gradient] of Object.entries(queryGradients)) {
      metaGradients[key] = gradient * this.typedConfig.metaLearningRate;
    }

    // Update meta-parameters
    for (const [key, gradient] of Object.entries(metaGradients)) {
      if (!this.metaParameters.has(key)) {
        this.metaParameters.set(key, []);
      }

      const params = this.metaParameters.get(key)!;
      params.push((params[params.length - 1] || 0) + gradient);
    }

    return { parameterUpdates: metaGradients };
  }

  /**
   * Perform in-context learning
   */
  private async performInContextLearning(
    experience: LearningExperience
  ): Promise<{ parameterUpdates: Record<string, number> }> {
    const updates: Record<string, number> = {};

    if (!experience.input.examples || !experience.input.query) {
      return { parameterUpdates: updates };
    }

    // Learn from context
    const result = await this.inContextLearner.learnFromContext(
      experience.input.examples,
      experience.input.query
    );

    // Update confidence tracking
    updates.inContextConfidence = result.confidence;

    // Update example usage statistics
    const exampleCount = experience.input.examples.length;
    updates.averageExampleCount =
      ((this.state.parameters.averageExampleCount as number) || 0) * 0.9 +
      exampleCount * 0.1;

    return { parameterUpdates: updates };
  }

  /**
   * Update prototype networks
   */
  private async updatePrototypes(
    task: Task,
    experience: LearningExperience
  ): Promise<void> {
    const domain = task.domain || 'general';

    // Compute prototype for task
    const prototype = this.computePrototype(task.supportSet);

    // Update domain prototype with momentum
    if (!this.prototypeNetworks.has(domain)) {
      this.prototypeNetworks.set(domain, prototype);
    } else {
      const current = this.prototypeNetworks.get(domain)!;
      const momentum = 0.9;

      const updated = current.map(
        (v, i) => momentum * v + (1 - momentum) * prototype[i]
      );

      this.prototypeNetworks.set(domain, updated);
    }
  }

  /**
   * Compute prototype representation
   */
  private computePrototype(examples: Example[]): number[] {
    const dim = 128;
    const prototype = new Array(dim).fill(0);

    for (const example of examples) {
      if (example.input.features) {
        for (let i = 0; i < Math.min(example.input.features.length, dim); i++) {
          prototype[i] += example.input.features[i];
        }
      }
    }

    // Average and normalize
    const n = examples.length;
    if (n > 0) {
      for (let i = 0; i < dim; i++) {
        prototype[i] /= n;
      }
    }

    return prototype;
  }

  /**
   * Get meta-parameters for task
   */
  private getMetaParameters(task: Task): Record<string, number> {
    const params: Record<string, number> = {};

    // Initialize from meta-learned parameters
    for (const [key, values] of Array.from(this.metaParameters.entries())) {
      params[key] = values[values.length - 1] || 0;
    }

    // Add task-specific initialization
    const taskVector =
      task.taskVector || this.computePrototype(task.supportSet);
    for (let i = 0; i < taskVector.length; i++) {
      params[`task_${i}`] = taskVector[i];
    }

    return params;
  }

  /**
   * Sample batch from examples
   */
  private sampleBatch(examples: Example[], size: number): Example[] {
    if (examples.length <= size) return examples;

    const shuffled = [...examples].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, size);
  }

  /**
   * Compute gradients for task
   */
  private async computeTaskGradients(
    batch: Example[],
    parameters: Record<string, number>
  ): Promise<Record<string, number>> {
    const gradients: Record<string, number> = {};

    for (const example of batch) {
      // Make prediction with current parameters
      const prediction = this.predict(example.input, parameters);

      // Compute error
      const error = this.computeError(prediction, example.output);

      // Compute gradients (simplified)
      if (example.input.features) {
        for (let i = 0; i < example.input.features.length; i++) {
          const key = `feature_${i}`;
          gradients[key] =
            (gradients[key] || 0) + error * example.input.features[i];
        }
      }
    }

    // Average gradients
    const n = batch.length;
    for (const key in gradients) {
      gradients[key] /= n;
    }

    return gradients;
  }

  /**
   * Update parameters with gradients
   */
  private updateParameters(
    parameters: Record<string, number>,
    gradients: Record<string, number>,
    learningRate: number
  ): Record<string, number> {
    const updated = { ...parameters };

    for (const [key, gradient] of Object.entries(gradients)) {
      updated[key] = (updated[key] || 0) - learningRate * gradient;
    }

    return updated;
  }

  /**
   * Make prediction with parameters
   */
  private predict(input: any, parameters: Record<string, number>): any {
    if (!input.features) return { value: 0 };

    let sum = 0;
    for (let i = 0; i < input.features.length; i++) {
      sum += input.features[i] * (parameters[`feature_${i}`] || 0);
    }

    return { value: Math.tanh(sum) };
  }

  /**
   * Compute prediction error
   */
  private computeError(prediction: any, target: any): number {
    if (typeof prediction.value === 'number' && typeof target === 'number') {
      return target - prediction.value;
    }

    if (typeof target.value === 'number') {
      return target.value - (prediction.value || 0);
    }

    return 0;
  }

  /**
   * Evaluate on query set
   */
  private async evaluateOnQuerySet(
    querySet: Example[],
    parameters: Record<string, number>
  ): Promise<number> {
    let correct = 0;

    for (const example of querySet) {
      const prediction = this.predict(example.input, parameters);
      const error = Math.abs(this.computeError(prediction, example.output));

      if (error < 0.1) correct++;
    }

    return correct / querySet.length;
  }

  /**
   * Apply knowledge transfer
   */
  private async applyKnowledgeTransfer(
    task: Task,
    similarTasks: TaskVector[],
    parameters: Record<string, number>
  ): Promise<number> {
    let transferBoost = 0;

    for (const similar of similarTasks) {
      // Get transfer gradient
      const gradient = this.taskVectorStore.transfer(similar.taskId, task);

      // Weight by similarity and performance
      const weight = similar.performance * 0.1;

      // Apply transfer
      for (let i = 0; i < gradient.length; i++) {
        const key = `transfer_${i}`;
        parameters[key] = (parameters[key] || 0) + weight * gradient[i];
      }

      transferBoost += weight * 0.1;
    }

    return Math.min(0.2, transferBoost);
  }

  /**
   * Calculate adaptation confidence
   */
  private calculateAdaptationConfidence(
    performance: number,
    supportSize: number,
    similarTasks: number
  ): number {
    // Base confidence on performance
    let confidence = performance * 0.5;

    // Boost for more examples
    confidence += Math.min(0.3, supportSize / 50);

    // Boost for similar tasks
    confidence += Math.min(0.2, similarTasks / 10);

    return Math.min(0.95, confidence);
  }

  /**
   * Calculate current adaptation speed
   */
  private calculateCurrentAdaptationSpeed(): number {
    const recentAdaptations: number[] = [];

    for (const results of Array.from(this.adaptationHistory.values())) {
      const recent = results.slice(-5);
      for (const result of recent) {
        recentAdaptations.push(result.adaptationTime);
      }
    }

    if (recentAdaptations.length === 0) return 0.5;

    const avgTime =
      recentAdaptations.reduce((a, b) => a + b, 0) / recentAdaptations.length;
    const maxExpectedTime = 5000; // 5 seconds

    return Math.max(0, Math.min(1, 1 - avgTime / maxExpectedTime));
  }

  /**
   * Detect new capabilities
   */
  private detectNewCapabilities(experience: LearningExperience): string[] {
    const capabilities: string[] = [];

    // Check if new domain
    if (
      experience.context?.domain &&
      !Array.from(this.prototypeNetworks.keys()).includes(
        experience.context.domain
      )
    ) {
      capabilities.push(`domain:${experience.context.domain}`);
    }

    // Check if new task type
    if (
      experience.context?.task &&
      this.taskVectorStore.getStatistics().totalTasks === 1
    ) {
      capabilities.push('few-shot-learning');
    }

    return capabilities;
  }

  /**
   * Create tasks from test data
   */
  private createTasksFromTestData(testData: TestData): Task[] {
    const tasks: Task[] = [];
    const examplesPerTask = 10;

    for (let i = 0; i < testData.examples.length; i += examplesPerTask) {
      const taskExamples = testData.examples.slice(i, i + examplesPerTask);

      if (taskExamples.length >= 5) {
        const splitIdx = Math.floor(taskExamples.length * 0.7);

        tasks.push({
          id: `test_task_${i}`,
          name: `Test Task ${i / examplesPerTask + 1}`,
          description: 'Task created from test data',
          supportSet: taskExamples.slice(0, splitIdx),
          querySet: taskExamples.slice(splitIdx),
          domain: testData.domain,
        });
      }
    }

    return tasks;
  }

  /**
   * Create cross-agent transfer memory
   */
  createTransferMemory(
    sourceAgentId: string,
    targetAgentId: string,
    task: Task,
    performance: number
  ): MemoryRecord {
    return this.createLearningMemory(
      targetAgentId,
      'experience',
      `Knowledge transfer from ${sourceAgentId}: Task ${task.name} with performance ${performance}`,
      0.8
    );
  }
}

/**
 * Factory function for creating few-shot adaptation module
 */
export async function createFewShotAdaptationModule(
  config: FewShotConfig
): Promise<FewShotAdaptationModule> {
  const module = new FewShotAdaptationModule();
  await module.initialize(config);
  return module;
}
