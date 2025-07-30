/**
 * Context Management System for SYMindX
 *
 * This module provides the complete context enrichment system including
 * the pipeline orchestrator and all available enrichers.
 */

// Export the enrichment pipeline
export { EnrichmentPipeline } from './enrichment-pipeline';

// Export all enrichers
export * from './enrichers/index';

// Re-export enrichment types for convenience
export type {
  ContextEnricher,
  EnrichmentRequest,
  ContextEnrichmentResult,
  PipelineExecutionResult,
  EnrichmentPipelineConfig,
  EnricherConfig,
  EnrichmentPriority,
  EnrichmentStage,
  EnrichmentMetrics,
  EnricherRegistryEntry,
  EnricherFactory,
  // Enrichment data types
  MemoryEnrichmentData,
  EnvironmentEnrichmentData,
  EmotionalEnrichmentData,
  SocialEnrichmentData,
  TemporalEnrichmentData,
} from '../../types/context/context-enrichment';
