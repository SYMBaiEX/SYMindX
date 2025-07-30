/**
 * Cache Strategies - Pluggable Cache Strategy Implementations
 *
 * This module exports all available cache strategies for intelligent
 * cache management and optimization.
 */

// Strategy implementations
export { FrequencyBasedStrategy } from './frequency-based-strategy';
export { PredictiveStrategy } from './predictive-strategy';
export { ResourceAwareStrategy } from './resource-aware-strategy';
export { TTLStrategy } from './ttl-strategy';
export { PriorityStrategy } from './priority-strategy';

// Strategy factory
export { createCacheStrategy } from './strategy-factory';
