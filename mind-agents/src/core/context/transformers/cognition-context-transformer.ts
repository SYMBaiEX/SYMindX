/**
 * Cognition Context Transformer
 * 
 * Transforms unified context into cognition module-specific format,
 * optimizing for cognitive processing and reasoning operations.
 */

import {
  ContextTransformer,
  UnifiedContext,
  TransformationResult,
  TransformationTarget,
  TransformationStrategy,
  TransformationConfig,
  ValidationResult,
  ValidationConfig,
  TransformerCapabilities,
  TransformationMetadata,
  TransformationPerformance,
  CognitionContextData
} from '../../../types/context/context-transformation.js';
import { runtimeLogger } from '../../../utils/logger.js';
import { ThoughtContext } from '../../../types/modules/cognition.js';

/**
 * Cognition-specific context format
 */
export interface CognitionContext {
  // Core cognition data
  agentId: string;
  sessionId: string;
  contextId: string;
  timestamp: Date;
  
  // Cognitive content
  currentThought: string;
  thoughtHistory: string[];
  reasoningChain: ReasoningStep[];
  
  // Decision context
  activeDecisions: Decision[];
  decisionHistory: DecisionRecord[];
  
  // Planning context
  currentGoals: Goal[];
  activePlans: Plan[];
  constraints: Constraint[];
  
  // Cognitive state
  cognitiveLoad: number; // 0-1
  reasoningDepth: number; // 0-10
  confidence: number; // 0-1
  focus: string[];
  
  // Memory integration
  relevantMemories: MemoryReference[];
  memoryQueries: string[];
  
  // Environment awareness
  availableActions: string[];
  contextualFactors: ContextualFactor[];
  
  // Metadata
  processingMetadata: CognitionProcessingMetadata;
}

export interface ReasoningStep {
  id: string;
  step: string;
  evidence: string[];
  confidence: number;
  timestamp: Date;
  dependencies: string[];
}

export interface Decision {
  id: string;
  question: string;
  options: DecisionOption[];
  criteria: DecisionCriteria[];
  status: 'pending' | 'evaluating' | 'decided' | 'executed';
  deadline?: Date;
}

export interface DecisionOption {
  id: string;
  description: string;
  pros: string[];
  cons: string[];
  score: number;
  feasibility: number;
}

export interface DecisionCriteria {
  name: string;
  weight: number;
  description: string;
}

export interface DecisionRecord {
  decision: Decision;
  selectedOption: string;
  rationale: string;
  timestamp: Date;
  outcome?: string;
}

export interface Goal {
  id: string;
  description: string;
  priority: number; // 0-1
  urgency: number; // 0-1
  achievability: number; // 0-1
  deadline?: Date;
  subgoals: string[];
  metrics: GoalMetric[];
}

export interface GoalMetric {
  name: string;
  current: number;
  target: number;
  unit: string;
}

export interface Plan {
  id: string;
  goalId: string;
  description: string;
  steps: PlanStep[];
  resources: ResourceRequirement[];
  risks: RiskAssessment[];
  timeline: PlanTimeline;
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
}

export interface PlanStep {
  id: string;
  description: string;
  order: number;
  dependencies: string[];
  estimatedDuration: number;
  resources: string[];
  status: 'pending' | 'active' | 'completed' | 'failed' | 'skipped';
  startTime?: Date;
  endTime?: Date;
}

export interface ResourceRequirement {
  type: 'time' | 'memory' | 'processing' | 'external';
  amount: number;
  unit: string;
  availability: number; // 0-1
}

export interface RiskAssessment {
  risk: string;
  probability: number; // 0-1
  impact: number; // 0-1
  mitigation: string;
}

export interface PlanTimeline {
  startTime: Date;
  estimatedEndTime: Date;
  milestones: Milestone[];
}

export interface Milestone {
  id: string;
  description: string;
  targetDate: Date;
  completed: boolean;
  completedDate?: Date;
}

export interface Constraint {
  id: string;
  type: 'resource' | 'time' | 'ethical' | 'logical' | 'environmental';
  description: string;
  severity: number; // 0-1
  enforceable: boolean;
  violationConsequence: string;
}

export interface MemoryReference {
  id: string;
  type: 'episodic' | 'semantic' | 'procedural' | 'working';
  relevance: number; // 0-1
  recency: number; // 0-1
  importance: number; // 0-1
  accessibility: number; // 0-1
}

export interface ContextualFactor {
  factor: string;
  value: unknown;
  influence: number; // -1 to 1
  reliability: number; // 0-1
}

export interface CognitionProcessingMetadata {
  processingStartTime: Date;
  processingDuration: number;
  cognitiveSteps: number;
  memoryLookups: number;
  decisionPoints: number;
  reasoningDepth: number;
  alternativesConsidered: number;
  confidence: number;
}

/**
 * Cognition Context Transformer implementation
 */
export class CognitionContextTransformer implements ContextTransformer<UnifiedContext, CognitionContext> {
  readonly id = 'cognition-context-transformer';
  readonly version = '1.0.0';
  readonly target = TransformationTarget.COGNITION;
  readonly supportedStrategies = [
    TransformationStrategy.FULL,
    TransformationStrategy.SELECTIVE,
    TransformationStrategy.OPTIMIZED,
    TransformationStrategy.CACHED
  ];
  readonly reversible = true;

  private performanceCache = new Map<string, TransformationResult<CognitionContext>>();

  /**
   * Transform unified context to cognition format
   */
  async transform(
    context: UnifiedContext,
    config?: TransformationConfig
  ): Promise<TransformationResult<CognitionContext>> {
    const startTime = performance.now();
    
    try {
      // Check cache first
      if (config?.cache?.enabled) {
        const cacheKey = this.generateCacheKey(context, config);
        const cached = this.performanceCache.get(cacheKey);
        if (cached) {
          runtimeLogger.debug(`Cache hit for cognition transformation: ${cacheKey}`);
          return {
            ...cached,
            cached: true
          };
        }
      }

      // Determine strategy
      const strategy = config?.strategy || TransformationStrategy.SELECTIVE;
      
      // Transform based on strategy
      const transformedContext = await this.performTransformation(context, strategy, config);
      
      // Calculate performance metrics
      const duration = performance.now() - startTime;
      const inputSize = JSON.stringify(context).length;
      const outputSize = JSON.stringify(transformedContext).length;
      
      const metadata: TransformationMetadata = {
        transformerId: this.id,
        transformerVersion: this.version,
        timestamp: new Date(),
        inputSize,
        outputSize,
        fieldsTransformed: this.getTransformedFields(strategy),
        fieldsDropped: this.getDroppedFields(strategy),
        fieldsAdded: this.getAddedFields(),
        validationPassed: true,
        cacheHit: false
      };

      const performance: TransformationPerformance = {
        duration,
        memoryUsage: process.memoryUsage().heapUsed,
        cpuUsage: process.cpuUsage().user,
        cacheHitRate: 0,
        compressionRatio: inputSize / outputSize,
        throughput: outputSize / duration
      };

      const result: TransformationResult<CognitionContext> = {
        success: true,
        transformedContext,
        originalContext: context,
        target: this.target,
        strategy,
        operation: 'transform' as any,
        metadata,
        performance,
        reversible: this.reversible,
        cached: false
      };

      // Cache result if enabled
      if (config?.cache?.enabled) {
        const cacheKey = this.generateCacheKey(context, config);
        this.performanceCache.set(cacheKey, result);
      }

      runtimeLogger.debug(`Cognition context transformation completed in ${duration.toFixed(2)}ms`);
      return result;

    } catch (error) {
      const duration = performance.now() - startTime;
      runtimeLogger.error('Cognition context transformation failed', { error, duration });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        transformedContext: {} as CognitionContext,
        originalContext: context,
        target: this.target,
        strategy: config?.strategy || TransformationStrategy.SELECTIVE,
        operation: 'transform' as any,
        metadata: {
          transformerId: this.id,
          transformerVersion: this.version,
          timestamp: new Date(),
          inputSize: 0,
          outputSize: 0,
          fieldsTransformed: [],
          fieldsDropped: [],
          fieldsAdded: [],
          validationPassed: false,
          cacheHit: false
        },
        performance: {
          duration,
          memoryUsage: 0,
          cpuUsage: 0,
          cacheHitRate: 0,
          compressionRatio: 0,
          throughput: 0
        },
        reversible: false,
        cached: false
      };
    }
  }

  /**
   * Perform the actual transformation based on strategy
   */
  private async performTransformation(
    context: UnifiedContext,
    strategy: TransformationStrategy,
    config?: TransformationConfig
  ): Promise<CognitionContext> {
    const cognitionData = context.cognitionData || {};
    
    const baseContext: CognitionContext = {
      agentId: context.agentId,
      sessionId: context.sessionId,
      contextId: context.contextId,
      timestamp: context.timestamp,
      currentThought: this.extractCurrentThought(context),
      thoughtHistory: cognitionData.thoughts || [],
      reasoningChain: this.buildReasoningChain(context),
      activeDecisions: this.extractActiveDecisions(cognitionData),
      decisionHistory: [],
      currentGoals: this.extractGoals(cognitionData),
      activePlans: this.extractPlans(cognitionData),
      constraints: this.extractConstraints(cognitionData),
      cognitiveLoad: this.calculateCognitiveLoad(context),
      reasoningDepth: this.calculateReasoningDepth(context),
      confidence: context.state.confidence,
      focus: this.extractFocus(context),
      relevantMemories: this.extractMemoryReferences(context),
      memoryQueries: this.extractMemoryQueries(context),
      availableActions: this.extractAvailableActions(context),
      contextualFactors: this.extractContextualFactors(context),
      processingMetadata: this.createProcessingMetadata(context)
    };

    // Apply strategy-specific optimizations
    switch (strategy) {
      case TransformationStrategy.MINIMAL:
        return this.applyMinimalStrategy(baseContext);
      case TransformationStrategy.OPTIMIZED:
        return this.applyOptimizedStrategy(baseContext);
      case TransformationStrategy.FULL:
        return this.applyFullStrategy(baseContext, context);
      default:
        return baseContext;
    }
  }

  /**
   * Extract current thought from context
   */
  private extractCurrentThought(context: UnifiedContext): string {
    if (context.messages.length > 0) {
      const lastMessage = context.messages[context.messages.length - 1];
      return lastMessage.content;
    }
    return context.content || '';
  }

  /**
   * Build reasoning chain from context
   */
  private buildReasoningChain(context: UnifiedContext): ReasoningStep[] {
    const cognitionData = context.cognitionData;
    if (!cognitionData?.reasoningChain) return [];

    return cognitionData.reasoningChain.map((step, index) => ({
      id: `step_${index}`,
      step: step,
      evidence: [], // Would extract from context
      confidence: 0.8, // Default confidence
      timestamp: new Date(),
      dependencies: []
    }));
  }

  /**
   * Extract active decisions from cognition data
   */
  private extractActiveDecisions(cognitionData: CognitionContextData): Decision[] {
    if (!cognitionData.decisions) return [];

    return cognitionData.decisions.map(decision => ({
      id: decision.id,
      question: decision.description,
      options: decision.options.map((option, index) => ({
        id: `option_${index}`,
        description: option,
        pros: [],
        cons: [],
        score: 0.5,
        feasibility: 0.5
      })),
      criteria: [],
      status: 'pending' as const
    }));
  }

  /**
   * Extract goals from cognition data
   */
  private extractGoals(cognitionData: CognitionContextData): Goal[] {
    if (!cognitionData.goals) return [];

    return cognitionData.goals.map(goal => ({
      id: goal.id,
      description: goal.description,
      priority: goal.priority,
      urgency: 0.5, // Default
      achievability: 0.7, // Default
      deadline: goal.deadline,
      subgoals: [],
      metrics: []
    }));
  }

  /**
   * Extract plans from cognition data
   */
  private extractPlans(cognitionData: CognitionContextData): Plan[] {
    if (!cognitionData.plans) return [];

    return cognitionData.plans.map(plan => ({
      id: plan.id,
      goalId: '', // Would need to be mapped
      description: plan.goal,
      steps: plan.steps.map(step => ({
        id: step.id,
        description: step.description,
        order: 0, // Would need ordering logic
        dependencies: step.dependencies,
        estimatedDuration: 0,
        resources: [],
        status: step.status as any
      })),
      resources: [],
      risks: [],
      timeline: {
        startTime: new Date(),
        estimatedEndTime: new Date(),
        milestones: []
      },
      status: plan.status as any
    }));
  }

  /**
   * Extract constraints from cognition data
   */
  private extractConstraints(cognitionData: CognitionContextData): Constraint[] {
    if (!cognitionData.constraints) return [];

    return cognitionData.constraints.map(constraint => ({
      id: constraint.id,
      type: constraint.type as any,
      description: constraint.description,
      severity: constraint.severity,
      enforceable: true,
      violationConsequence: 'Unknown consequence'
    }));
  }

  /**
   * Calculate cognitive load based on context complexity
   */
  private calculateCognitiveLoad(context: UnifiedContext): number {
    let load = 0;
    
    // Factor in message complexity
    load += Math.min(context.messages.length / 10, 0.3);
    
    // Factor in state complexity
    load += context.state.complexity * 0.4;
    
    // Factor in cognition data complexity
    if (context.cognitionData) {
      load += (context.cognitionData.thoughts?.length || 0) / 20 * 0.3;
    }
    
    return Math.min(load, 1);
  }

  /**
   * Calculate reasoning depth
   */
  private calculateReasoningDepth(context: UnifiedContext): number {
    const cognitionData = context.cognitionData;
    if (!cognitionData) return 1;
    
    const thoughtDepth = (cognitionData.thoughts?.length || 0) / 5;
    const reasoningDepth = (cognitionData.reasoningChain?.length || 0) / 3;
    
    return Math.min(Math.max(thoughtDepth, reasoningDepth), 10);
  }

  /**
   * Extract focus areas from context
   */
  private extractFocus(context: UnifiedContext): string[] {
    const focus: string[] = [];
    
    // Extract from messages
    if (context.messages.length > 0) {
      const lastMessage = context.messages[context.messages.length - 1];
      // Simple keyword extraction (would be more sophisticated in production)
      const words = lastMessage.content.toLowerCase().split(/\s+/);
      focus.push(...words.filter(w => w.length > 4).slice(0, 3));
    }
    
    return focus;
  }

  /**
   * Extract memory references
   */
  private extractMemoryReferences(context: UnifiedContext): MemoryReference[] {
    const memoryData = context.memoryData;
    if (!memoryData?.relevantMemories) return [];
    
    return memoryData.relevantMemories.map(mem => ({
      id: mem.id,
      type: mem.type as any,
      relevance: mem.relevance,
      recency: 1 - (Date.now() - mem.lastAccessed.getTime()) / (24 * 60 * 60 * 1000),
      importance: 0.5, // Default
      accessibility: 1.0 // Default
    }));
  }

  /**
   * Extract memory queries
   */
  private extractMemoryQueries(context: UnifiedContext): string[] {
    const memoryData = context.memoryData;
    if (!memoryData?.memoryQueries) return [];
    
    return memoryData.memoryQueries.map(q => q.query);
  }

  /**
   * Extract available actions
   */
  private extractAvailableActions(context: UnifiedContext): string[] {
    return context.environment.capabilities || [];
  }

  /**
   * Extract contextual factors
   */
  private extractContextualFactors(context: UnifiedContext): ContextualFactor[] {
    const factors: ContextualFactor[] = [];
    
    // Environment factors
    if (context.environment.platform) {
      factors.push({
        factor: 'platform',
        value: context.environment.platform,
        influence: 0.3,
        reliability: 0.9
      });
    }
    
    // State factors
    factors.push({
      factor: 'engagement',
      value: context.state.engagement,
      influence: context.state.engagement - 0.5,
      reliability: 0.8
    });
    
    return factors;
  }

  /**
   * Create processing metadata
   */
  private createProcessingMetadata(context: UnifiedContext): CognitionProcessingMetadata {
    return {
      processingStartTime: new Date(),
      processingDuration: 0,
      cognitiveSteps: context.cognitionData?.thoughts?.length || 0,
      memoryLookups: context.memoryData?.memoryQueries?.length || 0,
      decisionPoints: context.cognitionData?.decisions?.length || 0,
      reasoningDepth: this.calculateReasoningDepth(context),
      alternativesConsidered: 0,
      confidence: context.state.confidence
    };
  }

  /**
   * Apply minimal strategy
   */
  private applyMinimalStrategy(context: CognitionContext): CognitionContext {
    return {
      ...context,
      thoughtHistory: context.thoughtHistory.slice(-3), // Keep only last 3 thoughts
      reasoningChain: context.reasoningChain.slice(-5), // Keep only last 5 steps
      decisionHistory: [], // Clear history
      contextualFactors: context.contextualFactors.slice(0, 3) // Keep top 3 factors
    };
  }

  /**
   * Apply optimized strategy
   */
  private applyOptimizedStrategy(context: CognitionContext): CognitionContext {
    // Filter by relevance and importance
    return {
      ...context,
      relevantMemories: context.relevantMemories
        .filter(m => m.relevance > 0.5)
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, 10),
      contextualFactors: context.contextualFactors
        .filter(f => Math.abs(f.influence) > 0.2)
        .sort((a, b) => Math.abs(b.influence) - Math.abs(a.influence))
    };
  }

  /**
   * Apply full strategy
   */
  private applyFullStrategy(context: CognitionContext, original: UnifiedContext): CognitionContext {
    // Include all available data
    return {
      ...context,
      // Add any additional processing or enrichment here
    };
  }

  /**
   * Reverse transformation (if needed)
   */
  async reverse(
    transformedContext: CognitionContext,
    originalMetadata: TransformationMetadata
  ): Promise<TransformationResult<UnifiedContext>> {
    // Implementation would reverse the transformation
    throw new Error('Reverse transformation not yet implemented');
  }

  /**
   * Validate transformed context
   */
  async validate(
    context: CognitionContext,
    config?: ValidationConfig
  ): Promise<ValidationResult> {
    const errors: any[] = [];
    const warnings: any[] = [];

    // Validate required fields
    if (!context.agentId) {
      errors.push({
        field: 'agentId',
        message: 'Agent ID is required',
        severity: 'critical',
        code: 'MISSING_AGENT_ID'
      });
    }

    if (!context.contextId) {
      errors.push({
        field: 'contextId',
        message: 'Context ID is required',
        severity: 'critical',
        code: 'MISSING_CONTEXT_ID'
      });
    }

    // Validate ranges
    if (context.cognitiveLoad < 0 || context.cognitiveLoad > 1) {
      errors.push({
        field: 'cognitiveLoad',
        message: 'Cognitive load must be between 0 and 1',
        severity: 'high',
        code: 'INVALID_COGNITIVE_LOAD'
      });
    }

    // Calculate score
    const score = errors.length === 0 ? (warnings.length === 0 ? 1.0 : 0.8) : 0.5;

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      score,
      timestamp: new Date()
    };
  }

  /**
   * Get transformer capabilities
   */
  getCapabilities(): TransformerCapabilities {
    return {
      target: this.target,
      strategies: this.supportedStrategies,
      reversible: this.reversible,
      cacheable: true,
      streamable: false,
      batchable: true,
      maxInputSize: 10 * 1024 * 1024, // 10MB
      minInputSize: 100, // 100 bytes
      supportedFormats: ['json'],
      dependencies: ['cognition-module'],
      performance: {
        averageDuration: 15, // ms
        memoryUsage: 2 * 1024 * 1024, // 2MB
        throughput: 1000 // contexts per second
      }
    };
  }

  /**
   * Helper methods for metadata
   */
  private generateCacheKey(context: UnifiedContext, config?: TransformationConfig): string {
    const keyData = {
      contextId: context.contextId,
      version: context.version,
      strategy: config?.strategy,
      timestamp: Math.floor(context.timestamp.getTime() / 60000) // Minute precision
    };
    return `cognition_${JSON.stringify(keyData)}`;
  }

  private getTransformedFields(strategy: TransformationStrategy): string[] {
    const baseFields = [
      'agentId', 'sessionId', 'contextId', 'currentThought', 'reasoningChain',
      'activeDecisions', 'currentGoals', 'activePlans', 'cognitiveLoad'
    ];
    
    switch (strategy) {
      case TransformationStrategy.MINIMAL:
        return baseFields.slice(0, 5);
      case TransformationStrategy.FULL:
        return [...baseFields, 'decisionHistory', 'contextualFactors', 'processingMetadata'];
      default:
        return baseFields;
    }
  }

  private getDroppedFields(strategy: TransformationStrategy): string[] {
    switch (strategy) {
      case TransformationStrategy.MINIMAL:
        return ['decisionHistory', 'contextualFactors', 'processingMetadata'];
      default:
        return [];
    }
  }

  private getAddedFields(): string[] {
    return ['cognitiveLoad', 'reasoningDepth', 'focus', 'processingMetadata'];
  }
}

/**
 * Factory function for creating cognition context transformer
 */
export function createCognitionContextTransformer(): CognitionContextTransformer {
  return new CognitionContextTransformer();
}