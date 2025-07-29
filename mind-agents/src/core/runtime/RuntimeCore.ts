/**
 * RuntimeCore.ts - Core initialization and lifecycle management
 * 
 * This module handles the fundamental runtime operations including:
 * - System initialization and shutdown
 * - Core lifecycle management
 * - Runtime state management
 * - Event bus coordination
 */

import {
  AgentRuntime,
  EventBus,
  ModuleRegistry,
  RuntimeConfig,
  RuntimeState,
  RuntimeStatus,
  RuntimeMetrics,
  RuntimeError,
} from '../../types/index';
import { SimpleEventBus } from '../event-bus';
import { SYMindXModuleRegistry } from '../registry';
import { standardLoggers, createStandardLoggingPatterns } from '../../utils/standard-logging';
import { runtimeLogger } from '../../utils/logger';

export class RuntimeCore {
  public eventBus: EventBus;
  public registry: ModuleRegistry;
  protected config: RuntimeConfig;
  protected isRunning = false;
  protected runtimeState: RuntimeState;
  protected tickTimer?: ReturnType<typeof setInterval>;
  
  // Standardized logging
  protected logger = standardLoggers.runtime;
  protected loggingPatterns = createStandardLoggingPatterns(this.logger);

  constructor(config: RuntimeConfig) {
    this.config = config;
    this.eventBus = new SimpleEventBus();
    this.registry = new SYMindXModuleRegistry();

    // Initialize runtime state
    this.runtimeState = {
      status: RuntimeStatus.STOPPED,
      startTime: new Date(),
      uptime: 0,
      activeAgents: 0,
      totalAgents: 0,
      metrics: this.createEmptyMetrics(),
      errors: [],
      version: '1.0.0',
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        hostname: 'localhost',
        pid: process.pid,
      },
    };
  }

  /**
   * Initialize the runtime environment
   */
  async initialize(): Promise<void> {
    this.logger.start('Initializing SYMindX Runtime Core...');

    try {
      // Load environment variables
      await this.loadEnvironmentVariables();
      
      // Initialize event bus
      this.eventBus.emit({
        type: 'runtime.initializing',
        agentId: 'system',
        data: { status: 'starting' },
        timestamp: new Date(),
      });

      this.runtimeState.status = RuntimeStatus.INITIALIZING;
      
      this.logger.info('Runtime Core initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize runtime core', { error });
      throw error;
    }
  }

  /**
   * Start the runtime
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Runtime is already running');
      return;
    }

    this.logger.start('Starting SYMindX Runtime Core...');
    
    try {
      this.isRunning = true;
      this.runtimeState.status = RuntimeStatus.RUNNING;
      this.runtimeState.startTime = new Date();

      // Start tick timer if configured
      if (this.config.tickInterval && this.config.tickInterval > 0) {
        this.startTickTimer();
      }

      // Emit runtime started event
      this.eventBus.emit({
        type: 'runtime.started',
        agentId: 'system',
        data: { 
          status: 'running',
          tickInterval: this.config.tickInterval 
        },
        timestamp: new Date(),
      });

      this.logger.info('Runtime Core started successfully');
    } catch (error) {
      this.isRunning = false;
      this.runtimeState.status = RuntimeStatus.ERROR;
      this.logger.error('Failed to start runtime core', { error });
      throw error;
    }
  }

  /**
   * Stop the runtime
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      this.logger.warn('Runtime is not running');
      return;
    }

    this.logger.start('Stopping SYMindX Runtime Core...');

    try {
      // Stop tick timer
      this.stopTickTimer();

      // Update state
      this.isRunning = false;
      this.runtimeState.status = RuntimeStatus.STOPPING;

      // Emit stopping event
      this.eventBus.emit({
        type: 'runtime.stopping',
        agentId: 'system',
        data: { status: 'stopping' },
        timestamp: new Date(),
      });

      // Final state update
      this.runtimeState.status = RuntimeStatus.STOPPED;

      // Emit stopped event
      this.eventBus.emit({
        type: 'runtime.stopped',
        agentId: 'system',
        data: { status: 'stopped' },
        timestamp: new Date(),
      });

      this.logger.info('Runtime Core stopped successfully');
    } catch (error) {
      this.runtimeState.status = RuntimeStatus.ERROR;
      this.logger.error('Error during runtime shutdown', { error });
      throw error;
    }
  }

  /**
   * Get runtime state
   */
  getState(): RuntimeState {
    // Update uptime
    if (this.runtimeState.status === RuntimeStatus.RUNNING) {
      this.runtimeState.uptime = Date.now() - this.runtimeState.startTime.getTime();
    }
    
    return { ...this.runtimeState };
  }

  /**
   * Check if runtime is running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Update runtime metrics
   */
  updateMetrics(updates: Partial<RuntimeMetrics>): void {
    this.runtimeState.metrics = {
      ...this.runtimeState.metrics,
      ...updates,
    };
  }

  /**
   * Add runtime error
   */
  addError(error: RuntimeError): void {
    this.runtimeState.errors.push(error);
    
    // Keep only recent errors (last 100)
    if (this.runtimeState.errors.length > 100) {
      this.runtimeState.errors = this.runtimeState.errors.slice(-100);
    }
  }

  /**
   * Protected tick method for subclasses to override
   */
  protected async onTick(): Promise<void> {
    // To be implemented by subclasses
  }

  /**
   * Start the tick timer
   */
  private startTickTimer(): void {
    if (this.tickTimer) {
      return;
    }

    const interval = this.config.tickInterval || 1000;
    
    this.tickTimer = setInterval(async () => {
      try {
        await this.onTick();
      } catch (error) {
        this.logger.error('Error during tick', { error });
      }
    }, interval);

    this.logger.debug(`Tick timer started with interval: ${interval}ms`);
  }

  /**
   * Stop the tick timer
   */
  private stopTickTimer(): void {
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = undefined;
      this.logger.debug('Tick timer stopped');
    }
  }

  /**
   * Load environment variables
   */
  private async loadEnvironmentVariables(): Promise<void> {
    try {
      const { configDotenv } = await import('dotenv');
      const path = await import('path');

      // Get the root directory path
      const __dirname = path.dirname(new URL(import.meta.url).pathname);
      const rootDir = path.resolve(__dirname, '../../../..');
      const envPath = path.join(rootDir, '.env');

      // Try to load .env file
      configDotenv({ path: envPath });
      this.logger.debug('Environment variables loaded');
    } catch (error) {
      // Not critical if .env doesn't exist
      this.logger.debug('No .env file found, using system environment variables');
    }
  }

  /**
   * Create empty metrics object
   */
  private createEmptyMetrics(): RuntimeMetrics {
    return {
      messagesProcessed: 0,
      actionsExecuted: 0,
      thoughtsGenerated: 0,
      memoriesCreated: 0,
      emotionChanges: 0,
      decisionssMade: 0,
      planStepsCompleted: 0,
      averageResponseTime: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      lastUpdateTime: new Date(),
    };
  }
}