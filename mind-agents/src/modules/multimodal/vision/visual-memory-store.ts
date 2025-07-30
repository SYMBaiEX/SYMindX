/**
 * Visual Memory Store
 *
 * Manages storage and retrieval of visual memories for agents
 */

import {
  VisualMemory,
  AgentId,
  Timestamp,
  SceneUnderstanding,
} from '../../../types/index.js';
import { runtimeLogger } from '../../../utils/logger.js';

interface VisualMemoryConfig {
  enabled: boolean;
  maxEntries: number;
  retentionDays: number;
  importanceThreshold: number;
}

interface MemoryIndex {
  byAgent: Map<AgentId, Set<string>>;
  byImportance: Map<number, Set<string>>;
  byTimestamp: Map<number, string>;
}

/**
 * Visual memory storage implementation
 */
export class VisualMemoryStore {
  private config: VisualMemoryConfig;
  private memories: Map<string, VisualMemory>;
  private index: MemoryIndex;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: VisualMemoryConfig) {
    this.config = config;
    this.memories = new Map();
    this.index = {
      byAgent: new Map(),
      byImportance: new Map(),
      byTimestamp: new Map(),
    };
  }

  async initialize(): Promise<void> {
    // Setup periodic cleanup
    const cleanupIntervalMs = 60 * 60 * 1000; // 1 hour
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldMemories();
    }, cleanupIntervalMs);

    runtimeLogger.info('Visual memory store initialized', {
      maxEntries: this.config.maxEntries,
      retentionDays: this.config.retentionDays,
    });
  }

  async store(memory: VisualMemory): Promise<void> {
    try {
      // Check if we need to make room
      if (this.memories.size >= this.config.maxEntries) {
        this.evictLeastImportant();
      }

      // Store memory
      this.memories.set(memory.id, memory);

      // Update indices
      this.updateIndices(memory);

      // Create thumbnail if image data is available
      if (memory.scene.thumbnail) {
        memory.thumbnail = await this.createThumbnail(memory.scene);
      }

      runtimeLogger.debug('Visual memory stored', {
        memoryId: memory.id,
        agentId: memory.agentId,
        importance: memory.importance,
        objectCount: memory.scene.objects.length,
      });
    } catch (error) {
      runtimeLogger.error('Failed to store visual memory', { error, memory });
      throw error;
    }
  }

  async query(
    agentId: AgentId,
    options?: {
      startTime?: Timestamp;
      endTime?: Timestamp;
      limit?: number;
      minImportance?: number;
    }
  ): Promise<VisualMemory[]> {
    try {
      // Get memories for agent
      const agentMemoryIds = this.index.byAgent.get(agentId) || new Set();
      let memories = Array.from(agentMemoryIds)
        .map((id) => this.memories.get(id))
        .filter((m): m is VisualMemory => m !== undefined);

      // Apply filters
      if (options?.startTime) {
        memories = memories.filter((m) => m.timestamp >= options.startTime!);
      }

      if (options?.endTime) {
        memories = memories.filter((m) => m.timestamp <= options.endTime!);
      }

      if (options?.minImportance) {
        memories = memories.filter(
          (m) => m.importance >= options.minImportance!
        );
      }

      // Sort by timestamp (newest first)
      memories.sort((a, b) => b.timestamp - a.timestamp);

      // Apply limit
      if (options?.limit) {
        memories = memories.slice(0, options.limit);
      }

      return memories;
    } catch (error) {
      runtimeLogger.error('Failed to query visual memories', {
        error,
        agentId,
        options,
      });
      throw error;
    }
  }

  async findSimilar(
    scene: SceneUnderstanding,
    agentId?: AgentId,
    limit: number = 5
  ): Promise<VisualMemory[]> {
    try {
      let candidates = Array.from(this.memories.values());

      // Filter by agent if specified
      if (agentId) {
        const agentMemoryIds = this.index.byAgent.get(agentId) || new Set();
        candidates = candidates.filter((m) => agentMemoryIds.has(m.id));
      }

      // Calculate similarity scores
      const scored = candidates.map((memory) => ({
        memory,
        similarity: this.calculateSimilarity(scene, memory.scene),
      }));

      // Sort by similarity
      scored.sort((a, b) => b.similarity - a.similarity);

      // Return top matches
      return scored.slice(0, limit).map((s) => s.memory);
    } catch (error) {
      runtimeLogger.error('Failed to find similar memories', { error });
      throw error;
    }
  }

  async updateConfig(config: Partial<VisualMemoryConfig>): Promise<void> {
    this.config = { ...this.config, ...config };

    // Enforce new limits if needed
    if (config.maxEntries && this.memories.size > config.maxEntries) {
      const toRemove = this.memories.size - config.maxEntries;
      for (let i = 0; i < toRemove; i++) {
        this.evictLeastImportant();
      }
    }
  }

  async cleanup(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    this.memories.clear();
    this.index.byAgent.clear();
    this.index.byImportance.clear();
    this.index.byTimestamp.clear();
  }

  // Private helper methods

  private updateIndices(memory: VisualMemory): void {
    // Update agent index
    if (!this.index.byAgent.has(memory.agentId)) {
      this.index.byAgent.set(memory.agentId, new Set());
    }
    this.index.byAgent.get(memory.agentId)!.add(memory.id);

    // Update importance index
    const importanceBucket = Math.floor(memory.importance * 10);
    if (!this.index.byImportance.has(importanceBucket)) {
      this.index.byImportance.set(importanceBucket, new Set());
    }
    this.index.byImportance.get(importanceBucket)!.add(memory.id);

    // Update timestamp index
    this.index.byTimestamp.set(memory.timestamp, memory.id);
  }

  private removeFromIndices(memory: VisualMemory): void {
    // Remove from agent index
    const agentMemories = this.index.byAgent.get(memory.agentId);
    if (agentMemories) {
      agentMemories.delete(memory.id);
      if (agentMemories.size === 0) {
        this.index.byAgent.delete(memory.agentId);
      }
    }

    // Remove from importance index
    const importanceBucket = Math.floor(memory.importance * 10);
    const importanceMemories = this.index.byImportance.get(importanceBucket);
    if (importanceMemories) {
      importanceMemories.delete(memory.id);
      if (importanceMemories.size === 0) {
        this.index.byImportance.delete(importanceBucket);
      }
    }

    // Remove from timestamp index
    this.index.byTimestamp.delete(memory.timestamp);
  }

  private evictLeastImportant(): void {
    // Find memory with lowest importance
    let lowestImportance = Infinity;
    let memoryToEvict: VisualMemory | null = null;

    for (const memory of this.memories.values()) {
      if (memory.importance < lowestImportance) {
        lowestImportance = memory.importance;
        memoryToEvict = memory;
      }
    }

    if (memoryToEvict) {
      this.removeFromIndices(memoryToEvict);
      this.memories.delete(memoryToEvict.id);

      runtimeLogger.debug('Evicted visual memory', {
        memoryId: memoryToEvict.id,
        importance: memoryToEvict.importance,
      });
    }
  }

  private cleanupOldMemories(): void {
    const now = Date.now();
    const retentionMs = this.config.retentionDays * 24 * 60 * 60 * 1000;
    const cutoff = now - retentionMs;

    let removed = 0;
    for (const [id, memory] of this.memories) {
      if (memory.timestamp < cutoff) {
        this.removeFromIndices(memory);
        this.memories.delete(id);
        removed++;
      }
    }

    if (removed > 0) {
      runtimeLogger.info('Cleaned up old visual memories', { removed });
    }
  }

  private async createThumbnail(scene: SceneUnderstanding): Promise<string> {
    // In a real implementation, this would create a small thumbnail
    // For now, return a placeholder or hash
    const objectSummary = scene.objects
      .slice(0, 3)
      .map((obj) => obj.label)
      .join(',');

    return `thumb:${objectSummary}`;
  }

  private calculateSimilarity(
    scene1: SceneUnderstanding,
    scene2: SceneUnderstanding
  ): number {
    let similarity = 0;

    // Compare objects
    const labels1 = new Set(scene1.objects.map((obj) => obj.label));
    const labels2 = new Set(scene2.objects.map((obj) => obj.label));

    const intersection = new Set([...labels1].filter((x) => labels2.has(x)));
    const union = new Set([...labels1, ...labels2]);

    if (union.size > 0) {
      similarity += (intersection.size / union.size) * 0.4;
    }

    // Compare tags
    const tags1 = new Set(scene1.tags);
    const tags2 = new Set(scene2.tags);

    const tagIntersection = new Set([...tags1].filter((x) => tags2.has(x)));
    const tagUnion = new Set([...tags1, ...tags2]);

    if (tagUnion.size > 0) {
      similarity += (tagIntersection.size / tagUnion.size) * 0.3;
    }

    // Compare descriptions using simple word overlap
    const words1 = new Set(scene1.description.toLowerCase().split(/\s+/));
    const words2 = new Set(scene2.description.toLowerCase().split(/\s+/));

    const wordIntersection = new Set([...words1].filter((x) => words2.has(x)));
    const wordUnion = new Set([...words1, ...words2]);

    if (wordUnion.size > 0) {
      similarity += (wordIntersection.size / wordUnion.size) * 0.3;
    }

    return similarity;
  }
}
