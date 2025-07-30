/**
 * Base Learning Module for SYMindX
 *
 * Abstract base class providing common functionality for all learning paradigms.
 */

import { EventEmitter } from 'events';
import {
  LearningModule,
  LearningConfig,
  LearningExperience,
  LearningUpdate,
  AdaptationContext,
  AdaptationResult,
  TestData,
  EvaluationResult,
  LearningState,
  LearningParadigm,
  LearningMetrics,
  LearningStatistics,
  LearningHistory,
  PerformancePoint,
  LearningCurve,
  Milestone,
  Checkpoint,
  UpdateType,
  ParameterChanges,
  GeneralizationMetrics,
  RobustnessMetrics,
  EfficiencyMetrics,
} from './types';
import { runtimeLogger } from '../../utils/logger';
import { MemoryRecord, MemoryType, MemoryDuration } from '../../types/agent';

/**
 * Abstract base class for learning modules
 */
export abstract class BaseLearningModule
  extends EventEmitter
  implements LearningModule
{
  public readonly id: string;
  public readonly paradigm: LearningParadigm;

  protected config: LearningConfig;
  protected state: LearningState;
  protected isInitialized: boolean = false;
  protected performanceHistory: PerformancePoint[] = [];
  protected milestones: Milestone[] = [];
  protected checkpoints: Checkpoint[] = [];
  protected learningHistory: LearningUpdate[] = [];

  constructor(id: string, paradigm: LearningParadigm) {
    super();
    this.id = id;
    this.paradigm = paradigm;

    // Initialize default state
    this.state = {
      paradigm,
      parameters: {},
      statistics: this.initializeStatistics(),
      history: this.initializeHistory(),
    };
  }

  /**
   * Initialize the learning module
   */
  async initialize(config: LearningConfig): Promise<void> {
    this.config = config;

    // Perform paradigm-specific initialization
    await this.onInitialize(config);

    this.isInitialized = true;
    this.emit('initialized', { paradigm: this.paradigm, config });

    runtimeLogger.info(
      `✨ Learning module ${this.id} (${this.paradigm}) initialized`
    );
  }

  /**
   * Learn from an experience
   */
  async learn(experience: LearningExperience): Promise<LearningUpdate> {
    if (!this.isInitialized) {
      throw new Error('Learning module not initialized');
    }

    // Record experience
    this.state.statistics.totalExperiences++;

    // Perform paradigm-specific learning
    const update = await this.onLearn(experience);

    // Update statistics
    this.updateStatistics(update);
    this.learningHistory.push(update);

    // Check for milestones
    await this.checkMilestones(update);

    // Create checkpoint if needed
    if (this.shouldCreateCheckpoint(update)) {
      await this.createCheckpoint('automatic', update.metrics);
    }

    this.emit('learned', { experience, update });

    return update;
  }

  /**
   * Adapt to a new context
   */
  async adapt(context: AdaptationContext): Promise<AdaptationResult> {
    if (!this.isInitialized) {
      throw new Error('Learning module not initialized');
    }

    const startTime = Date.now();

    // Perform paradigm-specific adaptation
    const result = await this.onAdapt(context);

    result.adaptationTime = Date.now() - startTime;

    this.emit('adapted', { context, result });

    return result;
  }

  /**
   * Evaluate on test data
   */
  async evaluate(testData: TestData): Promise<EvaluationResult> {
    if (!this.isInitialized) {
      throw new Error('Learning module not initialized');
    }

    const startTime = Date.now();

    // Perform paradigm-specific evaluation
    const metrics = await this.onEvaluate(testData);

    // Evaluate generalization
    const generalization = await this.evaluateGeneralization(testData);

    // Evaluate robustness
    const robustness = await this.evaluateRobustness(testData);

    // Calculate efficiency metrics
    const efficiency: EfficiencyMetrics = {
      inferenceTime: (Date.now() - startTime) / testData.examples.length,
      memoryUsage: this.getMemoryUsage(),
      learningSpeed: this.calculateLearningSpeed(),
      sampleEfficiency: this.calculateSampleEfficiency(),
    };

    const result: EvaluationResult = {
      paradigm: this.paradigm,
      metrics,
      generalization,
      robustness,
      efficiency,
    };

    this.emit('evaluated', { testData, result });

    return result;
  }

  /**
   * Get current learning state
   */
  getState(): LearningState {
    return {
      ...this.state,
      checkpoints: [...this.checkpoints],
    };
  }

  /**
   * Set learning state
   */
  setState(state: LearningState): void {
    this.state = { ...state };
    this.checkpoints = state.checkpoints || [];
    this.emit('stateChanged', { state });
  }

  /**
   * Reset the learning module
   */
  reset(): void {
    this.state = {
      paradigm: this.paradigm,
      parameters: {},
      statistics: this.initializeStatistics(),
      history: this.initializeHistory(),
    };

    this.performanceHistory = [];
    this.milestones = [];
    this.checkpoints = [];
    this.learningHistory = [];

    this.onReset();

    this.emit('reset', { paradigm: this.paradigm });
    runtimeLogger.info(`🔄 Learning module ${this.id} reset`);
  }

  /**
   * Create a memory record of the learning
   */
  createLearningMemory(
    agentId: string,
    type: 'experience' | 'milestone' | 'checkpoint',
    content: string,
    importance: number = 0.7
  ): MemoryRecord {
    return {
      id: `learning_${type}_${Date.now()}`,
      agentId,
      type: MemoryType.LEARNING,
      content,
      metadata: {
        paradigm: this.paradigm,
        learningType: type,
        statistics: this.state.statistics,
      },
      importance,
      timestamp: new Date(),
      tags: ['learning', this.paradigm, type],
      duration: MemoryDuration.LONG_TERM,
    };
  }

  /**
   * Abstract methods to be implemented by subclasses
   */
  protected abstract onInitialize(config: LearningConfig): Promise<void>;
  protected abstract onLearn(
    experience: LearningExperience
  ): Promise<LearningUpdate>;
  protected abstract onAdapt(
    context: AdaptationContext
  ): Promise<AdaptationResult>;
  protected abstract onEvaluate(testData: TestData): Promise<LearningMetrics>;
  protected abstract onReset(): void;

  /**
   * Initialize statistics
   */
  private initializeStatistics(): LearningStatistics {
    return {
      totalExperiences: 0,
      totalUpdates: 0,
      averagePerformance: 0,
      performanceHistory: [],
      learningCurve: {
        points: [],
        smoothed: [],
        trend: 'stable',
        convergence: undefined,
      },
    };
  }

  /**
   * Initialize history
   */
  private initializeHistory(): LearningHistory {
    return {
      experiences: [],
      updates: [],
      checkpoints: [],
      milestones: [],
    };
  }

  /**
   * Update statistics after learning
   */
  private updateStatistics(update: LearningUpdate): void {
    this.state.statistics.totalUpdates++;

    // Update performance history
    if (update.metrics.accuracy !== undefined) {
      const point: PerformancePoint = {
        timestamp: new Date(),
        metric: 'accuracy',
        value: update.metrics.accuracy,
        context: update.updateType,
      };

      this.performanceHistory.push(point);
      this.state.statistics.performanceHistory.push(point);

      // Update average performance
      const recentPerformance = this.performanceHistory
        .slice(-100)
        .map((p) => p.value);

      this.state.statistics.averagePerformance =
        recentPerformance.reduce((a, b) => a + b, 0) / recentPerformance.length;
    }

    // Update learning curve
    this.updateLearningCurve();
  }

  /**
   * Update learning curve
   */
  private updateLearningCurve(): void {
    const curve = this.state.statistics.learningCurve;

    // Add new point
    if (this.performanceHistory.length > 0) {
      const latest =
        this.performanceHistory[this.performanceHistory.length - 1];
      curve.points.push([this.state.statistics.totalUpdates, latest.value]);
    }

    // Smooth the curve
    curve.smoothed = this.smoothCurve(curve.points);

    // Determine trend
    if (curve.smoothed.length >= 10) {
      const recent = curve.smoothed.slice(-10);
      const slope = this.calculateSlope(recent);

      if (slope > 0.01) {
        curve.trend = 'improving';
      } else if (slope < -0.01) {
        curve.trend = 'declining';
      } else {
        curve.trend = 'stable';
      }

      // Check for convergence
      const variance = this.calculateVariance(recent.map((p) => p[1]));
      if (variance < 0.001) {
        curve.convergence = recent[recent.length - 1][1];
      }
    }
  }

  /**
   * Smooth a curve using exponential moving average
   */
  private smoothCurve(points: [number, number][]): [number, number][] {
    if (points.length < 2) return points;

    const alpha = 0.2;
    const smoothed: [number, number][] = [points[0]];

    for (let i = 1; i < points.length; i++) {
      const smoothedValue =
        alpha * points[i][1] + (1 - alpha) * smoothed[i - 1][1];
      smoothed.push([points[i][0], smoothedValue]);
    }

    return smoothed;
  }

  /**
   * Calculate slope of recent points
   */
  private calculateSlope(points: [number, number][]): number {
    if (points.length < 2) return 0;

    const n = points.length;
    let sumX = 0,
      sumY = 0,
      sumXY = 0,
      sumX2 = 0;

    for (const [x, y] of points) {
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    }

    return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  }

  /**
   * Calculate variance
   */
  private calculateVariance(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map((v) => (v - mean) ** 2);
    return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  }

  /**
   * Check for milestones
   */
  private async checkMilestones(update: LearningUpdate): Promise<void> {
    // Check for performance milestones
    if (update.metrics.accuracy !== undefined) {
      const thresholds = [0.7, 0.8, 0.9, 0.95, 0.99];
      for (const threshold of thresholds) {
        if (
          update.metrics.accuracy >= threshold &&
          !this.milestones.some((m) => m.name === `accuracy_${threshold}`)
        ) {
          const milestone: Milestone = {
            name: `accuracy_${threshold}`,
            timestamp: new Date(),
            achievement: `Reached ${threshold * 100}% accuracy`,
            metrics: update.metrics,
          };

          this.milestones.push(milestone);
          this.state.history.milestones.push(milestone);

          this.emit('milestone', milestone);
          runtimeLogger.info(`🎯 Milestone achieved: ${milestone.achievement}`);
        }
      }
    }

    // Check for capability milestones
    if (update.newCapabilities && update.newCapabilities.length > 0) {
      const milestone: Milestone = {
        name: 'new_capabilities',
        timestamp: new Date(),
        achievement: `Learned new capabilities: ${update.newCapabilities.join(', ')}`,
        metrics: update.metrics,
      };

      this.milestones.push(milestone);
      this.state.history.milestones.push(milestone);

      this.emit('milestone', milestone);
    }
  }

  /**
   * Determine if checkpoint should be created
   */
  private shouldCreateCheckpoint(update: LearningUpdate): boolean {
    // Create checkpoint on significant improvements
    if (
      update.metrics.accuracy !== undefined &&
      this.performanceHistory.length > 10
    ) {
      const recentAvg = this.state.statistics.averagePerformance;
      if (update.metrics.accuracy > recentAvg * 1.1) {
        return true;
      }
    }

    // Create checkpoint periodically
    const updatesSinceLastCheckpoint =
      this.state.statistics.totalUpdates -
      (this.checkpoints.length > 0
        ? this.checkpoints[this.checkpoints.length - 1].state.statistics
            .totalUpdates
        : 0);

    return updatesSinceLastCheckpoint >= 100;
  }

  /**
   * Create a checkpoint
   */
  private async createCheckpoint(
    reason: string,
    metrics: LearningMetrics
  ): Promise<void> {
    const checkpoint: Checkpoint = {
      id: `checkpoint_${Date.now()}`,
      timestamp: new Date(),
      state: this.getState(),
      performance: metrics,
      reason,
    };

    this.checkpoints.push(checkpoint);
    this.state.history.checkpoints.push(checkpoint);

    this.emit('checkpoint', checkpoint);
    runtimeLogger.info(`💾 Checkpoint created: ${reason}`);
  }

  /**
   * Evaluate generalization capabilities
   */
  protected async evaluateGeneralization(
    testData: TestData
  ): Promise<GeneralizationMetrics> {
    // Default implementation - subclasses can override
    return {
      inDomain: 0.9,
      outOfDomain: 0.7,
      fewShot: 0.6,
      zeroShot: 0.4,
    };
  }

  /**
   * Evaluate robustness
   */
  protected async evaluateRobustness(
    testData: TestData
  ): Promise<RobustnessMetrics> {
    // Default implementation - subclasses can override
    return {
      noiseResistance: 0.8,
      adversarialRobustness: 0.6,
      distributionShift: 0.7,
      catastrophicForgetting: 0.1,
    };
  }

  /**
   * Get memory usage
   */
  protected getMemoryUsage(): number {
    // Estimate memory usage in MB
    const paramCount = Object.keys(this.state.parameters).length;
    const historySize = this.learningHistory.length;
    return (paramCount * 4 + historySize * 100) / 1024 / 1024;
  }

  /**
   * Calculate learning speed
   */
  protected calculateLearningSpeed(): number {
    if (this.performanceHistory.length < 2) return 0;

    const curve = this.state.statistics.learningCurve;
    if (curve.smoothed.length < 10) return 0.5;

    // Calculate average improvement rate
    const recent = curve.smoothed.slice(-10);
    const slope = this.calculateSlope(recent);

    return Math.max(0, Math.min(1, slope * 100));
  }

  /**
   * Calculate sample efficiency
   */
  protected calculateSampleEfficiency(): number {
    if (this.state.statistics.totalExperiences === 0) return 0;

    // Ratio of performance to experiences
    const performance = this.state.statistics.averagePerformance;
    const experiences = this.state.statistics.totalExperiences;

    return Math.min(1, performance / Math.log10(experiences + 10));
  }
}
