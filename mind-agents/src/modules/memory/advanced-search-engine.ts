/**
 * Advanced Memory Search Engine for SYMindX
 *
 * Implements sophisticated search algorithms including semantic search,
 * hybrid search, query expansion, and relational queries.
 */

import { MemoryRecord } from '../../types/agent';
import {
  SearchQuery,
  SearchResult,
  SearchQueryType,
  TimeRange,
  MemoryRelationship,
} from '../../types/memory';
import { runtimeLogger } from '../../utils/logger';

/**
 * Concept extraction service interface
 */
export interface ConceptExtractor {
  extractConcepts(text: string): Promise<string[]>;
  expandConcepts(concepts: string[]): Promise<string[]>;
  getConceptSimilarity(concept1: string, concept2: string): Promise<number>;
}

/**
 * Embedding service interface
 */
export interface EmbeddingService {
  generateEmbedding(text: string): Promise<number[]>;
  calculateSimilarity(embedding1: number[], embedding2: number[]): number;
}

/**
 * Advanced search engine for memory queries
 */
export class AdvancedSearchEngine {
  private conceptExtractor?: ConceptExtractor;
  private embeddingService?: EmbeddingService;
  private queryCache: Map<string, SearchResult[]> = new Map();
  private conceptCache: Map<string, string[]> = new Map();

  constructor(
    conceptExtractor?: ConceptExtractor,
    embeddingService?: EmbeddingService
  ) {
    if (conceptExtractor !== undefined) {
      this.conceptExtractor = conceptExtractor;
    }
    if (embeddingService !== undefined) {
      this.embeddingService = embeddingService;
    }
  }

  /**
   * Execute advanced search query
   */
  async search(
    query: SearchQuery,
    memories: MemoryRecord[],
    relationships?: MemoryRelationship[]
  ): Promise<SearchResult[]> {
    const startTime = Date.now();

    try {
      // Check cache first
      const cacheKey = this.getCacheKey(query);
      if (this.queryCache.has(cacheKey)) {
        runtimeLogger.debug(`Cache hit for query: ${query.query}`);
        return this.queryCache.get(cacheKey)!;
      }

      // Filter memories by time range if specified
      let filteredMemories = memories;
      if (query.timeRange) {
        filteredMemories = this.filterByTimeRange(memories, query.timeRange);
      }

      // Apply additional filters
      if (query.filters) {
        filteredMemories = this.applyFilters(filteredMemories, query.filters);
      }

      let results: SearchResult[] = [];

      // Execute search based on query type
      switch (query.type) {
        case SearchQueryType.SEMANTIC:
          results = await this.semanticSearch(query, filteredMemories);
          break;
        case SearchQueryType.KEYWORD:
          results = await this.keywordSearch(query, filteredMemories);
          break;
        case SearchQueryType.HYBRID:
          results = await this.hybridSearch(query, filteredMemories);
          break;
        case SearchQueryType.RELATIONAL:
          results = await this.relationalSearch(
            query,
            filteredMemories,
            relationships
          );
          break;
        case SearchQueryType.TEMPORAL:
          results = await this.temporalSearch(query, filteredMemories);
          break;
        case SearchQueryType.CONCEPTUAL:
          results = await this.conceptualSearch(query, filteredMemories);
          break;
        case SearchQueryType.MULTI_MODAL:
          results = await this.multiModalSearch(
            query,
            filteredMemories,
            relationships
          );
          break;
        default:
          throw new Error(`Unsupported search type: ${query.type}`);
      }

      // Apply threshold filtering
      if (query.threshold) {
        results = results.filter((result) => result.score >= query.threshold!);
      }

      // Sort by score (descending)
      results.sort((a, b) => b.score - a.score);

      // Apply pagination
      const limit = query.limit || 10;
      const offset = query.offset || 0;
      results = results.slice(offset, offset + limit);

      // Cache results
      this.queryCache.set(cacheKey, results);

      const duration = Date.now() - startTime;
      runtimeLogger.debug(
        `Search completed in ${duration}ms, found ${results.length} results`
      );

      return results;
    } catch (error) {
      runtimeLogger.error('Search failed:', error);
      throw error;
    }
  }

  /**
   * Semantic search using vector embeddings
   */
  private async semanticSearch(
    query: SearchQuery,
    memories: MemoryRecord[]
  ): Promise<SearchResult[]> {
    if (!this.embeddingService) {
      throw new Error('Embedding service not available for semantic search');
    }

    let queryEmbedding = query.embedding;
    if (!queryEmbedding) {
      queryEmbedding = await this.embeddingService.generateEmbedding(
        query.query
      );
    }

    const results: SearchResult[] = [];

    for (const memory of memories) {
      if (!memory.embedding) {
        // Generate embedding if not available
        memory.embedding = await this.embeddingService.generateEmbedding(
          memory.content
        );
      }

      const similarity = this.embeddingService.calculateSimilarity(
        queryEmbedding,
        memory.embedding
      );

      if (similarity > 0) {
        results.push({
          record: memory,
          memory, // Backward compatibility
          score: similarity,
          semanticScore: similarity,
          explanations: [`Semantic similarity: ${similarity.toFixed(3)}`],
        });
      }
    }

    return results;
  }

  /**
   * Keyword search using full-text matching
   */
  private async keywordSearch(
    query: SearchQuery,
    memories: MemoryRecord[]
  ): Promise<SearchResult[]> {
    const queryTerms = this.tokenize(query.query.toLowerCase());
    const results: SearchResult[] = [];

    for (const memory of memories) {
      const content = memory.content.toLowerCase();
      const tags = memory.tags.map((tag) => tag.toLowerCase());

      let score = 0;
      const matchedTerms: string[] = [];
      const highlights: string[] = [];

      // Score based on content matches
      for (const term of queryTerms) {
        if (content.includes(term)) {
          score += 1;
          matchedTerms.push(term);
          highlights.push(this.extractHighlight(memory.content, term));
        }
      }

      // Score based on tag matches
      for (const term of queryTerms) {
        for (const tag of tags) {
          if (tag.includes(term)) {
            score += 0.5;
            matchedTerms.push(term);
          }
        }
      }

      // Normalize score
      if (queryTerms.length > 0) {
        score = score / queryTerms.length;
      }

      if (score > 0) {
        results.push({
          record: memory,
          memory, // Backward compatibility
          score,
          keywordScore: score,
          explanations: [`Keyword matches: ${matchedTerms.join(', ')}`],
          highlights: highlights.filter((h) => h.length > 0),
        });
      }
    }

    return results;
  }

  /**
   * Hybrid search combining semantic and keyword search
   */
  private async hybridSearch(
    query: SearchQuery,
    memories: MemoryRecord[]
  ): Promise<SearchResult[]> {
    const semanticResults = await this.semanticSearch(query, memories);
    const keywordResults = await this.keywordSearch(query, memories);

    // Combine results
    const resultMap = new Map<string, SearchResult>();

    // Default boost factors
    const boostFactors = {
      semantic: 0.7,
      keyword: 0.3,
      importance: 0.1,
      recency: 0.1,
      ...query.boostFactors,
    };

    // Add semantic results
    for (const result of semanticResults) {
      resultMap.set(result.record.id, {
        ...result,
        score: result.score * boostFactors.semantic!,
      });
    }

    // Combine with keyword results
    for (const keywordResult of keywordResults) {
      const existing = resultMap.get(keywordResult.record.id);
      if (existing) {
        // Combine scores
        existing.score += keywordResult.score * boostFactors.keyword!;
        existing.keywordScore = keywordResult.score;
        existing.explanations = [
          ...(existing.explanations || []),
          ...(keywordResult.explanations || []),
        ];
        existing.highlights = [
          ...(existing.highlights || []),
          ...(keywordResult.highlights || []),
        ];
      } else {
        resultMap.set(keywordResult.record.id, {
          ...keywordResult,
          score: keywordResult.score * boostFactors.keyword!,
        });
      }
    }

    // Apply additional boost factors
    const results = Array.from(resultMap.values());
    for (const result of results) {
      // Importance boost
      if (boostFactors.importance) {
        result.score += result.record.importance * boostFactors.importance;
      }

      // Recency boost
      if (boostFactors.recency) {
        const age = Date.now() - result.record.timestamp.getTime();
        const daysSinceCreated = age / (1000 * 60 * 60 * 24);
        const recencyScore = Math.max(0, 1 - daysSinceCreated / 30); // Decay over 30 days
        result.score += recencyScore * boostFactors.recency;
      }
    }

    return results;
  }

  /**
   * Relational search using memory relationships
   */
  private async relationalSearch(
    query: SearchQuery,
    memories: MemoryRecord[],
    relationships?: MemoryRelationship[]
  ): Promise<SearchResult[]> {
    if (!relationships || relationships.length === 0) {
      // Fall back to semantic search if no relationships
      return this.semanticSearch(query, memories);
    }

    // First, find direct matches
    const directMatches = await this.keywordSearch(query, memories);
    const results: SearchResult[] = [];

    // Add direct matches
    for (const match of directMatches) {
      results.push({
        ...match,
        relationshipPaths: ['direct'],
      });
    }

    // Find related memories through relationships
    const relationshipMap = new Map<string, MemoryRelationship[]>();
    for (const rel of relationships) {
      if (!relationshipMap.has(rel.sourceId)) {
        relationshipMap.set(rel.sourceId, []);
      }
      relationshipMap.get(rel.sourceId)!.push(rel);
    }

    const depth = query.conceptualDepth || 2;
    const visited = new Set<string>();

    for (const match of directMatches) {
      this.traverseRelationships(
        match.record.id,
        relationshipMap,
        memories,
        results,
        visited,
        depth,
        match.score,
        [`${match.record.id} (direct)`]
      );
    }

    return results;
  }

  /**
   * Temporal search focusing on time-based patterns
   */
  private async temporalSearch(
    query: SearchQuery,
    memories: MemoryRecord[]
  ): Promise<SearchResult[]> {
    const results: SearchResult[] = [];

    // Sort memories by timestamp
    const sortedMemories = [...memories].sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );

    // Find temporal patterns
    for (let i = 0; i < sortedMemories.length; i++) {
      const memory = sortedMemories[i];
      if (!memory) continue;

      let score = 0;
      const explanations: string[] = [];

      // Score based on recency
      const age = Date.now() - memory.timestamp.getTime();
      const daysSinceCreated = age / (1000 * 60 * 60 * 24);
      const recencyScore = Math.max(0, 1 - daysSinceCreated / 30);
      score += recencyScore * 0.5;

      // Score based on content relevance
      if (memory.content.toLowerCase().includes(query.query.toLowerCase())) {
        score += 0.5;
        explanations.push('Content match');
      }

      // Score based on temporal clustering
      const temporalClusterScore = this.calculateTemporalClusterScore(
        memory,
        sortedMemories,
        i
      );
      score += temporalClusterScore * 0.3;

      if (score > 0) {
        results.push({
          record: memory,
          memory, // Backward compatibility
          score,
          explanations: [
            ...explanations,
            `Recency: ${recencyScore.toFixed(3)}`,
            `Temporal clustering: ${temporalClusterScore.toFixed(3)}`,
          ],
        });
      }
    }

    return results;
  }

  /**
   * Conceptual search using concept extraction and expansion
   */
  private async conceptualSearch(
    query: SearchQuery,
    memories: MemoryRecord[]
  ): Promise<SearchResult[]> {
    if (!this.conceptExtractor) {
      // Fall back to keyword search
      return this.keywordSearch(query, memories);
    }

    // Extract concepts from query
    let queryConcepts = this.conceptCache.get(query.query);
    if (!queryConcepts) {
      queryConcepts = await this.conceptExtractor.extractConcepts(query.query);
      this.conceptCache.set(query.query, queryConcepts);
    }

    // Expand concepts if requested
    if (query.expandQuery) {
      const expandedConcepts =
        await this.conceptExtractor.expandConcepts(queryConcepts);
      queryConcepts = [...queryConcepts, ...expandedConcepts];
    }

    const results: SearchResult[] = [];

    for (const memory of memories) {
      // Extract concepts from memory
      const memoryConcepts = await this.conceptExtractor.extractConcepts(
        memory.content
      );

      let score = 0;
      const conceptMatches: string[] = [];

      // Calculate concept similarity
      for (const queryConcept of queryConcepts) {
        for (const memoryConcept of memoryConcepts) {
          const similarity = await this.conceptExtractor.getConceptSimilarity(
            queryConcept,
            memoryConcept
          );
          if (similarity > 0.5) {
            score += similarity;
            conceptMatches.push(`${queryConcept} → ${memoryConcept}`);
          }
        }
      }

      // Normalize score
      if (queryConcepts.length > 0) {
        score = score / queryConcepts.length;
      }

      if (score > 0) {
        results.push({
          record: memory,
          memory, // Backward compatibility
          score,
          conceptMatches,
          explanations: [`Concept matches: ${conceptMatches.length}`],
        });
      }
    }

    return results;
  }

  /**
   * Multi-modal search combining multiple search types
   */
  private async multiModalSearch(
    query: SearchQuery,
    memories: MemoryRecord[],
    relationships?: MemoryRelationship[]
  ): Promise<SearchResult[]> {
    const searches = [
      this.semanticSearch(query, memories),
      this.keywordSearch(query, memories),
      this.conceptualSearch(query, memories),
    ];

    if (relationships) {
      searches.push(this.relationalSearch(query, memories, relationships));
    }

    const allResults = await Promise.all(searches);
    const resultMap = new Map<string, SearchResult>();

    // Combine all results
    for (const results of allResults) {
      for (const result of results) {
        const existing = resultMap.get(result.record.id);
        if (existing) {
          // Combine scores (average)
          existing.score = (existing.score + result.score) / 2;
          existing.explanations = [
            ...(existing.explanations || []),
            ...(result.explanations || []),
          ];
          existing.highlights = [
            ...(existing.highlights || []),
            ...(result.highlights || []),
          ];
          existing.conceptMatches = [
            ...(existing.conceptMatches || []),
            ...(result.conceptMatches || []),
          ];
          existing.relationshipPaths = [
            ...(existing.relationshipPaths || []),
            ...(result.relationshipPaths || []),
          ];
        } else {
          resultMap.set(result.record.id, { ...result });
        }
      }
    }

    return Array.from(resultMap.values());
  }

  /**
   * Filter memories by time range
   */
  private filterByTimeRange(
    memories: MemoryRecord[],
    timeRange: TimeRange
  ): MemoryRecord[] {
    const now = new Date();
    let start: Date | undefined;
    let end: Date | undefined;

    if (timeRange.relative) {
      const { value, unit } = timeRange.relative;
      const multipliers = {
        minutes: 60 * 1000,
        hours: 60 * 60 * 1000,
        days: 24 * 60 * 60 * 1000,
        weeks: 7 * 24 * 60 * 60 * 1000,
        months: 30 * 24 * 60 * 60 * 1000,
        years: 365 * 24 * 60 * 60 * 1000,
      };
      const multiplier = multipliers[unit] || multipliers.days;
      start = new Date(now.getTime() - value * multiplier);
    } else {
      start = timeRange.start;
      end = timeRange.end;
    }

    return memories.filter((memory) => {
      const timestamp = memory.timestamp;
      if (start && timestamp < start) return false;
      if (end && timestamp > end) return false;
      return true;
    });
  }

  /**
   * Apply filters to memories
   */
  private applyFilters(
    memories: MemoryRecord[],
    filters: Record<string, any>
  ): MemoryRecord[] {
    return memories.filter((memory) => {
      for (const [field, filterValue] of Object.entries(filters)) {
        const value = this.getFieldValue(memory, field);
        // Simple equality check for now - can be extended to support operators
        if (Array.isArray(filterValue)) {
          if (!filterValue.includes(value)) {
            return false;
          }
        } else if (value !== filterValue) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * Get field value from memory record
   */
  private getFieldValue(memory: MemoryRecord, field: string): any {
    switch (field) {
      case 'type':
        return memory.type;
      case 'importance':
        return memory.importance;
      case 'tags':
        return memory.tags;
      case 'content':
        return memory.content;
      default:
        return memory.metadata[field];
    }
  }

  /**
   * Apply single filter (reserved for future filtering features)
   */
  private _applyFilter(
    value: any,
    operator: string,
    filterValue: any
  ): boolean {
    switch (operator) {
      case 'eq':
        return value === filterValue;
      case 'ne':
        return value !== filterValue;
      case 'gt':
        return value > filterValue;
      case 'lt':
        return value < filterValue;
      case 'gte':
        return value >= filterValue;
      case 'lte':
        return value <= filterValue;
      case 'in':
        return Array.isArray(filterValue) && filterValue.includes(value);
      case 'nin':
        return Array.isArray(filterValue) && !filterValue.includes(value);
      case 'contains':
        return typeof value === 'string' && value.includes(filterValue);
      case 'regex':
        return typeof value === 'string' && new RegExp(filterValue).test(value);
      default:
        return false;
    }
  }

  /**
   * Traverse relationships to find related memories
   */
  private traverseRelationships(
    memoryId: string,
    relationshipMap: Map<string, MemoryRelationship[]>,
    memories: MemoryRecord[],
    results: SearchResult[],
    visited: Set<string>,
    depth: number,
    baseScore: number,
    path: string[]
  ): void {
    if (depth <= 0 || visited.has(memoryId)) {
      return;
    }

    visited.add(memoryId);
    const relationships = relationshipMap.get(memoryId) || [];

    for (const rel of relationships) {
      const relatedMemory = memories.find((m) => m.id === rel.targetId);
      if (!relatedMemory) continue;

      const relationshipScore = rel.strength * (baseScore / (path.length + 1));
      const newPath = [...path, `${rel.type}→${rel.targetId}`];

      // Add to results if not already present
      const existing = results.find((r) => r.record.id === relatedMemory.id);
      if (!existing) {
        results.push({
          record: relatedMemory,
          memory: relatedMemory, // Backward compatibility
          score: relationshipScore,
          relationshipPaths: [newPath.join(' → ')],
          explanations: [`Related via ${rel.type} (strength: ${rel.strength})`],
        });
      }

      // Continue traversing
      this.traverseRelationships(
        rel.targetId,
        relationshipMap,
        memories,
        results,
        visited,
        depth - 1,
        relationshipScore,
        newPath
      );
    }
  }

  /**
   * Calculate temporal cluster score
   */
  private calculateTemporalClusterScore(
    memory: MemoryRecord,
    sortedMemories: MemoryRecord[],
    index: number
  ): number {
    const windowSize = 5;
    const start = Math.max(0, index - windowSize);
    const end = Math.min(sortedMemories.length, index + windowSize);

    let similaritySum = 0;
    let count = 0;

    for (let i = start; i < end; i++) {
      if (i === index) continue;

      const other = sortedMemories[i];
      const timeDiff = Math.abs(
        memory.timestamp.getTime() - (other?.timestamp?.getTime() ?? 0)
      );

      // Memories within 1 hour are considered in same cluster
      if (timeDiff < 60 * 60 * 1000) {
        similaritySum += 1;
        count++;
      }
    }

    return count > 0 ? similaritySum / count : 0;
  }

  /**
   * Tokenize text into terms
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((term) => term.length > 2);
  }

  /**
   * Extract highlight around matched term
   */
  private extractHighlight(text: string, term: string): string {
    const index = text.toLowerCase().indexOf(term.toLowerCase());
    if (index === -1) return '';

    const start = Math.max(0, index - 30);
    const end = Math.min(text.length, index + term.length + 30);

    return text.substring(start, end);
  }

  /**
   * Generate cache key for query
   */
  private getCacheKey(query: SearchQuery): string {
    return JSON.stringify({
      type: query.type,
      query: query.query,
      filters: query.filters,
      limit: query.limit,
      offset: query.offset,
      threshold: query.threshold,
    });
  }

  /**
   * Clear query cache
   */
  clearCache(): void {
    this.queryCache.clear();
    this.conceptCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { queryCache: number; conceptCache: number } {
    return {
      queryCache: this.queryCache.size,
      conceptCache: this.conceptCache.size,
    };
  }
}

/**
 * Simple concept extractor implementation
 */
export class SimpleConceptExtractor implements ConceptExtractor {
  private stopWords = new Set([
    'a',
    'an',
    'the',
    'and',
    'or',
    'but',
    'in',
    'on',
    'at',
    'to',
    'for',
    'of',
    'with',
    'by',
    'from',
    'up',
    'about',
    'into',
    'through',
    'during',
    'before',
    'after',
    'above',
    'below',
    'between',
    'among',
    'within',
    'without',
    'under',
    'over',
    'inside',
    'outside',
    'near',
    'far',
    'beside',
    'behind',
    'in front of',
    'next to',
    'across',
    'around',
    'through',
    'against',
    'toward',
    'away from',
    'down',
    'downward',
    'upward',
    'inward',
    'outward',
    'backward',
    'forward',
    'left',
    'right',
    'north',
    'south',
    'east',
    'west',
    'is',
    'are',
    'was',
    'were',
    'will',
    'be',
    'been',
    'being',
    'have',
    'has',
    'had',
    'do',
    'does',
    'did',
    'can',
    'could',
    'should',
    'would',
    'may',
    'might',
    'must',
    'shall',
    'will',
    'need',
  ]);

  async extractConcepts(text: string): Promise<string[]> {
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 3 && !this.stopWords.has(word));

    // Remove duplicates and return top concepts
    const uniqueWords = Array.from(new Set(words));
    return uniqueWords.slice(0, 10);
  }

  async expandConcepts(concepts: string[]): Promise<string[]> {
    // Simple expansion - add plural/singular forms
    const expanded: string[] = [];
    for (const concept of concepts) {
      expanded.push(concept);
      if (concept.endsWith('s')) {
        expanded.push(concept.slice(0, -1));
      } else {
        expanded.push(concept + 's');
      }
    }
    return expanded;
  }

  async getConceptSimilarity(
    concept1: string,
    concept2: string
  ): Promise<number> {
    // Simple similarity based on string distance
    const distance = this.levenshteinDistance(concept1, concept2);
    const maxLength = Math.max(concept1.length, concept2.length);
    return 1 - distance / maxLength;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= str1.length; j++) {
      matrix[0]![j] = j;
    }
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i]![j] = matrix[i - 1]![j - 1]!;
        } else {
          matrix[i]![j] = Math.min(
            matrix[i - 1]![j - 1]! + 1,
            matrix[i]![j - 1]! + 1,
            matrix[i - 1]![j]! + 1
          );
        }
      }
    }
    return matrix[str2.length]![str1.length]!;
  }
}

/**
 * Simple embedding service implementation
 */
export class SimpleEmbeddingService implements EmbeddingService {
  async generateEmbedding(text: string): Promise<number[]> {
    // Simple hash-based embedding - in production, use proper embedding model
    const hash = this.hashCode(text);
    const embedding = new Array(384).fill(0);

    // Create pseudo-random embedding based on text hash
    for (let i = 0; i < 384; i++) {
      embedding[i] = Math.sin(hash + i) * 0.1;
    }

    return embedding;
  }

  calculateSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      return 0;
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i]! * embedding2[i]!;
      norm1 += embedding1[i]! * embedding1[i]!;
      norm2 += embedding2[i]! * embedding2[i]!;
    }

    const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }
}
