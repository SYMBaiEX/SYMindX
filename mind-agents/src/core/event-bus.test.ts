/**
 * @module event-bus.test
 * @description Event Bus Test Suite - Comprehensive tests for the event system
 */

import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { SimpleEventBus } from './event-bus.js';
import type { AgentEvent, EventHandler } from '../types/index.js';

describe('SimpleEventBus', () => {
  let eventBus: SimpleEventBus;
  let mockEvent: AgentEvent;

  beforeEach(() => {
    eventBus = new SimpleEventBus();
    mockEvent = {
      id: 'test-event-1',
      type: 'test_event',
      source: 'test-source',
      data: { message: 'Hello World' },
      timestamp: new Date(),
      processed: false,
    };
  });

  afterEach(() => {
    eventBus.clear();
  });

  describe('Event Publishing', () => {
    it('should publish events successfully', async () => {
      const result = await eventBus.publish(mockEvent);
      
      expect(result.success).toBe(true);
      expect(result.eventId).toBe(mockEvent.id);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should store published events', async () => {
      await eventBus.publish(mockEvent);
      
      const events = eventBus.getEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toEqual(mockEvent);
    });

    it('should handle duplicate event IDs', async () => {
      await eventBus.publish(mockEvent);
      
      const duplicateEvent = { ...mockEvent };
      const result = await eventBus.publish(duplicateEvent);
      
      expect(result.success).toBe(true);
      expect(eventBus.getEvents()).toHaveLength(2);
    });

    it('should handle malformed events gracefully', async () => {
      const malformedEvent = {
        id: 'test',
        type: 'test',
        // Missing required fields
      } as AgentEvent;

      const result = await eventBus.publish(malformedEvent);
      expect(result.success).toBe(true); // Should still work but with warnings
    });
  });

  describe('Event Subscription', () => {
    it('should subscribe to events', () => {
      const handler: EventHandler = mock(() => Promise.resolve({
        success: true,
        timestamp: new Date(),
        eventProcessed: true,
      }));

      const result = eventBus.on('test_event', handler);
      
      expect(result.success).toBe(true);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should handle multiple subscribers', () => {
      const handler1: EventHandler = mock(() => Promise.resolve({
        success: true,
        timestamp: new Date(),
        eventProcessed: true,
      }));
      
      const handler2: EventHandler = mock(() => Promise.resolve({
        success: true,
        timestamp: new Date(),
        eventProcessed: true,
      }));

      eventBus.on('test_event', handler1);
      eventBus.on('test_event', handler2);

      expect(eventBus.listenerCount('test_event')).toBe(2);
    });

    it('should unsubscribe from events', () => {
      const handler: EventHandler = mock(() => Promise.resolve({
        success: true,
        timestamp: new Date(),
        eventProcessed: true,
      }));

      eventBus.on('test_event', handler);
      const result = eventBus.off('test_event', handler);
      
      expect(result.success).toBe(true);
      expect(eventBus.listenerCount('test_event')).toBe(0);
    });

    it('should handle unsubscribing non-existent handlers', () => {
      const handler: EventHandler = mock(() => Promise.resolve({
        success: true,
        timestamp: new Date(),
        eventProcessed: true,
      }));

      const result = eventBus.off('non_existent_event', handler);
      expect(result.success).toBe(true); // Should not throw
    });
  });

  describe('Event Emission', () => {
    it('should emit events to subscribers', async () => {
      const handler: EventHandler = mock(() => Promise.resolve({
        success: true,
        timestamp: new Date(),
        eventProcessed: true,
      }));

      eventBus.on('test_event', handler);
      const result = await eventBus.emit(mockEvent);
      
      expect(result.success).toBe(true);
      expect(result.handlersNotified).toBe(1);
      expect(handler).toHaveBeenCalledWith(mockEvent);
    });

    it('should handle multiple handlers for same event', async () => {
      const handler1: EventHandler = mock(() => Promise.resolve({
        success: true,
        timestamp: new Date(),
        eventProcessed: true,
      }));
      
      const handler2: EventHandler = mock(() => Promise.resolve({
        success: true,
        timestamp: new Date(),
        eventProcessed: true,
      }));

      eventBus.on('test_event', handler1);
      eventBus.on('test_event', handler2);
      
      const result = await eventBus.emit(mockEvent);
      
      expect(result.success).toBe(true);
      expect(result.handlersNotified).toBe(2);
      expect(handler1).toHaveBeenCalledWith(mockEvent);
      expect(handler2).toHaveBeenCalledWith(mockEvent);
    });

    it('should handle handler errors gracefully', async () => {
      const errorHandler: EventHandler = mock(() => Promise.reject(new Error('Handler error')));
      const successHandler: EventHandler = mock(() => Promise.resolve({
        success: true,
        timestamp: new Date(),
        eventProcessed: true,
      }));

      eventBus.on('test_event', errorHandler);
      eventBus.on('test_event', successHandler);
      
      const result = await eventBus.emit(mockEvent);
      
      expect(result.success).toBe(true); // Should still succeed
      expect(result.handlersNotified).toBe(2);
      expect(result.errors).toHaveLength(1);
    });

    it('should emit to wildcard subscribers', async () => {
      const wildcardHandler: EventHandler = mock(() => Promise.resolve({
        success: true,
        timestamp: new Date(),
        eventProcessed: true,
      }));

      eventBus.on('*', wildcardHandler);
      const result = await eventBus.emit(mockEvent);
      
      expect(result.success).toBe(true);
      expect(result.handlersNotified).toBe(1);
      expect(wildcardHandler).toHaveBeenCalledWith(mockEvent);
    });
  });

  describe('Event Management', () => {
    it('should get all events', async () => {
      await eventBus.publish(mockEvent);
      
      const events = eventBus.getEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toEqual(mockEvent);
    });

    it('should get events by type', async () => {
      const event1 = { ...mockEvent, type: 'type1' };
      const event2 = { ...mockEvent, id: 'test-2', type: 'type2' };
      
      await eventBus.publish(event1);
      await eventBus.publish(event2);
      
      const type1Events = eventBus.getEventsByType('type1');
      const type2Events = eventBus.getEventsByType('type2');
      
      expect(type1Events).toHaveLength(1);
      expect(type2Events).toHaveLength(1);
      expect(type1Events[0].type).toBe('type1');
      expect(type2Events[0].type).toBe('type2');
    });

    it('should get events by source', async () => {
      const event1 = { ...mockEvent, source: 'source1' };
      const event2 = { ...mockEvent, id: 'test-2', source: 'source2' };
      
      await eventBus.publish(event1);
      await eventBus.publish(event2);
      
      const source1Events = eventBus.getEventsBySource('source1');
      const source2Events = eventBus.getEventsBySource('source2');
      
      expect(source1Events).toHaveLength(1);
      expect(source2Events).toHaveLength(1);
      expect(source1Events[0].source).toBe('source1');
      expect(source2Events[0].source).toBe('source2');
    });

    it('should clear all events', async () => {
      await eventBus.publish(mockEvent);
      
      expect(eventBus.getEvents()).toHaveLength(1);
      
      eventBus.clear();
      
      expect(eventBus.getEvents()).toHaveLength(0);
    });

    it('should get listener count', () => {
      const handler: EventHandler = mock(() => Promise.resolve({
        success: true,
        timestamp: new Date(),
        eventProcessed: true,
      }));

      expect(eventBus.listenerCount('test_event')).toBe(0);
      
      eventBus.on('test_event', handler);
      expect(eventBus.listenerCount('test_event')).toBe(1);
      
      eventBus.on('test_event', handler);
      expect(eventBus.listenerCount('test_event')).toBe(2);
    });

    it('should get event names', () => {
      const handler: EventHandler = mock(() => Promise.resolve({
        success: true,
        timestamp: new Date(),
        eventProcessed: true,
      }));

      eventBus.on('event1', handler);
      eventBus.on('event2', handler);
      
      const eventNames = eventBus.eventNames();
      expect(eventNames).toContain('event1');
      expect(eventNames).toContain('event2');
      expect(eventNames).toHaveLength(2);
    });

    it('should remove all listeners', () => {
      const handler: EventHandler = mock(() => Promise.resolve({
        success: true,
        timestamp: new Date(),
        eventProcessed: true,
      }));

      eventBus.on('event1', handler);
      eventBus.on('event2', handler);
      
      const result = eventBus.removeAllListeners();
      
      expect(result.success).toBe(true);
      expect(eventBus.listenerCount('event1')).toBe(0);
      expect(eventBus.listenerCount('event2')).toBe(0);
      expect(eventBus.eventNames()).toHaveLength(0);
    });

    it('should remove listeners for specific event', () => {
      const handler: EventHandler = mock(() => Promise.resolve({
        success: true,
        timestamp: new Date(),
        eventProcessed: true,
      }));

      eventBus.on('event1', handler);
      eventBus.on('event2', handler);
      
      const result = eventBus.removeAllListeners('event1');
      
      expect(result.success).toBe(true);
      expect(eventBus.listenerCount('event1')).toBe(0);
      expect(eventBus.listenerCount('event2')).toBe(1);
    });
  });

  describe('Once Subscription', () => {
    it('should subscribe for one-time events', async () => {
      const handler: EventHandler = mock(() => Promise.resolve({
        success: true,
        timestamp: new Date(),
        eventProcessed: true,
      }));

      const result = eventBus.once('test_event', handler);
      expect(result.success).toBe(true);
      
      // First emission should trigger handler
      await eventBus.emit(mockEvent);
      expect(handler).toHaveBeenCalledTimes(1);
      
      // Second emission should not trigger handler
      await eventBus.emit(mockEvent);
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('Performance', () => {
    it('should handle high event throughput', async () => {
      const startTime = Date.now();
      const eventPromises = [];
      
      // Publish many events concurrently
      for (let i = 0; i < 100; i++) {
        const event = {
          ...mockEvent,
          id: `test-event-${i}`,
          data: { index: i },
        };
        eventPromises.push(eventBus.publish(event));
      }

      await Promise.all(eventPromises);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      expect(eventBus.getEvents()).toHaveLength(100);
    });

    it('should handle many subscribers efficiently', async () => {
      const handlers: EventHandler[] = [];
      
      // Create many handlers
      for (let i = 0; i < 50; i++) {
        const handler: EventHandler = mock(() => Promise.resolve({
          success: true,
          timestamp: new Date(),
          eventProcessed: true,
        }));
        handlers.push(handler);
        eventBus.on('test_event', handler);
      }

      const startTime = Date.now();
      const result = await eventBus.emit(mockEvent);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(500); // Should complete within 0.5 seconds
      expect(result.success).toBe(true);
      expect(result.handlersNotified).toBe(50);
      
      // Verify all handlers were called
      handlers.forEach(handler => {
        expect(handler).toHaveBeenCalledWith(mockEvent);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid event types', async () => {
      const invalidEvent = {
        ...mockEvent,
        type: '', // Invalid empty type
      };

      const result = await eventBus.publish(invalidEvent);
      expect(result.success).toBe(true); // Should handle gracefully
    });

    it('should handle missing event data', async () => {
      const eventWithoutData = {
        id: 'test-no-data',
        type: 'test_event',
        source: 'test-source',
        timestamp: new Date(),
        processed: false,
      } as AgentEvent;

      const result = await eventBus.publish(eventWithoutData);
      expect(result.success).toBe(true);
    });

    it('should handle null/undefined handlers', () => {
      expect(() => {
        eventBus.on('test_event', null as any);
      }).not.toThrow();

      expect(() => {
        eventBus.on('test_event', undefined as any);
      }).not.toThrow();
    });
  });

  describe('Memory Management', () => {
    it('should not leak memory with many events', async () => {
      const initialEvents = eventBus.getEvents().length;
      
      // Publish many events
      for (let i = 0; i < 1000; i++) {
        const event = {
          ...mockEvent,
          id: `memory-test-${i}`,
        };
        await eventBus.publish(event);
      }

      expect(eventBus.getEvents().length).toBe(initialEvents + 1000);
      
      // Clear events
      eventBus.clear();
      expect(eventBus.getEvents().length).toBe(0);
    });

    it('should properly clean up handlers', () => {
      const handler: EventHandler = mock(() => Promise.resolve({
        success: true,
        timestamp: new Date(),
        eventProcessed: true,
      }));

      eventBus.on('test_event', handler);
      expect(eventBus.listenerCount('test_event')).toBe(1);
      
      eventBus.removeAllListeners();
      expect(eventBus.listenerCount('test_event')).toBe(0);
      expect(eventBus.eventNames()).toHaveLength(0);
    });
  });
});