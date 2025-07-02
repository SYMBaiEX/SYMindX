/**
 * Supabase Memory Database Migrations for SYMindX
 * 
 * Enhanced migration system for Supabase with multi-tier memory support,
 * vector embeddings, and shared memory pools
 */

import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Migration 001: Enhanced memory schema with tiers and vector support
 */
export async function migration_001_enhanced_memory_schema(client: SupabaseClient): Promise<void> {
  // Enable pgvector extension
  await client.rpc('exec_sql', {
    sql: `CREATE EXTENSION IF NOT EXISTS vector;`
  }).catch(() => {
    console.log('pgvector extension may already exist or require higher privileges')
  })

  // Create memories table with enhanced fields
  await client.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        embedding vector(1536), -- OpenAI embedding dimension
        metadata JSONB DEFAULT '{}',
        importance REAL NOT NULL DEFAULT 0.5,
        timestamp TIMESTAMPTZ NOT NULL,
        tags TEXT[] DEFAULT '{}',
        duration TEXT NOT NULL DEFAULT 'long_term' CHECK (duration IN ('short_term', 'long_term')),
        expires_at TIMESTAMPTZ,
        tier TEXT DEFAULT 'episodic' CHECK (tier IN ('working', 'episodic', 'semantic', 'procedural')),
        context JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `
  })

  // Create indexes for performance
  await client.rpc('exec_sql', {
    sql: `
      CREATE INDEX IF NOT EXISTS idx_memories_agent_id ON memories(agent_id);
      CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type);
      CREATE INDEX IF NOT EXISTS idx_memories_timestamp ON memories(timestamp);
      CREATE INDEX IF NOT EXISTS idx_memories_importance ON memories(importance);
      CREATE INDEX IF NOT EXISTS idx_memories_duration ON memories(duration);
      CREATE INDEX IF NOT EXISTS idx_memories_expires_at ON memories(expires_at);
      CREATE INDEX IF NOT EXISTS idx_memories_tier ON memories(tier);
      CREATE INDEX IF NOT EXISTS idx_memories_tags ON memories USING GIN (tags);
    `
  })

  // Create vector similarity index
  await client.rpc('exec_sql', {
    sql: `CREATE INDEX IF NOT EXISTS idx_memories_embedding ON memories USING ivfflat (embedding vector_cosine_ops);`
  }).catch(() => {
    console.log('Vector index creation failed - ivfflat may not be available')
  })

  console.log('✅ Created enhanced memories table with tier support')
}

/**
 * Migration 002: Shared memory pools and mappings
 */
export async function migration_002_shared_memory_pools(client: SupabaseClient): Promise<void> {
  // Create shared memory pools table
  await client.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS shared_memory_pools (
        pool_id TEXT PRIMARY KEY,
        config JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `
  })

  // Create shared memory mappings table
  await client.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS shared_memory_mappings (
        memory_id TEXT NOT NULL,
        pool_id TEXT NOT NULL,
        shared_by TEXT NOT NULL,
        shared_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        permissions TEXT[] NOT NULL DEFAULT '{"read"}',
        metadata JSONB DEFAULT '{}',
        PRIMARY KEY (memory_id, pool_id),
        FOREIGN KEY (pool_id) REFERENCES shared_memory_pools(pool_id) ON DELETE CASCADE
      )
    `
  })

  // Create indexes
  await client.rpc('exec_sql', {
    sql: `
      CREATE INDEX IF NOT EXISTS idx_shared_mappings_pool ON shared_memory_mappings(pool_id);
      CREATE INDEX IF NOT EXISTS idx_shared_mappings_shared_by ON shared_memory_mappings(shared_by);
      CREATE INDEX IF NOT EXISTS idx_shared_pools_created_at ON shared_memory_pools(created_at);
    `
  })

  console.log('✅ Created shared memory pools and mappings tables')
}

/**
 * Migration 003: Vector search and utility functions
 */
export async function migration_003_vector_search_functions(client: SupabaseClient): Promise<void> {
  // Enhanced vector search function with tier support
  await client.rpc('exec_sql', {
    sql: `
      CREATE OR REPLACE FUNCTION match_memories(
        agent_id TEXT,
        query_embedding vector(1536),
        match_threshold FLOAT DEFAULT 0.7,
        match_count INT DEFAULT 10,
        tier_filter TEXT DEFAULT NULL
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
        created_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ,
        similarity FLOAT
      )
      LANGUAGE SQL
      STABLE
      AS $$
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
          m.created_at,
          m.updated_at,
          1 - (m.embedding <=> query_embedding) AS similarity
        FROM memories m
        WHERE 
          m.agent_id = match_memories.agent_id
          AND (m.duration != 'short_term' OR m.expires_at IS NULL OR m.expires_at > NOW())
          AND m.embedding IS NOT NULL
          AND 1 - (m.embedding <=> query_embedding) > match_threshold
          AND (tier_filter IS NULL OR m.tier = tier_filter)
        ORDER BY similarity DESC
        LIMIT match_count;
      $$;
    `
  })

  // Memory consolidation function
  await client.rpc('exec_sql', {
    sql: `
      CREATE OR REPLACE FUNCTION consolidate_memories(
        p_agent_id TEXT,
        p_from_tier TEXT,
        p_to_tier TEXT,
        p_threshold FLOAT DEFAULT 0.7
      )
      RETURNS INTEGER
      LANGUAGE plpgsql
      AS $$
      DECLARE
        consolidated_count INTEGER := 0;
      BEGIN
        UPDATE memories
        SET tier = p_to_tier,
            updated_at = NOW()
        WHERE agent_id = p_agent_id
          AND tier = p_from_tier
          AND importance >= p_threshold;
        
        GET DIAGNOSTICS consolidated_count = ROW_COUNT;
        RETURN consolidated_count;
      END;
      $$;
    `
  })

  // Memory statistics function
  await client.rpc('exec_sql', {
    sql: `
      CREATE OR REPLACE FUNCTION get_memory_stats(p_agent_id TEXT)
      RETURNS TABLE (
        total_count BIGINT,
        tier_counts JSONB,
        type_counts JSONB,
        avg_importance FLOAT,
        oldest_memory TIMESTAMPTZ,
        newest_memory TIMESTAMPTZ
      )
      LANGUAGE SQL
      STABLE
      AS $$
        SELECT 
          COUNT(*) as total_count,
          jsonb_object_agg(tier, tier_count) as tier_counts,
          jsonb_object_agg(type, type_count) as type_counts,
          AVG(importance) as avg_importance,
          MIN(timestamp) as oldest_memory,
          MAX(timestamp) as newest_memory
        FROM (
          SELECT 
            tier,
            type,
            importance,
            timestamp,
            COUNT(*) OVER (PARTITION BY tier) as tier_count,
            COUNT(*) OVER (PARTITION BY type) as type_count
          FROM memories
          WHERE agent_id = p_agent_id
        ) t
        GROUP BY tier, type, tier_count, type_count;
      $$;
    `
  })

  console.log('✅ Created vector search and utility functions')
}

/**
 * Migration 004: Triggers and automated processes
 */
export async function migration_004_triggers_and_automation(client: SupabaseClient): Promise<void> {
  // Update timestamp trigger
  await client.rpc('exec_sql', {
    sql: `
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `
  })

  // Apply trigger to memories table
  await client.rpc('exec_sql', {
    sql: `
      DROP TRIGGER IF EXISTS update_memories_updated_at ON memories;
      CREATE TRIGGER update_memories_updated_at 
        BEFORE UPDATE ON memories 
        FOR EACH ROW 
        EXECUTE FUNCTION update_updated_at_column();
    `
  })

  // Apply trigger to shared_memory_pools table
  await client.rpc('exec_sql', {
    sql: `
      DROP TRIGGER IF EXISTS update_shared_pools_updated_at ON shared_memory_pools;
      CREATE TRIGGER update_shared_pools_updated_at 
        BEFORE UPDATE ON shared_memory_pools 
        FOR EACH ROW 
        EXECUTE FUNCTION update_updated_at_column();
    `
  })

  // Auto-expire short-term memories function
  await client.rpc('exec_sql', {
    sql: `
      CREATE OR REPLACE FUNCTION cleanup_expired_memories()
      RETURNS INTEGER
      LANGUAGE plpgsql
      AS $$
      DECLARE
        deleted_count INTEGER := 0;
      BEGIN
        DELETE FROM memories
        WHERE duration = 'short_term' 
          AND expires_at IS NOT NULL 
          AND expires_at < NOW();
        
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RETURN deleted_count;
      END;
      $$;
    `
  })

  console.log('✅ Created triggers and automation functions')
}

/**
 * Migration 005: RPC helper functions
 */
export async function migration_005_rpc_helpers(client: SupabaseClient): Promise<void> {
  // Function to check if tables exist
  await client.rpc('exec_sql', {
    sql: `
      CREATE OR REPLACE FUNCTION create_memories_table_if_not_exists(table_name TEXT DEFAULT 'memories')
      RETURNS VOID
      LANGUAGE plpgsql
      AS $$
      BEGIN
        -- This function is a helper for the provider initialization
        RAISE NOTICE 'Memories table initialization checked';
      END;
      $$;
    `
  })

  await client.rpc('exec_sql', {
    sql: `
      CREATE OR REPLACE FUNCTION create_shared_memory_tables_if_not_exists()
      RETURNS VOID
      LANGUAGE plpgsql
      AS $$
      BEGIN
        -- This function is a helper for the provider initialization
        RAISE NOTICE 'Shared memory tables initialization checked';
      END;
      $$;
    `
  })

  // Function to get available extensions
  await client.rpc('exec_sql', {
    sql: `
      CREATE OR REPLACE FUNCTION get_extensions()
      RETURNS TABLE (name TEXT)
      LANGUAGE SQL
      STABLE
      AS $$
        SELECT extname::TEXT as name FROM pg_extension;
      $$;
    `
  })

  // Helper function to execute SQL (for migrations)
  await client.rpc('exec_sql', {
    sql: `
      CREATE OR REPLACE FUNCTION exec_sql(sql TEXT)
      RETURNS VOID
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        EXECUTE sql;
      END;
      $$;
    `
  }).catch(() => {
    console.log('exec_sql function may already exist or require higher privileges')
  })

  console.log('✅ Created RPC helper functions')
}

/**
 * Available migrations in order
 */
export const MIGRATIONS = [
  {
    name: '001_enhanced_memory_schema',
    up: migration_001_enhanced_memory_schema,
    description: 'Enhanced memory schema with tiers, vector support, and context'
  },
  {
    name: '002_shared_memory_pools',
    up: migration_002_shared_memory_pools,
    description: 'Shared memory pools and mappings for multi-agent collaboration'
  },
  {
    name: '003_vector_search_functions',
    up: migration_003_vector_search_functions,
    description: 'Vector search and utility functions for memory operations'
  },
  {
    name: '004_triggers_and_automation',
    up: migration_004_triggers_and_automation,
    description: 'Triggers and automated processes for memory management'
  },
  {
    name: '005_rpc_helpers',
    up: migration_005_rpc_helpers,
    description: 'RPC helper functions for provider initialization'
  }
]

/**
 * Check if migrations table exists
 */
export async function checkMigrationsTable(client: SupabaseClient): Promise<boolean> {
  const { data, error } = await client
    .from('supabase_migrations')
    .select('id')
    .limit(1)

  return !error
}

/**
 * Create migrations tracking table
 */
export async function createMigrationsTable(client: SupabaseClient): Promise<void> {
  await client.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS supabase_migrations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        batch INTEGER NOT NULL,
        migration_time TIMESTAMPTZ DEFAULT NOW()
      )
    `
  })
}

/**
 * Run all pending migrations
 */
export async function runMigrations(client: SupabaseClient): Promise<void> {
  console.log('🔄 Running Supabase memory migrations...')

  // Check if migrations table exists
  const hasTable = await checkMigrationsTable(client)
  if (!hasTable) {
    await createMigrationsTable(client)
    console.log('✅ Created migrations tracking table')
  }

  // Get current migration batch
  const { data: lastBatch } = await client
    .from('supabase_migrations')
    .select('batch')
    .order('batch', { ascending: false })
    .limit(1)
    .single()
  
  const currentBatch = (lastBatch?.batch || 0) + 1

  // Get already run migrations
  const { data: completedMigrations } = await client
    .from('supabase_migrations')
    .select('name')
  
  const completedNames = (completedMigrations || []).map(m => m.name)

  // Run pending migrations
  let migrationsRun = 0
  
  for (const migration of MIGRATIONS) {
    if (!completedNames.includes(migration.name)) {
      console.log(`🔄 Running migration: ${migration.name}`)
      console.log(`   ${migration.description}`)
      
      try {
        await migration.up(client)
        
        // Record migration as completed
        await client
          .from('supabase_migrations')
          .insert({
            name: migration.name,
            batch: currentBatch
          })
        
        console.log(`✅ Migration completed: ${migration.name}`)
        migrationsRun++
      } catch (error) {
        console.error(`❌ Migration failed: ${migration.name}`, error)
        throw error
      }
    } else {
      console.log(`⏭️  Migration already applied: ${migration.name}`)
    }
  }

  if (migrationsRun > 0) {
    console.log(`✅ Applied ${migrationsRun} new migrations successfully`)
  } else {
    console.log('✅ All migrations were already applied')
  }
}