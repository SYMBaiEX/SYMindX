/**
 * AI Act Compliance Module
 *
 * Exports AI Act 2025 compliance components
 */

// Main service
export {
  AIActComplianceServiceImpl,
  createAIActComplianceService,
} from './ai-act-compliance-service';

// Explainability
export {
  ExplainabilityEngine,
  createExplainabilityEngine,
} from './explainability';

// Bias detection
export {
  BiasDetectionEngine,
  createBiasDetectionEngine,
} from './bias-detection';

// Human oversight and logging
export {
  AISystemLogger,
  HumanOversightManager,
  createAISystemLogger,
  createHumanOversightManager,
} from './human-oversight';

// Re-export types
export type {
  AIRiskCategory,
  AISystemPurpose,
  AIActConfig,
  AISystemLog,
  AIEventType,
  ExplainabilityConfig,
  ExplainabilityMethod,
  Explanation,
  ExplanationFactor,
  HumanOversightConfig,
  HumanReview,
  HumanOversightRequest,
  BiasDetectionConfig,
  FairnessMetric,
  MitigationStrategy,
  BiasReport,
  BiasMetric,
  DetectedBias,
  MitigationAction,
  DataQualityConfig,
  DataQualityReport,
  TechnicalDocumentation,
  AIActComplianceStatus,
  AIActComplianceReport,
  AIActComplianceService,
} from '../../../types/ai-act-compliance';
