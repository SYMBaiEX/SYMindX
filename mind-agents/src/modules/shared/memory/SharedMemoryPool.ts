/**
 * Shared Memory Pool for SYMindX
 *
 * Abstract base class providing common shared memory operations for all memory providers
 */

import { MemoryRecord } from '../../../types/agent';
import { SharedMemoryConfig, MemoryPermission } from '../../../types/memory';

export interface PoolConfig {
  poolId: string;
  sharedConfig: SharedMemoryConfig;
  maxPoolSize?: number;
  enableVersioning?: boolean;
  enableConflictResolution?: boolean;
  enablePermissions?: boolean;
}

export interface PoolEntry {
  id: string;
  agentId: string;
  memory: MemoryRecord;
  permissions: MemoryPermission[];
  sharedAt: Date;
  version: number;
  lastAccessedAt: Date;
  accessCount: number;
}

export interface PoolStats {
  poolId: string;
  totalMemories: number;
  sharedBy: number;
  totalAgents: number;
  averageAccessCount: number;
  lastActivity: Date;
  poolSizeBytes: number;
}

export abstract class SharedMemoryPool<TStorage> {
  protected config: PoolConfig;
  protected poolId: string;
  protected entries: Map<string, PoolEntry> = new Map();
  protected agentPermissions: Map<string, Set<MemoryPermission>> = new Map();
  protected accessLog: Array<{
    agentId: string;
    memoryId: string;
    timestamp: Date;
    action: string;
  }> = [];

  constructor(config: PoolConfig) {
    this.config = {
      maxPoolSize: 1000,
      enableVersioning: true,
      enableConflictResolution: true,
      enablePermissions: true,
      ...config,
    };
    this.poolId = config.poolId;
  }

  /**
   * Get the storage instance (database connection, etc.)
   */
  abstract getStorage(): TStorage;

  /**
   * Share a memory in the pool
   */
  async share(
    agentId: string,
    memory: MemoryRecord,
    permissions: MemoryPermission[] = [MemoryPermission.READ]
  ): Promise<void> {
    await this.validatePermissions(agentId, [MemoryPermission.WRITE]);

    const key = `${agentId}:${memory.id}`;

    // Check pool size limit
    if (
      this.config.maxPoolSize &&
      this.entries.size >= this.config.maxPoolSize
    ) {
      await this.evictLeastUsed();
    }

    // Check for existing entry
    const existing = this.entries.get(key);
    if (existing) {
      // Update existing entry
      if (this.config.enableConflictResolution) {
        const resolved = await this.resolveConflict(existing, memory, agentId);
        existing.memory = resolved;
        existing.version += 1;
      } else {
        existing.memory = memory;
      }
      existing.lastAccessedAt = new Date();
      existing.permissions = permissions;
    } else {
      // Create new entry
      const entry: PoolEntry = {
        id: key,
        agentId,
        memory,
        permissions,
        sharedAt: new Date(),
        version: 1,
        lastAccessedAt: new Date(),
        accessCount: 0,
      };
      this.entries.set(key, entry);
    }

    this.logAccess(agentId, memory.id, 'share');
    await this.persistEntry(key);
  }

  /**
   * Get shared memories for an agent
   */
  async getSharedMemories(
    agentId: string,
    permissions: MemoryPermission[] = [MemoryPermission.READ]
  ): Promise<MemoryRecord[]> {
    await this.validatePermissions(agentId, [MemoryPermission.READ]);

    const memories: MemoryRecord[] = [];

    for (const [key, entry] of this.entries) {
      if (this.hasPermissions(entry, permissions)) {
        memories.push(entry.memory);
        entry.lastAccessedAt = new Date();
        entry.accessCount += 1;
        this.logAccess(agentId, entry.memory.id, 'read');
      }
    }

    return this.sortByRelevance(memories, agentId);
  }

  /**
   * Get memories shared by a specific agent
   */
  async getMemoriesSharedBy(agentId: string): Promise<MemoryRecord[]> {
    const memories: MemoryRecord[] = [];

    for (const [key, entry] of this.entries) {
      if (entry.agentId === agentId) {
        memories.push(entry.memory);
        entry.lastAccessedAt = new Date();
        entry.accessCount += 1;
      }
    }

    return memories;
  }

  /**
   * Search shared memories
   */
  async searchSharedMemories(
    agentId: string,
    query: string,
    limit: number = 10
  ): Promise<MemoryRecord[]> {
    await this.validatePermissions(agentId, [MemoryPermission.READ]);

    const lowerQuery = query.toLowerCase();
    const matches: Array<{ memory: MemoryRecord; score: number }> = [];

    for (const [key, entry] of this.entries) {
      if (this.hasPermissions(entry, [MemoryPermission.READ])) {
        const score = this.calculateRelevanceScore(entry.memory, lowerQuery);
        if (score > 0) {
          matches.push({ memory: entry.memory, score });
          entry.lastAccessedAt = new Date();
          entry.accessCount += 1;
          this.logAccess(agentId, entry.memory.id, 'search');
        }
      }
    }

    return matches
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((m) => m.memory);
  }

  /**
   * Update memory permissions
   */
  async updatePermissions(
    agentId: string,
    memoryId: string,
    newPermissions: MemoryPermission[]
  ): Promise<void> {
    await this.validatePermissions(agentId, [MemoryPermission.ADMIN]);

    const key = `${agentId}:${memoryId}`;
    const entry = this.entries.get(key);

    if (entry) {
      entry.permissions = newPermissions;
      entry.lastAccessedAt = new Date();
      this.logAccess(agentId, memoryId, 'update_permissions');
      await this.persistEntry(key);
    }
  }

  /**
   * Remove a memory from the pool
   */
  async unshare(agentId: string, memoryId: string): Promise<void> {
    await this.validatePermissions(agentId, [MemoryPermission.DELETE]);

    const key = `${agentId}:${memoryId}`;
    const entry = this.entries.get(key);

    if (
      entry &&
      (entry.agentId === agentId || (await this.hasAdminPermission(agentId)))
    ) {
      this.entries.delete(key);
      this.logAccess(agentId, memoryId, 'unshare');
      await this.removePersistedEntry(key);
    }
  }

  /**
   * Get memories with specific permissions
   */
  async getMemoriesWithPermission(
    agentId: string,
    permission: MemoryPermission
  ): Promise<MemoryRecord[]> {
    await this.validatePermissions(agentId, [MemoryPermission.READ]);

    const memories: MemoryRecord[] = [];

    for (const [key, entry] of this.entries) {
      if (entry.permissions.includes(permission)) {
        memories.push(entry.memory);
        entry.lastAccessedAt = new Date();
        entry.accessCount += 1;
      }
    }

    return memories;
  }

  /**
   * Get pool statistics
   */
  getStats(): PoolStats {
    const agents = new Set(
      Array.from(this.entries.values()).map((e) => e.agentId)
    );
    const totalAccess = Array.from(this.entries.values()).reduce(
      (sum, e) => sum + e.accessCount,
      0
    );
    const lastActivity = Array.from(this.entries.values()).reduce(
      (latest, e) => (e.lastAccessedAt > latest ? e.lastAccessedAt : latest),
      new Date(0)
    );

    const poolSizeBytes = Array.from(this.entries.values()).reduce(
      (size, e) => size + JSON.stringify(e.memory).length,
      0
    );

    return {
      poolId: this.poolId,
      totalMemories: this.entries.size,
      sharedBy: Array.from(this.entries.values()).filter((e) => e.agentId)
        .length,
      totalAgents: agents.size,
      averageAccessCount:
        this.entries.size > 0 ? totalAccess / this.entries.size : 0,
      lastActivity,
      poolSizeBytes,
    };
  }

  /**
   * Get access history
   */
  getAccessHistory(
    agentId?: string,
    limit: number = 100
  ): Array<{
    agentId: string;
    memoryId: string;
    timestamp: Date;
    action: string;
  }> {
    let history = this.accessLog;

    if (agentId) {
      history = history.filter((log) => log.agentId === agentId);
    }

    return history
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Clean up old or unused entries
   */
  async cleanup(maxAge: number = 30 * 24 * 60 * 60 * 1000): Promise<number> {
    const cutoffDate = new Date(Date.now() - maxAge);
    let cleaned = 0;

    for (const [key, entry] of this.entries) {
      if (entry.lastAccessedAt < cutoffDate && entry.accessCount === 0) {
        this.entries.delete(key);
        await this.removePersistedEntry(key);
        cleaned++;
      }
    }

    // Clean up access log
    this.accessLog = this.accessLog.filter(
      (log) => log.timestamp >= cutoffDate
    );

    return cleaned;
  }

  /**
   * Merge pools (for pool consolidation)
   */
  async merge(otherPool: SharedMemoryPool<TStorage>): Promise<void> {
    const otherStats = otherPool.getStats();

    for (const [key, entry] of otherPool.entries) {
      if (!this.entries.has(key)) {
        this.entries.set(key, entry);
        await this.persistEntry(key);
      } else {
        // Handle conflicts
        const existing = this.entries.get(key)!;
        if (this.config.enableConflictResolution) {
          const resolved = await this.resolveConflict(
            existing,
            entry.memory,
            entry.agentId
          );
          existing.memory = resolved;
          existing.version += 1;
        }
      }
    }

    console.log(
      `Merged pool ${otherStats.poolId} with ${otherStats.totalMemories} memories`
    );
  }

  // ===================================================================
  // PROTECTED HELPER METHODS
  // ===================================================================

  /**
   * Check if entry has required permissions
   */
  protected hasPermissions(
    entry: PoolEntry,
    requiredPermissions: MemoryPermission[]
  ): boolean {
    if (!this.config.enablePermissions) return true;

    return requiredPermissions.every((perm) =>
      entry.permissions.includes(perm)
    );
  }

  /**
   * Validate agent permissions
   */
  protected async validatePermissions(
    agentId: string,
    permissions: MemoryPermission[]
  ): Promise<void> {
    if (!this.config.enablePermissions) return;

    const agentPerms = this.agentPermissions.get(agentId);
    if (!agentPerms) {
      // Set default permissions for new agents
      this.agentPermissions.set(
        agentId,
        new Set([MemoryPermission.READ, MemoryPermission.WRITE])
      );
      return;
    }

    const hasAllPermissions = permissions.every((perm) => agentPerms.has(perm));
    if (!hasAllPermissions) {
      throw new Error(
        `Agent ${agentId} lacks required permissions: ${permissions.join(', ')}`
      );
    }
  }

  /**
   * Check if agent has admin permission
   */
  protected async hasAdminPermission(agentId: string): Promise<boolean> {
    const agentPerms = this.agentPermissions.get(agentId);
    return agentPerms?.has(MemoryPermission.ADMIN) || false;
  }

  /**
   * Calculate relevance score for search
   */
  protected calculateRelevanceScore(
    memory: MemoryRecord,
    query: string
  ): number {
    const content = memory.content.toLowerCase();
    const tags = (memory.tags || []).join(' ').toLowerCase();

    let score = 0;

    // Exact phrase match
    if (content.includes(query)) score += 2;
    if (tags.includes(query)) score += 1.5;

    // Word matches
    const queryWords = query.split(/\s+/);
    for (const word of queryWords) {
      if (content.includes(word)) score += 1;
      if (tags.includes(word)) score += 0.5;
    }

    // Boost recent memories
    const ageInDays =
      (Date.now() - memory.timestamp.getTime()) / (1000 * 60 * 60 * 24);
    if (ageInDays < 7) score += 0.5;

    // Boost important memories
    score += (memory.importance || 0) * 2;

    return score;
  }

  /**
   * Sort memories by relevance to agent
   */
  protected sortByRelevance(
    memories: MemoryRecord[],
    agentId: string
  ): MemoryRecord[] {
    return memories.sort((a, b) => {
      // Prioritize memories from the same agent
      const aFromAgent = a.agentId === agentId ? 1 : 0;
      const bFromAgent = b.agentId === agentId ? 1 : 0;
      if (aFromAgent !== bFromAgent) return bFromAgent - aFromAgent;

      // Then by importance
      const aImportance = a.importance || 0;
      const bImportance = b.importance || 0;
      if (aImportance !== bImportance) return bImportance - aImportance;

      // Then by recency
      return b.timestamp.getTime() - a.timestamp.getTime();
    });
  }

  /**
   * Resolve conflicts between memory versions
   */
  protected async resolveConflict(
    existing: PoolEntry,
    newMemory: MemoryRecord,
    agentId: string
  ): Promise<MemoryRecord> {
    // Simple conflict resolution: keep the more important or more recent memory
    const existingImportance = existing.memory.importance || 0;
    const newImportance = newMemory.importance || 0;

    if (newImportance > existingImportance) {
      return newMemory;
    }

    if (newImportance === existingImportance) {
      return newMemory.timestamp > existing.memory.timestamp
        ? newMemory
        : existing.memory;
    }

    return existing.memory;
  }

  /**
   * Evict least recently used entry to make space
   */
  protected async evictLeastUsed(): Promise<void> {
    let leastUsed: [string, PoolEntry] | null = null;

    for (const [key, entry] of this.entries) {
      if (!leastUsed || entry.lastAccessedAt < leastUsed[1].lastAccessedAt) {
        leastUsed = [key, entry];
      }
    }

    if (leastUsed) {
      console.log(`Evicting least used memory: ${leastUsed[0]}`);
      this.entries.delete(leastUsed[0]);
      await this.removePersistedEntry(leastUsed[0]);
    }
  }

  /**
   * Log access for audit and analytics
   */
  protected logAccess(agentId: string, memoryId: string, action: string): void {
    this.accessLog.push({
      agentId,
      memoryId,
      timestamp: new Date(),
      action,
    });

    // Keep log size manageable
    if (this.accessLog.length > 1000) {
      this.accessLog = this.accessLog.slice(-800);
    }
  }

  // ===================================================================
  // ABSTRACT METHODS - Must be implemented by specific providers
  // ===================================================================

  /**
   * Persist an entry to storage
   */
  protected abstract persistEntry(key: string): Promise<void>;

  /**
   * Remove a persisted entry from storage
   */
  protected abstract removePersistedEntry(key: string): Promise<void>;

  /**
   * Load entries from storage
   */
  abstract loadFromStorage(): Promise<void>;

  /**
   * Save all entries to storage
   */
  abstract saveToStorage(): Promise<void>;
}
