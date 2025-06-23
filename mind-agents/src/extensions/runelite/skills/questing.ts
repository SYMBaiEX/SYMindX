/**
 * Questing Skill for RuneLite Extension
 *
 * Provides actions related to starting and completing quests.
 */

import { ExtensionAction, Agent, ActionResult, ActionCategory, ActionResultType } from '../../../types/agent.js'
import { RuneLiteExtension } from '../index.js'
import { SkillParameters } from '../../../types/common.js'
import type { RuneLiteSkill } from './types.js'

export class QuestingSkill implements RuneLiteSkill {
  private extension: RuneLiteExtension

  constructor(extension: RuneLiteExtension) {
    this.extension = extension
  }

  /**
   * Get all questing-related actions
   */
  getActions(): Record<string, ExtensionAction> {
    return {
      start_quest: {
        name: 'start_quest',
        description: 'Begin a quest',
        category: ActionCategory.SOCIAL,
        parameters: { questName: 'string' },
        execute: async (agent: Agent, params: SkillParameters): Promise<ActionResult> => {
          return this.startQuest(params.questName)
        }
      },

      complete_quest: {
        name: 'complete_quest',
        description: 'Complete a quest',
        category: ActionCategory.SOCIAL,
        parameters: { questName: 'string' },
        execute: async (agent: Agent, params: SkillParameters): Promise<ActionResult> => {
          return this.completeQuest(params.questName)
        }
      },

      talk_to_npc: {
        name: 'talk_to_npc',
        description: 'Initiate dialogue with an NPC',
        category: ActionCategory.INTERACTION,
        parameters: { npcId: 'string' },
        execute: async (agent: Agent, params: SkillParameters): Promise<ActionResult> => {
          return this.talkToNPC(params.npcId)
        }
      },

      choose_dialogue_option: {
        name: 'choose_dialogue_option',
        description: 'Select a dialogue option during a conversation',
        category: ActionCategory.INTERACTION,
        parameters: { option: 'number' },
        execute: async (agent: Agent, params: SkillParameters): Promise<ActionResult> => {
          return this.chooseDialogueOption(params.option)
        }
      }
    }
  }

  /** Start a quest */
  async startQuest(questName: string): Promise<ActionResult> {
    try {
      if (!this.extension.isConnected()) {
        return {
          success: false,
          type: ActionResultType.FAILURE,
          error: 'Not connected to RuneLite',
          metadata: { timestamp: new Date().toISOString() }
        }
      }

      await this.extension.sendCommand({
        action: 'quest',
        target: questName,
        parameters: { action: 'start' }
      })

      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: { questName, action: 'started' },
        metadata: { timestamp: new Date().toISOString() }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to start quest: ${error}`,
        metadata: { timestamp: new Date().toISOString() }
      }
    }
  }

  /** Complete a quest */
  async completeQuest(questName: string): Promise<ActionResult> {
    try {
      if (!this.extension.isConnected()) {
        return {
          success: false,
          type: ActionResultType.FAILURE,
          error: 'Not connected to RuneLite',
          metadata: { timestamp: new Date().toISOString() }
        }
      }

      await this.extension.sendCommand({
        action: 'quest',
        target: questName,
        parameters: { action: 'complete' }
      })

      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: { questName, action: 'completed' },
        metadata: { timestamp: new Date().toISOString() }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to complete quest: ${error}`,
        metadata: { timestamp: new Date().toISOString() }
      }
    }
  }

  /** Talk to an NPC */
  async talkToNPC(npcId: string): Promise<ActionResult> {
    try {
      if (!this.extension.isConnected()) {
        return {
          success: false,
          type: ActionResultType.FAILURE,
          error: 'Not connected to RuneLite',
          metadata: { timestamp: new Date().toISOString() }
        }
      }

      await this.extension.sendCommand({
        action: 'quest',
        target: npcId,
        parameters: { action: 'talk' }
      })

      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: { npcId, action: 'talk' },
        metadata: { timestamp: new Date().toISOString() }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to talk to NPC: ${error}`,
        metadata: { timestamp: new Date().toISOString() }
      }
    }
  }

  /** Choose a dialogue option */
  async chooseDialogueOption(option: number): Promise<ActionResult> {
    try {
      if (!this.extension.isConnected()) {
        return {
          success: false,
          type: ActionResultType.FAILURE,
          error: 'Not connected to RuneLite',
          metadata: { timestamp: new Date().toISOString() }
        }
      }

      await this.extension.sendCommand({
        action: 'quest',
        parameters: { action: 'dialogue', option }
      })

      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: { option },
        metadata: { timestamp: new Date().toISOString() }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to choose dialogue option: ${error}`,
        metadata: { timestamp: new Date().toISOString() }
      }
    }
  }
}

export default QuestingSkill

