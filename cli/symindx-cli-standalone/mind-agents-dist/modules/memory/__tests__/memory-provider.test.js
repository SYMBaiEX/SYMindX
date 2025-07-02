import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createMemoryProvider } from '../index.js';
describe('Memory Provider', () => {
    let memoryProvider;
    beforeEach(async () => {
        const result = await createMemoryProvider('sqlite', {
            database_path: ':memory:'
        });
        if (result.success) {
            memoryProvider = result.data;
        }
        else {
            throw new Error(`Failed to create memory provider: ${result.error}`);
        }
    });
    afterEach(async () => {
        if (memoryProvider && typeof memoryProvider.close === 'function') {
            await memoryProvider.close();
        }
    });
    describe('basic operations', () => {
        it('should store and retrieve memories', async () => {
            const memory = {
                id: 'test-memory-1',
                agentId: 'test-agent',
                content: 'This is a test memory',
                timestamp: Date.now(),
                type: 'general',
                importance: 0.7,
                tags: ['test', 'memory'],
                context: { source: 'test' }
            };
            const storeResult = await memoryProvider.store(memory);
            expect(storeResult.success).toBe(true);
            const retrieveResult = await memoryProvider.retrieve('test-memory-1');
            expect(retrieveResult.success).toBe(true);
            if (retrieveResult.success) {
                expect(retrieveResult.data.id).toBe('test-memory-1');
                expect(retrieveResult.data.content).toBe('This is a test memory');
                expect(retrieveResult.data.agentId).toBe('test-agent');
            }
        });
        it('should search memories by content', async () => {
            const memories = [
                {
                    id: 'mem-1',
                    agentId: 'test-agent',
                    content: 'The user likes coffee in the morning',
                    timestamp: Date.now(),
                    type: 'user_preference',
                    importance: 0.8,
                    tags: ['coffee', 'morning', 'preference']
                },
                {
                    id: 'mem-2',
                    agentId: 'test-agent',
                    content: 'The user prefers tea in the afternoon',
                    timestamp: Date.now(),
                    type: 'user_preference',
                    importance: 0.7,
                    tags: ['tea', 'afternoon', 'preference']
                }
            ];
            for (const memory of memories) {
                await memoryProvider.store(memory);
            }
            const searchResult = await memoryProvider.search({
                query: 'coffee',
                agentId: 'test-agent',
                limit: 10
            });
            expect(searchResult.success).toBe(true);
            if (searchResult.success) {
                expect(searchResult.data.length).toBeGreaterThan(0);
                expect(searchResult.data[0].content).toContain('coffee');
            }
        });
        it('should filter memories by type', async () => {
            const memories = [
                {
                    id: 'conv-1',
                    agentId: 'test-agent',
                    content: 'Had a conversation about AI',
                    timestamp: Date.now(),
                    type: 'conversation',
                    importance: 0.6
                },
                {
                    id: 'exp-1',
                    agentId: 'test-agent',
                    content: 'Learned about quantum computing',
                    timestamp: Date.now(),
                    type: 'experience',
                    importance: 0.9
                }
            ];
            for (const memory of memories) {
                await memoryProvider.store(memory);
            }
            const searchResult = await memoryProvider.search({
                agentId: 'test-agent',
                filters: { type: 'experience' },
                limit: 10
            });
            expect(searchResult.success).toBe(true);
            if (searchResult.success) {
                expect(searchResult.data.length).toBe(1);
                expect(searchResult.data[0].type).toBe('experience');
            }
        });
        it('should order memories by importance', async () => {
            const memories = [
                {
                    id: 'low-imp',
                    agentId: 'test-agent',
                    content: 'Low importance memory',
                    timestamp: Date.now(),
                    type: 'general',
                    importance: 0.3
                },
                {
                    id: 'high-imp',
                    agentId: 'test-agent',
                    content: 'High importance memory',
                    timestamp: Date.now(),
                    type: 'general',
                    importance: 0.9
                }
            ];
            for (const memory of memories) {
                await memoryProvider.store(memory);
            }
            const searchResult = await memoryProvider.search({
                agentId: 'test-agent',
                orderBy: 'importance',
                limit: 10
            });
            expect(searchResult.success).toBe(true);
            if (searchResult.success && searchResult.data.length >= 2) {
                expect(searchResult.data[0].importance).toBeGreaterThanOrEqual(searchResult.data[1].importance);
            }
        });
    });
    describe('memory management', () => {
        it('should update existing memories', async () => {
            const originalMemory = {
                id: 'update-test',
                agentId: 'test-agent',
                content: 'Original content',
                timestamp: Date.now(),
                type: 'general',
                importance: 0.5
            };
            await memoryProvider.store(originalMemory);
            const updatedMemory = {
                ...originalMemory,
                content: 'Updated content',
                importance: 0.8
            };
            const updateResult = await memoryProvider.update('update-test', updatedMemory);
            expect(updateResult.success).toBe(true);
            const retrieveResult = await memoryProvider.retrieve('update-test');
            if (retrieveResult.success) {
                expect(retrieveResult.data.content).toBe('Updated content');
                expect(retrieveResult.data.importance).toBe(0.8);
            }
        });
        it('should delete memories', async () => {
            const memory = {
                id: 'delete-test',
                agentId: 'test-agent',
                content: 'Memory to delete',
                timestamp: Date.now(),
                type: 'general',
                importance: 0.5
            };
            await memoryProvider.store(memory);
            const deleteResult = await memoryProvider.delete('delete-test');
            expect(deleteResult.success).toBe(true);
            const retrieveResult = await memoryProvider.retrieve('delete-test');
            expect(retrieveResult.success).toBe(false);
        });
        it('should handle memory consolidation', async () => {
            const memories = Array.from({ length: 20 }, (_, i) => ({
                id: `mem-${i}`,
                agentId: 'test-agent',
                content: `Memory ${i}`,
                timestamp: Date.now() - (i * 1000),
                type: 'general',
                importance: 0.1 + (i * 0.01)
            }));
            for (const memory of memories) {
                await memoryProvider.store(memory);
            }
            if (typeof memoryProvider.consolidate === 'function') {
                const consolidateResult = await memoryProvider.consolidate('test-agent', {
                    maxMemories: 10,
                    importanceThreshold: 0.15
                });
                expect(consolidateResult.success).toBe(true);
            }
        });
    });
    describe('error handling', () => {
        it('should handle invalid memory data', async () => {
            const invalidMemory = {
                id: '',
                agentId: 'test-agent',
                content: '',
                timestamp: Date.now(),
                type: 'general',
                importance: -1
            };
            const result = await memoryProvider.store(invalidMemory);
            expect(result.success).toBe(false);
        });
        it('should handle retrieval of non-existent memories', async () => {
            const result = await memoryProvider.retrieve('non-existent-id');
            expect(result.success).toBe(false);
        });
        it('should handle empty search queries gracefully', async () => {
            const result = await memoryProvider.search({
                query: '',
                agentId: 'test-agent',
                limit: 10
            });
            expect(result.success).toBe(true);
        });
    });
    describe('agent isolation', () => {
        it('should isolate memories between agents', async () => {
            const agent1Memory = {
                id: 'agent1-memory',
                agentId: 'agent-1',
                content: 'Agent 1 memory',
                timestamp: Date.now(),
                type: 'general',
                importance: 0.5
            };
            const agent2Memory = {
                id: 'agent2-memory',
                agentId: 'agent-2',
                content: 'Agent 2 memory',
                timestamp: Date.now(),
                type: 'general',
                importance: 0.5
            };
            await memoryProvider.store(agent1Memory);
            await memoryProvider.store(agent2Memory);
            const agent1Search = await memoryProvider.search({
                agentId: 'agent-1',
                limit: 10
            });
            const agent2Search = await memoryProvider.search({
                agentId: 'agent-2',
                limit: 10
            });
            if (agent1Search.success && agent2Search.success) {
                expect(agent1Search.data.every(m => m.agentId === 'agent-1')).toBe(true);
                expect(agent2Search.data.every(m => m.agentId === 'agent-2')).toBe(true);
            }
        });
    });
});
//# sourceMappingURL=memory-provider.test.js.map