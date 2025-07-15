/**
 * Resource Manager for Agent Lifecycle Management
 * Tracks and manages agent resources for proper cleanup and restoration
 */

import { EventEmitter } from 'events';

import { Logger } from '../utils/logger';

export interface ResourceHandle {
  id: string;
  type: ResourceType;
  agentId: string;
  description: string;
  metadata: any;
  createdAt: Date;
  lastAccessed: Date;
  isActive: boolean;
  cleanup?: () => Promise<void>;
}

export enum ResourceType {
  DATABASE_CONNECTION = 'database_connection',
  FILE_HANDLE = 'file_handle',
  NETWORK_CONNECTION = 'network_connection',
  TIMER = 'timer',
  EVENT_LISTENER = 'event_listener',
  MEMORY_ALLOCATION = 'memory_allocation',
  EXTENSION_RESOURCE = 'extension_resource',
  PORTAL_CONNECTION = 'portal_connection',
  SUBPROCESS = 'subprocess',
  CACHE_ENTRY = 'cache_entry',
}

export interface ResourceManagerConfig {
  maxResourcesPerAgent: number;
  resourceTimeoutMs: number;
  cleanupIntervalMs: number;
  trackMemoryUsage: boolean;
  enableResourceLogging: boolean;
}

export interface ResourceSnapshot {
  agentId: string;
  timestamp: Date;
  resources: ResourceHandle[];
  summary: {
    totalResources: number;
    activeResources: number;
    resourcesByType: Record<ResourceType, number>;
    memoryUsage?: number;
  };
}

export class ResourceManager extends EventEmitter {
  private logger: Logger;
  private config: ResourceManagerConfig;
  private resources: Map<string, ResourceHandle> = new Map();
  private agentResources: Map<string, Set<string>> = new Map();
  private cleanupTimer?: ReturnType<typeof setTimeout>;
  private resourceCounter = 0;

  constructor(config: ResourceManagerConfig) {
    super();
    this.config = config;
    this.logger = new Logger('ResourceManager');

    if (config.cleanupIntervalMs > 0) {
      this.startCleanupTimer();
    }
  }

  /**
   * Register a new resource for an agent
   */
  async registerResource(
    agentId: string,
    type: ResourceType,
    description: string,
    metadata: any = {},
    cleanup?: () => Promise<void>
  ): Promise<string> {
    const resourceId = `${agentId}_${type}_${++this.resourceCounter}_${Date.now()}`;

    const handle: ResourceHandle = {
      id: resourceId,
      type,
      agentId,
      description,
      metadata,
      createdAt: new Date(),
      lastAccessed: new Date(),
      isActive: true,
    };

    if (cleanup) {
      handle.cleanup = cleanup;
    }

    this.resources.set(resourceId, handle);

    // Track by agent
    if (!this.agentResources.has(agentId)) {
      this.agentResources.set(agentId, new Set());
    }
    this.agentResources.get(agentId)!.add(resourceId);

    // Check resource limits
    const agentResourceCount = this.agentResources.get(agentId)!.size;
    if (agentResourceCount > this.config.maxResourcesPerAgent) {
      this.logger.warn(
        `Agent ${agentId} has ${agentResourceCount} resources (max: ${this.config.maxResourcesPerAgent})`
      );
      this.emit('resource_limit_exceeded', {
        agentId,
        count: agentResourceCount,
      });
    }

    if (this.config.enableResourceLogging) {
      this.logger.debug(`Registered resource ${resourceId}`, {
        agentId,
        type,
        description,
      });
    }

    this.emit('resource_registered', { resourceId, agentId, type });

    return resourceId;
  }

  /**
   * Update resource access time
   */
  updateResourceAccess(resourceId: string): void {
    const resource = this.resources.get(resourceId);
    if (resource) {
      resource.lastAccessed = new Date();
    }
  }

  /**
   * Mark resource as inactive but keep tracking it
   */
  async deactivateResource(resourceId: string): Promise<boolean> {
    const resource = this.resources.get(resourceId);
    if (!resource) {
      return false;
    }

    resource.isActive = false;

    if (this.config.enableResourceLogging) {
      this.logger.debug(`Deactivated resource ${resourceId}`, {
        agentId: resource.agentId,
        type: resource.type,
      });
    }

    this.emit('resource_deactivated', {
      resourceId,
      agentId: resource.agentId,
    });

    return true;
  }

  /**
   * Unregister and cleanup a specific resource
   */
  async unregisterResource(resourceId: string): Promise<boolean> {
    const resource = this.resources.get(resourceId);
    if (!resource) {
      return false;
    }

    try {
      // Call cleanup function if provided
      if (resource.cleanup) {
        await resource.cleanup();
      }

      // Remove from tracking
      this.resources.delete(resourceId);
      this.agentResources.get(resource.agentId)?.delete(resourceId);

      if (this.config.enableResourceLogging) {
        this.logger.debug(`Unregistered resource ${resourceId}`, {
          agentId: resource.agentId,
          type: resource.type,
        });
      }

      this.emit('resource_unregistered', {
        resourceId,
        agentId: resource.agentId,
      });

      return true;
    } catch (error) {
      this.logger.error(`Failed to cleanup resource ${resourceId}:`, error);
      this.emit('resource_cleanup_failed', {
        resourceId,
        agentId: resource.agentId,
        error,
      });
      return false;
    }
  }

  /**
   * Cleanup all resources for a specific agent
   */
  async cleanupAgentResources(agentId: string): Promise<CleanupResult> {
    const agentResourceIds = this.agentResources.get(agentId);
    if (!agentResourceIds) {
      return { success: 0, failed: 0, errors: [] };
    }

    const result: CleanupResult = { success: 0, failed: 0, errors: [] };

    this.logger.info(
      `Cleaning up ${agentResourceIds.size} resources for agent ${agentId}`
    );

    for (const resourceId of Array.from(agentResourceIds)) {
      try {
        const success = await this.unregisterResource(resourceId);
        if (success) {
          result.success++;
        } else {
          result.failed++;
          result.errors.push(`Resource ${resourceId} not found`);
        }
      } catch (error) {
        result.failed++;
        result.errors.push(`Failed to cleanup ${resourceId}: ${error}`);
      }
    }

    // Clear agent resource tracking
    this.agentResources.delete(agentId);

    this.logger.info(`Cleanup completed for agent ${agentId}`, {
      success: result.success,
      failed: result.failed,
    });

    this.emit('agent_cleanup_completed', { agentId, result });

    return result;
  }

  /**
   * Get current resource snapshot for an agent
   */
  getAgentResourceSnapshot(agentId: string): ResourceSnapshot {
    const agentResourceIds = this.agentResources.get(agentId) || new Set();
    const resources: ResourceHandle[] = [];
    const resourcesByType: Record<ResourceType, number> = {} as any;
    let activeCount = 0;

    for (const resourceId of agentResourceIds) {
      const resource = this.resources.get(resourceId);
      if (resource) {
        resources.push(resource);
        resourcesByType[resource.type] =
          (resourcesByType[resource.type] || 0) + 1;
        if (resource.isActive) {
          activeCount++;
        }
      }
    }

    const snapshot: ResourceSnapshot = {
      agentId,
      timestamp: new Date(),
      resources,
      summary: {
        totalResources: resources.length,
        activeResources: activeCount,
        resourcesByType,
      },
    };

    if (this.config.trackMemoryUsage) {
      snapshot.summary.memoryUsage = this.estimateMemoryUsage(agentId);
    }

    return snapshot;
  }

  /**
   * Get resources by type across all agents
   */
  getResourcesByType(type: ResourceType): ResourceHandle[] {
    return Array.from(this.resources.values()).filter(
      (resource) => resource.type === type
    );
  }

  /**
   * Get stale resources that haven't been accessed recently
   */
  getStaleResources(
    maxAgeMs: number = this.config.resourceTimeoutMs
  ): ResourceHandle[] {
    const cutoff = Date.now() - maxAgeMs;
    return Array.from(this.resources.values()).filter(
      (resource) => resource.lastAccessed.getTime() < cutoff
    );
  }

  /**
   * Cleanup stale resources across all agents
   */
  async cleanupStaleResources(): Promise<CleanupResult> {
    const staleResources = this.getStaleResources();
    const result: CleanupResult = { success: 0, failed: 0, errors: [] };

    if (staleResources.length === 0) {
      return result;
    }

    this.logger.info(`Cleaning up ${staleResources.length} stale resources`);

    for (const resource of staleResources) {
      try {
        const success = await this.unregisterResource(resource.id);
        if (success) {
          result.success++;
        } else {
          result.failed++;
        }
      } catch (error) {
        result.failed++;
        result.errors.push(
          `Failed to cleanup stale resource ${resource.id}: ${error}`
        );
      }
    }

    this.logger.info(`Stale resource cleanup completed`, {
      success: result.success,
      failed: result.failed,
    });

    return result;
  }

  /**
   * Get comprehensive resource health report
   */
  getHealthReport(): ResourceHealthReport {
    const totalResources = this.resources.size;
    const totalAgents = this.agentResources.size;
    const staleResources = this.getStaleResources();
    const resourcesByType: Record<ResourceType, number> = {} as any;
    let activeResources = 0;

    for (const resource of this.resources.values()) {
      resourcesByType[resource.type] =
        (resourcesByType[resource.type] || 0) + 1;
      if (resource.isActive) {
        activeResources++;
      }
    }

    const memoryUsage = this.config.trackMemoryUsage
      ? process.memoryUsage()
      : undefined;

    const report: ResourceHealthReport = {
      timestamp: new Date(),
      totalResources,
      activeResources,
      staleResources: staleResources.length,
      totalAgents,
      resourcesByType,
      health: this.calculateHealthScore(
        totalResources,
        staleResources.length,
        activeResources
      ),
    };

    if (memoryUsage) {
      report.memoryUsage = memoryUsage;
    }

    return report;
  }

  /**
   * Shutdown resource manager and cleanup all resources
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down resource manager...');

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      delete this.cleanupTimer;
    }

    const totalResources = this.resources.size;
    if (totalResources > 0) {
      this.logger.info(`Cleaning up ${totalResources} remaining resources`);

      // Cleanup all agents
      const agentIds = Array.from(this.agentResources.keys());
      for (const agentId of agentIds) {
        await this.cleanupAgentResources(agentId);
      }
    }

    this.logger.info('Resource manager shutdown complete');
  }

  // Private methods

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(async () => {
      try {
        await this.cleanupStaleResources();
      } catch (error) {
        this.logger.error('Error during automatic cleanup:', error);
      }
    }, this.config.cleanupIntervalMs);
  }

  private estimateMemoryUsage(agentId: string): number {
    // Simplified memory estimation
    const agentResourceIds = this.agentResources.get(agentId) || new Set();
    let memoryEstimate = 0;

    for (const resourceId of agentResourceIds) {
      const resource = this.resources.get(resourceId);
      if (resource) {
        // Basic estimation based on resource type
        switch (resource.type) {
          case ResourceType.DATABASE_CONNECTION:
            memoryEstimate += 1024 * 100; // 100KB per connection
            break;
          case ResourceType.MEMORY_ALLOCATION:
            memoryEstimate += resource.metadata.size || 1024;
            break;
          case ResourceType.CACHE_ENTRY:
            memoryEstimate += resource.metadata.size || 1024 * 10;
            break;
          default:
            memoryEstimate += 1024; // 1KB default
        }
      }
    }

    return memoryEstimate;
  }

  private calculateHealthScore(
    total: number,
    stale: number,
    active: number
  ): number {
    if (total === 0) return 1.0;

    const staleRatio = stale / total;
    const activeRatio = active / total;

    // Health score: high active ratio is good, high stale ratio is bad
    return Math.max(0, activeRatio - staleRatio * 0.5);
  }

  /**
   * Allocate resources for an agent (required by state recovery)
   */
  async allocateResources(
    agentId: string,
    requirements: Record<string, any>
  ): Promise<any> {
    const resourceId = await this.registerResource(
      agentId,
      ResourceType.MEMORY_ALLOCATION,
      `Resource allocation for agent ${agentId}`,
      requirements
    );

    return {
      success: true,
      resourceId,
      timestamp: new Date(),
      metadata: requirements,
    };
  }

  /**
   * Release resources for an agent (required by state recovery)
   */
  async releaseResources(agentId: string): Promise<any> {
    await this.cleanupAgentResources(agentId);

    return {
      success: true,
      timestamp: new Date(),
      agentId,
    };
  }

  /**
   * Check resource availability (required by state recovery)
   */
  async checkAvailability(
    type: string,
    requirements?: Record<string, any>
  ): Promise<boolean> {
    // Check availability based on resource type and requirements
    const totalResources = this.resources.size;
    const maxResources = this.config.maxResourcesPerAgent * 10; // Assume 10 agents max

    // Check basic capacity
    if (totalResources >= maxResources) {
      return false;
    }

    // Check type-specific availability
    if (type === 'memory' && requirements?.memoryMB) {
      const currentMemoryUsage = process.memoryUsage().heapUsed / 1024 / 1024;
      const requiredMemory = requirements.memoryMB;
      return currentMemoryUsage + requiredMemory < 1024; // 1GB limit
    }

    if (type === 'processing' && requirements?.cpuTime) {
      // Simple CPU availability check
      return requirements.cpuTime < 5000; // Max 5 seconds
    }

    // Default to available if no specific requirements
    return true;
  }

  /**
   * Get current resource usage (required by state recovery)
   */
  async getCurrentUsage(agentId?: string): Promise<Record<string, any>> {
    if (agentId) {
      const agentResourceIds = this.agentResources.get(agentId) || new Set();
      const memoryUsage = this.estimateMemoryUsage(agentId);

      return {
        agentId,
        resourceCount: agentResourceIds.size,
        memoryUsage,
        resources: Array.from(agentResourceIds)
          .map((id) => this.resources.get(id))
          .filter(Boolean),
      };
    } else {
      return {
        totalResources: this.resources.size,
        totalAgents: this.agentResources.size,
        memoryUsage: process.memoryUsage(),
      };
    }
  }
}

export interface CleanupResult {
  success: number;
  failed: number;
  errors: string[];
}

export interface ResourceHealthReport {
  timestamp: Date;
  totalResources: number;
  activeResources: number;
  staleResources: number;
  totalAgents: number;
  resourcesByType: Record<ResourceType, number>;
  memoryUsage?: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
    arrayBuffers: number;
  };
  health: number; // 0-1 score
}
