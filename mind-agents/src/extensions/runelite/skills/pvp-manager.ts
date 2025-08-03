/**
 * PvP Combat Management Skill
 * Handles player vs player combat, events, and strategy
 */

import { v4 as uuidv4 } from 'uuid';
import { runtimeLogger } from '../../../utils/logger';
import { Agent, ExtensionAction, ActionCategory } from '../../../types/index';
import { ActionType, GameState, PlayerInfo, CombatInfo } from '../types';
import { BaseRuneLiteSkill, RuneLiteSkillConfig } from './base-runelite-skill';
import {
  PvPCombatConfig,
  PvPTarget,
  ActivityMetrics,
  AutonomousActivity,
  SkillName
} from './types';

export interface PvPManagerConfig extends RuneLiteSkillConfig {
  combatStyle: 'aggressive' | 'defensive' | 'balanced';
  safetyMode: boolean;
  riskAmount: number;
  targetLevel?: number;
  events: string[];
  maxCombatTime: number;
  autoRestock: boolean;
  foodType: string;
  prayerStyle: string[];
  escapeThreshold: number; // Health percentage to escape at
}

export interface PvPSession {
  id: string;
  startTime: number;
  endTime?: number;
  wins: number;
  losses: number;
  escapes: number;
  totalDamageDealt: number;
  totalDamageTaken: number;
  goldRisked: number;
  goldEarned: number;
  area: string;
}

export interface CombatTarget {
  playerName: string;
  combatLevel: number;
  location: { x: number; y: number; plane: number };
  equipment: any[];
  riskAssessment: 'low' | 'medium' | 'high';
  winChance: number;
  lastSeen: number;
  fightHistory: { wins: number; losses: number };
}

export interface PvPEvent {
  name: string;
  location: { x: number; y: number; plane: number };
  type: 'tournament' | 'event' | 'minigame';
  active: boolean;
  participants: number;
  rewards: string[];
}

export class PvPManagerSkill extends BaseRuneLiteSkill {
  private gameState: GameState;
  protected override config: PvPManagerConfig;
  private combatHistory = new Map<string, { wins: number; losses: number; lastFight: number }>();
  private activeSessions = new Map<string, PvPSession>();
  private currentTargets: CombatTarget[] = [];
  private lastCombatTime = 0;

  constructor(config: PvPManagerConfig, gameState: GameState) {
    super(config);
    this.config = config;
    this.gameState = gameState;
    this.initializePvPData();
  }

  getActions(): ExtensionAction[] {
    return [
      this.createAction(
        'startPvPSession',
        'Begin PvP combat session with specified configuration',
        ActionCategory.AUTONOMOUS,
        {
          combatStyle: { type: 'string', description: 'Combat style: aggressive, defensive, or balanced', optional: true },
          area: { type: 'string', description: 'PvP area: wilderness, clan_wars, or castle_wars', optional: true },
          duration: { type: 'number', description: 'Session duration in minutes', optional: true },
          riskAmount: { type: 'number', description: 'Maximum gold to risk', optional: true }
        },
        async (agent: Agent, params: any) => {
          return this.startPvPSession(params.combatStyle, params.area, params.duration, params.riskAmount);
        }
      ),

      this.createAction(
        'findTargets',
        'Search for suitable PvP targets in the area',
        ActionCategory.OBSERVATION,
        {
          combatLevel: { type: 'number', description: 'Target combat level range', optional: true },
          riskLevel: { type: 'string', description: 'Risk assessment: low, medium, or high', optional: true },
          maxTargets: { type: 'number', description: 'Maximum number of targets to find', optional: true }
        },
        async (agent: Agent, params: any) => {
          return this.findPvPTargets(params.combatLevel, params.riskLevel, params.maxTargets);
        }
      ),

      this.createAction(
        'engageTarget',
        'Engage a specific player in PvP combat',
        ActionCategory.AUTONOMOUS,
        {
          targetName: { type: 'string', description: 'Player name to attack' },
          combatStyle: { type: 'string', description: 'Combat style for this fight', optional: true },
          escapeHealth: { type: 'number', description: 'Health percentage to escape at', optional: true }
        },
        async (agent: Agent, params: any) => {
          return this.engageTarget(params.targetName, params.combatStyle, params.escapeHealth);
        }
      ),

      this.createAction(
        'joinPvPEvent',
        'Join or participate in PvP events',
        ActionCategory.AUTONOMOUS,
        {
          eventName: { type: 'string', description: 'Event name: clan_wars, castle_wars, bounty_hunter' },
          teamPreference: { type: 'string', description: 'Team preference if applicable', optional: true },
          duration: { type: 'number', description: 'Maximum participation time in minutes', optional: true }
        },
        async (agent: Agent, params: any) => {
          return this.joinPvPEvent(params.eventName, params.teamPreference, params.duration);
        }
      ),

      this.createAction(
        'manageCombat',
        'Manage ongoing combat actions and strategy',
        ActionCategory.AUTONOMOUS,
        {
          action: { type: 'string', description: 'Combat action: attack, defend, escape, use_special' },
          targetName: { type: 'string', description: 'Target player name', optional: true },
          useFood: { type: 'boolean', description: 'Use food during combat', optional: true }
        },
        async (agent: Agent, params: any) => {
          return this.manageCombat(params.action, params.targetName, params.useFood);
        }
      ),

      this.createAction(
        'analyzePvPArea',
        'Analyze current PvP area for opportunities and threats',
        ActionCategory.OBSERVATION,
        {
          includeHistory: { type: 'boolean', description: 'Include historical combat data', optional: true },
          scanRadius: { type: 'number', description: 'Scan radius in tiles', optional: true }
        },
        async (agent: Agent, params: any) => {
          return this.analyzePvPArea(params.includeHistory, params.scanRadius);
        }
      ),

      this.createAction(
        'getPvPStats',
        'Get PvP combat statistics and performance metrics',
        ActionCategory.OBSERVATION,
        {
          period: { type: 'string', description: 'Time period: session, day, week, month, or all', optional: true },
          includeDetails: { type: 'boolean', description: 'Include detailed combat history', optional: true }
        },
        async (agent: Agent, params: any) => {
          return this.getPvPStats(params.period, params.includeDetails);
        }
      ),

      this.createAction(
        'updatePvPConfig',
        'Update PvP manager configuration and strategy',
        ActionCategory.SYSTEM,
        {
          config: { type: 'object', description: 'Configuration updates' }
        },
        async (agent: Agent, params: any) => {
          this.updatePvPConfig(params.config);
          return { success: true, message: 'PvP configuration updated successfully' };
        }
      )
    ];
  }

  private initializePvPData(): void {
    // Initialize PvP locations and event data
    runtimeLogger.info('⚔️ PvP combat system initialized');
  }

  async startPvPSession(combatStyle?: string, area?: string, duration?: number, riskAmount?: number): Promise<{ sessionId: string; message: string }> {
    const sessionId = uuidv4();
    const pvpStyle = combatStyle || this.config.combatStyle;
    const pvpArea = area || 'wilderness';
    const sessionDuration = duration || 60; // Default 1 hour
    const maxRisk = riskAmount || this.config.riskAmount;

    const session: PvPSession = {
      id: sessionId,
      startTime: Date.now(),
      wins: 0,
      losses: 0,
      escapes: 0,
      totalDamageDealt: 0,
      totalDamageTaken: 0,
      goldRisked: maxRisk,
      goldEarned: 0,
      area: pvpArea
    };

    this.activeSessions.set(sessionId, session);

    runtimeLogger.info(`⚔️ Starting PvP session: ${pvpStyle} style in ${pvpArea} for ${sessionDuration} minutes`);

    // Move to PvP area if not already there
    if (!this.isInPvPArea()) {
      await this.moveToPvPArea(pvpArea);
    }

    // Start PvP combat loop
    this.executePvPSession(sessionId, pvpStyle, sessionDuration);

    return {
      sessionId,
      message: `PvP session started in ${pvpArea} with ${pvpStyle} combat style`
    };
  }

  async startPvPCombat(config: PvPCombatConfig): Promise<AutonomousActivity> {
    const sessionId = uuidv4();
    const session = await this.startPvPSession(config.combatStyle, 'wilderness', 60, config.riskAmount);
    
    const activity: AutonomousActivity = {
      id: sessionId,
      type: 'pvp_combat',
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

  private async executePvPSession(sessionId: string, combatStyle: string, duration: number): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    const startTime = Date.now();
    const endTime = startTime + duration * 60 * 1000;

    while (Date.now() < endTime && this.activeSessions.has(sessionId)) {
      try {
        // Check if still in PvP area
        if (!this.isInPvPArea()) {
          await this.moveToPvPArea(session.area);
          await this.randomDelay(5000, 10000);
          continue;
        }

        // Find and engage targets
        const targets = await this.findPvPTargets();
        if (targets.length > 0) {
          const bestTarget = this.selectBestTarget(targets, combatStyle);
          if (bestTarget) {
            await this.engageInPvPCombat(bestTarget, session);
          }
        }

        // Check for PvP events
        const activeEvents = this.getActivePvPEvents();
        if (activeEvents.length > 0 && this.config.events.length > 0) {
          const relevantEvent = activeEvents.find(event => 
            this.config.events.includes(event.name)
          );
          if (relevantEvent) {
            await this.participateInEvent(relevantEvent, session);
          }
        }

        // Wait before next cycle
        await this.randomDelay(15000, 30000);

      } catch (error) {
        runtimeLogger.error(`PvP session error: ${error}`);
        
        // Handle death or major errors
        if (this.isDeathError(error)) {
          await this.handlePvPDeath(session);
        }
        
        await this.randomDelay(10000, 15000);
      }
    }

    // End session
    session.endTime = Date.now();
    runtimeLogger.info(`⚔️ PvP session ${sessionId} completed`);
  }

  async findPvPTargets(combatLevel?: number, riskLevel?: string, maxTargets?: number): Promise<CombatTarget[]> {
    const targets: CombatTarget[] = [];
    const nearbyPlayers = this.gameState.players || [];
    const myLevel = this.gameState.player?.combatLevel || 1;
    const limit = maxTargets || 10;

    for (const player of nearbyPlayers.slice(0, limit)) {
      // Skip based on level criteria
      if (combatLevel && Math.abs(player.combatLevel - combatLevel) > 10) continue;
      if (player.combatLevel > myLevel + 15) continue;

      const riskAssessment = this.assessPvPRisk(player);
      if (riskLevel && riskAssessment !== riskLevel) continue;

      const winChance = this.calculateWinChance(player);
      const history = this.combatHistory.get(player.username) || { wins: 0, losses: 0 };

      const target: CombatTarget = {
        playerName: player.displayName || player.username,
        combatLevel: player.combatLevel,
        location: player.location,
        equipment: (player as any).equipment || [],
        riskAssessment,
        winChance,
        lastSeen: Date.now(),
        fightHistory: history
      };

      targets.push(target);
    }

    this.currentTargets = targets;
    return targets;
  }

  async engageTarget(targetName: string, combatStyle?: string, escapeHealth?: number): Promise<{ success: boolean; result: string }> {
    const target = this.currentTargets.find(t => t.playerName === targetName);
    if (!target) {
      return { success: false, result: `Target ${targetName} not found` };
    }

    const style = combatStyle || this.config.combatStyle;
    const escapeThreshold = escapeHealth || this.config.escapeThreshold;

    runtimeLogger.info(`⚔️ Engaging ${targetName} in PvP combat`);

    // Move to target location
    const distance = this.calculateDistance(target.location);
    if (distance > 1) {
      await this.moveToLocation(target.location);
    }

    // Prepare for combat
    await this.preparePvPCombat(target, style);

    // Initiate combat
    const combatResult = await this.executePvPCombat(target, escapeThreshold);
    
    // Record results
    this.recordCombatResult(target, combatResult);

    return {
      success: combatResult !== 'error',
      result: `Combat with ${targetName} ended: ${combatResult}`
    };
  }

  async joinPvPEvent(eventName: string, teamPreference?: string, duration?: number): Promise<{ success: boolean; message: string }> {
    const event = this.getActivePvPEvents().find(e => e.name === eventName);
    if (!event) {
      return { success: false, message: `Event ${eventName} not found or not active` };
    }

    const eventDuration = duration || 30; // Default 30 minutes

    runtimeLogger.info(`🎯 Joining PvP event: ${eventName}`);

    // Move to event location
    await this.moveToLocation(event.location);

    // Participate in event
    await this.participateInEvent(event, null, eventDuration);

    return {
      success: true,
      message: `Joined ${eventName} event`
    };
  }

  async manageCombat(action: string, targetName?: string, useFood?: boolean): Promise<{ success: boolean; action: string }> {
    switch (action) {
      case 'attack':
        if (!targetName) {
          return { success: false, action: 'No target specified for attack' };
        }
        await this.attackPlayer(targetName);
        break;

      case 'defend':
        await this.activateDefensivePrayers();
        break;

      case 'escape':
        await this.attemptEscape();
        break;

      case 'use_special':
        await this.useSpecialAttack();
        break;

      case 'heal':
        if (useFood !== false) {
          await this.eatFood();
        }
        break;

      default:
        return { success: false, action: `Unknown combat action: ${action}` };
    }

    return { success: true, action: `Executed ${action}` };
  }

  async analyzePvPArea(includeHistory?: boolean, scanRadius?: number): Promise<any> {
    const radius = scanRadius || 20;
    const nearbyPlayers = this.gameState.players || [];
    
    const analysis = {
      area: this.getCurrentPvPArea(),
      playerCount: nearbyPlayers.length,
      averageLevel: nearbyPlayers.reduce((sum, p) => sum + p.combatLevel, 0) / nearbyPlayers.length,
      riskAssessment: this.assessAreaRisk(nearbyPlayers),
      opportunityTargets: nearbyPlayers.filter(p => this.calculateWinChance(p) > 0.6),
      threats: nearbyPlayers.filter(p => p.combatLevel > (this.gameState.player?.combatLevel || 0) + 10),
      activeEvents: this.getActivePvPEvents(),
      recommendations: this.generatePvPRecommendations(nearbyPlayers),
      ...(includeHistory ? {
        historicalData: {
          totalFights: Array.from(this.combatHistory.values()).reduce((sum, h) => sum + h.wins + h.losses, 0),
          winRate: this.calculateOverallWinRate(),
          popularTargets: this.getMostFoughtPlayers(),
          bestPerformanceTime: this.getBestPerformanceTimeFrame()
        }
      } : {})
    };

    return analysis;
  }

  async getPvPStats(period?: string, includeDetails?: boolean): Promise<any> {
    const cutoffTime = this.getPeriodCutoff(period || 'all');
    const relevantSessions = Array.from(this.activeSessions.values()).filter(s => 
      s.startTime >= cutoffTime
    );

    const stats = {
      totalSessions: relevantSessions.length,
      totalWins: relevantSessions.reduce((sum, s) => sum + s.wins, 0),
      totalLosses: relevantSessions.reduce((sum, s) => sum + s.losses, 0),
      totalEscapes: relevantSessions.reduce((sum, s) => sum + s.escapes, 0),
      totalDamageDealt: relevantSessions.reduce((sum, s) => sum + s.totalDamageDealt, 0),
      totalDamageTaken: relevantSessions.reduce((sum, s) => sum + s.totalDamageTaken, 0),
      netGoldEarned: relevantSessions.reduce((sum, s) => sum + s.goldEarned - s.goldRisked, 0),
      winRate: 0,
      averageSessionLength: 0,
      favoriteArea: this.getMostPopularArea(relevantSessions),
      currentStreak: this.getCurrentWinStreak(),
      ...(includeDetails ? {
        detailedHistory: {
          recentSessions: relevantSessions.slice(-10),
          combatHistory: this.getDetailedCombatHistory(cutoffTime),
          performanceByArea: this.getPerformanceByArea(relevantSessions),
          performanceByStyle: this.getPerformanceByStyle()
        }
      } : {})
    };

    const totalFights = stats.totalWins + stats.totalLosses;
    if (totalFights > 0) {
      stats.winRate = stats.totalWins / totalFights;
    }

    if (relevantSessions.length > 0) {
      const totalDuration = relevantSessions.reduce((sum, s) => 
        sum + ((s.endTime || Date.now()) - s.startTime), 0
      );
      stats.averageSessionLength = totalDuration / relevantSessions.length / 60000; // Convert to minutes
    }



    return stats;
  }

  private async moveToPvPArea(area: string): Promise<void> {
    const destinations: Record<string, { x: number; y: number; plane: number }> = {
      wilderness: { x: 3093, y: 3520, plane: 0 },
      clan_wars: { x: 3327, y: 4751, plane: 0 },
      castle_wars: { x: 2440, y: 3090, plane: 0 },
      bounty_hunter: { x: 3093, y: 3520, plane: 0 }
    };

    const destination = (destinations[area] ?? destinations['wilderness'])!;
    await this.moveToLocation(destination);
    
    runtimeLogger.info(`🗺️ Moving to PvP area: ${area}`);
  }

  private async moveToLocation(location: { x: number; y: number; plane: number }): Promise<void> {
    // Integration point with movement system
    await this.randomDelay(2000, 5000);
  }

  private isInPvPArea(): boolean {
    if (!this.gameState.player) return false;
    
    const location = this.gameState.player.location;
    
    // Wilderness check
    if (location.y > 3520 && location.y < 3968) return true;
    
    // Clan Wars area
    if (location.x > 3300 && location.x < 3400 && location.y > 4700 && location.y < 4800) return true;
    
    // Castle Wars area
    if (location.x > 2420 && location.x < 2460 && location.y > 3070 && location.y < 3110) return true;
    
    return false;
  }

  private getCurrentPvPArea(): string {
    if (!this.gameState.player) return 'unknown';
    
    const location = this.gameState.player.location;
    
    if (location.y > 3520 && location.y < 3968) return 'wilderness';
    if (location.x > 3300 && location.x < 3400 && location.y > 4700 && location.y < 4800) return 'clan_wars';
    if (location.x > 2420 && location.x < 2460 && location.y > 3070 && location.y < 3110) return 'castle_wars';
    
    return 'safe_area';
  }

  private selectBestTarget(targets: CombatTarget[], combatStyle: string): CombatTarget | null {
    if (targets.length === 0) return null;

    let filteredTargets = targets;
    
    // Filter by safety mode
    if (this.config.safetyMode) {
      filteredTargets = targets.filter(t => 
        t.riskAssessment === 'low' && t.winChance > 0.6
      );
    }

    if (filteredTargets.length === 0) return null;

    // Select based on combat style
    switch (combatStyle) {
      case 'aggressive':
        return filteredTargets.reduce((best, current) =>
          current.combatLevel > best.combatLevel ? current : best
        );
      case 'defensive':
        return filteredTargets.reduce((best, current) =>
          current.winChance > best.winChance ? current : best
        );
      case 'balanced':
      default:
        return filteredTargets.reduce((best, current) => {
          const bestScore = best.winChance * 0.7 + (best.combatLevel / 126) * 0.3;
          const currentScore = current.winChance * 0.7 + (current.combatLevel / 126) * 0.3;
          return currentScore > bestScore ? current : best;
        });
    }
  }

  private assessPvPRisk(player: PlayerInfo): 'low' | 'medium' | 'high' {
    const myLevel = this.gameState.player?.combatLevel || 1;
    const levelDiff = player.combatLevel - myLevel;

    if (this.config.riskAmount > 100000) return 'high';
    if (levelDiff > 10) return 'high';
    if (levelDiff > 5) return 'medium';
    return 'low';
  }

  private assessAreaRisk(players: PlayerInfo[]): 'low' | 'medium' | 'high' {
    if (players.length > 10) return 'high';
    if (players.length > 5) return 'medium';
    return 'low';
  }

  private calculateWinChance(player: PlayerInfo): number {
    const myLevel = this.gameState.player?.combatLevel || 1;
    const levelDiff = myLevel - player.combatLevel;

    let winChance = 0.5; // Base 50% chance
    winChance += levelDiff * 0.02; // 2% per level difference

    // Factor in combat history
    const history = this.combatHistory.get(player.username);
    if (history) {
      const totalFights = history.wins + history.losses;
      if (totalFights > 0) {
        const historicalWinRate = history.wins / totalFights;
        winChance = winChance * 0.7 + historicalWinRate * 0.3;
      }
    }

    return Math.max(0, Math.min(1, winChance));
  }

  private calculateDistance(location: { x: number; y: number; plane: number }): number {
    if (!this.gameState.player) return 999;

    const myLocation = this.gameState.player.location;
    const dx = location.x - myLocation.x;
    const dy = location.y - myLocation.y;

    return Math.sqrt(dx * dx + dy * dy);
  }

  private async preparePvPCombat(target: CombatTarget, combatStyle: string): Promise<void> {
    // Eat food if health is low
    if (this.needsHealing()) {
      await this.eatFood();
    }

    // Activate prayers based on combat style
    if (combatStyle === 'aggressive') {
      await this.activateOffensivePrayers();
    } else if (combatStyle === 'defensive') {
      await this.activateDefensivePrayers();
    }

    runtimeLogger.info(`🛡️ Prepared for combat with ${target.playerName}`);
  }

  private async executePvPCombat(target: CombatTarget, escapeThreshold: number): Promise<'win' | 'loss' | 'escape' | 'error'> {
    const maxCombatTime = this.config.maxCombatTime * 1000;
    const startTime = Date.now();

    // Initiate attack
    await this.attackPlayer(target.playerName);

    while (Date.now() - startTime < maxCombatTime) {
      try {
        // Check if still in combat
        if (!this.isInCombat()) {
          break;
        }

        // Check health and escape if necessary
        if (this.getHealthPercentage() <= escapeThreshold) {
          await this.attemptEscape();
          return 'escape';
        }

        // Eat food if health is low
        if (this.needsHealing()) {
          await this.eatFood();
        }

        // Use special attack if available
        if (this.hasSpecialAttack()) {
          await this.useSpecialAttack();
        }

        await this.randomDelay(600, 1000);

      } catch (error) {
        runtimeLogger.error(`Combat error: ${error}`);
        return 'error';
      }
    }

    return this.determineCombatOutcome();
  }

  private async engageInPvPCombat(target: CombatTarget, session: PvPSession | null): Promise<void> {
    const result = await this.executePvPCombat(target, this.config.escapeThreshold);
    
    // Update session stats if provided
    if (session) {
      switch (result) {
        case 'win':
          session.wins++;
          session.goldEarned += Math.floor(Math.random() * 50000) + 10000;
          break;
        case 'loss':
          session.losses++;
          break;
        case 'escape':
          session.escapes++;
          break;
      }
    }

    this.recordCombatResult(target, result);
  }

  private getActivePvPEvents(): PvPEvent[] {
    return [
      {
        name: 'clan_wars',
        location: { x: 3327, y: 4751, plane: 0 },
        type: 'tournament' as const,
        active: Math.random() > 0.7,
        participants: Math.floor(Math.random() * 50),
        rewards: ['Combat experience', 'Clan points']
      },
      {
        name: 'castle_wars',
        location: { x: 2440, y: 3090, plane: 0 },
        type: 'minigame' as const,
        active: Math.random() > 0.5,
        participants: Math.floor(Math.random() * 100),
        rewards: ['Castle Wars tickets', 'Decorative armor']
      }
    ].filter(event => event.active);
  }

  private async participateInEvent(event: PvPEvent, session: PvPSession | null, duration?: number): Promise<void> {
    const eventDuration = duration || 30;
    
    runtimeLogger.info(`🎯 Participating in ${event.name} for ${eventDuration} minutes`);
    
    // Move to event location
    await this.moveToLocation(event.location);
    
    // Simulate event participation
    await this.randomDelay(eventDuration * 60 * 1000, eventDuration * 60 * 1000 + 10000);
  }

  private async attackPlayer(playerName: string): Promise<void> {
    runtimeLogger.info(`⚔️ Attacking ${playerName}`);
    // Integration point with combat system
    await this.randomDelay(500, 1000);
  }

  private async activateOffensivePrayers(): Promise<void> {
    // Activate strength/accuracy prayers
    await this.randomDelay(200, 500);
  }

  private async activateDefensivePrayers(): Promise<void> {
    // Activate protection prayers
    await this.randomDelay(200, 500);
  }

  private async eatFood(): Promise<void> {
    runtimeLogger.debug('🍖 Eating food');
    await this.randomDelay(200, 400);
  }

  private async useSpecialAttack(): Promise<void> {
    runtimeLogger.debug('✨ Using special attack');
    await this.randomDelay(300, 600);
  }

  private async attemptEscape(): Promise<void> {
    runtimeLogger.info('🏃 Attempting to escape combat');
    await this.randomDelay(1000, 2000);
  }

  private isInCombat(): boolean {
    return this.gameState.combat !== null;
  }

  private needsHealing(): boolean {
    return this.getHealthPercentage() < 0.7;
  }

  private getHealthPercentage(): number {
    if (!this.gameState.player) return 1.0;
    return this.gameState.player.hitpoints / this.gameState.player.maxHitpoints;
  }

  private hasSpecialAttack(): boolean {
    return Math.random() > 0.8; // Simplified special attack availability
  }

  private determineCombatOutcome(): 'win' | 'loss' | 'escape' {
    if (!this.gameState.player || this.gameState.player.hitpoints <= 0) {
      return 'loss';
    }
    return Math.random() > 0.5 ? 'win' : 'loss';
  }

  private recordCombatResult(target: CombatTarget, result: 'win' | 'loss' | 'escape' | 'error'): void {
    const history = this.combatHistory.get(target.playerName) || { wins: 0, losses: 0, lastFight: 0 };

    if (result === 'win') {
      history.wins++;
      runtimeLogger.info(`🏆 Won PvP fight against ${target.playerName}`);
    } else if (result === 'loss') {
      history.losses++;
      runtimeLogger.info(`💀 Lost PvP fight against ${target.playerName}`);
    } else if (result === 'escape') {
      runtimeLogger.info(`🏃 Escaped from fight with ${target.playerName}`);
    }

    history.lastFight = Date.now();
    this.combatHistory.set(target.playerName, history);
    this.lastCombatTime = Date.now();
  }

  private async handlePvPDeath(session: PvPSession): Promise<void> {
    runtimeLogger.warn('💀 Died in PvP combat, respawning...');
    
    // Wait for respawn
    await this.randomDelay(10000, 15000);
    
    // Check if should continue based on safety mode
    if (this.config.safetyMode) {
      runtimeLogger.info('🛡️ Stopping PvP due to death in safety mode');
      // End session or pause
    }
  }

  private isDeathError(error: any): boolean {
    return error && error.message && error.message.includes('death');
  }

  private generatePvPRecommendations(players: PlayerInfo[]): string[] {
    const recommendations = [];
    
    if (players.length === 0) {
      recommendations.push('Move to a more populated PvP area');
    }
    
    if (players.some(p => p.combatLevel > (this.gameState.player?.combatLevel || 0) + 20)) {
      recommendations.push('Consider moving to a lower level area');
    }
    
    if (this.getHealthPercentage() < 0.8) {
      recommendations.push('Restock food supplies before engaging');
    }
    
    return recommendations;
  }

  // Statistics helper methods
  private calculateOverallWinRate(): number {
    let totalWins = 0;
    let totalLosses = 0;
    
    for (const history of this.combatHistory.values()) {
      totalWins += history.wins;
      totalLosses += history.losses;
    }
    
    const totalFights = totalWins + totalLosses;
    return totalFights > 0 ? totalWins / totalFights : 0;
  }

  private getMostFoughtPlayers(): string[] {
    return Array.from(this.combatHistory.entries())
      .sort(([,a], [,b]) => (b.wins + b.losses) - (a.wins + a.losses))
      .slice(0, 5)
      .map(([playerName]) => playerName);
  }

  private getBestPerformanceTimeFrame(): string {
    // Simplified - would analyze historical performance by time
    return 'Evening hours (6-10 PM)';
  }

  private getMostPopularArea(sessions: PvPSession[]): string {
    const areaCounts = sessions.reduce((acc, session) => {
      acc[session.area] = (acc[session.area] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(areaCounts).sort(([,a], [,b]) => b - a)[0]?.[0] || 'wilderness';
  }

  private getCurrentWinStreak(): number {
    // Calculate current win streak
    let streak = 0;
    const recentFights = Array.from(this.combatHistory.values())
      .flatMap(history => 
        Array(history.wins).fill('win').concat(Array(history.losses).fill('loss'))
      )
      .slice(-10); // Last 10 fights

    for (let i = recentFights.length - 1; i >= 0; i--) {
      if (recentFights[i] === 'win') {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }

  private getDetailedCombatHistory(cutoffTime: number): any[] {
    return Array.from(this.combatHistory.entries())
      .filter(([, history]) => history.lastFight >= cutoffTime)
      .map(([playerName, history]) => ({
        playerName,
        wins: history.wins,
        losses: history.losses,
        lastFight: new Date(history.lastFight).toISOString()
      }));
  }

  private getPerformanceByArea(sessions: PvPSession[]): any {
    const areaStats = sessions.reduce((acc, session) => {
      if (!acc[session.area]) {
        acc[session.area] = { wins: 0, losses: 0, sessions: 0 };
      }
      acc[session.area].wins += session.wins;
      acc[session.area].losses += session.losses;
      acc[session.area].sessions += 1;
      return acc;
    }, {} as Record<string, any>);

    // Calculate win rates
    Object.keys(areaStats).forEach(area => {
      const stats = areaStats[area];
      const totalFights = stats.wins + stats.losses;
      stats.winRate = totalFights > 0 ? stats.wins / totalFights : 0;
    });

    return areaStats;
  }

  private getPerformanceByStyle(): any {
    // Would track performance by combat style - simplified
    return {
      aggressive: { winRate: 0.65, averageDamage: 850 },
      defensive: { winRate: 0.72, averageDamage: 650 },
      balanced: { winRate: 0.68, averageDamage: 750 }
    };
  }

  private getPeriodCutoff(period: string): number {
    const now = Date.now();
    switch (period) {
      case 'session': return this.lastCombatTime;
      case 'day': return now - 24 * 60 * 60 * 1000;
      case 'week': return now - 7 * 24 * 60 * 60 * 1000;
      case 'month': return now - 30 * 24 * 60 * 60 * 1000;
      default: return 0;
    }
  }

  updatePvPConfig(updates: Partial<PvPManagerConfig>): void {
    this.config = { ...this.config, ...updates };
    runtimeLogger.info('⚔️ PvP manager configuration updated');
  }

  updateGameState(gameState: GameState): void {
    this.gameState = gameState;
  }

  getAllActivities(): AutonomousActivity[] {
    return Array.from(this.activeSessions.values()).map(session => ({
      id: session.id,
      type: 'pvp_combat',
      status: session.endTime ? 'completed' : 'running',
      config: {} as PvPCombatConfig,
      startTime: session.startTime,
      progress: 0,
      metrics: {
        actionsPerformed: 0,
        experienceGained: {} as Record<SkillName, number>,
        goldEarned: session.goldEarned,
        timeElapsed: 0,
        efficiency: 0,
        successRate: 0,
        itemsGained: {},
        itemsLost: {},
      },
      errors: [],
      checkpoints: [],
    }));
  }

  stopActivity(activityId: string): boolean {
    const session = this.activeSessions.get(activityId);
    if (session && !session.endTime) {
      session.endTime = Date.now();
      return true;
    }
    return false;
  }

  private randomDelay(min: number, max: number): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
  }
}