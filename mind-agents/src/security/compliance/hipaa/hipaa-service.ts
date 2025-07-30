/**
 * HIPAA Service Implementation
 *
 * Provides HIPAA compliance features including:
 * - PHI (Protected Health Information) Classification and Protection
 * - Access Control and Authorization
 * - Audit Logging and Monitoring
 * - Breach Notification
 * - Security Training Management
 * - Encryption and Data Protection
 */

import {
  HIPAAService,
  HIPAAConfig,
  PHIClassification,
  HIPAAAuditLog,
  EncryptedData,
  PHIAuthorization,
  BreachIncident,
  SecurityTraining,
  TrainingStatus,
  AuditFilter,
  AuditReport,
  AuditAnomaly,
} from '../../../types/compliance.js';
import { MemoryProvider } from '../../../types/memory.js';
import { runtimeLogger } from '../../../utils/logger.js';
import { EventEmitter } from 'events';
import * as crypto from 'crypto';

export class HIPAAServiceImpl extends EventEmitter implements HIPAAService {
  private memoryProvider: MemoryProvider;
  private config: HIPAAConfig;
  private encryptionKey: string;

  // PHI detection patterns
  private readonly phiPatterns = {
    name: /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g,
    ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
    phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
    email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    date: /\b\d{1,2}\/\d{1,2}\/\d{4}\b/g,
    medicalRecord: /\b(MR|MRN|Medical Record)[:\s]*\d+\b/gi,
    healthPlan: /\b(Insurance|Policy)[:\s]*\d+\b/gi,
  };

  constructor(memoryProvider: MemoryProvider, config: HIPAAConfig) {
    super();
    this.memoryProvider = memoryProvider;
    this.config = config;
    this.encryptionKey = this.generateEncryptionKey();
  }

  private generateEncryptionKey(): string {
    // In production, this should be loaded from secure key management
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Classify data to determine if it contains PHI
   */
  classifyData(data: any): PHIClassification {
    if (!data) {
      return { isPHI: false, dataType: 'other', sensitivityLevel: 'low' };
    }

    const content = typeof data === 'string' ? data : JSON.stringify(data);
    const detectedTypes: string[] = [];
    let maxSensitivity: 'low' | 'medium' | 'high' | 'critical' = 'low';

    // Check for different types of PHI
    for (const [type, pattern] of Object.entries(this.phiPatterns)) {
      if (pattern.test(content)) {
        detectedTypes.push(type);

        // Determine sensitivity level
        switch (type) {
          case 'ssn':
          case 'medicalRecord':
            maxSensitivity = 'critical';
            break;
          case 'name':
          case 'healthPlan':
            if (maxSensitivity === 'low' || maxSensitivity === 'medium') {
              maxSensitivity = 'high';
            }
            break;
          case 'phone':
          case 'email':
          case 'date':
            if (maxSensitivity === 'low') {
              maxSensitivity = 'medium';
            }
            break;
        }
      }
    }

    const isPHI = detectedTypes.length > 0;
    const dataType = (detectedTypes[0] as any) || 'other';

    return {
      isPHI,
      dataType,
      sensitivityLevel: isPHI ? maxSensitivity : 'low',
    };
  }

  /**
   * Encrypt PHI data
   */
  async encryptPHI(data: any): Promise<EncryptedData> {
    try {
      const dataString = typeof data === 'string' ? data : JSON.stringify(data);
      const algorithm = 'aes-256-gcm';
      const iv = crypto.randomBytes(16);
      const keyId = crypto
        .createHash('sha256')
        .update(this.encryptionKey)
        .digest('hex')
        .substring(0, 16);

      const cipher = crypto.createCipher(algorithm, this.encryptionKey);
      cipher.setAAD(Buffer.from(keyId));

      let encrypted = cipher.update(dataString, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const authTag = cipher.getAuthTag();

      const encryptedData: EncryptedData = {
        algorithm,
        encryptedValue: encrypted,
        keyId,
        iv: iv.toString('hex'),
        tag: authTag.toString('hex'),
      };

      runtimeLogger.debug('PHI data encrypted', { keyId, algorithm });
      return encryptedData;
    } catch (error) {
      runtimeLogger.error('Failed to encrypt PHI data', { error });
      throw new Error('PHI encryption failed');
    }
  }

  /**
   * Decrypt PHI data with authorization check
   */
  async decryptPHI(
    encryptedData: EncryptedData,
    authorization: PHIAuthorization
  ): Promise<any> {
    try {
      // Verify authorization is still valid
      if (!this.checkAuthorization(authorization)) {
        throw new Error('Authorization expired or invalid');
      }

      const { algorithm, encryptedValue, keyId, iv, tag } = encryptedData;

      // Verify key ID matches
      const expectedKeyId = crypto
        .createHash('sha256')
        .update(this.encryptionKey)
        .digest('hex')
        .substring(0, 16);
      if (keyId !== expectedKeyId) {
        throw new Error('Invalid encryption key');
      }

      const decipher = crypto.createDecipher(algorithm, this.encryptionKey);
      decipher.setAAD(Buffer.from(keyId));

      if (tag) {
        decipher.setAuthTag(Buffer.from(tag, 'hex'));
      }

      let decrypted = decipher.update(encryptedValue, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      // Log access for audit trail
      await this.logAccess({
        userId: authorization.userId,
        patientId: authorization.patientId,
        action: 'read',
        resource: 'phi_data',
        resourceId: keyId,
        phi: { isPHI: true, dataType: 'other', sensitivityLevel: 'high' },
        accessLocation: {
          ipAddress: '127.0.0.1', // Should be passed from request context
        },
        result: 'success',
      });

      runtimeLogger.debug('PHI data decrypted', {
        keyId,
        userId: authorization.userId,
      });

      try {
        return JSON.parse(decrypted);
      } catch {
        return decrypted;
      }
    } catch (error) {
      runtimeLogger.error('Failed to decrypt PHI data', { error });

      // Log failed access attempt
      await this.logAccess({
        userId: authorization.userId,
        patientId: authorization.patientId,
        action: 'read',
        resource: 'phi_data',
        resourceId: encryptedData.keyId,
        accessLocation: {
          ipAddress: '127.0.0.1',
        },
        result: 'failure',
        details: { error: error.message },
      });

      throw error;
    }
  }

  /**
   * Authorize access to PHI
   */
  async authorizeAccess(
    userId: string,
    patientId: string,
    action: string
  ): Promise<PHIAuthorization> {
    try {
      // In production, this would check user roles, permissions, etc.
      const permissions = await this.getUserPermissions(userId);

      if (!permissions.includes(action)) {
        throw new Error(`User ${userId} not authorized for action: ${action}`);
      }

      const authorization: PHIAuthorization = {
        userId,
        patientId,
        permissions,
        validUntil: new Date(
          Date.now() + this.config.sessionTimeout * 60 * 1000
        ),
        purpose: 'treatment', // Should be specified based on context
      };

      await this.logAccess({
        userId,
        patientId,
        action: 'authorize',
        resource: 'phi_access',
        resourceId: patientId,
        accessLocation: {
          ipAddress: '127.0.0.1',
        },
        result: 'success',
        details: { permissions, validUntil: authorization.validUntil },
      });

      runtimeLogger.info('PHI access authorized', {
        userId,
        patientId,
        action,
      });
      return authorization;
    } catch (error) {
      await this.logAccess({
        userId,
        patientId,
        action: 'authorize',
        resource: 'phi_access',
        resourceId: patientId,
        accessLocation: {
          ipAddress: '127.0.0.1',
        },
        result: 'unauthorized',
        details: { error: error.message },
      });

      runtimeLogger.warn('PHI access denied', {
        userId,
        patientId,
        action,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Check if authorization is still valid
   */
  checkAuthorization(authorization: PHIAuthorization): boolean {
    const now = new Date();
    return authorization.validUntil > now;
  }

  /**
   * Log access to PHI for audit trail
   */
  async logAccess(log: Omit<HIPAAAuditLog, 'id' | 'timestamp'>): Promise<void> {
    const auditLog: HIPAAAuditLog = {
      id: `hipaa_audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      ...log,
    };

    await this.memoryProvider.storeMemory({
      id: auditLog.id,
      agentId: 'system',
      content: JSON.stringify(auditLog),
      timestamp: auditLog.timestamp,
      metadata: {
        type: 'hipaa_audit_log',
        action: auditLog.action,
        result: auditLog.result,
        userId: auditLog.userId,
        patientId: auditLog.patientId,
      },
    });

    // Emit event for real-time monitoring
    this.emit('accessLogged', auditLog);

    // Check for suspicious activity
    await this.detectAnomalies(auditLog);
  }

  /**
   * Get access logs for a patient
   */
  async getAccessLog(
    patientId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<HIPAAAuditLog[]> {
    try {
      const filters: any = { type: 'hipaa_audit_log', patientId };

      const memories = await this.memoryProvider.getMemories('system', filters);

      let logs = memories.map((m) => JSON.parse(m.content) as HIPAAAuditLog);

      // Filter by date range if specified
      if (startDate || endDate) {
        logs = logs.filter((log) => {
          const logDate = new Date(log.timestamp);
          if (startDate && logDate < startDate) return false;
          if (endDate && logDate > endDate) return false;
          return true;
        });
      }

      return logs.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } catch (error) {
      runtimeLogger.error('Failed to get access log', { patientId, error });
      throw error;
    }
  }

  /**
   * Generate audit report
   */
  async getAuditReport(filters: AuditFilter): Promise<AuditReport> {
    try {
      const allLogs = await this.getAllAuditLogs(filters);

      const uniqueUsers = new Set(allLogs.map((log) => log.userId)).size;
      const uniquePatients = new Set(
        allLogs.map((log) => log.patientId).filter(Boolean)
      ).size;

      const accessesByAction = allLogs.reduce(
        (acc, log) => {
          acc[log.action] = (acc[log.action] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      const unauthorizedAttempts = allLogs.filter(
        (log) => log.result === 'unauthorized'
      ).length;

      const anomalies = await this.detectReportAnomalies(allLogs);

      return {
        period: {
          start:
            filters.startDate ||
            new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          end: filters.endDate || new Date(),
        },
        totalAccesses: allLogs.length,
        uniqueUsers,
        uniquePatients,
        accessesByAction,
        unauthorizedAttempts,
        anomalies,
      };
    } catch (error) {
      runtimeLogger.error('Failed to generate audit report', { error });
      throw error;
    }
  }

  /**
   * Report a security breach
   */
  async reportBreach(breach: BreachIncident): Promise<void> {
    try {
      await this.memoryProvider.storeMemory({
        id: breach.id,
        agentId: 'system',
        content: JSON.stringify(breach),
        timestamp: breach.discoveredAt,
        metadata: {
          type: 'breach_incident',
          cause: breach.cause,
          affectedRecords: breach.affectedRecords,
        },
      });

      // Log the breach report
      await this.logAccess({
        userId: 'system',
        action: 'breach_reported',
        resource: 'breach_incident',
        resourceId: breach.id,
        accessLocation: { ipAddress: '127.0.0.1' },
        result: 'success',
        details: {
          cause: breach.cause,
          affectedRecords: breach.affectedRecords,
          dataTypes: breach.dataTypes,
        },
      });

      this.emit('breachReported', breach);
      runtimeLogger.error('Security breach reported', {
        breachId: breach.id,
        cause: breach.cause,
        affectedRecords: breach.affectedRecords,
      });
    } catch (error) {
      runtimeLogger.error('Failed to report breach', {
        breachId: breach.id,
        error,
      });
      throw error;
    }
  }

  /**
   * Get breach log
   */
  async getBreachLog(): Promise<BreachIncident[]> {
    try {
      const memories = await this.memoryProvider.getMemories('system', {
        type: 'breach_incident',
      });

      return memories
        .map((m) => JSON.parse(m.content) as BreachIncident)
        .sort(
          (a, b) =>
            new Date(b.discoveredAt).getTime() -
            new Date(a.discoveredAt).getTime()
        );
    } catch (error) {
      runtimeLogger.error('Failed to get breach log', { error });
      throw error;
    }
  }

  /**
   * Record security training completion
   */
  async recordTraining(
    userId: string,
    training: SecurityTraining
  ): Promise<void> {
    try {
      await this.memoryProvider.storeMemory({
        id: `training_${userId}_${training.id}`,
        agentId: userId,
        content: JSON.stringify(training),
        timestamp: training.completedAt,
        metadata: {
          type: 'security_training',
          trainingId: training.id,
          score: training.score,
        },
      });

      await this.logAccess({
        userId,
        action: 'training_completed',
        resource: 'security_training',
        resourceId: training.id,
        accessLocation: { ipAddress: '127.0.0.1' },
        result: 'success',
        details: { trainingName: training.name, score: training.score },
      });

      this.emit('trainingCompleted', { userId, training });
      runtimeLogger.info('Security training completed', {
        userId,
        trainingId: training.id,
      });
    } catch (error) {
      runtimeLogger.error('Failed to record training', {
        userId,
        trainingId: training.id,
        error,
      });
      throw error;
    }
  }

  /**
   * Get training status for user
   */
  async getTrainingStatus(userId: string): Promise<TrainingStatus> {
    try {
      const memories = await this.memoryProvider.getMemories(userId, {
        type: 'security_training',
      });

      const trainings = memories
        .map((m) => JSON.parse(m.content) as SecurityTraining)
        .sort(
          (a, b) =>
            new Date(b.completedAt).getTime() -
            new Date(a.completedAt).getTime()
        );

      const lastTrainingDate =
        trainings.length > 0 ? new Date(trainings[0].completedAt) : new Date(0);
      const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      const isCompliant = lastTrainingDate > oneYearAgo;
      const nextRequiredDate = new Date(
        lastTrainingDate.getTime() + 365 * 24 * 60 * 60 * 1000
      );

      return {
        userId,
        trainings,
        lastTrainingDate,
        isCompliant,
        nextRequiredDate,
      };
    } catch (error) {
      runtimeLogger.error('Failed to get training status', { userId, error });
      throw error;
    }
  }

  // Private helper methods

  private async getUserPermissions(userId: string): Promise<string[]> {
    // In production, this would query user roles and permissions
    // For now, return basic permissions
    return ['read', 'create', 'update'];
  }

  private async getAllAuditLogs(
    filters: AuditFilter
  ): Promise<HIPAAAuditLog[]> {
    const memories = await this.memoryProvider.getMemories('system', {
      type: 'hipaa_audit_log',
    });

    let logs = memories.map((m) => JSON.parse(m.content) as HIPAAAuditLog);

    // Apply filters
    if (filters.startDate || filters.endDate) {
      logs = logs.filter((log) => {
        const logDate = new Date(log.timestamp);
        if (filters.startDate && logDate < filters.startDate) return false;
        if (filters.endDate && logDate > filters.endDate) return false;
        return true;
      });
    }

    if (filters.userId) {
      logs = logs.filter((log) => log.userId === filters.userId);
    }

    if (filters.patientId) {
      logs = logs.filter((log) => log.patientId === filters.patientId);
    }

    if (filters.action) {
      logs = logs.filter((log) => log.action === filters.action);
    }

    if (filters.result) {
      logs = logs.filter((log) => log.result === filters.result);
    }

    return logs;
  }

  private async detectAnomalies(log: HIPAAAuditLog): Promise<void> {
    // Simple anomaly detection - in production, this would be more sophisticated
    const recentLogs = await this.getAccessLog(
      log.patientId || '',
      new Date(Date.now() - 24 * 60 * 60 * 1000)
    );

    // Check for excessive access
    const userAccesses = recentLogs.filter(
      (l) => l.userId === log.userId
    ).length;
    if (userAccesses > 50) {
      // Threshold for suspicious activity
      const anomaly: AuditAnomaly = {
        type: 'excessive_access',
        userId: log.userId,
        timestamp: log.timestamp,
        details: `User accessed PHI ${userAccesses} times in 24 hours`,
        severity: 'high',
      };

      await this.reportAnomaly(anomaly);
    }

    // Check for unusual time access
    const hour = new Date(log.timestamp).getHours();
    if (hour < 6 || hour > 22) {
      // Outside normal business hours
      const anomaly: AuditAnomaly = {
        type: 'unusual_time',
        userId: log.userId,
        timestamp: log.timestamp,
        details: `PHI accessed at ${hour}:00 - outside normal hours`,
        severity: 'medium',
      };

      await this.reportAnomaly(anomaly);
    }
  }

  private async detectReportAnomalies(
    logs: HIPAAAuditLog[]
  ): Promise<AuditAnomaly[]> {
    const anomalies: AuditAnomaly[] = [];

    // Group by user
    const userLogs = logs.reduce(
      (acc, log) => {
        if (!acc[log.userId]) acc[log.userId] = [];
        acc[log.userId].push(log);
        return acc;
      },
      {} as Record<string, HIPAAAuditLog[]>
    );

    // Detect anomalies for each user
    for (const [userId, userLogList] of Object.entries(userLogs)) {
      const accessCount = userLogList.length;
      const unauthorizedCount = userLogList.filter(
        (l) => l.result === 'unauthorized'
      ).length;

      if (accessCount > 1000) {
        // High access volume
        anomalies.push({
          type: 'excessive_access',
          userId,
          timestamp: new Date(),
          details: `User made ${accessCount} PHI accesses in report period`,
          severity: 'high',
        });
      }

      if (unauthorizedCount > 5) {
        // Multiple unauthorized attempts
        anomalies.push({
          type: 'unauthorized_attempt',
          userId,
          timestamp: new Date(),
          details: `User had ${unauthorizedCount} unauthorized access attempts`,
          severity: 'high',
        });
      }
    }

    return anomalies;
  }

  private async reportAnomaly(anomaly: AuditAnomaly): Promise<void> {
    await this.memoryProvider.storeMemory({
      id: `anomaly_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      agentId: 'system',
      content: JSON.stringify(anomaly),
      timestamp: anomaly.timestamp,
      metadata: {
        type: 'audit_anomaly',
        anomalyType: anomaly.type,
        severity: anomaly.severity,
        userId: anomaly.userId,
      },
    });

    this.emit('anomalyDetected', anomaly);
    runtimeLogger.warn('Audit anomaly detected', {
      type: anomaly.type,
      userId: anomaly.userId,
      severity: anomaly.severity,
      details: anomaly.details,
    });
  }
}

/**
 * Factory function to create HIPAA service
 */
export function createHIPAAService(
  memoryProvider: MemoryProvider,
  config: HIPAAConfig
): HIPAAService {
  return new HIPAAServiceImpl(memoryProvider, config);
}
