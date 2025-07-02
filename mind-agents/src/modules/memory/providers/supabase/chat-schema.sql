-- SYMindX Chat System Database Schema for Supabase
-- Version: 1.0.0
-- Description: Complete chat system schema optimized for Supabase with RLS and vector search

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ===================================================================
-- CONVERSATIONS TABLE
-- ===================================================================
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    title TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_message_at TIMESTAMPTZ,
    message_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    
    -- Soft delete support
    deleted_at TIMESTAMPTZ,
    deleted_by TEXT
);

-- Enable Row Level Security
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations
CREATE POLICY "Users can view their conversations" ON conversations
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can create conversations" ON conversations
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their conversations" ON conversations
    FOR UPDATE USING (auth.uid()::text = user_id);

-- ===================================================================
-- MESSAGES TABLE
-- ===================================================================
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'agent', 'system')),
    sender_id TEXT NOT NULL,
    content TEXT NOT NULL,
    message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'command', 'action', 'notification', 'error')),
    
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
    status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('draft', 'sending', 'sent', 'delivered', 'read', 'failed')),
    read_at TIMESTAMPTZ,
    
    -- Soft delete support
    deleted_at TIMESTAMPTZ,
    deleted_by TEXT,
    
    -- Vector embedding for semantic search
    embedding vector(1536)
);

-- Enable Row Level Security
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for messages
CREATE POLICY "Users can view messages in their conversations" ON messages
    FOR SELECT USING (
        conversation_id IN (
            SELECT id FROM conversations WHERE user_id = auth.uid()::text
        )
    );

CREATE POLICY "Users can create messages in their conversations" ON messages
    FOR INSERT WITH CHECK (
        conversation_id IN (
            SELECT id FROM conversations WHERE user_id = auth.uid()::text
        )
    );

-- ===================================================================
-- PARTICIPANTS TABLE
-- ===================================================================
CREATE TABLE IF NOT EXISTS participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    participant_type TEXT NOT NULL CHECK (participant_type IN ('user', 'agent')),
    participant_id TEXT NOT NULL,
    participant_name TEXT,
    
    -- Participation details
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    left_at TIMESTAMPTZ,
    role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'observer')),
    
    -- Activity tracking
    last_seen_at TIMESTAMPTZ,
    last_typed_at TIMESTAMPTZ,
    message_count INTEGER DEFAULT 0,
    
    -- Preferences
    notifications_enabled BOOLEAN DEFAULT TRUE,
    preferences JSONB DEFAULT '{}',
    
    -- Status
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'banned')),
    
    UNIQUE(conversation_id, participant_id)
);

-- Enable Row Level Security
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for participants
CREATE POLICY "Users can view participants in their conversations" ON participants
    FOR SELECT USING (
        conversation_id IN (
            SELECT id FROM conversations WHERE user_id = auth.uid()::text
        )
    );

-- ===================================================================
-- MESSAGE_REACTIONS TABLE
-- ===================================================================
CREATE TABLE IF NOT EXISTS message_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    reaction TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(message_id, user_id, reaction)
);

-- Enable Row Level Security
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

-- ===================================================================
-- CONVERSATION_TAGS TABLE
-- ===================================================================
CREATE TABLE IF NOT EXISTS conversation_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    tag TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by TEXT NOT NULL,
    
    UNIQUE(conversation_id, tag)
);

-- Enable Row Level Security
ALTER TABLE conversation_tags ENABLE ROW LEVEL SECURITY;

-- ===================================================================
-- MESSAGE_ATTACHMENTS TABLE
-- ===================================================================
CREATE TABLE IF NOT EXISTS message_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    attachment_type TEXT NOT NULL CHECK (attachment_type IN ('image', 'file', 'link', 'code', 'memory')),
    filename TEXT,
    mime_type TEXT,
    size BIGINT,
    url TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;

-- ===================================================================
-- CHAT_SESSIONS TABLE
-- ===================================================================
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    connection_id TEXT,
    
    -- Session tracking
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    
    -- Client information
    client_info JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT
);

-- Enable Row Level Security
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

-- ===================================================================
-- ANALYTICS_EVENTS TABLE
-- ===================================================================
CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type TEXT NOT NULL,
    conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    user_id TEXT,
    agent_id TEXT,
    
    -- Event data
    event_data JSONB DEFAULT '{}',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Performance metrics
    processing_time INTEGER, -- milliseconds
    tokens_used INTEGER
);

-- Enable Row Level Security
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- ===================================================================
-- INDEXES FOR PERFORMANCE
-- ===================================================================

-- Conversation indexes
CREATE INDEX IF NOT EXISTS idx_conversations_agent_id ON conversations(agent_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON conversations(last_message_at DESC);

-- Message indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_messages_content_gin ON messages USING GIN(to_tsvector('english', content));

-- Vector similarity index
CREATE INDEX IF NOT EXISTS idx_messages_embedding ON messages USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Participant indexes
CREATE INDEX IF NOT EXISTS idx_participants_conversation_id ON participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_participants_participant_id ON participants(participant_id);

-- Session indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_conversation_id ON chat_sessions(conversation_id);

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_analytics_conversation ON analytics_events(conversation_id);
CREATE INDEX IF NOT EXISTS idx_analytics_timestamp ON analytics_events(timestamp DESC);

-- ===================================================================
-- FUNCTIONS AND TRIGGERS
-- ===================================================================

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for conversation updates
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
CREATE TRIGGER trigger_update_conversation_updated_at
    BEFORE UPDATE ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_updated_at();

-- ===================================================================
-- SUPABASE REAL-TIME PUBLICATIONS
-- ===================================================================

-- Enable real-time for conversations
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;

-- Enable real-time for messages
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Enable real-time for participants
ALTER PUBLICATION supabase_realtime ADD TABLE participants;

-- ===================================================================
-- VIEWS
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

-- ===================================================================
-- SUPABASE STORAGE BUCKETS (for attachments)
-- ===================================================================

-- Create storage bucket for chat attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-attachments', 'chat-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for chat attachments
CREATE POLICY "Users can upload to their chat attachments" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'chat-attachments' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can view their chat attachments" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'chat-attachments' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- ===================================================================
-- HELPER FUNCTIONS FOR VECTOR SEARCH
-- ===================================================================

-- Function to search messages by semantic similarity
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
$$;