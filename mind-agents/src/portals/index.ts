/**
 * Portals Index
 *
 * This file exports all portal implementations and provides a registry system
 * for managing AI provider portals in the Symindx agent framework.
 */

import { Agent } from '../types/agent';
import {
  Portal,
  PortalConfig,
  PortalCapability,
  PortalType,
  ToolEvaluationOptions,
  ToolEvaluationResult,
} from '../types/portal';
import { standardLoggers } from '../utils/standard-logging';

// Import all portal implementations from providers
export {
  OpenAIPortal,
  createOpenAIPortal,
  defaultOpenAIConfig,
  type OpenAIConfig,
} from './providers/openai/index';
export {
  GroqPortal,
  createGroqPortal,
  defaultGroqConfig,
  groqModels,
  type GroqConfig,
} from './providers/groq/index';
export {
  OpenRouterPortal,
  createOpenRouterPortal,
  defaultOpenRouterConfig,
  openRouterModels,
  type OpenRouterConfig,
} from './providers/openrouter/index';

// Import the default configs and portal creators for internal use
import { defaultGroqConfig, createGroqPortal } from './providers/groq/index';
import { defaultOpenAIConfig, createOpenAIPortal } from './providers/openai/index';
import {
  defaultOpenRouterConfig,
  createOpenRouterPortal,
} from './providers/openrouter/index';

// Export base portal from core
export { BasePortal } from './core/base-portal';

// Portal factory type
export type PortalFactory = (config: PortalConfig) => Portal;

// Portal registry for managing available portals
export class PortalRegistry {
  private static instance: PortalRegistry;
  private portals: Map<string, PortalFactory> = new Map();
  private instances: Map<string, Portal> = new Map();

  private constructor() {
    this.registerDefaultPortals();
  }

  static getInstance(): PortalRegistry {
    if (!PortalRegistry.instance) {
      PortalRegistry.instance = new PortalRegistry();
    }
    return PortalRegistry.instance;
  }

  /**
   * Register default portals
   */
  private registerDefaultPortals(): void {
    // Supported portals
    this.register('openai', createOpenAIPortal);
    this.register('groq', createGroqPortal);
    this.register('openrouter', createOpenRouterPortal);
  }

  /**
   * Register a new portal
   */
  register(name: string, factory: PortalFactory): void {
    this.portals.set(name, factory);
    // Silent registration - only log when actually used
  }

  /**
   * Create a portal instance
   */
  create(name: string, config: PortalConfig): Portal {
    const factory = this.portals.get(name);
    if (!factory) {
      throw new Error(
        `Portal '${name}' not found. Available portals: ${Array.from(this.portals.keys()).join(', ')}`
      );
    }

    const portal = factory(config);
    this.instances.set(`${name}-${Date.now()}`, portal);
    return portal;
  }

  /**
   * Get available portal names
   */
  getAvailablePortals(): string[] {
    return Array.from(this.portals.keys());
  }

  /**
   * Check if a portal is available
   */
  isAvailable(name: string): boolean {
    return this.portals.has(name);
  }

  /**
   * Get default configuration for a portal
   */
  getDefaultConfig(name: string): Partial<PortalConfig> {
    switch (name) {
      case 'openai':
        return defaultOpenAIConfig;
      case 'groq':
        return defaultGroqConfig;
      case 'openrouter':
        return defaultOpenRouterConfig;
      default:
        return {
          maxTokens: 1000,
          temperature: 0.7,
          timeout: 30000,
        };
    }
  }

  /**
   * Clear all instances (useful for cleanup)
   */
  clearInstances(): void {
    this.instances.clear();
  }
}

// Convenience functions for easy portal creation
export function createPortal(name: string, config: PortalConfig): Portal {
  const registry = PortalRegistry.getInstance();
  return registry.create(name, config);
}

export function getAvailablePortals(): string[] {
  const registry = PortalRegistry.getInstance();
  return registry.getAvailablePortals();
}

export function getAvailablePortalTypes(): string[] {
  const registry = PortalRegistry.getInstance();
  return registry.getAvailablePortals();
}

export function isPortalAvailable(name: string): boolean {
  const registry = PortalRegistry.getInstance();
  return registry.isAvailable(name);
}

export function getPortalDefaultConfig(name: string): Partial<PortalConfig> {
  const registry = PortalRegistry.getInstance();
  return registry.getDefaultConfig(name);
}

/**
 * Smart Portal Router for dual-model architecture
 * Handles routing between chat models and tool models efficiently
 */
export class PortalRouter {
  /**
   * Find the best portal for a specific capability from an agent's portals
   */
  static findPortalByCapability(
    agent: Agent,
    capability: PortalCapability
  ): Portal | undefined {
    if (!agent.portals || agent.portals.length === 0) {
      return agent.portal?.hasCapability(capability) ? agent.portal : undefined;
    }

    // Find portals with the required capability
    const capablePortals = agent.portals.filter(
      (portal) => portal.enabled && portal.hasCapability(capability)
    );

    if (capablePortals.length === 0) {
      return agent.portal?.hasCapability(capability) ? agent.portal : undefined;
    }

    // For evaluation capability, prefer faster/cheaper models
    if (capability === PortalCapability.EVALUATION) {
      return (
        capablePortals.find(
          (portal) =>
            portal.type === PortalType.GROQ || // Groq, typically faster
            (portal as any).config?.toolModel // Has dedicated tool model
        ) || capablePortals[0]
      );
    }

    // Return the first capable portal or primary portal
    return (
      capablePortals.find((portal) => (portal as any).primary) ||
      capablePortals[0]
    );
  }

  /**
   * Evaluate a task using the most appropriate portal
   * This routes to tool models automatically for cost efficiency
   */
  static async evaluateTask(
    agent: Agent,
    options: ToolEvaluationOptions
  ): Promise<ToolEvaluationResult> {
    const evaluationPortal = this.findPortalByCapability(
      agent,
      PortalCapability.EVALUATION
    );

    if (!evaluationPortal) {
      throw new Error('No portal available for task evaluation');
    }

    // Use the portal's evaluateTask method (which uses tool model internally)
    return await evaluationPortal.evaluateTask!(options);
  }

  /**
   * Determine the complexity of a request for routing decisions
   */
  static analyzeRequestComplexity(request: {
    message?: string;
    hasTools?: boolean;
    type?: string;
  }): 'simple' | 'moderate' | 'complex' {
    if (request.hasTools) return 'moderate';

    if (request.message) {
      const length = request.message.length;
      const complexity = request.message.split(' ').length;

      if (length > 1000 || complexity > 100) return 'complex';
      if (length > 300 || complexity > 50) return 'moderate';
    }

    return 'simple';
  }

  /**
   * Route a request to the appropriate model type
   * This is the core intelligence for dual-model architecture
   */
  static shouldUseToolModel(request: {
    type: 'chat' | 'action' | 'evaluation' | 'function_call';
    message?: string;
    hasTools?: boolean;
    userFacing?: boolean;
    agent?: Agent;
  }): { useToolModel: boolean; reasoning: string } {
    // Always use tool model for evaluations and background processing
    if (request.type === 'evaluation') {
      return {
        useToolModel: true,
        reasoning: 'Evaluation requests use tool model for efficiency',
      };
    }

    // Use tool model for function calls and actions
    if (request.type === 'action' || request.type === 'function_call') {
      return {
        useToolModel: true,
        reasoning: 'Actions and function calls use tool model for speed',
      };
    }

    // Use tool model if tools are involved
    if (request.hasTools) {
      return {
        useToolModel: true,
        reasoning: 'Tool usage requires tool model for processing',
      };
    }

    // Always use chat model for direct user-facing conversations
    if (request.type === 'chat' && request.userFacing !== false) {
      return {
        useToolModel: false,
        reasoning: 'User-facing chat uses chat model for quality',
      };
    }

    // Analyze complexity for edge cases
    const complexity = this.analyzeRequestComplexity(request);
    if (complexity === 'complex') {
      return {
        useToolModel: false,
        reasoning: 'Complex requests use chat model for better understanding',
      };
    }

    // Default to chat model for user interactions
    return {
      useToolModel: false,
      reasoning: 'Default to chat model for user interactions',
    };
  }

  /**
   * Get the appropriate model type for a request
   */
  static getModelType(
    agent: Agent,
    request: {
      type: 'chat' | 'action' | 'evaluation' | 'function_call';
      message?: string;
      hasTools?: boolean;
      userFacing?: boolean;
    }
  ): {
    modelType: 'chat' | 'tool';
    portal: Portal | undefined;
    reasoning: string;
  } {
    const decision = this.shouldUseToolModel(request);
    const portal = this.findPortalByCapability(
      agent,
      decision.useToolModel
        ? PortalCapability.EVALUATION
        : PortalCapability.CHAT_GENERATION
    );

    return {
      modelType: decision.useToolModel ? 'tool' : 'chat',
      portal,
      reasoning: decision.reasoning,
    };
  }
}

// Initialize skills function for agent integration
export function initializePortals(): PortalRegistry {
  const logger = standardLoggers.portal;
  logger.start('Initializing portals system');
  const registry = PortalRegistry.getInstance();
  const availablePortals = registry.getAvailablePortals();
  logger.success(
    `Portals system initialized with ${availablePortals.length} providers`,
    {
      metadata: {
        providers: availablePortals,
        portalCount: availablePortals.length,
      },
    }
  );
  return registry;
}


// Export portal types for external use
export type {
  Portal,
  PortalConfig,
  TextGenerationOptions,
  TextGenerationResult,
  ChatMessage,
  ChatGenerationOptions,
  ChatGenerationResult,
  FunctionDefinition,
  ToolEvaluationOptions,
  ToolEvaluationResult,
  PortalCapability,
} from '../types/portal';
