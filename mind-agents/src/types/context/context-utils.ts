/**
 * @fileoverview Context Utility Functions for SYMindX Unified Context System
 * @description Essential utility functions for creating, validating, manipulating,
 * and managing unified context objects. This module provides the foundational
 * operations needed for context management throughout the SYMindX ecosystem.
 * 
 * @version 1.0.0
 * @author SYMindX Core Team
 */

import { randomUUID } from 'crypto';
import {
  UnifiedContext,
  ContextScope,
  ContextPriority,
  ContextMetadata,
  ContextCreationOptions,
  ContextUpdateOptions,
  ContextDiff,
  ContextSystemConfig,
  DEFAULT_CONTEXT_SYSTEM_CONFIG,
  ContextTypeGuards,
  UnifiedContextQuery,
} from './unified-context.js';
import {
  ContextState,
  ContextValidationResult,
  ContextValidationRule,
  ContextFilter,
  ContextSnapshot,
  ContextPatch,
  ContextError,
  ContextValidationError,
  ContextNotFoundError,
  ContextExpiredError,
} from './context-types.js';
import type { Timestamp } from '../helpers.js';
import type { Metadata } from '../common.js';

/**
 * Context Creation Utilities
 */
export namespace ContextCreation {
  /**
   * Creates a new unified context with the specified options
   * 
   * @param options - Context creation options
   * @returns New unified context instance
   * 
   * @example
   * ```typescript
   * const context = createContext({
   *   scope: ContextScope.AGENT,
   *   source: 'agent-runtime',
   *   data: {
   *     agent: { id: 'agent-001', state: agentState }
   *   }
   * });
   * ```
   */
  export function createContext(options: ContextCreationOptions): UnifiedContext {
    const now = new Date().toISOString() as Timestamp;
    const contextId = randomUUID();
    
    const metadata: ContextMetadata = {
      id: contextId,
      scope: options.scope,
      priority: options.priority ?? DEFAULT_CONTEXT_SYSTEM_CONFIG.defaultPriority,
      createdAt: now,
      lastModified: now,
      source: options.source,
      version: DEFAULT_CONTEXT_SYSTEM_CONFIG.version,
      expiresAt: options.expiresAt,
      tags: options.tags,
    };

    const context: UnifiedContext = {
      metadata,
      ...options.data,
    };

    // Inherit from parent if specified
    if (options.parent && ContextTypeGuards.isUnifiedContext(options.parent)) {
      return mergeContexts(context, options.parent, {
        merge: true,
        source: options.source,
      });
    }

    return context;
  }

  /**
   * Creates a context from a template with default values
   * 
   * @param templateData - Template data for context creation
   * @param overrides - Optional overrides for template defaults
   * @returns New context instance based on template
   */
  export function createFromTemplate(
    templateData: Partial<UnifiedContext>,
    overrides?: Partial<ContextCreationOptions>
  ): UnifiedContext {
    const options: ContextCreationOptions = {
      scope: overrides?.scope ?? ContextScope.REQUEST,
      priority: overrides?.priority ?? ContextPriority.CONFIG,
      source: overrides?.source ?? 'template',
      data: { ...templateData, ...overrides?.data },
      ...overrides,
    };

    return createContext(options);
  }

  /**
   * Creates a child context that inherits from a parent
   * 
   * @param parent - Parent context to inherit from
   * @param childOptions - Options for child context creation
   * @returns New child context instance
   */
  export function createChildContext(
    parent: UnifiedContext,
    childOptions: Omit<ContextCreationOptions, 'parent'>
  ): UnifiedContext {
    return createContext({
      ...childOptions,
      parent,
      priority: childOptions.priority ?? parent.metadata.priority,
    });
  }

  /**
   * Creates an empty context with minimal metadata
   * 
   * @param scope - Context scope
   * @param source - Context source identifier
   * @returns Minimal context instance
   */
  export function createEmptyContext(
    scope: ContextScope = ContextScope.REQUEST,
    source: string = 'system'
  ): UnifiedContext {
    return createContext({
      scope,
      source,
      data: {},
    });
  }
}

/**
 * Context Validation Utilities
 */
export namespace ContextValidation {
  /**
   * Validates a unified context against standard rules
   * 
   * @param context - Context to validate
   * @param rules - Optional custom validation rules
   * @returns Validation result
   * 
   * @example
   * ```typescript
   * const result = validateContext(context);
   * if (result.isValid) {
   *   console.log('Context is valid');
   * } else {
   *   console.error('Validation errors:', result.errors);
   * }
   * ```
   */
  export function validateContext(
    context: unknown,
    rules?: ContextValidationRule[]
  ): {
    isValid: boolean;
    result: ContextValidationResult;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic type validation
    if (!ContextTypeGuards.isUnifiedContext(context)) {
      errors.push('Object is not a valid UnifiedContext');
      return {
        isValid: false,
        result: ContextValidationResult.INVALID,
        errors,
        warnings,
      };
    }

    // Metadata validation
    if (!ContextTypeGuards.isContextMetadata(context.metadata)) {
      errors.push('Context metadata is invalid');
    }

    // Expiration validation
    if (context.metadata.expiresAt) {
      const expiresAt = new Date(String(context.metadata.expiresAt));
      const now = new Date();
      if (expiresAt <= now) {
        warnings.push('Context has expired');
      }
    }

    // Custom rules validation
    if (rules) {
      for (const rule of rules) {
        try {
          const ruleResult = rule.validate(context);
          if (ruleResult === ContextValidationResult.INVALID) {
            errors.push(rule.errorMessage ?? `Validation rule '${rule.name}' failed`);
          } else if (ruleResult === ContextValidationResult.WARNING) {
            warnings.push(rule.errorMessage ?? `Validation rule '${rule.name}' warning`);
          }
        } catch (error) {
          errors.push(`Validation rule '${rule.name}' threw error: ${error}`);
        }
      }
    }

    const isValid = errors.length === 0;
    const result = errors.length > 0 
      ? ContextValidationResult.INVALID 
      : warnings.length > 0 
        ? ContextValidationResult.WARNING 
        : ContextValidationResult.VALID;

    return { isValid, result, errors, warnings };
  }

  /**
   * Checks if a context has expired
   * 
   * @param context - Context to check
   * @returns True if context has expired
   */
  export function isExpired(context: UnifiedContext): boolean {
    if (!context.metadata.expiresAt) {
      return false;
    }

    const expiresAt = new Date(String(context.metadata.expiresAt));
    const now = new Date();
    return expiresAt <= now;
  }

  /**
   * Validates context scope hierarchy
   * 
   * @param child - Child context
   * @param parent - Parent context
   * @returns True if hierarchy is valid
   */
  export function validateScopeHierarchy(
    child: UnifiedContext,
    parent: UnifiedContext
  ): boolean {
    const scopeHierarchy = [
      ContextScope.GLOBAL,
      ContextScope.RUNTIME,
      ContextScope.AGENT,
      ContextScope.SESSION,
      ContextScope.REQUEST,
      ContextScope.EXTENSION,
      ContextScope.PORTAL,
    ];

    const childIndex = scopeHierarchy.indexOf(child.metadata.scope);
    const parentIndex = scopeHierarchy.indexOf(parent.metadata.scope);

    // Child scope should be at same level or more specific than parent
    return childIndex >= parentIndex;
  }

  /**
   * Validates context size limits
   * 
   * @param context - Context to validate
   * @param maxSize - Maximum size in bytes
   * @returns True if context size is within limits
   */
  export function validateSize(context: UnifiedContext, maxSize: number = 10485760): boolean {
    const serialized = JSON.stringify(context);
    const size = Buffer.byteLength(serialized, 'utf8');
    return size <= maxSize;
  }
}

/**
 * Context Comparison Utilities
 */
export namespace ContextComparison {
  /**
   * Compares two contexts and returns their differences
   * 
   * @param current - Current context state
   * @param previous - Previous context state
   * @returns Context diff object
   * 
   * @example
   * ```typescript
   * const diff = compareContexts(currentContext, previousContext);
   * console.log('Added properties:', diff.added);
   * console.log('Modified properties:', diff.modified);
   * console.log('Removed properties:', diff.removed);
   * ```
   */
  export function compareContexts(
    current: UnifiedContext,
    previous: UnifiedContext
  ): ContextDiff {
    const added: Record<string, unknown> = {};
    const modified: Record<string, { old: unknown; new: unknown }> = {};
    const removed: Record<string, unknown> = {};
    let unchanged = 0;

    const currentFlat = flattenObject(current);
    const previousFlat = flattenObject(previous);

    // Find added and modified properties
    for (const [key, value] of Object.entries(currentFlat)) {
      if (!(key in previousFlat)) {
        added[key] = value;
      } else if (!deepEqual(value, previousFlat[key])) {
        modified[key] = { old: previousFlat[key], new: value };
      } else {
        unchanged++;
      }
    }

    // Find removed properties
    for (const [key, value] of Object.entries(previousFlat)) {
      if (!(key in currentFlat)) {
        removed[key] = value;
      }
    }

    return {
      added,
      modified,
      removed,
      unchanged,
      timestamp: new Date().toISOString() as Timestamp,
    };
  }

  /**
   * Checks if two contexts are equal
   * 
   * @param context1 - First context
   * @param context2 - Second context
   * @param options - Comparison options
   * @returns True if contexts are equal
   */
  export function areEqual(
    context1: UnifiedContext,
    context2: UnifiedContext,
    options: {
      ignoreMetadata?: boolean;
      ignoreTimestamps?: boolean;
      customComparator?: (a: unknown, b: unknown) => boolean;
    } = {}
  ): boolean {
    if (options.customComparator) {
      return options.customComparator(context1, context2);
    }

    const ctx1 = options.ignoreMetadata ? { ...context1, metadata: undefined } : context1;
    const ctx2 = options.ignoreMetadata ? { ...context2, metadata: undefined } : context2;

    if (options.ignoreTimestamps) {
      // Remove timestamp fields for comparison
      const cleanContext = (ctx: UnifiedContext) => {
        const cleaned = { ...ctx };
        if (cleaned.metadata) {
          cleaned.metadata = {
            ...cleaned.metadata,
            createdAt: undefined as any,
            lastModified: undefined as any,
          };
        }
        return cleaned;
      };
      return deepEqual(cleanContext(ctx1), cleanContext(ctx2));
    }

    return deepEqual(ctx1, ctx2);
  }

  /**
   * Calculates similarity score between two contexts
   * 
   * @param context1 - First context
   * @param context2 - Second context
   * @returns Similarity score between 0 and 1
   */
  export function calculateSimilarity(
    context1: UnifiedContext,
    context2: UnifiedContext
  ): number {
    const flat1 = flattenObject(context1);
    const flat2 = flattenObject(context2);

    const allKeys = new Set([...Object.keys(flat1), ...Object.keys(flat2)]);
    let matches = 0;

    Array.from(allKeys).forEach(key => {
      if (key in flat1 && key in flat2 && deepEqual(flat1[key], flat2[key])) {
        matches++;
      }
    });

    return allKeys.size > 0 ? matches / allKeys.size : 0;
  }
}

/**
 * Context Merging Utilities
 */
export namespace ContextMerging {
  /**
   * Merges two or more contexts into a single context
   * 
   * @param target - Target context to merge into
   * @param sources - Source contexts to merge from
   * @param options - Merge options
   * @returns Merged context
   * 
   * @example
   * ```typescript
   * const merged = mergeContexts(baseContext, agentContext, sessionContext, {
   *   merge: true,
   *   source: 'context-merger'
   * });
   * ```
   */
  export function mergeContexts(
    target: UnifiedContext,
    ...sources: (UnifiedContext | [UnifiedContext, ContextUpdateOptions])[]
  ): UnifiedContext {
    let result = { ...target };

    for (const sourceOrTuple of sources) {
      const [source, options] = Array.isArray(sourceOrTuple) && sourceOrTuple.length === 2
        ? sourceOrTuple
        : [sourceOrTuple as UnifiedContext, { merge: true } as ContextUpdateOptions];

      if (options?.merge === false) {
        // Replace mode - overwrite target with source
        result = { ...source };
      } else {
        // Merge mode - deep merge source into target
        result = deepMerge(result, source);
      }

      // Update metadata (create mutable copy)
      const mutableMetadata = { ...result.metadata } as any;
      mutableMetadata.lastModified = new Date().toISOString();
      mutableMetadata.source = options.source ?? result.metadata.source;
      mutableMetadata.tags = options.tags ?? result.metadata.tags;
      result.metadata = mutableMetadata as ContextMetadata;

      // Add trace information if provided
      if (options.trace) {
        result.trace = {
          ...result.trace,
          ...options.trace,
          timestamp: new Date().toISOString() as Timestamp,
        };
      }
    }

    return result;
  }

  /**
   * Merges contexts with conflict resolution strategy
   * 
   * @param contexts - Contexts to merge
   * @param strategy - Conflict resolution strategy
   * @returns Merged context
   */
  export function mergeWithConflictResolution(
    contexts: UnifiedContext[],
    strategy: 'priority' | 'timestamp' | 'source' | 'custom',
    customResolver?: (conflicts: Array<{ key: string; values: unknown[] }>) => Record<string, unknown>
  ): UnifiedContext {
    if (contexts.length === 0) {
      throw new Error('Cannot merge empty context array');
    }

    if (contexts.length === 1) {
      return contexts[0];
    }

    // Sort contexts based on strategy
    let sortedContexts: UnifiedContext[];
    switch (strategy) {
      case 'priority':
        sortedContexts = [...contexts].sort((a, b) => b.metadata.priority - a.metadata.priority);
        break;
      case 'timestamp':
        sortedContexts = [...contexts].sort((a, b) => 
          new Date(String(b.metadata.lastModified)).getTime() - new Date(String(a.metadata.lastModified)).getTime()
        );
        break;
      case 'source':
        sortedContexts = [...contexts].sort((a, b) => a.metadata.source.localeCompare(b.metadata.source));
        break;
      case 'custom':
        if (!customResolver) {
          throw new Error('Custom resolver required for custom merge strategy');
        }
        // Use custom resolution logic
        sortedContexts = contexts;
        break;
      default:
        sortedContexts = contexts;
    }

    // Merge contexts in order
    return sortedContexts.reduce((merged, current) => mergeContexts(merged, current));
  }
}

/**
 * Context Cloning Utilities
 */
export namespace ContextCloning {
  /**
   * Creates a deep clone of a context
   * 
   * @param context - Context to clone
   * @param options - Cloning options
   * @returns Cloned context
   */
  export function cloneContext(
    context: UnifiedContext,
    options: {
      newId?: boolean;
      updateTimestamp?: boolean;
      newSource?: string;
    } = {}
  ): UnifiedContext {
    const cloned = deepClone(context);

    // Create a mutable metadata object
    const mutableMetadata = { ...cloned.metadata } as any;

    if (options.newId) {
      mutableMetadata.id = randomUUID();
    }

    if (options.updateTimestamp) {
      const now = new Date().toISOString();
      mutableMetadata.lastModified = now;
      if (options.newId) {
        mutableMetadata.createdAt = now;
      }
    }

    if (options.newSource) {
      mutableMetadata.source = options.newSource;
    }

    cloned.metadata = mutableMetadata as ContextMetadata;
    return cloned;
  }

  /**
   * Creates a shallow clone of a context
   * 
   * @param context - Context to clone
   * @returns Shallow cloned context
   */
  export function shallowClone(context: UnifiedContext): UnifiedContext {
    return { ...context };
  }

  /**
   * Creates a context snapshot for versioning
   * 
   * @param context - Context to snapshot
   * @returns Context snapshot
   */
  export function createSnapshot(context: UnifiedContext): ContextSnapshot<UnifiedContext> {
    return {
      ...deepClone(context),
      _snapshotId: randomUUID(),
      _timestamp: new Date().toISOString() as Timestamp,
      _version: context.metadata.version,
    } as unknown as ContextSnapshot<UnifiedContext>;
  }
}

/**
 * Context Query Utilities
 */
export namespace ContextQuery {
  /**
   * Filters contexts based on query criteria
   * 
   * @param contexts - Contexts to filter
   * @param query - Query criteria
   * @returns Filtered contexts
   */
  export function filterContexts(
    contexts: UnifiedContext[],
    query: UnifiedContextQuery
  ): UnifiedContext[] {
    return contexts.filter(context => matchesQuery(context, query));
  }

  /**
   * Checks if a context matches query criteria
   * 
   * @param context - Context to check
   * @param query - Query criteria
   * @returns True if context matches
   */
  export function matchesQuery(context: UnifiedContext, query: UnifiedContextQuery): boolean {
    // Scope filter
    if (query.scope) {
      const scopes = Array.isArray(query.scope) ? query.scope : [query.scope];
      if (!scopes.includes(context.metadata.scope)) {
        return false;
      }
    }

    // Source filter
    if (query.source) {
      const sources = Array.isArray(query.source) ? query.source : [query.source];
      if (!sources.includes(context.metadata.source)) {
        return false;
      }
    }

    // Tags filter
    if (query.tags) {
      const queryTags = Array.isArray(query.tags) ? query.tags : [query.tags];
      const contextTags = context.metadata.tags ?? [];
      if (!queryTags.some(tag => contextTags.includes(tag))) {
        return false;
      }
    }

    // Time range filter
    if (query.timeRange) {
      const contextTime = new Date(String(context.metadata.createdAt));
      const start = new Date(String(query.timeRange.start));
      const end = new Date(String(query.timeRange.end));
      if (contextTime < start || contextTime > end) {
        return false;
      }
    }

    // Priority range filter
    if (query.priorityRange) {
      const priority = context.metadata.priority;
      if (priority < query.priorityRange.min || priority > query.priorityRange.max) {
        return false;
      }
    }

    // Expired filter
    if (!query.includeExpired && isExpired(context)) {
      return false;
    }

    return true;
  }

  /**
   * Sorts contexts by specified criteria
   * 
   * @param contexts - Contexts to sort
   * @param sortBy - Sort criteria
   * @param order - Sort order
   * @returns Sorted contexts
   */
  export function sortContexts(
    contexts: UnifiedContext[],
    sortBy: 'createdAt' | 'lastModified' | 'priority' | 'scope' | 'source',
    order: 'asc' | 'desc' = 'desc'
  ): UnifiedContext[] {
    return [...contexts].sort((a, b) => {
      let result = 0;

      switch (sortBy) {
        case 'createdAt':
          result = new Date(String(a.metadata.createdAt)).getTime() - new Date(String(b.metadata.createdAt)).getTime();
          break;
        case 'lastModified':
          result = new Date(String(a.metadata.lastModified)).getTime() - new Date(String(b.metadata.lastModified)).getTime();
          break;
        case 'priority':
          result = a.metadata.priority - b.metadata.priority;
          break;
        case 'scope':
          result = a.metadata.scope.localeCompare(b.metadata.scope);
          break;
        case 'source':
          result = a.metadata.source.localeCompare(b.metadata.source);
          break;
      }

      return order === 'desc' ? -result : result;
    });
  }
}

/**
 * Utility helper functions
 */

/**
 * Deep equality comparison
 */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;
  
  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a as object);
    const keysB = Object.keys(b as object);
    
    if (keysA.length !== keysB.length) return false;
    
    for (const key of keysA) {
      if (!keysB.includes(key)) return false;
      if (!deepEqual((a as any)[key], (b as any)[key])) return false;
    }
    
    return true;
  }
  
  return false;
}

/**
 * Deep clone an object
 */
function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T;
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as unknown as T;
  
  const cloned = {} as T;
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  
  return cloned;
}

/**
 * Deep merge two objects
 */
function deepMerge<T, U>(target: T, source: U): T & U {
  const result = { ...target } as T & U;
  
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      const sourceValue = source[key];
      const targetValue = (target as any)[key];
      
      if (isObject(sourceValue) && isObject(targetValue)) {
        (result as any)[key] = deepMerge(targetValue, sourceValue);
      } else {
        (result as any)[key] = sourceValue;
      }
    }
  }
  
  return result;
}

/**
 * Flatten nested object into dot-notation keys
 */
function flattenObject(obj: unknown, prefix = ''): Record<string, unknown> {
  const flattened: Record<string, unknown> = {};
  
  if (!isObject(obj)) {
    return { [prefix]: obj };
  }
  
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    
    if (isObject(value) && !Array.isArray(value)) {
      Object.assign(flattened, flattenObject(value, newKey));
    } else {
      flattened[newKey] = value;
    }
  }
  
  return flattened;
}

/**
 * Check if value is an object
 */
function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Validates context expiration
 */
function isExpired(context: UnifiedContext): boolean {
  return ContextValidation.isExpired(context);
}

/**
 * Exported utility functions for direct use
 */
export const {
  createContext,
  createFromTemplate,
  createChildContext,
  createEmptyContext,
} = ContextCreation;

export const {
  validateContext,
  isExpired: validateExpired,
  validateScopeHierarchy,
  validateSize,
} = ContextValidation;

export const {
  compareContexts,
  areEqual,
  calculateSimilarity,
} = ContextComparison;

export const {
  mergeContexts,
  mergeWithConflictResolution,
} = ContextMerging;

export const {
  cloneContext,
  shallowClone,
  createSnapshot,
} = ContextCloning;

export const {
  filterContexts,
  matchesQuery,
  sortContexts,
} = ContextQuery;