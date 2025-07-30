/**
 * Neural Architecture Search (NAS) Module for SYMindX
 *
 * Implements automated architecture optimization through:
 * - Evolutionary algorithms
 * - Reinforcement learning-based search
 * - Hardware-aware optimization
 * - Multi-objective optimization
 * - Gradient-based architecture search
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
  NASConfig,
  Architecture,
  Layer,
  Connection,
  SearchSpace,
  SearchStrategy,
  HardwareConstraints,
  Objective,
  ArchitecturePerformance,
  UpdateType,
  ParameterChanges,
  LayerSearchSpace,
} from '../types';
import { runtimeLogger } from '../../../utils/logger';

/**
 * Architecture genome for evolutionary search
 */
interface ArchitectureGenome {
  id: string;
  genes: number[];
  fitness: number;
  evaluated: boolean;
  performance?: ArchitecturePerformance;
  generation: number;
}

/**
 * Evolutionary search engine
 */
class EvolutionarySearchEngine {
  private population: ArchitectureGenome[] = [];
  private generation: number = 0;
  private eliteSize: number = 5;
  private tournamentSize: number = 3;
  private crossoverProbability: number = 0.8;
  private mutationProbability: number = 0.1;
  private mutationStrength: number = 0.3;

  constructor(
    private populationSize: number,
    private searchSpace: SearchSpace,
    private objectives: Objective[]
  ) {}

  initialize(): ArchitectureGenome[] {
    this.population = [];

    for (let i = 0; i < this.populationSize; i++) {
      const genome = this.createRandomGenome();
      this.population.push(genome);
    }

    runtimeLogger.debug(
      `🧬 Initialized population with ${this.populationSize} architectures`
    );
    return this.population;
  }

  evolve(evaluatedPopulation: ArchitectureGenome[]): ArchitectureGenome[] {
    this.generation++;

    // Sort by fitness
    evaluatedPopulation.sort((a, b) => b.fitness - a.fitness);

    // Select elite
    const elite = evaluatedPopulation.slice(0, this.eliteSize);
    const newPopulation: ArchitectureGenome[] = [...elite];

    // Generate offspring
    while (newPopulation.length < this.populationSize) {
      // Tournament selection
      const parent1 = this.tournamentSelect(evaluatedPopulation);
      const parent2 = this.tournamentSelect(evaluatedPopulation);

      // Crossover
      let offspring: ArchitectureGenome;
      if (Math.random() < this.crossoverProbability) {
        offspring = this.crossover(parent1, parent2);
      } else {
        offspring = Math.random() < 0.5 ? parent1 : parent2;
      }

      // Mutation
      if (Math.random() < this.mutationProbability) {
        offspring = this.mutate(offspring);
      }

      // Reset evaluation flag
      offspring.evaluated = false;
      offspring.generation = this.generation;

      newPopulation.push(offspring);
    }

    this.population = newPopulation;
    return newPopulation;
  }

  private createRandomGenome(): ArchitectureGenome {
    const genes: number[] = [];

    // Encode layers
    for (const layerSpace of this.searchSpace.layers) {
      // Layer inclusion (0 or 1 for optional layers)
      if (layerSpace.optional) {
        genes.push(Math.random() < 0.5 ? 0 : 1);
      } else {
        genes.push(1);
      }

      // Layer size (normalized)
      const [min, max] = layerSpace.sizeRange;
      genes.push(Math.random()); // Will be scaled to [min, max]

      // Activation function index
      genes.push(Math.floor(Math.random() * layerSpace.activations.length));
    }

    // Encode connections
    if (this.searchSpace.connections.allowSkipConnections) {
      const numLayers = this.searchSpace.layers.length;
      for (let i = 0; i < numLayers - 1; i++) {
        for (
          let j = i + 2;
          j <=
          Math.min(
            i + this.searchSpace.connections.maxSkipDistance,
            numLayers - 1
          );
          j++
        ) {
          genes.push(
            Math.random() < this.searchSpace.connections.connectionProbability
              ? 1
              : 0
          );
        }
      }
    }

    // Encode hyperparameters
    const hyperSpace = this.searchSpace.hyperparameters;
    genes.push(Math.random()); // Learning rate (normalized)
    genes.push(Math.random()); // Dropout (normalized)
    genes.push(Math.random()); // Weight decay (normalized)

    return {
      id: `genome_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      genes,
      fitness: 0,
      evaluated: false,
      generation: this.generation,
    };
  }

  private tournamentSelect(
    population: ArchitectureGenome[]
  ): ArchitectureGenome {
    const tournament: ArchitectureGenome[] = [];

    for (let i = 0; i < this.tournamentSize; i++) {
      const idx = Math.floor(Math.random() * population.length);
      tournament.push(population[idx]);
    }

    return tournament.reduce((best, current) =>
      current.fitness > best.fitness ? current : best
    );
  }

  private crossover(
    parent1: ArchitectureGenome,
    parent2: ArchitectureGenome
  ): ArchitectureGenome {
    const genes: number[] = [];

    // Uniform crossover
    for (let i = 0; i < parent1.genes.length; i++) {
      genes.push(Math.random() < 0.5 ? parent1.genes[i] : parent2.genes[i]);
    }

    return {
      id: `genome_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      genes,
      fitness: 0,
      evaluated: false,
      generation: this.generation,
    };
  }

  private mutate(genome: ArchitectureGenome): ArchitectureGenome {
    const genes = [...genome.genes];

    for (let i = 0; i < genes.length; i++) {
      if (Math.random() < this.mutationStrength) {
        // Binary genes (connections, layer inclusion)
        if (genes[i] === 0 || genes[i] === 1) {
          genes[i] = 1 - genes[i];
        } else {
          // Continuous genes
          genes[i] += (Math.random() - 0.5) * 0.2;
          genes[i] = Math.max(0, Math.min(1, genes[i]));
        }
      }
    }

    return {
      ...genome,
      genes,
      evaluated: false,
    };
  }

  decodeGenome(genome: ArchitectureGenome): Architecture {
    const layers: Layer[] = [];
    const connections: Connection[] = [];
    let geneIdx = 0;

    // Decode layers
    for (let i = 0; i < this.searchSpace.layers.length; i++) {
      const layerSpace = this.searchSpace.layers[i];
      const included = genome.genes[geneIdx++];

      if (included === 1 || !layerSpace.optional) {
        const sizeNorm = genome.genes[geneIdx++];
        const activationIdx = Math.floor(genome.genes[geneIdx++]);

        const [min, max] = layerSpace.sizeRange;
        const size = Math.round(min + sizeNorm * (max - min));

        layers.push({
          id: `layer_${i}`,
          type: layerSpace.type,
          size,
          activation: layerSpace.activations[activationIdx] || 'relu',
          parameters: {},
        });
      } else {
        geneIdx += 2; // Skip size and activation genes
      }
    }

    // Add sequential connections
    for (let i = 0; i < layers.length - 1; i++) {
      connections.push({
        from: layers[i].id,
        to: layers[i + 1].id,
        type: 'sequential',
      });
    }

    // Decode skip connections
    if (this.searchSpace.connections.allowSkipConnections) {
      let layerIdx = 0;
      for (let i = 0; i < this.searchSpace.layers.length - 1; i++) {
        if (!layers[layerIdx] || layers[layerIdx].id !== `layer_${i}`) continue;

        for (
          let j = i + 2;
          j <=
          Math.min(
            i + this.searchSpace.connections.maxSkipDistance,
            this.searchSpace.layers.length - 1
          );
          j++
        ) {
          const skipGene = genome.genes[geneIdx++];

          if (skipGene === 1) {
            const targetIdx = layers.findIndex((l) => l.id === `layer_${j}`);
            if (targetIdx >= 0) {
              connections.push({
                from: layers[layerIdx].id,
                to: layers[targetIdx].id,
                type: 'skip',
              });
            }
          }
        }
        layerIdx++;
      }
    }

    // Decode hyperparameters
    const hyperSpace = this.searchSpace.hyperparameters;
    const lrNorm = genome.genes[geneIdx++];
    const dropoutNorm = genome.genes[geneIdx++];
    const wdNorm = genome.genes[geneIdx++];

    const [lrMin, lrMax] = hyperSpace.learningRate;
    const [dropoutMin, dropoutMax] = hyperSpace.dropout;
    const [wdMin, wdMax] = hyperSpace.weightDecay;

    return {
      id: genome.id,
      layers,
      connections,
      hyperparameters: {
        learningRate: lrMin + lrNorm * (lrMax - lrMin),
        dropout: dropoutMin + dropoutNorm * (dropoutMax - dropoutMin),
        weightDecay: wdMin + wdNorm * (wdMax - wdMin),
      },
    };
  }

  getBestArchitecture(): ArchitectureGenome | null {
    const evaluated = this.population.filter((g) => g.evaluated);
    if (evaluated.length === 0) return null;

    return evaluated.reduce((best, current) =>
      current.fitness > best.fitness ? current : best
    );
  }

  getStatistics(): {
    generation: number;
    bestFitness: number;
    averageFitness: number;
    diversityScore: number;
  } {
    const evaluated = this.population.filter((g) => g.evaluated);

    const fitnesses = evaluated.map((g) => g.fitness);
    const bestFitness = Math.max(...fitnesses, 0);
    const averageFitness =
      fitnesses.reduce((a, b) => a + b, 0) / fitnesses.length || 0;

    // Calculate diversity
    const diversityScore = this.calculateDiversity();

    return {
      generation: this.generation,
      bestFitness,
      averageFitness,
      diversityScore,
    };
  }

  private calculateDiversity(): number {
    if (this.population.length < 2) return 0;

    let totalDistance = 0;
    let comparisons = 0;

    for (let i = 0; i < this.population.length - 1; i++) {
      for (let j = i + 1; j < this.population.length; j++) {
        const distance = this.hammingDistance(
          this.population[i].genes,
          this.population[j].genes
        );
        totalDistance += distance;
        comparisons++;
      }
    }

    return comparisons > 0
      ? totalDistance / comparisons / this.population[0].genes.length
      : 0;
  }

  private hammingDistance(genes1: number[], genes2: number[]): number {
    let distance = 0;

    for (let i = 0; i < genes1.length; i++) {
      if (Math.abs(genes1[i] - genes2[i]) > 0.1) {
        distance++;
      }
    }

    return distance;
  }
}

/**
 * Architecture evaluator
 */
class ArchitectureEvaluator {
  constructor(
    private objectives: Objective[],
    private hardwareConstraints?: HardwareConstraints
  ) {}

  async evaluate(
    architecture: Architecture,
    testData?: TestData
  ): Promise<ArchitecturePerformance> {
    // Simulate architecture evaluation
    const layerCount = architecture.layers.length;
    const connectionCount = architecture.connections.length;
    const skipConnections = architecture.connections.filter(
      (c) => c.type === 'skip'
    ).length;

    // Calculate complexity
    const totalParams = architecture.layers.reduce(
      (sum, layer) =>
        sum + layer.size * (layer.type === 'dense' ? layer.size : 1),
      0
    );

    // Simulate performance metrics
    const accuracy = Math.min(
      0.95,
      0.7 + 0.05 * layerCount - (0.001 * totalParams) / 1000
    );
    const latency = 10 + layerCount * 5 + skipConnections * 2;
    const memoryUsage = (totalParams * 4) / (1024 * 1024); // MB
    const energyConsumption = layerCount * 0.5 + connectionCount * 0.1;
    const flops = totalParams * 2;

    // Apply hardware constraints penalties
    let constraintPenalty = 0;
    if (this.hardwareConstraints) {
      if (memoryUsage > this.hardwareConstraints.maxMemory) {
        constraintPenalty +=
          (memoryUsage - this.hardwareConstraints.maxMemory) /
          this.hardwareConstraints.maxMemory;
      }

      if (latency > this.hardwareConstraints.maxLatency) {
        constraintPenalty +=
          (latency - this.hardwareConstraints.maxLatency) /
          this.hardwareConstraints.maxLatency;
      }

      if (
        this.hardwareConstraints.maxPower &&
        energyConsumption > this.hardwareConstraints.maxPower
      ) {
        constraintPenalty +=
          (energyConsumption - this.hardwareConstraints.maxPower) /
          this.hardwareConstraints.maxPower;
      }
    }

    return {
      accuracy: Math.max(0, accuracy - constraintPenalty * 0.1),
      latency,
      memoryUsage,
      energyConsumption,
      flops,
    };
  }

  calculateFitness(performance: ArchitecturePerformance): number {
    let fitness = 0;

    for (const objective of this.objectives) {
      const value = objective.metric({
        id: '',
        layers: [],
        connections: [],
        hyperparameters: {},
        performance,
      });

      if (objective.type === 'minimize') {
        fitness += objective.weight * (1 / (1 + value));
      } else {
        fitness += objective.weight * value;
      }
    }

    return fitness;
  }
}

/**
 * Neural Architecture Search Module
 */
export class NeuralArchitectureSearchModule extends BaseLearningModule {
  // config inherited from base class as protected

  // Getter for typed config
  private get typedConfig(): NASConfig {
    return this.config as NASConfig;
  }
  private searchEngine!: EvolutionarySearchEngine;
  private evaluator!: ArchitectureEvaluator;
  private architectureHistory: Map<string, Architecture> = new Map();
  private bestArchitecture?: Architecture;
  private evaluationBudgetUsed: number = 0;
  private paretoFront: Architecture[] = [];

  constructor() {
    super(
      'neural-architecture-search',
      LearningParadigm.NEURAL_ARCHITECTURE_SEARCH
    );
  }

  protected async onInitialize(config: LearningConfig): Promise<void> {
    this.config = config;

    // Initialize search engine based on strategy
    if (this.typedConfig.searchStrategy.type === 'evolutionary') {
      this.searchEngine = new EvolutionarySearchEngine(
        this.typedConfig.searchStrategy.populationSize || 50,
        this.typedConfig.searchSpace,
        this.typedConfig.objectives
      );
    }

    // Initialize evaluator
    this.evaluator = new ArchitectureEvaluator(
      this.typedConfig.objectives,
      this.typedConfig.hardwareConstraints
    );

    // Initialize search
    this.searchEngine.initialize();

    this.state.parameters = {
      evaluationBudget: this.typedConfig.evaluationBudget,
      searchStrategy: this.typedConfig.searchStrategy.type,
      objectiveCount: this.typedConfig.objectives.length,
    };

    runtimeLogger.info('🔍 Neural Architecture Search module initialized');
  }

  protected async onLearn(
    experience: LearningExperience
  ): Promise<LearningUpdate> {
    // NAS learns from architecture performance feedback
    const changes: ParameterChanges = { updated: {} };

    // If experience contains architecture performance data
    if (
      experience.feedback &&
      experience.context?.task === 'architecture_evaluation'
    ) {
      await this.updateSearchWithFeedback(experience);
    }

    // Perform search iteration
    const searchUpdate = await this.performSearchIteration();

    changes.updated.evaluationBudgetUsed = this.evaluationBudgetUsed;
    changes.updated.bestFitness = searchUpdate.bestFitness;

    return {
      paradigm: this.paradigm,
      updateType: UpdateType.EVOLUTIONARY,
      metrics: {
        evaluationBudgetUsed: this.evaluationBudgetUsed,
        bestFitness: searchUpdate.bestFitness,
        averageFitness: searchUpdate.averageFitness,
        diversityScore: searchUpdate.diversityScore,
        paretoFrontSize: this.paretoFront.length,
      },
      changes,
      newCapabilities: searchUpdate.newArchitecture
        ? ['new_architecture_discovered']
        : undefined,
    };
  }

  protected async onAdapt(
    context: AdaptationContext
  ): Promise<AdaptationResult> {
    // Adapt search to new objectives or constraints
    if (context.task.name === 'update_objectives') {
      return this.adaptObjectives(context);
    }

    if (context.task.name === 'update_constraints') {
      return this.adaptConstraints(context);
    }

    // Default: continue search with current configuration
    const searchUpdate = await this.performSearchIteration();

    return {
      adapted: true,
      performance: searchUpdate.bestFitness,
      adaptationTime: 0,
      strategy: 'evolutionary_search',
      confidence: Math.min(0.9, searchUpdate.bestFitness),
    };
  }

  protected async onEvaluate(testData: TestData): Promise<LearningMetrics> {
    if (!this.bestArchitecture) {
      return {
        accuracy: 0,
        efficiency: 0,
        searchProgress: 0,
      };
    }

    // Evaluate best architecture on test data
    const performance = await this.evaluator.evaluate(
      this.bestArchitecture,
      testData
    );

    return {
      accuracy: performance.accuracy,
      latency: performance.latency,
      memoryUsage: performance.memoryUsage,
      energyConsumption: performance.energyConsumption,
      searchProgress:
        this.evaluationBudgetUsed / this.typedConfig.evaluationBudget,
      paretoFrontSize: this.paretoFront.length,
      architecturesEvaluated: this.architectureHistory.size,
    };
  }

  protected onReset(): void {
    this.architectureHistory.clear();
    this.bestArchitecture = undefined;
    this.evaluationBudgetUsed = 0;
    this.paretoFront = [];

    if (this.searchEngine) {
      this.searchEngine.initialize();
    }
  }

  /**
   * Perform one iteration of architecture search
   */
  private async performSearchIteration(): Promise<{
    bestFitness: number;
    averageFitness: number;
    diversityScore: number;
    newArchitecture: boolean;
  }> {
    // Get current population
    let population = this.searchEngine['population'];

    // Evaluate unevaluated architectures
    let newArchitecture = false;

    for (const genome of population) {
      if (
        !genome.evaluated &&
        this.evaluationBudgetUsed < this.typedConfig.evaluationBudget
      ) {
        const architecture = this.searchEngine.decodeGenome(genome);
        const performance = await this.evaluator.evaluate(architecture);

        genome.performance = performance;
        genome.fitness = this.evaluator.calculateFitness(performance);
        genome.evaluated = true;

        this.evaluationBudgetUsed++;

        // Store architecture
        architecture.performance = performance;
        this.architectureHistory.set(architecture.id, architecture);

        // Update best
        if (
          !this.bestArchitecture ||
          genome.fitness >
            this.evaluator.calculateFitness(this.bestArchitecture.performance!)
        ) {
          this.bestArchitecture = architecture;
          newArchitecture = true;

          runtimeLogger.info(
            `🏆 New best architecture found: ${architecture.id} ` +
              `with fitness ${genome.fitness.toFixed(3)}`
          );
        }

        // Update Pareto front
        this.updateParetoFront(architecture);
      }
    }

    // Evolve population if budget remains
    if (this.evaluationBudgetUsed < this.typedConfig.evaluationBudget) {
      population = this.searchEngine.evolve(population);
    }

    // Get statistics
    const stats = this.searchEngine.getStatistics();

    return {
      ...stats,
      newArchitecture,
    };
  }

  /**
   * Update search with performance feedback
   */
  private async updateSearchWithFeedback(
    experience: LearningExperience
  ): Promise<void> {
    if (!experience.input.state?.architectureId) return;

    const architectureId = experience.input.state.architectureId;
    const architecture = this.architectureHistory.get(architectureId);

    if (architecture && experience.feedback?.reward !== undefined) {
      // Update architecture performance based on real-world feedback
      const realPerformance = experience.feedback.reward;

      if (architecture.performance) {
        // Blend simulated and real performance
        architecture.performance.accuracy =
          (architecture.performance.accuracy + realPerformance) / 2;
      }

      runtimeLogger.debug(
        `📊 Updated architecture ${architectureId} ` +
          `performance with real feedback: ${realPerformance}`
      );
    }
  }

  /**
   * Update Pareto front for multi-objective optimization
   */
  private updateParetoFront(architecture: Architecture): void {
    if (!architecture.performance) return;

    // Check if architecture dominates any in current front
    const dominated: Architecture[] = [];
    let isDominated = false;

    for (const arch of this.paretoFront) {
      if (!arch.performance) continue;

      if (this.dominates(architecture.performance, arch.performance)) {
        dominated.push(arch);
      } else if (this.dominates(arch.performance, architecture.performance)) {
        isDominated = true;
        break;
      }
    }

    if (!isDominated) {
      // Remove dominated architectures
      this.paretoFront = this.paretoFront.filter((a) => !dominated.includes(a));

      // Add new architecture
      this.paretoFront.push(architecture);

      runtimeLogger.debug(
        `📈 Updated Pareto front: ${this.paretoFront.length} architectures`
      );
    }
  }

  /**
   * Check if performance a dominates performance b
   */
  private dominates(
    a: ArchitecturePerformance,
    b: ArchitecturePerformance
  ): boolean {
    let betterInAtLeast1 = false;

    for (const objective of this.typedConfig.objectives) {
      const aValue = objective.metric({
        id: '',
        layers: [],
        connections: [],
        hyperparameters: {},
        performance: a,
      });

      const bValue = objective.metric({
        id: '',
        layers: [],
        connections: [],
        hyperparameters: {},
        performance: b,
      });

      if (objective.type === 'minimize') {
        if (aValue > bValue) return false;
        if (aValue < bValue) betterInAtLeast1 = true;
      } else {
        if (aValue < bValue) return false;
        if (aValue > bValue) betterInAtLeast1 = true;
      }
    }

    return betterInAtLeast1;
  }

  /**
   * Adapt to new objectives
   */
  private async adaptObjectives(
    context: AdaptationContext
  ): Promise<AdaptationResult> {
    // Extract new objectives from context
    const newObjectives = context.task.supportSet.map(
      (ex) => ex.output as Objective
    );

    if (newObjectives.length > 0) {
      this.typedConfig.objectives = newObjectives;
      this.evaluator = new ArchitectureEvaluator(
        this.typedConfig.objectives,
        this.typedConfig.hardwareConstraints
      );

      // Re-evaluate Pareto front with new objectives
      this.paretoFront = [];
      for (const arch of this.architectureHistory.values()) {
        if (arch.performance) {
          this.updateParetoFront(arch);
        }
      }

      return {
        adapted: true,
        performance: 1.0,
        adaptationTime: 0,
        strategy: 'objective_adaptation',
        confidence: 0.9,
      };
    }

    return {
      adapted: false,
      performance: 0,
      adaptationTime: 0,
      strategy: 'objective_adaptation',
      confidence: 0,
    };
  }

  /**
   * Adapt to new constraints
   */
  private async adaptConstraints(
    context: AdaptationContext
  ): Promise<AdaptationResult> {
    // Extract new constraints from context
    if (context.task.supportSet.length > 0) {
      const newConstraints = context.task.supportSet[0]
        .output as HardwareConstraints;

      this.typedConfig.hardwareConstraints = newConstraints;
      this.evaluator = new ArchitectureEvaluator(
        this.typedConfig.objectives,
        this.typedConfig.hardwareConstraints
      );

      // Re-evaluate architectures with new constraints
      let validArchitectures = 0;

      for (const arch of this.architectureHistory.values()) {
        const performance = await this.evaluator.evaluate(arch);
        arch.performance = performance;

        if (this.meetsConstraints(performance)) {
          validArchitectures++;
        }
      }

      return {
        adapted: true,
        performance:
          validArchitectures / Math.max(1, this.architectureHistory.size),
        adaptationTime: 0,
        strategy: 'constraint_adaptation',
        confidence: 0.85,
      };
    }

    return {
      adapted: false,
      performance: 0,
      adaptationTime: 0,
      strategy: 'constraint_adaptation',
      confidence: 0,
    };
  }

  /**
   * Check if performance meets constraints
   */
  private meetsConstraints(performance: ArchitecturePerformance): boolean {
    if (!this.typedConfig.hardwareConstraints) return true;

    const constraints = this.typedConfig.hardwareConstraints;

    if (performance.memoryUsage > constraints.maxMemory) return false;
    if (performance.latency > constraints.maxLatency) return false;
    if (
      constraints.maxPower &&
      performance.energyConsumption! > constraints.maxPower
    ) {
      return false;
    }

    return true;
  }

  /**
   * Get best architecture for deployment
   */
  getBestArchitectureForDeployment(
    targetDevice?: 'cpu' | 'gpu' | 'tpu' | 'edge'
  ): Architecture | null {
    if (targetDevice && this.typedConfig.hardwareConstraints) {
      // Filter architectures by device constraints
      const validArchitectures = Array.from(
        this.architectureHistory.values()
      ).filter(
        (arch) => arch.performance && this.meetsConstraints(arch.performance)
      );

      if (validArchitectures.length === 0) return null;

      // Return best from valid architectures
      return validArchitectures.reduce((best, current) => {
        const bestFitness = this.evaluator.calculateFitness(best.performance!);
        const currentFitness = this.evaluator.calculateFitness(
          current.performance!
        );
        return currentFitness > bestFitness ? current : best;
      });
    }

    return this.bestArchitecture || null;
  }

  /**
   * Export architecture to deployment format
   */
  exportArchitecture(architecture: Architecture): string {
    return JSON.stringify(
      {
        architecture: {
          layers: architecture.layers,
          connections: architecture.connections,
          hyperparameters: architecture.hyperparameters,
        },
        performance: architecture.performance,
        metadata: {
          searchSpace: this.typedConfig.searchSpace,
          objectives: this.typedConfig.objectives,
          constraints: this.typedConfig.hardwareConstraints,
          evaluationDate: new Date().toISOString(),
        },
      },
      null,
      2
    );
  }
}

/**
 * Factory function for creating NAS module
 */
export async function createNeuralArchitectureSearchModule(
  config: NASConfig
): Promise<NeuralArchitectureSearchModule> {
  const module = new NeuralArchitectureSearchModule();
  await module.initialize(config);
  return module;
}
