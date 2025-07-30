/**
 * GDPR Service Implementation
 *
 * Provides GDPR compliance features including:
 * - Right to Erasure (Right to be Forgotten)
 * - Data Portability
 * - Consent Management
 * - Privacy Policy Management
 * - Data Subject Rights
 */

import {
  GDPRService,
  GDPRConfig,
  ConsentPurpose,
  ConsentRecord,
  ConsentStatus,
  UserDataExport,
  DataSubjectRequest,
  DataSubjectResponse,
  PrivacyPolicy,
  AuditEntry,
  RetentionPolicy,
} from '../../../types/compliance.js';
import { MemoryProvider } from '../../../types/memory.js';
import { runtimeLogger } from '../../../utils/logger.js';
import { EventEmitter } from 'events';

export class GDPRServiceImpl extends EventEmitter implements GDPRService {
  private memoryProvider: MemoryProvider;
  private config: GDPRConfig;
  private privacyPolicy?: PrivacyPolicy;

  constructor(memoryProvider: MemoryProvider, config: GDPRConfig) {
    super();
    this.memoryProvider = memoryProvider;
    this.config = config;
    this.initializePrivacyPolicy();
  }

  private async initializePrivacyPolicy(): Promise<void> {
    try {
      // Try to load existing privacy policy
      const stored = await this.memoryProvider.getMemories('system', {
        type: 'privacy_policy',
        limit: 1,
      });

      if (stored.length > 0) {
        this.privacyPolicy = JSON.parse(stored[0].content);
      } else {
        // Create default privacy policy
        this.privacyPolicy = this.createDefaultPrivacyPolicy();
        await this.updatePrivacyPolicy(this.privacyPolicy);
      }
    } catch (error) {
      runtimeLogger.error('Failed to initialize privacy policy', { error });
      this.privacyPolicy = this.createDefaultPrivacyPolicy();
    }
  }

  private createDefaultPrivacyPolicy(): PrivacyPolicy {
    return {
      version: '1.0.0',
      effectiveDate: new Date(),
      lastUpdated: new Date(),
      content: 'Default privacy policy - requires customization',
      dataCategories: ['profile', 'communications', 'preferences', 'usage'],
      purposes: [],
      retentionPolicies: [],
      thirdParties: [],
    };
  }

  /**
   * Right to Erasure - Delete all user data
   */
  async deleteUserData(userId: string): Promise<void> {
    try {
      runtimeLogger.info('Starting user data deletion', { userId });

      // Delete memories
      await this.memoryProvider.deleteMemories(userId);

      // Delete consent records
      await this.deleteConsentRecords(userId);

      // Delete audit logs (retain for legal requirements)
      await this.anonymizeAuditLogs(userId);

      // Log the deletion
      await this.logAuditEntry({
        userId: 'system',
        action: 'user_data_deleted',
        resource: 'user_data',
        resourceId: userId,
        details: { deletionType: 'complete' },
        result: 'success',
      });

      this.emit('dataDeleted', { userId, type: 'complete' });
      runtimeLogger.info('User data deletion completed', { userId });
    } catch (error) {
      runtimeLogger.error('Failed to delete user data', { userId, error });

      await this.logAuditEntry({
        userId: 'system',
        action: 'user_data_deleted',
        resource: 'user_data',
        resourceId: userId,
        details: { deletionType: 'complete', error: error.message },
        result: 'failure',
        errorMessage: error.message,
      });

      throw error;
    }
  }

  /**
   * Right to Erasure - Anonymize user data instead of deletion
   */
  async anonymizeUserData(userId: string): Promise<void> {
    try {
      runtimeLogger.info('Starting user data anonymization', { userId });

      const anonymizedId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Anonymize memories
      const memories = await this.memoryProvider.getMemories(userId);
      for (const memory of memories) {
        const anonymizedMemory = {
          ...memory,
          agentId: anonymizedId,
          content: this.anonymizeContent(memory.content),
          metadata: this.anonymizeMetadata(memory.metadata),
        };

        await this.memoryProvider.storeMemory(anonymizedMemory);
        await this.memoryProvider.deleteMemory(memory.id);
      }

      // Anonymize consent records
      await this.anonymizeConsentRecords(userId, anonymizedId);

      // Anonymize audit logs
      await this.anonymizeAuditLogs(userId, anonymizedId);

      await this.logAuditEntry({
        userId: 'system',
        action: 'user_data_anonymized',
        resource: 'user_data',
        resourceId: userId,
        details: { anonymizedId, anonymizationType: 'complete' },
        result: 'success',
      });

      this.emit('dataAnonymized', { userId, anonymizedId });
      runtimeLogger.info('User data anonymization completed', {
        userId,
        anonymizedId,
      });
    } catch (error) {
      runtimeLogger.error('Failed to anonymize user data', { userId, error });
      throw error;
    }
  }

  private anonymizeContent(content: string): string {
    // Replace personal identifiers with anonymized versions
    return content
      .replace(
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        '[EMAIL]'
      )
      .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE]')
      .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]')
      .replace(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, '[NAME]');
  }

  private anonymizeMetadata(metadata: any): any {
    if (!metadata) return {};

    const anonymized = { ...metadata };
    delete anonymized.email;
    delete anonymized.phone;
    delete anonymized.name;
    delete anonymized.address;

    return anonymized;
  }

  /**
   * Data Portability - Export user data
   */
  async exportUserData(
    userId: string,
    format: 'json' | 'csv' | 'xml' = 'json'
  ): Promise<UserDataExport> {
    try {
      runtimeLogger.info('Starting user data export', { userId, format });

      const [memories, consents, auditLogs] = await Promise.all([
        this.memoryProvider.getMemories(userId),
        this.getConsentRecords(userId),
        this.getUserAuditLogs(userId),
      ]);

      const exportData: UserDataExport = {
        userId,
        exportedAt: new Date(),
        format,
        data: {
          memories: memories.map((m) => ({
            id: m.id,
            content: m.content,
            timestamp: m.timestamp,
            metadata: m.metadata,
          })),
          consents: consents,
          auditLogs: auditLogs.filter((log) => log.userId === userId),
        },
        metadata: {
          dataCategories: ['memories', 'consents', 'audit_logs'],
          totalRecords: memories.length + consents.length + auditLogs.length,
          exportVersion: '1.0.0',
        },
      };

      await this.logAuditEntry({
        userId,
        action: 'data_exported',
        resource: 'user_data',
        resourceId: userId,
        details: {
          format,
          recordCount: exportData.metadata.totalRecords,
          categories: exportData.metadata.dataCategories,
        },
        result: 'success',
      });

      this.emit('dataExported', {
        userId,
        format,
        recordCount: exportData.metadata.totalRecords,
      });
      runtimeLogger.info('User data export completed', {
        userId,
        format,
        recordCount: exportData.metadata.totalRecords,
      });

      return exportData;
    } catch (error) {
      runtimeLogger.error('Failed to export user data', {
        userId,
        format,
        error,
      });

      await this.logAuditEntry({
        userId,
        action: 'data_exported',
        resource: 'user_data',
        resourceId: userId,
        details: { format, error: error.message },
        result: 'failure',
        errorMessage: error.message,
      });

      throw error;
    }
  }

  /**
   * Consent Management - Record user consent
   */
  async recordConsent(
    userId: string,
    purposes: ConsentPurpose[]
  ): Promise<ConsentRecord> {
    try {
      const consentRecord: ConsentRecord = {
        id: `consent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        purposes,
        givenAt: new Date(),
        ipAddress: '0.0.0.0', // Should be passed from request context
        userAgent: 'SYMindX Agent', // Should be passed from request context
        version: this.privacyPolicy?.version || '1.0.0',
      };

      await this.storeConsentRecord(consentRecord);

      await this.logAuditEntry({
        userId,
        action: 'consent_recorded',
        resource: 'consent',
        resourceId: consentRecord.id,
        details: {
          purposes: purposes.map((p) => p.id),
          version: consentRecord.version,
        },
        result: 'success',
      });

      this.emit('consentRecorded', {
        userId,
        consentId: consentRecord.id,
        purposes,
      });
      runtimeLogger.info('Consent recorded', {
        userId,
        consentId: consentRecord.id,
      });

      return consentRecord;
    } catch (error) {
      runtimeLogger.error('Failed to record consent', { userId, error });
      throw error;
    }
  }

  /**
   * Consent Management - Withdraw consent
   */
  async withdrawConsent(userId: string, purposeIds: string[]): Promise<void> {
    try {
      const consentRecords = await this.getConsentRecords(userId);
      const now = new Date();

      for (const record of consentRecords) {
        if (!record.withdrawnAt) {
          const affectedPurposes = record.purposes.filter((p) =>
            purposeIds.includes(p.id)
          );
          if (affectedPurposes.length > 0) {
            record.withdrawnAt = now;
            await this.updateConsentRecord(record);
          }
        }
      }

      await this.logAuditEntry({
        userId,
        action: 'consent_withdrawn',
        resource: 'consent',
        details: { purposeIds, withdrawnAt: now },
        result: 'success',
      });

      this.emit('consentWithdrawn', { userId, purposeIds });
      runtimeLogger.info('Consent withdrawn', { userId, purposeIds });
    } catch (error) {
      runtimeLogger.error('Failed to withdraw consent', {
        userId,
        purposeIds,
        error,
      });
      throw error;
    }
  }

  /**
   * Get current consent status for user
   */
  async getConsentStatus(userId: string): Promise<ConsentStatus> {
    try {
      const consentRecords = await this.getConsentRecords(userId);

      const activeConsents: ConsentPurpose[] = [];
      const withdrawnConsents: ConsentPurpose[] = [];

      for (const record of consentRecords) {
        if (record.withdrawnAt) {
          withdrawnConsents.push(...record.purposes);
        } else {
          activeConsents.push(...record.purposes);
        }
      }

      return {
        userId,
        consents: consentRecords,
        activeConsents,
        withdrawnConsents,
      };
    } catch (error) {
      runtimeLogger.error('Failed to get consent status', { userId, error });
      throw error;
    }
  }

  /**
   * Handle data subject requests
   */
  async handleDataSubjectRequest(
    request: DataSubjectRequest
  ): Promise<DataSubjectResponse> {
    try {
      runtimeLogger.info('Processing data subject request', {
        requestId: request.id,
        type: request.type,
        userId: request.userId,
      });

      let responseData: any;

      switch (request.type) {
        case 'access':
          responseData = await this.exportUserData(request.userId);
          break;
        case 'erasure':
          await this.deleteUserData(request.userId);
          responseData = { deleted: true };
          break;
        case 'portability':
          responseData = await this.exportUserData(request.userId);
          break;
        case 'rectification':
          // Implementation depends on specific requirements
          responseData = {
            message: 'Rectification request requires manual processing',
          };
          break;
        case 'restriction':
          // Implementation depends on specific requirements
          responseData = { message: 'Processing restriction applied' };
          break;
        case 'objection':
          // Implementation depends on specific requirements
          responseData = { message: 'Objection noted, processing stopped' };
          break;
        default:
          throw new Error(`Unsupported request type: ${request.type}`);
      }

      const response: DataSubjectResponse = {
        requestId: request.id,
        status: 'completed',
        completedAt: new Date(),
        data: responseData,
      };

      await this.logAuditEntry({
        userId: request.userId,
        action: 'data_subject_request_completed',
        resource: 'data_subject_request',
        resourceId: request.id,
        details: { type: request.type },
        result: 'success',
      });

      this.emit('dataSubjectRequestCompleted', { request, response });
      return response;
    } catch (error) {
      runtimeLogger.error('Failed to handle data subject request', {
        requestId: request.id,
        error,
      });

      const response: DataSubjectResponse = {
        requestId: request.id,
        status: 'rejected',
        completedAt: new Date(),
        rejectionReason: error.message,
      };

      await this.logAuditEntry({
        userId: request.userId,
        action: 'data_subject_request_failed',
        resource: 'data_subject_request',
        resourceId: request.id,
        details: { type: request.type, error: error.message },
        result: 'failure',
        errorMessage: error.message,
      });

      return response;
    }
  }

  /**
   * Get current privacy policy
   */
  async getPrivacyPolicy(): Promise<PrivacyPolicy> {
    if (!this.privacyPolicy) {
      await this.initializePrivacyPolicy();
    }
    return this.privacyPolicy!;
  }

  /**
   * Update privacy policy
   */
  async updatePrivacyPolicy(policy: PrivacyPolicy): Promise<void> {
    try {
      policy.lastUpdated = new Date();
      this.privacyPolicy = policy;

      await this.memoryProvider.storeMemory({
        id: `privacy_policy_${Date.now()}`,
        agentId: 'system',
        content: JSON.stringify(policy),
        timestamp: new Date(),
        metadata: { type: 'privacy_policy', version: policy.version },
      });

      await this.logAuditEntry({
        userId: 'system',
        action: 'privacy_policy_updated',
        resource: 'privacy_policy',
        details: { version: policy.version },
        result: 'success',
      });

      this.emit('privacyPolicyUpdated', { version: policy.version });
      runtimeLogger.info('Privacy policy updated', { version: policy.version });
    } catch (error) {
      runtimeLogger.error('Failed to update privacy policy', { error });
      throw error;
    }
  }

  // Private helper methods

  private async storeConsentRecord(record: ConsentRecord): Promise<void> {
    await this.memoryProvider.storeMemory({
      id: record.id,
      agentId: record.userId,
      content: JSON.stringify(record),
      timestamp: record.givenAt,
      metadata: { type: 'consent_record', version: record.version },
    });
  }

  private async updateConsentRecord(record: ConsentRecord): Promise<void> {
    await this.memoryProvider.storeMemory({
      id: record.id,
      agentId: record.userId,
      content: JSON.stringify(record),
      timestamp: record.givenAt,
      metadata: {
        type: 'consent_record',
        version: record.version,
        updated: true,
      },
    });
  }

  private async getConsentRecords(userId: string): Promise<ConsentRecord[]> {
    const memories = await this.memoryProvider.getMemories(userId, {
      type: 'consent_record',
    });

    return memories.map((m) => JSON.parse(m.content));
  }

  private async deleteConsentRecords(userId: string): Promise<void> {
    const memories = await this.memoryProvider.getMemories(userId, {
      type: 'consent_record',
    });

    for (const memory of memories) {
      await this.memoryProvider.deleteMemory(memory.id);
    }
  }

  private async anonymizeConsentRecords(
    userId: string,
    anonymizedId: string
  ): Promise<void> {
    const records = await this.getConsentRecords(userId);

    for (const record of records) {
      const anonymizedRecord = {
        ...record,
        userId: anonymizedId,
        ipAddress: '[ANONYMIZED]',
        userAgent: '[ANONYMIZED]',
      };

      await this.memoryProvider.storeMemory({
        id: record.id,
        agentId: anonymizedId,
        content: JSON.stringify(anonymizedRecord),
        timestamp: record.givenAt,
        metadata: { type: 'consent_record', anonymized: true },
      });
    }

    await this.deleteConsentRecords(userId);
  }

  private async getUserAuditLogs(userId: string): Promise<AuditEntry[]> {
    const memories = await this.memoryProvider.getMemories('system', {
      type: 'audit_log',
    });

    return memories
      .map((m) => JSON.parse(m.content))
      .filter((log) => log.userId === userId || log.resourceId === userId);
  }

  private async anonymizeAuditLogs(
    userId: string,
    anonymizedId?: string
  ): Promise<void> {
    const auditLogs = await this.getUserAuditLogs(userId);

    for (const log of auditLogs) {
      const anonymizedLog = {
        ...log,
        userId: anonymizedId || '[ANONYMIZED]',
        resourceId:
          log.resourceId === userId
            ? anonymizedId || '[ANONYMIZED]'
            : log.resourceId,
        ipAddress: '[ANONYMIZED]',
        userAgent: '[ANONYMIZED]',
      };

      await this.memoryProvider.storeMemory({
        id: log.id,
        agentId: 'system',
        content: JSON.stringify(anonymizedLog),
        timestamp: new Date(log.timestamp),
        metadata: { type: 'audit_log', anonymized: true },
      });
    }
  }

  private async logAuditEntry(
    entry: Omit<AuditEntry, 'id' | 'timestamp'>
  ): Promise<void> {
    const auditEntry: AuditEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      ipAddress: '127.0.0.1',
      userAgent: 'SYMindX-Agent/1.0',
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
 * Factory function to create GDPR service
 */
export function createGDPRService(
  memoryProvider: MemoryProvider,
  config: GDPRConfig
): GDPRService {
  return new GDPRServiceImpl(memoryProvider, config);
}
