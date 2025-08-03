/**
 * Context Manager for SYMindX
 *
 * Manages conversation context, preserves state across interactions,
 * and provides context-aware responses.
 */

import {
  Agent,
  MemoryRecord,
  MemoryType,
  MemoryDuration,
} from '../../types/agent';
import { BaseConfig, Metadata, MetadataValue } from '../../types/common';
import { runtimeLogger } from '../../utils/logger';

/**
 * Conversation context
 */
export interface ConversationContext {
  id: string;
  agentId: string;
  startedAt: Date;
  lastActive: Date;

  // Participants
  participants: Set<string>;
  primaryParticipant?: string;

  // Topic tracking
  topics: Array<{
    topic: string;
    mentions: number;
    firstMentioned: Date;
    lastMentioned: Date;
  }>;
  currentTopic?: string;

  // Message history
  messages: Array<{
    from: string;
    content: string;
    timestamp: Date;
    emotion?: string;
    intent?: string;
  }>;

  // Context state
  state: {
    phase: 'greeting' | 'active' | 'closing' | 'idle';
    mood: 'positive' | 'neutral' | 'negative';
    formality: number; // 0-1
    engagement: number; // 0-1
  };

  // Unresolved references
  pendingQuestions: Array<{
    question: string;
    askedAt: Date;
    askedBy: string;
  }>;

  // Context continuity
  previousContextId?: string;
  followUpTopics: string[];

  // Metadata
  metadata: Metadata;
}

/**
 * Context manager configuration
 */
export interface ContextManagerConfig extends BaseConfig {
  // Context retention
  maxContextDuration?: number; // Max time to keep context active (ms)
  maxMessageHistory?: number; // Max messages to keep
  maxTopics?: number; // Max topics to track

  // Context switching
  contextSwitchThreshold?: number; // Confidence needed to switch context
  allowMultipleContexts?: boolean; // Allow parallel contexts

  // Memory integration
  persistToMemory?: boolean; // Save important contexts to memory
  memoryImportance?: number; // Importance threshold for memory

  // Analysis settings
  enableIntentAnalysis?: boolean; // Analyze message intent
  enableTopicExtraction?: boolean; // Extract topics from messages
  enableMoodDetection?: boolean; // Detect conversation mood
}

/**
 * Context Manager implementation
 */
export class ContextManager {
  private contexts: Map<string, ConversationContext> = new Map();
  private activeContexts: Map<string, string> = new Map(); // agentId -> contextId
  private config: ContextManagerConfig;

  constructor(config: ContextManagerConfig = {}) {
    this.config = {
      maxContextDuration: 3600000, // 1 hour
      maxMessageHistory: 100,
      maxTopics: 10,
      contextSwitchThreshold: 0.7,
      allowMultipleContexts: false,
      persistToMemory: true,
      memoryImportance: 0.6,
      enableIntentAnalysis: true,
      enableTopicExtraction: true,
      enableMoodDetection: true,
      ...config,
    };

    // Start cleanup timer
    setInterval(() => this.cleanupOldContexts(), 60000); // Every minute
  }

  /**
   * Get or create context for a conversation
   */
  getOrCreateContext(
    agentId: string,
    participantId: string,
    initialMessage?: string
  ): ConversationContext {
    // Check for existing active context
    const activeContextId = this.activeContexts.get(agentId);
    if (activeContextId) {
      const context = this.contexts.get(activeContextId);
      if (context && this.isContextValid(context)) {
        // Add participant if new
        context.participants.add(participantId);
        context.lastActive = new Date();
        return context;
      }
    }

    // Create new context
    const contextId = `ctx_${agentId}_${Date.now()}`;
    const context: ConversationContext = {
      id: contextId,
      agentId,
      startedAt: new Date(),
      lastActive: new Date(),
      participants: new Set([participantId]),
      primaryParticipant: participantId,
      topics: [],
      messages: [],
      state: {
        phase: 'greeting',
        mood: 'neutral',
        formality: 0.5,
        engagement: 0.5,
      },
      pendingQuestions: [],
      followUpTopics: [],
      metadata: {} as Metadata,
    };

    // Process initial message if provided
    if (initialMessage) {
      this.addMessage(context, participantId, initialMessage);
    }

    this.contexts.set(contextId, context);
    this.activeContexts.set(agentId, contextId);

    runtimeLogger.debug(
      `Created new context ${contextId} for agent ${agentId}`
    );
    return context;
  }

  /**
   * Add a message to the context
   */
  addMessage(
    context: ConversationContext,
    from: string,
    content: string,
    emotion?: string
  ): void {
    // Extract intent if enabled
    let intent: string | undefined;
    if (this.config.enableIntentAnalysis) {
      intent = this.analyzeIntent(content);
    }

    // Add message
    const message: {
      from: string;
      content: string;
      timestamp: Date;
      emotion?: string;
      intent?: string;
    } = {
      from,
      content,
      timestamp: new Date(),
    };

    if (emotion !== undefined) {
      message.emotion = emotion;
    }

    if (intent !== undefined) {
      message.intent = intent;
    }

    context.messages.push(message);

    // Limit message history
    if (context.messages.length > this.config.maxMessageHistory!) {
      context.messages = context.messages.slice(
        -this.config.maxMessageHistory!
      );
    }

    // Extract topics if enabled
    if (this.config.enableTopicExtraction) {
      this.extractTopics(context, content);
    }

    // Update mood if enabled
    if (this.config.enableMoodDetection) {
      this.updateMood(context, content, emotion);
    }

    // Update phase
    this.updatePhase(context, content);

    // Track questions
    if (content.includes('?')) {
      context.pendingQuestions.push({
        question: content,
        askedAt: new Date(),
        askedBy: from,
      });
    }

    context.lastActive = new Date();
  }

  /**
   * Get context summary for agent decision making
   */
  getContextSummary(contextId: string): {
    topics: string[];
    mood: string;
    pendingQuestions: string[];
    recentMessages: string[];
    participants: string[];
    phase: string;
  } | null {
    const context = this.contexts.get(contextId);
    if (!context) return null;

    return {
      topics: context.topics.map((t) => t.topic),
      mood: context.state.mood,
      pendingQuestions: context.pendingQuestions.map((q) => q.question),
      recentMessages: context.messages.slice(-5).map((m) => m.content),
      participants: Array.from(context.participants),
      phase: context.state.phase,
    };
  }

  /**
   * Preserve context to memory
   */
  async preserveToMemory(
    agent: Agent,
    contextId: string
  ): Promise<MemoryRecord | null> {
    if (!this.config.persistToMemory) return null;

    const context = this.contexts.get(contextId);
    if (!context) return null;

    // Calculate importance
    const importance = this.calculateContextImportance(context);
    if (importance < this.config.memoryImportance!) return null;

    // Create memory record
    const memory: MemoryRecord = {
      id: `mem_ctx_${Date.now()}`,
      agentId: agent.id,
      type: MemoryType.INTERACTION,
      content: this.summarizeContext(context),
      metadata: (() => {
        const metadata: Metadata = {};
        this.setMetadataValue(metadata, 'contextId', contextId);
        this.setMetadataValue(
          metadata,
          'participants',
          Array.from(context.participants)
        );
        this.setMetadataValue(
          metadata,
          'topics',
          context.topics.map((t) => t.topic)
        );
        this.setMetadataValue(
          metadata,
          'duration',
          Date.now() - context.startedAt.getTime()
        );
        this.setMetadataValue(
          metadata,
          'messageCount',
          context.messages.length
        );
        this.setMetadataValue(metadata, 'mood', context.state.mood);
        return metadata;
      })(),
      importance,
      timestamp: new Date(),
      tags: ['conversation', 'context', ...context.topics.map((t) => t.topic)],
      duration: MemoryDuration.LONG_TERM,
    };

    return memory;
  }

  /**
   * Restore context from memory
   */
  restoreFromMemory(
    agentId: string,
    memory: MemoryRecord
  ): ConversationContext | null {
    if (memory.type !== MemoryType.INTERACTION) return null;
    if (!memory.metadata?.['contextId']) return null;

    // Create restored context
    const context: ConversationContext = {
      id: memory.metadata['contextId'] as string,
      agentId,
      startedAt: memory.timestamp,
      lastActive: new Date(),
      participants: new Set((memory.metadata['participants'] as string[]) || []),
      topics: ((memory.metadata['topics'] as string[]) || []).map(
        (topic: string) => ({
          topic,
          mentions: 1,
          firstMentioned: memory.timestamp,
          lastMentioned: memory.timestamp,
        })
      ),
      messages: [],
      state: {
        phase: 'active',
        mood:
          (memory.metadata['mood'] as 'positive' | 'negative' | 'neutral') ||
          'neutral',
        formality: 0.5,
        engagement: 0.5,
      },
      pendingQuestions: [],
      followUpTopics: (memory.metadata['topics'] as string[]) || [],
      previousContextId: memory.metadata['contextId'] as string,
      metadata: (() => {
        const metadata: Metadata = {};
        this.setMetadataValue(metadata, 'restored', true);
        this.setMetadataValue(metadata, 'restoredFrom', memory.id);
        return metadata;
      })(),
    };

    this.contexts.set(context.id, context);
    return context;
  }

  /**
   * Switch active context
   */
  switchContext(agentId: string, newContextId: string): boolean {
    const newContext = this.contexts.get(newContextId);
    if (!newContext || newContext.agentId !== agentId) return false;

    this.activeContexts.set(agentId, newContextId);
    return true;
  }

  /**
   * Merge contexts (e.g., when realizing two conversations are related)
   */
  mergeContexts(
    primaryId: string,
    secondaryId: string
  ): ConversationContext | null {
    const primary = this.contexts.get(primaryId);
    const secondary = this.contexts.get(secondaryId);

    if (!primary || !secondary) return null;

    // Merge participants
    secondary.participants.forEach((p) => primary.participants.add(p));

    // Merge messages
    primary.messages.push(...secondary.messages);
    primary.messages.sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );

    // Merge topics
    secondary.topics.forEach((sTopic) => {
      const existing = primary.topics.find((t) => t.topic === sTopic.topic);
      if (existing) {
        existing.mentions += sTopic.mentions;
        existing.lastMentioned = new Date();
      } else {
        primary.topics.push(sTopic);
      }
    });

    // Merge pending questions
    primary.pendingQuestions.push(...secondary.pendingQuestions);

    // Update state
    primary.lastActive = new Date();

    // Remove secondary context
    this.contexts.delete(secondaryId);

    return primary;
  }

  /**
   * Analyze message intent
   */
  private analyzeIntent(message: string): string {
    const lower = message.toLowerCase();

    if (lower.includes('?')) return 'question';
    if (lower.includes('please') || lower.includes('could you'))
      return 'request';
    if (lower.includes('thanks') || lower.includes('thank you'))
      return 'gratitude';
    if (lower.includes('sorry') || lower.includes('apologize'))
      return 'apology';
    if (lower.includes('!')) return 'exclamation';
    if (lower.includes('i think') || lower.includes('i believe'))
      return 'opinion';
    if (lower.includes('i feel') || lower.includes('i am')) return 'emotion';

    return 'statement';
  }

  /**
   * Extract topics from message
   */
  private extractTopics(context: ConversationContext, message: string): void {
    // Simple keyword extraction (production would use NLP)
    const words = message.toLowerCase().split(/\s+/);
    const stopWords = new Set([
      'the',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
    ]);

    const keywords = words
      .filter((w) => w.length > 3 && !stopWords.has(w))
      .filter((w) => /^[a-z]+$/.test(w));

    for (const keyword of keywords) {
      const existing = context.topics.find((t) => t.topic === keyword);
      if (existing) {
        existing.mentions++;
        existing.lastMentioned = new Date();
      } else if (context.topics.length < this.config.maxTopics!) {
        context.topics.push({
          topic: keyword,
          mentions: 1,
          firstMentioned: new Date(),
          lastMentioned: new Date(),
        });
      }
    }

    // Update current topic
    if (context.topics.length > 0) {
      const sortedTopics = context.topics.sort(
        (a, b) => b.mentions - a.mentions
      );
      const topTopic = sortedTopics[0];
      if (topTopic) {
        context.currentTopic = topTopic.topic;
      }
    }
  }

  /**
   * Update conversation mood
   */
  private updateMood(
    context: ConversationContext,
    message: string,
    emotion?: string
  ): void {
    const positive = ['happy', 'excited', 'grateful', 'confident'];
    const negative = ['sad', 'angry', 'anxious', 'confused'];

    let moodShift = 0;

    // Check emotion
    if (emotion && positive.includes(emotion)) moodShift += 0.1;
    if (emotion && negative.includes(emotion)) moodShift -= 0.1;

    // Check message sentiment
    const lower = message.toLowerCase();
    if (
      lower.includes('great') ||
      lower.includes('wonderful') ||
      lower.includes('excellent')
    ) {
      moodShift += 0.05;
    }
    if (
      lower.includes('bad') ||
      lower.includes('terrible') ||
      lower.includes('awful')
    ) {
      moodShift -= 0.05;
    }

    // Update mood
    if (moodShift > 0.05) {
      context.state.mood = 'positive';
    } else if (moodShift < -0.05) {
      context.state.mood = 'negative';
    }
  }

  /**
   * Update conversation phase
   */
  private updatePhase(context: ConversationContext, message: string): void {
    const lower = message.toLowerCase();

    // Greeting detection
    if (
      context.messages.length <= 3 &&
      (lower.includes('hello') || lower.includes('hi') || lower.includes('hey'))
    ) {
      context.state.phase = 'greeting';
    }
    // Closing detection
    else if (
      lower.includes('bye') ||
      lower.includes('goodbye') ||
      lower.includes('see you') ||
      lower.includes('talk later')
    ) {
      context.state.phase = 'closing';
    }
    // Active conversation
    else if (
      context.state.phase === 'greeting' &&
      context.messages.length > 3
    ) {
      context.state.phase = 'active';
    }
  }

  /**
   * Calculate context importance
   */
  private calculateContextImportance(context: ConversationContext): number {
    let importance = 0.5;

    // Longer conversations are more important
    importance += Math.min(0.2, context.messages.length / 100);

    // Conversations with questions are important
    importance += Math.min(0.2, context.pendingQuestions.length * 0.05);

    // Multiple topics indicate depth
    importance += Math.min(0.1, context.topics.length * 0.02);

    // Emotional conversations are memorable
    if (context.state.mood !== 'neutral') importance += 0.1;

    return Math.min(1, importance);
  }

  /**
   * Summarize context for memory
   */
  private summarizeContext(context: ConversationContext): string {
    const duration = Math.round(
      (Date.now() - context.startedAt.getTime()) / 60000
    );
    const topTopics = context.topics
      .sort((a, b) => b.mentions - a.mentions)
      .slice(0, 3)
      .map((t) => t.topic);

    let summary = `Conversation with ${Array.from(context.participants).join(', ')} lasting ${duration} minutes. `;

    if (topTopics.length > 0) {
      summary += `Discussed: ${topTopics.join(', ')}. `;
    }

    if (context.pendingQuestions.length > 0) {
      summary += `${context.pendingQuestions.length} questions asked. `;
    }

    summary += `Mood: ${context.state.mood}.`;

    return summary;
  }

  /**
   * Validate and set metadata value
   */
  private setMetadataValue(metadata: Metadata, key: string, value: any): void {
    // Ensure value conforms to MetadataValue type
    const validValue: MetadataValue = value;
    metadata[key] = validValue;
  }

  /**
   * Check if context is still valid
   */
  private isContextValid(context: ConversationContext): boolean {
    const age = Date.now() - context.lastActive.getTime();
    return age < this.config.maxContextDuration!;
  }

  /**
   * Clean up old contexts
   */
  private cleanupOldContexts(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [id, context] of Array.from(this.contexts)) {
      if (
        now - context.lastActive.getTime() >
        this.config.maxContextDuration! * 2
      ) {
        toDelete.push(id);
      }
    }

    for (const id of toDelete) {
      this.contexts.delete(id);
      runtimeLogger.debug(`Cleaned up old context: ${id}`);
    }
  }

  /**
   * Get active context for an agent
   */
  getActiveContext(agentId: string): ConversationContext | null {
    const contextId = this.activeContexts.get(agentId);
    if (!contextId) return null;

    const context = this.contexts.get(contextId);
    if (!context || !this.isContextValid(context)) {
      this.activeContexts.delete(agentId);
      return null;
    }

    return context;
  }

  /**
   * Export contexts for persistence
   */
  exportContexts(): Array<ConversationContext> {
    return Array.from(this.contexts.values());
  }

  /**
   * Import contexts
   */
  importContexts(contexts: Array<any>): void {
    for (const ctx of contexts) {
      this.contexts.set(ctx.id, {
        ...ctx,
        participants: new Set(ctx.participants),
        startedAt: new Date(ctx.startedAt),
        lastActive: new Date(ctx.lastActive),
      });
    }
  }
}

// Factory function
export function createContextManager(
  config?: ContextManagerConfig
): ContextManager {
  return new ContextManager(config);
}
