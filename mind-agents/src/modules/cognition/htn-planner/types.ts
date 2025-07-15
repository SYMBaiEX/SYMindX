import { BaseConfig } from '../../../types/common';

export interface HTNPlannerConfig extends BaseConfig {
  // Planning parameters
  maxPlanningDepth?: number;
  maxPlanSteps?: number;
  planningTimeout?: number;

  // Decomposition settings
  enableDecomposition?: boolean;
  maxDecompositionLevels?: number;

  // Goal management
  goalPriorityWeighting?: boolean;
  parallelGoalHandling?: boolean;

  // Performance tuning
  cacheDecompositions?: boolean;
  optimizePlans?: boolean;
  useHeuristics?: boolean;
}

export interface TaskNetwork {
  tasks: Task[];
  methods: Method[];
  ordering: TaskOrdering[];
}

export interface Task {
  id: string;
  name: string;
  type: 'primitive' | 'compound';
  parameters: Record<string, unknown>;
  preconditions?: string[];
  effects?: string[];
}

export interface Method {
  id: string;
  taskId: string;
  name: string;
  preconditions: string[];
  subtasks: string[];
  ordering: TaskOrdering[];
}

export interface TaskOrdering {
  before: string;
  after: string;
  type: 'strict' | 'partial';
}
