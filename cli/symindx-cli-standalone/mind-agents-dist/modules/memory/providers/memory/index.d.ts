import { MemoryRecord } from '../../../../types/agent.js';
import { BaseMemoryProvider, BaseMemoryConfig } from '../../base-memory-provider.js';
export interface InMemoryConfig extends BaseMemoryConfig {
    maxMemoriesPerAgent?: number;
    enablePersistence?: boolean;
    persistencePath?: string;
    autoSaveInterval?: number;
    enableAutoCleanup?: boolean;
    cleanupInterval?: number;
}
export declare class InMemoryProvider extends BaseMemoryProvider {
    private storage;
    protected config: InMemoryConfig;
    private autoSaveTimer?;
    private cleanupTimer?;
    constructor(config?: InMemoryConfig);
    private initialize;
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
    exportMemories(agentId?: string): Promise<Record<string, MemoryRecord[]>>;
    importMemories(data: Record<string, MemoryRecord[]>): Promise<void>;
    getProviderStats(): {
        totalAgents: number;
        totalMemories: number;
        memoryUsage: number;
        oldestMemory?: Date;
        newestMemory?: Date;
    };
    private calculateCosineSimilarity;
    private calculateTextSimilarity;
    private evictOldMemories;
    private performAutoCleanup;
    private saveToDisk;
    private loadFromDisk;
    disconnect(): Promise<void>;
}
export declare function createInMemoryProvider(config?: InMemoryConfig): InMemoryProvider;
export declare function createDefaultInMemoryProvider(): InMemoryProvider;
