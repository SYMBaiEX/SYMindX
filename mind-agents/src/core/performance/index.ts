/**
 * Performance Optimization Module Exports for SYMindX
 * Provides comprehensive performance monitoring and carbon-neutral computing
 */

export * from './performance-profiler';
export * from './carbon-neutral-computing';

// Re-export main classes for convenience
export { PerformanceProfiler } from './performance-profiler';
export { CarbonNeutralComputing } from './carbon-neutral-computing';

// Export types
export type {
  PerformanceProfile,
  PerformanceMark,
  PerformanceMeasure,
  MemoryProfile,
  CPUProfile,
  NetworkProfile,
  GPUProfile,
  PerformanceThresholds,
  OptimizationSuggestion,
  PowerSource,
  ComputeNode,
  CarbonMetrics,
  EnergyProfile,
  GreenComputeStrategy,
  WorkloadSchedule,
} from './carbon-neutral-computing';
