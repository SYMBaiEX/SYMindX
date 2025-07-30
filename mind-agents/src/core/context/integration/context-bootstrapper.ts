/**
 * Context Bootstrapper
 *
 * Initializes and manages the unified context system within the runtime.
 * Handles startup, configuration, and lifecycle management of context components.
 */

import { Agent, AgentConfig, RuntimeConfig } from '../../../types/agent';
import { runtimeLogger } from '../../../utils/logger';
import { ContextManager, ContextManagerConfig } from '../../context-manager';
import {
  RuntimeContextAdapter,
  RuntimeContextAdapterConfig,
} from './runtime-context-adapter';

/**
 * Context bootstrapper configuration
 */
export interface ContextBootstrapperConfig {
  // Core system settings
  enableUnifiedContext: boolean;

  // Component configurations
  contextManager?: ContextManagerConfig;
  runtimeAdapter?: RuntimeContextAdapterConfig;

  // Initialization settings
  initializationTimeoutMs: number;

  // Health checking
  enableHealthChecks: boolean;
  healthCheckIntervalMs: number;

  // Performance monitoring
  enablePerformanceMonitoring: boolean;
  performanceMetricsIntervalMs: number;
}

/**
 * Context system status
 */
export interface ContextSystemStatus {
  initialized: boolean;
  healthy: boolean;
  components: {
    contextManager: boolean;
    runtimeAdapter: boolean;
  };
  statistics: {
    totalAgents: number;
  };
  errors: string[];
  warnings: string[];
}

/**
 * Initialization result
 */
export interface InitializationResult {
  success: boolean;
  message: string;
  timestamp: Date;
  duration_ms: number;
  components_initialized: string[];
  components_failed: string[];
  warnings: string[];
}

/**
 * Context Bootstrapper class
 */
export class ContextBootstrapper {
  private config: ContextBootstrapperConfig;
  private initialized = false;
  private healthy = false;

  // Core components
  private contextManager?: ContextManager;
  private runtimeAdapter?: RuntimeContextAdapter;

  // System state
  private agents = new Map<string, Agent>();
  private errors: string[] = [];
  private warnings: string[] = [];

  // Timers
  private healthCheckTimer?: ReturnType<typeof setInterval>;
  private performanceTimer?: ReturnType<typeof setInterval>;

  constructor(config: Partial<ContextBootstrapperConfig> = {}) {
    this.config = {
      enableUnifiedContext: true,
      initializationTimeoutMs: 30000,
      enableHealthChecks: true,
      healthCheckIntervalMs: 60000,
      enablePerformanceMonitoring: true,
      performanceMetricsIntervalMs: 300000,
      ...config,
    };
  }

  /**
   * Initialize the context system
   */
  async initialize(
    runtimeConfig: RuntimeConfig
  ): Promise<InitializationResult> {
    const startTime = Date.now();
    const componentsInitialized: string[] = [];
    const componentsFailed: string[] = [];
    const warnings: string[] = [];

    try {
      runtimeLogger.info('Initializing unified context system...', {
        config: this.config,
      });

      // Initialize context manager
      if (this.config.enableUnifiedContext) {
        try {
          this.contextManager = new ContextManager(this.config.contextManager);
          componentsInitialized.push('contextManager');
          runtimeLogger.debug('Context manager initialized');
        } catch (error) {
          componentsFailed.push('contextManager');
          this.errors.push(
            `Context manager initialization failed: ${(error as Error).message}`
          );
          runtimeLogger.error(
            'Failed to initialize context manager',
            error as Error
          );
        }
      }

      // Initialize runtime adapter
      if (this.contextManager && this.config.enableUnifiedContext) {
        try {
          this.runtimeAdapter = new RuntimeContextAdapter(
            this.contextManager,
            this.config.runtimeAdapter
          );
          componentsInitialized.push('runtimeAdapter');
          runtimeLogger.debug('Runtime adapter initialized');
        } catch (error) {
          componentsFailed.push('runtimeAdapter');
          this.errors.push(
            `Runtime adapter initialization failed: ${(error as Error).message}`
          );
          runtimeLogger.error(
            'Failed to initialize runtime adapter',
            error as Error
          );
        }
      }

      // Check if minimum components are available
      const criticalComponents = ['contextManager', 'runtimeAdapter'];
      const missingCritical = criticalComponents.filter(
        (comp) => !componentsInitialized.includes(comp)
      );

      if (missingCritical.length > 0) {
        throw new Error(
          `Critical components failed to initialize: ${missingCritical.join(', ')}`
        );
      }

      // Start health checks
      if (this.config.enableHealthChecks) {
        this.startHealthChecks();
      }

      // Start performance monitoring
      if (this.config.enablePerformanceMonitoring) {
        this.startPerformanceMonitoring();
      }

      this.initialized = true;
      this.healthy = true;
      this.warnings = warnings;

      const duration = Date.now() - startTime;

      const result: InitializationResult = {
        success: true,
        message: 'Context system initialized successfully',
        timestamp: new Date(),
        duration_ms: duration,
        components_initialized: componentsInitialized,
        components_failed: componentsFailed,
        warnings,
      };

      runtimeLogger.info('Context system initialization completed', {
        duration_ms: duration,
        components: componentsInitialized,
        warnings: warnings.length,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.errors.push(`Initialization failed: ${errorMessage}`);
      this.initialized = false;
      this.healthy = false;

      const result: InitializationResult = {
        success: false,
        message: errorMessage,
        timestamp: new Date(),
        duration_ms: duration,
        components_initialized: componentsInitialized,
        components_failed: componentsFailed,
        warnings,
      };

      runtimeLogger.error(
        'Context system initialization failed',
        error as Error,
        {
          duration_ms: duration,
        }
      );

      return result;
    }
  }

  /**
   * Register an agent with the context system
   */
  async registerAgent(agent: Agent): Promise<void> {
    if (!this.initialized || !this.contextManager || !this.runtimeAdapter) {
      throw new Error('Context system not initialized');
    }

    this.agents.set(agent.id, agent);

    // Initialize context for the agent
    try {
      // Create initial conversation context if needed
      const existingContext = this.contextManager.getActiveContext(agent.id);
      if (!existingContext) {
        this.contextManager.getOrCreateContext(
          agent.id,
          'system',
          'Agent initialized'
        );
      }

      runtimeLogger.debug(
        `Agent registered with context system: ${agent.name}`,
        {
          agentId: agent.id,
        }
      );
    } catch (error) {
      runtimeLogger.error(
        `Failed to register agent with context system: ${agent.name}`,
        error as Error,
        { agentId: agent.id }
      );
      throw error;
    }
  }

  /**
   * Unregister an agent from the context system
   */
  async unregisterAgent(agentId: string): Promise<void> {
    if (!this.initialized || !this.runtimeAdapter) {
      return;
    }

    const agent = this.agents.get(agentId);
    if (!agent) {
      return;
    }

    try {
      // Clear context data
      this.runtimeAdapter.clearContext(agentId);

      this.agents.delete(agentId);

      runtimeLogger.debug(`Agent unregistered from context system: ${agentId}`);
    } catch (error) {
      runtimeLogger.error(
        `Failed to unregister agent from context system: ${agentId}`,
        error as Error
      );
    }
  }

  /**
   * Get the context system for agent processing
   */
  getContextSystem(): {
    contextManager: ContextManager;
    runtimeAdapter: RuntimeContextAdapter;
  } | null {
    if (!this.initialized || !this.contextManager || !this.runtimeAdapter) {
      return null;
    }

    return {
      contextManager: this.contextManager,
      runtimeAdapter: this.runtimeAdapter,
    };
  }

  /**
   * Get system status
   */
  getStatus(): ContextSystemStatus {
    return {
      initialized: this.initialized,
      healthy: this.healthy,
      components: {
        contextManager: !!this.contextManager,
        runtimeAdapter: !!this.runtimeAdapter,
      },
      statistics: {
        totalAgents: this.agents.size,
      },
      errors: [...this.errors],
      warnings: [...this.warnings],
    };
  }

  /**
   * Shutdown the context system
   */
  async shutdown(): Promise<void> {
    runtimeLogger.info('Shutting down context system...');

    // Stop timers
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }

    if (this.performanceTimer) {
      clearInterval(this.performanceTimer);
      this.performanceTimer = undefined;
    }

    // Clear agent contexts
    for (const agentId of this.agents.keys()) {
      await this.unregisterAgent(agentId);
    }

    // Reset state
    this.initialized = false;
    this.healthy = false;
    this.contextManager = undefined;
    this.runtimeAdapter = undefined;
    this.agents.clear();
    this.errors = [];
    this.warnings = [];

    runtimeLogger.info('Context system shutdown completed');
  }

  // Private methods

  private startHealthChecks(): void {
    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckIntervalMs);
  }

  private startPerformanceMonitoring(): void {
    this.performanceTimer = setInterval(() => {
      this.collectPerformanceMetrics();
    }, this.config.performanceMetricsIntervalMs);
  }

  private performHealthCheck(): void {
    let healthy = true;
    const errors: string[] = [];

    try {
      // Check context manager
      if (this.contextManager) {
        const contexts = this.contextManager.exportContexts();
        if (contexts.length > 10000) {
          // Warn if too many contexts
          this.warnings.push('High number of active contexts detected');
        }
      } else if (this.config.enableUnifiedContext) {
        healthy = false;
        errors.push('Context manager is not available');
      }

      // Check runtime adapter
      if (!this.runtimeAdapter && this.config.enableUnifiedContext) {
        healthy = false;
        errors.push('Runtime adapter is not available');
      }

      this.healthy = healthy;

      if (errors.length > 0) {
        this.errors.push(...errors);
        runtimeLogger.warn('Context system health check failed', { errors });
      }
    } catch (error) {
      this.healthy = false;
      const errorMessage = `Health check failed: ${(error as Error).message}`;
      this.errors.push(errorMessage);
      runtimeLogger.error('Context system health check error', error as Error);
    }
  }

  private collectPerformanceMetrics(): void {
    try {
      // Collect performance metrics from the context system
      if (this.contextManager) {
        const contexts = this.contextManager.exportContexts();
        runtimeLogger.debug('Context system performance metrics', {
          activeContexts: contexts.length,
          totalAgents: this.agents.size,
        });
      }
    } catch (error) {
      runtimeLogger.error(
        'Failed to collect performance metrics',
        error as Error
      );
    }
  }
}

/**
 * Factory function to create context bootstrapper
 */
export function createContextBootstrapper(
  config?: Partial<ContextBootstrapperConfig>
): ContextBootstrapper {
  return new ContextBootstrapper(config);
}
