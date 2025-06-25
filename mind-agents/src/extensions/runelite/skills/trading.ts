/**
 * Trading Skill for RuneLite Extension
 * 
 * Provides actions related to player-to-player trading in the game world.
 */

import { ExtensionAction, Agent, ActionResult, ActionResultType, ActionCategory } from '../../../types/agent.js'
import { RuneLiteExtension } from '../index.js'

export class TradingSkill {
  private extension: RuneLiteExtension

  constructor(extension: RuneLiteExtension) {
    this.extension = extension
  }

  /**
   * Get all trading-related actions
   */
  getActions(): Record<string, ExtensionAction> {
    return {
      request_trade: {
        name: 'request_trade',
        description: 'Request a trade with another player',
        category: ActionCategory.SOCIAL,
        parameters: { playerName: 'string' },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.requestTrade(params.playerName)
        }
      },
      
      offer_item: {
        name: 'offer_item',
        description: 'Offer an item in a trade',
        category: ActionCategory.SOCIAL,
        parameters: { itemId: 'string', quantity: 'number' },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.offerItem(params.itemId, params.quantity)
        }
      },
      
      accept_trade: {
        name: 'accept_trade',
        description: 'Accept the current trade offer',
        category: ActionCategory.SOCIAL,
        parameters: { stage: 'number' },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.acceptTrade(params.stage)
        }
      },
      
      decline_trade: {
        name: 'decline_trade',
        description: 'Decline the current trade',
        category: ActionCategory.SOCIAL,
        parameters: {},
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.declineTrade()
        }
      }
    }
  }

  /**
   * Request a trade with another player
   */
  async requestTrade(playerName: string): Promise<ActionResult> {
    try {
      if (!this.extension.isConnected()) {
        return {
          success: false,
          type: ActionResultType.FAILURE,
          error: 'Not connected to RuneLite',
          metadata: { timestamp: new Date().toISOString() }
        }
      }

      // Send request trade command to RuneLite
      await this.extension.sendCommand({
        action: 'trade',
        target: playerName,
        parameters: { action: 'request' }
      })

      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: { playerName, action: 'trade_requested' },
        metadata: { timestamp: new Date().toISOString() }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to request trade: ${error}`,
        metadata: { timestamp: new Date().toISOString() }
      }
    }
  }

  /**
   * Offer an item in a trade
   */
  async offerItem(itemId: string, quantity: number = 1): Promise<ActionResult> {
    try {
      if (!this.extension.isConnected()) {
        return {
          success: false,
          type: ActionResultType.FAILURE,
          error: 'Not connected to RuneLite',
          metadata: { timestamp: new Date().toISOString() }
        }
      }

      // Send offer item command to RuneLite
      await this.extension.sendCommand({
        action: 'trade',
        target: 'offer',
        parameters: { itemId, quantity }
      })

      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: { itemId, quantity, action: 'item_offered' },
        metadata: { timestamp: new Date().toISOString() }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to offer item: ${error}`,
        metadata: { timestamp: new Date().toISOString() }
      }
    }
  }

  /**
   * Accept the current trade offer
   * @param stage 1 for first confirmation, 2 for final confirmation
   */
  async acceptTrade(stage: number = 1): Promise<ActionResult> {
    try {
      if (!this.extension.isConnected()) {
        return {
          success: false,
          type: ActionResultType.FAILURE,
          error: 'Not connected to RuneLite',
          metadata: { timestamp: new Date().toISOString() }
        }
      }

      // Send accept trade command to RuneLite
      await this.extension.sendCommand({
        action: 'trade',
        target: 'accept',
        parameters: { stage }
      })

      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: { stage, action: 'trade_accepted' },
        metadata: { timestamp: new Date().toISOString() }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to accept trade: ${error}`,
        metadata: { timestamp: new Date().toISOString() }
      }
    }
  }

  /**
   * Decline the current trade
   */
  async declineTrade(): Promise<ActionResult> {
    try {
      if (!this.extension.isConnected()) {
        return {
          success: false,
          type: ActionResultType.FAILURE,
          error: 'Not connected to RuneLite',
          metadata: { timestamp: new Date().toISOString() }
        }
      }

      // Send decline trade command to RuneLite
      await this.extension.sendCommand({
        action: 'trade',
        target: 'decline',
        parameters: {}
      })

      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: { action: 'trade_declined' },
        metadata: { timestamp: new Date().toISOString() }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to decline trade: ${error}`,
        metadata: { timestamp: new Date().toISOString() }
      }
    }
  }
}