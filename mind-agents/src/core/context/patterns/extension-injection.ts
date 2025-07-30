/**
 * Extension Context Injection Patterns for SYMindX
 *
 * Provides dependency injection patterns specifically for extensions,
 * including automatic configuration injection, capability resolution,
 * and state management.
 */

import type {
  ContextProvider,
  ContextMiddleware,
  ContextEnricher,
  ContextScope,
  ContextScopeType,
  ExtensionContextInjection,
} from '../../../types/context/context-injection';
import type { OperationResult } from '../../../types/helpers';
import type { Agent } from '../../../types/agent';
import type { Extension } from '../../../types/extension';
import { runtimeLogger } from '../../../utils/logger';

/**
 * Extension configuration context provider
 * Provides extension-specific configuration data
 */
export class ExtensionConfigProvider implements ContextProvider<unknown> {
  readonly id = 'extension-config';
  readonly priority = 90;
  readonly supportsAsync = false;

  private readonly configRegistry = new Map<string, unknown>();

  provide(scope: ContextScope): unknown | undefined {
    if (scope.type !== ContextScopeType.Extension) {
      return undefined;
    }

    return this.configRegistry.get(scope.target);
  }

  canProvide(scope: ContextScope): boolean {
    return (
      scope.type === ContextScopeType.Extension &&
      this.configRegistry.has(scope.target)
    );
  }

  /**
   * Register configuration for an extension
   */
  registerConfig(extensionId: string, config: unknown): void {
    this.configRegistry.set(extensionId, config);
    runtimeLogger.debug('Extension configuration registered', { extensionId });
  }

  /**
   * Unregister configuration for an extension
   */
  unregisterConfig(extensionId: string): void {
    this.configRegistry.delete(extensionId);
    runtimeLogger.debug('Extension configuration unregistered', {
      extensionId,
    });
  }
}

/**
 * Extension capabilities context provider
 * Provides extension capability information
 */
export class ExtensionCapabilitiesProvider
  implements ContextProvider<string[]>
{
  readonly id = 'extension-capabilities';
  readonly priority = 85;
  readonly supportsAsync = false;

  private readonly capabilitiesRegistry = new Map<string, string[]>();

  provide(scope: ContextScope): string[] | undefined {
    if (scope.type !== ContextScopeType.Extension) {
      return undefined;
    }

    return this.capabilitiesRegistry.get(scope.target);
  }

  canProvide(scope: ContextScope): boolean {
    return (
      scope.type === ContextScopeType.Extension &&
      this.capabilitiesRegistry.has(scope.target)
    );
  }

  /**
   * Register capabilities for an extension
   */
  registerCapabilities(extensionId: string, capabilities: string[]): void {
    this.capabilitiesRegistry.set(extensionId, [...capabilities]);
    runtimeLogger.debug('Extension capabilities registered', {
      extensionId,
      capabilities,
    });
  }

  /**
   * Add capability to an extension
   */
  addCapability(extensionId: string, capability: string): boolean {
    const capabilities = this.capabilitiesRegistry.get(extensionId);
    if (!capabilities) {
      return false;
    }

    if (!capabilities.includes(capability)) {
      capabilities.push(capability);
      runtimeLogger.debug('Extension capability added', {
        extensionId,
        capability,
      });
    }

    return true;
  }

  /**
   * Remove capability from an extension
   */
  removeCapability(extensionId: string, capability: string): boolean {
    const capabilities = this.capabilitiesRegistry.get(extensionId);
    if (!capabilities) {
      return false;
    }

    const index = capabilities.indexOf(capability);
    if (index > -1) {
      capabilities.splice(index, 1);
      runtimeLogger.debug('Extension capability removed', {
        extensionId,
        capability,
      });
      return true;
    }

    return false;
  }
}

/**
 * Extension state context provider
 * Provides extension state information
 */
export class ExtensionStateProvider
  implements ContextProvider<Record<string, unknown>>
{
  readonly id = 'extension-state';
  readonly priority = 80;
  readonly supportsAsync = false;

  private readonly stateRegistry = new Map<string, Record<string, unknown>>();

  provide(scope: ContextScope): Record<string, unknown> | undefined {
    if (scope.type !== ContextScopeType.Extension) {
      return undefined;
    }

    return this.stateRegistry.get(scope.target);
  }

  canProvide(scope: ContextScope): boolean {
    return scope.type === ContextScopeType.Extension;
  }

  /**
   * Initialize state for an extension
   */
  initializeState(
    extensionId: string,
    initialState?: Record<string, unknown>
  ): void {
    this.stateRegistry.set(extensionId, initialState || {});
    runtimeLogger.debug('Extension state initialized', { extensionId });
  }

  /**
   * Update extension state
   */
  updateState(extensionId: string, updates: Record<string, unknown>): boolean {
    const state = this.stateRegistry.get(extensionId);
    if (!state) {
      return false;
    }

    Object.assign(state, updates);
    runtimeLogger.debug('Extension state updated', {
      extensionId,
      updates: Object.keys(updates),
    });
    return true;
  }

  /**
   * Get specific state value
   */
  getStateValue(extensionId: string, key: string): unknown {
    const state = this.stateRegistry.get(extensionId);
    return state?.[key];
  }

  /**
   * Set specific state value
   */
  setStateValue(extensionId: string, key: string, value: unknown): boolean {
    const state = this.stateRegistry.get(extensionId);
    if (!state) {
      return false;
    }

    state[key] = value;
    runtimeLogger.debug('Extension state value set', { extensionId, key });
    return true;
  }

  /**
   * Clear extension state
   */
  clearState(extensionId: string): boolean {
    const state = this.stateRegistry.get(extensionId);
    if (!state) {
      return false;
    }

    Object.keys(state).forEach((key) => delete state[key]);
    runtimeLogger.debug('Extension state cleared', { extensionId });
    return true;
  }
}

/**
 * Extension agent context provider
 * Provides associated agent information for extensions
 */
export class ExtensionAgentProvider implements ContextProvider<Agent> {
  readonly id = 'extension-agent';
  readonly priority = 75;
  readonly supportsAsync = true;

  private readonly agentAssociations = new Map<string, string>(); // extensionId -> agentId
  private agentResolver?: (agentId: string) => Promise<Agent | undefined>;

  provide(scope: ContextScope): Agent | undefined {
    // Synchronous version returns undefined - use async version
    return undefined;
  }

  async provideAsync(scope: ContextScope): Promise<Agent | undefined> {
    if (scope.type !== ContextScopeType.Extension || !this.agentResolver) {
      return undefined;
    }

    const agentId = this.agentAssociations.get(scope.target) || scope.agentId;
    if (!agentId) {
      return undefined;
    }

    try {
      return await this.agentResolver(agentId);
    } catch (error) {
      runtimeLogger.warn('Failed to resolve agent for extension', {
        extensionId: scope.target,
        agentId,
        error,
      });
      return undefined;
    }
  }

  canProvide(scope: ContextScope): boolean {
    return (
      scope.type === ContextScopeType.Extension &&
      (this.agentAssociations.has(scope.target) || !!scope.agentId)
    );
  }

  /**
   * Associate an extension with an agent
   */
  associateAgent(extensionId: string, agentId: string): void {
    this.agentAssociations.set(extensionId, agentId);
    runtimeLogger.debug('Extension associated with agent', {
      extensionId,
      agentId,
    });
  }

  /**
   * Disassociate an extension from an agent
   */
  disassociateAgent(extensionId: string): void {
    this.agentAssociations.delete(extensionId);
    runtimeLogger.debug('Extension disassociated from agent', { extensionId });
  }

  /**
   * Set agent resolver function
   */
  setAgentResolver(
    resolver: (agentId: string) => Promise<Agent | undefined>
  ): void {
    this.agentResolver = resolver;
  }
}

/**
 * Extension context enricher
 * Enriches extension context with additional metadata
 */
export class ExtensionContextEnricher
  implements ContextEnricher<ExtensionContextInjection>
{
  readonly id = 'extension-enricher';
  readonly priority = 70;

  async enrich(
    context: ExtensionContextInjection,
    scope: ContextScope
  ): Promise<ExtensionContextInjection> {
    if (scope.type !== ContextScopeType.Extension) {
      return context;
    }

    // Add enrichment metadata
    const enriched = {
      ...context,
      enrichedAt: new Date(),
      enrichedBy: this.id,
      scopeMetadata: {
        agentId: scope.agentId,
        correlationId: scope.correlationId,
        ...scope.metadata,
      },
    };

    // Add capability analysis
    if (context.capabilities && context.capabilities.length > 0) {
      enriched.capabilityAnalysis = {
        totalCapabilities: context.capabilities.length,
        categories: this.categorizeCapabilities(context.capabilities),
        primaryCapability: context.capabilities[0],
        lastUpdated: new Date(),
      };
    }

    // Add state analysis
    if (context.state) {
      enriched.stateAnalysis = {
        stateKeys: Object.keys(context.state),
        stateSize: JSON.stringify(context.state).length,
        lastModified: new Date(),
        hasComplexState: this.hasComplexState(context.state),
      };
    }

    return enriched;
  }

  shouldEnrich(scope: ContextScope): boolean {
    return scope.type === ContextScopeType.Extension;
  }

  /**
   * Categorize capabilities into groups
   */
  private categorizeCapabilities(
    capabilities: string[]
  ): Record<string, string[]> {
    const categories: Record<string, string[]> = {
      communication: [],
      data: [],
      integration: [],
      processing: [],
      other: [],
    };

    for (const capability of capabilities) {
      const lower = capability.toLowerCase();

      if (
        lower.includes('chat') ||
        lower.includes('message') ||
        lower.includes('notification')
      ) {
        categories.communication.push(capability);
      } else if (
        lower.includes('data') ||
        lower.includes('storage') ||
        lower.includes('memory')
      ) {
        categories.data.push(capability);
      } else if (
        lower.includes('api') ||
        lower.includes('webhook') ||
        lower.includes('integration')
      ) {
        categories.integration.push(capability);
      } else if (
        lower.includes('process') ||
        lower.includes('analyze') ||
        lower.includes('compute')
      ) {
        categories.processing.push(capability);
      } else {
        categories.other.push(capability);
      }
    }

    return categories;
  }

  /**
   * Check if state contains complex objects
   */
  private hasComplexState(state: Record<string, unknown>): boolean {
    return Object.values(state).some(
      (value) =>
        typeof value === 'object' && value !== null && !Array.isArray(value)
    );
  }
}

/**
 * Extension context validation middleware
 * Validates and sanitizes extension context data
 */
export class ExtensionContextValidator
  implements ContextMiddleware<ExtensionContextInjection>
{
  readonly id = 'extension-validator';
  readonly priority = 100;

  async transform(
    context: ExtensionContextInjection,
    scope: ContextScope,
    next: (
      context: ExtensionContextInjection
    ) => Promise<ExtensionContextInjection>
  ): Promise<ExtensionContextInjection> {
    // Validate required fields
    if (!context.extensionId) {
      throw new Error('Extension context must include extensionId');
    }

    // Sanitize configuration
    if (context.config && typeof context.config === 'object') {
      context.config = this.sanitizeConfig(context.config);
    }

    // Validate capabilities
    if (context.capabilities) {
      context.capabilities = this.validateCapabilities(context.capabilities);
    }

    // Sanitize state
    if (context.state) {
      context.state = this.sanitizeState(context.state);
    }

    return next(context);
  }

  shouldProcess(scope: ContextScope): boolean {
    return scope.type === ContextScopeType.Extension;
  }

  /**
   * Sanitize configuration object
   */
  private sanitizeConfig(config: unknown): unknown {
    if (typeof config !== 'object' || config === null) {
      return config;
    }

    const sanitized = { ...(config as Record<string, unknown>) };

    // Remove sensitive fields
    const sensitiveFields = [
      'password',
      'secret',
      'key',
      'token',
      'apiKey',
      'clientSecret',
    ];
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Validate and clean capabilities array
   */
  private validateCapabilities(capabilities: string[]): string[] {
    return capabilities
      .filter((cap) => typeof cap === 'string' && cap.trim().length > 0)
      .map((cap) => cap.trim().toLowerCase())
      .filter((cap, index, arr) => arr.indexOf(cap) === index); // Remove duplicates
  }

  /**
   * Sanitize state object
   */
  private sanitizeState(
    state: Record<string, unknown>
  ): Record<string, unknown> {
    const sanitized = { ...state };

    // Limit state object size (e.g., max 1MB serialized)
    const stateStr = JSON.stringify(sanitized);
    if (stateStr.length > 1024 * 1024) {
      runtimeLogger.warn('Extension state is too large, truncating', {
        size: stateStr.length,
      });

      // Keep only first-level properties that fit within limit
      const truncated: Record<string, unknown> = {};
      let currentSize = 2; // for {}

      for (const [key, value] of Object.entries(sanitized)) {
        const entrySize = JSON.stringify({ [key]: value }).length;
        if (currentSize + entrySize > 1024 * 1024) {
          break;
        }
        truncated[key] = value;
        currentSize += entrySize;
      }

      return truncated;
    }

    return sanitized;
  }
}

/**
 * Extension injection helper functions
 */
export class ExtensionInjectionHelper {
  /**
   * Create context scope for an extension
   */
  static createExtensionScope(
    extensionId: string,
    agentId?: string,
    correlationId?: string
  ): ContextScope {
    return {
      type: ContextScopeType.Extension,
      target: extensionId,
      agentId,
      correlationId,
      metadata: {
        extensionType: this.getExtensionType(extensionId),
        createdAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Create extension context injection configuration
   */
  static createExtensionContext(
    extensionId: string,
    config?: unknown,
    capabilities?: string[],
    initialState?: Record<string, unknown>
  ): ExtensionContextInjection {
    return {
      extensionId,
      config: config || {},
      capabilities: capabilities || [],
      state: initialState || {},
    };
  }

  /**
   * Inject context into an extension
   */
  static async injectExtensionContext(
    extension: Extension,
    context: ExtensionContextInjection,
    agent?: Agent
  ): Promise<Extension & { context: ExtensionContextInjection }> {
    const contextualExtension = extension as Extension & {
      context: ExtensionContextInjection;
      updateContext?: (
        updates: Partial<ExtensionContextInjection>
      ) => Promise<OperationResult>;
      getContextValue?: <K extends keyof ExtensionContextInjection>(
        key: K
      ) => ExtensionContextInjection[K];
      setContextValue?: <K extends keyof ExtensionContextInjection>(
        key: K,
        value: ExtensionContextInjection[K]
      ) => Promise<OperationResult>;
    };

    contextualExtension.context = { ...context };

    // Associate with agent if provided
    if (agent) {
      contextualExtension.context.agent = agent;
    }

    // Add context update method
    contextualExtension.updateContext = async (
      updates: Partial<ExtensionContextInjection>
    ) => {
      try {
        contextualExtension.context = {
          ...contextualExtension.context,
          ...updates,
        };
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    };

    // Add context value getter
    contextualExtension.getContextValue = <
      K extends keyof ExtensionContextInjection,
    >(
      key: K
    ) => {
      return contextualExtension.context[key];
    };

    // Add context value setter
    contextualExtension.setContextValue = async <
      K extends keyof ExtensionContextInjection,
    >(
      key: K,
      value: ExtensionContextInjection[K]
    ) => {
      try {
        contextualExtension.context[key] = value;
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    };

    return contextualExtension;
  }

  /**
   * Create extension state manager
   */
  static createExtensionStateManager(extensionId: string) {
    return {
      /**
       * Get state value
       */
      get<T = unknown>(key: string, defaultValue?: T): T | undefined {
        // Implementation would use ExtensionStateProvider
        return defaultValue;
      },

      /**
       * Set state value
       */
      async set(key: string, value: unknown): Promise<OperationResult> {
        try {
          // Implementation would use ExtensionStateProvider
          return { success: true };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      },

      /**
       * Delete state value
       */
      async delete(key: string): Promise<OperationResult> {
        try {
          // Implementation would use ExtensionStateProvider
          return { success: true };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      },

      /**
       * Clear all state
       */
      async clear(): Promise<OperationResult> {
        try {
          // Implementation would use ExtensionStateProvider
          return { success: true };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      },
    };
  }

  /**
   * Get extension type from extension ID
   */
  private static getExtensionType(extensionId: string): string {
    // Extract extension type from ID (e.g., 'api-server' -> 'api')
    const parts = extensionId.split('-');
    return parts[0] || 'unknown';
  }
}

/**
 * Export all extension injection patterns
 */
export const extensionInjectionPatterns = {
  providers: {
    config: ExtensionConfigProvider,
    capabilities: ExtensionCapabilitiesProvider,
    state: ExtensionStateProvider,
    agent: ExtensionAgentProvider,
  },
  enrichers: {
    context: ExtensionContextEnricher,
  },
  middleware: {
    validator: ExtensionContextValidator,
  },
  helpers: ExtensionInjectionHelper,
};
