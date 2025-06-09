/**
 * Base Skill for Twitter Extension
 * 
 * Provides the foundation for all Twitter skills.
 */

import { Agent, ActionResult, ActionResultType, ExtensionAction } from '../../../types/agent.js';
import { TwitterExtension } from '../index.js';
import { TwitterActionType, TwitterErrorType } from '../types.js';

/**
 * Base skill interface that all Twitter skills must implement
 */
export interface TwitterSkill {
  /**
   * Get all actions provided by this skill
   */
  getActions(): Record<string, ExtensionAction>;
}

/**
 * Abstract base class for Twitter skills
 */
export abstract class BaseTwitterSkill implements TwitterSkill {
  protected extension: TwitterExtension;
  
  constructor(extension: TwitterExtension) {
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
  protected createErrorResult(error: unknown, errorType: TwitterErrorType = TwitterErrorType.INTERNAL_ERROR): ActionResult {
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

export { BaseTwitterSkill };