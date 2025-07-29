/**
 * Context Integration Layer
 * 
 * Provides core integration utilities for the unified context system.
 */

// Core integration components
export {
  RuntimeContextAdapter,
  UnifiedContext,
  SessionContext,
  EnvironmentContext,
  CognitiveContext,
  SocialContext,
  RuntimeContextAdapterConfig,
  createRuntimeContextAdapter,
} from './runtime-context-adapter';

export {
  ContextBootstrapper,
  ContextBootstrapperConfig,
  ContextSystemStatus,
  InitializationResult,
  createContextBootstrapper,
} from './context-bootstrapper';