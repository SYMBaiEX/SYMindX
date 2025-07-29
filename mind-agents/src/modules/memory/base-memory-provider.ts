/**
 * Base Memory Provider for SYMindX
 *
 * This abstract class implements the MemoryProvider interface and provides
 * common functionality for all memory providers with support for memory tiers,
 * vector embeddings, and shared memory pools.
 */

import { v4 as uuidv4 } from 'uuid';

import {
  MemoryProvider,
  MemoryRecord,
  MemoryDuration,
  MemoryType,
} from '../../types/agent';
import {
  MemoryProviderMetadata,
  MemoryTier,
  MemoryTierType,
  MemoryContext,
  SharedMemoryConfig,
  ArchivalStrategy,
  SearchQuery,
  SearchResult,
  MemoryRelationship,
  MemoryRelationshipType,
  TimeRange,
  BoostFactors,
} from '../../types/memory';
import { UnifiedContext, ContextScope } from '../../types/context/unified-context';
import { buildObject } from '../../utils/type-helpers';

/**
 * Base configuration interface for memory providers
 */
export interface BaseMemoryConfig {
  /**
   * Embedding model to use for vector search
   */
  embeddingModel?: string;

  /**
   * Memory tier configurations
   */
  tiers?: MemoryTier[];

  /**
   * Shared memory pool configuration
   */
  sharedMemory?: SharedMemoryConfig;

  /**
   * Archival strategies
   */
  archival?: ArchivalStrategy[];

  /**
   * Additional configuration properties
   */
  [key: string]: unknown;
}

/**
 * Interface for database row data
 */
export interface MemoryRow {
  id: string;
  agent_id: string;
  type: string;
  content: string;
  embedding?: Buffer | number[] | null;
  metadata?: string | object;
  importance: number;
  timestamp: number | Date | string;
  tags?: string | string[];
  duration?: string;
  expires_at?: number | Date | string | null;
  memory_id?: string; // Alternative field name for id
}

/**
 * Basic health check result for memory providers
 */
export interface MemoryHealthCheckResult {
  status: 'healthy' | 'unhealthy';
  details?: Record<string, unknown>;
}

/**
 * Enhanced memory record with tier and context
 */
export interface EnhancedMemoryRecord extends MemoryRecord {
  tier?: MemoryTierType;
  context?: MemoryContext;
}

/**
 * Context-enhanced memory record with unified context integration
 */
export interface ContextEnhancedMemoryRecord extends EnhancedMemoryRecord {
  unifiedContext?: UnifiedContext;
  contextFingerprint?: string;
  contextScore?: number;
  derivedInsights?: string[];
}

/**
 * Context-aware search options
 */
export interface ContextAwareSearchOptions {
  includeContext?: boolean;
  contextWeight?: number;
  contextScope?: ContextScope[];
  contextSimilarityThreshold?: number;
  useContextualRanking?: boolean;
  enrichWithContext?: boolean;
}

/**
 * Working memory item with limited capacity tracking
 */
export interface WorkingMemoryItem {
  id: string;
  content: string;
  attention: number; // 0-1, how much attention is on this item
  lastAccessed: Date;
}

/**
 * Abstract base class for memory providers
 */
export abstract class BaseMemoryProvider implements MemoryProvider {
  protected config: BaseMemoryConfig;
  protected metadata: MemoryProviderMetadata;
  protected embeddingModel: string;
  protected tiers: Map<MemoryTierType, MemoryTier>;
  protected workingMemory: Map<string, WorkingMemoryItem[]>; // agentId -> items

  /**
   * Constructor for the base memory provider
   * @param config Configuration for the memory provider
   * @param metadata Metadata for the memory provider
   */
  constructor(config: BaseMemoryConfig, metadata: MemoryProviderMetadata) {
    this.config = config;
    this.metadata = metadata;
    this.embeddingModel = config.embeddingModel || 'text-embedding-3-small';
    this.tiers = new Map();
    this.workingMemory = new Map();

    // Initialize memory tiers
    if (config.tiers) {
      config.tiers.forEach((tier) => {
        this.tiers.set(tier.type, tier);
      });
    } else {
      // Default tier configuration
      this.initializeDefaultTiers();
    }
  }

  /**
   * Initialize default memory tiers
   */
  protected initializeDefaultTiers(): void {
    this.tiers.set(MemoryTierType.WORKING, {
      type: MemoryTierType.WORKING,
      capacity: 7,
      decayRate: 0.1,
    });

    this.tiers.set(MemoryTierType.EPISODIC, {
      type: MemoryTierType.EPISODIC,
      capacity: 1000,
      consolidationRules: [
        {
          fromTier: MemoryTierType.WORKING,
          toTier: MemoryTierType.EPISODIC,
          condition: 'importance',
          threshold: 0.7,
        },
      ],
    });

    this.tiers.set(MemoryTierType.SEMANTIC, {
      type: MemoryTierType.SEMANTIC,
      capacity: 10000,
      consolidationRules: [
        {
          fromTier: MemoryTierType.EPISODIC,
          toTier: MemoryTierType.SEMANTIC,
          condition: 'frequency',
          threshold: 3,
        },
      ],
    });

    this.tiers.set(MemoryTierType.PROCEDURAL, {
      type: MemoryTierType.PROCEDURAL,
      capacity: 500,
    });
  }

  /**
   * Store a memory for an agent
   * @param agentId The ID of the agent
   * @param memory The memory to store
   */
  abstract store(agentId: string, memory: MemoryRecord): Promise<void>;

  /**
   * Store a memory with enhanced context awareness
   * @param agentId The ID of the agent
   * @param memory The memory to store
   * @param context Optional unified context for enrichment
   */
  async storeWithContext(
    agentId: string,
    memory: MemoryRecord,
    context?: UnifiedContext
  ): Promise<void> {
    const enhancedMemory: ContextEnhancedMemoryRecord = {
      ...memory,
      unifiedContext: context,
    };

    // Generate context fingerprint for similarity matching
    if (context) {
      enhancedMemory.contextFingerprint = await this.generateContextFingerprint(context);
      enhancedMemory.contextScore = this.calculateContextScore(context);
      enhancedMemory.derivedInsights = await this.extractContextualInsights(memory, context);
    }

    return this.store(agentId, enhancedMemory);
  }

  /**
   * Store a short-term memory for an agent
   * @param agentId The ID of the agent
   * @param memory The memory to store
   * @param ttlMinutes Time to live in minutes before the memory expires
   */
  async storeShortTerm(
    agentId: string,
    memory: MemoryRecord,
    ttlMinutes: number = 60
  ): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + ttlMinutes);

    const shortTermMemory: MemoryRecord = {
      ...memory,
      duration: MemoryDuration.SHORT_TERM,
      expiresAt,
    };

    return this.store(agentId, shortTermMemory);
  }

  /**
   * Store a long-term memory for an agent
   * @param agentId The ID of the agent
   * @param memory The memory to store
   */
  async storeLongTerm(agentId: string, memory: MemoryRecord): Promise<void> {
    const longTermMemory: MemoryRecord = {
      ...memory,
      duration: MemoryDuration.LONG_TERM,
    };

    return this.store(agentId, longTermMemory);
  }

  /**
   * Retrieve memories for an agent based on a query
   * @param agentId The ID of the agent
   * @param query The query to search for
   * @param limit The maximum number of memories to return
   */
  abstract retrieve(
    agentId: string,
    query: string,
    limit?: number
  ): Promise<MemoryRecord[]>;

  /**
   * Retrieve memories with context-aware filtering and ranking
   * @param agentId The ID of the agent
   * @param query The search query
   * @param context Current context for similarity matching
   * @param options Context-aware search options
   * @param limit The maximum number of memories to return
   */
  async retrieveWithContext(
    agentId: string,
    query: string,
    context?: UnifiedContext,
    options: ContextAwareSearchOptions = {},
    limit = 10
  ): Promise<SearchResult[]> {
    // Get base memories
    const baseMemories = await this.retrieve(agentId, query, limit * 2);
    
    // Convert to search results
    let results: SearchResult[] = baseMemories.map(memory => ({
      record: memory,
      score: memory.importance || 0.5,
    }));

    // Apply context-aware ranking if context is provided
    if (context && options.useContextualRanking) {
      results = await this.applyContextualRanking(results, context, options);
    }

    // Enrich with context if requested
    if (options.enrichWithContext && context) {
      results = await this.enrichResultsWithContext(results, context);
    }

    return results.slice(0, limit);
  }

  /**
   * Advanced context-aware search using SearchQuery interface
   * @param agentId The ID of the agent
   * @param searchQuery Advanced search query
   * @param context Current context for similarity matching
   */
  async searchWithContext(
    agentId: string,
    searchQuery: SearchQuery,
    context?: UnifiedContext
  ): Promise<SearchResult[]> {
    // Use existing search method as base
    const embedding = searchQuery.embedding || (searchQuery.query ? await this.generateEmbedding(searchQuery.query) : undefined);
    
    let baseMemories: MemoryRecord[] = [];
    
    if (embedding) {
      baseMemories = await this.search(agentId, embedding, searchQuery.limit);
    } else {
      baseMemories = await this.retrieve(agentId, searchQuery.query, searchQuery.limit);
    }

    // Convert to search results with initial scoring
    let results: SearchResult[] = baseMemories.map(memory => ({
      record: memory,
      score: this.calculateInitialScore(memory, searchQuery),
    }));

    // Apply context-based enhancements
    if (context) {
      results = await this.enhanceWithContext(results, context, searchQuery);
    }

    // Apply boost factors
    if (searchQuery.boostFactors) {
      results = this.applyBoostFactors(results, searchQuery.boostFactors);
    }

    // Filter by threshold
    if (searchQuery.threshold) {
      results = results.filter(result => result.score >= searchQuery.threshold);
    }

    return results.slice(0, searchQuery.limit || 10);
  }

  /**
   * Retrieve only short-term memories for an agent
   * @param agentId The ID of the agent
   * @param query The query to search for
   * @param limit The maximum number of memories to return
   */
  async retrieveShortTerm(
    agentId: string,
    query: string,
    limit: number = 10
  ): Promise<MemoryRecord[]> {
    const memories = await this.retrieve(agentId, query, limit);
    const now = new Date();

    // Filter out expired memories and only return short-term memories
    return memories.filter(
      (memory) =>
        memory.duration === 'short_term' &&
        (!memory.expiresAt || memory.expiresAt > now)
    );
  }

  /**
   * Retrieve only long-term memories for an agent
   * @param agentId The ID of the agent
   * @param query The query to search for
   * @param limit The maximum number of memories to return
   */
  async retrieveLongTerm(
    agentId: string,
    query: string,
    limit: number = 10
  ): Promise<MemoryRecord[]> {
    const memories = await this.retrieve(agentId, query, limit);

    // Only return long-term memories
    return memories.filter((memory) => memory.duration === 'long_term');
  }

  /**
   * Search for memories using vector similarity
   * @param agentId The ID of the agent
   * @param embedding The embedding vector to search with
   * @param limit The maximum number of memories to return
   */
  abstract search(
    agentId: string,
    embedding: number[],
    limit?: number
  ): Promise<MemoryRecord[]>;

  /**
   * Delete a memory for an agent
   * @param agentId The ID of the agent
   * @param memoryId The ID of the memory to delete
   */
  abstract delete(agentId: string, memoryId: string): Promise<void>;

  /**
   * Clear all memories for an agent
   * @param agentId The ID of the agent
   */
  abstract clear(agentId: string): Promise<void>;

  /**
   * Get statistics about an agent's memories
   * @param agentId The ID of the agent
   */
  abstract getStats(
    agentId: string
  ): Promise<{ total: number; byType: Record<string, number> }>;

  /**
   * Clean up old memories for an agent
   * @param agentId The ID of the agent
   * @param retentionDays The number of days to retain memories
   */
  abstract cleanup(agentId: string, retentionDays: number): Promise<void>;

  /**
   * Get the metadata for this memory provider
   * @returns The metadata for this memory provider
   */
  getMetadata(): MemoryProviderMetadata {
    return this.metadata;
  }

  /**
   * Get recent memories for an agent
   * @param agentId The ID of the agent
   * @param limit Maximum number of memories to return
   * @returns Array of recent memory records
   */
  async getRecent(agentId: string, limit = 10): Promise<MemoryRecord[]> {
    // This is a default implementation that calls retrieve with 'recent' query
    // Subclasses can override this method if they have a more efficient implementation
    return this.retrieve(agentId, 'recent', limit);
  }

  /**
   * Generate a unique ID
   * @returns A unique ID string
   */
  protected generateId(): string {
    return uuidv4();
  }

  /**
   * Format a memory record for storage
   * @param memory The memory record to format
   * @returns The formatted memory record
   */
  protected formatMemoryForStorage(
    memory: MemoryRecord
  ): Record<string, unknown> {
    return {
      ...memory,
      timestamp:
        memory.timestamp instanceof Date
          ? memory.timestamp.toISOString()
          : memory.timestamp,
      metadata:
        typeof memory.metadata === 'object'
          ? JSON.stringify(memory.metadata)
          : memory.metadata,
      tags: Array.isArray(memory.tags)
        ? JSON.stringify(memory.tags)
        : memory.tags,
    };
  }

  /**
   * Parse a memory record from storage
   * @param row The raw data from storage
   * @returns The parsed memory record
   */
  protected parseMemoryFromStorage(row: MemoryRow): MemoryRecord {
    const record: MemoryRecord = {
      id: row.id || row.memory_id || '',
      agentId: row.agent_id,
      type: (row.type as string)
        ? MemoryType[row.type.toUpperCase() as keyof typeof MemoryType] ||
          MemoryType.EXPERIENCE
        : MemoryType.EXPERIENCE,
      content: row.content,
      metadata:
        typeof row.metadata === 'string'
          ? JSON.parse(row.metadata)
          : row.metadata || {},
      importance: row.importance || 0.5,
      timestamp:
        row.timestamp instanceof Date ? row.timestamp : new Date(row.timestamp),
      tags:
        typeof row.tags === 'string'
          ? JSON.parse(row.tags)
          : Array.isArray(row.tags)
            ? row.tags
            : [],
      duration: (row.duration || MemoryDuration.LONG_TERM) as MemoryDuration,
    };

    // Add optional properties
    if (Array.isArray(row.embedding)) {
      record.embedding = row.embedding;
    }

    if (row.expires_at) {
      record.expiresAt =
        row.expires_at instanceof Date
          ? row.expires_at
          : new Date(row.expires_at);
    }

    return record;
  }

  /**
   * Store a memory in a specific tier
   * @param agentId The ID of the agent
   * @param memory The memory to store
   * @param tier The memory tier
   */
  async storeTier(
    agentId: string,
    memory: MemoryRecord,
    tier: MemoryTierType
  ): Promise<void> {
    const enhancedMemory: EnhancedMemoryRecord = {
      ...memory,
      tier,
    };

    // Handle working memory specially
    if (tier === MemoryTierType.WORKING) {
      await this.addToWorkingMemory(agentId, memory);
    } else {
      await this.store(agentId, enhancedMemory);
    }
  }

  /**
   * Add an item to working memory with capacity management
   * @param agentId The ID of the agent
   * @param memory The memory to add
   */
  protected async addToWorkingMemory(
    agentId: string,
    memory: MemoryRecord
  ): Promise<void> {
    const items = this.workingMemory.get(agentId) || [];
    const tier = this.tiers.get(MemoryTierType.WORKING);
    const capacity = tier?.capacity || 7;

    const newItem: WorkingMemoryItem = {
      id: memory.id,
      content: memory.content,
      attention: 1.0,
      lastAccessed: new Date(),
    };

    // If at capacity, consolidate or remove least attended item
    if (items.length >= capacity) {
      // Find least attended item
      const leastAttended = items.reduce((min, item) =>
        item.attention < min.attention ? item : min
      );

      // Check if it should be consolidated to episodic memory
      if (leastAttended.attention > 0.5) {
        await this.consolidateMemory(
          agentId,
          leastAttended.id,
          MemoryTierType.WORKING,
          MemoryTierType.EPISODIC
        );
      }

      // Remove from working memory
      const index = items.findIndex((item) => item.id === leastAttended.id);
      items.splice(index, 1);
    }

    items.push(newItem);
    this.workingMemory.set(agentId, items);
  }

  /**
   * Consolidate memory from one tier to another
   * @param agentId The ID of the agent
   * @param memoryId The ID of the memory to consolidate
   * @param fromTier The source tier
   * @param toTier The destination tier
   */
  abstract consolidateMemory(
    agentId: string,
    memoryId: string,
    fromTier: MemoryTierType,
    toTier: MemoryTierType
  ): Promise<void>;

  /**
   * Context-aware memory consolidation
   * Consolidates memories based on contextual similarity and relationships
   * @param agentId The ID of the agent
   * @param context Current context for consolidation decisions
   */
  async consolidateByContext(
    agentId: string,
    context?: UnifiedContext
  ): Promise<void> {
    if (!context) return;

    // Get memories from working tier for potential consolidation
    const workingMemories = await this.retrieveTier(agentId, MemoryTierType.WORKING);
    
    for (const memory of workingMemories) {
      const shouldConsolidate = await this.shouldConsolidateByContext(
        memory as ContextEnhancedMemoryRecord,
        context
      );
      
      if (shouldConsolidate) {
        const targetTier = this.determineTargetTier(
          memory as ContextEnhancedMemoryRecord,
          context
        );
        
        await this.consolidateMemory(
          agentId,
          memory.id,
          MemoryTierType.WORKING,
          targetTier
        );
      }
    }
  }

  /**
   * Smart memory consolidation based on context patterns
   * Groups similar contexts and consolidates related memories
   * @param agentId The ID of the agent
   * @param consolidationThreshold Similarity threshold for grouping (0-1)
   */
  async smartConsolidation(
    agentId: string,
    consolidationThreshold = 0.7
  ): Promise<void> {
    const allMemories = await this.retrieve(agentId, '', 1000);
    const contextGroups = await this.groupMemoriesByContext(
      allMemories as ContextEnhancedMemoryRecord[],
      consolidationThreshold
    );

    for (const group of contextGroups) {
      if (group.length > 1) {
        await this.consolidateMemoryGroup(agentId, group);
      }
    }
  }

  /**
   * Get memories from a specific tier
   * @param agentId The ID of the agent
   * @param tier The memory tier
   * @param limit Maximum number of memories to return
   */
  abstract retrieveTier(
    agentId: string,
    tier: MemoryTierType,
    limit?: number
  ): Promise<MemoryRecord[]>;

  /**
   * Update working memory attention based on access
   * @param agentId The ID of the agent
   * @param memoryId The ID of the memory accessed
   */
  protected updateWorkingMemoryAttention(
    agentId: string,
    memoryId: string
  ): void {
    const items = this.workingMemory.get(agentId) || [];
    const tier = this.tiers.get(MemoryTierType.WORKING);
    const decayRate = tier?.decayRate || 0.1;

    items.forEach((item) => {
      if (item.id === memoryId) {
        item.attention = 1.0;
        item.lastAccessed = new Date();
      } else {
        // Decay attention for other items
        item.attention = Math.max(0, item.attention - decayRate);
      }
    });

    this.workingMemory.set(agentId, items);
  }

  /**
   * Get semantic memories related to a concept
   * @param agentId The ID of the agent
   * @param concept The concept to search for
   * @param limit Maximum number of memories to return
   */
  async retrieveSemantic(
    agentId: string,
    concept: string,
    limit: number = 10
  ): Promise<MemoryRecord[]> {
    const memories = await this.retrieveTier(
      agentId,
      MemoryTierType.SEMANTIC,
      limit * 2
    );

    // Filter by concept relevance
    return memories
      .filter((memory) => {
        const content = memory.content.toLowerCase();
        const conceptLower = concept.toLowerCase();
        return (
          content.includes(conceptLower) ||
          memory.tags?.some((tag) => tag.toLowerCase().includes(conceptLower))
        );
      })
      .slice(0, limit);
  }

  /**
   * Get episodic memories within a time range
   * @param agentId The ID of the agent
   * @param startTime Start of the time range
   * @param endTime End of the time range
   * @param limit Maximum number of memories to return
   */
  async retrieveEpisodic(
    agentId: string,
    startTime: Date,
    endTime: Date,
    limit: number = 10
  ): Promise<MemoryRecord[]> {
    const memories = await this.retrieveTier(
      agentId,
      MemoryTierType.EPISODIC,
      limit * 2
    );

    return memories
      .filter((memory) => {
        const timestamp = memory.timestamp;
        return timestamp >= startTime && timestamp <= endTime;
      })
      .slice(0, limit);
  }

  /**
   * Archive old memories based on configured strategies
   * @param agentId The ID of the agent
   */
  abstract archiveMemories(agentId: string): Promise<void>;

  /**
   * Share memories with other agents in a pool
   * @param agentId The source agent ID
   * @param memoryIds Memory IDs to share
   * @param poolId The shared memory pool ID
   */
  abstract shareMemories(
    agentId: string,
    memoryIds: string[],
    poolId: string
  ): Promise<void>;

  /**
   * Generate embedding for a memory
   * @param content The memory content
   * @returns The embedding vector
   */
  abstract generateEmbedding(content: string): Promise<number[]>;

  /**
   * Calculate similarity between two embeddings
   * @param embedding1 First embedding vector
   * @param embedding2 Second embedding vector
   * @returns Similarity score (0-1)
   */
  protected cosineSimilarity(
    embedding1: number[],
    embedding2: number[]
  ): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have the same length');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i]! * embedding2[i]!;
      norm1 += embedding1[i]! * embedding1[i]!;
      norm2 += embedding2[i]! * embedding2[i]!;
    }

    norm1 = Math.sqrt(norm1);
    norm2 = Math.sqrt(norm2);

    if (norm1 === 0 || norm2 === 0) {
      return 0;
    }

    return dotProduct / (norm1 * norm2);
  }

  /**
   * Generate a context fingerprint for similarity matching
   * @param context The unified context
   * @returns A string fingerprint representing the context
   */
  protected async generateContextFingerprint(context: UnifiedContext): Promise<string> {
    // Create a simplified representation of context for fingerprinting
    const contextData = {
      scope: context.metadata?.scope,
      agentId: context.agent?.id,
      sessionId: context.session?.id,
      environment: context.environment?.nodeEnv,
      extensionStates: Object.keys(context.extensions || {}),
      emotionalState: context.agent?.emotionalState,
    };

    // Generate hash-like fingerprint
    const fingerprint = JSON.stringify(contextData);
    return this.simpleHash(fingerprint);
  }

  /**
   * Calculate a context score representing the richness/importance of context
   * @param context The unified context
   * @returns A score between 0 and 1
   */
  protected calculateContextScore(context: UnifiedContext): number {
    let score = 0;
    
    // Agent context weight
    if (context.agent) score += 0.3;
    
    // Session context weight
    if (context.session) score += 0.2;
    
    // Extension context weight
    if (context.extensions && Object.keys(context.extensions).length > 0) score += 0.2;
    
    // Environment context weight
    if (context.environment) score += 0.1;
    
    // Communication context weight
    if (context.communication) score += 0.1;
    
    // Portal context weight
    if (context.portal) score += 0.1;

    return Math.min(score, 1.0);
  }

  /**
   * Extract contextual insights from memory and context
   * @param memory The memory record
   * @param context The unified context
   * @returns Array of derived insights
   */
  protected async extractContextualInsights(
    memory: MemoryRecord,
    context: UnifiedContext
  ): Promise<string[]> {
    const insights: string[] = [];

    // Temporal insights
    if (context.temporal) {
      insights.push(`Memory created at ${memory.timestamp.toISOString()}`);
    }

    // Agent state insights
    if (context.agent?.emotionalState) {
      const emotions = Object.entries(
        context.agent.emotionalState as Record<string, { intensity: number }>
      )
        .filter(([, value]) => value.intensity > 0.5)
        .map(([emotion]) => emotion);
      
      if (emotions.length > 0) {
        insights.push(`Agent was feeling ${emotions.join(', ')} when this memory was created`);
      }
    }

    // Session insights
    if (context.session?.id) {
      insights.push(`Part of session: ${context.session.id}`);
    }

    // Extension insights
    if (context.extensions) {
      const activeExtensions = Object.keys(context.extensions);
      if (activeExtensions.length > 0) {
        insights.push(`Active extensions: ${activeExtensions.join(', ')}`);
      }
    }

    return insights;
  }

  /**
   * Apply contextual ranking to search results
   * @param results The initial search results
   * @param context The current context
   * @param options Context-aware search options
   * @returns Re-ranked search results
   */
  protected async applyContextualRanking(
    results: SearchResult[],
    context: UnifiedContext,
    options: ContextAwareSearchOptions
  ): Promise<SearchResult[]> {
    const contextWeight = options.contextWeight || 0.3;
    const contextFingerprint = await this.generateContextFingerprint(context);

    return results.map(result => {
      const memory = result.record as ContextEnhancedMemoryRecord;
      let contextSimilarity = 0;

      if (memory.contextFingerprint) {
        contextSimilarity = this.calculateFingerprintSimilarity(
          contextFingerprint,
          memory.contextFingerprint
        );
      }

      // Apply context weight to final score
      const finalScore = (result.score * (1 - contextWeight)) + (contextSimilarity * contextWeight);

      return {
        ...result,
        score: finalScore,
        contextScore: contextSimilarity,
      };
    }).sort((a, b) => b.score - a.score);
  }

  /**
   * Enrich search results with contextual information
   * @param results The search results to enrich
   * @param context The current context
   * @returns Enriched search results
   */
  protected async enrichResultsWithContext(
    results: SearchResult[],
    context: UnifiedContext
  ): Promise<SearchResult[]> {
    return results.map(result => {
      const memory = result.record as ContextEnhancedMemoryRecord;
      const enriched = { ...result };

      // Add contextual explanations
      if (memory.derivedInsights) {
        enriched.explanations = memory.derivedInsights;
      }

      // Add context-based highlights
      if (memory.unifiedContext && context.agent?.id === memory.unifiedContext.agent?.id) {
        enriched.highlights = [`Same agent context`];
      }

      return enriched;
    });
  }

  /**
   * Enhance search results with context-specific information
   * @param results The search results
   * @param context The unified context
   * @param searchQuery The search query
   * @returns Enhanced search results
   */
  protected async enhanceWithContext(
    results: SearchResult[],
    context: UnifiedContext,
    searchQuery: SearchQuery
  ): Promise<SearchResult[]> {
    const contextFingerprint = await this.generateContextFingerprint(context);

    return results.map(result => {
      const memory = result.record as ContextEnhancedMemoryRecord;
      let contextScore = 0;

      if (memory.contextFingerprint) {
        contextScore = this.calculateFingerprintSimilarity(
          contextFingerprint,
          memory.contextFingerprint
        );
      }

      // Enhance score with context similarity
      const enhancedScore = (result.score * 0.7) + (contextScore * 0.3);

      return {
        ...result,
        score: enhancedScore,
        contextScore,
        reason: contextScore > 0.5 ? 'High contextual similarity' : undefined,
      };
    });
  }

  /**
   * Calculate initial score for a memory based on search query
   * @param memory The memory record
   * @param searchQuery The search query
   * @returns Initial score
   */
  protected calculateInitialScore(memory: MemoryRecord, searchQuery: SearchQuery): number {
    let score = memory.importance || 0.5;

    // Time-based scoring
    if (searchQuery.timeRange) {
      const withinRange = this.isWithinTimeRange(memory.timestamp, searchQuery.timeRange);
      if (withinRange) score += 0.2;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Apply boost factors to search results
   * @param results The search results
   * @param boostFactors The boost factors to apply
   * @returns Boosted search results
   */
  protected applyBoostFactors(results: SearchResult[], boostFactors: BoostFactors): SearchResult[] {
    return results.map(result => {
      let boostedScore = result.score;

      // Recency boost
      if (boostFactors.recency) {
        const ageInDays = (Date.now() - result.record.timestamp.getTime()) / (1000 * 60 * 60 * 24);
        const recencyMultiplier = Math.exp(-ageInDays / 30) * boostFactors.recency;
        boostedScore += recencyMultiplier;
      }

      // Importance boost
      if (boostFactors.importance) {
        boostedScore += (result.record.importance || 0) * boostFactors.importance;
      }

      return {
        ...result,
        score: Math.min(boostedScore, 1.0),
      };
    });
  }

  /**
   * Check if a memory should be consolidated based on context
   * @param memory The memory to check
   * @param context The current context
   * @returns Whether the memory should be consolidated
   */
  protected async shouldConsolidateByContext(
    memory: ContextEnhancedMemoryRecord,
    context: UnifiedContext
  ): Promise<boolean> {
    // High context score indicates rich context worth consolidating
    if (memory.contextScore && memory.contextScore > 0.7) return true;

    // Similar context patterns indicate consolidation opportunity
    if (memory.contextFingerprint && context) {
      const currentFingerprint = await this.generateContextFingerprint(context);
      const similarity = this.calculateFingerprintSimilarity(
        currentFingerprint,
        memory.contextFingerprint
      );
      return similarity > 0.8;
    }

    return false;
  }

  /**
   * Determine target tier for memory based on context
   * @param memory The memory to consolidate
   * @param context The current context
   * @returns Target memory tier
   */
  protected determineTargetTier(
    memory: ContextEnhancedMemoryRecord,
    context: UnifiedContext
  ): MemoryTierType {
    // High importance goes to semantic memory
    if ((memory.importance || 0) > 0.8) return MemoryTierType.SEMANTIC;

    // Rich context goes to episodic memory
    if (memory.contextScore && memory.contextScore > 0.6) return MemoryTierType.EPISODIC;

    // Procedural memories based on content patterns
    if (memory.content.includes('how to') || memory.content.includes('step')) {
      return MemoryTierType.PROCEDURAL;
    }

    return MemoryTierType.EPISODIC;
  }

  /**
   * Group memories by context similarity
   * @param memories The memories to group
   * @param threshold Similarity threshold for grouping
   * @returns Groups of similar memories
   */
  protected async groupMemoriesByContext(
    memories: ContextEnhancedMemoryRecord[],
    threshold: number
  ): Promise<ContextEnhancedMemoryRecord[][]> {
    const groups: ContextEnhancedMemoryRecord[][] = [];
    const processed = new Set<string>();

    for (const memory of memories) {
      if (processed.has(memory.id) || !memory.contextFingerprint) continue;

      const group = [memory];
      processed.add(memory.id);

      // Find similar memories
      for (const other of memories) {
        if (processed.has(other.id) || !other.contextFingerprint) continue;

        const similarity = this.calculateFingerprintSimilarity(
          memory.contextFingerprint,
          other.contextFingerprint
        );

        if (similarity >= threshold) {
          group.push(other);
          processed.add(other.id);
        }
      }

      if (group.length > 1) {
        groups.push(group);
      }
    }

    return groups;
  }

  /**
   * Consolidate a group of contextually similar memories
   * @param agentId The ID of the agent
   * @param group The group of memories to consolidate
   */
  protected async consolidateMemoryGroup(
    agentId: string,
    group: ContextEnhancedMemoryRecord[]
  ): Promise<void> {
    // Create a consolidated memory
    const consolidated: ContextEnhancedMemoryRecord = {
      id: this.generateId(),
      agentId,
      type: MemoryType.EXPERIENCE,
      content: `Consolidated memory: ${group.map(m => m.content).join('; ')}`,
      metadata: {
        consolidated: true,
        originalIds: group.map(m => m.id),
        consolidatedAt: new Date().toISOString(),
      },
      importance: Math.max(...group.map(m => m.importance || 0)),
      timestamp: new Date(),
      tags: [...new Set(group.flatMap(m => m.tags || []))],
      duration: MemoryDuration.LONG_TERM,
      tier: MemoryTierType.EPISODIC,
      derivedInsights: [...new Set(group.flatMap(m => m.derivedInsights || []))],
    };

    // Store consolidated memory
    await this.store(agentId, consolidated);

    // Remove original memories
    for (const memory of group) {
      await this.delete(agentId, memory.id);
    }
  }

  /**
   * Simple hash function for fingerprinting
   * @param str The string to hash
   * @returns A simple hash
   */
  protected simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Calculate similarity between two fingerprints
   * @param fp1 First fingerprint
   * @param fp2 Second fingerprint
   * @returns Similarity score (0-1)
   */
  protected calculateFingerprintSimilarity(fp1: string, fp2: string): number {
    if (fp1 === fp2) return 1.0;
    
    // Simple character-based similarity
    const longer = fp1.length > fp2.length ? fp1 : fp2;
    const shorter = fp1.length > fp2.length ? fp2 : fp1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   * @param str1 First string
   * @param str2 Second string
   * @returns Edit distance
   */
  protected levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Check if a timestamp is within a time range
   * @param timestamp The timestamp to check
   * @param timeRange The time range
   * @returns Whether the timestamp is within range
   */
  protected isWithinTimeRange(timestamp: Date, timeRange: TimeRange): boolean {
    if (timeRange.start && timestamp < timeRange.start) return false;
    if (timeRange.end && timestamp > timeRange.end) return false;
    
    if (timeRange.relative) {
      const now = new Date();
      const units = {
        minutes: 60 * 1000,
        hours: 60 * 60 * 1000,
        days: 24 * 60 * 60 * 1000,
        weeks: 7 * 24 * 60 * 60 * 1000,
        months: 30 * 24 * 60 * 60 * 1000,
        years: 365 * 24 * 60 * 60 * 1000,
      };
      
      const unit = units[timeRange.relative.unit as keyof typeof units];
      const cutoff = new Date(now.getTime() - (timeRange.relative.value * unit));
      return timestamp >= cutoff;
    }
    
    return true;
  }

  /**
   * Health check for the memory provider
   * @returns Health check result
   */
  async healthCheck(): Promise<MemoryHealthCheckResult> {
    try {
      // Basic health check - subclasses can override
      return {
        status: 'healthy',
        details: {
          type: this.metadata.type,
          initialized: true,
          tiers: Array.from(this.tiers.keys()),
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }
}
