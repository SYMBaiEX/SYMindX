/**
 * Refactored PostgreSQL Memory Provider for SYMindX
 * 
 * Uses shared components to eliminate duplication and provide consistent functionality
 */

import { Pool, Client } from 'pg';
import {
  MemoryRecord,
  MemoryType,
  MemoryDuration,
} from '../../../../types/agent.js';
import {
  MemoryProviderMetadata,
  MemoryTierType,
  ArchivalStrategy,
} from '../../../../types/memory.js';
import { runtimeLogger } from '../../../../utils/logger.js';
import { buildObject } from '../../../../utils/type-helpers.js';
import {
  BaseMemoryProvider,
  BaseMemoryConfig,
  MemoryRow,
} from '../../base-memory-provider.js';

// Import shared components
import {
  DatabaseConnection,
  DatabaseType,
  MemoryProviderTrait,
  SharedArchiver,
  SharedMemoryPool,
  ResourceManager,
  type ConnectionConfig,
  type ArchiverConfig,
  type PoolConfig
} from '../../../shared/index.js';

export interface PostgresMemoryConfig extends BaseMemoryConfig {
  host: string;
  port?: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  maxConnections?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
  enableVectorSearch?: boolean;
  enableFullTextSearch?: boolean;
  enablePartitioning?: boolean;
  maxPoolSize?: number;
}

// Create the enhanced base class with traits
const PostgresMemoryProviderBase = MemoryProviderTrait<PostgresMemoryConfig>('1.0.0')(BaseMemoryProvider);

export class RefactoredPostgresMemoryProvider extends PostgresMemoryProviderBase {
  private connection: Pool;
  private archiver?: PostgresArchiver;
  private sharedPool?: PostgresMemoryPool;
  private resourceManager: ResourceManager;

  constructor(config: PostgresMemoryConfig) {
    super(config, {
      type: 'postgres',
      name: 'PostgreSQL Memory Provider',
      version: '1.0.0',
      description: 'PostgreSQL-based memory storage with shared components and advanced features'
    });

    // Configure the module
    this.configure({
      host: 'localhost',
      port: 5432,
      database: 'symindx',
      username: 'postgres',
      password: '',
      ssl: false,
      maxConnections: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      enableVectorSearch: true,
      enableFullTextSearch: true,
      enablePartitioning: false,
      maxPoolSize: 1000,
      ...config
    });

    // Initialize resource manager
    this.resourceManager = new ResourceManager({
      maxConnections: config.maxConnections || 20,
      maxMemoryMB: 512,
      cleanupIntervalMs: 60000
    });

    // Add initialization handlers
    this.addInitializationHandler(() => this.initializeConnection());
    this.addInitializationHandler(() => this.initializeSchema());
    this.addInitializationHandler(() => this.initializeArchiver());
    this.addInitializationHandler(() => this.initializeSharedPool());

    // Add health checks
    this.addHealthCheck(() => this.checkDatabaseHealth());
    this.addHealthCheck(() => this.resourceManager.getHealthStatus());

    // Add cleanup on disposal
    this.addDisposalHandler(() => this.cleanup());
  }

  private async initializeConnection(): Promise<void> {
    const config = this.getConfig();
    
    const connectionConfig: ConnectionConfig = {
      type: DatabaseType.POSTGRES,
      host: config.host,
      port: config.port,
      database: config.database,
      username: config.username,
      password: config.password,
      ssl: config.ssl,
      maxConnections: config.maxConnections,
      idleTimeoutMillis: config.idleTimeoutMillis,
      connectionTimeoutMillis: config.connectionTimeoutMillis
    };

    this.connection = await DatabaseConnection.getConnection(connectionConfig) as Pool;
    
    runtimeLogger.info(`PostgreSQL memory provider connected to: ${config.host}:${config.port}/${config.database}`);
  }

  private async initializeSchema(): Promise<void> {
    const client = await this.connection.connect();
    try {
      // Create main memories table with advanced features
      await client.query(`
        CREATE TABLE IF NOT EXISTS memories (
          id TEXT PRIMARY KEY,
          agent_id TEXT NOT NULL,
          type TEXT NOT NULL,
          content TEXT NOT NULL,
          embedding vector(384),
          metadata JSONB DEFAULT '{}',
          importance REAL DEFAULT 0.5,
          timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          tags TEXT[] DEFAULT '{}',
          duration TEXT DEFAULT 'long_term',
          expires_at TIMESTAMPTZ,
          tier TEXT DEFAULT 'episodic',
          context_fingerprint TEXT,
          context_score REAL,
          search_vector tsvector,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);

      // Create indexes for performance
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_memories_agent_id ON memories(agent_id)
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_memories_timestamp ON memories(timestamp)
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_memories_importance ON memories(importance)
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_memories_tier ON memories(tier)
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_memories_tags ON memories USING GIN(tags)
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_memories_metadata ON memories USING GIN(metadata)
      `);

      const config = this.getConfig();

      // Create full-text search index if enabled
      if (config.enableFullTextSearch) {
        await client.query(`
          CREATE INDEX IF NOT EXISTS idx_memories_search_vector 
          ON memories USING GIN(search_vector)
        `);

        // Create trigger to update search vector
        await client.query(`
          CREATE OR REPLACE FUNCTION update_memories_search_vector()
          RETURNS TRIGGER AS $$
          BEGIN
            NEW.search_vector := to_tsvector('english', COALESCE(NEW.content, '') || ' ' || array_to_string(NEW.tags, ' '));
            RETURN NEW;
          END;
          $$ LANGUAGE plpgsql;
        `);

        await client.query(`
          DROP TRIGGER IF EXISTS memories_search_vector_update ON memories;
          CREATE TRIGGER memories_search_vector_update
            BEFORE INSERT OR UPDATE ON memories
            FOR EACH ROW EXECUTE FUNCTION update_memories_search_vector();
        `);
      }

      // Create vector similarity index if enabled
      if (config.enableVectorSearch) {
        await client.query(`
          CREATE INDEX IF NOT EXISTS idx_memories_embedding 
          ON memories USING ivfflat (embedding vector_cosine_ops)
          WITH (lists = 100)
        `);
      }

      // Create partitioning if enabled
      if (config.enablePartitioning) {
        await this.setupPartitioning(client);
      }

      runtimeLogger.info('PostgreSQL memory schema initialized with advanced features');
    } finally {
      client.release();
    }
  }

  private async setupPartitioning(client: Client): Promise<void> {
    // Create partitioned table for large datasets
    await client.query(`
      CREATE TABLE IF NOT EXISTS memories_partitioned (
        LIKE memories INCLUDING ALL
      ) PARTITION BY RANGE (timestamp);
    `);

    // Create monthly partitions for the current and next 6 months
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const partitionDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
      const partitionName = `memories_${partitionDate.getFullYear()}_${String(partitionDate.getMonth() + 1).padStart(2, '0')}`;
      
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${partitionName} 
        PARTITION OF memories_partitioned
        FOR VALUES FROM ('${partitionDate.toISOString()}') TO ('${nextMonth.toISOString()}')
      `);
    }
  }

  private async initializeArchiver(): Promise<void> {
    const config = this.getConfig();
    
    if (config.archival && config.archival.length > 0) {
      const archiverConfig: ArchiverConfig = {
        strategies: config.archival,
        enableCompression: true,
        maxCompressionRatio: 0.8,
        retentionDays: 365
      };

      this.archiver = new PostgresArchiver(archiverConfig, this.connection);
      runtimeLogger.info('PostgreSQL archiver initialized');
    }
  }

  private async initializeSharedPool(): Promise<void> {
    const config = this.getConfig();
    
    if (config.sharedMemory) {
      const poolConfig: PoolConfig = {
        poolId: `postgres_pool_${Date.now()}`,
        sharedConfig: config.sharedMemory,
        maxPoolSize: config.maxPoolSize || 1000,
        enableVersioning: true,
        enablePermissions: true
      };

      this.sharedPool = new PostgresMemoryPool(poolConfig, this.connection);
      await this.sharedPool.loadFromStorage();
      runtimeLogger.info('PostgreSQL shared memory pool initialized');
    }
  }

  private async checkDatabaseHealth(): Promise<{ status: 'healthy' | 'unhealthy'; details?: any }> {
    try {
      const client = await this.connection.connect();
      try {
        await client.query('SELECT 1');
        return { status: 'healthy' };
      } finally {
        client.release();
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        details: { error: error instanceof Error ? error.message : String(error) }
      };
    }
  }

  private async cleanup(): Promise<void> {
    if (this.sharedPool) {
      await this.sharedPool.saveToStorage();
    }
    
    if (this.connection) {
      await this.connection.end();
    }
    
    await this.resourceManager.shutdown();
  }

  // ===================================================================
  // IMPLEMENTATION OF ABSTRACT METHODS
  // ===================================================================

  async store(agentId: string, memory: MemoryRecord): Promise<void> {
    this.ensureNotDisposed();
    await this.ensureInitialized();

    const client = await this.connection.connect();
    try {
      await client.query(`
        INSERT INTO memories 
        (id, agent_id, type, content, embedding, metadata, importance, timestamp, tags, duration, expires_at, tier)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (id) DO UPDATE SET
        content = EXCLUDED.content,
        embedding = EXCLUDED.embedding,
        metadata = EXCLUDED.metadata,
        importance = EXCLUDED.importance,
        tags = EXCLUDED.tags,
        duration = EXCLUDED.duration,
        expires_at = EXCLUDED.expires_at,
        tier = EXCLUDED.tier,
        updated_at = NOW()
      `, [
        memory.id,
        agentId,
        memory.type,
        memory.content,
        memory.embedding ? `[${memory.embedding.join(',')}]` : null,
        JSON.stringify(memory.metadata || {}),
        memory.importance || 0.5,
        memory.timestamp.toISOString(),
        memory.tags || [],
        memory.duration || MemoryDuration.LONG_TERM,
        memory.expiresAt?.toISOString() || null,
        'episodic'
      ]);

      this.updateResourceUsage(`memory_${memory.id}`);
      this.emit('memory:stored', { agentId, memory });
    } finally {
      client.release();
    }
  }

  async retrieve(agentId: string, query: string, limit = 10): Promise<MemoryRecord[]> {
    this.ensureNotDisposed();
    await this.ensureInitialized();

    // Try cache first
    const cacheKey = `retrieve_${agentId}_${query}_${limit}`;
    const cached = this.getFromCache<MemoryRecord[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const client = await this.connection.connect();
    try {
      let sql: string;
      let params: any[];

      const config = this.getConfig();
      if (config.enableFullTextSearch && query.trim()) {
        // Use full-text search with ranking
        sql = `
          SELECT *, ts_rank(search_vector, plainto_tsquery($2)) as rank
          FROM memories
          WHERE agent_id = $1 
            AND search_vector @@ plainto_tsquery($2)
            AND (expires_at IS NULL OR expires_at > NOW())
          ORDER BY rank DESC, importance DESC, timestamp DESC
          LIMIT $3
        `;
        params = [agentId, query, limit];
      } else {
        // Fallback to ILIKE search
        sql = `
          SELECT *
          FROM memories
          WHERE agent_id = $1 
            AND (content ILIKE $2 OR $3 = ANY(tags))
            AND (expires_at IS NULL OR expires_at > NOW())
          ORDER BY importance DESC, timestamp DESC
          LIMIT $4
        `;
        params = [agentId, `%${query}%`, query, limit];
      }

      const result = await client.query(sql, params);
      const memories = result.rows.map(row => this.parseMemoryFromStorage(row));

      // Cache the results
      this.setInCache(cacheKey, memories, 60000); // 1 minute cache

      return memories;
    } finally {
      client.release();
    }
  }

  async search(agentId: string, embedding: number[], limit = 10): Promise<MemoryRecord[]> {
    this.ensureNotDisposed();
    await this.ensureInitialized();

    const config = this.getConfig();
    if (!config.enableVectorSearch) {
      // Fall back to text search
      return this.retrieve(agentId, '', limit);
    }

    const client = await this.connection.connect();
    try {
      const result = await client.query(`
        SELECT *, 1 - (embedding <=> $2) as similarity
        FROM memories
        WHERE agent_id = $1 
          AND embedding IS NOT NULL
          AND (expires_at IS NULL OR expires_at > NOW())
        ORDER BY embedding <=> $2
        LIMIT $3
      `, [
        agentId,
        `[${embedding.join(',')}]`,
        limit
      ]);

      return result.rows.map(row => this.parseMemoryFromStorage(row));
    } finally {
      client.release();
    }
  }

  async delete(agentId: string, memoryId: string): Promise<void> {
    this.ensureNotDisposed();
    await this.ensureInitialized();

    const client = await this.connection.connect();
    try {
      await client.query(`
        DELETE FROM memories WHERE id = $1 AND agent_id = $2
      `, [memoryId, agentId]);

      this.deleteFromCache(`memory_${memoryId}`);
      this.emit('memory:deleted', { agentId, memoryId });
    } finally {
      client.release();
    }
  }

  async clear(agentId: string): Promise<void> {
    this.ensureNotDisposed();
    await this.ensureInitialized();

    const client = await this.connection.connect();
    try {
      await client.query(`
        DELETE FROM memories WHERE agent_id = $1
      `, [agentId]);

      this.clearCache();
      this.emit('memory:cleared', { agentId });
    } finally {
      client.release();
    }
  }

  async getStats(agentId: string): Promise<{ total: number; byType: Record<string, number> }> {
    this.ensureNotDisposed();
    await this.ensureInitialized();

    const client = await this.connection.connect();
    try {
      const result = await client.query(`
        SELECT type, COUNT(*) as count
        FROM memories 
        WHERE agent_id = $1 AND (expires_at IS NULL OR expires_at > NOW())
        GROUP BY type
      `, [agentId]);

      const byType: Record<string, number> = {};
      let total = 0;

      for (const row of result.rows) {
        byType[row.type] = parseInt(row.count);
        total += parseInt(row.count);
      }

      return { total, byType };
    } finally {
      client.release();
    }
  }

  async cleanup(agentId: string, retentionDays: number): Promise<void> {
    this.ensureNotDisposed();
    await this.ensureInitialized();

    const cutoffTime = new Date(Date.now() - (retentionDays * 24 * 60 * 60 * 1000));

    const client = await this.connection.connect();
    try {
      // Archive before cleanup if archiver is available
      if (this.archiver) {
        const oldMemoriesResult = await client.query(`
          SELECT * FROM memories 
          WHERE agent_id = $1 AND timestamp < $2
        `, [agentId, cutoffTime.toISOString()]);

        const memories = oldMemoriesResult.rows.map(row => this.parseMemoryFromStorage(row));
        await this.archiver.archive(memories);
      }

      await client.query(`
        DELETE FROM memories 
        WHERE agent_id = $1 
          AND timestamp < $2
          AND duration != 'permanent'
      `, [agentId, cutoffTime.toISOString()]);

      this.clearCache();
    } finally {
      client.release();
    }
  }

  async consolidateMemory(
    agentId: string,
    memoryId: string,
    fromTier: MemoryTierType,
    toTier: MemoryTierType
  ): Promise<void> {
    const client = await this.connection.connect();
    try {
      await client.query(`
        UPDATE memories 
        SET tier = $1, updated_at = NOW()
        WHERE id = $2 AND agent_id = $3
      `, [toTier, memoryId, agentId]);
    } finally {
      client.release();
    }
  }

  async retrieveTier(
    agentId: string,
    tier: MemoryTierType,
    limit = 10
  ): Promise<MemoryRecord[]> {
    const client = await this.connection.connect();
    try {
      const result = await client.query(`
        SELECT * FROM memories
        WHERE agent_id = $1 AND tier = $2
        ORDER BY importance DESC, timestamp DESC
        LIMIT $3
      `, [agentId, tier, limit]);

      return result.rows.map(row => this.parseMemoryFromStorage(row));
    } finally {
      client.release();
    }
  }

  async archiveMemories(agentId: string): Promise<void> {
    if (!this.archiver) return;

    const client = await this.connection.connect();
    try {
      const oldMemoriesResult = await client.query(`
        SELECT * FROM memories 
        WHERE agent_id = $1 
          AND timestamp < $2
          AND duration != 'permanent'
      `, [agentId, new Date(Date.now() - (30 * 24 * 60 * 60 * 1000)).toISOString()]); // 30 days

      const memories = oldMemoriesResult.rows.map(row => this.parseMemoryFromStorage(row));
      await this.archiver.archive(memories);
    } finally {
      client.release();
    }
  }

  async shareMemories(
    agentId: string,
    memoryIds: string[],
    poolId: string
  ): Promise<void> {
    if (!this.sharedPool) return;

    const client = await this.connection.connect();
    try {
      for (const memoryId of memoryIds) {
        const result = await client.query(`
          SELECT * FROM memories WHERE id = $1 AND agent_id = $2
        `, [memoryId, agentId]);

        if (result.rows.length > 0) {
          const memory = this.parseMemoryFromStorage(result.rows[0]);
          await this.sharedPool.share(agentId, memory);
        }
      }
    } finally {
      client.release();
    }
  }

  async generateEmbedding(content: string): Promise<number[]> {
    // Placeholder implementation
    // In a real implementation, this would call an embedding service
    return new Array(384).fill(0).map(() => Math.random() - 0.5);
  }

  private updateResourceUsage(resourceId: string): void {
    this.resourceManager.updateResourceUsage(resourceId);
  }

  private parseMemoryFromStorage(row: any): MemoryRecord {
    return buildObject<MemoryRecord>({
      id: row.id,
      agentId: row.agent_id,
      type: row.type as MemoryType,
      content: row.content,
      metadata: row.metadata || {},
      importance: row.importance || 0.5,
      timestamp: new Date(row.timestamp),
      tags: row.tags || [],
      duration: row.duration as MemoryDuration,
    })
      .addOptional('embedding', row.embedding ? JSON.parse(row.embedding) : undefined)
      .addOptional('expiresAt', row.expires_at ? new Date(row.expires_at) : undefined)
      .build();
  }
}

// ===================================================================
// SHARED COMPONENT IMPLEMENTATIONS
// ===================================================================

/**
 * PostgreSQL-specific archiver implementation
 */
class PostgresArchiver extends SharedArchiver<Pool> {
  constructor(config: ArchiverConfig, private connection: Pool) {
    super(config);
  }

  getStorage(): Pool {
    return this.connection;
  }

  protected async cleanupBefore(date: Date): Promise<number> {
    const client = await this.connection.connect();
    try {
      const result = await client.query(`
        DELETE FROM memories 
        WHERE timestamp < $1 AND duration = 'archived'
      `, [date.toISOString()]);

      return result.rowCount || 0;
    } finally {
      client.release();
    }
  }
}

/**
 * PostgreSQL-specific memory pool implementation
 */
class PostgresMemoryPool extends SharedMemoryPool<Pool> {
  constructor(config: PoolConfig, private connection: Pool) {
    super(config);
  }

  getStorage(): Pool {
    return this.connection;
  }

  protected async persistEntry(key: string): Promise<void> {
    const entry = this.entries.get(key);
    if (!entry) return;

    const client = await this.connection.connect();
    try {
      await client.query(`
        INSERT INTO shared_memories 
        (id, agent_id, memory_data, permissions, shared_at, version)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO UPDATE SET
        memory_data = EXCLUDED.memory_data,
        permissions = EXCLUDED.permissions,
        version = EXCLUDED.version,
        last_accessed_at = NOW()
      `, [
        entry.id,
        entry.agentId,
        JSON.stringify(entry.memory),
        JSON.stringify(entry.permissions),
        entry.sharedAt.toISOString(),
        entry.version
      ]);
    } finally {
      client.release();
    }
  }

  protected async removePersistedEntry(key: string): Promise<void> {
    const client = await this.connection.connect();
    try {
      await client.query(`
        DELETE FROM shared_memories WHERE id = $1
      `, [key]);
    } finally {
      client.release();
    }
  }

  async loadFromStorage(): Promise<void> {
    const client = await this.connection.connect();
    try {
      // Initialize shared memories table
      await client.query(`
        CREATE TABLE IF NOT EXISTS shared_memories (
          id TEXT PRIMARY KEY,
          agent_id TEXT NOT NULL,
          memory_data JSONB NOT NULL,
          permissions JSONB NOT NULL,
          shared_at TIMESTAMPTZ NOT NULL,
          version INTEGER DEFAULT 1,
          last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
          access_count INTEGER DEFAULT 0
        )
      `);

      // Create indexes
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_shared_memories_agent_id ON shared_memories(agent_id)
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_shared_memories_shared_at ON shared_memories(shared_at)
      `);

      // Load existing entries
      const result = await client.query(`
        SELECT * FROM shared_memories
      `);

      for (const row of result.rows) {
        const entry = {
          id: row.id,
          agentId: row.agent_id,
          memory: row.memory_data,
          permissions: row.permissions,
          sharedAt: new Date(row.shared_at),
          version: row.version,
          lastAccessedAt: new Date(row.last_accessed_at),
          accessCount: row.access_count
        };

        this.entries.set(row.id, entry);
      }
    } finally {
      client.release();
    }
  }

  async saveToStorage(): Promise<void> {
    // All entries are persisted individually via persistEntry
    // This could batch save any pending changes
  }
}

/**
 * Factory function to create PostgreSQL memory provider
 */
export function createPostgresMemoryProvider(config: PostgresMemoryConfig): RefactoredPostgresMemoryProvider {
  return new RefactoredPostgresMemoryProvider(config);
}