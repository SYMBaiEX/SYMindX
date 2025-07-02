/**
 * Neon Database Migrations for SYMindX
 * 
 * Professional migration system using programmatic schema definitions
 * for Neon PostgreSQL with vector search and advanced memory features
 */

import { PoolClient } from 'pg'

/**
 * Migration 001: Initial enhanced schema with multi-tier memory
 */
export async function migration_001_enhanced_schema(client: PoolClient): Promise<void> {
  // Enable required extensions
  await client.query(`CREATE EXTENSION IF NOT EXISTS "vector";`)
  await client.query(`CREATE EXTENSION IF NOT EXISTS "pg_trgm";`)
  await client.query(`CREATE EXTENSION IF NOT EXISTS "btree_gin";`)
  await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`)

  // Enhanced memories table with tier and context support
  await client.query(`
    CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      embedding vector(1536), -- OpenAI embedding dimension
      metadata JSONB DEFAULT '{}',
      importance REAL NOT NULL DEFAULT 0.5 CHECK (importance >= 0 AND importance <= 1),
      timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      tags TEXT[] DEFAULT '{}',
      duration TEXT NOT NULL DEFAULT 'long_term' CHECK (duration IN ('short_term', 'long_term', 'working', 'episodic')),
      expires_at TIMESTAMPTZ,
      tier TEXT DEFAULT 'episodic' CHECK (tier IN ('working', 'episodic', 'semantic', 'procedural')),
      context JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  // Create shared memory pools table
  await client.query(`
    CREATE TABLE IF NOT EXISTS shared_memory_pools (
      pool_id TEXT PRIMARY KEY,
      config JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  // Create shared memory mappings table
  await client.query(`
    CREATE TABLE IF NOT EXISTS shared_memory_mappings (
      memory_id TEXT NOT NULL,
      pool_id TEXT NOT NULL,
      shared_by TEXT NOT NULL,
      shared_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      permissions TEXT[] NOT NULL,
      PRIMARY KEY (memory_id, pool_id),
      FOREIGN KEY (pool_id) REFERENCES shared_memory_pools(pool_id) ON DELETE CASCADE
    )
  `)

  // Create comprehensive indexes
  const indexes = [
    // Primary query indexes
    `CREATE INDEX IF NOT EXISTS idx_memories_agent_id ON memories(agent_id);`,
    `CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type);`,
    `CREATE INDEX IF NOT EXISTS idx_memories_timestamp ON memories(timestamp DESC);`,
    `CREATE INDEX IF NOT EXISTS idx_memories_importance ON memories(importance DESC);`,
    `CREATE INDEX IF NOT EXISTS idx_memories_duration ON memories(duration);`,
    `CREATE INDEX IF NOT EXISTS idx_memories_expires_at ON memories(expires_at) WHERE expires_at IS NOT NULL;`,
    `CREATE INDEX IF NOT EXISTS idx_memories_tier ON memories(tier);`,
    
    // Composite indexes for common query patterns
    `CREATE INDEX IF NOT EXISTS idx_memories_agent_type_time ON memories(agent_id, type, timestamp DESC);`,
    `CREATE INDEX IF NOT EXISTS idx_memories_agent_duration_time ON memories(agent_id, duration, timestamp DESC);`,
    `CREATE INDEX IF NOT EXISTS idx_memories_agent_importance ON memories(agent_id, importance DESC);`,
    `CREATE INDEX IF NOT EXISTS idx_memories_agent_tier_time ON memories(agent_id, tier, timestamp DESC);`,
    
    // Full-text search index
    `CREATE INDEX IF NOT EXISTS idx_memories_content_fts ON memories USING gin(to_tsvector('english', content));`,
    
    // Metadata and tags indexes
    `CREATE INDEX IF NOT EXISTS idx_memories_metadata_gin ON memories USING gin(metadata);`,
    `CREATE INDEX IF NOT EXISTS idx_memories_tags_gin ON memories USING gin(tags);`,

    // Shared memory indexes
    `CREATE INDEX IF NOT EXISTS idx_shared_mappings_pool ON shared_memory_mappings(pool_id);`,
    `CREATE INDEX IF NOT EXISTS idx_shared_mappings_shared_by ON shared_memory_mappings(shared_by);`
  ]

  for (const indexQuery of indexes) {
    await client.query(indexQuery)
  }

  // Try to create HNSW vector index (best performance)
  try {
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_memories_embedding_hnsw 
      ON memories USING hnsw (embedding vector_cosine_ops) 
      WITH (m = 16, ef_construction = 64);
    `)
  } catch (error) {
    // Fallback to IVFFlat if HNSW not available
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_memories_embedding_ivfflat 
      ON memories USING ivfflat (embedding vector_cosine_ops) 
      WITH (lists = 100);
    `)
  }

  // Create enhanced vector search function
  await client.query(`
    CREATE OR REPLACE FUNCTION search_memories(
      p_agent_id TEXT,
      p_query_embedding vector(1536),
      p_match_threshold FLOAT DEFAULT 0.7,
      p_match_count INTEGER DEFAULT 10,
      p_memory_type TEXT DEFAULT NULL,
      p_duration TEXT DEFAULT NULL,
      p_min_importance FLOAT DEFAULT NULL,
      p_tier TEXT DEFAULT NULL
    )
    RETURNS TABLE (
      id TEXT,
      agent_id TEXT,
      type TEXT,
      content TEXT,
      embedding vector(1536),
      metadata JSONB,
      importance REAL,
      timestamp TIMESTAMPTZ,
      tags TEXT[],
      duration TEXT,
      expires_at TIMESTAMPTZ,
      tier TEXT,
      context JSONB,
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
        m.tier,
        m.context,
        1 - (m.embedding <=> p_query_embedding) AS similarity
      FROM memories m
      WHERE m.agent_id = p_agent_id
      AND m.embedding IS NOT NULL
      AND (p_memory_type IS NULL OR m.type = p_memory_type)
      AND (p_duration IS NULL OR m.duration = p_duration)
      AND (p_min_importance IS NULL OR m.importance >= p_min_importance)
      AND (p_tier IS NULL OR m.tier = p_tier)
      AND (m.duration != 'short_term' OR m.expires_at IS NULL OR m.expires_at > NOW())
      AND 1 - (m.embedding <=> p_query_embedding) > p_match_threshold
      ORDER BY similarity DESC
      LIMIT p_match_count;
    END;
    $$;
  `)

  // Create cleanup function
  await client.query(`
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
  `)

  // Create statistics function
  await client.query(`
    CREATE OR REPLACE FUNCTION get_memory_stats(p_agent_id TEXT)
    RETURNS TABLE (
      total_memories INTEGER,
      short_term_count INTEGER,
      long_term_count INTEGER,
      working_count INTEGER,
      episodic_count INTEGER,
      semantic_count INTEGER,
      procedural_count INTEGER,
      avg_importance FLOAT,
      earliest_memory TIMESTAMPTZ,
      latest_memory TIMESTAMPTZ,
      memories_with_embeddings INTEGER,
      shared_memory_count INTEGER
    )
    LANGUAGE plpgsql
    AS $$
    BEGIN
      RETURN QUERY
      SELECT 
        COUNT(*)::INTEGER as total_memories,
        COUNT(*) FILTER (WHERE duration = 'short_term')::INTEGER as short_term_count,
        COUNT(*) FILTER (WHERE duration = 'long_term')::INTEGER as long_term_count,
        COUNT(*) FILTER (WHERE tier = 'working')::INTEGER as working_count,
        COUNT(*) FILTER (WHERE tier = 'episodic')::INTEGER as episodic_count,
        COUNT(*) FILTER (WHERE tier = 'semantic')::INTEGER as semantic_count,
        COUNT(*) FILTER (WHERE tier = 'procedural')::INTEGER as procedural_count,
        AVG(importance)::FLOAT as avg_importance,
        MIN(timestamp) as earliest_memory,
        MAX(timestamp) as latest_memory,
        COUNT(*) FILTER (WHERE embedding IS NOT NULL)::INTEGER as memories_with_embeddings,
        (
          SELECT COUNT(DISTINCT memory_id)::INTEGER 
          FROM shared_memory_mappings smm
          JOIN memories m ON m.id = smm.memory_id
          WHERE m.agent_id = p_agent_id
        ) as shared_memory_count
      FROM memories
      WHERE agent_id = p_agent_id
      AND (duration != 'short_term' OR expires_at IS NULL OR expires_at > NOW());
    END;
    $$;
  `)

  // Create consolidation function
  await client.query(`
    CREATE OR REPLACE FUNCTION consolidate_memory(
      p_agent_id TEXT,
      p_memory_id TEXT,
      p_from_tier TEXT,
      p_to_tier TEXT
    )
    RETURNS BOOLEAN
    LANGUAGE plpgsql
    AS $$
    DECLARE
      rows_affected INTEGER;
    BEGIN
      UPDATE memories 
      SET tier = p_to_tier,
          updated_at = NOW()
      WHERE agent_id = p_agent_id 
      AND id = p_memory_id 
      AND tier = p_from_tier;
      
      GET DIAGNOSTICS rows_affected = ROW_COUNT;
      RETURN rows_affected > 0;
    END;
    $$;
  `)

  // Create updated_at trigger
  await client.query(`
    CREATE OR REPLACE FUNCTION update_memories_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ language 'plpgsql';
  `)

  await client.query(`
    DROP TRIGGER IF EXISTS update_memories_updated_at ON memories;
    CREATE TRIGGER update_memories_updated_at 
      BEFORE UPDATE ON memories
      FOR EACH ROW 
      EXECUTE FUNCTION update_memories_updated_at();
  `)
}

/**
 * Migration 002: Add memory archival tables
 */
export async function migration_002_archival_system(client: PoolClient): Promise<void> {
  // Create archived memories table
  await client.query(`
    CREATE TABLE IF NOT EXISTS archived_memories (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      original_ids TEXT[] NOT NULL,
      summary TEXT NOT NULL,
      type TEXT NOT NULL,
      metadata JSONB DEFAULT '{}',
      importance REAL NOT NULL,
      start_date TIMESTAMPTZ NOT NULL,
      end_date TIMESTAMPTZ NOT NULL,
      memory_count INTEGER NOT NULL,
      archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  // Create indexes for archived memories
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_archived_memories_agent_id ON archived_memories(agent_id);
    CREATE INDEX IF NOT EXISTS idx_archived_memories_start_date ON archived_memories(start_date);
    CREATE INDEX IF NOT EXISTS idx_archived_memories_end_date ON archived_memories(end_date);
    CREATE INDEX IF NOT EXISTS idx_archived_memories_archived_at ON archived_memories(archived_at);
  `)

  // Create archival rules table
  await client.query(`
    CREATE TABLE IF NOT EXISTS archival_rules (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      agent_id TEXT NOT NULL,
      rule_type TEXT NOT NULL CHECK (rule_type IN ('compression', 'summarization', 'deletion')),
      tier TEXT,
      trigger_age_days INTEGER,
      trigger_count INTEGER,
      importance_threshold REAL,
      config JSONB DEFAULT '{}',
      enabled BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  // Create index for archival rules
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_archival_rules_agent_id ON archival_rules(agent_id);
    CREATE INDEX IF NOT EXISTS idx_archival_rules_enabled ON archival_rules(enabled);
  `)
}

/**
 * Migration 003: Add memory consolidation tracking
 */
export async function migration_003_consolidation_tracking(client: PoolClient): Promise<void> {
  // Create consolidation history table
  await client.query(`
    CREATE TABLE IF NOT EXISTS consolidation_history (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      agent_id TEXT NOT NULL,
      memory_id TEXT NOT NULL,
      from_tier TEXT NOT NULL,
      to_tier TEXT NOT NULL,
      reason TEXT,
      metadata JSONB DEFAULT '{}',
      consolidated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  // Create indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_consolidation_history_agent_id ON consolidation_history(agent_id);
    CREATE INDEX IF NOT EXISTS idx_consolidation_history_memory_id ON consolidation_history(memory_id);
    CREATE INDEX IF NOT EXISTS idx_consolidation_history_consolidated_at ON consolidation_history(consolidated_at);
  `)

  // Create consolidation rules table
  await client.query(`
    CREATE TABLE IF NOT EXISTS consolidation_rules (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      agent_id TEXT NOT NULL,
      from_tier TEXT NOT NULL,
      to_tier TEXT NOT NULL,
      condition_type TEXT NOT NULL CHECK (condition_type IN ('importance', 'age', 'emotional', 'access_frequency')),
      threshold REAL NOT NULL,
      config JSONB DEFAULT '{}',
      enabled BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  // Create index
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_consolidation_rules_agent_id ON consolidation_rules(agent_id);
    CREATE INDEX IF NOT EXISTS idx_consolidation_rules_enabled ON consolidation_rules(enabled);
  `)
}

/**
 * Available migrations in order
 */
export const MIGRATIONS = [
  {
    name: '001_enhanced_schema',
    up: migration_001_enhanced_schema,
    description: 'Enhanced memory schema with multi-tier support, vector embeddings, and shared memory pools'
  },
  {
    name: '002_archival_system',
    up: migration_002_archival_system,
    description: 'Memory archival system with compression and summarization support'
  },
  {
    name: '003_consolidation_tracking',
    up: migration_003_consolidation_tracking,
    description: 'Memory consolidation tracking and rules management'
  }
]

/**
 * Create migrations tracking table
 */
export async function createMigrationsTable(client: PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS neon_migrations (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      batch INTEGER NOT NULL,
      migration_time TIMESTAMPTZ DEFAULT NOW()
    )
  `)
}

/**
 * Check if a migration has been run
 */
export async function isMigrationApplied(client: PoolClient, migrationName: string): Promise<boolean> {
  const result = await client.query(
    'SELECT name FROM neon_migrations WHERE name = $1',
    [migrationName]
  )
  return result.rows.length > 0
}

/**
 * Record a migration as completed
 */
export async function recordMigration(client: PoolClient, migrationName: string, batch: number): Promise<void> {
  await client.query(
    'INSERT INTO neon_migrations (name, batch) VALUES ($1, $2)',
    [migrationName, batch]
  )
}

/**
 * Get the current migration batch number
 */
export async function getCurrentBatch(client: PoolClient): Promise<number> {
  const result = await client.query('SELECT MAX(batch) as max_batch FROM neon_migrations')
  return (result.rows[0]?.max_batch || 0) + 1
}