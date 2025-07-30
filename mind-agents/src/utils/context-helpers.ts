/**
 * Context utilities for unified context management
 * Provides simple helpers for working with ThoughtContext and existing context system
 */

import type { BaseContext, PortalContext } from '../types/context.js';
import type {
  ThoughtContext,
  Agent,
  AgentState,
  EnvironmentState,
} from '../types/agent.js';

/**
 * Enhances a ThoughtContext with additional fields for unified context integration
 */
export function enrichThoughtContext(
  thoughtContext: ThoughtContext,
  options?: {
    includeConversationHistory?: boolean;
    includeEmotionalContext?: boolean;
    includeCognitiveState?: boolean;
    includeToolContext?: boolean;
  }
): ThoughtContext {
  const enhanced = { ...thoughtContext };

  // Only add fields if they don't already exist
  if (options?.includeConversationHistory && !enhanced.conversationHistory) {
    enhanced.conversationHistory = [];
  }

  if (options?.includeEmotionalContext && !enhanced.emotionalContext) {
    enhanced.emotionalContext = {
      current: 'neutral',
      intensity: 0.5,
      recentChanges: [],
    };
  }

  if (options?.includeCognitiveState && !enhanced.cognitiveState) {
    enhanced.cognitiveState = {
      confidence: 0.5,
      focus: 0.5,
      workingMemory: [],
      activeGoals: [],
    };
  }

  if (options?.includeToolContext && !enhanced.toolContext) {
    enhanced.toolContext = {
      availableTools: [],
      recentToolUse: [],
    };
  }

  return enhanced;
}

/**
 * Creates a BaseContext from ThoughtContext for backward compatibility
 */
export function thoughtContextToBaseContext(
  thoughtContext: ThoughtContext,
  sessionId?: string,
  userId?: string
): BaseContext {
  return {
    sessionId: sessionId || `session-${Date.now()}`,
    userId: userId,
    timestamp: new Date().toISOString(),
    // Add thoughtContext data as additional properties
    events: thoughtContext.events,
    memories: thoughtContext.memories,
    goal: thoughtContext.goal,
  };
}

/**
 * Creates a PortalContext from ThoughtContext for AI generation
 */
export function thoughtContextToPortalContext(
  thoughtContext: ThoughtContext,
  options?: {
    systemPrompt?: string;
    includeMemories?: boolean;
    sessionId?: string;
    userId?: string;
  }
): PortalContext {
  const baseContext = thoughtContextToBaseContext(
    thoughtContext,
    options?.sessionId,
    options?.userId
  );

  return {
    ...baseContext,
    systemPrompt: options?.systemPrompt,
    cognitiveContext: {
      thoughts: thoughtContext.cognitiveState?.workingMemory || [],
      cognitiveConfidence: thoughtContext.cognitiveState?.confidence,
    },
    previousThoughts: thoughtContext.cognitiveState?.workingMemory?.join('\n'),
    environment: {
      location: thoughtContext.environmentalFactors?.location,
    },
    events: thoughtContext.events,
  };
}

/**
 * Validates that a ThoughtContext has the required fields for unified context usage
 */
export function validateThoughtContextForUnified(context: ThoughtContext): {
  isValid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];

  if (!context.events || context.events.length === 0) {
    warnings.push('No events present in ThoughtContext');
  }

  if (!context.memories || context.memories.length === 0) {
    warnings.push('No memories present in ThoughtContext');
  }

  if (!context.currentState) {
    warnings.push('No current agent state in ThoughtContext');
  }

  if (!context.environment) {
    warnings.push('No environment state in ThoughtContext');
  }

  // Check for unified context fields
  if (!context.unifiedContext && !context.conversationHistory) {
    warnings.push(
      'Consider adding conversationHistory for better context tracking'
    );
  }

  if (!context.emotionalContext) {
    warnings.push(
      'Consider adding emotionalContext for enhanced decision making'
    );
  }

  if (!context.cognitiveState) {
    warnings.push('Consider adding cognitiveState for improved reasoning');
  }

  return {
    isValid: warnings.length < 3, // Allow up to 2 warnings
    warnings,
  };
}

/**
 * Merges multiple ThoughtContexts, prioritizing the most recent data
 */
export function mergeThoughtContexts(
  primary: ThoughtContext,
  ...additional: Partial<ThoughtContext>[]
): ThoughtContext {
  const merged = { ...primary };

  for (const context of additional) {
    // Merge arrays
    if (context.events) {
      merged.events = [...merged.events, ...context.events];
    }

    if (context.memories) {
      merged.memories = [...merged.memories, ...context.memories];
    }

    // Update with most recent state
    if (context.currentState) {
      merged.currentState = { ...merged.currentState, ...context.currentState };
    }

    if (context.environment) {
      merged.environment = { ...merged.environment, ...context.environment };
    }

    // Merge conversation history
    if (context.conversationHistory) {
      merged.conversationHistory = [
        ...(merged.conversationHistory || []),
        ...context.conversationHistory,
      ];
    }

    // Update emotional context
    if (context.emotionalContext) {
      merged.emotionalContext = {
        ...merged.emotionalContext,
        ...context.emotionalContext,
        recentChanges: [
          ...(merged.emotionalContext?.recentChanges || []),
          ...(context.emotionalContext?.recentChanges || []),
        ],
      };
    }

    // Update cognitive state
    if (context.cognitiveState) {
      merged.cognitiveState = {
        ...merged.cognitiveState,
        ...context.cognitiveState,
        workingMemory: [
          ...(merged.cognitiveState?.workingMemory || []),
          ...(context.cognitiveState?.workingMemory || []),
        ],
        activeGoals: [
          ...(merged.cognitiveState?.activeGoals || []),
          ...(context.cognitiveState?.activeGoals || []),
        ],
      };
    }

    // Other properties
    Object.assign(merged, context);
  }

  return merged;
}
