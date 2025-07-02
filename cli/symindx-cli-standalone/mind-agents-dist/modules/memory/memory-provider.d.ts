import { MemoryProvider, MemoryRecord } from '../../types/agent.js';
/**
 * In-memory implementation of the MemoryProvider interface.
 * This provider stores all memories in RAM and is suitable for testing
 * and development purposes. Not recommended for production use as
 * memories will be lost when the process terminates.
 */
export declare class InMemoryProvider implements MemoryProvider {
    private memories;
    private embeddingModel;
    constructor(embeddingModel?: string);
    store(agentId: string, memory: MemoryRecord): Promise<void>;
    retrieve(agentId: string, query: string, limit?: number): Promise<MemoryRecord[]>;
    search(agentId: string, embedding: number[], limit?: number): Promise<MemoryRecord[]>;
    delete(agentId: string, memoryId: string): Promise<void>;
    clear(agentId: string): Promise<void>;
    getStats(agentId: string): {
        total: number;
        byType: Record<string, number>;
    };
    cleanup(agentId: string, retentionDays: number): void;
    generateEmbedding(text: string): Promise<number[]>;
}
