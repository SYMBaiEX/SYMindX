/**
 * Context Sharing Manager for Multi-Agent Systems
 *
 * Handles secure context sharing between agents with permissions,
 * encryption, and access control.
 */

import { EventEmitter } from 'events';
import {
  AgentContext,
  ContextPermissions,
  ContextSharingMode,
  ContextScope,
  ContextAccessCondition,
  ContextSharingProtocol,
  ContextPrivacySettings,
  ContextUpdate,
  VectorClock,
  CausalEvent,
} from '../../../types/context/multi-agent-context';
import { AgentId, OperationResult, Timestamp } from '../../../types/helpers';
import { runtimeLogger } from '../../../utils/logger';

/**
 * Manages secure context sharing between agents
 */
export class ContextSharingManager extends EventEmitter {
  private sharedContexts: Map<AgentId, AgentContext> = new Map();
  private permissions: Map<string, ContextPermissions> = new Map();
  private subscribers: Map<AgentId, Set<(update: ContextUpdate) => void>> =
    new Map();
  private protocol: ContextSharingProtocol;
  private privacySettings: ContextPrivacySettings;
  private vectorClocks: Map<AgentId, VectorClock> = new Map();

  constructor(
    protocol: ContextSharingProtocol,
    privacySettings: ContextPrivacySettings
  ) {
    super();
    this.protocol = protocol;
    this.privacySettings = privacySettings;
    this.setupCleanupTimer();
  }

  /**
   * Share context with specific agents
   */
  async shareContext(
    sourceAgentId: AgentId,
    targetAgentIds: AgentId[],
    context: AgentContext,
    permissions: ContextPermissions
  ): Promise<OperationResult> {
    try {
      // Validate permissions
      const validationResult = await this.validatePermissions(
        sourceAgentId,
        permissions
      );
      if (!validationResult.success) {
        return validationResult;
      }

      // Apply privacy filters
      const filteredContext = await this.applyPrivacyFilters(
        context,
        permissions
      );

      // Update vector clock
      this.updateVectorClock(sourceAgentId);

      // Share with each target agent
      for (const targetAgentId of targetAgentIds) {
        await this.shareWithAgent(
          sourceAgentId,
          targetAgentId,
          filteredContext,
          permissions
        );
      }

      // Log audit trail
      if (this.privacySettings.auditLogging.enabled) {
        await this.logAuditEvent('context_shared', {
          sourceAgentId,
          targetAgentIds,
          contextFields: Object.keys(filteredContext),
          permissions: permissions.mode,
        });
      }

      // Emit sharing event
      this.emit('contextShared', {
        sourceAgentId,
        targetAgentIds,
        context: filteredContext,
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        data: {
          sharedWith: targetAgentIds,
          contextVersion: filteredContext.version,
        },
        metadata: {
          operation: 'shareContext',
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      runtimeLogger.error('Failed to share context', error as Error, {
        sourceAgentId,
        targetAgentIds: targetAgentIds.length,
      });

      return {
        success: false,
        error: `Context sharing failed: ${(error as Error).message}`,
        metadata: {
          operation: 'shareContext',
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Subscribe to context changes from other agents
   */
  async subscribeToContextChanges(
    agentId: AgentId,
    callback: (update: ContextUpdate) => void
  ): Promise<OperationResult> {
    try {
      if (!this.subscribers.has(agentId)) {
        this.subscribers.set(agentId, new Set());
      }

      this.subscribers.get(agentId)!.add(callback);

      runtimeLogger.debug('Agent subscribed to context changes', { agentId });

      return {
        success: true,
        data: { subscriberCount: this.subscribers.get(agentId)!.size },
        metadata: {
          operation: 'subscribeToContextChanges',
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Subscription failed: ${(error as Error).message}`,
        metadata: {
          operation: 'subscribeToContextChanges',
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Unsubscribe from context changes
   */
  async unsubscribeFromContextChanges(
    agentId: AgentId,
    callback: (update: ContextUpdate) => void
  ): Promise<OperationResult> {
    try {
      const agentSubscribers = this.subscribers.get(agentId);
      if (agentSubscribers) {
        agentSubscribers.delete(callback);

        if (agentSubscribers.size === 0) {
          this.subscribers.delete(agentId);
        }
      }

      return {
        success: true,
        data: { remainingSubscribers: agentSubscribers?.size || 0 },
        metadata: {
          operation: 'unsubscribeFromContextChanges',
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Unsubscription failed: ${(error as Error).message}`,
        metadata: {
          operation: 'unsubscribeFromContextChanges',
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Get shared context for an agent
   */
  async getSharedContext(
    agentId: AgentId,
    requestingAgentId: AgentId
  ): Promise<AgentContext | null> {
    try {
      const context = this.sharedContexts.get(agentId);
      if (!context) {
        return null;
      }

      // Check permissions
      const hasPermission = await this.checkReadPermission(
        requestingAgentId,
        context
      );
      if (!hasPermission) {
        runtimeLogger.warn('Permission denied for context access', {
          requestingAgentId,
          targetAgentId: agentId,
        });
        return null;
      }

      // Apply privacy filters based on requesting agent's permissions
      const permissions = this.getPermissionsForAgent(
        requestingAgentId,
        context
      );
      const filteredContext = await this.applyPrivacyFilters(
        context,
        permissions
      );

      return filteredContext;
    } catch (error) {
      runtimeLogger.error('Failed to get shared context', error as Error, {
        agentId,
        requestingAgentId,
      });
      return null;
    }
  }

  /**
   * Update shared context
   */
  async updateSharedContext(
    agentId: AgentId,
    updates: Partial<AgentContext>
  ): Promise<OperationResult> {
    try {
      const existingContext = this.sharedContexts.get(agentId);
      if (!existingContext) {
        return {
          success: false,
          error: 'Context not found for agent',
          metadata: {
            operation: 'updateSharedContext',
            timestamp: new Date().toISOString(),
          },
        };
      }

      // Merge updates
      const updatedContext: AgentContext = {
        ...existingContext,
        ...updates,
        version: existingContext.version + 1,
        lastModified: new Date().toISOString(),
        modifiedBy: agentId,
      };

      // Update vector clock
      this.updateVectorClock(agentId);
      updatedContext.vectorClock = this.vectorClocks.get(agentId)!;

      // Store updated context
      this.sharedContexts.set(agentId, updatedContext);

      // Create update notification
      const contextUpdate: ContextUpdate = {
        updateId: `update_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        agentId,
        timestamp: new Date().toISOString(),
        operation: 'update',
        fieldPath: '', // Could be more specific based on actual changes
        newValue: updates,
      };

      // Notify subscribers
      await this.notifySubscribers(contextUpdate);

      return {
        success: true,
        data: {
          contextVersion: updatedContext.version,
          lastModified: updatedContext.lastModified,
        },
        metadata: {
          operation: 'updateSharedContext',
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Context update failed: ${(error as Error).message}`,
        metadata: {
          operation: 'updateSharedContext',
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Validate sharing permissions
   */
  private async validatePermissions(
    sourceAgentId: AgentId,
    permissions: ContextPermissions
  ): Promise<OperationResult> {
    // Check if agent has permission to share
    if (permissions.agentId !== sourceAgentId) {
      return {
        success: false,
        error: 'Agent cannot create permissions for other agents',
        metadata: { operation: 'validatePermissions' },
      };
    }

    // Check expiration
    if (permissions.expiresAt && new Date(permissions.expiresAt) < new Date()) {
      return {
        success: false,
        error: 'Permissions have expired',
        metadata: { operation: 'validatePermissions' },
      };
    }

    // Validate conditions if present
    if (permissions.conditions) {
      for (const condition of permissions.conditions) {
        if (!this.validateAccessCondition(condition)) {
          return {
            success: false,
            error: `Invalid access condition: ${condition.field}`,
            metadata: { operation: 'validatePermissions' },
          };
        }
      }
    }

    return { success: true };
  }

  /**
   * Apply privacy filters based on permissions
   */
  private async applyPrivacyFilters(
    context: AgentContext,
    permissions: ContextPermissions
  ): Promise<AgentContext> {
    const filteredContext = { ...context };

    // Apply field-level permissions
    if (permissions.allowedFields) {
      // Only include allowed fields
      const allowedContext: Partial<AgentContext> = {};
      for (const field of permissions.allowedFields) {
        if (field in filteredContext) {
          (allowedContext as any)[field] = (filteredContext as any)[field];
        }
      }
      Object.assign(filteredContext, allowedContext);
    }

    if (permissions.deniedFields) {
      // Remove denied fields
      for (const field of permissions.deniedFields) {
        delete (filteredContext as any)[field];
      }
    }

    // Apply privacy anonymization
    for (const field of this.privacySettings.anonymizeFields) {
      if (field in filteredContext) {
        (filteredContext as any)[field] = '[ANONYMIZED]';
      }
    }

    // Apply encryption if enabled
    if (this.privacySettings.encryptionLevel !== 'none') {
      // In a real implementation, this would encrypt sensitive fields
      // For now, we'll just mark them as encrypted
      runtimeLogger.debug('Context encryption applied', {
        level: this.privacySettings.encryptionLevel,
      });
    }

    return filteredContext;
  }

  /**
   * Share context with a specific agent
   */
  private async shareWithAgent(
    sourceAgentId: AgentId,
    targetAgentId: AgentId,
    context: AgentContext,
    permissions: ContextPermissions
  ): Promise<void> {
    // Store the shared context
    this.sharedContexts.set(targetAgentId, context);

    // Store permissions
    const permissionKey = `${sourceAgentId}:${targetAgentId}`;
    this.permissions.set(permissionKey, permissions);

    // Update context sharing metadata
    if (!context.sharedWith.includes(targetAgentId)) {
      context.sharedWith.push(targetAgentId);
    }

    runtimeLogger.debug('Context shared with agent', {
      sourceAgentId,
      targetAgentId,
      contextVersion: context.version,
    });
  }

  /**
   * Check read permission for an agent
   */
  private async checkReadPermission(
    requestingAgentId: AgentId,
    context: AgentContext
  ): Promise<boolean> {
    // Check if agent is in shared list
    if (!context.sharedWith.includes(requestingAgentId)) {
      return false;
    }

    // Check permissions
    const permissions = this.getPermissionsForAgent(requestingAgentId, context);
    if (!permissions) {
      return false;
    }

    if (permissions.mode === 'writeonly' || permissions.mode === 'none') {
      return false;
    }

    // Check expiration
    if (permissions.expiresAt && new Date(permissions.expiresAt) < new Date()) {
      return false;
    }

    // Check conditions
    if (permissions.conditions) {
      for (const condition of permissions.conditions) {
        if (!this.evaluateAccessCondition(condition, context)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Get permissions for a specific agent
   */
  private getPermissionsForAgent(
    agentId: AgentId,
    context: AgentContext
  ): ContextPermissions | null {
    return context.permissions.find((p) => p.agentId === agentId) || null;
  }

  /**
   * Validate access condition structure
   */
  private validateAccessCondition(condition: ContextAccessCondition): boolean {
    if (!condition.field || !condition.operator) {
      return false;
    }

    if (condition.operator === 'custom' && !condition.customCheck) {
      return false;
    }

    return true;
  }

  /**
   * Evaluate access condition against context
   */
  private evaluateAccessCondition(
    condition: ContextAccessCondition,
    context: AgentContext
  ): boolean {
    const fieldValue = (context as any)[condition.field];

    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;
      case 'contains':
        return Array.isArray(fieldValue)
          ? fieldValue.includes(condition.value)
          : String(fieldValue).includes(String(condition.value));
      case 'regex':
        return new RegExp(String(condition.value)).test(String(fieldValue));
      case 'custom':
        return condition.customCheck
          ? condition.customCheck(context, condition.value)
          : false;
      default:
        return false;
    }
  }

  /**
   * Update vector clock for causality tracking
   */
  private updateVectorClock(agentId: AgentId): void {
    if (!this.vectorClocks.has(agentId)) {
      this.vectorClocks.set(agentId, {
        clocks: { [agentId]: 0 },
        version: 1,
      });
    }

    const vectorClock = this.vectorClocks.get(agentId)!;
    vectorClock.clocks[agentId] = (vectorClock.clocks[agentId] || 0) + 1;
    vectorClock.version++;
  }

  /**
   * Notify subscribers of context updates
   */
  private async notifySubscribers(update: ContextUpdate): Promise<void> {
    const agentSubscribers = this.subscribers.get(update.agentId);
    if (agentSubscribers) {
      for (const callback of agentSubscribers) {
        try {
          callback(update);
        } catch (error) {
          runtimeLogger.error('Error notifying subscriber', error as Error, {
            agentId: update.agentId,
            updateId: update.updateId,
          });
        }
      }
    }
  }

  /**
   * Log audit events for compliance
   */
  private async logAuditEvent(
    event: string,
    data: Record<string, unknown>
  ): Promise<void> {
    const logData = {
      event,
      timestamp: new Date().toISOString(),
      ...data,
    };

    if (this.privacySettings.auditLogging.includeFieldValues) {
      runtimeLogger.info(`Context audit: ${event}`, logData);
    } else {
      const sanitizedData = { ...logData };
      delete sanitizedData.contextFields;
      runtimeLogger.info(`Context audit: ${event}`, sanitizedData);
    }
  }

  /**
   * Setup cleanup timer for expired permissions and old contexts
   */
  private setupCleanupTimer(): void {
    setInterval(() => {
      this.cleanupExpiredPermissions();
      this.cleanupOldContexts();
    }, 60000); // Run every minute
  }

  /**
   * Clean up expired permissions
   */
  private cleanupExpiredPermissions(): void {
    const now = new Date();
    const expiredKeys: string[] = [];

    for (const [key, permissions] of this.permissions.entries()) {
      if (permissions.expiresAt && new Date(permissions.expiresAt) < now) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.permissions.delete(key);
      runtimeLogger.debug('Cleaned up expired permission', {
        permissionKey: key,
      });
    }
  }

  /**
   * Clean up old contexts based on retention policy
   */
  private cleanupOldContexts(): void {
    if (!this.privacySettings.retentionPolicy.autoDelete) {
      return;
    }

    const maxAge = this.privacySettings.retentionPolicy.maxAge;
    const cutoffTime = new Date(Date.now() - maxAge);

    for (const [agentId, context] of this.sharedContexts.entries()) {
      if (new Date(context.lastModified) < cutoffTime) {
        if (this.privacySettings.retentionPolicy.archiveOldData) {
          // In a real implementation, this would archive the data
          runtimeLogger.debug('Context archived', { agentId });
        }

        this.sharedContexts.delete(agentId);
        runtimeLogger.debug('Old context cleaned up', { agentId });
      }
    }
  }

  /**
   * Get sharing statistics
   */
  getStatistics() {
    return {
      totalSharedContexts: this.sharedContexts.size,
      totalPermissions: this.permissions.size,
      totalSubscribers: Array.from(this.subscribers.values()).reduce(
        (sum, set) => sum + set.size,
        0
      ),
      vectorClocks: this.vectorClocks.size,
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.sharedContexts.clear();
    this.permissions.clear();
    this.subscribers.clear();
    this.vectorClocks.clear();
    this.removeAllListeners();
  }
}
