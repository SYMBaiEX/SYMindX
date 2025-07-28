import { BaseConfig, DataValue } from '../../types/common.js';

export interface RuneLiteSettings extends BaseConfig {
  port?: number;
  host?: string;
  events?: string[];
  reconnectDelay?: number;
  heartbeatInterval?: number;
  commandTimeout?: number;
  enableAutoReconnect?: boolean;
  enableHeartbeat?: boolean;
  enableEventFiltering?: boolean;
  enableGameStateTracking?: boolean;
  enableAdvancedCommands?: boolean;
  enableSecurityValidation?: boolean;
  enableCompression?: boolean;
  enableBatching?: boolean;
  enableEventRecording?: boolean;
  enableMacroSystem?: boolean;
  enablePathfinding?: boolean;
  enableAutomation?: boolean;
  enablePluginBridge?: boolean;
  allowedOrigins?: string[];
  eventWhitelist?: EventType[];
  eventBlacklist?: EventType[];
  maxEventQueueSize?: number;
  eventBatchSize?: number;
  eventBatchInterval?: number;
  compressionLevel?: number;
  protocolVersion?: string;
  capabilities?: string[];
  pluginWhitelist?: string[];
  automationSafety?: AutomationSafetyConfig;
}

export interface RuneLiteConfig {
  enabled?: boolean;
  priority?: number;
  settings: RuneLiteSettings;
  dependencies?: string[];
  capabilities?: string[];
}

// Enhanced Event Types
export enum EventType {
  // Player Events
  PLAYER_LOGIN = 'player_login',
  PLAYER_LOGOUT = 'player_logout',
  PLAYER_SPAWN = 'player_spawn',
  PLAYER_DEATH = 'player_death',
  PLAYER_LEVEL_UP = 'player_level_up',
  PLAYER_QUEST_COMPLETE = 'player_quest_complete',
  PLAYER_ACHIEVEMENT = 'player_achievement',
  PLAYER_ANIMATION = 'player_animation',
  PLAYER_INTERACT = 'player_interact',
  PLAYER_IDLE = 'player_idle',

  // Combat Events
  COMBAT_START = 'combat_start',
  COMBAT_END = 'combat_end',
  DAMAGE_GIVEN = 'damage_given',
  DAMAGE_TAKEN = 'damage_taken',
  PRAYER_ACTIVATED = 'prayer_activated',
  PRAYER_DEACTIVATED = 'prayer_deactivated',
  SPECIAL_ATTACK = 'special_attack',
  KILL_COUNT = 'kill_count',

  // Inventory Events
  ITEM_ADDED = 'item_added',
  ITEM_REMOVED = 'item_removed',
  ITEM_EQUIPPED = 'item_equipped',
  ITEM_UNEQUIPPED = 'item_unequipped',
  INVENTORY_FULL = 'inventory_full',
  BANK_OPENED = 'bank_opened',
  BANK_CLOSED = 'bank_closed',
  BANK_ITEM_ADDED = 'bank_item_added',
  BANK_ITEM_REMOVED = 'bank_item_removed',

  // Location Events
  LOCATION_CHANGED = 'location_changed',
  REGION_CHANGED = 'region_changed',
  TELEPORT = 'teleport',
  DOOR_OPENED = 'door_opened',
  STAIRS_CLIMBED = 'stairs_climbed',

  // Skill Events
  SKILL_EXP_GAINED = 'skill_exp_gained',
  SKILL_TRAINING_START = 'skill_training_start',
  SKILL_TRAINING_STOP = 'skill_training_stop',
  RESOURCE_DEPLETED = 'resource_depleted',
  RESOURCE_RESPAWNED = 'resource_respawned',

  // NPC Events
  NPC_SPAWNED = 'npc_spawned',
  NPC_DESPAWNED = 'npc_despawned',
  NPC_ANIMATION = 'npc_animation',
  NPC_INTERACT = 'npc_interact',
  NPC_DIALOGUE = 'npc_dialogue',

  // Object Events
  OBJECT_SPAWNED = 'object_spawned',
  OBJECT_DESPAWNED = 'object_despawned',
  OBJECT_ANIMATION = 'object_animation',
  OBJECT_INTERACT = 'object_interact',

  // Ground Item Events
  GROUND_ITEM_SPAWNED = 'ground_item_spawned',
  GROUND_ITEM_DESPAWNED = 'ground_item_despawned',
  GROUND_ITEM_PICKED = 'ground_item_picked',

  // Widget/Interface Events
  WIDGET_OPENED = 'widget_opened',
  WIDGET_CLOSED = 'widget_closed',
  WIDGET_CLICKED = 'widget_clicked',
  WIDGET_UPDATED = 'widget_updated',

  // Trading Events
  TRADE_REQUESTED = 'trade_requested',
  TRADE_OPENED = 'trade_opened',
  TRADE_UPDATED = 'trade_updated',
  TRADE_ACCEPTED = 'trade_accepted',
  TRADE_DECLINED = 'trade_declined',

  // Grand Exchange Events
  GE_OFFER_CREATED = 'ge_offer_created',
  GE_OFFER_UPDATED = 'ge_offer_updated',
  GE_OFFER_COMPLETED = 'ge_offer_completed',
  GE_OFFER_CANCELLED = 'ge_offer_cancelled',

  // Clan Events
  CLAN_JOINED = 'clan_joined',
  CLAN_LEFT = 'clan_left',
  CLAN_MESSAGE = 'clan_message',
  CLAN_RANK_CHANGED = 'clan_rank_changed',

  // Game Events
  GAME_TICK = 'game_tick',
  CHAT_MESSAGE = 'chat_message',
  NOTIFICATION = 'notification',
  RANDOM_EVENT = 'random_event',
  WORLD_HOPPED = 'world_hopped',

  // Plugin Events
  PLUGIN_START = 'plugin_start',
  PLUGIN_STOP = 'plugin_stop',
  PLUGIN_ERROR = 'plugin_error',
  PLUGIN_MESSAGE = 'plugin_message',

  // Custom Events
  CUSTOM_EVENT = 'custom_event',
  EVENT_BATCH = 'event_batch',
}

// Automation Safety Configuration
export interface AutomationSafetyConfig {
  enableAntiPattern?: boolean;
  minActionDelay?: number;
  maxActionDelay?: number;
  randomDelayVariance?: number;
  maxActionsPerMinute?: number;
  breakInterval?: number;
  breakDuration?: number;
  humanMouseMovement?: boolean;
  misclickChance?: number;
  reactionTimeRange?: [number, number];
}

// Event Priority Levels
export enum EventPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3,
}

// Event Recording
export interface EventRecording {
  id: string;
  startTime: number;
  endTime?: number;
  events: RecordedEvent[];
  metadata: Record<string, unknown>;
}

export interface RecordedEvent {
  event: GameEvent;
  timestamp: number;
  gameTime: number;
  replayable: boolean;
}

// Macro System
export interface Macro {
  id: string;
  name: string;
  description?: string;
  actions: MacroAction[];
  triggers?: MacroTrigger[];
  conditions?: MacroCondition[];
  metadata: Record<string, unknown>;
}

export interface MacroAction {
  type: ActionType;
  parameters: Record<string, unknown>;
  delay?: number;
  condition?: MacroCondition;
}

export interface MacroTrigger {
  type: 'hotkey' | 'event' | 'condition' | 'schedule';
  value: unknown;
}

export interface MacroCondition {
  type: 'hp_below' | 'prayer_below' | 'inventory_full' | 'location' | 'custom';
  value: unknown;
  operator?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains';
}

// Pathfinding
export interface PathfindingOptions {
  avoidPlayers?: boolean;
  avoidCombat?: boolean;
  preferRoads?: boolean;
  maxDistance?: number;
  allowTeleports?: boolean;
  energyThreshold?: number;
}

export interface Path {
  tiles: PathTile[];
  distance: number;
  estimatedTime: number;
  obstacles: Obstacle[];
}

export interface PathTile {
  x: number;
  y: number;
  plane: number;
  walkable: boolean;
  cost: number;
}

export interface Obstacle {
  type: 'door' | 'gate' | 'stile' | 'agility' | 'quest' | 'skill';
  location: { x: number; y: number; plane: number };
  requirements?: string[];
  action?: string;
}

// Plugin Bridge
export interface PluginMessage {
  id?: string;
  source: string;
  target: string;
  type: string;
  data: unknown;
  timestamp: number;
  replyTo?: string;
}

export interface PluginCapability {
  name: string;
  version: string;
  methods: string[];
  events: string[];
}

export enum ActionType {
  // Movement
  WALK_TO = 'walk_to',
  RUN_TO = 'run_to',
  TELEPORT_TO = 'teleport_to',
  FOLLOW_PLAYER = 'follow_player',
  FOLLOW_NPC = 'follow_npc',

  // Interaction
  CLICK_OBJECT = 'click_object',
  CLICK_NPC = 'click_npc',
  CLICK_ITEM = 'click_item',
  CLICK_WIDGET = 'click_widget',
  USE_ITEM = 'use_item',
  USE_ITEM_ON = 'use_item_on',
  DROP_ITEM = 'drop_item',
  EQUIP_ITEM = 'equip_item',
  EXAMINE = 'examine',

  // Combat
  ATTACK_NPC = 'attack_npc',
  ATTACK_PLAYER = 'attack_player',
  CAST_SPELL = 'cast_spell',
  ACTIVATE_PRAYER = 'activate_prayer',
  DEACTIVATE_PRAYER = 'deactivate_prayer',
  EAT_FOOD = 'eat_food',
  DRINK_POTION = 'drink_potion',
  USE_SPECIAL = 'use_special',
  SWITCH_STYLE = 'switch_style',

  // Skills
  FISH = 'fish',
  MINE = 'mine',
  WOODCUT = 'woodcut',
  COOK = 'cook',
  SMITH = 'smith',
  CRAFT = 'craft',
  FLETCH = 'fletch',
  HERBLORE = 'herblore',
  AGILITY = 'agility',
  THIEVE = 'thieve',
  FARM = 'farm',
  HUNTER = 'hunter',
  CONSTRUCTION = 'construction',

  // Banking
  OPEN_BANK = 'open_bank',
  CLOSE_BANK = 'close_bank',
  DEPOSIT_ITEM = 'deposit_item',
  WITHDRAW_ITEM = 'withdraw_item',
  DEPOSIT_ALL = 'deposit_all',
  BANK_NOTE = 'bank_note',

  // Trading
  TRADE_PLAYER = 'trade_player',
  ACCEPT_TRADE = 'accept_trade',
  DECLINE_TRADE = 'decline_trade',
  ADD_TRADE_ITEM = 'add_trade_item',
  REMOVE_TRADE_ITEM = 'remove_trade_item',

  // Grand Exchange
  GE_BUY = 'ge_buy',
  GE_SELL = 'ge_sell',
  GE_ABORT = 'ge_abort',
  GE_COLLECT = 'ge_collect',

  // Interface
  OPEN_INTERFACE = 'open_interface',
  CLOSE_INTERFACE = 'close_interface',
  SEND_CHAT = 'send_chat',
  TAKE_SCREENSHOT = 'take_screenshot',
  LOGOUT = 'logout',
  HOP_WORLD = 'hop_world',

  // Quest
  START_QUEST = 'start_quest',
  CONTINUE_DIALOGUE = 'continue_dialogue',
  SELECT_OPTION = 'select_option',

  // Automation
  RUN_SCRIPT = 'run_script',
  STOP_SCRIPT = 'stop_script',
  PAUSE_SCRIPT = 'pause_script',
  RECORD_MACRO = 'record_macro',
  PLAY_MACRO = 'play_macro',

  // Custom
  CUSTOM_ACTION = 'custom_action',
  BATCH_ACTIONS = 'batch_actions',
}

export interface GameEvent {
  id?: string;
  type: EventType;
  timestamp: number;
  data: Record<string, unknown>;
  player?: PlayerInfo;
  source?: string;
  processed?: boolean;
}

export interface RuneLiteCommand {
  id: string;
  name: string;
  action: ActionType;
  args?: Record<string, unknown>;
  timestamp: number;
  timeout?: number;
  priority?: number;
  retries?: number;
  callback?: (result: any) => void;
}

// Player Information
export interface PlayerInfo {
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

// Inventory Item
export interface InventoryItem {
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

// Skill Information
export interface SkillInfo {
  name: string;
  level: number;
  experience: number;
  nextLevelExp: number;
  remainingExp: number;
  rank?: number;
}

// Combat Information
export interface CombatInfo {
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

// Quest Information
export interface QuestInfo {
  name: string;
  id: number;
  state: 'not_started' | 'in_progress' | 'completed';
  questPoints: number;
  requirements: string[];
  rewards: string[];
}

// NPC Information
export interface NPCInfo {
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

// Game Object
export interface GameObject {
  id: number;
  name: string;
  location: { x: number; y: number; plane: number };
  actions: string[];
  orientation: number;
  type: 'wall' | 'floor' | 'interactive' | 'decoration';
  animation?: number;
}

// Ground Item
export interface GroundItem {
  id: number;
  name: string;
  quantity: number;
  location: { x: number; y: number; plane: number };
  value: number;
  ownership?: 'mine' | 'other' | 'none';
  despawnTime?: number;
}

// Widget Information
export interface WidgetInfo {
  id: number;
  parentId?: number;
  type: string;
  text?: string;
  actions?: string[];
  hidden: boolean;
  bounds: { x: number; y: number; width: number; height: number };
  children?: WidgetInfo[];
}

// Game State
export interface GameState {
  player: PlayerInfo | null;
  location: {
    x: number;
    y: number;
    plane: number;
    region: number;
  };
  inventory: InventoryItem[];
  equipment: InventoryItem[];
  skills: SkillInfo[];
  combat: CombatInfo | null;
  quests: QuestInfo[];
  isLoggedIn: boolean;
  worldId: number;
  gameMode: string;
  timestamp: number;
  // Enhanced state tracking
  npcs?: NPCInfo[];
  objects?: GameObject[];
  groundItems?: GroundItem[];
  players?: PlayerInfo[];
  widgets?: WidgetInfo[];
  activeMacro?: string;
  pathfinding?: Path;
}

// WebSocket Message Types
export interface WebSocketMessage {
  type:
    | 'event'
    | 'command'
    | 'heartbeat'
    | 'auth'
    | 'error'
    | 'batch'
    | 'ack'
    | 'plugin'
    | 'state';
  data: any;
  timestamp: number;
  id?: string;
  version?: string;
  compressed?: boolean;
  priority?: EventPriority;
  replyTo?: string;
  requiresAck?: boolean;
}

// Error Types
export enum RuneLiteErrorType {
  CONNECTION_FAILED = 'connection_failed',
  COMMAND_TIMEOUT = 'command_timeout',
  INVALID_COMMAND = 'invalid_command',
  AUTHENTICATION_FAILED = 'authentication_failed',
  RATE_LIMITED = 'rate_limited',
  PLUGIN_ERROR = 'plugin_error',
  GAME_NOT_READY = 'game_not_ready',
  MACRO_ERROR = 'macro_error',
  PATHFINDING_ERROR = 'pathfinding_error',
  AUTOMATION_BLOCKED = 'automation_blocked',
}

// Protocol Capabilities
export interface ProtocolCapabilities {
  version: string;
  compression: boolean;
  batching: boolean;
  eventRecording: boolean;
  macroSystem: boolean;
  pathfinding: boolean;
  pluginBridge: boolean;
  stateSync: boolean;
  acknowledgments: boolean;
  priorities: boolean;
}

// Event Batch
export interface EventBatch {
  id: string;
  events: GameEvent[];
  compressed: boolean;
  priority: EventPriority;
  timestamp: number;
}

// State Delta
export interface StateDelta {
  timestamp: number;
  changes: StateChange[];
  compressed: boolean;
}

export interface StateChange {
  path: string;
  operation: 'add' | 'update' | 'remove';
  value: unknown;
  previousValue?: unknown;
}

// Task Automation
export interface AutomationTask {
  id: string;
  type: 'skill' | 'combat' | 'quest' | 'travel' | 'custom';
  name: string;
  status: 'idle' | 'running' | 'paused' | 'completed' | 'failed';
  progress: number;
  actions: ActionType[];
  config: Record<string, unknown>;
  safety: AutomationSafetyConfig;
}

// Banking
export interface BankInfo {
  isOpen: boolean;
  items: BankItem[];
  tabs: BankTab[];
  totalValue: number;
  usedSlots: number;
  maxSlots: number;
}

export interface BankItem extends InventoryItem {
  tab: number;
}

export interface BankTab {
  id: number;
  icon?: number;
  items: number[];
}

// Grand Exchange
export interface GrandExchangeOffer {
  slot: number;
  itemId: number;
  itemName: string;
  type: 'buy' | 'sell';
  price: number;
  quantity: number;
  transferred: number;
  spent: number;
  state:
    | 'empty'
    | 'pending'
    | 'buying'
    | 'selling'
    | 'bought'
    | 'sold'
    | 'cancelled';
}

// Trading
export interface TradeInfo {
  partner: string;
  myOffer: TradeOffer;
  theirOffer: TradeOffer;
  screen: 'first' | 'second';
  accepted: boolean;
}

export interface TradeOffer {
  items: InventoryItem[];
  value: number;
  accepted: boolean;
}

// Clan Information
export interface ClanInfo {
  name: string;
  rank: string;
  members: ClanMember[];
  joinDate?: number;
}

export interface ClanMember {
  username: string;
  rank: string;
  world?: number;
  location?: string;
}

// Performance Metrics
export interface PerformanceMetrics {
  fps: number;
  ping: number;
  tickDelay: number;
  cpuUsage: number;
  memoryUsage: number;
  renderTime: number;
}
