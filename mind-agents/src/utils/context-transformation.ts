/**
 * Context Transformation Utilities for SYMindX
 *
 * Provides transformation capabilities to adapt context for different system components
 * while maintaining data integrity and backward compatibility.
 */

import { BaseContext, PortalContext } from '../types/context';
import { ThoughtContext, Agent, CognitionModule } from '../types/agent';
import { EmotionState } from '../types/emotion';
import { MemoryRecord } from '../types/memory';

/**
 * Transform context for different target components
 */
export type TransformationTarget =
  | 'portal'
  | 'cognition'
  | 'memory'
  | 'emotion'
  | 'extension';

/**
 * Transformation options
 */
export interface TransformationOptions {
  /** Include sensitive data (default: false) */
  includeSensitive?: boolean;
  /** Maximum context size in KB */
  maxSize?: number;
  /** Fields to include (whitelist) */
  includeFields?: string[];
  /** Fields to exclude (blacklist) */
  excludeFields?: string[];
  /** Custom transformations */
  customTransforms?: Record<string, (value: any) => any>;
}

/**
 * Transform ThoughtContext for portal consumption
 */
export function transformForPortal(
  context: ThoughtContext,
  options: TransformationOptions = {}
): PortalContext {
  const portalContext: PortalContext = {
    timestamp: new Date().toISOString(),
  };

  // Add cognitive context if available
  if (context.unifiedContext?.cognitiveState) {
    portalContext.cognitiveContext = {
      thoughts: context.unifiedContext.cognitiveState.thoughts || [],
      cognitiveConfidence: context.unifiedContext.cognitiveState.confidence,
    };
  }

  // Add environment context
  if (context.environment) {
    portalContext.environment = {
      location: context.environment.location,
    };
  }

  // Add events if not sensitive
  if (!options.excludeFields?.includes('events')) {
    portalContext.events = context.events;
  }

  // Apply field filtering
  if (options.includeFields) {
    const filtered: any = {};
    options.includeFields.forEach((field) => {
      if (field in portalContext) {
        filtered[field] = (portalContext as any)[field];
      }
    });
    return filtered;
  }

  return portalContext;
}

/**
 * Transform context for cognition module
 */
export function transformForCognition(
  context: any,
  module: CognitionModule,
  options: TransformationOptions = {}
): ThoughtContext {
  // If already a ThoughtContext, enhance it
  if (isThoughtContext(context)) {
    return enhanceThoughtContext(context, options);
  }

  // Convert from unified context
  const thoughtContext: ThoughtContext = {
    events: context.events || [],
    memories: context.memories || [],
    currentState: context.agent?.state || createDefaultAgentState(),
    environment: context.environment || createDefaultEnvironment(),
  };

  // Add unified context reference
  if (context.sessionId || context.agentId) {
    thoughtContext.unifiedContext = context;
  }

  // Add goal if present
  if (context.goals?.length > 0) {
    thoughtContext.goal = context.goals[0].description;
  }

  return enhanceThoughtContext(thoughtContext, options);
}

/**
 * Transform context for memory storage
 */
export function transformForMemory(
  context: any,
  options: TransformationOptions = {}
): Partial<MemoryRecord> {
  const memory: Partial<MemoryRecord> = {
    timestamp: new Date(context.timestamp || Date.now()),
    metadata: {},
  };

  // Extract relevant context for memory
  if (context.agentId) {
    memory.agentId = context.agentId;
  }

  // Build metadata from context
  const metadata: Record<string, any> = {};

  if (context.sessionId) metadata.sessionId = context.sessionId;
  if (context.userId) metadata.userId = context.userId;
  if (context.conversationHistory?.length) {
    metadata.conversationTurn = context.conversationHistory.length;
  }
  if (context.emotionalContext) {
    metadata.emotionalState = context.emotionalContext.currentState;
  }
  if (context.environmentalFactors) {
    metadata.environment = context.environmentalFactors;
  }

  memory.metadata = metadata;

  // Apply transformations
  if (options.customTransforms?.memory) {
    return options.customTransforms.memory(memory);
  }

  return memory;
}

/**
 * Transform context for emotion module
 */
export function transformForEmotion(
  context: any,
  options: TransformationOptions = {}
): Partial<EmotionState> {
  const emotionContext: Partial<EmotionState> = {};

  // Extract emotional relevant data
  if (context.emotionalContext) {
    return context.emotionalContext.currentState || {};
  }

  // Infer emotional context from other data
  if (context.events?.length > 0) {
    // Analyze recent events for emotional triggers
    const recentEvents = context.events.slice(-5);
    // This is a simplified example - real implementation would be more sophisticated
    emotionContext.confidence = 0.5;
  }

  return emotionContext;
}

/**
 * Transform context for extensions
 */
export function transformForExtension(
  context: any,
  extensionId: string,
  options: TransformationOptions = {}
): Record<string, any> {
  const extensionContext: Record<string, any> = {
    timestamp: context.timestamp || new Date().toISOString(),
    source: 'unified-context',
  };

  // Filter sensitive data by default
  const sensitiveFields = ['password', 'token', 'key', 'secret', 'credential'];

  Object.entries(context).forEach(([key, value]) => {
    const isSensitive = sensitiveFields.some((field) =>
      key.toLowerCase().includes(field)
    );

    if (!isSensitive || options.includeSensitive) {
      extensionContext[key] = value;
    }
  });

  // Apply size limits
  if (options.maxSize) {
    const serialized = JSON.stringify(extensionContext);
    if (serialized.length > options.maxSize * 1024) {
      // Trim context to fit size limit
      return trimContext(extensionContext, options.maxSize);
    }
  }

  return extensionContext;
}

/**
 * Create a transformation pipeline
 */
export class ContextTransformationPipeline {
  private transformers: Map<string, (context: any, options?: any) => any> =
    new Map();

  constructor() {
    // Register default transformers
    this.registerTransformer('portal', transformForPortal);
    this.registerTransformer('cognition', transformForCognition);
    this.registerTransformer('memory', transformForMemory);
    this.registerTransformer('emotion', transformForEmotion);
    this.registerTransformer('extension', transformForExtension);
  }

  /**
   * Register a custom transformer
   */
  registerTransformer(
    target: string,
    transformer: (context: any, options?: any) => any
  ): void {
    this.transformers.set(target, transformer);
  }

  /**
   * Transform context for a specific target
   */
  transform(
    context: any,
    target: TransformationTarget | string,
    options?: TransformationOptions
  ): any {
    const transformer = this.transformers.get(target);
    if (!transformer) {
      throw new Error(`No transformer registered for target: ${target}`);
    }

    try {
      return transformer(context, options);
    } catch (error) {
      console.error(
        `Context transformation failed for target ${target}:`,
        error
      );
      // Return original context as fallback
      return context;
    }
  }

  /**
   * Transform context through multiple targets
   */
  transformChain(
    context: any,
    targets: Array<TransformationTarget | string>,
    options?: TransformationOptions
  ): any {
    return targets.reduce((ctx, target) => {
      return this.transform(ctx, target, options);
    }, context);
  }
}

// Helper functions

function isThoughtContext(context: any): context is ThoughtContext {
  return (
    context &&
    Array.isArray(context.events) &&
    Array.isArray(context.memories) &&
    context.currentState &&
    context.environment
  );
}

function enhanceThoughtContext(
  context: ThoughtContext,
  options: TransformationOptions
): ThoughtContext {
  const enhanced = { ...context };

  // Apply custom transformations
  if (options.customTransforms) {
    Object.entries(options.customTransforms).forEach(([field, transform]) => {
      if (field in enhanced) {
        (enhanced as any)[field] = transform((enhanced as any)[field]);
      }
    });
  }

  return enhanced;
}

function createDefaultAgentState(): any {
  return {
    status: 'idle',
    lastUpdate: new Date(),
  };
}

function createDefaultEnvironment(): any {
  return {
    platform: process.platform,
    timestamp: new Date(),
  };
}

function trimContext(context: any, maxSizeKB: number): any {
  // Simple trimming strategy - remove largest fields first
  const serialized = JSON.stringify(context);
  if (serialized.length <= maxSizeKB * 1024) {
    return context;
  }

  const trimmed = { ...context };
  const fields = Object.keys(trimmed).sort((a, b) => {
    const aSize = JSON.stringify(trimmed[a]).length;
    const bSize = JSON.stringify(trimmed[b]).length;
    return bSize - aSize;
  });

  // Remove fields until under size limit
  for (const field of fields) {
    if (['timestamp', 'agentId', 'sessionId'].includes(field)) {
      continue; // Keep essential fields
    }

    delete trimmed[field];
    if (JSON.stringify(trimmed).length <= maxSizeKB * 1024) {
      break;
    }
  }

  return trimmed;
}

// Export singleton pipeline
export const contextTransformer = new ContextTransformationPipeline();
