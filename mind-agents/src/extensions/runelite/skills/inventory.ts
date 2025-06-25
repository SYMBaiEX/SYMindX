/**
 * Inventory Skill for RuneLite Extension
 * 
 * Provides actions related to inventory management in the game world.
 */

import { ExtensionAction, Agent, ActionResult, ActionResultType, ActionCategory } from '../../../types/agent.js'
import { RuneLiteExtension } from '../index.js'

export class InventorySkill {
  private extension: RuneLiteExtension

  constructor(extension: RuneLiteExtension) {
    this.extension = extension
  }

  /**
   * Get all inventory-related actions
   */
  getActions(): Record<string, ExtensionAction> {
    return {
      use_item: {
        name: 'use_item',
        description: 'Use an item from inventory',
        category: ActionCategory.MANIPULATION,
        parameters: { itemId: 'string', targetId: 'string' },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.useItem(params.itemId, params.targetId)
        }
      },
      
      drop_item: {
        name: 'drop_item',
        description: 'Drop an item from inventory',
        category: ActionCategory.MANIPULATION,
        parameters: { itemId: 'string' },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.dropItem(params.itemId)
        }
      },
      
      equip_item: {
        name: 'equip_item',
        description: 'Equip an item from inventory',
        category: ActionCategory.MANIPULATION,
        parameters: { itemId: 'string' },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.equipItem(params.itemId)
        }
      }
    }
  }

  /**
   * Use an item from inventory on a target
   */
  async useItem(itemId: string, targetId?: string): Promise<ActionResult> {
    try {
      if (!this.extension.isConnected()) {
        return {
          success: false,
          type: ActionResultType.FAILURE,
          error: 'Not connected to RuneLite',
          metadata: { timestamp: new Date().toISOString() }
        }
      }

      // Send use item command to RuneLite
      await this.extension.sendCommand({
        action: 'use_item',
        target: itemId,
        parameters: { targetId }
      })

      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: { itemId, targetId },
        metadata: { timestamp: new Date().toISOString() }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to use item: ${error}`,
        metadata: { timestamp: new Date().toISOString() }
      }
    }
  }

  /**
   * Drop an item from inventory
   */
  async dropItem(itemId: string): Promise<ActionResult> {
    try {
      if (!this.extension.isConnected()) {
        return {
          success: false,
          type: ActionResultType.FAILURE,
          error: 'Not connected to RuneLite',
          metadata: { timestamp: new Date().toISOString() }
        }
      }

      // Send drop item command to RuneLite
      await this.extension.sendCommand({
        action: 'use_item',
        target: itemId,
        parameters: { action: 'drop' }
      })

      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: { itemId },
        metadata: { timestamp: new Date().toISOString() }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to drop item: ${error}`,
        metadata: { timestamp: new Date().toISOString() }
      }
    }
  }

  /**
   * Equip an item from inventory
   */
  async equipItem(itemId: string): Promise<ActionResult> {
    try {
      if (!this.extension.isConnected()) {
        return {
          success: false,
          type: ActionResultType.FAILURE,
          error: 'Not connected to RuneLite',
          metadata: { timestamp: new Date().toISOString() }
        }
      }

      // Send equip item command to RuneLite
      await this.extension.sendCommand({
        action: 'use_item',
        target: itemId,
        parameters: { action: 'equip' }
      })

      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: { itemId },
        metadata: { timestamp: new Date().toISOString() }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to equip item: ${error}`,
        metadata: { timestamp: new Date().toISOString() }
      }
    }
  }
}