/**
 * GameState Skill for RuneLite Extension
 * 
 * Provides actions related to querying and interacting with the game state.
 */

import { ExtensionAction, Agent, ActionResult, ActionResultType, ActionCategory } from '../../../types/agent.js'
import { RuneLiteExtension } from '../index.js'
import { GameState } from '../types.js'

export class GameStateSkill {
  private extension: RuneLiteExtension

  constructor(extension: RuneLiteExtension) {
    this.extension = extension
  }

  /**
   * Get all game state-related actions
   */
  getActions(): Record<string, ExtensionAction> {
    return {
      get_game_state: {
        name: 'get_game_state',
        description: 'Get the current game state',
        category: ActionCategory.OBSERVATION,
        parameters: {},
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.getGameState()
        }
      },
      
      get_player_stats: {
        name: 'get_player_stats',
        description: 'Get the player\'s current stats',
        category: ActionCategory.OBSERVATION,
        parameters: {},
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.getPlayerStats()
        }
      },
      
      get_nearby_npcs: {
        name: 'get_nearby_npcs',
        description: 'Get information about nearby NPCs',
        category: ActionCategory.OBSERVATION,
        parameters: { radius: 'number' },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.getNearbyNPCs(params.radius)
        }
      },
      
      get_nearby_players: {
        name: 'get_nearby_players',
        description: 'Get information about nearby players',
        category: ActionCategory.OBSERVATION,
        parameters: { radius: 'number' },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.getNearbyPlayers(params.radius)
        }
      },
      
      get_nearby_objects: {
        name: 'get_nearby_objects',
        description: 'Get information about nearby game objects',
        category: ActionCategory.OBSERVATION,
        parameters: { radius: 'number' },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.getNearbyObjects(params.radius)
        }
      },
      
      get_ground_items: {
        name: 'get_ground_items',
        description: 'Get information about items on the ground',
        category: ActionCategory.OBSERVATION,
        parameters: { radius: 'number' },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.getGroundItems(params.radius)
        }
      },
      
      get_quest_status: {
        name: 'get_quest_status',
        description: 'Get the status of quests',
        category: ActionCategory.OBSERVATION,
        parameters: { questName: 'string' },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.getQuestStatus(params.questName)
        }
      }
    }
  }

  /**
   * Get the current game state
   */
  async getGameState(): Promise<ActionResult> {
    try {
      if (!this.extension.isConnected()) {
        return {
          success: false,
          type: ActionResultType.FAILURE,
          error: 'Not connected to RuneLite',
          metadata: { timestamp: new Date().toISOString() }
        }
      }

      // Get current game state from RuneLite
      const gameState = await this.extension.getGameState()

      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: gameState as any,
        metadata: { timestamp: new Date().toISOString() }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to get game state: ${error}`,
        metadata: { timestamp: new Date().toISOString() }
      }
    }
  }

  /**
   * Get the player's current stats
   */
  async getPlayerStats(): Promise<ActionResult> {
    try {
      if (!this.extension.isConnected()) {
        return {
          success: false,
          type: ActionResultType.FAILURE,
          error: 'Not connected to RuneLite',
          metadata: { timestamp: new Date().toISOString() }
        }
      }

      // Get player stats from RuneLite
      const gameState = await this.extension.getGameState()
      const playerStats = gameState.skills

      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: playerStats as any,
        metadata: { timestamp: new Date().toISOString() }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to get player stats: ${error}`,
        metadata: { timestamp: new Date().toISOString() }
      }
    }
  }

  /**
   * Get information about nearby NPCs
   */
  async getNearbyNPCs(radius: number = 10): Promise<ActionResult> {
    try {
      if (!this.extension.isConnected()) {
        return {
          success: false,
          type: ActionResultType.FAILURE,
          error: 'Not connected to RuneLite',
          metadata: { timestamp: new Date().toISOString() }
        }
      }

      // Send get nearby NPCs command to RuneLite
      const gameState = await this.extension.getGameState()
      const nearbyNPCs = gameState.npcs.filter(npc => {
        // Calculate distance from player
        const dx = npc.position.x - gameState.player.position.x
        const dy = npc.position.y - gameState.player.position.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        return distance <= radius
      })

      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: nearbyNPCs as any,
        metadata: { timestamp: new Date().toISOString() }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to get nearby NPCs: ${error}`,
        metadata: { timestamp: new Date().toISOString() }
      }
    }
  }

  /**
   * Get information about nearby players
   */
  async getNearbyPlayers(radius: number = 10): Promise<ActionResult> {
    try {
      if (!this.extension.isConnected()) {
        return {
          success: false,
          type: ActionResultType.FAILURE,
          error: 'Not connected to RuneLite',
          metadata: { timestamp: new Date().toISOString() }
        }
      }

      // Send get nearby players command to RuneLite
      const gameState = await this.extension.getGameState()
      const nearbyPlayers = gameState.players.filter(player => {
        // Calculate distance from player
        const dx = player.position.x - gameState.player.position.x
        const dy = player.position.y - gameState.player.position.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        return distance <= radius && player.name !== gameState.player.name
      })

      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: nearbyPlayers as any,
        metadata: { timestamp: new Date().toISOString() }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to get nearby players: ${error}`,
        metadata: { timestamp: new Date().toISOString() }
      }
    }
  }

  /**
   * Get information about nearby game objects
   */
  async getNearbyObjects(radius: number = 10): Promise<ActionResult> {
    try {
      if (!this.extension.isConnected()) {
        return {
          success: false,
          type: ActionResultType.FAILURE,
          error: 'Not connected to RuneLite',
          metadata: { timestamp: new Date().toISOString() }
        }
      }

      // Send get nearby objects command to RuneLite
      const gameState = await this.extension.getGameState()
      const nearbyObjects = gameState.objects.filter((obj: any) => {
        // Calculate distance from player
        const dx = obj.position.x - gameState.player.position.x
        const dy = obj.position.y - gameState.player.position.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        return distance <= radius
      })

      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: nearbyObjects as any,
        metadata: { timestamp: new Date().toISOString() }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to get nearby objects: ${error}`,
        metadata: { timestamp: new Date().toISOString() }
      }
    }
  }

  /**
   * Get information about items on the ground
   */
  async getGroundItems(radius: number = 10): Promise<ActionResult> {
    try {
      if (!this.extension.isConnected()) {
        return {
          success: false,
          type: ActionResultType.FAILURE,
          error: 'Not connected to RuneLite',
          metadata: { timestamp: new Date().toISOString() }
        }
      }

      // Send get ground items command to RuneLite
      const gameState = await this.extension.getGameState()
      const groundItems = gameState.items.filter(item => {
        // Calculate distance from player
        const dx = item.position.x - gameState.player.position.x
        const dy = item.position.y - gameState.player.position.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        return distance <= radius
      })

      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: groundItems as any,
        metadata: { timestamp: new Date().toISOString() }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to get ground items: ${error}`,
        metadata: { timestamp: new Date().toISOString() }
      }
    }
  }

  /**
   * Get the status of quests
   */
  async getQuestStatus(questName?: string): Promise<ActionResult> {
    try {
      if (!this.extension.isConnected()) {
        return {
          success: false,
          type: ActionResultType.FAILURE,
          error: 'Not connected to RuneLite',
          metadata: { timestamp: new Date().toISOString() }
        }
      }

      // Send get quest status command to RuneLite
      const gameState = await this.extension.getGameState()
      
      if (questName) {
        const quest = gameState.quests.find(q => q.name.toLowerCase() === questName.toLowerCase())
        if (!quest) {
          return {
            success: false,
            type: ActionResultType.FAILURE,
            error: `Quest not found: ${questName}`,
            metadata: { timestamp: new Date().toISOString() }
          }
        }
        return {
          success: true,
          type: ActionResultType.SUCCESS,
          result: quest as any,
          metadata: { timestamp: new Date().toISOString() }
        }
      }
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: gameState.quests as any,
        metadata: { timestamp: new Date().toISOString() }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to get quest status: ${error}`,
        metadata: { timestamp: new Date().toISOString() }
      }
    }
  }
}