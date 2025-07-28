/**
 * Planning-specific types for HTN and PDDL planning systems
 */

// Re-export from cognition module to maintain compatibility
export type { PDDLExpression, PDDLProblem } from '../cognition';

/**
 * HTN (Hierarchical Task Network) Operator
 */
export interface HTNOperator {
  /**
   * Unique identifier for the operator
   */
  id: string;

  /**
   * Name of the operator
   */
  name: string;

  /**
   * Type of operator
   */
  type: 'primitive' | 'compound' | 'method';

  /**
   * Preconditions that must be satisfied
   */
  preconditions: HTNPrecondition[];

  /**
   * Effects of applying this operator
   */
  effects: HTNEffect[];

  /**
   * Cost of applying this operator
   */
  cost: number;

  /**
   * Parameters required by this operator
   */
  parameters?: HTNParameter[];

  /**
   * For compound operators, the decomposition
   */
  decomposition?: HTNDecomposition;

  /**
   * Constraints on when this can be applied
   */
  constraints?: HTNConstraint[];

  /**
   * Priority relative to other operators
   */
  priority?: number;
}

/**
 * HTN Precondition
 */
export interface HTNPrecondition {
  /**
   * Type of precondition
   */
  type: 'state' | 'resource' | 'temporal' | 'knowledge';

  /**
   * The predicate or condition name
   */
  predicate: string;

  /**
   * Parameters for the precondition
   */
  parameters: string[];

  /**
   * Whether this condition must be true or false
   */
  positive: boolean;

  /**
   * Optional value comparison
   */
  comparison?: {
    operator: '=' | '!=' | '<' | '>' | '<=' | '>=';
    value: string | number | boolean;
  };
}

/**
 * HTN Effect
 */
export interface HTNEffect {
  /**
   * Type of effect
   */
  type: 'add' | 'delete' | 'update' | 'resource';

  /**
   * The predicate or state affected
   */
  predicate: string;

  /**
   * Parameters for the effect
   */
  parameters: string[];

  /**
   * For update effects, the new value
   */
  value?: string | number | boolean | Record<string, unknown>;

  /**
   * Probability of this effect occurring (default 1.0)
   */
  probability?: number;

  /**
   * Conditions under which this effect applies
   */
  conditions?: HTNPrecondition[];
}

/**
 * HTN Parameter
 */
export interface HTNParameter {
  /**
   * Parameter name
   */
  name: string;

  /**
   * Parameter type
   */
  type: string;

  /**
   * Whether this parameter is required
   */
  required: boolean;

  /**
   * Default value if not required
   */
  defaultValue?: string | number | boolean | null;

  /**
   * Constraints on valid values
   */
  constraints?: string[];
}

/**
 * HTN Decomposition for compound tasks
 */
export interface HTNDecomposition {
  /**
   * Method name
   */
  method: string;

  /**
   * Ordered subtasks
   */
  subtasks: HTNSubtask[];

  /**
   * Ordering constraints between subtasks
   */
  ordering: HTNOrdering[];

  /**
   * Variable bindings
   */
  bindings?: Record<string, string>;
}

/**
 * HTN Subtask
 */
export interface HTNSubtask {
  /**
   * Unique ID within the decomposition
   */
  id: string;

  /**
   * Task name
   */
  task: string;

  /**
   * Parameters for the task
   */
  parameters: string[];

  /**
   * Whether this subtask is optional
   */
  optional?: boolean;
}

/**
 * HTN Ordering constraint
 */
export interface HTNOrdering {
  /**
   * Type of ordering
   */
  type: 'before' | 'after' | 'parallel' | 'choice';

  /**
   * First task ID
   */
  first: string;

  /**
   * Second task ID
   */
  second: string;

  /**
   * Optional delay between tasks
   */
  delay?: number;
}

/**
 * HTN Constraint
 */
export interface HTNConstraint {
  /**
   * Type of constraint
   */
  type: 'temporal' | 'resource' | 'binding' | 'mutual_exclusion';

  /**
   * Description of the constraint
   */
  description: string;

  /**
   * Constraint expression
   */
  expression: string;

  /**
   * Whether this is a hard constraint
   */
  hard: boolean;
}

/**
 * PDDL Domain definition
 */
export interface PDDLDomain {
  /**
   * Domain name
   */
  name: string;

  /**
   * Required PDDL features
   */
  requirements: PDDLRequirement[];

  /**
   * Type hierarchy
   */
  types: PDDLType[];

  /**
   * Constants in the domain
   */
  constants?: PDDLConstant[];

  /**
   * Predicates available
   */
  predicates: PDDLPredicate[];

  /**
   * Functions for numeric planning
   */
  functions?: PDDLFunction[];

  /**
   * Actions that can be performed
   */
  actions: PDDLAction[];

  /**
   * Axioms/derived predicates
   */
  axioms?: PDDLAxiom[];

  /**
   * Domain constraints
   */
  constraints?: PDDLConstraint[];
}

/**
 * PDDL Requirement
 */
export type PDDLRequirement =
  | ':strips'
  | ':typing'
  | ':negative-preconditions'
  | ':disjunctive-preconditions'
  | ':equality'
  | ':existential-preconditions'
  | ':universal-preconditions'
  | ':conditional-effects'
  | ':fluents'
  | ':numeric-fluents'
  | ':durative-actions'
  | ':timed-initial-literals'
  | ':constraints'
  | ':preferences';

/**
 * PDDL Type
 */
export interface PDDLType {
  /**
   * Type name
   */
  name: string;

  /**
   * Parent type (for type hierarchy)
   */
  parent?: string;

  /**
   * Whether this is a primitive type
   */
  primitive?: boolean;
}

/**
 * PDDL Constant
 */
export interface PDDLConstant {
  /**
   * Constant name
   */
  name: string;

  /**
   * Type of the constant
   */
  type: string;
}

/**
 * Enhanced PDDL Predicate
 */
export interface PDDLPredicate {
  /**
   * Predicate name
   */
  name: string;

  /**
   * Parameters with types
   */
  parameters: PDDLTypedParameter[];

  /**
   * Documentation
   */
  description?: string;
}

/**
 * PDDL Typed Parameter
 */
export interface PDDLTypedParameter {
  /**
   * Parameter variable name
   */
  name: string;

  /**
   * Parameter type
   */
  type: string;

  /**
   * Whether this parameter is optional
   */
  optional?: boolean;
}

/**
 * PDDL Function for numeric planning
 */
export interface PDDLFunction {
  /**
   * Function name
   */
  name: string;

  /**
   * Parameters
   */
  parameters: PDDLTypedParameter[];

  /**
   * Return type (usually 'number')
   */
  returnType: string;

  /**
   * Initial value expression
   */
  initialValue?: string;
}

/**
 * Enhanced PDDL Action
 */
export interface PDDLAction {
  /**
   * Action name
   */
  name: string;

  /**
   * Action parameters
   */
  parameters: PDDLTypedParameter[];

  /**
   * Precondition formula
   */
  precondition: PDDLFormula;

  /**
   * Effect formula
   */
  effect: PDDLFormula;

  /**
   * Duration for durative actions
   */
  duration?: PDDLDuration;

  /**
   * Cost/metric contribution
   */
  cost?: number | string;

  /**
   * Documentation
   */
  description?: string;
}

/**
 * PDDL Formula (recursive structure for complex conditions)
 */
export interface PDDLFormula {
  /**
   * Formula type
   */
  type:
    | 'and'
    | 'or'
    | 'not'
    | 'imply'
    | 'forall'
    | 'exists'
    | 'atom'
    | 'comparison'
    | 'assign'
    | 'increase'
    | 'decrease';

  /**
   * For atoms and comparisons
   */
  predicate?: string;

  /**
   * For atoms
   */
  parameters?: string[];

  /**
   * For logical operators
   */
  operands?: PDDLFormula[];

  /**
   * For quantifiers
   */
  variables?: PDDLTypedParameter[];

  /**
   * For quantifiers and conditionals
   */
  formula?: PDDLFormula;

  /**
   * For comparisons
   */
  operator?: '=' | '!=' | '<' | '>' | '<=' | '>=';

  /**
   * For comparisons and assignments
   */
  left?: string | PDDLFormula;
  right?: string | number | PDDLFormula;

  /**
   * For numeric operations
   */
  value?: number | string;
}

/**
 * PDDL Duration for durative actions
 */
export interface PDDLDuration {
  /**
   * Duration type
   */
  type: 'fixed' | 'variable' | 'inequality';

  /**
   * For fixed durations
   */
  value?: number;

  /**
   * For variable durations
   */
  expression?: string;

  /**
   * For inequality durations
   */
  constraints?: DurationConstraint[];
}

/**
 * Duration constraint
 */
export interface DurationConstraint {
  /**
   * Operator
   */
  operator: '=' | '<' | '>' | '<=' | '>=';

  /**
   * Value or expression
   */
  value: number | string;
}

/**
 * PDDL Axiom (derived predicate)
 */
export interface PDDLAxiom {
  /**
   * Derived predicate head
   */
  head: {
    predicate: string;
    parameters: PDDLTypedParameter[];
  };

  /**
   * Condition under which this is true
   */
  body: PDDLFormula;
}

/**
 * PDDL Constraint
 */
export interface PDDLConstraint {
  /**
   * Constraint type
   */
  type:
    | 'always'
    | 'sometime'
    | 'at-most-once'
    | 'sometime-after'
    | 'sometime-before';

  /**
   * Constraint formula
   */
  formula: PDDLFormula;

  /**
   * For temporal constraints
   */
  timepoint?: number | string;
}

/**
 * Plan validation result
 */
export interface PlanValidation {
  /**
   * Whether the plan is valid
   */
  valid: boolean;

  /**
   * Detected conflicts
   */
  conflicts: PlanConflict[];

  /**
   * Suggestions for fixing issues
   */
  suggestions: ValidationSuggestion[];

  /**
   * Warnings that don't invalidate the plan
   */
  warnings?: PlanWarning[];

  /**
   * Overall plan quality score (0-1)
   */
  qualityScore?: number;

  /**
   * Detailed validation report
   */
  report?: ValidationReport;
}

/**
 * Plan conflict
 */
export interface PlanConflict {
  /**
   * Type of conflict
   */
  type: 'precondition' | 'resource' | 'temporal' | 'effect' | 'constraint';

  /**
   * Steps involved in the conflict
   */
  steps: string[];

  /**
   * Description of the conflict
   */
  description: string;

  /**
   * Severity of the conflict
   */
  severity: 'critical' | 'major' | 'minor';
}

/**
 * Validation suggestion
 */
export interface ValidationSuggestion {
  /**
   * Type of suggestion
   */
  type:
    | 'reorder'
    | 'add_step'
    | 'remove_step'
    | 'modify_parameter'
    | 'add_constraint';

  /**
   * Target of the suggestion
   */
  target: string | string[];

  /**
   * Suggested action
   */
  action: string;

  /**
   * Expected improvement
   */
  expectedImprovement: string;

  /**
   * Confidence in this suggestion (0-1)
   */
  confidence: number;
}

/**
 * Plan warning
 */
export interface PlanWarning {
  /**
   * Warning type
   */
  type: 'efficiency' | 'robustness' | 'resource_usage' | 'timing';

  /**
   * Warning message
   */
  message: string;

  /**
   * Affected steps
   */
  affectedSteps?: string[];

  /**
   * Suggested mitigation
   */
  mitigation?: string;
}

/**
 * Detailed validation report
 */
export interface ValidationReport {
  /**
   * Precondition analysis
   */
  preconditions: {
    satisfied: string[];
    unsatisfied: string[];
    uncertain: string[];
  };

  /**
   * Effect analysis
   */
  effects: {
    achieved: string[];
    conflicting: string[];
    redundant: string[];
  };

  /**
   * Resource usage
   */
  resources: Record<string, ResourceUsage>;

  /**
   * Temporal analysis
   */
  temporal: {
    totalDuration: number;
    criticalPath: string[];
    slack: Record<string, number>;
  };
}

/**
 * Resource usage information
 */
export interface ResourceUsage {
  /**
   * Total amount used
   */
  total: number;

  /**
   * Peak usage
   */
  peak: number;

  /**
   * When peak occurs
   */
  peakTime?: number;

  /**
   * Available amount
   */
  available: number;

  /**
   * Usage timeline
   */
  timeline?: ResourceTimepoint[];
}

/**
 * Resource usage at a specific time
 */
export interface ResourceTimepoint {
  /**
   * Time
   */
  time: number;

  /**
   * Amount in use
   */
  usage: number;

  /**
   * Steps using the resource
   */
  consumers: string[];
}

/**
 * Goal state specification
 */
export interface GoalState {
  /**
   * Goal predicates that must be true
   */
  predicates: GoalPredicate[];

  /**
   * Priority of achieving this goal
   */
  priority: number;

  /**
   * Deadline for achieving the goal
   */
  deadline?: Date;

  /**
   * Soft constraints (preferences)
   */
  preferences?: GoalPreference[];

  /**
   * Metric to optimize
   */
  metric?: OptimizationMetric;

  /**
   * Goal dependencies
   */
  dependencies?: string[];
}

/**
 * Goal predicate
 */
export interface GoalPredicate {
  /**
   * Predicate name
   */
  name: string;

  /**
   * Parameters
   */
  parameters: string[];

  /**
   * Whether this must be true or false
   */
  positive: boolean;

  /**
   * Importance weight
   */
  weight?: number;

  /**
   * Whether this is a hard requirement
   */
  required: boolean;
}

/**
 * Goal preference (soft constraint)
 */
export interface GoalPreference {
  /**
   * Preference name
   */
  name: string;

  /**
   * Preference formula
   */
  formula: PDDLFormula;

  /**
   * Violation penalty
   */
  penalty: number;
}

/**
 * Optimization metric
 */
export interface OptimizationMetric {
  /**
   * Optimization direction
   */
  direction: 'minimize' | 'maximize';

  /**
   * What to optimize
   */
  expression: string;

  /**
   * Components of the metric
   */
  components?: MetricComponent[];
}

/**
 * Component of an optimization metric
 */
export interface MetricComponent {
  /**
   * Component name
   */
  name: string;

  /**
   * Weight in the overall metric
   */
  weight: number;

  /**
   * How to compute this component
   */
  computation: string;
}

/**
 * Planning domain configuration
 */
export interface PlanningDomainConfig {
  /**
   * Domain specification
   */
  domain: PDDLDomain | HTNDomain;

  /**
   * Available operators/actions
   */
  operators: Map<string, HTNOperator | PDDLAction>;

  /**
   * Initial state
   */
  initialState: Set<string>;

  /**
   * State invariants
   */
  invariants?: StateInvariant[];

  /**
   * Domain heuristics
   */
  heuristics?: DomainHeuristic[];
}

/**
 * HTN Domain (alternative to PDDL)
 */
export interface HTNDomain {
  /**
   * Domain name
   */
  name: string;

  /**
   * Task hierarchy
   */
  tasks: Map<string, HTNTask>;

  /**
   * Available methods
   */
  methods: Map<string, HTNMethod>;

  /**
   * Primitive operators
   */
  operators: Map<string, HTNOperator>;
}

/**
 * HTN Task definition
 */
export interface HTNTask {
  /**
   * Task name
   */
  name: string;

  /**
   * Whether this is primitive
   */
  primitive: boolean;

  /**
   * Parameters
   */
  parameters: HTNParameter[];

  /**
   * Applicable methods
   */
  methods?: string[];
}

/**
 * HTN Method
 */
export interface HTNMethod {
  /**
   * Method name
   */
  name: string;

  /**
   * Task this decomposes
   */
  task: string;

  /**
   * Preconditions
   */
  preconditions: HTNPrecondition[];

  /**
   * Decomposition
   */
  decomposition: HTNDecomposition;
}

/**
 * State invariant
 */
export interface StateInvariant {
  /**
   * Invariant name
   */
  name: string;

  /**
   * Invariant formula
   */
  formula: PDDLFormula;

  /**
   * What happens on violation
   */
  onViolation: 'error' | 'warning' | 'repair';
}

/**
 * Domain heuristic
 */
export interface DomainHeuristic {
  /**
   * Heuristic name
   */
  name: string;

  /**
   * When to apply
   */
  condition: PDDLFormula;

  /**
   * Heuristic value or computation
   */
  value: number | string;

  /**
   * Heuristic type
   */
  type: 'state_evaluation' | 'action_preference' | 'goal_distance';
}
