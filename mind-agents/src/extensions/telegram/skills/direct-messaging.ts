/**
 * Direct Messaging Skill for Telegram Extension
 * 
 * Handles direct message handling with relationship context
 */

import { ExtensionAction, ActionCategory, Agent, ActionResult, ActionResultType } from '../../../types/agent.js';
import { SkillParameters } from '../../../types/common.js';
import { TelegramSkill } from './index.js';
import { TelegramConfig } from '../types.js';
import { Logger } from '../../../utils/logger.js';

export interface DirectMessageContext {
  userId: string;
  username: string;
  firstName: string;
  lastName?: string;
  languageCode?: string;
  isBot: boolean;
  lastInteraction: Date;
  messageHistory: DMMessage[];
  relationshipLevel: 'stranger' | 'acquaintance' | 'friend' | 'close_friend';
  topics: string[];
  preferences: UserPreferences;
  timezone?: string;
}

export interface DMMessage {
  messageId: number;
  text: string;
  timestamp: Date;
  direction: 'incoming' | 'outgoing';
  sentiment: 'positive' | 'negative' | 'neutral';
  topics: string[];
  responseTime?: number; // milliseconds
}

export interface UserPreferences {
  communicationStyle: 'formal' | 'casual' | 'friendly' | 'professional';
  responseSpeed: 'immediate' | 'quick' | 'normal' | 'delayed';
  topicInterests: string[];
  timePreferences: {
    preferredHours: Array<{ start: number; end: number }>;
    timezone: string;
  };
  languagePreference: string;
}

export interface ConversationCriteria {
  targetUsers?: string[];
  topics?: string[];
  relationshipLevel?: 'stranger' | 'acquaintance' | 'friend' | 'close_friend';
  timeWindow?: { start: Date; end: Date };
  maxConversations?: number;
  purpose: 'networking' | 'support' | 'information_sharing' | 'social' | 'business';
}

export interface ResponseStrategy {
  responseDelay: { min: number; max: number }; // seconds
  personalityTone: 'helpful' | 'friendly' | 'professional' | 'casual';
  contextAwareness: number; // 0-1, how much to reference past conversations
  proactiveness: number; // 0-1, likelihood to ask follow-up questions
  empathyLevel: number; // 0-1, how empathetic responses should be
}

export class DirectMessagingSkill implements TelegramSkill {
  name = 'direct-messaging';
  description = 'Direct message handling with relationship context';
  
  private config?: TelegramConfig;
  private logger?: Logger;
  private userContexts: Map<string, DirectMessageContext> = new Map();
  private responseStrategies: Map<string, ResponseStrategy> = new Map();
  private conversationQueue: Array<{ userId: string; priority: number; scheduledTime: Date }> = [];
  private activeConversations: Set<string> = new Set();

  async initialize(config: TelegramConfig, logger: Logger): Promise<void> {
    this.config = config;
    this.logger = logger;
    
    await this.loadUserContexts();
    await this.loadResponseStrategies();
    
    // Start conversation queue processor
    this.startConversationProcessor();
  }

  async cleanup(): Promise<void> {
    await this.saveUserContexts();
    await this.saveResponseStrategies();
  }

  getActions(): Record<string, ExtensionAction> {
    return {
      respondToDirectMessages: {
        name: 'respondToDirectMessages',
        description: 'Automatically respond to direct messages with relationship context',
        category: ActionCategory.AUTONOMOUS,
        parameters: {
          strategy: {
            type: 'object',
            required: false,
            description: 'Response strategy configuration',
          },
          filters: {
            type: 'object',
            required: false,
            description: 'Message filtering criteria',
          },
        },
        execute: async (agent: Agent, params: SkillParameters): Promise<ActionResult> => {
          return this.respondToDirectMessages(agent, params);
        },
      },

      initiateConversations: {
        name: 'initiateConversations',
        description: 'Proactively initiate conversations based on criteria',
        category: ActionCategory.AUTONOMOUS,
        parameters: {
          criteria: {
            type: 'object',
            required: true,
            description: 'Conversation initiation criteria',
          },
        },
        execute: async (agent: Agent, params: SkillParameters): Promise<ActionResult> => {
          return this.initiateConversations(agent, params);
        },
      },
    };
  }

  private async respondToDirectMessages(agent: Agent, params: SkillParameters): Promise<ActionResult> {
    try {
      const strategy = params.strategy as ResponseStrategy;
      const filters = params.filters as any;

      // Get pending direct messages
      const pendingMessages = await this.getPendingDirectMessages(filters);
      let processedCount = 0;

      for (const message of pendingMessages) {
        try {
          await this.processDirectMessage(agent, message, strategy);
          processedCount++;
        } catch (error) {
          this.logger?.error(`Failed to process message from ${message.userId}`, error);
        }
      }

      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          processedMessages: processedCount,
          totalPending: pendingMessages.length,
        },
        metadata: { timestamp: new Date().toISOString() },
      };
    } catch (error) {
      this.logger?.error('Failed to respond to direct messages', error);
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: error instanceof Error ? error.message : String(error),
        metadata: { timestamp: new Date().toISOString() },
      };
    }
  }

  private async initiateConversations(agent: Agent, params: SkillParameters): Promise<ActionResult> {
    try {
      const criteria = params.criteria as ConversationCriteria;
      
      const targetUsers = await this.findConversationTargets(criteria);
      let initiatedCount = 0;

      for (const userId of targetUsers) {
        try {
          await this.scheduleConversation(userId, criteria);
          initiatedCount++;
        } catch (error) {
          this.logger?.error(`Failed to schedule conversation with ${userId}`, error);
        }
      }

      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          initiatedConversations: initiatedCount,
          totalTargets: targetUsers.length,
          queueSize: this.conversationQueue.length,
        },
        metadata: { timestamp: new Date().toISOString() },
      };
    } catch (error) {
      this.logger?.error('Failed to initiate conversations', error);
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: error instanceof Error ? error.message : String(error),
        metadata: { timestamp: new Date().toISOString() },
      };
    }
  }

  // Full implementation methods
  private async loadUserContexts(): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const contextPath = path.join(process.cwd(), 'data', 'telegram', 'user-contexts.json');
      
      try {
        const data = await fs.readFile(contextPath, 'utf-8');
        const contexts = JSON.parse(data);
        
        for (const [userId, contextData] of Object.entries(contexts)) {
          const context = contextData as any;
          // Convert date strings back to Date objects
          context.lastInteraction = new Date(context.lastInteraction);
          context.messageHistory = context.messageHistory.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          }));
          
          this.userContexts.set(userId, context as DirectMessageContext);
        }
        
        this.logger?.info(`Loaded contexts for ${this.userContexts.size} users`);
      } catch (fileError) {
        this.logger?.debug('No existing user contexts found, starting fresh');
      }
    } catch (error) {
      this.logger?.error('Failed to load user contexts', error);
    }
  }

  private async saveUserContexts(): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const contextDir = path.join(process.cwd(), 'data', 'telegram');
      const contextPath = path.join(contextDir, 'user-contexts.json');
      
      await fs.mkdir(contextDir, { recursive: true });
      
      const contexts = Object.fromEntries(
        Array.from(this.userContexts.entries()).map(([userId, context]) => [
          userId,
          {
            ...context,
            lastInteraction: context.lastInteraction.toISOString(),
            messageHistory: context.messageHistory.map(msg => ({
              ...msg,
              timestamp: msg.timestamp.toISOString(),
            })),
          },
        ])
      );
      
      await fs.writeFile(contextPath, JSON.stringify(contexts, null, 2), 'utf-8');
      this.logger?.debug(`Saved contexts for ${this.userContexts.size} users`);
    } catch (error) {
      this.logger?.error('Failed to save user contexts', error);
    }
  }

  private async loadResponseStrategies(): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const strategyPath = path.join(process.cwd(), 'data', 'telegram', 'response-strategies.json');
      
      try {
        const data = await fs.readFile(strategyPath, 'utf-8');
        const strategies = JSON.parse(data);
        
        for (const [userId, strategy] of Object.entries(strategies)) {
          this.responseStrategies.set(userId, strategy as ResponseStrategy);
        }
        
        this.logger?.info(`Loaded response strategies for ${this.responseStrategies.size} users`);
      } catch (fileError) {
        this.logger?.debug('No existing response strategies found, using defaults');
      }
    } catch (error) {
      this.logger?.error('Failed to load response strategies', error);
    }
  }

  private async saveResponseStrategies(): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const strategyDir = path.join(process.cwd(), 'data', 'telegram');
      const strategyPath = path.join(strategyDir, 'response-strategies.json');
      
      await fs.mkdir(strategyDir, { recursive: true });
      
      const strategies = Object.fromEntries(this.responseStrategies);
      
      await fs.writeFile(strategyPath, JSON.stringify(strategies, null, 2), 'utf-8');
      this.logger?.debug(`Saved response strategies for ${this.responseStrategies.size} users`);
    } catch (error) {
      this.logger?.error('Failed to save response strategies', error);
    }
  }

  private startConversationProcessor(): void {
    // Process conversation queue every 30 seconds
    setInterval(() => {
      this.processConversationQueue();
    }, 30000);
  }

  private async processConversationQueue(): Promise<void> {
    const now = new Date();
    const readyConversations = this.conversationQueue.filter(
      conv => conv.scheduledTime <= now && !this.activeConversations.has(conv.userId)
    );

    for (const conversation of readyConversations) {
      try {
        await this.initiateConversation(conversation.userId);
        
        // Remove from queue
        this.conversationQueue = this.conversationQueue.filter(
          conv => conv.userId !== conversation.userId
        );
      } catch (error) {
        this.logger?.error(`Failed to initiate conversation with ${conversation.userId}`, error);
      }
    }
  }

  private async getPendingDirectMessages(filters?: any): Promise<Array<{ userId: string; messageId: number; text: string; timestamp: Date }>> {
    // In a real implementation, this would fetch pending messages from storage or API
    return [];
  }

  private async processDirectMessage(agent: Agent, message: any, strategy?: ResponseStrategy): Promise<void> {
    const userId = message.userId;
    let context = this.userContexts.get(userId);
    
    if (!context) {
      context = this.createDefaultUserContext(userId);
      this.userContexts.set(userId, context);
    }

    // Update context with new message
    const dmMessage: DMMessage = {
      messageId: message.messageId,
      text: message.text,
      timestamp: message.timestamp,
      direction: 'incoming',
      sentiment: this.analyzeSentiment(message.text),
      topics: this.extractTopics(message.text),
    };

    context.messageHistory.push(dmMessage);
    context.lastInteraction = message.timestamp;
    context.topics = [...new Set([...context.topics, ...dmMessage.topics])];

    // Generate response using agent's cognition
    const response = await this.generateContextualResponse(agent, context, message.text, strategy);
    
    if (response) {
      // Send response (implementation would use Telegram API)
      await this.sendDirectMessage(userId, response);
      
      // Record outgoing message
      const outgoingMessage: DMMessage = {
        messageId: Date.now(), // Temporary ID
        text: response,
        timestamp: new Date(),
        direction: 'outgoing',
        sentiment: this.analyzeSentiment(response),
        topics: this.extractTopics(response),
        responseTime: Date.now() - message.timestamp.getTime(),
      };
      
      context.messageHistory.push(outgoingMessage);
    }
  }

  private async findConversationTargets(criteria: ConversationCriteria): Promise<string[]> {
    const targets: string[] = [];
    
    // Filter users based on criteria
    for (const [userId, context] of this.userContexts.entries()) {
      if (criteria.targetUsers && !criteria.targetUsers.includes(userId)) {
        continue;
      }
      
      if (criteria.relationshipLevel && context.relationshipLevel !== criteria.relationshipLevel) {
        continue;
      }
      
      if (criteria.topics && !criteria.topics.some(topic => context.topics.includes(topic))) {
        continue;
      }
      
      // Check if user is in preferred time window
      if (criteria.timeWindow) {
        const now = new Date();
        if (now < criteria.timeWindow.start || now > criteria.timeWindow.end) {
          continue;
        }
      }
      
      targets.push(userId);
      
      if (criteria.maxConversations && targets.length >= criteria.maxConversations) {
        break;
      }
    }
    
    return targets;
  }

  private async scheduleConversation(userId: string, criteria: ConversationCriteria): Promise<void> {
    const context = this.userContexts.get(userId);
    if (!context) return;

    // Calculate priority based on relationship level and last interaction
    let priority = 1;
    switch (context.relationshipLevel) {
      case 'close_friend': priority = 4; break;
      case 'friend': priority = 3; break;
      case 'acquaintance': priority = 2; break;
      case 'stranger': priority = 1; break;
    }

    // Adjust priority based on time since last interaction
    const daysSinceLastInteraction = (Date.now() - context.lastInteraction.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceLastInteraction > 7) priority += 1;
    if (daysSinceLastInteraction > 30) priority += 2;

    // Schedule conversation
    const scheduledTime = this.calculateOptimalTime(context);
    
    this.conversationQueue.push({
      userId,
      priority,
      scheduledTime,
    });

    // Sort queue by priority
    this.conversationQueue.sort((a, b) => b.priority - a.priority);
  }

  private async initiateConversation(userId: string): Promise<void> {
    const context = this.userContexts.get(userId);
    if (!context) return;

    this.activeConversations.add(userId);

    try {
      // Generate conversation starter based on context
      const starter = this.generateConversationStarter(context);
      
      if (starter) {
        await this.sendDirectMessage(userId, starter);
        
        // Record the initiated conversation
        const message: DMMessage = {
          messageId: Date.now(),
          text: starter,
          timestamp: new Date(),
          direction: 'outgoing',
          sentiment: 'neutral',
          topics: this.extractTopics(starter),
        };
        
        context.messageHistory.push(message);
        context.lastInteraction = new Date();
      }
    } finally {
      // Remove from active conversations after a delay
      setTimeout(() => {
        this.activeConversations.delete(userId);
      }, 300000); // 5 minutes
    }
  }

  private createDefaultUserContext(userId: string): DirectMessageContext {
    return {
      userId,
      username: 'Unknown',
      firstName: 'Unknown',
      isBot: false,
      lastInteraction: new Date(),
      messageHistory: [],
      relationshipLevel: 'stranger',
      topics: [],
      preferences: {
        communicationStyle: 'casual',
        responseSpeed: 'normal',
        topicInterests: [],
        timePreferences: {
          preferredHours: [{ start: 9, end: 17 }],
          timezone: 'UTC',
        },
        languagePreference: 'en',
      },
    };
  }

  private async generateContextualResponse(agent: Agent, context: DirectMessageContext, messageText: string, strategy?: ResponseStrategy): Promise<string | null> {
    try {
      if (!agent.portal) {
        return null;
      }

      // Build context for the agent
      const conversationContext = this.buildConversationContext(context, messageText);
      
      // Use agent's portal to generate response
      const response = await agent.portal.generateText(
        `You are having a direct message conversation with ${context.username}. 
        Relationship level: ${context.relationshipLevel}
        Previous topics: ${context.topics.join(', ')}
        Communication style: ${context.preferences.communicationStyle}
        
        Recent message: "${messageText}"
        
        Respond appropriately based on the relationship and context.`,
        {
          maxOutputTokens: 200,
          temperature: 0.7,
        }
      );

      return response.text;
    } catch (error) {
      this.logger?.error('Failed to generate contextual response', error);
      return null;
    }
  }

  private async sendDirectMessage(userId: string, message: string): Promise<void> {
    // In a real implementation, this would use the Telegram Bot API
    this.logger?.info(`Sending DM to ${userId}: ${message.substring(0, 50)}...`);
  }

  private buildConversationContext(context: DirectMessageContext, currentMessage: string): string {
    const recentMessages = context.messageHistory.slice(-5);
    const contextString = recentMessages
      .map(msg => `${msg.direction === 'incoming' ? context.username : 'You'}: ${msg.text}`)
      .join('\n');
    
    return `Recent conversation:\n${contextString}\n\nCurrent message: ${currentMessage}`;
  }

  private calculateOptimalTime(context: DirectMessageContext): Date {
    const now = new Date();
    const preferredHours = context.preferences.timePreferences.preferredHours;
    
    if (preferredHours.length === 0) {
      return new Date(now.getTime() + 60000); // 1 minute from now
    }
    
    // Find next preferred time window
    const currentHour = now.getHours();
    const nextWindow = preferredHours.find(window => currentHour < window.start);
    
    if (nextWindow) {
      const scheduledTime = new Date(now);
      scheduledTime.setHours(nextWindow.start, 0, 0, 0);
      return scheduledTime;
    } else {
      // Schedule for tomorrow's first window
      const scheduledTime = new Date(now);
      scheduledTime.setDate(scheduledTime.getDate() + 1);
      scheduledTime.setHours(preferredHours[0].start, 0, 0, 0);
      return scheduledTime;
    }
  }

  private generateConversationStarter(context: DirectMessageContext): string | null {
    const starters = {
      stranger: [
        "Hi! I noticed we haven't chatted before. How are you doing?",
        "Hello! Hope you're having a great day!",
      ],
      acquaintance: [
        `Hi ${context.firstName}! How have you been?`,
        `Hey! It's been a while since we last talked. What's new?`,
      ],
      friend: [
        `Hey ${context.firstName}! Just wanted to check in and see how you're doing.`,
        `Hi! I was thinking about our last conversation about ${context.topics[0] || 'that topic'}. Any updates?`,
      ],
      close_friend: [
        `Hey buddy! How's everything going?`,
        `Hi ${context.firstName}! Miss our chats. What's been keeping you busy?`,
      ],
    };

    const options = starters[context.relationshipLevel] || starters.stranger;
    return options[Math.floor(Math.random() * options.length)];
  }

  // Analysis helper methods
  private analyzeSentiment(text: string): 'positive' | 'negative' | 'neutral' {
    const positiveWords = ['good', 'great', 'awesome', 'excellent', 'amazing', 'love', 'like', 'happy', 'thanks'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'dislike', 'sad', 'angry', 'frustrated'];
    
    const lowerText = text.toLowerCase();
    const hasPositive = positiveWords.some(word => lowerText.includes(word));
    const hasNegative = negativeWords.some(word => lowerText.includes(word));
    
    if (hasPositive && !hasNegative) return 'positive';
    if (hasNegative && !hasPositive) return 'negative';
    return 'neutral';
  }

  private extractTopics(text: string): string[] {
    const topics: string[] = [];
    
    // Extract hashtags
    const hashtags = text.match(/#\w+/g);
    if (hashtags) {
      topics.push(...hashtags.map(tag => tag.substring(1).toLowerCase()));
    }
    
    // Extract common keywords
    const keywords = ['work', 'family', 'travel', 'food', 'music', 'movies', 'sports', 'technology', 'health', 'education'];
    const lowerText = text.toLowerCase();
    
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        topics.push(keyword);
      }
    }
    
    return [...new Set(topics)];
  }

  // Public methods for extension to use
  public async handleIncomingMessage(userId: string, messageText: string, messageId: number): Promise<void> {
    let context = this.userContexts.get(userId);
    if (!context) {
      context = this.createDefaultUserContext(userId);
      this.userContexts.set(userId, context);
    }

    const message: DMMessage = {
      messageId,
      text: messageText,
      timestamp: new Date(),
      direction: 'incoming',
      sentiment: this.analyzeSentiment(messageText),
      topics: this.extractTopics(messageText),
    };

    context.messageHistory.push(message);
    context.lastInteraction = new Date();
    
    // Update relationship level based on interaction frequency
    this.updateRelationshipLevel(context);
  }

  private updateRelationshipLevel(context: DirectMessageContext): void {
    const recentMessages = context.messageHistory.filter(
      msg => msg.timestamp > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
    );

    if (recentMessages.length > 50) {
      context.relationshipLevel = 'close_friend';
    } else if (recentMessages.length > 20) {
      context.relationshipLevel = 'friend';
    } else if (recentMessages.length > 5) {
      context.relationshipLevel = 'acquaintance';
    } else {
      context.relationshipLevel = 'stranger';
    }
  }

  public getUserContext(userId: string): DirectMessageContext | undefined {
    return this.userContexts.get(userId);
  }
}