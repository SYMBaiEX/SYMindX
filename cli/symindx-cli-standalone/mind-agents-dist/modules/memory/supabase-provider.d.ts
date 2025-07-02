import { MemoryProvider, MemoryRecord } from '../../types/agent.js';
export declare class SupabaseMemoryProvider implements MemoryProvider {
    private client;
    private embeddingModel;
    constructor(url: string, key: string, embeddingModel?: string);
    private initializeDatabase;
    store(agentId: string, memory: MemoryRecord): Promise<void>;
    retrieve(agentId: string, query: string, limit?: number): Promise<MemoryRecord[]>;
    search(agentId: string, embedding: number[], limit?: number): Promise<MemoryRecord[]>;
    delete(agentId: string, memoryId: string): Promise<void>;
    clear(agentId: string): Promise<void>;
    private rowToMemoryRecord;
    getStats(agentId: string): Promise<{
        total: number;
        byType: Record<string, number>;
    }>;
    cleanup(agentId: string, retentionDays: number): Promise<void>;
    generateEmbedding(text: string): Promise<number[]>;
}
export declare const SUPABASE_SETUP_SQL = "\n-- Enable pgvector extension\ncreate extension if not exists vector;\n\n-- Create memories table\ncreate table if not exists memories (\n  id text primary key,\n  agent_id text not null,\n  type text not null,\n  content text not null,\n  embedding vector(1536),\n  metadata jsonb default '{}',\n  importance real not null default 0.5,\n  timestamp timestamptz not null default now(),\n  tags text[] default '{}'\n);\n\n-- Create indexes\ncreate index if not exists idx_memories_agent_id on memories(agent_id);\ncreate index if not exists idx_memories_type on memories(type);\ncreate index if not exists idx_memories_timestamp on memories(timestamp);\ncreate index if not exists idx_memories_importance on memories(importance);\ncreate index if not exists idx_memories_embedding on memories using ivfflat (embedding vector_cosine_ops);\n\n-- Create RLS policies\nalter table memories enable row level security;\n\n-- Function to search memories by embedding similarity\ncreate or replace function search_memories(\n  agent_id text,\n  query_embedding vector(1536),\n  match_threshold float default 0.7,\n  match_count int default 10\n)\nreturns table (\n  id text,\n  agent_id text,\n  type text,\n  content text,\n  embedding vector(1536),\n  metadata jsonb,\n  importance real,\n  timestamp timestamptz,\n  tags text[],\n  similarity float\n)\nlanguage sql stable\nas $$\n  select\n    m.id,\n    m.agent_id,\n    m.type,\n    m.content,\n    m.embedding,\n    m.metadata,\n    m.importance,\n    m.timestamp,\n    m.tags,\n    1 - (m.embedding <=> query_embedding) as similarity\n  from memories m\n  where m.agent_id = search_memories.agent_id\n    and 1 - (m.embedding <=> query_embedding) > match_threshold\n  order by m.embedding <=> query_embedding\n  limit match_count;\n$$;\n\n-- Function to create memories table (for initialization)\ncreate or replace function create_memories_table()\nreturns void\nlanguage sql\nas $$\n  -- Table creation is handled above\n  select 1;\n$$;\n";
