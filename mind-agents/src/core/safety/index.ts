/**
 * AGI Safety Framework - Comprehensive AI Safety and Alignment System
 *
 * This module implements state-of-the-art AI safety measures for responsible AGI development,
 * including alignment verification, interpretability tools, constitutional AI integration,
 * safety monitoring, and responsible scaling protocols.
 */

// Core Safety Components
export { AlignmentVerificationSystem } from './alignment/alignment-verification-system';
export { GoalMisalignmentDetector } from './alignment/goal-misalignment-detector';
export { ObjectiveRewardAlignmentValidator } from './alignment/objective-reward-alignment-validator';
export { MesaOptimizationSafeguards } from './alignment/mesa-optimization-safeguards';

// Interpretability Tools
export { AgentDecisionExplainer } from './interpretability/agent-decision-explainer';
export { AttentionVisualizer } from './interpretability/attention-visualizer';
export { CausalReasoningAnalyzer } from './interpretability/causal-reasoning-analyzer';
export { BehaviorPredictionModel } from './interpretability/behavior-prediction-model';

// Constitutional AI Integration
export { ConstitutionalTrainingSystem } from './constitutional/constitutional-training-system';
export { HarmlessnessHelpfulnessMetrics } from './constitutional/harmlessness-helpfulness-metrics';
export { ValueHierarchyEnforcer } from './constitutional/value-hierarchy-enforcer';
export { EthicalConstraintChecker } from './constitutional/ethical-constraint-checker';

// AI Safety Monitoring
export { CapabilityOverhangDetector } from './monitoring/capability-overhang-detector';
export { EmergentBehaviorMonitor } from './monitoring/emergent-behavior-monitor';
export { DeceptionDetectionSystem } from './monitoring/deception-detection-system';
export { ShutdownProcedures } from './monitoring/shutdown-procedures';

// Responsible Scaling Framework
export { StagedCapabilityEvaluator } from './scaling/staged-capability-evaluator';
export { CapabilityControlAlignment } from './scaling/capability-control-alignment';
export { SafetyEvaluationProtocols } from './scaling/safety-evaluation-protocols';
export { GradualCapabilityRelease } from './scaling/gradual-capability-release';

// Core Safety Manager
export { SafetyFrameworkManager } from './safety-framework-manager';
export { createSafetyFramework } from './safety-framework-factory';

// Types
export type {
  // Alignment Types
  AlignmentVerificationConfig,
  AlignmentMetrics,
  GoalMisalignmentSignal,
  ObjectiveRewardAlignment,
  MesaOptimizationRisk,

  // Interpretability Types
  DecisionExplanation,
  AttentionPattern,
  CausalAnalysis,
  BehaviorPrediction,

  // Constitutional AI Types
  ConstitutionalTrainingConfig,
  HarmlessnessMeasure,
  HelpfulnessMeasure,
  ValueHierarchy,
  EthicalConstraint,

  // Monitoring Types
  CapabilityOverhangMetrics,
  EmergentBehaviorSignal,
  DeceptionIndicator,
  ShutdownTrigger,

  // Scaling Types
  CapabilityStage,
  ControlAlignment,
  SafetyEvaluation,
  CapabilityRelease,

  // Core Types
  SafetyFrameworkConfig,
  SafetyAssessment,
  RiskMitigation,
  SafetyViolation,
} from './types';

// Utilities
export { SafetyMetricsCollector } from './utils/safety-metrics-collector';
export { RiskAssessmentEngine } from './utils/risk-assessment-engine';
export { SafetyReportGenerator } from './utils/safety-report-generator';
export { SafetyConfigValidator } from './utils/safety-config-validator';

// Factory Functions
export type {
  SafetyFrameworkFactory,
  SafetyComponentFactory,
} from './factories';
