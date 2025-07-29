/**
 * Optimized Event Bus Implementation
 * High-performance event bus with batching, indexing, and compression
 */

import { EventEmitter } from 'node:events';
import { AgentEvent, EventBus } from '../types/agent';
import { runtimeLogger } from '../utils/logger';

interface EventMetrics {
  totalEvents: number;
  eventsByType: Map<string, number>;
  errorCount: number;
  lastErrorTime?: Date;
  batchedEvents: number;
  compressionRatio: number;
}

interface BatchedEvent {
  events: AgentEvent[];
  timestamp: Date;
}

interface EventHandler {
  handler: (event: AgentEvent) => void;
  priority: number;
  filter?: (event: AgentEvent) => boolean;
}

interface EventSubscription {
  agentId: string;
  eventTypes: Set<string>;
  priority: number;
}

/**
 * Ring buffer for efficient event storage
 */
class RingBuffer<T> {
  private buffer: (T | undefined)[];
  private head = 0;
  private tail = 0;
  private size = 0;

  constructor(private capacity: number) {
    this.buffer = new Array(capacity);
  }

  push(item: T): void {
    this.buffer[this.tail] = item;
    this.tail = (this.tail + 1) % this.capacity;
    
    if (this.size < this.capacity) {
      this.size++;
    } else {
      this.head = (this.head + 1) % this.capacity;
    }
  }

  toArray(): T[] {
    const result: T[] = [];
    let current = this.head;
    
    for (let i = 0; i < this.size; i++) {
      const item = this.buffer[current];
      if (item !== undefined) {
        result.push(item);
      }
      current = (current + 1) % this.capacity;
    }
    
    return result;
  }

  clear(): void {
    this.buffer = new Array(this.capacity);
    this.head = 0;
    this.tail = 0;
    this.size = 0;
  }

  getSize(): number {
    return this.size;
  }
}

/**
 * Optimized event bus with performance enhancements
 */
export class OptimizedEventBus implements EventBus {
  private eventBuffer: RingBuffer<AgentEvent>;
  private indexedEvents: Map<string, Set<EventHandler>>;
  private subscriptions: Map<string, EventSubscription>;
  private emitter: EventEmitter;
  private metrics: EventMetrics;
  private compressionEnabled: boolean;
  
  // Batching configuration
  private batchQueue: AgentEvent[] = [];
  private batchTimer?: NodeJS.Timeout;
  private readonly batchSize = 100;
  private readonly batchDelay = 10; // ms
  
  // Performance optimizations
  private readonly maxEventSize = 10000;
  private readonly eventTypeCache = new Map<string, Set<string>>();
  private readonly priorityHandlers = new Map<string, EventHandler[]>();
  
  constructor(options?: {
    maxEvents?: number;
    compressionEnabled?: boolean;
    batchingEnabled?: boolean;
  }) {
    const config = {
      maxEvents: 10000,
      compressionEnabled: true,
      batchingEnabled: true,
      ...options
    };
    
    this.eventBuffer = new RingBuffer(config.maxEvents);
    this.indexedEvents = new Map();
    this.subscriptions = new Map();
    this.emitter = new EventEmitter();
    this.compressionEnabled = config.compressionEnabled;
    
    this.metrics = {
      totalEvents: 0,
      eventsByType: new Map(),
      errorCount: 0,
      batchedEvents: 0,
      compressionRatio: 1.0
    };
    
    // Configure EventEmitter for performance
    this.emitter.setMaxListeners(100);
    
    // Set up error handling
    this.emitter.on('error', this.handleError.bind(this));
    
    runtimeLogger.info('Optimized event bus initialized', {
      maxEvents: config.maxEvents,
      compressionEnabled: config.compressionEnabled,
      batchingEnabled: config.batchingEnabled
    });
  }
  
  /**
   * Emit event with batching support
   */
  emit(event: AgentEvent): void {
    try {
      // Add to batch queue
      this.batchQueue.push(event);
      
      // Process immediately if batch is full
      if (this.batchQueue.length >= this.batchSize) {
        this.processBatch();
      } else if (!this.batchTimer) {
        // Set timer for batch processing
        this.batchTimer = setTimeout(() => this.processBatch(), this.batchDelay);
      }
    } catch (error) {
      this.handleError(error as Error, event);
    }
  }
  
  /**
   * Publish events in batch for better performance
   */
  async publishBatch(events: AgentEvent[]): Promise<void> {
    const startTime = performance.now();
    
    try {
      // Store events in buffer
      for (const event of events) {
        this.eventBuffer.push(event);
        this.updateMetrics(event);
      }
      
      // Process events by type for better cache locality
      const eventsByType = this.groupEventsByType(events);
      
      for (const [eventType, typeEvents] of eventsByType) {
        // Get all handlers for this event type
        const handlers = this.getHandlersForType(eventType);
        
        // Execute handlers in priority order
        for (const handler of handlers) {
          for (const event of typeEvents) {
            try {
              if (!handler.filter || handler.filter(event)) {
                handler.handler(event);
              }
            } catch (error) {
              this.handleError(error as Error, event);
            }
          }
        }
      }
      
      // Update batch metrics
      this.metrics.batchedEvents += events.length;
      
      const duration = performance.now() - startTime;
      runtimeLogger.debug('Batch processed', {
        eventCount: events.length,
        duration,
        eventsPerMs: events.length / duration
      });
    } catch (error) {
      this.handleError(error as Error);
    }
  }
  
  /**
   * Register event listener with topic-based routing
   */
  on(eventType: string, handler: (event: AgentEvent) => void): void {
    this.subscribe(eventType, handler, { priority: 5 });
  }
  
  /**
   * Subscribe with advanced options
   */
  subscribe(
    topic: string,
    handler: (event: AgentEvent) => void,
    options?: {
      priority?: number;
      filter?: (event: AgentEvent) => boolean;
    }
  ): void {
    const eventHandler: EventHandler = {
      handler,
      priority: options?.priority ?? 5,
      filter: options?.filter
    };
    
    // Index by event type for fast lookup
    if (!this.indexedEvents.has(topic)) {
      this.indexedEvents.set(topic, new Set());
    }
    this.indexedEvents.get(topic)!.add(eventHandler);
    
    // Update priority handlers cache
    this.updatePriorityCache(topic);
    
    // Also register with EventEmitter for compatibility
    this.emitter.on(topic, handler);
    
    runtimeLogger.debug('Handler subscribed', {
      topic,
      priority: eventHandler.priority,
      hasFilter: !!eventHandler.filter
    });
  }
  
  /**
   * Register one-time event listener
   */
  once(eventType: string, handler: (event: AgentEvent) => void): void {
    const wrappedHandler = (event: AgentEvent) => {
      handler(event);
      this.off(eventType, wrappedHandler);
    };
    this.on(eventType, wrappedHandler);
  }
  
  /**
   * Remove event listener
   */
  off(eventType: string, handler: (event: AgentEvent) => void): void {
    const handlers = this.indexedEvents.get(eventType);
    if (handlers) {
      handlers.forEach(h => {
        if (h.handler === handler) {
          handlers.delete(h);
        }
      });
      
      if (handlers.size === 0) {
        this.indexedEvents.delete(eventType);
        this.priorityHandlers.delete(eventType);
      } else {
        this.updatePriorityCache(eventType);
      }
    }
    
    this.emitter.off(eventType, handler);
  }
  
  /**
   * Remove all listeners for an event type
   */
  removeAllListeners(eventType?: string): void {
    if (eventType) {
      this.indexedEvents.delete(eventType);
      this.priorityHandlers.delete(eventType);
      this.emitter.removeAllListeners(eventType);
    } else {
      this.indexedEvents.clear();
      this.priorityHandlers.clear();
      this.emitter.removeAllListeners();
    }
  }
  
  /**
   * Subscribe agent to specific event types
   */
  subscribe(agentId: string, eventTypes: string[]): void {
    const subscription: EventSubscription = {
      agentId,
      eventTypes: new Set(eventTypes),
      priority: 5
    };
    this.subscriptions.set(agentId, subscription);
    
    // Cache event types for this agent
    this.eventTypeCache.set(agentId, new Set(eventTypes));
  }
  
  /**
   * Unsubscribe agent from specific event types
   */
  unsubscribe(agentId: string, eventTypes: string[]): void {
    const subscription = this.subscriptions.get(agentId);
    if (subscription) {
      eventTypes.forEach(type => subscription.eventTypes.delete(type));
      
      if (subscription.eventTypes.size === 0) {
        this.subscriptions.delete(agentId);
        this.eventTypeCache.delete(agentId);
      } else {
        this.eventTypeCache.set(agentId, new Set(subscription.eventTypes));
      }
    }
  }
  
  /**
   * Get copy of all events (compressed if enabled)
   */
  getEvents(): AgentEvent[] {
    const events = this.eventBuffer.toArray();
    
    if (this.compressionEnabled && events.length > 1000) {
      // Return compressed summary for large event sets
      return this.compressEvents(events);
    }
    
    return events;
  }
  
  /**
   * Async publish method
   */
  async publish(event: AgentEvent): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.emit(event);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }
  
  /**
   * Clear all events
   */
  clearEvents(): void {
    this.eventBuffer.clear();
    this.batchQueue = [];
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = undefined;
    }
    runtimeLogger.debug('Event history cleared');
  }
  
  /**
   * Get metrics with performance stats
   */
  getMetrics(): EventMetrics & {
    subscriptions: number;
    listenerCount: number;
    memoryUsage: number;
    performance: {
      avgBatchSize: number;
      compressionRatio: number;
      indexedTypes: number;
    };
  } {
    const avgBatchSize = this.metrics.batchedEvents > 0
      ? this.metrics.batchedEvents / (this.metrics.totalEvents || 1)
      : 0;
      
    return {
      ...this.metrics,
      subscriptions: this.subscriptions.size,
      listenerCount: this.indexedEvents.size,
      memoryUsage: this.eventBuffer.getSize(),
      performance: {
        avgBatchSize,
        compressionRatio: this.metrics.compressionRatio,
        indexedTypes: this.indexedEvents.size
      }
    };
  }
  
  /**
   * Get listeners count for specific event type
   */
  listenerCount(eventType: string): number {
    return this.indexedEvents.get(eventType)?.size ?? 0;
  }
  
  /**
   * Get all event names that have listeners
   */
  eventNames(): (string | symbol)[] {
    return Array.from(this.indexedEvents.keys());
  }
  
  /**
   * Shutdown the event bus
   */
  shutdown(): void {
    try {
      // Clear batch timer
      if (this.batchTimer) {
        clearTimeout(this.batchTimer);
        this.batchTimer = undefined;
      }
      
      // Process any remaining batched events
      if (this.batchQueue.length > 0) {
        this.processBatch();
      }
      
      // Clear all data structures
      this.eventBuffer.clear();
      this.indexedEvents.clear();
      this.subscriptions.clear();
      this.eventTypeCache.clear();
      this.priorityHandlers.clear();
      this.emitter.removeAllListeners();
      
      // Reset metrics
      this.metrics = {
        totalEvents: 0,
        eventsByType: new Map(),
        errorCount: 0,
        batchedEvents: 0,
        compressionRatio: 1.0
      };
      
      runtimeLogger.info('Optimized event bus shutdown completed');
    } catch (error) {
      runtimeLogger.error('Error during event bus shutdown:', error as Error);
    }
  }
  
  // Private helper methods
  
  private processBatch(): void {
    if (this.batchQueue.length === 0) return;
    
    const events = [...this.batchQueue];
    this.batchQueue = [];
    
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = undefined;
    }
    
    // Process batch asynchronously to avoid blocking
    setImmediate(() => {
      this.publishBatch(events).catch(error => {
        runtimeLogger.error('Batch processing error:', error);
      });
    });
  }
  
  private groupEventsByType(events: AgentEvent[]): Map<string, AgentEvent[]> {
    const grouped = new Map<string, AgentEvent[]>();
    
    for (const event of events) {
      if (!grouped.has(event.type)) {
        grouped.set(event.type, []);
      }
      grouped.get(event.type)!.push(event);
    }
    
    return grouped;
  }
  
  private getHandlersForType(eventType: string): EventHandler[] {
    // Check cache first
    const cached = this.priorityHandlers.get(eventType);
    if (cached) return cached;
    
    // Get handlers and sort by priority
    const handlers = Array.from(this.indexedEvents.get(eventType) ?? []);
    handlers.sort((a, b) => b.priority - a.priority);
    
    // Cache sorted handlers
    this.priorityHandlers.set(eventType, handlers);
    
    return handlers;
  }
  
  private updatePriorityCache(eventType: string): void {
    const handlers = Array.from(this.indexedEvents.get(eventType) ?? []);
    handlers.sort((a, b) => b.priority - a.priority);
    this.priorityHandlers.set(eventType, handlers);
  }
  
  private updateMetrics(event: AgentEvent): void {
    this.metrics.totalEvents++;
    
    const currentCount = this.metrics.eventsByType.get(event.type) || 0;
    this.metrics.eventsByType.set(event.type, currentCount + 1);
  }
  
  private handleError(error: Error, event?: AgentEvent): void {
    this.metrics.errorCount++;
    this.metrics.lastErrorTime = new Date();
    
    runtimeLogger.error('Event bus error:', error, {
      metadata: {
        eventId: event?.id,
        eventType: event?.type,
        errorCount: this.metrics.errorCount
      }
    });
  }
  
  private compressEvents(events: AgentEvent[]): AgentEvent[] {
    // Group similar events and create summaries
    const compressed: AgentEvent[] = [];
    const typeGroups = this.groupEventsByType(events);
    
    for (const [type, typeEvents] of typeGroups) {
      if (typeEvents.length > 10) {
        // Create summary event for this type
        compressed.push({
          id: `summary_${type}_${Date.now()}`,
          type: `${type}_summary`,
          agentId: typeEvents[0].agentId,
          timestamp: new Date(),
          payload: {
            count: typeEvents.length,
            firstEvent: typeEvents[0].timestamp,
            lastEvent: typeEvents[typeEvents.length - 1].timestamp,
            sampleEvents: typeEvents.slice(0, 3)
          },
          metadata: {
            compressed: true,
            originalCount: typeEvents.length
          }
        });
      } else {
        compressed.push(...typeEvents);
      }
    }
    
    // Update compression ratio
    this.metrics.compressionRatio = compressed.length / events.length;
    
    return compressed;
  }
}

// Export factory function for consistency
export function createOptimizedEventBus(options?: {
  maxEvents?: number;
  compressionEnabled?: boolean;
  batchingEnabled?: boolean;
}): OptimizedEventBus {
  return new OptimizedEventBus(options);
}