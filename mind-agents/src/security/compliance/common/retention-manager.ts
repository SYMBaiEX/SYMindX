/**
 * Data Retention Policy Manager
 *
 * Manages data retention policies across GDPR, HIPAA, and SOX requirements
 * Provides automated data lifecycle management
 */

import {
  RetentionPolicy,
  DataClassification,
  AuditEntry,
} from '../../../types/compliance.js';
import { MemoryProvider } from '../../../types/memory.js';
import { runtimeLogger } from '../../../utils/logger.js';
import { EventEmitter } from 'events';

export interface RetentionSchedule {
  id: string;
  policyId: string;
  dataId: string;
  dataType: string;
  createdAt: Date;
  expiresAt: Date;
  action: 'delete' | 'archive' | 'anonymize';
  status: 'pending' | 'executed' | 'on_hold';
  legalHold?: boolean;
  lastChecked?: Date;
}

export interface RetentionReport {
  totalPolicies: number;
  activePolicies: number;
  scheduledActions: number;
  executedActions: number;
  onHoldActions: number;
  upcomingExpirations: RetentionSchedule[];
  overdueActions: RetentionSchedule[];
  policyCompliance: {
    compliant: number;
    nonCompliant: number;
    percentage: number;
  };
}

export class RetentionManager extends EventEmitter {
  private memoryProvider: MemoryProvider;
  private policies: Map<string, RetentionPolicy> = new Map();
  private schedules: Map<string, RetentionSchedule> = new Map();
  private isRunning: boolean = false;
  private checkInterval: NodeJS.Timeout | null = null;

  constructor(memoryProvider: MemoryProvider) {
    super();
    this.memoryProvider = memoryProvider;
    this.initializeDefaultPolicies();
    this.loadExistingData();
  }

  private initializeDefaultPolicies(): void {
    // GDPR retention policies
    this.addPolicy({
      id: 'gdpr_personal_data',
      name: 'GDPR Personal Data Retention',
      dataType: 'personal_data',
      retentionPeriod: 730, // 2 years in days
      action: 'delete',
      legalHold: false,
    });

    this.addPolicy({
      id: 'gdpr_consent_records',
      name: 'GDPR Consent Records',
      dataType: 'consent_record',
      retentionPeriod: 2555, // 7 years (for legal purposes)
      action: 'archive',
      legalHold: false,
    });

    // HIPAA retention policies
    this.addPolicy({
      id: 'hipaa_phi_general',
      name: 'HIPAA PHI General Retention',
      dataType: 'phi',
      retentionPeriod: 2190, // 6 years
      action: 'archive',
      legalHold: false,
    });

    this.addPolicy({
      id: 'hipaa_audit_logs',
      name: 'HIPAA Audit Logs',
      dataType: 'hipaa_audit_log',
      retentionPeriod: 2190, // 6 years
      action: 'archive',
      legalHold: true, // Cannot be deleted
    });

    // SOX retention policies
    this.addPolicy({
      id: 'sox_financial_records',
      name: 'SOX Financial Records',
      dataType: 'financial_data',
      retentionPeriod: 2555, // 7 years
      action: 'archive',
      legalHold: true,
    });

    this.addPolicy({
      id: 'sox_audit_trail',
      name: 'SOX Audit Trail',
      dataType: 'sox_audit_log',
      retentionPeriod: 2555, // 7 years
      action: 'archive',
      legalHold: true,
    });

    this.addPolicy({
      id: 'sox_change_records',
      name: 'SOX Change Management Records',
      dataType: 'change_request',
      retentionPeriod: 2555, // 7 years
      action: 'archive',
      legalHold: false,
    });

    // General system policies
    this.addPolicy({
      id: 'system_logs',
      name: 'System Logs',
      dataType: 'system_log',
      retentionPeriod: 365, // 1 year
      action: 'delete',
      legalHold: false,
    });

    this.addPolicy({
      id: 'temporary_data',
      name: 'Temporary Data',
      dataType: 'temporary',
      retentionPeriod: 30, // 30 days
      action: 'delete',
      legalHold: false,
    });
  }

  private async loadExistingData(): Promise<void> {
    try {
      // Load retention policies
      const policyMemories = await this.memoryProvider.getMemories('system', {
        type: 'retention_policy',
      });

      for (const memory of policyMemories) {
        const policy = JSON.parse(memory.content);
        this.policies.set(policy.id, policy);
      }

      // Load retention schedules
      const scheduleMemories = await this.memoryProvider.getMemories('system', {
        type: 'retention_schedule',
      });

      for (const memory of scheduleMemories) {
        const schedule = JSON.parse(memory.content);
        this.schedules.set(schedule.id, schedule);
      }

      runtimeLogger.info('Retention data loaded', {
        policies: this.policies.size,
        schedules: this.schedules.size,
      });
    } catch (error) {
      runtimeLogger.error('Failed to load retention data', { error });
    }
  }

  /**
   * Add a retention policy
   */
  addPolicy(policy: RetentionPolicy): void {
    this.policies.set(policy.id, policy);
    this.storePolicy(policy);

    runtimeLogger.info('Retention policy added', {
      policyId: policy.id,
      dataType: policy.dataType,
      retentionDays: policy.retentionPeriod,
    });

    this.emit('policyAdded', policy);
  }

  /**
   * Remove a retention policy
   */
  removePolicy(policyId: string): void {
    const policy = this.policies.get(policyId);
    if (policy) {
      this.policies.delete(policyId);

      // Remove associated schedules
      const associatedSchedules = Array.from(this.schedules.values()).filter(
        (schedule) => schedule.policyId === policyId
      );

      for (const schedule of associatedSchedules) {
        this.schedules.delete(schedule.id);
      }

      runtimeLogger.info('Retention policy removed', { policyId });
      this.emit('policyRemoved', {
        policyId,
        affectedSchedules: associatedSchedules.length,
      });
    }
  }

  /**
   * Get all retention policies
   */
  getPolicies(): RetentionPolicy[] {
    return Array.from(this.policies.values());
  }

  /**
   * Get policy by ID
   */
  getPolicy(policyId: string): RetentionPolicy | undefined {
    return this.policies.get(policyId);
  }

  /**
   * Schedule data for retention action
   */
  async scheduleRetention(
    dataId: string,
    dataType: string,
    createdAt: Date,
    metadata?: any
  ): Promise<void> {
    try {
      // Find applicable policy
      const policy = this.findApplicablePolicy(dataType, metadata);
      if (!policy) {
        runtimeLogger.warn('No retention policy found for data type', {
          dataId,
          dataType,
        });
        return;
      }

      const expiresAt = new Date(
        createdAt.getTime() + policy.retentionPeriod * 24 * 60 * 60 * 1000
      );

      const schedule: RetentionSchedule = {
        id: `retention_${dataId}_${Date.now()}`,
        policyId: policy.id,
        dataId,
        dataType,
        createdAt,
        expiresAt,
        action: policy.action,
        status: 'pending',
        legalHold: policy.legalHold,
      };

      this.schedules.set(schedule.id, schedule);
      await this.storeSchedule(schedule);

      runtimeLogger.debug('Retention scheduled', {
        scheduleId: schedule.id,
        dataId,
        expiresAt,
        action: schedule.action,
      });

      this.emit('retentionScheduled', schedule);
    } catch (error) {
      runtimeLogger.error('Failed to schedule retention', {
        dataId,
        dataType,
        error,
      });
      throw error;
    }
  }

  /**
   * Apply legal hold to data
   */
  async applyLegalHold(dataId: string, reason: string): Promise<void> {
    try {
      const affectedSchedules = Array.from(this.schedules.values()).filter(
        (schedule) => schedule.dataId === dataId
      );

      for (const schedule of affectedSchedules) {
        schedule.legalHold = true;
        schedule.status = 'on_hold';
        await this.updateSchedule(schedule);
      }

      await this.logAuditEntry({
        userId: 'system',
        action: 'legal_hold_applied',
        resource: 'retention_schedule',
        resourceId: dataId,
        details: { reason, affectedSchedules: affectedSchedules.length },
        result: 'success',
      });

      runtimeLogger.info('Legal hold applied', {
        dataId,
        reason,
        affectedSchedules: affectedSchedules.length,
      });
      this.emit('legalHoldApplied', { dataId, reason, affectedSchedules });
    } catch (error) {
      runtimeLogger.error('Failed to apply legal hold', {
        dataId,
        reason,
        error,
      });
      throw error;
    }
  }

  /**
   * Remove legal hold from data
   */
  async removeLegalHold(dataId: string, reason: string): Promise<void> {
    try {
      const affectedSchedules = Array.from(this.schedules.values()).filter(
        (schedule) => schedule.dataId === dataId && schedule.legalHold
      );

      for (const schedule of affectedSchedules) {
        const policy = this.policies.get(schedule.policyId);
        if (policy && !policy.legalHold) {
          // Only remove if policy doesn't require permanent hold
          schedule.legalHold = false;
          schedule.status = 'pending';
          await this.updateSchedule(schedule);
        }
      }

      await this.logAuditEntry({
        userId: 'system',
        action: 'legal_hold_removed',
        resource: 'retention_schedule',
        resourceId: dataId,
        details: { reason, affectedSchedules: affectedSchedules.length },
        result: 'success',
      });

      runtimeLogger.info('Legal hold removed', {
        dataId,
        reason,
        affectedSchedules: affectedSchedules.length,
      });
      this.emit('legalHoldRemoved', { dataId, reason, affectedSchedules });
    } catch (error) {
      runtimeLogger.error('Failed to remove legal hold', {
        dataId,
        reason,
        error,
      });
      throw error;
    }
  }

  /**
   * Start automated retention processing
   */
  startAutomatedProcessing(intervalMinutes: number = 60): void {
    if (this.isRunning) {
      runtimeLogger.warn('Retention processing already running');
      return;
    }

    this.isRunning = true;
    this.checkInterval = setInterval(
      async () => {
        await this.processRetentionActions();
      },
      intervalMinutes * 60 * 1000
    );

    runtimeLogger.info('Automated retention processing started', {
      intervalMinutes,
    });
    this.emit('processingStarted', { intervalMinutes });
  }

  /**
   * Stop automated retention processing
   */
  stopAutomatedProcessing(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    this.isRunning = false;
    runtimeLogger.info('Automated retention processing stopped');
    this.emit('processingStopped');
  }

  /**
   * Process pending retention actions
   */
  async processRetentionActions(): Promise<void> {
    try {
      const now = new Date();
      const pendingSchedules = Array.from(this.schedules.values()).filter(
        (schedule) =>
          schedule.status === 'pending' &&
          schedule.expiresAt <= now &&
          !schedule.legalHold
      );

      runtimeLogger.info('Processing retention actions', {
        pendingCount: pendingSchedules.length,
      });

      for (const schedule of pendingSchedules) {
        await this.executeRetentionAction(schedule);
      }

      this.emit('retentionProcessed', {
        processedCount: pendingSchedules.length,
      });
    } catch (error) {
      runtimeLogger.error('Failed to process retention actions', { error });
      this.emit('retentionError', { error: error.message });
    }
  }

  /**
   * Execute a specific retention action
   */
  private async executeRetentionAction(
    schedule: RetentionSchedule
  ): Promise<void> {
    try {
      runtimeLogger.info('Executing retention action', {
        scheduleId: schedule.id,
        dataId: schedule.dataId,
        action: schedule.action,
      });

      switch (schedule.action) {
        case 'delete':
          await this.deleteData(schedule.dataId);
          break;
        case 'archive':
          await this.archiveData(schedule.dataId);
          break;
        case 'anonymize':
          await this.anonymizeData(schedule.dataId);
          break;
        default:
          throw new Error(`Unknown retention action: ${schedule.action}`);
      }

      schedule.status = 'executed';
      schedule.lastChecked = new Date();
      await this.updateSchedule(schedule);

      await this.logAuditEntry({
        userId: 'system',
        action: `retention_${schedule.action}`,
        resource: 'data',
        resourceId: schedule.dataId,
        details: {
          scheduleId: schedule.id,
          policyId: schedule.policyId,
          dataType: schedule.dataType,
        },
        result: 'success',
      });

      this.emit('retentionActionExecuted', schedule);
    } catch (error) {
      runtimeLogger.error('Failed to execute retention action', {
        scheduleId: schedule.id,
        error,
      });

      await this.logAuditEntry({
        userId: 'system',
        action: `retention_${schedule.action}`,
        resource: 'data',
        resourceId: schedule.dataId,
        details: {
          scheduleId: schedule.id,
          error: error.message,
        },
        result: 'failure',
        errorMessage: error.message,
      });

      this.emit('retentionActionFailed', { schedule, error: error.message });
    }
  }

  private async deleteData(dataId: string): Promise<void> {
    // Check if this is a memory record
    const memories = await this.memoryProvider.getMemories('system');
    const targetMemory = memories.find((m) => m.id === dataId);

    if (targetMemory) {
      await this.memoryProvider.deleteMemory(dataId);
      runtimeLogger.debug('Memory deleted', { dataId });
    } else {
      runtimeLogger.warn('Data not found for deletion', { dataId });
    }
  }

  private async archiveData(dataId: string): Promise<void> {
    // For archiving, we'll add an archive flag to the metadata
    const memories = await this.memoryProvider.getMemories('system');
    const targetMemory = memories.find((m) => m.id === dataId);

    if (targetMemory) {
      const archivedMemory = {
        ...targetMemory,
        metadata: {
          ...targetMemory.metadata,
          archived: true,
          archivedAt: new Date().toISOString(),
        },
      };

      await this.memoryProvider.storeMemory(archivedMemory);
      runtimeLogger.debug('Data archived', { dataId });
    } else {
      runtimeLogger.warn('Data not found for archiving', { dataId });
    }
  }

  private async anonymizeData(dataId: string): Promise<void> {
    const memories = await this.memoryProvider.getMemories('system');
    const targetMemory = memories.find((m) => m.id === dataId);

    if (targetMemory) {
      // Simple anonymization - replace content with anonymized version
      const anonymizedMemory = {
        ...targetMemory,
        content: this.anonymizeContent(targetMemory.content),
        metadata: {
          ...targetMemory.metadata,
          anonymized: true,
          anonymizedAt: new Date().toISOString(),
        },
      };

      await this.memoryProvider.storeMemory(anonymizedMemory);
      runtimeLogger.debug('Data anonymized', { dataId });
    } else {
      runtimeLogger.warn('Data not found for anonymization', { dataId });
    }
  }

  private anonymizeContent(content: string): string {
    // Basic anonymization patterns
    return content
      .replace(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, '[NAME]')
      .replace(
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        '[EMAIL]'
      )
      .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE]')
      .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]')
      .replace(/\$[\d,]+\.?\d*/g, '[AMOUNT]');
  }

  /**
   * Get retention report
   */
  async getRetentionReport(): Promise<RetentionReport> {
    const now = new Date();
    const schedules = Array.from(this.schedules.values());

    const upcomingExpirations = schedules
      .filter(
        (s) =>
          s.status === 'pending' &&
          s.expiresAt > now &&
          s.expiresAt <= new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      )
      .sort((a, b) => a.expiresAt.getTime() - b.expiresAt.getTime())
      .slice(0, 10);

    const overdueActions = schedules.filter(
      (s) => s.status === 'pending' && s.expiresAt <= now && !s.legalHold
    );

    const totalSchedules = schedules.length;
    const compliantSchedules = schedules.filter(
      (s) => s.status === 'executed' || s.expiresAt > now || s.legalHold
    ).length;

    return {
      totalPolicies: this.policies.size,
      activePolicies: Array.from(this.policies.values()).filter(
        (p) => !p.legalHold
      ).length,
      scheduledActions: schedules.filter((s) => s.status === 'pending').length,
      executedActions: schedules.filter((s) => s.status === 'executed').length,
      onHoldActions: schedules.filter((s) => s.status === 'on_hold').length,
      upcomingExpirations,
      overdueActions,
      policyCompliance: {
        compliant: compliantSchedules,
        nonCompliant: totalSchedules - compliantSchedules,
        percentage:
          totalSchedules > 0
            ? (compliantSchedules / totalSchedules) * 100
            : 100,
      },
    };
  }

  /**
   * Get schedules for specific data
   */
  getSchedulesForData(dataId: string): RetentionSchedule[] {
    return Array.from(this.schedules.values()).filter(
      (schedule) => schedule.dataId === dataId
    );
  }

  // Private helper methods

  private findApplicablePolicy(
    dataType: string,
    metadata?: any
  ): RetentionPolicy | undefined {
    // First, try exact match
    let policy = Array.from(this.policies.values()).find(
      (p) => p.dataType === dataType
    );

    if (policy) return policy;

    // Try pattern matching based on metadata
    if (metadata?.type) {
      policy = Array.from(this.policies.values()).find(
        (p) => p.dataType === metadata.type
      );

      if (policy) return policy;
    }

    // Try category-based matching
    if (dataType.includes('audit')) {
      return Array.from(this.policies.values()).find((p) =>
        p.dataType.includes('audit_log')
      );
    }

    if (dataType.includes('financial')) {
      return Array.from(this.policies.values()).find((p) =>
        p.dataType.includes('financial')
      );
    }

    if (dataType.includes('personal') || dataType.includes('user')) {
      return Array.from(this.policies.values()).find((p) =>
        p.dataType.includes('personal')
      );
    }

    // Default to system logs policy for unknown types
    return this.policies.get('system_logs');
  }

  private async storePolicy(policy: RetentionPolicy): Promise<void> {
    await this.memoryProvider.storeMemory({
      id: `retention_policy_${policy.id}`,
      agentId: 'system',
      content: JSON.stringify(policy),
      timestamp: new Date(),
      metadata: { type: 'retention_policy', policyId: policy.id },
    });
  }

  private async storeSchedule(schedule: RetentionSchedule): Promise<void> {
    await this.memoryProvider.storeMemory({
      id: schedule.id,
      agentId: 'system',
      content: JSON.stringify(schedule),
      timestamp: new Date(),
      metadata: { type: 'retention_schedule', dataId: schedule.dataId },
    });
  }

  private async updateSchedule(schedule: RetentionSchedule): Promise<void> {
    this.schedules.set(schedule.id, schedule);
    await this.storeSchedule(schedule);
  }

  private async logAuditEntry(
    entry: Omit<AuditEntry, 'id' | 'timestamp'>
  ): Promise<void> {
    const auditEntry: AuditEntry = {
      id: `retention_audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      ipAddress: '127.0.0.1',
      userAgent: 'RetentionManager/1.0',
      ...entry,
    };

    await this.memoryProvider.storeMemory({
      id: auditEntry.id,
      agentId: 'system',
      content: JSON.stringify(auditEntry),
      timestamp: auditEntry.timestamp,
      metadata: { type: 'audit_log', action: auditEntry.action },
    });
  }
}

/**
 * Factory function to create retention manager
 */
export function createRetentionManager(
  memoryProvider: MemoryProvider
): RetentionManager {
  return new RetentionManager(memoryProvider);
}
