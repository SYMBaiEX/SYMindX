/**
 * Portal Integration
 *
 * This module provides functions to integrate portals with the SYMindX runtime.
 */

import { ModuleRegistry } from '../types/agent';
import {
  Portal,
  PortalConfig,
  PortalCapability,
  ChatGenerationOptions,
} from '../types/portal';
import { runtimeLogger } from '../utils/logger';
import { buildObject } from '../utils/type-helpers';

// import { convertUsage } from './utils'; - utility function not used in integration layer

import {
  createPortal,
  getAvailablePortals,
  getPortalDefaultConfig,
} from './index';

/**
 * Register all available portals with the runtime
 * @param registry The module registry to register portals with
 * @param apiKeys Optional map of API keys for each portal
 */
export async function registerPortals(
  registry: ModuleRegistry,
  apiKeys: Record<string, string> = {}
): Promise<void> {
  const availablePortals = getAvailablePortals();

  let registeredCount = 0;

  for (const portalName of availablePortals) {
    try {
      // Get default config and override with provided API key if available
      const defaultConfig = getPortalDefaultConfig(portalName);
      const finalApiKey =
        apiKeys[portalName] ||
        process.env[`${portalName.toUpperCase()}_API_KEY`] ||
        defaultConfig.apiKey;

      const configBuilder = buildObject<PortalConfig>({})
        .addOptional('apiKey', finalApiKey)
        .addOptional('baseUrl', defaultConfig.baseUrl)
        .addOptional('organization', defaultConfig.organization)
        .addOptional('defaultModel', defaultConfig.defaultModel)
        .addOptional('maxTokens', defaultConfig.maxTokens)
        .addOptional('temperature', defaultConfig.temperature)
        .addOptional('timeout', defaultConfig.timeout)
        .addOptional('headers', defaultConfig.headers)
        .addOptional('proxy', defaultConfig.proxy)
        .addOptional('embeddingModel', defaultConfig.embeddingModel)
        .addOptional('imageModel', defaultConfig.imageModel)
        .addOptional('vectorStore', defaultConfig.vectorStore)
        .addOptional('retryAttempts', defaultConfig.retryAttempts)
        .addOptional('retryDelay', defaultConfig.retryDelay)
        .addOptional('rateLimitBuffer', defaultConfig.rateLimitBuffer)
        .addOptional('priority', defaultConfig.priority)
        .addOptional('fallbackPortals', defaultConfig.fallbackPortals);

      const config = configBuilder.build();

      // Skip if no API key is available (silently)
      if (!config.apiKey) {
        continue;
      }

      // Create and register the portal
      const portal = createPortal(portalName, config);
      registry.registerPortal(portalName, portal);
      registeredCount++;
    } catch (error) {
      void error;
      console.warn(
        `⚠️ Failed to register portal ${portalName}:`,
        (error as Error).message
      );
    }
  }

  runtimeLogger.info(
    `🌐 AI Portals registered: ${registeredCount} active / ${availablePortals.length} available`
  );
}

/**
 * Initialize a portal for an agent
 * @param portal The portal to initialize
 * @param agent The agent to initialize the portal with
 */
export async function initializePortal(
  portal: Portal,
  agent: any
): Promise<void> {
  if (!portal.enabled) {
    try {
      await portal.init(agent);
      portal.enabled = true;
      // Portal initialized - logged by runtime
    } catch (error) {
      void error;
      console.error(
        `❌ Failed to initialize portal for ${agent.name}:`,
        (error as Error).message
      );
      throw error;
    }
  }
}

/**
 * Get a list of available portals with their capabilities
 */
export function getPortalCapabilities(): Array<{
  name: string;
  capabilities: string[];
}> {
  const availablePortals = getAvailablePortals();

  return availablePortals.map((name) => {
    try {
      const config = getPortalDefaultConfig(name);
      const portal = createPortal(name, config);

      // Get capabilities
      const capabilities = [
        portal.hasCapability(PortalCapability.TEXT_GENERATION)
          ? 'text_generation'
          : null,
        portal.hasCapability(PortalCapability.CHAT_GENERATION)
          ? 'chat_generation'
          : null,
        portal.hasCapability(PortalCapability.EMBEDDING_GENERATION)
          ? 'embedding_generation'
          : null,
        portal.hasCapability(PortalCapability.IMAGE_GENERATION)
          ? 'image_generation'
          : null,
        portal.hasCapability(PortalCapability.STREAMING) ? 'streaming' : null,
        portal.hasCapability(PortalCapability.FUNCTION_CALLING)
          ? 'function_calling'
          : null,
        portal.hasCapability(PortalCapability.VISION) ? 'vision' : null,
        portal.hasCapability(PortalCapability.AUDIO) ? 'audio' : null,
      ].filter(Boolean) as string[];

      return { name, capabilities };
    } catch {
      return { name, capabilities: [] };
    }
  });
}

/**
 * Execute a tool-based interaction with intelligent model selection
 * This function automatically selects the most appropriate model based on the task
 * @param portal The portal to use for execution
 * @param messages The conversation messages
 * @param options Optional chat generation options
 * @returns The result of the chat generation
 */
export async function executeToolInteraction(
  portal: Portal,
  messages: Array<{ role: string; content: string }>,
  options?: ChatGenerationOptions
): Promise<any> {
  // Check if the portal supports function calling
  if (!portal.hasCapability(PortalCapability.FUNCTION_CALLING)) {
    throw new Error(`Portal ${portal.name} does not support function calling`);
  }

  try {
    // The portal will automatically use the tool model if functions are provided
    const result = await portal.generateChat(messages as any, options);
    return result;
  } catch (error) {
    void error;
    console.error(`Tool interaction failed for portal ${portal.name}:`, error);
    throw error;
  }
}

/**
 * Get the recommended model configuration for a specific use case
 * @param portal The portal to get configuration for
 * @param useCase The intended use case
 * @returns Recommended model configuration
 */
export function getRecommendedModelConfig(
  portal: Portal,
  useCase: 'chat' | 'tool' | 'embedding' | 'image'
): { model?: string; temperature?: number; maxTokens?: number } {
  const config = portal.config;

  switch (useCase) {
    case 'chat':
      return {
        model: (config as any).chatModel || config.defaultModel,
        temperature: 0.7,
        maxTokens: 2000,
      };

    case 'tool':
      return {
        model: (config as any).toolModel || config.defaultModel,
        temperature: 0.3, // Lower temperature for more deterministic tool use
        maxTokens: 1000, // Usually tools need less tokens
      };

    case 'embedding':
      return {
        model: config.embeddingModel || 'text-embedding-3-large',
      };

    case 'image':
      return {
        model: config.imageModel || 'dall-e-3',
      };

    default:
      return buildObject<Record<string, any>>({})
        .addOptional('model', config.defaultModel)
        .addOptional('temperature', config.temperature)
        .addOptional('maxTokens', config.maxTokens)
        .build();
  }
}
