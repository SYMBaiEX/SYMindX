/**
 * Cognition module types for SYMindX
 */

import { Agent, ThoughtContext, ThoughtResult, Plan, Decision } from './agent';
import { Experience } from './autonomous';
import { BaseConfig } from './common';

/**
 * Base interface for all cognition modules
 */
export interface CognitionModule {
  /**
   * Unique identifier for the module instance
   */
  id: string;

  /**
   * Type of cognition module
   */
  type: string;
  /**
   * Process the current context and generate thoughts, emotions, and actions
   * @param agent The agent that is thinking
   * @param context The context for thinking
   * @returns The result of thinking
   */
  think(agent: Agent, context: ThoughtContext): Promise<ThoughtResult>;

  /**
   * Create a plan for achieving a specific goal
   * @param agent The agent that is planning
   * @param goal The goal to plan for
   * @returns A plan for achieving the goal
   */
  plan(agent: Agent, goal: string): Promise<Plan>;

  /**
   * Make a decision between multiple options
   * @param agent The agent that is deciding
   * @param options The options to choose from
   * @returns The chosen decision
   */
  decide(agent: Agent, options: Decision[]): Promise<Decision>;

  /**
   * Initialize the cognition module with configuration
   * @param config Configuration for the cognition module
   */
  initialize(config: BaseConfig): void;

  /**
   * Get module metadata
   * @returns Metadata about the cognition module
   */
  getMetadata(): CognitionModuleMetadata;

  /**
   * Learn from experience (optional)
   * @param agent The agent that is learning
   * @param experience The experience to learn from
   */
  learn?(agent: Agent, experience: Experience): Promise<void>;
}

/**
 * Metadata for cognition module registration
 */
export interface CognitionModuleMetadata {
  /**
   * Unique identifier for the cognition module
   */
  id: string;

  /**
   * Display name of the cognition module
   */
  name: string;

  /**
   * Description of the cognition module
   */
  description: string;

  /**
   * Version of the cognition module
   */
  version: string;

  /**
   * Author of the cognition module
   */
  author: string;

  /**
   * Supported reasoning paradigms
   */
  paradigms?: ReasoningParadigm[];

  /**
   * Whether this module is capable of learning
   */
  learningCapable?: boolean;
}

/**
 * Factory function type for creating cognition modules
 */
export type CognitionModuleFactory = (config?: BaseConfig) => CognitionModule;

/**
 * Reasoning paradigm types
 */
export enum ReasoningParadigm {
  DEDUCTIVE = 'deductive',
  INDUCTIVE = 'inductive',
  ABDUCTIVE = 'abductive',
  ANALOGICAL = 'analogical',
  CAUSAL = 'causal',
  PROBABILISTIC = 'probabilistic',
  FUZZY = 'fuzzy',
  RULE_BASED = 'rule_based',
  CASE_BASED = 'case_based',
  MODEL_BASED = 'model_based',
  REINFORCEMENT = 'reinforcement',
  REINFORCEMENT_LEARNING = 'reinforcement_learning',
  PDDL_PLANNING = 'pddl_planning',
  HYBRID = 'hybrid',
}

/**
 * Rule for rule-based reasoning
 */
export interface Rule {
  id: string;
  name: string;
  conditions: Condition[];
  actions: RuleAction[];
  priority?: number;
  confidence?: number;
  metadata?: Record<string, any>;
}

/**
 * Condition for rule-based reasoning
 */
export interface Condition {
  type: 'fact' | 'comparison' | 'logical' | 'pattern' | 'function' | 'temporal';
  property: string;
  operator:
    | 'equals'
    | 'not_equals'
    | 'greater_than'
    | 'less_than'
    | 'contains'
    | 'and'
    | 'or'
    | 'not';
  value: string | number | boolean;
  negate?: boolean;
  expression?: string;
  parameters?: Record<string, any>;
  confidence?: number;
}

/**
 * Action for rule-based reasoning
 */
export interface RuleAction {
  type: 'assert' | 'retract' | 'modify' | 'execute';
  target: string;
  parameters?: Record<string, any>;
}

/**
 * Fact base for rule-based reasoning
 */
export interface FactBase {
  facts: Map<string, Fact>;
  rules: Map<string, Rule>;
  addFact(fact: Fact): void;
  removeFact(id: string): void;
  getFact(id: string): Fact | undefined;
  query(pattern: Partial<Fact>): Fact[];
}

/**
 * Bayesian network for probabilistic reasoning
 */
export interface BayesianNetwork {
  nodes: BayesianNode[];
  edges: BayesianEdge[];
  addNode(node: BayesianNode): void;
  addEdge(from: string, to: string): void;
  query(evidence: Record<string, string>): Record<string, number>;
  learn(data: Record<string, string>[]): void;
}

export interface BayesianNode {
  id: string;
  name: string;
  states: string[];
  probabilities?: number[];
  conditionalProbabilities?: Record<string, number>;
  parents: string[];
  children: string[];
}

export interface BayesianEdge {
  from: string;
  to: string;
  probability: number;
}

/**
 * Learning capability interface
 */
export interface LearningCapability {
  learn(experience: Experience): Promise<void>;
  getKnowledge(): Promise<Knowledge>;
  forgetOld(threshold: Date): Promise<void>;
}

export interface Knowledge {
  facts: Fact[];
  rules: Rule[];
  patterns: Pattern[];
  models: Model[];
}

export interface Fact {
  id: string;
  subject: string;
  predicate: string;
  object: string;
  confidence: number;
  source?: string;
  timestamp: Date;
}

export interface Pattern {
  id: string;
  name: string;
  description: string;
  examples: any[];
  confidence: number;
}

export interface Model {
  id: string;
  name: string;
  type: string;
  parameters: Record<string, any>;
  performance: ReasoningPerformance;
}

/**
 * Reasoning performance metrics
 */
export interface ReasoningPerformance {
  accuracy: number;
  precision?: number;
  recall?: number;
  f1Score?: number;
  latency?: number;
  efficiency?: number;
  confidence: number;
  adaptability?: number;
  reasoningTime?: number;
  memoryUsage?: number;
  paradigm?: ReasoningParadigm;
  timestamp: Date;
}

/**
 * Hybrid reasoning configuration
 */
export interface HybridReasoningConfig {
  paradigms?: ReasoningParadigm[];
  weights?: Record<ReasoningParadigm, number>;
  threshold?: number;
  maxIterations?: number;
  timeout?: number;
  ruleEngine?: {
    conflictResolution?: 'priority' | 'specificity' | 'recent';
    maxIterations?: number;
    timeout?: number;
  };
  pddlPlanner?: {
    enabled: boolean;
    domainFile?: string;
    domain?: string;
    searchAlgorithm?: 'breadth_first' | 'depth_first' | 'a_star' | 'best_first';
    maxPlanLength?: number;
    timeout?: number;
  };
  learning?: {
    enabled: boolean;
    learningRate?: number;
    explorationRate?: number;
    discountFactor?: number;
  };
  probabilisticReasoning?: {
    confidenceThreshold?: number;
    maxNetworkSize?: number;
    learningEnabled?: boolean;
  };
}

/**
 * PDDL types for planning
 */
export interface PDDLDomain {
  name: string;
  requirements: string[];
  types: string[];
  predicates: PDDLPredicate[];
  actions: PDDLAction[];
}

export interface PDDLPredicate {
  name: string;
  parameters: PDDLParameter[];
}

export interface PDDLParameter {
  name: string;
  type: string;
}

export interface PDDLAction {
  name: string;
  parameters: PDDLParameter[];
  precondition: PDDLExpression;
  effect: PDDLExpression;
  effects?: PDDLEffect[];
}

export interface PDDLExpression {
  type: 'and' | 'or' | 'not' | 'predicate' | 'forall' | 'exists';
  predicate?: string;
  parameters?: string[];
  expressions?: PDDLExpression[];
}

export interface PDDLProblem {
  name: string;
  domain: string;
  objects: PDDLObject[];
  init: string[];
  initialState?: Set<string>;
  goal: PDDLExpression;
  goalState?: Set<string>;
}

export interface PDDLObject {
  name: string;
  type: string;
}

export interface PDDLCondition {
  type: 'and' | 'or' | 'not' | 'predicate' | 'forall' | 'exists';
  predicate?: string;
  parameters?: string[];
  conditions?: PDDLCondition[];
}

export interface PDDLEffect {
  type: 'and' | 'or' | 'not' | 'predicate' | 'forall' | 'when';
  predicate?: string;
  parameters?: string[];
  effects?: PDDLEffect[];
}

/**
 * Context analysis for reasoning
 */
export interface ContextAnalysis {
  complexity: number;
  uncertainty: number;
  timeConstraint: boolean;
  resourceConstraint: boolean;
  ethicalConsiderations: boolean;
  multiAgent: boolean;
  dynamicEnvironment: boolean;
}

/**
 * Reasoning state for tracking
 */
export interface ReasoningState {
  currentParadigm: ReasoningParadigm;
  confidence: number;
  iterations: number;
  startTime: Date;
  context: ContextAnalysis;
}
