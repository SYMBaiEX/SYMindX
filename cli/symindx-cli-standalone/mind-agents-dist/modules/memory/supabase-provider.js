import { createClient } from '@supabase/supabase-js';
export class SupabaseMemoryProvider {
    constructor(url, key, embeddingModel = 'text-embedding-ada-002') {
        this.client = createClient(url, key);
        this.embeddingModel = embeddingModel;
        this.initializeDatabase();
    }
    async initializeDatabase() {
        try {
            // Create memories table with pgvector support
            const { error } = await this.client.rpc('create_memories_table');
            if (error && !error.message.includes('already exists')) {
                console.error('❌ Failed to create memories table:', error);
            }
            else {
                console.log('✅ Supabase memory database initialized');
            }
        }
        catch (error) {
            console.warn('⚠️ Could not initialize database schema, assuming it exists');
        }
    }
    async store(agentId, memory) {
        const { error } = await this.client
            .from('memories')
            .upsert({
            id: memory.id,
            agent_id: agentId,
            type: memory.type,
            content: memory.content,
            embedding: memory.embedding,
            metadata: memory.metadata,
            importance: memory.importance,
            timestamp: memory.timestamp.toISOString(),
            tags: memory.tags
        });
        if (error) {
            throw new Error(`Failed to store memory: ${error.message}`);
        }
        console.log(`💾 Stored memory: ${memory.type} for agent ${agentId}`);
    }
    async retrieve(agentId, query, limit = 10) {
        let supabaseQuery = this.client
            .from('memories')
            .select('*')
            .eq('agent_id', agentId)
            .limit(limit);
        if (query === 'recent') {
            supabaseQuery = supabaseQuery.order('timestamp', { ascending: false });
        }
        else if (query === 'important') {
            supabaseQuery = supabaseQuery.order('importance', { ascending: false });
        }
        else {
            // Text search in content
            supabaseQuery = supabaseQuery
                .textSearch('content', query)
                .order('importance', { ascending: false });
        }
        const { data, error } = await supabaseQuery;
        if (error) {
            throw new Error(`Failed to retrieve memories: ${error.message}`);
        }
        return (data || []).map(row => this.rowToMemoryRecord(row));
    }
    async search(agentId, embedding, limit = 10) {
        try {
            // Use pgvector similarity search
            const { data, error } = await this.client.rpc('search_memories', {
                agent_id: agentId,
                query_embedding: embedding,
                match_threshold: 0.7,
                match_count: limit
            });
            if (error) {
                console.warn('⚠️ Vector search failed, falling back to recent memories:', error.message);
                return this.retrieve(agentId, 'recent', limit);
            }
            return (data || []).map(row => this.rowToMemoryRecord(row));
        }
        catch (error) {
            console.warn('⚠️ Vector search not available, falling back to recent memories');
            return this.retrieve(agentId, 'recent', limit);
        }
    }
    async delete(agentId, memoryId) {
        const { error } = await this.client
            .from('memories')
            .delete()
            .eq('agent_id', agentId)
            .eq('id', memoryId);
        if (error) {
            throw new Error(`Failed to delete memory: ${error.message}`);
        }
        console.log(`🗑️ Deleted memory: ${memoryId} for agent ${agentId}`);
    }
    async clear(agentId) {
        const { error } = await this.client
            .from('memories')
            .delete()
            .eq('agent_id', agentId);
        if (error) {
            throw new Error(`Failed to clear memories: ${error.message}`);
        }
        console.log(`🧹 Cleared all memories for agent ${agentId}`);
    }
    rowToMemoryRecord(row) {
        return {
            id: row.id,
            agentId: row.agent_id,
            type: row.type,
            content: row.content,
            embedding: row.embedding,
            metadata: row.metadata || {},
            importance: row.importance,
            timestamp: new Date(row.timestamp),
            tags: row.tags || []
        };
    }
    // Utility methods
    async getStats(agentId) {
        const { data: totalData, error: totalError } = await this.client
            .from('memories')
            .select('id', { count: 'exact' })
            .eq('agent_id', agentId);
        if (totalError) {
            throw new Error(`Failed to get memory stats: ${totalError.message}`);
        }
        const { data: typeData, error: typeError } = await this.client
            .from('memories')
            .select('type')
            .eq('agent_id', agentId);
        if (typeError) {
            throw new Error(`Failed to get memory type stats: ${typeError.message}`);
        }
        const byType = {};
        typeData?.forEach(row => {
            byType[row.type] = (byType[row.type] || 0) + 1;
        });
        return {
            total: totalData?.length || 0,
            byType
        };
    }
    async cleanup(agentId, retentionDays) {
        const cutoffDate = new Date(Date.now() - (retentionDays * 24 * 60 * 60 * 1000));
        const { error } = await this.client
            .from('memories')
            .delete()
            .eq('agent_id', agentId)
            .lt('timestamp', cutoffDate.toISOString())
            .lt('importance', 0.7);
        if (error) {
            throw new Error(`Failed to cleanup memories: ${error.message}`);
        }
        console.log(`🧹 Cleaned up old memories for agent ${agentId}`);
    }
    // Generate embedding using OpenAI (or other service)
    async generateEmbedding(text) {
        // This would typically call OpenAI's embedding API
        // For now, return a mock embedding
        console.warn('⚠️ Mock embedding generated - implement OpenAI integration');
        return new Array(1536).fill(0).map(() => Math.random() - 0.5);
    }
}
// SQL functions that should be created in Supabase
export const SUPABASE_SETUP_SQL = `
-- Enable pgvector extension
create extension if not exists vector;

-- Create memories table
create table if not exists memories (
  id text primary key,
  agent_id text not null,
  type text not null,
  content text not null,
  embedding vector(1536),
  metadata jsonb default '{}',
  importance real not null default 0.5,
  timestamp timestamptz not null default now(),
  tags text[] default '{}'
);

-- Create indexes
create index if not exists idx_memories_agent_id on memories(agent_id);
create index if not exists idx_memories_type on memories(type);
create index if not exists idx_memories_timestamp on memories(timestamp);
create index if not exists idx_memories_importance on memories(importance);
create index if not exists idx_memories_embedding on memories using ivfflat (embedding vector_cosine_ops);

-- Create RLS policies
alter table memories enable row level security;

-- Function to search memories by embedding similarity
create or replace function search_memories(
  agent_id text,
  query_embedding vector(1536),
  match_threshold float default 0.7,
  match_count int default 10
)
returns table (
  id text,
  agent_id text,
  type text,
  content text,
  embedding vector(1536),
  metadata jsonb,
  importance real,
  timestamp timestamptz,
  tags text[],
  similarity float
)
language sql stable
as $$
  select
    m.id,
    m.agent_id,
    m.type,
    m.content,
    m.embedding,
    m.metadata,
    m.importance,
    m.timestamp,
    m.tags,
    1 - (m.embedding <=> query_embedding) as similarity
  from memories m
  where m.agent_id = search_memories.agent_id
    and 1 - (m.embedding <=> query_embedding) > match_threshold
  order by m.embedding <=> query_embedding
  limit match_count;
$$;

-- Function to create memories table (for initialization)
create or replace function create_memories_table()
returns void
language sql
as $$
  -- Table creation is handled above
  select 1;
$$;
`;
