/**
 * Refactored Neon Memory Provider for SYMindX
 * 
 * Uses shared components to eliminate duplication and provide enhanced Neon-specific functionality
 */

import { Pool, PoolClient } from 'pg';
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

export interface NeonMemoryConfig extends BaseMemoryConfig {
  connectionString: string;
  maxConnections?: number;
  connectionTimeoutMillis?: number;
  idleTimeoutMillis?: number;
  ssl?: boolean;
  enableVectorSearch?: boolean;
  enableFullTextSearch?: boolean;
  enableServerlessOptimizations?: boolean;
  consolidationInterval?: number;
  archivalInterval?: number;
  maxPoolSize?: number;
}

export interface EnhancedMemoryRecord extends MemoryRecord {
  tier?: MemoryTierType;
  context?: Record<string, unknown>;
}

// Create the enhanced base class with traits
const NeonMemoryProviderBase = MemoryProviderTrait<NeonMemoryConfig>('2.0.0')(BaseMemoryProvider);

export class RefactoredNeonMemoryProvider extends NeonMemoryProviderBase {
  private connection: Pool;
  private archiver?: NeonArchiver;
  private sharedPool?: NeonMemoryPool;
  private resourceManager: ResourceManager;
  private consolidationTimer?: NodeJS.Timeout;
  private archivalTimer?: NodeJS.Timeout;

  constructor(config: NeonMemoryConfig) {
    super(config, {
      type: 'neon',
      name: 'Neon Memory Provider',
      version: '2.0.0',
      description: 'Enhanced Neon PostgreSQL provider with shared components and serverless optimizations'
    });

    // Configure the module with Neon-specific defaults
    this.configure({
      maxConnections: 10,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      ssl: true,
      enableVectorSearch: true,
      enableFullTextSearch: true,
      enableServerlessOptimizations: true,
      consolidationInterval: 3600000, // 1 hour
      archivalInterval: 86400000, // 24 hours
      maxPoolSize: 1000,
      ...config
    });

    // Initialize resource manager
    this.resourceManager = new ResourceManager({
      maxConnections: config.maxConnections || 10,
      maxMemoryMB: 256,
      cleanupIntervalMs: 60000
    });

    // Add initialization handlers
    this.addInitializationHandler(() => this.initializeConnection());
    this.addInitializationHandler(() => this.initializeSchema());
    this.addInitializationHandler(() => this.initializeArchiver());
    this.addInitializationHandler(() => this.initializeSharedPool());
    this.addInitializationHandler(() => this.startBackgroundProcesses());

    // Add health checks
    this.addHealthCheck(() => this.checkDatabaseHealth());
    this.addHealthCheck(() => this.resourceManager.getHealthStatus());

    // Add cleanup on disposal
    this.addDisposalHandler(() => this.cleanup());
  }

  private async initializeConnection(): Promise<void> {
    const config = this.getConfig();
    
    const connectionConfig: ConnectionConfig = {
      type: DatabaseType.NEON,
      connectionString: config.connectionString,
      maxConnections: config.maxConnections,
      connectionTimeoutMillis: config.connectionTimeoutMillis,
      idleTimeoutMillis: config.idleTimeoutMillis,
      ssl: config.ssl
    };

    this.connection = await DatabaseConnection.getConnection(connectionConfig) as Pool;
    
    // Test connection
    const client = await this.connection.connect();
    try {
      const result = await client.query('SELECT version()');
      runtimeLogger.info(`Neon memory provider connected: ${result.rows[0]?.version?.split(' ').slice(0, 2).join(' ')}`);
    } finally {
      client.release();
    }
  }

  private async initializeSchema(): Promise<void> {
    const client = await this.connection.connect();
    try {
      // Create main memories table with Neon-specific optimizations
      await client.query(`
        CREATE TABLE IF NOT EXISTS memories (
          id TEXT PRIMARY KEY,
          agent_id TEXT NOT NULL,
          type TEXT NOT NULL,
          content TEXT NOT NULL,
          embedding vector(1536),
          metadata JSONB DEFAULT '{}',
          importance REAL DEFAULT 0.5,
          timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          tags TEXT[] DEFAULT '{}',
          duration TEXT DEFAULT 'long_term',
          expires_at TIMESTAMPTZ,
          tier TEXT DEFAULT 'episodic',
          context JSONB,
          search_vector tsvector,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);

      // Create optimized indexes for Neon's distributed architecture
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_memories_agent_id_timestamp ON memories(agent_id, timestamp DESC)
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_memories_importance ON memories(importance DESC)
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_memories_tier_timestamp ON memories(tier, timestamp DESC)
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_memories_tags_gin ON memories USING GIN(tags)
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_memories_metadata_gin ON memories USING GIN(metadata)
      `);

      const config = this.getConfig();

      // Create full-text search capabilities if enabled
      if (config.enableFullTextSearch) {
        await client.query(`
          CREATE INDEX IF NOT EXISTS idx_memories_search_vector_gin 
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
        // Create pgvector extension if not exists
        await client.query(`CREATE EXTENSION IF NOT EXISTS vector`);
        
        await client.query(`
          CREATE INDEX IF NOT EXISTS idx_memories_embedding_cosine 
          ON memories USING ivfflat (embedding vector_cosine_ops)
          WITH (lists = 100)
        `);
      }

      // Create Neon-specific optimization tables
      if (config.enableServerlessOptimizations) {
        await this.createServerlessOptimizations(client);
      }

      runtimeLogger.info('Neon memory schema initialized with advanced features');
    } finally {
      client.release();
    }
  }

  private async createServerlessOptimizations(client: PoolClient): Promise<void> {
    // Create memory consolidation tracking
    await client.query(`
      CREATE TABLE IF NOT EXISTS consolidation_history (
        id SERIAL PRIMARY KEY,
        agent_id TEXT NOT NULL,
        memory_id TEXT NOT NULL,
        from_tier TEXT NOT NULL,
        to_tier TEXT NOT NULL,
        reason TEXT,
        consolidation_score REAL,
        timestamp TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Create consolidation rules
    await client.query(`
      CREATE TABLE IF NOT EXISTS consolidation_rules (
        id SERIAL PRIMARY KEY,
        agent_id TEXT NOT NULL,
        from_tier TEXT NOT NULL,
        to_tier TEXT NOT NULL,
        condition_type TEXT NOT NULL,
        threshold REAL NOT NULL,
        enabled BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Create archival rules
    await client.query(`
      CREATE TABLE IF NOT EXISTS archival_rules (
        id SERIAL PRIMARY KEY,
        agent_id TEXT NOT NULL,
        rule_type TEXT NOT NULL,
        tier TEXT,
        trigger_age_days INTEGER,
        enabled BOOLEAN DEFAULT true,
        config JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Create memory stats function
    await client.query(`
      CREATE OR REPLACE FUNCTION get_memory_stats(agent_id_param TEXT)
      RETURNS TABLE(
        total_memories BIGINT,
        working_memories BIGINT,
        episodic_memories BIGINT,
        semantic_memories BIGINT,
        procedural_memories BIGINT,
        avg_importance REAL,
        oldest_memory TIMESTAMPTZ,
        newest_memory TIMESTAMPTZ
      ) AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          COUNT(*)::BIGINT as total_memories,
          COUNT(CASE WHEN tier = 'working' THEN 1 END)::BIGINT as working_memories,
          COUNT(CASE WHEN tier = 'episodic' THEN 1 END)::BIGINT as episodic_memories,
          COUNT(CASE WHEN tier = 'semantic' THEN 1 END)::BIGINT as semantic_memories,
          COUNT(CASE WHEN tier = 'procedural' THEN 1 END)::BIGINT as procedural_memories,
          AVG(importance)::REAL as avg_importance,
          MIN(timestamp) as oldest_memory,
          MAX(timestamp) as newest_memory
        FROM memories 
        WHERE agent_id = agent_id_param;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Create search function with vector similarity
    await client.query(`
      CREATE OR REPLACE FUNCTION search_memories(
        agent_id_param TEXT,
        query_embedding TEXT,
        similarity_threshold REAL DEFAULT 0.7,
        result_limit INTEGER DEFAULT 10
      )
      RETURNS TABLE(
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
        similarity REAL
      ) AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          m.id, m.agent_id, m.type, m.content, m.embedding, m.metadata,
          m.importance, m.timestamp, m.tags, m.duration, m.expires_at,
          m.tier, m.context,
          1 - (m.embedding <=> query_embedding::vector) as similarity
        FROM memories m
        WHERE m.agent_id = agent_id_param 
          AND m.embedding IS NOT NULL
          AND (m.expires_at IS NULL OR m.expires_at > NOW())
          AND 1 - (m.embedding <=> query_embedding::vector) >= similarity_threshold
        ORDER BY m.embedding <=> query_embedding::vector
        LIMIT result_limit;
      END;
      $$ LANGUAGE plpgsql;
    `);
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

      this.archiver = new NeonArchiver(archiverConfig, this.connection);
      runtimeLogger.info('Neon archiver initialized');
    }
  }

  private async initializeSharedPool(): Promise<void> {
    const config = this.getConfig();
    
    if (config.sharedMemory) {
      const poolConfig: PoolConfig = {
        poolId: `neon_pool_${Date.now()}`,
        sharedConfig: config.sharedMemory,
        maxPoolSize: config.maxPoolSize || 1000,
        enableVersioning: true,
        enablePermissions: true
      };

      this.sharedPool = new NeonMemoryPool(poolConfig, this.connection);
      await this.sharedPool.loadFromStorage();
      runtimeLogger.info('Neon shared memory pool initialized');
    }
  }

  private async startBackgroundProcesses(): Promise<void> {
    const config = this.getConfig();

    if (config.consolidationInterval) {
      this.consolidationTimer = setInterval(() => {
        this.runConsolidation().catch(error => {
          runtimeLogger.error('Consolidation error:', error);
        });
      }, config.consolidationInterval);
    }

    if (config.archivalInterval) {
      this.archivalTimer = setInterval(() => {
        this.runArchival().catch(error => {
          runtimeLogger.error('Archival error:', error);
        });
      }, config.archivalInterval);
    }
  }

  private async checkDatabaseHealth(): Promise<{ status: 'healthy' | 'unhealthy'; details?: any }> {
    try {
      const client = await this.connection.connect();
      try {
        await client.query('SELECT 1');
        return { 
          status: 'healthy',
          details: {
            poolStatus: {
              total: this.connection.totalCount,
              idle: this.connection.idleCount,
              waiting: this.connection.waitingCount
            }
          }
        };
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
    // Clear timers
    if (this.consolidationTimer) {
      clearInterval(this.consolidationTimer);
    }
    if (this.archivalTimer) {
      clearInterval(this.archivalTimer);
    }

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

    const enhanced = memory as EnhancedMemoryRecord;
    const client = await this.connection.connect();
    try {
      // Generate embedding if not provided
      if (!memory.embedding && memory.content) {
        memory.embedding = await this.generateEmbedding(memory.content);
      }

      await client.query(`
        INSERT INTO memories (
          id, agent_id, type, content, embedding, metadata, importance, 
          timestamp, tags, duration, expires_at, tier, context, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
        ON CONFLICT (id) DO UPDATE SET
          content = EXCLUDED.content,
          embedding = EXCLUDED.embedding,
          metadata = EXCLUDED.metadata,
          importance = EXCLUDED.importance,
          tags = EXCLUDED.tags,
          duration = EXCLUDED.duration,
          expires_at = EXCLUDED.expires_at,
          tier = EXCLUDED.tier,
          context = EXCLUDED.context,
          updated_at = NOW()
      `, [
        memory.id,
        agentId,
        memory.type,
        memory.content,
        memory.embedding ? JSON.stringify(memory.embedding) : null,
        JSON.stringify(memory.metadata || {}),
        memory.importance || 0.5,
        memory.timestamp.toISOString(),
        memory.tags || [],
        memory.duration || MemoryDuration.LONG_TERM,
        memory.expiresAt?.toISOString() || null,
        enhanced.tier || MemoryTierType.EPISODIC,
        enhanced.context ? JSON.stringify(enhanced.context) : null
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

      const baseCondition = `agent_id = $1 AND (duration != 'short_term' OR expires_at IS NULL OR expires_at > NOW())`;

      if (query === 'recent') {
        sql = `SELECT * FROM memories WHERE ${baseCondition} ORDER BY timestamp DESC LIMIT $2`;
        params = [agentId, limit];
      } else if (query === 'important') {
        sql = `SELECT * FROM memories WHERE ${baseCondition} ORDER BY importance DESC LIMIT $2`;
        params = [agentId, limit];
      } else if (query.startsWith('tier:')) {
        const tier = query.substring(5);
        sql = `SELECT * FROM memories WHERE agent_id = $1 AND tier = $2 ORDER BY timestamp DESC LIMIT $3`;
        params = [agentId, tier, limit];
      } else {
        const config = this.getConfig();
        if (config.enableFullTextSearch && query.trim()) {
          // Use full-text search with ranking
          sql = `
            SELECT *, ts_rank(search_vector, plainto_tsquery($2)) as rank
            FROM memories
            WHERE ${baseCondition} AND search_vector @@ plainto_tsquery($2)
            ORDER BY rank DESC, importance DESC, timestamp DESC
            LIMIT $3
          `;
          params = [agentId, query, limit];
        } else {
          // Fallback to ILIKE search
          sql = `
            SELECT * FROM memories
            WHERE ${baseCondition} AND (content ILIKE $2 OR $3 = ANY(tags))
            ORDER BY importance DESC, timestamp DESC
            LIMIT $4
          `;
          params = [agentId, `%${query}%`, query, limit];
        }
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
      return this.retrieve(agentId, 'recent', limit);
    }

    const client = await this.connection.connect();
    try {
      // Use the enhanced search function
      const result = await client.query(
        'SELECT * FROM search_memories($1, $2, $3, $4)',
        [agentId, JSON.stringify(embedding), 0.7, limit]
      );

      return result.rows.map(row => this.parseMemoryFromStorage(row));
    } catch (error) {
      runtimeLogger.warn('Vector search failed, falling back to recent memories:', error);
      return this.retrieve(agentId, 'recent', limit);
    } finally {
      client.release();
    }
  }

  async delete(agentId: string, memoryId: string): Promise<void> {
    this.ensureNotDisposed();
    await this.ensureInitialized();

    const client = await this.connection.connect();
    try {
      const result = await client.query(`
        DELETE FROM memories WHERE agent_id = $1 AND id = $2
      `, [agentId, memoryId]);

      if (result.rowCount === 0) {
        throw new Error(`Memory ${memoryId} not found for agent ${agentId}`);
      }

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
      const result = await client.query(`
        DELETE FROM memories WHERE agent_id = $1
      `, [agentId]);

      runtimeLogger.info(`Cleared ${result.rowCount} memories for agent ${agentId}`);
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
      // Use the enhanced stats function
      const statsResult = await client.query(
        'SELECT * FROM get_memory_stats($1)',
        [agentId]
      );

      if (statsResult.rows.length > 0) {
        const stats = statsResult.rows[0];

        // Get count by type
        const typeResult = await client.query(`
          SELECT type, COUNT(*) as count 
          FROM memories 
          WHERE agent_id = $1 
          GROUP BY type
        `, [agentId]);

        const byType: Record<string, number> = {};
        typeResult.rows.forEach(row => {
          byType[row.type] = parseInt(row.count);
        });

        return {
          total: parseInt(stats.total_memories),
          byType,
          ...stats
        };
      }

      return { total: 0, byType: {} };
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

      const result = await client.query(`
        DELETE FROM memories 
        WHERE agent_id = $1 
          AND timestamp < $2
          AND duration != 'permanent'
      `, [agentId, cutoffTime.toISOString()]);

      runtimeLogger.info(`Cleaned up ${result.rowCount} old memories for agent ${agentId}`);
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
      // Update memory tier
      await client.query(`
        UPDATE memories 
        SET tier = $1, updated_at = NOW()
        WHERE id = $2 AND agent_id = $3
      `, [toTier, memoryId, agentId]);

      // Record consolidation history
      await client.query(`
        INSERT INTO consolidation_history (agent_id, memory_id, from_tier, to_tier, reason)
        VALUES ($1, $2, $3, $4, $5)
      `, [agentId, memoryId, fromTier, toTier, 'manual']);

      runtimeLogger.info(`Consolidated memory ${memoryId} from ${fromTier} to ${toTier}`);
    } finally {
      client.release();
    }
  }

  async retrieveTier(
    agentId: string,
    tier: MemoryTierType,
    limit = 10
  ): Promise<MemoryRecord[]> {
    return this.retrieve(agentId, `tier:${tier}`, limit);
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
    // In a real implementation, this would call Neon's embedding service or external API
    // For now, return a mock embedding compatible with Neon's vector type
    return new Array(1536).fill(0).map(() => Math.random() * 2 - 1);
  }

  private updateResourceUsage(resourceId: string): void {
    this.resourceManager.updateResourceUsage(resourceId);
  }

  private parseMemoryFromStorage(row: any): EnhancedMemoryRecord {
    let embedding: number[] | undefined = undefined;

    if (row.embedding) {
      try {
        embedding = typeof row.embedding === 'string' 
          ? JSON.parse(row.embedding) 
          : row.embedding;
      } catch (error) {
        runtimeLogger.warn('Failed to parse embedding:', error);
      }
    }

    return buildObject<EnhancedMemoryRecord>({
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
      .addOptional('embedding', embedding)
      .addOptional('expiresAt', row.expires_at ? new Date(row.expires_at) : undefined)
      .addOptional('tier', row.tier as MemoryTierType)
      .addOptional('context', row.context ? (typeof row.context === 'string' ? JSON.parse(row.context) : row.context) : undefined)
      .build();
  }

  private async runConsolidation(): Promise<void> {
    const client = await this.connection.connect();
    try {
      // Get all agents with consolidation rules
      const agentsResult = await client.query(`
        SELECT DISTINCT agent_id FROM consolidation_rules WHERE enabled = true
      `);

      for (const { agent_id } of agentsResult.rows) {
        const rulesResult = await client.query(`
          SELECT * FROM consolidation_rules WHERE agent_id = $1 AND enabled = true
        `, [agent_id]);

        for (const rule of rulesResult.rows) {
          const memories = await this.retrieveTier(agent_id, rule.from_tier as MemoryTierType);
          
          for (const memory of memories) {
            if (this.shouldConsolidate(memory as EnhancedMemoryRecord, rule)) {
              await this.consolidateMemory(
                agent_id,
                memory.id,
                rule.from_tier,
                rule.to_tier
              );
            }
          }
        }
      }
    } finally {
      client.release();
    }
  }

  private async runArchival(): Promise<void> {
    const client = await this.connection.connect();
    try {
      const agentsResult = await client.query(`
        SELECT DISTINCT agent_id FROM memories
      `);

      for (const { agent_id } of agentsResult.rows) {
        await this.archiveMemories(agent_id);
      }
    } finally {
      client.release();
    }
  }

  private shouldConsolidate(memory: EnhancedMemoryRecord, rule: any): boolean {
    switch (rule.condition_type) {
      case 'importance':
        return (memory.importance || 0) >= rule.threshold;
      case 'age': {
        const ageInDays = (Date.now() - memory.timestamp.getTime()) / (1000 * 60 * 60 * 24);
        return ageInDays >= rule.threshold;
      }
      case 'access_frequency':
        return (memory.metadata?.accessCount || 0) >= rule.threshold;
      default:
        return false;
    }
  }
}

// ===================================================================
// SHARED COMPONENT IMPLEMENTATIONS
// ===================================================================

/**
 * Neon-specific archiver implementation
 */
class NeonArchiver extends SharedArchiver<Pool> {
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
 * Neon-specific memory pool implementation
 */
class NeonMemoryPool extends SharedMemoryPool<Pool> {
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
  }
}

/**
 * Factory function to create Neon memory provider
 */
export function createNeonMemoryProvider(config: NeonMemoryConfig): RefactoredNeonMemoryProvider {
  return new RefactoredNeonMemoryProvider(config);
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
    ...options,
  });

  return `postgresql://${username}:${password}@${endpoint}/${database}?${params.toString()}`;
}