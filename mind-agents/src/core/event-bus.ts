/**
 * Simple Event Bus Implementation
 * 
 * Standard Node.js EventEmitter with basic event rotation and metrics.
 * Removes complex L1/L2/L3 caching and context propagation.
 */

import { EventEmitter } from 'node:events';
import { AgentEvent, EventBus, EventContext, EventContextFilter } from '../types/agent';
import { runtimeLogger } from '../utils/logger';

export interface EventMetrics {
  totalEvents: number;
  eventsByType: Map<string, number>;
  errorCount: number;
  lastErrorTime?: Date;
}

export class SimpleEventBus implements EventBus {
  private emitter: EventEmitter;
  private eventHistory: AgentEvent[] = [];
  private metrics: EventMetrics;
  private readonly maxHistorySize = 1000;
  private cleanupInterval?: NodeJS.Timeout;

  constructor() {
    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(50); // Reasonable limit
    
    this.metrics = {
      totalEvents: 0,
      eventsByType: new Map(),
      errorCount: 0,
    };

    // Set up error handling
    this.emitter.on('error', this.handleError.bind(this));
    
    // Set up periodic cleanup
    this.setupCleanup();

    runtimeLogger.debug('Simple event bus initialized');
  }

  /**
   * Emit an event to all listeners
   */
  emit(event: AgentEvent): void {
    try {
      // Add to history with rotation
      this.addToHistory(event);
      
      // Update metrics
      this.updateMetrics(event);
      
      // Emit to specific event type listeners
      this.emitter.emit(event.type, event);
      
      // Emit to wildcard listeners
      this.emitter.emit('*', event);
      
    } catch (error) {
      this.handleError(error as Error, event);
    }
  }

  /**
   * Register event listener
   */
  on(eventType: string, handler: (event: AgentEvent) => void): void {
    const wrappedHandler = this.wrapHandler(handler, eventType);
    this.emitter.on(eventType, wrappedHandler);
    runtimeLogger.debug(`Registered listener for: ${eventType}`);
  }

  /**
   * Register one-time event listener
   */
  once(eventType: string, handler: (event: AgentEvent) => void): void {
    const wrappedHandler = this.wrapHandler(handler, eventType);
    this.emitter.once(eventType, wrappedHandler);
    runtimeLogger.debug(`Registered one-time listener for: ${eventType}`);
  }

  /**
   * Remove event listener
   */
  off(eventType: string, handler: (event: AgentEvent) => void): void {
    this.emitter.off(eventType, handler);
    runtimeLogger.debug(`Removed listener for: ${eventType}`);
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
      this.handleError(error as Error);
    }
  }

  /**
   * Subscribe agent to specific event types (simplified)
   */
  subscribe(agentId: string, eventTypes: string[]): void {
    // Simple subscription - just register listeners with agent prefix
    eventTypes.forEach(eventType => {
      this.emitter.on(`${agentId}:${eventType}`, (event: AgentEvent) => {
        runtimeLogger.debug(`Agent ${agentId} received event: ${eventType}`);
      });
    });
    
    runtimeLogger.debug(`Agent ${agentId} subscribed to ${eventTypes.length} event types`);
  }

  /**
   * Unsubscribe agent from specific event types
   */
  unsubscribe(agentId: string, eventTypes: string[]): void {
    eventTypes.forEach(eventType => {
      this.emitter.removeAllListeners(`${agentId}:${eventType}`);
    });
    
    runtimeLogger.debug(`Agent ${agentId} unsubscribed from ${eventTypes.length} event types`);
  }

  /**
   * Get copy of event history
   */
  getEvents(): AgentEvent[] {
    return [...this.eventHistory];
  }

  /**
   * Publish method for compatibility (sync version)
   */
  publish(event: AgentEvent): void {
    this.emit(event);
  }

  /**
   * Clear event history
   */
  clearEvents(): void {
    this.eventHistory = [];
    runtimeLogger.debug('Event history cleared');
  }

  /**
   * Get event bus metrics
   */
  getMetrics(): EventMetrics & {
    historySize: number;
    listenerCount: number;
  } {
    return {
      ...this.metrics,
      historySize: this.eventHistory.length,
      listenerCount: this.getTotalListenerCount(),
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
   * Emit event with context (simplified - context is ignored for now)
   */
  emitWithContext(event: AgentEvent, context: EventContext): void {
    // For simplicity, just emit the event normally
    // Context propagation was part of the complex system we're removing
    this.emit(event);
  }

  /**
   * Register event listener with context (simplified)
   */
  onWithContext(
    eventType: string,
    handler: (event: AgentEvent, context?: EventContext) => void
  ): void {
    // Simplified - just call handler without context
    this.on(eventType, (event) => handler(event));
  }

  /**
   * Subscribe with filter (simplified - filter is ignored)
   */
  subscribeWithFilter(
    agentId: string,
    eventTypes: string[],
    filter?: EventContextFilter
  ): void {
    // Simplified - just use regular subscribe
    this.subscribe(agentId, eventTypes);
  }

  /**
   * Get events with context filter (simplified - filter is ignored)
   */
  getEventsWithContext(filter?: EventContextFilter): AgentEvent[] {
    // Simplified - just return all events
    return this.getEvents();
  }

  /**
   * Shutdown the event bus
   */
  shutdown(): void {
    try {
      // Clear cleanup interval
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
        this.cleanupInterval = undefined;
      }

      // Remove all listeners
      this.emitter.removeAllListeners();
      
      // Clear history
      this.eventHistory = [];
      
      // Reset metrics
      this.metrics = {
        totalEvents: 0,
        eventsByType: new Map(),
        errorCount: 0,
      };

      runtimeLogger.debug('Simple event bus shutdown completed');
    } catch (error) {
      runtimeLogger.error('Error during event bus shutdown:', error);
    }
  }

  // Private helper methods

  private addToHistory(event: AgentEvent): void {
    this.eventHistory.push(event);
    
    // Rotate history to prevent memory leaks
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
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
        this.handleError(error as Error, event);
        runtimeLogger.error(`Handler error for ${eventType}:`, error);
      }
    };
  }

  private handleError(error: Error, event?: AgentEvent): void {
    this.metrics.errorCount++;
    this.metrics.lastErrorTime = new Date();
    
    runtimeLogger.error('Event bus error:', error, {
      metadata: {
        eventId: event?.id,
        eventType: event?.type,
        errorCount: this.metrics.errorCount,
      },
    });
  }

  private getTotalListenerCount(): number {
    return this.emitter.eventNames()
      .reduce((count, eventName) => count + this.emitter.listenerCount(eventName), 0);
  }

  private setupCleanup(): void {
    // Clean up old events every hour
    this.cleanupInterval = setInterval(() => {
      const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
      const initialLength = this.eventHistory.length;
      
      this.eventHistory = this.eventHistory.filter(event => 
        event.timestamp.getTime() > cutoff
      );
      
      if (this.eventHistory.length < initialLength) {
        runtimeLogger.debug(
          `Cleaned up ${initialLength - this.eventHistory.length} old events`
        );
      }
    }, 60 * 60 * 1000); // Every hour
  }
}

// Export factory function for consistency
export function createSimpleEventBus(): SimpleEventBus {
  return new SimpleEventBus();
}
