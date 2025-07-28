/**
 * Supabase Memory Provider for SYMindX
 *
 * Enhanced Supabase-based memory provider with multi-tier memory architecture,
 * vector embeddings, shared memory pools, and archival strategies.
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
} from '../../../../types/agent';
import { Metadata } from '../../../../types/common';
import {
  MemoryProviderMetadata,
  MemoryTierType,
  MemoryContext,
  ArchivalStrategy,
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
import { runMigrations } from './migrations';
import { SharedMemoryPool } from './shared-pool';

/**
 * Configuration for the Supabase memory provider
 */
export interface SupabaseMemoryConfig extends BaseMemoryConfig {
  /** Supabase project URL */
  url: string;
  /** Supabase anon key */
  anonKey: string;
  /** Database schema name (default: 'public') */
  schema?: string;
  /** Enable realtime subscriptions */
  enableRealtime?: boolean;
  /** Custom table name (default: 'memories') */
  tableName?: string;
  /**
   * Consolidation interval in milliseconds
   */
  consolidationInterval?: number;
  /**
   * Archival interval in milliseconds
   */
  archivalInterval?: number;
}

/**
 * Supabase database row type
 */
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
  context?: Record<string, any>; // JSON-encoded MemoryContext
}

/**
 * Supabase memory provider implementation with vector search capabilities
 */
export class SupabaseMemoryProvider extends BaseMemoryProvider {
  private client: SupabaseClient;
  declare protected config: SupabaseMemoryConfig;
  private realtimeChannel?: RealtimeChannel;
  private tableName: string;
  private sharedPools: Map<string, SharedMemoryPool> = new Map();
  private consolidationTimer?: ReturnType<typeof setTimeout>;
  private archivalTimer?: ReturnType<typeof setTimeout>;

  /**
   * Constructor for the Supabase memory provider
   */
  constructor(config: SupabaseMemoryConfig) {
    const metadata: MemoryProviderMetadata = {
      id: 'supabase',
      name: 'Supabase Memory Provider',
      type: 'memory',
      description:
        'Enhanced Supabase provider with multi-tier memory, vector search, and shared pools',
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
    this.config = config;
    this.tableName = config.tableName || 'memories';

    this.client = createClient(config.url, config.anonKey, {
      db: { schema: config.schema || 'public' },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    }) as SupabaseClient;

    this.initializeDatabase();

    // Start background processes
    this.startBackgroundProcesses(config);
  }

  /**
   * Initialize the database schema and enable realtime if configured
   */
  private async initializeDatabase(): Promise<void> {
    try {
      // Run migrations to ensure schema is up to date
      await runMigrations(this.client);

      // Check if pgvector extension is enabled
      const { data: extensions, error: extensionsError } =
        await this.client.rpc('get_extensions');
      const hasVector =
        !extensionsError &&
        extensions?.some((ext: any) => ext.name === 'vector');

      if (!hasVector) {
        console.warn(
          '⚠️ pgvector extension not detected. Vector search will be limited.'
        );
      }

      // Enable realtime subscriptions if configured
      if (this.config.enableRealtime) {
        this.setupRealtimeSubscription();
      }

      console.log('✅ Enhanced Supabase memory provider initialized');
    } catch (error) {
      void error;
      const dbError =
        error instanceof DatabaseError
          ? error
          : DatabaseError.connectionFailed(
              'Failed to initialize Supabase memory provider',
              error instanceof Error ? error : new Error(String(error))
            );
      console.error(
        '❌ Failed to initialize Supabase memory provider:',
        dbError
      );
      throw dbError;
    }
  }

  /**
   * Start background processes for consolidation and archival
   */
  private startBackgroundProcesses(config: SupabaseMemoryConfig): void {
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
          table: this.tableName,
        },
        (payload) => {
          console.log('📡 Memory update received:', payload);
          // Emit events for realtime memory updates
          this.emit('memory_updated', payload);
        }
      )
      .subscribe();
  }

  /**
   * Store a memory for an agent
   */
  async store(agentId: string, memory: MemoryRecord): Promise<void> {
    try {
      const enhanced = memory as EnhancedMemoryRecord;

      // Generate embedding if not provided
      if (!memory.embedding && memory.content) {
        memory.embedding = await this.generateEmbedding(memory.content);
      }

      const builder = buildObject<Partial<SupabaseMemoryRow>>({
        id: memory.id,
        agent_id: agentId,
        type: memory.type,
        content: memory.content,
        metadata: memory.metadata || {},
        importance: memory.importance,
        timestamp: memory.timestamp.toISOString(),
        tags: memory.tags || [],
        duration: memory.duration || MemoryDuration.LONG_TERM,
        updated_at: new Date().toISOString(),
        tier: enhanced.tier || MemoryTierType.EPISODIC,
      })
        .addOptional('embedding', memory.embedding)
        .addOptional('expires_at', memory.expiresAt?.toISOString())
        .addOptional('context', enhanced.context);

      const memoryData = builder.build();

      const { error } = await this.client
        .from(this.tableName)
        .upsert(memoryData);

      if (error) {
        throw new Error(`Failed to store memory: ${error.message}`);
      }

      // Handle working memory specially
      if (enhanced.tier === MemoryTierType.WORKING) {
        await this.addToWorkingMemory(agentId, memory);
      }

      // Only log conversation memories from user interactions
      if (
        memory.type === MemoryType.INTERACTION &&
        (memory.metadata?.source === 'chat_command' ||
          memory.metadata?.source === 'chat_command_fallback' ||
          memory.metadata?.messageType === 'user_input' ||
          memory.metadata?.messageType === 'agent_response')
      ) {
        console.log(
          `💾 Stored ${enhanced.tier || 'episodic'} memory: ${memory.type} for agent ${agentId}`
        );
      }
    } catch (error) {
      void error;
      const dbError =
        error instanceof DatabaseError
          ? error
          : DatabaseError.queryFailed(
              'Error storing memory',
              'INSERT INTO memories',
              error instanceof Error ? error : new Error(String(error))
            );
      console.error('❌ Error storing memory:', dbError);
      throw dbError;
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
    try {
      let queryBuilder = this.client
        .from(this.tableName)
        .select('*')
        .eq('agent_id', agentId);

      // Filter out expired short-term memories
      const now = new Date().toISOString();
      queryBuilder = queryBuilder.or(
        `duration.neq.short_term,expires_at.is.null,expires_at.gt.${now}`
      );

      if (query === 'recent') {
        queryBuilder = queryBuilder.order('timestamp', { ascending: false });
      } else if (query === 'important') {
        queryBuilder = queryBuilder.order('importance', { ascending: false });
      } else if (query === 'short_term') {
        queryBuilder = queryBuilder
          .eq('duration', 'short_term')
          .or(`expires_at.is.null,expires_at.gt.${now}`)
          .order('timestamp', { ascending: false });
      } else if (query === 'long_term') {
        queryBuilder = queryBuilder
          .eq('duration', 'long_term')
          .order('importance', { ascending: false });
      } else {
        // Text search in content
        queryBuilder = queryBuilder
          .textSearch('content', query)
          .order('importance', { ascending: false });
      }

      const { data, error } = await queryBuilder.limit(limit);

      if (error) {
        throw new Error(`Failed to retrieve memories: ${error.message}`);
      }

      return (data || []).map((row) => this.rowToMemoryRecord(row));
    } catch (error) {
      void error;
      const dbError =
        error instanceof DatabaseError
          ? error
          : DatabaseError.queryFailed(
              'Error retrieving memories',
              'SELECT FROM memories',
              error instanceof Error ? error : new Error(String(error))
            );
      console.error('❌ Error retrieving memories:', dbError);
      throw dbError;
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
    try {
      // Use the match_memories RPC function for vector similarity search
      const { data, error } = await this.client.rpc('match_memories', {
        agent_id: agentId,
        query_embedding: embedding,
        match_threshold: 0.7,
        match_count: limit,
      });

      if (error) {
        console.warn(
          '⚠️ Vector search failed, falling back to recent memories:',
          error.message
        );
        return this.retrieve(agentId, 'recent', limit);
      }

      const results = (data || []).map((row: any) =>
        this.rowToMemoryRecord(row)
      );

      console.log(`🎯 Vector search found ${results.length} similar memories`);

      return results;
    } catch (error) {
      void error;
      const dbError =
        error instanceof DatabaseError
          ? error
          : new DatabaseError(
              'Error in vector search',
              DatabaseError.ErrorCodes.QUERY_FAILED,
              'low',
              true,
              error instanceof Error ? error : new Error(String(error))
            );
      console.error('❌ Error in vector search:', dbError);
      return this.retrieve(agentId, 'recent', limit);
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
        .eq('id', memoryId);

      if (error) {
        throw new Error(`Failed to delete memory: ${error.message}`);
      }

      console.log(`🗑️ Deleted memory: ${memoryId} for agent ${agentId}`);
    } catch (error) {
      void error;
      const dbError =
        error instanceof DatabaseError
          ? error
          : DatabaseError.queryFailed(
              'Error deleting memory',
              'DELETE FROM memories',
              error instanceof Error ? error : new Error(String(error))
            );
      console.error('❌ Error deleting memory:', dbError);
      throw dbError;
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
        .eq('agent_id', agentId);

      if (error) {
        throw new Error(`Failed to clear memories: ${error.message}`);
      }

      console.log(`🧹 Cleared all memories for agent ${agentId}`);
    } catch (error) {
      void error;
      const dbError =
        error instanceof DatabaseError
          ? error
          : DatabaseError.queryFailed(
              'Error clearing memories',
              'DELETE FROM memories',
              error instanceof Error ? error : new Error(String(error))
            );
      console.error('❌ Error clearing memories:', dbError);
      throw dbError;
    }
  }

  /**
   * Get statistics about an agent's memories
   */
  async getStats(
    agentId: string
  ): Promise<{ total: number; byType: Record<string, number> }> {
    try {
      // Get total count
      const { count, error: countError } = await this.client
        .from(this.tableName)
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', agentId);

      if (countError) {
        throw new Error(`Failed to get memory stats: ${countError.message}`);
      }

      // Get count by type
      const { data: typeData, error: typeError } = await this.client
        .from(this.tableName)
        .select('type')
        .eq('agent_id', agentId);

      if (typeError) {
        throw new Error(
          `Failed to get memory type stats: ${typeError.message}`
        );
      }

      const byType: Record<string, number> = {};
      typeData?.forEach((row) => {
        byType[row.type] = (byType[row.type] || 0) + 1;
      });

      return { total: count || 0, byType };
    } catch (error) {
      void error;
      const dbError =
        error instanceof DatabaseError
          ? error
          : DatabaseError.queryFailed(
              'Error getting memory stats',
              'SELECT COUNT FROM memories',
              error instanceof Error ? error : new Error(String(error))
            );
      console.error('❌ Error getting memory stats:', dbError);
      return { total: 0, byType: {} };
    }
  }

  /**
   * Clean up old and expired memories for an agent
   */
  async cleanup(agentId: string, retentionDays: number): Promise<void> {
    try {
      const now = new Date();
      const cutoffDate = new Date(
        now.getTime() - retentionDays * 24 * 60 * 60 * 1000
      );

      // Clean up expired short-term memories
      const { error: expiredError } = await this.client
        .from(this.tableName)
        .delete()
        .eq('agent_id', agentId)
        .eq('duration', 'short_term')
        .not('expires_at', 'is', null)
        .lt('expires_at', now.toISOString());

      if (expiredError) {
        console.warn(
          '⚠️ Failed to clean expired memories:',
          expiredError.message
        );
      }

      // Clean up old memories beyond retention period
      const { error: oldError } = await this.client
        .from(this.tableName)
        .delete()
        .eq('agent_id', agentId)
        .lt('timestamp', cutoffDate.toISOString());

      if (oldError) {
        console.warn('⚠️ Failed to clean old memories:', oldError.message);
      }

      console.log(
        `🧹 Cleaned up old and expired memories for agent ${agentId}`
      );
    } catch (error) {
      void error;
      const dbError =
        error instanceof DatabaseError
          ? error
          : DatabaseError.queryFailed(
              'Error during memory cleanup',
              'DELETE FROM memories WHERE expires_at < NOW',
              error instanceof Error ? error : new Error(String(error))
            );
      console.error('❌ Error during memory cleanup:', dbError);
      throw dbError;
    }
  }

  /**
   * Convert a database row to a memory record
   */
  private rowToMemoryRecord(row: SupabaseMemoryRow): EnhancedMemoryRecord {
    const record = buildObject<EnhancedMemoryRecord>({
      id: row.id,
      agentId: row.agent_id,
      type:
        MemoryType[row.type.toUpperCase() as keyof typeof MemoryType] ||
        MemoryType.EXPERIENCE,
      content: row.content,
      metadata: (row.metadata || {}) as Metadata,
      importance: row.importance,
      timestamp: new Date(row.timestamp),
      tags: row.tags || [],
      duration:
        MemoryDuration[
          row.duration.toUpperCase() as keyof typeof MemoryDuration
        ] || MemoryDuration.LONG_TERM,
    })
      .addOptional('embedding', row.embedding)
      .addOptional(
        'expiresAt',
        row.expires_at ? new Date(row.expires_at) : undefined
      )
      .build();

    // Add tier and context if available
    if (row.tier) {
      record.tier = row.tier as MemoryTierType;
    }
    if (row.context) {
      record.context = row.context as MemoryContext;
    }

    return record;
  }

  /**
   * Emit custom events (simple EventEmitter-like functionality)
   */
  private emit(event: string, data: any): void {
    // Simple event emission - can be enhanced with proper EventEmitter
    console.log(`📡 Event: ${event}`, data);
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
    const { data, error } = await this.client
      .from(this.tableName)
      .update({ tier: toTier })
      .eq('agent_id', agentId)
      .eq('id', memoryId)
      .eq('tier', fromTier)
      .select();

    if (error) {
      throw new Error(`Failed to consolidate memory: ${error.message}`);
    }

    if (data && data.length > 0) {
      runtimeLogger.memory(
        `Consolidated memory ${memoryId} from ${fromTier} to ${toTier}`
      );

      // Apply tier-specific transformations
      if (
        fromTier === MemoryTierType.EPISODIC &&
        toTier === MemoryTierType.SEMANTIC
      ) {
        // Extract concepts and update type
        const memory = data[0];
        if (memory) {
          const concepts = await this.extractConcepts(memory.content);
          await this.client
            .from(this.tableName)
            .update({
              type: MemoryType.KNOWLEDGE,
              tags: concepts,
            })
            .eq('agent_id', agentId)
            .eq('id', memoryId);
        }
      }
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
    let query = this.client
      .from(this.tableName)
      .select('*')
      .eq('agent_id', agentId)
      .eq('tier', tier)
      .order('timestamp', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to retrieve tier memories: ${error.message}`);
    }

    return (data || []).map((row) => this.rowToMemoryRecord(row));
  }

  /**
   * Archive old memories based on configured strategies
   */
  async archiveMemories(agentId: string): Promise<void> {
    if (!this.config.archival) return;

    for (const strategy of this.config.archival) {
      if (strategy.type === 'compression') {
        await this.compressOldMemories(agentId, strategy);
      } else if (strategy.type === 'summarization') {
        await this.summarizeMemories(agentId, strategy);
      }
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
    let pool = this.sharedPools.get(poolId);

    if (!pool && this.config.sharedMemory) {
      pool = new SharedMemoryPool(poolId, this.config.sharedMemory);
      this.sharedPools.set(poolId, pool);

      // Store pool configuration
      await this.client.from('shared_memory_pools').upsert({
        pool_id: poolId,
        config: this.config.sharedMemory,
        created_at: new Date().toISOString(),
      });
    }

    if (!pool) {
      throw new Error(`Shared memory pool ${poolId} not found`);
    }

    // Share each memory
    for (const memoryId of memoryIds) {
      const { data } = await this.client
        .from(this.tableName)
        .select('*')
        .eq('agent_id', agentId)
        .eq('id', memoryId)
        .single();

      if (data) {
        await pool.share(agentId, this.rowToMemoryRecord(data));

        // Record sharing
        await this.client.from('shared_memory_mappings').upsert({
          memory_id: memoryId,
          pool_id: poolId,
          shared_by: agentId,
          shared_at: new Date().toISOString(),
          permissions: [MemoryPermission.READ],
        });
      }
    }
  }

  /**
   * Generate embedding for a memory
   */
  async generateEmbedding(_content: string): Promise<number[]> {
    // This would call the actual embedding API based on config
    // For now, return a mock embedding
    // In production, this would use OpenAI, Cohere, or another embedding service
    return new Array(1536).fill(0).map(() => Math.random() * 2 - 1);
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
    // Get all unique agent IDs
    const { data: agents } = await this.client
      .from(this.tableName)
      .select('agent_id')
      .limit(1000);

    const uniqueAgents = Array.from(
      new Set((agents || []).map((a) => a.agent_id))
    );

    for (const agentId of uniqueAgents) {
      // Check consolidation rules for each tier
      for (const tier of Array.from(this.tiers.values())) {
        if (!tier.consolidationRules) continue;

        for (const rule of tier.consolidationRules) {
          const memories = await this.retrieveTier(agentId, rule.fromTier);

          for (const memory of memories) {
            if (this.shouldConsolidate(memory as EnhancedMemoryRecord, rule)) {
              await this.consolidateMemory(
                agentId,
                memory.id,
                rule.fromTier,
                rule.toTier
              );
            }
          }
        }
      }
    }
  }

  /**
   * Check if memory should be consolidated
   */
  private shouldConsolidate(memory: EnhancedMemoryRecord, rule: any): boolean {
    switch (rule.condition) {
      case 'importance':
        return (memory.importance || 0) >= rule.threshold;
      case 'age': {
        const ageInDays =
          (Date.now() - memory.timestamp.getTime()) / (1000 * 60 * 60 * 24);
        return ageInDays >= rule.threshold;
      }
      case 'emotional':
        return (memory.context?.emotionalValence || 0) >= rule.threshold;
      default:
        return false;
    }
  }

  /**
   * Run memory archival
   */
  private async runArchival(): Promise<void> {
    // Get all unique agent IDs
    const { data: agents } = await this.client
      .from(this.tableName)
      .select('agent_id')
      .limit(1000);

    const uniqueAgents = Array.from(
      new Set((agents || []).map((a) => a.agent_id))
    );

    for (const agentId of uniqueAgents) {
      await this.archiveMemories(agentId);
    }
  }

  /**
   * Compress old memories
   */
  private async compressOldMemories(
    agentId: string,
    strategy: ArchivalStrategy
  ): Promise<void> {
    if (!strategy.triggerAge) return;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - strategy.triggerAge);

    const { data: oldMemories } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('agent_id', agentId)
      .lt('timestamp', cutoff.toISOString())
      .eq('tier', 'episodic')
      .order('timestamp', { ascending: false });

    if (!oldMemories || oldMemories.length === 0) return;

    // Group similar memories and compress
    const compressed = this.groupAndCompress(
      oldMemories.map((r) => this.rowToMemoryRecord(r))
    );

    // Store compressed memories
    for (const memory of compressed) {
      await this.store(agentId, memory);
    }

    // Delete original memories
    const idsToDelete = oldMemories.map((m) => m.id);
    await this.client.from(this.tableName).delete().in('id', idsToDelete);
  }

  /**
   * Summarize memories
   */
  private async summarizeMemories(
    agentId: string,
    _strategy: ArchivalStrategy
  ): Promise<void> {
    // Implementation would use LLM to summarize groups of memories
    // For now, this is a placeholder
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
        context: {
          source: 'compression',
        } as MemoryContext,
        metadata: {
          originalCount: group.length,
        },
      });
    }

    return compressed;
  }

  /**
   * Cleanup connections and subscriptions
   */
  async disconnect(): Promise<void> {
    if (this.consolidationTimer) {
      clearInterval(this.consolidationTimer);
    }
    if (this.archivalTimer) {
      clearInterval(this.archivalTimer);
    }

    if (this.realtimeChannel) {
      await this.client.removeChannel(this.realtimeChannel);
    }
    console.log('🔌 Supabase memory provider disconnected');
  }

  /**
   * Clean up resources (alias for disconnect)
   */
  async destroy(): Promise<void> {
    await this.disconnect();
  }
}

/**
 * Create a Supabase memory provider
 */
export function createSupabaseMemoryProvider(
  config: SupabaseMemoryConfig
): SupabaseMemoryProvider {
  return new SupabaseMemoryProvider(config);
}

/**
 * SQL migration for creating the memories table with vector support
 */
export const SUPABASE_MEMORY_MIGRATION = `
-- Enable the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create the memories table with tier and context support
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
    tier TEXT DEFAULT 'episodic',
    context JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

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
    permissions TEXT[] NOT NULL DEFAULT '{"read"}',
    PRIMARY KEY (memory_id, pool_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_memories_agent_id ON memories(agent_id);
CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type);
CREATE INDEX IF NOT EXISTS idx_memories_timestamp ON memories(timestamp);
CREATE INDEX IF NOT EXISTS idx_memories_importance ON memories(importance);
CREATE INDEX IF NOT EXISTS idx_memories_duration ON memories(duration);
CREATE INDEX IF NOT EXISTS idx_memories_expires_at ON memories(expires_at);
CREATE INDEX IF NOT EXISTS idx_memories_tier ON memories(tier);
CREATE INDEX IF NOT EXISTS idx_shared_mappings_pool ON shared_memory_mappings(pool_id);

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

-- Function to create shared memory tables (callable via RPC)
CREATE OR REPLACE FUNCTION create_shared_memory_tables_if_not_exists()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    -- This function ensures the shared memory tables exist
    -- The actual table creation is handled by the main migration above
    RAISE NOTICE 'Shared memory tables initialization checked';
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
