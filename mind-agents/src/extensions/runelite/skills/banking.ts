/**
 * Banking Skill for RuneLite Extension
 * 
 * Provides actions related to banking and item storage in the game world.
 */


import { ExtensionAction, Agent, ActionResult, ActionCategory, ActionResultType } from '../../../types/agent.js'
import { RuneLiteExtension } from '../index.js'

export class BankingSkill {
  private extension: RuneLiteExtension

  constructor(extension: RuneLiteExtension) {
    this.extension = extension
  }

  /**
   * Get all banking-related actions
   */
  getActions(): Record<string, ExtensionAction> {
    return {
      open_bank: {
        name: 'open_bank',
        description: 'Open the bank interface',
        category: ActionCategory.INTERACTION,
        parameters: {},
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.openBank()
        }
      },
      
      deposit_item: {
        name: 'deposit_item',
        description: 'Deposit an item into the bank',
        category: ActionCategory.INTERACTION,
        parameters: { itemId: 'string', quantity: 'number' },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.depositItem(params.itemId, params.quantity)
        }
      },
      
      withdraw_item: {
        name: 'withdraw_item',
        description: 'Withdraw an item from the bank',
        category: ActionCategory.INTERACTION,
        parameters: { itemId: 'string', quantity: 'number' },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.withdrawItem(params.itemId, params.quantity)
        }
      },
      
      close_bank: {
        name: 'close_bank',
        description: 'Close the bank interface',
        category: ActionCategory.INTERACTION,
        parameters: {},
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.closeBank()
        }
      }
    }
  }

  /**
   * Open the bank interface
   */
  async openBank(): Promise<ActionResult> {
    try {
      if (!this.extension.isConnected()) {
        return {
          success: false,
          type: ActionResultType.FAILURE,
          error: 'Not connected to RuneLite',
          metadata: { timestamp: new Date().toISOString() }
        }
      }

      // Send open bank command to RuneLite
      await this.extension.sendCommand({
        action: 'bank',
        parameters: {}
      })

      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: { action: 'bank_opened' },
        metadata: { timestamp: new Date().toISOString() }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to open bank: ${error}`,
        metadata: { timestamp: new Date().toISOString() }
      }
    }
  }

  /**
   * Deposit an item into the bank
   */
  async depositItem(itemId: string, quantity: number = 1): Promise<ActionResult> {
    try {
      if (!this.extension.isConnected()) {
        return {
          success: false,
          type: ActionResultType.FAILURE,
          error: 'Not connected to RuneLite',
          metadata: { timestamp: new Date().toISOString() }
        }
      }

      // Send deposit item command to RuneLite
      await this.extension.sendCommand({
        action: 'bank',
        target: 'deposit',
        parameters: { itemId, quantity }
      })

      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: { itemId, quantity, action: 'deposited' },
        metadata: { timestamp: new Date().toISOString() }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to deposit item: ${error}`,
        metadata: { timestamp: new Date().toISOString() }
      }
    }
  }

  /**
   * Withdraw an item from the bank
   */
  async withdrawItem(itemId: string, quantity: number = 1): Promise<ActionResult> {
    try {
      if (!this.extension.isConnected()) {
        return {
          success: false,
          type: ActionResultType.FAILURE,
          error: 'Not connected to RuneLite',
          metadata: { timestamp: new Date().toISOString() }
        }
      }

      // Send withdraw item command to RuneLite
      await this.extension.sendCommand({
        action: 'bank',
        target: 'withdraw',
        parameters: { itemId, quantity }
      })

      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: { itemId, quantity, action: 'withdrawn' },
        metadata: { timestamp: new Date().toISOString() }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to withdraw item: ${error}`,
        metadata: { timestamp: new Date().toISOString() }
      }
    }
  }

  /**
   * Close the bank interface
   */
  async closeBank(): Promise<ActionResult> {
    try {
      if (!this.extension.isConnected()) {
        return {
          success: false,
          type: ActionResultType.FAILURE,
          error: 'Not connected to RuneLite',
          metadata: { timestamp: new Date().toISOString() }
        }
      }

      // Send close bank command to RuneLite
      await this.extension.sendCommand({
        action: 'bank',
        target: 'close',
        parameters: {}
      })

      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: { action: 'bank_closed' },
        metadata: { timestamp: new Date().toISOString() }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to close bank: ${error}`,
        metadata: { timestamp: new Date().toISOString() }
      }
    }
  }
}