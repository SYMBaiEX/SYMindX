/**
 * Base Skill for Telegram Extension
 * 
 * Provides the foundation for all Telegram skills.
 */

import { Agent, ActionResult, ActionResultType, ExtensionAction } from '../../../types/agent.js';
import { TelegramExtension } from '../index.js';
import { TelegramActionType, TelegramErrorType } from '../types.js';

/**
 * Base skill interface that all Telegram skills must implement
 */
export interface TelegramSkill {
  /**
   * Get all actions provided by this skill
   */
  getActions(): Record<string, ExtensionAction>;
}

/**
 * Abstract base class for Telegram skills
 */
export abstract class BaseTelegramSkill implements TelegramSkill {
  protected extension: TelegramExtension;
  
  constructor(extension: TelegramExtension) {
    this.extension = extension;
  }
  
  /**
   * Get all actions provided by this skill
   * Must be implemented by subclasses
   */
  abstract getActions(): Record<string, ExtensionAction>;
  
  /**
   * Create a standardized error result
   */
  protected createErrorResult(error: unknown, errorType: TelegramErrorType = TelegramErrorType.INTERNAL_ERROR): ActionResult {
    return {
      success: false,
      type: ActionResultType.FAILURE,
      error: `${errorType}: ${error instanceof Error ? error.message : String(error)}`,
      metadata: { 
        timestamp: new Date().toISOString(),
        errorType
      }
    };
  }
  
  /**
   * Create a standardized success result
   */
  protected createSuccessResult(data?: any): ActionResult {
    return {
      success: true,
      type: ActionResultType.SUCCESS,
      result: data,
      metadata: { timestamp: new Date().toISOString() }
    };
  }
}