/**
 * Context Enrichers for SYMindX
 * 
 * This module exports all available context enrichers and provides factory
 * functions for creating and registering enrichers with the pipeline.
 */

export { BaseContextEnricher } from './base-enricher';
export { MemoryContextEnricher } from './memory-context-enricher';
export { EnvironmentContextEnricher } from './environment-context-enricher';
export { EmotionalContextEnricher } from './emotional-context-enricher';
export { SocialContextEnricher } from './social-context-enricher';
export { TemporalContextEnricher } from './temporal-context-enricher';

// Export enricher-specific config types
export type { MemoryEnricherConfig } from './memory-context-enricher';
export type { EnvironmentEnricherConfig } from './environment-context-enricher';
export type { EmotionalEnricherConfig } from './emotional-context-enricher';
export type { SocialEnricherConfig } from './social-context-enricher';
export type { TemporalEnricherConfig } from './temporal-context-enricher';

// Import types needed for factory functions
import { MemoryProvider } from '../../../types/memory';
import { EmotionModule } from '../../../types/emotion';
import { Agent } from '../../../types/agent';
import {
  EnricherRegistryEntry,
  EnricherFactory,
  EnrichmentPriority,
  EnrichmentStage,
} from '../../../types/context/context-enrichment';

// Import all enricher classes
import { MemoryContextEnricher, MemoryEnricherConfig } from './memory-context-enricher';
import { EnvironmentContextEnricher, EnvironmentEnricherConfig } from './environment-context-enricher';
import { EmotionalContextEnricher, EmotionalEnricherConfig } from './emotional-context-enricher';
import { SocialContextEnricher, SocialEnricherConfig } from './social-context-enricher';
import { TemporalContextEnricher, TemporalEnricherConfig } from './temporal-context-enricher';

/**
 * Factory function for creating a Memory Context Enricher
 */
export function createMemoryContextEnricher(
  memoryProvider: MemoryProvider,
  config?: Partial<MemoryEnricherConfig>
): MemoryContextEnricher {
  return new MemoryContextEnricher(memoryProvider, config);
}

/**
 * Factory function for creating an Environment Context Enricher
 */
export function createEnvironmentContextEnricher(
  agentProvider: () => Agent | null,
  config?: Partial<EnvironmentEnricherConfig>
): EnvironmentContextEnricher {
  return new EnvironmentContextEnricher(agentProvider, config);
}

/**
 * Factory function for creating an Emotional Context Enricher
 */
export function createEmotionalContextEnricher(
  emotionProvider: () => EmotionModule | null,
  config?: Partial<EmotionalEnricherConfig>
): EmotionalContextEnricher {
  return new EmotionalContextEnricher(emotionProvider, config);
}

/**
 * Factory function for creating a Social Context Enricher
 */
export function createSocialContextEnricher(
  memoryProvider: MemoryProvider,
  config?: Partial<SocialEnricherConfig>
): SocialContextEnricher {
  return new SocialContextEnricher(memoryProvider, config);
}

/**
 * Factory function for creating a Temporal Context Enricher
 */
export function createTemporalContextEnricher(
  config?: Partial<TemporalEnricherConfig>
): TemporalContextEnricher {
  return new TemporalContextEnricher(config);
}

/**
 * Create registry entry for Memory Context Enricher
 */
export function createMemoryEnricherRegistryEntry(
  memoryProvider: MemoryProvider,
  config?: Partial<MemoryEnricherConfig>
): EnricherRegistryEntry {
  const factory: EnricherFactory = async () => {
    const enricher = createMemoryContextEnricher(memoryProvider, config);
    return enricher;
  };

  return {
    id: 'memory-context-enricher',
    factory,
    metadata: {
      name: 'Memory Context Enricher',
      version: '1.0.0',
      description: 'Enriches context with relevant memories and historical patterns',
      author: 'SYMindX',
      tags: ['memory', 'history', 'patterns'],
    },
    defaultConfig: {
      enabled: true,
      priority: EnrichmentPriority.HIGH,
      stage: EnrichmentStage.CORE_ENRICHMENT,
      timeout: 2000,
      maxRetries: 3,
      cacheEnabled: true,
      cacheTtl: 300,
      dependsOn: [],
    },
    registeredAt: new Date(),
  };
}

/**
 * Create registry entry for Environment Context Enricher
 */
export function createEnvironmentEnricherRegistryEntry(
  agentProvider: () => Agent | null,
  config?: Partial<EnvironmentEnricherConfig>
): EnricherRegistryEntry {
  const factory: EnricherFactory = async () => {
    const enricher = createEnvironmentContextEnricher(agentProvider, config);
    return enricher;
  };

  return {
    id: 'environment-context-enricher',
    factory,
    metadata: {
      name: 'Environment Context Enricher',
      version: '1.0.0',
      description: 'Enriches context with system environment and runtime information',
      author: 'SYMindX',
      tags: ['environment', 'system', 'runtime'],
    },
    defaultConfig: {
      enabled: true,
      priority: EnrichmentPriority.MEDIUM,
      stage: EnrichmentStage.PRE_PROCESSING,
      timeout: 1000,
      maxRetries: 2,
      cacheEnabled: true,
      cacheTtl: 60,
      dependsOn: [],
    },
    registeredAt: new Date(),
  };
}

/**
 * Create registry entry for Emotional Context Enricher
 */
export function createEmotionalEnricherRegistryEntry(
  emotionProvider: () => EmotionModule | null,
  config?: Partial<EmotionalEnricherConfig>
): EnricherRegistryEntry {
  const factory: EnricherFactory = async () => {
    const enricher = createEmotionalContextEnricher(emotionProvider, config);
    return enricher;
  };

  return {
    id: 'emotional-context-enricher',
    factory,
    metadata: {
      name: 'Emotional Context Enricher',
      version: '1.0.0',
      description: 'Enriches context with emotional state and emotional insights',
      author: 'SYMindX',
      tags: ['emotion', 'mood', 'feelings'],
    },
    defaultConfig: {
      enabled: true,
      priority: EnrichmentPriority.HIGH,
      stage: EnrichmentStage.CORE_ENRICHMENT,
      timeout: 1500,
      maxRetries: 2,
      cacheEnabled: true,
      cacheTtl: 30,
      dependsOn: [],
    },
    registeredAt: new Date(),
  };
}

/**
 * Create registry entry for Social Context Enricher
 */
export function createSocialEnricherRegistryEntry(
  memoryProvider: MemoryProvider,
  config?: Partial<SocialEnricherConfig>
): EnricherRegistryEntry {
  const factory: EnricherFactory = async () => {
    const enricher = createSocialContextEnricher(memoryProvider, config);
    return enricher;
  };

  return {
    id: 'social-context-enricher',
    factory,
    metadata: {
      name: 'Social Context Enricher',
      version: '1.0.0',
      description: 'Enriches context with social relationships and interaction patterns',
      author: 'SYMindX',
      tags: ['social', 'relationships', 'interactions'],
    },
    defaultConfig: {
      enabled: true,
      priority: EnrichmentPriority.MEDIUM,
      stage: EnrichmentStage.CORE_ENRICHMENT,
      timeout: 2500,
      maxRetries: 3,
      cacheEnabled: true,
      cacheTtl: 120,
      dependsOn: [],
    },
    registeredAt: new Date(),
  };
}

/**
 * Create registry entry for Temporal Context Enricher
 */
export function createTemporalEnricherRegistryEntry(
  config?: Partial<TemporalEnricherConfig>
): EnricherRegistryEntry {
  const factory: EnricherFactory = async () => {
    const enricher = createTemporalContextEnricher(config);
    return enricher;
  };

  return {
    id: 'temporal-context-enricher',
    factory,
    metadata: {
      name: 'Temporal Context Enricher',
      version: '1.0.0',
      description: 'Enriches context with temporal information and time-based patterns',
      author: 'SYMindX',
      tags: ['time', 'temporal', 'chronological'],
    },
    defaultConfig: {
      enabled: true,
      priority: EnrichmentPriority.LOW,
      stage: EnrichmentStage.PRE_PROCESSING,
      timeout: 500,
      maxRetries: 2,
      cacheEnabled: true,
      cacheTtl: 30,
      dependsOn: [],
    },
    registeredAt: new Date(),
  };
}

/**
 * Get all default enricher registry entries
 * 
 * This function creates all standard enrichers with their default configurations.
 * You'll need to provide the required dependencies (memoryProvider, agentProvider, etc.)
 */
export function getAllDefaultEnricherEntries(dependencies: {
  memoryProvider?: MemoryProvider;
  agentProvider?: () => Agent | null;
  emotionProvider?: () => EmotionModule | null;
}): EnricherRegistryEntry[] {
  const entries: EnricherRegistryEntry[] = [];

  // Always include temporal enricher (no dependencies)
  entries.push(createTemporalEnricherRegistryEntry());

  // Add environment enricher if agent provider available
  if (dependencies.agentProvider) {
    entries.push(createEnvironmentEnricherRegistryEntry(dependencies.agentProvider));
  }

  // Add memory-based enrichers if memory provider available
  if (dependencies.memoryProvider) {
    entries.push(createMemoryEnricherRegistryEntry(dependencies.memoryProvider));
    entries.push(createSocialEnricherRegistryEntry(dependencies.memoryProvider));
  }

  // Add emotional enricher if emotion provider available
  if (dependencies.emotionProvider) {
    entries.push(createEmotionalEnricherRegistryEntry(dependencies.emotionProvider));
  }

  return entries;
}

/**
 * Configuration helper for all enrichers
 */
export interface AllEnrichersConfig {
  memory?: Partial<MemoryEnricherConfig>;
  environment?: Partial<EnvironmentEnricherConfig>;
  emotional?: Partial<EmotionalEnricherConfig>;
  social?: Partial<SocialEnricherConfig>;
  temporal?: Partial<TemporalEnricherConfig>;
}

/**
 * Create all enricher registry entries with custom configuration
 */
export function createAllEnricherEntries(
  dependencies: {
    memoryProvider?: MemoryProvider;
    agentProvider?: () => Agent | null;
    emotionProvider?: () => EmotionModule | null;
  },
  config: AllEnrichersConfig = {}
): EnricherRegistryEntry[] {
  const entries: EnricherRegistryEntry[] = [];

  // Temporal enricher (always available)
  entries.push(createTemporalEnricherRegistryEntry(config.temporal));

  // Environment enricher
  if (dependencies.agentProvider) {
    entries.push(createEnvironmentEnricherRegistryEntry(
      dependencies.agentProvider,
      config.environment
    ));
  }

  // Memory-based enrichers
  if (dependencies.memoryProvider) {
    entries.push(createMemoryEnricherRegistryEntry(
      dependencies.memoryProvider,
      config.memory
    ));
    entries.push(createSocialEnricherRegistryEntry(
      dependencies.memoryProvider,
      config.social
    ));
  }

  // Emotional enricher
  if (dependencies.emotionProvider) {
    entries.push(createEmotionalEnricherRegistryEntry(
      dependencies.emotionProvider,
      config.emotional
    ));
  }

  return entries;
}