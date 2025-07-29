/**
 * @module core/context/observability/context-versioning
 * @description Context versioning system for tracking context evolution and rollbacks
 */

import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import { createHash } from 'crypto';
import { gzipSync, gunzipSync } from 'zlib';
import type { 
  ContextVersioning,
  ContextVersion,
  ContextDiff,
  ContextChange,
  ContextObservabilityConfig
} from '../../../types/context/context-observability.ts';
import { runtimeLogger } from '../../../utils/logger.ts';

interface VersionStorage {
  contextId: string;
  versions: Map<number, ContextVersion>;
  currentVersion: number;
  tags: Map<string, number[]>; // tag -> version numbers
  branches: Map<string, number>; // branch -> version number
}

/**
 * Context versioning implementation with diff tracking and rollback capabilities
 */
export class ContextVersioningImpl extends EventEmitter implements ContextVersioning {
  private storage = new Map<string, VersionStorage>();
  private config: ContextObservabilityConfig['versioning'];
  private compressionEnabled: boolean;

  constructor(config: ContextObservabilityConfig['versioning']) {
    super();
    this.config = config;
    this.compressionEnabled = config.compressionEnabled;
    
    if (config.enabled) {
      this.startCleanupTimer();
    }
  }

  /**
   * Create a version snapshot of context
   */
  async createVersion(
    contextId: string, 
    description: string, 
    tags: string[] = []
  ): Promise<ContextVersion> {
    if (!this.config.enabled) {
      throw new Error('Context versioning is disabled');
    }

    // Get or create storage for this context
    let storage = this.storage.get(contextId);
    if (!storage) {
      storage = {
        contextId,
        versions: new Map(),
        currentVersion: 0,
        tags: new Map(),
        branches: new Map()
      };
      this.storage.set(contextId, storage);
    }

    const versionNumber = storage.currentVersion + 1;
    const versionId = randomUUID();
    const now = new Date();

    // Get current context data (this would be replaced with actual context data retrieval)
    const contextData = await this.getCurrentContextData(contextId);
    const dataSnapshot = this.compressionEnabled ? 
      this.compressData(contextData) : contextData;

    // Calculate checksum
    const checksum = this.calculateChecksum(contextData);

    // Determine change type
    const changeType = storage.versions.size === 0 ? 'create' : 'update';

    const version: ContextVersion = {
      versionId,
      contextId,
      version: versionNumber,
      parentVersion: storage.currentVersion > 0 ? storage.currentVersion : undefined,
      createdAt: now,
      createdBy: 'system', // In real implementation, this would be the actual user/system
      changeType,
      changeDescription: description,
      dataSnapshot,
      dataSize: Buffer.byteLength(JSON.stringify(contextData)),
      checksum,
      tags: [...tags],
      metadata: {
        compressionEnabled: this.compressionEnabled,
        originalSize: Buffer.byteLength(JSON.stringify(contextData)),
        compressedSize: this.compressionEnabled ? Buffer.byteLength(JSON.stringify(dataSnapshot)) : undefined
      }
    };

    // Store version
    storage.versions.set(versionNumber, version);
    storage.currentVersion = versionNumber;

    // Update tags
    tags.forEach(tag => {
      if (!storage!.tags.has(tag)) {
        storage!.tags.set(tag, []);
      }
      storage!.tags.get(tag)!.push(versionNumber);
    });

    // Clean up old versions if needed
    await this.cleanupOldVersions(contextId);

    runtimeLogger.debug('Context version created', {
      contextId,
      versionId,
      versionNumber,
      description: description.substring(0, 50),
      tags,
      dataSize: version.dataSize,
      changeType
    });

    this.emit('version_created', { contextId, version });

    return version;
  }

  /**
   * Get version history for a context
   */
  async getVersionHistory(contextId: string): Promise<ContextVersion[]> {
    const storage = this.storage.get(contextId);
    if (!storage) {
      return [];
    }

    const versions = Array.from(storage.versions.values())
      .sort((a, b) => b.version - a.version); // Newest first

    runtimeLogger.debug('Version history retrieved', {
      contextId,
      versionCount: versions.length,
      latestVersion: versions[0]?.version
    });

    return versions;
  }

  /**
   * Get specific version by ID
   */
  async getVersion(versionId: string): Promise<ContextVersion | undefined> {
    for (const storage of this.storage.values()) {
      for (const version of storage.versions.values()) {
        if (version.versionId === versionId) {
          runtimeLogger.debug('Version retrieved', {
            versionId,
            contextId: version.contextId,
            versionNumber: version.version
          });
          return version;
        }
      }
    }

    runtimeLogger.warn('Version not found', { versionId });
    return undefined;
  }

  /**
   * Compare two versions and generate diff
   */
  async compareVersions(
    contextId: string, 
    fromVersion: number, 
    toVersion: number
  ): Promise<ContextDiff> {
    const storage = this.storage.get(contextId);
    if (!storage) {
      throw new Error(`Context not found: ${contextId}`);
    }

    const fromVer = storage.versions.get(fromVersion);
    const toVer = storage.versions.get(toVersion);

    if (!fromVer || !toVer) {
      throw new Error(`Version not found: ${!fromVer ? fromVersion : toVersion}`);
    }

    // Decompress data if needed
    const fromData = this.compressionEnabled ? 
      this.decompressData(fromVer.dataSnapshot) : fromVer.dataSnapshot;
    const toData = this.compressionEnabled ? 
      this.decompressData(toVer.dataSnapshot) : toVer.dataSnapshot;

    // Generate changes
    const changes = this.generateChanges(fromData, toData);
    
    // Calculate impact
    const impact = this.calculateImpact(changes);

    const diff: ContextDiff = {
      fromVersion,
      toVersion,
      changes,
      summary: {
        additions: changes.filter(c => c.changeType === 'add').length,
        deletions: changes.filter(c => c.changeType === 'delete').length,
        modifications: changes.filter(c => c.changeType === 'modify').length,
        totalChanges: changes.length
      },
      impact
    };

    runtimeLogger.debug('Version comparison completed', {
      contextId,
      fromVersion,
      toVersion,
      totalChanges: diff.summary.totalChanges,
      impact
    });

    this.emit('versions_compared', { contextId, diff });

    return diff;
  }

  /**
   * Rollback context to a specific version
   */
  async rollbackToVersion(contextId: string, version: number): Promise<void> {
    if (!this.config.enableRollback) {
      throw new Error('Context rollback is disabled');
    }

    const storage = this.storage.get(contextId);
    if (!storage) {
      throw new Error(`Context not found: ${contextId}`);
    }

    const targetVersion = storage.versions.get(version);
    if (!targetVersion) {
      throw new Error(`Version not found: ${version}`);
    }

    // Create backup of current state before rollback
    await this.createVersion(contextId, `Backup before rollback to v${version}`, ['rollback_backup']);

    // Restore data from target version
    const restoredData = this.compressionEnabled ? 
      this.decompressData(targetVersion.dataSnapshot) : targetVersion.dataSnapshot;

    // Apply the restored data (this would be replaced with actual context restoration)
    await this.applyContextData(contextId, restoredData);

    // Create new version for the rollback
    const rollbackVersion = await this.createVersion(
      contextId, 
      `Rollback to version ${version}: ${targetVersion.changeDescription}`,
      ['rollback', `from_v${version}`]
    );

    runtimeLogger.info('Context rolled back', {
      contextId,
      targetVersion: version,
      rollbackVersion: rollbackVersion.version,
      rollbackDescription: targetVersion.changeDescription
    });

    this.emit('rollback_completed', { 
      contextId, 
      targetVersion: version,
      rollbackVersion: rollbackVersion.version
    });
  }

  /**
   * Add tags to a version
   */
  async tagVersion(versionId: string, tags: string[]): Promise<void> {
    const version = await this.getVersion(versionId);
    if (!version) {
      throw new Error(`Version not found: ${versionId}`);
    }

    const storage = this.storage.get(version.contextId);
    if (!storage) {
      throw new Error(`Context storage not found: ${version.contextId}`);
    }

    // Add new tags
    tags.forEach(tag => {
      if (!version.tags.includes(tag)) {
        version.tags.push(tag);
      }

      if (!storage.tags.has(tag)) {
        storage.tags.set(tag, []);
      }
      
      const tagVersions = storage.tags.get(tag)!;
      if (!tagVersions.includes(version.version)) {
        tagVersions.push(version.version);
      }
    });

    runtimeLogger.debug('Version tagged', {
      versionId,
      contextId: version.contextId,
      versionNumber: version.version,
      newTags: tags,
      totalTags: version.tags.length
    });

    this.emit('version_tagged', { versionId, tags });
  }

  /**
   * Clean up old versions based on retention policy
   */
  async cleanupVersions(contextId: string, keepCount: number): Promise<void> {
    const storage = this.storage.get(contextId);
    if (!storage) {
      return;
    }

    const versions = Array.from(storage.versions.entries())
      .sort(([a], [b]) => b - a); // Sort by version number, newest first

    if (versions.length <= keepCount) {
      return; // Nothing to clean up
    }

    const versionsToDelete = versions.slice(keepCount);
    let deletedCount = 0;

    for (const [versionNumber, version] of versionsToDelete) {
      // Don't delete tagged versions unless specifically requested
      if (version.tags.length > 0 && !version.tags.includes('auto_cleanup')) {
        continue;
      }

      storage.versions.delete(versionNumber);
      deletedCount++;

      // Remove from tag indexes
      version.tags.forEach(tag => {
        const tagVersions = storage.tags.get(tag);
        if (tagVersions) {
          const index = tagVersions.indexOf(versionNumber);
          if (index > -1) {
            tagVersions.splice(index, 1);
          }
          if (tagVersions.length === 0) {
            storage.tags.delete(tag);
          }
        }
      });
    }

    if (deletedCount > 0) {
      runtimeLogger.debug('Old versions cleaned up', {
        contextId,
        deletedCount,
        remainingCount: storage.versions.size
      });

      this.emit('versions_cleaned', { contextId, deletedCount });
    }
  }

  /**
   * Get versions by tag
   */
  async getVersionsByTag(contextId: string, tag: string): Promise<ContextVersion[]> {
    const storage = this.storage.get(contextId);
    if (!storage) {
      return [];
    }

    const versionNumbers = storage.tags.get(tag) || [];
    const versions = versionNumbers
      .map(versionNumber => storage.versions.get(versionNumber))
      .filter((version): version is ContextVersion => version !== undefined)
      .sort((a, b) => b.version - a.version);

    runtimeLogger.debug('Versions retrieved by tag', {
      contextId,
      tag,
      versionCount: versions.length
    });

    return versions;
  }

  /**
   * Create a branch from a version
   */
  async createBranch(contextId: string, branchName: string, fromVersion: number): Promise<void> {
    const storage = this.storage.get(contextId);
    if (!storage) {
      throw new Error(`Context not found: ${contextId}`);
    }

    if (storage.branches.has(branchName)) {
      throw new Error(`Branch already exists: ${branchName}`);
    }

    const version = storage.versions.get(fromVersion);
    if (!version) {
      throw new Error(`Version not found: ${fromVersion}`);
    }

    storage.branches.set(branchName, fromVersion);

    runtimeLogger.debug('Branch created', {
      contextId,
      branchName,
      fromVersion
    });

    this.emit('branch_created', { contextId, branchName, fromVersion });
  }

  /**
   * Private helper methods
   */
  
  private async getCurrentContextData(contextId: string): Promise<unknown> {
    // In a real implementation, this would fetch actual context data
    // For now, return mock data
    return {
      contextId,
      timestamp: new Date().toISOString(),
      data: {
        properties: {},
        state: 'active',
        metadata: {}
      }
    };
  }

  private async applyContextData(contextId: string, data: unknown): Promise<void> {
    // In a real implementation, this would apply the data to the actual context
    runtimeLogger.debug('Context data applied', { contextId });
  }

  private compressData(data: unknown): unknown {
    if (!this.compressionEnabled) return data;
    
    try {
      const jsonString = JSON.stringify(data);
      const compressed = gzipSync(Buffer.from(jsonString));
      return {
        __compressed: true,
        data: compressed.toString('base64')
      };
    } catch (error) {
      runtimeLogger.warn('Data compression failed, storing uncompressed', { error });
      return data;
    }
  }

  private decompressData(data: unknown): unknown {
    if (!this.compressionEnabled || !this.isCompressedData(data)) {
      return data;
    }

    try {
      const compressedBuffer = Buffer.from(data.data, 'base64');
      const decompressed = gunzipSync(compressedBuffer);
      return JSON.parse(decompressed.toString());
    } catch (error) {
      runtimeLogger.error('Data decompression failed', { error });
      throw new Error('Failed to decompress version data');
    }
  }

  private isCompressedData(data: unknown): data is { __compressed: true; data: string } {
    return typeof data === 'object' && 
           data !== null && 
           '__compressed' in data && 
           (data as any).__compressed === true;
  }

  private calculateChecksum(data: unknown): string {
    const jsonString = JSON.stringify(data);
    return createHash('sha256').update(jsonString).digest('hex');
  }

  private generateChanges(fromData: unknown, toData: unknown): ContextChange[] {
    const changes: ContextChange[] = [];
    
    // Simple diff algorithm (in production, use a more sophisticated library)
    const fromJson = JSON.stringify(fromData, null, 2);
    const toJson = JSON.stringify(toData, null, 2);
    
    if (fromJson !== toJson) {
      changes.push({
        changeId: randomUUID(),
        changeType: 'modify',
        path: 'root',
        oldValue: fromData,
        newValue: toData,
        impact: 'medium',
        description: 'Context data modified'
      });
    }

    return changes;
  }

  private calculateImpact(changes: ContextChange[]): ContextDiff['impact'] {
    if (changes.length === 0) return 'low';
    
    const highImpactChanges = changes.filter(c => c.impact === 'high').length;
    const totalChanges = changes.length;
    
    if (highImpactChanges > 0) return 'breaking';
    if (totalChanges > 10) return 'high';
    if (totalChanges > 3) return 'medium';
    return 'low';
  }

  private async cleanupOldVersions(contextId: string): Promise<void> {
    if (this.config.maxVersionHistory <= 0) return;
    
    await this.cleanupVersions(contextId, this.config.maxVersionHistory);
  }

  private startCleanupTimer(): void {
    // Run cleanup every hour
    setInterval(async () => {
      for (const contextId of this.storage.keys()) {
        try {
          await this.cleanupOldVersions(contextId);
        } catch (error) {
          runtimeLogger.error('Cleanup failed for context', { contextId, error });
        }
      }
    }, 60 * 60 * 1000); // 1 hour
  }

  /**
   * Get versioning statistics
   */
  getStatistics() {
    const totalVersions = Array.from(this.storage.values())
      .reduce((sum, storage) => sum + storage.versions.size, 0);

    const totalTags = Array.from(this.storage.values())
      .reduce((sum, storage) => sum + storage.tags.size, 0);

    const totalBranches = Array.from(this.storage.values())
      .reduce((sum, storage) => sum + storage.branches.size, 0);

    return {
      totalContexts: this.storage.size,
      totalVersions,
      totalTags,
      totalBranches,
      compressionEnabled: this.compressionEnabled,
      config: this.config
    };
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.storage.clear();
    this.removeAllListeners();
    runtimeLogger.debug('Context versioning disposed');
  }
}