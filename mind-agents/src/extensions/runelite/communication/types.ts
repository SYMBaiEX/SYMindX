import { WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import {
  WebSocketMessage,
  EventBatch,
  ProtocolCapabilities,
  RuneLiteErrorType,
  GameEvent,
} from '../types.js';

// WebSocket Server Types
export interface WebSocketServerConfig {
  port: number;
  host?: string;
  maxConnections?: number;
  heartbeatInterval?: number;
  commandTimeout?: number;
  enableCompression?: boolean;
  enableBatching?: boolean;
}

export interface ClientInfo {
  id: string;
  ws: WebSocket;
  connectedAt: Date;
  lastHeartbeat: Date;
  capabilities: ProtocolCapabilities;
  isAlive: boolean;
}

export interface WebSocketRequest extends IncomingMessage {
  url?: string;
  headers: Record<string, string | string[] | undefined>;
}

export interface AcknowledgmentInfo {
  timestamp: number;
  callback?: () => void;
}

// Command Processor Types
export interface CommandProcessorConfig {
  maxQueueSize?: number;
  commandTimeout?: number;
  retryAttempts?: number;
  enablePriority?: boolean;
}

export interface CommandResult {
  success: boolean;
  data?: CommandResultData;
  error?: string;
  commandId: string;
  executionTime: number;
}

export interface CommandResultData {
  action: string;
  [key: string]: unknown;
}

export interface CommandOptions {
  timeout?: number;
  priority?: number;
  callback?: (result: CommandResult) => void;
}

// Event Processor Types
export interface EventProcessorConfig {
  maxEventQueueSize?: number;
  batchSize?: number;
  batchInterval?: number;
  enableCompression?: boolean;
  enableFiltering?: boolean;
  eventWhitelist?: string[];
  eventBlacklist?: string[];
}

export interface EventHandler {
  id: string;
  eventType: string;
  priority: number;
  handler: (event: GameEvent) => Promise<void> | void;
  enabled: boolean;
  conditions?: EventCondition[];
  metadata: Record<string, unknown>;
}

export interface EventCondition {
  type: 'location' | 'skill_level' | 'item_owned' | 'quest_completed' | 'custom';
  parameters: Record<string, unknown>;
  evaluate: (gameState: unknown) => boolean;
}

// Message Types
export interface ConnectionMessage {
  clientId: string;
  capabilities: ProtocolCapabilities;
  timestamp: number;
}

export interface HeartbeatMessage {
  timestamp: number;
}

export interface ErrorMessage {
  errorType: RuneLiteErrorType;
  message: string;
  timestamp: number;
}

export interface AuthenticationMessage {
  token?: string;
  credentials?: Record<string, unknown>;
  timestamp: number;
}

export interface PluginMessage {
  pluginId: string;
  data: Record<string, unknown>;
  timestamp: number;
}

export interface StateUpdateMessage {
  state: Record<string, unknown>;
  delta?: Record<string, unknown>;
  timestamp: number;
}

// Event Handler Data Types
export interface PlayerLoginData {
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

export interface PlayerLogoutData {
  username: string;
  timestamp: number;
}

export interface CombatStartData {
  target: string;
  targetLevel: number;
  location: {
    x: number;
    y: number;
    plane: number;
  };
  timestamp: number;
}

export interface CombatEndData {
  target: string;
  result: 'victory' | 'defeat' | 'escape';
  damageDealt: number;
  damageTaken: number;
  timestamp: number;
}

export interface SkillExpGainedData {
  skillName: string;
  experience: number;
  level: number;
  timestamp: number;
}

export interface QuestCompletedData {
  questName: string;
  questId: number;
  questPoints: number;
  rewards: string[];
  timestamp: number;
}

export interface LocationChangedData {
  x: number;
  y: number;
  plane: number;
  region: number;
  method: 'walk' | 'run' | 'teleport' | 'follow';
  timestamp: number;
}

// Game State Types
export interface GameStateData {
  player: PlayerLoginData | null;
  location: {
    x: number;
    y: number;
    plane: number;
    region: number;
  };
  inventory: InventoryItemData[];
  equipment: InventoryItemData[];
  skills: SkillInfoData[];
  combat: CombatInfoData | null;
  quests: QuestInfoData[];
  isLoggedIn: boolean;
  worldId: number;
  gameMode: string;
  timestamp: number;
}

export interface InventoryItemData {
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

export interface SkillInfoData {
  name: string;
  level: number;
  experience: number;
  nextLevelExp: number;
  remainingExp: number;
  rank?: number;
}

export interface CombatInfoData {
  target?: {
    name: string;
    combatLevel: number;
    hitpoints: number;
    maxHitpoints: number;
    location: { x: number; y: number; plane: number };
  };
  inCombat: boolean;
  combatStyle: string;
  attackStyle: string;
  weaponType: string;
  isAutoCasting: boolean;
  activePrayers: string[];
}

export interface QuestInfoData {
  name: string;
  id: number;
  state: 'not_started' | 'in_progress' | 'completed';
  questPoints: number;
  requirements: string[];
  rewards: string[];
}

// Autonomous Activity Types
export interface AutonomousActivityData {
  id: string;
  type: string;
  status: 'idle' | 'running' | 'paused' | 'completed' | 'failed';
  config: Record<string, unknown>;
  startTime: number;
  progress: number;
  metrics: ActivityMetricsData;
  errors: string[];
  checkpoints: unknown[];
}

export interface ActivityMetricsData {
  actionsPerformed: number;
  experienceGained: Record<string, number>;
  goldEarned: number;
  timeElapsed: number;
  efficiency: number;
  successRate: number;
  itemsGained: Record<string, number>;
  itemsLost: Record<string, number>;
} 