/**
 * Strict Type Definitions for SYMindX
 *
 * This file provides proper TypeScript types to replace all `any` usage
 * throughout the codebase with type-safe alternatives.
 */

// ============================================================================
// LOGGER TYPES
// ============================================================================

export interface LoggerMetadata {
  [key: string]:
    | string
    | number
    | boolean
    | Date
    | null
    | undefined
    | LoggerMetadata
    | LoggerMetadata[];
}

export interface LoggerArgs
  extends Array<string | number | boolean | Date | Error | LoggerMetadata> {}

// ============================================================================
// AGENT TYPES
// ============================================================================

export interface AgentData {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'error' | 'starting' | 'stopping';
  type: string;
  characterId?: string;
  platform?: string;
  lastActivity?: Date;
  metadata?: AgentMetadata;
  config?: AgentConfiguration;
  performance?: AgentPerformanceMetrics;
}

export interface AgentMetadata {
  version: string;
  capabilities: string[];
  description?: string;
  tags?: string[];
  [key: string]: string | number | boolean | string[] | undefined;
}

export interface AgentConfiguration {
  memory?: MemoryConfiguration;
  emotion?: EmotionConfiguration;
  cognition?: CognitionConfiguration;
  portals?: PortalConfiguration[];
  extensions?: ExtensionConfiguration[];
}

export type ConfigurationValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | ConfigurationValue[]
  | { [key: string]: ConfigurationValue };

export interface AgentPerformanceMetrics {
  responseTime: number;
  memoryUsage: number;
  cpuUsage: number;
  requestCount: number;
  errorCount: number;
  uptime: number;
  lastUpdated: Date;
}

// ============================================================================
// MEMORY TYPES
// ============================================================================

export interface MemoryConfiguration {
  provider: string;
  database?: DatabaseConfiguration;
  vectorSearch?: VectorSearchConfiguration;
  retention?: RetentionConfiguration;
}

export interface DatabaseConfiguration {
  url?: string;
  maxConnections?: number;
  timeout?: number;
  ssl?: boolean;
}

export interface VectorSearchConfiguration {
  dimensions: number;
  indexType: 'hnsw' | 'ivf' | 'flat';
  distanceMetric: 'cosine' | 'euclidean' | 'dot_product';
}

export interface RetentionConfiguration {
  maxAge: number;
  maxCount: number;
  compressionEnabled: boolean;
}

// ============================================================================
// EMOTION TYPES
// ============================================================================

export interface EmotionConfiguration {
  type: 'composite' | 'simple' | 'neural';
  emotions: EmotionType[];
  intensity: number;
  decay: number;
}

export type EmotionType =
  | 'happy'
  | 'sad'
  | 'angry'
  | 'curious'
  | 'confident'
  | 'anxious'
  | 'empathetic'
  | 'nostalgic'
  | 'proud'
  | 'confused'
  | 'neutral';

export type EmotionState = {
  [emotion in EmotionType]?: number;
};

export interface EmotionContext {
  trigger: string;
  intensity: number;
  duration?: number;
  source: string;
  metadata?: EmotionMetadata;
}

export interface EmotionMetadata {
  relatedEvents?: string[];
  socialContext?: SocialContextData;
  environmentalContext?: EnvironmentalContextData;
}

export interface SocialContextData {
  participants: string[];
  relationships: Record<string, string>;
  groupDynamics?: string;
  communicationStyle?: string;
}

export interface EnvironmentalContextData {
  location?: string;
  timeOfDay?: string;
  weather?: string;
  crowdLevel?: string;
  noiseLevel?: string;
  lighting?: string;
}

// ============================================================================
// COGNITION TYPES
// ============================================================================

export interface CognitionConfiguration {
  type: 'htn_planner' | 'reactive' | 'hybrid';
  planningHorizon?: number;
  reactivityThreshold?: number;
  learningRate?: number;
}

export interface CognitionContext {
  currentGoals: string[];
  activeMemories: string[];
  emotionalState: EmotionState;
  environmentalFactors: EnvironmentalContextData;
  socialFactors?: SocialContextData;
  timeConstraints?: TimeConstraints;
}

export interface TimeConstraints {
  deadline?: Date;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  estimatedDuration?: number;
}

// ============================================================================
// PORTAL TYPES
// ============================================================================

export interface PortalConfiguration {
  provider: string;
  model?: string;
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
  retryAttempts?: number;
  rateLimitBuffer?: number;
  customHeaders?: Record<string, string>;
  modelSettings?: ModelSettings;
}

export interface ModelSettings {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stopSequences?: string[];
}

export interface PortalResponse {
  success: boolean;
  data?: PortalResponseData;
  error?: string;
  metadata?: PortalMetadata;
}

export interface PortalResponseData {
  content: string;
  model: string;
  usage?: TokenUsage;
  finishReason?: string;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface PortalMetadata {
  requestId: string;
  provider: string;
  model: string;
  timestamp: Date;
  responseTime: number;
}

// ============================================================================
// EXTENSION TYPES
// ============================================================================

export interface ExtensionConfiguration {
  name: string;
  enabled: boolean;
  platform: string;
  settings: ExtensionSettings;
  capabilities?: string[];
}

export interface ExtensionSettings {
  [key: string]: ConfigurationValue;
}

export interface ExtensionData {
  id: string;
  name: string;
  platform: string;
  status: 'active' | 'inactive' | 'error';
  agents: string[];
  capabilities: string[];
  metadata?: ExtensionMetadata;
}

export interface ExtensionMetadata {
  version: string;
  description?: string;
  author?: string;
}

// ============================================================================
// CLI TYPES
// ============================================================================

export interface CLIOptions {
  [key: string]: string | number | boolean | string[] | undefined;
}

export interface CLIMetrics {
  agents: AgentMetrics[];
  system: SystemMetrics;
  performance: PerformanceMetrics;
}

export interface AgentMetrics {
  id: string;
  name: string;
  status: string;
  responseTime: number;
  memoryUsage: number;
  requestCount: number;
  errorCount: number;
}

export interface SystemMetrics {
  uptime: number;
  totalMemory: number;
  usedMemory: number;
  cpuUsage: number;
  activeConnections: number;
}

export interface PerformanceMetrics {
  responseTime: number;
  throughput: number;
  errorRate: number;
  memoryUsage: number;
  cpuUsage: number;
  activeConnections: number;
}

// ============================================================================
// COMMAND TYPES
// ============================================================================

export interface CommandOptions {
  [key: string]: string | number | boolean | string[] | undefined;
}

export interface CommandContext {
  agentId?: string;
  platform?: string;
  userId?: string;
  sessionId?: string;
}

export interface CommandResult {
  success: boolean;
  data?: CommandResultData;
  error?: string;
  message?: string;
  metadata?: CommandMetadata;
}

export interface CommandResultData {
  [key: string]: ConfigurationValue;
}

export interface CommandMetadata {
  commandId: string;
  timestamp: Date;
  duration: number;
}

// ============================================================================
// CHAT TYPES
// ============================================================================

export interface ChatPriority {
  level: 'low' | 'medium' | 'high' | 'urgent';
  weight: number;
}

export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: Date;
  metadata?: ChatMessageMetadata;
}

export interface ChatMessageMetadata {
  agentId?: string;
  platform?: string;
  userId?: string;
  conversationId?: string;
}

// ============================================================================
// MONITORING TYPES
// ============================================================================

export interface MonitoringOptions {
  interval?: number;
  timeout?: number;
  retries?: number;
}

export interface MonitoringCommand {
  id: string;
  type: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  timestamp: Date;
  duration?: number;
  result?: MonitoringResult;
  error?: string;
}

export interface MonitoringResult {
  success: boolean;
  data?: MonitoringResultData;
  metrics?: MonitoringMetrics;
}

export interface MonitoringResultData {
  [key: string]: ConfigurationValue;
}

export interface MonitoringMetrics {
  responseTime: number;
  memoryUsage: number;
  cpuUsage: number;
}

// ============================================================================
// HOOK TYPES
// ============================================================================

export interface HookDependencies extends Array<ConfigurationValue> {}

export interface NavigationData {
  route: string;
  params?: NavigationParams;
  metadata?: NavigationMetadata;
}

export interface NavigationParams {
  [key: string]: string | number | boolean | undefined;
}

export interface NavigationMetadata {
  timestamp: Date;
  source?: string;
}

export interface ConnectionDetails {
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  url?: string;
  lastConnected?: Date;
  error?: string;
}

// ============================================================================
// TERMINAL TYPES
// ============================================================================

export interface TerminalFunction<T extends unknown[], R> {
  (...args: T): R;
}

export interface TerminalDimensions {
  width: number;
  height: number;
}

// ============================================================================
// GRID TYPES
// ============================================================================

export interface GridContent {
  type: 'text' | 'number' | 'boolean' | 'date' | 'object';
  value: ConfigurationValue;
  formatted?: string;
}

// ============================================================================
// RUNTIME CLIENT TYPES
// ============================================================================

export interface RuntimeClientResponse {
  success: boolean;
  data?: RuntimeClientData;
  error?: string;
  metadata?: RuntimeClientMetadata;
}

export interface RuntimeClientData {
  [key: string]: ConfigurationValue;
}

export interface RuntimeClientMetadata {
  requestId: string;
  timestamp: Date;
  responseTime: number;
}

export interface RuntimeClientRequestBody {
  [key: string]: ConfigurationValue;
}

// ============================================================================
// PORTAL SPECIFIC TYPES
// ============================================================================

export interface AISDKParameters {
  model?: string;
  messages?: AIMessage[];
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stopSequences?: string[];
  tools?: AITool[];
}

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: AIMessageMetadata;
}

export interface AIMessageMetadata {
  timestamp?: Date;
  source?: string;
}

export interface AITool {
  name: string;
  description: string;
  parameters: AIToolParameters;
}

export interface AIToolParameters {
  type: 'object';
  properties: Record<string, AIToolProperty>;
  required?: string[];
}

export interface AIToolProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  enum?: ConfigurationValue[];
  default?: ConfigurationValue;
}

export interface GenerationOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  tools?: AITool[];
}

export interface StreamingOptions {
  onChunk?: (chunk: string) => void;
  onComplete?: (result: string) => void;
  onError?: (error: Error) => void;
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

export interface ValidationOptions {
  strict?: boolean;
  allowUnknown?: boolean;
  stripUnknown?: boolean;
}

export interface ValidationSchema {
  [key: string]: ValidationRule;
}

export interface ValidationRule {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required?: boolean;
  default?: ConfigurationValue;
  enum?: ConfigurationValue[];
  min?: number;
  max?: number;
  pattern?: string;
  properties?: ValidationSchema;
  items?: ValidationRule;
}

// ============================================================================
// CONTEXT TYPES
// ============================================================================

export interface ExecutionContext {
  agentId: string;
  sessionId: string;
  timestamp: Date;
  environment: EnvironmentContext;
  runtime: RuntimeContext;
  metadata?: ExecutionMetadata;
}

export interface EnvironmentContext {
  node: string;
  platform: string;
  arch: string;
  version: string;
}

export interface RuntimeContext {
  uptime: number;
  memory: MemoryContext;
  cpu: CPUContext;
}

export interface MemoryContext {
  used: number;
  total: number;
  heap: number;
}

export interface CPUContext {
  usage: number;
  loadAverage: number[];
}

export interface ExecutionMetadata {
  correlationId?: string;
  traceId?: string;
  parentId?: string;
}

// ============================================================================
// SEARCH TYPES
// ============================================================================

export interface SearchCriteria {
  query?: string;
  filters?: SearchFilters;
  sort?: SearchSort;
  pagination?: SearchPagination;
}

export interface SearchFilters {
  [key: string]: ConfigurationValue;
}

export interface SearchSort {
  field: string;
  direction: 'asc' | 'desc';
}

export interface SearchPagination {
  page: number;
  limit: number;
  offset?: number;
}

export interface SearchResults<T = ConfigurationValue> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  metadata?: SearchMetadata;
}

export interface SearchMetadata {
  query: string;
  executionTime: number;
}

// ============================================================================
// DECISION TYPES
// ============================================================================

export interface DecisionCriteria {
  name: string;
  weight: number;
  type: 'boolean' | 'numeric' | 'categorical';
  threshold?: number;
  options?: ConfigurationValue[];
}

export interface DecisionOption {
  id: string;
  label: string;
  value: ConfigurationValue;
  score?: number;
  metadata?: DecisionMetadata;
}

export interface DecisionMetadata {
  confidence: number;
  reasoning?: string;
}

export interface DecisionResult {
  selectedOption: DecisionOption;
  alternativeOptions: DecisionOption[];
  confidence: number;
  reasoning: string;
  metadata?: DecisionMetadata;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export interface KeyValuePair {
  key: string;
  value: ConfigurationValue;
}

export interface StatusCounts {
  [status: string]: number;
}

export interface GradientFunction {
  (text: string): string;
}

export interface UpdateData {
  agents: AgentData[];
  system: SystemMetrics;
  timestamp: Date;
}

// ============================================================================
// CONFIGURATION RESOLVER TYPES
// ============================================================================

export interface CharacterConfiguration {
  id: string;
  name: string;
  personality: PersonalityConfiguration;
  modules: ModuleConfiguration;
}

export interface PersonalityConfiguration {
  traits: string[];
  tone: string;
  style: string;
}

export interface ModuleConfiguration {
  memory: MemoryConfiguration;
  emotion: EmotionConfiguration;
  cognition: CognitionConfiguration;
}

export interface AutonomousConfiguration {
  enabled: boolean;
  level: 'basic' | 'intermediate' | 'advanced';
  constraints: AutonomousConstraints;
}

export interface AutonomousConstraints {
  maxActions: number;
  timeLimit: number;
  resourceLimit: number;
}

// ============================================================================
// EXPORT ALL TYPES
// ============================================================================

export type StrictConfigurationValue = ConfigurationValue;
export type StrictLoggerArgs = LoggerArgs;
export type StrictLoggerMetadata = LoggerMetadata;
export type StrictAgentData = AgentData;
export type StrictCLIOptions = CLIOptions;
export type StrictCommandOptions = CommandOptions;
export type StrictMonitoringOptions = MonitoringOptions;
export type StrictHookDependencies = HookDependencies;
export type StrictNavigationData = NavigationData;
export type StrictConnectionDetails = ConnectionDetails;
export type StrictGridContent = GridContent;
export type StrictRuntimeClientResponse = RuntimeClientResponse;
export type StrictRuntimeClientRequestBody = RuntimeClientRequestBody;
export type StrictAISDKParameters = AISDKParameters;
export type StrictGenerationOptions = GenerationOptions;
export type StrictValidationOptions = ValidationOptions;
export type StrictExecutionContext = ExecutionContext;
export type StrictSearchCriteria = SearchCriteria;
export type StrictDecisionCriteria = DecisionCriteria;
export type StrictKeyValuePair = KeyValuePair;
export type StrictStatusCounts = StatusCounts;
export type StrictUpdateData = UpdateData;
