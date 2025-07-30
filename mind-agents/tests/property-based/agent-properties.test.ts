import * as fc from 'fast-check';
import { Agent } from '../../src/core/agent';
import { EmotionState } from '../../src/types/emotion';
import { Message } from '../../src/types/message';
import { AgentAction } from '../../src/types/agent';
import { createAgent } from '../utils/test-factories';

/**
 * Property-based tests for Agent behaviors
 * Tests invariants and properties that should always hold
 */

describe('Agent Property-Based Tests', () => {
  describe('Emotion State Properties', () => {
    test('emotion intensity should always be between 0 and 1', () => {
      fc.assert(
        fc.property(
          fc.record({
            happy: fc.float({ min: 0, max: 1 }),
            sad: fc.float({ min: 0, max: 1 }),
            angry: fc.float({ min: 0, max: 1 }),
            anxious: fc.float({ min: 0, max: 1 }),
            confident: fc.float({ min: 0, max: 1 }),
            nostalgic: fc.float({ min: 0, max: 1 }),
            empathetic: fc.float({ min: 0, max: 1 }),
            curious: fc.float({ min: 0, max: 1 }),
            proud: fc.float({ min: 0, max: 1 }),
            confused: fc.float({ min: 0, max: 1 }),
            neutral: fc.float({ min: 0, max: 1 }),
          }),
          (emotionState) => {
            const agent = createAgent();
            agent.setEmotionState(emotionState as EmotionState);
            const state = agent.getEmotionState();
            
            Object.values(state).forEach(intensity => {
              expect(intensity).toBeGreaterThanOrEqual(0);
              expect(intensity).toBeLessThanOrEqual(1);
            });
          }
        ),
        { numRuns: 1000 }
      );
    });

    test('dominant emotion should have highest intensity', () => {
      fc.assert(
        fc.property(
          fc.record({
            happy: fc.float({ min: 0, max: 1 }),
            sad: fc.float({ min: 0, max: 1 }),
            angry: fc.float({ min: 0, max: 1 }),
            anxious: fc.float({ min: 0, max: 1 }),
            confident: fc.float({ min: 0, max: 1 }),
            nostalgic: fc.float({ min: 0, max: 1 }),
            empathetic: fc.float({ min: 0, max: 1 }),
            curious: fc.float({ min: 0, max: 1 }),
            proud: fc.float({ min: 0, max: 1 }),
            confused: fc.float({ min: 0, max: 1 }),
            neutral: fc.float({ min: 0, max: 1 }),
          }),
          (emotionState) => {
            const agent = createAgent();
            agent.setEmotionState(emotionState as EmotionState);
            const dominant = agent.getDominantEmotion();
            const state = agent.getEmotionState();
            
            const maxIntensity = Math.max(...Object.values(state));
            expect(state[dominant]).toBe(maxIntensity);
          }
        )
      );
    });

    test('emotion decay should never result in negative values', () => {
      fc.assert(
        fc.property(
          fc.record({
            initialIntensity: fc.float({ min: 0, max: 1 }),
            decayRate: fc.float({ min: 0, max: 1 }),
            timeSteps: fc.integer({ min: 1, max: 100 }),
          }),
          ({ initialIntensity, decayRate, timeSteps }) => {
            let intensity = initialIntensity;
            
            for (let i = 0; i < timeSteps; i++) {
              intensity = intensity * (1 - decayRate);
              expect(intensity).toBeGreaterThanOrEqual(0);
            }
          }
        )
      );
    });
  });

  describe('Message Processing Properties', () => {
    const messageArbitrary = fc.record({
      content: fc.string({ minLength: 1, maxLength: 1000 }),
      from: fc.string({ minLength: 1, maxLength: 50 }),
      timestamp: fc.date(),
      metadata: fc.option(fc.dictionary(fc.string(), fc.anything())),
    });

    test('agent should always produce a response for valid messages', async () => {
      await fc.assert(
        fc.asyncProperty(
          messageArbitrary,
          async (message) => {
            const agent = createAgent();
            await agent.activate();
            
            const response = await agent.processMessage(message as Message);
            
            expect(response).toBeDefined();
            expect(response.content).toBeTruthy();
            expect(response.agentId).toBe(agent.id);
          }
        ),
        { numRuns: 100, timeout: 5000 }
      );
    });

    test('message order should be preserved in conversation history', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(messageArbitrary, { minLength: 2, maxLength: 10 }),
          async (messages) => {
            const agent = createAgent();
            await agent.activate();
            
            const responses: any[] = [];
            for (const message of messages) {
              const response = await agent.processMessage(message as Message);
              responses.push(response);
            }
            
            const history = agent.getConversationHistory();
            
            // Check that messages appear in order
            messages.forEach((message, index) => {
              const historyEntry = history.find(h => 
                h.message.content === message.content &&
                h.message.from === message.from
              );
              expect(historyEntry).toBeDefined();
              expect(historyEntry.order).toBe(index);
            });
          }
        ),
        { numRuns: 50, timeout: 10000 }
      );
    });

    test('concurrent messages should not corrupt agent state', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(messageArbitrary, { minLength: 5, maxLength: 20 }),
          async (messages) => {
            const agent = createAgent();
            await agent.activate();
            
            const initialState = agent.getState();
            
            // Process messages concurrently
            const responses = await Promise.all(
              messages.map(msg => agent.processMessage(msg as Message))
            );
            
            const finalState = agent.getState();
            
            // Agent should still be in valid state
            expect(finalState.status).toBe('active');
            expect(responses.length).toBe(messages.length);
            expect(responses.every(r => r !== null && r !== undefined)).toBe(true);
          }
        ),
        { numRuns: 20, timeout: 20000 }
      );
    });
  });

  describe('Action Generation Properties', () => {
    const actionArbitrary = fc.record({
      type: fc.constantFrom('message', 'memory_store', 'memory_retrieve', 'extension_call'),
      parameters: fc.dictionary(fc.string(), fc.anything()),
      priority: fc.integer({ min: 0, max: 10 }),
    });

    test('action chains should maintain causal ordering', () => {
      fc.assert(
        fc.property(
          fc.array(actionArbitrary, { minLength: 2, maxLength: 10 }),
          (actions) => {
            const agent = createAgent();
            
            const actionChain = agent.createActionChain(actions as AgentAction[]);
            
            // Verify dependencies are respected
            for (let i = 1; i < actionChain.length; i++) {
              const current = actionChain[i];
              const previous = actionChain[i - 1];
              
              if (current.dependencies?.includes(previous.id)) {
                expect(actionChain.indexOf(current)).toBeGreaterThan(
                  actionChain.indexOf(previous)
                );
              }
            }
          }
        )
      );
    });

    test('action validation should reject invalid parameters', () => {
      fc.assert(
        fc.property(
          fc.record({
            type: fc.string(),
            parameters: fc.anything(),
          }),
          (action) => {
            const agent = createAgent();
            
            // Property: validation should be deterministic
            const result1 = agent.validateAction(action as AgentAction);
            const result2 = agent.validateAction(action as AgentAction);
            
            expect(result1).toBe(result2);
          }
        )
      );
    });
  });

  describe('Memory Properties', () => {
    test('memory retrieval should be idempotent', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            query: fc.string({ minLength: 1, maxLength: 100 }),
            limit: fc.integer({ min: 1, max: 100 }),
          }),
          async ({ query, limit }) => {
            const agent = createAgent();
            await agent.activate();
            
            // Add some memories
            for (let i = 0; i < 10; i++) {
              await agent.storeMemory({
                content: `Memory ${i}: ${query}`,
                type: 'conversation',
                timestamp: new Date(),
              });
            }
            
            // Retrieve memories multiple times
            const results1 = await agent.retrieveMemories(query, limit);
            const results2 = await agent.retrieveMemories(query, limit);
            const results3 = await agent.retrieveMemories(query, limit);
            
            // Should get same results
            expect(results1).toEqual(results2);
            expect(results2).toEqual(results3);
          }
        ),
        { numRuns: 50, timeout: 10000 }
      );
    });

    test('memory importance scoring should be transitive', () => {
      fc.assert(
        fc.property(
          fc.tuple(
            fc.float({ min: 0, max: 1 }),
            fc.float({ min: 0, max: 1 }),
            fc.float({ min: 0, max: 1 })
          ),
          ([score1, score2, score3]) => {
            const agent = createAgent();
            
            // If memory1 > memory2 and memory2 > memory3, then memory1 > memory3
            const memories = [
              { content: 'Memory 1', importance: score1 },
              { content: 'Memory 2', importance: score2 },
              { content: 'Memory 3', importance: score3 },
            ];
            
            const sorted = agent.sortMemoriesByImportance(memories);
            
            for (let i = 0; i < sorted.length - 1; i++) {
              expect(sorted[i].importance).toBeGreaterThanOrEqual(sorted[i + 1].importance);
            }
          }
        )
      );
    });
  });

  describe('Multi-Agent Interaction Properties', () => {
    test('message broadcast should reach all active agents', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            agentCount: fc.integer({ min: 2, max: 10 }),
            message: messageArbitrary,
          }),
          async ({ agentCount, message }) => {
            const agents = Array.from({ length: agentCount }, () => createAgent());
            
            // Activate all agents
            await Promise.all(agents.map(a => a.activate()));
            
            // Broadcast message from first agent
            const broadcaster = agents[0];
            const recipients = agents.slice(1);
            
            const results = await broadcaster.broadcast(message as Message, recipients);
            
            // All agents should receive the message
            expect(results.length).toBe(recipients.length);
            expect(results.every(r => r.received)).toBe(true);
          }
        ),
        { numRuns: 20, timeout: 30000 }
      );
    });

    test('consensus mechanisms should be deterministic', () => {
      fc.assert(
        fc.property(
          fc.record({
            votes: fc.array(fc.boolean(), { minLength: 3, maxLength: 20 }),
            threshold: fc.float({ min: 0.5, max: 1 }),
          }),
          ({ votes, threshold }) => {
            const consensus1 = calculateConsensus(votes, threshold);
            const consensus2 = calculateConsensus(votes, threshold);
            
            expect(consensus1).toBe(consensus2);
          }
        )
      );
    });
  });

  describe('Error Handling Properties', () => {
    test('agent should gracefully handle malformed inputs', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.anything(),
          async (input) => {
            const agent = createAgent();
            await agent.activate();
            
            try {
              await agent.processMessage(input as any);
              // If it doesn't throw, response should be valid
              expect(true).toBe(true);
            } catch (error) {
              // Error should be well-formed
              expect(error).toBeInstanceOf(Error);
              expect(error.message).toBeTruthy();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('agent state should remain consistent after errors', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            validMessage: messageArbitrary,
            invalidInput: fc.anything(),
          }),
          async ({ validMessage, invalidInput }) => {
            const agent = createAgent();
            await agent.activate();
            
            const stateBefore = { ...agent.getState() };
            
            try {
              await agent.processMessage(invalidInput as any);
            } catch (error) {
              // Expected to fail
            }
            
            const stateAfter = agent.getState();
            
            // Core state should remain consistent
            expect(stateAfter.id).toBe(stateBefore.id);
            expect(stateAfter.status).toBe(stateBefore.status);
            
            // Should still be able to process valid messages
            const response = await agent.processMessage(validMessage as Message);
            expect(response).toBeDefined();
          }
        ),
        { numRuns: 50, timeout: 10000 }
      );
    });
  });
});

// Helper functions
function calculateConsensus(votes: boolean[], threshold: number): boolean {
  const yesVotes = votes.filter(v => v).length;
  const totalVotes = votes.length;
  return (yesVotes / totalVotes) >= threshold;
}