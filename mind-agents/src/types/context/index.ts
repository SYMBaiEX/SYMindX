/**
 * Unified Context System for SYMindX
 *
 * This module provides a comprehensive context injection and management system
 * that unifies all contextual information across the agent runtime.
 *
 * @version 1.0.0
 * @author SYMindX Core Team
 */

// Core context interfaces - Phase 1 Implementation
export * from './unified-context.js';
export * from './context-types.js';
export * from './context-utils.js';
export * from './context-lifecycle.js';
export * from './context-enrichment.js';
export * from './context-caching.js';

// Context injection framework - Phase 2 Implementation
export * from './context-injection.js';

// Additional utilities - Phase 2+ Implementation
// export * from './context-validators.js';
// export * from './context-serialization.js';

// Distinct generations use explicit names rather than conflicting star exports.
export type { ContextValidationResult } from './context-lifecycle.js';
export { ContextValidationResult as ContextValidationStatus } from './context-types.js';
export type { ContextEnricher } from './context-enrichment.js';
export type { ContextMiddleware } from './context-injection.js';
export { ContextScope } from './unified-context.js';
export type {
  ContextEnricher as InjectionContextEnricher,
  ContextScope as InjectionContextScope,
} from './context-injection.js';
export type { ContextMiddleware as ContextLifecycleMiddleware } from './context-types.js';
