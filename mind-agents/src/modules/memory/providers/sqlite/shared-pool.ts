/**
 * Shared Memory Pool for Neon Memory Provider
 *
 * Manages shared memory pools for cross-agent memory sharing
 */

import { MemoryRecord } from '../../../../types/agent';
import { SharedMemoryConfig, MemoryPermission } from '../../../../types/memory';

/**
 * Shared memory pool implementation
 */
export class SharedMemoryPool {
  private poolId: string;
  // Configuration stored for future memory pool features
  private readonly _config: SharedMemoryConfig;
  private memories: Map<string, MemoryRecord> = new Map();
  private permissions: Map<string, MemoryPermission[]> = new Map();

  constructor(poolId: string, config: SharedMemoryConfig) {
    this.poolId = poolId;
    this._config = config;
  }

  /**
   * Share a memory in the pool
   */
  async share(agentId: string, memory: MemoryRecord): Promise<void> {
    const key = `${agentId}:${memory.id}`;
    this.memories.set(key, memory);
    this.permissions.set(key, [MemoryPermission.READ, MemoryPermission.WRITE]);
  }

  /**
   * Get shared memories for an agent
   */
  async getSharedMemories(_agentId: string): Promise<MemoryRecord[]> {
    const memories: MemoryRecord[] = [];

    for (const [key, memory] of Array.from(this.memories.entries())) {
      const permissions = this.permissions.get(key) || [];
      if (permissions.includes(MemoryPermission.READ)) {
        memories.push(memory);
      }
    }

    return memories;
  }

  /**
   * Remove a memory from the pool
   */
  async unshare(agentId: string, memoryId: string): Promise<void> {
    const key = `${agentId}:${memoryId}`;
    this.memories.delete(key);
    this.permissions.delete(key);
  }

  /**
   * Get pool statistics
   */
  getStats(): { poolId: string; totalMemories: number; sharedBy: number } {
    return {
      poolId: this.poolId,
      totalMemories: this.memories.size,
      sharedBy: new Set(
        Array.from(this.memories.keys()).map((k) => k.split(':')[0])
      ).size,
    };
  }
}
