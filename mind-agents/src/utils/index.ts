/**
 * @module utils
 * @description Utility functions and classes for SYMindX
 */

// Error handling system
export * from './error-handler.js';
export * from './standard-errors.js';

// Core utilities
export * from './logger.js';
export * from './config-resolver.js';
export * from './config-validator.js';
export * from './type-helpers.js';

// Development utilities
export * from './debug-utilities.js';
export * from './health-monitor.js';
export * from './cli-ui.js';

// Context integration utilities
export * from './context-helpers.js';
export * from './context-transformation.js';
export * from './context-observability.js';
export * from './context-cache.js';
export * from './multi-agent-context.js';
export * from './context-integration.js';

// Re-export commonly used error functions for convenience
export {
  createRuntimeError,
  createPortalError,
  createExtensionError,
  createConfigurationError,
  createMemoryError,
  createAuthError,
  createNetworkError,
  createValidationError,
  createAgentError,
  createToolError,
  safeAsync,
  safeSync,
  formatError,
  isSYMindXError,
  isErrorOfType,
} from './standard-errors.js';

export {
  errorHandler,
  ErrorCategory,
  ErrorSeverity,
  RecoveryStrategy,
} from './error-handler.js';

// Re-export commonly used context functions for convenience
export {
  contextIntegration,
  createEnhancedContext,
  transformContextFor,
} from './context-integration.js';

export {
  enrichThoughtContext,
  thoughtContextToPortalContext,
  validateThoughtContextForUnified,
} from './context-helpers.js';

// Performance and memory optimization utilities
export { memoryManager } from './MemoryManager.js';
export { performanceMonitor } from './PerformanceMonitor.js';
export { ConnectionPool } from './ConnectionPool.js';
export { LRUCache, MultiLevelCache } from './LRUCache.js';
export { globalLazyLoader, LazyLoader } from './LazyLoader.js';
export { 
  SharedMemoryPool, 
  stringPool, 
  configPool, 
  arrayPool, 
  bufferPool 
} from './SharedMemoryPool.js';
export { gcOptimizer, GarbageCollectionOptimizer } from './GarbageCollectionOptimizer.js';

// Caching and connection pooling utilities
export { 
  IntelligentResponseCache, 
  aiResponseCache, 
  configCache, 
  memoryCache 
} from './IntelligentResponseCache.js';
export { 
  DatabaseConnectionPool, 
  createPostgreSQLPool, 
  createSQLitePool 
} from './DatabaseConnectionPool.js';
export { 
  AIProviderConnectionPool, 
  createOpenAIPool 
} from './AIProviderConnectionPool.js';
export { 
  EventBatchProcessor, 
  systemEventBatcher, 
  userEventBatcher, 
  memoryEventBatcher 
} from './EventBatchProcessor.js';

// Performance monitoring and health check utilities
export { healthCheckSystem, HealthCheckSystem } from './HealthCheckSystem.js';
export { performanceDashboard, PerformanceDashboard } from './PerformanceDashboard.js';
export { bottleneckAnalyzer, BottleneckAnalyzer } from './BottleneckAnalyzer.js';
