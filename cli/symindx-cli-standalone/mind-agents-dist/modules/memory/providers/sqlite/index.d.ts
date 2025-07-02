import { MemoryRecord } from '../../../../types/agent.js';
import { BaseMemoryProvider, BaseMemoryConfig, MemoryRow } from '../../base-memory-provider.js';
export interface SQLiteMemoryConfig extends BaseMemoryConfig {
    dbPath: string;
    createTables?: boolean;
}
export interface SQLiteMemoryRow extends MemoryRow {
    embedding?: Buffer;
}
export declare class SQLiteMemoryProvider extends BaseMemoryProvider {
    private db;
    constructor(config: SQLiteMemoryConfig);
    private initializeDatabase;
    store(agentId: string, memory: MemoryRecord): Promise<void>;
    retrieve(agentId: string, query: string, limit?: number): Promise<MemoryRecord[]>;
    search(agentId: string, embedding: number[], limit?: number): Promise<MemoryRecord[]>;
    delete(agentId: string, memoryId: string): Promise<void>;
    clear(agentId: string): Promise<void>;
    getStats(agentId: string): Promise<{
        total: number;
        byType: Record<string, number>;
    }>;
    cleanup(agentId: string, retentionDays: number): Promise<void>;
    private rowToMemoryRecord;
}
export declare function createSQLiteMemoryProvider(config: SQLiteMemoryConfig): SQLiteMemoryProvider;
