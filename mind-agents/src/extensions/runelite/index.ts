import { Extension, ExtensionAction, ExtensionEventHandler, Agent, ActionResult, ActionResultType, AgentEvent, ExtensionType, ExtensionStatus } from '../../types/agent.js'
import { ExtensionConfig } from '../../types/common.js'
import { WebSocket } from 'ws'
import { EventEmitter } from 'events'
import { RuneLiteConfig, GameState, RuneLiteEvent, RuneLiteCommand, RuneLiteResponse } from './types.js'
import { initializeSkills } from './skills/index.js'

export class RuneLiteExtension implements Extension {
  id = 'runelite'
  name = 'RuneLite Integration'
  version = '1.0.0'
  type = ExtensionType.GAME_INTEGRATION
  enabled = true
  status = ExtensionStatus.ENABLED
  config: ExtensionConfig
  
  private ws?: WebSocket
  private eventEmitter = new EventEmitter()
  private skills: any
  private gameState: GameState = {
    player: {
      name: '',
      level: 1,
      hitpoints: 10,
      maxHitpoints: 10,
      prayer: 1,
      maxPrayer: 1,
      energy: 100,
      position: { x: 0, y: 0, plane: 0 },
      animation: -1,
      interacting: null,
      inCombat: false
    },
    inventory: [],
    equipment: [],
    skills: {},
    location: {
      region: 'unknown',
      area: 'unknown',
      coordinates: { x: 0, y: 0, plane: 0 }
    },
    npcs: [],
    players: [],
    objects: [],
    items: [],
    chat: [],
    quests: [],
    bank: [],
    trade: null,
    combat: null
  }
  private reconnectAttempts = 0
  private heartbeatInterval?: NodeJS.Timeout

  private runeliteConfig: RuneLiteConfig

  constructor(config?: Partial<RuneLiteConfig>) {
    this.runeliteConfig = {
      websocketUrl: 'ws://localhost:8080/runelite',
      reconnectInterval: 5000,
      maxReconnectAttempts: 5,
      commandTimeout: 10000,
      enableLogging: true,
      gameStatePolling: {
        enabled: true,
        interval: 1000
      },
      autoReconnect: true,
      ...config
    }
    
    this.config = {
      enabled: true,
      settings: this.runeliteConfig as any
    }
    
    // Initialize skills
    this.skills = initializeSkills(this)
  }

  async init(agent: Agent): Promise<void> {
    console.log(`🎮 Initializing RuneLite extension for agent ${agent.name}`)
    
    try {
      await this.connectToRuneLite()
      this.setupEventHandlers(agent)
      console.log(`✅ RuneLite extension initialized for ${agent.name}`)
    } catch (error) {
      console.error(`❌ Failed to initialize RuneLite extension:`, error)
      throw error
    }
  }

  async tick(agent: Agent): Promise<void> {
    // Update game state and process any pending actions
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      if (this.runeliteConfig.gameStatePolling?.enabled) {
        await this.updateGameState()
      }
      await this.processGameEvents(agent)
    } else if (this.runeliteConfig.autoReconnect) {
      await this.attemptReconnect()
    }
  }

  get actions(): Record<string, ExtensionAction> {
    // Combine all actions from all skills
    const allActions: Record<string, ExtensionAction> = {}
    
    // Add actions from each skill
    Object.entries(this.skills).forEach(([skillName, skill]: [string, any]) => {
      if (skill && typeof skill.getActions === 'function') {
        const skillActions = skill.getActions()
        Object.entries(skillActions).forEach(([actionName, action]: [string, any]) => {
          allActions[actionName] = action
        })
      }
    })
    
    return allActions
  }

  events: Record<string, ExtensionEventHandler> = {
    game_tick: {
      event: 'game_tick',
      description: 'Handle game tick events from RuneLite',
      handler: async (agent: Agent, event: AgentEvent) => {
        await this.handleGameTick(agent, event.data)
      }
    },
    
    player_death: {
      event: 'player_death',
      description: 'Handle player death events',
      handler: async (agent: Agent, event: AgentEvent) => {
        await this.handlePlayerDeath(agent, event.data)
      }
    },
    
    level_up: {
      event: 'level_up',
      description: 'Handle skill level up events',
      handler: async (agent: Agent, event: AgentEvent) => {
        await this.handleLevelUp(agent, event.data)
      }
    },
    
    item_received: {
      event: 'item_received',
      description: 'Handle item received events',
      handler: async (agent: Agent, event: AgentEvent) => {
        await this.handleItemReceived(agent, event.data)
      }
    },
    
    combat_started: {
      event: 'combat_started',
      description: 'Handle combat started events',
      handler: async (agent: Agent, event: AgentEvent) => {
        await this.handleCombatStarted(agent, event.data)
      }
    },
    
    quest_update: {
      event: 'quest_update',
      description: 'Handle quest progress update events',
      handler: async (agent: Agent, event: AgentEvent) => {
        await this.handleQuestUpdate(agent, event.data)
      }
    }
  }

  private async connectToRuneLite(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.runeliteConfig.websocketUrl || 'ws://localhost:8080')
        
        this.ws.on('open', () => {
          if (this.runeliteConfig.enableLogging) {
            console.log('🔗 Connected to RuneLite WebSocket')
          }
          this.reconnectAttempts = 0
          this.startHeartbeat()
          resolve()
        })
        
        this.ws.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString())
            this.handleRuneLiteMessage(message)
          } catch (error) {
            console.error('❌ Failed to parse RuneLite message:', error)
          }
        })
        
        this.ws.on('close', () => {
          if (this.runeliteConfig.enableLogging) {
            console.log('🔌 RuneLite WebSocket connection closed')
          }
          this.stopHeartbeat()
        })
        
        this.ws.on('error', (error) => {
          console.error('❌ RuneLite WebSocket error:', error)
          reject(error)
        })
        
        // Timeout after configured time
        setTimeout(() => {
          if (this.ws?.readyState !== WebSocket.OPEN) {
            reject(new Error('Connection timeout'))
          }
        }, this.runeliteConfig.commandTimeout)
        
      } catch (error) {
        reject(error)
      }
    })
  }

  private async attemptReconnect(): Promise<void> {
    if (this.reconnectAttempts >= (this.runeliteConfig.maxReconnectAttempts || 5)) {
      console.error('❌ Max reconnection attempts reached for RuneLite')
      return
    }
    
    this.reconnectAttempts++
    if (this.runeliteConfig.enableLogging) {
      console.log(`🔄 Attempting to reconnect to RuneLite (${this.reconnectAttempts}/${this.runeliteConfig.maxReconnectAttempts})`)
    }
    
    try {
      await new Promise(resolve => setTimeout(resolve, this.runeliteConfig.reconnectInterval))
      await this.connectToRuneLite()
    } catch (error) {
      console.error(`❌ Reconnection attempt ${this.reconnectAttempts} failed:`, error)
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }))
      }
    }, 30000) // 30 second heartbeat
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = undefined
    }
  }

  private handleRuneLiteMessage(message: any): void {
    switch (message.type) {
      case 'game_state':
        this.updateGameStateFromMessage(message.data)
        break
      case 'event':
        this.emitGameEvent(message.data)
        break
      case 'pong':
        // Heartbeat response
        break
      default:
        if (this.runeliteConfig.enableLogging) {
          console.log('📨 Unknown RuneLite message type:', message.type)
        }
    }
  }

  private updateGameStateFromMessage(data: any): void {
    this.gameState = {
      ...this.gameState,
      ...data
    }
  }

  private emitGameEvent(eventData: any): void {
    const event: RuneLiteEvent = {
      type: eventData.type,
      data: eventData,
      timestamp: new Date()
    }
    
    this.eventEmitter.emit('game_event', {
      id: `runelite_${Date.now()}`,
      type: eventData.type,
      source: 'runelite',
      data: eventData,
      timestamp: new Date(),
      processed: false
    })
  }

  private setupEventHandlers(agent: Agent): void {
    this.eventEmitter.on('game_event', (event: AgentEvent) => {
      // Forward game events to the agent's event bus
      // This would be handled by the runtime
    })
  }

  private async updateGameState(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'get_state' }))
    }
  }

  private async processGameEvents(agent: Agent): Promise<void> {
    // Process any pending game events
    // This would integrate with the agent's event processing system
  }

  // Action implementations
  private async executeMove(x: number, y: number, plane: number): Promise<ActionResult> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return { success: false, type: ActionResultType.FAILURE, error: 'Not connected to RuneLite' }
    }
    
    try {
      const command: RuneLiteCommand = {
        action: 'move',
        parameters: { x, y, plane },
        timeout: this.runeliteConfig.commandTimeout
      }
      
      this.ws.send(JSON.stringify({
        type: 'command',
        ...command
      }))
      
      return { success: true, type: ActionResultType.SUCCESS, result: { x, y, plane } }
    } catch (error) {
      return { success: false, type: ActionResultType.FAILURE, error: error instanceof Error ? error.message : String(error) }
    }
  }

  private async executeAttack(targetId: string): Promise<ActionResult> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return { success: false, type: ActionResultType.FAILURE, error: 'Not connected to RuneLite' }
    }
    
    try {
      const command: RuneLiteCommand = {
        action: 'attack',
        target: targetId,
        timeout: this.runeliteConfig.commandTimeout
      }
      
      this.ws.send(JSON.stringify({
        type: 'command',
        ...command
      }))
      
      return { success: true, type: ActionResultType.SUCCESS, result: { targetId, action: 'attack' } }
    } catch (error) {
      return { success: false, type: ActionResultType.FAILURE, error: error instanceof Error ? error.message : String(error) }
    }
  }

  private async executeInteraction(targetId: string, action: string): Promise<ActionResult> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return { success: false, type: ActionResultType.FAILURE, error: 'Not connected to RuneLite' }
    }
    
    try {
      const command: RuneLiteCommand = {
        action: 'interact',
        target: targetId,
        parameters: { action },
        timeout: this.runeliteConfig.commandTimeout
      }
      
      this.ws.send(JSON.stringify({
        type: 'command',
        ...command
      }))
      
      return { success: true, type: ActionResultType.SUCCESS, result: { targetId, action } }
    } catch (error) {
      return { success: false, type: ActionResultType.FAILURE, error: error instanceof Error ? error.message : String(error) }
    }
  }

  private async executeCastSpell(spellName: string, targetId?: string): Promise<ActionResult> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return { success: false, type: ActionResultType.FAILURE, error: 'Not connected to RuneLite' }
    }
    
    try {
      const command: RuneLiteCommand = {
        action: 'cast_spell',
        target: targetId,
        parameters: { spellName },
        timeout: this.runeliteConfig.commandTimeout
      }
      
      this.ws.send(JSON.stringify({
        type: 'command',
        ...command
      }))
      
      return { success: true, type: ActionResultType.SUCCESS, result: { spellName, targetId } }
    } catch (error) {
      return { success: false, type: ActionResultType.FAILURE, error: error instanceof Error ? error.message : String(error) }
    }
  }

  private async executeUseItem(itemId: string, targetId?: string): Promise<ActionResult> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return { success: false, type: ActionResultType.FAILURE, error: 'Not connected to RuneLite' }
    }
    
    try {
      const command: RuneLiteCommand = {
        action: 'use_item',
        target: targetId,
        parameters: { itemId },
        timeout: this.runeliteConfig.commandTimeout
      }
      
      this.ws.send(JSON.stringify({
        type: 'command',
        ...command
      }))
      
      return { success: true, type: ActionResultType.SUCCESS, result: { itemId, targetId } }
    } catch (error) {
      return { success: false, type: ActionResultType.FAILURE, error: error instanceof Error ? error.message : String(error) }
    }
  }

  private async executeChat(message: string, type: string): Promise<ActionResult> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return { success: false, type: ActionResultType.FAILURE, error: 'Not connected to RuneLite' }
    }
    
    try {
      const command: RuneLiteCommand = {
        action: 'chat',
        parameters: { message, type },
        timeout: this.runeliteConfig.commandTimeout
      }
      
      this.ws.send(JSON.stringify({
        type: 'command',
        ...command
      }))
      
      return { success: true, type: ActionResultType.SUCCESS, result: { message, type } }
    } catch (error) {
      return { success: false, type: ActionResultType.FAILURE, error: error instanceof Error ? error.message : String(error) }
    }
  }

  private async executeBankOperation(action: string, itemId?: string, quantity?: number): Promise<ActionResult> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return { success: false, type: ActionResultType.FAILURE, error: 'Not connected to RuneLite' }
    }
    
    try {
      const command: RuneLiteCommand = {
        action: 'bank',
        parameters: { action, itemId, quantity },
        timeout: this.runeliteConfig.commandTimeout
      }
      
      this.ws.send(JSON.stringify({
        type: 'command',
        ...command
      }))
      
      return { success: true, type: ActionResultType.SUCCESS, result: { action, itemId, quantity } }
    } catch (error) {
      return { success: false, type: ActionResultType.FAILURE, error: error instanceof Error ? error.message : String(error) }
    }
  }

  private async executeTrade(playerId: string, action: string, items?: any[]): Promise<ActionResult> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return { success: false, type: ActionResultType.FAILURE, error: 'Not connected to RuneLite' }
    }
    
    try {
      const command: RuneLiteCommand = {
        action: 'trade',
        target: playerId,
        parameters: { action, items },
        timeout: this.runeliteConfig.commandTimeout
      }
      
      this.ws.send(JSON.stringify({
        type: 'command',
        ...command
      }))
      
      return { success: true, type: ActionResultType.SUCCESS, result: { playerId, action, items } }
    } catch (error) {
      return { success: false, type: ActionResultType.FAILURE, error: error instanceof Error ? error.message : String(error) }
    }
  }

  private async executeSkillAction(skill: string, action: string, targetId?: string): Promise<ActionResult> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return { success: false, type: ActionResultType.FAILURE, error: 'Not connected to RuneLite' }
    }
    
    try {
      const command: RuneLiteCommand = {
        action: 'skill_action',
        target: targetId,
        parameters: { skill, action },
        timeout: this.runeliteConfig.commandTimeout
      }
      
      this.ws.send(JSON.stringify({
        type: 'command',
        ...command
      }))
      
      return { success: true, type: ActionResultType.SUCCESS, result: { skill, action, targetId } }
    } catch (error) {
      return { success: false, type: ActionResultType.FAILURE, error: error instanceof Error ? error.message : String(error) }
    }
  }

  // Event handlers
  private async handleGameTick(agent: Agent, data: any): Promise<void> {
    // Update agent's understanding of game state
    // This could trigger memory updates, emotion changes, etc.
    if (this.runeliteConfig.enableLogging) {
      console.log(`🎮 Game tick for agent ${agent.name}`)
    }
  }

  private async handlePlayerDeath(agent: Agent, data: any): Promise<void> {
    // Handle death event - might trigger frustration emotion
    console.log(`💀 Player death detected for agent ${agent.name}`)
  }

  private async handleLevelUp(agent: Agent, data: any): Promise<void> {
    // Handle level up - might trigger excitement emotion
    console.log(`🎉 Level up detected for agent ${agent.name}: ${data.skill} level ${data.level}`)
  }

  private async handleItemReceived(agent: Agent, data: any): Promise<void> {
    // Handle item drops/rewards
    console.log(`📦 Item received for agent ${agent.name}: ${data.itemName}`)
  }

  private async handleCombatStarted(agent: Agent, data: any): Promise<void> {
    // Handle combat initiation
    console.log(`⚔️ Combat started for agent ${agent.name}`)
  }

  private async handleQuestUpdate(agent: Agent, data: any): Promise<void> {
    // Handle quest progress
    console.log(`📜 Quest update for agent ${agent.name}: ${data.questName}`)
  }

  // Utility methods
  getGameState(): GameState {
    return { ...this.gameState }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  async sendCommand(command: RuneLiteCommand): Promise<void> {
    if (!this.isConnected()) {
      throw new Error('Not connected to RuneLite')
    }
    
    this.ws!.send(JSON.stringify({
      type: 'command',
      ...command
    }))
  }

  disconnect(): void {
    this.stopHeartbeat()
    if (this.ws) {
      this.ws.close()
      this.ws = undefined
    }
  }
}

export * from './types.js'
export default RuneLiteExtension