/**
 * Social Interaction Management Skill
 * Handles social interactions, community building, and communication
 */

import { v4 as uuidv4 } from 'uuid';
import { runtimeLogger } from '../../../utils/logger';
import { Agent, ExtensionAction, ActionCategory } from '../../../types/index';
import { ActionType, GameState, PlayerInfo } from '../types';
import { BaseRuneLiteSkill, RuneLiteSkillConfig } from './base-runelite-skill';
import {
  SocialInteractionConfig,
  SocialEvent,
  ActivityMetrics,
  AutonomousActivity,
  SkillName
} from './types';

export interface SocialManagerConfig extends RuneLiteSkillConfig {
  mode: 'friendly' | 'helpful' | 'competitive' | 'observer';
  activities: SocialActivity[];
  clanName?: string;
  helpNewbies: boolean;
  participateEvents: boolean;
  communicationStyle: CommunicationStyle;
  responsePatterns: ResponsePattern[];
  maxInteractionsPerHour: number;
  friendsListManagement: boolean;
}

export interface SocialActivity {
  type: 'clan_chat' | 'help_newbies' | 'group_training' | 'events' | 'competitions' | 'trading';
  enabled: boolean;
  priority: number;
  cooldown: number; // in minutes
}

export interface CommunicationStyle {
  formality: 'casual' | 'formal' | 'friendly';
  helpfulness: 'low' | 'medium' | 'high';
  chattiness: 'quiet' | 'normal' | 'talkative';
  humor: boolean;
  patience: 'low' | 'medium' | 'high';
}

export interface ResponsePattern {
  trigger: string; // regex pattern
  responses: string[];
  cooldown: number; // in seconds
  context?: string[];
}

export interface PlayerInteraction {
  id: string;
  playerName: string;
  type: 'greeting' | 'help' | 'conversation' | 'competition' | 'clan';
  timestamp: number;
  message: string;
  success: boolean;
  response?: string;
}

export class SocialManagerSkill extends BaseRuneLiteSkill {
  private gameState: GameState;
  protected override config: SocialManagerConfig;
  private playerInteractions = new Map<string, number>(); // Track interaction frequency
  private interactionHistory: PlayerInteraction[] = [];
  private helpfulResponses: string[] = [];
  private lastInteractionTime = 0;

  constructor(config: SocialManagerConfig, gameState: GameState) {
    super(config);
    this.config = config;
    this.gameState = gameState;
    this.initializeSocialResponses();
  }

  getActions(): ExtensionAction[] {
    return [
      this.createAction(
        'sendMessage',
        'Send a message to a specific player or channel',
        ActionCategory.AUTONOMOUS,
        {
          target: { type: 'string', description: 'Player name or channel (public, clan, private)' },
          message: { type: 'string', description: 'Message content to send' },
          messageType: { type: 'string', description: 'Message type: public, private, clan, or friends', optional: true }
        },
        async (agent: Agent, params: any) => {
          return this.sendMessage(params.target, params.message, params.messageType);
        }
      ),

      this.createAction(
        'startSocialSession',
        'Begin automated social interaction session',
        ActionCategory.AUTONOMOUS,
        {
          mode: { type: 'string', description: 'Social mode: friendly, helpful, competitive, or observer', optional: true },
          duration: { type: 'number', description: 'Session duration in minutes', optional: true },
          targetActivities: { type: 'array', description: 'Specific activities to focus on', optional: true }
        },
        async (agent: Agent, params: any) => {
          return this.startSocialSession(params.mode, params.duration, params.targetActivities);
        }
      ),

      this.createAction(
        'manageFriends',
        'Manage friends list and relationships',
        ActionCategory.AUTONOMOUS,
        {
          action: { type: 'string', description: 'Action: add, remove, message, or status' },
          playerName: { type: 'string', description: 'Player name for the action', optional: true },
          message: { type: 'string', description: 'Message to send (for message action)', optional: true }
        },
        async (agent: Agent, params: any) => {
          return this.manageFriends(params.action, params.playerName, params.message);
        }
      ),

      this.createAction(
        'joinClan',
        'Join or manage clan membership',
        ActionCategory.AUTONOMOUS,
        {
          clanName: { type: 'string', description: 'Name of clan to join or manage' },
          action: { type: 'string', description: 'Action: join, leave, or participate', optional: true }
        },
        async (agent: Agent, params: any) => {
          return this.manageClan(params.clanName, params.action);
        }
      ),

      this.createAction(
        'moderateChat',
        'Moderate chat interactions and respond to violations',
        ActionCategory.AUTONOMOUS,
        {
          reportViolations: { type: 'boolean', description: 'Report rule violations', optional: true },
          helpModerators: { type: 'boolean', description: 'Assist moderators when needed', optional: true }
        },
        async (agent: Agent, params: any) => {
          return this.moderateChat(params.reportViolations, params.helpModerators);
        }
      ),

      this.createAction(
        'respondToHelp',
        'Respond to player help requests in chat',
        ActionCategory.AUTONOMOUS,
        {
          autoRespond: { type: 'boolean', description: 'Automatically respond to help requests', optional: true },
          responseDelay: { type: 'number', description: 'Delay before responding in seconds', optional: true }
        },
        async (agent: Agent, params: any) => {
          return this.handleHelpRequests(params.autoRespond, params.responseDelay);
        }
      ),

      this.createAction(
        'analyzeConversations',
        'Analyze recent conversations for insights',
        ActionCategory.OBSERVATION,
        {
          timeFrame: { type: 'number', description: 'Time frame to analyze in hours', optional: true },
          includePrivate: { type: 'boolean', description: 'Include private messages in analysis', optional: true }
        },
        async (agent: Agent, params: any) => {
          return this.analyzeConversations(params.timeFrame, params.includePrivate);
        }
      ),

      this.createAction(
        'getSocialStats',
        'Get social interaction statistics and metrics',
        ActionCategory.OBSERVATION,
        {
          period: { type: 'string', description: 'Time period: day, week, month, or all', optional: true }
        },
        async (agent: Agent, params: any) => {
          return this.getSocialStats(params.period);
        }
      ),

      this.createAction(
        'updateSocialConfig',
        'Update social manager configuration',
        ActionCategory.SYSTEM,
        {
          config: { type: 'object', description: 'Configuration updates' }
        },
        async (agent: Agent, params: any) => {
          this.updateSocialConfig(params.config);
          return { success: true, message: 'Social configuration updated successfully' };
        }
      )
    ];
  }

  private initializeSocialResponses(): void {
    this.helpfulResponses = [
      "Welcome to RuneScape! Need any help getting started?",
      "That's a great question! Here's what I'd suggest...",
      "I remember when I was starting out too. Try this...",
      "Happy to help! The best way to do that is...",
      "Good luck with your goals! Feel free to ask if you need more help.",
      "That area can be tricky. Here's a tip...",
      "Nice progress! Keep it up!",
      "I'd recommend checking out the wiki for detailed guides.",
      "That's a common question. The answer is...",
      "Great choice of skill to train! Here's an efficient method..."
    ];

    runtimeLogger.info('🤝 Social interaction responses initialized');
  }

  async sendMessage(target: string, message: string, messageType: string = 'public'): Promise<{ success: boolean; messageId: string }> {
    const messageId = uuidv4();
    
    // Check rate limiting
    if (!this.canSendMessage()) {
      return { success: false, messageId: '' };
    }

    // Record interaction
    const interaction: PlayerInteraction = {
      id: messageId,
      playerName: target,
      type: this.classifyMessageType(message),
      timestamp: Date.now(),
      message: message,
      success: true
    };

    this.interactionHistory.push(interaction);
    this.lastInteractionTime = Date.now();

    runtimeLogger.info(`💬 Sent ${messageType} message to ${target}: ${message.substring(0, 50)}...`);

    // Integration point with game client
    await this.randomDelay(1000, 2000);

    return { success: true, messageId };
  }

  async startSocialSession(mode?: string, duration?: number, targetActivities?: string[]): Promise<{ sessionId: string; message: string }> {
    const sessionId = uuidv4();
    const socialMode = mode || this.config.mode;
    const sessionDuration = duration || 60; // Default 1 hour
    
    runtimeLogger.info(`🤝 Starting social session: ${socialMode} mode for ${sessionDuration} minutes`);

    // Start social interaction loop
    this.executeSocialLoop(sessionId, socialMode, sessionDuration, targetActivities);

    return {
      sessionId,
      message: `Social session started in ${socialMode} mode`
    };
  }

  async startSocialInteraction(config: SocialInteractionConfig): Promise<AutonomousActivity> {
    const sessionId = uuidv4();
    const session = await this.startSocialSession(config.mode, 60, config.activities);
    
    const activity: AutonomousActivity = {
      id: sessionId,
      type: 'social_interaction',
      status: 'running',
      config,
      startTime: Date.now(),
      progress: 0,
      metrics: {
        actionsPerformed: 0,
        experienceGained: {} as Record<SkillName, number>,
        goldEarned: 0,
        timeElapsed: 0,
        efficiency: 0,
        successRate: 0,
        itemsGained: {},
        itemsLost: {},
      },
      errors: [],
      checkpoints: [],
    };

    return activity;
  }

  private async executeSocialLoop(sessionId: string, mode: string, duration: number, targetActivities?: string[]): Promise<void> {
    const startTime = Date.now();
    const endTime = startTime + duration * 60 * 1000;

    while (Date.now() < endTime) {
      try {
        // Execute based on mode
        switch (mode) {
          case 'friendly':
            await this.executeFriendlyMode();
            break;
          case 'helpful':
            await this.executeHelpfulMode();
            break;
          case 'competitive':
            await this.executeCompetitiveMode();
            break;
          case 'observer':
            await this.executeObserverMode();
            break;
        }

        // Handle clan activities if configured
        if (this.config.clanName) {
          await this.handleClanActivities();
        }

        // Participate in events if enabled
        if (this.config.participateEvents) {
          await this.participateInEvents();
        }

        // Wait before next iteration
        await this.randomDelay(15000, 30000); // 15-30 seconds

      } catch (error) {
        runtimeLogger.error(`Social loop error: ${error}`);
        await this.randomDelay(10000, 15000);
      }
    }

    runtimeLogger.info(`🤝 Social session ${sessionId} completed`);
  }

  private async executeFriendlyMode(): Promise<void> {
    const nearbyPlayers = this.getNearbyPlayers();
    
    for (const player of nearbyPlayers.slice(0, 2)) {
      if (!this.canInteractWithPlayer(player.username)) continue;

      await this.sendFriendlyMessage(player);
      this.playerInteractions.set(player.username, Date.now());
      
      await this.randomDelay(5000, 10000);
    }
  }

  private async executeHelpfulMode(): Promise<void> {
    // Monitor chat for help requests
    const helpRequests = this.detectHelpRequests();
    
    for (const request of helpRequests) {
      await this.respondToHelpRequest(request);
      await this.randomDelay(3000, 5000);
    }

    // Proactively help new players
    const newPlayers = this.identifyNewPlayers();
    for (const player of newPlayers.slice(0, 1)) {
      await this.offerHelp(player);
      await this.randomDelay(10000, 15000);
    }
  }

  private async executeCompetitiveMode(): Promise<void> {
    const competitors = this.findCompetitors();
    
    for (const competitor of competitors.slice(0, 2)) {
      await this.engageInCompetition(competitor);
      await this.randomDelay(10000, 20000);
    }
  }

  private async executeObserverMode(): Promise<void> {
    // Just observe and collect data about social interactions
    const conversations = this.observeConversations();
    
    // Log interesting patterns or events
    for (const conversation of conversations) {
      if (this.isInterestingConversation(conversation)) {
        runtimeLogger.info(`👁️ Observed interesting conversation: ${conversation.topic}`);
      }
    }
  }

  async manageFriends(action: string, playerName?: string, message?: string): Promise<{ success: boolean; result: string }> {
    switch (action) {
      case 'add':
        if (!playerName) {
          return { success: false, result: 'Player name required for add action' };
        }
        return this.addFriend(playerName);
        
      case 'remove':
        if (!playerName) {
          return { success: false, result: 'Player name required for remove action' };
        }
        return this.removeFriend(playerName);
        
      case 'message':
        if (!playerName || !message) {
          return { success: false, result: 'Player name and message required for message action' };
        }
        const result = await this.sendMessage(playerName, message, 'private');
        return { success: result.success, result: result.success ? 'Message sent' : 'Failed to send message' };
        
      case 'status':
        return this.getFriendsStatus();
        
      default:
        return { success: false, result: 'Invalid action. Use: add, remove, message, or status' };
    }
  }

  async manageClan(clanName: string, action: string = 'join'): Promise<{ success: boolean; result: string }> {
    switch (action) {
      case 'join':
        return this.joinClanChat(clanName);
        
      case 'leave':
        return this.leaveClanChat();
        
      case 'participate':
        return this.participateInClanChat();
        
      default:
        return { success: false, result: 'Invalid action. Use: join, leave, or participate' };
    }
  }

  async moderateChat(reportViolations: boolean = true, helpModerators: boolean = true): Promise<{ violations: number; actions: string[] }> {
    const violations = this.detectChatViolations();
    const actions: string[] = [];

    for (const violation of violations) {
      if (reportViolations) {
        await this.reportViolation(violation);
        actions.push(`Reported ${violation.type} by ${violation.player}`);
      }
    }

    if (helpModerators) {
      const moderatorRequests = this.detectModeratorRequests();
      for (const request of moderatorRequests) {
        await this.assistModerator(request);
        actions.push(`Assisted moderator with ${request.type}`);
      }
    }

    return { violations: violations.length, actions };
  }

  async handleHelpRequests(autoRespond: boolean = true, responseDelay: number = 2): Promise<{ requestsHandled: number; responses: string[] }> {
    const helpRequests = this.detectHelpRequests();
    const responses: string[] = [];

    if (!autoRespond) {
      return { requestsHandled: 0, responses: [] };
    }

    for (const request of helpRequests) {
      await this.randomDelay(responseDelay * 1000, (responseDelay + 2) * 1000);
      
      const response = await this.respondToHelpRequest(request);
      if (response.success) {
        responses.push(response.message);
      }
    }

    return { requestsHandled: helpRequests.length, responses };
  }

  async analyzeConversations(timeFrame: number = 24, includePrivate: boolean = false): Promise<any> {
    const cutoffTime = Date.now() - timeFrame * 60 * 60 * 1000;
    const recentInteractions = this.interactionHistory.filter(interaction => 
      interaction.timestamp >= cutoffTime &&
      (includePrivate || interaction.type !== 'conversation')
    );

    const analysis = {
      totalInteractions: recentInteractions.length,
      interactionTypes: this.analyzeInteractionTypes(recentInteractions),
      mostActivePlayer: this.findMostActivePlayer(recentInteractions),
      sentimentAnalysis: this.analyzeSentiment(recentInteractions),
      topics: this.extractTopics(recentInteractions),
      engagement: this.calculateEngagement(recentInteractions),
      recommendations: this.generateSocialRecommendations(recentInteractions)
    };

    return analysis;
  }

  async getSocialStats(period: string = 'all'): Promise<any> {
    const cutoffTime = this.getPeriodCutoff(period);
    const relevantInteractions = this.interactionHistory.filter(interaction => 
      interaction.timestamp >= cutoffTime
    );

    const stats = {
      totalInteractions: relevantInteractions.length,
      uniquePlayers: new Set(relevantInteractions.map(i => i.playerName)).size,
      averageInteractionsPerDay: this.calculateDailyAverage(relevantInteractions),
      successRate: relevantInteractions.filter(i => i.success).length / relevantInteractions.length,
      mostHelpfulResponses: this.getMostHelpfulResponses(relevantInteractions),
      socialNetworkSize: this.calculateNetworkSize(),
      engagementMetrics: this.calculateEngagementMetrics(relevantInteractions)
    };

    return stats;
  }

  private async sendFriendlyMessage(player: PlayerInfo): Promise<void> {
    const friendlyMessages = [
      `Hello ${player.displayName}! How's your day going?`,
      `Hey there! Nice to see you around!`,
      `Greetings! Hope you're having fun!`,
      `Hi! Love your outfit!`,
      `Hello! Great weather we're having, isn't it?`
    ];

    const message = friendlyMessages[Math.floor(Math.random() * friendlyMessages.length)] || "Hello there!";
    await this.sendMessage(player.displayName || "Player", message);
    
    runtimeLogger.info(`🤝 Sent friendly message to ${player.displayName}`);
  }

  private detectHelpRequests(): SocialEvent[] {
    // Mock help requests - would analyze recent chat
    return [
      {
        type: 'help_request',
        participants: ['NewPlayer123'],
        description: 'How do I get to Varrock?',
        priority: 2
      },
      {
        type: 'help_request',
        participants: ['Beginner456'],
        description: 'Where can I buy food?',
        priority: 1
      }
    ];
  }

  private async respondToHelpRequest(request: SocialEvent): Promise<{ success: boolean; message: string }> {
    let response = '';
    
    if (request.description.toLowerCase().includes('varrock')) {
      response = "To get to Varrock, you can walk north from Lumbridge or use the Varrock teleport if you have the magic level!";
    } else if (request.description.toLowerCase().includes('food')) {
      response = "You can buy food from general stores, or cook your own! There's a general store in most major cities.";
    } else if (request.description.toLowerCase().includes('money') || request.description.toLowerCase().includes('gp')) {
      response = "Good ways to make money early on include fishing, woodcutting, or completing easy quests. Check out the stronghold of security too!";
    } else {
      response = this.helpfulResponses[Math.floor(Math.random() * this.helpfulResponses.length)] || "I'm here to help!";
    }

    const result = await this.sendMessage(request.participants[0] || "Player", response);
    
    runtimeLogger.info(`💡 Responded to help request: ${request.description}`);
    return { success: result.success, message: response };
  }

  private identifyNewPlayers(): PlayerInfo[] {
    return this.getNearbyPlayers().filter(player => 
      player.combatLevel < 20 || player.totalLevel < 100
    );
  }

  private async offerHelp(player: PlayerInfo): Promise<void> {
    const helpOffers = [
      `Hi ${player.displayName}! I see you're new to the game. Need any tips?`,
      `Welcome to RuneScape! If you have any questions, feel free to ask!`,
      `Hey there! I'm happy to help if you need any guidance getting started!`
    ];

    const message = helpOffers[Math.floor(Math.random() * helpOffers.length)] || "Need any help getting started?";
    await this.sendMessage(player.displayName || "Player", message);
    
    runtimeLogger.info(`🆘 Offered help to new player: ${player.displayName}`);
  }

  private findCompetitors(): PlayerInfo[] {
    const myLevel = this.gameState.player?.combatLevel || 1;
    
    return this.getNearbyPlayers().filter(player => 
      Math.abs(player.combatLevel - myLevel) <= 10
    );
  }

  private async engageInCompetition(competitor: PlayerInfo): Promise<void> {
    const competitiveMessages = [
      `Nice stats ${competitor.displayName}! Want to see who can get more XP in the next hour?`,
      `Hey ${competitor.displayName}, fancy a friendly competition?`,
      `Impressive level! I bet I can out-fish you though 😉`,
      `Race you to the next level!`
    ];

    const message = competitiveMessages[Math.floor(Math.random() * competitiveMessages.length)] ?? "Good luck!";
    await this.sendMessage(competitor.displayName ?? "Player", message);
    
    runtimeLogger.info(`🏆 Engaged in competition with: ${competitor.displayName}`);
  }

  private canSendMessage(): boolean {
    const timeSinceLastMessage = Date.now() - this.lastInteractionTime;
    const minInterval = 60000 / this.config.maxInteractionsPerHour; // Convert to milliseconds
    
    return timeSinceLastMessage >= minInterval;
  }

  private canInteractWithPlayer(playerName: string): boolean {
    const lastInteraction = this.playerInteractions.get(playerName) || 0;
    const timeSinceLastInteraction = Date.now() - lastInteraction;
    
    return timeSinceLastInteraction > 300000; // 5 minutes cooldown
  }

  private classifyMessageType(message: string): 'greeting' | 'help' | 'conversation' | 'competition' | 'clan' {
    if (message.toLowerCase().includes('help') || message.includes('?')) return 'help';
    if (message.toLowerCase().includes('competition') || message.toLowerCase().includes('race')) return 'competition';
    if (message.toLowerCase().includes('clan')) return 'clan';
    if (message.toLowerCase().includes('hello') || message.toLowerCase().includes('hi')) return 'greeting';
    return 'conversation';
  }

  private getNearbyPlayers(): PlayerInfo[] {
    return this.gameState.players || [];
  }

  private async addFriend(playerName: string): Promise<{ success: boolean; result: string }> {
    runtimeLogger.info(`👥 Adding ${playerName} to friends list`);
    // Integration point with game client
    await this.randomDelay(1000, 2000);
    return { success: true, result: `Added ${playerName} to friends list` };
  }

  private async removeFriend(playerName: string): Promise<{ success: boolean; result: string }> {
    runtimeLogger.info(`👥 Removing ${playerName} from friends list`);
    // Integration point with game client
    await this.randomDelay(1000, 2000);
    return { success: true, result: `Removed ${playerName} from friends list` };
  }

  private getFriendsStatus(): { success: boolean; result: string } {
    // Mock friends list status
    return { 
      success: true, 
      result: 'Friends list: 15 online, 8 offline' 
    };
  }

  private async joinClanChat(clanName: string): Promise<{ success: boolean; result: string }> {
    runtimeLogger.info(`🏰 Joining clan chat: ${clanName}`);
    await this.randomDelay(2000, 3000);
    return { success: true, result: `Joined ${clanName} clan chat` };
  }

  private async leaveClanChat(): Promise<{ success: boolean; result: string }> {
    runtimeLogger.info(`🏰 Leaving clan chat`);
    await this.randomDelay(1000, 2000);
    return { success: true, result: 'Left clan chat' };
  }

  private async participateInClanChat(): Promise<{ success: boolean; result: string }> {
    const clanMessages = [
      "Hey clan! How's everyone doing today?",
      "Anyone up for some group activities?",
      "Congrats on the level ups everyone!",
      "Great to see the clan so active!",
      "Anyone need help with anything?"
    ];

    const message = clanMessages[Math.floor(Math.random() * clanMessages.length)] ?? "Hello clan!";
    await this.sendMessage('clan', message, 'clan');
    
    return { success: true, result: 'Participated in clan chat' };
  }

  private async handleClanActivities(): Promise<void> {
    if (this.config.activities.some(a => a.type === 'clan_chat' && a.enabled)) {
      await this.participateInClanChat();
    }
  }

  private async participateInEvents(): Promise<void> {
    const activeEvents = this.getActiveEvents();
    
    for (const event of activeEvents) {
      if (this.shouldParticipateInEvent(event)) {
        await this.joinEvent(event);
      }
    }
  }

  private getActiveEvents(): SocialEvent[] {
    return [
      {
        type: 'community_event',
        participants: ['Player1', 'Player2', 'Player3'],
        location: { x: 3164, y: 3464, plane: 0 },
        description: 'Drop party at Grand Exchange',
        priority: 2
      }
    ];
  }

  private shouldParticipateInEvent(event: SocialEvent): boolean {
    return event.priority >= 2;
  }

  private async joinEvent(event: SocialEvent): Promise<void> {
    await this.sendMessage('public', `Joining the ${event.description}! This looks fun!`);
    runtimeLogger.info(`🎊 Joined community event: ${event.description}`);
  }

  private observeConversations(): any[] {
    // Mock conversation observation
    return [
      { topic: 'quest help', participants: 2, sentiment: 'positive' },
      { topic: 'trading', participants: 3, sentiment: 'neutral' }
    ];
  }

  private isInterestingConversation(conversation: any): boolean {
    return conversation.participants > 2 || conversation.sentiment === 'negative';
  }

  private detectChatViolations(): any[] {
    // Mock violation detection
    return [];
  }

  private async reportViolation(violation: any): Promise<void> {
    runtimeLogger.info(`🚨 Reported violation: ${violation.type}`);
  }

  private detectModeratorRequests(): any[] {
    return [];
  }

  private async assistModerator(request: any): Promise<void> {
    runtimeLogger.info(`🛡️ Assisted moderator with ${request.type}`);
  }

  // Analysis helper methods
  private analyzeInteractionTypes(interactions: PlayerInteraction[]): Record<string, number> {
    const types: Record<string, number> = {};
    for (const interaction of interactions) {
      types[interaction.type] = (types[interaction.type] || 0) + 1;
    }
    return types;
  }

  private findMostActivePlayer(interactions: PlayerInteraction[]): string {
    const playerCounts: Record<string, number> = {};
    for (const interaction of interactions) {
      playerCounts[interaction.playerName] = (playerCounts[interaction.playerName] || 0) + 1;
    }
    
    return Object.entries(playerCounts).sort(([,a], [,b]) => b - a)[0]?.[0] || 'None';
  }

  private analyzeSentiment(interactions: PlayerInteraction[]): { positive: number; neutral: number; negative: number } {
    // Simplified sentiment analysis
    return { positive: 70, neutral: 25, negative: 5 };
  }

  private extractTopics(interactions: PlayerInteraction[]): string[] {
    return ['quests', 'trading', 'skills', 'general chat'];
  }

  private calculateEngagement(interactions: PlayerInteraction[]): number {
    return interactions.filter(i => i.success).length / Math.max(interactions.length, 1);
  }

  private generateSocialRecommendations(interactions: PlayerInteraction[]): string[] {
    return [
      "Continue being helpful to new players",
      "Participate more in clan activities",
      "Consider organizing group events",
      "Maintain positive communication style"
    ];
  }

  private calculateDailyAverage(interactions: PlayerInteraction[]): number {
    if (interactions.length === 0) return 0;
    
    const daySpan = (Date.now() - (interactions[0]?.timestamp ?? Date.now())) / (24 * 60 * 60 * 1000);
    return interactions.length / Math.max(daySpan, 1);
  }

  private getMostHelpfulResponses(interactions: PlayerInteraction[]): string[] {
    return interactions
      .filter(i => i.type === 'help' && i.success)
      .map(i => i.message)
      .slice(0, 5);
  }

  private calculateNetworkSize(): number {
    return new Set(this.interactionHistory.map(i => i.playerName)).size;
  }

  private calculateEngagementMetrics(interactions: PlayerInteraction[]): any {
    return {
      responseRate: interactions.filter(i => i.response).length / interactions.length,
      averageResponseTime: 30, // seconds
      repeatInteractions: interactions.filter(i => 
        interactions.some(other => other.playerName === i.playerName && other.id !== i.id)
      ).length
    };
  }

  private getPeriodCutoff(period: string): number {
    const now = Date.now();
    switch (period) {
      case 'day': return now - 24 * 60 * 60 * 1000;
      case 'week': return now - 7 * 24 * 60 * 60 * 1000;
      case 'month': return now - 30 * 24 * 60 * 60 * 1000;
      default: return 0;
    }
  }

  updateSocialConfig(updates: Partial<SocialManagerConfig>): void {
    this.config = { ...this.config, ...updates };
    runtimeLogger.info('🤝 Social manager configuration updated');
  }

  updateGameState(gameState: GameState): void {
    this.gameState = gameState;
  }

  getAllActivities(): AutonomousActivity[] {
    // Return empty array since social manager doesn't track active sessions
    return [];
  }

  stopActivity(activityId: string): boolean {
    // Stop social session
    return true;
  }

  private randomDelay(min: number, max: number): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
  }
}