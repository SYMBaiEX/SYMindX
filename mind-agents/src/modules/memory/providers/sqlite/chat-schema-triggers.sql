-- SYMindX Chat System Database Schema - Triggers and Views
-- Version: 1.0.0
-- Description: Triggers, views, and advanced features

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

-- Get conversation statistics
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