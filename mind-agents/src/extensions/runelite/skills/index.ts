/**
 * RuneLite Extension Skills
 * 
 * This module exports all the skills available in the RuneLite extension.
 * Each skill represents a group of related actions that the agent can perform.
 */

import type { RuneLiteExtension } from '../index.js'
import { MovementSkill } from './movement.js'
import { CombatSkill } from './combat.js'
import { InteractionSkill } from './interaction.js'
import { InventorySkill } from './inventory.js'
import { CommunicationSkill } from './communication.js'
import { BankingSkill } from './banking.js'
import { TradingSkill } from './trading.js'
import { GameStateSkill } from './gamestate.js'

export {
  MovementSkill,
  CombatSkill,
  InteractionSkill,
  InventorySkill,
  CommunicationSkill,
  BankingSkill,
  TradingSkill,
  GameStateSkill
}

/**
 * Initialize all skills with the RuneLite extension instance
 */
export interface RuneLiteSkills {
  movement: MovementSkill
  combat: CombatSkill
  interaction: InteractionSkill
  inventory: InventorySkill
  communication: CommunicationSkill
  banking: BankingSkill
  trading: TradingSkill
  gameState: GameStateSkill
}

export function initializeSkills(extension: RuneLiteExtension): RuneLiteSkills {
  return {
    movement: new MovementSkill(extension),
    combat: new CombatSkill(extension),
    interaction: new InteractionSkill(extension),
    inventory: new InventorySkill(extension),
    communication: new CommunicationSkill(extension),
    banking: new BankingSkill(extension),
    trading: new TradingSkill(extension),
    gameState: new GameStateSkill(extension)
  }
}
