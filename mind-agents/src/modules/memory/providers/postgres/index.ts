/**
 * PostgreSQL Memory Provider for SYMindX
 * 
 * A comprehensive memory provider that uses PostgreSQL as a backend with automatic schema deployment,
 * vector search capabilities, and optimized performance for production workloads.
 */

import { Pool, PoolClient } from 'pg'
import { MemoryRecord, MemoryType, MemoryDuration } from '../../../../types/agent.js'
import { BaseMemoryProvider, BaseMemoryConfig } from '../../base-memory-provider.js'
import { MemoryProviderMetadata } from '../../../../types/memory.js'

/**
 * Configuration for the PostgreSQL memory provider
 */
export interface PostgresMemoryConfig extends BaseMemoryConfig {
  /** PostgreSQL connection string */
  connectionString: string
  /** Maximum number of connections in the pool */
  maxConnections?: number
  /** Connection timeout in milliseconds */
  connectionTimeoutMillis?: number
  /** Idle timeout in milliseconds */
  idleTimeoutMillis?: number
  /** Enable SSL (default: true) */
  ssl?: boolean
  /** Custom table name (default: 'memories') */
  tableName?: string
  /** Auto-deploy schema on initialization (default: true) */
  autoDeploySchema?: boolean
  /** Enable connection pooling (default: true) */
  enablePooling?: boolean
}

/**
 * PostgreSQL database row type
 */
export interface PostgresMemoryRow {
  id: string
  agent_id: string
  type: string
  content: string
  embedding?: number[]
  metadata: Record<string, any>
  importance: number
  timestamp: Date
  tags: string[]
  duration: string
  expires_at?: Date
  created_at: Date
  updated_at: Date
}

/**
 * PostgreSQL memory provider implementation with auto-deployment and vector search
 */
export class PostgresMemoryProvider extends BaseMemoryProvider {
  private pool: Pool
  protected declare config: PostgresMemoryConfig
  private tableName: string
  private isInitialized = false
  private schemaVersion = '1.0.0'

  /**
   * Constructor for the PostgreSQL memory provider
   */
  constructor(config: PostgresMemoryConfig) {
    const metadata: MemoryProviderMetadata = {
      id: 'postgres',
      name: 'PostgreSQL Memory Provider',
      description: 'A production-ready memory provider using PostgreSQL with auto-deployment and vector search',
      version: '1.0.0',
      author: 'SYMindX Team',
      supportsVectorSearch: true,
      isPersistent: true
    }

    super(config, metadata)
    this.config = {
      maxConnections: 20,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      ssl: true,
      tableName: 'memories',
      autoDeploySchema: true,
      enablePooling: true,
      ...config
    }
    this.tableName = this.config.tableName!

    // Create connection pool
    this.pool = new Pool({
      connectionString: config.connectionString,
      max: this.config.maxConnections,
      connectionTimeoutMillis: this.config.connectionTimeoutMillis,
      idleTimeoutMillis: this.config.idleTimeoutMillis,
      ssl: this.config.ssl ? (typeof this.config.ssl === 'boolean' ? { rejectUnauthorized: false } : this.config.ssl) : false,
      application_name: 'symindx-memory-provider'
    })

    this.initialize()
  }

  /**
   * Initialize the database schema and extensions
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      console.log('🚀 Initializing PostgreSQL memory provider...')
      
      // Test connection
      await this.testConnection()
      
      if (this.config.autoDeploySchema) {
        await this.deploySchema()
      }
      
      this.isInitialized = true
      console.log('✅ PostgreSQL memory provider initialized successfully')
    } catch (error) {
      console.error('❌ Failed to initialize PostgreSQL memory provider:', error)
      throw error
    }
  }

  /**
   * Test database connection
   */
  private async testConnection(): Promise<void> {
    const client = await this.pool.connect()
    try {
      const result = await client.query('SELECT version()')
      console.log('🔗 Connected to PostgreSQL:', result.rows[0]?.version?.split(' ').slice(0, 2).join(' '))
    } finally {
      client.release()
    }
  }

  /**
   * Deploy the complete database schema
   */
  private async deploySchema(): Promise<void> {
    const client = await this.pool.connect()
    try {
      console.log('🏗️ Deploying database schema...')
      
      // Enable extensions
      await this.enableExtensions(client)
      
      // Create main memories table
      await this.createMemoriesTable(client)
      
      // Create indexes for performance
      await this.createIndexes(client)
      
      // Create functions and procedures
      await this.createFunctions(client)
      
      // Create triggers
      await this.createTriggers(client)
      
      // Create schema version tracking
      await this.createSchemaVersioning(client)
      
      console.log('✅ Database schema deployed successfully')
    } finally {
      client.release()
    }
  }

  /**
   * Enable required PostgreSQL extensions
   */
  private async enableExtensions(client: PoolClient): Promise<void> {
    const extensions = [
      'vector',      // pgvector for vector operations
      'pg_trgm',     // Trigram matching for text search
      'btree_gin',   // GIN indexes for btree operations
      'uuid-ossp'    // UUID generation
    ]

    for (const extension of extensions) {
      try {
        await client.query(`CREATE EXTENSION IF NOT EXISTS "${extension}";`)
        console.log(`📦 Enabled extension: ${extension}`)
      } catch (error) {
        console.warn(`⚠️ Could not enable extension ${extension}:`, (error as any).message)
      }
    }
  }

  /**
   * Create the main memories table
   */
  private async createMemoriesTable(client: PoolClient): Promise<void> {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
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
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `
    
    await client.query(createTableQuery)
    console.log(`🗄️ Created table: ${this.tableName}`)
  }

  /**
   * Create optimized indexes
   */
  private async createIndexes(client: PoolClient): Promise<void> {
    const indexes = [
      // Primary query indexes
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_agent_id ON ${this.tableName}(agent_id);`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_type ON ${this.tableName}(type);`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_timestamp ON ${this.tableName}(timestamp DESC);`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_importance ON ${this.tableName}(importance DESC);`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_duration ON ${this.tableName}(duration);`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_expires_at ON ${this.tableName}(expires_at) WHERE expires_at IS NOT NULL;`,
      
      // Composite indexes for common query patterns
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_agent_type_time ON ${this.tableName}(agent_id, type, timestamp DESC);`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_agent_duration_time ON ${this.tableName}(agent_id, duration, timestamp DESC);`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_agent_importance ON ${this.tableName}(agent_id, importance DESC);`,
      
      // Full-text search index
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_content_fts ON ${this.tableName} USING gin(to_tsvector('english', content));`,
      
      // Metadata and tags indexes
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_metadata_gin ON ${this.tableName} USING gin(metadata);`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_tags_gin ON ${this.tableName} USING gin(tags);`
    ]

    // Vector index (with fallback if pgvector not available)
    try {
      await client.query(`CREATE INDEX IF NOT EXISTS idx_${this.tableName}_embedding_hnsw ON ${this.tableName} USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);`)
      console.log('🔍 Created HNSW vector index')
    } catch (error) {
      try {
        await client.query(`CREATE INDEX IF NOT EXISTS idx_${this.tableName}_embedding_ivfflat ON ${this.tableName} USING ivfflat (embedding vector_cosine_ops);`)
        console.log('🔍 Created IVFFlat vector index')
      } catch (fallbackError) {
        console.warn('⚠️ Could not create vector index, pgvector may not be available')
      }
    }

    for (const indexQuery of indexes) {
      try {
        await client.query(indexQuery)
      } catch (error) {
        console.warn('⚠️ Could not create index:', (error as any).message)
      }
    }

    console.log('📊 Created database indexes')
  }

  /**
   * Create database functions
   */
  private async createFunctions(client: PoolClient): Promise<void> {
    // Vector similarity search function
    const vectorSearchFunction = `
      CREATE OR REPLACE FUNCTION search_${this.tableName}(
        p_agent_id TEXT,
        p_query_embedding vector(1536),
        p_match_threshold FLOAT DEFAULT 0.7,
        p_match_count INTEGER DEFAULT 10,
        p_memory_type TEXT DEFAULT NULL,
        p_duration TEXT DEFAULT NULL,
        p_min_importance FLOAT DEFAULT NULL
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
          1 - (m.embedding <=> p_query_embedding) AS similarity
        FROM ${this.tableName} m
        WHERE m.agent_id = p_agent_id
        AND m.embedding IS NOT NULL
        AND (p_memory_type IS NULL OR m.type = p_memory_type)
        AND (p_duration IS NULL OR m.duration = p_duration)
        AND (p_min_importance IS NULL OR m.importance >= p_min_importance)
        AND (m.duration != 'short_term' OR m.expires_at IS NULL OR m.expires_at > NOW())
        AND 1 - (m.embedding <=> p_query_embedding) > p_match_threshold
        ORDER BY similarity DESC
        LIMIT p_match_count;
      END;
      $$;
    `

    // Cleanup function
    const cleanupFunction = `
      CREATE OR REPLACE FUNCTION cleanup_expired_${this.tableName}()
      RETURNS INTEGER
      LANGUAGE plpgsql
      AS $$
      DECLARE
        deleted_count INTEGER;
      BEGIN
        DELETE FROM ${this.tableName} 
        WHERE duration = 'short_term' 
        AND expires_at IS NOT NULL 
        AND expires_at < NOW();
        
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RETURN deleted_count;
      END;
      $$;
    `

    // Statistics function
    const statsFunction = `
      CREATE OR REPLACE FUNCTION get_${this.tableName}_stats(p_agent_id TEXT)
      RETURNS TABLE (
        total_memories INTEGER,
        short_term_count INTEGER,
        long_term_count INTEGER,
        working_count INTEGER,
        episodic_count INTEGER,
        avg_importance FLOAT,
        earliest_memory TIMESTAMPTZ,
        latest_memory TIMESTAMPTZ,
        memories_with_embeddings INTEGER
      )
      LANGUAGE plpgsql
      AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          COUNT(*)::INTEGER as total_memories,
          COUNT(*) FILTER (WHERE duration = 'short_term')::INTEGER as short_term_count,
          COUNT(*) FILTER (WHERE duration = 'long_term')::INTEGER as long_term_count,
          COUNT(*) FILTER (WHERE duration = 'working')::INTEGER as working_count,
          COUNT(*) FILTER (WHERE duration = 'episodic')::INTEGER as episodic_count,
          AVG(importance)::FLOAT as avg_importance,
          MIN(timestamp) as earliest_memory,
          MAX(timestamp) as latest_memory,
          COUNT(*) FILTER (WHERE embedding IS NOT NULL)::INTEGER as memories_with_embeddings
        FROM ${this.tableName}
        WHERE agent_id = p_agent_id
        AND (duration != 'short_term' OR expires_at IS NULL OR expires_at > NOW());
      END;
      $$;
    `

    const functions = [vectorSearchFunction, cleanupFunction, statsFunction]
    
    for (const func of functions) {
      try {
        await client.query(func)
      } catch (error) {
        console.warn('⚠️ Could not create function:', (error as any).message)
      }
    }

    console.log('⚙️ Created database functions')
  }

  /**
   * Create database triggers
   */
  private async createTriggers(client: PoolClient): Promise<void> {
    // Updated timestamp trigger function
    const updateTimestampFunction = `
      CREATE OR REPLACE FUNCTION update_${this.tableName}_updated_at()
      RETURNS TRIGGER
      LANGUAGE plpgsql
      AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$;
    `

    // Create trigger
    const createTrigger = `
      DROP TRIGGER IF EXISTS trigger_${this.tableName}_updated_at ON ${this.tableName};
      CREATE TRIGGER trigger_${this.tableName}_updated_at
        BEFORE UPDATE ON ${this.tableName}
        FOR EACH ROW
        EXECUTE FUNCTION update_${this.tableName}_updated_at();
    `

    try {
      await client.query(updateTimestampFunction)
      await client.query(createTrigger)
      console.log('⚡ Created database triggers')
    } catch (error) {
      console.warn('⚠️ Could not create triggers:', (error as any).message)
    }
  }

  /**
   * Create schema versioning table
   */
  private async createSchemaVersioning(client: PoolClient): Promise<void> {
    const versioningQuery = `
      CREATE TABLE IF NOT EXISTS schema_versions (
        id SERIAL PRIMARY KEY,
        version TEXT NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        description TEXT
      );

      INSERT INTO schema_versions (version, description) 
      VALUES ('${this.schemaVersion}', 'Initial SYMindX memory schema')
      ON CONFLICT DO NOTHING;
    `

    try {
      await client.query(versioningQuery)
      console.log('📋 Created schema versioning')
    } catch (error) {
      console.warn('⚠️ Could not create schema versioning:', (error as any).message)
    }
  }

  /**
   * Store a memory for an agent
   */
  async store(agentId: string, memory: MemoryRecord): Promise<void> {
    await this.initialize()
    
    const client = await this.pool.connect()
    
    try {
      const query = `
        INSERT INTO ${this.tableName} (
          id, agent_id, type, content, embedding, metadata, importance, 
          timestamp, tags, duration, expires_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
        ON CONFLICT (id) DO UPDATE SET
          agent_id = EXCLUDED.agent_id,
          type = EXCLUDED.type,
          content = EXCLUDED.content,
          embedding = EXCLUDED.embedding,
          metadata = EXCLUDED.metadata,
          importance = EXCLUDED.importance,
          timestamp = EXCLUDED.timestamp,
          tags = EXCLUDED.tags,
          duration = EXCLUDED.duration,
          expires_at = EXCLUDED.expires_at,
          updated_at = NOW()
      `

      const values = [
        memory.id,
        agentId,
        memory.type,
        memory.content,
        memory.embedding ? JSON.stringify(memory.embedding) : null,
        JSON.stringify(memory.metadata || {}),
        memory.importance,
        memory.timestamp,
        memory.tags || [],
        memory.duration || MemoryDuration.LONG_TERM,
        memory.expiresAt
      ]

      await client.query(query, values)
      console.log(`💾 Stored ${memory.duration || 'long_term'} memory: ${memory.type} for agent ${agentId}`)
    } finally {
      client.release()
    }
  }

  /**
   * Retrieve memories for an agent based on a query
   */
  async retrieve(agentId: string, query: string, limit = 10): Promise<MemoryRecord[]> {
    await this.initialize()
    
    const client = await this.pool.connect()
    
    try {
      let queryText: string
      let values: any[]

      const baseCondition = `agent_id = $1 AND (duration != 'short_term' OR expires_at IS NULL OR expires_at > NOW())`

      if (query === 'recent') {
        queryText = `
          SELECT * FROM ${this.tableName} 
          WHERE ${baseCondition}
          ORDER BY timestamp DESC 
          LIMIT $2
        `
        values = [agentId, limit]
      } else if (query === 'important') {
        queryText = `
          SELECT * FROM ${this.tableName} 
          WHERE ${baseCondition}
          ORDER BY importance DESC 
          LIMIT $2
        `
        values = [agentId, limit]
      } else if (query === 'short_term') {
        queryText = `
          SELECT * FROM ${this.tableName} 
          WHERE agent_id = $1 AND duration = 'short_term' 
            AND (expires_at IS NULL OR expires_at > NOW())
          ORDER BY timestamp DESC 
          LIMIT $2
        `
        values = [agentId, limit]
      } else if (query === 'long_term') {
        queryText = `
          SELECT * FROM ${this.tableName} 
          WHERE agent_id = $1 AND duration = 'long_term'
          ORDER BY importance DESC 
          LIMIT $2
        `
        values = [agentId, limit]
      } else {
        // Full-text search using PostgreSQL's text search
        queryText = `
          SELECT *, ts_rank(to_tsvector('english', content), plainto_tsquery('english', $2)) as rank
          FROM ${this.tableName} 
          WHERE ${baseCondition} AND to_tsvector('english', content) @@ plainto_tsquery('english', $2)
          ORDER BY rank DESC, importance DESC, timestamp DESC 
          LIMIT $3
        `
        values = [agentId, query, limit]
      }

      const result = await client.query(queryText, values)
      return result.rows.map(row => this.rowToMemoryRecord(row))
    } finally {
      client.release()
    }
  }

  /**
   * Search for memories using vector similarity
   */
  async search(agentId: string, embedding: number[], limit = 10): Promise<MemoryRecord[]> {
    await this.initialize()
    
    const client = await this.pool.connect()
    
    try {
      // Try vector search using the database function
      const vectorQuery = `SELECT * FROM search_${this.tableName}($1, $2, $3, $4)`
      
      try {
        const result = await client.query(vectorQuery, [agentId, JSON.stringify(embedding), 0.7, limit])
        return result.rows.map(row => this.rowToMemoryRecord(row))
      } catch (error) {
        console.warn('⚠️ Vector search failed, falling back to recent memories:', error)
        return this.retrieve(agentId, 'recent', limit)
      }
    } finally {
      client.release()
    }
  }

  /**
   * Delete a memory for an agent
   */
  async delete(agentId: string, memoryId: string): Promise<void> {
    await this.initialize()
    
    const client = await this.pool.connect()
    
    try {
      const query = `DELETE FROM ${this.tableName} WHERE agent_id = $1 AND id = $2`
      const result = await client.query(query, [agentId, memoryId])
      
      if (result.rowCount === 0) {
        throw new Error(`Memory ${memoryId} not found for agent ${agentId}`)
      }

      console.log(`🗑️ Deleted memory: ${memoryId} for agent ${agentId}`)
    } finally {
      client.release()
    }
  }

  /**
   * Clear all memories for an agent
   */
  async clear(agentId: string): Promise<void> {
    await this.initialize()
    
    const client = await this.pool.connect()
    
    try {
      const query = `DELETE FROM ${this.tableName} WHERE agent_id = $1`
      const result = await client.query(query, [agentId])
      
      console.log(`🧹 Cleared ${result.rowCount} memories for agent ${agentId}`)
    } finally {
      client.release()
    }
  }

  /**
   * Get statistics about an agent's memories
   */
  async getStats(agentId: string): Promise<{ total: number; byType: Record<string, number> }> {
    await this.initialize()
    
    const client = await this.pool.connect()
    
    try {
      // Use the database function for comprehensive stats
      const statsQuery = `SELECT * FROM get_${this.tableName}_stats($1)`
      const statsResult = await client.query(statsQuery, [agentId])
      const stats = statsResult.rows[0]

      // Get count by type
      const typeQuery = `
        SELECT type, COUNT(*) as count 
        FROM ${this.tableName} 
        WHERE agent_id = $1 
        GROUP BY type
      `
      const typeResult = await client.query(typeQuery, [agentId])
      
      const byType: Record<string, number> = {}
      typeResult.rows.forEach(row => {
        byType[row.type] = parseInt(row.count)
      })

      return { 
        total: stats?.total_memories || 0, 
        byType 
      }
    } finally {
      client.release()
    }
  }

  /**
   * Clean up old and expired memories for an agent
   */
  async cleanup(agentId: string, retentionDays: number): Promise<void> {
    await this.initialize()
    
    const client = await this.pool.connect()
    
    try {
      const cutoffDate = new Date(Date.now() - (retentionDays * 24 * 60 * 60 * 1000))

      // Clean up expired short-term memories using the function
      const expiredResult = await client.query(`SELECT cleanup_expired_${this.tableName}()`)
      const expiredCount = expiredResult.rows[0]?.cleanup_expired_memories || 0

      // Clean up old memories beyond retention period
      const oldQuery = `DELETE FROM ${this.tableName} WHERE agent_id = $1 AND timestamp < $2`
      const oldResult = await client.query(oldQuery, [agentId, cutoffDate])

      console.log(`🧹 Cleaned up ${expiredCount} expired and ${oldResult.rowCount} old memories for agent ${agentId}`)
    } finally {
      client.release()
    }
  }

  /**
   * Convert a database row to a memory record
   */
  private rowToMemoryRecord(row: any): MemoryRecord {
    let embedding: number[] | undefined = undefined
    
    if (row.embedding) {
      try {
        embedding = typeof row.embedding === 'string' 
          ? JSON.parse(row.embedding) 
          : row.embedding
      } catch (error) {
        console.warn('⚠️ Failed to parse embedding:', error)
      }
    }

    return {
      id: row.id,
      agentId: row.agent_id,
      type: MemoryType[row.type.toUpperCase() as keyof typeof MemoryType] || MemoryType.EXPERIENCE,
      content: row.content,
      embedding,
      metadata: row.metadata || {},
      importance: row.importance,
      timestamp: new Date(row.timestamp),
      tags: row.tags || [],
      duration: MemoryDuration[row.duration.toUpperCase() as keyof typeof MemoryDuration] || MemoryDuration.LONG_TERM,
      expiresAt: row.expires_at ? new Date(row.expires_at) : undefined
    }
  }

  /**
   * Check database connection health
   */
  async healthCheck(): Promise<{ healthy: boolean; latency: number; version?: string }> {
    const start = Date.now()
    
    try {
      const client = await this.pool.connect()
      try {
        const result = await client.query('SELECT version()')
        const latency = Date.now() - start
        const version = result.rows[0]?.version?.split(' ').slice(0, 2).join(' ')
        return { healthy: true, latency, version }
      } finally {
        client.release()
      }
    } catch (error) {
      console.error('❌ PostgreSQL health check failed:', error)
      return { healthy: false, latency: -1 }
    }
  }

  /**
   * Get connection pool status
   */
  getPoolStatus(): { total: number; idle: number; waiting: number } {
    return {
      total: this.pool.totalCount,
      idle: this.pool.idleCount,
      waiting: this.pool.waitingCount
    }
  }

  /**
   * Get schema information
   */
  async getSchemaInfo(): Promise<{ version: string; tables: string[]; functions: string[] }> {
    const client = await this.pool.connect()
    
    try {
      // Get schema version
      const versionResult = await client.query(
        'SELECT version FROM schema_versions ORDER BY applied_at DESC LIMIT 1'
      )
      const version = versionResult.rows[0]?.version || 'unknown'

      // Get tables
      const tablesResult = await client.query(`
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' AND tablename LIKE '%${this.tableName}%'
      `)
      const tables = tablesResult.rows.map(row => row.tablename)

      // Get functions
      const functionsResult = await client.query(`
        SELECT proname FROM pg_proc 
        WHERE proname LIKE '%${this.tableName}%'
      `)
      const functions = functionsResult.rows.map(row => row.proname)

      return { version, tables, functions }
    } finally {
      client.release()
    }
  }

  /**
   * Cleanup connections and resources
   */
  async disconnect(): Promise<void> {
    try {
      await this.pool.end()
      console.log('🔌 PostgreSQL memory provider disconnected')
    } catch (error) {
      console.error('❌ Error disconnecting PostgreSQL provider:', error)
    }
  }
}

/**
 * Create a PostgreSQL memory provider
 */
export function createPostgresMemoryProvider(config: PostgresMemoryConfig): PostgresMemoryProvider {
  return new PostgresMemoryProvider(config)
}

/**
 * Helper function to create a PostgreSQL connection string
 */
export function createPostgresConnectionString(
  host: string,
  port: number,
  database: string,
  username: string,
  password: string,
  options: Record<string, string> = {}
): string {
  const params = new URLSearchParams({
    sslmode: 'prefer',
    ...options
  })
  
  return `postgresql://${username}:${password}@${host}:${port}/${database}?${params.toString()}`
}

/**
 * Default PostgreSQL provider for quick setup
 */
export function createDefaultPostgresProvider(connectionString: string): PostgresMemoryProvider {
  return new PostgresMemoryProvider({
    connectionString,
    maxConnections: 20,
    autoDeploySchema: true,
    enablePooling: true
  })
}