/**
 * Lightweight Prompt Management System
 *
 * Provides structured prompts for different contexts throughout the system
 * without the complexity of the disabled prompt module.
 */

export class PromptManager {
  /**
   * System prompts for different contexts
   */
  static readonly PROMPTS = {
    // Tool and action decision prompts (for TOOL_MODEL - simple yes/no)
    TOOL_DECISION: `You are a tool selection assistant. Answer with only "yes" or "no".
Question: Should I use the {tool} tool for {task}?
Consider: {context}
Answer:`,

    ACTION_VALIDATION: `Validate if this action is safe and appropriate.
Action: {action}
Context: {context}
Agent ethics: {ethics}
Respond with JSON: {"allowed": boolean, "reason": string}`,

    // Chat and conversation prompts (for main model)
    CHAT_RESPONSE: `You are {name}, with these personality traits: {personality}.
Current emotional state: {emotion} (intensity: {intensity})
Recent conversation:
{context}

User: {message}

Respond naturally as {name} would, reflecting your current emotional state. Be concise and genuine.`,

    // Autonomous decision prompts (for TOOL_MODEL or main model)
    AUTONOMOUS_DECISION: `As an autonomous agent, decide the next action.
Current goal: {goal}
Current phase: {phase}
Available actions: {actions}
Recent activities: {recent}
Energy level: {energy}

Choose ONE action from the available actions and briefly explain why (max 20 words).
Format: ACTION: [chosen action] | REASON: [brief explanation]`,

    // Cognition and thinking prompts (for main model)
    THINKING_ANALYSIS: `Analyze the current situation for agent {name}:
Events: {events}
Current goal: {goal}
Memory summary: {memories}
Emotional state: {emotion}

Provide analysis:
1. Situation assessment (one sentence)
2. Required actions if any (list action names only)
3. Emotional impact (one word + intensity 0-1)
4. Overall confidence (0-1)
5. Key insight (one sentence)`,

    // Memory consolidation prompt (for main model)
    MEMORY_CONSOLIDATION: `Review these recent memories and identify the most important ones:
{memories}

For each important memory, explain why it matters in 10 words or less.
Format: MEMORY_ID: [id] | IMPORTANCE: [0-1] | REASON: [explanation]`,

    // Goal review prompt (for TOOL_MODEL)
    GOAL_REVIEW: `Current goals: {goals}
Recent progress: {progress}
Current state: {state}

Should goal "{goal}" be: continued, modified, or completed?
Answer with one word only.`,

    // Social interaction prompt (for main model)
    SOCIAL_CHECKIN: `As {name}, you want to check in with your contacts.
Your personality: {personality}
Current mood: {emotion}
Last interactions: {interactions}

Write a brief, friendly message (max 50 words) that reflects your personality and current state.`,

    // Reflection prompt (for main model)
    REFLECTION: `Reflect on your recent experiences:
Activities: {activities}
Emotions experienced: {emotions}
Goals progressed: {goals}
Learnings: {learnings}

Write a brief journal entry (max 100 words) about your growth and insights.`,
  };

  /**
   * Format a template with variables
   */
  static format(template: string, vars: Record<string, unknown>): string {
    return template.replace(/{(\w+)}/g, (_, key) => {
      const value = vars[key];
      if (value === undefined || value === null) return `{${key}}`;
      if (typeof value === 'object') return JSON.stringify(value, null, 2);
      return String(value);
    });
  }

  /**
   * Get appropriate prompt for a context
   */
  static getPrompt(context: PromptContext): string {
    const template = this.PROMPTS[context.type];
    if (!template) {
      throw new Error(`Unknown prompt type: ${context.type}`);
    }
    return this.format(template, context.variables);
  }

  /**
   * Create a chat prompt with full context
   */
  static createChatPrompt(
    agent: unknown,
    message: string,
    emotionalContext: unknown,
    conversationContext: string
  ): string {
    return this.format(this.PROMPTS.CHAT_RESPONSE, {
      name: agent.name,
      personality: agent.config.core.personality.join(', '),
      emotion: emotionalContext.current || 'neutral',
      intensity:
        ((emotionalContext.emotionIntensity || 0.5) * 100).toFixed(0) + '%',
      context: conversationContext || 'No previous context',
      message,
    });
  }

  /**
   * Create an autonomous decision prompt
   */
  static createAutonomousPrompt(
    goal: string,
    phase: string,
    actions: string[],
    recentActivities: string[],
    energy: number = 1.0
  ): string {
    return this.format(this.PROMPTS.AUTONOMOUS_DECISION, {
      goal,
      phase,
      actions: actions.join(', '),
      recent: recentActivities.slice(-3).join(', ') || 'none',
      energy: (energy * 100).toFixed(0) + '%',
    });
  }

  /**
   * Create a thinking/analysis prompt
   */
  static createThinkingPrompt(
    agent: unknown,
    events: unknown[],
    goal: string,
    memories: unknown[],
    emotionalState: unknown
  ): string {
    return this.format(this.PROMPTS.THINKING_ANALYSIS, {
      name: agent.name,
      events: events.map((e) => `${e.type}(${e.source})`).join(', '),
      goal: goal || 'no specific goal',
      memories: `${memories.length} memories, most recent: ${memories[0]?.content || 'none'}`,
      emotion: `${emotionalState.current}(${(emotionalState.intensity * 100).toFixed(0)}%)`,
    });
  }
}

/**
 * Context for prompt generation
 */
export interface PromptContext {
  type: keyof typeof PromptManager.PROMPTS;
  variables: Record<string, unknown>;
}

/**
 * Prompt response types for parsing
 */
export interface PromptResponses {
  ToolDecision: 'yes' | 'no';
  ActionValidation: { allowed: boolean; reason: string };
  AutonomousDecision: { action: string; reason: string };
  GoalReview: 'continued' | 'modified' | 'completed';
  ThinkingAnalysis: {
    assessment: string;
    actions: string[];
    emotion: { type: string; intensity: number };
    confidence: number;
    insight: string;
  };
}
