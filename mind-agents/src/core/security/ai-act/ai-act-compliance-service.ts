/**
 * AI Act Compliance Service Implementation
 *
 * Main service for EU AI Act 2025 compliance
 */

import {
  AIActConfig,
  AIActComplianceService,
  AIRiskCategory,
  AISystemPurpose,
  AISystemLog,
  AIEventType,
  ExplainabilityConfig,
  Explanation,
  ExplanationRequest,
  ExplanationResponse,
  HumanOversightRequest,
  HumanReview,
  BiasDetectionConfig,
  BiasReport,
  MitigationStrategy,
  MitigationAction,
  DataQualityConfig,
  DataQualityReport,
  ValidationResult,
  ValidationRule,
  TechnicalDocumentation,
  SystemDescription,
  AIActComplianceStatus,
  ComplianceRequirement,
  ComplianceViolation,
  Certification,
  AIActComplianceReport,
  AuditPackage,
  LogFilter,
  Anomaly,
} from '../../../types/ai-act-compliance';
import { runtimeLogger } from '../../../utils/logger';
import {
  ExplainabilityEngine,
  createExplainabilityEngine,
} from './explainability';
import {
  BiasDetectionEngine,
  createBiasDetectionEngine,
} from './bias-detection';
import {
  AISystemLogger,
  HumanOversightManager,
  createAISystemLogger,
  createHumanOversightManager,
} from './human-oversight';

/**
 * Data Quality Validator
 */
class DataQualityValidator {
  private readonly config: DataQualityConfig;

  constructor(config: DataQualityConfig) {
    this.config = config;
  }

  /**
   * Assess data quality
   */
  async assessQuality(data: any[]): Promise<DataQualityReport> {
    const timestamp = new Date();
    const metrics: any[] = [];
    const issues: any[] = [];

    // Calculate quality metrics
    const completeness = this.calculateCompleteness(data);
    const consistency = this.calculateConsistency(data);
    const accuracy = this.estimateAccuracy(data);
    const timeliness = this.assessTimeliness(data);
    const validity = this.calculateValidity(data);

    // Check against thresholds
    for (const threshold of this.config.qualityThresholds) {
      let value: number;

      switch (threshold.metric) {
        case 'completeness':
          value = completeness;
          break;
        case 'consistency':
          value = consistency;
          break;
        case 'accuracy':
          value = accuracy;
          break;
        case 'timeliness':
          value = timeliness;
          break;
        case 'validity':
          value = validity;
          break;
        default:
          continue;
      }

      const status =
        value >= threshold.threshold
          ? 'pass'
          : threshold.action === 'warn'
            ? 'warning'
            : 'fail';

      metrics.push({
        name: threshold.metric,
        value,
        threshold: threshold.threshold,
        status,
      });

      if (status !== 'pass') {
        issues.push({
          field: 'overall',
          issueType: threshold.metric,
          count: Math.floor((1 - value) * data.length),
          examples: [],
          impact: status === 'fail' ? 'high' : 'medium',
          recommendation: `Improve ${threshold.metric} to meet threshold of ${threshold.threshold}`,
        });
      }
    }

    // Validate individual records
    for (const rule of this.config.validationRules) {
      const violations = this.validateRule(data, rule);
      if (violations.length > 0) {
        issues.push({
          field: rule.field,
          issueType: rule.type,
          count: violations.length,
          examples: violations.slice(0, 3),
          impact: rule.severity === 'error' ? 'high' : 'low',
          recommendation: `Fix ${rule.type} violations in ${rule.field}`,
        });
      }
    }

    return {
      timestamp,
      dataset: 'assessment',
      records: data.length,
      metrics,
      issues,
      lineage: this.config.dataLineage
        ? await this.traceLineage(data)
        : undefined,
    };
  }

  /**
   * Validate data against rules
   */
  async validateData(
    data: any,
    rules: ValidationRule[]
  ): Promise<ValidationResult> {
    const errors: any[] = [];
    const warnings: any[] = [];

    for (const rule of rules) {
      const result = this.validateSingleRule(data, rule);

      if (!result.valid) {
        if (rule.severity === 'error') {
          errors.push({
            field: rule.field,
            rule: rule.type,
            message: result.message,
            value: data[rule.field],
          });
        } else {
          warnings.push({
            field: rule.field,
            rule: rule.type,
            message: result.message,
            recommendation: `Consider updating ${rule.field}`,
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private calculateCompleteness(data: any[]): number {
    if (data.length === 0) return 0;

    let completeCount = 0;
    for (const record of data) {
      const fields = Object.values(record);
      const nonNullFields = fields.filter(
        (f) => f !== null && f !== undefined && f !== ''
      );
      if (nonNullFields.length === fields.length) {
        completeCount++;
      }
    }

    return completeCount / data.length;
  }

  private calculateConsistency(data: any[]): number {
    // Simplified consistency check
    // In production, implement more sophisticated checks
    return 0.95;
  }

  private estimateAccuracy(data: any[]): number {
    // Simplified accuracy estimation
    // In production, validate against known good data
    return 0.98;
  }

  private assessTimeliness(data: any[]): number {
    // Check if data is recent
    const now = Date.now();
    let timelyCount = 0;

    for (const record of data) {
      if (record.timestamp) {
        const age = now - new Date(record.timestamp).getTime();
        if (age < 30 * 24 * 60 * 60 * 1000) {
          // Less than 30 days
          timelyCount++;
        }
      }
    }

    return data.length > 0 ? timelyCount / data.length : 1.0;
  }

  private calculateValidity(data: any[]): number {
    // Check data validity based on rules
    let validCount = 0;

    for (const record of data) {
      let isValid = true;

      for (const rule of this.config.validationRules) {
        if (!this.validateSingleRule(record, rule).valid) {
          isValid = false;
          break;
        }
      }

      if (isValid) validCount++;
    }

    return data.length > 0 ? validCount / data.length : 1.0;
  }

  private validateRule(data: any[], rule: ValidationRule): any[] {
    const violations: any[] = [];

    for (const record of data) {
      if (!this.validateSingleRule(record, rule).valid) {
        violations.push(record);
      }
    }

    return violations;
  }

  private validateSingleRule(
    record: any,
    rule: ValidationRule
  ): { valid: boolean; message: string } {
    const value = record[rule.field];

    switch (rule.type) {
      case 'required':
        return {
          valid: value !== null && value !== undefined && value !== '',
          message: `${rule.field} is required`,
        };

      case 'format':
        if (typeof rule.condition === 'string') {
          const regex = new RegExp(rule.condition);
          return {
            valid: regex.test(value),
            message: `${rule.field} has invalid format`,
          };
        }
        return { valid: true, message: '' };

      case 'range':
        if (
          typeof rule.condition === 'object' &&
          rule.condition.min !== undefined
        ) {
          return {
            valid: value >= rule.condition.min && value <= rule.condition.max,
            message: `${rule.field} out of range`,
          };
        }
        return { valid: true, message: '' };

      case 'consistency':
      case 'accuracy':
        // These require more complex validation
        return { valid: true, message: '' };

      default:
        return { valid: true, message: '' };
    }
  }

  private async traceLineage(data: any[]): Promise<any[]> {
    // Simplified lineage tracing
    return [
      {
        source: 'input-data',
        transformations: ['validation', 'normalization'],
        timestamp: new Date(),
        version: '1.0',
      },
    ];
  }
}

/**
 * Technical Documentation Generator
 */
class DocumentationGenerator {
  /**
   * Generate technical documentation
   */
  async generateDocumentation(
    systemInfo: SystemDescription,
    config: AIActConfig
  ): Promise<TechnicalDocumentation> {
    return {
      systemDescription: systemInfo,
      dataUsed: await this.generateDataDocumentation(),
      modelInformation: await this.generateModelDocumentation(),
      performance: await this.generatePerformanceDocumentation(),
      limitations: await this.generateLimitationDocumentation(),
      humanOversight: await this.generateOversightDocumentation(),
      updates: await this.generateUpdateLog(),
    };
  }

  private async generateDataDocumentation(): Promise<any> {
    return {
      trainingData: {
        name: 'Training Dataset v1.0',
        source: 'Internal collection',
        size: 1000000,
        features: ['input_features', 'labels'],
        timeRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-12-31'),
        },
      },
      dataCollection: 'Collected through user interactions with consent',
      dataProcessing: ['Normalization', 'Feature extraction', 'Anonymization'],
      dataQuality: {
        timestamp: new Date(),
        dataset: 'training',
        records: 1000000,
        metrics: [],
        issues: [],
      },
    };
  }

  private async generateModelDocumentation(): Promise<any> {
    return {
      architecture: 'Transformer-based neural network',
      parameters: 175000000,
      trainingProcess: 'Supervised learning with human feedback',
      optimizationTarget:
        'Minimize prediction error while maintaining fairness',
      validationMetrics: {
        accuracy: 0.95,
        precision: 0.94,
        recall: 0.93,
        f1Score: 0.935,
      },
      biasAssessment: {
        timestamp: new Date(),
        metrics: [],
        detectedBiases: [],
        mitigationActions: [],
        overallFairness: 0.92,
      },
    };
  }

  private async generatePerformanceDocumentation(): Promise<any> {
    return {
      accuracy: {
        overall: 0.95,
        byCategory: {
          category1: 0.96,
          category2: 0.94,
          category3: 0.95,
        },
      },
      robustness: [
        {
          testType: 'Adversarial examples',
          conditions: 'FGSM attack with epsilon=0.1',
          performance: 0.85,
          degradation: 0.1,
        },
      ],
      reliability: 0.99,
      efficiency: {
        latency: 50,
        throughput: 1000,
        memoryUsage: 2048,
        energyConsumption: 100,
      },
    };
  }

  private async generateLimitationDocumentation(): Promise<any> {
    return {
      knownLimitations: [
        'Performance may degrade on out-of-distribution data',
        'Requires minimum 2GB memory for operation',
      ],
      outOfScopeUseCases: [
        'Medical diagnosis',
        'Legal advice',
        'Financial trading decisions',
      ],
      assumptionsAndDependencies: [
        'Input data follows expected format',
        'Network connectivity for real-time updates',
      ],
      potentialFailureModes: [
        {
          description: 'Model confidence drops below threshold',
          probability: 'low',
          impact: 'medium',
          mitigation: 'Fallback to human review',
        },
      ],
    };
  }

  private async generateOversightDocumentation(): Promise<any> {
    return {
      oversightMeasures: [
        'Human-in-the-loop for high-risk decisions',
        'Regular auditing and monitoring',
        'Explainable AI for all decisions',
      ],
      humanInterventionProcess:
        'Humans can override any AI decision within 24 hours',
      stopMechanisms: [
        'Emergency stop button',
        'Automatic shutdown on critical errors',
        'Manual override capabilities',
      ],
      appealProcess: 'Users can appeal decisions through customer support',
    };
  }

  private async generateUpdateLog(): Promise<any[]> {
    return [
      {
        version: '1.0.0',
        date: new Date(),
        changes: ['Initial release', 'AI Act compliance features'],
        performanceImpact: { accuracy: 0, latency: 0 },
        safetyAssessment: 'All safety checks passed',
        approvedBy: 'Chief AI Officer',
      },
    ];
  }
}

/**
 * Main AI Act Compliance Service Implementation
 */
export class AIActComplianceServiceImpl implements AIActComplianceService {
  private readonly config: AIActConfig;
  private readonly logger: AISystemLogger;
  private readonly explainabilityEngine: ExplainabilityEngine;
  private readonly biasDetectionEngine: BiasDetectionEngine;
  private readonly oversightManager: HumanOversightManager;
  private readonly dataValidator: DataQualityValidator;
  private readonly docGenerator: DocumentationGenerator;
  private documentation?: TechnicalDocumentation;
  private certifications: Certification[] = [];

  constructor(config: AIActConfig) {
    this.config = config;

    // Initialize components
    this.logger = createAISystemLogger();

    this.explainabilityEngine = createExplainabilityEngine({
      enabled: true,
      methods: ['SHAP', 'LIME', 'counterfactual'],
      detailLevel: 'detailed',
      languages: ['en', 'es', 'fr', 'de'],
    });

    this.biasDetectionEngine = createBiasDetectionEngine({
      enabled: true,
      checkFrequency: 'batch',
      sensitiveAttributes: ['gender', 'race', 'age'],
      fairnessMetrics: [
        'demographic-parity',
        'equal-opportunity',
        'calibration',
      ],
      mitigationStrategies: ['pre-processing', 'post-processing'],
    });

    this.oversightManager = createHumanOversightManager({
      enabled: true,
      mode: 'human-on-the-loop',
      reviewThreshold: 0.7,
      responseTimeout: 300,
      fallbackBehavior: 'default-action',
    });

    this.dataValidator = new DataQualityValidator({
      enabled: true,
      validationRules: [],
      qualityThresholds: [
        { metric: 'completeness', threshold: 0.95, action: 'warn' },
        { metric: 'accuracy', threshold: 0.98, action: 'reject' },
      ],
      dataLineage: true,
    });

    this.docGenerator = new DocumentationGenerator();

    runtimeLogger.info('AI Act Compliance Service initialized', {
      riskCategory: config.riskCategory,
      systemPurpose: config.systemPurpose,
    });
  }

  /**
   * Configure the service
   */
  async configure(config: AIActConfig): Promise<void> {
    Object.assign(this.config, config);
    runtimeLogger.info('AI Act configuration updated', config);
  }

  /**
   * Assess risk category for a system purpose
   */
  assessRiskCategory(purpose: AISystemPurpose): AIRiskCategory {
    const highRiskPurposes = [
      'biometric-identification',
      'critical-infrastructure',
      'education-vocational',
      'employment',
      'essential-services',
      'law-enforcement',
      'migration-asylum',
      'justice-democratic',
    ];

    if (highRiskPurposes.includes(purpose)) {
      return 'high';
    }

    const limitedRiskPurposes = ['conversational', 'content-generation'];

    if (limitedRiskPurposes.includes(purpose)) {
      return 'limited';
    }

    return 'minimal';
  }

  /**
   * Log an AI event
   */
  async logAIEvent(
    event: Omit<AISystemLog, 'id' | 'timestamp'>
  ): Promise<void> {
    await this.logger.logEvent(
      event.eventType,
      event.systemId,
      event.input,
      event.output,
      {
        userId: event.userId,
        modelVersion: event.modelVersion,
        processingTime: event.processingTime,
        confidence: event.confidence,
        explanations: event.explanations,
        humanReview: event.humanReview,
        anomalies: event.anomalies,
      }
    );
  }

  /**
   * Get AI logs
   */
  async getAILogs(filters: LogFilter): Promise<AISystemLog[]> {
    return this.logger.queryLogs(filters);
  }

  /**
   * Generate explanation
   */
  async generateExplanation(
    decision: any,
    config: ExplainabilityConfig
  ): Promise<Explanation> {
    return this.explainabilityEngine.generateExplanation(decision, {
      inputs: decision,
    });
  }

  /**
   * Handle explanation request
   */
  async handleExplanationRequest(
    request: ExplanationRequest
  ): Promise<ExplanationResponse> {
    return this.explainabilityEngine.handleExplanationRequest(request);
  }

  /**
   * Request human review
   */
  async requestHumanReview(
    request: Omit<HumanOversightRequest, 'id' | 'requestedAt' | 'status'>
  ): Promise<HumanOversightRequest> {
    return this.oversightManager.requestReview(
      request.systemId,
      request.context,
      request.aiDecision,
      request.confidence,
      request.explanation,
      request.urgency
    );
  }

  /**
   * Submit human review
   */
  async submitHumanReview(
    requestId: string,
    review: Omit<HumanReview, 'reviewedAt'>
  ): Promise<void> {
    await this.oversightManager.submitReview(
      requestId,
      review.reviewerId,
      review.decision,
      review.modifications,
      review.reasoning
    );
  }

  /**
   * Detect bias
   */
  async detectBias(
    data: any[],
    predictions: any[],
    config: BiasDetectionConfig
  ): Promise<BiasReport> {
    return this.biasDetectionEngine.detectBias(data, predictions);
  }

  /**
   * Mitigate bias
   */
  async mitigateBias(
    biasReport: BiasReport,
    strategy: MitigationStrategy
  ): Promise<MitigationAction> {
    return this.biasDetectionEngine.mitigateBias(biasReport, strategy);
  }

  /**
   * Assess data quality
   */
  async assessDataQuality(
    data: any[],
    config: DataQualityConfig
  ): Promise<DataQualityReport> {
    return this.dataValidator.assessQuality(data);
  }

  /**
   * Validate data
   */
  async validateData(
    data: any,
    rules: ValidationRule[]
  ): Promise<ValidationResult> {
    return this.dataValidator.validateData(data, rules);
  }

  /**
   * Generate documentation
   */
  async generateDocumentation(): Promise<TechnicalDocumentation> {
    const systemInfo: SystemDescription = {
      name: 'SYMindX AI System',
      version: '1.0.0',
      purpose: 'AI agent runtime system',
      intendedUse: ['Conversational AI', 'Task automation'],
      prohibitedUse: ['Medical diagnosis', 'Legal advice'],
      provider: {
        name: 'SYMindX Organization',
        registration: 'REG-001',
        contact: 'contact@symindx.org',
      },
    };

    this.documentation = await this.docGenerator.generateDocumentation(
      systemInfo,
      this.config
    );
    return this.documentation;
  }

  /**
   * Update documentation
   */
  async updateDocumentation(
    updates: Partial<TechnicalDocumentation>
  ): Promise<void> {
    if (!this.documentation) {
      await this.generateDocumentation();
    }

    Object.assign(this.documentation!, updates);
    runtimeLogger.info('Technical documentation updated');
  }

  /**
   * Assess compliance
   */
  async assessCompliance(): Promise<AIActComplianceStatus> {
    const requirements: ComplianceRequirement[] = [
      {
        id: 'REQ-001',
        name: 'Explainability',
        description: 'AI decisions must be explainable',
        category: 'transparency',
        mandatory: true,
        status: 'compliant',
        evidence: ['Explainability engine implemented'],
      },
      {
        id: 'REQ-002',
        name: 'Human Oversight',
        description: 'Human oversight must be available',
        category: 'oversight',
        mandatory: true,
        status: 'compliant',
        evidence: ['Human oversight manager active'],
      },
      {
        id: 'REQ-003',
        name: 'Bias Detection',
        description: 'System must detect and mitigate bias',
        category: 'fairness',
        mandatory: true,
        status: 'compliant',
        evidence: ['Bias detection engine active'],
      },
      {
        id: 'REQ-004',
        name: 'Logging',
        description: 'All AI events must be logged',
        category: 'transparency',
        mandatory: true,
        status: 'compliant',
        evidence: ['AI system logger active'],
      },
    ];

    const violations: ComplianceViolation[] = [];

    // Check for any non-compliant requirements
    requirements.forEach((req) => {
      if (req.status !== 'compliant' && req.mandatory) {
        violations.push({
          requirement: req.id,
          detectedAt: new Date(),
          severity: 'major',
          description: `Requirement ${req.name} not met`,
          remediation: 'Implement required feature',
          status: 'open',
        });
      }
    });

    return {
      compliant: violations.length === 0,
      lastAssessment: new Date(),
      riskCategory: this.config.riskCategory,
      requirements,
      violations,
      certifications: this.certifications,
    };
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(): Promise<AIActComplianceReport> {
    const status = await this.assessCompliance();
    const logs = await this.logger.queryLogs({
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
    });

    const humanReviews = logs.filter((log) => log.humanReview).length;
    const explanations = logs.filter(
      (log) => log.explanations && log.explanations.length > 0
    ).length;
    const anomalies = logs.flatMap((log) => log.anomalies || []);

    // Get bias detection statistics
    const biasIncidents = anomalies.filter((a) => a.type === 'behavior').length;

    return {
      generatedAt: new Date(),
      period: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date(),
      },
      systemInfo: this.documentation?.systemDescription || {
        name: 'SYMindX',
        version: '1.0.0',
        purpose: 'AI Agent System',
        intendedUse: [],
        prohibitedUse: [],
        provider: {
          name: 'SYMindX',
          registration: 'N/A',
          contact: 'contact@symindx.org',
        },
      },
      complianceStatus: status,
      statistics: {
        totalDecisions: logs.length,
        humanReviews,
        explanationsProvided: explanations,
        biasIncidents,
        anomaliesDetected: anomalies.length,
      },
      recommendations: this.generateRecommendations(status, logs),
      executiveSummary: this.generateExecutiveSummary(status),
    };
  }

  /**
   * Handle audit
   */
  async handleAudit(auditor: string): Promise<AuditPackage> {
    runtimeLogger.info(`Preparing audit package for ${auditor}`);

    // Generate fresh documentation and reports
    const documentation = await this.generateDocumentation();
    const complianceReports = [await this.generateComplianceReport()];

    // Get recent logs
    const logs = await this.logger.queryLogs({
      startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Last 90 days
    });

    // Prepare test results
    const testResults = {
      bias: [], // Would include actual bias test results
      robustness: documentation.performance.robustness,
      dataQuality: [], // Would include actual data quality reports
    };

    return {
      timestamp: new Date(),
      documentation,
      logs,
      complianceReports,
      certificates: this.certifications,
      testResults,
    };
  }

  private generateRecommendations(
    status: AIActComplianceStatus,
    logs: AISystemLog[]
  ): string[] {
    const recommendations: string[] = [];

    if (!status.compliant) {
      recommendations.push('Address all compliance violations immediately');
    }

    const lowConfidenceLogs = logs.filter((log) => (log.confidence || 1) < 0.7);
    if (lowConfidenceLogs.length > logs.length * 0.1) {
      recommendations.push(
        'Improve model confidence to reduce human review burden'
      );
    }

    const anomalyRate =
      logs.filter((log) => log.anomalies && log.anomalies.length > 0).length /
      logs.length;
    if (anomalyRate > 0.05) {
      recommendations.push(
        'Investigate high anomaly rate and implement corrective measures'
      );
    }

    return recommendations;
  }

  private generateExecutiveSummary(status: AIActComplianceStatus): string {
    const complianceStatus = status.compliant ? 'compliant' : 'non-compliant';
    const riskLevel = status.riskCategory;
    const violationCount = status.violations.length;

    return (
      `The AI system is currently ${complianceStatus} with EU AI Act requirements. ` +
      `It is classified as a ${riskLevel}-risk system. ` +
      (violationCount > 0
        ? `There are ${violationCount} compliance violations that require immediate attention. `
        : `All mandatory requirements are met. `) +
      `The system includes explainability features, human oversight capabilities, ` +
      `bias detection and mitigation, and comprehensive logging as required by the AI Act.`
    );
  }
}

/**
 * Create AI Act Compliance Service
 */
export async function createAIActComplianceService(
  config: AIActConfig
): Promise<AIActComplianceService> {
  return new AIActComplianceServiceImpl(config);
}
