/**
 * Portal Context Helpers
 *
 * Utility functions for transforming context data into portal-optimized formats,
 * model selection, performance optimization, and migration support.
 */

import {
  UnifiedContext,
  ContextScope,
  ContextPriority,
} from '../types/context/unified-context.js';
import {
  PortalCapability,
  TextGenerationOptions,
  ChatGenerationOptions,
} from '../types/portal.js';
import { CommunicationStyle } from '../types/communication.js';

/**
 * Context to Prompt Transformation Utilities
 */
export class ContextPromptTransformer {
  /**
   * Transform context into a structured prompt enhancement
   */
  static transformToPromptContext(context: UnifiedContext): string {
    const sections: string[] = [];

    // Agent personality and state
    if (context.agent) {
      const agentSection = this.buildAgentPromptSection(context.agent);
      if (agentSection) sections.push(agentSection);
    }

    // Memory and knowledge context
    if (context.memory) {
      const memorySection = this.buildMemoryPromptSection(context.memory);
      if (memorySection) sections.push(memorySection);
    }

    // Communication preferences
    if (context.communication) {
      const commSection = this.buildCommunicationPromptSection(
        context.communication
      );
      if (commSection) sections.push(commSection);
    }

    // Environmental context
    if (context.environment) {
      const envSection = this.buildEnvironmentPromptSection(
        context.environment
      );
      if (envSection) sections.push(envSection);
    }

    return sections.join('\n\n');
  }

  /**
   * Build agent-specific prompt section
   */
  private static buildAgentPromptSection(agentContext: any): string {
    const parts: string[] = [];

    // Personality traits
    if (agentContext.config?.personality) {
      const personality = agentContext.config.personality;
      const traits = Object.entries(personality)
        .filter(([_, value]) => value !== null && value !== undefined)
        .map(([trait, value]) => `${trait}: ${value}`)
        .join(', ');
      if (traits) {
        parts.push(`Personality: ${traits}`);
      }
    }

    // Current emotional state
    if (agentContext.emotions) {
      const activeEmotions = Object.entries(agentContext.emotions)
        .filter(([_, data]) => (data as any)?.intensity > 0.3)
        .map(
          ([emotion, data]) =>
            `${emotion} (${(data as any).intensity.toFixed(1)})`
        )
        .join(', ');
      if (activeEmotions) {
        parts.push(`Current emotional state: ${activeEmotions}`);
      }
    }

    // Active goals
    if (agentContext.goals && agentContext.goals.length > 0) {
      parts.push(`Current goals: ${agentContext.goals.slice(0, 3).join(', ')}`);
    }

    // Capabilities
    if (agentContext.capabilities && agentContext.capabilities.length > 0) {
      parts.push(
        `Available capabilities: ${agentContext.capabilities.join(', ')}`
      );
    }

    return parts.length > 0 ? `[Agent Context]\n${parts.join('\n')}` : '';
  }

  /**
   * Build memory-specific prompt section
   */
  private static buildMemoryPromptSection(memoryContext: any): string {
    const parts: string[] = [];

    // Relevant memories
    if (memoryContext.relevant && memoryContext.relevant.length > 0) {
      const memories = memoryContext.relevant
        .slice(0, 5)
        .map(
          (memory: any, index: number) =>
            `${index + 1}. ${memory.content || memory.text || memory.description || 'Previous interaction'}`
        )
        .join('\n');
      parts.push(`Relevant memories:\n${memories}`);
    }

    // Working memory items
    if (memoryContext.working && memoryContext.working.length > 0) {
      const workingItems = memoryContext.working
        .slice(0, 3)
        .map((item: any) => item.content || item.text || 'Working memory item')
        .join(', ');
      parts.push(`Current focus: ${workingItems}`);
    }

    return parts.length > 0 ? `[Memory Context]\n${parts.join('\n')}` : '';
  }

  /**
   * Build communication-specific prompt section
   */
  private static buildCommunicationPromptSection(commContext: any): string {
    const parts: string[] = [];

    // Communication style
    if (commContext.style) {
      const style = commContext.style;
      const styleDesc = Object.entries(style)
        .filter(([_, value]) => value !== null && value !== undefined)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
      if (styleDesc) {
        parts.push(`Communication style: ${styleDesc}`);
      }
    }

    // Language preferences
    if (commContext.language) {
      parts.push(
        `Language: ${commContext.language.primary}${commContext.language.region ? ` (${commContext.language.region})` : ''}`
      );
    }

    // Channel capabilities
    if (commContext.channel) {
      parts.push(
        `Channel: ${commContext.channel.type}${commContext.channel.platform ? ` (${commContext.channel.platform})` : ''}`
      );
    }

    return parts.length > 0
      ? `[Communication Preferences]\n${parts.join('\n')}`
      : '';
  }

  /**
   * Build environment-specific prompt section
   */
  private static buildEnvironmentPromptSection(envContext: any): string {
    const parts: string[] = [];

    // Location context
    if (envContext.location) {
      const location = envContext.location;
      const locationDesc = [
        location.address,
        location.timezone,
        location.locale,
      ]
        .filter(Boolean)
        .join(', ');
      if (locationDesc) {
        parts.push(`Location: ${locationDesc}`);
      }
    }

    // Device context
    if (envContext.device) {
      parts.push(
        `Device: ${envContext.device.type}${envContext.device.os ? ` (${envContext.device.os})` : ''}`
      );
    }

    // Environmental factors
    if (envContext.factors) {
      const factors = Object.entries(envContext.factors)
        .filter(([_, value]) => value !== null && value !== undefined)
        .map(([factor, value]) => `${factor}: ${value}`)
        .join(', ');
      if (factors) {
        parts.push(`Environment: ${factors}`);
      }
    }

    return parts.length > 0 ? `[Environment]\n${parts.join('\n')}` : '';
  }
}

/**
 * Context-Based Model Selection Helpers
 */
export class ContextModelSelector {
  /**
   * Select optimal model based on context requirements
   */
  static selectModel(
    context: UnifiedContext,
    availableModels: string[],
    capability: PortalCapability
  ): string | null {
    const requirements = this.analyzeContextRequirements(context);

    // Score models based on context requirements
    const modelScores = availableModels.map((model) => ({
      model,
      score: this.scoreModelForContext(model, requirements, capability),
    }));

    // Sort by score and return the best match
    modelScores.sort((a, b) => b.score - a.score);
    return modelScores.length > 0 ? modelScores[0]?.model || null : null;
  }

  /**
   * Analyze context to determine requirements
   */
  private static analyzeContextRequirements(
    context: UnifiedContext
  ): ContextRequirements {
    const requirements: ContextRequirements = {
      complexity: 'medium',
      speed: 'medium',
      creativity: 'medium',
      accuracy: 'high',
      multimodal: false,
      toolUsage: false,
      conversational: false,
    };

    // Analyze conversation complexity
    if (context.communication?.conversationHistory) {
      const historyLength = context.communication.conversationHistory.length;
      if (historyLength > 20) requirements.complexity = 'high';
      else if (historyLength > 5) requirements.complexity = 'medium';
      requirements.conversational = true;
    }

    // Analyze tool requirements
    if (context.tools?.available && context.tools.available.length > 0) {
      requirements.toolUsage = true;
      requirements.speed = 'high'; // Tool usage often needs faster responses
    }

    // Analyze multimodal requirements
    if (
      context.communication?.channel?.capabilities?.includes('image') ||
      context.communication?.channel?.capabilities?.includes('video')
    ) {
      requirements.multimodal = true;
    }

    // Analyze creativity requirements from communication style
    if (context.communication?.style) {
      const style = context.communication.style as any;
      if (style.creativity === 'high') requirements.creativity = 'high';
      if (style.creativity === 'low') requirements.creativity = 'low';
    }

    // Analyze accuracy requirements
    if (
      context.agent?.config?.personality?.precision === 'high' ||
      context.execution?.mode === 'production'
    ) {
      requirements.accuracy = 'high';
    }

    return requirements;
  }

  /**
   * Score a model based on context requirements
   */
  private static scoreModelForContext(
    model: string,
    requirements: ContextRequirements,
    capability: PortalCapability
  ): number {
    let score = 0;

    // Model-specific scoring logic
    const modelInfo = this.getModelInfo(model);

    // Complexity matching
    if (
      requirements.complexity === 'high' &&
      modelInfo.capabilities.includes('complex-reasoning')
    )
      score += 30;
    if (
      requirements.complexity === 'medium' &&
      modelInfo.capabilities.includes('general-purpose')
    )
      score += 25;
    if (
      requirements.complexity === 'low' &&
      modelInfo.capabilities.includes('fast-simple')
    )
      score += 20;

    // Speed requirements
    if (requirements.speed === 'high' && modelInfo.speed === 'fast')
      score += 20;
    if (requirements.speed === 'medium' && modelInfo.speed === 'medium')
      score += 15;

    // Tool usage capability
    if (
      requirements.toolUsage &&
      modelInfo.capabilities.includes('tool-calling')
    )
      score += 25;

    // Multimodal requirements
    if (
      requirements.multimodal &&
      modelInfo.capabilities.includes('multimodal')
    )
      score += 30;

    // Creativity requirements
    if (
      requirements.creativity === 'high' &&
      modelInfo.capabilities.includes('creative')
    )
      score += 15;

    // Capability-specific scoring
    if (
      capability === PortalCapability.FUNCTION_CALLING &&
      modelInfo.capabilities.includes('tool-calling')
    )
      score += 20;
    if (
      capability === PortalCapability.VISION &&
      modelInfo.capabilities.includes('multimodal')
    )
      score += 20;

    return score;
  }

  /**
   * Get model information for scoring
   */
  private static getModelInfo(model: string): ModelInfo {
    // This would typically be loaded from a configuration file
    const modelDatabase: Record<string, ModelInfo> = {
      'gpt-4o': {
        speed: 'medium',
        capabilities: [
          'complex-reasoning',
          'multimodal',
          'tool-calling',
          'creative',
        ],
      },
      'gpt-4o-mini': {
        speed: 'fast',
        capabilities: ['general-purpose', 'tool-calling', 'fast-simple'],
      },
      'claude-3-5-sonnet-20241022': {
        speed: 'medium',
        capabilities: [
          'complex-reasoning',
          'creative',
          'tool-calling',
          'multimodal',
        ],
      },
      'claude-3-haiku-20240307': {
        speed: 'fast',
        capabilities: ['fast-simple', 'general-purpose'],
      },
    };

    return (
      modelDatabase[model] || {
        speed: 'medium',
        capabilities: ['general-purpose'],
      }
    );
  }
}

/**
 * Performance Optimization Utilities
 */
export class ContextPerformanceOptimizer {
  /**
   * Optimize generation options based on context
   */
  static optimizeOptions(
    context: UnifiedContext,
    baseOptions?: TextGenerationOptions | ChatGenerationOptions
  ): TextGenerationOptions | ChatGenerationOptions {
    const optimized = { ...baseOptions };

    // Token optimization
    optimized.maxOutputTokens = this.optimizeTokenLimit(
      context,
      optimized.maxOutputTokens
    );

    // Temperature optimization
    optimized.temperature = this.optimizeTemperature(
      context,
      optimized.temperature
    );

    // Streaming optimization
    if (this.shouldEnableStreaming(context)) {
      optimized.stream = true;
    }

    // Tool optimization
    if (context.tools?.available && !optimized.tools) {
      optimized.tools = this.optimizeToolSelection(context);
    }

    return optimized;
  }

  /**
   * Optimize token limit based on context
   */
  private static optimizeTokenLimit(
    context: UnifiedContext,
    currentLimit?: number
  ): number {
    let baseLimit = currentLimit || 1000;

    // Increase for complex conversations
    if (
      context.communication?.conversationHistory &&
      context.communication.conversationHistory.length > 10
    ) {
      baseLimit = Math.min(baseLimit * 2, 4000);
    }

    // Decrease for tool usage (usually needs concise responses)
    if (context.tools?.available && context.tools.available.length > 0) {
      baseLimit = Math.min(baseLimit, 1500);
    }

    // Adjust based on performance constraints
    if (
      context.performance?.memoryUsage &&
      context.performance.memoryUsage > 100 * 1024 * 1024
    ) {
      baseLimit = Math.min(baseLimit, 800); // Reduce for memory pressure
    }

    return baseLimit;
  }

  /**
   * Optimize temperature based on context
   */
  private static optimizeTemperature(
    context: UnifiedContext,
    currentTemp?: number
  ): number {
    let temperature = currentTemp || 0.7;

    // Lower temperature for tool usage
    if (context.tools?.available && context.tools.available.length > 0) {
      temperature = Math.min(temperature, 0.1);
    }

    // Adjust based on communication style
    if (context.communication?.style) {
      const style = context.communication.style as any;
      if (style.creativity === 'high') temperature = Math.max(temperature, 0.8);
      if (style.creativity === 'low') temperature = Math.min(temperature, 0.3);
      if (style.precision === 'high') temperature = Math.min(temperature, 0.2);
    }

    // Lower temperature for production environments
    if (context.execution?.mode === 'production') {
      temperature = Math.min(temperature, 0.5);
    }

    return temperature;
  }

  /**
   * Determine if streaming should be enabled
   */
  private static shouldEnableStreaming(context: UnifiedContext): boolean {
    // Enable streaming for interactive channels
    if (
      context.communication?.channel?.type === 'text' &&
      context.communication.channel.capabilities?.includes('streaming')
    ) {
      return true;
    }

    // Enable for real-time conversations
    if (context.temporal?.constraints?.deadline) {
      const deadline = new Date(context.temporal.constraints.deadline);
      const now = new Date();
      const timeRemaining = deadline.getTime() - now.getTime();
      return timeRemaining < 30000; // Less than 30 seconds
    }

    return false;
  }

  /**
   * Optimize tool selection based on context
   */
  private static optimizeToolSelection(
    context: UnifiedContext
  ): Record<string, any> | undefined {
    if (!context.tools?.available) return undefined;

    const tools: Record<string, any> = {};

    // Prioritize tools based on recent usage
    const toolsByRecency = context.tools.recent || [];
    const recentToolNames = toolsByRecency.map((usage: any) => usage.id);

    // Add recently used tools first
    for (const tool of context.tools.available) {
      if (recentToolNames.includes(tool.id)) {
        tools[tool.name] = {
          description: tool.description,
          parameters: tool.parameters,
        };
      }
    }

    // Add other relevant tools (up to a reasonable limit)
    const maxTools = 10;
    let toolCount = Object.keys(tools).length;

    for (const tool of context.tools.available) {
      if (toolCount >= maxTools) break;
      if (!tools[tool.name]) {
        tools[tool.name] = {
          description: tool.description,
          parameters: tool.parameters,
        };
        toolCount++;
      }
    }

    return Object.keys(tools).length > 0 ? tools : undefined;
  }
}

/**
 * Migration Helpers for Existing Portal Usage
 */
export class ContextMigrationHelper {
  /**
   * Convert legacy options to context-aware options
   */
  static migrateToContextAware(
    legacyOptions: TextGenerationOptions | ChatGenerationOptions,
    context?: UnifiedContext
  ): TextGenerationOptions | ChatGenerationOptions {
    const migrated = { ...legacyOptions };

    if (context) {
      // Add context to options
      migrated.context = context;

      // Migrate temperature if not set
      if (migrated.temperature === undefined && context.communication?.style) {
        const style = context.communication.style as any;
        if (style.creativity === 'high') migrated.temperature = 0.8;
        if (style.creativity === 'low') migrated.temperature = 0.3;
      }

      // Migrate model selection if not set
      if (
        !migrated.model &&
        context.tools?.available &&
        context.tools.available.length > 0
      ) {
        // This would typically be set by the portal's context-aware methods
        migrated.model = 'tool-optimized-model';
      }
    }

    return migrated;
  }

  /**
   * Create minimal context for backward compatibility
   */
  static createMinimalContext(
    agentId?: string,
    sessionId?: string,
    communicationStyle?: CommunicationStyle
  ): UnifiedContext {
    const now = new Date().toISOString();

    return {
      metadata: {
        id: `context_${Date.now()}`,
        scope: ContextScope.REQUEST,
        priority: ContextPriority.CONFIG,
        createdAt: now,
        lastModified: now,
        source: 'migration-helper',
        version: '1.0.0',
      },
      identity: agentId ? { agentId } : undefined,
      session: sessionId
        ? {
            id: sessionId,
            startTime: new Date(now),
            events: [],
            state: {},
          }
        : undefined,
      communication: communicationStyle
        ? {
            conversationHistory: [],
            style: communicationStyle,
          }
        : undefined,
      temporal: {
        now: new Date(now),
        startTime: new Date(now),
      },
    };
  }

  /**
   * Detect if context should be used based on available data
   */
  static shouldUseContext(data: any): boolean {
    // Check if we have meaningful context data
    const hasAgentInfo = data.agent || data.agentId;
    const hasMemory = data.memory || data.memories;
    const hasCommunicationPrefs = data.communication || data.style;
    const hasEnvironmentInfo = data.environment || data.location || data.device;

    return !!(
      hasAgentInfo ||
      hasMemory ||
      hasCommunicationPrefs ||
      hasEnvironmentInfo
    );
  }
}

/**
 * Type definitions for context helpers
 */
interface ContextRequirements {
  complexity: 'low' | 'medium' | 'high';
  speed: 'low' | 'medium' | 'high';
  creativity: 'low' | 'medium' | 'high';
  accuracy: 'low' | 'medium' | 'high';
  multimodal: boolean;
  toolUsage: boolean;
  conversational: boolean;
}

interface ModelInfo {
  speed: 'slow' | 'medium' | 'fast';
  capabilities: string[];
}

/**
 * Utility functions for common context operations
 */
export const ContextUtils = {
  /**
   * Extract agent ID from context
   */
  getAgentId: (context: UnifiedContext): string | undefined => {
    return context.identity?.agentId || (context.agent as any)?.id;
  },

  /**
   * Extract session ID from context
   */
  getSessionId: (context: UnifiedContext): string | undefined => {
    return context.session?.id || context.identity?.sessionId;
  },

  /**
   * Check if context has tool requirements
   */
  hasToolRequirements: (context: UnifiedContext): boolean => {
    return !!(context.tools?.available && context.tools.available.length > 0);
  },

  /**
   * Check if context indicates real-time requirements
   */
  isRealTime: (context: UnifiedContext): boolean => {
    return !!(
      context.temporal?.constraints?.deadline ||
      context.communication?.channel?.capabilities?.includes('streaming')
    );
  },

  /**
   * Get context priority level
   */
  getPriority: (context: UnifiedContext): ContextPriority => {
    return context.metadata.priority;
  },

  /**
   * Check if context is expired
   */
  isExpired: (context: UnifiedContext): boolean => {
    if (!context.metadata.expiresAt) return false;
    return new Date(context.metadata.expiresAt) < new Date();
  },
};

// Export all utilities as default
export default {
  ContextPromptTransformer,
  ContextModelSelector,
  ContextPerformanceOptimizer,
  ContextMigrationHelper,
  ContextUtils,
};
