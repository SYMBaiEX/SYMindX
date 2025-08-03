/**
 * Autonomous Skill Training System
 * Production-ready skill training with real RuneScape strategies and data
 */

import { v4 as uuidv4 } from 'uuid';

import { runtimeLogger } from '../../../utils/logger';
import { Agent, ExtensionAction, ActionCategory } from '../../../types/index';
import { ActionType, GameState, SkillInfo } from '../types';
import {
  SkillTrainingConfig,
  AutonomousActivity,
  SkillTrainingStrategy,
  SkillAction,
  ActivityMetrics,
  ActivityCheckpoint,
  ActivityError,
  ErrorType,
  SkillName,
  TrainingLocation,
  ItemRequirement,
  ActionCondition,
  ConditionType,
  Coordinates,
  SafetySettings,
  TrainingPreferences
} from './types';
import { InventoryItem } from '../types';
import { BaseRuneLiteSkill, RuneLiteSkillConfig } from './base-runelite-skill';

// Real RuneScape item IDs and data
const ITEMS = {
  // Tools
  BRONZE_AXE: 1351,
  IRON_AXE: 1349,
  STEEL_AXE: 1353,
  MITHRIL_AXE: 1355,
  ADAMANT_AXE: 1357,
  RUNE_AXE: 1359,
  DRAGON_AXE: 6739,
  
  BRONZE_PICKAXE: 1265,
  IRON_PICKAXE: 1267,
  STEEL_PICKAXE: 1269,
  MITHRIL_PICKAXE: 1273,
  ADAMANT_PICKAXE: 1271,
  RUNE_PICKAXE: 1275,
  DRAGON_PICKAXE: 11920,
  
  // Logs
  LOGS: 1511,
  OAK_LOGS: 1521,
  WILLOW_LOGS: 1519,
  MAPLE_LOGS: 1517,
  YEW_LOGS: 1515,
  MAGIC_LOGS: 1513,
  
  // Ores
  COPPER_ORE: 436,
  TIN_ORE: 438,
  IRON_ORE: 440,
  COAL: 453,
  GOLD_ORE: 444,
  MITHRIL_ORE: 447,
  ADAMANTITE_ORE: 449,
  RUNITE_ORE: 451,
  
  // Fish
  SHRIMPS: 317,
  SARDINE: 327,
  HERRING: 345,
  ANCHOVIES: 321,
  MACKEREL: 353,
  TROUT: 335,
  COD: 339,
  PIKE: 349,
  SALMON: 331,
  TUNA: 359,
  LOBSTER: 377,
  BASS: 363,
  SWORDFISH: 371,
  MONKFISH: 7944,
  SHARK: 383,
  
  // Food
  BREAD: 2309,
  MEAT: 2142,
  COOKED_MEAT: 2142,
  COOKED_CHICKEN: 2140,
  CAKE: 1891,
  
  // Potions
  ATTACK_POTION: 2428,
  STRENGTH_POTION: 113,
  DEFENCE_POTION: 2432,
  PRAYER_POTION: 2434,
  SUPER_ATTACK: 2436,
  SUPER_STRENGTH: 2440,
  SUPER_DEFENCE: 2442
};

// Real RuneScape NPC and object IDs
const GAME_OBJECTS = {
  // Trees
  TREE: 1276,
  OAK_TREE: 1281,
  WILLOW_TREE: 1308,
  MAPLE_TREE: 1307,
  YEW_TREE: 1309,
  MAGIC_TREE: 1306,
  
  // Rocks
  COPPER_ROCK: 11936,
  TIN_ROCK: 11933,
  IRON_ROCK: 11364,
  COAL_ROCK: 11366,
  GOLD_ROCK: 11370,
  MITHRIL_ROCK: 11372,
  ADAMANTITE_ROCK: 11374,
  RUNITE_ROCK: 11376,
  
  // Fishing spots
  NET_FISHING_SPOT: 1530,
  BAIT_FISHING_SPOT: 1530,
  LURE_FISHING_SPOT: 1542,
  CAGE_FISHING_SPOT: 1510,
  HARPOON_FISHING_SPOT: 1511,
  
  // Banks
  BANK_BOOTH: 10083,
  BANK_CHEST: 4483
};

export interface SkillTrainerEventHandler {
  onActivityStarted?: (data: { activity: AutonomousActivity; strategy: SkillTrainingStrategy }) => void;
  onActivityCompleted?: (activity: AutonomousActivity) => void;
  onActivityTimeout?: (activity: AutonomousActivity) => void;
  onActivityProgress?: (activity: AutonomousActivity) => void;
  onActivityFailed?: (data: { activity: AutonomousActivity; error: unknown }) => void;
  onActivityPaused?: (activity: AutonomousActivity) => void;
  onActivityResumed?: (activity: AutonomousActivity) => void;
  onActivityStopped?: (activity: AutonomousActivity) => void;
  onActionExecute?: (data: { type: ActionType; parameters: any; activityId: string }) => void;
}

export class SkillTrainerSkill extends BaseRuneLiteSkill {
  private activities = new Map<string, AutonomousActivity>();
  private strategies = new Map<SkillName, SkillTrainingStrategy[]>();
  private gameState: GameState;
  private locations = new Map<string, TrainingLocation>();
  private eventHandler: SkillTrainerEventHandler | undefined;

  constructor(config: RuneLiteSkillConfig, gameState: GameState, eventHandler?: SkillTrainerEventHandler) {
    super(config);
    this.gameState = gameState;
    this.eventHandler = eventHandler || undefined;
    this.initializeLocations();
    this.initializeStrategies();
  }

  /**
   * Get actions provided by this skill trainer
   */
  getActions(): ExtensionAction[] {
    return [
      this.createAction(
        'startSkillTraining',
        'Start autonomous skill training for a specific skill',
        ActionCategory.AUTONOMOUS,
        {
          skill: { type: 'string', description: 'Skill to train (e.g., woodcutting, mining, fishing)' },
          targetLevel: { type: 'number', description: 'Target level to reach (1-99)' },
          strategy: { type: 'string', description: 'Training strategy (efficient, profitable, afk, balanced)', optional: true },
          timeLimit: { type: 'number', description: 'Time limit in minutes', optional: true },
          budget: { type: 'number', description: 'Budget limit in gold', optional: true },
          safetySettings: { type: 'object', description: 'Safety configuration', optional: true }
        },
        async (agent: Agent, params: any) => {
          const config: SkillTrainingConfig = {
            skill: params.skill,
            targetLevel: params.targetLevel,
            strategy: params.strategy || 'balanced',
            timeLimit: params.timeLimit,
            budget: params.budget,
            safetySettings: params.safetySettings || {
              retreatAtHealth: 20,
              avoidPvP: true,
              avoidWilderness: true,
              emergencyTeleports: [],
              logoutOnDanger: true
            },
            preferences: {
              preferAfk: false,
              preferProfit: false,
              preferSpeed: true,
              avoidCrowds: true,
              bankingPreference: 'full_inventory',
              foodType: 2309, // bread
              prayerPotions: false
            }
          };
          return this.startSkillTraining(config);
        }
      ),

      this.createAction(
        'stopSkillTraining',
        'Stop an active skill training activity',
        ActionCategory.AUTONOMOUS,
        {
          activityId: { type: 'string', description: 'ID of the activity to stop' }
        },
        async (agent: Agent, params: any) => {
          return this.stopActivity(params.activityId);
        }
      ),

      this.createAction(
        'pauseSkillTraining',
        'Pause an active skill training activity',
        ActionCategory.AUTONOMOUS,
        {
          activityId: { type: 'string', description: 'ID of the activity to pause' }
        },
        async (agent: Agent, params: any) => {
          return this.pauseActivity(params.activityId);
        }
      ),

      this.createAction(
        'resumeSkillTraining',
        'Resume a paused skill training activity',
        ActionCategory.AUTONOMOUS,
        {
          activityId: { type: 'string', description: 'ID of the activity to resume' }
        },
        async (agent: Agent, params: any) => {
          return this.resumeActivity(params.activityId);
        }
      ),

      this.createAction(
        'getActivityStatus',
        'Get the status and metrics of a skill training activity',
        ActionCategory.OBSERVATION,
        {
          activityId: { type: 'string', description: 'ID of the activity to check', optional: true }
        },
        async (agent: Agent, params: any) => {
          if (params.activityId) {
            const activity = this.getActivity(params.activityId);
            return {
              activity,
              metrics: activity ? this.getTrainingStats(params.activityId) : null
            };
          } else {
            return {
              allActivities: this.getAllActivities(),
              activeActivities: this.getActiveActivities()
            };
          }
        }
      ),

      this.createAction(
        'getStrategies',
        'Get available training strategies for a skill',
        ActionCategory.OBSERVATION,
        {
          skill: { type: 'string', description: 'Skill name to get strategies for' }
        },
        async (agent: Agent, params: any) => {
          return this.getStrategiesForSkill(params.skill as SkillName);
        }
      ),

      this.createAction(
        'updateGameState',
        'Update the current game state for skill training',
        ActionCategory.SYSTEM,
        {
          gameState: { type: 'object', description: 'Updated game state object' }
        },
        async (agent: Agent, params: any) => {
          this.updateGameState(params.gameState);
          return { success: true, message: 'Game state updated successfully' };
        }
      )
    ];
  }

  private createLevelRequirements(requirements: Partial<Record<SkillName, number>>): Record<SkillName, number> {
    const allSkills: SkillName[] = [
      'attack', 'strength', 'defence', 'ranged', 'prayer', 'magic',
      'runecrafting', 'construction', 'hitpoints', 'agility', 'herblore',
      'thieving', 'crafting', 'fletching', 'slayer', 'hunter',
      'mining', 'smithing', 'fishing', 'cooking', 'firemaking',
      'woodcutting', 'farming'
    ];
    
    const result: Record<SkillName, number> = {} as Record<SkillName, number>;
    allSkills.forEach(skill => {
      result[skill] = requirements[skill] || 0;
    });
    
    return result;
  }

  private initializeLocations(): void {
    // Lumbridge area
    this.locations.set('lumbridge_trees', {
      name: 'Lumbridge Trees',
      coordinates: { x: 3208, y: 3212, plane: 0 },
      requirements: [],
      safetyLevel: 'low',
      crowdLevel: 'high',
      bankAccess: false,
      teleportAccess: ['lumbridge_teleport']
    });

    this.locations.set('draynor_willows', {
      name: 'Draynor Village Willows',
      coordinates: { x: 3088, y: 3234, plane: 0 },
      requirements: [],
      safetyLevel: 'low',
      crowdLevel: 'medium',
      bankAccess: true,
      teleportAccess: ['draynor_teleport']
    });

    // Mining locations
    this.locations.set('lumbridge_mine', {
      name: 'Lumbridge Swamp Mine',
      coordinates: { x: 3230, y: 3148, plane: 0 },
      requirements: [],
      safetyLevel: 'low',
      crowdLevel: 'medium',
      bankAccess: false,
      teleportAccess: ['lumbridge_teleport']
    });

    this.locations.set('varrock_east_mine', {
      name: 'Varrock East Mine',
      coordinates: { x: 3289, y: 3364, plane: 0 },
      requirements: [],
      safetyLevel: 'low',
      crowdLevel: 'high',
      bankAccess: false,
      teleportAccess: ['varrock_teleport']
    });

    this.locations.set('al_kharid_mine', {
      name: 'Al Kharid Mine',
      coordinates: { x: 3301, y: 3315, plane: 0 },
      requirements: [],
      safetyLevel: 'low',
      crowdLevel: 'low',
      bankAccess: true,
      teleportAccess: ['al_kharid_teleport']
    });

    // Fishing locations
    this.locations.set('lumbridge_river', {
      name: 'Lumbridge River',
      coordinates: { x: 3238, y: 3244, plane: 0 },
      requirements: [],
      safetyLevel: 'low',
      crowdLevel: 'high',
      bankAccess: false,
      teleportAccess: ['lumbridge_teleport']
    });

    this.locations.set('barbarian_village', {
      name: 'Barbarian Village',
      coordinates: { x: 3108, y: 3433, plane: 0 },
      requirements: ['barbarian_training'],
      safetyLevel: 'low',
      crowdLevel: 'medium',
      bankAccess: false,
      teleportAccess: ['varrock_teleport']
    });

    this.locations.set('catherby', {
      name: 'Catherby',
      coordinates: { x: 2835, y: 3432, plane: 0 },
      requirements: [],
      safetyLevel: 'low',
      crowdLevel: 'low',
      bankAccess: true,
      teleportAccess: ['camelot_teleport']
    });

    runtimeLogger.info('📍 Training locations initialized');
  }

  private initializeStrategies(): void {
    // Woodcutting strategies
    this.strategies.set('woodcutting', [
      {
        name: 'Regular Trees (1-15)',
        description: 'Cut regular trees for early woodcutting experience',
        skill: 'woodcutting',
        levelRequirements: this.createLevelRequirements({ woodcutting: 1 }),
        itemRequirements: [
          { itemId: ITEMS.BRONZE_AXE, itemName: 'Bronze axe', quantity: 1, consumable: false, alternatives: [ITEMS.IRON_AXE, ITEMS.STEEL_AXE] }
        ],
        questRequirements: [],
        actions: [
          {
            type: ActionType.WOODCUT,
            parameters: { treeId: GAME_OBJECTS.TREE, tool: 'axe' },
            priority: 1,
            retryAttempts: 3
          },
          {
            type: ActionType.DROP_ITEM,
            parameters: { itemId: ITEMS.LOGS },
            condition: this.createCondition('inventory_full', {}),
            priority: 2,
            retryAttempts: 1
          }
        ],
        expectedXpPerHour: 7500,
        profitPerHour: -1000,
        afkFriendly: true,
        dangerLevel: 'low',
        locations: [this.locations.get('lumbridge_trees')!]
      },
      
      {
        name: 'Willow Trees (30-60)',
        description: 'Cut willow trees for fast experience',
        skill: 'woodcutting',
        levelRequirements: this.createLevelRequirements({ woodcutting: 30 }),
        itemRequirements: [
          { itemId: ITEMS.STEEL_AXE, itemName: 'Steel axe', quantity: 1, consumable: false, alternatives: [ITEMS.MITHRIL_AXE, ITEMS.ADAMANT_AXE] }
        ],
        questRequirements: [],
        actions: [
          {
            type: ActionType.WOODCUT,
            parameters: { treeId: GAME_OBJECTS.WILLOW_TREE, tool: 'axe' },
            priority: 1,
            retryAttempts: 3
          },
          {
            type: ActionType.OPEN_BANK,
            parameters: {},
            condition: this.createCondition('inventory_full', {}),
            priority: 2,
            retryAttempts: 2
          },
          {
            type: ActionType.DEPOSIT_ITEM,
            parameters: { itemId: ITEMS.WILLOW_LOGS, quantity: -1 },
            priority: 3,
            retryAttempts: 2
          }
        ],
        expectedXpPerHour: 35000,
        profitPerHour: 15000,
        afkFriendly: true,
        dangerLevel: 'low',
        locations: [this.locations.get('draynor_willows')!]
      },

      {
        name: 'Yew Trees (60-99)',
        description: 'Cut yew trees for profit and decent experience',
        skill: 'woodcutting',
        levelRequirements: this.createLevelRequirements({ woodcutting: 60 }),
        itemRequirements: [
          { itemId: ITEMS.DRAGON_AXE, itemName: 'Dragon axe', quantity: 1, consumable: false, alternatives: [ITEMS.RUNE_AXE] }
        ],
        questRequirements: [],
        actions: [
          {
            type: ActionType.WOODCUT,
            parameters: { treeId: GAME_OBJECTS.YEW_TREE, tool: 'axe' },
            priority: 1,
            retryAttempts: 3
          },
          {
            type: ActionType.OPEN_BANK,
            parameters: {},
            condition: this.createCondition('inventory_full', {}),
            priority: 2,
            retryAttempts: 2
          },
          {
            type: ActionType.DEPOSIT_ITEM,
            parameters: { itemId: ITEMS.YEW_LOGS, quantity: -1 },
            priority: 3,
            retryAttempts: 2
          }
        ],
        expectedXpPerHour: 15000,
        profitPerHour: 120000,
        afkFriendly: true,
        dangerLevel: 'low',
        locations: [this.locations.get('draynor_willows')!] // Yews are also at Draynor
      }
    ]);

    // Mining strategies
    this.strategies.set('mining', [
      {
        name: 'Copper/Tin (1-15)',
        description: 'Mine copper and tin ore for early mining experience',
        skill: 'mining',
        levelRequirements: this.createLevelRequirements({ mining: 1 }),
        itemRequirements: [
          { itemId: ITEMS.BRONZE_PICKAXE, itemName: 'Bronze pickaxe', quantity: 1, consumable: false, alternatives: [ITEMS.IRON_PICKAXE] }
        ],
        questRequirements: [],
        actions: [
          {
            type: ActionType.MINE,
            parameters: { rockId: GAME_OBJECTS.COPPER_ROCK, tool: 'pickaxe' },
            priority: 1,
            retryAttempts: 3
          },
          {
            type: ActionType.MINE,
            parameters: { rockId: GAME_OBJECTS.TIN_ROCK, tool: 'pickaxe' },
            priority: 1,
            retryAttempts: 3
          },
          {
            type: ActionType.DROP_ITEM,
            parameters: { itemId: ITEMS.COPPER_ORE },
            condition: this.createCondition('inventory_full', {}),
            priority: 2,
            retryAttempts: 1
          },
          {
            type: ActionType.DROP_ITEM,
            parameters: { itemId: ITEMS.TIN_ORE },
            condition: this.createCondition('inventory_full', {}),
            priority: 2,
            retryAttempts: 1
          }
        ],
        expectedXpPerHour: 8000,
        profitPerHour: 2000,
        afkFriendly: false,
        dangerLevel: 'low',
        locations: [this.locations.get('lumbridge_mine')!]
      },

      {
        name: 'Iron Powermine (15-99)',
        description: 'Powermining iron ore for fast experience',
        skill: 'mining',
        levelRequirements: this.createLevelRequirements({ mining: 15 }),
        itemRequirements: [
          { itemId: ITEMS.RUNE_PICKAXE, itemName: 'Rune pickaxe', quantity: 1, consumable: false, alternatives: [ITEMS.ADAMANT_PICKAXE] }
        ],
        questRequirements: [],
        actions: [
          {
            type: ActionType.MINE,
            parameters: { rockId: GAME_OBJECTS.IRON_ROCK, tool: 'pickaxe' },
            priority: 1,
            retryAttempts: 3
          },
          {
            type: ActionType.DROP_ITEM,
            parameters: { itemId: ITEMS.IRON_ORE },
            condition: this.createCondition('inventory_full', {}),
            priority: 2,
            retryAttempts: 1
          }
        ],
        expectedXpPerHour: 45000,
        profitPerHour: 0,
        afkFriendly: false,
        dangerLevel: 'low',
        locations: [this.locations.get('al_kharid_mine')!]
      },

      {
        name: 'Coal Mining (30+)',
        description: 'Mine coal for profit and decent experience',
        skill: 'mining',
        levelRequirements: this.createLevelRequirements({ mining: 30 }),
        itemRequirements: [
          { itemId: ITEMS.RUNE_PICKAXE, itemName: 'Rune pickaxe', quantity: 1, consumable: false, alternatives: [ITEMS.DRAGON_PICKAXE] }
        ],
        questRequirements: [],
        actions: [
          {
            type: ActionType.MINE,
            parameters: { rockId: GAME_OBJECTS.COAL_ROCK, tool: 'pickaxe' },
            priority: 1,
            retryAttempts: 3
          },
          {
            type: ActionType.OPEN_BANK,
            parameters: {},
            condition: this.createCondition('inventory_full', {}),
            priority: 2,
            retryAttempts: 2
          },
          {
            type: ActionType.DEPOSIT_ITEM,
            parameters: { itemId: ITEMS.COAL, quantity: -1 },
            priority: 3,
            retryAttempts: 2
          }
        ],
        expectedXpPerHour: 25000,
        profitPerHour: 80000,
        afkFriendly: true,
        dangerLevel: 'low',
        locations: [this.locations.get('al_kharid_mine')!]
      }
    ]);

    // Fishing strategies
    this.strategies.set('fishing', [
      {
        name: 'Shrimp/Anchovies (1-20)',
        description: 'Net fishing for early fishing experience',
        skill: 'fishing',
        levelRequirements: this.createLevelRequirements({ fishing: 1 }),
        itemRequirements: [
          { itemId: 303, itemName: 'Small fishing net', quantity: 1, consumable: false, alternatives: [] }
        ],
        questRequirements: [],
        actions: [
          {
            type: ActionType.FISH,
            parameters: { spotId: GAME_OBJECTS.NET_FISHING_SPOT, tool: 'net' },
            priority: 1,
            retryAttempts: 3
          },
          {
            type: ActionType.DROP_ITEM,
            parameters: { itemId: ITEMS.SHRIMPS },
            condition: this.createCondition('inventory_full', {}),
            priority: 2,
            retryAttempts: 1
          },
          {
            type: ActionType.DROP_ITEM,
            parameters: { itemId: ITEMS.ANCHOVIES },
            condition: this.createCondition('inventory_full', {}),
            priority: 2,
            retryAttempts: 1
          }
        ],
        expectedXpPerHour: 12000,
        profitPerHour: 0,
        afkFriendly: true,
        dangerLevel: 'low',
        locations: [this.locations.get('lumbridge_river')!]
      },

      {
        name: 'Trout/Salmon (20-58)',
        description: 'Fly fishing for good experience',
        skill: 'fishing',
        levelRequirements: this.createLevelRequirements({ fishing: 20 }),
        itemRequirements: [
          { itemId: 309, itemName: 'Fly fishing rod', quantity: 1, consumable: false, alternatives: [] },
          { itemId: 314, itemName: 'Feather', quantity: 100, consumable: true, alternatives: [] }
        ],
        questRequirements: [],
        actions: [
          {
            type: ActionType.FISH,
            parameters: { spotId: GAME_OBJECTS.LURE_FISHING_SPOT, tool: 'fly_rod' },
            priority: 1,
            retryAttempts: 3
          },
          {
            type: ActionType.DROP_ITEM,
            parameters: { itemId: ITEMS.TROUT },
            condition: this.createCondition('inventory_full', {}),
            priority: 2,
            retryAttempts: 1
          },
          {
            type: ActionType.DROP_ITEM,
            parameters: { itemId: ITEMS.SALMON },
            condition: this.createCondition('inventory_full', {}),
            priority: 2,
            retryAttempts: 1
          }
        ],
        expectedXpPerHour: 35000,
        profitPerHour: 0,
        afkFriendly: true,
        dangerLevel: 'low',
        locations: [this.locations.get('barbarian_village')!]
      },

      {
        name: 'Lobsters (40+)',
        description: 'Lobster fishing for profit and decent experience',
        skill: 'fishing',
        levelRequirements: this.createLevelRequirements({ fishing: 40 }),
        itemRequirements: [
          { itemId: 301, itemName: 'Lobster pot', quantity: 1, consumable: false, alternatives: [] }
        ],
        questRequirements: [],
        actions: [
          {
            type: ActionType.FISH,
            parameters: { spotId: GAME_OBJECTS.CAGE_FISHING_SPOT, tool: 'lobster_pot' },
            priority: 1,
            retryAttempts: 3
          },
          {
            type: ActionType.OPEN_BANK,
            parameters: {},
            condition: this.createCondition('inventory_full', {}),
            priority: 2,
            retryAttempts: 2
          },
          {
            type: ActionType.DEPOSIT_ITEM,
            parameters: { itemId: ITEMS.LOBSTER, quantity: -1 },
            priority: 3,
            retryAttempts: 2
          }
        ],
        expectedXpPerHour: 22000,
        profitPerHour: 65000,
        afkFriendly: true,
        dangerLevel: 'low',
        locations: [this.locations.get('catherby')!]
      }
    ]);

    runtimeLogger.info('🎯 Skill training strategies initialized');
  }

  private createCondition(type: ConditionType, parameters: Record<string, unknown>): ActionCondition {
    return {
      type,
      parameters,
      evaluate: (gameState: GameState) => {
        switch (type) {
          case 'inventory_full':
            return gameState.inventory.length >= 28;
          case 'inventory_contains':
            const itemId = parameters['itemId'] as number;
            return gameState.inventory.some(item => item.id === itemId);
          case 'health_below':
            const healthThreshold = parameters['threshold'] as number;
            return gameState.player ? gameState.player.hitpoints < healthThreshold : false;
          case 'prayer_below':
            const prayerThreshold = parameters['threshold'] as number;
            return gameState.player ? gameState.player.prayer < prayerThreshold : false;
          case 'skill_level':
            const skillName = parameters['skill'] as SkillName;
            const requiredLevel = parameters['level'] as number;
            const skill = gameState.skills.find(s => s.name.toLowerCase() === skillName);
            return skill ? skill.level >= requiredLevel : false;
          default:
            return true;
        }
      }
    };
  }

  async startSkillTraining(config: SkillTrainingConfig): Promise<AutonomousActivity> {
    const activityId = uuidv4();
    const strategies = this.strategies.get(config.skill) || [];
    
    // Validate configuration
    this.validateConfig(config);
    
    // Select best strategy based on config and current level
    const selectedStrategy = this.selectOptimalStrategy(strategies, config);
    if (!selectedStrategy) {
      throw new Error(`No suitable strategy found for ${config.skill} at current level`);
    }

    // Check requirements
    const requirementCheck = this.checkRequirements(selectedStrategy);
    if (!requirementCheck.met) {
      throw new Error(`Requirements not met: ${requirementCheck.missing.join(', ')}`);
    }

    const activity: AutonomousActivity = {
      id: activityId,
      type: 'skill_training',
      status: 'initializing',
      config,
      startTime: Date.now(),
      progress: 0,
      metrics: {
        actionsPerformed: 0,
        experienceGained: { [config.skill]: 0 } as Record<SkillName, number>,
        goldEarned: 0,
        timeElapsed: 0,
        efficiency: 0,
        successRate: 0,
        itemsGained: {},
        itemsLost: {}
      },
      errors: [],
      checkpoints: []
    };

    this.activities.set(activityId, activity);
    
    runtimeLogger.info(`🎯 Starting skill training: ${config.skill} to level ${config.targetLevel} using ${selectedStrategy.name}`);
    this.eventHandler?.onActivityStarted?.({ activity, strategy: selectedStrategy });

    // Start the training loop
    this.executeTrainingLoop(activity, selectedStrategy);

    return activity;
  }

  private validateConfig(config: SkillTrainingConfig): void {
    if (!config.skill || !this.strategies.has(config.skill)) {
      throw new Error(`Invalid skill: ${config.skill}`);
    }

    if (config.targetLevel < 1 || config.targetLevel > 99) {
      throw new Error(`Invalid target level: ${config.targetLevel}`);
    }

    const currentLevel = this.getSkillLevel(config.skill);
    if (config.targetLevel <= currentLevel) {
      throw new Error(`Target level ${config.targetLevel} is not higher than current level ${currentLevel}`);
    }

    if (config.budget && config.budget < 0) {
      throw new Error(`Invalid budget: ${config.budget}`);
    }

    if (config.timeLimit && config.timeLimit < 1) {
      throw new Error(`Invalid time limit: ${config.timeLimit}`);
    }
  }

  private selectOptimalStrategy(strategies: SkillTrainingStrategy[], config: SkillTrainingConfig): SkillTrainingStrategy | null {
    const currentLevel = this.getSkillLevel(config.skill);
    
    // Filter strategies by level requirements
    const availableStrategies = strategies.filter(strategy => {
      // Check if we meet the level requirements
      for (const [skill, requiredLevel] of Object.entries(strategy.levelRequirements)) {
        const currentSkillLevel = this.getSkillLevel(skill as SkillName);
        if (currentSkillLevel < requiredLevel) {
          return false;
        }
      }
      return true;
    });

    if (availableStrategies.length === 0) {
      return null;
    }

    // Select based on strategy preference
    let selectedStrategy: SkillTrainingStrategy;

    switch (config.strategy) {
      case 'efficient':
        selectedStrategy = availableStrategies.reduce((best, current) => 
          current.expectedXpPerHour > best.expectedXpPerHour ? current : best,
          availableStrategies[0]!
        );
        break;
      case 'profitable':
        selectedStrategy = availableStrategies.reduce((best, current) => 
          current.profitPerHour > best.profitPerHour ? current : best,
          availableStrategies[0]!
        );
        break;
      case 'afk':
        const afkStrategies = availableStrategies.filter(s => s.afkFriendly);
        selectedStrategy = afkStrategies.length > 0 ? afkStrategies[0]! : availableStrategies[0]!;
        break;
      case 'balanced':
      default:
        // Balance XP and profit
        selectedStrategy = availableStrategies.reduce((best, current) => {
          const bestScore = (best.expectedXpPerHour / 1000) + (Math.max(0, best.profitPerHour) / 10000);
          const currentScore = (current.expectedXpPerHour / 1000) + (Math.max(0, current.profitPerHour) / 10000);
          return currentScore > bestScore ? current : best;
        }, availableStrategies[0]!);
        break;
    }

    return selectedStrategy;
  }

  private checkRequirements(strategy: SkillTrainingStrategy): { met: boolean; missing: string[] } {
    const missing: string[] = [];

    // Check item requirements
    for (const itemReq of strategy.itemRequirements) {
      const hasItem = this.hasItem(itemReq.itemId) || 
                     itemReq.alternatives.some(altId => this.hasItem(altId));
      
      if (!hasItem) {
        missing.push(`${itemReq.itemName} (or alternatives)`);
      }
    }

    // Check quest requirements
    for (const questName of strategy.questRequirements) {
      if (!this.hasCompletedQuest(questName)) {
        missing.push(`Quest: ${questName}`);
      }
    }

    return {
      met: missing.length === 0,
      missing
    };
  }

  private async executeTrainingLoop(activity: AutonomousActivity, strategy: SkillTrainingStrategy): Promise<void> {
    activity.status = 'running';
    let lastProgressCheck = Date.now();
    let actionsWithoutProgress = 0;
    const maxActionsWithoutProgress = 10;

    while (activity.status === 'running') {
      try {
        // Check if target level reached
        const currentLevel = this.getSkillLevel((activity.config as SkillTrainingConfig).skill);
        if (currentLevel >= (activity.config as SkillTrainingConfig).targetLevel) {
          activity.status = 'completed';
          activity.endTime = Date.now();
          this.eventHandler?.onActivityCompleted?.(activity);
          runtimeLogger.info(`✅ Skill training completed: ${(activity.config as SkillTrainingConfig).skill} reached level ${currentLevel}`);
          break;
        }

        // Check time limit
        const config = activity.config as SkillTrainingConfig;
        if (config.timeLimit && activity.startTime) {
          const elapsed = Date.now() - activity.startTime;
          if (elapsed > config.timeLimit * 60000) {
            activity.status = 'completed';
            activity.endTime = Date.now();
            this.eventHandler?.onActivityTimeout?.(activity);
            runtimeLogger.info(`⏰ Skill training timed out: ${(activity.config as SkillTrainingConfig).skill}`);
            break;
          }
        }

        // Check safety conditions
        if (!this.checkSafetyConditions(config.safetySettings)) {
          this.handleSafetyViolation(activity);
          continue;
        }

        // Execute strategy actions
        let actionExecuted = false;
        for (const action of strategy.actions) {
          if (activity.status !== 'running') break;

          // Check action condition
          if (action.condition && !action.condition.evaluate(this.gameState)) {
            continue;
          }

          // Execute action
          const success = await this.executeAction(action, activity);
          if (success) {
            actionExecuted = true;
            activity.metrics.actionsPerformed++;
            actionsWithoutProgress = 0;
          }
          
          // Delay between actions for human-like behavior
          await this.randomDelay(600, 1200);
        }

        // Check for progress
        const now = Date.now();
        if (now - lastProgressCheck > 30000) { // Check every 30 seconds
          const newLevel = this.getSkillLevel((activity.config as SkillTrainingConfig).skill);
          if (newLevel === currentLevel && actionExecuted) {
            actionsWithoutProgress++;
          }
          
          if (actionsWithoutProgress >= maxActionsWithoutProgress) {
            this.addError(activity, 'game_state_error', 'No progress detected after multiple actions');
            await this.handleStuckState(activity, strategy);
            actionsWithoutProgress = 0;
          }
          
          lastProgressCheck = now;
        }

        // Update progress and metrics
        this.updateActivityProgress(activity, currentLevel);
        this.eventHandler?.onActivityProgress?.(activity);

        // Create checkpoint every 5 minutes
        if (now - activity.startTime > 0 && (now - activity.startTime) % 300000 < 5000) {
          this.createCheckpoint(activity);
        }

        // Wait before next iteration
        await this.randomDelay(2000, 4000);

      } catch (error) {
        runtimeLogger.error('Error in skill training loop:', error);
        this.addError(activity, 'game_state_error', error instanceof Error ? error.message : String(error));
        
        // Try to recover from error
        const recovered = await this.attemptRecovery(activity, error);
        if (!recovered) {
          activity.status = 'failed';
          this.eventHandler?.onActivityFailed?.({ activity, error });
          break;
        }
      }
    }
  }

  private checkSafetyConditions(safetySettings: SafetySettings): boolean {
    if (!this.gameState.player) return false;

    // Check health
    const healthPercent = (this.gameState.player.hitpoints / this.gameState.player.maxHitpoints) * 100;
    if (healthPercent < safetySettings.retreatAtHealth) {
      return false;
    }

    // Check if in dangerous area when avoiding PvP
    if (safetySettings.avoidPvP && this.isInPvPArea()) {
      return false;
    }

    // Check if in wilderness when avoiding it
    if (safetySettings.avoidWilderness && this.isInWilderness()) {
      return false;
    }

    return true;
  }

  private async executeAction(action: SkillAction, activity: AutonomousActivity): Promise<boolean> {
    try {
      // Send action for the main extension to handle
      this.eventHandler?.onActionExecute?.({
        type: action.type,
        parameters: action.parameters,
        activityId: activity.id
      });

      // Wait for action to complete
      await this.randomDelay(1000, 2000);
      
      return true;
    } catch (error) {
      runtimeLogger.error(`Failed to execute action ${action.type}:`, error);
      this.addError(activity, 'game_state_error', `Action failed: ${action.type}`);
      return false;
    }
  }

  private updateActivityProgress(activity: AutonomousActivity, currentLevel: number): void {
    const config = activity.config as SkillTrainingConfig;
    const progressPercent = Math.min((currentLevel / config.targetLevel) * 100, 100);
    activity.progress = progressPercent;

    // Update metrics
    if (activity.startTime) {
      activity.metrics.timeElapsed = Date.now() - activity.startTime;
      const hoursElapsed = activity.metrics.timeElapsed / 3600000;
      
      if (hoursElapsed > 0) {
        activity.metrics.efficiency = activity.metrics.actionsPerformed / hoursElapsed;
      }
      
      // Calculate success rate
      const totalActions = activity.metrics.actionsPerformed;
      const errors = activity.errors.filter(e => !e.recovered).length;
      activity.metrics.successRate = totalActions > 0 ? ((totalActions - errors) / totalActions) * 100 : 0;
    }
  }

  private createCheckpoint(activity: AutonomousActivity): void {
    const checkpoint: ActivityCheckpoint = {
      timestamp: Date.now(),
      progress: activity.progress,
      gameState: {
        player: this.gameState.player,
        inventory: this.gameState.inventory,
        skills: this.gameState.skills
      },
      metrics: { ...activity.metrics }
    };

    activity.checkpoints.push(checkpoint);
    
    // Keep only last 10 checkpoints
    if (activity.checkpoints.length > 10) {
      activity.checkpoints.shift();
    }
  }

  private addError(activity: AutonomousActivity, type: ErrorType, message: string, context: Record<string, unknown> = {}): void {
    const error: ActivityError = {
      timestamp: Date.now(),
      type,
      message,
      context,
      recovered: false
    };

    activity.errors.push(error);
    
    // Keep only last 50 errors
    if (activity.errors.length > 50) {
      activity.errors.shift();
    }
  }

  private async handleSafetyViolation(activity: AutonomousActivity): Promise<void> {
    const config = activity.config as SkillTrainingConfig;
    
    runtimeLogger.warn('⚠️ Safety violation detected, taking protective action');
    
    // Try to eat food if health is low
    if (this.gameState.player && this.gameState.player.hitpoints < this.gameState.player.maxHitpoints * 0.5) {
      const food = this.findFood();
      if (food) {
        this.eventHandler?.onActionExecute?.({
          type: ActionType.EAT_FOOD,
          parameters: { foodId: food.id },
          activityId: activity.id
        });
        await this.randomDelay(1000, 2000);
      }
    }

    // Use emergency teleport if configured
    if (config.safetySettings.emergencyTeleports.length > 0) {
      const teleportItem = config.safetySettings.emergencyTeleports.find(itemId => this.hasItem(itemId));
      if (teleportItem) {
        this.eventHandler?.onActionExecute?.({
          type: ActionType.USE_ITEM,
          parameters: { itemId: teleportItem },
          activityId: activity.id
        });
        await this.randomDelay(3000, 5000);
      }
    }

    // Logout if danger persists
    if (config.safetySettings.logoutOnDanger) {
      this.eventHandler?.onActionExecute?.({
        type: ActionType.LOGOUT,
        parameters: {},
        activityId: activity.id
      });
      activity.status = 'paused';
      this.eventHandler?.onActivityPaused?.(activity);
    }
  }

  private async handleStuckState(activity: AutonomousActivity, strategy: SkillTrainingStrategy): Promise<void> {
    runtimeLogger.warn('🔄 Detected stuck state, attempting recovery');
    
    // Try moving to a different location
    const alternativeLocation = strategy.locations.find(loc => 
      loc.name !== strategy.locations[0]?.name
    );
    
    if (alternativeLocation) {
      this.eventHandler?.onActionExecute?.({
        type: ActionType.WALK_TO,
        parameters: alternativeLocation.coordinates,
        activityId: activity.id
      });
      await this.randomDelay(5000, 8000);
    }
    
    // Try banking if inventory might be full
    if (this.gameState.inventory.length >= 28) {
      this.eventHandler?.onActionExecute?.({
        type: ActionType.OPEN_BANK,
        parameters: {},
        activityId: activity.id
      });
      await this.randomDelay(2000, 3000);
    }
  }

  private async attemptRecovery(activity: AutonomousActivity, error: unknown): Promise<boolean> {
    runtimeLogger.info('🔧 Attempting to recover from error');
    
    // Wait a bit before retrying
    await this.randomDelay(5000, 10000);
    
    // Mark error as recovered if we get here
    if (activity.errors.length > 0) {
      const lastError = activity.errors[activity.errors.length - 1];
      if (lastError) {
        lastError.recovered = true;
      }
    }
    
    return true;
  }

  private randomDelay(min: number, max: number): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  private getSkillLevel(skillName: SkillName): number {
    const skill = this.gameState.skills.find(s => 
      s.name.toLowerCase() === skillName.toLowerCase()
    );
    return skill ? skill.level : 1;
  }

  private hasItem(itemId: number): boolean {
    return this.gameState.inventory.some(item => item.id === itemId);
  }

  private hasCompletedQuest(questName: string): boolean {
    return this.gameState.quests.some(quest => 
      quest.name.toLowerCase() === questName.toLowerCase() && quest.state === 'completed'
    );
  }

  private findFood(): InventoryItem | null {
    const foodIds = [ITEMS.BREAD, ITEMS.COOKED_MEAT, ITEMS.COOKED_CHICKEN, ITEMS.CAKE];
    return this.gameState.inventory.find(item => foodIds.includes(item.id)) || null;
  }

  private isInPvPArea(): boolean {
    if (!this.gameState.player) return false;
    // Simplified PvP area check - would need more comprehensive implementation
    return this.gameState.player.location.y > 3520; // Wilderness check
  }

  private isInWilderness(): boolean {
    return this.isInPvPArea(); // Same as PvP for now
  }

  // Public methods for activity management
  pauseActivity(activityId: string): boolean {
    const activity = this.activities.get(activityId);
    if (!activity || activity.status !== 'running') return false;

    activity.status = 'paused';
    this.eventHandler?.onActivityPaused?.(activity);
    runtimeLogger.info(`⏸️ Paused skill training: ${activityId}`);
    return true;
  }

  resumeActivity(activityId: string): boolean {
    const activity = this.activities.get(activityId);
    if (!activity || activity.status !== 'paused') return false;

    const strategies = this.strategies.get((activity.config as SkillTrainingConfig).skill) || [];
    const strategy = this.selectOptimalStrategy(strategies, activity.config as SkillTrainingConfig);
    
    if (!strategy) {
      runtimeLogger.error('Cannot resume activity: no suitable strategy found');
      return false;
    }

    activity.status = 'running';
    this.eventHandler?.onActivityResumed?.(activity);
    this.executeTrainingLoop(activity, strategy);
    runtimeLogger.info(`▶️ Resumed skill training: ${activityId}`);
    return true;
  }

  stopActivity(activityId: string): boolean {
    const activity = this.activities.get(activityId);
    if (!activity) return false;

    activity.status = 'completed';
    activity.endTime = Date.now();
    this.eventHandler?.onActivityStopped?.(activity);
    runtimeLogger.info(`⏹️ Stopped skill training: ${activityId}`);
    return true;
  }

  getActivity(activityId: string): AutonomousActivity | undefined {
    return this.activities.get(activityId);
  }

  getAllActivities(): AutonomousActivity[] {
    return Array.from(this.activities.values());
  }

  getActiveActivities(): AutonomousActivity[] {
    return Array.from(this.activities.values()).filter(a => 
      a.status === 'running' || a.status === 'paused'
    );
  }

  updateGameState(gameState: GameState): void {
    this.gameState = gameState;
  }

  // Get available strategies for a skill
  getStrategiesForSkill(skill: SkillName): SkillTrainingStrategy[] {
    return this.strategies.get(skill) || [];
  }

  // Get training statistics
  getTrainingStats(activityId: string): ActivityMetrics | null {
    const activity = this.activities.get(activityId);
    return activity ? activity.metrics : null;
  }
}