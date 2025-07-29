/**
 * Data Classification Utility
 * 
 * Provides comprehensive data classification capabilities for compliance
 * across GDPR, HIPAA, and SOX regulations
 */

import {
  DataClassification,
  DataHandlingRule,
  DataAction,
  DataRestriction,
  PHIClassification,
  FinancialDataTag,
} from '../../../types/compliance.js';
import { runtimeLogger } from '../../../utils/logger.js';

export class DataClassifier {
  private classificationRules: Map<string, DataHandlingRule> = new Map();
  
  // Classification patterns
  private readonly sensitivePatterns = {
    // Personal Data (GDPR)
    personalNames: /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g,
    emails: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    phones: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
    addresses: /\d+\s+[\w\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd|Court|Ct|Place|Pl)/gi,
    socialSecurityNumbers: /\b\d{3}-\d{2}-\d{4}\b/g,
    creditCards: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
    
    // Health Information (HIPAA)
    medicalRecords: /\b(MR|MRN|Medical Record)[:\s]*\d+\b/gi,
    healthPlans: /\b(Insurance|Policy)[:\s]*\d+\b/gi,
    medicalTerms: /\b(diagnosis|treatment|medication|patient|health|medical|clinical|hospital|physician|doctor|nurse)\b/gi,
    dates: /\b\d{1,2}\/\d{1,2}\/\d{4}\b/g,
    biometricIds: /\b(fingerprint|retinal|DNA|biometric)[:\s]*[\w\d]+\b/gi,
    
    // Financial Data (SOX)
    financialAmounts: /\$[\d,]+\.?\d*/g,
    accountNumbers: /\b\d{4,12}\b/g,
    financialTerms: /\b(revenue|expense|asset|liability|equity|profit|loss|balance|transaction|journal|ledger|account|financial|money|payment|invoice|receipt)\b/gi,
    bankRouting: /\b\d{9}\b/g,
    
    // Technical Identifiers
    ipAddresses: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
    urls: /https?:\/\/[^\s]+/g,
    apiKeys: /\b[A-Za-z0-9_-]{20,}\b/g,
    
    // Government IDs
    passportNumbers: /\b[A-Z]{1,2}\d{6,9}\b/g,
    driverLicenses: /\b[A-Z0-9]{8,15}\b/g,
  };

  constructor() {
    this.initializeDefaultRules();
  }

  private initializeDefaultRules(): void {
    // GDPR Personal Data Rules
    this.addClassificationRule({
      id: 'gdpr_personal_data',
      name: 'GDPR Personal Data',
      description: 'Data that can identify a natural person',
      actions: [
        { type: 'encrypt', parameters: { algorithm: 'AES-256' } },
        { type: 'audit', parameters: { required: true } },
        { type: 'notify', parameters: { onAccess: true } },
      ],
      restrictions: [
        { type: 'access', condition: 'hasConsent', allowedValues: ['yes'] },
        { type: 'storage', condition: 'retentionPeriod', allowedValues: ['<=2years'] },
        { type: 'transfer', condition: 'adequacyDecision', allowedValues: ['approved'] },
      ],
    });

    // HIPAA PHI Rules
    this.addClassificationRule({
      id: 'hipaa_phi',
      name: 'HIPAA Protected Health Information',
      description: 'Health information that can identify an individual',
      actions: [
        { type: 'encrypt', parameters: { algorithm: 'AES-256', keyRotation: 'monthly' } },
        { type: 'audit', parameters: { required: true, realTime: true } },
        { type: 'redact', parameters: { inLogs: true } },
      ],
      restrictions: [
        { type: 'access', condition: 'authorizedUser', allowedValues: ['healthcare', 'administrative'] },
        { type: 'storage', condition: 'location', allowedValues: ['secure', 'encrypted'] },
        { type: 'processing', condition: 'minimumNecessary', allowedValues: ['yes'] },
      ],
    });

    // SOX Financial Data Rules
    this.addClassificationRule({
      id: 'sox_financial',
      name: 'SOX Financial Data',
      description: 'Financial data subject to SOX controls',
      actions: [
        { type: 'encrypt', parameters: { algorithm: 'AES-256' } },
        { type: 'audit', parameters: { required: true, immutable: true } },
      ],
      restrictions: [
        { type: 'access', condition: 'segregationOfDuties', allowedValues: ['enforced'] },
        { type: 'processing', condition: 'approvalRequired', allowedValues: ['yes'] },
        { type: 'storage', condition: 'retention', allowedValues: ['7years'] },
      ],
    });

    // Public Data Rules
    this.addClassificationRule({
      id: 'public_data',
      name: 'Public Data',
      description: 'Data intended for public consumption',
      actions: [],
      restrictions: [],
    });
  }

  /**
   * Classify data comprehensively across all regulations
   */
  classifyData(data: any): DataClassification {
    const content = this.normalizeData(data);
    const detectedPatterns = this.detectPatterns(content);
    const classification = this.determineClassification(detectedPatterns);
    const handlingRules = this.getApplicableRules(classification);

    runtimeLogger.debug('Data classified', {
      level: classification.level,
      tags: classification.tags,
      rulesCount: handlingRules.length,
    });

    return {
      level: classification.level,
      tags: classification.tags,
      handlingRules,
    };
  }

  /**
   * Classify for GDPR specifically
   */
  classifyForGDPR(data: any): { isPersonalData: boolean; dataTypes: string[]; lawfulBasis: string } {
    const content = this.normalizeData(data);
    const detectedTypes: string[] = [];
    
    // Check for personal data patterns
    if (this.sensitivePatterns.personalNames.test(content)) detectedTypes.push('name');
    if (this.sensitivePatterns.emails.test(content)) detectedTypes.push('email');
    if (this.sensitivePatterns.phones.test(content)) detectedTypes.push('phone');
    if (this.sensitivePatterns.addresses.test(content)) detectedTypes.push('address');
    if (this.sensitivePatterns.socialSecurityNumbers.test(content)) detectedTypes.push('national_id');
    if (this.sensitivePatterns.ipAddresses.test(content)) detectedTypes.push('online_identifier');

    const isPersonalData = detectedTypes.length > 0;
    
    // Determine lawful basis
    let lawfulBasis = 'legitimate_interests';
    if (detectedTypes.includes('national_id') || detectedTypes.includes('health')) {
      lawfulBasis = 'explicit_consent';
    } else if (isPersonalData) {
      lawfulBasis = 'consent';
    }

    return {
      isPersonalData,
      dataTypes: detectedTypes,
      lawfulBasis,
    };
  }

  /**
   * Classify for HIPAA specifically
   */
  classifyForHIPAA(data: any): PHIClassification {
    const content = this.normalizeData(data);
    let sensitivityLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let dataType: string = 'other';
    
    // Check for PHI patterns
    if (this.sensitivePatterns.medicalRecords.test(content)) {
      dataType = 'medical_record';
      sensitivityLevel = 'critical';
    } else if (this.sensitivePatterns.healthPlans.test(content)) {
      dataType = 'health_plan';
      sensitivityLevel = 'high';
    } else if (this.sensitivePatterns.medicalTerms.test(content)) {
      dataType = 'other';
      sensitivityLevel = 'medium';
    } else if (this.sensitivePatterns.personalNames.test(content) && 
               this.sensitivePatterns.dates.test(content)) {
      dataType = 'name';
      sensitivityLevel = 'high';
    } else if (this.sensitivePatterns.biometricIds.test(content)) {
      dataType = 'biometric';
      sensitivityLevel = 'critical';
    }

    const isPHI = sensitivityLevel !== 'low';

    return {
      isPHI,
      dataType: dataType as any,
      sensitivityLevel,
    };
  }

  /**
   * Classify for SOX specifically
   */
  classifyForSOX(data: any): FinancialDataTag {
    const content = this.normalizeData(data);
    let dataType: string = 'transaction';
    let materialityLevel: 'immaterial' | 'material' | 'highly_material' = 'immaterial';
    let maxAmount = 0;
    
    // Check for financial patterns
    if (this.sensitivePatterns.financialAmounts.test(content)) {
      const amounts = content.match(this.sensitivePatterns.financialAmounts);
      if (amounts) {
        amounts.forEach(amount => {
          const value = parseFloat(amount.replace(/[$,]/g, ''));
          if (value > maxAmount) {
            maxAmount = value;
          }
        });
      }
    }

    // Determine data type
    if (/\b(revenue|sales|income)\b/gi.test(content)) {
      dataType = 'revenue';
    } else if (/\b(expense|cost|expenditure)\b/gi.test(content)) {
      dataType = 'expense';
    } else if (/\b(asset|property|equipment)\b/gi.test(content)) {
      dataType = 'asset';
    } else if (/\b(liability|debt|obligation)\b/gi.test(content)) {
      dataType = 'liability';
    } else if (/\b(equity|capital|shares)\b/gi.test(content)) {
      dataType = 'equity';
    } else if (/\b(journal|entry|debit|credit)\b/gi.test(content)) {
      dataType = 'journal_entry';
    }

    // Determine materiality (using typical thresholds - should be configurable)
    const materialityThreshold = 100000; // $100K
    if (maxAmount >= materialityThreshold * 5) {
      materialityLevel = 'highly_material';
    } else if (maxAmount >= materialityThreshold) {
      materialityLevel = 'material';
    }

    const isFinancial = this.sensitivePatterns.financialTerms.test(content) || 
                       this.sensitivePatterns.financialAmounts.test(content);

    return {
      isFinancial,
      dataType: dataType as any,
      materialityLevel,
      requiresApproval: materialityLevel !== 'immaterial',
      approvalThreshold: maxAmount,
    };
  }

  /**
   * Add custom classification rule
   */
  addClassificationRule(rule: DataHandlingRule): void {
    this.classificationRules.set(rule.id, rule);
    runtimeLogger.debug('Classification rule added', { ruleId: rule.id, name: rule.name });
  }

  /**
   * Remove classification rule
   */
  removeClassificationRule(ruleId: string): void {
    this.classificationRules.delete(ruleId);
    runtimeLogger.debug('Classification rule removed', { ruleId });
  }

  /**
   * Get all classification rules
   */
  getClassificationRules(): DataHandlingRule[] {
    return Array.from(this.classificationRules.values());
  }

  /**
   * Anonymize data based on classification
   */
  anonymizeData(data: any, classification: DataClassification): any {
    let content = this.normalizeData(data);
    
    // Apply anonymization based on classification level
    if (classification.level === 'restricted' || classification.level === 'confidential') {
      // Replace sensitive patterns with anonymized versions
      content = content
        .replace(this.sensitivePatterns.personalNames, '[NAME]')
        .replace(this.sensitivePatterns.emails, '[EMAIL]')
        .replace(this.sensitivePatterns.phones, '[PHONE]')
        .replace(this.sensitivePatterns.addresses, '[ADDRESS]')
        .replace(this.sensitivePatterns.socialSecurityNumbers, '[SSN]')
        .replace(this.sensitivePatterns.creditCards, '[CREDIT_CARD]')
        .replace(this.sensitivePatterns.medicalRecords, '[MEDICAL_RECORD]')
        .replace(this.sensitivePatterns.healthPlans, '[HEALTH_PLAN]')
        .replace(this.sensitivePatterns.financialAmounts, '[AMOUNT]')
        .replace(this.sensitivePatterns.accountNumbers, '[ACCOUNT]')
        .replace(this.sensitivePatterns.ipAddresses, '[IP_ADDRESS]')
        .replace(this.sensitivePatterns.apiKeys, '[API_KEY]');
    }

    try {
      return typeof data === 'string' ? content : JSON.parse(content);
    } catch {
      return content;
    }
  }

  /**
   * Pseudonymize data (reversible anonymization)
   */
  pseudonymizeData(data: any, key: string): any {
    const content = this.normalizeData(data);
    const classification = this.classifyData(data);
    
    if (classification.level === 'public') {
      return data; // No need to pseudonymize public data
    }

    // Simple pseudonymization - in production, use proper crypto
    const hash = require('crypto').createHash('sha256').update(content + key).digest('hex');
    const pseudonym = hash.substring(0, 16);

    return {
      pseudonym,
      originalLength: content.length,
      classification: classification.level,
      timestamp: new Date().toISOString(),
    };
  }

  // Private helper methods

  private normalizeData(data: any): string {
    if (typeof data === 'string') {
      return data;
    } else if (typeof data === 'object' && data !== null) {
      return JSON.stringify(data);
    } else {
      return String(data);
    }
  }

  private detectPatterns(content: string): Map<string, number> {
    const detectedPatterns = new Map<string, number>();
    
    for (const [patternName, pattern] of Object.entries(this.sensitivePatterns)) {
      const matches = content.match(pattern);
      if (matches) {
        detectedPatterns.set(patternName, matches.length);
      }
    }

    return detectedPatterns;
  }

  private determineClassification(patterns: Map<string, number>): { level: string; tags: string[] } {
    const tags: string[] = [];
    let level: 'public' | 'internal' | 'confidential' | 'restricted' = 'public';

    // Analyze detected patterns
    for (const [patternName, count] of patterns) {
      tags.push(`${patternName}:${count}`);
      
      // Determine classification level based on sensitivity
      if (['socialSecurityNumbers', 'medicalRecords', 'biometricIds', 'creditCards'].includes(patternName)) {
        level = 'restricted';
      } else if (['personalNames', 'emails', 'addresses', 'healthPlans', 'financialAmounts'].includes(patternName)) {
        if (level !== 'restricted') {
          level = 'confidential';
        }
      } else if (['phones', 'dates', 'accountNumbers', 'medicalTerms', 'financialTerms'].includes(patternName)) {
        if (level === 'public') {
          level = 'internal';
        }
      }
    }

    // Add regulatory tags
    if (patterns.has('personalNames') || patterns.has('emails')) {
      tags.push('gdpr:personal_data');
    }
    
    if (patterns.has('medicalRecords') || patterns.has('healthPlans') || patterns.has('medicalTerms')) {
      tags.push('hipaa:phi');
    }
    
    if (patterns.has('financialAmounts') || patterns.has('financialTerms')) {
      tags.push('sox:financial_data');
    }

    return { level, tags };
  }

  private getApplicableRules(classification: { level: string; tags: string[] }): DataHandlingRule[] {
    const applicableRules: DataHandlingRule[] = [];
    
    // Add rules based on classification level and tags
    if (classification.tags.some(tag => tag.startsWith('gdpr:'))) {
      const gdprRule = this.classificationRules.get('gdpr_personal_data');
      if (gdprRule) applicableRules.push(gdprRule);
    }
    
    if (classification.tags.some(tag => tag.startsWith('hipaa:'))) {
      const hipaaRule = this.classificationRules.get('hipaa_phi');
      if (hipaaRule) applicableRules.push(hipaaRule);
    }
    
    if (classification.tags.some(tag => tag.startsWith('sox:'))) {
      const soxRule = this.classificationRules.get('sox_financial');
      if (soxRule) applicableRules.push(soxRule);
    }
    
    if (classification.level === 'public') {
      const publicRule = this.classificationRules.get('public_data');
      if (publicRule) applicableRules.push(publicRule);
    }

    return applicableRules;
  }
}

/**
 * Factory function to create data classifier
 */
export function createDataClassifier(): DataClassifier {
  return new DataClassifier();
}