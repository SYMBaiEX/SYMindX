/**
 * Movement Skill for RuneLite Extension
 * 
 * Provides actions related to character movement in the game world.
 */

import { ExtensionAction, Agent, ActionResult, ActionResultType, ActionCategory } from '../../../types/agent.js'
import { RuneLiteExtension } from '../index.js'

export class MovementSkill {
  private extension: RuneLiteExtension

  constructor(extension: RuneLiteExtension) {
    this.extension = extension
  }

  /**
   * Get all movement-related actions
   */
  getActions(): Record<string, ExtensionAction> {
    return {
      move: {
        name: 'move',
        description: 'Move to a specific location',
        category: ActionCategory.MOVEMENT,
        parameters: { x: 'number', y: 'number', plane: 'number' },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.move(params.x, params.y, params.plane)
        }
      }
    }
  }

  /**
   * Move the player character to a specific location
   */
  async move(x: number, y: number, plane: number): Promise<ActionResult> {
    try {
      if (!this.extension.isConnected()) {
        return {
          success: false,
          type: ActionResultType.FAILURE,
          error: 'Not connected to RuneLite',
          metadata: { timestamp: new Date().toISOString() }
        }
      }

      // Send move command to RuneLite
      await this.extension.sendCommand({
        action: 'move',
        target: `${x},${y},${plane}`,
        parameters: { x, y, plane }
      })

      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: { x, y, plane },
        metadata: { timestamp: new Date().toISOString() }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to move: ${error}`,
        metadata: { timestamp: new Date().toISOString() }
      }
    }
  }
}