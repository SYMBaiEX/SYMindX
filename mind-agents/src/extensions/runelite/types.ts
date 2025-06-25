export interface RuneLiteConfig {
  websocketUrl?: string
  reconnectInterval?: number
  maxReconnectAttempts?: number
  commandTimeout?: number
  enableLogging?: boolean
  gameStatePolling?: {
    enabled: boolean
    interval: number
  }
  autoReconnect?: boolean
}

export interface GameState {
  player: {
    name: string
    level: number
    hitpoints: number
    maxHitpoints: number
    prayer: number
    maxPrayer: number
    energy: number
    position: { x: number; y: number; plane: number }
    animation: number
    interacting: string | null
    inCombat: boolean
  }
  inventory: InventoryItem[]
  equipment: EquipmentItem[]
  skills: Record<string, SkillData>
  location: {
    region: string
    area: string
    coordinates: { x: number; y: number; plane: number }
  }
  npcs: NPC[]
  players: Player[]
  objects: GameObject[]
  items: GroundItem[]
  chat: ChatMessage[]
  quests: QuestData[]
  bank: BankItem[]
  trade: TradeData | null
  combat: CombatData | null
}

export interface InventoryItem {
  id: number
  name: string
  quantity: number
  slot: number
  noted: boolean
  stackable: boolean
}

export interface EquipmentItem {
  id: number
  name: string
  slot: string
  bonuses: Record<string, number>
}

export interface SkillData {
  level: number
  experience: number
  boostedLevel: number
}

export interface NPC {
  id: number
  name: string
  position: { x: number; y: number; plane: number }
  hitpoints: number
  maxHitpoints: number
  animation: number
  interacting: string | null
  inCombat: boolean
  aggressive: boolean
}

export interface Player {
  name: string
  level: number
  position: { x: number; y: number; plane: number }
  animation: number
  equipment: EquipmentItem[]
  overhead: string | null
}

export interface GameObject {
  id: number
  name: string
  position: { x: number; y: number; plane: number }
  type: 'wall' | 'floor' | 'interactive'
  actions: string[]
}

export interface GroundItem {
  id: number
  name: string
  quantity: number
  position: { x: number; y: number; plane: number }
  spawned: boolean
}

export interface ChatMessage {
  type: 'public' | 'private' | 'clan' | 'system' | 'game'
  sender: string | null
  message: string
  timestamp: Date
}

export interface QuestData {
  id: number
  name: string
  state: 'not_started' | 'in_progress' | 'completed'
  progress: number
  requirements: string[]
}

export interface BankItem {
  id: number
  name: string
  quantity: number
  tab: number
}

export interface TradeData {
  partner: string
  ourOffer: InventoryItem[]
  theirOffer: InventoryItem[]
  status: 'first_screen' | 'second_screen' | 'completed' | 'declined'
}

export interface CombatData {
  target: string
  targetType: 'npc' | 'player'
  combatStyle: string
  autoRetaliate: boolean
  specialAttack: {
    enabled: boolean
    energy: number
  }
}

export interface RuneLiteEvent {
  type: 'game_tick' | 'player_death' | 'level_up' | 'item_received' | 
        'combat_started' | 'quest_update' | 'chat_message' | 'trade_request' |
        'bank_opened' | 'shop_opened' | 'interface_opened' | 'animation_changed' |
        'location_changed' | 'npc_spawned' | 'player_joined' | 'item_dropped'
  data: any
  timestamp: Date
}

export interface RuneLiteCommand {
  action: 'move' | 'attack' | 'interact' | 'cast_spell' | 'use_item' | 
          'chat' | 'bank' | 'trade' | 'skill_action' | 'get_game_state' |
          'click' | 'key_press' | 'menu_action' | 'camera_move'
  target?: string | number
  parameters?: Record<string, any>
  timeout?: number
}

export interface RuneLiteResponse {
  success: boolean
  data?: any
  error?: string
  timestamp: Date
}