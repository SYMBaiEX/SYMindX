/**
 * Edge Computing Module Exports for SYMindX
 * Provides high-performance edge deployment capabilities
 */

export * from './wasm-runtime';
export * from './network-optimizer';
export * from './edge-runtime';

// Re-export main classes for convenience
export { WASMRuntime } from './wasm-runtime';
export { NetworkOptimizer } from './network-optimizer';
export { EdgeRuntime } from './edge-runtime';

// Export types
export type {
  WASMModuleConfig,
  WASMPerformanceMetrics,
  NetworkSliceType,
  NetworkSliceConfig,
  MECConfig,
  AdaptiveBitrateConfig,
  NetworkMetrics,
  EdgeRuntimeConfig,
  EdgeMetrics,
  QuantizedModel,
  QuantizationLevel,
  DistributedState,
} from './edge-runtime';
