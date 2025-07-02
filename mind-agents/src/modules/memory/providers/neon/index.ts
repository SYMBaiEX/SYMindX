/**
 * Neon Memory Provider for SYMindX
 * 
 * A comprehensive memory provider that uses Neon PostgreSQL as a backend with vector search capabilities.
 * Optimized for serverless environments with connection pooling and efficient resource usage.
 */

import { Pool, PoolClient } from 'pg'
import { MemoryRecord, MemoryType, MemoryDuration } from '../../../../types/agent.js'
import { BaseMemoryProvider, BaseMemoryConfig } from '../../base-memory-provider.js'
import { MemoryProviderMetadata } from '../../../../types/memory.js'

/**
 * Configuration for the Neon memory provider
 */
export interface NeonMemoryConfig extends BaseMemoryConfig {
  /** Neon database connection string */
  connectionString: string
  /** Maximum number of connections in the pool */
  maxConnections?: number
  /** Connection timeout in milliseconds */
  connectionTimeoutMillis?: number
  /** Idle timeout in milliseconds */
  idleTimeoutMillis?: number
  /** Enable SSL (default: true for Neon) */
  ssl?: boolean
  /** Custom table name (default: 'memories') */
  tableName?: string
}

/**
 * Neon database row type
 */
export interface NeonMemoryRow {
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
 * Neon memory provider implementation with optimized connection pooling
 */
export class NeonMemoryProvider extends BaseMemoryProvider {
  private pool: Pool
  protected declare config: NeonMemoryConfig
  private tableName: string
  private isInitialized = false

  /**
   * Constructor for the Neon memory provider
   */
  constructor(config: NeonMemoryConfig) {
    const metadata: MemoryProviderMetadata = {
      id: 'neon',
      name: 'Neon Memory Provider',
      description: 'A serverless-optimized memory provider using Neon PostgreSQL with vector search',
      version: '1.0.0',
      author: 'SYMindX Team',
      supportsVectorSearch: true,
      isPersistent: true
    }

    super(config, metadata)
    this.config = config
    this.tableName = config.tableName || 'memories'

    // Create connection pool optimized for serverless
    this.pool = new Pool({
      connectionString: config.connectionString,
      max: config.maxConnections || 10,
      connectionTimeoutMillis: config.connectionTimeoutMillis || 5000,
      idleTimeoutMillis: config.idleTimeoutMillis || 30000,
      ssl: config.ssl !== false ? { rejectUnauthorized: false } : false,
      // Optimizations for serverless
      allowExitOnIdle: true,
      application_name: 'symindx-agent'
    })

    this.initialize()
  }

  /**
   * Initialize the database schema
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      await this.createMemoriesTable()
      await this.createIndexes()
      await this.createVectorFunctions()
      
      this.isInitialized = true
      console.log('✅ Neon memory provider initialized')
    } catch (error) {
      console.error('❌ Failed to initialize Neon memory provider:', error)
      throw error
    }
  }

  /**
   * Create the memories table with proper schema
   */
  private async createMemoriesTable(): Promise<void> {
    const client = await this.pool.connect()
    
    try {
      // Enable pgvector extension if available
      await client.query('CREATE EXTENSION IF NOT EXISTS vector;')
      
      // Create the memories table
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${this.tableName} (
          id TEXT PRIMARY KEY,
          agent_id TEXT NOT NULL,
          type TEXT NOT NULL,
          content TEXT NOT NULL,
          embedding vector(1536), -- OpenAI embedding dimension
          metadata JSONB DEFAULT '{}',
          importance REAL NOT NULL DEFAULT 0.5,
          timestamp TIMESTAMPTZ NOT NULL,
          tags TEXT[] DEFAULT '{}',
          duration TEXT NOT NULL DEFAULT 'long_term',
          expires_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `)
    } finally {
      client.release()
    }
  }

  /**
   * Create indexes for optimal performance
   */
  private async createIndexes(): Promise<void> {
    const client = await this.pool.connect()
    
    try {
      const indexes = [
        `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_agent_id ON ${this.tableName}(agent_id);`,
        `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_type ON ${this.tableName}(type);`,
        `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_timestamp ON ${this.tableName}(timestamp);`,
        `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_importance ON ${this.tableName}(importance);`,
        `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_duration ON ${this.tableName}(duration);`,
        `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_expires_at ON ${this.tableName}(expires_at);`,
        `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_content_gin ON ${this.tableName} USING gin(to_tsvector('english', content));`
      ]

      // Try to create vector index if pgvector is available
      try {
        await client.query(`CREATE INDEX IF NOT EXISTS idx_${this.tableName}_embedding ON ${this.tableName} USING ivfflat (embedding vector_cosine_ops);`)
      } catch (error) {
        console.warn('⚠️ Vector index creation failed, pgvector may not be available')
      }

      for (const indexQuery of indexes) {
        await client.query(indexQuery)
      }
    } finally {
      client.release()
    }
  }

  /**
   * Create vector search functions
   */
  private async createVectorFunctions(): Promise<void> {
    const client = await this.pool.connect()
    
    try {
      // Vector similarity search function
      await client.query(`
        CREATE OR REPLACE FUNCTION match_${this.tableName}(
          p_agent_id TEXT,
          query_embedding vector(1536),
          match_threshold FLOAT DEFAULT 0.7,
          match_count INT DEFAULT 10
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
            m.created_at,
            m.updated_at,
            1 - (m.embedding <=> query_embedding) AS similarity
          FROM ${this.tableName} m
          WHERE 
            m.agent_id = p_agent_id
            AND (m.duration != 'short_term' OR m.expires_at IS NULL OR m.expires_at > NOW())
            AND m.embedding IS NOT NULL
            AND 1 - (m.embedding <=> query_embedding) > match_threshold
          ORDER BY similarity DESC
          LIMIT match_count;
        $$;
      `)

      // Update timestamp trigger function
      await client.query(`
        CREATE OR REPLACE FUNCTION update_${this.tableName}_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
        END;
        $$ language 'plpgsql';
      `)

      // Create trigger
      await client.query(`
        DROP TRIGGER IF EXISTS update_${this.tableName}_updated_at ON ${this.tableName};
        CREATE TRIGGER update_${this.tableName}_updated_at 
          BEFORE UPDATE ON ${this.tableName}
          FOR EACH ROW 
          EXECUTE FUNCTION update_${this.tableName}_updated_at();
      `)
    } finally {
      client.release()
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
      // Try vector search first
      const vectorQuery = `SELECT * FROM match_${this.tableName}($1, $2, $3, $4)`
      
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
      // Get total count
      const totalQuery = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE agent_id = $1`
      const totalResult = await client.query(totalQuery, [agentId])
      const total = parseInt(totalResult.rows[0]?.count || '0')

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

      return { total, byType }
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

      // Clean up expired short-term memories
      const expiredQuery = `
        DELETE FROM ${this.tableName} 
        WHERE agent_id = $1 AND duration = 'short_term' 
          AND expires_at IS NOT NULL AND expires_at < NOW()
      `
      const expiredResult = await client.query(expiredQuery, [agentId])
      console.log(`🧹 Cleaned up ${expiredResult.rowCount} expired short-term memories`)

      // Clean up old memories beyond retention period
      const oldQuery = `DELETE FROM ${this.tableName} WHERE agent_id = $1 AND timestamp < $2`
      const oldResult = await client.query(oldQuery, [agentId, cutoffDate])
      console.log(`🧹 Cleaned up ${oldResult.rowCount} old memories for agent ${agentId}`)
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
  async healthCheck(): Promise<{ healthy: boolean; latency: number }> {
    const start = Date.now()
    
    try {
      const client = await this.pool.connect()
      try {
        await client.query('SELECT 1')
        const latency = Date.now() - start
        return { healthy: true, latency }
      } finally {
        client.release()
      }
    } catch (error) {
      console.error('❌ Neon health check failed:', error)
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
   * Cleanup connections and resources
   */
  async disconnect(): Promise<void> {
    try {
      await this.pool.end()
      console.log('🔌 Neon memory provider disconnected')
    } catch (error) {
      console.error('❌ Error disconnecting Neon provider:', error)
    }
  }
}

/**
 * Create a Neon memory provider
 */
export function createNeonMemoryProvider(config: NeonMemoryConfig): NeonMemoryProvider {
  return new NeonMemoryProvider(config)
}

/**
 * Helper function to create a connection string for Neon
 */
export function createNeonConnectionString(
  endpoint: string,
  database: string,
  username: string,
  password: string,
  options: Record<string, string> = {}
): string {
  const params = new URLSearchParams({
    sslmode: 'require',
    ...options
  })
  
  return `postgresql://${username}:${password}@${endpoint}/${database}?${params.toString()}`
}