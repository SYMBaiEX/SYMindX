import { MemoryProvider, MemoryRecord } from '../../types/agent.js';
import { MemoryProviderMetadata } from '../../types/memory.js';
export interface BaseMemoryConfig {
    embeddingModel?: string;
    [key: string]: unknown;
}
export interface MemoryRow {
    id: string;
    agent_id: string;
    type: string;
    content: string;
    embedding?: Buffer | number[] | null;
    metadata?: string | object;
    importance: number;
    timestamp: number | Date | string;
    tags?: string | string[];
    duration?: string;
    expires_at?: number | Date | string | null;
    memory_id?: string;
}
export declare abstract class BaseMemoryProvider implements MemoryProvider {
    protected config: BaseMemoryConfig;
    protected metadata: MemoryProviderMetadata;
    protected embeddingModel: string;
    constructor(config: BaseMemoryConfig, metadata: MemoryProviderMetadata);
    abstract store(agentId: string, memory: MemoryRecord): Promise<void>;
    storeShortTerm(agentId: string, memory: MemoryRecord, ttlMinutes?: number): Promise<void>;
    storeLongTerm(agentId: string, memory: MemoryRecord): Promise<void>;
    abstract retrieve(agentId: string, query: string, limit?: number): Promise<MemoryRecord[]>;
    retrieveShortTerm(agentId: string, query: string, limit?: number): Promise<MemoryRecord[]>;
    retrieveLongTerm(agentId: string, query: string, limit?: number): Promise<MemoryRecord[]>;
    abstract search(agentId: string, embedding: number[], limit?: number): Promise<MemoryRecord[]>;
    abstract delete(agentId: string, memoryId: string): Promise<void>;
    abstract clear(agentId: string): Promise<void>;
    abstract getStats(agentId: string): Promise<{
        total: number;
        byType: Record<string, number>;
    }>;
    abstract cleanup(agentId: string, retentionDays: number): Promise<void>;
    getMetadata(): MemoryProviderMetadata;
    getRecent(limit?: number): Promise<MemoryRecord[]>;
    protected generateId(): string;
    protected formatMemoryForStorage(memory: MemoryRecord): Record<string, unknown>;
    protected parseMemoryFromStorage(row: MemoryRow): MemoryRecord;
}
