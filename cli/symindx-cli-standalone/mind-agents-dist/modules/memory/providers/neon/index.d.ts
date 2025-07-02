import { MemoryRecord } from '../../../../types/agent.js';
import { BaseMemoryProvider, BaseMemoryConfig } from '../../base-memory-provider.js';
export interface NeonMemoryConfig extends BaseMemoryConfig {
    connectionString: string;
    maxConnections?: number;
    connectionTimeoutMillis?: number;
    idleTimeoutMillis?: number;
    ssl?: boolean;
    tableName?: string;
}
export interface NeonMemoryRow {
    id: string;
    agent_id: string;
    type: string;
    content: string;
    embedding?: number[];
    metadata: Record<string, any>;
    importance: number;
    timestamp: Date;
    tags: string[];
    duration: string;
    expires_at?: Date;
    created_at: Date;
    updated_at: Date;
}
export declare class NeonMemoryProvider extends BaseMemoryProvider {
    private pool;
    protected config: NeonMemoryConfig;
    private tableName;
    private isInitialized;
    constructor(config: NeonMemoryConfig);
    private initialize;
    private createMemoriesTable;
    private createIndexes;
    private createVectorFunctions;
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
    healthCheck(): Promise<{
        healthy: boolean;
        latency: number;
    }>;
    getPoolStatus(): {
        total: number;
        idle: number;
        waiting: number;
    };
    disconnect(): Promise<void>;
}
export declare function createNeonMemoryProvider(config: NeonMemoryConfig): NeonMemoryProvider;
export declare function createNeonConnectionString(endpoint: string, database: string, username: string, password: string, options?: Record<string, string>): string;
