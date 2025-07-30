/**
 * AI Act 2025 Compliance Type Definitions
 *
 * Types for EU AI Act compliance, explainability, and human oversight
 */

// Core data types for AI system inputs and outputs
export interface AISystemInput {
  messageId?: string;
  content: string;
  metadata?: {
    timestamp?: Date;
    userId?: string;
    sessionId?: string;
    context?: string;
    parameters?: Record<string, string | number | boolean>;
  };
}

export interface AISystemOutput {
  responseId: string;
  content: string;
  confidence: number;
  reasoning?: string;
  metadata?: {
    modelUsed: string;
    tokensUsed?: number;
    latencyMs?: number;
    temperatureUsed?: number;
  };
}

export interface DecisionContext {
  requestId: string;
  timestamp: Date;
  input: AISystemInput;
  output: AISystemOutput;
  systemState?: {
    agentId: string;
    emotionalState?: Record<string, number>;
    memoryContext?: string[];
    cognitiveLoad?: number;
  };
}

export interface ValidationCondition {
  operator:
    | 'equals'
    | 'not_equals'
    | 'greater_than'
    | 'less_than'
    | 'contains'
    | 'regex'
    | 'range';
  expectedValue?: string | number | boolean;
  pattern?: string;
  min?: number;
  max?: number;
}

// Types for bias detection and data quality
export interface DataRecord {
  id: string;
  features: Record<string, string | number | boolean>;
  timestamp?: Date;
  metadata?: Record<string, string | number>;
}

export interface PredictionRecord {
  id: string;
  prediction: string | number | boolean;
  confidence: number;
  modelVersion: string;
  timestamp: Date;
  features?: Record<string, string | number | boolean>;
}

// AI System Risk Categories (as per EU AI Act)
export type AIRiskCategory =
  | 'minimal' // No obligations
  | 'limited' // Transparency obligations
  | 'high' // Strict requirements
  | 'unacceptable'; // Prohibited

export type AISystemPurpose =
  | 'biometric-identification'
  | 'critical-infrastructure'
  | 'education-vocational'
  | 'employment'
  | 'essential-services'
  | 'law-enforcement'
  | 'migration-asylum'
  | 'justice-democratic'
  | 'general-purpose'
  | 'conversational'
  | 'content-generation'
  | 'decision-support';

// AI Act Compliance Configuration
export interface AIActConfig {
  enabled: boolean;
  systemPurpose: AISystemPurpose;
  riskCategory: AIRiskCategory;
  deploymentRegion: string[];
  conformityAssessment: boolean;
  notifiedBody?: string;
}

// Mandatory Logging Requirements
export interface AISystemLog {
  id: string;
  timestamp: Date;
  eventType: AIEventType;
  systemId: string;
  userId?: string;
  input: AISystemInput;
  output: AISystemOutput;
  modelVersion: string;
  processingTime: number;
  confidence?: number;
  explanations?: Explanation[];
  humanReview?: HumanReview;
  anomalies?: Anomaly[];
}

export type AIEventType =
  | 'inference'
  | 'training'
  | 'fine-tuning'
  | 'decision'
  | 'content-generation'
  | 'user-interaction'
  | 'system-update'
  | 'security-event'
  | 'bias-detected'
  | 'error';

// Explainability Requirements
export interface ExplainabilityConfig {
  enabled: boolean;
  methods: ExplainabilityMethod[];
  detailLevel: 'basic' | 'intermediate' | 'detailed' | 'technical';
  languages: string[]; // Explanations must be in user's language
}

export type ExplainabilityMethod =
  | 'LIME' // Local Interpretable Model-agnostic Explanations
  | 'SHAP' // SHapley Additive exPlanations
  | 'attention-weights'
  | 'gradient-based'
  | 'counterfactual'
  | 'rule-based'
  | 'natural-language';

export interface Explanation {
  method: ExplainabilityMethod;
  confidence: number;
  factors: ExplanationFactor[];
  naturalLanguage?: string;
  visualizations?: Visualization[];
  counterfactuals?: Counterfactual[];
}

export interface ExplanationFactor {
  feature: string;
  importance: number;
  value: string | number | boolean | Record<string, unknown>;
  contribution: number; // How much this factor contributed to the decision
  direction: 'positive' | 'negative' | 'neutral';
}

export interface Visualization {
  type: 'chart' | 'heatmap' | 'graph' | 'table';
  data: Record<string, unknown>;
  description: string;
}

export interface Counterfactual {
  description: string;
  changes: CounterfactualChange[];
  outcome: AISystemOutput;
  feasibility: number; // 0-1, how realistic the counterfactual is
}

export interface CounterfactualChange {
  feature: string;
  from: string | number | boolean;
  to: string | number | boolean;
  effort: 'low' | 'medium' | 'high';
}

// Human Oversight Requirements
export interface HumanOversightConfig {
  enabled: boolean;
  mode: 'human-in-the-loop' | 'human-on-the-loop' | 'human-in-command';
  reviewThreshold?: number; // Confidence below which human review is required
  responseTimeout: number; // seconds
  fallbackBehavior: 'wait' | 'reject' | 'default-action';
}

export interface HumanReview {
  reviewerId: string;
  reviewedAt: Date;
  decision: 'approve' | 'reject' | 'modify';
  modifications?: {
    changedFields: string[];
    newValues: Record<string, string | number | boolean>;
    reason: string;
  };
  reasoning?: string;
  timeSpent: number; // seconds
}

export interface HumanOversightRequest {
  id: string;
  systemId: string;
  requestedAt: Date;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  context: DecisionContext;
  aiDecision: AISystemOutput;
  confidence: number;
  explanation: Explanation;
  deadline?: Date;
  status: 'pending' | 'reviewing' | 'completed' | 'expired';
}

// Bias Detection and Mitigation
export interface BiasDetectionConfig {
  enabled: boolean;
  checkFrequency: 'real-time' | 'batch' | 'periodic';
  sensitiveAttributes: string[]; // e.g., 'gender', 'race', 'age'
  fairnessMetrics: FairnessMetric[];
  mitigationStrategies: MitigationStrategy[];
}

export type FairnessMetric =
  | 'demographic-parity'
  | 'equal-opportunity'
  | 'equalized-odds'
  | 'calibration'
  | 'individual-fairness'
  | 'counterfactual-fairness';

export type MitigationStrategy =
  | 'pre-processing' // Data augmentation, re-sampling
  | 'in-processing' // Fair training algorithms
  | 'post-processing' // Output adjustment
  | 'adversarial'; // Adversarial debiasing;

export interface BiasReport {
  timestamp: Date;
  metrics: BiasMetric[];
  detectedBiases: DetectedBias[];
  mitigationActions: MitigationAction[];
  overallFairness: number; // 0-1 score
}

export interface BiasMetric {
  name: FairnessMetric;
  value: number;
  threshold: number;
  passed: boolean;
  affectedGroups?: string[];
}

export interface DetectedBias {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedAttribute: string;
  affectedGroups: string[];
  disparity: number;
  samples: number;
}

export interface MitigationAction {
  strategy: MitigationStrategy;
  applied: boolean;
  effectiveness: number; // 0-1
  sideEffects?: string[];
}

// Right to Explanation
export interface ExplanationRequest {
  id: string;
  userId: string;
  decisionId: string;
  requestedAt: Date;
  language: string;
  detailLevel: 'simple' | 'detailed' | 'technical';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  response?: ExplanationResponse;
}

export interface ExplanationResponse {
  requestId: string;
  providedAt: Date;
  decision: AISystemOutput;
  explanation: {
    summary: string;
    keyFactors: ExplanationFactor[];
    reasoning: string;
    alternatives?: Counterfactual[];
    confidence: number;
    limitations?: string[];
  };
  format: 'text' | 'structured' | 'interactive';
  language: string;
}

// Data Quality Requirements
export interface DataQualityConfig {
  enabled: boolean;
  validationRules: ValidationRule[];
  qualityThresholds: QualityThreshold[];
  dataLineage: boolean;
  updateFrequency?: number; // days
}

export interface ValidationRule {
  field: string;
  type: 'required' | 'format' | 'range' | 'consistency' | 'accuracy';
  condition: ValidationCondition;
  severity: 'warning' | 'error';
}

export interface QualityThreshold {
  metric:
    | 'completeness'
    | 'accuracy'
    | 'consistency'
    | 'timeliness'
    | 'validity';
  threshold: number;
  action: 'warn' | 'reject' | 'flag-review';
}

export interface DataQualityReport {
  timestamp: Date;
  dataset: string;
  records: number;
  metrics: DataQualityMetric[];
  issues: DataQualityIssue[];
  lineage?: DataLineage[];
}

export interface DataQualityMetric {
  name: string;
  value: number;
  threshold: number;
  status: 'pass' | 'warning' | 'fail';
}

export interface DataQualityIssue {
  field: string;
  issueType: string;
  count: number;
  examples: Array<{
    value: string | number | boolean;
    reason: string;
    suggested?: string | number | boolean;
  }>;
  impact: 'low' | 'medium' | 'high';
  recommendation: string;
}

export interface DataLineage {
  source: string;
  transformations: string[];
  timestamp: Date;
  version: string;
}

// Technical Documentation Requirements
export interface TechnicalDocumentation {
  systemDescription: SystemDescription;
  dataUsed: DataDocumentation;
  modelInformation: ModelDocumentation;
  performance: PerformanceDocumentation;
  limitations: LimitationDocumentation;
  humanOversight: OversightDocumentation;
  updates: UpdateLog[];
}

export interface SystemDescription {
  name: string;
  version: string;
  purpose: string;
  intendedUse: string[];
  prohibitedUse: string[];
  provider: OrganizationInfo;
  deployer?: OrganizationInfo;
}

export interface OrganizationInfo {
  name: string;
  registration: string;
  contact: string;
  representative?: string;
}

export interface DataDocumentation {
  trainingData: DatasetInfo;
  validationData?: DatasetInfo;
  dataCollection: string;
  dataProcessing: string[];
  dataBiases?: string[];
  dataQuality: DataQualityReport;
}

export interface DatasetInfo {
  name: string;
  source: string;
  size: number;
  features: string[];
  timeRange?: { start: Date; end: Date };
  geography?: string[];
  demographics?: {
    age?: { min: number; max: number };
    gender?: string[];
    ethnicity?: string[];
    socioeconomic?: string[];
    location?: string[];
  };
}

export interface ModelDocumentation {
  architecture: string;
  parameters: number;
  trainingProcess: string;
  optimizationTarget: string;
  validationMetrics: Record<string, number>;
  biasAssessment: BiasReport;
}

export interface PerformanceDocumentation {
  accuracy: Record<string, number>;
  robustness: RobustnessTest[];
  reliability: number;
  efficiency: EfficiencyMetrics;
  realWorldPerformance?: RealWorldMetrics;
}

export interface RobustnessTest {
  testType: string;
  conditions: string;
  performance: number;
  degradation: number;
}

export interface EfficiencyMetrics {
  latency: number;
  throughput: number;
  memoryUsage: number;
  energyConsumption?: number;
}

export interface RealWorldMetrics {
  deploymentDate: Date;
  usageStats: Record<string, number>;
  incidentRate: number;
  userSatisfaction?: number;
}

export interface LimitationDocumentation {
  knownLimitations: string[];
  outOfScopeUseCases: string[];
  assumptionsAndDependencies: string[];
  potentialFailureModes: FailureMode[];
}

export interface FailureMode {
  description: string;
  probability: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high' | 'critical';
  mitigation: string;
}

export interface OversightDocumentation {
  oversightMeasures: string[];
  humanInterventionProcess: string;
  stopMechanisms: string[];
  appealProcess?: string;
}

export interface UpdateLog {
  version: string;
  date: Date;
  changes: string[];
  performanceImpact?: Record<string, number>;
  safetyAssessment: string;
  approvedBy: string;
}

// Anomaly Detection
export interface Anomaly {
  id: string;
  detectedAt: Date;
  type: 'input' | 'output' | 'behavior' | 'performance';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context: {
    location?: string;
    userId?: string;
    sessionId?: string;
    request?: string;
    response?: string;
    metadata?: Record<string, string | number>;
  };
  action: 'logged' | 'flagged' | 'blocked' | 'human-review';
}

// Compliance Monitoring
export interface AIActComplianceStatus {
  compliant: boolean;
  lastAssessment: Date;
  riskCategory: AIRiskCategory;
  requirements: ComplianceRequirement[];
  violations: ComplianceViolation[];
  certifications: Certification[];
}

export interface ComplianceRequirement {
  id: string;
  name: string;
  description: string;
  category: string;
  mandatory: boolean;
  status: 'compliant' | 'non-compliant' | 'partial' | 'not-applicable';
  evidence?: string[];
}

export interface ComplianceViolation {
  requirement: string;
  detectedAt: Date;
  severity: 'minor' | 'major' | 'critical';
  description: string;
  remediation: string;
  deadline?: Date;
  status: 'open' | 'remediation' | 'resolved';
}

export interface Certification {
  id: string;
  type: 'CE-marking' | 'conformity-assessment' | 'audit-report';
  issuedBy: string;
  issuedAt: Date;
  validUntil: Date;
  scope: string[];
  documents: string[];
}

// AI Act Compliance Service Interface
export interface AIActComplianceService {
  // Configuration
  configure(config: AIActConfig): Promise<void>;
  assessRiskCategory(purpose: AISystemPurpose): AIRiskCategory;

  // Logging and Monitoring
  logAIEvent(event: Omit<AISystemLog, 'id' | 'timestamp'>): Promise<void>;
  getAILogs(filters: LogFilter): Promise<AISystemLog[]>;

  // Explainability
  generateExplanation(
    decision: AISystemOutput,
    config: ExplainabilityConfig
  ): Promise<Explanation>;
  handleExplanationRequest(
    request: ExplanationRequest
  ): Promise<ExplanationResponse>;

  // Human Oversight
  requestHumanReview(
    request: Omit<HumanOversightRequest, 'id' | 'requestedAt' | 'status'>
  ): Promise<HumanOversightRequest>;
  submitHumanReview(
    requestId: string,
    review: Omit<HumanReview, 'reviewedAt'>
  ): Promise<void>;

  // Bias Detection
  detectBias(
    data: DataRecord[],
    predictions: PredictionRecord[],
    config: BiasDetectionConfig
  ): Promise<BiasReport>;
  mitigateBias(
    biasReport: BiasReport,
    strategy: MitigationStrategy
  ): Promise<MitigationAction>;

  // Data Quality
  assessDataQuality(
    data: DataRecord[],
    config: DataQualityConfig
  ): Promise<DataQualityReport>;
  validateData(
    data: DataRecord[],
    rules: ValidationRule[]
  ): Promise<ValidationResult>;

  // Documentation
  generateDocumentation(): Promise<TechnicalDocumentation>;
  updateDocumentation(updates: Partial<TechnicalDocumentation>): Promise<void>;

  // Compliance Monitoring
  assessCompliance(): Promise<AIActComplianceStatus>;
  generateComplianceReport(): Promise<AIActComplianceReport>;
  handleAudit(auditor: string): Promise<AuditPackage>;
}

export interface LogFilter {
  startDate?: Date;
  endDate?: Date;
  eventType?: AIEventType;
  userId?: string;
  riskLevel?: string;
  hasAnomaly?: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  rule: string;
  message: string;
  value: string | number | boolean | null;
}

export interface ValidationWarning {
  field: string;
  rule: string;
  message: string;
  recommendation: string;
}

export interface AIActComplianceReport {
  generatedAt: Date;
  period: { start: Date; end: Date };
  systemInfo: SystemDescription;
  complianceStatus: AIActComplianceStatus;
  statistics: {
    totalDecisions: number;
    humanReviews: number;
    explanationsProvided: number;
    biasIncidents: number;
    anomaliesDetected: number;
  };
  recommendations: string[];
  executiveSummary: string;
}

export interface AuditPackage {
  timestamp: Date;
  documentation: TechnicalDocumentation;
  logs: AISystemLog[];
  complianceReports: AIActComplianceReport[];
  certificates: Certification[];
  testResults: {
    bias: BiasReport[];
    robustness: RobustnessTest[];
    dataQuality: DataQualityReport[];
  };
}

// Factory function type
export type AIActComplianceFactory = (
  config: AIActConfig
) => Promise<AIActComplianceService>;
