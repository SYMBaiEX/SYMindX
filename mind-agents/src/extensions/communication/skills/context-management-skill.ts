/**
 * Context Management Skill
 * Handles conversation contexts, participant tracking, and context analysis
 */

import { Agent, ExtensionAction, ActionCategory } from '../../../types/index';
import { runtimeLogger } from '../../../utils/logger';
import { BaseCommunicationSkill, CommunicationSkillConfig } from './base-communication-skill';
import { ContextManager, ContextManagerConfig } from '../context-manager';

export interface ContextManagementSkillConfig extends CommunicationSkillConfig {
  contextManager?: ContextManagerConfig;
  maxContexts?: number;
  contextTtl?: number;
  enablePersistence?: boolean;
}

export class ContextManagementSkill extends BaseCommunicationSkill {
  private contextManager: ContextManager;
  protected override config: ContextManagementSkillConfig;

  constructor(config: ContextManagementSkillConfig) {
    super({
      name: 'Context Management',
      description: 'Manages conversation contexts and participant interactions',
      ...config
    });
    this.config = {
      maxContexts: 100,
      contextTtl: 3600000, // 1 hour
      enablePersistence: true,
      ...config
    };

    this.contextManager = new ContextManager(this.config.contextManager || {});
  }

  override async initialize(agent: Agent): Promise<void> {
    await super.initialize(agent);
    // Additional initialization for context manager if needed
  }

  getActions(): ExtensionAction[] {
    return [
      this.createAction(
        'createContext',
        'Create or retrieve conversation context',
        ActionCategory.COMMUNICATION,
        {
          agentId: { type: 'string', description: 'Agent ID' },
          participantId: { type: 'string', description: 'Participant ID' },
          initialMessage: { type: 'string', description: 'Initial message', optional: true }
        },
        async (agent: Agent, params: any) => {
          const context = this.contextManager.getOrCreateContext(
            params.agentId,
            params.participantId,
            params.initialMessage
          );
          return {
            contextId: context.id,
            participantId: context.participantId,
            created: context.createdAt,
            messageCount: context.messages.length
          };
        }
      ),

      this.createAction(
        'addMessage',
        'Add message to conversation context',
        ActionCategory.COMMUNICATION,
        {
          contextId: { type: 'string', description: 'Context ID', optional: true },
          participantId: { type: 'string', description: 'Participant ID' },
          senderId: { type: 'string', description: 'Message sender ID' },
          message: { type: 'string', description: 'Message content' },
          emotion: { type: 'string', description: 'Emotional context', optional: true }
        },
        async (agent: Agent, params: any) => {
          let context;
          if (params.contextId) {
            context = this.contextManager.getContext(params.contextId);
          } else {
            context = this.contextManager.getOrCreateContext(
              agent.id,
              params.participantId,
              params.message
            );
          }

          if (!context) {
            throw new Error('Context not found');
          }

          this.contextManager.addMessage(
            context,
            params.senderId,
            params.message,
            params.emotion
          );

          return {
            contextId: context.id,
            messageCount: context.messages.length,
            timestamp: new Date()
          };
        }
      ),

      this.createAction(
        'getContextSummary',
        'Get summary of conversation context',
        ActionCategory.COMMUNICATION,
        {
          contextId: { type: 'string', description: 'Context ID' }
        },
        async (agent: Agent, params: any) => {
          const summary = this.contextManager.getContextSummary(params.contextId);
          if (!summary) {
            throw new Error('Context not found');
          }
          return summary;
        }
      ),

      this.createAction(
        'getActiveContext',
        'Get active context for agent',
        ActionCategory.COMMUNICATION,
        {
          agentId: { type: 'string', description: 'Agent ID', optional: true }
        },
        async (agent: Agent, params: any) => {
          const agentId = params.agentId || agent.id;
          const context = this.contextManager.getActiveContext(agentId);
          
          if (!context) {
            return { hasActiveContext: false };
          }

          return {
            hasActiveContext: true,
            contextId: context.id,
            participantId: context.participantId,
            messageCount: context.messages.length,
            created: context.createdAt,
            lastActivity: context.lastActivityAt
          };
        }
      ),

      this.createAction(
        'setActiveContext',
        'Set active context for agent',
        ActionCategory.COMMUNICATION,
        {
          contextId: { type: 'string', description: 'Context ID' }
        },
        async (agent: Agent, params: any) => {
          const context = this.contextManager.getContext(params.contextId);
          if (!context) {
            throw new Error('Context not found');
          }

          this.contextManager.setActiveContext(agent.id, context);
          return {
            success: true,
            contextId: context.id,
            message: 'Active context set successfully'
          };
        }
      ),

      this.createAction(
        'analyzeContext',
        'Analyze conversation context for insights',
        ActionCategory.COMMUNICATION,
        {
          contextId: { type: 'string', description: 'Context ID' }
        },
        async (agent: Agent, params: any) => {
          const context = this.contextManager.getContext(params.contextId);
          if (!context) {
            throw new Error('Context not found');
          }

          return this.analyzeContextInsights(context);
        }
      ),

      this.createAction(
        'exportContexts',
        'Export all contexts for persistence',
        ActionCategory.COMMUNICATION,
        {},
        async (agent: Agent, params: any) => {
          const contexts = this.contextManager.exportContexts();
          return {
            exportedCount: contexts.length,
            timestamp: new Date(),
            contexts: contexts.map(ctx => ({
              id: ctx.id,
              participantId: ctx.participantId,
              messageCount: ctx.messages.length,
              created: ctx.createdAt
            }))
          };
        }
      ),

      this.createAction(
        'cleanupOldContexts',
        'Clean up old or inactive contexts',
        ActionCategory.COMMUNICATION,
        {
          maxAge: { type: 'number', description: 'Maximum age in milliseconds', optional: true }
        },
        async (agent: Agent, params: any) => {
          const maxAge = params.maxAge || this.config.contextTtl;
          const cutoffTime = Date.now() - maxAge;
          
          const cleanedCount = this.cleanupOldContexts(cutoffTime);
          
          return {
            cleanedCount,
            timestamp: new Date(),
            message: `Cleaned up ${cleanedCount} old contexts`
          };
        }
      ),

      this.createAction(
        'preserveContextToMemory',
        'Preserve important context to agent memory',
        ActionCategory.COMMUNICATION,
        {
          contextId: { type: 'string', description: 'Context ID' }
        },
        async (agent: Agent, params: any) => {
          const memory = await this.contextManager.preserveToMemory(agent, params.contextId);
          
          if (memory && agent.memory) {
            await agent.memory.store(agent.id, memory);
            return {
              success: true,
              memoryId: memory.id,
              message: 'Context preserved to memory successfully'
            };
          }

          return {
            success: false,
            message: 'Failed to preserve context to memory'
          };
        }
      )
    ];
  }

  /**
   * Get the context manager instance
   */
  getContextManager(): ContextManager {
    return this.contextManager;
  }

  /**
   * Analyze context for behavioral insights
   */
  private analyzeContextInsights(context: any): any {
    const analysis = {
      participantBehavior: this.analyzeParticipantBehavior(context),
      conversationFlow: this.analyzeConversationFlow(context),
      emotionalTone: this.analyzeEmotionalTone(context),
      topicProgression: this.analyzeTopicProgression(context),
      engagementLevel: this.calculateEngagementLevel(context),
      recommendations: this.generateContextRecommendations(context)
    };

    return analysis;
  }

  private analyzeParticipantBehavior(context: any): any {
    const messagesByParticipant = new Map<string, any[]>();
    
    for (const message of context.messages || []) {
      if (!messagesByParticipant.has(message.senderId)) {
        messagesByParticipant.set(message.senderId, []);
      }
      messagesByParticipant.get(message.senderId)!.push(message);
    }

    const behavior: any = {};
    for (const [participantId, messages] of messagesByParticipant) {
      behavior[participantId] = {
        messageCount: messages.length,
        averageLength: messages.reduce((sum, m) => sum + m.content.length, 0) / messages.length,
        responseTime: this.calculateAverageResponseTime(messages),
        questionCount: messages.filter(m => m.content.includes('?')).length,
        emotionalRange: this.analyzeEmotionalRange(messages)
      };
    }

    return behavior;
  }

  private analyzeConversationFlow(context: any): any {
    const messages = context.messages || [];
    if (messages.length < 2) return { flow: 'insufficient_data' };

    const turns = this.identifyConversationTurns(messages);
    const phases = this.identifyConversationPhases(messages);

    return {
      turns: turns.length,
      averageTurnLength: turns.reduce((sum, turn) => sum + turn.length, 0) / turns.length,
      phases,
      dominantSpeaker: this.findDominantSpeaker(messages),
      interactionPattern: this.analyzeInteractionPattern(messages)
    };
  }

  private analyzeEmotionalTone(context: any): any {
    const messages = context.messages || [];
    const emotions = messages
      .filter((m: any) => m.emotion)
      .map((m: any) => m.emotion);

    if (emotions.length === 0) {
      return { tone: 'neutral', confidence: 0 };
    }

    const emotionCounts = emotions.reduce((counts: any, emotion: string) => {
      counts[emotion] = (counts[emotion] || 0) + 1;
      return counts;
    }, {});

    const dominantEmotion = Object.entries(emotionCounts)
      .sort(([,a], [,b]) => (b as number) - (a as number))[0][0];

    return {
      tone: dominantEmotion,
      distribution: emotionCounts,
      confidence: emotionCounts[dominantEmotion] / emotions.length,
      progression: this.analyzeEmotionalProgression(messages)
    };
  }

  private analyzeTopicProgression(context: any): string[] {
    // Simple topic extraction based on keywords
    const messages = context.messages || [];
    const topics: string[] = [];
    
    // This would typically use NLP or keyword extraction
    // For now, return placeholder topics
    if (messages.length > 0) {
      topics.push('general_conversation');
    }

    return topics;
  }

  private calculateEngagementLevel(context: any): number {
    const messages = context.messages || [];
    if (messages.length === 0) return 0;

    const factors = {
      messageCount: Math.min(messages.length / 20, 1), // Max score at 20 messages
      participantCount: Math.min(context.participants?.length || 1, 3) / 3,
      recentActivity: this.calculateRecentActivity(context),
      questionEngagement: this.calculateQuestionEngagement(messages)
    };

    return Object.values(factors).reduce((sum, score) => sum + score, 0) / Object.keys(factors).length;
  }

  private generateContextRecommendations(context: any): string[] {
    const recommendations: string[] = [];
    const messages = context.messages || [];

    if (messages.length > 50) {
      recommendations.push('Consider summarizing conversation to maintain focus');
    }

    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      const timeSinceLastMessage = Date.now() - new Date(lastMessage.timestamp).getTime();
      
      if (timeSinceLastMessage > 300000) { // 5 minutes
        recommendations.push('Context may be stale, consider refreshing or closing');
      }
    }

    const questionCount = messages.filter((m: any) => m.content.includes('?')).length;
    const unansweredQuestions = questionCount; // Simplified logic
    
    if (unansweredQuestions > 0) {
      recommendations.push(`Address ${unansweredQuestions} pending questions`);
    }

    return recommendations;
  }

  // Helper methods for analysis
  private calculateAverageResponseTime(messages: any[]): number {
    if (messages.length < 2) return 0;
    
    let totalResponseTime = 0;
    let responseCount = 0;

    for (let i = 1; i < messages.length; i++) {
      const prevTime = new Date(messages[i - 1].timestamp).getTime();
      const currentTime = new Date(messages[i].timestamp).getTime();
      totalResponseTime += currentTime - prevTime;
      responseCount++;
    }

    return responseCount > 0 ? totalResponseTime / responseCount : 0;
  }

  private analyzeEmotionalRange(messages: any[]): string[] {
    return [...new Set(messages.filter(m => m.emotion).map(m => m.emotion))];
  }

  private identifyConversationTurns(messages: any[]): any[][] {
    const turns: any[][] = [];
    let currentTurn: any[] = [];
    let currentSpeaker: string | null = null;

    for (const message of messages) {
      if (message.senderId !== currentSpeaker) {
        if (currentTurn.length > 0) {
          turns.push(currentTurn);
        }
        currentTurn = [message];
        currentSpeaker = message.senderId;
      } else {
        currentTurn.push(message);
      }
    }

    if (currentTurn.length > 0) {
      turns.push(currentTurn);
    }

    return turns;
  }

  private identifyConversationPhases(messages: any[]): string[] {
    // Simplified phase detection
    if (messages.length === 0) return [];
    if (messages.length < 5) return ['opening'];
    if (messages.length < 20) return ['opening', 'main'];
    return ['opening', 'main', 'development'];
  }

  private findDominantSpeaker(messages: any[]): string | null {
    const speakerCounts: Record<string, number> = {};
    
    for (const message of messages) {
      speakerCounts[message.senderId] = (speakerCounts[message.senderId] || 0) + 1;
    }

    return Object.entries(speakerCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || null;
  }

  private analyzeInteractionPattern(messages: any[]): string {
    if (messages.length < 4) return 'minimal';
    
    const speakers = [...new Set(messages.map(m => m.senderId))];
    if (speakers.length === 2) return 'dialogue';
    if (speakers.length > 2) return 'group_discussion';
    return 'monologue';
  }

  private analyzeEmotionalProgression(messages: any[]): string {
    const emotionalMessages = messages.filter((m: any) => m.emotion);
    if (emotionalMessages.length < 3) return 'stable';

    const emotions = emotionalMessages.map((m: any) => m.emotion);
    const positiveEmotions = ['happy', 'excited', 'confident', 'satisfied'];
    const negativeEmotions = ['sad', 'angry', 'frustrated', 'disappointed'];

    const progression = emotions.map(emotion => {
      if (positiveEmotions.includes(emotion)) return 1;
      if (negativeEmotions.includes(emotion)) return -1;
      return 0;
    });

    const start = progression.slice(0, Math.ceil(progression.length / 3)).reduce((a, b) => a + b, 0);
    const end = progression.slice(-Math.ceil(progression.length / 3)).reduce((a, b) => a + b, 0);

    if (end > start) return 'improving';
    if (end < start) return 'declining';
    return 'stable';
  }

  private calculateRecentActivity(context: any): number {
    const messages = context.messages || [];
    if (messages.length === 0) return 0;

    const lastMessage = messages[messages.length - 1];
    const timeSinceLastMessage = Date.now() - new Date(lastMessage.timestamp).getTime();
    const maxRecentTime = 300000; // 5 minutes

    return Math.max(0, 1 - (timeSinceLastMessage / maxRecentTime));
  }

  private calculateQuestionEngagement(messages: any[]): number {
    const questions = messages.filter((m: any) => m.content.includes('?'));
    return Math.min(questions.length / messages.length, 0.3); // Cap at 30%
  }

  private cleanupOldContexts(cutoffTime: number): number {
    // This would need to be implemented in the ContextManager
    // For now, return 0 as placeholder
    return 0;
  }
}