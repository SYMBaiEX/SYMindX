/**
 * Core event types for SYMindX event system
 */

import { GenericData } from '../common.js';
import { Timestamp } from '../helpers.js';

/**
 * Generic event handler type with proper typing
 */
export type EventHandler<T = any> = (
  event: EventData<T>
) => void | Promise<void>;

/**
 * Event data structure with generic payload
 */
export interface EventData<T = any> {
  id: string;
  type: string;
  source: string;
  data: T;
  timestamp: Timestamp;
  metadata: EventMetadata;
}

/**
 * Event subscription interface
 */
export interface EventSubscription {
  id: string;
  handler: EventHandler;
  filter?: EventFilter;
  priority?: number;
  once?: boolean;
  active: boolean;
  createdAt: Timestamp;
  lastTriggered?: Timestamp;
  triggerCount: number;
}

/**
 * Event filter for selective subscription
 */
export interface EventFilter {
  types?: string[];
  sources?: string[];
  agentIds?: string[];
  tags?: string[];
  custom?: (event: EventData) => boolean;
}

/**
 * Event metadata interface
 */
export interface EventMetadata {
  timestamp: Timestamp;
  source: EventSourceInfo;
  correlation?: EventCorrelation;
  tags?: string[];
  priority?: EventPriority;
  ttl?: number; // Time to live in milliseconds
  retryCount?: number;
  propagation?: EventPropagation;
}

export interface EventSourceInfo {
  id: string;
  type: string;
  name?: string;
  version?: string;
  host?: string;
}

export interface EventCorrelation {
  id: string;
  parentId?: string;
  rootId?: string;
  sequence?: number;
  total?: number;
}

export enum EventPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3,
}

export interface EventPropagation {
  broadcast: boolean;
  targetAgents?: string[];
  excludeAgents?: string[];
  bubbles?: boolean;
  cancelable?: boolean;
}

/**
 * Event batch for bulk processing
 */
export interface EventBatch {
  id: string;
  events: EventData[];
  processedCount: number;
  failedCount: number;
  timestamp: Timestamp;
  duration?: number;
  errors?: EventProcessingError[];
}

export interface EventProcessingError {
  eventId: string;
  error: string;
  timestamp: Timestamp;
  retryable: boolean;
}

/**
 * Event bus statistics
 */
export interface EventBusStats {
  totalEvents: number;
  processedEvents: number;
  failedEvents: number;
  activeSubscriptions: number;
  eventRate: number; // Events per second
  averageLatency: number; // Milliseconds
  queueSize: number;
  lastEventTime?: Timestamp;
}

/**
 * Event store interface for persistence
 */
export interface EventStore {
  save(event: EventData): Promise<void>;
  saveBatch(events: EventData[]): Promise<void>;
  get(eventId: string): Promise<EventData | null>;
  query(filter: EventQueryFilter): Promise<EventData[]>;
  delete(eventId: string): Promise<void>;
  cleanup(olderThan: Timestamp): Promise<number>;
}

export interface EventQueryFilter {
  startTime?: Timestamp;
  endTime?: Timestamp;
  types?: string[];
  sources?: string[];
  limit?: number;
  offset?: number;
  orderBy?: 'timestamp' | 'type' | 'source';
  order?: 'asc' | 'desc';
}

/**
 * Event replay functionality
 */
export interface EventReplay {
  replayEvent(eventId: string): Promise<void>;
  replayRange(startTime: Timestamp, endTime: Timestamp): Promise<void>;
  replayFilter(filter: EventQueryFilter): Promise<void>;
  pauseReplay(): void;
  resumeReplay(): void;
  stopReplay(): void;
  getReplayStatus(): ReplayStatus;
}

export interface ReplayStatus {
  active: boolean;
  paused: boolean;
  eventsReplayed: number;
  totalEvents: number;
  startTime?: Timestamp;
  currentTime?: Timestamp;
  endTime?: Timestamp;
}

/**
 * Event transformation and middleware
 */
export type EventTransformer<TIn = any, TOut = any> = (
  event: EventData<TIn>
) => EventData<TOut> | null | Promise<EventData<TOut> | null>;

export interface EventMiddleware {
  name: string;
  order: number;
  enabled: boolean;
  transform: EventTransformer;
  filter?: EventFilter;
}

/**
 * Event bus configuration
 */
export interface EventBusConfig {
  maxQueueSize?: number;
  maxRetries?: number;
  retryDelay?: number;
  enablePersistence?: boolean;
  enableMetrics?: boolean;
  enableReplay?: boolean;
  cleanupInterval?: number;
  cleanupAge?: number;
}

/**
 * Event emitter options
 */
export interface EventEmitOptions {
  async?: boolean;
  priority?: EventPriority;
  ttl?: number;
  correlation?: EventCorrelation;
  broadcast?: boolean;
  targetAgents?: string[];
  excludeAgents?: string[];
}

/**
 * Type-safe event emitter interface
 */
export interface TypedEventEmitter<TEventMap extends Record<string, any>> {
  emit<K extends keyof TEventMap>(
    type: K,
    data: TEventMap[K],
    options?: EventEmitOptions
  ): void;

  on<K extends keyof TEventMap>(
    type: K,
    handler: EventHandler<TEventMap[K]>
  ): EventSubscription;

  off(subscriptionId: string): void;

  once<K extends keyof TEventMap>(
    type: K,
    handler: EventHandler<TEventMap[K]>
  ): EventSubscription;
}

/**
 * Event aggregation for analytics
 */
export interface EventAggregation {
  type: string;
  count: number;
  firstSeen: Timestamp;
  lastSeen: Timestamp;
  sources: string[];
  averageDataSize: number;
  totalDataSize: number;
}

/**
 * Event stream interface
 */
export interface EventStream {
  subscribe(
    filter?: EventFilter,
    handler?: EventHandler
  ): AsyncIterableIterator<EventData>;

  pipe<T>(transformer: EventTransformer): EventStream;

  filter(predicate: (event: EventData) => boolean): EventStream;

  map<T>(mapper: (event: EventData) => T): AsyncIterableIterator<T>;

  take(count: number): EventStream;

  skip(count: number): EventStream;

  buffer(size: number, timeWindow?: number): AsyncIterableIterator<EventData[]>;
}
