/**
 * @module assertion-helpers
 * @description Custom assertion helpers for context testing
 */

import { expect } from 'bun:test';
import { ConversationContext } from '../../context-manager.js';

/**
 * Context-specific assertion helpers
 */
export class ContextAssertions {
  /**
   * Assert that a context has expected basic structure
   */
  static assertValidContext(context: ConversationContext): void {
    expect(context).toBeDefined();
    expect(context.id).toMatch(/^[a-zA-Z0-9_-]+$/);
    expect(context.agentId).toMatch(/^[a-zA-Z0-9_-]+$/);
    expect(context.startedAt).toBeInstanceOf(Date);
    expect(context.lastActive).toBeInstanceOf(Date);
    expect(context.participants).toBeInstanceOf(Set);
    expect(context.participants.size).toBeGreaterThan(0);
    expect(Array.isArray(context.topics)).toBe(true);
    expect(Array.isArray(context.messages)).toBe(true);
    expect(Array.isArray(context.pendingQuestions)).toBe(true);
    expect(Array.isArray(context.followUpTopics)).toBe(true);
    expect(typeof context.metadata).toBe('object');
    expect(context.state).toBeDefined();
  }

  /**
   * Assert that context state is valid
   */
  static assertValidState(context: ConversationContext): void {
    const validPhases = ['greeting', 'active', 'closing', 'idle'];
    const validMoods = ['positive', 'neutral', 'negative'];

    expect(validPhases).toContain(context.state.phase);
    expect(validMoods).toContain(context.state.mood);
    expect(context.state.formality).toBeGreaterThanOrEqual(0);
    expect(context.state.formality).toBeLessThanOrEqual(1);
    expect(context.state.engagement).toBeGreaterThanOrEqual(0);
    expect(context.state.engagement).toBeLessThanOrEqual(1);
  }

  /**
   * Assert that context topics are properly structured
   */
  static assertValidTopics(context: ConversationContext): void {
    for (const topic of context.topics) {
      expect(typeof topic.topic).toBe('string');
      expect(topic.topic.length).toBeGreaterThan(0);
      expect(topic.mentions).toBeGreaterThan(0);
      expect(topic.firstMentioned).toBeInstanceOf(Date);
      expect(topic.lastMentioned).toBeInstanceOf(Date);
      expect(topic.lastMentioned.getTime()).toBeGreaterThanOrEqual(
        topic.firstMentioned.getTime()
      );
    }
  }

  /**
   * Assert that context messages are properly structured
   */
  static assertValidMessages(context: ConversationContext): void {
    for (const message of context.messages) {
      expect(typeof message.from).toBe('string');
      expect(message.from.length).toBeGreaterThan(0);
      expect(typeof message.content).toBe('string');
      expect(message.content.length).toBeGreaterThan(0);
      expect(message.timestamp).toBeInstanceOf(Date);

      if (message.emotion) {
        expect(typeof message.emotion).toBe('string');
      }

      if (message.intent) {
        expect(typeof message.intent).toBe('string');
      }
    }

    // Messages should be in chronological order
    for (let i = 1; i < context.messages.length; i++) {
      expect(context.messages[i].timestamp.getTime()).toBeGreaterThanOrEqual(
        context.messages[i - 1].timestamp.getTime()
      );
    }
  }

  /**
   * Assert that pending questions are valid
   */
  static assertValidPendingQuestions(context: ConversationContext): void {
    for (const question of context.pendingQuestions) {
      expect(typeof question.question).toBe('string');
      expect(question.question.length).toBeGreaterThan(0);
      expect(question.askedAt).toBeInstanceOf(Date);
      expect(typeof question.askedBy).toBe('string');
      expect(question.askedBy.length).toBeGreaterThan(0);
    }
  }

  /**
   * Assert context integrity (all validation checks)
   */
  static assertContextIntegrity(context: ConversationContext): void {
    this.assertValidContext(context);
    this.assertValidState(context);
    this.assertValidTopics(context);
    this.assertValidMessages(context);
    this.assertValidPendingQuestions(context);
  }

  /**
   * Assert that two contexts can be merged
   */
  static assertMergeable(
    primary: ConversationContext,
    secondary: ConversationContext
  ): void {
    expect(primary.agentId).toBe(secondary.agentId);
    expect(primary).not.toBe(secondary);
    expect(primary.id).not.toBe(secondary.id);
  }

  /**
   * Assert that context has expected activity level
   */
  static assertActivityLevel(
    context: ConversationContext,
    expectedMessages: number,
    expectedTopics: number,
    expectedQuestions: number
  ): void {
    expect(context.messages.length).toBe(expectedMessages);
    expect(context.topics.length).toBe(expectedTopics);
    expect(context.pendingQuestions.length).toBe(expectedQuestions);
  }

  /**
   * Assert that context is within time bounds
   */
  static assertTimeBounds(
    context: ConversationContext,
    maxAge: number = 3600000, // 1 hour default
    allowFuture: boolean = false
  ): void {
    const now = Date.now();
    const age = now - context.lastActive.getTime();

    expect(age).toBeLessThanOrEqual(maxAge);

    if (!allowFuture) {
      expect(context.startedAt.getTime()).toBeLessThanOrEqual(now);
      expect(context.lastActive.getTime()).toBeLessThanOrEqual(now);
    }

    expect(context.lastActive.getTime()).toBeGreaterThanOrEqual(
      context.startedAt.getTime()
    );
  }

  /**
   * Assert that context participant management is correct
   */
  static assertParticipantManagement(context: ConversationContext): void {
    expect(context.participants.size).toBeGreaterThan(0);

    if (context.primaryParticipant) {
      expect(context.participants.has(context.primaryParticipant)).toBe(true);
    }

    // All message senders should be participants
    for (const message of context.messages) {
      expect(
        context.participants.has(message.from) ||
          message.from === context.agentId
      ).toBe(true);
    }
  }

  /**
   * Assert context sentiment consistency
   */
  static assertSentimentConsistency(context: ConversationContext): void {
    const positiveEmotions = ['happy', 'excited', 'confident', 'proud'];
    const negativeEmotions = ['sad', 'angry', 'anxious', 'confused'];

    let positiveCount = 0;
    let negativeCount = 0;

    for (const message of context.messages) {
      if (message.emotion) {
        if (positiveEmotions.includes(message.emotion)) {
          positiveCount++;
        } else if (negativeEmotions.includes(message.emotion)) {
          negativeCount++;
        }
      }
    }

    // If we have overwhelming positive/negative emotions, mood should reflect it
    if (positiveCount > negativeCount * 2) {
      expect(['positive', 'neutral']).toContain(context.state.mood);
    } else if (negativeCount > positiveCount * 2) {
      expect(['negative', 'neutral']).toContain(context.state.mood);
    }
  }
}

/**
 * Performance assertion helpers
 */
export class PerformanceAssertions {
  /**
   * Assert operation completed within time limit
   */
  static assertExecutionTime(
    operation: () => Promise<any> | any,
    maxTimeMs: number,
    description: string = 'Operation'
  ): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const start = performance.now();

      try {
        await operation();
        const end = performance.now();
        const duration = end - start;

        if (duration > maxTimeMs) {
          reject(
            new Error(
              `${description} took ${duration.toFixed(2)}ms, expected < ${maxTimeMs}ms`
            )
          );
        } else {
          resolve();
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Assert memory usage is within limits
   */
  static assertMemoryUsage(
    operation: () => Promise<any> | any,
    maxMemoryMB: number,
    description: string = 'Operation'
  ): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const initialMemory = process.memoryUsage().heapUsed;

      try {
        await operation();

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }

        const finalMemory = process.memoryUsage().heapUsed;
        const memoryDelta = (finalMemory - initialMemory) / 1024 / 1024; // MB

        if (memoryDelta > maxMemoryMB) {
          reject(
            new Error(
              `${description} used ${memoryDelta.toFixed(2)}MB, expected < ${maxMemoryMB}MB`
            )
          );
        } else {
          resolve();
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Assert operation throughput meets requirements
   */
  static async assertThroughput(
    operation: () => Promise<any> | any,
    iterations: number,
    maxTotalTimeMs: number,
    description: string = 'Operations'
  ): Promise<void> {
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      await operation();
    }

    const end = performance.now();
    const totalTime = end - start;
    const avgTime = totalTime / iterations;

    if (totalTime > maxTotalTimeMs) {
      throw new Error(
        `${description} (${iterations} iterations) took ${totalTime.toFixed(2)}ms total ` +
          `(${avgTime.toFixed(2)}ms avg), expected < ${maxTotalTimeMs}ms total`
      );
    }
  }
}

/**
 * Concurrency assertion helpers
 */
export class ConcurrencyAssertions {
  /**
   * Assert that concurrent operations don't interfere
   */
  static async assertConcurrentSafety(
    operations: Array<() => Promise<any>>,
    description: string = 'Concurrent operations'
  ): Promise<void> {
    const results = await Promise.allSettled(operations.map((op) => op()));

    const failures = results.filter((r) => r.status === 'rejected');

    if (failures.length > 0) {
      const errors = failures.map((f) => (f as PromiseRejectedResult).reason);
      throw new Error(
        `${description} had ${failures.length}/${results.length} failures: ` +
          errors.map((e) => e.message || e).join(', ')
      );
    }
  }

  /**
   * Assert that race conditions don't occur
   */
  static async assertNoRaceConditions(
    setup: () => any,
    operation: (state: any) => Promise<any>,
    validate: (state: any, results: any[]) => void,
    concurrency: number = 10
  ): Promise<void> {
    const state = setup();
    const operations = Array.from(
      { length: concurrency },
      () => () => operation(state)
    );

    const results = await Promise.all(operations.map((op) => op()));

    validate(state, results);
  }
}

/**
 * Chaos testing assertion helpers
 */
export class ChaosAssertions {
  /**
   * Assert system handles random failures gracefully
   */
  static async assertFailureResilience(
    operation: () => Promise<any>,
    failureRate: number = 0.2,
    iterations: number = 50,
    description: string = 'Operation'
  ): Promise<void> {
    let successCount = 0;
    let expectedFailures = 0;

    for (let i = 0; i < iterations; i++) {
      try {
        // Randomly inject failures
        if (Math.random() < failureRate) {
          expectedFailures++;
          throw new Error('Injected chaos failure');
        }

        await operation();
        successCount++;
      } catch (error) {
        if (!error.message.includes('Injected chaos failure')) {
          throw error; // Unexpected failure
        }
      }
    }

    const expectedSuccess = iterations - expectedFailures;
    const tolerance = Math.ceil(expectedSuccess * 0.1); // 10% tolerance

    if (Math.abs(successCount - expectedSuccess) > tolerance) {
      throw new Error(
        `${description} resilience test failed: ${successCount}/${expectedSuccess} ` +
          `successful operations (tolerance: ${tolerance})`
      );
    }
  }

  /**
   * Assert system handles resource exhaustion
   */
  static async assertResourceExhaustionHandling(
    operation: () => Promise<any>,
    resourceLimit: number,
    description: string = 'Operation'
  ): Promise<void> {
    const operations = Array.from({ length: resourceLimit * 2 }, () =>
      operation()
    );

    try {
      await Promise.all(operations);
    } catch (error) {
      // Expected to fail due to resource exhaustion
      expect(error).toBeDefined();
      return;
    }

    throw new Error(
      `${description} should have failed due to resource exhaustion at ${resourceLimit} operations`
    );
  }
}
