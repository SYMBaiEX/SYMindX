/**
 * SQLite Chat Database Migrations for SYMindX
 *
 * Professional migration system using programmatic schema definitions
 * instead of reading SQL files at runtime
 */

import { Database } from 'bun:sqlite';

/**
 * Migration 001: Initial chat system schema
 */
export async function migration_001_initial_schema(
  db: Database
): Promise<void> {
  // Conversations table
  db.exec(`
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
    )
  `);

  // Indexes for conversations
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_conversations_agent_id ON conversations(agent_id);
    CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
    CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
    CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at);
    CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at);
    CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON conversations(last_message_at);
    CREATE INDEX IF NOT EXISTS idx_conversations_agent_user ON conversations(agent_id, user_id, status);
  `);

  // Messages table
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'agent', 'system')),
      sender_id TEXT NOT NULL,
      content TEXT NOT NULL,
      message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'command', 'action', 'notification', 'error')),
      status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
      timestamp INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      metadata TEXT DEFAULT '{}',
      emotion_state TEXT,
      thought_process TEXT,
      confidence_score REAL,
      memory_references TEXT DEFAULT '[]',
      created_memories TEXT DEFAULT '[]',
      read_at INTEGER,
      edited_at INTEGER,
      edited_by TEXT,
      deleted_at INTEGER,
      deleted_by TEXT,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    )
  `);

  // Indexes for messages
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_messages_sender_type ON messages(sender_type);
    CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
    CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
    CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(message_type);
    CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
  `);

  // Participants table
  db.exec(`
    CREATE TABLE IF NOT EXISTS participants (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      participant_type TEXT NOT NULL CHECK (participant_type IN ('user', 'agent')),
      participant_id TEXT NOT NULL,
      participant_name TEXT,
      role TEXT DEFAULT 'participant' CHECK (role IN ('owner', 'participant', 'observer')),
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'removed')),
      joined_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      left_at INTEGER,
      last_seen_at INTEGER,
      last_typed_at INTEGER,
      message_count INTEGER DEFAULT 0,
      notifications_enabled INTEGER DEFAULT 1,
      preferences TEXT DEFAULT '{}',
      metadata TEXT DEFAULT '{}',
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
      UNIQUE(conversation_id, participant_id)
    )
  `);

  // Indexes for participants
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_participants_conversation_id ON participants(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_participants_participant_id ON participants(participant_id);
    CREATE INDEX IF NOT EXISTS idx_participants_type ON participants(participant_type);
    CREATE INDEX IF NOT EXISTS idx_participants_status ON participants(status);
  `);

  // Sessions table
  db.exec(`
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
    )
  `);

  // Indexes for sessions
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_sessions_conversation_id ON chat_sessions(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON chat_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON chat_sessions(started_at);
    CREATE INDEX IF NOT EXISTS idx_sessions_last_activity_at ON chat_sessions(last_activity_at);
  `);

  // Analytics events table (no foreign keys for simplicity)
  db.exec(`
    CREATE TABLE IF NOT EXISTS analytics_events (
      id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      conversation_id TEXT,
      user_id TEXT,
      agent_id TEXT,
      event_data TEXT DEFAULT '{}',
      timestamp INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      processing_time REAL,
      tokens_used INTEGER
    )
  `);

  // Indexes for analytics
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_analytics_conversation_id ON analytics_events(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON analytics_events(user_id);
    CREATE INDEX IF NOT EXISTS idx_analytics_agent_id ON analytics_events(agent_id);
    CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics_events(event_type);
    CREATE INDEX IF NOT EXISTS idx_analytics_timestamp ON analytics_events(timestamp);
  `);

  // Emotion snapshots table (no foreign keys for simplicity)
  db.exec(`
    CREATE TABLE IF NOT EXISTS emotion_snapshots (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      message_id TEXT,
      agent_id TEXT NOT NULL,
      emotion TEXT NOT NULL,
      intensity REAL NOT NULL,
      triggers TEXT DEFAULT '[]',
      timestamp INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      metadata TEXT DEFAULT '{}'
    )
  `);

  // Indexes for emotion snapshots
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_emotion_snapshots_conversation_id ON emotion_snapshots(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_emotion_snapshots_message_id ON emotion_snapshots(message_id);
    CREATE INDEX IF NOT EXISTS idx_emotion_snapshots_agent_id ON emotion_snapshots(agent_id);
    CREATE INDEX IF NOT EXISTS idx_emotion_snapshots_emotion ON emotion_snapshots(emotion);
    CREATE INDEX IF NOT EXISTS idx_emotion_snapshots_timestamp ON emotion_snapshots(timestamp);
  `);
}

/**
 * Available migrations in order
 */
export const MIGRATIONS = [
  {
    name: '001_initial_schema',
    up: migration_001_initial_schema,
    description:
      'Initial chat system schema with conversations, messages, participants, sessions, analytics, and emotion snapshots',
  },
];

/**
 * Check if the database is already properly initialized
 */
export async function isDatabaseInitialized(db: Database): Promise<boolean> {
  try {
    // Check if core tables exist
    const tableCheck = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='conversations'"
      )
      .get();
    if (!tableCheck) {
      return false;
    }

    // Check if migrations tracking table exists and has our migrations
    const migrationsTableCheck = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='knex_migrations'"
      )
      .get();
    if (!migrationsTableCheck) {
      return false;
    }

    // Check if our migrations have been run
    const completedMigrations = db
      .prepare('SELECT name FROM knex_migrations')
      .all()
      .map((row: any) => row.name);
    const requiredMigrations = MIGRATIONS.map((m) => m.name);

    return requiredMigrations.every((migration) =>
      completedMigrations.includes(migration)
    );
  } catch (error) {
    // If we can't check, assume it needs initialization
    console.log(
      '⚠️ Could not check database status, assuming initialization needed:',
      error
    );
    return false;
  }
}

/**
 * Run all pending migrations
 */
export async function runMigrations(db: Database): Promise<void> {
  // Check if database is already initialized
  const isInitialized = await isDatabaseInitialized(db);
  if (isInitialized) {
    console.log('✅ Database already initialized, skipping migrations');
    return;
  }

  console.log('🔄 Running database migrations...');

  // Create migrations tracking table if it doesn't exist
  const hasTable = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='knex_migrations'"
    )
    .get();
  if (!hasTable) {
    db.exec(`
      CREATE TABLE knex_migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        batch INTEGER NOT NULL,
        migration_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created migrations tracking table');
  }

  // Get current migration batch
  const lastBatchResult = db
    .prepare('SELECT MAX(batch) as max_batch FROM knex_migrations')
    .get() as any;
  const currentBatch = (lastBatchResult?.max_batch || 0) + 1;

  // Get already run migrations
  const completedMigrations = db
    .prepare('SELECT name FROM knex_migrations')
    .all()
    .map((row: any) => row.name);

  // Run pending migrations
  let migrationsRun = 0;
  const insertMigration = db.prepare(
    'INSERT INTO knex_migrations (name, batch) VALUES (?, ?)'
  );

  for (const migration of MIGRATIONS) {
    if (!completedMigrations.includes(migration.name)) {
      console.log(`🔄 Running migration: ${migration.name}`);
      console.log(`   ${migration.description}`);

      await migration.up(db);

      // Record migration as completed
      insertMigration.run(migration.name, currentBatch);

      console.log(`✅ Migration completed: ${migration.name}`);
      migrationsRun++;
    } else {
      console.log(`⏭️  Migration already applied: ${migration.name}`);
    }
  }

  if (migrationsRun > 0) {
    console.log(`✅ Applied ${migrationsRun} new migrations successfully`);
  } else {
    console.log('✅ All migrations were already applied');
  }
}
