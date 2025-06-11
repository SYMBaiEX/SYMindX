/**
 * Sample Extension Plugin
 * 
 * Demonstrates how to create a dynamic plugin for the SYMindX runtime.
 */

import {
  Extension,
  ExtensionContext,
  ExtensionType,
  ActionResult,
  ExtensionAction,
  ActionResultType,
  ExtensionStatus
} from '../../src/types/agent.js';
import { Logger } from '../../src/utils/logger.js';

/**
 * Sample Extension Configuration
 */
export interface SampleExtensionConfig {
  enabled: boolean;
  message?: string;
  interval?: number;
}

/**
 * Sample Extension Implementation
 * 
 * This extension demonstrates:
 * - Basic extension lifecycle
 * - Action registration
 * - Configuration handling
 * - Event emission
 */
export class SampleExtension implements Extension {
  id = 'sample-extension';
  name = 'Sample Extension';
  description = 'A sample extension demonstrating plugin capabilities';
  version = '1.0.0';
  type = ExtensionType.UTILITY;
  status = ExtensionStatus.STOPPED;
  
  private config: SampleExtensionConfig;
  private logger: Logger;
  private context: ExtensionContext;
  private intervalId?: NodeJS.Timeout;
  
  constructor(context: ExtensionContext) {
    this.context = context;
    this.logger = context.logger.child({ extension: this.id });
    this.config = context.config as SampleExtensionConfig;
  }
  
  /**
   * Initialize the extension
   */
  async init(): Promise<void> {
    try {
      this.logger.info('Initializing Sample Extension', {
        config: this.config
      });
      
      // Start periodic task if interval is configured
      if (this.config.interval && this.config.interval > 0) {
        this.intervalId = setInterval(() => {
          this.periodicTask();
        }, this.config.interval * 1000);
      }
      
      this.status = ExtensionStatus.RUNNING;
      this.logger.info('Sample Extension initialized successfully');
      
      // Emit initialization event
      await this.context.eventBus.publish({
        type: 'extension_initialized',
        source: this.id,
        data: {
          extensionId: this.id,
          config: this.config
        },
        timestamp: new Date()
      });
    } catch (error) {
      this.logger.error('Failed to initialize Sample Extension', error);
      this.status = ExtensionStatus.ERROR;
      throw error;
    }
  }
  
  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    
    this.status = ExtensionStatus.STOPPED;
    this.logger.info('Sample Extension stopped');
    
    // Emit cleanup event
    await this.context.eventBus.publish({
      type: 'extension_stopped',
      source: this.id,
      data: {
        extensionId: this.id
      },
      timestamp: new Date()
    });
  }
  
  /**
   * Periodic tick function
   */
  async tick(): Promise<void> {
    // This method is called periodically by the runtime
    // Can be used for maintenance tasks, health checks, etc.
  }
  
  /**
   * Get available actions
   */
  getActions(): Record<string, ExtensionAction> {
    return {
      'sample_hello': {
        name: 'Say Hello',
        description: 'Send a hello message',
        parameters: {
          name: {
            type: 'string',
            description: 'Name to greet',
            required: false
          }
        },
        handler: this.sayHello.bind(this)
      },
      'sample_echo': {
        name: 'Echo Message',
        description: 'Echo back a message',
        parameters: {
          message: {
            type: 'string',
            description: 'Message to echo',
            required: true
          }
        },
        handler: this.echoMessage.bind(this)
      },
      'sample_status': {
        name: 'Get Status',
        description: 'Get extension status information',
        parameters: {},
        handler: this.getStatus.bind(this)
      }
    };
  }
  
  /**
   * Say hello action
   */
  private async sayHello(params: { name?: string }): Promise<ActionResult> {
    try {
      const name = params.name || 'World';
      const message = this.config.message || `Hello, ${name}!`;
      
      this.logger.info('Saying hello', { name, message });
      
      // Emit hello event
      await this.context.eventBus.publish({
        type: 'sample_hello',
        source: this.id,
        data: {
          name,
          message
        },
        timestamp: new Date()
      });
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          message,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      this.logger.error('Failed to say hello', error);
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Echo message action
   */
  private async echoMessage(params: { message: string }): Promise<ActionResult> {
    try {
      const { message } = params;
      
      this.logger.info('Echoing message', { message });
      
      // Emit echo event
      await this.context.eventBus.publish({
        type: 'sample_echo',
        source: this.id,
        data: {
          originalMessage: message,
          echoedMessage: `Echo: ${message}`
        },
        timestamp: new Date()
      });
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          original: message,
          echo: `Echo: ${message}`,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      this.logger.error('Failed to echo message', error);
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Get status action
   */
  private async getStatus(): Promise<ActionResult> {
    try {
      const status = {
        id: this.id,
        name: this.name,
        version: this.version,
        status: this.status,
        config: this.config,
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      };
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: status
      };
    } catch (error) {
      this.logger.error('Failed to get status', error);
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Periodic task executed at configured intervals
   */
  private async periodicTask(): Promise<void> {
    try {
      this.logger.debug('Executing periodic task');
      
      // Emit periodic event
      await this.context.eventBus.publish({
        type: 'sample_periodic',
        source: this.id,
        data: {
          timestamp: new Date().toISOString(),
          uptime: process.uptime()
        },
        timestamp: new Date()
      });
    } catch (error) {
      this.logger.error('Error in periodic task', error);
    }
  }
}

/**
 * Plugin factory function
 * This is the entry point for the dynamic plugin loader
 */
export function createPlugin(context: ExtensionContext): Extension {
  return new SampleExtension(context);
}

/**
 * Plugin metadata
 * Used by the plugin loader for discovery and validation
 */
export const pluginMetadata = {
  id: 'sample-extension',
  name: 'Sample Extension',
  description: 'A sample extension demonstrating plugin capabilities',
  version: '1.0.0',
  type: ExtensionType.UTILITY,
  author: 'SYMindX Team',
  dependencies: [],
  requiredConfig: ['enabled'],
  optionalConfig: ['message', 'interval']
};