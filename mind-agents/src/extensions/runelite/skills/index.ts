/**
 * RuneLite Extension Skills
 * 
 * This module exports all the skills available in the RuneLite extension.
 * Each skill represents a group of related actions that the agent can perform.
 */

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
export function initializeSkills(extension: any) {
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