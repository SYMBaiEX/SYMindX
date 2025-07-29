/**
 * Compliance Type Definitions
 * 
 * Core types for GDPR, HIPAA, and SOX compliance implementations
 */

// Common Compliance Types
export interface ComplianceConfig {
  gdpr?: GDPRConfig;
  hipaa?: HIPAAConfig;
  sox?: SOXConfig;
  enabled: boolean;
  strictMode?: boolean;
}

export interface DataClassification {
  level: 'public' | 'internal' | 'confidential' | 'restricted';
  tags: string[];
  handlingRules: DataHandlingRule[];
}

export interface DataHandlingRule {
  id: string;
  name: string;
  description: string;
  actions: DataAction[];
  restrictions: DataRestriction[];
}

export interface DataAction {
  type: 'encrypt' | 'anonymize' | 'redact' | 'audit' | 'notify';
  parameters?: Record<string, any>;
}

export interface DataRestriction {
  type: 'access' | 'storage' | 'processing' | 'transfer';
  condition: string;
  allowedValues?: string[];
}

export interface RetentionPolicy {
  id: string;
  name: string;
  dataType: string;
  retentionPeriod: number; // in days
  action: 'delete' | 'archive' | 'anonymize';
  legalHold?: boolean;
}

export interface AuditEntry {
  id: string;
  timestamp: Date;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  result: 'success' | 'failure';
  errorMessage?: string;
}

// GDPR Types
export interface GDPRConfig {
  enabled: boolean;
  dataProtectionOfficer?: {
    name: string;
    email: string;
    phone?: string;
  };
  retentionPeriods: Record<string, number>;
  legalBasis: 'consent' | 'contract' | 'legal_obligation' | 'vital_interests' | 'public_task' | 'legitimate_interests';
  dataProcessingAgreements?: string[];
}

export interface ConsentPurpose {
  id: string;
  name: string;
  description: string;
  required: boolean;
  dataTypes: string[];
  processingActivities: string[];
  retentionPeriod?: number;
}

export interface ConsentRecord {
  id: string;
  userId: string;
  purposes: ConsentPurpose[];
  givenAt: Date;
  withdrawnAt?: Date;
  ipAddress: string;
  userAgent: string;
  version: string;
}

export interface ConsentStatus {
  userId: string;
  consents: ConsentRecord[];
  activeConsents: ConsentPurpose[];
  withdrawnConsents: ConsentPurpose[];
}

export interface UserDataExport {
  userId: string;
  exportedAt: Date;
  format: 'json' | 'csv' | 'xml';
  data: {
    profile?: Record<string, any>;
    messages?: Array<{
      id: string;
      content: string;
      timestamp: Date;
      role: 'user' | 'agent' | 'system';
      metadata?: Record<string, unknown>;
    }>;
    memories?: Array<{
      id: string;
      content: string;
      timestamp: Date;
      importance: number;
      tags: string[];
    }>;
    preferences?: Record<string, any>;
    consents?: ConsentRecord[];
    auditLogs?: AuditEntry[];
  };
  metadata: {
    dataCategories: string[];
    totalRecords: number;
    exportVersion: string;
  };
}

export interface GDPRService {
  // Right to erasure
  deleteUserData(userId: string): Promise<void>;
  anonymizeUserData(userId: string): Promise<void>;
  
  // Data portability
  exportUserData(userId: string, format?: 'json' | 'csv' | 'xml'): Promise<UserDataExport>;
  
  // Consent management
  recordConsent(userId: string, purposes: ConsentPurpose[]): Promise<ConsentRecord>;
  withdrawConsent(userId: string, purposeIds: string[]): Promise<void>;
  getConsentStatus(userId: string): Promise<ConsentStatus>;
  
  // Data subject requests
  handleDataSubjectRequest(request: DataSubjectRequest): Promise<DataSubjectResponse>;
  
  // Privacy rights
  getPrivacyPolicy(): Promise<PrivacyPolicy>;
  updatePrivacyPolicy(policy: PrivacyPolicy): Promise<void>;
}

export interface DataSubjectRequest {
  id: string;
  userId: string;
  type: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction' | 'objection';
  submittedAt: Date;
  details?: string;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
}

export interface DataSubjectResponse {
  requestId: string;
  status: 'completed' | 'rejected';
  completedAt: Date;
  data?: Record<string, unknown>;
  rejectionReason?: string;
}

export interface PrivacyPolicy {
  version: string;
  effectiveDate: Date;
  lastUpdated: Date;
  content: string;
  dataCategories: string[];
  purposes: ConsentPurpose[];
  retentionPolicies: RetentionPolicy[];
  thirdParties?: ThirdParty[];
}

export interface ThirdParty {
  name: string;
  purpose: string;
  dataShared: string[];
  location: string;
  safeguards: string[];
}

// HIPAA Types
export interface HIPAAConfig {
  enabled: boolean;
  coveredEntity: boolean;
  businessAssociate: boolean;
  encryptionRequired: boolean;
  minimumPasswordLength: number;
  sessionTimeout: number; // in minutes
  auditLogRetention: number; // in days
}

export interface PHIClassification {
  isPHI: boolean;
  dataType: 'name' | 'address' | 'date' | 'phone' | 'email' | 'ssn' | 'medical_record' | 'health_plan' | 'biometric' | 'photo' | 'other';
  sensitivityLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface HIPAAAuditLog {
  id: string;
  timestamp: Date;
  userId: string;
  patientId?: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'print' | 'export' | 'transmit';
  resource: string;
  resourceId: string;
  phi?: PHIClassification;
  accessLocation: {
    ipAddress: string;
    location?: string;
    device?: string;
  };
  result: 'success' | 'failure' | 'unauthorized';
  details?: Record<string, any>;
}

export interface HIPAAService {
  // PHI Protection
  classifyData(data: Record<string, unknown>): PHIClassification;
  encryptPHI(data: Record<string, unknown>): Promise<EncryptedData>;
  decryptPHI(encryptedData: EncryptedData, authorization: PHIAuthorization): Promise<any>;
  
  // Access control
  authorizeAccess(userId: string, patientId: string, action: string): Promise<PHIAuthorization>;
  checkAuthorization(authorization: PHIAuthorization): boolean;
  
  // Audit logging
  logAccess(log: Omit<HIPAAAuditLog, 'id' | 'timestamp'>): Promise<void>;
  getAccessLog(patientId: string, startDate?: Date, endDate?: Date): Promise<HIPAAAuditLog[]>;
  getAuditReport(filters: AuditFilter): Promise<AuditReport>;
  
  // Breach notification
  reportBreach(breach: BreachIncident): Promise<void>;
  getBreachLog(): Promise<BreachIncident[]>;
  
  // Training and awareness
  recordTraining(userId: string, training: SecurityTraining): Promise<void>;
  getTrainingStatus(userId: string): Promise<TrainingStatus>;
}

export interface EncryptedData {
  algorithm: string;
  encryptedValue: string;
  keyId: string;
  iv?: string;
  tag?: string;
}

export interface PHIAuthorization {
  userId: string;
  patientId: string;
  permissions: string[];
  validUntil: Date;
  purpose: string;
}

export interface BreachIncident {
  id: string;
  discoveredAt: Date;
  reportedAt?: Date;
  affectedRecords: number;
  dataTypes: string[];
  cause: 'theft' | 'loss' | 'unauthorized_access' | 'improper_disposal' | 'other';
  description: string;
  containmentActions: string[];
  notificationsSent: boolean;
}

export interface SecurityTraining {
  id: string;
  name: string;
  completedAt: Date;
  score?: number;
  certificateId?: string;
}

export interface TrainingStatus {
  userId: string;
  trainings: SecurityTraining[];
  lastTrainingDate: Date;
  isCompliant: boolean;
  nextRequiredDate: Date;
}

export interface AuditFilter {
  startDate?: Date;
  endDate?: Date;
  userId?: string;
  patientId?: string;
  action?: string;
  result?: 'success' | 'failure' | 'unauthorized';
}

export interface AuditReport {
  period: {
    start: Date;
    end: Date;
  };
  totalAccesses: number;
  uniqueUsers: number;
  uniquePatients: number;
  accessesByAction: Record<string, number>;
  unauthorizedAttempts: number;
  anomalies: AuditAnomaly[];
}

export interface AuditAnomaly {
  type: 'unusual_time' | 'excessive_access' | 'unauthorized_attempt' | 'location_change';
  userId: string;
  timestamp: Date;
  details: string;
  severity: 'low' | 'medium' | 'high';
}

// SOX Types
export interface SOXConfig {
  enabled: boolean;
  fiscalYearEnd: Date;
  materialityThreshold: number;
  controlFramework: 'COSO' | 'COBIT';
  requiredApprovals: number;
  changeWindowHours: {
    start: number;
    end: number;
  };
}

export interface SOXControl {
  id: string;
  name: string;
  description: string;
  type: 'preventive' | 'detective' | 'corrective';
  category: 'access' | 'change_management' | 'segregation_of_duties' | 'data_integrity' | 'monitoring';
  frequency: 'real_time' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
  owner: string;
  lastTested?: Date;
  effectiveness: 'effective' | 'partially_effective' | 'ineffective' | 'not_tested';
}

export interface FinancialDataTag {
  isFinancial: boolean;
  dataType: 'revenue' | 'expense' | 'asset' | 'liability' | 'equity' | 'transaction' | 'journal_entry';
  materialityLevel: 'immaterial' | 'material' | 'highly_material';
  requiresApproval: boolean;
  approvalThreshold?: number;
}

export interface ChangeRequest {
  id: string;
  requestedBy: string;
  requestedAt: Date;
  type: 'configuration' | 'code' | 'data' | 'access' | 'policy';
  description: string;
  businessJustification: string;
  risk: 'low' | 'medium' | 'high';
  approvals: ChangeApproval[];
  implementedAt?: Date;
  implementedBy?: string;
  rollbackPlan?: string;
  testing?: ChangeTest[];
  status: 'pending' | 'approved' | 'rejected' | 'implemented' | 'rolled_back';
}

export interface ChangeApproval {
  approverId: string;
  approvedAt: Date;
  role: 'manager' | 'technical_lead' | 'security_officer' | 'finance_officer';
  comments?: string;
}

export interface ChangeTest {
  name: string;
  testedBy: string;
  testedAt: Date;
  result: 'pass' | 'fail';
  evidence?: string;
}

export interface SOXService {
  // Financial data controls
  tagFinancialData(data: Record<string, unknown>): FinancialDataTag;
  validateFinancialTransaction(transaction: Record<string, unknown>): Promise<ValidationResult>;
  
  // Change management
  requestChange(change: Omit<ChangeRequest, 'id' | 'requestedAt' | 'status'>): Promise<ChangeRequest>;
  approveChange(changeId: string, approval: Omit<ChangeApproval, 'approvedAt'>): Promise<void>;
  implementChange(changeId: string, implementation: ChangeImplementation): Promise<void>;
  
  // Segregation of duties
  validateSegregationOfDuties(userId: string, action: string): Promise<boolean>;
  getConflictingRoles(roleId: string): Promise<string[]>;
  
  // Audit trail
  logChange(entity: string, changes: ChangeSet, userId: string): Promise<void>;
  getAuditLog(filters: SOXAuditFilter): Promise<SOXAuditEntry[]>;
  
  // Control testing
  testControl(controlId: string): Promise<ControlTestResult>;
  getControlEffectiveness(): Promise<ControlEffectivenessReport>;
  
  // Compliance reporting
  generateSOXReport(period: ReportPeriod): Promise<SOXComplianceReport>;
  getCertificationStatus(): Promise<CertificationStatus>;
}

export interface ChangeImplementation {
  implementedBy: string;
  testResults: ChangeTest[];
  rollbackTested: boolean;
  notes?: string;
}

export interface ChangeSet {
  before: Record<string, any>;
  after: Record<string, any>;
  changedFields: string[];
}

export interface SOXAuditFilter {
  entity?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  changeType?: string;
}

export interface SOXAuditEntry extends AuditEntry {
  entity: string;
  changes: ChangeSet;
  approvals?: ChangeApproval[];
  controlsValidated: string[];
}

export interface ControlTestResult {
  controlId: string;
  testedAt: Date;
  testedBy: string;
  sampleSize: number;
  exceptionsFound: number;
  effectiveness: 'effective' | 'partially_effective' | 'ineffective';
  findings: string[];
  recommendations: string[];
}

export interface ControlEffectivenessReport {
  period: ReportPeriod;
  totalControls: number;
  testedControls: number;
  effectiveControls: number;
  controlsByCategory: Record<string, ControlCategoryStats>;
  keyFindings: string[];
  managementResponse?: string;
}

export interface ControlCategoryStats {
  total: number;
  tested: number;
  effective: number;
  partially_effective: number;
  ineffective: number;
}

export interface ReportPeriod {
  start: Date;
  end: Date;
  type: 'monthly' | 'quarterly' | 'annual';
}

export interface SOXComplianceReport {
  period: ReportPeriod;
  executiveSummary: string;
  controlEffectiveness: ControlEffectivenessReport;
  materialWeaknesses: MaterialWeakness[];
  significantDeficiencies: SignificantDeficiency[];
  remediationPlans: RemediationPlan[];
  auditOpinion?: 'unqualified' | 'qualified' | 'adverse' | 'disclaimer';
}

export interface MaterialWeakness {
  id: string;
  description: string;
  controlsAffected: string[];
  discoveredDate: Date;
  status: 'open' | 'remediated' | 'in_progress';
  remediationPlan?: RemediationPlan;
}

export interface SignificantDeficiency {
  id: string;
  description: string;
  controlsAffected: string[];
  risk: 'low' | 'medium' | 'high';
  status: 'open' | 'remediated' | 'in_progress';
}

export interface RemediationPlan {
  id: string;
  issue: string;
  actions: RemediationAction[];
  targetDate: Date;
  owner: string;
  status: 'planned' | 'in_progress' | 'completed' | 'overdue';
}

export interface RemediationAction {
  description: string;
  assignedTo: string;
  dueDate: Date;
  status: 'pending' | 'in_progress' | 'completed';
  completedDate?: Date;
}

export interface CertificationStatus {
  certificationDate?: Date;
  certifiedBy?: string;
  status: 'certified' | 'not_certified' | 'in_progress';
  issues: string[];
  nextCertificationDue: Date;
}

// Unified Compliance Manager
export interface ComplianceManager {
  // Configuration
  configure(config: ComplianceConfig): Promise<void>;
  getConfiguration(): ComplianceConfig;
  
  // Services
  gdpr: GDPRService;
  hipaa: HIPAAService;
  sox: SOXService;
  
  // Common operations
  classifyData(data: Record<string, unknown>): Promise<DataClassification>;
  applyRetentionPolicy(policy: RetentionPolicy): Promise<void>;
  getComplianceStatus(): Promise<ComplianceStatus>;
  
  // Audit and reporting
  generateComplianceReport(regulations?: ('gdpr' | 'hipaa' | 'sox')[]): Promise<ComplianceReport>;
  exportAuditLog(filters?: AuditFilter): Promise<AuditEntry[]>;
}

export interface ComplianceStatus {
  gdpr?: {
    compliant: boolean;
    issues: string[];
    lastAudit?: Date;
  };
  hipaa?: {
    compliant: boolean;
    issues: string[];
    lastAudit?: Date;
  };
  sox?: {
    compliant: boolean;
    issues: string[];
    lastAudit?: Date;
  };
  overallCompliant: boolean;
}

export interface ComplianceReport {
  generatedAt: Date;
  period: ReportPeriod;
  regulations: {
    gdpr?: GDPRComplianceReport;
    hipaa?: HIPAAComplianceReport;
    sox?: SOXComplianceReport;
  };
  summary: {
    overallCompliance: boolean;
    criticalIssues: string[];
    recommendations: string[];
  };
}

export interface GDPRComplianceReport {
  dataSubjectRequests: {
    total: number;
    completed: number;
    averageResponseTime: number;
  };
  consents: {
    active: number;
    withdrawn: number;
    renewed: number;
  };
  dataBreaches: number;
  retentionCompliance: boolean;
}

export interface HIPAAComplianceReport {
  phiAccesses: {
    total: number;
    authorized: number;
    unauthorized: number;
  };
  securityIncidents: number;
  trainingCompliance: {
    compliantUsers: number;
    totalUsers: number;
    percentage: number;
  };
  encryptionStatus: {
    atRest: boolean;
    inTransit: boolean;
  };
}

// Factory function types
export type ComplianceServiceFactory = (config: ComplianceConfig) => Promise<ComplianceManager>;