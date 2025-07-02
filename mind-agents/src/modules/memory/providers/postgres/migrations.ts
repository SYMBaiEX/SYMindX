/**
 * PostgreSQL Memory Provider Migrations
 * 
 * Database migrations for the enhanced PostgreSQL memory provider
 */

export interface Migration {
  version: string
  description: string
  up: string
  down?: string
}

export const migrations: Migration[] = [
  {
    version: '1.0.0',
    description: 'Initial memory schema',
    up: `
      -- Enable required extensions
      CREATE EXTENSION IF NOT EXISTS "vector";
      CREATE EXTENSION IF NOT EXISTS "pg_trgm";
      CREATE EXTENSION IF NOT EXISTS "btree_gin";
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

      -- Create main memories table
      CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        embedding vector(1536),
        metadata JSONB DEFAULT '{}',
        importance REAL NOT NULL DEFAULT 0.5 CHECK (importance >= 0 AND importance <= 1),
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        tags TEXT[] DEFAULT '{}',
        duration TEXT NOT NULL DEFAULT 'long_term',
        expires_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Create indexes
      CREATE INDEX idx_memories_agent_id ON memories(agent_id);
      CREATE INDEX idx_memories_type ON memories(type);
      CREATE INDEX idx_memories_timestamp ON memories(timestamp DESC);
      CREATE INDEX idx_memories_importance ON memories(importance DESC);
      CREATE INDEX idx_memories_duration ON memories(duration);
      CREATE INDEX idx_memories_expires_at ON memories(expires_at) WHERE expires_at IS NOT NULL;
    `,
    down: `
      DROP TABLE IF EXISTS memories CASCADE;
    `
  },
  {
    version: '2.0.0',
    description: 'Add multi-tier memory support and shared pools',
    up: `
      -- Add tier and context columns
      ALTER TABLE memories 
      ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'episodic' 
        CHECK (tier IN ('working', 'episodic', 'semantic', 'procedural')),
      ADD COLUMN IF NOT EXISTS context JSONB;

      -- Add tier index
      CREATE INDEX IF NOT EXISTS idx_memories_tier ON memories(tier);
      CREATE INDEX IF NOT EXISTS idx_memories_agent_tier_time ON memories(agent_id, tier, timestamp DESC);

      -- Create shared memory pools table
      CREATE TABLE IF NOT EXISTS shared_memory_pools (
        pool_id TEXT PRIMARY KEY,
        config JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Create shared memory mappings table
      CREATE TABLE IF NOT EXISTS shared_memory_mappings (
        memory_id TEXT NOT NULL,
        pool_id TEXT NOT NULL,
        shared_by TEXT NOT NULL,
        shared_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        permissions TEXT[] NOT NULL,
        PRIMARY KEY (memory_id, pool_id),
        FOREIGN KEY (pool_id) REFERENCES shared_memory_pools(pool_id) ON DELETE CASCADE
      );

      -- Create indexes for shared memory
      CREATE INDEX IF NOT EXISTS idx_shared_mappings_pool ON shared_memory_mappings(pool_id);
      CREATE INDEX IF NOT EXISTS idx_shared_mappings_shared_by ON shared_memory_mappings(shared_by);

      -- Update vector search function
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

      -- Create consolidation statistics function
      CREATE OR REPLACE FUNCTION get_tier_statistics(p_agent_id TEXT)
      RETURNS TABLE (
        tier TEXT,
        memory_count INTEGER,
        avg_importance FLOAT,
        oldest_memory TIMESTAMPTZ,
        newest_memory TIMESTAMPTZ
      )
      LANGUAGE plpgsql
      AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          m.tier,
          COUNT(*)::INTEGER as memory_count,
          AVG(m.importance)::FLOAT as avg_importance,
          MIN(m.timestamp) as oldest_memory,
          MAX(m.timestamp) as newest_memory
        FROM memories m
        WHERE m.agent_id = p_agent_id
        GROUP BY m.tier
        ORDER BY 
          CASE m.tier
            WHEN 'working' THEN 1
            WHEN 'episodic' THEN 2
            WHEN 'semantic' THEN 3
            WHEN 'procedural' THEN 4
          END;
      END;
      $$;
    `,
    down: `
      -- Remove functions
      DROP FUNCTION IF EXISTS search_memories CASCADE;
      DROP FUNCTION IF EXISTS get_tier_statistics CASCADE;

      -- Remove shared memory tables
      DROP TABLE IF EXISTS shared_memory_mappings CASCADE;
      DROP TABLE IF EXISTS shared_memory_pools CASCADE;

      -- Remove tier columns
      ALTER TABLE memories 
      DROP COLUMN IF EXISTS tier,
      DROP COLUMN IF EXISTS context;
    `
  }
]

/**
 * Run a migration
 */
export async function runMigration(client: any, migration: Migration, direction: 'up' | 'down' = 'up'): Promise<void> {
  const sql = direction === 'up' ? migration.up : migration.down
  if (!sql) {
    throw new Error(`No ${direction} migration for version ${migration.version}`)
  }
  
  console.log(`Running migration ${migration.version} (${direction}): ${migration.description}`)
  await client.query(sql)
}

/**
 * Get current schema version
 */
export async function getCurrentVersion(client: any): Promise<string | null> {
  try {
    const result = await client.query(
      'SELECT version FROM schema_versions ORDER BY applied_at DESC LIMIT 1'
    )
    return result.rows[0]?.version || null
  } catch (error) {
    // Table doesn't exist yet
    return null
  }
}

/**
 * Record migration as applied
 */
export async function recordMigration(client: any, migration: Migration): Promise<void> {
  await client.query(
    'INSERT INTO schema_versions (version, description) VALUES ($1, $2)',
    [migration.version, migration.description]
  )
}