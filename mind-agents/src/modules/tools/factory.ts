/**
 * Tool System Factory
 *
 * Factory for creating and managing tool system instances
 */

import { BaseConfig } from '../../types/common';

import { DynamicToolSystem } from './dynamic-tool-system';

import { ToolSystem, ToolSystemConfig } from './index';

export type ToolSystemType = 'dynamic' | 'static' | 'hybrid';

export interface ToolSystemFactory {
  (config: ToolSystemConfig): ToolSystem;
}

/**
 * Available tool system factories
 */
const toolSystemFactories: Map<string, ToolSystemFactory> = new Map([
  [
    'dynamic',
    (config: ToolSystemConfig): ToolSystem => new DynamicToolSystem(config),
  ],
]);

/**
 * Register a tool system factory
 */
export function registerToolSystemFactory(
  type: string,
  factory: ToolSystemFactory
): void {
  toolSystemFactories.set(type, factory);
}

/**
 * Create a tool system instance
 */
export function createToolSystem(type: string, config: BaseConfig): ToolSystem {
  const factory = toolSystemFactories.get(type);
  if (!factory) {
    throw new Error(`Tool system factory for type '${type}' not found`);
  }

  const toolSystemConfig: ToolSystemConfig = {
    enabled: true,
    autoDiscovery: true,
    validationEnabled: true,
    executionTimeout: 30000,
    maxConcurrentExecutions: 10,
    errorHandling: {
      retryAttempts: 3,
      retryDelay: 1000,
      fallbackEnabled: true,
    },
    logging: {
      enabled: true,
      level: 'info',
      logExecutions: true,
      logErrors: true,
    },
    ...config,
  };

  return factory(toolSystemConfig);
}

/**
 * Get all available tool system types
 */
export function getAvailableToolSystems(): string[] {
  return Array.from(toolSystemFactories.keys());
}

/**
 * Default tool system factory registration
 */
export function registerDefaultToolSystems(): void {
  // Dynamic tool system is already registered above
  // Additional tool systems can be registered here
}

// Auto-register default tool systems
registerDefaultToolSystems();
