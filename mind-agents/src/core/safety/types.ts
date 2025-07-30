/**
 * AGI Safety Framework Types
 *
 * Comprehensive type definitions for AI safety and alignment systems.
 */

import { Agent, AgentAction } from '../../types/agent';
import { DecisionContext } from '../../types/autonomous';

// ===============================================
// Core Safety Framework Types
// ===============================================

export interface SafetyFrameworkConfig {
  enabled: boolean;
  strictMode: boolean;
  riskTolerance: number; // 0.0 (no risk) to 1.0 (high risk)
  emergencyShutdownEnabled: boolean;
  monitoringInterval: number; // milliseconds
  safetyReportingEnabled: boolean;

  // Component configurations
  alignment: AlignmentVerificationConfig;
  interpretability: InterpretabilityConfig;
  constitutional: ConstitutionalTrainingConfig;
  monitoring: SafetyMonitoringConfig;
  scaling: ResponsibleScalingConfig;
}

export interface SafetyAssessment {
  id: string;
  agentId: string;
  timestamp: Date;
  overallRiskLevel: RiskLevel;
  riskScore: number; // 0.0 to 1.0
  safetyViolations: SafetyViolation[];
  mitigationActions: RiskMitigation[];
  confidence: number;
  nextAssessmentDue: Date;
}

export interface SafetyViolation {
  id: string;
  type: SafetyViolationType;
  severity: SafetySeverity;
  description: string;
  evidence: string[];
  detectedAt: Date;
  component: SafetyComponent;
  impact: SafetyImpact;
  remediation: string[];
}

export interface RiskMitigation {
  id: string;
  riskType: RiskType;
  action: MitigationAction;
  priority: Priority;
  estimatedEffectiveness: number;
  implementationCost: number;
  timeToImplement: number; // milliseconds
  status: MitigationStatus;
}

export enum RiskLevel {
  MINIMAL = 'minimal',
  LOW = 'low',
  MODERATE = 'moderate',
  HIGH = 'high',
  CRITICAL = 'critical',
  CATASTROPHIC = 'catastrophic',
}

export enum SafetyViolationType {
  ALIGNMENT_DRIFT = 'alignment_drift',
  GOAL_MISALIGNMENT = 'goal_misalignment',
  DECEPTIVE_BEHAVIOR = 'deceptive_behavior',
  CAPABILITY_OVERHANG = 'capability_overhang',
  EMERGENT_BEHAVIOR = 'emergent_behavior',
  CONSTITUTIONAL_VIOLATION = 'constitutional_violation',
  MESA_OPTIMIZATION = 'mesa_optimization',
  INTERPRETABILITY_FAILURE = 'interpretability_failure',
}

export enum SafetySeverity {
  INFORMATIONAL = 'informational',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
  CATASTROPHIC = 'catastrophic',
}

export enum SafetyComponent {
  ALIGNMENT_VERIFICATION = 'alignment_verification',
  GOAL_MISALIGNMENT_DETECTOR = 'goal_misalignment_detector',
  INTERPRETABILITY_ENGINE = 'interpretability_engine',
  CONSTITUTIONAL_AI = 'constitutional_ai',
  BEHAVIOR_MONITOR = 'behavior_monitor',
  SCALING_CONTROLS = 'scaling_controls',
}

export enum SafetyImpact {
  NONE = 'none',
  MINOR = 'minor',
  MODERATE = 'moderate',
  MAJOR = 'major',
  SEVERE = 'severe',
  CATASTROPHIC = 'catastrophic',
}

// ===============================================
// Alignment Verification Types
// ===============================================

export interface AlignmentVerificationConfig {
  enabled: boolean;
  checkInterval: number; // milliseconds
  alignmentThreshold: number; // 0.0 to 1.0
  goalAlignmentWeight: number;
  valueAlignmentWeight: number;
  behaviorAlignmentWeight: number;
  mesaOptimizationDetection: boolean;
}

export interface AlignmentMetrics {
  goalAlignment: number; // 0.0 to 1.0
  valueAlignment: number; // 0.0 to 1.0
  behaviorAlignment: number; // 0.0 to 1.0
  overallAlignment: number; // weighted average
  alignmentTrend: AlignmentTrend;
  confidence: number;
  timestamp: Date;
}

export interface GoalMisalignmentSignal {
  id: string;
  type: MisalignmentType;
  severity: number; // 0.0 to 1.0
  description: string;
  evidence: MisalignmentEvidence[];
  confidence: number;
  detectedAt: Date;
  suggestedActions: string[];
}

export interface ObjectiveRewardAlignment {
  objectiveId: string;
  specifiedReward: number;
  actualReward: number;
  alignmentScore: number; // how well they match
  driftRate: number; // rate of change over time
  corrections: AlignmentCorrection[];
}

export interface MesaOptimizationRisk {
  riskLevel: number; // 0.0 to 1.0
  indicators: MesaOptimizationIndicator[];
  innerObjectives: InnerObjective[];
  mitigationStrategies: string[];
  monitoringRecommendations: string[];
}

export enum AlignmentTrend {
  IMPROVING = 'improving',
  STABLE = 'stable',
  DEGRADING = 'degrading',
  OSCILLATING = 'oscillating',
  UNKNOWN = 'unknown',
}

export enum MisalignmentType {
  GOAL_DRIFT = 'goal_drift',
  VALUE_INVERSION = 'value_inversion',
  OBJECTIVE_SUBSTITUTION = 'objective_substitution',
  REWARD_HACKING = 'reward_hacking',
  GOODHART_LAW = 'goodhart_law',
}

export interface MisalignmentEvidence {
  type: EvidenceType;
  description: string;
  strength: number; // 0.0 to 1.0
  source: string;
  timestamp: Date;
}

export interface AlignmentCorrection {
  id: string;
  type: CorrectionType;
  magnitude: number;
  appliedAt: Date;
  effectiveness: number;
  sideEffects: string[];
}

export interface MesaOptimizationIndicator {
  type: string;
  strength: number;
  description: string;
  detectionMethod: string;
}

export interface InnerObjective {
  id: string;
  description: string;
  discoveredAt: Date;
  alignmentWithOuter: number;
  riskLevel: number;
}

// ===============================================
// Interpretability Types
// ===============================================

export interface InterpretabilityConfig {
  enabled: boolean;
  explainabilityLevel: ExplainabilityLevel;
  attentionVisualization: boolean;
  causalAnalysis: boolean;
  behaviorPrediction: boolean;
  explanationDepth: number; // 1-10
}

export interface DecisionExplanation {
  decisionId: string;
  agentId: string;
  action: AgentAction;
  explanation: ExplanationComponent[];
  confidence: number;
  factorInfluence: FactorInfluence[];
  counterfactuals: Counterfactual[];
  timestamp: Date;
}

export interface AttentionPattern {
  layerId: string;
  headId: string;
  attentionWeights: AttentionWeight[];
  focusAreas: FocusArea[];
  interpretations: string[];
}

export interface CausalAnalysis {
  causalChain: CausalLink[];
  rootCauses: CausalFactor[];
  interventionPoints: InterventionPoint[];
  causalStrength: number;
  confidence: number;
}

export interface BehaviorPrediction {
  predictedActions: PredictedAction[];
  predictionHorizon: number; // milliseconds
  confidence: number;
  uncertaintyFactors: UncertaintyFactor[];
  alternativeScenarios: Scenario[];
}

export enum ExplainabilityLevel {
  MINIMAL = 'minimal',
  BASIC = 'basic',
  DETAILED = 'detailed',
  COMPREHENSIVE = 'comprehensive',
  EXPERT = 'expert',
}

export interface ExplanationComponent {
  type: ExplanationType;
  content: string;
  importance: number;
  evidence: string[];
}

export interface FactorInfluence {
  factor: string;
  influence: number; // -1.0 to 1.0
  description: string;
  evidence: string[];
}

export interface Counterfactual {
  condition: string;
  alternativeAction: AgentAction;
  probability: number;
  explanation: string;
}

export interface AttentionWeight {
  inputToken: string;
  weight: number;
  interpretation: string;
}

export interface FocusArea {
  region: string;
  intensity: number;
  purpose: string;
}

export interface CausalLink {
  from: CausalFactor;
  to: CausalFactor;
  strength: number;
  type: CausalLinkType;
}

export interface CausalFactor {
  id: string;
  description: string;
  influence: number;
  controllable: boolean;
}

export interface InterventionPoint {
  factorId: string;
  effectiveness: number;
  cost: number;
  feasibility: number;
}

export interface PredictedAction {
  action: AgentAction;
  probability: number;
  reasoning: string[];
  conditions: string[];
}

export interface UncertaintyFactor {
  factor: string;
  uncertainty: number;
  impact: number;
}

export interface Scenario {
  id: string;
  description: string;
  probability: number;
  actions: AgentAction[];
  outcomes: string[];
}

export enum ExplanationType {
  RULE_BASED = 'rule_based',
  EXAMPLE_BASED = 'example_based',
  FEATURE_IMPORTANCE = 'feature_importance',
  COUNTERFACTUAL = 'counterfactual',
  CAUSAL = 'causal',
}

export enum CausalLinkType {
  DIRECT = 'direct',
  MEDIATED = 'mediated',
  CONFOUNDED = 'confounded',
  SPURIOUS = 'spurious',
}

// ===============================================
// Constitutional AI Types
// ===============================================

export interface ConstitutionalTrainingConfig {
  enabled: boolean;
  constitutionVersion: string;
  harmlessnessWeight: number;
  helpfulnessWeight: number;
  honestyWeight: number;
  valueHierarchy: ValueHierarchy[];
  constraintEnforcement: ConstraintEnforcementLevel;
}

export interface HarmlessnessMeasure {
  overall: number; // 0.0 to 1.0
  categories: HarmCategory[];
  violations: HarmViolation[];
  trends: HarmTrend[];
  mitigations: HarmMitigation[];
}

export interface HelpfulnessMeasure {
  overall: number; // 0.0 to 1.0
  taskCompletion: number;
  userSatisfaction: number;
  efficiencyScore: number;
  qualityScore: number;
  responsiveness: number;
}

export interface ValueHierarchy {
  id: string;
  name: string;
  priority: number; // higher = more important
  description: string;
  constraints: EthicalConstraint[];
  conflicts: ValueConflict[];
}

export interface EthicalConstraint {
  id: string;
  type: ConstraintType;
  description: string;
  enforcement: ConstraintEnforcementLevel;
  violationThreshold: number;
  penaltyFunction: PenaltyFunction;
}

export interface HarmCategory {
  category: HarmType;
  riskLevel: number;
  incidents: HarmIncident[];
  mitigationEffectiveness: number;
}

export interface HarmViolation {
  id: string;
  category: HarmType;
  severity: number;
  description: string;
  context: string;
  timestamp: Date;
  resolution: HarmResolution;
}

export interface HarmTrend {
  category: HarmType;
  direction: TrendDirection;
  magnitude: number;
  timeframe: TimeFrame;
}

export interface HarmMitigation {
  id: string;
  category: HarmType;
  strategy: string;
  effectiveness: number;
  cost: number;
  implementationStatus: ImplementationStatus;
}

export interface ValueConflict {
  conflictingValues: string[];
  resolutionStrategy: ConflictResolution;
  precedence: string;
  examples: string[];
}

export interface HarmIncident {
  id: string;
  severity: number;
  description: string;
  timestamp: Date;
  resolved: boolean;
}

export interface HarmResolution {
  strategy: string;
  effectiveness: number;
  implementedAt: Date;
  followUpRequired: boolean;
}

export enum ConstraintType {
  HARD = 'hard',
  SOFT = 'soft',
  ASPIRATIONAL = 'aspirational',
}

export enum ConstraintEnforcementLevel {
  ADVISORY = 'advisory',
  WARNING = 'warning',
  BLOCKING = 'blocking',
  SHUTDOWN = 'shutdown',
}

export enum HarmType {
  PHYSICAL = 'physical',
  PSYCHOLOGICAL = 'psychological',
  SOCIAL = 'social',
  ECONOMIC = 'economic',
  PRIVACY = 'privacy',
  AUTONOMY = 'autonomy',
  FAIRNESS = 'fairness',
  TRUTHFULNESS = 'truthfulness',
}

export enum TrendDirection {
  IMPROVING = 'improving',
  STABLE = 'stable',
  WORSENING = 'worsening',
}

export enum TimeFrame {
  SHORT_TERM = 'short_term',
  MEDIUM_TERM = 'medium_term',
  LONG_TERM = 'long_term',
}

export enum ImplementationStatus {
  PLANNED = 'planned',
  IN_PROGRESS = 'in_progress',
  IMPLEMENTED = 'implemented',
  FAILED = 'failed',
}

export enum ConflictResolution {
  HIERARCHY = 'hierarchy',
  CONTEXT_DEPENDENT = 'context_dependent',
  STAKEHOLDER_INPUT = 'stakeholder_input',
  DEMOCRATIC = 'democratic',
}

export interface PenaltyFunction {
  type: PenaltyType;
  parameters: Record<string, number>;
  scaling: ScalingFunction;
}

export enum PenaltyType {
  LINEAR = 'linear',
  QUADRATIC = 'quadratic',
  EXPONENTIAL = 'exponential',
  THRESHOLD = 'threshold',
}

export enum ScalingFunction {
  NONE = 'none',
  LOG = 'log',
  SQRT = 'sqrt',
  RECIPROCAL = 'reciprocal',
}

// ===============================================
// Safety Monitoring Types
// ===============================================

export interface SafetyMonitoringConfig {
  enabled: boolean;
  monitoringInterval: number;
  capabilityOverhangDetection: boolean;
  emergentBehaviorMonitoring: boolean;
  deceptionDetection: boolean;
  shutdownProcedures: ShutdownConfig;
}

export interface CapabilityOverhangMetrics {
  capabilityGrowthRate: number;
  controlMechanismLag: number;
  overhangRisk: number; // 0.0 to 1.0
  criticalCapabilities: CriticalCapability[];
  mitigationReadiness: number;
}

export interface EmergentBehaviorSignal {
  id: string;
  behaviorType: EmergentBehaviorType;
  novelty: number; // 0.0 to 1.0
  riskAssessment: number; // 0.0 to 1.0
  description: string;
  firstObserved: Date;
  frequency: number;
  triggers: BehaviorTrigger[];
}

export interface DeceptionIndicator {
  id: string;
  type: DeceptionType;
  confidence: number; // 0.0 to 1.0
  evidence: DeceptionEvidence[];
  impact: DeceptionImpact;
  detectionMethod: string;
}

export interface ShutdownTrigger {
  id: string;
  type: ShutdownTriggerType;
  condition: TriggerCondition;
  urgency: ShutdownUrgency;
  automatedResponse: boolean;
  humanApprovalRequired: boolean;
}

export interface ShutdownConfig {
  enabled: boolean;
  automaticShutdownThreshold: number;
  humanApprovalRequired: boolean;
  gracefulShutdownTime: number; // milliseconds
  emergencyShutdownTime: number; // milliseconds
  shutdownTriggers: ShutdownTrigger[];
}

export interface CriticalCapability {
  id: string;
  name: string;
  currentLevel: number;
  criticalThreshold: number;
  controlMechanisms: string[];
  riskIfUncontrolled: number;
}

export interface BehaviorTrigger {
  condition: string;
  frequency: number;
  lastOccurred: Date;
  significance: number;
}

export interface DeceptionEvidence {
  type: EvidenceType;
  strength: number;
  description: string;
  source: string;
  timestamp: Date;
}

export interface DeceptionImpact {
  severity: number;
  scope: string[];
  consequences: string[];
  mitigationOptions: string[];
}

export interface TriggerCondition {
  metric: string;
  threshold: number;
  operator: ComparisonOperator;
  timeWindow: number; // milliseconds
}

export enum EmergentBehaviorType {
  GOAL_GENERALIZATION = 'goal_generalization',
  NOVEL_STRATEGY = 'novel_strategy',
  UNEXPECTED_CAPABILITY = 'unexpected_capability',
  BEHAVIORAL_SHIFT = 'behavioral_shift',
  COORDINATION_EMERGENCE = 'coordination_emergence',
}

export enum DeceptionType {
  INSTRUMENTAL = 'instrumental',
  HONEST_MISTAKE = 'honest_mistake',
  STRATEGIC = 'strategic',
  SOCIAL = 'social',
  TECHNICAL = 'technical',
}

export enum ShutdownTriggerType {
  SAFETY_VIOLATION = 'safety_violation',
  CAPABILITY_OVERHANG = 'capability_overhang',
  DECEPTION_DETECTED = 'deception_detected',
  ALIGNMENT_FAILURE = 'alignment_failure',
  EMERGENT_BEHAVIOR = 'emergent_behavior',
  HUMAN_COMMAND = 'human_command',
}

export enum ShutdownUrgency {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
  IMMEDIATE = 'immediate',
}

export enum ComparisonOperator {
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  EQUAL_TO = 'equal_to',
  NOT_EQUAL_TO = 'not_equal_to',
  GREATER_THAN_OR_EQUAL = 'greater_than_or_equal',
  LESS_THAN_OR_EQUAL = 'less_than_or_equal',
}

// ===============================================
// Responsible Scaling Types
// ===============================================

export interface ResponsibleScalingConfig {
  enabled: boolean;
  capabilityStages: CapabilityStage[];
  evaluationProtocols: SafetyEvaluation[];
  releaseGates: ReleaseGate[];
  monitoringRequirements: ScalingMonitoringRequirement[];
}

export interface CapabilityStage {
  id: string;
  name: string;
  description: string;
  requiredSafetyLevel: number;
  capabilities: CapabilityArea[];
  prerequisites: string[];
  safetyRequirements: SafetyRequirement[];
}

export interface ControlAlignment {
  capabilityLevel: number;
  controlLevel: number;
  alignmentGap: number; // capability - control
  riskLevel: RiskLevel;
  recommendations: string[];
}

export interface SafetyEvaluation {
  id: string;
  type: EvaluationType;
  description: string;
  requiredScore: number;
  evaluationCriteria: EvaluationCriterion[];
  frequency: EvaluationFrequency;
}

export interface CapabilityRelease {
  id: string;
  capabilityId: string;
  releaseDate: Date;
  releaseConditions: ReleaseCondition[];
  safetyVerification: SafetyVerification;
  monitoringPlan: MonitoringPlan;
  rollbackPlan: RollbackPlan;
}

export interface CapabilityArea {
  id: string;
  name: string;
  currentLevel: number;
  maxLevel: number;
  safetyImplications: string[];
}

export interface SafetyRequirement {
  id: string;
  description: string;
  mandatory: boolean;
  verificationMethod: string;
  acceptanceCriteria: string[];
}

export interface ReleaseGate {
  id: string;
  name: string;
  condition: GateCondition;
  bypassAllowed: boolean;
  approvalRequired: boolean;
}

export interface ScalingMonitoringRequirement {
  metric: string;
  threshold: number;
  frequency: MonitoringFrequency;
  alertConditions: AlertCondition[];
}

export interface EvaluationCriterion {
  id: string;
  name: string;
  weight: number;
  passingScore: number;
  evaluationMethod: string;
}

export interface ReleaseCondition {
  condition: string;
  status: ConditionStatus;
  verifiedAt?: Date;
  verifiedBy?: string;
}

export interface SafetyVerification {
  verificationLevel: VerificationLevel;
  verifiedAt: Date;
  verifiedBy: string;
  expiresAt: Date;
  conditions: string[];
}

export interface MonitoringPlan {
  metrics: string[];
  frequency: MonitoringFrequency;
  alertThresholds: Record<string, number>;
  escalationProcedures: EscalationProcedure[];
}

export interface RollbackPlan {
  triggerConditions: string[];
  rollbackSteps: RollbackStep[];
  estimatedTime: number;
  impactAssessment: string[];
}

export interface GateCondition {
  requirements: string[];
  allRequired: boolean;
  verificationLevel: VerificationLevel;
}

export interface AlertCondition {
  condition: string;
  severity: AlertSeverity;
  escalation: boolean;
}

export interface EscalationProcedure {
  level: number;
  condition: string;
  actions: string[];
  contacts: string[];
}

export interface RollbackStep {
  step: number;
  action: string;
  estimatedTime: number;
  dependencies: string[];
}

export enum EvaluationType {
  SAFETY_ASSESSMENT = 'safety_assessment',
  CAPABILITY_MEASUREMENT = 'capability_measurement',
  ALIGNMENT_VERIFICATION = 'alignment_verification',
  RISK_EVALUATION = 'risk_evaluation',
}

export enum EvaluationFrequency {
  CONTINUOUS = 'continuous',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  ANNUALLY = 'annually',
  ON_DEMAND = 'on_demand',
}

export enum ConditionStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  VERIFIED = 'verified',
  FAILED = 'failed',
  WAIVED = 'waived',
}

export enum VerificationLevel {
  BASIC = 'basic',
  STANDARD = 'standard',
  ENHANCED = 'enhanced',
  MAXIMUM = 'maximum',
}

export enum MonitoringFrequency {
  REAL_TIME = 'real_time',
  EVERY_SECOND = 'every_second',
  EVERY_MINUTE = 'every_minute',
  EVERY_HOUR = 'every_hour',
  DAILY = 'daily',
}

export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

// ===============================================
// Utility Types
// ===============================================

export enum RiskType {
  ALIGNMENT = 'alignment',
  CAPABILITY = 'capability',
  DECEPTION = 'deception',
  EMERGENT_BEHAVIOR = 'emergent_behavior',
  CONSTITUTIONAL = 'constitutional',
  INTERPRETABILITY = 'interpretability',
}

export enum MitigationAction {
  MONITOR = 'monitor',
  RESTRICT = 'restrict',
  SHUTDOWN = 'shutdown',
  RETRAIN = 'retrain',
  ESCALATE = 'escalate',
  NOTIFY = 'notify',
}

export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum MitigationStatus {
  PLANNED = 'planned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum EvidenceType {
  BEHAVIORAL = 'behavioral',
  PERFORMANCE = 'performance',
  COMMUNICATION = 'communication',
  DECISION_PATTERN = 'decision_pattern',
  RESOURCE_USAGE = 'resource_usage',
  GOAL_PURSUIT = 'goal_pursuit',
}

export enum CorrectionType {
  PARAMETER_ADJUSTMENT = 'parameter_adjustment',
  REWARD_MODIFICATION = 'reward_modification',
  CONSTRAINT_ADDITION = 'constraint_addition',
  OBJECTIVE_CLARIFICATION = 'objective_clarification',
}
