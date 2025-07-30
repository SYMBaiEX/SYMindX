/**
 * Type guards for runtime type validation
 * Provides comprehensive type safety for all major interfaces
 */

import type {
  Agent,
  AgentConfig,
  AgentState,
  LazyAgent,
  AgentEvent,
  AgentAction,
  ExtensionAction,
  ActionResult,
  MemoryRecord,
  EmotionState,
  ThoughtContext,
  ThoughtResult,
  Plan,
  PlanStep,
  Decision,
  Extension,
  AgentStatus,
  ActionStatus,
  MemoryType,
  MemoryDuration,
  EventType,
  EventSource,
  PlanStatus,
  PlanStepStatus,
  ExtensionType,
  ExtensionStatus,
  ActionCategory,
  ActionResultType,
  EmotionModuleType,
  MemoryProviderType,
  CognitionModuleType,
  LazyAgentStatus,
  EnvironmentType,
  AgentStateType,
} from './agent.js';

import type {
  EmotionModule,
  PersonalityTraits,
  EmotionBlend,
  AdvancedEmotionConfig,
} from './emotion.js';

import type {
  CognitionModule,
  SerializableRule,
  PDDLExpression,
  ReasoningParadigm,
  ContextAnalysis,
  ReasoningState,
} from './cognition.js';

import type { Portal, PortalConfig, PortalType } from './portal.js';

import type {
  BaseConfig,
  ActionParameters,
  Metadata,
  Context,
  GenericData,
  Message,
} from './common.js';

import type {
  UnifiedContext,
  ContextMetadata,
} from './context/unified-context.js';

import type {
  SearchQuery,
  SearchResult,
  MemoryRelationship,
  MemoryManagementPolicy,
} from './memory.js';

// Helper type guard utilities
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasProperty<K extends PropertyKey>(
  obj: unknown,
  key: K
): obj is Record<K, unknown> {
  return isObject(obj) && key in obj;
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

function isDate(value: unknown): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

function isArray<T>(
  value: unknown,
  itemGuard?: (item: unknown) => item is T
): value is T[] {
  if (!Array.isArray(value)) return false;
  if (!itemGuard) return true;
  return value.every(itemGuard);
}

function isEnum<T extends Record<string, string | number>>(
  value: unknown,
  enumObj: T
): value is T[keyof T] {
  return Object.values(enumObj).includes(value as T[keyof T]);
}

// Agent type guards
export function isAgent(obj: unknown): obj is Agent {
  if (!isObject(obj)) return false;

  return (
    hasProperty(obj, 'id') &&
    isString(obj.id) &&
    hasProperty(obj, 'name') &&
    isString(obj.name) &&
    hasProperty(obj, 'status') &&
    isEnum(obj.status, AgentStatus) &&
    hasProperty(obj, 'emotion') &&
    isEmotionModule(obj.emotion) &&
    hasProperty(obj, 'memory') &&
    isMemoryProvider(obj.memory) &&
    hasProperty(obj, 'cognition') &&
    isCognitionModule(obj.cognition) &&
    hasProperty(obj, 'extensions') &&
    isArray(obj.extensions, isExtension) &&
    hasProperty(obj, 'config') &&
    isAgentConfig(obj.config) &&
    hasProperty(obj, 'lastUpdate') &&
    isDate(obj.lastUpdate) &&
    hasProperty(obj, 'initialize') &&
    typeof obj.initialize === 'function' &&
    hasProperty(obj, 'cleanup') &&
    typeof obj.cleanup === 'function' &&
    hasProperty(obj, 'tick') &&
    typeof obj.tick === 'function' &&
    hasProperty(obj, 'updateState') &&
    typeof obj.updateState === 'function' &&
    hasProperty(obj, 'processEvent') &&
    typeof obj.processEvent === 'function' &&
    hasProperty(obj, 'executeAction') &&
    typeof obj.executeAction === 'function'
  );
}

export function isAgentConfig(obj: unknown): obj is AgentConfig {
  if (!isObject(obj)) return false;

  return (
    hasProperty(obj, 'core') &&
    isObject(obj.core) &&
    hasProperty(obj.core, 'name') &&
    isString(obj.core.name) &&
    hasProperty(obj.core, 'tone') &&
    isString(obj.core.tone) &&
    hasProperty(obj.core, 'personality') &&
    isArray(obj.core.personality, isString) &&
    hasProperty(obj, 'lore') &&
    isObject(obj.lore) &&
    hasProperty(obj.lore, 'origin') &&
    isString(obj.lore.origin) &&
    hasProperty(obj.lore, 'motive') &&
    isString(obj.lore.motive) &&
    hasProperty(obj, 'psyche') &&
    isObject(obj.psyche) &&
    hasProperty(obj.psyche, 'traits') &&
    isArray(obj.psyche.traits, isString) &&
    hasProperty(obj.psyche, 'defaults') &&
    isObject(obj.psyche.defaults) &&
    hasProperty(obj, 'modules') &&
    isObject(obj.modules) &&
    hasProperty(obj.modules, 'extensions') &&
    isArray(obj.modules.extensions, isString)
  );
}

export function isAgentState(obj: unknown): obj is AgentState {
  if (!isObject(obj)) return false;

  // All properties are optional, so we just need to check their types if present
  return (
    (!hasProperty(obj, 'location') || isString(obj.location)) &&
    (!hasProperty(obj, 'inventory') || isObject(obj.inventory)) &&
    (!hasProperty(obj, 'stats') ||
      (isObject(obj.stats) && Object.values(obj.stats).every(isNumber))) &&
    (!hasProperty(obj, 'goals') || isArray(obj.goals, isString)) &&
    (!hasProperty(obj, 'energy') || isNumber(obj.energy)) &&
    (!hasProperty(obj, 'focus') || isNumber(obj.focus)) &&
    (!hasProperty(obj, 'stress') || isNumber(obj.stress)) &&
    (!hasProperty(obj, 'confidence') || isNumber(obj.confidence)) &&
    (!hasProperty(obj, 'lastAction') || isString(obj.lastAction)) &&
    (!hasProperty(obj, 'currentTask') || isString(obj.currentTask))
  );
}

export function isLazyAgent(obj: unknown): obj is LazyAgent {
  if (!isObject(obj)) return false;

  return (
    hasProperty(obj, 'state') &&
    isLazyAgentState(obj.state) &&
    hasProperty(obj, 'isLazy') &&
    obj.isLazy === true &&
    hasProperty(obj, 'hibernationLevel') &&
    isNumber(obj.hibernationLevel) &&
    hasProperty(obj, 'lastAccessTime') &&
    isDate(obj.lastAccessTime) &&
    hasProperty(obj, 'status') &&
    isEnum(obj.status, LazyAgentStatus)
  );
}

function isLazyAgentState(obj: unknown): obj is LazyAgent['state'] {
  if (!isAgentState(obj)) return false;
  if (!isObject(obj)) return false;

  return (
    hasProperty(obj, 'emotionState') &&
    isEmotionState(obj.emotionState) &&
    hasProperty(obj, 'recentMemories') &&
    isArray(obj.recentMemories, isMemoryRecord)
  );
}

// Memory type guards
export function isMemoryRecord(obj: unknown): obj is MemoryRecord {
  if (!isObject(obj)) return false;

  return (
    hasProperty(obj, 'id') &&
    isString(obj.id) &&
    hasProperty(obj, 'agentId') &&
    isString(obj.agentId) &&
    hasProperty(obj, 'type') &&
    isEnum(obj.type, MemoryType) &&
    hasProperty(obj, 'content') &&
    isString(obj.content) &&
    hasProperty(obj, 'metadata') &&
    isObject(obj.metadata) &&
    hasProperty(obj, 'importance') &&
    isNumber(obj.importance) &&
    hasProperty(obj, 'timestamp') &&
    isDate(obj.timestamp) &&
    hasProperty(obj, 'tags') &&
    isArray(obj.tags, isString) &&
    hasProperty(obj, 'duration') &&
    isEnum(obj.duration, MemoryDuration)
  );
}

export function isMemoryProvider(obj: unknown): obj is Agent['memory'] {
  if (!isObject(obj)) return false;

  return (
    hasProperty(obj, 'store') &&
    typeof obj.store === 'function' &&
    hasProperty(obj, 'retrieve') &&
    typeof obj.retrieve === 'function' &&
    hasProperty(obj, 'search') &&
    typeof obj.search === 'function' &&
    hasProperty(obj, 'delete') &&
    typeof obj.delete === 'function' &&
    hasProperty(obj, 'clear') &&
    typeof obj.clear === 'function' &&
    hasProperty(obj, 'getRecent') &&
    typeof obj.getRecent === 'function'
  );
}

// Emotion type guards
export function isEmotionState(obj: unknown): obj is EmotionState {
  if (!isObject(obj)) return false;

  return (
    hasProperty(obj, 'current') &&
    isString(obj.current) &&
    hasProperty(obj, 'intensity') &&
    isNumber(obj.intensity) &&
    hasProperty(obj, 'triggers') &&
    isArray(obj.triggers, isString) &&
    hasProperty(obj, 'history') &&
    isArray(obj.history, isEmotionRecord) &&
    hasProperty(obj, 'timestamp') &&
    isDate(obj.timestamp)
  );
}

function isEmotionRecord(obj: unknown): obj is EmotionState['history'][0] {
  if (!isObject(obj)) return false;

  return (
    hasProperty(obj, 'emotion') &&
    isString(obj.emotion) &&
    hasProperty(obj, 'intensity') &&
    isNumber(obj.intensity) &&
    hasProperty(obj, 'timestamp') &&
    isDate(obj.timestamp) &&
    hasProperty(obj, 'triggers') &&
    isArray(obj.triggers, isString) &&
    hasProperty(obj, 'duration') &&
    isNumber(obj.duration)
  );
}

export function isEmotionModule(obj: unknown): obj is EmotionModule {
  if (!isObject(obj)) return false;

  return (
    hasProperty(obj, 'getState') &&
    typeof obj.getState === 'function' &&
    hasProperty(obj, 'processEvent') &&
    typeof obj.processEvent === 'function' &&
    hasProperty(obj, 'updateEmotion') &&
    typeof obj.updateEmotion === 'function' &&
    hasProperty(obj, 'decay') &&
    typeof obj.decay === 'function' &&
    hasProperty(obj, 'reset') &&
    typeof obj.reset === 'function'
  );
}

// Cognition type guards
export function isCognitionModule(obj: unknown): obj is CognitionModule {
  if (!isObject(obj)) return false;

  return (
    hasProperty(obj, 'think') &&
    typeof obj.think === 'function' &&
    hasProperty(obj, 'plan') &&
    typeof obj.plan === 'function' &&
    hasProperty(obj, 'decide') &&
    typeof obj.decide === 'function'
  );
}

export function isThoughtContext(obj: unknown): obj is ThoughtContext {
  if (!isObject(obj)) return false;

  return (
    hasProperty(obj, 'events') &&
    isArray(obj.events, isAgentEvent) &&
    hasProperty(obj, 'memories') &&
    isArray(obj.memories, isMemoryRecord) &&
    hasProperty(obj, 'currentState') &&
    isAgentState(obj.currentState) &&
    hasProperty(obj, 'environment') &&
    isEnvironmentState(obj.environment)
  );
}

export function isThoughtResult(obj: unknown): obj is ThoughtResult {
  if (!isObject(obj)) return false;

  return (
    hasProperty(obj, 'thoughts') &&
    isArray(obj.thoughts, isString) &&
    hasProperty(obj, 'emotions') &&
    isEmotionState(obj.emotions) &&
    hasProperty(obj, 'actions') &&
    isArray(obj.actions, isAgentAction) &&
    hasProperty(obj, 'memories') &&
    isArray(obj.memories, isMemoryRecord) &&
    hasProperty(obj, 'confidence') &&
    isNumber(obj.confidence)
  );
}

// Plan and Decision type guards
export function isPlan(obj: unknown): obj is Plan {
  if (!isObject(obj)) return false;

  return (
    hasProperty(obj, 'id') &&
    isString(obj.id) &&
    hasProperty(obj, 'goal') &&
    isString(obj.goal) &&
    hasProperty(obj, 'steps') &&
    isArray(obj.steps, isPlanStep) &&
    hasProperty(obj, 'priority') &&
    isNumber(obj.priority) &&
    hasProperty(obj, 'estimatedDuration') &&
    isNumber(obj.estimatedDuration) &&
    hasProperty(obj, 'dependencies') &&
    isArray(obj.dependencies, isString) &&
    hasProperty(obj, 'status') &&
    isEnum(obj.status, PlanStatus)
  );
}

export function isPlanStep(obj: unknown): obj is PlanStep {
  if (!isObject(obj)) return false;

  return (
    hasProperty(obj, 'id') &&
    isString(obj.id) &&
    hasProperty(obj, 'description') &&
    isString(obj.description) &&
    hasProperty(obj, 'action') &&
    isString(obj.action) &&
    hasProperty(obj, 'parameters') &&
    isActionParameters(obj.parameters) &&
    hasProperty(obj, 'preconditions') &&
    isArray(obj.preconditions, isString) &&
    hasProperty(obj, 'effects') &&
    isArray(obj.effects, isString) &&
    hasProperty(obj, 'status') &&
    isEnum(obj.status, PlanStepStatus)
  );
}

export function isDecision(obj: unknown): obj is Decision {
  if (!isObject(obj)) return false;

  return (
    hasProperty(obj, 'id') &&
    isString(obj.id) &&
    hasProperty(obj, 'description') &&
    isString(obj.description) &&
    hasProperty(obj, 'action') &&
    isAgentAction(obj.action) &&
    hasProperty(obj, 'confidence') &&
    isNumber(obj.confidence) &&
    hasProperty(obj, 'reasoning') &&
    isString(obj.reasoning) &&
    hasProperty(obj, 'rationale') &&
    isString(obj.rationale) &&
    hasProperty(obj, 'consequences') &&
    isArray(obj.consequences, isString)
  );
}

// Action type guards
export function isAgentAction(obj: unknown): obj is AgentAction {
  if (!isObject(obj)) return false;

  return (
    hasProperty(obj, 'id') &&
    isString(obj.id) &&
    hasProperty(obj, 'agentId') &&
    isString(obj.agentId) &&
    hasProperty(obj, 'type') &&
    isString(obj.type) &&
    hasProperty(obj, 'extension') &&
    isString(obj.extension) &&
    hasProperty(obj, 'action') &&
    isString(obj.action) &&
    hasProperty(obj, 'parameters') &&
    isActionParameters(obj.parameters) &&
    hasProperty(obj, 'timestamp') &&
    isDate(obj.timestamp) &&
    hasProperty(obj, 'status') &&
    isEnum(obj.status, ActionStatus)
  );
}

export function isActionParameters(obj: unknown): obj is ActionParameters {
  return isObject(obj);
}

export function isActionResult(obj: unknown): obj is ActionResult {
  if (!isObject(obj)) return false;

  return (
    hasProperty(obj, 'success') &&
    isBoolean(obj.success) &&
    hasProperty(obj, 'type') &&
    isEnum(obj.type, ActionResultType) &&
    (!hasProperty(obj, 'error') || isString(obj.error)) &&
    (!hasProperty(obj, 'duration') || isNumber(obj.duration)) &&
    (!hasProperty(obj, 'timestamp') || isDate(obj.timestamp))
  );
}

// Event type guards
export function isAgentEvent(obj: unknown): obj is AgentEvent {
  if (!isObject(obj)) return false;

  return (
    hasProperty(obj, 'id') &&
    isString(obj.id) &&
    hasProperty(obj, 'type') &&
    isString(obj.type) &&
    hasProperty(obj, 'source') &&
    isString(obj.source) &&
    hasProperty(obj, 'data') &&
    isObject(obj.data) &&
    hasProperty(obj, 'timestamp') &&
    isDate(obj.timestamp) &&
    hasProperty(obj, 'processed') &&
    isBoolean(obj.processed)
  );
}

// Extension type guards
export function isExtension(obj: unknown): obj is Extension {
  if (!isObject(obj)) return false;

  return (
    hasProperty(obj, 'id') &&
    isString(obj.id) &&
    hasProperty(obj, 'name') &&
    isString(obj.name) &&
    hasProperty(obj, 'version') &&
    isString(obj.version) &&
    hasProperty(obj, 'type') &&
    isEnum(obj.type, ExtensionType) &&
    hasProperty(obj, 'enabled') &&
    isBoolean(obj.enabled) &&
    hasProperty(obj, 'status') &&
    isEnum(obj.status, ExtensionStatus) &&
    hasProperty(obj, 'config') &&
    isObject(obj.config) &&
    hasProperty(obj, 'init') &&
    typeof obj.init === 'function' &&
    hasProperty(obj, 'tick') &&
    typeof obj.tick === 'function' &&
    hasProperty(obj, 'actions') &&
    isObject(obj.actions) &&
    hasProperty(obj, 'events') &&
    isObject(obj.events)
  );
}

export function isExtensionAction(obj: unknown): obj is ExtensionAction {
  if (!isObject(obj)) return false;

  return (
    hasProperty(obj, 'name') &&
    isString(obj.name) &&
    hasProperty(obj, 'description') &&
    isString(obj.description) &&
    hasProperty(obj, 'category') &&
    isEnum(obj.category, ActionCategory) &&
    hasProperty(obj, 'parameters') &&
    isActionParameters(obj.parameters) &&
    hasProperty(obj, 'execute') &&
    typeof obj.execute === 'function'
  );
}

// Portal type guards
export function isPortal(obj: unknown): obj is Portal {
  if (!isObject(obj)) return false;

  return (
    hasProperty(obj, 'generateResponse') &&
    typeof obj.generateResponse === 'function' &&
    hasProperty(obj, 'streamResponse') &&
    typeof obj.streamResponse === 'function'
  );
}

export function isPortalConfig(obj: unknown): obj is PortalConfig {
  if (!isObject(obj)) return false;

  return (
    hasProperty(obj, 'type') &&
    isEnum(obj.type, PortalType) &&
    hasProperty(obj, 'apiKey') &&
    isString(obj.apiKey) &&
    hasProperty(obj, 'model') &&
    isString(obj.model)
  );
}

// Context type guards
export function isUnifiedContext(obj: unknown): obj is UnifiedContext {
  if (!isObject(obj)) return false;

  return (
    hasProperty(obj, 'contextId') &&
    isString(obj.contextId) &&
    hasProperty(obj, 'agentId') &&
    isString(obj.agentId) &&
    hasProperty(obj, 'timestamp') &&
    isDate(obj.timestamp) &&
    hasProperty(obj, 'requestType') &&
    isString(obj.requestType) &&
    hasProperty(obj, 'ttl') &&
    isNumber(obj.ttl) &&
    hasProperty(obj, 'priority') &&
    isNumber(obj.priority) &&
    hasProperty(obj, 'metadata') &&
    isContextMetadata(obj.metadata)
  );
}

export function isContextMetadata(obj: unknown): obj is ContextMetadata {
  if (!isObject(obj)) return false;

  return (
    hasProperty(obj, 'source') &&
    isString(obj.source) &&
    hasProperty(obj, 'version') &&
    isString(obj.version) &&
    hasProperty(obj, 'lastUpdated') &&
    isDate(obj.lastUpdated) &&
    hasProperty(obj, 'updateCount') &&
    isNumber(obj.updateCount) &&
    hasProperty(obj, 'accessCount') &&
    isNumber(obj.accessCount) &&
    hasProperty(obj, 'tags') &&
    isArray(obj.tags, isString)
  );
}

// Message type guards
export function isMessage(obj: unknown): obj is Message {
  if (!isObject(obj)) return false;

  return (
    hasProperty(obj, 'id') &&
    isString(obj.id) &&
    hasProperty(obj, 'agentId') &&
    isString(obj.agentId) &&
    hasProperty(obj, 'content') &&
    isString(obj.content) &&
    hasProperty(obj, 'timestamp') &&
    isDate(obj.timestamp) &&
    hasProperty(obj, 'role') &&
    (obj.role === 'user' || obj.role === 'assistant' || obj.role === 'system')
  );
}

// Environment type guards
function isEnvironmentState(
  obj: unknown
): obj is ThoughtContext['environment'] {
  if (!isObject(obj)) return false;

  return (
    hasProperty(obj, 'type') &&
    isEnum(obj.type, EnvironmentType) &&
    hasProperty(obj, 'time') &&
    isDate(obj.time)
  );
}

// Utility function to validate and cast with type guard
export function assertType<T>(
  value: unknown,
  guard: (value: unknown) => value is T,
  errorMessage?: string
): T {
  if (!guard(value)) {
    throw new TypeError(errorMessage || 'Type assertion failed');
  }
  return value;
}

// Batch validation utility
export function validateBatch<T>(
  values: unknown[],
  guard: (value: unknown) => value is T
): { valid: T[]; invalid: unknown[] } {
  const valid: T[] = [];
  const invalid: unknown[] = [];

  for (const value of values) {
    if (guard(value)) {
      valid.push(value);
    } else {
      invalid.push(value);
    }
  }

  return { valid, invalid };
}
