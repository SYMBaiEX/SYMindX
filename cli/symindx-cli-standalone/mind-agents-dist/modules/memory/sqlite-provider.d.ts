import { MemoryProvider, MemoryRecord } from '../../types/agent.js';
export declare class SQLiteMemoryProvider implements MemoryProvider {
    private db;
    private embeddingModel;
    constructor(dbPath: string, embeddingModel?: string);
    private initializeDatabase;
    store(agentId: string, memory: MemoryRecord): Promise<void>;
    retrieve(agentId: string, query: string, limit?: number): Promise<MemoryRecord[]>;
    search(agentId: string, embedding: number[], limit?: number): Promise<MemoryRecord[]>;
    delete(agentId: string, memoryId: string): Promise<void>;
    clear(agentId: string): Promise<void>;
    private rowToMemoryRecord;
    close(): void;
    getStats(agentId: string): {
        total: number;
        byType: Record<string, number>;
    };
    cleanup(agentId: string, retentionDays: number): void;
}
