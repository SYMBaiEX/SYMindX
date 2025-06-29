/**
 * Agent Lifecycle Management Types
 * 
 * This module defines the core types and interfaces for the comprehensive
 * agent lifecycle management platform that supports enterprise-scale
 * agent development, deployment, and operations.
 */

import { AgentConfig, AgentEvent, Agent } from './agent.js'
import { BaseConfig, Metadata } from './common.js'

// =============================================================================
// LIFECYCLE ENUMS
// =============================================================================

export enum LifecycleStage {
  DEVELOPMENT = 'development',
  TESTING = 'testing',
  STAGING = 'staging',
  PRODUCTION = 'production',
  DEPRECATED = 'deprecated',
  ARCHIVED = 'archived'
}

export enum DeploymentStatus {
  PENDING = 'pending',
  DEPLOYING = 'deploying',
  DEPLOYED = 'deployed',
  FAILED = 'failed',
  ROLLING_BACK = 'rolling_back',
  ROLLED_BACK = 'rolled_back'
}

export enum TestStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  PASSED = 'passed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
  CANCELLED = 'cancelled'
}

export enum OptimizationStatus {
  IDLE = 'idle',
  ANALYZING = 'analyzing',
  OPTIMIZING = 'optimizing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export enum MonitoringAlertLevel {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

// =============================================================================
// DEVELOPMENT PLATFORM TYPES
// =============================================================================

export interface AgentTemplate {
  id: string
  name: string
  description: string
  category: string
  version: string
  author: string
  tags: string[]
  baseConfig: Partial<AgentConfig>
  requiredModules: string[]
  optionalModules: string[]
  previewImage?: string
  documentation?: string
  customFields?: Record<string, any>
}

export interface AgentBuilder {
  template?: AgentTemplate
  config: AgentConfig
  validationErrors: ValidationError[]
  warnings: ValidationWarning[]
  isValid: boolean
  lastValidated: Date
}

export interface ValidationError {
  id: string
  field: string
  message: string
  severity: 'error' | 'warning'
  code: string
  suggestion?: string
}

export interface ValidationWarning {
  id: string
  field: string
  message: string
  code: string
  suggestion?: string
}

export interface DevelopmentConfig {
  templates: {
    storePath: string
    autoSync: boolean
    registry: string[]
  }
  validation: {
    realTime: boolean
    strict: boolean
    customRules: string[]
  }
  preview: {
    enabled: boolean
    sandboxed: boolean
    resourceLimits: ResourceLimits
  }
}

export interface ResourceLimits {
  maxMemoryMB: number
  maxCpuPercent: number
  maxNetworkBandwidth: number
  maxDiskSpace: number
  maxExecutionTime: number
}

// =============================================================================
// TESTING FRAMEWORK TYPES
// =============================================================================

export interface TestSuite {
  id: string
  name: string
  description: string
  agentId: string
  tests: TestCase[]
  environment: TestEnvironment
  status: TestStatus
  results?: TestResults
  createdAt: Date
  updatedAt: Date
}

export interface TestCase {
  id: string
  name: string
  description: string
  type: TestType
  category: TestCategory
  priority: TestPriority
  setup: TestSetup
  steps: TestStep[]
  assertions: TestAssertion[]
  cleanup: TestCleanup
  timeout: number
  retries: number
  status: TestStatus
  result?: TestResult
}

export enum TestType {
  UNIT = 'unit',
  INTEGRATION = 'integration',
  BEHAVIOR = 'behavior',
  PERFORMANCE = 'performance',
  SECURITY = 'security',
  SMOKE = 'smoke',
  REGRESSION = 'regression'
}

export enum TestCategory {
  COGNITION = 'cognition',
  EMOTION = 'emotion',
  MEMORY = 'memory',
  EXTENSION = 'extension',
  PORTAL = 'portal',
  COORDINATION = 'coordination',
  SYSTEM = 'system'
}

export enum TestPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface TestEnvironment {
  id: string
  name: string
  type: 'isolated' | 'sandbox' | 'mock' | 'staging'
  resources: ResourceLimits
  mockServices: MockService[]
  dataFixtures: DataFixture[]
  config: BaseConfig
}

export interface MockService {
  name: string
  type: string
  endpoints: MockEndpoint[]
  responses: MockResponse[]
}

export interface MockEndpoint {
  path: string
  method: string
  responseId: string
}

export interface MockResponse {
  id: string
  status: number
  headers: Record<string, string>
  body: any
  delay?: number
}

export interface DataFixture {
  name: string
  type: string
  data: any
  description?: string
}

export interface TestSetup {
  agents: AgentConfig[]
  extensions: string[]
  portals: string[]
  environment: Record<string, any>
  mocks: string[]
  fixtures: string[]
}

export interface TestStep {
  id: string
  name: string
  action: string
  parameters: Record<string, any>
  expectedOutcome?: string
  timeout?: number
}

export interface TestAssertion {
  id: string
  type: AssertionType
  target: string
  condition: string
  expected: any
  actual?: any
  message?: string
}

export enum AssertionType {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  REGEX_MATCH = 'regex_match',
  TYPE_CHECK = 'type_check',
  CUSTOM = 'custom'
}

export interface TestCleanup {
  actions: string[]
  resetState: boolean
  clearMemory: boolean
  stopAgents: boolean
}

export interface TestResult {
  id: string
  testCaseId: string
  status: TestStatus
  startTime: Date
  endTime?: Date
  duration?: number
  steps: TestStepResult[]
  assertions: TestAssertionResult[]
  error?: TestError
  logs: TestLog[]
  metrics: TestMetrics
}

export interface TestStepResult {
  stepId: string
  status: TestStatus
  startTime: Date
  endTime?: Date
  duration?: number
  output?: any
  error?: string
}

export interface TestAssertionResult {
  assertionId: string
  status: TestStatus
  actual: any
  expected: any
  message?: string
}

export interface TestError {
  message: string
  stack?: string
  code?: string
  type: string
}

export interface TestLog {
  timestamp: Date
  level: string
  message: string
  source: string
  metadata?: Record<string, any>
}

export interface TestMetrics {
  memoryUsage: number
  cpuUsage: number
  responseTime: number
  throughput: number
  errorRate: number
  customMetrics: Record<string, number>
}

export interface TestResults {
  suiteId: string
  totalTests: number
  passed: number
  failed: number
  skipped: number
  cancelled: number
  duration: number
  startTime: Date
  endTime: Date
  coverage: TestCoverage
  performance: PerformanceMetrics
}

export interface TestCoverage {
  lines: number
  functions: number
  branches: number
  statements: number
  percentage: number
}

export interface PerformanceMetrics {
  avgResponseTime: number
  maxResponseTime: number
  minResponseTime: number
  throughput: number
  errorRate: number
  memoryPeak: number
  cpuPeak: number
}

export interface TestingConfig {
  environments: TestEnvironment[]
  parallelExecution: boolean
  maxConcurrentTests: number
  defaultTimeout: number
  retryPolicy: RetryPolicy
  reporting: TestReportingConfig
  coverage: CoverageConfig
}

export interface RetryPolicy {
  maxRetries: number
  backoffStrategy: 'linear' | 'exponential' | 'fixed'
  baseDelay: number
  maxDelay: number
}

export interface TestReportingConfig {
  formats: string[]
  outputPath: string
  includeStackTraces: boolean
  includeLogs: boolean
  includeMetrics: boolean
}

export interface CoverageConfig {
  enabled: boolean
  threshold: number
  includeFiles: string[]
  excludeFiles: string[]
}

// =============================================================================
// DEPLOYMENT & ORCHESTRATION TYPES
// =============================================================================

export interface DeploymentTarget {
  id: string
  name: string
  type: DeploymentType
  environment: LifecycleStage
  config: DeploymentConfig
  healthCheck: HealthCheck
  scalingPolicy: ScalingPolicy
  status: DeploymentStatus
}

export enum DeploymentType {
  DOCKER = 'docker',
  KUBERNETES = 'kubernetes',
  SERVERLESS = 'serverless',
  BARE_METAL = 'bare_metal',
  CLOUD_INSTANCE = 'cloud_instance'
}

export interface DeploymentConfig {
  strategy: DeploymentStrategy
  blueGreen: BlueGreenConfig
  canary: CanaryConfig
  rolling: RollingConfig
  resources: ResourceRequirements
  networking: NetworkingConfig
  security: SecurityConfig
  monitoring: MonitoringConfig
}

export interface MonitoringConfig {
  enabled: boolean
  metrics: MetricsConfig
  logging: LoggingConfig
  alerting: AlertingConfig
  health: HealthCheckConfig
  tracing: TracingConfig
}

export interface MetricsConfig {
  provider: 'prometheus' | 'datadog' | 'newrelic' | 'custom'
  endpoint?: string
  interval: number
  retention: string
  labels: Record<string, string>
}

export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error'
  format: 'json' | 'text'
  outputs: LogOutput[]
  structured: boolean
}

export interface LogOutput {
  type: 'console' | 'file' | 'syslog' | 'remote'
  config: Record<string, any>
}

export interface AlertingConfig {
  enabled: boolean
  channels: AlertChannel[]
  rules: AlertRule[]
  escalation: EscalationPolicy[]
}

export interface AlertChannel {
  type: 'email' | 'slack' | 'webhook' | 'pagerduty'
  config: Record<string, any>
  enabled: boolean
}

export interface AlertRule {
  name: string
  condition: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  duration: string
  channels: string[]
}

export interface EscalationPolicy {
  name: string
  steps: EscalationStep[]
  timeout: string
}

export interface EscalationStep {
  channels: string[]
  delay: string
  repeat: number
}

export interface HealthCheckConfig {
  enabled: boolean
  endpoint: string
  interval: number
  timeout: number
  retries: number
  successThreshold: number
  failureThreshold: number
}

export interface TracingConfig {
  enabled: boolean
  provider: 'jaeger' | 'zipkin' | 'datadog' | 'custom'
  samplingRate: number
  endpoint?: string
}

export enum DeploymentStrategy {
  BLUE_GREEN = 'blue_green',
  CANARY = 'canary',
  ROLLING = 'rolling',
  RECREATE = 'recreate',
  A_B_TEST = 'a_b_test'
}

export interface BlueGreenConfig {
  enabled: boolean
  switchoverTime: number
  rollbackTimeout: number
  healthCheckTimeout: number
}

export interface CanaryConfig {
  enabled: boolean
  trafficPercentage: number
  incrementStep: number
  evaluationInterval: number
  successThreshold: number
  failureThreshold: number
}

export interface RollingConfig {
  enabled: boolean
  maxUnavailable: number
  maxSurge: number
  batchSize: number
  pauseBetweenBatches: number
}

export interface ResourceRequirements {
  cpu: string
  memory: string
  storage: string
  gpu?: string
  network: string
}

export interface NetworkingConfig {
  ports: PortConfig[]
  loadBalancer: LoadBalancerConfig
  ingress: IngressConfig
}

export interface PortConfig {
  name: string
  port: number
  targetPort: number
  protocol: 'TCP' | 'UDP'
}

export interface LoadBalancerConfig {
  type: 'round_robin' | 'least_connections' | 'ip_hash'
  algorithm: string
  healthCheck: HealthCheck
}

export interface IngressConfig {
  enabled: boolean
  host: string
  path: string
  tls: boolean
  annotations: Record<string, string>
}

export interface SecurityConfig {
  authentication: AuthConfig
  authorization: AuthzConfig
  encryption: EncryptionConfig
  networkPolicies: NetworkPolicy[]
}

export interface AuthConfig {
  enabled: boolean
  type: 'jwt' | 'oauth2' | 'api_key' | 'mtls'
  config: Record<string, any>
}

export interface AuthzConfig {
  enabled: boolean
  rbac: RBACConfig
  policies: PolicyConfig[]
}

export interface RBACConfig {
  enabled: boolean
  roles: Role[]
  bindings: RoleBinding[]
}

export interface Role {
  name: string
  permissions: Permission[]
}

export interface Permission {
  resource: string
  actions: string[]
}

export interface RoleBinding {
  role: string
  subjects: Subject[]
}

export interface Subject {
  type: 'user' | 'group' | 'service_account'
  name: string
}

export interface PolicyConfig {
  name: string
  rules: PolicyRule[]
}

export interface PolicyRule {
  resource: string
  action: string
  condition: string
  effect: 'allow' | 'deny'
}

export interface EncryptionConfig {
  atRest: boolean
  inTransit: boolean
  keyManagement: KeyManagementConfig
}

export interface KeyManagementConfig {
  provider: string
  keyRotation: boolean
  rotationInterval: number
}

export interface NetworkPolicy {
  name: string
  ingress: NetworkRule[]
  egress: NetworkRule[]
}

export interface NetworkRule {
  from?: NetworkPeer[]
  to?: NetworkPeer[]
  ports: PortConfig[]
}

export interface NetworkPeer {
  type: 'pod' | 'namespace' | 'ip_block'
  selector: Record<string, string>
  ipBlock?: string
}

export interface HealthCheck {
  enabled: boolean
  type: 'http' | 'tcp' | 'exec' | 'grpc'
  endpoint?: string
  interval: number
  timeout: number
  retries: number
  initialDelay: number
}

export interface ScalingPolicy {
  enabled: boolean
  minReplicas: number
  maxReplicas: number
  targetCpuUtilization: number
  targetMemoryUtilization: number
  scaleUpCooldown: number
  scaleDownCooldown: number
  customMetrics: CustomMetric[]
}

export interface CustomMetric {
  name: string
  type: 'resource' | 'pods' | 'object' | 'external'
  target: MetricTarget
}

export interface MetricTarget {
  type: 'utilization' | 'average_value' | 'value'
  value: number
}

export interface DeploymentPipeline {
  id: string
  name: string
  stages: PipelineStage[]
  triggers: PipelineTrigger[]
  approvals: ApprovalConfig[]
  notifications: NotificationConfig[]
  rollback: RollbackConfig
  status: PipelineStatus
}

export enum PipelineStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  WAITING_APPROVAL = 'waiting_approval'
}

export interface PipelineStage {
  id: string
  name: string
  type: StageType
  config: StageConfig
  dependencies: string[]
  conditions: StageCondition[]
  status: PipelineStatus
}

export enum StageType {
  BUILD = 'build',
  TEST = 'test',
  DEPLOY = 'deploy',
  VALIDATE = 'validate',
  APPROVE = 'approve',
  NOTIFY = 'notify',
  ROLLBACK = 'rollback'
}

export interface StageConfig {
  parallel: boolean
  timeout: number
  retries: number
  onFailure: 'stop' | 'continue' | 'rollback'
  environment: Record<string, string>
  commands: string[]
  artifacts: ArtifactConfig[]
}

export interface ArtifactConfig {
  name: string
  path: string
  type: string
  retention: number
}

export interface StageCondition {
  type: 'branch' | 'tag' | 'schedule' | 'manual' | 'webhook'
  value: string
  operator: '==' | '!=' | 'contains' | 'regex'
}

export interface PipelineTrigger {
  type: 'git' | 'schedule' | 'webhook' | 'manual'
  config: TriggerConfig
}

export interface TriggerConfig {
  branch?: string
  tag?: string
  schedule?: string
  webhook?: WebhookConfig
}

export interface WebhookConfig {
  url: string
  secret: string
  events: string[]
}

export interface ApprovalConfig {
  stage: string
  approvers: string[]
  required: number
  timeout: number
  automatic: boolean
}

export interface NotificationConfig {
  channels: NotificationChannel[]
  events: NotificationEvent[]
  templates: NotificationTemplate[]
}

export interface NotificationChannel {
  type: 'email' | 'slack' | 'teams' | 'webhook'
  config: Record<string, any>
}

export interface NotificationEvent {
  stage: string
  status: PipelineStatus
  template: string
}

export interface NotificationTemplate {
  id: string
  name: string
  subject: string
  body: string
  format: 'text' | 'html' | 'markdown'
}

export interface RollbackConfig {
  enabled: boolean
  automatic: boolean
  conditions: RollbackCondition[]
  strategy: RollbackStrategy
}

export interface RollbackCondition {
  metric: string
  threshold: number
  operator: '>' | '<' | '>=' | '<=' | '==' | '!='
  duration: number
}

export interface RollbackStrategy {
  type: 'immediate' | 'gradual' | 'blue_green'
  timeout: number
  verification: boolean
}

// =============================================================================
// MONITORING & ANALYTICS TYPES
// =============================================================================

export interface MonitoringSystem {
  dashboards: Dashboard[]
  alerts: AlertRule[]
  metrics: MetricDefinition[]
  logs: LogConfig
  traces: TracingConfig
  anomalyDetection: AnomalyDetectionConfig
}

export interface Dashboard {
  id: string
  name: string
  description: string
  category: string
  panels: DashboardPanel[]
  filters: DashboardFilter[]
  timeRange: TimeRange
  refreshInterval: number
  sharing: SharingConfig
}

export interface DashboardPanel {
  id: string
  type: PanelType
  title: string
  position: PanelPosition
  queries: MetricQuery[]
  visualization: VisualizationConfig
  alerts: string[]
}

export enum PanelType {
  GRAPH = 'graph',
  GAUGE = 'gauge',
  STAT = 'stat',
  TABLE = 'table',
  HEATMAP = 'heatmap',
  LOGS = 'logs',
  TEXT = 'text'
}

export interface PanelPosition {
  x: number
  y: number
  width: number
  height: number
}

export interface MetricQuery {
  id: string
  metric: string
  filters: MetricFilter[]
  aggregation: AggregationConfig
  alias?: string
}

export interface MetricFilter {
  key: string
  operator: '=' | '!=' | '=~' | '!~'
  value: string
}

export interface AggregationConfig {
  type: 'sum' | 'avg' | 'min' | 'max' | 'count' | 'rate'
  interval: string
  groupBy: string[]
}

export interface VisualizationConfig {
  type: string
  options: Record<string, any>
  thresholds: Threshold[]
  colors: ColorConfig
}

export interface Threshold {
  value: number
  color: string
  condition: '>' | '<' | '>=' | '<='
}

export interface ColorConfig {
  scheme: string
  overrides: Record<string, string>
}

export interface DashboardFilter {
  key: string
  type: 'text' | 'select' | 'multi_select' | 'date_range'
  options: string[]
  default?: any
}

export interface TimeRange {
  from: string
  to: string
  timezone: string
}

export interface SharingConfig {
  public: boolean
  users: string[]
  teams: string[]
  readonly: boolean
}

export interface AlertRule {
  id: string
  name: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  query: MetricQuery
  condition: string
  evaluation: EvaluationConfig
  notifications: AlertNotification[]
  annotations: Record<string, string>
  labels: Record<string, string>
  status: AlertStatus
}

export interface AlertCondition {
  type: 'threshold' | 'anomaly' | 'change' | 'absence'
  threshold?: number
  operator?: '>' | '<' | '>=' | '<=' | '==' | '!='
  duration?: string
  changeType?: 'increase' | 'decrease' | 'change'
  changeThreshold?: number
}

export interface EvaluationConfig {
  interval: string
  timeout: string
  maxDataPoints: number
  noDataState: 'NoData' | 'Alerting' | 'OK'
  executionErrorState: 'Alerting' | 'OK'
}

export interface AlertNotification {
  channel: string
  template: string
  conditions: NotificationCondition[]
}

export interface NotificationCondition {
  state: AlertStatus
  frequency: string
  throttle: string
}

export enum AlertStatus {
  OK = 'ok',
  PENDING = 'pending',
  ALERTING = 'alerting',
  NO_DATA = 'no_data',
  EXECUTION_ERROR = 'execution_error'
}

export interface MetricDefinition {
  name: string
  type: MetricType
  description: string
  unit: string
  labels: string[]
  help: string
}

export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  SUMMARY = 'summary'
}

export interface LogConfig {
  enabled: boolean
  level: string
  format: 'json' | 'text' | 'structured'
  output: LogOutput[]
  retention: RetentionPolicy
  parsing: LogParsingConfig
}

export interface LogOutput {
  type: 'file' | 'console' | 'syslog' | 'remote'
  config: Record<string, any>
}

export interface RetentionPolicy {
  duration: string
  size: string
  count: number
}

export interface LogParsingConfig {
  enabled: boolean
  patterns: LogPattern[]
  extractors: LogExtractor[]
}

export interface LogPattern {
  name: string
  pattern: string
  fields: string[]
}

export interface LogExtractor {
  field: string
  type: 'regex' | 'json' | 'grok' | 'csv'
  config: Record<string, any>
}

export interface TracingConfig {
  enabled: boolean
  sampler: SamplerConfig
  exporter: ExporterConfig
  instrumentation: InstrumentationConfig
}

export interface SamplerConfig {
  type: 'always_on' | 'always_off' | 'ratio' | 'rate_limiting'
  ratio?: number
  rateLimit?: number
}

export interface ExporterConfig {
  type: 'jaeger' | 'zipkin' | 'otlp' | 'console'
  endpoint: string
  headers: Record<string, string>
  timeout: number
}

export interface InstrumentationConfig {
  http: boolean
  grpc: boolean
  database: boolean
  messaging: boolean
  custom: string[]
}

export interface AnomalyDetectionConfig {
  enabled: boolean
  algorithms: AnomalyAlgorithm[]
  sensitivity: number
  baseline: BaselineConfig
  notifications: AlertNotification[]
}

export interface AnomalyAlgorithm {
  name: string
  type: 'statistical' | 'ml' | 'rule_based'
  config: Record<string, any>
  metrics: string[]
}

export interface BaselineConfig {
  type: 'historical' | 'seasonal' | 'trend'
  period: string
  history: string
  update: string
}

// =============================================================================
// OPTIMIZATION TYPES
// =============================================================================

export interface OptimizationSuite {
  id: string
  name: string
  agentId: string
  experiments: Experiment[]
  hyperparameterTuning: HyperparameterTuning
  performanceProfiler: PerformanceProfiler
  learningAnalytics: LearningAnalytics
  recommendations: OptimizationRecommendation[]
  status: OptimizationStatus
}

export interface Experiment {
  id: string
  name: string
  type: ExperimentType
  hypothesis: string
  variants: ExperimentVariant[]
  trafficSplit: TrafficSplit
  metrics: ExperimentMetric[]
  duration: number
  status: ExperimentStatus
  results?: ExperimentResults
}

export enum ExperimentType {
  A_B_TEST = 'a_b_test',
  MULTIVARIATE = 'multivariate',
  BANDITS = 'bandits',
  FEATURE_FLAG = 'feature_flag'
}

export interface ExperimentVariant {
  id: string
  name: string
  description: string
  config: AgentConfig
  weight: number
  status: VariantStatus
}

export enum VariantStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  WINNER = 'winner',
  LOSER = 'loser'
}

export interface TrafficSplit {
  control: number
  variants: Record<string, number>
  allocation: AllocationStrategy
}

export interface AllocationStrategy {
  type: 'random' | 'hash' | 'sticky' | 'geolocation'
  config: Record<string, any>
}

export interface ExperimentMetric {
  name: string
  type: 'primary' | 'secondary' | 'guardrail'
  definition: MetricDefinition
  target: MetricTarget
  significance: StatisticalSignificance
}

export interface StatisticalSignificance {
  alpha: number
  beta: number
  minimumEffect: number
  minimumSampleSize: number
}

export enum ExperimentStatus {
  DRAFT = 'draft',
  RUNNING = 'running',
  COMPLETED = 'completed',
  STOPPED = 'stopped',
  CANCELLED = 'cancelled'
}

export interface ExperimentResults {
  duration: number
  participants: number
  conversions: Record<string, number>
  metrics: Record<string, MetricResult>
  significance: SignificanceResult
  recommendation: ExperimentRecommendation
}

export interface MetricResult {
  control: number
  variants: Record<string, number>
  improvement: Record<string, number>
  confidence: Record<string, number>
}

export interface SignificanceResult {
  significant: boolean
  pValue: number
  confidence: number
  effect: number
}

export interface ExperimentRecommendation {
  winner?: string
  action: 'deploy' | 'continue' | 'stop' | 'redesign'
  reasoning: string
  nextSteps: string[]
}

export interface HyperparameterTuning {
  id: string
  parameters: HyperparameterSpace
  objective: OptimizationObjective
  algorithm: TuningAlgorithm
  budget: TuningBudget
  results: TuningResults
  status: OptimizationStatus
}

export interface HyperparameterSpace {
  parameters: Parameter[]
  constraints: ParameterConstraint[]
}

export interface Parameter {
  name: string
  type: ParameterType
  range: ParameterRange
  default: any
  description: string
}

export enum ParameterType {
  INTEGER = 'integer',
  FLOAT = 'float',
  CATEGORICAL = 'categorical',
  BOOLEAN = 'boolean'
}

export interface ParameterRange {
  min?: number
  max?: number
  step?: number
  choices?: any[]
}

export interface ParameterConstraint {
  type: 'dependency' | 'exclusion' | 'range'
  parameters: string[]
  condition: string
}

export interface OptimizationObjective {
  metric: string
  direction: 'minimize' | 'maximize'
  constraints: ObjectiveConstraint[]
}

export interface ObjectiveConstraint {
  metric: string
  operator: '>' | '<' | '>=' | '<=' | '==' | '!='
  value: number
}

export interface TuningAlgorithm {
  name: string
  type: 'grid_search' | 'random_search' | 'bayesian' | 'evolutionary' | 'tree_parzen'
  config: Record<string, any>
}

export interface TuningBudget {
  maxEvaluations: number
  maxDuration: number
  maxCost: number
  earlyStop: EarlyStopConfig
}

export interface EarlyStopConfig {
  enabled: boolean
  patience: number
  minImprovement: number
  metric: string
}

export interface TuningResults {
  bestParams: Record<string, any>
  bestScore: number
  history: TuningIteration[]
  convergence: ConvergenceMetrics
}

export interface TuningIteration {
  iteration: number
  params: Record<string, any>
  score: number
  duration: number
  timestamp: Date
}

export interface ConvergenceMetrics {
  converged: boolean
  stagnation: number
  improvement: number
  stability: number
}

export interface PerformanceProfiler {
  id: string
  agentId: string
  profiles: PerformanceProfile[]
  bottlenecks: PerformanceBottleneck[]
  recommendations: PerformanceRecommendation[]
  status: OptimizationStatus
}

export interface PerformanceProfile {
  id: string
  timestamp: Date
  duration: number
  cpu: CpuProfile
  memory: MemoryProfile
  network: NetworkProfile
  disk: DiskProfile
  custom: Record<string, any>
}

export interface CpuProfile {
  usage: number
  idle: number
  system: number
  user: number
  iowait: number
}

export interface MemoryProfile {
  used: number
  free: number
  cached: number
  buffers: number
  swap: number
}

export interface NetworkProfile {
  bytesIn: number
  bytesOut: number
  packetsIn: number
  packetsOut: number
  errors: number
}

export interface DiskProfile {
  reads: number
  writes: number
  bytesRead: number
  bytesWritten: number
  utilization: number
}

export interface PerformanceBottleneck {
  id: string
  type: BottleneckType
  component: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  impact: number
  description: string
  recommendation: string
}

export enum BottleneckType {
  CPU = 'cpu',
  MEMORY = 'memory',
  NETWORK = 'network',
  DISK = 'disk',
  DATABASE = 'database',
  EXTERNAL_API = 'external_api',
  ALGORITHM = 'algorithm'
}

export interface PerformanceRecommendation {
  id: string
  type: 'configuration' | 'code' | 'infrastructure' | 'architecture'
  priority: 'low' | 'medium' | 'high' | 'critical'
  category: string
  title: string
  description: string
  implementation: string
  expectedImprovement: number
  effort: 'low' | 'medium' | 'high'
  risk: 'low' | 'medium' | 'high'
}

export interface LearningAnalytics {
  id: string
  agentId: string
  learningMetrics: LearningMetric[]
  knowledgeGraph: KnowledgeGraph
  adaptationHistory: AdaptationRecord[]
  insights: LearningInsight[]
}

export interface LearningMetric {
  name: string
  value: number
  trend: 'improving' | 'stable' | 'declining'
  benchmark: number
  timestamp: Date
}

export interface KnowledgeGraph {
  nodes: KnowledgeNode[]
  edges: KnowledgeEdge[]
  metrics: GraphMetrics
}

export interface KnowledgeNode {
  id: string
  type: string
  label: string
  properties: Record<string, any>
  connections: number
  importance: number
}

export interface KnowledgeEdge {
  source: string
  target: string
  type: string
  weight: number
  confidence: number
}

export interface GraphMetrics {
  nodes: number
  edges: number
  density: number
  clustering: number
  centrality: Record<string, number>
}

export interface AdaptationRecord {
  timestamp: Date
  trigger: string
  change: ConfigurationChange
  outcome: AdaptationOutcome
  metrics: Record<string, number>
}

export interface ConfigurationChange {
  module: string
  parameter: string
  oldValue: any
  newValue: any
  reason: string
}

export interface AdaptationOutcome {
  success: boolean
  improvement: number
  sideEffects: string[]
  rollback: boolean
}

export interface LearningInsight {
  id: string
  type: 'pattern' | 'anomaly' | 'opportunity' | 'risk'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  evidence: Evidence[]
  recommendations: string[]
}

export interface Evidence {
  type: 'metric' | 'event' | 'pattern' | 'correlation'
  description: string
  data: any
  confidence: number
}

export interface OptimizationRecommendation {
  id: string
  type: RecommendationType
  priority: 'low' | 'medium' | 'high' | 'critical'
  category: string
  title: string
  description: string
  rationale: string
  implementation: ImplementationGuide
  impact: ImpactAssessment
  status: RecommendationStatus
}

export enum RecommendationType {
  CONFIGURATION = 'configuration',
  ARCHITECTURE = 'architecture',
  ALGORITHM = 'algorithm',
  INFRASTRUCTURE = 'infrastructure',
  PROCESS = 'process'
}

export interface ImplementationGuide {
  steps: ImplementationStep[]
  prerequisites: string[]
  risks: Risk[]
  rollback: string[]
  testing: string[]
}

export interface ImplementationStep {
  order: number
  description: string
  command?: string
  validation: string
  rollback: string
}

export interface Risk {
  description: string
  probability: 'low' | 'medium' | 'high'
  impact: 'low' | 'medium' | 'high'
  mitigation: string
}

export interface ImpactAssessment {
  performance: number
  cost: number
  reliability: number
  maintainability: number
  security: number
  overall: number
}

export enum RecommendationStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  IMPLEMENTED = 'implemented',
  REJECTED = 'rejected',
  DEFERRED = 'deferred'
}

// =============================================================================
// FACTORY INTERFACES
// =============================================================================

export interface AgentDevelopmentPlatform {
  createBuilder(template?: AgentTemplate): AgentBuilder
  validateConfig(config: AgentConfig): ValidationResult
  previewAgent(config: AgentConfig): Promise<AgentPreview>
  saveTemplate(template: AgentTemplate): Promise<void>
  loadTemplate(id: string): Promise<AgentTemplate>
  listTemplates(category?: string): Promise<AgentTemplate[]>
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
  suggestions: ValidationSuggestion[]
}

export interface ValidationSuggestion {
  field: string
  message: string
  improvement: string
  impact: 'low' | 'medium' | 'high'
}

export interface AgentPreview {
  config: AgentConfig
  estimatedResources: ResourceEstimate
  compatibilityCheck: CompatibilityResult
  securityAnalysis: SecurityAnalysis
}

export interface ResourceEstimate {
  cpu: string
  memory: string
  storage: string
  network: string
  cost: number
}

export interface CompatibilityResult {
  compatible: boolean
  issues: CompatibilityIssue[]
  recommendations: string[]
}

export interface CompatibilityIssue {
  component: string
  issue: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  solution: string
}

export interface SecurityAnalysis {
  score: number
  vulnerabilities: SecurityVulnerability[]
  recommendations: SecurityRecommendation[]
}

export interface SecurityVulnerability {
  type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  cve?: string
  mitigation: string
}

export interface SecurityRecommendation {
  category: string
  title: string
  description: string
  implementation: string
  priority: 'low' | 'medium' | 'high' | 'critical'
}

export interface AgentTestingFramework {
  createTestSuite(agentId: string, config: TestSuiteConfig): TestSuite
  runTests(suiteId: string): Promise<TestResults>
  createTestEnvironment(config: TestEnvironmentConfig): Promise<TestEnvironment>
  generateTestCases(agentConfig: AgentConfig): TestCase[]
  validateTestSuite(suite: TestSuite): ValidationResult
}

export interface TestSuiteConfig {
  name: string
  description: string
  categories: TestCategory[]
  environment: string
  parallel: boolean
  timeout: number
}

export interface TestEnvironmentConfig {
  name: string
  type: 'isolated' | 'sandbox' | 'mock' | 'staging'
  resources: ResourceLimits
  services: string[]
  data: string[]
}

export interface DeploymentManager {
  createDeployment(config: DeploymentConfig): Promise<string>
  deployAgent(agentId: string, target: string): Promise<DeploymentResult>
  rollbackDeployment(deploymentId: string): Promise<RollbackResult>
  getDeploymentStatus(deploymentId: string): Promise<DeploymentStatus>
  listDeployments(filter?: DeploymentFilter): Promise<DeploymentSummary[]>
  createPipeline(config: PipelineConfig): Promise<string>
  runPipeline(pipelineId: string): Promise<PipelineExecution>
}

export interface DeploymentResult {
  id: string
  status: DeploymentStatus
  url?: string
  healthChecks: HealthCheckResult[]
  metrics: DeploymentMetrics
}

export interface HealthCheckResult {
  name: string
  status: 'healthy' | 'unhealthy' | 'unknown'
  message: string
  timestamp: Date
}

export interface DeploymentMetrics {
  startTime: Date
  endTime?: Date
  duration?: number
  resourceUsage: ResourceUsage
  performance: PerformanceSnapshot
}

export interface ResourceUsage {
  cpu: number
  memory: number
  storage: number
  network: number
}

export interface PerformanceSnapshot {
  responseTime: number
  throughput: number
  errorRate: number
  availability: number
}

export interface RollbackResult {
  success: boolean
  previousVersion: string
  newVersion: string
  duration: number
  issues: string[]
}

export interface DeploymentFilter {
  environment?: LifecycleStage
  status?: DeploymentStatus
  dateRange?: TimeRange
  agentId?: string
}

export interface DeploymentSummary {
  id: string
  agentId: string
  environment: LifecycleStage
  status: DeploymentStatus
  version: string
  deployTime: Date
  url?: string
}

export interface PipelineConfig {
  name: string
  stages: PipelineStageConfig[]
  triggers: PipelineTrigger[]
  notifications: NotificationConfig[]
}

export interface PipelineStageConfig {
  name: string
  type: StageType
  config: Record<string, any>
  dependencies: string[]
}

export interface PipelineExecution {
  id: string
  pipelineId: string
  status: PipelineStatus
  startTime: Date
  endTime?: Date
  stages: PipelineStageExecution[]
}

export interface PipelineStageExecution {
  name: string
  status: PipelineStatus
  startTime: Date
  endTime?: Date
  logs: string[]
  artifacts: string[]
}

export interface MonitoringSystem {
  createDashboard(config: DashboardConfig): Promise<Dashboard>
  createAlert(config: AlertConfig): Promise<AlertRule>
  queryMetrics(query: MetricQuery, timeRange: TimeRange): Promise<MetricData[]>
  getAlerts(filter?: AlertFilter): Promise<AlertRule[]>
  getMetrics(agentId: string, timeRange: TimeRange): Promise<AgentMetrics>
  detectAnomalies(agentId: string, timeRange: TimeRange): Promise<Anomaly[]>
}

export interface DashboardConfig {
  name: string
  description: string
  panels: DashboardPanelConfig[]
  filters: DashboardFilter[]
}

export interface DashboardPanelConfig {
  type: PanelType
  title: string
  queries: MetricQuery[]
  visualization: VisualizationConfig
}

export interface AlertConfig {
  name: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  query: MetricQuery
  condition: string
  notifications: string[]
}

export interface MetricData {
  timestamp: Date
  value: number
  labels: Record<string, string>
}

export interface AlertFilter {
  severity?: MonitoringAlertLevel
  status?: AlertStatus
  timeRange?: TimeRange
}

export interface AgentMetrics {
  performance: PerformanceMetrics
  resource: ResourceMetrics
  business: BusinessMetrics
  custom: Record<string, number>
}

export interface ResourceMetrics {
  cpu: number
  memory: number
  storage: number
  network: number
}

export interface BusinessMetrics {
  requests: number
  responses: number
  errors: number
  revenue: number
  users: number
}

export interface Anomaly {
  id: string
  type: AnomalyType
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  timestamp: Date
  metrics: string[]
  confidence: number
  recommendations: string[]
}

export enum AnomalyType {
  PERFORMANCE = 'performance',
  RESOURCE = 'resource',
  BEHAVIOR = 'behavior',
  SECURITY = 'security',
  BUSINESS = 'business'
}