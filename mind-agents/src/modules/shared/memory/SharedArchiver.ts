/**
 * Shared Memory Archiver for SYMindX
 *
 * Abstract base class providing common archival operations for all memory providers
 */

import { MemoryRecord, MemoryDuration, MemoryType } from '../../../types/agent';
import { ArchivalStrategy } from '../../../types/memory';

export interface ArchiverConfig {
  strategies: ArchivalStrategy[];
  maxCompressionRatio?: number;
  retentionDays?: number;
  enableCompression?: boolean;
  enableSummarization?: boolean;
  enableHierarchical?: boolean;
}

export abstract class SharedArchiver<TStorage> {
  protected config: ArchiverConfig;
  protected strategies: ArchivalStrategy[];

  constructor(config: ArchiverConfig) {
    this.config = {
      maxCompressionRatio: 0.7,
      retentionDays: 365,
      enableCompression: true,
      enableSummarization: true,
      enableHierarchical: false,
      ...config,
    };
    this.strategies = this.config.strategies;
  }

  /**
   * Get the storage instance (database connection, etc.)
   */
  abstract getStorage(): TStorage;

  /**
   * Archive memories based on configured strategies
   */
  async archive(memories: MemoryRecord[]): Promise<MemoryRecord[]> {
    let processedMemories = [...memories];

    for (const strategy of this.strategies) {
      try {
        switch (strategy.type) {
          case 'compression':
            if (this.config.enableCompression) {
              processedMemories = await this.compressMemories(
                processedMemories,
                strategy
              );
            }
            break;
          case 'summarization':
            if (this.config.enableSummarization) {
              processedMemories = await this.summarizeMemories(
                processedMemories,
                strategy
              );
            }
            break;
          case 'hierarchical':
            if (this.config.enableHierarchical) {
              processedMemories = await this.hierarchicalArchive(
                processedMemories,
                strategy
              );
            }
            break;
          default:
            console.warn(`Unknown archival strategy: ${strategy.type}`);
        }
      } catch (error) {
        console.error(`Error in archival strategy ${strategy.type}:`, error);
        // Continue with other strategies
      }
    }

    return processedMemories;
  }

  /**
   * Compress memories by grouping similar ones
   */
  protected async compressMemories(
    memories: MemoryRecord[],
    strategy: ArchivalStrategy
  ): Promise<MemoryRecord[]> {
    const compressionRatio = Math.min(
      strategy.config?.compressionRatio || 0.5,
      this.config.maxCompressionRatio || 0.7
    );

    // Group memories by configurable criteria
    const groupBy = strategy.config?.groupBy || 'day';
    const grouped = this.groupMemories(memories, groupBy);

    const compressed: MemoryRecord[] = [];

    for (const [groupKey, group] of Array.from(grouped.entries())) {
      if (group.length <= 1) {
        compressed.push(...group);
        continue;
      }

      // Calculate if compression is beneficial
      const originalSize = group.reduce((acc, m) => acc + m.content.length, 0);
      const targetSize = originalSize * compressionRatio;

      if (this.shouldCompress(group, targetSize)) {
        const compressedMemory = await this.createCompressedMemory(
          group,
          groupKey,
          strategy
        );
        compressed.push(compressedMemory);
      } else {
        compressed.push(...group);
      }
    }

    return compressed;
  }

  /**
   * Summarize memories using AI or rule-based approaches
   */
  protected async summarizeMemories(
    memories: MemoryRecord[],
    strategy: ArchivalStrategy
  ): Promise<MemoryRecord[]> {
    const summarizationThreshold = strategy.config?.threshold || 10;

    if (memories.length < summarizationThreshold) {
      return memories;
    }

    const groupBy = strategy.config?.groupBy || 'type';
    const grouped = this.groupMemories(memories, groupBy);

    const summarized: MemoryRecord[] = [];

    for (const [groupKey, group] of Array.from(grouped.entries())) {
      if (group.length >= summarizationThreshold) {
        const summary = await this.createSummary(group, groupKey, strategy);
        summarized.push(summary);

        // Keep most important original memories
        const important = group
          .filter((m) => (m.importance || 0) > 0.8)
          .slice(0, strategy.config?.keepTopN || 3);
        summarized.push(...important);
      } else {
        summarized.push(...group);
      }
    }

    return summarized;
  }

  /**
   * Hierarchical archiving based on importance and age
   */
  protected async hierarchicalArchive(
    memories: MemoryRecord[],
    strategy: ArchivalStrategy
  ): Promise<MemoryRecord[]> {
    const levels = strategy.config?.levels || [
      { name: 'recent', days: 7, importance: 0.0 },
      { name: 'important', days: 30, importance: 0.7 },
      { name: 'archive', days: 365, importance: 0.9 },
    ];

    const now = new Date();
    const hierarchical: MemoryRecord[] = [];

    for (const memory of memories) {
      const ageInDays =
        (now.getTime() - memory.timestamp.getTime()) / (1000 * 60 * 60 * 24);
      const importance = memory.importance || 0.5;

      let assigned = false;
      for (const level of levels) {
        if (ageInDays <= level.days && importance >= level.importance) {
          // Memory fits in this level
          const hierarchicalMemory = {
            ...memory,
            metadata: {
              ...memory.metadata,
              archivalLevel: level.name,
              archivedAt: now.toISOString(),
            },
          };
          hierarchical.push(hierarchicalMemory);
          assigned = true;
          break;
        }
      }

      if (!assigned) {
        // Memory doesn't fit any level, archive it
        const archivedMemory = {
          ...memory,
          duration: MemoryDuration.ARCHIVED,
          metadata: {
            ...memory.metadata,
            archivalLevel: 'archived',
            archivedAt: now.toISOString(),
          },
        };
        hierarchical.push(archivedMemory);
      }
    }

    return hierarchical;
  }

  /**
   * Group memories by specified criteria
   */
  protected groupMemories(
    memories: MemoryRecord[],
    groupBy: string
  ): Map<string, MemoryRecord[]> {
    const grouped = new Map<string, MemoryRecord[]>();

    for (const memory of memories) {
      let key: string;

      switch (groupBy) {
        case 'day':
          key = memory.timestamp.toISOString().split('T')[0] || 'unknown';
          break;
        case 'week':
          const weekStart = new Date(memory.timestamp);
          weekStart.setDate(weekStart.getDate() - weekStart.getDay());
          key = weekStart.toISOString().split('T')[0] || 'unknown';
          break;
        case 'month':
          key = memory.timestamp.toISOString().substring(0, 7);
          break;
        case 'type':
          key = memory.type;
          break;
        case 'importance':
          const importance = memory.importance || 0.5;
          key = importance > 0.8 ? 'high' : importance > 0.5 ? 'medium' : 'low';
          break;
        case 'tags':
          key = memory.tags?.join(',') || 'untagged';
          break;
        default:
          key = 'all';
      }

      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(memory);
    }

    return grouped;
  }

  /**
   * Determine if a group of memories should be compressed
   */
  protected shouldCompress(group: MemoryRecord[], targetSize: number): boolean {
    if (group.length < 2) return false;

    // Check if memories are similar enough to compress
    const contentSimilarity = this.calculateContentSimilarity(group);
    if (contentSimilarity < 0.3) return false;

    // Check if compression would be beneficial
    const totalSize = group.reduce((acc, m) => acc + m.content.length, 0);
    return totalSize > targetSize * 2; // Only compress if we can save significant space
  }

  /**
   * Create a compressed memory from a group
   */
  protected async createCompressedMemory(
    group: MemoryRecord[],
    groupKey: string,
    strategy: ArchivalStrategy
  ): Promise<MemoryRecord> {
    const sortedByImportance = group.sort(
      (a, b) => (b.importance || 0) - (a.importance || 0)
    );
    const representative = sortedByImportance[0]!;

    const compressedContent = await this.compressContent(
      group.map((m) => m.content),
      strategy.config?.compressionMethod || 'summary'
    );

    return {
      id: `compressed_${groupKey}_${Date.now()}`,
      agentId: representative.agentId,
      type: representative.type,
      content: compressedContent,
      importance: Math.max(...group.map((m) => m.importance || 0)),
      timestamp: new Date(),
      tags: [
        'compressed',
        ...Array.from(new Set(group.flatMap((m) => m.tags || []))),
      ],
      duration: MemoryDuration.PERMANENT,
      metadata: {
        ...representative.metadata,
        compression: {
          originalCount: group.length,
          originalIds: group.map((m) => m.id),
          compressedAt: new Date().toISOString(),
          strategy: strategy.type,
          method: strategy.config?.compressionMethod || 'summary',
        },
      },
    };
  }

  /**
   * Create a summary memory from a group
   */
  protected async createSummary(
    group: MemoryRecord[],
    groupKey: string,
    strategy: ArchivalStrategy
  ): Promise<MemoryRecord> {
    const sortedByTime = group.sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );
    const earliest = sortedByTime[0]!;
    const latest = sortedByTime[sortedByTime.length - 1]!;

    const summaryContent = await this.generateSummary(
      group.map((m) => m.content),
      strategy.config?.summaryMethod || 'extractive'
    );

    return {
      id: `summary_${groupKey}_${Date.now()}`,
      agentId: earliest.agentId,
      type: earliest.type,
      content: summaryContent,
      importance: Math.max(...group.map((m) => m.importance || 0)),
      timestamp: new Date(),
      tags: [
        'summary',
        ...Array.from(new Set(group.flatMap((m) => m.tags || []))),
      ],
      duration: MemoryDuration.PERMANENT,
      metadata: {
        ...earliest.metadata,
        summary: {
          originalCount: group.length,
          originalIds: group.map((m) => m.id),
          summarizedAt: new Date().toISOString(),
          timespan: {
            start: earliest.timestamp.toISOString(),
            end: latest.timestamp.toISOString(),
          },
          strategy: strategy.type,
          method: strategy.config?.summaryMethod || 'extractive',
        },
      },
    };
  }

  /**
   * Calculate content similarity between memories
   */
  protected calculateContentSimilarity(memories: MemoryRecord[]): number {
    if (memories.length < 2) return 1.0;

    // Simple word overlap similarity
    const allWords = new Set<string>();
    const wordSets = memories.map((m) => {
      const words = new Set(m.content.toLowerCase().split(/\s+/));
      words.forEach((w) => allWords.add(w));
      return words;
    });

    let totalOverlap = 0;
    let comparisons = 0;

    for (let i = 0; i < wordSets.length; i++) {
      for (let j = i + 1; j < wordSets.length; j++) {
        const intersection = new Set(
          [...wordSets[i]!].filter((w) => wordSets[j]!.has(w))
        );
        const union = new Set([...wordSets[i]!, ...wordSets[j]!]);
        totalOverlap += intersection.size / union.size;
        comparisons++;
      }
    }

    return comparisons > 0 ? totalOverlap / comparisons : 0;
  }

  /**
   * Compress content using specified method
   */
  protected async compressContent(
    contents: string[],
    method: string
  ): Promise<string> {
    switch (method) {
      case 'summary':
        return this.extractiveSummary(contents);
      case 'keywords':
        return this.keywordExtraction(contents);
      case 'bullet_points':
        return this.bulletPointSummary(contents);
      default:
        return contents.join('; ');
    }
  }

  /**
   * Generate summary using specified method
   */
  protected async generateSummary(
    contents: string[],
    method: string
  ): Promise<string> {
    switch (method) {
      case 'extractive':
        return this.extractiveSummary(contents);
      case 'abstractive':
        return this.abstractiveSummary(contents);
      case 'timeline':
        return this.timelineSummary(contents);
      default:
        return this.extractiveSummary(contents);
    }
  }

  /**
   * Extractive summary - select most important sentences
   */
  protected extractiveSummary(contents: string[]): string {
    const allSentences = contents.flatMap((c) =>
      c.split(/[.!?]+/).filter((s) => s.trim().length > 10)
    );

    if (allSentences.length <= 3) {
      return allSentences.join('. ') + '.';
    }

    // Score sentences by length and position
    const scored = allSentences.map((sentence, index) => ({
      sentence: sentence.trim(),
      score:
        sentence.length / 100 +
        (allSentences.length - index) / allSentences.length,
    }));

    const topSentences = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.min(3, Math.ceil(allSentences.length / 3)))
      .sort(
        (a, b) =>
          allSentences.indexOf(a.sentence) - allSentences.indexOf(b.sentence)
      );

    return topSentences.map((s) => s.sentence).join('. ') + '.';
  }

  /**
   * Abstractive summary - generate new summary text
   */
  protected abstractiveSummary(contents: string[]): string {
    // Simplified abstractive summary
    const keyPhrases = this.extractKeyPhrases(contents);
    return `Summary of ${contents.length} memories: ${keyPhrases.slice(0, 5).join(', ')}.`;
  }

  /**
   * Timeline summary - chronological summary
   */
  protected timelineSummary(contents: string[]): string {
    return `Timeline summary of ${contents.length} events: ${contents.slice(0, 3).join(' → ')}.`;
  }

  /**
   * Keyword extraction from content
   */
  protected keywordExtraction(contents: string[]): string {
    const keyPhrases = this.extractKeyPhrases(contents);
    return `Key topics: ${keyPhrases.slice(0, 10).join(', ')}.`;
  }

  /**
   * Bullet point summary
   */
  protected bulletPointSummary(contents: string[]): string {
    const keyPhrases = this.extractKeyPhrases(contents);
    return keyPhrases
      .slice(0, 5)
      .map((phrase) => `• ${phrase}`)
      .join('\n');
  }

  /**
   * Extract key phrases from content
   */
  protected extractKeyPhrases(contents: string[]): string[] {
    const text = contents.join(' ').toLowerCase();
    const words = text.split(/\s+/).filter((w) => w.length > 3);

    // Count word frequencies
    const frequencies = new Map<string, number>();
    words.forEach((word) => {
      frequencies.set(word, (frequencies.get(word) || 0) + 1);
    });

    // Get most frequent meaningful words
    const stopWords = new Set([
      'the',
      'and',
      'for',
      'are',
      'but',
      'not',
      'you',
      'all',
      'can',
      'had',
      'her',
      'was',
      'one',
      'our',
      'out',
      'day',
      'get',
      'has',
      'him',
      'his',
      'how',
      'its',
      'may',
      'new',
      'now',
      'old',
      'see',
      'two',
      'who',
      'boy',
      'did',
      'she',
      'use',
      'way',
      'will',
      'with',
    ]);

    return Array.from(frequencies.entries())
      .filter(([word, freq]) => !stopWords.has(word) && freq > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word]) => word);
  }

  /**
   * Clean up old archived memories
   */
  async cleanup(retentionDays?: number): Promise<number> {
    const days = retentionDays || this.config.retentionDays || 365;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return this.cleanupBefore(cutoffDate);
  }

  /**
   * Clean up memories before a specific date - must be implemented by subclasses
   */
  protected abstract cleanupBefore(date: Date): Promise<number>;

  /**
   * Get archiver statistics
   */
  async getStats(): Promise<{
    strategiesEnabled: string[];
    totalStrategies: number;
    compressionEnabled: boolean;
    summarizationEnabled: boolean;
    hierarchicalEnabled: boolean;
    retentionDays: number;
  }> {
    return {
      strategiesEnabled: this.strategies.map((s) => s.type),
      totalStrategies: this.strategies.length,
      compressionEnabled: this.config.enableCompression || false,
      summarizationEnabled: this.config.enableSummarization || false,
      hierarchicalEnabled: this.config.enableHierarchical || false,
      retentionDays: this.config.retentionDays || 365,
    };
  }
}
