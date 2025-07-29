/**
 * Runtime Module Exports
 * 
 * Centralized exports for all runtime modules to enable clean imports
 * and maintain a clear API surface.
 */

export { RuntimeCore } from './RuntimeCore';
export { AgentManager } from './AgentManager';
export { ConfigurationManager } from './ConfigurationManager';
export { BootstrapManager } from './BootstrapManager';
export { IntegrationCoordinator } from './IntegrationCoordinator';
export { 
  RuntimeMetricsCollector, 
  type MetricsCollectorConfig, 
  type PerformanceTimer 
} from './RuntimeMetrics';

// Re-export commonly used types for convenience
export type {
  RuntimeConfig,
  RuntimeState,
  RuntimeMetrics,
  Agent,
  AgentConfig,
  EventBus,
  ModuleRegistry,
} from '../../types/index';