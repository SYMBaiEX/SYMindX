/**
 * Base Extension Class
 *
 * Provides common functionality and patterns for all SYMindX extensions
 */

import { EventEmitter } from 'events';

import {
  Extension,
  ExtensionType,
  ExtensionStatus,
  Agent,
  ExtensionAction,
  ExtensionEventHandler,
  AgentEvent,
} from '../types/agent';
import { ExtensionConfig } from '../types/common';
import { runtimeLogger } from '../utils/logger';

export interface ExtensionMetrics {
  startTime: Date;
  requestCount: number;
  errorCount: number;
  successCount: number;
  lastActivity: Date;
  averageResponseTime: number;
  totalResponseTime: number;
}

export interface ExtensionHealthInfo {
  healthy: boolean;
  status: ExtensionStatus;
  uptime: number;
  metrics: ExtensionMetrics;
  lastError?: Error;
  dependencies?: Record<string, boolean>;
}

export abstract class BaseExtension extends EventEmitter implements Extension {
  public readonly id: string;
  public readonly name: string;
  public readonly version: string;
  public readonly type: ExtensionType;
  public enabled: boolean;
  public status: ExtensionStatus;
  public config: ExtensionConfig;
  public actions: Record<string, ExtensionAction> = {};
  public events: Record<string, ExtensionEventHandler> = {};

  protected agent?: Agent;
  protected metrics: ExtensionMetrics;
  protected healthInfo: ExtensionHealthInfo;
  protected initializationPromise?: Promise<void>;
  protected shutdownPromise?: Promise<void>;
  protected retryCount = 0;
  protected maxRetries = 3;
  protected retryDelay = 1000;

  constructor(
    id: string,
    name: string,
    version: string,
    type: ExtensionType,
    config: ExtensionConfig
  ) {
    super();

    this.id = id;
    this.name = name;
    this.version = version;
    this.type = type;
    this.enabled = config.enabled;
    this.status = ExtensionStatus.DISABLED;
    this.config = config;

    this.metrics = {
      startTime: new Date(),
      requestCount: 0,
      errorCount: 0,
      successCount: 0,
      lastActivity: new Date(),
      averageResponseTime: 0,
      totalResponseTime: 0,
    };

    this.healthInfo = {
      healthy: true,
      status: this.status,
      uptime: 0,
      metrics: this.metrics,
    };

    this.setupEventHandlers();
  }

  /**
   * Initialize the extension
   */
  async init(agent: Agent): Promise<void> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.performInitialization(agent);
    return this.initializationPromise;
  }

  /**
   * Perform the actual initialization
   */
  private async performInitialization(agent: Agent): Promise<void> {
    try {
      this.agent = agent;
      this.status = ExtensionStatus.INITIALIZING;

      runtimeLogger.info(`Initializing extension: ${this.name}`, {
        source: `extension:${this.id}`,
        agentId: agent.id,
        metadata: {
          source: `extension:${this.id}`,
          version: this.version,
        },
      });

      // Check dependencies
      await this.checkDependencies();

      // Perform extension-specific initialization
      await this.onInitialize(agent);

      this.status = ExtensionStatus.ACTIVE;
      this.healthInfo.healthy = true;
      this.healthInfo.status = this.status;
      this.retryCount = 0;

      runtimeLogger.info(`Extension initialized successfully: ${this.name}`, {
        source: `extension:${this.id}`,
        agentId: agent.id,
      });

      this.emit('initialized', { extensionId: this.id, agentId: agent.id });
    } catch (error) {
      void error;
      this.status = ExtensionStatus.ERROR;
      this.healthInfo.healthy = false;
      this.healthInfo.lastError = error as Error;
      this.metrics.errorCount++;

      runtimeLogger.error(`Failed to initialize extension: ${this.name}`, {
        source: `extension:${this.id}`,
        error: error instanceof Error ? error.message : String(error),
      });

      this.emit('error', { extensionId: this.id, error });
      throw error;
    }
  }

  /**
   * Tick method called periodically
   */
  async tick(agent: Agent): Promise<void> {
    if (this.status !== ExtensionStatus.ACTIVE) {
      return;
    }

    try {
      this.metrics.lastActivity = new Date();
      this.updateHealthInfo();

      await this.onTick(agent);
    } catch (error) {
      void error;
      this.metrics.errorCount++;
      this.healthInfo.lastError = error as Error;

      runtimeLogger.error(`Extension tick error: ${this.name}`, {
        source: `extension:${this.id}`,
        error: error instanceof Error ? error.message : String(error),
      });

      this.emit('error', { extensionId: this.id, error });
    }
  }

  /**
   * Start the extension
   */
  async start(): Promise<void> {
    if (this.status === ExtensionStatus.ACTIVE) {
      return;
    }

    try {
      this.status = ExtensionStatus.STARTING;
      await this.onStart();
      this.status = ExtensionStatus.ACTIVE;
      this.healthInfo.healthy = true;
      this.healthInfo.status = this.status;

      runtimeLogger.info(`Extension started: ${this.name}`, {
        source: `extension:${this.id}`,
      });

      this.emit('started', { extensionId: this.id });
    } catch (error) {
      void error;
      this.status = ExtensionStatus.ERROR;
      this.healthInfo.healthy = false;
      this.healthInfo.lastError = error as Error;
      this.metrics.errorCount++;

      runtimeLogger.error(`Failed to start extension: ${this.name}`, {
        source: `extension:${this.id}`,
        error: error instanceof Error ? error.message : String(error),
      });

      this.emit('error', { extensionId: this.id, error });
      throw error;
    }
  }

  /**
   * Stop the extension
   */
  async stop(): Promise<void> {
    if (this.status === ExtensionStatus.DISABLED) {
      return;
    }

    if (this.shutdownPromise) {
      return this.shutdownPromise;
    }

    this.shutdownPromise = this.performShutdown();
    return this.shutdownPromise;
  }

  /**
   * Perform the actual shutdown
   */
  private async performShutdown(): Promise<void> {
    try {
      this.status = ExtensionStatus.STOPPING;

      runtimeLogger.info(`Stopping extension: ${this.name}`, {
        source: `extension:${this.id}`,
      });

      await this.onStop();

      this.status = ExtensionStatus.DISABLED;
      this.healthInfo.status = this.status;

      runtimeLogger.info(`Extension stopped: ${this.name}`, {
        source: `extension:${this.id}`,
      });

      this.emit('stopped', { extensionId: this.id });
    } catch (error) {
      void error;
      this.status = ExtensionStatus.ERROR;
      this.healthInfo.healthy = false;
      this.healthInfo.lastError = error as Error;
      this.metrics.errorCount++;

      runtimeLogger.error(`Failed to stop extension: ${this.name}`, {
        source: `extension:${this.id}`,
        error: error instanceof Error ? error.message : String(error),
      });

      this.emit('error', { extensionId: this.id, error });
      throw error;
    }
  }

  /**
   * Handle agent events
   */
  async handleEvent(event: AgentEvent): Promise<void> {
    if (this.status !== ExtensionStatus.ACTIVE) {
      return;
    }

    try {
      await this.onEvent(event);
    } catch (error) {
      void error;
      this.metrics.errorCount++;
      this.healthInfo.lastError = error as Error;

      runtimeLogger.error(`Extension event handling error: ${this.name}`, {
        source: `extension:${this.id}`,
        eventType: event.type,
        error: error instanceof Error ? error.message : String(error),
      });

      this.emit('error', { extensionId: this.id, error });
    }
  }

  /**
   * Get extension health information
   */
  getHealth(): ExtensionHealthInfo {
    this.updateHealthInfo();
    return { ...this.healthInfo };
  }

  /**
   * Get extension metrics
   */
  getMetrics(): ExtensionMetrics {
    return { ...this.metrics };
  }

  /**
   * Execute an action with metrics tracking
   */
  protected async executeAction<T>(
    actionName: string,
    action: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();

    try {
      this.metrics.requestCount++;
      const result = await action();

      const duration = Date.now() - startTime;
      this.metrics.totalResponseTime += duration;
      this.metrics.averageResponseTime =
        this.metrics.totalResponseTime / this.metrics.requestCount;
      this.metrics.successCount++;
      this.metrics.lastActivity = new Date();

      return result;
    } catch (error) {
      void error;
      this.metrics.errorCount++;
      this.healthInfo.lastError = error as Error;

      runtimeLogger.error(
        `Extension action failed: ${this.name}.${actionName}`,
        {
          source: `extension:${this.id}`,
          actionName,
          error: error instanceof Error ? error.message : String(error),
        }
      );

      throw error;
    }
  }

  /**
   * Retry failed operations
   */
  protected async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = this.maxRetries,
    delay: number = this.retryDelay
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        void error;
        lastError = error as Error;

        if (i === maxRetries) {
          break;
        }

        runtimeLogger.warn(
          `Extension operation failed, retrying: ${this.name}`,
          {
            source: `extension:${this.id}`,
            metadata: {
              attempt: i + 1,
              maxRetries,
            },
            error: {
              code: error instanceof Error ? error.name : 'UnknownError',
              message: error instanceof Error ? error.message : String(error),
              ...(error instanceof Error && error.stack
                ? { stack: error.stack }
                : {}),
              ...(error instanceof Error && error.cause !== undefined
                ? { cause: error.cause }
                : {}),
            },
          }
        );

        await new Promise((resolve) =>
          setTimeout(resolve, delay * Math.pow(2, i))
        );
      }
    }

    throw lastError;
  }

  /**
   * Update health information
   */
  private updateHealthInfo(): void {
    this.healthInfo.uptime = Date.now() - this.metrics.startTime.getTime();
    this.healthInfo.metrics = { ...this.metrics };
    this.healthInfo.status = this.status;

    // Determine health based on error rate and status
    const errorRate =
      this.metrics.requestCount > 0
        ? this.metrics.errorCount / this.metrics.requestCount
        : 0;

    this.healthInfo.healthy =
      this.status === ExtensionStatus.ACTIVE &&
      errorRate < 0.1 && // Less than 10% error rate
      !this.healthInfo.lastError;
  }

  /**
   * Check extension dependencies
   */
  private async checkDependencies(): Promise<void> {
    if (!this.config.dependencies || this.config.dependencies.length === 0) {
      return;
    }

    const dependencyStatus: Record<string, boolean> = {};

    for (const dependency of this.config.dependencies) {
      try {
        const available = await this.checkDependency(dependency);
        dependencyStatus[dependency] = available;

        if (!available) {
          throw new Error(`Dependency ${dependency} is not available`);
        }
      } catch (error) {
        void error;
        dependencyStatus[dependency] = false;
        throw new Error(`Failed to check dependency ${dependency}: ${error}`);
      }
    }

    this.healthInfo.dependencies = dependencyStatus;
  }

  /**
   * Check a specific dependency
   */
  protected async checkDependency(dependency: string): Promise<boolean> {
    // Override in subclasses to implement dependency checking
    // Base implementation logs the dependency check for debugging
    runtimeLogger.debug(`Checking dependency: ${dependency}`);
    return true;
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.on('error', (error) => {
      this.healthInfo.healthy = false;
      this.healthInfo.lastError = error.error;
    });

    this.on('started', () => {
      this.healthInfo.healthy = true;
      this.healthInfo.status = ExtensionStatus.ACTIVE;
    });

    this.on('stopped', () => {
      this.healthInfo.status = ExtensionStatus.DISABLED;
    });
  }

  // Abstract methods that subclasses must implement
  protected abstract onInitialize(agent: Agent): Promise<void>;
  protected abstract onStart(): Promise<void>;
  protected abstract onStop(): Promise<void>;
  protected abstract onTick(agent: Agent): Promise<void>;
  protected abstract onEvent(event: AgentEvent): Promise<void>;
}

export default BaseExtension;
