/**
 * Neon Memory Provider for SYMindX
 *
 * Enhanced Neon PostgreSQL provider with multi-tier memory architecture,
 * vector embeddings, shared memory pools, and archival strategies.
 */

import { Pool, PoolClient } from 'pg';

import {
  MemoryRecord,
  MemoryType,
  MemoryDuration,
} from '../../../../types/agent';
import {
  MemoryProviderMetadata,
  MemoryTierType,
  // MemoryContext - type used for annotations but not instantiated at runtime
  // SharedMemoryConfig - type used for annotations but not instantiated at runtime
  MemoryPermission,
} from '../../../../types/memory';
import { DatabaseError } from '../../../../types/modules/database';
import { runtimeLogger } from '../../../../utils/logger';
import { buildObject } from '../../../../utils/type-helpers';
import {
  BaseMemoryProvider,
  BaseMemoryConfig,
  MemoryRow,
  EnhancedMemoryRecord,
} from '../../base-memory-provider';

// import { MemoryArchiver } from './archiver'; // Unused import
import {
  MIGRATIONS,
  createMigrationsTable,
  isMigrationApplied,
  recordMigration,
  getCurrentBatch,
} from './migrations';
import { SharedMemoryPool } from './shared-pool';

/**
 * Configuration for the Neon memory provider
 */
export interface NeonMemoryConfig extends BaseMemoryConfig {
  /** Neon database connection string */
  connectionString: string;
  /** Maximum number of connections in the pool */
  maxConnections?: number;
  /** Connection timeout in milliseconds */
  connectionTimeoutMillis?: number;
  /** Idle timeout in milliseconds */
  idleTimeoutMillis?: number;
  /** Enable SSL (default: true for Neon) */
  ssl?: boolean;
  /** Custom table name (default: 'memories') */
  tableName?: string;
  /** Auto-deploy schema on initialization (default: true) */
  autoDeploySchema?: boolean;
  /** Consolidation interval in milliseconds */
  consolidationInterval?: number;
  /** Archival interval in milliseconds */
  archivalInterval?: number;
}

/**
 * Neon database row type
 */
export interface NeonMemoryRow extends MemoryRow {
  embedding?: number[];
  tier?: string;
  context?: Record<string, unknown>; // JSON-encoded MemoryContext
  created_at: Date;
  updated_at: Date;
}

/**
 * Neon memory provider implementation with optimized connection pooling
 */
export class NeonMemoryProvider extends BaseMemoryProvider {
  private pool: Pool;
  declare protected config: NeonMemoryConfig;
  private tableName: string;
  private isInitialized = false;
  // Schema version tracked for future migrations
  private readonly _schemaVersion = '2.0.0';
  private sharedPools: Map<string, SharedMemoryPool> = new Map();
  private consolidationTimer?: ReturnType<typeof setTimeout>;
  private archivalTimer?: ReturnType<typeof setTimeout>;

  /**
   * Constructor for the Neon memory provider
   */
  constructor(config: NeonMemoryConfig) {
    const metadata: MemoryProviderMetadata = {
      id: 'neon',
      type: 'neon',
      name: 'Neon Memory Provider',
      description:
        'Enhanced Neon PostgreSQL provider with multi-tier memory, vector search, and shared pools',
      version: '2.0.0',
      author: 'SYMindX Team',
      supportsVectorSearch: true,
      isPersistent: true,
      supportedTiers: [
        MemoryTierType.WORKING,
        MemoryTierType.EPISODIC,
        MemoryTierType.SEMANTIC,
        MemoryTierType.PROCEDURAL,
      ],
      supportsSharedMemory: true,
    };

    super(config, metadata);
    this.config = {
      maxConnections: 10,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      ssl: true,
      tableName: 'memories',
      autoDeploySchema: true,
      ...config,
    };
    this.tableName = this.config.tableName!;

    // Create connection pool optimized for serverless
    this.pool = new Pool({
      connectionString: config.connectionString,
      max: this.config.maxConnections,
      connectionTimeoutMillis: this.config.connectionTimeoutMillis,
      idleTimeoutMillis: this.config.idleTimeoutMillis,
      ssl: this.config.ssl !== false ? { rejectUnauthorized: false } : false,
      // Optimizations for serverless
      allowExitOnIdle: true,
      application_name: 'symindx-neon-provider',
    });

    this.initialize();

    // Start background processes
    this.startBackgroundProcesses(config);
  }

  /**
   * Start background processes for consolidation and archival
   */
  private startBackgroundProcesses(config: NeonMemoryConfig): void {
    if (config.consolidationInterval) {
      this.consolidationTimer = setInterval(() => {
        this.runConsolidation().catch((error: Error) => {
          const dbError =
            error instanceof DatabaseError
              ? error
              : new DatabaseError(
                  'Consolidation process failed',
                  DatabaseError.ErrorCodes.UNKNOWN,
                  'medium',
                  true,
                  error
                );
          runtimeLogger.error('Consolidation error:', dbError);
        });
      }, config.consolidationInterval);
    }

    if (config.archivalInterval) {
      this.archivalTimer = setInterval(() => {
        this.runArchival().catch((error: Error) => {
          const dbError =
            error instanceof DatabaseError
              ? error
              : new DatabaseError(
                  'Archival process failed',
                  DatabaseError.ErrorCodes.UNKNOWN,
                  'medium',
                  true,
                  error
                );
          runtimeLogger.error('Archival error:', dbError);
        });
      }, config.archivalInterval);
    }
  }

  /**
   * Initialize the database schema
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🚀 Initializing enhanced Neon memory provider...');

      // Test connection
      await this.testConnection();

      if (this.config.autoDeploySchema) {
        await this.runMigrations();
      }

      this.isInitialized = true;
      console.log('✅ Enhanced Neon memory provider initialized successfully');
    } catch (error) {
      void error;
      const dbError =
        error instanceof DatabaseError
          ? error
          : DatabaseError.connectionFailed(
              'Failed to initialize Neon memory provider',
              error instanceof Error ? error : new Error(String(error))
            );
      console.error('❌ Failed to initialize Neon memory provider:', dbError);
      throw dbError;
    }
  }

  /**
   * Test database connection
   */
  private async testConnection(): Promise<void> {
    const client = await this.pool.connect();
    try {
      const result = await client.query('SELECT version()');
      console.log(
        '🔗 Connected to Neon PostgreSQL:',
        result.rows[0]?.version?.split(' ').slice(0, 2).join(' ')
      );
    } finally {
      client.release();
    }
  }

  /**
   * Run database migrations
   */
  private async runMigrations(): Promise<void> {
    const client = await this.pool.connect();

    try {
      console.log('🔄 Running Neon database migrations...');

      // Create migrations table
      await createMigrationsTable(client);

      // Get current batch
      const currentBatch = await getCurrentBatch(client);

      // Run pending migrations
      let migrationsRun = 0;

      for (const migration of MIGRATIONS) {
        const isApplied = await isMigrationApplied(client, migration.name);

        if (!isApplied) {
          console.log(`🔄 Running migration: ${migration.name}`);
          console.log(`   ${migration.description}`);

          await migration.up(client);
          await recordMigration(client, migration.name, currentBatch);

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
    } finally {
      client.release();
    }
  }

  /**
   * Store a memory for an agent
   */
  async store(agentId: string, memory: MemoryRecord): Promise<void> {
    await this.ensureInitialized();

    const enhanced = memory as EnhancedMemoryRecord;
    const client = await this.pool.connect();

    try {
      // Generate embedding if not provided
      if (!memory.embedding && memory.content) {
        memory.embedding = await this.generateEmbedding(memory.content);
      }

      const query = `
        INSERT INTO ${this.tableName} (
          id, agent_id, type, content, embedding, metadata, importance, 
          timestamp, tags, duration, expires_at, tier, context, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
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
          tier = EXCLUDED.tier,
          context = EXCLUDED.context,
          updated_at = NOW()
      `;

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
        memory.expiresAt,
        enhanced.tier || MemoryTierType.EPISODIC,
        enhanced.context ? JSON.stringify(enhanced.context) : null,
      ];

      await client.query(query, values);

      // Handle working memory specially
      if (enhanced.tier === MemoryTierType.WORKING) {
        await this.addToWorkingMemory(agentId, memory);
      }

      // Only log conversation memories
      if (
        memory.type === MemoryType.INTERACTION &&
        (memory.metadata?.source === 'chat_command' ||
          memory.metadata?.messageType === 'user_input' ||
          memory.metadata?.messageType === 'agent_response')
      ) {
        console.log(
          `💾 Stored ${enhanced.tier || 'episodic'} memory: ${memory.type} for agent ${agentId}`
        );
      }
    } finally {
      client.release();
    }
  }

  /**
   * Retrieve memories for an agent based on a query
   */
  async retrieve(
    agentId: string,
    query: string,
    limit = 10
  ): Promise<MemoryRecord[]> {
    await this.ensureInitialized();

    const client = await this.pool.connect();

    try {
      let queryText: string;
      let values: any[];

      const baseCondition = `agent_id = $1 AND (duration != 'short_term' OR expires_at IS NULL OR expires_at > NOW())`;

      if (query === 'recent') {
        queryText = `
          SELECT * FROM ${this.tableName} 
          WHERE ${baseCondition}
          ORDER BY timestamp DESC 
          LIMIT $2
        `;
        values = [agentId, limit];
      } else if (query === 'important') {
        queryText = `
          SELECT * FROM ${this.tableName} 
          WHERE ${baseCondition}
          ORDER BY importance DESC 
          LIMIT $2
        `;
        values = [agentId, limit];
      } else if (query === 'short_term') {
        queryText = `
          SELECT * FROM ${this.tableName} 
          WHERE agent_id = $1 AND duration = 'short_term' 
            AND (expires_at IS NULL OR expires_at > NOW())
          ORDER BY timestamp DESC 
          LIMIT $2
        `;
        values = [agentId, limit];
      } else if (query === 'long_term') {
        queryText = `
          SELECT * FROM ${this.tableName} 
          WHERE agent_id = $1 AND duration = 'long_term'
          ORDER BY importance DESC 
          LIMIT $2
        `;
        values = [agentId, limit];
      } else if (query.startsWith('tier:')) {
        const tier = query.substring(5);
        queryText = `
          SELECT * FROM ${this.tableName} 
          WHERE agent_id = $1 AND tier = $2
          ORDER BY timestamp DESC 
          LIMIT $3
        `;
        values = [agentId, tier, limit];
      } else {
        // Full-text search using PostgreSQL's text search
        queryText = `
          SELECT *, ts_rank(to_tsvector('english', content), plainto_tsquery('english', $2)) as rank
          FROM ${this.tableName} 
          WHERE ${baseCondition} AND to_tsvector('english', content) @@ plainto_tsquery('english', $2)
          ORDER BY rank DESC, importance DESC, timestamp DESC 
          LIMIT $3
        `;
        values = [agentId, query, limit];
      }

      const result = await client.query(queryText, values);
      return result.rows.map((row) => this.rowToMemoryRecord(row));
    } finally {
      client.release();
    }
  }

  /**
   * Search for memories using vector similarity
   */
  async search(
    agentId: string,
    embedding: number[],
    limit = 10
  ): Promise<MemoryRecord[]> {
    await this.ensureInitialized();

    const client = await this.pool.connect();

    try {
      // Use the enhanced search function
      const vectorQuery = `SELECT * FROM search_memories($1, $2, $3, $4)`;

      try {
        const result = await client.query(vectorQuery, [
          agentId,
          JSON.stringify(embedding),
          0.7,
          limit,
        ]);
        return result.rows.map((row) => this.rowToMemoryRecord(row));
      } catch (error) {
        void error;
        const dbError =
          error instanceof DatabaseError
            ? error
            : new DatabaseError(
                'Vector search failed',
                DatabaseError.ErrorCodes.QUERY_FAILED,
                'low',
                true,
                error instanceof Error ? error : new Error(String(error))
              );
        console.warn(
          '⚠️ Vector search failed, falling back to recent memories:',
          dbError
        );
        return this.retrieve(agentId, 'recent', limit);
      }
    } finally {
      client.release();
    }
  }

  /**
   * Delete a memory for an agent
   */
  async delete(agentId: string, memoryId: string): Promise<void> {
    await this.ensureInitialized();

    const client = await this.pool.connect();

    try {
      const query = `DELETE FROM ${this.tableName} WHERE agent_id = $1 AND id = $2`;
      const result = await client.query(query, [agentId, memoryId]);

      if (result.rowCount === 0) {
        throw new Error(`Memory ${memoryId} not found for agent ${agentId}`);
      }

      console.log(`🗑️ Deleted memory: ${memoryId} for agent ${agentId}`);
    } finally {
      client.release();
    }
  }

  /**
   * Clear all memories for an agent
   */
  async clear(agentId: string): Promise<void> {
    await this.ensureInitialized();

    const client = await this.pool.connect();

    try {
      const query = `DELETE FROM ${this.tableName} WHERE agent_id = $1`;
      const result = await client.query(query, [agentId]);

      console.log(
        `🧹 Cleared ${result.rowCount} memories for agent ${agentId}`
      );
    } finally {
      client.release();
    }
  }

  /**
   * Get statistics about an agent's memories
   */
  async getStats(
    agentId: string
  ): Promise<{ total: number; byType: Record<string, number> }> {
    await this.ensureInitialized();

    const client = await this.pool.connect();

    try {
      // Use the enhanced stats function
      const statsQuery = `SELECT * FROM get_memory_stats($1)`;
      const statsResult = await client.query(statsQuery, [agentId]);

      if (statsResult.rows.length > 0) {
        const stats = statsResult.rows[0];

        // Get count by type
        const typeQuery = `
          SELECT type, COUNT(*) as count 
          FROM ${this.tableName} 
          WHERE agent_id = $1 
          GROUP BY type
        `;
        const typeResult = await client.query(typeQuery, [agentId]);

        const byType: Record<string, number> = {};
        typeResult.rows.forEach((row) => {
          byType[row.type] = parseInt(row.count);
        });

        return {
          total: stats.total_memories,
          byType,
          ...stats, // Include additional stats
        };
      }

      return { total: 0, byType: {} };
    } finally {
      client.release();
    }
  }

  /**
   * Clean up old and expired memories for an agent
   */
  async cleanup(agentId: string, retentionDays: number): Promise<void> {
    await this.ensureInitialized();

    const client = await this.pool.connect();

    try {
      const cutoffDate = new Date(
        Date.now() - retentionDays * 24 * 60 * 60 * 1000
      );

      // Use the cleanup function for expired memories
      const expiredQuery = `SELECT cleanup_expired_memories()`;
      const expiredResult = await client.query(expiredQuery);
      console.log(
        `🧹 Cleaned up ${expiredResult.rows[0]} expired short-term memories`
      );

      // Clean up old memories beyond retention period
      const oldQuery = `DELETE FROM ${this.tableName} WHERE agent_id = $1 AND timestamp < $2`;
      const oldResult = await client.query(oldQuery, [agentId, cutoffDate]);
      console.log(
        `🧹 Cleaned up ${oldResult.rowCount} old memories for agent ${agentId}`
      );
    } finally {
      client.release();
    }
  }

  /**
   * Consolidate memory from one tier to another
   */
  async consolidateMemory(
    agentId: string,
    memoryId: string,
    fromTier: MemoryTierType,
    toTier: MemoryTierType
  ): Promise<void> {
    await this.ensureInitialized();

    const client = await this.pool.connect();

    try {
      // Use the consolidation function
      const result = await client.query(
        'SELECT consolidate_memory($1, $2, $3, $4)',
        [agentId, memoryId, fromTier, toTier]
      );

      if (result.rows[0]?.consolidate_memory) {
        // Record consolidation history
        await client.query(
          `
          INSERT INTO consolidation_history (agent_id, memory_id, from_tier, to_tier, reason)
          VALUES ($1, $2, $3, $4, $5)
        `,
          [agentId, memoryId, fromTier, toTier, 'automatic']
        );

        runtimeLogger.memory(
          `Consolidated memory ${memoryId} from ${fromTier} to ${toTier}`
        );

        // Apply tier-specific transformations
        if (
          fromTier === MemoryTierType.EPISODIC &&
          toTier === MemoryTierType.SEMANTIC
        ) {
          await this.transformToSemantic(client, agentId, memoryId);
        }
      }
    } finally {
      client.release();
    }
  }

  /**
   * Get memories from a specific tier
   */
  async retrieveTier(
    agentId: string,
    tier: MemoryTierType,
    limit?: number
  ): Promise<MemoryRecord[]> {
    return this.retrieve(agentId, `tier:${tier}`, limit);
  }

  /**
   * Archive old memories based on configured strategies
   */
  async archiveMemories(agentId: string): Promise<void> {
    if (!this.config.archival) return;

    const client = await this.pool.connect();

    try {
      // Get archival rules for this agent
      const rulesResult = await client.query(
        'SELECT * FROM archival_rules WHERE agent_id = $1 AND enabled = true',
        [agentId]
      );

      for (const rule of rulesResult.rows) {
        if (rule.rule_type === 'compression') {
          await this.compressOldMemories(client, agentId, rule);
        } else if (rule.rule_type === 'summarization') {
          await this.summarizeMemories(client, agentId, rule);
        }
      }
    } finally {
      client.release();
    }
  }

  /**
   * Share memories with other agents in a pool
   */
  async shareMemories(
    agentId: string,
    memoryIds: string[],
    poolId: string
  ): Promise<void> {
    await this.ensureInitialized();

    let pool = this.sharedPools.get(poolId);

    if (!pool && this.config.sharedMemory) {
      pool = new SharedMemoryPool(poolId, this.config.sharedMemory);
      this.sharedPools.set(poolId, pool);

      // Store pool configuration
      const client = await this.pool.connect();
      try {
        await client.query(
          `
          INSERT INTO shared_memory_pools (pool_id, config)
          VALUES ($1, $2)
          ON CONFLICT (pool_id) DO UPDATE SET config = EXCLUDED.config
        `,
          [poolId, JSON.stringify(this.config.sharedMemory)]
        );
      } finally {
        client.release();
      }
    }

    if (!pool) {
      throw new Error(`Shared memory pool ${poolId} not found`);
    }

    const client = await this.pool.connect();

    try {
      // Share each memory
      for (const memoryId of memoryIds) {
        const result = await client.query(
          'SELECT * FROM memories WHERE agent_id = $1 AND id = $2',
          [agentId, memoryId]
        );

        if (result.rows.length > 0) {
          const memory = this.rowToMemoryRecord(result.rows[0]);
          await pool.share(agentId, memory);

          // Record sharing
          await client.query(
            `
            INSERT INTO shared_memory_mappings (memory_id, pool_id, shared_by, permissions)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (memory_id, pool_id) DO UPDATE 
            SET shared_by = EXCLUDED.shared_by, shared_at = NOW()
          `,
            [memoryId, poolId, agentId, [MemoryPermission.READ]]
          );
        }
      }
    } finally {
      client.release();
    }
  }

  /**
   * Generate embedding for a memory
   */
  async generateEmbedding(_content: string): Promise<number[]> {
    // This would call the actual embedding API based on config
    // For now, return a mock embedding
    return new Array(1536).fill(0).map(() => Math.random() * 2 - 1);
  }

  /**
   * Convert a database row to a memory record
   */
  private rowToMemoryRecord(row: any): EnhancedMemoryRecord {
    let embedding: number[] | undefined = undefined;

    if (row.embedding) {
      try {
        embedding =
          typeof row.embedding === 'string'
            ? JSON.parse(row.embedding)
            : row.embedding;
      } catch (error) {
        void error;
        const dbError =
          error instanceof DatabaseError
            ? error
            : new DatabaseError(
                'Failed to parse embedding',
                DatabaseError.ErrorCodes.DATA_INTEGRITY,
                'low',
                false,
                error instanceof Error ? error : new Error(String(error))
              );
        console.warn('⚠️ Failed to parse embedding:', dbError);
      }
    }

    const builder = buildObject<EnhancedMemoryRecord>({
      id: row.id,
      agentId: row.agent_id,
      type:
        MemoryType[row.type.toUpperCase() as keyof typeof MemoryType] ||
        MemoryType.EXPERIENCE,
      content: row.content,
      metadata: row.metadata || {},
      importance: row.importance,
      timestamp: new Date(row.timestamp),
      tags: row.tags || [],
      duration:
        MemoryDuration[
          row.duration.toUpperCase() as keyof typeof MemoryDuration
        ] || MemoryDuration.LONG_TERM,
    })
      .addOptional('embedding', embedding)
      .addOptional(
        'expiresAt',
        row.expires_at ? new Date(row.expires_at) : undefined
      );

    // Add tier and context if available
    if (row.tier) {
      builder.addOptional('tier', row.tier as MemoryTierType);
    }
    if (row.context) {
      builder.addOptional(
        'context',
        typeof row.context === 'string' ? JSON.parse(row.context) : row.context
      );
    }

    return builder.build();
  }

  /**
   * Ensure the provider is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  /**
   * Transform memory to semantic tier
   */
  private async transformToSemantic(
    client: PoolClient,
    agentId: string,
    memoryId: string
  ): Promise<void> {
    // Extract concepts and update type
    const result = await client.query(
      'SELECT content FROM memories WHERE agent_id = $1 AND id = $2',
      [agentId, memoryId]
    );

    if (result.rows.length > 0) {
      const concepts = await this.extractConcepts(result.rows[0].content);

      await client.query(
        `
        UPDATE memories 
        SET type = $1, tags = array_cat(tags, $2::text[]), updated_at = NOW()
        WHERE agent_id = $3 AND id = $4
      `,
        [MemoryType.KNOWLEDGE, concepts, agentId, memoryId]
      );
    }
  }

  /**
   * Extract concepts from content
   */
  private async extractConcepts(content: string): Promise<string[]> {
    // Simple concept extraction - in production would use NLP
    const words = content.toLowerCase().split(/\s+/);
    const concepts = words
      .filter((word) => word.length > 4)
      .filter((word, index, self) => self.indexOf(word) === index)
      .slice(0, 5);

    return concepts;
  }

  /**
   * Run memory consolidation
   */
  private async runConsolidation(): Promise<void> {
    const client = await this.pool.connect();

    try {
      // Get all agents
      const agentsResult = await client.query(
        'SELECT DISTINCT agent_id FROM memories'
      );

      for (const { agent_id } of agentsResult.rows) {
        // Get consolidation rules for this agent
        const rulesResult = await client.query(
          'SELECT * FROM consolidation_rules WHERE agent_id = $1 AND enabled = true',
          [agent_id]
        );

        for (const rule of rulesResult.rows) {
          const memories = await this.retrieveTier(
            agent_id,
            rule.from_tier as MemoryTierType
          );

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

  /**
   * Check if memory should be consolidated
   */
  private shouldConsolidate(memory: EnhancedMemoryRecord, rule: any): boolean {
    switch (rule.condition_type) {
      case 'importance':
        return (memory.importance || 0) >= rule.threshold;
      case 'age': {
        const ageInDays =
          (Date.now() - memory.timestamp.getTime()) / (1000 * 60 * 60 * 24);
        return ageInDays >= rule.threshold;
      }
      case 'emotional':
        return (memory.context?.emotionalValence || 0) >= rule.threshold;
      case 'access_frequency':
        return (memory.metadata?.accessCount || 0) >= rule.threshold;
      default:
        return false;
    }
  }

  /**
   * Run memory archival
   */
  private async runArchival(): Promise<void> {
    const client = await this.pool.connect();

    try {
      const agentsResult = await client.query(
        'SELECT DISTINCT agent_id FROM memories'
      );

      for (const { agent_id } of agentsResult.rows) {
        await this.archiveMemories(agent_id);
      }
    } finally {
      client.release();
    }
  }

  /**
   * Compress old memories
   */
  private async compressOldMemories(
    client: PoolClient,
    agentId: string,
    rule: any
  ): Promise<void> {
    if (!rule.trigger_age_days) return;

    const cutoff = new Date(
      Date.now() - rule.trigger_age_days * 24 * 60 * 60 * 1000
    );
    const tier = rule.tier || 'episodic';

    const oldMemories = await client.query(
      `
      SELECT * FROM memories 
      WHERE agent_id = $1 AND timestamp < $2 AND tier = $3
      ORDER BY timestamp DESC
      LIMIT 100
    `,
      [agentId, cutoff, tier]
    );

    if (oldMemories.rows.length === 0) return;

    // Group and compress
    const compressed = this.groupAndCompress(
      oldMemories.rows.map((r) => this.rowToMemoryRecord(r))
    );

    // Store compressed memories
    for (const memory of compressed) {
      await this.store(agentId, memory);
    }

    // Archive original memories
    const originalIds = oldMemories.rows.map((r) => r.id);
    await client.query(
      `
      INSERT INTO archived_memories (
        agent_id, original_ids, summary, type, metadata, importance,
        start_date, end_date, memory_count
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `,
      [
        agentId,
        originalIds,
        compressed[0]?.content || 'Compressed memories',
        'compression',
        JSON.stringify({ rule_id: rule.id }),
        Math.max(...oldMemories.rows.map((r) => r.importance)),
        oldMemories.rows[oldMemories.rows.length - 1].timestamp,
        oldMemories.rows[0].timestamp,
        oldMemories.rows.length,
      ]
    );

    // Delete original memories
    await client.query('DELETE FROM memories WHERE id = ANY($1)', [
      originalIds,
    ]);
  }

  /**
   * Summarize memories
   */
  private async summarizeMemories(
    _client: PoolClient,
    agentId: string,
    _rule: any
  ): Promise<void> {
    // Implementation would use LLM to summarize groups of memories
    runtimeLogger.memory(`Summarizing memories for agent ${agentId}`);
  }

  /**
   * Group and compress similar memories
   */
  private groupAndCompress(
    memories: EnhancedMemoryRecord[]
  ): EnhancedMemoryRecord[] {
    // Simple compression - group by day and combine
    const grouped = new Map<string, EnhancedMemoryRecord[]>();

    for (const memory of memories) {
      const day = memory.timestamp.toISOString().split('T')[0];
      if (!day) continue;
      if (!grouped.has(day)) {
        grouped.set(day, []);
      }
      grouped.get(day)!.push(memory);
    }

    const compressed: EnhancedMemoryRecord[] = [];
    for (const [day, group] of Array.from(grouped.entries())) {
      compressed.push({
        id: this.generateId(),
        agentId: group[0]?.agentId ?? '',
        type: MemoryType.EXPERIENCE,
        content: `Summary of ${day}: ${group.map((m) => m.content).join('; ')}`,
        importance: Math.max(...group.map((m) => m.importance || 0)),
        timestamp: new Date(day),
        tags: ['compressed', 'summary'],
        duration: MemoryDuration.LONG_TERM,
        tier: MemoryTierType.EPISODIC,
        metadata: {
          compression: {
            originalCount: group.length,
            compressedAt: new Date().toISOString(),
          },
        },
        context: {
          source: 'experience',
        },
      });
    }

    return compressed;
  }

  /**
   * Check database connection health
   */
  async healthCheck(): Promise<{ status: string; details?: any }> {
    const start = Date.now();

    try {
      const client = await this.pool.connect();
      try {
        await client.query('SELECT 1');
        const latency = Date.now() - start;
        return {
          status: 'healthy',
          details: {
            latency,
            type: 'neon',
            poolStatus: this.getPoolStatus(),
          },
        };
      } finally {
        client.release();
      }
    } catch (error) {
      void error;
      const dbError =
        error instanceof DatabaseError
          ? error
          : DatabaseError.connectionFailed(
              'Neon health check failed',
              error instanceof Error ? error : new Error(String(error))
            );
      console.error('❌ Neon health check failed:', dbError);
      return {
        status: 'unhealthy',
        details: {
          error: dbError.message,
          latency: -1,
          type: 'neon',
        },
      };
    }
  }

  /**
   * Get connection pool status
   */
  getPoolStatus(): { total: number; idle: number; waiting: number } {
    return {
      total: this.pool.totalCount,
      idle: this.pool.idleCount,
      waiting: this.pool.waitingCount,
    };
  }

  /**
   * Cleanup connections and resources
   */
  async disconnect(): Promise<void> {
    try {
      // Clear timers
      if (this.consolidationTimer) {
        clearInterval(this.consolidationTimer);
      }
      if (this.archivalTimer) {
        clearInterval(this.archivalTimer);
      }

      // Close pool
      await this.pool.end();
      console.log('🔌 Enhanced Neon memory provider disconnected');
    } catch (error) {
      void error;
      const dbError =
        error instanceof DatabaseError
          ? error
          : new DatabaseError(
              'Error disconnecting Neon provider',
              DatabaseError.ErrorCodes.CONNECTION_FAILED,
              'low',
              false,
              error instanceof Error ? error : new Error(String(error))
            );
      console.error('❌ Error disconnecting Neon provider:', dbError);
    }
  }

  /**
   * Clean up resources on destroy
   */
  async destroy(): Promise<void> {
    await this.disconnect();
  }
}

/**
 * Create a Neon memory provider
 */
export function createNeonMemoryProvider(
  config: NeonMemoryConfig
): NeonMemoryProvider {
  return new NeonMemoryProvider(config);
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
