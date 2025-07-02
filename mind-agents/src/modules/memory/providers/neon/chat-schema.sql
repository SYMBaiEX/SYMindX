-- SYMindX Chat System Database Schema for Neon (PostgreSQL-compatible)
-- Version: 1.0.0
-- Description: Complete chat system schema optimized for Neon with connection pooling and serverless features

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable full-text search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Enable vector operations (if available)
CREATE EXTENSION IF NOT EXISTS "vector";

-- ===================================================================
-- CONVERSATIONS TABLE
-- ===================================================================
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    title TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_message_at TIMESTAMPTZ,
    message_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    
    -- Soft delete support
    deleted_at TIMESTAMPTZ,
    deleted_by VARCHAR(255)
);

-- ===================================================================
-- MESSAGES TABLE
-- ===================================================================
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('user', 'agent', 'system')),
    sender_id VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    message_type VARCHAR(20) NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'command', 'action', 'notification', 'error')),
    
    -- Message metadata
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    edited_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    
    -- Agent-specific fields
    emotion_state JSONB,
    thought_process JSONB,
    confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    
    -- Memory integration
    memory_references JSONB DEFAULT '[]',
    created_memories JSONB DEFAULT '[]',
    
    -- Status tracking
    status VARCHAR(20) NOT NULL DEFAULT 'sent' CHECK (status IN ('draft', 'sending', 'sent', 'delivered', 'read', 'failed')),
    read_at TIMESTAMPTZ,
    
    -- Soft delete support
    deleted_at TIMESTAMPTZ,
    deleted_by VARCHAR(255),
    
    -- Full-text search vector
    search_vector tsvector,
    
    -- Vector embedding (optional, depends on vector extension availability)
    embedding vector(1536)
);

-- ===================================================================
-- PARTICIPANTS TABLE
-- ===================================================================
CREATE TABLE IF NOT EXISTS participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    participant_type VARCHAR(20) NOT NULL CHECK (participant_type IN ('user', 'agent')),
    participant_id VARCHAR(255) NOT NULL,
    participant_name VARCHAR(255),
    
    -- Participation details
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    left_at TIMESTAMPTZ,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'observer')),
    
    -- Activity tracking
    last_seen_at TIMESTAMPTZ,
    last_typed_at TIMESTAMPTZ,
    message_count INTEGER DEFAULT 0,
    
    -- Preferences
    notifications_enabled BOOLEAN DEFAULT TRUE,
    preferences JSONB DEFAULT '{}',
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'banned')),
    
    UNIQUE(conversation_id, participant_id)
);

-- ===================================================================
-- MESSAGE_REACTIONS TABLE
-- ===================================================================
CREATE TABLE IF NOT EXISTS message_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL,
    reaction VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(message_id, user_id, reaction)
);

-- ===================================================================
-- CONVERSATION_TAGS TABLE
-- ===================================================================
CREATE TABLE IF NOT EXISTS conversation_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    tag VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(255) NOT NULL,
    
    UNIQUE(conversation_id, tag)
);

-- ===================================================================
-- MESSAGE_ATTACHMENTS TABLE
-- ===================================================================
CREATE TABLE IF NOT EXISTS message_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    attachment_type VARCHAR(20) NOT NULL CHECK (attachment_type IN ('image', 'file', 'link', 'code', 'memory')),
    filename VARCHAR(255),
    mime_type VARCHAR(100),
    size BIGINT,
    url TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===================================================================
-- CHAT_SESSIONS TABLE
-- ===================================================================
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    connection_id VARCHAR(255),
    
    -- Session tracking
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    
    -- Client information
    client_info JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT
);

-- ===================================================================
-- ANALYTICS_EVENTS TABLE
-- ===================================================================
CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(100) NOT NULL,
    conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    user_id VARCHAR(255),
    agent_id VARCHAR(255),
    
    -- Event data
    event_data JSONB DEFAULT '{}',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Performance metrics
    processing_time INTEGER, -- milliseconds
    tokens_used INTEGER
);

-- ===================================================================
-- INDEXES FOR PERFORMANCE (Optimized for Neon's serverless architecture)
-- ===================================================================

-- Core conversation indexes
CREATE INDEX IF NOT EXISTS idx_conversations_agent_id ON conversations(agent_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON conversations(last_message_at DESC);

-- Optimized composite indexes for serverless queries
CREATE INDEX IF NOT EXISTS idx_conversations_user_status_updated ON conversations(user_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_agent_status_updated ON conversations(agent_id, status, updated_at DESC);

-- Message indexes optimized for chat queries
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_timestamp ON messages(conversation_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender_type_time ON messages(sender_type, timestamp DESC) WHERE deleted_at IS NULL;

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_messages_search_vector ON messages USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_messages_content_gin ON messages USING GIN(content gin_trgm_ops);

-- Vector similarity index (if vector extension is available)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_messages_embedding ON messages USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)';
    END IF;
END $$;

-- Participant indexes
CREATE INDEX IF NOT EXISTS idx_participants_conversation_id ON participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_participants_participant_id ON participants(participant_id);
CREATE INDEX IF NOT EXISTS idx_participants_type_status ON participants(participant_type, status);

-- Session indexes for connection management
CREATE INDEX IF NOT EXISTS idx_sessions_user_conversation ON chat_sessions(user_id, conversation_id);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON chat_sessions(ended_at) WHERE ended_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_last_activity ON chat_sessions(last_activity_at DESC);

-- Analytics indexes for performance monitoring
CREATE INDEX IF NOT EXISTS idx_analytics_event_type_time ON analytics_events(event_type, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_conversation_time ON analytics_events(conversation_id, timestamp DESC);

-- ===================================================================
-- TRIGGERS AND FUNCTIONS (Optimized for Neon)
-- ===================================================================

-- Function to update search vector for messages
CREATE OR REPLACE FUNCTION update_message_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := to_tsvector('english', NEW.content);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update search vector
DROP TRIGGER IF EXISTS trigger_update_message_search_vector ON messages;
CREATE TRIGGER trigger_update_message_search_vector
    BEFORE INSERT OR UPDATE ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_message_search_vector();

-- Function to update conversation metadata on message insert
CREATE OR REPLACE FUNCTION update_conversation_on_message_insert()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.deleted_at IS NULL THEN
        UPDATE conversations
        SET last_message_at = NEW.timestamp,
            message_count = message_count + 1,
            updated_at = NOW()
        WHERE id = NEW.conversation_id;
        
        -- Update participant message count
        UPDATE participants
        SET message_count = message_count + 1
        WHERE conversation_id = NEW.conversation_id
          AND participant_id = NEW.sender_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for conversation updates
DROP TRIGGER IF EXISTS trigger_update_conversation_on_message_insert ON messages;
CREATE TRIGGER trigger_update_conversation_on_message_insert
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_on_message_insert();

-- Function to update conversation updated_at
CREATE OR REPLACE FUNCTION update_conversation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for conversation updated_at
DROP TRIGGER IF EXISTS trigger_update_conversation_updated_at ON conversations;
CREATE TRIGGER trigger_update_conversation_updated_at
    BEFORE UPDATE ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_updated_at();

-- Function to cleanup sessions on conversation deletion
CREATE OR REPLACE FUNCTION cleanup_sessions_on_conversation_delete()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'deleted' AND OLD.status != 'deleted' THEN
        UPDATE chat_sessions
        SET ended_at = NOW()
        WHERE conversation_id = NEW.id
          AND ended_at IS NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for session cleanup
DROP TRIGGER IF EXISTS trigger_cleanup_sessions_on_conversation_delete ON conversations;
CREATE TRIGGER trigger_cleanup_sessions_on_conversation_delete
    AFTER UPDATE ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION cleanup_sessions_on_conversation_delete();

-- ===================================================================
-- VIEWS (Optimized for Neon's query patterns)
-- ===================================================================

-- Active conversations with latest message info
CREATE OR REPLACE VIEW active_conversations_view AS
SELECT 
    c.*,
    (SELECT content FROM messages WHERE conversation_id = c.id AND deleted_at IS NULL ORDER BY timestamp DESC LIMIT 1) as last_message_content,
    (SELECT sender_type FROM messages WHERE conversation_id = c.id AND deleted_at IS NULL ORDER BY timestamp DESC LIMIT 1) as last_message_sender_type,
    (SELECT timestamp FROM messages WHERE conversation_id = c.id AND deleted_at IS NULL ORDER BY timestamp DESC LIMIT 1) as last_message_timestamp,
    (SELECT COUNT(*) FROM participants WHERE conversation_id = c.id) as participant_count,
    (SELECT COUNT(*) FROM participants WHERE conversation_id = c.id AND status = 'active') as active_participant_count
FROM conversations c
WHERE c.status = 'active'
  AND c.deleted_at IS NULL;

-- User conversation history with read status
CREATE OR REPLACE VIEW user_conversation_history AS
SELECT 
    c.id,
    c.title,
    c.agent_id,
    c.created_at,
    c.last_message_at,
    c.message_count,
    p.last_seen_at,
    p.notifications_enabled,
    CASE 
        WHEN p.last_seen_at IS NULL OR p.last_seen_at < c.last_message_at 
        THEN TRUE 
        ELSE FALSE 
    END as has_unread
FROM conversations c
JOIN participants p ON c.id = p.conversation_id
WHERE p.participant_type = 'user'
  AND c.status = 'active'
  AND c.deleted_at IS NULL;

-- Conversation statistics for analytics
CREATE OR REPLACE VIEW conversation_stats AS
SELECT 
    c.id as conversation_id,
    c.message_count,
    COUNT(DISTINCT m.sender_id) as unique_senders,
    MIN(m.timestamp) as first_message_at,
    MAX(m.timestamp) as last_message_at,
    AVG(m.confidence_score) as avg_confidence,
    COUNT(CASE WHEN m.sender_type = 'user' THEN 1 END) as user_message_count,
    COUNT(CASE WHEN m.sender_type = 'agent' THEN 1 END) as agent_message_count,
    COUNT(CASE WHEN m.message_type = 'command' THEN 1 END) as command_count,
    COUNT(CASE WHEN m.status = 'failed' THEN 1 END) as failed_message_count
FROM conversations c
LEFT JOIN messages m ON c.id = m.conversation_id AND m.deleted_at IS NULL
GROUP BY c.id;

-- ===================================================================
-- NEON-SPECIFIC OPTIMIZATIONS
-- ===================================================================

-- Connection pooling optimization: Reduce lock contention
ALTER TABLE conversations SET (fillfactor = 90);
ALTER TABLE messages SET (fillfactor = 90);

-- Optimize for frequent read queries
ALTER TABLE conversations SET (autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE messages SET (autovacuum_vacuum_scale_factor = 0.1);

-- ===================================================================
-- HELPER FUNCTIONS FOR VECTOR SEARCH (if vector extension available)
-- ===================================================================

-- Function to search messages by semantic similarity
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
        EXECUTE '
        CREATE OR REPLACE FUNCTION search_messages_by_similarity(
            query_embedding vector(1536),
            conversation_id_filter UUID DEFAULT NULL,
            similarity_threshold FLOAT DEFAULT 0.8,
            match_count INT DEFAULT 20
        )
        RETURNS TABLE (
            message_id UUID,
            content TEXT,
            similarity FLOAT,
            timestamp TIMESTAMPTZ,
            sender_type TEXT
        )
        LANGUAGE plpgsql
        AS $$
        BEGIN
            RETURN QUERY
            SELECT 
                m.id,
                m.content,
                1 - (m.embedding <=> query_embedding) as similarity,
                m.timestamp,
                m.sender_type
            FROM messages m
            WHERE 
                (conversation_id_filter IS NULL OR m.conversation_id = conversation_id_filter)
                AND m.embedding IS NOT NULL
                AND m.deleted_at IS NULL
                AND 1 - (m.embedding <=> query_embedding) > similarity_threshold
            ORDER BY m.embedding <=> query_embedding
            LIMIT match_count;
        END;
        $$';
    END IF;
END $$;

-- ===================================================================
-- MIGRATION SUPPORT
-- ===================================================================

-- Schema version tracking
CREATE TABLE IF NOT EXISTS schema_versions (
    id SERIAL PRIMARY KEY,
    version VARCHAR(50) NOT NULL,
    description TEXT,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    checksum VARCHAR(64)
);

-- Insert initial version
INSERT INTO schema_versions (version, description, checksum)
VALUES ('1.0.0', 'Initial SYMindX chat system schema for Neon', 'neon-initial')
ON CONFLICT DO NOTHING;

-- ===================================================================
-- PERFORMANCE MONITORING
-- ===================================================================

-- Create a function to monitor query performance
CREATE OR REPLACE FUNCTION get_chat_performance_stats()
RETURNS TABLE (
    table_name TEXT,
    total_size TEXT,
    index_size TEXT,
    row_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        schemaname||'.'||tablename as table_name,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
        pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as index_size,
        n_tup_ins + n_tup_upd + n_tup_del as row_count
    FROM pg_stat_user_tables 
    WHERE tablename IN ('conversations', 'messages', 'participants', 'chat_sessions')
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
END;
$$ LANGUAGE plpgsql;