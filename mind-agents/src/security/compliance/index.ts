/**
 * Compliance Module Exports
 * 
 * Central export point for all compliance-related functionality
 */

// Main compliance manager
export { createComplianceManager, ComplianceManagerImpl } from './compliance-manager.js';

// Individual service implementations
export { createGDPRService, GDPRServiceImpl } from './gdpr/gdpr-service.js';
export { createHIPAAService, HIPAAServiceImpl } from './hipaa/hipaa-service.js';
export { createSOXService, SOXServiceImpl } from './sox/sox-service.js';

// Common utilities
export { createDataClassifier, DataClassifier } from './common/data-classifier.js';
export { createRetentionManager, RetentionManager } from './common/retention-manager.js';

// Type re-exports for convenience
export type {
  ComplianceManager,
  ComplianceConfig,
  ComplianceStatus,
  ComplianceReport,
  DataClassification,
  DataHandlingRule,
  RetentionPolicy,
  AuditEntry,
  
  // GDPR types
  GDPRService,
  GDPRConfig,
  ConsentPurpose,
  ConsentRecord,
  UserDataExport,
  DataSubjectRequest,
  
  // HIPAA types
  HIPAAService,
  HIPAAConfig,
  PHIClassification,
  HIPAAAuditLog,
  EncryptedData,
  BreachIncident,
  
  // SOX types
  SOXService,
  SOXConfig,
  SOXControl,
  FinancialDataTag,
  ChangeRequest,
  ControlTestResult,
  SOXComplianceReport,
} from '../../types/compliance.js';

// Factory function type for module registration
export type ComplianceModuleFactory = (memoryProvider: any, config: any) => Promise<ComplianceManager>;