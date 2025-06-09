/**
 * Agent types for SYMindX
 */

import { EmotionModule } from './emotion.js'
import { 
  BaseConfig, 
  ActionParameters, 
  Metadata, 
  Context, 
  GenericData, 
  SkillParameters,
  ExtensionConfig,
  GameState
} from './common.js'

export enum AgentStatus {
  ACTIVE = 'active',
  IDLE = 'idle',
  THINKING = 'thinking',
  PAUSED = 'paused',
  ERROR = 'error',
  INITIALIZING = 'initializing',
  STOPPING = 'stopping'
}

export interface Agent {
  id: string
  name: string
  status: AgentStatus
  emotion: EmotionModule
  memory: MemoryProvider
  cognition: CognitionModule
  extensions: Extension[]
  portal?: Portal
  config: AgentConfig
  lastUpdate: Date
  eventBus?: EventBus // Added eventBus property as optional
}

export interface AgentConfig {
  core: {
    name: string
    tone: string
    personality: string[]
  }
  lore: {
    origin: string
    motive: string
    background?: string
  }
  psyche: {
    traits: string[]
    defaults: {
      memory: string
      emotion: string
      cognition: string
      portal?: string
    }
  }
  modules: {
    extensions: string[]
    memory?: MemoryConfig
    emotion?: EmotionConfig
    cognition?: CognitionConfig
    portal?: PortalConfig
  }
}

export interface EmotionState {
  current: string
  intensity: number
  triggers: string[]
  history: EmotionRecord[]
  timestamp: Date
}

export interface EmotionRecord {
  emotion: string
  intensity: number
  timestamp: Date
  triggers: string[]
  duration: number
}

export enum EmotionModuleType {
  RUNE_EMOTION_STACK = 'rune_emotion_stack',
  BASIC_EMOTIONS = 'basic_emotions',
  COMPLEX_EMOTIONS = 'complex_emotions',
  PLUTCHIK_WHEEL = 'plutchik_wheel',
  DIMENSIONAL = 'dimensional'
}

export interface EmotionConfig {
  type: EmotionModuleType
  sensitivity: number
  decayRate: number
  transitionSpeed: number
  config?: BaseConfig
}

export enum MemoryType {
  EXPERIENCE = 'experience',
  KNOWLEDGE = 'knowledge',
  INTERACTION = 'interaction',
  GOAL = 'goal',
  CONTEXT = 'context',
  OBSERVATION = 'observation',
  REFLECTION = 'reflection'
}

export enum MemoryDuration {
  SHORT_TERM = 'short_term',
  LONG_TERM = 'long_term',
  WORKING = 'working',
  EPISODIC = 'episodic'
}

export interface MemoryRecord {
  id: string
  agentId: string
  type: MemoryType
  content: string
  embedding?: number[]
  metadata: Metadata
  importance: number
  timestamp: Date
  tags: string[]
  duration: MemoryDuration
  expiresAt?: Date // Optional expiration date for short-term memories
}

export interface MemoryProvider {
  store(agentId: string, memory: MemoryRecord): Promise<void>
  retrieve(agentId: string, query: string, limit?: number): Promise<MemoryRecord[]>
  search(agentId: string, embedding: number[], limit?: number): Promise<MemoryRecord[]>
  delete(agentId: string, memoryId: string): Promise<void>
  clear(agentId: string): Promise<void>
  getRecent(limit?: number): Promise<MemoryRecord[]>
}

export enum MemoryProviderType {
  SUPABASE_PGVECTOR = 'supabase_pgvector',
  SQLITE = 'sqlite',
  MEMORY = 'memory',
  NEON = 'neon',
  REDIS = 'redis',
  PINECONE = 'pinecone',
  WEAVIATE = 'weaviate'
}

export interface MemoryConfig {
  provider: MemoryProviderType
  maxRecords: number
  embeddingModel?: string
  retentionDays?: number
  config?: BaseConfig
}

export interface CognitionModule {
  think(agent: Agent, context: ThoughtContext): Promise<ThoughtResult>
  plan(agent: Agent, goal: string): Promise<Plan>
  decide(agent: Agent, options: Decision[]): Promise<Decision>
}

export interface ThoughtContext {
  events: AgentEvent[]
  memories: MemoryRecord[]
  currentState: AgentState
  environment: EnvironmentState
  goal?: string
}

export interface ThoughtResult {
  thoughts: string[]
  emotions: EmotionState
  actions: AgentAction[]
  memories: MemoryRecord[]
  confidence: number
}

export enum PlanStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export interface Plan {
  id: string
  goal: string
  steps: PlanStep[]
  priority: number
  estimatedDuration: number
  dependencies: string[]
  status: PlanStatus
}

export enum PlanStepStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export interface PlanStep {
  id: string
  description: string
  action: string
  parameters: ActionParameters
  preconditions: string[]
  effects: string[]
  status: PlanStepStatus
}

export interface Decision {
  id: string
  description: string
  action: AgentAction
  confidence: number
  reasoning: string
  consequences: string[]
}

export enum CognitionModuleType {
  HTN_PLANNER = 'htn_planner',
  REACTIVE = 'reactive',
  HYBRID = 'hybrid',
  GOAL_ORIENTED = 'goal_oriented',
  BEHAVIOR_TREE = 'behavior_tree',
  NEURAL_SYMBOLIC = 'neural_symbolic'
}

export interface CognitionConfig {
  type: CognitionModuleType
  planningDepth: number
  memoryIntegration: boolean
  creativityLevel: number
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
  CUSTOM = 'custom'
}

export enum ExtensionStatus {
  ENABLED = 'enabled',
  DISABLED = 'disabled',
  ERROR = 'error',
  INITIALIZING = 'initializing',
  STOPPING = 'stopping'
}

export interface Extension {
  id: string
  name: string
  version: string
  type: ExtensionType
  enabled: boolean
  status: ExtensionStatus
  config: ExtensionConfig
  init(agent: Agent): Promise<void>
  tick(agent: Agent): Promise<void>
  actions: Record<string, ExtensionAction>
  events: Record<string, ExtensionEventHandler>
  dependencies?: string[]
  capabilities?: string[]
  lifecycle?: {
    onLoad?: () => Promise<void>
    onUnload?: () => Promise<void>
    onReload?: () => Promise<void>
    onError?: (error: Error) => Promise<void>
  }
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
  COMBAT = 'combat'
}

export interface ExtensionAction {
  name: string
  description: string
  category: ActionCategory
  parameters: ActionParameters
  requiredPermissions?: string[]
  execute(agent: Agent, params: SkillParameters): Promise<ActionResult>
}

export interface ExtensionEventHandler {
  event: string
  description: string
  handler: (agent: Agent, event: AgentEvent) => Promise<void>
}

export enum ActionResultType {
  SUCCESS = 'success',
  FAILURE = 'failure',
  PARTIAL = 'partial',
  PENDING = 'pending',
  CANCELLED = 'cancelled'
}

export interface ActionResult {
  success: boolean
  type: ActionResultType
  result?: GenericData
  error?: string
  metadata?: Metadata
  duration?: number
  timestamp?: Date
}

export enum ActionStatus {
  PENDING = 'pending',
  EXECUTING = 'executing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export interface AgentAction {
  id: string
  type: string
  extension: string
  action: string
  parameters: ActionParameters
  timestamp: Date
  status: ActionStatus
  result?: ActionResult
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
  ERROR_EVENT = 'error_event'
}

export enum EventSource {
  USER = 'user',
  SYSTEM = 'system',
  AGENT = 'agent',
  EXTENSION = 'extension',
  PORTAL = 'portal',
  ENVIRONMENT = 'environment',
  TIMER = 'timer',
  EXTERNAL = 'external'
}

export interface AgentEvent {
  id: string
  type: EventType | string
  source: EventSource | string
  data: GenericData
  timestamp: Date
  processed: boolean
  priority?: number
  agentId?: string
  targetAgentId?: string
  tags?: string[] // Add tags property to fix TypeScript errors
}

export enum AgentStateType {
  PHYSICAL = 'physical',
  MENTAL = 'mental',
  SOCIAL = 'social',
  ENVIRONMENTAL = 'environmental',
  TEMPORAL = 'temporal'
}

export interface AgentState {
  location?: string
  inventory?: Record<string, any>
  stats?: Record<string, number>
  goals?: string[]
  context?: Context
  energy?: number
  focus?: number
  stress?: number
  confidence?: number
  lastAction?: string
  currentTask?: string
}

export enum EnvironmentType {
  VIRTUAL_WORLD = 'virtual_world',
  GAME_ENVIRONMENT = 'game_environment',
  SOCIAL_PLATFORM = 'social_platform',
  PHYSICAL_SPACE = 'physical_space',
  DIGITAL_WORKSPACE = 'digital_workspace',
  SIMULATION = 'simulation'
}

export interface EnvironmentState {
  type: EnvironmentType
  time: Date
  weather?: string
  location?: string
  npcs?: GenericData[]
  objects?: GenericData[]
  events?: AgentEvent[]
  temperature?: number
  lighting?: string
  soundLevel?: number
  crowdDensity?: number
  dangerLevel?: number
}

export interface AgentRuntime {
  agents: Map<string, Agent>
  eventBus: EventBus
  registry: ModuleRegistry
  config: RuntimeConfig
  initialize(): Promise<void>
  start(): Promise<void>
  stop(): Promise<void>
  loadAgents(): Promise<void>
  loadAgent(config: AgentConfig): Promise<Agent>
  unloadAgent(agentId: string): Promise<void>
  tick(): Promise<void>
}

export interface EventBus {
  emit(event: AgentEvent): void
  on(eventType: string, handler: (event: AgentEvent) => void): void
  off(eventType: string, handler: (event: AgentEvent) => void): void
  subscribe(agentId: string, eventTypes: string[]): void
  unsubscribe(agentId: string, eventTypes: string[]): void
  getEvents(): AgentEvent[]
}

export interface ModuleRegistry {
  registerMemoryProvider(name: string, provider: MemoryProvider): void
  registerEmotionModule(name: string, module: EmotionModule): void
  registerCognitionModule(name: string, module: CognitionModule): void
  registerExtension(name: string, extension: Extension): void
  registerPortal(name: string, portal: Portal): void
  getMemoryProvider(name: string): MemoryProvider | undefined
  getEmotionModule(name: string): EmotionModule | undefined
  getCognitionModule(name: string): CognitionModule | undefined
  getExtension(name: string): Extension | undefined
  getPortal(name: string): Portal | undefined
}

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

export interface RuntimeConfig {
  tickInterval: number
  maxAgents: number
  logLevel: LogLevel
  persistence: {
    enabled: boolean
    path: string
  }
  extensions: {
    autoLoad: boolean
    paths: string[]
  }
  portals?: {
    autoLoad: boolean
    paths: string[]
    apiKeys?: Record<string, string>
  }
}

import { Portal, PortalConfig } from './portal.js'