/**
 * Comprehensive TypeScript definitions for SYMindX agents
 * Provides full IntelliSense support and type safety
 */

// Core Agent Types
export interface AgentConfig {
  id: string;
  name: string;
  type: 'autonomous' | 'reactive' | 'hybrid';
  enabled: boolean;
  core: AgentCore;
  lore: AgentLore;
  psyche: AgentPsyche;
  modules: AgentModules;
}

export interface AgentCore {
  name: string;
  tone: 'professional' | 'casual' | 'enthusiastic' | 'caring' | 'analytical' | 'assertive' | 'inquisitive';
  personality: PersonalityTrait[];
  description?: string;
}

export interface AgentLore {
  origin: string;
  motive: string;
  background: string;
}

export interface AgentPsyche {
  traits: string[];
  defaults: {
    memory: MemoryProvider;
    emotion: EmotionType;
    cognition: CognitionType;
  };
}

export interface AgentModules {
  extensions: ExtensionType[];
  memory: MemoryConfig;
  emotion: EmotionConfig;
  cognition: CognitionConfig;
  portals: PortalConfig;
}

// Personality and Behavior Types
export type PersonalityTrait = 
  | 'technical' | 'creative' | 'strategic' | 'empathetic' 
  | 'confident' | 'curious' | 'helpful' | 'intelligent'
  | 'analytical' | 'supportive' | 'innovative' | 'reliable';

export type EmotionType = 
  | 'happy' | 'sad' | 'angry' | 'confident' | 'neutral' 
  | 'curious' | 'empathetic' | 'anxious' | 'nostalgic' 
  | 'proud' | 'confused' | 'composite';

export type CognitionType = 
  | 'reactive' | 'htn-planner' | 'hybrid' | 'theory-of-mind' | 'unified';

export type MemoryProvider = 'sqlite' | 'postgres' | 'supabase' | 'neon';

export type ExtensionType = 
  | 'api' | 'telegram' | 'discord' | 'runelite' | 'mcp-server' | 'communication';

// Memory Configuration
export interface MemoryConfig {
  provider: MemoryProvider;
  maxRecords: number;
  vectorSearch?: boolean;
  config: Record<string, any>;
}

export interface MemoryRecord {
  id: string;
  content: string;
  metadata: Record<string, any>;
  timestamp: Date;
  importance: number;
  embedding?: number[];
}

// Emotion Configuration
export interface EmotionConfig {
  type: EmotionType;
  sensitivity: number;
  decayRate: number;
  transitionSpeed: number;
  primaryEmotion?: EmotionType;
}

export interface EmotionState {
  current: EmotionType;
  intensity: number;
  duration: number;
  triggers: string[];
  history: EmotionHistoryEntry[];
}

export interface EmotionHistoryEntry {
  emotion: EmotionType;
  intensity: number;
  timestamp: Date;
  trigger: string;
}

// Cognition Configuration
export interface CognitionConfig {
  type: CognitionType;
  planningDepth: number;
  memoryIntegration: boolean;
  creativityLevel: number;
  learningRate?: number;
}

export interface CognitionState {
  currentPlan?: Plan;
  goals: Goal[];
  beliefs: Belief[];
  intentions: Intention[];
}

export interface Plan {
  id: string;
  goal: string;
  steps: PlanStep[];
  status: 'active' | 'completed' | 'failed' | 'paused';
  priority: number;
}

export interface PlanStep {
  id: string;
  action: string;
  parameters: Record<string, any>;
  preconditions: string[];
  effects: string[];
  status: 'pending' | 'executing' | 'completed' | 'failed';
}

export interface Goal {
  id: string;
  description: string;
  priority: number;
  deadline?: Date;
  status: 'active' | 'achieved' | 'abandoned';
}

export interface Belief {
  id: string;
  statement: string;
  confidence: number;
  source: string;
  timestamp: Date;
}

export interface Intention {
  id: string;
  action: string;
  parameters: Record<string, any>;
  priority: number;
  timestamp: Date;
}

// Portal Configuration
export interface PortalConfig {
  primary: AIProvider;
  fallback: AIProvider[];
  config: Record<string, any>;
}

export type AIProvider = 
  | 'openai' | 'anthropic' | 'groq' | 'google' | 'ollama' 
  | 'azure-openai' | 'mistral' | 'cohere' | 'perplexity' | 'xai';

// Message and Communication Types
export interface Message {
  id: string;
  content: string;
  sender: string;
  recipient: string;
  timestamp: Date;
  metadata: MessageMetadata;
}

export interface MessageMetadata {
  platform?: string;
  channel?: string;
  thread?: string;
  replyTo?: string;
  attachments?: Attachment[];
  emotion?: EmotionType;
  intent?: string;
}

export interface Attachment {
  type: 'image' | 'file' | 'audio' | 'video' | 'link';
  url: string;
  name: string;
  size?: number;
  mimeType?: string;
}

export interface AgentResponse {
  text: string;
  emotion: EmotionType;
  confidence: number;
  metadata: ResponseMetadata;
}

export interface ResponseMetadata {
  processingTime: number;
  memoryAccess: number;
  emotionChange?: EmotionType;
  planUpdated?: boolean;
  toolsUsed?: string[];
}

// Runtime and System Types
export interface RuntimeConfig {
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  enableMetrics: boolean;
  enableProfiling: boolean;
  maxConcurrentAgents: number;
  heartbeatInterval: number;
}

export interface AgentMetrics {
  uptime: number;
  messageCount: number;
  averageResponseTime: number;
  memoryUsage: number;
  emotionChanges: number;
  planExecutions: number;
  errorCount: number;
}

export interface SystemMetrics {
  totalAgents: number;
  activeAgents: number;
  totalMessages: number;
  systemUptime: number;
  memoryUsage: MemoryUsage;
  cpuUsage: number;
}

export interface MemoryUsage {
  used: number;
  total: number;
  percentage: number;
  heap: {
    used: number;
    total: number;
  };
}

// Event System Types
export interface AgentEvent {
  id: string;
  type: EventType;
  agentId: string;
  timestamp: Date;
  data: Record<string, any>;
}

export type EventType = 
  | 'message_received' | 'message_sent' | 'emotion_changed' 
  | 'plan_created' | 'plan_executed' | 'goal_achieved'
  | 'memory_stored' | 'memory_retrieved' | 'error_occurred'
  | 'agent_started' | 'agent_stopped' | 'extension_loaded';

// Development and Debugging Types
export interface DebugInfo {
  agentId: string;
  timestamp: Date;
  state: AgentDebugState;
  performance: PerformanceMetrics;
  logs: LogEntry[];
}

export interface AgentDebugState {
  currentEmotion: EmotionState;
  cognitionState: CognitionState;
  memoryStats: MemoryStats;
  activeExtensions: string[];
  lastMessages: Message[];
}

export interface MemoryStats {
  totalRecords: number;
  recentAccess: number;
  averageImportance: number;
  storageSize: number;
}

export interface PerformanceMetrics {
  responseTime: {
    average: number;
    min: number;
    max: number;
    p95: number;
  };
  memoryUsage: {
    current: number;
    peak: number;
    average: number;
  };
  cpuUsage: {
    current: number;
    average: number;
  };
  throughput: {
    messagesPerSecond: number;
    operationsPerSecond: number;
  };
}

export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  timestamp: Date;
  message: string;
  context?: Record<string, any>;
  stack?: string;
}

// Extension Types
export interface Extension {
  name: string;
  version: string;
  enabled: boolean;
  config: Record<string, any>;
  initialize: (agent: Agent) => Promise<void>;
  shutdown: () => Promise<void>;
}

export interface APIExtensionConfig {
  port: number;
  host: string;
  enableDashboard: boolean;
  enableWebSocket: boolean;
  corsOrigins: string[];
  rateLimit?: {
    windowMs: number;
    max: number;
  };
}

export interface TelegramExtensionConfig {
  botToken: string;
  allowedUsers?: string[];
  enableInlineMode?: boolean;
  webhookUrl?: string;
}

export interface DiscordExtensionConfig {
  botToken: string;
  guildId?: string;
  commandPrefix?: string;
  enableSlashCommands?: boolean;
}

// Agent Interface
export interface Agent {
  id: string;
  name: string;
  config: AgentConfig;
  
  // Core Methods
  start(): Promise<void>;
  stop(): Promise<void>;
  restart(): Promise<void>;
  
  // Message Processing
  processMessage(message: string, metadata?: MessageMetadata): Promise<AgentResponse>;
  
  // State Management
  getState(): AgentDebugState;
  getMetrics(): AgentMetrics;
  getStatus(): { status: string; uptime: number; health: string };
  
  // Memory Operations
  storeMemory(content: string, metadata?: Record<string, any>): Promise<string>;
  retrieveMemory(query: string, limit?: number): Promise<MemoryRecord[]>;
  
  // Emotion Management
  getCurrentEmotion(): EmotionState;
  setEmotion(emotion: EmotionType, intensity?: number): void;
  
  // Planning and Goals
  createGoal(description: string, priority?: number): Promise<Goal>;
  createPlan(goal: string): Promise<Plan>;
  executePlan(planId: string): Promise<void>;
  
  // Events
  on(event: EventType, listener: (data: any) => void): void;
  emit(event: EventType, data: any): void;
  
  // Extensions
  loadExtension(extension: Extension): Promise<void>;
  unloadExtension(name: string): Promise<void>;
  
  // Debugging
  getDebugInfo(): DebugInfo;
  getLogs(limit?: number): LogEntry[];
  enableProfiling(): void;
  disableProfiling(): void;
}

// Runtime Interface
export interface SYMindXRuntime {
  initialize(config?: RuntimeConfig): Promise<void>;
  shutdown(): Promise<void>;
  
  createAgent(config: AgentConfig): Promise<Agent>;
  getAgent(id: string): Agent | undefined;
  listAgents(): Agent[];
  removeAgent(id: string): Promise<void>;
  
  getSystemMetrics(): SystemMetrics;
  getEvents(filter?: Partial<AgentEvent>): AgentEvent[];
  
  on(event: string, listener: (...args: any[]) => void): void;
  emit(event: string, ...args: any[]): void;
}

// Utility Types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Type Guards
export function isAgentConfig(obj: any): obj is AgentConfig {
  return obj && typeof obj.id === 'string' && typeof obj.name === 'string';
}

export function isMessage(obj: any): obj is Message {
  return obj && typeof obj.content === 'string' && obj.timestamp instanceof Date;
}

export function isAgentResponse(obj: any): obj is AgentResponse {
  return obj && typeof obj.text === 'string' && typeof obj.emotion === 'string';
}

// Constants
export const EMOTION_TYPES: EmotionType[] = [
  'happy', 'sad', 'angry', 'confident', 'neutral', 
  'curious', 'empathetic', 'anxious', 'nostalgic', 
  'proud', 'confused', 'composite'
];

export const COGNITION_TYPES: CognitionType[] = [
  'reactive', 'htn-planner', 'hybrid', 'theory-of-mind', 'unified'
];

export const MEMORY_PROVIDERS: MemoryProvider[] = [
  'sqlite', 'postgres', 'supabase', 'neon'
];

export const AI_PROVIDERS: AIProvider[] = [
  'openai', 'anthropic', 'groq', 'google', 'ollama',
  'azure-openai', 'mistral', 'cohere', 'perplexity', 'xai'
];

export const EXTENSION_TYPES: ExtensionType[] = [
  'api', 'telegram', 'discord', 'runelite', 'mcp-server', 'communication'
];