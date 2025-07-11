/**
 * Common Types
 *
 * This file defines common interfaces and types used throughout the system
 * to replace generic Record<string, any> and any types for better type safety.
 */

// Configuration Types
export interface BaseConfig {
  [key: string]: ConfigValue;
}

export type ConfigValue =
  | string
  | number
  | boolean
  | ConfigValue[]
  | BaseConfig
  | null
  | undefined;

// Parameter Types
export interface ActionParameters {
  [key: string]: ParameterValue;
}

export type ParameterValue =
  | string
  | number
  | boolean
  | ParameterValue[]
  | ActionParameters
  | null
  | undefined;

// Metadata Types
export interface Metadata {
  [key: string]: MetadataValue;
}

export type MetadataValue =
  | string
  | number
  | boolean
  | Date
  | MetadataValue[]
  | Metadata
  | null
  | undefined;

// Context Types
export interface Context {
  [key: string]: ContextValue;
}

export type ContextValue =
  | string
  | number
  | boolean
  | Date
  | ContextValue[]
  | Context
  | null
  | undefined;

// Data Types
export interface GenericData {
  [key: string]: DataValue;
}

export type DataValue =
  | string
  | number
  | boolean
  | Date
  | DataValue[]
  | GenericData
  | null
  | undefined;

// Event Data Types
export interface EventData {
  type: string;
  timestamp: Date;
  source: string;
  payload: GenericData;
  metadata?: Metadata;
}

// Tool Input/Output Types
export interface ToolInput {
  [key: string]: ParameterValue;
}

export interface ToolOutput {
  success: boolean;
  data?: GenericData;
  error?: string;
  metadata?: Metadata;
}

// API Response Types
export interface ApiResponse<T = GenericData> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: Date;
  metadata?: Metadata;
}

// Action Result Types
export interface ActionResult<T = GenericData> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  metadata?: Metadata;
}

// Validation Types (re-exported from helpers for backward compatibility)
export type { ValidationResult, ValidationError, ValidationWarning } from './helpers';

// Legacy validation types for backward compatibility
export interface LegacyValidationResult {
  valid: boolean;
  errors: LegacyValidationError[];
  warnings?: LegacyValidationWarning[];
}

export interface LegacyValidationError {
  field: string;
  message: string;
  code: string;
  value?: any;
}

export interface LegacyValidationWarning {
  field: string;
  message: string;
  code: string;
  value?: any;
}

// Skill/Action Parameter Types
export interface SkillParameters {
  [key: string]: SkillParameterValue;
}

export type SkillParameterValue =
  | string
  | number
  | boolean
  | SkillParameterValue[]
  | SkillParameters
  | null
  | undefined;

// Extension Configuration Types
export interface ExtensionConfig {
  enabled: boolean;
  priority?: number;
  settings: BaseConfig;
  dependencies?: string[];
  capabilities?: string[];
}

export interface ExtensionMetadata {
  name: string;
  version: string;
  description?: string;
  author?: string;
  repository?: string;
  license?: string;
  tags?: string[];
  category?: string;
  compatibility?: string[];
  dependencies?: string[];
  capabilities?: string[];
}

// Portal Configuration Types
export interface PortalSettings {
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
  retryAttempts?: number;
  rateLimitBuffer?: number;
  customHeaders?: Record<string, string>;
  modelSettings?: ModelSettings;
}

export interface ModelSettings {
  defaultModel?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stopSequences?: string[];
}

// Memory Types
export interface MemoryMetadata {
  importance: number;
  tags: string[];
  source: string;
  timestamp: Date;
  expiresAt?: Date;
  accessCount?: number;
  lastAccessed?: Date;
  [key: string]: MetadataValue;
}

// Emotion Context Types
export interface EmotionContext {
  trigger: string;
  intensity: number;
  duration?: number;
  source: string;
  relatedEvents?: string[];
  socialContext?: SocialContext;
  environmentalContext?: EnvironmentalContext;
}

export interface SocialContext {
  participants: string[];
  relationships: Record<string, string>;
  groupDynamics?: string;
  communicationStyle?: string;
}

export interface EnvironmentalContext {
  location?: string;
  timeOfDay?: string;
  weather?: string;
  crowdLevel?: string;
  noiseLevel?: string;
  lighting?: string;
}

// Cognition Types
export interface CognitionContext {
  currentGoals: string[];
  activeMemories: string[];
  emotionalState: string;
  environmentalFactors: EnvironmentalContext;
  socialFactors?: SocialContext;
  timeConstraints?: TimeConstraints;
}

export interface TimeConstraints {
  deadline?: Date;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  estimatedDuration?: number;
}

// Game State Types (for RuneLite)
export interface GameState {
  playerPosition: Position;
  playerStats: PlayerStats;
  inventory: InventoryItem[];
  nearbyPlayers: Player[];
  nearbyObjects: GameObject[];
  currentActivity?: string;
  questStates?: QuestState[];
}

export interface Position {
  x: number;
  y: number;
  z?: number;
  region?: string;
}

export interface PlayerStats {
  hitpoints: number;
  attack: number;
  strength: number;
  defence: number;
  ranged: number;
  prayer: number;
  magic: number;
  cooking: number;
  woodcutting: number;
  fletching: number;
  fishing: number;
  firemaking: number;
  crafting: number;
  smithing: number;
  mining: number;
  herblore: number;
  agility: number;
  thieving: number;
  slayer: number;
  farming: number;
  runecraft: number;
  hunter: number;
  construction: number;
}

export interface InventoryItem {
  id: number;
  name: string;
  quantity: number;
  noted?: boolean;
  value?: number;
}

export interface Player {
  name: string;
  position: Position;
  combatLevel: number;
  isInCombat?: boolean;
  equipment?: Equipment;
}

export interface GameObject {
  id: number;
  name: string;
  position: Position;
  interactable: boolean;
  actions?: string[];
}

export interface Equipment {
  helmet?: InventoryItem;
  cape?: InventoryItem;
  amulet?: InventoryItem;
  weapon?: InventoryItem;
  body?: InventoryItem;
  shield?: InventoryItem;
  legs?: InventoryItem;
  gloves?: InventoryItem;
  boots?: InventoryItem;
  ring?: InventoryItem;
}

export interface QuestState {
  id: number;
  name: string;
  status: 'not_started' | 'in_progress' | 'completed';
  progress?: number;
  requirements?: string[];
}

// Slack Types
export interface SlackMessage {
  channel: string;
  user: string;
  text: string;
  timestamp: string;
  threadTs?: string;
  blocks?: SlackBlock[];
  attachments?: SlackAttachment[];
}

export interface SlackBlock {
  type: string;
  text?: SlackText;
  elements?: SlackElement[];
  accessory?: SlackElement;
  fields?: SlackText[];
}

export interface SlackText {
  type: 'plain_text' | 'mrkdwn';
  text: string;
  emoji?: boolean;
}

export interface SlackElement {
  type: string;
  text?: SlackText;
  value?: string;
  url?: string;
  action_id?: string;
}

export interface SlackAttachment {
  color?: string;
  title?: string;
  text?: string;
  fields?: SlackField[];
  actions?: SlackAction[];
}

export interface SlackField {
  title: string;
  value: string;
  short?: boolean;
}

export interface SlackAction {
  type: string;
  text: string;
  value?: string;
  url?: string;
}

// Twitter Types
export interface TwitterUser {
  id: string;
  username: string;
  name: string;
  verified: boolean;
  followersCount: number;
  followingCount: number;
  profileImageUrl?: string;
  description?: string;
}

export interface TwitterTweet {
  id: string;
  text: string;
  authorId: string;
  createdAt: Date;
  publicMetrics: TwitterMetrics;
  referencedTweets?: TwitterReference[];
  attachments?: TwitterAttachment[];
}

export interface TwitterMetrics {
  retweetCount: number;
  likeCount: number;
  replyCount: number;
  quoteCount: number;
}

export interface TwitterReference {
  type: 'retweeted' | 'quoted' | 'replied_to';
  id: string;
}

export interface TwitterAttachment {
  type: 'media' | 'poll';
  mediaKeys?: string[];
  pollIds?: string[];
}

// MCP Types
export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: JsonSchema;
}

export interface JsonSchema {
  type: string;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface JsonSchemaProperty {
  type: string;
  description?: string;
  enum?: string[];
  default?: any;
  minimum?: number;
  maximum?: number;
  pattern?: string;
}

export interface McpResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface McpPrompt {
  name: string;
  description?: string;
  arguments?: McpPromptArgument[];
}

export interface McpPromptArgument {
  name: string;
  description?: string;
  required?: boolean;
}

// Enhanced Result Types for better API consistency
export interface ServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: Date;
  metadata?: {
    serviceId: string;
    operation: string;
    duration?: number;
    version?: string;
    [key: string]: any;
  };
}

// Enhanced Error Types
export interface ServiceError {
  code: string;
  message: string;
  details?: string;
  timestamp: Date;
  correlationId?: string;
  metadata?: {
    serviceId: string;
    operation: string;
    context?: Record<string, any>;
    [key: string]: any;
  };
}

// Configuration Management Types
export interface ConfigurationSchema {
  version: string;
  schema: {
    [key: string]: {
      type: 'string' | 'number' | 'boolean' | 'object' | 'array';
      required?: boolean;
      default?: any;
      validation?: {
        min?: number;
        max?: number;
        pattern?: string;
        enum?: any[];
      };
      description?: string;
    };
  };
}

// Enhanced Module Types
export interface ModuleManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  license: string;
  dependencies?: {
    [key: string]: string;
  };
  peerDependencies?: {
    [key: string]: string;
  };
  capabilities?: string[];
  configuration?: ConfigurationSchema;
  metadata?: {
    category: string;
    tags?: string[];
    homepage?: string;
    repository?: string;
    [key: string]: any;
  };
}

// Enhanced Context Types
export interface RuntimeContext {
  agentId: string;
  sessionId: string;
  timestamp: Date;
  environment: {
    node: string;
    platform: string;
    arch: string;
    version: string;
  };
  runtime: {
    uptime: number;
    memory: {
      used: number;
      total: number;
      heap: number;
    };
    cpu: {
      usage: number;
      loadAverage: number[];
    };
  };
  metadata?: Record<string, any>;
}

// Enhanced Event Types
export interface SystemEvent {
  id: string;
  type: string;
  category: 'system' | 'agent' | 'user' | 'external';
  source: string;
  timestamp: Date;
  data: Record<string, any>;
  metadata?: {
    priority: 'low' | 'medium' | 'high' | 'critical';
    tags?: string[];
    correlationId?: string;
    [key: string]: any;
  };
}

// Enhanced Service Types
export interface ServiceConfiguration {
  id: string;
  name: string;
  enabled: boolean;
  config: Record<string, any>;
  dependencies?: string[];
  healthCheck?: {
    enabled: boolean;
    interval: number;
    timeout: number;
    retries: number;
  };
  metadata?: {
    version: string;
    description?: string;
    tags?: string[];
    [key: string]: any;
  };
}

// Enhanced Communication Types
export interface Message {
  id: string;
  type: string;
  source: string;
  target: string;
  content: string | Record<string, any>;
  timestamp: Date;
  metadata?: {
    priority: 'low' | 'medium' | 'high' | 'urgent';
    encryption?: boolean;
    compression?: boolean;
    ttl?: number;
    correlationId?: string;
    [key: string]: any;
  };
}

// Enhanced Task Types
export interface Task {
  id: string;
  name: string;
  type: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  priority: number;
  parameters: Record<string, any>;
  result?: any;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  metadata?: {
    agentId?: string;
    retryCount?: number;
    timeout?: number;
    tags?: string[];
    [key: string]: any;
  };
}

// Enhanced Workflow Types
export interface WorkflowStep {
  id: string;
  name: string;
  type: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  dependencies?: string[];
  parameters: Record<string, any>;
  result?: any;
  error?: string;
  metadata?: {
    retryCount?: number;
    timeout?: number;
    [key: string]: any;
  };
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  steps: WorkflowStep[];
  context: Record<string, any>;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  metadata?: {
    agentId?: string;
    version?: string;
    tags?: string[];
    [key: string]: any;
  };
}

// Utility Types (re-exported from helpers for better organization)
export type {
  DeepPartial,
  RequiredFields,
  OptionalFields,
  Nullable,
  Optional,
  StringKeys,
  NonEmptyArray,
  DeepReadonly,
  NumberKeys,
  SymbolKeys
} from './helpers';

// Operation Result Types
export type {
  OperationResult,
  VoidResult,
  VoidError,
  InitializationResult,
  CleanupResult,
  EventProcessingResult,
  StateUpdateResult,
  ExecutionResult,
  AsyncOperationResult
} from './helpers';
