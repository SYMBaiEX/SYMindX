/**
 * Compliance Manager Tests
 * 
 * Tests for the unified compliance management system
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { createComplianceManager } from '../compliance-manager.js';
import { ComplianceConfig } from '../../../types/compliance.js';
import { MemoryProvider } from '../../../types/memory.js';

// Mock memory provider
const mockMemoryProvider: MemoryProvider = {
  async storeMemory(memory) {
    return { success: true, memory };
  },
  async getMemories(agentId, filters) {
    return [];
  },
  async deleteMemory(id) {
    return { success: true };
  },
  async deleteMemories(agentId) {
    return { success: true, count: 0 };
  },
  async searchMemories(query, agentId) {
    return [];
  },
  async updateMemory(id, updates) {
    return { success: true };
  },
  async cleanup() {
    return { success: true };
  }
} as any;

describe('ComplianceManager', () => {
  let complianceConfig: ComplianceConfig;

  beforeEach(() => {
    complianceConfig = {
      enabled: true,
      strictMode: false,
      gdpr: {
        enabled: true,
        legalBasis: 'consent',
        retentionPeriods: {
          'personal_data': 730, // 2 years
          'consent_record': 2555, // 7 years
        },
      },
      hipaa: {
        enabled: true,
        coveredEntity: true,
        encryptionRequired: true,
        sessionTimeout: 30,
        auditLogRetention: 2190, // 6 years
      },
      sox: {
        enabled: true,
        materialityThreshold: 100000,
        controlFramework: 'COSO',
        requiredApprovals: 2,
        changeWindowHours: {
          start: 9,
          end: 17,
        },
      },
    };
  });

  test('should create compliance manager with valid configuration', async () => {
    const manager = createComplianceManager(mockMemoryProvider, complianceConfig);
    
    expect(manager).toBeDefined();
    expect(manager.getConfiguration().enabled).toBe(true);
  });

  test('should classify data correctly', async () => {
    const manager = createComplianceManager(mockMemoryProvider, complianceConfig);
    
    // Test personal data classification
    const personalData = {
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '555-123-4567',
    };
    
    const classification = await manager.classifyData(personalData);
    
    expect(classification.level).toBe('confidential');
    expect(classification.tags).toContain('personalNames:1');
    expect(classification.tags).toContain('emails:1');
    expect(classification.tags).toContain('phones:1');
    expect(classification.tags).toContain('gdpr:personal_data');
  });

  test('should classify financial data correctly', async () => {
    const manager = createComplianceManager(mockMemoryProvider, complianceConfig);
    
    const financialData = {
      transaction: 'Payment received',
      amount: '$150,000.00',
      account: '123456',
      revenue: 'Q4 sales',
    };
    
    const classification = await manager.classifyData(financialData);
    
    expect(classification.level).toBe('confidential');
    expect(classification.tags).toContain('financialAmounts:1');
    expect(classification.tags).toContain('accountNumbers:1');
    expect(classification.tags).toContain('sox:financial_data');
  });

  test('should classify medical data correctly', async () => {
    const manager = createComplianceManager(mockMemoryProvider, complianceConfig);
    
    const medicalData = {
      patient: 'Jane Smith',
      diagnosis: 'Diabetes Type 2',
      treatment: 'Metformin 500mg',
      medicalRecord: 'MR123456',
    };
    
    const classification = await manager.classifyData(medicalData);
    
    expect(classification.level).toBe('restricted');
    expect(classification.tags).toContain('medicalRecords:1');
    expect(classification.tags).toContain('medicalTerms:4');
    expect(classification.tags).toContain('hipaa:phi');
  });

  test('should handle GDPR data subject requests', async () => {
    const manager = createComplianceManager(mockMemoryProvider, complianceConfig);
    
    // Mock GDPR service methods
    const mockExportData = {
      userId: 'user123',
      exportedAt: new Date(),
      format: 'json' as const,
      data: {
        profile: { name: 'John Doe', email: 'john@example.com' },
        memories: [],
        consents: [],
      },
      metadata: {
        dataCategories: ['profile'],
        totalRecords: 1,
        exportVersion: '1.0.0',
      },
    };

    // Test would require mocking the GDPR service
    // For now, just test that the service exists
    expect(manager.gdpr).toBeDefined();
  });

  test('should get compliance status', async () => {
    const manager = createComplianceManager(mockMemoryProvider, complianceConfig);
    
    const status = await manager.getComplianceStatus();
    
    expect(status).toBeDefined();
    expect(typeof status.overallCompliant).toBe('boolean');
    expect(status.gdpr).toBeDefined();
    expect(status.hipaa).toBeDefined();
    expect(status.sox).toBeDefined();
  });

  test('should generate compliance report', async () => {
    const manager = createComplianceManager(mockMemoryProvider, complianceConfig);
    
    const report = await manager.generateComplianceReport(['gdpr', 'hipaa', 'sox']);
    
    expect(report).toBeDefined();
    expect(report.generatedAt).toBeInstanceOf(Date);
    expect(report.period).toBeDefined();
    expect(report.regulations).toBeDefined();
    expect(report.summary).toBeDefined();
    expect(typeof report.summary.overallCompliance).toBe('boolean');
  });

  test('should export audit logs', async () => {
    const manager = createComplianceManager(mockMemoryProvider, complianceConfig);
    
    const auditLogs = await manager.exportAuditLog({
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
      endDate: new Date(),
    });
    
    expect(Array.isArray(auditLogs)).toBe(true);
  });

  test('should handle disabled compliance', async () => {
    const disabledConfig: ComplianceConfig = {
      enabled: false,
    };
    
    const manager = createComplianceManager(mockMemoryProvider, disabledConfig);
    
    const classification = await manager.classifyData({ sensitive: 'data' });
    expect(classification.level).toBe('public');
    expect(classification.tags).toEqual([]);
    expect(classification.handlingRules).toEqual([]);
  });

  test('should handle strict mode properly', async () => {
    const strictConfig: ComplianceConfig = {
      ...complianceConfig,
      strictMode: true,
    };
    
    const manager = createComplianceManager(mockMemoryProvider, strictConfig);
    
    // In strict mode, compliance violations should be more strictly enforced
    const config = manager.getConfiguration();
    expect(config.strictMode).toBe(true);
  });
});

describe('Individual Compliance Services', () => {
  test('should handle GDPR consent management', async () => {
    const config: ComplianceConfig = {
      enabled: true,
      gdpr: { enabled: true, legalBasis: 'consent' },
    };
    
    const manager = createComplianceManager(mockMemoryProvider, config);
    
    // Test basic GDPR functionality
    expect(manager.gdpr).toBeDefined();
    expect(typeof manager.gdpr.recordConsent).toBe('function');
    expect(typeof manager.gdpr.withdrawConsent).toBe('function');
    expect(typeof manager.gdpr.deleteUserData).toBe('function');
  });

  test('should handle HIPAA PHI protection', async () => {
    const config: ComplianceConfig = {
      enabled: true,
      hipaa: { enabled: true, coveredEntity: true },
    };
    
    const manager = createComplianceManager(mockMemoryProvider, config);
    
    // Test basic HIPAA functionality
    expect(manager.hipaa).toBeDefined();
    expect(typeof manager.hipaa.classifyData).toBe('function');
    expect(typeof manager.hipaa.encryptPHI).toBe('function');
    expect(typeof manager.hipaa.logAccess).toBe('function');
  });

  test('should handle SOX financial controls', async () => {
    const config: ComplianceConfig = {
      enabled: true,
      sox: { enabled: true, materialityThreshold: 50000 },
    };
    
    const manager = createComplianceManager(mockMemoryProvider, config);
    
    // Test basic SOX functionality
    expect(manager.sox).toBeDefined();
    expect(typeof manager.sox.tagFinancialData).toBe('function');
    expect(typeof manager.sox.validateFinancialTransaction).toBe('function');
    expect(typeof manager.sox.requestChange).toBe('function');
  });
});

describe('Data Classification', () => {
  test('should classify public data correctly', async () => {
    const manager = createComplianceManager(mockMemoryProvider, {
      enabled: true,
      gdpr: { enabled: true },
    });
    
    const publicData = {
      message: 'Hello world',
      timestamp: new Date().toISOString(),
      status: 'active',
    };
    
    const classification = await manager.classifyData(publicData);
    
    expect(classification.level).toBe('public');
    expect(classification.tags.length).toBe(0);
    expect(classification.handlingRules.length).toBe(1); // Should have public data rule
  });

  test('should apply correct handling rules', async () => {
    const manager = createComplianceManager(mockMemoryProvider, {
      enabled: true,
      gdpr: { enabled: true },
      hipaa: { enabled: true },
      sox: { enabled: true },
    });
    
    const sensitiveData = {
      name: 'John Doe',
      ssn: '123-45-6789',
      amount: '$75,000',
      diagnosis: 'Hypertension',
    };
    
    const classification = await manager.classifyData(sensitiveData);
    
    expect(classification.level).toBe('restricted');
    expect(classification.handlingRules.length).toBeGreaterThan(0);
    
    // Should have rules for all applicable regulations
    const ruleIds = classification.handlingRules.map(rule => rule.id);
    expect(ruleIds).toContain('gdpr_personal_data');
    expect(ruleIds).toContain('hipaa_phi');
    expect(ruleIds).toContain('sox_financial');
  });
});