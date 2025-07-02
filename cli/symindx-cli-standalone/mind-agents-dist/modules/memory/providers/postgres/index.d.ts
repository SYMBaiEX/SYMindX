import { MemoryRecord } from '../../../../types/agent.js';
import { BaseMemoryProvider, BaseMemoryConfig } from '../../base-memory-provider.js';
export interface PostgresMemoryConfig extends BaseMemoryConfig {
    connectionString: string;
    maxConnections?: number;
    connectionTimeoutMillis?: number;
    idleTimeoutMillis?: number;
    ssl?: boolean;
    tableName?: string;
    autoDeploySchema?: boolean;
    enablePooling?: boolean;
}
export interface PostgresMemoryRow {
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
export declare class PostgresMemoryProvider extends BaseMemoryProvider {
    private pool;
    protected config: PostgresMemoryConfig;
    private tableName;
    private isInitialized;
    private schemaVersion;
    constructor(config: PostgresMemoryConfig);
    private initialize;
    private testConnection;
    private deploySchema;
    private enableExtensions;
    private createMemoriesTable;
    private createIndexes;
    private createFunctions;
    private createTriggers;
    private createSchemaVersioning;
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
        version?: string;
    }>;
    getPoolStatus(): {
        total: number;
        idle: number;
        waiting: number;
    };
    getSchemaInfo(): Promise<{
        version: string;
        tables: string[];
        functions: string[];
    }>;
    disconnect(): Promise<void>;
}
export declare function createPostgresMemoryProvider(config: PostgresMemoryConfig): PostgresMemoryProvider;
export declare function createPostgresConnectionString(host: string, port: number, database: string, username: string, password: string, options?: Record<string, string>): string;
export declare function createDefaultPostgresProvider(connectionString: string): PostgresMemoryProvider;
