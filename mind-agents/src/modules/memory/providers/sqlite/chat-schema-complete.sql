-- SYMindX Chat System Database Schema - Complete
-- Version: 1.0.0
-- Description: Complete schema in correct execution order

-- ===================================================================
-- TABLES FIRST
-- ===================================================================

-- Conversations table
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
    metadata TEXT DEFAULT '{}',
    deleted_at INTEGER,
    deleted_by TEXT
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'agent', 'system')),
    sender_id TEXT NOT NULL,
    content TEXT NOT NULL,
    message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'command', 'action', 'notification', 'error')),
    timestamp INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
    edited_at INTEGER,
    metadata TEXT DEFAULT '{}',
    emotion_state TEXT,
    thought_process TEXT,
    confidence_score REAL CHECK (confidence_score >= 0 AND confidence_score <= 1),
    memory_references TEXT DEFAULT '[]',
    created_memories TEXT DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('draft', 'sending', 'sent', 'delivered', 'read', 'failed')),
    read_at INTEGER,
    deleted_at INTEGER,
    deleted_by TEXT,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

-- Participants table
CREATE TABLE IF NOT EXISTS participants (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    participant_type TEXT NOT NULL CHECK (participant_type IN ('user', 'agent')),
    participant_id TEXT NOT NULL,
    participant_name TEXT,
    joined_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
    left_at INTEGER,
    role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'observer')),
    last_seen_at INTEGER,
    last_typed_at INTEGER,
    message_count INTEGER DEFAULT 0,
    notifications_enabled INTEGER DEFAULT 1,
    preferences TEXT DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'banned')),
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    UNIQUE(conversation_id, participant_id)
);

-- Message reactions table
CREATE TABLE IF NOT EXISTS message_reactions (
    id TEXT PRIMARY KEY,
    message_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    reaction TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
    UNIQUE(message_id, user_id, reaction)
);

-- Conversation tags table
CREATE TABLE IF NOT EXISTS conversation_tags (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    tag TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
    created_by TEXT NOT NULL,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    UNIQUE(conversation_id, tag)
);

-- Message attachments table
CREATE TABLE IF NOT EXISTS message_attachments (
    id TEXT PRIMARY KEY,
    message_id TEXT NOT NULL,
    attachment_type TEXT NOT NULL CHECK (attachment_type IN ('image', 'file', 'link', 'code', 'memory')),
    filename TEXT,
    mime_type TEXT,
    size INTEGER,
    url TEXT,
    metadata TEXT DEFAULT '{}',
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
);

-- Chat sessions table
CREATE TABLE IF NOT EXISTS chat_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    conversation_id TEXT NOT NULL,
    connection_id TEXT,
    started_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
    last_activity_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
    ended_at INTEGER,
    client_info TEXT DEFAULT '{}',
    ip_address TEXT,
    user_agent TEXT,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

-- Analytics events table
CREATE TABLE IF NOT EXISTS analytics_events (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    conversation_id TEXT,
    user_id TEXT,
    agent_id TEXT,
    event_data TEXT DEFAULT '{}',
    timestamp INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
    processing_time INTEGER,
    tokens_used INTEGER,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL
);

-- ===================================================================
-- INDEXES SECOND
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

-- Participant indexes
CREATE INDEX IF NOT EXISTS idx_participants_conversation_id ON participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_participants_participant_id ON participants(participant_id);

-- Session indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_conversation_id ON chat_sessions(conversation_id);

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_analytics_conversation ON analytics_events(conversation_id);
CREATE INDEX IF NOT EXISTS idx_analytics_timestamp ON analytics_events(timestamp DESC);