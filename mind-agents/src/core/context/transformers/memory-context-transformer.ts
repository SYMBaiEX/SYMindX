/**
 * Memory Context Transformer
 *
 * Transforms unified context into memory operation-specific format,
 * optimizing for storage, retrieval, and memory management operations.
 */

import {
  ContextTransformer,
  UnifiedContext,
  TransformationResult,
  TransformationTarget,
  TransformationStrategy,
  TransformationConfig,
  ValidationResult,
  ValidationConfig,
  TransformerCapabilities,
  TransformationMetadata,
  TransformationPerformance,
} from '../../../types/context/context-transformation.js';
import { MemoryRecord } from '../../../types/memory.js';
import { runtimeLogger } from '../../../utils/logger.js';

/**
 * Memory-specific context format
 */
export interface MemoryContext {
  // Core identification
  agentId: string;
  sessionId: string;
  contextId: string;
  timestamp: Date;

  // Memory operation context
  operationType:
    | 'store'
    | 'retrieve'
    | 'update'
    | 'delete'
    | 'search'
    | 'analyze';

  // Content for memory operations
  primaryContent: string;
  structuredContent: StructuredMemoryContent;
  contentMetadata: ContentMetadata;

  // Memory categorization
  memoryType:
    | 'episodic'
    | 'semantic'
    | 'procedural'
    | 'working'
    | 'autobiographical';
  importance: number; // 0-1
  persistence:
    | 'temporary'
    | 'session'
    | 'short_term'
    | 'long_term'
    | 'permanent';

  // Contextual relationships
  relatedMemories: MemoryRelation[];
  temporalContext: TemporalContext;
  spatialContext: SpatialContext;

  // Indexing and retrieval
  searchTags: string[];
  semanticVectors: number[];
  indexingHints: IndexingHint[];

  // Access patterns
  accessContext: AccessContext;
  privacyLevel: 'public' | 'private' | 'confidential' | 'restricted';

  // Memory processing
  compressionLevel: 'none' | 'light' | 'moderate' | 'aggressive';
  extractedEntities: ExtractedEntity[];
  keyPhrases: KeyPhrase[];

  // Quality metrics
  coherence: number; // 0-1
  completeness: number; // 0-1
  reliability: number; // 0-1

  // Storage optimization
  storageHints: StorageHint[];
  compressionRatio: number;
  estimatedSize: number;

  // Retrieval optimization
  retrievalContext: RetrievalContext;
  queryOptimization: QueryOptimization;
}

export interface StructuredMemoryContent {
  summary: string;
  keyFacts: Fact[];
  events: MemoryEvent[];
  relationships: Relationship[];
  emotions: EmotionalContext[];
  decisions: DecisionContext[];
}

export interface ContentMetadata {
  sourceType:
    | 'conversation'
    | 'observation'
    | 'learning'
    | 'inference'
    | 'external';
  confidence: number; // 0-1
  verificationStatus: 'unverified' | 'partial' | 'verified' | 'disputed';
  lastModified: Date;
  modificationHistory: ModificationRecord[];
  sourceCitation?: string;
}

export interface Fact {
  id: string;
  statement: string;
  confidence: number;
  source: string;
  timestamp: Date;
  category: string;
  verifiable: boolean;
}

export interface MemoryEvent {
  id: string;
  description: string;
  timestamp: Date;
  duration?: number;
  participants: string[];
  location?: string;
  significance: number; // 0-1
  outcome?: string;
}

export interface Relationship {
  id: string;
  type:
    | 'causal'
    | 'temporal'
    | 'spatial'
    | 'conceptual'
    | 'emotional'
    | 'functional';
  subject: string;
  predicate: string;
  object: string;
  strength: number; // 0-1
  bidirectional: boolean;
}

export interface EmotionalContext {
  emotion: string;
  intensity: number; // 0-1
  valence: number; // -1 to 1
  duration: number;
  trigger?: string;
  associated_memories: string[];
}

export interface DecisionContext {
  decision: string;
  alternatives: string[];
  criteria: string[];
  outcome: string;
  satisfaction: number; // 0-1
  learned_lessons: string[];
}

export interface MemoryRelation {
  relatedMemoryId: string;
  relationType:
    | 'prerequisite'
    | 'consequence'
    | 'similar'
    | 'contradictory'
    | 'supportive';
  strength: number; // 0-1
  explanation: string;
}

export interface TemporalContext {
  absoluteTime: Date;
  relativeTime: string; // e.g., "2 days ago", "last week"
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  season?: string;
  era?: string;
  sequencePosition?: number;
}

export interface SpatialContext {
  location?: string;
  coordinates?: { lat: number; lon: number };
  environment: string;
  scale: 'personal' | 'local' | 'regional' | 'global' | 'virtual';
  permanence: 'temporary' | 'stable' | 'permanent';
}

export interface IndexingHint {
  field: string;
  indexType: 'hash' | 'btree' | 'fulltext' | 'vector' | 'spatial';
  priority: number; // 0-1
  cardinality: 'low' | 'medium' | 'high';
}

export interface AccessContext {
  accessFrequency: 'rare' | 'occasional' | 'regular' | 'frequent';
  lastAccessed: Date;
  accessCount: number;
  accessPatterns: AccessPattern[];
  predictedNextAccess?: Date;
}

export interface AccessPattern {
  trigger: string;
  frequency: number;
  confidence: number;
  context: string[];
}

export interface ExtractedEntity {
  text: string;
  type:
    | 'person'
    | 'place'
    | 'organization'
    | 'event'
    | 'concept'
    | 'object'
    | 'time'
    | 'number';
  confidence: number;
  startPos: number;
  endPos: number;
  linkedData?: string;
}

export interface KeyPhrase {
  phrase: string;
  score: number;
  frequency: number;
  tfidf: number;
  category: string;
}

export interface StorageHint {
  hint: string;
  impact: 'performance' | 'space' | 'retrieval' | 'consistency';
  importance: number;
}

export interface RetrievalContext {
  queryTypes: string[];
  commonPatterns: string[];
  optimizationTargets: ('speed' | 'accuracy' | 'completeness')[];
  cacheability: number; // 0-1
}

export interface QueryOptimization {
  indexedFields: string[];
  filterHints: FilterHint[];
  sortingPreference: string[];
  aggregationHints: string[];
}

export interface FilterHint {
  field: string;
  operation: 'eq' | 'gt' | 'lt' | 'contains' | 'starts_with' | 'regex';
  selectivity: number; // 0-1
}

export interface ModificationRecord {
  timestamp: Date;
  changeType: 'create' | 'update' | 'merge' | 'split' | 'delete';
  changedFields: string[];
  reason: string;
  confidence: number;
}

/**
 * Memory Context Transformer implementation
 */
export class MemoryContextTransformer
  implements ContextTransformer<UnifiedContext, MemoryContext>
{
  readonly id = 'memory-context-transformer';
  readonly version = '1.0.0';
  readonly target = TransformationTarget.MEMORY;
  readonly supportedStrategies = [
    TransformationStrategy.FULL,
    TransformationStrategy.SELECTIVE,
    TransformationStrategy.OPTIMIZED,
    TransformationStrategy.CACHED,
  ];
  readonly reversible = true;

  private transformationCache = new Map<
    string,
    TransformationResult<MemoryContext>
  >();

  /**
   * Transform unified context to memory format
   */
  async transform(
    context: UnifiedContext,
    config?: TransformationConfig
  ): Promise<TransformationResult<MemoryContext>> {
    const startTime = performance.now();

    try {
      // Check cache first
      if (config?.cache?.enabled) {
        const cacheKey = this.generateCacheKey(context, config);
        const cached = this.transformationCache.get(cacheKey);
        if (cached) {
          runtimeLogger.debug(
            `Cache hit for memory transformation: ${cacheKey}`
          );
          return {
            ...cached,
            cached: true,
          };
        }
      }

      // Determine strategy
      const strategy = config?.strategy || TransformationStrategy.SELECTIVE;

      // Transform based on strategy
      const transformedContext = await this.performTransformation(
        context,
        strategy,
        config
      );

      // Calculate performance metrics
      const duration = performance.now() - startTime;
      const inputSize = JSON.stringify(context).length;
      const outputSize = JSON.stringify(transformedContext).length;

      const metadata: TransformationMetadata = {
        transformerId: this.id,
        transformerVersion: this.version,
        timestamp: new Date(),
        inputSize,
        outputSize,
        fieldsTransformed: this.getTransformedFields(strategy),
        fieldsDropped: this.getDroppedFields(strategy),
        fieldsAdded: this.getAddedFields(),
        validationPassed: true,
        cacheHit: false,
      };

      const performance: TransformationPerformance = {
        duration,
        memoryUsage: process.memoryUsage().heapUsed,
        cpuUsage: process.cpuUsage().user,
        cacheHitRate: 0,
        compressionRatio: inputSize / outputSize,
        throughput: outputSize / duration,
      };

      const result: TransformationResult<MemoryContext> = {
        success: true,
        transformedContext,
        originalContext: context,
        target: this.target,
        strategy,
        operation: 'transform' as any,
        metadata,
        performance,
        reversible: this.reversible,
        cached: false,
      };

      // Cache result if enabled
      if (config?.cache?.enabled) {
        const cacheKey = this.generateCacheKey(context, config);
        this.transformationCache.set(cacheKey, result);
      }

      runtimeLogger.debug(
        `Memory context transformation completed in ${duration.toFixed(2)}ms`
      );
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      runtimeLogger.error('Memory context transformation failed', {
        error,
        duration,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        transformedContext: {} as MemoryContext,
        originalContext: context,
        target: this.target,
        strategy: config?.strategy || TransformationStrategy.SELECTIVE,
        operation: 'transform' as any,
        metadata: {
          transformerId: this.id,
          transformerVersion: this.version,
          timestamp: new Date(),
          inputSize: 0,
          outputSize: 0,
          fieldsTransformed: [],
          fieldsDropped: [],
          fieldsAdded: [],
          validationPassed: false,
          cacheHit: false,
        },
        performance: {
          duration,
          memoryUsage: 0,
          cpuUsage: 0,
          cacheHitRate: 0,
          compressionRatio: 0,
          throughput: 0,
        },
        reversible: false,
        cached: false,
      };
    }
  }

  /**
   * Perform the actual transformation based on strategy
   */
  private async performTransformation(
    context: UnifiedContext,
    strategy: TransformationStrategy,
    config?: TransformationConfig
  ): Promise<MemoryContext> {
    const memoryData = context.memoryData;

    const baseContext: MemoryContext = {
      agentId: context.agentId,
      sessionId: context.sessionId,
      contextId: context.contextId,
      timestamp: context.timestamp,
      operationType: this.determineOperationType(context),
      primaryContent: this.extractPrimaryContent(context),
      structuredContent: this.structureContent(context),
      contentMetadata: this.buildContentMetadata(context),
      memoryType: this.determineMemoryType(context),
      importance: this.calculateImportance(context),
      persistence: this.determinePersistence(context),
      relatedMemories: this.extractRelatedMemories(context),
      temporalContext: this.buildTemporalContext(context),
      spatialContext: this.buildSpatialContext(context),
      searchTags: this.generateSearchTags(context),
      semanticVectors: this.generateSemanticVectors(context),
      indexingHints: this.generateIndexingHints(context),
      accessContext: this.buildAccessContext(context),
      privacyLevel: this.determinePrivacyLevel(context),
      compressionLevel: this.determineCompressionLevel(context),
      extractedEntities: this.extractEntities(context),
      keyPhrases: this.extractKeyPhrases(context),
      coherence: this.calculateCoherence(context),
      completeness: this.calculateCompleteness(context),
      reliability: this.calculateReliability(context),
      storageHints: this.generateStorageHints(context),
      compressionRatio: this.calculateCompressionRatio(context),
      estimatedSize: this.estimateSize(context),
      retrievalContext: this.buildRetrievalContext(context),
      queryOptimization: this.buildQueryOptimization(context),
    };

    // Apply strategy-specific optimizations
    switch (strategy) {
      case TransformationStrategy.MINIMAL:
        return this.applyMinimalStrategy(baseContext);
      case TransformationStrategy.OPTIMIZED:
        return this.applyOptimizedStrategy(baseContext);
      case TransformationStrategy.FULL:
        return this.applyFullStrategy(baseContext, context);
      default:
        return baseContext;
    }
  }

  /**
   * Determine the type of memory operation
   */
  private determineOperationType(
    context: UnifiedContext
  ): 'store' | 'retrieve' | 'update' | 'delete' | 'search' | 'analyze' {
    // Analyze context to determine intended memory operation
    if (context.memoryData?.memoryQueries?.length) {
      return 'retrieve';
    }

    if (context.messages.length > 0) {
      const lastMessage = context.messages[context.messages.length - 1];
      const content = lastMessage.content.toLowerCase();

      if (content.includes('remember') || content.includes('save')) {
        return 'store';
      }
      if (content.includes('recall') || content.includes('find')) {
        return 'retrieve';
      }
      if (content.includes('update') || content.includes('change')) {
        return 'update';
      }
      if (content.includes('forget') || content.includes('delete')) {
        return 'delete';
      }
      if (content.includes('search') || content.includes('look for')) {
        return 'search';
      }
    }

    // Default to store for new content
    return 'store';
  }

  /**
   * Extract primary content for memory storage
   */
  private extractPrimaryContent(context: UnifiedContext): string {
    if (context.messages.length > 0) {
      // Create a narrative from recent messages
      const recentMessages = context.messages.slice(-5);
      return recentMessages.map((m) => `${m.from}: ${m.content}`).join('\n');
    }
    return context.content;
  }

  /**
   * Structure content for memory storage
   */
  private structureContent(context: UnifiedContext): StructuredMemoryContent {
    const content = this.extractPrimaryContent(context);

    return {
      summary: this.generateSummary(content),
      keyFacts: this.extractFacts(context),
      events: this.extractEvents(context),
      relationships: this.extractRelationships(context),
      emotions: this.extractEmotionalContext(context),
      decisions: this.extractDecisionContext(context),
    };
  }

  /**
   * Generate content summary
   */
  private generateSummary(content: string): string {
    // Simple extractive summarization
    const sentences = content
      .split(/[.!?]+/)
      .filter((s) => s.trim().length > 10);
    if (sentences.length <= 2) return content;

    // Return first and last sentence as a basic summary
    return `${sentences[0].trim()}. ${sentences[sentences.length - 1].trim()}.`;
  }

  /**
   * Extract facts from context
   */
  private extractFacts(context: UnifiedContext): Fact[] {
    const facts: Fact[] = [];
    const content = this.extractPrimaryContent(context);

    // Simple fact extraction based on declarative sentences
    const sentences = content.split(/[.!?]+/);
    sentences.forEach((sentence, index) => {
      sentence = sentence.trim();
      if (sentence.length > 10 && this.isFactualStatement(sentence)) {
        facts.push({
          id: `fact_${index}`,
          statement: sentence,
          confidence: 0.7,
          source: context.agentId,
          timestamp: context.timestamp,
          category: 'general',
          verifiable: this.isVerifiable(sentence),
        });
      }
    });

    return facts;
  }

  /**
   * Check if statement is factual
   */
  private isFactualStatement(sentence: string): boolean {
    const lower = sentence.toLowerCase();
    const factualIndicators = [
      'is',
      'are',
      'was',
      'were',
      'has',
      'have',
      'can',
      'will',
    ];
    const opinionIndicators = [
      'think',
      'believe',
      'feel',
      'maybe',
      'perhaps',
      'might',
    ];

    const hasFactual = factualIndicators.some((indicator) =>
      lower.includes(indicator)
    );
    const hasOpinion = opinionIndicators.some((indicator) =>
      lower.includes(indicator)
    );

    return hasFactual && !hasOpinion;
  }

  /**
   * Check if statement is verifiable
   */
  private isVerifiable(sentence: string): boolean {
    const lower = sentence.toLowerCase();
    const verifiablePatterns = [
      /\d{4}/, // Years
      /at \d/, // Times
      /in [A-Z][a-z]+/, // Places
      /[A-Z][a-z]+ (said|announced|declared)/, // Quotes
    ];

    return verifiablePatterns.some((pattern) => pattern.test(lower));
  }

  /**
   * Extract events from context
   */
  private extractEvents(context: UnifiedContext): MemoryEvent[] {
    const events: MemoryEvent[] = [];

    context.messages.forEach((message, index) => {
      if (this.isEventDescription(message.content)) {
        events.push({
          id: `event_${index}`,
          description: message.content,
          timestamp: message.timestamp,
          participants: [message.from],
          significance: this.calculateEventSignificance(message.content),
        });
      }
    });

    return events;
  }

  /**
   * Check if content describes an event
   */
  private isEventDescription(content: string): boolean {
    const eventWords = [
      'happened',
      'occurred',
      'did',
      'went',
      'came',
      'started',
      'finished',
      'completed',
    ];
    const lower = content.toLowerCase();
    return eventWords.some((word) => lower.includes(word));
  }

  /**
   * Calculate event significance
   */
  private calculateEventSignificance(content: string): number {
    let significance = 0.5;

    const importantWords = [
      'important',
      'critical',
      'major',
      'significant',
      'breakthrough',
    ];
    const emotionalWords = [
      'amazing',
      'terrible',
      'wonderful',
      'awful',
      'excited',
      'disappointed',
    ];

    const lower = content.toLowerCase();
    if (importantWords.some((word) => lower.includes(word)))
      significance += 0.3;
    if (emotionalWords.some((word) => lower.includes(word)))
      significance += 0.2;

    return Math.min(significance, 1.0);
  }

  /**
   * Additional extraction methods
   */
  private extractRelationships(context: UnifiedContext): Relationship[] {
    // Implementation would extract relationships between entities
    return [];
  }

  private extractEmotionalContext(context: UnifiedContext): EmotionalContext[] {
    const emotionData = context.emotionData;
    if (!emotionData?.currentEmotions) return [];

    return emotionData.currentEmotions.map((emotion) => ({
      emotion: emotion.emotion,
      intensity: emotion.intensity,
      valence: this.getEmotionValence(emotion.emotion),
      duration: emotion.duration,
      trigger: emotion.trigger,
      associated_memories: [],
    }));
  }

  private getEmotionValence(emotion: string): number {
    const positiveEmotions = ['happy', 'excited', 'proud', 'confident'];
    const negativeEmotions = ['sad', 'angry', 'anxious', 'confused'];

    if (positiveEmotions.includes(emotion)) return 0.7;
    if (negativeEmotions.includes(emotion)) return -0.7;
    return 0;
  }

  private extractDecisionContext(context: UnifiedContext): DecisionContext[] {
    const cognitionData = context.cognitionData;
    if (!cognitionData?.decisions) return [];

    return cognitionData.decisions.map((decision) => ({
      decision: decision.description,
      alternatives: decision.options,
      criteria: [],
      outcome: decision.selected || 'pending',
      satisfaction: decision.confidence,
      learned_lessons: [],
    }));
  }

  private buildContentMetadata(context: UnifiedContext): ContentMetadata {
    return {
      sourceType: this.determineSourceType(context),
      confidence: context.state.confidence,
      verificationStatus: 'unverified',
      lastModified: context.timestamp,
      modificationHistory: [],
      sourceCitation: `Agent ${context.agentId} session ${context.sessionId}`,
    };
  }

  private determineSourceType(
    context: UnifiedContext
  ): 'conversation' | 'observation' | 'learning' | 'inference' | 'external' {
    if (context.messages.length > 0) return 'conversation';
    if (context.cognitionData?.reasoningChain?.length) return 'inference';
    return 'observation';
  }

  private determineMemoryType(
    context: UnifiedContext
  ): 'episodic' | 'semantic' | 'procedural' | 'working' | 'autobiographical' {
    const hasEvents = context.messages.some((m) =>
      this.isEventDescription(m.content)
    );
    const hasFactual = context.messages.some((m) =>
      this.isFactualStatement(m.content)
    );

    if (hasEvents) return 'episodic';
    if (hasFactual) return 'semantic';
    return 'working';
  }

  private calculateImportance(context: UnifiedContext): number {
    let importance = 0.5;

    // Factor in emotion intensity
    if (context.emotionData?.currentEmotions?.length) {
      const avgIntensity =
        context.emotionData.currentEmotions.reduce(
          (sum, e) => sum + e.intensity,
          0
        ) / context.emotionData.currentEmotions.length;
      importance += avgIntensity * 0.3;
    }

    // Factor in complexity
    importance += context.state.complexity * 0.2;

    // Factor in user engagement
    importance += context.state.engagement * 0.3;

    return Math.min(importance, 1.0);
  }

  private determinePersistence(
    context: UnifiedContext
  ): 'temporary' | 'session' | 'short_term' | 'long_term' | 'permanent' {
    const importance = this.calculateImportance(context);

    if (importance > 0.8) return 'long_term';
    if (importance > 0.6) return 'short_term';
    if (context.messages.length > 5) return 'session';
    return 'temporary';
  }

  // Continue with remaining helper methods...
  private extractRelatedMemories(context: UnifiedContext): MemoryRelation[] {
    const memoryData = context.memoryData;
    if (!memoryData?.relevantMemories) return [];

    return memoryData.relevantMemories.map((mem) => ({
      relatedMemoryId: mem.id,
      relationType: 'similar' as const,
      strength: mem.relevance,
      explanation: `Related memory from ${mem.type} context`,
    }));
  }

  private buildTemporalContext(context: UnifiedContext): TemporalContext {
    const now = new Date();
    const timeOfDay = this.getTimeOfDay(now);

    return {
      absoluteTime: context.timestamp,
      relativeTime: this.getRelativeTime(context.timestamp, now),
      timeOfDay,
      sequencePosition: context.version,
    };
  }

  private getTimeOfDay(
    date: Date
  ): 'morning' | 'afternoon' | 'evening' | 'night' {
    const hour = date.getHours();
    if (hour < 6) return 'night';
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    if (hour < 22) return 'evening';
    return 'night';
  }

  private getRelativeTime(past: Date, now: Date): string {
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${diffDays} days ago`;
  }

  private buildSpatialContext(context: UnifiedContext): SpatialContext {
    return {
      location: context.environment.location,
      environment: context.environment.platform || 'digital',
      scale: 'personal' as const,
      permanence: 'stable' as const,
    };
  }

  private generateSearchTags(context: UnifiedContext): string[] {
    const tags = new Set<string>();

    // Add agent ID
    tags.add(`agent:${context.agentId}`);

    // Add session ID
    tags.add(`session:${context.sessionId}`);

    // Add memory type
    tags.add(`type:${this.determineMemoryType(context)}`);

    // Add time-based tags
    const date = context.timestamp;
    tags.add(`year:${date.getFullYear()}`);
    tags.add(`month:${date.getMonth() + 1}`);
    tags.add(`day:${date.getDate()}`);

    // Add emotion tags
    if (context.emotionData?.currentEmotions) {
      context.emotionData.currentEmotions.forEach((emotion) => {
        tags.add(`emotion:${emotion.emotion}`);
      });
    }

    // Add content-based tags
    const content = this.extractPrimaryContent(context).toLowerCase();
    const words = content.split(/\s+/).filter((w) => w.length > 3);
    words.slice(0, 10).forEach((word) => tags.add(`content:${word}`));

    return Array.from(tags);
  }

  private generateSemanticVectors(context: UnifiedContext): number[] {
    // Simplified semantic vector generation
    // In production, this would use actual embedding models
    const content = this.extractPrimaryContent(context);
    const hash = this.simpleHash(content);
    const vector: number[] = [];

    for (let i = 0; i < 64; i++) {
      vector.push((hash >> i) & 1 ? 1 : -1);
    }

    return vector;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }

  private generateIndexingHints(context: UnifiedContext): IndexingHint[] {
    return [
      {
        field: 'agentId',
        indexType: 'hash',
        priority: 1.0,
        cardinality: 'low',
      },
      {
        field: 'timestamp',
        indexType: 'btree',
        priority: 0.9,
        cardinality: 'high',
      },
      {
        field: 'searchTags',
        indexType: 'fulltext',
        priority: 0.8,
        cardinality: 'high',
      },
      {
        field: 'semanticVectors',
        indexType: 'vector',
        priority: 0.7,
        cardinality: 'high',
      },
    ];
  }

  private buildAccessContext(context: UnifiedContext): AccessContext {
    return {
      accessFrequency: 'regular',
      lastAccessed: context.timestamp,
      accessCount: 1,
      accessPatterns: [],
    };
  }

  private determinePrivacyLevel(
    context: UnifiedContext
  ): 'public' | 'private' | 'confidential' | 'restricted' {
    // Check for sensitive content indicators
    const content = this.extractPrimaryContent(context).toLowerCase();
    const sensitiveWords = [
      'password',
      'secret',
      'private',
      'confidential',
      'personal',
    ];

    if (sensitiveWords.some((word) => content.includes(word))) {
      return 'confidential';
    }

    return 'private'; // Default for agent memories
  }

  private determineCompressionLevel(
    context: UnifiedContext
  ): 'none' | 'light' | 'moderate' | 'aggressive' {
    const contentSize = this.extractPrimaryContent(context).length;

    if (contentSize > 5000) return 'aggressive';
    if (contentSize > 2000) return 'moderate';
    if (contentSize > 500) return 'light';
    return 'none';
  }

  private extractEntities(context: UnifiedContext): ExtractedEntity[] {
    const content = this.extractPrimaryContent(context);
    const entities: ExtractedEntity[] = [];

    // Simple entity extraction (would use NLP in production)
    const personPattern = /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g;
    let match;

    while ((match = personPattern.exec(content)) !== null) {
      entities.push({
        text: match[0],
        type: 'person',
        confidence: 0.7,
        startPos: match.index,
        endPos: match.index + match[0].length,
      });
    }

    return entities;
  }

  private extractKeyPhrases(context: UnifiedContext): KeyPhrase[] {
    const content = this.extractPrimaryContent(context);
    const words = content.toLowerCase().split(/\s+/);
    const wordCounts = new Map<string, number>();

    // Count word frequencies
    words.forEach((word) => {
      if (word.length > 3) {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      }
    });

    // Convert to key phrases
    const phrases: KeyPhrase[] = [];
    wordCounts.forEach((count, word) => {
      if (count > 1) {
        phrases.push({
          phrase: word,
          score: count / words.length,
          frequency: count,
          tfidf: count, // Simplified TF-IDF
          category: 'general',
        });
      }
    });

    return phrases.sort((a, b) => b.score - a.score).slice(0, 10);
  }

  private calculateCoherence(context: UnifiedContext): number {
    // Simple coherence calculation based on message flow
    if (context.messages.length < 2) return 1.0;

    let coherenceScore = 0;
    for (let i = 1; i < context.messages.length; i++) {
      const prev = context.messages[i - 1].content.toLowerCase();
      const curr = context.messages[i].content.toLowerCase();

      // Check for shared words (simple coherence measure)
      const prevWords = new Set(prev.split(/\s+/));
      const currWords = new Set(curr.split(/\s+/));
      const intersection = new Set(
        [...prevWords].filter((x) => currWords.has(x))
      );
      const union = new Set([...prevWords, ...currWords]);

      coherenceScore += intersection.size / union.size;
    }

    return coherenceScore / (context.messages.length - 1);
  }

  private calculateCompleteness(context: UnifiedContext): number {
    let completeness = 0.5; // Base completeness

    // Factor in structured content presence
    if (context.messages.length > 0) completeness += 0.2;
    if (context.emotionData?.currentEmotions?.length) completeness += 0.1;
    if (context.cognitionData?.thoughts?.length) completeness += 0.1;
    if (context.environment.location) completeness += 0.1;

    return Math.min(completeness, 1.0);
  }

  private calculateReliability(context: UnifiedContext): number {
    // Base reliability on source and confidence
    let reliability = context.state.confidence;

    // Adjust based on source type
    const sourceType = this.determineSourceType(context);
    switch (sourceType) {
      case 'conversation':
        reliability *= 0.9;
        break;
      case 'inference':
        reliability *= 0.7;
        break;
      case 'observation':
      default:
        reliability *= 0.8;
        break;
    }

    return reliability;
  }

  private generateStorageHints(context: UnifiedContext): StorageHint[] {
    const hints: StorageHint[] = [];

    const contentSize = this.extractPrimaryContent(context).length;
    if (contentSize > 1000) {
      hints.push({
        hint: 'Large content - consider compression',
        impact: 'space',
        importance: 0.8,
      });
    }

    if (context.emotionData?.currentEmotions?.length) {
      hints.push({
        hint: 'Emotional content - index for sentiment retrieval',
        impact: 'retrieval',
        importance: 0.7,
      });
    }

    return hints;
  }

  private calculateCompressionRatio(context: UnifiedContext): number {
    const originalSize = JSON.stringify(context).length;
    const compressedSize = this.extractPrimaryContent(context).length;
    return originalSize > 0 ? compressedSize / originalSize : 1.0;
  }

  private estimateSize(context: UnifiedContext): number {
    return JSON.stringify(context).length;
  }

  private buildRetrievalContext(context: UnifiedContext): RetrievalContext {
    return {
      queryTypes: ['semantic', 'temporal', 'emotional'],
      commonPatterns: ['recent memories', 'similar emotions', 'related topics'],
      optimizationTargets: ['speed', 'accuracy'],
      cacheability: 0.8,
    };
  }

  private buildQueryOptimization(context: UnifiedContext): QueryOptimization {
    return {
      indexedFields: ['agentId', 'timestamp', 'searchTags', 'memoryType'],
      filterHints: [
        {
          field: 'agentId',
          operation: 'eq',
          selectivity: 0.1,
        },
        {
          field: 'timestamp',
          operation: 'gt',
          selectivity: 0.3,
        },
      ],
      sortingPreference: ['timestamp', 'importance'],
      aggregationHints: ['count', 'avg'],
    };
  }

  /**
   * Apply transformation strategies
   */
  private applyMinimalStrategy(context: MemoryContext): MemoryContext {
    return {
      ...context,
      structuredContent: {
        ...context.structuredContent,
        keyFacts: context.structuredContent.keyFacts.slice(0, 3),
        events: context.structuredContent.events.slice(0, 2),
        relationships: context.structuredContent.relationships.slice(0, 2),
      },
      searchTags: context.searchTags.slice(0, 10),
      semanticVectors: context.semanticVectors.slice(0, 32),
      extractedEntities: context.extractedEntities.slice(0, 5),
      keyPhrases: context.keyPhrases.slice(0, 5),
    };
  }

  private applyOptimizedStrategy(context: MemoryContext): MemoryContext {
    return {
      ...context,
      compressionLevel: 'moderate',
      structuredContent: {
        ...context.structuredContent,
        keyFacts: context.structuredContent.keyFacts
          .filter((f) => f.confidence > 0.6)
          .slice(0, 5),
        events: context.structuredContent.events
          .filter((e) => e.significance > 0.5)
          .slice(0, 3),
      },
      extractedEntities: context.extractedEntities
        .filter((e) => e.confidence > 0.6)
        .slice(0, 10),
      keyPhrases: context.keyPhrases.filter((p) => p.score > 0.1).slice(0, 8),
    };
  }

  private applyFullStrategy(
    context: MemoryContext,
    original: UnifiedContext
  ): MemoryContext {
    // Include all available data
    return context;
  }

  /**
   * Validation implementation
   */
  async validate(
    context: MemoryContext,
    config?: ValidationConfig
  ): Promise<ValidationResult> {
    const errors: any[] = [];
    const warnings: any[] = [];

    // Validate required fields
    if (!context.agentId) {
      errors.push({
        field: 'agentId',
        message: 'Agent ID is required',
        severity: 'critical',
        code: 'MISSING_AGENT_ID',
      });
    }

    if (!context.primaryContent) {
      errors.push({
        field: 'primaryContent',
        message: 'Primary content is required',
        severity: 'high',
        code: 'MISSING_CONTENT',
      });
    }

    // Validate ranges
    if (context.importance < 0 || context.importance > 1) {
      errors.push({
        field: 'importance',
        message: 'Importance must be between 0 and 1',
        severity: 'medium',
        code: 'INVALID_IMPORTANCE',
      });
    }

    // Validate semantic vectors
    if (context.semanticVectors.length === 0) {
      warnings.push({
        field: 'semanticVectors',
        message: 'Semantic vectors recommended for better retrieval',
        code: 'MISSING_VECTORS',
      });
    }

    const score =
      errors.length === 0 ? (warnings.length === 0 ? 1.0 : 0.8) : 0.5;

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      score,
      timestamp: new Date(),
    };
  }

  /**
   * Get transformer capabilities
   */
  getCapabilities(): TransformerCapabilities {
    return {
      target: this.target,
      strategies: this.supportedStrategies,
      reversible: this.reversible,
      cacheable: true,
      streamable: false,
      batchable: true,
      maxInputSize: 100 * 1024 * 1024, // 100MB
      minInputSize: 50, // 50 bytes
      supportedFormats: ['json'],
      dependencies: ['memory-provider'],
      performance: {
        averageDuration: 25, // ms
        memoryUsage: 5 * 1024 * 1024, // 5MB
        throughput: 500, // contexts per second
      },
    };
  }

  /**
   * Helper methods
   */
  private generateCacheKey(
    context: UnifiedContext,
    config?: TransformationConfig
  ): string {
    const keyData = {
      contextId: context.contextId,
      version: context.version,
      strategy: config?.strategy,
      contentHash: this.simpleHash(context.content),
      timestamp: Math.floor(context.timestamp.getTime() / 300000), // 5-minute precision
    };
    return `memory_${JSON.stringify(keyData)}`;
  }

  private getTransformedFields(strategy: TransformationStrategy): string[] {
    const baseFields = [
      'agentId',
      'primaryContent',
      'structuredContent',
      'memoryType',
      'importance',
      'searchTags',
      'semanticVectors',
    ];

    switch (strategy) {
      case TransformationStrategy.MINIMAL:
        return baseFields.slice(0, 5);
      case TransformationStrategy.FULL:
        return [
          ...baseFields,
          'extractedEntities',
          'keyPhrases',
          'storageHints',
          'queryOptimization',
        ];
      default:
        return baseFields;
    }
  }

  private getDroppedFields(strategy: TransformationStrategy): string[] {
    switch (strategy) {
      case TransformationStrategy.MINIMAL:
        return [
          'extractedEntities',
          'keyPhrases',
          'storageHints',
          'queryOptimization',
        ];
      default:
        return [];
    }
  }

  private getAddedFields(): string[] {
    return [
      'structuredContent',
      'contentMetadata',
      'searchTags',
      'semanticVectors',
      'indexingHints',
      'extractedEntities',
      'keyPhrases',
      'storageHints',
      'queryOptimization',
    ];
  }
}

/**
 * Factory function for creating memory context transformer
 */
export function createMemoryContextTransformer(): MemoryContextTransformer {
  return new MemoryContextTransformer();
}
