/**
 * Segregated Agent Interfaces
 * 
 * Breaking down the monolithic Agent interface into focused, composable interfaces
 * following the Interface Segregation Principle
 */

import type {
  AgentId,
  Timestamp,
  AgentStatus,
  MemoryRecord,
  EmotionState,
  ThoughtContext,
  ThoughtResult,
  AgentAction,
  AgentEvent,
  AgentConfig,
  AgentState,
} from './agent.js';

import type {
  OperationResult,
  ExecutionResult,
  InitializationResult,
  CleanupResult,
  EventProcessingResult,
  AgentStateTransitionResult,
} from './helpers.js';

import type {
  UnifiedContext,
  ContextEnricher,
} from './context/unified-context.js';

import type {
  EmotionModule,
} from './emotion.js';

import type {
  CognitionModule,
} from './cognition.js';

import type {
  Extension,
} from './extensions';

import type {
  Portal,
} from './portal.js';

/**
 * Core agent identity and basic information
 */
export interface AgentCore {
  id: AgentId;
  name: string;
  status: AgentStatus;
  lastUpdate: Timestamp;
  config: AgentConfig;
}

/**
 * Agent behavior and personality traits
 */
export interface AgentBehavior {
  personality?: string[];
  autonomyLevel?: number;
  character_id?: string;
  characterConfig?: Record<string, unknown>;
}

/**
 * Agent runtime and system management
 */
export interface AgentRuntime {
  initialize(config: AgentConfig): Promise<InitializationResult>;
  cleanup(): Promise<CleanupResult>;
  tick(): Promise<OperationResult>;
  updateState(newState: Partial<AgentState>): Promise<AgentStateTransitionResult>;
}

/**
 * Agent memory management
 */
export interface AgentMemory {
  memory: {
    store(agentId: string, memory: MemoryRecord): Promise<void>;
    retrieve(agentId: string, query: string, limit?: number): Promise<MemoryRecord[]>;
    search(agentId: string, embedding: number[], limit?: number): Promise<MemoryRecord[]>;
    delete(agentId: string, memoryId: string): Promise<void>;
    clear(agentId: string): Promise<void>;
    getRecent(agentId: string, limit?: number): Promise<MemoryRecord[]>;
  };
}

/**
 * Agent emotional processing
 */
export interface AgentEmotional {
  emotion: EmotionModule;
}

/**
 * Agent cognitive processing
 */
export interface AgentCognitive {
  cognition: CognitionModule;
}

/**
 * Agent communication capabilities
 */
export interface AgentCommunication {
  processEvent(event: AgentEvent): Promise<EventProcessingResult>;
  executeAction(action: AgentAction): Promise<ExecutionResult>;
}

/**
 * Agent extension system
 */
export interface AgentExtensible {
  extensions: Extension[];
}

/**
 * Agent portal integration (AI providers)
 */
export interface AgentPortal {
  portal?: Portal;
  portals?: Portal[];
}

/**
 * Agent context awareness
 */
export interface AgentContextAware {
  currentContext?: UnifiedContext;
  contextEnrichers?: ContextEnricher[];
  
  // Context management methods
  createContext?(baseContext?: Partial<UnifiedContext>): UnifiedContext;
  enrichContext?(context: UnifiedContext): Promise<UnifiedContext>;
  validateContext?(context: UnifiedContext): Promise<boolean>;
  getContextualState?(): Promise<UnifiedContext>;
}

/**
 * Agent tool system integration
 */
export interface AgentToolSystem {
  toolSystem?: unknown; // Dynamic tools system for Agent Zero-style capabilities
}

/**
 * Agent learning and decision making
 */
export interface AgentLearning {
  learning?: unknown; // Learning system reference
  decision?: unknown; // Decision system reference
}

/**
 * Agent event bus integration
 */
export interface AgentEventBus {
  eventBus?: {
    emit(event: AgentEvent): void;
    on(eventType: string, handler: (event: AgentEvent) => void): void;
    off(eventType: string, handler: (event: AgentEvent) => void): void;
    subscribe(agentId: string, eventTypes: string[]): void;
    unsubscribe(agentId: string, eventTypes: string[]): void;
    getEvents(): AgentEvent[];
    publish(event: AgentEvent): void;
    shutdown(): void;
  };
}

/**
 * Complete agent interface composed of all capabilities
 */
export interface CompositeAgent extends
  AgentCore,
  AgentBehavior,
  AgentRuntime,
  AgentMemory,
  AgentEmotional,
  AgentCognitive,
  AgentCommunication,
  AgentExtensible,
  AgentPortal,
  AgentContextAware,
  AgentToolSystem,
  AgentLearning,
  AgentEventBus {}

/**
 * Minimal agent interface for basic functionality
 */
export interface MinimalAgent extends
  AgentCore,
  AgentRuntime,
  AgentMemory,
  AgentEmotional,
  AgentCognitive,
  AgentCommunication {}

/**
 * Standard agent interface for most use cases
 */
export interface StandardAgent extends
  AgentCore,
  AgentBehavior,
  AgentRuntime,
  AgentMemory,
  AgentEmotional,
  AgentCognitive,
  AgentCommunication,
  AgentExtensible,
  AgentPortal {}

/**
 * Advanced agent interface with full capabilities
 */
export interface AdvancedAgent extends
  AgentCore,
  AgentBehavior,
  AgentRuntime,
  AgentMemory,
  AgentEmotional,
  AgentCognitive,
  AgentCommunication,
  AgentExtensible,
  AgentPortal,
  AgentContextAware,
  AgentToolSystem {}

/**
 * Enterprise agent interface with all features
 */
export interface EnterpriseAgent extends CompositeAgent {}

/**
 * Specialized agent interfaces for specific use cases
 */

/**
 * Chatbot agent focused on conversation
 */
export interface ChatbotAgent extends
  AgentCore,
  AgentBehavior,
  AgentMemory,
  AgentEmotional,
  AgentCommunication,
  AgentPortal {
  // Chatbot-specific methods
  processMessage?(message: string): Promise<string>;
  generateResponse?(context: ThoughtContext): Promise<string>;
}

/**
 * Assistant agent focused on task execution
 */
export interface AssistantAgent extends
  AgentCore,
  AgentRuntime,
  AgentMemory,
  AgentCognitive,
  AgentCommunication,
  AgentExtensible,
  AgentToolSystem {
  // Assistant-specific methods
  executeTask?(task: string, parameters?: Record<string, unknown>): Promise<ExecutionResult>;
  planTask?(goal: string): Promise<ThoughtResult>;
}

/**
 * Research agent focused on information gathering
 */
export interface ResearchAgent extends
  AgentCore,
  AgentMemory,
  AgentCognitive,
  AgentCommunication,
  AgentExtensible,
  AgentToolSystem {
  // Research-specific methods
  search?(query: string): Promise<MemoryRecord[]>;
  analyze?(data: unknown[]): Promise<ThoughtResult>;
  synthesize?(information: MemoryRecord[]): Promise<string>;
}

/**
 * Gaming agent focused on game interactions
 */
export interface GamingAgent extends
  AgentCore,
  AgentBehavior,
  AgentRuntime,
  AgentMemory,
  AgentEmotional,
  AgentCognitive,
  AgentCommunication,
  AgentExtensible {
  // Gaming-specific methods
  perceiveEnvironment?(): Promise<AgentState>;
  makeDecision?(options: AgentAction[]): Promise<AgentAction>;
  executeMoves?(actions: AgentAction[]): Promise<ExecutionResult[]>;
}

/**
 * Social agent focused on social interactions
 */
export interface SocialAgent extends
  AgentCore,
  AgentBehavior,
  AgentMemory,
  AgentEmotional,
  AgentCommunication,
  AgentPortal,
  AgentContextAware {
  // Social-specific methods
  interpretSocialCues?(context: UnifiedContext): Promise<EmotionState>;
  generateSocialResponse?(context: ThoughtContext): Promise<string>;
  manageSocialRelationships?(): Promise<void>;
}

/**
 * Learning agent focused on continuous improvement
 */
export interface LearningAgent extends
  AgentCore,
  AgentMemory,
  AgentCognitive,
  AgentLearning,
  AgentContextAware {
  // Learning-specific methods
  learn?(experience: MemoryRecord[]): Promise<void>;
  adapt?(feedback: unknown): Promise<void>;
  evolve?(metrics: Record<string, number>): Promise<void>;
}

/**
 * Autonomous agent with self-management capabilities
 */
export interface AutonomousAgent extends
  AgentCore,
  AgentBehavior,
  AgentRuntime,
  AgentMemory,
  AgentEmotional,
  AgentCognitive,
  AgentCommunication,
  AgentExtensible,
  AgentLearning,
  AgentContextAware {
  // Autonomous-specific methods
  selfMonitor?(): Promise<AgentState>;
  selfImprove?(): Promise<void>;
  selfRepair?(error: Error): Promise<boolean>;
  makeAutonomousDecisions?(): Promise<AgentAction[]>;
}

/**
 * Type guards for agent interfaces
 */
export function isAgentCore(obj: unknown): obj is AgentCore {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'name' in obj &&
    'status' in obj &&
    'lastUpdate' in obj &&
    'config' in obj
  );
}

export function isAgentRuntime(obj: unknown): obj is AgentRuntime {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'initialize' in obj &&
    'cleanup' in obj &&
    'tick' in obj &&
    'updateState' in obj &&
    typeof (obj as any).initialize === 'function' &&
    typeof (obj as any).cleanup === 'function' &&
    typeof (obj as any).tick === 'function' &&
    typeof (obj as any).updateState === 'function'
  );
}

export function isAgentMemory(obj: unknown): obj is AgentMemory {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'memory' in obj &&
    typeof (obj as any).memory === 'object' &&
    (obj as any).memory !== null &&
    'store' in (obj as any).memory &&
    'retrieve' in (obj as any).memory &&
    typeof (obj as any).memory.store === 'function' &&
    typeof (obj as any).memory.retrieve === 'function'
  );
}

export function isMinimalAgent(obj: unknown): obj is MinimalAgent {
  return (
    isAgentCore(obj) &&
    isAgentRuntime(obj) &&
    isAgentMemory(obj) &&
    'emotion' in obj &&
    'cognition' in obj &&
    'processEvent' in obj &&
    'executeAction' in obj
  );
}

export function isStandardAgent(obj: unknown): obj is StandardAgent {
  return (
    isMinimalAgent(obj) &&
    'extensions' in obj &&
    Array.isArray((obj as any).extensions)
  );
}

export function isChatbotAgent(obj: unknown): obj is ChatbotAgent {
  return (
    isAgentCore(obj) &&
    'memory' in obj &&
    'emotion' in obj &&
    'processEvent' in obj &&
    'executeAction' in obj
  );
}

/**
 * Factory functions for creating different agent types
 */
export interface AgentFactory<T> {
  create(config: AgentConfig): Promise<T>;
  createFromTemplate?(template: string, overrides?: Partial<AgentConfig>): Promise<T>;
}

export interface MinimalAgentFactory extends AgentFactory<MinimalAgent> {}
export interface StandardAgentFactory extends AgentFactory<StandardAgent> {}
export interface AdvancedAgentFactory extends AgentFactory<AdvancedAgent> {}
export interface EnterpriseAgentFactory extends AgentFactory<EnterpriseAgent> {}

export interface ChatbotAgentFactory extends AgentFactory<ChatbotAgent> {}
export interface AssistantAgentFactory extends AgentFactory<AssistantAgent> {}
export interface ResearchAgentFactory extends AgentFactory<ResearchAgent> {}
export interface GamingAgentFactory extends AgentFactory<GamingAgent> {}
export interface SocialAgentFactory extends AgentFactory<SocialAgent> {}
export interface LearningAgentFactory extends AgentFactory<LearningAgent> {}
export interface AutonomousAgentFactory extends AgentFactory<AutonomousAgent> {}

/**
 * Agent capability mixins for composition
 */
export interface AgentCapabilityMixin {
  name: string;
  description: string;
  version: string;
  dependencies?: string[];
  conflicts?: string[];
  install<T>(agent: T): T;
  uninstall<T>(agent: T): T;
  isCompatible<T>(agent: T): boolean;
}

export interface ContextAwareMixin extends AgentCapabilityMixin {
  name: 'context-aware';
  install<T extends AgentCore>(agent: T): T & AgentContextAware;
}

export interface ToolSystemMixin extends AgentCapabilityMixin {
  name: 'tool-system';
  install<T extends AgentCore>(agent: T): T & AgentToolSystem;
}

export interface LearningMixin extends AgentCapabilityMixin {
  name: 'learning';
  install<T extends AgentCore>(agent: T): T & AgentLearning;
}

export interface EventBusMixin extends AgentCapabilityMixin {
  name: 'event-bus';
  install<T extends AgentCore>(agent: T): T & AgentEventBus;
}

/**
 * Agent builder for composing capabilities
 */
export interface AgentBuilder<T = AgentCore> {
  withBehavior(): AgentBuilder<T & AgentBehavior>;
  withRuntime(): AgentBuilder<T & AgentRuntime>;
  withMemory(): AgentBuilder<T & AgentMemory>;
  withEmotion(): AgentBuilder<T & AgentEmotional>;
  withCognition(): AgentBuilder<T & AgentCognitive>;
  withCommunication(): AgentBuilder<T & AgentCommunication>;
  withExtensions(): AgentBuilder<T & AgentExtensible>;
  withPortal(): AgentBuilder<T & AgentPortal>;
  withContext(): AgentBuilder<T & AgentContextAware>;
  withTools(): AgentBuilder<T & AgentToolSystem>;
  withLearning(): AgentBuilder<T & AgentLearning>;
  withEventBus(): AgentBuilder<T & AgentEventBus>;
  withMixin<M>(mixin: AgentCapabilityMixin): AgentBuilder<T & M>;
  build(config: AgentConfig): Promise<T>;
}