import { MemoryRecord } from '../../../../types/agent.js';
import { BaseMemoryProvider, BaseMemoryConfig } from '../../base-memory-provider.js';
export interface SupabaseMemoryConfig extends BaseMemoryConfig {
    url: string;
    anonKey: string;
    schema?: string;
    enableRealtime?: boolean;
    tableName?: string;
}
export interface SupabaseMemoryRow {
    id: string;
    agent_id: string;
    type: string;
    content: string;
    embedding?: number[];
    metadata: Record<string, any>;
    importance: number;
    timestamp: string;
    tags: string[];
    duration: string;
    expires_at?: string;
    created_at: string;
    updated_at: string;
}
export declare class SupabaseMemoryProvider extends BaseMemoryProvider {
    private client;
    protected config: SupabaseMemoryConfig;
    private realtimeChannel?;
    private tableName;
    constructor(config: SupabaseMemoryConfig);
    private initializeDatabase;
    private createMemoriesTable;
    private setupRealtimeSubscription;
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
    private emit;
    disconnect(): Promise<void>;
}
export declare function createSupabaseMemoryProvider(config: SupabaseMemoryConfig): SupabaseMemoryProvider;
export declare const SUPABASE_MEMORY_MIGRATION = "\n-- Enable the pgvector extension\nCREATE EXTENSION IF NOT EXISTS vector;\n\n-- Create the memories table\nCREATE TABLE IF NOT EXISTS memories (\n    id TEXT PRIMARY KEY,\n    agent_id TEXT NOT NULL,\n    type TEXT NOT NULL,\n    content TEXT NOT NULL,\n    embedding vector(1536), -- OpenAI embedding dimension\n    metadata JSONB DEFAULT '{}',\n    importance REAL NOT NULL DEFAULT 0.5,\n    timestamp TIMESTAMPTZ NOT NULL,\n    tags TEXT[] DEFAULT '{}',\n    duration TEXT NOT NULL DEFAULT 'long_term',\n    expires_at TIMESTAMPTZ,\n    created_at TIMESTAMPTZ DEFAULT NOW(),\n    updated_at TIMESTAMPTZ DEFAULT NOW()\n);\n\n-- Create indexes for performance\nCREATE INDEX IF NOT EXISTS idx_memories_agent_id ON memories(agent_id);\nCREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type);\nCREATE INDEX IF NOT EXISTS idx_memories_timestamp ON memories(timestamp);\nCREATE INDEX IF NOT EXISTS idx_memories_importance ON memories(importance);\nCREATE INDEX IF NOT EXISTS idx_memories_duration ON memories(duration);\nCREATE INDEX IF NOT EXISTS idx_memories_expires_at ON memories(expires_at);\n\n-- Create vector similarity index\nCREATE INDEX IF NOT EXISTS idx_memories_embedding ON memories USING ivfflat (embedding vector_cosine_ops);\n\n-- Function to search memories by vector similarity\nCREATE OR REPLACE FUNCTION match_memories(\n    agent_id TEXT,\n    query_embedding vector(1536),\n    match_threshold FLOAT DEFAULT 0.7,\n    match_count INT DEFAULT 10\n)\nRETURNS TABLE (\n    id TEXT,\n    agent_id TEXT,\n    type TEXT,\n    content TEXT,\n    embedding vector(1536),\n    metadata JSONB,\n    importance REAL,\n    timestamp TIMESTAMPTZ,\n    tags TEXT[],\n    duration TEXT,\n    expires_at TIMESTAMPTZ,\n    created_at TIMESTAMPTZ,\n    updated_at TIMESTAMPTZ,\n    similarity FLOAT\n)\nLANGUAGE SQL\nSTABLE\nAS $$\n    SELECT \n        m.id,\n        m.agent_id,\n        m.type,\n        m.content,\n        m.embedding,\n        m.metadata,\n        m.importance,\n        m.timestamp,\n        m.tags,\n        m.duration,\n        m.expires_at,\n        m.created_at,\n        m.updated_at,\n        1 - (m.embedding <=> query_embedding) AS similarity\n    FROM memories m\n    WHERE \n        m.agent_id = match_memories.agent_id\n        AND (m.duration != 'short_term' OR m.expires_at IS NULL OR m.expires_at > NOW())\n        AND m.embedding IS NOT NULL\n        AND 1 - (m.embedding <=> query_embedding) > match_threshold\n    ORDER BY similarity DESC\n    LIMIT match_count;\n$$;\n\n-- Function to create memories table (callable via RPC)\nCREATE OR REPLACE FUNCTION create_memories_table_if_not_exists(table_name TEXT DEFAULT 'memories')\nRETURNS VOID\nLANGUAGE plpgsql\nAS $$\nBEGIN\n    -- This function ensures the table exists\n    -- The actual table creation is handled by the main migration above\n    RAISE NOTICE 'Memories table initialization checked';\nEND;\n$$;\n\n-- Function to get available extensions (callable via RPC)\nCREATE OR REPLACE FUNCTION get_extensions()\nRETURNS TABLE (name TEXT)\nLANGUAGE SQL\nSTABLE\nAS $$\n    SELECT extname::TEXT as name FROM pg_extension;\n$$;\n\n-- Update timestamp trigger\nCREATE OR REPLACE FUNCTION update_updated_at_column()\nRETURNS TRIGGER AS $$\nBEGIN\n    NEW.updated_at = NOW();\n    RETURN NEW;\nEND;\n$$ language 'plpgsql';\n\nCREATE OR REPLACE TRIGGER update_memories_updated_at \n    BEFORE UPDATE ON memories \n    FOR EACH ROW \n    EXECUTE FUNCTION update_updated_at_column();\n";
