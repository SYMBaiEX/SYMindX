/**
 * @module agent
 * @description Agent types for SYMindX - Core agent interfaces and types
 *
 * This module defines the fundamental types for agents including:
 * - Agent configuration and state management
 * - Agent lifecycle interfaces
 * - Extension and module interfaces
 * - Action and event handling types
 * - Multi-agent coordination types
 */

import {
  BaseConfig,
  ActionParameters,
  Metadata,
  Context,
  GenericData,
  SkillParameters,
  ExtensionConfig,
} from './common.js';
import { EmotionModule } from './emotion.js';
import {
  OperationResult,
  ExecutionResult,
  AgentId,
  Timestamp,
} from './helpers.js';
import { Portal, PortalConfig } from './portal.js';
import {
  AgentStateTransitionResult,
  // ModuleManifest - type definition available but not used at runtime
} from './results.js';
import { LogLevel } from './utils/logger.js';

// Additional result types for agent lifecycle methods
export interface InitializationResult {
  success: boolean;
  message?: string;
  timestamp: Timestamp;
  resourcesInitialized: string[];
}

export interface CleanupResult {
  success: boolean;
  message?: string;
  timestamp: Timestamp;
  resourcesReleased: string[];
}

export interface EventProcessingResult {
  success: boolean;
  message?: string;
  timestamp: Timestamp;
  eventProcessed: boolean;
}

export enum AgentStatus {
  ACTIVE = 'active',
  IDLE = 'idle',
  THINKING = 'thinking',
  PAUSED = 'paused',
  ERROR = 'error',
  INITIALIZING = 'initializing',
  STOPPING = 'stopping',
  DISABLED = 'disabled',
}

export interface Agent {
  id: AgentId;
  name: string;
  status: AgentStatus;
  emotion: EmotionModule;
  memory: MemoryProvider;
  cognition: CognitionModule;
  extensions: Extension[];
  portal?: Portal;
  portals?: Portal[]; // Multiple portals support
  toolSystem?: unknown; // Dynamic tools system for Agent Zero-style capabilities
  config: AgentConfig;
  lastUpdate: Timestamp;
  eventBus?: EventBus; // Added eventBus property as optional
  character_id?: string; // Character ID for agent configuration
  characterConfig?: Record<string, unknown>; // Character configuration object
  autonomyLevel?: number; // Autonomy level (0-100)
  learning?: unknown; // Learning system reference
  decision?: unknown; // Decision system reference
  personality?: string[]; // Personality traits

  // Enhanced lifecycle methods with proper result types
  initialize(config: AgentConfig): Promise<InitializationResult>;
  cleanup(): Promise<CleanupResult>;
  tick(): Promise<OperationResult>;
  updateState(
    newState: Partial<AgentState>
  ): Promise<AgentStateTransitionResult>;
  processEvent(event: AgentEvent): Promise<EventProcessingResult>;
  executeAction(action: AgentAction): Promise<ExecutionResult>;
}

export interface AgentConfig {
  core: {
    name: string;
    tone: string;
    personality: string[];
  };
  lore: {
    origin: string;
    motive: string;
    background?: string;
  };
  psyche: {
    traits: string[];
    defaults: {
      memory: string;
      emotion: string;
      cognition: string;
      portal?: string;
    };
  };
  personality?: string[]; // Top-level personality access for backward compatibility
  goals?: string[]; // Goals list for agent objectives
  modules: {
    extensions: string[];
    memory?: MemoryConfig;
    emotion?: EmotionConfig;
    cognition?: CognitionConfig;
    portal?: PortalConfig;
    tools?: ToolsConfig;
  };
  autonomous?: {
    enabled: boolean;
    decisionMaking?: boolean;
    decision_making?: {
      autonomy_threshold?: number;
      ethical_constraints?: boolean;
    };
    learning?: boolean;
    ethics?: {
      enabled: boolean;
    };
    independence_level?: number;
    life_simulation?: {
      goal_pursuit?: boolean;
    };
  };
  autonomous_behaviors?: Record<string, unknown>; // Legacy support for autonomous behaviors
  human_interaction?: {
    enabled: boolean;
    mode?: string;
    settings?: Record<string, unknown>;
    interruption_tolerance?: string;
  };
}

export interface ToolsConfig {
  enabled: boolean;
  system: string;
  sandbox?: {
    enabled: boolean;
    allowedLanguages: string[];
    timeoutMs: number;
    memoryLimitMB: number;
    networkAccess: boolean;
    fileSystemAccess: boolean;
    maxProcesses: number;
  };
  terminal?: {
    enabled: boolean;
    workingDirectory: string;
    allowedCommands: string[];
    timeoutMs: number;
  };
}

export interface EmotionState {
  current: string;
  intensity: number;
  triggers: string[];
  history: EmotionRecord[];
  timestamp: Date;
  metadata?: Record<string, unknown>; // Add metadata property
}

export interface EmotionRecord {
  emotion: string;
  intensity: number;
  timestamp: Date;
  triggers: string[];
  duration: number;
}

export enum EmotionModuleType {
  RUNE_EMOTION_STACK = 'rune_emotion_stack',
  BASIC_EMOTIONS = 'basic_emotions',
  COMPLEX_EMOTIONS = 'complex_emotions',
  PLUTCHIK_WHEEL = 'plutchik_wheel',
  DIMENSIONAL = 'dimensional',
  COMPOSITE = 'composite',
}

export interface EmotionConfig {
  type: EmotionModuleType;
  sensitivity: number;
  decayRate: number;
  transitionSpeed: number;
  config?: BaseConfig;
}

export enum MemoryType {
  EXPERIENCE = 'experience',
  KNOWLEDGE = 'knowledge',
  INTERACTION = 'interaction',
  GOAL = 'goal',
  CONTEXT = 'context',
  OBSERVATION = 'observation',
  REFLECTION = 'reflection',
  LEARNING = 'learning',
  REASONING = 'reasoning',
}

export enum MemoryDuration {
  SHORT_TERM = 'short_term',
  MEDIUM_TERM = 'medium_term',
  LONG_TERM = 'long_term',
  WORKING = 'working',
  EPISODIC = 'episodic',
  PERMANENT = 'permanent',
}

export interface MemoryRecord {
  id: string;
  agentId: string;
  type: MemoryType;
  content: string;
  embedding?: number[];
  metadata: Metadata;
  importance: number;
  timestamp: Date;
  tags: string[];
  duration: MemoryDuration;
  expiresAt?: Date; // Optional expiration date for short-term memories
  [key: string]: any;
}

export interface MemoryProvider {
  store(agentId: string, memory: MemoryRecord): Promise<void>;
  retrieve(
    agentId: string,
    query: string,
    limit?: number
  ): Promise<MemoryRecord[]>;
  search(
    agentId: string,
    embedding: number[],
    limit?: number
  ): Promise<MemoryRecord[]>;
  delete(agentId: string, memoryId: string): Promise<void>;
  clear(agentId: string): Promise<void>;
  getRecent(agentId: string, limit?: number): Promise<MemoryRecord[]>;
}

export enum MemoryProviderType {
  SUPABASE_PGVECTOR = 'supabase_pgvector',
  SQLITE = 'sqlite',
  MEMORY = 'memory',
  NEON = 'neon',
  REDIS = 'redis',
  PINECONE = 'pinecone',
  WEAVIATE = 'weaviate',
  POSTGRES = 'postgres',
}

export interface MemoryConfig {
  provider: MemoryProviderType;
  maxRecords: number;
  embeddingModel?: string;
  retentionDays?: number;
  config?: BaseConfig;
}

export interface CognitionModule {
  think(agent: Agent, context: ThoughtContext): Promise<ThoughtResult>;
  plan(agent: Agent, goal: string): Promise<Plan>;
  decide(agent: Agent, options: Decision[]): Promise<Decision>;
}

export interface ThoughtContext {
  events: AgentEvent[];
  memories: MemoryRecord[];
  currentState: AgentState;
  environment: EnvironmentState;
  goal?: string;
}

export interface ThoughtResult {
  thoughts: string[];
  emotions: EmotionState;
  actions: AgentAction[];
  memories: MemoryRecord[];
  confidence: number;
  plan?: Plan; // Add optional plan property
}

export enum PlanStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface Plan {
  id: string;
  goal: string;
  steps: PlanStep[];
  priority: number;
  estimatedDuration: number;
  dependencies: string[];
  status: PlanStatus;
  confidence?: number;
}

export enum PlanStepStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface PlanStep {
  id: string;
  description: string;
  action: string;
  parameters: ActionParameters;
  preconditions: string[];
  effects: string[];
  status: PlanStepStatus;
}

export interface Decision {
  id: string;
  description: string;
  action: AgentAction;
  confidence: number;
  reasoning: string;
  rationale: string;
  consequences: string[];
}

export enum CognitionModuleType {
  HTN_PLANNER = 'htn_planner',
  REACTIVE = 'reactive',
  HYBRID = 'hybrid',
  GOAL_ORIENTED = 'goal_oriented',
  BEHAVIOR_TREE = 'behavior_tree',
  NEURAL_SYMBOLIC = 'neural_symbolic',
  UNIFIED = 'unified', // Add UNIFIED type
  THEORY_OF_MIND = 'theory_of_mind', // Add THEORY_OF_MIND type
}

export interface CognitionConfig {
  type: CognitionModuleType;
  planningDepth: number;
  memoryIntegration: boolean;
  creativityLevel: number;
  enableCognitiveProcessing?: boolean;
}

export enum ExtensionType {
  GAME_INTEGRATION = 'game_integration',
  SOCIAL_PLATFORM = 'social_platform',
  COMMUNICATION = 'communication',
  DATA_SOURCE = 'data_source',
  OUTPUT_DEVICE = 'output_device',
  SENSOR = 'sensor',
  ACTUATOR = 'actuator',
  UTILITY = 'utility',
  CUSTOM = 'custom',
}

export enum ExtensionStatus {
  ENABLED = 'enabled',
  DISABLED = 'disabled',
  ERROR = 'error',
  INITIALIZING = 'initializing',
  STOPPING = 'stopping',
  STOPPED = 'stopped',
  RUNNING = 'running',
  ACTIVE = 'active',
  STARTING = 'starting',
}

export interface Extension {
  id: string;
  name: string;
  version: string;
  type: ExtensionType;
  enabled: boolean;
  status: ExtensionStatus;
  config: ExtensionConfig;
  init(agent: Agent): Promise<void>;
  tick(agent: Agent): Promise<void>;
  actions: Record<string, ExtensionAction>;
  events: Record<string, ExtensionEventHandler>;
  dependencies?: string[];
  capabilities?: string[];
  lifecycle?: {
    onLoad?: () => Promise<void>;
    onUnload?: () => Promise<void>;
    onReload?: () => Promise<void>;
    onError?: (error: Error) => Promise<void>;
  };
}

export enum ActionCategory {
  COMMUNICATION = 'communication',
  MOVEMENT = 'movement',
  INTERACTION = 'interaction',
  OBSERVATION = 'observation',
  MANIPULATION = 'manipulation',
  SOCIAL = 'social',
  COGNITIVE = 'cognitive',
  SYSTEM = 'system',
  COMBAT = 'combat',
  TOOL_EXECUTION = 'tool_execution',
  RESOURCE_MANAGEMENT = 'resource_management',
  AUTONOMOUS = 'autonomous',
  LEARNING = 'learning',
  PROCESSING = 'processing',
  MEMORY = 'memory',
  AGENT = 'agent',
  QUERY = 'query',
}

export interface ExtensionAction {
  name: string;
  description: string;
  category: ActionCategory;
  parameters: ActionParameters;
  requiredPermissions?: string[];
  execute(agent: Agent, params: SkillParameters): Promise<ActionResult>;
}

export interface ExtensionEventHandler {
  event: string;
  description: string;
  handler: (agent: Agent, event: AgentEvent) => Promise<void>;
}

export enum ActionResultType {
  SUCCESS = 'success',
  FAILURE = 'failure',
  PARTIAL = 'partial',
  PENDING = 'pending',
  CANCELLED = 'cancelled',
  ERROR = 'error',
}

export interface ActionResult {
  success: boolean;
  type: ActionResultType;
  result?: GenericData;
  error?: string;
  metadata?: Metadata;
  duration?: number;
  timestamp?: Date;
}

export enum ActionStatus {
  PENDING = 'pending',
  EXECUTING = 'executing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface AgentAction {
  id: string;
  agentId: string;
  type: string;
  extension: string;
  action: string;
  parameters: ActionParameters;
  timestamp: Date;
  status: ActionStatus;
  result?: ActionResult;
  priority?: number;
}

export enum EventType {
  USER_INPUT = 'user_input',
  SYSTEM_MESSAGE = 'system_message',
  ENVIRONMENT_CHANGE = 'environment_change',
  AGENT_ACTION = 'agent_action',
  MEMORY_UPDATE = 'memory_update',
  EMOTION_CHANGE = 'emotion_change',
  GOAL_UPDATE = 'goal_update',
  EXTENSION_EVENT = 'extension_event',
  PORTAL_EVENT = 'portal_event',
  COORDINATION_EVENT = 'coordination_event',
  TIMER_EVENT = 'timer_event',
  ERROR_EVENT = 'error_event',
}

export enum EventSource {
  USER = 'user',
  SYSTEM = 'system',
  AGENT = 'agent',
  EXTENSION = 'extension',
  PORTAL = 'portal',
  ENVIRONMENT = 'environment',
  TIMER = 'timer',
  EXTERNAL = 'external',
}

export interface AgentEvent {
  id: string;
  type: EventType | string;
  source: EventSource | string;
  data: GenericData;
  timestamp: Date;
  processed: boolean;
  priority?: number;
  agentId?: string;
  targetAgentId?: string;
  tags?: string[]; // Add tags property to fix TypeScript errors
}

export enum AgentStateType {
  PHYSICAL = 'physical',
  MENTAL = 'mental',
  SOCIAL = 'social',
  ENVIRONMENTAL = 'environmental',
  TEMPORAL = 'temporal',
}

export interface AgentState {
  location?: string;
  inventory?: Record<string, unknown>;
  stats?: Record<string, number>;
  goals?: string[];
  context?: Context;
  energy?: number;
  focus?: number;
  stress?: number;
  confidence?: number;
  lastAction?: string;
  currentTask?: string;
}

export interface LazyAgentState extends AgentState {
  lazy?: boolean;
  lastAccessTime?: Date;
  hibernationLevel?: number;
  memories?: MemoryRecord[]; // Add memories property
  emotions?: EmotionState; // Add emotions property
  memoryUsage?: number; // Add memory usage tracking
  lastActivity?: Date; // Add last activity timestamp
  emotionState: EmotionState; // Required emotion state
  recentMemories: MemoryRecord[]; // Required recent memories
  currentThoughts?: string[]; // Optional current thoughts
  decisionContext?: unknown; // Optional decision context
}

export enum LazyAgentStatus {
  LOADED = 'loaded',
  UNLOADED = 'unloaded',
  LOADING = 'loading',
  ERROR = 'error',
}

export interface LazyAgent extends Omit<Agent, 'status'> {
  state: LazyAgentState;
  isLazy: boolean;
  hibernationLevel: number;
  lastAccessTime: Date;
  agent?: Agent;
  lastActivated?: Date;
  status: LazyAgentStatus;
  priority?: number;
  lazyMetrics?: {
    lastLoadTime?: Date;
    loadCount?: number;
    errorCount?: number;
  };
}

export interface AgentFactory {
  create(config: AgentConfig): Agent | Promise<Agent>;
  createLazy?(config: AgentConfig): LazyAgent | Promise<LazyAgent>;
}

export enum EnvironmentType {
  VIRTUAL_WORLD = 'virtual_world',
  GAME_ENVIRONMENT = 'game_environment',
  SOCIAL_PLATFORM = 'social_platform',
  PHYSICAL_SPACE = 'physical_space',
  DIGITAL_WORKSPACE = 'digital_workspace',
  SIMULATION = 'simulation',
}

export interface EnvironmentState {
  type: EnvironmentType;
  time: Date;
  weather?: string;
  location?: string;
  npcs?: GenericData[];
  objects?: GenericData[];
  events?: AgentEvent[];
  temperature?: number;
  lighting?: string;
  soundLevel?: number;
  crowdDensity?: number;
  dangerLevel?: number;
}

export interface AgentRuntime {
  agents: Map<string, Agent>;
  eventBus: EventBus;
  registry: ModuleRegistry;
  config: RuntimeConfig;
  initialize(): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  loadAgents(): Promise<void>;
  loadAgent(config: AgentConfig): Promise<Agent>;
  unloadAgent(agentId: string): Promise<void>;
  tick(): Promise<void>;
}

export interface EventBus {
  emit(event: AgentEvent): void;
  on(eventType: string, handler: (event: AgentEvent) => void): void;
  off(eventType: string, handler: (event: AgentEvent) => void): void;
  subscribe(agentId: string, eventTypes: string[]): void;
  unsubscribe(agentId: string, eventTypes: string[]): void;
  getEvents(): AgentEvent[];
  publish(event: AgentEvent): void; // Added publish method for compatibility
  shutdown(): void; // Added shutdown method for cleanup
}

export interface ModuleRegistry {
  registerMemoryProvider(name: string, provider: MemoryProvider): void;
  registerEmotionModule(name: string, module: EmotionModule): void;
  registerCognitionModule(name: string, module: CognitionModule): void;
  registerExtension(name: string, extension: Extension): void;
  registerPortal(name: string, portal: Portal): void;
  getMemoryProvider(name: string): MemoryProvider | undefined;
  getEmotionModule(name: string): EmotionModule | undefined;
  getCognitionModule(name: string): CognitionModule | undefined;
  getExtension(name: string): Extension | undefined;
  getPortal(name: string): Portal | undefined;

  // Factory registration methods
  registerMemoryFactory(
    name: string,
    factory: (config: unknown) => MemoryProvider
  ): void;
  registerEmotionFactory(
    name: string,
    factory: (config: unknown) => EmotionModule
  ): void;
  registerCognitionFactory(
    name: string,
    factory: (config: unknown) => CognitionModule | Promise<CognitionModule>
  ): void;
  registerExtensionFactory(
    name: string,
    factory: (config: unknown) => Extension
  ): void;
  registerPortalFactory(
    name: string,
    factory: (config: unknown) => Portal
  ): void;
  registerAgentFactory(
    name: string,
    factory: (config: unknown) => Agent | Promise<Agent>
  ): void;

  // Creation methods
  createMemoryProvider(
    name: string,
    config?: unknown
  ): MemoryProvider | undefined;
  createEmotionModule(
    name: string,
    config?: unknown
  ): EmotionModule | undefined;
  createCognitionModule(
    name: string,
    config?: unknown
  ): CognitionModule | Promise<CognitionModule> | undefined;
  createExtension(name: string, config?: unknown): Extension | undefined;
  createPortal(name: string, config?: unknown): Portal | undefined;

  // Listing methods
  listMemoryProviders(): string[];
  listEmotionModules(): string[];
  listCognitionModules(): string[];
  listExtensions(): string[];
  listPortals(): string[];
  listPortalFactories(): string[];

  // Other methods
  registerLazyAgent(name: string, loader: () => Promise<Agent>): void;
  getToolSystem(name: string): unknown;
  getRegisteredAgents(): Agent[]; // Add method for getting registered agents
}

export interface RuntimeConfig {
  tickInterval: number;
  maxAgents: number;
  logLevel: LogLevel;
  persistence: {
    enabled: boolean;
    path: string;
  };
  extensions: {
    autoLoad: boolean;
    paths: string[];
    slack?: {
      enabled: boolean;
      [key: string]: any;
    };
    runelite?: {
      enabled: boolean;
      [key: string]: any;
    };
    twitter?: {
      enabled: boolean;
      [key: string]: any;
    };
    telegram?: {
      enabled: boolean;
      [key: string]: any;
    };
    mcp?: {
      enabled: boolean;
      [key: string]: any;
    };
    api?: {
      enabled: boolean;
      [key: string]: any;
    };
  };
  portals?: {
    autoLoad: boolean;
    paths: string[];
    apiKeys?: Record<string, string>;
  };
  agents?: {
    enabled: boolean;
    paths?: string[];
    defaultEnabled?: boolean;
    charactersPath?: string;
  };
}
