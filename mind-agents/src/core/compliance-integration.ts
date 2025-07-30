/**
 * Compliance Integration for SYMindX Runtime
 *
 * Integrates compliance management into the agent runtime system
 * Provides compliance-aware operations and monitoring
 */

import {
  ComplianceManager,
  ComplianceConfig,
  DataClassification,
  ComplianceStatus,
} from '../security/compliance/index.js';
import { createComplianceManager } from '../security/compliance/compliance-manager.js';
import { MemoryProvider } from '../types/memory.js';
import { EventBus } from '../types/agent.js';
import { runtimeLogger } from '../utils/logger.js';
import { EventEmitter } from 'events';

export interface ComplianceIntegrationConfig {
  enabled: boolean;
  gdpr?: {
    enabled: boolean;
    dataProtectionOfficer?: {
      name: string;
      email: string;
      phone?: string;
    };
    retentionPeriods?: Record<string, number>;
    legalBasis?:
      | 'consent'
      | 'contract'
      | 'legal_obligation'
      | 'vital_interests'
      | 'public_task'
      | 'legitimate_interests';
  };
  hipaa?: {
    enabled: boolean;
    coveredEntity?: boolean;
    businessAssociate?: boolean;
    encryptionRequired?: boolean;
    minimumPasswordLength?: number;
    sessionTimeout?: number;
    auditLogRetention?: number;
  };
  sox?: {
    enabled: boolean;
    fiscalYearEnd?: Date;
    materialityThreshold?: number;
    controlFramework?: 'COSO' | 'COBIT';
    requiredApprovals?: number;
    changeWindowHours?: {
      start: number;
      end: number;
    };
  };
  strictMode?: boolean;
  autoClassifyData?: boolean;
  enableRealTimeMonitoring?: boolean;
}

export class ComplianceIntegration extends EventEmitter {
  private complianceManager: ComplianceManager;
  private config: ComplianceIntegrationConfig;
  private eventBus: EventBus;
  private memoryProvider: MemoryProvider;
  private isEnabled: boolean = false;
  private monitoringInterval?: NodeJS.Timeout;

  constructor(
    memoryProvider: MemoryProvider,
    eventBus: EventBus,
    config: ComplianceIntegrationConfig
  ) {
    super();

    this.memoryProvider = memoryProvider;
    this.eventBus = eventBus;
    this.config = config;
    this.isEnabled = config.enabled;

    if (this.isEnabled) {
      // Create compliance manager with mapped configuration
      const complianceConfig: ComplianceConfig = {
        enabled: true,
        strictMode: config.strictMode || false,
        gdpr: config.gdpr,
        hipaa: config.hipaa,
        sox: config.sox,
      };

      this.complianceManager = createComplianceManager(
        memoryProvider,
        complianceConfig
      );
      this.setupEventHandling();
    } else {
      // Create no-op compliance manager
      this.complianceManager = this.createNoOpComplianceManager();
    }
  }

  /**
   * Initialize compliance integration
   */
  async initialize(): Promise<void> {
    if (!this.isEnabled) {
      runtimeLogger.info('Compliance integration disabled');
      return;
    }

    try {
      runtimeLogger.info('Initializing compliance integration', {
        gdpr: this.config.gdpr?.enabled || false,
        hipaa: this.config.hipaa?.enabled || false,
        sox: this.config.sox?.enabled || false,
      });

      // Set up real-time monitoring if enabled
      if (this.config.enableRealTimeMonitoring) {
        this.startRealTimeMonitoring();
      }

      // Set up runtime event listeners
      this.setupRuntimeIntegration();

      this.emit('initialized');
      runtimeLogger.info('Compliance integration initialized successfully');
    } catch (error) {
      runtimeLogger.error('Failed to initialize compliance integration', {
        error,
      });
      throw error;
    }
  }

  /**
   * Shutdown compliance integration
   */
  async shutdown(): Promise<void> {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    this.emit('shutdown');
    runtimeLogger.info('Compliance integration shutdown completed');
  }

  /**
   * Get compliance manager instance
   */
  getComplianceManager(): ComplianceManager {
    return this.complianceManager;
  }

  /**
   * Check if compliance is enabled
   */
  isComplianceEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Classify data for compliance
   */
  async classifyData(
    data: any,
    context?: { agentId?: string; userId?: string }
  ): Promise<DataClassification> {
    if (!this.isEnabled) {
      return {
        level: 'public',
        tags: [],
        handlingRules: [],
      };
    }

    try {
      const classification = await this.complianceManager.classifyData(data);

      // Log classification for audit trail
      if (classification.level !== 'public') {
        runtimeLogger.debug('Data classified as sensitive', {
          level: classification.level,
          tags: classification.tags,
          agentId: context?.agentId,
          userId: context?.userId,
        });
      }

      this.emit('dataClassified', { classification, context });
      return classification;
    } catch (error) {
      runtimeLogger.error('Failed to classify data', { error, context });
      throw error;
    }
  }

  /**
   * Process agent memory with compliance awareness
   */
  async processAgentMemory(agentId: string, memories: any[]): Promise<void> {
    if (!this.isEnabled || !this.config.autoClassifyData) {
      return;
    }

    try {
      for (const memory of memories) {
        const classification = await this.classifyData(memory.content, {
          agentId,
        });

        // Apply compliance rules based on classification
        if (
          classification.level === 'restricted' ||
          classification.level === 'confidential'
        ) {
          // Add compliance metadata to memory
          memory.metadata = {
            ...memory.metadata,
            compliance: {
              classification: classification.level,
              tags: classification.tags,
              classifiedAt: new Date().toISOString(),
            },
          };

          // Apply handling rules
          for (const rule of classification.handlingRules) {
            await this.applyHandlingRule(memory, rule, { agentId });
          }
        }
      }
    } catch (error) {
      runtimeLogger.error('Failed to process agent memory for compliance', {
        agentId,
        error,
      });
    }
  }

  /**
   * Handle user data deletion request (GDPR Right to Erasure)
   */
  async handleUserDataDeletion(userId: string, reason?: string): Promise<void> {
    if (!this.isEnabled || !this.config.gdpr?.enabled) {
      throw new Error('GDPR compliance not enabled');
    }

    try {
      await this.complianceManager.gdpr.deleteUserData(userId);

      runtimeLogger.info('User data deletion completed', { userId, reason });
      this.emit('userDataDeleted', { userId, reason });
    } catch (error) {
      runtimeLogger.error('Failed to delete user data', { userId, error });
      throw error;
    }
  }

  /**
   * Export user data (GDPR Data Portability)
   */
  async exportUserData(
    userId: string,
    format: 'json' | 'csv' | 'xml' = 'json'
  ): Promise<any> {
    if (!this.isEnabled || !this.config.gdpr?.enabled) {
      throw new Error('GDPR compliance not enabled');
    }

    try {
      const exportData = await this.complianceManager.gdpr.exportUserData(
        userId,
        format
      );

      runtimeLogger.info('User data exported', {
        userId,
        format,
        recordCount: exportData.metadata.totalRecords,
      });
      this.emit('userDataExported', { userId, format, exportData });

      return exportData;
    } catch (error) {
      runtimeLogger.error('Failed to export user data', {
        userId,
        format,
        error,
      });
      throw error;
    }
  }

  /**
   * Get current compliance status
   */
  async getComplianceStatus(): Promise<ComplianceStatus> {
    if (!this.isEnabled) {
      return {
        overallCompliant: true,
      };
    }

    return await this.complianceManager.getComplianceStatus();
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(
    regulations?: ('gdpr' | 'hipaa' | 'sox')[]
  ): Promise<any> {
    if (!this.isEnabled) {
      throw new Error('Compliance not enabled');
    }

    return await this.complianceManager.generateComplianceReport(regulations);
  }

  // Private methods

  private setupEventHandling(): void {
    // Forward compliance events to runtime event bus
    this.complianceManager.on('gdpr:dataDeleted', (data) => {
      this.eventBus.emit('compliance:gdpr:dataDeleted', data);
    });

    this.complianceManager.on('gdpr:consentWithdrawn', (data) => {
      this.eventBus.emit('compliance:gdpr:consentWithdrawn', data);
    });

    this.complianceManager.on('hipaa:accessLogged', (data) => {
      this.eventBus.emit('compliance:hipaa:accessLogged', data);
    });

    this.complianceManager.on('hipaa:breachReported', (data) => {
      this.eventBus.emit('compliance:hipaa:breachReported', data);
    });

    this.complianceManager.on('sox:changeRequested', (data) => {
      this.eventBus.emit('compliance:sox:changeRequested', data);
    });

    this.complianceManager.on('sox:controlTested', (data) => {
      this.eventBus.emit('compliance:sox:controlTested', data);
    });

    this.complianceManager.on('retention:executed', (data) => {
      this.eventBus.emit('compliance:retention:executed', data);
    });
  }

  private setupRuntimeIntegration(): void {
    // Listen for agent lifecycle events
    this.eventBus.on('agent:created', async (event: any) => {
      if (this.config.autoClassifyData) {
        await this.handleAgentCreated(event.agentId, event.config);
      }
    });

    this.eventBus.on('agent:message:received', async (event: any) => {
      if (this.config.autoClassifyData) {
        await this.handleMessageReceived(event.agentId, event.message);
      }
    });

    this.eventBus.on('memory:stored', async (event: any) => {
      if (this.config.autoClassifyData) {
        await this.handleMemoryStored(event.agentId, event.memory);
      }
    });
  }

  private startRealTimeMonitoring(): void {
    // Monitor compliance status every 5 minutes
    this.monitoringInterval = setInterval(
      async () => {
        try {
          const status = await this.getComplianceStatus();

          if (!status.overallCompliant) {
            const issues = [];
            if (status.gdpr && !status.gdpr.compliant) {
              issues.push(...status.gdpr.issues);
            }
            if (status.hipaa && !status.hipaa.compliant) {
              issues.push(...status.hipaa.issues);
            }
            if (status.sox && !status.sox.compliant) {
              issues.push(...status.sox.issues);
            }

            runtimeLogger.warn('Compliance issues detected', { issues });
            this.emit('complianceIssues', { status, issues });
          }
        } catch (error) {
          runtimeLogger.error('Failed to check compliance status', { error });
        }
      },
      5 * 60 * 1000
    ); // 5 minutes
  }

  private async handleAgentCreated(
    agentId: string,
    config: any
  ): Promise<void> {
    try {
      // Classify agent configuration for sensitive data
      await this.classifyData(config, { agentId });
    } catch (error) {
      runtimeLogger.error('Failed to handle agent creation for compliance', {
        agentId,
        error,
      });
    }
  }

  private async handleMessageReceived(
    agentId: string,
    message: any
  ): Promise<void> {
    try {
      // Classify message content
      const classification = await this.classifyData(message.content, {
        agentId,
        userId: message.userId,
      });

      // Log sensitive message access
      if (
        classification.level === 'restricted' ||
        classification.level === 'confidential'
      ) {
        if (
          this.config.hipaa?.enabled &&
          classification.tags.some((tag) => tag.startsWith('hipaa:'))
        ) {
          await this.complianceManager.hipaa.logAccess({
            userId: message.userId || 'unknown',
            action: 'read',
            resource: 'message',
            resourceId: message.id,
            accessLocation: {
              ipAddress: '127.0.0.1', // Should be from request context
            },
            result: 'success',
          });
        }
      }
    } catch (error) {
      runtimeLogger.error('Failed to handle message for compliance', {
        agentId,
        error,
      });
    }
  }

  private async handleMemoryStored(
    agentId: string,
    memory: any
  ): Promise<void> {
    try {
      // Classify stored memory
      const classification = await this.classifyData(memory.content, {
        agentId,
      });

      // Update memory with compliance metadata
      if (classification.level !== 'public') {
        memory.metadata = {
          ...memory.metadata,
          compliance: {
            classification: classification.level,
            tags: classification.tags,
            classifiedAt: new Date().toISOString(),
          },
        };

        // Re-store memory with compliance metadata
        await this.memoryProvider.storeMemory(memory);
      }
    } catch (error) {
      runtimeLogger.error('Failed to handle memory storage for compliance', {
        agentId,
        error,
      });
    }
  }

  private async applyHandlingRule(
    data: any,
    rule: any,
    context: any
  ): Promise<void> {
    try {
      for (const action of rule.actions) {
        switch (action.type) {
          case 'encrypt':
            if (
              this.config.hipaa?.enabled &&
              this.config.hipaa.encryptionRequired
            ) {
              // Apply encryption (would integrate with HIPAA service)
              runtimeLogger.debug('Encryption required for data', {
                agentId: context.agentId,
                rule: rule.id,
              });
            }
            break;

          case 'audit':
            // Log audit entry
            runtimeLogger.info('Compliance audit required', {
              agentId: context.agentId,
              rule: rule.id,
              action: action.type,
            });
            break;

          case 'anonymize':
            // Apply anonymization (would integrate with data classifier)
            runtimeLogger.debug('Anonymization required for data', {
              agentId: context.agentId,
              rule: rule.id,
            });
            break;

          case 'notify':
            // Send notification about sensitive data access
            this.emit('sensitiveDataAccess', {
              agentId: context.agentId,
              rule: rule.id,
              timestamp: new Date(),
            });
            break;
        }
      }
    } catch (error) {
      runtimeLogger.error('Failed to apply handling rule', {
        rule: rule.id,
        error,
      });
    }
  }

  private createNoOpComplianceManager(): ComplianceManager {
    return {
      configure: async () => {
        throw new Error('Compliance not enabled');
      },
      getConfiguration: () => ({ enabled: false }),
      classifyData: async () => ({
        level: 'public',
        tags: [],
        handlingRules: [],
      }),
      applyRetentionPolicy: async () => {
        throw new Error('Compliance not enabled');
      },
      getComplianceStatus: async () => ({ overallCompliant: true }),
      generateComplianceReport: async () => {
        throw new Error('Compliance not enabled');
      },
      exportAuditLog: async () => {
        throw new Error('Compliance not enabled');
      },
      gdpr: {} as any,
      hipaa: {} as any,
      sox: {} as any,
    };
  }
}

/**
 * Factory function to create compliance integration
 */
export function createComplianceIntegration(
  memoryProvider: MemoryProvider,
  eventBus: EventBus,
  config: ComplianceIntegrationConfig
): ComplianceIntegration {
  return new ComplianceIntegration(memoryProvider, eventBus, config);
}
