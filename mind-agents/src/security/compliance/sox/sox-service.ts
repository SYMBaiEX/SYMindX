/**
 * SOX (Sarbanes-Oxley) Service Implementation
 *
 * Provides SOX compliance features including:
 * - Financial Data Controls and Classification
 * - Change Management and Approval Workflows
 * - Segregation of Duties
 * - Audit Trail and Change Logging
 * - Internal Control Testing
 * - Compliance Reporting and Certification
 */

import {
  SOXService,
  SOXConfig,
  SOXControl,
  FinancialDataTag,
  ChangeRequest,
  ChangeApproval,
  ChangeTest,
  ChangeImplementation,
  ChangeSet,
  SOXAuditFilter,
  SOXAuditEntry,
  ControlTestResult,
  ControlEffectivenessReport,
  ControlCategoryStats,
  ReportPeriod,
  SOXComplianceReport,
  MaterialWeakness,
  SignificantDeficiency,
  RemediationPlan,
  RemediationAction,
  CertificationStatus,
  ValidationResult,
} from '../../../types/compliance.js';
import { MemoryProvider } from '../../../types/memory.js';
import { runtimeLogger } from '../../../utils/logger.js';
import { EventEmitter } from 'events';

export class SOXServiceImpl extends EventEmitter implements SOXService {
  private memoryProvider: MemoryProvider;
  private config: SOXConfig;
  private controls: Map<string, SOXControl> = new Map();

  // Financial data detection patterns
  private readonly financialPatterns = {
    revenue: /\b(revenue|sales|income|earnings)\b/gi,
    expense: /\b(expense|cost|expenditure|payment)\b/gi,
    asset: /\b(asset|property|equipment|inventory)\b/gi,
    liability: /\b(liability|debt|obligation|payable)\b/gi,
    equity: /\b(equity|capital|shares|stock)\b/gi,
    transaction: /\b(transaction|transfer|payment|receipt)\b/gi,
    journal_entry: /\b(journal|entry|debit|credit|account)\b/gi,
    amount: /\$[\d,]+\.?\d*/g,
    account: /\b\d{4,6}\b/g, // Account numbers
  };

  // Role conflicts for segregation of duties
  private readonly conflictingRoles = new Map<string, string[]>([
    ['treasurer', ['accountant', 'auditor']],
    ['accountant', ['treasurer', 'cash_handler']],
    ['auditor', ['treasurer', 'accountant', 'bookkeeper']],
    ['cash_handler', ['accountant', 'bookkeeper']],
    ['approver', ['requestor', 'implementer']],
    ['financial_analyst', ['data_entry', 'validator']],
  ]);

  constructor(memoryProvider: MemoryProvider, config: SOXConfig) {
    super();
    this.memoryProvider = memoryProvider;
    this.config = config;
    this.initializeControls();
  }

  private async initializeControls(): Promise<void> {
    // Load existing controls or create default ones
    try {
      const stored = await this.memoryProvider.getMemories('system', {
        type: 'sox_control',
      });

      if (stored.length > 0) {
        stored.forEach((memory) => {
          const control = JSON.parse(memory.content);
          this.controls.set(control.id, control);
        });
      } else {
        await this.createDefaultControls();
      }
    } catch (error) {
      runtimeLogger.error('Failed to initialize SOX controls', { error });
      await this.createDefaultControls();
    }
  }

  private async createDefaultControls(): Promise<void> {
    const defaultControls: SOXControl[] = [
      {
        id: 'AC-001',
        name: 'Financial System Access Control',
        description: 'Control access to financial systems and data',
        type: 'preventive',
        category: 'access',
        frequency: 'real_time',
        owner: 'IT Security',
        effectiveness: 'not_tested',
      },
      {
        id: 'CM-001',
        name: 'Change Management Process',
        description: 'All changes to financial systems require approval',
        type: 'preventive',
        category: 'change_management',
        frequency: 'real_time',
        owner: 'Change Control Board',
        effectiveness: 'not_tested',
      },
      {
        id: 'SD-001',
        name: 'Segregation of Duties',
        description: 'No single person can initiate and approve transactions',
        type: 'preventive',
        category: 'segregation_of_duties',
        frequency: 'real_time',
        owner: 'Finance Manager',
        effectiveness: 'not_tested',
      },
      {
        id: 'DI-001',
        name: 'Data Integrity Controls',
        description: 'Financial data must be accurate and complete',
        type: 'detective',
        category: 'data_integrity',
        frequency: 'daily',
        owner: 'Data Quality Team',
        effectiveness: 'not_tested',
      },
      {
        id: 'MN-001',
        name: 'Financial Monitoring',
        description: 'Regular monitoring of financial transactions',
        type: 'detective',
        category: 'monitoring',
        frequency: 'daily',
        owner: 'Financial Controller',
        effectiveness: 'not_tested',
      },
    ];

    for (const control of defaultControls) {
      this.controls.set(control.id, control);
      await this.storeControl(control);
    }
  }

  /**
   * Tag financial data to identify its type and requirements
   */
  tagFinancialData(data: any): FinancialDataTag {
    if (!data) {
      return {
        isFinancial: false,
        dataType: 'transaction',
        materialityLevel: 'immaterial',
        requiresApproval: false,
      };
    }

    const content = typeof data === 'string' ? data : JSON.stringify(data);
    const detectedTypes: string[] = [];
    let hasAmount = false;
    let maxAmount = 0;

    // Check for financial patterns
    for (const [type, pattern] of Object.entries(this.financialPatterns)) {
      if (pattern.test(content)) {
        detectedTypes.push(type);
      }
    }

    // Extract amounts to determine materiality
    const amounts = content.match(this.financialPatterns.amount);
    if (amounts) {
      hasAmount = true;
      amounts.forEach((amount) => {
        const value = parseFloat(amount.replace(/[$,]/g, ''));
        if (value > maxAmount) {
          maxAmount = value;
        }
      });
    }

    const isFinancial = detectedTypes.length > 0 || hasAmount;
    const dataType = (detectedTypes[0] as any) || 'transaction';

    // Determine materiality level
    let materialityLevel: 'immaterial' | 'material' | 'highly_material' =
      'immaterial';
    if (maxAmount >= this.config.materialityThreshold) {
      materialityLevel = 'highly_material';
    } else if (maxAmount >= this.config.materialityThreshold * 0.1) {
      materialityLevel = 'material';
    }

    // Determine approval requirements
    const requiresApproval =
      materialityLevel !== 'immaterial' ||
      detectedTypes.some((type) =>
        ['revenue', 'expense', 'asset', 'liability'].includes(type)
      );

    return {
      isFinancial,
      dataType,
      materialityLevel,
      requiresApproval,
      approvalThreshold: maxAmount,
    };
  }

  /**
   * Validate financial transaction
   */
  async validateFinancialTransaction(
    transaction: any
  ): Promise<ValidationResult> {
    try {
      const errors: string[] = [];
      const warnings: string[] = [];

      // Tag the transaction
      const tag = this.tagFinancialData(transaction);

      if (!tag.isFinancial) {
        return { valid: true, errors: [], warnings: [] };
      }

      // Check required fields
      if (!transaction.amount || typeof transaction.amount !== 'number') {
        errors.push('Transaction amount is required and must be a number');
      }

      if (
        !transaction.description ||
        typeof transaction.description !== 'string'
      ) {
        errors.push('Transaction description is required');
      }

      if (!transaction.date || !Date.parse(transaction.date)) {
        errors.push('Valid transaction date is required');
      }

      // Check materiality thresholds
      if (
        tag.materialityLevel === 'highly_material' &&
        !transaction.approvals?.length
      ) {
        errors.push('Highly material transactions require management approval');
      }

      // Check segregation of duties
      if (transaction.createdBy === transaction.approvedBy) {
        errors.push(
          'Segregation of duties violation: same person cannot create and approve'
        );
      }

      // Validate account codes
      if (
        transaction.accountCode &&
        !/^\d{4,6}$/.test(transaction.accountCode)
      ) {
        warnings.push('Account code format may be invalid');
      }

      // Check business hours for manual entries
      if (transaction.entryType === 'manual') {
        const entryDate = new Date(transaction.date);
        const hour = entryDate.getHours();
        if (
          hour < this.config.changeWindowHours.start ||
          hour > this.config.changeWindowHours.end
        ) {
          warnings.push('Transaction entered outside normal business hours');
        }
      }

      const isValid = errors.length === 0;

      await this.logChange(
        'financial_transaction',
        {
          before: {},
          after: transaction,
          changedFields: Object.keys(transaction),
        },
        transaction.createdBy || 'system'
      );

      return {
        valid: isValid,
        errors,
        warnings,
      };
    } catch (error) {
      runtimeLogger.error('Failed to validate financial transaction', {
        error,
      });
      return {
        valid: false,
        errors: [`Validation failed: ${error.message}`],
        warnings: [],
      };
    }
  }

  /**
   * Request a change through the change management process
   */
  async requestChange(
    change: Omit<ChangeRequest, 'id' | 'requestedAt' | 'status'>
  ): Promise<ChangeRequest> {
    try {
      const changeRequest: ChangeRequest = {
        id: `CR_${Date.now()}_${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        requestedAt: new Date(),
        status: 'pending',
        approvals: [],
        ...change,
      };

      await this.storeChangeRequest(changeRequest);

      await this.logChange(
        'change_request',
        {
          before: {},
          after: changeRequest,
          changedFields: ['id', 'status', 'requestedAt'],
        },
        change.requestedBy
      );

      this.emit('changeRequested', changeRequest);
      runtimeLogger.info('Change request created', {
        changeId: changeRequest.id,
        type: change.type,
      });

      return changeRequest;
    } catch (error) {
      runtimeLogger.error('Failed to create change request', { error });
      throw error;
    }
  }

  /**
   * Approve a change request
   */
  async approveChange(
    changeId: string,
    approval: Omit<ChangeApproval, 'approvedAt'>
  ): Promise<void> {
    try {
      const changeRequest = await this.getChangeRequest(changeId);
      if (!changeRequest) {
        throw new Error(`Change request ${changeId} not found`);
      }

      if (changeRequest.status !== 'pending') {
        throw new Error(`Change request ${changeId} is not in pending status`);
      }

      // Check if user can approve (not the same as requestor)
      if (approval.approverId === changeRequest.requestedBy) {
        throw new Error('Requestor cannot approve their own change');
      }

      // Check segregation of duties
      const canApprove = await this.validateSegregationOfDuties(
        approval.approverId,
        'approve_change'
      );
      if (!canApprove) {
        throw new Error(
          'Segregation of duties violation: user cannot approve changes'
        );
      }

      const fullApproval: ChangeApproval = {
        ...approval,
        approvedAt: new Date(),
      };

      changeRequest.approvals.push(fullApproval);

      // Check if enough approvals
      const requiredApprovals = this.getRequiredApprovalsCount(changeRequest);
      if (changeRequest.approvals.length >= requiredApprovals) {
        changeRequest.status = 'approved';
      }

      await this.updateChangeRequest(changeRequest);

      await this.logChange(
        'change_approval',
        {
          before: {
            status: 'pending',
            approvals: changeRequest.approvals.length - 1,
          },
          after: {
            status: changeRequest.status,
            approvals: changeRequest.approvals.length,
          },
          changedFields: ['status', 'approvals'],
        },
        approval.approverId
      );

      this.emit('changeApproved', { changeRequest, approval: fullApproval });
      runtimeLogger.info('Change request approved', {
        changeId,
        approverId: approval.approverId,
        status: changeRequest.status,
      });
    } catch (error) {
      runtimeLogger.error('Failed to approve change', { changeId, error });
      throw error;
    }
  }

  /**
   * Implement an approved change
   */
  async implementChange(
    changeId: string,
    implementation: ChangeImplementation
  ): Promise<void> {
    try {
      const changeRequest = await this.getChangeRequest(changeId);
      if (!changeRequest) {
        throw new Error(`Change request ${changeId} not found`);
      }

      if (changeRequest.status !== 'approved') {
        throw new Error(`Change request ${changeId} is not approved`);
      }

      // Check segregation of duties - implementer cannot be the requestor or approver
      if (implementation.implementedBy === changeRequest.requestedBy) {
        throw new Error(
          'Segregation of duties violation: requestor cannot implement their own change'
        );
      }

      const approverIds = changeRequest.approvals.map((a) => a.approverId);
      if (approverIds.includes(implementation.implementedBy)) {
        throw new Error(
          'Segregation of duties violation: approver cannot implement the change'
        );
      }

      // Validate test results
      const failedTests = implementation.testResults.filter(
        (test) => test.result === 'fail'
      );
      if (failedTests.length > 0) {
        throw new Error(
          `Implementation has failed tests: ${failedTests.map((t) => t.name).join(', ')}`
        );
      }

      if (!implementation.rollbackTested) {
        throw new Error(
          'Rollback procedure must be tested before implementation'
        );
      }

      changeRequest.status = 'implemented';
      changeRequest.implementedAt = new Date();
      changeRequest.implementedBy = implementation.implementedBy;
      changeRequest.testing = implementation.testResults;

      await this.updateChangeRequest(changeRequest);

      await this.logChange(
        'change_implementation',
        {
          before: { status: 'approved' },
          after: {
            status: 'implemented',
            implementedAt: changeRequest.implementedAt,
            implementedBy: implementation.implementedBy,
          },
          changedFields: ['status', 'implementedAt', 'implementedBy'],
        },
        implementation.implementedBy
      );

      this.emit('changeImplemented', { changeRequest, implementation });
      runtimeLogger.info('Change request implemented', {
        changeId,
        implementedBy: implementation.implementedBy,
      });
    } catch (error) {
      runtimeLogger.error('Failed to implement change', { changeId, error });
      throw error;
    }
  }

  /**
   * Validate segregation of duties
   */
  async validateSegregationOfDuties(
    userId: string,
    action: string
  ): Promise<boolean> {
    try {
      const userRoles = await this.getUserRoles(userId);

      // Check for conflicting roles
      for (const role of userRoles) {
        const conflicts = this.conflictingRoles.get(role) || [];
        for (const conflict of conflicts) {
          if (userRoles.includes(conflict)) {
            runtimeLogger.warn('Segregation of duties violation detected', {
              userId,
              role,
              conflict,
              action,
            });
            return false;
          }
        }
      }

      // Action-specific checks
      switch (action) {
        case 'approve_change':
          return !userRoles.includes('requestor');
        case 'implement_change':
          return (
            !userRoles.includes('approver') && !userRoles.includes('requestor')
          );
        case 'financial_transaction':
          return userRoles.includes('authorized_user');
        default:
          return true;
      }
    } catch (error) {
      runtimeLogger.error('Failed to validate segregation of duties', {
        userId,
        action,
        error,
      });
      return false;
    }
  }

  /**
   * Get conflicting roles for a given role
   */
  async getConflictingRoles(roleId: string): Promise<string[]> {
    return this.conflictingRoles.get(roleId) || [];
  }

  /**
   * Log changes for audit trail
   */
  async logChange(
    entity: string,
    changes: ChangeSet,
    userId: string
  ): Promise<void> {
    const auditEntry: SOXAuditEntry = {
      id: `sox_audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      userId,
      action: 'update',
      resource: entity,
      entity,
      changes,
      controlsValidated: [],
      result: 'success',
    };

    // Validate relevant controls
    const relevantControls = Array.from(this.controls.values()).filter(
      (control) => this.isControlRelevant(control, entity)
    );

    auditEntry.controlsValidated = relevantControls.map((c) => c.id);

    await this.memoryProvider.storeMemory({
      id: auditEntry.id,
      agentId: 'system',
      content: JSON.stringify(auditEntry),
      timestamp: auditEntry.timestamp,
      metadata: {
        type: 'sox_audit_log',
        userId,
        entity,
        action: auditEntry.action,
      },
    });

    this.emit('changeLogged', auditEntry);
  }

  /**
   * Get audit log with filters
   */
  async getAuditLog(filters: SOXAuditFilter): Promise<SOXAuditEntry[]> {
    try {
      const memories = await this.memoryProvider.getMemories('system', {
        type: 'sox_audit_log',
      });

      let logs = memories.map((m) => JSON.parse(m.content) as SOXAuditEntry);

      // Apply filters
      if (filters.entity) {
        logs = logs.filter((log) => log.entity === filters.entity);
      }

      if (filters.userId) {
        logs = logs.filter((log) => log.userId === filters.userId);
      }

      if (filters.startDate || filters.endDate) {
        logs = logs.filter((log) => {
          const logDate = new Date(log.timestamp);
          if (filters.startDate && logDate < filters.startDate) return false;
          if (filters.endDate && logDate > filters.endDate) return false;
          return true;
        });
      }

      if (filters.changeType) {
        logs = logs.filter((log) => log.resource.includes(filters.changeType));
      }

      return logs.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } catch (error) {
      runtimeLogger.error('Failed to get audit log', { error });
      throw error;
    }
  }

  /**
   * Test a control's effectiveness
   */
  async testControl(controlId: string): Promise<ControlTestResult> {
    try {
      const control = this.controls.get(controlId);
      if (!control) {
        throw new Error(`Control ${controlId} not found`);
      }

      // Simulate control testing based on type and category
      const sampleSize = this.getSampleSize(control);
      const exceptionsFound = await this.performControlTest(
        control,
        sampleSize
      );

      const effectiveness: 'effective' | 'partially_effective' | 'ineffective' =
        exceptionsFound === 0
          ? 'effective'
          : exceptionsFound <= sampleSize * 0.05
            ? 'partially_effective' // 5% tolerance
            : 'ineffective';

      const testResult: ControlTestResult = {
        controlId,
        testedAt: new Date(),
        testedBy: 'system', // Should be passed from context
        sampleSize,
        exceptionsFound,
        effectiveness,
        findings: this.generateFindings(control, exceptionsFound),
        recommendations: this.generateRecommendations(control, effectiveness),
      };

      // Update control with test result
      control.lastTested = testResult.testedAt;
      control.effectiveness = effectiveness;
      await this.updateControl(control);

      // Store test result
      await this.memoryProvider.storeMemory({
        id: `control_test_${controlId}_${Date.now()}`,
        agentId: 'system',
        content: JSON.stringify(testResult),
        timestamp: testResult.testedAt,
        metadata: {
          type: 'control_test_result',
          controlId,
          effectiveness,
        },
      });

      this.emit('controlTested', testResult);
      runtimeLogger.info('Control tested', {
        controlId,
        effectiveness,
        exceptionsFound,
      });

      return testResult;
    } catch (error) {
      runtimeLogger.error('Failed to test control', { controlId, error });
      throw error;
    }
  }

  /**
   * Get control effectiveness report
   */
  async getControlEffectiveness(): Promise<ControlEffectivenessReport> {
    try {
      const controls = Array.from(this.controls.values());
      const totalControls = controls.length;
      const testedControls = controls.filter((c) => c.lastTested).length;
      const effectiveControls = controls.filter(
        (c) => c.effectiveness === 'effective'
      ).length;

      const controlsByCategory = controls.reduce(
        (acc, control) => {
          if (!acc[control.category]) {
            acc[control.category] = {
              total: 0,
              tested: 0,
              effective: 0,
              partially_effective: 0,
              ineffective: 0,
            };
          }

          acc[control.category].total++;

          if (control.lastTested) {
            acc[control.category].tested++;

            switch (control.effectiveness) {
              case 'effective':
                acc[control.category].effective++;
                break;
              case 'partially_effective':
                acc[control.category].partially_effective++;
                break;
              case 'ineffective':
                acc[control.category].ineffective++;
                break;
            }
          }

          return acc;
        },
        {} as Record<string, ControlCategoryStats>
      );

      const keyFindings = this.generateKeyFindings(controls);

      return {
        period: {
          start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Last 90 days
          end: new Date(),
          type: 'quarterly',
        },
        totalControls,
        testedControls,
        effectiveControls,
        controlsByCategory,
        keyFindings,
      };
    } catch (error) {
      runtimeLogger.error('Failed to get control effectiveness report', {
        error,
      });
      throw error;
    }
  }

  /**
   * Generate SOX compliance report
   */
  async generateSOXReport(period: ReportPeriod): Promise<SOXComplianceReport> {
    try {
      const controlEffectiveness = await this.getControlEffectiveness();
      const materialWeaknesses = await this.getMaterialWeaknesses();
      const significantDeficiencies = await this.getSignificantDeficiencies();
      const remediationPlans = await this.getRemediationPlans();

      const executiveSummary = this.generateExecutiveSummary(
        controlEffectiveness,
        materialWeaknesses,
        significantDeficiencies
      );

      return {
        period,
        executiveSummary,
        controlEffectiveness,
        materialWeaknesses,
        significantDeficiencies,
        remediationPlans,
        auditOpinion: this.determineAuditOpinion(
          materialWeaknesses,
          significantDeficiencies
        ),
      };
    } catch (error) {
      runtimeLogger.error('Failed to generate SOX report', { error });
      throw error;
    }
  }

  /**
   * Get certification status
   */
  async getCertificationStatus(): Promise<CertificationStatus> {
    try {
      const stored = await this.memoryProvider.getMemories('system', {
        type: 'sox_certification',
        limit: 1,
      });

      if (stored.length > 0) {
        return JSON.parse(stored[0].content);
      }

      // Default status
      return {
        status: 'not_certified',
        issues: ['Initial certification required'],
        nextCertificationDue: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      };
    } catch (error) {
      runtimeLogger.error('Failed to get certification status', { error });
      throw error;
    }
  }

  // Private helper methods

  private async getUserRoles(userId: string): Promise<string[]> {
    // In production, this would query the user role system
    // For now, return basic roles based on user
    const defaultRoles = ['authorized_user'];

    if (userId.includes('admin')) {
      defaultRoles.push('administrator');
    }
    if (userId.includes('finance')) {
      defaultRoles.push('financial_analyst');
    }
    if (userId.includes('manager')) {
      defaultRoles.push('approver');
    }

    return defaultRoles;
  }

  private getRequiredApprovalsCount(changeRequest: ChangeRequest): number {
    // Risk-based approval requirements
    switch (changeRequest.risk) {
      case 'high':
        return Math.max(this.config.requiredApprovals, 2);
      case 'medium':
        return this.config.requiredApprovals;
      case 'low':
        return Math.max(this.config.requiredApprovals - 1, 1);
      default:
        return this.config.requiredApprovals;
    }
  }

  private isControlRelevant(control: SOXControl, entity: string): boolean {
    // Determine if a control is relevant to the entity being changed
    switch (control.category) {
      case 'access':
        return entity.includes('user') || entity.includes('permission');
      case 'change_management':
        return entity.includes('change') || entity.includes('configuration');
      case 'data_integrity':
        return entity.includes('financial') || entity.includes('transaction');
      case 'segregation_of_duties':
        return entity.includes('approval') || entity.includes('transaction');
      case 'monitoring':
        return true; // Monitoring controls are always relevant
      default:
        return false;
    }
  }

  private getSampleSize(control: SOXControl): number {
    // Determine sample size based on control frequency and risk
    switch (control.frequency) {
      case 'real_time':
        return Math.min(100, 50); // Test up to 50 real-time controls
      case 'daily':
        return Math.min(30, 25); // Test up to 25 daily controls
      case 'weekly':
        return Math.min(12, 10); // Test up to 10 weekly controls
      case 'monthly':
        return Math.min(12, 6); // Test up to 6 monthly controls
      case 'quarterly':
        return Math.min(4, 3); // Test up to 3 quarterly controls
      case 'annual':
        return 1; // Test annual controls once
      default:
        return 10;
    }
  }

  private async performControlTest(
    control: SOXControl,
    sampleSize: number
  ): Promise<number> {
    // Simulate control testing - in production, this would perform actual tests
    const baseFailureRate = 0.02; // 2% base failure rate
    let adjustedRate = baseFailureRate;

    // Adjust based on control effectiveness history
    if (control.effectiveness === 'ineffective') {
      adjustedRate = 0.15; // 15% failure rate for known ineffective controls
    } else if (control.effectiveness === 'partially_effective') {
      adjustedRate = 0.08; // 8% failure rate for partially effective controls
    }

    // Simulate exceptions
    let exceptions = 0;
    for (let i = 0; i < sampleSize; i++) {
      if (Math.random() < adjustedRate) {
        exceptions++;
      }
    }

    return exceptions;
  }

  private generateFindings(
    control: SOXControl,
    exceptionsFound: number
  ): string[] {
    const findings: string[] = [];

    if (exceptionsFound === 0) {
      findings.push(
        `Control ${control.id} operated effectively with no exceptions found`
      );
    } else {
      findings.push(`Control ${control.id} had ${exceptionsFound} exceptions`);

      if (exceptionsFound > 5) {
        findings.push(
          'High number of exceptions indicates potential control weakness'
        );
      }

      switch (control.category) {
        case 'access':
          findings.push(
            'Access control exceptions require immediate attention'
          );
          break;
        case 'segregation_of_duties':
          findings.push('Segregation of duties violations detected');
          break;
        case 'data_integrity':
          findings.push('Data integrity issues may affect financial reporting');
          break;
      }
    }

    return findings;
  }

  private generateRecommendations(
    control: SOXControl,
    effectiveness: string
  ): string[] {
    const recommendations: string[] = [];

    if (effectiveness === 'ineffective') {
      recommendations.push('Control requires immediate remediation');
      recommendations.push('Consider redesigning the control process');
      recommendations.push('Increase monitoring and oversight');
    } else if (effectiveness === 'partially_effective') {
      recommendations.push('Enhance control procedures and documentation');
      recommendations.push('Provide additional training to control operators');
      recommendations.push('Increase testing frequency');
    } else {
      recommendations.push('Continue current control procedures');
      recommendations.push('Monitor for changes that may affect effectiveness');
    }

    return recommendations;
  }

  private generateKeyFindings(controls: SOXControl[]): string[] {
    const findings: string[] = [];

    const ineffectiveControls = controls.filter(
      (c) => c.effectiveness === 'ineffective'
    ).length;
    const untestedControls = controls.filter((c) => !c.lastTested).length;

    if (ineffectiveControls > 0) {
      findings.push(
        `${ineffectiveControls} controls are ineffective and require remediation`
      );
    }

    if (untestedControls > 0) {
      findings.push(`${untestedControls} controls have not been tested`);
    }

    const accessControls = controls.filter((c) => c.category === 'access');
    const effectiveAccessControls = accessControls.filter(
      (c) => c.effectiveness === 'effective'
    ).length;

    if (effectiveAccessControls / accessControls.length < 0.8) {
      findings.push(
        'Access controls effectiveness is below acceptable threshold'
      );
    }

    return findings;
  }

  private generateExecutiveSummary(
    controlEffectiveness: ControlEffectivenessReport,
    materialWeaknesses: MaterialWeakness[],
    significantDeficiencies: SignificantDeficiency[]
  ): string {
    const effectivenessRate =
      (controlEffectiveness.effectiveControls /
        controlEffectiveness.totalControls) *
      100;

    let summary = `Control effectiveness rate: ${effectivenessRate.toFixed(1)}% `;
    summary += `(${controlEffectiveness.effectiveControls}/${controlEffectiveness.totalControls} controls effective). `;

    if (materialWeaknesses.length > 0) {
      summary += `${materialWeaknesses.length} material weaknesses identified requiring immediate attention. `;
    }

    if (significantDeficiencies.length > 0) {
      summary += `${significantDeficiencies.length} significant deficiencies require remediation. `;
    }

    if (
      materialWeaknesses.length === 0 &&
      significantDeficiencies.length === 0
    ) {
      summary +=
        'No material weaknesses or significant deficiencies identified.';
    }

    return summary;
  }

  private determineAuditOpinion(
    materialWeaknesses: MaterialWeakness[],
    significantDeficiencies: SignificantDeficiency[]
  ): 'unqualified' | 'qualified' | 'adverse' | 'disclaimer' {
    if (materialWeaknesses.length > 0) {
      return 'adverse';
    } else if (significantDeficiencies.length > 2) {
      return 'qualified';
    } else {
      return 'unqualified';
    }
  }

  // Storage methods

  private async storeControl(control: SOXControl): Promise<void> {
    await this.memoryProvider.storeMemory({
      id: `control_${control.id}`,
      agentId: 'system',
      content: JSON.stringify(control),
      timestamp: new Date(),
      metadata: { type: 'sox_control', controlId: control.id },
    });
  }

  private async updateControl(control: SOXControl): Promise<void> {
    this.controls.set(control.id, control);
    await this.storeControl(control);
  }

  private async storeChangeRequest(
    changeRequest: ChangeRequest
  ): Promise<void> {
    await this.memoryProvider.storeMemory({
      id: changeRequest.id,
      agentId: 'system',
      content: JSON.stringify(changeRequest),
      timestamp: changeRequest.requestedAt,
      metadata: {
        type: 'change_request',
        status: changeRequest.status,
        requestedBy: changeRequest.requestedBy,
      },
    });
  }

  private async updateChangeRequest(
    changeRequest: ChangeRequest
  ): Promise<void> {
    await this.storeChangeRequest(changeRequest);
  }

  private async getChangeRequest(id: string): Promise<ChangeRequest | null> {
    try {
      const memory = await this.memoryProvider.getMemories('system', {
        type: 'change_request',
      });

      const found = memory.find((m) => m.id === id);
      return found ? JSON.parse(found.content) : null;
    } catch (error) {
      runtimeLogger.error('Failed to get change request', { id, error });
      return null;
    }
  }

  private async getMaterialWeaknesses(): Promise<MaterialWeakness[]> {
    // In production, this would query actual material weaknesses
    return [];
  }

  private async getSignificantDeficiencies(): Promise<SignificantDeficiency[]> {
    // In production, this would query actual significant deficiencies
    return [];
  }

  private async getRemediationPlans(): Promise<RemediationPlan[]> {
    // In production, this would query actual remediation plans
    return [];
  }
}

/**
 * Factory function to create SOX service
 */
export function createSOXService(
  memoryProvider: MemoryProvider,
  config: SOXConfig
): SOXService {
  return new SOXServiceImpl(memoryProvider, config);
}
