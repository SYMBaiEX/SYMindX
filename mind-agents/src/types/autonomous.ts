/**
 * Autonomous AI Agent Types for SYMindX
 * 
 * Clean consolidated types for autonomous capabilities including
 * reinforcement learning, decision making, self-management, goal emergence, and meta-cognition.
 */

import { Agent, AgentAction, AgentEvent, MemoryRecord } from './agent.js'
import { BaseConfig, Context, GenericData, Metadata } from './common.js'

// =================== REINFORCEMENT LEARNING =================== //

export enum RewardSignalType {
  POSITIVE = 'positive',
  NEGATIVE = 'negative',
  NEUTRAL = 'neutral',
  CURIOSITY = 'curiosity',
  ACHIEVEMENT = 'achievement',
  EFFICIENCY = 'efficiency',
  SOCIAL = 'social',
  SURVIVAL = 'survival'
}

export interface RewardSignal {
  id: string
  type: RewardSignalType
  value: number
  source: string
  context: Context
  timestamp: Date
  agentId: string
  actionId?: string
  metadata?: Metadata
}

export interface Experience {
  id: string
  agentId: string
  state: AgentStateVector
  action: AgentAction
  reward: RewardSignal
  nextState: AgentStateVector
  done: boolean
  timestamp: Date
  importance: number
  tags: string[]
}

export interface AgentStateVector {
  id: string
  agentId: string
  timestamp: Date
  features: Record<string, number>
  context: Context
  metadata?: Metadata
}

export interface LearningConfig {
  algorithm: 'q_learning' | 'sarsa' | 'deep_q' | 'policy_gradient' | 'actor_critic'
  learningRate: number
  discountFactor: number
  explorationRate: number
  experienceReplaySize: number
  batchSize: number
  targetUpdateFrequency: number
  curiosityWeight: number
  modelSavePath?: string
}

// =================== AUTONOMOUS DECISION MAKING =================== //

export interface Constraint {
  id: string
  type: 'resource' | 'temporal' | 'logical' | 'ethical' | 'legal' | 'physical'
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  enforceable: boolean
  violationPenalty: number
  parameters: Record<string, any>
}

export interface Uncertainty {
  id: string
  type: 'aleatory' | 'epistemic' | 'model' | 'parameter'
  source: string
  description: string
  confidence: number
  impact: number
  reducible: boolean
}

export interface Goal {
  id: string
  type: 'immediate' | 'short_term' | 'long_term' | 'life_goal'
  description: string
  priority: number
  deadline?: Date
  progress: number
  measurable: boolean
  achievable: boolean
  relevant: boolean
  timebound: boolean
  subgoals: Goal[]
  dependencies: string[]
  metrics: GoalMetric[]
}

export interface GoalMetric {
  id: string
  name: string
  type: 'quantitative' | 'qualitative'
  target: any
  current: any
  unit?: string
  measurementMethod: string
}

export interface DecisionContext {
  currentState: AgentStateVector
  availableActions: AgentAction[]
  goals: Goal[]
  constraints: Constraint[]
  uncertainties: Uncertainty[]
  timeHorizon: number
  stakeholders: string[]
  environment: Context
}

export interface DecisionCriteria {
  id: string
  name: string
  weight: number
  type: 'maximize' | 'minimize' | 'satisfy'
  measurement: string
  threshold?: number
}

export interface MultiCriteriaDecision {
  id: string
  context: DecisionContext
  criteria: DecisionCriteria[]
  alternatives: AgentAction[]
  evaluation: Record<string, Record<string, number>>
  recommendation: AgentAction
  confidence: number
  reasoning: string[]
  timestamp: Date
}

// =================== RESOURCE MANAGEMENT =================== //

export interface ResourceAllocation {
  cpu: number
  memory: number
  network: number
  storage: number
  priority: number
  timestamp: Date
}

export interface ResourceMonitor {
  currentUsage: ResourceAllocation
  limits: ResourceAllocation
  predictions: ResourcePrediction[]
  alerts: ResourceAlert[]
}

export interface ResourcePrediction {
  resource: string
  timeHorizon: number
  predictedUsage: number
  confidence: number
  method: string
}

export interface ResourceAlert {
  resource: string
  level: 'warning' | 'critical'
  message: string
  timestamp: Date
  resolved: boolean
}

// =================== SELF-MANAGEMENT =================== //

export interface SelfManagementConfig {
  adaptationEnabled: boolean
  learningRate: number
  performanceThreshold: number
  adaptationTriggers: AdaptationTrigger[]
  selfHealingEnabled: boolean
  diagnosticsInterval: number
}

export interface AdaptationTrigger {
  type: 'performance' | 'error_rate' | 'resource_usage' | 'external_signal'
  condition: string
  threshold: number
  action: AdaptationAction
}

export interface AdaptationAction {
  type: 'parameter_adjustment' | 'strategy_change' | 'resource_reallocation' | 'capability_enhancement'
  parameters: Record<string, any>
  description: string
}

export interface PerformanceMetrics {
  accuracy: number
  responseTime: number
  resourceEfficiency: number
  goalAchievement: number
  adaptability: number
  reliability: number
  timestamp: Date
}

export interface DiagnosticReport {
  id: string
  timestamp: Date
  agentId: string
  overallHealth: 'healthy' | 'degraded' | 'critical' | 'failed'
  subsystems: SubsystemHealth[]
  recommendations: string[]
  autoFixApplied: boolean
}

export interface SubsystemHealth {
  name: string
  status: 'healthy' | 'degraded' | 'critical' | 'failed'
  metrics: Record<string, number>
  issues: string[]
}

// =================== GOAL EMERGENCE SYSTEM =================== //

export interface GoalSource {
  type: 'intrinsic' | 'extrinsic' | 'emergent' | 'social' | 'environment'
  description: string
  confidence: number
}

export interface GoalConflict {
  goal1: string
  goal2: string
  type: 'resource' | 'temporal' | 'logical' | 'priority'
  severity: number
  resolution?: 'priority' | 'resource_sharing' | 'temporal_scheduling' | 'goal_modification' | 'goal_abandonment'
}

export interface CuriosityDriver {
  type: 'novelty' | 'surprise' | 'uncertainty' | 'complexity' | 'knowledge_gap'
  weight: number
  threshold: number
  enabled: boolean
}

export interface GoalSystemConfig {
  maxActiveGoals: number
  goalGenerationInterval: number
  curiosityThreshold: number
  conflictResolutionStrategy: 'priority' | 'resource_sharing' | 'temporal_scheduling' | 'goal_modification' | 'goal_abandonment'
  planningHorizon: number
  adaptationRate: number
  curiosityDrivers: CuriosityDriver[]
}

// =================== META-COGNITIVE SYSTEM =================== //

export interface MetaCognition {
  selfModel: SelfModel
  metacognitiveStrategies: MetaStrategy[]
  currentStrategy: string
  performanceMonitoring: PerformanceMonitor
  strategicPlanning: StrategicPlanning
  selfEvaluation: SelfEvaluation
}

export interface SelfModel {
  capabilities: Record<string, number>
  limitations: string[]
  knowledge: KnowledgeModel
  personality: PersonalityModel
  goals: Goal[]
  strategies: Strategy[]
}

export interface KnowledgeModel {
  domains: KnowledgeDomain[]
  confidence: Record<string, number>
  gaps: string[]
  learningGoals: string[]
}

export interface KnowledgeDomain {
  name: string
  expertise: number
  lastUpdated: Date
  concepts: Concept[]
}

export interface Concept {
  name: string
  understanding: number
  connections: string[]
  examples: string[]
}

export interface PersonalityModel {
  traits: Record<string, number>
  values: Record<string, number>
  preferences: Record<string, any>
  adaptability: number
}

export interface MetaStrategy {
  id: string
  name: string
  description: string
  applicableContexts: Context[]
  effectiveness: number
  usageCount: number
  lastUsed: Date
}

export interface PerformanceMonitor {
  currentMetrics: PerformanceMetrics
  trends: PerformanceTrend[]
  benchmarks: PerformanceBenchmark[]
  alerts: PerformanceAlert[]
}

export interface PerformanceTrend {
  metric: string
  direction: 'improving' | 'stable' | 'declining'
  rate: number
  confidence: number
}

export interface PerformanceBenchmark {
  metric: string
  baseline: number
  target: number
  current: number
}

export interface PerformanceAlert {
  metric: string
  threshold: number
  actual: number
  severity: 'low' | 'medium' | 'high' | 'critical'
  recommendation: string
}

export interface StrategicPlanning {
  longTermGoals: Goal[]
  strategies: Strategy[]
  scenarios: Scenario[]
  contingencyPlans: ContingencyPlan[]
}

export interface Strategy {
  id: string
  name: string
  description: string
  goals: string[]
  actions: AgentAction[]
  resources: ResourceAllocation
  timeline: Date[]
  riskAssessment: RiskAssessment
}

export interface Scenario {
  id: string
  name: string
  description: string
  probability: number
  impact: number
  triggers: string[]
  responses: AgentAction[]
}

export interface ContingencyPlan {
  id: string
  trigger: string
  condition: string
  actions: AgentAction[]
  resources: ResourceAllocation
  priority: number
}

export interface RiskAssessment {
  risks: Risk[]
  overallRisk: number
  mitigationStrategies: string[]
}

export interface Risk {
  id: string
  description: string
  probability: number
  impact: number
  severity: 'low' | 'medium' | 'high' | 'critical'
  mitigation: string[]
}

export interface SelfEvaluation {
  strengths: string[]
  weaknesses: string[]
  opportunities: string[]
  threats: string[]
  improvementAreas: ImprovementArea[]
  learningNeeds: LearningNeed[]
}

export interface ImprovementArea {
  area: string
  currentLevel: number
  targetLevel: number
  actions: string[]
  timeline: Date
}

export interface LearningNeed {
  topic: string
  priority: number
  resources: string[]
  timeline: Date
  method: 'experience' | 'instruction' | 'observation' | 'experimentation'
}

// =================== AUTONOMOUS CONFIGURATION =================== //

export interface AutonomousConfig {
  learning: LearningConfig
  selfManagement: SelfManagementConfig
  goalSystem: GoalSystemConfig
  resourceManagement: {
    enabled: boolean
    monitoringInterval: number
    allocationStrategy: 'static' | 'dynamic' | 'predictive'
    optimizationGoals: string[]
  }
  metaCognition: {
    enabled: boolean
    selfEvaluationInterval: number
    strategyAdaptationEnabled: boolean
    performanceMonitoringEnabled: boolean
  }
}

// =================== MISSING EXPORTS =================== //

export interface AutonomousAgent extends Agent {
  autonomousConfig: AutonomousConfig
  learningModule?: LearningModule
  decisionModule?: DecisionModule
  selfManagementModule?: SelfManagementModule
  goalSystem?: GoalSystem
  metaCognitiveModule?: MetaCognitiveModule
}

export enum LearningModuleType {
  REINFORCEMENT = 'reinforcement',
  SUPERVISED = 'supervised',
  UNSUPERVISED = 'unsupervised',
  TRANSFER = 'transfer',
  META = 'meta',
  CONTINUAL = 'continual',
  ACTOR_CRITIC = 'actor_critic'
}

export enum DecisionModuleType {
  TREE = 'tree',
  NEURAL = 'neural',
  BAYESIAN = 'bayesian',
  FUZZY = 'fuzzy',
  HYBRID = 'hybrid',
  EVOLUTIONARY = 'evolutionary',
  MCDM_AHP = 'mcdm_ahp'
}

export interface DecisionConfig extends BaseConfig {
  type: DecisionModuleType
  riskTolerance: number
  decisionSpeed: number
  evaluationCriteria: string[]
}

export interface MetaCognitiveConfig extends BaseConfig {
  enabled: boolean
  selfReflectionInterval: number
  strategyAdaptation: boolean
  performanceMonitoring: boolean
  learningRateAdjustment: boolean
}

export interface DecisionModule {
  id: string
  type: DecisionModuleType
  config: DecisionConfig
  decide(context: Context, options: any[]): Promise<any>
  evaluate(decision: any, outcome: any): Promise<void>
}

export interface LearningModule {
  id: string
  type: LearningModuleType
  config: LearningConfig
  learn(experience: Experience): Promise<void>
  predict(state: AgentStateVector): Promise<any>
}

export interface SelfManagementModule {
  id: string
  config: SelfManagementConfig
  manage(agent: Agent): Promise<void>
  evaluate(): Promise<SelfEvaluation>
}

export interface EmergentGoal {
  id: string
  description: string
  priority: number
  status: 'pending' | 'active' | 'completed' | 'abandoned'
  createdAt: Date
  targetValue?: number
  currentValue?: number
  dependencies?: string[]
  context?: Context
}

export interface GoalSystem {
  id: string
  config: GoalSystemConfig
  emergentGoals: EmergentGoal[]
  addGoal(goal: EmergentGoal): Promise<void>
  evaluateGoals(): Promise<void>
}

export interface MetaCognitiveModule {
  id: string
  config: MetaCognitiveConfig
  reflect(agent: Agent): Promise<void>
  adapt(performance: any): Promise<void>
}