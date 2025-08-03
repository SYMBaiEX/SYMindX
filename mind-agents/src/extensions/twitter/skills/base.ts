/**
 * Base Twitter Skill
 *
 * Abstract base class for all Twitter extension skills
 */

import { TwitterApi } from 'twitter-api-v2';
import {
  ExtensionAction,
  Agent,
  ActionResult,
  ActionResultType,
} from '../../../types/agent';
import { SkillParameters } from '../../../types/common';
import { runtimeLogger } from '../../../utils/logger';
import type { TwitterExtension } from '../index';
import {
  TwitterConfig,
  TwitterLogContext,
} from '../types';

export abstract class BaseTwitterSkill {
  protected extension: TwitterExtension;
  protected twitterClient: TwitterApi | undefined;
  protected config: TwitterConfig;

  constructor(extension: TwitterExtension) {
    this.extension = extension;
    this.config = extension.getConfig();
    this.twitterClient = extension.getTwitterClient();
  }

  /**
   * Get all actions provided by this skill
   */
  abstract getActions(): Record<string, ExtensionAction>;

  /**
   * Initialize the skill
   */
  async initialize(): Promise<void> {
    // Override in subclasses if needed
  }

  /**
   * Clean up skill resources
   */
  async cleanup(): Promise<void> {
    // Override in subclasses if needed
  }

  /**
   * Check if autonomous mode is enabled
   */
  protected isAutonomousMode(): boolean {
    return this.config.autonomous.enabled;
  }

  /**
   * Validate parameters for an action
   */
  protected validateParameters(params: SkillParameters, required: string[]): boolean {
    for (const param of required) {
      if (params[param] === undefined || params[param] === null) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get agent information for logging and context
   */
  protected getAgentContext(agent: Agent): Partial<TwitterLogContext> {
    return {
      agentId: agent.id,
      autonomousMode: this.config.autonomous.enabled,
    };
  }

  /**
   * Log with Twitter-specific context
   */
  protected log(
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    context?: Partial<TwitterLogContext>
  ): void {
    const logContext: TwitterLogContext = {
      source: 'twitter-extension',
      ...context,
    };

    switch (level) {
      case 'debug':
        runtimeLogger.debug(message, logContext);
        break;
      case 'info':
        runtimeLogger.info(message, logContext);
        break;
      case 'warn':
        runtimeLogger.warn(message, logContext);
        break;
      case 'error':
        runtimeLogger.error(message, logContext);
        break;
    }
  }

  /**
   * Create a successful action result
   */
  protected successResult(data: any, message?: string): ActionResult {
    return {
      success: true,
      result: data,
      metadata: {
        timestamp: new Date(),
        ...(message && { message }),
      },
      type: ActionResultType.SUCCESS,
    };
  }

  /**
   * Create an error action result
   */
  protected errorResult(error: Error | string, code?: string): ActionResult {
    const errorMessage = error instanceof Error ? error.message : error;
    return {
      success: false,
      error: errorMessage,
      metadata: {
        timestamp: new Date(),
        ...(code && { errorCode: code }),
      },
      type: ActionResultType.ERROR,
    };
  }

  /**
   * Ensure Twitter client is available
   */
  protected ensureTwitterClient(): TwitterApi {
    if (!this.twitterClient) {
      throw new Error('Twitter client not initialized');
    }
    return this.twitterClient;
  }
}