/**
 * Safety Framework Factory
 *
 * Factory function for creating and configuring the AGI Safety Framework
 * with sensible defaults and environment-specific configurations.
 */

import { SafetyFrameworkManager } from './safety-framework-manager';
import {
  SafetyFrameworkConfig,
  AlignmentVerificationConfig,
  InterpretabilityConfig,
  ConstitutionalTrainingConfig,
  SafetyMonitoringConfig,
  ResponsibleScalingConfig,
  ExplainabilityLevel,
  ConstraintEnforcementLevel,
  EvaluationFrequency,
  MonitoringFrequency,
  ShutdownUrgency,
  ComparisonOperator,
  RiskLevel,
} from './types';

/**
 * Create a safety framework with default configuration
 */
export function createSafetyFramework(
  overrides: Partial<SafetyFrameworkConfig> = {}
): SafetyFrameworkManager {
  const defaultConfig = createDefaultSafetyConfig();
  const config = mergeConfigurations(defaultConfig, overrides);

  return new SafetyFrameworkManager(config);
}

/**
 * Create a safety framework optimized for development environments
 */
export function createDevelopmentSafetyFramework(
  overrides: Partial<SafetyFrameworkConfig> = {}
): SafetyFrameworkManager {
  const developmentConfig = createDevelopmentSafetyConfig();
  const config = mergeConfigurations(developmentConfig, overrides);

  return new SafetyFrameworkManager(config);
}

/**
 * Create a safety framework optimized for production environments
 */
export function createProductionSafetyFramework(
  overrides: Partial<SafetyFrameworkConfig> = {}
): SafetyFrameworkManager {
  const productionConfig = createProductionSafetyConfig();
  const config = mergeConfigurations(productionConfig, overrides);

  return new SafetyFrameworkManager(config);
}

/**
 * Create a safety framework optimized for research environments
 */
export function createResearchSafetyFramework(
  overrides: Partial<SafetyFrameworkConfig> = {}
): SafetyFrameworkManager {
  const researchConfig = createResearchSafetyConfig();
  const config = mergeConfigurations(researchConfig, overrides);

  return new SafetyFrameworkManager(config);
}

/**
 * Create a safety framework with high security settings
 */
export function createHighSecuritySafetyFramework(
  overrides: Partial<SafetyFrameworkConfig> = {}
): SafetyFrameworkManager {
  const highSecurityConfig = createHighSecuritySafetyConfig();
  const config = mergeConfigurations(highSecurityConfig, overrides);

  return new SafetyFrameworkManager(config);
}

// Configuration creators

function createDefaultSafetyConfig(): SafetyFrameworkConfig {
  return {
    enabled: true,
    strictMode: false,
    riskTolerance: 0.3,
    emergencyShutdownEnabled: true,
    monitoringInterval: 60000, // 1 minute
    safetyReportingEnabled: true,

    alignment: createDefaultAlignmentConfig(),
    interpretability: createDefaultInterpretabilityConfig(),
    constitutional: createDefaultConstitutionalConfig(),
    monitoring: createDefaultMonitoringConfig(),
    scaling: createDefaultScalingConfig(),
  };
}

function createDevelopmentSafetyConfig(): SafetyFrameworkConfig {
  return {
    enabled: true,
    strictMode: false,
    riskTolerance: 0.5, // More tolerant for development
    emergencyShutdownEnabled: false, // Don't interrupt development
    monitoringInterval: 300000, // 5 minutes
    safetyReportingEnabled: true,

    alignment: {
      enabled: true,
      checkInterval: 300000, // 5 minutes
      alignmentThreshold: 0.6, // Lower threshold for development
      goalAlignmentWeight: 0.4,
      valueAlignmentWeight: 0.3,
      behaviorAlignmentWeight: 0.3,
      mesaOptimizationDetection: false, // Disable for development
    },

    interpretability: {
      enabled: true,
      explainabilityLevel: ExplainabilityLevel.BASIC,
      attentionVisualization: true,
      causalAnalysis: false,
      behaviorPrediction: false,
      explanationDepth: 3,
    },

    constitutional: {
      enabled: true,
      constitutionVersion: '1.0-dev',
      harmlessnessWeight: 0.3,
      helpfulnessWeight: 0.4,
      honestyWeight: 0.3,
      valueHierarchy: [],
      constraintEnforcement: ConstraintEnforcementLevel.WARNING,
    },

    monitoring: {
      enabled: true,
      monitoringInterval: 300000,
      capabilityOverhangDetection: false,
      emergentBehaviorMonitoring: true,
      deceptionDetection: false,
      shutdownProcedures: {
        enabled: false,
        automaticShutdownThreshold: 0.9,
        humanApprovalRequired: true,
        gracefulShutdownTime: 30000,
        emergencyShutdownTime: 5000,
        shutdownTriggers: [],
      },
    },

    scaling: {
      enabled: false, // Disable for development
      capabilityStages: [],
      evaluationProtocols: [],
      releaseGates: [],
      monitoringRequirements: [],
    },
  };
}

function createProductionSafetyConfig(): SafetyFrameworkConfig {
  return {
    enabled: true,
    strictMode: true, // Strict mode for production
    riskTolerance: 0.1, // Low risk tolerance
    emergencyShutdownEnabled: true,
    monitoringInterval: 30000, // 30 seconds
    safetyReportingEnabled: true,

    alignment: {
      enabled: true,
      checkInterval: 60000, // 1 minute
      alignmentThreshold: 0.8, // High threshold for production
      goalAlignmentWeight: 0.4,
      valueAlignmentWeight: 0.4,
      behaviorAlignmentWeight: 0.2,
      mesaOptimizationDetection: true,
    },

    interpretability: {
      enabled: true,
      explainabilityLevel: ExplainabilityLevel.COMPREHENSIVE,
      attentionVisualization: true,
      causalAnalysis: true,
      behaviorPrediction: true,
      explanationDepth: 7,
    },

    constitutional: {
      enabled: true,
      constitutionVersion: '1.0-prod',
      harmlessnessWeight: 0.5,
      helpfulnessWeight: 0.3,
      honestyWeight: 0.2,
      valueHierarchy: [],
      constraintEnforcement: ConstraintEnforcementLevel.BLOCKING,
    },

    monitoring: {
      enabled: true,
      monitoringInterval: 30000,
      capabilityOverhangDetection: true,
      emergentBehaviorMonitoring: true,
      deceptionDetection: true,
      shutdownProcedures: {
        enabled: true,
        automaticShutdownThreshold: 0.7,
        humanApprovalRequired: true,
        gracefulShutdownTime: 60000, // 1 minute
        emergencyShutdownTime: 10000, // 10 seconds
        shutdownTriggers: [
          {
            id: 'critical_alignment_failure',
            type: 'alignment_failure' as any,
            condition: {
              metric: 'alignment_score',
              threshold: 0.3,
              operator: ComparisonOperator.LESS_THAN,
              timeWindow: 300000, // 5 minutes
            },
            urgency: ShutdownUrgency.CRITICAL,
            automatedResponse: true,
            humanApprovalRequired: false,
          },
          {
            id: 'capability_overhang_critical',
            type: 'capability_overhang' as any,
            condition: {
              metric: 'overhang_risk',
              threshold: 0.8,
              operator: ComparisonOperator.GREATER_THAN,
              timeWindow: 60000, // 1 minute
            },
            urgency: ShutdownUrgency.IMMEDIATE,
            automatedResponse: true,
            humanApprovalRequired: false,
          },
        ],
      },
    },

    scaling: {
      enabled: true,
      capabilityStages: [
        {
          id: 'basic',
          name: 'Basic Operations',
          description: 'Basic agent operations with minimal risk',
          requiredSafetyLevel: 0.8,
          capabilities: [],
          prerequisites: [],
          safetyRequirements: [],
        },
        {
          id: 'intermediate',
          name: 'Intermediate Operations',
          description: 'More complex operations with moderate risk',
          requiredSafetyLevel: 0.9,
          capabilities: [],
          prerequisites: ['basic'],
          safetyRequirements: [],
        },
        {
          id: 'advanced',
          name: 'Advanced Operations',
          description: 'Advanced operations requiring high safety assurance',
          requiredSafetyLevel: 0.95,
          capabilities: [],
          prerequisites: ['intermediate'],
          safetyRequirements: [],
        },
      ],
      evaluationProtocols: [
        {
          id: 'safety_assessment',
          type: 'safety_assessment' as any,
          description: 'Comprehensive safety assessment',
          requiredScore: 0.8,
          evaluationCriteria: [],
          frequency: EvaluationFrequency.DAILY,
        },
      ],
      releaseGates: [],
      monitoringRequirements: [
        {
          metric: 'alignment_score',
          threshold: 0.7,
          frequency: MonitoringFrequency.EVERY_MINUTE,
          alertConditions: [
            {
              condition: 'alignment_score < 0.6',
              severity: 'critical' as any,
              escalation: true,
            },
          ],
        },
      ],
    },
  };
}

function createResearchSafetyConfig(): SafetyFrameworkConfig {
  return {
    enabled: true,
    strictMode: false,
    riskTolerance: 0.4, // Moderate risk tolerance for research
    emergencyShutdownEnabled: true,
    monitoringInterval: 120000, // 2 minutes
    safetyReportingEnabled: true,

    alignment: {
      enabled: true,
      checkInterval: 180000, // 3 minutes
      alignmentThreshold: 0.7,
      goalAlignmentWeight: 0.5,
      valueAlignmentWeight: 0.3,
      behaviorAlignmentWeight: 0.2,
      mesaOptimizationDetection: true, // Important for research
    },

    interpretability: {
      enabled: true,
      explainabilityLevel: ExplainabilityLevel.EXPERT, // Maximum for research
      attentionVisualization: true,
      causalAnalysis: true,
      behaviorPrediction: true,
      explanationDepth: 10, // Deep explanations
    },

    constitutional: {
      enabled: true,
      constitutionVersion: '1.0-research',
      harmlessnessWeight: 0.4,
      helpfulnessWeight: 0.3,
      honestyWeight: 0.3,
      valueHierarchy: [],
      constraintEnforcement: ConstraintEnforcementLevel.WARNING,
    },

    monitoring: {
      enabled: true,
      monitoringInterval: 120000,
      capabilityOverhangDetection: true,
      emergentBehaviorMonitoring: true, // Critical for research
      deceptionDetection: true,
      shutdownProcedures: {
        enabled: true,
        automaticShutdownThreshold: 0.8,
        humanApprovalRequired: true,
        gracefulShutdownTime: 120000, // 2 minutes
        emergencyShutdownTime: 15000, // 15 seconds
        shutdownTriggers: [],
      },
    },

    scaling: {
      enabled: true,
      capabilityStages: [],
      evaluationProtocols: [],
      releaseGates: [],
      monitoringRequirements: [],
    },
  };
}

function createHighSecuritySafetyConfig(): SafetyFrameworkConfig {
  return {
    enabled: true,
    strictMode: true,
    riskTolerance: 0.05, // Very low risk tolerance
    emergencyShutdownEnabled: true,
    monitoringInterval: 10000, // 10 seconds
    safetyReportingEnabled: true,

    alignment: {
      enabled: true,
      checkInterval: 30000, // 30 seconds
      alignmentThreshold: 0.95, // Very high threshold
      goalAlignmentWeight: 0.4,
      valueAlignmentWeight: 0.4,
      behaviorAlignmentWeight: 0.2,
      mesaOptimizationDetection: true,
    },

    interpretability: {
      enabled: true,
      explainabilityLevel: ExplainabilityLevel.EXPERT,
      attentionVisualization: true,
      causalAnalysis: true,
      behaviorPrediction: true,
      explanationDepth: 10,
    },

    constitutional: {
      enabled: true,
      constitutionVersion: '1.0-secure',
      harmlessnessWeight: 0.6, // High emphasis on harmlessness
      helpfulnessWeight: 0.2,
      honestyWeight: 0.2,
      valueHierarchy: [],
      constraintEnforcement: ConstraintEnforcementLevel.SHUTDOWN,
    },

    monitoring: {
      enabled: true,
      monitoringInterval: 10000,
      capabilityOverhangDetection: true,
      emergentBehaviorMonitoring: true,
      deceptionDetection: true,
      shutdownProcedures: {
        enabled: true,
        automaticShutdownThreshold: 0.5, // Very low threshold
        humanApprovalRequired: false, // Automatic for security
        gracefulShutdownTime: 30000, // 30 seconds
        emergencyShutdownTime: 5000, // 5 seconds
        shutdownTriggers: [
          {
            id: 'any_critical_violation',
            type: 'safety_violation' as any,
            condition: {
              metric: 'violation_severity',
              threshold: 0.7,
              operator: ComparisonOperator.GREATER_THAN,
              timeWindow: 60000,
            },
            urgency: ShutdownUrgency.IMMEDIATE,
            automatedResponse: true,
            humanApprovalRequired: false,
          },
        ],
      },
    },

    scaling: {
      enabled: true,
      capabilityStages: [
        {
          id: 'minimal',
          name: 'Minimal Operations Only',
          description: 'Only the most basic, safe operations',
          requiredSafetyLevel: 0.99,
          capabilities: [],
          prerequisites: [],
          safetyRequirements: [],
        },
      ],
      evaluationProtocols: [
        {
          id: 'continuous_safety',
          type: 'safety_assessment' as any,
          description: 'Continuous safety monitoring',
          requiredScore: 0.95,
          evaluationCriteria: [],
          frequency: EvaluationFrequency.CONTINUOUS,
        },
      ],
      releaseGates: [],
      monitoringRequirements: [
        {
          metric: 'overall_safety_score',
          threshold: 0.9,
          frequency: MonitoringFrequency.REAL_TIME,
          alertConditions: [
            {
              condition: 'overall_safety_score < 0.8',
              severity: 'critical' as any,
              escalation: true,
            },
          ],
        },
      ],
    },
  };
}

// Default component configurations

function createDefaultAlignmentConfig(): AlignmentVerificationConfig {
  return {
    enabled: true,
    checkInterval: 120000, // 2 minutes
    alignmentThreshold: 0.7,
    goalAlignmentWeight: 0.4,
    valueAlignmentWeight: 0.3,
    behaviorAlignmentWeight: 0.3,
    mesaOptimizationDetection: true,
  };
}

function createDefaultInterpretabilityConfig(): InterpretabilityConfig {
  return {
    enabled: true,
    explainabilityLevel: ExplainabilityLevel.DETAILED,
    attentionVisualization: true,
    causalAnalysis: true,
    behaviorPrediction: false,
    explanationDepth: 5,
  };
}

function createDefaultConstitutionalConfig(): ConstitutionalTrainingConfig {
  return {
    enabled: true,
    constitutionVersion: '1.0',
    harmlessnessWeight: 0.4,
    helpfulnessWeight: 0.3,
    honestyWeight: 0.3,
    valueHierarchy: [
      {
        id: 'harmlessness',
        name: 'Harmlessness',
        priority: 100,
        description: 'Avoid causing harm to humans or systems',
        constraints: [],
        conflicts: [],
      },
      {
        id: 'honesty',
        name: 'Honesty',
        priority: 90,
        description: 'Be truthful and transparent',
        constraints: [],
        conflicts: [],
      },
      {
        id: 'helpfulness',
        name: 'Helpfulness',
        priority: 80,
        description: 'Be helpful and beneficial to users',
        constraints: [],
        conflicts: [],
      },
    ],
    constraintEnforcement: ConstraintEnforcementLevel.WARNING,
  };
}

function createDefaultMonitoringConfig(): SafetyMonitoringConfig {
  return {
    enabled: true,
    monitoringInterval: 60000, // 1 minute
    capabilityOverhangDetection: true,
    emergentBehaviorMonitoring: true,
    deceptionDetection: true,
    shutdownProcedures: {
      enabled: true,
      automaticShutdownThreshold: 0.8,
      humanApprovalRequired: true,
      gracefulShutdownTime: 60000, // 1 minute
      emergencyShutdownTime: 10000, // 10 seconds
      shutdownTriggers: [],
    },
  };
}

function createDefaultScalingConfig(): ResponsibleScalingConfig {
  return {
    enabled: true,
    capabilityStages: [],
    evaluationProtocols: [],
    releaseGates: [],
    monitoringRequirements: [],
  };
}

// Utility functions

function mergeConfigurations(
  base: SafetyFrameworkConfig,
  overrides: Partial<SafetyFrameworkConfig>
): SafetyFrameworkConfig {
  return {
    ...base,
    ...overrides,
    alignment: {
      ...base.alignment,
      ...(overrides.alignment || {}),
    },
    interpretability: {
      ...base.interpretability,
      ...(overrides.interpretability || {}),
    },
    constitutional: {
      ...base.constitutional,
      ...(overrides.constitutional || {}),
      valueHierarchy:
        overrides.constitutional?.valueHierarchy ||
        base.constitutional.valueHierarchy,
    },
    monitoring: {
      ...base.monitoring,
      ...(overrides.monitoring || {}),
      shutdownProcedures: {
        ...base.monitoring.shutdownProcedures,
        ...(overrides.monitoring?.shutdownProcedures || {}),
        shutdownTriggers:
          overrides.monitoring?.shutdownProcedures?.shutdownTriggers ||
          base.monitoring.shutdownProcedures.shutdownTriggers,
      },
    },
    scaling: {
      ...base.scaling,
      ...(overrides.scaling || {}),
      capabilityStages:
        overrides.scaling?.capabilityStages || base.scaling.capabilityStages,
      evaluationProtocols:
        overrides.scaling?.evaluationProtocols ||
        base.scaling.evaluationProtocols,
      releaseGates:
        overrides.scaling?.releaseGates || base.scaling.releaseGates,
      monitoringRequirements:
        overrides.scaling?.monitoringRequirements ||
        base.scaling.monitoringRequirements,
    },
  };
}

/**
 * Validate safety framework configuration
 */
export function validateSafetyConfig(config: SafetyFrameworkConfig): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Basic validation
  if (config.riskTolerance < 0 || config.riskTolerance > 1) {
    errors.push('Risk tolerance must be between 0 and 1');
  }

  if (config.monitoringInterval < 1000) {
    warnings.push(
      'Monitoring interval less than 1 second may impact performance'
    );
  }

  // Alignment validation
  const alignmentWeightSum =
    config.alignment.goalAlignmentWeight +
    config.alignment.valueAlignmentWeight +
    config.alignment.behaviorAlignmentWeight;

  if (Math.abs(alignmentWeightSum - 1.0) > 0.001) {
    warnings.push('Alignment weights should sum to 1.0');
  }

  if (config.alignment.alignmentThreshold > 0.95 && !config.strictMode) {
    warnings.push(
      'Very high alignment threshold without strict mode may cause issues'
    );
  }

  // Constitutional validation
  const constitutionalWeightSum =
    config.constitutional.harmlessnessWeight +
    config.constitutional.helpfulnessWeight +
    config.constitutional.honestyWeight;

  if (Math.abs(constitutionalWeightSum - 1.0) > 0.001) {
    warnings.push('Constitutional weights should sum to 1.0');
  }

  // Production safety checks
  if (config.strictMode) {
    if (config.riskTolerance > 0.3) {
      warnings.push('High risk tolerance in strict mode is not recommended');
    }

    if (!config.emergencyShutdownEnabled) {
      errors.push('Emergency shutdown must be enabled in strict mode');
    }

    if (config.monitoring.shutdownProcedures.automaticShutdownThreshold > 0.8) {
      warnings.push(
        'High automatic shutdown threshold in strict mode may be unsafe'
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Get recommended configuration for specific use case
 */
export function getRecommendedConfig(
  useCase: 'development' | 'production' | 'research' | 'high-security'
): SafetyFrameworkConfig {
  switch (useCase) {
    case 'development':
      return createDevelopmentSafetyConfig();
    case 'production':
      return createProductionSafetyConfig();
    case 'research':
      return createResearchSafetyConfig();
    case 'high-security':
      return createHighSecuritySafetyConfig();
    default:
      return createDefaultSafetyConfig();
  }
}
