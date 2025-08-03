/**
 * Types for Autonomous Gaming Skills
 * Production-ready type definitions for RuneLite autonomous gaming
 */

import { ActionType, GameState, PlayerInfo, InventoryItem, SkillInfo, NPCInfo, GameObject, QuestInfo } from '../types';

// Configuration interfaces for imported types
export interface PlayerInfoConfig {
  username: string;
  displayName: string;
  combatLevel: number;
  totalLevel: number;
  hitpoints: number;
  maxHitpoints: number;
  prayer: number;
  maxPrayer: number;
  energy: number;
  weight: number;
  location: {
    x: number;
    y: number;
    plane: number;
    region: number;
  };
  accountType: 'normal' | 'ironman' | 'hardcore_ironman' | 'ultimate_ironman';
  isLoggedIn: boolean;
  isMember: boolean;
  worldId: number;
}

export interface InventoryItemConfig {
  id: number;
  name: string;
  quantity: number;
  slot: number;
  noted: boolean;
  stackable: boolean;
  tradeable: boolean;
  value: number;
  examineText?: string;
}

export interface SkillInfoConfig {
  name: string;
  level: number;
  experience: number;
  nextLevelExp: number;
  remainingExp: number;
  rank?: number;
}

export interface NPCInfoConfig {
  id: number;
  name: string;
  combatLevel: number;
  location: { x: number; y: number; plane: number };
  actions: string[];
  overhead?: string;
  healthRatio?: number;
  animation?: number;
  interacting?: string;
}

export interface GameObjectConfig {
  id: number;
  name: string;
  location: { x: number; y: number; plane: number };
  actions: string[];
  orientation: number;
  type: 'wall' | 'floor' | 'interactive' | 'decoration';
  animation?: number;
}

// Core configuration interfaces
export interface SkillTrainingConfig {
  skill: SkillName;
  targetLevel: number;
  strategy: SkillStrategy;
  location?: TrainingLocation;
  budget?: number;
  timeLimit?: number; // in minutes
  safetySettings: SafetySettings;
  preferences: TrainingPreferences;
}

export interface QuestCompletionConfig {
  questName: string;
  strategy: QuestStrategy;
  allowCombat: boolean;
  maxDeaths: number;
  safetySettings: SafetySettings;
  requirements: QuestRequirement[];
}

export interface EconomicManagementConfig {
  strategy: EconomicStrategy;
  budget: number;
  riskLevel: RiskLevel;
  targetProfit?: number; // percentage
  timeHorizon?: number; // in hours
  itemCategories: ItemCategory[];
  marketAnalysis: MarketAnalysisConfig;
}

export interface SocialInteractionConfig {
  mode: SocialMode;
  activities: SocialActivity[];
  clanName?: string;
  helpNewbies: boolean;
  participateEvents: boolean;
  communicationStyle: CommunicationStyle;
  responsePatterns: ResponsePattern[];
}

export interface PvPCombatConfig {
  combatStyle: CombatStyle;
  targetLevelRange: LevelRange;
  riskAmount: number; // in GP
  events: PvPEvent[];
  safetyMode: boolean;
  combatSettings: CombatSettings;
  equipmentLoadouts: EquipmentLoadout[];
}

// Enums and type unions
export type SkillName = 
  | 'attack' | 'strength' | 'defence' | 'ranged' | 'prayer' | 'magic'
  | 'runecrafting' | 'construction' | 'hitpoints' | 'agility' | 'herblore'
  | 'thieving' | 'crafting' | 'fletching' | 'slayer' | 'hunter'
  | 'mining' | 'smithing' | 'fishing' | 'cooking' | 'firemaking'
  | 'woodcutting' | 'farming';

export type SkillStrategy = 'efficient' | 'profitable' | 'afk' | 'balanced';
export type QuestStrategy = 'fastest' | 'cheapest' | 'safest' | 'optimal';
export type EconomicStrategy = 'trading' | 'flipping' | 'investing' | 'arbitrage';
export type SocialMode = 'friendly' | 'helpful' | 'competitive' | 'observer';
export type CombatStyle = 'aggressive' | 'defensive' | 'balanced' | 'ranged' | 'magic';
export type RiskLevel = 'low' | 'medium' | 'high';

// Activity management
export interface AutonomousActivity {
  id: string;
  type: ActivityType;
  status: ActivityStatus;
  config: ActivityConfig;
  startTime: number;
  endTime?: number;
  progress: number;
  metrics: ActivityMetrics;
  errors: ActivityError[];
  checkpoints: ActivityCheckpoint[];
}

export type ActivityType = 
  | 'skill_training' 
  | 'quest_completion' 
  | 'economic_management' 
  | 'social_interaction' 
  | 'pvp_combat';

export type ActivityStatus = 
  | 'idle' 
  | 'initializing'
  | 'running' 
  | 'paused' 
  | 'completed' 
  | 'failed' 
  | 'cancelled';

export type ActivityConfig = 
  | SkillTrainingConfig 
  | QuestCompletionConfig 
  | EconomicManagementConfig 
  | SocialInteractionConfig 
  | PvPCombatConfig;

export interface ActivityMetrics {
  actionsPerformed: number;
  experienceGained: Record<SkillName, number>;
  goldEarned: number;
  timeElapsed: number;
  efficiency: number;
  successRate: number;
  itemsGained: Record<number, number>; // itemId -> quantity
  itemsLost: Record<number, number>;
}

export interface ActivityError {
  timestamp: number;
  type: ErrorType;
  message: string;
  context: Record<string, unknown>;
  recovered: boolean;
}

export interface ActivityCheckpoint {
  timestamp: number;
  progress: number;
  gameState: Partial<GameState>;
  metrics: Partial<ActivityMetrics>;
}

export type ErrorType = 
  | 'network_error'
  | 'game_state_error'
  | 'safety_violation'
  | 'resource_exhausted'
  | 'unexpected_death'
  | 'quest_blocked'
  | 'market_error';

// Skill training specific types
export interface SkillTrainingStrategy {
  name: string;
  description: string;
  skill: SkillName;
  levelRequirements: Record<SkillName, number>;
  itemRequirements: ItemRequirement[];
  questRequirements: string[];
  actions: SkillAction[];
  expectedXpPerHour: number;
  profitPerHour: number;
  afkFriendly: boolean;
  dangerLevel: RiskLevel;
  locations: TrainingLocation[];
}

export interface SkillAction {
  type: ActionType;
  parameters: Record<string, unknown>;
  condition?: ActionCondition;
  priority: number;
  cooldown?: number;
  retryAttempts: number;
}

export interface ActionCondition {
  type: ConditionType;
  parameters: Record<string, unknown>;
  evaluate: (gameState: GameState) => boolean;
}

export type ConditionType = 
  | 'inventory_full'
  | 'inventory_contains'
  | 'health_below'
  | 'prayer_below'
  | 'skill_level'
  | 'location_at'
  | 'npc_nearby'
  | 'object_available';

export interface TrainingLocation {
  name: string;
  coordinates: Coordinates;
  requirements: string[];
  safetyLevel: RiskLevel;
  crowdLevel: 'low' | 'medium' | 'high';
  bankAccess: boolean;
  teleportAccess: string[];
}

export interface ItemRequirement {
  itemId: number;
  itemName: string;
  quantity: number;
  consumable: boolean;
  alternatives: number[]; // alternative item IDs
}

// Quest completion types
export interface QuestGuide {
  questName: string;
  difficulty: QuestDifficulty;
  requirements: QuestRequirement[];
  steps: QuestStep[];
  rewards: QuestReward[];
  estimatedTime: number; // in minutes
  dangerLevel: RiskLevel;
}

export interface QuestStep {
  id: string;
  description: string;
  actions: QuestAction[];
  requirements: QuestRequirement[];
  completed: boolean;
  optional: boolean;
  alternatives: QuestStep[];
  location?: Coordinates;
}

export interface QuestAction {
  type: ActionType;
  parameters: Record<string, unknown>;
  description: string;
  location?: Coordinates;
  npcId?: number;
  objectId?: number;
  itemId?: number;
  condition?: (gameState: GameState) => boolean;
  priority?: number;
}

export interface QuestRequirement {
  type: RequirementType;
  description: string;
  parameters: Record<string, unknown>;
  check: (gameState: GameState) => boolean;
}

export type RequirementType = 
  | 'skill_level'
  | 'quest_completed'
  | 'item_owned'
  | 'combat_level'
  | 'membership'
  | 'location_access';

export interface QuestReward {
  type: RewardType;
  description: string;
  value: number;
  skillName?: SkillName;
  itemId?: number;
  quantity?: number;
}

export type RewardType = 'experience' | 'item' | 'gold' | 'access' | 'ability';
export type QuestDifficulty = 'novice' | 'intermediate' | 'experienced' | 'master' | 'grandmaster';

// Economic management types
export interface EconomicOpportunity {
  type: OpportunityType;
  itemId: number;
  itemName: string;
  buyPrice: number;
  sellPrice: number;
  profit: number;
  profitMargin: number;
  volume: number;
  riskLevel: RiskLevel;
  timeToComplete: number; // in minutes
  confidence: number; // 0-1
  marketTrend: MarketTrend;
}

export type OpportunityType = 'buy' | 'sell' | 'flip' | 'arbitrage' | 'craft' | 'alch';
export type MarketTrend = 'rising' | 'falling' | 'stable' | 'volatile';

export interface MarketAnalysisConfig {
  priceHistoryDays: number;
  volumeThreshold: number;
  volatilityThreshold: number;
  profitMarginThreshold: number;
  updateInterval: number; // in minutes
}

export interface ItemCategory {
  name: string;
  itemIds: number[];
  priority: number;
  riskTolerance: RiskLevel;
}

// Social interaction types
export interface SocialEvent {
  type: SocialEventType;
  participants: string[];
  location?: Coordinates;
  description: string;
  priority: number;
  startTime?: number;
  duration?: number;
  requirements?: string[];
}

export type SocialEventType = 
  | 'clan_event'
  | 'community_event'
  | 'help_request'
  | 'conversation'
  | 'competition'
  | 'group_activity';

export type SocialActivity = 
  | 'clan_chat'
  | 'help_newbies'
  | 'group_training'
  | 'events'
  | 'competitions'
  | 'trading';

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

// PvP combat types
export interface PvPTarget {
  playerName: string;
  combatLevel: number;
  location: Coordinates;
  equipment: EquipmentItem[];
  riskAssessment: RiskLevel;
  winChance: number;
  lastSeen: number;
  combatHistory?: CombatHistory;
}

export interface CombatHistory {
  wins: number;
  losses: number;
  draws: number;
  lastFight: number;
  averageFightDuration: number;
  commonTactics: string[];
}

export interface EquipmentLoadout {
  name: string;
  combatStyle: CombatStyle;
  items: EquipmentItem[];
  stats: CombatStats;
  cost: number;
  riskLevel: RiskLevel;
}

export interface EquipmentItem {
  slot: EquipmentSlot;
  itemId: number;
  itemName: string;
  stats: ItemStats;
}

export type EquipmentSlot = 
  | 'head' | 'cape' | 'neck' | 'weapon' | 'body' | 'shield'
  | 'legs' | 'hands' | 'feet' | 'ring' | 'ammo';

export interface ItemStats {
  attackBonus: Record<CombatType, number>;
  defenceBonus: Record<CombatType, number>;
  otherBonus: Record<string, number>;
  requirements: Record<SkillName, number>;
}

export type CombatType = 'stab' | 'slash' | 'crush' | 'magic' | 'ranged';

export interface CombatStats {
  attackLevel: number;
  strengthLevel: number;
  defenceLevel: number;
  rangedLevel: number;
  magicLevel: number;
  prayerLevel: number;
  hitpointsLevel: number;
  combatLevel: number;
}

export interface CombatSettings {
  autoEat: boolean;
  eatAtHealth: number; // percentage
  foodId: number;
  autoPrayer: boolean;
  prayerAtPoints: number; // percentage
  prayerPotionId: number;
  specialAttack: boolean;
  specialAtHealth: number; // enemy health percentage
  retreatAtHealth: number; // our health percentage
}

export type PvPEvent = 
  | 'clan_wars'
  | 'bounty_hunter'
  | 'wilderness_events'
  | 'castle_wars'
  | 'soul_wars'
  | 'last_man_standing';

export interface LevelRange {
  min: number;
  max: number;
}

// Common utility types
export interface Coordinates {
  x: number;
  y: number;
  plane: number;
  region?: number;
}

export interface SafetySettings {
  maxDeaths: number;
  retreatAtHealth: number; // percentage
  avoidPvP: boolean;
  avoidWilderness: boolean;
  logoutOnDanger: boolean;
  maxRiskAmount: number; // in GP
  emergencyTeleports: number[]; // item IDs
}

export interface TrainingPreferences {
  preferAfk: boolean;
  preferProfit: boolean;
  preferSpeed: boolean;
  avoidCrowds: boolean;
  bankingPreference: 'frequent' | 'full_inventory' | 'never';
  foodType: number; // item ID
  prayerPotions: boolean;
}

// Advanced AI Integration Types
export interface AISkillManager {
  id: string;
  skill: SkillName;
  model: AIModel;
  trainingData: TrainingData;
  predictions: SkillPrediction[];
  recommendations: SkillRecommendation[];
  performance: AIPerformanceMetrics;
}

export interface AIModel {
  type: 'neural_network' | 'decision_tree' | 'reinforcement_learning' | 'ensemble';
  version: string;
  parameters: Record<string, unknown>;
  accuracy: number;
  lastTrained: number;
  trainingDataSize: number;
}

export interface TrainingData {
  skillActions: SkillActionData[];
  outcomes: OutcomeData[];
  patterns: PatternData[];
  metadata: Record<string, unknown>;
}

export interface SkillActionData {
  action: SkillAction;
  gameState: GameState;
  outcome: 'success' | 'failure' | 'partial';
  efficiency: number;
  timestamp: number;
}

export interface OutcomeData {
  action: SkillAction;
  result: 'success' | 'failure' | 'partial';
  experienceGained: number;
  itemsGained: Record<number, number>;
  timeTaken: number;
  efficiency: number;
}

export interface PatternData {
  pattern: string;
  frequency: number;
  successRate: number;
  averageEfficiency: number;
  conditions: ActionCondition[];
}

export interface SkillPrediction {
  type: 'completion_time' | 'success_rate' | 'efficiency' | 'resource_usage';
  value: number;
  confidence: number;
  timeframe: number;
  factors: string[];
}

export interface SkillRecommendation {
  type: 'strategy' | 'location' | 'equipment' | 'timing';
  action: string;
  expectedBenefit: number;
  confidence: number;
  priority: number;
  reasoning: string[];
}

export interface AIPerformanceMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  trainingTime: number;
  inferenceTime: number;
  modelSize: number;
}

// Advanced Skill Management
export interface AdvancedSkillManager {
  skills: Map<SkillName, AdvancedSkillData>;
  strategies: Map<string, AdvancedSkillStrategy>;
  analytics: SkillAnalytics;
  optimization: SkillOptimization;
  ai: AISkillManager;
}

export interface AdvancedSkillData {
  skill: SkillName;
  currentLevel: number;
  targetLevel: number;
  experience: number;
  experienceToNext: number;
  rank: number;
  history: SkillHistoryEntry[];
  strategies: string[];
  efficiency: SkillEfficiency;
  predictions: SkillPrediction[];
}

export interface SkillHistoryEntry {
  timestamp: number;
  level: number;
  experience: number;
  experienceGained: number;
  method: string;
  location: string;
  efficiency: number;
}

export interface SkillEfficiency {
  xpPerHour: number;
  gpPerHour: number;
  actionsPerHour: number;
  successRate: number;
  afkTime: number;
  optimalTime: number;
}

export interface AdvancedSkillStrategy {
  id: string;
  name: string;
  skill: SkillName;
  description: string;
  requirements: SkillRequirement[];
  actions: AdvancedSkillAction[];
  efficiency: SkillEfficiency;
  riskLevel: RiskLevel;
  afkFriendly: boolean;
  profitPerHour: number;
  locations: AdvancedTrainingLocation[];
  equipment: EquipmentRequirement[];
  consumables: ConsumableRequirement[];
  aiOptimized: boolean;
  machineLearning: MLStrategy;
}

export interface SkillRequirement {
  type: 'skill_level' | 'quest_completed' | 'item_owned' | 'combat_level' | 'membership';
  value: unknown;
  description: string;
  critical: boolean;
}

export interface AdvancedSkillAction {
  action: SkillAction;
  conditions: AdvancedActionCondition[];
  alternatives: SkillAction[];
  priority: number;
  cooldown: number;
  retryAttempts: number;
  successRate: number;
  averageTime: number;
  aiOptimized: boolean;
}

export interface AdvancedActionCondition extends ActionCondition {
  priority: number;
  fallback?: ActionCondition;
  aiLearned: boolean;
  confidence: number;
}

export interface AdvancedTrainingLocation extends TrainingLocation {
  efficiency: number;
  crowdLevelScore: number; // 0-1 (separate from crowdLevel enum)
  safetyScore: number; // 0-1
  resourceAvailability: number; // 0-1
  bankDistance: number;
  teleportOptions: TeleportOption[];
  aiRecommended: boolean;
  historicalSuccess: number;
}

export interface TeleportOption {
  method: string;
  itemId?: number;
  spellId?: number;
  cost: number;
  time: number;
  requirements: string[];
}

export interface EquipmentRequirement {
  slot: EquipmentSlot;
  itemId: number;
  itemName: string;
  critical: boolean;
  alternatives: number[];
  optimal: boolean;
}

export interface ConsumableRequirement {
  itemId: number;
  itemName: string;
  quantity: number;
  rate: number; // per hour
  critical: boolean;
  alternatives: number[];
}

export interface MLStrategy {
  enabled: boolean;
  modelType: 'regression' | 'classification' | 'reinforcement';
  features: string[];
  target: string;
  trainingData: TrainingData;
  performance: AIPerformanceMetrics;
  lastUpdated: number;
}

export interface SkillAnalytics {
  overallEfficiency: number;
  skillRankings: SkillRanking[];
  trends: SkillTrend[];
  recommendations: SkillRecommendation[];
  predictions: SkillPrediction[];
  performance: SkillPerformanceMetrics;
}

export interface SkillRanking {
  skill: SkillName;
  rank: number;
  efficiency: number;
  progress: number;
  potential: number;
}

export interface SkillTrend {
  skill: SkillName;
  direction: 'improving' | 'declining' | 'stable';
  rate: number;
  duration: number;
  significance: number;
}

export interface SkillPerformanceMetrics {
  totalExperience: number;
  averageXpPerHour: number;
  bestXpPerHour: number;
  totalTime: number;
  successRate: number;
  efficiencyScore: number;
}

export interface SkillOptimization {
  enabled: boolean;
  algorithm: OptimizationAlgorithm;
  constraints: OptimizationConstraint[];
  objectives: OptimizationObjective[];
  results: OptimizationResult[];
}

export interface OptimizationAlgorithm {
  type: 'genetic' | 'simulated_annealing' | 'particle_swarm' | 'gradient_descent';
  parameters: Record<string, unknown>;
  iterations: number;
  populationSize: number;
  convergenceThreshold: number;
}

export interface OptimizationConstraint {
  type: 'time' | 'resources' | 'safety' | 'efficiency';
  value: unknown;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte';
  weight: number;
}

export interface OptimizationObjective {
  type: 'maximize' | 'minimize';
  target: string;
  weight: number;
  priority: number;
}

export interface OptimizationResult {
  strategy: AdvancedSkillStrategy;
  score: number;
  efficiency: number;
  feasibility: number;
  recommendations: string[];
}

// Advanced Quest Management
export interface AdvancedQuestManager {
  quests: Map<string, AdvancedQuestData>;
  guides: Map<string, AdvancedQuestGuide>;
  analytics: QuestAnalytics;
  optimization: QuestOptimization;
  ai: AIQuestManager;
}

export interface AdvancedQuestData {
  quest: QuestInfo;
  progress: number;
  currentStep: number;
  steps: AdvancedQuestStep[];
  requirements: QuestRequirement[];
  rewards: QuestReward[];
  estimatedTime: number;
  actualTime?: number;
  difficulty: QuestDifficulty;
  status: 'not_started' | 'in_progress' | 'completed' | 'failed';
  history: QuestHistoryEntry[];
  aiOptimized: boolean;
}

export interface AdvancedQuestStep extends QuestStep {
  estimatedTime: number;
  actualTime?: number;
  successRate: number;
  alternatives: AdvancedQuestStep[];
  requirements: QuestRequirement[];
  aiOptimized: boolean;
  machineLearning: MLQuestStrategy;
}

export interface QuestHistoryEntry {
  timestamp: number;
  step: string;
  action: string;
  outcome: 'success' | 'failure' | 'partial';
  timeTaken: number;
  efficiency: number;
}

export interface AdvancedQuestGuide extends QuestGuide {
  aiOptimized: boolean;
  machineLearning: MLQuestStrategy;
  alternatives: QuestAlternative[];
  optimization: QuestOptimizationStrategy;
}

export interface QuestAlternative {
  id: string;
  name: string;
  description: string;
  steps: AdvancedQuestStep[];
  estimatedTime: number;
  difficulty: QuestDifficulty;
  requirements: QuestRequirement[];
  rewards: QuestReward[];
  aiRecommended: boolean;
}

export interface MLQuestStrategy {
  enabled: boolean;
  modelType: 'sequence' | 'classification' | 'reinforcement';
  features: string[];
  target: string;
  trainingData: QuestTrainingData;
  performance: AIPerformanceMetrics;
  lastUpdated: number;
}

export interface QuestTrainingData {
  questCompletions: QuestCompletionData[];
  stepOutcomes: StepOutcomeData[];
  patterns: QuestPatternData[];
  metadata: Record<string, unknown>;
}

export interface QuestCompletionData {
  quest: QuestInfo;
  steps: AdvancedQuestStep[];
  totalTime: number;
  success: boolean;
  efficiency: number;
  playerState: GameState;
}

export interface StepOutcomeData {
  step: AdvancedQuestStep;
  outcome: 'success' | 'failure' | 'partial';
  timeTaken: number;
  efficiency: number;
  playerState: GameState;
}

export interface QuestPatternData {
  pattern: string;
  frequency: number;
  successRate: number;
  averageTime: number;
  efficiency: number;
  conditions: QuestRequirement[];
}

export interface QuestOptimizationStrategy {
  enabled: boolean;
  algorithm: OptimizationAlgorithm;
  objectives: QuestOptimizationObjective[];
  constraints: QuestOptimizationConstraint[];
  results: QuestOptimizationResult[];
}

export interface QuestOptimizationObjective {
  type: 'minimize_time' | 'maximize_rewards' | 'minimize_risk' | 'maximize_efficiency';
  weight: number;
  priority: number;
}

export interface QuestOptimizationConstraint {
  type: 'time_limit' | 'skill_requirements' | 'item_requirements' | 'safety_requirements';
  value: unknown;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte';
  weight: number;
}

export interface QuestOptimizationResult {
  guide: AdvancedQuestGuide;
  score: number;
  efficiency: number;
  feasibility: number;
  recommendations: string[];
}

export interface QuestAnalytics {
  completionRate: number;
  averageTime: number;
  difficultyDistribution: Record<QuestDifficulty, number>;
  trends: QuestTrend[];
  recommendations: QuestRecommendation[];
  predictions: QuestPrediction[];
  performance: QuestPerformanceMetrics;
}

export interface QuestTrend {
  quest: string;
  direction: 'improving' | 'declining' | 'stable';
  rate: number;
  duration: number;
  significance: number;
}

export interface QuestRecommendation {
  type: 'strategy' | 'equipment' | 'timing' | 'route';
  action: string;
  expectedBenefit: number;
  confidence: number;
  priority: number;
  reasoning: string[];
}

export interface QuestPrediction {
  type: 'completion_time' | 'success_rate' | 'difficulty' | 'resource_usage';
  value: number;
  confidence: number;
  timeframe: number;
  factors: string[];
}

export interface QuestPerformanceMetrics {
  totalQuests: number;
  completedQuests: number;
  averageCompletionTime: number;
  successRate: number;
  efficiencyScore: number;
}

export interface QuestOptimization {
  enabled: boolean;
  algorithm: OptimizationAlgorithm;
  constraints: OptimizationConstraint[];
  objectives: OptimizationObjective[];
  results: OptimizationResult[];
}

export interface AIQuestManager {
  id: string;
  model: AIModel;
  trainingData: QuestTrainingData;
  predictions: QuestPrediction[];
  recommendations: QuestRecommendation[];
  performance: AIPerformanceMetrics;
}

// Advanced Economic Management
export interface AdvancedEconomicManager {
  opportunities: Map<string, AdvancedEconomicOpportunity>;
  strategies: Map<string, AdvancedEconomicStrategy>;
  analytics: EconomicAnalytics;
  optimization: EconomicOptimization;
  ai: AIEconomicManager;
}

export interface AdvancedEconomicOpportunity extends EconomicOpportunity {
  aiAnalyzed: boolean;
  confidence: number;
  riskAssessment: RiskAssessment;
  marketAnalysis: AdvancedMarketAnalysis;
  historicalData: EconomicHistoryEntry[];
  predictions: EconomicPrediction[];
  recommendations: EconomicRecommendation[];
}

export interface AdvancedMarketAnalysis {
  priceHistory: PriceHistoryEntry[];
  volumeAnalysis: VolumeAnalysis;
  volatilityAnalysis: VolatilityAnalysis;
  trendAnalysis: TrendAnalysis;
  correlationAnalysis: CorrelationAnalysis;
  aiInsights: AIMarketInsight[];
}

export interface PriceHistoryEntry {
  timestamp: number;
  price: number;
  volume: number;
  buyPrice: number;
  sellPrice: number;
  margin: number;
}

export interface VolumeAnalysis {
  averageVolume: number;
  volumeTrend: MarketTrend;
  volumeVolatility: number;
  peakVolume: number;
  lowVolume: number;
}

export interface VolatilityAnalysis {
  currentVolatility: number;
  historicalVolatility: number;
  volatilityTrend: MarketTrend;
  riskLevel: RiskLevel;
}

export interface TrendAnalysis {
  shortTermTrend: MarketTrend;
  mediumTermTrend: MarketTrend;
  longTermTrend: MarketTrend;
  trendStrength: number;
  trendConfidence: number;
}

export interface CorrelationAnalysis {
  correlations: Record<string, number>;
  strongestCorrelation: string;
  correlationStrength: number;
  significance: number;
}

export interface AIMarketInsight {
  type: 'pattern' | 'anomaly' | 'trend' | 'prediction';
  description: string;
  confidence: number;
  impact: number;
  timeframe: number;
}

export interface EconomicHistoryEntry {
  timestamp: number;
  opportunity: string;
  action: 'buy' | 'sell' | 'hold';
  price: number;
  quantity: number;
  profit: number;
  efficiency: number;
}

export interface EconomicPrediction {
  type: 'price_movement' | 'volume_change' | 'profit_opportunity' | 'risk_assessment';
  value: number;
  confidence: number;
  timeframe: number;
  factors: string[];
}

export interface EconomicRecommendation {
  type: 'buy' | 'sell' | 'hold' | 'diversify';
  action: string;
  expectedProfit: number;
  confidence: number;
  priority: number;
  reasoning: string[];
}

export interface AdvancedEconomicStrategy {
  id: string;
  name: string;
  type: EconomicStrategy;
  description: string;
  budget: number;
  riskLevel: RiskLevel;
  targetProfit: number;
  timeHorizon: number;
  opportunities: string[];
  rules: EconomicRule[];
  performance: EconomicPerformanceMetrics;
  aiOptimized: boolean;
  machineLearning: MLEconomicStrategy;
}

export interface EconomicRule {
  type: 'profit_threshold' | 'loss_limit' | 'volume_threshold' | 'volatility_limit';
  value: number;
  action: 'buy' | 'sell' | 'hold' | 'stop';
  priority: number;
}

export interface EconomicPerformanceMetrics {
  totalProfit: number;
  profitMargin: number;
  successRate: number;
  averageReturn: number;
  maxDrawdown: number;
  sharpeRatio: number;
  efficiency: number;
}

export interface MLEconomicStrategy {
  enabled: boolean;
  modelType: 'regression' | 'classification' | 'reinforcement' | 'time_series';
  features: string[];
  target: string;
  trainingData: EconomicTrainingData;
  performance: AIPerformanceMetrics;
  lastUpdated: number;
}

export interface EconomicTrainingData {
  trades: TradeData[];
  outcomes: EconomicOutcomeData[];
  patterns: EconomicPatternData[];
  metadata: Record<string, unknown>;
}

export interface TradeData {
  opportunity: AdvancedEconomicOpportunity;
  action: 'buy' | 'sell';
  price: number;
  quantity: number;
  timestamp: number;
  marketState: Record<string, unknown>;
}

export interface EconomicOutcomeData {
  trade: TradeData;
  result: 'profit' | 'loss' | 'breakeven';
  profit: number;
  efficiency: number;
  timeToComplete: number;
}

export interface EconomicPatternData {
  pattern: string;
  frequency: number;
  successRate: number;
  averageProfit: number;
  efficiency: number;
  conditions: EconomicCondition[];
}

export interface EconomicCondition {
  type: 'price_range' | 'volume_threshold' | 'trend_direction' | 'volatility_level';
  value: unknown;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte';
}

export interface EconomicAnalytics {
  overallProfit: number;
  profitMargin: number;
  successRate: number;
  riskMetrics: RiskMetrics;
  trends: EconomicTrend[];
  recommendations: EconomicRecommendation[];
  predictions: EconomicPrediction[];
  performance: EconomicPerformanceMetrics;
}

export interface RiskAssessment {
  overallRisk: 'low' | 'medium' | 'high';
  factors: RiskFactor[];
  mitigation: RiskMitigation[];
}

export interface RiskFactor {
  factor: string;
  probability: number;
  impact: number;
  risk: number;
}

export interface RiskMitigation {
  factor: string;
  strategy: string;
  effectiveness: number;
  cost: number;
}

export interface RiskMetrics {
  var: number; // Value at Risk
  maxDrawdown: number;
  volatility: number;
  sharpeRatio: number;
  beta: number;
  correlation: number;
}

export interface EconomicTrend {
  metric: string;
  direction: 'improving' | 'declining' | 'stable';
  rate: number;
  duration: number;
  significance: number;
}

export interface EconomicOptimization {
  enabled: boolean;
  algorithm: OptimizationAlgorithm;
  constraints: OptimizationConstraint[];
  objectives: OptimizationObjective[];
  results: OptimizationResult[];
}

export interface AIEconomicManager {
  id: string;
  model: AIModel;
  trainingData: EconomicTrainingData;
  predictions: EconomicPrediction[];
  recommendations: EconomicRecommendation[];
  performance: AIPerformanceMetrics;
}

// Advanced Social Management
export interface AdvancedSocialManager {
  events: Map<string, AdvancedSocialEvent>;
  strategies: Map<string, AdvancedSocialStrategy>;
  analytics: SocialAnalytics;
  optimization: SocialOptimization;
  ai: AISocialManager;
}

export interface AdvancedSocialEvent extends SocialEvent {
  aiAnalyzed: boolean;
  sentiment: SocialSentiment;
  engagement: SocialEngagement;
  recommendations: SocialRecommendation[];
  predictions: SocialPrediction[];
  machineLearning: MLSocialStrategy;
}

export interface SocialSentiment {
  overall: 'positive' | 'neutral' | 'negative';
  score: number; // -1 to 1
  confidence: number;
  factors: SocialSentimentFactor[];
}

export interface SocialSentimentFactor {
  factor: string;
  impact: number;
  confidence: number;
  description: string;
}

export interface SocialEngagement {
  participants: number;
  activeParticipants: number;
  responseRate: number;
  averageResponseTime: number;
  interactionDepth: number;
  satisfaction: number;
}

export interface SocialRecommendation {
  type: 'participation' | 'communication' | 'timing' | 'content';
  action: string;
  expectedBenefit: number;
  confidence: number;
  priority: number;
  reasoning: string[];
}

export interface SocialPrediction {
  type: 'participation_rate' | 'engagement_level' | 'satisfaction_score' | 'conflict_probability';
  value: number;
  confidence: number;
  timeframe: number;
  factors: string[];
}

export interface MLSocialStrategy {
  enabled: boolean;
  modelType: 'sentiment' | 'engagement' | 'prediction' | 'recommendation';
  features: string[];
  target: string;
  trainingData: SocialTrainingData;
  performance: AIPerformanceMetrics;
  lastUpdated: number;
}

export interface SocialTrainingData {
  interactions: SocialInteractionData[];
  outcomes: SocialOutcomeData[];
  patterns: SocialPatternData[];
  metadata: Record<string, unknown>;
}

export interface SocialInteractionData {
  event: AdvancedSocialEvent;
  participants: string[];
  duration: number;
  engagement: number;
  sentiment: number;
  timestamp: number;
}

export interface SocialOutcomeData {
  interaction: SocialInteractionData;
  outcome: 'positive' | 'neutral' | 'negative';
  satisfaction: number;
  engagement: number;
  followUp: boolean;
}

export interface SocialPatternData {
  pattern: string;
  frequency: number;
  successRate: number;
  averageEngagement: number;
  satisfaction: number;
  conditions: SocialCondition[];
}

export interface SocialCondition {
  type: 'time_of_day' | 'participant_count' | 'event_type' | 'location';
  value: unknown;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte';
}

export interface AdvancedSocialStrategy {
  id: string;
  name: string;
  type: SocialMode;
  description: string;
  activities: SocialActivity[];
  communicationStyle: CommunicationStyle;
  responsePatterns: ResponsePattern[];
  performance: SocialPerformanceMetrics;
  aiOptimized: boolean;
  machineLearning: MLSocialStrategy;
}

export interface SocialPerformanceMetrics {
  participationRate: number;
  engagementLevel: number;
  satisfactionScore: number;
  conflictRate: number;
  efficiency: number;
  reputation: number;
}

export interface SocialAnalytics {
  overallEngagement: number;
  satisfactionScore: number;
  participationRate: number;
  trends: SocialTrend[];
  recommendations: SocialRecommendation[];
  predictions: SocialPrediction[];
  performance: SocialPerformanceMetrics;
}

export interface SocialTrend {
  metric: string;
  direction: 'improving' | 'declining' | 'stable';
  rate: number;
  duration: number;
  significance: number;
}

export interface SocialOptimization {
  enabled: boolean;
  algorithm: OptimizationAlgorithm;
  constraints: OptimizationConstraint[];
  objectives: OptimizationObjective[];
  results: OptimizationResult[];
}

export interface AISocialManager {
  id: string;
  model: AIModel;
  trainingData: SocialTrainingData;
  predictions: SocialPrediction[];
  recommendations: SocialRecommendation[];
  performance: AIPerformanceMetrics;
}

// Advanced PvP Management
export interface AdvancedPvPManager {
  targets: Map<string, AdvancedPvPTarget>;
  strategies: Map<string, AdvancedPvPStrategy>;
  analytics: PvPAnalytics;
  optimization: PvPOptimization;
  ai: AIPvPManager;
}

export interface AdvancedPvPTarget extends PvPTarget {
  aiAnalyzed: boolean;
  threatAssessment: ThreatAssessment;
  combatAnalysis: CombatAnalysis;
  recommendations: PvPRecommendation[];
  predictions: PvPPrediction[];
  machineLearning: MLPvPStrategy;
}

export interface ThreatAssessment {
  overall: 'low' | 'medium' | 'high' | 'extreme';
  score: number; // 0 to 1
  confidence: number;
  factors: ThreatFactor[];
}

export interface ThreatFactor {
  factor: string;
  impact: number;
  confidence: number;
  description: string;
}

export interface CombatAnalysis {
  winProbability: number;
  averageFightDuration: number;
  damagePotential: number;
  defensiveCapability: number;
  mobility: number;
  resourceEfficiency: number;
}

export interface PvPRecommendation {
  type: 'engagement' | 'equipment' | 'tactics' | 'timing';
  action: string;
  expectedBenefit: number;
  confidence: number;
  priority: number;
  reasoning: string[];
}

export interface PvPPrediction {
  type: 'win_probability' | 'fight_duration' | 'damage_dealt' | 'damage_taken';
  value: number;
  confidence: number;
  timeframe: number;
  factors: string[];
}

export interface MLPvPStrategy {
  enabled: boolean;
  modelType: 'classification' | 'regression' | 'reinforcement' | 'prediction';
  features: string[];
  target: string;
  trainingData: PvPTrainingData;
  performance: AIPerformanceMetrics;
  lastUpdated: number;
}

export interface PvPTrainingData {
  fights: PvPFightData[];
  outcomes: PvPOutcomeData[];
  patterns: PvPPatternData[];
  metadata: Record<string, unknown>;
}

export interface PvPFightData {
  target: AdvancedPvPTarget;
  equipment: EquipmentLoadout;
  tactics: string[];
  duration: number;
  damageDealt: number;
  damageTaken: number;
  result: 'victory' | 'defeat' | 'escape';
  timestamp: number;
}

export interface PvPOutcomeData {
  fight: PvPFightData;
  outcome: 'victory' | 'defeat' | 'escape';
  efficiency: number;
  damageRatio: number;
  timeEfficiency: number;
}

export interface PvPPatternData {
  pattern: string;
  frequency: number;
  successRate: number;
  averageEfficiency: number;
  conditions: PvPCondition[];
}

export interface PvPCondition {
  type: 'target_level' | 'equipment_matchup' | 'location' | 'time_of_day';
  value: unknown;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte';
}

export interface AdvancedPvPStrategy {
  id: string;
  name: string;
  type: CombatStyle;
  description: string;
  targetLevelRange: LevelRange;
  riskAmount: number;
  events: PvPEvent[];
  equipment: EquipmentLoadout[];
  tactics: PvPTactic[];
  performance: PvPPerformanceMetrics;
  aiOptimized: boolean;
  machineLearning: MLPvPStrategy;
}

export interface PvPTactic {
  name: string;
  description: string;
  conditions: PvPCondition[];
  actions: SkillAction[];
  successRate: number;
  averageEfficiency: number;
  aiOptimized: boolean;
}

export interface PvPPerformanceMetrics {
  winRate: number;
  averageFightDuration: number;
  damageRatio: number;
  efficiency: number;
  riskRewardRatio: number;
  reputation: number;
}

export interface PvPAnalytics {
  overallWinRate: number;
  averageFightDuration: number;
  damageRatio: number;
  trends: PvPTrend[];
  recommendations: PvPRecommendation[];
  predictions: PvPPrediction[];
  performance: PvPPerformanceMetrics;
}

export interface PvPTrend {
  metric: string;
  direction: 'improving' | 'declining' | 'stable';
  rate: number;
  duration: number;
  significance: number;
}

export interface PvPOptimization {
  enabled: boolean;
  algorithm: OptimizationAlgorithm;
  constraints: OptimizationConstraint[];
  objectives: OptimizationObjective[];
  results: OptimizationResult[];
}

export interface AIPvPManager {
  id: string;
  model: AIModel;
  trainingData: PvPTrainingData;
  predictions: PvPPrediction[];
  recommendations: PvPRecommendation[];
  performance: AIPerformanceMetrics;
}