/**
 * Supabase Memory Provider for SYMindX
 * 
 * A comprehensive memory provider that uses Supabase as a backend with vector search capabilities
 * using pgvector extension for semantic similarity search.
 */

import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js'
import { MemoryRecord, MemoryType, MemoryDuration } from '../../../../types/agent.js'
import { BaseMemoryProvider, BaseMemoryConfig } from '../../base-memory-provider.js'
import { MemoryProviderMetadata } from '../../../../types/memory.js'

/**
 * Configuration for the Supabase memory provider
 */
export interface SupabaseMemoryConfig extends BaseMemoryConfig {
  /** Supabase project URL */
  url: string
  /** Supabase anon key */
  anonKey: string
  /** Database schema name (default: 'public') */
  schema?: string
  /** Enable realtime subscriptions */
  enableRealtime?: boolean
  /** Custom table name (default: 'memories') */
  tableName?: string
}

/**
 * Supabase database row type
 */
export interface SupabaseMemoryRow {
  id: string
  agent_id: string
  type: string
  content: string
  embedding?: number[]
  metadata: Record<string, any>
  importance: number
  timestamp: string
  tags: string[]
  duration: string
  expires_at?: string
  created_at: string
  updated_at: string
}

/**
 * Supabase memory provider implementation with vector search capabilities
 */
export class SupabaseMemoryProvider extends BaseMemoryProvider {
  private client: SupabaseClient
  protected declare config: SupabaseMemoryConfig
  private realtimeChannel?: RealtimeChannel
  private tableName: string

  /**
   * Constructor for the Supabase memory provider
   */
  constructor(config: SupabaseMemoryConfig) {
    const metadata: MemoryProviderMetadata = {
      id: 'supabase',
      name: 'Supabase Memory Provider',
      description: 'A cloud-based memory provider using Supabase with vector search capabilities',
      version: '1.0.0',
      author: 'SYMindX Team',
      supportsVectorSearch: true,
      isPersistent: true
    }

    super(config, metadata)
    this.config = config
    this.tableName = config.tableName || 'memories'

    this.client = createClient(config.url, config.anonKey, {
      db: { schema: config.schema || 'public' },
      realtime: { 
        params: { 
          eventsPerSecond: 10 
        } 
      }
    }) as SupabaseClient

    this.initializeDatabase()
  }

  /**
   * Initialize the database schema and enable realtime if configured
   */
  private async initializeDatabase(): Promise<void> {
    try {
      // Check if pgvector extension is enabled
      const { data: extensions } = await this.client.rpc('get_extensions')
      const hasVector = extensions?.some((ext: any) => ext.name === 'vector')
      
      if (!hasVector) {
        console.warn('⚠️ pgvector extension not detected. Vector search will be limited.')
      }

      // Create the memories table if it doesn't exist
      await this.createMemoriesTable()

      // Enable realtime subscriptions if configured
      if (this.config.enableRealtime) {
        this.setupRealtimeSubscription()
      }

      console.log('✅ Supabase memory provider initialized')
    } catch (error) {
      console.error('❌ Failed to initialize Supabase memory provider:', error)
      throw error
    }
  }

  /**
   * Create the memories table with proper schema
   */
  private async createMemoriesTable(): Promise<void> {
    const { error } = await this.client.rpc('create_memories_table_if_not_exists', {
      table_name: this.tableName
    })

    if (error) {
      console.warn('⚠️ Could not create memories table via RPC, it may already exist:', error.message)
    }
  }

  /**
   * Setup realtime subscription for memory updates
   */
  private setupRealtimeSubscription(): void {
    this.realtimeChannel = this.client
      .channel(`${this.tableName}_changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: this.config.schema || 'public',
          table: this.tableName
        },
        (payload) => {
          console.log('📡 Memory update received:', payload)
          // Emit events for realtime memory updates
          this.emit('memory_updated', payload)
        }
      )
      .subscribe()
  }

  /**
   * Store a memory for an agent
   */
  async store(agentId: string, memory: MemoryRecord): Promise<void> {
    try {
      const memoryData: Partial<SupabaseMemoryRow> = {
        id: memory.id,
        agent_id: agentId,
        type: memory.type,
        content: memory.content,
        embedding: memory.embedding,
        metadata: memory.metadata || {},
        importance: memory.importance,
        timestamp: memory.timestamp.toISOString(),
        tags: memory.tags || [],
        duration: memory.duration || MemoryDuration.LONG_TERM,
        expires_at: memory.expiresAt?.toISOString(),
        updated_at: new Date().toISOString()
      }

      const { error } = await this.client
        .from(this.tableName)
        .upsert(memoryData)

      if (error) {
        throw new Error(`Failed to store memory: ${error.message}`)
      }

      console.log(`💾 Stored ${memory.duration || 'long_term'} memory: ${memory.type} for agent ${agentId}`)
    } catch (error) {
      console.error('❌ Error storing memory:', error)
      throw error
    }
  }

  /**
   * Retrieve memories for an agent based on a query
   */
  async retrieve(agentId: string, query: string, limit = 10): Promise<MemoryRecord[]> {
    try {
      let queryBuilder = this.client
        .from(this.tableName)
        .select('*')
        .eq('agent_id', agentId)

      // Filter out expired short-term memories
      const now = new Date().toISOString()
      queryBuilder = queryBuilder.or(`duration.neq.short_term,expires_at.is.null,expires_at.gt.${now}`)

      if (query === 'recent') {
        queryBuilder = queryBuilder.order('timestamp', { ascending: false })
      } else if (query === 'important') {
        queryBuilder = queryBuilder.order('importance', { ascending: false })
      } else if (query === 'short_term') {
        queryBuilder = queryBuilder
          .eq('duration', 'short_term')
          .or(`expires_at.is.null,expires_at.gt.${now}`)
          .order('timestamp', { ascending: false })
      } else if (query === 'long_term') {
        queryBuilder = queryBuilder
          .eq('duration', 'long_term')
          .order('importance', { ascending: false })
      } else {
        // Text search in content
        queryBuilder = queryBuilder
          .textSearch('content', query)
          .order('importance', { ascending: false })
      }

      const { data, error } = await queryBuilder.limit(limit)

      if (error) {
        throw new Error(`Failed to retrieve memories: ${error.message}`)
      }

      return (data || []).map(row => this.rowToMemoryRecord(row))
    } catch (error) {
      console.error('❌ Error retrieving memories:', error)
      throw error
    }
  }

  /**
   * Search for memories using vector similarity
   */
  async search(agentId: string, embedding: number[], limit = 10): Promise<MemoryRecord[]> {
    try {
      // Use the match_memories RPC function for vector similarity search
      const { data, error } = await this.client.rpc('match_memories', {
        agent_id: agentId,
        query_embedding: embedding,
        match_threshold: 0.7,
        match_count: limit
      })

      if (error) {
        console.warn('⚠️ Vector search failed, falling back to recent memories:', error.message)
        return this.retrieve(agentId, 'recent', limit)
      }

      return (data || []).map((row: any) => this.rowToMemoryRecord(row))
    } catch (error) {
      console.error('❌ Error in vector search:', error)
      return this.retrieve(agentId, 'recent', limit)
    }
  }

  /**
   * Delete a memory for an agent
   */
  async delete(agentId: string, memoryId: string): Promise<void> {
    try {
      const { error } = await this.client
        .from(this.tableName)
        .delete()
        .eq('agent_id', agentId)
        .eq('id', memoryId)

      if (error) {
        throw new Error(`Failed to delete memory: ${error.message}`)
      }

      console.log(`🗑️ Deleted memory: ${memoryId} for agent ${agentId}`)
    } catch (error) {
      console.error('❌ Error deleting memory:', error)
      throw error
    }
  }

  /**
   * Clear all memories for an agent
   */
  async clear(agentId: string): Promise<void> {
    try {
      const { error } = await this.client
        .from(this.tableName)
        .delete()
        .eq('agent_id', agentId)

      if (error) {
        throw new Error(`Failed to clear memories: ${error.message}`)
      }

      console.log(`🧹 Cleared all memories for agent ${agentId}`)
    } catch (error) {
      console.error('❌ Error clearing memories:', error)
      throw error
    }
  }

  /**
   * Get statistics about an agent's memories
   */
  async getStats(agentId: string): Promise<{ total: number; byType: Record<string, number> }> {
    try {
      // Get total count
      const { count, error: countError } = await this.client
        .from(this.tableName)
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', agentId)

      if (countError) {
        throw new Error(`Failed to get memory stats: ${countError.message}`)
      }

      // Get count by type
      const { data: typeData, error: typeError } = await this.client
        .from(this.tableName)
        .select('type')
        .eq('agent_id', agentId)

      if (typeError) {
        throw new Error(`Failed to get memory type stats: ${typeError.message}`)
      }

      const byType: Record<string, number> = {}
      typeData?.forEach(row => {
        byType[row.type] = (byType[row.type] || 0) + 1
      })

      return { total: count || 0, byType }
    } catch (error) {
      console.error('❌ Error getting memory stats:', error)
      return { total: 0, byType: {} }
    }
  }

  /**
   * Clean up old and expired memories for an agent
   */
  async cleanup(agentId: string, retentionDays: number): Promise<void> {
    try {
      const now = new Date()
      const cutoffDate = new Date(now.getTime() - (retentionDays * 24 * 60 * 60 * 1000))

      // Clean up expired short-term memories
      const { error: expiredError } = await this.client
        .from(this.tableName)
        .delete()
        .eq('agent_id', agentId)
        .eq('duration', 'short_term')
        .not('expires_at', 'is', null)
        .lt('expires_at', now.toISOString())

      if (expiredError) {
        console.warn('⚠️ Failed to clean expired memories:', expiredError.message)
      }

      // Clean up old memories beyond retention period
      const { error: oldError } = await this.client
        .from(this.tableName)
        .delete()
        .eq('agent_id', agentId)
        .lt('timestamp', cutoffDate.toISOString())

      if (oldError) {
        console.warn('⚠️ Failed to clean old memories:', oldError.message)
      }

      console.log(`🧹 Cleaned up old and expired memories for agent ${agentId}`)
    } catch (error) {
      console.error('❌ Error during memory cleanup:', error)
      throw error
    }
  }

  /**
   * Convert a database row to a memory record
   */
  private rowToMemoryRecord(row: SupabaseMemoryRow): MemoryRecord {
    return {
      id: row.id,
      agentId: row.agent_id,
      type: MemoryType[row.type.toUpperCase() as keyof typeof MemoryType] || MemoryType.EXPERIENCE,
      content: row.content,
      embedding: row.embedding,
      metadata: row.metadata || {},
      importance: row.importance,
      timestamp: new Date(row.timestamp),
      tags: row.tags || [],
      duration: MemoryDuration[row.duration.toUpperCase() as keyof typeof MemoryDuration] || MemoryDuration.LONG_TERM,
      expiresAt: row.expires_at ? new Date(row.expires_at) : undefined
    }
  }

  /**
   * Emit custom events (simple EventEmitter-like functionality)
   */
  private emit(event: string, data: any): void {
    // Simple event emission - can be enhanced with proper EventEmitter
    console.log(`📡 Event: ${event}`, data)
  }

  /**
   * Cleanup connections and subscriptions
   */
  async disconnect(): Promise<void> {
    if (this.realtimeChannel) {
      await this.client.removeChannel(this.realtimeChannel)
    }
    console.log('🔌 Supabase memory provider disconnected')
  }
}

/**
 * Create a Supabase memory provider
 */
export function createSupabaseMemoryProvider(config: SupabaseMemoryConfig): SupabaseMemoryProvider {
  return new SupabaseMemoryProvider(config)
}

/**
 * SQL migration for creating the memories table with vector support
 */
export const SUPABASE_MEMORY_MIGRATION = `
-- Enable the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create the memories table
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
    duration TEXT NOT NULL DEFAULT 'long_term',
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_memories_agent_id ON memories(agent_id);
CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type);
CREATE INDEX IF NOT EXISTS idx_memories_timestamp ON memories(timestamp);
CREATE INDEX IF NOT EXISTS idx_memories_importance ON memories(importance);
CREATE INDEX IF NOT EXISTS idx_memories_duration ON memories(duration);
CREATE INDEX IF NOT EXISTS idx_memories_expires_at ON memories(expires_at);

-- Create vector similarity index
CREATE INDEX IF NOT EXISTS idx_memories_embedding ON memories USING ivfflat (embedding vector_cosine_ops);

-- Function to search memories by vector similarity
CREATE OR REPLACE FUNCTION match_memories(
    agent_id TEXT,
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
    FROM memories m
    WHERE 
        m.agent_id = match_memories.agent_id
        AND (m.duration != 'short_term' OR m.expires_at IS NULL OR m.expires_at > NOW())
        AND m.embedding IS NOT NULL
        AND 1 - (m.embedding <=> query_embedding) > match_threshold
    ORDER BY similarity DESC
    LIMIT match_count;
$$;

-- Function to create memories table (callable via RPC)
CREATE OR REPLACE FUNCTION create_memories_table_if_not_exists(table_name TEXT DEFAULT 'memories')
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    -- This function ensures the table exists
    -- The actual table creation is handled by the main migration above
    RAISE NOTICE 'Memories table initialization checked';
END;
$$;

-- Function to get available extensions (callable via RPC)
CREATE OR REPLACE FUNCTION get_extensions()
RETURNS TABLE (name TEXT)
LANGUAGE SQL
STABLE
AS $$
    SELECT extname::TEXT as name FROM pg_extension;
$$;

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE TRIGGER update_memories_updated_at 
    BEFORE UPDATE ON memories 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
`;