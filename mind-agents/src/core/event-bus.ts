/**
 * Enhanced Event Bus Implementation
 * Built on Node.js EventEmitter with proper error handling and performance optimizations
 */

import { EventEmitter } from 'node:events';

import { AgentEvent, EventBus } from '../types/agent';
import { runtimeLogger } from '../utils/logger';

interface EventMetrics {
  totalEvents: number;
  eventsByType: Map<string, number>;
  errorCount: number;
  lastErrorTime?: Date;
}

export class SimpleEventBus implements EventBus {
  private events: AgentEvent[] = [];
  private subscriptions: Map<string, Set<string>> = new Map();
  private emitter: EventEmitter;
  private metrics: EventMetrics;
  private maxEvents: number = 1000; // Prevent memory leaks
  private errorHandler: (error: Error, event?: AgentEvent) => void;

  constructor() {
    this.emitter = new EventEmitter();
    this.metrics = {
      totalEvents: 0,
      eventsByType: new Map(),
      errorCount: 0,
    };

    // Set appropriate max listeners to prevent warnings
    this.emitter.setMaxListeners(50);

    // Set up error handling
    this.errorHandler = this.createErrorHandler();
    this.emitter.on('error', this.errorHandler);

    // Set up cleanup to prevent memory leaks
    this.setupCleanup();

    runtimeLogger.info(
      'Event bus initialized with enhanced Node.js EventEmitter'
    );
  }

  /**
   * Emit an event to all listeners
   */
  emit(event: AgentEvent): void {
    try {
      // Store event (with rotation to prevent memory leaks)
      this.addEventToHistory(event);

      // Update metrics
      this.updateMetrics(event);

      // Emit to specific event type listeners
      const hasListeners = this.emitter.emit(event.type, event);

      // Emit to global listeners (catch-all)
      this.emitter.emit('*', event);

      // Log if no listeners were found for specific event types (helps with debugging)
      if (!hasListeners && event.type !== 'system.heartbeat') {
        runtimeLogger.debug(`No listeners for event type: ${event.type}`, {
          metadata: { eventId: event.id, eventType: event.type },
        });
      }
    } catch (error) {
      this.handleEventError(error as Error, event);
    }
  }

  /**
   * Register event listener
   */
  on(eventType: string, handler: (event: AgentEvent) => void): void {
    try {
      // Wrap handler with error boundary
      const wrappedHandler = this.wrapHandler(handler, eventType);
      this.emitter.on(eventType, wrappedHandler);

      runtimeLogger.debug(`Registered listener for event type: ${eventType}`);
    } catch (error) {
      this.handleEventError(error as Error);
    }
  }

  /**
   * Register one-time event listener
   */
  once(eventType: string, handler: (event: AgentEvent) => void): void {
    try {
      const wrappedHandler = this.wrapHandler(handler, eventType);
      this.emitter.once(eventType, wrappedHandler);

      runtimeLogger.debug(
        `Registered one-time listener for event type: ${eventType}`
      );
    } catch (error) {
      this.handleEventError(error as Error);
    }
  }

  /**
   * Remove event listener
   */
  off(eventType: string, handler: (event: AgentEvent) => void): void {
    try {
      this.emitter.off(eventType, handler);
      runtimeLogger.debug(`Removed listener for event type: ${eventType}`);
    } catch (error) {
      this.handleEventError(error as Error);
    }
  }

  /**
   * Remove all listeners for an event type
   */
  removeAllListeners(eventType?: string): void {
    try {
      this.emitter.removeAllListeners(eventType);
      runtimeLogger.debug(
        `Removed all listeners for event type: ${eventType || 'all'}`
      );
    } catch (error) {
      this.handleEventError(error as Error);
    }
  }

  /**
   * Subscribe agent to specific event types
   */
  subscribe(agentId: string, eventTypes: string[]): void {
    if (!this.subscriptions.has(agentId)) {
      this.subscriptions.set(agentId, new Set());
    }
    const agentSubs = this.subscriptions.get(agentId)!;

    eventTypes.forEach((type) => {
      agentSubs.add(type);
    });

    runtimeLogger.debug(
      `Agent ${agentId} subscribed to ${eventTypes.length} event types`
    );
  }

  /**
   * Unsubscribe agent from specific event types
   */
  unsubscribe(agentId: string, eventTypes: string[]): void {
    const agentSubs = this.subscriptions.get(agentId);
    if (agentSubs) {
      eventTypes.forEach((type) => agentSubs.delete(type));

      if (agentSubs.size === 0) {
        this.subscriptions.delete(agentId);
      }

      runtimeLogger.debug(
        `Agent ${agentId} unsubscribed from ${eventTypes.length} event types`
      );
    }
  }

  /**
   * Get copy of all events (thread-safe)
   */
  getEvents(): AgentEvent[] {
    return [...this.events];
  }

  /**
   * Async publish method for runtime compatibility
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
   * Clear all events from history
   */
  clearEvents(): void {
    this.events = [];
    runtimeLogger.debug('Event history cleared');
  }

  /**
   * Get event bus metrics and health status
   */
  getMetrics(): EventMetrics & {
    subscriptions: number;
    listenerCount: number;
    memoryUsage: number;
  } {
    return {
      ...this.metrics,
      subscriptions: this.subscriptions.size,
      listenerCount:
        this.emitter.listenerCount('*') + this.getTotalListenerCount(),
      memoryUsage: this.events.length,
    };
  }

  /**
   * Get listeners count for specific event type
   */
  listenerCount(eventType: string): number {
    return this.emitter.listenerCount(eventType);
  }

  /**
   * Get all event names that have listeners
   */
  eventNames(): (string | symbol)[] {
    return this.emitter.eventNames();
  }

  /**
   * Cleanup and shutdown the event bus
   */
  shutdown(): void {
    try {
      // Remove all listeners
      this.emitter.removeAllListeners();

      // Clear subscriptions
      this.subscriptions.clear();

      // Clear event history
      this.clearEvents();

      // Reset metrics
      this.metrics = {
        totalEvents: 0,
        eventsByType: new Map(),
        errorCount: 0,
      };

      runtimeLogger.info('Event bus shutdown completed');
    } catch (error) {
      runtimeLogger.error('Error during event bus shutdown:', error as Error);
    }
  }

  // Private helper methods

  private addEventToHistory(event: AgentEvent): void {
    this.events.push(event);

    // Rotate events to prevent memory leaks
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }
  }

  private updateMetrics(event: AgentEvent): void {
    this.metrics.totalEvents++;

    const currentCount = this.metrics.eventsByType.get(event.type) || 0;
    this.metrics.eventsByType.set(event.type, currentCount + 1);
  }

  private wrapHandler(
    handler: (event: AgentEvent) => void,
    eventType: string
  ): (event: AgentEvent) => void {
    return (event: AgentEvent) => {
      try {
        handler(event);
      } catch (error) {
        this.handleEventError(error as Error, event);
        runtimeLogger.error(
          `Event handler error for type ${eventType}:`,
          error as Error
        );
      }
    };
  }

  private createErrorHandler(): (error: Error, event?: AgentEvent) => void {
    return (error: Error, event?: AgentEvent) => {
      this.metrics.errorCount++;
      this.metrics.lastErrorTime = new Date();

      runtimeLogger.error('Event bus error:', error, {
        metadata: {
          eventId: event?.id,
          eventType: event?.type,
          errorCount: this.metrics.errorCount,
        },
      });
    };
  }

  private handleEventError(error: Error, event?: AgentEvent): void {
    this.errorHandler(error, event);
  }

  private getTotalListenerCount(): number {
    return this.emitter
      .eventNames()
      .reduce(
        (count, eventName) => count + this.emitter.listenerCount(eventName),
        0
      );
  }

  private setupCleanup(): void {
    // Cleanup old events periodically
    const cleanupInterval = setInterval(
      () => {
        const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24 hours
        const initialLength = this.events.length;

        this.events = this.events.filter((event) => {
          const isRecent = event.timestamp.getTime() > cutoff;
          const isContextValid = !event.context?.expires_at || event.context.expires_at.getTime() > Date.now();
          return isRecent && isContextValid;
        });

        if (this.events.length < initialLength) {
          runtimeLogger.debug(
            `Cleaned up ${initialLength - this.events.length} old events and expired contexts`
          );
        }
      },
      60 * 60 * 1000
    ); // Every hour

    // Store cleanup interval for shutdown
    (this as any).cleanupInterval = cleanupInterval;
  }

  // New private methods for context support

  private processEventContext(event: AgentEvent, context?: EventContext): AgentEvent {
    const rule = this.getPropagationRule(event.type);
    let processedContext = context;

    if (rule.propagate && context) {
      // Check propagation depth
      const currentDepth = context.propagation_depth || 0;
      if (currentDepth >= (rule.max_depth || 10)) {
        runtimeLogger.warn(`Event context propagation depth exceeded for ${event.type}`, {
          metadata: { eventId: event.id, depth: currentDepth, maxDepth: rule.max_depth }
        });
        processedContext = undefined;
      } else {
        // Increment depth and set expiration if needed
        processedContext = {
          ...context,
          propagation_depth: currentDepth + 1,
          expires_at: context.expires_at || (rule.ttl_seconds ? 
            new Date(Date.now() + rule.ttl_seconds * 1000) : undefined
          )
        };
      }
    }

    return {
      ...event,
      context: processedContext
    };
  }

  private emitToContextListeners(event: AgentEvent): void {
    for (const [agentId, subscription] of this.contextSubscriptions) {
      if (subscription.eventTypes.has(event.type) || subscription.eventTypes.has('*')) {
        if (!subscription.filter || this.matchesContextFilter(event, subscription.filter)) {
          // Emit specifically to this agent's context-aware handlers
          this.emitter.emit(`context:${agentId}:${event.type}`, event, event.context);
        }
      }
    }
  }

  private matchesContextFilter(event: AgentEvent, filter: EventContextFilter): boolean {
    const context = event.context;
    if (!context) return !filter.correlation_id && !filter.chain_id && !filter.origin_agent_id;

    if (filter.correlation_id && context.correlation_id !== filter.correlation_id) {
      return false;
    }

    if (filter.chain_id && context.chain_id !== filter.chain_id) {
      return false;
    }

    if (filter.origin_agent_id && context.origin_agent_id !== filter.origin_agent_id) {
      return false;
    }

    if (filter.priority_min !== undefined && (context.priority || 0) < filter.priority_min) {
      return false;
    }

    if (filter.priority_max !== undefined && (context.priority || 0) > filter.priority_max) {
      return false;
    }

    if (filter.max_depth !== undefined && (context.propagation_depth || 0) > filter.max_depth) {
      return false;
    }

    if (filter.tags && filter.tags.length > 0) {
      const contextTags = context.tags || [];
      if (!filter.tags.some(tag => contextTags.includes(tag))) {
        return false;
      }
    }

    if (!filter.include_expired && context.expires_at && context.expires_at.getTime() < Date.now()) {
      return false;
    }

    return true;
  }
}

// Export context-related helper functions for backward compatibility
export function createEventContext(options: Partial<EventContext> = {}): EventContext {
  return {
    correlation_id: options.correlation_id || `ctx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date(),
    propagation_depth: 0,
    ...options
  };
}

export function createEventWithContext(event: Omit<AgentEvent, 'context'>, context?: EventContext): AgentEvent {
  return {
    ...event,
    context
  };
}

// Export alias for backward compatibility
export { SimpleEventBus as EnhancedEventBus };
