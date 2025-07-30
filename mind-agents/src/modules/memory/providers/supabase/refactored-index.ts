/**
 * Refactored Supabase Memory Provider for SYMindX
 *
 * Uses shared components to eliminate duplication and enhance Supabase-specific functionality
 */

import {
  createClient,
  SupabaseClient,
  RealtimeChannel,
} from '@supabase/supabase-js';
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
  type PoolConfig,
} from '../../../shared/index.js';

export interface SupabaseMemoryConfig extends BaseMemoryConfig {
  url: string;
  anonKey: string;
  schema?: string;
  enableRealtime?: boolean;
  tableName?: string;
  enableVectorSearch?: boolean;
  enableFullTextSearch?: boolean;
  consolidationInterval?: number;
  archivalInterval?: number;
  maxPoolSize?: number;
}

export interface EnhancedMemoryRecord extends MemoryRecord {
  tier?: MemoryTierType;
  context?: Record<string, unknown>;
}

export interface SupabaseMemoryRow extends MemoryRow {
  id: string;
  agent_id: string;
  type: string;
  content: string;
  embedding?: number[];
  metadata: Record<string, unknown>;
  importance: number;
  timestamp: string;
  tags: string[];
  duration: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
  tier?: string;
  context?: Record<string, any>;
}

// Create the enhanced base class with traits
const SupabaseMemoryProviderBase =
  MemoryProviderTrait<SupabaseMemoryConfig>('2.0.0')(BaseMemoryProvider);

export class RefactoredSupabaseMemoryProvider extends SupabaseMemoryProviderBase {
  private client: SupabaseClient;
  private realtimeChannel?: RealtimeChannel;
  private archiver?: SupabaseArchiver;
  private sharedPool?: SupabaseMemoryPool;
  private resourceManager: ResourceManager;
  private consolidationTimer?: NodeJS.Timeout;
  private archivalTimer?: NodeJS.Timeout;
  private tableName: string;

  constructor(config: SupabaseMemoryConfig) {
    super(config, {
      type: 'supabase',
      name: 'Supabase Memory Provider',
      version: '2.0.0',
      description:
        'Enhanced Supabase provider with shared components and realtime capabilities',
    });

    // Configure the module with Supabase-specific defaults
    this.configure({
      schema: 'public',
      enableRealtime: false,
      tableName: 'memories',
      enableVectorSearch: true,
      enableFullTextSearch: true,
      consolidationInterval: 3600000, // 1 hour
      archivalInterval: 86400000, // 24 hours
      maxPoolSize: 1000,
      ...config,
    });

    this.tableName = config.tableName || 'memories';

    // Initialize resource manager
    this.resourceManager = new ResourceManager({
      maxConnections: 10, // Supabase handles connection pooling
      maxMemoryMB: 256,
      cleanupIntervalMs: 60000,
    });

    // Create Supabase client
    this.client = createClient(config.url, config.anonKey, {
      db: { schema: config.schema || 'public' },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });

    // Add initialization handlers
    this.addInitializationHandler(() => this.initializeDatabase());
    this.addInitializationHandler(() => this.initializeArchiver());
    this.addInitializationHandler(() => this.initializeSharedPool());
    this.addInitializationHandler(() => this.setupRealtimeIfEnabled());
    this.addInitializationHandler(() => this.startBackgroundProcesses());

    // Add health checks
    this.addHealthCheck(() => this.checkDatabaseHealth());
    this.addHealthCheck(() => this.resourceManager.getHealthStatus());

    // Add cleanup on disposal
    this.addDisposalHandler(() => this.cleanup());
  }

  private async initializeDatabase(): Promise<void> {
    try {
      // Run migrations to ensure schema is up to date
      await this.runMigrations();

      // Check if pgvector extension is enabled
      const { data: extensions, error: extensionsError } =
        await this.client.rpc('get_extensions');
      const hasVector =
        !extensionsError &&
        extensions?.some((ext: any) => ext.name === 'vector');

      if (!hasVector) {
        runtimeLogger.warn(
          'pgvector extension not detected. Vector search will be limited.'
        );
      }

      runtimeLogger.info('Supabase memory provider database initialized');
    } catch (error) {
      runtimeLogger.error('Failed to initialize Supabase database:', error);
      throw error;
    }
  }

  private async runMigrations(): Promise<void> {
    try {
      // Create memories table with enhanced features
      const { error: tableError } = await this.client.rpc('exec', {
        sql: `
          CREATE TABLE IF NOT EXISTS ${this.tableName} (
            id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
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
          );
        `,
      });

      if (tableError) {
        throw new Error(
          `Failed to create memories table: ${tableError.message}`
        );
      }

      // Create indexes
      const indexes = [
        `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_agent_id ON ${this.tableName}(agent_id)`,
        `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_timestamp ON ${this.tableName}(timestamp DESC)`,
        `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_importance ON ${this.tableName}(importance DESC)`,
        `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_tier ON ${this.tableName}(tier)`,
        `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_tags ON ${this.tableName} USING GIN(tags)`,
        `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_metadata ON ${this.tableName} USING GIN(metadata)`,
      ];

      const config = this.getConfig();

      // Add full-text search index if enabled
      if (config.enableFullTextSearch) {
        indexes.push(
          `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_search_vector ON ${this.tableName} USING GIN(search_vector)`
        );

        // Create trigger for search vector updates
        await this.client.rpc('exec', {
          sql: `
            CREATE OR REPLACE FUNCTION update_${this.tableName}_search_vector()
            RETURNS TRIGGER AS $$
            BEGIN
              NEW.search_vector := to_tsvector('english', COALESCE(NEW.content, '') || ' ' || array_to_string(NEW.tags, ' '));
              RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;

            DROP TRIGGER IF EXISTS ${this.tableName}_search_vector_update ON ${this.tableName};
            CREATE TRIGGER ${this.tableName}_search_vector_update
              BEFORE INSERT OR UPDATE ON ${this.tableName}
              FOR EACH ROW EXECUTE FUNCTION update_${this.tableName}_search_vector();
          `,
        });
      }

      // Add vector search index if enabled
      if (config.enableVectorSearch) {
        indexes.push(
          `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_embedding ON ${this.tableName} USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)`
        );
      }

      // Create all indexes
      for (const indexSql of indexes) {
        const { error: indexError } = await this.client.rpc('exec', {
          sql: indexSql,
        });
        if (indexError) {
          runtimeLogger.warn(`Failed to create index: ${indexError.message}`);
        }
      }

      runtimeLogger.info('Supabase memory schema migrations completed');
    } catch (error) {
      runtimeLogger.error('Migration failed:', error);
      throw error;
    }
  }

  private async initializeArchiver(): Promise<void> {
    const config = this.getConfig();

    if (config.archival && config.archival.length > 0) {
      const archiverConfig: ArchiverConfig = {
        strategies: config.archival,
        enableCompression: true,
        maxCompressionRatio: 0.8,
        retentionDays: 365,
      };

      this.archiver = new SupabaseArchiver(
        archiverConfig,
        this.client,
        this.tableName
      );
      runtimeLogger.info('Supabase archiver initialized');
    }
  }

  private async initializeSharedPool(): Promise<void> {
    const config = this.getConfig();

    if (config.sharedMemory) {
      const poolConfig: PoolConfig = {
        poolId: `supabase_pool_${Date.now()}`,
        sharedConfig: config.sharedMemory,
        maxPoolSize: config.maxPoolSize || 1000,
        enableVersioning: true,
        enablePermissions: true,
      };

      this.sharedPool = new SupabaseMemoryPool(poolConfig, this.client);
      await this.sharedPool.loadFromStorage();
      runtimeLogger.info('Supabase shared memory pool initialized');
    }
  }

  private async setupRealtimeIfEnabled(): Promise<void> {
    const config = this.getConfig();

    if (config.enableRealtime) {
      this.realtimeChannel = this.client
        .channel('memory-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: config.schema || 'public',
            table: this.tableName,
          },
          (payload) => {
            this.handleRealtimeChange(payload);
          }
        )
        .subscribe();

      runtimeLogger.info('Supabase realtime subscription enabled');
    }
  }

  private async startBackgroundProcesses(): Promise<void> {
    const config = this.getConfig();

    if (config.consolidationInterval) {
      this.consolidationTimer = setInterval(() => {
        this.runConsolidation().catch((error) => {
          runtimeLogger.error('Consolidation error:', error);
        });
      }, config.consolidationInterval);
    }

    if (config.archivalInterval) {
      this.archivalTimer = setInterval(() => {
        this.runArchival().catch((error) => {
          runtimeLogger.error('Archival error:', error);
        });
      }, config.archivalInterval);
    }
  }

  private handleRealtimeChange(payload: any): void {
    // Emit events for realtime changes
    switch (payload.eventType) {
      case 'INSERT':
        this.emit('memory:stored', {
          agentId: payload.new.agent_id,
          memory: payload.new,
        });
        break;
      case 'UPDATE':
        this.emit('memory:updated', {
          agentId: payload.new.agent_id,
          memory: payload.new,
        });
        break;
      case 'DELETE':
        this.emit('memory:deleted', {
          agentId: payload.old.agent_id,
          memoryId: payload.old.id,
        });
        break;
    }
  }

  private async checkDatabaseHealth(): Promise<{
    status: 'healthy' | 'unhealthy';
    details?: any;
  }> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select('count')
        .limit(1);

      if (error) {
        return {
          status: 'unhealthy',
          details: { error: error.message },
        };
      }

      return { status: 'healthy' };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : String(error),
        },
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

    // Unsubscribe from realtime
    if (this.realtimeChannel) {
      await this.client.removeChannel(this.realtimeChannel);
    }

    if (this.sharedPool) {
      await this.sharedPool.saveToStorage();
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

    // Generate embedding if not provided
    if (!memory.embedding && memory.content) {
      memory.embedding = await this.generateEmbedding(memory.content);
    }

    const { error } = await this.client.from(this.tableName).upsert({
      id: memory.id,
      agent_id: agentId,
      type: memory.type,
      content: memory.content,
      embedding: memory.embedding,
      metadata: memory.metadata || {},
      importance: memory.importance || 0.5,
      timestamp: memory.timestamp.toISOString(),
      tags: memory.tags || [],
      duration: memory.duration || MemoryDuration.LONG_TERM,
      expires_at: memory.expiresAt?.toISOString() || null,
      tier: enhanced.tier || MemoryTierType.EPISODIC,
      context: enhanced.context || null,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      throw new Error(`Failed to store memory: ${error.message}`);
    }

    this.updateResourceUsage(`memory_${memory.id}`);
    this.emit('memory:stored', { agentId, memory });
  }

  async retrieve(
    agentId: string,
    query: string,
    limit = 10
  ): Promise<MemoryRecord[]> {
    this.ensureNotDisposed();
    await this.ensureInitialized();

    // Try cache first
    const cacheKey = `retrieve_${agentId}_${query}_${limit}`;
    const cached = this.getFromCache<MemoryRecord[]>(cacheKey);
    if (cached) {
      return cached;
    }

    let supabaseQuery = this.client
      .from(this.tableName)
      .select('*')
      .eq('agent_id', agentId)
      .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString());

    const config = this.getConfig();

    if (query === 'recent') {
      supabaseQuery = supabaseQuery.order('timestamp', { ascending: false });
    } else if (query === 'important') {
      supabaseQuery = supabaseQuery.order('importance', { ascending: false });
    } else if (query.startsWith('tier:')) {
      const tier = query.substring(5);
      supabaseQuery = supabaseQuery
        .eq('tier', tier)
        .order('timestamp', { ascending: false });
    } else if (config.enableFullTextSearch && query.trim()) {
      // Use full-text search
      supabaseQuery = supabaseQuery.textSearch('search_vector', query);
    } else {
      // Fallback to content search
      supabaseQuery = supabaseQuery.or(
        `content.ilike.%${query}%,tags.cs.{${query}}`
      );
    }

    const { data, error } = await supabaseQuery.limit(limit);

    if (error) {
      throw new Error(`Failed to retrieve memories: ${error.message}`);
    }

    const memories = (data || []).map((row) =>
      this.parseMemoryFromStorage(row)
    );

    // Cache the results
    this.setInCache(cacheKey, memories, 60000); // 1 minute cache

    return memories;
  }

  async search(
    agentId: string,
    embedding: number[],
    limit = 10
  ): Promise<MemoryRecord[]> {
    this.ensureNotDisposed();
    await this.ensureInitialized();

    const config = this.getConfig();
    if (!config.enableVectorSearch) {
      // Fall back to text search
      return this.retrieve(agentId, 'recent', limit);
    }

    try {
      const { data, error } = await this.client.rpc('match_memories', {
        query_embedding: embedding,
        query_agent_id: agentId,
        match_threshold: 0.7,
        match_count: limit,
      });

      if (error) {
        throw new Error(`Vector search failed: ${error.message}`);
      }

      return (data || []).map((row) => this.parseMemoryFromStorage(row));
    } catch (error) {
      runtimeLogger.warn(
        'Vector search failed, falling back to recent memories:',
        error
      );
      return this.retrieve(agentId, 'recent', limit);
    }
  }

  async delete(agentId: string, memoryId: string): Promise<void> {
    this.ensureNotDisposed();
    await this.ensureInitialized();

    const { error } = await this.client
      .from(this.tableName)
      .delete()
      .eq('agent_id', agentId)
      .eq('id', memoryId);

    if (error) {
      throw new Error(`Failed to delete memory: ${error.message}`);
    }

    this.deleteFromCache(`memory_${memoryId}`);
    this.emit('memory:deleted', { agentId, memoryId });
  }

  async clear(agentId: string): Promise<void> {
    this.ensureNotDisposed();
    await this.ensureInitialized();

    const { error, count } = await this.client
      .from(this.tableName)
      .delete()
      .eq('agent_id', agentId);

    if (error) {
      throw new Error(`Failed to clear memories: ${error.message}`);
    }

    runtimeLogger.info(`Cleared ${count} memories for agent ${agentId}`);
    this.clearCache();
    this.emit('memory:cleared', { agentId });
  }

  async getStats(
    agentId: string
  ): Promise<{ total: number; byType: Record<string, number> }> {
    this.ensureNotDisposed();
    await this.ensureInitialized();

    try {
      // Get enhanced stats via RPC function
      const { data: statsData, error: statsError } = await this.client.rpc(
        'get_memory_stats',
        {
          agent_id_param: agentId,
        }
      );

      if (statsError || !statsData) {
        // Fallback to basic queries
        const { data: totalData, error: totalError } = await this.client
          .from(this.tableName)
          .select('count')
          .eq('agent_id', agentId);

        const { data: typeData, error: typeError } = await this.client
          .from(this.tableName)
          .select('type')
          .eq('agent_id', agentId);

        if (totalError || typeError) {
          throw new Error('Failed to get memory stats');
        }

        const byType: Record<string, number> = {};
        (typeData || []).forEach((row) => {
          byType[row.type] = (byType[row.type] || 0) + 1;
        });

        return {
          total: totalData?.[0]?.count || 0,
          byType,
        };
      }

      return {
        total: statsData.total_memories || 0,
        byType: statsData.by_type || {},
        ...statsData,
      };
    } catch (error) {
      runtimeLogger.error('Failed to get memory stats:', error);
      return { total: 0, byType: {} };
    }
  }

  async cleanup(agentId: string, retentionDays: number): Promise<void> {
    this.ensureNotDisposed();
    await this.ensureInitialized();

    const cutoffTime = new Date(
      Date.now() - retentionDays * 24 * 60 * 60 * 1000
    );

    // Archive before cleanup if archiver is available
    if (this.archiver) {
      const { data: oldMemories, error } = await this.client
        .from(this.tableName)
        .select('*')
        .eq('agent_id', agentId)
        .lt('timestamp', cutoffTime.toISOString());

      if (!error && oldMemories) {
        const memories = oldMemories.map((row) =>
          this.parseMemoryFromStorage(row)
        );
        await this.archiver.archive(memories);
      }
    }

    const { error, count } = await this.client
      .from(this.tableName)
      .delete()
      .eq('agent_id', agentId)
      .lt('timestamp', cutoffTime.toISOString())
      .neq('duration', 'permanent');

    if (error) {
      throw new Error(`Failed to cleanup memories: ${error.message}`);
    }

    runtimeLogger.info(`Cleaned up ${count} old memories for agent ${agentId}`);
    this.clearCache();
  }

  async consolidateMemory(
    agentId: string,
    memoryId: string,
    fromTier: MemoryTierType,
    toTier: MemoryTierType
  ): Promise<void> {
    const { error } = await this.client
      .from(this.tableName)
      .update({
        tier: toTier,
        updated_at: new Date().toISOString(),
      })
      .eq('id', memoryId)
      .eq('agent_id', agentId);

    if (error) {
      throw new Error(`Failed to consolidate memory: ${error.message}`);
    }

    runtimeLogger.info(
      `Consolidated memory ${memoryId} from ${fromTier} to ${toTier}`
    );
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

    const { data: oldMemories, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('agent_id', agentId)
      .lt(
        'timestamp',
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      ) // 30 days
      .neq('duration', 'permanent');

    if (error) {
      runtimeLogger.error('Failed to fetch memories for archival:', error);
      return;
    }

    if (oldMemories && oldMemories.length > 0) {
      const memories = oldMemories.map((row) =>
        this.parseMemoryFromStorage(row)
      );
      await this.archiver.archive(memories);
    }
  }

  async shareMemories(
    agentId: string,
    memoryIds: string[],
    poolId: string
  ): Promise<void> {
    if (!this.sharedPool) return;

    for (const memoryId of memoryIds) {
      const { data, error } = await this.client
        .from(this.tableName)
        .select('*')
        .eq('id', memoryId)
        .eq('agent_id', agentId)
        .single();

      if (!error && data) {
        const memory = this.parseMemoryFromStorage(data);
        await this.sharedPool.share(agentId, memory);
      }
    }
  }

  async generateEmbedding(content: string): Promise<number[]> {
    // In a real implementation, this would call Supabase Edge Functions or external API
    // For now, return a mock embedding
    return new Array(1536).fill(0).map(() => Math.random() * 2 - 1);
  }

  private updateResourceUsage(resourceId: string): void {
    this.resourceManager.updateResourceUsage(resourceId);
  }

  private parseMemoryFromStorage(row: SupabaseMemoryRow): EnhancedMemoryRecord {
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
      .addOptional('embedding', row.embedding)
      .addOptional(
        'expiresAt',
        row.expires_at ? new Date(row.expires_at) : undefined
      )
      .addOptional('tier', row.tier as MemoryTierType)
      .addOptional('context', row.context)
      .build();
  }

  private async runConsolidation(): Promise<void> {
    // Implementation would query consolidation rules and apply them
    runtimeLogger.info('Running memory consolidation process');
  }

  private async runArchival(): Promise<void> {
    // Get all agents and run archival for each
    const { data: agents, error } = await this.client
      .from(this.tableName)
      .select('agent_id')
      .not('agent_id', 'is', null);

    if (error) {
      runtimeLogger.error('Failed to get agents for archival:', error);
      return;
    }

    const uniqueAgents = [
      ...new Set((agents || []).map((row) => row.agent_id)),
    ];
    for (const agentId of uniqueAgents) {
      await this.archiveMemories(agentId);
    }
  }
}

// ===================================================================
// SHARED COMPONENT IMPLEMENTATIONS
// ===================================================================

/**
 * Supabase-specific archiver implementation
 */
class SupabaseArchiver extends SharedArchiver<SupabaseClient> {
  constructor(
    config: ArchiverConfig,
    private client: SupabaseClient,
    private tableName: string
  ) {
    super(config);
  }

  getStorage(): SupabaseClient {
    return this.client;
  }

  protected async cleanupBefore(date: Date): Promise<number> {
    const { error, count } = await this.client
      .from(this.tableName)
      .delete()
      .lt('timestamp', date.toISOString())
      .eq('duration', 'archived');

    if (error) {
      throw new Error(`Failed to cleanup archived memories: ${error.message}`);
    }

    return count || 0;
  }
}

/**
 * Supabase-specific memory pool implementation
 */
class SupabaseMemoryPool extends SharedMemoryPool<SupabaseClient> {
  constructor(
    config: PoolConfig,
    private client: SupabaseClient
  ) {
    super(config);
  }

  getStorage(): SupabaseClient {
    return this.client;
  }

  protected async persistEntry(key: string): Promise<void> {
    const entry = this.entries.get(key);
    if (!entry) return;

    const { error } = await this.client.from('shared_memories').upsert({
      id: entry.id,
      agent_id: entry.agentId,
      memory_data: entry.memory,
      permissions: entry.permissions,
      shared_at: entry.sharedAt.toISOString(),
      version: entry.version,
      last_accessed_at: new Date().toISOString(),
    });

    if (error) {
      throw new Error(`Failed to persist shared memory: ${error.message}`);
    }
  }

  protected async removePersistedEntry(key: string): Promise<void> {
    const { error } = await this.client
      .from('shared_memories')
      .delete()
      .eq('id', key);

    if (error) {
      throw new Error(`Failed to remove shared memory: ${error.message}`);
    }
  }

  async loadFromStorage(): Promise<void> {
    // Initialize shared memories table
    const { error: tableError } = await this.client.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS shared_memories (
          id TEXT PRIMARY KEY,
          agent_id TEXT NOT NULL,
          memory_data JSONB NOT NULL,
          permissions JSONB NOT NULL,
          shared_at TIMESTAMPTZ NOT NULL,
          version INTEGER DEFAULT 1,
          last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
          access_count INTEGER DEFAULT 0
        );
        
        CREATE INDEX IF NOT EXISTS idx_shared_memories_agent_id ON shared_memories(agent_id);
        CREATE INDEX IF NOT EXISTS idx_shared_memories_shared_at ON shared_memories(shared_at);
      `,
    });

    if (tableError) {
      runtimeLogger.warn('Failed to create shared memories table:', tableError);
      return;
    }

    // Load existing entries
    const { data, error } = await this.client
      .from('shared_memories')
      .select('*');

    if (error) {
      runtimeLogger.warn('Failed to load shared memories:', error);
      return;
    }

    for (const row of data || []) {
      const entry = {
        id: row.id,
        agentId: row.agent_id,
        memory: row.memory_data,
        permissions: row.permissions,
        sharedAt: new Date(row.shared_at),
        version: row.version,
        lastAccessedAt: new Date(row.last_accessed_at),
        accessCount: row.access_count,
      };

      this.entries.set(row.id, entry);
    }
  }

  async saveToStorage(): Promise<void> {
    // All entries are persisted individually via persistEntry
  }
}

/**
 * Factory function to create Supabase memory provider
 */
export function createSupabaseMemoryProvider(
  config: SupabaseMemoryConfig
): RefactoredSupabaseMemoryProvider {
  return new RefactoredSupabaseMemoryProvider(config);
}
