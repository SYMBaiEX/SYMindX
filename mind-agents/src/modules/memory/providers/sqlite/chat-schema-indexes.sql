-- SYMindX Chat System Database Schema - Indexes Only
-- Version: 1.0.0
-- Description: Indexes for performance optimization

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

-- Indexes for participants
CREATE INDEX IF NOT EXISTS idx_participants_conversation_id ON participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_participants_participant_id ON participants(participant_id);
CREATE INDEX IF NOT EXISTS idx_participants_type ON participants(participant_type);
CREATE INDEX IF NOT EXISTS idx_participants_status ON participants(status);
CREATE INDEX IF NOT EXISTS idx_participants_last_seen ON participants(last_seen_at DESC);

-- Indexes for reactions
CREATE INDEX IF NOT EXISTS idx_reactions_message_id ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_reactions_user_id ON message_reactions(user_id);

-- Indexes for tags
CREATE INDEX IF NOT EXISTS idx_tags_conversation_id ON conversation_tags(conversation_id);
CREATE INDEX IF NOT EXISTS idx_tags_tag ON conversation_tags(tag);

-- Indexes for attachments
CREATE INDEX IF NOT EXISTS idx_attachments_message_id ON message_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_attachments_type ON message_attachments(attachment_type);

-- Indexes for sessions
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_conversation_id ON chat_sessions(conversation_id);
CREATE INDEX IF NOT EXISTS idx_sessions_last_activity ON chat_sessions(last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON chat_sessions(ended_at) WHERE ended_at IS NULL;

-- Indexes for analytics
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_timestamp ON analytics_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_conversation ON analytics_events(conversation_id);
CREATE INDEX IF NOT EXISTS idx_analytics_user ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_agent ON analytics_events(agent_id);