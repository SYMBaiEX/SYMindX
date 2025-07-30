/**
 * BootstrapManager.ts - System bootstrapping and module loading
 *
 * This module handles:
 * - Core module registration
 * - Extension loading
 * - Portal loading
 * - Plugin system initialization
 * - Multi-agent system setup
 */

import {
  ModuleRegistry,
  EventBus,
  RuntimeConfig,
  Extension,
  Portal,
} from '../../types/index';
import { ExtensionLoader, createExtensionLoader } from '../extension-loader';
import { MultiAgentManager } from '../multi-agent-manager';
import { standardLoggers } from '../../utils/standard-logging';
import { createRuntimeError } from '../../utils/standard-errors';

// Module imports
import { registerMemoryFactories } from '../../modules/memory/index';
import { registerEmotionFactories } from '../../modules/emotion/index';
import { registerCognitionFactories } from '../../modules/cognition/index';

export class BootstrapManager {
  private logger = standardLoggers.runtime;
  private registry: ModuleRegistry;
  private eventBus: EventBus;
  private config: RuntimeConfig;
  private extensionLoader: ExtensionLoader;
  private multiAgentManager?: MultiAgentManager;

  constructor(
    registry: ModuleRegistry,
    eventBus: EventBus,
    config: RuntimeConfig
  ) {
    this.registry = registry;
    this.eventBus = eventBus;
    this.config = config;
    this.extensionLoader = createExtensionLoader();
  }

  /**
   * Bootstrap the entire system
   */
  async bootstrap(): Promise<void> {
    this.logger.start('Bootstrapping SYMindX system...');

    try {
      // Register core modules
      await this.registerCoreModules();

      // Load extensions
      await this.loadExtensions();

      // Load portals
      await this.loadPortals();

      // Initialize multi-agent system if configured
      if (this.config.multiAgent?.enabled) {
        await this.initializeMultiAgentSystem();
      }

      // Load dynamic plugins if configured
      if (this.config.plugins?.autoLoad) {
        await this.loadDynamicPlugins();
      }

      this.logger.info('System bootstrap completed successfully');
    } catch (error) {
      this.logger.error('System bootstrap failed', { error });
      throw error;
    }
  }

  /**
   * Register all core module factories
   */
  async registerCoreModules(): Promise<void> {
    this.logger.start('Registering core modules...');

    try {
      // Register memory providers
      registerMemoryFactories(this.registry);
      this.logger.debug('Memory providers registered');

      // Register emotion modules
      registerEmotionFactories(this.registry);
      this.logger.debug('Emotion modules registered');

      // Register cognition modules
      registerCognitionFactories(this.registry);
      this.logger.debug('Cognition modules registered');

      // Log registration summary
      const summary = {
        memoryProviders: this.registry.listMemoryFactories().length,
        emotionModules: this.registry.listEmotionFactories().length,
        cognitionModules: this.registry.listCognitionFactories().length,
      };

      this.logger.info('Core modules registered', summary);
    } catch (error) {
      this.logger.error('Failed to register core modules', { error });
      throw error;
    }
  }

  /**
   * Load configured extensions
   */
  async loadExtensions(): Promise<void> {
    if (!this.config.extensions) {
      this.logger.debug('No extensions configured');
      return;
    }

    this.logger.start('Loading extensions...');
    const loadedExtensions: string[] = [];
    const failedExtensions: string[] = [];

    for (const [extensionId, extensionConfig] of Object.entries(
      this.config.extensions
    )) {
      if (!extensionConfig.enabled) {
        this.logger.debug(`Extension disabled: ${extensionId}`);
        continue;
      }

      try {
        await this.loadExtension(extensionId, extensionConfig);
        loadedExtensions.push(extensionId);
      } catch (error) {
        this.logger.error(`Failed to load extension: ${extensionId}`, {
          error,
        });
        failedExtensions.push(extensionId);
      }
    }

    // Log summary
    if (loadedExtensions.length > 0) {
      this.logger.info(`Loaded ${loadedExtensions.length} extensions`, {
        loaded: loadedExtensions,
      });
    }

    if (failedExtensions.length > 0) {
      this.logger.warn(`Failed to load ${failedExtensions.length} extensions`, {
        failed: failedExtensions,
      });
    }
  }

  /**
   * Load a single extension
   */
  private async loadExtension(extensionId: string, config: any): Promise<void> {
    try {
      // Dynamic import based on extension ID
      let extension: Extension;

      switch (extensionId) {
        case 'api':
          const { createApiExtension } = await import(
            '../../extensions/api/index'
          );
          extension = createApiExtension(config);
          break;
        case 'slack':
          const { createSlackExtension } = await import(
            '../../extensions/slack/index'
          );
          extension = createSlackExtension(config);
          break;
        case 'telegram':
          const { createTelegramExtension } = await import(
            '../../extensions/telegram/index'
          );
          extension = createTelegramExtension(config);
          break;
        case 'twitter':
          const { createTwitterExtension } = await import(
            '../../extensions/twitter/index'
          );
          extension = createTwitterExtension(config);
          break;
        case 'runelite':
          const { createRuneliteExtension } = await import(
            '../../extensions/runelite/index'
          );
          extension = createRuneliteExtension(config);
          break;
        default:
          throw new Error(`Unknown extension: ${extensionId}`);
      }

      // Register with extension loader
      this.extensionLoader.registerExtension(extensionId, extension);

      // Emit extension loaded event
      this.eventBus.emit({
        type: 'extension.loaded',
        agentId: 'system',
        data: { extensionId, config },
        timestamp: new Date(),
      });

      this.logger.debug(`Extension loaded: ${extensionId}`);
    } catch (error) {
      throw createRuntimeError(
        `Failed to load extension ${extensionId}`,
        error
      );
    }
  }

  /**
   * Load configured portals
   */
  async loadPortals(): Promise<void> {
    if (!this.config.portals) {
      this.logger.debug('No portals configured');
      return;
    }

    this.logger.start('Loading AI portals...');
    const loadedPortals: string[] = [];
    const failedPortals: string[] = [];

    for (const [portalId, portalConfig] of Object.entries(
      this.config.portals
    )) {
      if (!portalConfig.enabled) {
        this.logger.debug(`Portal disabled: ${portalId}`);
        continue;
      }

      try {
        await this.loadPortal(portalId, portalConfig);
        loadedPortals.push(portalId);
      } catch (error) {
        this.logger.error(`Failed to load portal: ${portalId}`, { error });
        failedPortals.push(portalId);
      }
    }

    // Log summary
    if (loadedPortals.length > 0) {
      this.logger.info(`Loaded ${loadedPortals.length} portals`, {
        loaded: loadedPortals,
      });
    }

    if (failedPortals.length > 0) {
      this.logger.warn(`Failed to load ${failedPortals.length} portals`, {
        failed: failedPortals,
      });
    }
  }

  /**
   * Load a single portal
   */
  private async loadPortal(portalId: string, config: any): Promise<void> {
    try {
      // Dynamic import based on portal ID
      let portal: Portal;

      switch (portalId) {
        case 'groq':
          const { createGroqPortal } = await import('../../portals/groq/index');
          portal = createGroqPortal(config);
          break;
        case 'openai':
          const { createOpenAIPortal } = await import(
            '../../portals/openai/index'
          );
          portal = createOpenAIPortal(config);
          break;
        case 'anthropic':
          const { createAnthropicPortal } = await import(
            '../../portals/anthropic/index'
          );
          portal = createAnthropicPortal(config);
          break;
        case 'xai':
          const { createXAIPortal } = await import('../../portals/xai/index');
          portal = createXAIPortal(config);
          break;
        case 'google':
        case 'google-generative':
          const { createGooglePortal } = await import(
            '../../portals/google-generative/index'
          );
          portal = createGooglePortal(config);
          break;
        case 'google-vertex':
          const { createVertexPortal } = await import(
            '../../portals/google-vertex/index'
          );
          portal = createVertexPortal(config);
          break;
        case 'mistral':
          const { createMistralPortal } = await import(
            '../../portals/mistral/index'
          );
          portal = createMistralPortal(config);
          break;
        case 'cohere':
          const { createCoherePortal } = await import(
            '../../portals/cohere/index'
          );
          portal = createCoherePortal(config);
          break;
        case 'azure-openai':
          const { createAzureOpenAIPortal } = await import(
            '../../portals/azure-openai/index'
          );
          portal = createAzureOpenAIPortal(config);
          break;
        case 'ollama':
          const { createOllamaPortal } = await import(
            '../../portals/ollama/index'
          );
          portal = createOllamaPortal(config);
          break;
        case 'lmstudio':
          const { createLMStudioPortal } = await import(
            '../../portals/lmstudio/index'
          );
          portal = createLMStudioPortal(config);
          break;
        default:
          throw new Error(`Unknown portal: ${portalId}`);
      }

      // Register with registry
      this.registry.registerPortal(portalId, portal);

      // Emit portal loaded event
      this.eventBus.emit({
        type: 'portal.loaded',
        agentId: 'system',
        data: { portalId, config },
        timestamp: new Date(),
      });

      this.logger.debug(`Portal loaded: ${portalId}`);
    } catch (error) {
      throw createRuntimeError(`Failed to load portal ${portalId}`, error);
    }
  }

  /**
   * Initialize multi-agent system
   */
  private async initializeMultiAgentSystem(): Promise<void> {
    this.logger.start('Initializing multi-agent system...');

    try {
      this.multiAgentManager = new MultiAgentManager(this.eventBus);

      // Configure multi-agent settings
      if (this.config.multiAgent) {
        // Apply configuration
        // This is where you'd configure the multi-agent manager
      }

      this.logger.info('Multi-agent system initialized');
    } catch (error) {
      this.logger.error('Failed to initialize multi-agent system', { error });
      throw error;
    }
  }

  /**
   * Load dynamic plugins
   */
  private async loadDynamicPlugins(): Promise<void> {
    this.logger.start('Loading dynamic plugins...');

    try {
      const pluginIds = await this.extensionLoader.discoverPlugins();

      if (pluginIds.length === 0) {
        this.logger.debug('No dynamic plugins found');
        return;
      }

      let loadedCount = 0;
      for (const pluginId of pluginIds) {
        try {
          const loaded = await this.extensionLoader.loadPlugin(pluginId);
          if (loaded) {
            loadedCount++;
          }
        } catch (error) {
          this.logger.error(`Failed to load plugin: ${pluginId}`, { error });
        }
      }

      this.logger.info(`Loaded ${loadedCount} dynamic plugins`);
    } catch (error) {
      this.logger.error('Error loading dynamic plugins', { error });
      // Don't throw - dynamic plugins are optional
    }
  }

  /**
   * Get extension loader
   */
  getExtensionLoader(): ExtensionLoader {
    return this.extensionLoader;
  }

  /**
   * Get multi-agent manager
   */
  getMultiAgentManager(): MultiAgentManager | undefined {
    return this.multiAgentManager;
  }

  /**
   * Shutdown bootstrap systems
   */
  async shutdown(): Promise<void> {
    this.logger.start('Shutting down bootstrap systems...');

    try {
      // Shutdown multi-agent system
      if (this.multiAgentManager) {
        // Add shutdown logic if needed
      }

      // Unload extensions
      const extensionIds = this.extensionLoader.getLoadedExtensions();
      for (const extensionId of extensionIds) {
        try {
          this.extensionLoader.unloadExtension(extensionId);
        } catch (error) {
          this.logger.error(`Error unloading extension: ${extensionId}`, {
            error,
          });
        }
      }

      this.logger.info('Bootstrap systems shutdown complete');
    } catch (error) {
      this.logger.error('Error during bootstrap shutdown', { error });
      throw error;
    }
  }
}
