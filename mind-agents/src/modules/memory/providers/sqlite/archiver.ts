/**
 * Memory Archiver for Neon Memory Provider
 *
 * Handles memory archival and compression strategies
 */

import { MemoryRecord, MemoryDuration } from '../../../../types/agent';
import { ArchivalStrategy } from '../../../../types/memory';

/**
 * Memory archiver implementation
 */
export class MemoryArchiver {
  private strategies: ArchivalStrategy[];

  constructor(strategies: ArchivalStrategy[] = []) {
    this.strategies = strategies;
  }

  /**
   * Archive memories based on configured strategies
   */
  async archive(memories: MemoryRecord[]): Promise<MemoryRecord[]> {
    let processedMemories = [...memories];

    for (const strategy of this.strategies) {
      switch (strategy.type) {
        case 'compression':
          processedMemories = await this.compressMemories(
            processedMemories,
            strategy
          );
          break;
        case 'summarization':
          processedMemories = await this.summarizeMemories(
            processedMemories,
            strategy
          );
          break;
        case 'hierarchical':
          processedMemories = await this.hierarchicalArchive(
            processedMemories,
            strategy
          );
          break;
      }
    }

    return processedMemories;
  }

  /**
   * Compress memories by grouping similar ones
   */
  private async compressMemories(
    memories: MemoryRecord[],
    _strategy: ArchivalStrategy
  ): Promise<MemoryRecord[]> {
    // Simple compression: group by day and combine content
    const grouped = new Map<string, MemoryRecord[]>();

    for (const memory of memories) {
      const day = memory.timestamp.toISOString().split('T')[0];
      if (!day) continue;
      if (!grouped.has(day)) {
        grouped.set(day, []);
      }
      grouped.get(day)!.push(memory);
    }

    const compressed: MemoryRecord[] = [];
    for (const [day, group] of Array.from(grouped.entries())) {
      if (group.length > 1) {
        compressed.push({
          id: `compressed_${day}_${Date.now()}`,
          agentId: group[0]?.agentId ?? '',
          type: group[0]?.type ?? ('unknown' as any),
          content: `Compressed memories from ${day}: ${group.map((m) => m.content).join('; ')}`,
          importance: Math.max(...group.map((m) => m.importance || 0)),
          timestamp: new Date(day),
          tags: ['compressed', ...group.flatMap((m) => m.tags || [])],
          duration:
            (group[0]?.duration as MemoryDuration) || MemoryDuration.PERMANENT,
          metadata: {
            ...(group[0]?.metadata ?? {}),
            compression: {
              originalCount: group.length,
              compressedAt: new Date().toISOString(),
            },
          },
        });
      } else {
        compressed.push(...group);
      }
    }

    return compressed;
  }

  /**
   * Summarize memories using simple text processing
   */
  private async summarizeMemories(
    memories: MemoryRecord[],
    _strategy: ArchivalStrategy
  ): Promise<MemoryRecord[]> {
    // For now, return memories as-is
    // In production, this would use LLM summarization
    return memories;
  }

  /**
   * Hierarchical archival of memories
   */
  private async hierarchicalArchive(
    memories: MemoryRecord[],
    strategy: ArchivalStrategy
  ): Promise<MemoryRecord[]> {
    // Group memories by importance and age for hierarchical storage
    const highImportance = memories.filter((m) => (m.importance || 0) > 0.8);
    const mediumImportance = memories.filter(
      (m) => (m.importance || 0) > 0.5 && (m.importance || 0) <= 0.8
    );
    const lowImportance = memories.filter((m) => (m.importance || 0) <= 0.5);

    // Keep high importance memories as-is
    // Compress medium importance memories
    const compressedMedium = await this.compressMemories(
      mediumImportance,
      strategy
    );

    // Summarize low importance memories
    const summarizedLow = await this.summarizeMemories(lowImportance, strategy);

    return [...highImportance, ...compressedMedium, ...summarizedLow];
  }

  /**
   * Get archival statistics
   */
  getStats() {
    return {
      strategiesCount: this.strategies.length,
      strategies: this.strategies.map((s) => s.type),
    };
  }
}
