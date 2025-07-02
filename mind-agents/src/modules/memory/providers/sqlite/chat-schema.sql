-- SYMindX Chat System Database Schema for SQLite
-- Version: 1.0.0
-- Description: Comprehensive chat system schema for persistent conversation storage
-- Author: SYMindX Team

-- ===================================================================
-- CONVERSATIONS TABLE
-- ===================================================================
-- Stores chat sessions between users and agents
CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    title TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
    last_message_at INTEGER,
    message_count INTEGER DEFAULT 0,
    metadata TEXT DEFAULT '{}', -- JSON object for additional data
    
    -- Soft delete support
    deleted_at INTEGER,
    deleted_by TEXT
);

-- Indexes for conversations
CREATE INDEX IF NOT EXISTS idx_conversations_agent_id ON conversations(agent_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_deleted_at ON conversations(deleted_at) WHERE deleted_at IS NOT NULL;

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_conversations_agent_user ON conversations(agent_id, user_id, status);
CREATE INDEX IF NOT EXISTS idx_conversations_user_updated ON conversations(user_id, updated_at DESC) WHERE status = 'active';

-- ===================================================================
-- MESSAGES TABLE
-- ===================================================================
-- Stores individual messages within conversations
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'agent', 'system')),
    sender_id TEXT NOT NULL,
    content TEXT NOT NULL,
    message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'command', 'action', 'notification', 'error')),
    
    -- Message metadata
    timestamp INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
    edited_at INTEGER,
    metadata TEXT DEFAULT '{}', -- JSON object for additional data
    
    -- Agent-specific fields
    emotion_state TEXT, -- JSON object with emotion data
    thought_process TEXT, -- JSON array of thoughts during message generation
    confidence_score REAL CHECK (confidence_score >= 0 AND confidence_score <= 1),
    
    -- Memory integration
    memory_references TEXT DEFAULT '[]', -- JSON array of memory IDs referenced
    created_memories TEXT DEFAULT '[]', -- JSON array of memory IDs created from this message
    
    -- Status tracking
    status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('draft', 'sending', 'sent', 'delivered', 'read', 'failed')),
    read_at INTEGER,
    
    -- Soft delete support
    deleted_at INTEGER,
    deleted_by TEXT,
    
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

-- Indexes for messages
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_deleted_at ON messages(deleted_at) WHERE deleted_at IS NOT NULL;

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_messages_conv_time ON messages(conversation_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conv_status ON messages(conversation_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_messages_sender_type_time ON messages(sender_type, timestamp DESC) WHERE deleted_at IS NULL;

-- Full-text search index (SQLite FTS5)
CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
    message_id UNINDEXED,
    content,
    content=messages,
    content_rowid=rowid
);

-- Trigger to keep FTS index updated
CREATE TRIGGER IF NOT EXISTS messages_fts_insert AFTER INSERT ON messages BEGIN
    INSERT INTO messages_fts(message_id, content) VALUES (new.id, new.content);
END;

CREATE TRIGGER IF NOT EXISTS messages_fts_update UPDATE OF content ON messages BEGIN
    UPDATE messages_fts SET content = new.content WHERE message_id = old.id;
END;

CREATE TRIGGER IF NOT EXISTS messages_fts_delete AFTER DELETE ON messages BEGIN
    DELETE FROM messages_fts WHERE message_id = old.id;
END;

-- ===================================================================
-- PARTICIPANTS TABLE
-- ===================================================================
-- Tracks all participants (users and agents) in conversations
CREATE TABLE IF NOT EXISTS participants (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    participant_type TEXT NOT NULL CHECK (participant_type IN ('user', 'agent')),
    participant_id TEXT NOT NULL,
    participant_name TEXT,
    
    -- Participation details
    joined_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
    left_at INTEGER,
    role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'observer')),
    
    -- Activity tracking
    last_seen_at INTEGER,
    last_typed_at INTEGER,
    message_count INTEGER DEFAULT 0,
    
    -- Preferences
    notifications_enabled INTEGER DEFAULT 1,
    preferences TEXT DEFAULT '{}', -- JSON object for user preferences
    
    -- Status
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'banned')),
    
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    UNIQUE(conversation_id, participant_id)
);

-- Indexes for participants
CREATE INDEX IF NOT EXISTS idx_participants_conversation_id ON participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_participants_participant_id ON participants(participant_id);
CREATE INDEX IF NOT EXISTS idx_participants_type ON participants(participant_type);
CREATE INDEX IF NOT EXISTS idx_participants_status ON participants(status);
CREATE INDEX IF NOT EXISTS idx_participants_last_seen ON participants(last_seen_at DESC);

-- ===================================================================
-- MESSAGE_REACTIONS TABLE
-- ===================================================================
-- Stores reactions to messages (for future extensibility)
CREATE TABLE IF NOT EXISTS message_reactions (
    id TEXT PRIMARY KEY,
    message_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    reaction TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
    
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
    UNIQUE(message_id, user_id, reaction)
);

-- Indexes for reactions
CREATE INDEX IF NOT EXISTS idx_reactions_message_id ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_reactions_user_id ON message_reactions(user_id);

-- ===================================================================
-- CONVERSATION_TAGS TABLE
-- ===================================================================
-- Tags for organizing and categorizing conversations
CREATE TABLE IF NOT EXISTS conversation_tags (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    tag TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
    created_by TEXT NOT NULL,
    
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    UNIQUE(conversation_id, tag)
);

-- Indexes for tags
CREATE INDEX IF NOT EXISTS idx_tags_conversation_id ON conversation_tags(conversation_id);
CREATE INDEX IF NOT EXISTS idx_tags_tag ON conversation_tags(tag);

-- ===================================================================
-- MESSAGE_ATTACHMENTS TABLE
-- ===================================================================
-- Stores metadata about attachments in messages
CREATE TABLE IF NOT EXISTS message_attachments (
    id TEXT PRIMARY KEY,
    message_id TEXT NOT NULL,
    attachment_type TEXT NOT NULL CHECK (attachment_type IN ('image', 'file', 'link', 'code', 'memory')),
    filename TEXT,
    mime_type TEXT,
    size INTEGER,
    url TEXT,
    metadata TEXT DEFAULT '{}', -- JSON object for additional data
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
    
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
);

-- Indexes for attachments
CREATE INDEX IF NOT EXISTS idx_attachments_message_id ON message_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_attachments_type ON message_attachments(attachment_type);

-- ===================================================================
-- CHAT_SESSIONS TABLE
-- ===================================================================
-- Tracks active chat sessions for presence and typing indicators
CREATE TABLE IF NOT EXISTS chat_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    conversation_id TEXT NOT NULL,
    connection_id TEXT,
    
    -- Session tracking
    started_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
    last_activity_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
    ended_at INTEGER,
    
    -- Client information
    client_info TEXT DEFAULT '{}', -- JSON object with client details
    ip_address TEXT,
    user_agent TEXT,
    
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

-- Indexes for sessions
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_conversation_id ON chat_sessions(conversation_id);
CREATE INDEX IF NOT EXISTS idx_sessions_last_activity ON chat_sessions(last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON chat_sessions(ended_at) WHERE ended_at IS NULL;

-- ===================================================================
-- ANALYTICS_EVENTS TABLE
-- ===================================================================
-- Stores analytics events for chat interactions
CREATE TABLE IF NOT EXISTS analytics_events (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    conversation_id TEXT,
    user_id TEXT,
    agent_id TEXT,
    
    -- Event data
    event_data TEXT DEFAULT '{}', -- JSON object with event-specific data
    timestamp INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
    
    -- Performance metrics
    processing_time INTEGER, -- milliseconds
    tokens_used INTEGER,
    
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL
);

-- Indexes for analytics
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_timestamp ON analytics_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_conversation ON analytics_events(conversation_id);
CREATE INDEX IF NOT EXISTS idx_analytics_user ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_agent ON analytics_events(agent_id);

-- ===================================================================
-- VIEWS
-- ===================================================================

-- Active conversations with latest message info (SQLite compatible)
CREATE VIEW IF NOT EXISTS active_conversations_view AS
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

-- User conversation history
CREATE VIEW IF NOT EXISTS user_conversation_history AS
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
        THEN 1 
        ELSE 0 
    END as has_unread
FROM conversations c
JOIN participants p ON c.id = p.conversation_id
WHERE p.participant_type = 'user'
  AND c.status = 'active'
  AND c.deleted_at IS NULL;

-- ===================================================================
-- TRIGGERS (Created after all tables are ready)
-- ===================================================================

-- Update conversation timestamp and message count on new message
CREATE TRIGGER IF NOT EXISTS update_conversation_on_message_insert
AFTER INSERT ON messages
WHEN NEW.deleted_at IS NULL
BEGIN
    UPDATE conversations
    SET last_message_at = NEW.timestamp,
        message_count = message_count + 1,
        updated_at = NEW.timestamp
    WHERE id = NEW.conversation_id;
    
    -- Update participant message count
    UPDATE participants
    SET message_count = message_count + 1
    WHERE conversation_id = NEW.conversation_id
      AND participant_id = NEW.sender_id;
END;

-- Update conversation updated_at on any change
CREATE TRIGGER IF NOT EXISTS update_conversation_updated_at
AFTER UPDATE ON conversations
BEGIN
    UPDATE conversations
    SET updated_at = strftime('%s', 'now') * 1000
    WHERE id = NEW.id;
END;

-- Clean up sessions on conversation deletion
CREATE TRIGGER IF NOT EXISTS cleanup_sessions_on_conversation_delete
AFTER UPDATE ON conversations
WHEN NEW.status = 'deleted' AND OLD.status != 'deleted'
BEGIN
    UPDATE chat_sessions
    SET ended_at = strftime('%s', 'now') * 1000
    WHERE conversation_id = NEW.id
      AND ended_at IS NULL;
END;

-- ===================================================================
-- UTILITY FUNCTIONS (as SQL statements for SQLite)
-- ===================================================================

-- Get conversation statistics
-- Usage: SELECT * FROM conversation_stats WHERE conversation_id = ?
CREATE VIEW IF NOT EXISTS conversation_stats AS
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
-- MIGRATION SUPPORT
-- ===================================================================

-- Schema version tracking
CREATE TABLE IF NOT EXISTS schema_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    version TEXT NOT NULL,
    description TEXT,
    applied_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
    checksum TEXT
);

-- Insert initial version
INSERT OR IGNORE INTO schema_versions (version, description, checksum)
VALUES ('1.0.0', 'Initial SYMindX chat system schema', 'initial');

-- ===================================================================
-- COMMENTS / DOCUMENTATION
-- ===================================================================
-- SQLite doesn't support COMMENT statements, but here's the documentation:
-- 
-- conversations: Stores chat sessions between users and agents
-- messages: Individual messages within conversations
-- participants: All users and agents participating in conversations
-- message_reactions: User reactions to messages (likes, emojis, etc.)
-- conversation_tags: Tags for organizing conversations
-- message_attachments: Metadata about files, images, or other attachments
-- chat_sessions: Active user sessions for presence tracking
-- analytics_events: Event tracking for analytics and monitoring
--
-- Key Design Decisions:
-- 1. Soft deletes for data retention and recovery
-- 2. JSON fields for flexible metadata storage
-- 3. Comprehensive indexing for query performance
-- 4. Integration with existing memory system
-- 5. Support for multiple participants per conversation
-- 6. Full-text search capability
-- 7. Analytics and monitoring built-in
-- 8. Prepared for future features (reactions, attachments, etc.)