/**
 * Quest Automation System
 * Handles quest progression, dialogue navigation, and task automation
 */

import { v4 as uuidv4 } from 'uuid';
import { runtimeLogger } from '../../../utils/logger';
import { Agent, ExtensionAction, ActionCategory } from '../../../types/index';
import { ActionType, GameState, QuestInfo, NPCInfo } from '../types';
import { BaseRuneLiteSkill, RuneLiteSkillConfig } from './base-runelite-skill';
import {
  QuestStep,
  QuestAction,
  QuestRequirement,
  ActivityMetrics,
  ActivityError,
  ErrorType,
  QuestCompletionConfig,
  AutonomousActivity,
  SkillName
} from './types';

// Quest step types and configurations
export interface QuestProgress {
  questId: number;
  questName: string;
  state: 'not_started' | 'in_progress' | 'completed';
  currentStep: number;
  steps: QuestStep[];
  startTime?: number;
  completedTime?: number;
  attempts: number;
  errors: string[];
}

export interface QuestManagerConfig extends RuneLiteSkillConfig {
  autoDialogue: boolean;
  skipCutscenes: boolean;
  useQuickTravel: boolean;
  safeMode: boolean;
  maxRetries: number;
}

export interface QuestManagerEventHandler {
  onQuestStarted?: (questProgress: QuestProgress) => void;
  onQuestCompleted?: (questProgress: QuestProgress) => void;
  onQuestStepCompleted?: (questProgress: QuestProgress, step: QuestStep) => void;
  onQuestStepFailed?: (questProgress: QuestProgress, step: QuestStep, error: string) => void;
  onDialogueReceived?: (npc: string, dialogue: string, options?: string[]) => void;
  onQuestFailed?: (questProgress: QuestProgress, error: string) => void;
}

// Pre-defined quest configurations for common quests
const QUEST_CONFIGURATIONS = new Map<string, QuestStep[]>([
  ['tutorial_island', [
    {
      id: 'start_tutorial',
      description: 'Begin Tutorial Island',
      actions: [{
        type: ActionType.CLICK_NPC,
        parameters: { npcName: 'RuneScape Guide' },
        description: 'Talk to RuneScape Guide'
      }],
      requirements: [],
      completed: false,
      optional: false,
      alternatives: []
    },
    {
      id: 'survival_expert',
      description: 'Learn survival skills',
      actions: [{
        type: ActionType.CLICK_NPC,
        parameters: { npcName: 'Survival Expert' },
        description: 'Talk to Survival Expert'
      }],
      requirements: [],
      completed: false,
      optional: false,
      alternatives: []
    }
  ]],
  
  ['cooks_assistant', [
    {
      id: 'talk_to_cook',
      description: 'Talk to the Cook in Lumbridge Castle',
      actions: [{
        type: ActionType.CLICK_NPC,
        parameters: { npcName: 'Cook' },
        description: 'Talk to the Cook'
      }],
      requirements: [],
      completed: false,
      optional: false,
      alternatives: []
    },
    {
      id: 'gather_ingredients',
      description: 'Collect egg, flour, and milk',
      actions: [
        {
          type: ActionType.CLICK_OBJECT,
          parameters: { objectName: 'Dairy cow' },
          description: 'Milk a cow for milk'
        },
        {
          type: ActionType.CLICK_OBJECT,
          parameters: { objectName: 'Wheat' },
          description: 'Pick wheat'
        }
      ],
      requirements: [],
      completed: false,
      optional: false,
      alternatives: []
    },
    {
      id: 'return_to_cook',
      description: 'Return ingredients to the Cook',
      actions: [{
        type: ActionType.CLICK_NPC,
        parameters: { npcName: 'Cook' },
        description: 'Give ingredients to Cook'
      }],
      requirements: [],
      completed: false,
      optional: false,
      alternatives: []
    }
  ]]
]);

export class QuestManagerSkill extends BaseRuneLiteSkill {
  private activeQuests = new Map<string, QuestProgress>();
  private gameState: GameState;
  protected override config: QuestManagerConfig;
  private eventHandler: QuestManagerEventHandler | undefined;

  constructor(config: QuestManagerConfig, gameState: GameState, eventHandler?: QuestManagerEventHandler) {
    super(config);
    this.config = config;
    this.gameState = gameState;
    this.eventHandler = eventHandler;
  }

  getActions(): ExtensionAction[] {
    return [
      this.createAction(
        'startQuest',
        'Start or resume a quest by name or ID',
        ActionCategory.AUTONOMOUS,
        {
          questIdentifier: { type: 'string', description: 'Quest name or ID to start/resume' },
          autoMode: { type: 'boolean', description: 'Enable automatic quest progression', optional: true },
          customSteps: { type: 'array', description: 'Custom quest steps to override defaults', optional: true }
        },
        async (agent: Agent, params: any) => {
          return this.startQuest(params.questIdentifier, params.autoMode ?? true, params.customSteps);
        }
      ),

      this.createAction(
        'pauseQuest',
        'Pause an active quest',
        ActionCategory.AUTONOMOUS,
        {
          questId: { type: 'string', description: 'Quest ID to pause' }
        },
        async (agent: Agent, params: any) => {
          return this.pauseQuest(params.questId);
        }
      ),

      this.createAction(
        'resumeQuest',
        'Resume a paused quest',
        ActionCategory.AUTONOMOUS,
        {
          questId: { type: 'string', description: 'Quest ID to resume' }
        },
        async (agent: Agent, params: any) => {
          return this.resumeQuest(params.questId);
        }
      ),

      this.createAction(
        'getQuestStatus',
        'Get status and progress of quests',
        ActionCategory.OBSERVATION,
        {
          questId: { type: 'string', description: 'Specific quest ID to check', optional: true }
        },
        async (agent: Agent, params: any) => {
          if (params.questId) {
            return this.getQuestProgress(params.questId);
          } else {
            return {
              activeQuests: Array.from(this.activeQuests.values()),
              completedQuests: this.getCompletedQuests(),
              availableQuests: this.getAvailableQuests()
            };
          }
        }
      ),

      this.createAction(
        'listAvailableQuests',
        'Get list of available quests based on current requirements',
        ActionCategory.OBSERVATION,
        {
          includeStarted: { type: 'boolean', description: 'Include already started quests', optional: true },
          filterByRequirements: { type: 'boolean', description: 'Filter by player requirements', optional: true }
        },
        async (agent: Agent, params: any) => {
          return this.getAvailableQuests(params.includeStarted, params.filterByRequirements);
        }
      ),

      this.createAction(
        'handleDialogue',
        'Handle NPC dialogue and make selections',
        ActionCategory.AUTONOMOUS,
        {
          npcName: { type: 'string', description: 'Name of NPC in dialogue' },
          response: { type: 'string', description: 'Response text or option number', optional: true },
          autoMode: { type: 'boolean', description: 'Auto-select best dialogue option', optional: true }
        },
        async (agent: Agent, params: any) => {
          return this.handleDialogue(params.npcName, params.response, params.autoMode ?? this.config.autoDialogue);
        }
      ),

      this.createAction(
        'updateQuestState',
        'Update quest progress and game state',
        ActionCategory.SYSTEM,
        {
          gameState: { type: 'object', description: 'Updated game state' },
          questUpdates: { type: 'object', description: 'Quest progress updates', optional: true }
        },
        async (agent: Agent, params: any) => {
          this.updateGameState(params.gameState);
          if (params.questUpdates) {
            this.updateQuestProgress(params.questUpdates);
          }
          return { success: true, message: 'Quest state updated successfully' };
        }
      ),

      this.createAction(
        'configureQuestManager',
        'Update quest manager configuration',
        ActionCategory.SYSTEM,
        {
          config: { type: 'object', description: 'Configuration updates' }
        },
        async (agent: Agent, params: any) => {
          this.updateQuestConfig(params.config);
          return { success: true, message: 'Quest manager configuration updated' };
        }
      )
    ];
  }

  async startQuest(questIdentifier: string, autoMode: boolean = true, customSteps?: QuestStep[]): Promise<QuestProgress> {
    const questId = uuidv4();
    
    // Find quest info from game state
    const questInfo = this.findQuestInfo(questIdentifier);
    if (!questInfo) {
      throw new Error(`Quest not found: ${questIdentifier}`);
    }

    // Check if already active
    const existing = Array.from(this.activeQuests.values()).find(q => 
      q.questName.toLowerCase() === questInfo.name.toLowerCase()
    );
    if (existing) {
      throw new Error(`Quest ${questInfo.name} is already active`);
    }

    // Get quest steps (custom or predefined)
    const steps = customSteps || this.getQuestSteps(questInfo.name) || [];
    if (steps.length === 0) {
      throw new Error(`No quest steps defined for ${questInfo.name}`);
    }

    const questProgress: QuestProgress = {
      questId: questInfo.id,
      questName: questInfo.name,
      state: 'in_progress',
      currentStep: 0,
      steps,
      startTime: Date.now(),
      attempts: 0,
      errors: []
    };

    this.activeQuests.set(questId, questProgress);
    
    runtimeLogger.info(`🗡️ Started quest: ${questInfo.name} (${questId})`);
    this.eventHandler?.onQuestStarted?.(questProgress);

    if (autoMode) {
      this.executeQuestLoop(questId);
    }

    return questProgress;
  }

  async startQuestCompletion(config: QuestCompletionConfig): Promise<AutonomousActivity> {
    const questProgress = await this.startQuest(config.questName, true);
    
    const activity: AutonomousActivity = {
      id: questProgress.questId.toString(),
      type: 'quest_completion',
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

  private async executeQuestLoop(questId: string): Promise<void> {
    const questProgress = this.activeQuests.get(questId);
    if (!questProgress) return;

    while (questProgress.state === 'in_progress' && questProgress.currentStep < questProgress.steps.length) {
      try {
        const currentStep = questProgress.steps[questProgress.currentStep];
        if (!currentStep) {
          questProgress.currentStep++;
          continue;
        }
        
        // Skip completed or optional failed steps
        if (currentStep.completed || (currentStep.optional && questProgress.attempts > this.config.maxRetries)) {
          questProgress.currentStep++;
          continue;
        }

        runtimeLogger.info(`🎯 Executing quest step: ${currentStep.description}`);
        
        // Check step requirements
        if (currentStep.requirements && !this.checkStepRequirements(currentStep.requirements)) {
          throw new Error(`Step requirements not met: ${currentStep.description}`);
        }

        // Execute step actions
        const success = await this.executeQuestStep(questProgress, currentStep);
        
        if (success) {
          currentStep.completed = true;
          questProgress.currentStep++;
          questProgress.attempts = 0;
          this.eventHandler?.onQuestStepCompleted?.(questProgress, currentStep);
          
          // Delay between steps
          await this.randomDelay(1000, 3000);
        } else {
          questProgress.attempts++;
          if (questProgress.attempts >= this.config.maxRetries) {
            if (currentStep.optional) {
              questProgress.currentStep++;
              questProgress.attempts = 0;
            } else {
              throw new Error(`Step failed after ${this.config.maxRetries} attempts: ${currentStep.description}`);
            }
          }
          
          // Retry delay
          await this.randomDelay(2000, 5000);
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        questProgress.errors.push(errorMessage);
        const failedStep = questProgress.steps[questProgress.currentStep];
        this.eventHandler?.onQuestStepFailed?.(questProgress, failedStep!, errorMessage);
        
        runtimeLogger.error(`❌ Quest step failed: ${errorMessage}`);
        
        if (!this.config.safeMode) {
          questProgress.state = 'not_started'; // Reset to allow retry
          this.eventHandler?.onQuestFailed?.(questProgress, errorMessage);
          break;
        }
        
        // In safe mode, pause and wait for manual intervention
        await this.randomDelay(10000, 15000);
      }
    }

    // Check if quest completed
    if (questProgress.currentStep >= questProgress.steps.length) {
      questProgress.state = 'completed';
      questProgress.completedTime = Date.now();
      this.eventHandler?.onQuestCompleted?.(questProgress);
      runtimeLogger.info(`✅ Quest completed: ${questProgress.questName}`);
    }
  }

  private async executeQuestStep(questProgress: QuestProgress, step: QuestStep): Promise<boolean> {
    // Travel to location if specified
    if (step.location && !this.isAtLocation(step.location)) {
      const travelSuccess = await this.travelToLocation(step.location);
      if (!travelSuccess) return false;
    }

    // Execute step actions
    for (const action of step.actions) {
      if (action.condition && !action.condition(this.gameState)) {
        continue;
      }

      const success = await this.executeQuestAction(action, questProgress.questName);
      if (!success && action.priority === 1) {
        return false; // Critical action failed
      }
    }

    // Verify step completion based on type
    return this.verifyStepCompletion(step);
  }

  private async executeQuestAction(action: QuestAction, questName: string): Promise<boolean> {
    try {
      // Log action execution
      runtimeLogger.debug(`Executing quest action: ${action.description}`);

      // Send action for execution (would be handled by main extension)
      // This would integrate with the game client
      
      await this.randomDelay(500, 1500);
      return true;
      
    } catch (error) {
      runtimeLogger.error(`Quest action failed: ${action.description}`, error);
      return false;
    }
  }

  private verifyStepCompletion(step: QuestStep): boolean {
    // Simplified step verification based on step type
    return true; // Would check actual game state
  }

  private async travelToLocation(location: any): Promise<boolean> {
    if (this.isAtLocation(location)) return true;
    
    // Implement pathfinding and travel logic
    runtimeLogger.info(`🏃 Traveling to location: ${JSON.stringify(location)}`);
    
    // This would use actual pathfinding and movement
    await this.randomDelay(2000, 8000);
    return true;
  }

  private isAtLocation(location: any, tolerance: number = 5): boolean {
    if (!this.gameState.player) return false;
    
    // Simplified location check
    return true; // Would check actual coordinates
  }

  private findQuestInfo(identifier: string): QuestInfo | null {
    return this.gameState.quests.find(quest => 
      quest.name.toLowerCase().includes(identifier.toLowerCase()) ||
      quest.id.toString() === identifier
    ) || null;
  }

  private getQuestSteps(questName: string): QuestStep[] | null {
    const normalizedName = questName.toLowerCase().replace(/\s+/g, '_');
    return QUEST_CONFIGURATIONS.get(normalizedName) || null;
  }

  private checkStepRequirements(requirements: any[]): boolean {
    // Simplified requirement checking
    return true; // Would check actual requirements
  }

  async handleDialogue(npcName: string, response?: string, autoMode: boolean = true): Promise<{ success: boolean; message: string }> {
    runtimeLogger.info(`💬 Handling dialogue with ${npcName}`);
    
    if (autoMode && !response) {
      // Auto-select the most appropriate dialogue option
      response = "1"; // Default to first option
    }

    if (response) {
      // Execute dialogue selection
      // This would interface with the game client's dialogue system
      await this.randomDelay(500, 1500);
    }

    return { success: true, message: `Dialogue handled with ${npcName}` };
  }

  pauseQuest(questId: string): { success: boolean; message: string } {
    const quest = this.activeQuests.get(questId);
    if (!quest) {
      return { success: false, message: `Quest not found: ${questId}` };
    }

    quest.state = 'not_started'; // Paused state
    runtimeLogger.info(`⏸️ Paused quest: ${quest.questName}`);
    return { success: true, message: `Quest paused: ${quest.questName}` };
  }

  resumeQuest(questId: string): { success: boolean; message: string } {
    const quest = this.activeQuests.get(questId);
    if (!quest) {
      return { success: false, message: `Quest not found: ${questId}` };
    }

    quest.state = 'in_progress';
    quest.attempts = 0;
    this.executeQuestLoop(questId);
    
    runtimeLogger.info(`▶️ Resumed quest: ${quest.questName}`);
    return { success: true, message: `Quest resumed: ${quest.questName}` };
  }

  getQuestProgress(questId: string): QuestProgress | null {
    return this.activeQuests.get(questId) || null;
  }

  getCompletedQuests(): QuestInfo[] {
    return this.gameState.quests.filter(quest => quest.state === 'completed');
  }

  getAvailableQuests(includeStarted: boolean = false, filterByRequirements: boolean = true): QuestInfo[] {
    return this.gameState.quests.filter(quest => {
      if (!includeStarted && quest.state === 'in_progress') return false;
      if (quest.state === 'completed') return false;
      
      // Add requirement filtering logic here if needed
      return true;
    });
  }

  updateGameState(gameState: GameState): void {
    this.gameState = gameState;
  }

  updateQuestProgress(updates: any): void {
    // Update quest progress from external sources
    for (const [questId, quest] of this.activeQuests.entries()) {
      if (updates[questId]) {
        Object.assign(quest, updates[questId]);
      }
    }
  }

  updateQuestConfig(updates: Partial<QuestManagerConfig>): void {
    this.config = { ...this.config, ...updates };
    runtimeLogger.info('🔧 Quest manager configuration updated');
  }

  getAllActivities(): AutonomousActivity[] {
    return Array.from(this.activeQuests.values()).map(quest => ({
      id: quest.questId.toString(),
      type: 'quest_completion',
      status: quest.state === 'completed' ? 'completed' : quest.state === 'in_progress' ? 'running' : 'idle',
      config: {} as QuestCompletionConfig,
      startTime: quest.startTime || Date.now(),
      progress: quest.currentStep / quest.steps.length,
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
      errors: quest.errors.map(error => ({ timestamp: Date.now(), type: 'quest_blocked' as ErrorType, message: error, context: {}, recovered: false })),
      checkpoints: [],
    }));
  }

  stopActivity(activityId: string): boolean {
    const quest = this.activeQuests.get(activityId);
    if (quest && quest.state === 'in_progress') {
      quest.state = 'not_started';
      return true;
    }
    return false;
  }

  private randomDelay(min: number, max: number): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
  }
}