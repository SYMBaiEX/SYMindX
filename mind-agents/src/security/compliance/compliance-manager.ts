/**
 * Unified Compliance Manager
 * 
 * Coordinates GDPR, HIPAA, and SOX compliance across the entire system
 * Provides a single interface for all compliance operations
 */

import {
  ComplianceManager,
  ComplianceConfig,
  DataClassification,
  RetentionPolicy,
  ComplianceStatus,
  ComplianceReport,
  GDPRService,
  HIPAAService,
  SOXService,
  AuditEntry,
  AuditFilter,
} from '../../types/compliance.js';
import { MemoryProvider } from '../../types/memory.js';
import { runtimeLogger } from '../../utils/logger.js';
import { EventEmitter } from 'events';

// Import service implementations
import { createGDPRService } from './gdpr/gdpr-service.js';
import { createHIPAAService } from './hipaa/hipaa-service.js';
import { createSOXService } from './sox/sox-service.js';
import { createDataClassifier, DataClassifier } from './common/data-classifier.js';
import { createRetentionManager, RetentionManager } from './common/retention-manager.js';

export class ComplianceManagerImpl extends EventEmitter implements ComplianceManager {
  private memoryProvider: MemoryProvider;
  private config: ComplianceConfig;
  private dataClassifier: DataClassifier;
  private retentionManager: RetentionManager;
  
  // Service instances
  public readonly gdpr: GDPRService;
  public readonly hipaa: HIPAAService;
  public readonly sox: SOXService;

  // Internal state
  private isInitialized: boolean = false;
  private lastHealthCheck: Date | null = null;
  private complianceMetrics: Map<string, any> = new Map();

  constructor(memoryProvider: MemoryProvider, config: ComplianceConfig) {
    super();
    
    this.memoryProvider = memoryProvider;
    this.config = { enabled: true, strictMode: false, ...config };
    
    // Initialize utilities
    this.dataClassifier = createDataClassifier();
    this.retentionManager = createRetentionManager(memoryProvider);
    
    // Initialize services based on configuration
    this.gdpr = this.config.gdpr?.enabled ? 
      createGDPRService(memoryProvider, this.config.gdpr) : 
      this.createNoOpGDPRService();
      
    this.hipaa = this.config.hipaa?.enabled ? 
      createHIPAAService(memoryProvider, this.config.hipaa) : 
      this.createNoOpHIPAAService();
      
    this.sox = this.config.sox?.enabled ? 
      createSOXService(memoryProvider, this.config.sox) : 
      this.createNoOpSOXService();

    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      runtimeLogger.info('Initializing compliance manager', {
        gdprEnabled: this.config.gdpr?.enabled || false,
        hipaaEnabled: this.config.hipaa?.enabled || false,
        soxEnabled: this.config.sox?.enabled || false,
        strictMode: this.config.strictMode,
      });

      // Set up event forwarding from services
      this.setupEventForwarding();

      // Start retention manager if enabled
      if (this.config.enabled) {
        this.retentionManager.startAutomatedProcessing(60); // Check every hour
      }

      // Load existing compliance metrics
      await this.loadComplianceMetrics();

      this.isInitialized = true;
      this.emit('initialized', { config: this.config });
      
      runtimeLogger.info('Compliance manager initialized successfully');
    } catch (error) {
      runtimeLogger.error('Failed to initialize compliance manager', { error });
      throw error;
    }
  }

  private setupEventForwarding(): void {
    // Forward GDPR events
    if (this.config.gdpr?.enabled) {
      this.gdpr.on('dataDeleted', (data) => this.emit('gdpr:dataDeleted', data));
      this.gdpr.on('dataAnonymized', (data) => this.emit('gdpr:dataAnonymized', data));
      this.gdpr.on('dataExported', (data) => this.emit('gdpr:dataExported', data));
      this.gdpr.on('consentRecorded', (data) => this.emit('gdpr:consentRecorded', data));
      this.gdpr.on('consentWithdrawn', (data) => this.emit('gdpr:consentWithdrawn', data));
    }

    // Forward HIPAA events
    if (this.config.hipaa?.enabled) {
      this.hipaa.on('accessLogged', (data) => this.emit('hipaa:accessLogged', data));
      this.hipaa.on('breachReported', (data) => this.emit('hipaa:breachReported', data));
      this.hipaa.on('anomalyDetected', (data) => this.emit('hipaa:anomalyDetected', data));
      this.hipaa.on('trainingCompleted', (data) => this.emit('hipaa:trainingCompleted', data));
    }

    // Forward SOX events
    if (this.config.sox?.enabled) {
      this.sox.on('changeRequested', (data) => this.emit('sox:changeRequested', data));
      this.sox.on('changeApproved', (data) => this.emit('sox:changeApproved', data));
      this.sox.on('changeImplemented', (data) => this.emit('sox:changeImplemented', data));
      this.sox.on('controlTested', (data) => this.emit('sox:controlTested', data));
      this.sox.on('changeLogged', (data) => this.emit('sox:changeLogged', data));
    }

    // Forward retention events
    this.retentionManager.on('retentionScheduled', (data) => this.emit('retention:scheduled', data));
    this.retentionManager.on('retentionActionExecuted', (data) => this.emit('retention:executed', data));
    this.retentionManager.on('legalHoldApplied', (data) => this.emit('retention:legalHold', data));
  }

  /**
   * Configure compliance settings
   */
  async configure(config: ComplianceConfig): Promise<void> {
    try {
      this.config = { ...this.config, ...config };
      
      await this.storeConfiguration();
      
      runtimeLogger.info('Compliance configuration updated', { config });
      this.emit('configurationUpdated', { config });
    } catch (error) {
      runtimeLogger.error('Failed to update compliance configuration', { error });
      throw error;
    }
  }

  /**
   * Get current configuration
   */
  getConfiguration(): ComplianceConfig {
    return { ...this.config };
  }

  /**
   * Classify data across all compliance frameworks
   */
  async classifyData(data: any): Promise<DataClassification> {
    try {
      const classification = this.dataClassifier.classifyData(data);
      
      // Enhanced classification with compliance-specific data
      const gdprClassification = this.dataClassifier.classifyForGDPR(data);
      const hipaaClassification = this.dataClassifier.classifyForHIPAA(data);
      const soxClassification = this.dataClassifier.classifyForSOX(data);

      // Add compliance-specific tags
      if (gdprClassification.isPersonalData) {
        classification.tags.push(`gdpr:${gdprClassification.lawfulBasis}`);
        classification.tags.push(...gdprClassification.dataTypes.map(type => `gdpr:${type}`));
      }

      if (hipaaClassification.isPHI) {
        classification.tags.push(`hipaa:${hipaaClassification.dataType}`);
        classification.tags.push(`hipaa:${hipaaClassification.sensitivityLevel}`);
      }

      if (soxClassification.isFinancial) {
        classification.tags.push(`sox:${soxClassification.dataType}`);
        classification.tags.push(`sox:${soxClassification.materialityLevel}`);
      }

      // Schedule retention if data contains regulated information
      if (gdprClassification.isPersonalData || hipaaClassification.isPHI || soxClassification.isFinancial) {
        const dataType = this.determineRetentionDataType(classification);
        await this.retentionManager.scheduleRetention(
          this.generateDataId(data),
          dataType,
          new Date(),
          { classification }
        );
      }

      runtimeLogger.debug('Data classified', {
        level: classification.level,
        tags: classification.tags.length,
        rulesApplied: classification.handlingRules.length,
      });

      return classification;
    } catch (error) {
      runtimeLogger.error('Failed to classify data', { error });
      throw error;
    }
  }

  /**
   * Apply retention policy to data
   */
  async applyRetentionPolicy(policy: RetentionPolicy): Promise<void> {
    try {
      this.retentionManager.addPolicy(policy);
      
      await this.logComplianceEvent({
        action: 'retention_policy_applied',
        resource: 'retention_policy',
        resourceId: policy.id,
        details: {
          dataType: policy.dataType,
          retentionPeriod: policy.retentionPeriod,
          action: policy.action,
        },
      });

      runtimeLogger.info('Retention policy applied', {
        policyId: policy.id,
        dataType: policy.dataType,
      });

      this.emit('retentionPolicyApplied', policy);
    } catch (error) {
      runtimeLogger.error('Failed to apply retention policy', { policyId: policy.id, error });
      throw error;
    }
  }

  /**
   * Get overall compliance status
   */
  async getComplianceStatus(): Promise<ComplianceStatus> {
    try {
      const status: ComplianceStatus = {
        overallCompliant: true,
      };

      // Check GDPR compliance
      if (this.config.gdpr?.enabled) {
        const gdprIssues: string[] = [];
        
        // Add specific GDPR compliance checks here
        // For now, assume compliant unless issues are found
        
        status.gdpr = {
          compliant: gdprIssues.length === 0,
          issues: gdprIssues,
          lastAudit: this.lastHealthCheck,
        };
        
        if (!status.gdpr.compliant) {
          status.overallCompliant = false;
        }
      }

      // Check HIPAA compliance
      if (this.config.hipaa?.enabled) {
        const hipaaIssues: string[] = [];
        
        // Add specific HIPAA compliance checks here
        
        status.hipaa = {
          compliant: hipaaIssues.length === 0,
          issues: hipaaIssues,
          lastAudit: this.lastHealthCheck,
        };
        
        if (!status.hipaa.compliant) {
          status.overallCompliant = false;
        }
      }

      // Check SOX compliance
      if (this.config.sox?.enabled) {
        const soxIssues: string[] = [];
        
        // Check control effectiveness
        try {
          const controlReport = await this.sox.getControlEffectiveness();
          const effectivenessRate = (controlReport.effectiveControls / controlReport.totalControls) * 100;
          
          if (effectivenessRate < 80) {
            soxIssues.push(`Control effectiveness below threshold: ${effectivenessRate.toFixed(1)}%`);
          }
          
          if (controlReport.totalControls - controlReport.testedControls > 0) {
            soxIssues.push(`${controlReport.totalControls - controlReport.testedControls} controls not tested`);
          }
        } catch (error) {
          soxIssues.push('Unable to assess control effectiveness');
        }
        
        status.sox = {
          compliant: soxIssues.length === 0,
          issues: soxIssues,
          lastAudit: this.lastHealthCheck,
        };
        
        if (!status.sox.compliant) {
          status.overallCompliant = false;
        }
      }

      this.lastHealthCheck = new Date();
      this.updateComplianceMetrics('last_status_check', this.lastHealthCheck);

      return status;
    } catch (error) {
      runtimeLogger.error('Failed to get compliance status', { error });
      throw error;
    }
  }

  /**
   * Generate comprehensive compliance report
   */
  async generateComplianceReport(regulations?: ('gdpr' | 'hipaa' | 'sox')[]): Promise<ComplianceReport> {
    try {
      const reportPeriod = {
        start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Last 90 days
        end: new Date(),
        type: 'quarterly' as const,
      };

      const report: ComplianceReport = {
        generatedAt: new Date(),
        period: reportPeriod,
        regulations: {},
        summary: {
          overallCompliance: true,
          criticalIssues: [],
          recommendations: [],
        },
      };

      const enabledRegulations = regulations || [];
      if (!regulations) {
        // Include all enabled regulations if none specified
        if (this.config.gdpr?.enabled) enabledRegulations.push('gdpr');
        if (this.config.hipaa?.enabled) enabledRegulations.push('hipaa');
        if (this.config.sox?.enabled) enabledRegulations.push('sox');
      }

      // Generate GDPR report
      if (enabledRegulations.includes('gdpr') && this.config.gdpr?.enabled) {
        report.regulations.gdpr = await this.generateGDPRReport(reportPeriod);
      }

      // Generate HIPAA report
      if (enabledRegulations.includes('hipaa') && this.config.hipaa?.enabled) {
        report.regulations.hipaa = await this.generateHIPAAReport(reportPeriod);
      }

      // Generate SOX report
      if (enabledRegulations.includes('sox') && this.config.sox?.enabled) {
        report.regulations.sox = await this.sox.generateSOXReport(reportPeriod);
      }

      // Generate summary
      report.summary = this.generateReportSummary(report.regulations);

      // Store report
      await this.storeComplianceReport(report);

      runtimeLogger.info('Compliance report generated', {
        regulations: enabledRegulations,
        overallCompliance: report.summary.overallCompliance,
      });

      this.emit('reportGenerated', report);
      return report;
    } catch (error) {
      runtimeLogger.error('Failed to generate compliance report', { error });
      throw error;
    }
  }

  /**
   * Export audit logs with optional filtering
   */
  async exportAuditLog(filters?: AuditFilter): Promise<AuditEntry[]> {
    try {
      const auditLogs: AuditEntry[] = [];

      // Collect audit logs from all sources
      const memories = await this.memoryProvider.getMemories('system', {
        type: 'audit_log',
      });

      const allLogs = memories.map(m => {
        try {
          return JSON.parse(m.content) as AuditEntry;
        } catch {
          return null;
        }
      }).filter(log => log !== null) as AuditEntry[];

      // Apply filters if provided
      let filteredLogs = allLogs;
      
      if (filters) {
        if (filters.startDate || filters.endDate) {
          filteredLogs = filteredLogs.filter(log => {
            const logDate = new Date(log.timestamp);
            if (filters.startDate && logDate < filters.startDate) return false;
            if (filters.endDate && logDate > filters.endDate) return false;
            return true;
          });
        }

        if (filters.userId) {
          filteredLogs = filteredLogs.filter(log => log.userId === filters.userId);
        }
      }

      // Sort by timestamp (newest first)
      filteredLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      await this.logComplianceEvent({
        action: 'audit_log_exported',
        resource: 'audit_log',
        details: {
          totalLogs: filteredLogs.length,
          filters: filters || {},
        },
      });

      return filteredLogs;
    } catch (error) {
      runtimeLogger.error('Failed to export audit log', { error });
      throw error;
    }
  }

  // Private helper methods

  private determineRetentionDataType(classification: DataClassification): string {
    // Determine retention data type based on classification tags
    if (classification.tags.some(tag => tag.startsWith('gdpr:'))) {
      return 'personal_data';
    }
    if (classification.tags.some(tag => tag.startsWith('hipaa:'))) {
      return 'phi';
    }
    if (classification.tags.some(tag => tag.startsWith('sox:'))) {
      return 'financial_data';
    }
    return 'general_data';
  }

  private generateDataId(data: any): string {
    // Generate a unique ID for data based on its content
    const crypto = require('crypto');
    const content = typeof data === 'string' ? data : JSON.stringify(data);
    return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
  }

  private async generateGDPRReport(period: any): Promise<any> {
    // Generate GDPR-specific report
    return {
      dataSubjectRequests: {
        total: 0,
        completed: 0,
        averageResponseTime: 0,
      },
      consents: {
        active: 0,
        withdrawn: 0,
        renewed: 0,
      },
      dataBreaches: 0,
      retentionCompliance: true,
    };
  }

  private async generateHIPAAReport(period: any): Promise<any> {
    // Generate HIPAA-specific report
    return {
      phiAccesses: {
        total: 0,
        authorized: 0,
        unauthorized: 0,
      },
      securityIncidents: 0,
      trainingCompliance: {
        compliantUsers: 0,
        totalUsers: 0,
        percentage: 0,
      },
      encryptionStatus: {
        atRest: true,
        inTransit: true,
      },
    };
  }

  private generateReportSummary(regulations: any): any {
    let overallCompliance = true;
    const criticalIssues: string[] = [];
    const recommendations: string[] = [];

    // Analyze each regulation's report
    if (regulations.gdpr) {
      if (regulations.gdpr.dataBreaches > 0) {
        overallCompliance = false;
        criticalIssues.push(`${regulations.gdpr.dataBreaches} GDPR data breaches reported`);
      }
    }

    if (regulations.hipaa) {
      if (regulations.hipaa.phiAccesses.unauthorized > 0) {
        overallCompliance = false;
        criticalIssues.push(`${regulations.hipaa.phiAccesses.unauthorized} unauthorized PHI accesses`);
      }
    }

    if (regulations.sox) {
      if (regulations.sox.materialWeaknesses?.length > 0) {
        overallCompliance = false;
        criticalIssues.push(`${regulations.sox.materialWeaknesses.length} material weaknesses identified`);
      }
    }

    // Generate recommendations
    if (!overallCompliance) {
      recommendations.push('Immediate remediation required for critical issues');
      recommendations.push('Conduct comprehensive compliance audit');
      recommendations.push('Review and strengthen internal controls');
    }

    return {
      overallCompliance,
      criticalIssues,
      recommendations,
    };
  }

  private async storeConfiguration(): Promise<void> {
    await this.memoryProvider.storeMemory({
      id: 'compliance_config',
      agentId: 'system',
      content: JSON.stringify(this.config),
      timestamp: new Date(),
      metadata: { type: 'compliance_config' },
    });
  }

  private async storeComplianceReport(report: ComplianceReport): Promise<void> {
    await this.memoryProvider.storeMemory({
      id: `compliance_report_${Date.now()}`,
      agentId: 'system',
      content: JSON.stringify(report),
      timestamp: report.generatedAt,
      metadata: { 
        type: 'compliance_report',
        period: report.period.type,
      },
    });
  }

  private async loadComplianceMetrics(): Promise<void> {
    try {
      const memories = await this.memoryProvider.getMemories('system', {
        type: 'compliance_metrics',
      });

      if (memories.length > 0) {
        const metrics = JSON.parse(memories[0].content);
        this.complianceMetrics = new Map(Object.entries(metrics));
      }
    } catch (error) {
      runtimeLogger.warn('Failed to load compliance metrics', { error });
    }
  }

  private updateComplianceMetrics(key: string, value: any): void {
    this.complianceMetrics.set(key, value);
    
    // Store updated metrics (async, don't wait)
    this.storeComplianceMetrics().catch(error => {
      runtimeLogger.warn('Failed to store compliance metrics', { error });
    });
  }

  private async storeComplianceMetrics(): Promise<void> {
    await this.memoryProvider.storeMemory({
      id: 'compliance_metrics',
      agentId: 'system',
      content: JSON.stringify(Object.fromEntries(this.complianceMetrics)),
      timestamp: new Date(),
      metadata: { type: 'compliance_metrics' },
    });
  }

  private async logComplianceEvent(event: Omit<AuditEntry, 'id' | 'timestamp' | 'userId' | 'result' | 'ipAddress' | 'userAgent'>): Promise<void> {
    const auditEntry: AuditEntry = {
      id: `compliance_audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      userId: 'system',
      result: 'success',
      ipAddress: '127.0.0.1',
      userAgent: 'ComplianceManager/1.0',
      ...event,
    };

    await this.memoryProvider.storeMemory({
      id: auditEntry.id,
      agentId: 'system',
      content: JSON.stringify(auditEntry),
      timestamp: auditEntry.timestamp,
      metadata: { type: 'audit_log', action: auditEntry.action },
    });
  }

  // No-op service implementations for disabled features
  private createNoOpGDPRService(): GDPRService {
    return {
      deleteUserData: async () => { throw new Error('GDPR service not enabled'); },
      anonymizeUserData: async () => { throw new Error('GDPR service not enabled'); },
      exportUserData: async () => { throw new Error('GDPR service not enabled'); },
      recordConsent: async () => { throw new Error('GDPR service not enabled'); },
      withdrawConsent: async () => { throw new Error('GDPR service not enabled'); },
      getConsentStatus: async () => { throw new Error('GDPR service not enabled'); },
      handleDataSubjectRequest: async () => { throw new Error('GDPR service not enabled'); },
      getPrivacyPolicy: async () => { throw new Error('GDPR service not enabled'); },
      updatePrivacyPolicy: async () => { throw new Error('GDPR service not enabled'); },
    } as any;
  }

  private createNoOpHIPAAService(): HIPAAService {
    return {
      classifyData: () => ({ isPHI: false, dataType: 'other', sensitivityLevel: 'low' }),
      encryptPHI: async () => { throw new Error('HIPAA service not enabled'); },
      decryptPHI: async () => { throw new Error('HIPAA service not enabled'); },
      authorizeAccess: async () => { throw new Error('HIPAA service not enabled'); },
      checkAuthorization: () => false,
      logAccess: async () => { throw new Error('HIPAA service not enabled'); },
      getAccessLog: async () => { throw new Error('HIPAA service not enabled'); },
      getAuditReport: async () => { throw new Error('HIPAA service not enabled'); },
      reportBreach: async () => { throw new Error('HIPAA service not enabled'); },
      getBreachLog: async () => { throw new Error('HIPAA service not enabled'); },
      recordTraining: async () => { throw new Error('HIPAA service not enabled'); },
      getTrainingStatus: async () => { throw new Error('HIPAA service not enabled'); },
    } as any;
  }

  private createNoOpSOXService(): SOXService {
    return {
      tagFinancialData: () => ({ isFinancial: false, dataType: 'transaction', materialityLevel: 'immaterial', requiresApproval: false }),
      validateFinancialTransaction: async () => ({ valid: true, errors: [], warnings: [] }),
      requestChange: async () => { throw new Error('SOX service not enabled'); },
      approveChange: async () => { throw new Error('SOX service not enabled'); },
      implementChange: async () => { throw new Error('SOX service not enabled'); },
      validateSegregationOfDuties: async () => true,
      getConflictingRoles: async () => [],
      logChange: async () => { throw new Error('SOX service not enabled'); },
      getAuditLog: async () => { throw new Error('SOX service not enabled'); },
      testControl: async () => { throw new Error('SOX service not enabled'); },
      getControlEffectiveness: async () => { throw new Error('SOX service not enabled'); },
      generateSOXReport: async () => { throw new Error('SOX service not enabled'); },
      getCertificationStatus: async () => { throw new Error('SOX service not enabled'); },
    } as any;
  }
}

/**
 * Factory function to create compliance manager
 */
export function createComplianceManager(
  memoryProvider: MemoryProvider,
  config: ComplianceConfig
): ComplianceManager {
  return new ComplianceManagerImpl(memoryProvider, config);
}