# SYMindX Compliance System

The SYMindX Compliance System provides comprehensive regulatory compliance support for GDPR, HIPAA, and SOX regulations. This system integrates directly with the agent runtime to provide automated compliance management, data classification, and audit capabilities.

## Features

### 🔒 Multi-Regulation Support
- **GDPR**: EU data protection compliance including Right to Erasure, Data Portability, and Consent Management
- **HIPAA**: US healthcare data protection with PHI classification, encryption, and audit logging
- **SOX**: US financial controls with change management, segregation of duties, and audit trails

### 🎯 Core Capabilities
- **Automated Data Classification**: Intelligent detection of sensitive data types
- **Retention Management**: Automated data lifecycle management with configurable policies
- **Audit Logging**: Comprehensive audit trails for all compliance activities
- **Real-time Monitoring**: Continuous compliance status monitoring and alerting
- **Unified Management**: Single interface to manage all regulatory requirements

## Quick Start

### 1. Enable Compliance in Runtime Configuration

```json
{
  "compliance": {
    "enabled": true,
    "strictMode": false,
    "autoClassifyData": true,
    "enableRealTimeMonitoring": true,
    "gdpr": {
      "enabled": true,
      "legalBasis": "consent",
      "retentionPeriods": {
        "personal_data": 730,
        "consent_record": 2555
      }
    },
    "hipaa": {
      "enabled": true,
      "coveredEntity": true,
      "encryptionRequired": true,
      "sessionTimeout": 30,
      "auditLogRetention": 2190
    },
    "sox": {
      "enabled": true,
      "materialityThreshold": 100000,
      "controlFramework": "COSO",
      "requiredApprovals": 2,
      "changeWindowHours": {
        "start": 9,
        "end": 17
      }
    }
  }
}
```

### 2. Access Compliance Features

```typescript
import { SYMindXRuntime } from './core/runtime';

const runtime = new SYMindXRuntime(config);
await runtime.initialize();

// Get compliance integration
const compliance = runtime.getComplianceIntegration();

if (compliance?.isComplianceEnabled()) {
  // Classify data
  const classification = await compliance.classifyData(userData);
  
  // Handle GDPR requests
  await compliance.handleUserDataDeletion('user123');
  const exportData = await compliance.exportUserData('user123', 'json');
  
  // Check compliance status
  const status = await compliance.getComplianceStatus();
  
  // Generate compliance report
  const report = await compliance.generateComplianceReport(['gdpr', 'hipaa', 'sox']);
}
```

## Architecture

### Components

```
Compliance System
├── ComplianceManager (Unified Interface)
├── Services
│   ├── GDPRService (Data Rights & Privacy)
│   ├── HIPAAService (Healthcare Data Protection)
│   └── SOXService (Financial Controls)
├── Common Utilities
│   ├── DataClassifier (Intelligent Data Detection)
│   └── RetentionManager (Lifecycle Management)
└── Integration
    └── ComplianceIntegration (Runtime Integration)
```

### Data Flow

1. **Data Input** → Agent receives/processes data
2. **Classification** → Automatic sensitivity detection
3. **Rule Application** → Compliance rules applied based on classification
4. **Audit Logging** → All actions recorded for compliance
5. **Retention Management** → Lifecycle policies automatically applied

## Service Details

### GDPR Service

Handles EU General Data Protection Regulation compliance:

```typescript
// Right to Erasure (Right to be Forgotten)
await gdprService.deleteUserData('user123');
await gdprService.anonymizeUserData('user123');

// Data Portability
const exportData = await gdprService.exportUserData('user123', 'json');

// Consent Management
const consent = await gdprService.recordConsent('user123', purposes);
await gdprService.withdrawConsent('user123', ['marketing', 'analytics']);
const status = await gdprService.getConsentStatus('user123');

// Data Subject Requests
const response = await gdprService.handleDataSubjectRequest({
  id: 'req123',
  type: 'access',
  userId: 'user123',
  submittedAt: new Date(),
  status: 'pending'
});
```

### HIPAA Service

Handles US Health Insurance Portability and Accountability Act compliance:

```typescript
// PHI Classification and Protection
const classification = hipaaService.classifyData(healthData);
const encrypted = await hipaaService.encryptPHI(sensitiveData);
const decrypted = await hipaaService.decryptPHI(encrypted, authorization);

// Access Control
const auth = await hipaaService.authorizeAccess('user123', 'patient456', 'read');
const isValid = hipaaService.checkAuthorization(auth);

// Audit Logging
await hipaaService.logAccess({
  userId: 'user123',
  patientId: 'patient456',
  action: 'read',
  resource: 'medical_record',
  result: 'success'
});

// Breach Management
await hipaaService.reportBreach({
  id: 'breach123',
  discoveredAt: new Date(),
  affectedRecords: 150,
  dataTypes: ['name', 'ssn', 'medical_record'],
  cause: 'unauthorized_access'
});
```

### SOX Service

Handles US Sarbanes-Oxley Act compliance for financial controls:

```typescript
// Financial Data Controls
const tag = soxService.tagFinancialData(transactionData);
const validation = await soxService.validateFinancialTransaction(transaction);

// Change Management
const changeRequest = await soxService.requestChange({
  requestedBy: 'user123',
  type: 'configuration',
  description: 'Update payment processing rules',
  businessJustification: 'Improve fraud detection',
  risk: 'medium'
});

await soxService.approveChange('CR001', {
  approverId: 'manager456',
  role: 'manager',
  comments: 'Approved for Q4 implementation'
});

// Control Testing
const testResult = await soxService.testControl('AC-001');
const effectiveness = await soxService.getControlEffectiveness();
```

## Data Classification

The system automatically classifies data based on regulatory requirements:

### Classification Levels
- **Public**: No restrictions, freely shareable
- **Internal**: Company internal use only
- **Confidential**: Restricted access, contains personal/business sensitive data
- **Restricted**: Highest protection, contains regulated data (PHI, PII, Financial)

### Detection Patterns
- **Personal Data**: Names, emails, addresses, phone numbers, SSNs
- **Health Information**: Medical records, diagnoses, treatments, health plans
- **Financial Data**: Amounts, account numbers, transactions, financial terms
- **Technical Data**: IP addresses, API keys, system identifiers

### Handling Rules
Based on classification, automatic rules are applied:
- **Encryption**: Sensitive data encrypted at rest and in transit
- **Audit**: All access to classified data logged
- **Retention**: Automated lifecycle management based on regulatory requirements
- **Access Control**: Role-based restrictions on sensitive data

## Retention Management

Automated data lifecycle management with configurable policies:

### Default Retention Periods
- **GDPR Personal Data**: 2 years (730 days)
- **GDPR Consent Records**: 7 years (2555 days)
- **HIPAA PHI**: 6 years (2190 days)
- **HIPAA Audit Logs**: 6 years (2190 days)
- **SOX Financial Records**: 7 years (2555 days)
- **SOX Audit Trails**: 7 years (2555 days)

### Actions
- **Delete**: Permanent removal of data
- **Archive**: Move to long-term storage with restricted access
- **Anonymize**: Remove personally identifiable information

### Legal Holds
Data subject to legal proceedings or investigations can be placed on hold to prevent automated deletion.

## Audit and Reporting

### Audit Trails
Every compliance-related action is logged with:
- Timestamp and user identification
- Action type and resource affected
- IP address and user agent
- Success/failure status and error details

### Compliance Reports
Generate comprehensive reports for:
- **GDPR**: Data subject requests, consent status, breach incidents
- **HIPAA**: PHI access patterns, security training compliance, encryption status
- **SOX**: Control effectiveness, change management, audit findings

### Real-time Monitoring
Optional continuous monitoring provides:
- Compliance status dashboards
- Automated alerting for violations
- Performance metrics and trends
- Anomaly detection

## Configuration Options

### Global Settings
```typescript
interface ComplianceConfig {
  enabled: boolean;              // Master enable/disable
  strictMode?: boolean;          // Fail-fast on compliance violations
  autoClassifyData?: boolean;    // Automatic data classification
  enableRealTimeMonitoring?: boolean; // Continuous compliance monitoring
}
```

### Regulation-Specific Settings
Each regulation (GDPR, HIPAA, SOX) has its own configuration section with specific settings for retention periods, thresholds, and operational parameters.

## Integration Points

### Runtime Integration
- Automatic initialization with agent runtime
- Event-driven compliance checking
- Memory provider integration for audit storage

### Agent Integration
- Automatic data classification on message processing
- Compliance-aware memory storage
- Real-time violation detection

### Extension Integration
- API endpoints for compliance management
- Web UI for compliance dashboards
- Integration with external compliance tools

## Testing

Run the compliance test suite:

```bash
cd mind-agents
bun test src/security/compliance/__tests__/
```

The test suite covers:
- Data classification accuracy
- Service integration
- Compliance workflow validation
- Error handling and edge cases

## Troubleshooting

### Common Issues

1. **Memory Provider Not Available**
   - Ensure at least one memory provider (SQLite, PostgreSQL, Supabase, Neon) is configured
   - Check database connectivity and permissions

2. **Classification Not Working**
   - Verify `autoClassifyData` is enabled in configuration
   - Check data format and content patterns

3. **Strict Mode Failures**
   - Review compliance configuration for errors
   - Check memory provider initialization
   - Verify API keys and database connections

### Debug Logging
Enable debug logging to troubleshoot compliance issues:

```json
{
  "logLevel": "debug",
  "debug": {
    "enabled": true
  }
}
```

## Security Considerations

- All sensitive data is encrypted using AES-256 encryption
- API keys and secrets are loaded from environment variables
- Audit logs are immutable and tamper-evident
- Access controls prevent unauthorized compliance operations
- Regular security updates and vulnerability monitoring

## Compliance Standards

This implementation follows industry best practices and regulatory guidance:
- **GDPR**: Articles 13-22, 25, 32, 33-36 compliance
- **HIPAA**: Security and Privacy Rules (45 CFR Parts 160, 162, 164)
- **SOX**: Sections 302, 404, 906 internal controls and reporting

## Support

For compliance-related questions or issues:
1. Review this documentation and test examples
2. Check the troubleshooting section
3. Examine audit logs for detailed error information
4. Consider consulting with legal/compliance teams for regulatory interpretation

---

*This compliance system is designed to assist with regulatory compliance but does not constitute legal advice. Organizations should consult with qualified legal professionals for compliance strategy and interpretation.*