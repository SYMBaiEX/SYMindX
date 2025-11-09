-- SYMindX Vector Database Initialization for pgvector

-- Create vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create memory schema tables with vector support
CREATE TABLE IF NOT EXISTS memory.embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID REFERENCES symindx.agents(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding vector(3072), -- OpenAI text-embedding-3-large dimensions
    metadata JSONB NOT NULL DEFAULT '{}',
    memory_type VARCHAR(50) NOT NULL, -- 'social', 'knowledge', 'experience'
    memory_layer VARCHAR(20) NOT NULL DEFAULT 'working', -- 'working', 'short-term', 'long-term'
    importance_score FLOAT DEFAULT 0.5,
    platform VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS memory.memory_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_memory_id UUID REFERENCES memory.embeddings(id) ON DELETE CASCADE,
    target_memory_id UUID REFERENCES memory.embeddings(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) NOT NULL, -- 'related', 'caused_by', 'leads_to', 'similar'
    strength FLOAT DEFAULT 0.5,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(source_memory_id, target_memory_id, relationship_type)
);

CREATE TABLE IF NOT EXISTS memory.memory_clusters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID REFERENCES symindx.agents(id) ON DELETE CASCADE,
    cluster_name VARCHAR(255) NOT NULL,
    cluster_description TEXT,
    centroid_embedding vector(3072),
    memory_ids UUID[] NOT NULL,
    cluster_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS memory.conversation_contexts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID REFERENCES symindx.agents(id) ON DELETE CASCADE,
    conversation_id VARCHAR(255) NOT NULL,
    platform VARCHAR(100) NOT NULL,
    participants TEXT[] NOT NULL,
    context_summary TEXT,
    context_embedding vector(3072),
    message_count INTEGER DEFAULT 0,
    last_message_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(agent_id, conversation_id, platform)
);

-- Create indexes for vector similarity search
CREATE INDEX IF NOT EXISTS idx_embeddings_agent_id ON memory.embeddings(agent_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_memory_type ON memory.embeddings(memory_type);
CREATE INDEX IF NOT EXISTS idx_embeddings_memory_layer ON memory.embeddings(memory_layer);
CREATE INDEX IF NOT EXISTS idx_embeddings_platform ON memory.embeddings(platform);
CREATE INDEX IF NOT EXISTS idx_embeddings_importance ON memory.embeddings(importance_score DESC);
CREATE INDEX IF NOT EXISTS idx_embeddings_created_at ON memory.embeddings(created_at);

-- Vector similarity indexes using HNSW
CREATE INDEX IF NOT EXISTS idx_embeddings_vector_cosine ON memory.embeddings 
    USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_embeddings_vector_l2 ON memory.embeddings 
    USING hnsw (embedding vector_l2_ops) WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_clusters_centroid_cosine ON memory.memory_clusters 
    USING hnsw (centroid_embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_conversation_context_embedding ON memory.conversation_contexts 
    USING hnsw (context_embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

-- Indexes for relationships
CREATE INDEX IF NOT EXISTS idx_memory_relationships_source ON memory.memory_relationships(source_memory_id);
CREATE INDEX IF NOT EXISTS idx_memory_relationships_target ON memory.memory_relationships(target_memory_id);
CREATE INDEX IF NOT EXISTS idx_memory_relationships_type ON memory.memory_relationships(relationship_type);
CREATE INDEX IF NOT EXISTS idx_memory_relationships_strength ON memory.memory_relationships(strength DESC);

-- Indexes for clusters
CREATE INDEX IF NOT EXISTS idx_memory_clusters_agent_id ON memory.memory_clusters(agent_id);
CREATE INDEX IF NOT EXISTS idx_memory_clusters_name ON memory.memory_clusters(cluster_name);

-- Indexes for conversation contexts
CREATE INDEX IF NOT EXISTS idx_conversation_contexts_agent_id ON memory.conversation_contexts(agent_id);
CREATE INDEX IF NOT EXISTS idx_conversation_contexts_platform ON memory.conversation_contexts(platform);
CREATE INDEX IF NOT EXISTS idx_conversation_contexts_conversation_id ON memory.conversation_contexts(conversation_id);

-- GIN indexes for JSONB and array columns
CREATE INDEX IF NOT EXISTS idx_embeddings_metadata_gin ON memory.embeddings USING GIN(metadata);
CREATE INDEX IF NOT EXISTS idx_clusters_metadata_gin ON memory.memory_clusters USING GIN(cluster_metadata);
CREATE INDEX IF NOT EXISTS idx_clusters_memory_ids_gin ON memory.memory_clusters USING GIN(memory_ids);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_gin ON memory.conversation_contexts USING GIN(participants);

-- Create update triggers
DROP TRIGGER IF EXISTS update_embeddings_updated_at ON memory.embeddings;
CREATE TRIGGER update_embeddings_updated_at
    BEFORE UPDATE ON memory.embeddings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_clusters_updated_at ON memory.memory_clusters;
CREATE TRIGGER update_clusters_updated_at
    BEFORE UPDATE ON memory.memory_clusters
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_conversation_contexts_updated_at ON memory.conversation_contexts;
CREATE TRIGGER update_conversation_contexts_updated_at
    BEFORE UPDATE ON memory.conversation_contexts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create functions for vector operations
CREATE OR REPLACE FUNCTION memory.find_similar_memories(
    query_embedding vector(3072),
    agent_uuid UUID,
    memory_types TEXT[] DEFAULT NULL,
    similarity_threshold FLOAT DEFAULT 0.7,
    max_results INTEGER DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    similarity FLOAT,
    memory_type VARCHAR(50),
    memory_layer VARCHAR(20),
    importance_score FLOAT,
    platform VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.content,
        1 - (e.embedding <=> query_embedding) AS similarity,
        e.memory_type,
        e.memory_layer,
        e.importance_score,
        e.platform,
        e.created_at
    FROM memory.embeddings e
    WHERE e.agent_id = agent_uuid
        AND (memory_types IS NULL OR e.memory_type = ANY(memory_types))
        AND 1 - (e.embedding <=> query_embedding) >= similarity_threshold
        AND (e.expires_at IS NULL OR e.expires_at > NOW())
    ORDER BY e.embedding <=> query_embedding
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION memory.find_contextual_memories(
    query_embedding vector(3072),
    agent_uuid UUID,
    conversation_id_param VARCHAR(255),
    platform_param VARCHAR(100),
    max_results INTEGER DEFAULT 5
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    similarity FLOAT,
    memory_type VARCHAR(50),
    context_relevance FLOAT
) AS $$
BEGIN
    RETURN QUERY
    WITH conversation_context AS (
        SELECT context_embedding
        FROM memory.conversation_contexts cc
        WHERE cc.agent_id = agent_uuid 
            AND cc.conversation_id = conversation_id_param
            AND cc.platform = platform_param
    )
    SELECT 
        e.id,
        e.content,
        1 - (e.embedding <=> query_embedding) AS similarity,
        e.memory_type,
        CASE 
            WHEN cc.context_embedding IS NOT NULL THEN
                1 - (e.embedding <=> cc.context_embedding)
            ELSE 0.0
        END AS context_relevance
    FROM memory.embeddings e
    CROSS JOIN conversation_context cc
    WHERE e.agent_id = agent_uuid
        AND (e.platform = platform_param OR e.platform IS NULL)
        AND (e.expires_at IS NULL OR e.expires_at > NOW())
    ORDER BY 
        (1 - (e.embedding <=> query_embedding)) * 0.7 + 
        (CASE WHEN cc.context_embedding IS NOT NULL THEN 1 - (e.embedding <=> cc.context_embedding) ELSE 0 END) * 0.3 DESC
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA memory TO symindx_app;
GRANT SELECT ON ALL TABLES IN SCHEMA memory TO symindx_readonly;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA memory TO symindx_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA memory TO symindx_app, symindx_readonly;