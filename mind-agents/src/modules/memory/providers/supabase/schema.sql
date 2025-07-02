-- Supabase Memory Provider Schema
-- Complete schema for SYMindX memory storage with pgvector support

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create the memories table with comprehensive structure
CREATE TABLE IF NOT EXISTS memories (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    type TEXT NOT NULL,
    content TEXT NOT NULL,
    embedding VECTOR(1536),  -- OpenAI embedding dimension, can be adjusted
    metadata JSONB DEFAULT '{}',
    importance REAL NOT NULL DEFAULT 0.5 CHECK (importance >= 0 AND importance <= 1),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    tags JSONB DEFAULT '[]',
    duration TEXT NOT NULL DEFAULT 'long_term' CHECK (duration IN ('short_term', 'long_term', 'working', 'episodic')),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for optimal query performance
CREATE INDEX IF NOT EXISTS idx_memories_agent_id ON memories(agent_id);
CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type);
CREATE INDEX IF NOT EXISTS idx_memories_timestamp ON memories(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_memories_importance ON memories(importance DESC);
CREATE INDEX IF NOT EXISTS idx_memories_duration ON memories(duration);
CREATE INDEX IF NOT EXISTS idx_memories_expires_at ON memories(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_memories_created_at ON memories(created_at DESC);

-- Vector similarity search index using HNSW for better performance
CREATE INDEX IF NOT EXISTS idx_memories_embedding_hnsw ON memories 
USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

-- Full-text search index on content
CREATE INDEX IF NOT EXISTS idx_memories_content_fts ON memories 
USING gin (to_tsvector('english', content));

-- GIN index on metadata for JSON queries
CREATE INDEX IF NOT EXISTS idx_memories_metadata_gin ON memories USING gin (metadata);

-- GIN index on tags for array operations
CREATE INDEX IF NOT EXISTS idx_memories_tags_gin ON memories USING gin (tags);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_memories_agent_type_time ON memories(agent_id, type, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_memories_agent_duration_time ON memories(agent_id, duration, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_memories_agent_importance ON memories(agent_id, importance DESC);

-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_memories_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Trigger to automatically update updated_at on row updates
DROP TRIGGER IF EXISTS trigger_memories_updated_at ON memories;
CREATE TRIGGER trigger_memories_updated_at
    BEFORE UPDATE ON memories
    FOR EACH ROW
    EXECUTE FUNCTION update_memories_updated_at();

-- Function to clean up expired short-term memories
CREATE OR REPLACE FUNCTION cleanup_expired_memories()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM memories 
    WHERE duration = 'short_term' 
    AND expires_at IS NOT NULL 
    AND expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

-- Function for vector similarity search with filtering
CREATE OR REPLACE FUNCTION search_memories(
    p_agent_id TEXT,
    p_query_embedding VECTOR(1536),
    p_match_threshold FLOAT DEFAULT 0.7,
    p_match_count INTEGER DEFAULT 10,
    p_memory_type TEXT DEFAULT NULL,
    p_duration TEXT DEFAULT NULL,
    p_min_importance FLOAT DEFAULT NULL
)
RETURNS TABLE (
    id TEXT,
    agent_id TEXT,
    type TEXT,
    content TEXT,
    embedding VECTOR(1536),
    metadata JSONB,
    importance REAL,
    timestamp TIMESTAMPTZ,
    tags JSONB,
    duration TEXT,
    expires_at TIMESTAMPTZ,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.agent_id,
        m.type,
        m.content,
        m.embedding,
        m.metadata,
        m.importance,
        m.timestamp,
        m.tags,
        m.duration,
        m.expires_at,
        1 - (m.embedding <=> p_query_embedding) AS similarity
    FROM memories m
    WHERE m.agent_id = p_agent_id
    AND m.embedding IS NOT NULL
    AND (p_memory_type IS NULL OR m.type = p_memory_type)
    AND (p_duration IS NULL OR m.duration = p_duration)
    AND (p_min_importance IS NULL OR m.importance >= p_min_importance)
    AND (m.duration != 'short_term' OR m.expires_at IS NULL OR m.expires_at > NOW())
    AND 1 - (m.embedding <=> p_query_embedding) > p_match_threshold
    ORDER BY similarity DESC
    LIMIT p_match_count;
END;
$$;

-- Function for hybrid search (vector + text)
CREATE OR REPLACE FUNCTION hybrid_search_memories(
    p_agent_id TEXT,
    p_query_embedding VECTOR(1536),
    p_text_query TEXT,
    p_match_count INTEGER DEFAULT 10,
    p_vector_weight FLOAT DEFAULT 0.7,
    p_text_weight FLOAT DEFAULT 0.3
)
RETURNS TABLE (
    id TEXT,
    agent_id TEXT,
    type TEXT,
    content TEXT,
    embedding VECTOR(1536),
    metadata JSONB,
    importance REAL,
    timestamp TIMESTAMPTZ,
    tags JSONB,
    duration TEXT,
    expires_at TIMESTAMPTZ,
    combined_score FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.agent_id,
        m.type,
        m.content,
        m.embedding,
        m.metadata,
        m.importance,
        m.timestamp,
        m.tags,
        m.duration,
        m.expires_at,
        (p_vector_weight * (1 - (m.embedding <=> p_query_embedding)) + 
         p_text_weight * ts_rank(to_tsvector('english', m.content), plainto_tsquery('english', p_text_query))) AS combined_score
    FROM memories m
    WHERE m.agent_id = p_agent_id
    AND m.embedding IS NOT NULL
    AND (m.duration != 'short_term' OR m.expires_at IS NULL OR m.expires_at > NOW())
    AND (
        1 - (m.embedding <=> p_query_embedding) > 0.5 
        OR to_tsvector('english', m.content) @@ plainto_tsquery('english', p_text_query)
    )
    ORDER BY combined_score DESC
    LIMIT p_match_count;
END;
$$;

-- Function to get memory statistics for an agent
CREATE OR REPLACE FUNCTION get_memory_stats(p_agent_id TEXT)
RETURNS TABLE (
    total_memories INTEGER,
    short_term_count INTEGER,
    long_term_count INTEGER,
    working_count INTEGER,
    episodic_count INTEGER,
    avg_importance FLOAT,
    earliest_memory TIMESTAMPTZ,
    latest_memory TIMESTAMPTZ,
    memories_with_embeddings INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_memories,
        COUNT(*) FILTER (WHERE duration = 'short_term')::INTEGER as short_term_count,
        COUNT(*) FILTER (WHERE duration = 'long_term')::INTEGER as long_term_count,
        COUNT(*) FILTER (WHERE duration = 'working')::INTEGER as working_count,
        COUNT(*) FILTER (WHERE duration = 'episodic')::INTEGER as episodic_count,
        AVG(importance)::FLOAT as avg_importance,
        MIN(timestamp) as earliest_memory,
        MAX(timestamp) as latest_memory,
        COUNT(*) FILTER (WHERE embedding IS NOT NULL)::INTEGER as memories_with_embeddings
    FROM memories
    WHERE agent_id = p_agent_id
    AND (duration != 'short_term' OR expires_at IS NULL OR expires_at > NOW());
END;
$$;

-- Function to archive old memories to a separate table
CREATE TABLE IF NOT EXISTS memories_archive (
    LIKE memories INCLUDING ALL
);

CREATE OR REPLACE FUNCTION archive_old_memories(
    p_agent_id TEXT,
    p_retention_days INTEGER DEFAULT 90
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    archived_count INTEGER;
BEGIN
    -- Move old memories to archive table
    WITH archived_memories AS (
        DELETE FROM memories
        WHERE agent_id = p_agent_id
        AND timestamp < NOW() - INTERVAL '1 day' * p_retention_days
        AND duration != 'long_term'  -- Never archive long-term memories
        RETURNING *
    )
    INSERT INTO memories_archive SELECT * FROM archived_memories;
    
    GET DIAGNOSTICS archived_count = ROW_COUNT;
    RETURN archived_count;
END;
$$;

-- Row Level Security (RLS) policies for multi-tenant security
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;

-- Policy to ensure agents can only access their own memories
CREATE POLICY memories_agent_isolation ON memories
    FOR ALL USING (auth.uid()::text = agent_id OR auth.role() = 'service_role');

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON TABLE memories TO anon, authenticated;
GRANT ALL ON TABLE memories_archive TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Create a view for easy memory querying with computed fields
CREATE OR REPLACE VIEW memories_enriched AS
SELECT 
    m.*,
    CASE 
        WHEN m.duration = 'short_term' AND m.expires_at IS NOT NULL AND m.expires_at <= NOW() 
        THEN true 
        ELSE false 
    END as is_expired,
    EXTRACT(EPOCH FROM (NOW() - m.timestamp))/3600 as age_hours,
    array_length(m.tags::json->0, 1) as tag_count,
    jsonb_object_keys(m.metadata) as metadata_keys
FROM memories m;

-- Create a materialized view for frequently accessed memory summaries
CREATE MATERIALIZED VIEW IF NOT EXISTS memory_agent_summary AS
SELECT 
    agent_id,
    COUNT(*) as total_memories,
    COUNT(*) FILTER (WHERE duration = 'short_term') as short_term_count,
    COUNT(*) FILTER (WHERE duration = 'long_term') as long_term_count,
    AVG(importance) as avg_importance,
    MAX(timestamp) as last_memory_time,
    COUNT(*) FILTER (WHERE embedding IS NOT NULL) as memories_with_embeddings
FROM memories
WHERE duration != 'short_term' OR expires_at IS NULL OR expires_at > NOW()
GROUP BY agent_id;

-- Create index on the materialized view
CREATE UNIQUE INDEX idx_memory_agent_summary_agent_id ON memory_agent_summary(agent_id);

-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_memory_summary()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY memory_agent_summary;
END;
$$;

-- Comments for documentation
COMMENT ON TABLE memories IS 'Core table for storing agent memories with vector embeddings and metadata';
COMMENT ON COLUMN memories.embedding IS 'Vector embedding for semantic similarity search';
COMMENT ON COLUMN memories.importance IS 'Importance score from 0.0 to 1.0 for memory prioritization';
COMMENT ON COLUMN memories.duration IS 'Memory duration type: short_term, long_term, working, or episodic';
COMMENT ON COLUMN memories.expires_at IS 'Expiration timestamp for short-term memories';
COMMENT ON FUNCTION search_memories IS 'Vector similarity search with filtering options';
COMMENT ON FUNCTION hybrid_search_memories IS 'Combined vector and text search with weighted scoring';