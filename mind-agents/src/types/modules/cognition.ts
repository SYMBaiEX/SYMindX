/**
 * Cognition module-specific types for advanced reasoning and thought processing
 */

import { EmotionState } from '../emotion';

/**
 * Represents a single node in a thought graph
 */
export interface ThoughtNode {
  /**
   * Unique identifier for the thought node
   */
  id: string;

  /**
   * The actual content/representation of the thought
   */
  content: string;

  /**
   * Confidence level in this thought (0-1)
   */
  confidence: number;

  /**
   * Type of thought node for categorization
   */
  type?: 'observation' | 'inference' | 'hypothesis' | 'conclusion' | 'question';

  /**
   * Connections to other thought nodes
   */
  connections: ThoughtConnection[];

  /**
   * Timestamp when this thought was created
   */
  timestamp: Date;

  /**
   * Metadata associated with this thought
   */
  metadata?: Record<string, any>;
}

/**
 * Connection between thought nodes
 */
export interface ThoughtConnection {
  /**
   * Target thought node ID
   */
  targetId: string;

  /**
   * Type of connection/relationship
   */
  type:
    | 'supports'
    | 'contradicts'
    | 'leads_to'
    | 'derives_from'
    | 'similar_to'
    | 'related_to';

  /**
   * Strength of the connection (0-1)
   */
  strength: number;

  /**
   * Optional reasoning for this connection
   */
  reasoning?: string;
}

/**
 * Represents a path of reasoning through multiple thoughts
 */
export interface ReasoningPath {
  /**
   * Unique identifier for this reasoning path
   */
  id: string;

  /**
   * Ordered steps in the reasoning process
   */
  steps: ReasoningStep[];

  /**
   * Overall probability of this reasoning path being correct (0-1)
   */
  probability: number;

  /**
   * The expected outcome if this path is followed
   */
  outcome: string;

  /**
   * Evaluation metrics for this path
   */
  evaluation?: PathEvaluation;

  /**
   * Alternative paths considered
   */
  alternatives?: string[];
}

/**
 * Single step in a reasoning path
 */
export interface ReasoningStep {
  /**
   * Step number in the sequence
   */
  stepNumber: number;

  /**
   * Thought node at this step
   */
  thoughtNodeId: string;

  /**
   * Action or inference made at this step
   */
  action: string;

  /**
   * Justification for this step
   */
  justification: string;

  /**
   * Confidence in this specific step (0-1)
   */
  confidence: number;

  /**
   * Dependencies on previous steps
   */
  dependencies: number[];
}

/**
 * Evaluation metrics for a reasoning path
 */
export interface PathEvaluation {
  /**
   * Logical consistency score (0-1)
   */
  consistency: number;

  /**
   * Completeness of reasoning (0-1)
   */
  completeness: number;

  /**
   * Efficiency score (0-1)
   */
  efficiency: number;

  /**
   * Risk assessment
   */
  risk: 'low' | 'medium' | 'high';
}

/**
 * Result of executing a plan
 */
export interface PlanExecutionResult {
  /**
   * Overall execution status
   */
  status: 'completed' | 'partial' | 'failed' | 'cancelled';

  /**
   * Steps that were successfully completed
   */
  completedSteps: CompletedStep[];

  /**
   * Steps that failed or were skipped
   */
  failedSteps?: FailedStep[];

  /**
   * Errors encountered during execution
   */
  errors: ExecutionError[];

  /**
   * Final state after execution
   */
  finalState?: Record<string, any>;

  /**
   * Execution metrics
   */
  metrics: ExecutionMetrics;

  /**
   * Lessons learned for future planning
   */
  learnings?: LearningItem[];
}

/**
 * A successfully completed plan step
 */
export interface CompletedStep {
  /**
   * Step identifier
   */
  stepId: string;

  /**
   * Actual result of the step
   */
  result: any;

  /**
   * Time taken to complete
   */
  duration: number;

  /**
   * Resources consumed
   */
  resourcesUsed?: Record<string, number>;
}

/**
 * A failed plan step
 */
export interface FailedStep {
  /**
   * Step identifier
   */
  stepId: string;

  /**
   * Reason for failure
   */
  reason: string;

  /**
   * Error details if applicable
   */
  error?: ExecutionError;

  /**
   * Whether this failure was recoverable
   */
  recoverable: boolean;
}

/**
 * Error during plan execution
 */
export interface ExecutionError {
  /**
   * Error code for categorization
   */
  code: string;

  /**
   * Human-readable error message
   */
  message: string;

  /**
   * Step where error occurred
   */
  stepId?: string;

  /**
   * Stack trace if available
   */
  stack?: string;

  /**
   * Additional context
   */
  context?: Record<string, any>;
}

/**
 * Metrics for plan execution
 */
export interface ExecutionMetrics {
  /**
   * Total execution time in milliseconds
   */
  totalDuration: number;

  /**
   * Number of steps completed
   */
  stepsCompleted: number;

  /**
   * Number of steps failed
   */
  stepsFailed: number;

  /**
   * Success rate (0-1)
   */
  successRate: number;

  /**
   * Resource efficiency (0-1)
   */
  efficiency: number;
}

/**
 * Item learned from execution
 */
export interface LearningItem {
  /**
   * Type of learning
   */
  type: 'optimization' | 'failure_pattern' | 'success_pattern' | 'constraint';

  /**
   * What was learned
   */
  insight: string;

  /**
   * Confidence in this learning (0-1)
   */
  confidence: number;

  /**
   * How to apply this learning
   */
  application?: string;
}

/**
 * Matrix for complex decision making
 */
export interface DecisionMatrix {
  /**
   * Available options to choose from
   */
  options: DecisionOption[];

  /**
   * Criteria for evaluation
   */
  criteria: DecisionCriterion[];

  /**
   * Weights for each criterion (must sum to 1)
   */
  weights: Record<string, number>;

  /**
   * Scores for each option-criterion pair
   */
  scores: DecisionScore[][];

  /**
   * Analysis method used
   */
  method: 'weighted_sum' | 'ahp' | 'topsis' | 'electre';

  /**
   * Final rankings
   */
  rankings?: OptionRanking[];
}

/**
 * An option in the decision matrix
 */
export interface DecisionOption {
  /**
   * Unique identifier
   */
  id: string;

  /**
   * Name of the option
   */
  name: string;

  /**
   * Detailed description
   */
  description: string;

  /**
   * Constraints or requirements
   */
  constraints?: string[];

  /**
   * Estimated cost/resources
   */
  cost?: number;
}

/**
 * A criterion for decision evaluation
 */
export interface DecisionCriterion {
  /**
   * Unique identifier
   */
  id: string;

  /**
   * Name of the criterion
   */
  name: string;

  /**
   * Type of criterion
   */
  type: 'benefit' | 'cost'; // benefit = higher is better, cost = lower is better

  /**
   * Unit of measurement
   */
  unit?: string;

  /**
   * Whether this is a hard constraint
   */
  isConstraint?: boolean;
}

/**
 * Score for a specific option-criterion pair
 */
export interface DecisionScore {
  /**
   * Raw value
   */
  value: number;

  /**
   * Normalized score (0-1)
   */
  normalized: number;

  /**
   * Confidence in this score
   */
  confidence: number;

  /**
   * Justification for the score
   */
  justification?: string;
}

/**
 * Final ranking of an option
 */
export interface OptionRanking {
  /**
   * Option ID
   */
  optionId: string;

  /**
   * Rank (1 = best)
   */
  rank: number;

  /**
   * Final weighted score
   */
  score: number;

  /**
   * Strengths of this option
   */
  strengths: string[];

  /**
   * Weaknesses of this option
   */
  weaknesses: string[];
}

/**
 * Outcome of a learning process
 */
export interface LearningOutcome {
  /**
   * The concept that was learned
   */
  concept: string;

  /**
   * Category of the concept
   */
  category: 'fact' | 'skill' | 'pattern' | 'rule' | 'strategy';

  /**
   * Current confidence in this knowledge (0-1)
   */
  confidence: number;

  /**
   * Retention strength (0-1, decreases over time)
   */
  retention: number;

  /**
   * Number of times this has been reinforced
   */
  reinforcements: number;

  /**
   * When this was first learned
   */
  learnedAt: Date;

  /**
   * Last time this was accessed/used
   */
  lastAccessed: Date;

  /**
   * Related concepts
   */
  relatedConcepts: string[];

  /**
   * Examples that demonstrate this concept
   */
  examples?: Example[];

  /**
   * Prerequisites needed to understand this
   */
  prerequisites?: string[];
}

/**
 * Example demonstrating a concept
 */
export interface Example {
  /**
   * Example content
   */
  content: string;

  /**
   * Context where this applies
   */
  context: string;

  /**
   * Whether this is a positive or negative example
   */
  type: 'positive' | 'negative';

  /**
   * Explanation of why this is a good/bad example
   */
  explanation?: string;
}

/**
 * Enhanced thought result with structured components
 */
export interface StructuredThoughtResult {
  /**
   * Graph of interconnected thoughts
   */
  thoughtGraph: ThoughtNode[];

  /**
   * Primary reasoning paths considered
   */
  reasoningPaths: ReasoningPath[];

  /**
   * Decision matrix if applicable
   */
  decisionMatrix?: DecisionMatrix;

  /**
   * Learning outcomes from this thinking session
   */
  learnings: LearningOutcome[];

  /**
   * Emotional context
   */
  emotionalContext: EmotionState;

  /**
   * Meta-cognitive assessment
   */
  metaCognition: MetaCognition;
}

/**
 * Meta-cognitive assessment of thinking quality
 */
export interface MetaCognition {
  /**
   * Self-assessed quality of reasoning (0-1)
   */
  reasoningQuality: number;

  /**
   * Identified biases in thinking
   */
  identifiedBiases: string[];

  /**
   * Uncertainty areas
   */
  uncertainties: Uncertainty[];

  /**
   * Suggested improvements
   */
  improvements: string[];
}

/**
 * Area of uncertainty in reasoning
 */
export interface Uncertainty {
  /**
   * What is uncertain
   */
  area: string;

  /**
   * Level of uncertainty
   */
  level: 'low' | 'medium' | 'high';

  /**
   * Impact on conclusions
   */
  impact: 'minimal' | 'moderate' | 'significant';

  /**
   * How to resolve this uncertainty
   */
  resolutionStrategy?: string;
}
