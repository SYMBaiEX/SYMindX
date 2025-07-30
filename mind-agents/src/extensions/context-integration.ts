/**
 * Extension Context Integration for SYMindX
 *
 * Provides utilities for integrating context awareness into extensions
 * while maintaining backward compatibility with existing implementations.
 */

import type {
  Agent,
  Extension,
  ExtensionAction,
  ExtensionEventHandler,
  AgentEvent,
  ActionResult,
  ActionStatus,
} from '../types/agent.js';
import type { Context, SkillParameters } from '../types/common.js';
import type { OperationResult } from '../types/helpers.js';
import type {
  ContextScope,
  ContextInjector,
  ExtensionContextInjection,
} from '../types/context/context-injection.js';
import { ContextScopeType } from '../types/context/context-injection.js';
import { runtimeLogger } from '../utils/logger.js';

/**
 * Configuration for extension context integration
 */
export interface ExtensionContextConfig {
  /** Whether to enable context injection for this extension */
  enableInjection: boolean;

  /** Scope type for context resolution */
  scopeType: ContextScopeType;

  /** Whether to auto-update context on agent state changes */
  autoUpdate: boolean;

  /** Whether to filter sensitive data from context */
  filterSensitive: boolean;

  /** Fields to include in context (if empty, includes all) */
  includeFields?: string[];

  /** Fields to exclude from context */
  excludeFields?: string[];

  /** Maximum context cache TTL in milliseconds */
  cacheTtl?: number;
}

/**
 * Extension context injection utilities
 */
export class ExtensionContextIntegrator {
  private contextInjector?: ContextInjector;
  private readonly extensionContextCache = new Map<
    string,
    { context: Context; timestamp: number }
  >();
  private readonly defaultConfig: ExtensionContextConfig = {
    enableInjection: true,
    scopeType: ContextScopeType.Extension,
    autoUpdate: true,
    filterSensitive: true,
    cacheTtl: 30000, // 30 seconds
  };

  constructor(contextInjector?: ContextInjector) {
    this.contextInjector = contextInjector;
  }

  /**
   * Set the context injector instance
   */
  setContextInjector(injector: ContextInjector): void {
    this.contextInjector = injector;
    runtimeLogger.debug('Context injector set for extension integrator');
  }

  /**
   * Enhance an extension with context awareness
   */
  async enhanceExtension(
    extension: Extension,
    config?: Partial<ExtensionContextConfig>
  ): Promise<Extension> {
    const contextConfig = { ...this.defaultConfig, ...config };

    // Store original methods for wrapper implementation
    const originalInit = extension.init.bind(extension);
    const originalTick = extension.tick.bind(extension);
    const originalActions = { ...extension.actions };
    const originalEvents = { ...extension.events };

    // Enhance init method
    extension.init = async (agent: Agent, context?: Context) => {
      const injectedContext = await this.injectContext(
        extension,
        agent,
        context,
        contextConfig
      );
      return originalInit(agent, injectedContext);
    };

    // Enhance tick method
    extension.tick = async (agent: Agent, context?: Context) => {
      const injectedContext = await this.injectContext(
        extension,
        agent,
        context,
        contextConfig
      );
      return originalTick(agent, injectedContext);
    };

    // Enhance actions
    for (const [actionName, action] of Object.entries(originalActions)) {
      extension.actions[actionName] = this.enhanceExtensionAction(
        action,
        extension,
        contextConfig
      );
    }

    // Enhance event handlers
    for (const [eventName, eventHandler] of Object.entries(originalEvents)) {
      extension.events[eventName] = this.enhanceExtensionEventHandler(
        eventHandler,
        extension,
        contextConfig
      );
    }

    // Enhance lifecycle methods if they exist
    if (extension.lifecycle) {
      if (extension.lifecycle.onLoad) {
        const originalOnLoad = extension.lifecycle.onLoad.bind(extension);
        extension.lifecycle.onLoad = async (context?: Context) => {
          const injectedContext = await this.createExtensionContext(
            extension,
            contextConfig
          );
          return originalOnLoad(injectedContext || context);
        };
      }

      if (extension.lifecycle.onUnload) {
        const originalOnUnload = extension.lifecycle.onUnload.bind(extension);
        extension.lifecycle.onUnload = async (context?: Context) => {
          this.clearExtensionCache(extension.id);
          return originalOnUnload(context);
        };
      }

      if (extension.lifecycle.onReload) {
        const originalOnReload = extension.lifecycle.onReload.bind(extension);
        extension.lifecycle.onReload = async (context?: Context) => {
          this.clearExtensionCache(extension.id);
          const injectedContext = await this.createExtensionContext(
            extension,
            contextConfig
          );
          return originalOnReload(injectedContext || context);
        };
      }

      if (extension.lifecycle.onError) {
        const originalOnError = extension.lifecycle.onError.bind(extension);
        extension.lifecycle.onError = async (
          error: Error,
          context?: Context
        ) => {
          const injectedContext = await this.createExtensionContext(
            extension,
            contextConfig
          );
          return originalOnError(error, injectedContext || context);
        };
      }
    }

    // Set context configuration
    (extension as any).contextConfig = contextConfig;
    (extension as any).contextScope =
      `${contextConfig.scopeType}:${extension.id}`;

    runtimeLogger.debug('Extension enhanced with context awareness', {
      extension: extension.id,
      config: contextConfig,
    });

    return extension;
  }

  /**
   * Inject context for an extension
   */
  async injectContext(
    extension: Extension,
    agent: Agent,
    providedContext?: Context,
    config?: ExtensionContextConfig
  ): Promise<Context | undefined> {
    if (!config?.enableInjection) {
      return providedContext;
    }

    try {
      // Check cache first
      const cached = this.getCachedContext(extension.id, config.cacheTtl);
      if (cached) {
        return { ...cached, ...providedContext };
      }

      // Create fresh context
      const freshContext = await this.createExtensionContext(
        extension,
        config,
        agent
      );
      if (freshContext) {
        this.cacheContext(extension.id, freshContext);
        return { ...freshContext, ...providedContext };
      }

      return providedContext;
    } catch (error) {
      runtimeLogger.warn('Failed to inject context for extension', {
        extension: extension.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return providedContext;
    }
  }

  /**
   * Create extension-specific context
   */
  private async createExtensionContext(
    extension: Extension,
    config?: ExtensionContextConfig,
    agent?: Agent
  ): Promise<Context | undefined> {
    if (!this.contextInjector || !config?.enableInjection) {
      return undefined;
    }

    try {
      const scope: ContextScope = {
        type: config.scopeType,
        target: extension.id,
        agentId: agent?.id,
        metadata: {
          extensionName: extension.name,
          extensionType: extension.type,
          extensionVersion: extension.version,
          enabled: extension.enabled,
          status: extension.status,
        },
      };

      const result =
        await this.contextInjector.inject<ExtensionContextInjection>(scope);

      if (result.success && result.context) {
        let context: Context = {
          timestamp: new Date().toISOString(),
          scope: result.scope.type,
          extensionId: extension.id,
        };

        // Add extension context data safely
        if (result.context) {
          Object.keys(result.context).forEach((key) => {
            const value = (result.context as any)[key];
            if (
              typeof value === 'string' ||
              typeof value === 'number' ||
              typeof value === 'boolean' ||
              value instanceof Date
            ) {
              context[key] = value;
            }
          });
        }

        // Apply field filtering
        context = this.filterContext(context, config);

        return context;
      }
    } catch (error) {
      runtimeLogger.warn('Failed to create extension context', {
        extension: extension.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    return undefined;
  }

  /**
   * Enhance an extension action with context injection
   */
  private enhanceExtensionAction(
    action: ExtensionAction,
    extension: Extension,
    config: ExtensionContextConfig
  ): ExtensionAction {
    const originalExecute = action.execute.bind(action);

    return {
      ...action,
      execute: async (
        agent: Agent,
        params: SkillParameters,
        context?: Context
      ): Promise<ActionResult> => {
        try {
          let enhancedContext = context;

          if (config.enableInjection) {
            const injectedContext = await this.injectContext(
              extension,
              agent,
              context,
              config
            );
            enhancedContext = injectedContext || context;
          }

          // Validate context requirements if specified
          if (action.contextRequirements) {
            const validationResult = this.validateActionContext(
              enhancedContext,
              action.contextRequirements
            );

            if (!validationResult.valid) {
              return {
                success: false,
                type: 'error' as any,
                error: `Context validation failed: ${validationResult.errors.join(', ')}`,
                timestamp: new Date(),
              };
            }
          }

          return await originalExecute(agent, params, enhancedContext);
        } catch (error) {
          runtimeLogger.error('Extension action execution failed', {
            extension: extension.id,
            action: action.name,
            error: error instanceof Error ? error.message : 'Unknown error',
          });

          return {
            success: false,
            type: 'error' as any,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date(),
          };
        }
      },
    };
  }

  /**
   * Enhance an extension event handler with context injection
   */
  private enhanceExtensionEventHandler(
    eventHandler: ExtensionEventHandler,
    extension: Extension,
    config: ExtensionContextConfig
  ): ExtensionEventHandler {
    const originalHandler = eventHandler.handler.bind(eventHandler);

    return {
      ...eventHandler,
      handler: async (
        agent: Agent,
        event: AgentEvent,
        context?: Context
      ): Promise<void> => {
        try {
          let enhancedContext = context;

          if (config.enableInjection) {
            // Create event-specific context
            let eventContext = context || {};

            if (eventHandler.contextOptions?.injectEventContext) {
              eventContext = {
                ...eventContext,
                event: {
                  id: event.id,
                  type: event.type,
                  source: event.source,
                  timestamp: event.timestamp,
                  agentId: event.agentId,
                  targetAgentId: event.targetAgentId,
                  tags: event.tags,
                  ...(eventHandler.contextOptions.preserveEventData
                    ? { data: event.data }
                    : {}),
                },
              };
            }

            if (eventHandler.contextOptions?.injectAgentContext) {
              eventContext = {
                ...eventContext,
                agent: {
                  id: agent.id,
                  name: agent.name,
                  status: agent.status,
                  lastUpdate: agent.lastUpdate,
                },
              };
            }

            const injectedContext = await this.injectContext(
              extension,
              agent,
              eventContext,
              config
            );
            enhancedContext = injectedContext || eventContext;

            // Filter sensitive data if requested
            if (eventHandler.contextOptions?.filterSensitiveData) {
              enhancedContext = this.filterSensitiveData(enhancedContext);
            }
          }

          await originalHandler(agent, event, enhancedContext);
        } catch (error) {
          runtimeLogger.error('Extension event handler execution failed', {
            extension: extension.id,
            event: eventHandler.event,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      },
    };
  }

  /**
   * Validate context against action requirements
   */
  private validateActionContext(
    context: Context | undefined,
    requirements: NonNullable<ExtensionAction['contextRequirements']>
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!context) {
      if (
        requirements.requiredFields &&
        requirements.requiredFields.length > 0
      ) {
        errors.push('Context is required but not provided');
      }
      return { valid: errors.length === 0, errors };
    }

    // Check required fields
    if (requirements.requiredFields) {
      for (const field of requirements.requiredFields) {
        if (!(field in context) || context[field] === undefined) {
          errors.push(`Required context field missing: ${field}`);
        }
      }
    }

    // Apply validation rules
    if (requirements.validationRules) {
      for (const [field, validator] of Object.entries(
        requirements.validationRules
      )) {
        if (field in context) {
          try {
            if (!validator(context[field])) {
              errors.push(`Context field validation failed: ${field}`);
            }
          } catch (error) {
            errors.push(
              `Context field validation error for ${field}: ${error}`
            );
          }
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Filter context based on configuration
   */
  private filterContext(
    context: Context,
    config: ExtensionContextConfig
  ): Context {
    let filtered = { ...context };

    // Include only specified fields
    if (config.includeFields && config.includeFields.length > 0) {
      const included: Context = {};
      for (const field of config.includeFields) {
        if (field in filtered) {
          included[field] = filtered[field];
        }
      }
      filtered = included;
    }

    // Exclude specified fields
    if (config.excludeFields && config.excludeFields.length > 0) {
      for (const field of config.excludeFields) {
        delete filtered[field];
      }
    }

    // Filter sensitive data
    if (config.filterSensitive) {
      filtered = this.filterSensitiveData(filtered);
    }

    return filtered;
  }

  /**
   * Filter sensitive data from context
   */
  private filterSensitiveData(context: Context): Context {
    const sensitiveFields = [
      'password',
      'secret',
      'key',
      'token',
      'apiKey',
      'clientSecret',
      'auth',
      'authentication',
      'authorization',
      'credentials',
    ];

    const filtered = { ...context };

    const filterObject = (obj: any, path = ''): any => {
      if (typeof obj !== 'object' || obj === null) {
        return obj;
      }

      if (Array.isArray(obj)) {
        return obj.map((item, index) =>
          filterObject(item, `${path}[${index}]`)
        );
      }

      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key;
        const keyLower = key.toLowerCase();

        if (sensitiveFields.some((field) => keyLower.includes(field))) {
          result[key] = '[REDACTED]';
        } else {
          result[key] = filterObject(value, currentPath);
        }
      }
      return result;
    };

    return filterObject(filtered);
  }

  /**
   * Get cached context for an extension
   */
  private getCachedContext(
    extensionId: string,
    cacheTtl?: number
  ): Context | undefined {
    const cached = this.extensionContextCache.get(extensionId);
    if (!cached) {
      return undefined;
    }

    const ttl = cacheTtl || this.defaultConfig.cacheTtl || 30000;
    const age = Date.now() - cached.timestamp;

    if (age > ttl) {
      this.extensionContextCache.delete(extensionId);
      return undefined;
    }

    return cached.context;
  }

  /**
   * Cache context for an extension
   */
  private cacheContext(extensionId: string, context: Context): void {
    this.extensionContextCache.set(extensionId, {
      context,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear cached context for an extension
   */
  clearExtensionCache(extensionId: string): void {
    this.extensionContextCache.delete(extensionId);
    runtimeLogger.debug('Extension context cache cleared', {
      extension: extensionId,
    });
  }

  /**
   * Clear all cached contexts
   */
  clearAllCache(): void {
    this.extensionContextCache.clear();
    runtimeLogger.debug('All extension context cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { totalEntries: number; extensionIds: string[] } {
    return {
      totalEntries: this.extensionContextCache.size,
      extensionIds: Array.from(this.extensionContextCache.keys()),
    };
  }
}

/**
 * Migration utilities for existing extensions
 */
export class ExtensionMigrationHelper {
  /**
   * Check if an extension is already context-aware
   */
  static isContextAware(extension: Extension): boolean {
    return !!(
      (extension as any).context ||
      (extension as any).contextConfig ||
      (extension as any).contextScope
    );
  }

  /**
   * Create backward-compatible wrapper for legacy extensions
   */
  static createBackwardCompatibleWrapper(extension: Extension): Extension {
    if (this.isContextAware(extension)) {
      return extension;
    }

    // Store original methods
    const originalInit = extension.init.bind(extension);
    const originalTick = extension.tick.bind(extension);

    // Create wrapper methods that ignore context parameter
    extension.init = async (agent: Agent, context?: Context) => {
      return originalInit(agent);
    };

    extension.tick = async (agent: Agent, context?: Context) => {
      return originalTick(agent);
    };

    // Wrap actions to ignore context parameter
    for (const [actionName, action] of Object.entries(extension.actions)) {
      const originalExecute = action.execute.bind(action);
      extension.actions[actionName] = {
        ...action,
        execute: async (
          agent: Agent,
          params: SkillParameters,
          context?: Context
        ): Promise<ActionResult> => {
          return originalExecute(agent, params);
        },
      };
    }

    // Wrap event handlers to ignore context parameter
    for (const [eventName, eventHandler] of Object.entries(extension.events)) {
      const originalHandler = eventHandler.handler.bind(eventHandler);
      extension.events[eventName] = {
        ...eventHandler,
        handler: async (
          agent: Agent,
          event: AgentEvent,
          context?: Context
        ): Promise<void> => {
          return originalHandler(agent, event);
        },
      };
    }

    runtimeLogger.debug('Extension wrapped for backward compatibility', {
      extension: extension.id,
    });

    return extension;
  }

  /**
   * Validate extension context compatibility
   */
  static validateContextCompatibility(extension: Extension): OperationResult {
    const errors: string[] = [];

    // Check if methods support context parameter
    try {
      // Check init method signature
      const initParams = extension.init.length;
      if (initParams < 1 || initParams > 2) {
        errors.push(
          'init method should accept (agent: Agent, context?: Context)'
        );
      }

      // Check tick method signature
      const tickParams = extension.tick.length;
      if (tickParams < 1 || tickParams > 2) {
        errors.push(
          'tick method should accept (agent: Agent, context?: Context)'
        );
      }

      // Check action execute methods
      for (const [actionName, action] of Object.entries(extension.actions)) {
        const executeParams = action.execute.length;
        if (executeParams < 2 || executeParams > 3) {
          errors.push(
            `Action ${actionName} execute method should accept (agent: Agent, params: SkillParameters, context?: Context)`
          );
        }
      }

      // Check event handlers
      for (const [eventName, eventHandler] of Object.entries(
        extension.events
      )) {
        const handlerParams = eventHandler.handler.length;
        if (handlerParams < 2 || handlerParams > 3) {
          errors.push(
            `Event handler ${eventName} should accept (agent: Agent, event: AgentEvent, context?: Context)`
          );
        }
      }
    } catch (error) {
      errors.push(`Failed to validate extension methods: ${error}`);
    }

    return {
      success: errors.length === 0,
      error: errors.length > 0 ? errors.join('; ') : undefined,
      timestamp: new Date(),
    };
  }
}

/**
 * Default extension context integrator instance
 */
export const defaultExtensionContextIntegrator =
  new ExtensionContextIntegrator();

/**
 * Helper functions for easy integration
 */

/**
 * Enhance an extension with context awareness using default settings
 */
export async function enhanceExtensionWithContext(
  extension: Extension,
  config?: Partial<ExtensionContextConfig>
): Promise<Extension> {
  return defaultExtensionContextIntegrator.enhanceExtension(extension, config);
}

/**
 * Create backward-compatible wrapper for legacy extension
 */
export function createLegacyExtensionWrapper(extension: Extension): Extension {
  return ExtensionMigrationHelper.createBackwardCompatibleWrapper(extension);
}

/**
 * Validate extension context compatibility
 */
export function validateExtensionContextCompatibility(
  extension: Extension
): OperationResult {
  return ExtensionMigrationHelper.validateContextCompatibility(extension);
}
