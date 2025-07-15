/**
 * Memory Management Strategies for SYMindX
 *
 * Implements sophisticated memory management algorithms including decay policies,
 * summarization strategies, prioritization algorithms, and consolidation rules.
 */

import { MemoryRecord, MemoryDuration, MemoryType } from '../../types/agent';
import {
  MemoryManagementPolicy,
  MemoryPolicyConfig,
  MemoryRelationship,
} from '../../types/memory';
import { runtimeLogger } from '../../utils/logger';

/**
 * Memory access tracker
 */
export interface MemoryAccess {
  memoryId: string;
  timestamp: Date;
  accessType: 'read' | 'write' | 'update';
  frequency: number;
}

/**
 * Memory priority score
 */
export interface MemoryPriority {
  memoryId: string;
  priority: number;
  factors: {
    importance: number;
    recency: number;
    accessFrequency: number;
    emotionalValence: number;
    relationshipCount: number;
  };
  calculated: Date;
}

/**
 * Memory cluster for summarization
 */
export interface MemoryCluster {
  id: string;
  memories: MemoryRecord[];
  centroid: number[]; // Vector centroid if using embeddings
  cohesionScore: number;
  timeRange: { start: Date; end: Date };
  concepts: string[];
}

/**
 * Summarized memory
 */
export interface SummarizedMemory extends MemoryRecord {
  originalMemoryIds: string[];
  summaryMethod: string;
  compressionRatio: number;
}

/**
 * Memory decay function interface
 */
export interface DecayFunction {
  (age: number, importance: number, accessCount: number): number;
}

/**
 * Memory management strategy engine
 */
export class MemoryManagementEngine {
  private accessTracker: Map<string, MemoryAccess[]> = new Map();
  private priorityCache: Map<string, MemoryPriority> = new Map();
  private policies: MemoryManagementPolicy[] = [];

  constructor(policies: MemoryManagementPolicy[] = []) {
    this.policies = policies;
  }

  /**
   * Apply memory decay to a set of memories
   */
  applyDecay(
    memories: MemoryRecord[],
    _agentId: string,
    config: MemoryPolicyConfig
  ): MemoryRecord[] {
    const decayPolicy = this.policies.find(
      (p) => p.type === 'decay' && p.enabled
    );
    if (!decayPolicy) return memories;

    const decayRate = config.decayRate || 0.01;
    const accessBoost = config.accessBoost || 1.5;
    const importanceThreshold = config.importanceThreshold || 0.1;
    const decayFunction = this.getDecayFunction(
      config.decayFunction || 'exponential'
    );

    const now = Date.now();
    const updatedMemories: MemoryRecord[] = [];

    for (const memory of memories) {
      // Calculate age in days
      const age = (now - memory.timestamp.getTime()) / (1000 * 60 * 60 * 24);

      // Get access information
      const accesses = this.getMemoryAccesses(memory.id);
      const accessCount = accesses.length;
      const lastAccess = accesses[accesses.length - 1]?.timestamp;

      // Calculate decay factor
      let newImportance = memory.importance;

      if (newImportance > importanceThreshold) {
        const baseDDecay = decayFunction(age, memory.importance, accessCount);

        // Apply access boost if recently accessed
        let accessMultiplier = 1;
        if (lastAccess) {
          const daysSinceAccess =
            (now - lastAccess.getTime()) / (1000 * 60 * 60 * 24);
          if (daysSinceAccess < 7) {
            accessMultiplier = accessBoost;
          }
        }

        newImportance = Math.max(
          importanceThreshold,
          newImportance - (baseDDecay * decayRate) / accessMultiplier
        );
      }

      // Update memory with new importance
      updatedMemories.push({
        ...memory,
        importance: newImportance,
      });

      if (newImportance !== memory.importance) {
        runtimeLogger.debug(
          `Applied decay to memory ${memory.id}: ${memory.importance.toFixed(3)} → ${newImportance.toFixed(3)}`
        );
      }
    }

    return updatedMemories;
  }

  /**
   * Prioritize memories based on multiple factors
   */
  prioritizeMemories(
    memories: MemoryRecord[],
    _agentId: string,
    config: MemoryPolicyConfig,
    relationships?: MemoryRelationship[]
  ): MemoryPriority[] {
    const priorities: MemoryPriority[] = [];
    const priorityFactors = config.priorityFactors || {
      importance: 0.3,
      recency: 0.2,
      accessFrequency: 0.2,
      emotionalValence: 0.15,
      relationshipCount: 0.15,
    };

    const now = Date.now();
    const relationshipCounts = this.calculateRelationshipCounts(
      relationships || []
    );

    for (const memory of memories) {
      // Check cache first
      const cached = this.priorityCache.get(memory.id);
      if (cached && now - cached.calculated.getTime() < 60 * 60 * 1000) {
        // 1 hour cache
        priorities.push(cached);
        continue;
      }

      // Calculate importance score
      const importanceScore =
        memory.importance * (priorityFactors.importance || 0);

      // Calculate recency score
      const age = (now - memory.timestamp.getTime()) / (1000 * 60 * 60 * 24);
      const recencyScore =
        Math.max(0, 1 - age / 30) * (priorityFactors.recency || 0);

      // Calculate access frequency score
      const accesses = this.getMemoryAccesses(memory.id);
      const accessScore =
        Math.min(1, accesses.length / 10) *
        (priorityFactors.accessFrequency || 0);

      // Calculate emotional valence score
      const emotionalValenceValue =
        typeof memory.metadata.emotionalValence === 'number'
          ? memory.metadata.emotionalValence
          : 0;
      const emotionalScore =
        Math.abs(emotionalValenceValue) *
        (priorityFactors.emotionalValence || 0);

      // Calculate relationship score
      const relationshipCount = relationshipCounts.get(memory.id) || 0;
      const relationshipScore =
        Math.min(1, relationshipCount / 5) *
        (priorityFactors.relationshipCount || 0);

      // Calculate total priority
      const totalPriority =
        importanceScore +
        recencyScore +
        accessScore +
        emotionalScore +
        relationshipScore;

      const priority: MemoryPriority = {
        memoryId: memory.id,
        priority: totalPriority,
        factors: {
          importance: importanceScore,
          recency: recencyScore,
          accessFrequency: accessScore,
          emotionalValence: emotionalScore,
          relationshipCount: relationshipScore,
        },
        calculated: new Date(),
      };

      priorities.push(priority);
      this.priorityCache.set(memory.id, priority);
    }

    return priorities.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Cluster memories for summarization
   */
  clusterMemories(
    memories: MemoryRecord[],
    config: MemoryPolicyConfig
  ): MemoryCluster[] {
    const method = config.summaryMethod || 'temporal';

    switch (method) {
      case 'temporal':
        return this.clusterByTime(memories, config);
      case 'clustering':
        return this.clusterByEmbedding(memories, config);
      case 'concept_based':
        return this.clusterByConcepts(memories, config);
      default:
        return this.clusterByTime(memories, config);
    }
  }

  /**
   * Summarize memory clusters
   */
  async summarizeCluster(
    cluster: MemoryCluster,
    config: MemoryPolicyConfig
  ): Promise<SummarizedMemory> {
    const method = config.summaryMethod || 'temporal';
    const preserveOriginal = config.preserveOriginal !== false;

    // Log preservation strategy
    if (preserveOriginal) {
      runtimeLogger.debug('Preserving original memories during summarization');
    }

    // Create summary content
    let summaryContent: string;
    let summaryTags: string[] = [];
    let maxImportance = 0;

    switch (method) {
      case 'temporal':
        summaryContent = this.createTemporalSummary(cluster);
        summaryTags = ['temporal_summary', 'auto_generated'];
        break;
      case 'clustering':
        summaryContent = this.createClusterSummary(cluster);
        summaryTags = ['cluster_summary', 'auto_generated'];
        break;
      case 'concept_based':
        summaryContent = this.createConceptualSummary(cluster);
        summaryTags = ['conceptual_summary', 'auto_generated'];
        break;
      default:
        summaryContent = this.createGenericSummary(cluster);
        summaryTags = ['summary', 'auto_generated'];
    }

    // Calculate summary importance (max of cluster)
    maxImportance = Math.max(...cluster.memories.map((m) => m.importance));

    // Calculate compression ratio
    const originalSize = cluster.memories.reduce(
      (sum, m) => sum + m.content.length,
      0
    );
    const compressionRatio = summaryContent.length / originalSize;

    const summarizedMemory: SummarizedMemory = {
      id: `summary_${cluster.id}`,
      agentId: cluster.memories[0]?.agentId ?? '',
      type: cluster.memories[0]?.type ?? ('unknown' as MemoryType),
      content: summaryContent,
      metadata: {
        ...(cluster.memories[0]?.metadata ?? {}),
        isSummary: true,
        originalCount: cluster.memories.length,
        timeRange: cluster.timeRange,
        concepts: cluster.concepts,
      },
      importance: maxImportance,
      timestamp: new Date(),
      tags: summaryTags,
      duration:
        (cluster.memories[0]?.duration as MemoryDuration) ||
        MemoryDuration.LONG_TERM,
      originalMemoryIds: cluster.memories.map((m) => m.id),
      summaryMethod: method,
      compressionRatio,
    };

    runtimeLogger.info(
      `Created ${method} summary for ${cluster.memories.length} memories (compression: ${(compressionRatio * 100).toFixed(1)}%)`
    );

    return summarizedMemory;
  }

  /**
   * Track memory access
   */
  trackAccess(memoryId: string, accessType: 'read' | 'write' | 'update'): void {
    const accesses = this.accessTracker.get(memoryId) || [];
    const existingAccess = accesses.find((a) => a.accessType === accessType);

    if (existingAccess) {
      existingAccess.frequency++;
      existingAccess.timestamp = new Date();
    } else {
      accesses.push({
        memoryId,
        timestamp: new Date(),
        accessType,
        frequency: 1,
      });
    }

    this.accessTracker.set(memoryId, accesses);

    // Invalidate priority cache for this memory
    this.priorityCache.delete(memoryId);
  }

  /**
   * Clean up low-priority memories
   */
  cleanupByPriority(
    memories: MemoryRecord[],
    priorities: MemoryPriority[],
    config: MemoryPolicyConfig
  ): MemoryRecord[] {
    const threshold = config.priorityThreshold || 0.1;
    const priorityMap = new Map(
      priorities.map((p) => [p.memoryId, p.priority])
    );

    const keptMemories = memories.filter((memory) => {
      const priority = priorityMap.get(memory.id) || 0;
      return priority >= threshold;
    });

    const removedCount = memories.length - keptMemories.length;
    if (removedCount > 0) {
      runtimeLogger.info(`Cleaned up ${removedCount} low-priority memories`);
    }

    return keptMemories;
  }

  /**
   * Get memory access history
   */
  getMemoryAccesses(memoryId: string): MemoryAccess[] {
    return this.accessTracker.get(memoryId) || [];
  }

  /**
   * Get decay function implementation
   */
  private getDecayFunction(type: string): DecayFunction {
    switch (type) {
      case 'linear':
        return (age, _importance, _accessCount) => age * 0.01;
      case 'exponential':
        return (age, _importance, _accessCount) => 1 - Math.exp(-age * 0.1);
      case 'sigmoid':
        return (age, _importance, _accessCount) =>
          1 / (1 + Math.exp(-age + 10));
      default:
        return (age, _importance, _accessCount) => 1 - Math.exp(-age * 0.1);
    }
  }

  /**
   * Calculate relationship counts for memories
   */
  private calculateRelationshipCounts(
    relationships: MemoryRelationship[]
  ): Map<string, number> {
    const counts = new Map<string, number>();

    for (const rel of relationships) {
      counts.set(rel.sourceId, (counts.get(rel.sourceId) || 0) + 1);
      counts.set(rel.targetId, (counts.get(rel.targetId) || 0) + 1);
    }

    return counts;
  }

  /**
   * Cluster memories by time
   */
  private clusterByTime(
    memories: MemoryRecord[],
    _config: MemoryPolicyConfig
  ): MemoryCluster[] {
    const clusters: MemoryCluster[] = [];
    const sortedMemories = [...memories].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );

    let currentCluster: MemoryRecord[] = [];
    let lastTimestamp: number | null = null;
    const timeThreshold = 60 * 60 * 1000; // 1 hour

    for (const memory of sortedMemories) {
      const timestamp = memory.timestamp.getTime();

      if (
        lastTimestamp === null ||
        timestamp - lastTimestamp <= timeThreshold
      ) {
        currentCluster.push(memory);
      } else {
        if (currentCluster.length > 1) {
          clusters.push(this.createCluster(currentCluster, 'temporal'));
        }
        currentCluster = [memory];
      }

      lastTimestamp = timestamp;
    }

    // Add final cluster
    if (currentCluster.length > 1) {
      clusters.push(this.createCluster(currentCluster, 'temporal'));
    }

    return clusters;
  }

  /**
   * Cluster memories by embedding similarity
   */
  private clusterByEmbedding(
    memories: MemoryRecord[],
    _config: MemoryPolicyConfig
  ): MemoryCluster[] {
    const clusters: MemoryCluster[] = [];
    const memoriesWithEmbeddings = memories.filter((m) => m.embedding);

    if (memoriesWithEmbeddings.length < 2) {
      return clusters;
    }

    // Simple K-means clustering
    const k = Math.min(5, Math.floor(memoriesWithEmbeddings.length / 3));
    const clusters_temp = this.kMeansCluster(memoriesWithEmbeddings, k);

    for (const cluster of clusters_temp) {
      if (cluster.length > 1) {
        clusters.push(this.createCluster(cluster, 'embedding'));
      }
    }

    return clusters;
  }

  /**
   * Cluster memories by concepts
   */
  private clusterByConcepts(
    memories: MemoryRecord[],
    config: MemoryPolicyConfig
  ): MemoryCluster[] {
    const clusters: MemoryCluster[] = [];
    const conceptGroups = new Map<string, MemoryRecord[]>();

    // Apply config thresholds
    const _minClusterSize = config.minClusterSize || 2;

    // Group by common tags/concepts
    for (const memory of memories) {
      for (const tag of memory.tags) {
        if (!conceptGroups.has(tag)) {
          conceptGroups.set(tag, []);
        }
        conceptGroups.get(tag)!.push(memory);
      }
    }

    // Create clusters from groups with multiple memories
    for (const [concept, groupMemories] of conceptGroups) {
      if (groupMemories.length > 1) {
        clusters.push(this.createCluster(groupMemories, 'concept', [concept]));
      }
    }

    return clusters;
  }

  /**
   * Create cluster object
   */
  private createCluster(
    memories: MemoryRecord[],
    type: string,
    concepts: string[] = []
  ): MemoryCluster {
    const timestamps = memories.map((m) => m.timestamp.getTime());
    const centroid = this.calculateCentroid(memories);

    return {
      id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      memories,
      centroid,
      cohesionScore: this.calculateCohesion(memories),
      timeRange: {
        start: new Date(Math.min(...timestamps)),
        end: new Date(Math.max(...timestamps)),
      },
      concepts: concepts.length > 0 ? concepts : this.extractConcepts(memories),
    };
  }

  /**
   * Calculate centroid for embedding cluster
   */
  private calculateCentroid(memories: MemoryRecord[]): number[] {
    const embeddings = memories
      .map((m) => m.embedding)
      .filter((e) => e !== undefined) as number[][];

    if (embeddings.length === 0) {
      return [];
    }

    const dimensions = embeddings[0]?.length ?? 0;
    const centroid = new Array(dimensions).fill(0);

    for (const embedding of embeddings) {
      for (let i = 0; i < dimensions; i++) {
        centroid[i]! += embedding[i]!;
      }
    }

    for (let i = 0; i < dimensions; i++) {
      centroid[i] /= embeddings.length;
    }

    return centroid;
  }

  /**
   * Calculate cluster cohesion score
   */
  private calculateCohesion(memories: MemoryRecord[]): number {
    if (memories.length < 2) return 1;

    // Simple cohesion based on content similarity
    let totalSimilarity = 0;
    let comparisons = 0;

    for (let i = 0; i < memories.length; i++) {
      for (let j = i + 1; j < memories.length; j++) {
        const mem1 = memories[i];
        const mem2 = memories[j];
        if (!mem1 || !mem2) continue;
        const sim = this.calculateContentSimilarity(mem1, mem2);
        totalSimilarity += sim;
        comparisons++;
      }
    }

    return comparisons > 0 ? totalSimilarity / comparisons : 0;
  }

  /**
   * Calculate content similarity between memories
   */
  private calculateContentSimilarity(
    memory1: MemoryRecord,
    memory2: MemoryRecord
  ): number {
    const content1 = memory1.content.toLowerCase();
    const content2 = memory2.content.toLowerCase();

    const words1 = new Set(content1.split(/\s+/));
    const words2 = new Set(content2.split(/\s+/));

    const intersection = new Set([...words1].filter((w) => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Extract concepts from memory cluster
   */
  private extractConcepts(memories: MemoryRecord[]): string[] {
    const allTags = memories.flatMap((m) => m.tags);
    const tagCounts = new Map<string, number>();

    for (const tag of allTags) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }

    return Array.from(tagCounts.entries())
      .filter(([, count]) => count > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag]) => tag);
  }

  /**
   * Simple K-means clustering
   */
  private kMeansCluster(memories: MemoryRecord[], k: number): MemoryRecord[][] {
    const embeddings = memories
      .map((m) => m.embedding!)
      .filter((e) => e !== undefined);
    if (embeddings.length < k) return [memories];

    // Initialize centroids randomly
    const centroids: number[][] = [];
    for (let i = 0; i < k; i++) {
      const randomIndex = Math.floor(Math.random() * embeddings.length);
      const embedding = embeddings[randomIndex];
      if (embedding) {
        centroids.push([...embedding]);
      }
    }

    let converged = false;
    let iterations = 0;
    const maxIterations = 10;

    while (!converged && iterations < maxIterations) {
      const clusters: MemoryRecord[][] = Array(k)
        .fill(null)
        .map(() => []);

      // Assign memories to nearest centroid
      for (let i = 0; i < memories.length; i++) {
        const embedding = memories[i]?.embedding ?? [];
        let nearestCentroid = 0;
        let minDistance = Infinity;

        for (let j = 0; j < k; j++) {
          const distance = this.euclideanDistance(embedding, centroids[j]!);
          if (distance < minDistance) {
            minDistance = distance;
            nearestCentroid = j;
          }
        }

        clusters[nearestCentroid]!.push(memories[i]!);
      }

      // Update centroids
      converged = true;
      for (let i = 0; i < k; i++) {
        if (clusters[i]!.length > 0) {
          const newCentroid = this.calculateCentroid(clusters[i]!);
          if (this.euclideanDistance(centroids[i]!, newCentroid) > 0.01) {
            converged = false;
            centroids[i] = newCentroid;
          }
        }
      }

      iterations++;
    }

    // Final assignment
    const finalClusters: MemoryRecord[][] = Array(k)
      .fill(null)
      .map(() => []);
    for (let i = 0; i < memories.length; i++) {
      const embedding = memories[i]?.embedding ?? [];
      let nearestCentroid = 0;
      let minDistance = Infinity;

      for (let j = 0; j < k; j++) {
        const distance = this.euclideanDistance(embedding, centroids[j]!);
        if (distance < minDistance) {
          minDistance = distance;
          nearestCentroid = j;
        }
      }

      finalClusters[nearestCentroid]!.push(memories[i]!);
    }

    return finalClusters.filter((cluster) => cluster.length > 0);
  }

  /**
   * Calculate Euclidean distance between vectors
   */
  private euclideanDistance(vector1: number[], vector2: number[]): number {
    if (vector1.length !== vector2.length) return Infinity;

    let sum = 0;
    for (let i = 0; i < vector1.length; i++) {
      sum += Math.pow(vector1[i]! - vector2[i]!, 2);
    }

    return Math.sqrt(sum);
  }

  /**
   * Create temporal summary
   */
  private createTemporalSummary(cluster: MemoryCluster): string {
    const start = cluster.timeRange.start.toISOString().split('T')[0];
    const end = cluster.timeRange.end.toISOString().split('T')[0];
    const events = cluster.memories.map((m) => m.content).join('; ');

    return `Timeline summary from ${start} to ${end}: ${events}`;
  }

  /**
   * Create cluster summary
   */
  private createClusterSummary(cluster: MemoryCluster): string {
    const themes = cluster.concepts.join(', ');
    const events = cluster.memories.map((m) => m.content).join('; ');

    return `Related memories about ${themes}: ${events}`;
  }

  /**
   * Create conceptual summary
   */
  private createConceptualSummary(cluster: MemoryCluster): string {
    const mainConcepts = cluster.concepts.slice(0, 3).join(', ');
    const events = cluster.memories.map((m) => m.content).join('; ');

    return `Conceptual summary (${mainConcepts}): ${events}`;
  }

  /**
   * Create generic summary
   */
  private createGenericSummary(cluster: MemoryCluster): string {
    const events = cluster.memories.map((m) => m.content).join('; ');
    return `Summary of ${cluster.memories.length} related memories: ${events}`;
  }

  /**
   * Clear caches
   */
  clearCaches(): void {
    this.priorityCache.clear();
  }

  /**
   * Get management statistics
   */
  getStats(): {
    trackedMemories: number;
    cachedPriorities: number;
    totalAccesses: number;
  } {
    const totalAccesses = Array.from(this.accessTracker.values()).reduce(
      (sum, accesses) => sum + accesses.reduce((s, a) => s + a.frequency, 0),
      0
    );

    return {
      trackedMemories: this.accessTracker.size,
      cachedPriorities: this.priorityCache.size,
      totalAccesses,
    };
  }
}
