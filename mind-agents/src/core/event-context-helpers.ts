/**
 * Event Context Helpers
 * Utility functions for event context propagation, filtering, and migration
 */

import { AgentEvent, EventContext, EventContextFilter, EventPropagationRule } from '../types/agent.js';
import { runtimeLogger } from '../utils/logger.js';

/**
 * Create a new event context with optional parameters
 */
export function createEventContext(options: Partial<EventContext> = {}): EventContext {
  return {
    correlation_id: options.correlation_id || generateCorrelationId(),
    timestamp: new Date(),
    propagation_depth: 0,
    ...options
  };
}

/**
 * Create an event with context
 */
export function createEventWithContext(
  event: Omit<AgentEvent, 'context'>, 
  context?: EventContext
): AgentEvent {
  return {
    ...event,
    context
  };
}

/**
 * Generate a unique correlation ID
 */
export function generateCorrelationId(): string {
  return `ctx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate a unique chain ID for event chains
 */
export function generateChainId(): string {
  return `chain_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a child context from a parent context
 */
export function createChildContext(
  parentContext: EventContext,
  options: Partial<EventContext> = {}
): EventContext {
  return {
    ...parentContext,
    parent_event_id: options.parent_event_id,
    propagation_depth: (parentContext.propagation_depth || 0) + 1,
    timestamp: new Date(),
    ...options
  };
}

/**
 * Merge two event contexts using specified strategy
 */
export function mergeEventContexts(
  context1: EventContext,
  context2: EventContext,
  strategy: 'replace' | 'merge' | 'preserve' = 'merge'
): EventContext {
  switch (strategy) {
    case 'replace':
      return context2;
    case 'preserve':
      return context1;
    case 'merge':
    default:
      return {
        ...context1,
        ...context2,
        // Special handling for arrays and objects
        tags: [...(context1.tags || []), ...(context2.tags || [])].filter((tag, index, arr) => arr.indexOf(tag) === index),
        metadata: { ...context1.metadata, ...context2.metadata },
        // Keep the deeper propagation depth
        propagation_depth: Math.max(context1.propagation_depth || 0, context2.propagation_depth || 0),
        // Use the newer timestamp
        timestamp: context2.timestamp || context1.timestamp
      };
  }
}

/**
 * Check if an event context matches a filter
 */
export function matchesContextFilter(event: AgentEvent, filter: EventContextFilter): boolean {
  const context = event.context;
  if (!context) {
    // If no context, only match if filter doesn't specify context requirements
    return !filter.correlation_id && !filter.chain_id && !filter.origin_agent_id;
  }

  // Check correlation ID
  if (filter.correlation_id && context.correlation_id !== filter.correlation_id) {
    return false;
  }

  // Check chain ID
  if (filter.chain_id && context.chain_id !== filter.chain_id) {
    return false;
  }

  // Check origin agent ID
  if (filter.origin_agent_id && context.origin_agent_id !== filter.origin_agent_id) {
    return false;
  }

  // Check priority range
  if (filter.priority_min !== undefined && (context.priority || 0) < filter.priority_min) {
    return false;
  }

  if (filter.priority_max !== undefined && (context.priority || 0) > filter.priority_max) {
    return false;
  }

  // Check propagation depth
  if (filter.max_depth !== undefined && (context.propagation_depth || 0) > filter.max_depth) {
    return false;
  }

  // Check tags
  if (filter.tags && filter.tags.length > 0) {
    const contextTags = context.tags || [];
    if (!filter.tags.some(tag => contextTags.includes(tag))) {
      return false;
    }
  }

  // Check expiration
  if (!filter.include_expired && context.expires_at && context.expires_at.getTime() < Date.now()) {
    return false;
  }

  return true;
}

/**
 * Filter events by context criteria
 */
export function filterEventsByContext(events: AgentEvent[], filter: EventContextFilter): AgentEvent[] {
  return events.filter(event => matchesContextFilter(event, filter));
}

/**
 * Validate event context for correctness
 */
export function validateEventContext(context: EventContext): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check propagation depth
  if (context.propagation_depth !== undefined && context.propagation_depth < 0) {
    errors.push('Propagation depth cannot be negative');
  }

  if (context.propagation_depth !== undefined && context.propagation_depth > 100) {
    errors.push('Propagation depth exceeds maximum (100)');
  }

  // Check timestamp validity
  if (context.timestamp && isNaN(context.timestamp.getTime())) {
    errors.push('Invalid timestamp');
  }

  // Check expiration timestamp
  if (context.expires_at && isNaN(context.expires_at.getTime())) {
    errors.push('Invalid expiration timestamp');
  }

  if (context.expires_at && context.timestamp && context.expires_at.getTime() < context.timestamp.getTime()) {
    errors.push('Expiration time cannot be before creation time');
  }

  // Check priority range
  if (context.priority !== undefined && (context.priority < 0 || context.priority > 100)) {
    errors.push('Priority must be between 0 and 100');
  }

  // Check ID formats
  if (context.correlation_id && typeof context.correlation_id !== 'string') {
    errors.push('Correlation ID must be a string');
  }

  if (context.chain_id && typeof context.chain_id !== 'string') {
    errors.push('Chain ID must be a string');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Clean expired contexts from events
 */
export function cleanExpiredContexts(events: AgentEvent[]): AgentEvent[] {
  const now = Date.now();
  return events.map(event => {
    if (event.context?.expires_at && event.context.expires_at.getTime() < now) {
      runtimeLogger.debug(`Cleaning expired context from event ${event.id}`, {
        metadata: { eventId: event.id, expiredAt: event.context.expires_at }
      });
      // Return event without context
      const { context, ...eventWithoutContext } = event;
      return eventWithoutContext as AgentEvent;
    }
    return event;
  });
}

/**
 * Create a context filter builder for easier filter construction
 */
export class EventContextFilterBuilder {
  private filter: EventContextFilter = {};

  correlationId(id: string): this {
    this.filter.correlation_id = id;
    return this;
  }

  chainId(id: string): this {
    this.filter.chain_id = id;
    return this;
  }

  originAgent(agentId: string): this {
    this.filter.origin_agent_id = agentId;
    return this;
  }

  priorityRange(min?: number, max?: number): this {
    if (min !== undefined) this.filter.priority_min = min;
    if (max !== undefined) this.filter.priority_max = max;
    return this;
  }

  maxDepth(depth: number): this {
    this.filter.max_depth = depth;
    return this;
  }

  withTags(tags: string[]): this {
    this.filter.tags = tags;
    return this;
  }

  includeExpired(include: boolean = true): this {
    this.filter.include_expired = include;
    return this;
  }

  build(): EventContextFilter {
    return { ...this.filter };
  }
}

/**
 * Create propagation rule builder for easier rule construction
 */
export class EventPropagationRuleBuilder {
  private rule: EventPropagationRule = {
    event_types: [],
    propagate: true,
    inherit_context: true,
    merge_strategy: 'merge'
  };

  forEventTypes(types: string[]): this {
    this.rule.event_types = types;
    return this;
  }

  propagate(enable: boolean): this {
    this.rule.propagate = enable;
    return this;
  }

  inheritContext(enable: boolean): this {
    this.rule.inherit_context = enable;
    return this;
  }

  mergeStrategy(strategy: 'replace' | 'merge' | 'preserve'): this {
    this.rule.merge_strategy = strategy;
    return this;
  }

  maxDepth(depth: number): this {
    this.rule.max_depth = depth;
    return this;
  }

  ttl(seconds: number): this {
    this.rule.ttl_seconds = seconds;
    return this;
  }

  requiredTags(tags: string[]): this {
    this.rule.required_tags = tags;
    return this;
  }

  excludedTags(tags: string[]): this {
    this.rule.excluded_tags = tags;
    return this;
  }

  build(): EventPropagationRule {
    return { ...this.rule };
  }
}

/**
 * Migration helpers for existing event handlers
 */
export class EventMigrationHelper {
  /**
   * Wrap existing event handler to be context-aware
   */
  static wrapLegacyHandler(
    handler: (event: AgentEvent) => void
  ): (event: AgentEvent, context?: EventContext) => void {
    return (event: AgentEvent, context?: EventContext) => {
      // Call original handler with just the event
      handler(event);
      
      // Log context information if available
      if (context) {
        runtimeLogger.debug(`Legacy handler received context`, {
          metadata: { 
            eventId: event.id, 
            correlationId: context.correlation_id,
            depth: context.propagation_depth 
          }
        });
      }
    };
  }

  /**
   * Convert legacy events to context-aware events
   */
  static addContextToLegacyEvent(
    event: AgentEvent,
    options: Partial<EventContext> = {}
  ): AgentEvent {
    if (event.context) {
      // Already has context, merge with options
      return {
        ...event,
        context: mergeEventContexts(event.context, createEventContext(options))
      };
    }

    // Add new context
    return {
      ...event,
      context: createEventContext({
        origin_agent_id: event.agentId,
        ...options
      })
    };
  }

  /**
   * Batch convert multiple events
   */
  static convertLegacyEvents(
    events: AgentEvent[],
    contextOptions: Partial<EventContext> = {}
  ): AgentEvent[] {
    return events.map(event => this.addContextToLegacyEvent(event, contextOptions));
  }
}

/**
 * Default propagation rules for common event types
 */
export const DEFAULT_PROPAGATION_RULES: Record<string, EventPropagationRule> = {
  'user_input': {
    event_types: ['user_input'],
    propagate: true,
    inherit_context: false, // Start new context chain
    merge_strategy: 'replace',
    max_depth: 5,
    ttl_seconds: 300 // 5 minutes
  },
  'system_message': {
    event_types: ['system_message'],
    propagate: true,
    inherit_context: true,
    merge_strategy: 'merge',
    max_depth: 10,
    ttl_seconds: 3600 // 1 hour
  },
  'agent_action': {
    event_types: ['agent_action'],
    propagate: true,
    inherit_context: true,
    merge_strategy: 'merge',
    max_depth: 15,
    ttl_seconds: 1800 // 30 minutes
  },
  'error_event': {
    event_types: ['error_event'],
    propagate: true,
    inherit_context: true,
    merge_strategy: 'preserve', // Keep original context for debugging
    max_depth: 20,
    ttl_seconds: 7200 // 2 hours
  },
  'heartbeat': {
    event_types: ['system.heartbeat'],
    propagate: false,
    inherit_context: false,
    merge_strategy: 'replace'
  }
};

/**
 * Context-aware event routing
 */
export class EventContextRouter {
  private routes: Map<string, (event: AgentEvent, context?: EventContext) => boolean> = new Map();

  /**
   * Add a routing rule based on context
   */
  addRoute(
    name: string,
    rule: (event: AgentEvent, context?: EventContext) => boolean
  ): void {
    this.routes.set(name, rule);
  }

  /**
   * Route an event based on its context
   */
  route(event: AgentEvent): string[] {
    const matchedRoutes: string[] = [];
    
    for (const [name, rule] of this.routes) {
      try {
        if (rule(event, event.context)) {
          matchedRoutes.push(name);
        }
      } catch (error) {
        runtimeLogger.error(`Error in routing rule ${name}:`, error as Error);
      }
    }

    return matchedRoutes;
  }

  /**
   * Remove a routing rule
   */
  removeRoute(name: string): boolean {
    return this.routes.delete(name);
  }

  /**
   * Clear all routing rules
   */
  clearRoutes(): void {
    this.routes.clear();
  }
}

/**
 * Utility to create common event context filters
 */
export const ContextFilters = {
  /**
   * Filter for events from a specific agent
   */
  fromAgent: (agentId: string): EventContextFilter => ({
    origin_agent_id: agentId
  }),

  /**
   * Filter for events in a specific correlation chain
   */
  inCorrelation: (correlationId: string): EventContextFilter => ({
    correlation_id: correlationId
  }),

  /**
   * Filter for high priority events
   */
  highPriority: (minPriority: number = 80): EventContextFilter => ({
    priority_min: minPriority
  }),

  /**
   * Filter for recent events with context
   */
  recentWithContext: (): EventContextFilter => ({
    include_expired: false
  }),

  /**
   * Filter for shallow propagation events
   */
  shallow: (maxDepth: number = 3): EventContextFilter => ({
    max_depth: maxDepth
  })
};