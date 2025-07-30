/**
 * Naming migration utilities for transitioning from snake_case to camelCase
 * Provides backward compatibility while enforcing new naming standards
 */

import { runtimeLogger } from '../utils/logger.js';

/**
 * Convert snake_case to camelCase
 */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Convert camelCase to snake_case
 */
export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * Deep convert all keys in an object from snake_case to camelCase
 */
export function deepSnakeToCamel<T extends Record<string, unknown>>(obj: T): T {
  if (Array.isArray(obj)) {
    return obj.map((item) =>
      typeof item === 'object' && item !== null ? deepSnakeToCamel(item) : item
    ) as unknown as T;
  }

  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  const converted: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const camelKey = snakeToCamel(key);
    converted[camelKey] =
      typeof value === 'object' && value !== null
        ? deepSnakeToCamel(value as Record<string, unknown>)
        : value;
  }

  return converted as T;
}

/**
 * Deep convert all keys in an object from camelCase to snake_case
 */
export function deepCamelToSnake<T extends Record<string, unknown>>(obj: T): T {
  if (Array.isArray(obj)) {
    return obj.map((item) =>
      typeof item === 'object' && item !== null ? deepCamelToSnake(item) : item
    ) as unknown as T;
  }

  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  const converted: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = camelToSnake(key);
    converted[snakeKey] =
      typeof value === 'object' && value !== null
        ? deepCamelToSnake(value as Record<string, unknown>)
        : value;
  }

  return converted as T;
}

/**
 * Migration wrapper that accepts both naming conventions
 * Logs deprecation warnings for snake_case usage
 */
export function createMigrationProxy<T extends Record<string, unknown>>(
  target: T,
  componentName: string
): T {
  return new Proxy(target, {
    get(obj, prop) {
      if (typeof prop === 'string' && prop.includes('_')) {
        const camelProp = snakeToCamel(prop);
        if (camelProp in obj) {
          runtimeLogger.warn('Deprecated snake_case property access', {
            component: componentName,
            deprecated: prop,
            replacement: camelProp,
            stack: new Error().stack,
          });
          return obj[camelProp as keyof T];
        }
      }
      return obj[prop as keyof T];
    },

    set(obj, prop, value) {
      if (typeof prop === 'string' && prop.includes('_')) {
        const camelProp = snakeToCamel(prop);
        runtimeLogger.warn('Deprecated snake_case property assignment', {
          component: componentName,
          deprecated: prop,
          replacement: camelProp,
          stack: new Error().stack,
        });
        obj[camelProp as keyof T] = value;
        return true;
      }
      obj[prop as keyof T] = value;
      return true;
    },
  });
}

/**
 * Batch migration utility for converting arrays of objects
 */
export function migrateArray<T extends Record<string, unknown>>(
  items: T[],
  direction: 'toCamel' | 'toSnake' = 'toCamel'
): T[] {
  const converter =
    direction === 'toCamel' ? deepSnakeToCamel : deepCamelToSnake;
  return items.map((item) => converter(item));
}

/**
 * Type-safe property mapping for specific interfaces
 */
export const PROPERTY_MAPPINGS = {
  // AgentConfig mappings
  agentConfig: {
    human_interaction: 'humanInteraction',
    decision_making: 'decisionMaking',
    autonomy_threshold: 'autonomyThreshold',
    ethical_constraints: 'ethicalConstraints',
    independence_level: 'independenceLevel',
    life_simulation: 'lifeSimulation',
    goal_pursuit: 'goalPursuit',
    interruption_tolerance: 'interruptionTolerance',
  },

  // MemoryRecord mappings
  memoryRecord: {
    expires_at: 'expiresAt',
  },

  // EventContext mappings
  eventContext: {
    correlation_id: 'correlationId',
    parent_event_id: 'parentEventId',
    chain_id: 'chainId',
    origin_agent_id: 'originAgentId',
    propagation_depth: 'propagationDepth',
    expires_at: 'expiresAt',
    priority_min: 'priorityMin',
    priority_max: 'priorityMax',
    max_depth: 'maxDepth',
    include_expired: 'includeExpired',
  },

  // EventPropagationRule mappings
  eventPropagationRule: {
    event_types: 'eventTypes',
    inherit_context: 'inheritContext',
    merge_strategy: 'mergeStrategy',
    max_depth: 'maxDepth',
    ttl_seconds: 'ttlSeconds',
    required_tags: 'requiredTags',
    excluded_tags: 'excludedTags',
  },

  // Autonomous system mappings
  autonomous: {
    q_learning: 'qLearning',
    deep_q: 'deepQ',
    policy_gradient: 'policyGradient',
    actor_critic: 'actorCritic',
    short_term: 'shortTerm',
    long_term: 'longTerm',
    life_goal: 'lifeGoal',
    error_rate: 'errorRate',
    resource_usage: 'resourceUsage',
    external_signal: 'externalSignal',
    parameter_adjustment: 'parameterAdjustment',
    strategy_change: 'strategyChange',
    resource_reallocation: 'resourceReallocation',
    capability_enhancement: 'capabilityEnhancement',
    resource_sharing: 'resourceSharing',
    temporal_scheduling: 'temporalScheduling',
    goal_modification: 'goalModification',
    goal_abandonment: 'goalAbandonment',
    knowledge_gap: 'knowledgeGap',
  },

  // Memory system mappings
  memory: {
    short_term: 'shortTerm',
    medium_term: 'mediumTerm',
    long_term: 'longTerm',
    multi_modal: 'multiModal',
    move_tier: 'moveTier',
  },

  // Portal mappings
  portal: {
    unified_multimodal: 'unifiedMultimodal',
  },

  // Extension API mappings
  extensionApi: {
    chat_response: 'chatResponse',
    command_response: 'commandResponse',
  },
} as const;

/**
 * Create a type-safe migration function for a specific interface
 */
export function createInterfaceMigrator<T extends Record<string, unknown>>(
  mappings: Record<string, string>
): (obj: T) => T {
  return (obj: T): T => {
    const migrated = { ...obj };

    for (const [oldKey, newKey] of Object.entries(mappings)) {
      if (oldKey in migrated) {
        migrated[newKey as keyof T] = migrated[oldKey as keyof T];
        delete migrated[oldKey as keyof T];
      }
    }

    return migrated;
  };
}

/**
 * Validate that an object uses consistent naming convention
 */
export function validateNamingConsistency(
  obj: Record<string, unknown>,
  convention: 'camelCase' | 'snake_case' = 'camelCase'
): { valid: boolean; violations: string[] } {
  const violations: string[] = [];

  const checkKeys = (o: Record<string, unknown>, path = ''): void => {
    for (const key of Object.keys(o)) {
      const fullPath = path ? `${path}.${key}` : key;

      if (convention === 'camelCase' && key.includes('_')) {
        violations.push(`${fullPath} uses snake_case instead of camelCase`);
      } else if (convention === 'snake_case' && /[A-Z]/.test(key)) {
        violations.push(`${fullPath} uses camelCase instead of snake_case`);
      }

      if (
        typeof o[key] === 'object' &&
        o[key] !== null &&
        !Array.isArray(o[key])
      ) {
        checkKeys(o[key] as Record<string, unknown>, fullPath);
      }
    }
  };

  checkKeys(obj);

  return {
    valid: violations.length === 0,
    violations,
  };
}

/**
 * Runtime deprecation warning for snake_case usage
 */
export function deprecateSnakeCase(target: unknown, propertyKey: string): void {
  if (propertyKey.includes('_')) {
    const camelCaseKey = snakeToCamel(propertyKey);
    runtimeLogger.warn('Snake_case property is deprecated', {
      deprecated: propertyKey,
      replacement: camelCaseKey,
      migration: `Please update your code to use '${camelCaseKey}' instead of '${propertyKey}'`,
    });
  }
}
